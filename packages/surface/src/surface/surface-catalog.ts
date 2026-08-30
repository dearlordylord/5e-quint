import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "./stat-block-catalog.ts";
import { srdUnitCollection } from "./unit-catalog.ts";
import { decodeSrdSurfaceSync } from "./schema.ts";
import type { SrdSurface } from "./types.ts";

const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});

/* v8 ignore start -- @preserve -- the canonical collection constructor rejects malformed records before publication assembly */
if (statBlockCatalogResult.tag === "invalid") {
  throw new Error(
    `Invalid SRD Stat Block catalog for publication: ${JSON.stringify(
      statBlockCatalogResult.issues,
    )}`,
  );
}
/* v8 ignore stop -- @preserve */

/** The single language-neutral SRD publication assembled from the two record families. */
export const srdSurface: SrdSurface = decodeSrdSurfaceSync({
  kind: "srd-5.2.1-surface-catalog",
  units: srdUnitCollection.units,
  statBlocks: statBlockCatalogResult.catalog.listStatBlocks(),
});
