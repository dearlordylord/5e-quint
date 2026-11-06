#!/usr/bin/env node
const entries = { machine: "./scripts/cli.ts", watch: "./scripts/watch.ts", view: "./scripts/viewer.ts", migrate: "./scripts/migrate.ts" };
const mode = process.argv[2];
if (!Object.hasOwn(entries, mode ?? "")) {
  process.stderr.write("Usage: node /path/to/state-machine-workflow/run.mjs machine|watch|view|migrate ...\n");
  process.exitCode = 1;
} else {
  process.argv.splice(2, 1);
  await import(entries[mode]);
}
