import type { Schema } from "effect";

import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type { UnitRecordSchema } from "./schema-nonspell.ts";
import type {
  SrdStatBlockRecord,
  SrdStatBlockRecordEncoded,
} from "./stat-block-types.ts";

export const SRD_PROVENANCE_KIND = "srd-5.2.1" as const;
export const SRD_SURFACE_KIND = "srd-5.2.1-surface-catalog" as const;

type RulesExcerpt = string;

type ProvenanceBearingRecord = {
  readonly provenance: { readonly section: string };
};

type SrdUnitRecordValue<Record extends ProvenanceBearingRecord> =
  Record extends ProvenanceBearingRecord
    ? Omit<Record, "provenance"> & {
        readonly provenance: {
          readonly kind: typeof SRD_PROVENANCE_KIND;
          readonly section: Record["provenance"]["section"];
        };
      }
    : never;

type PublishedSrdRecord<Record> = Record & {
  readonly rulesExcerpt: RulesExcerpt;
};

type UnitRecord = Schema.Schema.Type<typeof UnitRecordSchema>;
type UnitRecordEncoded = Schema.Codec.Encoded<typeof UnitRecordSchema>;

export type SrdUnitRecord = SrdUnitRecordValue<UnitRecord>;
export type SrdUnitRecordEncoded = SrdUnitRecordValue<UnitRecordEncoded>;
export type PublishedSrdUnitRecord = PublishedSrdRecord<SrdUnitRecord>;
export type PublishedSrdUnitRecordEncoded =
  PublishedSrdRecord<SrdUnitRecordEncoded>;

export type PublishedSrdStatBlockRecord =
  PublishedSrdRecord<SrdStatBlockRecord>;
export type PublishedSrdStatBlockRecordEncoded =
  PublishedSrdRecord<SrdStatBlockRecordEncoded>;

export type SrdSurface = {
  readonly kind: typeof SRD_SURFACE_KIND;
  readonly units: ReadonlyNonEmptyArray<SrdUnitRecord>;
  readonly statBlocks: ReadonlyNonEmptyArray<SrdStatBlockRecord>;
};

export type SrdSurfaceEncoded = {
  readonly kind: typeof SRD_SURFACE_KIND;
  readonly units: ReadonlyNonEmptyArray<SrdUnitRecordEncoded>;
  readonly statBlocks: ReadonlyNonEmptyArray<SrdStatBlockRecordEncoded>;
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
