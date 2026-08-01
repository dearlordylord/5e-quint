import { isIncapacitated } from "@dnd/shared-algebras/conditions-algebra";
import type {
  AdmittedBattleResolutionInput,
  BattleActDiscoveryCandidate,
  BattleResolutionResult,
} from "../battle-state-execution.ts";
import { activeDruidWildShapeEffect } from "./druid-wild-shape.ts";
import {
  currentActorId,
  zeroHpLifecycleIsTerminal,
} from "./creature-state-leaves.ts";
import {
  battleReducerRouteFill,
  battleReducerRouteHoles,
  discoverBattleActsRoute,
  resolveBattleSubjectRoute,
  resolveBattleSubjectWithoutFillRoute,
} from "./reducer-route-builders.ts";
import type {
  BattleReducerRouteEvent,
  BattleReducerRouteEvents,
  BattleReducerRouteOwnerGroup,
} from "./reducer-route-protocol.ts";

export function wildShapeLifecycleRouteForDiscoveredAct(
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvent | undefined {
  if (act.subject.tag !== "druidWildShape") return undefined;
  return discoverBattleActsRoute(
    "activeFormLifecycle",
    battleReducerRouteHoles(act.initialHoles),
    "battleActionEconomy",
  );
}

export function wildShapeLifecycleRouteForResolution(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (input.subject.tag !== "druidWildShape" || result.tag !== "resolved") {
    return undefined;
  }
  if (input.subject.action === "dismiss") {
    return wildShapeLifecycleResolveWithoutFillRoute(
      "battleActionEconomy",
      "battleActiveEffect",
      "battleCreatureState",
      "battleMovementResource",
    );
  }
  const fill = input.fills.at(-1);
  if (
    fill === undefined ||
    battleReducerRouteFill(fill) !== "wildShapeEquipmentDisposition"
  ) {
    return undefined;
  }
  return [
    resolveBattleSubjectRoute(
      "activeFormLifecycle",
      "wildShapeEquipmentDisposition",
      [],
      "battleActionEconomy",
    ),
    ...wildShapeLifecycleResolveWithoutFillRoute(
      "battleFeatureResource",
      "battleTemporaryHitPoint",
      "battleActiveEffect",
      "battleCreatureState",
      "battleMovementResource",
    ),
  ];
}

export function wildShapeLifecycleTurnBoundaryRouteForResolution(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    input.subject.tag !== "runtimeCommand" ||
    input.subject.command !== "endTurn" ||
    result.tag !== "resolved"
  ) {
    return undefined;
  }
  const nextActor = result.state.combatants.get(currentActorId(result.state));
  if (activeDruidWildShapeEffect(nextActor) === null) return undefined;
  return [
    discoverBattleActsRoute("activeFormLifecycle", [], "battleTurnBoundary"),
    ...wildShapeLifecycleResolveWithoutFillRoute(
      "battleTurnBoundary",
      "battleActionEconomy",
    ),
  ];
}

export function wildShapeLifecycleTerminalRouteForResolution(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (result.tag !== "resolved") return undefined;
  for (const [combatantId, before] of input.state.combatants) {
    if (activeDruidWildShapeEffect(before) === null) continue;
    const after = result.state.combatants.get(combatantId);
    if (after === undefined || activeDruidWildShapeEffect(after) !== null) {
      continue;
    }
    if (zeroHpLifecycleIsTerminal(after)) {
      return [
        discoverBattleActsRoute(
          "activeFormLifecycle",
          [],
          "battleHitPointAndZeroHpLifecycle",
        ),
        ...wildShapeLifecycleResolveWithoutFillRoute(
          "battleHitPointAndZeroHpLifecycle",
          "battleActiveEffect",
          "battleCreatureState",
          "battleMovementResource",
        ),
      ];
    }
    if (isIncapacitated(after.conditions)) {
      return [
        discoverBattleActsRoute(
          "activeFormLifecycle",
          [],
          "battleConditionLifecycle",
        ),
        ...wildShapeLifecycleResolveWithoutFillRoute(
          "battleConditionLifecycle",
          "battleActiveEffect",
          "battleCreatureState",
          "battleMovementResource",
        ),
      ];
    }
  }
  return undefined;
}

function wildShapeLifecycleResolveWithoutFillRoute(
  owner: BattleReducerRouteOwnerGroup,
  ...owners: readonly BattleReducerRouteOwnerGroup[]
): BattleReducerRouteEvents {
  const eventForOwner = (
    routeOwner: BattleReducerRouteOwnerGroup,
  ): BattleReducerRouteEvent =>
    resolveBattleSubjectWithoutFillRoute("activeFormLifecycle", [], routeOwner);
  return [eventForOwner(owner), ...owners.map(eventForOwner)];
}
