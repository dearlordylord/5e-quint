import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import blessInput from "../../content/bless.json";
import abolethInput from "../../content/stat_block_aboleth.json";
import {
  PublishedSrdSurfaceSchema,
  PublishedSrdUnitRecordSchema,
  SrdSurfaceSchema,
  SrdUnitRecordSchema,
} from "./schema.ts";
import { SpellMechanicsSchema } from "./schema-spell.ts";

describe("Spell and SRD Surface schema publication parity", () => {
  test("round-trips mechanics and preserves SRD publication identity", () => {
    const mechanics = Schema.decodeUnknownSync(SpellMechanicsSchema)(
      blessInput.mechanics,
    );

    const canonicalUnit =
      Schema.decodeUnknownSync(SrdUnitRecordSchema)(blessInput);
    expect(Schema.encodeSync(SrdUnitRecordSchema)(canonicalUnit)).toEqual(
      blessInput,
    );

    const publishedUnitInput = {
      ...blessInput,
      rulesExcerpt: "Synthetic exact publication evidence for a spell.",
    };
    const publishedUnit = Schema.decodeUnknownSync(
      PublishedSrdUnitRecordSchema,
    )(publishedUnitInput);
    expect(
      Schema.encodeSync(PublishedSrdUnitRecordSchema)(publishedUnit),
    ).toEqual(publishedUnitInput);
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
      units: [publishedUnitInput],
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
