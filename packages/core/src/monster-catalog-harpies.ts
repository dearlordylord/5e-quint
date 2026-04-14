import {
  monsterSenses,
  monsterSkillBonuses,
  monsterSpeeds,
  srdRulesProvenance,
} from "#/monster-catalog-helpers.ts";
import { type StatBlock } from "#/monster-types.ts";
import { abilityModifier, armorClass } from "#/types.ts";

const H_TO_L_SOURCE_DOCUMENT = ".references/srd-5.2.1/Monsters/Monsters-H-L.md";

/**
 * Harpy — SRD 5.2.1:
 * `.references/srd-5.2.1/Monsters/Monsters-H-L.md` > `Harpy`.
 */
export const HARPY = {
  provenance: srdRulesProvenance(H_TO_L_SOURCE_DOCUMENT, "Harpy"),
  name: "Harpy",
  creatureType: "monstrosity",
  creatureSize: "medium",
  ac: armorClass(11),
  initiativeMod: abilityModifier(1),
  maxHp: 38,
  hitDice: 7,
  hitDieType: 8,
  speeds: monsterSpeeds({ walk: 20, fly: 40 }),
  abilityScores: {
    str: 12,
    dex: 13,
    con: 12,
    int: 7,
    wis: 10,
    cha: 13,
  },
  saveProficiencies: new Set(),
  skillBonuses: monsterSkillBonuses({}),
  cr: { type: "CRN", value: 1 },
  proficiencyBonus: 2,
  resistances: new Set(),
  vulnerabilities: new Set(),
  damageImmunities: new Set(),
  conditionImmunities: new Set(),
  exhaustionImmune: false,
  senses: monsterSenses({}),
  passivePerception: 10,
  languages: ["Common"],
  traits: [],
  actions: [
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
