import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildSrdUnitAggregateBytes,
  SRD_UNIT_AGGREGATE_RELATIVE_PATH,
} from "./srd-unit-aggregate.ts";

const repoRoot = process.cwd();
const artifactPath = join(repoRoot, SRD_UNIT_AGGREGATE_RELATIVE_PATH);

mkdirSync(dirname(artifactPath), { recursive: true });
writeFileSync(artifactPath, buildSrdUnitAggregateBytes(repoRoot));
console.log(`Generated ${SRD_UNIT_AGGREGATE_RELATIVE_PATH}.`);
