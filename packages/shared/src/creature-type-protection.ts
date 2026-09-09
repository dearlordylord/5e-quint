import { Schema } from "effect";

import {
  CREATURE_TYPES,
  SURFACE_CONDITIONS,
  type CreatureType,
  type SurfaceCondition,
} from "./game-facts.ts";
import type { ReadonlyNonEmptyArray } from "./non-empty-array.d.ts";

const strictStruct = <Fields extends Schema.Struct.Fields>(fields: Fields) =>
  Schema.Struct(fields).pipe(
    Schema.annotate({
      parseOptions: { onExcessProperty: "error" },
    }),
  );

const CreatureTypeSchema = Schema.Literals(CREATURE_TYPES);
const SurfaceConditionSchema = Schema.Literals(SURFACE_CONDITIONS);

const distinctValues = (values: readonly string[]): boolean =>
  new Set(values).size === values.length;

const distinctKinds = (values: readonly { readonly kind: string }[]): boolean =>
  distinctValues(values.map(({ kind }) => kind));

type CreatureTypeProtectionOutcome =
  | {
      readonly kind: "new_applications";
      readonly result: "prevented";
    }
  | {
      readonly kind: "new_saves_against_existing_effects";
      readonly mode: "advantage";
    };

type CreatureTypeProtectionCapability =
  | {
      readonly kind: "attack_rolls_against_target";
      readonly mode: "disadvantage";
    }
  | {
      readonly kind: "relevant_effect_protection";
      readonly conditions: ReadonlyNonEmptyArray<SurfaceCondition>;
      readonly possession: "included";
      readonly outcomes: ReadonlyNonEmptyArray<CreatureTypeProtectionOutcome>;
    };

export interface CreatureTypeProtectionPolicy {
  readonly creatureTypes: ReadonlyNonEmptyArray<CreatureType>;
  readonly protections: ReadonlyNonEmptyArray<CreatureTypeProtectionCapability>;
}

const CreatureTypeProtectionOutcomeSchema = Schema.Union([
  strictStruct({
    kind: Schema.Literal("new_applications"),
    result: Schema.Literal("prevented"),
  }),
  strictStruct({
    kind: Schema.Literal("new_saves_against_existing_effects"),
    mode: Schema.Literal("advantage"),
  }),
]);

const CreatureTypeProtectionCapabilitySchema = Schema.Union([
  strictStruct({
    kind: Schema.Literal("attack_rolls_against_target"),
    mode: Schema.Literal("disadvantage"),
  }),
  strictStruct({
    kind: Schema.Literal("relevant_effect_protection"),
    conditions: Schema.NonEmptyArray(SurfaceConditionSchema).pipe(
      Schema.check(
        Schema.makeFilter(distinctValues, {
          message: "Relevant Conditions must be unique.",
          toJsonSchema: () => ({ uniqueItems: true }),
        }),
      ),
    ),
    possession: Schema.Literal("included"),
    outcomes: Schema.NonEmptyArray(CreatureTypeProtectionOutcomeSchema).pipe(
      Schema.check(
        Schema.makeFilter(distinctKinds, {
          message: "Relevant-effect protection outcomes must be unique.",
          toJsonSchema: () => ({ uniqueItems: true }),
        }),
      ),
    ),
  }),
]);

export const CreatureTypeProtectionPolicySchema = strictStruct({
  creatureTypes: Schema.NonEmptyArray(CreatureTypeSchema).pipe(
    Schema.check(
      Schema.makeFilter(distinctValues, {
        message: "Creature Types must be unique.",
        toJsonSchema: () => ({ uniqueItems: true }),
      }),
    ),
  ),
  protections: Schema.NonEmptyArray(
    CreatureTypeProtectionCapabilitySchema,
  ).pipe(
    Schema.check(
      Schema.makeFilter(distinctKinds, {
        message: "Creature-type protection capabilities must be unique.",
        toJsonSchema: () => ({ uniqueItems: true }),
      }),
    ),
  ),
}) satisfies Schema.Codec<CreatureTypeProtectionPolicy, unknown, never, never>;
