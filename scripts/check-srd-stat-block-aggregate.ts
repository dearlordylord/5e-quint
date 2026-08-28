import { readFileSync } from "node:fs";
import { join } from "node:path";

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
  | {
      readonly tag: "synchronized";
      readonly recordCount: number;
    }
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

  if (expected.tag === "unavailable") {
    issues.push({
      kind: "aggregate-generation-failed",
      file: SRD_STAT_BLOCK_AGGREGATE_RELATIVE_PATH,
      message: expected.message,
    });
  }
  if (installed.tag === "unavailable") {
    issues.push({
      kind: "aggregate-unreadable",
      file: SRD_STAT_BLOCK_AGGREGATE_RELATIVE_PATH,
      message: installed.message,
    });
  }
  if (
    expected.tag === "available" &&
    installed.tag === "available" &&
    !installed.bytes.equals(expected.bytes)
  ) {
    issues.push({
      kind: "aggregate-out-of-sync",
      file: SRD_STAT_BLOCK_AGGREGATE_RELATIVE_PATH,
    });
  }

  const [firstIssue, ...remainingIssues] = issues;
  if (firstIssue !== undefined) {
    return { tag: "unsynchronized", issues: [firstIssue, ...remainingIssues] };
  }

  if (installed.tag !== "available") {
    throw new Error("Aggregate sync lost an unreadable artifact diagnostic");
  }
  return {
    tag: "synchronized",
    recordCount: (
      installed.bytes.toString("utf8").match(/^  statBlockPeer/gm) ?? []
    ).length,
  };
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
  const result = checkSrdStatBlockAggregateSync(process.cwd());
  if (result.tag === "unsynchronized") {
    for (const issue of result.issues) {
      if (issue.kind === "aggregate-out-of-sync") {
        console.error(
          `SRD Stat Block aggregate is out of sync: regenerate ${issue.file}.`,
        );
      } else {
        console.error(
          `SRD Stat Block ${issue.kind}: ${issue.file}: ${issue.message}`,
        );
      }
    }
    process.exitCode = 1;
    return;
  }
  console.log(
    `SRD Stat Block aggregate is synchronized: ${result.recordCount} records in RAW denominator order.`,
  );
}

if (process.argv[1]?.endsWith("check-srd-stat-block-aggregate.ts") === true) {
  main();
}
