/** Public SRD Stat Block catalog boundary: canonical mechanics plus eager corpus data. */
import { Match } from "effect";

import { srdStatBlockCollection } from "./stat-block-catalog-data.ts";
import { buildStatBlockCatalog } from "./stat-block-catalog-core.ts";

export * from "./stat-block-catalog-core.ts";
export { srdStatBlockCollection };

const installedCatalog = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});

export const srdStatBlockCatalog = Match.value(installedCatalog).pipe(
  Match.when({ tag: "ok" }, ({ catalog }) => catalog),
  Match.when({ tag: "invalid" }, ({ issues }) => {
    /* v8 ignore start -- @preserve -- generated SRD collection construction validates the same id, identity, and provenance invariants before installation */
    throw new Error(
      `Generated SRD Stat Block catalog is invalid: ${JSON.stringify(issues)}`,
    );
    /* v8 ignore stop -- @preserve */
  }),
  Match.exhaustive,
);
