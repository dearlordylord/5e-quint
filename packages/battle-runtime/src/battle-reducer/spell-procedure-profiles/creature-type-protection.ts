import { maybeOpenSpellCastReactionWindow } from "../spell-cast-reaction-window.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.creature-type-protection-and-charm
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-glyph-stored-concentration-full-duration
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CREATURE_TYPE_PROTECTION_AND_CONDITION_PREVENTION
//
// The creatureTypeProtection Spell Procedure Profile: prepared action spells
// that give a combatant protection against scoped Creature Types. Protection
// from Evil and Good adds Charmed/Frightened application, possession attempts,
// and relevant-effect repeat saves; Dispel Evil and Good contributes only its
// ongoing attack-roll protection facet.

import { movementFeet } from "@dnd/shared/types";
import { CreatureTypeSchema } from "@dnd/surface/surface/schema";

import {
  type ActionSpellBattleResolutionInput,
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type CreatureTypeProtectionSpellInvocation,
} from "../../battle-state-execution.ts";
import { CombatantId } from "../../identity.ts";
import { BattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
import { breakBattleConcentration } from "../damage-apply.ts";
import {
  DISPEL_EVIL_AND_GOOD_CREATURE_TYPES,
  PROTECTION_FROM_EVIL_AND_GOOD_CREATURE_TYPES,
  PROTECTION_FROM_EVIL_AND_GOOD_PREVENTED_CONDITIONS,
} from "../domain-constants.ts";

import { spellSelectionResolution } from "../needs-holes-result.ts";
import {
  invalidResult,
  resolvedResult,
  resolutionFromStateResult,
} from "../result-helpers.ts";
import {
  scalarBuffActiveEffectExpiration,
  sameCreatureTypeSet,
} from "../spells-profiles-support.ts";
import { spellTargetHole, spellTargetIsLegal } from "../spells-holes-fills.ts";
import type { SpellFillSet } from "../spells-resolve-fill-set.ts";
import {
  spellRequiresConcentration,
  spendSpellCastResources,
} from "../spells-resolve-resources.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  MovementFeet,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type CreatureTypeProtectionTargetSelection =
  | { readonly tag: "ok"; readonly targetIds: readonly [CombatantId] }
  | { readonly tag: "needsHoles"; readonly hole: BattleHole }
  | { readonly tag: "invalid"; readonly message: string };

function admitCreatureTypeProtection(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly CreatureTypeProtectionSpellInvocation[] {
  const projection = creatureTypeProtectionSpellProjection(
    ctx.actor.combatantId,
    spell,
  );
  if (projection === null) {
    return [];
  }
  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly CreatureTypeProtectionSpellInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
              procedure: "creatureTypeProtection",
              spell,
              actionCost: "magicAction",
              ...projection,
            },
          ],
  );
}

function creatureTypeProtectionSpellProjection(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
): Pick<
  CreatureTypeProtectionSpellInvocation,
  "activeEffect" | "rangeFeet" | "targeting"
> | null {
  const protectionFromEvilAndGoodProjection =
    protectionFromEvilAndGoodSpellProjection(actorId, spell);
  return (
    protectionFromEvilAndGoodProjection ??
    dispelEvilAndGoodProtectionSpellProjection(actorId, spell)
  );
}

function protectionFromEvilAndGoodSpellProjection(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
): Pick<
  CreatureTypeProtectionSpellInvocation,
  "activeEffect" | "rangeFeet" | "targeting"
> | null {
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "touch" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 10 ||
    spell.mechanics.phases.length !== 1
  ) {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const effects = phase?.kind === "direct" ? (phase.effects ?? []) : [];
  const effect = effects[0];
  const expiresAt = scalarBuffActiveEffectExpiration(
    actorId,
    spell.mechanics.duration,
  );
  if (
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target" ||
    phase.attachment.value.selection.mode !== "one" ||
    !("disposition" in phase.attachment.value.selection) ||
    phase.attachment.value.selection.disposition !== "willing" ||
    effects.length !== 1 ||
    effect?.kind !== "modify_roll_advantage" ||
    effect.mode !== "disadvantage" ||
    effect.on.length !== 1 ||
    effect.on[0] !== "attack_roll" ||
    effect.attackerTypeFilter === undefined ||
    !sameCreatureTypeSet(
      effect.attackerTypeFilter,
      PROTECTION_FROM_EVIL_AND_GOOD_CREATURE_TYPES,
    ) ||
    expiresAt === null
  ) {
    return null;
  }

  return {
    targeting: {
      kind: "targetList",
      minTargets: 1,
      maxTargets: 1,
      requiredTargetDisposition: "willing",
    },
    activeEffect: {
      kind: "creatureTypeProtection",
      sourceCombatantId: actorId,
      attackRollMode: "disadvantage",
      protectedAgainstCreatureTypes: [
        ...PROTECTION_FROM_EVIL_AND_GOOD_CREATURE_TYPES,
      ],
      preventedConditions: [
        ...PROTECTION_FROM_EVIL_AND_GOOD_PREVENTED_CONDITIONS,
      ],
      preventsPossession: true,
      expiresAt,
    },
    rangeFeet: movementFeet(5),
  };
}

function dispelEvilAndGoodProtectionSpellProjection(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
): Pick<
  CreatureTypeProtectionSpellInvocation,
  "activeEffect" | "rangeFeet" | "targeting"
> | null {
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 5 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.attachment.kind !== "self" ||
    spell.mechanics.operations.length !== 1
  ) {
    return null;
  }
  const operation = spell.mechanics.operations[0];
  const effect = operation?.effect;
  const expiresAt = scalarBuffActiveEffectExpiration(
    actorId,
    spell.mechanics.duration,
  );
  if (
    operation?.trigger.kind !== "passive" ||
    operation.predicate !== undefined ||
    operation.targetLimit !== undefined ||
    operation.usageLimit !== undefined ||
    effect?.kind !== "modify_roll_advantage" ||
    effect.mode !== "disadvantage" ||
    effect.affects !== "rolls_against_self" ||
    effect.on.length !== 1 ||
    effect.on[0] !== "attack_roll" ||
    effect.attackerTypeFilter === undefined ||
    !sameCreatureTypeSet(
      effect.attackerTypeFilter,
      DISPEL_EVIL_AND_GOOD_CREATURE_TYPES,
    ) ||
    expiresAt === null
  ) {
    return null;
  }

  return {
    targeting: { kind: "self" },
    activeEffect: {
      kind: "creatureTypeProtection",
      sourceCombatantId: actorId,
      attackRollMode: "disadvantage",
      protectedAgainstCreatureTypes: [...DISPEL_EVIL_AND_GOOD_CREATURE_TYPES],
      preventedConditions: [],
      preventsPossession: false,
      expiresAt,
    },
    rangeFeet: movementFeet(0),
  };
}

function discoverCreatureTypeProtectionCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<CreatureTypeProtectionSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  if (invocation.targeting.kind === "self") {
    return [
      {
        subject: {
          tag: "actionSpell" as const,
          actorId,
          procedureRef: invocation.sourceProcedureRef,
          mode: { tag: "cast" as const },
        },
        initialHoles: [],
      },
    ];
  }
  const targetHole = spellTargetHole(state, actorId, invocation);
  const castActs =
    targetHole.choices.length === 0
      ? []
      : [
          {
            subject: {
              tag: "actionSpell" as const,
              actorId,
              procedureRef: invocation.sourceProcedureRef,
              mode: { tag: "cast" as const },
            },
            initialHoles: [targetHole],
          },
        ];
  return castActs;
}

function resolveCreatureTypeProtection(
  input: SpellProcedureProfileResolveInput<CreatureTypeProtectionSpellInvocation>,
): BattleResolutionResult {
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.targetAbilityChoices !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Creature-type protection spells use one target fill.",
    );
  }

  const targetSelectionResolution = spellSelectionResolution(
    input.input.state,
    input.input.subject,
    creatureTypeProtectionSpellTargetSelection(input),
  );
  if (targetSelectionResolution.tag === "resolution")
    return targetSelectionResolution.result;
  const targetSelection = targetSelectionResolution.selection;

  if (input.storedGlyphRelease === undefined) {
    const spellCastReactionWindow = maybeOpenSpellCastReactionWindow(
      input,
      targetSelection.targetIds,
      { kind: "magicAction" },
      undefined,
    );
    if (spellCastReactionWindow !== null) {
      return spellCastReactionWindow;
    }
  }

  const concentrationBase =
    input.storedGlyphRelease !== undefined
      ? input.input.state
      : spellRequiresConcentration(input.invocation)
        ? breakBattleConcentration(input.input.state, input.actorId)
        : input.input.state;
  const effected = applyCreatureTypeProtectionEffect(
    concentrationBase,
    input.actorId,
    targetSelection.targetIds,
    input.invocation,
  );
  if (input.storedGlyphRelease !== undefined) {
    return resolvedResult(effected);
  }
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    ...(input.storedGlyphRelease !== undefined
      ? { startConcentration: false }
      : {}),
  });
  return resolutionFromStateResult(resourced);
}

function creatureTypeProtectionSpellTargetSelection(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation<CreatureTypeProtectionSpellInvocation>;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): CreatureTypeProtectionTargetSelection {
  if (input.invocation.targeting.kind === "self") {
    return input.fillSet.targetId !== undefined ||
      input.fillSet.targetList !== undefined ||
      input.fillSet.targetSpatialFacts.length > 0
      ? {
          tag: "invalid",
          message:
            "Self creature-type protection spells do not accept target fills.",
        }
      : { tag: "ok", targetIds: [input.actorId] };
  }
  if (input.fillSet.targetList !== undefined) {
    return {
      tag: "invalid",
      message: "Creature-type protection spells require one target choice.",
    };
  }
  if (input.fillSet.targetId === undefined) {
    return {
      tag: "needsHoles",
      hole: spellTargetHole(input.input.state, input.actorId, input.invocation),
    };
  }
  return spellTargetIsLegal(
    input.input.state,
    input.actorId,
    input.fillSet.targetId,
    input.invocation,
    input.fillSet.targetSpatialFacts,
  )
    ? { tag: "ok", targetIds: [input.fillSet.targetId] }
    : {
        tag: "invalid",
        message:
          "Creature-type protection spell target must be a combatant within the selected spell's supported range.",
      };
}

function applyCreatureTypeProtectionEffect(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: BattleExecutableSpellInvocation<CreatureTypeProtectionSpellInvocation>,
): BattleState {
  return targetIds.reduce((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const nextEffect = {
      ...invocation.activeEffect,
      sourceProcedureRef: invocation.sourceProcedureRef,
      sourceCombatantId: actorId,
    };
    const activeEffects = [
      ...target.activeEffects.filter(
        (effect) =>
          !(
            effect.kind === "creatureTypeProtection" &&
            effect.sourceProcedureRef === invocation.sourceProcedureRef &&
            effect.sourceCombatantId === actorId
          ),
      ),
      nextEffect,
    ];
    return {
      ...nextState,
      combatants: new Map(nextState.combatants).set(targetId, {
        ...target,
        activeEffects,
      }),
    };
  }, state);
}

const CreatureTypeProtectionInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("creatureTypeProtection"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("magicAction"),
    targeting: Schema.Union(
      Schema.Struct({
        kind: Schema.Literal("self"),
      }),
      Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Number,
        requiredTargetDisposition: Schema.Literal("willing"),
      }),
    ),
    activeEffect: Schema.Struct({
      kind: Schema.Literal("creatureTypeProtection"),
      sourceCombatantId: CombatantId,
      attackRollMode: Schema.Literal("disadvantage"),
      protectedAgainstCreatureTypes: Schema.Array(CreatureTypeSchema),
      preventedConditions: Schema.Array(
        Schema.Literal(...PROTECTION_FROM_EVIL_AND_GOOD_PREVENTED_CONDITIONS),
      ),
      preventsPossession: Schema.Boolean,
      expiresAt: BattleActiveEffectExpirationSchema,
    }),
    rangeFeet: MovementFeet,
  }),
);
export const creatureTypeProtectionProfile: SpellProcedureDeclaration<
  "creatureTypeProtection",
  CreatureTypeProtectionSpellInvocation
> = {
  procedure: "creatureTypeProtection",
  executionSchema: CreatureTypeProtectionInvocationSchema,
  admit: admitCreatureTypeProtection,
  discoverCastAct: discoverCreatureTypeProtectionCastAct,
  resolve: resolveCreatureTypeProtection,
};
