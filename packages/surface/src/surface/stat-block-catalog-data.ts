/** Eager canonical SRD Stat Block collection. Keep this module out of runtime bundles that receive staged projections. */
// Canonical authored state remains in content/*.dhall and its strict JSON
// peers; this generated module stores only their deterministic import order.
import { srdStatBlockAggregateInputs } from "./generated/srd-stat-block-aggregate.ts";
import { decodeStatBlockRecordSync } from "./schema.ts";
import {
  assertSrd521StatBlock,
  defineSrdStatBlockCollection,
} from "./stat-block-catalog-core.ts";

export const srdStatBlockCollection = defineSrdStatBlockCollection({
  statBlocks: srdStatBlockAggregateInputs.map((input) =>
    assertSrd521StatBlock(decodeStatBlockRecordSync(input)),
  ),
});
