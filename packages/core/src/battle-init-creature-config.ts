import type { BattleReadyableSpellPayload } from "#/features/spell-available-actions.ts";
import type {
  MonsterBattleBonusActionOption,
  MonsterBattleReactionOption,
} from "#/monster-types.ts";
import type {
  ActiveEffect,
  ArmorClass,
  BattleWeaponProfile,
  CreatureId,
  CreatureKind,
  QualifiedPhysicalBypass,
  Size,
} from "#/types.ts";
import type { BattlePosition } from "#/battle-machine-types.ts";

/** Creature config for BATTLE_INIT — determines initial state per combatant. */
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
  readonly preparedSpells?: ReadonlySet<string>;
  readonly readyableSpellPayloads?: ReadonlyMap<
    string,
    BattleReadyableSpellPayload
  >;
  readonly slotsMax?: ReadonlyArray<number>;
  readonly slotsCurrent?: ReadonlyArray<number>;
  readonly pactSlotsMax?: number;
  readonly pactSlotsCurrent?: number;
  readonly pactSlotLevel?: number;
  readonly hasEvasion?: boolean;
  readonly saveMiscBonus?: number;
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
