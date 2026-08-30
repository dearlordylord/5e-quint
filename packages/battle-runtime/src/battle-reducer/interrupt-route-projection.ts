// KERNEL-COVERAGE: runtime-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

import type {
  BattleActiveEffect,
  BattleFallingCreatureMitigationLandingResult,
  BattleFill,
  BattleResolutionResult,
  BattleState,
} from "../battle-state-execution.ts";
import { afterHitSpellRouteForInterrupt } from "./after-hit-spell-routes.ts";
import { reactionSpellRouteForInterrupt } from "./reaction-spell-routes.ts";
import {
  battleReducerRouteHoles,
  discoverBattleActsRoute,
  resolveBattleInterruptRoute,
  resolveBattleSubjectWithoutFillRoute,
} from "./reducer-route-builders.ts";
import type {
  BattleReducerRouteEvent,
  BattleReducerRouteEvents,
  BattleReducerRouteOwnerGroup,
} from "./reducer-route-protocol.ts";

export function battleReducerRouteForInterrupt(
  before: BattleState,
  fill: Extract<BattleFill, { readonly kind: "interruptDecision" }>,
  result: BattleResolutionResult,
): BattleReducerRouteEvents {
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  const reactionSpellRoute = reactionSpellRouteForInterrupt({
    before,
    fill,
    holes,
    result,
  });
  if (reactionSpellRoute !== undefined) {
    return reactionSpellRoute;
  }
  const afterHitSpellRoute = afterHitSpellRouteForInterrupt({
    before,
    fill,
    holes,
    result,
  });
  if (afterHitSpellRoute !== undefined) {
    return afterHitSpellRoute;
  }
  const eventForOwner = (
    owner: BattleReducerRouteOwnerGroup,
  ): BattleReducerRouteEvent =>
    resolveBattleInterruptRoute(
      "interruptStackResume",
      "interruptDecision",
      holes,
      owner,
    );
  /* v8 ignore start -- @preserve -- Every admitted interrupt that adds a spell Armor Class effect is the Shield payload route handled above. */
  if (
    result.tag === "resolved" &&
    interruptResolutionAddedArmorClassEffect(before, result)
  ) {
    return [
      eventForOwner("battleSpellSlotAndActionEconomy"),
      eventForOwner("battleActiveEffect"),
      eventForOwner("battleInterruptStack"),
    ];
  }
  /* v8 ignore stop -- @preserve */
  return [eventForOwner("battleInterruptStack")];
}

export function battleReducerRouteForCreatureFallsInterruptWindow(
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (result.tag !== "needsHoles") {
    return undefined;
  }
  const holes = battleReducerRouteHoles(result.holes);
  if (!holes.includes("interruptDecision")) {
    return undefined;
  }
  return [
    discoverBattleActsRoute(
      "reactionSpell",
      ["interruptDecision"],
      "battleInterruptStack",
    ),
    discoverBattleActsRoute(
      "reactionFallMitigation",
      ["interruptDecision"],
      "battleInterruptStack",
    ),
  ];
}

export function battleReducerRouteForFallingCreatureMitigationLanding(
  result: BattleFallingCreatureMitigationLandingResult,
): BattleReducerRouteEvents | undefined {
  if (result.tag !== "mitigated") {
    return undefined;
  }
  return [
    resolveBattleSubjectWithoutFillRoute(
      "reactionFallMitigation",
      [],
      "battleActiveEffect",
    ),
    resolveBattleSubjectWithoutFillRoute(
      "reactionFallMitigation",
      [],
      "battleMovementResource",
    ),
    resolveBattleSubjectWithoutFillRoute(
      "reactionFallMitigation",
      [],
      "battleHitPoint",
    ),
  ];
}

function interruptResolutionAddedArmorClassEffect(
  before: BattleState,
  result: Extract<BattleResolutionResult, { readonly tag: "resolved" }>,
): boolean {
  return [...result.state.combatants.values()].some(
    (combatant) =>
      armorClassEffectCount(combatant.activeEffects) >
      armorClassEffectCount(
        before.combatants.get(combatant.combatantId)?.activeEffects ?? [],
      ),
  );
}

function armorClassEffectCount(
  activeEffects: readonly BattleActiveEffect[],
): number {
  return activeEffects.filter(
    (effect) => effect.kind === "spellArmorClassBonus",
  ).length;
}
