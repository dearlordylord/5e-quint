import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseEnv } from "node:util";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(root);
const credentials = join(
  process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"),
  "hapsland/.env",
);
if (existsSync(credentials)) {
  for (const [key, value] of Object.entries(
    parseEnv(readFileSync(credentials, "utf8")),
  )) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

// The published bin installs dependencies on every MCP launch. This pinned entry
// starts the same CLI after the checkout's explicit pnpm install has completed.
await import(
  pathToFileURL(join(root, "node_modules/traits/dist/main.js")).href
);
