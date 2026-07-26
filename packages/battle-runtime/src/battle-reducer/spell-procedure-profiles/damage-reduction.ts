import { maybeOpenSpellCastReactionWindow } from "../spell-cast-reaction-window.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-damage-reduction
import { BattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
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
//   - resolve()            — was resolveDamageReductionSpellAct in
//                            spells-resolve-support-effects.ts
//   - applyEffect()        — was applyDamageReductionSpellEffect in
//                            spells-active-effects.ts (kept as a file-local
//                            helper; not exported from the profile)
//
import { movementFeet } from "@dnd/shared/types";
import { DamageTypeSchema } from "@dnd/surface/surface/schema";
import type { DamageType } from "@dnd/surface/surface/types";
import { Schema } from "effect";

import type { CombatantId } from "../../identity.ts";
import {
  type BattleActDiscoveryCandidate,
  type BattleResolutionResult,
  type BattleState,
  type BattleExecutableSpellInvocation,
  type DamageReductionSpellInvocation,
} from "../../battle-state-execution.ts";
import { breakBattleConcentration } from "../damage-apply.ts";
import { needsHolesResult } from "../needs-holes-result.ts";
import { invalidResult, resolutionFromStateResult } from "../result-helpers.ts";
import { selectSingleSpellTarget } from "../single-spell-target.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { ATTACK_TARGET_HOLE_ID } from "../battle-runtime-protocol.ts";
import {
  spellRequiresConcentration,
  spendSpellCastResources,
} from "../spells-resolve-resources.ts";
import { spellDamageTypeChoiceHole } from "../spells-damage-fills.ts";
import { scalarBuffActiveEffectExpiration } from "../spells-profiles-support.ts";
import { spellTargetHole } from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  ClassCantripSpellAccessSchema,
  MovementFeet,
  NoSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

// Shape extractor: given a return the fields of a damageReduction
// invocation that are derivable from the spell definition, or null if the
// spell does not fit the profile. Today only the SRD Resistance shape is
// admitted.
function damageReductionShape(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
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
    !("disposition" in spell.mechanics.attachment.value.selection) ||
    spell.mechanics.attachment.value.selection.disposition !== "willing" ||
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
    targeting: {
      kind: "targetList",
      minTargets: 1,
      maxTargets: 1,
      requiredTargetDisposition: "willing",
    },
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
  invocation: BattleExecutableSpellInvocation<DamageReductionSpellInvocation>,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  const nextEffect = {
    kind: "spellDamageReduction" as const,
    sourceProcedureRef: invocation.sourceProcedureRef,
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
          effect.sourceProcedureRef === invocation.sourceProcedureRef
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
  spell: BattleSpellAdmissionSource,
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
  invocation: BattleExecutableSpellInvocation<DamageReductionSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  if (targetHole.choices.length === 0) {
    return [];
  }
  return [
    {
      subject: {
        tag: "actionSpell",
        actorId,
        procedureRef: invocation.sourceProcedureRef,
        mode: { tag: "cast" },
      },
      initialHoles: [targetHole, spellDamageTypeChoiceHole(invocation)],
    },
  ];
}

function resolveDamageReduction(
  input: SpellProcedureProfileResolveInput<DamageReductionSpellInvocation>,
): BattleResolutionResult {
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [
      ATTACK_TARGET_HOLE_ID,
      spellDamageTypeChoiceHole(input.invocation).holeId,
    ])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Damage-reduction spells use one target fill and one damage type choice.",
    );
  }

  const targetSelection = selectSingleSpellTarget({
    state: input.input.state,
    subject: input.input.subject,
    actorId: input.actorId,
    invocation: input.invocation,
    targetId: input.fillSet.targetId,
    targetSpatialFacts: input.fillSet.targetSpatialFacts,
    invalidTargetMessage:
      "Spell target must be a combatant within the selected spell's supported range.",
  });
  if (targetSelection.tag !== "selected") {
    return targetSelection;
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

  const spellCastReactionWindow = maybeOpenSpellCastReactionWindow(
    input,
    [targetSelection.targetId],
    { kind: "magicAction" },
    undefined,
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
    targetSelection.targetId,
    input.fillSet.damageTypeChoice.value,
    input.invocation,
  );
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resolutionFromStateResult(resourced);
}

export const DamageReductionInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: ClassCantripSpellAccessSchema,
    resource: NoSpellInvocationResourceSchema,
    procedure: Schema.Literal("damageReduction"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("magicAction"),
    targeting: Schema.Struct({
      kind: Schema.Literal("targetList"),
      minTargets: Schema.Literal(1),
      maxTargets: Schema.Number,
      requiredTargetDisposition: Schema.Literal("willing"),
    }),
    damageTypeChoices: Schema.Array(DamageTypeSchema),
    amount: Schema.Struct({
      dice: Schema.Literal(1),
      dieSize: Schema.Literal(4),
    }),
    expiresAt: BattleActiveEffectExpirationSchema,
    rangeFeet: MovementFeet,
  }),
);
export const damageReductionProfile: SpellProcedureDeclaration<
  "damageReduction",
  DamageReductionSpellInvocation
> = {
  procedure: "damageReduction",
  admit: admitDamageReduction,
  discoverCastAct: discoverDamageReductionCastAct,
  executionSchema: DamageReductionInvocationSchema,
  resolve: resolveDamageReduction,
};
