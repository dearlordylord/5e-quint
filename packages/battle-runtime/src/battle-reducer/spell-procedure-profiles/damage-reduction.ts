// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-damage-reduction
//
// The damageReduction Spell Procedure Profile: a cantrip-access spell (today
// Resistance) that, on touch, grants an ongoing reduction of one damage roll
// against the target by 1d4. All damageReduction-specific behavior lives
// here:
//
//   - admit()              — was supportedCantripDamageReductionSpellProfile
//                            in spells-profiles-support.ts
//   - damageReductionShape — was damageReductionSpellProjection in
//                            spells-profiles-support.ts
//   - discoverCastAct()    — was the damageReduction branch in
//                            spells-discovery.ts:discoverBattleActs
//   - castSummary()        — was the damageReduction branch in
//                            spells-discovery.ts:spellInvocationCastSummary
//   - invocationRef()      — was the damageReduction Match case in
//                            spells-invocation-ref.ts:supportedSpellInvocationRef
//   - resolve()            — was resolveDamageReductionSpellAct in
//                            spells-resolve-support-effects.ts
//   - applyEffect()        — was applyDamageReductionSpellEffect in
//                            spells-active-effects.ts (kept as a file-local
//                            helper; not exported from the profile)
//   - knownWillingTargetSpellIds — was
//                            KNOWN_WILLING_TARGET_DAMAGE_REDUCTION_SPELL_IDS
//                            in battle-reducer.ts (kept re-exported there for
//                            callers that still need it)
//
import { movementFeet } from "@dnd/shared/types";
import { DamageTypeSchema } from "@dnd/surface/surface/schema";
import type { DamageType, SpellRecord } from "@dnd/surface/surface/types";
import { Schema } from "effect";

import { spellId } from "../../identity.ts";
import type { CombatantId } from "../../identity.ts";
import {
  snapshotBattle,
  type AvailableBattleAct,
  type BattleResolutionResult,
  type BattleState,
  type DamageReductionSpellInvocation,
} from "../../battle-reducer.ts";
import { breakBattleConcentration } from "../damage-apply.ts";
import { maybeOpenReactionWindow } from "../dispatcher.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellCastReactionFrame } from "../spell-cast-reaction-frame.ts";
import {
  spellRequiresConcentration,
  spendSpellCastResources,
} from "../spells-resolve-resources.ts";
import { spellDamageTypeChoiceHole } from "../spells-damage-fills.ts";
import { scalarBuffActiveEffectExpiration } from "../spells-profiles-support.ts";
import { spellTargetHole, spellTargetIsLegal } from "../spells-targeting.ts";
import type { SpellInvocationRef } from "../../battle-subjects.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { spellProcedureInvocationSchema } from "./profile.ts";
import type { SupportedSpellInvocation } from "../../battle-reducer.ts";
import {
  BattleRuntimeObjectSchema,
  ClassCantripSpellAccessSchema,
  MovementFeet,
  NoSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import { KNOWN_WILLING_TARGET_DAMAGE_REDUCTION_SPELL_IDS } from "../known-willing-target-spell-ids.ts";

// Shape extractor: given a SpellRecord, return the fields of a damageReduction
// invocation that are derivable from the spell definition, or null if the
// spell does not fit the profile. Today only the SRD Resistance shape is
// admitted.
function damageReductionShape(
  actorId: CombatantId,
  spell: SpellRecord,
): Pick<
  DamageReductionSpellInvocation,
  "amount" | "damageTypeChoices" | "expiresAt" | "rangeFeet" | "targeting"
> | null {
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 0 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "touch" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.attachment.kind !== "hole" ||
    spell.mechanics.attachment.value.kind !== "target" ||
    spell.mechanics.attachment.value.selection.mode !== "one" ||
    spell.mechanics.operations.length !== 1
  ) {
    return null;
  }
  const operation = spell.mechanics.operations[0];
  const effect = operation?.effect;
  const damageType =
    effect?.kind === "reduce_damage_taken" ? effect.damageType : undefined;
  const expiresAt = scalarBuffActiveEffectExpiration(
    actorId,
    spell.mechanics.duration,
  );
  if (
    operation?.trigger.kind !== "passive" ||
    effect?.kind !== "reduce_damage_taken" ||
    effect.amount.kind !== "fixed" ||
    effect.amount.expr.dice !== 1 ||
    effect.amount.expr.dieSize !== 4 ||
    (effect.amount.expr.flat ?? 0) !== 0 ||
    typeof damageType !== "object" ||
    damageType?.kind !== "hole" ||
    expiresAt === null
  ) {
    return null;
  }
  const choiceValue = damageType.value;
  if (typeof choiceValue !== "object" || choiceValue.kind !== "choice") {
    return null;
  }
  const choices = choiceValue.options.filter((option): option is DamageType =>
    Schema.is(DamageTypeSchema)(option),
  );
  if (choices.length !== choiceValue.options.length) {
    return null;
  }
  return {
    targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
    damageTypeChoices: choices,
    amount: { dice: 1, dieSize: 4 },
    expiresAt,
    rangeFeet: movementFeet(5),
  };
}

function applyDamageReductionEffect(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  damageType: DamageType,
  invocation: DamageReductionSpellInvocation,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  const nextEffect = {
    kind: "spellDamageReduction" as const,
    sourceSpellId: invocation.spell.id,
    sourceCombatantId: actorId,
    damageType,
    amount: invocation.amount,
    usedThisTurn: false,
    expiresAt: invocation.expiresAt,
  };
  const activeEffects = [
    ...target.activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "spellDamageReduction" &&
          effect.sourceSpellId === invocation.spell.id
        ),
    ),
    nextEffect,
  ];
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects,
    }),
  };
}

function admitDamageReduction(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly DamageReductionSpellInvocation[] {
  const shape = damageReductionShape(ctx.actor.combatantId, spell);
  if (shape === null) {
    return [];
  }
  return [
    {
      access: { tag: "classCantrip" },
      resource: { tag: "none" },
      procedure: "damageReduction",
      spell,
      actionCost: "magicAction",
      ...shape,
    },
  ];
}

function discoverDamageReductionCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: DamageReductionSpellInvocation,
): readonly AvailableBattleAct[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  if (targetHole.choices.length === 0) {
    return [];
  }
  return [
    {
      subject: {
        tag: "actionSpell",
        actorId,
        invocation: damageReductionInvocationRef(invocation),
        mode: { tag: "cast" },
      },
      label: invocation.spell.name,
      summary: damageReductionCastSummary(invocation),
      initialHoles: [targetHole, spellDamageTypeChoiceHole(invocation)],
    },
  ];
}

function damageReductionInvocationRef(
  invocation: DamageReductionSpellInvocation,
): SpellInvocationRef {
  return {
    tag: "cantrip",
    spellId: spellId(invocation.spell.id),
    procedure: "damageReduction",
  };
}

function damageReductionCastSummary(
  invocation: DamageReductionSpellInvocation,
): string {
  return `Cast ${invocation.spell.name} as a cantrip.`;
}

function resolveDamageReduction(
  input: SpellProcedureProfileResolveInput<DamageReductionSpellInvocation>,
): BattleResolutionResult {
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Damage-reduction spells use one target fill and one damage type choice.",
    );
  }

  const targetHole = spellTargetHole(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  if (input.fillSet.targetId === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      targetHole,
    ]);
  }
  if (
    !spellTargetIsLegal(
      input.input.state,
      input.actorId,
      input.fillSet.targetId,
      input.invocation,
      input.fillSet.targetSpatialFacts,
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell target must be a combatant within the selected spell's supported range.",
    );
  }
  if (input.fillSet.damageTypeChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellDamageTypeChoiceHole(input.invocation),
    ]);
  }
  if (
    !input.invocation.damageTypeChoices.includes(
      input.fillSet.damageTypeChoice.value,
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Damage-reduction spell damage type must be one of the selected spell's choices.",
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: [input.fillSet.targetId],
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "magicAction" },
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    }),
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const concentrationBase = spellRequiresConcentration(input.invocation)
    ? breakBattleConcentration(input.input.state, input.actorId)
    : input.input.state;
  const effected = applyDamageReductionEffect(
    concentrationBase,
    input.actorId,
    input.fillSet.targetId,
    input.fillSet.damageTypeChoice.value,
    input.invocation,
  );
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resourced.tag === "invalid"
    ? resourced
    : {
        tag: "resolved",
        state: resourced.state,
        snapshot: snapshotBattle(resourced.state),
      };
}

const DamageReductionInvocationSchema = spellProcedureInvocationSchema<
  Extract<SupportedSpellInvocation, { readonly procedure: "damageReduction" }>
>(
  Schema.Struct({
    access: ClassCantripSpellAccessSchema,
    resource: NoSpellInvocationResourceSchema,
    procedure: Schema.Literal("damageReduction"),
    spell: BattleRuntimeObjectSchema,
    actionCost: Schema.Literal("magicAction"),
    targeting: Schema.Struct({
      kind: Schema.Literal("targetList"),
      minTargets: Schema.Literal(1),
      maxTargets: Schema.Number,
    }),
    damageTypeChoices: Schema.Array(DamageTypeSchema),
    amount: Schema.Struct({
      dice: Schema.Literal(1),
      dieSize: Schema.Literal(4),
    }),
    expiresAt: BattleRuntimeObjectSchema,
    rangeFeet: MovementFeet,
  }),
);
export const damageReductionProfile: SpellProcedureProfile<
  "damageReduction",
  DamageReductionSpellInvocation
> = {
  procedure: "damageReduction",
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  isTargetListInvocation: true,
  isReadiedSpellCompatible: true,
  knownWillingTargetSpellIds: KNOWN_WILLING_TARGET_DAMAGE_REDUCTION_SPELL_IDS,
  admit: admitDamageReduction,
  discoverCastAct: discoverDamageReductionCastAct,
  castSummary: damageReductionCastSummary,
  invocationRef: damageReductionInvocationRef,
  invocationSchema: DamageReductionInvocationSchema,
  resolve: resolveDamageReduction,
};
