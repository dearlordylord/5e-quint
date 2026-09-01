import { Schema } from "effect";
import { describe, expect, expectTypeOf, test } from "vitest";

import skeletonInput from "../../content/stat_block_skeleton.json";
import {
  PublishedSrdStatBlockRecordSchema,
  StatBlockRecordSchema,
  decodeStatBlockRecordSync,
} from "./schema.ts";
import { StandaloneStatBlockSchema } from "./schema-spell.ts";
import type {
  StandaloneStatBlock,
  StandaloneStatBlockEncoded,
  StatBlockRecord,
  StatBlockRecordEncoded,
} from "./stat-block-types.ts";

describe("canonical Stat Block type owner", () => {
  test("keeps the runtime codecs exactly aligned with the canonical types", () => {
    expectTypeOf<
      Schema.Schema.Type<typeof StandaloneStatBlockSchema>
    >().toEqualTypeOf<StandaloneStatBlock>();
    expectTypeOf<StandaloneStatBlock>().toEqualTypeOf<
      Schema.Schema.Type<typeof StandaloneStatBlockSchema>
    >();
    expectTypeOf<
      Schema.Schema.Type<typeof StatBlockRecordSchema>
    >().toEqualTypeOf<StatBlockRecord>();
    expectTypeOf<StatBlockRecord>().toEqualTypeOf<
      Schema.Schema.Type<typeof StatBlockRecordSchema>
    >();
    expectTypeOf<
      Schema.Codec.Encoded<typeof StandaloneStatBlockSchema>
    >().toEqualTypeOf<StandaloneStatBlockEncoded>();
    expectTypeOf<
      Schema.Codec.Encoded<typeof StatBlockRecordSchema>
    >().toEqualTypeOf<StatBlockRecordEncoded>();
  });

  test("parses the canonical record and its published SRD specialization", () => {
    const record = decodeStatBlockRecordSync(skeletonInput);
    const publicationInput = {
      ...skeletonInput,
      rulesExcerpt: "Synthetic publication-boundary evidence.",
    };
    const published = Schema.decodeUnknownSync(
      PublishedSrdStatBlockRecordSchema,
    )(publicationInput);

    expect(record.id).toBe("stat_block_skeleton");
    expect(published).toMatchObject(record);
    expect(
      Schema.encodeSync(PublishedSrdStatBlockRecordSchema)(published),
    ).toEqual(publicationInput);
  });
});
