// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-created-held-object
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-levitated-creature
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magic-suppression-emanation
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-governor-quickened
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-duration-and-concentration
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-damage-type-substitution
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-effective-level-extra-target
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-missed-spell-attack-reroll
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-damage-dice-reroll
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.d20-test-natural-one-reroll
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.potent-cantrip
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spiritual-weapon-attack-proxy spell.invocation-glyph-stored-summon-object-placement
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.remarkable-athlete
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-acid-arrow-attack-timing
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_TRANSMUTED_DAMAGE_TYPE_SUBSTITUTION
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_TWINNED_EFFECTIVE_LEVEL_EXTRA_TARGET
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_DISTANT_CAST_RANGE_INCREASE
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_EXTENDED_CAST_DURATION_CONCENTRATION
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_SEEKING_SPELL_ATTACK_REROLL
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_EMPOWERED_DAMAGE_DICE_REROLL
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.DAMAGE_SAVE_OR_ATTACK_PROCEDURE
// Spell resolution dispatch owns the spell-act
// resolvers (`resolveSpellAct`, `resolveAttackBurstSaveDamageSpellAct`,
// `resolveSpellRelease`, `resolvePreparedSlotSpellAct`, …),
// per-procedure resolver bodies (chained spells, healing, scalar buff,
// roll-modifier, creature-type protection, condition immunity, save-gate
// damage/condition/attack-roll-advantage), target-selection helpers, fill-set
// builders, and resource-spending helpers (`spendSpellCastResources`,
// `spellRequiresConcentration`, `startSpellEffectConcentration`).
//
// L sits at the top of the spell subsystem DAG. It consumes K (discovery),
// O (profiles), P (holes/fills), Q (spell-effects), M (damage-apply),
// N (damage-helpers), R (hole-helpers), S (movement-speed), T (attack-roll),
// U (attack-damage-apply), V (statblock), W (statblock-attacks), and G
// (creature-state).
// KERNEL-COVERAGE: runtime-owner BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION BATTLE.SPELL.ACID_ARROW_ATTACK_TIMING BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE

import {
  canSpendBonusAction,
  spendAction,
  spendActivationResource,
} from "@dnd/shared-algebras/action-economy-algebra";
import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import {
  attackRollHits,
  attackRollResultIsValid,
} from "@dnd/shared-algebras/attack-roll-algebra";
import { damageAmount as toDamageAmount } from "@dnd/shared/types";
import { Result, Match } from "effect";
import {
  type AdmittedActionSpellBattleResolutionInput,
  type AdmittedBonusActionDashSpellBattleResolutionInput,
  type AdmittedBonusActionSpellBattleResolutionInput,
  type ActionSpellBattleResolutionInput,
  type BattleAttackRollResult,
  type BattleCreatureState,
  type BattleFill,
  type BattleResolutionResult,
  type BattleSpatialMeleeSpellAttackProxyCommitCheckpoint,
  type BattleState,
  type BattleExecutableSpellInvocation,
  type BonusActionSpellBattleResolutionInput,
  type CharacterBattleCreatureState,
  type SpellMarkedDamageRider,
  type SupportedSpellInvocation,
  spellAttackDamagePayloadIsResolved,
} from "../battle-state-execution.ts";
import {
  ATTACK_ROLL_HOLE_ID,
  ATTACK_TARGET_HOLE_ID,
} from "./battle-runtime-protocol.ts";
import { activeOngoingFeaturesPreventSpellInvocation } from "./spells-invocation-guards.ts";
import { isCantripSpellAccess } from "../procedure-execution/spell-invocation-vocabulary.ts";
import { attackRollIsCriticalHit } from "./attack-resolution.ts";
import { resolveRemarkableAthleteCriticalHitMovement } from "./remarkable-athlete-critical-movement.ts";
import { maybeOpenInterruptWindow } from "./interrupt-execution.ts";
import { spellReplayContinuation } from "./spell-reaction-continuation.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import type { CombatantId } from "../identity.ts";
import { optionalProperty } from "../optional-property.ts";
import {
  characterUnitProcedureBindings,
  characterSpellProcedure,
  type BattleSpellProcedureExecution,
} from "../character-execution-queries.ts";

import {
  damageDispositionFillFor,
  damageDispositionFillsValidation,
  damageDispositionForTarget,
  zeroHitPointReplacementDispositionHole,
} from "./attack-damage-apply.ts";
import {
  attackRollModeMatches,
  consumeHelpAttackForAttackRoll,
  recordAttackRollOngoingFeatures,
  requiredSpellAttackRollMode,
} from "./attack-roll.ts";
import { activeEffectArmorClass } from "./creature-state-execution.ts";
import { isCharacterBattleCreatureState } from "./creature-state-queries.ts";
import {
  concentrationSavingThrowHole,
  damageLifecycleConcentrationSavingThrowFillCheck,
  damageLifecycleSaveGatedConditionWithRepeatDamageRepeatSaveFillCheck,
} from "./damage-apply.ts";
import { saveGatedConditionDamageOccurrenceKeyForHole } from "./staged-condition-repeat-save.ts";
import { damageRelationshipDecisionFillCheck } from "./damage-relationship-decisions.ts";
import {
  activeMarkedDamageRiders,
  applyAvailableSpellDamageReduction,
  applyAvailableSourceDamageRollPenalty,
  damageAmountByTypeAfterTargetAdjustments,
  spellDamageReductionRollForTarget,
  sourceDamageRollPenaltyRollHoleForDamageRoll,
  sourceDamageRollPenaltyRollForDamageRoll,
  unexpectedSourceDamageRollPenaltyRoll,
} from "./damage-helpers.ts";
import {
  attackRollHoleWithD20TestNaturalOneRerollOption,
  d20TestNaturalOneRerollRollDecisionRequired,
  d20TestNaturalOneRerollRollIssue,
  effectiveD20TestNaturalOneRerollAttackRoll,
} from "./d20-test-natural-one-reroll.ts";
import { revealHidden } from "./hole-helpers.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { invalidResult } from "./result-helpers.ts";
import { duplicateHitInterceptionCheck } from "./duplicate-hit-interception.ts";
import {
  type RegisteredSpellProcedure,
  type RegisteredSpellProcedureExecution,
  type SpellProcedureExecutionRegistry,
} from "./spell-procedure-profiles/execution-registry.ts";
import type { SpellProcedureResolutionInput } from "./spell-procedure-profiles/resolution-contract.ts";
import {
  spellExecutionFacts,
  spellProcedureAcceptsActionCostOverride,
  spellProcedureAcceptsMetamagicApplications,
  spellProcedureHasQuickenedActionCostRewrite,
  spellProcedureUsesDirectSpellAttackDamageBody,
  spellProcedureUsesProfileDelegatedSpellAttackDamageBody,
  type SpellProcedureAcceptingActionCostOverride,
  type SpellProcedureWithDirectSpellAttackDamageBody,
  type SpellProcedureWithProfileDelegatedSpellAttackDamageBody,
} from "./spell-execution-facts.ts";
import { isTriggeredReactionSpellInvocation } from "./spell-interrupt-procedure-kinds.ts";
import {
  applySpatialMeleeSpellAttackProxyEffect,
  repositionSpatialMeleeSpellAttackProxyEffect,
} from "./spells-active-effects.ts";
import {
  isReadiedSpellInvocation,
  spellInvocationCasterPrerequisiteIsMet,
} from "./spells-discovery.ts";
import {
  applySpellActiveEffects,
  applySpellLightEmitterEffects,
  applySpellDamage,
  spellObjectTargetHole,
  spellAttackRollHole,
  spellDamageByTypeForTarget,
  spellDamageHole,
  selectedSpellAttackDamageProcedure,
  type RuntimeDamageSpellProcedure,
  type RuntimeExecutableDamageSpellProcedure,
  spellDamageTypes,
  spellTargetHole,
  spellTargetIsLegal,
  validateSpellDamageFill,
} from "./spells-holes-fills.ts";
import {
  spellActTurnResourceAvailable,
  spellHasAvailableSpend,
  spellInvocationIsSpellcasting,
} from "./spell-turn-resources.ts";
import { spellAttackKindForRedirect } from "./spells-profiles-attack-damage.ts";
import {
  recordAttackRollMissToHitReplacementUsed,
  selectedAttackRollMissToHitReplacement,
} from "./statblock-attacks.ts";
import {
  spatialMeleeSpellAttackProxyPositionHole,
  spatialMeleeSpellAttackProxyPositionInvalidReason,
} from "./spells-targeting.ts";
import {
  magicSuppressionOngoingSpellEffectRefForActiveEffect,
  ongoingSpellEffectSuppressedByMagicSuppressionEmanation,
} from "./magic-suppression-ongoing-effect.ts";

import {
  admitSpellMetamagicApplications,
  effectiveEmpoweredSpellDamageRoll,
  empoweredSpellDamageRerollOption,
  empoweredSpellDamageRerollValidationIssue,
  empoweredSpellRerollApplicationForDamageRoll,
  metamagicActionCostOverride,
  seekingSpellAttackRerollOption,
  seekingSpellCombinedUseIssue,
  seekingSpellMetamagicApplication,
  seekingSpellRerollApplicationForAttackRoll,
  spellInvocationHasMagicActionCastingTime,
  transmutedSpellDamageInvocation,
  twinnedSpellTargetCountInvocation,
} from "./metamagic.ts";
import type { SpellMetamagicApplicationFact } from "./metamagic-support.ts";
import {
  spellCastingTimeResourceForSpellCast,
  spendSpellCastResources,
} from "./spells-resolve-resources.ts";

import { chainedSpellFillSet as parseChainedSpellFillSet } from "./spells-resolve-chained.ts";
export {
  resolveAreaMovementDistanceDamageSpellAct,
  resolveDirectionalPersistentAreaSpellAct,
  resolveMagicalDarknessPointOriginSpellAct,
  resolveMovablePersistentAreaSpellAct,
  resolvePersistentAreaSaveConditionEscapeSpellAct,
  resolvePersistentAreaTraitSpellAct,
  resolveRamMovablePersistentAreaSpellAct,
} from "./spells-resolve-area-effects.ts";
export {
  resolveObjectContactDamageRepeatSpellAct,
  resolveObjectContactDamageSpellAct,
} from "./spells-resolve-object-contact-damage.ts";
export { resolveAttackBurstSaveDamageSpellAct } from "./spells-resolve-attack-burst.ts";
export {
  applyChainedSpellDamage,
  chainedSpellFillSet,
  chainedSpellLaterStepsAreEmpty,
  chainedSpellStepIndexForFill,
  damageRollHasDuplicateD8Face,
  emptyChainedSpellStepFills,
  resolveChainedSpellAttackDamageAct,
  resolveCompletedChainedSpell,
  validateChainedSpellDamageFill,
  validateChainedSpellFollowUpFills,
  type ChainedSpellFillSet,
  type ChainedSpellStepFills,
} from "./spells-resolve-chained.ts";
export { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
export {
  spellFillSet,
  spellFillSetSavingThrowTargeting,
  type SpellFillSet,
} from "./spells-resolve-fill-set.ts";
export { resolvePreparedSlotSpellAct } from "./spells-resolve-prepared-slot.ts";
export {
  spellRequiresConcentration,
  spendSpellCastResources,
  startSpellEffectConcentration,
} from "./spells-resolve-resources.ts";
export {
  resolveCompelledNextTurnBehaviorSpellAct,
  resolveAbilityD20TestRollModeSaveGateSpellAct,
  resolvePersistentAreaSaveConditionSpellAct,
  resolveSaveGatedConditionWithRepeatSpellAct,
  resolveSaveGateAttackRollAdvantageSpellAct,
  resolveSaveGateConditionSpellAct,
  resolveSaveGateConditionImmunitySpellAct,
  resolveSaveGateDamageSpellAct,
  resolveStagedSaveConditionSpellAct,
  validateSavingThrowOutcomes,
} from "./spells-resolve-save-gates.ts";
export {
  healingSpellTargetSelection,
  rollModifierSpellAffectedTargets,
  rollModifierSpellEffectSelection,
  rollModifierSpellTargetSelection,
  scalarBuffSpellTargetSelection,
  type HealingSpellTargetSelection,
  type RollModifierSpellAffectedTargets,
  type RollModifierSpellEffectSelection,
  type RollModifierSpellTargetSelection,
  type ScalarBuffSpellTargetSelection,
} from "./spells-resolve-target-selection.ts";

import { reactionSpellTargetFactsForAfterDamage } from "./reaction-triggered-spells.ts";
import {
  battleStateAfterTargetActionEarlyEndForActor,
  targetingSaveInterdictionCheck,
  targetChoiceFillAfterAttackRedirectionWardAttackRollReplacement,
} from "./targeting-save-interdiction.ts";
import {
  spellCastInterruptFrame,
  spellCastMetamagicApplicationsInput,
} from "./spell-cast-interrupt-frame.ts";
import {
  fillsAfterTurnConstraintSomaticSpellFailureOutcome,
  resolveSaveGatedTurnConstraintSomaticSpellFailure,
} from "./save-gated-turn-constraint-runtime.ts";
import { parseWeaponAttackOverrideFillInput } from "./weapon-attack-override-fill-input.ts";

import { spellFillSet, type SpellFillSet } from "./spells-resolve-fill-set.ts";

import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
import { resolveReadySpellAct } from "./spells-resolve-release.ts";
import {
  resolveDirectCastObjectTarget,
  stateAfterResolvedHeldLightHurl,
} from "./spells-resolve-object-target.ts";
import type { SpellProcedureProfileResolveInput } from "./spell-procedure-profiles/execution-profile.ts";
import { clearPendingAttackRollMissToHitReplacementSelection } from "./statblock-attacks.ts";

// These procedures carry their own Bonus Action cost. Magic-action procedures
// stay outside this set and enter this lane only through the Quickened rewrite.
const NATIVE_BONUS_ACTION_SPELL_PROCEDURES = [
  "heldLight",
  "movableLightManifestation",
  "objectContactDamageRepeat",
  "spatialMeleeSpellAttackProxy",
  "spellCreatedHeldObject",
  "spellCreatedHeldObjectReEvoke",
  "scalarBuff",
  "directCondition",
  "rollModifier",
  "saveGatedCondition",
  "saveGatedConditionImmunity",
  "weaponDamageRider",
  "weaponAttackOverride",
  "weaponAttackDamageEnhancement",
  "markedDamageRider",
  "fixedCostMovementReplacement",
  "grantedAreaSaveDamageAction",
  "selfTeleport",
  "targetingSaveInterdiction",
  "directConditionRemoval",
  "directHitPointRestoration",
] as const satisfies ReadonlyArray<SupportedSpellInvocation["procedure"]>;
type NativeBonusActionSpellProcedure =
  (typeof NATIVE_BONUS_ACTION_SPELL_PROCEDURES)[number];
const NATIVE_BONUS_ACTION_SPELL_PROCEDURE_SET: ReadonlySet<
  SupportedSpellInvocation["procedure"]
> = new Set(NATIVE_BONUS_ACTION_SPELL_PROCEDURES);

type ProfileDelegatedSpellAttackDamageInvocation = Extract<
  SupportedSpellInvocation,
  {
    readonly procedure: SpellProcedureWithProfileDelegatedSpellAttackDamageBody;
  }
>;

type DirectSpellAttackDamageInvocation = Extract<
  BattleExecutableSpellInvocation,
  {
    readonly procedure: SpellProcedureWithDirectSpellAttackDamageBody;
  }
>;
type ProfileDelegatedSpellAttackDamageExecution = Extract<
  BattleExecutableSpellInvocation,
  {
    readonly procedure: SpellProcedureWithProfileDelegatedSpellAttackDamageBody;
  }
>;
type SharedSpellAttackDamageInvocation =
  | DirectSpellAttackDamageInvocation
  | ProfileDelegatedSpellAttackDamageExecution;

type ResolveSpellActInternalOptions =
  | {
      readonly kind: "registeredProcedure";
      readonly actionCostOverride?: never;
      readonly metamagicApplications?: never;
    }
  | {
      readonly kind: "sharedSpellAttackDamage";
      readonly actionCostOverride?: SpellProcedureActionCostOverride;
      readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
    }
  | {
      readonly kind: "bonusActionSpellAttackProxy";
      readonly actionCostOverride?: never;
      readonly metamagicApplications?: never;
    };

type SpellDamageAttackOutcome =
  | { readonly tag: "spellAttackMissWithDamage" }
  | {
      readonly tag: "spellAttackHit";
      readonly critical: boolean;
      readonly markedDamageRiders: readonly SpellMarkedDamageRider[];
    };

type SpellDamageResolutionContext = {
  readonly tag: "damageContext";
  readonly spellResolutionState: BattleState;
  readonly metamagicApplicationsForDamageAndSpend:
    | readonly SpellMetamagicApplicationFact[]
    | undefined;
  readonly damageRoll: NonNullable<
    Extract<SpellFillSet, { readonly tag: "ok" }>["damageRoll"]
  >;
  readonly attackOutcome: SpellDamageAttackOutcome;
};

type SpellActInternalInput =
  | ActionSpellBattleResolutionInput
  | BonusActionSpellBattleResolutionInput;

type InitialSpellAttackRollResolution =
  | {
      readonly tag: "admitted";
      readonly actor: BattleCreatureState | undefined;
      readonly attackRoll: BattleAttackRollResult;
      readonly requiredRollMode: ReturnType<typeof requiredSpellAttackRollMode>;
    }
  | { readonly tag: "result"; readonly result: BattleResolutionResult };

function resolveInitialSpellAttackRoll(input: {
  readonly castingState: BattleState;
  readonly errorState: BattleState;
  readonly subject: SpellActInternalInput["subject"];
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly invocation: Parameters<typeof spellAttackRollHole>[2];
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): InitialSpellAttackRollResolution {
  const requiredRollMode = requiredSpellAttackRollMode(
    input.castingState,
    input.actorId,
    input.targetId,
    input.invocation,
    input.fillSet.targetSpatialFacts,
  );
  if (input.fillSet.attackRoll == null) {
    return {
      tag: "result",
      result: needsHolesResult(input.castingState, input.subject, [
        spellAttackRollHole(
          input.castingState,
          input.actorId,
          input.invocation,
          requiredRollMode,
        ),
      ]),
    };
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!attackRollResultIsValid(input.fillSet.attackRoll)) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return {
      tag: "result",
      result: invalidResult(
        input.errorState,
        "invalidFill",
        "Spell attack roll result is outside the d20 attack-roll protocol.",
      ),
    };
  }
  if (!attackRollModeMatches(input.fillSet.attackRoll, requiredRollMode)) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return {
      tag: "result",
      result: invalidResult(
        input.errorState,
        "invalidFill",
        "Spell attack roll mode does not match the current attack-roll rule.",
      ),
    };
  }
  /* v8 ignore stop -- @preserve */
  const actor = input.castingState.combatants.get(input.actorId);
  if (
    d20TestNaturalOneRerollRollDecisionRequired({
      actor,
      originalNaturalD20: Number(input.fillSet.attackRoll.naturalD20),
      rollMode: input.fillSet.attackRoll.rollMode,
      rolledD20s: input.fillSet.attackRoll.rolledD20s,
      decision: input.fillSet.attackRoll.d20TestNaturalOneReroll,
    })
  ) {
    return {
      tag: "result",
      result: needsHolesResult(input.castingState, input.subject, [
        attackRollHoleWithD20TestNaturalOneRerollOption(
          spellAttackRollHole(
            input.castingState,
            input.actorId,
            input.invocation,
            requiredRollMode,
          ),
        ),
      ]),
    };
  }
  const naturalOneRerollIssue = d20TestNaturalOneRerollRollIssue({
    actor,
    total: input.fillSet.attackRoll.total,
    originalNaturalD20: Number(input.fillSet.attackRoll.naturalD20),
    rollMode: input.fillSet.attackRoll.rollMode,
    rolledD20s: input.fillSet.attackRoll.rolledD20s,
    decision: input.fillSet.attackRoll.d20TestNaturalOneReroll,
    requiredRollMode,
    otherD20RerollPresent:
      input.fillSet.attackRoll.spellAttackReroll !== undefined,
  });
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (naturalOneRerollIssue !== null) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return {
      tag: "result",
      result: invalidResult(
        input.errorState,
        "invalidFill",
        naturalOneRerollIssue,
      ),
    };
  }
  /* v8 ignore stop -- @preserve */
  return {
    tag: "admitted",
    actor,
    attackRoll: input.fillSet.attackRoll,
    requiredRollMode,
  };
}

type SpellInvocationResolutionAdmission =
  | {
      readonly tag: "ok";
      readonly invocation: BattleSpellProcedureExecution;
      readonly applications: readonly SpellMetamagicApplicationFact[];
    }
  | {
      readonly tag: "unavailable";
    }
  | {
      readonly tag: "spellMetamagicAdmissionIssue";
      readonly message: string;
    };

function admitSpellInvocationForResolution(input: {
  readonly state: BattleState;
  readonly actor: CharacterBattleCreatureState;
  readonly subject:
    | ActionSpellBattleResolutionInput["subject"]
    | BonusActionSpellBattleResolutionInput["subject"];
  readonly invocation: BattleSpellProcedureExecution | undefined;
}): SpellInvocationResolutionAdmission {
  if (input.invocation === undefined) {
    return { tag: "unavailable" };
  }
  const metamagicAdmission = admitSpellMetamagicApplications({
    state: input.state,
    actor: input.actor,
    actorId: input.subject.actorId,
    invocation: input.invocation,
    subject: input.subject,
  });
  return metamagicAdmission.tag === "ok"
    ? {
        tag: "ok",
        invocation: twinnedSpellTargetCountInvocation(
          input.invocation,
          metamagicAdmission.applications,
        ),
        applications: metamagicAdmission.applications,
      }
    : metamagicAdmission;
}

type SpellActLane =
  | {
      readonly tag: "action";
      readonly input: ActionSpellBattleResolutionInput;
    }
  | {
      readonly tag: "bonusAction";
      readonly input: BonusActionSpellBattleResolutionInput;
    };

function actionSpellLane(
  input: ActionSpellBattleResolutionInput,
): SpellActLane {
  return { tag: "action", input };
}

function bonusActionSpellLane(
  input: BonusActionSpellBattleResolutionInput,
): SpellActLane {
  return { tag: "bonusAction", input };
}

function spellActLane(input: SpellActInternalInput): SpellActLane {
  return Match.value(input.subject).pipe(
    Match.discriminatorsExhaustive("tag")({
      actionSpell: (subject) => actionSpellLane({ ...input, subject }),
      bonusActionSpell: (subject) =>
        bonusActionSpellLane({ ...input, subject }),
    }),
  );
}

type SpellProcedureActionCostOverride = "magicAction" | "bonusAction";

type SpellProcedureResolveInputFor<Procedure extends RegisteredSpellProcedure> =
  Parameters<RegisteredSpellProcedureExecution<Procedure>["resolve"]>[0];

type SpellProcedureResolveDispatchInput = {
  readonly [Procedure in RegisteredSpellProcedure]: {
    readonly procedure: Procedure;
    readonly resolution: SpellProcedureResolveInputFor<Procedure>;
  };
}[RegisteredSpellProcedure];

function spellProcedureResolveDispatchInput<
  Procedure extends RegisteredSpellProcedure,
>(
  procedure: Procedure,
  resolution: SpellProcedureResolveInputFor<Procedure>,
): {
  readonly procedure: Procedure;
  readonly resolution: SpellProcedureResolveInputFor<Procedure>;
} {
  return { procedure, resolution };
}

function resolveRegisteredSpellProcedureExecution(
  executionRegistry: SpellProcedureExecutionRegistry,
  input: SpellProcedureResolveDispatchInput,
): BattleResolutionResult {
  return executionRegistry
    .executionFor(input.procedure)
    .resolve(input.resolution);
}

function actionSpellProfileResolutionInput(
  input: ActionSpellBattleResolutionInput,
  castingState: BattleState,
  _invocation: Exclude<
    ActionSpellProfileInvocation,
    { readonly procedure: "persistentArmorEffect" }
  >,
): ActionSpellBattleResolutionInput & { readonly castingState?: BattleState } {
  void _invocation;
  return { ...input, state: castingState };
}

type OrdinaryProfileInvocation = Exclude<
  BattleSpellProcedureExecution,
  { readonly procedure: "chainedSpellAttackDamage" }
>;

type OrdinaryProfileProcedure = OrdinaryProfileInvocation["procedure"];

type ProcedureAcceptingResolutionInput<Input> = {
  [Procedure in OrdinaryProfileProcedure]: Extract<
    SpellProcedureResolutionInput<Procedure>,
    Input
  > extends never
    ? never
    : Procedure;
}[OrdinaryProfileProcedure];

type BonusActionSpellProfileInvocation = Extract<
  OrdinaryProfileInvocation,
  {
    readonly procedure: ProcedureAcceptingResolutionInput<BonusActionSpellBattleResolutionInput>;
  }
>;

type ActionSpellProfileInvocation = Extract<
  OrdinaryProfileInvocation,
  {
    readonly procedure: ProcedureAcceptingResolutionInput<ActionSpellBattleResolutionInput>;
  }
>;

type OrdinaryBonusActionSpellProfileInvocation = Exclude<
  BonusActionSpellProfileInvocation,
  { readonly procedure: "weaponAttackOverride" }
>;

function invocationUsesActionSpellProfileResolution(
  invocation: BattleSpellProcedureExecution,
): invocation is ActionSpellProfileInvocation {
  return spellExecutionFacts(invocation).kind === "actionSpell";
}

function invocationUsesBonusActionSpellProfileResolution(
  invocation: BattleSpellProcedureExecution,
): invocation is BonusActionSpellProfileInvocation {
  return (
    spellExecutionFacts(invocation).kind === "bonusActionSpell" ||
    spellProcedureHasQuickenedActionCostRewrite(invocation.procedure)
  );
}

type SpellProcedureResolutionOptions = {
  readonly actionCostOverride?: SpellProcedureActionCostOverride;
  readonly metamagicApplications: readonly SpellMetamagicApplicationFact[];
};

function spellProcedureActionCostResolutionOption(
  procedure: SpellProcedureAcceptingActionCostOverride,
  actionCostOverride: SpellProcedureActionCostOverride | undefined,
): { readonly actionCostOverride?: SpellProcedureActionCostOverride };
function spellProcedureActionCostResolutionOption(
  procedure: Exclude<
    RegisteredSpellProcedure,
    SpellProcedureAcceptingActionCostOverride
  >,
  actionCostOverride: SpellProcedureActionCostOverride | undefined,
): { readonly actionCostOverride?: never };
function spellProcedureActionCostResolutionOption(
  procedure: RegisteredSpellProcedure,
  actionCostOverride: SpellProcedureActionCostOverride | undefined,
): { readonly actionCostOverride?: SpellProcedureActionCostOverride } {
  return actionCostOverride === undefined ||
    !spellProcedureAcceptsActionCostOverride(procedure)
    ? {}
    : { actionCostOverride };
}

function actionSpellProcedureResolveDispatchInput(
  input: ActionSpellBattleResolutionInput,
  castingState: BattleState,
  actorId: CombatantId,
  invocation: ActionSpellProfileInvocation,
  fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>,
  resolutionOptions: SpellProcedureResolutionOptions,
): SpellProcedureResolveDispatchInput {
  return Match.value(invocation).pipe(
    Match.discriminatorsExhaustive("procedure")({
      damageReduction: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      rollModifier: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      makeStable: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      heldLightHurl: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      objectLight: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      temporaryAbilityCheckRollMode: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      perceptionGatedAttackRollDefense: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      seeInvisibleObserverSight: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      duplicateHitInterception: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      persistentArmorEffect: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: { ...input, castingState },
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      linkedDefenseResistanceDamageShare: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      creatureTypeProtection: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      conditionRemovalProtection: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      chosenDamageResistance: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      compositeTargetBuffWithAftermath: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      directCondition: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      conditionImmunityAndTurnStartTemporaryHitPoints: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      creatureSizeIncrease: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      creatureSizeDecrease: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      controlledVerticalSuspension: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      scalarBuff: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      directHitPointRestoration: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      selfTransformationMode: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      spellHostedWeaponAttack: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      saveGatedDamage: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      saveGatedCondition: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      saveGatedConditionImmunity: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      saveGatedAttackRollAdvantage: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      abilityD20TestRollModeSaveGate: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      saveGatedTurnConstraintBundle: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      saveGatedConditionWithRepeat: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      saveGatedAreaControl: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      stagedSaveCondition: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      persistentAreaSaveCondition: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      directionalPersistentArea: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      persistentAreaSaveDamage: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      persistentAreaTrait: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      areaMovementDistanceDamage: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      persistentAreaSaveConditionEscape: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      persistentAreaSaveComposite: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      magicalDarknessPointOrigin: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      magicSuppressionEmanation: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      compelledNextTurnBehavior: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      spellAttackDamage: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      spellAttackSequence: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      spellCreatedHeldObjectAttack: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      objectContactDamage: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      ongoingSpellEnd: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      attackBurstSaveDamage: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      repeatedDamageAllocation: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      movableLightManifestation: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: actionSpellProfileResolutionInput(input, castingState, value),
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
    }),
  );
}

function bonusActionSpellProcedureResolveDispatchInput(
  input: BonusActionSpellBattleResolutionInput,
  castingState: BattleState,
  actorId: CombatantId,
  invocation: OrdinaryBonusActionSpellProfileInvocation,
  fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>,
  resolutionOptions: SpellProcedureResolutionOptions,
): SpellProcedureResolveDispatchInput {
  return Match.value(invocation).pipe(
    Match.discriminatorsExhaustive("procedure")({
      rollModifier: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: { ...input, state: castingState },
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      heldLight: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: { ...input, state: castingState },
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      weaponAttackDamageEnhancement: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: { ...input, state: castingState },
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      directCondition: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: { ...input, state: castingState },
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      creatureSizeIncrease: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: { ...input, state: castingState },
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      creatureSizeDecrease: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: { ...input, state: castingState },
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      directConditionRemoval: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: { ...input, state: castingState },
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      scalarBuff: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: { ...input, state: castingState },
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      directHitPointRestoration: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: { ...input, state: castingState },
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      fixedCostMovementReplacement: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: { ...input, state: castingState },
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      selfTeleport: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: { ...input, state: castingState },
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      grantedAreaSaveDamageAction: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: { ...input, state: castingState },
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      targetingSaveInterdiction: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: { ...input, state: castingState },
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      markedDamageRider: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: { ...input, state: castingState },
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      weaponDamageRider: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: { ...input, state: castingState },
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      saveGatedDamage: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: { ...input, state: castingState },
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      saveGatedCondition: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: { ...input, state: castingState },
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      saveGatedConditionImmunity: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: { ...input, state: castingState },
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      spellAttackDamage: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: { ...input, state: castingState },
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      spellAttackSequence: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: { ...input, state: castingState },
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
          metamagicApplications: resolutionOptions.metamagicApplications,
        }),
      spellCreatedHeldObject: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: { ...input, state: castingState },
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      spellCreatedHeldObjectReEvoke: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: { ...input, state: castingState },
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      spatialMeleeSpellAttackProxy: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: { ...input, state: castingState },
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      objectContactDamageRepeat: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: { ...input, state: castingState },
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
      movableLightManifestation: (value) =>
        spellProcedureResolveDispatchInput(value.procedure, {
          input: { ...input, state: castingState },
          actorId,
          invocation: value,
          fillSet,
          ...spellProcedureActionCostResolutionOption(
            value.procedure,
            resolutionOptions.actionCostOverride,
          ),
        }),
    }),
  );
}

function isDirectSpellAttackDamageInvocation(
  invocation: BattleExecutableSpellInvocation,
): invocation is DirectSpellAttackDamageInvocation {
  return spellProcedureUsesDirectSpellAttackDamageBody(invocation.procedure);
}

function isProfileDelegatedSpellAttackDamageExecution(
  invocation: BattleExecutableSpellInvocation,
): invocation is ProfileDelegatedSpellAttackDamageExecution {
  return spellProcedureUsesProfileDelegatedSpellAttackDamageBody(
    invocation.procedure,
  );
}

function sharedSpellAttackDamageInvocationFor(
  invocation: BattleExecutableSpellInvocation,
  options: ResolveSpellActInternalOptions,
): SharedSpellAttackDamageInvocation | undefined {
  if (isDirectSpellAttackDamageInvocation(invocation)) {
    return invocation;
  }
  return options.kind === "sharedSpellAttackDamage" &&
    isProfileDelegatedSpellAttackDamageExecution(invocation)
    ? invocation
    : undefined;
}

function isSupportedDamageSpellInvocation<
  I extends SharedSpellAttackDamageInvocation,
>(invocation: I): invocation is I & RuntimeDamageSpellProcedure {
  return (
    invocation.procedure !== "spellAttackDamage" ||
    spellAttackDamagePayloadIsResolved(invocation.damage)
  );
}

function potentCantripAppliesToMissedSpellAttack(input: {
  readonly actor: BattleCreatureState | undefined;
  readonly invocation: BattleExecutableSpellInvocation;
  readonly target: BattleCreatureState;
}): boolean {
  if (
    input.actor?.origin.kind !== "character" ||
    input.invocation.procedure !== "spellAttackDamage" ||
    input.invocation.resource.tag !== "none" ||
    !isCantripSpellAccess(input.invocation.access) ||
    !isSupportedDamageSpellInvocation(input.invocation)
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
        "missWithAttackRoll",
      ) &&
      procedure.execution.potentCantrip.damage === "halfCantripDamageIfAny" &&
      procedure.execution.potentCantrip.additionalEffect === "none",
  );
}

function spellAttackPostDuplicateHitInterceptionFillsArePresent(
  fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>,
): boolean {
  return (
    fillSet.damageRoll !== undefined ||
    fillSet.damageDispositions.length > 0 ||
    fillSet.spellDamageReductionRolls.length > 0 ||
    fillSet.concentrationSavingThrows.length > 0 ||
    fillSet.saveGatedConditionWithRepeatDamageRepeatSaves.length > 0 ||
    fillSet.attackBurstDamageRoll !== undefined ||
    fillSet.remarkableAthleteCriticalHitMovementDecision !== undefined ||
    fillSet.remarkableAthleteCriticalHitMovement !== undefined
  );
}

function effectiveSpellAttackRoll(
  attackRoll: BattleAttackRollResult,
): BattleAttackRollResult {
  const naturalOneEffectiveRoll =
    effectiveD20TestNaturalOneRerollAttackRoll(attackRoll);
  return naturalOneEffectiveRoll.spellAttackReroll?.kind === "reroll"
    ? {
        ...naturalOneEffectiveRoll.spellAttackReroll.replacement,
        ...(naturalOneEffectiveRoll.activatedOngoingFeatureProcedureRef ===
        undefined
          ? {}
          : {
              activatedOngoingFeatureProcedureRef:
                naturalOneEffectiveRoll.activatedOngoingFeatureProcedureRef,
            }),
        ...(naturalOneEffectiveRoll.missToHitReplacementProcedureRef ===
        undefined
          ? {}
          : {
              missToHitReplacementProcedureRef:
                naturalOneEffectiveRoll.missToHitReplacementProcedureRef,
            }),
      }
    : naturalOneEffectiveRoll;
}

/* v8 ignore start -- @preserve -- Malformed Seeking Spell decision: discovery offers reroll or decline only for an eligible missed single spell attack with compatible Metamagic, replacement, and roll-mode facts. */
function spellAttackRerollValidationIssue(input: {
  readonly actor: BattleCreatureState | undefined;
  readonly invocation: BattleExecutableSpellInvocation;
  readonly originalAttackRoll: BattleAttackRollResult;
  readonly originalHit: boolean;
  readonly requiredRollMode: ReturnType<typeof requiredSpellAttackRollMode>;
  readonly castMetamagicApplications: readonly SpellMetamagicApplicationFact[];
}): string | null {
  const decision = input.originalAttackRoll.spellAttackReroll;
  if (decision === undefined) {
    return null;
  }
  if (input.invocation.procedure !== "spellAttackDamage") {
    return "Seeking Spell is supported only for the promoted single spell attack damage procedure.";
  }
  if (input.originalAttackRoll.missToHitReplacementProcedureRef !== undefined) {
    return "A spell attack reroll cannot be combined with an attack-roll miss-to-hit replacement.";
  }
  if (input.originalHit) {
    return "Seeking Spell can reroll only a missed spell attack roll.";
  }
  const application = seekingSpellRerollApplicationForAttackRoll({
    actor: input.actor,
    attackRoll: input.originalAttackRoll,
    castApplications: input.castMetamagicApplications,
  });
  if (typeof application === "string") {
    return application;
  }
  if (decision.kind === "decline") {
    return null;
  }
  if (!attackRollResultIsValid(decision.replacement)) {
    return "Seeking Spell replacement roll is outside the d20 attack-roll protocol.";
  }
  return attackRollModeMatches(decision.replacement, input.requiredRollMode)
    ? null
    : "Seeking Spell replacement roll mode does not match the current attack-roll rule.";
}
/* v8 ignore stop -- @preserve */

function spellAttackNeedsSeekingRerollDecision(input: {
  readonly actor: BattleCreatureState | undefined;
  readonly invocation: BattleExecutableSpellInvocation;
  readonly attackRoll: BattleAttackRollResult;
  readonly originalHit: boolean;
  readonly castMetamagicApplications: readonly SpellMetamagicApplicationFact[];
}): boolean {
  const seekingApplication = seekingSpellMetamagicApplication(input.actor);
  return (
    input.invocation.procedure === "spellAttackDamage" &&
    !input.originalHit &&
    input.attackRoll.spellAttackReroll === undefined &&
    seekingApplication !== null &&
    seekingSpellCombinedUseIssue({
      actor: input.actor,
      castApplications: input.castMetamagicApplications,
      seekingApplication: seekingApplication,
    }) === null
  );
}

function spellAttackRollHoleWithSeekingOption(
  state: BattleState,
  attackerId: CombatantId,
  invocation: Extract<
    BattleExecutableSpellInvocation,
    {
      readonly procedure:
        | "attackBurstSaveDamage"
        | "heldLightHurl"
        | "spellCreatedHeldObjectAttack"
        | "spatialMeleeSpellAttackProxy"
        | "spellAttackDamage";
    }
  >,
  rollMode: ReturnType<typeof requiredSpellAttackRollMode>,
): ReturnType<typeof spellAttackRollHole> {
  const actor = state.combatants.get(attackerId);
  const seeking = seekingSpellAttackRerollOption({ actor });
  const hole = spellAttackRollHole(state, attackerId, invocation, rollMode);
  return seeking === null ? hole : { ...hole, spellAttackRerolls: [seeking] };
}

function spellDamageHoleWithEmpoweredOption(
  state: BattleState,
  attackerId: CombatantId,
  invocation: RuntimeExecutableDamageSpellProcedure,
  critical: boolean,
  castApplications: readonly SpellMetamagicApplicationFact[],
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [],
): ReturnType<typeof spellDamageHole> {
  const hole = spellDamageHole(invocation, critical, spellMarkedDamageRiders);
  if (
    invocation.procedure !== "spellAttackDamage" ||
    spellMarkedDamageRiders.length > 0
  ) {
    return hole;
  }
  const actor = state.combatants.get(attackerId);
  const empowered = empoweredSpellDamageRerollOption({
    actor,
    castApplications,
  });
  return empowered === null
    ? hole
    : { ...hole, spellDamageRerolls: [empowered] };
}

export function resolveSpellAct(
  input: AdmittedActionSpellBattleResolutionInput,
  executionRegistry: SpellProcedureExecutionRegistry,
): BattleResolutionResult {
  return resolveSpellActInternal(input, executionRegistry, {
    kind: "registeredProcedure",
  });
}

export function resolveSpellAttackDamageAct(
  input: SpellProcedureProfileResolveInput<ProfileDelegatedSpellAttackDamageInvocation>,
  executionRegistry: SpellProcedureExecutionRegistry,
): BattleResolutionResult {
  return resolveSpellActInternal(input.input, executionRegistry, {
    kind: "sharedSpellAttackDamage",
    ...optionalProperty("actionCostOverride", input.actionCostOverride),
    ...optionalProperty("metamagicApplications", input.metamagicApplications),
  });
}

function resolveSpellActInternal(
  unresolvedInput: SpellActInternalInput,
  executionRegistry: SpellProcedureExecutionRegistry,
  options: ResolveSpellActInternalOptions,
): BattleResolutionResult {
  const lane = spellActLane(unresolvedInput);
  const input = lane.input;
  const subject = input.subject;
  const actor = input.state.combatants.get(subject.actorId);
  if (!isCharacterBattleCreatureState(actor)) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Action-time spell act requires a supported prepared spell or cantrip.",
    );
  }
  const selectedProcedureInvocation = Match.value(subject).pipe(
    Match.discriminatorsExhaustive("tag")({
      actionSpell: (actionSubject) =>
        supportedActionSpellInvocationForSubject(actor, actionSubject),
      bonusActionSpell: (bonusActionSubject) =>
        supportedBonusActionSpellInvocationForSubject(
          actor,
          bonusActionSubject,
        ),
    }),
  );
  const boundInvocation = characterSpellProcedure(
    actor.origin.execution,
    subject.procedureRef,
    actor,
  );
  const invocationCandidate =
    selectedProcedureInvocation ??
    (options.kind === "bonusActionSpellAttackProxy" &&
    boundInvocation !== undefined &&
    invocationRefHasAntimagicSuppressedRepeatResolverGuard(
      boundInvocation.procedure,
    )
      ? boundInvocation
      : undefined);
  const invocationAdmission = admitSpellInvocationForResolution({
    state: input.state,
    actor,
    subject,
    invocation: invocationCandidate,
  });
  if (invocationAdmission.tag === "unavailable") {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Action-time spell act requires a supported prepared spell or cantrip.",
    );
  }
  if (invocationAdmission.tag === "spellMetamagicAdmissionIssue") {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      invocationAdmission.message,
    );
  }
  const invocation = invocationAdmission.invocation;
  const spatialProxyCommitAlreadyApplied =
    spatialMeleeSpellAttackProxyResolutionCommitAlreadyApplied({
      actorId: subject.actorId,
      invocation,
      handledInterruptTrigger: input.handledInterruptTrigger,
      checkpoint: input.spatialMeleeSpellAttackProxyCommitCheckpoint,
    });
  if (
    !spatialProxyCommitAlreadyApplied &&
    !spellHasAvailableSpend(actor, invocation)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Action-time spell act no longer has its required runtime spell resource.",
    );
  }
  if (
    !(
      lane.tag === "action" &&
      lane.input.replayingInterruptedProcedure === true &&
      invocation.procedure === "heldLightHurl"
    ) &&
    !spatialProxyCommitAlreadyApplied &&
    !spellInvocationCasterPrerequisiteIsMet(actor, invocation)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Action-time spell act requires its active caster spell effect.",
    );
  }
  if (
    !spatialProxyCommitAlreadyApplied &&
    spellInvocationIsSpellcasting(invocation) &&
    activeOngoingFeaturesPreventSpellInvocation(input.state, actor, invocation)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Action-time spell act is unavailable while an active ongoing feature prevents spellcasting.",
    );
  }
  if (
    !spatialProxyCommitAlreadyApplied &&
    invocation.procedure === "spatialMeleeSpellAttackProxy" &&
    invocation.operation === "repositionAndAttack" &&
    ongoingSpellEffectSuppressedByMagicSuppressionEmanation(
      input.state,
      magicSuppressionOngoingSpellEffectRefForActiveEffect(
        invocation.activeEffect,
      ),
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "spatial melee spell-attack proxy repeat attack is suppressed by magic-suppression emanation.",
    );
  }
  if (
    subject.mode.tag === "ready" &&
    (invocation.procedure === "directHitPointRestoration" ||
      invocation.procedure === "heldLightHurl" ||
      invocation.procedure === "objectLight" ||
      invocation.procedure === "ongoingSpellEnd" ||
      invocation.procedure === "spellHostedWeaponAttack" ||
      invocation.procedure === "weaponAttackOverride" ||
      invocation.procedure === "damageReduction" ||
      invocation.procedure === "scalarBuff" ||
      invocation.procedure === "rollModifier" ||
      invocation.procedure === "creatureSizeIncrease" ||
      invocation.procedure === "creatureSizeDecrease" ||
      invocation.procedure === "controlledVerticalSuspension" ||
      invocation.procedure === "linkedDefenseResistanceDamageShare" ||
      invocation.procedure === "temporaryAbilityCheckRollMode" ||
      invocation.procedure === "creatureTypeProtection" ||
      invocation.procedure === "perceptionGatedAttackRollDefense" ||
      invocation.procedure === "seeInvisibleObserverSight" ||
      invocation.procedure === "duplicateHitInterception" ||
      invocation.procedure ===
        "conditionImmunityAndTurnStartTemporaryHitPoints" ||
      invocation.procedure === "afterHitDamage" ||
      invocation.procedure === "afterHitSaveGatedCondition" ||
      invocation.procedure === "afterHitTimedDamageAndSave" ||
      invocation.procedure === "afterHitDamageAndIllumination" ||
      invocation.procedure === "saveGatedCondition" ||
      invocation.procedure === "saveGatedConditionImmunity" ||
      invocation.procedure === "saveGatedAttackRollAdvantage" ||
      invocation.procedure === "saveGatedConditionWithRepeat" ||
      invocation.procedure === "compelledNextTurnBehavior" ||
      invocation.procedure === "persistentAreaTrait" ||
      invocation.procedure === "magicalDarknessPointOrigin" ||
      invocation.procedure === "magicSuppressionEmanation" ||
      invocation.procedure === "persistentAreaSaveConditionEscape" ||
      invocation.procedure === "persistentAreaSaveComposite" ||
      invocation.procedure === "directionalPersistentArea" ||
      invocation.procedure === "persistentAreaSaveDamage" ||
      invocation.procedure === "objectContactDamage" ||
      invocation.procedure === "objectContactDamageRepeat" ||
      invocation.procedure === "spellCreatedHeldObject" ||
      invocation.procedure === "spellCreatedHeldObjectAttack" ||
      invocation.procedure === "spellCreatedHeldObjectReEvoke" ||
      invocation.procedure === "targetingSaveInterdiction" ||
      invocation.procedure === "grantedAreaSaveDamageAction" ||
      invocation.procedure === "compositeTargetBuffWithAftermath" ||
      invocation.procedure === "directConditionRemoval" ||
      invocation.procedure === "directCondition" ||
      invocation.procedure === "spellAttackSequence")
  ) {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "This spell procedure cannot be readied by this runtime lane.",
    );
  }
  if (
    "actionCost" in invocation &&
    invocation.actionCost === "bonusAction" &&
    options.kind !== "bonusActionSpellAttackProxy" &&
    !(
      lane.tag === "action" &&
      lane.input.replayingInterruptedProcedure === true &&
      spatialProxyCommitAlreadyApplied
    )
  ) {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "Prepared Bonus Action spells must use the Bonus Action spell subject.",
    );
  }
  if (isTriggeredReactionSpellInvocation(invocation)) {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "Triggered Reaction spells must use the pending interrupt decision.",
    );
  }
  if (
    !spatialProxyCommitAlreadyApplied &&
    !spellActTurnResourceAvailable(
      input.state.currentTurnResources,
      input.subject.actorId,
      invocation,
      options.actionCostOverride === undefined
        ? undefined
        : { actionCostOverride: options.actionCostOverride },
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }

  const castingState =
    spellInvocationIsSpellcasting(invocation) &&
    invocation.spellRuleFacts.components.verbal
      ? revealHidden(input.state, subject.actorId)
      : input.state;
  const turnConstraintSomaticSpellFailure =
    resolveSaveGatedTurnConstraintSomaticSpellFailure({
      state: input.state,
      castingState,
      subject,
      actorId: subject.actorId,
      invocation,
      fills: input.fills,
      ...optionalProperty("actionCostOverride", options.actionCostOverride),
      metamagicApplications: invocationAdmission.applications,
    });
  if (turnConstraintSomaticSpellFailure.tag !== "continue") {
    return turnConstraintSomaticSpellFailure;
  }
  if (lane.tag === "action") {
    const actionSubject = lane.input.subject;
    if (actionSubject.mode.tag === "ready") {
      if (!isReadiedSpellInvocation(invocation)) {
        return invalidResult(
          input.state,
          "unsupportedSubject",
          "This spell procedure cannot be readied by this runtime lane.",
        );
      }
      return resolveReadySpellAct(
        {
          ...lane.input,
          state: castingState,
          subject: {
            ...actionSubject,
            mode: actionSubject.mode,
          },
        },
        invocation,
      );
    }
  }

  if (invocation.procedure === "chainedSpellAttackDamage") {
    /* v8 ignore start -- @preserve -- Chained spell invocation admission exposes this profile only through the Action subject lane. */
    if (lane.tag !== "action") {
      return invalidResult(
        input.state,
        "unsupportedSubject",
        "Chained spell attacks require the Action spell resolution lane.",
      );
    }
    /* v8 ignore stop -- @preserve */
    const fillSet = parseChainedSpellFillSet(
      input.fills,
      invocation,
      subject.actorId,
      input.state,
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fillSet.tag === "invalid") {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(input.state, "invalidFill", fillSet.message);
    }
    /* v8 ignore stop -- @preserve */
    return resolveRegisteredSpellProcedureExecution(
      executionRegistry,
      spellProcedureResolveDispatchInput(invocation.procedure, {
        input: { ...lane.input, state: castingState },
        actorId: subject.actorId,
        invocation,
        fillSet,
        metamagicApplications: invocationAdmission.applications,
      }),
    );
  }

  const fillSet = spellFillSet(
    input.fills,
    invocation,
    invocation.sourceProcedureRef,
    subject.actorId,
    input.state,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  /* v8 ignore stop -- @preserve */
  const sharedInvocation = sharedSpellAttackDamageInvocationFor(
    invocation,
    options,
  );
  if (sharedInvocation === undefined) {
    /* v8 ignore start -- @preserve -- Registered non-shared spell profiles are admitted only from an Action subject; the Bonus Action proxy is narrowed to shared attack damage above. */
    if (lane.tag !== "action") {
      return invalidResult(
        input.state,
        "unsupportedSubject",
        "This spell procedure does not use the Bonus Action spell resolution lane.",
      );
    }
    /* v8 ignore stop -- @preserve */
    /* v8 ignore start -- @preserve -- The registered profile resolution input is selected from the Action subject's procedure facts, which carry this action-profile support fact. */
    if (!invocationUsesActionSpellProfileResolution(invocation)) {
      return invalidResult(
        input.state,
        "unsupportedSubject",
        "This spell procedure does not use the Action spell resolution lane.",
      );
    }
    /* v8 ignore stop -- @preserve */
    return resolveRegisteredSpellProcedureExecution(
      executionRegistry,
      actionSpellProcedureResolveDispatchInput(
        lane.input,
        castingState,
        subject.actorId,
        invocation,
        fillSet,
        spellProcedureAcceptsMetamagicApplications(invocation.procedure)
          ? { metamagicApplications: invocationAdmission.applications }
          : { metamagicApplications: [] },
      ),
    );
  }

  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.targetId !== undefined && fillSet.objectTarget !== undefined) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Spell target must choose either one combatant or one object, not both.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    fillSet.targetList !== undefined ||
    fillSet.savingThrowOutcomes !== undefined ||
    fillSet.skillChoice !== undefined ||
    fillSet.targetAbilityChoices !== undefined
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Spell attack damage spells use target, attack-roll, and damage fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const selectedInvocation = selectedSpellAttackDamageProcedure(
    sharedInvocation,
    fillSet.damageTypeChoice,
  );
  if (selectedInvocation.tag === "needsHoles") {
    return needsHolesResult(castingState, input.subject, [
      selectedInvocation.hole,
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (selectedInvocation.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      selectedInvocation.message,
    );
  }
  /* v8 ignore stop -- @preserve */
  const invocationForResolution = selectedInvocation.invocation;
  const metamagicApplicationsForResolution =
    spellProcedureAcceptsMetamagicApplications(invocation.procedure)
      ? invocationAdmission.applications
      : options.metamagicApplications;
  if (
    invocationForResolution.procedure === "spatialMeleeSpellAttackProxy" &&
    fillSet.spatialMeleeSpellAttackProxyPosition === undefined
  ) {
    return needsHolesResult(castingState, input.subject, [
      spatialMeleeSpellAttackProxyPositionHole(invocationForResolution),
    ]);
  }
  const spatialMeleeSpellAttackProxyPosition =
    invocationForResolution.procedure === "spatialMeleeSpellAttackProxy"
      ? fillSet.spatialMeleeSpellAttackProxyPosition
      : undefined;
  const spatialMeleeSpellAttackProxyPositionError =
    spatialMeleeSpellAttackProxyPosition === undefined ||
    invocationForResolution.procedure !== "spatialMeleeSpellAttackProxy"
      ? null
      : spatialMeleeSpellAttackProxyPositionInvalidReason(
          spatialMeleeSpellAttackProxyPosition,
          invocationForResolution,
        );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (spatialMeleeSpellAttackProxyPositionError !== null) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      spatialMeleeSpellAttackProxyPositionError,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (fillSet.targetId == null && fillSet.objectTarget === undefined) {
    return needsHolesResult(castingState, input.subject, [
      spellTargetHole(castingState, subject.actorId, invocationForResolution),
      ...((invocationForResolution.procedure === "heldLightHurl" ||
        invocationForResolution.procedure === "spellAttackDamage") &&
      invocationForResolution.targeting.kind === "singleCreatureOrObject"
        ? [spellObjectTargetHole(invocationForResolution)]
        : []),
    ]);
  }
  const objectTarget = fillSet.objectTarget;
  if (objectTarget !== undefined) {
    /* v8 ignore start -- @preserve -- Object-target spell attack profiles are admitted only through the Action subject lane. */
    if (lane.tag !== "action") {
      return invalidResult(
        input.state,
        "unsupportedSubject",
        "Object-target spell attacks require the Action spell resolution lane.",
      );
    }
    /* v8 ignore stop -- @preserve */
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (
      (invocationForResolution.procedure !== "heldLightHurl" &&
        invocationForResolution.procedure !== "spellAttackDamage") ||
      invocationForResolution.targeting.kind !== "singleCreatureOrObject"
    ) {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        "Object target fill does not match this spell act.",
      );
    }
    /* v8 ignore stop -- @preserve */
    return resolveDirectCastObjectTarget({
      input: { ...lane.input, state: castingState },
      actorId: subject.actorId,
      invocation: invocationForResolution,
      fillSet: { ...fillSet, objectTarget },
      ...optionalProperty("actionCostOverride", options.actionCostOverride),
      ...optionalProperty(
        "metamagicApplications",
        metamagicApplicationsForResolution,
      ),
    });
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.targetId == null) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Spell target fill did not select a target.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const target = input.state.combatants.get(fillSet.targetId);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (target == null) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Spell target must be a combatant within the selected spell's supported range.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const spatialProxyRepeatTargetingError =
    spatialMeleeSpellAttackProxyRepeatTargetingInvalidReason(
      invocationForResolution,
      target.combatantId,
    );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (spatialProxyRepeatTargetingError !== null) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      spatialProxyRepeatTargetingError,
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !spellTargetIsLegal(
      input.state,
      subject.actorId,
      target.combatantId,
      invocationForResolution,
      fillSet.targetSpatialFacts,
      spatialMeleeSpellAttackProxyPosition === undefined
        ? {}
        : {
            spatialMeleeSpellAttackProxyPositionId:
              spatialMeleeSpellAttackProxyPosition.positionId,
          },
    )
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Spell target must be a combatant within the selected spell's supported range.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    spatialMeleeSpellAttackProxyPosition !== undefined &&
    !fillSet.targetSpatialFacts.some(
      (fact) =>
        fact.kind === "spatialMeleeSpellAttackProxyTargetWithinReach" &&
        fact.casterId === subject.actorId &&
        fact.targetId === target.combatantId &&
        fact.sourceProcedureRef ===
          invocationForResolution.sourceProcedureRef &&
        fact.forcePositionId ===
          spatialMeleeSpellAttackProxyPosition.positionId,
    )
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "spatial melee spell-attack proxy target adjacency must match the selected force position.",
    );
  }
  /* v8 ignore stop -- @preserve */

  if (isSupportedDamageSpellInvocation(invocationForResolution)) {
    const interdictionCheck = targetingSaveInterdictionCheck({
      state: castingState,
      triggeringProcedureRef: invocationForResolution.sourceProcedureRef,
      triggeringCombatantId: subject.actorId,
      wardedCombatantId: target.combatantId,
      triggeringTargetEventId: ATTACK_TARGET_HOLE_ID,
      replacementTargetKind: "attackRoll",
      fills: input.fills,
    });
    if (interdictionCheck.tag === "needsHoles") {
      return needsHolesResult(castingState, input.subject, [
        interdictionCheck.hole,
      ]);
    }
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (interdictionCheck.tag === "invalid") {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        interdictionCheck.message,
      );
    }
    /* v8 ignore stop -- @preserve */
    if (interdictionCheck.tag === "lost") {
      return spendSpellActResolutionResources({
        state: stateAfterResolvedHeldLightHurl(
          castingState,
          subject.actorId,
          invocationForResolution,
        ),
        actorId: subject.actorId,
        invocation: invocationForResolution,
        errorState: input.state,
        ...optionalProperty("actionCostOverride", options.actionCostOverride),
        ...optionalProperty(
          "metamagicApplications",
          metamagicApplicationsForResolution,
        ),
        ...optionalProperty(
          "spatialMeleeSpellAttackProxyPosition",
          spatialMeleeSpellAttackProxyPosition,
        ),
      });
    }
    if (interdictionCheck.tag === "newTarget") {
      const replacementTarget = input.state.combatants.get(
        interdictionCheck.targetId,
      );
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        replacementTarget === undefined ||
        !spellTargetIsLegal(
          input.state,
          subject.actorId,
          replacementTarget.combatantId,
          invocationForResolution,
          interdictionCheck.spatialFacts,
          spatialMeleeSpellAttackProxyPosition === undefined
            ? {}
            : {
                spatialMeleeSpellAttackProxyPositionId:
                  spatialMeleeSpellAttackProxyPosition.positionId,
              },
        )
      ) {
        /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
        return invalidResult(
          input.state,
          "invalidFill",
          "attack-redirection ward replacement spell target must be legal for the selected spell.",
        );
      }
      /* v8 ignore stop -- @preserve */
      const originalTargetFill = input.fills.find(
        (
          fill,
        ): fill is Extract<BattleFill, { readonly kind: "targetChoice" }> =>
          fill.kind === "targetChoice" && fill.value === target.combatantId,
      );
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (originalTargetFill === undefined) {
        /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
        return invalidResult(
          input.state,
          "invalidFill",
          "attack-redirection ward replacement requires the original spell target fill.",
        );
      }
      /* v8 ignore stop -- @preserve */
      return resolveSpellActInternal(
        {
          ...input,
          fills: [
            ...input.fills
              .filter(
                (fill) => fill.kind !== "targetingSaveInterdictionOutcome",
              )
              .map((fill) =>
                fill === originalTargetFill
                  ? targetChoiceFillAfterAttackRedirectionWardAttackRollReplacement(
                      {
                        fill,
                        replacement: interdictionCheck,
                      },
                    )
                  : fill,
              ),
          ],
        },
        executionRegistry,
        options,
      );
    }
  }

  const spellCastReactionWindow = spellInvocationIsSpellcasting(
    invocationForResolution,
  )
    ? maybeOpenInterruptWindow(
        castingState,
        spellCastInterruptFrame({
          casterId: subject.actorId,
          invocation: invocationForResolution,
          targetIds: [target.combatantId],
          reactionSpellTargetFacts: fillSet.reactionSpellTargetFacts,
          castingResource: spellCastingTimeResourceForSpellCast({
            invocation: invocationForResolution,
            ...optionalProperty(
              "actionCostOverride",
              options.actionCostOverride,
            ),
          }),
          ...spellCastMetamagicApplicationsInput(
            metamagicApplicationsForResolution ?? [],
          ),
          continuation: spellReplayContinuation(input),
        }),
        input.handledInterruptTrigger,
      )
    : null;
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const spellDamageContext = (():
    | BattleResolutionResult
    | SpellDamageResolutionContext => {
    const initialAttackRoll = resolveInitialSpellAttackRoll({
      castingState,
      errorState: input.state,
      subject: input.subject,
      actorId: subject.actorId,
      targetId: target.combatantId,
      invocation: invocationForResolution,
      fillSet,
    });
    if (initialAttackRoll.tag === "result") {
      return initialAttackRoll.result;
    }
    const requiredRollMode = initialAttackRoll.requiredRollMode;
    const actorBeforeSpellAttack = initialAttackRoll.actor;
    const attackRoll = initialAttackRoll.attackRoll;
    const naturalOneEffectiveAttackRoll =
      effectiveD20TestNaturalOneRerollAttackRoll(attackRoll);
    const originalHit = attackRollHits(
      naturalOneEffectiveAttackRoll,
      currentArmorClass(activeEffectArmorClass(input.state, target)),
    );
    const spellAttackRerollIssue = spellAttackRerollValidationIssue({
      actor: actorBeforeSpellAttack,
      invocation: invocationForResolution,
      originalAttackRoll: naturalOneEffectiveAttackRoll,
      originalHit,
      requiredRollMode,
      castMetamagicApplications: metamagicApplicationsForResolution ?? [],
    });
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (spellAttackRerollIssue !== null) {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(input.state, "invalidFill", spellAttackRerollIssue);
    }
    /* v8 ignore stop -- @preserve */
    if (
      spellAttackNeedsSeekingRerollDecision({
        actor: actorBeforeSpellAttack,
        invocation: invocationForResolution,
        attackRoll: naturalOneEffectiveAttackRoll,
        originalHit,
        castMetamagicApplications: metamagicApplicationsForResolution ?? [],
      })
    ) {
      return needsHolesResult(castingState, input.subject, [
        spellAttackRollHoleWithSeekingOption(
          castingState,
          subject.actorId,
          invocationForResolution,
          requiredRollMode,
        ),
      ]);
    }
    const seekingApplication =
      attackRoll.spellAttackReroll?.kind === "reroll"
        ? seekingSpellRerollApplicationForAttackRoll({
            actor: actorBeforeSpellAttack,
            attackRoll,
            castApplications: metamagicApplicationsForResolution ?? [],
          })
        : null;
    const metamagicApplicationsForDamageAndSpend =
      seekingApplication !== null && typeof seekingApplication !== "string"
        ? [...(metamagicApplicationsForResolution ?? []), seekingApplication]
        : metamagicApplicationsForResolution;
    const effectiveAttackRoll = effectiveSpellAttackRoll(attackRoll);
    const ordinaryHit = attackRollHits(
      effectiveAttackRoll,
      currentArmorClass(activeEffectArmorClass(input.state, target)),
    );
    const missToHitReplacement = selectedAttackRollMissToHitReplacement({
      state: castingState,
      subject: input.subject,
      attackerId: subject.actorId,
      targetId: target.combatantId,
      attackRoll: effectiveAttackRoll,
      ordinaryHit,
    });
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (
      attackRoll.missToHitReplacementProcedureRef !== undefined &&
      missToHitReplacement === null
    ) {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        ordinaryHit
          ? "Attack-roll miss-to-hit replacement can only be selected after a miss."
          : "Attack-roll miss-to-hit replacement is not available for this spell attack roll.",
      );
    }
    /* v8 ignore stop -- @preserve */
    const hit = ordinaryHit || missToHitReplacement !== null;
    const potentCantripMiss =
      !hit &&
      potentCantripAppliesToMissedSpellAttack({
        actor: castingState.combatants.get(subject.actorId),
        invocation: invocationForResolution,
        target,
      });
    const critical = attackRollIsCriticalHit(effectiveAttackRoll);
    const attackRollState = stateAfterSpellAttackRollMadeForInvocation(
      castingState,
      subject.actorId,
      invocationForResolution,
    );
    const attackRolledState = recordAttackRollMissToHitReplacementUsed(
      consumeHelpAttackForAttackRoll(
        recordAttackRollOngoingFeatures(
          attackRollState,
          subject.actorId,
          target.combatantId,
          null,
          fillSet.targetRelationshipFacts,
        ),
        subject.actorId,
        target.combatantId,
      ),
      subject.actorId,
      missToHitReplacement,
      {
        subject: input.subject,
        targetId: target.combatantId,
        attackRoll: effectiveAttackRoll,
      },
    );
    const attackRolledStateAfterHurl = stateAfterResolvedHeldLightHurl(
      attackRolledState,
      subject.actorId,
      invocationForResolution,
    );
    const attackRolledStateWithSpatialMeleeSpellAttackProxyCast = hit
      ? stateAfterSpatialMeleeSpellAttackProxyCastProxyCreatedBeforeImmediateAttack(
          {
            state: attackRolledStateAfterHurl,
            actorId: subject.actorId,
            invocation: invocationForResolution,
            errorState: input.state,
            ...optionalProperty(
              "actionCostOverride",
              options.actionCostOverride,
            ),
            ...(metamagicApplicationsForDamageAndSpend === undefined
              ? {}
              : {
                  metamagicApplications: metamagicApplicationsForDamageAndSpend,
                }),
            ...optionalProperty(
              "spatialMeleeSpellAttackProxyPosition",
              spatialMeleeSpellAttackProxyPosition,
            ),
            commitAlreadyApplied: spatialProxyCommitAlreadyApplied,
          },
        )
      : {
          tag: "resolved" as const,
          state: attackRolledStateAfterHurl,
          snapshot: snapshotBattle(attackRolledStateAfterHurl),
        };
    /* v8 ignore start -- @preserve -- Availability is checked before attack resolution; intervening attack-roll and held-hurl reducers do not spend or remove the slot or Bonus Action, so this defensive resource result is unreachable for an admitted replay. */
    if (
      attackRolledStateWithSpatialMeleeSpellAttackProxyCast.tag !== "resolved"
    ) {
      return attackRolledStateWithSpatialMeleeSpellAttackProxyCast;
    }
    /* v8 ignore stop -- @preserve */
    const attackRolledStateBeforeHitContinuations =
      attackRolledStateWithSpatialMeleeSpellAttackProxyCast.state;
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (!hit && fillSet.duplicateHitInterceptionRoll !== undefined) {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        "duplicate-hit interception duplicate roll is only valid after an attack-roll hit.",
      );
    }
    /* v8 ignore stop -- @preserve */
    if (hit) {
      const duplicateInterceptionAttacker =
        attackRolledStateBeforeHitContinuations.combatants.get(subject.actorId);
      /* v8 ignore start -- @preserve -- Attack-roll state reducers preserve the admitted caster combatant; removal would require a reducer contract change. */
      if (duplicateInterceptionAttacker === undefined) {
        return invalidResult(
          input.state,
          "missingCombatant",
          "Spell attack actor is no longer in this battle.",
        );
      }
      /* v8 ignore stop -- @preserve */
      const duplicateInterceptionCheck = duplicateHitInterceptionCheck({
        state: attackRolledStateBeforeHitContinuations,
        attacker: duplicateInterceptionAttacker,
        target:
          attackRolledStateBeforeHitContinuations.combatants.get(
            target.combatantId,
          ) ?? target,
        targetSpatialFacts: fillSet.targetSpatialFacts,
        triggeringAttackRollHoleId: ATTACK_ROLL_HOLE_ID,
        fill: fillSet.duplicateHitInterceptionRoll,
      });
      if (duplicateInterceptionCheck.tag === "needsHoles") {
        return needsHolesResult(
          attackRolledStateBeforeHitContinuations,
          input.subject,
          [duplicateInterceptionCheck.hole],
        );
      }
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (duplicateInterceptionCheck.tag === "invalid") {
        /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
        return invalidResult(
          input.state,
          "invalidFill",
          duplicateInterceptionCheck.message,
        );
      }
      /* v8 ignore stop -- @preserve */
      if (duplicateInterceptionCheck.tag === "hitDuplicate") {
        /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (spellAttackPostDuplicateHitInterceptionFillsArePresent(fillSet)) {
          /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
          return invalidResult(
            input.state,
            "invalidFill",
            "Spell attack damage and after-hit fills are not valid when duplicate-hit interception redirects the hit to a duplicate.",
          );
        }
        /* v8 ignore stop -- @preserve */
        if (
          invocationForResolution.procedure === "spatialMeleeSpellAttackProxy"
        ) {
          return {
            tag: "resolved",
            state: duplicateInterceptionCheck.state,
            snapshot: snapshotBattle(duplicateInterceptionCheck.state),
          };
        }
        return spendSpellActResolutionResources({
          state: duplicateInterceptionCheck.state,
          actorId: subject.actorId,
          invocation: invocationForResolution,
          errorState: input.state,
          ...optionalProperty("actionCostOverride", options.actionCostOverride),
          ...(metamagicApplicationsForDamageAndSpend === undefined
            ? {}
            : {
                metamagicApplications: metamagicApplicationsForDamageAndSpend,
              }),
          ...optionalProperty(
            "spatialMeleeSpellAttackProxyPosition",
            spatialMeleeSpellAttackProxyPosition,
          ),
        });
      }
    }
    const spellMarkedDamageRiders = hit
      ? activeMarkedDamageRiders(
          attackRolledStateBeforeHitContinuations.combatants.get(
            subject.actorId,
          ),
          target.combatantId,
        )
      : [];
    if (hit && input.handledInterruptTrigger !== "attackHit") {
      const attackHitDamageTypes = isSupportedDamageSpellInvocation(
        invocationForResolution,
      )
        ? spellDamageTypes(
            transmutedSpellDamageInvocation(
              invocationForResolution,
              metamagicApplicationsForDamageAndSpend,
            ),
          )
        : spellDamageTypes(invocationForResolution);
      const reactionWindow = maybeOpenInterruptWindow(
        attackRolledStateBeforeHitContinuations,
        {
          trigger: "attackHit",
          attackerId: subject.actorId,
          targetId: target.combatantId,
          attackRoll: effectiveAttackRoll,
          attackKind: spellAttackKindForRedirect(
            invocationForResolution.attackKind,
          ),
          attackHitTriggerKind: "otherAttack",
          damageTypes: [
            ...new Set([
              ...attackHitDamageTypes,
              ...spellMarkedDamageRiders.map(
                (rider) => rider.damage.damageType,
              ),
            ]),
          ],
          continuation:
            "glyphStoredSpellReleaseReplay" in input &&
            input.glyphStoredSpellReleaseReplay !== undefined
              ? spellReplayContinuation(input)
              : spellReplayContinuation({
                  ...input,
                  ...optionalProperty(
                    "spatialMeleeSpellAttackProxyCommitCheckpoint",
                    spatialMeleeSpellAttackProxyCommitCheckpointFor(
                      subject.actorId,
                      invocationForResolution,
                    ),
                  ),
                }),
        },
        input.handledInterruptTrigger,
      );
      if (reactionWindow !== null) {
        return reactionWindow;
      }
    }
    const remarkableAthleteMovement =
      resolveRemarkableAthleteCriticalHitMovement({
        state: attackRolledStateBeforeHitContinuations,
        subject: input.subject,
        attackerId: subject.actorId,
        scoredCriticalHit: critical,
        fills: fillSet,
      });
    if (remarkableAthleteMovement.tag === "result") {
      return remarkableAthleteMovement.result;
    }
    const spellResolutionState = remarkableAthleteMovement.state;
    const spellAttackHalfInitialMiss =
      !hit &&
      invocationForResolution.procedure === "spellAttackDamage" &&
      invocationForResolution.missDamage === "halfInitialOnly";
    if (fillSet.damageRoll == null) {
      if (hit || potentCantripMiss || spellAttackHalfInitialMiss) {
        const requestedDamageInvocation = transmutedSpellDamageInvocation(
          invocationForResolution,
          metamagicApplicationsForDamageAndSpend,
        );
        return needsHolesResult(spellResolutionState, input.subject, [
          spellDamageHoleWithEmpoweredOption(
            spellResolutionState,
            subject.actorId,
            {
              ...requestedDamageInvocation,
              sourceProcedureRef: invocationForResolution.sourceProcedureRef,
            },
            hit && critical,
            metamagicApplicationsForDamageAndSpend ?? [],
            spellMarkedDamageRiders,
          ),
        ]);
      }
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        fillSet.damageDispositions.length > 0 ||
        fillSet.sourceDamageRollPenaltyRolls.length > 0
      ) {
        /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
        return invalidResult(
          input.state,
          "invalidFill",
          "Spell damage can only be filled after a hit.",
        );
      }
      /* v8 ignore stop -- @preserve */
      return invocationForResolution.procedure ===
        "spatialMeleeSpellAttackProxy"
        ? stateAfterSpatialMeleeSpellAttackProxyCastProxyCreatedBeforeImmediateAttack(
            {
              state: attackRolledStateAfterHurl,
              actorId: subject.actorId,
              invocation: invocationForResolution,
              errorState: input.state,
              ...optionalProperty(
                "actionCostOverride",
                options.actionCostOverride,
              ),
              ...(metamagicApplicationsForDamageAndSpend === undefined
                ? {}
                : {
                    metamagicApplications:
                      metamagicApplicationsForDamageAndSpend,
                  }),
              ...optionalProperty(
                "spatialMeleeSpellAttackProxyPosition",
                spatialMeleeSpellAttackProxyPosition,
              ),
              commitAlreadyApplied: spatialProxyCommitAlreadyApplied,
            },
          )
        : spendSpellActResolutionResources({
            state: attackRolledStateAfterHurl,
            actorId: subject.actorId,
            invocation: invocationForResolution,
            errorState: input.state,
            ...optionalProperty(
              "actionCostOverride",
              options.actionCostOverride,
            ),
            ...(metamagicApplicationsForDamageAndSpend === undefined
              ? {}
              : {
                  metamagicApplications: metamagicApplicationsForDamageAndSpend,
                }),
            ...optionalProperty(
              "spatialMeleeSpellAttackProxyPosition",
              spatialMeleeSpellAttackProxyPosition,
            ),
          });
    }
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (!hit && !potentCantripMiss && !spellAttackHalfInitialMiss) {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell damage can only be filled after a hit.",
      );
    }
    /* v8 ignore stop -- @preserve */
    return {
      tag: "damageContext" as const,
      spellResolutionState,
      metamagicApplicationsForDamageAndSpend,
      damageRoll: fillSet.damageRoll,
      attackOutcome: hit
        ? {
            tag: "spellAttackHit" as const,
            critical,
            markedDamageRiders: spellMarkedDamageRiders,
          }
        : { tag: "spellAttackMissWithDamage" as const },
    };
  })();
  if (spellDamageContext.tag !== "damageContext") {
    return spellDamageContext;
  }
  const {
    spellResolutionState,
    metamagicApplicationsForDamageAndSpend,
    damageRoll,
    attackOutcome,
  } = spellDamageContext;
  const spellAttackHitOutcome =
    attackOutcome.tag === "spellAttackHit" ? attackOutcome : null;
  const spellAttackHit = spellAttackHitOutcome !== null;
  const critical = spellAttackHitOutcome?.critical ?? false;
  const spellMarkedDamageRiders =
    spellAttackHitOutcome?.markedDamageRiders ?? [];

  const damageInvocation = transmutedSpellDamageInvocation(
    invocationForResolution,
    metamagicApplicationsForDamageAndSpend,
  );
  const spellDamageBaseStateResult = spellAttackHit
    ? {
        tag: "resolved" as const,
        state: spellResolutionState,
        snapshot: snapshotBattle(spellResolutionState),
      }
    : stateAfterSpatialMeleeSpellAttackProxyCastProxyCreatedBeforeImmediateAttack(
        {
          state: spellResolutionState,
          actorId: subject.actorId,
          invocation: invocationForResolution,
          errorState: input.state,
          ...optionalProperty(
            "spatialMeleeSpellAttackProxyPosition",
            spatialMeleeSpellAttackProxyPosition,
          ),
        },
      );
  /* v8 ignore start -- @preserve -- A hit path has already committed this exact force position and the reducer is idempotent; a miss path reaches this reducer exactly once after the admission resource proof. */
  if (spellDamageBaseStateResult.tag !== "resolved") {
    return spellDamageBaseStateResult;
  }
  /* v8 ignore stop -- @preserve */
  const spellDamageBaseState = spellDamageBaseStateResult.state;
  const targetBeforeDamage =
    spellDamageBaseState.combatants.get(target.combatantId) ?? target;
  const spellDamageResult =
    !spellAttackHit &&
    invocationForResolution.procedure === "spellAttackDamage" &&
    invocationForResolution.missDamage === "halfInitialOnly"
      ? "half"
      : !spellAttackHit &&
          potentCantripAppliesToMissedSpellAttack({
            actor: castingState.combatants.get(subject.actorId),
            invocation: invocationForResolution,
            target,
          })
        ? "half"
        : "full";
  const originalDamageValidation = validateSpellDamageFill(
    damageRoll,
    damageInvocation,
    spellAttackHit && critical,
    spellMarkedDamageRiders,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (originalDamageValidation !== null) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", originalDamageValidation);
  }
  /* v8 ignore stop -- @preserve */
  const empoweredRerollIssue = empoweredSpellDamageRerollValidationIssue({
    actor: spellDamageBaseState.combatants.get(subject.actorId),
    invocation: damageInvocation,
    damageRoll,
    castApplications: metamagicApplicationsForDamageAndSpend ?? [],
  });
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (empoweredRerollIssue !== null) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", empoweredRerollIssue);
  }
  /* v8 ignore stop -- @preserve */
  const empoweredApplication =
    damageRoll.spellDamageReroll?.kind === "reroll"
      ? empoweredSpellRerollApplicationForDamageRoll({
          actor: spellDamageBaseState.combatants.get(subject.actorId),
          damageRoll,
          castApplications: metamagicApplicationsForDamageAndSpend ?? [],
        })
      : null;
  const metamagicApplicationsAfterEmpowered =
    empoweredApplication !== null && typeof empoweredApplication !== "string"
      ? [
          ...(metamagicApplicationsForDamageAndSpend ?? []),
          empoweredApplication,
        ]
      : metamagicApplicationsForDamageAndSpend;
  const effectiveDamageRoll = effectiveEmpoweredSpellDamageRoll(damageRoll);
  const effectiveDamageValidation =
    effectiveDamageRoll === damageRoll
      ? null
      : validateSpellDamageFill(
          effectiveDamageRoll,
          damageInvocation,
          spellAttackHit && critical,
          spellMarkedDamageRiders,
        );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (effectiveDamageValidation !== null) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", effectiveDamageValidation);
  }
  /* v8 ignore stop -- @preserve */
  const spellDamageByType = spellDamageByTypeForTarget(
    target,
    damageInvocation,
    effectiveDamageRoll,
    spellDamageResult,
    spellMarkedDamageRiders,
    spellAttackHit && critical,
  );
  const spellReductionRoll = spellDamageReductionRollForTarget(
    fillSet.spellDamageReductionRolls,
    target,
    spellDamageByType,
  );
  const damageSource = spellDamageBaseState.combatants.get(subject.actorId);
  const expectedSourcePenaltyHole =
    sourceDamageRollPenaltyRollHoleForDamageRoll(
      damageSource,
      spellDamageByType,
      effectiveDamageRoll.holeId,
    );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    unexpectedSourceDamageRollPenaltyRoll(
      fillSet.sourceDamageRollPenaltyRolls,
      expectedSourcePenaltyHole === null ? [] : [expectedSourcePenaltyHole],
    ) !== undefined
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const sourceDamageRollPenaltyRoll = sourceDamageRollPenaltyRollForDamageRoll(
    fillSet.sourceDamageRollPenaltyRolls,
    damageSource,
    spellDamageByType,
    effectiveDamageRoll.holeId,
  );
  const sourcePenalty = applyAvailableSourceDamageRollPenalty(
    damageSource,
    spellDamageByType,
    effectiveDamageRoll.holeId,
    sourceDamageRollPenaltyRoll,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (sourcePenalty.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (sourcePenalty.tag === "needsHoles") {
    return needsHolesResult(spellDamageBaseState, input.subject, [
      ...sourcePenalty.holes,
    ]);
  }
  const spellReduction = applyAvailableSpellDamageReduction(
    targetBeforeDamage,
    sourcePenalty.damageByType,
    spellReductionRoll,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (spellReduction.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Spell damage reduction roll does not match an unused matching damage-reduction spell effect.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (spellReduction.tag === "needsHoles") {
    return needsHolesResult(spellDamageBaseState, input.subject, [
      ...spellReduction.holes,
    ]);
  }
  const spellDamageAmount = damageAmountByTypeAfterTargetAdjustments(
    input.state,
    spellReduction.target,
    spellReduction.damageByType,
  );
  const concentrationSave = concentrationSavingThrowHole(
    spellReduction.target,
    spellDamageAmount,
  );
  const concentrationFill =
    concentrationSave === null
      ? undefined
      : concentrationSavingThrowFillFor(
          fillSet.concentrationSavingThrows,
          concentrationSave,
        );
  const concentrationSaveCheck =
    damageLifecycleConcentrationSavingThrowFillCheck({
      state: spellDamageBaseState,
      target: spellReduction.target,
      damageAmount: spellDamageAmount,
      fills: fillSet.concentrationSavingThrows,
    });
  if (concentrationSaveCheck.tag === "needsHoles") {
    return needsHolesResult(spellDamageBaseState, input.subject, [
      ...concentrationSaveCheck.holes,
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (concentrationSaveCheck.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      concentrationSaveCheck.message,
    );
  }
  /* v8 ignore stop -- @preserve */
  const damageDispositionHole = zeroHitPointReplacementDispositionHole({
    damageSourceId: subject.actorId,
    target: spellReduction.target,
    damageAmount: spellDamageAmount,
  });
  const damageDispositionValidation = damageDispositionFillsValidation({
    holes: damageDispositionHole === null ? [] : [damageDispositionHole],
    fills: fillSet.damageDispositions,
  });
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageDispositionValidation !== null) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      damageDispositionValidation,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (
    damageDispositionHole !== null &&
    damageDispositionFillFor(
      fillSet.damageDispositions,
      damageDispositionHole,
    ) === undefined
  ) {
    return needsHolesResult(spellDamageBaseState, input.subject, [
      damageDispositionHole,
    ]);
  }
  const stagedConditionSaveCheck =
    damageLifecycleSaveGatedConditionWithRepeatDamageRepeatSaveFillCheck({
      state: spellDamageBaseState,
      target: spellReduction.target,
      damageAmount: spellDamageAmount,
      fills: fillSet.saveGatedConditionWithRepeatDamageRepeatSaves,
      damageOccurrenceKey: saveGatedConditionDamageOccurrenceKeyForHole(
        damageRoll.holeId,
      ),
    });
  if (stagedConditionSaveCheck.tag === "needsHoles") {
    return needsHolesResult(spellDamageBaseState, input.subject, [
      ...stagedConditionSaveCheck.holes,
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (stagedConditionSaveCheck.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      stagedConditionSaveCheck.message,
    );
  }
  /* v8 ignore stop -- @preserve */
  const damageDisposition = damageDispositionForTarget(
    damageDispositionHole === null ? [] : [damageDispositionHole],
    fillSet.damageDispositions,
    target.combatantId,
  );
  const relationshipCheck = damageRelationshipDecisionFillCheck({
    state: spellDamageBaseState,
    damageEventHoleId: damageRoll.holeId,
    damageSourceId: subject.actorId,
    targets:
      spellDamageAmount <= 0
        ? []
        : [
            {
              targetId: target.combatantId,
              damageAmount: toDamageAmount(spellDamageAmount),
              damageDisposition,
            },
          ],
    spatialFacts: fillSet.targetSpatialFacts,
    decisionsByRelationshipHole: fillSet.damageRelationshipDecisions,
  });
  if (relationshipCheck.tag === "needsHoles") {
    return needsHolesResult(
      spellDamageBaseState,
      input.subject,
      relationshipCheck.holes,
    );
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (relationshipCheck.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", relationshipCheck.message);
  }
  /* v8 ignore stop -- @preserve */
  const damaged = applySpellDamage(
    spellDamageBaseState,
    target.combatantId,
    damageInvocation,
    effectiveDamageRoll,
    spellAttackHit && critical,
    {
      concentrationSavingThrow: concentrationFill,
      linkedDefenseResistanceDamageShareConcentrationSavingThrows:
        fillSet.concentrationSavingThrows,
      damageDisposition,
      spellMarkedDamageRiders,
      sourceDamageRollPenaltyRoll,
      spellDamageReductionRoll: spellReductionRoll,
      saveGatedConditionDamageRepeatSave: {
        kind: "repeatSave",
        fills: fillSet.saveGatedConditionWithRepeatDamageRepeatSaves,
        occurrenceKey: saveGatedConditionDamageOccurrenceKeyForHole(
          damageRoll.holeId,
        ),
      },
      damageSourceId: subject.actorId,
      saveDamageResult: spellDamageResult,
      spatialFacts: fillSet.targetSpatialFacts,
      ...optionalProperty("relationshipDecisions", relationshipCheck.decisions),
    },
  );
  const effected = spellAttackHit
    ? applySpellActiveEffects(
        damaged,
        subject.actorId,
        target.combatantId,
        invocationForResolution,
      )
    : damaged;
  const lit =
    invocationForResolution.procedure === "heldLightHurl" ||
    (invocationForResolution.procedure === "spellAttackDamage" &&
      spellAttackHit)
      ? applySpellLightEmitterEffects(
          effected,
          subject.actorId,
          { kind: "combatant", combatantId: target.combatantId },
          invocationForResolution,
        )
      : effected;
  const stateAfterDamageAndHurl = stateAfterResolvedHeldLightHurl(
    lit,
    subject.actorId,
    invocationForResolution,
  );
  const spentResources =
    invocationForResolution.procedure === "spatialMeleeSpellAttackProxy"
      ? {
          tag: "resolved" as const,
          state: stateAfterDamageAndHurl,
          snapshot: snapshotBattle(stateAfterDamageAndHurl),
        }
      : spendSpellActResolutionResources({
          state: stateAfterDamageAndHurl,
          actorId: subject.actorId,
          invocation: invocationForResolution,
          errorState: input.state,
          ...optionalProperty("actionCostOverride", options.actionCostOverride),
          ...(metamagicApplicationsAfterEmpowered === undefined
            ? {}
            : {
                metamagicApplications: metamagicApplicationsAfterEmpowered,
              }),
          ...optionalProperty(
            "spatialMeleeSpellAttackProxyPosition",
            spatialMeleeSpellAttackProxyPosition,
          ),
        });
  if (spentResources.tag !== "resolved") {
    return spentResources;
  }
  const nextState = spentResources.state;
  const afterDamageReactionWindow = maybeOpenInterruptWindow(
    nextState,
    {
      trigger: "afterDamage",
      damageSourceId: subject.actorId,
      damagedId: target.combatantId,
      damageAmount: toDamageAmount(spellDamageAmount),
      reactionSpellTargetFacts: reactionSpellTargetFactsForAfterDamage({
        facts: fillSet.targetSpatialFacts,
        damagedId: target.combatantId,
        damageSourceId: subject.actorId,
      }),
      continuation: {
        kind: "resolved",
        subject: input.subject,
      },
    },
    input.handledInterruptTrigger,
  );
  if (afterDamageReactionWindow !== null) {
    return afterDamageReactionWindow;
  }

  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function stateAfterSpellAttackRollMadeForInvocation(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation,
): BattleState {
  return invocation.procedure === "spellCreatedHeldObjectAttack"
    ? revealHidden(state, actorId)
    : state;
}

function stateAfterSpatialMeleeSpellAttackProxyCastProxyCreatedBeforeImmediateAttack(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation;
  readonly errorState: BattleState;
  readonly spatialMeleeSpellAttackProxyPosition?: Extract<
    BattleFill,
    { readonly kind: "spatialMeleeSpellAttackProxyPosition" }
  >["value"];
  readonly commitAlreadyApplied?: boolean;
}): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  if (input.invocation.procedure !== "spatialMeleeSpellAttackProxy") {
    return {
      tag: "resolved",
      state: input.state,
      snapshot: snapshotBattle(input.state),
    };
  }
  if (input.commitAlreadyApplied === true) {
    return {
      tag: "resolved",
      state: input.state,
      snapshot: snapshotBattle(input.state),
    };
  }
  return spendSpellActResolutionResources(input);
}

function spatialMeleeSpellAttackProxyCommitCheckpointFor(
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation,
): BattleSpatialMeleeSpellAttackProxyCommitCheckpoint | undefined {
  return invocation.procedure === "spatialMeleeSpellAttackProxy"
    ? {
        kind: "spatialMeleeSpellAttackProxyCommitApplied",
        actorId,
        sourceProcedureRef: invocation.sourceProcedureRef,
        operation: invocation.operation,
      }
    : undefined;
}

function spatialMeleeSpellAttackProxyResolutionCommitAlreadyApplied(input: {
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation;
  readonly handledInterruptTrigger: string | undefined;
  readonly checkpoint:
    | BattleSpatialMeleeSpellAttackProxyCommitCheckpoint
    | undefined;
}): boolean {
  return (
    input.handledInterruptTrigger === "attackHit" &&
    input.invocation.procedure === "spatialMeleeSpellAttackProxy" &&
    input.checkpoint?.kind === "spatialMeleeSpellAttackProxyCommitApplied" &&
    input.checkpoint.actorId === input.actorId &&
    input.checkpoint.sourceProcedureRef ===
      input.invocation.sourceProcedureRef &&
    input.checkpoint.operation === input.invocation.operation
  );
}

function spatialMeleeSpellAttackProxyRepeatIsLaterTurn(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    {
      readonly procedure: "spatialMeleeSpellAttackProxy";
      readonly operation: "repositionAndAttack";
    }
  >;
}): boolean {
  return (
    input.actorId !== input.invocation.activeEffect.startedOn.actorId ||
    input.state.initiative.round !==
      input.invocation.activeEffect.startedOn.round
  );
}

function spatialMeleeSpellAttackProxyRepeatTargetingInvalidReason(
  invocation: BattleExecutableSpellInvocation,
  targetId: CombatantId,
): string | null {
  if (
    invocation.procedure !== "spatialMeleeSpellAttackProxy" ||
    invocation.operation !== "repositionAndAttack"
  ) {
    return null;
  }
  const repeatTargeting = invocation.repeatTargeting;
  if (repeatTargeting.kind === "unrestricted") {
    return null;
  }
  return repeatTargeting.combatantId === targetId
    ? null
    : "Glyph-stored spatial melee spell-attack proxy repeat attacks must target the triggering creature.";
}

type SpellActResolutionResourceInput = {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation;
  readonly errorState: BattleState;
  readonly actionCostOverride?: "magicAction" | "bonusAction";
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
  readonly spatialMeleeSpellAttackProxyPosition?: Extract<
    BattleFill,
    { readonly kind: "spatialMeleeSpellAttackProxyPosition" }
  >["value"];
};

function spendSpellCreatedHeldObjectAttackResolutionResources(
  input: SpellActResolutionResourceInput,
): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  const spellAttackState = battleStateAfterTargetActionEarlyEndForActor(
    input.state,
    input.actorId,
  );
  const spent = spendAction(spellAttackState.currentTurnResources, "magic");
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.errorState,
      "staleSubject",
      "Magic action is no longer available for the current actor.",
    );
  }
  const nextState = {
    ...spellAttackState,
    currentTurnResources: clearPendingAttackRollMissToHitReplacementSelection(
      spent.success,
      input.actorId,
    ),
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function spendSpellActResolutionResources(
  input: SpellActResolutionResourceInput,
): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  if (
    input.invocation.procedure === "spatialMeleeSpellAttackProxy" &&
    input.invocation.operation === "createAndAttack"
  ) {
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (
      input.spatialMeleeSpellAttackProxyPosition === undefined ||
      input.spatialMeleeSpellAttackProxyPosition.mode !== "cast"
    ) {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.errorState,
        "invalidFill",
        "spatial melee spell-attack proxy cast requires a table-supplied force position.",
      );
    }
    /* v8 ignore stop -- @preserve */
    const spent = spendSpellCastResources({
      state: input.state,
      actorId: input.actorId,
      invocation: input.invocation,
      errorState: input.errorState,
      ...optionalProperty("actionCostOverride", input.actionCostOverride),
      ...optionalProperty("metamagicApplications", input.metamagicApplications),
    });
    if (spent.tag !== "resolved") {
      return spent;
    }
    const nextState = applySpatialMeleeSpellAttackProxyEffect({
      state: spent.state,
      actorId: input.actorId,
      forcePositionId: input.spatialMeleeSpellAttackProxyPosition.positionId,
      repeatTargeting: { kind: "unrestricted" },
      invocation: input.invocation,
    });
    return {
      tag: "resolved",
      state: nextState,
      snapshot: snapshotBattle(nextState),
    };
  }
  if (
    input.invocation.procedure === "spatialMeleeSpellAttackProxy" &&
    input.invocation.operation === "repositionAndAttack"
  ) {
    if (
      !spatialMeleeSpellAttackProxyRepeatIsLaterTurn({
        state: input.state,
        actorId: input.actorId,
        invocation: input.invocation,
      })
    ) {
      return invalidResult(
        input.errorState,
        "staleSubject",
        "spatial melee spell-attack proxy repeat attack is only available on later turns.",
      );
    }
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (
      input.spatialMeleeSpellAttackProxyPosition === undefined ||
      input.spatialMeleeSpellAttackProxyPosition.mode !== "reposition"
    ) {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.errorState,
        "invalidFill",
        "spatial melee spell-attack proxy repeat attack requires a table-supplied reposition.",
      );
    }
    /* v8 ignore stop -- @preserve */
    const spellAttackState = battleStateAfterTargetActionEarlyEndForActor(
      input.state,
      input.actorId,
    );
    const spent = spendActivationResource(
      spellAttackState.currentTurnResources,
      { kind: "bonusAction" },
    );
    if (Result.isFailure(spent)) {
      return invalidResult(
        input.errorState,
        "staleSubject",
        "spatial melee spell-attack proxy repeat attack requires an available Bonus Action.",
      );
    }
    const repositioned = repositionSpatialMeleeSpellAttackProxyEffect({
      state: {
        ...spellAttackState,
        currentTurnResources:
          clearPendingAttackRollMissToHitReplacementSelection(
            spent.success,
            input.actorId,
          ),
      },
      invocation: input.invocation,
      forcePositionId: input.spatialMeleeSpellAttackProxyPosition.positionId,
    });
    return {
      tag: "resolved",
      state: repositioned,
      snapshot: snapshotBattle(repositioned),
    };
  }
  if (input.invocation.procedure !== "spellCreatedHeldObjectAttack") {
    return spendSpellCastResources(input);
  }
  return spendSpellCreatedHeldObjectAttackResolutionResources(input);
}

export function resolveBonusActionSpellAct(
  input: AdmittedBonusActionSpellBattleResolutionInput,
  executionRegistry: SpellProcedureExecutionRegistry,
): BattleResolutionResult {
  const subject = input.subject;
  const actor = input.state.combatants.get(subject.actorId);
  if (!isCharacterBattleCreatureState(actor)) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Bonus Action spell act requires a supported Bonus Action spell.",
    );
  }
  const selectedInvocation = supportedBonusActionSpellInvocationForSubject(
    actor,
    subject,
  );
  const invocationCandidate =
    selectedInvocation ??
    antimagicSuppressedInvocationForStaleSubject(actor, subject);
  const invocationAdmission = admitSpellInvocationForResolution({
    state: input.state,
    actor,
    subject,
    invocation: invocationCandidate,
  });
  if (invocationAdmission.tag === "unavailable") {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Bonus Action spell act requires a supported Bonus Action spell.",
    );
  }
  if (invocationAdmission.tag === "spellMetamagicAdmissionIssue") {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      invocationAdmission.message,
    );
  }
  const invocation = invocationAdmission.invocation;
  const actionCostOverride = metamagicActionCostOverride(
    invocationAdmission.applications,
  );
  const isQuickenedActionSpellRewrite =
    actionCostOverride === "bonusAction" &&
    spellInvocationHasMagicActionCastingTime(invocation);
  if (
    !isQuickenedActionSpellRewrite &&
    !isNativeBonusActionSpellInvocation(invocation)
  ) {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "Bonus Action spell subject requires a supported Bonus Action spell act.",
    );
  }
  const spatialProxyCommitAlreadyApplied =
    spatialMeleeSpellAttackProxyResolutionCommitAlreadyApplied({
      actorId: subject.actorId,
      invocation,
      handledInterruptTrigger: input.handledInterruptTrigger,
      checkpoint: input.spatialMeleeSpellAttackProxyCommitCheckpoint,
    });
  if (
    !spatialProxyCommitAlreadyApplied &&
    !spellHasAvailableSpend(actor, invocation)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bonus Action spell act no longer has its required runtime spell resource.",
    );
  }
  if (
    !spatialProxyCommitAlreadyApplied &&
    !spellActTurnResourceAvailable(
      input.state.currentTurnResources,
      input.subject.actorId,
      invocation,
      actionCostOverride === undefined ? undefined : { actionCostOverride },
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      actionCostOverride === "bonusAction" &&
        !canSpendBonusAction(input.state.currentTurnResources)
        ? "Bonus Action spell is no longer available for the current actor."
        : "This turn has already expended a Spell Slot.",
    );
  }
  if (
    !spatialProxyCommitAlreadyApplied &&
    spellInvocationIsSpellcasting(invocation) &&
    activeOngoingFeaturesPreventSpellInvocation(input.state, actor, invocation)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bonus Action spell act is unavailable while an active ongoing feature prevents spellcasting.",
    );
  }

  const castingState =
    spellInvocationIsSpellcasting(invocation) &&
    invocation.spellRuleFacts.components.verbal
      ? revealHidden(input.state, subject.actorId)
      : input.state;
  const resolveTurnConstraintSomaticFailurePhase = () =>
    resolveSaveGatedTurnConstraintSomaticSpellFailure({
      state: input.state,
      castingState,
      subject,
      actorId: subject.actorId,
      invocation,
      fills: input.fills,
      ...optionalProperty("actionCostOverride", actionCostOverride),
      metamagicApplications: invocationAdmission.applications,
    });
  if (invocation.procedure === "weaponAttackOverride") {
    const parsedFillInput = parseWeaponAttackOverrideFillInput(
      fillsAfterTurnConstraintSomaticSpellFailureOutcome(input.fills),
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (parsedFillInput.tag === "invalid") {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(input.state, "invalidFill", parsedFillInput.message);
    }
    /* v8 ignore stop -- @preserve */
    const turnConstraintSomaticSpellFailure =
      resolveTurnConstraintSomaticFailurePhase();
    if (turnConstraintSomaticSpellFailure.tag !== "continue") {
      return turnConstraintSomaticSpellFailure;
    }
    return resolveRegisteredSpellProcedureExecution(
      executionRegistry,
      spellProcedureResolveDispatchInput(invocation.procedure, {
        input: { ...input, state: castingState },
        actorId: subject.actorId,
        invocation,
        fillSet: parsedFillInput.input,
      }),
    );
  }
  const turnConstraintSomaticSpellFailure =
    resolveTurnConstraintSomaticFailurePhase();
  if (turnConstraintSomaticSpellFailure.tag !== "continue") {
    return turnConstraintSomaticSpellFailure;
  }
  const fillSet = spellFillSet(
    input.fills,
    invocation,
    invocation.sourceProcedureRef,
    subject.actorId,
    input.state,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  /* v8 ignore stop -- @preserve */
  if (!invocationUsesBonusActionSpellProfileResolution(invocation)) {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "This spell procedure does not use the Bonus Action spell resolution lane.",
    );
  }
  return resolveRegisteredSpellProcedureExecution(
    executionRegistry,
    bonusActionSpellProcedureResolveDispatchInput(
      input,
      castingState,
      subject.actorId,
      invocation,
      fillSet,
      {
        metamagicApplications: spellProcedureHasQuickenedActionCostRewrite(
          invocation.procedure,
        )
          ? invocationAdmission.applications
          : [],
        ...optionalProperty("actionCostOverride", actionCostOverride),
      },
    ),
  );
}

export function resolveBonusActionSpellAttackProxyAct(
  input: BonusActionSpellBattleResolutionInput,
  executionRegistry: SpellProcedureExecutionRegistry,
): BattleResolutionResult {
  const result = resolveSpellActInternal(
    {
      ...input,
      subject: {
        ...input.subject,
        tag: "actionSpell",
      },
    },
    executionRegistry,
    { kind: "bonusActionSpellAttackProxy" },
  );
  return result.tag === "needsHoles"
    ? {
        ...result,
        subject: input.subject,
      }
    : result;
}

function isNativeBonusActionSpellInvocation(
  invocation: BattleSpellProcedureExecution,
): invocation is BattleSpellProcedureExecution & {
  readonly procedure: NativeBonusActionSpellProcedure;
  readonly actionCost: "bonusAction";
} {
  return (
    NATIVE_BONUS_ACTION_SPELL_PROCEDURE_SET.has(invocation.procedure) &&
    "actionCost" in invocation &&
    invocation.actionCost === "bonusAction"
  );
}

function supportedActionSpellInvocationForSubject(
  actor: CharacterBattleCreatureState,
  subject: ActionSpellBattleResolutionInput["subject"],
): BattleSpellProcedureExecution | undefined {
  if (subject.procedureRef === undefined) {
    return undefined;
  }
  const invocation = characterSpellProcedure(
    actor.origin.execution,
    subject.procedureRef,
    actor,
  );
  return invocation;
}

function supportedBonusActionSpellInvocationForSubject(
  actor: CharacterBattleCreatureState,
  subject: BonusActionSpellBattleResolutionInput["subject"],
): BattleSpellProcedureExecution | undefined {
  if (subject.procedureRef === undefined) {
    return undefined;
  }
  const invocation = characterSpellProcedure(
    actor.origin.execution,
    subject.procedureRef,
    actor,
  );
  return invocation;
}

/* v8 ignore start -- @preserve -- Defensive stale-subject recovery: legal rediscovery removes repeat spell acts while Antimagic Field suppresses their source effect. */
function antimagicSuppressedInvocationForStaleSubject(
  actor: CharacterBattleCreatureState,
  subject: BonusActionSpellBattleResolutionInput["subject"],
): BattleSpellProcedureExecution | undefined {
  const invocation = supportedBonusActionSpellInvocationForSubject(
    actor,
    subject,
  );
  if (
    invocation === undefined ||
    !invocationRefHasAntimagicSuppressedRepeatResolverGuard(
      invocation.procedure,
    )
  ) {
    return undefined;
  }
  return invocation;
}

function invocationRefHasAntimagicSuppressedRepeatResolverGuard(
  procedure: SupportedSpellInvocation["procedure"],
): boolean {
  return (
    procedure === "objectContactDamageRepeat" ||
    procedure === "spatialMeleeSpellAttackProxy"
  );
}
/* v8 ignore stop -- @preserve */

export function resolveBonusActionDashSpellAct(
  input: AdmittedBonusActionDashSpellBattleResolutionInput,
  executionRegistry: SpellProcedureExecutionRegistry,
): BattleResolutionResult {
  const subject = input.subject;
  const actor = input.state.combatants.get(subject.actorId);
  const invocation =
    actor?.origin.kind === "character"
      ? characterSpellProcedure(
          actor.origin.execution,
          subject.procedureRef,
          actor,
        )
      : undefined;
  /* v8 ignore start -- @preserve -- Bonus Action Dash admission carries a character actor and Expeditious Retreat procedure; this guard preserves a typed invalid result if that admission proof is ever bypassed. */
  if (
    actor?.origin.kind !== "character" ||
    invocation?.procedure !== "grantedAlternateActionCost"
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Bonus Action Dash spell act requires a supported bonus-action Dash effect spell.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const castingState =
    spellInvocationIsSpellcasting(invocation) &&
    invocation.spellRuleFacts.components.verbal
      ? revealHidden(input.state, subject.actorId)
      : input.state;
  const turnConstraintSomaticSpellFailure =
    resolveSaveGatedTurnConstraintSomaticSpellFailure({
      state: input.state,
      castingState,
      subject,
      actorId: subject.actorId,
      invocation,
      fills: input.fills,
    });
  if (turnConstraintSomaticSpellFailure.tag !== "continue") {
    return turnConstraintSomaticSpellFailure;
  }
  const fillSet = spellFillSet(
    input.fills,
    invocation,
    invocation.sourceProcedureRef,
    subject.actorId,
    input.state,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  /* v8 ignore stop -- @preserve */
  return resolveRegisteredSpellProcedureExecution(
    executionRegistry,
    spellProcedureResolveDispatchInput(invocation.procedure, {
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    }),
  );
}

export { resolveSpellRelease } from "./spells-resolve-release.ts";
