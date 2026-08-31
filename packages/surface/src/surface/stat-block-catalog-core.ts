import {
  PositiveInteger,
  type PositiveInteger as PositiveIntegerType,
} from "@dnd/shared/types";
import { Brand, Match, Option, Result } from "effect";

import {
  normalizeStatBlockIdentity,
  type NormalizedStatBlockIdentity,
} from "./stat-block-identity.ts";

import {
  decodeStatBlockRecordResult,
  formatSurfaceDecodeError,
} from "./schema.ts";
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

export type Srd521Provenance = SrdProvenance;

export type Srd521StatBlock = SrdStatBlockRecord;

export type SrdStatBlockCollection = {
  readonly kind: "srdStatBlockCollection";
  readonly provenance: Srd521CollectionProvenance;
  readonly statBlocks: readonly Srd521StatBlock[];
};

export type SrdStatBlockCatalog = {
  readonly getStatBlock: (id: StatBlockId) => Option.Option<Srd521StatBlock>;
  readonly listStatBlocks: () => readonly Srd521StatBlock[];
} & StatBlockCatalog &
  Brand.Brand<"SrdStatBlockCatalog">;

const toSrdStatBlockCatalog = Brand.nominal<SrdStatBlockCatalog>();

export type StatBlockCatalogBuildIssue =
  | {
      readonly code: "duplicateStatBlockId";
      readonly statBlockId: StatBlockId;
    }
  | {
      readonly code: "duplicateStatBlockIdentity";
      readonly normalizedIdentity: NormalizedStatBlockIdentity;
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

type EmptySrdStatBlockCollectionIssue = {
  readonly code: "emptyStatBlockCollection";
};

export type SrdStatBlockCatalogBuildIssue =
  | EmptySrdStatBlockCollectionIssue
  | Exclude<StatBlockCatalogBuildIssue, { readonly code: "mixedProvenance" }>;

export type StatBlockCatalogBuildResult =
  | { readonly tag: "ok"; readonly catalog: SrdStatBlockCatalog }
  | {
      readonly tag: "invalid";
      readonly issues: readonly [
        StatBlockCatalogBuildIssue,
        ...StatBlockCatalogBuildIssue[],
      ];
    };

type StatBlockRecordDecodeIssue = {
  readonly code: "statBlockDecodeFailed";
  readonly inputOrdinal: PositiveIntegerType;
  readonly message: string;
};

export type StatBlockRecordsDecodeResult =
  | {
      readonly tag: "decoded";
      readonly decodedRecords: readonly [
        DecodedStatBlockRecord,
        ...DecodedStatBlockRecord[],
      ];
    }
  | {
      readonly tag: "rejected";
      readonly issues: readonly [
        StatBlockRecordDecodeIssue,
        ...StatBlockRecordDecodeIssue[],
      ];
      readonly decodedRecords: readonly DecodedStatBlockRecord[];
    };

type DecodedStatBlockRecord = {
  readonly inputOrdinal: PositiveIntegerType;
  readonly record: StatBlockRecord;
};

type SrdStatBlockProvenanceIssue = {
  readonly code: "nonSrdStatBlockProvenance";
  readonly inputOrdinal: PositiveIntegerType;
  readonly statBlockId: StatBlockId;
  readonly actual: Provenance;
};

export type SrdStatBlockProvenanceResult =
  | {
      readonly tag: "homogeneous";
      readonly records: readonly Srd521StatBlock[];
    }
  | {
      readonly tag: "mixed";
      readonly issues: readonly [
        SrdStatBlockProvenanceIssue,
        ...SrdStatBlockProvenanceIssue[],
      ];
      readonly srdRecords: readonly Srd521StatBlock[];
    };

type SrdStatBlockCatalogFromRecordsResult =
  | {
      readonly tag: "ok";
      readonly collection: SrdStatBlockCollection;
      readonly catalog: SrdStatBlockCatalog;
    }
  | {
      readonly tag: "invalid";
      readonly issues: readonly [
        SrdStatBlockCatalogBuildIssue,
        ...SrdStatBlockCatalogBuildIssue[],
      ];
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

export function decodeStatBlockRecords(
  inputs: readonly [unknown, ...unknown[]],
): StatBlockRecordsDecodeResult {
  const issues: StatBlockRecordDecodeIssue[] = [];
  const decodedRecords: DecodedStatBlockRecord[] = [];

  for (const [inputIndex, input] of inputs.entries()) {
    const decoded = decodeStatBlockRecordResult(input);
    if (Result.isFailure(decoded)) {
      issues.push({
        code: "statBlockDecodeFailed",
        inputOrdinal: PositiveInteger(inputIndex + 1),
        message: formatSurfaceDecodeError(decoded.failure),
      });
    } else {
      decodedRecords.push({
        inputOrdinal: PositiveInteger(inputIndex + 1),
        record: decoded.success,
      });
    }
  }

  const firstIssue = issues[0];
  if (firstIssue !== undefined) {
    return {
      tag: "rejected",
      issues: [firstIssue, ...issues.slice(1)],
      decodedRecords,
    };
  }
  const firstDecodedRecord = decodedRecords[0];
  /* v8 ignore start -- @preserve -- non-empty aggregate input with no decode failures necessarily produced a decoded record */
  if (firstDecodedRecord === undefined) {
    throw new Error("Successful Stat Block decode has no decoded record");
  }
  /* v8 ignore stop -- @preserve */
  return {
    tag: "decoded",
    decodedRecords: [firstDecodedRecord, ...decodedRecords.slice(1)],
  };
}

export function evaluateSrdStatBlockProvenance(
  decodedRecords: readonly DecodedStatBlockRecord[],
): SrdStatBlockProvenanceResult {
  const issues: SrdStatBlockProvenanceIssue[] = [];
  const srdRecords: Srd521StatBlock[] = [];
  for (const { inputOrdinal, record } of decodedRecords) {
    if (!isSrd521StatBlock(record)) {
      issues.push({
        code: "nonSrdStatBlockProvenance",
        inputOrdinal,
        statBlockId: record.id,
        actual: record.provenance,
      });
    } else {
      srdRecords.push(record);
    }
  }

  const firstIssue = issues[0];
  return firstIssue === undefined
    ? { tag: "homogeneous", records: srdRecords }
    : {
        tag: "mixed",
        issues: [firstIssue, ...issues.slice(1)],
        srdRecords,
      };
}

export function buildSrdStatBlockCatalogFromRecords(
  records: readonly Srd521StatBlock[],
): SrdStatBlockCatalogFromRecordsResult {
  if (records.length === 0) {
    return {
      tag: "invalid",
      issues: [{ code: "emptyStatBlockCollection" }],
    };
  }
  const collection = {
    kind: "srdStatBlockCollection",
    provenance: { kind: "srd-5.2.1" },
    statBlocks: records,
  } as const satisfies SrdStatBlockCollection;
  return Match.value(buildStatBlockCatalog({ collections: [collection] })).pipe(
    Match.when({ tag: "ok" }, ({ catalog }) => ({
      tag: "ok" as const,
      collection,
      catalog,
    })),
    Match.when({ tag: "invalid" }, ({ issues }) => ({
      tag: "invalid" as const,
      issues: [
        narrowSrdStatBlockCatalogBuildIssue(issues[0]),
        ...issues.slice(1).map(narrowSrdStatBlockCatalogBuildIssue),
      ] as const,
    })),
    Match.exhaustive,
  );
}

function narrowSrdStatBlockCatalogBuildIssue(
  issue: StatBlockCatalogBuildIssue,
): SrdStatBlockCatalogBuildIssue {
  return Match.value(issue).pipe(
    Match.when({ code: "duplicateStatBlockId" }, (srdIssue) => srdIssue),
    Match.when({ code: "duplicateStatBlockIdentity" }, (srdIssue) => srdIssue),
    Match.when({ code: "mixedProvenance" }, () => {
      /* v8 ignore start -- @preserve -- Srd521StatBlock input makes mixed provenance impossible */
      throw new Error("Typed SRD Stat Block records produced mixed provenance");
      /* v8 ignore stop -- @preserve */
    }),
    Match.exhaustive,
  );
}

export function buildStatBlockCatalog(input: {
  readonly collections: readonly SrdStatBlockCollection[];
}): StatBlockCatalogBuildResult {
  const { issues, records } = collectStatBlockCatalogIssues(input.collections);

  const firstIssue = issues[0];
  if (firstIssue !== undefined) {
    return { tag: "invalid", issues: [firstIssue, ...issues.slice(1)] };
  }

  return {
    tag: "ok",
    catalog: toSrdStatBlockCatalog({
      getStatBlock: (id) => Option.fromNullishOr(records.get(id)),
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
  const identityOwners = new Map<NormalizedStatBlockIdentity, StatBlockId>();

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
