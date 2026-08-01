// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-d20-lifecycle
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-antimagic-field-magical-effect-interdiction
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.potent-cantrip
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-careful-save-protection
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-heightened-save-disadvantage
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-damage-type-substitution
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties
// Save-gated spell resolution extracted from spells-resolve.ts.
// Owns save-gated damage, condition, and attack-roll-advantage procedures.

// KERNEL-COVERAGE: runtime-owner BATTLE.COMMAND.OPTION_AND_NEXT_TURN BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE BATTLE.SPELL.SLEEP_REPEAT_SAVE_LIFECYCLE BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_DAMAGE_PENALTY BATTLE.FEATURE.METAMAGIC_CAREFUL_SAVE_PROTECTION BATTLE.FEATURE.METAMAGIC_HEIGHTENED_SAVE_DISADVANTAGE BATTLE.FEATURE.METAMAGIC_TRANSMUTED_DAMAGE_TYPE_SUBSTITUTION BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ANTIMAGIC_FIELD_MAGICAL_EFFECT_INTERDICTION
import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  damageAmount as toDamageAmount,
  type MovementFeet,
} from "@dnd/shared/types";
import type { DamageType } from "@dnd/surface/surface/types";
import { Either } from "effect";
import type { BattleInterruptTrigger } from "../battle-interrupt-triggers.ts";
import type { BattleSubject } from "../battle-subjects.ts";
import type { BattleProcedureExecutionRef, CombatantId } from "../identity.ts";
import { characterUnitProcedureBindings } from "../character-execution-queries.ts";
import {
  damageDispositionFillFor,
  damageDispositionFillsValidation,
  damageDispositionForTarget,
  zeroHitPointReplacementDispositionHole,
} from "./attack-damage-apply.ts";
import { extendSavingThrowOngoingFeatures } from "./attack-roll.ts";
import { combatantCanTakeReactions } from "./creature-state-execution.ts";
import {
  applyAvailableSpellDamageReduction,
  applyAvailableSourceDamageRollPenalty,
  damageAmountByTypeAfterTargetAdjustments,
  spellDamageReductionRollForTarget,
  sourceDamageRollPenaltyRollHoleForDamageRoll,
  sourceDamageRollPenaltyRollForDamageRoll,
  unexpectedSourceDamageRollPenaltyRoll,
} from "./damage-helpers.ts";
import {
  breakBattleConcentration,
  damageLifecycleConcentrationSavingThrowHoles,
  damageLifecycleHideousLaughterDamageRepeatSaveFillCheck,
  damageLifecycleHideousLaughterDamageRepeatSaveHoles,
  fillsMatchingHoleIds,
} from "./damage-apply.ts";
import { damageRelationshipDecisionFillCheck } from "./damage-relationship-decisions.ts";
import { deduplicateBattleHolesById } from "./hole-helpers.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { invalidResult } from "./result-helpers.ts";
import { applyBattleMovement } from "./battle-movement.ts";
import { reactionSpellTargetFactsForAfterDamage } from "./reaction-triggered-spells.ts";
import { sanctuaryTargetingInterdictionCheck } from "./sanctuary-targeting-interdiction.ts";
import {
  spellCastInterruptFrame,
  spellCastMetamagicApplicationsInput,
} from "./spell-cast-interrupt-frame.ts";
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
  damageAmountByTypeAfterSaveDamageResult,
  heightenedSpellTargetChoiceHoleId,
  spellConditionChoiceHole,
  spellDamageByTypeForTarget,
  spellDamageHole,
  heightenedSpellTargetChoiceHole,
  spellAbilityChoiceHole,
  spellObjectDamageByType,
  spellObjectDamageOutcomeFromDamageByType,
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
  transmutedSpellDamageInvocation,
  type SpellMetamagicApplicationFact,
} from "./metamagic-support.ts";
import {
  spendSpellCastResources,
  spellRequiresConcentration,
} from "./spells-resolve-resources.ts";
import {
  SPELL_MAGICAL_EFFECT_SOURCE,
  magicalEffectTargetsInterdictionMessage,
} from "./antimagic-field-magical-effect-interdiction.ts";
import { spellFillSet, type SpellFillSet } from "./spells-resolve-fill-set.ts";
import type { CharacterBattleMetamagicOptionFact } from "../character-battle-resource-execution.ts";
import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
import { parseBattleMovement } from "./movement-procedures.ts";
import {
  readiedMovementBudgetForActor,
  readiedMovementHole,
} from "./movement-holes.ts";
import {
  type ActionSpellBattleResolutionInput,
  type BattleActiveEffect,
  type BattleAfterDamageEvent,
  type BattleCreatureState,
  type BattleExecutableSpellInvocation,
  type BattleFill,
  type BattleHole,
  type BattleHoleId,
  type BattleObjectDamageOutcome,
  type BattleObjectIgnitionOutcome,
  type BattleResolutionResult,
  type BattleSavingThrowOutcome,
  type BattleSpellAreaChoice,
  type BattleSpellSavingThrowOutcomeValue,
  type BattleState,
  type BattleThunderwavePushDisposition,
  type BonusActionSpellBattleResolutionInput,
  type SaveDamageResult,
} from "../battle-state-execution.ts";
import { ATTACK_TARGET_HOLE_ID } from "./battle-runtime-protocol.ts";
import { isTargetListSpellInvocation } from "./spells-invocation-guards.ts";
import {
  maybeOpenInterruptWindow,
  openAfterDamageSequenceInterruptWindow,
  spendReaction,
} from "./interrupt-execution.ts";
import { spellReactionContinuation } from "./spell-reaction-continuation.ts";
import { snapshotBattle } from "./battle-snapshot.ts";

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

type SaveGatedSpellResolutionInput =
  | ActionSpellBattleResolutionInput
  | BonusActionSpellBattleResolutionInput;

function maybeOpenSpellSaveFailedInterruptWindow(
  input: SaveGatedSpellResolutionInput,
  sourceProcedureRef: BattleProcedureExecutionRef,
  failedTargetIds: readonly CombatantId[],
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> | null {
  const triggeringTargetId = failedTargetIds[0];
  if (triggeringTargetId === undefined) {
    return null;
  }
  const continuation = spellReactionContinuation(input);
  return maybeOpenInterruptWindow(
    input.state,
    {
      trigger: "saveFailed",
      targetId: triggeringTargetId,
      sourceProcedureRef,
      continuation: {
        kind: "replay",
        ...continuation,
      },
    },
    input.handledInterruptTrigger,
  );
}

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
  /* v8 ignore start -- Internal Metamagic invariant: Careful Spell selection is admitted only for a character with an active spellcasting execution. */
  if (
    actor?.origin.kind !== "character" ||
    actor.origin.spellcasting === undefined
  ) {
    return 1;
  }
  /* v8 ignore stop */
  return Math.max(
    1,
    Number(actor.origin.spellcasting.spellcastingAbilityModifier),
  );
}

export function saveMetamagicSelectionState(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    {
      readonly procedure:
        | "saveGatedDamage"
        | "saveGatedCondition"
        | "saveGatedConditionImmunity"
        | "saveGatedAttackRollAdvantage"
        | "hideousLaughter"
        | "hypnoticPattern"
        | "slowActivePenalties"
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
  /* v8 ignore start -- Malformed resolution input: the save-Metamagic fill parser rejects duplicate, wrong-hole, or contradictory selection fills before rule execution. */
  if (metamagicSelectionFills.tag === "invalid") {
    return metamagicSelectionFills;
  }
  /* v8 ignore stop */
  const includesCareful = metamagicApplicationsIncludeCareful(
    input.metamagicApplications,
  );
  const includesHeightened = metamagicApplicationsIncludeHeightened(
    input.metamagicApplications,
  );
  if (!includesCareful && !includesHeightened) {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (
      metamagicSelectionFills.carefulSpellProtectedTargetIds !== undefined ||
      metamagicSelectionFills.heightenedSpellTargetId !== undefined
    ) {
      /* v8 ignore next -- Malformed save-gate fill set: this parser rejection handles a duplicate, wrong-kind, wrong-hole, or contradictory Metamagic selection. */
      return {
        tag: "invalid",
        message:
          "Save-affecting Metamagic selections require matching selected Metamagic options.",
      };
    }
    /* v8 ignore stop */
    return {
      tag: "ok",
      carefulSpellProtectedTargetIds: [],
      heightenedSpellTargetId: undefined,
    };
  }
  const targeting = spellSavingThrowTargeting(input.invocation);
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    targeting.kind === "singleCombatant" &&
    metamagicSelectionFills.carefulSpellProtectedTargetIds !== undefined
  ) {
    /* v8 ignore next -- Malformed save-gate fill set: this parser rejection handles a duplicate, wrong-kind, wrong-hole, or contradictory Metamagic selection. */
    return {
      tag: "invalid",
      message:
        "Single-target Careful Spell does not use a protected-target selection hole.",
    };
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    targeting.kind === "singleCombatant" &&
    metamagicSelectionFills.heightenedSpellTargetId !== undefined
  ) {
    /* v8 ignore next -- Malformed save-gate fill set: this parser rejection handles a duplicate, wrong-kind, wrong-hole, or contradictory Metamagic selection. */
    return {
      tag: "invalid",
      message:
        "Single-target Heightened Spell does not use a target-selection hole.",
    };
  }
  /* v8 ignore stop */
  const holes: BattleHole[] = [];
  const carefulSpellProtectedTargetIds =
    includesCareful && targeting.kind === "singleCombatant"
      ? input.targetId === undefined
        ? []
        : [input.targetId]
      : (metamagicSelectionFills.carefulSpellProtectedTargetIds ?? []);
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !includesCareful &&
    metamagicSelectionFills.carefulSpellProtectedTargetIds !== undefined
  ) {
    /* v8 ignore next -- Malformed save-gate fill set: this parser rejection handles a duplicate, wrong-kind, wrong-hole, or contradictory Metamagic selection. */
    return {
      tag: "invalid",
      message: "Careful Spell protected targets require Careful Spell.",
    };
  }
  /* v8 ignore stop */
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    includesCareful &&
    targeting.kind !== "singleCombatant" &&
    metamagicSelectionFills.carefulSpellProtectedTargetIds !== undefined &&
    metamagicSelectionFills.carefulSpellProtectedTargetIds.length === 0
  ) {
    /* v8 ignore next -- Malformed save-gate fill set: this parser rejection handles a duplicate, wrong-kind, wrong-hole, or contradictory Metamagic selection. */
    return {
      tag: "invalid",
      message:
        "Careful Spell protected target count must be between one and the caster's spellcasting ability modifier.",
    };
  }
  /* v8 ignore stop */
  const heightenedSpellTargetId =
    includesHeightened && targeting.kind === "singleCombatant"
      ? input.targetId
      : metamagicSelectionFills.heightenedSpellTargetId;
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !includesHeightened &&
    metamagicSelectionFills.heightenedSpellTargetId !== undefined
  ) {
    /* v8 ignore next -- Malformed save-gate fill set: this parser rejection handles a duplicate, wrong-kind, wrong-hole, or contradictory Metamagic selection. */
    return {
      tag: "invalid",
      message: "Heightened Spell target requires Heightened Spell.",
    };
  }
  /* v8 ignore stop */
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

export function resolveAreaSaveMetamagicFills(input: {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly actorId: CombatantId;
  readonly invocation: Parameters<
    typeof saveMetamagicSelectionState
  >[0]["invocation"];
  readonly fills: readonly BattleFill[];
  readonly metamagicApplications:
    | readonly CharacterBattleMetamagicOptionFact[]
    | undefined;
  readonly savingThrowOutcomes: BattleSpellSavingThrowOutcomeValue | undefined;
}):
  | BattleResolutionResult
  | {
      readonly tag: "ready";
      readonly savingThrowOutcomes: BattleSpellSavingThrowOutcomeValue;
      readonly carefulSpellProtectedTargetIds: readonly CombatantId[];
      readonly heightenedSpellTargetId: CombatantId | undefined;
    } {
  const selection = saveMetamagicSelectionState({
    state: input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    fills: input.fills,
    metamagicApplications: input.metamagicApplications,
    targetId: undefined,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (selection.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(input.state, "invalidFill", selection.message);
  }
  /* v8 ignore stop */
  if (selection.tag === "needsHoles") {
    return needsHolesResult(input.state, input.subject, selection.holes);
  }
  if (input.savingThrowOutcomes === undefined) {
    return needsHolesResult(input.state, input.subject, [
      spellSavingThrowOutcomeHole(
        input.state,
        input.actorId,
        input.invocation,
        selection.heightenedSpellTargetId,
      ),
    ]);
  }
  const validation = validateSavingThrowOutcomes(
    input.savingThrowOutcomes,
    input.invocation,
    input.state,
    input.actorId,
    undefined,
    undefined,
    selection.carefulSpellProtectedTargetIds,
    selection.heightenedSpellTargetId,
  );
  /* v8 ignore start -- Malformed resolution input: area-save outcome validation rejects target-set or Metamagic facts that contradict the emitted saving-throw hole. */
  if (validation !== null) {
    return invalidResult(input.state, "invalidFill", validation);
  }
  /* v8 ignore stop */
  return {
    tag: "ready",
    savingThrowOutcomes: input.savingThrowOutcomes,
    carefulSpellProtectedTargetIds: selection.carefulSpellProtectedTargetIds,
    heightenedSpellTargetId: selection.heightenedSpellTargetId,
  };
}

function saveMetamagicSelectionFills(
  fills: readonly BattleFill[],
  invocation: Extract<
    BattleExecutableSpellInvocation,
    {
      readonly procedure:
        | "saveGatedDamage"
        | "saveGatedCondition"
        | "saveGatedConditionImmunity"
        | "saveGatedAttackRollAdvantage"
        | "hideousLaughter"
        | "hypnoticPattern"
        | "slowActivePenalties"
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
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (fill.kind !== "spellTargetList") {
        /* v8 ignore next -- Malformed save-gate fill set: this parser rejection handles a duplicate, wrong-kind, wrong-hole, or contradictory Metamagic selection. */
        return {
          tag: "invalid",
          message:
            "Careful Spell protected targets must use the Careful Spell target-list hole.",
        };
      }
      /* v8 ignore stop */
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (carefulSpellProtectedTargetIds !== undefined) {
        /* v8 ignore next -- Malformed save-gate fill set: this parser rejection handles a duplicate, wrong-kind, wrong-hole, or contradictory Metamagic selection. */
        return {
          tag: "invalid",
          message: "Careful Spell protected targets were filled twice.",
        };
      }
      /* v8 ignore stop */
      carefulSpellProtectedTargetIds = fill.value.targetIds;
      continue;
    }
    if (
      fill.holeId ===
      heightenedSpellTargetChoiceHoleId(invocation.sourceProcedureRef)
    ) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (fill.kind !== "targetChoice") {
        /* v8 ignore next -- Malformed save-gate fill set: this parser rejection handles a duplicate, wrong-kind, wrong-hole, or contradictory Metamagic selection. */
        return {
          tag: "invalid",
          message:
            "Heightened Spell target must use the Heightened Spell target hole.",
        };
      }
      /* v8 ignore stop */
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (heightenedSpellTargetId !== undefined) {
        /* v8 ignore next -- Malformed save-gate fill set: this parser rejection handles a duplicate, wrong-kind, wrong-hole, or contradictory Metamagic selection. */
        return {
          tag: "invalid",
          message: "Heightened Spell target was filled twice.",
        };
      }
      /* v8 ignore stop */
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
    BattleExecutableSpellInvocation,
    { readonly procedure: "greaseGroundHazard" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
  readonly spendsCastResources?: boolean;
}): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.targetList !== undefined
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Grease uses one ground-area Saving Throw fill.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.sourceDamageRollPenaltyRolls.length > 0 ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Grease does not use attack, damage, or Concentration fills.",
    );
  }
  /* v8 ignore stop */
  const metamagicSelections = saveMetamagicSelectionState({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    fills: input.input.fills,
    metamagicApplications: input.metamagicApplications,
    targetId: undefined,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (metamagicSelections.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      metamagicSelections.message,
    );
  }
  /* v8 ignore stop */
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
    input.invocation,
    input.input.state,
    input.actorId,
    undefined,
    undefined,
    metamagicSelections.carefulSpellProtectedTargetIds,
    metamagicSelections.heightenedSpellTargetId,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (savingThrowValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!("area" in savingThrowOutcomes)) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Grease requires ground-area facts.",
    );
  }
  /* v8 ignore stop */
  const area = savingThrowOutcomes.area;
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (area.kind !== "greaseGroundArea") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Grease requires a ground-area id.",
    );
  }
  /* v8 ignore stop */

  const failedTargets = savingThrowOutcomes.outcomes.flatMap((outcome) =>
    outcome.succeeded ? [] : [outcome.targetId],
  );
  const saveFailedReactionWindow = maybeOpenSpellSaveFailedInterruptWindow(
    input.input,
    input.invocation.sourceProcedureRef,
    failedTargets,
  );
  if (saveFailedReactionWindow !== null) {
    return saveFailedReactionWindow;
  }

  const resourced =
    input.spendsCastResources === false
      ? ({ tag: "resolved", state: input.input.state } as const)
      : spendSpellCastResources({
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
    heightenedSpellTargetId:
      metamagicSelections.heightenedSpellTargetId === undefined
        ? null
        : metamagicSelections.heightenedSpellTargetId,
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
    BattleExecutableSpellInvocation,
    { readonly procedure: "sleepTargetAdmission" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  const savingThrowHole = spellSavingThrowOutcomeHole(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.targetList !== undefined
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Sleep target admission uses one point-origin Sphere Saving Throw fill.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Sleep target admission does not use attack or damage fills.",
    );
  }
  /* v8 ignore stop */
  if (input.fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      savingThrowHole,
    ]);
  }
  const savingThrowValidation = validateSavingThrowOutcomes(
    input.fillSet.savingThrowOutcomes,
    input.invocation,
    input.input.state,
    input.actorId,
    undefined,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (savingThrowValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }
  /* v8 ignore stop */
  const selectedTargetIds =
    "area" in input.fillSet.savingThrowOutcomes
      ? input.fillSet.savingThrowOutcomes.area.affectedTargetIds
      : [];
  const failedTargets = input.fillSet.savingThrowOutcomes.outcomes.flatMap(
    (outcome) => (outcome.succeeded ? [] : [outcome.targetId]),
  );
  const saveFailedReactionWindow = maybeOpenSpellSaveFailedInterruptWindow(
    input.input,
    input.invocation.sourceProcedureRef,
    failedTargets,
  );
  if (saveFailedReactionWindow !== null) {
    return saveFailedReactionWindow;
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
  const nextState = extendSavingThrowOngoingFeatures(
    effected,
    input.actorId,
    [...selectedTargetIds],
    input.fillSet.savingThrowRelationshipFacts,
  );
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
    BattleExecutableSpellInvocation,
    { readonly procedure: "hideousLaughter" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Hideous Laughter uses target-list and Saving Throw outcome fills.",
    );
  }
  /* v8 ignore stop */
  const targetValidation = validateSpellTargetList(
    input.input.state,
    input.actorId,
    input.invocation,
    input.fillSet.targetList.targetIds,
    input.fillSet.targetList.spatialFacts,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (targetValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(input.input.state, "invalidFill", targetValidation);
  }
  /* v8 ignore stop */
  const metamagicSelections = saveMetamagicSelectionState({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    fills: input.input.fills,
    metamagicApplications: input.metamagicApplications,
    targetId: undefined,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (metamagicSelections.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      metamagicSelections.message,
    );
  }
  /* v8 ignore stop */
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
    input.invocation,
    input.input.state,
    input.actorId,
    undefined,
    input.fillSet.targetList.targetIds,
    metamagicSelections.carefulSpellProtectedTargetIds,
    metamagicSelections.heightenedSpellTargetId,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (savingThrowValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }
  /* v8 ignore stop */
  const failedTargets = input.fillSet.savingThrowOutcomes.outcomes.flatMap(
    (outcome) => (outcome.succeeded ? [] : [outcome.targetId]),
  );
  const saveFailedReactionWindow = maybeOpenSpellSaveFailedInterruptWindow(
    input.input,
    input.invocation.sourceProcedureRef,
    failedTargets,
  );
  if (saveFailedReactionWindow !== null) {
    return saveFailedReactionWindow;
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
    metamagicSelections.heightenedSpellTargetId,
  );
  const nextState = extendSavingThrowOngoingFeatures(
    effected,
    input.actorId,
    input.fillSet.targetList.targetIds,
    input.fillSet.savingThrowRelationshipFacts,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveAbilityD20TestRollModeSaveGateSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "abilityD20TestRollModeSaveGate" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Ability D20 Test save-gate spells use target-list and Saving Throw outcome fills.",
    );
  }
  /* v8 ignore stop */
  const targetValidation = validateSpellTargetList(
    input.input.state,
    input.actorId,
    input.invocation,
    input.fillSet.targetList.targetIds,
    input.fillSet.targetList.spatialFacts,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (targetValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(input.input.state, "invalidFill", targetValidation);
  }
  /* v8 ignore stop */
  const savingThrowHole = spellSavingThrowOutcomeHole(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  if (input.fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      savingThrowHole,
    ]);
  }
  const savingThrowValidation = validateSavingThrowOutcomes(
    input.fillSet.savingThrowOutcomes,
    input.invocation,
    input.input.state,
    input.actorId,
    undefined,
    input.fillSet.targetList.targetIds,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (savingThrowValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }
  /* v8 ignore stop */
  const failedTargets = input.fillSet.savingThrowOutcomes.outcomes.flatMap(
    (outcome) => (outcome.succeeded ? [] : [outcome.targetId]),
  );
  const successfulTargets = input.fillSet.savingThrowOutcomes.outcomes.flatMap(
    (outcome) => (outcome.succeeded ? [outcome.targetId] : []),
  );
  const saveFailedReactionWindow = maybeOpenSpellSaveFailedInterruptWindow(
    input.input,
    input.invocation.sourceProcedureRef,
    failedTargets,
  );
  if (saveFailedReactionWindow !== null) {
    return saveFailedReactionWindow;
  }
  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    startConcentration: true,
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const effected = applyAbilityD20TestRollModeSaveGateEffects(
    resourced.state,
    failedTargets,
    successfulTargets,
    input.invocation,
  );
  const nextState = extendSavingThrowOngoingFeatures(
    effected,
    input.actorId,
    input.fillSet.targetList.targetIds,
    input.fillSet.savingThrowRelationshipFacts,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function applyAbilityD20TestRollModeSaveGateEffects(
  state: BattleState,
  failedTargetIds: readonly CombatantId[],
  successfulTargetIds: readonly CombatantId[],
  invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "abilityD20TestRollModeSaveGate" }
  >,
): BattleState {
  const combatants = new Map(state.combatants);
  for (const targetId of successfulTargetIds) {
    const target = combatants.get(targetId);
    /* v8 ignore start -- validateSavingThrowOutcomes proves every outcome target exists before resource spending, whose action/slot/concentration updates cannot remove combatants before this private helper. */
    if (target === undefined) {
      continue;
    }
    /* v8 ignore stop */
    combatants.set(targetId, {
      ...target,
      activeEffects: [
        ...target.activeEffects,
        {
          ...invocation.successEffect,
          sourceProcedureRef: invocation.sourceProcedureRef,
        },
      ],
    });
  }
  for (const targetId of failedTargetIds) {
    const target = combatants.get(targetId);
    /* v8 ignore start -- validateSavingThrowOutcomes proves every outcome target exists before resource spending, whose action/slot/concentration updates cannot remove combatants before this private helper. */
    if (target === undefined) {
      continue;
    }
    /* v8 ignore stop */
    combatants.set(targetId, {
      ...target,
      activeEffects: [
        ...target.activeEffects,
        {
          ...invocation.failedSaveEffect,
          sourceProcedureRef: invocation.sourceProcedureRef,
        },
        {
          ...invocation.failedSaveDamagePenaltyEffect,
          sourceProcedureRef: invocation.sourceProcedureRef,
        },
      ],
    });
  }
  return { ...state, combatants };
}
export function resolveSaveGateDamageSpellRelease(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "saveGatedDamage" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly selfOriginAreaAnchorId?: CombatantId;
  readonly opensSpellCastReactionWindow?: boolean;
  readonly startsOrdinaryConcentration?: boolean;
}): BattleResolutionResult {
  const beforeSpend = resolveSaveGateDamageSpellAct({
    ...input,
    spendsCastResources: false,
    startsOrdinaryConcentration: input.startsOrdinaryConcentration ?? true,
  });
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
  readonly input:
    | ActionSpellBattleResolutionInput
    | BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "saveGatedDamage" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly actionCostOverride?: "magicAction" | "bonusAction";
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
  readonly spendsCastResources?: boolean;
  readonly startsOrdinaryConcentration?: boolean;
  readonly selfOriginAreaAnchorId?: CombatantId;
  readonly opensSpellCastReactionWindow?: boolean;
}): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.invocation.targeting.kind !== "singleCombatant" &&
    input.invocation.targeting.kind !== "targetList" &&
    input.fillSet.targetId !== undefined
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Save-gate damage spells use saving throw outcome fills, not a single-target fill.",
    );
  }
  /* v8 ignore stop */
  if (input.invocation.targeting.kind === "singleCombatant") {
    if (input.fillSet.targetId === undefined) {
      return needsHolesResult(input.input.state, input.input.subject, [
        spellTargetHole(input.input.state, input.actorId, input.invocation),
      ]);
    }
    const target = input.input.state.combatants.get(input.fillSet.targetId);
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
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
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Spell target must be a combatant within the selected spell's supported range.",
      );
    }
    /* v8 ignore stop */
    const sanctuaryCheck = sanctuaryTargetingInterdictionCheck({
      state: input.input.state,
      triggeringProcedureRef: input.invocation.sourceProcedureRef,
      triggeringCombatantId: input.actorId,
      wardedCombatantId: target.combatantId,
      triggeringTargetEventId: ATTACK_TARGET_HOLE_ID,
      replacementTargetKind: "nonAttack",
      fills: input.input.fills,
    });
    if (sanctuaryCheck.tag === "needsHoles") {
      return needsHolesResult(input.input.state, input.input.subject, [
        sanctuaryCheck.hole,
      ]);
    }
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (sanctuaryCheck.tag === "invalid") {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        sanctuaryCheck.message,
      );
    }
    /* v8 ignore stop */
    if (sanctuaryCheck.tag === "lost") {
      return resolveSaveGateDamageSpellCastResources(input, {
        state: input.input.state,
        actorId: input.actorId,
        invocation: input.invocation,
        errorState: input.input.state,
        startConcentration: false,
        ...(input.actionCostOverride === undefined
          ? {}
          : { actionCostOverride: input.actionCostOverride }),
        ...(input.metamagicApplications === undefined
          ? {}
          : { metamagicApplications: input.metamagicApplications }),
      });
    }
    if (sanctuaryCheck.tag === "newTarget") {
      const replacementTarget = input.input.state.combatants.get(
        sanctuaryCheck.targetId,
      );
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
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
        /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
        return invalidResult(
          input.input.state,
          "invalidFill",
          "Sanctuary replacement spell target must be legal for the selected spell.",
        );
      }
      /* v8 ignore stop */
      const originalTargetFill = input.input.fills.find(
        (
          fill,
        ): fill is Extract<BattleFill, { readonly kind: "targetChoice" }> =>
          fill.kind === "targetChoice" && fill.value === target.combatantId,
      );
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (originalTargetFill === undefined) {
        /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
        return invalidResult(
          input.input.state,
          "invalidFill",
          "Sanctuary replacement requires the original spell target fill.",
        );
      }
      /* v8 ignore stop */
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
      const rewrittenFillSet = spellFillSet(
        rewrittenFills,
        input.invocation,
        input.invocation.sourceProcedureRef,
        input.actorId,
        input.input.state,
      );
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (rewrittenFillSet.tag !== "ok") {
        /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
        return invalidResult(
          input.input.state,
          "invalidFill",
          rewrittenFillSet.message,
        );
      }
      /* v8 ignore stop */
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (metamagicSelections.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      metamagicSelections.message,
    );
  }
  /* v8 ignore stop */
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
    input.fillSet.targetList?.relationshipFacts ?? [],
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fillSet.attackRoll !== undefined) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Save-gate damage spells do not use an attack roll.",
    );
  }
  /* v8 ignore stop */
  if (
    input.invocation.failedSaveAbilityChoices !== null &&
    input.fillSet.abilityChoice === undefined
  ) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellAbilityChoiceHole(input.invocation),
    ]);
  }
  if (input.opensSpellCastReactionWindow !== false) {
    const spellCastReactionWindow = maybeOpenInterruptWindow(
      input.input.state,
      spellCastInterruptFrame({
        casterId: input.actorId,
        invocation: input.invocation,
        targetIds: saveGatedDamageSpellCastTargetIds(input.fillSet),
        reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
        castingResource:
          input.actionCostOverride === "bonusAction" ||
          input.input.subject.tag === "bonusActionSpell"
            ? { kind: "bonusAction" }
            : { kind: "magicAction" },
        ...spellCastMetamagicApplicationsInput(
          input.metamagicApplications ?? [],
        ),
        continuation: {
          kind: "replay",
          ...spellReactionContinuation(input.input),
        },
      }),
      input.input.handledInterruptTrigger,
    );
    if (spellCastReactionWindow !== null) {
      return spellCastReactionWindow;
    }
  }
  if (input.fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      savingThrowHole,
    ]);
  }
  const savingThrowOutcomes = input.fillSet.savingThrowOutcomes;

  const savingThrowValidation = validateSavingThrowOutcomes(
    savingThrowOutcomes,
    input.invocation,
    input.input.state,
    input.actorId,
    input.fillSet.targetId,
    input.fillSet.targetList?.targetIds,
    metamagicSelections.carefulSpellProtectedTargetIds,
    metamagicSelections.heightenedSpellTargetId,
    input.selfOriginAreaAnchorId === undefined
      ? {}
      : { selfOriginAreaAnchorId: input.selfOriginAreaAnchorId },
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (savingThrowValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }
  /* v8 ignore stop */
  const savingThrowArea =
    "area" in savingThrowOutcomes ? savingThrowOutcomes.area : undefined;
  const damageInvocation = transmutedSpellDamageInvocation(
    input.invocation,
    input.metamagicApplications,
  );
  const failedTargets = savingThrowOutcomes.outcomes.flatMap((outcome) =>
    outcome.succeeded ? [] : [outcome.targetId],
  );
  const saveGatedDamageSpellRequiresConcentration = spellRequiresConcentration(
    input.invocation,
  );
  const startsOrdinaryConcentration = input.startsOrdinaryConcentration ?? true;
  const shouldCreateDurationEffect =
    saveGatedDamageSpellRequiresConcentration && failedTargets.length > 0;
  const startFailedSaveConcentration =
    startsOrdinaryConcentration && shouldCreateDurationEffect;
  const failedSaveConcentrationDuration = shouldCreateDurationEffect
    ? failedSaveConcentrationDurationEffect({
        actorId: input.actorId,
        invocation: input.invocation,
      })
    : null;
  if (shouldCreateDurationEffect && failedSaveConcentrationDuration === null) {
    return invalidResult(
      input.input.state,
      "unsupportedSubject",
      "Save-gated damage Concentration spells require a supported maximum duration.",
    );
  }
  const stateAfterCastConcentrationBreak =
    startsOrdinaryConcentration && saveGatedDamageSpellRequiresConcentration
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (postSaveAreaEffectValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      postSaveAreaEffectValidation,
    );
  }
  /* v8 ignore stop */

  const selectedTargetIds = savingThrowOutcomes.outcomes.map(
    (outcome) => outcome.targetId,
  );
  const saveDamageResultByTargetId = new Map(
    savingThrowOutcomes.outcomes.map((outcome) => [
      outcome.targetId,
      potentCantripSaveDamageResultForOutcome({
        state: stateAfterCastConcentrationBreak,
        actorId: input.actorId,
        targetId: outcome.targetId,
        invocation: input.invocation,
        savingThrowSucceeded: outcome.succeeded,
        carefulSpellProtectedTargetIds:
          metamagicSelections.carefulSpellProtectedTargetIds,
      }),
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
    invocation: damageInvocation,
  });
  const saveFailedReactionWindow = maybeOpenSpellSaveFailedInterruptWindow(
    input.input,
    input.invocation.sourceProcedureRef,
    failedTargets,
  );
  if (saveFailedReactionWindow !== null) {
    return saveFailedReactionWindow;
  }
  if (damageTargets.length === 0 && objectDamageFacts.length === 0) {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (
      input.fillSet.damageRoll !== undefined ||
      input.fillSet.damageDispositions.length > 0 ||
      input.fillSet.sourceDamageRollPenaltyRolls.length > 0
    ) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Save-gate spell damage can only be filled when at least one target takes damage.",
      );
    }
    /* v8 ignore stop */
    const effected = applyFailedSaveSpellActiveEffects(
      stateAfterCastConcentrationBreak,
      input.actorId,
      failedTargets,
      input.invocation,
    );
    const conditioned = applySaveGatedDamageFailedSaveConditionEffects(
      effected,
      input.actorId,
      failedTargets,
      input.invocation,
      input.fillSet.abilityChoice,
      metamagicSelections.heightenedSpellTargetId,
    );
    const spentResources = withFailedSaveConcentrationDuration(
      resolveSaveGateDamageSpellCastResources(input, {
        state: extendSavingThrowOngoingFeatures(
          conditioned,
          input.actorId,
          selectedTargetIds,
          input.fillSet.savingThrowRelationshipFacts,
        ),
        actorId: input.actorId,
        invocation: input.invocation,
        errorState: input.input.state,
        startConcentration: startFailedSaveConcentration,
        ...(input.actionCostOverride === undefined
          ? {}
          : { actionCostOverride: input.actionCostOverride }),
        ...(input.metamagicApplications === undefined
          ? {}
          : { metamagicApplications: input.metamagicApplications }),
      }),
      input.actorId,
      failedSaveConcentrationDuration,
      { replaceExistingSameSpellDuration: startFailedSaveConcentration },
    );
    return withObjectIgnitions(spentResources, objectIgnitions);
  }

  if (input.fillSet.damageRoll == null) {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (input.fillSet.sourceDamageRollPenaltyRolls.length > 0) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Save-gate spell damage can only be filled when at least one target takes damage.",
      );
    }
    /* v8 ignore stop */
    return needsHolesResult(input.input.state, input.input.subject, [
      spellDamageHole(damageInvocation),
    ]);
  }
  const damageRoll = input.fillSet.damageRoll;
  const damageValidation = validateSpellDamageFill(
    damageRoll,
    damageInvocation,
    false,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(input.input.state, "invalidFill", damageValidation);
  }
  /* v8 ignore stop */
  const objectDamageByType =
    objectDamageFacts.length === 0
      ? undefined
      : spellObjectDamageByType(damageInvocation, damageRoll);
  const sourceCombatant = stateAfterCastConcentrationBreak.combatants.get(
    input.actorId,
  );
  const expectedSourcePenaltyHoles = [
    ...damageTargets.flatMap((targetId) => {
      const target = stateAfterCastConcentrationBreak.combatants.get(targetId);
      if (target === undefined) {
        return [];
      }
      const damageByType = spellDamageByTypeForTarget(
        target,
        damageInvocation,
        damageRoll,
        "full",
      );
      const hole = sourceDamageRollPenaltyRollHoleForDamageRoll(
        sourceCombatant,
        damageByType,
        damageRoll.holeId,
      );
      return hole === null ? [] : [hole];
    }),
    ...(objectDamageByType === undefined
      ? []
      : [
          sourceDamageRollPenaltyRollHoleForDamageRoll(
            sourceCombatant,
            objectDamageByType,
            damageRoll.holeId,
          ),
        ].filter((hole) => hole !== null)),
  ];
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    unexpectedSourceDamageRollPenaltyRoll(
      input.fillSet.sourceDamageRollPenaltyRolls,
      expectedSourcePenaltyHoles,
    ) !== undefined
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  /* v8 ignore stop */
  const sourcePenaltyChecks = [
    ...damageTargets.map((targetId) => {
      const target = stateAfterCastConcentrationBreak.combatants.get(targetId);
      const damageByType =
        target === undefined
          ? new Map()
          : spellDamageByTypeForTarget(
              target,
              damageInvocation,
              damageRoll,
              "full",
            );
      return target === undefined
        ? ({ tag: "ok", damageByType } as const)
        : applyAvailableSourceDamageRollPenalty(
            sourceCombatant,
            damageByType,
            damageRoll.holeId,
            sourceDamageRollPenaltyRollForDamageRoll(
              input.fillSet.sourceDamageRollPenaltyRolls,
              sourceCombatant,
              damageByType,
              damageRoll.holeId,
            ),
          );
    }),
    ...(objectDamageByType === undefined
      ? []
      : [
          applyAvailableSourceDamageRollPenalty(
            sourceCombatant,
            objectDamageByType,
            damageRoll.holeId,
            sourceDamageRollPenaltyRollForDamageRoll(
              input.fillSet.sourceDamageRollPenaltyRolls,
              sourceCombatant,
              objectDamageByType,
              damageRoll.holeId,
            ),
          ),
        ]),
  ];
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (sourcePenaltyChecks.some((check) => check.tag === "invalid")) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  /* v8 ignore stop */
  const missingSourcePenaltyHoles = deduplicateBattleHolesById(
    sourcePenaltyChecks.flatMap((check) =>
      check.tag === "needsHoles" ? [...check.holes] : [],
    ),
  );
  if (missingSourcePenaltyHoles.length > 0) {
    return needsHolesResult(input.input.state, input.input.subject, [
      ...missingSourcePenaltyHoles,
    ]);
  }
  const objectSourcePenalty =
    objectDamageByType === undefined
      ? undefined
      : applyAvailableSourceDamageRollPenalty(
          sourceCombatant,
          objectDamageByType,
          damageRoll.holeId,
          sourceDamageRollPenaltyRollForDamageRoll(
            input.fillSet.sourceDamageRollPenaltyRolls,
            sourceCombatant,
            objectDamageByType,
            damageRoll.holeId,
          ),
        );
  const objectDamages =
    objectSourcePenalty === undefined || objectSourcePenalty.tag !== "ok"
      ? []
      : postSaveAreaObjectDamages({
          facts: objectDamageFacts,
          invocation: damageInvocation,
          damageByType: objectSourcePenalty.damageByType,
        });
  const spellReductionChecks = damageTargets.map((targetId) => {
    const target = stateAfterCastConcentrationBreak.combatants.get(targetId);
    if (target === undefined) {
      return { tag: "ok" as const, targetId, target, damageByType: new Map() };
    }
    const damageByType = spellDamageByTypeForTarget(
      target,
      damageInvocation,
      damageRoll,
      "full",
    );
    const sourcePenalty = applyAvailableSourceDamageRollPenalty(
      sourceCombatant,
      damageByType,
      damageRoll.holeId,
      sourceDamageRollPenaltyRollForDamageRoll(
        input.fillSet.sourceDamageRollPenaltyRolls,
        sourceCombatant,
        damageByType,
        damageRoll.holeId,
      ),
    );
    if (sourcePenalty.tag !== "ok") {
      return { tag: "ok" as const, targetId, target, damageByType: new Map() };
    }
    return {
      targetId,
      ...applyAvailableSpellDamageReduction(
        target,
        damageAmountByTypeAfterSaveDamageResult(
          sourcePenalty.damageByType,
          saveDamageResultForTarget(targetId),
        ),
        spellDamageReductionRollForTarget(
          input.fillSet.spellDamageReductionRolls,
          target,
        ),
      ),
    };
  });
  const invalidSpellReductionCheck = spellReductionChecks.find(
    (check) => check.tag === "invalid",
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (invalidSpellReductionCheck?.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell damage reduction roll is only valid for an available target-side damage reduction.",
    );
  }
  /* v8 ignore stop */
  const missingSpellReductionHoles = deduplicateBattleHolesById(
    spellReductionChecks.flatMap((check) =>
      check.tag === "needsHoles" ? [...check.holes] : [],
    ),
  );
  if (missingSpellReductionHoles.length > 0) {
    return needsHolesResult(input.input.state, input.input.subject, [
      ...missingSpellReductionHoles,
    ]);
  }
  const spellReductionByTargetId = new Map(
    spellReductionChecks.flatMap((check) =>
      check.tag === "ok" && check.target !== undefined
        ? [[check.targetId, check] as const]
        : [],
    ),
  );
  const damageAmountByTargetId = new Map(
    damageTargets.flatMap((targetId): readonly [CombatantId, number][] => {
      const target = stateAfterCastConcentrationBreak.combatants.get(targetId);
      const reduction = spellReductionByTargetId.get(targetId);
      if (target === undefined || reduction === undefined) {
        return [];
      }
      return [
        [
          targetId,
          damageAmountByTypeAfterTargetAdjustments(
            input.input.state,
            reduction.target,
            reduction.damageByType,
          ),
        ],
      ];
    }),
  );

  const concentrationSaves = damageTargets.flatMap((targetId) => {
    const target = stateAfterCastConcentrationBreak.combatants.get(targetId);
    const damageAmount = damageAmountByTargetId.get(targetId);
    if (target === undefined || damageAmount === undefined) {
      return [];
    }
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.concentrationSavingThrows.some(
      (fill) => !concentrationSaveIds.has(fill.holeId),
    )
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Concentration Saving Throw fill is only valid for a concentrating damaged target.",
    );
  }
  /* v8 ignore stop */
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
    const damageAmount = damageAmountByTargetId.get(targetId);
    if (target === undefined || damageAmount === undefined) {
      return [];
    }
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageDispositionValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      damageDispositionValidation,
    );
  }
  /* v8 ignore stop */
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
    const damageAmount = damageAmountByTargetId.get(targetId);
    if (target === undefined || damageAmount === undefined) {
      return { tag: "ok" as const, holes: [] };
    }
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (invalidHideousLaughterSaveCheck?.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      invalidHideousLaughterSaveCheck.message,
    );
  }
  /* v8 ignore stop */
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.hideousLaughterDamageRepeatSaves.some(
      (fill) => !hideousLaughterSaveHoleIds.has(fill.holeId),
    )
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Hideous Laughter damage repeat save fill must match a requested damaged target.",
    );
  }
  /* v8 ignore stop */
  const damageDispositionByTargetId = new Map(
    damageTargets.map((targetId) => [
      targetId,
      damageDispositionForTarget(
        damageDispositionHoles,
        input.fillSet.damageDispositions,
        targetId,
      ),
    ]),
  );
  const relationshipCheck = damageRelationshipDecisionFillCheck({
    state: stateAfterCastConcentrationBreak,
    damageEventHoleId: damageRoll.holeId,
    damageSourceId: input.actorId,
    targets: damageTargets.flatMap((targetId) => {
      const damageAmount = damageAmountByTargetId.get(targetId) ?? 0;
      return damageAmount > 0
        ? [
            {
              targetId,
              damageAmount: toDamageAmount(damageAmount),
              damageDisposition: damageDispositionByTargetId.get(targetId),
            },
          ]
        : [];
    }),
    spatialFacts: input.fillSet.targetSpatialFacts,
    decisionsByRelationshipHole: input.fillSet.damageRelationshipDecisions,
  });
  if (relationshipCheck.tag === "needsHoles") {
    return needsHolesResult(
      input.input.state,
      input.input.subject,
      relationshipCheck.holes,
    );
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (relationshipCheck.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      relationshipCheck.message,
    );
  }
  /* v8 ignore stop */
  const damaged = damageTargets.reduce((state, targetId) => {
    const target = state.combatants.get(targetId);
    if (target === undefined) {
      return state;
    }
    const damageByType = spellDamageByTypeForTarget(
      target,
      damageInvocation,
      damageRoll,
      "full",
    );
    const sourcePenalty = applyAvailableSourceDamageRollPenalty(
      state.combatants.get(input.actorId),
      damageByType,
      damageRoll.holeId,
      sourceDamageRollPenaltyRollForDamageRoll(
        input.fillSet.sourceDamageRollPenaltyRolls,
        state.combatants.get(input.actorId),
        damageByType,
        damageRoll.holeId,
      ),
    );
    if (sourcePenalty.tag !== "ok") {
      return state;
    }
    const spellReduction = applyAvailableSpellDamageReduction(
      target,
      damageAmountByTypeAfterSaveDamageResult(
        sourcePenalty.damageByType,
        saveDamageResultForTarget(targetId),
      ),
      spellDamageReductionRollForTarget(
        input.fillSet.spellDamageReductionRolls,
        target,
      ),
    );
    const damageAmountAfterSourcePenalty =
      spellReduction.tag !== "ok"
        ? 0
        : damageAmountByTypeAfterTargetAdjustments(
            input.input.state,
            spellReduction.target,
            spellReduction.damageByType,
          );
    const concentrationLifecycleHoles =
      damageLifecycleConcentrationSavingThrowHoles({
        state,
        target,
        damageAmount: damageAmountAfterSourcePenalty,
      });
    const concentrationLifecycleFills = fillsMatchingHoleIds(
      input.fillSet.concentrationSavingThrows,
      concentrationLifecycleHoles,
    );
    const hideousLaughterLifecycleHoles =
      damageLifecycleHideousLaughterDamageRepeatSaveHoles({
        state,
        target,
        damageAmount: damageAmountAfterSourcePenalty,
      });
    const hideousLaughterLifecycleFills = fillsMatchingHoleIds(
      input.fillSet.hideousLaughterDamageRepeatSaves,
      hideousLaughterLifecycleHoles,
    );
    return applySpellDamage(
      state,
      targetId,
      damageInvocation,
      damageRoll,
      false,
      {
        concentrationSavingThrow: concentrationSaveByTargetId.get(targetId),
        wardingBondDamageShareConcentrationSavingThrows:
          concentrationLifecycleFills,
        hideousLaughterDamageRepeatSaves: hideousLaughterLifecycleFills,
        saveDamageResult: saveDamageResultForTarget(targetId),
        sourcePenaltyDamageByType: sourcePenalty.damageByType,
        spellDamageReductionRoll: spellDamageReductionRollForTarget(
          input.fillSet.spellDamageReductionRolls,
          target,
        ),
        sourceDamageRollPenaltyRoll: sourceDamageRollPenaltyRollForDamageRoll(
          input.fillSet.sourceDamageRollPenaltyRolls,
          state.combatants.get(input.actorId),
          damageByType,
          damageRoll.holeId,
        ),
        damageDisposition: damageDispositionByTargetId.get(targetId),
        damageSourceId: input.actorId,
        spatialFacts: input.fillSet.targetSpatialFacts,
        ...(relationshipCheck.decisions === undefined
          ? {}
          : { relationshipDecisions: relationshipCheck.decisions }),
      },
    );
  }, stateAfterCastConcentrationBreak);
  const effected = applyFailedSaveSpellActiveEffects(
    damaged,
    input.actorId,
    failedTargets,
    input.invocation,
  );
  const conditioned = applySaveGatedDamageFailedSaveConditionEffects(
    effected,
    input.actorId,
    failedTargets,
    input.invocation,
    input.fillSet.abilityChoice,
    metamagicSelections.heightenedSpellTargetId,
  );
  const extended = extendSavingThrowOngoingFeatures(
    conditioned,
    input.actorId,
    selectedTargetIds,
    input.fillSet.savingThrowRelationshipFacts,
  );
  const spentResources = withFailedSaveConcentrationDuration(
    resolveSaveGateDamageSpellCastResources(input, {
      state: extended,
      actorId: input.actorId,
      invocation: input.invocation,
      errorState: input.input.state,
      startConcentration: startFailedSaveConcentration,
      ...(input.actionCostOverride === undefined
        ? {}
        : { actionCostOverride: input.actionCostOverride }),
      ...(input.metamagicApplications === undefined
        ? {}
        : { metamagicApplications: input.metamagicApplications }),
    }),
    input.actorId,
    failedSaveConcentrationDuration,
    { replaceExistingSameSpellDuration: startFailedSaveConcentration },
  );
  if (spentResources.tag !== "resolved") {
    return spentResources;
  }
  const nextState = spentResources.state;
  const afterDamageEvents = damageTargets.map((targetId) => ({
    damageSourceId: input.actorId,
    damagedId: targetId,
    damageAmount: toDamageAmount(damageAmountByTargetId.get(targetId) ?? 0),
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
    ...(input.input.handledInterruptTrigger === undefined
      ? {}
      : { handledInterruptTrigger: input.input.handledInterruptTrigger }),
  });
  if (forcedMovement !== null) {
    return forcedMovement;
  }

  return openAfterDamageSequenceInterruptWindow({
    state: nextState,
    subject: input.input.subject,
    events: afterDamageEvents,
    objectDamages,
    objectIgnitions,
    droppedObjects: [],
    handledInterruptTrigger: input.input.handledInterruptTrigger,
  });
}

function applySaveGatedDamageFailedSaveConditionEffects(
  state: BattleState,
  actorId: CombatantId,
  failedTargets: readonly CombatantId[],
  invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "saveGatedDamage" }
  >,
  abilityChoice: Extract<SpellFillSet, { readonly tag: "ok" }>["abilityChoice"],
  heightenedSpellTargetId: CombatantId | undefined,
): BattleState {
  return invocation.failedSaveConditionEffects.reduce((nextState, effect) => {
    const selected = selectFailedSaveConditionEffect(effect, null);
    return selected.tag !== "selected"
      ? nextState
      : applyFailedSaveSpellConditionEffects(
          nextState,
          actorId,
          failedTargets,
          invocation,
          selected.effect,
          abilityChoice,
          heightenedSpellTargetId,
        );
  }, state);
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

function potentCantripSaveDamageResultForOutcome(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "saveGatedDamage" }
  >;
  readonly savingThrowSucceeded: boolean;
  readonly carefulSpellProtectedTargetIds: readonly CombatantId[];
}): SaveDamageResult {
  const baseResult = saveGateDamageResultForOutcome(
    input.state,
    input.targetId,
    input.invocation,
    input.savingThrowSucceeded,
    input.carefulSpellProtectedTargetIds,
  );
  if (
    !input.savingThrowSucceeded ||
    baseResult !== "none" ||
    input.carefulSpellProtectedTargetIds.includes(input.targetId)
  ) {
    return baseResult;
  }
  const actor = input.state.combatants.get(input.actorId);
  const target = input.state.combatants.get(input.targetId);
  return potentCantripAppliesToSuccessfulSave({
    actor,
    target,
    invocation: input.invocation,
  })
    ? "half"
    : baseResult;
}

function potentCantripAppliesToSuccessfulSave(input: {
  readonly actor: BattleCreatureState | undefined;
  readonly target: BattleCreatureState | undefined;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "saveGatedDamage" }
  >;
}): boolean {
  if (
    input.actor?.origin.kind !== "character" ||
    input.target === undefined ||
    input.invocation.resource.tag !== "none" ||
    input.invocation.access.tag !== "classCantrip"
  ) {
    return false;
  }
  return characterUnitProcedureBindings(input.actor.origin.execution).some(
    ({ procedure }) =>
      procedure.kind === "unitFeature" &&
      procedure.execution.kind === "potentCantrip" &&
      procedure.execution.potentCantrip.trigger.kind ===
        "castCantripAtCreature" &&
      procedure.execution.potentCantrip.trigger.cantripKind === "damaging" &&
      procedure.execution.potentCantrip.outcomes.includes(
        "targetSucceedsSavingThrow",
      ) &&
      procedure.execution.potentCantrip.damage === "halfCantripDamageIfAny" &&
      procedure.execution.potentCantrip.additionalEffect === "none",
  );
}

type SpellConcentrationDurationEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "spellConcentrationDuration" }
>;

function failedSaveConcentrationDurationEffect(input: {
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "saveGatedDamage" }
  >;
}): SpellConcentrationDurationEffect | null {
  if (input.invocation.spellRuleFacts.duration.kind !== "concentration") {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    input.invocation.spellRuleFacts.duration.upTo,
  );
  if (Either.isLeft(durationTicks)) {
    return null;
  }
  return {
    kind: "spellConcentrationDuration",
    sourceProcedureRef: input.invocation.sourceProcedureRef,
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
  options: { readonly replaceExistingSameSpellDuration: boolean } = {
    replaceExistingSameSpellDuration: true,
  },
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
        ...(options.replaceExistingSameSpellDuration
          ? actor.activeEffects.filter(
              (candidate) =>
                candidate.kind !== "spellConcentrationDuration" ||
                candidate.sourceProcedureRef !== effect.sourceProcedureRef ||
                candidate.sourceCombatantId !== effect.sourceCombatantId,
            )
          : actor.activeEffects),
        effect,
      ],
    }),
  };
  return { ...result, state, snapshot: snapshotBattle(state) };
}

function resolveSaveGateDamageSpellCastResources(
  input: { readonly spendsCastResources?: boolean },
  resourceInput: Parameters<typeof spendSpellCastResources>[0],
): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  if (input.spendsCastResources === false) {
    return {
      tag: "resolved",
      state: resourceInput.state,
      snapshot: snapshotBattle(resourceInput.state),
    };
  }
  return spendSpellCastResources(resourceInput);
}

function resolveFailedSaveForcedReactionMovement(input: {
  readonly state: BattleState;
  readonly subject:
    | ActionSpellBattleResolutionInput["subject"]
    | BonusActionSpellBattleResolutionInput["subject"];
  readonly failedTargets: readonly CombatantId[];
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
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
  readonly handledInterruptTrigger?: BattleInterruptTrigger;
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.failedTargets.length > 1) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Dissonant Whispers forced movement requires exactly one failed target.",
    );
  }
  /* v8 ignore stop */
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
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (input.movementFill !== undefined) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        "Dissonant Whispers movement is unavailable when the failed target cannot move.",
      );
    }
    /* v8 ignore stop */
    return openAfterDamageSequenceInterruptWindow({
      state: spendReaction(input.state, targetId),
      subject: input.subject,
      events: input.afterDamageEvents,
      objectDamages: input.objectDamages,
      objectIgnitions: input.objectIgnitions,
      droppedObjects: [],
      handledInterruptTrigger: input.handledInterruptTrigger,
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
      kind: "budgetedMovement",
      movementBudgetFeet: readiedMovementBudgetForActor(
        input.state,
        targetId,
        input.movementFill.value.speedKind,
      ),
      spendsTurnMovement: false,
    },
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (parsedMovement.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(input.state, "invalidFill", parsedMovement.message);
  }
  /* v8 ignore stop */
  const stateAfterReactionSpend = spendReaction(input.state, targetId);
  const threats = parsedMovement.movement.provokedOpportunityAttacks;
  if (threats.length > 0) {
    const reactionWindow = maybeOpenInterruptWindow(
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
      input.handledInterruptTrigger,
    );
    if (reactionWindow !== null) {
      return reactionWindow;
    }
  }
  return openAfterDamageSequenceInterruptWindow({
    state: applyBattleMovement(
      stateAfterReactionSpend,
      parsedMovement.movement,
    ),
    subject: input.subject,
    events: input.afterDamageEvents,
    objectDamages: input.objectDamages,
    objectIgnitions: input.objectIgnitions,
    droppedObjects: [],
    handledInterruptTrigger: input.handledInterruptTrigger,
  });
}

export function resolveSaveGateConditionSpellAct(input: {
  readonly input:
    | ActionSpellBattleResolutionInput
    | BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "saveGatedCondition" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly actionCostOverride?: "magicAction" | "bonusAction";
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
  readonly spendsCastResources?: boolean;
}): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.invocation.targeting.kind !== "singleCombatant" &&
    input.fillSet.targetId !== undefined
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Save-gate condition spells use saving throw outcome fills, not a single-target fill.",
    );
  }
  /* v8 ignore stop */
  if (input.invocation.targeting.kind === "singleCombatant") {
    if (input.fillSet.targetId === undefined) {
      return needsHolesResult(input.input.state, input.input.subject, [
        spellTargetHole(input.input.state, input.actorId, input.invocation),
      ]);
    }
    const target = input.input.state.combatants.get(input.fillSet.targetId);
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
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
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Spell target must be a combatant within the selected spell's supported range.",
      );
    }
    /* v8 ignore stop */
  }
  if (input.invocation.targeting.kind === "targetList") {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (!isTargetListSpellInvocation(input.invocation)) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Save-gate condition spell target-list shape is unsupported.",
      );
    }
    /* v8 ignore stop */
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (input.fillSet.targetId !== undefined) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Multi-target save-gate condition spells require a target list.",
      );
    }
    /* v8 ignore stop */
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
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (targetListValidation !== null) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        targetListValidation,
      );
    }
    /* v8 ignore stop */
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Save-gate condition spells do not use attack or damage fills.",
    );
  }
  /* v8 ignore stop */
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (selectedEffect.tag === "invalidConditionChoice") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      selectedEffect.message,
    );
  }
  /* v8 ignore stop */
  const metamagicSelections = saveMetamagicSelectionState({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    fills: input.input.fills,
    metamagicApplications: input.metamagicApplications,
    targetId: input.fillSet.targetId,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (metamagicSelections.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      metamagicSelections.message,
    );
  }
  /* v8 ignore stop */
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
    input.fillSet.targetList?.relationshipFacts ?? [],
  );
  if (input.fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      savingThrowHole,
    ]);
  }
  const savingThrowOutcomes = input.fillSet.savingThrowOutcomes;
  const savingThrowValidation = validateSavingThrowOutcomes(
    savingThrowOutcomes,
    input.invocation,
    input.input.state,
    input.actorId,
    input.fillSet.targetId,
    input.fillSet.targetList?.targetIds,
    metamagicSelections.carefulSpellProtectedTargetIds,
    metamagicSelections.heightenedSpellTargetId,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (savingThrowValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }
  /* v8 ignore stop */

  const selectedTargetIds = savingThrowOutcomes.outcomes.map(
    (outcome) => outcome.targetId,
  );
  const failedTargets = savingThrowOutcomes.outcomes.flatMap((outcome) =>
    outcome.succeeded ? [] : [outcome.targetId],
  );
  const saveFailedReactionWindow = maybeOpenSpellSaveFailedInterruptWindow(
    input.input,
    input.invocation.sourceProcedureRef,
    failedTargets,
  );
  if (saveFailedReactionWindow !== null) {
    return saveFailedReactionWindow;
  }

  const resourced =
    input.spendsCastResources === false
      ? ({ tag: "resolved", state: input.input.state } as const)
      : spendSpellCastResources({
          state: input.input.state,
          actorId: input.actorId,
          invocation: input.invocation,
          errorState: input.input.state,
          ...(input.actionCostOverride === undefined
            ? {}
            : { actionCostOverride: input.actionCostOverride }),
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
    undefined,
    metamagicSelections.heightenedSpellTargetId,
  );
  const nextState = extendSavingThrowOngoingFeatures(
    effected,
    input.actorId,
    selectedTargetIds,
    input.fillSet.savingThrowRelationshipFacts,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveSaveGateConditionImmunitySpellAct(input: {
  readonly input:
    | ActionSpellBattleResolutionInput
    | BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "saveGatedConditionImmunity" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly actionCostOverride?: "magicAction" | "bonusAction";
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
}): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.targetList !== undefined
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Save-gate condition-immunity spells use area Saving Throw outcome fills.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Save-gate condition-immunity spells do not use attack or damage fills.",
    );
  }
  /* v8 ignore stop */
  const metamagicSelections = saveMetamagicSelectionState({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    fills: input.input.fills,
    metamagicApplications: input.metamagicApplications,
    targetId: undefined,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (metamagicSelections.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      metamagicSelections.message,
    );
  }
  /* v8 ignore stop */
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
    input.invocation,
    input.input.state,
    input.actorId,
    undefined,
    undefined,
    metamagicSelections.carefulSpellProtectedTargetIds,
    metamagicSelections.heightenedSpellTargetId,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (savingThrowValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }
  /* v8 ignore stop */
  const targetTypeValidation = validateSaveGatedConditionImmunityTargets(
    input.input.state,
    savingThrowOutcomes.outcomes.map((outcome) => outcome.targetId),
    input.invocation,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (targetTypeValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      targetTypeValidation,
    );
  }
  /* v8 ignore stop */

  const selectedTargetIds = savingThrowOutcomes.outcomes.map(
    (outcome) => outcome.targetId,
  );
  const failedTargets = savingThrowOutcomes.outcomes.flatMap((outcome) =>
    outcome.succeeded ? [] : [outcome.targetId],
  );
  const saveFailedReactionWindow = maybeOpenSpellSaveFailedInterruptWindow(
    input.input,
    input.invocation.sourceProcedureRef,
    failedTargets,
  );
  if (saveFailedReactionWindow !== null) {
    return saveFailedReactionWindow;
  }

  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    ...(input.actionCostOverride === undefined
      ? {}
      : { actionCostOverride: input.actionCostOverride }),
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
    input.fillSet.savingThrowRelationshipFacts,
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
    BattleExecutableSpellInvocation,
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
    BattleExecutableSpellInvocation,
    { readonly procedure: "command" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
}): BattleResolutionResult {
  const targetHole = spellTargetListHole(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fillSet.targetId !== undefined) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Command requires a target list.",
    );
  }
  /* v8 ignore stop */
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (targetListValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      targetListValidation,
    );
  }
  /* v8 ignore stop */
  if (input.fillSet.commandOptionChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      commandOptionChoiceHole(input.invocation),
    ]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Command does not use attack, damage, or Concentration fills.",
    );
  }
  /* v8 ignore stop */
  const metamagicSelections = saveMetamagicSelectionState({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    fills: input.input.fills,
    metamagicApplications: input.metamagicApplications,
    targetId: undefined,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (metamagicSelections.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      metamagicSelections.message,
    );
  }
  /* v8 ignore stop */
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
    input.invocation,
    input.input.state,
    input.actorId,
    undefined,
    input.fillSet.targetList.targetIds,
    metamagicSelections.carefulSpellProtectedTargetIds,
    metamagicSelections.heightenedSpellTargetId,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (savingThrowValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }
  /* v8 ignore stop */

  const selectedTargetIds = savingThrowOutcomes.outcomes.map(
    (outcome) => outcome.targetId,
  );
  const failedTargets = savingThrowOutcomes.outcomes.flatMap((outcome) =>
    outcome.succeeded ? [] : [outcome.targetId],
  );
  const saveFailedReactionWindow = maybeOpenSpellSaveFailedInterruptWindow(
    input.input,
    input.invocation.sourceProcedureRef,
    failedTargets,
  );
  if (saveFailedReactionWindow !== null) {
    return saveFailedReactionWindow;
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
    input.fillSet.savingThrowRelationshipFacts,
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
    BattleExecutableSpellInvocation,
    { readonly procedure: "saveGatedAttackRollAdvantage" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
}): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fillSet.targetId !== undefined) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Save-gate attack-roll advantage spells use saving throw outcome fills, not a single-target fill.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Save-gate attack-roll advantage spells do not use attack or damage fills.",
    );
  }
  /* v8 ignore stop */
  const metamagicSelections = saveMetamagicSelectionState({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    fills: input.input.fills,
    metamagicApplications: input.metamagicApplications,
    targetId: undefined,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (metamagicSelections.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      metamagicSelections.message,
    );
  }
  /* v8 ignore stop */
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
    input.invocation,
    input.input.state,
    input.actorId,
    undefined,
    undefined,
    metamagicSelections.carefulSpellProtectedTargetIds,
    metamagicSelections.heightenedSpellTargetId,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (savingThrowValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered save-gate holes or current spell constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }
  /* v8 ignore stop */

  const selectedTargetIds = savingThrowOutcomes.outcomes.map(
    (outcome) => outcome.targetId,
  );
  const failedTargets = savingThrowOutcomes.outcomes.flatMap((outcome) =>
    outcome.succeeded ? [] : [outcome.targetId],
  );
  const saveFailedReactionWindow = maybeOpenSpellSaveFailedInterruptWindow(
    input.input,
    input.invocation.sourceProcedureRef,
    failedTargets,
  );
  if (saveFailedReactionWindow !== null) {
    return saveFailedReactionWindow;
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
    input.fillSet.savingThrowRelationshipFacts,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function validateSavingThrowOutcomes(
  value: BattleSpellSavingThrowOutcomeValue,
  invocation: Parameters<typeof spellSavingThrowOutcomeHole>[2],
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId | undefined,
  targetListIds?: readonly CombatantId[],
  carefulSpellProtectedTargetIds: readonly CombatantId[] = [],
  heightenedSpellTargetId?: CombatantId,
  options: { readonly selfOriginAreaAnchorId?: CombatantId } = {},
): string | null {
  const outcomes = value.outcomes;
  if (invocation.procedure === "rollModifier") {
    /* v8 ignore start -- Malformed roll-modifier save fill: discovery requests a non-empty outcome list without area geometry, so this rejects only an empty caller mutation. */
    if (outcomes.length === 0) {
      return "Save-gated roll modifier spell must include at least one target Saving Throw outcome.";
    }
    /* v8 ignore stop */
    /* v8 ignore start -- Malformed roll-modifier save fill: the selected-target adapter cannot attach area geometry to this hole, so this rejects only a caller mutation. */
    if ("area" in value) {
      return "Save-gated roll modifier spell outcomes must not include area facts.";
    }
    /* v8 ignore stop */
    const seenTargets = new Set<CombatantId>();
    for (const outcome of outcomes) {
      /* v8 ignore start -- Malformed roll-modifier save witness: discovery selects combatants from this battle, so this rejects only a caller-mutated foreign identity. */
      if (!state.combatants.has(outcome.targetId)) {
        return "Save-gated roll modifier spell target must be a combatant in this battle.";
      }
      /* v8 ignore stop */
      /* v8 ignore start -- Malformed roll-modifier save witness: the selected-target adapter emits each target once, so this rejects only a caller-mutated duplicate. */
      if (seenTargets.has(outcome.targetId)) {
        return "Save-gated roll modifier spell Saving Throw outcomes must not duplicate targets.";
      }
      /* v8 ignore stop */
      seenTargets.add(outcome.targetId);
    }
    if (invocation.targeting.kind === "selfAndChosenLegalTargets") {
      return null;
    }
    return invocation.targeting.maxTargets === "allLegalTargets" ||
      outcomes.length <= invocation.targeting.maxTargets
      ? null
      : "Save-gated roll modifier spell Saving Throw outcomes exceed the selected spell's target count.";
  }
  const targeting = spellSavingThrowTargeting(invocation);
  if (invocation.procedure === "sleepTargetAdmission") {
    return validateSleepTargetAdmissionSavingThrowOutcomes({
      value,
      area: "area" in value ? value.area : undefined,
      state,
    });
  }
  if (invocation.procedure === "greaseGroundHazard") {
    return validateGreaseGroundHazardSavingThrowOutcomes({
      value,
      area: "area" in value ? value.area : undefined,
      state,
    });
  }
  if (targeting.kind === "singleCombatant") {
    /* v8 ignore start -- Malformed Saving Throw fill: discovery creates one selected-combatant hole without area facts, and its typed fill adapter preserves that target. These branches only reject caller-mutated cardinality, geometry, identity, or battle-membership fields; canonical outcome selections remain measured below. */
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
    /* v8 ignore stop */
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
    /* v8 ignore start -- Malformed Saving Throw fill: target-list discovery fixes the non-empty bounded target identities before requesting outcomes. These branches reject caller-mutated area, count, membership, and duplicate-target facts; the selected-target outcome semantics remain measured below. */
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
    /* v8 ignore stop */
    return validateSavingThrowOutcomeSelections({
      outcomes,
      state,
      actorId,
      allowedTargetIds: selectedTargets,
      carefulSpellProtectedTargetIds,
      heightenedSpellTargetId,
    });
  }
  /* v8 ignore start -- Malformed area Saving Throw fill: the procedure-specific area hole fixes its geometry kind, origin rule, unique in-battle affected targets, and any Fireball/Shatter/Thunderwave/Gust/Slow/Faerie Fire adjunct facts. This block rejects caller-mutated cross-procedure or spatial structure; Antimagic interdiction and outcome semantics remain measured below. */
  if (!("area" in value)) {
    return `Save-gate spell Saving Throw outcomes require area facts for ${targeting.kind}.`;
  }
  if ("kind" in value.area && value.area.kind === "greaseGroundArea") {
    return "Grease ground-area facts are only valid for Grease.";
  }
  if ("kind" in value.area && value.area.kind === "gustOfWindLineArea") {
    if (invocation.procedure !== "gustOfWindLine") {
      return "Gust of Wind Line area facts are only valid for Gust of Wind.";
    }
  }
  if ("kind" in value.area && value.area.kind === "slowArea") {
    if (invocation.procedure !== "slowActivePenalties") {
      return "Slow area facts are only valid for Slow.";
    }
  }
  if ("sleepNonSleeperFacts" in value.area) {
    return "Sleep non-sleeper facts are only valid for Sleep target admission.";
  }
  if ("kind" in value.area && value.area.kind === "faerieFireArea") {
    if (invocation.procedure !== "saveGatedAttackRollAdvantage") {
      return "Faerie Fire object area facts are only valid for Faerie Fire.";
    }
    if (!saveGatedAttackRollAdvantageInvocationIsFaerieFire(invocation)) {
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
    value.area.originAnchorId !== (options.selfOriginAreaAnchorId ?? actorId)
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
    (!("postSaveAreaEffect" in invocation) ||
      invocation.postSaveAreaEffect?.kind !== "thunderwave")
  ) {
    return "Thunderwave push facts are only valid for Thunderwave.";
  }
  if (
    "kind" in value.area &&
    value.area.kind === "fireballArea" &&
    (!("postSaveAreaEffect" in invocation) ||
      invocation.postSaveAreaEffect?.kind !== "fireballObjectIgnition")
  ) {
    return "Fireball object ignition facts are only valid for Fireball.";
  }
  if (
    "kind" in value.area &&
    value.area.kind === "shatterArea" &&
    (!("postSaveAreaEffect" in invocation) ||
      invocation.postSaveAreaEffect?.kind !== "shatterObjectDamage")
  ) {
    return "Shatter object damage facts are only valid for Shatter.";
  }
  for (const targetId of affectedTargets) {
    if (!state.combatants.has(targetId)) {
      return "Save-gate spell area affected target must be a combatant in this battle.";
    }
  }
  /* v8 ignore stop */
  const antimagicInterdiction = magicalEffectTargetsInterdictionMessage({
    state,
    source: SPELL_MAGICAL_EFFECT_SOURCE,
    targetIds: value.area.affectedTargetIds,
  });
  if (antimagicInterdiction !== null) {
    return antimagicInterdiction;
  }
  const seenTargets = new Set<CombatantId>();
  /* v8 ignore start -- Malformed area Saving Throw outcome list: the area fill adapter emits exactly one outcome for each table-supplied affected target. These branches reject caller-mutated foreign, duplicate, or missing identities; metamagic selection semantics remain measured below. */
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
  /* v8 ignore stop */
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
    if (input.carefulSpellProtectedTargetIds.length > maxProtectedTargets) {
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
    BattleExecutableSpellInvocation,
    { readonly procedure: "saveGatedDamage" }
  >;
}): string | null {
  if (input.invocation.postSaveAreaEffect === undefined) {
    /* v8 ignore start -- Malformed post-save area fill: discovery only requests Fireball, Shatter, or Thunderwave area facts when the invocation owns the matching post-save effect. These branches reject caller-mutated cross-spell facts. */
    if (input.area !== undefined && "kind" in input.area) {
      if (input.area.kind === "fireballArea") {
        return "Fireball object ignition facts are only valid for Fireball.";
      }
      if (input.area.kind === "shatterArea") {
        return "Shatter object damage facts are only valid for Shatter.";
      }
      return "Thunderwave push facts are only valid for Thunderwave.";
    }
    /* v8 ignore stop */
    return null;
  }
  const effect = input.invocation.postSaveAreaEffect;
  if (effect.kind === "fireballObjectIgnition") {
    return validateFireballAreaEffect(input.area);
  }
  if (effect.kind === "thunderwave") {
    return validateThunderwaveAreaEffect({
      area: input.area,
      failedTargetIds: input.failedTargetIds,
      effect,
    });
  }
  if (effect.kind === "shatterObjectDamage") {
    return validateShatterAreaEffect(input.area);
  }
  /* v8 ignore start -- The post-save area-effect union is exhausted above; widening it without a validator arm fails compilation at this assignment. */
  const exhaustive: never = effect;
  return exhaustive;
  /* v8 ignore stop */
}

function validateFireballAreaEffect(
  area: BattleSpellAreaChoice | undefined,
): string | null {
  /* v8 ignore start -- Malformed Fireball area fill: discovery supplies Fireball-specific area facts, so this rejects only a missing or cross-spell caller mutation. */
  if (area === undefined || area.kind !== "fireballArea") {
    return "Fireball requires caller-supplied object ignition area facts.";
  }
  /* v8 ignore stop */
  const objectIds = new Set<string>();
  for (const fact of area.objectIgnitionFacts) {
    /* v8 ignore start -- Malformed Fireball object witness: the table adapter emits each object identity once, so this rejects only a caller-mutated duplicate. */
    if (objectIds.has(fact.objectId)) {
      return "Fireball object ignition facts must not duplicate objects.";
    }
    /* v8 ignore stop */
    objectIds.add(fact.objectId);
  }
  return null;
}

function postSaveAreaObjectIgnitions(input: {
  readonly actorId: CombatantId;
  readonly area: BattleSpellAreaChoice | undefined;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
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
            sourceProcedureRef: input.invocation.sourceProcedureRef,
          },
        ]
      : [],
  );
}

function validateShatterAreaEffect(
  area: BattleSpellAreaChoice | undefined,
): string | null {
  /* v8 ignore start -- Malformed Shatter area fill: discovery supplies Shatter-specific area facts, so this rejects only a missing or cross-spell caller mutation. */
  if (area === undefined || area.kind !== "shatterArea") {
    return "Shatter requires caller-supplied nonmagical unattended object damage area facts.";
  }
  /* v8 ignore stop */
  const objectIds = new Set<string>();
  for (const fact of area.nonmagicalUnattendedObjectDamageFacts) {
    /* v8 ignore start -- Malformed Shatter object witness: the table adapter emits each object identity once, so this rejects only a caller-mutated duplicate. */
    if (objectIds.has(fact.objectId)) {
      return "Shatter object damage facts must not duplicate objects.";
    }
    /* v8 ignore stop */
    objectIds.add(fact.objectId);
  }
  return null;
}

function postSaveAreaObjectDamageFacts(input: {
  readonly area: BattleSpellAreaChoice | undefined;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
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
    BattleExecutableSpellInvocation,
    { readonly procedure: "saveGatedDamage" }
  >;
  readonly damageByType: ReadonlyMap<DamageType, number>;
}): readonly BattleObjectDamageOutcome[] {
  return input.facts.map((fact) =>
    spellObjectDamageOutcomeFromDamageByType({
      objectId: fact.objectId,
      damageType: input.invocation.damage.damageType,
      damageByType: input.damageByType,
      disposition: fact.disposition,
    }),
  );
}

function validateThunderwaveAreaEffect(input: {
  readonly area: BattleSpellAreaChoice | undefined;
  readonly failedTargetIds: readonly CombatantId[];
  readonly effect: Extract<
    NonNullable<
      Extract<
        BattleExecutableSpellInvocation,
        { readonly procedure: "saveGatedDamage" }
      >["postSaveAreaEffect"]
    >,
    { readonly kind: "thunderwave" }
  >;
}): string | null {
  /* v8 ignore start -- Malformed Thunderwave area fill: discovery supplies Thunderwave-specific area facts, so this rejects only a missing or cross-spell caller mutation. */
  if (input.area === undefined || input.area.kind !== "thunderwaveArea") {
    return "Thunderwave requires caller-supplied push, object, and audible-boom area facts.";
  }
  /* v8 ignore stop */
  const failedTargetIds = new Set(input.failedTargetIds);
  const pushedTargetIds = new Set<CombatantId>();
  for (const push of input.area.creaturePushes) {
    /* v8 ignore start -- Malformed Thunderwave creature witness: discovery requests exactly the failed-save targets, so this rejects only a caller-mutated foreign identity. */
    if (!failedTargetIds.has(push.targetId)) {
      return "Thunderwave creature push facts must match failed-save targets.";
    }
    /* v8 ignore stop */
    /* v8 ignore start -- Malformed Thunderwave creature witness: the table adapter emits each failed-save target once, so this rejects only a caller-mutated duplicate. */
    if (pushedTargetIds.has(push.targetId)) {
      return "Thunderwave creature push facts must not duplicate targets.";
    }
    /* v8 ignore stop */
    pushedTargetIds.add(push.targetId);
    const dispositionValidation = validateThunderwavePushDisposition(
      push.disposition,
      input.effect.creaturePush.distanceFeet,
    );
    /* v8 ignore start -- Malformed Thunderwave creature witness: the table adapter constructs the validated push disposition, so this propagates only a caller-mutated contradiction. */
    if (dispositionValidation !== null) {
      return dispositionValidation;
    }
    /* v8 ignore stop */
  }
  /* v8 ignore start -- Malformed Thunderwave creature witness set: discovery requests every failed-save target exactly once, so this rejects only a caller-mutated omission. */
  if (pushedTargetIds.size !== failedTargetIds.size) {
    return "Thunderwave creature push facts must cover every failed-save target.";
  }
  /* v8 ignore stop */
  const objectIds = new Set<string>();
  for (const push of input.area.unsecuredObjectPushes) {
    /* v8 ignore start -- Malformed Thunderwave object witness: the table adapter emits each unsecured object identity once, so this rejects only a caller-mutated duplicate. */
    if (objectIds.has(push.objectId)) {
      return "Thunderwave unsecured-object push facts must not duplicate objects.";
    }
    /* v8 ignore stop */
    objectIds.add(push.objectId);
    const dispositionValidation = validateThunderwavePushDisposition(
      push.disposition,
      input.effect.unsecuredObjectPush.distanceFeet,
    );
    /* v8 ignore start -- Malformed Thunderwave object witness: the table adapter constructs the validated push disposition, so this propagates only a caller-mutated contradiction. */
    if (dispositionValidation !== null) {
      return dispositionValidation;
    }
    /* v8 ignore stop */
  }
  return input.area.audibleBoom.sound === input.effect.audibleBoom.sound &&
    input.area.audibleBoom.audibleRadiusFeet ===
      input.effect.audibleBoom.audibleRadiusFeet
    ? null
    : "Thunderwave audible-boom fact must match the spell's thunderous boom within 300 feet.";
}

function validateThunderwavePushDisposition(
  disposition: BattleThunderwavePushDisposition,
  distanceFeet: MovementFeet,
): string | null {
  /* v8 ignore start -- Malformed Thunderwave push witness: the table adapter copies the spell distance, so this rejects only a caller-mutated distance. */
  if (disposition.distanceFeet !== distanceFeet) {
    return "Thunderwave push disposition must use the spell's 10-foot distance.";
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed Thunderwave push witness: the table adapter fixes the non-provoking forced-movement rule, so this rejects only a caller mutation. */
  if (disposition.provokesOpportunityAttacks !== false) {
    return "Thunderwave push disposition must not provoke Opportunity Attacks.";
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed Thunderwave push witness: the table adapter requires a selected table position for an applied push, so this rejects only a caller-mutated empty destination. */
  if (disposition.kind === "pushed" && disposition.destinationId.length === 0) {
    return "Thunderwave pushed destinations must be caller-supplied non-empty table positions.";
  }
  /* v8 ignore stop */
  return null;
}

function validateSleepTargetAdmissionSavingThrowOutcomes(input: {
  readonly value: BattleSpellSavingThrowOutcomeValue;
  readonly area: BattleSpellAreaChoice | undefined;
  readonly state: BattleState;
}): string | null {
  /* v8 ignore start -- Malformed Sleep area fill: the discovered point-origin Sphere hole supplies an in-battle anchor and a non-empty unique target set. These checks reject caller-mutated geometry, membership, duplication, or non-sleeper witness identities before the automatic-success projection below. */
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
  /* v8 ignore stop */
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
  /* v8 ignore start -- Malformed Sleep outcome fill: the hole adapter emits outcomes only for the selected targets that are not automatic successes and cannot duplicate an identity. The canonical automatic-success partition remains measured above and the exact coverage comparison remains measured below. */
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
  /* v8 ignore stop */
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
  /* v8 ignore start -- Malformed Grease area/outcome fill: discovery owns a non-empty ground-area id, an in-battle anchor, and one unique outcome per table-supplied affected target. These branches only reject caller-mutated cross-spell, membership, or duplicate facts; the exact target-set comparison remains measured below. */
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
  /* v8 ignore stop */
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
    target.origin.mechanics.immunities.conditions.includes("exhaustion") ===
      true
  );
}
