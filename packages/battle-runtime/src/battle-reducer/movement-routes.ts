import type {
  AdmittedBattleResolutionInput,
  BattleActDiscoveryCandidate,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleState,
} from "../battle-state-execution.ts";
import { isCreatureSpaceTraversalMovementFactValidationMessage } from "./movement-procedures.ts";
import { representedMovementSpeedKinds } from "./movement-speed.ts";
import {
  discoverBattleActsRoute,
  nonEmptyRouteEvents,
  resolveBattleSubjectRoute,
  resolveBattleSubjectWithoutFillRoute,
} from "./reducer-route-builders.ts";
import type {
  BattleReducerRouteEvent,
  BattleReducerRouteEvents,
  BattleReducerRouteHole,
  BattleReducerRouteOwnerGroup,
  BattleReducerRouteSubjectFamily,
} from "./reducer-route-protocol.ts";
import { spellInvocationForRouteSubject } from "./reducer-route-spell-query.ts";

export function movementRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvents | undefined {
  if (isReactionCompelledMovementSpellSubject(state, act.subject)) {
    return [
      discoverBattleActsRoute(
        "compelledMovement",
        ["movement", "rolledDice", "savingThrowOutcome", "targetChoice"],
        "battleSpellSlotAndActionEconomy",
      ),
    ];
  }
  if (isSpellGrantedDashSubject(act.subject)) {
    return [
      discoverBattleActsRoute(
        "movementResource",
        [],
        "battleSpellSlotAndActionEconomy",
      ),
    ];
  }
  if (isPassiveSpeedDashSubject(act.subject)) {
    return [
      discoverBattleActsRoute("movementResource", [], "battleActionEconomy"),
    ];
  }
  if (isSpecialSpeedMovementSubject(state, act.subject)) {
    return [
      discoverBattleActsRoute(
        "specialSpeedProjection",
        [],
        "battleCreatureState",
      ),
      movementSubstrateResolveWithoutFill(
        "specialSpeedProjection",
        "battleCreatureState",
      ),
      movementSubstrateResolveWithoutFill(
        "specialSpeedProjection",
        "battleMovementResource",
      ),
      discoverBattleActsRoute(
        "movementResource",
        ["movement"],
        "battleMovementResource",
      ),
    ];
  }
  return undefined;
}

export function movementRouteForResolution(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  return (
    creatureSpaceMovementPermissionRouteForResolution(input, result) ??
    movementSubstrateRouteForResolution(input, result)
  );
}

function creatureSpaceMovementPermissionRouteForResolution(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    input.subject.tag !== "runtimeCommand" ||
    input.subject.command !== "move"
  ) {
    return undefined;
  }
  const fill = input.fills.at(-1);
  if (
    fill === undefined ||
    fill.kind !== "movement" ||
    fill.value.creatureSpaceTraversal === undefined
  ) {
    return undefined;
  }
  if (
    result.tag === "invalid" &&
    (result.reason !== "invalidFill" ||
      !isCreatureSpaceTraversalMovementFactValidationMessage(result.message))
  ) {
    return undefined;
  }
  if (result.tag === "needsHoles") {
    return undefined;
  }
  const holes: readonly BattleReducerRouteHole[] =
    result.tag === "invalid" ? ["movement"] : [];
  const route: BattleReducerRouteEvent[] = [
    resolveBattleSubjectRoute(
      "creatureSpaceMovementPermission",
      "movement",
      holes,
      "battleCreatureSpaceMovement",
    ),
  ];
  if (result.tag === "resolved") {
    route.push(
      resolveBattleSubjectWithoutFillRoute(
        "creatureSpaceMovementPermission",
        [],
        "battleMovementResource",
      ),
    );
  }
  return nonEmptyRouteEvents(route);
}

function movementSubstrateRouteForResolution(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  const commandFleeDiscoveryRoute = commandFleeCompelledMovementDiscoveryRoute(
    input,
    result,
  );
  if (commandFleeDiscoveryRoute !== undefined) {
    return commandFleeDiscoveryRoute;
  }
  if (result.tag !== "resolved") {
    return undefined;
  }
  if (isReactionCompelledMovementSpellSubject(input.state, input.subject)) {
    const fill = input.fills.at(-1);
    if (fill?.kind !== "movement") {
      return undefined;
    }
    return compelledMovementResolvedRoute(
      "battleActionEconomy",
      "battleInterruptStack",
    );
  }
  const commandFleeRoute = commandFleeCompelledMovementRoute(input);
  if (commandFleeRoute !== undefined) {
    return commandFleeRoute;
  }
  if (isSpellGrantedDashSubject(input.subject)) {
    return [
      movementSubstrateResolveWithoutFill(
        "movementResource",
        "battleSpellSlotAndActionEconomy",
      ),
      movementSubstrateResolveWithoutFill(
        "movementResource",
        "battleActiveEffect",
      ),
      movementSubstrateResolveWithoutFill(
        "movementResource",
        "battleMovementResource",
      ),
    ];
  }
  if (isPassiveSpeedDashSubject(input.subject)) {
    return [
      movementSubstrateResolveWithoutFill(
        "movementResource",
        "battleActionEconomy",
      ),
      movementSubstrateResolveWithoutFill(
        "movementResource",
        "battleCreatureState",
      ),
      movementSubstrateResolveWithoutFill(
        "movementResource",
        "battleMovementResource",
      ),
    ];
  }
  if (isSpecialSpeedMovementSubject(input.state, input.subject)) {
    const fill = input.fills.at(-1);
    if (fill?.kind !== "movement") {
      return undefined;
    }
    return [
      resolveBattleSubjectRoute(
        "movementResource",
        "movement",
        [],
        "battleMovementResource",
      ),
    ];
  }
  return undefined;
}

function commandFleeCompelledMovementDiscoveryRoute(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  const fill = input.fills.at(-1);
  if (
    input.subject.tag !== "actionSpell" ||
    spellInvocationForRouteSubject(input.state, input.subject)?.procedure !==
      "command" ||
    fill?.kind !== "commandOptionChoice" ||
    fill.value !== "flee" ||
    result.tag !== "needsHoles"
  ) {
    return undefined;
  }
  return [
    discoverBattleActsRoute(
      "compelledMovement",
      [
        "commandOptionChoice",
        "movement",
        "savingThrowOutcome",
        "spellTargetList",
      ],
      "battleSpellSlotAndActionEconomy",
    ),
  ];
}

function commandFleeCompelledMovementRoute(
  input: AdmittedBattleResolutionInput,
): BattleReducerRouteEvents | undefined {
  if (
    input.subject.tag !== "runtimeCommand" ||
    input.subject.command !== "commandFlee" ||
    input.fills.at(-1)?.kind !== "movement"
  ) {
    return undefined;
  }
  return compelledMovementResolvedRoute(
    "battleActionEconomy",
    "battleInterruptStack",
    "battleActiveEffect",
    "battleTurnBoundary",
  );
}

function compelledMovementResolvedRoute(
  ...owners: readonly BattleReducerRouteOwnerGroup[]
): BattleReducerRouteEvents {
  return [
    resolveBattleSubjectRoute(
      "compelledMovement",
      "movement",
      [],
      "battleMovementResource",
    ),
    ...owners.map((owner) =>
      movementSubstrateResolveWithoutFill("compelledMovement", owner),
    ),
  ];
}

function movementSubstrateResolveWithoutFill(
  subject: Extract<
    BattleReducerRouteSubjectFamily,
    "compelledMovement" | "movementResource" | "specialSpeedProjection"
  >,
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectWithoutFillRoute(subject, [], owner);
}

function isReactionCompelledMovementSpellSubject(
  state: BattleState,
  subject:
    | BattleResolutionInput["subject"]
    | BattleActDiscoveryCandidate["subject"],
): subject is Extract<
  BattleResolutionInput["subject"],
  { readonly tag: "actionSpell" }
> {
  const invocation = spellInvocationForRouteSubject(state, subject);
  return (
    invocation?.procedure === "saveGatedDamage" &&
    invocation.failedSavePostDamageRiders.some(
      (rider) => rider.kind === "forcedReactionMovement",
    )
  );
}

function isSpellGrantedDashSubject(
  subject:
    | BattleResolutionInput["subject"]
    | BattleActDiscoveryCandidate["subject"],
): subject is Extract<
  BattleResolutionInput["subject"],
  { readonly tag: "bonusActionDashSpell" }
> {
  return subject.tag === "bonusActionDashSpell";
}

function isPassiveSpeedDashSubject(
  subject:
    | BattleResolutionInput["subject"]
    | BattleActDiscoveryCandidate["subject"],
): subject is Extract<
  BattleResolutionInput["subject"],
  { readonly tag: "action"; readonly action: "dash" }
> {
  return subject.tag === "action" && subject.action === "dash";
}

function isSpecialSpeedMovementSubject(
  state: BattleState,
  subject:
    | BattleResolutionInput["subject"]
    | BattleActDiscoveryCandidate["subject"],
): subject is Extract<
  BattleResolutionInput["subject"],
  { readonly tag: "runtimeCommand"; readonly command: "move" }
> {
  if (subject.tag !== "runtimeCommand" || subject.command !== "move") {
    return false;
  }
  const actor = state.combatants.get(subject.actorId);
  return (
    actor !== undefined &&
    representedMovementSpeedKinds(actor).some((kind) => kind !== "walk")
  );
}
