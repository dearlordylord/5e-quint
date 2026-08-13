// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
import type {
  BattleActDiscoveryCandidate,
  BattleResolutionInput,
  BattleResolutionResult,
} from "../battle-state-execution.ts";
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
} from "./reducer-route-protocol.ts";

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

export function companionRouteForDiscoveredAct(
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvent | undefined {
  if (act.subject.tag === "companionLifecycle")
    return discoverBattleActsRoute(
      "companionLifecycle",
      battleReducerRouteHoles(act.initialHoles),
      "battleCompanion",
    );
  if (act.subject.tag === "findFamiliarSharedSenses")
    return discoverBattleActsRoute(
      "companionSharedSenses",
      battleReducerRouteHoles(act.initialHoles),
      "battleCompanion",
    );
  if (act.subject.tag === "findFamiliarTouchSpell")
    return discoverBattleActsRoute(
      "companionTouchDelivery",
      battleReducerRouteHoles(act.initialHoles),
      "battleSpellSlotAndActionEconomy",
    );
  if (act.subject.tag === "pactOfTheChainFamiliarAttack")
    return discoverBattleActsRoute(
      "companionReactionAttack",
      battleReducerRouteHoles(act.initialHoles),
      "battleCompanion",
    );
  return undefined;
}

export function companionRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (result.tag === "invalid") return undefined;
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
  if (input.subject.tag === "findFamiliarTouchSpell")
    return findFamiliarTouchDeliveryRouteForResolution(input, result);
  if (input.subject.tag === "pactOfTheChainFamiliarAttack")
    return pactFamiliarReactionAttackRouteForResolution(input, result);
  return undefined;
}

function findFamiliarTouchDeliveryRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  const fill = input.fills.at(-1);
  if (fill === undefined) return undefined;
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill !== "targetChoice" && routeFill !== "rolledDice")
    return undefined;
  const event = resolveBattleSubjectRoute(
    "companionTouchDelivery",
    routeFill,
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [],
    routeFill === "targetChoice"
      ? "battleCompanion"
      : "battleSpellSlotAndActionEconomy",
  );
  return result.tag === "resolved"
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
  if (fill === undefined)
    return [
      resolveBattleSubjectWithoutFillRoute(
        "companionReactionAttack",
        result.tag === "needsHoles"
          ? battleReducerRouteHoles(result.holes)
          : [],
        "battleStatBlockAction",
      ),
    ];
  const routeFill = battleReducerRouteFill(fill);
  if (
    routeFill !== "targetChoice" &&
    routeFill !== "attackRoll" &&
    routeFill !== "rolledDice"
  )
    return undefined;
  const owner =
    routeFill === "targetChoice"
      ? "battleTargetSelection"
      : routeFill === "attackRoll"
        ? "battleAttackRoll"
        : "battleHitPoint";
  const event = resolveBattleSubjectRoute(
    "companionReactionAttack",
    routeFill,
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [],
    owner,
  );
  return result.tag === "resolved"
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
