// Light-property off-hand attack resolution extracted from attack-resolution.ts.

// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.martial-arts-attack-projection unit-feature.first-attack-roll-reckless-advantage unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-weapon-damage-rider spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.d20-test-natural-one-reroll
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.cunning-strike
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.cunning-strike-option-grant

import { optionalProperty } from "../optional-property.ts";
import { spendActivationResource } from "@dnd/shared-algebras/action-economy-algebra";

import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";

import { attackRollResultIsValid } from "@dnd/shared-algebras/attack-roll-algebra";
import { damageAmount as toDamageAmount } from "@dnd/shared/types";

import * as Result from "effect/Result";

import {
  attackDamageDispositionHole,
  attackDamageHole,
  martialArtsBonusUnarmedStrikeActionOptionForActor,
  damageDispositionFillValidation,
  offHandAttackActionOptionsForActor,
  offHandAttackPrerequisiteMet,
} from "./attack-damage-apply.ts";

import {
  attackRollHole,
  attackRollModeMatches,
  attackRollModeWithOptionalOngoingFeature,
  attackRollOngoingFeatureActivationProfile,
  attackRollOngoingFeatureActivations,
  consumeHelpAttackForAttackRoll,
  recordAttackRollOngoingFeatures,
  requiredAttackRollMode,
} from "./attack-roll.ts";

import { normalizeBattleGrapples } from "./creature-state-leaves.ts";

import { activeEffectArmorClass } from "./creature-state-execution.ts";
import {
  attackRollHoleWithD20TestNaturalOneRerollOption,
  d20TestNaturalOneRerollRollDecisionRequired,
  d20TestNaturalOneRerollRollIssue,
  effectiveD20TestNaturalOneRerollAttackRoll,
} from "./d20-test-natural-one-reroll.ts";

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
  damageAmountByTypeEntriesToMap,
  damageAmountByTypeMapEntries,
  ongoingFeatureDamageModifier,
  prospectiveAttackDamageTypes,
  sourceDamageRollPenaltyRollHoleForDamageRoll,
  sourceDamageRollPenaltyRollForDamageRoll,
  unexpectedSourceDamageRollPenaltyRoll,
} from "./damage-helpers.ts";

import {
  attackDamageEventAfterPendingReductions,
  attackDamageEventAmountForTarget,
  attackDamageEventEntries,
  attackDamageEventWithEntries,
  attackDamageInterruptionFrame,
  attackFillsForAttackHitReplay,
} from "./attack-damage-events.ts";
import { maybeOpenInterruptWindow } from "./interrupt-execution.ts";
import { snapshotBattle } from "./battle-snapshot.ts";

import { attackTargetHole, revealHidden } from "./hole-helpers.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { reactionSpellTargetFactsForAfterDamage } from "./reaction-triggered-spells.ts";
import { resolveRemarkableAthleteCriticalHitMovement } from "./remarkable-athlete-critical-movement.ts";
import {
  attackDamageRidersAfterCunningStrikeCost,
  cunningStrikeDamageContinuation,
  cunningStrikeDamageRollOptions,
  eligibleCunningStrikeContexts,
  resolveCunningStrikeAfterAttackDamage,
  selectedCunningStrikeContext,
} from "./cunning-strike.ts";

import {
  attackHitTriggerKind,
  attackKindForDeflectRedirect,
  attackTargetIsLegal,
} from "./movement-speed.ts";

import { attackFillSet } from "./attack-fill-set.ts";
import { invalidResult } from "./result-helpers.ts";

import {
  eligibleAttackDamageRiders,
  frenzyDamageTypeDecision,
  eligibleAttackDamageDieFloorProcedureRefs,
  eligibleWeaponDamageDiceRollChoiceProcedureRefs,
  selectedAttackDamageRiders,
  selectedWeaponDamageDiceRollChoice,
} from "./statblock-attacks.ts";

import type {
  BattleAttackDamageEvent,
  BattleResolutionResult,
  BattleState,
  MartialArtsBonusUnarmedStrikeBattleResolutionInput,
  OffHandAttackBattleResolutionInput,
} from "../battle-state-execution.ts";
import { ATTACK_ROLL_HOLE_ID } from "./battle-runtime-protocol.ts";
import { spellAttackRerollUnsupportedIssue } from "./spell-reroll-issues.ts";
import { spendAmmunitionForAcceptedAttackPendingContinuation } from "../battle-ammunition.ts";
import {
  boundAttackExecutionSelectionMatchesOption,
  type BoundSupportedAttackActionOption,
  type SupportedAttackActionOption,
} from "../battle-action-options.ts";
import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
import {
  attackRollHitsWithCriticalThreshold,
  attackRollIsCriticalHit,
  criticalThresholdForAttack,
  validateAttackDamageFill,
} from "./attack-resolution.ts";

export function resolveOffHandAttack(
  input: OffHandAttackBattleResolutionInput,
): BattleResolutionResult {
  return resolveBonusActionAttack(input, {
    label: "Light Property Bonus Action Attack",
    unavailableMessage:
      "Light Property Bonus Action Attack requires a prior Attack action attack with a different Light weapon.",
    attackForInput: (
      state,
      actorId,
      procedureRef,
      attackAbility,
      attackDamageType,
    ) =>
      offHandAttackActionOptionsForActor(state, actorId).find((attack) =>
        boundAttackExecutionSelectionMatchesOption(
          { procedureRef, attackAbility, attackDamageType },
          attack,
        ),
      ),
    prerequisiteMet: (state, actorId, attack) =>
      attack.kind === "weapon" &&
      offHandAttackPrerequisiteMet(state, actorId, attack),
  });
}

export function resolveMartialArtsBonusUnarmedStrike(
  input: MartialArtsBonusUnarmedStrikeBattleResolutionInput,
): BattleResolutionResult {
  return resolveBonusActionAttack(input, {
    label: "Martial Arts Bonus Unarmed Strike",
    unavailableMessage:
      "Martial Arts Bonus Unarmed Strike requires Martial Arts support and an unarmored, unshielded Monk loadout.",
    attackForInput: (
      state,
      actorId,
      procedureRef,
      attackAbility,
      attackDamageType,
    ) => {
      const attack = martialArtsBonusUnarmedStrikeActionOptionForActor(
        state,
        actorId,
      );
      return attack !== undefined &&
        boundAttackExecutionSelectionMatchesOption(
          { procedureRef, attackAbility, attackDamageType },
          attack,
        )
        ? attack
        : undefined;
    },
    prerequisiteMet: () => true,
  });
}

type BonusActionAttackBattleResolutionInput =
  | OffHandAttackBattleResolutionInput
  | MartialArtsBonusUnarmedStrikeBattleResolutionInput;

type BonusActionAttackConfig = {
  readonly label: string;
  readonly unavailableMessage: string;
  readonly attackForInput: (
    state: BattleState,
    actorId: BonusActionAttackBattleResolutionInput["subject"]["actorId"],
    procedureRef: BonusActionAttackBattleResolutionInput["subject"]["procedureRef"],
    attackAbility: BonusActionAttackBattleResolutionInput["subject"]["attackAbility"],
    attackDamageType: BonusActionAttackBattleResolutionInput["subject"]["attackDamageType"],
  ) => BoundSupportedAttackActionOption | undefined;
  readonly prerequisiteMet: (
    state: BattleState,
    actorId: BonusActionAttackBattleResolutionInput["subject"]["actorId"],
    attack: SupportedAttackActionOption,
  ) => boolean;
};

function resolveBonusActionAttack(
  input: BonusActionAttackBattleResolutionInput,
  config: BonusActionAttackConfig,
): BattleResolutionResult {
  const { label } = config;
  const pendingAttackDamageReductions =
    input.pendingAttackDamageReductions ?? [];
  const pendingAttackDamageAdditions = input.pendingAttackDamageAdditions ?? [];
  const attack = config.attackForInput(
    input.state,
    input.subject.actorId,
    input.subject.procedureRef,
    input.subject.attackAbility,
    input.subject.attackDamageType,
  );
  if (
    attack == null ||
    !config.prerequisiteMet(input.state, input.subject.actorId, attack)
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      config.unavailableMessage,
    );
  }
  /* v8 ignore start -- @preserve -- The admitted dispatcher rejects a stale Bonus Action subject before routing here; only a direct resolver call can reach this duplicate guard. */
  if (!bonusActionCanBeSpent(input.state)) {
    return staleBonusActionResult(input.state);
  }
  /* v8 ignore stop -- @preserve */

  const fillSet = attackFillSet(
    input.fills,
    input.subject.actorId,
    input.state,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  /* v8 ignore stop -- @preserve */
  if (fillSet.targetId == null) {
    return needsHolesResult(input.state, input.subject, [
      attackTargetHole(input.state, input.subject.actorId, attack),
    ]);
  }
  const target = input.state.combatants.get(fillSet.targetId);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    target == null ||
    target.combatantId === input.subject.actorId ||
    !attackTargetIsLegal(
      input.state,
      input.subject.actorId,
      target.combatantId,
      attack,
      fillSet.targetSpatialFacts,
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      `${label} target is outside the selected attack's supported target constraint.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (fillSet.attackRoll == null) {
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fillSet.damageRoll != null || fillSet.damageDispositionFilled) {
      return invalidResult(
        input.state,
        "invalidFill",
        `${label} roll must be filled before damage.`,
      );
    }
    /* v8 ignore stop -- @preserve */
    return needsHolesResult(input.state, input.subject, [
      attackRollHole(
        input.state.combatants.get(input.subject.actorId),
        attack,
        requiredAttackRollMode(
          input.state,
          input.subject.actorId,
          target.combatantId,
          attack,
          fillSet.targetSpatialFacts,
        ),
        attackRollOngoingFeatureActivations(
          input.state,
          input.subject.actorId,
          attack,
        ),
      ),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!attackRollResultIsValid(fillSet.attackRoll)) {
    return invalidResult(
      input.state,
      "invalidFill",
      `${label} roll result is outside the d20 attack-roll protocol.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  const spellAttackRerollIssue = spellAttackRerollUnsupportedIssue(
    fillSet.attackRoll,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (spellAttackRerollIssue !== null) {
    return invalidResult(input.state, "invalidFill", spellAttackRerollIssue);
  }
  /* v8 ignore stop -- @preserve */
  const activatedOngoingFeatureProfile =
    attackRollOngoingFeatureActivationProfile(
      input.state,
      input.subject.actorId,
      attack,
      fillSet.attackRoll.activatedOngoingFeatureProcedureRef,
      fillSet.damageRoll != null,
    );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    fillSet.attackRoll.activatedOngoingFeatureProcedureRef !== undefined &&
    activatedOngoingFeatureProfile === null
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      `${label} ongoing feature activation is not available for this attack roll.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  const requiredRollMode = attackRollModeWithOptionalOngoingFeature(
    input.state,
    input.subject.actorId,
    target.combatantId,
    attack,
    fillSet.targetSpatialFacts,
    fillSet.attackRoll.activatedOngoingFeatureProcedureRef,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    fillSet.attackRoll.activatedOngoingFeatureProcedureRef !== undefined &&
    !attackRollModeMatches(fillSet.attackRoll, requiredRollMode)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      `${label} roll mode does not match the activated ongoing feature rule.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!attackRollModeMatches(fillSet.attackRoll, requiredRollMode)) {
    return invalidResult(
      input.state,
      "invalidFill",
      `${label} roll mode does not match the current attack-roll rule.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  const attacker = input.state.combatants.get(input.subject.actorId);
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
          attackRollOngoingFeatureActivations(
            input.state,
            input.subject.actorId,
            attack,
          ),
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
  });
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (d20TestNaturalOneRerollIssue !== null) {
    return invalidResult(
      input.state,
      "invalidFill",
      d20TestNaturalOneRerollIssue,
    );
  }
  /* v8 ignore stop -- @preserve */
  const effectiveAttackRoll = effectiveD20TestNaturalOneRerollAttackRoll(
    fillSet.attackRoll,
  );
  const hiddenBeforeAttack =
    input.state.combatants.get(input.subject.actorId)?.hidden ?? null;
  const criticalThreshold = criticalThresholdForAttack(
    input.state.combatants.get(input.subject.actorId),
    attack,
  );
  const hit = attackRollHitsWithCriticalThreshold(
    effectiveAttackRoll,
    currentArmorClass(activeEffectArmorClass(input.state, target)),
    criticalThreshold,
  );
  let attackRolledState = consumeHelpAttackForAttackRoll(
    recordAttackRollOngoingFeatures(
      revealHidden(input.state, input.subject.actorId),
      input.subject.actorId,
      target.combatantId,
      activatedOngoingFeatureProfile,
      fillSet.targetRelationshipFacts,
    ),
    input.subject.actorId,
    target.combatantId,
  );
  attackRolledState = spendAmmunitionForAcceptedAttackPendingContinuation({
    state: attackRolledState,
    actorId: input.subject.actorId,
    attack,
    subject: input.subject,
  });
  const critical = attackRollIsCriticalHit(
    effectiveAttackRoll,
    criticalThreshold,
  );
  const frenzyDamageType = frenzyDamageTypeDecision({
    state: attackRolledState,
    attackerId: input.subject.actorId,
    attack,
    hitWithAttackRoll: hit,
    selectedDamageType: fillSet.frenzyDamageTypeChoice?.value,
  });
  if (frenzyDamageType.tag === "decisionRequired") {
    return needsHolesResult(attackRolledState, input.subject, [
      frenzyDamageType.hole,
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (frenzyDamageType.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", frenzyDamageType.message);
  }
  /* v8 ignore stop -- @preserve */
  const eligibleDamageRiders = hit
    ? eligibleAttackDamageRiders(
        attackRolledState,
        input.subject.actorId,
        target.combatantId,
        attack,
        effectiveAttackRoll,
        fillSet.targetSpatialFacts,
        frenzyDamageType,
      )
    : [];
  const eligibleDamageDiceChoiceUnitIds = hit
    ? eligibleWeaponDamageDiceRollChoiceProcedureRefs(
        attackRolledState,
        input.subject.actorId,
        attack,
      )
    : [];
  const eligibleDamageDieFloorChoiceUnitIds = hit
    ? eligibleAttackDamageDieFloorProcedureRefs(
        attackRolledState,
        input.subject.actorId,
        attack,
        attack.procedureRef,
      )
    : [];
  const spellWeaponDamageRiders = hit
    ? [
        ...activeSpellWeaponDamageRiders(
          attackRolledState.combatants.get(input.subject.actorId),
          attack,
        ),
        ...pendingAttackDamageAdditions,
      ]
    : [];
  const spellMarkedDamageRiders = hit
    ? activeMarkedDamageRiders(
        attackRolledState.combatants.get(input.subject.actorId),
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
        attackerId: input.subject.actorId,
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
  if (hit && input.handledInterruptTrigger !== "attackHit") {
    const reactionWindow = maybeOpenInterruptWindow(
      attackRolledState,
      {
        trigger: "attackHit",
        attackerId: input.subject.actorId,
        targetId: target.combatantId,
        attackRoll: effectiveAttackRoll,
        attackKind: attackKindForDeflectRedirect(attack),
        attackHitTriggerKind: attackHitTriggerKind(attack),
        damageTypes: prospectiveAttackDamageTypes(
          attackRolledState,
          attackRolledState.combatants.get(input.subject.actorId),
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
  const remarkableAthleteMovement = resolveRemarkableAthleteCriticalHitMovement(
    {
      state: attackRolledState,
      subject: input.subject,
      attackerId: input.subject.actorId,
      scoredCriticalHit: critical,
      fills: fillSet,
    },
  );
  if (remarkableAthleteMovement.tag === "result") {
    return remarkableAthleteMovement.result;
  }
  attackRolledState = remarkableAthleteMovement.state;
  if (hit && fillSet.damageRoll == null) {
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fillSet.sourceDamageRollPenaltyRolls.length > 0) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Source damage roll penalty does not match an active source-side damage penalty.",
      );
    }
    /* v8 ignore stop -- @preserve */
    return needsHolesResult(attackRolledState, input.subject, [
      attackDamageHole(
        attack,
        critical,
        effectiveAttackRoll,
        eligibleDamageRiders,
        spellWeaponDamageRiders,
        spellMarkedDamageRiders,
        ongoingFeatureDamageModifier(
          attackRolledState,
          attackRolledState.combatants.get(input.subject.actorId),
          attack,
        ),
        eligibleDamageDiceChoiceUnitIds,
        eligibleDamageDieFloorChoiceUnitIds,
        cunningStrikeDamageRollOptions(eligibleCunningStrikeDamageOptions),
      ),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !hit &&
    (fillSet.damageRoll != null ||
      fillSet.damageDispositionFilled ||
      fillSet.sourceDamageRollPenaltyRolls.length > 0)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      `${label} damage can only be filled after a hit.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (!hit) {
    const relationshipIssue =
      fillSet.damageRelationshipDecisions.unexpectedFillForAbsentEvent(
        ATTACK_ROLL_HOLE_ID,
      );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (relationshipIssue !== null) {
      return invalidResult(input.state, "invalidFill", relationshipIssue);
    }
    /* v8 ignore stop -- @preserve */
    return spendOffHandBonusAction(attackRolledState);
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
        attackRolledState.combatants.get(input.subject.actorId),
        attack,
      ),
      eligibleDamageDiceChoiceUnitIds,
      eligibleDamageDieFloorChoiceUnitIds,
      eligibleCunningStrikeDamageOptions,
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (damageValidation !== null) {
      return invalidResult(input.state, "invalidFill", damageValidation);
    }
    /* v8 ignore stop -- @preserve */
    const damageSource = attackRolledState.combatants.get(
      input.subject.actorId,
    );
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
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
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
    /* v8 ignore stop -- @preserve */
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
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (sourcePenalty.tag === "invalid") {
      return invalidResult(
        input.state,
        "invalidFill",
        "Source damage roll penalty does not match an active source-side damage penalty.",
      );
    }
    /* v8 ignore stop -- @preserve */
    if (sourcePenalty.tag === "needsHoles") {
      return needsHolesResult(attackRolledState, input.subject, [
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
      target,
      damageAmountByTypeEntriesToMap(
        attackDamageEventEntries(reducedDamageEvent),
      ),
      fillSet.spellDamageReductionRoll,
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (spellReduction.tag === "invalid") {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell damage reduction roll does not match an unused matching damage-reduction spell effect.",
      );
    }
    /* v8 ignore stop -- @preserve */
    if (spellReduction.tag === "needsHoles") {
      return needsHolesResult(attackRolledState, input.subject, [
        ...spellReduction.holes,
      ]);
    }
    const reducedDamageEventAfterSpellReduction = attackDamageEventWithEntries(
      reducedDamageEvent,
      damageAmountByTypeMapEntries(spellReduction.damageByType),
    );
    const spellReducedState = {
      ...attackRolledState,
      combatants: new Map(attackRolledState.combatants).set(
        target.combatantId,
        spellReduction.target,
      ),
    };
    const damageAmount = attackDamageEventAmountForTarget(
      spellReducedState,
      spellReduction.target,
      reducedDamageEventAfterSpellReduction,
    );
    const damageDispositionHole = attackDamageDispositionHole({
      attack,
      attackerId: input.subject.actorId,
      target: spellReduction.target,
      damageAmount,
    });
    const damageDispositionValidation = damageDispositionFillValidation({
      hole: damageDispositionHole,
      filled: fillSet.damageDispositionFilled,
      value: fillSet.damageDisposition,
    });
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (damageDispositionValidation !== null) {
      return invalidResult(
        input.state,
        "invalidFill",
        damageDispositionValidation,
      );
    }
    /* v8 ignore stop -- @preserve */
    if (damageDispositionHole !== null) {
      if (!fillSet.damageDispositionFilled) {
        return needsHolesResult(attackRolledState, input.subject, [
          damageDispositionHole,
        ]);
      }
    }
    const relationshipCheck = damageRelationshipDecisionFillCheck({
      state: spellReducedState,
      damageEventHoleId: fillSet.damageRoll.holeId,
      damageSourceId: input.subject.actorId,
      targets:
        Number(damageAmount) <= 0
          ? []
          : [
              {
                targetId: target.combatantId,
                damageAmount: toDamageAmount(Number(damageAmount)),
                damageDisposition: fillSet.damageDisposition,
              },
            ],
      spatialFacts: fillSet.targetSpatialFacts,
      decisionsByRelationshipHole: fillSet.damageRelationshipDecisions,
    });
    if (relationshipCheck.tag === "needsHoles") {
      return needsHolesResult(
        spellReducedState,
        input.subject,
        relationshipCheck.holes,
      );
    }
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (relationshipCheck.tag === "invalid") {
      return invalidResult(
        input.state,
        "invalidFill",
        relationshipCheck.message,
      );
    }
    /* v8 ignore stop -- @preserve */
    const attackDamageReactionWindow = maybeOpenInterruptWindow(
      spellReducedState,
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
            kind: "damageOnly",
            concentrationSavingThrows: fillSet.concentrationSavingThrows,
            damageDisposition: fillSet.damageDisposition,
            attackDamageRiders: selectedDamageRidersAfterCunningStrikeCost,
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
      const spent = spendOffHandBonusAction(attackDamageReactionWindow.state);
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
      damageAmount,
    );
    const primaryConcentrationSavingThrow =
      concentrationSave === null
        ? undefined
        : concentrationSavingThrowFillFor(
            fillSet.concentrationSavingThrows,
            concentrationSave,
          );
    const concentrationSaveCheck =
      damageLifecycleConcentrationSavingThrowFillCheck({
        state: spellReducedState,
        target: spellReduction.target,
        damageAmount,
        fills: fillSet.concentrationSavingThrows,
      });
    if (concentrationSaveCheck.tag === "needsHoles") {
      return needsHolesResult(spellReducedState, input.subject, [
        ...concentrationSaveCheck.holes,
      ]);
    }
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (concentrationSaveCheck.tag === "invalid") {
      return invalidResult(
        input.state,
        "invalidFill",
        concentrationSaveCheck.message,
      );
    }
    /* v8 ignore stop -- @preserve */
    const hideousLaughterSaveCheck =
      damageLifecycleHideousLaughterDamageRepeatSaveFillCheck({
        state: spellReducedState,
        target: spellReduction.target,
        damageAmount,
        fills: fillSet.hideousLaughterDamageRepeatSaves,
      });
    if (hideousLaughterSaveCheck.tag === "needsHoles") {
      return needsHolesResult(spellReducedState, input.subject, [
        ...hideousLaughterSaveCheck.holes,
      ]);
    }
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (hideousLaughterSaveCheck.tag === "invalid") {
      return invalidResult(
        input.state,
        "invalidFill",
        hideousLaughterSaveCheck.message,
      );
    }
    /* v8 ignore stop -- @preserve */
    const damaged = applyAttackDamageAmount({
      state: spellReducedState,
      attackerId: input.subject.actorId,
      targetId: target.combatantId,
      damageAmount,
      deathFailuresAtZeroHp: critical ? 2 : 1,
      damageDisposition: fillSet.damageDisposition,
      attackDamageRiders: selectedDamageRidersAfterCunningStrikeCost,
      weaponDamageDiceRollChoice: selectedDamageDiceChoice ?? undefined,
      concentrationSavingThrow: primaryConcentrationSavingThrow,
      hideousLaughterDamageRepeatSaves:
        fillSet.hideousLaughterDamageRepeatSaves,
      wardingBondDamageShareConcentrationSavingThrows:
        fillSet.concentrationSavingThrows,
      spatialFacts: fillSet.targetSpatialFacts,
      relationshipDecisions: relationshipCheck.decisions,
    });
    const cunningStrike = resolveCunningStrikeAfterAttackDamage({
      state: damaged,
      selected: selectedCunningStrike,
      savingThrow: fillSet.cunningStrikeSavingThrow,
      movement: fillSet.cunningStrikeMovement,
      toolPossession: fillSet.cunningStrikeToolPossession,
      endTurnCover: fillSet.cunningStrikeEndTurnCover,
    });
    if (cunningStrike.tag === "needsHoles") {
      return needsHolesResult(spellReducedState, input.subject, [
        ...cunningStrike.holes,
      ]);
    }
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (cunningStrike.tag === "invalid") {
      return invalidResult(input.state, "invalidFill", cunningStrike.message);
    }
    /* v8 ignore stop -- @preserve */
    const spent = spendOffHandBonusAction(cunningStrike.state);
    if (spent.tag === "invalid") {
      return spent;
    }
    const reactionWindow = maybeOpenInterruptWindow(
      spent.state,
      {
        trigger: "afterDamage",
        damageSourceId: input.subject.actorId,
        damagedId: target.combatantId,
        damageAmount,
        reactionSpellTargetFacts: reactionSpellTargetFactsForAfterDamage({
          facts: fillSet.targetSpatialFacts,
          damagedId: target.combatantId,
          damageSourceId: input.subject.actorId,
        }),
        continuation: {
          kind: "resolved",
          subject: input.subject,
        },
      },
      input.handledInterruptTrigger,
    );
    if (reactionWindow !== null) {
      return reactionWindow;
    }
    return spent;
  }

  return spendOffHandBonusAction(attackRolledState);
}

export function spendOffHandBonusAction(
  state: BattleState,
): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  const spent = spendActivationResource(state.currentTurnResources, {
    kind: "bonusAction",
  });
  /* v8 ignore start -- @preserve -- Internal callers synchronously preflight the same turn resource, so failure requires bypassing the admitted resolver protocol. */
  if (Result.isFailure(spent)) {
    return staleBonusActionResult(state);
  }
  /* v8 ignore stop -- @preserve */
  const nextState = normalizeBattleGrapples({
    ...state,
    currentTurnResources: spent.success,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function bonusActionCanBeSpent(state: BattleState): boolean {
  return Result.isSuccess(
    spendActivationResource(state.currentTurnResources, {
      kind: "bonusAction",
    }),
  );
}

/* v8 ignore start -- @preserve -- This result constructor is owned by the two defensive branches above, both unreachable through the admitted dispatcher workflow. */
function staleBonusActionResult(
  state: BattleState,
): Extract<BattleResolutionResult, { readonly tag: "invalid" }> {
  return invalidResult(
    state,
    "staleSubject",
    "Bonus Action is no longer available for the current actor.",
  );
}
/* v8 ignore stop -- @preserve */
