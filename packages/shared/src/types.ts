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
