import { srdStatBlockCollection } from "./stat-block-catalog.ts";
import { srdUnitCollection } from "./unit-catalog.ts";
import { decodeSrdSurfaceSync } from "./schema.ts";
import type { SrdSurface } from "./types.ts";

/** The single language-neutral SRD publication assembled from the two record families. */
export const srdSurface: SrdSurface = decodeSrdSurfaceSync({
  kind: "srd-5.2.1-surface-catalog",
  units: srdUnitCollection.units,
  statBlocks: srdStatBlockCollection.statBlocks,
});
