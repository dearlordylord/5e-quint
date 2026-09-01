import { Schema } from "effect";
import { describe, expect, expectTypeOf, test } from "vitest";

import grapplerInput from "../../content/feat_grappler.json";
import type {
  ActivatedAbilityMechanics,
  ClassFeatureMechanics,
  FeatMechanics,
  MagicItemMechanics,
  PassiveMechanics,
  PassiveOperation,
  SpeciesTraitMechanics,
  UnitRecord,
  UnitRecordEncoded,
} from "./nonspell-types.ts";
import {
  ActivatedAbilityMechanicsSchema,
  ClassFeatureMechanicsSchema,
  FeatMechanicsSchema,
  MagicItemMechanicsSchema,
  PassiveMechanicsSchema,
  PassiveOperationSchema,
  SpeciesTraitMechanicsSchema,
  UnitRecordSchema,
} from "./schema-nonspell.ts";
import {
  PublishedSrdUnitRecordSchema,
  decodeUnitRecordSync,
} from "./schema.ts";

describe("canonical non-Spell Surface type owner", () => {
  test("keeps representative schema families aligned with their canonical types", () => {
    expectTypeOf<
      Schema.Schema.Type<typeof PassiveOperationSchema>
    >().toEqualTypeOf<PassiveOperation>();
    expectTypeOf<
      Schema.Schema.Type<typeof ActivatedAbilityMechanicsSchema>
    >().toEqualTypeOf<ActivatedAbilityMechanics>();
    expectTypeOf<
      Schema.Schema.Type<typeof PassiveMechanicsSchema>
    >().toEqualTypeOf<PassiveMechanics>();
    expectTypeOf<
      Schema.Schema.Type<typeof ClassFeatureMechanicsSchema>
    >().toEqualTypeOf<ClassFeatureMechanics>();
    expectTypeOf<
      Schema.Schema.Type<typeof FeatMechanicsSchema>
    >().toEqualTypeOf<FeatMechanics>();
    expectTypeOf<
      Schema.Schema.Type<typeof SpeciesTraitMechanicsSchema>
    >().toEqualTypeOf<SpeciesTraitMechanics>();
    expectTypeOf<
      Schema.Schema.Type<typeof MagicItemMechanicsSchema>
    >().toEqualTypeOf<MagicItemMechanics>();
    expectTypeOf<
      Schema.Schema.Type<typeof UnitRecordSchema>
    >().toEqualTypeOf<UnitRecord>();
    expectTypeOf<
      Schema.Codec.Encoded<typeof UnitRecordSchema>
    >().toEqualTypeOf<UnitRecordEncoded>();
  });

  test("parses the canonical Feat and its published SRD projection", () => {
    const record = decodeUnitRecordSync(grapplerInput);
    const publicationInput = {
      ...grapplerInput,
      rulesExcerpt: "Synthetic publication-boundary evidence.",
    };
    const published = Schema.decodeUnknownSync(PublishedSrdUnitRecordSchema)(
      publicationInput,
    );

    expect(record.kind).toBe("feat");
    expect(published).toMatchObject(record);
    expect(Schema.encodeSync(PublishedSrdUnitRecordSchema)(published)).toEqual(
      publicationInput,
    );
  });
});
