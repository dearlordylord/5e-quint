import { Schema } from "effect";
import { describe, expect, expectTypeOf, test } from "vitest";

import blessInput from "../../content/bless.json";
import abolethInput from "../../content/stat_block_aboleth.json";
import {
  PublishedSrdSurfaceSchema,
  PublishedSrdUnitRecordSchema,
  SrdSurfaceSchema,
  SrdUnitRecordSchema,
} from "./schema.ts";
import { SpellMechanicsSchema } from "./schema-spell.ts";
import type {
  SpellMechanics,
  SpellMechanicsEncoded,
} from "./spell-mechanics-types.ts";
import type {
  PublishedSrdSurface,
  PublishedSrdSurfaceEncoded,
  PublishedSrdUnitRecord,
  PublishedSrdUnitRecordEncoded,
  SrdSurface,
  SrdSurfaceEncoded,
  SrdUnitRecord,
  SrdUnitRecordEncoded,
} from "./srd-surface-types.ts";

describe("canonical Spell and SRD Surface type owners", () => {
  test("keeps every runtime codec exactly aligned with its canonical types", () => {
    expectTypeOf<
      Schema.Schema.Type<typeof SpellMechanicsSchema>
    >().toEqualTypeOf<SpellMechanics>();
    expectTypeOf<SpellMechanics>().toEqualTypeOf<
      Schema.Schema.Type<typeof SpellMechanicsSchema>
    >();
    expectTypeOf<
      Schema.Codec.Encoded<typeof SpellMechanicsSchema>
    >().toEqualTypeOf<SpellMechanicsEncoded>();
    expectTypeOf<SpellMechanicsEncoded>().toEqualTypeOf<
      Schema.Codec.Encoded<typeof SpellMechanicsSchema>
    >();

    expectTypeOf<
      Schema.Schema.Type<typeof SrdUnitRecordSchema>
    >().toEqualTypeOf<SrdUnitRecord>();
    expectTypeOf<SrdUnitRecord>().toEqualTypeOf<
      Schema.Schema.Type<typeof SrdUnitRecordSchema>
    >();
    expectTypeOf<
      Schema.Codec.Encoded<typeof SrdUnitRecordSchema>
    >().toEqualTypeOf<SrdUnitRecordEncoded>();
    expectTypeOf<SrdUnitRecordEncoded>().toEqualTypeOf<
      Schema.Codec.Encoded<typeof SrdUnitRecordSchema>
    >();

    expectTypeOf<
      Schema.Schema.Type<typeof PublishedSrdUnitRecordSchema>
    >().toEqualTypeOf<PublishedSrdUnitRecord>();
    expectTypeOf<PublishedSrdUnitRecord>().toEqualTypeOf<
      Schema.Schema.Type<typeof PublishedSrdUnitRecordSchema>
    >();
    expectTypeOf<
      Schema.Codec.Encoded<typeof PublishedSrdUnitRecordSchema>
    >().toEqualTypeOf<PublishedSrdUnitRecordEncoded>();
    expectTypeOf<PublishedSrdUnitRecordEncoded>().toEqualTypeOf<
      Schema.Codec.Encoded<typeof PublishedSrdUnitRecordSchema>
    >();

    expectTypeOf<
      Schema.Schema.Type<typeof SrdSurfaceSchema>
    >().toEqualTypeOf<SrdSurface>();
    expectTypeOf<SrdSurface>().toEqualTypeOf<
      Schema.Schema.Type<typeof SrdSurfaceSchema>
    >();
    expectTypeOf<
      Schema.Codec.Encoded<typeof SrdSurfaceSchema>
    >().toEqualTypeOf<SrdSurfaceEncoded>();
    expectTypeOf<SrdSurfaceEncoded>().toEqualTypeOf<
      Schema.Codec.Encoded<typeof SrdSurfaceSchema>
    >();

    expectTypeOf<
      Schema.Schema.Type<typeof PublishedSrdSurfaceSchema>
    >().toEqualTypeOf<PublishedSrdSurface>();
    expectTypeOf<PublishedSrdSurface>().toEqualTypeOf<
      Schema.Schema.Type<typeof PublishedSrdSurfaceSchema>
    >();
    expectTypeOf<
      Schema.Codec.Encoded<typeof PublishedSrdSurfaceSchema>
    >().toEqualTypeOf<PublishedSrdSurfaceEncoded>();
    expectTypeOf<PublishedSrdSurfaceEncoded>().toEqualTypeOf<
      Schema.Codec.Encoded<typeof PublishedSrdSurfaceSchema>
    >();
  });

  test("round-trips mechanics and preserves SRD publication identity", () => {
    const mechanics = Schema.decodeUnknownSync(SpellMechanicsSchema)(
      blessInput.mechanics,
    );
    expect(Schema.encodeSync(SpellMechanicsSchema)(mechanics)).toEqual(
      blessInput.mechanics,
    );

    const canonicalInput = {
      kind: "srd-5.2.1-surface-catalog",
      units: [blessInput],
      statBlocks: [abolethInput],
    };
    const canonical =
      Schema.decodeUnknownSync(SrdSurfaceSchema)(canonicalInput);
    expect(Schema.encodeSync(SrdSurfaceSchema)(canonical)).toEqual(
      canonicalInput,
    );

    const publishedInput = {
      kind: canonicalInput.kind,
      units: [
        {
          ...blessInput,
          rulesExcerpt: "Synthetic exact publication evidence for a spell.",
        },
      ],
      statBlocks: [
        {
          ...abolethInput,
          rulesExcerpt:
            "Synthetic exact publication evidence for a Stat Block.",
        },
      ],
    };
    const published = Schema.decodeUnknownSync(PublishedSrdSurfaceSchema)(
      publishedInput,
    );

    expect(published.units[0].id).toBe(blessInput.id);
    expect(published.statBlocks[0].id).toBe(abolethInput.id);
    expect(Schema.encodeSync(PublishedSrdSurfaceSchema)(published)).toEqual(
      publishedInput,
    );
  });

  test("rejects non-SRD provenance and missing publication prose", () => {
    expect(() =>
      Schema.decodeUnknownSync(SrdUnitRecordSchema)({
        ...blessInput,
        provenance: {
          kind: "synthetic-test",
          section: "surface-schema-type-owner-test",
        },
      }),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(PublishedSrdUnitRecordSchema)(blessInput),
    ).toThrow();
  });
});
