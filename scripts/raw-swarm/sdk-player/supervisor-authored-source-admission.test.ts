import { spawn, spawnSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

import { repoRoot } from "../transcript.ts";
import { attemptSource } from "./attempt-source.ts";
import { buildConsumerDistributionBundle } from "./consumer-distribution.ts";

const STARTED_AT = "2026-09-01T12:00:00.000Z";

function writeCompilerConfig(root: string): void {
  writeFileSync(
    resolve(root, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "bundler",
          lib: ["ES2022"],
          types: [],
          baseUrl: ".",
          paths: {
            "@dnd/player-sdk": ["./declarations/player.d.ts"],
            "@dnd/scenario-character-sdk": ["./declarations/characters.d.ts"],
            "@dnd/scenario-setup-sdk": ["./declarations/setup.d.ts"],
          },
          strict: false,
          noEmit: true,
        },
        include: [],
      },
      null,
      2,
    )}\n`,
  );
}

function buildSupervisorRoot(): string {
  const root = mkdtempSync(resolve(tmpdir(), "dnd-supervisor-admission-"));
  mkdirSync(resolve(root, "declarations"));
  mkdirSync(resolve(root, "tooling"));
  mkdirSync(resolve(root, "node_modules/effect"), { recursive: true });
  cpSync(
    resolve(repoRoot, "node_modules/typescript"),
    resolve(root, "tooling/typescript"),
    { recursive: true, dereference: true },
  );
  writeFileSync(
    resolve(root, "declarations/player.d.ts"),
    'import type { Effect } from "effect";\nexport type CompilerSupport = Effect<never, never, never>;\nexport type PlayerContinuation = (context: any) => Promise<any>;\n',
  );
  writeFileSync(
    resolve(root, "declarations/characters.d.ts"),
    'import type { Effect } from "effect";\nexport type CompilerSupport = Effect<never, never, never>;\nexport type ScenarioCharacters = (context: any) => any;\n',
  );
  writeFileSync(
    resolve(root, "declarations/setup.d.ts"),
    'import type { Effect } from "effect";\nexport type CompilerSupport = Effect<never, never, never>;\nexport type ScenarioSetup = (context: any) => any;\n',
  );
  writeFileSync(
    resolve(root, "node_modules/effect/package.json"),
    `${JSON.stringify({ name: "effect", version: "0.0.0", types: "index.d.ts" })}\n`,
  );
  writeFileSync(
    resolve(root, "node_modules/effect/index.d.ts"),
    "export interface Effect<Success, Error, Requirements> { readonly _types: readonly [Success, Error, Requirements] }\n",
  );
  writeCompilerConfig(root);
  buildConsumerDistributionBundle({
    entryPoints: [
      resolve(repoRoot, "scripts/raw-swarm/sdk-player/supervisor-cli.ts"),
    ],
    outfile: resolve(root, "supervisor.mjs"),
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node24",
    logLevel: "silent",
  });
  return root;
}

function copySupervisorRoot(source: string, destination: string): void {
  cpSync(source, destination, { recursive: true });
  writeCompilerConfig(destination);
}

function supervisorResult(root: string, args: readonly string[]) {
  return spawnSync(
    process.execPath,
    [resolve(root, "supervisor.mjs"), ...args],
    {
      cwd: root,
      encoding: "utf8",
    },
  );
}

function overwriteNextStoredSubmission(
  root: string,
  replacement: string,
): Promise<number | null> {
  const watcher = spawn(
    process.execPath,
    [
      "-e",
      `const fs = require("node:fs");
const path = require("node:path");
const [submissions, replacement] = process.argv.slice(1);
const wait = new Int32Array(new SharedArrayBuffer(4));
const deadline = Date.now() + 10_000;
while (Date.now() < deadline) {
  if (fs.existsSync(submissions)) {
    for (const entry of fs.readdirSync(submissions)) {
      if (entry.endsWith(".rejected")) continue;
      const attempt = path.resolve(submissions, entry, "attempt.ts");
      if (fs.existsSync(attempt)) {
        fs.writeFileSync(attempt, replacement);
        process.exit(0);
      }
    }
  }
  Atomics.wait(wait, 0, 0, 2);
}
process.exit(2);`,
      resolve(root, "submissions"),
      replacement,
    ],
    { stdio: "ignore" },
  );
  return new Promise((resolveExit) => {
    watcher.once("exit", (code) => resolveExit(code));
  });
}

function initArgs(): readonly string[] {
  return [
    "init",
    "synthetic-admission-scenario",
    "a".repeat(40),
    "instructionalFallback",
    STARTED_AT,
    "b".repeat(64),
    "c".repeat(64),
    "d".repeat(64),
  ];
}

function writeReadySources(root: string): void {
  mkdirSync(resolve(root, "evidence"), { recursive: true });
  writeFileSync(
    resolve(root, "evidence/characters.ts"),
    `import type { ScenarioCharacters } from "@dnd/scenario-character-sdk";
export const composeScenarioCharacters: ScenarioCharacters = () => ({
  kind: "ready",
  characterSheets: [],
  observation: { characters: "Stat-block-only synthetic admission fixture." },
});
`,
  );
  copyFileSync(
    resolve(
      repoRoot,
      "scripts/raw-swarm/sdk-player/scenarios/goblin-warrior-skeleton-tracer.setup.ts",
    ),
    resolve(root, "evidence/setup.ts"),
  );
}

describe("SDK player supervisor authored-source admission", () => {
  test("typechecks relocated declarations through relative compiler support", () => {
    const root = buildSupervisorRoot();
    try {
      writeReadySources(root);
      const initialized = supervisorResult(root, initArgs());
      expect(initialized.status).toBe(0);
      expect(initialized.stderr).not.toContain("Cannot find module 'effect'");
      expect(initialized.stderr).not.toContain("ERR_ACCESS_DENIED");
    } finally {
      rmSync(root, { recursive: true });
    }
  }, 120_000);

  test("rejects trusted init, replay, and player submissions before evaluation", async () => {
    const base = buildSupervisorRoot();
    const initRoot = mkdtempSync(resolve(tmpdir(), "dnd-admission-init-"));
    const replayRoot = mkdtempSync(resolve(tmpdir(), "dnd-admission-replay-"));
    const playerRoot = mkdtempSync(resolve(tmpdir(), "dnd-admission-player-"));
    try {
      copySupervisorRoot(base, initRoot);
      mkdirSync(resolve(initRoot, "evidence"));
      const initSentinel = resolve(initRoot, "init-evaluated");
      writeFileSync(
        resolve(initRoot, "evidence/characters.ts"),
        `import { writeFileSync } from "node:fs";
writeFileSync(${JSON.stringify(initSentinel)}, "evaluated");
export const composeScenarioCharacters = () => ({ kind: "ready", characterSheets: [], observation: {} });
`,
      );
      const rejectedInit = supervisorResult(initRoot, initArgs());
      expect(rejectedInit.status).toBe(1);
      expect(rejectedInit.stderr).toContain("forbidden valueImport");
      expect(rejectedInit.stderr).not.toContain("did not typecheck");
      expect(existsSync(initSentinel)).toBe(false);

      copySupervisorRoot(base, replayRoot);
      mkdirSync(resolve(replayRoot, "evidence"));
      const replayCharactersPath = resolve(
        replayRoot,
        "evidence/characters.ts",
      );
      writeFileSync(
        replayCharactersPath,
        `import type { ScenarioCharacters } from "@dnd/scenario-character-sdk";
export const composeScenarioCharacters: ScenarioCharacters = () => ({
  kind: "obstructed",
  obstruction: "Synthetic character composition is unavailable.",
  observation: {},
});
`,
      );
      const replayInit = supervisorResult(replayRoot, initArgs());
      expect(replayInit.status).toBe(0);
      const replaySentinel = resolve(replayRoot, "replay-evaluated");
      writeFileSync(
        replayCharactersPath,
        `import { writeFileSync } from "node:fs";
writeFileSync(${JSON.stringify(replaySentinel)}, "evaluated");
export const composeScenarioCharacters = () => ({ kind: "obstructed", obstruction: "Changed.", observation: {} });
`,
      );
      const rejectedReplay = supervisorResult(replayRoot, ["replay"]);
      expect(rejectedReplay.status).toBe(1);
      expect(rejectedReplay.stderr).toContain("forbidden valueImport");
      expect(rejectedReplay.stderr).not.toContain("source hash diverged");
      expect(existsSync(replaySentinel)).toBe(false);

      copySupervisorRoot(base, playerRoot);
      writeReadySources(playerRoot);
      const playerInit = supervisorResult(playerRoot, initArgs());
      expect(playerInit.status).toBe(0);
      const playerSentinel = resolve(playerRoot, "player-evaluated");
      const attemptPath = resolve(playerRoot, "attempt.ts");
      writeFileSync(
        attemptPath,
        attemptSource(`  const fs = await import("node:fs");
  fs.writeFileSync(${JSON.stringify(playerSentinel)}, "evaluated");
  context.sdk.discoverBattleActs(context.session);
  return { kind: "continue", session: context.session, tacticalNote: "unreachable" };`),
      );
      const rejectedAttempt = supervisorResult(playerRoot, [
        "attempt",
        attemptPath,
      ]);
      expect(rejectedAttempt.status).toBe(1);
      expect(rejectedAttempt.stderr).toContain("forbidden dynamicImport");
      expect(rejectedAttempt.stderr).not.toContain("did not typecheck");
      expect(existsSync(playerSentinel)).toBe(false);

      const overwriteSentinel = resolve(playerRoot, "overwritten-evaluated");
      const replacement = `import { writeFileSync } from "node:fs";
writeFileSync(${JSON.stringify(overwriteSentinel)}, "evaluated");
export const continueBattle = async (context) => {
  context.sdk.discoverBattleActs(context.session);
  return { kind: "continue", session: context.session, tacticalNote: "REPLACED" };
};
`;
      const watcherExit = overwriteNextStoredSubmission(
        playerRoot,
        replacement,
      );
      const retainedAttemptPath = resolve(playerRoot, "retained-attempt.ts");
      writeFileSync(
        retainedAttemptPath,
        attemptSource(`  context.sdk.discoverBattleActs(context.session);
  return { kind: "continue", session: context.session, tacticalNote: "ADMITTED" };`),
      );
      const retainedAttempt = supervisorResult(playerRoot, [
        "attempt",
        retainedAttemptPath,
      ]);
      expect(await watcherExit).toBe(0);
      expect(retainedAttempt.status).toBe(0);
      expect(retainedAttempt.stderr).toBe("");
      expect(existsSync(overwriteSentinel)).toBe(false);
      expect(
        readFileSync(resolve(playerRoot, "evidence/program.ts"), "utf8"),
      ).toContain('tacticalNote: "ADMITTED"');
    } finally {
      rmSync(base, { recursive: true });
      rmSync(initRoot, { recursive: true });
      rmSync(replayRoot, { recursive: true });
      rmSync(playerRoot, { recursive: true });
    }
  }, 120_000);
});
