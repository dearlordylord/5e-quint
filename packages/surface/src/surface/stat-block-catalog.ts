import { Brand, Option } from "effect";

import { normalizeStatBlockIdentity } from "./stat-block-identity.ts";

// Canonical authored state remains in content/*.dhall and its strict JSON
// peers; this generated module stores only their deterministic import order.
import { srdStatBlockAggregateInputs } from "./generated/srd-stat-block-aggregate.ts";
import { decodeStatBlockRecordSync } from "./schema.ts";
import type {
  Provenance,
  SrdProvenance,
  SrdStatBlockRecord,
  StatBlockRecord,
} from "./types.ts";

/**
 * Authored monster Stat Block lookup/provenance boundary.
 *
 * Keep this distinction local to the Stat Block code path: Stat Blocks are
 * authored Surface records, but they are not UnitRecords. Runtime packages can
 * consume generic StatBlockRecords and may later reuse shared Surface sub-shapes
 * from a Stat Block's actions, but the monster record itself stays in this
 * record family rather than becoming a Unit.
 */

export type Srd521CollectionProvenance = Pick<SrdProvenance, "kind">;

export type StatBlockId = StatBlockRecord["id"];

export type Srd521Provenance = SrdProvenance;

export type Srd521StatBlock = SrdStatBlockRecord;

export type SrdStatBlockCollection = {
  readonly kind: "srdStatBlockCollection";
  readonly provenance: Srd521CollectionProvenance;
  readonly statBlocks: readonly Srd521StatBlock[];
};

export type StatBlockCatalog = {
  readonly getStatBlock: (id: StatBlockId) => Option.Option<StatBlockRecord>;
  readonly listStatBlocks: () => readonly StatBlockRecord[];
};

export type SrdStatBlockCatalog = {
  readonly getStatBlock: (id: StatBlockId) => Option.Option<Srd521StatBlock>;
  readonly listStatBlocks: () => readonly Srd521StatBlock[];
} & Brand.Brand<"SrdStatBlockCatalog">;

const toSrdStatBlockCatalog = Brand.nominal<SrdStatBlockCatalog>();

export type StatBlockCatalogBuildIssue =
  | {
      readonly code: "duplicateStatBlockId";
      readonly statBlockId: StatBlockId;
    }
  | {
      readonly code: "duplicateStatBlockIdentity";
      readonly normalizedIdentity: string;
      readonly statBlockId: StatBlockId;
      readonly priorStatBlockId: StatBlockId;
    }
  | {
      readonly code: "mixedProvenance";
      readonly collectionKind: SrdStatBlockCollection["kind"];
      readonly expected: Srd521CollectionProvenance;
      readonly actual: Provenance;
      readonly statBlockId: StatBlockId;
    };

export type StatBlockCatalogBuildResult =
  | { readonly tag: "ok"; readonly catalog: SrdStatBlockCatalog }
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
  const collectionIssues = collectStatBlockCatalogIssues([collection]).issues;

  /* v8 ignore start -- @preserve -- Srd521StatBlock input typing makes malformed collection construction an internal composition failure */
  if (collectionIssues.length > 0) {
    throw new Error(
      `Invalid SRD Stat Block collection: ${JSON.stringify(collectionIssues)}`,
    );
  }
  /* v8 ignore stop -- @preserve */

  return collection;
}

const installedSrdStatBlocks: readonly Srd521StatBlock[] =
  srdStatBlockAggregateInputs.map((input) =>
    assertSrd521StatBlock(decodeStatBlockRecordSync(input)),
  );

export const srdStatBlockCollection = defineSrdStatBlockCollection({
  statBlocks: installedSrdStatBlocks,
});

export function buildStatBlockCatalog(input: {
  readonly collections: readonly SrdStatBlockCollection[];
}): StatBlockCatalogBuildResult {
  const { issues, records } = collectStatBlockCatalogIssues(input.collections);

  if (issues.length > 0) {
    return { tag: "invalid", issues };
  }

  return {
    tag: "ok",
    catalog: toSrdStatBlockCatalog({
      getStatBlock: (id) => Option.fromNullable(records.get(id)),
      listStatBlocks: () => Array.from(records.values()),
    }),
  };
}

function collectStatBlockCatalogIssues(
  collections: readonly SrdStatBlockCollection[],
): {
  readonly issues: readonly StatBlockCatalogBuildIssue[];
  readonly records: ReadonlyMap<StatBlockId, Srd521StatBlock>;
} {
  const issues: StatBlockCatalogBuildIssue[] = [];
  const records = new Map<StatBlockId, Srd521StatBlock>();
  const identityOwners = new Map<string, StatBlockId>();

  for (const collection of collections) {
    for (const statBlock of collection.statBlocks) {
      if (!isSrd521Provenance(statBlock.provenance)) {
        issues.push({
          code: "mixedProvenance",
          collectionKind: collection.kind,
          expected: collection.provenance,
          actual: statBlock.provenance,
          statBlockId: statBlock.id,
        });
      }

      if (records.has(statBlock.id)) {
        issues.push({
          code: "duplicateStatBlockId",
          statBlockId: statBlock.id,
        });
      } else {
        records.set(statBlock.id, statBlock);
      }

      const normalizedIdentity = normalizeStatBlockIdentity(statBlock.name);
      const priorStatBlockId = identityOwners.get(normalizedIdentity);
      if (priorStatBlockId !== undefined && priorStatBlockId !== statBlock.id) {
        issues.push({
          code: "duplicateStatBlockIdentity",
          normalizedIdentity,
          statBlockId: statBlock.id,
          priorStatBlockId,
        });
      } else if (priorStatBlockId === undefined) {
        identityOwners.set(normalizedIdentity, statBlock.id);
      }
    }
  }

  return { issues, records };
}
