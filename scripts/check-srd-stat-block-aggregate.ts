import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Match } from "effect";

import {
  buildSrdStatBlockAggregateBytes,
  SRD_STAT_BLOCK_AGGREGATE_RELATIVE_PATH,
} from "./srd-stat-block-aggregate.ts";

export type SrdStatBlockAggregateSyncIssue =
  | {
      readonly kind: "aggregate-generation-failed";
      readonly file: typeof SRD_STAT_BLOCK_AGGREGATE_RELATIVE_PATH;
      readonly message: string;
    }
  | {
      readonly kind: "aggregate-unreadable";
      readonly file: typeof SRD_STAT_BLOCK_AGGREGATE_RELATIVE_PATH;
      readonly message: string;
    }
  | {
      readonly kind: "aggregate-out-of-sync";
      readonly file: typeof SRD_STAT_BLOCK_AGGREGATE_RELATIVE_PATH;
    };

export type SrdStatBlockAggregateSyncResult =
  | { readonly tag: "synchronized" }
  | {
      readonly tag: "unsynchronized";
      readonly issues: readonly [
        SrdStatBlockAggregateSyncIssue,
        ...SrdStatBlockAggregateSyncIssue[],
      ];
    };

export type SrdStatBlockAggregateBytesResult =
  | { readonly tag: "available"; readonly bytes: Buffer }
  | { readonly tag: "unavailable"; readonly message: string };

function aggregateBytes(repoRoot: string): SrdStatBlockAggregateBytesResult {
  try {
    return {
      tag: "available",
      bytes: buildSrdStatBlockAggregateBytes(repoRoot),
    };
  } catch (error) {
    return { tag: "unavailable", message: String(error) };
  }
}

function installedAggregateBytes(
  repoRoot: string,
): SrdStatBlockAggregateBytesResult {
  try {
    return {
      tag: "available",
      bytes: readFileSync(
        join(repoRoot, SRD_STAT_BLOCK_AGGREGATE_RELATIVE_PATH),
      ),
    };
  } catch (error) {
    return { tag: "unavailable", message: String(error) };
  }
}

export function evaluateSrdStatBlockAggregateSync(
  expected: SrdStatBlockAggregateBytesResult,
  installed: SrdStatBlockAggregateBytesResult,
): SrdStatBlockAggregateSyncResult {
  const issues: SrdStatBlockAggregateSyncIssue[] = [];

  Match.value(expected).pipe(
    Match.when({ tag: "unavailable" }, ({ message }) => {
      issues.push({
        kind: "aggregate-generation-failed",
        file: SRD_STAT_BLOCK_AGGREGATE_RELATIVE_PATH,
        message,
      });
    }),
    Match.when({ tag: "available" }, () => undefined),
    Match.exhaustive,
  );
  Match.value(installed).pipe(
    Match.when({ tag: "unavailable" }, ({ message }) => {
      issues.push({
        kind: "aggregate-unreadable",
        file: SRD_STAT_BLOCK_AGGREGATE_RELATIVE_PATH,
        message,
      });
    }),
    Match.when({ tag: "available" }, () => undefined),
    Match.exhaustive,
  );
  const synchronizationPair = Match.value(expected).pipe(
    Match.when({ tag: "available" }, (availableExpected) =>
      Match.value(installed).pipe(
        Match.when({ tag: "available" }, (availableInstalled) => ({
          tag: "both-available" as const,
          expected: availableExpected,
          installed: availableInstalled,
        })),
        Match.when({ tag: "unavailable" }, () => ({
          tag: "installed-unavailable" as const,
        })),
        Match.exhaustive,
      ),
    ),
    Match.when({ tag: "unavailable" }, () =>
      Match.value(installed).pipe(
        Match.when({ tag: "available" }, () => ({
          tag: "expected-unavailable" as const,
        })),
        Match.when({ tag: "unavailable" }, () => ({
          tag: "both-unavailable" as const,
        })),
        Match.exhaustive,
      ),
    ),
    Match.exhaustive,
  );
  Match.value(synchronizationPair).pipe(
    Match.when({ tag: "both-available" }, ({ expected, installed }) => {
      if (!installed.bytes.equals(expected.bytes)) {
        issues.push({
          kind: "aggregate-out-of-sync",
          file: SRD_STAT_BLOCK_AGGREGATE_RELATIVE_PATH,
        });
      }
    }),
    Match.when({ tag: "installed-unavailable" }, () => undefined),
    Match.when({ tag: "expected-unavailable" }, () => undefined),
    Match.when({ tag: "both-unavailable" }, () => undefined),
    Match.exhaustive,
  );

  const [firstIssue, ...remainingIssues] = issues;
  return firstIssue === undefined
    ? { tag: "synchronized" }
    : { tag: "unsynchronized", issues: [firstIssue, ...remainingIssues] };
}

export function checkSrdStatBlockAggregateSync(
  repoRoot: string,
): SrdStatBlockAggregateSyncResult {
  return evaluateSrdStatBlockAggregateSync(
    aggregateBytes(repoRoot),
    installedAggregateBytes(repoRoot),
  );
}

function main(): void {
  Match.value(checkSrdStatBlockAggregateSync(process.cwd())).pipe(
    Match.when({ tag: "unsynchronized" }, ({ issues }) => {
      for (const issue of issues) {
        Match.value(issue).pipe(
          Match.when({ kind: "aggregate-out-of-sync" }, ({ file }) => {
            console.error(
              `SRD Stat Block aggregate is out of sync: regenerate ${file}.`,
            );
          }),
          Match.when(
            { kind: "aggregate-generation-failed" },
            ({ kind, file, message }) => {
              console.error(`SRD Stat Block ${kind}: ${file}: ${message}`);
            },
          ),
          Match.when(
            { kind: "aggregate-unreadable" },
            ({ kind, file, message }) => {
              console.error(`SRD Stat Block ${kind}: ${file}: ${message}`);
            },
          ),
          Match.exhaustive,
        );
      }
      process.exitCode = 1;
    }),
    Match.when({ tag: "synchronized" }, () => {
      console.log("SRD Stat Block aggregate is synchronized.");
    }),
    Match.exhaustive,
  );
}

if (process.argv[1]?.endsWith("check-srd-stat-block-aggregate.ts") === true) {
  main();
}
