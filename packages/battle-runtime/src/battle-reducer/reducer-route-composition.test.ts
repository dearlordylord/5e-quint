import { describe, expect, test, vi } from "vitest";

import {
  appendTerminalRouteEvents,
  composableRouteCandidate,
  composeReducerRouteCandidates,
  terminalRouteCandidate,
} from "./reducer-route-composition.ts";
import { startBattleRoute } from "./reducer-route-builders.ts";

describe("reducer route composition", () => {
  test("accumulates composable owners until the first terminal owner", () => {
    const skipped = vi.fn(
      () => [startBattleRoute("battleTurnBoundary")] as const,
    );

    expect(
      composeReducerRouteCandidates([
        composableRouteCandidate(() => [
          startBattleRoute("battleActionEconomy"),
        ]),
        composableRouteCandidate(() => undefined),
        terminalRouteCandidate(() => [startBattleRoute("battleActiveEffect")]),
        terminalRouteCandidate(skipped),
      ]),
    ).toEqual([
      startBattleRoute("battleActionEconomy"),
      startBattleRoute("battleActiveEffect"),
    ]);
    expect(skipped).not.toHaveBeenCalled();
  });

  test("returns accumulated composable routes when no terminal owner applies", () => {
    expect(
      composeReducerRouteCandidates([
        terminalRouteCandidate(() => undefined),
        composableRouteCandidate(() => [startBattleRoute("battleCompanion")]),
      ]),
    ).toEqual([startBattleRoute("battleCompanion")]);
  });

  test("appends terminal lifecycle routes after the selected owner route", () => {
    expect(
      appendTerminalRouteEvents(
        [startBattleRoute("battleHitPoint")],
        [startBattleRoute("battleActiveEffect")],
      ),
    ).toEqual([
      startBattleRoute("battleHitPoint"),
      startBattleRoute("battleActiveEffect"),
    ]);
  });
});
