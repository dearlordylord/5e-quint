import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  ControlCommandSchema,
  toBattleInitCreatureConfig,
} from "#/available-actions.ts";
import {
  CENTAUR_TROOPER,
  getMonsterStatBlock,
  GOBLIN_BOSS,
  GOBLIN_MINION,
  GOBLIN_WARRIOR,
  MONSTER_STAT_BLOCK_IDS,
  MONSTER_STAT_BLOCK_PROVENANCE,
  monsterCatalogInitCreatureConfig,
  PSEUDODRAGON,
  statBlockAttacks,
  statBlockBattleBonusActionOptions,
  statBlockBattleReactionOptions,
  statBlockInitiativeScore,
  statBlockMultiattack,
  statBlockRechargeMinRolls,
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
      "centaurTrooper",
      "goblinMinion",
      "goblinWarrior",
      "goblinBoss",
      "pseudodragon",
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

  it("stores Centaur Trooper as an SRD-backed stat block with authored recharge metadata", () => {
    const statBlock = getMonsterStatBlock("centaurTrooper");

    expect(statBlock).toBe(CENTAUR_TROOPER);
    expect(statBlock.provenance).toEqual({
      edition: "SRD 5.2.1",
      document: ".references/srd-5.2.1/Monsters/Monsters-C-D.md",
      section: "Centaur Trooper",
    });
    expect(statBlock.actions).toEqual([
      {
        kind: "multiattack",
        id: "multiattack",
        name: "Multiattack",
        text: "The centaur makes two attacks, using Pike or Longbow in any combination.",
        slots: [
          { type: "MAttack", name: "Pike" },
          { type: "MAttack", name: "Longbow" },
        ],
      },
      {
        kind: "attack",
        id: "pike",
        name: "Pike",
        text: "*Melee Attack Roll:* +6, reach 10 ft. *Hit:* 9 (1d10 + 4) Piercing damage.",
        attack: {
          name: "Pike",
          attackBonus: 6,
          reach: 10,
          rangeNormal: 0,
          rangeLong: 0,
          damageAmount: 9,
          damageType: "piercing",
          isRanged: false,
          attackMode: "melee",
        },
      },
      {
        kind: "attack",
        id: "longbow",
        name: "Longbow",
        text: "*Ranged Attack Roll:* +4, range 150/600 ft. *Hit:* 6 (1d8 + 2) Piercing damage.",
        attack: {
          name: "Longbow",
          attackBonus: 4,
          reach: 0,
          rangeNormal: 150,
          rangeLong: 600,
          damageAmount: 6,
          damageType: "piercing",
          isRanged: true,
          attackMode: "ranged",
        },
      },
    ]);
    expect(statBlock.bonusActions).toEqual([
      {
        kind: "text",
        id: "tramplingCharge",
        name: "Trampling Charge",
        text: "The centaur moves up to its Speed without provoking Opportunity Attacks and can move through the spaces of Medium or smaller creatures. Each creature whose space the centaur enters is targeted once by the following effect. *Strength Saving Throw:* DC 14. *Failure:* 7 (1d6 + 4) Bludgeoning damage, and the target has the Prone condition.",
        nonExecutableReason:
          "Recharge-gated movement plus saving-throw bonus-action resolution is not yet projected into the generic monster runtime surface.",
      },
    ]);
    expect(statBlockRechargeMinRolls(statBlock)).toEqual({
      tramplingCharge: 5,
    });
  });

  it("stores Pseudodragon as an SRD-backed authored stat block with text-preserved unsupported actions", () => {
    const statBlock = getMonsterStatBlock("pseudodragon");

    expect(statBlock).toBe(PSEUDODRAGON);
    expect(statBlock.provenance).toEqual({
      edition: "SRD 5.2.1",
      document: ".references/srd-5.2.1/Monsters/Monsters-P-S.md",
      section: "Pseudodragon",
    });
    expect(statBlock.name).toBe("Pseudodragon");
    expect(statBlock.creatureType).toBe("dragon");
    expect(statBlock.creatureSize).toBe("tiny");
    expect(statBlock.ac).toBe(14);
    expect(statBlock.initiativeMod).toBe(2);
    expect(statBlock.maxHp).toBe(10);
    expect(statBlock.hitDice).toBe(3);
    expect(statBlock.hitDieType).toBe(4);
    expect(statBlock.speeds).toEqual({
      walk: 15,
      fly: 60,
      swim: 0,
      climb: 0,
      burrow: 0,
    });
    expect(statBlock.abilityScores).toEqual({
      str: 6,
      dex: 15,
      con: 13,
      int: 10,
      wis: 12,
      cha: 10,
    });
    expect([...statBlock.saveProficiencies]).toEqual([]);
    expect(statBlock.skillBonuses.perception).toBe(5);
    expect(statBlock.skillBonuses.stealth).toBe(4);
    expect(statBlock.senses).toEqual({
      blindsight: 10,
      darkvision: 60,
      tremorsense: 0,
      truesight: 0,
    });
    expect(statBlock.passivePerception).toBe(15);
    expect(statBlock.languages).toEqual([
      "Understands Common and Draconic but can't speak",
    ]);
    expect(statBlock.cr).toEqual({ type: "CR_Quarter" });
    expect(statBlock.proficiencyBonus).toBe(2);
    expect(statBlock.traits).toEqual([
      {
        kind: "text",
        id: "magicResistance",
        name: "Magic Resistance",
        text: "The pseudodragon has Advantage on saving throws against spells and other magical effects.",
        nonExecutableReason:
          "Saving-throw advantage from monster traits is not yet projected into the generic monster runtime surface.",
      },
    ]);
    expect(statBlock.actions).toEqual([
      {
        kind: "multiattack",
        id: "multiattack",
        name: "Multiattack",
        text: "The pseudodragon makes two Bite attacks.",
        slots: [
          { type: "MAttack", name: "Bite" },
          { type: "MAttack", name: "Bite" },
        ],
      },
      {
        kind: "attack",
        id: "bite",
        name: "Bite",
        text: "*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 4 (1d4 + 2) Piercing damage.",
        attack: {
          name: "Bite",
          attackBonus: 4,
          reach: 5,
          rangeNormal: 0,
          rangeLong: 0,
          damageAmount: 4,
          damageType: "piercing",
          isRanged: false,
          attackMode: "melee",
        },
      },
      {
        kind: "text",
        id: "sting",
        name: "Sting",
        text: "*Constitution Saving Throw:* DC 12, one creature the pseudodragon can see within 5 feet. *Failure:* 5 (2d4) Poison damage, and the target has the Poisoned condition for 1 hour. *Failure by 5 or More:* While Poisoned, the target also has the Unconscious condition, which ends early if the target takes damage or a creature within 5 feet of it takes an action to wake it.",
        nonExecutableReason:
          "Saving-throw actions with conditional failure bands are not yet projected into the generic monster runtime surface.",
      },
    ]);
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

  it("can project Pseudodragon through the same generic battle-init path", () => {
    const config = monsterCatalogInitCreatureConfig({
      id: CreatureId("pseudodragon-1"),
      statBlockId: "pseudodragon",
    });

    expect(statBlockMultiattack(PSEUDODRAGON)).toEqual([
      { type: "MAttack", name: "Bite" },
      { type: "MAttack", name: "Bite" },
    ]);
    expect(statBlockAttacks(PSEUDODRAGON).bite).toEqual({
      name: "Bite",
      attackBonus: 4,
      reach: 5,
      rangeNormal: 0,
      rangeLong: 0,
      damageAmount: 4,
      damageType: "piercing",
      isRanged: false,
      attackMode: "melee",
    });
    expect(config).toMatchObject({
      id: CreatureId("pseudodragon-1"),
      kind: "Monster",
      maxHp: 10,
      creatureSize: "tiny",
      strMod: -2,
      dexMod: 2,
      baseWalkSpeed: 15,
      battleBonusActionOptions: [],
      battleReactionOptions: [],
      initiativeRoll: 12,
      mainHandWeapon: {
        name: "Bite",
        damageType: "piercing",
        isMelee: true,
        damageDie: 4,
        properties: new Set([]),
        statBlockAttackSource: {
          name: "Bite",
        },
      },
    });
  });

  it("projects authored recharge metadata through the generic monster init path", () => {
    const config = monsterCatalogInitCreatureConfig({
      id: CreatureId("centaur-1"),
      statBlockId: "centaurTrooper",
    });

    expect(statBlockMultiattack(CENTAUR_TROOPER)).toEqual([
      { type: "MAttack", name: "Pike" },
      { type: "MAttack", name: "Longbow" },
    ]);
    expect(config).toMatchObject({
      id: CreatureId("centaur-1"),
      kind: "Monster",
      creatureSize: "large",
      strMod: 4,
      dexMod: 2,
      baseWalkSpeed: 50,
      rechargeAvailable: { tramplingCharge: false },
      rechargeMinRolls: { tramplingCharge: 5 },
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
      strMod: -1,
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
      strMod: -1,
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

  it("accepts Pseudodragon through the generic statBlockId surface without a monster-specific handler", () => {
    const command = Schema.decodeSync(ControlCommandSchema)({
      scope: "battle",
      type: "BATTLE_INIT",
      creatures: [
        {
          id: "pseudodragon-1",
          kind: "Monster",
          statBlockId: "pseudodragon",
        },
      ],
    });

    expect(command.type).toBe("BATTLE_INIT");
    if (command.type !== "BATTLE_INIT") throw new Error("expected BATTLE_INIT");

    expect(toBattleInitCreatureConfig(command.creatures[0])).toMatchObject({
      id: CreatureId("pseudodragon-1"),
      kind: "Monster",
      maxHp: 10,
      creatureSize: "tiny",
      initiativeRoll: 12,
      mainHandWeapon: {
        name: "Bite",
        statBlockAttackSource: {
          name: "Bite",
        },
      },
    });
  });

  it("accepts Centaur Trooper through the generic statBlockId surface", () => {
    const command = Schema.decodeSync(ControlCommandSchema)({
      scope: "battle",
      type: "BATTLE_INIT",
      creatures: [
        {
          id: "centaur-1",
          kind: "Monster",
          statBlockId: "centaurTrooper",
        },
      ],
    });

    expect(command.type).toBe("BATTLE_INIT");
    if (command.type !== "BATTLE_INIT") throw new Error("expected BATTLE_INIT");

    expect(toBattleInitCreatureConfig(command.creatures[0])).toMatchObject({
      id: CreatureId("centaur-1"),
      kind: "Monster",
      creatureSize: "large",
      rechargeAvailable: { tramplingCharge: false },
      rechargeMinRolls: { tramplingCharge: 5 },
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
