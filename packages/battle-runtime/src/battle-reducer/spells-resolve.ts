// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-created-held-object
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-levitated-creature
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-antimagic-field-ongoing-spell-suppression
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
import { Either, Match } from "effect";
import {
  type AdmittedActionSpellBattleResolutionInput,
  type AdmittedBonusActionDashSpellBattleResolutionInput,
  type AdmittedBonusActionSpellBattleResolutionInput,
  type ActionSpellBattleResolutionInput,
  type BattleAttackRollResult,
  type BattleCreatureState,
  type BattleFill,
  type BattleResolutionResult,
  type BattleState,
  type BattleExecutableSpellInvocation,
  type BonusActionSpellBattleResolutionInput,
  type CharacterBattleCreatureState,
  type SpellMarkedDamageRider,
  type SupportedSpellInvocation,
} from "../battle-state-execution.ts";
import {
  ATTACK_ROLL_HOLE_ID,
  ATTACK_TARGET_HOLE_ID,
} from "./battle-runtime-protocol.ts";
import { activeOngoingFeaturesPreventSpellInvocation } from "./spells-invocation-guards.ts";
import { attackRollIsCriticalHit } from "./attack-resolution.ts";
import { maybeOpenInterruptWindow } from "./interrupt-execution.ts";
import { spellReplayContinuation } from "./spell-reaction-continuation.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import {
  spellAttackRerollUnsupportedIssue,
  spellDamageRerollUnsupportedIssue,
} from "./spell-reroll-issues.ts";
import type { CombatantId } from "../identity.ts";
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
  consumeSelfAttackRollEffects,
  consumeHelpAttackForAttackRoll,
  objectTargetAttackNeedsSightFact,
  recordAttackRollOngoingFeatures,
  requiredSpellObjectTargetAttackRollMode,
  requiredSpellAttackRollMode,
} from "./attack-roll.ts";
import { activeEffectArmorClass } from "./creature-state-execution.ts";
import { isCharacterBattleCreatureState } from "./creature-state-queries.ts";
import {
  concentrationSavingThrowHole,
  damageLifecycleConcentrationSavingThrowFillCheck,
  damageLifecycleHideousLaughterDamageRepeatSaveFillCheck,
} from "./damage-apply.ts";
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
import { mirrorImageHitInterceptionCheck } from "./mirror-image-hit-interception.ts";
import { resolveRemarkableAthleteCriticalHitMovement } from "./remarkable-athlete-critical-movement.ts";
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
  spellProcedureSharedSpellAttackDamageBodyRouting,
  type SpellProcedureAcceptingActionCostOverride,
  type SpellProcedureWithProfileDelegatedSpellAttackDamageBody,
} from "./spell-execution-facts.ts";
import { isTriggeredReactionSpellInvocation } from "./spell-interrupt-procedure-kinds.ts";
import {
  applySpiritualWeaponAttackProxyEffect,
  repositionSpiritualWeaponAttackProxyEffect,
} from "./spells-active-effects.ts";
import {
  isReadiedSpellInvocation,
  spellInvocationCasterPrerequisiteIsMet,
} from "./spells-discovery.ts";
import {
  endHeldLightSpellEffect,
  applySpellActiveEffects,
  applySpellLightEmitterEffects,
  applySpellDamage,
  spellObjectDamageByType,
  spellObjectDamageOutcomeFromDamageByType,
  spellObjectTargetFact,
  spellObjectTargetSightFact,
  spellObjectTargetHole,
  spellAttackRollHole,
  spellDamageByTypeForTarget,
  spellDamageHole,
  selectedSpellAttackDamageProcedure,
  type RuntimeDamageSpellProcedure,
  type RuntimeExecutableDamageSpellProcedure,
  spellDamageTypes,
  spellObjectAttackRollHole,
  spellObjectIgnitionFact,
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
  spiritualWeaponForcePositionHole,
  spiritualWeaponForcePositionInvalidReason,
} from "./spells-targeting.ts";
import {
  antimagicFieldOngoingSpellEffectRefForActiveEffect,
  ongoingSpellEffectSuppressedByAntimagicField,
} from "./antimagic-field-suppression.ts";

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
  resolveFlamingSphereSpellAct,
  resolveFogCloudObscurementSpellAct,
  resolveGustOfWindLineSpellAct,
  resolveMagicalDarknessPointOriginSpellAct,
  resolveMoonbeamSpellAct,
  resolveSpikeGrowthMovementHazardSpellAct,
  resolveWebRestraintHazardSpellAct,
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
  resolveCommandSpellAct,
  resolveAbilityD20TestRollModeSaveGateSpellAct,
  resolveGreaseGroundHazardSpellAct,
  resolveHideousLaughterSpellAct,
  resolveSaveGateAttackRollAdvantageSpellAct,
  resolveSaveGateConditionSpellAct,
  resolveSaveGateConditionImmunitySpellAct,
  resolveSaveGateDamageSpellAct,
  resolveSleepTargetAdmissionSpellAct,
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
  sanctuaryTargetingInterdictionCheck,
  targetChoiceFillAfterSanctuaryAttackRollReplacement,
} from "./sanctuary-targeting-interdiction.ts";
import {
  spellCastInterruptFrame,
  spellCastMetamagicApplicationsInput,
} from "./spell-cast-interrupt-frame.ts";
import {
  fillsAfterSlowSomaticSpellFailureOutcome,
  resolveSlowSomaticSpellFailure,
} from "./slow-active-penalties-runtime.ts";
import { parseWeaponAttackOverrideFillInput } from "./weapon-attack-override-fill-input.ts";

import { spellFillSet, type SpellFillSet } from "./spells-resolve-fill-set.ts";

import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
import { resolveReadySpellAct } from "./spells-resolve-release.ts";
import type { SpellProcedureProfileResolveInput } from "./spell-procedure-profiles/execution-profile.ts";
import { clearPendingAttackRollMissToHitReplacementSelection } from "./statblock-attacks.ts";

// These procedures carry their own Bonus Action cost. Magic-action procedures
// stay outside this set and enter this lane only through the Quickened rewrite.
const NATIVE_BONUS_ACTION_SPELL_PROCEDURES = [
  "heldLight",
  "dancingLightsReposition",
  "objectContactDamageRepeat",
  "spiritualWeaponAttackProxy",
  "spiritualWeaponRepeatAttack",
  "spellCreatedHeldObject",
  "spellCreatedHeldObjectReEvoke",
  "scalarBuff",
  "directCondition",
  "rollModifier",
  "saveGatedCondition",
  "saveGatedConditionImmunity",
  "weaponDamageRider",
  "weaponAttackOverride",
  "magicWeaponEnhancement",
  "markedDamageRider",
  "jumpMovementReplacement",
  "dragonsBreathInitial",
  "selfTeleport",
  "sanctuaryTargetingInterdiction",
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
  | { readonly tag: "notSpellAttack" }
  | { readonly tag: "spellAttackMiss" }
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
  readonly attackOutcome: SpellDamageAttackOutcome;
};

type SpellActInternalInput =
  | ActionSpellBattleResolutionInput
  | BonusActionSpellBattleResolutionInput;

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
  invocation: BattleExecutableSpellInvocation,
): ActionSpellBattleResolutionInput & { readonly castingState?: BattleState } {
  return invocation.procedure === "persistentArmorEffect"
    ? { ...input, castingState }
    : { ...input, state: castingState };
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
      thaumaturgyBoomingVoice: (value) =>
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
      blurAttackRollDefense: (value) =>
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
      mirrorImageHitInterception: (value) =>
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
      wardingBond: (value) =>
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
      hastePositive: (value) =>
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
      levitatedCreature: (value) =>
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
      sleepTargetAdmission: (value) =>
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
      hideousLaughter: (value) =>
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
      hypnoticPattern: (value) =>
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
      slowActivePenalties: (value) =>
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
      greaseGroundHazard: (value) =>
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
      gustOfWindLine: (value) =>
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
      flamingSphere: (value) =>
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
      moonbeam: (value) =>
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
      fogCloudObscurement: (value) =>
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
      spikeGrowthMovementHazard: (value) =>
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
      webRestraintHazard: (value) =>
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
      sleetStormAreaHazard: (value) =>
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
      insectPlagueAreaHazard: (value) =>
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
      cloudkillAreaHazard: (value) =>
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
      antimagicFieldOngoingSpellSuppression: (value) =>
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
      command: (value) =>
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
      dancingLightsSeparateCast: (value) =>
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
      dancingLightsCombinedCast: (value) =>
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
      magicWeaponEnhancement: (value) =>
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
      jumpMovementReplacement: (value) =>
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
      dragonsBreathInitial: (value) =>
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
      sanctuaryTargetingInterdiction: (value) =>
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
      spiritualWeaponAttackProxy: (value) =>
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
      spiritualWeaponRepeatAttack: (value) =>
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
      dancingLightsReposition: (value) =>
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

function actionSpellUsesSharedSpellAttackDamageBody(
  invocation: BattleExecutableSpellInvocation,
  options: ResolveSpellActInternalOptions,
): boolean {
  const routing = spellProcedureSharedSpellAttackDamageBodyRouting(
    invocation.procedure,
  );
  return (
    routing === "direct" ||
    (routing === "profileDelegated" &&
      options.kind === "sharedSpellAttackDamage")
  );
}

function isSupportedDamageSpellInvocation<
  I extends BattleExecutableSpellInvocation,
>(invocation: I): invocation is I & RuntimeDamageSpellProcedure {
  return (
    invocation.procedure === "heldLightHurl" ||
    invocation.procedure === "spellCreatedHeldObjectAttack" ||
    invocation.procedure === "objectContactDamage" ||
    invocation.procedure === "objectContactDamageRepeat" ||
    invocation.procedure === "spiritualWeaponAttackProxy" ||
    invocation.procedure === "spiritualWeaponRepeatAttack" ||
    invocation.procedure === "repeatedDamageAllocation" ||
    (invocation.procedure === "spellAttackDamage" &&
      invocation.damage.kind !== "sorcerousBurstDamageTypeChoice") ||
    invocation.procedure === "spellAttackSequence" ||
    invocation.procedure === "saveGatedDamage" ||
    invocation.procedure === "attackBurstSaveDamage"
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
    input.invocation.access.tag !== "classCantrip" ||
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

function spellAttackPostMirrorImageFillsArePresent(
  fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>,
): boolean {
  return (
    fillSet.damageRoll !== undefined ||
    fillSet.damageDispositions.length > 0 ||
    fillSet.spellDamageReductionRolls.length > 0 ||
    fillSet.concentrationSavingThrows.length > 0 ||
    fillSet.hideousLaughterDamageRepeatSaves.length > 0 ||
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

/* v8 ignore start -- Malformed Seeking Spell decision: discovery offers reroll or decline only for an eligible missed single spell attack with compatible Metamagic, replacement, and roll-mode facts. */
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
/* v8 ignore stop */

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
        | "spiritualWeaponAttackProxy"
        | "spiritualWeaponRepeatAttack"
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
    ...(input.actionCostOverride === undefined
      ? {}
      : { actionCostOverride: input.actionCostOverride }),
    ...(input.metamagicApplications === undefined
      ? {}
      : { metamagicApplications: input.metamagicApplications }),
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
  const replayingSpiritualWeaponAttackHit =
    input.handledInterruptTrigger === "attackHit" &&
    (invocation.procedure === "spiritualWeaponAttackProxy" ||
      invocation.procedure === "spiritualWeaponRepeatAttack");
  const spiritualWeaponCommitAlreadyApplied =
    spiritualWeaponResolutionCommitAlreadyApplied({
      state: input.state,
      actorId: subject.actorId,
      invocation,
      fills: input.fills,
    });
  if (
    !replayingSpiritualWeaponAttackHit &&
    !spiritualWeaponCommitAlreadyApplied &&
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
    !spiritualWeaponCommitAlreadyApplied &&
    !spellInvocationCasterPrerequisiteIsMet(actor, invocation)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Action-time spell act requires its active caster spell effect.",
    );
  }
  if (
    !spiritualWeaponCommitAlreadyApplied &&
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
    invocation.procedure === "spiritualWeaponRepeatAttack" &&
    ongoingSpellEffectSuppressedByAntimagicField(
      input.state,
      antimagicFieldOngoingSpellEffectRefForActiveEffect(
        invocation.activeEffect,
      ),
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Spiritual Weapon repeat attack is suppressed by Antimagic Field.",
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
      invocation.procedure === "levitatedCreature" ||
      invocation.procedure === "wardingBond" ||
      invocation.procedure === "thaumaturgyBoomingVoice" ||
      invocation.procedure === "creatureTypeProtection" ||
      invocation.procedure === "blurAttackRollDefense" ||
      invocation.procedure === "seeInvisibleObserverSight" ||
      invocation.procedure === "mirrorImageHitInterception" ||
      invocation.procedure ===
        "conditionImmunityAndTurnStartTemporaryHitPoints" ||
      invocation.procedure === "afterHitDamage" ||
      invocation.procedure === "afterHitSaveGatedCondition" ||
      invocation.procedure === "afterHitTimedDamageAndSave" ||
      invocation.procedure === "afterHitDamageAndIllumination" ||
      invocation.procedure === "saveGatedCondition" ||
      invocation.procedure === "saveGatedConditionImmunity" ||
      invocation.procedure === "saveGatedAttackRollAdvantage" ||
      invocation.procedure === "hideousLaughter" ||
      invocation.procedure === "command" ||
      invocation.procedure === "fogCloudObscurement" ||
      invocation.procedure === "magicalDarknessPointOrigin" ||
      invocation.procedure === "antimagicFieldOngoingSpellSuppression" ||
      invocation.procedure === "webRestraintHazard" ||
      invocation.procedure === "sleetStormAreaHazard" ||
      invocation.procedure === "gustOfWindLine" ||
      invocation.procedure === "flamingSphere" ||
      invocation.procedure === "moonbeam" ||
      invocation.procedure === "objectContactDamage" ||
      invocation.procedure === "objectContactDamageRepeat" ||
      invocation.procedure === "spellCreatedHeldObject" ||
      invocation.procedure === "spellCreatedHeldObjectAttack" ||
      invocation.procedure === "spellCreatedHeldObjectReEvoke" ||
      invocation.procedure === "sanctuaryTargetingInterdiction" ||
      invocation.procedure === "dragonsBreathInitial" ||
      invocation.procedure === "hastePositive" ||
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
      replayingSpiritualWeaponAttackHit
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
    !replayingSpiritualWeaponAttackHit &&
    !spiritualWeaponCommitAlreadyApplied &&
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
  const slowSomaticSpellFailure = resolveSlowSomaticSpellFailure({
    state: input.state,
    castingState,
    subject,
    actorId: subject.actorId,
    invocation,
    fills: input.fills,
    ...(options.actionCostOverride === undefined
      ? {}
      : { actionCostOverride: options.actionCostOverride }),
    metamagicApplications: invocationAdmission.applications,
  });
  if (slowSomaticSpellFailure.tag !== "continue") {
    return slowSomaticSpellFailure;
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
    if (lane.tag !== "action") {
      return invalidResult(
        input.state,
        "unsupportedSubject",
        "Chained spell attacks require the Action spell resolution lane.",
      );
    }
    const fillSet = parseChainedSpellFillSet(
      input.fills,
      invocation,
      subject.actorId,
      input.state,
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fillSet.tag === "invalid") {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(input.state, "invalidFill", fillSet.message);
    }
    /* v8 ignore stop */
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  /* v8 ignore stop */
  if (!actionSpellUsesSharedSpellAttackDamageBody(invocation, options)) {
    if (lane.tag !== "action") {
      return invalidResult(
        input.state,
        "unsupportedSubject",
        "This spell procedure does not use the Bonus Action spell resolution lane.",
      );
    }
    if (!invocationUsesActionSpellProfileResolution(invocation)) {
      return invalidResult(
        input.state,
        "unsupportedSubject",
        "This spell procedure does not use the Action spell resolution lane.",
      );
    }
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

  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.targetId !== undefined && fillSet.objectTarget !== undefined) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Spell target must choose either one combatant or one object, not both.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    fillSet.targetList !== undefined ||
    fillSet.savingThrowOutcomes !== undefined ||
    fillSet.skillChoice !== undefined ||
    fillSet.targetAbilityChoices !== undefined
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Spell attack damage spells use target, attack-roll, and damage fills.",
    );
  }
  /* v8 ignore stop */
  const selectedInvocation = selectedSpellAttackDamageProcedure(
    invocation,
    fillSet.damageTypeChoice,
  );
  if (selectedInvocation.tag === "needsHoles") {
    return needsHolesResult(castingState, input.subject, [
      selectedInvocation.hole,
    ]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (selectedInvocation.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      selectedInvocation.message,
    );
  }
  /* v8 ignore stop */
  const invocationForResolution = selectedInvocation.invocation;
  const metamagicApplicationsForResolution =
    spellProcedureAcceptsMetamagicApplications(invocation.procedure)
      ? invocationAdmission.applications
      : options.metamagicApplications;
  if (
    (invocationForResolution.procedure === "spiritualWeaponAttackProxy" ||
      invocationForResolution.procedure === "spiritualWeaponRepeatAttack") &&
    fillSet.spiritualWeaponForcePosition === undefined
  ) {
    return needsHolesResult(castingState, input.subject, [
      spiritualWeaponForcePositionHole(invocationForResolution),
    ]);
  }
  const spiritualWeaponForcePosition =
    invocationForResolution.procedure === "spiritualWeaponAttackProxy" ||
    invocationForResolution.procedure === "spiritualWeaponRepeatAttack"
      ? fillSet.spiritualWeaponForcePosition
      : undefined;
  const spiritualWeaponForcePositionError =
    spiritualWeaponForcePosition === undefined ||
    (invocationForResolution.procedure !== "spiritualWeaponAttackProxy" &&
      invocationForResolution.procedure !== "spiritualWeaponRepeatAttack")
      ? null
      : spiritualWeaponForcePositionInvalidReason(
          spiritualWeaponForcePosition,
          invocationForResolution,
        );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (spiritualWeaponForcePositionError !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      spiritualWeaponForcePositionError,
    );
  }
  /* v8 ignore stop */
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
    if (lane.tag !== "action") {
      return invalidResult(
        input.state,
        "unsupportedSubject",
        "Object-target spell attacks require the Action spell resolution lane.",
      );
    }
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (
      (invocationForResolution.procedure !== "heldLightHurl" &&
        invocationForResolution.procedure !== "spellAttackDamage") ||
      invocationForResolution.targeting.kind !== "singleCreatureOrObject"
    ) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        "Object target fill does not match this spell act.",
      );
    }
    /* v8 ignore stop */
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (
      invocationForResolution.procedure === "spellAttackDamage" &&
      !isSupportedDamageSpellInvocation(invocationForResolution)
    ) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        "Object-target spell attack damage requires a selected damage type.",
      );
    }
    /* v8 ignore stop */
    return resolveSpellAttackDamageObjectTarget({
      input: { ...lane.input, state: castingState },
      actorId: subject.actorId,
      invocation: invocationForResolution,
      fillSet: { ...fillSet, objectTarget },
      ...(options.actionCostOverride === undefined
        ? {}
        : { actionCostOverride: options.actionCostOverride }),
      ...(metamagicApplicationsForResolution === undefined
        ? {}
        : { metamagicApplications: metamagicApplicationsForResolution }),
    });
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.targetId == null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Spell target fill did not select a target.",
    );
  }
  /* v8 ignore stop */
  const target = input.state.combatants.get(fillSet.targetId);
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (target == null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Spell target must be a combatant within the selected spell's supported range.",
    );
  }
  /* v8 ignore stop */
  const spiritualWeaponRepeatTargetingError =
    spiritualWeaponRepeatTargetingInvalidReason(
      invocationForResolution,
      target.combatantId,
    );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (spiritualWeaponRepeatTargetingError !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      spiritualWeaponRepeatTargetingError,
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !spellTargetIsLegal(
      input.state,
      subject.actorId,
      target.combatantId,
      invocationForResolution,
      fillSet.targetSpatialFacts,
      spiritualWeaponForcePosition === undefined
        ? {}
        : {
            spiritualWeaponForcePositionId:
              spiritualWeaponForcePosition.positionId,
          },
    )
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Spell target must be a combatant within the selected spell's supported range.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    spiritualWeaponForcePosition !== undefined &&
    !fillSet.targetSpatialFacts.some(
      (fact) =>
        fact.kind === "spiritualWeaponTargetWithinForceReach" &&
        fact.casterId === subject.actorId &&
        fact.targetId === target.combatantId &&
        fact.sourceProcedureRef ===
          invocationForResolution.sourceProcedureRef &&
        fact.forcePositionId === spiritualWeaponForcePosition.positionId,
    )
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Spiritual Weapon target adjacency must match the selected force position.",
    );
  }
  /* v8 ignore stop */

  if (isSupportedDamageSpellInvocation(invocationForResolution)) {
    const sanctuaryCheck = sanctuaryTargetingInterdictionCheck({
      state: castingState,
      triggeringProcedureRef: invocationForResolution.sourceProcedureRef,
      triggeringCombatantId: subject.actorId,
      wardedCombatantId: target.combatantId,
      triggeringTargetEventId: ATTACK_TARGET_HOLE_ID,
      replacementTargetKind: "attackRoll",
      fills: input.fills,
    });
    if (sanctuaryCheck.tag === "needsHoles") {
      return needsHolesResult(castingState, input.subject, [
        sanctuaryCheck.hole,
      ]);
    }
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (sanctuaryCheck.tag === "invalid") {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(input.state, "invalidFill", sanctuaryCheck.message);
    }
    /* v8 ignore stop */
    if (sanctuaryCheck.tag === "lost") {
      return spendSpellActResolutionResources({
        state: stateAfterResolvedHeldLightHurl(
          castingState,
          subject.actorId,
          invocationForResolution,
        ),
        actorId: subject.actorId,
        invocation: invocationForResolution,
        errorState: input.state,
        ...(options.actionCostOverride === undefined
          ? {}
          : { actionCostOverride: options.actionCostOverride }),
        ...(metamagicApplicationsForResolution === undefined
          ? {}
          : { metamagicApplications: metamagicApplicationsForResolution }),
        ...(spiritualWeaponForcePosition === undefined
          ? {}
          : { spiritualWeaponForcePosition }),
      });
    }
    if (sanctuaryCheck.tag === "newTarget") {
      const replacementTarget = input.state.combatants.get(
        sanctuaryCheck.targetId,
      );
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        replacementTarget === undefined ||
        !spellTargetIsLegal(
          input.state,
          subject.actorId,
          replacementTarget.combatantId,
          invocationForResolution,
          sanctuaryCheck.spatialFacts,
          spiritualWeaponForcePosition === undefined
            ? {}
            : {
                spiritualWeaponForcePositionId:
                  spiritualWeaponForcePosition.positionId,
              },
        )
      ) {
        /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
        return invalidResult(
          input.state,
          "invalidFill",
          "Sanctuary replacement spell target must be legal for the selected spell.",
        );
      }
      /* v8 ignore stop */
      const originalTargetFill = input.fills.find(
        (
          fill,
        ): fill is Extract<BattleFill, { readonly kind: "targetChoice" }> =>
          fill.kind === "targetChoice" && fill.value === target.combatantId,
      );
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (originalTargetFill === undefined) {
        /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
        return invalidResult(
          input.state,
          "invalidFill",
          "Sanctuary replacement requires the original spell target fill.",
        );
      }
      /* v8 ignore stop */
      return resolveSpellActInternal(
        {
          ...input,
          fills: [
            ...input.fills
              .filter((fill) => fill.kind !== "sanctuaryInterdictionOutcome")
              .map((fill) =>
                fill === originalTargetFill
                  ? targetChoiceFillAfterSanctuaryAttackRollReplacement({
                      fill,
                      replacement: sanctuaryCheck,
                    })
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
            ...(options.actionCostOverride === undefined
              ? {}
              : { actionCostOverride: options.actionCostOverride }),
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
    if (
      invocationForResolution.procedure === "spellAttackDamage" ||
      invocationForResolution.procedure === "heldLightHurl" ||
      invocationForResolution.procedure === "spellCreatedHeldObjectAttack" ||
      invocationForResolution.procedure === "spiritualWeaponAttackProxy" ||
      invocationForResolution.procedure === "spiritualWeaponRepeatAttack"
    ) {
      const requiredRollMode = requiredSpellAttackRollMode(
        castingState,
        subject.actorId,
        target.combatantId,
        invocationForResolution,
        fillSet.targetSpatialFacts,
      );
      if (fillSet.attackRoll == null) {
        return needsHolesResult(castingState, input.subject, [
          spellAttackRollHole(
            castingState,
            subject.actorId,
            invocationForResolution,
            requiredRollMode,
          ),
        ]);
      }
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (!attackRollResultIsValid(fillSet.attackRoll)) {
        /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
        return invalidResult(
          input.state,
          "invalidFill",
          "Spell attack roll result is outside the d20 attack-roll protocol.",
        );
      }
      /* v8 ignore stop */
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (!attackRollModeMatches(fillSet.attackRoll, requiredRollMode)) {
        /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
        return invalidResult(
          input.state,
          "invalidFill",
          "Spell attack roll mode does not match the current attack-roll rule.",
        );
      }
      /* v8 ignore stop */
      const actorBeforeSpellAttack = castingState.combatants.get(
        subject.actorId,
      );
      if (
        d20TestNaturalOneRerollRollDecisionRequired({
          actor: actorBeforeSpellAttack,
          originalNaturalD20: Number(fillSet.attackRoll.naturalD20),
          rollMode: fillSet.attackRoll.rollMode,
          rolledD20s: fillSet.attackRoll.rolledD20s,
          decision: fillSet.attackRoll.d20TestNaturalOneReroll,
        })
      ) {
        return needsHolesResult(castingState, input.subject, [
          attackRollHoleWithD20TestNaturalOneRerollOption(
            spellAttackRollHole(
              castingState,
              subject.actorId,
              invocationForResolution,
              requiredRollMode,
            ),
          ),
        ]);
      }
      const d20TestNaturalOneRerollIssue = d20TestNaturalOneRerollRollIssue({
        actor: actorBeforeSpellAttack,
        total: fillSet.attackRoll.total,
        originalNaturalD20: Number(fillSet.attackRoll.naturalD20),
        rollMode: fillSet.attackRoll.rollMode,
        rolledD20s: fillSet.attackRoll.rolledD20s,
        decision: fillSet.attackRoll.d20TestNaturalOneReroll,
        requiredRollMode,
        otherD20RerollPresent:
          fillSet.attackRoll.spellAttackReroll !== undefined,
      });
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (d20TestNaturalOneRerollIssue !== null) {
        /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
        return invalidResult(
          input.state,
          "invalidFill",
          d20TestNaturalOneRerollIssue,
        );
      }
      /* v8 ignore stop */
      const naturalOneEffectiveAttackRoll =
        effectiveD20TestNaturalOneRerollAttackRoll(fillSet.attackRoll);
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
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (spellAttackRerollIssue !== null) {
        /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
        return invalidResult(
          input.state,
          "invalidFill",
          spellAttackRerollIssue,
        );
      }
      /* v8 ignore stop */
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
        fillSet.attackRoll.spellAttackReroll?.kind === "reroll"
          ? seekingSpellRerollApplicationForAttackRoll({
              actor: actorBeforeSpellAttack,
              attackRoll: fillSet.attackRoll,
              castApplications: metamagicApplicationsForResolution ?? [],
            })
          : null;
      const metamagicApplicationsForDamageAndSpend =
        seekingApplication !== null && typeof seekingApplication !== "string"
          ? [...(metamagicApplicationsForResolution ?? []), seekingApplication]
          : metamagicApplicationsForResolution;
      const effectiveAttackRoll = effectiveSpellAttackRoll(fillSet.attackRoll);
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
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        fillSet.attackRoll.missToHitReplacementProcedureRef !== undefined &&
        missToHitReplacement === null
      ) {
        /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
        return invalidResult(
          input.state,
          "invalidFill",
          ordinaryHit
            ? "Attack-roll miss-to-hit replacement can only be selected after a miss."
            : "Attack-roll miss-to-hit replacement is not available for this spell attack roll.",
        );
      }
      /* v8 ignore stop */
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
      const attackRolledStateWithSpiritualWeaponCast = hit
        ? stateAfterSpiritualWeaponCastProxyCreatedBeforeImmediateAttack({
            state: attackRolledStateAfterHurl,
            actorId: subject.actorId,
            invocation: invocationForResolution,
            errorState: input.state,
            ...(options.actionCostOverride === undefined
              ? {}
              : { actionCostOverride: options.actionCostOverride }),
            ...(metamagicApplicationsForDamageAndSpend === undefined
              ? {}
              : {
                  metamagicApplications: metamagicApplicationsForDamageAndSpend,
                }),
            ...(spiritualWeaponForcePosition === undefined
              ? {}
              : { spiritualWeaponForcePosition }),
          })
        : {
            tag: "resolved" as const,
            state: attackRolledStateAfterHurl,
            snapshot: snapshotBattle(attackRolledStateAfterHurl),
          };
      if (attackRolledStateWithSpiritualWeaponCast.tag !== "resolved") {
        return attackRolledStateWithSpiritualWeaponCast;
      }
      const attackRolledStateBeforeHitContinuations =
        attackRolledStateWithSpiritualWeaponCast.state;
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (!hit && fillSet.mirrorImageDuplicateRoll !== undefined) {
        /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
        return invalidResult(
          input.state,
          "invalidFill",
          "Mirror Image duplicate roll is only valid after an attack-roll hit.",
        );
      }
      /* v8 ignore stop */
      if (hit) {
        const mirrorImageAttacker =
          attackRolledStateBeforeHitContinuations.combatants.get(
            subject.actorId,
          );
        if (mirrorImageAttacker === undefined) {
          return invalidResult(
            input.state,
            "missingCombatant",
            "Spell attack actor is no longer in this battle.",
          );
        }
        const mirrorImageCheck = mirrorImageHitInterceptionCheck({
          state: attackRolledStateBeforeHitContinuations,
          attacker: mirrorImageAttacker,
          target:
            attackRolledStateBeforeHitContinuations.combatants.get(
              target.combatantId,
            ) ?? target,
          targetSpatialFacts: fillSet.targetSpatialFacts,
          triggeringAttackRollHoleId: ATTACK_ROLL_HOLE_ID,
          fill: fillSet.mirrorImageDuplicateRoll,
        });
        if (mirrorImageCheck.tag === "needsHoles") {
          return needsHolesResult(
            attackRolledStateBeforeHitContinuations,
            input.subject,
            [mirrorImageCheck.hole],
          );
        }
        /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (mirrorImageCheck.tag === "invalid") {
          /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
          return invalidResult(
            input.state,
            "invalidFill",
            mirrorImageCheck.message,
          );
        }
        /* v8 ignore stop */
        if (mirrorImageCheck.tag === "hitDuplicate") {
          /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
          if (spellAttackPostMirrorImageFillsArePresent(fillSet)) {
            /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
            return invalidResult(
              input.state,
              "invalidFill",
              "Spell attack damage and after-hit fills are not valid when Mirror Image redirects the hit to a duplicate.",
            );
          }
          /* v8 ignore stop */
          if (
            invocationForResolution.procedure === "spiritualWeaponAttackProxy"
          ) {
            return {
              tag: "resolved",
              state: mirrorImageCheck.state,
              snapshot: snapshotBattle(mirrorImageCheck.state),
            };
          }
          return spendSpellActResolutionResources({
            state: mirrorImageCheck.state,
            actorId: subject.actorId,
            invocation: invocationForResolution,
            errorState: input.state,
            ...(options.actionCostOverride === undefined
              ? {}
              : { actionCostOverride: options.actionCostOverride }),
            ...(metamagicApplicationsForDamageAndSpend === undefined
              ? {}
              : {
                  metamagicApplications: metamagicApplicationsForDamageAndSpend,
                }),
            ...(spiritualWeaponForcePosition === undefined
              ? {}
              : { spiritualWeaponForcePosition }),
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
            continuation: spellReplayContinuation(input),
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
      if (
        (hit || potentCantripMiss || spellAttackHalfInitialMiss) &&
        fillSet.damageRoll == null
      ) {
        /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (!isSupportedDamageSpellInvocation(invocationForResolution)) {
          /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
          return invalidResult(
            input.state,
            "invalidFill",
            "Selected spell act does not use a damage roll.",
          );
        }
        /* v8 ignore stop */
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
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        !hit &&
        !potentCantripMiss &&
        !spellAttackHalfInitialMiss &&
        (fillSet.damageRoll != null ||
          fillSet.damageDispositions.length > 0 ||
          fillSet.sourceDamageRollPenaltyRolls.length > 0)
      ) {
        /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
        return invalidResult(
          input.state,
          "invalidFill",
          "Spell damage can only be filled after a hit.",
        );
      }
      /* v8 ignore stop */
      if (!hit && !potentCantripMiss && !spellAttackHalfInitialMiss) {
        return spendSpellActResolutionResources({
          state: attackRolledStateAfterHurl,
          actorId: subject.actorId,
          invocation: invocationForResolution,
          errorState: input.state,
          ...(options.actionCostOverride === undefined
            ? {}
            : { actionCostOverride: options.actionCostOverride }),
          ...(metamagicApplicationsForDamageAndSpend === undefined
            ? {}
            : {
                metamagicApplications: metamagicApplicationsForDamageAndSpend,
              }),
          ...(spiritualWeaponForcePosition === undefined
            ? {}
            : { spiritualWeaponForcePosition }),
        });
      }
      return {
        tag: "damageContext" as const,
        spellResolutionState,
        metamagicApplicationsForDamageAndSpend,
        attackOutcome: hit
          ? {
              tag: "spellAttackHit" as const,
              critical,
              markedDamageRiders: spellMarkedDamageRiders,
            }
          : { tag: "spellAttackMiss" as const },
      };
    } else if (fillSet.attackRoll != null) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered hole contract. */
      return invalidResult(
        input.state,
        "invalidFill",
        "Magic Missile does not use an attack roll.",
      );
    }
    return {
      tag: "damageContext" as const,
      spellResolutionState: castingState,
      metamagicApplicationsForDamageAndSpend:
        metamagicApplicationsForResolution,
      attackOutcome: { tag: "notSpellAttack" as const },
    };
  })();
  if (spellDamageContext.tag !== "damageContext") {
    return spellDamageContext;
  }
  const {
    spellResolutionState,
    metamagicApplicationsForDamageAndSpend,
    attackOutcome,
  } = spellDamageContext;
  const spellAttackHitOutcome =
    attackOutcome.tag === "spellAttackHit" ? attackOutcome : null;
  const spellAttackHit = spellAttackHitOutcome !== null;
  const critical = spellAttackHitOutcome?.critical ?? false;
  const spellMarkedDamageRiders =
    spellAttackHitOutcome?.markedDamageRiders ?? [];

  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!isSupportedDamageSpellInvocation(invocationForResolution)) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Selected spell act does not use a damage roll.",
    );
  }
  /* v8 ignore stop */
  const damageInvocation = transmutedSpellDamageInvocation(
    invocationForResolution,
    metamagicApplicationsForDamageAndSpend,
  );
  if (fillSet.damageRoll == null) {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fillSet.sourceDamageRollPenaltyRolls.length > 0) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        "Source damage roll penalty does not match an active source-side damage penalty.",
      );
    }
    /* v8 ignore stop */
    return needsHolesResult(castingState, input.subject, [
      spellDamageHoleWithEmpoweredOption(
        castingState,
        subject.actorId,
        damageInvocation,
        false,
        metamagicApplicationsForDamageAndSpend ?? [],
      ),
    ]);
  }
  const spellDamageBaseStateResult =
    stateAfterSpiritualWeaponCastProxyCreatedBeforeImmediateAttack({
      state: spellResolutionState,
      actorId: subject.actorId,
      invocation: invocationForResolution,
      errorState: input.state,
      ...(spiritualWeaponForcePosition === undefined
        ? {}
        : { spiritualWeaponForcePosition }),
    });
  if (spellDamageBaseStateResult.tag !== "resolved") {
    return spellDamageBaseStateResult;
  }
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
    fillSet.damageRoll,
    damageInvocation,
    spellAttackHit && critical,
    spellMarkedDamageRiders,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (originalDamageValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", originalDamageValidation);
  }
  /* v8 ignore stop */
  const empoweredRerollIssue = empoweredSpellDamageRerollValidationIssue({
    actor: spellDamageBaseState.combatants.get(subject.actorId),
    invocation: damageInvocation,
    damageRoll: fillSet.damageRoll,
    castApplications: metamagicApplicationsForDamageAndSpend ?? [],
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (empoweredRerollIssue !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", empoweredRerollIssue);
  }
  /* v8 ignore stop */
  const empoweredApplication =
    fillSet.damageRoll.spellDamageReroll?.kind === "reroll"
      ? empoweredSpellRerollApplicationForDamageRoll({
          actor: spellDamageBaseState.combatants.get(subject.actorId),
          damageRoll: fillSet.damageRoll,
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
  const effectiveDamageRoll = effectiveEmpoweredSpellDamageRoll(
    fillSet.damageRoll,
  );
  const effectiveDamageValidation =
    effectiveDamageRoll === fillSet.damageRoll
      ? null
      : validateSpellDamageFill(
          effectiveDamageRoll,
          damageInvocation,
          spellAttackHit && critical,
          spellMarkedDamageRiders,
        );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (effectiveDamageValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", effectiveDamageValidation);
  }
  /* v8 ignore stop */
  const spellReductionRoll = spellDamageReductionRollForTarget(
    fillSet.spellDamageReductionRolls,
    target,
  );
  const spellDamageByType = spellDamageByTypeForTarget(
    target,
    damageInvocation,
    effectiveDamageRoll,
    spellDamageResult,
    spellMarkedDamageRiders,
    spellAttackHit && critical,
  );
  const damageSource = spellDamageBaseState.combatants.get(subject.actorId);
  const expectedSourcePenaltyHole =
    sourceDamageRollPenaltyRollHoleForDamageRoll(
      damageSource,
      spellDamageByType,
      effectiveDamageRoll.holeId,
    );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    unexpectedSourceDamageRollPenaltyRoll(
      fillSet.sourceDamageRollPenaltyRolls,
      expectedSourcePenaltyHole === null ? [] : [expectedSourcePenaltyHole],
    ) !== undefined
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  /* v8 ignore stop */
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (sourcePenalty.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  /* v8 ignore stop */
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (spellReduction.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Spell damage reduction roll does not match an unused matching damage-reduction spell effect.",
    );
  }
  /* v8 ignore stop */
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (concentrationSaveCheck.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      concentrationSaveCheck.message,
    );
  }
  /* v8 ignore stop */
  const damageDispositionHole = zeroHitPointReplacementDispositionHole({
    damageSourceId: subject.actorId,
    target: spellReduction.target,
    damageAmount: spellDamageAmount,
  });
  const damageDispositionValidation = damageDispositionFillsValidation({
    holes: damageDispositionHole === null ? [] : [damageDispositionHole],
    fills: fillSet.damageDispositions,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageDispositionValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      damageDispositionValidation,
    );
  }
  /* v8 ignore stop */
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
  const hideousLaughterSaveCheck =
    damageLifecycleHideousLaughterDamageRepeatSaveFillCheck({
      state: spellDamageBaseState,
      target: spellReduction.target,
      damageAmount: spellDamageAmount,
      fills: fillSet.hideousLaughterDamageRepeatSaves,
    });
  if (hideousLaughterSaveCheck.tag === "needsHoles") {
    return needsHolesResult(spellDamageBaseState, input.subject, [
      ...hideousLaughterSaveCheck.holes,
    ]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (hideousLaughterSaveCheck.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      hideousLaughterSaveCheck.message,
    );
  }
  /* v8 ignore stop */
  const damageDisposition = damageDispositionForTarget(
    damageDispositionHole === null ? [] : [damageDispositionHole],
    fillSet.damageDispositions,
    target.combatantId,
  );
  const relationshipCheck = damageRelationshipDecisionFillCheck({
    state: spellDamageBaseState,
    damageEventHoleId: fillSet.damageRoll.holeId,
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (relationshipCheck.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", relationshipCheck.message);
  }
  /* v8 ignore stop */
  const damaged = applySpellDamage(
    spellDamageBaseState,
    target.combatantId,
    damageInvocation,
    effectiveDamageRoll,
    spellAttackHit && critical,
    {
      concentrationSavingThrow: concentrationFill,
      wardingBondDamageShareConcentrationSavingThrows:
        fillSet.concentrationSavingThrows,
      damageDisposition,
      spellMarkedDamageRiders,
      sourceDamageRollPenaltyRoll,
      spellDamageReductionRoll: spellReductionRoll,
      hideousLaughterDamageRepeatSaves:
        fillSet.hideousLaughterDamageRepeatSaves,
      damageSourceId: subject.actorId,
      saveDamageResult: spellDamageResult,
      spatialFacts: fillSet.targetSpatialFacts,
      ...(relationshipCheck.decisions === undefined
        ? {}
        : { relationshipDecisions: relationshipCheck.decisions }),
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
    invocationForResolution.procedure === "spiritualWeaponAttackProxy"
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
          ...(options.actionCostOverride === undefined
            ? {}
            : { actionCostOverride: options.actionCostOverride }),
          ...(metamagicApplicationsAfterEmpowered === undefined
            ? {}
            : {
                metamagicApplications: metamagicApplicationsAfterEmpowered,
              }),
          ...(spiritualWeaponForcePosition === undefined
            ? {}
            : { spiritualWeaponForcePosition }),
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

function stateAfterResolvedHeldLightHurl(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation,
): BattleState {
  return invocation.procedure === "heldLightHurl"
    ? endHeldLightSpellEffect(state, actorId, invocation)
    : state;
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

function stateAfterSpiritualWeaponCastProxyCreatedBeforeImmediateAttack(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation;
  readonly errorState: BattleState;
  readonly spiritualWeaponForcePosition?: Extract<
    BattleFill,
    { readonly kind: "spiritualWeaponForcePosition" }
  >["value"];
}): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  if (input.invocation.procedure !== "spiritualWeaponAttackProxy") {
    return {
      tag: "resolved",
      state: input.state,
      snapshot: snapshotBattle(input.state),
    };
  }
  return spendSpellActResolutionResources(input);
}

function spiritualWeaponProxyEffectMatches(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation:
    | Extract<
        BattleExecutableSpellInvocation,
        { readonly procedure: "spiritualWeaponAttackProxy" }
      >
    | Extract<
        BattleExecutableSpellInvocation,
        { readonly procedure: "spiritualWeaponRepeatAttack" }
      >;
  readonly forcePositionId: Extract<
    BattleFill,
    { readonly kind: "spiritualWeaponForcePosition" }
  >["value"]["positionId"];
}): boolean {
  const actor = input.state.combatants.get(input.actorId);
  return (
    actor?.activeEffects.some(
      (effect) =>
        effect.kind === "spiritualWeapon" &&
        effect.sourceProcedureRef === input.invocation.sourceProcedureRef &&
        effect.sourceCombatantId === input.actorId &&
        effect.forcePositionId === input.forcePositionId,
    ) === true
  );
}

function spiritualWeaponCastCommitAlreadyApplied(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "spiritualWeaponAttackProxy" }
  >;
  readonly forcePositionId: Extract<
    BattleFill,
    { readonly kind: "spiritualWeaponForcePosition" }
  >["value"]["positionId"];
}): boolean {
  const actor = input.state.combatants.get(input.actorId);
  return (
    input.state.currentTurnResources.currentHasBonusAction === false &&
    input.state.currentTurnResources.spellSlotUsesThisTurn.some(
      (use) => use.kind === "committed" && use.combatantId === input.actorId,
    ) &&
    actor?.concentration?.effectKind === "spellEffect" &&
    actor.concentration.sourceProcedureRef ===
      input.invocation.sourceProcedureRef &&
    spiritualWeaponProxyEffectMatches(input)
  );
}

function spiritualWeaponRepeatCommitAlreadyApplied(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "spiritualWeaponRepeatAttack" }
  >;
  readonly forcePositionId: Extract<
    BattleFill,
    { readonly kind: "spiritualWeaponForcePosition" }
  >["value"]["positionId"];
}): boolean {
  return (
    input.state.currentTurnResources.currentHasBonusAction === false &&
    spiritualWeaponProxyEffectMatches(input)
  );
}

function spiritualWeaponResolutionCommitAlreadyApplied(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation;
  readonly fills: readonly BattleFill[];
}): boolean {
  if (
    input.invocation.procedure !== "spiritualWeaponAttackProxy" &&
    input.invocation.procedure !== "spiritualWeaponRepeatAttack"
  ) {
    return false;
  }
  const fillSet = spellFillSet(
    input.fills,
    input.invocation,
    input.invocation.sourceProcedureRef,
    input.actorId,
    input.state,
  );
  if (
    fillSet.tag !== "ok" ||
    fillSet.spiritualWeaponForcePosition === undefined
  ) {
    return false;
  }
  if (input.invocation.procedure === "spiritualWeaponAttackProxy") {
    return spiritualWeaponCastCommitAlreadyApplied({
      state: input.state,
      actorId: input.actorId,
      invocation: input.invocation,
      forcePositionId: fillSet.spiritualWeaponForcePosition.positionId,
    });
  }
  return spiritualWeaponRepeatCommitAlreadyApplied({
    state: input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    forcePositionId: fillSet.spiritualWeaponForcePosition.positionId,
  });
}

function spiritualWeaponRepeatIsLaterTurn(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "spiritualWeaponRepeatAttack" }
  >;
}): boolean {
  return (
    input.actorId !== input.invocation.activeEffect.startedOn.actorId ||
    input.state.initiative.round !==
      input.invocation.activeEffect.startedOn.round
  );
}

function spiritualWeaponRepeatTargetingInvalidReason(
  invocation: BattleExecutableSpellInvocation,
  targetId: CombatantId,
): string | null {
  if (invocation.procedure !== "spiritualWeaponRepeatAttack") {
    return null;
  }
  const repeatTargeting = invocation.activeEffect.repeatTargeting;
  if (repeatTargeting.kind === "unrestricted") {
    return null;
  }
  return repeatTargeting.combatantId === targetId
    ? null
    : "Glyph-stored Spiritual Weapon repeat attacks must target the triggering creature.";
}

function spendSpellActResolutionResources(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation;
  readonly errorState: BattleState;
  readonly actionCostOverride?: "magicAction" | "bonusAction";
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
  readonly spiritualWeaponForcePosition?: Extract<
    BattleFill,
    { readonly kind: "spiritualWeaponForcePosition" }
  >["value"];
}): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  if (input.invocation.procedure === "spiritualWeaponAttackProxy") {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (
      input.spiritualWeaponForcePosition === undefined ||
      input.spiritualWeaponForcePosition.mode !== "cast"
    ) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.errorState,
        "invalidFill",
        "Spiritual Weapon cast requires a table-supplied force position.",
      );
    }
    /* v8 ignore stop */
    if (
      spiritualWeaponCastCommitAlreadyApplied({
        state: input.state,
        actorId: input.actorId,
        invocation: input.invocation,
        forcePositionId: input.spiritualWeaponForcePosition.positionId,
      })
    ) {
      return {
        tag: "resolved",
        state: input.state,
        snapshot: snapshotBattle(input.state),
      };
    }
    const spent = spendSpellCastResources({
      state: input.state,
      actorId: input.actorId,
      invocation: input.invocation,
      errorState: input.errorState,
      ...(input.actionCostOverride === undefined
        ? {}
        : { actionCostOverride: input.actionCostOverride }),
      ...(input.metamagicApplications === undefined
        ? {}
        : { metamagicApplications: input.metamagicApplications }),
    });
    if (spent.tag !== "resolved") {
      return spent;
    }
    const nextState = applySpiritualWeaponAttackProxyEffect({
      state: spent.state,
      actorId: input.actorId,
      forcePositionId: input.spiritualWeaponForcePosition.positionId,
      repeatTargeting: { kind: "unrestricted" },
      invocation: input.invocation,
    });
    return {
      tag: "resolved",
      state: nextState,
      snapshot: snapshotBattle(nextState),
    };
  }
  if (input.invocation.procedure === "spiritualWeaponRepeatAttack") {
    if (
      !spiritualWeaponRepeatIsLaterTurn({
        state: input.state,
        actorId: input.actorId,
        invocation: input.invocation,
      })
    ) {
      return invalidResult(
        input.errorState,
        "staleSubject",
        "Spiritual Weapon repeat attack is only available on later turns.",
      );
    }
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (
      input.spiritualWeaponForcePosition === undefined ||
      input.spiritualWeaponForcePosition.mode !== "reposition"
    ) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.errorState,
        "invalidFill",
        "Spiritual Weapon repeat attack requires a table-supplied reposition.",
      );
    }
    /* v8 ignore stop */
    if (
      spiritualWeaponRepeatCommitAlreadyApplied({
        state: input.state,
        actorId: input.actorId,
        invocation: input.invocation,
        forcePositionId: input.spiritualWeaponForcePosition.positionId,
      })
    ) {
      return {
        tag: "resolved",
        state: input.state,
        snapshot: snapshotBattle(input.state),
      };
    }
    const spellAttackState = battleStateAfterTargetActionEarlyEndForActor(
      input.state,
      input.actorId,
    );
    const spent = spendActivationResource(
      spellAttackState.currentTurnResources,
      { kind: "bonusAction" },
    );
    if (Either.isLeft(spent)) {
      return invalidResult(
        input.errorState,
        "staleSubject",
        "Bonus Action spell is no longer available for the current actor.",
      );
    }
    const repositioned = repositionSpiritualWeaponAttackProxyEffect({
      state: {
        ...spellAttackState,
        currentTurnResources:
          clearPendingAttackRollMissToHitReplacementSelection(
            spent.right,
            input.actorId,
          ),
      },
      invocation: input.invocation,
      forcePositionId: input.spiritualWeaponForcePosition.positionId,
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
  const spellAttackState = battleStateAfterTargetActionEarlyEndForActor(
    input.state,
    input.actorId,
  );
  const spent = spendAction(spellAttackState.currentTurnResources, "magic");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.errorState,
      "staleSubject",
      "Magic action is no longer available for the current actor.",
    );
  }
  const nextState = {
    ...spellAttackState,
    currentTurnResources: clearPendingAttackRollMissToHitReplacementSelection(
      spent.right,
      input.actorId,
    ),
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveSpellAttackDamageObjectTarget(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation:
    | Extract<
        BattleExecutableSpellInvocation,
        { readonly procedure: "heldLightHurl" }
      >
    | Extract<
        RuntimeExecutableDamageSpellProcedure,
        { readonly procedure: "spellAttackDamage" }
      >;
  readonly actionCostOverride?: SpellProcedureActionCostOverride;
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }> & {
    readonly objectTarget: NonNullable<
      Extract<SpellFillSet, { readonly tag: "ok" }>["objectTarget"]
    >;
  };
}): BattleResolutionResult {
  const objectFact = spellObjectTargetFact(
    input.fillSet.objectTarget.spatialFacts.filter(
      (
        fact,
      ): fact is Extract<
        (typeof input.fillSet.objectTarget.spatialFacts)[number],
        { readonly kind: "spellObjectTarget" }
      > => fact.kind === "spellObjectTarget",
    ),
    input.actorId,
    input.fillSet.objectTarget.objectId,
    input.invocation,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (objectFact === null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell object target must include a matching table-supplied range and object Armor Class fact.",
    );
  }
  /* v8 ignore stop */
  const damageInvocation = transmutedSpellDamageInvocation(
    input.invocation,
    input.metamagicApplications,
  );
  const sightFact = spellObjectTargetSightFact(
    input.fillSet.objectTarget.spatialFacts.filter(
      (
        fact,
      ): fact is Extract<
        (typeof input.fillSet.objectTarget.spatialFacts)[number],
        { readonly kind: "spellObjectTargetSight" }
      > => fact.kind === "spellObjectTargetSight",
    ),
    input.actorId,
    input.fillSet.objectTarget.objectId,
    input.invocation,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    sightFact === null &&
    objectTargetAttackNeedsSightFact(
      input.input.state,
      input.fillSet.objectTarget.objectId,
    )
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell object target must include a matching table-supplied object sight fact.",
    );
  }
  /* v8 ignore stop */
  const ignitionFact =
    input.invocation.procedure === "spellAttackDamage" &&
    input.invocation.objectHitEffect.kind === "igniteFlammableUnattended"
      ? spellObjectIgnitionFact(
          input.fillSet.objectTarget.spatialFacts.filter(
            (
              fact,
            ): fact is Extract<
              (typeof input.fillSet.objectTarget.spatialFacts)[number],
              { readonly kind: "spellObjectIgnition" }
            > => fact.kind === "spellObjectIgnition",
          ),
          input.actorId,
          input.fillSet.objectTarget.objectId,
          input.invocation,
        )
      : null;
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.invocation.procedure === "spellAttackDamage" &&
    input.invocation.objectHitEffect.kind === "igniteFlammableUnattended" &&
    ignitionFact === null
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell object target must include a matching table-supplied object ignition fact.",
    );
  }
  /* v8 ignore stop */

  const spellCastReactionWindow = maybeOpenInterruptWindow(
    input.input.state,
    spellCastInterruptFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: [],
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: spellCastingTimeResourceForSpellCast({
        invocation: input.invocation,
        ...(input.actionCostOverride === undefined
          ? {}
          : { actionCostOverride: input.actionCostOverride }),
      }),
      ...spellCastMetamagicApplicationsInput(input.metamagicApplications ?? []),
      continuation: spellReplayContinuation(input.input),
    }),
    input.input.handledInterruptTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const requiredRollMode = requiredSpellObjectTargetAttackRollMode(
    input.input.state,
    input.actorId,
    input.invocation,
    input.fillSet.objectTarget.objectId,
    sightFact?.attackerCanSeeObject,
  );
  if (input.fillSet.attackRoll == null) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellObjectAttackRollHole(input.invocation, requiredRollMode),
    ]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!attackRollResultIsValid(input.fillSet.attackRoll)) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell attack roll result is outside the d20 attack-roll protocol.",
    );
  }
  /* v8 ignore stop */
  const spellAttackRerollIssue = spellAttackRerollUnsupportedIssue(
    input.fillSet.attackRoll,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (spellAttackRerollIssue !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      spellAttackRerollIssue,
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!attackRollModeMatches(input.fillSet.attackRoll, requiredRollMode)) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell attack roll mode does not match the current attack-roll rule.",
    );
  }
  /* v8 ignore stop */
  if (
    d20TestNaturalOneRerollRollDecisionRequired({
      actor: input.input.state.combatants.get(input.actorId),
      originalNaturalD20: Number(input.fillSet.attackRoll.naturalD20),
      rollMode: input.fillSet.attackRoll.rollMode,
      rolledD20s: input.fillSet.attackRoll.rolledD20s,
      decision: input.fillSet.attackRoll.d20TestNaturalOneReroll,
    })
  ) {
    return needsHolesResult(input.input.state, input.input.subject, [
      attackRollHoleWithD20TestNaturalOneRerollOption(
        spellObjectAttackRollHole(input.invocation, requiredRollMode),
      ),
    ]);
  }
  const d20TestNaturalOneRerollIssue = d20TestNaturalOneRerollRollIssue({
    actor: input.input.state.combatants.get(input.actorId),
    total: input.fillSet.attackRoll.total,
    originalNaturalD20: Number(input.fillSet.attackRoll.naturalD20),
    rollMode: input.fillSet.attackRoll.rollMode,
    rolledD20s: input.fillSet.attackRoll.rolledD20s,
    decision: input.fillSet.attackRoll.d20TestNaturalOneReroll,
    requiredRollMode,
    otherD20RerollPresent:
      input.fillSet.attackRoll.spellAttackReroll !== undefined,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (d20TestNaturalOneRerollIssue !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      d20TestNaturalOneRerollIssue,
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.attackRoll.activatedOngoingFeatureProcedureRef !==
      undefined ||
    input.fillSet.attackRoll.missToHitReplacementProcedureRef !== undefined
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Object-target spell attacks do not use combatant attack-roll feature selections.",
    );
  }
  /* v8 ignore stop */

  const effectiveAttackRoll = effectiveD20TestNaturalOneRerollAttackRoll(
    input.fillSet.attackRoll,
  );
  const hit = attackRollHits(effectiveAttackRoll, objectFact.armorClass);
  const critical = attackRollIsCriticalHit(effectiveAttackRoll);
  const attackRolledState = consumeSelfAttackRollEffects(
    {
      ...input.input.state,
      currentTurnResources: {
        ...input.input.state.currentTurnResources,
        attackRollMadeThisTurn: true,
      },
    },
    input.actorId,
  );
  const remarkableAthleteMovement = resolveRemarkableAthleteCriticalHitMovement(
    {
      state: attackRolledState,
      subject: input.input.subject,
      attackerId: input.actorId,
      scoredCriticalHit: hit && critical,
      fills: input.fillSet,
    },
  );
  if (remarkableAthleteMovement.tag === "result") {
    return remarkableAthleteMovement.result;
  }
  const postRemarkableAthleteMovementState = remarkableAthleteMovement.state;
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !hit &&
    (input.fillSet.damageRoll != null ||
      input.fillSet.damageDispositions.length > 0 ||
      input.fillSet.sourceDamageRollPenaltyRolls.length > 0)
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell damage can only be filled after a hit.",
    );
  }
  /* v8 ignore stop */
  if (!hit) {
    return spendSpellCastResources({
      state: stateAfterResolvedHeldLightHurl(
        postRemarkableAthleteMovementState,
        input.actorId,
        input.invocation,
      ),
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
  }
  if (input.fillSet.damageRoll == null) {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (input.fillSet.sourceDamageRollPenaltyRolls.length > 0) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Source damage roll penalty does not match an active source-side damage penalty.",
      );
    }
    /* v8 ignore stop */
    return needsHolesResult(
      postRemarkableAthleteMovementState,
      input.input.subject,
      [spellDamageHole(damageInvocation, critical)],
    );
  }
  const damageValidation = validateSpellDamageFill(
    input.fillSet.damageRoll,
    damageInvocation,
    critical,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.input.state, "invalidFill", damageValidation);
  }
  /* v8 ignore stop */
  const spellDamageRerollIssue = spellDamageRerollUnsupportedIssue(
    input.fillSet.damageRoll,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (spellDamageRerollIssue !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      spellDamageRerollIssue,
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.spellDamageReductionRolls.length > 0
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Object-target spell damage does not use combatant damage, Concentration, or spell-reduction fills.",
    );
  }
  /* v8 ignore stop */
  const objectDamageByType = spellObjectDamageByType(
    damageInvocation,
    input.fillSet.damageRoll,
  );
  const objectDamageSource = postRemarkableAthleteMovementState.combatants.get(
    input.actorId,
  );
  const expectedSourcePenaltyHole =
    sourceDamageRollPenaltyRollHoleForDamageRoll(
      objectDamageSource,
      objectDamageByType,
      input.fillSet.damageRoll.holeId,
    );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    unexpectedSourceDamageRollPenaltyRoll(
      input.fillSet.sourceDamageRollPenaltyRolls,
      expectedSourcePenaltyHole === null ? [] : [expectedSourcePenaltyHole],
    ) !== undefined
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  /* v8 ignore stop */
  const sourceDamageRollPenaltyRoll = sourceDamageRollPenaltyRollForDamageRoll(
    input.fillSet.sourceDamageRollPenaltyRolls,
    objectDamageSource,
    objectDamageByType,
    input.fillSet.damageRoll.holeId,
  );
  const sourcePenalty = applyAvailableSourceDamageRollPenalty(
    objectDamageSource,
    objectDamageByType,
    input.fillSet.damageRoll.holeId,
    sourceDamageRollPenaltyRoll,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (sourcePenalty.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  /* v8 ignore stop */
  if (sourcePenalty.tag === "needsHoles") {
    return needsHolesResult(
      postRemarkableAthleteMovementState,
      input.input.subject,
      [...sourcePenalty.holes],
    );
  }

  const lit = applySpellLightEmitterEffects(
    postRemarkableAthleteMovementState,
    input.actorId,
    { kind: "object", objectId: input.fillSet.objectTarget.objectId },
    input.invocation,
  );
  const spentResources = spendSpellCastResources({
    state: stateAfterResolvedHeldLightHurl(
      lit,
      input.actorId,
      input.invocation,
    ),
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
  if (spentResources.tag !== "resolved") {
    return spentResources;
  }
  const objectDamage = spellObjectDamageOutcomeFromDamageByType({
    objectId: input.fillSet.objectTarget.objectId,
    damageType: damageInvocation.damage.damageType,
    damageByType: sourcePenalty.damageByType,
    disposition: objectFact.damageDisposition,
  });
  const objectIgnitions =
    ignitionFact?.disposition.kind === "flammableUnattended"
      ? [
          {
            kind: "startsBurning" as const,
            objectId: input.fillSet.objectTarget.objectId,
            sourceCombatantId: input.actorId,
            sourceProcedureRef: input.invocation.sourceProcedureRef,
          },
        ]
      : [];

  return {
    tag: "resolved",
    state: spentResources.state,
    snapshot: snapshotBattle(spentResources.state),
    objectDamages: [objectDamage],
    ...(objectIgnitions.length === 0 ? {} : { objectIgnitions }),
  };
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
  const spiritualWeaponCommitAlreadyApplied =
    spiritualWeaponResolutionCommitAlreadyApplied({
      state: input.state,
      actorId: subject.actorId,
      invocation,
      fills: input.fills,
    });
  if (
    !spiritualWeaponCommitAlreadyApplied &&
    !spellHasAvailableSpend(actor, invocation)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bonus Action spell act no longer has its required runtime spell resource.",
    );
  }
  if (
    !spiritualWeaponCommitAlreadyApplied &&
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
    !spiritualWeaponCommitAlreadyApplied &&
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
  const resolveSlowSomaticFailurePhase = () =>
    resolveSlowSomaticSpellFailure({
      state: input.state,
      castingState,
      subject,
      actorId: subject.actorId,
      invocation,
      fills: input.fills,
      ...(actionCostOverride === undefined ? {} : { actionCostOverride }),
      metamagicApplications: invocationAdmission.applications,
    });
  if (invocation.procedure === "weaponAttackOverride") {
    const parsedFillInput = parseWeaponAttackOverrideFillInput(
      fillsAfterSlowSomaticSpellFailureOutcome(input.fills),
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (parsedFillInput.tag === "invalid") {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(input.state, "invalidFill", parsedFillInput.message);
    }
    /* v8 ignore stop */
    const slowSomaticSpellFailure = resolveSlowSomaticFailurePhase();
    if (slowSomaticSpellFailure.tag !== "continue") {
      return slowSomaticSpellFailure;
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
  const slowSomaticSpellFailure = resolveSlowSomaticFailurePhase();
  if (slowSomaticSpellFailure.tag !== "continue") {
    return slowSomaticSpellFailure;
  }
  const fillSet = spellFillSet(
    input.fills,
    invocation,
    invocation.sourceProcedureRef,
    subject.actorId,
    input.state,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  /* v8 ignore stop */
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
        ...(actionCostOverride === undefined ? {} : { actionCostOverride }),
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

/* v8 ignore start -- Defensive stale-subject recovery: legal rediscovery removes repeat spell acts while Antimagic Field suppresses their source effect. */
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
    procedure === "spiritualWeaponRepeatAttack"
  );
}
/* v8 ignore stop */

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
  if (
    actor?.origin.kind !== "character" ||
    invocation?.procedure !== "expeditiousRetreatDash"
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Bonus Action Dash spell act requires a supported Expeditious Retreat spell.",
    );
  }
  const castingState =
    spellInvocationIsSpellcasting(invocation) &&
    invocation.spellRuleFacts.components.verbal
      ? revealHidden(input.state, subject.actorId)
      : input.state;
  const slowSomaticSpellFailure = resolveSlowSomaticSpellFailure({
    state: input.state,
    castingState,
    subject,
    actorId: subject.actorId,
    invocation,
    fills: input.fills,
  });
  if (slowSomaticSpellFailure.tag !== "continue") {
    return slowSomaticSpellFailure;
  }
  const fillSet = spellFillSet(
    input.fills,
    invocation,
    invocation.sourceProcedureRef,
    subject.actorId,
    input.state,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  /* v8 ignore stop */
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
