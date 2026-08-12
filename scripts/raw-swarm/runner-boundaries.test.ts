import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

import { repoRoot } from "./transcript.ts";

const recorder = resolve(repoRoot, "scripts/raw-swarm/mcp-recording-shim.ts");
const launcher = resolve(repoRoot, "scripts/raw-swarm/run-freeplay.ts");

function run(script: string, args: readonly string[]): void {
  execFileSync("pnpm", ["exec", "tsx", script, ...args], {
    cwd: repoRoot,
    stdio: "pipe",
  });
}

describe("RAW swarm runner boundaries", () => {
  test.each([
    ["missing value", ["--transcript", "--scenario", "example"]],
    [
      "duplicate flag",
      ["--transcript", "one", "--transcript", "two", "--scenario", "example"],
    ],
    ["unknown flag", ["--transcript", "one", "--unknown", "example"]],
  ])("rejects recorder %s", (_label, args) => {
    expect(() => run(recorder, args)).toThrow();
  });

  test("rejects a launcher scenario id before path or config construction", () => {
    expect(() => run(launcher, ['bad-id"],mcp_servers.evil={}'])).toThrow();
  });
});
