import type {
  AbilityModifier,
  AttackBonus,
  DamageDieSize,
  ReadonlyNonEmptyArray,
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
import type { AttackDamageAbilityModifierChoice } from "./battle-reducer/attack-damage-ability-modifier-choice.ts";
import type { BattleProcedureExecutionRef } from "./identity.ts";

export type BattleWeaponDamage = Extract<
  WeaponDamage,
  { readonly kind: "dice" }
>;

export type CharacterWeaponAttackAbilityChoice = {
  readonly ability: Ability;
  readonly abilityModifier: AbilityModifier;
  readonly attackBonus: AttackBonus;
  readonly damageAbilityModifier: AbilityModifier;
  readonly attackDamageAbilityModifierChoice?: AttackDamageAbilityModifierChoice;
};

export type CharacterWeaponAttackDamageTypeChoices = readonly [
  DamageType,
  DamageType,
  ...DamageType[],
];

export type CharacterWeaponAttackActionOption = {
  readonly kind: "weapon";
  readonly weapon: WeaponRecord;
  readonly ability: Ability;
  readonly abilityModifier: AbilityModifier;
  readonly attackBonus?: AttackBonus;
  readonly damageAbilityModifier?: AbilityModifier;
  readonly attackDamageAbilityModifierChoice?: AttackDamageAbilityModifierChoice;
  readonly damageBonus?: number;
  readonly damageTypeChoices?: CharacterWeaponAttackDamageTypeChoices;
  readonly alternateAbilityChoices?: ReadonlyNonEmptyArray<CharacterWeaponAttackAbilityChoice>;
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
  readonly attackAbility: Ability | "spellcasting";
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
  readonly amount: {
    readonly kind: "fixed";
    readonly expr: DiceExpr;
    readonly static?: number;
  };
  readonly damageType: DamageType;
};

type SupportedStatBlockAdvantageBonusDamageEffect = Extract<
  CreatureNamedAttackRoll["onHit"][number],
  { readonly kind: "conditional_bonus_damage" }
> & {
  readonly when: { readonly kind: "attack_roll_had_advantage" };
  readonly amount: {
    readonly kind: "fixed";
    readonly expr: DiceExpr;
    readonly static?: number;
  };
  readonly damageType: DamageType;
};

type SupportedStatBlockAttackHitTargetSizeConditionEffect = Extract<
  CreatureNamedAttackRoll["onHit"][number],
  { readonly kind: "apply_condition_if_target_size_at_most" }
> & {
  readonly condition: "prone";
};

type SupportedStatBlockBaseDamageEffectList =
  ReadonlyNonEmptyArray<SupportedStatBlockBaseDamageEffect>;

type SupportedStatBlockAttackDamageEffectList =
  | SupportedStatBlockBaseDamageEffectList
  | readonly [
      SupportedStatBlockAdvantageBonusDamageEffect,
      ...SupportedStatBlockBaseDamageEffectList,
    ]
  | readonly [
      ...SupportedStatBlockBaseDamageEffectList,
      SupportedStatBlockAdvantageBonusDamageEffect,
    ];

type SupportedStatBlockAttackEffectList =
  | SupportedStatBlockAttackDamageEffectList
  | readonly [
      ...SupportedStatBlockAttackDamageEffectList,
      SupportedStatBlockAttackHitTargetSizeConditionEffect,
    ];

type SupportedStaticStatBlockBaseDamageEffect =
  SupportedStatBlockBaseDamageEffect & {
    readonly amount: SupportedStatBlockBaseDamageEffect["amount"] & {
      readonly static: number;
    };
  };

type SupportedStaticStatBlockAdvantageBonusDamageEffect =
  SupportedStatBlockAdvantageBonusDamageEffect & {
    readonly amount: SupportedStatBlockAdvantageBonusDamageEffect["amount"] & {
      readonly static: number;
    };
  };

type SupportedStaticStatBlockBaseDamageEffectList =
  ReadonlyNonEmptyArray<SupportedStaticStatBlockBaseDamageEffect>;

type SupportedStaticStatBlockAttackDamageEffectList =
  | SupportedStaticStatBlockBaseDamageEffectList
  | readonly [
      SupportedStaticStatBlockAdvantageBonusDamageEffect,
      ...SupportedStaticStatBlockBaseDamageEffectList,
    ]
  | readonly [
      ...SupportedStaticStatBlockBaseDamageEffectList,
      SupportedStaticStatBlockAdvantageBonusDamageEffect,
    ];

type SupportedStaticStatBlockAttackEffectList =
  | SupportedStaticStatBlockAttackDamageEffectList
  | readonly [
      ...SupportedStaticStatBlockAttackDamageEffectList,
      SupportedStatBlockAttackHitTargetSizeConditionEffect,
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

export type SupportedStaticDamageCreatureNamedAttackRoll =
  SupportedCreatureNamedAttackRoll & {
    readonly onHit: SupportedStaticStatBlockAttackEffectList;
  };

export type CreatureAttackRollMechanics = Omit<
  CreatureNamedAttackRoll,
  "name" | "description" | "limitedUse"
>;

export type SupportedCreatureAttackRollMechanics = Omit<
  SupportedCreatureNamedAttackRoll,
  "name" | "description" | "limitedUse"
>;

export type SupportedStaticDamageCreatureAttackRollMechanics = Omit<
  SupportedStaticDamageCreatureNamedAttackRoll,
  "name" | "description" | "limitedUse"
>;

export const STAT_BLOCK_ATTACK_ROLL_ADVANTAGE_PREDICATES = [
  "nonIncapacitatedAllyWithin5FeetOfTarget",
] as const;

export type StatBlockAttackRollAdvantagePredicate =
  (typeof STAT_BLOCK_ATTACK_ROLL_ADVANTAGE_PREDICATES)[number];

export type StatBlockTraitAttackRollMode = {
  readonly mode: "advantage";
  readonly predicate: StatBlockAttackRollAdvantagePredicate;
};

export const STAT_BLOCK_ATTACK_SECTIONS = [
  "actions",
  "legendaryActions",
] as const;
export type StatBlockAttackSection =
  (typeof STAT_BLOCK_ATTACK_SECTIONS)[number];

export const STAT_BLOCK_DAMAGE_NOTATIONS = ["rolled", "static"] as const;
export type StatBlockDamageNotation =
  (typeof STAT_BLOCK_DAMAGE_NOTATIONS)[number];

export type RolledStatBlockAttackActionOption = {
  readonly kind: "statBlockAttack";
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly attack: SupportedCreatureAttackRollMechanics;
  readonly damageNotation: "rolled";
  readonly traitAttackRollModes?: ReadonlyNonEmptyArray<StatBlockTraitAttackRollMode>;
};

export type StaticStatBlockAttackActionOption = {
  readonly kind: "statBlockAttack";
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly attack: SupportedStaticDamageCreatureAttackRollMechanics;
  readonly damageNotation: "static";
  readonly traitAttackRollModes?: ReadonlyNonEmptyArray<StatBlockTraitAttackRollMode>;
};

export type StatBlockAttackActionOption =
  | RolledStatBlockAttackActionOption
  | StaticStatBlockAttackActionOption;

export type SupportedAttackActionOption =
  | CharacterAttackActionOption
  | StatBlockAttackActionOption;

export type StatBlockAttackDamageComponent = {
  readonly expr: DiceExpr;
  readonly static?: number;
  readonly damageType: DamageType;
};

export type StatBlockAttackDamage = {
  readonly baseComponents: ReadonlyNonEmptyArray<StatBlockAttackDamageComponent>;
  readonly advantageBonus?: StatBlockAttackDamageComponent;
};

export type StaticStatBlockAttackDamageComponent =
  StatBlockAttackDamageComponent & {
    readonly static: number;
  };

export type StaticStatBlockAttackDamage = {
  readonly baseComponents: ReadonlyNonEmptyArray<StaticStatBlockAttackDamageComponent>;
  readonly advantageBonus?: StaticStatBlockAttackDamageComponent;
};
