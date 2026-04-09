import { Brand, Schema } from "effect";

import type { ClassName } from "#/features/class-tables.ts";

// --- Domain constants + derived types ---
// Convention: define const array first, derive union type with typeof X[number].
// See CLAUDE.md "Typed constant arrays" and "Derive union types from constant arrays".

export const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"] as const;
export type Ability = (typeof ABILITIES)[number];

export const DAMAGE_TYPES = [
  "acid",
  "bludgeoning",
  "cold",
  "fire",
  "force",
  "lightning",
  "necrotic",
  "piercing",
  "poison",
  "psychic",
  "radiant",
  "slashing",
  "thunder",
] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];

export const PHYSICAL_DAMAGE_TYPES = [
  "bludgeoning",
  "piercing",
  "slashing",
] as const satisfies ReadonlyArray<DamageType>;
export type PhysicalDamageType = (typeof PHYSICAL_DAMAGE_TYPES)[number];

export const DAMAGE_QUALIFIERS = [
  "adamantine",
  "magical",
  "silvered",
] as const;
export type DamageQualifier = (typeof DAMAGE_QUALIFIERS)[number];

export interface QualifiedPhysicalBypass {
  readonly damageType: PhysicalDamageType;
  readonly bypassedBy: ReadonlySet<DamageQualifier>;
}

export const WEAPON_PROPERTIES = [
  "ammunition",
  "finesse",
  "heavy",
  "light",
  "loading",
  "reach",
  "thrown",
  "twoHanded",
  "versatile",
] as const;
export type WeaponProperty = (typeof WEAPON_PROPERTIES)[number];

export const CONDITIONS = [
  "blinded",
  "charmed",
  "deafened",
  "frightened",
  "grappled",
  "incapacitated",
  "invisible",
  "paralyzed",
  "petrified",
  "poisoned",
  "prone",
  "restrained",
  "stunned",
  "unconscious",
] as const;
export type Condition = (typeof CONDITIONS)[number];

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

export const INCAP_SOURCES = [
  "paralyzed",
  "petrified",
  "stunned",
  "unconscious",
  "direct",
] as const;
export type IncapSource = (typeof INCAP_SOURCES)[number];

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

export const COVER_TYPES = ["none", "half", "threeQuarters", "total"] as const;
export type CoverType = (typeof COVER_TYPES)[number];

export const ARMOR_CATEGORIES = ["light", "medium", "heavy"] as const;
export type ArmorCategory = (typeof ARMOR_CATEGORIES)[number];

export const ARMOR_WEIGHTS = ["none", "light", "medium", "heavy"] as const;
export type ArmorWeight = (typeof ARMOR_WEIGHTS)[number];

export const SIZES = [
  "tiny",
  "small",
  "medium",
  "large",
  "huge",
  "gargantuan",
] as const;
export type Size = (typeof SIZES)[number];

export const SHOVE_CHOICES = ["prone", "push"] as const;
export type ShoveChoice = (typeof SHOVE_CHOICES)[number];

export const CREATURE_KINDS = ["PC", "Monster"] as const;
export type CreatureKind = (typeof CREATURE_KINDS)[number];

export const UNARMORED_DEFENSES = ["none", "barbarian", "monk"] as const;
export type UnarmoredDefense = (typeof UNARMORED_DEFENSES)[number];

export const EXPIRY_PHASES = ["start", "end"] as const;
export type ExpiryPhase = (typeof EXPIRY_PHASES)[number];

export const SPELL_SCHOOLS = [
  "abjuration",
  "conjuration",
  "divination",
  "enchantment",
  "evocation",
  "illusion",
  "necromancy",
  "transmutation",
] as const;
export type SpellSchool = (typeof SPELL_SCHOOLS)[number];

export const CASTER_CLASSES = [
  "bard",
  "cleric",
  "druid",
  "paladin",
  "ranger",
  "sorcerer",
  "warlock",
  "wizard",
] as const satisfies ReadonlyArray<ClassName>;
export type CasterClass = (typeof CASTER_CLASSES)[number];

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

export interface ActiveEffect {
  readonly spellId: SpellId;
  readonly turnsRemaining: number;
  readonly expiresAt: ExpiryPhase;
  readonly casterId: CreatureId;
  readonly expiryOwnerId?: CreatureId;
  readonly grantedConditions?: ReadonlyArray<Condition>;
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

export interface BattleWeaponProfile {
  readonly name: string;
  readonly damageType: DamageType;
  readonly isMelee: boolean;
  readonly properties: ReadonlySet<WeaponProperty>;
  readonly damageQualifiers?: ReadonlySet<DamageQualifier>;
}

// --- Branded numeric types ---
/* eslint-disable no-magic-numbers -- Schema constraints and literal types use domain-specific constants */

const HP = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
  Schema.brand("HP"),
);
type HP = typeof HP.Type;
export function hp(n: number): HP {
  return HP.make(Math.max(0, Math.floor(n)));
}
export type { HP };

const TempHP = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
  Schema.brand("TempHP"),
);
type TempHP = typeof TempHP.Type;
export function tempHp(n: number): TempHP {
  return TempHP.make(Math.max(0, Math.floor(n)));
}
export type { TempHP };

const DamageAmount = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
  Schema.brand("DamageAmount"),
);
type DamageAmount = typeof DamageAmount.Type;
export function damageAmount(n: number): DamageAmount {
  return DamageAmount.make(Math.max(0, Math.floor(n)));
}
export type { DamageAmount };

const HealAmount = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
  Schema.brand("HealAmount"),
);
type HealAmount = typeof HealAmount.Type;
export function healAmount(n: number): HealAmount {
  return HealAmount.make(Math.max(1, Math.floor(n)));
}
export type { HealAmount };

const DeathSaveCount = Schema.Literal(0, 1, 2, 3).pipe(
  Schema.brand("DeathSaveCount"),
);
type DeathSaveCount = typeof DeathSaveCount.Type;
export function deathSaveCount(n: number): DeathSaveCount {
  return DeathSaveCount.make(
    Math.max(0, Math.min(3, Math.floor(n))) as 0 | 1 | 2 | 3,
  );
}
export type { DeathSaveCount };

const D20Roll = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
  Schema.lessThanOrEqualTo(20),
  Schema.brand("D20Roll"),
);
type D20Roll = typeof D20Roll.Type;
export function d20Roll(n: number): D20Roll {
  const MIN = 1;
  const MAX = 20;
  return D20Roll.make(Math.max(MIN, Math.min(MAX, Math.floor(n))));
}
export type { D20Roll };

const ExhaustionLevel = Schema.Literal(0, 1, 2, 3, 4, 5, 6).pipe(
  Schema.brand("ExhaustionLevel"),
);
type ExhaustionLevel = typeof ExhaustionLevel.Type;
export function exhaustionLevel(n: number): ExhaustionLevel {
  const MAX = 6;
  return ExhaustionLevel.make(
    Math.max(0, Math.min(MAX, Math.floor(n))) as 0 | 1 | 2 | 3 | 4 | 5 | 6,
  );
}
export type { ExhaustionLevel };

const AbilityScore = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
  Schema.lessThanOrEqualTo(30),
  Schema.brand("AbilityScore"),
);
type AbilityScore = typeof AbilityScore.Type;
export function abilityScore(n: number): AbilityScore {
  const MAX = 30;
  return AbilityScore.make(Math.max(1, Math.min(MAX, Math.floor(n))));
}
export type { AbilityScore };

const ProficiencyBonus = Schema.Literal(2, 3, 4, 5, 6).pipe(
  Schema.brand("ProficiencyBonus"),
);
type ProficiencyBonus = typeof ProficiencyBonus.Type;
export function proficiencyBonus(n: number): ProficiencyBonus {
  const MIN = 2;
  const MAX = 6;
  return ProficiencyBonus.make(
    Math.max(MIN, Math.min(MAX, Math.floor(n))) as 2 | 3 | 4 | 5 | 6,
  );
}
export type { ProficiencyBonus };

const MovementFeet = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
  Schema.brand("MovementFeet"),
);
type MovementFeet = typeof MovementFeet.Type;
export function movementFeet(n: number): MovementFeet {
  return MovementFeet.make(Math.max(0, Math.floor(n)));
}
export type { MovementFeet };

const ClassLevel = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
  Schema.lessThanOrEqualTo(20),
  Schema.brand("ClassLevel"),
);
type ClassLevel = typeof ClassLevel.Type;
export function classLevel(n: number): ClassLevel {
  const MAX = 20;
  return ClassLevel.make(Math.max(1, Math.min(MAX, Math.floor(n))));
}
export type { ClassLevel };

const CharacterLevel = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
  Schema.lessThanOrEqualTo(20),
  Schema.brand("CharacterLevel"),
);
type CharacterLevel = typeof CharacterLevel.Type;
export function characterLevel(n: number): CharacterLevel {
  const MAX = 20;
  return CharacterLevel.make(Math.max(1, Math.min(MAX, Math.floor(n))));
}
export type { CharacterLevel };

const ArmorClass = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
  Schema.brand("ArmorClass"),
);
type ArmorClass = typeof ArmorClass.Type;
export function armorClass(n: number): ArmorClass {
  return ArmorClass.make(Math.max(1, Math.floor(n)));
}
export type { ArmorClass };

const DifficultyClass = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
  Schema.brand("DifficultyClass"),
);
type DifficultyClass = typeof DifficultyClass.Type;
export function difficultyClass(n: number): DifficultyClass {
  return DifficultyClass.make(Math.max(1, Math.floor(n)));
}
export type { DifficultyClass };

const AbilityModifier = Schema.Number.pipe(
  Schema.int(),
  Schema.brand("AbilityModifier"),
);
type AbilityModifier = typeof AbilityModifier.Type;
export function abilityModifier(n: number): AbilityModifier {
  return AbilityModifier.make(Math.floor(n));
}
export type { AbilityModifier };

export const SpellSlotLevel = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
  Schema.lessThanOrEqualTo(9),
  Schema.brand("SpellSlotLevel"),
);
export type SpellSlotLevel = typeof SpellSlotLevel.Type;
export function spellSlotLevel(n: number): SpellSlotLevel {
  const MAX = 9;
  return SpellSlotLevel.make(Math.max(1, Math.min(MAX, Math.floor(n))));
}
const ResourceCount = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
  Schema.brand("ResourceCount"),
);
type ResourceCount = typeof ResourceCount.Type;
export function resourceCount(n: number): ResourceCount {
  return ResourceCount.make(Math.max(0, Math.floor(n)));
}
export type { ResourceCount };

/* eslint-enable no-magic-numbers */

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

export const CASTER_TYPES = ["full", "half", "third"] as const;
export type CasterType = (typeof CASTER_TYPES)[number];

export type SpellSlots = ReadonlyArray<number>;

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
  successes: deathSaveCount(0),
  failures: deathSaveCount(0),
};
