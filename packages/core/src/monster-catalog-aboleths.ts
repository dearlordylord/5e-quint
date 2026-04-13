import {
  monsterSenses,
  monsterSkillBonuses,
  monsterSpeeds,
  srdRulesProvenance,
} from "#/monster-catalog-helpers.ts";
import { type StatBlock } from "#/monster-types.ts";
import { abilityModifier, armorClass } from "#/types.ts";

export const ABOLETH = {
  provenance: srdRulesProvenance(
    ".references/srd-5.2.1/Monsters/Monsters-A-B.md",
    "Aboleth",
  ),
  name: "Aboleth",
  creatureType: "aberration",
  creatureSize: "large",
  ac: armorClass(17),
  initiativeMod: abilityModifier(7),
  maxHp: 150,
  hitDice: 20,
  hitDieType: 10,
  speeds: monsterSpeeds({ walk: 10, swim: 40 }),
  abilityScores: {
    str: 21,
    dex: 9,
    con: 15,
    int: 18,
    wis: 15,
    cha: 18,
  },
  saveProficiencies: new Set(["dex", "con", "int", "wis"]),
  skillBonuses: monsterSkillBonuses({ history: 12, perception: 10 }),
  cr: { type: "CRN", value: 10 },
  proficiencyBonus: 4,
  resistances: new Set(),
  vulnerabilities: new Set(),
  damageImmunities: new Set(),
  conditionImmunities: new Set(),
  exhaustionImmune: false,
  senses: monsterSenses({ darkvision: 120 }),
  passivePerception: 20,
  languages: ["Deep Speech", "telepathy 120 ft."],
  traits: [
    {
      kind: "text",
      id: "amphibious",
      name: "Amphibious",
      text: "The aboleth can breathe air and water.",
      nonExecutableReason:
        "Breathing-mode traits are not yet modeled on the combat runtime surface.",
    },
  ],
  actions: [
    {
      kind: "multiattack",
      id: "multiattack",
      name: "Multiattack",
      text: "The aboleth makes two Tentacle attacks and uses either Consume Memories or Dominate Mind if available.",
      slots: [
        { type: "MAttack", name: "Tentacle" },
        { type: "MAttack", name: "Tentacle" },
        { type: "MSpecialAbility", name: "Consume Memories" },
      ],
    },
    {
      kind: "attack",
      id: "tentacle",
      name: "Tentacle",
      text: "*Melee Attack Roll:* +9, reach 15 ft. *Hit:* 12 (2d6 + 5) Bludgeoning damage.",
      attack: {
        name: "Tentacle",
        attackBonus: 9,
        reach: 15,
        rangeNormal: 0,
        rangeLong: 0,
        damageAmount: 12,
        damageType: "bludgeoning",
        isRanged: false,
        attackMode: "melee",
      },
    },
    {
      kind: "text",
      id: "consumeMemories",
      name: "Consume Memories",
      text: "*Intelligence Saving Throw:* DC 16, one creature within 30 feet that is Charmed or Grappled by the aboleth. *Failure:* 10 (3d6) Psychic damage. *Success:* Half damage.",
      nonExecutableReason:
        "Conditional saving-throw abilities with grapple or charm prerequisites remain outside the generic monster runtime surface.",
    },
    {
      kind: "text",
      id: "dominateMind",
      name: "Dominate Mind",
      text: "*Wisdom Saving Throw:* DC 16, one creature the aboleth can see within 30 feet. *Failure:* The target has the Charmed condition until the aboleth dies or is on a different plane of existence from the target.",
      nonExecutableReason:
        "Long-duration domination effects are not yet projected into the generic monster runtime surface.",
    },
  ],
  bonusActions: [],
  reactions: [],
  legendaryActionUses: 3,
  legendaryResistanceUses: 3,
  legendaryActions: [
    {
      kind: "legendaryAction",
      id: "lash",
      name: "Lash",
      text: "The aboleth makes one Tentacle attack.",
      cost: 1,
      attackId: "tentacle",
    },
    {
      kind: "legendaryAction",
      id: "psychicDrain",
      name: "Psychic Drain",
      text: "If the aboleth has at least one creature Charmed or Grappled, it uses Consume Memories and regains 5 (1d10) Hit Points.",
      cost: 2,
    },
  ],
  rechargeAbilities: {},
  dailyAbilities: { dominateMind: 2 },
  inLair: false,
} as const satisfies StatBlock;
