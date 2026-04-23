import { describe, expect, it } from "vitest";

import { createInitiativeStack, currentActing } from "@dnd/shared/initiative-algebra";
import type {
  CreatureId,
  DieRollResult,
  ReadonlyNonEmptyArray,
} from "@dnd/shared/types";

import { discoverAvailableActs } from "#/reducer-discovery.ts";
import { resolveSubjectHoles } from "#/reducer-hole-resolution.ts";
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

function exhaustedActionState(): State {
  return {
    ...twoCreatureState(),
    currentActionsAvailable: 0,
  };
}

describe("reducer boundaries", () => {
  it("discoverAvailableActs surfaces core attack and endTurn when another creature exists", () => {
    expect(discoverAvailableActs(twoCreatureState())).toEqual([
      {
        subject: { tag: "coreAct", actorId: "A" as CreatureId, act: "attack" },
        label: "Attack",
        summary: "Make an attack.",
        initialHoles: [
          {
            holeInstanceKey: "core:attack:target",
            holeId: "core_attack_target",
            kind: "targetChoice",
            label: "attack target",
          },
        ],
      },
      {
        subject: { tag: "coreAct", actorId: "A" as CreatureId, act: "endTurn" },
        label: "End Turn",
        summary: "End the current turn.",
        initialHoles: [],
      },
    ]);
  });

  it("discoverAvailableActs suppresses core attack when no other creature exists", () => {
    expect(discoverAvailableActs(emptyState())).toEqual([
      {
        subject: { tag: "coreAct", actorId: "A" as CreatureId, act: "endTurn" },
        label: "End Turn",
        summary: "End the current turn.",
        initialHoles: [],
      },
    ]);
  });

  it("discoverAvailableActs suppresses core attack when no action is available", () => {
    expect(discoverAvailableActs(exhaustedActionState())).toEqual([
      {
        subject: { tag: "coreAct", actorId: "A" as CreatureId, act: "endTurn" },
        label: "End Turn",
        summary: "End the current turn.",
        initialHoles: [],
      },
    ]);
  });

  it("resolveSubjectHoles advances initiative for core endTurn", () => {
    const result = resolveSubjectHoles(emptyState(), {
      subject: { tag: "coreAct", actorId: "A" as CreatureId, act: "endTurn" },
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

  it("resolveSubjectHoles requests a target hole for core attack", () => {
    expect(resolveSubjectHoles(twoCreatureState(), {
      subject: { tag: "coreAct", actorId: "A" as CreatureId, act: "attack" },
      filledHoleValues: [],
    })).toEqual({
      tag: "needsHoles",
      holes: [
        {
          holeInstanceKey: "core:attack:target",
          holeId: "core_attack_target",
          kind: "targetChoice",
          label: "attack target",
        },
      ],
    });
  });

  it("resolveSubjectHoles requests an attack roll after a valid attack target", () => {
    expect(resolveSubjectHoles(twoCreatureState(), {
      subject: { tag: "coreAct", actorId: "A" as CreatureId, act: "attack" },
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
          holeInstanceKey: "core:attack:attackRoll",
          holeId: "core_attack_roll",
          kind: "attackRoll",
          label: "attack roll",
        },
      ],
    });
  });

  it("resolveSubjectHoles requests damage dice after an attack roll", () => {
    expect(resolveSubjectHoles(twoCreatureState(), {
      subject: { tag: "coreAct", actorId: "A" as CreatureId, act: "attack" },
      filledHoleValues: [
        {
          kind: "targetChoice",
          holeId: "core_attack_target" as never,
          value: "B" as CreatureId,
        },
        {
          kind: "attackRoll",
          holeId: "core_attack_roll" as never,
          value: 17,
        },
      ],
    })).toEqual({
      tag: "needsHoles",
      holes: [
        {
          holeInstanceKey: "core:attack:damage",
          holeId: "core_attack_damage",
          kind: "rolledDice",
          label: "damage roll",
        },
      ],
    });
  });

  it("resolveSubjectHoles stops at hit adjudication after attack damage is filled", () => {
    expect(resolveSubjectHoles(twoCreatureState(), {
      subject: { tag: "coreAct", actorId: "A" as CreatureId, act: "attack" },
      filledHoleValues: [
        {
          kind: "targetChoice",
          holeId: "core_attack_target" as never,
          value: "B" as CreatureId,
        },
        {
          kind: "attackRoll",
          holeId: "core_attack_roll" as never,
          value: 17,
        },
        {
          kind: "rolledDice",
          holeId: "core_attack_damage" as never,
          value: [{ results: [6 as DieRollResult] }],
        },
      ],
    })).toEqual({
      tag: "invalid",
      reason: "attack hit adjudication is not implemented yet",
    });
  });

  it("resolveSubjectHoles rejects an invalid attack target", () => {
    expect(resolveSubjectHoles(twoCreatureState(), {
      subject: { tag: "coreAct", actorId: "A" as CreatureId, act: "attack" },
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

  it("resolveSubjectHoles rejects core attack when no action is available", () => {
    expect(resolveSubjectHoles(exhaustedActionState(), {
      subject: { tag: "coreAct", actorId: "A" as CreatureId, act: "attack" },
      filledHoleValues: [],
    })).toEqual({
      tag: "invalid",
      reason: "no action available for attack",
    });
  });

  it("resolveSubjectHoles rejects core endTurn for a non-acting creature", () => {
    expect(resolveSubjectHoles(emptyState(), {
      subject: { tag: "coreAct", actorId: "B" as CreatureId, act: "endTurn" },
      filledHoleValues: [],
    })).toEqual({
      tag: "invalid",
      reason: "actor is not currently acting",
    });
  });
});
