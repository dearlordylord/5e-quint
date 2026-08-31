import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildSrdUnitAggregateBytes,
  SRD_UNIT_AGGREGATE_RELATIVE_PATH,
} from "./srd-unit-aggregate.ts";

const repoRoot = process.cwd();
const artifactPath = join(repoRoot, SRD_UNIT_AGGREGATE_RELATIVE_PATH);
const expected = buildSrdUnitAggregateBytes(repoRoot);
let actual: Buffer | undefined;
try {
  actual = readFileSync(artifactPath);
} catch (error) {
  console.error(
    `SRD Unit aggregate is unreadable: ${SRD_UNIT_AGGREGATE_RELATIVE_PATH}: ${String(error)}`,
  );
  process.exitCode = 1;
}

if (actual !== undefined) {
  if (!actual.equals(expected)) {
    console.error(
      `SRD Unit aggregate is out of sync: regenerate ${SRD_UNIT_AGGREGATE_RELATIVE_PATH}.`,
    );
    process.exitCode = 1;
  } else {
    const recordCount = (actual.toString("utf8").match(/^  unitPeer/gm) ?? [])
      .length;
    console.log(
      `SRD Unit aggregate is synchronized: ${recordCount} records in publication order.`,
    );
  }
}
