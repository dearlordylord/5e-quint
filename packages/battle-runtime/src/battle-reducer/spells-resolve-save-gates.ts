// Save-gated spell resolution extracted from spells-resolve.ts.
// Owns save-gated damage, condition, and attack-roll-advantage procedures.

// KERNEL-COVERAGE: runtime-owner BATTLE.COMMAND.OPTION_AND_NEXT_TURN BATTLE.SPELL.SLEEP_REPEAT_SAVE_LIFECYCLE
import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  damageAmount as toDamageAmount,
  type MovementFeet,
} from "@dnd/shared/types";
import { Either } from "effect";
import type { BattleReactionTrigger } from "../battle-reaction-triggers.ts";
import {
  ATTACK_TARGET_HOLE_ID,
  isTargetListSpellInvocation,
  openAfterDamageSequenceReactionWindow,
  spendReaction,
  maybeOpenReactionWindow,
  snapshotBattle,
  type ActionSpellBattleResolutionInput,
  type BattleActiveEffect,
  type BattleHoleId,
  type BattleHole,
  type BattleAfterDamageEvent,
  type BattleFill,
  type BattleSavingThrowOutcome,
  type BattleObjectDamageOutcome,
  type BattleObjectIgnitionOutcome,
  type BattleResolutionResult,
  type BattleGustOfWindLinePushDisposition,
  type BattleSpellAreaChoice,
  type BattleSpellSavingThrowOutcomeHole,
  type BattleSpellSavingThrowOutcomeValue,
  type BattleThunderwavePushDisposition,
  type BattleState,
  type SaveDamageResult,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import { spellId, type CombatantId } from "../identity.ts";
import {
  damageDispositionFillFor,
  damageDispositionFillsValidation,
  damageDispositionForTarget,
  zeroHitPointReplacementDispositionHole,
} from "./attack-damage-apply.ts";
import { extendSavingThrowOngoingFeatures } from "./attack-roll.ts";
import { combatantCanTakeReactions } from "./creature-state.ts";
import {
  breakBattleConcentration,
  damageLifecycleConcentrationSavingThrowHoles,
  damageLifecycleHideousLaughterDamageRepeatSaveFillCheck,
  damageLifecycleHideousLaughterDamageRepeatSaveHoles,
  fillsMatchingHoleIds,
} from "./damage-apply.ts";
import { needsHolesResult } from "./hole-helpers.ts";
import { invalidResult } from "./result-helpers.ts";
import { applyBattleMovement } from "./readied-release.ts";
import { reactionSpellTargetFactsForAfterDamage } from "./reaction-triggered-spells.ts";
import { sanctuaryTargetingInterdictionCheck } from "./sanctuary-targeting-interdiction.ts";
import { spellCastReactionFrame } from "./spell-cast-reaction-frame.ts";
import {
  applyCommandPendingEffects,
  applyFailedSaveAttackRollAdvantageEffects,
  applyGreaseGroundHazardCastEffects,
  applyHideousLaughterEffects,
  applySleepPendingRepeatSaveEffects,
  applyFailedSaveSpellActiveEffects,
  applyFailedSaveSpellConditionEffects,
  applySaveGatedConditionImmunityEffects,
  selectFailedSaveConditionEffect,
  saveGatedAttackRollAdvantageInvocationIsFaerieFire,
  applySpellDamage,
  saveGateDamageResultForOutcome,
  commandOptionChoiceHole,
  carefulSpellProtectedTargetsHoleId,
  carefulSpellProtectedTargetsHole,
  heightenedSpellTargetChoiceHoleId,
  spellConditionChoiceHole,
  spellDamageAmountForTarget,
  spellDamageHole,
  heightenedSpellTargetChoiceHole,
  spellObjectDamageOutcome,
  spellSavingThrowOutcomeHole,
  spellSavingThrowTargeting,
  spellTargetHole,
  spellTargetIsLegal,
  spellTargetListHole,
  validateSpellDamageFill,
  validateSpellTargetList,
} from "./spells-holes-fills.ts";
import { battleCreatureType } from "./domain-helpers.ts";
import {
  CAREFUL_METAMAGIC_EFFECT_KIND,
  HEIGHTENED_METAMAGIC_EFFECT_KIND,
} from "./metamagic.ts";

import {
  spendSpellCastResources,
  spellRequiresConcentration,
} from "./spells-resolve-resources.ts";

import { spellFillSet, type SpellFillSet } from "./spells-resolve-fill-set.ts";
import type { CharacterBattleMetamagicOptionFact } from "../character-battle-resources.ts";

import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
import {
  parseBattleMovement,
  readiedMovementHole,
  readiedMovementBudgetForActor,
} from "./turn-end-movement.ts";

type SaveMetamagicSelectionState =
  | {
      readonly tag: "ok";
      readonly carefulSpellProtectedTargetIds: readonly CombatantId[];
      readonly heightenedSpellTargetId: CombatantId | undefined;
    }
  | {
      readonly tag: "needsHoles";
      readonly holes: readonly BattleHole[];
    }
  | {
      readonly tag: "invalid";
      readonly message: string;
    };

function metamagicApplicationsIncludeCareful(
  applications: readonly CharacterBattleMetamagicOptionFact[] | undefined,
): boolean {
  return (
    applications?.some(
      (application) => application.effectKind === CAREFUL_METAMAGIC_EFFECT_KIND,
    ) ?? false
  );
}

function metamagicApplicationsIncludeHeightened(
  applications: readonly CharacterBattleMetamagicOptionFact[] | undefined,
): boolean {
  return (
    applications?.some(
      (application) =>
        application.effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
    ) ?? false
  );
}

function carefulSpellProtectedTargetLimit(
  state: BattleState,
  actorId: CombatantId,
): number {
  const actor = state.combatants.get(actorId);
  return actor?.origin.kind === "character" &&
    actor.origin.spellcasting !== undefined
    ? Math.max(1, Number(actor.origin.spellcasting.spellcastingAbilityModifier))
    : 1;
}

export function saveMetamagicSelectionState(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "saveGatedDamage"
        | "saveGatedCondition"
        | "saveGatedConditionImmunity"
        | "saveGatedAttackRollAdvantage"
        | "hideousLaughter"
        | "command"
        | "greaseGroundHazard"
        | "gustOfWindLine";
    }
  >;
  readonly fills: readonly BattleFill[];
  readonly metamagicApplications:
    | readonly CharacterBattleMetamagicOptionFact[]
    | undefined;
  readonly targetId: CombatantId | undefined;
}): SaveMetamagicSelectionState {
  const metamagicSelectionFills = saveMetamagicSelectionFills(
    input.fills,
    input.invocation,
  );
  if (metamagicSelectionFills.tag === "invalid") {
    return metamagicSelectionFills;
  }
  const includesCareful = metamagicApplicationsIncludeCareful(
    input.metamagicApplications,
  );
  const includesHeightened = metamagicApplicationsIncludeHeightened(
    input.metamagicApplications,
  );
  if (!includesCareful && !includesHeightened) {
    if (
      metamagicSelectionFills.carefulSpellProtectedTargetIds !== undefined ||
      metamagicSelectionFills.heightenedSpellTargetId !== undefined
    ) {
      return {
        tag: "invalid",
        message:
          "Save-affecting Metamagic selections require matching selected Metamagic options.",
      };
    }
    return {
      tag: "ok",
      carefulSpellProtectedTargetIds: [],
      heightenedSpellTargetId: undefined,
    };
  }
  const targeting = spellSavingThrowTargeting(input.invocation);
  if (
    targeting.kind === "singleCombatant" &&
    metamagicSelectionFills.carefulSpellProtectedTargetIds !== undefined
  ) {
    return {
      tag: "invalid",
      message:
        "Single-target Careful Spell does not use a protected-target selection hole.",
    };
  }
  if (
    targeting.kind === "singleCombatant" &&
    metamagicSelectionFills.heightenedSpellTargetId !== undefined
  ) {
    return {
      tag: "invalid",
      message:
        "Single-target Heightened Spell does not use a target-selection hole.",
    };
  }
  const holes: BattleHole[] = [];
  const carefulSpellProtectedTargetIds =
    includesCareful && targeting.kind === "singleCombatant"
      ? input.targetId === undefined
        ? []
        : [input.targetId]
      : (metamagicSelectionFills.carefulSpellProtectedTargetIds ?? []);
  if (
    !includesCareful &&
    metamagicSelectionFills.carefulSpellProtectedTargetIds !== undefined
  ) {
    return {
      tag: "invalid",
      message: "Careful Spell protected targets require Careful Spell.",
    };
  }
  if (
    includesCareful &&
    targeting.kind !== "singleCombatant" &&
    metamagicSelectionFills.carefulSpellProtectedTargetIds === undefined
  ) {
    holes.push(
      carefulSpellProtectedTargetsHole(
        input.state,
        input.actorId,
        input.invocation,
      ),
    );
  }
  const heightenedSpellTargetId =
    includesHeightened && targeting.kind === "singleCombatant"
      ? input.targetId
      : metamagicSelectionFills.heightenedSpellTargetId;
  if (
    !includesHeightened &&
    metamagicSelectionFills.heightenedSpellTargetId !== undefined
  ) {
    return {
      tag: "invalid",
      message: "Heightened Spell target requires Heightened Spell.",
    };
  }
  if (
    includesHeightened &&
    targeting.kind !== "singleCombatant" &&
    metamagicSelectionFills.heightenedSpellTargetId === undefined
  ) {
    holes.push(
      heightenedSpellTargetChoiceHole(
        input.state,
        input.actorId,
        input.invocation,
      ),
    );
  }
  return holes.length > 0
    ? { tag: "needsHoles", holes }
    : {
        tag: "ok",
        carefulSpellProtectedTargetIds,
        heightenedSpellTargetId,
      };
}

function saveMetamagicSelectionFills(
  fills: readonly BattleFill[],
  invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "saveGatedDamage"
        | "saveGatedCondition"
        | "saveGatedConditionImmunity"
        | "saveGatedAttackRollAdvantage"
        | "hideousLaughter"
        | "command"
        | "greaseGroundHazard"
        | "gustOfWindLine";
    }
  >,
):
  | {
      readonly tag: "ok";
      readonly carefulSpellProtectedTargetIds:
        | readonly CombatantId[]
        | undefined;
      readonly heightenedSpellTargetId: CombatantId | undefined;
    }
  | {
      readonly tag: "invalid";
      readonly message: string;
    } {
  let carefulSpellProtectedTargetIds: readonly CombatantId[] | undefined;
  let heightenedSpellTargetId: CombatantId | undefined;
  for (const fill of fills) {
    if (fill.holeId === carefulSpellProtectedTargetsHoleId(invocation)) {
      if (fill.kind !== "spellTargetList") {
        return {
          tag: "invalid",
          message:
            "Careful Spell protected targets must use the Careful Spell target-list hole.",
        };
      }
      if (carefulSpellProtectedTargetIds !== undefined) {
        return {
          tag: "invalid",
          message: "Careful Spell protected targets were filled twice.",
        };
      }
      carefulSpellProtectedTargetIds = fill.value.targetIds;
      continue;
    }
    if (fill.holeId === heightenedSpellTargetChoiceHoleId(invocation)) {
      if (fill.kind !== "targetChoice") {
        return {
          tag: "invalid",
          message:
            "Heightened Spell target must use the Heightened Spell target hole.",
        };
      }
      if (heightenedSpellTargetId !== undefined) {
        return {
          tag: "invalid",
          message: "Heightened Spell target was filled twice.",
        };
      }
      heightenedSpellTargetId = fill.value;
    }
  }
  return {
    tag: "ok",
    carefulSpellProtectedTargetIds,
    heightenedSpellTargetId,
  };
}

export function resolveGreaseGroundHazardSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "greaseGroundHazard" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly metamagicApplications?: readonly CharacterBattleMetamagicOptionFact[];
}): BattleResolutionResult {
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.targetList !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Grease uses one ground-area Saving Throw fill.",
    );
  }
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Grease does not use attack, damage, or Concentration fills.",
    );
  }
  const metamagicSelections = saveMetamagicSelectionState({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    fills: input.input.fills,
    metamagicApplications: input.metamagicApplications,
    targetId: undefined,
  });
  if (metamagicSelections.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      metamagicSelections.message,
    );
  }
  if (metamagicSelections.tag === "needsHoles") {
    return needsHolesResult(
      input.input.state,
      input.input.subject,
      metamagicSelections.holes,
    );
  }
  const savingThrowHole = spellSavingThrowOutcomeHole(
    input.input.state,
    input.actorId,
    input.invocation,
    metamagicSelections.heightenedSpellTargetId,
  );
  if (input.fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      savingThrowHole,
    ]);
  }
  const savingThrowOutcomes = input.fillSet.savingThrowOutcomes;
  const savingThrowValidation = validateSavingThrowOutcomes(
    savingThrowOutcomes,
    savingThrowHole,
    input.input.state,
    input.actorId,
    undefined,
    undefined,
    metamagicSelections.carefulSpellProtectedTargetIds,
    metamagicSelections.heightenedSpellTargetId,
  );
  if (savingThrowValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }
  if (!("area" in savingThrowOutcomes)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Grease requires ground-area facts.",
    );
  }
  const area = savingThrowOutcomes.area;
  if (area.kind !== "greaseGroundArea") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Grease requires a ground-area id.",
    );
  }

  const failedTargets = savingThrowOutcomes.outcomes.flatMap((outcome) =>
    outcome.succeeded ? [] : [outcome.targetId],
  );
  if (failedTargets.length > 0) {
    const saveFailedReactionWindow = maybeOpenReactionWindow(
      input.input.state,
      {
        trigger: "saveFailed",
        targetId: failedTargets[0]!,
        sourceSpellId: input.invocation.spell.id,
        continuation: {
          kind: "replay",
          subject:
            input.input.reactionContinuationSubject ?? input.input.subject,
          fills: input.input.fills,
        },
      },
      input.input.suppressedReactionTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }

  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    ...(input.metamagicApplications === undefined
      ? {}
      : { metamagicApplications: input.metamagicApplications }),
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const nextState = applyGreaseGroundHazardCastEffects({
    state: resourced.state,
    actorId: input.actorId,
    area,
    failedTargetIds: failedTargets,
    invocation: input.invocation,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveSleepTargetAdmissionSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "sleepTargetAdmission" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  const savingThrowHole = spellSavingThrowOutcomeHole(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.targetList !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Sleep target admission uses one point-origin Sphere Saving Throw fill.",
    );
  }
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Sleep target admission does not use attack or damage fills.",
    );
  }
  if (input.fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      savingThrowHole,
    ]);
  }
  const savingThrowValidation = validateSavingThrowOutcomes(
    input.fillSet.savingThrowOutcomes,
    savingThrowHole,
    input.input.state,
    input.actorId,
    undefined,
  );
  if (savingThrowValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }
  const selectedTargetIds =
    "area" in input.fillSet.savingThrowOutcomes
      ? input.fillSet.savingThrowOutcomes.area.affectedTargetIds
      : [];
  const failedTargets = input.fillSet.savingThrowOutcomes.outcomes.flatMap(
    (outcome) => (outcome.succeeded ? [] : [outcome.targetId]),
  );
  if (failedTargets.length > 0) {
    const saveFailedReactionWindow = maybeOpenReactionWindow(
      input.input.state,
      {
        trigger: "saveFailed",
        targetId: failedTargets[0]!,
        sourceSpellId: input.invocation.spell.id,
        continuation: {
          kind: "replay",
          subject:
            input.input.reactionContinuationSubject ?? input.input.subject,
          fills: input.input.fills,
        },
      },
      input.input.suppressedReactionTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }
  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const effected = applySleepPendingRepeatSaveEffects(
    resourced.state,
    input.actorId,
    failedTargets,
    input.invocation,
  );
  const nextState = extendSavingThrowOngoingFeatures(effected, input.actorId, [
    ...selectedTargetIds,
  ]);
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveHideousLaughterSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "hideousLaughter" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly metamagicApplications?: readonly CharacterBattleMetamagicOptionFact[];
}): BattleResolutionResult {
  const targetHole = spellTargetListHole(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  if (input.fillSet.targetList === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      targetHole,
    ]);
  }
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Hideous Laughter uses target-list and Saving Throw outcome fills.",
    );
  }
  const targetValidation = validateSpellTargetList(
    input.input.state,
    input.actorId,
    input.invocation,
    input.fillSet.targetList.targetIds,
    input.fillSet.targetList.spatialFacts,
  );
  if (targetValidation !== null) {
    return invalidResult(input.input.state, "invalidFill", targetValidation);
  }
  const metamagicSelections = saveMetamagicSelectionState({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    fills: input.input.fills,
    metamagicApplications: input.metamagicApplications,
    targetId: undefined,
  });
  if (metamagicSelections.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      metamagicSelections.message,
    );
  }
  if (metamagicSelections.tag === "needsHoles") {
    return needsHolesResult(
      input.input.state,
      input.input.subject,
      metamagicSelections.holes,
    );
  }
  const savingThrowHole = spellSavingThrowOutcomeHole(
    input.input.state,
    input.actorId,
    input.invocation,
    metamagicSelections.heightenedSpellTargetId,
  );
  if (input.fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      savingThrowHole,
    ]);
  }
  const savingThrowValidation = validateSavingThrowOutcomes(
    input.fillSet.savingThrowOutcomes,
    savingThrowHole,
    input.input.state,
    input.actorId,
    undefined,
    input.fillSet.targetList.targetIds,
    metamagicSelections.carefulSpellProtectedTargetIds,
    metamagicSelections.heightenedSpellTargetId,
  );
  if (savingThrowValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }
  const failedTargets = input.fillSet.savingThrowOutcomes.outcomes.flatMap(
    (outcome) => (outcome.succeeded ? [] : [outcome.targetId]),
  );
  if (failedTargets.length > 0) {
    const saveFailedReactionWindow = maybeOpenReactionWindow(
      input.input.state,
      {
        trigger: "saveFailed",
        targetId: failedTargets[0]!,
        sourceSpellId: input.invocation.spell.id,
        continuation: {
          kind: "replay",
          subject:
            input.input.reactionContinuationSubject ?? input.input.subject,
          fills: input.input.fills,
        },
      },
      input.input.suppressedReactionTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }
  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    startConcentration: failedTargets.length > 0,
    ...(input.metamagicApplications === undefined
      ? {}
      : { metamagicApplications: input.metamagicApplications }),
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const effected = applyHideousLaughterEffects(
    resourced.state,
    input.actorId,
    failedTargets,
    input.invocation,
  );
  const nextState = extendSavingThrowOngoingFeatures(
    effected,
    input.actorId,
    input.fillSet.targetList.targetIds,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}
export function resolveSaveGateDamageSpellRelease(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedDamage" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  const beforeSpend = resolveSaveGateDamageSpellAct(input);
  if (beforeSpend.tag !== "resolved") {
    return beforeSpend;
  }
  return {
    tag: "resolved",
    state: {
      ...beforeSpend.state,
      currentTurnResources: input.input.state.currentTurnResources,
    },
    snapshot: snapshotBattle({
      ...beforeSpend.state,
      currentTurnResources: input.input.state.currentTurnResources,
    }),
  };
}

export function resolveSaveGateDamageSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedDamage" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly metamagicApplications?: readonly CharacterBattleMetamagicOptionFact[];
}): BattleResolutionResult {
  if (
    input.invocation.targeting.kind !== "singleCombatant" &&
    input.invocation.targeting.kind !== "targetList" &&
    input.fillSet.targetId !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Save-gate damage spells use saving throw outcome fills, not a single-target fill.",
    );
  }
  if (input.invocation.targeting.kind === "singleCombatant") {
    if (input.fillSet.targetId === undefined) {
      return needsHolesResult(input.input.state, input.input.subject, [
        spellTargetHole(input.input.state, input.actorId, input.invocation),
      ]);
    }
    const target = input.input.state.combatants.get(input.fillSet.targetId);
    if (
      target === undefined ||
      !spellTargetIsLegal(
        input.input.state,
        input.actorId,
        target.combatantId,
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
    const sanctuaryCheck = sanctuaryTargetingInterdictionCheck({
      state: input.input.state,
      triggeringCombatantId: input.actorId,
      wardedCombatantId: target.combatantId,
      triggeringTargetEventId: ATTACK_TARGET_HOLE_ID,
      fills: input.input.fills,
    });
    if (sanctuaryCheck.tag === "needsHoles") {
      return needsHolesResult(input.input.state, input.input.subject, [
        sanctuaryCheck.hole,
      ]);
    }
    if (sanctuaryCheck.tag === "invalid") {
      return invalidResult(
        input.input.state,
        "invalidFill",
        sanctuaryCheck.message,
      );
    }
    if (sanctuaryCheck.tag === "lost") {
      return spendSpellCastResources({
        state: input.input.state,
        actorId: input.actorId,
        invocation: input.invocation,
        errorState: input.input.state,
        startConcentration: false,
        ...(input.metamagicApplications === undefined
          ? {}
          : { metamagicApplications: input.metamagicApplications }),
      });
    }
    if (sanctuaryCheck.tag === "newTarget") {
      const replacementTarget = input.input.state.combatants.get(
        sanctuaryCheck.targetId,
      );
      if (
        replacementTarget === undefined ||
        !spellTargetIsLegal(
          input.input.state,
          input.actorId,
          replacementTarget.combatantId,
          input.invocation,
          sanctuaryCheck.spatialFacts,
        )
      ) {
        return invalidResult(
          input.input.state,
          "invalidFill",
          "Sanctuary replacement spell target must be legal for the selected spell.",
        );
      }
      const originalTargetFill = input.input.fills.find(
        (
          fill,
        ): fill is Extract<BattleFill, { readonly kind: "targetChoice" }> =>
          fill.kind === "targetChoice" && fill.value === target.combatantId,
      );
      if (originalTargetFill === undefined) {
        return invalidResult(
          input.input.state,
          "invalidFill",
          "Sanctuary replacement requires the original spell target fill.",
        );
      }
      const rewrittenFills = input.input.fills
        .filter((fill) => fill.kind !== "sanctuaryInterdictionOutcome")
        .map((fill) =>
          fill === originalTargetFill
            ? {
                ...fill,
                value: replacementTarget.combatantId,
                spatialFacts: sanctuaryCheck.spatialFacts,
              }
            : fill,
        );
      const rewrittenFillSet = spellFillSet(rewrittenFills, input.invocation);
      if (rewrittenFillSet.tag !== "ok") {
        return invalidResult(
          input.input.state,
          "invalidFill",
          rewrittenFillSet.message,
        );
      }
      return resolveSaveGateDamageSpellAct({
        ...input,
        input: { ...input.input, fills: rewrittenFills },
        fillSet: rewrittenFillSet,
      });
    }
  }
  const metamagicSelections = saveMetamagicSelectionState({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    fills: input.input.fills,
    metamagicApplications: input.metamagicApplications,
    targetId: input.fillSet.targetId,
  });
  if (metamagicSelections.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      metamagicSelections.message,
    );
  }
  if (metamagicSelections.tag === "needsHoles") {
    return needsHolesResult(
      input.input.state,
      input.input.subject,
      metamagicSelections.holes,
    );
  }
  const savingThrowHole = spellSavingThrowOutcomeHole(
    input.input.state,
    input.actorId,
    input.invocation,
    metamagicSelections.heightenedSpellTargetId,
  );
  if (input.fillSet.attackRoll !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Save-gate damage spells do not use an attack roll.",
    );
  }
  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: saveGatedDamageSpellCastTargetIds(input.fillSet),
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
  if (input.fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      savingThrowHole,
    ]);
  }
  const savingThrowOutcomes = input.fillSet.savingThrowOutcomes;

  const savingThrowValidation = validateSavingThrowOutcomes(
    savingThrowOutcomes,
    savingThrowHole,
    input.input.state,
    input.actorId,
    input.fillSet.targetId,
    input.fillSet.targetList?.targetIds,
    metamagicSelections.carefulSpellProtectedTargetIds,
    metamagicSelections.heightenedSpellTargetId,
  );
  if (savingThrowValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }
  const savingThrowArea =
    "area" in savingThrowOutcomes ? savingThrowOutcomes.area : undefined;
  const failedTargets = savingThrowOutcomes.outcomes.flatMap((outcome) =>
    outcome.succeeded ? [] : [outcome.targetId],
  );
  const saveGatedDamageSpellRequiresConcentration = spellRequiresConcentration(
    input.invocation,
  );
  const startFailedSaveConcentration =
    saveGatedDamageSpellRequiresConcentration && failedTargets.length > 0;
  const failedSaveConcentrationDuration = startFailedSaveConcentration
    ? failedSaveConcentrationDurationEffect({
        actorId: input.actorId,
        invocation: input.invocation,
      })
    : null;
  if (
    startFailedSaveConcentration &&
    failedSaveConcentrationDuration === null
  ) {
    return invalidResult(
      input.input.state,
      "unsupportedSubject",
      "Save-gated damage Concentration spells require a supported maximum duration.",
    );
  }
  const stateAfterCastConcentrationBreak =
    saveGatedDamageSpellRequiresConcentration
      ? breakBattleConcentration(input.input.state, input.actorId)
      : input.input.state;
  const objectIgnitions = postSaveAreaObjectIgnitions({
    actorId: input.actorId,
    area: savingThrowArea,
    invocation: input.invocation,
  });
  const postSaveAreaEffectValidation = validatePostSaveAreaEffect({
    area: savingThrowArea,
    failedTargetIds: failedTargets,
    invocation: input.invocation,
  });
  if (postSaveAreaEffectValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      postSaveAreaEffectValidation,
    );
  }

  const selectedTargetIds = savingThrowOutcomes.outcomes.map(
    (outcome) => outcome.targetId,
  );
  const saveDamageResultByTargetId = new Map(
    savingThrowOutcomes.outcomes.map((outcome) => [
      outcome.targetId,
      saveGateDamageResultForOutcome(
        stateAfterCastConcentrationBreak,
        outcome.targetId,
        input.invocation,
        outcome.succeeded,
        metamagicSelections.carefulSpellProtectedTargetIds,
      ),
    ]),
  );
  const saveDamageResultForTarget = (targetId: CombatantId): SaveDamageResult =>
    saveDamageResultByTargetId.get(targetId) ?? "none";
  const damageTargets = savingThrowOutcomes.outcomes.flatMap((outcome) =>
    saveDamageResultForTarget(outcome.targetId) === "none"
      ? []
      : [outcome.targetId],
  );
  const objectDamageFacts = postSaveAreaObjectDamageFacts({
    area: savingThrowArea,
    invocation: input.invocation,
  });
  if (failedTargets.length > 0) {
    const saveFailedReactionWindow = maybeOpenReactionWindow(
      input.input.state,
      {
        trigger: "saveFailed",
        targetId: failedTargets[0]!,
        sourceSpellId: input.invocation.spell.id,
        continuation: {
          kind: "replay",
          subject:
            input.input.reactionContinuationSubject ?? input.input.subject,
          fills: input.input.fills,
        },
      },
      input.input.suppressedReactionTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }
  if (damageTargets.length === 0 && objectDamageFacts.length === 0) {
    if (
      input.fillSet.damageRoll !== undefined ||
      input.fillSet.damageDispositions.length > 0
    ) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Save-gate spell damage can only be filled when at least one target takes damage.",
      );
    }
    const effected = applyFailedSaveSpellActiveEffects(
      stateAfterCastConcentrationBreak,
      input.actorId,
      failedTargets,
      input.invocation,
    );
    const spentResources = withFailedSaveConcentrationDuration(
      spendSpellCastResources({
        state: extendSavingThrowOngoingFeatures(
          effected,
          input.actorId,
          selectedTargetIds,
        ),
        actorId: input.actorId,
        invocation: input.invocation,
        errorState: input.input.state,
        startConcentration: startFailedSaveConcentration,
        ...(input.metamagicApplications === undefined
          ? {}
          : { metamagicApplications: input.metamagicApplications }),
      }),
      input.actorId,
      failedSaveConcentrationDuration,
    );
    return withObjectIgnitions(spentResources, objectIgnitions);
  }

  if (input.fillSet.damageRoll == null) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellDamageHole(input.invocation),
    ]);
  }
  const damageRoll = input.fillSet.damageRoll;
  const damageValidation = validateSpellDamageFill(
    damageRoll,
    input.invocation,
    false,
  );
  if (damageValidation !== null) {
    return invalidResult(input.input.state, "invalidFill", damageValidation);
  }
  const objectDamages = postSaveAreaObjectDamages({
    facts: objectDamageFacts,
    invocation: input.invocation,
    damageRoll,
  });

  const concentrationSaves = damageTargets.flatMap((targetId) => {
    const target = stateAfterCastConcentrationBreak.combatants.get(targetId);
    if (target === undefined) {
      return [];
    }
    const damageAmount = spellDamageAmountForTarget(
      target,
      input.invocation,
      damageRoll,
      saveDamageResultForTarget(targetId),
    );
    return damageLifecycleConcentrationSavingThrowHoles({
      state: stateAfterCastConcentrationBreak,
      target,
      damageAmount,
    });
  });
  const missingConcentrationSaves = concentrationSaves.filter(
    (concentrationSave) =>
      concentrationSavingThrowFillFor(
        input.fillSet.concentrationSavingThrows,
        concentrationSave,
      ) === undefined,
  );
  if (missingConcentrationSaves.length > 0) {
    return needsHolesResult(
      input.input.state,
      input.input.subject,
      missingConcentrationSaves,
    );
  }
  const concentrationSaveIds = new Set<BattleHoleId>(
    concentrationSaves.map((concentrationSave) => concentrationSave.holeId),
  );
  if (
    input.fillSet.concentrationSavingThrows.some(
      (fill) => !concentrationSaveIds.has(fill.holeId),
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Concentration Saving Throw fill is only valid for a concentrating damaged target.",
    );
  }
  const concentrationSaveByTargetId = new Map(
    concentrationSaves.map((concentrationSave) => [
      concentrationSave.combatantId,
      concentrationSavingThrowFillFor(
        input.fillSet.concentrationSavingThrows,
        concentrationSave,
      ),
    ]),
  );
  const damageDispositionHoles = damageTargets.flatMap((targetId) => {
    const target = stateAfterCastConcentrationBreak.combatants.get(targetId);
    if (target === undefined) {
      return [];
    }
    const damageAmount = spellDamageAmountForTarget(
      target,
      input.invocation,
      damageRoll,
      saveDamageResultForTarget(targetId),
    );
    const hole = zeroHitPointReplacementDispositionHole({
      damageSourceId: input.actorId,
      target,
      damageAmount,
    });
    return hole === null ? [] : [hole];
  });
  const damageDispositionValidation = damageDispositionFillsValidation({
    holes: damageDispositionHoles,
    fills: input.fillSet.damageDispositions,
  });
  if (damageDispositionValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      damageDispositionValidation,
    );
  }
  const missingDamageDispositionHoles = damageDispositionHoles.filter(
    (hole) =>
      damageDispositionFillFor(input.fillSet.damageDispositions, hole) ===
      undefined,
  );
  if (missingDamageDispositionHoles.length > 0) {
    return needsHolesResult(input.input.state, input.input.subject, [
      ...missingDamageDispositionHoles,
    ]);
  }
  const hideousLaughterSaveChecks = damageTargets.map((targetId) => {
    const target = stateAfterCastConcentrationBreak.combatants.get(targetId);
    if (target === undefined) {
      return { tag: "ok" as const, holes: [] };
    }
    const damageAmount = spellDamageAmountForTarget(
      target,
      input.invocation,
      damageRoll,
      saveDamageResultForTarget(targetId),
    );
    const holes = damageLifecycleHideousLaughterDamageRepeatSaveHoles({
      state: stateAfterCastConcentrationBreak,
      target,
      damageAmount,
    });
    return damageLifecycleHideousLaughterDamageRepeatSaveFillCheck({
      state: stateAfterCastConcentrationBreak,
      target,
      damageAmount,
      fills: fillsMatchingHoleIds(
        input.fillSet.hideousLaughterDamageRepeatSaves,
        holes,
      ),
    });
  });
  const invalidHideousLaughterSaveCheck = hideousLaughterSaveChecks.find(
    (check) => check.tag === "invalid",
  );
  if (invalidHideousLaughterSaveCheck?.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      invalidHideousLaughterSaveCheck.message,
    );
  }
  const missingHideousLaughterSaveHoles = hideousLaughterSaveChecks.flatMap(
    (check) => (check.tag === "needsHoles" ? [...check.holes] : []),
  );
  if (missingHideousLaughterSaveHoles.length > 0) {
    return needsHolesResult(input.input.state, input.input.subject, [
      ...missingHideousLaughterSaveHoles,
    ]);
  }
  const hideousLaughterSaveHoleIds = new Set<BattleHoleId>(
    hideousLaughterSaveChecks.flatMap((check) =>
      check.tag === "invalid" ? [] : check.holes.map((hole) => hole.holeId),
    ),
  );
  if (
    input.fillSet.hideousLaughterDamageRepeatSaves.some(
      (fill) => !hideousLaughterSaveHoleIds.has(fill.holeId),
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Hideous Laughter damage repeat save fill must match a requested damaged target.",
    );
  }
  const damaged = damageTargets.reduce((state, targetId) => {
    const target = state.combatants.get(targetId);
    if (target === undefined) {
      return state;
    }
    const damageAmount = spellDamageAmountForTarget(
      target,
      input.invocation,
      damageRoll,
      saveDamageResultForTarget(targetId),
    );
    const concentrationLifecycleHoles =
      damageLifecycleConcentrationSavingThrowHoles({
        state,
        target,
        damageAmount,
      });
    const concentrationLifecycleFills = fillsMatchingHoleIds(
      input.fillSet.concentrationSavingThrows,
      concentrationLifecycleHoles,
    );
    const hideousLaughterLifecycleHoles =
      damageLifecycleHideousLaughterDamageRepeatSaveHoles({
        state,
        target,
        damageAmount,
      });
    const hideousLaughterLifecycleFills = fillsMatchingHoleIds(
      input.fillSet.hideousLaughterDamageRepeatSaves,
      hideousLaughterLifecycleHoles,
    );
    return applySpellDamage(
      state,
      targetId,
      input.invocation,
      damageRoll,
      false,
      {
        concentrationSavingThrow: concentrationSaveByTargetId.get(targetId),
        wardingBondDamageShareConcentrationSavingThrows:
          concentrationLifecycleFills,
        hideousLaughterDamageRepeatSaves: hideousLaughterLifecycleFills,
        saveDamageResult: saveDamageResultForTarget(targetId),
        damageDisposition: damageDispositionForTarget(
          damageDispositionHoles,
          input.fillSet.damageDispositions,
          targetId,
        ),
        damageSourceId: input.actorId,
      },
    );
  }, stateAfterCastConcentrationBreak);
  const effected = applyFailedSaveSpellActiveEffects(
    damaged,
    input.actorId,
    failedTargets,
    input.invocation,
  );
  const extended = extendSavingThrowOngoingFeatures(
    effected,
    input.actorId,
    selectedTargetIds,
  );
  const spentResources = withFailedSaveConcentrationDuration(
    spendSpellCastResources({
      state: extended,
      actorId: input.actorId,
      invocation: input.invocation,
      errorState: input.input.state,
      startConcentration: startFailedSaveConcentration,
      ...(input.metamagicApplications === undefined
        ? {}
        : { metamagicApplications: input.metamagicApplications }),
    }),
    input.actorId,
    failedSaveConcentrationDuration,
  );
  if (spentResources.tag !== "resolved") {
    return spentResources;
  }
  const nextState = spentResources.state;
  const afterDamageEvents = damageTargets.map((targetId) => ({
    damageSourceId: input.actorId,
    damagedId: targetId,
    damageAmount: toDamageAmount(
      spellDamageAmountForTarget(
        stateAfterCastConcentrationBreak.combatants.get(targetId)!,
        input.invocation,
        damageRoll,
        saveDamageResultForTarget(targetId),
      ),
    ),
    reactionSpellTargetFacts: reactionSpellTargetFactsForAfterDamage({
      facts: input.fillSet.targetSpatialFacts,
      damagedId: targetId,
      damageSourceId: input.actorId,
    }),
  }));
  const forcedMovement = resolveFailedSaveForcedReactionMovement({
    state: nextState,
    subject: input.input.subject,
    failedTargets,
    invocation: input.invocation,
    movementFill: input.fillSet.movement,
    afterDamageEvents,
    objectDamages,
    objectIgnitions,
    suppressedReactionTrigger: input.input.suppressedReactionTrigger,
  });
  if (forcedMovement !== null) {
    return forcedMovement;
  }

  return openAfterDamageSequenceReactionWindow({
    state: nextState,
    subject: input.input.subject,
    events: afterDamageEvents,
    objectDamages,
    objectIgnitions,
    droppedObjects: [],
    suppressedReactionTrigger: input.input.suppressedReactionTrigger,
  });
}

function withObjectIgnitions(
  result: BattleResolutionResult,
  objectIgnitions: readonly BattleObjectIgnitionOutcome[],
): BattleResolutionResult {
  if (result.tag !== "resolved" || objectIgnitions.length === 0) {
    return result;
  }
  return {
    ...result,
    objectIgnitions: [...(result.objectIgnitions ?? []), ...objectIgnitions],
  };
}

type SpellConcentrationDurationEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "spellConcentrationDuration" }
>;

function failedSaveConcentrationDurationEffect(input: {
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedDamage" }
  >;
}): SpellConcentrationDurationEffect | null {
  if (input.invocation.spell.mechanics.duration.kind !== "concentration") {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    input.invocation.spell.mechanics.duration.upTo,
  );
  if (Either.isLeft(durationTicks)) {
    return null;
  }
  return {
    kind: "spellConcentrationDuration",
    sourceSpellId: input.invocation.spell.id,
    sourceCombatantId: input.actorId,
    expiresAt: {
      kind: "concentration",
      combatantId: input.actorId,
      durationTicks: durationTicks.right,
    },
  };
}

function withFailedSaveConcentrationDuration(
  result: BattleResolutionResult,
  actorId: CombatantId,
  effect: SpellConcentrationDurationEffect | null,
): BattleResolutionResult {
  if (result.tag !== "resolved" || effect === null) {
    return result;
  }
  const actor = result.state.combatants.get(actorId);
  if (actor === undefined) {
    return result;
  }
  const state = {
    ...result.state,
    combatants: new Map(result.state.combatants).set(actorId, {
      ...actor,
      activeEffects: [
        ...actor.activeEffects.filter(
          (candidate) =>
            candidate.kind !== "spellConcentrationDuration" ||
            candidate.sourceSpellId !== effect.sourceSpellId ||
            candidate.sourceCombatantId !== effect.sourceCombatantId,
        ),
        effect,
      ],
    }),
  };
  return { ...result, state, snapshot: snapshotBattle(state) };
}

function resolveFailedSaveForcedReactionMovement(input: {
  readonly state: BattleState;
  readonly subject: ActionSpellBattleResolutionInput["subject"];
  readonly failedTargets: readonly CombatantId[];
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedDamage" }
  >;
  readonly movementFill:
    | Extract<
        ActionSpellBattleResolutionInput["fills"][number],
        { readonly kind: "movement" }
      >
    | undefined;
  readonly afterDamageEvents: readonly BattleAfterDamageEvent[];
  readonly objectDamages: readonly BattleObjectDamageOutcome[];
  readonly objectIgnitions: readonly BattleObjectIgnitionOutcome[];
  readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
}): BattleResolutionResult | null {
  const forcedMovementRider = input.invocation.failedSavePostDamageRiders.find(
    (rider) => rider.kind === "forcedReactionMovement",
  );
  if (forcedMovementRider === undefined) {
    return input.movementFill === undefined
      ? null
      : invalidResult(
          input.state,
          "invalidFill",
          "Forced movement fill does not match this spell.",
        );
  }
  const [targetId] = input.failedTargets;
  if (targetId === undefined) {
    return input.movementFill === undefined
      ? null
      : invalidResult(
          input.state,
          "invalidFill",
          "Dissonant Whispers movement is only valid after a failed save.",
        );
  }
  if (input.failedTargets.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Dissonant Whispers forced movement requires exactly one failed target.",
    );
  }
  const target = input.state.combatants.get(targetId);
  if (!combatantCanTakeReactions(target)) {
    return input.movementFill === undefined
      ? null
      : invalidResult(
          input.state,
          "invalidFill",
          "Dissonant Whispers movement is unavailable when the failed target has no Reaction.",
        );
  }
  const movementHole = readiedMovementHole(input.state, targetId);
  const targetCanMove = movementHole.speedKinds.some(
    (speedKind) => Number(speedKind.movementBudgetFeet) > 0,
  );
  if (!targetCanMove) {
    if (input.movementFill !== undefined) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Dissonant Whispers movement is unavailable when the failed target cannot move.",
      );
    }
    return openAfterDamageSequenceReactionWindow({
      state: spendReaction(input.state, targetId),
      subject: input.subject,
      events: input.afterDamageEvents,
      objectDamages: input.objectDamages,
      objectIgnitions: input.objectIgnitions,
      droppedObjects: [],
      suppressedReactionTrigger: input.suppressedReactionTrigger,
    });
  }
  if (input.movementFill === undefined) {
    return needsHolesResult(input.state, input.subject, [movementHole]);
  }
  const parsedMovement = parseBattleMovement(
    input.state,
    targetId,
    input.movementFill,
    {
      movementBudgetFeet: readiedMovementBudgetForActor(
        input.state,
        targetId,
        input.movementFill.value.speedKind,
      ),
      spendsTurnMovement: false,
    },
  );
  if (parsedMovement.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", parsedMovement.message);
  }
  const stateAfterReactionSpend = spendReaction(input.state, targetId);
  const threats = parsedMovement.movement.provokedOpportunityAttacks;
  if (threats.length > 0) {
    const reactionWindow = maybeOpenReactionWindow(
      stateAfterReactionSpend,
      {
        trigger: "opportunityAttack",
        moverId: targetId,
        threats,
        continuation: {
          kind: "movementThenAfterDamageSequence",
          subject: input.subject,
          movement: parsedMovement.movement,
          events: input.afterDamageEvents,
          objectDamages: input.objectDamages,
          objectIgnitions: input.objectIgnitions,
          droppedObjects: [],
        },
      },
      input.suppressedReactionTrigger,
    );
    if (reactionWindow !== null) {
      return reactionWindow;
    }
  }
  return openAfterDamageSequenceReactionWindow({
    state: applyBattleMovement(
      stateAfterReactionSpend,
      parsedMovement.movement,
    ),
    subject: input.subject,
    events: input.afterDamageEvents,
    objectDamages: input.objectDamages,
    objectIgnitions: input.objectIgnitions,
    droppedObjects: [],
    suppressedReactionTrigger: input.suppressedReactionTrigger,
  });
}

export function resolveSaveGateConditionSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedCondition" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly metamagicApplications?: readonly CharacterBattleMetamagicOptionFact[];
}): BattleResolutionResult {
  if (
    input.invocation.targeting.kind !== "singleCombatant" &&
    input.fillSet.targetId !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Save-gate condition spells use saving throw outcome fills, not a single-target fill.",
    );
  }
  if (input.invocation.targeting.kind === "singleCombatant") {
    if (input.fillSet.targetId === undefined) {
      return needsHolesResult(input.input.state, input.input.subject, [
        spellTargetHole(input.input.state, input.actorId, input.invocation),
      ]);
    }
    const target = input.input.state.combatants.get(input.fillSet.targetId);
    if (
      target === undefined ||
      !spellTargetIsLegal(
        input.input.state,
        input.actorId,
        target.combatantId,
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
  }
  if (input.invocation.targeting.kind === "targetList") {
    if (!isTargetListSpellInvocation(input.invocation)) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Save-gate condition spell target-list shape is unsupported.",
      );
    }
    if (input.fillSet.targetId !== undefined) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Multi-target save-gate condition spells require a target list.",
      );
    }
    if (input.fillSet.targetList === undefined) {
      return needsHolesResult(input.input.state, input.input.subject, [
        spellTargetListHole(input.input.state, input.actorId, input.invocation),
      ]);
    }
    const targetListValidation = validateSpellTargetList(
      input.input.state,
      input.actorId,
      input.invocation,
      input.fillSet.targetList.targetIds,
      input.fillSet.targetList.spatialFacts,
    );
    if (targetListValidation !== null) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        targetListValidation,
      );
    }
  }
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Save-gate condition spells do not use attack or damage fills.",
    );
  }
  const selectedEffect = selectFailedSaveConditionEffect(
    input.invocation.effect,
    input.fillSet.conditionChoice ?? null,
  );
  if (selectedEffect.tag === "needsConditionChoice") {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellConditionChoiceHole({
        ...input.invocation,
        effect: selectedEffect.effect,
      }),
    ]);
  }
  if (selectedEffect.tag === "invalidConditionChoice") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      selectedEffect.message,
    );
  }
  const metamagicSelections = saveMetamagicSelectionState({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    fills: input.input.fills,
    metamagicApplications: input.metamagicApplications,
    targetId: input.fillSet.targetId,
  });
  if (metamagicSelections.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      metamagicSelections.message,
    );
  }
  if (metamagicSelections.tag === "needsHoles") {
    return needsHolesResult(
      input.input.state,
      input.input.subject,
      metamagicSelections.holes,
    );
  }
  const savingThrowHole = spellSavingThrowOutcomeHole(
    input.input.state,
    input.actorId,
    input.invocation,
    metamagicSelections.heightenedSpellTargetId,
  );
  if (input.fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      savingThrowHole,
    ]);
  }
  const savingThrowOutcomes = input.fillSet.savingThrowOutcomes;
  const savingThrowValidation = validateSavingThrowOutcomes(
    savingThrowOutcomes,
    savingThrowHole,
    input.input.state,
    input.actorId,
    input.fillSet.targetId,
    input.fillSet.targetList?.targetIds,
    metamagicSelections.carefulSpellProtectedTargetIds,
    metamagicSelections.heightenedSpellTargetId,
  );
  if (savingThrowValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }

  const selectedTargetIds = savingThrowOutcomes.outcomes.map(
    (outcome) => outcome.targetId,
  );
  const failedTargets = savingThrowOutcomes.outcomes.flatMap((outcome) =>
    outcome.succeeded ? [] : [outcome.targetId],
  );
  if (failedTargets.length > 0) {
    const saveFailedReactionWindow = maybeOpenReactionWindow(
      input.input.state,
      {
        trigger: "saveFailed",
        targetId: failedTargets[0]!,
        sourceSpellId: input.invocation.spell.id,
        continuation: {
          kind: "replay",
          subject:
            input.input.reactionContinuationSubject ?? input.input.subject,
          fills: input.input.fills,
        },
      },
      input.input.suppressedReactionTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }

  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    ...(input.metamagicApplications === undefined
      ? {}
      : { metamagicApplications: input.metamagicApplications }),
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const effected = applyFailedSaveSpellConditionEffects(
    resourced.state,
    input.actorId,
    failedTargets,
    input.invocation,
    selectedEffect.effect,
  );
  const nextState = extendSavingThrowOngoingFeatures(
    effected,
    input.actorId,
    selectedTargetIds,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveSaveGateConditionImmunitySpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedConditionImmunity" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly metamagicApplications?: readonly CharacterBattleMetamagicOptionFact[];
}): BattleResolutionResult {
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.targetList !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Save-gate condition-immunity spells use area Saving Throw outcome fills.",
    );
  }
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Save-gate condition-immunity spells do not use attack or damage fills.",
    );
  }
  const metamagicSelections = saveMetamagicSelectionState({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    fills: input.input.fills,
    metamagicApplications: input.metamagicApplications,
    targetId: undefined,
  });
  if (metamagicSelections.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      metamagicSelections.message,
    );
  }
  if (metamagicSelections.tag === "needsHoles") {
    return needsHolesResult(
      input.input.state,
      input.input.subject,
      metamagicSelections.holes,
    );
  }
  const savingThrowHole = spellSavingThrowOutcomeHole(
    input.input.state,
    input.actorId,
    input.invocation,
    metamagicSelections.heightenedSpellTargetId,
  );
  if (input.fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      savingThrowHole,
    ]);
  }
  const savingThrowOutcomes = input.fillSet.savingThrowOutcomes;
  const savingThrowValidation = validateSavingThrowOutcomes(
    savingThrowOutcomes,
    savingThrowHole,
    input.input.state,
    input.actorId,
    undefined,
    undefined,
    metamagicSelections.carefulSpellProtectedTargetIds,
    metamagicSelections.heightenedSpellTargetId,
  );
  if (savingThrowValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }
  const targetTypeValidation = validateSaveGatedConditionImmunityTargets(
    input.input.state,
    savingThrowOutcomes.outcomes.map((outcome) => outcome.targetId),
    input.invocation,
  );
  if (targetTypeValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      targetTypeValidation,
    );
  }

  const selectedTargetIds = savingThrowOutcomes.outcomes.map(
    (outcome) => outcome.targetId,
  );
  const failedTargets = savingThrowOutcomes.outcomes.flatMap((outcome) =>
    outcome.succeeded ? [] : [outcome.targetId],
  );
  if (failedTargets.length > 0) {
    const saveFailedReactionWindow = maybeOpenReactionWindow(
      input.input.state,
      {
        trigger: "saveFailed",
        targetId: failedTargets[0]!,
        sourceSpellId: input.invocation.spell.id,
        continuation: {
          kind: "replay",
          subject:
            input.input.reactionContinuationSubject ?? input.input.subject,
          fills: input.input.fills,
        },
      },
      input.input.suppressedReactionTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }

  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    ...(input.metamagicApplications === undefined
      ? {}
      : { metamagicApplications: input.metamagicApplications }),
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const effected = applySaveGatedConditionImmunityEffects(
    resourced.state,
    input.actorId,
    failedTargets,
    input.invocation,
  );
  const nextState = extendSavingThrowOngoingFeatures(
    effected,
    input.actorId,
    selectedTargetIds,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function validateSaveGatedConditionImmunityTargets(
  state: BattleState,
  targetIds: readonly CombatantId[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedConditionImmunity" }
  >,
): string | null {
  return targetIds.every((targetId) => {
    const target = state.combatants.get(targetId);
    const targetCreatureType =
      target === undefined ? null : battleCreatureType(target);
    return (
      targetCreatureType !== null &&
      invocation.targetCreatureTypes.includes(targetCreatureType)
    );
  })
    ? null
    : "Calm Emotions condition-immunity branch affects only Humanoids.";
}

export function resolveCommandSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "command" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly metamagicApplications?: readonly CharacterBattleMetamagicOptionFact[];
}): BattleResolutionResult {
  const targetHole = spellTargetListHole(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  if (input.fillSet.targetId !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Command requires a target list.",
    );
  }
  if (input.fillSet.targetList === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      targetHole,
    ]);
  }
  const targetListValidation = validateSpellTargetList(
    input.input.state,
    input.actorId,
    input.invocation,
    input.fillSet.targetList.targetIds,
    input.fillSet.targetList.spatialFacts,
  );
  if (targetListValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      targetListValidation,
    );
  }
  if (input.fillSet.commandOptionChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      commandOptionChoiceHole(input.invocation),
    ]);
  }
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Command does not use attack, damage, or Concentration fills.",
    );
  }
  const metamagicSelections = saveMetamagicSelectionState({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    fills: input.input.fills,
    metamagicApplications: input.metamagicApplications,
    targetId: undefined,
  });
  if (metamagicSelections.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      metamagicSelections.message,
    );
  }
  if (metamagicSelections.tag === "needsHoles") {
    return needsHolesResult(
      input.input.state,
      input.input.subject,
      metamagicSelections.holes,
    );
  }
  const savingThrowHole = spellSavingThrowOutcomeHole(
    input.input.state,
    input.actorId,
    input.invocation,
    metamagicSelections.heightenedSpellTargetId,
  );
  if (input.fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      savingThrowHole,
    ]);
  }
  const savingThrowOutcomes = input.fillSet.savingThrowOutcomes;
  const savingThrowValidation = validateSavingThrowOutcomes(
    savingThrowOutcomes,
    savingThrowHole,
    input.input.state,
    input.actorId,
    undefined,
    input.fillSet.targetList.targetIds,
    metamagicSelections.carefulSpellProtectedTargetIds,
    metamagicSelections.heightenedSpellTargetId,
  );
  if (savingThrowValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }

  const selectedTargetIds = savingThrowOutcomes.outcomes.map(
    (outcome) => outcome.targetId,
  );
  const failedTargets = savingThrowOutcomes.outcomes.flatMap((outcome) =>
    outcome.succeeded ? [] : [outcome.targetId],
  );
  if (failedTargets.length > 0) {
    const saveFailedReactionWindow = maybeOpenReactionWindow(
      input.input.state,
      {
        trigger: "saveFailed",
        targetId: failedTargets[0]!,
        sourceSpellId: input.invocation.spell.id,
        continuation: {
          kind: "replay",
          subject:
            input.input.reactionContinuationSubject ?? input.input.subject,
          fills: input.input.fills,
        },
      },
      input.input.suppressedReactionTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }

  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    ...(input.metamagicApplications === undefined
      ? {}
      : { metamagicApplications: input.metamagicApplications }),
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const effected = applyCommandPendingEffects(
    resourced.state,
    input.actorId,
    failedTargets,
    input.invocation,
    input.fillSet.commandOptionChoice,
  );
  const nextState = extendSavingThrowOngoingFeatures(
    effected,
    input.actorId,
    selectedTargetIds,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveSaveGateAttackRollAdvantageSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedAttackRollAdvantage" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly metamagicApplications?: readonly CharacterBattleMetamagicOptionFact[];
}): BattleResolutionResult {
  if (input.fillSet.targetId !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Save-gate attack-roll advantage spells use saving throw outcome fills, not a single-target fill.",
    );
  }
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Save-gate attack-roll advantage spells do not use attack or damage fills.",
    );
  }
  const metamagicSelections = saveMetamagicSelectionState({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    fills: input.input.fills,
    metamagicApplications: input.metamagicApplications,
    targetId: undefined,
  });
  if (metamagicSelections.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      metamagicSelections.message,
    );
  }
  if (metamagicSelections.tag === "needsHoles") {
    return needsHolesResult(
      input.input.state,
      input.input.subject,
      metamagicSelections.holes,
    );
  }
  const savingThrowHole = spellSavingThrowOutcomeHole(
    input.input.state,
    input.actorId,
    input.invocation,
    metamagicSelections.heightenedSpellTargetId,
  );
  if (input.fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      savingThrowHole,
    ]);
  }
  const savingThrowOutcomes = input.fillSet.savingThrowOutcomes;
  const savingThrowValidation = validateSavingThrowOutcomes(
    savingThrowOutcomes,
    savingThrowHole,
    input.input.state,
    input.actorId,
    undefined,
    undefined,
    metamagicSelections.carefulSpellProtectedTargetIds,
    metamagicSelections.heightenedSpellTargetId,
  );
  if (savingThrowValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }

  const selectedTargetIds = savingThrowOutcomes.outcomes.map(
    (outcome) => outcome.targetId,
  );
  const failedTargets = savingThrowOutcomes.outcomes.flatMap((outcome) =>
    outcome.succeeded ? [] : [outcome.targetId],
  );
  if (failedTargets.length > 0) {
    const saveFailedReactionWindow = maybeOpenReactionWindow(
      input.input.state,
      {
        trigger: "saveFailed",
        targetId: failedTargets[0]!,
        sourceSpellId: input.invocation.spell.id,
        continuation: {
          kind: "replay",
          subject:
            input.input.reactionContinuationSubject ?? input.input.subject,
          fills: input.input.fills,
        },
      },
      input.input.suppressedReactionTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }

  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    ...(input.metamagicApplications === undefined
      ? {}
      : { metamagicApplications: input.metamagicApplications }),
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const effected = applyFailedSaveAttackRollAdvantageEffects(
    resourced.state,
    input.actorId,
    failedTargets,
    "area" in savingThrowOutcomes ? savingThrowOutcomes.area : undefined,
    input.invocation,
  );
  const nextState = extendSavingThrowOngoingFeatures(
    effected,
    input.actorId,
    selectedTargetIds,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function validateSavingThrowOutcomes(
  value: BattleSpellSavingThrowOutcomeValue,
  hole: BattleSpellSavingThrowOutcomeHole,
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId | undefined,
  targetListIds?: readonly CombatantId[],
  carefulSpellProtectedTargetIds: readonly CombatantId[] = [],
  heightenedSpellTargetId?: CombatantId,
): string | null {
  const outcomes = value.outcomes;
  if (hole.spell.procedure === "rollModifier") {
    if (outcomes.length === 0) {
      return "Save-gated roll modifier spell must include at least one target Saving Throw outcome.";
    }
    if ("area" in value) {
      return "Save-gated roll modifier spell outcomes must not include area facts.";
    }
    const seenTargets = new Set<CombatantId>();
    for (const outcome of outcomes) {
      if (!state.combatants.has(outcome.targetId)) {
        return "Save-gated roll modifier spell target must be a combatant in this battle.";
      }
      if (seenTargets.has(outcome.targetId)) {
        return "Save-gated roll modifier spell Saving Throw outcomes must not duplicate targets.";
      }
      seenTargets.add(outcome.targetId);
    }
    if (hole.spell.targeting.kind === "selfAndChosenLegalTargets") {
      return null;
    }
    return outcomes.length <= hole.spell.targeting.maxTargets
      ? null
      : "Save-gated roll modifier spell Saving Throw outcomes exceed the selected spell's target count.";
  }
  const targeting = spellSavingThrowTargeting(hole.spell);
  if (hole.spell.procedure === "sleepTargetAdmission") {
    return validateSleepTargetAdmissionSavingThrowOutcomes({
      value,
      area: "area" in value ? value.area : undefined,
      state,
    });
  }
  if (hole.spell.procedure === "greaseGroundHazard") {
    return validateGreaseGroundHazardSavingThrowOutcomes({
      value,
      area: "area" in value ? value.area : undefined,
      state,
    });
  }
  if (targeting.kind === "singleCombatant") {
    if (outcomes.length === 0) {
      return "Save-gate spell must include at least one affected target Saving Throw outcome.";
    }
    if ("area" in value) {
      return "Single-target save-gate spell outcomes must not include area facts.";
    }
    if (targetId === undefined) {
      return "Single-target save-gate spell requires one target before Saving Throw outcomes.";
    }
    if (outcomes.length !== 1 || outcomes[0]?.targetId !== targetId) {
      return "Single-target save-gate spell Saving Throw outcome must match the selected target.";
    }
    if (!state.combatants.has(targetId)) {
      return "Save-gate spell target must be a combatant in this battle.";
    }
    return validateSavingThrowOutcomeSelections({
      outcomes,
      state,
      actorId,
      allowedTargetIds: new Set([targetId]),
      carefulSpellProtectedTargetIds,
      heightenedSpellTargetId,
    });
  }
  if (targeting.kind === "targetList") {
    if ("area" in value) {
      return "Target-list save-gate spell outcomes must not include area facts.";
    }
    if (targetListIds === undefined) {
      return "Target-list save-gate spell requires target choices before Saving Throw outcomes.";
    }
    if (outcomes.length === 0) {
      return "Target-list save-gate spell must include at least one target Saving Throw outcome.";
    }
    if (
      targetListIds.length < targeting.minTargets ||
      targetListIds.length > targeting.maxTargets
    ) {
      return "Target-list save-gate spell target count is outside the selected spell's target count.";
    }
    if (outcomes.length !== targetListIds.length) {
      return "Target-list save-gate spell Saving Throw outcomes exceed the selected spell's target count.";
    }
    const selectedTargets = new Set(targetListIds);
    const seenTargets = new Set<CombatantId>();
    for (const outcome of outcomes) {
      if (!selectedTargets.has(outcome.targetId)) {
        return "Target-list save-gate spell Saving Throw outcomes must match the selected targets.";
      }
      if (!state.combatants.has(outcome.targetId)) {
        return "Target-list save-gate spell target must be a combatant in this battle.";
      }
      if (seenTargets.has(outcome.targetId)) {
        return "Target-list save-gate spell Saving Throw outcomes must not duplicate targets.";
      }
      seenTargets.add(outcome.targetId);
    }
    return validateSavingThrowOutcomeSelections({
      outcomes,
      state,
      actorId,
      allowedTargetIds: selectedTargets,
      carefulSpellProtectedTargetIds,
      heightenedSpellTargetId,
    });
  }
  if (!("area" in value)) {
    return `Save-gate spell Saving Throw outcomes require area facts for ${targeting.kind}.`;
  }
  if ("kind" in value.area && value.area.kind === "greaseGroundArea") {
    return "Grease ground-area facts are only valid for Grease.";
  }
  if ("kind" in value.area && value.area.kind === "gustOfWindLineArea") {
    if (hole.spell.procedure !== "gustOfWindLine") {
      return "Gust of Wind Line area facts are only valid for Gust of Wind.";
    }
  }
  if ("sleepNonSleeperFacts" in value.area) {
    return "Sleep non-sleeper facts are only valid for Sleep target admission.";
  }
  if ("kind" in value.area && value.area.kind === "faerieFireArea") {
    if (hole.spell.procedure !== "saveGatedAttackRollAdvantage") {
      return "Faerie Fire object area facts are only valid for Faerie Fire.";
    }
    if (!saveGatedAttackRollAdvantageInvocationIsFaerieFire(hole.spell)) {
      return "Faerie Fire object area facts are only valid for Faerie Fire.";
    }
    const affectedObjects = new Set(value.area.affectedObjectIds);
    if (affectedObjects.size !== value.area.affectedObjectIds.length) {
      return "Faerie Fire area affected objects must not duplicate object ids.";
    }
  }
  if (!state.combatants.has(value.area.originAnchorId)) {
    return "Save-gate spell area origin anchor must be a combatant in this battle.";
  }
  if (
    (targeting.kind === "selfOriginCone" ||
      targeting.kind === "selfOriginCube" ||
      targeting.kind === "selfOriginLine") &&
    value.area.originAnchorId !== actorId
  ) {
    return targeting.kind === "selfOriginCone"
      ? "Self-origin Cone save-gate spell area must originate from the caster."
      : targeting.kind === "selfOriginCube"
        ? "Self-origin Cube save-gate spell area must originate from the caster."
        : "Self-origin Line save-gate spell area must originate from the caster.";
  }
  if (
    targeting.kind === "primaryTargetOriginEmanation" &&
    value.area.originAnchorId !== targetId
  ) {
    return "Ice Knife burst area must originate from the primary target.";
  }
  const affectedTargets = new Set(value.area.affectedTargetIds);
  if (affectedTargets.size !== value.area.affectedTargetIds.length) {
    return "Save-gate spell area affected targets must not duplicate targets.";
  }
  if (
    targeting.kind === "primaryTargetOriginEmanation" &&
    targetId !== undefined &&
    !affectedTargets.has(targetId)
  ) {
    return "Ice Knife burst area must include the primary target.";
  }
  if (
    targeting.kind === "pointOriginCubeExcludingCaster" &&
    affectedTargets.has(actorId)
  ) {
    return "Entangle area affected targets must exclude the caster.";
  }
  if (
    "kind" in value.area &&
    value.area.kind === "thunderwaveArea" &&
    (!("postSaveAreaEffect" in hole.spell) ||
      hole.spell.postSaveAreaEffect?.kind !== "thunderwave")
  ) {
    return "Thunderwave push facts are only valid for Thunderwave.";
  }
  if (
    "kind" in value.area &&
    value.area.kind === "fireballArea" &&
    (!("postSaveAreaEffect" in hole.spell) ||
      hole.spell.postSaveAreaEffect?.kind !== "fireballObjectIgnition")
  ) {
    return "Fireball object ignition facts are only valid for Fireball.";
  }
  if (
    "kind" in value.area &&
    value.area.kind === "shatterArea" &&
    (!("postSaveAreaEffect" in hole.spell) ||
      hole.spell.postSaveAreaEffect?.kind !== "shatterObjectDamage")
  ) {
    return "Shatter object damage facts are only valid for Shatter.";
  }
  for (const targetId of affectedTargets) {
    if (!state.combatants.has(targetId)) {
      return "Save-gate spell area affected target must be a combatant in this battle.";
    }
  }
  const seenTargets = new Set<CombatantId>();
  for (const outcome of outcomes) {
    const targetId = outcome.targetId;
    if (!affectedTargets.has(targetId)) {
      return "Save-gate spell Saving Throw outcomes must match the table-supplied area affected targets.";
    }
    if (seenTargets.has(targetId)) {
      return "Save-gate spell Saving Throw outcomes must not duplicate targets.";
    }
    seenTargets.add(targetId);
  }
  if (seenTargets.size !== affectedTargets.size) {
    return "Save-gate spell Saving Throw outcomes must cover every table-supplied area affected target.";
  }
  return validateSavingThrowOutcomeSelections({
    outcomes,
    state,
    actorId,
    allowedTargetIds: affectedTargets,
    carefulSpellProtectedTargetIds,
    heightenedSpellTargetId,
  });
}

function validateSavingThrowOutcomeSelections(input: {
  readonly outcomes: readonly BattleSavingThrowOutcome[];
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly allowedTargetIds: ReadonlySet<CombatantId>;
  readonly carefulSpellProtectedTargetIds: readonly CombatantId[];
  readonly heightenedSpellTargetId: CombatantId | undefined;
}): string | null {
  if (input.carefulSpellProtectedTargetIds.length > 0) {
    const maxProtectedTargets = carefulSpellProtectedTargetLimit(
      input.state,
      input.actorId,
    );
    if (
      input.carefulSpellProtectedTargetIds.length > maxProtectedTargets ||
      input.carefulSpellProtectedTargetIds.length === 0
    ) {
      return "Careful Spell protected target count must be between one and the caster's spellcasting ability modifier.";
    }
    if (
      new Set(input.carefulSpellProtectedTargetIds).size !==
      input.carefulSpellProtectedTargetIds.length
    ) {
      return "Careful Spell protected targets must not repeat.";
    }
    const succeededTargets = new Set(
      input.outcomes
        .filter((outcome) => outcome.succeeded)
        .map((outcome) => outcome.targetId),
    );
    const outcomeTargets = new Set(
      input.outcomes.map((outcome) => outcome.targetId),
    );
    if (
      !input.carefulSpellProtectedTargetIds.every(
        (targetId) =>
          targetId !== input.actorId &&
          input.allowedTargetIds.has(targetId) &&
          outcomeTargets.has(targetId) &&
          succeededTargets.has(targetId),
      )
    ) {
      return "Careful Spell protected targets must be non-caster spell targets that succeed on the saving throw.";
    }
  }
  if (input.heightenedSpellTargetId === undefined) {
    return null;
  }
  return input.allowedTargetIds.has(input.heightenedSpellTargetId)
    ? null
    : "Heightened Spell disadvantaged target must be one affected target from the selected spell.";
}

function saveGatedDamageSpellCastTargetIds(
  fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>,
): readonly CombatantId[] {
  if (fillSet.targetId !== undefined) {
    return [fillSet.targetId];
  }
  if (fillSet.targetList !== undefined) {
    return fillSet.targetList.targetIds;
  }
  if (fillSet.savingThrowOutcomes !== undefined) {
    return "area" in fillSet.savingThrowOutcomes
      ? fillSet.savingThrowOutcomes.area.affectedTargetIds
      : fillSet.savingThrowOutcomes.outcomes.map((outcome) => outcome.targetId);
  }
  return [];
}

function validatePostSaveAreaEffect(input: {
  readonly area: BattleSpellAreaChoice | undefined;
  readonly failedTargetIds: readonly CombatantId[];
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedDamage" }
  >;
}): string | null {
  if (input.invocation.postSaveAreaEffect === undefined) {
    if (input.area !== undefined && "kind" in input.area) {
      if (input.area.kind === "fireballArea") {
        return "Fireball object ignition facts are only valid for Fireball.";
      }
      if (input.area.kind === "shatterArea") {
        return "Shatter object damage facts are only valid for Shatter.";
      }
      return "Thunderwave push facts are only valid for Thunderwave.";
    }
    return null;
  }
  const effect = input.invocation.postSaveAreaEffect;
  if (effect.kind === "fireballObjectIgnition") {
    return validateFireballAreaEffect(input);
  }
  if (effect.kind === "thunderwave") {
    return validateThunderwaveAreaEffect(input);
  }
  if (effect.kind === "shatterObjectDamage") {
    return validateShatterAreaEffect(input);
  }
  const exhaustive: never = effect;
  return exhaustive;
}

function validateFireballAreaEffect(input: {
  readonly area: BattleSpellAreaChoice | undefined;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedDamage" }
  >;
}): string | null {
  if (input.invocation.postSaveAreaEffect?.kind !== "fireballObjectIgnition") {
    return "Fireball object ignition validation requires a Fireball effect.";
  }
  if (input.area === undefined || input.area.kind !== "fireballArea") {
    return "Fireball requires caller-supplied object ignition area facts.";
  }
  const objectIds = new Set<string>();
  for (const fact of input.area.objectIgnitionFacts) {
    if (objectIds.has(fact.objectId)) {
      return "Fireball object ignition facts must not duplicate objects.";
    }
    objectIds.add(fact.objectId);
  }
  return null;
}

function postSaveAreaObjectIgnitions(input: {
  readonly actorId: CombatantId;
  readonly area: BattleSpellAreaChoice | undefined;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedDamage" }
  >;
}): readonly BattleObjectIgnitionOutcome[] {
  if (
    input.invocation.postSaveAreaEffect?.kind !== "fireballObjectIgnition" ||
    input.area?.kind !== "fireballArea"
  ) {
    return [];
  }
  return input.area.objectIgnitionFacts.flatMap((fact) =>
    fact.disposition.kind === "flammableUnattended"
      ? [
          {
            kind: "startsBurning" as const,
            objectId: fact.objectId,
            sourceCombatantId: input.actorId,
            sourceSpellId: spellId(input.invocation.spell.id),
          },
        ]
      : [],
  );
}

function validateShatterAreaEffect(input: {
  readonly area: BattleSpellAreaChoice | undefined;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedDamage" }
  >;
}): string | null {
  if (input.invocation.postSaveAreaEffect?.kind !== "shatterObjectDamage") {
    return "Shatter object damage validation requires a Shatter effect.";
  }
  if (input.area === undefined || input.area.kind !== "shatterArea") {
    return "Shatter requires caller-supplied nonmagical unattended object damage area facts.";
  }
  const objectIds = new Set<string>();
  for (const fact of input.area.nonmagicalUnattendedObjectDamageFacts) {
    if (objectIds.has(fact.objectId)) {
      return "Shatter object damage facts must not duplicate objects.";
    }
    objectIds.add(fact.objectId);
  }
  return null;
}

function postSaveAreaObjectDamageFacts(input: {
  readonly area: BattleSpellAreaChoice | undefined;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedDamage" }
  >;
}): Extract<
  BattleSpellAreaChoice,
  { readonly kind: "shatterArea" }
>["nonmagicalUnattendedObjectDamageFacts"] {
  if (
    input.invocation.postSaveAreaEffect?.kind !== "shatterObjectDamage" ||
    input.area?.kind !== "shatterArea"
  ) {
    return [];
  }
  return input.area.nonmagicalUnattendedObjectDamageFacts;
}

function postSaveAreaObjectDamages(input: {
  readonly facts: ReadonlyArray<
    Extract<
      BattleSpellAreaChoice,
      { readonly kind: "shatterArea" }
    >["nonmagicalUnattendedObjectDamageFacts"][number]
  >;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedDamage" }
  >;
  readonly damageRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>;
}): readonly BattleObjectDamageOutcome[] {
  return input.facts.map((fact) =>
    spellObjectDamageOutcome({
      objectId: fact.objectId,
      invocation: input.invocation,
      damageRoll: input.damageRoll,
      critical: false,
      disposition: fact.disposition,
    }),
  );
}

function validateThunderwaveAreaEffect(input: {
  readonly area: BattleSpellAreaChoice | undefined;
  readonly failedTargetIds: readonly CombatantId[];
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedDamage" }
  >;
}): string | null {
  const effect = input.invocation.postSaveAreaEffect;
  if (effect?.kind !== "thunderwave") {
    return "Thunderwave area effect validation requires a Thunderwave effect.";
  }
  if (input.area === undefined || input.area.kind !== "thunderwaveArea") {
    return "Thunderwave requires caller-supplied push, object, and audible-boom area facts.";
  }
  const failedTargetIds = new Set(input.failedTargetIds);
  const pushedTargetIds = new Set<CombatantId>();
  for (const push of input.area.creaturePushes) {
    if (!failedTargetIds.has(push.targetId)) {
      return "Thunderwave creature push facts must match failed-save targets.";
    }
    if (pushedTargetIds.has(push.targetId)) {
      return "Thunderwave creature push facts must not duplicate targets.";
    }
    pushedTargetIds.add(push.targetId);
    const dispositionValidation = validateThunderwavePushDisposition(
      push.disposition,
      effect.creaturePush.distanceFeet,
    );
    if (dispositionValidation !== null) {
      return dispositionValidation;
    }
  }
  if (pushedTargetIds.size !== failedTargetIds.size) {
    return "Thunderwave creature push facts must cover every failed-save target.";
  }
  const objectIds = new Set<string>();
  for (const push of input.area.unsecuredObjectPushes) {
    if (objectIds.has(push.objectId)) {
      return "Thunderwave unsecured-object push facts must not duplicate objects.";
    }
    objectIds.add(push.objectId);
    const dispositionValidation = validateThunderwavePushDisposition(
      push.disposition,
      effect.unsecuredObjectPush.distanceFeet,
    );
    if (dispositionValidation !== null) {
      return dispositionValidation;
    }
  }
  return input.area.audibleBoom.sound === effect.audibleBoom.sound &&
    input.area.audibleBoom.audibleRadiusFeet ===
      effect.audibleBoom.audibleRadiusFeet
    ? null
    : "Thunderwave audible-boom fact must match the spell's thunderous boom within 300 feet.";
}

function validateThunderwavePushDisposition(
  disposition: BattleThunderwavePushDisposition,
  distanceFeet: MovementFeet,
): string | null {
  if (disposition.distanceFeet !== distanceFeet) {
    return "Thunderwave push disposition must use the spell's 10-foot distance.";
  }
  if (disposition.provokesOpportunityAttacks !== false) {
    return "Thunderwave push disposition must not provoke Opportunity Attacks.";
  }
  if (disposition.kind === "pushed") {
    return disposition.destinationId.length === 0
      ? "Thunderwave pushed destinations must be caller-supplied non-empty table positions."
      : null;
  }
  return null;
}

export function validateGustOfWindLineAreaPushFacts(input: {
  readonly area: BattleSpellAreaChoice | undefined;
  readonly failedTargetIds: readonly CombatantId[];
  readonly pushDistanceFeet: MovementFeet;
}): string | null {
  const area = input.area;
  if (area === undefined || area.kind !== "gustOfWindLineArea") {
    return "Gust of Wind requires caller-supplied Line area, direction, and failed-save push facts.";
  }
  const failedTargetIds = new Set(input.failedTargetIds);
  const pushedTargetIds = new Set<CombatantId>();
  for (const push of area.creaturePushes) {
    if (!failedTargetIds.has(push.targetId)) {
      return "Gust of Wind push facts must match failed-save targets.";
    }
    if (pushedTargetIds.has(push.targetId)) {
      return "Gust of Wind push facts must not duplicate targets.";
    }
    pushedTargetIds.add(push.targetId);
    const dispositionValidation = validateGustOfWindLinePushDisposition(
      push.disposition,
      input.pushDistanceFeet,
    );
    if (dispositionValidation !== null) {
      return dispositionValidation;
    }
  }
  return pushedTargetIds.size === failedTargetIds.size
    ? null
    : "Gust of Wind push facts must cover every failed-save target.";
}

function validateGustOfWindLinePushDisposition(
  disposition: BattleGustOfWindLinePushDisposition,
  distanceFeet: MovementFeet,
): string | null {
  if (disposition.distanceFeet !== distanceFeet) {
    return "Gust of Wind push disposition must use the spell's 15-foot distance.";
  }
  if (disposition.provokesOpportunityAttacks !== false) {
    return "Gust of Wind push disposition must not provoke Opportunity Attacks.";
  }
  if (disposition.kind === "pushed") {
    return disposition.destinationId.length === 0
      ? "Gust of Wind pushed destinations must be caller-supplied non-empty table positions."
      : null;
  }
  return null;
}

function validateSleepTargetAdmissionSavingThrowOutcomes(input: {
  readonly value: BattleSpellSavingThrowOutcomeValue;
  readonly area: BattleSpellAreaChoice | undefined;
  readonly state: BattleState;
}): string | null {
  if (input.area === undefined) {
    return "Sleep Saving Throw outcomes require point-origin Sphere target facts.";
  }
  if (!input.state.combatants.has(input.area.originAnchorId)) {
    return "Sleep point-origin Sphere origin anchor must be a combatant in this battle.";
  }
  const selectedTargets = new Set(input.area.affectedTargetIds);
  if (selectedTargets.size !== input.area.affectedTargetIds.length) {
    return "Sleep point-origin Sphere targets must not duplicate targets.";
  }
  if (input.area.affectedTargetIds.length === 0) {
    return "Sleep must target at least one selected creature.";
  }
  for (const targetId of selectedTargets) {
    if (!input.state.combatants.has(targetId)) {
      return "Sleep point-origin Sphere target must be a combatant in this battle.";
    }
  }
  const nonSleeperTargetIds = new Set<CombatantId>();
  if ("sleepNonSleeperFacts" in input.area) {
    for (const fact of input.area.sleepNonSleeperFacts ?? []) {
      if (!selectedTargets.has(fact.targetId)) {
        return "Sleep non-sleeper facts must match selected Sphere targets.";
      }
      if (nonSleeperTargetIds.has(fact.targetId)) {
        return "Sleep non-sleeper facts must not duplicate targets.";
      }
      nonSleeperTargetIds.add(fact.targetId);
    }
  }
  const autoSuccessTargetIds = new Set(
    input.area.affectedTargetIds.filter((targetId) =>
      sleepTargetAutomaticallySucceeds(input.state, targetId, {
        doesNotSleep: nonSleeperTargetIds.has(targetId),
      }),
    ),
  );
  const nonAutomaticTargetIds = input.area.affectedTargetIds.filter(
    (targetId) => !autoSuccessTargetIds.has(targetId),
  );
  const outcomeTargetIds = new Set<CombatantId>();
  for (const outcome of input.value.outcomes) {
    if (!selectedTargets.has(outcome.targetId)) {
      return "Sleep Saving Throw outcomes must match selected Sphere targets.";
    }
    if (autoSuccessTargetIds.has(outcome.targetId)) {
      return "Sleep targets that do not sleep or have Exhaustion Immunity automatically succeed and must not receive a rolled Saving Throw outcome.";
    }
    if (outcomeTargetIds.has(outcome.targetId)) {
      return "Sleep Saving Throw outcomes must not duplicate targets.";
    }
    outcomeTargetIds.add(outcome.targetId);
  }
  if (outcomeTargetIds.size !== nonAutomaticTargetIds.length) {
    return "Sleep Saving Throw outcomes must cover every selected target that is not an automatic success.";
  }
  return nonAutomaticTargetIds.every((targetId) =>
    outcomeTargetIds.has(targetId),
  )
    ? null
    : "Sleep Saving Throw outcomes must cover every selected target that is not an automatic success.";
}

function validateGreaseGroundHazardSavingThrowOutcomes(input: {
  readonly value: BattleSpellSavingThrowOutcomeValue;
  readonly area: BattleSpellAreaChoice | undefined;
  readonly state: BattleState;
}): string | null {
  if (input.area === undefined) {
    return "Grease Saving Throw outcomes require ground-area facts.";
  }
  if (input.area.kind !== "greaseGroundArea") {
    return "Grease requires a ground-area id.";
  }
  if (input.area.areaId.length === 0) {
    return "Grease ground-area id must not be empty.";
  }
  if ("sleepNonSleeperFacts" in input.area) {
    return "Sleep non-sleeper facts are only valid for Sleep target admission.";
  }
  if (!input.state.combatants.has(input.area.originAnchorId)) {
    return "Grease ground-area origin anchor must be a combatant in this battle.";
  }
  const selectedTargets = new Set(input.area.affectedTargetIds);
  if (selectedTargets.size !== input.area.affectedTargetIds.length) {
    return "Grease ground-area affected targets must not duplicate targets.";
  }
  for (const targetId of selectedTargets) {
    if (!input.state.combatants.has(targetId)) {
      return "Grease ground-area affected target must be a combatant in this battle.";
    }
  }
  const outcomeTargetIds = new Set<CombatantId>();
  for (const outcome of input.value.outcomes) {
    if (!selectedTargets.has(outcome.targetId)) {
      return "Grease Saving Throw outcomes must match the table-supplied ground-area affected targets.";
    }
    if (outcomeTargetIds.has(outcome.targetId)) {
      return "Grease Saving Throw outcomes must not duplicate targets.";
    }
    outcomeTargetIds.add(outcome.targetId);
  }
  return outcomeTargetIds.size === selectedTargets.size
    ? null
    : "Grease Saving Throw outcomes must cover every table-supplied ground-area affected target.";
}

function sleepTargetAutomaticallySucceeds(
  state: BattleState,
  targetId: CombatantId,
  facts: { readonly doesNotSleep: boolean },
): boolean {
  return (
    facts.doesNotSleep || sleepTargetHasExhaustionImmunity(state, targetId)
  );
}

function sleepTargetHasExhaustionImmunity(
  state: BattleState,
  targetId: CombatantId,
): boolean {
  const target = state.combatants.get(targetId);
  return (
    target?.origin.kind === "statBlock" &&
    target.origin.statBlock.statBlock.immunities?.conditions?.includes(
      "exhaustion",
    ) === true
  );
}
