// KERNEL-COVERAGE: runtime-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

import { battleFillKind } from "../battle-protocol-kinds.ts";
import type {
  BattleActDiscoveryCandidate,
  BattleFill,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleState,
} from "../battle-state-execution.ts";
import {
  battleReducerRouteHoles,
  discoverBattleActsRoute,
  resolveBattleSubjectRoute,
  resolveBattleSubjectWithoutFillRoute,
} from "./reducer-route-builders.ts";
import type {
  BattleReducerRouteEvent,
  BattleReducerRouteEvents,
  BattleReducerRouteFill,
  BattleReducerRouteHole,
  BattleReducerRouteOwnerGroup,
} from "./reducer-route-protocol.ts";
import { spellInvocationForRouteSubject } from "./reducer-route-spell-query.ts";

export function compelledBehaviorRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvents | undefined {
  if (!isCompelledBehaviorEffectDiscoverySubject(state, act.subject)) {
    return undefined;
  }
  return [
    discoverBattleActsRoute(
      "compelledBehaviorEffect",
      battleReducerRouteHoles(act.initialHoles),
      act.subject.tag === "actionSpell"
        ? "battleSpellSlotAndActionEconomy"
        : "battleActiveEffect",
    ),
  ];
}

export function compelledBehaviorRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvent | undefined {
  if (!isCompelledBehaviorEffectSubject(input.state, input.subject)) {
    return undefined;
  }
  if (result.tag === "invalid" && result.reason !== "invalidFill") {
    return undefined;
  }

  const fill = input.fills.at(-1);
  if (fill === undefined) {
    return compelledBehaviorRouteWithoutFill(input);
  }

  const routeFill = compelledBehaviorRouteFill(fill);
  if (routeFill === undefined) {
    return compelledBehaviorRouteWithoutFill(input);
  }

  return resolveBattleSubjectRoute(
    "compelledBehaviorEffect",
    routeFill,
    compelledBehaviorRouteHolesAfter(input, result),
    compelledBehaviorRouteOwner(input, result, routeFill),
  );
}

function compelledBehaviorRouteWithoutFill(
  input: BattleResolutionInput,
): BattleReducerRouteEvent | undefined {
  const owner = compelledBehaviorRouteOwnerWithoutFill(input);
  return owner === undefined
    ? undefined
    : resolveBattleSubjectWithoutFillRoute(
        "compelledBehaviorEffect",
        [],
        owner,
      );
}

function compelledBehaviorRouteOwnerWithoutFill(
  input: BattleResolutionInput,
): BattleReducerRouteOwnerGroup | undefined {
  const subject = input.subject;
  if (subject.tag !== "runtimeCommand") {
    return undefined;
  }
  if (subject.command === "executeCompelledGrovel") {
    return "battleConditionLifecycle";
  }
  if (subject.command === "executeCompelledDrop") {
    return "battleActiveEffect";
  }
  if (
    subject.command === "executeCompelledApproach" ||
    subject.command === "executeCompelledFlee"
  ) {
    return "battleMovementResource";
  }
  if (
    subject.command === "endTurn" &&
    input.state.currentTurnResources.compelledHalt !== null
  ) {
    return "battleActiveEffect";
  }
  return undefined;
}

function compelledBehaviorRouteOwner(
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
    if (
      input.subject.command === "executeCompelledFlee" &&
      result.tag === "invalid"
    ) {
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
      input.subject.command === "executeCompelledApproach" ||
      input.subject.command === "executeCompelledFlee"
    ) {
      return "battleMovementResource";
    }
  }
  return "battleActiveEffect";
}

function compelledBehaviorRouteHolesAfter(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): readonly BattleReducerRouteHole[] {
  if (result.tag === "needsHoles") {
    return battleReducerRouteHoles(result.holes);
  }
  if (
    result.tag === "invalid" &&
    input.subject.tag === "runtimeCommand" &&
    input.subject.command === "executeCompelledFlee" &&
    input.fills.at(-1)?.kind === "movement"
  ) {
    return ["movement"];
  }
  return [];
}

function compelledBehaviorRouteFill(
  fill: BattleFill,
): BattleReducerRouteFill | undefined {
  const kind = battleFillKind(fill);
  if (kind === "compelledBehaviorOptionChoice")
    return "compelledBehaviorOptionChoice";
  if (kind === "movement") return "movement";
  if (kind === "savingThrowOutcome") return "savingThrowOutcome";
  if (kind === "spellTargetList") return "spellTargetList";
  return undefined;
}

function isCompelledBehaviorEffectSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): boolean {
  if (subject.tag === "actionSpell") {
    return (
      spellInvocationForRouteSubject(state, subject)?.procedure ===
      "compelledNextTurnBehavior"
    );
  }
  if (subject.tag !== "runtimeCommand") {
    return false;
  }
  return (
    isCompelledNextTurnBehaviorRuntimeSubject(subject) ||
    subject.command === "endTurn"
  );
}

function isCompelledBehaviorEffectDiscoverySubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): boolean {
  if (subject.tag === "actionSpell") {
    return (
      spellInvocationForRouteSubject(state, subject)?.procedure ===
      "compelledNextTurnBehavior"
    );
  }
  if (subject.tag !== "runtimeCommand") {
    return false;
  }
  return isCompelledNextTurnBehaviorRuntimeSubject(subject);
}

function isCompelledNextTurnBehaviorRuntimeSubject(
  subject: Extract<
    BattleResolutionInput["subject"],
    { readonly tag: "runtimeCommand" }
  >,
): boolean {
  return (
    subject.command === "executeCompelledGrovel" ||
    subject.command === "executeCompelledDrop" ||
    subject.command === "executeCompelledApproach" ||
    subject.command === "executeCompelledFlee"
  );
}
