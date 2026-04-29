import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import {
  battleId,
  characterId,
  combatantId,
  discoverBattleActs,
  endTurn,
  initiativeScore,
  monsterId,
  resolveBattleSubject,
  snapshotBattle,
  startBattle,
  type BattleFill,
  type BattleHole,
  type BattleState,
  type BattleSubject,
  type CombatantId,
  type CombatantSeedInput,
} from "./index.ts";
import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import { DieRollResult, Hp } from "@dnd/shared/types";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { StatBlockRecord } from "@dnd/surface/surface/types";

const packageRootPath = fileURLToPath(new URL("../", import.meta.url));
const battleRuntimeSlicePath = fileURLToPath(
  new URL("../battle-runtime-slice.qnt", import.meta.url),
);
const fighterId = combatantId("fighter");
const goblinId = combatantId("goblin");
type BattleFillableHole = Pick<BattleHole, "kind" | "holeId">;
type DamageRollValue = Extract<
  BattleFill,
  { readonly kind: "rolledDice" }
>["value"];
const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});

if (unitCatalogResult.tag !== "ok" || statBlockCatalogResult.tag !== "ok") {
  throw new Error("Battle runtime test catalogs must build successfully.");
}

const unitLibrary = unitCatalogResult.catalog;
const statBlockCatalog = statBlockCatalogResult.catalog;

describe("battle runtime", () => {
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
          maxHp: 10,
          tempHp: 0,
          armorClass: 15,
          defeated: true,
          zeroHpLifecycle: { policy: "diesAtZeroHp", dead: true },
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
          zeroHpLifecycle: {
            policy: "usesDeathSavingThrows",
            deathSaves: { successes: 0, failures: 0 },
            stable: false,
            dead: false,
          },
          conditions: [],
        },
      ],
      acts: [
        {
          subject: {
            tag: "runtimeCommand",
            actorId: goblinId,
            command: "endTurn",
          },
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
      { tag: "srdAction", actorId: fighterId, action: "attack" },
      { tag: "runtimeCommand", actorId: fighterId, command: "endTurn" },
    ]);
    expect(acts[0]?.initialHoles).toMatchObject([
      {
        kind: "targetChoice",
        label: "Attack target",
        choices: [goblinId],
      },
    ]);
  });

  test("discoverBattleActs omits attack when there is no target", () => {
    const acts = discoverBattleActs(
      startBattle({
        battleId: battleId("battle-no-target"),
        combatants: [characterSeed({ initiative: 20 })],
      }),
    );

    expect(acts.map((act) => act.subject)).toEqual([
      { tag: "runtimeCommand", actorId: fighterId, command: "endTurn" },
    ]);
  });

  test("discoverBattleActs omits attack when the current character is Unconscious at 0 HP", () => {
    const acts = discoverBattleActs(
      startBattle({
        battleId: battleId("battle-unconscious-actor"),
        combatants: [
          characterSeed({ initiative: 20, currentHp: 0 }),
          monsterSeed({ initiative: 10 }),
        ],
      }),
    );

    expect(acts.map((act) => act.subject)).toEqual([
      { tag: "runtimeCommand", actorId: fighterId, command: "endTurn" },
    ]);
  });

  test("attack resolution rejects an Unconscious current character at 0 HP", () => {
    const state = startBattle({
      battleId: battleId("battle-unconscious-actor-resolve"),
      combatants: [
        characterSeed({ initiative: 20, currentHp: 0 }),
        monsterSeed({ initiative: 10 }),
      ],
    });

    const result = resolveBattleSubject({
      state,
      subject: { tag: "srdAction", actorId: fighterId, action: "attack" },
      fills: [],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: fighterId,
            hp: 0,
            zeroHpLifecycle: expect.objectContaining({
              policy: "usesDeathSavingThrows",
              dead: false,
            }),
            conditions: expect.arrayContaining([
              "incapacitated",
              "unconscious",
              "prone",
            ]),
          }),
        ]),
      },
    });
  });

  test("attack replay asks for a target before roll or damage", () => {
    const state = fighterVsGoblinBattle();
    const result = resolveBattleSubject({
      state,
      subject: { tag: "srdAction", actorId: fighterId, action: "attack" },
      fills: [],
    });

    expect(result).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "targetChoice",
          label: "Attack target",
          choices: [goblinId],
        },
      ],
    });
  });

  test("attack replay asks for an attack roll after target selection", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = requireHole(
      resolveBattleSubject({
        state,
        subject: { tag: "srdAction", actorId: fighterId, action: "attack" },
        fills: [],
      }),
      "targetChoice",
    );

    const result = resolveBattleSubject({
      state,
      subject: { tag: "srdAction", actorId: fighterId, action: "attack" },
      fills: [targetFill(targetHole, goblinId)],
    });

    expect(result).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "attackRoll", label: "Attack roll" }],
    });
  });

  test("attack hit asks for Longsword damage dice before spending the action", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = requireHole(
      resolveBattleSubject({
        state,
        subject: { tag: "srdAction", actorId: fighterId, action: "attack" },
        fills: [],
      }),
      "targetChoice",
    );
    const rollHole = requireHole(
      resolveBattleSubject({
        state,
        subject: { tag: "srdAction", actorId: fighterId, action: "attack" },
        fills: [targetFill(targetHole, goblinId)],
      }),
      "attackRoll",
    );

    const result = resolveBattleSubject({
      state,
      subject: { tag: "srdAction", actorId: fighterId, action: "attack" },
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
      ],
    });

    expect(result).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "rolledDice",
          label: "Longsword damage (1d8+3-slashing)",
          attack: {
            weapon: { id: "weapon_longsword" },
            ability: "str",
            abilityModifier: 3,
          },
        },
      ],
      snapshot: {
        currentTurnResources: {
          actionResources: [{ kind: "action", source: "turn" }],
        },
      },
    });
  });

  test("attack miss spends the action without asking for weapon damage", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);

    const result = resolveBattleSubject({
      state,
      subject: { tag: "srdAction", actorId: fighterId, action: "attack" },
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 14, naturalD20: 9 }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        currentTurnResources: {
          actionResources: [],
        },
        combatants: [
          { combatantId: fighterId },
          { combatantId: goblinId, hp: 10 },
        ],
      },
    });
  });

  test("natural 1 attack roll misses even when the total meets Armor Class", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);

    const result = resolveBattleSubject({
      state,
      subject: { tag: "srdAction", actorId: fighterId, action: "attack" },
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 99, naturalD20: 1 }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: { currentTurnResources: { actionResources: [] } },
    });
  });

  test("natural 20 attack roll hits even when the total is below Armor Class", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);

    const result = resolveBattleSubject({
      state,
      subject: { tag: "srdAction", actorId: fighterId, action: "attack" },
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 1, naturalD20: 20 }),
      ],
    });

    expect(result).toMatchObject({
      tag: "needsHoles",
      holes: [
        { kind: "rolledDice", label: "Longsword damage (2d8+3-slashing)" },
      ],
      snapshot: {
        currentTurnResources: {
          actionResources: [{ kind: "action", source: "turn" }],
        },
      },
    });
  });

  test("attack replay rejects invalid natural d20 attack-roll results", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);

    const result = resolveBattleSubject({
      state,
      subject: { tag: "srdAction", actorId: fighterId, action: "attack" },
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 21 }),
      ],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      snapshot: {
        currentTurnResources: {
          actionResources: [{ kind: "action", source: "turn" }],
        },
      },
    });
  });

  test("attack replay rejects damage fills on a miss", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = requireHole(
      resolveBattleSubject({
        state,
        subject: { tag: "srdAction", actorId: fighterId, action: "attack" },
        fills: [
          targetFill(targetHole, goblinId),
          attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    const result = resolveBattleSubject({
      state,
      subject: { tag: "srdAction", actorId: fighterId, action: "attack" },
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 14, naturalD20: 9 }),
        damageRollFill(damageHole, 4),
      ],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });

  test("attack replay rejects damage dice outside the selected weapon expression", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = requireHole(
      resolveBattleSubject({
        state,
        subject: { tag: "srdAction", actorId: fighterId, action: "attack" },
        fills: [
          targetFill(targetHole, goblinId),
          attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    const result = resolveBattleSubject({
      state,
      subject: { tag: "srdAction", actorId: fighterId, action: "attack" },
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFill(damageHole, 99),
      ],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      snapshot: {
        currentTurnResources: {
          actionResources: [{ kind: "action", source: "turn" }],
        },
      },
    });
  });

  test("attack replay rejects damage dice count that does not match the selected weapon", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = requireHole(
      resolveBattleSubject({
        state,
        subject: { tag: "srdAction", actorId: fighterId, action: "attack" },
        fills: [
          targetFill(targetHole, goblinId),
          attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    const result = resolveBattleSubject({
      state,
      subject: { tag: "srdAction", actorId: fighterId, action: "attack" },
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFillWithGroups(damageHole, [[4], [5]]),
      ],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      snapshot: {
        currentTurnResources: {
          actionResources: [{ kind: "action", source: "turn" }],
        },
      },
    });
  });

  test("critical hit requires doubled weapon damage dice", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole, {
      total: 20,
      naturalD20: 20,
    });

    const result = resolveBattleSubject({
      state,
      subject: { tag: "srdAction", actorId: fighterId, action: "attack" },
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 20, naturalD20: 20 }),
        damageRollFillWithGroups(damageHole, [[4, 5]]),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          { combatantId: goblinId, hp: 0, defeated: true },
        ],
      },
    });
  });

  test("attack rejects a non-current actor", () => {
    const state = fighterVsGoblinBattle();

    const result = resolveBattleSubject({
      state,
      subject: { tag: "srdAction", actorId: goblinId, action: "attack" },
      fills: [],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "wrongActor",
    });
  });

  test("filled attack hit spends the action and applies rolled weapon damage to HP", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = requireHole(
      resolveBattleSubject({
        state,
        subject: { tag: "srdAction", actorId: fighterId, action: "attack" },
        fills: [
          targetFill(targetHole, goblinId),
          attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    const result = resolveBattleSubject({
      state,
      subject: { tag: "srdAction", actorId: fighterId, action: "attack" },
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFill(damageHole, 4),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        currentTurnResources: {
          actionResources: [],
        },
        combatants: [
          { combatantId: fighterId },
          { combatantId: goblinId, hp: 3, tempHp: 0, defeated: false },
        ],
      },
    });
  });

  test("attack damage removes Temporary Hit Points before HP", () => {
    const state = startBattle({
      battleId: battleId("battle-temp-hp"),
      combatants: [
        characterSeed({ initiative: 20 }),
        monsterSeed({ initiative: 10, tempHp: 5 }),
      ],
    });
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole);

    const result = resolveBattleSubject({
      state,
      subject: { tag: "srdAction", actorId: fighterId, action: "attack" },
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFill(damageHole, 4),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          { combatantId: goblinId, hp: 8, tempHp: 0, defeated: false },
        ],
      },
    });
  });

  test("attack damage clamps monster HP at 0 and marks Goblin Warrior dead", () => {
    const state = startBattle({
      battleId: battleId("battle-monster-zero"),
      combatants: [
        characterSeed({ initiative: 20 }),
        monsterSeed({ initiative: 10, currentHp: 3 }),
      ],
    });
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole);

    const result = resolveBattleSubject({
      state,
      subject: { tag: "srdAction", actorId: fighterId, action: "attack" },
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFill(damageHole, 8),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          {
            combatantId: goblinId,
            hp: 0,
            tempHp: 0,
            defeated: true,
            zeroHpLifecycle: { policy: "diesAtZeroHp", dead: true },
          },
        ],
      },
    });
  });

  test("character target at 0 HP enters the death-save lifecycle scaffold", () => {
    const targetCharacterId = combatantId("target-character");
    const state = startBattle({
      battleId: battleId("battle-character-zero"),
      combatants: [
        characterSeed({ initiative: 20 }),
        characterSeed({
          combatantId: targetCharacterId,
          displayName: "Target Fighter",
          initiative: 10,
          currentHp: 3,
          attack: null,
        }),
      ],
    });
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole);

    const result = resolveBattleSubject({
      state,
      subject: { tag: "srdAction", actorId: fighterId, action: "attack" },
      fills: [
        targetFill(targetHole, targetCharacterId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFill(damageHole, 8),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          {
            combatantId: targetCharacterId,
            hp: 0,
            defeated: true,
            zeroHpLifecycle: {
              policy: "usesDeathSavingThrows",
              deathSaves: { successes: 0, failures: 0 },
              stable: false,
              dead: false,
            },
            conditions: expect.arrayContaining(["unconscious", "prone"]),
          },
        ],
      },
    });
  });

  test("massive damage kills a character when remaining damage equals maximum HP", () => {
    const targetCharacterId = combatantId("target-character");
    const state = startBattle({
      battleId: battleId("battle-character-massive-damage"),
      combatants: [
        characterSeed({ initiative: 20 }),
        characterSeed({
          combatantId: targetCharacterId,
          displayName: "Target Fighter",
          initiative: 10,
          currentHp: 3,
          attack: null,
        }),
      ],
    });
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole, {
      total: 20,
      naturalD20: 20,
    });

    const result = resolveBattleSubject({
      state,
      subject: { tag: "srdAction", actorId: fighterId, action: "attack" },
      fills: [
        targetFill(targetHole, targetCharacterId),
        attackRollFill(rollHole, { total: 20, naturalD20: 20 }),
        damageRollFillWithGroups(damageHole, [[8, 8]]),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          {
            combatantId: targetCharacterId,
            hp: 0,
            zeroHpLifecycle: {
              policy: "usesDeathSavingThrows",
              deathSaves: { failures: 3 },
              dead: true,
            },
          },
        ],
      },
    });
  });

  test("damage at 0 HP kills when damage equals maximum HP", () => {
    const targetCharacterId = combatantId("target-character");
    const state = startBattle({
      battleId: battleId("battle-character-zero-massive-damage"),
      combatants: [
        characterSeed({ initiative: 20 }),
        characterSeed({
          combatantId: targetCharacterId,
          displayName: "Target Fighter",
          initiative: 10,
          currentHp: 0,
          attack: null,
        }),
      ],
    });
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole, {
      total: 20,
      naturalD20: 20,
    });

    const result = resolveBattleSubject({
      state,
      subject: { tag: "srdAction", actorId: fighterId, action: "attack" },
      fills: [
        targetFill(targetHole, targetCharacterId),
        attackRollFill(rollHole, { total: 20, naturalD20: 20 }),
        damageRollFillWithGroups(damageHole, [[5, 5]]),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          {
            combatantId: targetCharacterId,
            hp: 0,
            zeroHpLifecycle: {
              policy: "usesDeathSavingThrows",
              deathSaves: { failures: 3 },
              dead: true,
            },
          },
        ],
      },
    });
  });

  test("later critical attack damage at 0 HP projects a dead death-save lifecycle", () => {
    const targetCharacterId = combatantId("target-character");
    const state = startBattle({
      battleId: battleId("battle-character-zero-damage"),
      combatants: [
        characterSeed({ initiative: 20 }),
        characterSeed({
          combatantId: targetCharacterId,
          displayName: "Target Fighter",
          initiative: 10,
          currentHp: 0,
          attack: null,
        }),
      ],
    });
    const firstDamageResult = criticalAttackDamageResult(
      state,
      targetCharacterId,
    );
    if (firstDamageResult.tag !== "resolved") {
      throw new Error(
        `Expected resolved first damage, got ${firstDamageResult.tag}.`,
      );
    }
    const secondDamageState = {
      ...firstDamageResult.state,
      currentTurnResources: {
        actionResources: [{ kind: "action", source: "turn" }],
        currentHasBonusAction: true,
      },
    } satisfies BattleState;

    const result = criticalAttackDamageResult(
      secondDamageState,
      targetCharacterId,
    );

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          {
            combatantId: targetCharacterId,
            hp: 0,
            defeated: true,
            zeroHpLifecycle: {
              policy: "usesDeathSavingThrows",
              deathSaves: { successes: 0, failures: 3 },
              stable: false,
              dead: true,
            },
          },
        ],
      },
    });
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

    expect(
      snapshotBattle(state).acts.map((act) => subjectName(act.subject)),
    ).toEqual(["endTurn"]);
  });

  test("endTurn advances to the next Initiative actor and refreshes turn resources", () => {
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
      tag: "resolved",
      snapshot: {
        currentActorId: goblinId,
        round: 1,
        turnOrder: [fighterId, goblinId],
        currentTurnResources: {
          actionResources: [{ kind: "action", source: "turn" }],
          currentHasBonusAction: true,
        },
      },
    });
  });

  test("endTurn advances to a new round after the last actor acts", () => {
    const afterFighter = endTurn({
      state: fighterVsGoblinBattle(),
      actorId: fighterId,
    });
    if (afterFighter.tag !== "resolved") {
      throw new Error(`Expected resolved End Turn, got ${afterFighter.tag}.`);
    }

    const afterGoblin = endTurn({
      state: afterFighter.state,
      actorId: goblinId,
    });

    expect(afterGoblin).toMatchObject({
      tag: "resolved",
      snapshot: {
        currentActorId: fighterId,
        round: 2,
        turnOrder: [fighterId, goblinId],
        currentTurnResources: {
          actionResources: [{ kind: "action", source: "turn" }],
          currentHasBonusAction: true,
        },
      },
    });
  });

  test("endTurn rejects fills because it is a runtime command, not an SRD Action hole protocol", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "runtimeCommand",
        actorId: fighterId,
        command: "endTurn",
      },
      fills: [targetFill(targetHole, goblinId)],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      snapshot: {
        currentActorId: fighterId,
        round: 1,
      },
    });
  });

  test("battle runtime QNT slice self-tests pass", () => {
    runQuintSliceSelfTests();
  });

  test("battle runtime QNT slice matches runtime fixture outcomes", () => {
    const miss = resolveAttackFixture({
      attackRoll: { total: 14, naturalD20: 9 },
    });
    const hit = resolveAttackFixture({
      attackRoll: { total: 15, naturalD20: 10 },
      damageRoll: 4,
    });
    const tempHp = resolveAttackFixture({
      targetTempHp: 5,
      attackRoll: { total: 15, naturalD20: 10 },
      damageRoll: 4,
    });
    const zeroHp = resolveAttackFixture({
      targetHp: 3,
      attackRoll: { total: 15, naturalD20: 10 },
      damageRoll: 8,
    });
    const characterDropToZero = resolveCharacterAttackFixture({
      targetHp: 3,
      attackRoll: { total: 15, naturalD20: 10 },
      damageRoll: 8,
    });
    const characterDamageAtZero = resolveCharacterAttackFixture({
      targetHp: 0,
      attackRoll: { total: 15, naturalD20: 10 },
      damageRoll: 4,
    });
    const characterCriticalDamageAtZero = resolveCharacterAttackFixture({
      targetHp: 0,
      attackRoll: { total: 20, naturalD20: 20 },
      damageRoll: 4,
    });
    const afterFighter = endTurn({
      state: fighterVsGoblinBattle(),
      actorId: fighterId,
    });
    if (afterFighter.tag !== "resolved") {
      throw new Error(`Expected resolved End Turn, got ${afterFighter.tag}.`);
    }
    const afterGoblin = endTurn({
      state: afterFighter.state,
      actorId: goblinId,
    });
    if (afterGoblin.tag !== "resolved") {
      throw new Error(`Expected resolved End Turn, got ${afterGoblin.tag}.`);
    }

    runGeneratedQuintParity(
      renderBattleRuntimeParityModule({
        miss: snapshotProjection(requireResolved(miss)),
        hit: snapshotProjection(requireResolved(hit)),
        tempHp: snapshotProjection(requireResolved(tempHp)),
        zeroHp: snapshotProjection(requireResolved(zeroHp)),
        characterDropToZero: characterProjection(
          requireResolved(characterDropToZero),
          targetCharacterId,
        ),
        characterDamageAtZero: characterProjection(
          requireResolved(characterDamageAtZero),
          targetCharacterId,
        ),
        characterCriticalDamageAtZero: characterProjection(
          requireResolved(characterCriticalDamageAtZero),
          targetCharacterId,
        ),
        afterFighterEndTurn: snapshotProjection(afterFighter),
        afterGoblinEndTurn: snapshotProjection(afterGoblin),
      }),
    );
  });
});

function resolveAttackFixture(input: {
  readonly targetHp?: number;
  readonly targetTempHp?: number;
  readonly attackRoll: { readonly total: number; readonly naturalD20: number };
  readonly damageRoll?: number;
}): ReturnType<typeof resolveBattleSubject> {
  const targetOverrides = {
    ...(input.targetHp === undefined ? {} : { currentHp: input.targetHp }),
    ...(input.targetTempHp === undefined ? {} : { tempHp: input.targetTempHp }),
  };
  const state = startBattle({
    battleId: battleId("battle-qnt-parity"),
    combatants: [
      characterSeed({ initiative: 20 }),
      monsterSeed({
        initiative: 10,
        ...targetOverrides,
      }),
    ],
  });
  const targetHole = attackInitialTargetHole(state);
  const rollHole = attackRollHoleAfterTarget(state, targetHole);
  const fills: BattleFill[] = [
    targetFill(targetHole, goblinId),
    attackRollFill(rollHole, input.attackRoll),
  ];

  if (input.damageRoll !== undefined) {
    fills.push(
      damageRollFill(
        attackDamageHoleAfterHit(state, targetHole, rollHole),
        input.damageRoll,
      ),
    );
  }

  return resolveBattleSubject({
    state,
    subject: { tag: "srdAction", actorId: fighterId, action: "attack" },
    fills,
  });
}

const targetCharacterId = combatantId("target-character");

function resolveCharacterAttackFixture(input: {
  readonly targetHp: number;
  readonly attackRoll: { readonly total: number; readonly naturalD20: number };
  readonly damageRoll: number;
}): ReturnType<typeof resolveBattleSubject> {
  const state = startBattle({
    battleId: battleId("battle-character-parity"),
    combatants: [
      characterSeed({ initiative: 20 }),
      characterSeed({
        combatantId: targetCharacterId,
        displayName: "Target Fighter",
        initiative: 10,
        currentHp: input.targetHp,
        attack: null,
      }),
    ],
  });
  const targetHole = attackInitialTargetHole(state);
  const rollHole = attackRollHoleAfterTarget(state, targetHole);
  const damageHole = attackDamageHoleAfterHit(
    state,
    targetHole,
    rollHole,
    input.attackRoll,
  );

  return resolveBattleSubject({
    state,
    subject: { tag: "srdAction", actorId: fighterId, action: "attack" },
    fills: [
      targetFill(targetHole, targetCharacterId),
      attackRollFill(rollHole, input.attackRoll),
      input.attackRoll.naturalD20 === 20
        ? damageRollFillWithGroups(damageHole, [
            [input.damageRoll, input.damageRoll],
          ])
        : damageRollFill(damageHole, input.damageRoll),
    ],
  });
}

function requireResolved(
  result: ReturnType<typeof resolveBattleSubject>,
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  if (result.tag !== "resolved") {
    throw new Error(`Expected resolved battle result, got ${result.tag}.`);
  }

  return result;
}

function subjectName(subject: BattleSubject): "attack" | "endTurn" {
  return subject.tag === "srdAction" ? subject.action : subject.command;
}

type BattleRuntimeParityProjection = {
  readonly round: number;
  readonly currentActor: "Fighter" | "Goblin";
  readonly fighterHp: number;
  readonly fighterTempHp: number;
  readonly fighterUnconscious: boolean;
  readonly fighterDeathFailures: number;
  readonly goblinHp: number;
  readonly goblinTempHp: number;
  readonly goblinDead: boolean;
  readonly actionAvailable: boolean;
  readonly bonusActionAvailable: boolean;
};

type CharacterZeroHpParityProjection = {
  readonly hp: number;
  readonly tempHp: number;
  readonly unconscious: boolean;
  readonly deathFailures: number;
};

function snapshotProjection(
  result: Extract<
    ReturnType<typeof resolveBattleSubject>,
    { readonly tag: "resolved" }
  >,
): BattleRuntimeParityProjection {
  const snapshot = result.snapshot;
  const fighter = snapshot.combatants.find(
    (combatant) => combatant.combatantId === fighterId,
  );
  const goblin = snapshot.combatants.find(
    (combatant) => combatant.combatantId === goblinId,
  );

  if (fighter == null || goblin == null) {
    throw new Error("Expected Fighter and Goblin combatants in snapshot.");
  }

  return {
    round: snapshot.round,
    currentActor: snapshot.currentActorId === fighterId ? "Fighter" : "Goblin",
    fighterHp: fighter.hp,
    fighterTempHp: fighter.tempHp,
    fighterUnconscious: fighter.conditions.includes("unconscious"),
    fighterDeathFailures:
      fighter.zeroHpLifecycle.policy === "usesDeathSavingThrows"
        ? fighter.zeroHpLifecycle.deathSaves.failures
        : 0,
    goblinHp: goblin.hp,
    goblinTempHp: goblin.tempHp,
    goblinDead:
      goblin.zeroHpLifecycle.policy === "diesAtZeroHp" &&
      goblin.zeroHpLifecycle.dead,
    actionAvailable: snapshot.currentTurnResources.actionResources.some(
      (resource) => resource.kind === "action",
    ),
    bonusActionAvailable: snapshot.currentTurnResources.currentHasBonusAction,
  };
}

function characterProjection(
  result: Extract<
    ReturnType<typeof resolveBattleSubject>,
    { readonly tag: "resolved" }
  >,
  combatantId: CombatantId,
): CharacterZeroHpParityProjection {
  const combatant = result.snapshot.combatants.find(
    (candidate) => candidate.combatantId === combatantId,
  );

  if (combatant == null) {
    throw new Error(`Expected ${combatantId} combatant in snapshot.`);
  }

  return {
    hp: combatant.hp,
    tempHp: combatant.tempHp,
    unconscious: combatant.conditions.includes("unconscious"),
    deathFailures:
      combatant.zeroHpLifecycle.policy === "usesDeathSavingThrows"
        ? combatant.zeroHpLifecycle.deathSaves.failures
        : 0,
  };
}

function runQuintSliceSelfTests(): void {
  const quintOutput = execFileSync(
    "pnpm",
    [
      "exec",
      "quint",
      "test",
      "--backend",
      "typescript",
      battleRuntimeSlicePath,
      "--match",
      "test_",
    ],
    { encoding: "utf8" },
  );
  expect(quintOutput).toContain("15 passing");
}

function runGeneratedQuintParity(moduleBody: string): void {
  const tempDir = fs.mkdtempSync(
    path.join(
      packageRootPath,
      `.tmp-battle-runtime-parity-${os.userInfo().username}-`,
    ),
  );
  const tempFile = path.join(tempDir, "battle-runtime-parity.qnt");

  try {
    fs.writeFileSync(tempFile, moduleBody);
    const quintOutput = execFileSync(
      "pnpm",
      [
        "exec",
        "quint",
        "test",
        "--backend",
        "typescript",
        tempFile,
        "--match",
        "parity_",
      ],
      { encoding: "utf8" },
    );
    expect(quintOutput).toContain("9 passing");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function renderBattleRuntimeParityModule(input: {
  readonly miss: BattleRuntimeParityProjection;
  readonly hit: BattleRuntimeParityProjection;
  readonly tempHp: BattleRuntimeParityProjection;
  readonly zeroHp: BattleRuntimeParityProjection;
  readonly characterDropToZero: CharacterZeroHpParityProjection;
  readonly characterDamageAtZero: CharacterZeroHpParityProjection;
  readonly characterCriticalDamageAtZero: CharacterZeroHpParityProjection;
  readonly afterFighterEndTurn: BattleRuntimeParityProjection;
  readonly afterGoblinEndTurn: BattleRuntimeParityProjection;
}): string {
  return `module battleRuntimeParity {
  import battleRuntimeSlice.* from "../battle-runtime-slice"

  run parity_miss_matches_runtime = {
    assert(resolveAttack(initialState, 14, 9, 0) == ${renderQntStateProjection(input.miss)})
  }

  run parity_hit_damage_matches_runtime = {
    assert(resolveAttack(initialState, 15, 10, 4) == ${renderQntStateProjection(input.hit)})
  }

  run parity_temporary_hp_matches_runtime = {
    assert(resolveAttack(withGoblinHp(initialState, 10, 5), 15, 10, 4) == ${renderQntStateProjection(input.tempHp)})
  }

  run parity_zero_hp_policy_matches_runtime = {
    assert(resolveAttack(withGoblinHp(initialState, 3, 0), 15, 10, 8) == ${renderQntStateProjection(input.zeroHp)})
  }

  run parity_character_drop_to_zero_policy_matches_runtime = {
    assert(applyDamage(withFighterHp(initialState, 3, 0).fighter, 11, 1) == ${renderQntCharacterProjection(input.characterDropToZero)})
  }

  run parity_character_damage_at_zero_policy_matches_runtime = {
    assert(applyDamage(withFighterHp(initialState, 0, 0).fighter, 7, 1) == ${renderQntCharacterProjection(input.characterDamageAtZero)})
  }

  run parity_character_critical_damage_at_zero_policy_matches_runtime = {
    assert(applyDamage(withFighterHp(initialState, 0, 0).fighter, 7, 2) == ${renderQntCharacterProjection(input.characterCriticalDamageAtZero)})
  }

  run parity_fighter_end_turn_matches_runtime = {
    assert(endTurn(initialState) == ${renderQntStateProjection(input.afterFighterEndTurn)})
  }

  run parity_round_wrap_end_turn_matches_runtime = {
    assert(endTurn(endTurn(initialState)) == ${renderQntStateProjection(input.afterGoblinEndTurn)})
  }
}
`;
}

function renderQntCharacterProjection(
  input: CharacterZeroHpParityProjection,
): string {
  return `{
      hp: ${input.hp},
      maxHp: 12,
      tempHp: ${input.tempHp},
      ac: 10,
      unconscious: ${input.unconscious},
      deathFailures: ${input.deathFailures},
      lifecycle: UsesDeathSavingThrows,
    }`;
}

function renderQntStateProjection(
  input: BattleRuntimeParityProjection,
): string {
  return `{
      initiative: {
        round: ${input.round},
        alreadyActed: ${renderQntAlreadyActed(input)},
        stillToAct: ${renderQntStillToAct(input)},
      },
      fighter: {
        hp: ${input.fighterHp},
        maxHp: 12,
        tempHp: ${input.fighterTempHp},
        ac: 10,
        unconscious: ${input.fighterUnconscious},
        deathFailures: ${input.fighterDeathFailures},
        lifecycle: UsesDeathSavingThrows,
      },
      goblin: {
        hp: ${input.goblinHp},
        maxHp: 10,
        tempHp: ${input.goblinTempHp},
        ac: 15,
        unconscious: false,
        deathFailures: 0,
        lifecycle: DiesAtZeroHp,
      },
      actionAvailable: ${input.actionAvailable},
      bonusActionAvailable: ${input.bonusActionAvailable},
    }`;
}

function renderQntAlreadyActed(input: BattleRuntimeParityProjection): string {
  if (input.currentActor === "Goblin") {
    return "[Fighter]";
  }

  return "[]";
}

function renderQntStillToAct(input: BattleRuntimeParityProjection): string {
  if (input.currentActor === "Goblin") {
    return "[Goblin]";
  }

  return "[Fighter, Goblin]";
}

function fighterVsGoblinBattle(): BattleState {
  return startBattle({
    battleId: battleId("battle-attack"),
    combatants: [
      characterSeed({ initiative: 20 }),
      monsterSeed({ initiative: 10 }),
    ],
  });
}

function attackInitialTargetHole(state: BattleState): BattleHole {
  return requireHole(
    resolveBattleSubject({
      state,
      subject: { tag: "srdAction", actorId: fighterId, action: "attack" },
      fills: [],
    }),
    "targetChoice",
  );
}

function attackRollHoleAfterTarget(
  state: BattleState,
  targetHole: BattleHole,
): BattleHole {
  if (targetHole.kind !== "targetChoice") {
    throw new Error("Expected targetChoice hole.");
  }
  return requireHole(
    resolveBattleSubject({
      state,
      subject: { tag: "srdAction", actorId: fighterId, action: "attack" },
      fills: [targetFill(targetHole, targetHole.choices[0] ?? goblinId)],
    }),
    "attackRoll",
  );
}

function attackDamageHoleAfterHit(
  state: BattleState,
  targetHole: BattleHole,
  rollHole: BattleHole,
  attackRoll: { readonly total: number; readonly naturalD20: number } = {
    total: 15,
    naturalD20: 10,
  },
): BattleHole {
  if (targetHole.kind !== "targetChoice") {
    throw new Error("Expected targetChoice hole.");
  }
  return requireHole(
    resolveBattleSubject({
      state,
      subject: { tag: "srdAction", actorId: fighterId, action: "attack" },
      fills: [
        targetFill(targetHole, targetHole.choices[0] ?? goblinId),
        attackRollFill(rollHole, attackRoll),
      ],
    }),
    "rolledDice",
  );
}

function criticalAttackDamageResult(
  state: BattleState,
  targetId: CombatantId,
): ReturnType<typeof resolveBattleSubject> {
  const targetHole = attackInitialTargetHole(state);
  const rollHole = attackRollHoleAfterTarget(state, targetHole);
  const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole, {
    total: 20,
    naturalD20: 20,
  });

  return resolveBattleSubject({
    state,
    subject: { tag: "srdAction", actorId: fighterId, action: "attack" },
    fills: [
      targetFill(targetHole, targetId),
      attackRollFill(rollHole, { total: 20, naturalD20: 20 }),
      damageRollFillWithGroups(damageHole, [[4, 4]]),
    ],
  });
}

function requireHole(
  result: ReturnType<typeof resolveBattleSubject>,
  kind: BattleHole["kind"],
): BattleHole {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected needsHoles, got ${result.tag}.`);
  }
  const hole = result.holes.find((candidate) => candidate.kind === kind);
  if (hole == null) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function targetFill(hole: BattleHole, targetId: CombatantId): BattleFill {
  if (hole.kind !== "targetChoice") {
    throw new Error("Expected targetChoice hole.");
  }
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
  };
}

function attackRollFill(
  hole: BattleHole,
  value: { readonly total: number; readonly naturalD20: number },
): BattleFill {
  if (hole.kind !== "attackRoll") {
    throw new Error("Expected attackRoll hole.");
  }
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total: value.total,
      naturalD20: DieRollResult(value.naturalD20),
    },
  };
}

function damageRollFill(
  hole: BattleFillableHole,
  dieResult: number,
): BattleFill {
  return damageRollFillWithGroups(hole, [[dieResult]]);
}

function damageRollFillWithGroups(
  hole: BattleFillableHole,
  groups: readonly (readonly number[])[],
): BattleFill {
  if (hole.kind !== "rolledDice") {
    throw new Error("Expected rolledDice hole.");
  }
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: rolledDiceGroups(groups),
  };
}

function rolledDiceGroups(
  groups: readonly (readonly number[])[],
): DamageRollValue {
  const [firstGroup, ...restGroups] = groups;
  if (firstGroup === undefined) {
    throw new Error("Expected at least one rolled dice group.");
  }

  return [
    rolledDiceGroup(firstGroup),
    ...restGroups.map((group) => rolledDiceGroup(group)),
  ];
}

function rolledDiceGroup(group: readonly number[]): DamageRollValue[number] {
  const [first, ...rest] = group;
  if (first === undefined) {
    throw new Error("Expected at least one die result.");
  }

  return {
    results: [
      DieRollResult(first),
      ...rest.map((dieResult) => DieRollResult(dieResult)),
    ],
  };
}

function characterSeed(input: {
  readonly combatantId?: CombatantId;
  readonly displayName?: string;
  readonly initiative: number;
  readonly currentHp?: number;
  readonly tempHp?: number;
  readonly attack?: ReturnType<typeof testLongswordAttack> | null;
}): CombatantSeedInput {
  return {
    combatantId: input.combatantId ?? fighterId,
    displayName: input.displayName ?? "Fighter",
    initiative: initiativeScore(input.initiative),
    seed: {
      kind: "character",
      characterId: characterId("fighter-character"),
      sheetUnitRefs: [],
      armorClass: defaultArmorClassState(),
      currentHp: Hp(input.currentHp ?? 12),
      maxHp: Hp(12),
      tempHp: Hp(input.tempHp ?? 0),
      zeroHpLifecyclePolicy: "usesDeathSavingThrows",
      selectedLoadout: {
        weapon: { unitId: "weapon_longsword", grip: "one_handed" },
      },
      attack: input.attack === undefined ? testLongswordAttack() : input.attack,
    },
  };
}

function testLongswordAttack(): Extract<
  CombatantSeedInput["seed"],
  { readonly kind: "character" }
>["attack"] {
  const weapon = unitLibrary.requireUnit("weapon_longsword");
  if (weapon.kind !== "weapon") {
    throw new Error("Expected Longsword weapon Unit.");
  }

  return {
    kind: "weapon",
    weapon,
    ability: "str",
    abilityModifier: 3,
  };
}

function monsterSeed(input: {
  readonly initiative: number;
  readonly currentHp?: number;
  readonly tempHp?: number;
}): CombatantSeedInput {
  return {
    combatantId: goblinId,
    displayName: "Goblin Warrior",
    initiative: initiativeScore(input.initiative),
    seed: {
      kind: "monster",
      monsterId: monsterId("goblin-warrior"),
      statBlock: statBlockRecord(),
      currentHp: Hp(input.currentHp ?? 10),
      maxHp: Hp(10),
      tempHp: Hp(input.tempHp ?? 0),
      zeroHpLifecyclePolicy: "diesAtZeroHp",
    },
  };
}

function statBlockRecord(): StatBlockRecord {
  return statBlockCatalog.requireStatBlock("stat_block_goblin_warrior");
}
