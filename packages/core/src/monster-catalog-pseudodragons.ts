import {
  monsterSenses,
  monsterSkillBonuses,
  monsterSpeeds,
  srdRulesProvenance,
} from "#/monster-catalog-helpers.ts";
import { type StatBlock } from "#/monster-types.ts";
import { abilityModifier, armorClass } from "#/types.ts";

const PSEUDODRAGON_SOURCE_DOCUMENT =
  ".references/srd-5.2.1/Monsters/Monsters-P-S.md";

/**
 * Pseudodragon — SRD 5.2.1:
 * `.references/srd-5.2.1/Monsters/Monsters-P-S.md` > `Pseudodragon`.
 */
export const PSEUDODRAGON = {
  provenance: srdRulesProvenance(PSEUDODRAGON_SOURCE_DOCUMENT, "Pseudodragon"),
  name: "Pseudodragon",
  creatureType: "dragon",
  creatureSize: "tiny",
  ac: armorClass(14),
  initiativeMod: abilityModifier(2),
  maxHp: 10,
  hitDice: 3,
  hitDieType: 4,
  speeds: monsterSpeeds({ walk: 15, fly: 60 }),
  abilityScores: {
    str: 6,
    dex: 15,
    con: 13,
    int: 10,
    wis: 12,
    cha: 10,
  },
  saveProficiencies: new Set(),
  skillBonuses: monsterSkillBonuses({ perception: 5, stealth: 4 }),
  cr: { type: "CR_Quarter" as const },
  proficiencyBonus: 2,
  resistances: new Set(),
  vulnerabilities: new Set(),
  damageImmunities: new Set(),
  conditionImmunities: new Set(),
  exhaustionImmune: false,
  senses: monsterSenses({ blindsight: 10, darkvision: 60 }),
  passivePerception: 15,
  languages: ["Understands Common and Draconic but can't speak"],
  traits: [
    {
      kind: "text",
      id: "magicResistance",
      name: "Magic Resistance",
      text: "The pseudodragon has Advantage on saving throws against spells and other magical effects.",
      nonExecutableReason:
        "Saving-throw advantage from monster traits is not yet projected into the generic monster runtime surface.",
    },
  ],
  actions: [
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
  ],
  bonusActions: [],
  reactions: [],
  legendaryActionUses: 0,
  legendaryResistanceUses: 0,
  legendaryActions: [],
  rechargeAbilities: {},
  dailyAbilities: {},
  inLair: false,
} as const satisfies StatBlock;
