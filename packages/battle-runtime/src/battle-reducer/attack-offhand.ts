// Light-property off-hand attack resolution extracted from attack-resolution.ts.

// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.martial-arts-attack-projection unit-feature.first-attack-roll-reckless-advantage unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-weapon-damage-rider spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control

import { spendActivationResource } from "@dnd/shared-algebras/action-economy-algebra";

import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";

import { attackRollResultIsValid } from "@dnd/shared-algebras/attack-roll-algebra";

import * as Either from "effect/Either";

import {
  attackDamageDispositionHole,
  attackDamageHole,
  martialArtsBonusUnarmedStrikeActionOptionForActor,
  damageDispositionFillValidation,
  offHandAttackActionOptionForActor,
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

import { activeEffectArmorClass } from "./creature-state.ts";

import {
  applyAttackDamageAmount,
  concentrationSavingThrowHole,
} from "./damage-apply.ts";

import {
  activeMarkedDamageRiders,
  activeSpellWeaponDamageRiders,
  applyAvailableSpellDamageReduction,
  attackDamageByTypeEntries,
  damageAmountByTypeEntriesToMap,
  damageAmountByTypeMapEntries,
  ongoingFeatureDamageModifier,
} from "./damage-helpers.ts";

import {
  attackDamageEventAfterPendingReductions,
  attackDamageEventAmountForTarget,
  attackDamageEventEntries,
  attackDamageEventWithEntries,
  attackDamagePrefixFills,
  attackFillsThroughAttackRoll,
  maybeOpenReactionWindow,
  snapshotBattle,
} from "./dispatcher.ts";

import {
  attackTargetHole,
  needsHolesResult,
  revealHidden,
} from "./hole-helpers.ts";
import { reactionSpellTargetFactsForAfterDamage } from "./reaction-triggered-spells.ts";

import {
  attackHitTriggerKind,
  attackKindForDeflectRedirect,
  attackTargetIsLegal,
} from "./movement-speed.ts";

import { attackFillSet } from "./attack-fill-set.ts";
import { invalidResult } from "./result-helpers.ts";

import {
  attackActionOptionName,
  attackPotentialDamageTypes,
  eligibleAttackDamageRiders,
  eligibleWeaponDamageDiceRollChoiceUnitIds,
  selectedAttackDamageRiders,
  selectedWeaponDamageDiceRollChoice,
} from "./statblock-attacks.ts";

import type {
  BattleAttackDamageEvent,
  BattleResolutionResult,
  BattleState,
  MartialArtsBonusUnarmedStrikeBattleResolutionInput,
  OffHandAttackBattleResolutionInput,
} from "../battle-reducer.ts";
import type { SupportedAttackActionOption } from "../battle-action-options.ts";
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
    attackForInput: (state, actorId) =>
      offHandAttackActionOptionForActor(state, actorId),
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
    attackForInput: (state, actorId) =>
      martialArtsBonusUnarmedStrikeActionOptionForActor(state, actorId),
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
  ) => SupportedAttackActionOption | undefined;
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
  const attack = config.attackForInput(input.state, input.subject.actorId);
  if (
    attack == null ||
    attackActionOptionName(attack) !== input.subject.attackName ||
    !config.prerequisiteMet(input.state, input.subject.actorId, attack)
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      config.unavailableMessage,
    );
  }
  if (!bonusActionCanBeSpent(input.state)) {
    return staleBonusActionResult(input.state);
  }

  const fillSet = attackFillSet(input.fills);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  if (fillSet.targetId == null) {
    return needsHolesResult(input.state, input.subject, [
      attackTargetHole(input.state, input.subject.actorId, attack),
    ]);
  }
  const target = input.state.combatants.get(fillSet.targetId);
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
  if (fillSet.attackRoll == null) {
    if (fillSet.damageRoll != null || fillSet.damageDispositionFilled) {
      return invalidResult(
        input.state,
        "invalidFill",
        `${label} roll must be filled before damage.`,
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
      `${label} roll result is outside the d20 attack-roll protocol.`,
    );
  }
  const activatedOngoingFeatureProfile =
    attackRollOngoingFeatureActivationProfile(
      input.state,
      input.subject.actorId,
      attack,
      fillSet.attackRoll.activatedOngoingFeatureUnitId,
      fillSet.damageRoll != null,
    );
  if (
    fillSet.attackRoll.activatedOngoingFeatureUnitId !== undefined &&
    activatedOngoingFeatureProfile === null
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      `${label} ongoing feature activation is not available for this attack roll.`,
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
      `${label} roll mode does not match the activated ongoing feature rule.`,
    );
  }
  if (!attackRollModeMatches(fillSet.attackRoll, requiredRollMode)) {
    return invalidResult(
      input.state,
      "invalidFill",
      `${label} roll mode does not match the current attack-roll rule.`,
    );
  }
  const criticalThreshold = criticalThresholdForAttack(
    input.state.combatants.get(input.subject.actorId),
    attack,
  );
  const hit = attackRollHitsWithCriticalThreshold(
    fillSet.attackRoll,
    currentArmorClass(activeEffectArmorClass(target)),
    criticalThreshold,
  );
  const attackRolledState = consumeHelpAttackForAttackRoll(
    recordAttackRollOngoingFeatures(
      revealHidden(input.state, input.subject.actorId),
      input.subject.actorId,
      target.combatantId,
      activatedOngoingFeatureProfile,
    ),
    input.subject.actorId,
    target.combatantId,
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
      `${label} damage can only be filled after a hit.`,
    );
  }
  if (!hit) {
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
    const damageAmount = attackDamageEventAmountForTarget(
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
      spellReducedState,
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
    if (concentrationSave !== null) {
      if (fillSet.concentrationSavingThrow === undefined) {
        return needsHolesResult(attackRolledState, input.subject, [
          concentrationSave,
        ]);
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
    const damaged = applyAttackDamageAmount(
      spellReducedState,
      input.subject.actorId,
      target.combatantId,
      damageAmount,
      critical ? 2 : 1,
      fillSet.damageDisposition,
      selectedDamageRiders,
      selectedDamageDiceChoice ?? undefined,
      fillSet.concentrationSavingThrow,
    );
    const spent = spendOffHandBonusAction(damaged);
    if (spent.tag === "invalid") {
      return spent;
    }
    const reactionWindow = maybeOpenReactionWindow(
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
      input.suppressedReactionTrigger,
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
  if (Either.isLeft(spent)) {
    return staleBonusActionResult(state);
  }
  const nextState = normalizeBattleGrapples({
    ...state,
    currentTurnResources: spent.right,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function bonusActionCanBeSpent(state: BattleState): boolean {
  return Either.isRight(
    spendActivationResource(state.currentTurnResources, {
      kind: "bonusAction",
    }),
  );
}

function staleBonusActionResult(
  state: BattleState,
): Extract<BattleResolutionResult, { readonly tag: "invalid" }> {
  return invalidResult(
    state,
    "staleSubject",
    "Bonus Action is no longer available for the current actor.",
  );
}
