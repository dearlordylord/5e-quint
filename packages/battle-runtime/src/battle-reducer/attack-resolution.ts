// Attack and standard-action resolution extracted from ../battle-reducer.ts.
// Owns attack pipelines, standard action resolvers, off-hand/statblock/grapple
// commands, attack fill validation, and attack action-resource spending.
// Mechanical move; no behavior change intended.

// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-weapon-damage-rider spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control
import type {
  ActionEconomyState,
  RuntimeActionResource,
} from "@dnd/shared-algebras/action-economy-algebra";
import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";

import {
  actionRestrictionAllows,
  spendAction,
  spendActivationResource,
  spendMatchingActionResource,
} from "@dnd/shared-algebras/action-economy-algebra";

import { validateRolledDiceForDiceExpr } from "@dnd/shared-algebras/runtime-dice-algebra";

import {
  type AttackRollResult,
  type RolledDiceGroup,
} from "@dnd/shared-algebras/runtime-hole-algebra";

import {
  DifficultyClass,
  Hp,
  difficultyClass,
  movementFeet,
} from "@dnd/shared/types";

import type { UnitRecord } from "@dnd/surface/surface/types";

import { Match } from "effect";

import * as Either from "effect/Either";

import type {
  StatBlockPartKey,
  SupportedAttackActionOption,
} from "../battle-action-options.ts";

import type {
  BattleCreatureInit,
  StatBlockBattleInitInput,
} from "../battle-init.ts";

import {
  type BattleMovementSpeedKind,
  type BattleSubject,
} from "../battle-subjects.ts";

import { spendCharacterResourceUse } from "../character-battle-resources.ts";

import { CombatantId } from "../identity.ts";

import {
  ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE,
  WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE,
  ongoingFeatureSpellModifierSourceClassName,
} from "../unit-feature-support.ts";

import {
  attackDamageHoleId,
  heldWeaponItemIdForAttack,
  isLightMeleeWeapon,
} from "./attack-damage-apply.ts";

import { extendSavingThrowOngoingFeatures } from "./attack-roll.ts";

import {
  combatantsAreAllies,
  combatantsAreEnemies,
  grappledBy,
  normalizeBattleGrapples,
} from "./creature-state-leaves.ts";

import {
  battleCreatureStateWithKnockOutPreservedConditions,
  combatantCanTakeActions,
  activeOngoingFeatureOccurrencesForCombatant,
  isCharacterBattleCreatureState,
  literalStatBlockNumber,
  ongoingFeatureProfileForSourceKey,
} from "./creature-state.ts";

import {
  applyTemporaryHitPoints,
  breakBattleConcentration,
} from "./damage-apply.ts";

import {
  attackDamageContinuationConcentrationFrame,
  snapshotBattle,
} from "./dispatcher.ts";

import {
  actorHasAlternateActionCost,
  bonusActionDashTemporaryHitPointsForActor,
  canHideInCurrentCircumstances,
  escapeGrappleOutcomeHole,
  escapeSpellRestraintAbilityCheckHole,
  grappleOutcomeHole,
  grappleTargetHole,
  hideAbilityCheckHole,
  needsHolesResult,
  searchAbilityCheckHole,
  searchTargetHole,
  shoveOutcomeHole,
  shoveTargetHole,
  sleepShakeAwakeTargetHole,
} from "./hole-helpers.ts";

import {
  combatantProficiencyBonus,
  effectiveMovementSpeed,
  grappleLinkForTarget,
  representedMovementSpeedKinds,
  shoveForTarget,
} from "./movement-speed.ts";

import { invalidResult } from "./result-helpers.ts";

import {
  removeSpellConditionEffect,
  removeSleepEffectsFromTarget,
  spellRestraintEffectFor,
  sleepShakeAwakeTargetChoices,
} from "./spell-condition-effects-helpers.ts";

import {
  attackDamageComponents,
  clearPendingAttackRollMissToHitReplacementSelection,
  selectedAttackDamageRiders,
  selectedWeaponDamageDiceRollChoice,
  weaponDamageComponent,
} from "./statblock-attacks.ts";

import {
  spendStatBlockAttackResources,
  statBlockAttackResourceAvailable,
  statBlockPartLimitedUseAvailable,
  updateStatBlockActorResources,
} from "./statblock.ts";

import type {
  AttackDamageRider,
  BattleActiveEffect,
  BattleAttackDamageContinuationWithoutConcentration,
  BattleAttackHostSubject,
  BattleConcentrationSavingThrowHole,
  BattleCreatureState,
  BattleFill,
  BattleHoleId,
  BattleResolutionInput,
  BattleResolutionInputForSubject,
  BattleResolutionResult,
  BattleRolledDiceFill,
  BattleShovePushOutcome,
  BattleState,
  BattleTargetChoiceHole,
  BattleTargetSpatialFact,
  BattleTurnResources,
  BonusActionStandardActionBattleResolutionInput,
  CharacterBattleCreatureState,
  CriticalHitThreshold,
  EscapeGrappleBattleResolutionInput,
  EscapeSpellRestraintBattleResolutionInput,
  GrappleBattleResolutionInput,
  GrappleFillSet,
  HideBattleResolutionInput,
  MultiattackBattleResolutionInput,
  SearchBattleResolutionInput,
  ShoveBattleResolutionInput,
  ShoveFillSet,
  SpellMarkedDamageRider,
  SpellAttackDamageComponent,
  StatBlockBattleCreatureState,
  StatBlockBonusActionOptionBattleResolutionInput,
  StatBlockMultiattackActionResource,
  WeaponDamageDiceRollChoiceFill,
} from "../battle-reducer.ts";
import {
  ATTACK_ONLY_ACTION_RESOURCE_EXCLUDED_ACTIONS,
  ESCAPE_GRAPPLE_OUTCOME_HOLE_ID,
  ESCAPE_SPELL_RESTRAINT_ABILITY_CHECK_HOLE_ID,
  GRAPPLE_OUTCOME_HOLE_ID,
  GRAPPLE_TARGET_HOLE_ID,
  HELP_ATTACK_ALLY_HOLE_ID,
  HELP_ATTACK_ALLY_HOLE_INSTANCE,
  HELP_ATTACK_TARGET_HOLE_ID,
  HELP_ATTACK_TARGET_HOLE_INSTANCE,
  HIDE_ABILITY_CHECK_HOLE_ID,
  HIDE_DC,
  SEARCH_ABILITY_CHECK_HOLE_ID,
  SEARCH_TARGET_HOLE_ID,
  SHOVE_OUTCOME_HOLE_ID,
  SHOVE_TARGET_HOLE_ID,
  SLEEP_SHAKE_AWAKE_TARGET_HOLE_ID,
  actorHasClassFeatureExtraAttackActionResource,
  actorHasStatBlockMultiattackActionResource,
  isClassFeatureExtraAttackActionResource,
  isStatBlockBattleCreatureState,
  isStatBlockMultiattackActionResource,
  spendTurnAction,
  supportedStatBlockBonusActionOptions,
  supportedStatBlockBonusActionStandardAction,
  supportedStatBlockMultiattacks,
  zeroHpLifecycleIsTerminal,
} from "../battle-reducer.ts";
export function battleCreatureInitFromStatBlock(
  input: StatBlockBattleInitInput,
): BattleCreatureInit {
  const maxHp = Hp(literalStatBlockNumber(input.statBlock.statBlock.hp));
  return {
    combatantId: input.combatantId,
    displayName: input.statBlock.statBlock.displayName,
    initiative: input.initiative,
    side: input.side,
    creatureInit: {
      kind: "statBlock",
      statBlock: input.statBlock,
      currentHp: input.currentHp ?? maxHp,
      maxHp,
      tempHp: input.tempHp ?? Hp(0),
    },
  };
}

export function needsAttackDamageConcentrationResult(input: {
  readonly state: BattleState;
  readonly subject: BattleAttackHostSubject;
  readonly attack: SupportedAttackActionOption;
  readonly continuation: BattleAttackDamageContinuationWithoutConcentration;
  readonly concentrationSave: BattleConcentrationSavingThrowHole;
}): BattleResolutionResult {
  const pendingState = {
    ...input.state,
    interruptStack: [
      ...input.state.interruptStack,
      attackDamageContinuationConcentrationFrame(
        input.continuation,
        "attackDamage",
      ),
    ],
  };
  const spent = spendAttackAction(
    pendingState,
    input.subject.actorId,
    input.attack,
  );
  return spent.tag === "invalid"
    ? spent
    : needsHolesResult(spent.state, input.subject, [input.concentrationSave]);
}

export function resolveDash(
  input: BattleResolutionInput,
): BattleResolutionResult {
  if (input.fills.length > 0) {
    return invalidResult(input.state, "invalidFill", "Dash accepts no fills.");
  }
  const actor = input.state.combatants.get(input.subject.actorId);
  if (actor === undefined) {
    return invalidResult(
      input.state,
      "missingCombatant",
      "Dash actor is not in this battle.",
    );
  }
  const speedKind =
    input.subject.tag === "action" && input.subject.action === "dash"
      ? input.subject.speedKind
      : "walk";
  if (!representedMovementSpeedKinds(actor).includes(speedKind)) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Dash speed kind is not represented for this combatant.",
    );
  }
  const spent = spendAction(input.state.currentTurnResources, "dash");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Dash is no longer available.",
    );
  }
  const nextState = applyDashToActor(
    input.state,
    actor,
    speedKind,
    spent.right,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function applyDashToActor(
  state: BattleState,
  actor: BattleCreatureState,
  speedKind: BattleMovementSpeedKind,
  spentResources: BattleTurnResources,
): BattleState {
  const speed = effectiveMovementSpeed(
    actor,
    speedKind,
    state.grapples.some((grapple) => grapple.targetId === actor.combatantId),
  );
  return {
    ...state,
    currentTurnResources: {
      ...spentResources,
      dashMovementBonusFeet: movementFeet(
        Number(spentResources.dashMovementBonusFeet) + Number(speed),
      ),
    },
  };
}

export function resolveDisengage(
  input: BattleResolutionInput,
): BattleResolutionResult {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Disengage accepts no fills.",
    );
  }
  const spent = spendAction(input.state.currentTurnResources, "disengage");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Disengage is no longer available.",
    );
  }
  const nextState = applyDisengage(input.state, spent.right);
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveBonusActionStandardAction(
  input: BonusActionStandardActionBattleResolutionInput,
): BattleResolutionResult {
  const actor = input.state.combatants.get(input.subject.actorId);
  if (
    !actorHasAlternateActionCost(
      actor,
      input.subject.sourceUnitId,
      input.subject.action,
    ) &&
    (input.subject.action !== "dash" ||
      bonusActionDashTemporaryHitPointsForActor(
        actor,
        input.subject.sourceUnitId,
      ) === null)
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Bonus Action standard action requires an admitted alternate action cost feature.",
    );
  }

  return Match.value(input.subject.action).pipe(
    Match.when("dash", () => resolveBonusActionDash(input)),
    Match.when("disengage", () => resolveBonusActionDisengage(input)),
    Match.when("hide", () =>
      resolveHide({
        ...input,
        subject: { ...input.subject, action: "hide" },
      }),
    ),
    Match.exhaustive,
  );
}

export function resolveBonusActionDash(
  input: BonusActionStandardActionBattleResolutionInput,
): BattleResolutionResult {
  if (input.fills.length > 0) {
    return invalidResult(input.state, "invalidFill", "Dash accepts no fills.");
  }
  const actor = input.state.combatants.get(input.subject.actorId);
  if (actor === undefined) {
    return invalidResult(
      input.state,
      "missingCombatant",
      "Dash actor is not in this battle.",
    );
  }
  const dashTemporaryHitPoints = bonusActionDashTemporaryHitPointsForActor(
    actor,
    input.subject.sourceUnitId,
  );
  const speedKind =
    input.subject.action === "dash" ? input.subject.speedKind : "walk";
  if (!representedMovementSpeedKinds(actor).includes(speedKind)) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Dash speed kind is not represented for this combatant.",
    );
  }
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Dash is no longer available.",
    );
  }
  const nextState = applyDashToActor(
    input.state,
    actor,
    speedKind,
    spent.right,
  );
  if (dashTemporaryHitPoints !== null) {
    if (!isCharacterBattleCreatureState(actor)) {
      return invalidResult(
        input.state,
        "unsupportedActOption",
        "Bonus Action Dash Temporary Hit Points requires a character feature resource.",
      );
    }
    return resolveBonusActionDashTemporaryHitPoints(
      nextState,
      actor,
      input.subject.sourceUnitId,
    );
  }
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveBonusActionDashTemporaryHitPoints(
  dashedState: BattleState,
  actor: CharacterBattleCreatureState,
  sourceUnitId: string,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  const nextActor = applyTemporaryHitPoints(
    {
      ...actor,
      origin: {
        ...actor.origin,
        resources: actor.origin.resources.map((candidate) =>
          candidate.unit.id === sourceUnitId
            ? spendCharacterResourceUse(candidate)
            : candidate,
        ),
      },
    },
    combatantProficiencyBonus(actor),
  );
  const nextState = {
    ...dashedState,
    combatants: new Map(dashedState.combatants).set(
      actor.combatantId,
      nextActor,
    ),
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveBonusActionDisengage(
  input: BonusActionStandardActionBattleResolutionInput,
): BattleResolutionResult {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Disengage accepts no fills.",
    );
  }
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Disengage is no longer available.",
    );
  }
  const nextState = applyDisengage(input.state, spent.right);
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function applyDisengage(
  state: BattleState,
  spentResources: BattleTurnResources,
): BattleState {
  return {
    ...state,
    currentTurnResources: { ...spentResources, disengaged: true },
  };
}

export function resolveDodge(
  input: BattleResolutionInput,
): BattleResolutionResult {
  if (input.fills.length > 0) {
    return invalidResult(input.state, "invalidFill", "Dodge accepts no fills.");
  }
  const actor = input.state.combatants.get(input.subject.actorId);
  if (actor === undefined) {
    return invalidResult(
      input.state,
      "missingCombatant",
      "Dodge actor is not in this battle.",
    );
  }
  const spent = spendAction(input.state.currentTurnResources, "dodge");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Dodge is no longer available.",
    );
  }
  const combatants = new Map(input.state.combatants).set(actor.combatantId, {
    ...actor,
    dodging: true,
  });
  const nextState = {
    ...input.state,
    combatants,
    currentTurnResources: spent.right,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveReady(
  input: BattleResolutionInputForSubject<
    Extract<BattleSubject, { readonly tag: "action"; readonly action: "ready" }>
  >,
): BattleResolutionResult {
  if (input.fills.length > 0) {
    return invalidResult(input.state, "invalidFill", "Ready accepts no fills.");
  }
  const spent = spendAction(input.state.currentTurnResources, "ready");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Ready is no longer available.",
    );
  }
  const nextState = {
    ...input.state,
    currentTurnResources: spent.right,
    readiedMovements: new Map(input.state.readiedMovements).set(
      input.subject.actorId,
      {
        trigger: input.subject.readyTrigger,
        expiresAt: {
          kind: "startOfTurn" as const,
          combatantId: input.subject.actorId,
        },
      },
    ),
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveHelpAttack(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      { readonly tag: "action"; readonly action: "helpAttack" }
    >
  >,
): BattleResolutionResult {
  const [allyFill, targetFillValue] = input.fills;
  if (allyFill === undefined) {
    return needsHolesResult(input.state, input.subject, [
      helpAttackAllyHole(input.state, input.subject.actorId),
    ]);
  }
  if (
    allyFill.kind !== "targetChoice" ||
    allyFill.holeId !== HELP_ATTACK_ALLY_HOLE_ID
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Help requires an ally target fill first.",
    );
  }
  const allyId = allyFill.value;
  if (
    !helpAttackAllyChoices(input.state, input.subject.actorId).includes(allyId)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Help ally must be another live combatant.",
    );
  }
  if (targetFillValue === undefined) {
    return needsHolesResult(input.state, input.subject, [
      helpAttackTargetHole(input.state, input.subject.actorId, allyId),
    ]);
  }
  if (
    input.fills.length > 2 ||
    targetFillValue.kind !== "targetChoice" ||
    targetFillValue.holeId !== HELP_ATTACK_TARGET_HOLE_ID
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Help requires one enemy target fill.",
    );
  }
  const targetEnemyId = targetFillValue.value;
  if (
    !helpAttackTargetChoices(
      input.state,
      input.subject.actorId,
      allyId,
    ).includes(targetEnemyId) ||
    !hasHelpAttackTargetSpatialFact(
      targetFillValue.spatialFacts ?? [],
      input.subject.actorId,
      targetEnemyId,
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Help target must be an enemy within 5 feet of the helper.",
    );
  }
  const spent = spendAction(input.state.currentTurnResources, "help");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Help is no longer available.",
    );
  }
  const nextState = {
    ...input.state,
    currentTurnResources: spent.right,
    helpAttacks: [
      ...input.state.helpAttacks,
      {
        helperId: input.subject.actorId,
        allyId,
        targetEnemyId,
        expiresAt: {
          kind: "startOfTurn" as const,
          combatantId: input.subject.actorId,
        },
      },
    ],
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveShakeAwakeFromSleep(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      { readonly tag: "action"; readonly action: "shakeAwakeFromSleep" }
    >
  >,
): BattleResolutionResult {
  const [targetFill] = input.fills;
  if (targetFill === undefined) {
    return needsHolesResult(input.state, input.subject, [
      sleepShakeAwakeTargetHole(input.state, input.subject.actorId),
    ]);
  }
  if (
    input.fills.length > 1 ||
    targetFill.kind !== "targetChoice" ||
    targetFill.holeId !== SLEEP_SHAKE_AWAKE_TARGET_HOLE_ID
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Sleep shake-awake requires one target fill.",
    );
  }
  const targetId = targetFill.value;
  if (
    !sleepShakeAwakeTargetChoices(input.state, input.subject.actorId).includes(
      targetId,
    ) ||
    !hasSleepShakeAwakeSpatialFact(
      targetFill.spatialFacts ?? [],
      input.subject.actorId,
      targetId,
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Sleep shake-awake target must be within 5 feet of the actor by table-supplied fact.",
    );
  }
  const spent = spendTurnAction(input.state.currentTurnResources);
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Sleep shake-awake is no longer available.",
    );
  }
  const nextState = removeSleepEffectsFromTarget(
    { ...input.state, currentTurnResources: spent.right },
    targetId,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveHide(
  input: HideBattleResolutionInput,
): BattleResolutionResult {
  const actor = input.state.combatants.get(input.subject.actorId);
  if (actor === undefined || !combatantCanTakeActions(actor)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Hide is no longer available for the current actor.",
    );
  }
  if (
    input.subject.tag === "bonusActionStandardAction" &&
    !actorHasAlternateActionCost(
      actor,
      input.subject.sourceUnitId,
      input.subject.action,
    )
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Bonus Action Hide requires an admitted alternate action cost feature.",
    );
  }
  if (!canHideInCurrentCircumstances(input.state, input.subject.actorId)) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Hide requires Heavily Obscured or sufficient cover and being out of enemy line of sight.",
    );
  }
  const check = abilityCheckFill(
    input.fills,
    HIDE_ABILITY_CHECK_HOLE_ID,
    "Hide",
  );
  if (check.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", check.message);
  }
  if (check.value === undefined) {
    return needsHolesResult(input.state, input.subject, [
      hideAbilityCheckHole(),
    ]);
  }

  const spent =
    input.subject.tag === "bonusActionStandardAction"
      ? spendActivationResource(input.state.currentTurnResources, {
          kind: "bonusAction",
        })
      : spendAction(input.state.currentTurnResources, "hide");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Hide is no longer available for the current actor.",
    );
  }
  const hidden =
    check.value.value.total >= HIDE_DC
      ? { discoveryDc: difficultyClass(check.value.value.total) }
      : null;
  const nextActor = { ...actor, hidden };
  const nextState = normalizeBattleGrapples({
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      input.subject.actorId,
      nextActor,
    ),
    currentTurnResources: spent.right,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveMultiattack(
  input: MultiattackBattleResolutionInput,
): BattleResolutionResult {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Multiattack accepts no fills.",
    );
  }
  const actor = input.state.combatants.get(input.subject.actorId);
  if (
    !isStatBlockBattleCreatureState(actor) ||
    !combatantCanTakeActions(actor)
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Multiattack requires an admitted Stat Block Multiattack.",
    );
  }
  const origin = actor.origin;
  const multiattack = supportedStatBlockMultiattacks(origin.statBlock).find(
    (candidate) => candidate.multiattack.name === input.subject.multiattackName,
  );
  if (multiattack === undefined) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Multiattack requires an admitted Stat Block Multiattack.",
    );
  }
  if (
    !multiattack.dispatches.every((dispatch) =>
      statBlockAttackResourceAvailable(
        origin.statBlock.statBlock,
        origin.resources,
        dispatch,
      ),
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Multiattack Stat Block resources are no longer available.",
    );
  }
  const spent = spendTurnAction(input.state.currentTurnResources);
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Attack is no longer available for the current actor.",
    );
  }
  const [consumedDispatch, ...pendingDispatches] = multiattack.dispatches;
  const nextStateWithPendingDispatches = {
    ...input.state,
    currentTurnResources: {
      ...spent.right,
      actionResources: [
        ...spent.right.actionResources,
        ...pendingDispatches.map((dispatch) => ({
          kind: "action" as const,
          source: "statBlockMultiattack" as const,
          sourceOwnerId: input.subject.actorId,
          attackPart: { section: "actions" as const, name: dispatch.part.name },
          restriction: {
            kind: "exclude" as const,
            actions: ATTACK_ONLY_ACTION_RESOURCE_EXCLUDED_ACTIONS,
          },
        })),
      ],
    },
  };
  const nextState =
    consumedDispatch === undefined
      ? nextStateWithPendingDispatches
      : spendStatBlockAttackResources({
          state: nextStateWithPendingDispatches,
          actorId: input.subject.actorId,
          attack: consumedDispatch,
        });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveSearch(
  input: SearchBattleResolutionInput,
): BattleResolutionResult {
  const targetFill = input.fills.find((fill) => fill.kind === "targetChoice");
  if (targetFill === undefined) {
    return needsHolesResult(input.state, input.subject, [
      searchTargetHole(input.state, input.subject.actorId),
    ]);
  }
  if (targetFill.holeId !== SEARCH_TARGET_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Search target fill does not match the requested hole.",
    );
  }
  const target = input.state.combatants.get(targetFill.value);
  if (
    target === undefined ||
    target.combatantId === input.subject.actorId ||
    target.hidden === null
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Search target must be a hidden combatant in this battle.",
    );
  }
  const check = abilityCheckFill(
    input.fills.filter((fill) => fill.kind !== "targetChoice"),
    SEARCH_ABILITY_CHECK_HOLE_ID,
    "Search",
  );
  if (check.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", check.message);
  }
  if (check.value === undefined) {
    return needsHolesResult(input.state, input.subject, [
      searchAbilityCheckHole(target.hidden.discoveryDc),
    ]);
  }
  const spent = spendAction(input.state.currentTurnResources, "search");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Search is no longer available for the current actor.",
    );
  }
  const found = check.value.value.total >= target.hidden.discoveryDc;
  const nextTarget = found ? { ...target, hidden: null } : target;
  const nextState = normalizeBattleGrapples({
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      target.combatantId,
      nextTarget,
    ),
    currentTurnResources: spent.right,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function helpAttackAllyHole(
  state: BattleState,
  helperId: CombatantId,
): BattleTargetChoiceHole {
  return {
    kind: "targetChoice",
    holeInstanceKey: HELP_ATTACK_ALLY_HOLE_INSTANCE,
    holeId: HELP_ATTACK_ALLY_HOLE_ID,
    label: "Help ally",
    choices: helpAttackAllyChoices(state, helperId),
  };
}

export function helpAttackTargetHole(
  state: BattleState,
  helperId: CombatantId,
  allyId: CombatantId,
): BattleTargetChoiceHole {
  return {
    kind: "targetChoice",
    holeInstanceKey: HELP_ATTACK_TARGET_HOLE_INSTANCE,
    holeId: HELP_ATTACK_TARGET_HOLE_ID,
    label: "Help attack target",
    requiresTableSpatialFact: true,
    choices: helpAttackTargetChoices(state, helperId, allyId),
  };
}

export function helpAttackAllyChoices(
  state: BattleState,
  helperId: CombatantId,
): readonly CombatantId[] {
  return [...state.combatants]
    .filter(
      ([id, combatant]) =>
        id !== helperId &&
        combatantsAreAllies(state, helperId, id) &&
        !zeroHpLifecycleIsTerminal(combatant),
    )
    .map(([id]) => id);
}

export function helpAttackTargetChoices(
  state: BattleState,
  helperId: CombatantId,
  allyId: CombatantId,
): readonly CombatantId[] {
  if (!helpAttackAllyChoices(state, helperId).includes(allyId)) return [];
  return [...state.combatants]
    .filter(
      ([id, combatant]) =>
        id !== helperId &&
        id !== allyId &&
        combatantsAreEnemies(state, helperId, id) &&
        !zeroHpLifecycleIsTerminal(combatant),
    )
    .map(([id]) => id);
}

export function hasHelpAttackTargetSpatialFact(
  facts: readonly BattleTargetSpatialFact[],
  helperId: CombatantId,
  targetEnemyId: CombatantId,
): boolean {
  return facts.some(
    (fact) =>
      fact.kind === "helpAttackTargetWithin5Feet" &&
      fact.helperId === helperId &&
      fact.targetEnemyId === targetEnemyId,
  );
}

export function resolveStatBlockBonusActionOption(
  input: StatBlockBonusActionOptionBattleResolutionInput,
): BattleResolutionResult {
  const actor = input.state.combatants.get(input.subject.actorId);
  if (
    !isStatBlockBattleCreatureState(actor) ||
    !combatantCanTakeActions(actor)
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Stat Block Bonus Action requires an admitted Stat Block action option.",
    );
  }
  const statBlockActor = actor;
  const origin = statBlockActor.origin;
  const option = supportedStatBlockBonusActionOptions(origin.statBlock).find(
    (candidate) =>
      candidate.option.name === input.subject.optionName &&
      candidate.option.options.some(
        (standardAction) => standardAction === input.subject.standardAction,
      ),
  );
  if (option === undefined) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Stat Block Bonus Action requires an admitted Stat Block action option.",
    );
  }
  if (
    !statBlockPartLimitedUseAvailable(
      origin.statBlock.statBlock,
      origin.resources,
      option.part,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Stat Block Bonus Action resource is no longer available.",
    );
  }
  if (
    !supportedStatBlockBonusActionStandardAction(input.subject.standardAction)
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Stat Block Bonus Action requires an admitted standard action option.",
    );
  }
  const standardAction = input.subject.standardAction;

  return Match.value(standardAction).pipe(
    Match.when("disengage", () =>
      resolveStatBlockBonusActionDisengage(input, statBlockActor, option.part),
    ),
    Match.when("hide", () =>
      resolveStatBlockBonusActionHide(input, statBlockActor, option.part),
    ),
    Match.exhaustive,
  );
}

export function resolveStatBlockBonusActionDisengage(
  input: StatBlockBonusActionOptionBattleResolutionInput,
  actor: StatBlockBattleCreatureState,
  part: StatBlockPartKey,
): BattleResolutionResult {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Stat Block Bonus Action Disengage accepts no fills.",
    );
  }
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bonus Action is no longer available for the current actor.",
    );
  }
  const nextState = updateStatBlockActorResources(
    {
      ...input.state,
      currentTurnResources: { ...spent.right, disengaged: true },
    },
    actor,
    part,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveStatBlockBonusActionHide(
  input: StatBlockBonusActionOptionBattleResolutionInput,
  actor: StatBlockBattleCreatureState,
  part: StatBlockPartKey,
): BattleResolutionResult {
  if (!canHideInCurrentCircumstances(input.state, input.subject.actorId)) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Hide requires Heavily Obscured or sufficient cover and being out of enemy line of sight.",
    );
  }
  const check = abilityCheckFill(
    input.fills,
    HIDE_ABILITY_CHECK_HOLE_ID,
    "Hide",
  );
  if (check.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", check.message);
  }
  if (check.value === undefined) {
    return needsHolesResult(input.state, input.subject, [
      hideAbilityCheckHole(),
    ]);
  }
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bonus Action is no longer available for the current actor.",
    );
  }
  const hidden =
    check.value.value.total >= HIDE_DC
      ? { discoveryDc: difficultyClass(check.value.value.total) }
      : null;
  const nextState = updateStatBlockActorResources(
    normalizeBattleGrapples({
      ...input.state,
      currentTurnResources: spent.right,
      combatants: new Map(input.state.combatants).set(actor.combatantId, {
        ...actor,
        hidden,
      }),
    }),
    actor,
    part,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveGrapple(
  input: GrappleBattleResolutionInput,
): BattleResolutionResult {
  const fillSet = grappleFillSet(input.fills);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  if (fillSet.targetId === undefined) {
    return needsHolesResult(input.state, input.subject, [
      grappleTargetHole(input.state, input.subject.actorId),
    ]);
  }
  const targetFill = input.fills.find((fill) => fill.kind === "targetChoice");
  if (targetFill?.holeId !== GRAPPLE_TARGET_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Grapple target fill does not match the requested hole.",
    );
  }
  const link = grappleLinkForTarget(
    input.state,
    input.subject.actorId,
    fillSet.targetId,
    fillSet.targetSpatialFacts,
  );
  if (link.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", link.message);
  }
  if (fillSet.outcome === undefined) {
    return needsHolesResult(input.state, input.subject, [
      grappleOutcomeHole(link.link),
    ]);
  }
  if (fillSet.outcome.holeId !== GRAPPLE_OUTCOME_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Grapple outcome fill does not match the requested hole.",
    );
  }
  if (
    actorHasStatBlockMultiattackActionResource(
      input.state,
      input.subject.actorId,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Grapple is not available during a Stat Block Multiattack dispatch.",
    );
  }
  const spent = spendAction(input.state.currentTurnResources, "attack");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Grapple is no longer available for the current actor.",
    );
  }
  const savingThrowExtendedState = extendSavingThrowOngoingFeatures(
    input.state,
    input.subject.actorId,
    [fillSet.targetId],
  );
  const nextState = normalizeBattleGrapples({
    ...savingThrowExtendedState,
    currentTurnResources: spent.right,
    grapples: fillSet.outcome.value.succeeded
      ? savingThrowExtendedState.grapples
      : [...savingThrowExtendedState.grapples, link.link],
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveShove(
  input: ShoveBattleResolutionInput,
): BattleResolutionResult {
  const fillSet = shoveFillSet(input.fills);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  if (fillSet.targetId === undefined) {
    return needsHolesResult(input.state, input.subject, [
      shoveTargetHole(input.state, input.subject.actorId),
    ]);
  }
  const targetFill = input.fills.find((fill) => fill.kind === "targetChoice");
  if (targetFill?.holeId !== SHOVE_TARGET_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Shove target fill does not match the requested hole.",
    );
  }
  const shove = shoveForTarget(
    input.state,
    input.subject.actorId,
    fillSet.targetId,
    fillSet.targetSpatialFacts,
  );
  if (shove.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", shove.message);
  }
  if (fillSet.outcome === undefined) {
    return needsHolesResult(input.state, input.subject, [
      shoveOutcomeHole({
        actorId: input.subject.actorId,
        targetId: fillSet.targetId,
        dc: shove.dc,
      }),
    ]);
  }
  if (fillSet.outcome.holeId !== SHOVE_OUTCOME_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Shove outcome fill does not match the requested hole.",
    );
  }
  if (
    !fillSet.outcome.value.succeeded &&
    fillSet.outcome.value.failedEffect.kind === "pushAway"
  ) {
    const pushValidation = validateShovePushDisposition(
      fillSet.outcome.value.failedEffect.disposition,
    );
    if (pushValidation !== null) {
      return invalidResult(input.state, "invalidFill", pushValidation);
    }
  }
  if (
    actorHasStatBlockMultiattackActionResource(
      input.state,
      input.subject.actorId,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Shove is not available during a Stat Block Multiattack dispatch.",
    );
  }
  const spent = spendAction(input.state.currentTurnResources, "attack");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Shove is no longer available for the current actor.",
    );
  }
  const savingThrowExtendedState = extendSavingThrowOngoingFeatures(
    input.state,
    input.subject.actorId,
    [fillSet.targetId],
  );
  const afterEffect = applyShoveOutcome({
    state: {
      ...savingThrowExtendedState,
      currentTurnResources: spent.right,
    },
    targetId: fillSet.targetId,
    outcome: fillSet.outcome.value,
  });
  return {
    tag: "resolved",
    state: afterEffect.state,
    snapshot: snapshotBattle(afterEffect.state),
    ...(afterEffect.shovePushes.length === 0
      ? {}
      : { shovePushes: afterEffect.shovePushes }),
  };
}

export function resolveEscapeGrapple(
  input: EscapeGrappleBattleResolutionInput,
): BattleResolutionResult {
  const grapple = grappledBy(input.state, input.subject.actorId);
  if (grapple === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "No Grapple is available to escape.",
    );
  }
  const fillSet = grappleFillSet(input.fills);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  if (fillSet.targetId !== undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Escape Grapple does not use a target fill.",
    );
  }
  if (fillSet.outcome === undefined) {
    return needsHolesResult(input.state, input.subject, [
      escapeGrappleOutcomeHole(grapple, input.subject.actorId),
    ]);
  }
  if (fillSet.outcome.holeId !== ESCAPE_GRAPPLE_OUTCOME_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Escape Grapple outcome fill does not match the requested hole.",
    );
  }
  if (
    actorHasStatBlockMultiattackActionResource(
      input.state,
      input.subject.actorId,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Escape Grapple is not available during a Stat Block Multiattack dispatch.",
    );
  }
  const spent = spendMatchingActionResource(
    input.state.currentTurnResources,
    "attack",
    (resource) =>
      !isClassFeatureExtraAttackActionResource(resource, input.subject.actorId),
  );
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Escape Grapple is no longer available for the current actor.",
    );
  }
  const nextState = normalizeBattleGrapples({
    ...input.state,
    currentTurnResources: spent.right,
    grapples: fillSet.outcome.value.succeeded
      ? input.state.grapples.filter((candidate) => candidate !== grapple)
      : input.state.grapples,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveEscapeSpellRestraint(
  input: EscapeSpellRestraintBattleResolutionInput,
): BattleResolutionResult {
  const effect = spellRestraintEffectFor(
    input.state,
    input.subject.targetId,
    input.subject.sourceSpellId,
    input.subject.sourceCombatantId,
  );
  if (effect === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "No spell-imposed Restraint is available to escape.",
    );
  }
  if (
    actorHasStatBlockMultiattackActionResource(
      input.state,
      input.subject.actorId,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Escape spell Restraint is not available during a Stat Block Multiattack dispatch.",
    );
  }
  const dc = spellSaveDcForCaster(input.state, effect.sourceCombatantId);
  if (dc === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Spell-imposed Restraint escape DC is no longer available.",
    );
  }
  const check = abilityCheckFill(
    input.fills,
    ESCAPE_SPELL_RESTRAINT_ABILITY_CHECK_HOLE_ID,
    "Escape spell Restraint",
  );
  if (check.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", check.message);
  }
  if (check.value === undefined) {
    return needsHolesResult(input.state, input.subject, [
      escapeSpellRestraintAbilityCheckHole(input.state, effect, {
        actorId: input.subject.actorId,
        targetId: input.subject.targetId,
      }),
    ]);
  }
  if (
    input.subject.actorId !== input.subject.targetId &&
    !spellRestraintEscapeActorWithinTargetReach(
      check.value.spatialFacts ?? [],
      input.subject.actorId,
      input.subject.targetId,
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Escape spell Restraint helper must be within reach of the restrained target by table-supplied fact.",
    );
  }
  const spent = spendAction(input.state.currentTurnResources, "utilize");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Escape spell Restraint is no longer available for the current actor.",
    );
  }
  const nextState =
    check.value.value.total >= dc
      ? resolveSuccessfulEscapeSpellRestraint(
          {
            ...input.state,
            currentTurnResources: spent.right,
          },
          input.subject.targetId,
          effect,
        )
      : {
          ...input.state,
          currentTurnResources: spent.right,
        };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveSuccessfulEscapeSpellRestraint(
  state: BattleState,
  targetId: CombatantId,
  effect: Extract<BattleActiveEffect, { readonly kind: "spellCondition" }>,
): BattleState {
  if (effect.escape?.kind !== "abilityCheck") {
    return removeSpellConditionEffect(state, targetId, effect);
  }
  return Match.value(effect.escape.successEnds).pipe(
    Match.when("condition", () =>
      removeSpellConditionEffect(state, targetId, effect),
    ),
    Match.when("spell", () =>
      breakBattleConcentration(state, effect.sourceCombatantId),
    ),
    Match.exhaustive,
  );
}

function spellRestraintEscapeActorWithinTargetReach(
  facts: readonly BattleTargetSpatialFact[],
  actorId: CombatantId,
  targetId: CombatantId,
): boolean {
  return facts.some(
    (fact) =>
      fact.kind === "spellRestraintEscapeActorWithinTargetReach" &&
      fact.actorId === actorId &&
      fact.targetId === targetId,
  );
}

function hasSleepShakeAwakeSpatialFact(
  facts: readonly BattleTargetSpatialFact[],
  actorId: CombatantId,
  targetId: CombatantId,
): boolean {
  return facts.some(
    (fact) =>
      fact.kind === "sleepShakeAwakeActorWithin5Feet" &&
      fact.actorId === actorId &&
      fact.targetId === targetId,
  );
}

export function resolveReleaseGrappleCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      { readonly tag: "runtimeCommand"; readonly command: "releaseGrapple" }
    >
  >,
): BattleResolutionResult {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Release Grapple does not use fills.",
    );
  }
  const nextState = normalizeBattleGrapples({
    ...input.state,
    grapples: input.state.grapples.filter(
      (grapple) =>
        !(
          grapple.grapplerId === input.subject.actorId &&
          grapple.targetId === input.subject.targetId
        ),
    ),
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function abilityCheckFill(
  fills: readonly BattleFill[],
  holeId: BattleHoleId,
  label: string,
):
  | {
      readonly tag: "ok";
      readonly value:
        | Extract<BattleFill, { readonly kind: "abilityCheck" }>
        | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  let check: Extract<BattleFill, { readonly kind: "abilityCheck" }> | undefined;
  for (const fill of fills) {
    if (fill.kind === "abilityCheck" && fill.holeId === holeId) {
      if (check !== undefined) {
        return { tag: "invalid", message: `${label} check was filled twice.` };
      }
      check = fill;
      continue;
    }
    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the ${label} replay holes.`,
    };
  }
  return { tag: "ok", value: check };
}

export function spellSaveDcForCaster(
  state: BattleState,
  casterId: CombatantId,
): DifficultyClass | null {
  const caster = state.combatants.get(casterId);
  if (caster?.origin.kind !== "character") {
    return null;
  }
  const spellcasting = caster.origin.spellcasting;
  if (spellcasting === undefined) {
    return null;
  }
  return difficultyClass(
    8 +
      Number(spellcasting.spellcastingAbilityModifier) +
      spellcasting.proficiencyBonus +
      activeOngoingFeatureSpellSaveDcBonus(caster),
  );
}

function activeOngoingFeatureSpellSaveDcBonus(
  caster: BattleCreatureState,
): number {
  if (!isCharacterBattleCreatureState(caster)) {
    return 0;
  }
  const spellcasting = caster.origin.spellcasting;
  if (spellcasting === undefined) {
    return 0;
  }
  return [...activeOngoingFeatureOccurrencesForCombatant(caster)].reduce(
    (total, [key]) => {
      const profile = ongoingFeatureProfileForSourceKey(caster, key);
      if (
        profile === null ||
        ongoingFeatureSpellModifierSourceClassName(profile) !==
          spellcasting.sourceClassName
      ) {
        return total;
      }
      return (
        total +
        profile.spellModifiers.reduce(
          (modifierTotal, modifier) =>
            modifierTotal + modifier.saveDcBonus,
          0,
        )
      );
    },
    0,
  );
}

function validateShovePushDisposition(
  disposition: BattleShovePushOutcome["disposition"],
): string | null {
  if (Number(disposition.distanceFeet) !== 5) {
    return "Shove push disposition must use the action's 5-foot distance.";
  }
  if (disposition.provokesOpportunityAttacks !== false) {
    return "Shove push disposition must not provoke Opportunity Attacks.";
  }
  return null;
}

function applyShoveOutcome(input: {
  readonly state: BattleState;
  readonly targetId: CombatantId;
  readonly outcome: Extract<
    BattleFill,
    { readonly kind: "shoveOutcome" }
  >["value"];
}): {
  readonly state: BattleState;
  readonly shovePushes: readonly BattleShovePushOutcome[];
} {
  if (input.outcome.succeeded) {
    return { state: input.state, shovePushes: [] };
  }
  return Match.value(input.outcome.failedEffect).pipe(
    Match.when({ kind: "prone" }, () => {
      const target = input.state.combatants.get(input.targetId);
      if (target === undefined) {
        return { state: input.state, shovePushes: [] };
      }
      const state = {
        ...input.state,
        combatants: new Map(input.state.combatants).set(
          input.targetId,
          battleCreatureStateWithKnockOutPreservedConditions(
            target,
            applyCondition(target.conditions, "prone"),
          ),
        ),
      };
      return { state, shovePushes: [] };
    }),
    Match.when({ kind: "pushAway" }, (effect) => ({
      state: input.state,
      shovePushes: [
        {
          targetId: input.targetId,
          disposition: effect.disposition,
        },
      ],
    })),
    Match.exhaustive,
  );
}

export function grappleFillSet(fills: readonly BattleFill[]): GrappleFillSet {
  let targetId: CombatantId | undefined;
  let targetSpatialFacts: readonly BattleTargetSpatialFact[] = [];
  let outcome:
    | Extract<BattleFill, { readonly kind: "grappleOutcome" }>
    | undefined;
  for (const fill of fills) {
    if (fill.kind === "targetChoice") {
      if (targetId !== undefined) {
        return { tag: "invalid", message: "Grapple target was filled twice." };
      }
      targetId = fill.value;
      targetSpatialFacts = fill.spatialFacts ?? [];
      continue;
    }
    if (fill.kind === "grappleOutcome") {
      if (outcome !== undefined) {
        return {
          tag: "invalid",
          message: "Grapple outcome was filled twice.",
        };
      }
      outcome = fill;
      continue;
    }
    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the Grapple replay holes.`,
    };
  }
  return { tag: "ok", targetId, targetSpatialFacts, outcome };
}

export function shoveFillSet(fills: readonly BattleFill[]): ShoveFillSet {
  let targetId: CombatantId | undefined;
  let targetSpatialFacts: readonly BattleTargetSpatialFact[] = [];
  let outcome:
    | Extract<BattleFill, { readonly kind: "shoveOutcome" }>
    | undefined;
  for (const fill of fills) {
    if (fill.kind === "targetChoice") {
      if (targetId !== undefined) {
        return { tag: "invalid", message: "Shove target was filled twice." };
      }
      targetId = fill.value;
      targetSpatialFacts = fill.spatialFacts ?? [];
      continue;
    }
    if (fill.kind === "shoveOutcome") {
      if (outcome !== undefined) {
        return {
          tag: "invalid",
          message: "Shove outcome was filled twice.",
        };
      }
      outcome = fill;
      continue;
    }
    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the Shove replay holes.`,
    };
  }
  return { tag: "ok", targetId, targetSpatialFacts, outcome };
}

export function validateAttackDamageFill(
  fill: BattleRolledDiceFill,
  attack: SupportedAttackActionOption,
  critical: boolean,
  attackRoll: AttackRollResult,
  eligibleAttackDamageRiders: readonly AttackDamageRider[],
  spellWeaponDamageRiders: readonly SpellAttackDamageComponent[] = [],
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [],
  ongoingDamageModifier = 0,
  eligibleWeaponDamageDiceRollChoiceUnitIds: readonly UnitRecord["id"][] = [],
): string | null {
  const selectedRiders = selectedAttackDamageRiders(
    eligibleAttackDamageRiders,
    fill.selectedAttackDamageRiderUnitIds,
  );
  if (selectedRiders === null) {
    return "Selected attack damage rider is not eligible for this attack.";
  }
  if (
    fill.holeId !==
    attackDamageHoleId(
      attack,
      critical,
      attackRoll,
      spellWeaponDamageRiders,
      spellMarkedDamageRiders,
      ongoingDamageModifier,
    )
  ) {
    return critical
      ? "Critical hit damage must use the critical damage hole."
      : "Attack damage must use the normal hit damage hole.";
  }

  const weaponDamageDiceRollChoice = selectedWeaponDamageDiceRollChoice(
    eligibleWeaponDamageDiceRollChoiceUnitIds,
    fill.weaponDamageDiceRollChoice,
  );
  if (
    fill.weaponDamageDiceRollChoice !== undefined &&
    weaponDamageDiceRollChoice === null
  ) {
    return "Weapon damage dice roll choice is not eligible for this attack.";
  }

  return validateRolledDiceForWeaponAttack(
    fill.value,
    attack,
    critical,
    attackRoll,
    selectedRiders,
    spellWeaponDamageRiders,
    spellMarkedDamageRiders,
    weaponDamageDiceRollChoice ?? undefined,
  );
}

export function validateRolledDiceForWeaponAttack(
  groups: ReadonlyArray<RolledDiceGroup>,
  attack: SupportedAttackActionOption,
  critical: boolean,
  attackRoll: AttackRollResult,
  attackDamageRiders: readonly AttackDamageRider[],
  spellWeaponDamageRiders: readonly SpellAttackDamageComponent[],
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[],
  weaponDamageDiceRollChoice?: WeaponDamageDiceRollChoiceFill,
): string | null {
  const components = attackDamageComponents(
    attack,
    critical,
    attackRoll,
    attackDamageRiders,
    spellWeaponDamageRiders,
    spellMarkedDamageRiders,
  );
  if (groups.length !== components.length) {
    return "filled damage groups do not match current attack damage";
  }

  for (const [index, component] of components.entries()) {
    const group = groups[index];
    if (group === undefined) {
      return "filled damage groups do not match current attack damage";
    }
    const validation = validateRolledDiceForDiceExpr([group], component.expr);
    if (validation !== null) {
      return validation.reason;
    }
  }

  if (weaponDamageDiceRollChoice !== undefined) {
    const weaponDamage = weaponDamageComponent(attack, critical);
    if (weaponDamage === null) {
      return "Weapon damage dice roll choice requires weapon damage dice.";
    }
    const candidateValidation = validateRolledDiceForDiceExpr(
      weaponDamageDiceRollChoice.candidates,
      {
        dice: weaponDamage.expr.dice * 2,
        dieSize: weaponDamage.expr.dieSize,
      },
    );
    if (candidateValidation !== null) {
      return candidateValidation.reason;
    }
    const selectedCandidate =
      weaponDamageDiceRollChoice.selection === "first"
        ? weaponDamageDiceRollChoice.candidates[0]
        : weaponDamageDiceRollChoice.candidates[1];
    if (
      JSON.stringify(groups[0]?.results) !==
      JSON.stringify(selectedCandidate.results)
    ) {
      return "Selected weapon damage dice roll choice must match the base weapon damage group.";
    }
  }

  return null;
}

export function attackRollHitsWithCriticalThreshold(
  roll: AttackRollResult,
  armorClass: number,
  criticalThreshold: CriticalHitThreshold,
): boolean {
  if (Number(roll.naturalD20) === 1) {
    return false;
  }

  if (attackRollIsCriticalHit(roll, criticalThreshold)) {
    return true;
  }

  return roll.total >= armorClass;
}

export function attackRollIsCriticalHit(
  roll: AttackRollResult,
  criticalThreshold: CriticalHitThreshold = 20,
): boolean {
  return Number(roll.naturalD20) >= criticalThreshold;
}

export function criticalThresholdForAttack(
  attacker: BattleCreatureState | undefined,
  attack: SupportedAttackActionOption,
): CriticalHitThreshold {
  if (
    !attackUsesWeaponOrUnarmedStrikeCriticalRange(attack) ||
    attacker?.origin.kind !== "character"
  ) {
    return 20;
  }

  return attacker.origin.characterUnitRefs.some(
    (unitRef) =>
      unitRef.supportProfiles.some(
        (profile) =>
          profile === WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE,
      ) === true,
  )
    ? 19
    : 20;
}

export function attackUsesWeaponOrUnarmedStrikeCriticalRange(
  attack: SupportedAttackActionOption,
): boolean {
  return Match.value(attack).pipe(
    Match.when({ kind: "weapon" }, () => true),
    Match.when({ kind: "unarmedStrike" }, () => true),
    Match.when({ kind: "statBlockAttack" }, () => false),
    Match.exhaustive,
  );
}

export function compatibleAttackActionResource(
  resources: readonly RuntimeActionResource[],
): { readonly resource: RuntimeActionResource; readonly index: number } | null {
  const compatible = resources
    .map((resource, index) => ({ resource, index }))
    .filter(({ resource }) =>
      resource.source === "turn"
        ? true
        : actionRestrictionAllows(resource.restriction, "attack"),
    );
  const extraAttack = compatible.find(
    ({ resource }) => resource.source === "classFeatureExtraAttack",
  );
  if (extraAttack !== undefined) return extraAttack;
  const restricted = compatible.find(
    ({ resource }) => resource.source !== "turn",
  );
  return restricted ?? compatible[0] ?? null;
}

export function spendAttackActionResource<T extends ActionEconomyState>(
  state: T,
): Either.Either<
  { readonly state: T; readonly spentResource: RuntimeActionResource },
  "no action resource available"
> {
  const actionResource = compatibleAttackActionResource(state.actionResources);
  if (actionResource === null) {
    return Either.left("no action resource available");
  }
  return Either.right({
    state: {
      ...state,
      actionResources: state.actionResources.filter(
        (_, index) => index !== actionResource.index,
      ),
    },
    spentResource: actionResource.resource,
  });
}

export function classFeatureExtraAttackForActor(
  actor: BattleCreatureState | undefined,
): {
  readonly unitId: UnitRecord["id"];
  readonly additionalAttacks: 1;
} | null {
  if (actor?.origin.kind !== "character") return null;
  for (const unitRef of actor.origin.characterUnitRefs) {
    for (const profile of unitRef.supportProfiles) {
      if (
        typeof profile === "object" &&
        profile.kind === ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE
      ) {
        return {
          unitId: unitRef.unitId,
          additionalAttacks: profile.additionalAttacks,
        };
      }
    }
  }
  return null;
}

export function openClassFeatureExtraAttackResource(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly spentResource: RuntimeActionResource;
}): BattleTurnResources {
  if (
    input.spentResource.source === "classFeatureExtraAttack" ||
    actorHasClassFeatureExtraAttackActionResource(input.state, input.actorId)
  ) {
    return input.state.currentTurnResources;
  }
  const extraAttack = classFeatureExtraAttackForActor(
    input.state.combatants.get(input.actorId),
  );
  if (extraAttack === null) {
    return input.state.currentTurnResources;
  }
  return {
    ...input.state.currentTurnResources,
    actionResources: [
      ...input.state.currentTurnResources.actionResources,
      ...Array.from({ length: extraAttack.additionalAttacks }, () => ({
        kind: "action" as const,
        source: "classFeatureExtraAttack" as const,
        sourceOwnerId: input.actorId,
        sourceUnitId: extraAttack.unitId,
        restriction: {
          kind: "exclude" as const,
          actions: ATTACK_ONLY_ACTION_RESOURCE_EXCLUDED_ACTIONS,
        },
      })),
    ],
  };
}

export function spendAttackAction(
  state: BattleState,
  actorId: CombatantId,
  attack: SupportedAttackActionOption,
): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  if (
    attack.kind === "statBlockAttack" &&
    attack.part.section === "legendaryActions"
  ) {
    const nextState = spendStatBlockAttackResources({
      state,
      actorId,
      attack,
    });
    return {
      tag: "resolved",
      state: nextState,
      snapshot: snapshotBattle(nextState),
    };
  }

  const multiattackResources =
    attack.kind === "statBlockAttack" && attack.part.section === "actions"
      ? state.currentTurnResources.actionResources.filter(
          (resource): resource is StatBlockMultiattackActionResource =>
            isStatBlockMultiattackActionResource(resource, actorId),
        )
      : [];
  let spentTurnResources: BattleTurnResources;
  let spentResource: RuntimeActionResource | null;
  if (
    multiattackResources.length > 0 &&
    attack.kind === "statBlockAttack" &&
    attack.part.section === "actions"
  ) {
    const spent = spendMatchingActionResource(
      state.currentTurnResources,
      "attack",
      (resource) =>
        isStatBlockMultiattackActionResource(resource, actorId) &&
        resource.attackPart.section === attack.part.section &&
        resource.attackPart.name === attack.part.name,
    );
    if (Either.isLeft(spent)) {
      return invalidResult(
        state,
        "staleSubject",
        "Attack is no longer available for the current actor.",
      );
    }
    spentTurnResources = spent.right;
    spentResource = null;
  } else {
    const spent = spendAttackActionResource(state.currentTurnResources);
    if (Either.isLeft(spent)) {
      return invalidResult(
        state,
        "staleSubject",
        "Attack is no longer available for the current actor.",
      );
    }
    spentTurnResources = spent.right.state;
    spentResource = spent.right.spentResource;
  }
  const afterExtraAttackResource =
    spentResource === null
      ? spentTurnResources
      : openClassFeatureExtraAttackResource({
          state: {
            ...state,
            currentTurnResources: spentTurnResources,
          },
          actorId,
          spentResource,
        });
  const nextTurnResources =
    attack.kind === "weapon" && isLightMeleeWeapon(attack.weapon)
      ? {
          ...afterExtraAttackResource,
          lightWeaponAttackMade: {
            weaponItemId: heldWeaponItemIdForAttack(state, actorId, attack),
          },
        }
      : afterExtraAttackResource;
  const nextTurnResourcesWithoutPendingReplacement =
    clearPendingAttackRollMissToHitReplacementSelection(
      nextTurnResources,
      actorId,
    );

  const nextState = spendStatBlockAttackResources({
    state: {
      ...state,
      currentTurnResources: nextTurnResourcesWithoutPendingReplacement,
    },
    actorId,
    attack,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}
