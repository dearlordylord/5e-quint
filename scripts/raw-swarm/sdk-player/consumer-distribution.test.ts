import { execFileSync, spawn } from "node:child_process";
import {
  appendFileSync,
  copyFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { buildSync } from "esbuild";

import { repoRoot } from "../transcript.ts";
import { attemptSource } from "./attempt-source.ts";
import { buildConsumerDistribution } from "./consumer-distribution.ts";
import { evaluateScenarioCharacters } from "./scenario-character-runtime.ts";
import { evaluateScenarioSetup } from "./scenario-setup-runtime.ts";

const TRACER_SCENARIO_ID = "tracer-001-goblin-warrior-vs-skeleton";

function filesBelow(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  });
}

function copyDistribution(source: string, destination: string): void {
  cpSync(source, destination, { recursive: true });
  const configPath = join(destination, "tsconfig.json");
  const config = readFileSync(configPath, "utf8").replaceAll(
    source,
    destination,
  );
  writeFileSync(configPath, config);
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
    const characterBoundaryPath = join(destination, "character-boundary.ts");
    copyFileSync(
      resolve(
        repoRoot,
        "scripts/raw-swarm/sdk-player/test-fixtures/ready-fighter.characters.ts",
      ),
      characterBoundaryPath,
    );
    const characterConfigPath = join(destination, "character-tsconfig.json");
    const characterConfig = JSON.parse(
      readFileSync(join(destination, "tsconfig.json"), "utf8"),
    ) as Readonly<Record<string, unknown>>;
    writeFileSync(
      characterConfigPath,
      `${JSON.stringify(
        { ...characterConfig, include: ["character-boundary.ts"] },
        null,
        2,
      )}\n`,
    );
    execFileSync(
      process.execPath,
      [
        join(destination, "tooling/typescript/bin/tsc"),
        "--noEmit",
        "-p",
        characterConfigPath,
      ],
      { cwd: destination, stdio: "pipe" },
    );
    buildSync({
      entryPoints: [
        resolve(
          repoRoot,
          "scripts/raw-swarm/sdk-player/scenario-character-client.ts",
        ),
      ],
      outfile: join(destination, "character-client.mjs"),
      bundle: true,
      platform: "node",
      format: "esm",
      target: "node24",
      logLevel: "silent",
    });
    expect(
      execFileSync(
        process.execPath,
        [join(destination, "character-client.mjs"), characterBoundaryPath],
        { cwd: destination, encoding: "utf8" },
      ),
    ).toContain('"tag": "ready"');
    const externalCharacters = await evaluateScenarioCharacters(
      characterBoundaryPath,
    );
    expect(externalCharacters.tag).toBe("ready");
    if (externalCharacters.tag !== "ready") return;
    const mixedSetupPath = join(destination, "external-mixed-setup.ts");
    copyFileSync(
      resolve(
        repoRoot,
        "scripts/raw-swarm/sdk-player/test-fixtures/ready-mixed.setup.ts",
      ),
      mixedSetupPath,
    );
    writeFileSync(
      characterConfigPath,
      `${JSON.stringify(
        { ...characterConfig, include: ["external-mixed-setup.ts"] },
        null,
        2,
      )}\n`,
    );
    execFileSync(
      process.execPath,
      [
        join(destination, "tooling/typescript/bin/tsc"),
        "--noEmit",
        "-p",
        characterConfigPath,
      ],
      { cwd: destination, stdio: "pipe" },
    );
    await expect(
      evaluateScenarioSetup(mixedSetupPath, externalCharacters.characterSheets),
    ).resolves.toMatchObject({ tag: "ready", observation: { combatants: 2 } });
    const readyRoot = mkdtempSync(join(tmpdir(), "dnd-player-ready-mixed-"));
    const readyPlayer = join(readyRoot, "player");
    const readyTrusted = join(readyRoot, "trusted");
    copyDistribution(destination, readyPlayer);
    copyDistribution(trustedDestination, readyTrusted);
    mkdirSync(join(readyTrusted, "evidence"));
    copyFileSync(
      characterBoundaryPath,
      join(readyTrusted, "evidence/characters.ts"),
    );
    copyFileSync(mixedSetupPath, join(readyTrusted, "evidence/setup.ts"));
    const readySupervisor = join(readyTrusted, "supervisor.mjs");
    execFileSync(
      process.execPath,
      [
        readySupervisor,
        "init",
        "ready-mixed-scenario",
        "a".repeat(40),
        "instructionalFallback",
        "b".repeat(64),
        "c".repeat(64),
        "d".repeat(64),
      ],
      { cwd: readyTrusted, stdio: "pipe" },
    );
    const readyTranscript = readFileSync(
      join(readyTrusted, "evidence/sdk-calls.jsonl"),
      "utf8",
    );
    expect(readyTranscript).toContain('"characterOutcome":"ready"');
    expect(readyTranscript).toContain('"raw-swarm:external-fighter"');
    expect(readyTranscript).toContain('"setupOutcome":"ready"');
    expect(
      execFileSync(process.execPath, [readySupervisor, "replay"], {
        cwd: readyTrusted,
        encoding: "utf8",
      }),
    ).toContain("SDK player replay deterministic: 0 call(s) matched");
    rmSync(characterBoundaryPath);
    rmSync(mixedSetupPath);
    rmSync(characterConfigPath);
    writeFileSync(join(destination, "SCENARIO_REVIEW.json"), "{}\n");
    const obstructionRoot = mkdtempSync(
      join(tmpdir(), "dnd-player-obstruction-"),
    );
    const obstructionPlayer = join(obstructionRoot, "player");
    const obstructionTrusted = join(obstructionRoot, "trusted");
    copyDistribution(destination, obstructionPlayer);
    copyDistribution(trustedDestination, obstructionTrusted);
    mkdirSync(join(obstructionTrusted, "evidence"));
    writeFileSync(
      join(obstructionTrusted, "evidence/characters.ts"),
      `import type { ScenarioCharacters } from "@dnd/scenario-character-sdk";

export const composeScenarioCharacters: ScenarioCharacters = () => ({
  kind: "obstructed",
  obstruction: "Required character composition is unavailable.",
  observation: { missing: "character-build" },
});
`,
    );
    const obstructionSupervisor = join(obstructionTrusted, "supervisor.mjs");
    execFileSync(
      process.execPath,
      [
        obstructionSupervisor,
        "init",
        "obstructed-scenario",
        "a".repeat(40),
        "instructionalFallback",
        "b".repeat(64),
        "c".repeat(64),
        "d".repeat(64),
      ],
      { cwd: obstructionTrusted, stdio: "pipe" },
    );
    expect(
      execFileSync(process.execPath, [obstructionSupervisor, "replay"], {
        cwd: obstructionTrusted,
        encoding: "utf8",
      }),
    ).toContain("SDK character-composition obstruction replay deterministic");
    expect(
      readFileSync(
        join(obstructionTrusted, "evidence/sdk-calls.jsonl"),
        "utf8",
      ),
    ).toContain('"characterOutcome":"obstructed"');
    mkdirSync(join(trustedDestination, "evidence"));
    copyFileSync(
      resolve(
        repoRoot,
        `scripts/raw-swarm/sdk-player/scenarios/${TRACER_SCENARIO_ID}.characters.ts`,
      ),
      join(trustedDestination, "evidence/characters.ts"),
    );
    copyFileSync(
      resolve(
        repoRoot,
        `scripts/raw-swarm/sdk-player/scenarios/${TRACER_SCENARIO_ID}.setup.ts`,
      ),
      join(trustedDestination, "evidence/setup.ts"),
    );

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
  type MovementInput = Parameters<typeof context.sdk.resolveScenarioMovement>[0];
  type InterruptInput = Parameters<typeof context.sdk.resolveBattleRuntimeInterrupt>[0];
  type EndTurnInput = Parameters<typeof context.sdk.endBattleRuntimeTurn>[0];
  const compileEveryOperation = (
    subjectInput: SubjectInput,
    movementInput: MovementInput,
    interruptInput: InterruptInput,
    endTurnInput: EndTurnInput,
  ) => ({
    subject: context.sdk.resolveBattleRuntimeSubject(subjectInput),
    movement: context.sdk.resolveScenarioMovement(movementInput),
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
        "c".repeat(64),
        "d".repeat(64),
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
  const fighterAttack = acts.find(
    (act) =>
      act.subject.tag === "action" &&
      act.subject.action === "attack" &&
      act.subject.actorId === "external-fighter",
  );
  if (
    fighterAttack === undefined ||
    fighterAttack.subject.tag !== "action" ||
    fighterAttack.subject.action !== "attack" ||
    !("attackAbility" in fighterAttack.subject)
  ) throw new Error("Expected fighter Attack");
  const advanced = context.sdk.endBattleRuntimeTurn({
    session: context.session,
    actorId: endTurn.subject.actorId,
  });
  const skeletonActs = context.sdk.discoverBattleActs(advanced.session);
  const skeletonMove = skeletonActs.find(
    (act) =>
      act.subject.tag === "runtimeCommand" &&
      act.subject.command === "move" &&
      act.subject.actorId === "external-skeleton",
  );
  if (skeletonMove === undefined || skeletonMove.subject.tag !== "runtimeCommand" || skeletonMove.subject.command !== "move") {
    throw new Error("Expected skeleton Move");
  }
  const awaitingOpportunity = context.sdk.resolveScenarioMovement({
    kind: "route",
    session: advanced.session,
    subject: skeletonMove.subject,
    route: [{ x: 2, y: 0 }],
    speedKind: "walk",
    provokedOpportunityAttacks: [{
      reactorId: fighterAttack.subject.actorId,
      procedureRef: fighterAttack.subject.procedureRef,
      attackAbility: fighterAttack.subject.attackAbility,
      attackDamageType: fighterAttack.subject.attackDamageType,
    }],
    fills: [],
  });
  if (awaitingOpportunity.tag !== "needsHoles" || awaitingOpportunity.snapshot.pendingInterrupt === null) {
    throw new Error("Expected Opportunity Attack decision");
  }
  const decisionHole = awaitingOpportunity.snapshot.pendingInterrupt.decisionHole;
  const prematureContinuation = context.sdk.resolveScenarioMovement({
    kind: "continue",
    session: awaitingOpportunity.session,
    fills: [],
  });
  const invalid = context.sdk.resolveBattleRuntimeInterrupt({
    session: prematureContinuation.session,
    fill: {
      kind: "interruptDecision",
      holeId: decisionHole.holeId,
      value: { kind: "decline", responderId: skeletonMove.subject.actorId },
    },
  });
  const moved = context.sdk.resolveBattleRuntimeInterrupt({
    session: invalid.session,
    fill: {
      kind: "interruptDecision",
      holeId: decisionHole.holeId,
      value: { kind: "decline", responderId: fighterAttack.subject.actorId },
    },
  });
  return {
    kind: "continue",
    session: moved.session,
    observation: {
      invalidInterruptResult: invalid.tag,
      prematureContinuationResult: prematureContinuation.tag,
      movementResult: moved.tag,
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
    ).toContain("9 call(s) matched");
    const callEvidence = readFileSync(
      join(trustedDestination, "evidence/sdk-calls.jsonl"),
      "utf8",
    );
    expect(callEvidence).toContain('"tag":"invalid"');
    expect(callEvidence).toContain('"rejection":"operationFailure"');
    expect(callEvidence).toContain(
      '"operation":"resolveBattleRuntimeInterrupt"',
    );
    expect(callEvidence).toContain('"operation":"resolveScenarioMovement"');
    expect(callEvidence).toContain('"$set"');
    const [header, ...calls] = callEvidence
      .trim()
      .split("\n")
      .map((line): Readonly<Record<string, unknown>> => JSON.parse(line));
    expect(header?.initialSession).toMatchObject({
      battlefield: {
        arena: { cellSizeFeet: 5 },
        ambientIllumination: "brightLight",
        objects: [],
        space: { revision: 2 },
      },
    });
    for (const call of calls) {
      if (call.outcome === "returned") {
        expect(call.outputSession).toMatchObject({
          battlefield: {
            arena: { cellSizeFeet: 5 },
            ambientIllumination: "brightLight",
            objects: [],
          },
        });
      }
    }
    expect(calls.at(-1)?.outputSession).toMatchObject({
      battlefield: { space: { revision: 3 } },
      movementResolution: { kind: "idle" },
    });
    const pendingMovementCalls = calls.filter(
      (call) =>
        call.operation === "resolveScenarioMovement" ||
        call.operation === "resolveBattleRuntimeInterrupt",
    );
    expect(pendingMovementCalls.slice(0, 3)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          outputSession: expect.objectContaining({
            battlefield: expect.objectContaining({
              space: expect.objectContaining({ revision: 2 }),
            }),
            movementResolution: expect.objectContaining({ kind: "pending" }),
          }),
        }),
      ]),
    );
    expect(
      pendingMovementCalls
        .slice(0, 3)
        .every((call) =>
          JSON.stringify(call.outputSession).includes('"kind":"pending"'),
        ),
    ).toBe(true);

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
