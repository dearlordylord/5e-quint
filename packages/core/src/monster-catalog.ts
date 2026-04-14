import { Match } from "effect";

import type { InitCreatureConfig } from "#/battle-machine-types.ts";
export { CANONICAL_SRD_MONSTER_PROVENANCE } from "#/monster-catalog-helpers.ts";
import {
  getBattleReadyableSpellMechanics,
  projectBattleReadyableSpellPayload,
} from "#/features/spell-registry.ts";
export * from "#/monster-catalog-registry.ts";
import {
  getMonsterStatBlock,
  MONSTER_STAT_BLOCKS,
  type MonsterStatBlockId,
} from "#/monster-catalog-registry.ts";
import {
  type MonsterAttack,
  type MonsterSaveTriggerKind,
  type StatBlock,
} from "#/monster-types.ts";
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

export function statBlockSaveAdvantageContexts(
  statBlock: StatBlock,
): ReadonlySet<MonsterSaveTriggerKind> {
  const contexts = new Set<MonsterSaveTriggerKind>();
  for (const trait of statBlock.traits) {
    if (
      trait.kind !== "saveModifierTrait" ||
      trait.saveModifier.kind !== "advantage"
    ) {
      continue;
    }
    for (const context of trait.saveModifier.appliesTo) {
      contexts.add(context);
    }
  }
  return contexts;
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
  Club: "club",
  Dagger: "dagger",
  Greataxe: "greataxe",
  Greatclub: "greatclub",
  Greatsword: "greatsword",
  "Hand Crossbow": "handCrossbow",
  "Heavy Crossbow": "heavyCrossbow",
  Javelin: "javelin",
  "Light Crossbow": "lightCrossbow",
  Longsword: "longsword",
  Longbow: "longbow",
  Mace: "mace",
  Pike: "pike",
  Pistol: "pistol",
  Rapier: "rapier",
  Scimitar: "scimitar",
  Shortbow: "shortbow",
  Shortsword: "shortsword",
  Spear: "spear",
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
  const saveAdvantageContexts = statBlockSaveAdvantageContexts(
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
    ...(saveAdvantageContexts.size > 0 ? { saveAdvantageContexts } : {}),
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
