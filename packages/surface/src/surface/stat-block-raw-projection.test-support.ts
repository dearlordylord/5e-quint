import { Match } from "effect";

import type { SrdStatBlockSourceOccurrence } from "./stat-block-parity-observation.ts";
import {
  projectAuthoredStatBlock,
  projectRawStatBlock,
  type StatBlockScopedFidelityProjection,
  type StatBlockScopedProjectionResult,
} from "./stat-block-raw-projection.ts";
import type { SrdStatBlockRecord } from "./types.ts";

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
): readonly StatBlockScopedFidelityProjection[] {
  return occurrences.map((occurrence) =>
    requireProjected(
      projectRawStatBlock(
        { sourcePath: occurrence.anchor.sourcePath, contents: source },
        occurrence,
        equipmentSource,
      ),
    ),
  );
}

export function projectAuthoredStatBlocks(
  records: readonly SrdStatBlockRecord[],
  equipmentSource: string,
): readonly StatBlockScopedFidelityProjection[] {
  return records.map((record) =>
    requireProjected(projectAuthoredStatBlock(record, equipmentSource)),
  );
}

export type { StatBlockScopedFidelityProjection };
