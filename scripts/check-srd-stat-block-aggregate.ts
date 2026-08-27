import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildSrdStatBlockAggregateBytes,
  SRD_STAT_BLOCK_AGGREGATE_RELATIVE_PATH,
} from "./srd-stat-block-aggregate.ts";

const repoRoot = process.cwd();
const artifactPath = join(repoRoot, SRD_STAT_BLOCK_AGGREGATE_RELATIVE_PATH);
const expected = buildSrdStatBlockAggregateBytes(repoRoot);
let actual: Buffer | undefined;
try {
  actual = readFileSync(artifactPath);
} catch (error) {
  console.error(
    `SRD Stat Block aggregate is unreadable: ${SRD_STAT_BLOCK_AGGREGATE_RELATIVE_PATH}: ${String(error)}`,
  );
  process.exitCode = 1;
}

if (actual !== undefined) {
  if (!actual.equals(expected)) {
    console.error(
      `SRD Stat Block aggregate is out of sync: regenerate ${SRD_STAT_BLOCK_AGGREGATE_RELATIVE_PATH}.`,
    );
    process.exitCode = 1;
  } else {
    const recordCount = (
      actual.toString("utf8").match(/^  statBlockPeer/gm) ?? []
    ).length;
    console.log(
      `SRD Stat Block aggregate is synchronized: ${recordCount} records in RAW denominator order.`,
    );
  }
}
