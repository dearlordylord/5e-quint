import { Either, Option, Schema } from "effect";
import { describe, expect, it } from "vitest";

import type { ActionRestriction, UnitRecord } from "@dnd/surface/surface/types";
import { CreatureId as CreatureIdSchema } from "@dnd/shared/types";
import { Index, Initiative, Round } from "@dnd/shared/types";

import {
  grantUnitActionResource,
  resetTurnActionEconomy,
  spendAction,
  spendActivationResource,
  type ActionEconomyState,
} from "./action-economy-algebra.ts";
import {
  EMPTY_CONDITION_STATE,
  applyCondition,
  hasCondition,
  isIncapacitated,
  removeCondition,
} from "./conditions-algebra.ts";
import {
  addDeathFailures,
  resetDeathSaveRuntimeState,
  resolveDeathSavingThrow,
} from "./death-saves-algebra.ts";
import {
  createInitiativeStack,
  currentActing,
  initiativeOrder,
  insertByInitiative,
  nextInitiative,
  removeFromInitiative,
  swapInitialInitiativeScores,
  type InitiativeEntry,
  type InitiativeStack,
} from "./initiative-algebra.ts";

const sourceOwnerId = Schema.decodeUnknownSync(CreatureIdSchema)("owner-a");
const unitActionId: UnitRecord["id"] = "unit-action-a";
const attackOnlyRestriction: ActionRestriction = {
  kind: "exclude",
  actions: ["magic"],
};

describe("action-economy-algebra", () => {
  it("resets turn action and bonus-action resources", () => {
    const state = resetTurnActionEconomy(emptyActionEconomyState());

    expect(state.actionResources).toEqual([{ kind: "action", source: "turn" }]);
    expect(state.currentHasBonusAction).toBe(true);
  });

  it("spends restricted unit action resources before the ordinary turn action", () => {
    const granted = grantTestUnitActionResource();

    const spent = spendAction(granted, "attack");
    expect(Either.isRight(spent)).toBe(true);
    if (Either.isLeft(spent)) return;

    expect(spent.right.actionResources).toEqual([
      { kind: "action", source: "turn" },
    ]);
  });

  it("keeps bonus action spending separate from free activation", () => {
    const state = resetTurnActionEconomy(emptyActionEconomyState());

    const free = spendActivationResource(state, { kind: "free" });
    expect(free).toEqual(Either.right(state));

    const spentBonusAction = spendActivationResource(state, {
      kind: "bonusAction",
    });
    expect(Either.isRight(spentBonusAction)).toBe(true);
    if (Either.isLeft(spentBonusAction)) return;
    expect(spentBonusAction.right.currentHasBonusAction).toBe(false);
    expect(
      spendActivationResource(spentBonusAction.right, { kind: "bonusAction" }),
    ).toEqual(Either.left("no bonus action available"));
  });

  it("rejects duplicate unit-granted action resources by owner and unit id", () => {
    const granted = grantTestUnitActionResource();

    expect(
      grantUnitActionResource(
        granted,
        sourceOwnerId,
        unitActionId,
        attackOnlyRestriction,
      ),
    ).toEqual(Either.left("unit-granted action resource already granted"));
  });
});

describe("conditions-algebra", () => {
  it("applies Unconscious as Prone and Incapacitated", () => {
    const state = applyCondition(EMPTY_CONDITION_STATE, "unconscious");

    expect(state.unconscious).toBe(true);
    expect(state.prone).toBe(true);
    expect(isIncapacitated(state)).toBe(true);
    expect(hasCondition(state, "incapacitated")).toBe(true);
  });

  it("does not remove Prone while Unconscious remains active", () => {
    const unconscious = applyCondition(EMPTY_CONDITION_STATE, "unconscious");
    const stillProne = removeCondition(unconscious, "prone");
    const awake = removeCondition(stillProne, "unconscious");

    expect(stillProne.prone).toBe(true);
    expect(awake).toEqual({ ...stillProne, unconscious: false });
    expect(hasCondition(awake, "prone")).toBe(true);
  });

  it("derives Incapacitated from direct and implied condition facts", () => {
    expect(
      isIncapacitated(applyCondition(EMPTY_CONDITION_STATE, "incapacitated")),
    ).toBe(true);
    expect(
      isIncapacitated(applyCondition(EMPTY_CONDITION_STATE, "paralyzed")),
    ).toBe(true);
    expect(isIncapacitated(EMPTY_CONDITION_STATE)).toBe(false);
  });
});

describe("death-saves-algebra", () => {
  it("marks the creature Stable and resets counters after three successes", () => {
    const first = resolveDeathSavingThrow(resetDeathSaveRuntimeState(), 10);
    const second = resolveDeathSavingThrow(first, 10);
    const third = resolveDeathSavingThrow(second, 10);

    expect(third).toEqual({
      deathSaves: { successes: 0, failures: 0 },
      stable: true,
      dead: false,
      hpRegained: false,
    });
  });

  it("records natural 1 as two failures and three failures as dead", () => {
    const nat1 = resolveDeathSavingThrow(resetDeathSaveRuntimeState(), 1);
    const dead = addDeathFailures(nat1, 1);

    expect(nat1.deathSaves).toEqual({ successes: 0, failures: 2 });
    expect(dead.dead).toBe(true);
    expect(dead.deathSaves.failures).toBe(3);
  });

  it("records natural 20 as HP regained and ignores later death-save changes", () => {
    const hpRegained = resolveDeathSavingThrow(
      resetDeathSaveRuntimeState(),
      20,
    );

    expect(hpRegained).toEqual({
      deathSaves: { successes: 0, failures: 0 },
      stable: false,
      dead: false,
      hpRegained: true,
    });
    expect(addDeathFailures(hpRegained, 2)).toBe(hpRegained);
    expect(resolveDeathSavingThrow(hpRegained, 1)).toBe(hpRegained);
  });
});

describe("initiative-algebra", () => {
  it("advances through the caller-supplied order and increments the round", () => {
    const first = nextInitiative(initialInitiativeStack());
    const second = nextInitiative(first);

    expect(currentActing(first)).toBe("c2");
    expect(second.round).toBe(2);
    expect(initiativeOrder(second)).toEqual(["c1", "c2"]);
  });

  it("normalizes removal when no still-to-act entries remain", () => {
    const stack = nextInitiative(initialInitiativeStack());
    const result = removeFromInitiative(stack, (creature) => creature === "c2");

    expect(Option.isSome(result)).toBe(true);
    if (Option.isNone(result)) return;
    expect(result.value.round).toBe(2);
    expect(initiativeOrder(result.value)).toEqual(["c1"]);
  });

  it("requires caller tie decisions for equal initiative insertion", () => {
    const stack = createInitiativeStack(
      [initiativeEntry("c1", 10), initiativeEntry("c2", 10)],
      Round(1),
    );

    const undecided = insertByInitiative(stack, "cx", Initiative(10));
    expect(undecided).toEqual({ status: "decide", tie: ["c1", "c2"] });

    const inserted = insertByInitiative(stack, "cx", Initiative(10), [
      ["c1", "c2"],
      Index(1),
    ]);
    expect(inserted.status).toBe("ok");
    if (inserted.status !== "ok") return;
    expect(initiativeOrder(inserted.stack)).toEqual(["c1", "cx", "c2"]);
  });

  it("rejects initial Initiative score swaps when either actor is absent", () => {
    const stack = initialInitiativeStack();

    expect(
      Option.isNone(swapInitialInitiativeScores(stack, "missing", "c1")),
    ).toBe(true);
    expect(
      Option.isNone(swapInitialInitiativeScores(stack, "c1", "missing")),
    ).toBe(true);
  });
});

function emptyActionEconomyState(): ActionEconomyState {
  return {
    actionResources: [],
    currentHasBonusAction: false,
  };
}

function grantTestUnitActionResource(): ActionEconomyState {
  const granted = grantUnitActionResource(
    resetTurnActionEconomy(emptyActionEconomyState()),
    sourceOwnerId,
    unitActionId,
    attackOnlyRestriction,
  );
  expect(Either.isRight(granted)).toBe(true);
  if (Either.isLeft(granted)) {
    throw new Error("Expected test setup to grant a unit action resource.");
  }
  return granted.right;
}

function initialInitiativeStack(): InitiativeStack<string> {
  return createInitiativeStack(
    [initiativeEntry("c1", 2), initiativeEntry("c2", 1)],
    Round(1),
  );
}

function initiativeEntry(
  creature: string,
  initiative: number,
): InitiativeEntry<string> {
  return { creature, initiative: Initiative(initiative) };
}
