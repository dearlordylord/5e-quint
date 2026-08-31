import { Match } from "effect";

import type { SrdStatBlockSourceOccurrence } from "./stat-block-parity-observation.ts";
import {
  projectAuthoredStatBlock,
  projectRawStatBlock,
  type StatBlockScopedFidelityProjection,
  type StatBlockScopedProjectionResult,
} from "./stat-block-raw-projection.ts";
import type { SrdStatBlockRecord } from "./types.ts";

type IdentifiedStatBlockScopedFidelityProjection =
  StatBlockScopedFidelityProjection & {
    readonly id: string;
    readonly name: string;
    readonly sourceSection: string;
  };

const statBlockIdFromRawName = (name: string): string =>
  `stat_block_${name
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")}`;

function requireProjected(
  result: StatBlockScopedProjectionResult,
): StatBlockScopedFidelityProjection {
  return Match.value(result).pipe(
    Match.when({ tag: "projected" }, ({ projection }) => projection),
    Match.when({ tag: "failed" }, ({ failure }) =>
      Match.value(failure).pipe(
        Match.when({ tag: "projection-error" }, ({ errorName, message }) => {
          throw new Error(`${errorName}: ${message}`);
        }),
        Match.when(
          { tag: "source-path-mismatch" },
          ({ suppliedSourcePath, occurrenceSourcePath }) => {
            throw new Error(
              `Source path mismatch: ${suppliedSourcePath} does not contain ${occurrenceSourcePath}`,
            );
          },
        ),
        Match.exhaustive,
      ),
    ),
    Match.exhaustive,
  );
}

export function projectRawStatBlocks(
  source: string,
  occurrences: readonly SrdStatBlockSourceOccurrence[],
  equipmentSource: string,
): readonly IdentifiedStatBlockScopedFidelityProjection[] {
  return occurrences.map((occurrence) => ({
    id: statBlockIdFromRawName(occurrence.name),
    name: occurrence.name,
    sourceSection: occurrence.anchor.section.replace(
      ".references/srd-5.2.1/",
      "",
    ),
    ...requireProjected(
      projectRawStatBlock(
        { sourcePath: occurrence.anchor.sourcePath, contents: source },
        occurrence,
        equipmentSource,
      ),
    ),
  }));
}

export function projectAuthoredStatBlocks(
  records: readonly SrdStatBlockRecord[],
  equipmentSource: string,
): readonly IdentifiedStatBlockScopedFidelityProjection[] {
  return records.map((record) => ({
    id: record.id,
    name: record.name,
    sourceSection: record.provenance.section,
    ...requireProjected(projectAuthoredStatBlock(record, equipmentSource)),
  }));
}

export type { StatBlockScopedFidelityProjection };
