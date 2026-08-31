import { resolveSpellActiveEffectCast } from "../spell-active-effect-resolution.ts";
import { actionSpellCastCandidatesForTargetHole } from "../spell-cast-candidate.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-condition-removal-protection
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION
//
// The conditionRemovalProtection Spell Procedure Profile: a prepared action
// spell that removes Poisoned from one touched creature, then grants Poisoned
// Saving Throw Advantage and Poison damage Resistance.

import { movementFeet } from "@dnd/shared/types";

import {
  type ActionSpellBattleResolutionInput,
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type ConditionRemovalProtectionSpellInvocation,
} from "../../battle-state-execution.ts";
import { CombatantId } from "../../identity.ts";
import { BattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
import { allocateBattleEffectOccurrencesForCreature } from "../../effect-execution-ref.ts";

import { spellSelectionResolution } from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { ATTACK_TARGET_HOLE_ID } from "../battle-runtime-protocol.ts";
import { battleCreatureAfterConditionRemoval } from "../spell-condition-effects-helpers.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import {
  creatureTargetSelection,
  scalarBuffActiveEffectExpiration,
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

function admitConditionRemovalProtection(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly ConditionRemovalProtectionSpellInvocation[] {
  const projection = conditionRemovalProtectionSpellProjection(
    ctx.actor.combatantId,
    spell,
  );
  if (projection === null) {
    return [];
  }
  return preparedSpellSlotInvocations(spell, ctx, (base) => ({
    ...base,
    procedure: "conditionRemovalProtection",
    actionCost: "magicAction",
    ...projection,
  }));
}

function conditionRemovalProtectionSpellProjection(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
): Pick<
  ConditionRemovalProtectionSpellInvocation,
  "protection" | "rangeFeet" | "targeting"
> | null {
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "touch" ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "hour" ||
    spell.mechanics.duration.value.amount !== 1 ||
    spell.mechanics.phases.length !== 1
  ) {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const composite =
    phase?.kind === "direct" && phase.effects?.[0]?.kind === "composite"
      ? phase.effects[0]
      : null;
  const effects = composite?.effects ?? [];
  const conditionRemoval = effects.find(
    (effect) => effect.kind === "remove_condition",
  );
  const conditionSaveRollMode = effects.find(
    (effect) => effect.kind === "modify_roll_advantage",
  );
  const damageResistance = effects.find(
    (effect) => effect.kind === "grant_resistance",
  );
  const expiresAt = scalarBuffActiveEffectExpiration(
    actorId,
    spell.mechanics.duration,
  );
  if (
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target" ||
    phase.attachment.value.selection.mode !== "one" ||
    !creatureTargetSelection(phase.attachment.value.selection) ||
    composite === null ||
    effects.length !== 3 ||
    conditionRemoval?.kind !== "remove_condition" ||
    conditionRemoval.condition !== "poisoned" ||
    conditionSaveRollMode?.kind !== "modify_roll_advantage" ||
    (conditionSaveRollMode.affects ?? "self_roll") !== "self_roll" ||
    conditionSaveRollMode.mode !== "advantage" ||
    !sameStringSet(conditionSaveRollMode.on, ["saving_throw"]) ||
    conditionSaveRollMode.conditionFilter === undefined ||
    !sameStringSet(conditionSaveRollMode.conditionFilter, ["poisoned"]) ||
    conditionSaveRollMode.skillFilter !== undefined ||
    conditionSaveRollMode.abilityFilter !== undefined ||
    conditionSaveRollMode.saveAbilityFilter !== undefined ||
    conditionSaveRollMode.saveSourceFilter !== undefined ||
    conditionSaveRollMode.contextRangeFeet !== undefined ||
    conditionSaveRollMode.spellSourceFilter !== undefined ||
    conditionSaveRollMode.attackerTypeFilter !== undefined ||
    conditionSaveRollMode.count !== undefined ||
    conditionSaveRollMode.expiresOn !== undefined ||
    damageResistance?.kind !== "grant_resistance" ||
    damageResistance.damageType !== "poison" ||
    damageResistance.sourceFilter !== undefined ||
    expiresAt === null
  ) {
    return null;
  }
  return {
    targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
    protection: {
      conditionSaveRollMode: {
        kind: "conditionSavingThrowRollMode",
        sourceCombatantId: actorId,
        condition: "poisoned",
        mode: "advantage",
        expiresAt,
      },
      damageResistance: {
        kind: "damageResistance",
        sourceCombatantId: actorId,
        damageType: "poison",
        expiresAt,
      },
    },
    rangeFeet: movementFeet(5),
  };
}

function discoverConditionRemovalProtectionCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<ConditionRemovalProtectionSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  return actionSpellCastCandidatesForTargetHole(
    actorId,
    invocation.sourceProcedureRef,
    targetHole,
  );
}

function resolveConditionRemovalProtection(
  input: SpellProcedureProfileResolveInput<ConditionRemovalProtectionSpellInvocation>,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [ATTACK_TARGET_HOLE_ID])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Condition-removal protection spells use one target fill.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const targetSelectionResolution = spellSelectionResolution(
    input.input.state,
    input.input.subject,
    conditionRemovalProtectionSpellTargetSelection(input),
  );
  if (targetSelectionResolution.tag === "resolution")
    return targetSelectionResolution.result;
  const targetSelection = targetSelectionResolution.selection;

  return resolveSpellActiveEffectCast({
    resolution: input,
    targetIds: targetSelection.targetIds,
    castingResource: { kind: "magicAction" },
    applyEffect: (state) =>
      applyConditionRemovalProtectionEffect(
        state,
        input.actorId,
        targetSelection.targetIds,
        input.invocation,
      ),
  });
}

function conditionRemovalProtectionSpellTargetSelection(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation<ConditionRemovalProtectionSpellInvocation>;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): SpellSingleTargetSelection {
  return spellSingleTargetSelection({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
    targetListMessage:
      "Condition-removal protection spells require one target choice.",
    invalidTargetMessage:
      "Condition-removal protection spell target must be a combatant within the selected spell's supported range.",
  });
}

function applyConditionRemovalProtectionEffect(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: BattleExecutableSpellInvocation<ConditionRemovalProtectionSpellInvocation>,
): BattleState {
  return targetIds.reduce((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const condition = invocation.protection.conditionSaveRollMode.condition;
    const cleansedTarget = battleCreatureAfterConditionRemoval(
      target,
      condition,
    );
    const allocation = allocateBattleEffectOccurrencesForCreature({
      owner: cleansedTarget,
      effects: [
        {
          ...invocation.protection.conditionSaveRollMode,
          sourceProcedureRef: invocation.sourceProcedureRef,
          sourceCombatantId: actorId,
        },
        {
          ...invocation.protection.damageResistance,
          sourceProcedureRef: invocation.sourceProcedureRef,
          sourceCombatantId: actorId,
        },
      ],
    });
    const activeEffects = [
      ...allocation.owner.activeEffects.filter(
        (effect) =>
          !(
            (effect.kind === "conditionSavingThrowRollMode" ||
              effect.kind === "damageResistance") &&
            effect.sourceProcedureRef === invocation.sourceProcedureRef &&
            effect.sourceCombatantId === actorId
          ),
      ),
      ...allocation.effects,
    ];
    return {
      ...nextState,
      combatants: new Map(nextState.combatants).set(targetId, {
        ...allocation.owner,
        activeEffects,
      }),
    };
  }, state);
}

const ConditionRemovalProtectionInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("conditionRemovalProtection"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("magicAction"),
      targeting: Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Literal(1),
      }),
      protection: Schema.Struct({
        conditionSaveRollMode: Schema.Struct({
          ...BattleEffectOccurrenceTemplateSchemaFields,
          kind: Schema.Literal("conditionSavingThrowRollMode"),
          sourceCombatantId: CombatantId,
          condition: Schema.Literal("poisoned"),
          mode: Schema.Literal("advantage"),
          expiresAt: BattleActiveEffectExpirationSchema,
        }),
        damageResistance: Schema.Struct({
          ...BattleEffectOccurrenceTemplateSchemaFields,
          kind: Schema.Literal("damageResistance"),
          sourceCombatantId: CombatantId,
          damageType: Schema.Literal("poison"),
          expiresAt: BattleActiveEffectExpirationSchema,
        }),
      }),
      rangeFeet: MovementFeet,
    }),
  );
export const conditionRemovalProtectionProfile: SpellProcedureDeclaration<
  "conditionRemovalProtection",
  ConditionRemovalProtectionSpellInvocation
> = {
  procedure: "conditionRemovalProtection",
  executionSchema: ConditionRemovalProtectionInvocationSchema,
  admit: admitConditionRemovalProtection,
  discoverCastAct: discoverConditionRemovalProtectionCastAct,
  resolve: resolveConditionRemovalProtection,
};
