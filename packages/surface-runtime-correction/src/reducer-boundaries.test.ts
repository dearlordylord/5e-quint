import { describe, expect, it } from "vitest";

import { EMPTY_CONDITION_STATE } from "@dnd/shared/conditions-algebra";
import {
  createInitiativeStack,
  currentActing,
} from "@dnd/shared/initiative-algebra";
import type {
  CreatureId,
  DieRollResult,
  Hp,
  ReadonlyNonEmptyArray,
} from "@dnd/shared/types";

import { discoverAvailableActs } from "#/reducer-discovery.ts";
import { statBlockArmorClassState } from "#/reducer-armor-class.ts";
import { resolveSubjectHoles } from "#/reducer-hole-resolution.ts";
import { spellcastingAbilityModifier } from "#/reducer-state.ts";
import type { CreatureState, State } from "#/reducer-state.ts";
import { holeId } from "#/reducer-types.ts";
import type { FilledHoleValue, RolledDiceGroup } from "#/reducer-types.ts";
import { loadSupportedUnit } from "#/supported-unit-library.ts";

function creatureState(overrides: Partial<CreatureState> = {}): CreatureState {
  return {
    hp: 1 as Hp,
    maxHp: 1 as Hp,
    tempHp: 0 as Hp,
    conditions: EMPTY_CONDITION_STATE,
    hasReaction: true,
    units: [],
    armorClass: statBlockArmorClassState(10),
    spellcastingAbilityModifier: spellcastingAbilityModifier(0),
    spellSlots: [],
    slotExpendedThisTurn: false,
    spellSlotsMax: [],
    ...overrides,
  };
}

function healingRollFill(
  results: ReadonlyNonEmptyArray<number>,
): Extract<FilledHoleValue, { readonly kind: "rolledDice" }> {
  return {
    kind: "rolledDice" as const,
    holeId: holeId("activation:0_healing_roll_0"),
    value: [
      {
        results: results.map((result) => result as DieRollResult) as [
          DieRollResult,
          ...DieRollResult[],
        ],
      },
    ] as ReadonlyNonEmptyArray<RolledDiceGroup>,
  };
}

function fireBoltDamageRollFill(
  results: ReadonlyNonEmptyArray<number>,
): Extract<FilledHoleValue, { readonly kind: "rolledDice" }> {
  return {
    kind: "rolledDice" as const,
    holeId: holeId("activation:0_damage_roll_0"),
    value: [
      {
        results: results.map((result) => result as DieRollResult) as [
          DieRollResult,
          ...DieRollResult[],
        ],
      },
    ] as ReadonlyNonEmptyArray<RolledDiceGroup>,
  };
}

function attackRollFill(
  holeIdText: string,
  total: number,
  naturalD20 = total,
): Extract<FilledHoleValue, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: holeId(holeIdText),
    value: {
      total,
      naturalD20: naturalD20 as DieRollResult,
    },
  };
}

function emptyState(): State {
  const order = [
    { creature: "A" as CreatureId, initiative: 10 as never },
  ] as unknown as ReadonlyNonEmptyArray<{
    readonly creature: CreatureId;
    readonly initiative: never;
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
      ["A" as CreatureId, creatureState()],
      ["B" as CreatureId, creatureState()],
    ]),
  };
}

function exhaustedActionState(): State {
  return {
    ...twoCreatureState(),
    currentActionsAvailable: 0,
  };
}

function twoCreatureStateWithActingUnit(
  unitId: string,
  actingOverrides: Partial<CreatureState> = {},
): State {
  const unit = loadSupportedUnit(unitId);
  return {
    ...twoCreatureState(),
    combatants: new Map([
      [
        "A" as CreatureId,
        creatureState({
          units: [unit],
          ...actingOverrides,
        }),
      ],
      ["B" as CreatureId, creatureState()],
    ]),
  };
}

function twoCreatureStateWithActingSpellSlots(
  unitId: string,
  spellSlots: ReadonlyArray<number>,
): State {
  return twoCreatureStateWithActingUnit(unitId, {
    spellSlots,
    spellSlotsMax: spellSlots,
  });
}

function twoCreatureStateWithActingSpellSlot(unitId: string): State {
  return twoCreatureStateWithActingSpellSlots(unitId, [1]);
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

  it("discoverAvailableActs surfaces acting-creature fire bolt as a unit-backed act", () => {
    expect(
      discoverAvailableActs(twoCreatureStateWithActingUnit("fire_bolt")),
    ).toEqual([
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
      {
        subject: {
          tag: "unit",
          actorId: "A" as CreatureId,
          unitId: "fire_bolt",
        },
        label: "Fire Bolt",
        summary: expect.stringContaining("You hurl a mote of fire"),
        initialHoles: [
          {
            holeInstanceKey: "activation:0:surface:fire_bolt_target",
            holeId: "fire_bolt_target",
            kind: "targetChoice",
            label: "fire bolt target",
          },
          {
            holeInstanceKey: "activation:0:runtime:attackRoll",
            holeId: "activation:0_attack_roll",
            kind: "attackRoll",
          },
        ],
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

  it("resolveSubjectHoles resets the next actor's slot-expended flag on endTurn", () => {
    const result = resolveSubjectHoles(
      {
        ...twoCreatureState(),
        combatants: new Map([
          ["A" as CreatureId, creatureState({ slotExpendedThisTurn: true })],
          ["B" as CreatureId, creatureState()],
        ]),
      },
      {
        subject: {
          tag: "coreAct",
          actorId: "A" as CreatureId,
          act: "endTurn",
        },
        filledHoleValues: [],
      },
    );

    expect(result.tag).toBe("resolved");
    if (result.tag === "resolved") {
      expect(
        result.state.combatants.get("A" as CreatureId)?.slotExpendedThisTurn,
      ).toBe(false);
    }
  });

  it("resolveSubjectHoles requests a target hole for core attack", () => {
    expect(
      resolveSubjectHoles(twoCreatureState(), {
        subject: { tag: "coreAct", actorId: "A" as CreatureId, act: "attack" },
        filledHoleValues: [],
      }),
    ).toEqual({
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
    expect(
      resolveSubjectHoles(twoCreatureState(), {
        subject: { tag: "coreAct", actorId: "A" as CreatureId, act: "attack" },
        filledHoleValues: [
          {
            kind: "targetChoice",
            holeId: "core_attack_target" as never,
            value: "B" as CreatureId,
          },
        ],
      }),
    ).toEqual({
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

  it("resolveSubjectHoles resolves a core attack hit without applying damage yet", () => {
    expect(
      resolveSubjectHoles(twoCreatureState(), {
        subject: { tag: "coreAct", actorId: "A" as CreatureId, act: "attack" },
        filledHoleValues: [
          {
            kind: "targetChoice",
            holeId: "core_attack_target" as never,
            value: "B" as CreatureId,
          },
          attackRollFill("core_attack_roll", 17),
        ],
      }),
    ).toEqual({
      tag: "resolved",
      state: {
        ...twoCreatureState(),
        currentActionsAvailable: 0,
      },
    });
  });

  it("resolveSubjectHoles resolves a missed core attack without asking for damage", () => {
    const result = resolveSubjectHoles(twoCreatureState(), {
      subject: { tag: "coreAct", actorId: "A" as CreatureId, act: "attack" },
      filledHoleValues: [
        {
          kind: "targetChoice",
          holeId: "core_attack_target" as never,
          value: "B" as CreatureId,
        },
        attackRollFill("core_attack_roll", 9),
      ],
    });

    expect(result.tag).toBe("resolved");
    if (result.tag === "resolved") {
      expect(result.state.combatants.get("B" as CreatureId)?.hp).toBe(1);
      expect(result.state.currentActionsAvailable).toBe(0);
    }
  });

  it("resolveSubjectHoles rejects core attack damage dice on a miss", () => {
    expect(
      resolveSubjectHoles(twoCreatureState(), {
        subject: { tag: "coreAct", actorId: "A" as CreatureId, act: "attack" },
        filledHoleValues: [
          {
            kind: "targetChoice",
            holeId: "core_attack_target" as never,
            value: "B" as CreatureId,
          },
          attackRollFill("core_attack_roll", 9),
          {
            kind: "rolledDice",
            holeId: "core_attack_damage" as never,
            value: [{ results: [6 as DieRollResult] }],
          },
        ],
      }),
    ).toEqual({
      tag: "invalid",
      reason: "unexpected filled value for hole core_attack_damage",
    });
  });

  it("resolveSubjectHoles compares core attacks against target AC", () => {
    const state = {
      ...twoCreatureState(),
      combatants: new Map([
        ["A" as CreatureId, creatureState()],
        [
          "B" as CreatureId,
          creatureState({
            hp: 10 as Hp,
            maxHp: 10 as Hp,
            armorClass: statBlockArmorClassState(18),
          }),
        ],
      ]),
    };

    const result = resolveSubjectHoles(state, {
      subject: { tag: "coreAct", actorId: "A" as CreatureId, act: "attack" },
      filledHoleValues: [
        {
          kind: "targetChoice",
          holeId: "core_attack_target" as never,
          value: "B" as CreatureId,
        },
        attackRollFill("core_attack_roll", 17),
      ],
    });

    expect(result.tag).toBe("resolved");
    if (result.tag === "resolved") {
      expect(result.state.combatants.get("B" as CreatureId)?.hp).toBe(10);
      expect(result.state.currentActionsAvailable).toBe(0);
    }
  });

  it("resolveSubjectHoles rejects an invalid attack target", () => {
    expect(
      resolveSubjectHoles(twoCreatureState(), {
        subject: { tag: "coreAct", actorId: "A" as CreatureId, act: "attack" },
        filledHoleValues: [
          {
            kind: "targetChoice",
            holeId: "core_attack_target" as never,
            value: "A" as CreatureId,
          },
        ],
      }),
    ).toEqual({
      tag: "invalid",
      reason: "invalid attack target",
    });
  });

  it("resolveSubjectHoles rejects duplicate filled values for the same current hole", () => {
    expect(
      resolveSubjectHoles(twoCreatureState(), {
        subject: { tag: "coreAct", actorId: "A" as CreatureId, act: "attack" },
        filledHoleValues: [
          {
            kind: "targetChoice",
            holeId: holeId("core_attack_target"),
            value: "B" as CreatureId,
          },
          {
            kind: "targetChoice",
            holeId: holeId("core_attack_target"),
            value: "B" as CreatureId,
          },
        ],
      }),
    ).toEqual({
      tag: "invalid",
      reason: "duplicate filled value for hole core_attack_target",
    });
  });

  it("resolveSubjectHoles rejects unexpected future filled values", () => {
    expect(
      resolveSubjectHoles(twoCreatureState(), {
        subject: { tag: "coreAct", actorId: "A" as CreatureId, act: "attack" },
        filledHoleValues: [
          {
            kind: "rolledDice",
            holeId: holeId("core_attack_damage"),
            value: [{ results: [6 as DieRollResult] }],
          },
        ],
      }),
    ).toEqual({
      tag: "invalid",
      reason: "unexpected filled value for hole core_attack_damage",
    });
  });

  it("resolveSubjectHoles rejects kind mismatches for the current hole", () => {
    expect(
      resolveSubjectHoles(twoCreatureState(), {
        subject: { tag: "coreAct", actorId: "A" as CreatureId, act: "attack" },
        filledHoleValues: [attackRollFill("core_attack_target", 17)],
      }),
    ).toEqual({
      tag: "invalid",
      reason:
        "filled value kind attackRoll does not match hole core_attack_target",
    });
  });

  it("resolveSubjectHoles requests all current holes for unit-backed fire bolt", () => {
    expect(
      resolveSubjectHoles(twoCreatureStateWithActingUnit("fire_bolt"), {
        subject: {
          tag: "unit",
          actorId: "A" as CreatureId,
          unitId: "fire_bolt",
        },
        filledHoleValues: [],
      }),
    ).toEqual({
      tag: "needsHoles",
      holes: [
        {
          holeInstanceKey: "activation:0:surface:fire_bolt_target",
          holeId: "fire_bolt_target",
          kind: "targetChoice",
          label: "fire bolt target",
        },
        {
          holeInstanceKey: "activation:0:runtime:attackRoll",
          holeId: "activation:0_attack_roll",
          kind: "attackRoll",
        },
      ],
    });
  });

  it("resolveSubjectHoles requests the missing fire bolt attack roll after target fill", () => {
    expect(
      resolveSubjectHoles(twoCreatureStateWithActingUnit("fire_bolt"), {
        subject: {
          tag: "unit",
          actorId: "A" as CreatureId,
          unitId: "fire_bolt",
        },
        filledHoleValues: [
          {
            kind: "targetChoice",
            holeId: holeId("fire_bolt_target"),
            value: "B" as CreatureId,
          },
        ],
      }),
    ).toEqual({
      tag: "needsHoles",
      holes: [
        {
          holeInstanceKey: "activation:0:runtime:attackRoll",
          holeId: "activation:0_attack_roll",
          kind: "attackRoll",
        },
      ],
    });
  });

  it("resolveSubjectHoles requests fire bolt damage dice after a hit", () => {
    expect(
      resolveSubjectHoles(twoCreatureStateWithActingUnit("fire_bolt"), {
        subject: {
          tag: "unit",
          actorId: "A" as CreatureId,
          unitId: "fire_bolt",
        },
        filledHoleValues: [
          {
            kind: "targetChoice",
            holeId: holeId("fire_bolt_target"),
            value: "B" as CreatureId,
          },
          attackRollFill("activation:0_attack_roll", 17),
        ],
      }),
    ).toEqual({
      tag: "needsHoles",
      holes: [
        {
          holeInstanceKey: "activation:0:runtime:damageRoll:0",
          holeId: "activation:0_damage_roll_0",
          kind: "rolledDice",
          label: "damage roll",
        },
      ],
    });
  });

  it("resolveSubjectHoles resolves a missed fire bolt without damage", () => {
    const state = twoCreatureStateWithActingUnit("fire_bolt");
    const result = resolveSubjectHoles(state, {
      subject: {
        tag: "unit",
        actorId: "A" as CreatureId,
        unitId: "fire_bolt",
      },
      filledHoleValues: [
        {
          kind: "targetChoice",
          holeId: holeId("fire_bolt_target"),
          value: "B" as CreatureId,
        },
        attackRollFill("activation:0_attack_roll", 9),
      ],
    });

    expect(result.tag).toBe("resolved");
    if (result.tag === "resolved") {
      expect(result.state.combatants.get("B" as CreatureId)?.hp).toBe(1);
      expect(result.state.currentActionsAvailable).toBe(0);
    }
  });

  it("resolveSubjectHoles rejects fire bolt damage dice on a miss", () => {
    expect(
      resolveSubjectHoles(twoCreatureStateWithActingUnit("fire_bolt"), {
        subject: {
          tag: "unit",
          actorId: "A" as CreatureId,
          unitId: "fire_bolt",
        },
        filledHoleValues: [
          {
            kind: "targetChoice",
            holeId: holeId("fire_bolt_target"),
            value: "B" as CreatureId,
          },
          attackRollFill("activation:0_attack_roll", 9),
          fireBoltDamageRollFill([6]),
        ],
      }),
    ).toEqual({
      tag: "invalid",
      reason: "unexpected filled value for hole activation:0_damage_roll_0",
    });
  });

  it("resolveSubjectHoles compares unit-backed attack rolls against target AC", () => {
    const state = {
      ...twoCreatureStateWithActingUnit("fire_bolt"),
      combatants: new Map([
        [
          "A" as CreatureId,
          creatureState({ units: [loadSupportedUnit("fire_bolt")] }),
        ],
        [
          "B" as CreatureId,
          creatureState({
            hp: 10 as Hp,
            maxHp: 10 as Hp,
            armorClass: statBlockArmorClassState(18),
          }),
        ],
      ]),
    };

    const result = resolveSubjectHoles(state, {
      subject: {
        tag: "unit",
        actorId: "A" as CreatureId,
        unitId: "fire_bolt",
      },
      filledHoleValues: [
        {
          kind: "targetChoice",
          holeId: holeId("fire_bolt_target"),
          value: "B" as CreatureId,
        },
        attackRollFill("activation:0_attack_roll", 17),
      ],
    });

    expect(result.tag).toBe("resolved");
    if (result.tag === "resolved") {
      expect(result.state.combatants.get("B" as CreatureId)?.hp).toBe(10);
      expect(result.state.currentActionsAvailable).toBe(0);
    }
  });

  it("resolveSubjectHoles treats natural 1 attack rolls as misses", () => {
    const result = resolveSubjectHoles(
      twoCreatureStateWithActingUnit("fire_bolt"),
      {
        subject: {
          tag: "unit",
          actorId: "A" as CreatureId,
          unitId: "fire_bolt",
        },
        filledHoleValues: [
          {
            kind: "targetChoice",
            holeId: holeId("fire_bolt_target"),
            value: "B" as CreatureId,
          },
          attackRollFill("activation:0_attack_roll", 25, 1),
        ],
      },
    );

    expect(result.tag).toBe("resolved");
    if (result.tag === "resolved") {
      expect(result.state.combatants.get("B" as CreatureId)?.hp).toBe(1);
      expect(result.state.currentActionsAvailable).toBe(0);
    }
  });

  it("resolveSubjectHoles rejects invalid natural d20 attack-roll results", () => {
    expect(
      resolveSubjectHoles(twoCreatureStateWithActingUnit("fire_bolt"), {
        subject: {
          tag: "unit",
          actorId: "A" as CreatureId,
          unitId: "fire_bolt",
        },
        filledHoleValues: [
          {
            kind: "targetChoice",
            holeId: holeId("fire_bolt_target"),
            value: "B" as CreatureId,
          },
          attackRollFill("activation:0_attack_roll", 17, 21),
        ],
      }),
    ).toEqual({
      tag: "invalid",
      reason: "invalid attack roll result",
    });
  });

  it("resolveSubjectHoles treats natural 20 attack rolls as critical hits", () => {
    const state = {
      ...twoCreatureStateWithActingUnit("fire_bolt"),
      combatants: new Map([
        [
          "A" as CreatureId,
          creatureState({ units: [loadSupportedUnit("fire_bolt")] }),
        ],
        [
          "B" as CreatureId,
          creatureState({
            hp: 20 as Hp,
            maxHp: 20 as Hp,
            armorClass: statBlockArmorClassState(30),
          }),
        ],
      ]),
    };

    const result = resolveSubjectHoles(state, {
      subject: {
        tag: "unit",
        actorId: "A" as CreatureId,
        unitId: "fire_bolt",
      },
      filledHoleValues: [
        {
          kind: "targetChoice",
          holeId: holeId("fire_bolt_target"),
          value: "B" as CreatureId,
        },
        attackRollFill("activation:0_attack_roll", 20, 20),
        fireBoltDamageRollFill([6, 4]),
      ],
    });

    expect(result.tag).toBe("resolved");
    if (result.tag === "resolved") {
      expect(result.state.combatants.get("B" as CreatureId)?.hp).toBe(10);
      expect(result.state.currentActionsAvailable).toBe(0);
    }
  });

  it("resolveSubjectHoles applies fire bolt damage after damage dice are filled", () => {
    const state = {
      ...twoCreatureStateWithActingUnit("fire_bolt"),
      combatants: new Map([
        [
          "A" as CreatureId,
          creatureState({ units: [loadSupportedUnit("fire_bolt")] }),
        ],
        [
          "B" as CreatureId,
          creatureState({
            hp: 10 as Hp,
            maxHp: 10 as Hp,
          }),
        ],
      ]),
    };

    const result = resolveSubjectHoles(state, {
      subject: {
        tag: "unit",
        actorId: "A" as CreatureId,
        unitId: "fire_bolt",
      },
      filledHoleValues: [
        {
          kind: "targetChoice",
          holeId: holeId("fire_bolt_target"),
          value: "B" as CreatureId,
        },
        attackRollFill("activation:0_attack_roll", 17),
        fireBoltDamageRollFill([6]),
      ],
    });

    expect(result.tag).toBe("resolved");
    if (result.tag === "resolved") {
      expect(result.state.combatants.get("B" as CreatureId)?.hp).toBe(4);
      expect(result.state.currentActionsAvailable).toBe(0);
    }
  });

  it("resolveSubjectHoles rejects a unit-backed attack that targets the actor", () => {
    expect(
      resolveSubjectHoles(twoCreatureStateWithActingUnit("fire_bolt"), {
        subject: {
          tag: "unit",
          actorId: "A" as CreatureId,
          unitId: "fire_bolt",
        },
        filledHoleValues: [
          {
            kind: "targetChoice",
            holeId: holeId("fire_bolt_target"),
            value: "A" as CreatureId,
          },
          attackRollFill("activation:0_attack_roll", 17),
        ],
      }),
    ).toEqual({
      tag: "invalid",
      reason: "invalid attack target",
    });
  });

  it("resolveSubjectHoles rejects a unit-backed attack that targets a missing creature", () => {
    expect(
      resolveSubjectHoles(twoCreatureStateWithActingUnit("fire_bolt"), {
        subject: {
          tag: "unit",
          actorId: "A" as CreatureId,
          unitId: "fire_bolt",
        },
        filledHoleValues: [
          {
            kind: "targetChoice",
            holeId: holeId("fire_bolt_target"),
            value: "Z" as CreatureId,
          },
          attackRollFill("activation:0_attack_roll", 17),
        ],
      }),
    ).toEqual({
      tag: "invalid",
      reason: "invalid attack target",
    });
  });

  it("resolveSubjectHoles rejects wrong-kind fills for fireball point hole", () => {
    expect(
      resolveSubjectHoles(
        twoCreatureStateWithActingSpellSlots("fireball", [0, 0, 1]),
        {
          subject: {
            tag: "unit",
            actorId: "A" as CreatureId,
            unitId: "fireball",
          },
          filledHoleValues: [
            {
              // fireball_point has not been refactored to an area-specific runtime
              // answer yet, so targetChoice is intentionally the wrong protocol.
              kind: "targetChoice",
              holeId: holeId("fireball_point"),
              value: "B" as CreatureId,
            },
          ],
        },
      ),
    ).toEqual({
      tag: "invalid",
      reason:
        "filled value kind targetChoice does not match hole fireball_point",
    });
  });

  it("resolveSubjectHoles requests the fireball point hole when no fills are provided", () => {
    expect(
      resolveSubjectHoles(
        twoCreatureStateWithActingSpellSlots("fireball", [0, 0, 1]),
        {
          subject: {
            tag: "unit",
            actorId: "A" as CreatureId,
            unitId: "fireball",
          },
          filledHoleValues: [],
        },
      ),
    ).toEqual({
      tag: "needsHoles",
      holes: [
        {
          // The current fireball_point hole asks the caller to echo area schema.
          // It does not yet mean "all affected creatures in this area".
          holeInstanceKey: "activation:0:surface:fireball_point",
          holeId: "fireball_point",
          kind: "surfaceAttachment",
          label: "point of explosion",
          attachment: {
            kind: "area",
            origin: { kind: "point_within_range" },
            shape: {
              kind: "sphere",
              radiusFeet: 20,
            },
          },
        },
      ],
    });
  });

  it("resolveSubjectHoles still reaches the save-gate frontier for malformed fireball area echo", () => {
    expect(
      resolveSubjectHoles(
        twoCreatureStateWithActingSpellSlots("fireball", [0, 0, 1]),
        {
          subject: {
            tag: "unit",
            actorId: "A" as CreatureId,
            unitId: "fireball",
          },
          filledHoleValues: [
            {
              // Current fireball_point handling only checks that the fill uses the
              // surfaceAttachment protocol; it does not yet validate the inner
              // area payload semantics.
              kind: "surfaceAttachment",
              holeId: holeId("fireball_point"),
              value: {
                kind: "target",
                selection: { mode: "one" },
              },
            },
          ],
        },
      ),
    ).toEqual({
      tag: "invalid",
      reason: "save-gate unit outcome application is not implemented yet",
    });
  });

  it("resolveSubjectHoles requests the cure wounds target and healing roll holes when no fills are provided", () => {
    expect(
      resolveSubjectHoles(twoCreatureStateWithActingSpellSlot("cure_wounds"), {
        subject: {
          tag: "unit",
          actorId: "A" as CreatureId,
          unitId: "cure_wounds",
        },
        filledHoleValues: [],
      }),
    ).toEqual({
      tag: "needsHoles",
      holes: [
        {
          holeInstanceKey: "activation:0:surface:cure_wounds_target",
          holeId: "cure_wounds_target",
          kind: "targetChoice",
          label: "healing target",
        },
        {
          holeInstanceKey: "activation:0:runtime:healingRoll:0",
          holeId: "activation:0_healing_roll_0",
          kind: "rolledDice",
          label: "healing roll",
        },
      ],
    });
  });

  it("resolveSubjectHoles requests the cure wounds healing roll after target fill", () => {
    expect(
      resolveSubjectHoles(twoCreatureStateWithActingSpellSlot("cure_wounds"), {
        subject: {
          tag: "unit",
          actorId: "A" as CreatureId,
          unitId: "cure_wounds",
        },
        filledHoleValues: [
          {
            kind: "targetChoice",
            holeId: holeId("cure_wounds_target"),
            value: "B" as CreatureId,
          },
        ],
      }),
    ).toEqual({
      tag: "needsHoles",
      holes: [
        {
          holeInstanceKey: "activation:0:runtime:healingRoll:0",
          holeId: "activation:0_healing_roll_0",
          kind: "rolledDice",
          label: "healing roll",
        },
      ],
    });
  });

  it("resolveSubjectHoles rejects cure wounds when direct target is missing", () => {
    expect(
      resolveSubjectHoles(twoCreatureStateWithActingSpellSlot("cure_wounds"), {
        subject: {
          tag: "unit",
          actorId: "A" as CreatureId,
          unitId: "cure_wounds",
        },
        filledHoleValues: [
          {
            kind: "targetChoice",
            holeId: holeId("cure_wounds_target"),
            value: "Z" as CreatureId,
          },
          healingRollFill([3, 4]),
        ],
      }),
    ).toEqual({
      tag: "invalid",
      reason: "invalid direct target",
    });
  });

  it("resolveSubjectHoles applies cure wounds healing to the chosen target", () => {
    const base = twoCreatureStateWithActingSpellSlot("cure_wounds");
    const state: State = {
      ...base,
      combatants: new Map([
        [
          "A" as CreatureId,
          {
            ...base.combatants.get("A" as CreatureId)!,
            spellcastingAbilityModifier: spellcastingAbilityModifier(2),
          },
        ],
        [
          "B" as CreatureId,
          creatureState({
            hp: 1 as Hp,
            maxHp: 12 as Hp,
          }),
        ],
      ]),
    };

    const result = resolveSubjectHoles(state, {
      subject: {
        tag: "unit",
        actorId: "A" as CreatureId,
        unitId: "cure_wounds",
      },
      filledHoleValues: [
        {
          kind: "targetChoice",
          holeId: holeId("cure_wounds_target"),
          value: "B" as CreatureId,
        },
        healingRollFill([5, 4]),
      ],
    });

    expect(result.tag).toBe("resolved");
    if (result.tag === "resolved") {
      expect(result.state.combatants.get("B" as CreatureId)?.hp).toBe(12);
      expect(result.state.currentActionsAvailable).toBe(0);
      expect(
        result.state.combatants.get("A" as CreatureId)?.spellSlots,
      ).toEqual([0]);
      expect(
        result.state.combatants.get("A" as CreatureId)?.slotExpendedThisTurn,
      ).toBe(true);
    }
  });

  it("resolveSubjectHoles rejects cure wounds without asking holes when no action is available", () => {
    expect(
      resolveSubjectHoles(
        {
          ...twoCreatureStateWithActingSpellSlot("cure_wounds"),
          currentActionsAvailable: 0,
        },
        {
          subject: {
            tag: "unit",
            actorId: "A" as CreatureId,
            unitId: "cure_wounds",
          },
          filledHoleValues: [],
        },
      ),
    ).toEqual({
      tag: "invalid",
      reason: "no action available for unit",
    });
  });

  it("resolveSubjectHoles rejects cure wounds when no action is available", () => {
    expect(
      resolveSubjectHoles(
        {
          ...twoCreatureStateWithActingUnit("cure_wounds"),
          currentActionsAvailable: 0,
        },
        {
          subject: {
            tag: "unit",
            actorId: "A" as CreatureId,
            unitId: "cure_wounds",
          },
          filledHoleValues: [
            {
              kind: "targetChoice",
              holeId: holeId("cure_wounds_target"),
              value: "B" as CreatureId,
            },
            healingRollFill([5, 4]),
          ],
        },
      ),
    ).toEqual({
      tag: "invalid",
      reason: "no action available for unit",
    });
  });

  it("resolveSubjectHoles does not let a negative spellcasting modifier turn healing into damage", () => {
    const base = twoCreatureStateWithActingSpellSlot("cure_wounds");
    const state: State = {
      ...base,
      combatants: new Map([
        [
          "A" as CreatureId,
          {
            ...base.combatants.get("A" as CreatureId)!,
            spellcastingAbilityModifier: spellcastingAbilityModifier(-5),
          },
        ],
        [
          "B" as CreatureId,
          creatureState({
            hp: 5 as Hp,
            maxHp: 12 as Hp,
          }),
        ],
      ]),
    };

    const result = resolveSubjectHoles(state, {
      subject: {
        tag: "unit",
        actorId: "A" as CreatureId,
        unitId: "cure_wounds",
      },
      filledHoleValues: [
        {
          kind: "targetChoice",
          holeId: holeId("cure_wounds_target"),
          value: "B" as CreatureId,
        },
        healingRollFill([1, 1]),
      ],
    });

    expect(result.tag).toBe("resolved");
    if (result.tag === "resolved") {
      expect(result.state.combatants.get("B" as CreatureId)?.hp).toBe(5);
      expect(
        result.state.combatants.get("A" as CreatureId)?.spellSlots,
      ).toEqual([0]);
      expect(
        result.state.combatants.get("A" as CreatureId)?.slotExpendedThisTurn,
      ).toBe(true);
    }
  });

  it("resolveSubjectHoles rejects cure wounds healing rolls outside the die size", () => {
    expect(
      resolveSubjectHoles(twoCreatureStateWithActingSpellSlot("cure_wounds"), {
        subject: {
          tag: "unit",
          actorId: "A" as CreatureId,
          unitId: "cure_wounds",
        },
        filledHoleValues: [
          {
            kind: "targetChoice",
            holeId: holeId("cure_wounds_target"),
            value: "B" as CreatureId,
          },
          healingRollFill([9, 1]),
        ],
      }),
    ).toEqual({
      tag: "invalid",
      reason: "filled die roll 9 is outside d8",
    });
  });

  it("resolveSubjectHoles allows cure wounds to target self", () => {
    const base = twoCreatureStateWithActingSpellSlot("cure_wounds");
    const state: State = {
      ...base,
      combatants: new Map([
        [
          "A" as CreatureId,
          {
            ...base.combatants.get("A" as CreatureId)!,
            hp: 1 as Hp,
            maxHp: 10 as Hp,
          },
        ],
        ["B" as CreatureId, creatureState()],
      ]),
    };

    const result = resolveSubjectHoles(state, {
      subject: {
        tag: "unit",
        actorId: "A" as CreatureId,
        unitId: "cure_wounds",
      },
      filledHoleValues: [
        {
          kind: "targetChoice",
          holeId: holeId("cure_wounds_target"),
          value: "A" as CreatureId,
        },
        healingRollFill([3, 4]),
      ],
    });

    expect(result.tag).toBe("resolved");
    if (result.tag === "resolved") {
      expect(result.state.combatants.get("A" as CreatureId)?.hp).toBe(8);
      expect(
        result.state.combatants.get("A" as CreatureId)?.spellSlots,
      ).toEqual([0]);
      expect(
        result.state.combatants.get("A" as CreatureId)?.slotExpendedThisTurn,
      ).toBe(true);
    }
  });

  it("resolveSubjectHoles rejects cure wounds without asking holes when no base spell slot is available", () => {
    expect(
      resolveSubjectHoles(twoCreatureStateWithActingUnit("cure_wounds"), {
        subject: {
          tag: "unit",
          actorId: "A" as CreatureId,
          unitId: "cure_wounds",
        },
        filledHoleValues: [],
      }),
    ).toEqual({
      tag: "invalid",
      reason: "no spell slot available for unit",
    });
  });

  it("resolveSubjectHoles rejects cure wounds when no base spell slot is available", () => {
    expect(
      resolveSubjectHoles(twoCreatureStateWithActingUnit("cure_wounds"), {
        subject: {
          tag: "unit",
          actorId: "A" as CreatureId,
          unitId: "cure_wounds",
        },
        filledHoleValues: [
          {
            kind: "targetChoice",
            holeId: holeId("cure_wounds_target"),
            value: "B" as CreatureId,
          },
          healingRollFill([5, 4]),
        ],
      }),
    ).toEqual({
      tag: "invalid",
      reason: "no spell slot available for unit",
    });
  });

  it("resolveSubjectHoles rejects cure wounds when a spell slot was already expended this turn", () => {
    expect(
      resolveSubjectHoles(
        twoCreatureStateWithActingUnit("cure_wounds", {
          spellSlots: [1],
          spellSlotsMax: [1],
          slotExpendedThisTurn: true,
        }),
        {
          subject: {
            tag: "unit",
            actorId: "A" as CreatureId,
            unitId: "cure_wounds",
          },
          filledHoleValues: [],
        },
      ),
    ).toEqual({
      tag: "invalid",
      reason: "spell slot already expended this turn",
    });
  });

  it("resolveSubjectHoles reaches save-gate execution boundary after fireball point is filled", () => {
    expect(
      resolveSubjectHoles(
        twoCreatureStateWithActingSpellSlots("fireball", [0, 0, 1]),
        {
          subject: {
            tag: "unit",
            actorId: "A" as CreatureId,
            unitId: "fireball",
          },
          filledHoleValues: [
            {
              // Temporary protocol for fireball_point: caller echoes authored area
              // schema instead of supplying a later area-resolution result.
              kind: "surfaceAttachment",
              holeId: holeId("fireball_point"),
              value: {
                kind: "area",
                origin: { kind: "point_within_range" },
                shape: {
                  kind: "sphere",
                  radiusFeet: 20,
                },
              },
            },
          ],
        },
      ),
    ).toEqual({
      tag: "invalid",
      reason: "save-gate unit outcome application is not implemented yet",
    });
  });

  it("resolveSubjectHoles reaches direct execution boundary for holeless action surge even with no action", () => {
    expect(
      resolveSubjectHoles(
        {
          ...twoCreatureStateWithActingUnit("fighter_action_surge_l2"),
          currentActionsAvailable: 0,
        },
        {
          subject: {
            tag: "unit",
            actorId: "A" as CreatureId,
            unitId: "fighter_action_surge_l2",
          },
          filledHoleValues: [],
        },
      ),
    ).toEqual({
      tag: "invalid",
      reason: "direct unit effect application is not implemented yet",
    });
  });

  it("resolveSubjectHoles rejects core attack when no action is available", () => {
    expect(
      resolveSubjectHoles(exhaustedActionState(), {
        subject: { tag: "coreAct", actorId: "A" as CreatureId, act: "attack" },
        filledHoleValues: [],
      }),
    ).toEqual({
      tag: "invalid",
      reason: "no action available for attack",
    });
  });

  it("resolveSubjectHoles rejects core endTurn for a non-acting creature", () => {
    expect(
      resolveSubjectHoles(emptyState(), {
        subject: { tag: "coreAct", actorId: "B" as CreatureId, act: "endTurn" },
        filledHoleValues: [],
      }),
    ).toEqual({
      tag: "invalid",
      reason: "actor is not currently acting",
    });
  });
});
