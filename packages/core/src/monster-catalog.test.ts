import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  ControlCommandSchema,
  toBattleInitCreatureConfig,
} from "#/available-actions.ts";
import {
  getMonsterStatBlock,
  GOBLIN_BOSS,
  GOBLIN_MINION,
  GOBLIN_WARRIOR,
  MONSTER_STAT_BLOCK_IDS,
  MONSTER_STAT_BLOCK_PROVENANCE,
  monsterCatalogInitCreatureConfig,
  statBlockAttacks,
  statBlockBattleBonusActionOptions,
  statBlockBattleReactionOptions,
  statBlockInitiativeScore,
  statBlockMultiattack,
  statBlockToInitCreatureConfig,
} from "#/monster-catalog.ts";
import { CreatureId, abilityModifier } from "#/types.ts";

describe("monster catalog", () => {
  it("documents the core-owned SRD provenance rules", () => {
    expect(MONSTER_STAT_BLOCK_PROVENANCE.defaultSource).toBe(
      ".references/srd-5.2.1/",
    );
    expect(MONSTER_STAT_BLOCK_PROVENANCE.researchOnlySources).toContain(
      "research-only",
    );
    expect(MONSTER_STAT_BLOCK_PROVENANCE.quintFixtures).toContain(
      "MBT/proof fixtures",
    );
  });

  it("stores Goblin Minion as an SRD-backed authored stat block", () => {
    const statBlock = getMonsterStatBlock("goblinMinion");

    expect(statBlock.provenance).toEqual({
      edition: "SRD 5.2.1",
      document: ".references/srd-5.2.1/Monsters/Monsters-E-G.md",
      section: "Goblins > Goblin Minion",
    });
    expect(statBlock.name).toBe("Goblin Minion");
    expect(statBlock.creatureType).toBe("fey");
    expect(statBlock.descriptiveTags).toEqual(["Goblinoid"]);
    expect(statBlock.creatureSize).toBe("small");
    expect(statBlock.ac).toBe(12);
    expect(statBlock.initiativeMod).toBe(2);
    expect(statBlock.maxHp).toBe(7);
    expect(statBlock.hitDice).toBe(2);
    expect(statBlock.hitDieType).toBe(6);
    expect(statBlock.speeds.walk).toBe(30);
    expect(statBlock.abilityScores).toEqual({
      str: 8,
      dex: 15,
      con: 10,
      int: 10,
      wis: 8,
      cha: 8,
    });
    expect([...statBlock.saveProficiencies]).toEqual(["dex"]);
    expect(statBlock.skillBonuses.stealth).toBe(6);
    expect(statBlock.passivePerception).toBe(9);
    expect(statBlock.languages).toEqual(["Common", "Goblin"]);
    expect(statBlock.gear).toEqual(["Daggers (3)"]);
    expect(statBlock.cr).toEqual({ type: "CR_Eighth" });
    expect(statBlock.proficiencyBonus).toBe(2);
    expect(statBlock.actions).toEqual([
      {
        kind: "attack",
        id: "dagger",
        name: "Dagger",
        text: "*Melee or Ranged Attack Roll:* +4, reach 5 ft. or range 20/60 ft. *Hit:* 4 (1d4 + 2) Piercing damage.",
        attack: {
          name: "Dagger",
          attackBonus: 4,
          reach: 5,
          rangeNormal: 20,
          rangeLong: 60,
          damageAmount: 4,
          damageType: "piercing",
          isRanged: false,
          attackMode: "meleeOrRanged",
        },
      },
    ]);
    expect(statBlock.bonusActions).toEqual([
      {
        kind: "battleBonusAction",
        id: "nimbleEscape",
        name: "Nimble Escape",
        text: "The goblin takes the Disengage or Hide action.",
        options: ["disengage", "hide"],
      },
    ]);
  });

  it("derives compatibility battle projections from authored sections", () => {
    expect(statBlockBattleBonusActionOptions(GOBLIN_MINION)).toEqual([
      "disengage",
      "hide",
    ]);
    expect(statBlockBattleReactionOptions(GOBLIN_BOSS)).toEqual([
      "redirectAttack",
    ]);
    expect(statBlockMultiattack(GOBLIN_BOSS)).toEqual([
      { type: "MAttack", name: "Scimitar" },
      { type: "MAttack", name: "Shortbow" },
    ]);
    expect(statBlockAttacks(GOBLIN_MINION).dagger).toEqual({
      name: "Dagger",
      attackBonus: 4,
      reach: 5,
      rangeNormal: 20,
      rangeLong: 60,
      damageAmount: 4,
      damageType: "piercing",
      isRanged: false,
      attackMode: "meleeOrRanged",
    });
  });

  it("stores goblin rider metadata on authored attacks without exposing new public IDs", () => {
    expect(MONSTER_STAT_BLOCK_IDS).toEqual([
      "goblinMinion",
      "goblinWarrior",
      "goblinBoss",
    ]);
    expect(
      statBlockAttacks(GOBLIN_WARRIOR).scimitar.extraDamageOnAdvantageHit,
    ).toEqual({
      diceCount: 1,
      dieSize: 4,
    });
    expect(
      statBlockAttacks(GOBLIN_WARRIOR).shortbow.extraDamageOnAdvantageHit,
    ).toEqual({
      diceCount: 1,
      dieSize: 4,
    });
    expect(
      statBlockAttacks(GOBLIN_BOSS).scimitar.extraDamageOnAdvantageHit,
    ).toEqual({
      diceCount: 1,
      dieSize: 4,
    });
    expect(
      statBlockAttacks(GOBLIN_BOSS).shortbow.extraDamageOnAdvantageHit,
    ).toEqual({
      diceCount: 1,
      dieSize: 4,
    });
  });

  it("publishes Goblin Warrior and Goblin Boss through the generic catalog lookup", () => {
    expect(getMonsterStatBlock("goblinWarrior")).toBe(GOBLIN_WARRIOR);
    expect(getMonsterStatBlock("goblinBoss")).toBe(GOBLIN_BOSS);
  });

  it("can project a selected named stat-block attack into the battle attack lane", () => {
    const config = statBlockToInitCreatureConfig({
      id: CreatureId("goblin-warrior-1"),
      statBlock: GOBLIN_WARRIOR,
      primaryAttackName: "shortbow",
    });

    expect(config.mainHandWeapon).toMatchObject({
      name: "Shortbow",
      damageType: "piercing",
      isMelee: false,
      damageDie: 6,
      properties: new Set(["ammunition", "twoHanded"]),
      statBlockAttackSource: {
        name: "Shortbow",
        extraDamageOnAdvantageHit: { diceCount: 1, dieSize: 4 },
      },
    });
  });

  it("projects a catalog stat block into battle init without MCP-owned RAW literals", () => {
    const config = monsterCatalogInitCreatureConfig({
      id: CreatureId("goblin-1"),
      statBlockId: "goblinMinion",
    });

    expect(config).toMatchObject({
      id: CreatureId("goblin-1"),
      kind: "Monster",
      maxHp: 7,
      creatureSize: "small",
      dexMod: 2,
      baseWalkSpeed: 30,
      battleBonusActionOptions: ["disengage", "hide"],
      initiativeRoll: 12,
      mainHandWeapon: {
        name: "Dagger",
        damageType: "piercing",
        isMelee: true,
        damageDie: 4,
        properties: new Set(["finesse", "light", "thrown"]),
      },
    });
    expect(config.legendaryActions).toBeUndefined();
    expect(config.legendaryResistances).toBeUndefined();
  });

  it("uses the stat block Initiative entry, not Dexterity mod, for no-roll init fallback", () => {
    const synthetic = {
      ...GOBLIN_MINION,
      initiativeMod: abilityModifier(12),
      abilityScores: {
        ...GOBLIN_MINION.abilityScores,
        dex: 10,
      },
    };

    expect(statBlockInitiativeScore(synthetic)).toBe(22);
    const config = statBlockToInitCreatureConfig({
      id: CreatureId("dragon-1"),
      statBlock: synthetic,
    });
    expect(config.dexMod).toBe(0);
    expect(config.initiativeRoll).toBe(22);
  });

  it("accepts statBlockId on BATTLE_INIT and resolves it through the core catalog", () => {
    const command = Schema.decodeSync(ControlCommandSchema)({
      scope: "battle",
      type: "BATTLE_INIT",
      creatures: [
        {
          id: "goblin-1",
          kind: "Monster",
          statBlockId: "goblinMinion",
        },
      ],
    });

    expect(command.type).toBe("BATTLE_INIT");
    if (command.type !== "BATTLE_INIT") throw new Error("expected BATTLE_INIT");
    const config = toBattleInitCreatureConfig(command.creatures[0]);

    expect(config).toMatchObject({
      id: CreatureId("goblin-1"),
      kind: "Monster",
      maxHp: 7,
      creatureSize: "small",
      dexMod: 2,
      baseWalkSpeed: 30,
      battleBonusActionOptions: ["disengage", "hide"],
      initiativeRoll: 12,
      mainHandWeapon: {
        name: "Dagger",
        damageType: "piercing",
        isMelee: true,
        damageDie: 4,
        properties: new Set(["finesse", "light", "thrown"]),
      },
    });
  });

  it("accepts Goblin Warrior and Goblin Boss through the generic statBlockId surface", () => {
    const warriorCommand = Schema.decodeSync(ControlCommandSchema)({
      scope: "battle",
      type: "BATTLE_INIT",
      creatures: [
        {
          id: "goblin-warrior-1",
          kind: "Monster",
          statBlockId: "goblinWarrior",
        },
      ],
    });
    const bossCommand = Schema.decodeSync(ControlCommandSchema)({
      scope: "battle",
      type: "BATTLE_INIT",
      creatures: [
        {
          id: "goblin-boss-1",
          kind: "Monster",
          statBlockId: "goblinBoss",
        },
      ],
    });

    expect(warriorCommand.type).toBe("BATTLE_INIT");
    expect(bossCommand.type).toBe("BATTLE_INIT");
    if (
      warriorCommand.type !== "BATTLE_INIT" ||
      bossCommand.type !== "BATTLE_INIT"
    ) {
      throw new Error("expected BATTLE_INIT");
    }

    expect(
      toBattleInitCreatureConfig(warriorCommand.creatures[0]),
    ).toMatchObject({
      id: CreatureId("goblin-warrior-1"),
      kind: "Monster",
      maxHp: 10,
      battleBonusActionOptions: ["disengage", "hide"],
      mainHandWeapon: {
        name: "Scimitar",
        statBlockAttackSource: {
          name: "Scimitar",
          extraDamageOnAdvantageHit: { diceCount: 1, dieSize: 4 },
        },
      },
    });
    expect(toBattleInitCreatureConfig(bossCommand.creatures[0])).toMatchObject({
      id: CreatureId("goblin-boss-1"),
      kind: "Monster",
      maxHp: 21,
      battleBonusActionOptions: ["disengage", "hide"],
      battleReactionOptions: ["redirectAttack"],
      mainHandWeapon: {
        name: "Scimitar",
        statBlockAttackSource: {
          name: "Scimitar",
          extraDamageOnAdvantageHit: { diceCount: 1, dieSize: 4 },
        },
      },
    });
  });

  it("accepts generic battle bonus-action options on raw BATTLE_INIT creatures", () => {
    const command = Schema.decodeSync(ControlCommandSchema)({
      scope: "battle",
      type: "BATTLE_INIT",
      creatures: [
        {
          id: "monster-1",
          kind: "Monster",
          maxHp: 9,
          battleBonusActionOptions: ["disengage", "hide"],
        },
      ],
    });

    expect(command.type).toBe("BATTLE_INIT");
    if (command.type !== "BATTLE_INIT") throw new Error("expected BATTLE_INIT");
    const config = toBattleInitCreatureConfig(command.creatures[0]);

    expect(config).toMatchObject({
      id: CreatureId("monster-1"),
      kind: "Monster",
      maxHp: 9,
      battleBonusActionOptions: ["disengage", "hide"],
    });
  });
});
