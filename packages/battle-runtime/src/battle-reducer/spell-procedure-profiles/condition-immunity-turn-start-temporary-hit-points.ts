import { maybeOpenSpellCastReactionWindow } from "../spell-cast-reaction-window.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-condition-immunity-turn-start-temporary-hit-points
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-glyph-stored-concentration-full-duration
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CONDITION_IMMUNITY_TURN_START_TEMPORARY_HIT_POINTS
//
// The conditionImmunityAndTurnStartTemporaryHitPoints Spell Procedure Profile:
// a prepared Magic Action spell that gives willing touched creatures Frightened
// immunity and Temporary Hit Points at the start of each of their turns.

import { movementFeet, type AbilityModifier } from "@dnd/shared/types";
import type {
  DiceAmount as SurfaceDiceAmount,
  TargetSelection,
} from "@dnd/surface/surface/types";

import { battleCreatureWithSpellActiveEffects } from "../../active-effect/lifecycle.ts";
import {
  type ActionSpellBattleResolutionInput,
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation,
} from "../../battle-state-execution.ts";
import { CombatantId } from "../../identity.ts";
import { BattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
import { breakBattleConcentration } from "../damage-apply.ts";
import { targetListSpellUsesTargetListHole } from "../spells-discovery.ts";

import { spellSelectionResolution } from "../needs-holes-result.ts";
import {
  invalidResult,
  resolvedResult,
  resolutionFromStateResult,
} from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { ATTACK_TARGET_HOLE_ID } from "../battle-runtime-protocol.ts";
import { conditionHadNonSpellSourceBeforeSpellEffect } from "../spell-condition-effects-helpers.ts";
import { scalarBuffSpellTargetCount } from "../spells-execution-facts.ts";
import { scalarBuffActiveEffectExpiration } from "../spells-profiles-support.ts";
import {
  spellTargetHole,
  spellTargetIsLegal,
  spellTargetListHole,
  validateSpellTargetList,
} from "../spells-holes-fills.ts";
import { spellTargetListHoleId } from "../spells-targeting.ts";
import type { SpellFillSet } from "../spells-resolve-fill-set.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
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

type ConditionImmunityAndTurnStartTemporaryHitPointsTargetSelection =
  | { readonly tag: "ok"; readonly targetIds: readonly CombatantId[] }
  | { readonly tag: "needsHoles"; readonly hole: BattleHole }
  | { readonly tag: "invalid"; readonly message: string };

function admitConditionImmunityAndTurnStartTemporaryHitPoints(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation[] {
  const projection =
    conditionImmunityAndTurnStartTemporaryHitPointsSpellProjection(
      ctx.actor.combatantId,
      spell,
      ctx.actor.origin.spellcasting.spellcastingAbilityModifier,
    );
  if (projection === null) {
    return [];
  }
  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (
      slot,
    ): readonly ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation[] => {
      if (Number(slot.spellLevel) < spell.mechanics.level) {
        return [];
      }
      const maxTargets = scalarBuffSpellTargetCount(
        projection.targetSelection,
        spell.mechanics.level,
        slot.spellLevel,
      );
      return maxTargets === null
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
              procedure: "conditionImmunityAndTurnStartTemporaryHitPoints",
              spell,
              actionCost: "magicAction",
              targeting: {
                kind: "targetList",
                minTargets: 1,
                maxTargets,
              },
              activeEffects: projection.activeEffects,
              rangeFeet: movementFeet(5),
            },
          ];
    },
  );
}

function conditionImmunityAndTurnStartTemporaryHitPointsSpellProjection(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
  spellcastingAbilityModifier: AbilityModifier,
): {
  readonly targetSelection: TargetSelection;
  readonly activeEffects: ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation["activeEffects"];
} | null {
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "touch" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.attachment.kind !== "hole" ||
    spell.mechanics.attachment.value.kind !== "target" ||
    spell.mechanics.operations.length !== 2
  ) {
    return null;
  }
  const immunityOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "grant_condition_immunity" &&
      operation.effect.condition === "frightened",
  );
  const temporaryHitPointsOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "on_attached_turn_start" &&
      operation.effect.kind === "grant_temp_hp",
  );
  if (
    immunityOperation === undefined ||
    temporaryHitPointsOperation === undefined ||
    temporaryHitPointsOperation.effect.kind !== "grant_temp_hp" ||
    !isSpellcastingModifierTemporaryHitPointsAmount(
      temporaryHitPointsOperation.effect.amount,
    )
  ) {
    return null;
  }
  const expiresAt = scalarBuffActiveEffectExpiration(
    actorId,
    spell.mechanics.duration,
  );
  if (expiresAt === null) {
    return null;
  }
  return {
    targetSelection: spell.mechanics.attachment.value.selection,
    activeEffects: [
      {
        kind: "conditionImmunity",
        sourceCombatantId: actorId,
        condition: "frightened",
        expiresAt,
      },
      {
        kind: "turnStartTemporaryHitPoints",
        sourceCombatantId: actorId,
        amount: Number(spellcastingAbilityModifier),
        expiresAt,
      },
    ],
  };
}

function isSpellcastingModifierTemporaryHitPointsAmount(
  amount: SurfaceDiceAmount,
): boolean {
  return (
    amount.kind === "fixed" &&
    amount.expr.dice === 0 &&
    amount.expr.dieSize === 1 &&
    (amount.expr.flat ?? 0) === 0 &&
    amount.expr.spellcastingMod === true
  );
}

function discoverConditionImmunityAndTurnStartTemporaryHitPointsCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = targetListSpellUsesTargetListHole(invocation)
    ? spellTargetListHole(state, actorId, invocation)
    : spellTargetHole(state, actorId, invocation);
  return targetHole.choices.length === 0
    ? []
    : [
        {
          subject: {
            tag: "actionSpell",
            actorId,
            procedureRef: invocation.sourceProcedureRef,
            mode: { tag: "cast" },
          },
          initialHoles: [targetHole],
        },
      ];
}

function resolveConditionImmunityAndTurnStartTemporaryHitPoints(
  input: SpellProcedureProfileResolveInput<ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation>,
): BattleResolutionResult {
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [
      ATTACK_TARGET_HOLE_ID,
      spellTargetListHoleId(input.invocation),
    ])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Condition-immunity turn-start Temporary Hit Points spells use target fills only.",
    );
  }
  const targetSelectionResolution = spellSelectionResolution(
    input.input.state,
    input.input.subject,
    conditionImmunityAndTurnStartTemporaryHitPointsSpellTargetSelection(input),
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
      : breakBattleConcentration(input.input.state, input.actorId);
  const effected = applyConditionImmunityAndTurnStartTemporaryHitPointsEffects(
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

function conditionImmunityAndTurnStartTemporaryHitPointsSpellTargetSelection(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation<ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation>;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): ConditionImmunityAndTurnStartTemporaryHitPointsTargetSelection {
  if (input.invocation.targeting.maxTargets === 1) {
    if (input.fillSet.targetList !== undefined) {
      return {
        tag: "invalid",
        message:
          "Single-target condition-immunity turn-start Temporary Hit Points spells require one target choice.",
      };
    }
    if (input.fillSet.targetId === undefined) {
      return {
        tag: "needsHoles",
        hole: spellTargetHole(
          input.input.state,
          input.actorId,
          input.invocation,
        ),
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
            "Condition-immunity turn-start Temporary Hit Points spell target must be a combatant within the selected spell's supported range.",
        };
  }

  if (input.fillSet.targetId !== undefined) {
    return {
      tag: "invalid",
      message:
        "Multi-target condition-immunity turn-start Temporary Hit Points spells require a target list.",
    };
  }
  if (input.fillSet.targetList === undefined) {
    return {
      tag: "needsHoles",
      hole: spellTargetListHole(
        input.input.state,
        input.actorId,
        input.invocation,
      ),
    };
  }
  const validation = validateSpellTargetList(
    input.input.state,
    input.actorId,
    input.invocation,
    input.fillSet.targetList.targetIds,
    input.fillSet.targetList.spatialFacts,
  );
  return validation === null
    ? { tag: "ok", targetIds: input.fillSet.targetList.targetIds }
    : { tag: "invalid", message: validation };
}

function applyConditionImmunityAndTurnStartTemporaryHitPointsEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: BattleExecutableSpellInvocation<ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation>,
): BattleState {
  return targetIds.reduce((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const nextEffects = invocation.activeEffects.map((effect) =>
      effect.kind === "conditionImmunity"
        ? {
            ...effect,
            sourceProcedureRef: invocation.sourceProcedureRef,
            sourceCombatantId: actorId,
            conditionHadNonSpellSource:
              conditionHadNonSpellSourceBeforeSpellEffect(
                target,
                effect.condition,
              ),
          }
        : {
            ...effect,
            sourceProcedureRef: invocation.sourceProcedureRef,
            sourceCombatantId: actorId,
          },
    );
    const activeEffects = [
      ...target.activeEffects.filter(
        (effect) =>
          !(
            (effect.kind === "conditionImmunity" ||
              effect.kind === "turnStartTemporaryHitPoints") &&
            effect.sourceProcedureRef === invocation.sourceProcedureRef
          ),
      ),
      ...nextEffects,
    ];
    return {
      ...nextState,
      combatants: new Map(nextState.combatants).set(
        targetId,
        battleCreatureWithSpellActiveEffects(target, activeEffects),
      ),
    };
  }, state);
}

const ConditionImmunityAndTurnStartTemporaryHitPointsInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal(
        "conditionImmunityAndTurnStartTemporaryHitPoints",
      ),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("magicAction"),
      targeting: Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Number,
      }),
      activeEffects: Schema.Tuple(
        Schema.Struct({
          kind: Schema.Literal("conditionImmunity"),
          sourceCombatantId: CombatantId,
          condition: Schema.Literal("frightened"),
          expiresAt: BattleActiveEffectExpirationSchema,
        }),
        Schema.Struct({
          kind: Schema.Literal("turnStartTemporaryHitPoints"),
          sourceCombatantId: CombatantId,
          amount: Schema.Number,
          expiresAt: BattleActiveEffectExpirationSchema,
        }),
      ),
      rangeFeet: MovementFeet,
    }),
  );
export const conditionImmunityAndTurnStartTemporaryHitPointsProfile: SpellProcedureDeclaration<
  "conditionImmunityAndTurnStartTemporaryHitPoints",
  ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation
> = {
  procedure: "conditionImmunityAndTurnStartTemporaryHitPoints",
  executionSchema:
    ConditionImmunityAndTurnStartTemporaryHitPointsInvocationSchema,
  admit: admitConditionImmunityAndTurnStartTemporaryHitPoints,
  discoverCastAct:
    discoverConditionImmunityAndTurnStartTemporaryHitPointsCastAct,
  resolve: resolveConditionImmunityAndTurnStartTemporaryHitPoints,
};
