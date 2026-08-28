import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";

import { Either, Option, Schema } from "effect";

import {
  PublishedSrdSurfaceSchema,
  type PublishedSrdSurface,
} from "../packages/surface/src/surface/schema.ts";
import type {
  Srd521StatBlock,
  StatBlockId,
} from "../packages/surface/src/surface/stat-block-catalog.ts";

type PublishedSrdStatBlock = PublishedSrdSurface["statBlocks"][number];

export type SrdStatBlockCatalogReachabilityIssue =
  | {
      readonly kind: "duplicate-installed-entry";
      readonly statBlockId: StatBlockId;
      readonly occurrences: number;
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
      readonly occurrences: number;
    }
  | {
      readonly kind: "list-entry-mismatch";
      readonly statBlockId: StatBlockId;
      readonly listEntryOrdinal: number;
    }
  | {
      readonly kind: "unselectable";
      readonly statBlockId: StatBlockId;
    }
  | {
      readonly kind: "selection-mismatch";
      readonly statBlockId: StatBlockId;
    }
  | {
      readonly kind: "missing-presentation";
      readonly statBlockId: StatBlockId;
    }
  | {
      readonly kind: "unexpected-presentation";
      readonly statBlockId: StatBlockId;
    }
  | {
      readonly kind: "duplicate-presentation";
      readonly statBlockId: StatBlockId;
      readonly occurrences: number;
    }
  | {
      readonly kind: "presentation-mismatch";
      readonly statBlockId: StatBlockId;
    }
  | {
      readonly kind: "presentation-artifact-unreadable";
      readonly file: string;
      readonly message: string;
    }
  | {
      readonly kind: "presentation-artifact-malformed";
      readonly file: string;
      readonly message: string;
    };

export type SrdStatBlockCatalogReachabilityReport = {
  readonly installedCount: number;
  readonly listedCount: number;
  readonly presentationCount: number;
  readonly issues: readonly SrdStatBlockCatalogReachabilityIssue[];
};

type SrdStatBlockPresentationRows =
  | {
      readonly tag: "available";
      readonly statBlocks: readonly PublishedSrdStatBlock[];
    }
  | {
      readonly tag: "unavailable";
      readonly issue: Extract<
        SrdStatBlockCatalogReachabilityIssue,
        {
          readonly kind:
            | "presentation-artifact-unreadable"
            | "presentation-artifact-malformed";
        }
      >;
    };

export type SrdStatBlockCatalogReachabilityInput = {
  readonly installedStatBlocks: readonly Srd521StatBlock[];
  readonly catalog: {
    readonly getStatBlock: (id: StatBlockId) => Option.Option<Srd521StatBlock>;
    readonly listStatBlocks: () => readonly Srd521StatBlock[];
  };
  readonly presentations: SrdStatBlockPresentationRows;
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

function canonicalPublishedStatBlock(
  presentation: PublishedSrdStatBlock,
): Srd521StatBlock {
  const { rulesExcerpt: _rulesExcerpt, ...statBlock } = presentation;
  return statBlock;
}

export function evaluateSrdStatBlockCatalogReachability(
  input: SrdStatBlockCatalogReachabilityInput,
): SrdStatBlockCatalogReachabilityReport {
  const listed = input.catalog.listStatBlocks();
  const installedById = indexByStatBlockId(input.installedStatBlocks);
  const listedById = indexByStatBlockId(listed);
  const presentationRows =
    input.presentations.tag === "available"
      ? input.presentations.statBlocks
      : [];
  const presentationsById = indexByStatBlockId(presentationRows);
  const issues: SrdStatBlockCatalogReachabilityIssue[] = [];

  for (const [statBlockId, occurrences] of installedById) {
    if (occurrences.length > 1) {
      issues.push({
        kind: "duplicate-installed-entry",
        statBlockId,
        occurrences: occurrences.length,
      });
    }
  }

  for (const [statBlockId, occurrences] of listedById) {
    if (!installedById.has(statBlockId)) {
      issues.push({ kind: "unexpected-list-entry", statBlockId });
    }
    if (occurrences.length > 1) {
      issues.push({
        kind: "duplicate-list-entry",
        statBlockId,
        occurrences: occurrences.length,
      });
    }
  }

  if (input.presentations.tag === "unavailable") {
    issues.push(input.presentations.issue);
  } else {
    for (const [statBlockId, occurrences] of presentationsById) {
      if (!installedById.has(statBlockId)) {
        issues.push({ kind: "unexpected-presentation", statBlockId });
      }
      if (occurrences.length > 1) {
        issues.push({
          kind: "duplicate-presentation",
          statBlockId,
          occurrences: occurrences.length,
        });
      }
    }
  }

  for (const installedOccurrences of installedById.values()) {
    const installed = installedOccurrences[0];
    const listedOccurrences = listedById.get(installed.id) ?? [];
    if (listedOccurrences.length === 0) {
      issues.push({ kind: "missing-list-entry", statBlockId: installed.id });
    }
    for (const [listEntryIndex, listedEntry] of listedOccurrences.entries()) {
      if (!isDeepStrictEqual(listedEntry, installed)) {
        issues.push({
          kind: "list-entry-mismatch",
          statBlockId: installed.id,
          listEntryOrdinal: listEntryIndex + 1,
        });
      }
    }

    const selected = input.catalog.getStatBlock(installed.id);
    if (Option.isNone(selected)) {
      issues.push({ kind: "unselectable", statBlockId: installed.id });
    } else if (!isDeepStrictEqual(selected.value, installed)) {
      issues.push({
        kind: "selection-mismatch",
        statBlockId: installed.id,
      });
    }

    if (input.presentations.tag === "available") {
      const presentationOccurrences = presentationsById.get(installed.id) ?? [];
      const presentation = presentationOccurrences[0];
      if (presentation === undefined) {
        issues.push({
          kind: "missing-presentation",
          statBlockId: installed.id,
        });
      } else if (
        !isDeepStrictEqual(canonicalPublishedStatBlock(presentation), installed)
      ) {
        issues.push({
          kind: "presentation-mismatch",
          statBlockId: installed.id,
        });
      }
    }
  }

  return {
    installedCount: input.installedStatBlocks.length,
    listedCount: listed.length,
    presentationCount: presentationRows.length,
    issues,
  };
}

export function readSrdStatBlockPresentations(
  publicationFile: string,
): SrdStatBlockPresentationRows {
  let bytes: string;
  try {
    bytes = readFileSync(publicationFile, "utf8");
  } catch (error) {
    return {
      tag: "unavailable",
      issue: {
        kind: "presentation-artifact-unreadable",
        file: publicationFile,
        message: String(error),
      },
    };
  }

  let document: unknown;
  try {
    document = JSON.parse(bytes);
  } catch (error) {
    return {
      tag: "unavailable",
      issue: {
        kind: "presentation-artifact-malformed",
        file: publicationFile,
        message: String(error),
      },
    };
  }

  const decoded = Schema.decodeUnknownEither(PublishedSrdSurfaceSchema, {
    onExcessProperty: "error",
  })(document);
  if (Either.isLeft(decoded)) {
    return {
      tag: "unavailable",
      issue: {
        kind: "presentation-artifact-malformed",
        file: publicationFile,
        message: String(decoded.left),
      },
    };
  }
  return { tag: "available", statBlocks: decoded.right.statBlocks };
}
