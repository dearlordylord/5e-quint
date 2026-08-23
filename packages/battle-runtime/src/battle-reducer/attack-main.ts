// Main Attack action resolution extracted from attack-resolution.ts.

// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// KERNEL-COVERAGE: runtime-owner BATTLE.ATTACK.ORDINARY_OBJECT_PROCEDURE BATTLE.DAMAGE.ATTACK_BRANCHES BATTLE.DAMAGE.OBJECT_DAMAGE_TRANSITION
// KERNEL-COVERAGE: runtime-owner BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING
// KERNEL-COVERAGE: runtime-owner BATTLE.PROTOCOL.CONCENTRATION_BREAK_TEARDOWN
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.brutal-strike unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.grappler unit-feature.hunters-prey unit-feature.open-hand-technique unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.remarkable-athlete unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.stunning-strike unit-feature.weapon-damage-dice-roll-choice unit-feature.weapon-mastery-sap unit-feature.weapon-mastery-topple unit-feature.weapon-mastery-cleave unit-feature.weapon-mastery-push unit-feature.weapon-mastery-slow unit-feature.fighter-tactical-master unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-weapon-damage-rider spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.d20-test-natural-one-reroll
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.cunning-strike
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.cunning-strike-option-grant

import {
  nonEmptyArrayProperty,
  optionalProperty,
} from "../optional-property.ts";
import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import { Match } from "effect";

import { attackRollResultIsValid } from "@dnd/shared-algebras/attack-roll-algebra";

import {
  damageAmount as toDamageAmount,
  movementFeet,
} from "@dnd/shared/types";

import {
  attackActionOptionForSubject,
  attackDamageDispositionHole,
  attackDamageHole,
  damageDispositionFillValidation,
} from "./attack-damage-apply.ts";
import {
  ATTACK_ROLL_REQUIRED_BEFORE_DAMAGE_MESSAGE,
  ATTACK_TARGET_REQUIRED_BEFORE_ROLL_OR_DAMAGE_MESSAGE,
} from "./attack-ordering-messages.ts";
import {
  attackRollHoleWithD20TestNaturalOneRerollOption,
  d20TestNaturalOneRerollRollDecisionRequired,
  d20TestNaturalOneRerollRollIssue,
  effectiveD20TestNaturalOneRerollAttackRoll,
} from "./d20-test-natural-one-reroll.ts";

import {
  attackRollHole,
  attackRollModeMatches,
  attackRollModeWithOptionalOngoingFeature,
  attackRollOngoingFeatureActivationProfile,
  attackRollOngoingFeatureActivations,
  consumeSelfAttackRollEffects,
  weaponMasteryCleaveAttackRollHole,
  weaponMasteryCleaveDamageHole,
  weaponMasteryCleaveDecisionHole,
  weaponMasteryCleaveExtraAttack,
  weaponMasteryCleaveTargetHole,
  weaponMasteryCleaveTargetIsLegal,
  huntersPreyHordeBreakerAttackRollHole,
  huntersPreyHordeBreakerDamageHole,
  huntersPreyHordeBreakerDecisionHole,
  huntersPreyHordeBreakerSelection,
  huntersPreyHordeBreakerTargetHole,
  huntersPreyHordeBreakerTargetIsLegal,
  recordHuntersPreyHordeBreakerUsed,
  applyWeaponMasteryPushOnHit,
  applyWeaponMasterySlowAfterDamage,
  applyWeaponMasteryToppleSavingThrow,
  applyWeaponMasterySapOnHit,
  consumeHelpAttackForAttackRoll,
  recordWeaponMasteryCleaveUsed,
  recordAttackRollOngoingFeatures,
  ongoingFeatureEnemyRelationshipDecisionRequired,
  requiredAttackRollMode,
  requiredOrdinaryObjectAttackRollMode,
  tacticalMasterAttackWithReplacement,
  tacticalMasterReplacementDecisionHole,
} from "./attack-roll.ts";
import { weaponMasteryToppleSavingThrowHole } from "./weapon-mastery-topple-hole.ts";

import {
  activeEffectArmorClass,
  activeOngoingFeatureOccurrencesForCombatant,
  ongoingFeatureProfileForSourceKey,
} from "./creature-state-execution.ts";

import {
  applyAttackDamageAmount,
  concentrationSavingThrowHole,
  damageLifecycleConcentrationSavingThrowFillCheck,
  damageLifecycleHideousLaughterDamageRepeatSaveFillCheck,
} from "./damage-apply.ts";
import { damageRelationshipDecisionFillCheck } from "./damage-relationship-decisions.ts";

import {
  activeMarkedDamageRiders,
  activeSpellWeaponDamageRiders,
  applyAvailableSpellDamageReduction,
  applyAvailableSourceDamageRollPenalty,
  attackDamageByTypeEntries,
  damageAmountByTypeAfterTargetAdjustments,
  damageAmountByTypeEntriesToMap,
  damageAmountByTypeMapEntries,
  fixedAttackDamageByTypeEntries,
  isSourceDamageRollPenaltyRollFill,
  ongoingFeatureDamageModifier,
  prospectiveAttackDamageTypes,
  sourceDamageRollPenaltyRollHoleForDamageRoll,
  sourceDamageRollPenaltyRollForDamageRoll,
  sourceDamageRollPenaltyRollFillMatchesDamageRoll,
  unexpectedSourceDamageRollPenaltyRoll,
} from "./damage-helpers.ts";

import {
  attackDamageEventAfterPendingReductions,
  attackDamageEventAmountBeforeTargetAdjustments,
  attackDamageEventAmountForTarget,
  attackDamageEventEntries,
  attackDamageEventWithEntries,
  attackDamageInterruptionFrame,
  battleAttackHostParticipantId,
  attackFillsForAttackHitReplay,
} from "./attack-damage-events.ts";
import { resolveAttackDamageReductionZeroDamageRedirectAfterReduction } from "./attack-damage-redirect.ts";
import { resumeInterruptedProcedure } from "./interrupt-continuation.ts";
import {
  resolveAttackFollowUpContinuations,
  type BattleAttackResolvers,
} from "./attack-resolvers.ts";
import { maybeOpenInterruptWindow } from "./interrupt-execution.ts";
import { snapshotBattle } from "./battle-snapshot.ts";

import {
  attackTargetHole,
  grappleOutcomeHole,
  ordinaryAttackTargetHole,
  ordinaryObjectAttackOptionIsSupported,
  revealHidden,
} from "./hole-helpers.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { reactionSpellTargetFactsForAfterDamage } from "./reaction-triggered-spells.ts";

import {
  attackHitTriggerKind,
  attackKindForDeflectRedirect,
  attackTargetDistanceFeet,
  attackTargetIsLegal,
  effectiveMovementSpeed,
  grappleLinkForTarget,
  representedMovementSpeedKinds,
} from "./movement-speed.ts";
import { applyBattleMovement } from "./battle-movement.ts";
import { parseBattleMovement } from "./movement-procedures.ts";

import { attackFillSet, selectedAttackFillSet } from "./attack-fill-set.ts";
import {
  GRAPPLER_PUNCH_AND_GRAB_DECISION_HOLE_ID,
  GRAPPLER_PUNCH_AND_GRAB_DECISION_HOLE_INSTANCE,
  WEAPON_MASTERY_CLEAVE_DECISION_HOLE_ID,
  WEAPON_MASTERY_CLEAVE_DAMAGE_HOLE_ID,
  WEAPON_MASTERY_CLEAVE_DAMAGE_DISPOSITION_HOLE_ID,
  WEAPON_MASTERY_CLEAVE_DAMAGE_DISPOSITION_HOLE_INSTANCE,
  HUNTERS_PREY_HORDE_BREAKER_DECISION_HOLE_ID,
  HUNTERS_PREY_HORDE_BREAKER_DAMAGE_HOLE_ID,
  HUNTERS_PREY_HORDE_BREAKER_DAMAGE_DISPOSITION_HOLE_ID,
  HUNTERS_PREY_HORDE_BREAKER_DAMAGE_DISPOSITION_HOLE_INSTANCE,
  BRUTAL_STRIKE_DECISION_HOLE_ID,
  BRUTAL_STRIKE_DECISION_HOLE_INSTANCE,
  BRUTAL_STRIKE_EFFECT_DECISION_HOLE_ID,
  BRUTAL_STRIKE_EFFECT_DECISION_HOLE_INSTANCE,
  BRUTAL_STRIKE_FORCEFUL_BLOW_MOVEMENT_DECISION_HOLE_ID,
  BRUTAL_STRIKE_FORCEFUL_BLOW_MOVEMENT_DECISION_HOLE_INSTANCE,
  BRUTAL_STRIKE_FORCEFUL_BLOW_MOVEMENT_HOLE_ID,
  BRUTAL_STRIKE_FORCEFUL_BLOW_MOVEMENT_HOLE_INSTANCE,
} from "./domain-constants.ts";
import { invalidResult } from "./result-helpers.ts";
import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
import {
  battleStateAfterTargetActionEarlyEndForActor,
  sanctuaryTargetingInterdictionCheck,
  targetChoiceFillAfterSanctuaryAttackRollReplacement,
} from "./sanctuary-targeting-interdiction.ts";
import { mirrorImageHitInterceptionCheck } from "./mirror-image-hit-interception.ts";
import { resolveOpenHandTechniqueAfterHit } from "./open-hand-technique.ts";
import { resolveRemarkableAthleteCriticalHitMovement } from "./remarkable-athlete-critical-movement.ts";
import { resolveStunningStrikeAfterHit } from "./stunning-strike.ts";
import { ongoingFeatureProfileIsRecklessAttackForFrenzy } from "./barbarian-frenzy.ts";
import {
  attackDamageRidersAfterCunningStrikeCost,
  cunningStrikeDamageContinuation,
  cunningStrikeDamageRollOptions,
  eligibleCunningStrikeContexts,
  resolveCunningStrikeAfterAttackDamage,
  selectedCunningStrikeContext,
} from "./cunning-strike.ts";
import { applyStatBlockAttackHitConditionRiders } from "./statblock-attack-hit-condition-riders.ts";
import { combatantHasGrapplerSupportProfile } from "./grappler-support-profile.ts";

import {
  attackCanCarryKnockOutChoice,
  attackTargetConstraint,
  eligibleAttackDamageRiders,
  frenzyDamageTypeDecision,
  eligibleAttackDamageDieFloorProcedureRefs,
  eligibleWeaponDamageDiceRollChoiceProcedureRefs,
  recordAttackRollMissToHitReplacementUsed,
  selectedAttackDamageRiders,
  selectedAttackRollMissToHitReplacement,
  selectedWeaponDamage,
  selectedWeaponDamageDiceRollChoice,
} from "./statblock-attacks.ts";
import { currentActorId } from "./creature-state-leaves.ts";
import { spendAmmunitionForAcceptedAttackPendingContinuation } from "../battle-ammunition.ts";
import {
  BRUTAL_STRIKE_EFFECT_DECISION_CHOICES,
  BRUTAL_STRIKE_ROLL_DECISION_CHOICES,
  BRUTAL_STRIKE_SUPPORT_PROFILE,
  type BrutalStrikeEffectDecisionChoice,
  type BrutalStrikeRollDecisionChoice,
} from "../unit-feature-execution-constants.ts";
import type {
  BrutalStrikeEffect,
  BrutalStrikeProfile,
} from "../procedure-execution/brutal-strike.ts";

import {
  ATTACK_ROLL_HOLE_ID,
  ATTACK_TARGET_HOLE_ID,
} from "./battle-runtime-protocol.ts";
import {
  spellAttackRerollUnsupportedIssue,
  spellDamageRerollUnsupportedIssue,
} from "./spell-reroll-issues.ts";
import type {
  AttackBattleResolutionInput,
  BattleAttackDamageDisposition,
  BattleAttackDamageDispositionHole,
  BattleAttackHostSubject,
  BattleAttackDamageEvent,
  BattleAttackRollHole,
  BattleAttackRollRelationshipFact,
  BattleAttackRollResult,
  BattleAfterDamageEvent,
  AttackDamageRider,
  BattleCreatureState,
  BattleFill,
  BattleGrappleLink,
  BattleMovementHole,
  BattleInterruptedProcedure,
  BattleResolutionResult,
  BattleShovePushOutcome,
  SpellAttackDamageComponent,
  BattleState,
  BattleTargetSpatialFact,
  BattleUnitFeatureDecisionHole,
} from "../battle-state-execution.ts";
import {
  sameBattleSubject,
  type BattleMovementSpeedKind,
} from "../battle-subjects.ts";
import type {
  AttackFillSet,
  OrdinaryObjectAttackFillSet,
} from "./battle-runtime-protocol.ts";
import type {
  BoundSupportedAttackActionOption,
  SupportedAttackActionOption,
} from "../battle-action-options.ts";
import { battleTablePositionId, type CombatantId } from "../identity.ts";
import type { BattleProcedureExecutionRef } from "../identity.ts";
import type { DamageType } from "@dnd/surface/surface/types";
import { objectDamageOutcomeFromComponents } from "./object-damage.ts";
import {
  attackRollHitsWithCriticalThreshold,
  attackRollIsCriticalHit,
  applyGrappleSavingThrowOutcome,
  criticalThresholdForAttack,
  needsAttackDamageConcentrationResult,
  spendAttackAction,
  validateAttackDamageDieFloorChoice,
  validateRolledDiceForWeaponAttack,
  validateAttackDamageFill,
} from "./attack-resolution.ts";
import { parseSavingThrowRelationshipFacts } from "./roll-trigger-relationship-facts.ts";

export function resolveAttack(
  input: AttackBattleResolutionInput,
): BattleResolutionResult {
  const attack = attackActionOptionForSubject(input.state, input.subject);
  if (attack == null) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Attack resolution requires a supported Attack action option.",
    );
  }
  return resolveSelectedAttackProcedure(input, attack, spendAttackAction);
}

type AttackProcedureResolutionInput = Omit<
  AttackBattleResolutionInput,
  "subject"
> & {
  readonly subject: BattleAttackHostSubject;
};

type SpendAttackProcedure<
  Attack extends SupportedAttackActionOption = SupportedAttackActionOption,
> = (
  state: Parameters<typeof spendAttackAction>[0],
  actorId: Parameters<typeof spendAttackAction>[1],
  attack: Attack,
  timing: { readonly kind: "acceptedAttack" | "attackPreventedBeforeRoll" },
) => ReturnType<typeof spendAttackAction>;

export {
  ATTACK_ROLL_REQUIRED_BEFORE_DAMAGE_MESSAGE,
  ATTACK_TARGET_REQUIRED_BEFORE_ROLL_OR_DAMAGE_MESSAGE,
} from "./attack-ordering-messages.ts";

type GrapplerPunchAndGrabEligibility = {
  readonly link: BattleGrappleLink;
};

function grapplerPunchAndGrabEligibilityForHit(input: {
  readonly state: BattleState;
  readonly subject: BattleAttackHostSubject;
  readonly attackerId: CombatantId;
  readonly targetId: CombatantId;
  readonly attack: SupportedAttackActionOption;
  readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
}): GrapplerPunchAndGrabEligibility | null {
  const attacker = input.state.combatants.get(input.attackerId);
  const supportsPunchAndGrab = combatantHasGrapplerSupportProfile(attacker);
  if (
    input.subject.tag !== "action" ||
    input.subject.action !== "attack" ||
    currentActorId(input.state) !== input.attackerId ||
    input.attack.kind !== "unarmedStrike" ||
    !supportsPunchAndGrab ||
    input.state.currentTurnResources.grapplerPunchAndGrabUsedThisTurn.includes(
      input.attackerId,
    )
  ) {
    return null;
  }
  const link = grappleLinkForTarget(
    input.state,
    input.attackerId,
    input.targetId,
    grappleFactsForUnarmedStrikeHit(input),
  );
  return link.tag === "ok" ? { link: link.link } : null;
}

function brutalStrikeDecisionHoleForAttack(
  state: BattleState,
  attackerId: CombatantId,
  attack: SupportedAttackActionOption,
): BattleUnitFeatureDecisionHole | null {
  if (
    state.currentTurnResources.brutalStrike.kind !== "available" ||
    !recklessAttackIsAvailableOrActiveForBrutalStrike(state, attackerId, attack)
  ) {
    return null;
  }
  const selection = brutalStrikeSelection(state, attackerId, attack);
  return selection === null
    ? null
    : {
        kind: "unitFeatureDecision",
        holeId: BRUTAL_STRIKE_DECISION_HOLE_ID,
        holeInstanceKey: BRUTAL_STRIKE_DECISION_HOLE_INSTANCE,
        label: "Use Brutal Strike",
        choices: BRUTAL_STRIKE_ROLL_DECISION_CHOICES,
      };
}

function recklessAttackIsAvailableOrActiveForBrutalStrike(
  state: BattleState,
  attackerId: CombatantId,
  attack: SupportedAttackActionOption,
): boolean {
  if (
    attackRollOngoingFeatureActivations(state, attackerId, attack).length > 0
  ) {
    return true;
  }
  const attacker = state.combatants.get(attackerId);
  if (attacker?.origin.kind !== "character") {
    return false;
  }
  return [...activeOngoingFeatureOccurrencesForCombatant(state, attacker)].some(
    ([sourceKey]) => {
      const profile = ongoingFeatureProfileForSourceKey(attacker, sourceKey);
      return (
        profile?.kind === "ongoingFeature" &&
        ongoingFeatureProfileIsRecklessAttackForFrenzy(profile)
      );
    },
  );
}

type BrutalStrikeEligibleAttack =
  | (Extract<SupportedAttackActionOption, { readonly kind: "weapon" }> & {
      readonly ability: "str";
    })
  | (Extract<
      SupportedAttackActionOption,
      { readonly kind: "unarmedStrike" }
    > & { readonly attackAbility: "str" });

type BrutalStrikeSelection = {
  readonly attackerId: CombatantId;
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly profile: BrutalStrikeProfile;
  readonly attack: BrutalStrikeEligibleAttack;
};

const byKind = Match.discriminator("kind");

function brutalStrikeSelection(
  state: BattleState,
  attackerId: CombatantId,
  attack: SupportedAttackActionOption,
): BrutalStrikeSelection | null {
  if (
    currentActorId(state) !== attackerId ||
    !attackUsesStrengthWeaponOrUnarmedStrike(attack)
  ) {
    return null;
  }
  const attacker = state.combatants.get(attackerId);
  if (attacker?.origin.kind !== "character") {
    return null;
  }
  for (const binding of attacker.origin.execution.procedureBindings) {
    const procedure = binding.procedure;
    if (
      (procedure.kind === "unitFeature" ||
        procedure.kind === "unitSupportProfile") &&
      typeof procedure.execution === "object" &&
      procedure.execution.kind === BRUTAL_STRIKE_SUPPORT_PROFILE
    ) {
      return {
        attackerId,
        procedureRef: binding.procedureRef,
        profile: procedure.execution.brutalStrike,
        attack,
      };
    }
  }
  return null;
}

function selectedBrutalStrikeEffect(
  selection: BrutalStrikeSelection,
  choice: BrutalStrikeEffectDecisionChoice | null,
): BrutalStrikeEffect | null {
  if (choice === null) {
    return null;
  }
  return Match.value(choice).pipe(
    Match.when("forceful_blow", () => selection.profile.options[0].effect),
    Match.when("hamstring_blow", () => selection.profile.options[1].effect),
    Match.when("decline", () => null),
    Match.exhaustive,
  );
}

function brutalStrikeEffectDecisionHole(): BattleUnitFeatureDecisionHole {
  return {
    kind: "unitFeatureDecision",
    holeId: BRUTAL_STRIKE_EFFECT_DECISION_HOLE_ID,
    holeInstanceKey: BRUTAL_STRIKE_EFFECT_DECISION_HOLE_INSTANCE,
    label: "Choose a Brutal Strike effect",
    choices: BRUTAL_STRIKE_EFFECT_DECISION_CHOICES,
  };
}

function isBrutalStrikeRollDecisionChoice(
  value: Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>["value"],
): value is BrutalStrikeRollDecisionChoice {
  return BRUTAL_STRIKE_ROLL_DECISION_CHOICES.some((choice) => choice === value);
}

function isBrutalStrikeEffectDecisionChoice(
  value: Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>["value"],
): value is BrutalStrikeEffectDecisionChoice {
  return BRUTAL_STRIKE_EFFECT_DECISION_CHOICES.some(
    (choice) => choice === value,
  );
}

function brutalStrikePendingForSubject(
  state: BattleState,
  subject: BattleAttackHostSubject,
  targetId: CombatantId,
): Extract<
  BattleState["currentTurnResources"]["brutalStrike"],
  { readonly kind: "pending" }
> | null {
  const brutalStrike = state.currentTurnResources.brutalStrike;
  return brutalStrike.kind === "pending" &&
    brutalStrike.targetId === targetId &&
    sameBattleSubject(brutalStrike.subject, subject)
    ? brutalStrike
    : null;
}

function battleStateAfterBrutalStrikeRollSelection(
  state: BattleState,
  pending: Extract<
    BattleState["currentTurnResources"]["brutalStrike"],
    { readonly kind: "pending" }
  > | null,
): BattleState {
  return pending === null
    ? state
    : {
        ...state,
        currentTurnResources: {
          ...state.currentTurnResources,
          brutalStrike: pending,
        },
      };
}

function battleStateAfterBrutalStrikeAttackCompletion(
  state: BattleState,
  pending: Extract<
    BattleState["currentTurnResources"]["brutalStrike"],
    { readonly kind: "pending" }
  > | null,
): BattleState {
  return pending === null
    ? state
    : {
        ...state,
        currentTurnResources: {
          ...state.currentTurnResources,
          brutalStrike: { kind: "spent" },
        },
      };
}

function brutalStrikeDamageRider(
  selection: BrutalStrikeSelection,
): AttackDamageRider {
  return {
    attackerId: selection.attackerId,
    procedureRef: selection.procedureRef,
    optional: false,
    damage: {
      dice: selection.profile.damage.dice,
      dieSize: selection.profile.damage.dieSize,
      damageType: attackDamageTypeForBrutalStrike(selection.attack),
    },
  };
}

function resolveBrutalStrikeAfterDamage(input: {
  readonly state: BattleState;
  readonly replayState: BattleState;
  readonly subject: BattleAttackHostSubject;
  readonly targetId: CombatantId;
  readonly selection: BrutalStrikeSelection;
  readonly choice: BrutalStrikeEffectDecisionChoice | null;
  readonly fillSet: Extract<AttackFillSet, { readonly tag: "ok" }>;
}):
  | {
      readonly tag: "ok";
      readonly state: BattleState;
      readonly shovePushes: readonly BattleShovePushOutcome[];
    }
  | {
      readonly tag: "result";
      readonly result: Exclude<
        BattleResolutionResult,
        { readonly tag: "resolved" }
      >;
    } {
  const effect = selectedBrutalStrikeEffect(input.selection, input.choice);
  if (effect === null) {
    /* v8 ignore start -- Malformed attack fill set: Forceful Blow follow-up fills are discovered only for a resolved Forceful Blow. */
    if (
      input.fillSet.brutalStrikeForcefulBlowMovementDecision !== undefined ||
      input.fillSet.brutalStrikeForcefulBlowMovement !== undefined
    ) {
      return {
        tag: "result",
        result: invalidResult(
          input.state,
          "invalidFill",
          "Brutal Strike Forceful Blow movement requires that effect to resolve.",
        ),
      };
    }
    /* v8 ignore stop */
    return { tag: "ok", state: input.state, shovePushes: [] };
  }
  return Match.value(effect).pipe(
    byKind("forcefulBlow", (forceful) => {
      const movement = resolveBrutalStrikeForcefulBlowMovement({
        state: input.state,
        replayState: input.replayState,
        subject: input.subject,
        attackerId: input.selection.attackerId,
        targetId: input.targetId,
        effect: forceful,
        fillSet: input.fillSet,
      });
      if (movement.tag === "result") return movement;
      return {
        tag: "ok" as const,
        state: movement.state,
        shovePushes: [
          {
            targetId: input.targetId,
            disposition: {
              kind: "pushed" as const,
              distanceFeet: forceful.pushFeet,
              destinationId: battleTablePositionId(
                "brutal-strike-forceful-blow-destination",
              ),
              provokesOpportunityAttacks: false as const,
            },
          },
        ],
      };
    }),
    byKind("hamstringBlow", (hamstring) => {
      /* v8 ignore start -- Malformed attack fill set: Hamstring Blow exposes no Forceful Blow movement holes. */
      if (
        input.fillSet.brutalStrikeForcefulBlowMovementDecision !== undefined ||
        input.fillSet.brutalStrikeForcefulBlowMovement !== undefined
      ) {
        return {
          tag: "result" as const,
          result: invalidResult(
            input.state,
            "invalidFill",
            "Brutal Strike Hamstring Blow cannot accept Forceful Blow movement.",
          ),
        };
      }
      /* v8 ignore stop */
      const target = input.state.combatants.get(input.targetId);
      /* v8 ignore start -- Defensive inconsistent-state guard: attack damage, Cunning Strike, and Weapon Mastery Slow preserve the already-resolved attack target in the combatant map before Brutal Strike is applied. */
      if (target === undefined) {
        return { tag: "ok" as const, state: input.state, shovePushes: [] };
      }
      /* v8 ignore stop */
      const retainedActiveEffects = Match.value(hamstring.stacking).pipe(
        Match.when("mostRecentOnly", () =>
          target.activeEffects.filter(
            (activeEffect) => activeEffect.kind !== "brutalStrikeHamstring",
          ),
        ),
        Match.exhaustive,
      );
      const activeEffects = [
        ...retainedActiveEffects,
        {
          kind: "brutalStrikeHamstring",
          sourceProcedureRef: input.selection.procedureRef,
          sourceCombatantId: input.selection.attackerId,
          effect: hamstring,
          expiresAt: { kind: "startOfSourceTurn" },
        } as const,
      ];
      return {
        tag: "ok" as const,
        state: {
          ...input.state,
          combatants: new Map(input.state.combatants).set(input.targetId, {
            ...target,
            activeEffects,
          }),
        },
        shovePushes: [],
      };
    }),
    Match.exhaustive,
  );
}

type BrutalStrikeForcefulBlowMovementBudget = {
  readonly movementBudgetFeet: ReturnType<typeof movementFeet>;
  readonly speedKinds: readonly {
    readonly kind: BattleMovementSpeedKind;
    readonly movementBudgetFeet: ReturnType<typeof movementFeet>;
  }[];
};

function resolveBrutalStrikeForcefulBlowMovement(input: {
  readonly state: BattleState;
  readonly replayState: BattleState;
  readonly subject: BattleAttackHostSubject;
  readonly attackerId: CombatantId;
  readonly targetId: CombatantId;
  readonly effect: Extract<
    BrutalStrikeEffect,
    { readonly kind: "forcefulBlow" }
  >;
  readonly fillSet: Extract<AttackFillSet, { readonly tag: "ok" }>;
}):
  | { readonly tag: "ok"; readonly state: BattleState }
  | {
      readonly tag: "result";
      readonly result: Exclude<
        BattleResolutionResult,
        { readonly tag: "resolved" }
      >;
    } {
  const budget = brutalStrikeForcefulBlowMovementBudget(
    input.state,
    input.attackerId,
    input.effect.selfMovement.distance,
  );
  const decision = input.fillSet.brutalStrikeForcefulBlowMovementDecision;
  const movementFill = input.fillSet.brutalStrikeForcefulBlowMovement;
  if (Number(budget.movementBudgetFeet) <= 0) {
    /* v8 ignore start -- Malformed attack fill set: no movement holes are exposed when every represented half-Speed budget is zero. */
    if (decision !== undefined || movementFill !== undefined) {
      return {
        tag: "result",
        result: invalidResult(
          input.state,
          "invalidFill",
          "Brutal Strike Forceful Blow movement is unavailable at Speed 0.",
        ),
      };
    }
    /* v8 ignore stop */
    return { tag: "ok", state: input.state };
  }
  if (decision === undefined) {
    /* v8 ignore start -- Malformed attack fill set: the movement path is discovered only after choosing to move. */
    if (movementFill !== undefined) {
      return {
        tag: "result",
        result: invalidResult(
          input.state,
          "invalidFill",
          "Brutal Strike Forceful Blow movement requires a decision first.",
        ),
      };
    }
    /* v8 ignore stop */
    return {
      tag: "result",
      result: needsHolesResult(input.replayState, input.subject, [
        brutalStrikeForcefulBlowMovementDecisionHole(),
      ]),
    };
  }
  if (decision.value === "decline") {
    /* v8 ignore start -- Malformed attack fill set: declining exposes no movement hole. */
    if (movementFill !== undefined) {
      return {
        tag: "result",
        result: invalidResult(
          input.state,
          "invalidFill",
          "Declined Brutal Strike Forceful Blow movement cannot include a path.",
        ),
      };
    }
    /* v8 ignore stop */
    return { tag: "ok", state: input.state };
  }
  if (decision.value !== "use") {
    /* v8 ignore start -- Malformed attack fill set: the follow-up decision has exactly use and decline choices. */
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        "Brutal Strike Forceful Blow movement decision is invalid.",
      ),
    };
    /* v8 ignore stop */
  }
  if (movementFill === undefined) {
    return {
      tag: "result",
      result: needsHolesResult(input.replayState, input.subject, [
        brutalStrikeForcefulBlowMovementHole(
          input.attackerId,
          input.targetId,
          budget,
        ),
      ]),
    };
  }
  const {
    brutalStrikeForcefulBlow,
    additionalSpeedSegments,
    jumpMovementReplacement: _jumpMovementReplacement,
    levitatedMovement: _levitatedMovement,
    commandApproach: _commandApproach,
    commandFlee: _commandFlee,
    ...firstSegment
  } = movementFill.value;
  /* v8 ignore start -- Malformed movement fill: the discovered Forceful Blow hole fixes the selected target before resolution. */
  if (brutalStrikeForcefulBlow.targetId !== input.targetId) {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        "Brutal Strike Forceful Blow movement must remain straight toward the selected target.",
      ),
    };
  }
  /* v8 ignore stop */
  const segments = [firstSegment, ...additionalSpeedSegments];
  let movedState = input.state;
  let movementCostSoFar = 0;
  for (const segment of segments) {
    const speedKindBudget = budget.speedKinds.find(
      (candidate) => candidate.kind === segment.speedKind,
    );
    /* v8 ignore start -- Malformed movement fill: the discovered Forceful Blow hole admits only the actor's represented Speed kinds. */
    if (speedKindBudget === undefined) {
      return {
        tag: "result",
        result: invalidResult(
          input.state,
          "invalidFill",
          "Brutal Strike Forceful Blow movement speed is not represented by this combatant.",
        ),
      };
    }
    /* v8 ignore stop */
    /* v8 ignore start -- Malformed movement fill: the discovered Forceful Blow hole explicitly forbids Opportunity Attacks. */
    if (segment.provokedOpportunityAttacks.length > 0) {
      return {
        tag: "result",
        result: invalidResult(
          input.state,
          "invalidFill",
          "Brutal Strike Forceful Blow movement does not provoke Opportunity Attacks.",
        ),
      };
    }
    /* v8 ignore stop */
    const remainingForSpeed =
      Number(speedKindBudget.movementBudgetFeet) - movementCostSoFar;
    /* v8 ignore start -- Malformed movement fill: the discovered per-Speed budgets already subtract prior segments, so an exhausted switched Speed cannot be submitted. */
    if (remainingForSpeed <= 0) {
      return {
        tag: "result",
        result: invalidResult(
          input.state,
          "invalidFill",
          "Brutal Strike Forceful Blow movement exceeds half of the switched Speed after subtracting distance already moved.",
        ),
      };
    }
    /* v8 ignore stop */
    const movement = parseBattleMovement(
      movedState,
      input.attackerId,
      {
        kind: "movement",
        holeId: movementFill.holeId,
        value: segment,
      },
      {
        kind: "budgetedMovement",
        movementBudgetFeet: movementFeet(remainingForSpeed),
        spendsTurnMovement: false,
      },
    );
    /* v8 ignore start -- Malformed movement fill: parseBattleMovement rechecks the path geometry and cumulative budget supplied for the discovered Forceful Blow hole. */
    if (movement.tag === "invalid") {
      return {
        tag: "result",
        result: invalidResult(input.state, "invalidFill", movement.message),
      };
    }
    /* v8 ignore stop */
    movementCostSoFar += Number(movement.movement.movementCostFeet);
    movedState = applyBattleMovement(movedState, movement.movement);
  }
  return { tag: "ok", state: movedState };
}

function brutalStrikeForcefulBlowMovementBudget(
  state: BattleState,
  attackerId: CombatantId,
  distance: Extract<
    BrutalStrikeEffect,
    { readonly kind: "forcefulBlow" }
  >["selfMovement"]["distance"],
): BrutalStrikeForcefulBlowMovementBudget {
  const attacker = state.combatants.get(attackerId);
  /* v8 ignore start -- Defensive internal guard: attack admission and the accepted attack-roll continuation preserve the attacker before Forceful Blow movement is derived. */
  if (attacker === undefined) {
    return { movementBudgetFeet: movementFeet(0), speedKinds: [] };
  }
  /* v8 ignore stop */
  const grappled = state.grapples.some(
    (grapple) => grapple.targetId === attackerId,
  );
  const speedKinds = representedMovementSpeedKinds(attacker).map((kind) => ({
    kind,
    movementBudgetFeet: Match.value(distance).pipe(
      Match.when("halfSpeed", () =>
        movementFeet(
          Math.floor(
            Number(effectiveMovementSpeed(state, attacker, kind, grappled)) / 2,
          ),
        ),
      ),
      Match.exhaustive,
    ),
  }));
  return {
    movementBudgetFeet: movementFeet(
      Math.max(
        0,
        ...speedKinds.map((speedKind) => Number(speedKind.movementBudgetFeet)),
      ),
    ),
    speedKinds,
  };
}

function brutalStrikeForcefulBlowMovementDecisionHole(): BattleUnitFeatureDecisionHole {
  return {
    kind: "unitFeatureDecision",
    holeId: BRUTAL_STRIKE_FORCEFUL_BLOW_MOVEMENT_DECISION_HOLE_ID,
    holeInstanceKey:
      BRUTAL_STRIKE_FORCEFUL_BLOW_MOVEMENT_DECISION_HOLE_INSTANCE,
    label: "Use Forceful Blow follow-up movement",
    choices: ["use", "decline"],
  };
}

function brutalStrikeForcefulBlowMovementHole(
  actorId: CombatantId,
  targetId: CombatantId,
  budget: BrutalStrikeForcefulBlowMovementBudget,
): Extract<BattleMovementHole, { readonly brutalStrikeForcefulBlow: unknown }> {
  return {
    kind: "movement",
    holeId: BRUTAL_STRIKE_FORCEFUL_BLOW_MOVEMENT_HOLE_ID,
    holeInstanceKey: BRUTAL_STRIKE_FORCEFUL_BLOW_MOVEMENT_HOLE_INSTANCE,
    label: "Forceful Blow movement straight toward target",
    actorId,
    brutalStrikeForcefulBlow: {
      kind: "brutalStrikeForcefulBlowStraightTowardTarget",
      targetId,
    },
    movementBudgetFeet: budget.movementBudgetFeet,
    speedKinds: budget.speedKinds,
  };
}

function attackUsesStrengthWeaponOrUnarmedStrike(
  attack: SupportedAttackActionOption,
): attack is BrutalStrikeEligibleAttack {
  return (
    (attack.kind === "weapon" && attack.ability === "str") ||
    (attack.kind === "unarmedStrike" && attack.attackAbility === "str")
  );
}

function attackDamageTypeForBrutalStrike(attack: BrutalStrikeEligibleAttack) {
  return Match.value(attack).pipe(
    byKind("weapon", ({ weapon }) => selectedWeaponDamage(weapon).damageType),
    byKind("unarmedStrike", ({ effect }) => effect.damage.damageType),
    Match.exhaustive,
  );
}

function grapplerPunchAndGrabDecisionHole(): BattleUnitFeatureDecisionHole {
  return {
    kind: "unitFeatureDecision",
    holeId: GRAPPLER_PUNCH_AND_GRAB_DECISION_HOLE_ID,
    holeInstanceKey: GRAPPLER_PUNCH_AND_GRAB_DECISION_HOLE_INSTANCE,
    label: "Use Punch and Grab",
    choices: ["use", "decline"],
  };
}

function grappleFactsForUnarmedStrikeHit(input: {
  readonly attackerId: CombatantId;
  readonly targetId: CombatantId;
  readonly attack: SupportedAttackActionOption;
  readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
}): readonly BattleTargetSpatialFact[] {
  if (
    input.targetSpatialFacts.some(
      (fact) =>
        fact.kind === "grappleTargetWithinReach" &&
        fact.grapplerId === input.attackerId &&
        fact.targetId === input.targetId,
    )
  ) {
    return input.targetSpatialFacts;
  }
  const distanceFeet = attackTargetDistanceFeet(
    input.targetSpatialFacts,
    input.attackerId,
    input.targetId,
    input.attack,
  );
  const constraint = attackTargetConstraint(input.attack);
  const hasAdmittedMeleeReach =
    distanceFeet !== null &&
    constraint.kind === "meleeReach" &&
    Number(distanceFeet) <= Number(constraint.reachFeet);
  if (!hasAdmittedMeleeReach) return input.targetSpatialFacts;
  return [
    ...input.targetSpatialFacts,
    {
      kind: "grappleTargetWithinReach" as const,
      grapplerId: input.attackerId,
      targetId: input.targetId,
    },
  ];
}

function resolveGrapplerPunchAndGrabAfterHit(input: {
  readonly state: BattleState;
  readonly subject: BattleAttackHostSubject;
  readonly attackerId: CombatantId;
  readonly targetId: CombatantId;
  readonly attack: SupportedAttackActionOption;
  readonly fillSet: Extract<AttackFillSet, { readonly tag: "ok" }>;
}):
  | { readonly tag: "ok"; readonly state: BattleState }
  | { readonly tag: "result"; readonly result: BattleResolutionResult } {
  const eligibility = grapplerPunchAndGrabEligibilityForHit({
    state: input.state,
    subject: input.subject,
    attackerId: input.attackerId,
    targetId: input.targetId,
    attack: input.attack,
    targetSpatialFacts: input.fillSet.targetSpatialFacts,
  });
  if (eligibility === null) {
    if (grapplerPunchAndGrabFillIsAbsent(input.fillSet)) {
      return { tag: "ok", state: input.state };
    }
    /* v8 ignore start -- Malformed resolution input: attack discovery emits Punch and Grab fills only for an eligible Attack-action Unarmed Strike hit. */
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        "Grappler Punch and Grab is only valid after an eligible Unarmed Strike hit.",
      ),
    };
    /* v8 ignore stop */
  }
  const decisionHole = grapplerPunchAndGrabDecisionHole();
  if (input.fillSet.grapplerPunchAndGrabDecision === undefined) {
    /* v8 ignore start -- Malformed resolution input: the resolver emits the outcome hole only after a decoded decision chooses to use Punch and Grab. */
    if (input.fillSet.grapplerPunchAndGrabOutcome !== undefined) {
      return {
        tag: "result",
        result: invalidResult(
          input.state,
          "invalidFill",
          "Grappler Punch and Grab outcome requires choosing to use Punch and Grab.",
        ),
      };
    }
    /* v8 ignore stop */
    return {
      tag: "result",
      result: needsHolesResult(input.state, input.subject, [decisionHole]),
    };
  }
  if (
    input.fillSet.grapplerPunchAndGrabDecision.holeId !== decisionHole.holeId
  ) {
    /* v8 ignore start -- Malformed resolution input: decoded decision fills are bound to the one emitted Punch and Grab decision-hole id. */
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        "Grappler Punch and Grab decision uses the wrong hole.",
      ),
    };
    /* v8 ignore stop */
  }
  if (input.fillSet.grapplerPunchAndGrabDecision.value === "decline") {
    if (input.fillSet.grapplerPunchAndGrabOutcome === undefined) {
      return { tag: "ok", state: input.state };
    }
    /* v8 ignore start -- Malformed resolution input: declining does not emit an outcome hole, so a decoded outcome fill cannot accompany that decision. */
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        "Grappler Punch and Grab outcome requires using Punch and Grab.",
      ),
    };
    /* v8 ignore stop */
  }
  /* v8 ignore start -- Malformed resolution input: the decoded Punch and Grab decision value is the closed union "use" | "decline". */
  if (input.fillSet.grapplerPunchAndGrabDecision.value !== "use") {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        "Grappler Punch and Grab decision must be use or decline.",
      ),
    };
  }
  /* v8 ignore stop */
  if (input.fillSet.grapplerPunchAndGrabOutcome === undefined) {
    return {
      tag: "result",
      result: needsHolesResult(input.state, input.subject, [
        grappleOutcomeHole(input.state, eligibility.link),
      ]),
    };
  }
  const relationshipFacts = parseSavingThrowRelationshipFacts(
    input.fillSet.grapplerPunchAndGrabOutcome.relationshipFacts ?? [],
    eligibility.link.grapplerId,
    [eligibility.link.targetId],
    ongoingFeatureEnemyRelationshipDecisionRequired(
      input.state,
      eligibility.link.grapplerId,
      "enemySavingThrow",
    ),
  );
  if (relationshipFacts === null) {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        "Grappler Punch and Grab relationship facts must answer the saving-throw hole request.",
      ),
    };
  }
  const usedState = {
    ...input.state,
    currentTurnResources: {
      ...input.state.currentTurnResources,
      grapplerPunchAndGrabUsedThisTurn: [
        ...input.state.currentTurnResources.grapplerPunchAndGrabUsedThisTurn,
        input.attackerId,
      ],
    },
  };
  return {
    tag: "ok",
    state: applyGrappleSavingThrowOutcome({
      state: usedState,
      link: eligibility.link,
      relationshipFacts,
      outcome: input.fillSet.grapplerPunchAndGrabOutcome.value,
    }),
  };
}

function grapplerPunchAndGrabFillIsAbsent(
  fillSet: Extract<AttackFillSet, { readonly tag: "ok" }>,
): boolean {
  return (
    fillSet.grapplerPunchAndGrabDecision === undefined &&
    fillSet.grapplerPunchAndGrabOutcome === undefined
  );
}

function resolveOrdinaryObjectAttack<
  Attack extends BoundSupportedAttackActionOption,
>(input: {
  readonly input: AttackProcedureResolutionInput;
  readonly attack: Attack;
  readonly attackerId: CombatantId;
  readonly fillSet: OrdinaryObjectAttackFillSet;
  readonly spendAttackProcedure: SpendAttackProcedure<Attack>;
}): BattleResolutionResult {
  const { attack, attackerId, fillSet } = input;
  if (ordinaryObjectAttackIsUnsupported(input)) {
    return invalidResult(
      input.input.state,
      "unsupportedActOption",
      "This attack procedure does not support an ordinary object target.",
    );
  }
  const objectFact =
    fillSet.target.spatialFacts.length === 1
      ? fillSet.target.spatialFacts[0]
      : undefined;
  const objectFactIssues = ordinaryObjectAttackTargetIssues({
    objectFact,
    attackerId,
    objectId: fillSet.target.objectId,
    attack,
  });
  if (objectFact === undefined || objectFactIssues.length > 0) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      `Invalid object attack target: ${objectFactIssues.join("; ")}.`,
    );
  }
  const rollPreparation = prepareOrdinaryObjectAttackRoll({
    input: input.input,
    attack,
    attackerId,
    fillSet,
    objectFact,
  });
  if (rollPreparation.tag === "result") return rollPreparation.result;
  const rollOutcome = resolveOrdinaryObjectAttackRoll({
    input: input.input,
    attack,
    attackerId,
    fillSet,
    objectFact,
    rollPreparation,
  });
  if (rollOutcome.tag === "result") return rollOutcome.result;
  if (rollOutcome.tag === "miss") {
    return input.spendAttackProcedure(rollOutcome.state, attackerId, attack, {
      kind: "acceptedAttack",
    });
  }
  return resolveOrdinaryObjectAttackHit({
    ...input,
    objectFact,
    attackRolledState: rollOutcome.state,
    effectiveAttackRoll: rollOutcome.effectiveAttackRoll,
  });
}

type OrdinaryObjectAttackTableFact =
  OrdinaryObjectAttackFillSet["target"]["spatialFacts"][number];

function ordinaryObjectAttackIsUnsupported<
  Attack extends BoundSupportedAttackActionOption,
>(input: {
  readonly input: AttackProcedureResolutionInput;
  readonly attack: Attack;
  readonly attackerId: CombatantId;
}): boolean {
  return (
    input.input.subject.tag !== "action" ||
    input.input.subject.action !== "attack" ||
    !ordinaryObjectAttackOptionIsSupported(
      input.input.state,
      input.attackerId,
      input.attack,
    )
  );
}

function ordinaryObjectAttackTargetIssues<
  Attack extends BoundSupportedAttackActionOption,
>(input: {
  readonly objectFact: OrdinaryObjectAttackTableFact | undefined;
  readonly attackerId: CombatantId;
  readonly objectId: OrdinaryObjectAttackFillSet["target"]["objectId"];
  readonly attack: Attack;
}): readonly string[] {
  return input.objectFact === undefined
    ? ["exactly one object attack table fact is required"]
    : [
        ...(input.objectFact.actorId === input.attackerId
          ? []
          : ["the table fact actor does not match the attacker"]),
        ...(input.objectFact.objectId === input.objectId
          ? []
          : ["the table fact object does not match the selected object"]),
        ...(input.objectFact.cover === "total"
          ? ["Total Cover prevents direct targeting"]
          : []),
        ...(attackTargetConstraint(input.attack).kind ===
        input.objectFact.range.kind
          ? []
          : ["the table range fact does not satisfy the selected attack"]),
      ];
}

type OrdinaryObjectAttackRollPreparation =
  | { readonly tag: "result"; readonly result: BattleResolutionResult }
  | {
      readonly tag: "ready";
      readonly effectiveAttackRoll: BattleAttackRollResult;
    };

type OrdinaryObjectAttackRollContext<
  Attack extends BoundSupportedAttackActionOption,
> = {
  readonly input: AttackProcedureResolutionInput;
  readonly attack: Attack;
  readonly attackerId: CombatantId;
  readonly fillSet: OrdinaryObjectAttackFillSet;
  readonly objectFact: OrdinaryObjectAttackTableFact;
};

function prepareOrdinaryObjectAttackRoll<
  Attack extends BoundSupportedAttackActionOption,
>(
  input: OrdinaryObjectAttackRollContext<Attack>,
): OrdinaryObjectAttackRollPreparation {
  const attackRoll = input.fillSet.attackRoll;
  if (attackRoll === undefined) {
    return input.fillSet.damageRoll !== undefined
      ? {
          tag: "result",
          result: invalidResult(
            input.input.state,
            "invalidFill",
            ATTACK_ROLL_REQUIRED_BEFORE_DAMAGE_MESSAGE,
          ),
        }
      : {
          tag: "result",
          result: needsHolesResult(input.input.state, input.input.subject, [
            attackRollHole(
              input.input.state.combatants.get(input.attackerId),
              input.attack,
              requiredOrdinaryObjectAttackRollMode(
                input.input.state,
                input.attackerId,
                input.attack,
                input.objectFact,
              ),
            ),
          ]),
        };
  }
  const requiredRollMode = requiredOrdinaryObjectAttackRollMode(
    input.input.state,
    input.attackerId,
    input.attack,
    input.objectFact,
  );
  const rollIssue = ordinaryObjectAttackRollIssue({
    context: input,
    attackRoll,
    requiredRollMode,
  });
  if (rollIssue !== null) {
    return {
      tag: "result",
      result: invalidResult(input.input.state, "invalidFill", rollIssue),
    };
  }
  const rerollResult = ordinaryObjectAttackRerollResult({
    context: input,
    attackRoll,
    requiredRollMode,
  });
  if (rerollResult !== null) return rerollResult;
  return {
    tag: "ready",
    effectiveAttackRoll: effectiveD20TestNaturalOneRerollAttackRoll(attackRoll),
  };
}

function ordinaryObjectAttackRollIssue<
  Attack extends BoundSupportedAttackActionOption,
>(input: {
  readonly context: OrdinaryObjectAttackRollContext<Attack>;
  readonly attackRoll: BattleAttackRollResult;
  readonly requiredRollMode: ReturnType<
    typeof requiredOrdinaryObjectAttackRollMode
  >;
}): string | null {
  if (
    !attackRollResultIsValid(input.attackRoll) ||
    input.attackRoll.activatedOngoingFeatureProcedureRef !== undefined ||
    input.attackRoll.missToHitReplacementProcedureRef !== undefined ||
    input.attackRoll.spellAttackReroll !== undefined
  ) {
    return "Object attack roll does not match the ordinary attack-roll protocol.";
  }
  if (
    !input.context.input.state.currentTurnResources.attackRollMadeThisTurn &&
    !attackRollModeMatches(input.attackRoll, input.requiredRollMode)
  ) {
    return "Attack roll mode does not match the current object attack rule.";
  }
  return null;
}

function ordinaryObjectAttackRerollResult<
  Attack extends BoundSupportedAttackActionOption,
>(input: {
  readonly context: OrdinaryObjectAttackRollContext<Attack>;
  readonly attackRoll: BattleAttackRollResult;
  readonly requiredRollMode: ReturnType<
    typeof requiredOrdinaryObjectAttackRollMode
  >;
}): { readonly tag: "result"; readonly result: BattleResolutionResult } | null {
  const attacker = input.context.input.state.combatants.get(
    input.context.attackerId,
  );
  if (
    d20TestNaturalOneRerollRollDecisionRequired({
      actor: attacker,
      originalNaturalD20: Number(input.attackRoll.naturalD20),
      rollMode: input.attackRoll.rollMode,
      rolledD20s: input.attackRoll.rolledD20s,
      decision: input.attackRoll.d20TestNaturalOneReroll,
    })
  ) {
    return {
      tag: "result",
      result: needsHolesResult(
        input.context.input.state,
        input.context.input.subject,
        [
          attackRollHoleWithD20TestNaturalOneRerollOption(
            attackRollHole(
              attacker,
              input.context.attack,
              input.requiredRollMode,
            ),
          ),
        ],
      ),
    };
  }
  const rerollIssue = d20TestNaturalOneRerollRollIssue({
    actor: attacker,
    total: input.attackRoll.total,
    originalNaturalD20: Number(input.attackRoll.naturalD20),
    rollMode: input.attackRoll.rollMode,
    rolledD20s: input.attackRoll.rolledD20s,
    decision: input.attackRoll.d20TestNaturalOneReroll,
    requiredRollMode: input.requiredRollMode,
    otherD20RerollPresent: false,
  });
  return rerollIssue === null
    ? null
    : {
        tag: "result",
        result: invalidResult(
          input.context.input.state,
          "invalidFill",
          rerollIssue,
        ),
      };
}

type OrdinaryObjectAttackRollOutcome =
  | { readonly tag: "result"; readonly result: BattleResolutionResult }
  | { readonly tag: "miss"; readonly state: BattleState }
  | {
      readonly tag: "hit";
      readonly state: BattleState;
      readonly effectiveAttackRoll: BattleAttackRollResult;
    };

function resolveOrdinaryObjectAttackRoll<
  Attack extends BoundSupportedAttackActionOption,
>(input: {
  readonly input: AttackProcedureResolutionInput;
  readonly attack: Attack;
  readonly attackerId: CombatantId;
  readonly fillSet: OrdinaryObjectAttackFillSet;
  readonly objectFact: OrdinaryObjectAttackTableFact;
  readonly rollPreparation: Extract<
    OrdinaryObjectAttackRollPreparation,
    { readonly tag: "ready" }
  >;
}): OrdinaryObjectAttackRollOutcome {
  const coverBonus =
    input.objectFact.cover === "half"
      ? 2
      : input.objectFact.cover === "threeQuarters"
        ? 5
        : 0;
  const hit = attackRollHitsWithCriticalThreshold(
    input.rollPreparation.effectiveAttackRoll,
    Number(input.objectFact.armorClass) + coverBonus,
    criticalThresholdForAttack(
      input.input.state.combatants.get(input.attackerId),
      input.attack,
    ),
  );
  const attackRollState = battleStateAfterTargetActionEarlyEndForActor(
    input.input.state,
    input.attackerId,
  );
  const attackRollObservedState = {
    ...revealHidden(attackRollState, input.attackerId),
    currentTurnResources: {
      ...attackRollState.currentTurnResources,
      attackRollMadeThisTurn: true,
    },
  };
  const attackRolledState = consumeSelfAttackRollEffects(
    attackRollObservedState,
    input.attackerId,
  );
  if (!hit) {
    return input.fillSet.damageRoll !== undefined
      ? {
          tag: "result",
          result: invalidResult(
            input.input.state,
            "invalidFill",
            "Attack damage can only be filled after a hit.",
          ),
        }
      : { tag: "miss", state: attackRolledState };
  }
  return {
    tag: "hit",
    state: attackRolledState,
    effectiveAttackRoll: input.rollPreparation.effectiveAttackRoll,
  };
}

function resolveOrdinaryObjectAttackHit<
  Attack extends BoundSupportedAttackActionOption,
>(input: {
  readonly input: AttackProcedureResolutionInput;
  readonly attack: Attack;
  readonly attackerId: CombatantId;
  readonly fillSet: OrdinaryObjectAttackFillSet;
  readonly objectFact: OrdinaryObjectAttackTableFact;
  readonly attackRolledState: BattleState;
  readonly effectiveAttackRoll: BattleAttackRollResult;
  readonly spendAttackProcedure: SpendAttackProcedure<Attack>;
}): BattleResolutionResult {
  const spellWeaponDamageRiders = activeSpellWeaponDamageRiders(
    input.attackRolledState.combatants.get(input.attackerId),
    input.attack,
  );
  const damage = ordinaryObjectAttackDamage({
    input: input.input,
    attack: input.attack,
    attackerId: input.attackerId,
    fillSet: input.fillSet,
    attackRolledState: input.attackRolledState,
    effectiveAttackRoll: input.effectiveAttackRoll,
    spellWeaponDamageRiders,
  });
  if (damage.tag === "resolution") return damage.result;
  const primaryDamage = damage.entries[0];
  if (primaryDamage === undefined) {
    return invalidResult(
      input.input.state,
      "unsupportedActOption",
      "The selected attack has no supported object damage component.",
    );
  }
  const objectDamage = objectDamageOutcomeFromComponents({
    objectId: input.fillSet.target.objectId,
    components: [primaryDamage, ...damage.entries.slice(1)],
    disposition: input.objectFact.damageDisposition,
  });
  const spent = input.spendAttackProcedure(
    input.attackRolledState,
    input.attackerId,
    input.attack,
    { kind: "acceptedAttack" },
  );
  return spent.tag === "resolved"
    ? {
        ...spent,
        ...nonEmptyArrayProperty("objectDamages", [objectDamage]),
      }
    : spent;
}

function selectedAttackTargetIsValid(
  target: BattleCreatureState | undefined,
  attackerId: CombatantId,
): target is BattleCreatureState {
  return target !== undefined && target.combatantId !== attackerId;
}

type OrdinaryObjectAttackDamage =
  | Readonly<{
      readonly tag: "entries";
      readonly entries: readonly {
        readonly damageType: DamageType;
        readonly amount: number;
      }[];
    }>
  | Readonly<{
      readonly tag: "resolution";
      readonly result: BattleResolutionResult;
    }>;

function ordinaryObjectAttackDamage<
  Attack extends BoundSupportedAttackActionOption,
>(input: {
  readonly input: AttackProcedureResolutionInput;
  readonly attack: Attack;
  readonly attackerId: CombatantId;
  readonly fillSet: OrdinaryObjectAttackFillSet;
  readonly attackRolledState: BattleState;
  readonly effectiveAttackRoll: BattleAttackRollResult;
  readonly spellWeaponDamageRiders: readonly SpellAttackDamageComponent[];
}): OrdinaryObjectAttackDamage {
  const fixedDamage = fixedAttackDamageByTypeEntries(
    input.attackRolledState,
    input.attackRolledState.combatants.get(input.attackerId),
    input.attack,
    input.effectiveAttackRoll,
  );
  if (fixedDamage !== null) {
    return input.fillSet.damageRoll === undefined
      ? { tag: "entries", entries: fixedDamage }
      : {
          tag: "resolution",
          result: invalidResult(
            input.input.state,
            "invalidFill",
            "Fixed attack damage does not use a rolled damage fill.",
          ),
        };
  }
  const critical = attackRollIsCriticalHit(
    input.effectiveAttackRoll,
    criticalThresholdForAttack(
      input.attackRolledState.combatants.get(input.attackerId),
      input.attack,
    ),
  );
  if (input.fillSet.damageRoll === undefined) {
    return {
      tag: "resolution",
      result: needsHolesResult(
        spendAmmunitionForAcceptedAttackPendingContinuation({
          state: input.attackRolledState,
          actorId: input.attackerId,
          attack: input.attack,
          subject: input.input.subject,
        }),
        input.input.subject,
        [
          attackDamageHole(
            input.attack,
            critical,
            input.effectiveAttackRoll,
            [],
            input.spellWeaponDamageRiders,
          ),
        ],
      ),
    };
  }
  const damageIssue = validateAttackDamageFill(
    input.fillSet.damageRoll,
    input.attack,
    critical,
    input.effectiveAttackRoll,
    [],
    input.spellWeaponDamageRiders,
  );
  if (damageIssue !== null) {
    return {
      tag: "resolution",
      result: invalidResult(input.input.state, "invalidFill", damageIssue),
    };
  }
  return {
    tag: "entries",
    entries: attackDamageByTypeEntries(
      input.attackRolledState,
      input.attackRolledState.combatants.get(input.attackerId),
      input.attack,
      input.attack.procedureRef,
      input.fillSet.damageRoll,
      critical,
      input.effectiveAttackRoll,
      [],
      input.spellWeaponDamageRiders,
    ),
  };
}

export function resolveSelectedAttackProcedure<
  Attack extends BoundSupportedAttackActionOption,
>(
  input: AttackProcedureResolutionInput,
  selectedAttack: Attack,
  spendAttackProcedure: SpendAttackProcedure<Attack>,
): BattleResolutionResult {
  let attack = selectedAttack;
  const pendingAttackDamageReductions =
    input.pendingAttackDamageReductions ?? [];
  const pendingAttackDamageAdditions = input.pendingAttackDamageAdditions ?? [];

  const attackerId = battleAttackHostParticipantId(input.subject);
  const parsedFillSet = selectedAttackFillSet(
    input.fills,
    attackerId,
    input.state,
  );
  const targetBranch = Match.value(parsedFillSet).pipe(
    Match.when({ tag: "invalid" }, (invalid) => ({
      tag: "result" as const,
      result: invalidResult(input.state, "invalidFill", invalid.message),
    })),
    Match.when({ tag: "objectTarget" }, (fillSet) => ({
      tag: "result" as const,
      result: resolveOrdinaryObjectAttack({
        input,
        attack,
        attackerId,
        fillSet,
        spendAttackProcedure,
      }),
    })),
    Match.when({ tag: "ok" }, (fillSet) => ({
      tag: "creature" as const,
      fillSet,
    })),
    Match.exhaustive,
  );
  if (targetBranch.tag === "result") {
    return targetBranch.result;
  }
  const { fillSet } = targetBranch;
  if (fillSet.targetId == null) {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (
      fillSet.tacticalMasterReplacementDecision !== undefined ||
      fillSet.attackRoll != null ||
      fillSet.damageRoll != null
    ) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        ATTACK_TARGET_REQUIRED_BEFORE_ROLL_OR_DAMAGE_MESSAGE,
      );
    }
    /* v8 ignore stop */
    return needsHolesResult(input.state, input.subject, [
      input.subject.tag === "action" && input.subject.action === "attack"
        ? ordinaryAttackTargetHole(input.state, attackerId, attack)
        : attackTargetHole(input.state, attackerId, attack),
    ]);
  }

  const target = input.state.combatants.get(fillSet.targetId);
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!selectedAttackTargetIsValid(target, attackerId)) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack target must be another combatant in this battle.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !attackTargetIsLegal(
      input.state,
      attackerId,
      target.combatantId,
      attack,
      fillSet.targetSpatialFacts,
    )
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack target is outside the selected attack's supported target constraint.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    fillSet.damageDisposition.kind === "knockOut" &&
    !attackCanCarryKnockOutChoice(attack)
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Knock Out can only be chosen for melee attack damage.",
    );
  }
  /* v8 ignore stop */

  const sanctuaryCheck = sanctuaryTargetingInterdictionCheck({
    state: input.state,
    triggeringProcedureRef: input.subject.procedureRef,
    triggeringCombatantId: attackerId,
    wardedCombatantId: target.combatantId,
    triggeringTargetEventId: ATTACK_TARGET_HOLE_ID,
    replacementTargetKind: "attackRoll",
    fills: input.fills,
  });
  if (sanctuaryCheck.tag === "needsHoles") {
    return needsHolesResult(input.state, input.subject, [sanctuaryCheck.hole]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (sanctuaryCheck.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", sanctuaryCheck.message);
  }
  /* v8 ignore stop */
  if (sanctuaryCheck.tag === "lost") {
    return spendAttackProcedure(input.state, attackerId, attack, {
      kind: "attackPreventedBeforeRoll",
    });
  }
  if (sanctuaryCheck.tag === "newTarget") {
    const replacementTarget = input.state.combatants.get(
      sanctuaryCheck.targetId,
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (
      replacementTarget === undefined ||
      replacementTarget.combatantId === attackerId ||
      !attackTargetIsLegal(
        input.state,
        attackerId,
        replacementTarget.combatantId,
        attack,
        sanctuaryCheck.spatialFacts,
      )
    ) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        "Sanctuary replacement attack target must be legal for the selected attack.",
      );
    }
    /* v8 ignore stop */
    const originalTargetFill = input.fills.find(
      (fill): fill is Extract<BattleFill, { readonly kind: "targetChoice" }> =>
        fill.kind === "targetChoice" && fill.value === target.combatantId,
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (originalTargetFill === undefined) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        "Sanctuary replacement requires the original attack target fill.",
      );
    }
    /* v8 ignore stop */
    return resolveSelectedAttackProcedure(
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
      attack,
      spendAttackProcedure,
    );
  }

  const tacticalMasterReplacementHole = tacticalMasterReplacementDecisionHole(
    input.state,
    attackerId,
    attack,
  );
  if (tacticalMasterReplacementHole === null) {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fillSet.tacticalMasterReplacementDecision !== undefined) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        "Tactical Master replacement is only valid for an eligible weapon mastery attack.",
      );
    }
    /* v8 ignore stop */
  } else if (fillSet.tacticalMasterReplacementDecision === undefined) {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fillSet.attackRoll != null || fillSet.damageRoll != null) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        "Tactical Master replacement must be filled before the attack roll.",
      );
    }
    /* v8 ignore stop */
    return needsHolesResult(input.state, input.subject, [
      tacticalMasterReplacementHole,
    ]);
  }
  const tacticalMasterAttack = tacticalMasterAttackWithReplacement({
    state: input.state,
    attackerId,
    attack,
    decision: fillSet.tacticalMasterReplacementDecision,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (tacticalMasterAttack.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      tacticalMasterAttack.message,
    );
  }
  /* v8 ignore stop */
  attack = tacticalMasterAttack.attack;

  const brutalStrikeDecisionHole = brutalStrikeDecisionHoleForAttack(
    input.state,
    attackerId,
    attack,
  );
  const brutalStrikeSupportSelection = brutalStrikeSelection(
    input.state,
    attackerId,
    attack,
  );
  /* v8 ignore start -- Malformed resolution input: Forceful Blow movement fills cannot be replayed after support admission has become unavailable. */
  if (
    brutalStrikeSupportSelection === null &&
    (fillSet.brutalStrikeForcefulBlowMovementDecision !== undefined ||
      fillSet.brutalStrikeForcefulBlowMovement !== undefined)
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects movement fills without an admitted Brutal Strike selection. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Brutal Strike Forceful Blow movement requires that effect to resolve.",
    );
  }
  /* v8 ignore stop */
  const replayedBrutalStrikePending = brutalStrikePendingForSubject(
    input.state,
    input.subject,
    target.combatantId,
  );
  const replayingChosenBrutalStrikeRoll = replayedBrutalStrikePending !== null;
  if (brutalStrikeDecisionHole === null) {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (
      fillSet.brutalStrikeDecision !== undefined &&
      (brutalStrikeSupportSelection === null ||
        !replayingChosenBrutalStrikeRoll ||
        fillSet.brutalStrikeDecision.value !== "use")
    ) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        input.state.currentTurnResources.brutalStrike.kind !== "available"
          ? "Brutal Strike has already been chosen for an attack roll this turn."
          : "Brutal Strike is only valid for an eligible Reckless Strength attack.",
      );
    }
    /* v8 ignore stop */
  } else if (fillSet.brutalStrikeDecision === undefined) {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fillSet.attackRoll != null || fillSet.damageRoll != null) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        "Brutal Strike must be chosen or declined before the attack roll.",
      );
    }
    /* v8 ignore stop */
    return needsHolesResult(input.state, input.subject, [
      brutalStrikeDecisionHole,
    ]);
  } else if (
    !isBrutalStrikeRollDecisionChoice(fillSet.brutalStrikeDecision.value)
  ) {
    /* v8 ignore start -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Brutal Strike roll decision must be use or decline.",
    );
    /* v8 ignore stop */
  }
  const brutalStrikePending =
    replayedBrutalStrikePending ??
    (fillSet.brutalStrikeDecision !== undefined &&
    isBrutalStrikeRollDecisionChoice(fillSet.brutalStrikeDecision.value) &&
    fillSet.brutalStrikeDecision.value === "use"
      ? ({
          kind: "pending",
          subject: input.subject,
          targetId: target.combatantId,
        } as const)
      : null);
  const brutalStrikeSelected = brutalStrikePending !== null;
  /* v8 ignore start -- Stale subject: a replayed Brutal Strike roll cannot continue after its admitted support selection disappears. */
  if (brutalStrikeSelected && brutalStrikeSupportSelection === null) {
    /* v8 ignore next -- Stale subject: reject rider/effect construction without the caller-proven actor/profile selection. */
    return invalidResult(
      input.state,
      "staleSubject",
      "Brutal Strike support selection is no longer available for the selected attack.",
    );
  }
  /* v8 ignore stop */

  if (fillSet.attackRoll == null) {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (
      fillSet.damageRoll != null ||
      fillSet.damageDispositionFilled ||
      fillSet.sourceDamageRollPenaltyRolls.length > 0
    ) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        ATTACK_ROLL_REQUIRED_BEFORE_DAMAGE_MESSAGE,
      );
    }
    /* v8 ignore stop */
    return needsHolesResult(input.state, input.subject, [
      attackRollHole(
        input.state.combatants.get(attackerId),
        attack,
        !brutalStrikeSelected
          ? requiredAttackRollMode(
              input.state,
              attackerId,
              target.combatantId,
              attack,
              fillSet.targetSpatialFacts,
            )
          : undefined,
        attackRollOngoingFeatureActivations(input.state, attackerId, attack),
      ),
    ]);
  }

  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!attackRollResultIsValid(fillSet.attackRoll)) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack roll result is outside the d20 attack-roll protocol.",
    );
  }
  /* v8 ignore stop */
  const spellAttackRerollIssue = spellAttackRerollUnsupportedIssue(
    fillSet.attackRoll,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (spellAttackRerollIssue !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", spellAttackRerollIssue);
  }
  /* v8 ignore stop */
  const activatedOngoingFeatureProfile =
    attackRollOngoingFeatureActivationProfile(
      input.state,
      attackerId,
      attack,
      fillSet.attackRoll.activatedOngoingFeatureProcedureRef,
      input.replayingInterruptedProcedure === true ||
        replayingChosenBrutalStrikeRoll ||
        fillSet.damageRoll != null,
    );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    fillSet.attackRoll.activatedOngoingFeatureProcedureRef !== undefined &&
    activatedOngoingFeatureProfile === null
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack-roll ongoing feature activation is not available for this attack roll.",
    );
  }
  /* v8 ignore stop */
  const requiredRollMode = attackRollModeWithOptionalOngoingFeature(
    input.state,
    attackerId,
    target.combatantId,
    attack,
    fillSet.targetSpatialFacts,
    fillSet.attackRoll.activatedOngoingFeatureProcedureRef,
  );
  const baselineRequiredRollMode = requiredAttackRollMode(
    input.state,
    attackerId,
    target.combatantId,
    attack,
    fillSet.targetSpatialFacts,
  );
  const resolvedRequiredRollMode = brutalStrikeSelected
    ? undefined
    : requiredRollMode;
  const attackRollModeWasEstablishedBeforeReplay =
    input.replayingInterruptedProcedure === true ||
    replayingChosenBrutalStrikeRoll;
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !attackRollModeWasEstablishedBeforeReplay &&
    brutalStrikeSelected &&
    fillSet.attackRoll.activatedOngoingFeatureProcedureRef === undefined &&
    !recklessAttackIsAvailableOrActiveForBrutalStrike(
      input.state,
      attackerId,
      attack,
    )
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Brutal Strike requires using or already benefiting from Reckless Attack on the chosen attack roll.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !attackRollModeWasEstablishedBeforeReplay &&
    brutalStrikeSelected &&
    (baselineRequiredRollMode === "disadvantage" ||
      !attackRollModeMatches(fillSet.attackRoll, undefined))
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Brutal Strike forgoes Advantage and cannot be used on an attack roll with Disadvantage.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !attackRollModeWasEstablishedBeforeReplay &&
    !brutalStrikeSelected &&
    !attackRollModeMatches(fillSet.attackRoll, requiredRollMode)
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack roll mode does not match the current attack-roll rule.",
    );
  }
  /* v8 ignore stop */
  const attacker = input.state.combatants.get(attackerId);
  if (
    d20TestNaturalOneRerollRollDecisionRequired({
      actor: attacker,
      originalNaturalD20: Number(fillSet.attackRoll.naturalD20),
      rollMode: fillSet.attackRoll.rollMode,
      rolledD20s: fillSet.attackRoll.rolledD20s,
      decision: fillSet.attackRoll.d20TestNaturalOneReroll,
    })
  ) {
    return needsHolesResult(input.state, input.subject, [
      attackRollHoleWithD20TestNaturalOneRerollOption(
        attackRollHole(
          attacker,
          attack,
          resolvedRequiredRollMode,
          attackRollOngoingFeatureActivations(input.state, attackerId, attack),
        ),
      ),
    ]);
  }
  const d20TestNaturalOneRerollIssue = d20TestNaturalOneRerollRollIssue({
    actor: attacker,
    total: fillSet.attackRoll.total,
    originalNaturalD20: Number(fillSet.attackRoll.naturalD20),
    rollMode: fillSet.attackRoll.rollMode,
    rolledD20s: fillSet.attackRoll.rolledD20s,
    decision: fillSet.attackRoll.d20TestNaturalOneReroll,
    requiredRollMode: resolvedRequiredRollMode,
    otherD20RerollPresent: fillSet.attackRoll.spellAttackReroll !== undefined,
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
  const effectiveAttackRoll = effectiveD20TestNaturalOneRerollAttackRoll(
    fillSet.attackRoll,
  );

  const criticalThreshold = criticalThresholdForAttack(attacker, attack);
  const ordinaryHit = attackRollHitsWithCriticalThreshold(
    effectiveAttackRoll,
    currentArmorClass(activeEffectArmorClass(input.state, target)),
    criticalThreshold,
  );
  const missToHitReplacement = selectedAttackRollMissToHitReplacement({
    state: input.state,
    subject: input.subject,
    attackerId: attackerId,
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
        : "Attack-roll miss-to-hit replacement is not available for this attack roll.",
    );
  }
  /* v8 ignore stop */
  const hit = ordinaryHit || missToHitReplacement !== null;
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!hit && !grapplerPunchAndGrabFillIsAbsent(fillSet)) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Grappler Punch and Grab is only valid after an eligible Unarmed Strike hit.",
    );
  }
  /* v8 ignore stop */
  const attackRollState = battleStateAfterTargetActionEarlyEndForActor(
    input.state,
    attackerId,
  );
  const hiddenBeforeAttack =
    attackRollState.combatants.get(attackerId)?.hidden ?? null;
  const attackRolledState = battleStateAfterBrutalStrikeRollSelection(
    recordAttackRollMissToHitReplacementUsed(
      consumeHelpAttackForAttackRoll(
        recordAttackRollOngoingFeatures(
          revealHidden(attackRollState, attackerId),
          attackerId,
          target.combatantId,
          activatedOngoingFeatureProfile,
          fillSet.targetRelationshipFacts,
        ),
        attackerId,
        target.combatantId,
      ),
      attackerId,
      missToHitReplacement,
      {
        subject: input.subject,
        targetId: target.combatantId,
        attackRoll: effectiveAttackRoll,
      },
    ),
    brutalStrikePending,
  );
  const critical = attackRollIsCriticalHit(
    effectiveAttackRoll,
    criticalThreshold,
  );
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
    const mirrorImageAttacker = attackRolledState.combatants.get(attackerId);
    /* v8 ignore start -- Defensive inconsistent-state guard: attackRolledState is produced from the admitted state by resource/effect updates that preserve the already-resolved attacker entry. */
    if (mirrorImageAttacker === undefined) {
      return invalidResult(
        input.state,
        "missingCombatant",
        "Attack actor is no longer in this battle.",
      );
    }
    /* v8 ignore stop */
    const mirrorImageCheck = mirrorImageHitInterceptionCheck({
      state: attackRolledState,
      attacker: mirrorImageAttacker,
      target: requireCurrentAttackTarget(attackRolledState, target),
      targetSpatialFacts: fillSet.targetSpatialFacts,
      triggeringAttackRollHoleId: ATTACK_ROLL_HOLE_ID,
      fill: fillSet.mirrorImageDuplicateRoll,
    });
    if (mirrorImageCheck.tag === "needsHoles") {
      return needsHolesResult(attackRolledState, input.subject, [
        mirrorImageCheck.hole,
      ]);
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
      if (attackPostMirrorImageFillsArePresent(fillSet)) {
        /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
        return invalidResult(
          input.state,
          "invalidFill",
          "Attack damage and after-hit fills are not valid when Mirror Image redirects the hit to a duplicate.",
        );
      }
      /* v8 ignore stop */
      return spendAttackProcedure(
        battleStateAfterBrutalStrikeAttackCompletion(
          mirrorImageCheck.state,
          brutalStrikePending,
        ),
        attackerId,
        attack,
        { kind: "acceptedAttack" },
      );
    }
  }
  const frenzyDamageType = frenzyDamageTypeDecision({
    state: attackRolledState,
    attackerId,
    attack,
    hitWithAttackRoll: hit,
    selectedDamageType: fillSet.frenzyDamageTypeChoice?.value,
  });
  if (frenzyDamageType.tag === "decisionRequired") {
    return needsHolesResult(attackRolledState, input.subject, [
      frenzyDamageType.hole,
    ]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (frenzyDamageType.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", frenzyDamageType.message);
  }
  /* v8 ignore stop */
  const eligibleDamageRiders = hit
    ? [
        ...eligibleAttackDamageRiders(
          attackRolledState,
          attackerId,
          target.combatantId,
          attack,
          effectiveAttackRoll,
          fillSet.targetSpatialFacts,
          frenzyDamageType,
        ),
        ...(brutalStrikeSelected && brutalStrikeSupportSelection !== null
          ? [brutalStrikeDamageRider(brutalStrikeSupportSelection)]
          : []),
      ]
    : [];
  const eligibleDamageDiceChoiceUnitIds = hit
    ? eligibleWeaponDamageDiceRollChoiceProcedureRefs(
        attackRolledState,
        attackerId,
        attack,
      )
    : [];
  const eligibleDamageDieFloorChoiceUnitIds = hit
    ? eligibleAttackDamageDieFloorProcedureRefs(
        attackRolledState,
        attackerId,
        attack,
        attack.procedureRef,
      )
    : [];
  const spellWeaponDamageRiders = hit
    ? [
        ...activeSpellWeaponDamageRiders(
          attackRolledState.combatants.get(attackerId),
          attack,
        ),
        ...pendingAttackDamageAdditions,
      ]
    : [];
  const spellMarkedDamageRiders = hit
    ? activeMarkedDamageRiders(
        attackRolledState.combatants.get(attackerId),
        target.combatantId,
      )
    : [];
  const selectedDamageRiders =
    fillSet.damageRoll === undefined
      ? []
      : (selectedAttackDamageRiders(
          eligibleDamageRiders,
          fillSet.damageRoll.selectedAttackDamageRiderProcedureRefs,
        ) ?? []);
  const eligibleCunningStrikeDamageOptions = hit
    ? eligibleCunningStrikeContexts({
        state: attackRolledState,
        attackerId,
        targetId: target.combatantId,
        eligibleAttackDamageRiders: eligibleDamageRiders,
        hiddenBeforeAttack,
      })
    : [];
  const selectedCunningStrike = selectedCunningStrikeContext(
    eligibleCunningStrikeDamageOptions,
    fillSet.damageRoll?.cunningStrikeOption,
  );
  const selectedCunningStrikeContinuation = cunningStrikeDamageContinuation(
    selectedCunningStrike,
  );
  const selectedDamageRidersAfterCunningStrikeCost =
    attackDamageRidersAfterCunningStrikeCost(
      selectedDamageRiders,
      selectedCunningStrike,
    );
  const fixedBaseDamageByTypeEntries = hit
    ? fixedAttackDamageByTypeEntries(
        attackRolledState,
        attackRolledState.combatants.get(attackerId),
        attack,
        effectiveAttackRoll,
      )
    : null;
  const fixedDamageByTypeBeforeTargetAdjustments = hit
    ? eligibleDamageRiders.length > 0 ||
      spellMarkedDamageRiders.length > 0 ||
      spellWeaponDamageRiders.length > 0
      ? null
      : fixedBaseDamageByTypeEntries
    : null;
  const fixedDamageAmount =
    fixedDamageByTypeBeforeTargetAdjustments === null
      ? null
      : damageAmountByTypeAfterTargetAdjustments(
          attackRolledState,
          target,
          damageAmountByTypeEntriesToMap(
            fixedDamageByTypeBeforeTargetAdjustments,
          ),
        );
  if (hit && input.handledInterruptTrigger !== "attackHit") {
    const reactionWindow = maybeOpenInterruptWindow(
      attackRolledState,
      {
        trigger: "attackHit",
        attackerId: attackerId,
        targetId: target.combatantId,
        attackRoll: effectiveAttackRoll,
        attackKind: attackKindForDeflectRedirect(attack),
        attackHitTriggerKind: attackHitTriggerKind(attack),
        damageTypes: prospectiveAttackDamageTypes(
          attackRolledState,
          attackRolledState.combatants.get(attackerId),
          attack,
          critical,
          effectiveAttackRoll,
          eligibleDamageRiders,
          spellWeaponDamageRiders,
          spellMarkedDamageRiders,
        ),
        continuation: {
          kind: "replay",
          subject: input.subject,
          fills: attackFillsForAttackHitReplay(input.fills),
        },
      },
      input.handledInterruptTrigger,
    );
    if (reactionWindow !== null) {
      return reactionWindow;
    }
  }
  if (!hit || !brutalStrikeSelected) {
    if (fillSet.brutalStrikeEffectDecision !== undefined) {
      return invalidResult(
        input.state,
        "invalidFill",
        "A Brutal Strike effect can be chosen only after the selected attack roll hits.",
      );
    }
  } else if (fillSet.brutalStrikeEffectDecision === undefined) {
    return needsHolesResult(attackRolledState, input.subject, [
      brutalStrikeEffectDecisionHole(),
    ]);
  } else if (
    !isBrutalStrikeEffectDecisionChoice(
      fillSet.brutalStrikeEffectDecision.value,
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Brutal Strike effect choice is not admitted at level 9.",
    );
  }
  const brutalStrikeEffectChoice: BrutalStrikeEffectDecisionChoice | null =
    fillSet.brutalStrikeEffectDecision !== undefined &&
    isBrutalStrikeEffectDecisionChoice(
      fillSet.brutalStrikeEffectDecision.value,
    ) &&
    fillSet.brutalStrikeEffectDecision.value !== "decline"
      ? fillSet.brutalStrikeEffectDecision.value
      : null;
  const remarkableAthleteMovement = resolveRemarkableAthleteCriticalHitMovement(
    {
      state: attackRolledState,
      subject: input.subject,
      attackerId,
      scoredCriticalHit: critical,
      fills: fillSet,
    },
  );
  if (remarkableAthleteMovement.tag === "result") {
    return remarkableAthleteMovement.result;
  }
  const postRemarkableAthleteMovementState = remarkableAthleteMovement.state;
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !hit &&
    (fillSet.stunningStrikeDecision !== undefined ||
      fillSet.stunningStrikeSavingThrow !== undefined)
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Stunning Strike is only valid after an eligible attack hit.",
    );
  }
  /* v8 ignore stop */
  const stunningStrikeApplied = hit
    ? resolveStunningStrikeAfterHit({
        state: postRemarkableAthleteMovementState,
        actorId: attackerId,
        targetId: target.combatantId,
        attack,
        decision: fillSet.stunningStrikeDecision,
        savingThrow: fillSet.stunningStrikeSavingThrow,
      })
    : ({ tag: "ok", state: postRemarkableAthleteMovementState } as const);
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (stunningStrikeApplied.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      stunningStrikeApplied.message,
    );
  }
  /* v8 ignore stop */
  if (stunningStrikeApplied.tag === "needsHoles") {
    return needsHolesResult(postRemarkableAthleteMovementState, input.subject, [
      ...stunningStrikeApplied.holes,
    ]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !hit &&
    (fillSet.openHandTechniqueDecision !== undefined ||
      fillSet.openHandTechniqueSavingThrow !== undefined)
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Open Hand Technique is only valid after an eligible attack hit.",
    );
  }
  /* v8 ignore stop */
  const openHandTechniqueApplied = hit
    ? resolveOpenHandTechniqueAfterHit({
        state: stunningStrikeApplied.state,
        subject: input.subject,
        actorId: attackerId,
        targetId: target.combatantId,
        decision: fillSet.openHandTechniqueDecision,
        savingThrow: fillSet.openHandTechniqueSavingThrow,
      })
    : ({
        tag: "ok",
        state: stunningStrikeApplied.state,
        shovePushes: [],
      } as const);
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (openHandTechniqueApplied.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      openHandTechniqueApplied.message,
    );
  }
  /* v8 ignore stop */
  if (openHandTechniqueApplied.tag === "needsHoles") {
    return needsHolesResult(postRemarkableAthleteMovementState, input.subject, [
      ...openHandTechniqueApplied.holes,
    ]);
  }
  const weaponMasteryPushApplied = hit
    ? applyWeaponMasteryPushOnHit({
        state: openHandTechniqueApplied.state,
        attackerId,
        targetId: target.combatantId,
        attack,
        targetSpatialFacts: fillSet.targetSpatialFacts,
      })
    : ({
        tag: "ok",
        state: openHandTechniqueApplied.state,
        shovePushes: [],
      } as const);
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (weaponMasteryPushApplied.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      weaponMasteryPushApplied.message,
    );
  }
  /* v8 ignore stop */
  const shovePushes = [
    ...openHandTechniqueApplied.shovePushes,
    ...weaponMasteryPushApplied.shovePushes,
  ];
  const toppleSaveHole = hit
    ? weaponMasteryToppleSavingThrowHole(
        weaponMasteryPushApplied.state,
        attackerId,
        target.combatantId,
        attack,
      )
    : null;
  if (toppleSaveHole === null) {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fillSet.weaponMasteryToppleSavingThrow !== undefined) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        "Weapon Mastery Topple Saving Throw is only valid for an eligible Topple weapon hit.",
      );
    }
    /* v8 ignore stop */
  } else if (fillSet.weaponMasteryToppleSavingThrow === undefined) {
    return needsHolesResult(weaponMasteryPushApplied.state, input.subject, [
      toppleSaveHole,
    ]);
  }
  const toppleApplied = fillSet.weaponMasteryToppleSavingThrow
    ? applyWeaponMasteryToppleSavingThrow(
        weaponMasteryPushApplied.state,
        attackerId,
        target.combatantId,
        fillSet.weaponMasteryToppleSavingThrow,
      )
    : ({ tag: "ok", state: weaponMasteryPushApplied.state } as const);
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (toppleApplied.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", toppleApplied.message);
  }
  /* v8 ignore stop */
  const weaponHitAppliedState = hit
    ? applyWeaponMasterySapOnHit(
        toppleApplied.state,
        attackerId,
        target.combatantId,
        attack,
      )
    : toppleApplied.state;
  const hitAppliedState =
    hit && attack.kind === "statBlockAttack"
      ? applyStatBlockAttackHitConditionRiders({
          state: weaponHitAppliedState,
          target: requireCurrentAttackTarget(weaponHitAppliedState, target),
          attack,
        })
      : weaponHitAppliedState;
  const damageTarget = requireCurrentAttackTarget(hitAppliedState, target);
  if (
    hit &&
    fixedDamageAmount !== null &&
    fixedDamageByTypeBeforeTargetAdjustments !== null
  ) {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fillSet.damageRoll != null) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        "Fixed attack damage does not use a rolled damage fill.",
      );
    }
    /* v8 ignore stop */
    const damageEvent = {
      kind: "aggregateDamage" as const,
      damageByTypeBeforeTargetAdjustments:
        fixedDamageByTypeBeforeTargetAdjustments,
    } satisfies BattleAttackDamageEvent;
    const reducedDamageEvent = attackDamageEventAfterPendingReductions(
      damageEvent,
      pendingAttackDamageReductions,
    );
    const spellReduction = applyAvailableSpellDamageReduction(
      damageTarget,
      damageAmountByTypeEntriesToMap(
        attackDamageEventEntries(reducedDamageEvent),
      ),
      fillSet.spellDamageReductionRoll,
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
      return needsHolesResult(hitAppliedState, input.subject, [
        ...spellReduction.holes,
      ]);
    }
    const reducedDamageEventAfterSpellReduction = attackDamageEventWithEntries(
      reducedDamageEvent,
      damageAmountByTypeMapEntries(spellReduction.damageByType),
    );
    const spellReducedState = {
      ...hitAppliedState,
      combatants: new Map(hitAppliedState.combatants).set(
        target.combatantId,
        spellReduction.target,
      ),
    };
    const reducedFixedDamageAmount = attackDamageEventAmountForTarget(
      spellReducedState,
      spellReduction.target,
      reducedDamageEventAfterSpellReduction,
    );
    const reducedFixedDamageBeforeTargetAdjustments =
      attackDamageEventAmountBeforeTargetAdjustments(
        reducedDamageEventAfterSpellReduction,
      );
    const redirectState =
      resolveAttackDamageReductionZeroDamageRedirectAfterReduction({
        state: spellReducedState,
        reductions: pendingAttackDamageReductions,
        reducedDamageBeforeTargetAdjustments:
          reducedFixedDamageBeforeTargetAdjustments,
        redirectTarget: fillSet.attackDamageReductionRedirectTarget,
        redirectSave: fillSet.attackDamageReductionRedirectSave,
        redirectDamage: fillSet.attackDamageReductionRedirectDamage,
        damageRelationshipDecisions: fillSet.damageRelationshipDecisions,
      });
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (redirectState.tag === "invalid") {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(input.state, "invalidFill", redirectState.message);
    }
    /* v8 ignore stop */
    if (redirectState.tag === "needsHoles") {
      return needsHolesResult(attackRolledState, input.subject, [
        ...redirectState.holes,
      ]);
    }
    const sapRedirectState = redirectState.state;
    const damageDispositionHole = attackDamageDispositionHole({
      attack,
      attackerId: attackerId,
      target: spellReduction.target,
      damageAmount: reducedFixedDamageAmount,
    });
    const damageDispositionValidation = damageDispositionFillValidation({
      hole: damageDispositionHole,
      filled: primaryDamageDispositionFilled(fillSet),
      value: fillSet.damageDisposition,
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
    if (damageDispositionHole !== null) {
      if (!primaryDamageDispositionFilled(fillSet)) {
        return needsHolesResult(hitAppliedState, input.subject, [
          damageDispositionHole,
        ]);
      }
    }
    const grapplerPunchAndGrab = resolveGrapplerPunchAndGrabAfterHit({
      state: sapRedirectState,
      subject: input.subject,
      attackerId,
      targetId: target.combatantId,
      attack,
      fillSet,
    });
    if (grapplerPunchAndGrab.tag === "result") {
      return grapplerPunchAndGrab.result;
    }
    const primaryConcentrationSavingThrows =
      primaryAttackConcentrationSavingThrows(input.fills);
    const relationshipCheck = damageRelationshipDecisionFillCheck({
      state: grapplerPunchAndGrab.state,
      damageEventHoleId: ATTACK_ROLL_HOLE_ID,
      damageSourceId: attackerId,
      targets:
        Number(reducedFixedDamageAmount) <= 0
          ? []
          : [
              {
                targetId: target.combatantId,
                damageAmount: toDamageAmount(Number(reducedFixedDamageAmount)),
                damageDisposition: fillSet.damageDisposition,
              },
            ],
      spatialFacts: fillSet.targetSpatialFacts,
      decisionsByRelationshipHole: fillSet.damageRelationshipDecisions,
    });
    if (relationshipCheck.tag === "needsHoles") {
      return needsHolesResult(
        grapplerPunchAndGrab.state,
        input.subject,
        relationshipCheck.holes,
      );
    }
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (relationshipCheck.tag === "invalid") {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        relationshipCheck.message,
      );
    }
    /* v8 ignore stop */
    const concentrationSave = concentrationSavingThrowHole(
      spellReduction.target,
      reducedFixedDamageAmount,
    );
    const primaryConcentrationSavingThrow =
      concentrationSave === null
        ? undefined
        : concentrationSavingThrowFillFor(
            primaryConcentrationSavingThrows,
            concentrationSave,
          );
    const concentrationSaveCheck =
      damageLifecycleConcentrationSavingThrowFillCheck({
        state: grapplerPunchAndGrab.state,
        target: spellReduction.target,
        damageAmount: reducedFixedDamageAmount,
        fills: primaryConcentrationSavingThrows,
      });
    if (concentrationSaveCheck.tag === "needsHoles") {
      const pendingConcentrationSave = concentrationSaveCheck.holes[0];
      if (pendingConcentrationSave !== undefined) {
        return needsAttackDamageConcentrationResult({
          state: grapplerPunchAndGrab.state,
          subject: input.subject,
          attack,
          continuation: attackDamageInterruptionFrame({
            participant: input.subject,
            targetId: target.combatantId,
            targetSpatialFacts: fillSet.targetSpatialFacts,
            attackResult: effectiveAttackRoll,
            damageInput: reducedDamageEventAfterSpellReduction,
            critical,
            continuation: {
              kind: "primaryAttackDamage",
              concentrationSavingThrows: primaryConcentrationSavingThrows,
              damageDisposition: primaryAttackDamageDisposition(fillSet),
              attackDamageRiders: [],
              attack,
              fills: attackFollowUpFillsAfterPrimaryDamage(input.fills),
              ...optionalProperty(
                "relationshipDecisions",
                relationshipCheck.decisions,
              ),
            },
          }),
          concentrationSave: pendingConcentrationSave,
        });
      }
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
    const hideousLaughterSaveCheck =
      damageLifecycleHideousLaughterDamageRepeatSaveFillCheck({
        state: grapplerPunchAndGrab.state,
        target: spellReduction.target,
        damageAmount: reducedFixedDamageAmount,
        fills: fillSet.hideousLaughterDamageRepeatSaves,
      });
    if (hideousLaughterSaveCheck.tag === "needsHoles") {
      return needsHolesResult(grapplerPunchAndGrab.state, input.subject, [
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
    const fixedDamageAppliedState = applyAttackDamageAmount({
      state: grapplerPunchAndGrab.state,
      attackerId,
      targetId: target.combatantId,
      damageAmount: toDamageAmount(reducedFixedDamageAmount),
      deathFailuresAtZeroHp: critical ? 2 : 1,
      damageDisposition: fillSet.damageDisposition,
      attackDamageRiders: [],
      concentrationSavingThrow: primaryConcentrationSavingThrow,
      hideousLaughterDamageRepeatSaves:
        fillSet.hideousLaughterDamageRepeatSaves,
      wardingBondDamageShareConcentrationSavingThrows:
        primaryConcentrationSavingThrows,
      spatialFacts: fillSet.targetSpatialFacts,
      relationshipDecisions: relationshipCheck.decisions,
    });
    const fixedDamageWithSlowState = applyWeaponMasterySlowAfterDamage({
      state: fixedDamageAppliedState,
      attackerId,
      targetId: target.combatantId,
      attack,
      damageAmount: Number(reducedFixedDamageAmount),
    });
    const spent = spendAttackProcedure(
      battleStateAfterBrutalStrikeAttackCompletion(
        fixedDamageWithSlowState,
        brutalStrikePending,
      ),
      attackerId,
      attack,
      { kind: "acceptedAttack" },
    );
    if (spent.tag === "invalid") {
      return spent;
    }
    const primaryAfterDamageEvent = {
      damageSourceId: attackerId,
      damagedId: target.combatantId,
      damageAmount: toDamageAmount(reducedFixedDamageAmount),
      reactionSpellTargetFacts: reactionSpellTargetFactsForAfterDamage({
        facts: fillSet.targetSpatialFacts,
        damagedId: target.combatantId,
        damageSourceId: attackerId,
      }),
    } satisfies BattleAfterDamageEvent;
    const primaryAfterDamageReactionWindow = maybeOpenInterruptWindow(
      spent.state,
      {
        trigger: "afterDamage",
        ...primaryAfterDamageEvent,
        continuation: attackFollowUpAfterPrimaryDamageContinuation({
          state: spent.state,
          subject: input.subject,
          firstTargetId: target.combatantId,
          attack,
          fills: input.fills,
          fillSet,
        }),
      },
      input.handledInterruptTrigger,
    );
    if (primaryAfterDamageReactionWindow !== null) {
      return primaryAfterDamageReactionWindow;
    }
    const afterPrimaryDamage = resolveAttackFollowUpContinuations(
      ATTACK_RESOLVERS,
      {
        state: spent.state,
        subject: input.subject,
        firstTargetId: target.combatantId,
        attack,
        fills: attackFollowUpFillsAfterPrimaryDamage(input.fills),
        handledInterruptTrigger: input.handledInterruptTrigger,
      },
    );
    return withOpenHandTechniqueShovePushes(afterPrimaryDamage, shovePushes);
  }
  if (hit && fillSet.damageRoll == null) {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fillSet.sourceDamageRollPenaltyRolls.length > 0) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        "Attack damage can only be filled after a hit.",
      );
    }
    /* v8 ignore stop */
    return needsHolesResult(
      spendAmmunitionForAcceptedAttackPendingContinuation({
        state: hitAppliedState,
        actorId: attackerId,
        attack,
        subject: input.subject,
      }),
      input.subject,
      [
        attackDamageHole(
          attack,
          critical,
          effectiveAttackRoll,
          eligibleDamageRiders,
          spellWeaponDamageRiders,
          spellMarkedDamageRiders,
          ongoingFeatureDamageModifier(
            attackRolledState,
            attackRolledState.combatants.get(attackerId),
            attack,
          ),
          eligibleDamageDiceChoiceUnitIds,
          eligibleDamageDieFloorChoiceUnitIds,
          cunningStrikeDamageRollOptions(eligibleCunningStrikeDamageOptions),
        ),
      ],
    );
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !hit &&
    (fillSet.damageRoll != null ||
      fillSet.damageDispositionFilled ||
      fillSet.sourceDamageRollPenaltyRolls.length > 0)
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack damage can only be filled after a hit.",
    );
  }
  /* v8 ignore stop */
  if (!hit) {
    const relationshipIssue =
      fillSet.damageRelationshipDecisions.unexpectedFillForAbsentEvent(
        ATTACK_ROLL_HOLE_ID,
      );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (relationshipIssue !== null) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(input.state, "invalidFill", relationshipIssue);
    }
    /* v8 ignore stop */
  }
  if (hit && fillSet.damageRoll != null) {
    const selectedDamageDiceChoice = selectedWeaponDamageDiceRollChoice(
      eligibleDamageDiceChoiceUnitIds,
      fillSet.damageRoll.weaponDamageDiceRollChoice,
    );
    const damageValidation = validateAttackDamageFill(
      fillSet.damageRoll,
      attack,
      critical,
      effectiveAttackRoll,
      eligibleDamageRiders,
      spellWeaponDamageRiders,
      spellMarkedDamageRiders,
      ongoingFeatureDamageModifier(
        attackRolledState,
        attackRolledState.combatants.get(attackerId),
        attack,
      ),
      eligibleDamageDiceChoiceUnitIds,
      eligibleDamageDieFloorChoiceUnitIds,
      eligibleCunningStrikeDamageOptions,
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (damageValidation !== null) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(input.state, "invalidFill", damageValidation);
    }
    /* v8 ignore stop */
    const damageSource = attackRolledState.combatants.get(attackerId);
    const damageRollByType = attackDamageByTypeEntries(
      attackRolledState,
      damageSource,
      attack,
      attack.procedureRef,
      fillSet.damageRoll,
      critical,
      effectiveAttackRoll,
      selectedDamageRidersAfterCunningStrikeCost,
      spellWeaponDamageRiders,
      spellMarkedDamageRiders,
    );
    const expectedSourcePenaltyHole =
      sourceDamageRollPenaltyRollHoleForDamageRoll(
        damageSource,
        damageAmountByTypeEntriesToMap(damageRollByType),
        fillSet.damageRoll.holeId,
      );
    const primarySourceDamageRollPenaltyRolls =
      primaryAttackSourceDamageRollPenaltyRolls(input.fills);
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (
      unexpectedSourceDamageRollPenaltyRoll(
        primarySourceDamageRollPenaltyRolls,
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
    const sourcePenalty = applyAvailableSourceDamageRollPenalty(
      damageSource,
      damageAmountByTypeEntriesToMap(damageRollByType),
      fillSet.damageRoll.holeId,
      sourceDamageRollPenaltyRollForDamageRoll(
        primarySourceDamageRollPenaltyRolls,
        damageSource,
        damageAmountByTypeEntriesToMap(damageRollByType),
        fillSet.damageRoll.holeId,
      ),
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
      return needsHolesResult(hitAppliedState, input.subject, [
        ...sourcePenalty.holes,
      ]);
    }
    const damageEvent = {
      kind: "rolledDamage" as const,
      damageRollByType: damageAmountByTypeMapEntries(
        sourcePenalty.damageByType,
      ),
    } satisfies BattleAttackDamageEvent;
    const reducedDamageEvent = attackDamageEventAfterPendingReductions(
      damageEvent,
      pendingAttackDamageReductions,
    );
    const spellReduction = applyAvailableSpellDamageReduction(
      damageTarget,
      damageAmountByTypeEntriesToMap(
        attackDamageEventEntries(reducedDamageEvent),
      ),
      fillSet.spellDamageReductionRoll,
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
      return needsHolesResult(hitAppliedState, input.subject, [
        ...spellReduction.holes,
      ]);
    }
    const reducedDamageEventAfterSpellReduction = attackDamageEventWithEntries(
      reducedDamageEvent,
      damageAmountByTypeMapEntries(spellReduction.damageByType),
    );
    const spellReducedState = {
      ...hitAppliedState,
      combatants: new Map(hitAppliedState.combatants).set(
        target.combatantId,
        spellReduction.target,
      ),
    };
    const reducedDamageAmount = attackDamageEventAmountForTarget(
      spellReducedState,
      spellReduction.target,
      reducedDamageEventAfterSpellReduction,
    );
    const reducedDamageBeforeTargetAdjustments =
      attackDamageEventAmountBeforeTargetAdjustments(
        reducedDamageEventAfterSpellReduction,
      );
    const redirectState =
      resolveAttackDamageReductionZeroDamageRedirectAfterReduction({
        state: spellReducedState,
        reductions: pendingAttackDamageReductions,
        reducedDamageBeforeTargetAdjustments,
        redirectTarget: fillSet.attackDamageReductionRedirectTarget,
        redirectSave: fillSet.attackDamageReductionRedirectSave,
        redirectDamage: fillSet.attackDamageReductionRedirectDamage,
        damageRelationshipDecisions: fillSet.damageRelationshipDecisions,
      });
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (redirectState.tag === "invalid") {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(input.state, "invalidFill", redirectState.message);
    }
    /* v8 ignore stop */
    if (redirectState.tag === "needsHoles") {
      return needsHolesResult(attackRolledState, input.subject, [
        ...redirectState.holes,
      ]);
    }
    const sapRedirectState = redirectState.state;
    const damageDispositionHole = attackDamageDispositionHole({
      attack,
      attackerId: attackerId,
      target: spellReduction.target,
      damageAmount: reducedDamageAmount,
    });
    const damageDispositionValidation = damageDispositionFillValidation({
      hole: damageDispositionHole,
      filled: primaryDamageDispositionFilled(fillSet),
      value: fillSet.damageDisposition,
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
    if (damageDispositionHole !== null) {
      if (!primaryDamageDispositionFilled(fillSet)) {
        return needsHolesResult(hitAppliedState, input.subject, [
          damageDispositionHole,
        ]);
      }
    }
    const grapplerPunchAndGrab = resolveGrapplerPunchAndGrabAfterHit({
      state: sapRedirectState,
      subject: input.subject,
      attackerId,
      targetId: target.combatantId,
      attack,
      fillSet,
    });
    if (grapplerPunchAndGrab.tag === "result") {
      return grapplerPunchAndGrab.result;
    }
    const primaryConcentrationSavingThrows =
      primaryAttackConcentrationSavingThrows(input.fills);
    const relationshipCheck = damageRelationshipDecisionFillCheck({
      state: grapplerPunchAndGrab.state,
      damageEventHoleId: fillSet.damageRoll.holeId,
      damageSourceId: attackerId,
      targets:
        Number(reducedDamageAmount) <= 0
          ? []
          : [
              {
                targetId: target.combatantId,
                damageAmount: toDamageAmount(Number(reducedDamageAmount)),
                damageDisposition: fillSet.damageDisposition,
              },
            ],
      spatialFacts: fillSet.targetSpatialFacts,
      decisionsByRelationshipHole: fillSet.damageRelationshipDecisions,
    });
    if (relationshipCheck.tag === "needsHoles") {
      return needsHolesResult(
        grapplerPunchAndGrab.state,
        input.subject,
        relationshipCheck.holes,
      );
    }
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (relationshipCheck.tag === "invalid") {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        relationshipCheck.message,
      );
    }
    /* v8 ignore stop */
    const attackDamageReactionWindow = maybeOpenInterruptWindow(
      grapplerPunchAndGrab.state,
      {
        trigger: "attackDamage",
        continuation: attackDamageInterruptionFrame({
          participant: input.subject,
          targetId: target.combatantId,
          targetSpatialFacts: fillSet.targetSpatialFacts,
          attackResult: effectiveAttackRoll,
          damageInput: reducedDamageEventAfterSpellReduction,
          critical,
          continuation: {
            kind: "primaryAttackDamage",
            concentrationSavingThrows: primaryConcentrationSavingThrows,
            damageDisposition: primaryAttackDamageDisposition(fillSet),
            attackDamageRiders: selectedDamageRidersAfterCunningStrikeCost,
            attack,
            fills: attackFollowUpFillsAfterPrimaryDamage(input.fills),
            ...optionalProperty(
              "relationshipDecisions",
              relationshipCheck.decisions,
            ),
            ...(selectedDamageDiceChoice === null
              ? {}
              : { weaponDamageDiceRollChoice: selectedDamageDiceChoice }),
            ...optionalProperty(
              "cunningStrike",
              selectedCunningStrikeContinuation,
            ),
          },
        }),
      },
      input.handledInterruptTrigger,
    );
    if (attackDamageReactionWindow !== null) {
      const spent = spendAttackProcedure(
        battleStateAfterBrutalStrikeAttackCompletion(
          attackDamageReactionWindow.state,
          brutalStrikePending,
        ),
        attackerId,
        attack,
        { kind: "acceptedAttack" },
      );
      return spent.tag === "invalid"
        ? spent
        : {
            ...attackDamageReactionWindow,
            state: spent.state,
            snapshot: snapshotBattle(spent.state),
          };
    }
    const concentrationSave = concentrationSavingThrowHole(
      spellReduction.target,
      reducedDamageAmount,
    );
    const primaryConcentrationSavingThrow =
      concentrationSave === null
        ? undefined
        : concentrationSavingThrowFillFor(
            primaryConcentrationSavingThrows,
            concentrationSave,
          );
    const concentrationSaveCheck =
      damageLifecycleConcentrationSavingThrowFillCheck({
        state: grapplerPunchAndGrab.state,
        target: spellReduction.target,
        damageAmount: reducedDamageAmount,
        fills: primaryConcentrationSavingThrows,
      });
    if (concentrationSaveCheck.tag === "needsHoles") {
      const pendingConcentrationSave = concentrationSaveCheck.holes[0];
      if (pendingConcentrationSave !== undefined) {
        return needsAttackDamageConcentrationResult({
          state: grapplerPunchAndGrab.state,
          subject: input.subject,
          attack,
          continuation: attackDamageInterruptionFrame({
            participant: input.subject,
            targetId: target.combatantId,
            targetSpatialFacts: fillSet.targetSpatialFacts,
            attackResult: effectiveAttackRoll,
            damageInput: reducedDamageEventAfterSpellReduction,
            critical,
            continuation: {
              kind: "primaryAttackDamage",
              concentrationSavingThrows: primaryConcentrationSavingThrows,
              damageDisposition: primaryAttackDamageDisposition(fillSet),
              attackDamageRiders: selectedDamageRidersAfterCunningStrikeCost,
              attack,
              fills: attackFollowUpFillsAfterPrimaryDamage(input.fills),
              ...optionalProperty(
                "relationshipDecisions",
                relationshipCheck.decisions,
              ),
              ...(selectedDamageDiceChoice === null
                ? {}
                : { weaponDamageDiceRollChoice: selectedDamageDiceChoice }),
              ...optionalProperty(
                "cunningStrike",
                selectedCunningStrikeContinuation,
              ),
            },
          }),
          concentrationSave: pendingConcentrationSave,
        });
      }
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
    const hideousLaughterSaveCheck =
      damageLifecycleHideousLaughterDamageRepeatSaveFillCheck({
        state: grapplerPunchAndGrab.state,
        target: spellReduction.target,
        damageAmount: reducedDamageAmount,
        fills: fillSet.hideousLaughterDamageRepeatSaves,
      });
    if (hideousLaughterSaveCheck.tag === "needsHoles") {
      return needsHolesResult(grapplerPunchAndGrab.state, input.subject, [
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
    const damageAppliedState = applyAttackDamageAmount({
      state: grapplerPunchAndGrab.state,
      attackerId,
      targetId: target.combatantId,
      damageAmount: toDamageAmount(reducedDamageAmount),
      deathFailuresAtZeroHp: critical ? 2 : 1,
      damageDisposition: fillSet.damageDisposition,
      attackDamageRiders: selectedDamageRidersAfterCunningStrikeCost,
      weaponDamageDiceRollChoice: selectedDamageDiceChoice ?? undefined,
      concentrationSavingThrow: primaryConcentrationSavingThrow,
      hideousLaughterDamageRepeatSaves:
        fillSet.hideousLaughterDamageRepeatSaves,
      wardingBondDamageShareConcentrationSavingThrows:
        primaryConcentrationSavingThrows,
      spatialFacts: fillSet.targetSpatialFacts,
      relationshipDecisions: relationshipCheck.decisions,
    });
    const cunningStrike = resolveCunningStrikeAfterAttackDamage({
      state: damageAppliedState,
      selected: selectedCunningStrike,
      savingThrow: fillSet.cunningStrikeSavingThrow,
      movement: fillSet.cunningStrikeMovement,
      toolPossession: fillSet.cunningStrikeToolPossession,
      endTurnCover: fillSet.cunningStrikeEndTurnCover,
    });
    if (cunningStrike.tag === "needsHoles") {
      return needsHolesResult(grapplerPunchAndGrab.state, input.subject, [
        ...cunningStrike.holes,
      ]);
    }
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (cunningStrike.tag === "invalid") {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(input.state, "invalidFill", cunningStrike.message);
    }
    /* v8 ignore stop */
    const damageWithSlowState = applyWeaponMasterySlowAfterDamage({
      state: cunningStrike.state,
      attackerId,
      targetId: target.combatantId,
      attack,
      damageAmount: Number(reducedDamageAmount),
    });
    const brutalStrikeApplied =
      brutalStrikeSupportSelection === null
        ? ({
            tag: "ok",
            state: damageWithSlowState,
            shovePushes: [],
          } as const)
        : resolveBrutalStrikeAfterDamage({
            state: damageWithSlowState,
            replayState: attackRolledState,
            subject: input.subject,
            targetId: target.combatantId,
            selection: brutalStrikeSupportSelection,
            choice: brutalStrikeEffectChoice,
            fillSet,
          });
    if (brutalStrikeApplied.tag === "result") {
      return brutalStrikeApplied.result;
    }
    const spent = spendAttackProcedure(
      battleStateAfterBrutalStrikeAttackCompletion(
        brutalStrikeApplied.state,
        brutalStrikePending,
      ),
      attackerId,
      attack,
      { kind: "acceptedAttack" },
    );
    if (spent.tag === "invalid") {
      return spent;
    }
    const primaryAfterDamageEvent = {
      damageSourceId: attackerId,
      damagedId: target.combatantId,
      damageAmount: toDamageAmount(reducedDamageAmount),
      reactionSpellTargetFacts: reactionSpellTargetFactsForAfterDamage({
        facts: fillSet.targetSpatialFacts,
        damagedId: target.combatantId,
        damageSourceId: attackerId,
      }),
    } satisfies BattleAfterDamageEvent;
    const primaryAfterDamageReactionWindow = maybeOpenInterruptWindow(
      spent.state,
      {
        trigger: "afterDamage",
        ...primaryAfterDamageEvent,
        continuation: attackFollowUpAfterPrimaryDamageContinuation({
          state: spent.state,
          subject: input.subject,
          firstTargetId: target.combatantId,
          attack,
          fills: input.fills,
          fillSet,
        }),
      },
      input.handledInterruptTrigger,
    );
    if (primaryAfterDamageReactionWindow !== null) {
      return primaryAfterDamageReactionWindow;
    }
    return withOpenHandTechniqueShovePushes(
      resolveAttackFollowUpContinuations(ATTACK_RESOLVERS, {
        state: spent.state,
        subject: input.subject,
        firstTargetId: target.combatantId,
        attack,
        fills: attackFollowUpFillsAfterPrimaryDamage(input.fills),
        handledInterruptTrigger: input.handledInterruptTrigger,
      }),
      [...shovePushes, ...brutalStrikeApplied.shovePushes],
    );
  }

  const spent = spendAttackProcedure(
    battleStateAfterBrutalStrikeAttackCompletion(
      attackRolledState,
      brutalStrikePending,
    ),
    attackerId,
    attack,
    { kind: "acceptedAttack" },
  );
  if (spent.tag === "invalid") {
    return spent;
  }
  return withOpenHandTechniqueShovePushes(
    resolveAttackFollowUpContinuations(ATTACK_RESOLVERS, {
      state: spent.state,
      subject: input.subject,
      firstTargetId: target.combatantId,
      attack,
      fills: input.fills,
      handledInterruptTrigger: input.handledInterruptTrigger,
    }),
    shovePushes,
  );
}

function requireCurrentAttackTarget(
  state: BattleState,
  resolvedTarget: BattleCreatureState,
): BattleCreatureState {
  const currentTarget = state.combatants.get(resolvedTarget.combatantId);
  /* v8 ignore start -- Internal invariant: attack-roll effect/resource transitions preserve the already-resolved target combatant while possibly replacing its state value. */
  if (currentTarget === undefined) {
    throw new Error(
      "Attack-roll transitions must preserve the resolved target.",
    );
  }
  /* v8 ignore stop */
  return currentTarget;
}

function withOpenHandTechniqueShovePushes(
  result: BattleResolutionResult,
  shovePushes: readonly BattleShovePushOutcome[],
): BattleResolutionResult {
  return result.tag === "resolved" && shovePushes.length > 0
    ? {
        ...result,
        shovePushes: [...(result.shovePushes ?? []), ...shovePushes],
      }
    : result;
}

function attackPostMirrorImageFillsArePresent(
  fillSet: Extract<AttackFillSet, { readonly tag: "ok" }>,
): boolean {
  return (
    fillSet.damageRoll !== undefined ||
    fillSet.damageDispositionFilled ||
    fillSet.brutalStrikeEffectDecision !== undefined ||
    fillSet.spellDamageReductionRoll !== undefined ||
    fillSet.sourceDamageRollPenaltyRolls.length > 0 ||
    fillSet.attackDamageReductionRedirectTarget !== undefined ||
    fillSet.attackDamageReductionRedirectSave !== undefined ||
    fillSet.attackDamageReductionRedirectDamage !== undefined ||
    fillSet.weaponMasteryToppleSavingThrow !== undefined ||
    fillSet.brutalStrikeForcefulBlowMovementDecision !== undefined ||
    fillSet.brutalStrikeForcefulBlowMovement !== undefined ||
    fillSet.openHandTechniqueDecision !== undefined ||
    fillSet.openHandTechniqueSavingThrow !== undefined ||
    fillSet.stunningStrikeDecision !== undefined ||
    fillSet.stunningStrikeSavingThrow !== undefined ||
    fillSet.hideousLaughterDamageRepeatSaves.length > 0 ||
    fillSet.concentrationSavingThrows.length > 0 ||
    fillSet.weaponMasteryCleaveDecision !== undefined ||
    fillSet.weaponMasteryCleaveTarget !== undefined ||
    fillSet.weaponMasteryCleaveAttackRoll !== undefined ||
    fillSet.weaponMasteryCleaveDamageRoll !== undefined ||
    fillSet.weaponMasteryCleaveDamageDispositionFilled ||
    fillSet.weaponMasteryCleaveRemarkableAthleteCriticalHitMovementDecision !==
      undefined ||
    fillSet.weaponMasteryCleaveRemarkableAthleteCriticalHitMovement !==
      undefined ||
    fillSet.remarkableAthleteCriticalHitMovementDecision !== undefined ||
    fillSet.remarkableAthleteCriticalHitMovement !== undefined ||
    fillSet.huntersPreyHordeBreakerDecision !== undefined ||
    fillSet.huntersPreyHordeBreakerTarget !== undefined ||
    fillSet.huntersPreyHordeBreakerAttackRoll !== undefined ||
    fillSet.huntersPreyHordeBreakerDamageRoll !== undefined ||
    fillSet.huntersPreyHordeBreakerDamageDispositionFilled ||
    fillSet.grapplerPunchAndGrabDecision !== undefined ||
    fillSet.grapplerPunchAndGrabOutcome !== undefined
  );
}

function attackFollowUpAfterPrimaryDamageContinuation(input: {
  readonly state: BattleState;
  readonly subject: BattleAttackHostSubject;
  readonly firstTargetId: BattleCreatureState["combatantId"];
  readonly attack: SupportedAttackActionOption;
  readonly fills: readonly BattleFill[];
  readonly fillSet: Extract<AttackFillSet, { readonly tag: "ok" }>;
}): BattleInterruptedProcedure {
  const cleaveContinuation =
    weaponMasteryCleaveAfterPrimaryDamageContinuation(input);
  return cleaveContinuation.kind === "resolved"
    ? huntersPreyHordeBreakerAfterPrimaryDamageContinuation(input)
    : cleaveContinuation;
}

export function resolveWeaponMasteryCleaveContinuation(input: {
  readonly state: BattleState;
  readonly subject: BattleAttackHostSubject;
  readonly firstTargetId: BattleCreatureState["combatantId"];
  readonly attack: SupportedAttackActionOption;
  readonly fills: readonly BattleFill[];
  readonly handledInterruptTrigger: AttackProcedureResolutionInput["handledInterruptTrigger"];
}): BattleResolutionResult {
  const fillSet = attackFillSet(
    input.fills,
    battleAttackHostParticipantId(input.subject),
    input.state,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  /* v8 ignore stop */
  const unexpectedSourcePenaltyRoll = fillSet.sourceDamageRollPenaltyRolls.find(
    (roll) =>
      !sourceDamageRollPenaltyRollFillMatchesDamageRoll(
        roll,
        WEAPON_MASTERY_CLEAVE_DAMAGE_HOLE_ID,
      ),
  );
  /* v8 ignore start -- Malformed fill: a direct Cleave continuation may carry only source-side penalty rolls owned by Cleave damage. */
  if (unexpectedSourcePenaltyRoll !== undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Source damage roll penalty does not match the Cleave damage event.",
    );
  }
  /* v8 ignore stop */
  const cleaveResolved = resolveWeaponMasteryCleaveAfterPrimaryDamage({
    state: input.state,
    subject: input.subject,
    firstTargetId: input.firstTargetId,
    attack: input.attack,
    fills: input.fills,
    fillSet,
    handledInterruptTrigger: input.handledInterruptTrigger,
  });
  return cleaveResolved.tag === "ok"
    ? {
        tag: "resolved",
        state: cleaveResolved.state,
        snapshot: snapshotBattle(cleaveResolved.state),
      }
    : cleaveResolved.result;
}

function weaponMasteryCleaveAfterPrimaryDamageContinuation(input: {
  readonly state: BattleState;
  readonly subject: BattleAttackHostSubject;
  readonly firstTargetId: BattleCreatureState["combatantId"];
  readonly attack: SupportedAttackActionOption;
  readonly fills: readonly BattleFill[];
  readonly fillSet: Extract<AttackFillSet, { readonly tag: "ok" }>;
}): BattleInterruptedProcedure {
  const decisionHole = weaponMasteryCleaveDecisionHole(
    input.state,
    input.subject.actorId,
    input.firstTargetId,
    input.attack,
  );
  return decisionHole === null && cleaveFillIsAbsent(input.fillSet)
    ? { kind: "resolved", subject: input.subject }
    : {
        kind: "weaponMasteryCleave",
        subject: input.subject,
        firstTargetId: input.firstTargetId,
        attack: input.attack,
        fills: attackFollowUpFillsAfterPrimaryDamage(input.fills),
      };
}

type ParsedAttackFillSet = Extract<AttackFillSet, { readonly tag: "ok" }>;

type WeaponMasteryTurnAdditionalWeaponAttackFills = {
  readonly decision: ParsedAttackFillSet["weaponMasteryCleaveDecision"];
  readonly target: ParsedAttackFillSet["weaponMasteryCleaveTarget"];
  readonly attackRoll: ParsedAttackFillSet["weaponMasteryCleaveAttackRoll"];
  readonly damageRoll: ParsedAttackFillSet["weaponMasteryCleaveDamageRoll"];
  readonly damageDispositionFilled: boolean;
  readonly sourceDamageRollPenaltyRolls: ParsedAttackFillSet["sourceDamageRollPenaltyRolls"];
};

type ProcedureExecutionAdditionalWeaponAttackFills = {
  readonly decision: ParsedAttackFillSet["huntersPreyHordeBreakerDecision"];
  readonly target: ParsedAttackFillSet["huntersPreyHordeBreakerTarget"];
  readonly attackRoll: ParsedAttackFillSet["huntersPreyHordeBreakerAttackRoll"];
  readonly damageRoll: ParsedAttackFillSet["huntersPreyHordeBreakerDamageRoll"];
  readonly damageDispositionFilled: boolean;
  readonly sourceDamageRollPenaltyRolls: ParsedAttackFillSet["sourceDamageRollPenaltyRolls"];
};

type AdditionalWeaponAttackFills =
  | WeaponMasteryTurnAdditionalWeaponAttackFills
  | ProcedureExecutionAdditionalWeaponAttackFills;

type AdditionalWeaponAttackActiveFills<
  Fills extends AdditionalWeaponAttackFills,
> = Pick<
  Fills,
  | "target"
  | "attackRoll"
  | "damageRoll"
  | "damageDispositionFilled"
  | "sourceDamageRollPenaltyRolls"
>;

type WeaponMasteryTurnAdditionalWeaponAttackFamily = {
  readonly kind: "weaponMasteryTurn";
  readonly fills: AdditionalWeaponAttackActiveFills<WeaponMasteryTurnAdditionalWeaponAttackFills>;
};

type ProcedureExecutionAdditionalWeaponAttackFamily = {
  readonly kind: "procedureExecution";
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly fills: AdditionalWeaponAttackActiveFills<ProcedureExecutionAdditionalWeaponAttackFills>;
};

type AdditionalWeaponAttackFamily =
  | WeaponMasteryTurnAdditionalWeaponAttackFamily
  | ProcedureExecutionAdditionalWeaponAttackFamily;

type AdditionalWeaponAttackDecisionCommon = {
  readonly state: BattleState;
  readonly subject: BattleAttackHostSubject;
  readonly decisionHole: BattleUnitFeatureDecisionHole | null;
  readonly attack: SupportedAttackActionOption;
};

type WeaponMasteryTurnAdditionalWeaponAttackDecisionInput =
  AdditionalWeaponAttackDecisionCommon & {
    readonly kind: "weaponMasteryTurn";
    readonly fills: WeaponMasteryTurnAdditionalWeaponAttackFills;
  };

type ProcedureExecutionAdditionalWeaponAttackDecisionInput =
  AdditionalWeaponAttackDecisionCommon & {
    readonly kind: "procedureExecution";
    readonly fills: ProcedureExecutionAdditionalWeaponAttackFills;
    readonly selection: ReturnType<typeof huntersPreyHordeBreakerSelection>;
  };

type AdditionalWeaponAttackDecisionFamily =
  | {
      readonly kind: "weaponMasteryTurn";
      readonly fills: WeaponMasteryTurnAdditionalWeaponAttackFills;
    }
  | {
      readonly kind: "procedureExecution";
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly fills: ProcedureExecutionAdditionalWeaponAttackFills;
    };

type AdditionalWeaponAttackDecisionResolution<
  Family extends AdditionalWeaponAttackFamily,
> =
  | { readonly tag: "ok"; readonly state: BattleState }
  | { readonly tag: "result"; readonly result: BattleResolutionResult }
  | {
      readonly tag: "use";
      readonly attack: Extract<
        SupportedAttackActionOption,
        { readonly kind: "weapon" }
      >;
      readonly family: Family;
    };

type AdditionalWeaponAttackMessages = {
  readonly name: string;
  readonly invalidEligibility: string;
  readonly wrongDecisionHole: string;
  readonly fillsRequireUse: string;
  readonly requiresWeapon: string;
  readonly damageAfterMiss: string;
};

function additionalWeaponAttackMessages(
  kind: AdditionalWeaponAttackFamily["kind"],
): AdditionalWeaponAttackMessages {
  return Match.value(kind).pipe(
    Match.when("weaponMasteryTurn", () => ({
      name: "Weapon Mastery additional weapon attack",
      invalidEligibility:
        "Weapon Mastery additional weapon attack is only valid after an eligible weapon hit.",
      wrongDecisionHole:
        "Weapon Mastery additional weapon attack decision uses the wrong hole.",
      fillsRequireUse:
        "Weapon Mastery additional weapon attack fills require using the attack.",
      requiresWeapon:
        "Weapon Mastery additional weapon attack requires a weapon attack.",
      damageAfterMiss:
        "Weapon Mastery additional weapon attack damage can only be filled after a hit.",
    })),
    Match.when("procedureExecution", () => ({
      name: "Procedure-bound additional weapon attack",
      invalidEligibility:
        "Procedure-bound additional weapon attack is only valid after an eligible selected weapon attack.",
      wrongDecisionHole:
        "Procedure-bound additional weapon attack decision uses the wrong hole.",
      fillsRequireUse:
        "Procedure-bound additional weapon attack fills require using the attack.",
      requiresWeapon:
        "Procedure-bound additional weapon attack requires a weapon attack.",
      damageAfterMiss:
        "Procedure-bound additional weapon attack damage can only be filled after a hit.",
    })),
    Match.exhaustive,
  );
}

function weaponMasteryCleaveAdditionalWeaponAttackFills(
  fillSet: ParsedAttackFillSet,
): WeaponMasteryTurnAdditionalWeaponAttackFills {
  return {
    decision: fillSet.weaponMasteryCleaveDecision,
    target: fillSet.weaponMasteryCleaveTarget,
    attackRoll: fillSet.weaponMasteryCleaveAttackRoll,
    damageRoll: fillSet.weaponMasteryCleaveDamageRoll,
    damageDispositionFilled: fillSet.weaponMasteryCleaveDamageDispositionFilled,
    sourceDamageRollPenaltyRolls: sourceDamageRollPenaltyRollsForDamageRollHole(
      fillSet.sourceDamageRollPenaltyRolls,
      WEAPON_MASTERY_CLEAVE_DAMAGE_HOLE_ID,
    ),
  };
}

function huntersPreyHordeBreakerAdditionalWeaponAttackFills(
  fillSet: ParsedAttackFillSet,
): ProcedureExecutionAdditionalWeaponAttackFills {
  return {
    decision: fillSet.huntersPreyHordeBreakerDecision,
    target: fillSet.huntersPreyHordeBreakerTarget,
    attackRoll: fillSet.huntersPreyHordeBreakerAttackRoll,
    damageRoll: fillSet.huntersPreyHordeBreakerDamageRoll,
    damageDispositionFilled:
      fillSet.huntersPreyHordeBreakerDamageDispositionFilled,
    sourceDamageRollPenaltyRolls: sourceDamageRollPenaltyRollsForDamageRollHole(
      fillSet.sourceDamageRollPenaltyRolls,
      HUNTERS_PREY_HORDE_BREAKER_DAMAGE_HOLE_ID,
    ),
  };
}

function additionalWeaponAttackFillsAreAbsent(
  fills: AdditionalWeaponAttackFills,
): boolean {
  return (
    fills.decision === undefined &&
    additionalWeaponAttackFillsAfterDecisionAreAbsent(fills)
  );
}

function sourceDamageRollPenaltyRollsForDamageRollHole(
  rolls: ParsedAttackFillSet["sourceDamageRollPenaltyRolls"],
  damageRollHoleId:
    | typeof WEAPON_MASTERY_CLEAVE_DAMAGE_HOLE_ID
    | typeof HUNTERS_PREY_HORDE_BREAKER_DAMAGE_HOLE_ID,
): ParsedAttackFillSet["sourceDamageRollPenaltyRolls"] {
  return rolls.filter((roll) =>
    sourceDamageRollPenaltyRollFillMatchesDamageRoll(roll, damageRollHoleId),
  );
}

function additionalWeaponAttackFillsAfterDecisionAreAbsent(
  fills: AdditionalWeaponAttackFills,
): boolean {
  return (
    fills.target === undefined &&
    fills.attackRoll === undefined &&
    fills.damageRoll === undefined &&
    !fills.damageDispositionFilled &&
    fills.sourceDamageRollPenaltyRolls.length === 0
  );
}

function resolveAdditionalWeaponAttackDecision(
  input: WeaponMasteryTurnAdditionalWeaponAttackDecisionInput,
): AdditionalWeaponAttackDecisionResolution<WeaponMasteryTurnAdditionalWeaponAttackFamily>;
function resolveAdditionalWeaponAttackDecision(
  input: ProcedureExecutionAdditionalWeaponAttackDecisionInput,
): AdditionalWeaponAttackDecisionResolution<ProcedureExecutionAdditionalWeaponAttackFamily>;
function resolveAdditionalWeaponAttackDecision(
  input:
    | WeaponMasteryTurnAdditionalWeaponAttackDecisionInput
    | ProcedureExecutionAdditionalWeaponAttackDecisionInput,
): AdditionalWeaponAttackDecisionResolution<AdditionalWeaponAttackFamily> {
  const messages = additionalWeaponAttackMessages(input.kind);
  if (input.decisionHole === null) {
    /* v8 ignore start -- Malformed fill set: additional-weapon-attack fills cannot exist when the completed primary attack is ineligible. */
    if (!additionalWeaponAttackFillsAreAbsent(input.fills)) {
      return {
        tag: "result",
        result: invalidResult(
          input.state,
          "invalidFill",
          messages.invalidEligibility,
        ),
      };
    }
    /* v8 ignore stop */
    return { tag: "ok", state: input.state };
  }
  const decisionHole = input.decisionHole;
  return Match.value(input).pipe(
    byKind("weaponMasteryTurn", (weaponMasteryInput) =>
      resolveAdditionalWeaponAttackDecisionForFamily({
        state: weaponMasteryInput.state,
        subject: weaponMasteryInput.subject,
        attack: weaponMasteryInput.attack,
        decisionHole,
        family: {
          kind: "weaponMasteryTurn",
          fills: weaponMasteryInput.fills,
        },
      }),
    ),
    byKind("procedureExecution", (procedureInput) => {
      /* v8 ignore start -- Stale subject: an emitted Horde Breaker decision may be replayed only while its execution binding remains active. */
      if (procedureInput.selection === null) {
        return {
          tag: "result" as const,
          result: invalidResult(
            procedureInput.state,
            "staleSubject",
            "Procedure-bound additional weapon attack execution binding is no longer available.",
          ),
        };
      }
      /* v8 ignore stop */
      return resolveAdditionalWeaponAttackDecisionForFamily({
        state: procedureInput.state,
        subject: procedureInput.subject,
        attack: procedureInput.attack,
        decisionHole,
        family: {
          kind: "procedureExecution",
          procedureRef: procedureInput.selection.procedureRef,
          fills: procedureInput.fills,
        },
      });
    }),
    Match.exhaustive,
  );
}

function resolveAdditionalWeaponAttackDecisionForFamily(
  input: Omit<AdditionalWeaponAttackDecisionCommon, "decisionHole"> & {
    readonly decisionHole: BattleUnitFeatureDecisionHole;
    readonly family: AdditionalWeaponAttackDecisionFamily;
  },
): AdditionalWeaponAttackDecisionResolution<AdditionalWeaponAttackFamily> {
  const { fills } = input.family;
  const messages = additionalWeaponAttackMessages(input.family.kind);
  if (fills.decision === undefined) {
    return {
      tag: "result",
      result: needsHolesResult(input.state, input.subject, [
        input.decisionHole,
      ]),
    };
  }
  /* v8 ignore start -- Malformed fill: an additional-weapon-attack decision must answer the exact emitted decision hole. */
  if (fills.decision.holeId !== input.decisionHole.holeId) {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        messages.wrongDecisionHole,
      ),
    };
  }
  /* v8 ignore stop */
  if (fills.decision.value === "decline") {
    /* v8 ignore start -- Malformed fill set: declining an additional weapon attack exposes none of its target, attack-roll, or damage holes. */
    if (!additionalWeaponAttackFillsAfterDecisionAreAbsent(fills)) {
      return {
        tag: "result",
        result: invalidResult(
          input.state,
          "invalidFill",
          messages.fillsRequireUse,
        ),
      };
    }
    /* v8 ignore stop */
    return { tag: "ok", state: input.state };
  }
  /* v8 ignore start -- Internal eligibility invariant: only a weapon attack can emit either additional-weapon-attack decision. */
  if (input.attack.kind !== "weapon") {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        messages.requiresWeapon,
      ),
    };
  }
  /* v8 ignore stop */
  const family = Match.value(input.family).pipe(
    byKind("weaponMasteryTurn", (weaponMasteryFamily) => ({
      kind: "weaponMasteryTurn" as const,
      fills: additionalWeaponAttackActiveFills(weaponMasteryFamily.fills),
    })),
    byKind("procedureExecution", (procedureFamily) => ({
      kind: "procedureExecution" as const,
      procedureRef: procedureFamily.procedureRef,
      fills: additionalWeaponAttackActiveFills(procedureFamily.fills),
    })),
    Match.exhaustive,
  );
  return { tag: "use", attack: input.attack, family };
}

function additionalWeaponAttackActiveFills<
  Fills extends AdditionalWeaponAttackFills,
>(fills: Fills): AdditionalWeaponAttackActiveFills<Fills> {
  return {
    target: fills.target,
    attackRoll: fills.attackRoll,
    damageRoll: fills.damageRoll,
    damageDispositionFilled: fills.damageDispositionFilled,
    sourceDamageRollPenaltyRolls: fills.sourceDamageRollPenaltyRolls,
  };
}

type AdditionalWeaponAttackRollFill = NonNullable<
  AdditionalWeaponAttackFills["attackRoll"]
>;

type AdditionalWeaponAttackRollResolution =
  | { readonly tag: "result"; readonly result: BattleResolutionResult }
  | {
      readonly tag: "ok";
      readonly fill: AdditionalWeaponAttackRollFill;
      readonly attackRoll: BattleAttackRollResult;
    };

function resolveAdditionalWeaponAttackRoll(input: {
  readonly state: BattleState;
  readonly subject: BattleAttackHostSubject;
  readonly attack: Extract<
    SupportedAttackActionOption,
    { readonly kind: "weapon" }
  >;
  readonly family: AdditionalWeaponAttackFamily;
  readonly targetId: CombatantId;
  readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
  readonly attackRollHole: BattleAttackRollHole;
}): AdditionalWeaponAttackRollResolution {
  const { attackRoll } = input.family.fills;
  if (attackRoll === undefined) {
    return {
      tag: "result",
      result: needsHolesResult(input.state, input.subject, [
        input.attackRollHole,
      ]),
    };
  }
  const requiredRollMode = requiredAttackRollMode(
    input.state,
    input.subject.actorId,
    input.targetId,
    input.attack,
    input.targetSpatialFacts,
  );
  const { name } = additionalWeaponAttackMessages(input.family.kind);
  /* v8 ignore start -- Malformed fill: an additional-weapon-attack roll must satisfy the admitted d20 result schema. */
  if (!attackRollResultIsValid(attackRoll.value)) {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        `${name} attack roll must be a valid attack roll.`,
      ),
    };
  }
  /* v8 ignore stop */
  const spellAttackRerollIssue = spellAttackRerollUnsupportedIssue(
    attackRoll.value,
  );
  /* v8 ignore start -- Malformed fill: an additional weapon attack cannot carry a spell-attack reroll selection. */
  if (spellAttackRerollIssue !== null) {
    return {
      tag: "result",
      result: invalidResult(input.state, "invalidFill", spellAttackRerollIssue),
    };
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed fill: roll mode must match the Advantage and Disadvantage facts used to emit this additional-attack hole. */
  if (!attackRollModeMatches(attackRoll.value, requiredRollMode)) {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        `${name} attack roll mode does not match current Advantage and Disadvantage sources.`,
      ),
    };
  }
  /* v8 ignore stop */
  const attacker = input.state.combatants.get(input.subject.actorId);
  if (
    d20TestNaturalOneRerollRollDecisionRequired({
      actor: attacker,
      originalNaturalD20: Number(attackRoll.value.naturalD20),
      rollMode: attackRoll.value.rollMode,
      rolledD20s: attackRoll.value.rolledD20s,
      decision: attackRoll.value.d20TestNaturalOneReroll,
    })
  ) {
    return {
      tag: "result",
      result: needsHolesResult(input.state, input.subject, [
        attackRollHoleWithD20TestNaturalOneRerollOption(input.attackRollHole),
      ]),
    };
  }
  const naturalOneRerollIssue = d20TestNaturalOneRerollRollIssue({
    actor: attacker,
    total: attackRoll.value.total,
    originalNaturalD20: Number(attackRoll.value.naturalD20),
    rollMode: attackRoll.value.rollMode,
    rolledD20s: attackRoll.value.rolledD20s,
    decision: attackRoll.value.d20TestNaturalOneReroll,
    requiredRollMode,
  });
  /* v8 ignore start -- Malformed fill: a natural-one reroll decision must match the option attached to this exact additional-attack roll. */
  if (naturalOneRerollIssue !== null) {
    return {
      tag: "result",
      result: invalidResult(input.state, "invalidFill", naturalOneRerollIssue),
    };
  }
  /* v8 ignore stop */
  return {
    tag: "ok",
    fill: attackRoll,
    attackRoll: effectiveD20TestNaturalOneRerollAttackRoll(attackRoll.value),
  };
}

function additionalWeaponAttackTargetSpatialFacts(
  target: NonNullable<AdditionalWeaponAttackFills["target"]>,
): readonly BattleTargetSpatialFact[] {
  return target.spatialFacts ?? [];
}

function recordAdditionalWeaponAttackUsed(
  state: BattleState,
  attackerId: CombatantId,
  family: AdditionalWeaponAttackFamily,
): BattleState {
  return Match.value(family).pipe(
    byKind("weaponMasteryTurn", () =>
      recordWeaponMasteryCleaveUsed(state, attackerId),
    ),
    byKind("procedureExecution", ({ procedureRef }) =>
      recordHuntersPreyHordeBreakerUsed(state, attackerId, procedureRef),
    ),
    Match.exhaustive,
  );
}

function resolveMissedAdditionalWeaponAttack(input: {
  readonly state: BattleState;
  readonly invalidFillState: BattleState;
  readonly attackerId: CombatantId;
  readonly hit: boolean;
  readonly family: AdditionalWeaponAttackFamily;
}):
  | { readonly tag: "hit" }
  | { readonly tag: "ok"; readonly state: BattleState }
  | { readonly tag: "result"; readonly result: BattleResolutionResult } {
  if (!input.hit) {
    /* v8 ignore start -- Malformed fill set: a missed additional weapon attack exposes no damage-roll hole. */
    if (
      input.family.fills.damageRoll !== undefined ||
      input.family.fills.sourceDamageRollPenaltyRolls.length > 0
    ) {
      return {
        tag: "result",
        result: invalidResult(
          input.invalidFillState,
          "invalidFill",
          additionalWeaponAttackMessages(input.family.kind).damageAfterMiss,
        ),
      };
    }
    /* v8 ignore stop */
    return {
      tag: "ok",
      state: recordAdditionalWeaponAttackUsed(
        input.state,
        input.attackerId,
        input.family,
      ),
    };
  }
  return { tag: "hit" };
}

type AdditionalWeaponAttackDamageFamily<
  Family extends AdditionalWeaponAttackFamily = AdditionalWeaponAttackFamily,
> = Family extends AdditionalWeaponAttackFamily
  ? Omit<Family, "fills"> & {
      readonly fills: Family["fills"] & {
        readonly damageRoll: NonNullable<Family["fills"]["damageRoll"]>;
      };
    }
  : never;

type AdditionalWeaponAttackDamageInput = {
  readonly family: AdditionalWeaponAttackDamageFamily;
  readonly state: BattleState;
  readonly invalidFillState: BattleState;
  readonly subject: BattleAttackHostSubject;
  readonly target: BattleCreatureState;
  readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
  readonly attackRoll: BattleAttackRollResult;
  readonly damageEvent: BattleAttackDamageEvent;
  readonly damageDispositionHole: BattleAttackDamageDispositionHole | null;
  readonly damageDispositionFilled: boolean;
  readonly damageDisposition: BattleAttackDamageDisposition;
  readonly concentrationSavingThrows: ParsedAttackFillSet["concentrationSavingThrows"];
  readonly relationshipDecisions: ParsedAttackFillSet["damageRelationshipDecisions"];
  readonly attackDamageRiders: readonly AttackDamageRider[];
  readonly critical: boolean;
  readonly handledInterruptTrigger: AttackProcedureResolutionInput["handledInterruptTrigger"];
};

function resolveAdditionalWeaponAttackDamage(
  input: AdditionalWeaponAttackDamageInput,
): BattleResolutionResult {
  const damageDispositionValidation = damageDispositionFillValidation({
    hole: input.damageDispositionHole,
    filled: input.damageDispositionFilled,
    value: input.damageDisposition,
  });
  /* v8 ignore start -- Malformed fill: damage disposition must answer the exact additional-attack damage-disposition hole when one exists. */
  if (damageDispositionValidation !== null) {
    return invalidResult(
      input.invalidFillState,
      "invalidFill",
      damageDispositionValidation,
    );
  }
  /* v8 ignore stop */
  if (input.damageDispositionHole !== null && !input.damageDispositionFilled) {
    return needsHolesResult(input.state, input.subject, [
      input.damageDispositionHole,
    ]);
  }
  const damageAmount = attackDamageEventAmountForTarget(
    input.state,
    input.target,
    input.damageEvent,
  );
  const relationshipCheck = damageRelationshipDecisionFillCheck({
    state: input.state,
    damageEventHoleId: input.family.fills.damageRoll.holeId,
    damageSourceId: input.subject.actorId,
    targets:
      Number(damageAmount) <= 0
        ? []
        : [
            {
              targetId: input.target.combatantId,
              damageAmount: toDamageAmount(Number(damageAmount)),
              damageDisposition: input.damageDisposition,
            },
          ],
    spatialFacts: input.targetSpatialFacts,
    decisionsByRelationshipHole: input.relationshipDecisions,
  });
  if (relationshipCheck.tag === "needsHoles") {
    return needsHolesResult(
      input.state,
      input.subject,
      relationshipCheck.holes,
    );
  }
  /* v8 ignore start -- Malformed fill: relationship decisions must answer only holes derived from this additional-attack damage event. */
  if (relationshipCheck.tag === "invalid") {
    return invalidResult(
      input.invalidFillState,
      "invalidFill",
      relationshipCheck.message,
    );
  }
  /* v8 ignore stop */
  const usedState = recordAdditionalWeaponAttackUsed(
    input.state,
    input.subject.actorId,
    input.family,
  );
  const continuation = attackDamageInterruptionFrame({
    participant: input.subject,
    targetId: input.target.combatantId,
    targetSpatialFacts: input.targetSpatialFacts,
    attackResult: input.attackRoll,
    damageInput: input.damageEvent,
    critical: input.critical,
    continuation: {
      kind: "damageOnly",
      concentrationSavingThrows: input.concentrationSavingThrows,
      damageDisposition: input.damageDisposition,
      attackDamageRiders: input.attackDamageRiders,
      ...optionalProperty("relationshipDecisions", relationshipCheck.decisions),
    },
  });
  const attackDamageReactionWindow = maybeOpenInterruptWindow(
    usedState,
    { trigger: "attackDamage", continuation },
    input.handledInterruptTrigger,
  );
  return (
    attackDamageReactionWindow ??
    resumeInterruptedProcedure(
      usedState,
      continuation,
      input.handledInterruptTrigger ?? "attackDamage",
      ATTACK_RESOLVERS,
    )
  );
}

function resolveWeaponMasteryCleaveAfterPrimaryDamage(input: {
  readonly state: BattleState;
  readonly subject: BattleAttackHostSubject;
  readonly firstTargetId: BattleCreatureState["combatantId"];
  readonly attack: SupportedAttackActionOption;
  readonly fills: readonly BattleFill[];
  readonly fillSet: Extract<AttackFillSet, { readonly tag: "ok" }>;
  readonly handledInterruptTrigger: AttackProcedureResolutionInput["handledInterruptTrigger"];
}):
  | { readonly tag: "ok"; readonly state: BattleState }
  | { readonly tag: "result"; readonly result: BattleResolutionResult } {
  const preparation = prepareWeaponMasteryCleaveAttack(input);
  if (preparation.tag !== "prepared") return preparation;
  const {
    decision,
    primaryAttack,
    cleaveAttack,
    secondTargetId,
    cleaveTargetFacts,
    targetRelationshipFacts,
    cleaveAttackRoll,
    secondTarget,
  } = preparation;
  const effectiveCleaveAttackRoll = cleaveAttackRoll.attackRoll;
  const cleaveCriticalThreshold = criticalThresholdForAttack(
    input.state.combatants.get(input.subject.actorId),
    cleaveAttack,
  );
  const ordinaryCleaveHit = attackRollHitsWithCriticalThreshold(
    effectiveCleaveAttackRoll,
    currentArmorClass(activeEffectArmorClass(input.state, secondTarget)),
    cleaveCriticalThreshold,
  );
  const cleaveMissToHitReplacement = selectedAttackRollMissToHitReplacement({
    state: input.state,
    subject: input.subject,
    attackerId: input.subject.actorId,
    targetId: secondTargetId,
    attackRoll: effectiveCleaveAttackRoll,
    ordinaryHit: ordinaryCleaveHit,
  });
  /* v8 ignore start -- Malformed fill: a miss-to-hit replacement ref is accepted only when the current missed roll exposes that exact replacement. */
  if (
    cleaveAttackRoll.fill.value.missToHitReplacementProcedureRef !==
      undefined &&
    cleaveMissToHitReplacement === null
  ) {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        ordinaryCleaveHit
          ? "Attack-roll miss-to-hit replacement can only be selected after a miss."
          : "Attack-roll miss-to-hit replacement is not available for this attack roll.",
      ),
    };
  }
  /* v8 ignore stop */
  const cleaveHit = ordinaryCleaveHit || cleaveMissToHitReplacement !== null;
  let cleaveAttackRolledState = recordAttackRollMissToHitReplacementUsed(
    consumeHelpAttackForAttackRoll(
      recordAttackRollOngoingFeatures(
        revealHidden(input.state, input.subject.actorId),
        input.subject.actorId,
        secondTargetId,
        null,
        targetRelationshipFacts,
      ),
      input.subject.actorId,
      secondTargetId,
    ),
    input.subject.actorId,
    cleaveMissToHitReplacement,
    {
      subject: input.subject,
      targetId: secondTargetId,
      attackRoll: effectiveCleaveAttackRoll,
    },
  );
  const cleaveCritical = attackRollIsCriticalHit(
    effectiveCleaveAttackRoll,
    cleaveCriticalThreshold,
  );
  if (cleaveHit && input.handledInterruptTrigger !== "attackHit") {
    const attackHitReactionWindow = maybeOpenInterruptWindow(
      cleaveAttackRolledState,
      {
        trigger: "attackHit",
        attackerId: input.subject.actorId,
        targetId: secondTargetId,
        attackRoll: effectiveCleaveAttackRoll,
        attackKind: attackKindForDeflectRedirect(cleaveAttack),
        attackHitTriggerKind: attackHitTriggerKind(cleaveAttack),
        damageTypes: prospectiveAttackDamageTypes(
          cleaveAttackRolledState,
          cleaveAttackRolledState.combatants.get(input.subject.actorId),
          cleaveAttack,
          cleaveCritical,
          effectiveCleaveAttackRoll,
          [],
          [],
          [],
        ),
        continuation: {
          kind: "weaponMasteryCleave",
          subject: input.subject,
          firstTargetId: input.firstTargetId,
          attack: primaryAttack,
          fills: cleaveFillsThroughAttackRoll(input.fills, input.fillSet),
        },
      },
      input.handledInterruptTrigger,
    );
    if (attackHitReactionWindow !== null) {
      return { tag: "result", result: attackHitReactionWindow };
    }
  }
  const remarkableAthleteMovement = resolveRemarkableAthleteCriticalHitMovement(
    {
      state: cleaveAttackRolledState,
      subject: input.subject,
      attackerId: input.subject.actorId,
      scoredCriticalHit: cleaveCritical,
      fills: {
        remarkableAthleteCriticalHitMovementDecision:
          input.fillSet
            .weaponMasteryCleaveRemarkableAthleteCriticalHitMovementDecision,
        remarkableAthleteCriticalHitMovement:
          input.fillSet.weaponMasteryCleaveRemarkableAthleteCriticalHitMovement,
      },
    },
  );
  if (remarkableAthleteMovement.tag === "result") {
    return { tag: "result", result: remarkableAthleteMovement.result };
  }
  cleaveAttackRolledState = remarkableAthleteMovement.state;
  const cleaveDamageDieFloorChoiceUnitIds =
    eligibleAttackDamageDieFloorProcedureRefs(
      cleaveAttackRolledState,
      input.subject.actorId,
      cleaveAttack,
      input.subject.procedureRef,
    );
  const cleaveMiss = resolveMissedAdditionalWeaponAttack({
    state: cleaveAttackRolledState,
    invalidFillState: input.state,
    attackerId: input.subject.actorId,
    hit: cleaveHit,
    family: decision.family,
  });
  if (cleaveMiss.tag !== "hit") return cleaveMiss;
  if (input.fillSet.weaponMasteryCleaveDamageRoll === undefined) {
    return {
      tag: "result",
      result: needsHolesResult(cleaveAttackRolledState, input.subject, [
        weaponMasteryCleaveDamageHole(
          cleaveAttack,
          cleaveCritical,
          effectiveCleaveAttackRoll,
          cleaveDamageDieFloorChoiceUnitIds,
        ),
      ]),
    };
  }
  const attackDamageDieFloorChoiceIssue = validateAttackDamageDieFloorChoice(
    input.fillSet.weaponMasteryCleaveDamageRoll,
    cleaveDamageDieFloorChoiceUnitIds,
  );
  /* v8 ignore start -- Malformed fill: any damage-die floor selection must reference an eligible procedure attached to this Cleave damage hole. */
  if (attackDamageDieFloorChoiceIssue !== null) {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        attackDamageDieFloorChoiceIssue,
      ),
    };
  }
  /* v8 ignore stop */
  const spellDamageRerollIssue = spellDamageRerollUnsupportedIssue(
    input.fillSet.weaponMasteryCleaveDamageRoll,
  );
  /* v8 ignore start -- Malformed fill: Cleave weapon damage cannot carry a spell-damage reroll selection. */
  if (spellDamageRerollIssue !== null) {
    return {
      tag: "result",
      result: invalidResult(input.state, "invalidFill", spellDamageRerollIssue),
    };
  }
  /* v8 ignore stop */
  const damageValidation = validateRolledDiceForWeaponAttack(
    input.fillSet.weaponMasteryCleaveDamageRoll.value,
    cleaveAttack,
    cleaveCritical,
    effectiveCleaveAttackRoll,
    [],
    [],
    [],
  );
  /* v8 ignore start -- Malformed fill: rolled dice must match the exact Cleave weapon expression, critical state, and attack result. */
  if (damageValidation !== null) {
    return {
      tag: "result",
      result: invalidResult(input.state, "invalidFill", damageValidation),
    };
  }
  /* v8 ignore stop */
  const damageByType = attackDamageByTypeEntries(
    cleaveAttackRolledState,
    cleaveAttackRolledState.combatants.get(input.subject.actorId),
    cleaveAttack,
    input.subject.procedureRef,
    input.fillSet.weaponMasteryCleaveDamageRoll,
    cleaveCritical,
    effectiveCleaveAttackRoll,
  );
  const cleaveDamageSource = cleaveAttackRolledState.combatants.get(
    input.subject.actorId,
  );
  const expectedSourcePenaltyHole =
    sourceDamageRollPenaltyRollHoleForDamageRoll(
      cleaveDamageSource,
      damageAmountByTypeEntriesToMap(damageByType),
      input.fillSet.weaponMasteryCleaveDamageRoll.holeId,
    );
  /* v8 ignore start -- Malformed fill: only the source-side penalty bound to this Cleave damage event may appear in the follow-up phase. */
  if (
    unexpectedSourceDamageRollPenaltyRoll(
      decision.family.fills.sourceDamageRollPenaltyRolls,
      expectedSourcePenaltyHole === null ? [] : [expectedSourcePenaltyHole],
    ) !== undefined
  ) {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        "Source damage roll penalty does not match an active source-side damage penalty.",
      ),
    };
  }
  /* v8 ignore stop */
  const sourcePenalty = applyAvailableSourceDamageRollPenalty(
    cleaveDamageSource,
    damageAmountByTypeEntriesToMap(damageByType),
    input.fillSet.weaponMasteryCleaveDamageRoll.holeId,
    sourceDamageRollPenaltyRollForDamageRoll(
      decision.family.fills.sourceDamageRollPenaltyRolls,
      cleaveDamageSource,
      damageAmountByTypeEntriesToMap(damageByType),
      input.fillSet.weaponMasteryCleaveDamageRoll.holeId,
    ),
  );
  /* v8 ignore start -- Malformed fill: a source-side damage penalty roll must match an active penalty and this exact damage event. */
  if (sourcePenalty.tag === "invalid") {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        "Source damage roll penalty does not match an active source-side damage penalty.",
      ),
    };
  }
  /* v8 ignore stop */
  if (sourcePenalty.tag === "needsHoles") {
    return {
      tag: "result",
      result: needsHolesResult(cleaveAttackRolledState, input.subject, [
        ...sourcePenalty.holes,
      ]),
    };
  }
  const damageEvent = {
    kind: "rolledDamage" as const,
    damageRollByType: damageAmountByTypeMapEntries(sourcePenalty.damageByType),
  } satisfies BattleAttackDamageEvent;
  const cleaveDamageAmount = attackDamageEventAmountForTarget(
    cleaveAttackRolledState,
    secondTarget,
    damageEvent,
  );
  const cleaveConcentrationSaveCheck =
    damageLifecycleConcentrationSavingThrowFillCheck({
      state: cleaveAttackRolledState,
      target: secondTarget,
      damageAmount: cleaveDamageAmount,
      fills: input.fillSet.concentrationSavingThrows,
    });
  /* v8 ignore start -- Malformed fill: concentration-save outcomes must answer only the save holes derived from this Cleave damage event. */
  if (cleaveConcentrationSaveCheck.tag === "invalid") {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        cleaveConcentrationSaveCheck.message,
      ),
    };
  }
  /* v8 ignore stop */
  const cleaveDamageDispositionHole = weaponMasteryCleaveDamageDispositionHole({
    attack: cleaveAttack,
    attackerId: input.subject.actorId,
    target: secondTarget,
    damageAmount: cleaveDamageAmount,
  });
  return {
    tag: "result",
    result: resolveAdditionalWeaponAttackDamage({
      state: cleaveAttackRolledState,
      invalidFillState: input.state,
      subject: input.subject,
      target: secondTarget,
      targetSpatialFacts: cleaveTargetFacts,
      attackRoll: effectiveCleaveAttackRoll,
      damageEvent,
      family: {
        ...decision.family,
        fills: {
          ...decision.family.fills,
          damageRoll: input.fillSet.weaponMasteryCleaveDamageRoll,
        },
      },
      damageDispositionHole: cleaveDamageDispositionHole,
      damageDispositionFilled:
        input.fillSet.weaponMasteryCleaveDamageDispositionFilled,
      damageDisposition: input.fillSet.weaponMasteryCleaveDamageDisposition,
      concentrationSavingThrows: input.fillSet.concentrationSavingThrows,
      relationshipDecisions: input.fillSet.damageRelationshipDecisions,
      attackDamageRiders: [],
      critical: cleaveCritical,
      handledInterruptTrigger: input.handledInterruptTrigger,
    }),
  };
}

type WeaponMasteryCleaveDecisionUse = Extract<
  AdditionalWeaponAttackDecisionResolution<WeaponMasteryTurnAdditionalWeaponAttackFamily>,
  { readonly tag: "use" }
>;

type WeaponMasteryCleavePreparation =
  | { readonly tag: "ok"; readonly state: BattleState }
  | { readonly tag: "result"; readonly result: BattleResolutionResult }
  | {
      readonly tag: "prepared";
      readonly decision: WeaponMasteryCleaveDecisionUse;
      readonly primaryAttack: WeaponMasteryCleaveDecisionUse["attack"];
      readonly cleaveAttack: ReturnType<typeof weaponMasteryCleaveExtraAttack>;
      readonly secondTargetId: CombatantId;
      readonly cleaveTargetFacts: readonly BattleTargetSpatialFact[];
      readonly targetRelationshipFacts: readonly BattleAttackRollRelationshipFact[];
      readonly cleaveAttackRoll: Extract<
        AdditionalWeaponAttackRollResolution,
        { readonly tag: "ok" }
      >;
      readonly secondTarget: BattleCreatureState;
    };

function prepareWeaponMasteryCleaveAttack(input: {
  readonly state: BattleState;
  readonly subject: BattleAttackHostSubject;
  readonly firstTargetId: BattleCreatureState["combatantId"];
  readonly attack: SupportedAttackActionOption;
  readonly fillSet: Extract<AttackFillSet, { readonly tag: "ok" }>;
}): WeaponMasteryCleavePreparation {
  const decision = resolveAdditionalWeaponAttackDecision({
    kind: "weaponMasteryTurn",
    state: input.state,
    subject: input.subject,
    decisionHole: weaponMasteryCleaveDecisionHole(
      input.state,
      input.subject.actorId,
      input.firstTargetId,
      input.attack,
    ),
    attack: input.attack,
    fills: weaponMasteryCleaveAdditionalWeaponAttackFills(input.fillSet),
  });
  if (decision.tag !== "use") return decision;
  const primaryAttack = decision.attack;
  const cleaveAttack = weaponMasteryCleaveExtraAttack(primaryAttack);
  const targetFill = input.fillSet.weaponMasteryCleaveTarget;
  if (targetFill === undefined) {
    return {
      tag: "result",
      result: needsHolesResult(input.state, input.subject, [
        weaponMasteryCleaveTargetHole(
          input.state,
          input.subject.actorId,
          input.firstTargetId,
        ),
      ]),
    };
  }
  const secondTargetId = targetFill.value;
  const cleaveTargetFacts =
    additionalWeaponAttackTargetSpatialFacts(targetFill);
  /* v8 ignore start -- Malformed fill: the selected second target must satisfy the spatial constraints encoded by the emitted Cleave target hole. */
  if (
    !weaponMasteryCleaveTargetIsLegal({
      state: input.state,
      attackerId: input.subject.actorId,
      firstTargetId: input.firstTargetId,
      secondTargetId,
      attack: cleaveAttack,
      targetSpatialFacts: cleaveTargetFacts,
    })
  ) {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        "Weapon Mastery Cleave second target must be within 5 feet of the first target and within the attacker's reach.",
      ),
    };
  }
  /* v8 ignore stop */
  const cleaveAttackRoll = resolveAdditionalWeaponAttackRoll({
    state: input.state,
    subject: input.subject,
    attack: cleaveAttack,
    family: decision.family,
    targetId: secondTargetId,
    targetSpatialFacts: cleaveTargetFacts,
    attackRollHole: weaponMasteryCleaveAttackRollHole(
      input.state,
      input.subject.actorId,
      secondTargetId,
      cleaveAttack,
      cleaveTargetFacts,
    ),
  });
  if (cleaveAttackRoll.tag === "result") return cleaveAttackRoll;
  const secondTarget = input.state.combatants.get(secondTargetId);
  /* v8 ignore start -- Stale subject: the target choice was admitted from the battle roster but may be replayed only after that target was removed. */
  if (secondTarget === undefined) {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        "Weapon Mastery Cleave second target is no longer in this battle.",
      ),
    };
  }
  /* v8 ignore stop */
  return {
    tag: "prepared",
    decision,
    primaryAttack,
    cleaveAttack,
    secondTargetId,
    cleaveTargetFacts,
    targetRelationshipFacts: targetFill.relationshipFacts ?? [],
    cleaveAttackRoll,
    secondTarget,
  };
}

function cleaveFillIsAbsent(
  fillSet: Extract<AttackFillSet, { readonly tag: "ok" }>,
): boolean {
  return additionalWeaponAttackFillsAreAbsent(
    weaponMasteryCleaveAdditionalWeaponAttackFills(fillSet),
  );
}

function weaponMasteryCleaveDamageDispositionHole(
  input: Parameters<typeof attackDamageDispositionHole>[0],
): ReturnType<typeof attackDamageDispositionHole> {
  const hole = attackDamageDispositionHole(input);
  return hole === null
    ? null
    : {
        ...hole,
        holeId: WEAPON_MASTERY_CLEAVE_DAMAGE_DISPOSITION_HOLE_ID,
        holeInstanceKey: WEAPON_MASTERY_CLEAVE_DAMAGE_DISPOSITION_HOLE_INSTANCE,
      };
}

function primaryDamageDispositionFilled(
  fillSet: Extract<AttackFillSet, { readonly tag: "ok" }>,
): boolean {
  return fillSet.damageDispositionFilled;
}

function primaryAttackDamageDisposition(
  fillSet: Extract<AttackFillSet, { readonly tag: "ok" }>,
) {
  return primaryDamageDispositionFilled(fillSet)
    ? fillSet.damageDisposition
    : ({ kind: "ordinaryDamage" } as const);
}

function cleaveFillsThroughAttackRoll(
  fills: readonly BattleFill[],
  fillSet: Extract<AttackFillSet, { readonly tag: "ok" }>,
): readonly BattleFill[] {
  return fills.filter(
    (fill) =>
      fill !== fillSet.weaponMasteryCleaveDamageRoll &&
      fill.kind !== "attackDamageDisposition",
  );
}

function attackFollowUpFillsAfterPrimaryDamage(
  fills: readonly BattleFill[],
): readonly BattleFill[] {
  const primaryConcentrationSavingThrows =
    primaryAttackConcentrationSavingThrows(fills);
  const primarySourceDamageRollPenaltyRolls =
    primaryAttackSourceDamageRollPenaltyRolls(fills);
  return fills.filter(
    (fill) =>
      !(
        fill.kind === "unitFeatureDecision" &&
        fill.holeId === GRAPPLER_PUNCH_AND_GRAB_DECISION_HOLE_ID
      ) &&
      fill.kind !== "grappleOutcome" &&
      (fill.kind !== "concentrationSavingThrow" ||
        !primaryConcentrationSavingThrows.includes(fill)) &&
      (fill.kind !== "rolledDice" ||
        !primarySourceDamageRollPenaltyRolls.includes(fill)),
  );
}

function primaryAttackSourceDamageRollPenaltyRolls(
  fills: readonly BattleFill[],
): readonly Extract<BattleFill, { readonly kind: "rolledDice" }>[] {
  return primaryAttackFills(fills).filter(
    (fill): fill is Extract<BattleFill, { readonly kind: "rolledDice" }> =>
      fill.kind === "rolledDice" && isSourceDamageRollPenaltyRollFill(fill),
  );
}

function primaryAttackConcentrationSavingThrows(
  fills: readonly BattleFill[],
): readonly Extract<
  BattleFill,
  { readonly kind: "concentrationSavingThrow" }
>[] {
  return primaryAttackFills(fills).filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "concentrationSavingThrow" }
    > => fill.kind === "concentrationSavingThrow",
  );
}

function primaryAttackFills(
  fills: readonly BattleFill[],
): readonly BattleFill[] {
  const cleaveStartIndex = fills.findIndex(
    (fill) =>
      fill.kind === "unitFeatureDecision" &&
      (fill.holeId === WEAPON_MASTERY_CLEAVE_DECISION_HOLE_ID ||
        fill.holeId === HUNTERS_PREY_HORDE_BREAKER_DECISION_HOLE_ID),
  );
  return cleaveStartIndex === -1 ? fills : fills.slice(0, cleaveStartIndex);
}

export function resolveHuntersPreyHordeBreakerContinuation(input: {
  readonly state: BattleState;
  readonly subject: BattleAttackHostSubject;
  readonly firstTargetId: BattleCreatureState["combatantId"];
  readonly attack: SupportedAttackActionOption;
  readonly fills: readonly BattleFill[];
  readonly handledInterruptTrigger: AttackProcedureResolutionInput["handledInterruptTrigger"];
}): BattleResolutionResult {
  const fillSet = attackFillSet(
    input.fills,
    battleAttackHostParticipantId(input.subject),
    input.state,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  /* v8 ignore stop */
  const unexpectedSourcePenaltyRoll = fillSet.sourceDamageRollPenaltyRolls.find(
    (roll) =>
      !sourceDamageRollPenaltyRollFillMatchesDamageRoll(
        roll,
        HUNTERS_PREY_HORDE_BREAKER_DAMAGE_HOLE_ID,
      ),
  );
  /* v8 ignore start -- Malformed fill: a direct Horde Breaker continuation may carry only source-side penalty rolls owned by Horde Breaker damage. */
  if (unexpectedSourcePenaltyRoll !== undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Source damage roll penalty does not match the Horde Breaker damage event.",
    );
  }
  /* v8 ignore stop */
  const resolved = resolveHuntersPreyHordeBreakerAfterPrimaryDamage({
    state: input.state,
    subject: input.subject,
    firstTargetId: input.firstTargetId,
    attack: input.attack,
    fills: input.fills,
    fillSet,
    handledInterruptTrigger: input.handledInterruptTrigger,
  });
  return resolved.tag === "ok"
    ? {
        tag: "resolved",
        state: resolved.state,
        snapshot: snapshotBattle(resolved.state),
      }
    : resolved.result;
}

function huntersPreyHordeBreakerAfterPrimaryDamageContinuation(input: {
  readonly state: BattleState;
  readonly subject: BattleAttackHostSubject;
  readonly firstTargetId: BattleCreatureState["combatantId"];
  readonly attack: SupportedAttackActionOption;
  readonly fills: readonly BattleFill[];
  readonly fillSet: Extract<AttackFillSet, { readonly tag: "ok" }>;
}): BattleInterruptedProcedure {
  const decisionHole = huntersPreyHordeBreakerDecisionHole(
    input.state,
    input.subject.actorId,
    input.firstTargetId,
    input.attack,
  );
  if (decisionHole === null && hordeBreakerFillIsAbsent(input.fillSet)) {
    return { kind: "resolved", subject: input.subject };
  }
  return {
    kind: "huntersPreyHordeBreaker",
    subject: input.subject,
    firstTargetId: input.firstTargetId,
    attack: input.attack,
    fills: attackFollowUpFillsAfterPrimaryDamage(input.fills),
  };
}

function resolveHuntersPreyHordeBreakerAfterPrimaryDamage(input: {
  readonly state: BattleState;
  readonly subject: BattleAttackHostSubject;
  readonly firstTargetId: BattleCreatureState["combatantId"];
  readonly attack: SupportedAttackActionOption;
  readonly fills: readonly BattleFill[];
  readonly fillSet: Extract<AttackFillSet, { readonly tag: "ok" }>;
  readonly handledInterruptTrigger: AttackProcedureResolutionInput["handledInterruptTrigger"];
}):
  | { readonly tag: "ok"; readonly state: BattleState }
  | { readonly tag: "result"; readonly result: BattleResolutionResult } {
  const preparation = prepareHuntersPreyHordeBreakerAttack(input);
  if (preparation.tag !== "prepared") return preparation;
  const {
    decision,
    hordeBreakerAttack,
    secondTargetId,
    targetFacts,
    targetRelationshipFacts,
    hordeBreakerAttackRoll,
    secondTarget,
  } = preparation;
  const effectiveHordeBreakerAttackRoll = hordeBreakerAttackRoll.attackRoll;
  const criticalThreshold = criticalThresholdForAttack(
    input.state.combatants.get(input.subject.actorId),
    hordeBreakerAttack,
  );
  const hit = attackRollHitsWithCriticalThreshold(
    effectiveHordeBreakerAttackRoll,
    currentArmorClass(activeEffectArmorClass(input.state, secondTarget)),
    criticalThreshold,
  );
  const rolledState = consumeHelpAttackForAttackRoll(
    recordAttackRollOngoingFeatures(
      revealHidden(input.state, input.subject.actorId),
      input.subject.actorId,
      secondTargetId,
      null,
      targetRelationshipFacts,
    ),
    input.subject.actorId,
    secondTargetId,
  );
  const critical = attackRollIsCriticalHit(
    effectiveHordeBreakerAttackRoll,
    criticalThreshold,
  );
  const hordeBreakerSpellWeaponDamageRiders = hit
    ? activeSpellWeaponDamageRiders(
        rolledState.combatants.get(input.subject.actorId),
        hordeBreakerAttack,
      )
    : [];
  const hordeBreakerSpellMarkedDamageRiders = hit
    ? activeMarkedDamageRiders(
        rolledState.combatants.get(input.subject.actorId),
        secondTargetId,
      )
    : [];
  const frenzyDamageType = frenzyDamageTypeDecision({
    state: rolledState,
    attackerId: input.subject.actorId,
    attack: hordeBreakerAttack,
    hitWithAttackRoll: hit,
    selectedDamageType: input.fillSet.frenzyDamageTypeChoice?.value,
  });
  if (frenzyDamageType.tag === "decisionRequired") {
    return {
      tag: "result",
      result: needsHolesResult(rolledState, input.subject, [
        frenzyDamageType.hole,
      ]),
    };
  }
  /* v8 ignore start -- Malformed fill: a Frenzy damage-type choice is accepted only when this Horde Breaker attack exposes that exact choice. */
  if (frenzyDamageType.tag === "invalid") {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        frenzyDamageType.message,
      ),
    };
  }
  /* v8 ignore stop */
  const hordeBreakerEligibleDamageRiders = hit
    ? eligibleAttackDamageRiders(
        rolledState,
        input.subject.actorId,
        secondTargetId,
        hordeBreakerAttack,
        effectiveHordeBreakerAttackRoll,
        targetFacts,
        frenzyDamageType,
      )
    : [];
  const hordeBreakerOngoingDamageModifier = ongoingFeatureDamageModifier(
    rolledState,
    rolledState.combatants.get(input.subject.actorId),
    hordeBreakerAttack,
  );
  if (hit && input.handledInterruptTrigger !== "attackHit") {
    const attackHitReactionWindow = maybeOpenInterruptWindow(
      rolledState,
      {
        trigger: "attackHit",
        attackerId: input.subject.actorId,
        targetId: secondTargetId,
        attackRoll: effectiveHordeBreakerAttackRoll,
        attackKind: attackKindForDeflectRedirect(hordeBreakerAttack),
        attackHitTriggerKind: attackHitTriggerKind(hordeBreakerAttack),
        damageTypes: prospectiveAttackDamageTypes(
          rolledState,
          rolledState.combatants.get(input.subject.actorId),
          hordeBreakerAttack,
          critical,
          effectiveHordeBreakerAttackRoll,
          hordeBreakerEligibleDamageRiders,
          hordeBreakerSpellWeaponDamageRiders,
          hordeBreakerSpellMarkedDamageRiders,
        ),
        continuation: {
          kind: "huntersPreyHordeBreaker",
          subject: input.subject,
          firstTargetId: input.firstTargetId,
          attack: hordeBreakerAttack,
          fills: hordeBreakerFillsThroughAttackRoll(input.fills, input.fillSet),
        },
      },
      input.handledInterruptTrigger,
    );
    if (attackHitReactionWindow !== null) {
      return { tag: "result", result: attackHitReactionWindow };
    }
  }
  const hordeBreakerMiss = resolveMissedAdditionalWeaponAttack({
    state: rolledState,
    invalidFillState: input.state,
    attackerId: input.subject.actorId,
    hit,
    family: decision.family,
  });
  if (hordeBreakerMiss.tag !== "hit") return hordeBreakerMiss;
  const hordeBreakerDamageDieFloorChoiceUnitIds =
    eligibleAttackDamageDieFloorProcedureRefs(
      rolledState,
      input.subject.actorId,
      hordeBreakerAttack,
      input.subject.procedureRef,
    );
  if (input.fillSet.huntersPreyHordeBreakerDamageRoll === undefined) {
    return {
      tag: "result",
      result: needsHolesResult(rolledState, input.subject, [
        huntersPreyHordeBreakerDamageHole(
          hordeBreakerAttack,
          critical,
          effectiveHordeBreakerAttackRoll,
          hordeBreakerEligibleDamageRiders,
          hordeBreakerSpellWeaponDamageRiders,
          hordeBreakerSpellMarkedDamageRiders,
          hordeBreakerOngoingDamageModifier,
          hordeBreakerDamageDieFloorChoiceUnitIds,
        ),
      ]),
    };
  }
  const attackDamageDieFloorChoiceIssue = validateAttackDamageDieFloorChoice(
    input.fillSet.huntersPreyHordeBreakerDamageRoll,
    hordeBreakerDamageDieFloorChoiceUnitIds,
  );
  /* v8 ignore start -- Malformed fill: any damage-die floor selection must reference an eligible procedure attached to this Horde Breaker damage hole. */
  if (attackDamageDieFloorChoiceIssue !== null) {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        attackDamageDieFloorChoiceIssue,
      ),
    };
  }
  /* v8 ignore stop */
  const hordeBreakerSelectedDamageRiders = selectedAttackDamageRiders(
    hordeBreakerEligibleDamageRiders,
    input.fillSet.huntersPreyHordeBreakerDamageRoll
      .selectedAttackDamageRiderProcedureRefs,
  );
  /* v8 ignore start -- Malformed fill: selected damage riders must be members of the eligible rider set attached to this Horde Breaker damage hole. */
  if (hordeBreakerSelectedDamageRiders === null) {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        "Selected attack damage rider is not eligible for this attack.",
      ),
    };
  }
  /* v8 ignore stop */
  const spellDamageRerollIssue = spellDamageRerollUnsupportedIssue(
    input.fillSet.huntersPreyHordeBreakerDamageRoll,
  );
  /* v8 ignore start -- Malformed fill: Horde Breaker weapon damage cannot carry a spell-damage reroll selection. */
  if (spellDamageRerollIssue !== null) {
    return {
      tag: "result",
      result: invalidResult(input.state, "invalidFill", spellDamageRerollIssue),
    };
  }
  /* v8 ignore stop */
  const damageValidation = validateRolledDiceForWeaponAttack(
    input.fillSet.huntersPreyHordeBreakerDamageRoll.value,
    hordeBreakerAttack,
    critical,
    effectiveHordeBreakerAttackRoll,
    hordeBreakerSelectedDamageRiders,
    hordeBreakerSpellWeaponDamageRiders,
    hordeBreakerSpellMarkedDamageRiders,
  );
  /* v8 ignore start -- Malformed fill: rolled dice must match the exact Horde Breaker weapon expression, critical state, and selected riders. */
  if (damageValidation !== null) {
    return {
      tag: "result",
      result: invalidResult(input.state, "invalidFill", damageValidation),
    };
  }
  /* v8 ignore stop */
  const damageByType = attackDamageByTypeEntries(
    rolledState,
    rolledState.combatants.get(input.subject.actorId),
    hordeBreakerAttack,
    input.subject.procedureRef,
    input.fillSet.huntersPreyHordeBreakerDamageRoll,
    critical,
    effectiveHordeBreakerAttackRoll,
    hordeBreakerSelectedDamageRiders,
    hordeBreakerSpellWeaponDamageRiders,
    hordeBreakerSpellMarkedDamageRiders,
  );
  const hordeBreakerDamageSource = rolledState.combatants.get(
    input.subject.actorId,
  );
  const expectedSourcePenaltyHole =
    sourceDamageRollPenaltyRollHoleForDamageRoll(
      hordeBreakerDamageSource,
      damageAmountByTypeEntriesToMap(damageByType),
      input.fillSet.huntersPreyHordeBreakerDamageRoll.holeId,
    );
  /* v8 ignore start -- Malformed fill: only the source-side penalty bound to this Horde Breaker damage event may appear in the follow-up phase. */
  if (
    unexpectedSourceDamageRollPenaltyRoll(
      decision.family.fills.sourceDamageRollPenaltyRolls,
      expectedSourcePenaltyHole === null ? [] : [expectedSourcePenaltyHole],
    ) !== undefined
  ) {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        "Source damage roll penalty does not match an active source-side damage penalty.",
      ),
    };
  }
  /* v8 ignore stop */
  const sourcePenalty = applyAvailableSourceDamageRollPenalty(
    hordeBreakerDamageSource,
    damageAmountByTypeEntriesToMap(damageByType),
    input.fillSet.huntersPreyHordeBreakerDamageRoll.holeId,
    sourceDamageRollPenaltyRollForDamageRoll(
      decision.family.fills.sourceDamageRollPenaltyRolls,
      hordeBreakerDamageSource,
      damageAmountByTypeEntriesToMap(damageByType),
      input.fillSet.huntersPreyHordeBreakerDamageRoll.holeId,
    ),
  );
  /* v8 ignore start -- Malformed fill: a source-side damage penalty roll must match an active penalty and this exact damage event. */
  if (sourcePenalty.tag === "invalid") {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        "Source damage roll penalty does not match an active source-side damage penalty.",
      ),
    };
  }
  /* v8 ignore stop */
  if (sourcePenalty.tag === "needsHoles") {
    return {
      tag: "result",
      result: needsHolesResult(rolledState, input.subject, [
        ...sourcePenalty.holes,
      ]),
    };
  }
  const damageEvent = {
    kind: "rolledDamage" as const,
    damageRollByType: damageAmountByTypeMapEntries(sourcePenalty.damageByType),
  } satisfies BattleAttackDamageEvent;
  const damageAmount = attackDamageEventAmountForTarget(
    rolledState,
    secondTarget,
    damageEvent,
  );
  const damageDispositionHole = huntersPreyHordeBreakerDamageDispositionHole({
    attack: hordeBreakerAttack,
    attackerId: input.subject.actorId,
    target: secondTarget,
    damageAmount,
  });
  return {
    tag: "result",
    result: resolveAdditionalWeaponAttackDamage({
      state: rolledState,
      invalidFillState: input.state,
      subject: input.subject,
      target: secondTarget,
      targetSpatialFacts: targetFacts,
      attackRoll: effectiveHordeBreakerAttackRoll,
      damageEvent,
      family: {
        ...decision.family,
        fills: {
          ...decision.family.fills,
          damageRoll: input.fillSet.huntersPreyHordeBreakerDamageRoll,
        },
      },
      damageDispositionHole,
      damageDispositionFilled:
        input.fillSet.huntersPreyHordeBreakerDamageDispositionFilled,
      damageDisposition: input.fillSet.huntersPreyHordeBreakerDamageDisposition,
      concentrationSavingThrows: input.fillSet.concentrationSavingThrows,
      relationshipDecisions: input.fillSet.damageRelationshipDecisions,
      attackDamageRiders: hordeBreakerSelectedDamageRiders,
      critical,
      handledInterruptTrigger: input.handledInterruptTrigger,
    }),
  };
}

type HuntersPreyHordeBreakerDecisionUse = Extract<
  AdditionalWeaponAttackDecisionResolution<ProcedureExecutionAdditionalWeaponAttackFamily>,
  { readonly tag: "use" }
>;

type HuntersPreyHordeBreakerPreparation =
  | { readonly tag: "ok"; readonly state: BattleState }
  | { readonly tag: "result"; readonly result: BattleResolutionResult }
  | {
      readonly tag: "prepared";
      readonly decision: HuntersPreyHordeBreakerDecisionUse;
      readonly hordeBreakerAttack: HuntersPreyHordeBreakerDecisionUse["attack"];
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly secondTargetId: CombatantId;
      readonly targetFacts: readonly BattleTargetSpatialFact[];
      readonly targetRelationshipFacts: readonly BattleAttackRollRelationshipFact[];
      readonly hordeBreakerAttackRoll: Extract<
        AdditionalWeaponAttackRollResolution,
        { readonly tag: "ok" }
      >;
      readonly secondTarget: BattleCreatureState;
    };

function prepareHuntersPreyHordeBreakerAttack(input: {
  readonly state: BattleState;
  readonly subject: BattleAttackHostSubject;
  readonly firstTargetId: BattleCreatureState["combatantId"];
  readonly attack: SupportedAttackActionOption;
  readonly fillSet: Extract<AttackFillSet, { readonly tag: "ok" }>;
}): HuntersPreyHordeBreakerPreparation {
  const decision = resolveAdditionalWeaponAttackDecision({
    kind: "procedureExecution",
    state: input.state,
    subject: input.subject,
    decisionHole: huntersPreyHordeBreakerDecisionHole(
      input.state,
      input.subject.actorId,
      input.firstTargetId,
      input.attack,
    ),
    attack: input.attack,
    fills: huntersPreyHordeBreakerAdditionalWeaponAttackFills(input.fillSet),
    selection: huntersPreyHordeBreakerSelection(
      input.state,
      input.subject.actorId,
      input.firstTargetId,
      input.attack,
    ),
  });
  if (decision.tag !== "use") return decision;
  const hordeBreakerAttack = decision.attack;
  const { procedureRef } = decision.family;
  const targetFill = input.fillSet.huntersPreyHordeBreakerTarget;
  if (targetFill === undefined) {
    return {
      tag: "result",
      result: needsHolesResult(input.state, input.subject, [
        huntersPreyHordeBreakerTargetHole(
          input.state,
          input.subject.actorId,
          input.firstTargetId,
          procedureRef,
        ),
      ]),
    };
  }
  const secondTargetId = targetFill.value;
  const targetFacts = additionalWeaponAttackTargetSpatialFacts(targetFill);
  /* v8 ignore start -- Malformed fill: the second target must satisfy the spatial constraints encoded by the emitted Horde Breaker target hole. */
  if (
    !huntersPreyHordeBreakerTargetIsLegal({
      state: input.state,
      attackerId: input.subject.actorId,
      sourceProcedureRef: procedureRef,
      firstTargetId: input.firstTargetId,
      secondTargetId,
      attack: hordeBreakerAttack,
      targetSpatialFacts: targetFacts,
    })
  ) {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        "Hunter's Prey Horde Breaker second target must be different, within 5 feet of the original target, within weapon range, and not already attacked this turn.",
      ),
    };
  }
  /* v8 ignore stop */
  const hordeBreakerAttackRoll = resolveAdditionalWeaponAttackRoll({
    state: input.state,
    subject: input.subject,
    attack: hordeBreakerAttack,
    family: decision.family,
    targetId: secondTargetId,
    targetSpatialFacts: targetFacts,
    attackRollHole: huntersPreyHordeBreakerAttackRollHole(
      input.state,
      input.subject.actorId,
      secondTargetId,
      hordeBreakerAttack,
      targetFacts,
    ),
  });
  if (hordeBreakerAttackRoll.tag === "result") {
    return hordeBreakerAttackRoll;
  }
  const secondTarget = input.state.combatants.get(secondTargetId);
  /* v8 ignore start -- Stale subject: the target choice was admitted from the battle roster but may be replayed only after that target was removed. */
  if (secondTarget === undefined) {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        "Hunter's Prey Horde Breaker second target is no longer in this battle.",
      ),
    };
  }
  /* v8 ignore stop */
  return {
    tag: "prepared",
    decision,
    hordeBreakerAttack,
    procedureRef,
    secondTargetId,
    targetFacts,
    targetRelationshipFacts: targetFill.relationshipFacts ?? [],
    hordeBreakerAttackRoll,
    secondTarget,
  };
}

export const ATTACK_RESOLVERS = {
  resolveAttack,
  resolveWeaponMasteryCleaveContinuation,
  resolveHuntersPreyHordeBreakerContinuation,
} satisfies BattleAttackResolvers;

function huntersPreyHordeBreakerDamageDispositionHole(
  input: Parameters<typeof attackDamageDispositionHole>[0],
): ReturnType<typeof attackDamageDispositionHole> {
  const hole = attackDamageDispositionHole(input);
  return hole === null
    ? null
    : {
        ...hole,
        holeId: HUNTERS_PREY_HORDE_BREAKER_DAMAGE_DISPOSITION_HOLE_ID,
        holeInstanceKey:
          HUNTERS_PREY_HORDE_BREAKER_DAMAGE_DISPOSITION_HOLE_INSTANCE,
      };
}

function hordeBreakerFillsThroughAttackRoll(
  fills: readonly BattleFill[],
  fillSet: Extract<AttackFillSet, { readonly tag: "ok" }>,
): readonly BattleFill[] {
  return fills.filter(
    (fill) =>
      fill !== fillSet.huntersPreyHordeBreakerDamageRoll &&
      fill.kind !== "attackDamageDisposition",
  );
}

function hordeBreakerFillIsAbsent(
  fillSet: Extract<AttackFillSet, { readonly tag: "ok" }>,
): boolean {
  return additionalWeaponAttackFillsAreAbsent(
    huntersPreyHordeBreakerAdditionalWeaponAttackFills(fillSet),
  );
}
