import { describe, expect, it } from "vitest";
import { Either } from "effect";
import type { CreatureId } from "@dnd/shared/types";

import {
  activationResourceCostFromSurfaceKind,
  canSpendAction,
  grantUnitActionResource,
  resetTurnActionEconomy,
  spendActivationResource,
  type ActionEconomyState,
} from "@dnd/shared-algebras/action-economy-algebra";

const ready: ActionEconomyState = {
  actionResources: [{ kind: "action", source: "turn" }],
  currentHasBonusAction: true,
};
const ownerA = "A" as CreatureId;
const ownerB = "B" as CreatureId;

function expectRight<T, E>(value: Either.Either<T, E>): T {
  if (Either.isLeft(value)) {
    throw new Error(String(value.left));
  }

  return value.right;
}

describe("reducer action economy", () => {
  it("spends one action from the current action count", () => {
    const state = expectRight(
      spendActivationResource(ready, { kind: "action", action: "attack" }),
    );

    expect(state.actionResources).toEqual([]);
    expect(canSpendAction(state, "attack")).toBe(false);
  });

  it("spends restricted unit actions before turn actions", () => {
    const surged = expectRight(
      grantUnitActionResource(ready, ownerA, "fighter_action_surge_l2", {
        kind: "exclude",
        actions: ["magic"],
      }),
    );
    const state = expectRight(
      spendActivationResource(surged, { kind: "action", action: "attack" }),
    );

    expect(state.actionResources).toEqual([{ kind: "action", source: "turn" }]);
    expect(canSpendAction(state, "magic")).toBe(true);
  });

  it("rejects restricted unit actions for excluded action kinds", () => {
    const surged = expectRight(
      grantUnitActionResource(
        { ...ready, actionResources: [] },
        ownerA,
        "fighter_action_surge_l2",
        {
          kind: "exclude",
          actions: ["magic"],
        },
      ),
    );

    expect(canSpendAction(surged, "attack")).toBe(true);
    expect(canSpendAction(surged, "magic")).toBe(false);
  });

  it("rejects duplicate unit action resources from the same unit", () => {
    const surged = expectRight(
      grantUnitActionResource(ready, ownerA, "fighter_action_surge_l2", {
        kind: "exclude",
        actions: ["magic"],
      }),
    );

    const result = grantUnitActionResource(
      surged,
      ownerA,
      "fighter_action_surge_l2",
      {
        kind: "exclude",
        actions: ["magic"],
      },
    );

    expect(result).toEqual(Either.left("unit action resource already granted"));
  });

  it("allows the same unit id to grant resources for different owners", () => {
    const ownerASurged = expectRight(
      grantUnitActionResource(ready, ownerA, "fighter_action_surge_l2", {
        kind: "exclude",
        actions: ["magic"],
      }),
    );
    const bothSurged = expectRight(
      grantUnitActionResource(ownerASurged, ownerB, "fighter_action_surge_l2", {
        kind: "exclude",
        actions: ["magic"],
      }),
    );

    expect(bothSurged.actionResources).toHaveLength(3);
  });

  it("rejects an action when no action remains", () => {
    const result = spendActivationResource(
      { ...ready, actionResources: [] },
      { kind: "action", action: "attack" },
    );

    expect(Either.isLeft(result)).toBe(true);
  });

  it("spends bonus action flags and treats free costs as no action-economy spend", () => {
    const withoutBonus = expectRight(
      spendActivationResource(ready, { kind: "bonusAction" }),
    );
    const withoutFree = expectRight(
      spendActivationResource(ready, { kind: "free" }),
    );

    expect(withoutBonus.currentHasBonusAction).toBe(false);
    expect(withoutFree).toEqual(ready);
  });

  it("maps supported Surface resource names", () => {
    expect(activationResourceCostFromSurfaceKind("action")).toEqual({
      kind: "action",
      action: "magic",
    });
    expect(activationResourceCostFromSurfaceKind("bonus_action")).toEqual({
      kind: "bonusAction",
    });
  });

  it("resets the next turn economy", () => {
    expect(
      resetTurnActionEconomy({
        actionResources: [
          {
            kind: "action",
            source: "unit",
            sourceOwnerId: ownerA,
            sourceUnitId: "fighter_action_surge_l2",
            restriction: { kind: "exclude", actions: ["magic"] },
          },
        ],
        currentHasBonusAction: false,
      }),
    ).toEqual(ready);
  });
});
