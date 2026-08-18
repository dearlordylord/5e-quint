import { mkdirSync, mkdtempSync } from "node:fs";
import { resolve } from "node:path";

import { repoRoot } from "./transcript.ts";

export function rawSwarmTestOutputDirectory(prefix: string): string {
  const outputRoot = resolve(repoRoot, "scripts/raw-swarm/out");
  mkdirSync(outputRoot, { recursive: true });
  return mkdtempSync(resolve(outputRoot, prefix));
}
