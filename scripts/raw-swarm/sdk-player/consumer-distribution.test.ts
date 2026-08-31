// KERNEL-COVERAGE: parity-witness BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND
import { execFile, execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";
import { buildSync } from "esbuild";

import { capabilityContextForRole } from "../capability-projection.ts";
import { benchmarkContextForRole } from "../benchmark-context.ts";
import { isJsonRecord, repoRoot } from "../transcript.ts";
import { attemptSource } from "./attempt-source.ts";
import {
  assertPublicDeclarationBundle,
  buildConsumerDistribution,
  PUBLIC_DECLARATION_BUNDLE_MAX_BYTES,
  PUBLIC_DECLARATION_BUNDLE_MAX_FILES,
  PUBLIC_DECLARATION_BUNDLE_REVIEWED_BYTE_MARGIN,
  PUBLIC_DECLARATION_BUNDLE_REVIEWED_MEASURE,
} from "./consumer-distribution.ts";
import { evaluateScenarioCharacters } from "./scenario-character-runtime.ts";
import { evaluateScenarioSetup } from "./scenario-setup-runtime.ts";
import { parseSdkTranscript } from "./sdk-transcript.ts";
import {
  CONSUMER_DISTRIBUTION_BUILD_ENTRYPOINTS,
  CONSUMER_DISTRIBUTION_RUNTIME_ENTRYPOINTS,
} from "../lane-classification.cjs";

const CONSUMER_SCENARIO_ID = "ready-mixed-consumer";
const SUPERVISOR_HANDOFF_STARTED_AT = "2026-08-21T08:00:00.000Z";
const CONSUMER_DISTRIBUTION_TEST_TIMEOUT_MILLISECONDS = 10 * 60 * 1_000;
const execFileAsync = promisify(execFile);

async function waitForPath(path: string): Promise<void> {
  const deadline = Date.now() + CONSUMER_DISTRIBUTION_TEST_TIMEOUT_MILLISECONDS;
  while (!existsSync(path)) {
    if (Date.now() >= deadline)
      throw new Error(`Timed out waiting for ${path}.`);
    await new Promise((resolveWait) => setTimeout(resolveWait, 25));
  }
}

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
  test("bounds the declaration bundle to accessible declaration files", () => {
    expect(PUBLIC_DECLARATION_BUNDLE_MAX_FILES).toBe(530);
    expect(PUBLIC_DECLARATION_BUNDLE_MAX_BYTES).toBe(10 * 1024 * 1024);
    expect(PUBLIC_DECLARATION_BUNDLE_REVIEWED_BYTE_MARGIN).toBe(5_818_310);
    const directory = mkdtempSync(join(tmpdir(), "dnd-declaration-gate-"));
    writeFileSync(
      join(directory, "allowed.d.ts"),
      "x".repeat(PUBLIC_DECLARATION_BUNDLE_MAX_BYTES),
    );
    expect(assertPublicDeclarationBundle(directory)).toEqual({
      files: 1,
      bytes: PUBLIC_DECLARATION_BUNDLE_MAX_BYTES,
    });
    appendFileSync(join(directory, "allowed.d.ts"), "x");
    expect(() => assertPublicDeclarationBundle(directory)).toThrow(
      new RegExp(
        `Public declaration bundle has ${String(PUBLIC_DECLARATION_BUNDLE_MAX_BYTES + 1)} bytes; maximum is ${String(PUBLIC_DECLARATION_BUNDLE_MAX_BYTES)}`,
      ),
    );
    writeFileSync(join(directory, "allowed.d.ts"), "export {};\n");
    writeFileSync(join(directory, "README.md"), "not a declaration\n");
    expect(() => assertPublicDeclarationBundle(directory)).toThrow(
      /non-declaration file/,
    );

    const fileCapDirectory = mkdtempSync(
      join(tmpdir(), "dnd-declaration-file-gate-"),
    );
    for (let index = 0; index < PUBLIC_DECLARATION_BUNDLE_MAX_FILES; index++) {
      writeFileSync(join(fileCapDirectory, `${String(index)}.d.ts`), "");
    }
    expect(assertPublicDeclarationBundle(fileCapDirectory)).toEqual({
      files: PUBLIC_DECLARATION_BUNDLE_MAX_FILES,
      bytes: 0,
    });
    writeFileSync(
      join(
        fileCapDirectory,
        `${String(PUBLIC_DECLARATION_BUNDLE_MAX_FILES)}.d.ts`,
      ),
      "",
    );
    expect(() => assertPublicDeclarationBundle(fileCapDirectory)).toThrow(
      new RegExp(
        `Public declaration bundle has ${String(PUBLIC_DECLARATION_BUNDLE_MAX_FILES + 1)} files; maximum is ${String(PUBLIC_DECLARATION_BUNDLE_MAX_FILES)}`,
      ),
    );
  });

  test(
    "uses the caller's exact profile context for the player consumer",
    () => {
      const destination = mkdtempSync(join(tmpdir(), "dnd-profile-player-"));
      const trustedDestination = mkdtempSync(
        join(tmpdir(), "dnd-profile-player-trusted-"),
      );
      const scenarioPath = resolve(
        repoRoot,
        "scripts/raw-swarm/sdk-player/test-fixtures/ready-mixed.md",
      );
      buildConsumerDistribution({
        destination,
        trustedDestination,
        scenarioPath,
        contextDelivery: {
          tag: "benchmarkContext",
          profile: "boundedCapabilityProjection",
          role: "player",
        },
      });
      expect(readFileSync(join(destination, "BENCHMARK_CONTEXT.md"))).toEqual(
        Buffer.from(
          benchmarkContextForRole("boundedCapabilityProjection", "player"),
        ),
      );
    },
    10 * 60 * 1_000,
  );

  test(
    "runs typed continuations, freezes observed source, and replays SDK calls",
    async () => {
      const destination = mkdtempSync(join(tmpdir(), "dnd-player-consumer-"));
      const trustedDestination = mkdtempSync(
        join(tmpdir(), "dnd-player-supervisor-"),
      );
      const scenarioPath = resolve(
        repoRoot,
        "scripts/raw-swarm/sdk-player/test-fixtures/ready-mixed.md",
      );

      await execFileAsync(
        "pnpm",
        [
          "exec",
          "tsx",
          CONSUMER_DISTRIBUTION_RUNTIME_ENTRYPOINTS.cli,
          destination,
          trustedDestination,
          scenarioPath,
        ],
        {
          cwd: repoRoot,
          timeout: CONSUMER_DISTRIBUTION_TEST_TIMEOUT_MILLISECONDS,
        },
      );
      const declarationMeasure = assertPublicDeclarationBundle(
        join(destination, "declarations"),
      );
      expect(declarationMeasure).toEqual(
        PUBLIC_DECLARATION_BUNDLE_REVIEWED_MEASURE,
      );
      const declarationRoot = join(destination, "declarations");
      for (const retainedOwner of [
        "scripts/raw-swarm/sdk-player/consumer-entry.d.ts",
        "packages/character-battle-runtime/src/battle-character-build-projection.d.ts",
        "packages/character-battle-runtime/src/battle-creature-init.d.ts",
      ]) {
        expect(existsSync(join(declarationRoot, retainedOwner))).toBe(true);
      }
      for (const removedBroadDependency of [
        "packages/character-battle-runtime/src/index.d.ts",
        "packages/character-battle-runtime/src/companion-handoff.d.ts",
        "packages/character-battle-runtime/src/battle-handoff-issue.d.ts",
        "packages/character-battle-runtime/src/character-battle-route.d.ts",
        "packages/character-battle-runtime/src/origin-feat-selected-reference-projection.d.ts",
        "packages/surface/src/surface/generated/srd-stat-block-aggregate.d.ts",
        "packages/surface/src/surface/stat-block-identity.d.ts",
        "scripts/raw-swarm/transcript.d.ts",
        "scripts/raw-swarm/raw-swarm-identities.d.ts",
      ]) {
        expect(existsSync(join(declarationRoot, removedBroadDependency))).toBe(
          false,
        );
      }
      expect(
        assertPublicDeclarationBundle(join(trustedDestination, "declarations")),
      ).toEqual(declarationMeasure);
      expect(
        JSON.parse(readFileSync(join(destination, "OBSERVATION.json"), "utf8")),
      ).toEqual({
        kind: "awaitingFirstContinuation",
        tacticalNote: "",
        guidance:
          "No SDK call has been recorded. Replace the attempt.ts starter body with the first tactical continuation.",
      });
      expect(readFileSync(join(destination, "CAPABILITY_CONTEXT.md"))).toEqual(
        Buffer.from(capabilityContextForRole("player")),
      );
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
            CONSUMER_DISTRIBUTION_BUILD_ENTRYPOINTS.scenarioCharacterClient,
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
        evaluateScenarioSetup(
          mixedSetupPath,
          externalCharacters.characterSheets,
        ),
      ).resolves.toMatchObject({
        tag: "ready",
        observation: { combatants: 2 },
      });
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
          SUPERVISOR_HANDOFF_STARTED_AT,
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
      expect(readyTranscript).toContain(
        `"startedAt":"${SUPERVISOR_HANDOFF_STARTED_AT}"`,
      );
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
          SUPERVISOR_HANDOFF_STARTED_AT,
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
          "scripts/raw-swarm/sdk-player/test-fixtures/ready-fighter.characters.ts",
        ),
        join(trustedDestination, "evidence/characters.ts"),
      );
      copyFileSync(
        resolve(
          repoRoot,
          "scripts/raw-swarm/sdk-player/test-fixtures/ready-mixed.setup.ts",
        ),
        join(trustedDestination, "evidence/setup.ts"),
      );

      expect(
        filesBelow(destination)
          .filter((path) => path.endsWith(".ts") && !path.endsWith(".d.ts"))
          .map((path) => path.slice(destination.length + 1)),
      ).toEqual(["attempt.ts"]);
      expect(readFileSync(join(destination, "SCENARIO.md"), "utf8")).toContain(
        "External Fighter",
      );
      const capabilityContext = readFileSync(
        join(destination, "CAPABILITY_CONTEXT.md"),
        "utf8",
      );
      expect(capabilityContext).toContain("Raw Swarm capability projection v1");
      expect(capabilityContext).toContain("Role: player");
      expect(capabilityContext).not.toContain("README.md");
      expect(existsSync(join(destination, "FILL_TYPES.json"))).toBe(false);
      expect(existsSync(join(destination, "PUBLIC_SDK.md"))).toBe(false);
      expect(readFileSync(join(destination, "PLAYER.md"), "utf8")).toContain(
        'kind: "objectTargetChoice" as const',
      );
      expect(readFileSync(join(destination, "PLAYER.md"), "utf8")).toContain(
        "For a repeated-damage allocation",
      );
      expect(readFileSync(join(destination, "PLAYER.md"), "utf8")).toContain(
        "`allocations[i].count` die results",
      );
      expect(readFileSync(join(destination, "PLAYER.md"), "utf8")).toContain(
        "those results belong only to allocation",
      );
      expect(readFileSync(join(destination, "PLAYER.md"), "utf8")).toContain(
        "does not persist the answer prefix",
      );
      expect(readFileSync(join(destination, "PLAYER.md"), "utf8")).toContain(
        "session: first.session",
      );
      expect(readFileSync(join(destination, "PLAYER.md"), "utf8")).toContain(
        "fills: [...acceptedFills, nextFill]",
      );
      expect(readFileSync(join(destination, "PLAYER.md"), "utf8")).toContain(
        "route entries use the tactical cell coordinates",
      );
      expect(
        filesBelow(destination).some((path) => path.endsWith("supervisor.mjs")),
      ).toBe(false);
      expect(
        filesBelow(destination).some((path) =>
          path.endsWith("player-client.mjs"),
        ),
      ).toBe(true);
      expect(existsSync(join(trustedDestination, "FILL_TYPES.json"))).toBe(
        false,
      );
      expect(existsSync(join(destination, "FRONTIER_FILL_TYPES.md"))).toBe(
        false,
      );
      expect(
        existsSync(join(trustedDestination, "FRONTIER_FILL_TYPES.md")),
      ).toBe(false);
      const initialAttempt = readFileSync(
        join(destination, "attempt.ts"),
        "utf8",
      );
      expect(initialAttempt).toContain(
        '// Start surfaced movement with resolveScenarioMovement({ kind: "route", session, subject, route, speedKind, fills }); there is no movement field.',
      );
      expect(initialAttempt).toContain(
        "// Every continue and playerConcluded outcome must include a tacticalNote string; playerConcluded also requires a nonempty conclusion.",
      );

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
    tacticalNote: "Observed " + acts.length + " acts.",
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
          CONSUMER_SCENARIO_ID,
          "a".repeat(40),
          "instructionalFallback",
          SUPERVISOR_HANDOFF_STARTED_AT,
          "b".repeat(64),
          "c".repeat(64),
          "d".repeat(64),
        ],
        supervisorOptions,
      );
      const evidenceDirectory = join(trustedDestination, "evidence");
      const evidenceBeforeRejectedInit = filesBelow(evidenceDirectory)
        .map((path) => [path, readFileSync(path)] as const)
        .sort(([left], [right]) => left.localeCompare(right));
      const playerObservationBeforeRejectedInit = readFileSync(
        join(destination, "OBSERVATION.json"),
      );
      const rejectedInit = (() => {
        try {
          execFileSync(
            process.execPath,
            [
              supervisor,
              "init",
              "generated-battle-123",
              "a".repeat(40),
              "instructionalFallback",
              SUPERVISOR_HANDOFF_STARTED_AT,
              "b".repeat(64),
              "c".repeat(64),
              "d".repeat(64),
            ],
            supervisorOptions,
          );
          return undefined;
        } catch (error) {
          return error;
        }
      })();
      expect(rejectedInit).toBeInstanceOf(Error);
      if (rejectedInit instanceof Error) {
        expect("status" in rejectedInit ? rejectedInit.status : undefined).toBe(
          1,
        );
        expect(
          "stderr" in rejectedInit ? String(rejectedInit.stderr) : "",
        ).toContain("Invalid scenario id");
      }
      expect(
        filesBelow(evidenceDirectory)
          .map((path) => [path, readFileSync(path)] as const)
          .sort(([left], [right]) => left.localeCompare(right)),
      ).toEqual(evidenceBeforeRejectedInit);
      expect(readFileSync(join(destination, "OBSERVATION.json"))).toEqual(
        playerObservationBeforeRejectedInit,
      );
      const initialObservation: unknown = JSON.parse(
        readFileSync(
          join(trustedDestination, "evidence/initial-observation.json"),
          "utf8",
        ),
      );
      expect(
        JSON.parse(readFileSync(join(destination, "OBSERVATION.json"), "utf8")),
      ).toEqual(initialObservation);
      expect(initialObservation).toMatchObject({
        kind: "awaitingFirstContinuation",
        continuation: 0,
        projection: {
          continuation: 0,
          callSequences: [],
          frontier: { kind: "acts" },
        },
      });
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

      const discoveryAttempt = attemptSource(
        `  const acts = context.sdk.discoverBattleActs(context.session);
  return {
    kind: "continue",
    session: context.session,
    tacticalNote: "Observed " + acts.length + " acts.",
  };`,
      );
      writeFileSync(join(destination, "attempt.ts"), discoveryAttempt);
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
        writeFileSync(
          join(requestsDirectory, "malformed.request.json"),
          "{partial",
        );
        const malformedResponsePath = join(
          responsesDirectory,
          "malformed.response.json",
        );
        await waitForPath(malformedResponsePath);
        expect(JSON.parse(readFileSync(malformedResponsePath, "utf8"))).toEqual(
          { tag: "error", message: "Player request is invalid." },
        );
        writeFileSync(
          join(destination, "attempt.ts"),
          attemptSource(`  context.sdk.discoverBattleActs(context.session);
  throw new Error("Failure after an observed SDK call");`),
        );
        expect(() =>
          execFileSync(
            process.execPath,
            [join(destination, "player-client.mjs"), "attempt.ts"],
            { cwd: destination, stdio: "pipe" },
          ),
        ).toThrow();
        const executionErrorResponse: unknown = JSON.parse(
          readFileSync(join(destination, "OBSERVATION.json"), "utf8"),
        );
        expect(executionErrorResponse).toMatchObject({
          tag: "error",
          observation: {
            continuation: 1,
            kind: "executionError",
            message: "Failure after an observed SDK call",
            projection: expect.objectContaining({ continuation: 1 }),
            tacticalNote: "",
          },
        });
        if (
          typeof executionErrorResponse !== "object" ||
          executionErrorResponse === null ||
          !("observation" in executionErrorResponse)
        ) {
          throw new Error("Expected the frozen execution observation.");
        }
        expect(
          readFileSync(join(destination, "OBSERVATION.json"), "utf8"),
        ).toBe(
          readFileSync(
            join(trustedDestination, "player-response.json"),
            "utf8",
          ),
        );
        writeFileSync(join(destination, "attempt.ts"), discoveryAttempt);
        execFileSync(
          process.execPath,
          [join(destination, "player-client.mjs"), "attempt.ts"],
          { cwd: destination, stdio: "pipe" },
        );
        const successfulResponse: unknown = JSON.parse(
          readFileSync(join(destination, "OBSERVATION.json"), "utf8"),
        );
        if (
          typeof successfulResponse !== "object" ||
          successfulResponse === null ||
          !("observation" in successfulResponse)
        ) {
          throw new Error("Expected the successful continuation observation.");
        }

        const queuedObservationSha256 = createHash("sha256")
          .update(readFileSync(join(destination, "OBSERVATION.json"), "utf8"))
          .digest("hex");
        for (const requestId of ["a", "b"] as const) {
          writeFileSync(
            join(requestsDirectory, `${requestId}.request.json`),
            `${JSON.stringify({
              requestId,
              source: discoveryAttempt,
              expectedObservationSha256: queuedObservationSha256,
            })}\n`,
          );
        }
        const firstQueuedResponsePath = join(
          responsesDirectory,
          "a.response.json",
        );
        const secondQueuedResponsePath = join(
          responsesDirectory,
          "b.response.json",
        );
        await waitForPath(firstQueuedResponsePath);
        await waitForPath(secondQueuedResponsePath);
        const firstQueuedResponse: unknown = JSON.parse(
          readFileSync(firstQueuedResponsePath, "utf8"),
        );
        const secondQueuedResponse: unknown = JSON.parse(
          readFileSync(secondQueuedResponsePath, "utf8"),
        );
        expect(firstQueuedResponse).toMatchObject({ tag: "ok" });
        expect(secondQueuedResponse).toEqual({
          tag: "error",
          message:
            "Player request does not follow the latest published observation.",
        });
        writeFileSync(
          join(destination, "OBSERVATION.json"),
          readFileSync(firstQueuedResponsePath, "utf8"),
        );

        const observationsPath = join(
          trustedDestination,
          "evidence/observations.jsonl",
        );
        const latestObservationPublicationPath = join(
          trustedDestination,
          "OBSERVATION.json",
        );
        const observationsBeforeLatestPublicationFailure = readFileSync(
          observationsPath,
          "utf8",
        )
          .trim()
          .split("\n").length;
        rmSync(latestObservationPublicationPath);
        mkdirSync(latestObservationPublicationPath);
        const latestPublicationFailureRequestId =
          "latest-observation-publication-failure";
        writeFileSync(
          join(
            requestsDirectory,
            `${latestPublicationFailureRequestId}.request.json`,
          ),
          `${JSON.stringify({
            requestId: latestPublicationFailureRequestId,
            source: discoveryAttempt,
            expectedObservationSha256: createHash("sha256")
              .update(
                readFileSync(join(destination, "OBSERVATION.json"), "utf8"),
              )
              .digest("hex"),
          })}\n`,
        );
        const latestPublicationFailureResponsePath = join(
          responsesDirectory,
          `${latestPublicationFailureRequestId}.response.json`,
        );
        await waitForPath(latestPublicationFailureResponsePath);
        const latestPublicationFailureResponse: unknown = JSON.parse(
          readFileSync(latestPublicationFailureResponsePath, "utf8"),
        );
        expect(latestPublicationFailureResponse).toMatchObject({
          tag: "error",
          observation: { kind: "continue" },
        });
        expect(
          readFileSync(observationsPath, "utf8").trim().split("\n").length,
        ).toBe(observationsBeforeLatestPublicationFailure + 1);
        if (
          typeof latestPublicationFailureResponse !== "object" ||
          latestPublicationFailureResponse === null ||
          !("observation" in latestPublicationFailureResponse)
        ) {
          throw new Error("Expected the committed latest observation.");
        }
        rmSync(latestObservationPublicationPath, { recursive: true });
        writeFileSync(
          latestObservationPublicationPath,
          `${JSON.stringify(latestPublicationFailureResponse.observation, null, 2)}\n`,
        );
        writeFileSync(
          join(destination, "OBSERVATION.json"),
          readFileSync(latestPublicationFailureResponsePath, "utf8"),
        );
        rmSync(
          join(trustedDestination, "observation-publication-failure.json"),
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
      ).toContain("4 call(s) matched");

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
    fills: [],
  });
  if (
    awaitingOpportunity.tag !== "needsHoles" ||
    awaitingOpportunity.envelope.frontier.kind !== "interruptDecision"
  ) {
    throw new Error("Expected Opportunity Attack decision");
  }
  const decisionHole = awaitingOpportunity.envelope.frontier.decisionHole;
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
      value: { kind: "decline", responderId: endTurn.subject.actorId },
    },
  });
  return {
    kind: "continue",
    session: moved.session,
    tacticalNote: "Invalid interrupt: " + invalid.tag + "; premature continuation: " + prematureContinuation.tag + "; movement: " + moved.tag + ".",
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
      ).toContain("12 call(s) matched");

      const prefixPath = join(
        trustedDestination,
        "evidence/frozen-prefix.json",
      );
      const prefixBeforeLimit: Readonly<Record<string, unknown>> = JSON.parse(
        readFileSync(prefixPath, "utf8"),
      );
      writeFileSync(
        prefixPath,
        `${JSON.stringify({
          ...prefixBeforeLimit,
          continuationCount: 128,
        })}\n`,
      );
      writeFileSync(
        join(destination, "OBSERVATION.json"),
        readFileSync(
          join(trustedDestination, "player-published-observation.json"),
          "utf8",
        ),
      );
      const limitServer = spawn(
        process.execPath,
        [supervisor, "serve", requestsDirectory, responsesDirectory],
        supervisorOptions,
      );
      try {
        expect(
          execFileSync(
            process.execPath,
            [join(destination, "player-client.mjs"), "attempt.ts"],
            { cwd: destination, encoding: "utf8" },
          ),
        ).toContain('"tag": "terminalObstruction"');
      } finally {
        const stopped = new Promise<void>((resolveStopped) => {
          limitServer.once("exit", () => resolveStopped());
        });
        limitServer.kill("SIGTERM");
        await stopped;
      }
      expect(JSON.parse(readFileSync(prefixPath, "utf8"))).toMatchObject({
        run: {
          kind: "playerObstructed",
          obstruction: {
            kind: "continuationLimit",
            limit: 128,
            message: "Player continuation limit 128 reached.",
          },
        },
      });
      writeFileSync(prefixPath, `${JSON.stringify(prefixBeforeLimit)}\n`);

      writeFileSync(
        join(destination, "attempt.ts"),
        attemptSource(`  return {
    kind: "playerConcluded",
    session: context.session,
    tacticalNote: "The focused consumer run is complete.",
    conclusion: " Focused consumer run complete. ",
  };`),
      );
      expect(() =>
        execFileSync(
          process.execPath,
          [supervisor, "attempt", join(destination, "attempt.ts")],
          supervisorOptions,
        ),
      ).toThrow(/Continuation outcome kind or conclusion is invalid/);

      writeFileSync(
        join(destination, "attempt.ts"),
        attemptSource(`  context.sdk.discoverBattleActs(context.session);
  return {
    kind: "playerConcluded",
    session: context.session,
    tacticalNote: "The focused consumer run is complete.",
    conclusion: "Focused consumer run complete.",
  };`),
      );
      execFileSync(
        process.execPath,
        [supervisor, "attempt", join(destination, "attempt.ts")],
        supervisorOptions,
      );
      expect(() =>
        execFileSync(
          process.execPath,
          [supervisor, "attempt", join(destination, "attempt.ts")],
          supervisorOptions,
        ),
      ).toThrow(/already concluded its run/);
      expect(
        execFileSync(process.execPath, [supervisor, "replay"], {
          cwd: trustedDestination,
          encoding: "utf8",
        }),
      ).toContain("13 call(s) matched");
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
          ambientIllumination: "brightLight",
          objects: [],
          spatial: {
            kind: "geometryDerived",
            arena: { cellSizeFeet: 5 },
            space: { revision: 2 },
          },
        },
      });
      expect(header?.initialTurnProjection).toEqual(
        (initialObservation as { readonly projection: unknown }).projection,
      );
      for (const call of calls) {
        if (call.outcome === "returned") {
          expect(call.outputSession).toMatchObject({
            battlefield: {
              ambientIllumination: "brightLight",
              objects: [],
              spatial: {
                kind: "geometryDerived",
                arena: { cellSizeFeet: 5 },
              },
            },
          });
        }
      }
      expect(calls.at(-1)?.outputSession).toMatchObject({
        battlefield: {
          spatial: { kind: "geometryDerived", space: { revision: 3 } },
        },
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
                spatial: expect.objectContaining({
                  kind: "geometryDerived",
                  space: expect.objectContaining({ revision: 2 }),
                }),
              }),
              movementResolution: expect.objectContaining({
                kind: "geometryDerivedPending",
              }),
            }),
          }),
        ]),
      );
      expect(
        pendingMovementCalls
          .slice(0, 3)
          .every((call) =>
            JSON.stringify(call.outputSession).includes(
              '"kind":"geometryDerivedPending"',
            ),
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
      ).toContain("13 call(s) matched");
    },
    CONSUMER_DISTRIBUTION_TEST_TIMEOUT_MILLISECONDS,
  );

  test(
    "runs and replays the retained Table-authored terminal movement transcript",
    async () => {
      const destination = mkdtempSync(join(tmpdir(), "dnd-player-table-"));
      const trustedDestination = mkdtempSync(
        join(tmpdir(), "dnd-player-table-supervisor-"),
      );
      try {
        await execFileAsync(
          "pnpm",
          [
            "exec",
            "tsx",
            CONSUMER_DISTRIBUTION_RUNTIME_ENTRYPOINTS.cli,
            destination,
            trustedDestination,
            resolve(
              repoRoot,
              "scripts/raw-swarm/sdk-player/test-fixtures/ready-mixed.md",
            ),
          ],
          {
            cwd: repoRoot,
            timeout: CONSUMER_DISTRIBUTION_TEST_TIMEOUT_MILLISECONDS,
          },
        );
        mkdirSync(join(trustedDestination, "evidence"), {
          recursive: true,
        });
        copyFileSync(
          resolve(
            repoRoot,
            "scripts/raw-swarm/sdk-player/test-fixtures/ready-fighter.characters.ts",
          ),
          join(trustedDestination, "evidence/characters.ts"),
        );
        copyFileSync(
          resolve(
            repoRoot,
            "scripts/raw-swarm/sdk-player/test-fixtures/table-authored-movement.setup.ts",
          ),
          join(trustedDestination, "evidence/setup.ts"),
        );
        copyFileSync(
          resolve(
            repoRoot,
            "scripts/raw-swarm/sdk-player/test-fixtures/table-authored-movement.attempt.ts",
          ),
          join(destination, "attempt.ts"),
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
            "table-authored-movement-transcript",
            "a".repeat(40),
            "instructionalFallback",
            SUPERVISOR_HANDOFF_STARTED_AT,
            "b".repeat(64),
            "c".repeat(64),
            "d".repeat(64),
          ],
          supervisorOptions,
        );
        const initialTranscript = readFileSync(
          join(trustedDestination, "evidence/sdk-calls.jsonl"),
          "utf8",
        )
          .trim()
          .split("\n")
          .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
        expect(initialTranscript).toHaveLength(1);
        expect(initialTranscript[0]).toMatchObject({
          setupOutcome: "ready",
          initialSession: {
            battlefield: { spatial: { kind: "tableAuthored" } },
          },
        });

        execFileSync(
          process.execPath,
          [supervisor, "attempt", join(destination, "attempt.ts")],
          supervisorOptions,
        );
        const transcript = readFileSync(
          join(trustedDestination, "evidence/sdk-calls.jsonl"),
          "utf8",
        )
          .trim()
          .split("\n")
          .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
        const calls = transcript.slice(1);
        expect(calls).toHaveLength(2);
        expect(calls.map((call) => call.operation)).toEqual([
          "discoverBattleActs",
          "resolveScenarioMovement",
        ]);
        expect(calls[1]).toMatchObject({
          outcome: "returned",
          input: {
            kind: "route",
            route: [{ x: 1, y: 0 }],
          },
          outputSession: {
            battlefield: { spatial: { kind: "tableAuthored" } },
            movementResolution: { kind: "idle" },
          },
        });
        expect(
          JSON.parse(
            readFileSync(
              join(trustedDestination, "evidence/final.json"),
              "utf8",
            ),
          ),
        ).toMatchObject({
          kind: "playerConcluded",
          conclusion:
            "The retained Table movement transcript reached terminal resolution.",
        });
        expect(
          execFileSync(process.execPath, [supervisor, "replay"], {
            cwd: trustedDestination,
            encoding: "utf8",
          }),
        ).toContain("2 call(s) matched");
      } finally {
        rmSync(destination, { recursive: true, force: true });
        rmSync(trustedDestination, { recursive: true, force: true });
      }
    },
    CONSUMER_DISTRIBUTION_TEST_TIMEOUT_MILLISECONDS,
  );

  test(
    "projects the geometry attack target frontier through a supervisor continuation",
    async () => {
      const destination = mkdtempSync(join(tmpdir(), "dnd-player-attack-"));
      const trustedDestination = mkdtempSync(
        join(tmpdir(), "dnd-player-attack-supervisor-"),
      );
      try {
        await execFileAsync(
          "pnpm",
          [
            "exec",
            "tsx",
            CONSUMER_DISTRIBUTION_RUNTIME_ENTRYPOINTS.cli,
            destination,
            trustedDestination,
            resolve(
              repoRoot,
              "scripts/raw-swarm/sdk-player/test-fixtures/ready-mixed.md",
            ),
          ],
          {
            cwd: repoRoot,
            timeout: CONSUMER_DISTRIBUTION_TEST_TIMEOUT_MILLISECONDS,
          },
        );
        mkdirSync(join(trustedDestination, "evidence"), {
          recursive: true,
        });
        copyFileSync(
          resolve(
            repoRoot,
            "scripts/raw-swarm/sdk-player/test-fixtures/ready-fighter.characters.ts",
          ),
          join(trustedDestination, "evidence/characters.ts"),
        );
        copyFileSync(
          resolve(
            repoRoot,
            "scripts/raw-swarm/sdk-player/test-fixtures/ready-mixed.setup.ts",
          ),
          join(trustedDestination, "evidence/setup.ts"),
        );
        writeFileSync(
          join(destination, "attempt.ts"),
          attemptSource(`  const attack = context.sdk
    .discoverBattleActs(context.session)
    .find(
      ({ subject }) =>
        subject.tag === "action" &&
        subject.action === "attack" &&
        subject.actorId === "external-fighter",
    );
  if (
    attack === undefined ||
    attack.subject.tag !== "action" ||
    attack.subject.action !== "attack"
  ) {
    throw new Error("Expected External Fighter attack");
  }
  const awaitingTarget = context.sdk.resolveBattleRuntimeSubject({
    session: context.session,
    subject: attack.subject,
    fills: [],
  });
  if (awaitingTarget.tag !== "needsHoles") {
    throw new Error("Expected an attack target frontier");
  }
  if (awaitingTarget.envelope.frontier.kind !== "holes") {
    throw new Error("Expected an attack target Hole frontier");
  }
  const targetHole = awaitingTarget.envelope.frontier.holes.find(
    (hole: { kind: string; attack?: unknown }) =>
      hole.kind === "targetChoice" && hole.attack !== undefined,
  );
  if (targetHole?.kind !== "targetChoice") {
    throw new Error("Expected an attack target hole");
  }
  if (targetHole.requiresTableSpatialFact !== undefined) {
    throw new Error("Geometry attack target retained a Table spatial hole");
  }
  if (
    targetHole.choices.length !== 1 ||
    targetHole.choices[0] !== "external-skeleton"
  ) {
    throw new Error("Expected only the in-reach Skeleton target");
  }
  return {
    kind: "continue",
    session: awaitingTarget.session,
    tacticalNote: "Geometry attack target frontier retained the in-reach target.",
  };`),
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
            "geometry-target-frontier",
            "a".repeat(40),
            "instructionalFallback",
            SUPERVISOR_HANDOFF_STARTED_AT,
            "b".repeat(64),
            "c".repeat(64),
            "d".repeat(64),
          ],
          supervisorOptions,
        );
        execFileSync(
          process.execPath,
          [supervisor, "attempt", join(destination, "attempt.ts")],
          supervisorOptions,
        );

        const transcriptRecords = readFileSync(
          join(trustedDestination, "evidence/sdk-calls.jsonl"),
          "utf8",
        )
          .trim()
          .split("\n")
          .map((line): unknown => JSON.parse(line));
        const parsedTranscript = parseSdkTranscript(transcriptRecords);
        expect(parsedTranscript.tag).toBe("valid");
        if (parsedTranscript.tag !== "valid") {
          throw new Error(parsedTranscript.message);
        }
        expect(parsedTranscript.value.calls).toHaveLength(2);
        const targetCall = parsedTranscript.value.calls[1];
        expect(targetCall).toMatchObject({
          operation: "resolveBattleRuntimeSubject",
          outcome: "returned",
          result: { tag: "needsHoles" },
        });
        if (targetCall === undefined || targetCall.outcome !== "returned") {
          throw new Error("Expected projected battle resolution call");
        }
        const result = targetCall.result;
        if (!isJsonRecord(result)) {
          throw new Error("Expected projected battle resolution result");
        }
        const envelope = result.envelope;
        const holes =
          isJsonRecord(envelope) &&
          isJsonRecord(envelope.frontier) &&
          envelope.frontier.kind === "holes"
            ? envelope.frontier.holes
            : undefined;
        if (!Array.isArray(holes)) {
          throw new Error("Expected projected battle resolution holes");
        }
        const targetHole = holes.find(
          (hole) => isJsonRecord(hole) && hole.kind === "targetChoice",
        );
        expect(targetHole).toMatchObject({
          choices: ["external-skeleton"],
        });
        expect(targetHole).not.toHaveProperty("requiresTableSpatialFact");
        expect(
          execFileSync(process.execPath, [supervisor, "replay"], {
            cwd: trustedDestination,
            encoding: "utf8",
          }),
        ).toContain("2 call(s) matched");
      } finally {
        rmSync(destination, { recursive: true, force: true });
        rmSync(trustedDestination, { recursive: true, force: true });
      }
    },
    CONSUMER_DISTRIBUTION_TEST_TIMEOUT_MILLISECONDS,
  );

  test(
    "accepts a public spread of a static Stat Block attack selection in its distance witness",
    async () => {
      const destination = mkdtempSync(
        join(tmpdir(), "dnd-player-static-attack-"),
      );
      const trustedDestination = mkdtempSync(
        join(tmpdir(), "dnd-player-static-attack-supervisor-"),
      );
      try {
        await execFileAsync(
          "pnpm",
          [
            "exec",
            "tsx",
            "scripts/raw-swarm/sdk-player/consumer-distribution-cli.ts",
            destination,
            trustedDestination,
            resolve(
              repoRoot,
              "scripts/raw-swarm/sdk-player/test-fixtures/ready-mixed.md",
            ),
          ],
          {
            cwd: repoRoot,
            timeout: CONSUMER_DISTRIBUTION_TEST_TIMEOUT_MILLISECONDS,
          },
        );
        mkdirSync(join(trustedDestination, "evidence"), {
          recursive: true,
        });
        copyFileSync(
          resolve(
            repoRoot,
            "scripts/raw-swarm/sdk-player/test-fixtures/ready-fighter.characters.ts",
          ),
          join(trustedDestination, "evidence/characters.ts"),
        );
        const mixedSetup = readFileSync(
          resolve(
            repoRoot,
            "scripts/raw-swarm/sdk-player/test-fixtures/ready-mixed.setup.ts",
          ),
          "utf8",
        )
          .replace(
            'preferredComponentNotation: "rolled"',
            'preferredComponentNotation: "static"',
          )
          .replace(
            "initiative: sdk.initiativeScore(10)",
            "initiative: sdk.initiativeScore(20)",
          );
        writeFileSync(
          join(trustedDestination, "evidence/setup.ts"),
          mixedSetup,
        );
        writeFileSync(
          join(destination, "attempt.ts"),
          attemptSource(`  const usesOnlyStaticDamageComponents = (
    selection: unknown,
  ): boolean =>
    Array.isArray(selection) &&
    selection.length > 0 &&
    selection.every(
      (component: unknown) =>
        typeof component === "object" &&
        component !== null &&
        "notation" in component &&
        component.notation === "static",
    );
  const attack = context.sdk
    .discoverBattleActs(context.session)
    .find(
      ({ subject, initialHoles }) =>
        subject.tag === "action" &&
        subject.action === "attack" &&
        subject.actorId === "external-skeleton" &&
        subject.attackAbility === undefined &&
        usesOnlyStaticDamageComponents(subject.statBlockDamageSelection) &&
        initialHoles.some(
          (hole: (typeof initialHoles)[number]) =>
            hole.kind === "targetChoice" &&
            hole.attack?.targetConstraint.kind === "rangedRange",
        ),
    );
  if (
    attack === undefined ||
    attack.subject.tag !== "action" ||
    attack.subject.action !== "attack" ||
    attack.subject.attackAbility !== undefined ||
    !usesOnlyStaticDamageComponents(
      attack.subject.statBlockDamageSelection,
    )
  ) {
    throw new Error("Expected the static External Skeleton attack");
  }
  const awaitingTarget = context.sdk.resolveBattleRuntimeSubject({
    session: context.session,
    subject: attack.subject,
    fills: [],
  });
  if (awaitingTarget.tag !== "needsHoles") {
    throw new Error("Expected a static Stat Block attack target frontier");
  }
  if (awaitingTarget.envelope.frontier.kind !== "holes") {
    throw new Error("Expected a static Stat Block attack target Hole frontier");
  }
  const targetHole = awaitingTarget.envelope.frontier.holes.find(
    (hole: (typeof attack.initialHoles)[number]) =>
      hole.kind === "targetChoice" && hole.attack !== undefined,
  );
  if (targetHole?.kind !== "targetChoice" || targetHole.attack === undefined) {
    throw new Error("Expected a static Stat Block attack target hole");
  }
  const targetId = targetHole.choices[0];
  if (targetId === undefined) {
    throw new Error("Expected a static Stat Block attack target");
  }
  if (targetHole.attack.targetConstraint.kind !== "rangedRange") {
    throw new Error("Expected the static Stat Block attack to be ranged");
  }
  const targetFill = {
    kind: "targetChoice" as const,
    holeId: targetHole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "attackTargetDistance" as const,
        actorId: targetHole.attack.actorId,
        targetId,
        ...targetHole.attack.selection,
        distanceFeet: targetHole.attack.targetConstraint.normalFeet,
      },
    ],
  };
  const resolved = context.sdk.resolveBattleRuntimeSubject({
    session: awaitingTarget.session,
    subject: awaitingTarget.envelope.frontier.subject,
    fills: [targetFill],
  });
  if (resolved.tag !== "needsHoles") {
    throw new Error("Expected the static Stat Block attack roll frontier");
  }
  return {
    kind: "continue",
    session: resolved.session,
    tacticalNote:
      "The public static Stat Block selection spread into the distance witness and reached the attack roll frontier.",
  };`),
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
            "static-attack-distance-witness",
            "a".repeat(40),
            "instructionalFallback",
            SUPERVISOR_HANDOFF_STARTED_AT,
            "b".repeat(64),
            "c".repeat(64),
            "d".repeat(64),
          ],
          supervisorOptions,
        );
        execFileSync(
          process.execPath,
          [supervisor, "attempt", join(destination, "attempt.ts")],
          supervisorOptions,
        );

        const transcriptRecords = readFileSync(
          join(trustedDestination, "evidence/sdk-calls.jsonl"),
          "utf8",
        )
          .trim()
          .split("\n")
          .map((line): unknown => JSON.parse(line));
        const parsedTranscript = parseSdkTranscript(transcriptRecords);
        expect(parsedTranscript.tag).toBe("valid");
        if (parsedTranscript.tag !== "valid") {
          throw new Error(parsedTranscript.message);
        }
        expect(parsedTranscript.value.calls).toHaveLength(3);
        expect(
          parsedTranscript.value.calls.map(({ operation }) => operation),
        ).toEqual([
          "discoverBattleActs",
          "resolveBattleRuntimeSubject",
          "resolveBattleRuntimeSubject",
        ]);
        const targetCall = parsedTranscript.value.calls[2];
        expect(targetCall).toMatchObject({
          operation: "resolveBattleRuntimeSubject",
          outcome: "returned",
          result: {
            tag: "needsHoles",
            envelope: {
              frontier: {
                kind: "holes",
                holes: [{ kind: "attackRoll" }],
              },
            },
          },
          input: {
            fills: [
              {
                kind: "targetChoice",
                spatialFacts: [
                  {
                    kind: "attackTargetDistance",
                    statBlockDamageSelection: [
                      expect.objectContaining({ notation: "static" }),
                    ],
                  },
                ],
              },
            ],
          },
        });
        expect(
          execFileSync(process.execPath, [supervisor, "replay"], {
            cwd: trustedDestination,
            encoding: "utf8",
          }),
        ).toContain("3 call(s) matched");
      } finally {
        rmSync(destination, { recursive: true, force: true });
        rmSync(trustedDestination, { recursive: true, force: true });
      }
    },
    CONSUMER_DISTRIBUTION_TEST_TIMEOUT_MILLISECONDS,
  );
});
