import { Option } from "effect";
import type {
  Provenance,
  SrdProvenance,
  SrdStatBlockRecord,
  StatBlockRecord,
} from "./types.ts";
import type {
  StatBlockCatalog,
  StatBlockId,
} from "./stat-block-catalog-contract.ts";

export type {
  StatBlockCatalog,
  StatBlockId,
} from "./stat-block-catalog-contract.ts";

export type Srd521CollectionProvenance = Pick<SrdProvenance, "kind">;

export type Srd521Provenance = SrdProvenance;

export type Srd521StatBlock = SrdStatBlockRecord;

export type SrdStatBlockCollection = {
  readonly kind: "srdStatBlockCollection";
  readonly provenance: Srd521CollectionProvenance;
  readonly statBlocks: readonly Srd521StatBlock[];
};

export type StatBlockCatalogBuildIssue =
  | {
      readonly code: "duplicateStatBlockId";
      readonly statBlockId: StatBlockId;
    }
  | {
      readonly code: "mixedProvenance";
      readonly collectionKind: SrdStatBlockCollection["kind"];
      readonly expected: Srd521CollectionProvenance;
      readonly actual: Provenance;
      readonly statBlockId: StatBlockId;
    };

export type StatBlockCatalogBuildResult =
  | { readonly tag: "ok"; readonly catalog: StatBlockCatalog }
  | {
      readonly tag: "invalid";
      readonly issues: readonly StatBlockCatalogBuildIssue[];
    };

export function isSrd521Provenance(
  value: Provenance,
): value is Srd521Provenance {
  return value.kind === "srd-5.2.1";
}

export function isSrd521StatBlock(
  statBlock: StatBlockRecord,
): statBlock is Srd521StatBlock {
  return isSrd521Provenance(statBlock.provenance);
}

export function assertSrd521StatBlock(
  statBlock: StatBlockRecord,
): Srd521StatBlock {
  /* v8 ignore start -- @preserve -- callers must establish SRD provenance before invoking this assertion; a non-SRD Stat Block violates that internal precondition */
  if (!isSrd521StatBlock(statBlock)) {
    throw new Error(`Stat Block is not SRD 5.2.1: ${statBlock.id}`);
  }
  /* v8 ignore stop -- @preserve */

  return statBlock;
}

export function defineSrdStatBlockCollection(input: {
  readonly statBlocks: readonly Srd521StatBlock[];
}): SrdStatBlockCollection {
  const collection = {
    kind: "srdStatBlockCollection",
    provenance: { kind: "srd-5.2.1" },
    statBlocks: input.statBlocks,
  } as const satisfies SrdStatBlockCollection;
  const provenanceIssues = validateSrdStatBlockCollection(collection);

  /* v8 ignore start -- @preserve -- Srd521StatBlock input typing makes mixed-provenance collection construction malformed internal composition */
  if (provenanceIssues.length > 0) {
    throw new Error("SRD Stat Block collection contains non-SRD provenance");
  }
  /* v8 ignore stop -- @preserve */

  return collection;
}

export function buildStatBlockCatalog(input: {
  readonly collections: readonly SrdStatBlockCollection[];
}): StatBlockCatalogBuildResult {
  const issues: StatBlockCatalogBuildIssue[] = [];
  const records = new Map<StatBlockId, StatBlockRecord>();

  for (const collection of input.collections) {
    issues.push(...validateSrdStatBlockCollection(collection));

    for (const statBlock of collection.statBlocks) {
      if (records.has(statBlock.id)) {
        issues.push({
          code: "duplicateStatBlockId",
          statBlockId: statBlock.id,
        });
      } else {
        records.set(statBlock.id, statBlock);
      }
    }
  }

  if (issues.length > 0) {
    return { tag: "invalid", issues };
  }

  return {
    tag: "ok",
    catalog: {
      getStatBlock: (id) => Option.fromNullishOr(records.get(id)),
      listStatBlocks: () => Array.from(records.values()),
    },
  };
}

function validateSrdStatBlockCollection(
  collection: SrdStatBlockCollection,
): readonly StatBlockCatalogBuildIssue[] {
  return collection.statBlocks.flatMap((statBlock) =>
    isSrd521Provenance(statBlock.provenance)
      ? []
      : [
          {
            code: "mixedProvenance",
            collectionKind: collection.kind,
            expected: collection.provenance,
            actual: statBlock.provenance,
            statBlockId: statBlock.id,
          } satisfies StatBlockCatalogBuildIssue,
        ],
  );
}
