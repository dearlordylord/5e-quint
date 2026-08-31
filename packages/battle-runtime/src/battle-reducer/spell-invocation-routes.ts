import type {
  BattleActDiscoveryCandidate,
  AdmittedBattleResolutionInput,
  BattleFill,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleState,
} from "../battle-state-execution.ts";
import { battleFillKind } from "../battle-protocol-kinds.ts";
import { characterSpellProcedure } from "../character-execution-queries.ts";
import {
  battleReducerRouteFill,
  battleReducerRouteHoles,
  discoverBattleActsRoute,
  nonEmptyRouteEvents,
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
import { battleLightEmitters } from "./spells-active-effects.ts";

type SpellAttackProcedureRouteResolution =
  | {
      readonly tag: "terminal";
      readonly route: BattleReducerRouteEvents;
    }
  | {
      readonly tag: "composable";
      readonly route: BattleReducerRouteEvents;
      readonly fill: BattleFill;
    };

export function spellAttackProcedureBaseRouteForResolution(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
): SpellAttackProcedureRouteResolution | undefined {
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
    return { tag: "terminal", route: objectTargetRoute };
  }
  if (result.tag === "invalid") {
    return result.reason === "staleSubject"
      ? {
          tag: "terminal",
          route: [
            resolveBattleSubjectWithoutFillRoute(
              "spellAttackProcedure",
              [],
              "battleHoleFrontier",
            ),
          ],
        }
      : undefined;
  }
  const fill = input.fills.at(-1);
  if (fill === undefined) return undefined;
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === undefined) return undefined;
  const holes = spellAttackProcedureRouteHoles(input, result);
  const [firstOwner, ...remainingOwners] = spellAttackProcedureRouteOwners({
    input,
    fill,
    result,
  });
  if (firstOwner === undefined) return undefined;
  const eventForOwner = (owner: BattleReducerRouteOwnerGroup) =>
    resolveBattleSubjectRoute("spellAttackProcedure", routeFill, holes, owner);
  return {
    tag: "composable",
    fill,
    route: [eventForOwner(firstOwner), ...remainingOwners.map(eventForOwner)],
  };
}

export function spellAttackProcedureRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvents | undefined {
  const invocation = spellInvocationForRouteSubject(state, act.subject);
  if (
    act.subject.tag !== "actionSpell" ||
    invocation === undefined ||
    !isSpellAttackProcedure(invocation.procedure)
  ) {
    return undefined;
  }
  const holes = battleReducerRouteHoles(act.initialHoles);
  const actionEconomyEvent = discoverBattleActsRoute(
    "spellAttackProcedure",
    invocation.procedure === "spellAttackSequence"
      ? spellAttackSequenceRouteHoles(holes)
      : holes,
    invocation.procedure === "spellAttackSequence"
      ? "battleSpellAttackProcedure"
      : spellInvocationUsesSpellSlot(invocation)
        ? "battleSpellSlotAndActionEconomy"
        : "battleActionEconomy",
  );
  const objectTargetBoundary =
    invocation.procedure !== "spellAttackSequence" &&
    act.initialHoles.some((hole) => hole.kind === "objectTargetChoice")
      ? [
          discoverBattleActsRoute(
            "spellAttackProcedure",
            battleReducerRouteHoles(
              act.initialHoles.filter(
                (hole) => hole.kind === "objectTargetChoice",
              ),
            ),
            "battleObjectTargetBoundary",
          ),
        ]
      : [];
  return nonEmptyRouteEvents([actionEconomyEvent, ...objectTargetBoundary]);
}

function spellAttackSequenceRouteHoles(
  holes: readonly BattleReducerRouteHole[],
): readonly BattleReducerRouteHole[] {
  if (holes.includes("targetChoice")) {
    return ["attackRoll", "rolledDice", "targetChoice"];
  }
  if (holes.includes("attackRoll")) return ["attackRoll", "rolledDice"];
  if (holes.includes("rolledDice")) return ["rolledDice"];
  return holes;
}

function isSpellAttackProcedure(procedure: string): boolean {
  return (
    procedure === "chainedSpellAttackDamage" ||
    procedure === "spellAttackDamage" ||
    procedure === "spellAttackSequence"
  );
}

function objectTargetSpellAttackRouteForResolution(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  const fill = input.fills.at(-1);
  if (fill === undefined) return undefined;
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
  if (!hasObjectTarget) return undefined;
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
  if (fillKind !== "rolledDice") return undefined;
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
  const count = (state: BattleState): number =>
    battleLightEmitters(state).filter(
      (emitter) => emitter.kind === "objectInvisibleRevealLightEmitter",
    ).length;
  return count(after) > count(before);
}

function spellAttackProcedureRouteOwners(input: {
  readonly input: AdmittedBattleResolutionInput;
  readonly fill: BattleFill;
  readonly result: BattleResolutionResult;
}): readonly BattleReducerRouteOwnerGroup[] {
  const kind = battleFillKind(input.fill);
  const isChainedSpellAttack =
    input.input.subject.tag === "actionSpell" &&
    spellInvocationForRouteSubject(input.input.state, input.input.subject)
      ?.procedure === "chainedSpellAttackDamage";
  if (kind === "attackRoll") {
    return spellAttackResolutionRequestsHole(input.result, "targetChoice")
      ? ["battleHoleFrontier"]
      : ["battleAttackRoll"];
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
  return kind === "concentrationSavingThrow" ? ["battleConcentration"] : [];
}

export function spellAttackProcedureRouteHoles(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
): readonly BattleReducerRouteHole[] {
  if (result.tag !== "needsHoles") return [];
  const holes = battleReducerRouteHoles(result.holes);
  return input.subject.tag === "actionSpell" &&
    spellInvocationForRouteSubject(input.state, input.subject)?.procedure ===
      "spellAttackSequence"
    ? spellAttackSequenceRouteHoles(holes)
    : holes;
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

export function slotSpellRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvents | undefined {
  if (!isSlotSpellSubject(state, act.subject)) return undefined;
  return [
    discoverBattleActsRoute(
      "slotSpell",
      battleReducerRouteHoles(act.initialHoles),
      "battleSpellSlotAndActionEconomy",
    ),
  ];
}

export function slotSpellRouteForResolution(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
): SlotSpellRouteResolution | undefined {
  if (!isSlotSpellSubject(input.state, input.subject)) return undefined;
  if (result.tag === "invalid" && result.reason !== "invalidFill") {
    return undefined;
  }
  const fill = input.fills.at(-1);
  if (fill === undefined) return undefined;
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
  return input.state.interruptStack.at(-1)?.kind === "replayContinuation" &&
    routeFill === "rolledDice" &&
    result.tag === "resolved"
    ? { tag: "replayInterruptionCompletion", route: [routeEvent] }
    : { tag: "route", route: [routeEvent] };
}

type SlotSpellRouteResolution =
  | {
      readonly tag: "route";
      readonly route: BattleReducerRouteEvents;
    }
  | {
      readonly tag: "replayInterruptionCompletion";
      readonly route: BattleReducerRouteEvents;
    };

export function saveGatedSpellRouteForDiscoveredAct(
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
      spellInvocationUsesSpellSlot(invocation)
        ? "battleSpellSlotAndActionEconomy"
        : "battleActionEconomy",
    ),
  ];
}

export function saveGatedSpellRouteForResolution(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (!isSaveGatedSpellResolution(input)) return undefined;
  const fill = input.fills.at(-1);
  if (fill === undefined) return undefined;
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === undefined) return undefined;
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  const owner = saveGatedSpellRouteOwner(routeFill);
  if (owner === undefined) return undefined;
  const primaryRoute: BattleReducerRouteEvent = resolveBattleSubjectRoute(
    "saveGatedSpell",
    routeFill,
    holes,
    owner,
  );
  if (
    result.tag !== "needsHoles" ||
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

function isSlotSpellSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): boolean {
  const invocation = spellInvocationForRouteSubject(state, subject);
  return (
    subject.tag === "actionSpell" &&
    invocation !== undefined &&
    spellInvocationUsesSpellSlot(invocation) &&
    invocation.procedure === "repeatedDamageAllocation"
  );
}

function spellInvocationUsesSpellSlot(
  invocation: NonNullable<ReturnType<typeof spellInvocationForRouteSubject>>,
): boolean {
  return "resource" in invocation && invocation.resource.tag === "spellSlot";
}

function isSaveGatedSpellResolution(
  input: AdmittedBattleResolutionInput,
): boolean {
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
    input.subject.tag !== "runtimeCommand" ||
    input.subject.command !== "releaseReadiedSpell"
  ) {
    return false;
  }
  const readied = input.state.readiedSpells.get(
    input.subject.readiedSpellCasterId,
  );
  const caster = input.state.combatants.get(input.subject.readiedSpellCasterId);
  const invocation =
    readied !== undefined && caster?.origin.kind === "character"
      ? characterSpellProcedure(
          caster.origin.execution,
          readied.procedureRef,
          caster,
        )
      : undefined;
  return (
    invocation !== undefined && isSaveGatedSpellProcedure(invocation.procedure)
  );
}

function isSaveGatedSpellProcedure(procedure: string): boolean {
  return (
    procedure === "saveGatedAreaControl" ||
    procedure === "saveGatedDamage" ||
    procedure === "saveGatedCondition"
  );
}

function saveGatedSpellRouteOwner(
  fill: BattleReducerRouteFill,
): BattleReducerRouteOwnerGroup | undefined {
  if (fill === "targetChoice") return "battleTargetSelection";
  if (fill === "spellTargetList") return "battleHoleFrontier";
  if (fill === "savingThrowOutcome") return "battleHoleFrontier";
  if (fill === "rolledDice") return "battleHitPoint";
  return undefined;
}
