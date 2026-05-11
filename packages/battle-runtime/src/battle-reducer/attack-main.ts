// Main Attack action resolution extracted from attack-resolution.ts.

// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-weapon-damage-rider spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control

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
  attackRollHole,
  attackRollModeMatches,
  attackRollModeWithOptionalOngoingFeature,
  attackRollOngoingFeatureActivationProfile,
  attackRollOngoingFeatureActivations,
  consumeHelpAttackForAttackRoll,
  recordAttackRollOngoingFeatures,
  requiredAttackRollMode,
} from "./attack-roll.ts";

import { activeEffectArmorClass } from "./creature-state.ts";

import {
  applyAttackDamage,
  applyAttackDamageAmount,
  concentrationSavingThrowHole,
} from "./damage-apply.ts";

import {
  activeMarkedDamageRiders,
  activeSpellWeaponDamageRiders,
  applyAvailableSpellDamageReduction,
  attackDamageByTypeEntries,
  damageAmountByTypeAfterTargetAdjustments,
  damageAmountByTypeEntriesToMap,
  damageAmountByTypeMapEntries,
  fixedAttackDamageByTypeEntries,
  ongoingFeatureDamageModifier,
} from "./damage-helpers.ts";

import {
  attackDamageEventAfterPendingReductions,
  attackDamageEventAmountBeforeTargetAdjustments,
  attackDamageEventAmountForTarget,
  attackDamageEventEntries,
  attackDamageEventWithEntries,
  attackDamagePrefixFills,
  attackFillsThroughAttackRoll,
  maybeOpenReactionWindow,
  resolveAttackDamageReductionZeroDamageRedirectAfterReduction,
  snapshotBattle,
} from "./dispatcher.ts";

import {
  attackTargetHole,
  needsHolesResult,
  revealHidden,
} from "./hole-helpers.ts";

import {
  attackHitTriggerKind,
  attackKindForDeflectRedirect,
  attackTargetIsLegal,
} from "./movement-speed.ts";

import { attackFillSet } from "./attack-fill-set.ts";
import { invalidResult } from "./result-helpers.ts";

import {
  attackCanCarryKnockOutChoice,
  attackPotentialDamageTypes,
  eligibleAttackDamageRiders,
  eligibleWeaponDamageDiceRollChoiceUnitIds,
  recordAttackRollMissToHitReplacementUsed,
  selectedAttackDamageRiders,
  selectedAttackRollMissToHitReplacement,
  selectedWeaponDamageDiceRollChoice,
} from "./statblock-attacks.ts";

import type {
  AttackBattleResolutionInput,
  BattleAttackHostSubject,
  BattleAttackDamageEvent,
  BattleResolutionResult,
} from "../battle-reducer.ts";
import type { SupportedAttackActionOption } from "../battle-action-options.ts";
import {
  attackRollHitsWithCriticalThreshold,
  attackRollIsCriticalHit,
  criticalThresholdForAttack,
  needsAttackDamageConcentrationResult,
  spendAttackAction,
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

  if (fillSet.targetId == null) {
    if (fillSet.attackRoll != null || fillSet.damageRoll != null) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Attack target must be filled before attack roll or damage.",
      );
    }
    return needsHolesResult(input.state, input.subject, [
      attackTargetHole(input.state, input.subject.actorId, attack),
    ]);
  }

  const target = input.state.combatants.get(fillSet.targetId);
  if (target == null || target.combatantId === input.subject.actorId) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack target must be another combatant in this battle.",
    );
  }
  if (
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
      "Attack target is outside the selected attack's supported target constraint.",
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

  if (fillSet.attackRoll == null) {
    if (fillSet.damageRoll != null || fillSet.damageDispositionFilled) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Attack roll must be filled before attack damage.",
      );
    }
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

  if (!attackRollResultIsValid(fillSet.attackRoll)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack roll result is outside the d20 attack-roll protocol.",
    );
  }
  const activatedOngoingFeatureProfile =
    attackRollOngoingFeatureActivationProfile(
      input.state,
      input.subject.actorId,
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
    input.subject.actorId,
    target.combatantId,
    attack,
    fillSet.targetSpatialFacts,
    fillSet.attackRoll.activatedOngoingFeatureUnitId,
  );
  if (
    fillSet.attackRoll.activatedOngoingFeatureUnitId !== undefined &&
    fillSet.attackRoll.rollMode !== requiredRollMode
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack roll mode does not match the activated ongoing feature rule.",
    );
  }
  if (!attackRollModeMatches(fillSet.attackRoll, requiredRollMode)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack roll mode does not match the current attack-roll rule.",
    );
  }

  const attacker = input.state.combatants.get(input.subject.actorId);
  const criticalThreshold = criticalThresholdForAttack(attacker, attack);
  const ordinaryHit = attackRollHitsWithCriticalThreshold(
    fillSet.attackRoll,
    currentArmorClass(activeEffectArmorClass(target)),
    criticalThreshold,
  );
  const missToHitReplacement = selectedAttackRollMissToHitReplacement({
    state: input.state,
    subject: input.subject,
    attackerId: input.subject.actorId,
    targetId: target.combatantId,
    attackRoll: fillSet.attackRoll,
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
  const attackRolledState = recordAttackRollMissToHitReplacementUsed(
    consumeHelpAttackForAttackRoll(
      recordAttackRollOngoingFeatures(
        revealHidden(input.state, input.subject.actorId),
        input.subject.actorId,
        target.combatantId,
        activatedOngoingFeatureProfile,
      ),
      input.subject.actorId,
      target.combatantId,
    ),
    input.subject.actorId,
    missToHitReplacement,
    {
      subject: input.subject,
      targetId: target.combatantId,
      attackRoll: fillSet.attackRoll,
    },
  );
  const critical = attackRollIsCriticalHit(
    fillSet.attackRoll,
    criticalThreshold,
  );
  const eligibleDamageRiders = hit
    ? eligibleAttackDamageRiders(
        attackRolledState,
        input.subject.actorId,
        target.combatantId,
        attack,
        fillSet.attackRoll,
        fillSet.targetSpatialFacts,
      )
    : [];
  const eligibleDamageDiceChoiceUnitIds = hit
    ? eligibleWeaponDamageDiceRollChoiceUnitIds(
        attackRolledState,
        input.subject.actorId,
        attack,
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
          fillSet.damageRoll.selectedAttackDamageRiderUnitIds,
        ) ?? []);
  const fixedDamageByTypeBeforeTargetAdjustments = hit
    ? spellMarkedDamageRiders.length > 0 || spellWeaponDamageRiders.length > 0
      ? null
      : fixedAttackDamageByTypeEntries(
          attackRolledState.combatants.get(input.subject.actorId),
          attack,
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
  if (hit && input.suppressedReactionTrigger !== "attackHit") {
    const reactionWindow = maybeOpenReactionWindow(
      attackRolledState,
      {
        trigger: "attackHit",
        attackerId: input.subject.actorId,
        targetId: target.combatantId,
        attackRoll: fillSet.attackRoll,
        attackKind: attackKindForDeflectRedirect(attack),
        attackHitTriggerKind: attackHitTriggerKind(attack),
        damageTypes: attackPotentialDamageTypes(
          attack,
          critical,
          fillSet.attackRoll,
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
      input.suppressedReactionTrigger,
    );
    if (reactionWindow !== null) {
      return reactionWindow;
    }
  }
  if (
    hit &&
    fixedDamageAmount !== null &&
    fixedDamageByTypeBeforeTargetAdjustments !== null
  ) {
    if (fillSet.damageRoll != null) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Fixed Unarmed Strike damage does not use a rolled damage fill.",
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
      target,
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
    const damageDispositionHole = attackDamageDispositionHole({
      attack,
      attackerId: input.subject.actorId,
      target: spellReduction.target,
      damageAmount: reducedFixedDamageAmount,
    });
    const damageDispositionValidation = damageDispositionFillValidation({
      hole: damageDispositionHole,
      filled: fillSet.damageDispositionFilled,
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
      if (!fillSet.damageDispositionFilled) {
        return needsHolesResult(attackRolledState, input.subject, [
          damageDispositionHole,
        ]);
      }
    }
    const attackDamageReactionWindow = maybeOpenReactionWindow(
      redirectState.state,
      {
        trigger: "attackDamage",
        continuation: {
          kind: "attackDamage",
          subject: input.subject,
          attackerId: input.subject.actorId,
          targetId: target.combatantId,
          damageEvent: reducedDamageEventAfterSpellReduction,
          fills: attackDamagePrefixFills(input.fills),
          deathFailuresAtZeroHp: critical ? 2 : 1,
          damageDisposition: fillSet.damageDisposition,
          attackDamageRiders: [],
        },
      },
      input.suppressedReactionTrigger,
    );
    if (attackDamageReactionWindow !== null) {
      const spent = spendAttackProcedure(
        attackDamageReactionWindow.state,
        input.subject.actorId,
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
    if (concentrationSave !== null) {
      if (fillSet.concentrationSavingThrow === undefined) {
        return needsAttackDamageConcentrationResult({
          state: redirectState.state,
          subject: input.subject,
          attack,
          continuation: {
            kind: "attackDamage",
            subject: input.subject,
            attackerId: input.subject.actorId,
            targetId: target.combatantId,
            damageEvent: reducedDamageEventAfterSpellReduction,
            fills: attackDamagePrefixFills(input.fills),
            deathFailuresAtZeroHp: critical ? 2 : 1,
            damageDisposition: fillSet.damageDisposition,
            attackDamageRiders: [],
          },
          concentrationSave,
        });
      }
      if (
        fillSet.concentrationSavingThrow.holeId !== concentrationSave.holeId
      ) {
        return invalidResult(
          input.state,
          "invalidFill",
          "Concentration Saving Throw fill does not match the damaged target.",
        );
      }
    } else if (fillSet.concentrationSavingThrow !== undefined) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Concentration Saving Throw fill is only valid for a concentrating damaged target.",
      );
    }
    const spent = spendAttackProcedure(
      applyAttackDamageAmount(
        redirectState.state,
        input.subject.actorId,
        target.combatantId,
        toDamageAmount(reducedFixedDamageAmount),
        critical ? 2 : 1,
        fillSet.damageDisposition,
        [],
        undefined,
        fillSet.concentrationSavingThrow,
      ),
      input.subject.actorId,
      attack,
    );
    if (spent.tag === "invalid") {
      return spent;
    }
    const reactionWindow = maybeOpenReactionWindow(
      spent.state,
      {
        trigger: "afterDamage",
        damageSourceId: input.subject.actorId,
        damagedId: target.combatantId,
        damageAmount: toDamageAmount(reducedFixedDamageAmount),
        continuation: {
          kind: "resolved",
          subject: input.subject,
        },
      },
      input.suppressedReactionTrigger,
    );
    if (reactionWindow !== null) {
      return reactionWindow;
    }
    return spent;
  }
  if (hit && fillSet.damageRoll == null) {
    return needsHolesResult(attackRolledState, input.subject, [
      attackDamageHole(
        attack,
        critical,
        fillSet.attackRoll,
        eligibleDamageRiders,
        spellWeaponDamageRiders,
        spellMarkedDamageRiders,
        ongoingFeatureDamageModifier(
          attackRolledState.combatants.get(input.subject.actorId),
          attack,
        ),
        eligibleDamageDiceChoiceUnitIds,
      ),
    ]);
  }
  if (!hit && (fillSet.damageRoll != null || fillSet.damageDispositionFilled)) {
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
      fillSet.attackRoll,
      eligibleDamageRiders,
      spellWeaponDamageRiders,
      spellMarkedDamageRiders,
      ongoingFeatureDamageModifier(
        attackRolledState.combatants.get(input.subject.actorId),
        attack,
      ),
      eligibleDamageDiceChoiceUnitIds,
    );
    if (damageValidation !== null) {
      return invalidResult(input.state, "invalidFill", damageValidation);
    }
    const damageRollByType = attackDamageByTypeEntries(
      attackRolledState.combatants.get(input.subject.actorId),
      attack,
      fillSet.damageRoll,
      critical,
      fillSet.attackRoll,
      selectedDamageRiders,
      spellWeaponDamageRiders,
      spellMarkedDamageRiders,
    );
    const damageEvent = {
      kind: "rolledDamage" as const,
      damageRollByType,
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
    if (spellReduction.tag === "invalid") {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell damage reduction roll does not match an unused matching damage-reduction spell effect.",
      );
    }
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
    const damageDispositionHole = attackDamageDispositionHole({
      attack,
      attackerId: input.subject.actorId,
      target: spellReduction.target,
      damageAmount: reducedDamageAmount,
    });
    const damageDispositionValidation = damageDispositionFillValidation({
      hole: damageDispositionHole,
      filled: fillSet.damageDispositionFilled,
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
      if (!fillSet.damageDispositionFilled) {
        return needsHolesResult(attackRolledState, input.subject, [
          damageDispositionHole,
        ]);
      }
    }
    const attackDamageReactionWindow = maybeOpenReactionWindow(
      redirectState.state,
      {
        trigger: "attackDamage",
        continuation: {
          kind: "attackDamage",
          subject: input.subject,
          attackerId: input.subject.actorId,
          targetId: target.combatantId,
          damageEvent: reducedDamageEventAfterSpellReduction,
          fills: attackDamagePrefixFills(input.fills),
          deathFailuresAtZeroHp: critical ? 2 : 1,
          damageDisposition: fillSet.damageDisposition,
          attackDamageRiders: selectedDamageRiders,
          ...(selectedDamageDiceChoice === null
            ? {}
            : { weaponDamageDiceRollChoice: selectedDamageDiceChoice }),
        },
      },
      input.suppressedReactionTrigger,
    );
    if (attackDamageReactionWindow !== null) {
      const spent = spendAttackProcedure(
        attackDamageReactionWindow.state,
        input.subject.actorId,
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
    if (concentrationSave !== null) {
      if (fillSet.concentrationSavingThrow === undefined) {
        return needsAttackDamageConcentrationResult({
          state: redirectState.state,
          subject: input.subject,
          attack,
          continuation: {
            kind: "attackDamage",
            subject: input.subject,
            attackerId: input.subject.actorId,
            targetId: target.combatantId,
            damageEvent: reducedDamageEventAfterSpellReduction,
            fills: attackDamagePrefixFills(input.fills),
            deathFailuresAtZeroHp: critical ? 2 : 1,
            damageDisposition: fillSet.damageDisposition,
            attackDamageRiders: selectedDamageRiders,
            ...(selectedDamageDiceChoice === null
              ? {}
              : { weaponDamageDiceRollChoice: selectedDamageDiceChoice }),
          },
          concentrationSave,
        });
      }
      if (
        fillSet.concentrationSavingThrow.holeId !== concentrationSave.holeId
      ) {
        return invalidResult(
          input.state,
          "invalidFill",
          "Concentration Saving Throw fill does not match the damaged target.",
        );
      }
    } else if (fillSet.concentrationSavingThrow !== undefined) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Concentration Saving Throw fill is only valid for a concentrating damaged target.",
      );
    }
    const spent = spendAttackProcedure(
      applyAttackDamageAmount(
        redirectState.state,
        input.subject.actorId,
        target.combatantId,
        toDamageAmount(reducedDamageAmount),
        critical ? 2 : 1,
        fillSet.damageDisposition,
        selectedDamageRiders,
        selectedDamageDiceChoice ?? undefined,
        fillSet.concentrationSavingThrow,
      ),
      input.subject.actorId,
      attack,
    );
    if (spent.tag === "invalid") {
      return spent;
    }
    const reactionWindow = maybeOpenReactionWindow(
      spent.state,
      {
        trigger: "afterDamage",
        damageSourceId: input.subject.actorId,
        damagedId: target.combatantId,
        damageAmount: toDamageAmount(reducedDamageAmount),
        continuation: {
          kind: "resolved",
          subject: input.subject,
        },
      },
      input.suppressedReactionTrigger,
    );
    if (reactionWindow !== null) {
      return reactionWindow;
    }
    return spent;
  }

  return spendAttackProcedure(
    hit
      ? applyAttackDamage(
          attackRolledState,
          input.subject.actorId,
          target.combatantId,
          attack,
          fillSet,
          critical,
          selectedDamageRiders,
          spellWeaponDamageRiders,
          spellMarkedDamageRiders,
        )
      : attackRolledState,
    input.subject.actorId,
    attack,
  );
}
