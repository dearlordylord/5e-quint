// KERNEL-COVERAGE: runtime-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

import type {
  AdmittedBattleResolutionInput,
  BattleActDiscoveryCandidate,
  BattleResolutionResult,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import {
  activeFeatureSpellAttackRollModeDiscoveryRouteEvents,
  hasActiveFeatureSpellSaveDcModifier,
} from "./active-feature-spell-routes.ts";
import {
  afterHitSpellDiscoveryRoutesForDiscoveredAct,
  afterHitSpellDiscoveryRoutesForResolution,
  afterHitSpellEscapeRouteForResolution,
  afterHitSpellTurnBoundaryRouteForResolution,
} from "./after-hit-spell-routes.ts";
import {
  battleActionRouteForResolution,
  creatureAttackRouteForResolution,
  isStatBlockActionRouteSubject,
  isWeaponAttackSubject,
  weaponAttackRouteForResolution,
} from "./attack-routes.ts";
import {
  concentrationRouteForResolution,
  deathSavingThrowRouteForResolution,
  hitPointRestorationDiscoveryOwner,
  hitPointRestorationRouteForResolution,
  isConcentrationTeardownDiscoverySubject,
  isHitPointRestorationDiscoverySubject,
  isZeroHitPointStabilizationSubject,
  zeroHitPointStabilizationRouteForResolution,
} from "./combatant-lifecycle-routes.ts";
import {
  commandRouteForResolution,
  isCommandEffectDiscoverySubject,
} from "./command-routes.ts";
import {
  companionRouteForDiscoveredAct,
  companionRouteForResolution,
} from "./companion-routes.ts";
import {
  conditionImmunityTemporaryHitPointRouteForDiscoveredAct,
  conditionImmunityTemporaryHitPointRouteForResolution,
  conditionImmunityTemporaryHitPointTurnBoundaryRouteForResolution,
} from "./condition-immunity-temporary-hit-point-routes.ts";
import {
  repeatSaveConditionEffectRouteForResolution,
  rollModifierConcentrationBreakRouteForResolution,
  rollModifierRouteForDiscoveredAct,
  rollModifierRouteForResolution,
  scalarBuffRouteForDiscoveredAct,
  scalarBuffRouteForResolution,
  sleepRepeatSaveRouteForDiscoveredAct,
  sleepRepeatSaveRouteForResolution,
  spellBaseArmorClassEffectTurnBoundaryRouteForResolution,
  spellDamageReductionAdjustmentDiscoveryRouteForResolution,
  spellDamageReductionAdjustmentRouteForResolution,
  spellDamageReductionRouteForDiscoveredAct,
  spellDamageReductionRouteForResolution,
  turnBoundaryEffectLifecycleRouteForResolution,
} from "./effect-lifecycle-routes.ts";
import {
  activeFeatureBonusActionRouteForResolution,
  attackActionAreaSaveDamageReplacementRouteForDiscoveredAct,
  attackActionAreaSaveDamageReplacementRouteForResolution,
  isUnitFeatureBonusActionRouteSubject,
} from "./feature-action-routes.ts";
import { interruptStackResumeDiscoveryRouteForResolution } from "./interrupt-stack-routes.ts";
import {
  markedDamageRiderAbilityCheckRollModeRouteForResolution,
  markedDamageRiderRouteForDiscoveredAct,
  markedDamageRiderRouteForResolution,
  markedDamageRiderTurnBoundaryRouteForResolution,
  markedDamageRiderWeaponAttackRouteForDiscoveredAct,
} from "./marked-damage-routes.ts";
import {
  metamagicCastingOptionRouteForDiscoveredAct,
  metamagicCastingOptionRouteForResolution,
  metamagicEffectiveSpellLevelRouteForDiscoveredAct,
  metamagicEffectiveSpellLevelRouteForResolution,
  metamagicSpellComponentProjectionRouteForDiscoveredAct,
  metamagicSpellComponentProjectionRouteForResolution,
  metamagicSpellDurationProjectionRouteForDiscoveredAct,
  metamagicSpellDurationProjectionRouteForResolution,
} from "./metamagic-routes.ts";
import {
  movementRouteForDiscoveredAct,
  movementRouteForResolution,
} from "./movement-routes.ts";
import {
  passiveDamageAdjustmentRouteForSpellDiscovery,
  passiveProjectionRouteForDiscoveredAct,
  passiveProjectionRouteForResolution,
} from "./passive-projection-routes.ts";
import {
  protectionCharmRouteForDiscoveredAct,
  protectionCharmRouteForResolution,
} from "./protection-charm-routes.ts";
import {
  battleReducerRouteHoles,
  discoverBattleActsRoute,
  nonEmptyRouteEvents,
  resolveBattleSubjectWithoutFillRoute,
  startBattleRoute,
} from "./reducer-route-builders.ts";
import {
  appendTerminalRouteEvents,
  composableRouteCandidate,
  composeReducerRouteCandidates,
  terminalRouteCandidate,
} from "./reducer-route-composition.ts";
import type {
  BattleReducerRouteEvent,
  BattleReducerRouteEvents,
} from "./reducer-route-protocol.ts";
import { isEndTurnSubject } from "./reducer-route-subject-query.ts";
import {
  spatialEffectCompositionRouteForDiscoveredAct,
  spatialEffectCompositionRouteForResolution,
  spatialEffectCompositionRuntimeRouteForDiscoveredAct,
  thunderwavePresentationRouteForDiscoveredAct,
} from "./spatial-effect-routes.ts";
import {
  spellAttackProcedureRouteForResolution,
  spellBaseArmorClassEffectRouteForDiscoveredAct,
  spellBaseArmorClassEffectRouteForResolution,
  wardedTargetInterdictionRouteForDiscoveredAct,
  wardedTargetInterdictionRouteForResolution,
} from "./spell-defense-routes.ts";
import {
  saveGatedSpellRouteForDiscoveredAct,
  saveGatedSpellRouteForResolution,
  slotSpellRouteForDiscoveredAct,
  slotSpellRouteForResolution,
  spellAttackProcedureRouteForDiscoveredAct,
} from "./spell-invocation-routes.ts";
import {
  weaponSpellRouteForDiscoveredAct,
  weaponSpellRouteForResolution,
} from "./weapon-spell-routes.ts";
import {
  wildShapeLifecycleRouteForDiscoveredAct,
  wildShapeLifecycleRouteForResolution,
  wildShapeLifecycleTerminalRouteForResolution,
  wildShapeLifecycleTurnBoundaryRouteForResolution,
} from "./wild-shape-lifecycle-routes.ts";
export {
  battleReducerRouteForCreatureFallsInterruptWindow,
  battleReducerRouteForFeatherFallLanding,
  battleReducerRouteForInterrupt,
} from "./interrupt-route-projection.ts";

export function battleReducerStartRouteEvent(): BattleReducerRouteEvent {
  return startBattleRoute("battleActionEconomy");
}

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
  const eventRoute = (
    event: BattleReducerRouteEvent | undefined,
  ): BattleReducerRouteEvents | undefined =>
    event === undefined ? undefined : [event];
  return composeReducerRouteCandidates([
    terminalRouteCandidate(() =>
      passiveProjectionRouteForDiscoveredAct(state, act),
    ),
    terminalRouteCandidate(() =>
      isUnitFeatureBonusActionRouteSubject(state, act.subject)
        ? [
            discoverBattleActsRoute(
              "unitFeatureBonusAction",
              [],
              "battleFeatureResource",
            ),
          ]
        : undefined,
    ),
    terminalRouteCandidate(() =>
      eventRoute(companionRouteForDiscoveredAct(act)),
    ),
    terminalRouteCandidate(() =>
      metamagicEffectiveSpellLevelRouteForDiscoveredAct(state, act),
    ),
    terminalRouteCandidate(() =>
      eventRoute(rollModifierRouteForDiscoveredAct(state, act)),
    ),
    terminalRouteCandidate(() =>
      eventRoute(spellDamageReductionRouteForDiscoveredAct(state, act)),
    ),
    terminalRouteCandidate(() =>
      afterHitSpellDiscoveryRoutesForDiscoveredAct(state, act),
    ),
    terminalRouteCandidate(() =>
      eventRoute(markedDamageRiderRouteForDiscoveredAct(state, act)),
    ),
    terminalRouteCandidate(() =>
      eventRoute(
        conditionImmunityTemporaryHitPointRouteForDiscoveredAct(state, act),
      ),
    ),
    terminalRouteCandidate(() =>
      metamagicSpellComponentProjectionRouteForDiscoveredAct(act),
    ),
    terminalRouteCandidate(() =>
      protectionCharmRouteForDiscoveredAct(state, act),
    ),
    terminalRouteCandidate(() =>
      eventRoute(scalarBuffRouteForDiscoveredAct(state, act)),
    ),
    terminalRouteCandidate(() =>
      eventRoute(sleepRepeatSaveRouteForDiscoveredAct(state, act)),
    ),
    terminalRouteCandidate(() =>
      eventRoute(
        attackActionAreaSaveDamageReplacementRouteForDiscoveredAct(state, act),
      ),
    ),
    terminalRouteCandidate(() =>
      eventRoute(wildShapeLifecycleRouteForDiscoveredAct(act)),
    ),
    terminalRouteCandidate(() =>
      isStatBlockActionRouteSubject(state, act.subject)
        ? [
            discoverBattleActsRoute(
              "statBlockAction",
              battleReducerRouteHoles(act.initialHoles),
              "battleStatBlockAction",
            ),
          ]
        : undefined,
    ),
    terminalRouteCandidate(() =>
      act.subject.tag === "creatureAttack"
        ? [
            discoverBattleActsRoute(
              "creatureAttack",
              battleReducerRouteHoles(act.initialHoles),
              "battleAttackRoll",
            ),
          ]
        : undefined,
    ),
    terminalRouteCandidate(() => {
      if (!isWeaponAttackSubject(act.subject)) return undefined;
      const markedRoute = markedDamageRiderWeaponAttackRouteForDiscoveredAct(
        state,
        act,
      );
      const weaponRoute = discoverBattleActsRoute(
        "weaponAttack",
        battleReducerRouteHoles(act.initialHoles),
        "battleActionEconomy",
      );
      return markedRoute === undefined
        ? [weaponRoute]
        : [markedRoute, weaponRoute];
    }),
    terminalRouteCandidate(() =>
      isConcentrationTeardownDiscoverySubject(state, act.subject)
        ? [
            discoverBattleActsRoute(
              "concentrationTeardown",
              battleReducerRouteHoles(act.initialHoles),
              act.subject.tag === "actionSpell"
                ? "battleSpellSlotAndActionEconomy"
                : "battleConcentration",
            ),
          ]
        : undefined,
    ),
    terminalRouteCandidate(() =>
      metamagicSpellDurationProjectionRouteForDiscoveredAct(state, act),
    ),
    terminalRouteCandidate(() =>
      isCommandEffectDiscoverySubject(state, act.subject)
        ? [
            discoverBattleActsRoute(
              "commandEffect",
              battleReducerRouteHoles(act.initialHoles),
              act.subject.tag === "actionSpell"
                ? "battleSpellSlotAndActionEconomy"
                : "battleActiveEffect",
            ),
          ]
        : undefined,
    ),
    terminalRouteCandidate(() => movementRouteForDiscoveredAct(state, act)),
    terminalRouteCandidate(() =>
      metamagicCastingOptionRouteForDiscoveredAct(state, act),
    ),
    terminalRouteCandidate(() =>
      isHitPointRestorationDiscoverySubject(state, act)
        ? [
            discoverBattleActsRoute(
              "hitPointRestoration",
              battleReducerRouteHoles(act.initialHoles),
              hitPointRestorationDiscoveryOwner(act.subject),
            ),
          ]
        : undefined,
    ),
    terminalRouteCandidate(() =>
      isZeroHitPointStabilizationSubject(state, act.subject)
        ? [
            discoverBattleActsRoute(
              "zeroHitPointStabilization",
              battleReducerRouteHoles(act.initialHoles),
              "battleActionEconomy",
            ),
          ]
        : undefined,
    ),
    terminalRouteCandidate(() =>
      wardedTargetInterdictionRouteForDiscoveredAct(state, act),
    ),
    terminalRouteCandidate(() =>
      eventRoute(spellBaseArmorClassEffectRouteForDiscoveredAct(state, act)),
    ),
    terminalRouteCandidate(() => {
      const spatialRoute = spatialEffectCompositionRouteForDiscoveredAct(
        state,
        act,
      );
      const runtimeRoute = spatialEffectCompositionRuntimeRouteForDiscoveredAct(
        state,
        act,
      );
      const presentationRoute = thunderwavePresentationRouteForDiscoveredAct(
        state,
        act,
      );
      if (
        spatialRoute === undefined &&
        runtimeRoute === undefined &&
        presentationRoute === undefined
      )
        return undefined;
      const saveRoute = saveGatedSpellRouteForDiscoveredAct(state, act);
      return nonEmptyRouteEvents([
        ...(spatialRoute === undefined ? [] : [spatialRoute]),
        ...(runtimeRoute === undefined ? [] : [runtimeRoute]),
        ...(presentationRoute === undefined ? [] : [presentationRoute]),
        ...(saveRoute ?? []),
        ...(saveRoute === undefined
          ? []
          : passiveDamageAdjustmentRouteForSpellDiscovery(state)),
      ]);
    }),
    terminalRouteCandidate(() =>
      eventRoute(weaponSpellRouteForDiscoveredAct(state, act)),
    ),
    terminalRouteCandidate(() => slotSpellRouteForDiscoveredAct(state, act)),
    terminalRouteCandidate(() => {
      const route = saveGatedSpellRouteForDiscoveredAct(state, act);
      return route === undefined
        ? undefined
        : nonEmptyRouteEvents([
            ...route,
            ...passiveDamageAdjustmentRouteForSpellDiscovery(state),
          ]);
    }),
    terminalRouteCandidate(() => {
      const route = spellAttackProcedureRouteForDiscoveredAct(state, act);
      return route === undefined
        ? undefined
        : nonEmptyRouteEvents([
            ...route,
            ...passiveDamageAdjustmentRouteForSpellDiscovery(state),
            ...activeFeatureSpellAttackRollModeDiscoveryRouteEvents(state, act),
          ]);
    }),
  ]);
}

export function battleReducerRouteForResolution(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  const sleepRepeatSaveRoute = sleepRepeatSaveRouteForResolution(input, result);
  const firstExclusiveRoute = composeReducerRouteCandidates([
    terminalRouteCandidate(() =>
      passiveProjectionRouteForResolution(input, result),
    ),
    terminalRouteCandidate(() =>
      metamagicEffectiveSpellLevelRouteForResolution(input, result),
    ),
    terminalRouteCandidate(() => rollModifierRouteForResolution(input, result)),
    terminalRouteCandidate(() =>
      spellDamageReductionRouteForResolution(input, result),
    ),
    terminalRouteCandidate(() =>
      metamagicSpellComponentProjectionRouteForResolution(input, result),
    ),
    terminalRouteCandidate(() =>
      protectionCharmRouteForResolution(input, result),
    ),
    terminalRouteCandidate(() =>
      wardedTargetInterdictionRouteForResolution(input, result),
    ),
    terminalRouteCandidate(() => scalarBuffRouteForResolution(input, result)),
    terminalRouteCandidate(() =>
      markedDamageRiderRouteForResolution(input, result),
    ),
    terminalRouteCandidate(() =>
      conditionImmunityTemporaryHitPointRouteForResolution(input, result),
    ),
    terminalRouteCandidate(() =>
      markedDamageRiderAbilityCheckRollModeRouteForResolution(input, result),
    ),
    terminalRouteCandidate(() =>
      rollModifierConcentrationBreakRouteForResolution(input, result),
    ),
    terminalRouteCandidate(() =>
      sleepRepeatSaveRoute !== undefined && !isEndTurnSubject(input.subject)
        ? sleepRepeatSaveRoute
        : undefined,
    ),
    terminalRouteCandidate(() =>
      afterHitSpellEscapeRouteForResolution(input, result),
    ),
  ]);
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
  const turnBoundaryRoutes = composeReducerRouteCandidates([
    composableRouteCandidate(() => sleepRepeatSaveRoute),
    composableRouteCandidate(() => repeatSaveConditionEffectRoute),
    composableRouteCandidate(() => deathSavingThrowRoute),
    composableRouteCandidate(() => turnBoundaryEffectLifecycleRoute),
    composableRouteCandidate(
      () => conditionImmunityTemporaryHitPointTurnBoundaryRoute,
    ),
    composableRouteCandidate(() => wildShapeLifecycleTurnBoundaryRoute),
    composableRouteCandidate(() => afterHitTurnBoundaryRoute),
    composableRouteCandidate(() => markedDamageRiderTurnBoundaryRoute),
    composableRouteCandidate(() => spellBaseArmorClassTurnBoundaryRoute),
  ]);
  if (turnBoundaryRoutes !== undefined) return turnBoundaryRoutes;
  const metamagicSpellDurationProjectionRoute =
    metamagicSpellDurationProjectionRouteForResolution(input, result);
  const wildShapeLifecycleTerminalRoute =
    wildShapeLifecycleTerminalRouteForResolution(input, result);
  const withWildShapeTerminal = (
    route: BattleReducerRouteEvents | undefined,
  ): BattleReducerRouteEvents | undefined =>
    route === undefined
      ? undefined
      : appendTerminalRouteEvents(route, wildShapeLifecycleTerminalRoute);
  return composeReducerRouteCandidates([
    terminalRouteCandidate(() => metamagicSpellDurationProjectionRoute),
    terminalRouteCandidate(() =>
      withWildShapeTerminal(concentrationRouteForResolution(input, result)),
    ),
    terminalRouteCandidate(() => {
      const commandRoute = commandRouteForResolution(input, result);
      const movementRoute = movementRouteForResolution(input, result);
      if (movementRoute !== undefined) {
        return withWildShapeTerminal(
          nonEmptyRouteEvents([
            ...(commandRoute === undefined ? [] : [commandRoute]),
            ...movementRoute,
          ]),
        );
      }
      return commandRoute === undefined
        ? undefined
        : withWildShapeTerminal([commandRoute]);
    }),
    terminalRouteCandidate(() =>
      withWildShapeTerminal(
        wildShapeLifecycleRouteForResolution(input, result),
      ),
    ),
    terminalRouteCandidate(() =>
      withWildShapeTerminal(
        metamagicCastingOptionRouteForResolution(input, result),
      ),
    ),
    terminalRouteCandidate(() => {
      const route = hitPointRestorationRouteForResolution(input, result);
      return route === undefined ? undefined : withWildShapeTerminal([route]);
    }),
    terminalRouteCandidate(() => {
      const route = zeroHitPointStabilizationRouteForResolution(input, result);
      return route === undefined ? undefined : withWildShapeTerminal([route]);
    }),
    terminalRouteCandidate(() =>
      withWildShapeTerminal(
        spellBaseArmorClassEffectRouteForResolution(input, result),
      ),
    ),
    terminalRouteCandidate(() => {
      const spatialRoute = spatialEffectCompositionRouteForResolution(
        input,
        result,
      );
      return spatialRoute === undefined
        ? undefined
        : withWildShapeTerminal(
            nonEmptyRouteEvents([
              ...spatialRoute,
              ...(saveGatedSpellRouteForResolution(input, result) ?? []),
            ]),
          );
    }),
    terminalRouteCandidate(() => {
      const slotRoute = slotSpellRouteForResolution(input, result);
      return slotRoute === undefined
        ? undefined
        : withWildShapeTerminal(
            nonEmptyRouteEvents([
              ...slotRoute.route,
              ...(slotRoute.tag === "replayInterruptionCompletion"
                ? [
                    resolveBattleSubjectWithoutFillRoute(
                      "reactionSpellInterruption",
                      [],
                      "battleInterruptStack",
                    ),
                  ]
                : []),
            ]),
          );
    }),
    terminalRouteCandidate(() =>
      withWildShapeTerminal(saveGatedSpellRouteForResolution(input, result)),
    ),
    terminalRouteCandidate(() =>
      withWildShapeTerminal(weaponSpellRouteForResolution(input, result)),
    ),
    terminalRouteCandidate(() =>
      withWildShapeTerminal(
        attackActionAreaSaveDamageReplacementRouteForResolution(input, result),
      ),
    ),
    terminalRouteCandidate(() =>
      withWildShapeTerminal(
        activeFeatureBonusActionRouteForResolution(input, result),
      ),
    ),
    terminalRouteCandidate(() => {
      const route = battleActionRouteForResolution(input, result);
      return route === undefined ? undefined : withWildShapeTerminal([route]);
    }),
    terminalRouteCandidate(() =>
      withWildShapeTerminal(companionRouteForResolution(input, result)),
    ),
    terminalRouteCandidate(() => {
      const interruptResumeRoute =
        interruptStackResumeDiscoveryRouteForResolution(input, result);
      const afterHitDiscoveryRoutes =
        afterHitSpellDiscoveryRoutesForResolution(result);
      const damageReductionDiscoveryRoute =
        spellDamageReductionAdjustmentDiscoveryRouteForResolution(result);
      return interruptResumeRoute === undefined &&
        afterHitDiscoveryRoutes === undefined &&
        damageReductionDiscoveryRoute === undefined
        ? undefined
        : withWildShapeTerminal(
            nonEmptyRouteEvents([
              ...(interruptResumeRoute === undefined
                ? []
                : [interruptResumeRoute]),
              ...(afterHitDiscoveryRoutes ?? []),
              ...(damageReductionDiscoveryRoute === undefined
                ? []
                : [damageReductionDiscoveryRoute]),
            ]),
          );
    }),
    terminalRouteCandidate(() =>
      withWildShapeTerminal(
        spellDamageReductionAdjustmentRouteForResolution(input, result),
      ),
    ),
    terminalRouteCandidate(() =>
      withWildShapeTerminal(weaponAttackRouteForResolution(input, result)),
    ),
    terminalRouteCandidate(() =>
      withWildShapeTerminal(creatureAttackRouteForResolution(input, result)),
    ),
    terminalRouteCandidate(() =>
      appendTerminalRouteEvents(
        spellAttackProcedureRouteForResolution(input, result),
        wildShapeLifecycleTerminalRoute,
      ),
    ),
  ]);
}
