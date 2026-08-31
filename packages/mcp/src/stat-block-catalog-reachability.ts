import { NonNegativeInteger, PositiveInteger } from "@dnd/shared/types";
import type {
  Srd521StatBlock,
  StatBlockId,
} from "@dnd/surface/surface/stat-block-catalog";
import { normalizeStatBlockIdentity } from "@dnd/surface/surface/stat-block-identity";
import { SRD_STAT_BLOCK_SOURCE_IDENTITY_CARDINALITY } from "@dnd/surface/surface/stat-block-parity-observation";
import { Match, Option } from "effect";
import { isDeepStrictEqual } from "node:util";

import { statBlockSummary } from "./stat-block-content-projection.ts";

const EXPECTED_INSTALLED_SRD_STAT_BLOCK_COUNT = PositiveInteger(
  SRD_STAT_BLOCK_SOURCE_IDENTITY_CARDINALITY,
);

type StatBlockSummary = ReturnType<typeof statBlockSummary>;
type NormalizedStatBlockIdentity = ReturnType<
  typeof normalizeStatBlockIdentity
>;

export type StatBlockSummaryPresentationIssue = {
  readonly kind: "stat-block-summary-projection-failed";
  readonly message: string;
};

export type StatBlockSummaryPresentationResult =
  | {
      readonly tag: "presented";
      readonly summary: StatBlockSummary;
    }
  | {
      readonly tag: "failed";
      readonly issues: readonly [
        StatBlockSummaryPresentationIssue,
        ...StatBlockSummaryPresentationIssue[],
      ];
    };

export type SrdStatBlockCatalogReachabilityIssue =
  | {
      readonly kind: "installed-cardinality-mismatch";
      readonly expected: PositiveInteger;
      readonly actualInstalledCount: NonNegativeInteger;
      readonly actualUniqueStatBlockIdCount: NonNegativeInteger;
      readonly actualUniqueAuthoredIdentityCount: NonNegativeInteger;
    }
  | {
      readonly kind: "duplicate-installed-stat-block-id";
      readonly statBlockId: StatBlockId;
      readonly occurrences: PositiveInteger;
    }
  | {
      readonly kind: "duplicate-installed-authored-identity";
      readonly normalizedIdentity: NormalizedStatBlockIdentity;
      readonly statBlockId: StatBlockId;
      readonly priorStatBlockId: StatBlockId;
    }
  | {
      readonly kind: "missing-list-entry";
      readonly statBlockId: StatBlockId;
    }
  | {
      readonly kind: "unexpected-list-entry";
      readonly statBlockId: StatBlockId;
    }
  | {
      readonly kind: "duplicate-list-entry";
      readonly statBlockId: StatBlockId;
      readonly occurrences: PositiveInteger;
    }
  | {
      readonly kind: "duplicate-list-authored-identity";
      readonly normalizedIdentity: NormalizedStatBlockIdentity;
      readonly statBlockId: StatBlockId;
      readonly priorStatBlockId: StatBlockId;
    }
  | {
      readonly kind: "listed-record-mismatch";
      readonly statBlockId: StatBlockId;
      readonly listEntryOrdinal: PositiveInteger;
    }
  | {
      readonly kind: "unselectable-list-entry";
      readonly statBlockId: StatBlockId;
    }
  | {
      readonly kind: "selected-record-mismatch";
      readonly statBlockId: StatBlockId;
    }
  | {
      readonly kind: "presentation-failed";
      readonly statBlockId: StatBlockId;
      readonly issues: readonly [
        StatBlockSummaryPresentationIssue,
        ...StatBlockSummaryPresentationIssue[],
      ];
    }
  | {
      readonly kind: "presentation-identity-mismatch";
      readonly requestedStatBlockId: StatBlockId;
      readonly selectedStatBlockId: StatBlockId;
      readonly presentedStatBlockId: StatBlockId;
    };

export type SrdStatBlockCatalogReachabilityResult =
  | {
      readonly tag: "reachable";
      readonly statBlockIds: readonly [StatBlockId, ...StatBlockId[]];
    }
  | {
      readonly tag: "unreachable";
      readonly issues: readonly [
        SrdStatBlockCatalogReachabilityIssue,
        ...SrdStatBlockCatalogReachabilityIssue[],
      ];
    };

export type SrdStatBlockCatalogReachabilityInput = {
  readonly installedStatBlocks: readonly Srd521StatBlock[];
  readonly catalog: {
    readonly getStatBlock: (id: StatBlockId) => Option.Option<Srd521StatBlock>;
    readonly listStatBlocks: () => readonly Srd521StatBlock[];
  };
  readonly present: (
    statBlock: Srd521StatBlock,
  ) => StatBlockSummaryPresentationResult;
};

function indexByStatBlockId<T extends { readonly id: StatBlockId }>(
  values: readonly T[],
): ReadonlyMap<StatBlockId, readonly [T, ...T[]]> {
  const index = new Map<StatBlockId, [T, ...T[]]>();
  for (const value of values) {
    const occurrences = index.get(value.id);
    if (occurrences === undefined) {
      index.set(value.id, [value]);
    } else {
      occurrences.push(value);
    }
  }
  return index;
}

function indexAuthoredIdentities(
  statBlocks: readonly Srd521StatBlock[],
): ReadonlyMap<NormalizedStatBlockIdentity, StatBlockId> {
  const identities = new Map<NormalizedStatBlockIdentity, StatBlockId>();
  for (const statBlock of statBlocks) {
    const identity = normalizeStatBlockIdentity(statBlock.name);
    if (!identities.has(identity)) identities.set(identity, statBlock.id);
  }
  return identities;
}

function collectAuthoredIdentityIssues(
  scope: "installed" | "list",
  statBlocks: readonly Srd521StatBlock[],
): readonly SrdStatBlockCatalogReachabilityIssue[] {
  const identityOwners = new Map<NormalizedStatBlockIdentity, StatBlockId>();
  const issues: SrdStatBlockCatalogReachabilityIssue[] = [];
  for (const statBlock of statBlocks) {
    const normalizedIdentity = normalizeStatBlockIdentity(statBlock.name);
    const priorStatBlockId = identityOwners.get(normalizedIdentity);
    if (priorStatBlockId === undefined) {
      identityOwners.set(normalizedIdentity, statBlock.id);
    } else if (priorStatBlockId !== statBlock.id) {
      issues.push(
        Match.value(scope).pipe(
          Match.when(
            "installed",
            () =>
              ({
                kind: "duplicate-installed-authored-identity",
                normalizedIdentity,
                statBlockId: statBlock.id,
                priorStatBlockId,
              }) as const,
          ),
          Match.when(
            "list",
            () =>
              ({
                kind: "duplicate-list-authored-identity",
                normalizedIdentity,
                statBlockId: statBlock.id,
                priorStatBlockId,
              }) as const,
          ),
          Match.exhaustive,
        ),
      );
    }
  }
  return issues;
}

function isSameCanonicalStatBlock(
  candidate: Srd521StatBlock,
  canonical: Srd521StatBlock,
): boolean {
  return isDeepStrictEqual(candidate, canonical);
}

export function presentStatBlockSummary(
  statBlock: Srd521StatBlock,
): Extract<StatBlockSummaryPresentationResult, { readonly tag: "presented" }> {
  return { tag: "presented", summary: statBlockSummary(statBlock) };
}

function presentationIssues(
  requestedStatBlockId: StatBlockId,
  selected: Srd521StatBlock,
  result: StatBlockSummaryPresentationResult,
): readonly SrdStatBlockCatalogReachabilityIssue[] {
  return Match.value(result).pipe(
    Match.when({ tag: "failed" }, ({ issues }) => [
      {
        kind: "presentation-failed" as const,
        statBlockId: requestedStatBlockId,
        issues,
      },
    ]),
    Match.when({ tag: "presented" }, ({ summary }) =>
      requestedStatBlockId === selected.id &&
      summary.statBlockId === selected.id
        ? []
        : [
            {
              kind: "presentation-identity-mismatch" as const,
              requestedStatBlockId,
              selectedStatBlockId: selected.id,
              presentedStatBlockId: summary.statBlockId,
            },
          ],
    ),
    Match.exhaustive,
  );
}

function listedIdentitySelectionIssues(
  input: SrdStatBlockCatalogReachabilityInput,
  statBlockId: StatBlockId,
  installed: Srd521StatBlock | undefined,
): readonly SrdStatBlockCatalogReachabilityIssue[] {
  return Option.match(input.catalog.getStatBlock(statBlockId), {
    onNone: () => [{ kind: "unselectable-list-entry", statBlockId }],
    onSome: (selected) =>
      installed !== undefined && !isSameCanonicalStatBlock(selected, installed)
        ? [{ kind: "selected-record-mismatch", statBlockId }]
        : presentationIssues(statBlockId, selected, input.present(selected)),
  });
}

export function evaluateSrdStatBlockCatalogReachability(
  input: SrdStatBlockCatalogReachabilityInput,
): SrdStatBlockCatalogReachabilityResult {
  const listedStatBlocks = input.catalog.listStatBlocks();
  const installedById = indexByStatBlockId(input.installedStatBlocks);
  const listedById = indexByStatBlockId(listedStatBlocks);
  const installedAuthoredIdentities = indexAuthoredIdentities(
    input.installedStatBlocks,
  );
  const issues: SrdStatBlockCatalogReachabilityIssue[] = [];

  if (
    input.installedStatBlocks.length !==
      EXPECTED_INSTALLED_SRD_STAT_BLOCK_COUNT ||
    installedById.size !== EXPECTED_INSTALLED_SRD_STAT_BLOCK_COUNT ||
    installedAuthoredIdentities.size !== EXPECTED_INSTALLED_SRD_STAT_BLOCK_COUNT
  ) {
    issues.push({
      kind: "installed-cardinality-mismatch",
      expected: EXPECTED_INSTALLED_SRD_STAT_BLOCK_COUNT,
      actualInstalledCount: NonNegativeInteger(
        input.installedStatBlocks.length,
      ),
      actualUniqueStatBlockIdCount: NonNegativeInteger(installedById.size),
      actualUniqueAuthoredIdentityCount: NonNegativeInteger(
        installedAuthoredIdentities.size,
      ),
    });
  }
  for (const [statBlockId, occurrences] of installedById) {
    if (occurrences.length > 1) {
      issues.push({
        kind: "duplicate-installed-stat-block-id",
        statBlockId,
        occurrences: PositiveInteger(occurrences.length),
      });
    }
    if (!listedById.has(statBlockId)) {
      issues.push({ kind: "missing-list-entry", statBlockId });
    }
  }
  issues.push(
    ...collectAuthoredIdentityIssues("installed", input.installedStatBlocks),
  );

  for (const [statBlockId, listedOccurrences] of listedById) {
    const installed = installedById.get(statBlockId)?.[0];
    if (installed === undefined) {
      issues.push({ kind: "unexpected-list-entry", statBlockId });
    }
    if (listedOccurrences.length > 1) {
      issues.push({
        kind: "duplicate-list-entry",
        statBlockId,
        occurrences: PositiveInteger(listedOccurrences.length),
      });
    }
    if (installed !== undefined) {
      for (const [listEntryIndex, listed] of listedOccurrences.entries()) {
        if (!isSameCanonicalStatBlock(listed, installed)) {
          issues.push({
            kind: "listed-record-mismatch",
            statBlockId,
            listEntryOrdinal: PositiveInteger(listEntryIndex + 1),
          });
        }
      }
    }

    issues.push(
      ...listedIdentitySelectionIssues(input, statBlockId, installed),
    );
  }
  issues.push(...collectAuthoredIdentityIssues("list", listedStatBlocks));

  const firstIssue = issues[0];
  if (firstIssue !== undefined) {
    return {
      tag: "unreachable",
      issues: [firstIssue, ...issues.slice(1)],
    };
  }

  const [firstStatBlockId, ...remainingStatBlockIds] = listedById.keys();
  /* v8 ignore start -- @preserve -- exact installed cardinality plus empty missing-list issues prove that the listed identity set is non-empty */
  if (firstStatBlockId === undefined) {
    throw new Error("Reachable SRD Stat Block catalog has no listed identity");
  }
  /* v8 ignore stop -- @preserve */
  return {
    tag: "reachable",
    statBlockIds: [firstStatBlockId, ...remainingStatBlockIds],
  };
}
