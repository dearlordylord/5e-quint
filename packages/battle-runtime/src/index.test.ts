import { describe, expect, test } from "vitest";

import {
  battleId,
  characterId,
  combatantId,
  discoverBattleActs,
  endTurn,
  initiativeScore,
  monsterId,
  snapshotBattle,
  startBattle,
  type BattleState,
  type CombatantSeedInput,
} from "./index.ts";
import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import { Hp } from "@dnd/shared/types";
import { decodeStatBlockRecordSync } from "@dnd/surface/surface/schema";
import type { StatBlockRecord } from "@dnd/surface/surface/types";

const fighterId = combatantId("fighter");
const goblinId = combatantId("goblin");

describe("battle runtime skeleton", () => {
  test("startBattle creates sorted Initiative state and the MCP snapshot contract", () => {
    const state = startBattle({
      battleId: battleId("battle-1"),
      combatants: [
        characterSeed({ initiative: 12 }),
        monsterSeed({ initiative: 16, currentHp: 0 }),
      ],
    });

    expect(snapshotBattle(state)).toMatchObject({
      battleId: battleId("battle-1"),
      round: 1,
      currentActorId: goblinId,
      turnOrder: [goblinId, fighterId],
      combatants: [
        {
          combatantId: goblinId,
          displayName: "Goblin Warrior",
          sourceKind: "monster",
          hp: 0,
          maxHp: 7,
          tempHp: 0,
          armorClass: 15,
          defeated: true,
          zeroHpLifecyclePolicy: "diesAtZeroHp",
          conditions: [],
        },
        {
          combatantId: fighterId,
          displayName: "Fighter",
          sourceKind: "character",
          hp: 12,
          maxHp: 12,
          tempHp: 0,
          armorClass: 10,
          defeated: false,
          zeroHpLifecyclePolicy: "usesDeathSavingThrows",
          conditions: [],
        },
      ],
      acts: [
        {
          subject: { tag: "coreAct", actorId: goblinId, act: "attack" },
          label: "Attack",
          initialHoles: [],
        },
        {
          subject: { tag: "coreAct", actorId: goblinId, act: "endTurn" },
          label: "End Turn",
          initialHoles: [],
        },
      ],
      currentTurnResources: {
        actionResources: [{ kind: "action", source: "turn" }],
        currentHasBonusAction: true,
      },
    });
  });

  test("discoverBattleActs exposes only attack and endTurn for the current actor", () => {
    const acts = discoverBattleActs(
      startBattle({
        battleId: battleId("battle-1"),
        combatants: [
          characterSeed({ initiative: 20 }),
          monsterSeed({ initiative: 10 }),
        ],
      }),
    );

    expect(acts.map((act) => act.subject)).toEqual([
      { tag: "coreAct", actorId: fighterId, act: "attack" },
      { tag: "coreAct", actorId: fighterId, act: "endTurn" },
    ]);
  });

  test("snapshotBattle projects current acts from the supplied state", () => {
    const state = {
      ...startBattle({
        battleId: battleId("battle-1"),
        combatants: [
          characterSeed({ initiative: 20 }),
          monsterSeed({ initiative: 10 }),
        ],
      }),
      currentTurnResources: {
        actionResources: [],
        currentHasBonusAction: false,
      },
    } satisfies BattleState;

    expect(snapshotBattle(state).acts.map((act) => act.subject.act)).toEqual([
      "endTurn",
    ]);
  });

  test("endTurn is discoverable but not resolved before the CAM15 slice", () => {
    const state = {
      ...startBattle({
        battleId: battleId("battle-1"),
        combatants: [
          characterSeed({ initiative: 20 }),
          monsterSeed({ initiative: 10 }),
        ],
      }),
      currentTurnResources: {
        actionResources: [],
        currentHasBonusAction: false,
      },
    } satisfies BattleState;

    const result = endTurn({ state, actorId: fighterId });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "unsupportedSubject",
      snapshot: {
        currentActorId: fighterId,
        round: 1,
        currentTurnResources: {
          actionResources: [],
          currentHasBonusAction: false,
        },
      },
    });
  });
});

function characterSeed(input: {
  readonly initiative: number;
}): CombatantSeedInput {
  return {
    combatantId: fighterId,
    displayName: "Fighter",
    initiative: initiativeScore(input.initiative),
    seed: {
      kind: "character",
      characterId: characterId("fighter-character"),
      sheetUnitRefs: [],
      armorClass: defaultArmorClassState(),
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      zeroHpLifecyclePolicy: "usesDeathSavingThrows",
      selectedLoadout: {},
    },
  };
}

function monsterSeed(input: {
  readonly initiative: number;
  readonly currentHp?: number;
}): CombatantSeedInput {
  return {
    combatantId: goblinId,
    displayName: "Goblin Warrior",
    initiative: initiativeScore(input.initiative),
    seed: {
      kind: "monster",
      monsterId: monsterId("goblin-warrior"),
      statBlock: statBlockRecord(),
      currentHp: Hp(input.currentHp ?? 7),
      maxHp: Hp(7),
      tempHp: Hp(0),
      zeroHpLifecyclePolicy: "diesAtZeroHp",
    },
  };
}

function statBlockRecord(): StatBlockRecord {
  return decodeStatBlockRecordSync({
    id: "stat_block_goblin_warrior",
    kind: "statBlock",
    name: "Goblin Warrior",
    provenance: {
      kind: "srd-5.2.1",
      section: "test-fixture",
    },
    statBlock: {
      displayName: "Goblin Warrior",
      size: "small",
      creatureType: "humanoid",
      ac: { kind: "literal", value: 15 },
      hp: { kind: "literal", value: 7 },
      speeds: [{ kind: "walk", feet: { kind: "literal", value: 30 } }],
      abilityScores: {
        str: 8,
        dex: 15,
        con: 10,
        int: 10,
        wis: 8,
        cha: 8,
      },
    },
  });
}
