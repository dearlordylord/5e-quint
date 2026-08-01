// KERNEL-COVERAGE: runtime-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

import { battleFillKind } from "../battle-protocol-kinds.ts";
import {
  afterHitSpellDiscoveryRoutesForDiscoveredAct,
  afterHitSpellDiscoveryRoutesForResolution,
  afterHitSpellEscapeRouteForResolution,
  afterHitSpellRouteForInterrupt,
  afterHitSpellTurnBoundaryRouteForResolution,
  afterHitSpellConcentrationTeardownRoutes,
  afterHitSpellSavingThrowCompletionRoutes,
  battleHasAfterHitAttackDamageAddition,
} from "./after-hit-spell-routes.ts";
import type {
  BattleActDiscoveryCandidate,
  BattleActiveEffect,
  BattleCreatureState,
  BattleFeatherFallLandingResult,
  BattleFill,
  BattleHole,
  AdmittedBattleResolutionInput,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import { battleCreatureType } from "./domain-helpers.ts";
import {
  battleHoleFamilyKind,
  requiredAbilityCheckRollMode,
} from "./hole-helpers.ts";
import {
  metamagicCastingOptionRouteForDiscoveredAct,
  metamagicEffectiveSpellLevelRouteForDiscoveredAct,
  metamagicEffectiveSpellLevelRouteForResolution,
  metamagicCastingOptionRouteForResolution,
  metamagicSpellComponentProjectionRouteForDiscoveredAct,
  metamagicSpellComponentProjectionRouteForResolution,
  metamagicSpellDurationProjectionRouteForDiscoveredAct,
  metamagicSpellDurationProjectionRouteForResolution,
} from "./metamagic-routes.ts";
import {
  conditionApplicationPreventedByCreatureTypeProtection,
  resolveBattlePossessionAttempt,
} from "./spell-condition-effects-helpers.ts";
import {
  CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  characterSpellProcedure,
  type BattleSpellProcedureExecution,
  characterUnitProcedure,
  unitSupportProfileKind,
} from "../character-execution-queries.ts";
import {
  conditionSpellEndTurnRepeatSaveHoleIds,
  sleepRepeatSaveSavingThrowHoleIds,
  spellTurnStartSavingThrowOutcomeHoleId,
} from "./turn-end-movement.ts";
import { battleLightEmitters } from "./spells-active-effects.ts";
import {
  activeOngoingFeatureOccurrencesForCombatant,
  isCharacterBattleCreatureState,
  ongoingFeatureProfileForSourceKey,
} from "./creature-state-execution.ts";
import {
  ATTACK_ROLL_REQUIRED_BEFORE_DAMAGE_MESSAGE,
  ATTACK_TARGET_REQUIRED_BEFORE_ROLL_OR_DAMAGE_MESSAGE,
} from "./attack-ordering-messages.ts";
import {
  attackActionOptionForSubject,
  weaponAttackUsesActiveSpellOverride,
} from "./attack-damage-apply.ts";
import { creatureAttackHit } from "./creature-attack.ts";
import {
  battleReducerRouteFill,
  battleReducerRouteHole,
  battleReducerRouteHoles,
  discoverBattleActsRoute,
  nonEmptyRouteEvents,
  resolveBattleInterruptRoute,
  resolveBattleSubjectRoute,
  resolveBattleSubjectWithoutFillRoute,
  startBattleRoute,
} from "./reducer-route-builders.ts";
import type {
  BattleReducerRouteEvent,
  BattleReducerRouteEvents,
  BattleReducerRouteFill,
  BattleReducerRouteFillKind,
  BattleReducerRouteHole,
  BattleReducerRouteOwnerGroup,
  BattleReducerRouteSubjectFamily,
} from "./reducer-route-protocol.ts";
import {
  passiveDamageAdjustmentRouteForSpellDamageResolution,
  passiveDamageAdjustmentRouteForSpellDiscovery,
  passiveProjectionRouteForDiscoveredAct,
  passiveProjectionRouteForResolution,
} from "./passive-projection-routes.ts";
import { spellInvocationForRouteSubject } from "./reducer-route-spell-query.ts";
import { isEndTurnSubject } from "./reducer-route-subject-query.ts";
import {
  battleActiveEffects,
  battleCombatantHasActiveEffectKind,
  combatantConcentrationChanged,
  combatantsConditionsChanged,
  combatantsTemporaryHitPointsIncreased,
  combatantsActiveEffectsChanged,
  combatantsConcentrationChanged,
  targetDamagedByCasterOrAllySpellConditionRemoved,
} from "./reducer-route-state-query.ts";
import {
  weaponSpellRouteForDiscoveredAct,
  weaponSpellRouteForResolution,
  battleHasWeaponDamageRiderHole,
} from "./weapon-spell-routes.ts";
import {
  wildShapeLifecycleRouteForDiscoveredAct,
  wildShapeLifecycleRouteForResolution,
  wildShapeLifecycleTerminalRouteForResolution,
  wildShapeLifecycleTurnBoundaryRouteForResolution,
} from "./wild-shape-lifecycle-routes.ts";
import {
  movementRouteForDiscoveredAct,
  movementRouteForResolution,
} from "./movement-routes.ts";
import { reactionSpellRouteForInterrupt } from "./reaction-spell-routes.ts";
import { interruptStackResumeDiscoveryRouteForResolution } from "./interrupt-stack-routes.ts";

export function battleReducerStartRouteEvent(): BattleReducerRouteEvent {
  return startBattleRoute("battleActionEconomy");
}

type WeaponAttackResolutionSubject = Extract<
  BattleResolutionInput["subject"],
  { readonly tag: "action"; readonly action: "attack" }
>;
export function activeFeatureSpellSaveDcRouteEvents(input: {
  readonly state: BattleState;
  readonly casterId: CombatantId;
}): BattleReducerRouteEvents | undefined {
  if (!hasActiveFeatureSpellSaveDcModifier(input.state, input.casterId)) {
    return undefined;
  }
  return [
    resolveBattleSubjectWithoutFillRoute(
      "activeFeatureSpellSaveDc",
      [],
      "battleActiveEffect",
    ),
    resolveBattleSubjectWithoutFillRoute(
      "activeFeatureSpellSaveDc",
      [],
      "battleSpellSlotAndActionEconomy",
    ),
  ];
}

export function battleReducerRouteEventsForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvents | undefined {
  const passiveProjectionRoute = passiveProjectionRouteForDiscoveredAct(
    state,
    act,
  );
  if (passiveProjectionRoute !== undefined) {
    return passiveProjectionRoute;
  }
  if (isUnitFeatureBonusActionRouteSubject(state, act.subject)) {
    return [
      discoverBattleActsRoute(
        "unitFeatureBonusAction",
        [],
        "battleFeatureResource",
      ),
    ];
  }
  const companionRoute = companionRouteForDiscoveredAct(act);
  if (companionRoute !== undefined) {
    return [companionRoute];
  }
  const metamagicEffectiveSpellLevelRoute =
    metamagicEffectiveSpellLevelRouteForDiscoveredAct(state, act);
  if (metamagicEffectiveSpellLevelRoute !== undefined) {
    return metamagicEffectiveSpellLevelRoute;
  }
  const rollModifierRoute = rollModifierRouteForDiscoveredAct(state, act);
  if (rollModifierRoute !== undefined) {
    return [rollModifierRoute];
  }
  const spellDamageReductionRoute = spellDamageReductionRouteForDiscoveredAct(
    state,
    act,
  );
  if (spellDamageReductionRoute !== undefined) {
    return [spellDamageReductionRoute];
  }
  const afterHitSpellDiscoveryRoute =
    afterHitSpellDiscoveryRoutesForDiscoveredAct(state, act);
  if (afterHitSpellDiscoveryRoute !== undefined) {
    return afterHitSpellDiscoveryRoute;
  }
  const markedDamageAndConditionProtectionRoute =
    markedDamageAndConditionProtectionRouteForDiscoveredAct(state, act);
  if (markedDamageAndConditionProtectionRoute !== undefined) {
    return [markedDamageAndConditionProtectionRoute];
  }
  const metamagicSpellComponentProjectionRoute =
    metamagicSpellComponentProjectionRouteForDiscoveredAct(act);
  if (metamagicSpellComponentProjectionRoute !== undefined) {
    return metamagicSpellComponentProjectionRoute;
  }
  const protectionCharmRoute = protectionCharmRouteForDiscoveredAct(state, act);
  if (protectionCharmRoute !== undefined) {
    return protectionCharmRoute;
  }
  const scalarBuffRoute = scalarBuffRouteForDiscoveredAct(state, act);
  if (scalarBuffRoute !== undefined) {
    return [scalarBuffRoute];
  }
  const sleepRepeatSaveRoute = sleepRepeatSaveRouteForDiscoveredAct(state, act);
  if (sleepRepeatSaveRoute !== undefined) {
    return [sleepRepeatSaveRoute];
  }
  const attackActionAreaSaveDamageReplacementRoute =
    attackActionAreaSaveDamageReplacementRouteForDiscoveredAct(state, act);
  if (attackActionAreaSaveDamageReplacementRoute !== undefined) {
    return [attackActionAreaSaveDamageReplacementRoute];
  }
  const wildShapeLifecycleRoute = wildShapeLifecycleRouteForDiscoveredAct(act);
  if (wildShapeLifecycleRoute !== undefined) {
    return [wildShapeLifecycleRoute];
  }
  if (isStatBlockActionRouteSubject(state, act.subject)) {
    return [
      discoverBattleActsRoute(
        "statBlockAction",
        battleReducerRouteHoles(act.initialHoles),
        "battleStatBlockAction",
      ),
    ];
  }
  if (act.subject.tag === "creatureAttack") {
    return [
      discoverBattleActsRoute(
        "creatureAttack",
        battleReducerRouteHoles(act.initialHoles),
        "battleAttackRoll",
      ),
    ];
  }
  if (isWeaponAttackSubject(act.subject)) {
    const markedDamageRiderWeaponAttackDiscoveryRoute =
      markedDamageRiderWeaponAttackRouteForDiscoveredAct(state, act);
    const weaponAttackRoute: BattleReducerRouteEvent = discoverBattleActsRoute(
      "weaponAttack",
      battleReducerRouteHoles(act.initialHoles),
      "battleActionEconomy",
    );
    return markedDamageRiderWeaponAttackDiscoveryRoute === undefined
      ? [weaponAttackRoute]
      : [markedDamageRiderWeaponAttackDiscoveryRoute, weaponAttackRoute];
  }
  if (isConcentrationTeardownDiscoverySubject(state, act.subject)) {
    return [
      discoverBattleActsRoute(
        "concentrationTeardown",
        battleReducerRouteHoles(act.initialHoles),
        act.subject.tag === "actionSpell"
          ? "battleSpellSlotAndActionEconomy"
          : "battleConcentration",
      ),
    ];
  }
  const metamagicSpellDurationProjectionRoute =
    metamagicSpellDurationProjectionRouteForDiscoveredAct(state, act);
  if (metamagicSpellDurationProjectionRoute !== undefined) {
    return metamagicSpellDurationProjectionRoute;
  }
  if (isCommandEffectDiscoverySubject(state, act.subject)) {
    return [
      discoverBattleActsRoute(
        "commandEffect",
        battleReducerRouteHoles(act.initialHoles),
        act.subject.tag === "actionSpell"
          ? "battleSpellSlotAndActionEconomy"
          : "battleActiveEffect",
      ),
    ];
  }
  const movementRoute = movementRouteForDiscoveredAct(state, act);
  if (movementRoute !== undefined) {
    return movementRoute;
  }
  const metamagicCastingOptionRoute =
    metamagicCastingOptionRouteForDiscoveredAct(state, act);
  if (metamagicCastingOptionRoute !== undefined) {
    return metamagicCastingOptionRoute;
  }
  if (isHitPointRestorationDiscoverySubject(state, act)) {
    return [
      discoverBattleActsRoute(
        "hitPointRestoration",
        battleReducerRouteHoles(act.initialHoles),
        hitPointRestorationDiscoveryOwner(act.subject),
      ),
    ];
  }
  if (isZeroHitPointStabilizationSubject(state, act.subject)) {
    return [
      discoverBattleActsRoute(
        "zeroHitPointStabilization",
        battleReducerRouteHoles(act.initialHoles),
        "battleActionEconomy",
      ),
    ];
  }
  const wardedTargetRoute = wardedTargetInterdictionRouteForDiscoveredAct(
    state,
    act,
  );
  if (wardedTargetRoute !== undefined) {
    return wardedTargetRoute;
  }
  const spellBaseArmorClassRoute =
    spellBaseArmorClassEffectRouteForDiscoveredAct(state, act);
  if (spellBaseArmorClassRoute !== undefined) {
    return [spellBaseArmorClassRoute];
  }
  const spatialEffectCompositionRoute =
    spatialEffectCompositionRouteForDiscoveredAct(state, act);
  const runtimeSpatialRoute =
    spatialEffectCompositionRuntimeRouteForDiscoveredAct(state, act);
  const thunderwavePresentationRoute =
    thunderwavePresentationRouteForDiscoveredAct(state, act);
  const saveGatedDiscoveryRoute = saveGatedSpellRouteForDiscoveredAct(
    state,
    act,
  );
  if (
    spatialEffectCompositionRoute !== undefined ||
    runtimeSpatialRoute !== undefined ||
    thunderwavePresentationRoute !== undefined
  ) {
    return nonEmptyRouteEvents([
      ...(spatialEffectCompositionRoute === undefined
        ? []
        : [spatialEffectCompositionRoute]),
      ...(runtimeSpatialRoute === undefined ? [] : [runtimeSpatialRoute]),
      ...(thunderwavePresentationRoute === undefined
        ? []
        : [thunderwavePresentationRoute]),
      ...(saveGatedDiscoveryRoute ?? []),
      ...(saveGatedDiscoveryRoute === undefined
        ? []
        : passiveDamageAdjustmentRouteForSpellDiscovery(state)),
    ]);
  }
  const weaponSpellDiscoveryRoute = weaponSpellRouteForDiscoveredAct(
    state,
    act,
  );
  if (weaponSpellDiscoveryRoute !== undefined) {
    return [weaponSpellDiscoveryRoute];
  }
  if (isSlotSpellDiscoverySubject(state, act.subject)) {
    return [
      discoverBattleActsRoute(
        "slotSpell",
        battleReducerRouteHoles(act.initialHoles),
        "battleSpellSlotAndActionEconomy",
      ),
    ];
  }
  if (saveGatedDiscoveryRoute !== undefined) {
    return nonEmptyRouteEvents([
      ...saveGatedDiscoveryRoute,
      ...passiveDamageAdjustmentRouteForSpellDiscovery(state),
    ]);
  }
  const invocation = spellInvocationForRouteSubject(state, act.subject);
  if (
    act.subject.tag !== "actionSpell" ||
    invocation === undefined ||
    !isSpellAttackProcedure(invocation.procedure)
  ) {
    return undefined;
  }
  const actionOwner =
    invocation.procedure === "spellAttackSequence"
      ? "battleSpellAttackProcedure"
      : invocation.resource.tag === "spellSlot"
        ? "battleSpellSlotAndActionEconomy"
        : "battleActionEconomy";
  const actionEconomyEvent: BattleReducerRouteEvent = discoverBattleActsRoute(
    "spellAttackProcedure",
    invocation.procedure === "spellAttackSequence"
      ? spellAttackSequenceRouteHoles(battleReducerRouteHoles(act.initialHoles))
      : battleReducerRouteHoles(act.initialHoles),
    actionOwner,
  );
  if (invocation.procedure === "spellAttackSequence") {
    return nonEmptyRouteEvents([
      actionEconomyEvent,
      ...passiveDamageAdjustmentRouteForSpellDiscovery(state),
      ...activeFeatureSpellAttackRollModeDiscoveryRouteEvents(
        state,
        act.subject,
        act.initialHoles,
      ),
    ]);
  }
  const hasObjectTargetBoundary = act.initialHoles.some(
    (hole) => hole.kind === "objectTargetChoice",
  );
  if (!hasObjectTargetBoundary) {
    return nonEmptyRouteEvents([
      actionEconomyEvent,
      ...passiveDamageAdjustmentRouteForSpellDiscovery(state),
      ...activeFeatureSpellAttackRollModeDiscoveryRouteEvents(
        state,
        act.subject,
        act.initialHoles,
      ),
    ]);
  }
  return nonEmptyRouteEvents([
    actionEconomyEvent,
    discoverBattleActsRoute(
      "spellAttackProcedure",
      battleReducerRouteHoles(
        act.initialHoles.filter((hole) => hole.kind === "objectTargetChoice"),
      ),
      "battleObjectTargetBoundary",
    ),
    ...passiveDamageAdjustmentRouteForSpellDiscovery(state),
    ...activeFeatureSpellAttackRollModeDiscoveryRouteEvents(
      state,
      act.subject,
      act.initialHoles,
    ),
  ]);
}

function firstApplicableRoute(
  ...routeCandidates: readonly (() => BattleReducerRouteEvents | undefined)[]
): BattleReducerRouteEvents | undefined {
  // Candidate order is route-owner priority. Lazy evaluation preserves the
  // prior short-circuit protocol when one subject matches multiple readers.
  for (const routeCandidate of routeCandidates) {
    const route = routeCandidate();
    if (route !== undefined) {
      return route;
    }
  }
  return undefined;
}

export function battleReducerRouteForResolution(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  const sleepRepeatSaveRoute = sleepRepeatSaveRouteForResolution(input, result);
  const firstExclusiveRoute = firstApplicableRoute(
    () => passiveProjectionRouteForResolution(input, result),
    () => metamagicEffectiveSpellLevelRouteForResolution(input, result),
    () => rollModifierRouteForResolution(input, result),
    () => spellDamageReductionRouteForResolution(input, result),
    () => metamagicSpellComponentProjectionRouteForResolution(input, result),
    () => protectionCharmRouteForResolution(input, result),
    () => wardedTargetInterdictionRouteForResolution(input, result),
    () => scalarBuffRouteForResolution(input, result),
    () => markedDamageAndConditionProtectionRouteForResolution(input, result),
    () =>
      markedDamageRiderAbilityCheckRollModeRouteForResolution(input, result),
    () => rollModifierConcentrationBreakRouteForResolution(input, result),
    () =>
      sleepRepeatSaveRoute !== undefined && !isEndTurnSubject(input.subject)
        ? sleepRepeatSaveRoute
        : undefined,
    () => afterHitSpellEscapeRouteForResolution(input, result),
  );
  if (firstExclusiveRoute !== undefined) {
    return firstExclusiveRoute;
  }
  const repeatSaveConditionEffectRoute =
    repeatSaveConditionEffectRouteForResolution(input, result);
  const deathSavingThrowRoute = deathSavingThrowRouteForResolution(
    input,
    result,
  );
  const turnBoundaryEffectLifecycleRoute =
    turnBoundaryEffectLifecycleRouteForResolution(input, result);
  const conditionImmunityTemporaryHitPointTurnBoundaryRoute =
    conditionImmunityTemporaryHitPointTurnBoundaryRouteForResolution(
      input,
      result,
    );
  const wildShapeLifecycleTurnBoundaryRoute =
    wildShapeLifecycleTurnBoundaryRouteForResolution(input, result);
  const afterHitTurnBoundaryRoute = afterHitSpellTurnBoundaryRouteForResolution(
    input,
    result,
  );
  const markedDamageRiderTurnBoundaryRoute =
    markedDamageRiderTurnBoundaryRouteForResolution(input, result);
  const spellBaseArmorClassTurnBoundaryRoute =
    spellBaseArmorClassEffectTurnBoundaryRouteForResolution(input, result);
  if (
    sleepRepeatSaveRoute !== undefined ||
    repeatSaveConditionEffectRoute !== undefined ||
    deathSavingThrowRoute !== undefined ||
    turnBoundaryEffectLifecycleRoute !== undefined ||
    conditionImmunityTemporaryHitPointTurnBoundaryRoute !== undefined ||
    wildShapeLifecycleTurnBoundaryRoute !== undefined ||
    afterHitTurnBoundaryRoute !== undefined ||
    markedDamageRiderTurnBoundaryRoute !== undefined ||
    spellBaseArmorClassTurnBoundaryRoute !== undefined
  ) {
    return nonEmptyRouteEvents([
      ...(sleepRepeatSaveRoute ?? []),
      ...(repeatSaveConditionEffectRoute ?? []),
      ...(deathSavingThrowRoute ?? []),
      ...(turnBoundaryEffectLifecycleRoute ?? []),
      ...(conditionImmunityTemporaryHitPointTurnBoundaryRoute ?? []),
      ...(wildShapeLifecycleTurnBoundaryRoute ?? []),
      ...(afterHitTurnBoundaryRoute ?? []),
      ...(markedDamageRiderTurnBoundaryRoute ?? []),
      ...(spellBaseArmorClassTurnBoundaryRoute ?? []),
    ]);
  }
  const metamagicSpellDurationProjectionRoute =
    metamagicSpellDurationProjectionRouteForResolution(input, result);
  if (metamagicSpellDurationProjectionRoute !== undefined) {
    return metamagicSpellDurationProjectionRoute;
  }
  const wildShapeLifecycleTerminalRoute =
    wildShapeLifecycleTerminalRouteForResolution(input, result);
  const concentrationRoute = concentrationRouteForResolution(input, result);
  if (concentrationRoute !== undefined) {
    return composeWithWildShapeLifecycleTerminalRoute(
      concentrationRoute,
      wildShapeLifecycleTerminalRoute,
    );
  }
  const commandRoute = commandRouteForResolution(input, result);
  const movementRoute = movementRouteForResolution(input, result);
  if (movementRoute !== undefined) {
    return composeWithWildShapeLifecycleTerminalRoute(
      nonEmptyRouteEvents([
        ...(commandRoute === undefined ? [] : [commandRoute]),
        ...movementRoute,
      ]),
      wildShapeLifecycleTerminalRoute,
    );
  }
  if (commandRoute !== undefined) {
    return composeWithWildShapeLifecycleTerminalRoute(
      [commandRoute],
      wildShapeLifecycleTerminalRoute,
    );
  }
  const wildShapeLifecycleRoute = wildShapeLifecycleRouteForResolution(
    input,
    result,
  );
  if (wildShapeLifecycleRoute !== undefined) {
    return composeWithWildShapeLifecycleTerminalRoute(
      wildShapeLifecycleRoute,
      wildShapeLifecycleTerminalRoute,
    );
  }
  const metamagicRoute = metamagicCastingOptionRouteForResolution(
    input,
    result,
  );
  if (metamagicRoute !== undefined) {
    return composeWithWildShapeLifecycleTerminalRoute(
      metamagicRoute,
      wildShapeLifecycleTerminalRoute,
    );
  }
  const hitPointRestorationRoute = hitPointRestorationRouteForResolution(
    input,
    result,
  );
  if (hitPointRestorationRoute !== undefined) {
    return composeWithWildShapeLifecycleTerminalRoute(
      [hitPointRestorationRoute],
      wildShapeLifecycleTerminalRoute,
    );
  }
  const zeroHitPointStabilizationRoute =
    zeroHitPointStabilizationRouteForResolution(input, result);
  if (zeroHitPointStabilizationRoute !== undefined) {
    return composeWithWildShapeLifecycleTerminalRoute(
      [zeroHitPointStabilizationRoute],
      wildShapeLifecycleTerminalRoute,
    );
  }
  const spellBaseArmorClassRoute = spellBaseArmorClassEffectRouteForResolution(
    input,
    result,
  );
  if (spellBaseArmorClassRoute !== undefined) {
    return composeWithWildShapeLifecycleTerminalRoute(
      spellBaseArmorClassRoute,
      wildShapeLifecycleTerminalRoute,
    );
  }
  const spatialEffectCompositionRoute =
    spatialEffectCompositionRouteForResolution(input, result);
  if (spatialEffectCompositionRoute !== undefined) {
    const saveGatedRoute = saveGatedSpellRouteForResolution(input, result);
    return composeWithWildShapeLifecycleTerminalRoute(
      nonEmptyRouteEvents([
        ...spatialEffectCompositionRoute,
        ...(saveGatedRoute ?? []),
      ]),
      wildShapeLifecycleTerminalRoute,
    );
  }
  const slotSpellRoute = slotSpellRouteForResolution(input, result);
  if (slotSpellRoute !== undefined) {
    return composeWithWildShapeLifecycleTerminalRoute(
      nonEmptyRouteEvents(slotSpellRoute),
      wildShapeLifecycleTerminalRoute,
    );
  }
  const saveGatedRoute = saveGatedSpellRouteForResolution(input, result);
  if (saveGatedRoute !== undefined) {
    return composeWithWildShapeLifecycleTerminalRoute(
      saveGatedRoute,
      wildShapeLifecycleTerminalRoute,
    );
  }
  const weaponSpellRoute = weaponSpellRouteForResolution(input, result);
  if (weaponSpellRoute !== undefined) {
    return composeWithWildShapeLifecycleTerminalRoute(
      weaponSpellRoute,
      wildShapeLifecycleTerminalRoute,
    );
  }
  const attackActionAreaSaveDamageReplacementRoute =
    attackActionAreaSaveDamageReplacementRouteForResolution(input, result);
  if (attackActionAreaSaveDamageReplacementRoute !== undefined) {
    return composeWithWildShapeLifecycleTerminalRoute(
      attackActionAreaSaveDamageReplacementRoute,
      wildShapeLifecycleTerminalRoute,
    );
  }
  const activeFeatureBonusActionRoute =
    activeFeatureBonusActionRouteForResolution(input, result);
  if (activeFeatureBonusActionRoute !== undefined) {
    return composeWithWildShapeLifecycleTerminalRoute(
      activeFeatureBonusActionRoute,
      wildShapeLifecycleTerminalRoute,
    );
  }
  const battleActionRoute = battleActionRouteForResolution(input, result);
  if (battleActionRoute !== undefined) {
    return composeWithWildShapeLifecycleTerminalRoute(
      [battleActionRoute],
      wildShapeLifecycleTerminalRoute,
    );
  }
  const companionRoute = companionRouteForResolution(input, result);
  if (companionRoute !== undefined) {
    return composeWithWildShapeLifecycleTerminalRoute(
      companionRoute,
      wildShapeLifecycleTerminalRoute,
    );
  }
  const interruptResumeDiscoveryRoute =
    interruptStackResumeDiscoveryRouteForResolution(input, result);
  const afterHitSpellDiscoveryRoutes =
    afterHitSpellDiscoveryRoutesForResolution(result);
  const spellDamageReductionAdjustmentDiscoveryRoute =
    spellDamageReductionAdjustmentDiscoveryRouteForResolution(result);
  if (
    interruptResumeDiscoveryRoute !== undefined ||
    afterHitSpellDiscoveryRoutes !== undefined ||
    spellDamageReductionAdjustmentDiscoveryRoute !== undefined
  ) {
    return composeWithWildShapeLifecycleTerminalRoute(
      nonEmptyRouteEvents([
        ...(interruptResumeDiscoveryRoute === undefined
          ? []
          : [interruptResumeDiscoveryRoute]),
        ...(afterHitSpellDiscoveryRoutes ?? []),
        ...(spellDamageReductionAdjustmentDiscoveryRoute === undefined
          ? []
          : [spellDamageReductionAdjustmentDiscoveryRoute]),
      ]),
      wildShapeLifecycleTerminalRoute,
    );
  }
  const spellDamageReductionAdjustmentRoute =
    spellDamageReductionAdjustmentRouteForResolution(input, result);
  if (spellDamageReductionAdjustmentRoute !== undefined) {
    return composeWithWildShapeLifecycleTerminalRoute(
      spellDamageReductionAdjustmentRoute,
      wildShapeLifecycleTerminalRoute,
    );
  }
  const weaponAttackRoute = weaponAttackRouteForResolution(input, result);
  if (weaponAttackRoute !== undefined) {
    return composeWithWildShapeLifecycleTerminalRoute(
      weaponAttackRoute,
      wildShapeLifecycleTerminalRoute,
    );
  }
  const creatureAttackRoute = creatureAttackRouteForResolution(input, result);
  if (creatureAttackRoute !== undefined) {
    return composeWithWildShapeLifecycleTerminalRoute(
      creatureAttackRoute,
      wildShapeLifecycleTerminalRoute,
    );
  }
  const spellAttackRoute = spellAttackProcedureRouteForResolution(
    input,
    result,
  );
  return composeWithWildShapeLifecycleTerminalRoute(
    spellAttackRoute,
    wildShapeLifecycleTerminalRoute,
  );
}

function isZeroHitPointStabilizationSubject(
  state: BattleState,
  subject:
    | BattleResolutionInput["subject"]
    | BattleActDiscoveryCandidate["subject"],
): boolean {
  return (
    subject.tag === "actionSpell" &&
    spellInvocationForRouteSubject(state, subject)?.procedure === "makeStable"
  );
}

function zeroHitPointStabilizationRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvent | undefined {
  if (
    !isZeroHitPointStabilizationSubject(input.state, input.subject) ||
    result.tag !== "resolved"
  ) {
    return undefined;
  }
  const fill = input.fills.at(-1);
  if (fill === undefined || battleFillKind(fill) !== "targetChoice") {
    return undefined;
  }
  return resolveBattleSubjectRoute(
    "zeroHitPointStabilization",
    "targetChoice",
    [],
    "battleHitPointAndZeroHpLifecycle",
  );
}

function isSpellBaseArmorClassEffectSubject(
  state: BattleState,
  subject:
    | BattleResolutionInput["subject"]
    | BattleActDiscoveryCandidate["subject"],
): boolean {
  return (
    subject.tag === "actionSpell" &&
    spellInvocationForRouteSubject(state, subject)?.procedure ===
      "persistentArmorEffect"
  );
}

function spellBaseArmorClassEffectRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvent | undefined {
  if (!isSpellBaseArmorClassEffectSubject(state, act.subject)) {
    return undefined;
  }
  return discoverBattleActsRoute(
    "spellBaseArmorClassEffect",
    battleReducerRouteHoles(act.initialHoles),
    "battleSpellSlotAndActionEconomy",
  );
}

function wardedTargetInterdictionRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvents | undefined {
  if (isSanctuaryTargetingInterdictionSubject(state, act.subject)) {
    return [
      discoverBattleActsRoute(
        "wardedTargetInterdiction",
        ["targetChoice"],
        "battleSpellSlotAndActionEconomy",
      ),
    ];
  }
  if (areaEffectBypassesWardedTargetInterdiction(state, act)) {
    return [
      discoverBattleActsRoute(
        "wardedTargetInterdiction",
        [],
        "battleAreaShape",
      ),
    ];
  }
  return undefined;
}

function wardedTargetInterdictionRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return undefined;
  }
  if (isSanctuaryTargetingInterdictionSubject(input.state, input.subject)) {
    const routeFill = battleReducerRouteFill(fill);
    if (routeFill !== "spellTargetList") {
      return undefined;
    }
    const targetSelectionRoute: BattleReducerRouteEvent =
      resolveBattleSubjectRoute(
        "wardedTargetInterdiction",
        "targetChoice",
        result.tag === "needsHoles"
          ? battleReducerRouteHoles(result.holes)
          : result.tag === "invalid"
            ? ["targetChoice"]
            : [],
        "battleTargetSelection",
      );
    if (
      result.tag !== "resolved" ||
      !activeEffectKindsAdded(input.state, result.state).includes(
        "sanctuaryWard",
      )
    ) {
      return [targetSelectionRoute];
    }
    return [
      targetSelectionRoute,
      wardedTargetInterdictionResolveWithoutFill("battleActiveEffect"),
    ];
  }
  if (fill.kind === "sanctuaryInterdictionOutcome") {
    const replacementTarget =
      !fill.value.saveSucceeded && fill.value.outcome.kind === "newTarget";
    const route: BattleReducerRouteEvent[] = [
      discoverBattleActsRoute(
        "wardedTargetInterdiction",
        replacementTarget
          ? ["sanctuaryInterdictionOutcome", "targetChoice"]
          : ["sanctuaryInterdictionOutcome"],
        "battleActiveEffect",
      ),
      resolveBattleSubjectRoute(
        "wardedTargetInterdiction",
        "sanctuaryInterdictionOutcome",
        replacementTarget ? ["targetChoice"] : [],
        "battleSavingThrowOutcome",
      ),
    ];
    if (replacementTarget) {
      route.push(
        resolveBattleSubjectRoute(
          "wardedTargetInterdiction",
          "targetChoice",
          result.tag === "invalid" ? ["targetChoice"] : [],
          "battleTargetSelection",
        ),
      );
    } else {
      route.push(
        wardedTargetInterdictionResolveWithoutFill(
          fill.value.saveSucceeded
            ? "battleHoleFrontier"
            : "battleActionEconomy",
        ),
      );
    }
    return nonEmptyRouteEvents(route);
  }
  if (areaEffectBypassesWardedTargetInterdiction(input.state, input)) {
    const routeFill = battleReducerRouteFill(fill);
    if (routeFill !== "savingThrowOutcome") {
      return undefined;
    }
    return [wardedTargetInterdictionResolveWithoutFill("battleAreaShape")];
  }
  const actorId = subjectActorId(input.subject);
  if (
    actorId === undefined ||
    !sanctuaryWardRemoved(input.state, result, actorId)
  ) {
    return undefined;
  }
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === "attackRoll") {
    return wardedTargetInterdictionEarlyEndRoute("battleAttackRoll");
  }
  if (routeFill === "rolledDice") {
    return wardedTargetInterdictionEarlyEndRoute("battleHitPoint");
  }
  if (
    (routeFill === "targetChoice" || routeFill === "spellTargetList") &&
    input.subject.tag === "actionSpell"
  ) {
    return wardedTargetInterdictionEarlyEndRoute(
      "battleSpellSlotAndActionEconomy",
    );
  }
  return undefined;
}

function wardedTargetInterdictionEarlyEndRoute(
  owner: Extract<
    BattleReducerRouteOwnerGroup,
    "battleAttackRoll" | "battleHitPoint" | "battleSpellSlotAndActionEconomy"
  >,
): BattleReducerRouteEvents {
  return [
    discoverBattleActsRoute(
      "wardedTargetInterdiction",
      [],
      "battleActiveEffect",
    ),
    wardedTargetInterdictionResolveWithoutFill(owner),
    wardedTargetInterdictionResolveWithoutFill("battleActiveEffect"),
  ];
}

function wardedTargetInterdictionResolveWithoutFill(
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectWithoutFillRoute(
    "wardedTargetInterdiction",
    [],
    owner,
  );
}

function sanctuaryWardRemoved(
  state: BattleState,
  result: BattleResolutionResult,
  actorId: CombatantId,
): boolean {
  if (result.tag !== "needsHoles" && result.tag !== "resolved") {
    return false;
  }
  return (
    combatantHasSanctuaryWard(state, actorId) &&
    !combatantHasSanctuaryWard(result.state, actorId)
  );
}

function areaEffectBypassesWardedTargetInterdiction(
  state: BattleState,
  source:
    | Pick<BattleActDiscoveryCandidate, "subject" | "initialHoles">
    | Pick<BattleResolutionInput, "subject" | "fills">,
): boolean {
  if (
    source.subject.tag !== "actionSpell" ||
    spellInvocationForRouteSubject(state, source.subject)?.procedure !==
      "saveGatedDamage"
  ) {
    return false;
  }
  if (!battleHasSanctuaryWard(state)) {
    return false;
  }
  if ("initialHoles" in source) {
    const hasDirectTargetHole = source.initialHoles.some((hole) => {
      const family = battleHoleFamilyKind(hole);
      return (
        family === "targetChoice" ||
        family === "spellTargetList" ||
        family === "objectTargetChoice"
      );
    });
    const savingThrowHole = source.initialHoles.find(
      (
        hole,
      ): hole is Extract<BattleHole, { readonly kind: "savingThrowOutcome" }> =>
        hole.kind === "savingThrowOutcome",
    );
    return (
      !hasDirectTargetHole &&
      savingThrowHole !== undefined &&
      (!("areaChoices" in savingThrowHole) ||
        savingThrowHole.areaChoices.some((areaChoice) =>
          areaChoice.affectedTargetIds.some((targetId) =>
            combatantHasSanctuaryWard(state, targetId),
          ),
        ))
    );
  }
  if (
    source.fills.some((fill) => {
      const kind = battleFillKind(fill);
      return (
        kind === "targetChoice" ||
        kind === "spellTargetList" ||
        kind === "objectTargetChoice"
      );
    })
  ) {
    return false;
  }
  const savingThrowFill = source.fills.find(
    (
      fill,
    ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
      fill.kind === "savingThrowOutcome",
  );
  if (savingThrowFill === undefined) {
    return false;
  }
  const affectedTargetIds =
    "area" in savingThrowFill.value
      ? savingThrowFill.value.area.affectedTargetIds
      : savingThrowFill.value.outcomes.map((outcome) => outcome.targetId);
  return affectedTargetIds.some((targetId) =>
    combatantHasSanctuaryWard(state, targetId),
  );
}

function battleHasSanctuaryWard(state: BattleState): boolean {
  for (const combatant of state.combatants.values()) {
    if (combatantHasSanctuaryWard(state, combatant.combatantId)) {
      return true;
    }
  }
  return false;
}

function combatantHasSanctuaryWard(
  state: BattleState,
  combatantId: CombatantId,
): boolean {
  return (
    state.combatants
      .get(combatantId)
      ?.activeEffects.some((effect) => effect.kind === "sanctuaryWard") ?? false
  );
}

function subjectActorId(
  subject: BattleResolutionInput["subject"],
): CombatantId | undefined {
  return "actorId" in subject ? subject.actorId : undefined;
}

function spellBaseArmorClassEffectRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (!isSpellBaseArmorClassEffectSubject(input.state, input.subject)) {
    return undefined;
  }
  const fill = input.fills.at(-1);
  if (fill === undefined || battleReducerRouteFill(fill) !== "targetChoice") {
    return undefined;
  }
  const holes: readonly BattleReducerRouteHole[] =
    result.tag === "invalid" && result.reason === "invalidFill"
      ? ["targetChoice"]
      : result.tag === "needsHoles"
        ? battleReducerRouteHoles(result.holes)
        : [];
  const targetSelectionRoute: BattleReducerRouteEvent =
    resolveBattleSubjectRoute(
      "spellBaseArmorClassEffect",
      "targetChoice",
      holes,
      "battleTargetSelection",
    );
  if (
    result.tag !== "resolved" ||
    !spellBaseArmorClassEffectWasAdded(input.state, result.state)
  ) {
    return [targetSelectionRoute];
  }
  return [
    targetSelectionRoute,
    spellBaseArmorClassEffectResolveWithoutFill("battleActiveEffect"),
    spellBaseArmorClassEffectResolveWithoutFill("battleArmorClass"),
  ];
}

function spellBaseArmorClassEffectResolveWithoutFill(
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectWithoutFillRoute(
    "spellBaseArmorClassEffect",
    [],
    owner,
  );
}

function spellBaseArmorClassEffectWasAdded(
  before: BattleState,
  after: BattleState,
): boolean {
  return [...after.combatants.values()].some(
    (combatant) =>
      spellBaseArmorClassEffectCount(combatant.activeEffects) >
      spellBaseArmorClassEffectCount(
        before.combatants.get(combatant.combatantId)?.activeEffects ?? [],
      ),
  );
}

function spellBaseArmorClassEffectExpired(
  before: BattleState,
  after: BattleState,
): boolean {
  return [...before.combatants.values()].some(
    (combatant) =>
      spellBaseArmorClassEffectCount(combatant.activeEffects) >
      spellBaseArmorClassEffectCount(
        after.combatants.get(combatant.combatantId)?.activeEffects ?? [],
      ),
  );
}

function spellBaseArmorClassEffectCount(
  activeEffects: readonly BattleActiveEffect[],
): number {
  return activeEffects.filter((effect) => effect.kind === "spellBaseArmorClass")
    .length;
}

function spellAttackProcedureRouteForResolution(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  const invocation = spellInvocationForRouteSubject(input.state, input.subject);
  if (
    input.subject.tag !== "actionSpell" ||
    invocation === undefined ||
    !isSpellAttackProcedure(invocation.procedure)
  ) {
    return undefined;
  }
  const objectTargetRoute = objectTargetSpellAttackRouteForResolution(
    input,
    result,
  );
  if (objectTargetRoute !== undefined) {
    return objectTargetRoute;
  }
  if (result.tag === "invalid") {
    if (result.reason === "staleSubject") {
      return [
        resolveBattleSubjectWithoutFillRoute(
          "spellAttackProcedure",
          [],
          "battleHoleFrontier",
        ),
      ];
    }
    return undefined;
  }
  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return undefined;
  }
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === undefined) {
    return undefined;
  }
  const holes = spellAttackProcedureRouteHoles(input, result);
  const [firstOwner, ...remainingOwners] = spellAttackProcedureRouteOwners({
    input,
    fill,
    result,
  });
  if (firstOwner === undefined) {
    return undefined;
  }
  const eventForOwner = (
    owner: BattleReducerRouteOwnerGroup,
  ): BattleReducerRouteEvent =>
    resolveBattleSubjectRoute("spellAttackProcedure", routeFill, holes, owner);
  return [
    eventForOwner(firstOwner),
    ...remainingOwners.map(eventForOwner),
    ...passiveDamageAdjustmentRouteForSpellDamageResolution(input, result),
    ...activeFeatureSpellAttackRollModeResolutionRouteEvents(input, result),
    ...spellAttackHitActiveEffectAdmissionRouteForResolution(input, result),
    ...zeroHitPointSpellEffectTeardownRouteForResolution(input, fill, result),
    ...(markedDamageRiderTransferRouteForResolution({
      state: input.state,
      result,
      holes,
    }) ?? []),
  ];
}

function objectTargetSpellAttackRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return undefined;
  }
  const hasObjectTarget = input.fills.some(
    (candidate) => battleFillKind(candidate) === "objectTargetChoice",
  );
  const fillKind = battleFillKind(fill);
  if (fillKind === "objectTargetChoice") {
    return [
      resolveBattleSubjectWithoutFillRoute(
        "objectTargetSpellAttack",
        result.tag === "needsHoles"
          ? battleReducerRouteHoles(result.holes)
          : [],
        "battleObjectTargetBoundary",
      ),
    ];
  }
  if (!hasObjectTarget) {
    return undefined;
  }
  if (result.tag === "invalid") {
    return result.reason === "staleSubject"
      ? [
          resolveBattleSubjectWithoutFillRoute(
            "objectTargetSpellAttack",
            [],
            "battleHoleFrontier",
          ),
        ]
      : undefined;
  }
  if (fillKind === "attackRoll") {
    return [
      resolveBattleSubjectRoute(
        "objectTargetSpellAttack",
        "attackRoll",
        result.tag === "needsHoles"
          ? battleReducerRouteHoles(result.holes)
          : [],
        "battleAttackRoll",
      ),
    ];
  }
  if (fillKind !== "rolledDice") {
    return undefined;
  }
  const route: BattleReducerRouteEvent[] = [
    resolveBattleSubjectRoute(
      "objectTargetSpellAttack",
      "rolledDice",
      result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [],
      "battleObjectTargetBoundary",
    ),
  ];
  if (
    result.tag === "resolved" &&
    objectInvisibleRevealLightEmitterWasAdded(input.state, result.state)
  ) {
    route.push(
      resolveBattleSubjectWithoutFillRoute(
        "objectTargetSpellAttack",
        [],
        "battleActiveEffect",
      ),
    );
  }
  return nonEmptyRouteEvents(route);
}

function objectInvisibleRevealLightEmitterWasAdded(
  before: BattleState,
  after: BattleState,
): boolean {
  const beforeCount = battleLightEmitters(before).filter(
    (emitter) => emitter.kind === "objectInvisibleRevealLightEmitter",
  ).length;
  return (
    battleLightEmitters(after).filter(
      (emitter) => emitter.kind === "objectInvisibleRevealLightEmitter",
    ).length > beforeCount
  );
}

export function battleReducerRouteForInterrupt(
  before: BattleState,
  fill: Extract<BattleFill, { readonly kind: "interruptDecision" }>,
  result: BattleResolutionResult,
): BattleReducerRouteEvents {
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  const reactionSpellRoute = reactionSpellRouteForInterrupt({
    before,
    fill,
    holes,
    result,
  });
  if (reactionSpellRoute !== undefined) {
    return reactionSpellRoute;
  }
  const afterHitSpellRoute = afterHitSpellRouteForInterrupt({
    before,
    fill,
    holes,
    result,
  });
  if (afterHitSpellRoute !== undefined) {
    return afterHitSpellRoute;
  }
  const eventForOwner = (
    owner: BattleReducerRouteOwnerGroup,
  ): BattleReducerRouteEvent =>
    resolveBattleInterruptRoute(
      "interruptStackResume",
      "interruptDecision",
      holes,
      owner,
    );
  if (
    result.tag === "resolved" &&
    interruptResolutionAddedArmorClassEffect(before, result)
  ) {
    return [
      eventForOwner("battleSpellSlotAndActionEconomy"),
      eventForOwner("battleActiveEffect"),
      eventForOwner("battleInterruptStack"),
    ];
  }
  return [eventForOwner("battleInterruptStack")];
}

export function battleReducerRouteForCreatureFallsInterruptWindow(
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (result.tag !== "needsHoles") {
    return undefined;
  }
  const holes = battleReducerRouteHoles(result.holes);
  if (!holes.includes("interruptDecision")) {
    return undefined;
  }
  return [
    discoverBattleActsRoute(
      "reactionSpell",
      ["interruptDecision"],
      "battleInterruptStack",
    ),
    discoverBattleActsRoute(
      "reactionFallMitigation",
      ["interruptDecision"],
      "battleInterruptStack",
    ),
  ];
}

export function battleReducerRouteForFeatherFallLanding(
  result: BattleFeatherFallLandingResult,
): BattleReducerRouteEvents | undefined {
  if (result.tag !== "mitigated") {
    return undefined;
  }
  return [
    spatialCompositionResolveWithoutFill(
      "reactionFallMitigation",
      "battleActiveEffect",
    ),
    spatialCompositionResolveWithoutFill(
      "reactionFallMitigation",
      "battleMovementResource",
    ),
    spatialCompositionResolveWithoutFill(
      "reactionFallMitigation",
      "battleHitPoint",
    ),
  ];
}

function isUnitFeatureBonusActionRouteSubject(
  state: BattleState,
  subject:
    | BattleResolutionInput["subject"]
    | BattleActDiscoveryCandidate["subject"],
): boolean {
  if (subject.tag !== "unitFeature") {
    return false;
  }
  const actor = state.combatants.get(subject.actorId);
  if (!isCharacterBattleCreatureState(actor)) {
    return false;
  }
  const procedure = characterUnitProcedure(
    actor.origin.execution,
    subject.procedureRef,
    CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  );
  return (
    procedure?.kind === "unitFeature" &&
    procedure.execution.kind === "ongoingFeature" &&
    procedure.execution.activationTrigger === "bonusAction"
  );
}

function activeFeatureBonusActionRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    result.tag !== "resolved" ||
    input.fills.length !== 0 ||
    !isUnitFeatureBonusActionRouteSubject(input.state, input.subject)
  ) {
    return undefined;
  }
  return [
    resolveBattleSubjectWithoutFillRoute(
      "unitFeatureBonusAction",
      [],
      "battleActionEconomy",
    ),
    resolveBattleSubjectWithoutFillRoute(
      "unitFeatureBonusAction",
      [],
      "battleFeatureResource",
    ),
    resolveBattleSubjectWithoutFillRoute(
      "unitFeatureBonusAction",
      [],
      "battleActiveEffect",
    ),
  ];
}

function hasActiveFeatureSpellSaveDcModifier(
  state: BattleState,
  casterId: CombatantId,
): boolean {
  return activeFeatureSpellModifierExists(
    state,
    casterId,
    (modifier) => modifier.saveDcBonus !== 0,
  );
}

function hasActiveFeatureSpellAttackRollModeModifier(
  state: BattleState,
  casterId: CombatantId,
): boolean {
  return activeFeatureSpellModifierExists(
    state,
    casterId,
    (modifier) => modifier.attackRollMode !== undefined,
  );
}

function activeFeatureSpellModifierExists(
  state: BattleState,
  casterId: CombatantId,
  predicate: (
    modifier: ReturnType<typeof activeFeatureSpellModifiers>[number],
  ) => boolean,
): boolean {
  const caster = state.combatants.get(casterId);
  return activeFeatureSpellModifiers(state, caster).some(predicate);
}

function activeFeatureSpellModifiers(
  state: BattleState,
  caster: BattleCreatureState | undefined,
) {
  if (!isCharacterBattleCreatureState(caster)) {
    return [];
  }
  return [
    ...activeOngoingFeatureOccurrencesForCombatant(state, caster),
  ].flatMap(
    ([key]) =>
      ongoingFeatureProfileForSourceKey(caster, key)?.spellModifiers ?? [],
  );
}

function activeFeatureSpellAttackRollModeDiscoveryRouteEvents(
  state: BattleState,
  subject: Extract<
    BattleResolutionInput["subject"],
    { readonly tag: "actionSpell" }
  >,
  initialHoles: readonly BattleHole[],
): readonly BattleReducerRouteEvent[] {
  if (!hasActiveFeatureSpellAttackRollModeModifier(state, subject.actorId)) {
    return [];
  }
  const holes = battleReducerRouteHoles(initialHoles);
  if (!holes.includes("targetChoice")) {
    return [];
  }
  return [
    discoverBattleActsRoute(
      "activeFeatureSpellAttackRollMode",
      ["targetChoice"],
      "battleSpellSlotAndActionEconomy",
    ),
  ];
}

function activeFeatureSpellAttackRollModeResolutionRouteEvents(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): readonly BattleReducerRouteEvent[] {
  if (
    input.subject.tag !== "actionSpell" ||
    !hasActiveFeatureSpellAttackRollModeModifier(
      input.state,
      input.subject.actorId,
    )
  ) {
    return [];
  }
  const fill = input.fills.at(-1);
  if (fill?.kind !== "targetChoice" || result.tag !== "needsHoles") {
    return [];
  }
  const holes = battleReducerRouteHoles(result.holes);
  if (!holes.includes("attackRoll")) {
    return [];
  }
  return [
    resolveBattleSubjectRoute(
      "activeFeatureSpellAttackRollMode",
      "targetChoice",
      ["attackRoll"],
      "battleTargetSelection",
    ),
    resolveBattleSubjectWithoutFillRoute(
      "activeFeatureSpellAttackRollMode",
      ["attackRoll"],
      "battleActiveEffect",
    ),
    resolveBattleSubjectWithoutFillRoute(
      "activeFeatureSpellAttackRollMode",
      ["attackRoll"],
      "battleSpellAttackProcedure",
    ),
  ];
}

function attackActionAreaSaveDamageReplacementRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvent | undefined {
  if (!isAttackActionAreaSaveDamageReplacementSubject(state, act.subject)) {
    return undefined;
  }
  return discoverBattleActsRoute(
    "attackActionAreaSaveDamageReplacement",
    battleReducerRouteHoles(act.initialHoles),
    "battleFeatureResource",
  );
}

function attackActionAreaSaveDamageReplacementRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    !isAttackActionAreaSaveDamageReplacementSubject(input.state, input.subject)
  ) {
    return undefined;
  }

  const fill = input.fills.at(-1);
  if (fill === undefined) {
    if (result.tag !== "invalid") {
      return undefined;
    }
    return [
      attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
        [],
        "battleFeatureResource",
      ),
    ];
  }

  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === "savingThrowOutcome") {
    if (result.tag === "invalid") {
      return [
        attackActionAreaSaveDamageReplacementResolveRoute(
          "savingThrowOutcome",
          ["savingThrowOutcome"],
          "battleAreaShape",
        ),
      ];
    }

    const holes =
      result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
    return [
      attackActionAreaSaveDamageReplacementResolveRoute(
        "savingThrowOutcome",
        holes,
        "battleAreaShape",
      ),
      attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
        holes,
        "battleSavingThrowOutcome",
      ),
      attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
        holes,
        "battleDamageType",
      ),
    ];
  }

  if (routeFill !== "rolledDice") {
    return undefined;
  }
  if (result.tag === "invalid") {
    return [
      attackActionAreaSaveDamageReplacementResolveRoute(
        "rolledDice",
        ["rolledDice"],
        "battleDamageRoll",
      ),
    ];
  }
  if (result.tag !== "resolved") {
    return undefined;
  }

  const tail = result.state.currentTurnResources.actionResources.some(
    (resource) =>
      resource.source === "classFeatureExtraAttack" &&
      resource.sourceOwnerId === input.subject.actorId,
  )
    ? [
        discoverBattleActsRoute(
          "weaponAttack" as const,
          ["targetChoice"] as const,
          "battleAttackActionProcedure" as const,
        ),
      ]
    : [
        attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
          [],
          "battleAttackActionProcedure",
        ),
      ];
  return [
    attackActionAreaSaveDamageReplacementResolveRoute(
      "rolledDice",
      [],
      "battleDamageRoll",
    ),
    attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
      [],
      "battleHitPoint",
    ),
    attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
      [],
      "battleFeatureResource",
    ),
    ...tail,
  ];
}

function attackActionAreaSaveDamageReplacementResolveRoute(
  fill: BattleReducerRouteFillKind,
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectRoute(
    "attackActionAreaSaveDamageReplacement",
    fill,
    holes,
    owner,
  );
}

function attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectWithoutFillRoute(
    "attackActionAreaSaveDamageReplacement",
    holes,
    owner,
  );
}

function isAttackActionAreaSaveDamageReplacementSubject(
  state: BattleState,
  subject:
    | BattleResolutionInput["subject"]
    | BattleActDiscoveryCandidate["subject"],
): boolean {
  if (subject.tag !== "unitFeature") {
    return false;
  }
  const actor = state.combatants.get(subject.actorId);
  if (actor?.origin.kind !== "character") {
    return false;
  }
  const procedure = characterUnitProcedure(
    actor.origin.execution,
    subject.procedureRef,
    CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  );
  return procedure?.kind === "unitFeature"
    ? procedure.execution.kind === "attackActionAreaSaveDamageReplacement"
    : procedure?.kind === "unitSupportProfile" &&
        unitSupportProfileKind(procedure.execution) ===
          "attackActionAreaSaveDamageReplacement";
}

function isConditionImmunityTemporaryHitPointConcentrationTeardownSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): boolean {
  if (
    subject.tag !== "runtimeCommand" ||
    subject.command !== "endConcentration"
  ) {
    return false;
  }
  const actor = state.combatants.get(subject.actorId);
  const concentration = actor?.concentration ?? null;
  if (concentration === null) {
    return false;
  }
  return [...state.combatants.values()].some((combatant) =>
    combatant.activeEffects.some(
      (effect) =>
        (effect.kind === "conditionImmunity" ||
          effect.kind === "turnStartTemporaryHitPoints") &&
        effect.sourceProcedureRef === concentration.sourceProcedureRef &&
        effect.sourceCombatantId === subject.actorId,
    ),
  );
}

function deathSavingThrowRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (!isEndTurnSubject(input.subject)) {
    return undefined;
  }

  const deathSavingThrowFill = input.fills.find(
    (fill) => fill.kind === "deathSavingThrow",
  );
  if (deathSavingThrowFill !== undefined) {
    if (result.tag === "invalid" && result.reason !== "wrongActor") {
      return undefined;
    }
    return nonEmptyRouteEvents([
      resolveBattleSubjectRoute(
        "deathSavingThrow",
        "deathSavingThrow",
        result.tag === "needsHoles"
          ? deathSavingThrowRouteHoles(result.holes)
          : [],
        "battleHitPointAndZeroHpLifecycle",
      ),
    ]);
  }

  if (
    result.tag !== "needsHoles" ||
    !deathSavingThrowRouteHoles(result.holes).includes("deathSavingThrow")
  ) {
    return undefined;
  }

  return nonEmptyRouteEvents([
    discoverBattleActsRoute(
      "deathSavingThrow",
      deathSavingThrowRouteHoles(result.holes),
      "battleHitPointAndZeroHpLifecycle",
    ),
  ]);
}

function deathSavingThrowRouteHoles(
  holes: readonly BattleHole[],
): readonly BattleReducerRouteHole[] {
  return battleReducerRouteHoles(
    holes.filter((hole) => hole.kind === "deathSavingThrow"),
  );
}

function concentrationRouteForResolution(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (!isConcentrationTeardownSubject(input.state, input.subject)) {
    return undefined;
  }
  if (result.tag === "invalid") {
    return undefined;
  }

  const afterHitSavingThrowCompletionRoute =
    afterHitSpellSavingThrowCompletionRoutes({
      state: input.state,
      fills: input.fills
        .map(battleReducerRouteFill)
        .filter((fill): fill is BattleReducerRouteFill => fill !== undefined),
    });
  if (afterHitSavingThrowCompletionRoute !== undefined) {
    return afterHitSavingThrowCompletionRoute;
  }

  const fill = input.fills.at(-1);
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  if (fill === undefined) {
    if (input.subject.tag === "actionSpell") {
      const priorConcentration =
        input.state.combatants.get(input.subject.actorId)?.concentration ??
        null;
      const castRoute: BattleReducerRouteEvents = [
        resolveBattleSubjectWithoutFillRoute(
          "concentrationTeardown",
          holes,
          "battleActiveEffect",
        ),
        resolveBattleSubjectWithoutFillRoute(
          "concentrationTeardown",
          holes,
          "battleConcentration",
        ),
      ];
      if (priorConcentration === null) {
        return castRoute;
      }
      return [
        resolveBattleSubjectWithoutFillRoute(
          "concentrationTeardown",
          holes,
          "battleConcentration",
        ),
        resolveBattleSubjectWithoutFillRoute(
          "concentrationTeardown",
          holes,
          "battleActiveEffect",
        ),
        ...castRoute,
      ];
    }
    if (
      input.subject.tag === "runtimeCommand" &&
      input.subject.command === "endConcentration"
    ) {
      const afterHitRoutes =
        afterHitSpellConcentrationTeardownRoutes({
          state: input.state,
          subject: input.subject,
          holes,
        }) ?? [];
      const conditionImmunityRoutes =
        isConditionImmunityTemporaryHitPointConcentrationTeardownSubject(
          input.state,
          input.subject,
        )
          ? [
              markedDamageAndConditionProtectionResolveWithoutFillRoute(
                "conditionImmunityTemporaryHitPointEffect",
                holes,
                "battleConcentration",
              ),
              markedDamageAndConditionProtectionResolveWithoutFillRoute(
                "conditionImmunityTemporaryHitPointEffect",
                holes,
                "battleActiveEffect",
              ),
            ]
          : [];
      const markedDamageRiderRoutes = battleCombatantHasActiveEffectKind(
        input.state,
        input.subject.actorId,
        "spellMarkedDamageRider",
      )
        ? [
            markedDamageAndConditionProtectionResolveWithoutFillRoute(
              "markedDamageRiderEffect",
              holes,
              "battleConcentration",
            ),
            markedDamageAndConditionProtectionResolveWithoutFillRoute(
              "markedDamageRiderEffect",
              holes,
              "battleActiveEffect",
            ),
          ]
        : [];
      const spatialHazardCleanupRoutes =
        battleCombatantHasActiveEffectKind(
          input.state,
          input.subject.actorId,
          "spikeGrowthHazard",
        ) ||
        battleCombatantHasActiveEffectKind(
          input.state,
          input.subject.actorId,
          "webRestraintHazard",
        )
          ? [
              spatialCompositionResolveWithoutFill(
                "spatialEffect",
                "battleConcentration",
              ),
              spatialCompositionResolveWithoutFill(
                "spatialEffect",
                "battleAreaHazard",
              ),
              spatialCompositionResolveWithoutFill(
                "spatialEffect",
                "battleActiveEffect",
              ),
            ]
          : [];
      return [
        resolveBattleSubjectWithoutFillRoute(
          "concentrationTeardown",
          holes,
          "battleConcentration",
        ),
        resolveBattleSubjectWithoutFillRoute(
          "concentrationTeardown",
          holes,
          "battleActiveEffect",
        ),
        ...afterHitRoutes,
        ...conditionImmunityRoutes,
        ...markedDamageRiderRoutes,
        ...spatialHazardCleanupRoutes,
      ];
    }
    return undefined;
  }

  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === undefined) {
    return undefined;
  }
  if (routeFill === "concentrationSavingThrow") {
    const concentrationEvent: BattleReducerRouteEvent =
      resolveBattleSubjectRoute(
        "concentrationTeardown",
        routeFill,
        holes,
        "battleConcentration",
      );
    return result.tag === "resolved"
      ? [
          concentrationEvent,
          resolveBattleSubjectWithoutFillRoute(
            "concentrationTeardown",
            [],
            "battleActiveEffect",
          ),
        ]
      : [concentrationEvent];
  }
  if (
    routeFill === "rolledDice" &&
    battleReducerRouteHoles(
      result.tag === "needsHoles" ? result.holes : [],
    ).includes("concentrationSavingThrow")
  ) {
    return [
      resolveBattleSubjectRoute(
        "concentrationTeardown",
        routeFill,
        holes,
        "battleConcentration",
      ),
    ];
  }
  return undefined;
}

function hitPointRestorationRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvent | undefined {
  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return undefined;
  }
  if (!isHitPointRestorationResolution(input.state, input.subject, fill)) {
    return undefined;
  }
  if (result.tag === "invalid" && result.reason !== "invalidFill") {
    return undefined;
  }

  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === undefined) {
    return undefined;
  }

  return resolveBattleSubjectRoute(
    "hitPointRestoration",
    routeFill,
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [],
    hitPointRestorationRouteOwner(routeFill, result),
  );
}

function hitPointRestorationRouteOwner(
  fill: BattleReducerRouteFill,
  result: BattleResolutionResult,
): BattleReducerRouteOwnerGroup {
  if (fill === "rolledDice" && result.tag === "resolved") {
    return "battleHitPointAndZeroHpLifecycle";
  }
  if (fill === "hitPointHealingDistribution") {
    return "battleHitPointAndZeroHpLifecycle";
  }
  return "battleHoleFrontier";
}

function slotSpellRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): readonly BattleReducerRouteEvent[] | undefined {
  if (!isSlotSpellResolutionSubject(input.state, input.subject)) {
    return undefined;
  }
  if (result.tag === "invalid" && result.reason !== "invalidFill") {
    return undefined;
  }

  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return undefined;
  }

  const routeFill = battleReducerRouteFill(fill);
  if (routeFill !== "spellTargetAllocation" && routeFill !== "rolledDice") {
    return undefined;
  }

  const routeEvent: BattleReducerRouteEvent = resolveBattleSubjectRoute(
    "slotSpell",
    routeFill,
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [],
    routeFill === "rolledDice" && result.tag === "resolved"
      ? "battleHitPoint"
      : "battleHoleFrontier",
  );
  return [
    routeEvent,
    ...(input.state.interruptStack.at(-1)?.kind === "replayContinuation" &&
    routeFill === "rolledDice" &&
    result.tag === "resolved"
      ? [
          resolveBattleSubjectWithoutFillRoute(
            "reactionSpellInterruption" as const,
            [],
            "battleInterruptStack" as const,
          ),
        ]
      : []),
  ];
}

function commandRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvent | undefined {
  if (!isCommandEffectSubject(input.state, input.subject)) {
    return undefined;
  }
  if (result.tag === "invalid" && result.reason !== "invalidFill") {
    return undefined;
  }

  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return commandRouteWithoutFill(input);
  }

  const routeFill = commandRouteFill(fill);
  if (routeFill === undefined) {
    return commandRouteWithoutFill(input);
  }

  return resolveBattleSubjectRoute(
    "commandEffect",
    routeFill,
    commandRouteHolesAfter(input, result),
    commandRouteOwner(input, result, routeFill),
  );
}

function commandRouteWithoutFill(
  input: BattleResolutionInput,
): BattleReducerRouteEvent | undefined {
  const owner = commandRouteOwnerWithoutFill(input);
  return owner === undefined
    ? undefined
    : resolveBattleSubjectWithoutFillRoute("commandEffect", [], owner);
}

function commandRouteOwnerWithoutFill(
  input: BattleResolutionInput,
): BattleReducerRouteOwnerGroup | undefined {
  const subject = input.subject;
  if (subject.tag !== "runtimeCommand") {
    return undefined;
  }
  if (subject.command === "commandGrovel") {
    return "battleConditionLifecycle";
  }
  if (subject.command === "commandDrop") {
    return "battleActiveEffect";
  }
  if (
    subject.command === "commandApproach" ||
    subject.command === "commandFlee"
  ) {
    return "battleMovementResource";
  }
  if (
    subject.command === "endTurn" &&
    input.state.currentTurnResources.commandHalt !== null
  ) {
    return "battleActiveEffect";
  }
  return undefined;
}

function commandRouteOwner(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
  fill: BattleReducerRouteFill,
): BattleReducerRouteOwnerGroup {
  if (input.subject.tag === "actionSpell") {
    if (fill === "savingThrowOutcome" && result.tag === "resolved") {
      return "battleActiveEffect";
    }
    return "battleHoleFrontier";
  }
  if (input.subject.tag === "runtimeCommand") {
    if (input.subject.command === "commandFlee" && result.tag === "invalid") {
      return "battleHoleFrontier";
    }
    if (
      fill === "movement" &&
      result.tag === "needsHoles" &&
      battleReducerRouteHoles(result.holes).includes("interruptDecision")
    ) {
      return "battleInterruptStack";
    }
    if (
      input.subject.command === "commandApproach" ||
      input.subject.command === "commandFlee"
    ) {
      return "battleMovementResource";
    }
  }
  return "battleActiveEffect";
}

function saveGatedSpellRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (!isSaveGatedSpellResolution(input)) {
    return undefined;
  }
  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return undefined;
  }
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === undefined) {
    return undefined;
  }
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  const owner = saveGatedSpellRouteOwner(routeFill);
  if (owner === undefined) {
    return undefined;
  }
  const primaryRoute: BattleReducerRouteEvent = resolveBattleSubjectRoute(
    "saveGatedSpell",
    routeFill,
    holes,
    owner,
  );
  if (result.tag !== "needsHoles") {
    return [primaryRoute];
  }
  if (
    !holes.includes("interruptDecision") ||
    routeFill !== "savingThrowOutcome"
  ) {
    return [primaryRoute];
  }

  return [
    primaryRoute,
    resolveBattleSubjectRoute(
      "saveGatedSpell",
      routeFill,
      holes,
      "battleInterruptStack",
    ),
  ];
}

function saveGatedSpellRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvents | undefined {
  const invocation = spellInvocationForRouteSubject(state, act.subject);
  if (
    act.subject.tag !== "actionSpell" ||
    invocation === undefined ||
    !isSaveGatedSpellProcedure(invocation.procedure)
  ) {
    return undefined;
  }
  return [
    discoverBattleActsRoute(
      "saveGatedSpell",
      battleReducerRouteHoles(act.initialHoles),
      invocation.resource.tag === "spellSlot"
        ? "battleSpellSlotAndActionEconomy"
        : "battleActionEconomy",
    ),
  ];
}

function saveGatedSpellRouteOwner(
  fill: BattleReducerRouteFill,
): BattleReducerRouteOwnerGroup | undefined {
  if (fill === "targetChoice") {
    return "battleTargetSelection";
  }
  if (fill === "spellTargetList") {
    return "battleHoleFrontier";
  }
  if (fill === "savingThrowOutcome") {
    return "battleHoleFrontier";
  }
  if (fill === "rolledDice") {
    return "battleHitPoint";
  }
  return undefined;
}

function spatialEffectCompositionRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvent | undefined {
  if (
    act.subject.tag !== "actionSpell" &&
    act.subject.tag !== "bonusActionSpell"
  ) {
    return undefined;
  }
  const invocation = spellInvocationForRouteSubject(state, act.subject);
  if (invocation === undefined) {
    return undefined;
  }
  if (isObjectLightDiscoverySubject(invocation)) {
    return spatialCompositionDiscover(
      "objectLightRider",
      ["targetChoice"],
      "battleSpellSlotAndActionEconomy",
    );
  }
  if (!isSpatialEffectCompositionDiscoverySubject(invocation)) {
    return undefined;
  }
  return spatialCompositionDiscover(
    "spatialEffect",
    spatialEffectCompositionDiscoveryHoles(invocation),
    "battleSpellSlotAndActionEconomy",
  );
}

function spatialEffectCompositionRuntimeRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvent | undefined {
  if (act.subject.tag !== "runtimeCommand") {
    return undefined;
  }
  if (
    act.subject.command === "move" &&
    battleHasActiveAreaDifficultTerrainHazard(state)
  ) {
    return spatialCompositionDiscover(
      "spatialEffect",
      ["movement"],
      "battleAreaHazard",
    );
  }
  if (act.subject.command === "greaseGroundHazardSave") {
    return spatialCompositionDiscover(
      "spatialEffect",
      ["savingThrowOutcome"],
      "battleAreaHazard",
    );
  }
  if (act.subject.command === "movableZoneSave") {
    return spatialCompositionDiscover(
      "spatialEffect",
      ["savingThrowOutcome"],
      "battleAreaHazard",
    );
  }
  if (act.subject.command === "webRestraintSave") {
    return spatialCompositionDiscover(
      "spatialEffect",
      ["savingThrowOutcome"],
      "battleAreaHazard",
    );
  }
  if (act.subject.command === "jumpMovementReplacement") {
    return spatialCompositionDiscover(
      "movementPresentation",
      ["movement"],
      "battleMovementResource",
    );
  }
  return undefined;
}

function spatialEffectCompositionRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (result.tag === "invalid") {
    return undefined;
  }
  if (input.subject.tag === "runtimeCommand") {
    return spatialEffectCompositionRuntimeRouteForResolution(input, result);
  }
  if (
    input.subject.tag !== "actionSpell" &&
    input.subject.tag !== "bonusActionSpell"
  ) {
    return undefined;
  }
  const procedure = spellInvocationForRouteSubject(
    input.state,
    input.subject,
  )?.procedure;
  if (
    procedure === "dancingLightsSeparateCast" ||
    procedure === "dancingLightsCombinedCast"
  ) {
    return [
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleActiveEffect",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleConcentration",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleLightProjection",
      ),
    ];
  }
  if (procedure === "dancingLightsReposition") {
    return [
      spatialCompositionResolve(
        "spatialEffect",
        "targetChoice",
        [],
        "battleAreaShape",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleLightProjection",
      ),
    ];
  }
  if (procedure === "saveGatedAttackRollAdvantage") {
    return [
      spatialCompositionResolve(
        "spatialEffect",
        "targetChoice",
        ["savingThrowOutcome"],
        "battleAreaShape",
      ),
      spatialCompositionResolve(
        "spatialEffect",
        "savingThrowOutcome",
        [],
        "battleSavingThrowOutcome",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleActiveEffect",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleConcentration",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleLightProjection",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleSightProjection",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleAttackRollMode",
      ),
    ];
  }
  if (procedure === "fogCloudObscurement") {
    return [
      spatialCompositionResolve(
        "spatialEffect",
        "targetChoice",
        [],
        "battleAreaShape",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleActiveEffect",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleConcentration",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleObscurementProjection",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleSightProjection",
      ),
    ];
  }
  if (procedure === "greaseGroundHazard") {
    return [
      spatialCompositionResolve(
        "spatialEffect",
        "targetChoice",
        [],
        "battleAreaShape",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleActiveEffect",
      ),
      spatialCompositionResolveWithoutFill("spatialEffect", "battleAreaHazard"),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleCreatureSpaceMovement",
      ),
    ];
  }
  if (
    procedure === "flamingSphere" ||
    procedure === "moonbeam" ||
    procedure === "spikeGrowthMovementHazard" ||
    procedure === "webRestraintHazard"
  ) {
    return [
      spatialCompositionResolve(
        "spatialEffect",
        "targetChoice",
        [],
        "battleAreaShape",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleActiveEffect",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleConcentration",
      ),
      ...(procedure === "moonbeam"
        ? [
            spatialCompositionResolveWithoutFill(
              "spatialEffect",
              "battleLightProjection",
            ),
          ]
        : []),
      spatialCompositionResolveWithoutFill("spatialEffect", "battleAreaHazard"),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleCreatureSpaceMovement",
      ),
      ...(procedure === "webRestraintHazard"
        ? [
            spatialCompositionResolveWithoutFill(
              "spatialEffect",
              "battleObscurementProjection",
            ),
            spatialCompositionResolveWithoutFill(
              "spatialEffect",
              "battleSightProjection",
            ),
          ]
        : []),
    ];
  }
  if (procedure === "objectLight") {
    return [
      spatialCompositionResolve(
        "objectLightRider",
        "targetChoice",
        [],
        "battleObjectTargetBoundary",
      ),
      spatialCompositionResolveWithoutFill(
        "objectLightRider",
        "battleActiveEffect",
      ),
      spatialCompositionResolveWithoutFill(
        "objectLightRider",
        "battleLightProjection",
      ),
      spatialCompositionResolveWithoutFill(
        "objectLightRider",
        "battleActiveEffect",
      ),
    ];
  }
  if (procedure === "heldLight") {
    return [
      spatialCompositionResolveWithoutFill(
        "objectLightRider",
        "battleActiveEffect",
      ),
      spatialCompositionResolveWithoutFill(
        "objectLightRider",
        "battleLightProjection",
      ),
      spatialCompositionResolveWithoutFill(
        "objectLightRider",
        "battleActiveEffect",
      ),
    ];
  }
  if (procedure !== "saveGatedDamage") {
    return undefined;
  }
  const invocation = spellInvocationForRouteSubject(input.state, input.subject);
  if (
    invocation === undefined ||
    !isThunderwavePostSaveAreaEffect(invocation)
  ) {
    return undefined;
  }
  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return undefined;
  }
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === "savingThrowOutcome") {
    return [
      spatialCompositionResolve(
        "movementPresentation",
        "savingThrowOutcome",
        ["movement"],
        "battleSavingThrowOutcome",
      ),
    ];
  }
  if (routeFill !== "rolledDice" || result.tag !== "resolved") {
    return undefined;
  }
  return [
    spatialCompositionResolve(
      "movementPresentation",
      "movement",
      [],
      "battleMovementResource",
    ),
    spatialCompositionResolveWithoutFill(
      "movementPresentation",
      "battleTablePresentation",
    ),
    spatialCompositionDiscover(
      "movementPresentation",
      [],
      "battleObjectTargetBoundary",
    ),
    spatialCompositionResolveWithoutFill(
      "movementPresentation",
      "battleObjectTargetBoundary",
    ),
    spatialCompositionResolveWithoutFill(
      "movementPresentation",
      "battleTablePresentation",
    ),
  ];
}

function spatialEffectCompositionRuntimeRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (input.subject.tag !== "runtimeCommand") {
    return undefined;
  }
  if (
    input.subject.command === "disperseFogCloud" &&
    result.tag === "resolved"
  ) {
    return [
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleObscurementProjection",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleActiveEffect",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleConcentration",
      ),
    ];
  }
  if (input.subject.command === "move") {
    const fill = input.fills.at(-1);
    if (
      fill?.kind === "rolledDice" &&
      input.fills.some(isSpikeGrowthHazardMovementFill) &&
      result.tag === "resolved"
    ) {
      return [
        spatialCompositionResolve(
          "spatialEffect",
          "rolledDice",
          [],
          "battleHitPoint",
        ),
      ];
    }
    if (fill === undefined || fill.kind !== "movement") {
      return undefined;
    }
    const areaDifficultTerrain = fill.value.areaDifficultTerrain;
    if (areaDifficultTerrain === undefined || areaDifficultTerrain === null) {
      return undefined;
    }
    if (
      areaDifficultTerrain.sources.some(
        (source) => source.kind === "spikeGrowthHazard",
      )
    ) {
      return [
        spatialCompositionResolve(
          "spatialEffect",
          "movement",
          result.tag === "needsHoles"
            ? battleReducerRouteHoles(result.holes)
            : [],
          "battleMovementResource",
        ),
      ];
    }
    if (
      !areaDifficultTerrain.sources.some(
        (source) => source.kind === "greaseGroundHazard",
      )
    ) {
      return undefined;
    }
    return [
      spatialCompositionResolve(
        "spatialEffect",
        "movement",
        [],
        "battleMovementResource",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleTurnBoundary",
      ),
      spatialCompositionResolveWithoutFill("spatialEffect", "battleAreaHazard"),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleActiveEffect",
      ),
    ];
  }
  if (
    input.subject.command === "greaseGroundHazardSave" ||
    input.subject.command === "webRestraintSave"
  ) {
    const fill = input.fills.at(-1);
    if (
      fill === undefined ||
      battleReducerRouteFill(fill) !== "savingThrowOutcome"
    ) {
      return undefined;
    }
    return [
      spatialCompositionResolve(
        "spatialEffect",
        "savingThrowOutcome",
        [],
        "battleSavingThrowOutcome",
      ),
      spatialCompositionResolveWithoutFill(
        "spatialEffect",
        "battleConditionLifecycle",
      ),
    ];
  }
  if (input.subject.command === "movableZoneSave") {
    const fill = input.fills.at(-1);
    if (fill === undefined) {
      return undefined;
    }
    const routeFill = battleReducerRouteFill(fill);
    if (routeFill === "savingThrowOutcome") {
      return [
        spatialCompositionResolve(
          "spatialEffect",
          "savingThrowOutcome",
          battleReducerRouteHoles(
            result.tag === "needsHoles" ? result.holes : [],
          ),
          "battleSavingThrowOutcome",
        ),
      ];
    }
    if (routeFill !== "rolledDice" || result.tag !== "resolved") {
      return undefined;
    }
    return [
      spatialCompositionResolve(
        "spatialEffect",
        "rolledDice",
        [],
        "battleHitPoint",
      ),
    ];
  }
  if (input.subject.command !== "jumpMovementReplacement") {
    return undefined;
  }
  const fill = input.fills.at(-1);
  if (fill === undefined || battleReducerRouteFill(fill) !== "movement") {
    return undefined;
  }
  return [
    spatialCompositionResolve(
      "movementPresentation",
      "movement",
      [],
      "battleMovementResource",
    ),
    spatialCompositionResolveWithoutFill(
      "movementPresentation",
      "battleTablePresentation",
    ),
    spatialCompositionResolveWithoutFill(
      "movementPresentation",
      "battleConditionLifecycle",
    ),
  ];
}

function thunderwavePresentationRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvent | undefined {
  if (
    act.subject.tag !== "actionSpell" &&
    act.subject.tag !== "bonusActionSpell"
  ) {
    return undefined;
  }
  const invocation = spellInvocationForRouteSubject(state, act.subject);
  if (
    invocation === undefined ||
    !isThunderwavePostSaveAreaEffect(invocation)
  ) {
    return undefined;
  }
  return spatialCompositionDiscover(
    "movementPresentation",
    ["movement", "savingThrowOutcome"],
    "battleSavingThrowOutcome",
  );
}

function spatialEffectCompositionDiscoveryHoles(
  invocation: BattleSpellProcedureExecution,
): readonly BattleReducerRouteHole[] {
  if (
    invocation.procedure === "dancingLightsSeparateCast" ||
    invocation.procedure === "dancingLightsCombinedCast"
  ) {
    return [];
  }
  if (invocation.procedure === "saveGatedAttackRollAdvantage") {
    return ["savingThrowOutcome", "targetChoice"];
  }
  return ["targetChoice"];
}

function isSpatialEffectCompositionDiscoverySubject(
  invocation: BattleSpellProcedureExecution,
): boolean {
  const procedure = invocation.procedure;
  return (
    procedure === "dancingLightsSeparateCast" ||
    procedure === "dancingLightsCombinedCast" ||
    procedure === "dancingLightsReposition" ||
    procedure === "saveGatedAttackRollAdvantage" ||
    procedure === "fogCloudObscurement" ||
    procedure === "greaseGroundHazard" ||
    procedure === "flamingSphere" ||
    procedure === "moonbeam" ||
    procedure === "spikeGrowthMovementHazard" ||
    procedure === "webRestraintHazard"
  );
}

function isObjectLightDiscoverySubject(
  invocation: BattleSpellProcedureExecution,
): boolean {
  return invocation.procedure === "objectLight";
}

function isThunderwavePostSaveAreaEffect(
  invocation: BattleSpellProcedureExecution,
): boolean {
  return (
    invocation.procedure === "saveGatedDamage" &&
    invocation.postSaveAreaEffect?.kind === "thunderwave"
  );
}

function battleHasActiveAreaDifficultTerrainHazard(
  state: BattleState,
): boolean {
  return [...state.combatants.values()].some((combatant) =>
    combatant.activeEffects.some(
      (effect) =>
        effect.kind === "greaseGroundHazard" ||
        effect.kind === "spikeGrowthHazard" ||
        effect.kind === "webRestraintHazard",
    ),
  );
}

function isSpikeGrowthHazardMovementFill(
  fill: BattleFill,
): fill is Extract<BattleFill, { readonly kind: "movement" }> {
  return (
    fill.kind === "movement" &&
    fill.value.areaDifficultTerrain?.sources.some(
      (source) => source.kind === "spikeGrowthHazard",
    ) === true
  );
}

function spatialCompositionDiscover(
  subject: BattleReducerRouteSubjectFamily,
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return discoverBattleActsRoute(subject, holes, owner);
}

function spatialCompositionResolve(
  subject: BattleReducerRouteSubjectFamily,
  fill: BattleReducerRouteFill,
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectRoute(subject, fill, holes, owner);
}

function spatialCompositionResolveWithoutFill(
  subject: BattleReducerRouteSubjectFamily,
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectWithoutFillRoute(subject, [], owner);
}

function spellAttackHitActiveEffectAdmissionRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): readonly BattleReducerRouteEvent[] {
  if (result.tag === "invalid") {
    return [];
  }
  const fill = input.fills.at(-1);
  if (fill === undefined || battleFillKind(fill) !== "rolledDice") {
    return [];
  }
  return activeEffectKindsAdded(input.state, result.state).flatMap((kind) => {
    const subject = spellAttackHitActiveEffectRouteSubject(kind);
    return subject === undefined
      ? []
      : [
          resolveBattleSubjectWithoutFillRoute(
            subject,
            [],
            "battleActiveEffect" as const,
          ),
        ];
  });
}

function spellAttackHitActiveEffectRouteSubject(
  kind: BattleActiveEffect["kind"],
): BattleReducerRouteSubjectFamily | undefined {
  if (kind === "hitPointRegainPrevented") {
    return "hitPointRegainPrevention";
  }
  if (kind === "nextAttackRollAgainstSelf") {
    return "nextAttackRollMode";
  }
  if (kind === "opportunityAttackDenied") {
    return "reactionInterdiction";
  }
  return undefined;
}

function activeEffectKindsAdded(
  before: BattleState,
  after: BattleState,
): readonly BattleActiveEffect["kind"][] {
  const beforeCounts = battleActiveEffectKindCounts(before);
  const added = new Set<BattleActiveEffect["kind"]>();
  for (const effect of battleActiveEffects(after)) {
    const previous = beforeCounts.get(effect.kind) ?? 0;
    if (previous === 0) {
      added.add(effect.kind);
      continue;
    }
    beforeCounts.set(effect.kind, previous - 1);
  }
  return [...added];
}

function battleActiveEffectKindCounts(
  state: BattleState,
): Map<BattleActiveEffect["kind"], number> {
  const counts = new Map<BattleActiveEffect["kind"], number>();
  for (const effect of battleActiveEffects(state)) {
    counts.set(effect.kind, (counts.get(effect.kind) ?? 0) + 1);
  }
  return counts;
}

function rollModifierRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvent | undefined {
  if (!isRollModifierEffectDiscoverySubject(state, act.subject)) {
    return undefined;
  }
  return discoverBattleActsRoute(
    "rollModifierEffect",
    rollModifierRouteHoles(act.initialHoles),
    spellInvocationForRouteSubject(state, act.subject)?.procedure ===
      "thaumaturgyBoomingVoice"
      ? "battleActiveEffect"
      : "battleSpellSlotAndActionEconomy",
  );
}

function rollModifierRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (!isRollModifierEffectResolutionSubject(input.state, input.subject)) {
    return undefined;
  }
  if (result.tag === "invalid") {
    return undefined;
  }
  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return undefined;
  }
  if (
    spellInvocationForRouteSubject(input.state, input.subject)?.procedure ===
    "thaumaturgyBoomingVoice"
  ) {
    if (
      fill.kind === "thaumaturgyActiveOneMinuteEffectCount" &&
      result.tag === "resolved"
    ) {
      return [rollModifierResolveWithoutFill([], "battleActiveEffect")];
    }
    return undefined;
  }

  const holes =
    result.tag === "needsHoles" ? rollModifierRouteHoles(result.holes) : [];
  if (
    (fill.kind === "targetChoice" || fill.kind === "spellTargetList") &&
    result.tag === "needsHoles" &&
    holes.includes("savingThrowOutcome")
  ) {
    return [
      discoverBattleActsRoute(
        "rollModifierEffect",
        holes,
        "battleSpellSlotAndActionEconomy",
      ),
    ];
  }
  if (result.tag !== "resolved") {
    return undefined;
  }

  const routeFill = rollModifierRouteFill(fill);
  if (routeFill === undefined) {
    if (fill.kind !== "targetChoice" && fill.kind !== "spellTargetList") {
      return undefined;
    }
    return [
      rollModifierResolveWithoutFill([], "battleActiveEffect"),
      rollModifierResolveWithoutFill([], "battleConcentration"),
    ];
  }
  return [
    resolveBattleSubjectRoute(
      "rollModifierEffect",
      routeFill,
      [],
      "battleActiveEffect",
    ),
    rollModifierResolveWithoutFill([], "battleConcentration"),
  ];
}

function rollModifierConcentrationBreakRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (result.tag !== "resolved") {
    return undefined;
  }
  if (
    input.subject.tag !== "runtimeCommand" ||
    input.subject.command !== "endConcentration"
  ) {
    return undefined;
  }
  if (!hasConcentratingRollModifierEffect(input.state, input.subject.actorId)) {
    return undefined;
  }
  return [
    rollModifierResolveWithoutFill([], "battleConcentration"),
    rollModifierResolveWithoutFill([], "battleActiveEffect"),
  ];
}

function rollModifierResolveWithoutFill(
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectWithoutFillRoute(
    "rollModifierEffect",
    holes,
    owner,
  );
}

function spellDamageReductionRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvent | undefined {
  if (
    act.subject.tag !== "actionSpell" ||
    spellInvocationForRouteSubject(state, act.subject)?.procedure !==
      "damageReduction"
  ) {
    return undefined;
  }
  return discoverBattleActsRoute(
    "spellDamageReduction",
    spellDamageReductionCastDiscoveryHoles(act.initialHoles),
    "battleSpellSlotAndActionEconomy",
  );
}

function spellDamageReductionRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    input.subject.tag !== "actionSpell" ||
    spellInvocationForRouteSubject(input.state, input.subject)?.procedure !==
      "damageReduction" ||
    result.tag === "invalid"
  ) {
    return undefined;
  }
  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return undefined;
  }
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === "targetChoice" && result.tag === "needsHoles") {
    return [
      spellDamageReductionResolveWithFill(
        routeFill,
        spellDamageReductionCastChoiceHoles(result.holes),
        "battleTargetSelection",
      ),
    ];
  }
  if (routeFill === "damageTypeChoice" && result.tag === "resolved") {
    return [
      spellDamageReductionResolveWithFill(routeFill, [], "battleActiveEffect"),
      spellDamageReductionResolveWithoutFill([], "battleConcentration"),
    ];
  }
  return undefined;
}

function spellDamageReductionAdjustmentDiscoveryRouteForResolution(
  result: BattleResolutionResult,
): BattleReducerRouteEvent | undefined {
  if (
    result.tag !== "needsHoles" ||
    !hasSpellDamageReductionHole(result.holes)
  ) {
    return undefined;
  }
  return discoverBattleActsRoute(
    "spellDamageReduction",
    ["rolledDice"],
    "battleDamageAdjustment",
  );
}

function spellDamageReductionAdjustmentRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (result.tag !== "resolved") {
    return undefined;
  }
  const fill = input.fills.at(-1);
  if (fill === undefined || battleReducerRouteFill(fill) !== "rolledDice") {
    return undefined;
  }
  if (!spellDamageReductionEffectUseChanged(input.state, result.state)) {
    return undefined;
  }
  return [
    spellDamageReductionResolveWithFill(
      "rolledDice",
      [],
      "battleDamageAdjustment",
    ),
    spellDamageReductionResolveWithoutFill([], "battleActiveEffect"),
  ];
}

function spellDamageReductionCastDiscoveryHoles(
  holes: readonly BattleHole[],
): readonly BattleReducerRouteHole[] {
  return holes.some((hole) => hole.kind === "targetChoice")
    ? ["targetChoice"]
    : battleReducerRouteHoles(holes);
}

function spellDamageReductionCastChoiceHoles(
  holes: readonly BattleHole[],
): readonly BattleReducerRouteHole[] {
  return battleReducerRouteHoles(
    holes.filter((hole) => hole.kind === "damageTypeChoice"),
  );
}

function hasSpellDamageReductionHole(holes: readonly BattleHole[]): boolean {
  return holes.some(
    (hole) => hole.kind === "rolledDice" && "spellDamageReduction" in hole,
  );
}

function spellDamageReductionEffectUseChanged(
  before: BattleState,
  after: BattleState,
): boolean {
  const beforeEffects = spellDamageReductionEffectsByProtocol(before);
  for (const [key, effect] of spellDamageReductionEffectsByProtocol(after)) {
    const previous = beforeEffects.get(key);
    if (
      previous !== undefined &&
      previous.usedThisTurn === false &&
      effect.usedThisTurn === true
    ) {
      return true;
    }
  }
  return false;
}

function spellDamageReductionEffectsByProtocol(
  state: BattleState,
): ReadonlyMap<
  string,
  Extract<BattleActiveEffect, { readonly kind: "spellDamageReduction" }>
> {
  const effects = new Map<
    string,
    Extract<BattleActiveEffect, { readonly kind: "spellDamageReduction" }>
  >();
  for (const combatant of state.combatants.values()) {
    for (const effect of combatant.activeEffects) {
      if (effect.kind === "spellDamageReduction") {
        effects.set(
          spellDamageReductionEffectRouteKey(combatant, effect),
          effect,
        );
      }
    }
  }
  return effects;
}

function spellDamageReductionEffectRouteKey(
  combatant: BattleCreatureState,
  effect: Extract<
    BattleActiveEffect,
    { readonly kind: "spellDamageReduction" }
  >,
): string {
  return [
    combatant.combatantId,
    effect.sourceProcedureRef,
    effect.sourceCombatantId,
    effect.damageType,
  ].join("\u0000");
}

function spellDamageReductionResolveWithFill(
  fill: Extract<
    BattleReducerRouteFill,
    "targetChoice" | "damageTypeChoice" | "rolledDice"
  >,
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectRoute("spellDamageReduction", fill, holes, owner);
}

function spellDamageReductionResolveWithoutFill(
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectWithoutFillRoute(
    "spellDamageReduction",
    holes,
    owner,
  );
}

function scalarBuffRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvent | undefined {
  if (!isScalarBuffEffectSubject(state, act.subject)) {
    return undefined;
  }
  return discoverBattleActsRoute(
    "scalarBuffEffect",
    [],
    "battleSpellSlotAndActionEconomy",
  );
}

type MarkedDamageAndConditionProtectionSubject = Extract<
  BattleReducerRouteSubjectFamily,
  "markedDamageRiderEffect" | "conditionImmunityTemporaryHitPointEffect"
>;

function markedDamageAndConditionProtectionRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvent | undefined {
  const subject = markedDamageAndConditionProtectionSubject(state, act.subject);
  if (subject === undefined) {
    return undefined;
  }
  return discoverBattleActsRoute(
    subject,
    markedDamageAndConditionProtectionDiscoveryHolesForAct(
      state,
      subject,
      act.subject,
      act.initialHoles,
    ),
    markedDamageAndConditionProtectionDiscoveryOwnerForAct(
      state,
      subject,
      act.subject,
    ),
  );
}

function markedDamageAndConditionProtectionRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  const subject = markedDamageAndConditionProtectionSubject(
    input.state,
    input.subject,
  );
  if (subject === undefined) {
    return undefined;
  }
  if (result.tag === "invalid") {
    return result.reason === "staleSubject"
      ? [
          markedDamageAndConditionProtectionResolveWithoutFillRoute(
            subject,
            [],
            "battleHoleFrontier",
          ),
        ]
      : undefined;
  }

  const fill = input.fills.at(-1);
  const routeFill =
    fill === undefined ? undefined : battleReducerRouteFill(fill);
  if (fill !== undefined && routeFill === undefined) {
    return undefined;
  }
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  const route: BattleReducerRouteEvent[] = [];
  if (routeFill !== undefined) {
    route.push(
      effectRouteResolve(
        subject,
        routeFill,
        holes,
        markedDamageAndConditionProtectionFillOwner(routeFill),
      ),
    );
  }
  if (
    result.tag === "needsHoles" &&
    !markedDamageAndConditionProtectionSuppressNextDiscovery(subject, holes)
  ) {
    route.push(
      effectRouteDiscover(
        subject,
        holes,
        markedDamageAndConditionProtectionNextDiscoveryOwner(holes),
      ),
    );
  }
  if (result.tag === "resolved") {
    const resolvedOwners = markedDamageAndConditionProtectionResolvedOwners(
      input.state,
      result.state,
      input.subject.actorId,
      subject,
    );
    route.push(
      ...resolvedOwners
        .filter(
          (owner) =>
            !(
              subject === "markedDamageRiderEffect" &&
              typeof routeFill === "object" &&
              routeFill.kind === "abilityChoice" &&
              owner === "battleActiveEffect"
            ),
        )
        .map((owner) =>
          markedDamageAndConditionProtectionResolveWithoutFillRoute(
            subject,
            [],
            owner,
          ),
        ),
    );
  }
  return nonEmptyRouteEvents(route);
}

function markedDamageAndConditionProtectionSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): MarkedDamageAndConditionProtectionSubject | undefined {
  const invocation = spellInvocationForRouteSubject(state, subject);
  if (invocation?.procedure === "markedDamageRider") {
    return "markedDamageRiderEffect";
  }
  if (
    invocation?.procedure === "conditionImmunityAndTurnStartTemporaryHitPoints"
  ) {
    return "conditionImmunityTemporaryHitPointEffect";
  }
  return undefined;
}

function markedDamageAndConditionProtectionDiscoveryOwnerForAct(
  state: BattleState,
  subject: MarkedDamageAndConditionProtectionSubject,
  battleSubject: BattleResolutionInput["subject"],
): BattleReducerRouteOwnerGroup {
  if (
    subject === "markedDamageRiderEffect" &&
    battleSubject.tag === "bonusActionSpell" &&
    spellInvocationForRouteSubject(state, battleSubject)?.access.tag ===
      "spellEffect"
  ) {
    return "battleActionEconomy";
  }
  return "battleSpellSlotAndActionEconomy";
}

function markedDamageAndConditionProtectionDiscoveryHolesForAct(
  state: BattleState,
  subject: MarkedDamageAndConditionProtectionSubject,
  battleSubject: BattleResolutionInput["subject"],
  initialHoles: readonly BattleHole[],
): readonly BattleReducerRouteHole[] {
  const holes = battleReducerRouteHoles(initialHoles);
  const invocation = spellInvocationForRouteSubject(state, battleSubject);
  if (
    subject !== "markedDamageRiderEffect" ||
    !invocationHasChosenAbilityCheckDisadvantage(invocation)
  ) {
    return holes;
  }
  return [...new Set([...holes, "abilityChoice" as const])].sort();
}

function markedDamageAndConditionProtectionSuppressNextDiscovery(
  subject: MarkedDamageAndConditionProtectionSubject,
  holes: readonly BattleReducerRouteHole[],
): boolean {
  return (
    subject === "markedDamageRiderEffect" &&
    holes.length === 1 &&
    holes[0] === "abilityChoice"
  );
}

function invocationHasChosenAbilityCheckDisadvantage(
  invocation: BattleSpellProcedureExecution | undefined,
): boolean {
  if (invocation === undefined) {
    return false;
  }
  if (!("abilityCheckBehavior" in invocation)) {
    return false;
  }
  const behavior = invocation.abilityCheckBehavior;
  return (
    typeof behavior === "object" &&
    behavior !== null &&
    "kind" in behavior &&
    behavior.kind === "chosenAbilityDisadvantage"
  );
}

function markedDamageAndConditionProtectionFillOwner(
  fill: BattleReducerRouteFill,
): BattleReducerRouteOwnerGroup {
  if (fill === "targetChoice") {
    return "battleTargetSelection";
  }
  if (typeof fill === "object" && fill.kind === "abilityChoice") {
    return "battleActiveEffect";
  }
  if (fill === "damageTypeChoice") {
    return "battleActiveEffect";
  }
  if (fill === "attackRoll") {
    return "battleAttackRoll";
  }
  if (fill === "rolledDice") {
    return "battleHitPoint";
  }
  return "battleSpellSlotAndActionEconomy";
}

function markedDamageAndConditionProtectionNextDiscoveryOwner(
  holes: readonly BattleReducerRouteHole[],
): BattleReducerRouteOwnerGroup {
  if (holes.includes("targetChoice")) {
    return "battleTargetSelection";
  }
  if (holes.includes("attackRoll")) {
    return "battleAttackRoll";
  }
  if (holes.includes("rolledDice")) {
    return "battleHitPoint";
  }
  return "battleSpellSlotAndActionEconomy";
}

function markedDamageAndConditionProtectionResolvedOwners(
  before: BattleState,
  after: BattleState,
  actorId: CombatantId,
  subject: MarkedDamageAndConditionProtectionSubject,
): readonly BattleReducerRouteOwnerGroup[] {
  const owners: BattleReducerRouteOwnerGroup[] = [];
  if (combatantsActiveEffectsChanged(before, after)) {
    owners.push("battleActiveEffect");
  }
  if (combatantConcentrationChanged(before, after, actorId)) {
    owners.push("battleConcentration");
  }
  if (
    subject === "conditionImmunityTemporaryHitPointEffect" &&
    combatantsTemporaryHitPointsIncreased(before, after)
  ) {
    owners.push("battleTemporaryHitPoint");
  }
  if (
    subject === "conditionImmunityTemporaryHitPointEffect" &&
    combatantsConditionsChanged(before, after)
  ) {
    owners.push("battleConditionLifecycle", "battleActiveEffect");
  }
  return owners;
}

type RoutedActiveEffectSubject = Extract<
  BattleReducerRouteSubjectFamily,
  | MarkedDamageAndConditionProtectionSubject
  | "heldWeaponActiveEffect"
  | "weaponDamageRider"
>;

function effectRouteResolve(
  subject: RoutedActiveEffectSubject,
  fill: BattleReducerRouteFill,
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectRoute(subject, fill, holes, owner);
}

function effectRouteDiscover(
  subject: RoutedActiveEffectSubject,
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return discoverBattleActsRoute(subject, holes, owner);
}

function markedDamageAndConditionProtectionResolveWithoutFillRoute(
  subject: MarkedDamageAndConditionProtectionSubject,
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectWithoutFillRoute(subject, holes, owner);
}

function markedDamageRiderWeaponAttackRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvent | undefined {
  if (
    !isWeaponAttackSubject(act.subject) ||
    !battleCombatantHasActiveEffectKind(
      state,
      act.subject.actorId,
      "spellMarkedDamageRider",
    )
  ) {
    return undefined;
  }
  return effectRouteDiscover(
    "markedDamageRiderEffect",
    battleReducerRouteHoles(act.initialHoles),
    "battleActionEconomy",
  );
}

function markedDamageRiderAbilityCheckRollModeRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    result.tag === "invalid" ||
    input.subject.tag !== "action" ||
    input.subject.action !== "search"
  ) {
    return undefined;
  }
  const fill = input.fills.at(-1);
  if (
    fill?.kind !== "abilityCheck" ||
    requiredAbilityCheckRollMode(input.state, input.subject.actorId, "wis") !==
      "disadvantage"
  ) {
    return undefined;
  }
  return [
    markedDamageAndConditionProtectionResolveWithoutFillRoute(
      "markedDamageRiderEffect",
      [],
      "battleAbilityCheckRollMode",
    ),
  ];
}

function conditionImmunityTemporaryHitPointTurnBoundaryRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    !isEndTurnSubject(input.subject) ||
    result.tag !== "resolved" ||
    !conditionImmunityTemporaryHitPointsIncreased(input.state, result.state)
  ) {
    return undefined;
  }
  return [
    effectRouteDiscover(
      "conditionImmunityTemporaryHitPointEffect",
      [],
      "battleTurnBoundary",
    ),
    markedDamageAndConditionProtectionResolveWithoutFillRoute(
      "conditionImmunityTemporaryHitPointEffect",
      [],
      "battleTemporaryHitPoint",
    ),
  ];
}

function markedDamageRiderTurnBoundaryRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    !isEndTurnSubject(input.subject) ||
    result.tag !== "resolved" ||
    !(
      markedDamageRiderLaterTransferBecameAvailable(
        input.state,
        result.state,
      ) ||
      combatantOwnsMarkedDamageRiderLaterTransfer(
        input.state,
        input.subject.actorId,
      )
    )
  ) {
    return undefined;
  }
  return [
    markedDamageAndConditionProtectionResolveWithoutFillRoute(
      "markedDamageRiderEffect",
      [],
      "battleTurnBoundary",
    ),
  ];
}

function conditionImmunityTemporaryHitPointsIncreased(
  before: BattleState,
  after: BattleState,
): boolean {
  return (
    battleHasActiveEffectKind(before, "turnStartTemporaryHitPoints") &&
    combatantsTemporaryHitPointsIncreased(before, after)
  );
}

function battleHasActiveEffectKind(
  state: BattleState,
  kind: BattleActiveEffect["kind"],
): boolean {
  return [...state.combatants.values()].some((combatant) =>
    combatant.activeEffects.some((effect) => effect.kind === kind),
  );
}

function markedDamageRiderTransferBecameAvailable(
  before: BattleState,
  after: BattleState,
): boolean {
  return [...before.combatants.keys()].some((combatantId) => {
    const beforeEffects = markedDamageRiderEffects(before, combatantId);
    const afterEffects = markedDamageRiderEffects(after, combatantId);
    return beforeEffects.some((beforeEffect) => {
      if (beforeEffect.transfer.kind !== "awaitingTargetDrop") {
        return false;
      }
      const afterEffect = afterEffects.find(
        (candidate) =>
          candidate.sourceProcedureRef === beforeEffect.sourceProcedureRef &&
          candidate.sourceCombatantId === beforeEffect.sourceCombatantId,
      );
      return (
        afterEffect !== undefined &&
        (afterEffect.transfer.kind === "available" ||
          afterEffect.transfer.kind === "availableAfterTurn")
      );
    });
  });
}

function markedDamageRiderTransferRouteForResolution(input: {
  readonly state: BattleState;
  readonly result: BattleResolutionResult;
  readonly holes: readonly BattleReducerRouteHole[];
}): BattleReducerRouteEvents | undefined {
  if (
    input.result.tag !== "resolved" ||
    !markedDamageRiderTransferBecameAvailable(input.state, input.result.state)
  ) {
    return undefined;
  }
  return [
    markedDamageAndConditionProtectionResolveWithoutFillRoute(
      "markedDamageRiderEffect",
      input.holes,
      "battleHitPointAndZeroHpLifecycle",
    ),
    markedDamageAndConditionProtectionResolveWithoutFillRoute(
      "markedDamageRiderEffect",
      input.holes,
      "battleActiveEffect",
    ),
  ];
}

function markedDamageRiderLaterTransferBecameAvailable(
  before: BattleState,
  after: BattleState,
): boolean {
  return [...before.combatants.keys()].some((combatantId) => {
    const beforeEffects = markedDamageRiderEffects(before, combatantId);
    const afterEffects = markedDamageRiderEffects(after, combatantId);
    return beforeEffects.some((beforeEffect) => {
      if (beforeEffect.transfer.kind !== "availableAfterTurn") {
        return false;
      }
      const afterEffect = afterEffects.find(
        (candidate) =>
          candidate.sourceProcedureRef === beforeEffect.sourceProcedureRef &&
          candidate.sourceCombatantId === beforeEffect.sourceCombatantId,
      );
      return afterEffect?.transfer.kind === "available";
    });
  });
}

function combatantOwnsMarkedDamageRiderLaterTransfer(
  state: BattleState,
  combatantId: CombatantId,
): boolean {
  return [...state.combatants.values()].some((combatant) =>
    combatant.activeEffects.some(
      (effect) =>
        effect.kind === "spellMarkedDamageRider" &&
        effect.sourceCombatantId === combatantId &&
        effect.transfer.kind === "availableAfterTurn",
    ),
  );
}

function markedDamageRiderEffects(
  state: BattleState,
  combatantId: CombatantId,
): readonly Extract<
  BattleActiveEffect,
  { readonly kind: "spellMarkedDamageRider" }
>[] {
  return (
    state.combatants
      .get(combatantId)
      ?.activeEffects.filter(
        (
          effect,
        ): effect is Extract<
          BattleActiveEffect,
          { readonly kind: "spellMarkedDamageRider" }
        > => effect.kind === "spellMarkedDamageRider",
      ) ?? []
  );
}

function protectionCharmRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvents | undefined {
  const invocation = spellInvocationForRouteSubject(state, act.subject);
  if (isSourceDamageBreakCharmedSaveGatedConditionInvocation(invocation)) {
    return [
      discoverBattleActsRoute(
        "creatureTypeTargetAdmission",
        ["targetChoice"],
        "battleSpellSlotAndActionEconomy",
      ),
      discoverBattleActsRoute(
        "protectionCharmActiveEffect",
        ["savingThrowOutcome", "targetChoice"],
        "battleSpellSlotAndActionEconomy",
      ),
    ];
  }
  if (!isCreatureTypeProtectionInvocation(invocation)) {
    return undefined;
  }
  return [
    discoverBattleActsRoute(
      "protectionCharmActiveEffect",
      ["targetChoice"],
      "battleSpellSlotAndActionEconomy",
    ),
  ];
}

function protectionCharmRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (isProtectionRelevantEffectSaveSubject(input.subject)) {
    return protectionRelevantEffectSaveRouteForResolution(result);
  }
  const conditionAttemptRoute = protectionConditionAttemptRouteForResolution(
    input,
    result,
  );
  if (conditionAttemptRoute !== undefined) {
    return conditionAttemptRoute;
  }
  const possessionAttemptRoute = protectionPossessionAttemptRouteForResolution(
    input,
    result,
  );
  if (possessionAttemptRoute !== undefined) {
    return possessionAttemptRoute;
  }
  const invocation = spellInvocationForRouteSubject(input.state, input.subject);
  if (isCreatureTypeProtectionInvocation(invocation)) {
    return creatureTypeProtectionRouteForResolution(input, result);
  }
  if (isCharmedSaveGatedConditionInvocation(invocation)) {
    const preventedCharmRoute =
      protectionPreventedCharmedConditionRouteForResolution(input, result);
    if (preventedCharmRoute !== undefined) {
      return preventedCharmRoute;
    }
  }
  if (isSourceDamageBreakCharmedSaveGatedConditionInvocation(invocation)) {
    return sourceDamageBreakCharmedRouteForResolution(input, result);
  }
  return undefined;
}

function protectionConditionAttemptRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    input.subject.tag !== "runtimeCommand" ||
    input.subject.command !== "creatureTypeProtectionConditionAttempt" ||
    result.tag !== "resolved"
  ) {
    return undefined;
  }
  const target = input.state.combatants.get(input.subject.actorId);
  if (
    target === undefined ||
    !conditionApplicationPreventedByCreatureTypeProtection(
      input.state,
      input.subject.sourceCombatantId,
      target,
      input.subject.condition,
    )
  ) {
    return undefined;
  }
  return [
    protectionCharmDiscover([], "battleActiveEffect"),
    protectionCharmResolveWithoutFill([], "battleConditionLifecycle"),
  ];
}

function protectionPossessionAttemptRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    input.subject.tag !== "runtimeCommand" ||
    input.subject.command !== "creatureTypeProtectionPossessionAttempt" ||
    result.tag !== "resolved"
  ) {
    return undefined;
  }
  const disposition = resolveBattlePossessionAttempt({
    state: input.state,
    sourceCombatantId: input.subject.sourceCombatantId,
    targetId: input.subject.actorId,
  });
  if (
    disposition.tag !== "prevented" ||
    disposition.prevention !== "creatureTypeProtection"
  ) {
    return undefined;
  }
  return [
    protectionCharmDiscover([], "battleActiveEffect"),
    protectionCharmResolveWithoutFill([], "battleCreatureState"),
  ];
}

function protectionRelevantEffectSaveRouteForResolution(
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (result.tag !== "needsHoles") {
    return undefined;
  }
  if (!battleReducerRouteHoles(result.holes).includes("savingThrowOutcome")) {
    return undefined;
  }
  return [
    protectionCharmDiscover([], "battleActiveEffect"),
    protectionCharmResolveWithoutFill([], "battleSavingThrowRollMode"),
  ];
}

function creatureTypeProtectionRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  const fill = input.fills.at(-1);
  if (fill === undefined || battleReducerRouteFill(fill) !== "targetChoice") {
    return undefined;
  }
  if (result.tag === "invalid") {
    return undefined;
  }
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  const route: BattleReducerRouteEvent[] = [
    resolveBattleSubjectRoute(
      "protectionCharmActiveEffect",
      "targetChoice",
      holes,
      "battleTargetSelection",
    ),
  ];
  if (result.tag === "resolved") {
    if (combatantsActiveEffectsChanged(input.state, result.state)) {
      route.push(protectionCharmResolveWithoutFill([], "battleActiveEffect"));
    }
    if (
      input.subject.tag === "actionSpell" &&
      combatantConcentrationChanged(
        input.state,
        result.state,
        input.subject.actorId,
      )
    ) {
      route.push(protectionCharmResolveWithoutFill([], "battleConcentration"));
    }
  }
  return nonEmptyRouteEvents(route);
}

function sourceDamageBreakCharmedRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return undefined;
  }
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === "spellTargetList" && result.tag === "needsHoles") {
    return [
      resolveBattleSubjectRoute(
        "protectionCharmActiveEffect",
        "targetChoice",
        battleReducerRouteHoles(result.holes),
        "battleTargetSelection",
      ),
    ];
  }
  if (routeFill !== "savingThrowOutcome" || result.tag === "invalid") {
    return undefined;
  }
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  const route: BattleReducerRouteEvent[] = [
    resolveBattleSubjectRoute(
      "protectionCharmActiveEffect",
      "savingThrowOutcome",
      holes,
      "battleSavingThrowOutcome",
    ),
  ];
  if (result.tag === "resolved") {
    if (
      combatantsConditionsChanged(input.state, result.state) ||
      charmedConditionPreventedByCreatureTypeProtection(input)
    ) {
      route.push(
        protectionCharmResolveWithoutFill([], "battleConditionLifecycle"),
      );
    }
    if (combatantsActiveEffectsChanged(input.state, result.state)) {
      route.push(protectionCharmResolveWithoutFill([], "battleActiveEffect"));
    }
  }
  return nonEmptyRouteEvents(route);
}

function protectionPreventedCharmedConditionRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  const fill = input.fills.at(-1);
  if (
    fill === undefined ||
    battleReducerRouteFill(fill) !== "savingThrowOutcome" ||
    result.tag !== "resolved" ||
    !charmedConditionPreventedByCreatureTypeProtection(input)
  ) {
    return undefined;
  }
  return [
    protectionCharmDiscover([], "battleActiveEffect"),
    protectionCharmResolveWithoutFill([], "battleConditionLifecycle"),
  ];
}

function isCreatureTypeProtectionInvocation(
  invocation: BattleSpellProcedureExecution | undefined,
): invocation is Extract<
  BattleSpellProcedureExecution,
  { readonly procedure: "creatureTypeProtection" }
> {
  return invocation?.procedure === "creatureTypeProtection";
}

function isCharmedSaveGatedConditionInvocation(
  invocation: BattleSpellProcedureExecution | undefined,
): invocation is Extract<
  BattleSpellProcedureExecution,
  { readonly procedure: "saveGatedCondition" }
> {
  return (
    invocation?.procedure === "saveGatedCondition" &&
    invocation.targeting.kind === "targetList" &&
    invocation.effect.kind === "fixed" &&
    invocation.effect.condition === "charmed"
  );
}

function isSourceDamageBreakCharmedSaveGatedConditionInvocation(
  invocation: BattleSpellProcedureExecution | undefined,
): invocation is Extract<
  BattleSpellProcedureExecution,
  { readonly procedure: "saveGatedCondition" }
> {
  return (
    isCharmedSaveGatedConditionInvocation(invocation) &&
    invocation.effect.escape?.kind === "targetDamagedByCasterOrAlly"
  );
}

function isProtectionRelevantEffectSaveSubject(
  subject: BattleResolutionInput["subject"],
): boolean {
  return (
    subject.tag === "runtimeCommand" &&
    subject.command === "protectionRelevantEffectSave"
  );
}

function charmedConditionPreventedByCreatureTypeProtection(
  input: BattleResolutionInput,
): boolean {
  if (
    !isCharmedSaveGatedConditionInvocation(
      spellInvocationForRouteSubject(input.state, input.subject),
    )
  ) {
    return false;
  }
  return saveGatedConditionFailedTargetIds(input).some((targetId) => {
    const target = input.state.combatants.get(targetId);
    return (
      target !== undefined &&
      conditionApplicationPreventedByCreatureTypeProtection(
        input.state,
        input.subject.actorId,
        target,
        "charmed",
      )
    );
  });
}

function saveGatedConditionFailedTargetIds(
  input: BattleResolutionInput,
): readonly CombatantId[] {
  const saveFill = input.fills.find(
    (
      fill,
    ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
      fill.kind === "savingThrowOutcome",
  );
  return (
    saveFill?.value.outcomes.flatMap((outcome) =>
      outcome.succeeded ? [] : [outcome.targetId],
    ) ?? []
  );
}

function protectionCharmDiscover(
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return discoverBattleActsRoute("protectionCharmActiveEffect", holes, owner);
}

function protectionCharmResolveWithoutFill(
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectWithoutFillRoute(
    "protectionCharmActiveEffect",
    holes,
    owner,
  );
}

function scalarBuffRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (!isScalarBuffEffectSubject(input.state, input.subject)) {
    return undefined;
  }
  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return undefined;
  }
  const routeFill = scalarBuffRouteFill(fill);
  if (routeFill === undefined) {
    return undefined;
  }

  if (result.tag === "invalid") {
    return result.reason === "staleSubject"
      ? [
          resolveBattleSubjectRoute(
            "scalarBuffEffect",
            routeFill,
            [],
            "battleHoleFrontier",
          ),
        ]
      : undefined;
  }
  if (result.tag !== "resolved") {
    return undefined;
  }

  return nonEmptyRouteEvents(
    scalarBuffResolveOwners(
      input.state,
      result.state,
      input.subject.actorId,
    ).map((owner) => scalarBuffResolveWithoutFill([], owner)),
  );
}

function scalarBuffRouteFill(
  fill: BattleFill,
):
  | Extract<
      BattleReducerRouteFill,
      "targetChoice" | "spellTargetList" | "rolledDice"
    >
  | undefined {
  const routeFill = battleReducerRouteFill(fill);
  if (
    routeFill === "targetChoice" ||
    routeFill === "spellTargetList" ||
    routeFill === "rolledDice"
  ) {
    return routeFill;
  }
  return undefined;
}

function scalarBuffResolveOwners(
  before: BattleState,
  after: BattleState,
  actorId: CombatantId,
): readonly BattleReducerRouteOwnerGroup[] {
  if (combatantsTemporaryHitPointsIncreased(before, after)) {
    return ["battleTemporaryHitPoint"];
  }

  const addedEffectKinds = scalarBuffAddedActiveEffectKinds(before, after);
  const activeEffectOwners: readonly BattleReducerRouteOwnerGroup[] =
    addedEffectKinds.size > 0 ? ["battleActiveEffect"] : [];
  const projectionOwners: readonly BattleReducerRouteOwnerGroup[] =
    addedEffectKinds.has("speedDelta") ||
    addedEffectKinds.has("specialSpeedGrant")
      ? ["battleMovementResource"]
      : [];
  const hitPointOwners: readonly BattleReducerRouteOwnerGroup[] =
    addedEffectKinds.has("hitPointMaximumIncrease") ? ["battleHitPoint"] : [];
  const concentrationOwners: readonly BattleReducerRouteOwnerGroup[] =
    combatantConcentrationChanged(before, after, actorId)
      ? ["battleConcentration"]
      : [];
  return [
    ...activeEffectOwners,
    ...projectionOwners,
    ...hitPointOwners,
    ...concentrationOwners,
  ];
}

function composeWithWildShapeLifecycleTerminalRoute(
  route: BattleReducerRouteEvents | undefined,
  wildShapeLifecycleTerminalRoute: BattleReducerRouteEvents | undefined,
): BattleReducerRouteEvents | undefined {
  if (route === undefined) {
    return wildShapeLifecycleTerminalRoute;
  }
  if (wildShapeLifecycleTerminalRoute === undefined) {
    return route;
  }
  const [first, ...rest] = route;
  return [first, ...rest, ...wildShapeLifecycleTerminalRoute];
}

function scalarBuffAddedActiveEffectKinds(
  before: BattleState,
  after: BattleState,
): ReadonlySet<BattleActiveEffect["kind"]> {
  const added = new Set<BattleActiveEffect["kind"]>();
  for (const combatant of after.combatants.values()) {
    const beforeCounts = activeEffectKindCounts(
      before.combatants.get(combatant.combatantId)?.activeEffects ?? [],
    );
    const afterCounts = activeEffectKindCounts(combatant.activeEffects);
    for (const [kind, count] of afterCounts) {
      if (count > (beforeCounts.get(kind) ?? 0)) {
        added.add(kind);
      }
    }
  }
  return added;
}

function activeEffectKindCounts(
  activeEffects: readonly BattleActiveEffect[],
): ReadonlyMap<BattleActiveEffect["kind"], number> {
  const counts = new Map<BattleActiveEffect["kind"], number>();
  for (const effect of activeEffects) {
    counts.set(effect.kind, (counts.get(effect.kind) ?? 0) + 1);
  }
  return counts;
}

function scalarBuffResolveWithoutFill(
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectWithoutFillRoute("scalarBuffEffect", holes, owner);
}

export function findFamiliarCompanionLifecycleRouteEvents(): BattleReducerRouteEvents {
  return [
    discoverBattleActsRoute("companionLifecycle", [], "battleCompanion"),
    resolveBattleSubjectWithoutFillRoute(
      "companionLifecycle",
      [],
      "battleCompanion",
    ),
  ];
}

function companionRouteForDiscoveredAct(
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvent | undefined {
  if (act.subject.tag === "companionLifecycle") {
    return discoverBattleActsRoute(
      "companionLifecycle",
      battleReducerRouteHoles(act.initialHoles),
      "battleCompanion",
    );
  }
  if (act.subject.tag === "findFamiliarSharedSenses") {
    return discoverBattleActsRoute(
      "companionSharedSenses",
      battleReducerRouteHoles(act.initialHoles),
      "battleCompanion",
    );
  }
  if (act.subject.tag === "findFamiliarTouchSpell") {
    return discoverBattleActsRoute(
      "companionTouchDelivery",
      battleReducerRouteHoles(act.initialHoles),
      "battleSpellSlotAndActionEconomy",
    );
  }
  if (act.subject.tag === "pactOfTheChainFamiliarAttack") {
    return discoverBattleActsRoute(
      "companionReactionAttack",
      battleReducerRouteHoles(act.initialHoles),
      "battleCompanion",
    );
  }
  return undefined;
}

function companionRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (result.tag === "invalid") {
    return undefined;
  }
  if (input.subject.tag === "companionLifecycle") {
    return [
      resolveBattleSubjectWithoutFillRoute(
        "companionLifecycle",
        result.tag === "needsHoles"
          ? battleReducerRouteHoles(result.holes)
          : [],
        "battleCompanion",
      ),
    ];
  }
  if (input.subject.tag === "findFamiliarSharedSenses") {
    return result.tag === "resolved"
      ? [
          resolveBattleSubjectWithoutFillRoute(
            "companionSharedSenses",
            [],
            "battleActionEconomy",
          ),
          resolveBattleSubjectWithoutFillRoute(
            "companionSharedSenses",
            [],
            "battleActiveEffect",
          ),
        ]
      : undefined;
  }
  if (input.subject.tag === "findFamiliarTouchSpell") {
    return findFamiliarTouchDeliveryRouteForResolution(input, result);
  }
  if (input.subject.tag === "pactOfTheChainFamiliarAttack") {
    return pactFamiliarReactionAttackRouteForResolution(input, result);
  }
  return undefined;
}

function findFamiliarTouchDeliveryRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return undefined;
  }
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill !== "targetChoice" && routeFill !== "rolledDice") {
    return undefined;
  }
  const event: BattleReducerRouteEvent = resolveBattleSubjectRoute(
    "companionTouchDelivery",
    routeFill,
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [],
    routeFill === "targetChoice"
      ? "battleCompanion"
      : "battleSpellSlotAndActionEconomy",
  );
  return routeFill === "rolledDice" && result.tag === "resolved"
    ? [
        event,
        resolveBattleSubjectWithoutFillRoute(
          "companionTouchDelivery",
          [],
          "battleActionEconomy",
        ),
      ]
    : [event];
}

function pactFamiliarReactionAttackRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return [
      resolveBattleSubjectWithoutFillRoute(
        "companionReactionAttack",
        result.tag === "needsHoles"
          ? battleReducerRouteHoles(result.holes)
          : [],
        "battleStatBlockAction",
      ),
    ];
  }
  const routeFill = battleReducerRouteFill(fill);
  if (
    routeFill !== "targetChoice" &&
    routeFill !== "attackRoll" &&
    routeFill !== "rolledDice"
  ) {
    return undefined;
  }
  const event: BattleReducerRouteEvent = resolveBattleSubjectRoute(
    "companionReactionAttack",
    routeFill,
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [],
    routeFill === "targetChoice"
      ? "battleTargetSelection"
      : routeFill === "attackRoll"
        ? "battleAttackRoll"
        : "battleHitPoint",
  );
  return routeFill === "rolledDice" && result.tag === "resolved"
    ? [
        event,
        resolveBattleSubjectWithoutFillRoute(
          "companionReactionAttack",
          [],
          "battleActionEconomy",
        ),
      ]
    : [event];
}

function sleepRepeatSaveRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvent | undefined {
  if (!isSleepTargetAdmissionSubject(state, act.subject)) {
    return undefined;
  }
  return discoverBattleActsRoute(
    "repeatSaveConditionEffect",
    sleepTargetAdmissionRouteHoles(act.initialHoles),
    "battleSpellSlotAndActionEconomy",
  );
}

function sleepRepeatSaveRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  const endConcentrationRoute = sleepRepeatSaveConcentrationBreakRoute(
    input,
    result,
  );
  if (endConcentrationRoute !== undefined) {
    return endConcentrationRoute;
  }

  const turnBoundaryRoute = sleepRepeatSaveTurnBoundaryRoute(input, result);
  if (turnBoundaryRoute !== undefined) {
    return turnBoundaryRoute;
  }

  if (!isSleepTargetAdmissionSubject(input.state, input.subject)) {
    return undefined;
  }
  if (result.tag !== "resolved") {
    return undefined;
  }
  const fill = sleepRepeatSaveSavingThrowFill(input.fills);
  if (fill === undefined) {
    return undefined;
  }
  return sleepRepeatSaveResolvedRoutes({
    before: input.state,
    after: result.state,
    fill: "savingThrowOutcome",
    includeActiveEffectTransition: false,
    sourceCombatantId: input.subject.actorId,
  });
}

function repeatSaveConditionEffectRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (!isEndTurnSubject(input.subject)) {
    return undefined;
  }
  if (input.fills.length === 0) {
    if (result.tag !== "needsHoles") {
      return undefined;
    }
    const holes = repeatSaveConditionEffectRouteHoles(result.holes);
    if (holes.length === 0) {
      return undefined;
    }
    return [
      discoverBattleActsRoute(
        "repeatSaveConditionEffect",
        holes,
        "battleTurnBoundary",
      ),
    ];
  }
  if (
    result.tag !== "resolved" ||
    !fillsIncludeRepeatSaveConditionEffect(input)
  ) {
    return undefined;
  }
  return nonEmptyRouteEvents([
    ...(combatantsConditionsChanged(input.state, result.state)
      ? [
          resolveBattleSubjectRoute(
            "repeatSaveConditionEffect" as const,
            "savingThrowOutcome" as const,
            [],
            "battleConditionLifecycle" as const,
          ),
        ]
      : []),
    ...(combatantsActiveEffectsChanged(input.state, result.state)
      ? [
          resolveBattleSubjectWithoutFillRoute(
            "repeatSaveConditionEffect" as const,
            [],
            "battleActiveEffect" as const,
          ),
        ]
      : []),
    ...(combatantsConcentrationChanged(input.state, result.state)
      ? [
          resolveBattleSubjectWithoutFillRoute(
            "repeatSaveConditionEffect" as const,
            [],
            "battleConcentration" as const,
          ),
        ]
      : []),
  ]);
}

function fillsIncludeRepeatSaveConditionEffect(
  input: BattleResolutionInput,
): boolean {
  if (!isEndTurnSubject(input.subject)) {
    return false;
  }
  const repeatSaveHoleIds = conditionSpellEndTurnRepeatSaveHoleIds(
    input.state,
    input.subject.actorId,
  );
  return input.fills.some(
    (fill) =>
      fill.kind === "savingThrowOutcome" && repeatSaveHoleIds.has(fill.holeId),
  );
}

function repeatSaveConditionEffectRouteHoles(
  holes: readonly BattleHole[],
): readonly BattleReducerRouteHole[] {
  return battleReducerRouteHoles(holes.filter(isRepeatSaveConditionEffectHole));
}

function isRepeatSaveConditionEffectHole(hole: BattleHole): boolean {
  return (
    "spellConditionEndTurnSave" in hole || "hideousLaughterRepeatSave" in hole
  );
}

function sleepRepeatSaveConcentrationBreakRoute(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    result.tag !== "resolved" ||
    input.subject.tag !== "runtimeCommand" ||
    input.subject.command !== "endConcentration" ||
    !combatantOwnsSleepRepeatSaveEffect(input.state, input.subject.actorId)
  ) {
    return undefined;
  }
  return nonEmptyRouteEvents([
    sleepRepeatSaveResolveWithoutFill([], "battleConcentration"),
    sleepRepeatSaveResolveWithoutFill([], "battleActiveEffect"),
    ...sleepRepeatSaveConditionCleanupRoutes(input.state, result.state),
  ]);
}

function sleepRepeatSaveTurnBoundaryRoute(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (!isEndTurnSubject(input.subject)) {
    return undefined;
  }
  const fill = sleepRepeatSaveEndTurnSavingThrowFill(input);
  if (fill === undefined) {
    if (result.tag === "needsHoles") {
      const holes = sleepRepeatSaveRouteHoles(result.holes);
      return holes.length === 0
        ? undefined
        : [
            discoverBattleActsRoute(
              "repeatSaveConditionEffect",
              holes,
              "battleTurnBoundary",
            ),
          ];
    }
    if (
      result.tag === "resolved" &&
      hasPendingSleepRepeatSaveEffect(input.state)
    ) {
      return [sleepRepeatSaveResolveWithoutFill([], "battleTurnBoundary")];
    }
    return undefined;
  }
  if (
    result.tag !== "resolved" ||
    !hasPendingSleepRepeatSaveEffect(input.state)
  ) {
    return undefined;
  }
  return sleepRepeatSaveResolvedRoutes({
    before: input.state,
    after: result.state,
    fill: "savingThrowOutcome",
    includeActiveEffectTransition: false,
    sourceCombatantId: fill.value.outcomes[0]?.targetId,
  });
}

function sleepRepeatSaveEndTurnSavingThrowFill(
  input: BattleResolutionInput,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> | undefined {
  if (!isEndTurnSubject(input.subject)) {
    return undefined;
  }
  const holeIds = sleepRepeatSaveSavingThrowHoleIds(
    input.state,
    input.subject.actorId,
  );
  return input.fills.find(
    (
      fill,
    ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
      fill.kind === "savingThrowOutcome" && holeIds.has(fill.holeId),
  );
}

function sleepRepeatSaveResolvedRoutes(input: {
  readonly before: BattleState;
  readonly after: BattleState;
  readonly fill: Extract<BattleReducerRouteFill, "savingThrowOutcome">;
  readonly includeActiveEffectTransition: boolean;
  readonly sourceCombatantId: CombatantId | undefined;
}): BattleReducerRouteEvents | undefined {
  const conditionRoutes = combatantsConditionsChanged(input.before, input.after)
    ? [
        resolveBattleSubjectRoute(
          "repeatSaveConditionEffect" as const,
          input.fill,
          [],
          "battleConditionLifecycle" as const,
        ),
      ]
    : [];
  const activeEffectRoutes =
    input.includeActiveEffectTransition ||
    sleepRepeatSaveEffectCount(input.after) !==
      sleepRepeatSaveEffectCount(input.before)
      ? [sleepRepeatSaveResolveWithoutFill([], "battleActiveEffect")]
      : [];
  const concentrationRoutes =
    input.sourceCombatantId !== undefined &&
    combatantConcentrationChanged(
      input.before,
      input.after,
      input.sourceCombatantId,
    )
      ? [sleepRepeatSaveResolveWithoutFill([], "battleConcentration")]
      : [];
  return nonEmptyRouteEvents([
    ...conditionRoutes,
    ...activeEffectRoutes,
    ...concentrationRoutes,
  ]);
}

function sleepRepeatSaveConditionCleanupRoutes(
  before: BattleState,
  after: BattleState,
): readonly BattleReducerRouteEvent[] {
  return combatantsConditionsChanged(before, after)
    ? [sleepRepeatSaveResolveWithoutFill([], "battleConditionLifecycle")]
    : [];
}

function sleepRepeatSaveResolveWithoutFill(
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectWithoutFillRoute(
    "repeatSaveConditionEffect",
    holes,
    owner,
  );
}

function turnBoundaryEffectLifecycleRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (!isEndTurnSubject(input.subject)) {
    return undefined;
  }
  if (!battleHasTurnBoundaryLifecycleEffects(input.state)) {
    return undefined;
  }
  if (result.tag === "invalid") {
    return undefined;
  }
  const fill = input.fills.at(-1);
  const holes =
    result.tag === "needsHoles"
      ? turnBoundaryEffectLifecycleRouteHoles(result.holes)
      : [];
  if (fill === undefined) {
    const discovery = turnBoundaryEffectLifecycleDiscoveryRouteForResolution(
      input,
      result,
    );
    return discovery === undefined ? undefined : [discovery];
  }

  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === "rolledDice") {
    const hitPointRoute: BattleReducerRouteEvent = resolveBattleSubjectRoute(
      "turnBoundaryEffectLifecycle",
      routeFill,
      holes,
      "battleHitPoint",
    );
    const concentrationRoute =
      turnBoundaryEffectLifecycleConcentrationRouteForResolution(
        routeFill,
        result,
      );
    return result.tag === "resolved" && holes.length === 0
      ? [
          hitPointRoute,
          turnBoundaryEffectLifecycleResolveWithoutFill("battleActiveEffect"),
          turnBoundaryEffectLifecycleResolveWithoutFill("battleTurnBoundary"),
        ]
      : nonEmptyRouteEvents([
          hitPointRoute,
          ...(concentrationRoute === undefined ? [] : [concentrationRoute]),
        ]);
  }
  if (routeFill === "savingThrowOutcome") {
    if (
      fill.kind !== "savingThrowOutcome" ||
      !isTurnBoundaryEffectLifecycleSavingThrowFill(input.state, fill)
    ) {
      return undefined;
    }
    return [
      resolveBattleSubjectRoute(
        "turnBoundaryEffectLifecycle",
        routeFill,
        holes,
        "battleActiveEffect",
      ),
    ];
  }
  return undefined;
}

function turnBoundaryEffectLifecycleConcentrationRouteForResolution(
  fill: BattleReducerRouteFill,
  result: BattleResolutionResult,
): BattleReducerRouteEvent | undefined {
  if (result.tag !== "needsHoles") {
    return undefined;
  }
  const holes = concentrationSavingThrowRouteHoles(result.holes);
  if (holes.length === 0) {
    return undefined;
  }
  return resolveBattleSubjectRoute(
    "concentrationTeardown",
    fill,
    holes,
    "battleConcentration",
  );
}

function turnBoundaryEffectLifecycleDiscoveryRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvent | undefined {
  if (!isEndTurnSubject(input.subject)) {
    return undefined;
  }
  if (!battleHasTurnBoundaryLifecycleEffects(input.state)) {
    return undefined;
  }
  if (result.tag !== "needsHoles") {
    return undefined;
  }
  const holes = turnBoundaryEffectLifecycleRouteHoles(result.holes);
  if (holes.length === 0) {
    return undefined;
  }
  return discoverBattleActsRoute(
    "turnBoundaryEffectLifecycle",
    holes,
    "battleTurnBoundary",
  );
}

function turnBoundaryEffectLifecycleResolveWithoutFill(
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectWithoutFillRoute(
    "turnBoundaryEffectLifecycle",
    [],
    owner,
  );
}

function spellBaseArmorClassEffectTurnBoundaryRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    !isEndTurnSubject(input.subject) ||
    input.fills.length !== 0 ||
    result.tag !== "resolved" ||
    !spellBaseArmorClassEffectExpired(input.state, result.state)
  ) {
    return undefined;
  }
  return [
    discoverBattleActsRoute(
      "spellBaseArmorClassEffect",
      [],
      "battleActiveEffect",
    ),
    spellBaseArmorClassEffectResolveWithoutFill("battleTurnBoundary"),
    spellBaseArmorClassEffectResolveWithoutFill("battleActiveEffect"),
    spellBaseArmorClassEffectResolveWithoutFill("battleArmorClass"),
  ];
}

function battleHasTurnBoundaryLifecycleEffects(state: BattleState): boolean {
  return [...state.combatants.values()].some((combatant) =>
    combatant.activeEffects.some(isTurnBoundaryLifecycleEffect),
  );
}

function isTurnBoundaryLifecycleEffect(effect: BattleActiveEffect): boolean {
  return (
    effect.kind === "spellTurnStartDamageAndSave" ||
    effect.kind === "spellTurnEndDamage" ||
    (effect.kind === "spellCondition" && effect.turnStartDamage !== null)
  );
}

function isTurnBoundaryEffectLifecycleSavingThrowFill(
  state: BattleState,
  fill: Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>,
): boolean {
  return [...state.combatants.values()].some((combatant) =>
    combatant.activeEffects.some(
      (effect) =>
        effect.kind === "spellTurnStartDamageAndSave" &&
        fill.holeId ===
          spellTurnStartSavingThrowOutcomeHoleId(combatant.combatantId, effect),
    ),
  );
}

function turnBoundaryEffectLifecycleRouteHoles(
  holes: readonly BattleHole[],
): readonly BattleReducerRouteHole[] {
  return battleReducerRouteHoles(
    holes.filter(isTurnBoundaryEffectLifecycleHole),
  );
}

function concentrationSavingThrowRouteHoles(
  holes: readonly BattleHole[],
): readonly BattleReducerRouteHole[] {
  return battleReducerRouteHoles(
    holes.filter((hole) => hole.kind === "concentrationSavingThrow"),
  );
}

function isTurnBoundaryEffectLifecycleHole(hole: BattleHole): boolean {
  return (
    (hole.kind === "rolledDice" &&
      ("spellTurnStartDamage" in hole || "spellTurnEndDamage" in hole)) ||
    (hole.kind === "savingThrowOutcome" && "spellTurnStartSave" in hole)
  );
}

function sleepRepeatSaveSavingThrowFill(
  fills: readonly BattleFill[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> | undefined {
  return fills.find(
    (
      fill,
    ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
      fill.kind === "savingThrowOutcome",
  );
}

function sleepRepeatSaveRouteHoles(
  holes: readonly BattleHole[],
): readonly BattleReducerRouteHole[] {
  return battleReducerRouteHoles(
    holes.filter(
      (hole) => hole.kind === "savingThrowOutcome" && "sleepRepeatSave" in hole,
    ),
  );
}

function sleepTargetAdmissionRouteHoles(
  holes: readonly BattleHole[],
): readonly BattleReducerRouteHole[] {
  const savingThrowHoles = holes.filter(
    (hole) => hole.kind === "savingThrowOutcome",
  );
  if (savingThrowHoles.length !== 1) {
    throw new Error(
      "Admitted Sleep target selection must own exactly one Saving Throw outcome hole.",
    );
  }
  return battleReducerRouteHoles(savingThrowHoles);
}

function hasPendingSleepRepeatSaveEffect(state: BattleState): boolean {
  return [...state.combatants.values()].some((combatant) =>
    combatant.activeEffects.some(
      (effect) => effect.kind === "sleepPendingRepeatSave",
    ),
  );
}

function combatantOwnsSleepRepeatSaveEffect(
  state: BattleState,
  combatantId: CombatantId,
): boolean {
  return [...state.combatants.values()].some((combatant) =>
    combatant.activeEffects.some(
      (effect) =>
        (effect.kind === "sleepPendingRepeatSave" ||
          effect.kind === "sleepUnconscious") &&
        effect.expiresAt.combatantId === combatantId,
    ),
  );
}

function sleepRepeatSaveEffectCount(state: BattleState): number {
  return [...state.combatants.values()].reduce(
    (count, combatant) =>
      count +
      combatant.activeEffects.filter(
        (effect) =>
          effect.kind === "sleepPendingRepeatSave" ||
          effect.kind === "sleepUnconscious",
      ).length,
    0,
  );
}

function hasConcentratingRollModifierEffect(
  state: BattleState,
  combatantId: CombatantId,
): boolean {
  return [...state.combatants.values()].some((combatant) =>
    combatant.activeEffects.some(
      (effect) =>
        (effect.kind === "d20RollModifier" ||
          effect.kind === "abilityCheckRollMode") &&
        effect.expiresAt.kind === "concentration" &&
        effect.expiresAt.combatantId === combatantId,
    ),
  );
}

function rollModifierRouteHoles(
  holes: readonly BattleHole[],
): readonly BattleReducerRouteHole[] {
  return [...new Set(holes.flatMap(rollModifierRouteHole))].sort();
}

function rollModifierRouteHole(
  hole: BattleHole,
): readonly BattleReducerRouteHole[] {
  const family = battleHoleFamilyKind(hole);
  if (family === "abilityChoice") return ["abilityChoice"];
  if (family === "savingThrowOutcome") return ["savingThrowOutcome"];
  if (family === "skillChoice") return ["skillChoice"];
  if (family === "targetAbilityChoices") return ["targetAbilityChoices"];
  return [];
}

function rollModifierRouteFill(
  fill: BattleFill,
): BattleReducerRouteFill | undefined {
  if (fill.kind === "savingThrowOutcome") return "savingThrowOutcome";
  if (fill.kind === "skillChoice") {
    return { kind: "skillChoice", skill: fill.value };
  }
  if (fill.kind === "abilityChoice") {
    return { kind: "abilityChoice", ability: fill.value };
  }
  if (fill.kind === "targetAbilityChoices") {
    const [primary, secondary, third] = fill.value.choices;
    if (
      primary === undefined ||
      secondary === undefined ||
      third !== undefined
    ) {
      return undefined;
    }
    return {
      kind: "targetAbilityChoices",
      choices: {
        primary: primary.ability,
        secondary: secondary.ability,
      },
    };
  }
  return undefined;
}

function creatureAttackRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (input.subject.tag !== "creatureAttack") {
    return undefined;
  }
  const fill = input.fills.at(-1);
  if (fill === undefined || result.tag === "invalid") {
    return undefined;
  }
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === "attackRoll" && fill.kind === "attackRoll") {
    const target = input.state.combatants.get(input.subject.targetId);
    if (target === undefined) {
      return undefined;
    }
    const holes = creatureAttackHit({
      state: input.state,
      target,
      attackRoll: fill,
    })
      ? result.tag === "needsHoles"
        ? battleReducerRouteHoles(result.holes)
        : []
      : [];
    return [
      resolveBattleSubjectRoute(
        "creatureAttack",
        routeFill,
        holes,
        "battleAttackRoll",
      ),
    ];
  }
  if (routeFill !== "rolledDice") {
    return undefined;
  }
  return [
    resolveBattleSubjectRoute(
      "creatureAttack",
      routeFill,
      result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [],
      "battleHitPoint",
    ),
  ];
}

function weaponAttackRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (!isWeaponAttackSubject(input.subject)) {
    return undefined;
  }

  const routeSubject = attackRouteSubject(input.state, input.subject);
  const fill = input.fills.at(-1);
  if (fill === undefined) {
    if (result.tag !== "invalid" || result.reason !== "staleSubject") {
      return undefined;
    }
    return [
      resolveBattleSubjectWithoutFillRoute(
        "weaponAttack",
        [],
        "battleHoleFrontier",
      ),
    ];
  }
  if (fill.kind === "attackDamageDisposition") {
    const transferRoute = markedDamageRiderTransferRouteForResolution({
      state: input.state,
      result,
      holes: [],
    });
    if (transferRoute !== undefined) {
      return transferRoute;
    }
  }
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === undefined) {
    return undefined;
  }
  if (result.tag === "invalid") {
    return weaponAttackInvalidFillRoute(result, routeSubject, routeFill);
  }
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  const hostedRoute = weaponHostedAttackCompositionRouteForResolution({
    state: input.state,
    subject: input.subject,
    fill: routeFill,
    holes,
    result,
  });
  if (hostedRoute !== undefined) {
    return hostedRoute;
  }
  const event = (
    subject: BattleReducerRouteSubjectFamily,
    owner: BattleReducerRouteOwnerGroup,
  ): BattleReducerRouteEvent =>
    resolveBattleSubjectRoute(subject, routeFill, holes, owner);

  if (weaponMasteryCleaveRouteStarted(input.fills)) {
    return weaponMasteryCleaveRouteForResolution(input, result, event);
  }

  if (routeFill === "targetChoice") {
    return [
      event(routeSubject, "battleTargetSelection"),
      ...protectionCharmAttackRollModeRouteForResolution(input, result),
    ];
  }
  if (routeFill === "attackRoll") {
    return holes.includes("savingThrowOutcome")
      ? [event("weaponMasteryProperty", "battleConditionLifecycle")]
      : [event(routeSubject, "battleAttackRoll")];
  }
  if (routeFill === "savingThrowOutcome") {
    return [event("weaponMasteryProperty", "battleConditionLifecycle")];
  }
  if (routeFill !== "rolledDice") {
    return undefined;
  }

  const weaponDamageRoute = event(routeSubject, "battleHitPoint");
  const routeTail: BattleReducerRouteEvent[] = [];
  if (battleHasAfterHitAttackDamageAddition(input.state)) {
    routeTail.push(event("afterHitSpell", "battleHitPoint"));
  }
  routeTail.push(...charmSourceDamageBreakRouteForResolution(input, result));
  if (holes.includes("unitFeatureDecision")) {
    routeTail.push(
      resolveBattleSubjectWithoutFillRoute(
        "weaponMasteryProperty",
        holes,
        "battleFeatureResource",
      ),
    );
  } else if (combatantsActiveEffectsChanged(input.state, result.state)) {
    routeTail.push(
      resolveBattleSubjectWithoutFillRoute(
        "weaponMasteryProperty",
        holes,
        "battleActiveEffect",
      ),
    );
  }
  if (
    input.state.interruptStack.at(-1)?.kind === "replayContinuation" &&
    result.tag === "resolved"
  ) {
    routeTail.push(
      resolveBattleSubjectWithoutFillRoute(
        "interruptStackResume",
        [],
        "battleInterruptStack",
      ),
    );
  }
  return [weaponDamageRoute, ...routeTail];
}

function weaponHostedAttackCompositionRouteForResolution(input: {
  readonly state: BattleState;
  readonly subject: WeaponAttackResolutionSubject;
  readonly fill: BattleReducerRouteFill;
  readonly holes: readonly BattleReducerRouteHole[];
  readonly result: Exclude<BattleResolutionResult, { readonly tag: "invalid" }>;
}): BattleReducerRouteEvents | undefined {
  const selectedAttack = attackActionOptionForSubject(
    input.state,
    input.subject,
  );
  const heldWeaponSubject =
    selectedAttack !== undefined &&
    weaponAttackUsesActiveSpellOverride(
      input.state,
      input.subject.actorId,
      selectedAttack,
    )
      ? "heldWeaponActiveEffect"
      : undefined;
  const hasMarkedDamageRider = battleCombatantHasActiveEffectKind(
    input.state,
    input.subject.actorId,
    "spellMarkedDamageRider",
  );
  const hasWeaponDamageRider =
    selectedAttack?.kind === "weapon" &&
    battleCombatantHasActiveEffectKind(
      input.state,
      input.subject.actorId,
      "spellWeaponDamageRider",
    );
  if (
    heldWeaponSubject === undefined &&
    !hasMarkedDamageRider &&
    !hasWeaponDamageRider
  ) {
    return undefined;
  }

  const route: BattleReducerRouteEvent[] = [];
  if (input.fill === "targetChoice") {
    if (hasMarkedDamageRider && input.result.tag === "needsHoles") {
      route.push(
        effectRouteResolve(
          "markedDamageRiderEffect",
          input.fill,
          input.holes,
          "battleTargetSelection",
        ),
      );
    }
    if (heldWeaponSubject !== undefined && input.result.tag === "needsHoles") {
      route.push(
        effectRouteDiscover(
          heldWeaponSubject,
          input.holes,
          "battleActiveEffect",
        ),
      );
    }
    return nonEmptyRouteEvents(route);
  }

  if (input.fill === "attackRoll") {
    if (hasMarkedDamageRider) {
      route.push(
        effectRouteResolve(
          "markedDamageRiderEffect",
          input.fill,
          input.holes,
          "battleAttackRoll",
        ),
      );
    }
    if (heldWeaponSubject !== undefined) {
      route.push(
        effectRouteResolve(
          heldWeaponSubject,
          input.fill,
          input.holes,
          "battleAttackRoll",
        ),
      );
      if (input.result.tag === "needsHoles") {
        route.push(
          effectRouteDiscover(
            heldWeaponSubject,
            input.holes,
            "battleActiveEffect",
          ),
        );
      }
    }
    if (battleHasWeaponDamageRiderHole(input.result)) {
      route.push(
        effectRouteDiscover(
          "weaponDamageRider",
          input.holes,
          "battleActiveEffect",
        ),
      );
    }
    return nonEmptyRouteEvents(route);
  }

  if (input.fill === "rolledDice") {
    if (heldWeaponSubject !== undefined) {
      route.push(
        effectRouteResolve(
          heldWeaponSubject,
          input.fill,
          input.holes,
          "battleHitPoint",
        ),
      );
    }
    if (hasMarkedDamageRider) {
      route.push(
        effectRouteResolve(
          "markedDamageRiderEffect",
          input.fill,
          input.holes,
          "battleHitPoint",
        ),
      );
      route.push(
        ...(markedDamageRiderTransferRouteForResolution({
          state: input.state,
          result: input.result,
          holes: input.holes,
        }) ?? []),
      );
    }
    if (hasWeaponDamageRider) {
      route.push(
        effectRouteResolve(
          "weaponDamageRider",
          input.fill,
          input.holes,
          "battleHitPoint",
        ),
      );
    }
    return nonEmptyRouteEvents(route);
  }

  return undefined;
}

function weaponAttackInvalidFillRoute(
  result: Extract<BattleResolutionResult, { readonly tag: "invalid" }>,
  subject: BattleReducerRouteSubjectFamily,
  routeFill: BattleReducerRouteFill,
): BattleReducerRouteEvents | undefined {
  const holes = weaponAttackOrderingInvalidHoles(result, routeFill);
  if (holes !== undefined) {
    return [
      resolveBattleSubjectRoute(
        subject,
        routeFill,
        holes,
        "battleHoleFrontier",
      ),
    ];
  }
  if (routeFill !== "targetChoice") {
    return undefined;
  }
  return [
    resolveBattleSubjectRoute(
      subject,
      routeFill,
      ["targetChoice"],
      "battleTargetSelection",
    ),
  ];
}

function weaponAttackOrderingInvalidHoles(
  result: Extract<BattleResolutionResult, { readonly tag: "invalid" }>,
  routeFill: BattleReducerRouteFill,
): readonly ["targetChoice"] | readonly ["attackRoll"] | undefined {
  if (
    result.reason === "invalidFill" &&
    result.message === ATTACK_TARGET_REQUIRED_BEFORE_ROLL_OR_DAMAGE_MESSAGE &&
    routeFill === "attackRoll"
  ) {
    return ["targetChoice"] as const;
  }
  if (
    result.reason === "invalidFill" &&
    result.message === ATTACK_ROLL_REQUIRED_BEFORE_DAMAGE_MESSAGE &&
    routeFill === "rolledDice"
  ) {
    return ["attackRoll"] as const;
  }
  return undefined;
}

function protectionCharmAttackRollModeRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): readonly BattleReducerRouteEvent[] {
  if (result.tag !== "needsHoles") {
    return [];
  }
  const targetFill = input.fills.at(-1);
  if (targetFill?.kind !== "targetChoice") {
    return [];
  }
  const source = input.state.combatants.get(input.subject.actorId);
  const target = input.state.combatants.get(targetFill.value);
  const sourceCreatureType =
    source === undefined ? null : battleCreatureType(source);
  if (
    sourceCreatureType === null ||
    target === undefined ||
    !result.holes.some(
      (hole) => hole.kind === "attackRoll" && hole.rollMode === "disadvantage",
    ) ||
    !target.activeEffects.some(
      (effect) =>
        effect.kind === "creatureTypeProtection" &&
        effect.protectedAgainstCreatureTypes.includes(sourceCreatureType),
    )
  ) {
    return [];
  }
  return [
    protectionCharmDiscover([], "battleActiveEffect"),
    protectionCharmResolveWithoutFill([], "battleAttackRoll"),
  ];
}

function charmSourceDamageBreakRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): readonly BattleReducerRouteEvent[] {
  if (
    result.tag !== "resolved" ||
    !targetDamagedByCasterOrAllySpellConditionRemoved(input.state, result.state)
  ) {
    return [];
  }
  return [
    resolveBattleSubjectWithoutFillRoute(
      "charmSourceDamageBreak",
      [],
      "battleHitPoint",
    ),
    resolveBattleSubjectWithoutFillRoute(
      "charmSourceDamageBreak",
      [],
      "battleConditionLifecycle",
    ),
    resolveBattleSubjectWithoutFillRoute(
      "charmSourceDamageBreak",
      [],
      "battleActiveEffect",
    ),
  ];
}

function weaponMasteryCleaveRouteStarted(
  fills: readonly BattleFill[],
): boolean {
  return fills.some((fill) => fill.kind === "unitFeatureDecision");
}

function weaponMasteryCleaveRouteForResolution(
  input: BattleResolutionInput,
  result: Exclude<BattleResolutionResult, { readonly tag: "invalid" }>,
  event: (
    subject: BattleReducerRouteSubjectFamily,
    owner: BattleReducerRouteOwnerGroup,
  ) => BattleReducerRouteEvent,
): BattleReducerRouteEvents | undefined {
  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return undefined;
  }
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === "unitFeatureDecision") {
    return [event("weaponMasteryProperty", "battleFeatureResource")];
  }
  if (routeFill === "targetChoice") {
    return [event("weaponMasteryProperty", "battleTargetSelection")];
  }
  if (routeFill === "attackRoll") {
    return [event("weaponMasteryProperty", "battleAttackRoll")];
  }
  if (routeFill !== "rolledDice" || result.tag !== "resolved") {
    return undefined;
  }
  return [
    event("weaponMasteryProperty", "battleHitPoint"),
    resolveBattleSubjectWithoutFillRoute(
      "weaponMasteryProperty",
      [],
      "battleFeatureResource",
    ),
  ];
}

function commandRouteHolesAfter(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): readonly BattleReducerRouteHole[] {
  if (result.tag === "needsHoles") {
    return battleReducerRouteHoles(result.holes);
  }
  if (
    result.tag === "invalid" &&
    input.subject.tag === "runtimeCommand" &&
    input.subject.command === "commandFlee" &&
    input.fills.at(-1)?.kind === "movement"
  ) {
    return ["movement"];
  }
  return [];
}

function commandRouteFill(
  fill: BattleFill,
): BattleReducerRouteFill | undefined {
  const kind = battleFillKind(fill);
  if (kind === "commandOptionChoice") return "commandOptionChoice";
  if (kind === "movement") return "movement";
  if (kind === "savingThrowOutcome") return "savingThrowOutcome";
  if (kind === "spellTargetList") return "spellTargetList";
  return undefined;
}

function isSpellAttackProcedure(procedure: string): boolean {
  return (
    procedure === "chainedSpellAttackDamage" ||
    procedure === "spellAttackDamage" ||
    procedure === "spellAttackSequence"
  );
}

function isSlotSpellDiscoverySubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): boolean {
  return isSlotSpellResolutionSubject(state, subject);
}

function isSlotSpellResolutionSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): subject is Extract<
  BattleResolutionInput["subject"],
  { readonly tag: "actionSpell" }
> {
  const invocation = spellInvocationForRouteSubject(state, subject);
  return (
    subject.tag === "actionSpell" &&
    invocation?.resource.tag === "spellSlot" &&
    invocation.procedure === "repeatedDamageAllocation"
  );
}

function isSaveGatedSpellResolution(input: BattleResolutionInput): boolean {
  if (input.subject.tag === "actionSpell") {
    const invocation = spellInvocationForRouteSubject(
      input.state,
      input.subject,
    );
    return (
      invocation !== undefined &&
      isSaveGatedSpellProcedure(invocation.procedure)
    );
  }
  if (
    input.subject.tag === "runtimeCommand" &&
    input.subject.command === "releaseReadiedSpell"
  ) {
    const readied = input.state.readiedSpells.get(
      input.subject.readiedSpellCasterId,
    );
    const caster = input.state.combatants.get(
      input.subject.readiedSpellCasterId,
    );
    const invocation =
      readied !== undefined && caster?.origin.kind === "character"
        ? characterSpellProcedure(
            caster.origin.execution,
            readied.procedureRef,
            caster,
          )
        : undefined;
    return (
      invocation !== undefined &&
      isSaveGatedSpellProcedure(invocation.procedure)
    );
  }
  return false;
}

function isSaveGatedSpellProcedure(procedure: string): boolean {
  return (
    procedure === "hypnoticPattern" ||
    procedure === "saveGatedDamage" ||
    procedure === "saveGatedCondition"
  );
}

function isRollModifierEffectDiscoverySubject(
  state: BattleState,
  subject: BattleActDiscoveryCandidate["subject"],
): subject is Extract<
  BattleActDiscoveryCandidate["subject"],
  { readonly tag: "actionSpell" }
> {
  return (
    subject.tag === "actionSpell" &&
    (spellInvocationForRouteSubject(state, subject)?.procedure ===
      "rollModifier" ||
      spellInvocationForRouteSubject(state, subject)?.procedure ===
        "thaumaturgyBoomingVoice")
  );
}

function isRollModifierEffectResolutionSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): subject is Extract<
  BattleResolutionInput["subject"],
  { readonly tag: "actionSpell" }
> {
  return (
    subject.tag === "actionSpell" &&
    (spellInvocationForRouteSubject(state, subject)?.procedure ===
      "rollModifier" ||
      spellInvocationForRouteSubject(state, subject)?.procedure ===
        "thaumaturgyBoomingVoice")
  );
}

function isScalarBuffEffectSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): subject is Extract<
  BattleResolutionInput["subject"],
  { readonly tag: "actionSpell" | "bonusActionSpell" }
> {
  return (
    (subject.tag === "actionSpell" || subject.tag === "bonusActionSpell") &&
    spellInvocationForRouteSubject(state, subject)?.procedure === "scalarBuff"
  );
}

function isSanctuaryTargetingInterdictionSubject(
  state: BattleState,
  subject:
    | BattleResolutionInput["subject"]
    | BattleActDiscoveryCandidate["subject"],
): subject is Extract<
  BattleResolutionInput["subject"],
  { readonly tag: "bonusActionSpell" }
> {
  return (
    subject.tag === "bonusActionSpell" &&
    spellInvocationForRouteSubject(state, subject)?.procedure ===
      "sanctuaryTargetingInterdiction"
  );
}

function isSleepTargetAdmissionSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): subject is Extract<
  BattleResolutionInput["subject"],
  { readonly tag: "actionSpell" }
> {
  return (
    subject.tag === "actionSpell" &&
    spellInvocationForRouteSubject(state, subject)?.procedure ===
      "sleepTargetAdmission"
  );
}

function isWeaponAttackSubject(
  subject: BattleResolutionInput["subject"],
): subject is WeaponAttackResolutionSubject {
  return subject.tag === "action" && subject.action === "attack";
}

function isStatBlockActionRouteSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): boolean {
  if (subject.tag !== "action") {
    return false;
  }
  if (subject.action !== "attack" && subject.action !== "multiattack") {
    return false;
  }
  return state.combatants.get(subject.actorId)?.origin.kind === "statBlock";
}

function attackRouteSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): "statBlockAction" | "weaponAttack" {
  return isStatBlockActionRouteSubject(state, subject)
    ? "statBlockAction"
    : "weaponAttack";
}

function battleActionRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvent | undefined {
  if (input.subject.tag === "runtimeCommand") {
    if (input.subject.command !== "endTurn") {
      return undefined;
    }
    if (input.fills.length !== 0) {
      return undefined;
    }
    return resolveBattleSubjectWithoutFillRoute(
      "battleAction",
      [],
      "battleActionEconomy",
    );
  }
  if (
    input.subject.tag !== "action" ||
    input.subject.action !== "multiattack" ||
    !isStatBlockActionRouteSubject(input.state, input.subject) ||
    input.fills.length !== 0
  ) {
    return undefined;
  }
  if (
    result.tag !== "resolved" &&
    (result.tag !== "invalid" || result.reason !== "staleSubject")
  ) {
    return undefined;
  }
  return resolveBattleSubjectWithoutFillRoute(
    "statBlockAction",
    [],
    "battleStatBlockAction",
  );
}

function isCommandEffectSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): boolean {
  if (subject.tag === "actionSpell") {
    return (
      spellInvocationForRouteSubject(state, subject)?.procedure === "command"
    );
  }
  if (subject.tag !== "runtimeCommand") {
    return false;
  }
  return (
    isCommandPendingRuntimeSubject(subject) || subject.command === "endTurn"
  );
}

function isConcentrationTeardownSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): boolean {
  if (subject.tag === "actionSpell") {
    return (
      spellInvocationForRouteSubject(state, subject)?.procedure ===
      "blurAttackRollDefense"
    );
  }
  if (subject.tag === "action" && subject.action === "attack") {
    return true;
  }
  return (
    subject.tag === "runtimeCommand" && subject.command === "endConcentration"
  );
}

function isConcentrationTeardownDiscoverySubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): boolean {
  if (subject.tag === "actionSpell") {
    return (
      spellInvocationForRouteSubject(state, subject)?.procedure ===
      "blurAttackRollDefense"
    );
  }
  return (
    subject.tag === "runtimeCommand" && subject.command === "endConcentration"
  );
}

function isCommandEffectDiscoverySubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): boolean {
  if (subject.tag === "actionSpell") {
    return (
      spellInvocationForRouteSubject(state, subject)?.procedure === "command"
    );
  }
  if (subject.tag !== "runtimeCommand") {
    return false;
  }
  return isCommandPendingRuntimeSubject(subject);
}

function isHitPointRestorationSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): boolean {
  if (subject.tag === "actionSpell" || subject.tag === "bonusActionSpell") {
    return (
      spellInvocationForRouteSubject(state, subject)?.procedure ===
      "directHitPointRestoration"
    );
  }
  return false;
}

function isHitPointRestorationResolution(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
  fill: BattleFill,
): boolean {
  if (isHitPointRestorationSubject(state, subject)) {
    return true;
  }
  return (
    subject.tag === "unitFeature" && fill.kind === "hitPointHealingDistribution"
  );
}

function isHitPointRestorationDiscoverySubject(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): boolean {
  if (isHitPointRestorationSubject(state, act.subject)) {
    return act.initialHoles.some(
      (hole) =>
        battleReducerRouteHole(hole).includes("targetChoice") ||
        battleReducerRouteHole(hole).includes("spellTargetList"),
    );
  }
  return (
    act.subject.tag === "unitFeature" &&
    act.initialHoles.some((hole) =>
      battleReducerRouteHole(hole).includes("hitPointHealingDistribution"),
    )
  );
}

function hitPointRestorationDiscoveryOwner(
  subject: BattleResolutionInput["subject"],
): BattleReducerRouteOwnerGroup {
  return subject.tag === "actionSpell" || subject.tag === "bonusActionSpell"
    ? "battleSpellSlotAndActionEconomy"
    : "battleActionEconomy";
}

function isCommandPendingRuntimeSubject(
  subject: Extract<
    BattleResolutionInput["subject"],
    { readonly tag: "runtimeCommand" }
  >,
): boolean {
  return (
    subject.command === "commandGrovel" ||
    subject.command === "commandDrop" ||
    subject.command === "commandApproach" ||
    subject.command === "commandFlee"
  );
}

function spellAttackProcedureRouteOwners(input: {
  input: BattleResolutionInput;
  fill: BattleFill;
  result: BattleResolutionResult;
}): readonly BattleReducerRouteOwnerGroup[] {
  const kind = battleFillKind(input.fill);
  const isChainedSpellAttack =
    input.input.subject.tag === "actionSpell" &&
    spellInvocationForRouteSubject(input.input.state, input.input.subject)
      ?.procedure === "chainedSpellAttackDamage";
  if (kind === "attackRoll") {
    if (spellAttackResolutionRequestsHole(input.result, "targetChoice")) {
      return ["battleHoleFrontier"];
    }
    return ["battleAttackRoll"];
  }
  if (kind === "damageTypeChoice") return ["battleSpellAttackProcedure"];
  if (kind === "rolledDice") {
    if (spellAttackResolutionRequestsHole(input.result, "attackRoll")) {
      return ["battleHoleFrontier"];
    }
    const hitPointOwner =
      input.result.tag === "needsHoles" &&
      input.result.holes.some(
        (hole) => hole.kind === "concentrationSavingThrow",
      )
        ? "battleHitPointAndZeroHpLifecycle"
        : "battleHitPoint";
    return isChainedSpellAttack
      ? [hitPointOwner, "battleSpellAttackProcedure"]
      : [hitPointOwner];
  }
  if (kind === "targetChoice") {
    return isChainedSpellAttack
      ? ["battleTargetSelection", "battleSpellAttackProcedure"]
      : ["battleTargetSelection"];
  }
  if (kind === "concentrationSavingThrow") return ["battleConcentration"];
  return [];
}

function spellAttackResolutionRequestsHole(
  result: BattleResolutionResult,
  holeKind: BattleReducerRouteHole,
): boolean {
  return (
    result.tag === "needsHoles" &&
    battleReducerRouteHoles(result.holes).includes(holeKind)
  );
}

function spellAttackProcedureRouteHoles(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): readonly BattleReducerRouteHole[] {
  if (result.tag !== "needsHoles") {
    return [];
  }
  const holes = battleReducerRouteHoles(result.holes);
  return input.subject.tag === "actionSpell" &&
    spellInvocationForRouteSubject(input.state, input.subject)?.procedure ===
      "spellAttackSequence"
    ? spellAttackSequenceRouteHoles(holes)
    : holes;
}

function spellAttackSequenceRouteHoles(
  holes: readonly BattleReducerRouteHole[],
): readonly BattleReducerRouteHole[] {
  if (holes.includes("targetChoice")) {
    return ["attackRoll", "rolledDice", "targetChoice"];
  }
  if (holes.includes("attackRoll")) {
    return ["attackRoll", "rolledDice"];
  }
  if (holes.includes("rolledDice")) {
    return ["rolledDice"];
  }
  return holes;
}

function zeroHitPointSpellEffectTeardownRouteForResolution(
  input: BattleResolutionInput,
  fill: BattleFill,
  result: BattleResolutionResult,
): readonly BattleReducerRouteEvent[] {
  if (battleFillKind(fill) !== "concentrationSavingThrow") {
    return [];
  }
  if (result.tag === "invalid") {
    return [];
  }
  const teardown = zeroHitPointConcentrationTeardown(input.state, result.state);
  if (teardown === undefined) {
    return [];
  }
  return [
    zeroHitPointSpellEffectTeardownRoute("battleConditionLifecycle"),
    zeroHitPointSpellEffectTeardownRoute("battleConcentration"),
    ...(teardown.concentratingEffectRemoved
      ? [zeroHitPointSpellEffectTeardownRoute("battleActiveEffect")]
      : []),
  ];
}

function zeroHitPointSpellEffectTeardownRoute(
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectWithoutFillRoute(
    "zeroHitPointSpellEffectTeardown",
    [],
    owner,
  );
}

function zeroHitPointConcentrationTeardown(
  before: BattleState,
  after: BattleState,
): { readonly concentratingEffectRemoved: boolean } | undefined {
  for (const beforeCombatant of before.combatants.values()) {
    const afterCombatant = after.combatants.get(beforeCombatant.combatantId);
    if (afterCombatant === undefined) {
      continue;
    }
    if (
      beforeCombatant.concentration === null ||
      beforeCombatant.concentration.effectKind !== "spellEffect" ||
      beforeCombatant.conditions.unconscious === true ||
      Number(afterCombatant.hp) !== 0 ||
      afterCombatant.conditions.unconscious !== true ||
      afterCombatant.concentration !== null
    ) {
      continue;
    }
    return {
      concentratingEffectRemoved:
        concentratingActiveEffectCount(before, beforeCombatant.combatantId) >
        concentratingActiveEffectCount(after, beforeCombatant.combatantId),
    };
  }
  return undefined;
}

function concentratingActiveEffectCount(
  state: BattleState,
  combatantId: CombatantId,
): number {
  return [...state.combatants.values()].reduce(
    (count, combatant) =>
      count +
      combatant.activeEffects.filter((effect) =>
        activeEffectExpiresWithCombatantConcentration(effect, combatantId),
      ).length,
    0,
  );
}

function activeEffectExpiresWithCombatantConcentration(
  effect: BattleActiveEffect,
  combatantId: CombatantId,
): boolean {
  return (
    "expiresAt" in effect &&
    effect.expiresAt.kind === "concentration" &&
    effect.expiresAt.combatantId === combatantId
  );
}

function interruptResolutionAddedArmorClassEffect(
  before: BattleState,
  result: Extract<BattleResolutionResult, { readonly tag: "resolved" }>,
): boolean {
  return [...result.state.combatants.values()].some(
    (combatant) =>
      armorClassEffectCount(combatant.activeEffects) >
      armorClassEffectCount(
        before.combatants.get(combatant.combatantId)?.activeEffects ?? [],
      ),
  );
}

function armorClassEffectCount(
  activeEffects: readonly BattleActiveEffect[],
): number {
  return activeEffects.filter(
    (effect) => effect.kind === "spellArmorClassBonus",
  ).length;
}
