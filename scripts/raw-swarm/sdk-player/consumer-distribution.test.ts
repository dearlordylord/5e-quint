import { execFileSync, spawn } from "node:child_process";
import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, test } from "vitest";

import { repoRoot } from "../transcript.ts";
import { attemptSource } from "./attempt-source.ts";
import { buildConsumerDistribution } from "./consumer-distribution.ts";
import { TRACER_SCENARIO_ID } from "./fixed-scenario.ts";

function filesBelow(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  });
}

describe("SDK player consumer distribution", () => {
  test("runs typed continuations, freezes observed source, and replays SDK calls", async () => {
    const destination = mkdtempSync(join(tmpdir(), "dnd-player-consumer-"));
    const trustedDestination = mkdtempSync(
      join(tmpdir(), "dnd-player-supervisor-"),
    );
    const scenarioPath = resolve(
      repoRoot,
      "scripts/raw-swarm/sdk-player/scenarios/tracer-001-goblin-warrior-vs-skeleton.md",
    );

    buildConsumerDistribution({
      destination,
      trustedDestination,
      scenarioPath,
    });

    expect(
      filesBelow(destination)
        .filter((path) => path.endsWith(".ts") && !path.endsWith(".d.ts"))
        .map((path) => path.slice(destination.length + 1)),
    ).toEqual(["attempt.ts"]);
    expect(readFileSync(join(destination, "SCENARIO.md"), "utf8")).toContain(
      "Goblin Warrior",
    );
    expect(
      filesBelow(destination).some((path) => path.endsWith("supervisor.mjs")),
    ).toBe(false);
    expect(
      filesBelow(destination).some((path) =>
        path.endsWith("player-client.mjs"),
      ),
    ).toBe(true);

    writeFileSync(
      join(destination, "attempt.ts"),
      `import type { PlayerContinuation } from "@dnd/player-sdk";

export const continueBattle: PlayerContinuation = (context) => {
  const acts = context.sdk.discoverBattleActs(context.session);
  type SubjectInput = Parameters<typeof context.sdk.resolveBattleRuntimeSubject>[0];
  type InterruptInput = Parameters<typeof context.sdk.resolveBattleRuntimeInterrupt>[0];
  type EndTurnInput = Parameters<typeof context.sdk.endBattleRuntimeTurn>[0];
  const compileEveryOperation = (
    subjectInput: SubjectInput,
    interruptInput: InterruptInput,
    endTurnInput: EndTurnInput,
  ) => ({
    subject: context.sdk.resolveBattleRuntimeSubject(subjectInput),
    interrupt: context.sdk.resolveBattleRuntimeInterrupt(interruptInput),
    endTurn: context.sdk.endBattleRuntimeTurn(endTurnInput),
  });
  void compileEveryOperation;
  return {
    kind: "continue",
    session: context.session,
    observation: { availableActCount: acts.length },
  };
};
`,
    );
    execFileSync(
      process.execPath,
      [resolve(repoRoot, "node_modules/typescript/bin/tsc"), "--noEmit"],
      { cwd: destination, stdio: "pipe" },
    );

    const supervisor = join(trustedDestination, "supervisor.mjs");
    const supervisorOptions = {
      cwd: trustedDestination,
      env: { ...process.env, RAW_SWARM_PLAYER_ROOT: destination },
      stdio: "pipe" as const,
    };
    execFileSync(
      process.execPath,
      [
        supervisor,
        "init",
        TRACER_SCENARIO_ID,
        "a".repeat(40),
        "instructionalFallback",
        "b".repeat(64),
      ],
      supervisorOptions,
    );

    writeFileSync(
      join(destination, "attempt.ts"),
      attemptSource('  const invalid: number = "not a number";'),
    );
    expect(() =>
      execFileSync(
        process.execPath,
        [supervisor, "attempt", join(destination, "attempt.ts")],
        supervisorOptions,
      ),
    ).toThrow();
    expect(
      JSON.parse(
        readFileSync(
          join(trustedDestination, "evidence/frozen-prefix.json"),
          "utf8",
        ),
      ).continuationCount,
    ).toBe(0);

    writeFileSync(
      join(destination, "attempt.ts"),
      attemptSource(`  const acts = context.sdk.discoverBattleActs(context.session);
  return {
    kind: "continue",
    session: context.session,
    observation: { availableActCount: acts.length },
  };`),
    );
    const requestsDirectory = join(destination, ".requests");
    const responsesDirectory = join(destination, ".responses");
    mkdirSync(requestsDirectory);
    mkdirSync(responsesDirectory);
    const server = spawn(
      process.execPath,
      [supervisor, "serve", requestsDirectory, responsesDirectory],
      supervisorOptions,
    );
    try {
      execFileSync(
        process.execPath,
        [join(destination, "player-client.mjs"), "attempt.ts"],
        { cwd: destination, stdio: "pipe" },
      );
    } finally {
      const stopped = new Promise<void>((resolveStopped) => {
        server.once("exit", () => resolveStopped());
      });
      server.kill("SIGTERM");
      await stopped;
    }
    expect(
      execFileSync(process.execPath, [supervisor, "replay"], {
        cwd: trustedDestination,
        encoding: "utf8",
      }),
    ).toContain("1 call(s) matched");

    writeFileSync(
      join(destination, "attempt.ts"),
      attemptSource(`  const acts = context.sdk.discoverBattleActs(context.session);
  try {
    Function(
      "sdk",
      "session",
      "return sdk.resolveBattleRuntimeSubject({ session, subject: {}, fills: [] })",
    )(context.sdk, context.session);
  } catch {}
  const endTurn = acts.find(
    (act) => act.subject.tag === "runtimeCommand" && act.subject.command === "endTurn",
  );
  if (endTurn === undefined) throw new Error("Expected End Turn");
  const advanced = context.sdk.endBattleRuntimeTurn({
    session: context.session,
    actorId: endTurn.subject.actorId,
    fills: [],
  });
  const invalid = context.sdk.resolveBattleRuntimeSubject({
    session: advanced.session,
    subject: endTurn.subject,
    fills: [],
  });
  const noInterrupt = context.sdk.resolveBattleRuntimeInterrupt({
    session: invalid.session,
    fill: {
      kind: "interruptDecision",
      holeId: "probe:no-interrupt",
      value: { kind: "decline", responderId: endTurn.subject.actorId },
    },
  });
  return {
    kind: "continue",
    session: noInterrupt.session,
    observation: {
      staleSubjectResult: invalid.tag,
      noInterruptResult: noInterrupt.tag,
    },
  };`),
    );
    execFileSync(
      process.execPath,
      [supervisor, "attempt", join(destination, "attempt.ts")],
      supervisorOptions,
    );
    expect(
      execFileSync(process.execPath, [supervisor, "replay"], {
        cwd: trustedDestination,
        encoding: "utf8",
      }),
    ).toContain("6 call(s) matched");
    const callEvidence = readFileSync(
      join(trustedDestination, "evidence/sdk-calls.jsonl"),
      "utf8",
    );
    expect(callEvidence).toContain('"tag":"invalid"');
    expect(callEvidence).toContain('"rejection":"operationFailure"');
    expect(callEvidence).toContain(
      '"operation":"resolveBattleRuntimeInterrupt"',
    );
    expect(callEvidence).toContain('"$set"');

    const programPath = join(trustedDestination, "evidence/program.ts");
    const frozenProgram = readFileSync(programPath, "utf8");
    appendFileSync(programPath, "// forbidden rewrite\n");
    expect(() =>
      execFileSync(
        process.execPath,
        [supervisor, "attempt", join(destination, "attempt.ts")],
        supervisorOptions,
      ),
    ).toThrow();
    writeFileSync(programPath, frozenProgram);
    expect(
      execFileSync(process.execPath, [supervisor, "replay"], {
        cwd: trustedDestination,
        encoding: "utf8",
      }),
    ).toContain("6 call(s) matched");
  }, 180_000);
});
