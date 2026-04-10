import { describe, expect, test } from "vitest";
import { createActor } from "xstate";

import { battleMachine } from "@dnd/core/battle-machine.ts";
import type { BattleEvent } from "@dnd/core/battle-machine-types.ts";
import { TABLE_EVENT_WARNING_CODES } from "@dnd/core/available-actions.ts";
import {
  abilityModifier,
  armorClass,
  classLevel,
  CreatureId,
  difficultyClass,
  spellSlotLevel,
} from "@dnd/core/types.ts";

import {
  createBattleHost,
  createDemoHost,
  handleToolCall,
  toolDefinitions,
} from "./server.ts";
import { tableEventSuccess } from "./server-table-events.ts";

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
        preparedSpells: new Set(["shield"]),
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
        preparedSpells: new Set(["hold_person"]),
        initiativeRoll: 15,
      },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 10 },
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
        preparedSpells: new Set(["hellish_rebuke"]),
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
        preparedSpells: new Set(["hold_person"]),
        initiativeRoll: 15,
      },
      {
        id: CreatureId("B"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        preparedSpells: new Set(["counterspell"]),
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
    slotLvl: spellSlotLevel(1),
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
      "get_available_actions",
      "execute_action",
      "preview_action",
      "execute_control_command",
      "record_table_event",
    ]);
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
    expect(readPayload(invalidRawAction).error).toBe(
      "Invalid execute_control_command input",
    );
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
    expect(readPayload(invalidRawAction).error).toBe(
      "Invalid record_table_event input",
    );
    expect(readPayload(handleToolCall(host, "get_state", {}))).toEqual(before);

    const undecidedGenericSpell = handleToolCall(host, "record_table_event", {
      scope: "battle",
      type: "BATTLE_CAST_SAVE_SPELL",
    });

    expect(
      "isError" in undecidedGenericSpell && undecidedGenericSpell.isError,
    ).toBe(true);
    expect(readPayload(undecidedGenericSpell).error).toBe(
      "Invalid record_table_event input",
    );
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

  test("unsupported table events return a structured error without mutating state", () => {
    const host = createDemoHost();
    const before = readPayload(handleToolCall(host, "get_state", {}));

    const response = handleToolCall(host, "record_table_event", {
      scope: "creature",
      type: "APPLY_FALL",
    });

    expect("isError" in response && response.isError).toBe(true);
    expect(readPayload(response)).toEqual({
      success: false,
      appliedEvent: null,
      warnings: [
        {
          code: "unsupported_domain_gap",
          message:
            "APPLY_FALL is reserved for the warning-aware table-event surface but is not wired to domain semantics yet.",
        },
      ],
      state: before,
      error: {
        code: "TABLE_EVENT_NOT_IMPLEMENTED",
        message: "Table event is not implemented yet",
        event: { scope: "creature", type: "APPLY_FALL" },
      },
    });
    expect(readPayload(handleToolCall(host, "get_state", {}))).toEqual(before);
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

  test("record_table_event rejects handled events that are unavailable in the current creature state", () => {
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
        message: "Table event is not accepted in the current creature state",
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

  test("unsupported battle table events return a structured error without mutating state", () => {
    const host = createBattleHost();
    const before = readPayload(handleToolCall(host, "get_state", {}));

    const response = handleToolCall(host, "record_table_event", {
      scope: "battle",
      type: "BATTLE_HEAL",
    });

    expect("isError" in response && response.isError).toBe(true);
    expect(readPayload(response)).toEqual({
      success: false,
      appliedEvent: null,
      warnings: [
        {
          code: "unsupported_domain_gap",
          message:
            "BATTLE_HEAL is reserved for the warning-aware table-event surface but is not wired to domain semantics yet.",
        },
      ],
      state: before,
      error: {
        code: "TABLE_EVENT_NOT_IMPLEMENTED",
        message: "Table event is not implemented yet",
        event: { scope: "battle", type: "BATTLE_HEAL" },
      },
    });
    expect(readPayload(handleToolCall(host, "get_state", {}))).toEqual(before);
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
          cost: {},
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
      cost: {
        bonusAction: true,
        charge: "secondWind",
      },
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
        cost: {},
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
        cost: {},
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
      preparedSpells: new Set(["bless", "healing_word"]),
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
        cost: { action: true, charge: "spellSlot" },
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
        cost: { bonusAction: true, charge: "spellSlot" },
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
        cost: { charge: "secondWind" },
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
      cost: { charge: "indomitable" },
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
        cost: { charge: "sorceryPoints" },
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
        cost: { action: true, charge: "tireless" },
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
        cost: { charge: "arcaneRecovery" },
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
      preparedSpells: new Set(["burning_hands", "fireball", "hold_person"]),
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
      cost: {},
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
        cost: { charge: "bardicInspiration" },
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
        cost: {},
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
      cost: {},
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
        cost: { charge: "actionSurge" },
        outcome: {
          summary:
            "Expend one Action Surge use to gain one additional action this turn",
        },
      }),
    );
    expect(available.bonusAction).toContainEqual(
      creatureToken({
        type: "FLURRY_OF_BLOWS",
        cost: { bonusAction: true, charge: "focusPoint" },
        outcome: {
          summary:
            "Spend 1 Focus Point to make 2 unarmed strikes as a bonus action",
        },
      }),
    );
    expect(available.bonusAction).toContainEqual(
      creatureToken({
        type: "USE_BARDIC_INSPIRATION",
        cost: { bonusAction: true, charge: "bardicInspiration" },
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
            "cost": {
              "action": true,
              "charge": "tireless",
            },
            "outcome": {
              "summary": "Gain 1d8 + 3 temporary HP (minimum 1)",
            },
            "scope": "creature",
            "type": "USE_TIRELESS",
          },
        ],
        "bonusAction": [
          {
            "cost": {
              "bonusAction": true,
              "charge": "sorceryPoints",
            },
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
            "cost": {
              "bonusAction": true,
              "charge": "secondWind",
            },
            "outcome": {
              "summary": "Heal 1d10 + 10 HP",
            },
            "scope": "creature",
            "type": "USE_SECOND_WIND",
          },
        ],
        "free": [
          {
            "cost": {
              "charge": "actionSurge",
            },
            "outcome": {
              "summary": "Expend one Action Surge use to gain one additional action this turn",
            },
            "scope": "creature",
            "type": "USE_ACTION_SURGE",
          },
          {
            "cost": {
              "charge": "arcaneRecovery",
            },
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
            "cost": {
              "charge": "sorceryPoints",
            },
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
            "cost": {},
            "outcome": {
              "summary": "Leave combat (stop tracking turns)",
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
          cost: { reaction: true, charge: "spellSlot" },
          outcome: {
            summary:
              "Use your reaction to cast Shield against the triggering attack",
          },
        },
        {
          scope: "battle",
          actorId: "C",
          type: "USE_CUTTING_WORDS",
          cost: { reaction: true, charge: "bardicInspiration" },
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
          cost: { movement: 15, shape: "spend" },
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
          cost: { bonusAction: true, charge: "rage" },
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
          cost: { charge: "actionSurge" },
          outcome: {
            summary:
              "Expend one Action Surge use to gain one additional non-Magic action this turn",
          },
        },
        {
          scope: "battle",
          actorId: "A",
          type: "BATTLE_DECLARE_RECKLESS",
          cost: {},
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
      cost: { bonusAction: true, charge: "rage" },
      runtime: "none",
      eventType: "BATTLE_ENTER_RAGE",
    });
    expect(after).toEqual(before);
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
          cost: { reaction: true },
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
          cost: {},
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
          cost: { reaction: true, charge: "spellSlot" },
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
          slotLevel: { options: [3] },
          cost: { reaction: true, charge: "spellSlot" },
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
      cost: { movement: 15, shape: "spend" },
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
          cost: { reaction: true, charge: "bardicInspiration" },
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
          cost: { reaction: true, charge: "spellSlot" },
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
