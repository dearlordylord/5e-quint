import { Brand } from "effect";
import type {
  ArmorCategory,
  Condition,
  DamageQualifier,
  DamageType,
  PhysicalDamageType,
  SpellSlots,
  WeaponProperty,
} from "@dnd/shared/types";
import {
  AbilityScore as SharedAbilityScore,
  AbilityModifier as SharedAbilityModifier,
  ArmorClass as SharedArmorClass,
  CharacterLevel as SharedCharacterLevel,
  ClassLevel as SharedClassLevel,
  D20Roll as SharedD20Roll,
  DamageAmount as SharedDamageAmount,
  DeathSaveCount as SharedDeathSaveCount,
  deathSaveCount as sharedDeathSaveCount,
  DifficultyClass as SharedDifficultyClass,
  ExhaustionLevel as SharedExhaustionLevel,
  HP as SharedHP,
  HealAmount as SharedHealAmount,
  MovementFeet as SharedMovementFeet,
  ProficiencyBonus as SharedProficiencyBonus,
  ResourceCount as SharedResourceCount,
  SpellSlotLevel as SharedSpellSlotLevel,
  TempHP as SharedTempHP,
} from "@dnd/shared/types";

export {
  ABILITIES,
  ACTIVATION_TIMINGS,
  ARMOR_CATEGORIES,
  ARMOR_WEIGHTS,
  abilityScore,
  armorClass,
  abilityModifier,
  abilityScoreToMod,
  CASTER_CLASSES,
  CASTER_CLASS_TO_TYPE,
  CASTER_TYPES,
  characterLevel,
  classLevel,
  CONDITIONS,
  COVER_TYPES,
  DAMAGE_QUALIFIERS,
  DAMAGE_TYPES,
  d20Roll,
  damageAmount,
  deathSaveCount,
  difficultyClass,
  exhaustionLevel,
  HAND_USES,
  healAmount,
  hp,
  INCAP_SOURCES,
  MAGICAL_DAMAGE_TYPES,
  movementFeet,
  PHYSICAL_DAMAGE_TYPES,
  proficiencyBonus,
  resourceCount,
  SHOVE_CHOICES,
  SIZES,
  SPELL_SCHOOLS,
  spellSlotLevel,
  tempHp,
  WEAPON_PROPERTIES,
} from "@dnd/shared/types";
export const AbilityScore = SharedAbilityScore;
export type AbilityScore = typeof SharedAbilityScore.Type;
export const AbilityModifier = SharedAbilityModifier;
export type AbilityModifier = typeof SharedAbilityModifier.Type;
export const ArmorClass = SharedArmorClass;
export type ArmorClass = typeof SharedArmorClass.Type;
export const CharacterLevel = SharedCharacterLevel;
export type CharacterLevel = typeof SharedCharacterLevel.Type;
export const ClassLevel = SharedClassLevel;
export type ClassLevel = typeof SharedClassLevel.Type;
export const D20Roll = SharedD20Roll;
export type D20Roll = typeof SharedD20Roll.Type;
export const DamageAmount = SharedDamageAmount;
export type DamageAmount = typeof SharedDamageAmount.Type;
export const DeathSaveCount = SharedDeathSaveCount;
export type DeathSaveCount = typeof SharedDeathSaveCount.Type;
export const DifficultyClass = SharedDifficultyClass;
export type DifficultyClass = typeof SharedDifficultyClass.Type;
export const ExhaustionLevel = SharedExhaustionLevel;
export type ExhaustionLevel = typeof SharedExhaustionLevel.Type;
export const HP = SharedHP;
export type HP = typeof SharedHP.Type;
export const HealAmount = SharedHealAmount;
export type HealAmount = typeof SharedHealAmount.Type;
export const MovementFeet = SharedMovementFeet;
export type MovementFeet = typeof SharedMovementFeet.Type;
export const ProficiencyBonus = SharedProficiencyBonus;
export type ProficiencyBonus = typeof SharedProficiencyBonus.Type;
export const ResourceCount = SharedResourceCount;
export type ResourceCount = typeof SharedResourceCount.Type;
export const SpellSlotLevel = SharedSpellSlotLevel;
export type SpellSlotLevel = typeof SharedSpellSlotLevel.Type;
export const TempHP = SharedTempHP;
export type TempHP = typeof SharedTempHP.Type;
export type {
  Ability,
  ActivationTiming,
  ArmorCategory,
  ArmorWeight,
  CasterClass,
  CasterType,
  Condition,
  CoverType,
  DamageQualifier,
  DamageType,
  HandUse,
  IncapSource,
  MagicalDamageType,
  PhysicalDamageType,
  ShoveChoice,
  Size,
  SpellSchool,
  SpellSlots,
  WeaponProperty,
} from "@dnd/shared/types";

// --- Domain constants + derived types ---
// Convention: define const array first, derive union type with typeof X[number].
// See CLAUDE.md "Typed constant arrays" and "Derive union types from constant arrays".

export interface QualifiedPhysicalBypass {
  readonly damageType: PhysicalDamageType;
  readonly bypassedBy: ReadonlySet<DamageQualifier>;
}

export interface ConditionConsequences {
  readonly ownAttackDisadvantage: boolean;
  readonly defenseAdvantage: boolean;
  readonly defenseAutoCritWithin5ft: boolean;
  readonly checkDisadvantage: boolean;
  readonly saveDexDisadvantage: boolean;
  readonly saveStrDexAutoFail: boolean;
  readonly speedZero: boolean;
  readonly blocksActions: boolean;
  readonly blocksSpeech: boolean;
}

const NO_CONDITION_CONSEQUENCES: ConditionConsequences = {
  ownAttackDisadvantage: false,
  defenseAdvantage: false,
  defenseAutoCritWithin5ft: false,
  checkDisadvantage: false,
  saveDexDisadvantage: false,
  saveStrDexAutoFail: false,
  speedZero: false,
  blocksActions: false,
  blocksSpeech: false,
};

export const CANONICAL_CONDITION_CONSEQUENCES: Readonly<
  Record<Condition, ConditionConsequences>
> = {
  blinded: {
    ...NO_CONDITION_CONSEQUENCES,
    ownAttackDisadvantage: true,
    defenseAdvantage: true,
  },
  charmed: NO_CONDITION_CONSEQUENCES,
  deafened: NO_CONDITION_CONSEQUENCES,
  frightened: NO_CONDITION_CONSEQUENCES,
  grappled: {
    ...NO_CONDITION_CONSEQUENCES,
    speedZero: true,
  },
  incapacitated: {
    ...NO_CONDITION_CONSEQUENCES,
    blocksActions: true,
    blocksSpeech: true,
  },
  invisible: NO_CONDITION_CONSEQUENCES,
  paralyzed: {
    ...NO_CONDITION_CONSEQUENCES,
    defenseAdvantage: true,
    defenseAutoCritWithin5ft: true,
    saveStrDexAutoFail: true,
    speedZero: true,
    blocksActions: true,
    blocksSpeech: true,
  },
  petrified: {
    ...NO_CONDITION_CONSEQUENCES,
    defenseAdvantage: true,
    saveStrDexAutoFail: true,
    speedZero: true,
    blocksActions: true,
    blocksSpeech: true,
  },
  poisoned: {
    ...NO_CONDITION_CONSEQUENCES,
    ownAttackDisadvantage: true,
    checkDisadvantage: true,
  },
  prone: {
    ...NO_CONDITION_CONSEQUENCES,
    ownAttackDisadvantage: true,
  },
  restrained: {
    ...NO_CONDITION_CONSEQUENCES,
    ownAttackDisadvantage: true,
    defenseAdvantage: true,
    saveDexDisadvantage: true,
    speedZero: true,
  },
  stunned: {
    ...NO_CONDITION_CONSEQUENCES,
    defenseAdvantage: true,
    saveStrDexAutoFail: true,
    blocksActions: true,
  },
  unconscious: {
    ...NO_CONDITION_CONSEQUENCES,
    defenseAdvantage: true,
    defenseAutoCritWithin5ft: true,
    saveStrDexAutoFail: true,
    speedZero: true,
    blocksActions: true,
    blocksSpeech: true,
  },
};

// TODO: wrong domain language
export const ACTION_TYPES = [
  "attack",
  "magic",
  "dash",
  "disengage",
  "dodge",
  "help",
  "hide",
  "influence",
  "ready",
  "search",
  "study",
  "utilize",
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

// TODO wrong domain language. it is either charList or stateBlock.
export const CREATURE_KINDS = ["PC", "Monster"] as const;
export type CreatureKind = (typeof CREATURE_KINDS)[number];

export const UNARMORED_DEFENSES = ["none", "barbarian", "monk"] as const;
export type UnarmoredDefense = (typeof UNARMORED_DEFENSES)[number];

export const EXPIRY_PHASES = ["start", "end"] as const;
export type ExpiryPhase = (typeof EXPIRY_PHASES)[number];

export interface EffectTurnHook {
  readonly healAmount?: number;
  readonly tempHpAmount?: number;
  readonly damageAmount?: number;
  readonly damageType?: DamageType;
  readonly removeOnSaveSuccess?: boolean;
  readonly conditionsToRemove?: ReadonlyArray<Condition>;
  readonly requiresConcentrationCheck?: boolean;
}

export const ONE_SHOT_RIDER_TRIGGERS = [
  "nextMeleeWeaponHit",
  "nextWeaponHit",
] as const;
export type OneShotRiderTrigger = (typeof ONE_SHOT_RIDER_TRIGGERS)[number];

export interface OneShotRiderConsumption {
  readonly trigger: OneShotRiderTrigger;
}

export type ReactiveEffectPayload = {
  readonly trigger: "meleeHitWithin5ft";
  readonly damageType: "fire" | "cold";
};

export interface ConditionalGrantedCondition {
  readonly condition: Condition;
  readonly whileCondition: Condition;
  readonly endsEarlyOnDamage?: boolean;
  readonly endsEarlyOnWakeActionWithinFeet?: number;
}

export interface ActiveEffect {
  readonly spellId: string;
  readonly turnsRemaining: number;
  readonly expiresAt: ExpiryPhase;
  readonly casterId: CreatureId;
  readonly parentSpellId?: SpellId;
  readonly parentCasterId?: CreatureId;
  readonly expiryOwnerId?: CreatureId;
  readonly grantedConditions?: ReadonlyArray<Condition>;
  readonly conditionalGrantedConditions?: ReadonlyArray<ConditionalGrantedCondition>;
  readonly startOfTurnHook?: EffectTurnHook;
  readonly endOfTurnHook?: EffectTurnHook;
  readonly grantedResistances?: ReadonlySet<DamageType>;
  readonly grantedVulnerabilities?: ReadonlySet<DamageType>;
  readonly grantedImmunities?: ReadonlySet<DamageType>;
  readonly grantedQualifiedPhysicalResistances?: ReadonlyArray<QualifiedPhysicalBypass>;
  readonly grantedQualifiedPhysicalVulnerabilities?: ReadonlyArray<QualifiedPhysicalBypass>;
  readonly grantedQualifiedPhysicalImmunities?: ReadonlyArray<QualifiedPhysicalBypass>;
  readonly blocksOpportunityAttacks?: boolean;
  readonly speedDeltaFeet?: number;
  readonly consumeOnQualifiedHit?: OneShotRiderConsumption;
  readonly reactivePayload?: ReactiveEffectPayload;
}

export interface Armor {
  readonly category: ArmorCategory;
  readonly baseAC: ArmorClass;
  readonly strRequirement: AbilityScore;
  readonly stealthDisadvantage: boolean;
}

export type ArmorState =
  | { readonly type: "unarmored" }
  | { readonly type: "wearingArmor"; readonly armor: Armor };

// --- Modifier result types ---

export interface AdvState {
  readonly hasAdvantage: boolean;
  readonly hasDisadvantage: boolean;
}

export interface DefenseMods {
  readonly attackerAdvantage: boolean;
  readonly attackerDisadvantage: boolean;
  readonly autoCrit: boolean;
}

export interface D20Mods {
  readonly hasAdvantage: boolean;
  readonly hasDisadvantage: boolean;
  readonly autoFail: boolean;
}

export interface AttackResult {
  readonly hits: boolean;
  readonly isCritical: boolean;
}

export interface FullAttackMods {
  readonly hasAdvantage: boolean;
  readonly hasDisadvantage: boolean;
  readonly autoCrit: boolean;
  readonly autoMiss: boolean;
}

export interface AttackContext {
  readonly attackerBlinded: boolean;
  readonly attackerProne: boolean;
  readonly attackerRestrained: boolean;
  readonly attackerPoisoned: boolean;
  readonly attackerFrightened: boolean;
  readonly attackerFrightSourceInLOS: boolean;
  readonly targetBlinded: boolean;
  readonly targetParalyzed: boolean;
  readonly targetPetrified: boolean;
  readonly targetStunned: boolean;
  readonly targetUnconscious: boolean;
  readonly targetRestrained: boolean;
  readonly targetProne: boolean;
  readonly attackerWithin5ft: boolean;
  readonly targetDodging: boolean;
  readonly targetIncapacitated: boolean;
  readonly targetSpeedZero: boolean;
  readonly targetCanSeeAttacker: boolean;
  readonly attackerCanSeeTarget: boolean;
  readonly attackerHelpedAgainstTarget: boolean;
  readonly isRangedAttack: boolean;
  readonly beyondNormalRange: boolean;
  readonly hostileWithin5ft: boolean;
  readonly isHeavyWeapon: boolean;
  readonly wielderStrScore: number;
  readonly wielderDexScore: number;
  readonly attackerGrappled: boolean;
  readonly targetIsGrappler: boolean;
  readonly underwater: boolean;
  readonly attackerHasSwimSpeed: boolean;
  readonly isUnderwaterMeleeException: boolean;
  readonly isUnderwaterRangedException: boolean;
  readonly attackerReckless: boolean;
  readonly targetReckless: boolean;
}

export interface AdvantageDamageDice {
  readonly diceCount: number;
  readonly dieSize: number;
}

export interface StatBlockAttackSource {
  readonly name: string;
  readonly extraDamageOnAdvantageHit?: AdvantageDamageDice;
}

export interface BattleWeaponProfile {
  readonly name: string;
  readonly damageType: DamageType;
  readonly isMelee: boolean;
  readonly properties: ReadonlySet<WeaponProperty>;
  readonly diceCount?: number;
  readonly damageDie?: number;
  readonly versatileDie?: number;
  readonly damageQualifiers?: ReadonlySet<DamageQualifier>;
  /**
   * Internal-only provenance for a projected monster stat-block attack.
   *
   * The public MCP `BATTLE_INIT` schema does not accept this field; core adds
   * it only when projecting a selected stat-block attack into battle state.
   */
  readonly statBlockAttackSource?: StatBlockAttackSource;
}

/** Synthetic SRD 5.2.1 unarmed-strike attack profile. */
export const UNARMED_STRIKE_PROFILE: BattleWeaponProfile = {
  name: "unarmed strike",
  damageType: "bludgeoning",
  isMelee: true,
  properties: new Set(),
};

// --- Branded string types (nominal — IDs) ---

type CreatureId = string & Brand.Brand<"CreatureId">;
const CreatureId = Brand.nominal<CreatureId>();
export { CreatureId };

type SpellId = string & Brand.Brand<"SpellId">;
const SpellId = Brand.nominal<SpellId>();
export const spellId: (s: string) => SpellId = SpellId;
export type { SpellId };

// --- Branded string types (extendable — SRD defaults + open extension) ---
// Pattern: SRDFoo | (string & Brand.Brand<"Foo"> & {})
// SRD literal type provides autocomplete; branded string allows extension.

type NonEmptyString = string & Brand.Brand<"NonEmptyString">;

export type SpellName = SRDSpellName | (NonEmptyString & {});
export type SRDSpellName =
  | "acid_splash"
  | "hold_person"
  | "bless"
  | "haste"
  | "spirit_guardians"
  | "fireball"
  | "burning_hands"
  | "guiding_bolt"
  | "inflict_wounds"
  | "healing_word"
  | "counterspell"
  | "shield"
  | "hellish_rebuke"
  | "bestow_curse"
  | "eyebite"
  | "fire_shield"
  | "chromatic_orb"
  | "greater_restoration"
  | "dominate_person"
  | "dominate_monster"
  | "dominate_beast"
  | "confusion"
  | "protection_from_evil_and_good";

export type CreatureName = SRDCreatureName | (NonEmptyString & {});
export type SRDCreatureName = string & Brand.Brand<"SRDCreatureName">;

export type AttackName = SRDAttackName | (NonEmptyString & {});
export type SRDAttackName = string & Brand.Brand<"SRDAttackName">;

export type MonsterAbilityName = SRDMonsterAbilityName | (NonEmptyString & {});
export type SRDMonsterAbilityName = string &
  Brand.Brand<"SRDMonsterAbilityName">;

export const SPELL_SLOT_LEVELS = 9;
export const EMPTY_SLOTS: SpellSlots = new Array(SPELL_SLOT_LEVELS).fill(
  0,
) as SpellSlots;

// --- Record types ---

export interface DeathSaves {
  readonly successes: DeathSaveCount;
  readonly failures: DeathSaveCount;
}

export const DEATH_SAVES_RESET: DeathSaves = {
  successes: sharedDeathSaveCount(0),
  failures: sharedDeathSaveCount(0),
};
