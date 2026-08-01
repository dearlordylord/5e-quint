import type { BattleSpellProcedureExecution } from "../character-execution-queries.ts";
import type {
  BattleActDiscoveryCandidate,
  BattleActiveEffect,
  BattleHole,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import { requiredAbilityCheckRollMode } from "./hole-helpers.ts";
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
  BattleReducerRouteSubjectFamily,
} from "./reducer-route-protocol.ts";
import { spellInvocationForRouteSubject } from "./reducer-route-spell-query.ts";
import { isEndTurnSubject } from "./reducer-route-subject-query.ts";
import {
  battleCombatantHasActiveEffectKind,
  combatantConcentrationChanged,
  combatantsActiveEffectsChanged,
} from "./reducer-route-state-query.ts";

type MarkedDamageRiderSubject = Extract<
  BattleReducerRouteSubjectFamily,
  "markedDamageRiderEffect"
>;

export function markedDamageRiderRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvent | undefined {
  const subject = markedDamageRiderSubject(state, act.subject);
  if (subject === undefined) {
    return undefined;
  }
  return discoverBattleActsRoute(
    subject,
    markedDamageRiderDiscoveryHolesForAct(state, act.subject, act.initialHoles),
    markedDamageRiderDiscoveryOwnerForAct(state, act.subject),
  );
}

export function markedDamageRiderRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  const subject = markedDamageRiderSubject(input.state, input.subject);
  if (subject === undefined) {
    return undefined;
  }
  if (result.tag === "invalid") {
    return result.reason === "staleSubject"
      ? [
          markedDamageRiderResolveWithoutFillRoute(
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
        markedDamageRiderFillOwner(routeFill),
      ),
    );
  }
  if (
    result.tag === "needsHoles" &&
    !markedDamageRiderSuppressNextDiscovery(holes)
  ) {
    route.push(
      effectRouteDiscover(
        subject,
        holes,
        markedDamageRiderNextDiscoveryOwner(holes),
      ),
    );
  }
  if (result.tag === "resolved") {
    const resolvedOwners = markedDamageRiderResolvedOwners(
      input.state,
      result.state,
      input.subject.actorId,
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
          markedDamageRiderResolveWithoutFillRoute(subject, [], owner),
        ),
    );
  }
  return nonEmptyRouteEvents(route);
}

function markedDamageRiderSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): MarkedDamageRiderSubject | undefined {
  const invocation = spellInvocationForRouteSubject(state, subject);
  if (invocation?.procedure === "markedDamageRider") {
    return "markedDamageRiderEffect";
  }
  return undefined;
}

function markedDamageRiderDiscoveryOwnerForAct(
  state: BattleState,
  battleSubject: BattleResolutionInput["subject"],
): BattleReducerRouteOwnerGroup {
  if (
    battleSubject.tag === "bonusActionSpell" &&
    spellInvocationForRouteSubject(state, battleSubject)?.access.tag ===
      "spellEffect"
  ) {
    return "battleActionEconomy";
  }
  return "battleSpellSlotAndActionEconomy";
}

function markedDamageRiderDiscoveryHolesForAct(
  state: BattleState,
  battleSubject: BattleResolutionInput["subject"],
  initialHoles: readonly BattleHole[],
): readonly BattleReducerRouteHole[] {
  const holes = battleReducerRouteHoles(initialHoles);
  const invocation = spellInvocationForRouteSubject(state, battleSubject);
  if (!invocationHasChosenAbilityCheckDisadvantage(invocation)) {
    return holes;
  }
  return [...new Set([...holes, "abilityChoice" as const])].sort();
}

function markedDamageRiderSuppressNextDiscovery(
  holes: readonly BattleReducerRouteHole[],
): boolean {
  return holes.length === 1 && holes[0] === "abilityChoice";
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

function markedDamageRiderFillOwner(
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

function markedDamageRiderNextDiscoveryOwner(
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

function markedDamageRiderResolvedOwners(
  before: BattleState,
  after: BattleState,
  actorId: CombatantId,
): readonly BattleReducerRouteOwnerGroup[] {
  const owners: BattleReducerRouteOwnerGroup[] = [];
  if (combatantsActiveEffectsChanged(before, after)) {
    owners.push("battleActiveEffect");
  }
  if (combatantConcentrationChanged(before, after, actorId)) {
    owners.push("battleConcentration");
  }
  return owners;
}

type RoutedActiveEffectSubject = Extract<
  BattleReducerRouteSubjectFamily,
  MarkedDamageRiderSubject | "heldWeaponActiveEffect" | "weaponDamageRider"
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

function markedDamageRiderResolveWithoutFillRoute(
  subject: MarkedDamageRiderSubject,
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectWithoutFillRoute(subject, holes, owner);
}

export function markedDamageRiderWeaponAttackRouteForDiscoveredAct(
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

export function markedDamageRiderAbilityCheckRollModeRouteForResolution(
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
    markedDamageRiderResolveWithoutFillRoute(
      "markedDamageRiderEffect",
      [],
      "battleAbilityCheckRollMode",
    ),
  ];
}

export function markedDamageRiderTurnBoundaryRouteForResolution(
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
    markedDamageRiderResolveWithoutFillRoute(
      "markedDamageRiderEffect",
      [],
      "battleTurnBoundary",
    ),
  ];
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

export function markedDamageRiderTransferRouteForResolution(input: {
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
    markedDamageRiderResolveWithoutFillRoute(
      "markedDamageRiderEffect",
      input.holes,
      "battleHitPointAndZeroHpLifecycle",
    ),
    markedDamageRiderResolveWithoutFillRoute(
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

function isWeaponAttackSubject(
  subject: BattleResolutionInput["subject"],
): subject is Extract<
  BattleResolutionInput["subject"],
  { readonly tag: "action"; readonly action: "attack" }
> {
  return subject.tag === "action" && subject.action === "attack";
}
