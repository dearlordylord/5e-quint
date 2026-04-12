import { Match } from "effect";

import type { InitCreatureConfig } from "#/battle-machine-types.ts";
import { CENTAUR_TROOPER } from "#/monster-catalog-centaurs.ts";
import {
  GOBLIN_BOSS,
  GOBLIN_MINION,
  GOBLIN_WARRIOR,
} from "#/monster-catalog-goblins.ts";
import { PSEUDODRAGON } from "#/monster-catalog-pseudodragons.ts";
import { type MonsterAttack, type StatBlock } from "#/monster-types.ts";
import {
  CreatureId,
  abilityModifier,
  abilityScoreToMod,
  type BattleWeaponProfile,
  type CreatureId as CreatureIdT,
} from "#/types.ts";

export { CENTAUR_TROOPER } from "#/monster-catalog-centaurs.ts";
export {
  GOBLIN_BOSS,
  GOBLIN_MINION,
  GOBLIN_WARRIOR,
} from "#/monster-catalog-goblins.ts";
export { PSEUDODRAGON } from "#/monster-catalog-pseudodragons.ts";

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

export const MONSTER_STAT_BLOCK_IDS = [
  "centaurTrooper",
  "goblinMinion",
  "goblinWarrior",
  "goblinBoss",
  "pseudodragon",
] as const;
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

const MONSTER_STAT_BLOCKS: Readonly<Record<MonsterStatBlockId, StatBlock>> = {
  centaurTrooper: CENTAUR_TROOPER,
  goblinMinion: GOBLIN_MINION,
  goblinWarrior: GOBLIN_WARRIOR,
  goblinBoss: GOBLIN_BOSS,
  pseudodragon: PSEUDODRAGON,
};

export function getMonsterStatBlock(id: MonsterStatBlockId): StatBlock {
  return Match.value(id).pipe(
    Match.when("centaurTrooper", () => MONSTER_STAT_BLOCKS.centaurTrooper),
    Match.when("goblinMinion", () => MONSTER_STAT_BLOCKS.goblinMinion),
    Match.when("goblinWarrior", () => MONSTER_STAT_BLOCKS.goblinWarrior),
    Match.when("goblinBoss", () => MONSTER_STAT_BLOCKS.goblinBoss),
    Match.when("pseudodragon", () => MONSTER_STAT_BLOCKS.pseudodragon),
    Match.exhaustive,
  );
}

export function statBlockRechargeMinRolls(
  statBlock: StatBlock,
): Readonly<Record<string, number>> {
  return Object.fromEntries(
    Object.entries(statBlock.rechargeAbilities).map(([id, ability]) => [
      id,
      ability.rechargeMin,
    ]),
  );
}

export function statBlockAttacks(
  statBlock: StatBlock,
): Readonly<Record<string, MonsterAttack>> {
  return Object.fromEntries(
    statBlock.actions.flatMap((action) =>
      action.kind === "attack" ? [[action.id, action.attack] as const] : [],
    ),
  );
}

export function statBlockMultiattack(statBlock: StatBlock) {
  return (
    statBlock.actions.flatMap((action) =>
      action.kind === "multiattack" ? [action.slots] : [],
    )[0] ?? []
  );
}

export function statBlockBattleBonusActionOptions(statBlock: StatBlock) {
  return statBlock.bonusActions.flatMap((bonusAction) =>
    bonusAction.kind === "battleBonusAction" ? [...bonusAction.options] : [],
  );
}

export function statBlockBattleReactionOptions(statBlock: StatBlock) {
  return statBlock.reactions.flatMap((reaction) =>
    reaction.kind === "battleReaction" ? [reaction.option] : [],
  );
}

/**
 * Use the stat block's Initiative entry as the no-roll fallback.
 * SRD Overview: this is not always equal to Dexterity modifier.
 */
export function statBlockInitiativeScore(statBlock: StatBlock): number {
  return 10 + statBlock.initiativeMod;
}

function statBlockAttackToBattleWeaponProfile(
  attack: MonsterAttack,
): BattleWeaponProfile | null {
  const statBlockAttackSource = {
    name: attack.name,
    ...(attack.extraDamageOnAdvantageHit != null
      ? { extraDamageOnAdvantageHit: attack.extraDamageOnAdvantageHit }
      : {}),
  };
  if (attack.name === "Dagger") {
    return {
      name: attack.name,
      damageType: attack.damageType,
      isMelee: true,
      damageDie: 4,
      properties: new Set(["finesse", "light", "thrown"]),
      statBlockAttackSource,
    };
  }
  if (attack.name === "Scimitar") {
    return {
      name: attack.name,
      damageType: attack.damageType,
      isMelee: true,
      damageDie: 6,
      properties: new Set(["finesse", "light"]),
      statBlockAttackSource,
    };
  }
  if (attack.name === "Shortbow") {
    return {
      name: attack.name,
      damageType: attack.damageType,
      isMelee: false,
      damageDie: 6,
      properties: new Set(["ammunition", "twoHanded"]),
      statBlockAttackSource,
    };
  }
  if (attack.name === "Bite") {
    return {
      name: attack.name,
      damageType: attack.damageType,
      isMelee: true,
      damageDie: 4,
      properties: new Set([]),
      statBlockAttackSource,
    };
  }
  return null;
}

function statBlockPrimaryWeaponProfile(
  statBlock: StatBlock,
  primaryAttackName?: string,
): BattleWeaponProfile | null {
  const attacks = statBlockAttacks(statBlock);
  if (primaryAttackName != null) {
    const attack = attacks[primaryAttackName];
    return attack == null ? null : statBlockAttackToBattleWeaponProfile(attack);
  }
  for (const attack of Object.values(attacks)) {
    const profile = statBlockAttackToBattleWeaponProfile(attack);
    if (profile != null) return profile;
  }
  return null;
}

export function statBlockToInitCreatureConfig(params: {
  readonly id: CreatureIdT;
  readonly statBlock: StatBlock;
  readonly primaryAttackName?: string;
  readonly initiativeRoll?: number;
  readonly initiativeRollB?: number;
  readonly surprised?: boolean;
}): InitCreatureConfig {
  const mainHandWeapon = statBlockPrimaryWeaponProfile(
    params.statBlock,
    params.primaryAttackName,
  );
  const config: InitCreatureConfig = {
    id: CreatureId(params.id),
    kind: "Monster",
    maxHp: params.statBlock.maxHp,
    creatureSize: params.statBlock.creatureSize,
    baseArmorClass: params.statBlock.ac,
    strMod: abilityModifier(
      abilityScoreToMod(params.statBlock.abilityScores.str),
    ),
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
    rechargeAvailable: Object.fromEntries(
      Object.keys(params.statBlock.rechargeAbilities).map((id) => [id, false]),
    ),
    rechargeMinRolls: statBlockRechargeMinRolls(params.statBlock),
    baseWalkSpeed: params.statBlock.speeds.walk,
    battleBonusActionOptions: statBlockBattleBonusActionOptions(
      params.statBlock,
    ),
    battleReactionOptions: statBlockBattleReactionOptions(params.statBlock),
    initiativeRoll:
      params.initiativeRoll ?? statBlockInitiativeScore(params.statBlock),
    initiativeRollB: params.initiativeRollB,
    surprised: params.surprised,
    ...(mainHandWeapon != null ? { mainHandWeapon } : {}),
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
