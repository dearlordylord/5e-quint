// KERNEL-COVERAGE: runtime-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

import { battleFillKind } from "../battle-protocol-kinds.ts";
import type {
  AvailableBattleAct,
  BattleFill,
  BattleHole,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleState,
} from "../battle-reducer.ts";
import { battleHoleFamilyKind } from "./hole-helpers.ts";

export type BattleReducerRouteSubjectFamily = "spellAttackProcedure";

export type BattleReducerRouteOwnerGroup =
  | "battleActionEconomy"
  | "battleSpellSlotAndActionEconomy"
  | "battleTargetSelection"
  | "battleAttackRoll"
  | "battleSpellAttackProcedure"
  | "battleHitPoint";

export type BattleReducerRouteHole =
  | "attackRoll"
  | "damageTypeChoice"
  | "rolledDice"
  | "targetChoice";

export type BattleReducerRouteFill =
  | "attackRoll"
  | "damageTypeChoice"
  | "rolledDice"
  | "targetChoice";

export type BattleReducerRouteEvent =
  | {
      readonly kind: "startBattle";
      readonly owner: BattleReducerRouteOwnerGroup;
    }
  | {
      readonly kind: "discoverBattleActs";
      readonly subject: BattleReducerRouteSubjectFamily;
      readonly holes: readonly BattleReducerRouteHole[];
      readonly owner: BattleReducerRouteOwnerGroup;
    }
  | {
      readonly kind: "resolveBattleSubject";
      readonly subject: BattleReducerRouteSubjectFamily;
      readonly fill: BattleReducerRouteFill;
      readonly holes: readonly BattleReducerRouteHole[];
      readonly owner: BattleReducerRouteOwnerGroup;
    };

export type BattleReducerRouteEvents = readonly [
  BattleReducerRouteEvent,
  ...BattleReducerRouteEvent[],
];

export function battleReducerStartRouteEvent(
  _state: BattleState,
): BattleReducerRouteEvent {
  return { kind: "startBattle", owner: "battleActionEconomy" };
}

export function battleReducerRouteForDiscoveredAct(
  act: AvailableBattleAct,
): BattleReducerRouteEvent | undefined {
  if (!isChainedSpellAttackProcedureSubject(act.subject)) {
    return undefined;
  }
  return {
    kind: "discoverBattleActs",
    subject: "spellAttackProcedure",
    holes: battleReducerRouteHoles(act.initialHoles),
    owner: "battleSpellSlotAndActionEconomy",
  };
}

export function battleReducerRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (!isChainedSpellAttackProcedureSubject(input.subject)) {
    return undefined;
  }
  if (result.tag === "invalid") {
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
  const [firstOwner, ...remainingOwners] =
    chainedSpellAttackProcedureRouteOwners(fill);
  if (firstOwner === undefined) {
    return undefined;
  }
  const eventForOwner = (
    owner: BattleReducerRouteOwnerGroup,
  ): BattleReducerRouteEvent => ({
    kind: "resolveBattleSubject",
    subject: "spellAttackProcedure",
    fill: routeFill,
    holes,
    owner,
  });
  return [eventForOwner(firstOwner), ...remainingOwners.map(eventForOwner)];
}

function isChainedSpellAttackProcedureSubject(
  subject: BattleResolutionInput["subject"],
): boolean {
  return (
    subject.tag === "actionSpell" &&
    subject.invocation.procedure === "chainedSpellAttackDamage"
  );
}

function battleReducerRouteHoles(
  holes: readonly BattleHole[],
): readonly BattleReducerRouteHole[] {
  return [...new Set(holes.flatMap(battleReducerRouteHole))].sort();
}

function battleReducerRouteHole(
  hole: BattleHole,
): readonly BattleReducerRouteHole[] {
  const family = battleHoleFamilyKind(hole);
  if (family === "attackRoll") return ["attackRoll"];
  if (family === "damageTypeChoice") return ["damageTypeChoice"];
  if (family === "rolledDice") return ["rolledDice"];
  if (family === "targetChoice") return ["targetChoice"];
  return [];
}

function battleReducerRouteFill(
  fill: BattleFill,
): BattleReducerRouteFill | undefined {
  const kind = battleFillKind(fill);
  if (kind === "attackRoll") return "attackRoll";
  if (kind === "damageTypeChoice") return "damageTypeChoice";
  if (kind === "rolledDice") return "rolledDice";
  if (kind === "targetChoice") return "targetChoice";
  return undefined;
}

function chainedSpellAttackProcedureRouteOwners(
  fill: BattleFill,
): readonly BattleReducerRouteOwnerGroup[] {
  const kind = battleFillKind(fill);
  if (kind === "attackRoll") return ["battleAttackRoll"];
  if (kind === "damageTypeChoice") return ["battleSpellAttackProcedure"];
  if (kind === "rolledDice") {
    return ["battleHitPoint", "battleSpellAttackProcedure"];
  }
  if (kind === "targetChoice") {
    return ["battleTargetSelection", "battleSpellAttackProcedure"];
  }
  return [];
}
