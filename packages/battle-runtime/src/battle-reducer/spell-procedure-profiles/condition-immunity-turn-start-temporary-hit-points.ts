// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-condition-immunity-turn-start-temporary-hit-points
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CONDITION_IMMUNITY_TURN_START_TEMPORARY_HIT_POINTS
//
// The conditionImmunityAndTurnStartTemporaryHitPoints Spell Procedure Profile:
// a prepared Magic Action spell that gives willing touched creatures Frightened
// immunity and Temporary Hit Points at the start of each of their turns.

import { movementFeet, type AbilityModifier } from "@dnd/shared/types";
import type {
  DiceAmount as SurfaceDiceAmount,
  SpellRecord,
  TargetSelection,
} from "@dnd/surface/surface/types";

import { battleCreatureWithSpellActiveEffects } from "../../active-effect/lifecycle.ts";
import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  maybeOpenReactionWindow,
  snapshotBattle,
  type ActionSpellBattleResolutionInput,
  type AvailableBattleAct,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation,
} from "../../battle-reducer.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import { breakBattleConcentration } from "../damage-apply.ts";
import { targetListSpellUsesTargetListHole } from "../spells-discovery.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellCastReactionFrame } from "../spell-cast-reaction-frame.ts";
import { conditionHadNonSpellSourceBeforeSpellEffect } from "../spell-condition-effects-helpers.ts";
import { scalarBuffSpellTargetCount } from "../spells-profile-shared.ts";
import { scalarBuffActiveEffectExpiration } from "../spells-profiles-support.ts";
import {
  spellTargetHole,
  spellTargetIsLegal,
  spellTargetListHole,
  validateSpellTargetList,
} from "../spells-holes-fills.ts";
import type { SpellFillSet } from "../spells-resolve-fill-set.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";

type ConditionImmunityAndTurnStartTemporaryHitPointsTargetSelection =
  | { readonly tag: "ok"; readonly targetIds: readonly CombatantId[] }
  | { readonly tag: "needsHoles"; readonly hole: BattleHole }
  | { readonly tag: "invalid"; readonly message: string };

function admitConditionImmunityAndTurnStartTemporaryHitPoints(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation[] {
  const projection =
    conditionImmunityAndTurnStartTemporaryHitPointsSpellProjection(
      ctx.actorId,
      spell,
      ctx.spellcasting.spellcastingAbilityModifier,
    );
  if (projection === null) {
    return [];
  }
  return ctx.spellcasting.spellSlots.flatMap(
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
  spell: SpellRecord,
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
        sourceSpellId: spell.id,
        sourceCombatantId: actorId,
        condition: "frightened",
        expiresAt,
      },
      {
        kind: "turnStartTemporaryHitPoints",
        sourceSpellId: spell.id,
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
  invocation: ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation,
): readonly AvailableBattleAct[] {
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
            invocation:
              conditionImmunityAndTurnStartTemporaryHitPointsInvocationRef(
                invocation,
              ),
            mode: { tag: "cast" },
          },
          label: invocation.spell.name,
          summary:
            conditionImmunityAndTurnStartTemporaryHitPointsCastSummary(
              invocation,
            ),
          initialHoles: [targetHole],
        },
      ];
}

function conditionImmunityAndTurnStartTemporaryHitPointsInvocationRef(
  invocation: ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "conditionImmunityAndTurnStartTemporaryHitPoints",
  };
}

function conditionImmunityAndTurnStartTemporaryHitPointsCastSummary(
  invocation: ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function resolveConditionImmunityAndTurnStartTemporaryHitPoints(
  input: SpellProcedureProfileResolveInput<
    ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation,
    ActionSpellBattleResolutionInput
  >,
): BattleResolutionResult {
  if (
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.attackSequencePartFills.length > 0 ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.conditionChoice !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
    input.fillSet.areaChoice !== undefined ||
    input.fillSet.teleportDestination !== undefined ||
    input.fillSet.dancingLightsPlacement !== undefined ||
    input.fillSet.damageTypeChoice !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.movement !== undefined ||
    input.fillSet.thaumaturgyActiveOneMinuteEffectCount !== undefined ||
    input.fillSet.hideousLaughterDamageRepeatSaves.length > 0 ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.spellDamageReductionRolls.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Condition-immunity turn-start Temporary Hit Points spells use target fills only.",
    );
  }
  const targetSelection =
    conditionImmunityAndTurnStartTemporaryHitPointsSpellTargetSelection(input);
  if (targetSelection.tag === "needsHoles") {
    return needsHolesResult(input.input.state, input.input.subject, [
      targetSelection.hole,
    ]);
  }
  if (targetSelection.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      targetSelection.message,
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: targetSelection.targetIds,
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

  const concentrationBase = breakBattleConcentration(
    input.input.state,
    input.actorId,
  );
  const effected = applyConditionImmunityAndTurnStartTemporaryHitPointsEffects(
    concentrationBase,
    input.actorId,
    targetSelection.targetIds,
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

function conditionImmunityAndTurnStartTemporaryHitPointsSpellTargetSelection(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation;
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
  invocation: ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation,
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
            sourceCombatantId: actorId,
            conditionHadNonSpellSource:
              conditionHadNonSpellSourceBeforeSpellEffect(
                target,
                effect.condition,
              ),
          }
        : { ...effect, sourceCombatantId: actorId },
    );
    const activeEffects = [
      ...target.activeEffects.filter(
        (effect) =>
          !(
            (effect.kind === "conditionImmunity" ||
              effect.kind === "turnStartTemporaryHitPoints") &&
            effect.sourceSpellId === invocation.spell.id
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

export const conditionImmunityAndTurnStartTemporaryHitPointsProfile: SpellProcedureProfile<
  "conditionImmunityAndTurnStartTemporaryHitPoints",
  ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation
> = {
  procedure: "conditionImmunityAndTurnStartTemporaryHitPoints",
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  isTargetListInvocation: true,
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitConditionImmunityAndTurnStartTemporaryHitPoints,
  discoverCastAct:
    discoverConditionImmunityAndTurnStartTemporaryHitPointsCastAct,
  castSummary: conditionImmunityAndTurnStartTemporaryHitPointsCastSummary,
  invocationRef: conditionImmunityAndTurnStartTemporaryHitPointsInvocationRef,
  resolve: resolveConditionImmunityAndTurnStartTemporaryHitPoints,
};
