import { describe, expect, it } from "vitest";
import { Either } from "effect";

import {
  activationResourceCostFromSurfaceKind,
  canSpendAction,
  resetTurnActionEconomy,
  spendActivationResource,
  type ActionEconomyState,
} from "#/reducer-action-economy.ts";

const ready: ActionEconomyState = {
  currentActionsAvailable: 1,
  currentHasBonusAction: true,
  currentHasFreeAction: true,
};

function expectRight<T, E>(value: Either.Either<T, E>): T {
  if (Either.isLeft(value)) {
    throw new Error(String(value.left));
  }

  return value.right;
}

describe("reducer action economy", () => {
  it("spends one action from the current action count", () => {
    const state = expectRight(
      spendActivationResource(ready, { kind: "action" }),
    );

    expect(state.currentActionsAvailable).toBe(0);
    expect(canSpendAction(state)).toBe(false);
  });

  it("supports action-surge style two-action state", () => {
    const state = expectRight(
      spendActivationResource(
        { ...ready, currentActionsAvailable: 2 },
        { kind: "action" },
      ),
    );

    expect(state.currentActionsAvailable).toBe(1);
  });

  it("rejects an action when no action remains", () => {
    const result = spendActivationResource(
      { ...ready, currentActionsAvailable: 0 },
      { kind: "action" },
    );

    expect(Either.isLeft(result)).toBe(true);
  });

  it("spends bonus and free action flags", () => {
    const withoutBonus = expectRight(
      spendActivationResource(ready, { kind: "bonusAction" }),
    );
    const withoutFree = expectRight(
      spendActivationResource(ready, { kind: "free" }),
    );

    expect(withoutBonus.currentHasBonusAction).toBe(false);
    expect(withoutFree.currentHasFreeAction).toBe(false);
  });

  it("maps supported Surface resource names", () => {
    expect(activationResourceCostFromSurfaceKind("action")).toEqual({
      kind: "action",
    });
    expect(activationResourceCostFromSurfaceKind("bonus_action")).toEqual({
      kind: "bonusAction",
    });
  });

  it("resets the next turn economy", () => {
    expect(
      resetTurnActionEconomy({
        currentActionsAvailable: 0,
        currentHasBonusAction: false,
        currentHasFreeAction: false,
      }),
    ).toEqual(ready);
  });
});
