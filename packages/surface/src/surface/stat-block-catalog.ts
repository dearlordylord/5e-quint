import { Option } from "effect";

// Content JSON is generated from the matching content/*.dhall source.
// Keep authoring changes in Dhall, then regenerate JSON and trace output.
import goblinWarriorInput from "../../content/stat_block_goblin_warrior.json";
import { decodeStatBlockRecordSync } from "./schema.ts";
import type { Provenance, StatBlockRecord } from "./types.ts";

/**
 * Authored monster Stat Block lookup/provenance boundary.
 *
 * Keep this distinction local to the Stat Block code path: Stat Blocks are
 * authored Surface records, but they are not UnitRecords. Runtime packages can
 * consume generic StatBlockRecords and may later reuse shared Surface sub-shapes
 * from a Stat Block's actions, but the monster record itself stays in this
 * record family rather than becoming a Unit.
 */

export type SurfaceCollectionProvenance = {
  readonly kind: "srd-5.2.1";
};

export type StatBlockId = StatBlockRecord["id"];

export type Srd521Provenance = Provenance & {
  readonly kind: "srd-5.2.1";
};

export type Srd521StatBlock = StatBlockRecord & {
  readonly provenance: Srd521Provenance;
};

export type SrdStatBlockCollection = {
  readonly kind: "srdStatBlockCollection";
  readonly provenance: SurfaceCollectionProvenance;
  readonly statBlocks: readonly Srd521StatBlock[];
};

export type StatBlockCatalog = {
  readonly getStatBlock: (id: StatBlockId) => Option.Option<StatBlockRecord>;
  readonly listStatBlocks: () => readonly StatBlockRecord[];
  readonly requireStatBlock: (id: StatBlockId) => StatBlockRecord;
};

export type StatBlockCatalogBuildIssue =
  | {
      readonly code: "duplicateStatBlockId";
      readonly statBlockId: StatBlockId;
    }
  | {
      readonly code: "mixedProvenance";
      readonly collectionKind: SrdStatBlockCollection["kind"];
      readonly expected: SurfaceCollectionProvenance;
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
  if (!isSrd521StatBlock(statBlock)) {
    throw new Error(`Stat Block is not SRD 5.2.1: ${statBlock.id}`);
  }

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

  if (provenanceIssues.length > 0) {
    throw new Error("SRD Stat Block collection contains non-SRD provenance");
  }

  return collection;
}

export const srdStatBlockCollection = defineSrdStatBlockCollection({
  statBlocks: [
    assertSrd521StatBlock(decodeStatBlockRecordSync(goblinWarriorInput)),
  ],
});

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
      getStatBlock: (id) => Option.fromNullable(records.get(id)),
      listStatBlocks: () => Array.from(records.values()),
      requireStatBlock: (id) => {
        const record = records.get(id);
        if (record === undefined) {
          throw new Error(`Unknown Stat Block id: ${id}`);
        }
        return record;
      },
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
