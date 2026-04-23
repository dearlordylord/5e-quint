import { Brand, Schema } from "effect";

export type NonEmptyArray<T> = [T, ...T[]];
export type ReadonlyNonEmptyArray<T> = readonly [T, ...T[]];

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

export const INCAP_SOURCES = [
  "paralyzed",
  "petrified",
  "stunned",
  "unconscious",
  "direct",
] as const;
export type IncapSource = (typeof INCAP_SOURCES)[number];

export const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"] as const;
export type Ability = (typeof ABILITIES)[number];

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
export const Integer = Brand.refined<Integer>(
  (n: number) => Number.isInteger(n),
  (n: number) => Brand.error(`Expected ${n} to be an integer`),
);

export type NonNegativeInteger = number & Brand.Brand<"NonNegativeInteger">;
export const NonNegativeInteger = Brand.all(
  Integer,
  Brand.refined<NonNegativeInteger>(
    (n: number) => n >= 0,
    (n: number) => Brand.error(`Expected ${n} to be a non-negative integer`),
  ),
);

export type PositiveInteger = number & Brand.Brand<"PositiveInteger">;
export const PositiveInteger = Brand.all(
  Integer,
  Brand.refined<PositiveInteger>(
    (n: number) => n > 0,
    (n: number) => Brand.error(`Expected ${n} to be a positive integer`),
  ),
);

export type DieRollResult = PositiveInteger & Brand.Brand<"DieRollResult">;
export const DieRollResult = Brand.all(
  PositiveInteger,
  Brand.nominal<DieRollResult>(),
);

export type Initiative = Integer & Brand.Brand<"Initiative">;
export const Initiative = Brand.all(
  Integer,
  Brand.nominal<Initiative>(),
);

export type Index = NonNegativeInteger & Brand.Brand<"Index">;
export const Index = Brand.all(
  NonNegativeInteger,
  Brand.nominal<Index>(),
);

export type Hp = NonNegativeInteger & Brand.Brand<"Hp">;
export const Hp = Brand.all(
  NonNegativeInteger,
  Brand.nominal<Hp>(),
);

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
export const Round = Brand.all(
  PositiveInteger,
  Brand.nominal<Round>(),
);

export const CreatureId = Schema.NonEmptyTrimmedString.pipe(
  Schema.brand("CreatureId"),
);
export type CreatureId = typeof CreatureId.Type;
