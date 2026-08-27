import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildSrdStatBlockAggregateBytes,
  SRD_STAT_BLOCK_AGGREGATE_RELATIVE_PATH,
} from "./srd-stat-block-aggregate.ts";

const repoRoot = process.cwd();
const artifactPath = join(repoRoot, SRD_STAT_BLOCK_AGGREGATE_RELATIVE_PATH);

mkdirSync(dirname(artifactPath), { recursive: true });
writeFileSync(artifactPath, buildSrdStatBlockAggregateBytes(repoRoot));
console.log(`Generated ${SRD_STAT_BLOCK_AGGREGATE_RELATIVE_PATH}.`);
