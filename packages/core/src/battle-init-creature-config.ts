import type { ActiveProjectedPersistent } from "#/projected-persistent.ts";
import type { BattleSpellAccess } from "#/battle-spell-access.ts";
import type {
  MonsterBattleBonusActionOption,
  MonsterBattleReactionOption,
  MonsterSaveTriggerKind,
} from "#/monster-types.ts";
import type {
  ActiveEffect,
  ArmorClass,
  BattleWeaponProfile,
  CreatureId,
  CreatureKind,
  DifficultyClass,
  QualifiedPhysicalBypass,
  Size,
  SpellId,
  SpellSlotLevel,
} from "#/types.ts";
import type { BattlePosition } from "#/battle-machine-types.ts";

/**
 * Battle participation config projected by BATTLE_INIT and BATTLE_ADD_CREATURE.
 * Determines the initial battle-state facts for each combatant.
 */
export interface InitCreatureConfig {
  readonly id: CreatureId;
  readonly maxHp: number;
  readonly maxHpReduction?: number;
  readonly kind: CreatureKind;
  readonly creatureSize?: Size;
  readonly baseArmorClass?: ArmorClass;
  readonly battleSide?: string;
  readonly battlePosition?: BattlePosition;
  readonly caster?: boolean;
  readonly rogueLevel?: number;
  readonly monkLevel?: number;
  readonly strMod?: number;
  readonly dexMod?: number;
  readonly legendaryActions?: number;
  readonly legendaryResistances?: number;
  readonly rechargeAvailable?: Readonly<Record<string, boolean>>;
  readonly rechargeMinRolls?: Readonly<Record<string, number>>;
  readonly dailyUsesRemaining?: Readonly<Record<string, number>>;
  // Spell access fact: creature-owned permission/resource path for this spell.
  readonly spellAccesses?: ReadonlyArray<BattleSpellAccess>;
  // Temporary migration seam: callers may still pass split spell-access pieces
  // until all battle-init paths construct `spellAccesses` directly. These are
  // derived compatibility inputs, not a second owned source.
  readonly preparedSpells?: ReadonlySet<string>;
  readonly spellSaveDCs?: ReadonlyMap<SpellId, DifficultyClass>;
  readonly spellCastLevels?: ReadonlyMap<SpellId, SpellSlotLevel>;
  readonly slotsMax?: ReadonlyArray<number>;
  readonly slotsCurrent?: ReadonlyArray<number>;
  readonly pactSlotsMax?: number;
  readonly pactSlotsCurrent?: number;
  readonly pactSlotLevel?: number;
  readonly hasEvasion?: boolean;
  readonly saveMiscBonus?: number;
  readonly saveAdvantageContexts?: ReadonlySet<MonsterSaveTriggerKind>;
  readonly critRange?: number;
  readonly isWearingArmor?: boolean;
  readonly defenseArmorClassBonus?: number;
  readonly greatWeaponFightingDamageFloor?: boolean;
  readonly hiddenDiscoveryDc?: number;
  readonly rangedWeaponAttackRollBonus?: number;
  readonly fighterLevel?: number;
  readonly barbarianLevel?: number;
  readonly meleeDamageBonus?: number;
  readonly sneakAttackDice?: number;
  readonly bardLevel?: number;
  readonly bardicInspirationCharges?: number;
  readonly parryAcBonus?: number;
  readonly lightPropertyExtraAttackAddsAbilityModifier?: boolean;
  readonly invisible?: boolean;
  readonly prone?: boolean;
  readonly activeEffects?: ReadonlyArray<ActiveEffect>;
  readonly activeProjectedPersistents?: ReadonlySet<ActiveProjectedPersistent>;
  readonly baseWalkSpeed?: number;
  readonly initiativeRoll?: number;
  readonly initiativeRollB?: number;
  readonly surprised?: boolean;
  readonly mainHandWeapon?: BattleWeaponProfile;
  readonly offHandWeapon?: BattleWeaponProfile;
  readonly battleBonusActionOptions?: ReadonlyArray<MonsterBattleBonusActionOption>;
  readonly battleReactionOptions?: ReadonlyArray<MonsterBattleReactionOption>;
  readonly monsterStatBlockId?: string;
  readonly hasShieldEquipped?: boolean;
  readonly mainHandUsesTwoHands?: boolean;
  readonly qualifiedPhysicalResistances?: ReadonlyArray<QualifiedPhysicalBypass>;
  readonly qualifiedPhysicalVulnerabilities?: ReadonlyArray<QualifiedPhysicalBypass>;
  readonly qualifiedPhysicalImmunities?: ReadonlyArray<QualifiedPhysicalBypass>;
}
