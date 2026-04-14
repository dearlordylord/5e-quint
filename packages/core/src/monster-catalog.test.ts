import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { projectBattleWeaponProfile } from "#/character-equipment.ts";
import {
  ControlCommandSchema,
  toBattleInitCreatureConfig,
} from "#/available-actions.ts";
import { MONSTER_CATALOG_UNSUPPORTED_AUDIT } from "#/monster-catalog-audit.ts";
import {
  CANONICAL_SRD_MONSTER_PROVENANCE,
  ABOLETH,
  CENTAUR_TROOPER,
  getMonsterStatBlock,
  GOBLIN_BOSS,
  GOBLIN_MINION,
  GOBLIN_WARRIOR,
  HARPY,
  KNIGHT,
  KOBOLD_WARRIOR,
  MAGE,
  MONSTER_STAT_BLOCK_IDS,
  MONSTER_STAT_BLOCK_PROVENANCE,
  monsterCatalogInitCreatureConfig,
  OGRE,
  PSEUDODRAGON,
  PRIEST,
  SAHUAGIN_WARRIOR,
  SCOUT,
  statBlockAttacks,
  statBlockAttackBattleProfile,
  statBlockAbilityName,
  statBlockBattleBonusActionOptions,
  statBlockBattleReactionOptions,
  statBlockInitiativeScore,
  statBlockLegendaryAction,
  statBlockMultiattack,
  statBlockRechargeMinRolls,
  statBlockToInitCreatureConfig,
} from "#/monster-catalog.ts";
import { CreatureId, abilityModifier, spellId } from "#/types.ts";

describe("monster catalog", () => {
  it("documents the core-owned SRD provenance rules", () => {
    expect(MONSTER_STAT_BLOCK_PROVENANCE.defaultSource).toBe(
      ".references/srd-5.2.1/",
    );
    expect(MONSTER_STAT_BLOCK_PROVENANCE.defaultSourceName).toBe(
      CANONICAL_SRD_MONSTER_PROVENANCE.sourceName,
    );
    expect(MONSTER_STAT_BLOCK_PROVENANCE.defaultSourceKind).toBe(
      CANONICAL_SRD_MONSTER_PROVENANCE.sourceKind,
    );
    expect(MONSTER_STAT_BLOCK_PROVENANCE.defaultLicense).toBe(
      CANONICAL_SRD_MONSTER_PROVENANCE.license,
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
      provenance: {
        sourceName: "srd-5.2.1",
        sourceKind: "canonicalRulesText",
        license: "CC-BY-4.0",
        citation: {
          document: ".references/srd-5.2.1/Monsters/Monsters-E-G.md",
          section: "Goblins > Goblin Minion",
        },
      },
    });
    expect("role" in statBlock.provenance.provenance).toBe(false);
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
          battleProfile: { kind: "stockWeapon" },
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

  it("stores Aboleth as an SRD-backed authored stat block", () => {
    const statBlock = getMonsterStatBlock("aboleth");

    expect(statBlock.provenance).toEqual({
      provenance: {
        sourceName: "srd-5.2.1",
        sourceKind: "canonicalRulesText",
        license: "CC-BY-4.0",
        citation: {
          document: ".references/srd-5.2.1/Monsters/Monsters-A-B.md",
          section: "Aboleth",
        },
      },
    });
    expect(statBlock.name).toBe("Aboleth");
    expect(statBlock.legendaryActionUses).toBe(3);
    expect(statBlock.legendaryResistanceUses).toBe(3);
    expect(statBlock.dailyAbilities).toEqual({ dominateMind: 2 });
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
      battleProfile: { kind: "stockWeapon" },
    });
  });

  it("stores goblin rider metadata on authored attacks without exposing new public IDs", () => {
    expect(MONSTER_STAT_BLOCK_IDS).toEqual([
      "aboleth",
      "centaurTrooper",
      "goblinMinion",
      "goblinWarrior",
      "goblinBoss",
      "harpy",
      "knight",
      "koboldWarrior",
      "mage",
      "ogre",
      "pseudodragon",
      "priest",
      "sahuaginWarrior",
      "scout",
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

  it("reuses the shared equipment weapon table for goblin stock-weapon projections", () => {
    expect(statBlockAttackBattleProfile(GOBLIN_MINION, "dagger")).toEqual({
      ...projectBattleWeaponProfile("dagger"),
      statBlockAttackSource: {
        name: "Dagger",
      },
    });
    expect(statBlockAttackBattleProfile(GOBLIN_WARRIOR, "scimitar")).toEqual({
      ...projectBattleWeaponProfile("scimitar"),
      statBlockAttackSource: {
        name: "Scimitar",
        extraDamageOnAdvantageHit: { diceCount: 1, dieSize: 4 },
      },
    });
    expect(statBlockAttackBattleProfile(GOBLIN_WARRIOR, "shortbow")).toEqual({
      ...projectBattleWeaponProfile("shortbow"),
      statBlockAttackSource: {
        name: "Shortbow",
        extraDamageOnAdvantageHit: { diceCount: 1, dieSize: 4 },
      },
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
      provenance: {
        sourceName: "srd-5.2.1",
        sourceKind: "canonicalRulesText",
        license: "CC-BY-4.0",
        citation: {
          document: ".references/srd-5.2.1/Monsters/Monsters-C-D.md",
          section: "Centaur Trooper",
        },
      },
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
          battleProfile: { kind: "stockWeapon" },
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
          battleProfile: { kind: "stockWeapon" },
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
      provenance: {
        sourceName: "srd-5.2.1",
        sourceKind: "canonicalRulesText",
        license: "CC-BY-4.0",
        citation: {
          document: ".references/srd-5.2.1/Monsters/Monsters-P-S.md",
          section: "Pseudodragon",
        },
      },
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
          battleProfile: {
            kind: "naturalWeapon",
            damageDie: 4,
            properties: [],
          },
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

  it("stores Harpy as an SRD-backed authored stat block with a text-preserved unsupported action", () => {
    const statBlock = getMonsterStatBlock("harpy");

    expect(statBlock).toBe(HARPY);
    expect(statBlock.provenance).toEqual({
      provenance: {
        sourceName: "srd-5.2.1",
        sourceKind: "canonicalRulesText",
        license: "CC-BY-4.0",
        citation: {
          document: ".references/srd-5.2.1/Monsters/Monsters-H-L.md",
          section: "Harpy",
        },
      },
    });
    expect(statBlock.name).toBe("Harpy");
    expect(statBlock.creatureType).toBe("monstrosity");
    expect(statBlock.creatureSize).toBe("medium");
    expect(statBlock.ac).toBe(11);
    expect(statBlock.initiativeMod).toBe(1);
    expect(statBlock.maxHp).toBe(38);
    expect(statBlock.hitDice).toBe(7);
    expect(statBlock.hitDieType).toBe(8);
    expect(statBlock.speeds).toEqual({
      walk: 20,
      fly: 40,
      swim: 0,
      climb: 0,
      burrow: 0,
    });
    expect(statBlock.abilityScores).toEqual({
      str: 12,
      dex: 13,
      con: 12,
      int: 7,
      wis: 10,
      cha: 13,
    });
    expect([...statBlock.saveProficiencies]).toEqual([]);
    expect(statBlock.passivePerception).toBe(10);
    expect(statBlock.languages).toEqual(["Common"]);
    expect(statBlock.actions).toEqual([
      {
        kind: "attack",
        id: "claw",
        name: "Claw",
        text: "*Melee Attack Roll:* +3, reach 5 ft. *Hit:* 6 (2d4 + 1) Slashing damage.",
        attack: {
          name: "Claw",
          attackBonus: 3,
          reach: 5,
          rangeNormal: 0,
          rangeLong: 0,
          damageAmount: 6,
          damageType: "slashing",
          isRanged: false,
          attackMode: "melee",
          battleProfile: {
            kind: "naturalWeapon",
            damageDie: 4,
            diceCount: 2,
            properties: [],
          },
        },
      },
      {
        kind: "text",
        id: "luringSong",
        name: "Luring Song",
        text: "The harpy sings a magical melody, which lasts until the harpy's Concentration ends on it. *Wisdom Saving Throw:* DC 11, each Humanoid and Giant in a 300-foot Emanation originating from the harpy when the song starts. *Failure:* The target has the Charmed condition until the song ends and repeats the save at the end of each of its turns. While Charmed, the target has the Incapacitated condition and ignores the Luring Song of other harpies. If the target is more than 5 feet from the harpy, the target moves on its turn toward the harpy by the most direct route, trying to get within 5 feet of the harpy. It doesn't avoid Opportunity Attacks; however, before moving into damaging terrain (such as lava or a pit) and whenever it takes damage from a source other than the harpy, the target repeats the save. *Success:* The target is immune to this harpy's Luring Song for 24 hours.",
        nonExecutableReason:
          "Area charm songs with repeated saves, forced movement, and concentration are not yet projected into the generic monster runtime surface.",
      },
    ]);
  });

  it("stores Mage and Priest spellcasting inside authored action-economy sections", () => {
    expect(getMonsterStatBlock("mage")).toBe(MAGE);
    expect(getMonsterStatBlock("priest")).toBe(PRIEST);
    expect(MAGE.actions).toContainEqual({
      kind: "spellcasting",
      id: "spellcasting",
      name: "Spellcasting",
      text: "The mage casts one of the following spells, using Intelligence as the spellcasting ability (spell save DC 14).",
      spellcastingAbility: "int",
      saveDc: 14,
      spells: [
        { spellId: spellId("detect_magic"), usage: "At Will" },
        { spellId: spellId("light"), usage: "At Will" },
        {
          spellId: spellId("mage_armor"),
          usage: "At Will",
          notes: "included in AC",
        },
        { spellId: spellId("mage_hand"), usage: "At Will" },
        { spellId: spellId("prestidigitation"), usage: "At Will" },
        { spellId: spellId("fireball"), usage: "2/Day Each", castLevel: 4 },
        { spellId: spellId("invisibility"), usage: "2/Day Each" },
        { spellId: spellId("cone_of_cold"), usage: "1/Day Each" },
        { spellId: spellId("fly"), usage: "1/Day Each" },
      ],
    });
    expect(PRIEST.bonusActions).toContainEqual({
      kind: "spellcasting",
      id: "divineAid",
      name: "Divine Aid",
      text: "The priest casts *Bless*, *Dispel Magic*, *Healing Word*, or *Lesser Restoration*, using the same spellcasting ability as Spellcasting.",
      spellcastingAbility: "wis",
      spells: [
        { spellId: spellId("bless"), usage: "3/Day" },
        { spellId: spellId("dispel_magic"), usage: "3/Day" },
        { spellId: spellId("healing_word"), usage: "3/Day" },
        { spellId: spellId("lesser_restoration"), usage: "3/Day" },
      ],
    });
  });

  it("adds the expanded SRD dataset as authored stat blocks with explicit provenance", () => {
    expect(getMonsterStatBlock("knight")).toBe(KNIGHT);
    expect(getMonsterStatBlock("koboldWarrior")).toBe(KOBOLD_WARRIOR);
    expect(getMonsterStatBlock("ogre")).toBe(OGRE);
    expect(getMonsterStatBlock("sahuaginWarrior")).toBe(SAHUAGIN_WARRIOR);
    expect(getMonsterStatBlock("scout")).toBe(SCOUT);
    expect(KNIGHT.provenance).toEqual({
      provenance: {
        sourceName: "srd-5.2.1",
        sourceKind: "canonicalRulesText",
        license: "CC-BY-4.0",
        citation: {
          document: ".references/srd-5.2.1/Monsters/Monsters-H-L.md",
          section: "Knight",
        },
      },
    });
    expect(KOBOLD_WARRIOR.traits).toEqual([
      {
        kind: "text",
        id: "packTactics",
        name: "Pack Tactics",
        text: "The kobold has Advantage on an attack roll against a creature if at least one of the kobold's allies is within 5 feet of the creature and the ally doesn't have the Incapacitated condition.",
        nonExecutableReason:
          "Conditional ally-based attack advantage from monster traits is not yet projected into the generic monster runtime surface.",
      },
      {
        kind: "text",
        id: "sunlightSensitivity",
        name: "Sunlight Sensitivity",
        text: "While in sunlight, the kobold has Disadvantage on ability checks and attack rolls.",
        nonExecutableReason:
          "Environment-gated attack and test penalties from monster traits are not yet projected into the generic monster runtime surface.",
      },
    ]);
    expect(SAHUAGIN_WARRIOR.bonusActions).toEqual([
      {
        kind: "text",
        id: "aquaticCharge",
        name: "Aquatic Charge",
        text: "The sahuagin swims up to its Swim Speed straight toward an enemy it can see.",
        nonExecutableReason:
          "Monster-only bonus-action movement without an attached generic attack or save effect is not yet projected into the generic monster runtime surface.",
      },
    ]);
    expect(SCOUT.actions).toEqual([
      {
        kind: "multiattack",
        id: "multiattack",
        name: "Multiattack",
        text: "The scout makes two attacks, using Shortsword and Longbow in any combination.",
        slots: [
          { type: "MAttack", name: "Shortsword" },
          { type: "MAttack", name: "Longbow" },
        ],
      },
      {
        kind: "attack",
        id: "shortsword",
        name: "Shortsword",
        text: "*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 5 (1d6 + 2) Piercing damage.",
        attack: {
          name: "Shortsword",
          attackBonus: 4,
          reach: 5,
          rangeNormal: 0,
          rangeLong: 0,
          damageAmount: 5,
          damageType: "piercing",
          isRanged: false,
          attackMode: "melee",
          battleProfile: { kind: "stockWeapon" },
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
          battleProfile: { kind: "stockWeapon" },
        },
      },
    ]);
  });

  it("publishes a code-derived audit of unsupported monster patterns", () => {
    expect(MONSTER_CATALOG_UNSUPPORTED_AUDIT).toEqual(
      expect.arrayContaining([
        {
          statBlockId: "pseudodragon",
          monsterName: "Pseudodragon",
          section: "actions",
          abilityId: "sting",
          abilityName: "Sting",
          pattern: "textOnlyAbility",
          reason:
            "Saving-throw actions with conditional failure bands are not yet projected into the generic monster runtime surface.",
        },
        {
          statBlockId: "harpy",
          monsterName: "Harpy",
          section: "actions",
          abilityId: "luringSong",
          abilityName: "Luring Song",
          pattern: "textOnlyAbility",
          reason:
            "Area charm songs with repeated saves, forced movement, and concentration are not yet projected into the generic monster runtime surface.",
        },
        {
          statBlockId: "mage",
          monsterName: "Mage",
          section: "actions",
          abilityId: "spellcasting",
          abilityName: "Spellcasting",
          pattern: "structuredSpellcasting",
          reason:
            "Spellcasting is cataloged structurally, but monster spell resolution still needs the generic spellcasting execution surface tracked by MCPA6.",
        },
        {
          statBlockId: "knight",
          monsterName: "Knight",
          section: "reactions",
          abilityId: "parry",
          abilityName: "Parry",
          pattern: "textOnlyAbility",
          reason:
            "Reactive AC boosts are not yet projected into the generic monster runtime surface.",
        },
      ]),
    );
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

  it("can project an attack-shaped legendary action through the generic battle attack lane", () => {
    expect(statBlockLegendaryAction(ABOLETH, "lash")).toMatchObject({
      kind: "legendaryAction",
      id: "lash",
      cost: 1,
      attackId: "tentacle",
    });
    expect(statBlockAttackBattleProfile(ABOLETH, "tentacle")).toMatchObject({
      name: "Tentacle",
      damageType: "bludgeoning",
      isMelee: true,
      damageDie: 6,
      properties: new Set(["reach"]),
    });
    expect(statBlockAbilityName(ABOLETH, "dominateMind")).toBe("Dominate Mind");
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
      battleProfile: {
        kind: "naturalWeapon",
        damageDie: 4,
        properties: [],
      },
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

  it("can project Harpy through the same generic battle-init path", () => {
    const config = monsterCatalogInitCreatureConfig({
      id: CreatureId("harpy-1"),
      statBlockId: "harpy",
    });

    expect(statBlockAttacks(HARPY).claw).toEqual({
      name: "Claw",
      attackBonus: 3,
      reach: 5,
      rangeNormal: 0,
      rangeLong: 0,
      damageAmount: 6,
      damageType: "slashing",
      isRanged: false,
      attackMode: "melee",
      battleProfile: {
        kind: "naturalWeapon",
        damageDie: 4,
        diceCount: 2,
        properties: [],
      },
    });
    expect(statBlockAttackBattleProfile(HARPY, "claw")).toEqual({
      name: "Claw",
      damageType: "slashing",
      isMelee: true,
      damageDie: 4,
      diceCount: 2,
      properties: new Set([]),
      statBlockAttackSource: {
        name: "Claw",
      },
    });
    expect(config).toMatchObject({
      id: CreatureId("harpy-1"),
      kind: "Monster",
      maxHp: 38,
      creatureSize: "medium",
      strMod: 1,
      dexMod: 1,
      baseWalkSpeed: 20,
      battleBonusActionOptions: [],
      battleReactionOptions: [],
      initiativeRoll: 11,
      mainHandWeapon: {
        name: "Claw",
        damageType: "slashing",
        isMelee: true,
        damageDie: 4,
        diceCount: 2,
        properties: new Set([]),
        statBlockAttackSource: {
          name: "Claw",
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

  it("accepts Harpy through the generic statBlockId surface without a monster-specific handler", () => {
    const command = Schema.decodeSync(ControlCommandSchema)({
      scope: "battle",
      type: "BATTLE_INIT",
      creatures: [
        {
          id: "harpy-1",
          kind: "Monster",
          statBlockId: "harpy",
        },
      ],
    });

    expect(command.type).toBe("BATTLE_INIT");
    if (command.type !== "BATTLE_INIT") throw new Error("expected BATTLE_INIT");

    expect(toBattleInitCreatureConfig(command.creatures[0])).toMatchObject({
      id: CreatureId("harpy-1"),
      kind: "Monster",
      maxHp: 38,
      creatureSize: "medium",
      initiativeRoll: 11,
      mainHandWeapon: {
        name: "Claw",
        diceCount: 2,
        statBlockAttackSource: {
          name: "Claw",
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

  it("accepts Aboleth through the generic statBlockId surface", () => {
    const command = Schema.decodeSync(ControlCommandSchema)({
      scope: "battle",
      type: "BATTLE_INIT",
      creatures: [
        {
          id: "aboleth-1",
          kind: "Monster",
          statBlockId: "aboleth",
        },
      ],
    });

    expect(command.type).toBe("BATTLE_INIT");
    if (command.type !== "BATTLE_INIT") throw new Error("expected BATTLE_INIT");

    expect(toBattleInitCreatureConfig(command.creatures[0])).toMatchObject({
      id: CreatureId("aboleth-1"),
      kind: "Monster",
      monsterStatBlockId: "aboleth",
      dailyUsesRemaining: { dominateMind: 2 },
      legendaryActions: 3,
      legendaryResistances: 3,
    });
  });

  it("accepts generic named monster control commands keyed by monsterId and abilityId", () => {
    expect(
      Schema.decodeSync(ControlCommandSchema)({
        scope: "battle",
        type: "USE_LEGENDARY_ACTION",
        monsterId: "aboleth-1",
        abilityId: "lash",
      }),
    ).toMatchObject({
      type: "USE_LEGENDARY_ACTION",
      abilityId: "lash",
    });

    expect(
      Schema.decodeSync(ControlCommandSchema)({
        scope: "battle",
        type: "USE_RECHARGE_ABILITY",
        monsterId: "centaur-1",
        abilityId: "tramplingCharge",
      }),
    ).toMatchObject({
      type: "USE_RECHARGE_ABILITY",
      abilityId: "tramplingCharge",
    });

    expect(
      Schema.decodeSync(ControlCommandSchema)({
        scope: "battle",
        type: "USE_DAILY_ABILITY",
        monsterId: "aboleth-1",
        abilityId: "dominateMind",
      }),
    ).toMatchObject({
      type: "USE_DAILY_ABILITY",
      abilityId: "dominateMind",
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

  it("still projects expanded-dataset monsters through the same generic init surface", () => {
    expect(
      monsterCatalogInitCreatureConfig({
        id: CreatureId("kobold-1"),
        statBlockId: "koboldWarrior",
      }),
    ).toMatchObject({
      id: CreatureId("kobold-1"),
      kind: "Monster",
      maxHp: 7,
      creatureSize: "small",
      baseWalkSpeed: 30,
      initiativeRoll: 12,
      mainHandWeapon: {
        name: "Dagger",
      },
    });

    expect(
      monsterCatalogInitCreatureConfig({
        id: CreatureId("mage-1"),
        statBlockId: "mage",
      }),
    ).toMatchObject({
      id: CreatureId("mage-1"),
      kind: "Monster",
      maxHp: 81,
      creatureSize: "medium",
      baseWalkSpeed: 30,
      initiativeRoll: 12,
    });

    expect(
      monsterCatalogInitCreatureConfig({
        id: CreatureId("ogre-1"),
        statBlockId: "ogre",
      }),
    ).toMatchObject({
      id: CreatureId("ogre-1"),
      kind: "Monster",
      maxHp: 68,
      creatureSize: "large",
      baseWalkSpeed: 40,
      initiativeRoll: 9,
    });
  });
});
