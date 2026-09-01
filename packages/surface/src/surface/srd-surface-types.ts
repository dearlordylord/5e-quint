import type { Schema } from "effect";

import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type { UnitRecordSchema } from "./schema-nonspell.ts";
import type {
  StatBlockRecord,
  StatBlockRecordEncoded,
} from "./stat-block-types.ts";

export const SRD_PROVENANCE_KIND = "srd-5.2.1" as const;
export const SRD_SURFACE_KIND = "srd-5.2.1-surface-catalog" as const;

export type RulesExcerpt = string;

type ProvenanceBearingRecord = {
  readonly provenance: { readonly section: string };
};

type SrdRecord<Record extends ProvenanceBearingRecord> =
  Record extends ProvenanceBearingRecord
    ? Omit<Record, "provenance"> & {
        readonly provenance: {
          readonly kind: typeof SRD_PROVENANCE_KIND;
          readonly section: Record["provenance"]["section"];
        };
      }
    : never;

type PublishedSrdRecord<Record extends ProvenanceBearingRecord> =
  SrdRecord<Record> & { readonly rulesExcerpt: RulesExcerpt };

type UnitRecord = Schema.Schema.Type<typeof UnitRecordSchema>;
type UnitRecordEncoded = Schema.Codec.Encoded<typeof UnitRecordSchema>;

export type SrdUnitRecord = SrdRecord<UnitRecord>;
export type SrdUnitRecordEncoded = SrdRecord<UnitRecordEncoded>;
export type PublishedSrdUnitRecord = PublishedSrdRecord<UnitRecord>;
export type PublishedSrdUnitRecordEncoded =
  PublishedSrdRecord<UnitRecordEncoded>;

export type PublishedSrdStatBlockRecord = PublishedSrdRecord<StatBlockRecord>;
export type PublishedSrdStatBlockRecordEncoded =
  PublishedSrdRecord<StatBlockRecordEncoded>;

export type SrdSurface = {
  readonly kind: typeof SRD_SURFACE_KIND;
  readonly units: ReadonlyNonEmptyArray<SrdUnitRecord>;
  readonly statBlocks: ReadonlyNonEmptyArray<SrdRecord<StatBlockRecord>>;
};

export type SrdSurfaceEncoded = {
  readonly kind: typeof SRD_SURFACE_KIND;
  readonly units: ReadonlyNonEmptyArray<SrdUnitRecordEncoded>;
  readonly statBlocks: ReadonlyNonEmptyArray<SrdRecord<StatBlockRecordEncoded>>;
};

export type PublishedSrdSurface = {
  readonly kind: typeof SRD_SURFACE_KIND;
  readonly units: ReadonlyNonEmptyArray<PublishedSrdUnitRecord>;
  readonly statBlocks: ReadonlyNonEmptyArray<PublishedSrdStatBlockRecord>;
};

export type PublishedSrdSurfaceEncoded = {
  readonly kind: typeof SRD_SURFACE_KIND;
  readonly units: ReadonlyNonEmptyArray<PublishedSrdUnitRecordEncoded>;
  readonly statBlocks: ReadonlyNonEmptyArray<PublishedSrdStatBlockRecordEncoded>;
};
