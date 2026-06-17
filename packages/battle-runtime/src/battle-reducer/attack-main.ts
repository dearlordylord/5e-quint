// Main Attack action resolution extracted from attack-resolution.ts.

// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// KERNEL-COVERAGE: runtime-owner BATTLE.DAMAGE.ATTACK_BRANCHES
// KERNEL-COVERAGE: runtime-owner BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING
// KERNEL-COVERAGE: runtime-owner BATTLE.PROTOCOL.CONCENTRATION_BREAK_TEARDOWN
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.grappler unit-feature.hunters-prey unit-feature.open-hand-technique unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.remarkable-athlete unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.weapon-mastery-sap unit-feature.weapon-mastery-topple unit-feature.weapon-mastery-cleave unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-weapon-damage-rider spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.d20-test-natural-one-reroll

import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";

import { attackRollResultIsValid } from "@dnd/shared-algebras/attack-roll-algebra";

import { damageAmount as toDamageAmount } from "@dnd/shared/types";

import {
  attackActionOptionForSubject,
  attackDamageDispositionHole,
  attackDamageHole,
  damageDispositionFillValidation,
} from "./attack-damage-apply.ts";
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
  weaponMasteryCleaveAttackRollHole,
  weaponMasteryCleaveDamageHole,
  weaponMasteryCleaveDecisionHole,
  weaponMasteryCleaveExtraAttack,
  weaponMasteryCleaveTargetHole,
  weaponMasteryCleaveTargetIsLegal,
  huntersPreyHordeBreakerAttackRollHole,
  huntersPreyHordeBreakerDamageHole,
  huntersPreyHordeBreakerDecisionHole,
  huntersPreyHordeBreakerTargetHole,
  huntersPreyHordeBreakerTargetIsLegal,
  recordHuntersPreyHordeBreakerUsed,
  applyWeaponMasteryToppleSavingThrow,
  applyWeaponMasterySapOnHit,
  consumeHelpAttackForAttackRoll,
  recordWeaponMasteryCleaveUsed,
  recordAttackRollOngoingFeatures,
  requiredAttackRollMode,
  weaponMasteryToppleSavingThrowHole,
} from "./attack-roll.ts";

import { activeEffectArmorClass } from "./creature-state.ts";

import {
  applyAttackDamageAmount,
  concentrationSavingThrowHole,
  damageLifecycleConcentrationSavingThrowFillCheck,
  damageLifecycleHideousLaughterDamageRepeatSaveFillCheck,
} from "./damage-apply.ts";

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
  ongoingFeatureDamageModifier,
  sourceDamageRollPenaltyRollHoleForDamageRoll,
  sourceDamageRollPenaltyRollForDamageRoll,
  unexpectedSourceDamageRollPenaltyRoll,
} from "./damage-helpers.ts";

import {
  attackDamageEventAfterPendingReductions,
  attackDamageEventAmountBeforeTargetAdjustments,
  attackDamageEventAmountForTarget,
  attackDamageEventEntries,
  attackDamageEventWithEntries,
  attackDamagePrefixFills,
  attackFillsThroughAttackRoll,
  maybeOpenInterruptWindow,
  resolveAttackDamageReductionZeroDamageRedirectAfterReduction,
  resumeInterruptedProcedure,
  snapshotBattle,
} from "./dispatcher.ts";

import {
  attackTargetHole,
  grappleOutcomeHole,
  needsHolesResult,
  revealHidden,
} from "./hole-helpers.ts";
import { reactionSpellTargetFactsForAfterDamage } from "./reaction-triggered-spells.ts";

import {
  attackHitTriggerKind,
  attackKindForDeflectRedirect,
  attackTargetIsLegal,
  grappleLinkForTarget,
} from "./movement-speed.ts";

import { attackFillSet } from "./attack-fill-set.ts";
import {
  GRAPPLER_PUNCH_AND_GRAB_DECISION_HOLE_ID,
  GRAPPLER_PUNCH_AND_GRAB_DECISION_HOLE_INSTANCE,
  WEAPON_MASTERY_CLEAVE_DECISION_HOLE_ID,
  WEAPON_MASTERY_CLEAVE_DAMAGE_DISPOSITION_HOLE_ID,
  WEAPON_MASTERY_CLEAVE_DAMAGE_DISPOSITION_HOLE_INSTANCE,
  HUNTERS_PREY_HORDE_BREAKER_DECISION_HOLE_ID,
  HUNTERS_PREY_HORDE_BREAKER_DAMAGE_DISPOSITION_HOLE_ID,
  HUNTERS_PREY_HORDE_BREAKER_DAMAGE_DISPOSITION_HOLE_INSTANCE,
} from "./domain-constants.ts";
import { invalidResult } from "./result-helpers.ts";
import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
import {
  battleStateAfterTargetActionEarlyEndForActor,
  sanctuaryTargetingInterdictionCheck,
} from "./sanctuary-targeting-interdiction.ts";
import { mirrorImageHitInterceptionCheck } from "./mirror-image-hit-interception.ts";
import { resolveOpenHandTechniqueAfterHit } from "./open-hand-technique.ts";
import { resolveRemarkableAthleteCriticalHitMovement } from "./remarkable-athlete-critical-movement.ts";
import { applyStatBlockAttackHitConditionRiders } from "./statblock-attack-hit-condition-riders.ts";
import { HUNTERS_PREY_SUPPORT_PROFILE } from "../unit-feature-support.ts";
import { grapplerSupportProfileRefForCombatant } from "./grappler-support-profile.ts";

import {
  attackCanCarryKnockOutChoice,
  attackActionOptionName,
  attackPotentialDamageTypes,
  eligibleAttackDamageRiders,
  eligibleAttackDamageDieFloorUnitIds,
  eligibleWeaponDamageDiceRollChoiceUnitIds,
  recordAttackRollMissToHitReplacementUsed,
  selectedAttackDamageRiders,
  selectedAttackRollMissToHitReplacement,
  selectedWeaponDamageDiceRollChoice,
} from "./statblock-attacks.ts";
import { currentActorId } from "./creature-state-leaves.ts";

import {
  ATTACK_ROLL_HOLE_ID,
  ATTACK_TARGET_HOLE_ID,
  spellAttackRerollUnsupportedIssue,
  spellDamageRerollUnsupportedIssue,
} from "../battle-reducer.ts";
import type {
  AttackBattleResolutionInput,
  BattleAttackHostSubject,
  BattleAttackDamageEvent,
  BattleAfterDamageEvent,
  BattleAttackDamagePrefixFill,
  BattleCreatureState,
  BattleFill,
  BattleGrappleLink,
  BattleInterruptedProcedure,
  BattleResolutionResult,
  BattleShovePushOutcome,
  BattleState,
  BattleTargetSpatialFact,
  BattleUnitFeatureDecisionHole,
  AttackFillSet,
} from "../battle-reducer.ts";
import type { SupportedAttackActionOption } from "../battle-action-options.ts";
import type { CombatantId } from "../identity.ts";
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

type SpendAttackProcedure = (
  state: Parameters<typeof spendAttackAction>[0],
  actorId: Parameters<typeof spendAttackAction>[1],
  attack: SupportedAttackActionOption,
) => ReturnType<typeof spendAttackAction>;

export const ATTACK_TARGET_REQUIRED_BEFORE_ROLL_OR_DAMAGE_MESSAGE =
  "Attack target must be filled before attack roll or damage.";
export const ATTACK_ROLL_REQUIRED_BEFORE_DAMAGE_MESSAGE =
  "Attack roll must be filled before attack damage.";

function attackProcedureAttackerId(
  subject: BattleAttackHostSubject,
): CombatantId {
  return subject.tag === "pactOfTheChainFamiliarAttack"
    ? subject.familiarId
    : subject.actorId;
}

type GrapplerPunchAndGrabEligibility = {
  readonly link: BattleGrappleLink;
  readonly unitFeature: BattleUnitFeatureDecisionHole["unitFeature"];
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
  const unitFeature = grapplerPunchAndGrabUnitFeature(attacker);
  if (
    input.subject.tag !== "action" ||
    input.subject.action !== "attack" ||
    currentActorId(input.state) !== input.attackerId ||
    input.attack.kind !== "unarmedStrike" ||
    unitFeature === null ||
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
  return link.tag === "ok" ? { link: link.link, unitFeature } : null;
}

function grapplerPunchAndGrabUnitFeature(
  attacker: BattleCreatureState | undefined,
): BattleUnitFeatureDecisionHole["unitFeature"] | null {
  const support = grapplerSupportProfileRefForCombatant(attacker);
  return support === null
    ? null
    : {
        unitId: support.unitRef.unitId,
        label: "Punch and Grab",
      };
}

function grapplerPunchAndGrabDecisionHole(
  eligibility: GrapplerPunchAndGrabEligibility,
): BattleUnitFeatureDecisionHole {
  return {
    kind: "unitFeatureDecision",
    holeId: GRAPPLER_PUNCH_AND_GRAB_DECISION_HOLE_ID,
    holeInstanceKey: GRAPPLER_PUNCH_AND_GRAB_DECISION_HOLE_INSTANCE,
    label: "Use Punch and Grab",
    unitFeature: eligibility.unitFeature,
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
  const attackName = attackActionOptionName(input.attack);
  return input.targetSpatialFacts.some(
    (fact) =>
      fact.kind === "attackTargetInMeleeReach" &&
      fact.actorId === input.attackerId &&
      fact.targetId === input.targetId &&
      fact.attackName === attackName,
  )
    ? [
        ...input.targetSpatialFacts,
        {
          kind: "grappleTargetWithinReach" as const,
          grapplerId: input.attackerId,
          targetId: input.targetId,
        },
      ]
    : input.targetSpatialFacts;
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
    return grapplerPunchAndGrabFillIsAbsent(input.fillSet)
      ? { tag: "ok", state: input.state }
      : {
          tag: "result",
          result: invalidResult(
            input.state,
            "invalidFill",
            "Grappler Punch and Grab is only valid after an eligible Unarmed Strike hit.",
          ),
        };
  }
  const decisionHole = grapplerPunchAndGrabDecisionHole(eligibility);
  if (input.fillSet.grapplerPunchAndGrabDecision === undefined) {
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
    return {
      tag: "result",
      result: needsHolesResult(input.state, input.subject, [decisionHole]),
    };
  }
  if (
    input.fillSet.grapplerPunchAndGrabDecision.holeId !== decisionHole.holeId
  ) {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        "Grappler Punch and Grab decision uses the wrong hole.",
      ),
    };
  }
  if (input.fillSet.grapplerPunchAndGrabDecision.value === "decline") {
    return input.fillSet.grapplerPunchAndGrabOutcome === undefined
      ? { tag: "ok", state: input.state }
      : {
          tag: "result",
          result: invalidResult(
            input.state,
            "invalidFill",
            "Grappler Punch and Grab outcome requires using Punch and Grab.",
          ),
        };
  }
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
  if (input.fillSet.grapplerPunchAndGrabOutcome === undefined) {
    return {
      tag: "result",
      result: needsHolesResult(input.state, input.subject, [
        grappleOutcomeHole(eligibility.link),
      ]),
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

export function resolveSelectedAttackProcedure(
  input: AttackProcedureResolutionInput,
  attack: SupportedAttackActionOption,
  spendAttackProcedure: SpendAttackProcedure,
): BattleResolutionResult {
  const pendingAttackDamageReductions =
    input.pendingAttackDamageReductions ?? [];
  const pendingAttackDamageAdditions = input.pendingAttackDamageAdditions ?? [];

  const fillSet = attackFillSet(input.fills);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  const attackerId = attackProcedureAttackerId(input.subject);

  if (fillSet.targetId == null) {
    if (fillSet.attackRoll != null || fillSet.damageRoll != null) {
      return invalidResult(
        input.state,
        "invalidFill",
        ATTACK_TARGET_REQUIRED_BEFORE_ROLL_OR_DAMAGE_MESSAGE,
      );
    }
    return needsHolesResult(input.state, input.subject, [
      attackTargetHole(input.state, attackerId, attack),
    ]);
  }

  const target = input.state.combatants.get(fillSet.targetId);
  if (target == null || target.combatantId === attackerId) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack target must be another combatant in this battle.",
    );
  }
  if (
    !attackTargetIsLegal(
      input.state,
      attackerId,
      target.combatantId,
      attack,
      fillSet.targetSpatialFacts,
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack target is outside the selected attack's supported target constraint.",
    );
  }
  if (
    attack.kind === "weapon" &&
    huntersPreyMissingSelectedOption(input.state, attackerId)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Hunter's Prey requires a retained selected option before resolving weapon attacks.",
    );
  }
  if (
    fillSet.damageDisposition.kind === "knockOut" &&
    !attackCanCarryKnockOutChoice(attack)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Knock Out can only be chosen for melee attack damage.",
    );
  }

  const sanctuaryCheck = sanctuaryTargetingInterdictionCheck({
    state: input.state,
    triggeringCombatantId: attackerId,
    wardedCombatantId: target.combatantId,
    triggeringTargetEventId: ATTACK_TARGET_HOLE_ID,
    fills: input.fills,
  });
  if (sanctuaryCheck.tag === "needsHoles") {
    return needsHolesResult(input.state, input.subject, [sanctuaryCheck.hole]);
  }
  if (sanctuaryCheck.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", sanctuaryCheck.message);
  }
  if (sanctuaryCheck.tag === "lost") {
    return spendAttackProcedure(input.state, attackerId, attack);
  }
  if (sanctuaryCheck.tag === "newTarget") {
    const replacementTarget = input.state.combatants.get(
      sanctuaryCheck.targetId,
    );
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
      return invalidResult(
        input.state,
        "invalidFill",
        "Sanctuary replacement attack target must be legal for the selected attack.",
      );
    }
    const originalTargetFill = input.fills.find(
      (fill): fill is Extract<BattleFill, { readonly kind: "targetChoice" }> =>
        fill.kind === "targetChoice" && fill.value === target.combatantId,
    );
    if (originalTargetFill === undefined) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Sanctuary replacement requires the original attack target fill.",
      );
    }
    return resolveSelectedAttackProcedure(
      {
        ...input,
        fills: [
          ...input.fills
            .filter((fill) => fill.kind !== "sanctuaryInterdictionOutcome")
            .map((fill) =>
              fill === originalTargetFill
                ? {
                    ...fill,
                    value: replacementTarget.combatantId,
                    spatialFacts: sanctuaryCheck.spatialFacts,
                  }
                : fill,
            ),
        ],
      },
      attack,
      spendAttackProcedure,
    );
  }

  if (fillSet.attackRoll == null) {
    if (
      fillSet.damageRoll != null ||
      fillSet.damageDispositionFilled ||
      fillSet.sourceDamageRollPenaltyRolls.length > 0
    ) {
      return invalidResult(
        input.state,
        "invalidFill",
        ATTACK_ROLL_REQUIRED_BEFORE_DAMAGE_MESSAGE,
      );
    }
    return needsHolesResult(input.state, input.subject, [
      attackRollHole(
        input.state.combatants.get(attackerId),
        attack,
        requiredAttackRollMode(
          input.state,
          attackerId,
          target.combatantId,
          attack,
          fillSet.targetSpatialFacts,
        ),
        attackRollOngoingFeatureActivations(input.state, attackerId, attack),
      ),
    ]);
  }

  if (!attackRollResultIsValid(fillSet.attackRoll)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack roll result is outside the d20 attack-roll protocol.",
    );
  }
  const spellAttackRerollIssue = spellAttackRerollUnsupportedIssue(
    fillSet.attackRoll,
  );
  if (spellAttackRerollIssue !== null) {
    return invalidResult(input.state, "invalidFill", spellAttackRerollIssue);
  }
  const activatedOngoingFeatureProfile =
    attackRollOngoingFeatureActivationProfile(
      input.state,
      attackerId,
      attack,
      fillSet.attackRoll.activatedOngoingFeatureUnitId,
      input.replayingInterruptedProcedure === true ||
        fillSet.damageRoll != null,
    );
  if (
    fillSet.attackRoll.activatedOngoingFeatureUnitId !== undefined &&
    activatedOngoingFeatureProfile === null
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack-roll ongoing feature activation is not available for this attack roll.",
    );
  }
  const requiredRollMode = attackRollModeWithOptionalOngoingFeature(
    input.state,
    attackerId,
    target.combatantId,
    attack,
    fillSet.targetSpatialFacts,
    fillSet.attackRoll.activatedOngoingFeatureUnitId,
  );
  const attackRollModeWasEstablishedBeforeReplay =
    input.replayingInterruptedProcedure === true;
  if (
    !attackRollModeWasEstablishedBeforeReplay &&
    fillSet.attackRoll.activatedOngoingFeatureUnitId !== undefined &&
    fillSet.attackRoll.rollMode !== requiredRollMode
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack roll mode does not match the activated ongoing feature rule.",
    );
  }
  if (
    !attackRollModeWasEstablishedBeforeReplay &&
    !attackRollModeMatches(fillSet.attackRoll, requiredRollMode)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack roll mode does not match the current attack-roll rule.",
    );
  }
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
          requiredRollMode,
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
    requiredRollMode,
    otherD20RerollPresent: fillSet.attackRoll.spellAttackReroll !== undefined,
  });
  if (d20TestNaturalOneRerollIssue !== null) {
    return invalidResult(
      input.state,
      "invalidFill",
      d20TestNaturalOneRerollIssue,
    );
  }
  const effectiveAttackRoll = effectiveD20TestNaturalOneRerollAttackRoll(
    fillSet.attackRoll,
  );

  const criticalThreshold = criticalThresholdForAttack(attacker, attack);
  const ordinaryHit = attackRollHitsWithCriticalThreshold(
    effectiveAttackRoll,
    currentArmorClass(activeEffectArmorClass(target)),
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
  if (
    fillSet.attackRoll.missToHitReplacementUnitId !== undefined &&
    missToHitReplacement === null
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      ordinaryHit
        ? "Attack-roll miss-to-hit replacement can only be selected after a miss."
        : "Attack-roll miss-to-hit replacement is not available for this attack roll.",
    );
  }
  const hit = ordinaryHit || missToHitReplacement !== null;
  if (!hit && !grapplerPunchAndGrabFillIsAbsent(fillSet)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Grappler Punch and Grab is only valid after an eligible Unarmed Strike hit.",
    );
  }
  const attackRollState = battleStateAfterTargetActionEarlyEndForActor(
    input.state,
    attackerId,
  );
  const attackRolledState = recordAttackRollMissToHitReplacementUsed(
    consumeHelpAttackForAttackRoll(
      recordAttackRollOngoingFeatures(
        revealHidden(attackRollState, attackerId),
        attackerId,
        target.combatantId,
        activatedOngoingFeatureProfile,
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
  );
  const critical = attackRollIsCriticalHit(
    effectiveAttackRoll,
    criticalThreshold,
  );
  if (!hit && fillSet.mirrorImageDuplicateRoll !== undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Mirror Image duplicate roll is only valid after an attack-roll hit.",
    );
  }
  if (hit) {
    const mirrorImageAttacker = attackRolledState.combatants.get(attackerId);
    if (mirrorImageAttacker === undefined) {
      return invalidResult(
        input.state,
        "missingCombatant",
        "Attack actor is no longer in this battle.",
      );
    }
    const mirrorImageCheck = mirrorImageHitInterceptionCheck({
      state: attackRolledState,
      attacker: mirrorImageAttacker,
      target: attackRolledState.combatants.get(target.combatantId) ?? target,
      targetSpatialFacts: fillSet.targetSpatialFacts,
      triggeringAttackRollHoleId: ATTACK_ROLL_HOLE_ID,
      fill: fillSet.mirrorImageDuplicateRoll,
    });
    if (mirrorImageCheck.tag === "needsHoles") {
      return needsHolesResult(attackRolledState, input.subject, [
        mirrorImageCheck.hole,
      ]);
    }
    if (mirrorImageCheck.tag === "invalid") {
      return invalidResult(
        input.state,
        "invalidFill",
        mirrorImageCheck.message,
      );
    }
    if (mirrorImageCheck.tag === "hitDuplicate") {
      if (attackPostMirrorImageFillsArePresent(fillSet)) {
        return invalidResult(
          input.state,
          "invalidFill",
          "Attack damage and after-hit fills are not valid when Mirror Image redirects the hit to a duplicate.",
        );
      }
      return spendAttackProcedure(mirrorImageCheck.state, attackerId, attack);
    }
  }
  const eligibleDamageRiders = hit
    ? eligibleAttackDamageRiders(
        attackRolledState,
        attackerId,
        target.combatantId,
        attack,
        effectiveAttackRoll,
        fillSet.targetSpatialFacts,
      )
    : [];
  const eligibleDamageDiceChoiceUnitIds = hit
    ? eligibleWeaponDamageDiceRollChoiceUnitIds(
        attackRolledState,
        attackerId,
        attack,
      )
    : [];
  const eligibleDamageDieFloorChoiceUnitIds = hit
    ? eligibleAttackDamageDieFloorUnitIds(attackRolledState, attackerId, attack)
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
          fillSet.damageRoll.selectedAttackDamageRiderUnitIds,
        ) ?? []);
  const fixedDamageByTypeBeforeTargetAdjustments = hit
    ? eligibleDamageRiders.length > 0 ||
      spellMarkedDamageRiders.length > 0 ||
      spellWeaponDamageRiders.length > 0
      ? null
      : fixedAttackDamageByTypeEntries(
          attackRolledState.combatants.get(attackerId),
          attack,
          effectiveAttackRoll,
        )
    : null;
  const fixedDamageAmount =
    fixedDamageByTypeBeforeTargetAdjustments === null
      ? null
      : damageAmountByTypeAfterTargetAdjustments(
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
        damageTypes: attackPotentialDamageTypes(
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
          fills: attackFillsThroughAttackRoll(input.fills),
        },
      },
      input.handledInterruptTrigger,
    );
    if (reactionWindow !== null) {
      return reactionWindow;
    }
  }
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
  if (
    !hit &&
    (fillSet.openHandTechniqueDecision !== undefined ||
      fillSet.openHandTechniqueSavingThrow !== undefined)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Open Hand Technique is only valid after an eligible attack hit.",
    );
  }
  const openHandTechniqueApplied = hit
    ? resolveOpenHandTechniqueAfterHit({
        state: postRemarkableAthleteMovementState,
        subject: input.subject,
        actorId: attackerId,
        targetId: target.combatantId,
        decision: fillSet.openHandTechniqueDecision,
        savingThrow: fillSet.openHandTechniqueSavingThrow,
      })
    : ({
        tag: "ok",
        state: postRemarkableAthleteMovementState,
        shovePushes: [],
      } as const);
  if (openHandTechniqueApplied.tag === "invalid") {
    return invalidResult(
      input.state,
      "invalidFill",
      openHandTechniqueApplied.message,
    );
  }
  if (openHandTechniqueApplied.tag === "needsHoles") {
    return needsHolesResult(postRemarkableAthleteMovementState, input.subject, [
      ...openHandTechniqueApplied.holes,
    ]);
  }
  const toppleSaveHole = hit
    ? weaponMasteryToppleSavingThrowHole(
        openHandTechniqueApplied.state,
        attackerId,
        target.combatantId,
        attack,
      )
    : null;
  if (toppleSaveHole === null) {
    if (fillSet.weaponMasteryToppleSavingThrow !== undefined) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Weapon Mastery Topple Saving Throw is only valid for an eligible Topple weapon hit.",
      );
    }
  } else if (fillSet.weaponMasteryToppleSavingThrow === undefined) {
    return needsHolesResult(openHandTechniqueApplied.state, input.subject, [
      toppleSaveHole,
    ]);
  }
  const toppleApplied = fillSet.weaponMasteryToppleSavingThrow
    ? applyWeaponMasteryToppleSavingThrow(
        openHandTechniqueApplied.state,
        attackerId,
        target.combatantId,
        fillSet.weaponMasteryToppleSavingThrow,
      )
    : ({ tag: "ok", state: openHandTechniqueApplied.state } as const);
  if (toppleApplied.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", toppleApplied.message);
  }
  const weaponHitAppliedState = hit
    ? applyWeaponMasterySapOnHit(
        toppleApplied.state,
        attackerId,
        target.combatantId,
        attack,
      )
    : toppleApplied.state;
  const hitAppliedState = hit
    ? applyStatBlockAttackHitConditionRiders({
        state: weaponHitAppliedState,
        targetId: target.combatantId,
        attack,
      })
    : weaponHitAppliedState;
  const damageTarget =
    hitAppliedState.combatants.get(target.combatantId) ?? target;
  if (
    hit &&
    fixedDamageAmount !== null &&
    fixedDamageByTypeBeforeTargetAdjustments !== null
  ) {
    if (fillSet.damageRoll != null) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Fixed attack damage does not use a rolled damage fill.",
      );
    }
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
    if (spellReduction.tag === "invalid") {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell damage reduction roll does not match an unused matching damage-reduction spell effect.",
      );
    }
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
      });
    if (redirectState.tag === "invalid") {
      return invalidResult(input.state, "invalidFill", redirectState.message);
    }
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
    if (damageDispositionValidation !== null) {
      return invalidResult(
        input.state,
        "invalidFill",
        damageDispositionValidation,
      );
    }
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
    const attackDamageReactionWindow = maybeOpenInterruptWindow(
      grapplerPunchAndGrab.state,
      {
        trigger: "attackDamage",
        continuation: {
          kind: "attackDamage",
          subject: input.subject,
          attackerId: attackerId,
          targetId: target.combatantId,
          damageEvent: reducedDamageEventAfterSpellReduction,
          fills: attackDamagePrefixFills(input.fills),
          concentrationSavingThrows: primaryConcentrationSavingThrows,
          deathFailuresAtZeroHp: critical ? 2 : 1,
          damageDisposition: primaryAttackDamageDisposition(fillSet),
          attackDamageRiders: [],
        },
      },
      input.handledInterruptTrigger,
    );
    if (attackDamageReactionWindow !== null) {
      const spent = spendAttackProcedure(
        attackDamageReactionWindow.state,
        attackerId,
        attack,
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
          continuation: {
            kind: "attackDamage",
            subject: input.subject,
            attackerId: attackerId,
            targetId: target.combatantId,
            damageEvent: reducedDamageEventAfterSpellReduction,
            fills: attackDamagePrefixFills(input.fills),
            concentrationSavingThrows: primaryConcentrationSavingThrows,
            deathFailuresAtZeroHp: critical ? 2 : 1,
            damageDisposition: primaryAttackDamageDisposition(fillSet),
            attackDamageRiders: [],
          },
          concentrationSave: pendingConcentrationSave,
        });
      }
    }
    if (concentrationSaveCheck.tag === "invalid") {
      return invalidResult(
        input.state,
        "invalidFill",
        concentrationSaveCheck.message,
      );
    }
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
    if (hideousLaughterSaveCheck.tag === "invalid") {
      return invalidResult(
        input.state,
        "invalidFill",
        hideousLaughterSaveCheck.message,
      );
    }
    const spent = spendAttackProcedure(
      applyAttackDamageAmount(
        grapplerPunchAndGrab.state,
        attackerId,
        target.combatantId,
        toDamageAmount(reducedFixedDamageAmount),
        critical ? 2 : 1,
        fillSet.damageDisposition,
        [],
        undefined,
        primaryConcentrationSavingThrow,
        fillSet.hideousLaughterDamageRepeatSaves,
        primaryConcentrationSavingThrows,
        fillSet.targetSpatialFacts,
      ),
      attackerId,
      attack,
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
    const afterPrimaryDamage = resolveAttackFollowUpContinuations({
      state: spent.state,
      subject: input.subject,
      firstTargetId: target.combatantId,
      attack,
      fills: attackFollowUpFillsAfterPrimaryDamage(input.fills),
      handledInterruptTrigger: input.handledInterruptTrigger,
    });
    return withOpenHandTechniqueShovePushes(
      afterPrimaryDamage,
      openHandTechniqueApplied.shovePushes,
    );
  }
  if (hit && fillSet.damageRoll == null) {
    if (fillSet.sourceDamageRollPenaltyRolls.length > 0) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Attack damage can only be filled after a hit.",
      );
    }
    return needsHolesResult(hitAppliedState, input.subject, [
      attackDamageHole(
        attack,
        critical,
        effectiveAttackRoll,
        eligibleDamageRiders,
        spellWeaponDamageRiders,
        spellMarkedDamageRiders,
        ongoingFeatureDamageModifier(
          attackRolledState.combatants.get(attackerId),
          attack,
        ),
        eligibleDamageDiceChoiceUnitIds,
        eligibleDamageDieFloorChoiceUnitIds,
      ),
    ]);
  }
  if (
    !hit &&
    (fillSet.damageRoll != null ||
      fillSet.damageDispositionFilled ||
      fillSet.sourceDamageRollPenaltyRolls.length > 0)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack damage can only be filled after a hit.",
    );
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
        attackRolledState.combatants.get(attackerId),
        attack,
      ),
      eligibleDamageDiceChoiceUnitIds,
      eligibleDamageDieFloorChoiceUnitIds,
    );
    if (damageValidation !== null) {
      return invalidResult(input.state, "invalidFill", damageValidation);
    }
    const damageSource = attackRolledState.combatants.get(attackerId);
    const damageRollByType = attackDamageByTypeEntries(
      damageSource,
      attack,
      fillSet.damageRoll,
      critical,
      effectiveAttackRoll,
      selectedDamageRiders,
      spellWeaponDamageRiders,
      spellMarkedDamageRiders,
    );
    const expectedSourcePenaltyHole =
      sourceDamageRollPenaltyRollHoleForDamageRoll(
        damageSource,
        damageAmountByTypeEntriesToMap(damageRollByType),
        fillSet.damageRoll.holeId,
      );
    if (
      unexpectedSourceDamageRollPenaltyRoll(
        fillSet.sourceDamageRollPenaltyRolls,
        expectedSourcePenaltyHole === null ? [] : [expectedSourcePenaltyHole],
      ) !== undefined
    ) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Source damage roll penalty does not match an active source-side damage penalty.",
      );
    }
    const sourcePenalty = applyAvailableSourceDamageRollPenalty(
      damageSource,
      damageAmountByTypeEntriesToMap(damageRollByType),
      fillSet.damageRoll.holeId,
      sourceDamageRollPenaltyRollForDamageRoll(
        fillSet.sourceDamageRollPenaltyRolls,
        damageSource,
        damageAmountByTypeEntriesToMap(damageRollByType),
        fillSet.damageRoll.holeId,
      ),
    );
    if (sourcePenalty.tag === "invalid") {
      return invalidResult(
        input.state,
        "invalidFill",
        "Source damage roll penalty does not match an active source-side damage penalty.",
      );
    }
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
    if (spellReduction.tag === "invalid") {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell damage reduction roll does not match an unused matching damage-reduction spell effect.",
      );
    }
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
      });
    if (redirectState.tag === "invalid") {
      return invalidResult(input.state, "invalidFill", redirectState.message);
    }
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
    if (damageDispositionValidation !== null) {
      return invalidResult(
        input.state,
        "invalidFill",
        damageDispositionValidation,
      );
    }
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
    const attackDamageReactionWindow = maybeOpenInterruptWindow(
      grapplerPunchAndGrab.state,
      {
        trigger: "attackDamage",
        continuation: {
          kind: "attackDamage",
          subject: input.subject,
          attackerId: attackerId,
          targetId: target.combatantId,
          damageEvent: reducedDamageEventAfterSpellReduction,
          fills: attackDamagePrefixFills(input.fills),
          concentrationSavingThrows: primaryConcentrationSavingThrows,
          deathFailuresAtZeroHp: critical ? 2 : 1,
          damageDisposition: primaryAttackDamageDisposition(fillSet),
          attackDamageRiders: selectedDamageRiders,
          ...(selectedDamageDiceChoice === null
            ? {}
            : { weaponDamageDiceRollChoice: selectedDamageDiceChoice }),
        },
      },
      input.handledInterruptTrigger,
    );
    if (attackDamageReactionWindow !== null) {
      const spent = spendAttackProcedure(
        attackDamageReactionWindow.state,
        attackerId,
        attack,
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
          continuation: {
            kind: "attackDamage",
            subject: input.subject,
            attackerId: attackerId,
            targetId: target.combatantId,
            damageEvent: reducedDamageEventAfterSpellReduction,
            fills: attackDamagePrefixFills(input.fills),
            concentrationSavingThrows: primaryConcentrationSavingThrows,
            deathFailuresAtZeroHp: critical ? 2 : 1,
            damageDisposition: primaryAttackDamageDisposition(fillSet),
            attackDamageRiders: selectedDamageRiders,
            ...(selectedDamageDiceChoice === null
              ? {}
              : { weaponDamageDiceRollChoice: selectedDamageDiceChoice }),
          },
          concentrationSave: pendingConcentrationSave,
        });
      }
    }
    if (concentrationSaveCheck.tag === "invalid") {
      return invalidResult(
        input.state,
        "invalidFill",
        concentrationSaveCheck.message,
      );
    }
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
    if (hideousLaughterSaveCheck.tag === "invalid") {
      return invalidResult(
        input.state,
        "invalidFill",
        hideousLaughterSaveCheck.message,
      );
    }
    const spent = spendAttackProcedure(
      applyAttackDamageAmount(
        grapplerPunchAndGrab.state,
        attackerId,
        target.combatantId,
        toDamageAmount(reducedDamageAmount),
        critical ? 2 : 1,
        fillSet.damageDisposition,
        selectedDamageRiders,
        selectedDamageDiceChoice ?? undefined,
        primaryConcentrationSavingThrow,
        fillSet.hideousLaughterDamageRepeatSaves,
        primaryConcentrationSavingThrows,
        fillSet.targetSpatialFacts,
      ),
      attackerId,
      attack,
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
      resolveAttackFollowUpContinuations({
        state: spent.state,
        subject: input.subject,
        firstTargetId: target.combatantId,
        attack,
        fills: attackFollowUpFillsAfterPrimaryDamage(input.fills),
        handledInterruptTrigger: input.handledInterruptTrigger,
      }),
      openHandTechniqueApplied.shovePushes,
    );
  }

  const spent = spendAttackProcedure(attackRolledState, attackerId, attack);
  if (spent.tag === "invalid") {
    return spent;
  }
  return withOpenHandTechniqueShovePushes(
    resolveAttackFollowUpContinuations({
      state: spent.state,
      subject: input.subject,
      firstTargetId: target.combatantId,
      attack,
      fills: input.fills,
      handledInterruptTrigger: input.handledInterruptTrigger,
    }),
    openHandTechniqueApplied.shovePushes,
  );
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
    fillSet.spellDamageReductionRoll !== undefined ||
    fillSet.sourceDamageRollPenaltyRolls.length > 0 ||
    fillSet.attackDamageReductionRedirectTarget !== undefined ||
    fillSet.attackDamageReductionRedirectSave !== undefined ||
    fillSet.attackDamageReductionRedirectDamage !== undefined ||
    fillSet.weaponMasteryToppleSavingThrow !== undefined ||
    fillSet.openHandTechniqueDecision !== undefined ||
    fillSet.openHandTechniqueSavingThrow !== undefined ||
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

function resolveAttackFollowUpContinuations(input: {
  readonly state: BattleState;
  readonly subject: BattleAttackHostSubject;
  readonly firstTargetId: BattleCreatureState["combatantId"];
  readonly attack: SupportedAttackActionOption;
  readonly fills: readonly BattleFill[];
  readonly handledInterruptTrigger: AttackProcedureResolutionInput["handledInterruptTrigger"];
}): BattleResolutionResult {
  const cleaveResult = resolveWeaponMasteryCleaveContinuation(input);
  if (cleaveResult.tag !== "resolved") {
    return cleaveResult;
  }
  return resolveHuntersPreyHordeBreakerContinuation({
    ...input,
    state: cleaveResult.state,
  });
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
  const fillSet = attackFillSet(input.fills);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
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
  const decisionHole = weaponMasteryCleaveDecisionHole(
    input.state,
    input.subject.actorId,
    input.firstTargetId,
    input.attack,
  );
  if (decisionHole === null) {
    return cleaveFillIsAbsent(input.fillSet)
      ? { tag: "ok", state: input.state }
      : {
          tag: "result",
          result: invalidResult(
            input.state,
            "invalidFill",
            "Weapon Mastery Cleave is only valid for an eligible Cleave weapon hit.",
          ),
        };
  }
  if (input.fillSet.weaponMasteryCleaveDecision === undefined) {
    return {
      tag: "result",
      result: needsHolesResult(input.state, input.subject, [decisionHole]),
    };
  }
  if (
    input.fillSet.weaponMasteryCleaveDecision.holeId !== decisionHole.holeId
  ) {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        "Weapon Mastery Cleave decision uses the wrong hole.",
      ),
    };
  }
  if (input.fillSet.weaponMasteryCleaveDecision.value === "decline") {
    return cleaveAttackFillIsAbsent(input.fillSet)
      ? { tag: "ok", state: input.state }
      : {
          tag: "result",
          result: invalidResult(
            input.state,
            "invalidFill",
            "Weapon Mastery Cleave attack fills require using Cleave.",
          ),
        };
  }
  if (input.attack.kind !== "weapon") {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        "Weapon Mastery Cleave requires a weapon attack.",
      ),
    };
  }
  const cleaveAttack = weaponMasteryCleaveExtraAttack(input.attack);
  if (input.fillSet.weaponMasteryCleaveTarget === undefined) {
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
  const secondTargetId = input.fillSet.weaponMasteryCleaveTarget.value;
  const cleaveTargetFacts =
    input.fillSet.weaponMasteryCleaveTarget.spatialFacts ?? [];
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
  if (input.fillSet.weaponMasteryCleaveAttackRoll === undefined) {
    return {
      tag: "result",
      result: needsHolesResult(input.state, input.subject, [
        weaponMasteryCleaveAttackRollHole(
          input.state,
          input.subject.actorId,
          secondTargetId,
          cleaveAttack,
          cleaveTargetFacts,
        ),
      ]),
    };
  }
  const requiredRollMode = requiredAttackRollMode(
    input.state,
    input.subject.actorId,
    secondTargetId,
    cleaveAttack,
    cleaveTargetFacts,
  );
  if (
    !attackRollResultIsValid(input.fillSet.weaponMasteryCleaveAttackRoll.value)
  ) {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        "Weapon Mastery Cleave attack roll must be a valid attack roll.",
      ),
    };
  }
  const cleaveSpellAttackRerollIssue = spellAttackRerollUnsupportedIssue(
    input.fillSet.weaponMasteryCleaveAttackRoll.value,
  );
  if (cleaveSpellAttackRerollIssue !== null) {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        cleaveSpellAttackRerollIssue,
      ),
    };
  }
  if (
    !attackRollModeMatches(
      input.fillSet.weaponMasteryCleaveAttackRoll.value,
      requiredRollMode,
    )
  ) {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        "Weapon Mastery Cleave attack roll mode does not match current Advantage and Disadvantage sources.",
      ),
    };
  }
  const attacker = input.state.combatants.get(input.subject.actorId);
  if (
    d20TestNaturalOneRerollRollDecisionRequired({
      actor: attacker,
      originalNaturalD20: Number(
        input.fillSet.weaponMasteryCleaveAttackRoll.value.naturalD20,
      ),
      rollMode: input.fillSet.weaponMasteryCleaveAttackRoll.value.rollMode,
      rolledD20s: input.fillSet.weaponMasteryCleaveAttackRoll.value.rolledD20s,
      decision:
        input.fillSet.weaponMasteryCleaveAttackRoll.value
          .d20TestNaturalOneReroll,
    })
  ) {
    return {
      tag: "result",
      result: needsHolesResult(input.state, input.subject, [
        attackRollHoleWithD20TestNaturalOneRerollOption(
          weaponMasteryCleaveAttackRollHole(
            input.state,
            input.subject.actorId,
            secondTargetId,
            cleaveAttack,
            cleaveTargetFacts,
          ),
        ),
      ]),
    };
  }
  const cleaveD20TestNaturalOneRerollIssue = d20TestNaturalOneRerollRollIssue({
    actor: attacker,
    total: input.fillSet.weaponMasteryCleaveAttackRoll.value.total,
    originalNaturalD20: Number(
      input.fillSet.weaponMasteryCleaveAttackRoll.value.naturalD20,
    ),
    rollMode: input.fillSet.weaponMasteryCleaveAttackRoll.value.rollMode,
    rolledD20s: input.fillSet.weaponMasteryCleaveAttackRoll.value.rolledD20s,
    decision:
      input.fillSet.weaponMasteryCleaveAttackRoll.value.d20TestNaturalOneReroll,
    requiredRollMode,
  });
  if (cleaveD20TestNaturalOneRerollIssue !== null) {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        cleaveD20TestNaturalOneRerollIssue,
      ),
    };
  }
  const effectiveCleaveAttackRoll = effectiveD20TestNaturalOneRerollAttackRoll(
    input.fillSet.weaponMasteryCleaveAttackRoll.value,
  );
  const secondTarget = input.state.combatants.get(secondTargetId);
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
  const cleaveCriticalThreshold = criticalThresholdForAttack(
    input.state.combatants.get(input.subject.actorId),
    cleaveAttack,
  );
  const ordinaryCleaveHit = attackRollHitsWithCriticalThreshold(
    effectiveCleaveAttackRoll,
    currentArmorClass(activeEffectArmorClass(secondTarget)),
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
  if (
    input.fillSet.weaponMasteryCleaveAttackRoll.value
      .missToHitReplacementUnitId !== undefined &&
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
  const cleaveHit = ordinaryCleaveHit || cleaveMissToHitReplacement !== null;
  let cleaveAttackRolledState = recordAttackRollMissToHitReplacementUsed(
    consumeHelpAttackForAttackRoll(
      recordAttackRollOngoingFeatures(
        revealHidden(input.state, input.subject.actorId),
        input.subject.actorId,
        secondTargetId,
        null,
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
        damageTypes: attackPotentialDamageTypes(
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
          attack: input.attack,
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
  const cleaveDamageDieFloorChoiceUnitIds = eligibleAttackDamageDieFloorUnitIds(
    cleaveAttackRolledState,
    input.subject.actorId,
    cleaveAttack,
  );
  if (!cleaveHit) {
    return input.fillSet.weaponMasteryCleaveDamageRoll === undefined
      ? {
          tag: "ok",
          state: recordWeaponMasteryCleaveUsed(
            cleaveAttackRolledState,
            input.subject.actorId,
          ),
        }
      : {
          tag: "result",
          result: invalidResult(
            input.state,
            "invalidFill",
            "Weapon Mastery Cleave damage can only be filled after a hit.",
          ),
        };
  }
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
  const spellDamageRerollIssue = spellDamageRerollUnsupportedIssue(
    input.fillSet.weaponMasteryCleaveDamageRoll,
  );
  if (spellDamageRerollIssue !== null) {
    return {
      tag: "result",
      result: invalidResult(input.state, "invalidFill", spellDamageRerollIssue),
    };
  }
  const damageValidation = validateRolledDiceForWeaponAttack(
    input.fillSet.weaponMasteryCleaveDamageRoll.value,
    cleaveAttack,
    cleaveCritical,
    effectiveCleaveAttackRoll,
    [],
    [],
    [],
  );
  if (damageValidation !== null) {
    return {
      tag: "result",
      result: invalidResult(input.state, "invalidFill", damageValidation),
    };
  }
  const damageByType = attackDamageByTypeEntries(
    cleaveAttackRolledState.combatants.get(input.subject.actorId),
    cleaveAttack,
    input.fillSet.weaponMasteryCleaveDamageRoll,
    cleaveCritical,
    effectiveCleaveAttackRoll,
  );
  const cleaveDamageSource = cleaveAttackRolledState.combatants.get(
    input.subject.actorId,
  );
  const sourcePenalty = applyAvailableSourceDamageRollPenalty(
    cleaveDamageSource,
    damageAmountByTypeEntriesToMap(damageByType),
    input.fillSet.weaponMasteryCleaveDamageRoll.holeId,
    sourceDamageRollPenaltyRollForDamageRoll(
      input.fillSet.sourceDamageRollPenaltyRolls,
      cleaveDamageSource,
      damageAmountByTypeEntriesToMap(damageByType),
      input.fillSet.weaponMasteryCleaveDamageRoll.holeId,
    ),
  );
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
  const cleaveDamageDispositionHole = weaponMasteryCleaveDamageDispositionHole({
    attack: cleaveAttack,
    attackerId: input.subject.actorId,
    target: secondTarget,
    damageAmount: cleaveDamageAmount,
  });
  const cleaveDamageDispositionValidation = damageDispositionFillValidation({
    hole: cleaveDamageDispositionHole,
    filled: input.fillSet.weaponMasteryCleaveDamageDispositionFilled,
    value: input.fillSet.weaponMasteryCleaveDamageDisposition,
  });
  if (cleaveDamageDispositionValidation !== null) {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        cleaveDamageDispositionValidation,
      ),
    };
  }
  if (
    cleaveDamageDispositionHole !== null &&
    !input.fillSet.weaponMasteryCleaveDamageDispositionFilled
  ) {
    return {
      tag: "result",
      result: needsHolesResult(cleaveAttackRolledState, input.subject, [
        cleaveDamageDispositionHole,
      ]),
    };
  }
  const cleaveUsedState = recordWeaponMasteryCleaveUsed(
    cleaveAttackRolledState,
    input.subject.actorId,
  );
  const cleaveDamagePrefixFills = [
    input.fillSet.weaponMasteryCleaveTarget,
    input.fillSet.weaponMasteryCleaveAttackRoll,
    input.fillSet.weaponMasteryCleaveDamageRoll,
  ] as const satisfies readonly BattleAttackDamagePrefixFill[];
  const continuation = {
    kind: "attackDamage" as const,
    subject: input.subject,
    attackerId: input.subject.actorId,
    targetId: secondTargetId,
    damageEvent,
    fills: cleaveDamagePrefixFills,
    concentrationSavingThrows: input.fillSet.concentrationSavingThrows,
    deathFailuresAtZeroHp: cleaveCritical ? (2 as const) : (1 as const),
    damageDisposition: input.fillSet.weaponMasteryCleaveDamageDisposition,
    attackDamageRiders: [],
  };
  const attackDamageReactionWindow = maybeOpenInterruptWindow(
    cleaveUsedState,
    {
      trigger: "attackDamage",
      continuation,
    },
    input.handledInterruptTrigger,
  );
  if (attackDamageReactionWindow !== null) {
    return { tag: "result", result: attackDamageReactionWindow };
  }
  return {
    tag: "result",
    result: resumeInterruptedProcedure(
      cleaveUsedState,
      continuation,
      input.handledInterruptTrigger ?? "attackDamage",
    ),
  };
}

function cleaveFillIsAbsent(
  fillSet: Extract<AttackFillSet, { readonly tag: "ok" }>,
): boolean {
  return (
    fillSet.weaponMasteryCleaveDecision === undefined &&
    cleaveAttackFillIsAbsent(fillSet)
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
  return fills.filter(
    (fill) =>
      !(
        fill.kind === "unitFeatureDecision" &&
        fill.holeId === GRAPPLER_PUNCH_AND_GRAB_DECISION_HOLE_ID
      ) &&
      fill.kind !== "grappleOutcome" &&
      (fill.kind !== "concentrationSavingThrow" ||
        !primaryConcentrationSavingThrows.includes(fill)),
  );
}

function primaryAttackConcentrationSavingThrows(
  fills: readonly BattleFill[],
): readonly Extract<
  BattleFill,
  { readonly kind: "concentrationSavingThrow" }
>[] {
  const cleaveStartIndex = fills.findIndex(
    (fill) =>
      fill.kind === "unitFeatureDecision" &&
      (fill.holeId === WEAPON_MASTERY_CLEAVE_DECISION_HOLE_ID ||
        fill.holeId === HUNTERS_PREY_HORDE_BREAKER_DECISION_HOLE_ID),
  );
  const primaryFills =
    cleaveStartIndex === -1 ? fills : fills.slice(0, cleaveStartIndex);
  return primaryFills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "concentrationSavingThrow" }
    > => fill.kind === "concentrationSavingThrow",
  );
}

function cleaveAttackFillIsAbsent(
  fillSet: Extract<AttackFillSet, { readonly tag: "ok" }>,
): boolean {
  return (
    fillSet.weaponMasteryCleaveTarget === undefined &&
    fillSet.weaponMasteryCleaveAttackRoll === undefined &&
    fillSet.weaponMasteryCleaveDamageRoll === undefined &&
    !fillSet.weaponMasteryCleaveDamageDispositionFilled
  );
}

export function resolveHuntersPreyHordeBreakerContinuation(input: {
  readonly state: BattleState;
  readonly subject: BattleAttackHostSubject;
  readonly firstTargetId: BattleCreatureState["combatantId"];
  readonly attack: SupportedAttackActionOption;
  readonly fills: readonly BattleFill[];
  readonly handledInterruptTrigger: AttackProcedureResolutionInput["handledInterruptTrigger"];
}): BattleResolutionResult {
  const fillSet = attackFillSet(input.fills);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
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
  const decisionHole = huntersPreyHordeBreakerDecisionHole(
    input.state,
    input.subject.actorId,
    input.firstTargetId,
    input.attack,
  );
  if (decisionHole === null) {
    return hordeBreakerFillIsAbsent(input.fillSet)
      ? { tag: "ok", state: input.state }
      : {
          tag: "result",
          result: invalidResult(
            input.state,
            "invalidFill",
            "Hunter's Prey Horde Breaker is only valid for an eligible selected weapon attack.",
          ),
        };
  }
  const unitId = decisionHole.unitFeature.unitId;
  if (input.fillSet.huntersPreyHordeBreakerDecision === undefined) {
    return {
      tag: "result",
      result: needsHolesResult(input.state, input.subject, [decisionHole]),
    };
  }
  if (
    input.fillSet.huntersPreyHordeBreakerDecision.holeId !== decisionHole.holeId
  ) {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        "Hunter's Prey Horde Breaker decision uses the wrong hole.",
      ),
    };
  }
  if (input.fillSet.huntersPreyHordeBreakerDecision.value === "decline") {
    return hordeBreakerAttackFillIsAbsent(input.fillSet)
      ? { tag: "ok", state: input.state }
      : {
          tag: "result",
          result: invalidResult(
            input.state,
            "invalidFill",
            "Hunter's Prey Horde Breaker attack fills require using Horde Breaker.",
          ),
        };
  }
  if (input.attack.kind !== "weapon") {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        "Hunter's Prey Horde Breaker requires a weapon attack.",
      ),
    };
  }
  if (input.fillSet.huntersPreyHordeBreakerTarget === undefined) {
    return {
      tag: "result",
      result: needsHolesResult(input.state, input.subject, [
        huntersPreyHordeBreakerTargetHole(
          input.state,
          input.subject.actorId,
          input.firstTargetId,
        ),
      ]),
    };
  }
  const secondTargetId = input.fillSet.huntersPreyHordeBreakerTarget.value;
  const targetFacts =
    input.fillSet.huntersPreyHordeBreakerTarget.spatialFacts ?? [];
  if (
    !huntersPreyHordeBreakerTargetIsLegal({
      state: input.state,
      attackerId: input.subject.actorId,
      unitId,
      firstTargetId: input.firstTargetId,
      secondTargetId,
      attack: input.attack,
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
  if (input.fillSet.huntersPreyHordeBreakerAttackRoll === undefined) {
    return {
      tag: "result",
      result: needsHolesResult(input.state, input.subject, [
        huntersPreyHordeBreakerAttackRollHole(
          input.state,
          input.subject.actorId,
          secondTargetId,
          input.attack,
          targetFacts,
        ),
      ]),
    };
  }
  const requiredRollMode = requiredAttackRollMode(
    input.state,
    input.subject.actorId,
    secondTargetId,
    input.attack,
    targetFacts,
  );
  if (
    !attackRollResultIsValid(
      input.fillSet.huntersPreyHordeBreakerAttackRoll.value,
    )
  ) {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        "Hunter's Prey Horde Breaker attack roll must be a valid attack roll.",
      ),
    };
  }
  const hordeBreakerSpellAttackRerollIssue = spellAttackRerollUnsupportedIssue(
    input.fillSet.huntersPreyHordeBreakerAttackRoll.value,
  );
  if (hordeBreakerSpellAttackRerollIssue !== null) {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        hordeBreakerSpellAttackRerollIssue,
      ),
    };
  }
  if (
    !attackRollModeMatches(
      input.fillSet.huntersPreyHordeBreakerAttackRoll.value,
      requiredRollMode,
    )
  ) {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        "Hunter's Prey Horde Breaker attack roll mode does not match current Advantage and Disadvantage sources.",
      ),
    };
  }
  const attacker = input.state.combatants.get(input.subject.actorId);
  if (
    d20TestNaturalOneRerollRollDecisionRequired({
      actor: attacker,
      originalNaturalD20: Number(
        input.fillSet.huntersPreyHordeBreakerAttackRoll.value.naturalD20,
      ),
      rollMode: input.fillSet.huntersPreyHordeBreakerAttackRoll.value.rollMode,
      rolledD20s:
        input.fillSet.huntersPreyHordeBreakerAttackRoll.value.rolledD20s,
      decision:
        input.fillSet.huntersPreyHordeBreakerAttackRoll.value
          .d20TestNaturalOneReroll,
    })
  ) {
    return {
      tag: "result",
      result: needsHolesResult(input.state, input.subject, [
        attackRollHoleWithD20TestNaturalOneRerollOption(
          huntersPreyHordeBreakerAttackRollHole(
            input.state,
            input.subject.actorId,
            secondTargetId,
            input.attack,
            targetFacts,
          ),
        ),
      ]),
    };
  }
  const hordeBreakerD20TestNaturalOneRerollIssue =
    d20TestNaturalOneRerollRollIssue({
      actor: attacker,
      total: input.fillSet.huntersPreyHordeBreakerAttackRoll.value.total,
      originalNaturalD20: Number(
        input.fillSet.huntersPreyHordeBreakerAttackRoll.value.naturalD20,
      ),
      rollMode: input.fillSet.huntersPreyHordeBreakerAttackRoll.value.rollMode,
      rolledD20s:
        input.fillSet.huntersPreyHordeBreakerAttackRoll.value.rolledD20s,
      decision:
        input.fillSet.huntersPreyHordeBreakerAttackRoll.value
          .d20TestNaturalOneReroll,
      requiredRollMode,
    });
  if (hordeBreakerD20TestNaturalOneRerollIssue !== null) {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        hordeBreakerD20TestNaturalOneRerollIssue,
      ),
    };
  }
  const effectiveHordeBreakerAttackRoll =
    effectiveD20TestNaturalOneRerollAttackRoll(
      input.fillSet.huntersPreyHordeBreakerAttackRoll.value,
    );
  const secondTarget = input.state.combatants.get(secondTargetId);
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
  const criticalThreshold = criticalThresholdForAttack(
    input.state.combatants.get(input.subject.actorId),
    input.attack,
  );
  const hit = attackRollHitsWithCriticalThreshold(
    effectiveHordeBreakerAttackRoll,
    currentArmorClass(activeEffectArmorClass(secondTarget)),
    criticalThreshold,
  );
  const rolledState = consumeHelpAttackForAttackRoll(
    recordAttackRollOngoingFeatures(
      revealHidden(input.state, input.subject.actorId),
      input.subject.actorId,
      secondTargetId,
      null,
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
        input.attack,
      )
    : [];
  const hordeBreakerSpellMarkedDamageRiders = hit
    ? activeMarkedDamageRiders(
        rolledState.combatants.get(input.subject.actorId),
        secondTargetId,
      )
    : [];
  const hordeBreakerEligibleDamageRiders = hit
    ? eligibleAttackDamageRiders(
        rolledState,
        input.subject.actorId,
        secondTargetId,
        input.attack,
        effectiveHordeBreakerAttackRoll,
        targetFacts,
      )
    : [];
  const hordeBreakerOngoingDamageModifier = ongoingFeatureDamageModifier(
    rolledState.combatants.get(input.subject.actorId),
    input.attack,
  );
  if (hit && input.handledInterruptTrigger !== "attackHit") {
    const attackHitReactionWindow = maybeOpenInterruptWindow(
      rolledState,
      {
        trigger: "attackHit",
        attackerId: input.subject.actorId,
        targetId: secondTargetId,
        attackRoll: effectiveHordeBreakerAttackRoll,
        attackKind: attackKindForDeflectRedirect(input.attack),
        attackHitTriggerKind: attackHitTriggerKind(input.attack),
        damageTypes: attackPotentialDamageTypes(
          input.attack,
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
          attack: input.attack,
          fills: hordeBreakerFillsThroughAttackRoll(input.fills, input.fillSet),
        },
      },
      input.handledInterruptTrigger,
    );
    if (attackHitReactionWindow !== null) {
      return { tag: "result", result: attackHitReactionWindow };
    }
  }
  if (!hit) {
    return input.fillSet.huntersPreyHordeBreakerDamageRoll === undefined
      ? {
          tag: "ok",
          state: recordHuntersPreyHordeBreakerUsed(
            rolledState,
            input.subject.actorId,
            unitId,
          ),
        }
      : {
          tag: "result",
          result: invalidResult(
            input.state,
            "invalidFill",
            "Hunter's Prey Horde Breaker damage can only be filled after a hit.",
          ),
        };
  }
  const hordeBreakerDamageDieFloorChoiceUnitIds =
    eligibleAttackDamageDieFloorUnitIds(
      rolledState,
      input.subject.actorId,
      input.attack,
    );
  if (input.fillSet.huntersPreyHordeBreakerDamageRoll === undefined) {
    return {
      tag: "result",
      result: needsHolesResult(rolledState, input.subject, [
        huntersPreyHordeBreakerDamageHole(
          input.attack,
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
  const hordeBreakerSelectedDamageRiders = selectedAttackDamageRiders(
    hordeBreakerEligibleDamageRiders,
    input.fillSet.huntersPreyHordeBreakerDamageRoll
      .selectedAttackDamageRiderUnitIds,
  );
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
  const spellDamageRerollIssue = spellDamageRerollUnsupportedIssue(
    input.fillSet.huntersPreyHordeBreakerDamageRoll,
  );
  if (spellDamageRerollIssue !== null) {
    return {
      tag: "result",
      result: invalidResult(input.state, "invalidFill", spellDamageRerollIssue),
    };
  }
  const damageValidation = validateRolledDiceForWeaponAttack(
    input.fillSet.huntersPreyHordeBreakerDamageRoll.value,
    input.attack,
    critical,
    effectiveHordeBreakerAttackRoll,
    hordeBreakerSelectedDamageRiders,
    hordeBreakerSpellWeaponDamageRiders,
    hordeBreakerSpellMarkedDamageRiders,
  );
  if (damageValidation !== null) {
    return {
      tag: "result",
      result: invalidResult(input.state, "invalidFill", damageValidation),
    };
  }
  const damageByType = attackDamageByTypeEntries(
    rolledState.combatants.get(input.subject.actorId),
    input.attack,
    input.fillSet.huntersPreyHordeBreakerDamageRoll,
    critical,
    effectiveHordeBreakerAttackRoll,
    hordeBreakerSelectedDamageRiders,
    hordeBreakerSpellWeaponDamageRiders,
    hordeBreakerSpellMarkedDamageRiders,
  );
  const damageEvent = {
    kind: "rolledDamage" as const,
    damageRollByType: damageAmountByTypeMapEntries(
      damageAmountByTypeEntriesToMap(damageByType),
    ),
  } satisfies BattleAttackDamageEvent;
  const damageAmount = attackDamageEventAmountForTarget(
    secondTarget,
    damageEvent,
  );
  const damageDispositionHole = huntersPreyHordeBreakerDamageDispositionHole({
    attack: input.attack,
    attackerId: input.subject.actorId,
    target: secondTarget,
    damageAmount,
  });
  const damageDispositionValidation = damageDispositionFillValidation({
    hole: damageDispositionHole,
    filled: input.fillSet.huntersPreyHordeBreakerDamageDispositionFilled,
    value: input.fillSet.huntersPreyHordeBreakerDamageDisposition,
  });
  if (damageDispositionValidation !== null) {
    return {
      tag: "result",
      result: invalidResult(
        input.state,
        "invalidFill",
        damageDispositionValidation,
      ),
    };
  }
  if (
    damageDispositionHole !== null &&
    !input.fillSet.huntersPreyHordeBreakerDamageDispositionFilled
  ) {
    return {
      tag: "result",
      result: needsHolesResult(rolledState, input.subject, [
        damageDispositionHole,
      ]),
    };
  }
  const usedState = recordHuntersPreyHordeBreakerUsed(
    rolledState,
    input.subject.actorId,
    unitId,
  );
  const prefixFills = [
    input.fillSet.huntersPreyHordeBreakerTarget,
    input.fillSet.huntersPreyHordeBreakerAttackRoll,
    input.fillSet.huntersPreyHordeBreakerDamageRoll,
  ] as const satisfies readonly BattleAttackDamagePrefixFill[];
  const continuation = {
    kind: "attackDamage" as const,
    subject: input.subject,
    attackerId: input.subject.actorId,
    targetId: secondTargetId,
    damageEvent,
    fills: prefixFills,
    concentrationSavingThrows: input.fillSet.concentrationSavingThrows,
    deathFailuresAtZeroHp: critical ? (2 as const) : (1 as const),
    damageDisposition: input.fillSet.huntersPreyHordeBreakerDamageDisposition,
    attackDamageRiders: hordeBreakerSelectedDamageRiders,
  };
  const attackDamageReactionWindow = maybeOpenInterruptWindow(
    usedState,
    {
      trigger: "attackDamage",
      continuation,
    },
    input.handledInterruptTrigger,
  );
  if (attackDamageReactionWindow !== null) {
    return { tag: "result", result: attackDamageReactionWindow };
  }
  return {
    tag: "result",
    result: resumeInterruptedProcedure(
      usedState,
      continuation,
      input.handledInterruptTrigger ?? "attackDamage",
    ),
  };
}

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
  return (
    fillSet.huntersPreyHordeBreakerDecision === undefined &&
    hordeBreakerAttackFillIsAbsent(fillSet)
  );
}

function hordeBreakerAttackFillIsAbsent(
  fillSet: Extract<AttackFillSet, { readonly tag: "ok" }>,
): boolean {
  return (
    fillSet.huntersPreyHordeBreakerTarget === undefined &&
    fillSet.huntersPreyHordeBreakerAttackRoll === undefined &&
    fillSet.huntersPreyHordeBreakerDamageRoll === undefined &&
    !fillSet.huntersPreyHordeBreakerDamageDispositionFilled
  );
}

function huntersPreyMissingSelectedOption(
  state: BattleState,
  attackerId: CombatantId,
): boolean {
  const attacker = state.combatants.get(attackerId);
  if (attacker?.origin.kind !== "character") {
    return false;
  }
  return attacker.origin.characterUnitRefs.some(
    (unitRef) =>
      unitRef.selectedOption === undefined &&
      unitRef.supportProfiles.some(
        (profile) =>
          typeof profile === "object" &&
          profile.kind === HUNTERS_PREY_SUPPORT_PROFILE,
      ),
  );
}
