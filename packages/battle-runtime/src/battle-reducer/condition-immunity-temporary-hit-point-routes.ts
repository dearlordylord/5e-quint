import type {
  BattleActDiscoveryCandidate,
  BattleActiveEffect,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import {
  spellSlotFallbackActiveEffectRouteNextDiscoveryOwner,
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
import { isEndTurnSubject } from "./reducer-route-subject-query.ts";
import {
  combatantConcentrationChanged,
  combatantsActiveEffectsChanged,
  combatantsConditionsChanged,
  combatantsTemporaryHitPointsIncreased,
} from "./reducer-route-state-query.ts";

const SUBJECT = "conditionImmunityTemporaryHitPointEffect" as const;

export function conditionImmunityTemporaryHitPointRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvent | undefined {
  if (!isConditionImmunityTemporaryHitPointSubject(state, act.subject)) {
    return undefined;
  }
  return discoverBattleActsRoute(
    SUBJECT,
    battleReducerRouteHoles(act.initialHoles),
    "battleSpellSlotAndActionEconomy",
  );
}

export function conditionImmunityTemporaryHitPointRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    !isConditionImmunityTemporaryHitPointSubject(input.state, input.subject)
  ) {
    return undefined;
  }
  if (result.tag === "invalid") {
    return result.reason === "staleSubject"
      ? [resolveWithoutFill([], "battleHoleFrontier")]
      : undefined;
  }
  const fill = input.fills.at(-1);
  const routeFill =
    fill === undefined ? undefined : battleReducerRouteFill(fill);
  if (fill !== undefined && routeFill === undefined) return undefined;

  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  const route: BattleReducerRouteEvent[] = [];
  if (routeFill !== undefined) {
    route.push(
      resolveBattleSubjectRoute(
        SUBJECT,
        routeFill,
        holes,
        fillOwner(routeFill),
      ),
    );
  }
  if (result.tag === "needsHoles") {
    route.push(
      discoverBattleActsRoute(
        SUBJECT,
        holes,
        spellSlotFallbackActiveEffectRouteNextDiscoveryOwner(holes),
      ),
    );
  }
  if (result.tag === "resolved") {
    route.push(
      ...resolvedOwners(input.state, result.state, input.subject.actorId).map(
        (owner) => resolveWithoutFill([], owner),
      ),
    );
  }
  return nonEmptyRouteEvents(route);
}

export function conditionImmunityTemporaryHitPointTurnBoundaryRouteForResolution(
  input: BattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    !isEndTurnSubject(input.subject) ||
    result.tag !== "resolved" ||
    !temporaryHitPointsIncreased(input.state, result.state)
  ) {
    return undefined;
  }
  return [
    discoverBattleActsRoute(SUBJECT, [], "battleTurnBoundary"),
    resolveWithoutFill([], "battleTemporaryHitPoint"),
  ];
}

function isConditionImmunityTemporaryHitPointSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): boolean {
  return (
    spellInvocationForRouteSubject(state, subject)?.procedure ===
    "conditionImmunityAndTurnStartTemporaryHitPoints"
  );
}

function fillOwner(fill: BattleReducerRouteFill): BattleReducerRouteOwnerGroup {
  if (fill === "targetChoice") return "battleTargetSelection";
  if (fill === "damageTypeChoice") return "battleActiveEffect";
  if (fill === "attackRoll") return "battleAttackRoll";
  if (fill === "rolledDice") return "battleHitPoint";
  return "battleSpellSlotAndActionEconomy";
}

function resolvedOwners(
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
  if (combatantsTemporaryHitPointsIncreased(before, after)) {
    owners.push("battleTemporaryHitPoint");
  }
  if (combatantsConditionsChanged(before, after)) {
    owners.push("battleConditionLifecycle", "battleActiveEffect");
  }
  return owners;
}

function temporaryHitPointsIncreased(
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

function resolveWithoutFill(
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return resolveBattleSubjectWithoutFillRoute(SUBJECT, holes, owner);
}
