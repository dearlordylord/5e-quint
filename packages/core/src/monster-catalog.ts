import { Match } from "effect";

import type { InitCreatureConfig } from "#/battle-machine-types.ts";
import { SKILLS, type Skill, type StatBlock } from "#/monster-types.ts";
import {
  CreatureId,
  abilityModifier,
  abilityScoreToMod,
  armorClass,
  type CreatureId as CreatureIdT,
} from "#/types.ts";

/**
 * Core-owned runtime catalog for named monster stat blocks.
 *
 * This catalog is the source of truth for adapter/runtime flows that need a
 * named monster by ID, such as `BATTLE_INIT`.
 *
 * Existing named stat blocks in `creature.qnt` remain MBT/proof fixtures for
 * Quint-driven creature tests. Do not mirror new runtime catalog entries into
 * Quint unless a Quint consumer or parity test actually requires them.
 */

export const MONSTER_STAT_BLOCK_IDS = ["goblinMinion"] as const;
export type MonsterStatBlockId = (typeof MONSTER_STAT_BLOCK_IDS)[number];

export const MONSTER_STAT_BLOCK_PROVENANCE = {
  defaultSource: ".references/srd-5.2.1/",
  externalSourcePolicy:
    "Any non-SRD corpus requires explicit owner approval before it becomes a catalog source of truth.",
  researchOnlySources:
    "5etools and similar corpora remain research-only until a later plan change explicitly promotes them.",
  ownership:
    "Core owns named monster stat blocks. MCP and other adapters must reference catalog IDs rather than restate RAW literals.",
  quintFixtures:
    "Existing named stat blocks in creature.qnt are MBT/proof fixtures unless a later task explicitly unifies Quint with the runtime catalog.",
} as const;

function skillBonuses(
  overrides: Partial<Record<Skill, number>>,
): Record<Skill, number> {
  const base = Object.fromEntries(SKILLS.map((skill) => [skill, 0])) as Record<
    Skill,
    number
  >;
  return { ...base, ...overrides };
}

/**
 * Goblin Minion — SRD 5.2.1:
 * `.references/srd-5.2.1/Monsters/Monsters-E-G.md` > `Goblins` >
 * `Goblin Minion`.
 *
 * Nimble Escape is intentionally deferred. It requires monster bonus-action
 * support and should land with the follow-up goblin task instead of being
 * approximated here.
 */
export const GOBLIN_MINION = {
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
  attacks: {
    dagger: {
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
  multiattack: [],
  legendaryActionUses: 0,
  legendaryResistanceUses: 0,
  legendaryActions: {},
  rechargeAbilities: {},
  dailyAbilities: {},
  inLair: false,
} as const satisfies StatBlock;

const MONSTER_STAT_BLOCKS: Readonly<Record<MonsterStatBlockId, StatBlock>> = {
  goblinMinion: GOBLIN_MINION,
};

export function getMonsterStatBlock(id: MonsterStatBlockId): StatBlock {
  return Match.value(id).pipe(
    Match.when("goblinMinion", () => MONSTER_STAT_BLOCKS.goblinMinion),
    Match.exhaustive,
  );
}

/**
 * Use the stat block's Initiative entry as the no-roll fallback.
 * SRD Overview: this is not always equal to Dexterity modifier.
 */
export function statBlockInitiativeScore(statBlock: StatBlock): number {
  return 10 + statBlock.initiativeMod;
}

export function statBlockToInitCreatureConfig(params: {
  readonly id: CreatureIdT;
  readonly statBlock: StatBlock;
  readonly initiativeRoll?: number;
  readonly initiativeRollB?: number;
  readonly surprised?: boolean;
}): InitCreatureConfig {
  const config: InitCreatureConfig = {
    id: CreatureId(params.id),
    kind: "Monster",
    maxHp: params.statBlock.maxHp,
    creatureSize: params.statBlock.creatureSize,
    dexMod: abilityModifier(
      abilityScoreToMod(params.statBlock.abilityScores.dex),
    ),
    legendaryActions:
      params.statBlock.legendaryActionUses > 0
        ? params.statBlock.legendaryActionUses
        : undefined,
    legendaryResistances:
      params.statBlock.legendaryResistanceUses > 0
        ? params.statBlock.legendaryResistanceUses
        : undefined,
    baseWalkSpeed: params.statBlock.speeds.walk,
    initiativeRoll:
      params.initiativeRoll ?? statBlockInitiativeScore(params.statBlock),
    initiativeRollB: params.initiativeRollB,
    surprised: params.surprised,
  };
  return config;
}

export function monsterCatalogInitCreatureConfig(params: {
  readonly id: CreatureIdT;
  readonly statBlockId: MonsterStatBlockId;
  readonly initiativeRoll?: number;
  readonly initiativeRollB?: number;
  readonly surprised?: boolean;
}): InitCreatureConfig {
  return statBlockToInitCreatureConfig({
    ...params,
    statBlock: getMonsterStatBlock(params.statBlockId),
  });
}
