#!/usr/bin/env node

const childProcess = require("node:child_process");

const result = childProcess.spawnSync(
  "pnpm",
  ["exec", "tsx", "scripts/check-surface-content-json-sync.ts"],
  { stdio: "inherit" },
);

if (result.error) {
  console.error(result.error.message);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
