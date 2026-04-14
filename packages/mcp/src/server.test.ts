import { describe, expect, test } from "vitest";
import { createActor } from "xstate";

import { battleMachine } from "@dnd/core/battle-machine.ts";
import type { BattleEvent } from "@dnd/core/battle-machine-types.ts";
import { TABLE_EVENT_WARNING_CODES } from "@dnd/core/available-actions.ts";
import type { BattleWeaponProfile } from "@dnd/core/types.ts";
import {
  abilityModifier,
  armorClass,
  classLevel,
  CreatureId,
  difficultyClass,
  spellId,
  spellSlotLevel,
} from "@dnd/core/types.ts";

import {
  createBattleHost,
  createDemoHost,
  handleToolCall,
  toolDefinitions,
} from "./server.ts";
import { createSessionRouter } from "./session-router.ts";
import { tableEventSuccess } from "./server-table-events.ts";

function quota(resource: "action" | "bonusAction" | "reaction") {
  return { kind: "quota" as const, resource };
}

function movement(amount: number) {
  return { kind: "quota" as const, resource: "movement" as const, amount };
}

function pool(resource: string) {
  return { kind: "pool" as const, resource };
}

function cost(
  ...items: ReadonlyArray<
    | ReturnType<typeof quota>
    | ReturnType<typeof movement>
    | ReturnType<typeof pool>
  >
) {
  return items;
}

function preparedSpellIds(
  ...spells: ReadonlyArray<string>
): ReadonlySet<ReturnType<typeof spellId>> {
  return new Set(spells.map(spellId));
}

function readPayload(response: ReturnType<typeof handleToolCall>) {
  return JSON.parse(response.content[0]?.text ?? "null");
}

function creatureToken<T extends object>(token: T) {
  return { scope: "creature" as const, ...token };
}

function creatureResolved<T extends object>(token: T) {
  return { scope: "creature" as const, ...token };
}

const ZERO_BATTLE_SOT: Pick<
  BattleEvent & { type: "BATTLE_START_TURN" },
  | "sotDmg"
  | "sotDt"
  | "sotHeal"
  | "sotSaveResult"
  | "sotConSave"
  | "rechargeD6"
  | "deathSaveRoll"
> = {
  rechargeD6: 1,
  sotDmg: 0,
  sotDt: "bludgeoning",
  sotHeal: 0,
  sotSaveResult: false,
  sotConSave: true,
  deathSaveRoll: 0,
};

const LONGSWORD: BattleWeaponProfile = {
  name: "Longsword",
  damageType: "slashing",
  isMelee: true,
  damageDie: 8,
  versatileDie: 10,
  properties: new Set(["versatile"]),
};

const SHORTSWORD: BattleWeaponProfile = {
  name: "Shortsword",
  damageType: "piercing",
  isMelee: true,
  damageDie: 6,
  versatileDie: 0,
  properties: new Set(["finesse", "light"]),
};

function initBattleHostWithHitWindow() {
  const actor = createActor(battleMachine);
  actor.start();
  actor.send({
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 20 },
      {
        id: CreatureId("B"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        preparedSpells: preparedSpellIds("shield"),
        initiativeRoll: 15,
      },
      {
        id: CreatureId("C"),
        maxHp: 20,
        kind: "PC",
        bardLevel: 3,
        bardicInspirationCharges: 3,
        initiativeRoll: 10,
      },
    ],
  });
  actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
  actor.send({
    type: "BATTLE_ATTACK",
    targetId: CreatureId("B"),
    attackRoll: 15,
    diceCount: 1,
    dieSize: 8,
    dmg: 5,
    dt: "slashing",
    crit: false,
    tAc: armorClass(10),
    knockOut: false,
    isMelee: true,
    isFinesse: false,
    attackerWithin5ft: true,
    attackerWithin60ft: true,
    hostileWithin5ft: false,
    targetCanSeeAttacker: true,
    attackerCanSeeTarget: true,
    frightSourceInLOS: false,
    hasAllyAdjacentToTarget: false,
    saDmg: 0,
    hitReactionCandidates: new Set([CreatureId("C")]),
  });
  return createBattleHost(actor);
}

function initBattleHostWithDamageWindow() {
  const actor = createActor(battleMachine);
  actor.start();
  actor.send({
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 15 },
      {
        id: CreatureId("B"),
        maxHp: 20,
        kind: "PC",
        rogueLevel: 5,
        initiativeRoll: 10,
      },
    ],
  });
  actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
  actor.send({
    type: "BATTLE_ATTACK",
    targetId: CreatureId("B"),
    attackRoll: 15,
    diceCount: 1,
    dieSize: 8,
    dmg: 5,
    dt: "slashing",
    crit: false,
    tAc: armorClass(10),
    knockOut: false,
    isMelee: true,
    isFinesse: false,
    attackerWithin5ft: true,
    attackerWithin60ft: true,
    hostileWithin5ft: false,
    targetCanSeeAttacker: true,
    attackerCanSeeTarget: true,
    frightSourceInLOS: false,
    hasAllyAdjacentToTarget: false,
    saDmg: 0,
    hitReactionCandidates: new Set(),
  });
  actor.send({
    type: "BATTLE_RESOLVE_HIT_REACTION",
    reactorId: null,
    decision: { tag: "RPass" },
  });
  return createBattleHost(actor);
}

function initBattleHostWithProneActor() {
  const actor = createActor(battleMachine);
  actor.start();
  actor.send({
    type: "BATTLE_INIT",
    creatures: [
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        prone: true,
        initiativeRoll: 15,
      },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 10 },
    ],
  });
  actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
  return createBattleHost(actor);
}

function initBattleHostWithFeatureActor() {
  const actor = createActor(battleMachine);
  actor.start();
  actor.send({
    type: "BATTLE_INIT",
    creatures: [
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        fighterLevel: 2,
        barbarianLevel: 2,
        initiativeRoll: 15,
      },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 10 },
    ],
  });
  actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
  return createBattleHost(actor);
}

function initBattleHostWithAttackActor() {
  const actor = createActor(battleMachine);
  actor.start();
  actor.send({
    type: "BATTLE_INIT",
    creatures: [
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        initiativeRoll: 15,
        mainHandWeapon: LONGSWORD,
      },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 10 },
    ],
  });
  actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
  return createBattleHost(actor);
}

function initBattleHostWithPublicOffHandAttackActor(params?: {
  readonly strMod?: number;
  readonly dexMod?: number;
  readonly lightPropertyExtraAttackAddsAbilityModifier?: boolean;
}) {
  const actor = createActor(battleMachine);
  actor.start();
  actor.send({
    type: "BATTLE_INIT",
    creatures: [
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        initiativeRoll: 15,
        strMod: params?.strMod,
        dexMod: params?.dexMod,
        lightPropertyExtraAttackAddsAbilityModifier:
          params?.lightPropertyExtraAttackAddsAbilityModifier,
        mainHandWeapon: SHORTSWORD,
        offHandWeapon: SHORTSWORD,
      },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 10 },
    ],
  });
  actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
  actor.send({
    type: "BATTLE_ATTACK",
    targetId: CreatureId("B"),
    attackRoll: 15,
    diceCount: 1,
    dieSize: 6,
    dmg: 4,
    dt: "piercing",
    crit: false,
    tAc: armorClass(10),
    knockOut: false,
    isMelee: true,
    isFinesse: true,
    weaponProperties: SHORTSWORD.properties,
    attackerWithin5ft: true,
    attackerWithin60ft: true,
    hostileWithin5ft: false,
    targetCanSeeAttacker: true,
    attackerCanSeeTarget: true,
    frightSourceInLOS: false,
    hasAllyAdjacentToTarget: false,
    saDmg: 0,
    hitReactionCandidates: new Set(),
  });
  actor.send({
    type: "BATTLE_AFTER_DAMAGE_DECLINE",
    reactorId: null,
  });
  return createBattleHost(actor);
}

function initBattleHostWithPublicAttackReactionWindow() {
  const actor = createActor(battleMachine);
  actor.start();
  actor.send({
    type: "BATTLE_INIT",
    creatures: [
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        initiativeRoll: 20,
        mainHandWeapon: LONGSWORD,
      },
      {
        id: CreatureId("B"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        preparedSpells: preparedSpellIds("shield"),
        initiativeRoll: 15,
      },
    ],
  });
  actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
  return createBattleHost(actor);
}

function initBattleHostWithGrapplingActor() {
  const actor = createActor(battleMachine);
  actor.start();
  actor.send({
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 15 },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 10 },
    ],
  });
  actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
  actor.send({
    type: "BATTLE_GRAPPLE",
    targetId: CreatureId("B"),
    targetSaveFailed: true,
  });
  return createBattleHost(actor);
}

function initBattleHostWithWoundedActiveHealer() {
  const actor = createActor(battleMachine);
  actor.start();
  actor.send({
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 15 },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 10 },
    ],
  });
  actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
  actor.send({
    type: "BATTLE_ATTACK",
    targetId: CreatureId("B"),
    attackRoll: 15,
    diceCount: 1,
    dieSize: 8,
    dmg: 7,
    dt: "slashing",
    crit: false,
    tAc: armorClass(10),
    knockOut: false,
    isMelee: true,
    isFinesse: false,
    attackerWithin5ft: true,
    attackerWithin60ft: true,
    hostileWithin5ft: false,
    targetCanSeeAttacker: true,
    attackerCanSeeTarget: true,
    frightSourceInLOS: false,
    hasAllyAdjacentToTarget: false,
    saDmg: 0,
    hitReactionCandidates: new Set(),
  });
  actor.send({
    type: "BATTLE_RESOLVE_HIT_REACTION",
    reactorId: null,
    decision: { tag: "RPass" },
  });
  actor.send({
    type: "BATTLE_AFTER_DAMAGE_DECLINE",
    reactorId: null,
  });
  actor.send({
    type: "BATTLE_END_TURN",
    eotSaveSucceeded: false,
    eotDmg: 0,
    eotDt: "bludgeoning",
    eotConSave: true,
  });
  actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
  return createBattleHost(actor);
}

function initBattleHostWithReadyWindow() {
  const actor = createActor(battleMachine);
  actor.start();
  actor.send({
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 15 },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 10 },
    ],
  });
  actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
  actor.send({ type: "BATTLE_READY" });
  actor.send({
    type: "BATTLE_END_TURN",
    eotSaveSucceeded: false,
    eotDmg: 0,
    eotDt: "bludgeoning",
    eotConSave: true,
  });
  return createBattleHost(actor);
}

function initBattleHostWithReadySpellActor() {
  const actor = createActor(battleMachine);
  actor.start();
  actor.send({
    type: "BATTLE_INIT",
    creatures: [
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        preparedSpells: preparedSpellIds("hold_person"),
        initiativeRoll: 15,
      },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 10 },
    ],
  });
  actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
  return createBattleHost(actor);
}

function initBattleHostWithAoeSpellActor() {
  const actor = createActor(battleMachine);
  actor.start();
  actor.send({
    type: "BATTLE_INIT",
    creatures: [
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        preparedSpells: preparedSpellIds("burning_hands", "fireball"),
        initiativeRoll: 15,
      },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 10 },
      { id: CreatureId("C"), maxHp: 20, kind: "PC", initiativeRoll: 5 },
    ],
  });
  actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
  return createBattleHost(actor);
}

function initBattleHostWithHellishRebukeWindow() {
  const actor = createActor(battleMachine);
  actor.start();
  actor.send({
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 15 },
      {
        id: CreatureId("B"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        preparedSpells: preparedSpellIds("hellish_rebuke"),
        initiativeRoll: 10,
      },
    ],
  });
  actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
  actor.send({
    type: "BATTLE_ATTACK",
    targetId: CreatureId("B"),
    attackRoll: 15,
    diceCount: 1,
    dieSize: 8,
    dmg: 5,
    dt: "slashing",
    crit: false,
    tAc: armorClass(10),
    knockOut: false,
    isMelee: true,
    isFinesse: false,
    attackerWithin5ft: true,
    attackerWithin60ft: true,
    hostileWithin5ft: false,
    targetCanSeeAttacker: true,
    attackerCanSeeTarget: true,
    frightSourceInLOS: false,
    hasAllyAdjacentToTarget: false,
    saDmg: 0,
    hitReactionCandidates: new Set(),
  });
  return createBattleHost(actor);
}

function initBattleHostWithDeflectWindow() {
  const actor = createActor(battleMachine);
  actor.start();
  actor.send({
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 15 },
      {
        id: CreatureId("B"),
        maxHp: 20,
        kind: "PC",
        monkLevel: 3,
        dexMod: 4,
        initiativeRoll: 10,
      },
    ],
  });
  actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
  actor.send({
    type: "BATTLE_ATTACK",
    targetId: CreatureId("B"),
    attackRoll: 15,
    diceCount: 1,
    dieSize: 8,
    dmg: 9,
    dt: "slashing",
    crit: false,
    tAc: armorClass(10),
    knockOut: false,
    isMelee: true,
    isFinesse: false,
    attackerWithin5ft: true,
    hostileWithin5ft: false,
    targetCanSeeAttacker: true,
    attackerCanSeeTarget: true,
    frightSourceInLOS: false,
    hasAllyAdjacentToTarget: false,
    saDmg: 0,
    hitReactionCandidates: new Set(),
  });
  actor.send({
    type: "BATTLE_RESOLVE_HIT_REACTION",
    reactorId: null,
    decision: { tag: "RPass" },
  });
  return createBattleHost(actor);
}

function initBattleHostWithCounterspellWindow() {
  const actor = createActor(battleMachine);
  actor.start();
  actor.send({
    type: "BATTLE_INIT",
    creatures: [
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        preparedSpells: preparedSpellIds("hold_person"),
        slotsMax: [4, 3, 3, 1, 0, 0, 0, 0, 0],
        slotsCurrent: [4, 3, 3, 1, 0, 0, 0, 0, 0],
        initiativeRoll: 15,
      },
      {
        id: CreatureId("B"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        preparedSpells: preparedSpellIds("counterspell"),
        slotsMax: [4, 3, 3, 1, 0, 0, 0, 0, 0],
        slotsCurrent: [4, 3, 3, 1, 0, 0, 0, 0, 0],
        initiativeRoll: 10,
      },
      { id: CreatureId("C"), maxHp: 20, kind: "PC", initiativeRoll: 5 },
    ],
  });
  actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
  actor.send({
    type: "BATTLE_CAST_SAVE_SPELL",
    targetId: CreatureId("C"),
    saveDC: difficultyClass(13),
    saveRoll: 1,
    dmgOnFail: 0,
    halfOnSave: false,
    dt: "psychic",
    cond: "paralyzed",
    applyCond: true,
    saveAbility: "wis",
    slotLvl: spellSlotLevel(2),
    spellName: "hold_person",
    ritual: false,
  });
  return createBattleHost(actor);
}

function initBattleHostWithParryWindow() {
  const actor = createActor(battleMachine);
  actor.start();
  actor.send({
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 20 },
      {
        id: CreatureId("D"),
        maxHp: 20,
        kind: "Monster",
        parryAcBonus: 2,
        initiativeRoll: 15,
      },
    ],
  });
  actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
  actor.send({
    type: "BATTLE_ATTACK",
    targetId: CreatureId("D"),
    attackRoll: 15,
    diceCount: 1,
    dieSize: 8,
    dmg: 5,
    dt: "slashing",
    crit: false,
    tAc: armorClass(10),
    knockOut: false,
    isMelee: true,
    isFinesse: false,
    attackerWithin5ft: true,
    hostileWithin5ft: false,
    targetCanSeeAttacker: true,
    attackerCanSeeTarget: true,
    frightSourceInLOS: false,
    hasAllyAdjacentToTarget: false,
    saDmg: 0,
    hitReactionCandidates: new Set(),
  });
  return createBattleHost(actor);
}

describe("MCP server adapter", () => {
  test("tool definitions include control command and table event skeletons", () => {
    expect(toolDefinitions.map((tool) => tool.name)).toEqual([
      "get_state",
      "start_battle",
      "get_available_actions",
      "execute_action",
      "preview_action",
      "execute_control_command",
      "record_table_event",
    ]);
  });

  test("tool descriptions keep SHORT_REST on the action-token lane", () => {
    expect(
      toolDefinitions.find((tool) => tool.name === "get_available_actions")
        ?.description,
    ).toContain("SHORT_REST");
    expect(
      toolDefinitions.find((tool) => tool.name === "execute_action")
        ?.description,
    ).toContain("SHORT_REST");
    expect(
      toolDefinitions.find((tool) => tool.name === "execute_control_command")
        ?.description,
    ).toContain(
      "does not mirror lifecycle flows already kept on execute_action, including SHORT_REST",
    );
  });

  test("tool definition input schemas satisfy MCP object-schema shape", () => {
    expect(toolDefinitions.map((tool) => tool.inputSchema.type)).toEqual([
      "object",
      "object",
      "object",
      "object",
      "object",
      "object",
      "object",
    ]);
    for (const tool of toolDefinitions) {
      expect(tool.inputSchema).not.toHaveProperty("anyOf");
      expect(tool.inputSchema).not.toHaveProperty("oneOf");
      expect(tool.inputSchema).not.toHaveProperty("allOf");
    }
  });

  test("execute_control_command validates a narrow command shape", () => {
    const host = createDemoHost();

    const invalidRawAction = handleToolCall(host, "execute_control_command", {
      scope: "creature",
      type: "USE_SECOND_WIND",
    });

    expect("isError" in invalidRawAction && invalidRawAction.isError).toBe(
      true,
    );
    expect(readPayload(invalidRawAction)).toEqual({
      error: "Invalid execute_control_command input",
      details:
        'Invalid control command. Received type: "USE_SECOND_WIND". Valid types: END_TURN, LONG_REST, BATTLE_INIT, BATTLE_ADD_CREATURE, BATTLE_REMOVE_CREATURE, BATTLE_START_TURN, BATTLE_END_TURN, BATTLE_LEGENDARY_PASS, USE_LEGENDARY_ACTION, USE_RECHARGE_ABILITY, USE_DAILY_ABILITY.',
    });
  });

  test("execute_control_command keeps field-level errors for known command types", () => {
    const host = createBattleHost();

    const invalidKnownCommand = handleToolCall(
      host,
      "execute_control_command",
      {
        scope: "battle",
        type: "BATTLE_START_TURN",
      },
    );

    expect(
      "isError" in invalidKnownCommand && invalidKnownCommand.isError,
    ).toBe(true);
    const payload = readPayload(invalidKnownCommand);
    expect(payload.error).toBe("Invalid execute_control_command input");
    expect(String(payload.details)).toContain("rechargeD6");
  });

  test("execute_control_command keeps BATTLE_INIT creature-config errors concise", () => {
    const host = createBattleHost();

    const invalidBattleInit = handleToolCall(host, "execute_control_command", {
      scope: "battle",
      type: "BATTLE_INIT",
      creatures: [{ id: "goblin-1", kind: "Monster" }],
    });

    expect("isError" in invalidBattleInit && invalidBattleInit.isError).toBe(
      true,
    );
    expect(readPayload(invalidBattleInit)).toEqual({
      error: "Invalid execute_control_command input",
      details:
        'Invalid BATTLE_INIT creature config. Received kind: "Monster". Use either a raw creature config with maxHp and kind, or a Monster catalog config with statBlockId.',
    });
  });

  test("execute_control_command accepts BATTLE_ADD_CREATURE on the battle lane", () => {
    const actor = createActor(battleMachine);
    actor.start();
    actor.send({
      type: "BATTLE_INIT",
      creatures: [
        { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 20 },
        { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 10 },
      ],
    });
    actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
    const host = createBattleHost(actor);

    const response = handleToolCall(host, "execute_control_command", {
      scope: "battle",
      type: "BATTLE_ADD_CREATURE",
      insertAtIndex: 1,
      creatures: [{ id: "C", maxHp: 18, kind: "PC" }],
    });

    expect(readPayload(response)).toMatchObject({
      success: true,
      state: {
        initiative: ["A", "C", "B"],
      },
    });
  });

  test("execute_control_command projects a goblin stat block onto the battle lane", () => {
    const actor = createActor(battleMachine);
    actor.start();
    actor.send({
      type: "BATTLE_INIT",
      creatures: [
        {
          id: CreatureId("fighter"),
          maxHp: 20,
          kind: "PC",
          initiativeRoll: 20,
        },
      ],
    });
    actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
    const host = createBattleHost(actor);

    const response = handleToolCall(host, "execute_control_command", {
      scope: "battle",
      type: "BATTLE_ADD_CREATURE",
      insertAtIndex: 1,
      creatures: [
        { id: "goblin-1", kind: "Monster", statBlockId: "goblinMinion" },
      ],
    });

    expect(readPayload(response)).toMatchObject({
      success: true,
      state: {
        activeCreatureId: "fighter",
        initiative: ["fighter", "goblin-1"],
        creatureIds: ["fighter", "goblin-1"],
      },
    });
  });

  test("execute_control_command accepts BATTLE_REMOVE_CREATURE on the battle lane", () => {
    const actor = createActor(battleMachine);
    actor.start();
    actor.send({
      type: "BATTLE_INIT",
      creatures: [
        { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 20 },
        { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 15 },
        { id: CreatureId("C"), maxHp: 20, kind: "PC", initiativeRoll: 10 },
      ],
    });
    actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
    const host = createBattleHost(actor);

    const response = handleToolCall(host, "execute_control_command", {
      scope: "battle",
      type: "BATTLE_REMOVE_CREATURE",
      creatureIds: ["B", "C"],
    });

    expect(readPayload(response)).toMatchObject({
      success: true,
      state: {
        initiative: ["A"],
      },
    });
  });

  test("execute_control_command projects Harpy through the same battle lane", () => {
    const actor = createActor(battleMachine);
    actor.start();
    actor.send({
      type: "BATTLE_INIT",
      creatures: [
        {
          id: CreatureId("fighter"),
          maxHp: 20,
          kind: "PC",
          initiativeRoll: 20,
        },
      ],
    });
    actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
    const host = createBattleHost(actor);

    const response = handleToolCall(host, "execute_control_command", {
      scope: "battle",
      type: "BATTLE_ADD_CREATURE",
      insertAtIndex: 1,
      creatures: [{ id: "harpy-1", kind: "Monster", statBlockId: "harpy" }],
    });

    expect(readPayload(response)).toMatchObject({
      success: true,
      state: {
        activeCreatureId: "fighter",
        initiative: ["fighter", "harpy-1"],
        creatureIds: ["fighter", "harpy-1"],
      },
    });
  });

  test("record_table_event validates a narrow table-event shape", () => {
    const host = createDemoHost();
    const before = readPayload(handleToolCall(host, "get_state", {}));

    const invalidRawAction = handleToolCall(host, "record_table_event", {
      scope: "creature",
      type: "HEAL",
      amount: 0,
    });

    expect("isError" in invalidRawAction && invalidRawAction.isError).toBe(
      true,
    );
    expect(readPayload(invalidRawAction)).toEqual({
      error: "Invalid record_table_event input",
      details: expect.stringContaining("amount"),
    });
    expect(readPayload(handleToolCall(host, "get_state", {}))).toEqual(before);

    const undecidedGenericSpell = handleToolCall(host, "record_table_event", {
      scope: "battle",
      type: "BATTLE_CAST_SAVE_SPELL",
    });

    expect(
      "isError" in undecidedGenericSpell && undecidedGenericSpell.isError,
    ).toBe(true);
    expect(readPayload(undecidedGenericSpell)).toEqual({
      error: "Invalid record_table_event input",
      details:
        'Invalid table event. Received type: "BATTLE_CAST_SAVE_SPELL". Valid types: TAKE_DAMAGE, HEAL, GRANT_TEMP_HP, STABILIZE, KNOCK_OUT, APPLY_CONDITION, REMOVE_CONDITION, ADD_EXHAUSTION, REDUCE_EXHAUSTION, APPLY_FALL, BREAK_CONCENTRATION, RECORD_FAILED_SAVING_THROW, RECORD_FAILED_ABILITY_CHECK, BATTLE_HEAL.',
    });
  });

  test("record_table_event exports the minimum warning vocabulary", () => {
    expect(TABLE_EVENT_WARNING_CODES).toEqual([
      "bypasses_semantic_action",
      "external_table_fact",
      "unsupported_domain_gap",
    ]);
  });

  test("tableEventSuccess builds the applied event result shape", () => {
    const result = tableEventSuccess(
      { scope: "creature", type: "STABILIZE" },
      [
        {
          code: "external_table_fact",
          message: "The table declared the creature stable.",
        },
      ],
      { hp: 0, stable: true },
    );

    expect(readPayload(result)).toEqual({
      success: true,
      appliedEvent: { scope: "creature", type: "STABILIZE" },
      warnings: [
        {
          code: "external_table_fact",
          message: "The table declared the creature stable.",
        },
      ],
      state: { hp: 0, stable: true },
    });
  });

  test("record_table_event rejects scope mismatches", () => {
    const creatureHost = createDemoHost();
    const battleHost = createBattleHost();

    const battleOnCreature = handleToolCall(
      creatureHost,
      "record_table_event",
      {
        scope: "battle",
        type: "BATTLE_HEAL",
        targetId: "B",
        amount: 5,
      },
    );
    expect("isError" in battleOnCreature && battleOnCreature.isError).toBe(
      true,
    );
    expect(readPayload(battleOnCreature)).toEqual({
      error:
        "Table event scope battle does not match the current creature host.",
      details: "TABLE_EVENT_SCOPE_MISMATCH",
    });

    const creatureOnBattle = handleToolCall(battleHost, "record_table_event", {
      scope: "creature",
      type: "STABILIZE",
    });
    expect("isError" in creatureOnBattle && creatureOnBattle.isError).toBe(
      true,
    );
    expect(readPayload(creatureOnBattle)).toEqual({
      error:
        "Table event scope creature does not match the current battle host.",
      details: "TABLE_EVENT_SCOPE_MISMATCH",
    });
  });

  test("execute_control_command rejects excess turn runtime facts", () => {
    const host = createDemoHost();

    const response = handleToolCall(host, "execute_control_command", {
      scope: "creature",
      type: "LONG_REST",
      rechargeD6: 6,
    });

    expect("isError" in response && response.isError).toBe(true);
    expect(readPayload(response).error).toBe(
      "Invalid execute_control_command input",
    );
  });

  test("record_table_event applies creature fall events with warnings", () => {
    const host = createDemoHost();

    const fall = readPayload(
      handleToolCall(host, "record_table_event", {
        scope: "creature",
        type: "APPLY_FALL",
        damageRoll: 10,
        semanticAction: { kind: "spell", name: "thunderwave" },
      }),
    );

    expect(fall).toMatchObject({
      success: true,
      appliedEvent: {
        scope: "creature",
        type: "APPLY_FALL",
        damageRoll: 10,
        semanticAction: { kind: "spell", name: "thunderwave" },
      },
      warnings: [
        {
          code: "external_table_fact",
          message:
            "APPLY_FALL records a table fact rather than an ordinary suggested action.",
        },
        {
          code: "bypasses_semantic_action",
          message:
            "APPLY_FALL bypasses the stricter spell action path for thunderwave. Prefer a modeled action token when one exists.",
        },
      ],
    });
    expect(fall.state.hp).toBe(24);
    expect(fall.state.prone).toBe(true);

    const immuneHost = createDemoHost();
    const immuneFall = readPayload(
      handleToolCall(immuneHost, "record_table_event", {
        scope: "creature",
        type: "APPLY_FALL",
        damageRoll: 10,
        immunities: ["bludgeoning"],
      }),
    );
    expect(immuneFall.success).toBe(true);
    expect(immuneFall.state.hp).toBe(34);
    expect(immuneFall.state.prone).toBe(false);
  });

  test("record_table_event applies creature damage and recovery events with warnings", () => {
    const damageHost = createDemoHost();
    const damage = readPayload(
      handleToolCall(damageHost, "record_table_event", {
        scope: "creature",
        type: "TAKE_DAMAGE",
        amount: 8,
        damageType: "fire",
        resistances: ["fire"],
        semanticAction: { kind: "spell", name: "fireball" },
      }),
    );
    expect(damage).toMatchObject({
      success: true,
      appliedEvent: {
        scope: "creature",
        type: "TAKE_DAMAGE",
        amount: 8,
        damageType: "fire",
        resistances: ["fire"],
        semanticAction: { kind: "spell", name: "fireball" },
      },
      warnings: [
        {
          code: "external_table_fact",
          message:
            "TAKE_DAMAGE records a table fact rather than an ordinary suggested action.",
        },
        {
          code: "bypasses_semantic_action",
          message:
            "TAKE_DAMAGE bypasses the stricter spell action path for fireball. Prefer a modeled action token when one exists.",
        },
      ],
    });
    expect(damage.state.hp).toBe(30);

    const heal = readPayload(
      handleToolCall(damageHost, "record_table_event", {
        scope: "creature",
        type: "HEAL",
        amount: 5,
        semanticAction: { kind: "feature", name: "Second Wind" },
      }),
    );
    expect(heal.success).toBe(true);
    expect(heal.state.hp).toBe(35);
    expect(heal.warnings).toContainEqual({
      code: "bypasses_semantic_action",
      message:
        "HEAL bypasses the stricter feature action path for Second Wind. Prefer a modeled action token when one exists.",
    });

    const temp = readPayload(
      handleToolCall(damageHost, "record_table_event", {
        scope: "creature",
        type: "GRANT_TEMP_HP",
        amount: 7,
        keepOld: false,
      }),
    );
    expect(temp.success).toBe(true);
    expect(temp.state.tempHp).toBe(7);

    const stableHost = createDemoHost({
      maxHp: 10,
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    });
    const stabilize = readPayload(
      handleToolCall(stableHost, "record_table_event", {
        scope: "creature",
        type: "STABILIZE",
      }),
    );
    expect(stabilize.success).toBe(true);
    expect(stabilize.state.stable).toBe(true);
    expect(stabilize.state.deathSaves).toEqual({ successes: 0, failures: 0 });

    const knockoutHost = createDemoHost();
    const knockOut = readPayload(
      handleToolCall(knockoutHost, "record_table_event", {
        scope: "creature",
        type: "KNOCK_OUT",
      }),
    );
    expect(knockOut.success).toBe(true);
    expect(knockOut.state.hp).toBe(1);
    expect(knockOut.state.unconscious).toBe(true);
  });

  test("record_table_event reports handled no-op damage and recovery events as applied", () => {
    const immuneHost = createDemoHost();
    const immuneDamage = handleToolCall(immuneHost, "record_table_event", {
      scope: "creature",
      type: "TAKE_DAMAGE",
      amount: 10,
      damageType: "poison",
      immunities: ["poison"],
    });
    expect("isError" in immuneDamage).toBe(false);
    expect(readPayload(immuneDamage)).toMatchObject({
      success: true,
      state: { hp: 34 },
    });

    const healedHost = createDemoHost();
    handleToolCall(healedHost, "record_table_event", {
      scope: "creature",
      type: "HEAL",
      amount: 100,
    });
    const cappedHeal = handleToolCall(healedHost, "record_table_event", {
      scope: "creature",
      type: "HEAL",
      amount: 1,
    });
    expect("isError" in cappedHeal).toBe(false);
    expect(readPayload(cappedHeal)).toMatchObject({
      success: true,
      state: { hp: 44 },
    });

    const tempHpHost = createDemoHost();
    handleToolCall(tempHpHost, "record_table_event", {
      scope: "creature",
      type: "GRANT_TEMP_HP",
      amount: 8,
      keepOld: false,
    });
    const keepOldTempHp = handleToolCall(tempHpHost, "record_table_event", {
      scope: "creature",
      type: "GRANT_TEMP_HP",
      amount: 3,
      keepOld: true,
    });
    expect("isError" in keepOldTempHp).toBe(false);
    expect(readPayload(keepOldTempHp)).toMatchObject({
      success: true,
      state: { tempHp: 8 },
    });
  });

  test("record_table_event rejects handled events that are unavailable in the current host state", () => {
    const host = createDemoHost();

    const response = handleToolCall(host, "record_table_event", {
      scope: "creature",
      type: "STABILIZE",
    });

    expect("isError" in response && response.isError).toBe(true);
    expect(readPayload(response)).toEqual({
      success: false,
      appliedEvent: null,
      warnings: [
        {
          code: "external_table_fact",
          message:
            "STABILIZE records a table fact rather than an ordinary suggested action.",
        },
      ],
      state: readPayload(handleToolCall(host, "get_state", {})),
      error: {
        code: "TABLE_EVENT_NOT_ACCEPTED",
        message: "Table event is not accepted in the current host state",
        event: { scope: "creature", type: "STABILIZE" },
      },
    });
  });

  test("record_table_event applies creature condition events with warnings", () => {
    const host = createDemoHost();

    const apply = readPayload(
      handleToolCall(host, "record_table_event", {
        scope: "creature",
        type: "APPLY_CONDITION",
        condition: "poisoned",
        semanticAction: { kind: "spell", name: "ray of sickness" },
      }),
    );
    expect(apply.success).toBe(true);
    expect(apply.state.poisoned).toBe(true);
    expect(apply.warnings).toContainEqual({
      code: "external_table_fact",
      message:
        "APPLY_CONDITION records a table fact rather than an ordinary suggested action.",
    });
    expect(apply.warnings).toContainEqual({
      code: "bypasses_semantic_action",
      message:
        "APPLY_CONDITION bypasses the stricter spell action path for ray of sickness. Prefer a modeled action token when one exists.",
    });

    const remove = readPayload(
      handleToolCall(host, "record_table_event", {
        scope: "creature",
        type: "REMOVE_CONDITION",
        condition: "poisoned",
      }),
    );
    expect(remove.success).toBe(true);
    expect(remove.state.poisoned).toBe(false);
  });

  test("record_table_event applies condition with immunity pass-through", () => {
    const host = createDemoHost();

    const immuneApply = readPayload(
      handleToolCall(host, "record_table_event", {
        scope: "creature",
        type: "APPLY_CONDITION",
        condition: "charmed",
        conditionImmunities: ["charmed"],
      }),
    );
    expect(immuneApply.success).toBe(true);
    expect(immuneApply.state.charmed).toBe(false);
  });

  test("record_table_event rejects condition application on dead creatures", () => {
    const host = createDemoHost({ maxHp: 20 });
    readPayload(
      handleToolCall(host, "record_table_event", {
        scope: "creature",
        type: "TAKE_DAMAGE",
        amount: 10,
        damageType: "slashing",
      }),
    );
    readPayload(
      handleToolCall(host, "record_table_event", {
        scope: "creature",
        type: "TAKE_DAMAGE",
        amount: 20,
        damageType: "slashing",
      }),
    );

    const response = handleToolCall(host, "record_table_event", {
      scope: "creature",
      type: "APPLY_CONDITION",
      condition: "poisoned",
    });
    const payload = readPayload(response);

    expect("isError" in response && response.isError).toBe(true);
    expect(payload.success).toBe(false);
    expect(payload.error.code).toBe("TABLE_EVENT_NOT_ACCEPTED");
    expect(payload.state.dead).toBe(true);
    expect(payload.state.unconscious).toBe(true);
    expect(payload.state.poisoned).toBe(false);
  });

  test("record_table_event rejects condition removal on dead creatures", () => {
    const host = createDemoHost({ maxHp: 20 });
    readPayload(
      handleToolCall(host, "record_table_event", {
        scope: "creature",
        type: "TAKE_DAMAGE",
        amount: 10,
        damageType: "slashing",
      }),
    );
    readPayload(
      handleToolCall(host, "record_table_event", {
        scope: "creature",
        type: "TAKE_DAMAGE",
        amount: 20,
        damageType: "slashing",
      }),
    );

    const response = handleToolCall(host, "record_table_event", {
      scope: "creature",
      type: "REMOVE_CONDITION",
      condition: "unconscious",
    });
    const payload = readPayload(response);

    expect("isError" in response && response.isError).toBe(true);
    expect(payload.success).toBe(false);
    expect(payload.error.code).toBe("TABLE_EVENT_NOT_ACCEPTED");
    expect(payload.state.dead).toBe(true);
    expect(payload.state.unconscious).toBe(true);
  });

  test("record_table_event applies creature exhaustion events with warnings", () => {
    const host = createDemoHost();

    const addExhaustion = readPayload(
      handleToolCall(host, "record_table_event", {
        scope: "creature",
        type: "ADD_EXHAUSTION",
        levels: 2,
      }),
    );
    expect(addExhaustion.success).toBe(true);
    expect(addExhaustion.state.exhaustion).toBe(2);
    expect(addExhaustion.warnings).toContainEqual({
      code: "external_table_fact",
      message:
        "ADD_EXHAUSTION records a table fact rather than an ordinary suggested action.",
    });

    const reduceExhaustion = readPayload(
      handleToolCall(host, "record_table_event", {
        scope: "creature",
        type: "REDUCE_EXHAUSTION",
        levels: 1,
      }),
    );
    expect(reduceExhaustion.success).toBe(true);
    expect(reduceExhaustion.state.exhaustion).toBe(1);
  });

  test("record_table_event applies exhaustion with immunity pass-through", () => {
    const host = createDemoHost();

    const immuneExhaustion = readPayload(
      handleToolCall(host, "record_table_event", {
        scope: "creature",
        type: "ADD_EXHAUSTION",
        levels: 1,
        exhaustionImmune: true,
      }),
    );
    expect(immuneExhaustion.success).toBe(true);
    expect(immuneExhaustion.state.exhaustion).toBe(0);
  });

  test("record_table_event rejects ADD_EXHAUSTION on dead creatures", () => {
    const host = createDemoHost({ maxHp: 20 });
    readPayload(
      handleToolCall(host, "record_table_event", {
        scope: "creature",
        type: "ADD_EXHAUSTION",
        levels: 2,
      }),
    );
    readPayload(
      handleToolCall(host, "record_table_event", {
        scope: "creature",
        type: "TAKE_DAMAGE",
        amount: 10,
        damageType: "slashing",
      }),
    );
    readPayload(
      handleToolCall(host, "record_table_event", {
        scope: "creature",
        type: "TAKE_DAMAGE",
        amount: 20,
        damageType: "slashing",
      }),
    );

    const response = handleToolCall(host, "record_table_event", {
      scope: "creature",
      type: "ADD_EXHAUSTION",
      levels: 1,
    });
    const payload = readPayload(response);

    expect("isError" in response && response.isError).toBe(true);
    expect(payload.success).toBe(false);
    expect(payload.error.code).toBe("TABLE_EVENT_NOT_ACCEPTED");
    expect(payload.state.dead).toBe(true);
    expect(payload.state.exhaustion).toBe(2);
  });

  test("record_table_event rejects REDUCE_EXHAUSTION on dead creatures", () => {
    const host = createDemoHost({ maxHp: 20 });
    readPayload(
      handleToolCall(host, "record_table_event", {
        scope: "creature",
        type: "ADD_EXHAUSTION",
        levels: 3,
      }),
    );
    readPayload(
      handleToolCall(host, "record_table_event", {
        scope: "creature",
        type: "TAKE_DAMAGE",
        amount: 10,
        damageType: "slashing",
      }),
    );
    readPayload(
      handleToolCall(host, "record_table_event", {
        scope: "creature",
        type: "TAKE_DAMAGE",
        amount: 20,
        damageType: "slashing",
      }),
    );

    const response = handleToolCall(host, "record_table_event", {
      scope: "creature",
      type: "REDUCE_EXHAUSTION",
      levels: 1,
    });
    const payload = readPayload(response);

    expect("isError" in response && response.isError).toBe(true);
    expect(payload.success).toBe(false);
    expect(payload.error.code).toBe("TABLE_EVENT_NOT_ACCEPTED");
    expect(payload.state.dead).toBe(true);
    expect(payload.state.exhaustion).toBe(3);
  });

  test("record_table_event validates condition and exhaustion schema shapes", () => {
    const host = createDemoHost();

    const missingCondition = handleToolCall(host, "record_table_event", {
      scope: "creature",
      type: "APPLY_CONDITION",
    });
    expect(readPayload(missingCondition)).toMatchObject({
      error: "Invalid record_table_event input",
    });

    const invalidCondition = handleToolCall(host, "record_table_event", {
      scope: "creature",
      type: "APPLY_CONDITION",
      condition: "cursed",
    });
    expect(readPayload(invalidCondition)).toMatchObject({
      error: "Invalid record_table_event input",
    });

    const missingLevels = handleToolCall(host, "record_table_event", {
      scope: "creature",
      type: "ADD_EXHAUSTION",
    });
    expect(readPayload(missingLevels)).toMatchObject({
      error: "Invalid record_table_event input",
    });

    const zeroLevels = handleToolCall(host, "record_table_event", {
      scope: "creature",
      type: "ADD_EXHAUSTION",
      levels: 0,
    });
    expect(readPayload(zeroLevels)).toMatchObject({
      error: "Invalid record_table_event input",
    });
  });

  test("record_table_event applies voluntary concentration breaks with warnings", () => {
    const host = createDemoHost();
    host.actor.send({
      type: "START_CONCENTRATION",
      spellId: spellId("bless"),
      durationTurns: 10,
      expiresAt: "end",
      casterId: CreatureId("self"),
    });

    const response = readPayload(
      handleToolCall(host, "record_table_event", {
        scope: "creature",
        type: "BREAK_CONCENTRATION",
      }),
    );

    expect(response.success).toBe(true);
    expect(response.state.concentrationSpellId).toBeNull();
    expect(response.state.activeEffects).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ spellId: "bless" })]),
    );
    expect(response.warnings).toContainEqual({
      code: "external_table_fact",
      message:
        "BREAK_CONCENTRATION records a table fact rather than an ordinary suggested action.",
    });
  });

  test("record_table_event records a failed Saving Throw for Indomitable without exposing the raw trigger", () => {
    const host = createDemoHost({
      maxHp: 24,
      fighterLevel: classLevel(9),
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    });
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "ENTER_COMBAT" }),
    );
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "START_TURN" }),
    );

    const rawTrigger = handleToolCall(host, "record_table_event", {
      scope: "creature",
      type: "TRIGGER_INDOMITABLE",
    });
    expect("isError" in rawTrigger && rawTrigger.isError).toBe(true);
    expect(readPayload(rawTrigger).error).toBe(
      "Invalid record_table_event input",
    );

    const response = readPayload(
      handleToolCall(host, "record_table_event", {
        scope: "creature",
        type: "RECORD_FAILED_SAVING_THROW",
      }),
    );
    expect(response.success).toBe(true);
    expect(response.state.pendingResolution).toEqual({ kind: "indomitable" });
    expect(response.warnings).toContainEqual({
      code: "external_table_fact",
      message:
        "RECORD_FAILED_SAVING_THROW records a table fact rather than an ordinary suggested action.",
    });

    const available = readPayload(
      handleToolCall(host, "get_available_actions", {}),
    );
    expect(available.free).toContainEqual(
      creatureToken({
        type: "USE_INDOMITABLE",
        cost: cost(pool("indomitable")),
        outcome: {
          summary:
            "Expend one Indomitable use to reroll the failed saving throw and add your Fighter level",
        },
      }),
    );

    const execResponse = handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "USE_INDOMITABLE" }),
    );
    expect("isError" in execResponse).toBe(false);
    const execPayload = readPayload(execResponse);
    expect(execPayload.success).toBe(true);
    expect(execPayload.state.classStates.fighter.indomitableCharges).toBe(0);
    expect(execPayload.state.pendingResolution).toBeNull();
  });

  test("record_table_event records a failed Ability Check for Tactical Mind without exposing the raw trigger", () => {
    const host = createDemoHost({
      maxHp: 24,
      fighterLevel: classLevel(2),
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    });

    const rawTrigger = handleToolCall(host, "record_table_event", {
      scope: "creature",
      type: "TRIGGER_TACTICAL_MIND",
    });
    expect("isError" in rawTrigger && rawTrigger.isError).toBe(true);
    expect(readPayload(rawTrigger).error).toBe(
      "Invalid record_table_event input",
    );

    const response = readPayload(
      handleToolCall(host, "record_table_event", {
        scope: "creature",
        type: "RECORD_FAILED_ABILITY_CHECK",
      }),
    );
    expect(response.success).toBe(true);
    expect(response.state.pendingResolution).toEqual({
      kind: "tacticalMind",
    });
    expect(response.warnings).toContainEqual({
      code: "external_table_fact",
      message:
        "RECORD_FAILED_ABILITY_CHECK records a table fact rather than an ordinary suggested action.",
    });

    const available = readPayload(
      handleToolCall(host, "get_available_actions", {}),
    );
    expect(available.free).toContainEqual(
      creatureToken({
        type: "USE_TACTICAL_MIND",
        cost: cost(pool("secondWind")),
        outcome: {
          summary:
            "Add 1d10 to the failed ability check; expend Second Wind only if the check now succeeds",
        },
      }),
    );

    const execResponse = handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "USE_TACTICAL_MIND" }),
    );
    expect("isError" in execResponse).toBe(false);
    const execPayload = readPayload(execResponse);
    expect(execPayload.success).toBe(true);
    expect(execPayload.state.pendingResolution).toBeNull();
  });

  test("record_table_event does not open Tactical Mind while the fighter is Incapacitated", () => {
    const host = createDemoHost({
      maxHp: 24,
      fighterLevel: classLevel(2),
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    });
    handleToolCall(host, "record_table_event", {
      scope: "creature",
      type: "APPLY_CONDITION",
      condition: "incapacitated",
    });

    const response = readPayload(
      handleToolCall(host, "record_table_event", {
        scope: "creature",
        type: "RECORD_FAILED_ABILITY_CHECK",
      }),
    );
    expect(response.success).toBe(true);
    expect(response.state.pendingResolution).toBeNull();
  });

  test("record_table_event keeps the raw Overchannel trigger internal", () => {
    const host = createDemoHost({
      maxHp: 36,
      wizardLevel: classLevel(14),
      preparedSpells: preparedSpellIds("fireball"),
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    });

    const rawTrigger = handleToolCall(host, "record_table_event", {
      scope: "creature",
      type: "TRIGGER_OVERCHANNEL",
      spellName: "fireball",
      slotLevel: 3,
    });
    expect("isError" in rawTrigger && rawTrigger.isError).toBe(true);
    expect(readPayload(rawTrigger).error).toBe(
      "Invalid record_table_event input",
    );
    expect(host.actor.getSnapshot().context.pendingResolution).toBeNull();
  });

  test("record_table_event keeps max-HP and generic effect payloads blocked", () => {
    const host = createDemoHost();

    for (const event of [
      { scope: "creature", type: "REDUCE_MAX_HP", amount: 5 },
      { scope: "creature", type: "RESTORE_MAX_HP", amount: 5 },
      {
        scope: "creature",
        type: "ADD_EFFECT",
        spellId: "bless",
        durationTurns: 10,
        expiresAt: "end",
        casterId: "self",
      },
      { scope: "creature", type: "REMOVE_EFFECT", spellId: "bless" },
    ]) {
      expect(
        readPayload(handleToolCall(host, "record_table_event", event)),
      ).toMatchObject({
        error: "Invalid record_table_event input",
      });
    }
  });

  test("record_table_event applies battle healing with warnings", () => {
    const host = initBattleHostWithWoundedActiveHealer();

    expect(
      host.actor.getSnapshot().context.creatures.get(CreatureId("B"))?.hp,
    ).toBe(13);

    const response = readPayload(
      handleToolCall(host, "record_table_event", {
        scope: "battle",
        type: "BATTLE_HEAL",
        targetId: "B",
        amount: 5,
        semanticAction: { kind: "spell", name: "Healing Word" },
      }),
    );

    expect(response).toMatchObject({
      success: true,
      appliedEvent: {
        scope: "battle",
        type: "BATTLE_HEAL",
        targetId: "B",
        amount: 5,
        semanticAction: { kind: "spell", name: "Healing Word" },
      },
      warnings: [
        {
          code: "external_table_fact",
          message:
            "BATTLE_HEAL records a table fact rather than an ordinary suggested action.",
        },
        {
          code: "bypasses_semantic_action",
          message:
            "BATTLE_HEAL bypasses the stricter spell action path for Healing Word. Prefer a modeled action token when one exists.",
        },
      ],
      state: { scope: "battle", activeCreatureId: "B" },
    });
    expect(
      host.actor.getSnapshot().context.creatures.get(CreatureId("A"))?.hp,
    ).toBe(20);
    expect(
      host.actor.getSnapshot().context.creatures.get(CreatureId("B"))?.hp,
    ).toBe(18);
    expect(
      host.actor.getSnapshot().context.creatures.get(CreatureId("B"))
        ?.actionsRemaining,
    ).toBe(0);
  });

  test("record_table_event rejects invalid battle healing", () => {
    const host = initBattleHostWithWoundedActiveHealer();

    const missingTarget = handleToolCall(host, "record_table_event", {
      scope: "battle",
      type: "BATTLE_HEAL",
      amount: 5,
    });
    expect("isError" in missingTarget && missingTarget.isError).toBe(true);
    expect(readPayload(missingTarget).error).toBe(
      "Invalid record_table_event input",
    );

    const missingAmount = handleToolCall(host, "record_table_event", {
      scope: "battle",
      type: "BATTLE_HEAL",
      targetId: "B",
    });
    expect("isError" in missingAmount && missingAmount.isError).toBe(true);
    expect(readPayload(missingAmount).error).toBe(
      "Invalid record_table_event input",
    );

    const zeroAmount = handleToolCall(host, "record_table_event", {
      scope: "battle",
      type: "BATTLE_HEAL",
      targetId: "B",
      amount: 0,
    });
    expect("isError" in zeroAmount && zeroAmount.isError).toBe(true);
    expect(readPayload(zeroAmount).error).toBe(
      "Invalid record_table_event input",
    );

    const unknownTarget = handleToolCall(host, "record_table_event", {
      scope: "battle",
      type: "BATTLE_HEAL",
      targetId: "missing",
      amount: 1,
    });
    expect("isError" in unknownTarget && unknownTarget.isError).toBe(true);
    const unknownPayload = readPayload(unknownTarget);
    expect(unknownPayload.success).toBe(false);
    expect(unknownPayload.error.code).toBe("TABLE_EVENT_NOT_ACCEPTED");
  });

  test("creature control commands execute turn end and long rest", () => {
    const host = createDemoHost();
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "ENTER_COMBAT" }),
    );
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "START_TURN" }),
    );

    const endTurn = handleToolCall(host, "execute_control_command", {
      scope: "creature",
      type: "END_TURN",
    });

    expect("isError" in endTurn).toBe(false);
    expect(readPayload(endTurn).success).toBe(true);

    const restHost = createDemoHost();
    const longRest = handleToolCall(restHost, "execute_control_command", {
      scope: "creature",
      type: "LONG_REST",
    });

    expect("isError" in longRest).toBe(false);
    expect(readPayload(longRest).state.hp).toBe(44);
  });

  test("EXIT_COMBAT remains executable after death because roster teardown is caller-owned", () => {
    const host = createDemoHost();
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "ENTER_COMBAT" }),
    );
    host.actor.send({
      type: "TAKE_DAMAGE",
      amount: 88,
      damageType: "slashing",
      resistances: new Set(),
      vulnerabilities: new Set(),
      immunities: new Set(),
      isCritical: false,
    });

    const stateAfterDeath = readPayload(handleToolCall(host, "get_state", {}));
    expect(stateAfterDeath.dead).toBe(true);

    const available = readPayload(
      handleToolCall(host, "get_available_actions", {}),
    );
    expect(available.free).toContainEqual(
      creatureToken({
        type: "EXIT_COMBAT",
        cost: cost(),
        outcome: {
          summary: "Stop tracking this creature in combat and initiative order",
        },
      }),
    );

    const exitCombat = handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "EXIT_COMBAT" }),
    );
    expect("isError" in exitCombat).toBe(false);
    expect(readPayload(exitCombat)).toMatchObject({
      success: true,
      outcome: "Stop tracking this creature in combat and initiative order",
      state: { dead: true },
    });
  });

  test("battle control commands execute with explicit runtime facts", () => {
    const host = createBattleHost();

    const init = handleToolCall(host, "execute_control_command", {
      scope: "battle",
      type: "BATTLE_INIT",
      creatures: [
        {
          id: "A",
          maxHp: 20,
          kind: "PC",
          fighterLevel: 5,
          initiativeRoll: 20,
        },
        {
          id: "B",
          maxHp: 30,
          kind: "Monster",
          legendaryActions: 1,
          initiativeRoll: 10,
        },
      ],
    });

    expect("isError" in init).toBe(false);
    expect(readPayload(init).state).toEqual(
      expect.objectContaining({
        activeCreatureId: "A",
        creatureIds: ["A", "B"],
      }),
    );
    expect(
      host.actor.getSnapshot().context.creatures.get(CreatureId("A"))
        ?.fighterLevel,
    ).toBe(5);

    const startTurn = handleToolCall(host, "execute_control_command", {
      scope: "battle",
      type: "BATTLE_START_TURN",
      ...ZERO_BATTLE_SOT,
    });

    expect("isError" in startTurn).toBe(false);
    expect(readPayload(startTurn).state.phase).toBe("activeTurn");

    const endTurn = handleToolCall(host, "execute_control_command", {
      scope: "battle",
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });

    expect("isError" in endTurn).toBe(false);
    expect(readPayload(endTurn).state).toEqual(
      expect.objectContaining({
        phase: "awaitingLegendaryAction",
        awaitingLegendaryAction: true,
      }),
    );

    const pass = handleToolCall(host, "execute_control_command", {
      scope: "battle",
      type: "BATTLE_LEGENDARY_PASS",
    });

    expect("isError" in pass).toBe(false);
    expect(readPayload(pass).state).toEqual(
      expect.objectContaining({
        activeCreatureId: "B",
        awaitingLegendaryAction: false,
      }),
    );
  });

  test("battle get_state projects named monster-control menus from stat-block ownership", () => {
    const host = createBattleHost();

    handleToolCall(host, "execute_control_command", {
      scope: "battle",
      type: "BATTLE_INIT",
      creatures: [
        { id: "fighter", maxHp: 44, kind: "PC", initiativeRoll: 20 },
        {
          id: "aboleth-1",
          kind: "Monster",
          statBlockId: "aboleth",
          initiativeRoll: 10,
        },
      ],
    });

    const payload = readPayload(handleToolCall(host, "get_state", {}));
    expect(payload.monsterControl).toMatchObject({
      "aboleth-1": {
        statBlockId: "aboleth",
        legendaryActions: expect.arrayContaining([
          expect.objectContaining({
            id: "lash",
            name: "Lash",
            cost: 1,
            remainingUses: 3,
            selected: false,
          }),
          expect.objectContaining({
            id: "psychicDrain",
            name: "Psychic Drain",
            selected: false,
          }),
        ]),
        dailyAbilities: [
          {
            id: "dominateMind",
            name: "Dominate Mind",
            remainingUses: 2,
            selected: false,
          },
        ],
      },
    });
  });

  test("battle legendary control selection opens the generic legendary attack follow-up", () => {
    const host = createBattleHost();

    handleToolCall(host, "execute_control_command", {
      scope: "battle",
      type: "BATTLE_INIT",
      creatures: [
        { id: "fighter", maxHp: 44, kind: "PC", initiativeRoll: 20 },
        {
          id: "aboleth-1",
          kind: "Monster",
          statBlockId: "aboleth",
          initiativeRoll: 10,
        },
      ],
    });
    handleToolCall(host, "execute_control_command", {
      scope: "battle",
      type: "BATTLE_START_TURN",
      ...ZERO_BATTLE_SOT,
    });
    handleToolCall(host, "execute_control_command", {
      scope: "battle",
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });

    const select = handleToolCall(host, "execute_control_command", {
      scope: "battle",
      type: "USE_LEGENDARY_ACTION",
      monsterId: "aboleth-1",
      abilityId: "lash",
    });

    expect("isError" in select).toBe(false);
    expect(readPayload(select).state.monsterControl["aboleth-1"]).toMatchObject(
      {
        legendaryActions: expect.arrayContaining([
          expect.objectContaining({ id: "lash", selected: true }),
        ]),
      },
    );

    const available = readPayload(
      handleToolCall(host, "get_available_actions", {}),
    );
    expect(available.free).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scope: "battle",
          actorId: "aboleth-1",
          type: "BATTLE_LEGENDARY_ATTACK",
          abilityId: "lash",
          targetId: { options: ["fighter"] },
        }),
      ]),
    );

    const attack = handleToolCall(host, "execute_action", {
      scope: "battle",
      actorId: "aboleth-1",
      type: "BATTLE_LEGENDARY_ATTACK",
      abilityId: "lash",
      targetId: "fighter",
      knockOut: false,
      runtime: {
        runtime: "battleAttack",
        values: {
          attackRoll: 15,
          targetAc: 18,
          weaponDamage: 12,
          attackerWithin5ft: true,
          hostileWithin5ft: false,
          targetCanSeeAttacker: true,
          attackerCanSeeTarget: true,
          frightSourceInLOS: false,
          hasAllyAdjacentToTarget: false,
          hitReactionCandidates: [],
        },
      },
    });

    expect("isError" in attack).toBe(false);
    expect(readPayload(attack).state.monsterControl["aboleth-1"]).toMatchObject(
      {
        legendaryActions: expect.arrayContaining([
          expect.objectContaining({
            id: "lash",
            remainingUses: 2,
            selected: false,
          }),
        ]),
      },
    );
  });

  test("battle monster control commands accept named non-attack, recharge, and daily selection without spending resources", () => {
    const host = createBattleHost();

    handleToolCall(host, "execute_control_command", {
      scope: "battle",
      type: "BATTLE_INIT",
      creatures: [
        {
          id: "aboleth-1",
          kind: "Monster",
          statBlockId: "aboleth",
          initiativeRoll: 20,
        },
        { id: "fighter", maxHp: 44, kind: "PC", initiativeRoll: 15 },
        {
          id: "centaur-1",
          kind: "Monster",
          statBlockId: "centaurTrooper",
          initiativeRoll: 10,
        },
      ],
    });

    handleToolCall(host, "execute_control_command", {
      scope: "battle",
      type: "BATTLE_START_TURN",
      ...ZERO_BATTLE_SOT,
      rechargeD6: 5,
    });
    const daily = handleToolCall(host, "execute_control_command", {
      scope: "battle",
      type: "USE_DAILY_ABILITY",
      monsterId: "aboleth-1",
      abilityId: "dominateMind",
    });
    expect("isError" in daily).toBe(false);
    expect(readPayload(daily).state.monsterControl["aboleth-1"]).toMatchObject({
      dailyAbilities: [
        {
          id: "dominateMind",
          name: "Dominate Mind",
          remainingUses: 2,
          selected: true,
        },
      ],
    });

    handleToolCall(host, "execute_control_command", {
      scope: "battle",
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    handleToolCall(host, "execute_control_command", {
      scope: "battle",
      type: "BATTLE_START_TURN",
      ...ZERO_BATTLE_SOT,
      rechargeD6: 5,
    });
    handleToolCall(host, "execute_control_command", {
      scope: "battle",
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    const nonAttackLegendary = handleToolCall(host, "execute_control_command", {
      scope: "battle",
      type: "USE_LEGENDARY_ACTION",
      monsterId: "aboleth-1",
      abilityId: "psychicDrain",
    });
    expect("isError" in nonAttackLegendary).toBe(false);
    expect(
      readPayload(nonAttackLegendary).state.monsterControl["aboleth-1"],
    ).toMatchObject({
      legendaryActions: expect.arrayContaining([
        expect.objectContaining({ id: "psychicDrain", selected: true }),
      ]),
    });

    handleToolCall(host, "execute_control_command", {
      scope: "battle",
      type: "BATTLE_LEGENDARY_PASS",
    });
    handleToolCall(host, "execute_control_command", {
      scope: "battle",
      type: "BATTLE_START_TURN",
      ...ZERO_BATTLE_SOT,
      rechargeD6: 5,
    });
    const recharge = handleToolCall(host, "execute_control_command", {
      scope: "battle",
      type: "USE_RECHARGE_ABILITY",
      monsterId: "centaur-1",
      abilityId: "tramplingCharge",
    });
    expect("isError" in recharge).toBe(false);
    expect(
      readPayload(recharge).state.monsterControl["centaur-1"],
    ).toMatchObject({
      rechargeAbilities: [
        {
          id: "tramplingCharge",
          name: "Trampling Charge",
          available: true,
          selected: true,
        },
      ],
    });
  });

  test("battle turn control commands require explicit runtime facts", () => {
    const host = createBattleHost();

    const response = handleToolCall(host, "execute_control_command", {
      scope: "battle",
      type: "BATTLE_START_TURN",
    });

    expect("isError" in response && response.isError).toBe(true);
    expect(readPayload(response).error).toBe(
      "Invalid execute_control_command input",
    );
  });

  test("get_available_actions only returns the supported executable action set", () => {
    const host = createDemoHost();

    const payload = readPayload(
      handleToolCall(host, "get_available_actions", {}),
    );

    expect(payload).toEqual({
      action: [],
      bonusAction: [],
      reaction: [],
      free: [
        {
          scope: "creature",
          type: "ENTER_COMBAT",
          cost: cost(),
          outcome: {
            summary: "Enter combat (begin tracking turns and action economy)",
          },
        },
      ],
    });
  });

  test("execute_action round-trip works for enter combat, start turn, and second wind", () => {
    const host = createDemoHost();

    const enterCombat = handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "ENTER_COMBAT" }),
    );
    expect("isError" in enterCombat).toBe(false);
    expect(readPayload(enterCombat).success).toBe(true);

    const startTurn = handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "START_TURN" }),
    );
    expect("isError" in startTurn).toBe(false);
    expect(readPayload(startTurn).success).toBe(true);

    const available = readPayload(
      handleToolCall(host, "get_available_actions", {}),
    );
    expect(
      available.bonusAction.map(
        (token: { readonly type: string }) => token.type,
      ),
    ).toEqual(["USE_SECOND_WIND"]);
    expect(
      available.free.map((token: { readonly type: string }) => token.type),
    ).toEqual(["USE_ACTION_SURGE", "EXIT_COMBAT"]);

    const secondWind = handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "USE_SECOND_WIND" }),
    );
    expect("isError" in secondWind).toBe(false);
    const secondWindPayload = readPayload(secondWind);
    expect(secondWindPayload.success).toBe(true);
    expect(secondWindPayload.state.hp).toBeGreaterThan(34);
    expect(secondWindPayload.state.hp).toBeLessThanOrEqual(44);
  });

  test("execute_action rejects actions that are not available in the current state", () => {
    const host = createDemoHost();

    const response = handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "START_TURN" }),
    );

    expect("isError" in response && response.isError).toBe(true);
    expect(readPayload(response)).toEqual({
      error: "START_TURN is not currently available in this state.",
      details: "ACTION_NOT_AVAILABLE",
    });
  });

  test("execute_action returns compact error for unknown action type", () => {
    const response = handleToolCall(createDemoHost(), "execute_action", {
      type: "TOTALLY_FAKE_ACTION",
    });

    expect("isError" in response && response.isError).toBe(true);
    expect(readPayload(response)).toEqual({
      error: "Unknown execute_action type: TOTALLY_FAKE_ACTION",
      details: {
        code: "UNKNOWN_ACTION_TYPE",
        type: "TOTALLY_FAKE_ACTION",
      },
    });
  });

  test("execute_action returns compact error for missing action type", () => {
    const response = handleToolCall(createDemoHost(), "execute_action", {});

    expect("isError" in response && response.isError).toBe(true);
    expect(readPayload(response)).toEqual({
      error: "Unknown execute_action type: (missing)",
      details: {
        code: "UNKNOWN_ACTION_TYPE",
        type: null,
      },
    });
  });

  test("execute_action keeps schema validation for malformed known action payloads", () => {
    const response = handleToolCall(createDemoHost(), "execute_action", {
      type: "SHORT_REST",
    });

    expect("isError" in response && response.isError).toBe(true);
    const payload = readPayload(response);
    expect(payload.error).toBe("Invalid execute_action input");
    expect(String(payload.details)).toContain("spendHitDice");
  });

  test("execute_action keeps scope mismatch behavior for known battle action types", () => {
    const response = handleToolCall(createDemoHost(), "execute_action", {
      scope: "battle",
      type: "BATTLE_DASH",
      actorId: "fighter",
    });

    expect("isError" in response && response.isError).toBe(true);
    expect(readPayload(response)).toEqual({
      error: "Action scope battle does not match the current creature host.",
      details: "ACTION_SCOPE_MISMATCH",
    });
  });

  test("preview_action returns compact error for unknown action type", () => {
    const response = handleToolCall(createDemoHost(), "preview_action", {
      type: "TOTALLY_FAKE_ACTION",
    });

    expect("isError" in response && response.isError).toBe(true);
    expect(readPayload(response)).toEqual({
      error: "Unknown preview_action type: TOTALLY_FAKE_ACTION",
      details: {
        code: "UNKNOWN_ACTION_TYPE",
        type: "TOTALLY_FAKE_ACTION",
      },
    });
  });

  test("preview_action returns compact error for missing action type", () => {
    const response = handleToolCall(createDemoHost(), "preview_action", {});

    expect("isError" in response && response.isError).toBe(true);
    expect(readPayload(response)).toEqual({
      error: "Unknown preview_action type: (missing)",
      details: {
        code: "UNKNOWN_ACTION_TYPE",
        type: null,
      },
    });
  });

  test("preview_action keeps schema validation for malformed known action payloads", () => {
    const response = handleToolCall(createDemoHost(), "preview_action", {
      type: "SHORT_REST",
    });

    expect("isError" in response && response.isError).toBe(true);
    const payload = readPayload(response);
    expect(payload.error).toBe("Invalid preview_action input");
    expect(String(payload.details)).toContain("spendHitDice");
  });

  test("preview_action summarizes a creature action without mutating state", () => {
    const host = createDemoHost();
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "ENTER_COMBAT" }),
    );
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "START_TURN" }),
    );

    const before = readPayload(handleToolCall(host, "get_state", {}));
    const preview = readPayload(
      handleToolCall(
        host,
        "preview_action",
        creatureResolved({ type: "USE_SECOND_WIND" }),
      ),
    );
    const after = readPayload(handleToolCall(host, "get_state", {}));

    expect(preview).toEqual({
      ok: true,
      summary: "Heal 1d10 + 5 HP",
      cost: cost(quota("bonusAction"), pool("secondWind")),
      runtime: "secondWind",
    });
    expect(after).toEqual(before);
  });

  test("get_state returns the core-encoded context shape", () => {
    const host = createDemoHost({
      maxHp: 30,
      sorcererLevel: classLevel(5),
      knownMetamagicOptions: ["subtle", "careful"],
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    });

    const payload = readPayload(handleToolCall(host, "get_state", {}));

    expect(payload.concentrationSpellId).toBeNull();
    expect(payload.classStates.sorcerer.knownMetamagicOptions).toEqual([
      "careful",
      "subtle",
    ]);
    expect(payload.incapacitatedSources).toEqual([]);
  });

  test("execute_action supports SHORT_REST with runtime-rolled hit dice", () => {
    const host = createDemoHost({
      maxHp: 24,
      conMod: abilityModifier(2),
      fighterLevel: classLevel(5),
      hitDiceRemaining: {
        barbarian: 0,
        bard: 0,
        cleric: 0,
        druid: 0,
        fighter: 2,
        monk: 0,
        paladin: 0,
        ranger: 0,
        rogue: 0,
        sorcerer: 0,
        warlock: 0,
        wizard: 0,
      },
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    });

    const available = readPayload(
      handleToolCall(host, "get_available_actions", {}),
    );
    expect(available.free).toContainEqual(
      creatureToken({
        type: "SHORT_REST",
        availableHitDice: [{ className: "fighter", remaining: 2, dieSize: 10 }],
        cost: cost(),
        outcome: {
          summary:
            "Finish a short rest, spend hit dice in the chosen order, and recharge short-rest features",
        },
      }),
    );

    const response = handleToolCall(
      host,
      "execute_action",
      creatureResolved({
        type: "SHORT_REST",
        spendHitDice: ["fighter", "fighter"],
      }),
    );
    expect("isError" in response).toBe(false);
    const payload = readPayload(response);
    expect(payload.success).toBe(true);
    expect(payload.state.hitDiceRemaining.fighter).toBe(0);
    expect(payload.state.hp).toBeGreaterThan(14);
    expect(payload.state.hp).toBeLessThanOrEqual(24);
  });

  test("execute_action supports USE_HEROIC_INSPIRATION when the fighter has it", () => {
    const host = createDemoHost({
      maxHp: 44,
      fighterLevel: classLevel(10),
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    });
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "ENTER_COMBAT" }),
    );
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "START_TURN" }),
    );

    const available = readPayload(
      handleToolCall(host, "get_available_actions", {}),
    );
    expect(available.free).toContainEqual(
      creatureToken({
        type: "USE_HEROIC_INSPIRATION",
        cost: cost(),
        outcome: {
          summary:
            "Spend Heroic Inspiration to reroll a die and use the new roll",
        },
      }),
    );

    const response = handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "USE_HEROIC_INSPIRATION" }),
    );
    expect("isError" in response).toBe(false);
    const payload = readPayload(response);
    expect(payload.success).toBe(true);
    expect(payload.state.classStates.fighter.heroicInspiration).toBe(false);
  });

  test("execute_action supports CAST_PREPARED_SPELL with spell and slot choice holes", () => {
    const host = createDemoHost({
      maxHp: 32,
      clericLevel: classLevel(5),
      preparedSpells: preparedSpellIds("bless", "healing_word"),
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    });
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "ENTER_COMBAT" }),
    );
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "START_TURN" }),
    );

    const available = readPayload(
      handleToolCall(host, "get_available_actions", {}),
    );
    expect(available.action).toContainEqual(
      creatureToken({
        type: "CAST_PREPARED_SPELL",
        spellName: "bless",
        slotLevel: { options: [1, 2, 3] },
        cost: cost(quota("action"), pool("spellSlot")),
        outcome: {
          summary:
            "Cast Bless with a spell slot of the chosen level and begin concentrating on it",
        },
      }),
    );
    expect(available.bonusAction).toContainEqual(
      creatureToken({
        type: "CAST_PREPARED_SPELL",
        spellName: "healing_word",
        slotLevel: { options: [1, 2, 3] },
        cost: cost(quota("bonusAction"), pool("spellSlot")),
        outcome: {
          summary: "Cast Healing Word with a spell slot of the chosen level",
        },
      }),
    );

    const illegal = handleToolCall(
      host,
      "execute_action",
      creatureResolved({
        type: "CAST_PREPARED_SPELL",
        spellName: "bless",
        slotLevel: 4,
      }),
    );
    expect("isError" in illegal && illegal.isError).toBe(true);
    expect(readPayload(illegal)).toEqual({
      error:
        "Bless with a level 4 slot is not currently available in this state.",
      details: "ACTION_NOT_AVAILABLE",
    });

    const response = handleToolCall(
      host,
      "execute_action",
      creatureResolved({
        type: "CAST_PREPARED_SPELL",
        spellName: "bless",
        slotLevel: 2,
      }),
    );
    expect("isError" in response).toBe(false);
    const payload = readPayload(response);
    expect(payload.success).toBe(true);
    expect(payload.state.slotsCurrent).toEqual([4, 2, 2, 0, 0, 0, 0, 0, 0]);
    expect(payload.state.slotExpendedThisTurn).toBe(true);
    expect(payload.state.concentrationSpellId).toBe("bless");
  });

  test("execute_action supports USE_TACTICAL_MIND once the pending trigger exists", () => {
    const host = createDemoHost({
      maxHp: 24,
      fighterLevel: classLevel(2),
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    });
    host.actor.send({ type: "TRIGGER_TACTICAL_MIND" });

    const available = readPayload(
      handleToolCall(host, "get_available_actions", {}),
    );
    expect(available.free).toContainEqual(
      creatureToken({
        type: "USE_TACTICAL_MIND",
        cost: cost(pool("secondWind")),
        outcome: {
          summary:
            "Add 1d10 to the failed ability check; expend Second Wind only if the check now succeeds",
        },
      }),
    );

    const response = handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "USE_TACTICAL_MIND" }),
    );
    expect("isError" in response).toBe(false);
    const payload = readPayload(response);
    expect(payload.success).toBe(true);
    expect(payload.state.pendingResolution).toBeNull();
  });

  test("execute_action supports USE_INDOMITABLE once the pending trigger exists", () => {
    const host = createDemoHost({
      maxHp: 24,
      fighterLevel: classLevel(9),
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    });
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "ENTER_COMBAT" }),
    );
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "START_TURN" }),
    );
    host.actor.send({ type: "TRIGGER_INDOMITABLE" });

    const available = readPayload(
      handleToolCall(host, "get_available_actions", {}),
    );
    expect(available.free).toContainEqual({
      scope: "creature",
      type: "USE_INDOMITABLE",
      cost: cost(pool("indomitable")),
      outcome: {
        summary:
          "Expend one Indomitable use to reroll the failed saving throw and add your Fighter level",
      },
    });

    const response = handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "USE_INDOMITABLE" }),
    );
    expect("isError" in response).toBe(false);
    const payload = readPayload(response);
    expect(payload.success).toBe(true);
    expect(payload.state.classStates.fighter.indomitableCharges).toBe(0);
    expect(payload.state.pendingResolution).toBeNull();
  });

  test("execute_action supports USE_METAMAGIC with filtered legal options", () => {
    const host = createDemoHost({
      maxHp: 30,
      sorcererLevel: classLevel(5),
      knownMetamagicOptions: ["careful", "subtle"],
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    });
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "ENTER_COMBAT" }),
    );
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "START_TURN" }),
    );

    const available = readPayload(
      handleToolCall(host, "get_available_actions", {}),
    );
    expect(available.free).toContainEqual(
      creatureToken({
        type: "USE_METAMAGIC",
        option: { options: ["careful", "subtle"] },
        cost: cost(pool("sorceryPoints")),
        outcome: {
          summary:
            "Apply a currently legal known Metamagic option to the spell you are casting",
        },
      }),
    );

    const illegalBeforeUse = handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "USE_METAMAGIC", option: "quickened" }),
    );
    expect("isError" in illegalBeforeUse && illegalBeforeUse.isError).toBe(
      true,
    );
    expect(readPayload(illegalBeforeUse)).toEqual({
      error: "quickened Metamagic is not currently available in this state.",
      details: "ACTION_NOT_AVAILABLE",
    });

    const response = handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "USE_METAMAGIC", option: "careful" }),
    );
    expect("isError" in response).toBe(false);
    const payload = readPayload(response);
    expect(payload.success).toBe(true);
    expect(payload.state.classStates.sorcerer.sorceryPoints).toBe(4);
    expect(payload.state.classStates.sorcerer.metamagicUsedThisCast).toEqual([
      "careful",
    ]);
    expect(
      readPayload(handleToolCall(host, "get_available_actions", {})).free.map(
        (token: { readonly type: string }) => token.type,
      ),
    ).not.toContain("USE_METAMAGIC");
  });

  test("execute_action supports Warlock and Sorcerer creature suggested actions", () => {
    const warlockHost = createDemoHost({
      maxHp: 28,
      warlockLevel: classLevel(13),
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    });
    handleToolCall(
      warlockHost,
      "execute_action",
      creatureResolved({ type: "ENTER_COMBAT" }),
    );
    handleToolCall(
      warlockHost,
      "execute_action",
      creatureResolved({ type: "START_TURN" }),
    );
    warlockHost.actor.send({ type: "USE_ELDRITCH_SMITE" });
    expect(warlockHost.actor.getSnapshot().context.pactSlotsCurrent).toBe(2);

    const warlockAvailable = readPayload(
      handleToolCall(warlockHost, "get_available_actions", {}),
    );
    expect(warlockAvailable.free).toContainEqual(
      creatureToken({
        type: "USE_MAGICAL_CUNNING",
        cost: cost(pool("magicalCunning")),
        outcome: {
          summary:
            "Regain expended Pact Magic spell slots (up to half your max, rounded up); once per Long Rest",
        },
      }),
    );

    const magicalCunning = handleToolCall(
      warlockHost,
      "execute_action",
      creatureResolved({ type: "USE_MAGICAL_CUNNING" }),
    );
    expect("isError" in magicalCunning).toBe(false);
    const magicalCunningPayload = readPayload(magicalCunning);
    expect(magicalCunningPayload.success).toBe(true);
    expect(
      magicalCunningPayload.state.classStates.warlock.magicalCunningUsed,
    ).toBe(true);
    expect(magicalCunningPayload.state.pactSlotsCurrent).toBe(3);

    const fullRecoveryHost = createDemoHost({
      maxHp: 28,
      warlockLevel: classLevel(20),
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    });
    fullRecoveryHost.actor.send({ type: "ENTER_COMBAT" });
    fullRecoveryHost.actor.send({ type: "START_TURN" });
    fullRecoveryHost.actor.send({ type: "EXPEND_PACT_SLOT" });
    fullRecoveryHost.actor.send({ type: "EXPEND_PACT_SLOT" });
    expect(fullRecoveryHost.actor.getSnapshot().context.pactSlotsCurrent).toBe(
      2,
    );

    const fullRecoveryAvailable = readPayload(
      handleToolCall(fullRecoveryHost, "get_available_actions", {}),
    );
    expect(fullRecoveryAvailable.free).toContainEqual(
      creatureToken({
        type: "USE_MAGICAL_CUNNING",
        cost: cost(pool("magicalCunning")),
        outcome: {
          summary:
            "Regain expended Pact Magic spell slots (up to half your max, rounded up); once per Long Rest",
        },
      }),
    );

    const fullRecovery = handleToolCall(
      fullRecoveryHost,
      "execute_action",
      creatureResolved({ type: "USE_MAGICAL_CUNNING" }),
    );
    expect("isError" in fullRecovery).toBe(false);
    const fullRecoveryPayload = readPayload(fullRecovery);
    expect(fullRecoveryPayload.success).toBe(true);
    expect(fullRecoveryPayload.state.pactSlotsCurrent).toBe(4);

    const sorcererHost = createDemoHost({
      maxHp: 30,
      sorcererLevel: classLevel(5),
      knownMetamagicOptions: ["careful", "subtle"],
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    });
    handleToolCall(
      sorcererHost,
      "execute_action",
      creatureResolved({ type: "ENTER_COMBAT" }),
    );
    handleToolCall(
      sorcererHost,
      "execute_action",
      creatureResolved({ type: "START_TURN" }),
    );

    const sorcererAvailable = readPayload(
      handleToolCall(sorcererHost, "get_available_actions", {}),
    );
    expect(sorcererAvailable.bonusAction).toContainEqual(
      creatureToken({
        type: "USE_INNATE_SORCERY",
        cost: cost(quota("bonusAction"), pool("innateSorcery")),
        outcome: {
          summary: "Use a bonus action to activate Innate Sorcery for 1 minute",
        },
      }),
    );

    const innateSorcery = handleToolCall(
      sorcererHost,
      "execute_action",
      creatureResolved({ type: "USE_INNATE_SORCERY" }),
    );
    expect("isError" in innateSorcery).toBe(false);
    const innateSorceryPayload = readPayload(innateSorcery);
    expect(innateSorceryPayload.success).toBe(true);
    expect(
      innateSorceryPayload.state.classStates.sorcerer.innateSorceryActive,
    ).toBe(true);
    expect(
      innateSorceryPayload.state.classStates.sorcerer.innateSorceryCharges,
    ).toBe(1);
    expect(innateSorceryPayload.state.bonusActionUsed).toBe(true);
  });

  test("execute_action supports druid Wild Shape enter/exit and Wild Resurgence slot recovery", () => {
    const fullSlotHost = createDemoHost({
      maxHp: 28,
      druidLevel: classLevel(5),
      slotsMax: [4, 3, 2, 0, 0, 0, 0, 0, 0],
      slotsCurrent: [4, 3, 2, 0, 0, 0, 0, 0, 0],
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    });
    handleToolCall(
      fullSlotHost,
      "execute_action",
      creatureResolved({ type: "ENTER_COMBAT" }),
    );
    handleToolCall(
      fullSlotHost,
      "execute_action",
      creatureResolved({ type: "START_TURN" }),
    );
    const fullSlotAvailable = readPayload(
      handleToolCall(fullSlotHost, "get_available_actions", {}),
    );
    expect(
      fullSlotAvailable.free.map(
        (action: { readonly type: string }) => action.type,
      ),
    ).not.toContain("USE_WILD_RESURGENCE_SLOT");
    const fullSlotResurgence = handleToolCall(
      fullSlotHost,
      "execute_action",
      creatureResolved({ type: "USE_WILD_RESURGENCE_SLOT" }),
    );
    expect("isError" in fullSlotResurgence && fullSlotResurgence.isError).toBe(
      true,
    );
    expect(readPayload(fullSlotResurgence)).toEqual({
      error:
        "USE_WILD_RESURGENCE_SLOT is not currently available in this state.",
      details: "ACTION_NOT_AVAILABLE",
    });

    const host = createDemoHost({
      maxHp: 28,
      druidLevel: classLevel(5),
      slotsMax: [4, 3, 2, 0, 0, 0, 0, 0, 0],
      slotsCurrent: [3, 3, 2, 0, 0, 0, 0, 0, 0],
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    });
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "ENTER_COMBAT" }),
    );
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "START_TURN" }),
    );

    const available = readPayload(
      handleToolCall(host, "get_available_actions", {}),
    );
    expect(available.bonusAction).toContainEqual(
      creatureToken({
        type: "ENTER_WILD_SHAPE",
        cost: cost(quota("bonusAction"), pool("wildShape")),
        outcome: {
          summary: "Shape-shift into a beast form, gaining 5 temporary HP",
        },
      }),
    );
    expect(available.free).toContainEqual(
      creatureToken({
        type: "USE_WILD_RESURGENCE_SLOT",
        cost: cost(pool("wildShape")),
        outcome: {
          summary:
            "Expend one Wild Shape use to regain a level 1 spell slot; once per Long Rest",
        },
      }),
    );

    const resurgence = handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "USE_WILD_RESURGENCE_SLOT" }),
    );
    expect("isError" in resurgence).toBe(false);
    const resurgencePayload = readPayload(resurgence);
    expect(resurgencePayload.success).toBe(true);
    expect(resurgencePayload.state.slotsCurrent[0]).toBe(4);
    expect(resurgencePayload.state.classStates.druid.wildShapeCharges).toBe(1);
    expect(
      resurgencePayload.state.classStates.druid.wildResurgenceSlotUsedThisLR,
    ).toBe(true);

    const enterWS = handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "ENTER_WILD_SHAPE" }),
    );
    expect("isError" in enterWS).toBe(false);
    const enterWSPayload = readPayload(enterWS);
    expect(enterWSPayload.success).toBe(true);
    expect(enterWSPayload.state.classStates.druid.inWildShape).toBe(true);
    expect(enterWSPayload.state.bonusActionUsed).toBe(true);
    expect(enterWSPayload.state.tempHp).toBe(5);

    host.actor.send({ type: "END_TURN" });
    host.actor.send({ type: "START_TURN" });

    const afterEnter = readPayload(
      handleToolCall(host, "get_available_actions", {}),
    );
    expect(afterEnter.bonusAction).toContainEqual(
      creatureToken({
        type: "EXIT_WILD_SHAPE",
        cost: cost(quota("bonusAction")),
        outcome: {
          summary: "Revert from beast form to your normal form",
        },
      }),
    );

    const exitWS = handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "EXIT_WILD_SHAPE" }),
    );
    expect("isError" in exitWS).toBe(false);
    const exitWSPayload = readPayload(exitWS);
    expect(exitWSPayload.success).toBe(true);
    expect(exitWSPayload.state.classStates.druid.inWildShape).toBe(false);
    expect(exitWSPayload.state.bonusActionUsed).toBe(true);
  });

  test("execute_action supports a dice-roll runtime action with USE_TIRELESS", () => {
    const host = createDemoHost({
      maxHp: 32,
      rangerLevel: classLevel(10),
      wisMod: abilityModifier(3),
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    });
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "ENTER_COMBAT" }),
    );
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "START_TURN" }),
    );

    const available = readPayload(
      handleToolCall(host, "get_available_actions", {}),
    );
    expect(available.action).toContainEqual(
      creatureToken({
        type: "USE_TIRELESS",
        cost: cost(quota("action"), pool("tireless")),
        outcome: { summary: "Gain 1d8 + 3 temporary HP (minimum 1)" },
      }),
    );

    const response = handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "USE_TIRELESS" }),
    );
    expect("isError" in response).toBe(false);
    const payload = readPayload(response);
    expect(payload.success).toBe(true);
    expect(payload.state.tempHp).toBeGreaterThanOrEqual(2);
    expect(payload.state.tempHp).toBeLessThanOrEqual(11);
    expect(payload.state.actionsRemaining).toBe(0);
  });

  test("execute_action supports a hole pass-through action with USE_ARCANE_RECOVERY", () => {
    const host = createDemoHost({
      maxHp: 24,
      wizardLevel: classLevel(4),
      slotsMax: [4, 3, 0, 0, 0, 0, 0, 0, 0],
      slotsCurrent: [4, 2, 0, 0, 0, 0, 0, 0, 0],
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    });
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "ENTER_COMBAT" }),
    );
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "START_TURN" }),
    );

    const available = readPayload(
      handleToolCall(host, "get_available_actions", {}),
    );
    expect(available.free).toContainEqual(
      creatureToken({
        type: "USE_ARCANE_RECOVERY",
        slotLevel: { options: [2] },
        cost: cost(pool("arcaneRecovery")),
        outcome: {
          summary:
            "Recover one expended spell slot of the chosen level and use Arcane Recovery",
        },
      }),
    );

    const illegal = handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "USE_ARCANE_RECOVERY", slotLevel: 1 }),
    );
    expect("isError" in illegal && illegal.isError).toBe(true);
    expect(readPayload(illegal)).toEqual({
      error:
        "Arcane Recovery for a level 1 slot is not currently available in this state.",
      details: "ACTION_NOT_AVAILABLE",
    });

    const response = handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "USE_ARCANE_RECOVERY", slotLevel: 2 }),
    );
    expect("isError" in response).toBe(false);
    const payload = readPayload(response);
    expect(payload.success).toBe(true);
    expect(payload.state.slotsCurrent).toEqual([4, 3, 0, 0, 0, 0, 0, 0, 0]);
    expect(payload.state.classStates.wizard.arcaneRecoveryUsed).toBe(true);
  });

  test("execute_action supports USE_OVERCHANNEL once the qualifying cast trigger exists", () => {
    const host = createDemoHost({
      maxHp: 36,
      wizardLevel: classLevel(14),
      preparedSpells: preparedSpellIds(
        "burning_hands",
        "fireball",
        "hold_person",
      ),
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    });
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "ENTER_COMBAT" }),
    );
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "START_TURN" }),
    );
    host.actor.send({
      type: "TRIGGER_OVERCHANNEL",
      spellName: "fireball",
      slotLevel: spellSlotLevel(3),
    });

    const available = readPayload(
      handleToolCall(host, "get_available_actions", {}),
    );
    expect(available.free).toContainEqual({
      scope: "creature",
      type: "USE_OVERCHANNEL",
      cost: cost(),
      outcome: {
        summary:
          "Overchannel the qualifying Fireball cast at slot level 3 for maximum damage",
      },
    });

    const response = handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "USE_OVERCHANNEL" }),
    );
    expect("isError" in response).toBe(false);
    const payload = readPayload(response);
    expect(payload.success).toBe(true);
    expect(payload.state.classStates.wizard.overchannelUsesThisLR).toBe(1);
    expect(payload.state.pendingResolution).toBeNull();
  });

  test("execute_action rejects raw TRIGGER_OVERCHANNEL as a public MCP command", () => {
    const host = createDemoHost({
      maxHp: 36,
      wizardLevel: classLevel(14),
      preparedSpells: preparedSpellIds("fireball"),
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    });
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "ENTER_COMBAT" }),
    );
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "START_TURN" }),
    );

    const response = handleToolCall(
      host,
      "execute_action",
      creatureResolved({
        type: "TRIGGER_OVERCHANNEL",
        spellName: "fireball",
        slotLevel: 3,
      }),
    );
    expect("isError" in response && response.isError).toBe(true);
    expect(host.actor.getSnapshot().context.pendingResolution).toBeNull();
  });

  test("execute_action supports USE_PEERLESS_SKILL once the pending trigger exists", () => {
    const host = createDemoHost({
      maxHp: 38,
      bardLevel: classLevel(14),
      chaMod: abilityModifier(5),
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    });
    host.actor.send({ type: "TRIGGER_PEERLESS_SKILL_ATTACK_ROLL" });

    const available = readPayload(
      handleToolCall(host, "get_available_actions", {}),
    );
    expect(available.free).toContainEqual(
      creatureToken({
        type: "USE_PEERLESS_SKILL",
        cost: cost(pool("bardicInspiration")),
        outcome: {
          summary:
            "Add your Bardic Inspiration die to the failed attack roll; expend it only if the roll now succeeds",
        },
      }),
    );

    const response = handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "USE_PEERLESS_SKILL" }),
    );
    expect("isError" in response).toBe(false);
    const payload = readPayload(response);
    expect(payload.success).toBe(true);
    expect(payload.state.pendingResolution).toBeNull();
  });

  test("execute_action supports USE_RELENTLESS_RAGE after a real drop-to-zero trigger", () => {
    const host = createDemoHost({
      maxHp: 40,
      barbarianLevel: classLevel(11),
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    });
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "ENTER_COMBAT" }),
    );
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "START_TURN" }),
    );
    host.actor.send({ type: "ENTER_RAGE" });
    host.actor.send({
      type: "TAKE_DAMAGE",
      amount: 40,
      damageType: "slashing",
      resistances: new Set(),
      vulnerabilities: new Set(),
      immunities: new Set(),
      isCritical: false,
    });

    const available = readPayload(
      handleToolCall(host, "get_available_actions", {}),
    );
    expect(available.free).toContainEqual(
      creatureToken({
        type: "USE_RELENTLESS_RAGE",
        cost: cost(),
        outcome: {
          summary:
            "Make a DC 10 Constitution save to stay at 22 HP instead of dropping to 0",
        },
      }),
    );

    const response = handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "USE_RELENTLESS_RAGE" }),
    );
    expect("isError" in response).toBe(false);
    const payload = readPayload(response);
    expect(payload.success).toBe(true);
    expect(payload.state.classStates.barbarian.relentlessRageTimesUsed).toBe(1);
    expect(payload.state.pendingResolution).toBeNull();
  });

  test("execute_action supports USE_SNEAK_ATTACK once the qualifying hit trigger exists", () => {
    const host = createDemoHost({
      maxHp: 32,
      rogueLevel: classLevel(5),
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    });
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "ENTER_COMBAT" }),
    );
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "START_TURN" }),
    );
    host.actor.send({
      type: "TRIGGER_SNEAK_ATTACK",
      mode: "finesse",
      source: "adjacentAlly",
    });

    const available = readPayload(
      handleToolCall(host, "get_available_actions", {}),
    );
    expect(available.free).toContainEqual({
      scope: "creature",
      type: "USE_SNEAK_ATTACK",
      cost: cost(),
      outcome: { summary: "Apply Sneak Attack damage to the qualifying hit" },
    });

    const response = handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "USE_SNEAK_ATTACK" }),
    );
    expect("isError" in response).toBe(false);
    const payload = readPayload(response);
    expect(payload.success).toBe(true);
    expect(payload.state.classStates.rogue.sneakAttackUsedThisTurn).toBe(true);
    expect(payload.state.pendingResolution).toBeNull();
  });

  test("execute_action supports representative phase 4A semantic actions", () => {
    const host = createDemoHost({
      maxHp: 52,
      fighterLevel: classLevel(2),
      barbarianLevel: classLevel(2),
      monkLevel: classLevel(2),
      rogueLevel: classLevel(3),
      clericLevel: classLevel(2),
      paladinLevel: classLevel(3),
      bardLevel: classLevel(1),
      rangerLevel: classLevel(14),
      chaMod: abilityModifier(3),
      wisMod: abilityModifier(3),
      preparedSpells: new Set(),
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    });
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "ENTER_COMBAT" }),
    );
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "START_TURN" }),
    );

    const available = readPayload(
      handleToolCall(host, "get_available_actions", {}),
    );
    expect(available.free).toContainEqual(
      creatureToken({
        type: "USE_ACTION_SURGE",
        cost: cost(pool("actionSurge")),
        outcome: {
          summary:
            "Expend one Action Surge use to gain one additional action this turn",
        },
      }),
    );
    expect(available.bonusAction).toContainEqual(
      creatureToken({
        type: "FLURRY_OF_BLOWS",
        cost: cost(quota("bonusAction"), pool("focusPoint")),
        outcome: {
          summary:
            "Spend 1 Focus Point to make 2 unarmed strikes as a bonus action",
        },
      }),
    );
    expect(available.bonusAction).toContainEqual(
      creatureToken({
        type: "USE_BARDIC_INSPIRATION",
        cost: cost(quota("bonusAction"), pool("bardicInspiration")),
        outcome: {
          summary:
            "Expend one Bardic Inspiration use to inspire another creature",
        },
      }),
    );
    expect(
      available.free.map((token: { readonly type: string }) => token.type),
    ).not.toContain("USE_INDOMITABLE");
    expect(
      available.free.map((token: { readonly type: string }) => token.type),
    ).not.toContain("USE_OVERCHANNEL");

    const actionSurge = handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "USE_ACTION_SURGE" }),
    );
    expect("isError" in actionSurge).toBe(false);
    const actionSurgePayload = readPayload(actionSurge);
    expect(actionSurgePayload.success).toBe(true);
    expect(actionSurgePayload.state.actionsRemaining).toBe(2);
    expect(
      actionSurgePayload.state.classStates.fighter.actionSurgeCharges,
    ).toBe(0);

    const bardic = handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "USE_BARDIC_INSPIRATION" }),
    );
    expect("isError" in bardic).toBe(false);
    const bardicPayload = readPayload(bardic);
    expect(bardicPayload.success).toBe(true);
    expect(bardicPayload.state.classStates.bard.bardicInspirationCharges).toBe(
      2,
    );
    expect(bardicPayload.state.bonusActionUsed).toBe(true);
  });

  test("get_available_actions groups a representative multigroup state stably", () => {
    const host = createDemoHost({
      maxHp: 44,
      conMod: abilityModifier(2),
      fighterLevel: classLevel(10),
      rangerLevel: classLevel(10),
      sorcererLevel: classLevel(5),
      knownMetamagicOptions: ["careful", "subtle"],
      wizardLevel: classLevel(4),
      preparedSpells: new Set(),
      wisMod: abilityModifier(3),
      slotsMax: [4, 3, 0, 0, 0, 0, 0, 0, 0],
      slotsCurrent: [3, 2, 0, 0, 0, 0, 0, 0, 0],
      hitDiceRemaining: {
        barbarian: 0,
        bard: 0,
        cleric: 0,
        druid: 0,
        fighter: 2,
        monk: 0,
        paladin: 0,
        ranger: 0,
        rogue: 0,
        sorcerer: 0,
        warlock: 0,
        wizard: 0,
      },
      baseWalkSpeed: 30,
      effectiveSpeed: 30,
    });
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "ENTER_COMBAT" }),
    );
    handleToolCall(
      host,
      "execute_action",
      creatureResolved({ type: "START_TURN" }),
    );

    expect(readPayload(handleToolCall(host, "get_available_actions", {})))
      .toMatchInlineSnapshot(`
      {
        "action": [
          {
            "cost": [
              {
                "kind": "quota",
                "resource": "action",
              },
              {
                "kind": "pool",
                "resource": "tireless",
              },
            ],
            "outcome": {
              "summary": "Gain 1d8 + 3 temporary HP (minimum 1)",
            },
            "scope": "creature",
            "type": "USE_TIRELESS",
          },
        ],
        "bonusAction": [
          {
            "cost": [
              {
                "kind": "quota",
                "resource": "bonusAction",
              },
              {
                "kind": "pool",
                "resource": "sorceryPoints",
              },
            ],
            "outcome": {
              "summary": "Spend sorcery points to create a spell slot of the chosen level",
            },
            "scope": "creature",
            "slotLevel": {
              "options": [
                1,
                2,
              ],
            },
            "type": "CONVERT_POINTS_TO_SLOT",
          },
          {
            "cost": [
              {
                "kind": "quota",
                "resource": "bonusAction",
              },
              {
                "kind": "pool",
                "resource": "innateSorcery",
              },
            ],
            "outcome": {
              "summary": "Use a bonus action to activate Innate Sorcery for 1 minute",
            },
            "scope": "creature",
            "type": "USE_INNATE_SORCERY",
          },
          {
            "cost": [
              {
                "kind": "quota",
                "resource": "bonusAction",
              },
              {
                "kind": "pool",
                "resource": "secondWind",
              },
            ],
            "outcome": {
              "summary": "Heal 1d10 + 10 HP",
            },
            "scope": "creature",
            "type": "USE_SECOND_WIND",
          },
        ],
        "free": [
          {
            "cost": [
              {
                "kind": "pool",
                "resource": "actionSurge",
              },
            ],
            "outcome": {
              "summary": "Expend one Action Surge use to gain one additional action this turn",
            },
            "scope": "creature",
            "type": "USE_ACTION_SURGE",
          },
          {
            "cost": [
              {
                "kind": "pool",
                "resource": "arcaneRecovery",
              },
            ],
            "outcome": {
              "summary": "Recover one expended spell slot of the chosen level and use Arcane Recovery",
            },
            "scope": "creature",
            "slotLevel": {
              "options": [
                1,
                2,
              ],
            },
            "type": "USE_ARCANE_RECOVERY",
          },
          {
            "cost": [
              {
                "kind": "pool",
                "resource": "sorceryPoints",
              },
            ],
            "option": {
              "options": [
                "careful",
                "subtle",
              ],
            },
            "outcome": {
              "summary": "Apply a currently legal known Metamagic option to the spell you are casting",
            },
            "scope": "creature",
            "type": "USE_METAMAGIC",
          },
          {
            "cost": [],
            "outcome": {
              "summary": "Stop tracking this creature in combat and initiative order",
            },
            "scope": "creature",
            "type": "EXIT_COMBAT",
          },
        ],
        "reaction": [],
      }
    `);
  });

  test("battle hosts return a routed battle state summary and no discovered actions yet", () => {
    const host = createBattleHost();

    expect(readPayload(handleToolCall(host, "get_state", {}))).toEqual({
      scope: "battle",
      machineState: "idle",
      tags: [],
      round: 0,
      turnIndex: 0,
      activeCreatureId: null,
      initiative: [],
      creatureIds: [],
      phase: "activeTurn",
      awaitingReaction: false,
      resolvingAoE: false,
      resolvingMovement: false,
      awaitingLegendaryAction: false,
      awaitingReadiedAction: false,
    });

    expect(
      readPayload(handleToolCall(host, "get_available_actions", {})),
    ).toEqual({
      action: [],
      bonusAction: [],
      reaction: [],
      free: [],
    });
  });

  test("battle hosts surface live reaction tokens from the authoritative battle window", () => {
    const host = initBattleHostWithHitWindow();

    expect(
      readPayload(handleToolCall(host, "get_available_actions", {})),
    ).toEqual({
      action: [],
      bonusAction: [],
      reaction: [
        {
          scope: "battle",
          actorId: "B",
          type: "CAST_SHIELD",
          cost: cost(quota("reaction"), pool("spellSlot")),
          outcome: {
            summary:
              "Use your reaction to cast Shield against the triggering attack",
          },
        },
        {
          scope: "battle",
          actorId: "C",
          type: "USE_CUTTING_WORDS",
          cost: cost(quota("reaction"), pool("bardicInspiration")),
          outcome: {
            summary:
              "Use your reaction and expend Bardic Inspiration to reduce the triggering attack roll",
          },
        },
      ],
      free: [],
    });
  });

  test("battle hosts surface basic battle actions during an active turn", () => {
    const host = initBattleHostWithProneActor();

    expect(
      readPayload(handleToolCall(host, "get_available_actions", {})),
    ).toEqual({
      action: expect.arrayContaining([
        expect.objectContaining({ type: "BATTLE_DASH", actorId: "A" }),
        expect.objectContaining({ type: "BATTLE_DISENGAGE", actorId: "A" }),
        expect.objectContaining({ type: "BATTLE_DODGE", actorId: "A" }),
        expect.objectContaining({ type: "BATTLE_READY", actorId: "A" }),
      ]),
      bonusAction: [],
      reaction: [],
      free: [
        {
          scope: "battle",
          actorId: "A",
          type: "STAND_FROM_PRONE",
          cost: cost(movement(15)),
          outcome: {
            summary: "Spend half your Speed in movement to stand up from Prone",
          },
        },
      ],
    });
  });

  test("battle hosts surface and execute active-turn feature actions through MCP", () => {
    const host = initBattleHostWithFeatureActor();

    expect(
      readPayload(handleToolCall(host, "get_available_actions", {})),
    ).toEqual({
      action: expect.arrayContaining([
        expect.objectContaining({ type: "BATTLE_DASH", actorId: "A" }),
      ]),
      bonusAction: [
        {
          scope: "battle",
          actorId: "A",
          type: "BATTLE_ENTER_RAGE",
          cost: cost(quota("bonusAction"), pool("rage")),
          outcome: {
            summary:
              "Enter a Rage, consume your bonus action, and apply Rage's battle effects",
          },
        },
      ],
      reaction: [],
      free: expect.arrayContaining([
        {
          scope: "battle",
          actorId: "A",
          type: "BATTLE_ACTION_SURGE",
          cost: cost(pool("actionSurge")),
          outcome: {
            summary:
              "Expend one Action Surge use to gain one additional non-Magic action this turn",
          },
        },
        {
          scope: "battle",
          actorId: "A",
          type: "BATTLE_DECLARE_RECKLESS",
          cost: cost(),
          outcome: { summary: "Declare Reckless Attack for this turn" },
        },
      ]),
    });

    const actionSurge = handleToolCall(host, "execute_action", {
      scope: "battle",
      actorId: "A",
      type: "BATTLE_ACTION_SURGE",
    });
    expect("isError" in actionSurge).toBe(false);
    expect(readPayload(actionSurge)).toEqual(
      expect.objectContaining({
        success: true,
        outcome:
          "Expend one Action Surge use to gain one additional non-Magic action this turn",
      }),
    );
    expect(
      host.actor.getSnapshot().context.creatures.get(CreatureId("A"))
        ?.actionsRemaining,
    ).toBe(2);

    const rage = handleToolCall(host, "execute_action", {
      scope: "battle",
      actorId: "A",
      type: "BATTLE_ENTER_RAGE",
    });
    expect("isError" in rage).toBe(false);
    expect(readPayload(rage)).toEqual(
      expect.objectContaining({
        success: true,
        outcome:
          "Enter a Rage, consume your bonus action, and apply Rage's battle effects",
      }),
    );
    expect(
      host.actor.getSnapshot().context.creatures.get(CreatureId("A"))
        ?.ragingBlocksSpells,
    ).toBe(true);
    expect(
      host.actor.getSnapshot().context.creatures.get(CreatureId("A"))
        ?.rageCharges,
    ).toBe(1);

    const reckless = handleToolCall(host, "execute_action", {
      scope: "battle",
      actorId: "A",
      type: "BATTLE_DECLARE_RECKLESS",
    });
    expect("isError" in reckless).toBe(false);
    expect(readPayload(reckless)).toEqual(
      expect.objectContaining({
        success: true,
        outcome: "Declare Reckless Attack for this turn",
      }),
    );
    expect(
      host.actor.getSnapshot().context.creatures.get(CreatureId("A"))
        ?.recklessThisTurn,
    ).toBe(true);
  });

  test("preview_action summarizes a battle feature action without mutating state", () => {
    const host = initBattleHostWithFeatureActor();

    const before = readPayload(handleToolCall(host, "get_state", {}));
    const preview = readPayload(
      handleToolCall(host, "preview_action", {
        scope: "battle",
        actorId: "A",
        type: "BATTLE_ENTER_RAGE",
      }),
    );
    const after = readPayload(handleToolCall(host, "get_state", {}));

    expect(preview).toEqual({
      ok: true,
      summary:
        "Enter a Rage, consume your bonus action, and apply Rage's battle effects",
      cost: cost(quota("bonusAction"), pool("rage")),
      runtime: "none",
      eventType: "BATTLE_ENTER_RAGE",
    });
    expect(after).toEqual(before);
  });

  test("battle hosts surface and execute release grapple through MCP", () => {
    const host = initBattleHostWithGrapplingActor();

    expect(
      readPayload(handleToolCall(host, "get_available_actions", {})),
    ).toEqual({
      action: [],
      bonusAction: [],
      reaction: [],
      free: expect.arrayContaining([
        {
          scope: "battle",
          actorId: "A",
          type: "BATTLE_RELEASE_GRAPPLE",
          cost: cost(),
          outcome: {
            summary:
              "Release the creature you are grappling; no action required",
          },
        },
      ]),
    });

    const response = handleToolCall(host, "execute_action", {
      scope: "battle",
      actorId: "A",
      type: "BATTLE_RELEASE_GRAPPLE",
    });
    expect("isError" in response).toBe(false);
    expect(readPayload(response)).toEqual(
      expect.objectContaining({
        success: true,
        outcome: "Release the creature you are grappling; no action required",
      }),
    );
    expect(
      host.actor.getSnapshot().context.creatures.get(CreatureId("A"))
        ?.grapplingTarget,
    ).toBeNull();
    expect(
      host.actor.getSnapshot().context.creatures.get(CreatureId("B"))
        ?.grappledBy,
    ).toBeNull();
  });

  test("battle hosts surface grapple and require explicit save-outcome runtime through MCP", () => {
    const host = initBattleHostWithAttackActor();

    expect(
      readPayload(handleToolCall(host, "get_available_actions", {})),
    ).toEqual(
      expect.objectContaining({
        action: expect.arrayContaining([
          {
            scope: "battle",
            actorId: "A",
            type: "BATTLE_GRAPPLE",
            targetId: { options: ["B"] },
            cost: cost(quota("action")),
            outcome: {
              summary:
                "Attempt to grapple the chosen target using the battle-owned size check and an explicit resolved Strength or Dexterity save outcome",
            },
          },
        ]),
      }),
    );

    const response = handleToolCall(host, "execute_action", {
      scope: "battle",
      actorId: "A",
      type: "BATTLE_GRAPPLE",
      targetId: "B",
    });

    expect("isError" in response && response.isError).toBe(true);
    expect(readPayload(response)).toEqual({
      error:
        "BATTLE_GRAPPLE requires explicit runtime battleGrapple inputs on execute_action.",
      details: "INVALID_RUNTIME_INPUT",
    });
  });

  test("battle hosts execute public grapple through MCP", () => {
    const host = initBattleHostWithAttackActor();

    const response = handleToolCall(host, "execute_action", {
      scope: "battle",
      actorId: "A",
      type: "BATTLE_GRAPPLE",
      targetId: "B",
      runtime: {
        runtime: "battleGrapple",
        values: {
          targetSaveFailed: true,
        },
      },
    });

    expect("isError" in response).toBe(false);
    expect(readPayload(response)).toEqual(
      expect.objectContaining({
        success: true,
        outcome:
          "Attempt to grapple the chosen target using the battle-owned size check and an explicit resolved Strength or Dexterity save outcome",
      }),
    );
    expect(
      host.actor.getSnapshot().context.creatures.get(CreatureId("A"))
        ?.grapplingTarget,
    ).toBe(CreatureId("B"));
    expect(
      host.actor.getSnapshot().context.creatures.get(CreatureId("B"))
        ?.grappledBy,
    ).toBe(CreatureId("A"));
  });

  test("preview_action summarizes BATTLE_ATTACK without mutating state", () => {
    const host = initBattleHostWithAttackActor();

    const before = readPayload(handleToolCall(host, "get_state", {}));
    const preview = readPayload(
      handleToolCall(host, "preview_action", {
        scope: "battle",
        actorId: "A",
        type: "BATTLE_ATTACK",
        targetId: "B",
        knockOut: false,
      }),
    );
    const after = readPayload(handleToolCall(host, "get_state", {}));

    expect(preview).toEqual({
      ok: true,
      summary:
        "Make a weapon or unarmed strike attack against the chosen target using explicit roll, AC, visibility, adjacency, and reaction-candidate facts",
      cost: cost(quota("action")),
      runtime: "battleAttack",
    });
    expect(after).toEqual(before);
  });

  test("execute_action requires explicit battleAttack runtime inputs for BATTLE_ATTACK", () => {
    const host = initBattleHostWithAttackActor();

    const response = handleToolCall(host, "execute_action", {
      scope: "battle",
      actorId: "A",
      type: "BATTLE_ATTACK",
      targetId: "B",
      knockOut: false,
    });

    expect("isError" in response && response.isError).toBe(true);
    expect(readPayload(response)).toEqual({
      error:
        "BATTLE_ATTACK requires explicit runtime battleAttack inputs on execute_action.",
      details: "INVALID_RUNTIME_INPUT",
    });
  });

  test("execute_action rejects invalid BATTLE_ATTACK session facts", () => {
    const host = initBattleHostWithAttackActor();

    const response = handleToolCall(host, "execute_action", {
      scope: "battle",
      actorId: "A",
      type: "BATTLE_ATTACK",
      targetId: "B",
      knockOut: false,
      runtime: {
        runtime: "battleAttack",
        values: {
          attackRoll: 12,
          targetAc: 12,
          weaponDamage: 4,
          attackerWithin5ft: true,
          hostileWithin5ft: false,
          targetCanSeeAttacker: true,
          attackerCanSeeTarget: true,
          frightSourceInLOS: false,
          hasAllyAdjacentToTarget: false,
          hitReactionCandidates: ["Z"],
        },
      },
    });

    expect("isError" in response && response.isError).toBe(true);
    expect(readPayload(response)).toEqual({
      error:
        "Battle hit reaction candidate Z is not a valid other creature in this battle.",
      details: "INVALID_RUNTIME_INPUT",
    });
  });

  test("execute_action rejects stray sneak attack damage on public BATTLE_ATTACK", () => {
    const host = initBattleHostWithAttackActor();

    const response = handleToolCall(host, "execute_action", {
      scope: "battle",
      actorId: "A",
      type: "BATTLE_ATTACK",
      targetId: "B",
      knockOut: false,
      runtime: {
        runtime: "battleAttack",
        values: {
          attackRoll: 12,
          targetAc: 12,
          weaponDamage: 4,
          sneakAttackDamage: 7,
          attackerWithin5ft: true,
          hostileWithin5ft: false,
          targetCanSeeAttacker: true,
          attackerCanSeeTarget: true,
          frightSourceInLOS: false,
          hasAllyAdjacentToTarget: false,
          hitReactionCandidates: [],
        },
      },
    });

    expect("isError" in response && response.isError).toBe(true);
    expect(readPayload(response)).toEqual({
      error:
        'BATTLE_ATTACK requires runtime: { runtime: "battleAttack", values: ... } with explicit attack, AC, visibility, adjacency, and reaction-candidate facts.',
      details: "INVALID_RUNTIME_INPUT",
    });
  });

  test("execute_action routes public BATTLE_ATTACK hits through the battle lane", () => {
    const host = initBattleHostWithAttackActor();

    const response = handleToolCall(host, "execute_action", {
      scope: "battle",
      actorId: "A",
      type: "BATTLE_ATTACK",
      targetId: "B",
      knockOut: false,
      runtime: {
        runtime: "battleAttack",
        values: {
          attackRoll: 15,
          targetAc: 10,
          weaponDamage: 6,
          attackerWithin5ft: true,
          hostileWithin5ft: false,
          targetCanSeeAttacker: true,
          attackerCanSeeTarget: true,
          frightSourceInLOS: false,
          hasAllyAdjacentToTarget: false,
          hitReactionCandidates: [],
        },
      },
    });

    expect("isError" in response).toBe(false);
    expect(readPayload(response)).toMatchObject({
      success: true,
      state: { scope: "battle" },
    });
    expect(
      host.actor.getSnapshot().context.creatures.get(CreatureId("A")),
    ).toMatchObject({ actionsRemaining: 0, attackActionUsed: true });
    expect(
      host.actor.getSnapshot().context.creatures.get(CreatureId("B")),
    ).toMatchObject({ hp: 14 });
  });

  test("execute_action routes public BATTLE_ATTACK misses through the battle lane", () => {
    const host = initBattleHostWithAttackActor();

    const response = handleToolCall(host, "execute_action", {
      scope: "battle",
      actorId: "A",
      type: "BATTLE_ATTACK",
      targetId: "B",
      knockOut: false,
      runtime: {
        runtime: "battleAttack",
        values: {
          attackRoll: 5,
          targetAc: 20,
          weaponDamage: 6,
          attackerWithin5ft: true,
          hostileWithin5ft: false,
          targetCanSeeAttacker: true,
          attackerCanSeeTarget: true,
          frightSourceInLOS: false,
          hasAllyAdjacentToTarget: false,
          hitReactionCandidates: [],
        },
      },
    });

    expect("isError" in response).toBe(false);
    expect(readPayload(response)).toMatchObject({
      success: true,
      state: { scope: "battle" },
    });
    expect(
      host.actor.getSnapshot().context.creatures.get(CreatureId("A")),
    ).toMatchObject({ actionsRemaining: 0, attackActionUsed: true });
    expect(
      host.actor.getSnapshot().context.creatures.get(CreatureId("B")),
    ).toMatchObject({ hp: 20 });
  });

  test("execute_action routes public BATTLE_ATTACK into existing hit reaction windows", () => {
    const host = initBattleHostWithPublicAttackReactionWindow();

    const response = handleToolCall(host, "execute_action", {
      scope: "battle",
      actorId: "A",
      type: "BATTLE_ATTACK",
      targetId: "B",
      knockOut: false,
      runtime: {
        runtime: "battleAttack",
        values: {
          attackRoll: 15,
          targetAc: 10,
          weaponDamage: 5,
          attackerWithin5ft: true,
          hostileWithin5ft: false,
          targetCanSeeAttacker: true,
          attackerCanSeeTarget: true,
          frightSourceInLOS: false,
          hasAllyAdjacentToTarget: false,
          hitReactionCandidates: ["B"],
        },
      },
    });

    expect("isError" in response).toBe(false);
    expect(readPayload(response)).toMatchObject({
      success: true,
      state: {
        scope: "battle",
        awaitingReaction: true,
      },
    });
    expect(host.actor.getSnapshot().context.awaitCtx?.trigger).toBe(
      "TAttackHits",
    );
  });

  test("execute_action requires explicit battleAttack runtime inputs for BATTLE_OFF_HAND_ATTACK", () => {
    const host = initBattleHostWithPublicOffHandAttackActor();

    const response = handleToolCall(host, "execute_action", {
      scope: "battle",
      actorId: "A",
      type: "BATTLE_OFF_HAND_ATTACK",
      targetId: "B",
      knockOut: false,
    });

    expect("isError" in response && response.isError).toBe(true);
    expect(readPayload(response)).toEqual({
      error:
        "BATTLE_OFF_HAND_ATTACK requires explicit runtime battleAttack inputs on execute_action.",
      details: "INVALID_RUNTIME_INPUT",
    });
  });

  test("execute_action routes public BATTLE_OFF_HAND_ATTACK through the shared battleAttack runtime", () => {
    const host = initBattleHostWithPublicOffHandAttackActor({
      strMod: 3,
      dexMod: 3,
      lightPropertyExtraAttackAddsAbilityModifier: true,
    });

    const beforeHp = host.actor
      .getSnapshot()
      .context.creatures.get(CreatureId("B"))?.hp;

    const response = handleToolCall(host, "execute_action", {
      scope: "battle",
      actorId: "A",
      type: "BATTLE_OFF_HAND_ATTACK",
      targetId: "B",
      knockOut: true,
      runtime: {
        runtime: "battleAttack",
        values: {
          attackRoll: 15,
          targetAc: 10,
          weaponDamage: 3,
          attackerWithin5ft: true,
          hostileWithin5ft: false,
          targetCanSeeAttacker: true,
          attackerCanSeeTarget: true,
          frightSourceInLOS: false,
          hasAllyAdjacentToTarget: false,
          hitReactionCandidates: [],
        },
      },
    });

    expect("isError" in response).toBe(false);
    expect(readPayload(response)).toMatchObject({
      success: true,
      state: { scope: "battle" },
    });
    expect(
      host.actor.getSnapshot().context.creatures.get(CreatureId("A")),
    ).toMatchObject({ bonusActionUsed: true });
    expect(
      host.actor.getSnapshot().context.creatures.get(CreatureId("B"))?.hp,
    ).toBe((beforeHp ?? 0) - 6);
  });

  test("battle hosts surface and execute escape grapple through MCP", () => {
    const host = initBattleHostWithGrapplingActor();
    host.actor.send({
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    host.actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });

    expect(
      readPayload(handleToolCall(host, "get_available_actions", {})),
    ).toEqual(
      expect.objectContaining({
        action: expect.arrayContaining([
          expect.objectContaining({
            scope: "battle",
            actorId: "B",
            type: "BATTLE_ESCAPE_GRAPPLE",
            escapeSucceeded: { options: [true, false] },
            cost: cost(quota("action")),
          }),
        ]),
      }),
    );

    const response = handleToolCall(host, "execute_action", {
      scope: "battle",
      actorId: "B",
      type: "BATTLE_ESCAPE_GRAPPLE",
      escapeSucceeded: true,
    });
    expect("isError" in response).toBe(false);
    expect(readPayload(response)).toEqual(
      expect.objectContaining({
        success: true,
        outcome:
          "Spend your action to attempt to escape the grapple with a resolved Athletics or Acrobatics check",
      }),
    );
    expect(
      host.actor.getSnapshot().context.creatures.get(CreatureId("B"))
        ?.grappledBy,
    ).toBeNull();
  });

  test("battle hosts surface and execute hide and search through MCP", () => {
    const actor = createActor(battleMachine);
    actor.start();
    actor.send({
      type: "BATTLE_INIT",
      creatures: [
        { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 15 },
        { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 10 },
      ],
    });
    actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
    const host = createBattleHost(actor);

    const hideResponse = handleToolCall(host, "execute_action", {
      scope: "battle",
      actorId: "A",
      type: "BATTLE_HIDE",
      stealthTotal: 35,
      hasCoverOrObscurement: true,
      outOfEnemyLineOfSight: true,
    });
    expect("isError" in hideResponse).toBe(false);
    expect(
      host.actor.getSnapshot().context.creatures.get(CreatureId("A"))
        ?.hiddenDiscoveryDc,
    ).toBe(35);

    host.actor.send({
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    host.actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });

    expect(
      readPayload(handleToolCall(host, "get_available_actions", {})),
    ).toEqual(
      expect.objectContaining({
        action: expect.arrayContaining([
          expect.objectContaining({
            scope: "battle",
            actorId: "B",
            type: "BATTLE_SEARCH",
            targetId: { options: ["A"] },
            cost: cost(quota("action")),
          }),
        ]),
      }),
    );

    const searchResponse = handleToolCall(host, "execute_action", {
      scope: "battle",
      actorId: "B",
      type: "BATTLE_SEARCH",
      targetId: "A",
      perceptionTotal: 35,
    });
    expect("isError" in searchResponse).toBe(false);
    expect(
      host.actor.getSnapshot().context.creatures.get(CreatureId("A"))
        ?.hiddenDiscoveryDc,
    ).toBe(0);
  });

  test("battle hosts surface and execute ready-window actions through MCP", () => {
    const host = initBattleHostWithReadyWindow();

    expect(
      readPayload(handleToolCall(host, "get_available_actions", {})),
    ).toEqual({
      action: [],
      bonusAction: [],
      reaction: [
        {
          scope: "battle",
          actorId: "A",
          type: "BATTLE_READY_RELEASE",
          targetId: { options: ["B"] },
          cost: cost(quota("reaction")),
          outcome: {
            summary:
              "Spend your reaction to release the readied attack against the chosen target",
          },
        },
      ],
      free: [
        {
          scope: "battle",
          actorId: "A",
          type: "BATTLE_READY_PASS",
          cost: cost(),
          outcome: { summary: "Decline to release your readied action" },
        },
      ],
    });

    const response = handleToolCall(host, "execute_action", {
      scope: "battle",
      actorId: "A",
      type: "BATTLE_READY_PASS",
    });

    expect("isError" in response).toBe(false);
    expect(readPayload(response)).toEqual({
      success: true,
      outcome: "Decline to release your readied action",
      state: {
        scope: "battle",
        machineState: { running: "activeTurn" },
        tags: ["playerTurn"],
        round: 1,
        turnIndex: 1,
        activeCreatureId: "B",
        initiative: ["A", "B"],
        creatureIds: ["A", "B"],
        phase: "activeTurn",
        awaitingReaction: false,
        resolvingAoE: false,
        resolvingMovement: false,
        awaitingLegendaryAction: false,
        awaitingReadiedAction: false,
      },
    });
  });

  test("battle hosts surface and execute ready spell setup through MCP", () => {
    const host = initBattleHostWithReadySpellActor();

    expect(
      readPayload(handleToolCall(host, "get_available_actions", {})),
    ).toEqual(
      expect.objectContaining({
        action: expect.arrayContaining([
          expect.objectContaining({
            scope: "battle",
            actorId: "A",
            type: "BATTLE_READY_SPELL",
            spellName: "hold_person",
            slotLevel: { options: [2, 3] },
            targetId: { options: ["B"] },
          }),
        ]),
      }),
    );

    const response = handleToolCall(host, "execute_action", {
      scope: "battle",
      actorId: "A",
      type: "BATTLE_READY_SPELL",
      spellName: "hold_person",
      slotLevel: 2,
      targetId: "B",
    });

    expect("isError" in response).toBe(false);
    expect(readPayload(response)).toEqual(
      expect.objectContaining({
        success: true,
        outcome:
          "Spend your action and a spell slot to Ready Hold Person and hold it with Concentration",
      }),
    );

    host.actor.send({
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });

    expect(
      readPayload(handleToolCall(host, "get_available_actions", {})),
    ).toEqual(
      expect.objectContaining({
        reaction: expect.arrayContaining([
          expect.objectContaining({
            scope: "battle",
            actorId: "A",
            type: "BATTLE_READY_SPELL_RELEASE",
          }),
        ]),
      }),
    );

    const releaseResponse = handleToolCall(host, "execute_action", {
      scope: "battle",
      actorId: "A",
      type: "BATTLE_READY_SPELL_RELEASE",
    });

    expect("isError" in releaseResponse).toBe(false);
    expect(readPayload(releaseResponse)).toEqual(
      expect.objectContaining({
        success: true,
        outcome:
          "Spend your reaction to release the readied spell against its chosen target",
      }),
    );
  });

  test("battle hosts surface and execute AoE spell setup through MCP", () => {
    const host = initBattleHostWithAoeSpellActor();

    expect(
      readPayload(handleToolCall(host, "get_available_actions", {})),
    ).toEqual(
      expect.objectContaining({
        action: expect.arrayContaining([
          expect.objectContaining({
            scope: "battle",
            actorId: "A",
            type: "BATTLE_CAST_AOE",
            spellId: "burning_hands",
          }),
          expect.objectContaining({
            scope: "battle",
            actorId: "A",
            type: "BATTLE_CAST_AOE",
            spellId: "fireball",
            slotLevel: { options: [3] },
          }),
        ]),
      }),
    );

    const response = handleToolCall(host, "execute_action", {
      scope: "battle",
      actorId: "A",
      type: "BATTLE_CAST_AOE",
      spellId: "fireball",
      slotLevel: 3,
    });

    expect("isError" in response).toBe(false);
    expect(readPayload(response)).toEqual(
      expect.objectContaining({
        success: true,
        outcome:
          "Spend your action and a spell slot to cast Fireball through the battle-owned area save loop",
      }),
    );
  });

  test("battle hosts surface and execute after-damage reactions through MCP", () => {
    const host = initBattleHostWithHellishRebukeWindow();

    expect(
      readPayload(handleToolCall(host, "get_available_actions", {})),
    ).toEqual({
      action: [],
      bonusAction: [],
      reaction: [
        {
          scope: "battle",
          actorId: "B",
          type: "CAST_HELLISH_REBUKE",
          cost: cost(quota("reaction"), pool("spellSlot")),
          outcome: {
            summary:
              "Use your reaction to cast Hellish Rebuke against the creature that damaged you",
          },
        },
      ],
      free: [],
    });

    const response = handleToolCall(host, "execute_action", {
      scope: "battle",
      actorId: "B",
      type: "CAST_HELLISH_REBUKE",
    });

    expect("isError" in response).toBe(false);
    expect(readPayload(response)).toEqual(
      expect.objectContaining({
        success: true,
        outcome:
          "Use your reaction to cast Hellish Rebuke against the creature that damaged you",
      }),
    );
  });

  test("battle hosts surface CAST_COUNTERSPELL from the authoritative spell-cast window", () => {
    const host = initBattleHostWithCounterspellWindow();

    expect(
      readPayload(handleToolCall(host, "get_available_actions", {})),
    ).toEqual({
      action: [],
      bonusAction: [],
      reaction: [
        {
          scope: "battle",
          actorId: "B",
          type: "CAST_COUNTERSPELL",
          slotLevel: { options: [3, 4] },
          cost: cost(quota("reaction"), pool("spellSlot")),
          outcome: {
            summary:
              "Use your reaction to cast Counterspell against the triggering spell",
          },
        },
      ],
      free: [],
    });
  });

  test("execute_action routes USE_UNCANNY_DODGE through the battle lane end to end", () => {
    const host = initBattleHostWithDamageWindow();

    const response = handleToolCall(host, "execute_action", {
      scope: "battle",
      actorId: "B",
      type: "USE_UNCANNY_DODGE",
    });

    expect("isError" in response).toBe(false);
    expect(readPayload(response)).toEqual({
      success: true,
      outcome:
        "Use your reaction to halve the triggering attack's damage against you",
      state: {
        scope: "battle",
        machineState: { running: "awaitingReaction" },
        tags: ["reactionWindow"],
        round: 1,
        turnIndex: 0,
        activeCreatureId: "A",
        initiative: ["A", "B"],
        creatureIds: ["A", "B"],
        phase: "awaitingReaction",
        awaitingReaction: true,
        resolvingAoE: false,
        resolvingMovement: false,
        awaitingLegendaryAction: false,
        awaitingReadiedAction: false,
      },
    });
  });

  test("preview_action summarizes a battle action without mutating state", () => {
    const host = initBattleHostWithProneActor();

    const before = readPayload(handleToolCall(host, "get_state", {}));
    const preview = readPayload(
      handleToolCall(host, "preview_action", {
        scope: "battle",
        actorId: "A",
        type: "STAND_FROM_PRONE",
      }),
    );
    const after = readPayload(handleToolCall(host, "get_state", {}));

    expect(preview).toEqual({
      ok: true,
      summary: "Spend half your Speed in movement to stand up from Prone",
      cost: cost(movement(15)),
      runtime: "none",
      eventType: "BATTLE_STAND_FROM_PRONE",
    });
    expect(after).toEqual(before);
  });

  test("execute_action routes CAST_SHIELD through the battle lane end to end", () => {
    const host = initBattleHostWithHitWindow();

    const response = handleToolCall(host, "execute_action", {
      scope: "battle",
      actorId: "B",
      type: "CAST_SHIELD",
    });

    expect("isError" in response).toBe(false);
    expect(readPayload(response)).toEqual({
      success: true,
      outcome: "Use your reaction to cast Shield against the triggering attack",
      state: {
        scope: "battle",
        machineState: { running: "awaitingReaction" },
        tags: ["reactionWindow"],
        round: 1,
        turnIndex: 0,
        activeCreatureId: "A",
        initiative: ["A", "B", "C"],
        creatureIds: ["A", "B", "C"],
        phase: "awaitingReaction",
        awaitingReaction: true,
        resolvingAoE: false,
        resolvingMovement: false,
        awaitingLegendaryAction: false,
        awaitingReadiedAction: false,
      },
    });

    expect(
      readPayload(handleToolCall(host, "get_available_actions", {})),
    ).toEqual({
      action: [],
      bonusAction: [],
      reaction: [
        {
          scope: "battle",
          actorId: "C",
          type: "USE_CUTTING_WORDS",
          cost: cost(quota("reaction"), pool("bardicInspiration")),
          outcome: {
            summary:
              "Use your reaction and expend Bardic Inspiration to reduce the triggering attack roll",
          },
        },
      ],
      free: [],
    });
  });

  test("execute_action routes USE_PARRY through the battle lane end to end", () => {
    const host = initBattleHostWithParryWindow();

    const response = handleToolCall(host, "execute_action", {
      scope: "battle",
      actorId: "D",
      type: "USE_PARRY",
    });

    expect("isError" in response).toBe(false);
    expect(readPayload(response)).toEqual({
      success: true,
      outcome:
        "Use your reaction to add your Parry bonus against the triggering melee weapon attack",
      state: {
        scope: "battle",
        machineState: { running: "awaitingReaction" },
        tags: ["reactionWindow"],
        round: 1,
        turnIndex: 0,
        activeCreatureId: "A",
        initiative: ["A", "D"],
        creatureIds: ["A", "D"],
        phase: "awaitingReaction",
        awaitingReaction: true,
        resolvingAoE: false,
        resolvingMovement: false,
        awaitingLegendaryAction: false,
        awaitingReadiedAction: false,
      },
    });

    expect(
      readPayload(handleToolCall(host, "get_available_actions", {})),
    ).toEqual({
      action: [],
      bonusAction: [],
      reaction: [],
      free: [],
    });
  });

  test("execute_action routes USE_CUTTING_WORDS through the battle lane end to end", () => {
    const host = initBattleHostWithHitWindow();

    const response = handleToolCall(host, "execute_action", {
      scope: "battle",
      actorId: "C",
      type: "USE_CUTTING_WORDS",
    });

    expect("isError" in response).toBe(false);
    const payload = readPayload(response);
    expect(payload.success).toBe(true);
    expect(payload.outcome).toMatch(
      /^Use your reaction and expend Bardic Inspiration to reduce the triggering attack roll \([1-8]\)$/,
    );
    expect(payload.state).toEqual({
      scope: "battle",
      machineState: { running: "awaitingReaction" },
      tags: ["reactionWindow"],
      round: 1,
      turnIndex: 0,
      activeCreatureId: "A",
      initiative: ["A", "B", "C"],
      creatureIds: ["A", "B", "C"],
      phase: "awaitingReaction",
      awaitingReaction: true,
      resolvingAoE: false,
      resolvingMovement: false,
      awaitingLegendaryAction: false,
      awaitingReadiedAction: false,
    });

    expect(
      readPayload(handleToolCall(host, "get_available_actions", {})),
    ).toEqual({
      action: [],
      bonusAction: [],
      reaction: [
        {
          scope: "battle",
          actorId: "B",
          type: "CAST_SHIELD",
          cost: cost(quota("reaction"), pool("spellSlot")),
          outcome: {
            summary:
              "Use your reaction to cast Shield against the triggering attack",
          },
        },
      ],
      free: [],
    });
  });

  test("execute_action routes USE_DEFLECT_ATTACKS through the battle lane end to end", () => {
    const host = initBattleHostWithDeflectWindow();

    const response = handleToolCall(host, "execute_action", {
      scope: "battle",
      actorId: "B",
      type: "USE_DEFLECT_ATTACKS",
    });

    expect("isError" in response).toBe(false);
    const payload = readPayload(response);
    expect(payload.success).toBe(true);
    expect(payload.outcome).toMatch(
      /^Use your reaction to reduce the triggering attack's damage with Deflect Attacks \((?:[8-9]|1\d|17)\)$/,
    );
    expect(payload.state).toEqual({
      scope: "battle",
      machineState: { running: "awaitingReaction" },
      tags: ["reactionWindow"],
      round: 1,
      turnIndex: 0,
      activeCreatureId: "A",
      initiative: ["A", "B"],
      creatureIds: ["A", "B"],
      phase: "awaitingReaction",
      awaitingReaction: true,
      resolvingAoE: false,
      resolvingMovement: false,
      awaitingLegendaryAction: false,
      awaitingReadiedAction: false,
    });

    expect(
      readPayload(handleToolCall(host, "get_available_actions", {})),
    ).toEqual({
      action: [],
      bonusAction: [],
      reaction: [],
      free: [],
    });
  });

  test("execute_action routes CAST_COUNTERSPELL through the battle lane end to end", () => {
    const host = initBattleHostWithCounterspellWindow();

    const response = handleToolCall(host, "execute_action", {
      scope: "battle",
      actorId: "B",
      type: "CAST_COUNTERSPELL",
      slotLevel: 3,
    });

    expect("isError" in response).toBe(false);
    expect(readPayload(response)).toEqual({
      success: true,
      outcome:
        "Use your reaction to cast Counterspell against the triggering spell",
      state: {
        scope: "battle",
        machineState: { running: "awaitingReaction" },
        tags: ["reactionWindow"],
        round: 1,
        turnIndex: 0,
        activeCreatureId: "A",
        initiative: ["A", "B", "C"],
        creatureIds: ["A", "B", "C"],
        phase: "awaitingReaction",
        awaitingReaction: true,
        resolvingAoE: false,
        resolvingMovement: false,
        awaitingLegendaryAction: false,
        awaitingReadiedAction: false,
      },
    });
  });

  test("execute_action rejects scope mismatches between token and host", () => {
    const creatureHost = createDemoHost();
    const battleHost = createBattleHost();

    const battleOnCreature = handleToolCall(creatureHost, "execute_action", {
      scope: "battle",
      actorId: "B",
      type: "USE_UNCANNY_DODGE",
    });
    expect("isError" in battleOnCreature && battleOnCreature.isError).toBe(
      true,
    );
    expect(readPayload(battleOnCreature)).toEqual({
      error: "Action scope battle does not match the current creature host.",
      details: "ACTION_SCOPE_MISMATCH",
    });

    const creatureOnBattle = handleToolCall(
      battleHost,
      "execute_action",
      creatureResolved({ type: "ENTER_COMBAT" }),
    );
    expect("isError" in creatureOnBattle && creatureOnBattle.isError).toBe(
      true,
    );
    expect(readPayload(creatureOnBattle)).toEqual({
      error: "Action scope creature does not match the current battle host.",
      details: "ACTION_SCOPE_MISMATCH",
    });
  });
});

describe("SessionRouter", () => {
  test("routes creature tools through the initial host", () => {
    const router = createSessionRouter(createDemoHost());

    expect(readPayload(router.handleToolCall("get_state", {}))).toMatchObject({
      hp: 34,
      maxHp: 44,
    });
    expect(router.getSnapshot()).toEqual({
      activeScope: "creature",
      encounterDraft: null,
      characterListRefs: [],
    });
  });

  test("start_battle promotes the router onto a battle host using the fighter snapshot and monster stat block", () => {
    const router = createSessionRouter(createDemoHost(), {
      encounterDraft: { participantIds: ["fighter", "goblin-1"] },
      characterListRefs: [{ listId: "party-alpha" }],
    });

    const started = router.handleToolCall("start_battle", {
      fighterId: "fighter",
      monsterId: "goblin-1",
      fighterInitiativeRoll: 20,
      monsterInitiativeRoll: 8,
    });

    expect("isError" in started).toBe(false);
    expect(router.getSnapshot()).toEqual({
      activeScope: "battle",
      encounterDraft: { participantIds: ["fighter", "goblin-1"] },
      characterListRefs: [{ listId: "party-alpha" }],
    });
    expect(readPayload(router.handleToolCall("get_state", {}))).toMatchObject({
      scope: "battle",
      activeCreatureId: "fighter",
      initiative: ["fighter", "goblin-1"],
      creatureIds: ["fighter", "goblin-1"],
    });

    if (router.activeHost.scope !== "battle") {
      throw new Error("expected battle host");
    }
    const fighter = router.activeHost.actor
      .getSnapshot()
      .context.creatures.get(CreatureId("fighter"));
    const goblin = router.activeHost.actor
      .getSnapshot()
      .context.creatures.get(CreatureId("goblin-1"));

    expect(fighter).toMatchObject({
      hp: 44,
      maxHp: 44,
      fighterLevel: 5,
      baseWalkSpeed: 30,
      actionSurgeCharges: 1,
      isWearingArmor: true,
      leftHandUse: "mainWeapon",
      rightHandUse: "shield",
      mainHandWeapon: LONGSWORD,
    });
    expect(goblin).toMatchObject({
      maxHp: 7,
      creatureKind: "Monster",
      creatureSize: "small",
      baseWalkSpeed: 30,
      mainHandWeapon: {
        name: "Dagger",
        damageType: "piercing",
        isMelee: true,
        damageDie: 4,
        properties: new Set(["finesse", "light", "thrown"]),
      },
    });

    const startTurn = router.handleToolCall("execute_control_command", {
      scope: "battle",
      type: "BATTLE_START_TURN",
      ...ZERO_BATTLE_SOT,
    });
    expect("isError" in startTurn).toBe(false);
    expect(
      readPayload(router.handleToolCall("get_available_actions", {})).action,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scope: "battle",
          actorId: "fighter",
          type: "BATTLE_ATTACK",
        }),
      ]),
    );
  });

  test("start_battle supports the full fighter vs monster MCP attack workflow without mutating pre-battle session state", () => {
    const creatureHost = createDemoHost();
    const router = createSessionRouter(creatureHost, {
      encounterDraft: { participantIds: ["fighter", "goblin-1"] },
      characterListRefs: [{ listId: "party-alpha" }],
    });

    const started = router.handleToolCall("start_battle", {
      fighterId: "fighter",
      monsterId: "goblin-1",
      fighterInitiativeRoll: 20,
      monsterInitiativeRoll: 8,
    });

    expect("isError" in started).toBe(false);

    const startTurn = router.handleToolCall("execute_control_command", {
      scope: "battle",
      type: "BATTLE_START_TURN",
      ...ZERO_BATTLE_SOT,
    });
    expect("isError" in startTurn).toBe(false);

    const available = readPayload(
      router.handleToolCall("get_available_actions", {}),
    );
    const attackToken = available.action.find(
      (token: { type?: string; actorId?: string }) =>
        token.type === "BATTLE_ATTACK" && token.actorId === "fighter",
    );

    expect(attackToken).toMatchObject({
      scope: "battle",
      actorId: "fighter",
      type: "BATTLE_ATTACK",
      targetId: { options: ["goblin-1"] },
      knockOut: { options: [false, true] },
    });

    const attack = router.handleToolCall("execute_action", {
      scope: "battle",
      actorId: "fighter",
      type: "BATTLE_ATTACK",
      targetId: "goblin-1",
      knockOut: false,
      runtime: {
        runtime: "battleAttack",
        values: {
          attackRoll: 15,
          targetAc: 12,
          weaponDamage: 7,
          attackerWithin5ft: true,
          hostileWithin5ft: false,
          targetCanSeeAttacker: true,
          attackerCanSeeTarget: true,
          frightSourceInLOS: false,
          hasAllyAdjacentToTarget: false,
          hitReactionCandidates: ["goblin-1"],
        },
      },
    });

    expect("isError" in attack).toBe(false);
    expect(readPayload(attack)).toMatchObject({
      success: true,
      state: {
        scope: "battle",
        awaitingReaction: false,
      },
    });
    expect(router.getSnapshot()).toEqual({
      activeScope: "battle",
      encounterDraft: { participantIds: ["fighter", "goblin-1"] },
      characterListRefs: [{ listId: "party-alpha" }],
    });

    if (router.activeHost.scope !== "battle") {
      throw new Error("expected battle host");
    }

    const battleContext = router.activeHost.actor.getSnapshot().context;
    const fighter = battleContext.creatures.get(CreatureId("fighter"));
    const goblin = battleContext.creatures.get(CreatureId("goblin-1"));

    expect(battleContext.awaitCtx).toBeNull();
    expect(fighter).toMatchObject({
      hp: 44,
      maxHp: 44,
      actionsRemaining: 0,
      attackActionUsed: true,
      dead: false,
    });
    expect(goblin).toMatchObject({
      hp: 0,
      maxHp: 7,
      dead: true,
    });
    expect(creatureHost.actor.getSnapshot().context).toMatchObject({
      hp: 34,
      maxHp: 44,
      inCombat: false,
      dead: false,
    });
  });

  test("start_battle rejects invalid monster stat block ids", () => {
    const router = createSessionRouter(createDemoHost());

    const started = router.handleToolCall("start_battle", {
      fighterId: "fighter",
      monsterId: "goblin-1",
      monsterStatBlockId: "badGoblin",
    });

    expect("isError" in started && started.isError).toBe(true);
    expect(readPayload(started).error).toBe("Invalid start_battle input");
    expect(router.getSnapshot().activeScope).toBe("creature");
  });

  test("start_battle rejects duplicate creature ids", () => {
    const router = createSessionRouter(createDemoHost());

    const started = router.handleToolCall("start_battle", {
      fighterId: "fighter",
      monsterId: "fighter",
    });

    expect("isError" in started && started.isError).toBe(true);
    expect(readPayload(started)).toEqual({
      error: "Battle creature IDs must be unique.",
      details: "START_BATTLE_DUPLICATE_CREATURE_ID",
    });
    expect(router.getSnapshot().activeScope).toBe("creature");
  });

  test("start_battle rejects calls once the session is already on a battle host", () => {
    const router = createSessionRouter(createDemoHost());

    router.handleToolCall("start_battle", {
      fighterId: "fighter",
      monsterId: "goblin-1",
    });

    const restarted = router.handleToolCall("start_battle", {
      fighterId: "fighter-2",
      monsterId: "goblin-2",
    });

    expect("isError" in restarted && restarted.isError).toBe(true);
    expect(readPayload(restarted)).toEqual({
      error:
        "start_battle can only be called while the session is on a creature host.",
      details: "START_BATTLE_SCOPE_MISMATCH",
    });
  });

  test("auto-promotes BATTLE_INIT onto a battle host through the stdio routing path", () => {
    const router = createSessionRouter(createDemoHost(), {
      encounterDraft: { participantIds: ["fighter", "goblin-1"] },
      characterListRefs: [{ listId: "party-alpha" }],
    });

    const init = router.handleToolCall("execute_control_command", {
      scope: "battle",
      type: "BATTLE_INIT",
      creatures: [
        { id: "fighter", maxHp: 20, kind: "PC", initiativeRoll: 20 },
        { id: "goblin-1", maxHp: 15, kind: "Monster", initiativeRoll: 10 },
      ],
    });

    expect("isError" in init).toBe(false);
    expect(router.getSnapshot()).toEqual({
      activeScope: "battle",
      encounterDraft: { participantIds: ["fighter", "goblin-1"] },
      characterListRefs: [{ listId: "party-alpha" }],
    });
    expect(readPayload(router.handleToolCall("get_state", {}))).toMatchObject({
      scope: "battle",
      round: 1,
      turnIndex: 0,
      activeCreatureId: "fighter",
      initiative: ["fighter", "goblin-1"],
      creatureIds: ["fighter", "goblin-1"],
      phase: "activeTurn",
      awaitingReaction: false,
      resolvingAoE: false,
      resolvingMovement: false,
      awaitingLegendaryAction: false,
      awaitingReadiedAction: false,
    });
  });

  test("battle tools keep using the same routed public path after promotion", () => {
    const router = createSessionRouter(createDemoHost());

    router.handleToolCall("execute_control_command", {
      scope: "battle",
      type: "BATTLE_INIT",
      creatures: [
        { id: "A", maxHp: 20, kind: "PC", initiativeRoll: 20 },
        { id: "B", maxHp: 15, kind: "Monster", initiativeRoll: 10 },
      ],
    });

    const startTurn = router.handleToolCall("execute_control_command", {
      scope: "battle",
      type: "BATTLE_START_TURN",
      ...ZERO_BATTLE_SOT,
    });

    expect("isError" in startTurn).toBe(false);
    expect(readPayload(startTurn)).toMatchObject({
      success: true,
      state: {
        scope: "battle",
        phase: "activeTurn",
      },
    });
    expect(
      readPayload(router.handleToolCall("get_available_actions", {})),
    ).toMatchObject({
      bonusAction: [],
      reaction: [],
      free: [],
    });
    expect(
      readPayload(router.handleToolCall("get_available_actions", {})).action,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scope: "battle",
          actorId: "A",
        }),
      ]),
    );
  });

  test("failed BATTLE_INIT leaves the creature host active", () => {
    const router = createSessionRouter(createDemoHost());

    const init = router.handleToolCall("execute_control_command", {
      scope: "battle",
      type: "BATTLE_INIT",
    });

    expect("isError" in init && init.isError).toBe(true);
    expect(router.getSnapshot()).toEqual({
      activeScope: "creature",
      encounterDraft: null,
      characterListRefs: [],
    });
  });

  test("duplicate creature ids are rejected on the raw BATTLE_INIT lane", () => {
    const router = createSessionRouter(createDemoHost());

    const init = router.handleToolCall("execute_control_command", {
      scope: "battle",
      type: "BATTLE_INIT",
      creatures: [
        { id: "fighter", maxHp: 20, kind: "PC", initiativeRoll: 20 },
        { id: "fighter", maxHp: 15, kind: "Monster", initiativeRoll: 10 },
      ],
    });

    expect("isError" in init && init.isError).toBe(true);
    expect(readPayload(init)).toEqual({
      error: "Battle creature IDs must be unique.",
      details: "BATTLE_INIT_DUPLICATE_CREATURE_ID",
    });
    expect(router.getSnapshot().activeScope).toBe("creature");
  });

  test("duplicate creature ids are rejected on the raw BATTLE_ADD_CREATURE lane", () => {
    const host = initBattleHostWithFeatureActor();

    const response = handleToolCall(host, "execute_control_command", {
      scope: "battle",
      type: "BATTLE_ADD_CREATURE",
      insertAtIndex: 1,
      creatures: [
        { id: "C", maxHp: 20, kind: "PC" },
        { id: "C", maxHp: 20, kind: "PC" },
      ],
    });

    expect("isError" in response && response.isError).toBe(true);
    expect(readPayload(response)).toEqual({
      error: "Battle creature IDs must be unique.",
      details: "BATTLE_INIT_DUPLICATE_CREATURE_ID",
    });
  });
});
