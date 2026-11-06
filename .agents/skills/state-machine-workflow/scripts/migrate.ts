import { readFileSync } from "node:fs";
import { describeMigration, migrateStore } from "./migration.ts";

const usage = "Usage: node /path/to/state-machine-workflow/run.mjs migrate describe SOURCE.sqlite INSTANCE\n       node /path/to/state-machine-workflow/run.mjs migrate SOURCE.sqlite NEW_DESTINATION.sqlite INSTANCE PLAN.json";
try {
  const args = process.argv.slice(2);
  if (args[0] === "--help") process.stdout.write(usage + "\n");
  else if (args[0] === "describe" && args.length === 3 && args[1] && args[2]) {
    process.stdout.write(JSON.stringify(describeMigration(args[1], args[2]), null, 2) + "\n");
  } else if (args.length === 4 && args[0] && args[1] && args[2] && args[3]) {
    const plan: unknown = JSON.parse(readFileSync(args[3], "utf8"));
    process.stdout.write(JSON.stringify(await migrateStore({ source: args[0], destination: args[1], instance: args[2], plan }), null, 2) + "\n");
  } else throw new Error(usage);
} catch (error) {
  process.stderr.write(JSON.stringify({ error: error instanceof Error ? error.message : "Migration failed" }) + "\n");
  process.exitCode = 1;
}
