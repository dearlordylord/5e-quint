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
  startBattleFromCharacterSheetAndStatBlock,
  type BattleFill,
  type BattleHole,
  type BattleState,
  type CombatantId,
  type CombatantSeedInput,
} from "./index.ts";
import {
  characterDraftId,
  createCharacterDraft,
  creationChoiceOptionId,
  creationHoleId,
  fillCreationHoles,
  finalizeCharacterDraft,
} from "@dnd/character-creation-runtime";
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
import type {
  CharacterDraft,
  CharacterSheet,
  CreationFill,
} from "@dnd/character-creation-runtime";

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

describe("battle runtime skeleton", () => {
  test("starts a battle from a finalized Character Sheet and Goblin Warrior Stat Block", () => {
    const state = startBattleFromCharacterSheetAndStatBlock({
      battleId: battleId("battle-1"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Orc Soldier Fighter",
        sheet: fighterCharacterSheet(),
      },
      monster: {
        combatantId: goblinId,
        monsterId: monsterId("goblin-warrior"),
        statBlock: statBlockRecord(),
      },
      unitLibrary,
    });

    const fighter = state.combatants.get(fighterId);
    const goblin = state.combatants.get(goblinId);

    expect(snapshotBattle(state)).toMatchObject({
      battleId: battleId("battle-1"),
      round: 1,
      currentActorId: fighterId,
      turnOrder: [fighterId, goblinId],
      combatants: [
        {
          combatantId: fighterId,
          displayName: "Orc Soldier Fighter",
          sourceKind: "character",
          hp: 12,
          maxHp: 12,
          tempHp: 0,
          armorClass: 19,
          defeated: false,
          zeroHpLifecycle: {
            policy: "usesDeathSavingThrows",
            deathSaves: { successes: 0, failures: 0 },
            stable: false,
            dead: false,
          },
        },
        {
          combatantId: goblinId,
          displayName: "Goblin Warrior",
          sourceKind: "monster",
          hp: 10,
          maxHp: 10,
          tempHp: 0,
          armorClass: 15,
          defeated: false,
          zeroHpLifecycle: { policy: "diesAtZeroHp", dead: false },
        },
      ],
      currentTurnResources: {
        actionResources: [{ kind: "action", source: "turn" }],
        currentHasBonusAction: true,
      },
    });
    expect(fighter?.initiative).toBe(12);
    expect(goblin?.initiative).toBe(12);
    expect(fighter?.source).toMatchObject({
      kind: "character",
      selectedLoadout: {
        armor: "armor_chain_mail",
        shield: "equipment_shield",
        weapon: { unitId: "weapon_longsword", grip: "one_handed" },
      },
    });
    expect(goblin?.source).toMatchObject({
      kind: "monster",
      statBlock: {
        id: "stat_block_goblin_warrior",
        statBlock: {
          ac: { kind: "literal", value: 15 },
          hp: { kind: "literal", value: 10 },
          initiativeModifier: 2,
        },
      },
    });
  });

  test("does not apply Defense Fighting Style when no armor is worn", () => {
    const sheet = fighterCharacterSheet();
    const state = startBattleFromCharacterSheetAndStatBlock({
      battleId: battleId("battle-unarmored-defense"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Orc Soldier Fighter",
        sheet: {
          ...sheet,
          equipment: {
            ...sheet.equipment,
            loadout: {
              shield: "equipment_shield",
              weapon: { unitId: "weapon_longsword", grip: "one_handed" },
            },
          },
        },
      },
      monster: {
        combatantId: goblinId,
        monsterId: monsterId("goblin-warrior"),
        statBlock: statBlockRecord(),
      },
      unitLibrary,
    });

    expect(snapshotBattle(state).combatants[0]).toMatchObject({
      combatantId: fighterId,
      armorClass: 14,
    });
  });

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
      { tag: "coreAct", actorId: fighterId, act: "endTurn" },
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
      { tag: "coreAct", actorId: fighterId, act: "endTurn" },
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
      subject: { tag: "coreAct", actorId: fighterId, act: "attack" },
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
      subject: { tag: "coreAct", actorId: fighterId, act: "attack" },
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
        subject: { tag: "coreAct", actorId: fighterId, act: "attack" },
        fills: [],
      }),
      "targetChoice",
    );

    const result = resolveBattleSubject({
      state,
      subject: { tag: "coreAct", actorId: fighterId, act: "attack" },
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
        subject: { tag: "coreAct", actorId: fighterId, act: "attack" },
        fills: [],
      }),
      "targetChoice",
    );
    const rollHole = requireHole(
      resolveBattleSubject({
        state,
        subject: { tag: "coreAct", actorId: fighterId, act: "attack" },
        fills: [targetFill(targetHole, goblinId)],
      }),
      "attackRoll",
    );

    const result = resolveBattleSubject({
      state,
      subject: { tag: "coreAct", actorId: fighterId, act: "attack" },
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
      subject: { tag: "coreAct", actorId: fighterId, act: "attack" },
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
      subject: { tag: "coreAct", actorId: fighterId, act: "attack" },
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
      subject: { tag: "coreAct", actorId: fighterId, act: "attack" },
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 1, naturalD20: 20 }),
      ],
    });

    expect(result).toMatchObject({
      tag: "needsHoles",
      holes: [
        { kind: "rolledDice", label: "Longsword damage (1d8+3-slashing)" },
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
      subject: { tag: "coreAct", actorId: fighterId, act: "attack" },
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
        subject: { tag: "coreAct", actorId: fighterId, act: "attack" },
        fills: [
          targetFill(targetHole, goblinId),
          attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    const result = resolveBattleSubject({
      state,
      subject: { tag: "coreAct", actorId: fighterId, act: "attack" },
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
        subject: { tag: "coreAct", actorId: fighterId, act: "attack" },
        fills: [
          targetFill(targetHole, goblinId),
          attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    const result = resolveBattleSubject({
      state,
      subject: { tag: "coreAct", actorId: fighterId, act: "attack" },
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
        subject: { tag: "coreAct", actorId: fighterId, act: "attack" },
        fills: [
          targetFill(targetHole, goblinId),
          attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    const result = resolveBattleSubject({
      state,
      subject: { tag: "coreAct", actorId: fighterId, act: "attack" },
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

  test("attack rejects a non-current actor", () => {
    const state = fighterVsGoblinBattle();

    const result = resolveBattleSubject({
      state,
      subject: { tag: "coreAct", actorId: goblinId, act: "attack" },
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
        subject: { tag: "coreAct", actorId: fighterId, act: "attack" },
        fills: [
          targetFill(targetHole, goblinId),
          attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    const result = resolveBattleSubject({
      state,
      subject: { tag: "coreAct", actorId: fighterId, act: "attack" },
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
      subject: { tag: "coreAct", actorId: fighterId, act: "attack" },
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
      subject: { tag: "coreAct", actorId: fighterId, act: "attack" },
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
      subject: { tag: "coreAct", actorId: fighterId, act: "attack" },
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
      subject: { tag: "coreAct", actorId: fighterId, act: "attack" },
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
      subject: { tag: "coreAct", actorId: fighterId, act: "attack" },
      fills: [targetFill(targetHole, targetHole.choices[0] ?? goblinId)],
    }),
    "attackRoll",
  );
}

function attackDamageHoleAfterHit(
  state: BattleState,
  targetHole: BattleHole,
  rollHole: BattleHole,
): BattleHole {
  if (targetHole.kind !== "targetChoice") {
    throw new Error("Expected targetChoice hole.");
  }
  return requireHole(
    resolveBattleSubject({
      state,
      subject: { tag: "coreAct", actorId: fighterId, act: "attack" },
      fills: [
        targetFill(targetHole, targetHole.choices[0] ?? goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
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
  const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole);

  return resolveBattleSubject({
    state,
    subject: { tag: "coreAct", actorId: fighterId, act: "attack" },
    fills: [
      targetFill(targetHole, targetId),
      attackRollFill(rollHole, { total: 20, naturalD20: 20 }),
      damageRollFill(damageHole, 4),
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

function fighterCharacterSheet(): CharacterSheet {
  const result = finalizeCharacterDraft({
    draft: completeManifestDraft(),
    unitLibrary,
  });
  if (result.tag !== "ready") {
    throw new Error("Expected complete manifest draft to finalize.");
  }

  return result.sheet;
}

function createTestDraft(draftId: string): CharacterDraft {
  return createCharacterDraft({
    unitLibrary,
    draftId: characterDraftId(draftId),
  });
}

function completeManifestDraft(): CharacterDraft {
  const draft = createTestDraft("draft:battle-runtime-complete-manifest");
  const afterInitial = requireAcceptedBatch(
    fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: initialManifestFills(),
    }),
  );
  const afterChoices = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterInitial,
      unitLibrary,
      expectedRevision: afterInitial.revision,
      fills: [
        multiChoiceFill(
          "cc:unit:class_fighter:fighter_skill_choices",
          "perception",
          "survival",
        ),
        choiceFill(
          "cc:unit:fighter_fighting_style_l1:fighter_fighting_style",
          "defense",
        ),
        multiChoiceFill(
          "cc:unit:fighter_weapon_mastery_l1:fighter_weapon_mastery_choices",
          "weapon_longsword",
          "weapon_spear",
          "weapon_flail",
        ),
        choiceFill(
          "cc:unit:background_soldier:background_ability_score_increase",
          "two_and_one:str:con",
        ),
        choiceFill(
          "cc:unit:background_soldier:background_tool_choice",
          "tool_dice_set",
        ),
        choiceFill("cc:unit:class_fighter:class_equipment_choice", "option_c"),
        choiceFill(
          "cc:unit:background_soldier:background_equipment_choice",
          "option_b",
        ),
      ],
    }),
  );
  const afterPurchase = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterChoices,
      unitLibrary,
      expectedRevision: afterChoices.revision,
      fills: [
        multiChoiceFill(
          "cc:unit:class_fighter:equipment_purchase",
          "armor_chain_mail",
          "weapon_longsword",
          "equipment_shield",
        ),
      ],
    }),
  );

  return requireAcceptedBatch(
    fillCreationHoles({
      draft: afterPurchase,
      unitLibrary,
      expectedRevision: afterPurchase.revision,
      fills: [
        choiceFill("cc:unit:armor_chain_mail:loadout_armor", "worn"),
        choiceFill("cc:unit:equipment_shield:loadout_shield", "wielded"),
        choiceFill(
          "cc:unit:weapon_longsword:loadout_weapon",
          "wielded_one_handed",
        ),
      ],
    }),
  );
}

function initialManifestFills(): readonly CreationFill[] {
  return [
    choiceFill("cc:draft:draft.primaryClass", "class_fighter"),
    choiceFill("cc:draft:draft.background", "background_soldier"),
    choiceFill("cc:draft:draft.species", "species_orc"),
    {
      kind: "abilityScores",
      holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
      value: {
        str: 15,
        dex: 14,
        con: 13,
        int: 8,
        wis: 10,
        cha: 12,
      },
    },
    {
      kind: "multiChoice",
      holeId: creationHoleId("cc:draft:draft.languages"),
      optionIds: [
        creationChoiceOptionId("Dwarvish"),
        creationChoiceOptionId("Goblin"),
      ],
    },
    choiceFill("cc:draft:draft.alignment", "lawful_good"),
  ];
}

function choiceFill(holeId: string, optionId: string): CreationFill {
  return {
    kind: "choice",
    holeId: testCreationHoleId(holeId),
    optionId: creationChoiceOptionId(optionId),
  };
}

function multiChoiceFill(
  holeId: string,
  ...optionIds: readonly string[]
): CreationFill {
  return {
    kind: "multiChoice",
    holeId: testCreationHoleId(holeId),
    optionIds: optionIds.map(creationChoiceOptionId),
  };
}

function testCreationHoleId(holeId: string): ReturnType<typeof creationHoleId> {
  return creationHoleId(holeId as Parameters<typeof creationHoleId>[0]);
}

function requireAcceptedBatch(result: ReturnType<typeof fillCreationHoles>) {
  if (result.tag !== "accepted") {
    throw new Error("Expected accepted character-creation fill batch.");
  }

  return result.draft;
}
