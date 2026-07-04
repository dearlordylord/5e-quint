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

export type BattleReducerRouteSubjectFamily =
  | "concentrationTeardown"
  | "commandEffect"
  | "deathSavingThrow"
  | "hitPointRestoration"
  | "spellAttackProcedure";

export type BattleReducerRouteOwnerGroup =
  | "battleActionEconomy"
  | "battleSpellSlotAndActionEconomy"
  | "battleHoleFrontier"
  | "battleTargetSelection"
  | "battleObjectTargetBoundary"
  | "battleAttackRoll"
  | "battleSpellAttackProcedure"
  | "battleHitPointAndZeroHpLifecycle"
  | "battleHitPoint"
  | "battleConcentration"
  | "battleActiveEffect"
  | "battleConditionLifecycle"
  | "battleMovementResource"
  | "battleInterruptStack";

export type BattleReducerRouteHole =
  | "attackRoll"
  | "commandOptionChoice"
  | "damageTypeChoice"
  | "interruptDecision"
  | "concentrationSavingThrow"
  | "deathSavingThrow"
  | "hitPointHealingDistribution"
  | "movement"
  | "rolledDice"
  | "savingThrowOutcome"
  | "spellTargetList"
  | "targetChoice";

export type BattleReducerRouteFill =
  | "attackRoll"
  | "commandOptionChoice"
  | "concentrationSavingThrow"
  | "deathSavingThrow"
  | "hitPointHealingDistribution"
  | "damageTypeChoice"
  | "movement"
  | "rolledDice"
  | "savingThrowOutcome"
  | "spellTargetList"
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
    }
  | {
      readonly kind: "resolveBattleSubjectWithoutFill";
      readonly subject: BattleReducerRouteSubjectFamily;
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

export function battleReducerRouteEventsForDiscoveredAct(
  act: AvailableBattleAct,
): BattleReducerRouteEvents | undefined {
  if (isConcentrationTeardownDiscoverySubject(act.subject)) {
    return [{
      kind: "discoverBattleActs",
      subject: "concentrationTeardown",
      holes: battleReducerRouteHoles(act.initialHoles),
      owner:
        act.subject.tag === "actionSpell"
          ? "battleSpellSlotAndActionEconomy"
          : "battleConcentration",
    }];
  }
  if (isCommandEffectDiscoverySubject(act.subject)) {
    return [{
      kind: "discoverBattleActs",
      subject: "commandEffect",
      holes: battleReducerRouteHoles(act.initialHoles),
      owner:
        act.subject.tag === "actionSpell"
          ? "battleSpellSlotAndActionEconomy"
          : "battleActiveEffect",
    }];
  }
  if (isHitPointRestorationDiscoverySubject(act)) {
    return [{
      kind: "discoverBattleActs",
      subject: "hitPointRestoration",
      holes: battleReducerRouteHoles(act.initialHoles),
      owner:
        act.subject.tag === "actionSpell" ||
        act.subject.tag === "bonusActionSpell"
          ? "battleSpellSlotAndActionEconomy"
          : "battleActionEconomy",
    }];
  }
  if (!isSpellAttackProcedureSubject(act.subject)) {
    return undefined;
  }
  const actionOwner =
    act.subject.invocation.tag === "spellSlot"
      ? "battleSpellSlotAndActionEconomy"
      : "battleActionEconomy";
  const actionEconomyEvent: BattleReducerRouteEvent = {
    kind: "discoverBattleActs",
    subject: "spellAttackProcedure",
    holes: battleReducerRouteHoles(act.initialHoles),
    owner: actionOwner,
  };
  const hasObjectTargetBoundary = act.initialHoles.some(
    (hole) => hole.kind === "objectTargetChoice",
  );
  if (!hasObjectTargetBoundary) {
    return [actionEconomyEvent];
  }
  return [
    actionEconomyEvent,
    {
      kind: "discoverBattleActs",
      subject: "spellAttackProcedure",
      holes: battleReducerRouteHoles(
        act.initialHoles.filter((hole) => hole.kind === "objectTargetChoice"),
      ),
      owner: "battleObjectTargetBoundary",
    },
  ];
}

export function battleReducerRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  const deathSavingThrowRoute = deathSavingThrowRouteForResolution(
    input,
    result,
  );
  if (deathSavingThrowRoute !== undefined) {
    return deathSavingThrowRoute;
  }
  const concentrationRoute = concentrationRouteForResolution(input, result);
  if (concentrationRoute !== undefined) {
    return concentrationRoute;
  }
  const commandRoute = commandRouteForResolution(input, result);
  if (commandRoute !== undefined) {
    return [commandRoute];
  }
  const hitPointRestorationRoute = hitPointRestorationRouteForResolution(
    input,
    result,
  );
  if (hitPointRestorationRoute !== undefined) {
    return [hitPointRestorationRoute];
  }
  if (!isSpellAttackProcedureSubject(input.subject)) {
    return undefined;
  }
  if (result.tag === "invalid") {
    if (result.reason === "staleSubject") {
      return [
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "spellAttackProcedure",
          holes: [],
          owner: "battleHoleFrontier",
        },
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
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  const [firstOwner, ...remainingOwners] =
    spellAttackProcedureRouteOwners(input.subject, fill);
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
    return [
      {
        kind: "resolveBattleSubject",
        subject: "deathSavingThrow",
        fill: "deathSavingThrow",
        holes:
          result.tag === "needsHoles"
            ? battleReducerRouteHoles(result.holes)
            : [],
        owner: "battleHitPointAndZeroHpLifecycle",
      },
    ];
  }

  if (
    result.tag !== "needsHoles" ||
    !battleReducerRouteHoles(result.holes).includes("deathSavingThrow")
  ) {
    return undefined;
  }

  return [
    {
      kind: "discoverBattleActs",
      subject: "deathSavingThrow",
      holes: battleReducerRouteHoles(result.holes),
      owner: "battleHitPointAndZeroHpLifecycle",
    },
  ];
}

function concentrationRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (!isConcentrationTeardownSubject(input.subject)) {
    return undefined;
  }
  if (result.tag === "invalid") {
    return undefined;
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
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "concentrationTeardown",
          holes,
          owner: "battleActiveEffect",
        },
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "concentrationTeardown",
          holes,
          owner: "battleConcentration",
        },
      ];
      if (priorConcentration === null) {
        return castRoute;
      }
      return [
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "concentrationTeardown",
          holes,
          owner: "battleConcentration",
        },
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "concentrationTeardown",
          holes,
          owner: "battleActiveEffect",
        },
        ...castRoute,
      ];
    }
    if (
      input.subject.tag === "runtimeCommand" &&
      input.subject.command === "endConcentration"
    ) {
      return [
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "concentrationTeardown",
          holes,
          owner: "battleConcentration",
        },
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "concentrationTeardown",
          holes,
          owner: "battleActiveEffect",
        },
      ];
    }
    return undefined;
  }

  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === undefined) {
    return undefined;
  }
  if (routeFill === "concentrationSavingThrow") {
    const concentrationEvent: BattleReducerRouteEvent = {
      kind: "resolveBattleSubject",
      subject: "concentrationTeardown",
      fill: routeFill,
      holes,
      owner: "battleConcentration",
    };
    return result.tag === "resolved"
      ? [
          concentrationEvent,
          {
            kind: "resolveBattleSubjectWithoutFill",
            subject: "concentrationTeardown",
            holes: [],
            owner: "battleActiveEffect",
          },
        ]
      : [concentrationEvent];
  }
  if (
    routeFill === "rolledDice" &&
    battleReducerRouteHoles(result.tag === "needsHoles" ? result.holes : [])
      .includes("concentrationSavingThrow")
  ) {
    return [
      {
        kind: "resolveBattleSubject",
        subject: "concentrationTeardown",
        fill: routeFill,
        holes,
        owner: "battleConcentration",
      },
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
  if (!isHitPointRestorationResolution(input.subject, fill)) {
    return undefined;
  }
  if (result.tag === "invalid" && result.reason !== "invalidFill") {
    return undefined;
  }

  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === undefined) {
    return undefined;
  }

  return {
    kind: "resolveBattleSubject",
    subject: "hitPointRestoration",
    fill: routeFill,
    holes:
      result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [],
    owner: hitPointRestorationRouteOwner(routeFill, result),
  };
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

function commandRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvent | undefined {
  if (!isCommandEffectSubject(input.subject)) {
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

  return {
    kind: "resolveBattleSubject",
    subject: "commandEffect",
    fill: routeFill,
    holes: commandRouteHolesAfter(input, result),
    owner: commandRouteOwner(input, result, routeFill),
  };
}

function commandRouteWithoutFill(
  input: BattleResolutionInput,
): BattleReducerRouteEvent | undefined {
  const owner = commandRouteOwnerWithoutFill(input);
  return owner === undefined
    ? undefined
    : {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "commandEffect",
        holes: [],
        owner,
      };
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

function isSpellAttackProcedureSubject(
  subject: BattleResolutionInput["subject"],
): subject is Extract<
  BattleResolutionInput["subject"],
  { readonly tag: "actionSpell" }
> {
  return (
    subject.tag === "actionSpell" &&
    (subject.invocation.procedure === "chainedSpellAttackDamage" ||
      subject.invocation.procedure === "spellAttackSequence")
  );
}

function isCommandEffectSubject(
  subject: BattleResolutionInput["subject"],
): boolean {
  if (subject.tag === "actionSpell") {
    return subject.invocation.procedure === "command";
  }
  if (subject.tag !== "runtimeCommand") {
    return false;
  }
  return (
    isCommandPendingRuntimeSubject(subject) || subject.command === "endTurn"
  );
}

function isEndTurnSubject(
  subject: BattleResolutionInput["subject"],
): boolean {
  return subject.tag === "runtimeCommand" && subject.command === "endTurn";
}

function isConcentrationTeardownSubject(
  subject: BattleResolutionInput["subject"],
): boolean {
  if (subject.tag === "actionSpell") {
    return subject.invocation.procedure === "blurAttackRollDefense";
  }
  if (subject.tag === "action" && subject.action === "attack") {
    return true;
  }
  return (
    subject.tag === "runtimeCommand" && subject.command === "endConcentration"
  );
}

function isConcentrationTeardownDiscoverySubject(
  subject: BattleResolutionInput["subject"],
): boolean {
  if (subject.tag === "actionSpell") {
    return subject.invocation.procedure === "blurAttackRollDefense";
  }
  return (
    subject.tag === "runtimeCommand" && subject.command === "endConcentration"
  );
}

function isCommandEffectDiscoverySubject(
  subject: BattleResolutionInput["subject"],
): boolean {
  if (subject.tag === "actionSpell") {
    return subject.invocation.procedure === "command";
  }
  if (subject.tag !== "runtimeCommand") {
    return false;
  }
  return isCommandPendingRuntimeSubject(subject);
}

function isHitPointRestorationSubject(
  subject: BattleResolutionInput["subject"],
): boolean {
  if (subject.tag === "actionSpell" || subject.tag === "bonusActionSpell") {
    return subject.invocation.procedure === "directHitPointRestoration";
  }
  return false;
}

function isHitPointRestorationResolution(
  subject: BattleResolutionInput["subject"],
  fill: BattleFill,
): boolean {
  if (isHitPointRestorationSubject(subject)) {
    return true;
  }
  return (
    subject.tag === "unitFeature" &&
    fill.kind === "hitPointHealingDistribution"
  );
}

function isHitPointRestorationDiscoverySubject(
  act: AvailableBattleAct,
): boolean {
  if (isHitPointRestorationSubject(act.subject)) {
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
  if (family === "commandOptionChoice") return ["commandOptionChoice"];
  if (family === "concentrationSavingThrow") {
    return ["concentrationSavingThrow"];
  }
  if (family === "damageTypeChoice") return ["damageTypeChoice"];
  if (family === "deathSavingThrow") return ["deathSavingThrow"];
  if (family === "hitPointHealingDistribution") {
    return ["hitPointHealingDistribution"];
  }
  if (family === "interruptDecision") return ["interruptDecision"];
  if (family === "movement") return ["movement"];
  if (family === "rolledDice") return ["rolledDice"];
  if (family === "savingThrowOutcome") return ["savingThrowOutcome"];
  if (family === "spellTargetList") return ["spellTargetList"];
  if (family === "targetChoice") return ["targetChoice"];
  return [];
}

function battleReducerRouteFill(
  fill: BattleFill,
): BattleReducerRouteFill | undefined {
  const kind = battleFillKind(fill);
  if (kind === "attackRoll") return "attackRoll";
  if (kind === "concentrationSavingThrow") return "concentrationSavingThrow";
  if (kind === "damageTypeChoice") return "damageTypeChoice";
  if (kind === "deathSavingThrow") return "deathSavingThrow";
  if (kind === "hitPointHealingDistribution") {
    return "hitPointHealingDistribution";
  }
  if (kind === "rolledDice") return "rolledDice";
  if (kind === "spellTargetList") return "spellTargetList";
  if (kind === "targetChoice") return "targetChoice";
  return undefined;
}

function spellAttackProcedureRouteOwners(
  subject: BattleResolutionInput["subject"],
  fill: BattleFill,
): readonly BattleReducerRouteOwnerGroup[] {
  const kind = battleFillKind(fill);
  if (kind === "attackRoll") {
    return subject.tag === "actionSpell" &&
      subject.invocation.procedure === "spellAttackSequence"
      ? ["battleAttackRoll", "battleSpellAttackProcedure"]
      : ["battleAttackRoll"];
  }
  if (kind === "damageTypeChoice") return ["battleSpellAttackProcedure"];
  if (kind === "rolledDice") {
    return ["battleHitPoint", "battleSpellAttackProcedure"];
  }
  if (kind === "targetChoice") {
    return ["battleTargetSelection", "battleSpellAttackProcedure"];
  }
  return [];
}
