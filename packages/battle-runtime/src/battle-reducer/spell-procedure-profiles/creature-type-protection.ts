import { resolveSpellActiveEffectCast } from "../spell-active-effect-resolution.ts";
import {
  actionSpellCastCandidate,
  actionSpellCastCandidatesForTargetHole,
} from "../spell-cast-candidate.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
import { replaceTargetActiveEffect } from "../active-effect-replacement.ts";
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
  type BattleResolutionResult,
  type BattleState,
  type CreatureTypeProtectionSpellInvocation,
} from "../../battle-state-execution.ts";
import { CombatantId } from "../../identity.ts";
import { BattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
import {
  DISPEL_EVIL_AND_GOOD_CREATURE_TYPES as EXPULSION_PROTECTION_CREATURE_TYPES,
  PROTECTION_FROM_EVIL_AND_GOOD_CREATURE_TYPES as CONDITION_PREVENTION_PROTECTION_CREATURE_TYPES,
  PROTECTION_FROM_EVIL_AND_GOOD_PREVENTED_CONDITIONS as PROTECTED_CONDITIONS,
} from "../domain-constants.ts";

import { spellSelectionResolution } from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { ATTACK_TARGET_HOLE_ID } from "../battle-runtime-protocol.ts";
import {
  scalarBuffActiveEffectExpiration,
  sameCreatureTypeSet,
} from "../spells-profiles-support.ts";
import { spellTargetHole } from "../spells-holes-fills.ts";
import {
  spellSingleTargetSelection,
  type SpellSingleTargetSelection,
} from "../spells-resolve-target-selection.ts";
import type { SpellFillSet } from "../spells-resolve-fill-set.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { preparedSpellSlotInvocations } from "./profile.ts";
import { Schema } from "effect";
import { BattleEffectOccurrenceTemplateSchemaFields } from "../../active-effect/template-codec.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

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
  return preparedSpellSlotInvocations(spell, ctx, (base) => ({
    ...base,
    procedure: "creatureTypeProtection",
    actionCost: "magicAction",
    ...projection,
  }));
}

function creatureTypeProtectionSpellProjection(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
): Pick<
  CreatureTypeProtectionSpellInvocation,
  "activeEffect" | "rangeFeet" | "targeting"
> | null {
  const conditionPreventionProtectionProjection =
    conditionPreventionProtectionSpellProjection(actorId, spell);
  return (
    conditionPreventionProtectionProjection ??
    expulsionProtectionSpellProjection(actorId, spell)
  );
}

function conditionPreventionProtectionSpellProjection(
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
      CONDITION_PREVENTION_PROTECTION_CREATURE_TYPES,
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
        ...CONDITION_PREVENTION_PROTECTION_CREATURE_TYPES,
      ],
      preventedConditions: [...PROTECTED_CONDITIONS],
      preventsPossession: true,
      expiresAt,
    },
    rangeFeet: movementFeet(5),
  };
}

function expulsionProtectionSpellProjection(
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
      EXPULSION_PROTECTION_CREATURE_TYPES,
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
      protectedAgainstCreatureTypes: [...EXPULSION_PROTECTION_CREATURE_TYPES],
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
      actionSpellCastCandidate(actorId, invocation.sourceProcedureRef, []),
    ];
  }
  const targetHole = spellTargetHole(state, actorId, invocation);
  return actionSpellCastCandidatesForTargetHole(
    actorId,
    invocation.sourceProcedureRef,
    targetHole,
  );
}

function resolveCreatureTypeProtection(
  input: SpellProcedureProfileResolveInput<CreatureTypeProtectionSpellInvocation>,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [ATTACK_TARGET_HOLE_ID])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Creature-type protection spells use one target fill.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const targetSelectionResolution = spellSelectionResolution(
    input.input.state,
    input.input.subject,
    creatureTypeProtectionSpellTargetSelection(input),
  );
  if (targetSelectionResolution.tag === "resolution")
    return targetSelectionResolution.result;
  const targetSelection = targetSelectionResolution.selection;

  return resolveSpellActiveEffectCast({
    resolution: input,
    targetIds: targetSelection.targetIds,
    castingResource: { kind: "magicAction" },
    applyEffect: (state) =>
      applyCreatureTypeProtectionEffect(
        state,
        input.actorId,
        targetSelection.targetIds,
        input.invocation,
      ),
  });
}

function creatureTypeProtectionSpellTargetSelection(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation<CreatureTypeProtectionSpellInvocation>;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): SpellSingleTargetSelection {
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
  return spellSingleTargetSelection({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
    targetListMessage:
      "Creature-type protection spells require one target choice.",
    invalidTargetMessage:
      "Creature-type protection spell target must be a combatant within the selected spell's supported range.",
  });
}

function applyCreatureTypeProtectionEffect(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: BattleExecutableSpellInvocation<CreatureTypeProtectionSpellInvocation>,
): BattleState {
  return targetIds.reduce(
    (nextState, targetId) =>
      replaceTargetActiveEffect(
        nextState,
        targetId,
        (effect) =>
          effect.kind === "creatureTypeProtection" &&
          effect.sourceProcedureRef === invocation.sourceProcedureRef &&
          effect.sourceCombatantId === actorId,
        {
          ...invocation.activeEffect,
          sourceProcedureRef: invocation.sourceProcedureRef,
          sourceCombatantId: actorId,
        },
      ),
    state,
  );
}

const CreatureTypeProtectionInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("creatureTypeProtection"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("magicAction"),
    targeting: Schema.Union([
      Schema.Struct({
        kind: Schema.Literal("self"),
      }),
      Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Number,
        requiredTargetDisposition: Schema.Literal("willing"),
      }),
    ]),
    activeEffect: Schema.Struct({
      ...BattleEffectOccurrenceTemplateSchemaFields,
      kind: Schema.Literal("creatureTypeProtection"),
      sourceCombatantId: CombatantId,
      attackRollMode: Schema.Literal("disadvantage"),
      protectedAgainstCreatureTypes: Schema.Array(CreatureTypeSchema),
      preventedConditions: Schema.Array(Schema.Literals(PROTECTED_CONDITIONS)),
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
