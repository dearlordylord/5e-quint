import { Match } from "effect";

import { srdStatBlockAggregateInputs } from "./generated/srd-stat-block-aggregate.ts";
import {
  buildSrdStatBlockCatalogFromRecords,
  decodeStatBlockRecords,
  evaluateSrdStatBlockProvenance,
} from "./stat-block-catalog.ts";

const decodedRecords = decodeStatBlockRecords(srdStatBlockAggregateInputs);

const decodedStatBlockRecords = Match.value(decodedRecords).pipe(
  Match.when({ tag: "decoded" }, ({ decodedRecords }) => decodedRecords),
  Match.when({ tag: "rejected" }, ({ issues }) => {
    throw new Error(
      `Generated SRD Stat Block aggregate is invalid: ${JSON.stringify(issues)}`,
    );
  }),
  Match.exhaustive,
);

const provenance = evaluateSrdStatBlockProvenance(decodedStatBlockRecords);
const homogeneousSrdRecords = Match.value(provenance).pipe(
  Match.when({ tag: "homogeneous" }, ({ records }) => records),
  Match.when({ tag: "mixed" }, ({ issues }) => {
    throw new Error(
      `Generated SRD Stat Block aggregate has mixed provenance: ${JSON.stringify(issues)}`,
    );
  }),
  Match.exhaustive,
);

const installedCatalog = buildSrdStatBlockCatalogFromRecords(
  homogeneousSrdRecords,
);

const installed = Match.value(installedCatalog).pipe(
  Match.when({ tag: "ok" }, (result) => result),
  Match.when({ tag: "invalid" }, ({ issues }) => {
    throw new Error(
      `Generated SRD Stat Block catalog is invalid: ${JSON.stringify(issues)}`,
    );
  }),
  Match.exhaustive,
);

export const srdStatBlockCollection = installed.collection;
export const srdStatBlockCatalog = installed.catalog;
