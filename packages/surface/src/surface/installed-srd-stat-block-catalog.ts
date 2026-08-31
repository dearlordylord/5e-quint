import { Match } from "effect";

import { srdStatBlockAggregateInputs } from "./generated/srd-stat-block-aggregate.ts";
import {
  buildStatBlockCatalog,
  decodeSrdStatBlockCollection,
} from "./stat-block-catalog.ts";

export * from "./stat-block-catalog.ts";

const decodedCollection = decodeSrdStatBlockCollection(
  srdStatBlockAggregateInputs,
);

export const srdStatBlockCollection = Match.value(decodedCollection).pipe(
  Match.when({ tag: "decoded" }, ({ collection }) => collection),
  Match.when({ tag: "rejected" }, ({ issues }) => {
    throw new Error(
      `Generated SRD Stat Block aggregate is invalid: ${JSON.stringify(issues)}`,
    );
  }),
  Match.exhaustive,
);

const installedCatalog = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});

export const srdStatBlockCatalog = Match.value(installedCatalog).pipe(
  Match.when({ tag: "ok" }, ({ catalog }) => catalog),
  Match.when({ tag: "invalid" }, ({ issues }) => {
    throw new Error(
      `Generated SRD Stat Block catalog is invalid: ${JSON.stringify(issues)}`,
    );
  }),
  Match.exhaustive,
);
