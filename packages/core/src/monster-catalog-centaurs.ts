import { SKILLS, type Skill, type StatBlock } from "#/monster-types.ts";
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

const CENTAUR_SOURCE_DOCUMENT =
  ".references/srd-5.2.1/Monsters/Monsters-C-D.md";

/**
 * Centaur Trooper — SRD 5.2.1:
 * `.references/srd-5.2.1/Monsters/Monsters-C-D.md` > `Centaur Trooper`.
 *
 * MON3 tracer bullet: proves the generic authored recharge facility.
 */
export const CENTAUR_TROOPER = {
  provenance: {
    edition: "SRD 5.2.1",
    document: CENTAUR_SOURCE_DOCUMENT,
    section: "Centaur Trooper",
  },
  name: "Centaur Trooper",
  creatureType: "fey",
  creatureSize: "large",
  ac: armorClass(16),
  initiativeMod: abilityModifier(2),
  maxHp: 45,
  hitDice: 6,
  hitDieType: 10,
  speeds: {
    walk: 50,
    fly: 0,
    swim: 0,
    climb: 0,
    burrow: 0,
  },
  abilityScores: {
    str: 18,
    dex: 14,
    con: 14,
    int: 9,
    wis: 13,
    cha: 11,
  },
  saveProficiencies: new Set(),
  skillBonuses: skillBonuses({ athletics: 6, perception: 3 }),
  cr: { type: "CRN", value: 2 },
  proficiencyBonus: 2,
  resistances: new Set(),
  vulnerabilities: new Set(),
  damageImmunities: new Set(),
  conditionImmunities: new Set(),
  exhaustionImmune: false,
  senses: {
    blindsight: 0,
    darkvision: 0,
    tremorsense: 0,
    truesight: 0,
  },
  passivePerception: 13,
  languages: ["Elvish", "Sylvan"],
  gear: ["Breastplate", "Longbow", "Pike"],
  traits: [],
  actions: [
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
  ],
  bonusActions: [
    {
      kind: "text",
      id: "tramplingCharge",
      name: "Trampling Charge",
      text: "The centaur moves up to its Speed without provoking Opportunity Attacks and can move through the spaces of Medium or smaller creatures. Each creature whose space the centaur enters is targeted once by the following effect. *Strength Saving Throw:* DC 14. *Failure:* 7 (1d6 + 4) Bludgeoning damage, and the target has the Prone condition.",
      nonExecutableReason:
        "Recharge-gated movement plus saving-throw bonus-action resolution is not yet projected into the generic monster runtime surface.",
    },
  ],
  reactions: [],
  legendaryActionUses: 0,
  legendaryResistanceUses: 0,
  legendaryActions: [],
  rechargeAbilities: {
    tramplingCharge: {
      name: "Trampling Charge",
      rechargeMin: 5,
    },
  },
  dailyAbilities: {},
  spellcasting: [],
  inLair: false,
} as const satisfies StatBlock;
