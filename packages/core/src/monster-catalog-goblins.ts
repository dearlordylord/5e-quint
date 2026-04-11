import {
  MONSTER_BATTLE_BONUS_ACTION_OPTIONS,
  type Skill,
  SKILLS,
  type StatBlock,
} from "#/monster-types.ts";
import { abilityModifier, armorClass } from "#/types.ts";

function skillBonuses(
  overrides: Partial<Record<Skill, number>>,
): Record<Skill, number> {
  const base = Object.fromEntries(SKILLS.map((skill) => [skill, 0])) as Record<
    Skill,
    number
  >;
  return { ...base, ...overrides };
}

const GOBLIN_SOURCE_DOCUMENT = ".references/srd-5.2.1/Monsters/Monsters-E-G.md";

/**
 * Goblin Minion — SRD 5.2.1:
 * `.references/srd-5.2.1/Monsters/Monsters-E-G.md` > `Goblins` >
 * `Goblin Minion`.
 */
export const GOBLIN_MINION = {
  provenance: {
    edition: "SRD 5.2.1",
    document: GOBLIN_SOURCE_DOCUMENT,
    section: "Goblins > Goblin Minion",
  },
  name: "Goblin Minion",
  creatureType: "fey",
  descriptiveTags: ["Goblinoid"],
  creatureSize: "small",
  ac: armorClass(12),
  initiativeMod: abilityModifier(2),
  maxHp: 7,
  hitDice: 2,
  hitDieType: 6,
  speeds: {
    walk: 30,
    fly: 0,
    swim: 0,
    climb: 0,
    burrow: 0,
  },
  abilityScores: {
    str: 8,
    dex: 15,
    con: 10,
    int: 10,
    wis: 8,
    cha: 8,
  },
  saveProficiencies: new Set(["dex"]),
  skillBonuses: skillBonuses({ stealth: 6 }),
  cr: { type: "CR_Eighth" as const },
  proficiencyBonus: 2,
  resistances: new Set(),
  vulnerabilities: new Set(),
  damageImmunities: new Set(),
  conditionImmunities: new Set(),
  exhaustionImmune: false,
  senses: {
    blindsight: 0,
    darkvision: 60,
    tremorsense: 0,
    truesight: 0,
  },
  passivePerception: 9,
  languages: ["Common", "Goblin"],
  gear: ["Daggers (3)"],
  traits: [],
  actions: [
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
  ],
  bonusActions: [
    {
      kind: "battleBonusAction",
      id: "nimbleEscape",
      name: "Nimble Escape",
      text: "The goblin takes the Disengage or Hide action.",
      options: MONSTER_BATTLE_BONUS_ACTION_OPTIONS,
    },
  ],
  reactions: [],
  legendaryActionUses: 0,
  legendaryResistanceUses: 0,
  legendaryActions: [],
  rechargeAbilities: {},
  dailyAbilities: {},
  spellcasting: [],
  inLair: false,
} as const satisfies StatBlock;

/**
 * Goblin Warrior — SRD 5.2.1:
 * `.references/srd-5.2.1/Monsters/Monsters-E-G.md` > `Goblins` >
 * `Goblin Warrior`.
 */
export const GOBLIN_WARRIOR = {
  provenance: {
    edition: "SRD 5.2.1",
    document: GOBLIN_SOURCE_DOCUMENT,
    section: "Goblins > Goblin Warrior",
  },
  name: "Goblin Warrior",
  creatureType: "fey",
  descriptiveTags: ["Goblinoid"],
  creatureSize: "small",
  ac: armorClass(15),
  initiativeMod: abilityModifier(2),
  maxHp: 10,
  hitDice: 3,
  hitDieType: 6,
  speeds: {
    walk: 30,
    fly: 0,
    swim: 0,
    climb: 0,
    burrow: 0,
  },
  abilityScores: {
    str: 8,
    dex: 15,
    con: 10,
    int: 10,
    wis: 8,
    cha: 8,
  },
  saveProficiencies: new Set(["dex"]),
  skillBonuses: skillBonuses({ stealth: 6 }),
  cr: { type: "CR_Quarter" as const },
  proficiencyBonus: 2,
  resistances: new Set(),
  vulnerabilities: new Set(),
  damageImmunities: new Set(),
  conditionImmunities: new Set(),
  exhaustionImmune: false,
  senses: {
    blindsight: 0,
    darkvision: 60,
    tremorsense: 0,
    truesight: 0,
  },
  passivePerception: 9,
  languages: ["Common", "Goblin"],
  gear: ["Leather Armor", "Scimitar", "Shield", "Shortbow"],
  traits: [],
  actions: [
    {
      kind: "attack",
      id: "scimitar",
      name: "Scimitar",
      text: "*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 5 (1d6 + 2) Slashing damage, plus 2 (1d4) Slashing damage if the attack roll had Advantage.",
      attack: {
        name: "Scimitar",
        attackBonus: 4,
        reach: 5,
        rangeNormal: 0,
        rangeLong: 0,
        damageAmount: 5,
        damageType: "slashing",
        isRanged: false,
        attackMode: "melee",
        extraDamageOnAdvantageHit: { diceCount: 1, dieSize: 4 },
      },
    },
    {
      kind: "attack",
      id: "shortbow",
      name: "Shortbow",
      text: "*Ranged Attack Roll:* +4, range 80/320 ft. *Hit:* 5 (1d6 + 2) Piercing damage, plus 2 (1d4) Piercing damage if the attack roll had Advantage.",
      attack: {
        name: "Shortbow",
        attackBonus: 4,
        reach: 0,
        rangeNormal: 80,
        rangeLong: 320,
        damageAmount: 5,
        damageType: "piercing",
        isRanged: true,
        attackMode: "ranged",
        extraDamageOnAdvantageHit: { diceCount: 1, dieSize: 4 },
      },
    },
  ],
  bonusActions: [
    {
      kind: "battleBonusAction",
      id: "nimbleEscape",
      name: "Nimble Escape",
      text: "The goblin takes the Disengage or Hide action.",
      options: MONSTER_BATTLE_BONUS_ACTION_OPTIONS,
    },
  ],
  reactions: [],
  legendaryActionUses: 0,
  legendaryResistanceUses: 0,
  legendaryActions: [],
  rechargeAbilities: {},
  dailyAbilities: {},
  spellcasting: [],
  inLair: false,
} as const satisfies StatBlock;

/**
 * Goblin Boss — SRD 5.2.1:
 * `.references/srd-5.2.1/Monsters/Monsters-E-G.md` > `Goblins` >
 * `Goblin Boss`.
 */
export const GOBLIN_BOSS = {
  provenance: {
    edition: "SRD 5.2.1",
    document: GOBLIN_SOURCE_DOCUMENT,
    section: "Goblins > Goblin Boss",
  },
  name: "Goblin Boss",
  creatureType: "fey",
  descriptiveTags: ["Goblinoid"],
  creatureSize: "small",
  ac: armorClass(17),
  initiativeMod: abilityModifier(2),
  maxHp: 21,
  hitDice: 6,
  hitDieType: 6,
  speeds: {
    walk: 30,
    fly: 0,
    swim: 0,
    climb: 0,
    burrow: 0,
  },
  abilityScores: {
    str: 10,
    dex: 15,
    con: 10,
    int: 10,
    wis: 8,
    cha: 10,
  },
  saveProficiencies: new Set(["dex"]),
  skillBonuses: skillBonuses({ stealth: 6 }),
  cr: { type: "CRN" as const, value: 1 },
  proficiencyBonus: 2,
  resistances: new Set(),
  vulnerabilities: new Set(),
  damageImmunities: new Set(),
  conditionImmunities: new Set(),
  exhaustionImmune: false,
  senses: {
    blindsight: 0,
    darkvision: 60,
    tremorsense: 0,
    truesight: 0,
  },
  passivePerception: 9,
  languages: ["Common", "Goblin"],
  gear: ["Chain Shirt", "Scimitar", "Shield", "Shortbow"],
  traits: [],
  actions: [
    {
      kind: "multiattack",
      id: "multiattack",
      name: "Multiattack",
      text: "The goblin makes two attacks, using Scimitar or Shortbow in any combination.",
      slots: [
        { type: "MAttack", name: "Scimitar" },
        { type: "MAttack", name: "Shortbow" },
      ],
    },
    {
      kind: "attack",
      id: "scimitar",
      name: "Scimitar",
      text: "*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 5 (1d6 + 2) Slashing damage, plus 2 (1d4) Slashing damage if the attack roll had Advantage.",
      attack: {
        name: "Scimitar",
        attackBonus: 4,
        reach: 5,
        rangeNormal: 0,
        rangeLong: 0,
        damageAmount: 5,
        damageType: "slashing",
        isRanged: false,
        attackMode: "melee",
        extraDamageOnAdvantageHit: { diceCount: 1, dieSize: 4 },
      },
    },
    {
      kind: "attack",
      id: "shortbow",
      name: "Shortbow",
      text: "*Ranged Attack Roll:* +4, range 80/320 ft. *Hit:* 5 (1d6 + 2) Piercing damage, plus 2 (1d4) Piercing damage if the attack roll had Advantage.",
      attack: {
        name: "Shortbow",
        attackBonus: 4,
        reach: 0,
        rangeNormal: 80,
        rangeLong: 320,
        damageAmount: 5,
        damageType: "piercing",
        isRanged: true,
        attackMode: "ranged",
        extraDamageOnAdvantageHit: { diceCount: 1, dieSize: 4 },
      },
    },
  ],
  bonusActions: [
    {
      kind: "battleBonusAction",
      id: "nimbleEscape",
      name: "Nimble Escape",
      text: "The goblin takes the Disengage or Hide action.",
      options: MONSTER_BATTLE_BONUS_ACTION_OPTIONS,
    },
  ],
  reactions: [
    {
      kind: "battleReaction",
      id: "redirectAttack",
      name: "Redirect Attack",
      text: "*Trigger:* A creature the goblin can see makes an attack roll against it. *Response:* The goblin chooses a Small or Medium ally within 5 feet of itself. The goblin and that ally swap places, and the ally becomes the target of the attack instead.",
      option: "redirectAttack",
    },
  ],
  legendaryActionUses: 0,
  legendaryResistanceUses: 0,
  legendaryActions: [],
  rechargeAbilities: {},
  dailyAbilities: {},
  spellcasting: [],
  inLair: false,
} as const satisfies StatBlock;
