import { Match } from "effect";

import {
  KNIGHT,
  KOBOLD_WARRIOR,
  MAGE,
  OGRE,
  PRIEST,
  SAHUAGIN_WARRIOR,
  SCOUT,
} from "#/monster-catalog-srd-expanded.ts";
import type { InitCreatureConfig } from "#/battle-machine-types.ts";
import { ABOLETH } from "#/monster-catalog-aboleths.ts";
import { CENTAUR_TROOPER } from "#/monster-catalog-centaurs.ts";
import {
  GOBLIN_BOSS,
  GOBLIN_MINION,
  GOBLIN_WARRIOR,
} from "#/monster-catalog-goblins.ts";
export { CANONICAL_SRD_MONSTER_PROVENANCE } from "#/monster-catalog-helpers.ts";
import { CANONICAL_SRD_MONSTER_PROVENANCE } from "#/monster-catalog-helpers.ts";
import { HARPY } from "#/monster-catalog-harpies.ts";
import { PSEUDODRAGON } from "#/monster-catalog-pseudodragons.ts";
import {
  getBattleReadyableSpellMechanics,
  projectBattleReadyableSpellPayload,
} from "#/features/spell-registry.ts";
import { type MonsterAttack, type StatBlock } from "#/monster-types.ts";
import type { CharacterWeapon } from "#/character-equipment-weapon-data.ts";
import { projectBattleWeaponProfile } from "#/character-equipment.ts";
import {
  CreatureId,
  abilityModifier,
  abilityScoreToMod,
  type BattleWeaponProfile,
  type CreatureId as CreatureIdT,
  difficultyClass,
  type SpellId,
  spellId as makeSpellId,
  spellSlotLevel,
} from "#/types.ts";

export { CENTAUR_TROOPER } from "#/monster-catalog-centaurs.ts";
export { ABOLETH } from "#/monster-catalog-aboleths.ts";
export {
  GOBLIN_BOSS,
  GOBLIN_MINION,
  GOBLIN_WARRIOR,
} from "#/monster-catalog-goblins.ts";
export { HARPY } from "#/monster-catalog-harpies.ts";
export { PSEUDODRAGON } from "#/monster-catalog-pseudodragons.ts";
export {
  KNIGHT,
  KOBOLD_WARRIOR,
  MAGE,
  OGRE,
  PRIEST,
  SAHUAGIN_WARRIOR,
  SCOUT,
} from "#/monster-catalog-srd-expanded.ts";

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
] as const;
export type MonsterStatBlockId = (typeof MONSTER_STAT_BLOCK_IDS)[number];

export const MONSTER_STAT_BLOCK_PROVENANCE = {
  defaultSource: ".references/srd-5.2.1/",
  defaultSourceName: CANONICAL_SRD_MONSTER_PROVENANCE.sourceName,
  defaultSourceKind: CANONICAL_SRD_MONSTER_PROVENANCE.sourceKind,
  defaultLicense: CANONICAL_SRD_MONSTER_PROVENANCE.license,
  externalSourcePolicy:
    "Any non-SRD corpus requires explicit owner approval before it becomes a catalog source of truth.",
  researchOnlySources:
    "5etools and similar corpora remain research-only until a later plan change explicitly promotes them.",
  ownership:
    "Core owns named monster stat blocks. MCP and other adapters must reference catalog IDs rather than restate RAW literals.",
  quintFixtures:
    "Existing named stat blocks in creature.qnt are MBT/proof fixtures unless a later task explicitly unifies Quint with the runtime catalog.",
} as const;

export const MONSTER_STAT_BLOCKS: Readonly<
  Record<MonsterStatBlockId, StatBlock>
> = {
  aboleth: ABOLETH,
  centaurTrooper: CENTAUR_TROOPER,
  goblinMinion: GOBLIN_MINION,
  goblinWarrior: GOBLIN_WARRIOR,
  goblinBoss: GOBLIN_BOSS,
  harpy: HARPY,
  knight: KNIGHT,
  koboldWarrior: KOBOLD_WARRIOR,
  mage: MAGE,
  ogre: OGRE,
  pseudodragon: PSEUDODRAGON,
  priest: PRIEST,
  sahuaginWarrior: SAHUAGIN_WARRIOR,
  scout: SCOUT,
};

export function getMonsterStatBlock(id: MonsterStatBlockId): StatBlock {
  return Match.value(id).pipe(
    Match.when("aboleth", () => MONSTER_STAT_BLOCKS.aboleth),
    Match.when("centaurTrooper", () => MONSTER_STAT_BLOCKS.centaurTrooper),
    Match.when("goblinMinion", () => MONSTER_STAT_BLOCKS.goblinMinion),
    Match.when("goblinWarrior", () => MONSTER_STAT_BLOCKS.goblinWarrior),
    Match.when("goblinBoss", () => MONSTER_STAT_BLOCKS.goblinBoss),
    Match.when("harpy", () => MONSTER_STAT_BLOCKS.harpy),
    Match.when("knight", () => MONSTER_STAT_BLOCKS.knight),
    Match.when("koboldWarrior", () => MONSTER_STAT_BLOCKS.koboldWarrior),
    Match.when("mage", () => MONSTER_STAT_BLOCKS.mage),
    Match.when("ogre", () => MONSTER_STAT_BLOCKS.ogre),
    Match.when("pseudodragon", () => MONSTER_STAT_BLOCKS.pseudodragon),
    Match.when("priest", () => MONSTER_STAT_BLOCKS.priest),
    Match.when("sahuaginWarrior", () => MONSTER_STAT_BLOCKS.sahuaginWarrior),
    Match.when("scout", () => MONSTER_STAT_BLOCKS.scout),
    Match.exhaustive,
  );
}

export function getMonsterStatBlockByStateId(
  id: string | undefined,
): StatBlock | null {
  return id != null && id in MONSTER_STAT_BLOCKS
    ? getMonsterStatBlock(id as MonsterStatBlockId)
    : null;
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

export function statBlockLegendaryAction(
  statBlock: StatBlock,
  abilityId: string,
) {
  return (
    statBlock.legendaryActions.find((ability) => ability.id === abilityId) ??
    null
  );
}

export function statBlockAbilityName(statBlock: StatBlock, abilityId: string) {
  return [
    ...statBlock.traits,
    ...statBlock.actions,
    ...statBlock.bonusActions,
    ...statBlock.reactions,
    ...statBlock.legendaryActions,
  ].find((ability) => ability.id === abilityId)?.name;
}

const MONSTER_SPELL_DAILY_USE_PREFIX = "spell:";

export function monsterSpellDailyUseId(spellId: SpellId): string {
  return `${MONSTER_SPELL_DAILY_USE_PREFIX}${spellId}`;
}

function parseMonsterSpellDailyUses(usage: string): number | null {
  const match = /^(\d+)\/Day(?: Each)?$/.exec(usage);
  return match == null ? null : Number(match[1]);
}

function statBlockModeledActionSpellcasting(statBlock: StatBlock) {
  const dailyUsesRemaining: Record<string, number> = {};
  const preparedSpells = new Set<string>();
  const readyableSpellPayloads = new Map();

  for (const action of statBlock.actions) {
    if (action.kind !== "spellcasting" || action.saveDc == null) continue;
    for (const spell of action.spells) {
      const mechanics = getBattleReadyableSpellMechanics(spell.spellId);
      const dailyUses = parseMonsterSpellDailyUses(spell.usage);
      if (mechanics?.delivery !== "aoe" || dailyUses == null) continue;
      const castLevel =
        spell.castLevel == null
          ? mechanics.baseLevel
          : spellSlotLevel(spell.castLevel);
      const payload = projectBattleReadyableSpellPayload(
        spell.spellId,
        castLevel,
        difficultyClass(action.saveDc),
      );
      if (payload == null) continue;
      preparedSpells.add(String(spell.spellId));
      readyableSpellPayloads.set(makeSpellId(String(spell.spellId)), payload);
      dailyUsesRemaining[monsterSpellDailyUseId(spell.spellId)] = dailyUses;
    }
  }

  return {
    preparedSpells:
      preparedSpells.size > 0 ? new Set(preparedSpells) : undefined,
    readyableSpellPayloads:
      readyableSpellPayloads.size > 0 ? readyableSpellPayloads : undefined,
    dailyUsesRemaining:
      Object.keys(dailyUsesRemaining).length > 0
        ? dailyUsesRemaining
        : undefined,
  };
}

export function statBlockProjectedBattleReadyableMonsterSpells(
  statBlock: StatBlock,
): ReadonlySet<SpellId> {
  const projected =
    statBlockModeledActionSpellcasting(statBlock).preparedSpells;
  return projected == null
    ? new Set()
    : new Set([...projected].map((spellRef) => makeSpellId(spellRef)));
}

/**
 * Use the stat block's Initiative entry as the no-roll fallback.
 * SRD Overview: this is not always equal to Dexterity modifier.
 */
export function statBlockInitiativeScore(statBlock: StatBlock): number {
  return 10 + statBlock.initiativeMod;
}

const STOCK_MONSTER_ATTACK_WEAPONS = {
  Dagger: "dagger",
  Greatclub: "greatclub",
  Javelin: "javelin",
  Longbow: "longbow",
  Pike: "pike",
  Scimitar: "scimitar",
  Shortbow: "shortbow",
  Shortsword: "shortsword",
} as const satisfies Readonly<Record<string, CharacterWeapon>>;

function stockMonsterAttackWeapon(name: string): CharacterWeapon | null {
  return (
    STOCK_MONSTER_ATTACK_WEAPONS[
      name as keyof typeof STOCK_MONSTER_ATTACK_WEAPONS
    ] ?? null
  );
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
  return Match.value(attack.battleProfile).pipe(
    Match.when({ kind: "stockWeapon" }, () => {
      const stockWeapon = stockMonsterAttackWeapon(attack.name);
      return stockWeapon == null
        ? null
        : {
            ...projectBattleWeaponProfile(stockWeapon),
            statBlockAttackSource,
          };
    }),
    Match.when({ kind: "naturalWeapon" }, (battleProfile) => ({
      name: attack.name,
      damageType: attack.damageType,
      isMelee: attack.attackMode !== "ranged",
      damageDie: battleProfile.damageDie,
      ...(battleProfile.diceCount != null
        ? { diceCount: battleProfile.diceCount }
        : {}),
      ...(battleProfile.versatileDie != null
        ? { versatileDie: battleProfile.versatileDie }
        : {}),
      properties: new Set(battleProfile.properties),
      statBlockAttackSource,
    })),
    Match.orElse(() => null),
  );
}

export function statBlockAttackBattleProfile(
  statBlock: StatBlock,
  attackId: string,
): BattleWeaponProfile | null {
  const attack = statBlockAttacks(statBlock)[attackId];
  return attack == null ? null : statBlockAttackToBattleWeaponProfile(attack);
}

function statBlockPrimaryWeaponProfile(
  statBlock: StatBlock,
  primaryAttackName?: string,
): BattleWeaponProfile | null {
  const attacks = statBlockAttacks(statBlock);
  if (primaryAttackName != null) {
    return statBlockAttackBattleProfile(statBlock, primaryAttackName);
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
  readonly statBlockId?: MonsterStatBlockId;
  readonly primaryAttackName?: string;
  readonly initiativeRoll?: number;
  readonly initiativeRollB?: number;
  readonly surprised?: boolean;
}): InitCreatureConfig {
  const mainHandWeapon = statBlockPrimaryWeaponProfile(
    params.statBlock,
    params.primaryAttackName,
  );
  const modeledActionSpellcasting = statBlockModeledActionSpellcasting(
    params.statBlock,
  );
  const config: InitCreatureConfig = {
    id: CreatureId(params.id),
    kind: "Monster",
    ...(params.statBlockId != null
      ? { monsterStatBlockId: params.statBlockId }
      : {}),
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
    dailyUsesRemaining: {
      ...params.statBlock.dailyAbilities,
      ...(modeledActionSpellcasting.dailyUsesRemaining ?? {}),
    },
    rechargeMinRolls: statBlockRechargeMinRolls(params.statBlock),
    ...(modeledActionSpellcasting.preparedSpells != null
      ? { preparedSpells: modeledActionSpellcasting.preparedSpells }
      : {}),
    ...(modeledActionSpellcasting.readyableSpellPayloads != null
      ? {
          readyableSpellPayloads:
            modeledActionSpellcasting.readyableSpellPayloads,
        }
      : {}),
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
