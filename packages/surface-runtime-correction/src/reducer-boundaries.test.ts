import { describe, expect, it } from "vitest";

import { createInitiativeStack, currentActing } from "@dnd/shared/initiative-algebra";
import type { CreatureId, ReadonlyNonEmptyArray } from "@dnd/shared/types";

import { discoverAvailableActions } from "#/reducer-discovery.ts";
import { resolveSubject } from "#/reducer-execution.ts";
import type { State } from "#/reducer-state.ts";

function emptyState(): State {
  const order = [
    { creature: "A" as CreatureId, initiative: 10 as never },
  ] as unknown as ReadonlyNonEmptyArray<{
    readonly creature: CreatureId
    readonly initiative: never
  }>;

  return {
    initiative: createInitiativeStack(order, 1 as never),
    combatants: new Map(),
    currentActionsAvailable: 1,
    currentHasBonusAction: true,
    currentHasFreeAction: true,
  };
}

function twoCreatureState(): State {
  const state = emptyState();
  return {
    ...state,
    combatants: new Map([
      ["A" as CreatureId, {} as never],
      ["B" as CreatureId, {} as never],
    ]),
  };
}

describe("reducer boundaries", () => {
  it("discoverAvailableActions surfaces core attack and endTurn when another creature exists", () => {
    expect(discoverAvailableActions(twoCreatureState())).toEqual([
      {
        subject: { tag: "coreAction", actorId: "A" as CreatureId, action: "attack" },
        label: "Attack",
        summary: "Make an attack.",
        initialHoles: [
          {
            promptInstanceKey: "core:attack:target",
            holeId: "core_attack_target",
            kind: "targetChoice",
            label: "attack target",
          },
        ],
      },
      {
        subject: { tag: "coreAction", actorId: "A" as CreatureId, action: "endTurn" },
        label: "End Turn",
        summary: "End the current turn.",
        initialHoles: [],
      },
    ]);
  });

  it("discoverAvailableActions suppresses core attack when no other creature exists", () => {
    expect(discoverAvailableActions(emptyState())).toEqual([
      {
        subject: { tag: "coreAction", actorId: "A" as CreatureId, action: "endTurn" },
        label: "End Turn",
        summary: "End the current turn.",
        initialHoles: [],
      },
    ]);
  });

  it("resolveSubject advances initiative for core endTurn", () => {
    const result = resolveSubject(emptyState(), {
      subject: { tag: "coreAction", actorId: "A" as CreatureId, action: "endTurn" },
      filledHoleValues: [],
    });

    expect(result.tag).toBe("resolved");
    if (result.tag !== "resolved") {
      throw new Error("expected resolved result");
    }

    expect(currentActing(result.state.initiative)).toBe("A");
    expect(result.state.currentActionsAvailable).toBe(1);
    expect(result.state.currentHasBonusAction).toBe(true);
    expect(result.state.currentHasFreeAction).toBe(true);
  });

  it("resolveSubject requests a target hole for core attack", () => {
    expect(resolveSubject(twoCreatureState(), {
      subject: { tag: "coreAction", actorId: "A" as CreatureId, action: "attack" },
      filledHoleValues: [],
    })).toEqual({
      tag: "needsHoles",
      holes: [
        {
          promptInstanceKey: "core:attack:target",
          holeId: "core_attack_target",
          kind: "targetChoice",
          label: "attack target",
        },
      ],
    });
  });

  it("resolveSubject requests an attack roll after a valid attack target", () => {
    expect(resolveSubject(twoCreatureState(), {
      subject: { tag: "coreAction", actorId: "A" as CreatureId, action: "attack" },
      filledHoleValues: [
        {
          kind: "targetChoice",
          holeId: "core_attack_target" as never,
          value: "B" as CreatureId,
        },
      ],
    })).toEqual({
      tag: "needsHoles",
      holes: [
        {
          promptInstanceKey: "core:attack:attackRoll",
          holeId: "core_attack_roll",
          kind: "attackRoll",
          label: "attack roll",
        },
      ],
    });
  });

  it("resolveSubject rejects an invalid attack target", () => {
    expect(resolveSubject(twoCreatureState(), {
      subject: { tag: "coreAction", actorId: "A" as CreatureId, action: "attack" },
      filledHoleValues: [
        {
          kind: "targetChoice",
          holeId: "core_attack_target" as never,
          value: "A" as CreatureId,
        },
      ],
    })).toEqual({
      tag: "invalid",
      reason: "invalid attack target",
    });
  });

  it("resolveSubject rejects core endTurn for a non-acting creature", () => {
    expect(resolveSubject(emptyState(), {
      subject: { tag: "coreAction", actorId: "B" as CreatureId, action: "endTurn" },
      filledHoleValues: [],
    })).toEqual({
      tag: "invalid",
      reason: "actor is not currently acting",
    });
  });
});
