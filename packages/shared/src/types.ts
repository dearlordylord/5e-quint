import { Brand, Result, Schema } from "effect";
export {
  ABILITIES,
  CONDITIONS,
  type Ability,
  type Condition,
} from "./game-facts.ts";
export * from "./check-difficulty.ts";
export type {
  NonEmptyArray,
  ReadonlyNonEmptyArray,
} from "./non-empty-array.d.ts";

export function isArrayOfOne<T>(value: readonly T[]): value is readonly [T] {
  return value.length === 1;
}

const defaultGetOnlyOneError = (length: number): Error =>
  new Error(`Expected exactly one value, got ${length}`);

export const getOnlyOne = <T, E = Error>(
  value: readonly T[],
  error?: (length: number) => E,
): Result.Result<T, E | Error> =>
  isArrayOfOne(value)
    ? Result.succeed(value[0])
    : Result.fail((error ?? defaultGetOnlyOneError)(value.length));

export const getOnlyOneStrict = <T>(value: readonly [T]): T => {
  return value[0];
};

export const INCAP_SOURCES = [
  "paralyzed",
  "petrified",
  "stunned",
  "unconscious",
  "direct",
] as const;
export type IncapSource = (typeof INCAP_SOURCES)[number];

export const HAND_USES = [
  "free",
  "mainWeapon",
  "offWeapon",
  "shield",
  "grapple",
  "spellCreatedHeldObject",
] as const;
export type HandUse = (typeof HAND_USES)[number];

export const PHYSICAL_DAMAGE_TYPES = [
  "bludgeoning",
  "piercing",
  "slashing",
] as const;
export type PhysicalDamageType = (typeof PHYSICAL_DAMAGE_TYPES)[number];

export const MAGICAL_DAMAGE_TYPES = [
  "acid",
  "cold",
  "fire",
  "force",
  "lightning",
  "necrotic",
  "poison",
  "psychic",
  "radiant",
  "thunder",
] as const;
export type MagicalDamageType = (typeof MAGICAL_DAMAGE_TYPES)[number];

export const DAMAGE_TYPES = [
  ...PHYSICAL_DAMAGE_TYPES,
  ...MAGICAL_DAMAGE_TYPES,
] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];

export const DAMAGE_DIE_SIZES = [
  4, 6, 8, 10, 12,
] as const satisfies ReadonlyArray<number>;
export type DamageDieSize = (typeof DAMAGE_DIE_SIZES)[number];
export const DamageDieSizeSchema = Schema.Literals(DAMAGE_DIE_SIZES);

export const DAMAGE_QUALIFIERS = ["adamantine", "magical", "silvered"] as const;
export type DamageQualifier = (typeof DAMAGE_QUALIFIERS)[number];

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

export const ACTIVATION_TIMINGS = [
  "action",
  "bonusAction",
  "reaction",
] as const;
export type ActivationTiming = (typeof ACTIVATION_TIMINGS)[number];

export const COVER_TYPES = ["none", "half", "threeQuarters", "total"] as const;
export type CoverType = (typeof COVER_TYPES)[number];

export const ARMOR_CATEGORIES = ["light", "medium", "heavy"] as const;
export type ArmorCategory = (typeof ARMOR_CATEGORIES)[number];

export const ARMOR_WEIGHTS = ["none", ...ARMOR_CATEGORIES] as const;
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

export type Integer = number & Brand.Brand<"Integer">;
export const Integer = Brand.make<Integer>((n: number) => Number.isInteger(n));

export type NonNegativeInteger = number & Brand.Brand<"NonNegativeInteger">;
export const NonNegativeInteger = Brand.all(
  Integer,
  Brand.make<NonNegativeInteger>((n: number) => n >= 0),
);

export type CopperPieceAmount = NonNegativeInteger &
  Brand.Brand<"CopperPieceAmount">;
export const isCopperPieceAmount = (
  value: unknown,
): value is CopperPieceAmount =>
  typeof value === "number" && value >= 0 && Number.isSafeInteger(value);
export const CopperPieceAmount = Brand.all(
  NonNegativeInteger,
  Brand.make<CopperPieceAmount>(isCopperPieceAmount),
);
export const copperPieceAmount: (value: number) => CopperPieceAmount =
  CopperPieceAmount;

export type PositiveInteger = number & Brand.Brand<"PositiveInteger">;
export const PositiveInteger = Brand.all(
  Integer,
  Brand.make<PositiveInteger>((n: number) => n > 0),
);

export type DieRollResult = PositiveInteger & Brand.Brand<"DieRollResult">;
export const DieRollResult = Brand.all(
  PositiveInteger,
  Brand.nominal<DieRollResult>(),
);

export type Initiative = Integer & Brand.Brand<"Initiative">;
export const Initiative = Brand.all(Integer, Brand.nominal<Initiative>());

export type Index = NonNegativeInteger & Brand.Brand<"Index">;
export const Index = Brand.all(NonNegativeInteger, Brand.nominal<Index>());

export type Hp = NonNegativeInteger & Brand.Brand<"Hp">;
export const Hp = Brand.all(NonNegativeInteger, Brand.nominal<Hp>());

export const CASTER_CLASSES = [
  "bard",
  "cleric",
  "druid",
  "paladin",
  "ranger",
  "sorcerer",
  "warlock",
  "wizard",
] as const;
export type CasterClass = (typeof CASTER_CLASSES)[number];

export const CASTER_CLASS_TO_TYPE = {
  bard: "full",
  cleric: "full",
  druid: "full",
  paladin: "half",
  ranger: "half",
  sorcerer: "full",
  warlock: "full",
  wizard: "full",
} as const satisfies Readonly<Record<CasterClass, "full" | "half" | "third">>;
export const CASTER_TYPES = ["full", "half", "third"] as const;
export type CasterType = (typeof CASTER_TYPES)[number];

export type SpellSlots = ReadonlyArray<number>;

export type Round = PositiveInteger & Brand.Brand<"Round">;
export const Round = Brand.all(PositiveInteger, Brand.nominal<Round>());

export const CreatureId = Schema.Trimmed.pipe(
  Schema.check(Schema.isNonEmpty()),
  Schema.brand("CreatureId"),
);
export type CreatureId = typeof CreatureId.Type;

export type BattleProcedureExecutionRef = string &
  Brand.Brand<"BattleProcedureExecutionRef">;
export type BattleEffectExecutionRef = string &
  Brand.Brand<"BattleEffectExecutionRef">;
export type BattleStatBlockProcedureExecutionRef = BattleProcedureExecutionRef &
  Brand.Brand<"BattleStatBlockProcedureExecutionRef">;

export const HP = Schema.Number.pipe(
  Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
  Schema.brand("HP"),
);
export type HP = typeof HP.Type;
export function hp(n: number): HP {
  return HP.make(Math.max(0, Math.floor(n)));
}

export const TempHP = Schema.Number.pipe(
  Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
  Schema.brand("TempHP"),
);
export type TempHP = typeof TempHP.Type;
export function tempHp(n: number): TempHP {
  return TempHP.make(Math.max(0, Math.floor(n)));
}

export const DamageAmount = Schema.Number.pipe(
  Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
  Schema.brand("DamageAmount"),
);
export type DamageAmount = typeof DamageAmount.Type;
export function damageAmount(n: number): DamageAmount {
  return DamageAmount.make(Math.max(0, Math.floor(n)));
}

export const HealAmount = Schema.Number.pipe(
  Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(1)),
  Schema.brand("HealAmount"),
);
export type HealAmount = typeof HealAmount.Type;
export function healAmount(n: number): HealAmount {
  return HealAmount.make(Math.max(1, Math.floor(n)));
}

export const DEATH_SAVE_COUNTS = [0, 1, 2, 3] as const;
export const DeathSaveCount = Schema.Literals(DEATH_SAVE_COUNTS).pipe(
  Schema.brand("DeathSaveCount"),
);
export type DeathSaveCount = typeof DeathSaveCount.Type;
export function deathSaveCount(n: number): DeathSaveCount {
  const index = Math.max(0, Math.min(3, Math.floor(n)));
  return DeathSaveCount.make(DEATH_SAVE_COUNTS[index]!);
}

export const D20Roll = Schema.Number.pipe(
  Schema.check(
    Schema.isInt(),
    Schema.isGreaterThanOrEqualTo(1),
    Schema.isLessThanOrEqualTo(20),
  ),
  Schema.brand("D20Roll"),
);
export type D20Roll = typeof D20Roll.Type;
export function d20Roll(n: number): D20Roll {
  const MIN = 1;
  const MAX = 20;
  return D20Roll.make(Math.max(MIN, Math.min(MAX, Math.floor(n))));
}

export const EXHAUSTION_LEVELS = [0, 1, 2, 3, 4, 5, 6] as const;
export const ExhaustionLevel = Schema.Literals(EXHAUSTION_LEVELS).pipe(
  Schema.brand("ExhaustionLevel"),
);
export type ExhaustionLevel = typeof ExhaustionLevel.Type;
export function exhaustionLevel(n: number): ExhaustionLevel {
  const MAX = 6;
  const index = Math.max(0, Math.min(MAX, Math.floor(n)));
  return ExhaustionLevel.make(EXHAUSTION_LEVELS[index]!);
}

export const AbilityScore = Schema.Number.pipe(
  Schema.check(
    Schema.isInt(),
    Schema.isGreaterThanOrEqualTo(1),
    Schema.isLessThanOrEqualTo(30),
  ),
  Schema.brand("AbilityScore"),
);
export type AbilityScore = typeof AbilityScore.Type;
export function abilityScore(n: number): AbilityScore {
  const MAX = 30;
  return AbilityScore.make(Math.max(1, Math.min(MAX, Math.floor(n))));
}

export const PROFICIENCY_BONUSES = [2, 3, 4, 5, 6] as const;
export const ProficiencyBonus = Schema.Literals(PROFICIENCY_BONUSES).pipe(
  Schema.brand("ProficiencyBonus"),
);
export type ProficiencyBonus = typeof ProficiencyBonus.Type;
export function proficiencyBonus(n: number): ProficiencyBonus {
  const MIN = 2;
  const MAX = 6;
  const value = Math.max(MIN, Math.min(MAX, Math.floor(n)));
  return ProficiencyBonus.make(PROFICIENCY_BONUSES[value - MIN]!);
}

export const MovementFeet = Schema.Number.pipe(
  Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
  Schema.brand("MovementFeet"),
);
export type MovementFeet = typeof MovementFeet.Type;
export function movementFeet(n: number): MovementFeet {
  return MovementFeet.make(Math.max(0, Math.floor(n)));
}

export const MovementDeltaFeet = Schema.Number.pipe(
  Schema.check(Schema.isInt()),
  Schema.brand("MovementDeltaFeet"),
);
export type MovementDeltaFeet = typeof MovementDeltaFeet.Type;
export function movementDeltaFeet(n: number): MovementDeltaFeet {
  return MovementDeltaFeet.make(Math.floor(n));
}

export const ClassLevel = Schema.Number.pipe(
  Schema.check(
    Schema.isInt(),
    Schema.isGreaterThanOrEqualTo(1),
    Schema.isLessThanOrEqualTo(20),
  ),
  Schema.brand("ClassLevel"),
);
export type ClassLevel = typeof ClassLevel.Type;
export function classLevel(n: number): ClassLevel {
  const MAX = 20;
  return ClassLevel.make(Math.max(1, Math.min(MAX, Math.floor(n))));
}

export const CharacterLevel = Schema.Number.pipe(
  Schema.check(
    Schema.isInt(),
    Schema.isGreaterThanOrEqualTo(1),
    Schema.isLessThanOrEqualTo(20),
  ),
  Schema.brand("CharacterLevel"),
);
export type CharacterLevel = typeof CharacterLevel.Type;
export function characterLevel(n: number): CharacterLevel {
  const MAX = 20;
  return CharacterLevel.make(Math.max(1, Math.min(MAX, Math.floor(n))));
}

export function proficiencyBonusForCharacterLevel(
  totalLevel: CharacterLevel,
): ProficiencyBonus {
  return proficiencyBonus(2 + Math.floor((totalLevel - 1) / 4));
}

export const ArmorClass = Schema.Number.pipe(
  Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(1)),
  Schema.brand("ArmorClass"),
);
export type ArmorClass = typeof ArmorClass.Type;
export function armorClass(n: number): ArmorClass {
  return ArmorClass.make(Math.max(1, Math.floor(n)));
}

export const AttackBonus = Schema.Number.pipe(
  Schema.check(Schema.isInt()),
  Schema.brand("AttackBonus"),
);
export type AttackBonus = typeof AttackBonus.Type;
export function attackBonus(n: number): AttackBonus {
  return AttackBonus.make(Math.floor(n));
}

/** SRD ability score to modifier: floor((score - 10) / 2). */
export function abilityScoreToMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

export const SpellSlotLevel = Schema.Number.pipe(
  Schema.check(
    Schema.isInt(),
    Schema.isGreaterThanOrEqualTo(1),
    Schema.isLessThanOrEqualTo(9),
  ),
  Schema.brand("SpellSlotLevel"),
);
export type SpellSlotLevel = typeof SpellSlotLevel.Type;
export function spellSlotLevel(n: number): SpellSlotLevel {
  const MAX = 9;
  return SpellSlotLevel.make(Math.max(1, Math.min(MAX, Math.floor(n))));
}

export const ResourceCount = Schema.Number.pipe(
  Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
  Schema.brand("ResourceCount"),
);
export type ResourceCount = typeof ResourceCount.Type;
export function resourceCount(n: number): ResourceCount {
  return ResourceCount.make(Math.max(0, Math.floor(n)));
}
