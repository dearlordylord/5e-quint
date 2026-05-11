import type {
  AbilityModifier,
  AttackBonus,
  DamageDieSize,
  ResourceCount,
} from "@dnd/shared/types";
import type {
  Ability,
  CreatureNamedAttackRoll,
  DamageType,
  DiceExpr,
  StatBlockValue,
  UnitRecord,
  WeaponDamage,
  WeaponRecord,
} from "@dnd/surface/surface/types";

export type BattleWeaponDamage = Extract<
  WeaponDamage,
  { readonly kind: "dice" }
>;

export type CharacterWeaponAttackActionOption = {
  readonly kind: "weapon";
  readonly weapon: WeaponRecord;
  readonly ability: Ability;
  readonly abilityModifier: AbilityModifier;
  readonly attackBonus?: AttackBonus;
  readonly damageAbilityModifier?: AbilityModifier;
};

export type UnarmedStrikeDamageProfile =
  | {
      readonly kind: "base";
      readonly damageType: "bludgeoning";
      readonly flat: 1;
    }
  | {
      readonly kind: "authoredReplacement";
      readonly sourceUnitId: UnitRecord["id"];
      readonly dice: 1;
      readonly dieSize: DamageDieSize;
      readonly damageType: DamageType;
    };

export type UnarmedStrikeDamageEffect = {
  readonly kind: "damage";
  readonly damage: UnarmedStrikeDamageProfile;
};

export type CharacterUnarmedStrikeActionOption = {
  readonly kind: "unarmedStrike";
  readonly effect: UnarmedStrikeDamageEffect;
  readonly attackAbility: Ability;
  readonly attackAbilityModifier: AbilityModifier;
  readonly attackBonus: AttackBonus;
  readonly damageAbilityModifier: AbilityModifier;
  readonly damageBonus?: number;
};

export type CharacterAttackActionOption =
  | CharacterWeaponAttackActionOption
  | CharacterUnarmedStrikeActionOption;

type LiteralStatBlockValue = Extract<
  StatBlockValue,
  { readonly kind: "literal" }
>;

type SupportedStatBlockBaseDamageEffect = Extract<
  CreatureNamedAttackRoll["onHit"][number],
  { readonly kind: "damage" }
> & {
  readonly amount: { readonly kind: "fixed"; readonly expr: DiceExpr };
  readonly damageType: DamageType;
};

type SupportedStatBlockAdvantageBonusDamageEffect = Extract<
  CreatureNamedAttackRoll["onHit"][number],
  { readonly kind: "conditional_bonus_damage" }
> & {
  readonly when: { readonly kind: "attack_roll_had_advantage" };
  readonly amount: { readonly kind: "fixed"; readonly expr: DiceExpr };
  readonly damageType: DamageType;
};

type SupportedStatBlockAttackEffectList =
  | readonly [SupportedStatBlockBaseDamageEffect]
  | readonly [
      SupportedStatBlockBaseDamageEffect,
      SupportedStatBlockAdvantageBonusDamageEffect,
    ]
  | readonly [
      SupportedStatBlockAdvantageBonusDamageEffect,
      SupportedStatBlockBaseDamageEffect,
    ];

export type SupportedCreatureNamedAttackRoll = Omit<
  CreatureNamedAttackRoll,
  | "attackBonus"
  | "multiattackCount"
  | "onHit"
  | "attackType"
  | "reachFeet"
  | "rangeFeet"
> & {
  readonly attackBonus: LiteralStatBlockValue;
  readonly multiattackCount?: never;
  readonly onHit: SupportedStatBlockAttackEffectList;
} & (
    | {
        readonly attackType: "melee";
        readonly reachFeet: number;
        readonly rangeFeet?: never;
      }
    | {
        readonly attackType: "ranged";
        readonly reachFeet?: never;
        readonly rangeFeet: { readonly normal: number; readonly long: number };
      }
  );

export type StatBlockPartSection =
  | "actions"
  | "bonusActions"
  | "reactions"
  | "legendaryActions";

export type StatBlockPartKey = {
  readonly section: StatBlockPartSection;
  readonly name: string;
};

export type StatBlockAttackActionOption = {
  readonly kind: "statBlockAttack";
  readonly attack: SupportedCreatureNamedAttackRoll;
  readonly part: StatBlockPartKey;
};

export type SupportedAttackActionOption =
  | CharacterAttackActionOption
  | StatBlockAttackActionOption;

export type StatBlockLimitedUseSnapshot =
  | {
      readonly key: StatBlockPartKey;
      readonly kind: "daily";
      readonly usesMax: ResourceCount;
      readonly usesRemaining: ResourceCount;
    }
  | {
      readonly key: StatBlockPartKey;
      readonly kind: "recharge";
      readonly minimumRoll: number;
      readonly available: boolean;
    }
  | {
      readonly key: StatBlockPartKey;
      readonly kind: "recharge_after_rest";
      readonly available: boolean;
    };

export type StatBlockLegendaryActionResourceSnapshot = {
  readonly usesMax: ResourceCount;
  readonly usesRemaining: ResourceCount;
};

export type StatBlockResourceSnapshot = {
  readonly legendaryActions: StatBlockLegendaryActionResourceSnapshot | null;
  readonly limitedUses: readonly StatBlockLimitedUseSnapshot[];
};

export type StatBlockDailyUseState = {
  readonly key: StatBlockPartKey;
  readonly usesRemaining: ResourceCount;
};

export type StatBlockMutableResourceState = {
  readonly legendaryActionUsesRemaining: ResourceCount;
  readonly dailyUses: readonly StatBlockDailyUseState[];
  readonly unavailableRechargeParts: readonly StatBlockPartKey[];
  readonly unavailableRestRechargeParts: readonly StatBlockPartKey[];
};

export type StatBlockAttackDamage = {
  readonly expr: DiceExpr;
  readonly damageType: DamageType;
  readonly advantageBonus?: {
    readonly expr: DiceExpr;
    readonly damageType: DamageType;
  };
};
