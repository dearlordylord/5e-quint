import {
  resetTurnActionEconomy,
  type ActionEconomyState,
} from "@dnd/shared-algebras/action-economy-algebra";
import { Result } from "effect";
import { describe, expect, it } from "vitest";
import { statBlockSpellcastingActionCost } from "../stat-block-execution-state.ts";
import { spendSpellCastAction } from "./spellcasting-action-cost.ts";

function readyTurn(): ActionEconomyState {
  return resetTurnActionEconomy({
    actionResources: [],
    actionTakenThisTurn: false,
    currentHasBonusAction: false,
    actionOrBonusActionExclusion: { kind: "notRestricted" },
    movementActionBonusActionExclusion: { kind: "notRestricted" },
  });
}

describe("Stat Block spellcasting action cost", () => {
  it.each(["actions", "bonusActions"] as const)(
    "spends one %s cost without adding or spending a usage pool",
    (section) => {
      const resourcePoolRefs = [] as const;
      const state = { ...readyTurn(), resourcePoolRefs };
      const cost = statBlockSpellcastingActionCost({
        kind: "spellcasting",
        section,
      });
      const first = spendSpellCastAction(state, cost);
      expect(Result.isSuccess(first)).toBe(true);
      if (Result.isFailure(first)) return;
      expect(first.success.resourcePoolRefs).toBe(resourcePoolRefs);
      expect(first.success.actionResources.length).toBe(
        section === "actions" ? 0 : 1,
      );
      expect(first.success.currentHasBonusAction).toBe(section === "actions");
      const unchanged = first.success;
      expect(Result.isFailure(spendSpellCastAction(unchanged, cost))).toBe(
        true,
      );
      expect(first.success).toBe(unchanged);
      expect(
        Result.isSuccess(
          spendSpellCastAction({ ...readyTurn(), resourcePoolRefs }, cost),
        ),
      ).toBe(true);
    },
  );

  it("respects action versus bonus-action exclusion", () => {
    const state: ActionEconomyState = {
      ...readyTurn(),
      actionOrBonusActionExclusion: { kind: "restricted", choice: "action" },
    };
    expect(spendSpellCastAction(state, "bonusAction")).toEqual(
      Result.fail(
        "Bonus Action spell is no longer available for the current actor.",
      ),
    );
    expect(state.currentHasBonusAction).toBe(true);
  });

  it("rejects Magic when no action remains without mutating the turn", () => {
    const state: ActionEconomyState = { ...readyTurn(), actionResources: [] };
    expect(spendSpellCastAction(state, "magicAction")).toEqual(
      Result.fail("Magic action is no longer available for the current actor."),
    );
    expect(state.actionResources).toEqual([]);
    expect(state.currentHasBonusAction).toBe(true);
  });
});
