import { describe, expect, it } from "vitest";

import {
  EMPTY_CONDITION_STATE,
  applyCondition,
  hasCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import {
  createInitiativeStack,
  currentActing,
} from "@dnd/shared-algebras/initiative-algebra";
import type { CreatureId, Hp, ReadonlyNonEmptyArray } from "@dnd/shared/types";
import { DieRollResult } from "@dnd/shared/types";

import { discoverAvailableActs } from "#/reducer-discovery.ts";
import { statBlockArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  restoreUnitUseCountsForCreature,
  resolveSubjectHoles,
} from "#/reducer-hole-resolution.ts";
import { resetDeathSaveRuntimeState } from "@dnd/shared-algebras/death-saves-algebra";
import {
  spellcastingAbilityModifier,
  unitResourceKey,
} from "#/reducer-state.ts";
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
    zeroHpLifecyclePolicy: "usesDeathSavingThrows",
    deathSaves: resetDeathSaveRuntimeState(),
    spellcastingAbilityModifier: spellcastingAbilityModifier(0),
    spellSlots: [],
    slotExpendedThisTurn: false,
    spellSlotsMax: [],
    ...overrides,
  };
}

function dieRollResult(result: number): DieRollResult {
  return DieRollResult(result);
}

function healingRollFill(
  results: ReadonlyNonEmptyArray<number>,
): Extract<FilledHoleValue, { readonly kind: "rolledDice" }> {
  return {
    kind: "rolledDice" as const,
    holeId: holeId("activation:0_healing_roll_0"),
    value: [
      {
        results: results.map(dieRollResult) as [
          DieRollResult,
          ...DieRollResult[],
        ],
      },
    ] as ReadonlyNonEmptyArray<RolledDiceGroup>,
  };
}

function activationDamageRollFill(
  results: ReadonlyNonEmptyArray<number>,
): Extract<FilledHoleValue, { readonly kind: "rolledDice" }> {
  return {
    kind: "rolledDice" as const,
    holeId: holeId("activation:0_damage_roll_0"),
    value: [
      {
        results: results.map(dieRollResult) as [
          DieRollResult,
          ...DieRollResult[],
        ],
      },
    ] as ReadonlyNonEmptyArray<RolledDiceGroup>,
  };
}

function fireballPointEchoFill(): Extract<
  FilledHoleValue,
  { readonly kind: "surfaceAttachment" }
> {
  return {
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
  };
}

function saveOutcomeFill(
  outcomes: ReadonlyArray<{
    readonly targetId: CreatureId;
    readonly succeeded: boolean;
  }>,
): Extract<FilledHoleValue, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: holeId("activation:0_saving_throw_outcome"),
    value: outcomes,
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
      naturalD20: dieRollResult(naturalD20),
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
    actionResources: [{ kind: "action", source: "turn" }],
    currentHasBonusAction: true,
    unitActivationsThisTurn: new Set(),
    expendedUnitUseCounts: new Map(),
  };
}

function singleActingCreatureState(
  actorId: CreatureId,
  actor: CreatureState,
): State {
  const order = [
    { creature: actorId, initiative: 10 as never },
  ] as unknown as ReadonlyNonEmptyArray<{
    readonly creature: CreatureId;
    readonly initiative: never;
  }>;

  return {
    ...emptyState(),
    initiative: createInitiativeStack(order, 1 as never),
    combatants: new Map([[actorId, actor]]),
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
    actionResources: [],
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

  it("discoverAvailableActs suppresses action-cost unit acts when no action is available", () => {
    expect(
      discoverAvailableActs({
        ...twoCreatureStateWithActingUnit("fire_bolt"),
        actionResources: [],
      }),
    ).toEqual([
      {
        subject: { tag: "coreAct", actorId: "A" as CreatureId, act: "endTurn" },
        label: "End Turn",
        summary: "End the current turn.",
        initialHoles: [],
      },
    ]);
  });

  it("discoverAvailableActs suppresses non-end-turn acts for an incapacitated actor", () => {
    expect(
      discoverAvailableActs(
        twoCreatureStateWithActingUnit("fire_bolt", {
          hp: 0 as Hp,
          conditions: applyCondition(EMPTY_CONDITION_STATE, "unconscious"),
        }),
      ),
    ).toEqual([
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

  it("discoverAvailableActs surfaces action surge as a unit-backed act", () => {
    expect(
      discoverAvailableActs(
        twoCreatureStateWithActingUnit("fighter_action_surge_l2"),
      ),
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
          unitId: "fighter_action_surge_l2",
        },
        label: "Action Surge",
        summary: expect.stringContaining("push yourself beyond"),
        initialHoles: [],
      },
    ]);
  });

  it("discoverAvailableActs does not expose action surge after it was used this turn", () => {
    expect(
      discoverAvailableActs({
        ...twoCreatureStateWithActingUnit("fighter_action_surge_l2"),
        unitActivationsThisTurn: new Set([
          unitResourceKey("A" as CreatureId, "fighter_action_surge_l2"),
        ]),
      }),
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
    ]);
  });

  it("discoverAvailableActs does not expose action surge after its use count was expended", () => {
    expect(
      discoverAvailableActs({
        ...twoCreatureStateWithActingUnit("fighter_action_surge_l2"),
        expendedUnitUseCounts: new Map([
          [unitResourceKey("A" as CreatureId, "fighter_action_surge_l2"), 1],
        ]),
      }),
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
    ]);
  });

  it("discoverAvailableActs does not expose action cantrips when only an Action Surge resource remains", () => {
    expect(
      discoverAvailableActs({
        ...twoCreatureStateWithActingUnit("fire_bolt"),
        actionResources: [
          {
            kind: "action",
            source: "unit",
            sourceOwnerId: "A" as CreatureId,
            sourceUnitId: "fighter_action_surge_l2",
            restriction: { kind: "exclude", actions: ["magic"] },
          },
        ],
      }),
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
    expect(result.state.actionResources).toEqual([
      { kind: "action", source: "turn" },
    ]);
    expect(result.state.currentHasBonusAction).toBe(true);
    expect(result.state.unitActivationsThisTurn).toEqual(new Set());
  });

  it("resolveSubjectHoles resets unit activations for the next turn", () => {
    const result = resolveSubjectHoles(
      {
        ...emptyState(),
        unitActivationsThisTurn: new Set([
          unitResourceKey("A" as CreatureId, "fighter_action_surge_l2"),
        ]),
      },
      {
        subject: { tag: "coreAct", actorId: "A" as CreatureId, act: "endTurn" },
        filledHoleValues: [],
      },
    );

    expect(result.tag).toBe("resolved");
    if (result.tag === "resolved") {
      expect(result.state.unitActivationsThisTurn).toEqual(new Set());
      expect(result.state.expendedUnitUseCounts).toEqual(new Map());
    }
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
        actionResources: [],
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
      expect(result.state.actionResources).toEqual([]);
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
            value: [{ results: [dieRollResult(6)] }],
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
      expect(result.state.actionResources).toEqual([]);
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
            value: [{ results: [dieRollResult(6)] }],
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

  it("resolveSubjectHoles accumulates independent filled-hole validation errors", () => {
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
          {
            kind: "rolledDice",
            holeId: holeId("core_attack_damage"),
            value: [{ results: [dieRollResult(6)] }],
          },
        ],
      }),
    ).toEqual({
      tag: "invalid",
      reason:
        "duplicate filled value for hole core_attack_target; unexpected filled value for hole core_attack_damage",
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
      expect(result.state.actionResources).toEqual([]);
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
          activationDamageRollFill([6]),
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
      expect(result.state.actionResources).toEqual([]);
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
      expect(result.state.actionResources).toEqual([]);
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
        activationDamageRollFill([6, 4]),
      ],
    });

    expect(result.tag).toBe("resolved");
    if (result.tag === "resolved") {
      expect(result.state.combatants.get("B" as CreatureId)?.hp).toBe(10);
      expect(result.state.actionResources).toEqual([]);
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
        activationDamageRollFill([6]),
      ],
    });

    expect(result.tag).toBe("resolved");
    if (result.tag === "resolved") {
      expect(result.state.combatants.get("B" as CreatureId)?.hp).toBe(4);
      expect(result.state.actionResources).toEqual([]);
    }
  });

  it("resolveSubjectHoles makes a fire bolt target unconscious when damage drops it to zero", () => {
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
            hp: 6 as Hp,
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
        attackRollFill("activation:0_attack_roll", 17, 12),
        activationDamageRollFill([6]),
      ],
    });

    expect(result.tag).toBe("resolved");
    if (result.tag === "resolved") {
      const target = result.state.combatants.get("B" as CreatureId)!;
      expect(Number(target.hp)).toBe(0);
      expect(hasCondition(target.conditions, "unconscious")).toBe(true);
      expect(target.deathSaves).toEqual(resetDeathSaveRuntimeState());
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

  it("resolveSubjectHoles requests fireball saving throw outcomes after area fill", () => {
    expect(
      resolveSubjectHoles(
        twoCreatureStateWithActingSpellSlots("fireball", [0, 0, 1]),
        {
          subject: {
            tag: "unit",
            actorId: "A" as CreatureId,
            unitId: "fireball",
          },
          filledHoleValues: [fireballPointEchoFill()],
        },
      ),
    ).toEqual({
      tag: "needsHoles",
      holes: [
        {
          holeInstanceKey: "activation:0:runtime:savingThrowOutcome",
          holeId: "activation:0_saving_throw_outcome",
          kind: "savingThrowOutcome",
          ability: "dex",
          dc: { kind: "caster_spell_save_dc" },
          label: "saving throw outcome",
        },
      ],
    });
  });

  it("resolveSubjectHoles rejects fireball point fills that do not match the authored area hole", () => {
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
              ...fireballPointEchoFill(),
              value: {
                kind: "area",
                origin: { kind: "point_within_range" },
                shape: {
                  kind: "sphere",
                  radiusFeet: 10,
                },
              },
            },
          ],
        },
      ),
    ).toEqual({
      tag: "invalid",
      reason: "filled attachment does not match hole fireball_point",
    });
  });

  it("resolveSubjectHoles requests fireball damage once after saving throw outcomes", () => {
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
            fireballPointEchoFill(),
            saveOutcomeFill([
              { targetId: "A" as CreatureId, succeeded: true },
              { targetId: "B" as CreatureId, succeeded: false },
            ]),
          ],
        },
      ),
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

  it("resolveSubjectHoles rejects fireball damage when no saving throw targets are supplied", () => {
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
            fireballPointEchoFill(),
            saveOutcomeFill([]),
            activationDamageRollFill([1, 2, 3, 4, 5, 6, 1, 2]),
          ],
        },
      ),
    ).toEqual({
      tag: "invalid",
      reason: "unexpected filled value for hole activation:0_damage_roll_0",
    });
  });

  it("resolveSubjectHoles applies fireball full and half damage from one roll", () => {
    const state = {
      ...twoCreatureStateWithActingSpellSlots("fireball", [0, 0, 1]),
      combatants: new Map([
        [
          "A" as CreatureId,
          creatureState({
            hp: 30 as Hp,
            maxHp: 30 as Hp,
            units: [loadSupportedUnit("fireball")],
            spellSlots: [0, 0, 1],
            spellSlotsMax: [0, 0, 1],
          }),
        ],
        [
          "B" as CreatureId,
          creatureState({
            hp: 30 as Hp,
            maxHp: 30 as Hp,
          }),
        ],
      ]),
    };

    const result = resolveSubjectHoles(state, {
      subject: {
        tag: "unit",
        actorId: "A" as CreatureId,
        unitId: "fireball",
      },
      filledHoleValues: [
        fireballPointEchoFill(),
        saveOutcomeFill([
          { targetId: "A" as CreatureId, succeeded: true },
          { targetId: "B" as CreatureId, succeeded: false },
        ]),
        activationDamageRollFill([1, 2, 3, 4, 5, 6, 1, 2]),
      ],
    });

    expect(result.tag).toBe("resolved");
    if (result.tag === "resolved") {
      expect(result.state.combatants.get("A" as CreatureId)?.hp).toBe(18);
      expect(
        result.state.combatants.get("A" as CreatureId)?.spellSlots,
      ).toEqual([0, 0, 0]);
      expect(result.state.combatants.get("B" as CreatureId)?.hp).toBe(6);
      expect(result.state.actionResources).toEqual([]);
    }
  });

  it("resolveSubjectHoles rejects duplicate fireball saving throw targets", () => {
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
            fireballPointEchoFill(),
            saveOutcomeFill([
              { targetId: "B" as CreatureId, succeeded: true },
              { targetId: "B" as CreatureId, succeeded: false },
            ]),
            activationDamageRollFill([1, 2, 3, 4, 5, 6, 1, 2]),
          ],
        },
      ),
    ).toEqual({
      tag: "invalid",
      reason: "duplicate saving throw target",
    });
  });

  it("resolveSubjectHoles accumulates fireball saving throw outcome errors", () => {
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
            fireballPointEchoFill(),
            saveOutcomeFill([
              { targetId: "B" as CreatureId, succeeded: true },
              { targetId: "B" as CreatureId, succeeded: false },
              { targetId: "missing" as CreatureId, succeeded: false },
            ]),
            activationDamageRollFill([1, 2, 3, 4, 5, 6, 1, 2]),
          ],
        },
      ),
    ).toEqual({
      tag: "invalid",
      reason: "duplicate saving throw target; invalid saving throw target",
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
      expect(result.state.actionResources).toEqual([]);
      expect(
        result.state.combatants.get("A" as CreatureId)?.spellSlots,
      ).toEqual([0]);
      expect(
        result.state.combatants.get("A" as CreatureId)?.slotExpendedThisTurn,
      ).toBe(true);
    }
  });

  it("resolveSubjectHoles clears death saves and unconscious when cure wounds heals a zero-HP target", () => {
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
            hp: 0 as Hp,
            maxHp: 12 as Hp,
            conditions: applyCondition(EMPTY_CONDITION_STATE, "unconscious"),
            deathSaves: {
              deathSaves: { successes: 1, failures: 1 },
              stable: false,
              dead: false,
              hpRegained: false,
            },
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
        healingRollFill([5, 1]),
      ],
    });

    if (result.tag !== "resolved") {
      throw new Error(`expected resolved result, got ${result.tag}`);
    }

    const target = result.state.combatants.get("B" as CreatureId)!;
    expect(Number(target.hp)).toBe(8);
    expect(target.deathSaves).toEqual(resetDeathSaveRuntimeState());
    expect(hasCondition(target.conditions, "unconscious")).toBe(false);
  });

  it("resolveSubjectHoles rejects cure wounds without asking holes when no action is available", () => {
    expect(
      resolveSubjectHoles(
        {
          ...twoCreatureStateWithActingSpellSlot("cure_wounds"),
          actionResources: [],
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
          actionResources: [],
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

  it("resolveSubjectHoles rejects unit subjects for an incapacitated actor", () => {
    expect(
      resolveSubjectHoles(
        twoCreatureStateWithActingUnit("cure_wounds", {
          hp: 0 as Hp,
          conditions: applyCondition(EMPTY_CONDITION_STATE, "unconscious"),
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
      reason: "acting actor cannot act",
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

  it("resolveSubjectHoles resolves action surge as a restricted action resource", () => {
    const result = resolveSubjectHoles(
      {
        ...twoCreatureStateWithActingUnit("fighter_action_surge_l2"),
        actionResources: [],
      },
      {
        subject: {
          tag: "unit",
          actorId: "A" as CreatureId,
          unitId: "fighter_action_surge_l2",
        },
        filledHoleValues: [],
      },
    );

    expect(result.tag).toBe("resolved");
    if (result.tag === "resolved") {
      expect(result.state.actionResources).toEqual([
        {
          kind: "action",
          source: "unit",
          sourceOwnerId: "A" as CreatureId,
          sourceUnitId: "fighter_action_surge_l2",
          restriction: { kind: "exclude", actions: ["magic"] },
        },
      ]);
      expect(result.state.unitActivationsThisTurn).toEqual(
        new Set([
          unitResourceKey("A" as CreatureId, "fighter_action_surge_l2"),
        ]),
      );
      expect(result.state.expendedUnitUseCounts).toEqual(
        new Map([
          [unitResourceKey("A" as CreatureId, "fighter_action_surge_l2"), 1],
        ]),
      );
    }
  });

  it("resolveSubjectHoles rejects action surge after its use count was expended on a previous turn", () => {
    expect(
      resolveSubjectHoles(
        {
          ...twoCreatureStateWithActingUnit("fighter_action_surge_l2"),
          expendedUnitUseCounts: new Map([
            [unitResourceKey("A" as CreatureId, "fighter_action_surge_l2"), 1],
          ]),
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
      reason: "unit use count expended",
    });
  });

  it("resolveSubjectHoles keeps action surge use counts owned by creature", () => {
    const actionSurge = loadSupportedUnit("fighter_action_surge_l2");
    const result = resolveSubjectHoles(
      {
        ...singleActingCreatureState(
          "B" as CreatureId,
          creatureState({ units: [actionSurge] }),
        ),
        actionResources: [],
        expendedUnitUseCounts: new Map([
          [unitResourceKey("A" as CreatureId, "fighter_action_surge_l2"), 1],
        ]),
      },
      {
        subject: {
          tag: "unit",
          actorId: "B" as CreatureId,
          unitId: "fighter_action_surge_l2",
        },
        filledHoleValues: [],
      },
    );

    expect(result.tag).toBe("resolved");
    if (result.tag === "resolved") {
      expect(result.state.expendedUnitUseCounts).toEqual(
        new Map([
          [unitResourceKey("A" as CreatureId, "fighter_action_surge_l2"), 1],
          [unitResourceKey("B" as CreatureId, "fighter_action_surge_l2"), 1],
        ]),
      );
    }
  });

  it("restoreUnitUseCountsForCreature clears only the restored creature's use counts", () => {
    const state: State = {
      ...twoCreatureState(),
      expendedUnitUseCounts: new Map([
        [unitResourceKey("A" as CreatureId, "fighter_action_surge_l2"), 1],
        [unitResourceKey("B" as CreatureId, "fighter_action_surge_l2"), 1],
      ]),
    };

    expect(
      restoreUnitUseCountsForCreature(state, "A" as CreatureId)
        .expendedUnitUseCounts,
    ).toEqual(
      new Map([
        [unitResourceKey("B" as CreatureId, "fighter_action_surge_l2"), 1],
      ]),
    );
  });

  it("resolveSubjectHoles rejects action surge when its resource is already granted", () => {
    expect(
      resolveSubjectHoles(
        {
          ...twoCreatureStateWithActingUnit("fighter_action_surge_l2"),
          actionResources: [
            {
              kind: "action",
              source: "unit",
              sourceOwnerId: "A" as CreatureId,
              sourceUnitId: "fighter_action_surge_l2",
              restriction: { kind: "exclude", actions: ["magic"] },
            },
          ],
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
      reason: "unit action resource already granted",
    });
  });

  it("resolveSubjectHoles rejects action surge again after its granted action is spent this turn", () => {
    const surged = resolveSubjectHoles(
      {
        ...twoCreatureStateWithActingUnit("fighter_action_surge_l2"),
        actionResources: [],
      },
      {
        subject: {
          tag: "unit",
          actorId: "A" as CreatureId,
          unitId: "fighter_action_surge_l2",
        },
        filledHoleValues: [],
      },
    );
    if (surged.tag !== "resolved") {
      throw new Error("expected Action Surge to resolve");
    }

    const attacked = resolveSubjectHoles(surged.state, {
      subject: { tag: "coreAct", actorId: "A" as CreatureId, act: "attack" },
      filledHoleValues: [
        {
          kind: "targetChoice",
          holeId: holeId("core_attack_target"),
          value: "B" as CreatureId,
        },
        attackRollFill("core_attack_roll", 1),
      ],
    });
    if (attacked.tag !== "resolved") {
      throw new Error("expected core attack to spend Action Surge resource");
    }

    expect(
      resolveSubjectHoles(attacked.state, {
        subject: {
          tag: "unit",
          actorId: "A" as CreatureId,
          unitId: "fighter_action_surge_l2",
        },
        filledHoleValues: [],
      }),
    ).toEqual({
      tag: "invalid",
      reason: "unit already used this turn",
    });
  });

  it("resolveSubjectHoles rejects action cantrips when only an Action Surge resource remains", () => {
    expect(
      resolveSubjectHoles(
        {
          ...twoCreatureStateWithActingUnit("fire_bolt"),
          actionResources: [
            {
              kind: "action",
              source: "unit",
              sourceOwnerId: "A" as CreatureId,
              sourceUnitId: "fighter_action_surge_l2",
              restriction: { kind: "exclude", actions: ["magic"] },
            },
          ],
        },
        {
          subject: {
            tag: "unit",
            actorId: "A" as CreatureId,
            unitId: "fire_bolt",
          },
          filledHoleValues: [],
        },
      ),
    ).toEqual({
      tag: "invalid",
      reason: "no action available for unit",
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
