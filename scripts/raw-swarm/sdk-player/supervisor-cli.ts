// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.TABLE_CIRCUMSTANCE_DECISION
import { spawnSync } from "node:child_process";
import { constants } from "node:fs";
import { randomUUID } from "node:crypto";
import {
  appendFileSync,
  closeSync,
  existsSync,
  linkSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  BattleSnapshotSchema,
  endBattleRuntimeTurnWithTableD20TestCircumstances,
  resolveBattleRuntimeInterrupt,
  resolveBattleRuntimeSubject,
  resolveBattleRuntimeSubjectWithTableD20TestCircumstances,
  snapshotBattle,
  type BattleRuntimeResolutionResult,
  type BattleRuntimeTableD20TestResolutionResult,
} from "../../../packages/battle-runtime/src/index.ts";
import { Either, Match, Schema } from "effect";

import type {
  JsonValue,
  PlayerContinuationOutcome,
  PlayerSdk,
  ScenarioBattleResolutionResult,
  ScenarioTableD20TestResolutionResult,
} from "./continuation-contract.ts";
import { authoredAttemptBody } from "./attempt-source.ts";
import { evaluateScenarioCharacters } from "./scenario-character-runtime.ts";
import { evaluateScenarioSetup } from "./scenario-setup-runtime.ts";
import {
  continueScenarioMovement,
  planScenarioMovement,
  scenarioBattleActs,
  scenarioBattleFills,
  scenarioBattleSubject,
  scenarioSessionAfterRejectedMovement,
  scenarioRelation,
  scenarioAttackTargetFills,
  scenarioObjectAttackFills,
  scenarioTableSpatialFactFills,
  scenarioCreatureSpellTargetFills,
  scenarioBattleResultWithD20TestCircumstances,
  scenarioD20TestCircumstancePreparation,
  scenarioD20TestResolutionId,
  scenarioSessionAfterD20TestCircumstanceResolution,
  scenarioSessionWithBattleResult,
  scenarioTokenId,
  type ScenarioSession,
} from "./scenario-session.ts";
import {
  canonicalSdkCallInput,
  decodeSdkCallInput,
  type SdkCallInput,
} from "./sdk-replay-input.ts";
import {
  playerCurrentTurnProjection,
  playerInitialTurnProjection,
} from "./player-turn-projection.ts";
import { jsonValue } from "./json-value.ts";
import {
  parseSdkTranscript,
  sdkInitialTurnProjectionEvidence,
  SDK_SESSION_CONFLICT_MESSAGE,
  type SdkCallRecord,
  type SdkPlayerOperation,
} from "./sdk-transcript.ts";
import {
  StartedAtSchema,
  canonicalJson,
  sha256Canonical,
  sha256Text,
} from "../transcript.ts";
import {
  PlayerExecutionStateSchema,
  playerContinuationAdmission,
} from "../player-continuation-evidence.ts";

type SupervisorTimingRecord = {
  readonly schemaVersion: 1;
  readonly transcriptHeaderSha256: string;
  readonly continuation: number;
  readonly phases: {
    readonly continuationTypecheckMilliseconds: number;
    readonly priorCallVerificationReplayMilliseconds: number;
    readonly newSdkExecutionMilliseconds: number;
    readonly evidenceWritingMilliseconds: number;
  };
};

const transcriptPath = resolve("evidence/sdk-calls.jsonl");
const programPath = resolve("evidence/program.ts");
const prefixPath = resolve("evidence/frozen-prefix.json");
const observationsPath = resolve("evidence/observations.jsonl");
const initialObservationPath = resolve("evidence/initial-observation.json");
const latestObservationPath = resolve("OBSERVATION.json");
const playerResponsePath = resolve("player-response.json");
const playerPublishedObservationPath = resolve(
  "player-published-observation.json",
);
const observationPublicationFailurePath = resolve(
  "observation-publication-failure.json",
);
const finalPath = resolve("evidence/final.json");
const supervisorTimingsPath = resolve("evidence/supervisor-timings.jsonl");
const playerRoot = resolve(process.env.RAW_SWARM_PLAYER_ROOT ?? process.cwd());
const submissionsPath = resolve("submissions");
const charactersPath = resolve("evidence/characters.ts");
const setupPath = resolve("evidence/setup.ts");

const HashSchema = Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/));
const NonNegativeIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
);
const PrefixSchema = Schema.Struct({
  frozenByteLength: NonNegativeIntegerSchema,
  frozenSha256: HashSchema,
  continuationCount: NonNegativeIntegerSchema,
  run: PlayerExecutionStateSchema,
});
type FrozenPrefix = Schema.Schema.Type<typeof PrefixSchema>;

const PROGRAM_PREFIX = `import type { PlayerContinuation } from "@dnd/player-sdk";
`;

function fail(message: string): never {
  throw new Error(message);
}

function atomicJson(path: string, value: unknown): void {
  const temporaryPath = `${path}.next`;
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporaryPath, path);
}

function atomicAppendJsonLine(path: string, value: unknown): void {
  const previous = existsSync(path) ? readFileSync(path, "utf8") : "";
  const temporaryPath = `${path}.${randomUUID()}.next`;
  const descriptor = openSync(
    temporaryPath,
    constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW |
      constants.O_WRONLY,
    0o600,
  );
  try {
    writeFileSync(descriptor, `${previous}${JSON.stringify(value)}\n`, "utf8");
  } finally {
    closeSync(descriptor);
  }
  try {
    renameSync(temporaryPath, path);
  } catch (error) {
    rmSync(temporaryPath, { force: true });
    throw error;
  }
}

function publishLatestPlayerObservation(observation: unknown): void {
  try {
    atomicJson(latestObservationPath, observation);
  } catch (error) {
    atomicJson(observationPublicationFailurePath, {
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

function exclusiveJson(path: string, value: unknown): void {
  const temporaryPath = `${path}.${randomUUID()}.next`;
  const descriptor = openSync(
    temporaryPath,
    constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW |
      constants.O_WRONLY,
    0o600,
  );
  try {
    writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  } finally {
    closeSync(descriptor);
  }
  try {
    linkSync(temporaryPath, path);
  } finally {
    unlinkSync(temporaryPath);
  }
}

function readPrefix(): FrozenPrefix {
  const decoded = Schema.decodeUnknownEither(PrefixSchema, {
    onExcessProperty: "error",
  })(JSON.parse(readFileSync(prefixPath, "utf8")));
  if (Either.isLeft(decoded)) fail("Frozen-prefix evidence is invalid.");
  return decoded.right;
}

function verifyFrozenPrefix(): FrozenPrefix {
  const prefix = readPrefix();
  const program = readFileSync(programPath, "utf8");
  const byteLength = Buffer.byteLength(program);
  const hash = sha256Text(program);
  if (byteLength !== prefix.frozenByteLength || hash !== prefix.frozenSha256) {
    fail("Previously observed SDK program source was modified.");
  }
  return Match.value(prefix.run).pipe(
    Match.when({ kind: "active" }, () => prefix),
    Match.when({ kind: "playerConcluded" }, ({ conclusion }) =>
      fail(`Player has already concluded its run: ${conclusion}`),
    ),
    Match.when({ kind: "playerObstructed" }, ({ obstruction }) =>
      fail(`Player Execution is obstructed: ${obstruction.message}`),
    ),
    Match.exhaustive,
  );
}

async function initialize(
  scenarioId: string,
  gitSha: string,
  consumerIsolation: string,
  startedAt: Schema.Schema.Type<typeof StartedAtSchema>,
  replaySupervisorSha256: string,
  scenarioSha256: string,
  scenarioReviewSha256: string,
): Promise<void> {
  if (existsSync(transcriptPath)) fail("SDK player evidence already exists.");
  mkdirSync(resolve("evidence"), { recursive: true });
  if (!existsSync(charactersPath))
    fail("Scenario character source is missing.");
  const setupConfigPath = resolve("evidence/setup-tsconfig.json");
  const setupConfig: unknown = JSON.parse(
    readFileSync(resolve("tsconfig.json"), "utf8"),
  );
  if (!isRecord(setupConfig)) fail("Player tsconfig must be an object.");
  writeFileSync(
    setupConfigPath,
    `${JSON.stringify(
      { ...setupConfig, include: [charactersPath] },
      null,
      2,
    )}\n`,
  );
  try {
    typecheckSubmission(charactersPath, setupConfigPath);
  } finally {
    rmSync(setupConfigPath, { force: true });
  }
  const characters = await evaluateScenarioCharacters(charactersPath);
  if (characters.tag === "invalid") fail(characters.message);
  const headerIdentity = {
    type: "sdk-player-header",
    scenarioId,
    gitSha,
    startedAt,
    consumerIsolation,
    replaySupervisorSha256,
    charactersSha256: sha256Text(readFileSync(charactersPath, "utf8")),
    characterObservation: characters.observation,
    scenarioSha256,
    scenarioReviewSha256,
  } as const;
  if (characters.tag === "obstructed") {
    appendFileSync(
      transcriptPath,
      `${JSON.stringify({
        ...headerIdentity,
        characterOutcome: "obstructed",
        obstruction: characters.obstruction,
      })}\n`,
    );
    return;
  }
  if (!existsSync(setupPath)) fail("Scenario setup source is missing.");
  writeFileSync(
    setupConfigPath,
    `${JSON.stringify({ ...setupConfig, include: [setupPath] }, null, 2)}\n`,
  );
  try {
    typecheckSubmission(setupPath, setupConfigPath);
  } finally {
    rmSync(setupConfigPath, { force: true });
  }
  const setup = await evaluateScenarioSetup(
    setupPath,
    characters.characterSheets,
  );
  if (setup.tag === "invalid") fail(setup.message);
  const characterSheets = jsonValue(characters.characterSheets);
  const setupSha256 = sha256Text(readFileSync(setupPath, "utf8"));
  const headerCommon = {
    ...headerIdentity,
    characterOutcome: "ready",
    characterSheets,
    characterSheetsSha256: sha256Canonical(characterSheets),
    characterObservation: characters.observation,
    setupSha256,
    setupObservation: setup.observation,
  } as const;
  Match.value(setup).pipe(
    Match.when({ tag: "obstructed" }, ({ obstruction }) => {
      appendFileSync(
        transcriptPath,
        `${JSON.stringify({
          ...headerCommon,
          setupOutcome: "obstructed",
          obstruction,
        })}\n`,
      );
    }),
    Match.when({ tag: "ready" }, ({ session }) => {
      const initialSession = jsonValue(session);
      const initialProjection = playerInitialTurnProjection({
        session: initialSession,
        acts: scenarioBattleActs(session),
      });
      if (initialProjection.tag === "invalid") {
        fail(initialProjection.message);
      }
      const program = PROGRAM_PREFIX;
      writeFileSync(programPath, program, "utf8");
      atomicJson(prefixPath, {
        frozenByteLength: Buffer.byteLength(program),
        frozenSha256: sha256Text(program),
        continuationCount: 0,
        run: { kind: "active" },
      } satisfies FrozenPrefix);
      const header = {
        ...headerCommon,
        setupOutcome: "ready" as const,
        initialSession,
        initialSessionSha256: sha256Canonical(initialSession),
        initialTurnProjection: initialProjection.projection,
        initialTurnProjectionSha256: sha256Canonical(
          initialProjection.projection,
        ),
      };
      appendFileSync(transcriptPath, `${JSON.stringify(header)}\n`);
      const observation = {
        transcriptHeaderSha256: sha256Canonical(header),
        continuation: 0,
        kind: "awaitingFirstContinuation" as const,
        projection: initialProjection.projection,
        tacticalNote: "",
      };
      atomicJson(latestObservationPath, observation);
      atomicJson(initialObservationPath, observation);
      atomicJson(resolve(playerRoot, "OBSERVATION.json"), observation);
      atomicJson(playerPublishedObservationPath, observation);
    }),
    Match.exhaustive,
  );
}

function transcriptRecords(): readonly unknown[] {
  return readFileSync(transcriptPath, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line): unknown => JSON.parse(line));
}

function resolutionProjection(
  result: ScenarioBattleResolutionResult,
): JsonValue {
  if (
    result.tag === "scenarioSessionConflict" ||
    result.tag === "scenarioMovementRejected"
  )
    return jsonValue(result);
  const { snapshot, ...outcome } = result;
  return jsonValue({
    ...outcome,
    snapshot: Schema.encodeSync(BattleSnapshotSchema)(snapshot),
  });
}

type AppliedCall<Operation extends SdkPlayerOperation = SdkPlayerOperation> =
  Operation extends SdkPlayerOperation
    ? {
        readonly operation: Operation;
        readonly session: ScenarioSession;
        readonly result: JsonValue;
        readonly value: ReturnType<PlayerSdk[Operation]>;
      }
    : never;

const byOperation = Match.discriminator("operation");
const byResolutionTag = Match.discriminator("tag");

function retainScenarioBattlefield(
  session: ScenarioSession,
  result: BattleRuntimeTableD20TestResolutionResult,
  cancelInvalidMovement?: false,
): ScenarioTableD20TestResolutionResult;
function retainScenarioBattlefield(
  session: ScenarioSession,
  result: BattleRuntimeResolutionResult,
  cancelInvalidMovement?: boolean,
): ScenarioBattleResolutionResult;
function retainScenarioBattlefield(
  session: ScenarioSession,
  result:
    | BattleRuntimeResolutionResult
    | BattleRuntimeTableD20TestResolutionResult,
  cancelInvalidMovement = false,
): ScenarioBattleResolutionResult {
  return Match.value(result).pipe(
    byResolutionTag("resolved", (resolved) => {
      const updated = scenarioSessionWithBattleResult(
        session,
        resolved.session,
        resolved.objectDamages,
        resolved.movements,
      );
      return Either.isLeft(updated)
        ? {
            tag: "scenarioSessionConflict" as const,
            session,
            issue: updated.left,
          }
        : { ...resolved, session: updated.right };
    }),
    byResolutionTag("needsHoles", (needsHoles) => {
      const updated = scenarioSessionWithBattleResult(
        session,
        needsHoles.session,
      );
      return Either.isLeft(updated)
        ? {
            tag: "scenarioSessionConflict" as const,
            session,
            issue: updated.left,
          }
        : { ...needsHoles, session: updated.right };
    }),
    byResolutionTag("invalid", (invalid) => {
      const updated =
        cancelInvalidMovement && session.movementResolution.kind !== "idle"
          ? scenarioSessionAfterRejectedMovement(session, invalid.session)
          : scenarioSessionWithBattleResult(session, invalid.session);
      return Either.isLeft(updated)
        ? {
            tag: "scenarioSessionConflict" as const,
            session,
            issue: updated.left,
          }
        : { ...invalid, session: updated.right };
    }),
    Match.exhaustive,
  );
}

function applyCall(session: ScenarioSession, call: SdkCallInput): AppliedCall {
  return Match.value(call).pipe(
    byOperation("scenarioRelation", ({ input }) => {
      const sourceId = scenarioTokenId(session, input.sourceId);
      const targetId = scenarioTokenId(session, input.targetId);
      const missingTokenId =
        sourceId === undefined ? input.sourceId : input.targetId;
      const result =
        sourceId === undefined || targetId === undefined
          ? {
              tag: "unknown-token" as const,
              tokenId: missingTokenId,
              message: `Scenario token ${missingTokenId} has no current placement.`,
            }
          : scenarioRelation({ session, sourceId, targetId });
      return {
        operation: "scenarioRelation" as const,
        session,
        result: jsonValue(result),
        value: result,
      };
    }),
    byOperation("discoverBattleActs", () => {
      const acts = scenarioBattleActs(session);
      return {
        operation: "discoverBattleActs" as const,
        session,
        result: jsonValue(acts),
        value: acts,
      };
    }),
    byOperation("resolveBattleRuntimeSubject", ({ input }) => {
      const subject = scenarioBattleSubject(session, input.subject);
      const battleFills = scenarioBattleFills(session, subject, input.fills);
      const projectedFills = scenarioObjectAttackFills({
        session,
        subject,
        fills: battleFills,
      });
      if (Either.isLeft(projectedFills)) {
        const result: ScenarioBattleResolutionResult = {
          tag: "invalid",
          session,
          reason: "invalidFill",
          message: projectedFills.left.message,
          snapshot: snapshotBattle(session.battle.state),
        };
        return {
          operation: "resolveBattleRuntimeSubject" as const,
          session,
          result: resolutionProjection(result),
          value: result,
        };
      }
      const attackProjectedFills = scenarioAttackTargetFills({
        session,
        subject,
        fills: projectedFills.right,
      });
      if (Either.isLeft(attackProjectedFills)) {
        const result: ScenarioBattleResolutionResult = {
          tag: "invalid",
          session,
          reason: "invalidFill",
          message: attackProjectedFills.left.message,
          snapshot: snapshotBattle(session.battle.state),
        };
        return {
          operation: "resolveBattleRuntimeSubject" as const,
          session,
          result: resolutionProjection(result),
          value: result,
        };
      }
      const tableSpatialProjectedFills = scenarioTableSpatialFactFills({
        session,
        subject,
        fills: attackProjectedFills.right,
      });
      if (Either.isLeft(tableSpatialProjectedFills)) {
        const result: ScenarioBattleResolutionResult = {
          tag: "invalid",
          session,
          reason: "invalidFill",
          message: tableSpatialProjectedFills.left.message,
          snapshot: snapshotBattle(session.battle.state),
        };
        return {
          operation: "resolveBattleRuntimeSubject" as const,
          session,
          result: resolutionProjection(result),
          value: result,
        };
      }
      const creatureSpellProjectedFills = scenarioCreatureSpellTargetFills({
        session,
        subject,
        fills: tableSpatialProjectedFills.right,
      });
      if (Either.isLeft(creatureSpellProjectedFills)) {
        const result: ScenarioBattleResolutionResult = {
          tag: "invalid",
          session,
          reason: "invalidFill",
          message: creatureSpellProjectedFills.left.message,
          snapshot: snapshotBattle(session.battle.state),
        };
        return {
          operation: "resolveBattleRuntimeSubject" as const,
          session,
          result: resolutionProjection(result),
          value: result,
        };
      }
      const preliminaryBattleResult =
        resolveBattleRuntimeSubjectWithTableD20TestCircumstances({
          session: session.battle,
          subject,
          fills: creatureSpellProjectedFills.right,
          d20TestResolutionId: scenarioD20TestResolutionId(session),
          tableD20TestCircumstanceDecisions:
            session.tableD20TestCircumstances.activeDecisions,
        });
      const preparation = scenarioD20TestCircumstancePreparation({
        session,
        subject,
        fills: creatureSpellProjectedFills.right,
        requests:
          preliminaryBattleResult.tag === "needsHoles"
            ? preliminaryBattleResult.d20TestCircumstanceRequests
            : [],
      });
      const battleResult =
        preparation.decisions.length ===
        session.tableD20TestCircumstances.activeDecisions.length
          ? preliminaryBattleResult
          : resolveBattleRuntimeSubjectWithTableD20TestCircumstances({
              session: session.battle,
              subject,
              fills: creatureSpellProjectedFills.right,
              d20TestResolutionId: scenarioD20TestResolutionId(session),
              tableD20TestCircumstanceDecisions: preparation.decisions,
            });
      const projectedBattleResult =
        scenarioBattleResultWithD20TestCircumstances({
          result: battleResult,
          decisions: preparation.decisions,
        });
      const retainedResult = retainScenarioBattlefield(
        session,
        projectedBattleResult,
      );
      const result = {
        ...retainedResult,
        session: scenarioSessionAfterD20TestCircumstanceResolution({
          session: retainedResult.session,
          state: preparation.state,
          resolutionTag: projectedBattleResult.tag,
        }),
      };
      return {
        operation: "resolveBattleRuntimeSubject" as const,
        session: result.session,
        result: resolutionProjection(result),
        value: result,
      };
    }),
    byOperation("resolveScenarioMovement", ({ input }) => {
      const planned =
        input.kind === "route"
          ? planScenarioMovement({ session, ...input })
          : continueScenarioMovement({ session, fills: input.fills });
      if (Either.isLeft(planned)) {
        const result: ScenarioBattleResolutionResult = {
          tag: "scenarioMovementRejected",
          session,
          message: planned.left.message,
        };
        return {
          operation: "resolveScenarioMovement" as const,
          session,
          result: resolutionProjection(result),
          value: result,
        };
      }
      const battleResult = resolveBattleRuntimeSubject({
        session: planned.right.session.battle,
        subject: planned.right.subject,
        fills: planned.right.fills,
      });
      const result = retainScenarioBattlefield(
        planned.right.session,
        battleResult,
        input.kind === "route",
      );
      return {
        operation: "resolveScenarioMovement" as const,
        session: result.session,
        result: resolutionProjection(result),
        value: result,
      };
    }),
    byOperation("resolveBattleRuntimeInterrupt", ({ input }) => {
      const battleResult = resolveBattleRuntimeInterrupt({
        session: session.battle,
        ...input,
      });
      const result = retainScenarioBattlefield(session, battleResult);
      return {
        operation: "resolveBattleRuntimeInterrupt" as const,
        session: result.session,
        result: resolutionProjection(result),
        value: result,
      };
    }),
    byOperation("endBattleRuntimeTurn", ({ input }) => {
      const fills = input.fills ?? [];
      const preliminaryBattleResult =
        endBattleRuntimeTurnWithTableD20TestCircumstances({
          session: session.battle,
          actorId: input.actorId,
          fills,
          d20TestResolutionId: scenarioD20TestResolutionId(session),
          tableD20TestCircumstanceDecisions:
            session.tableD20TestCircumstances.activeDecisions,
        });
      const subject = {
        tag: "runtimeCommand" as const,
        command: "endTurn" as const,
        actorId: input.actorId,
      };
      const preparation = scenarioD20TestCircumstancePreparation({
        session,
        subject,
        fills,
        requests:
          preliminaryBattleResult.tag === "needsHoles"
            ? preliminaryBattleResult.d20TestCircumstanceRequests
            : [],
      });
      const battleResult =
        preparation.decisions.length ===
        session.tableD20TestCircumstances.activeDecisions.length
          ? preliminaryBattleResult
          : endBattleRuntimeTurnWithTableD20TestCircumstances({
              session: session.battle,
              actorId: input.actorId,
              fills,
              d20TestResolutionId: scenarioD20TestResolutionId(session),
              tableD20TestCircumstanceDecisions: preparation.decisions,
            });
      const projectedBattleResult =
        scenarioBattleResultWithD20TestCircumstances({
          result: battleResult,
          decisions: preparation.decisions,
        });
      const retainedResult = retainScenarioBattlefield(
        session,
        projectedBattleResult,
      );
      const result = {
        ...retainedResult,
        session: scenarioSessionAfterD20TestCircumstanceResolution({
          session: retainedResult.session,
          state: preparation.state,
          resolutionTag: projectedBattleResult.tag,
        }),
      };
      return {
        operation: "endBattleRuntimeTurn" as const,
        session: result.session,
        result: resolutionProjection(result),
        value: result,
      };
    }),
    Match.exhaustive,
  );
}

function isAppliedCallForOperation<Operation extends SdkPlayerOperation>(
  operation: Operation,
  applied: AppliedCall,
): applied is Extract<AppliedCall, { readonly operation: Operation }> {
  return applied.operation === operation;
}

type ReplayResult =
  | {
      readonly tag: "ready";
      readonly transcriptHeaderSha256: string;
      readonly session: ScenarioSession;
      readonly calls: readonly SdkCallRecord[];
    }
  | {
      readonly tag: "obstructed";
      readonly owner: "characterComposition" | "setup";
      readonly obstruction: string;
      readonly calls: readonly [];
    };

async function replay(): Promise<ReplayResult> {
  const parsed = parseSdkTranscript(transcriptRecords());
  if (parsed.tag === "invalid") fail(parsed.message);
  if (
    sha256Text(readFileSync(charactersPath, "utf8")) !==
    parsed.value.header.charactersSha256
  ) {
    fail("Scenario character source hash diverged during replay.");
  }
  const characters = await evaluateScenarioCharacters(charactersPath);
  if (characters.tag === "invalid") fail(characters.message);
  if (parsed.value.header.characterOutcome === "obstructed") {
    if (
      characters.tag !== "obstructed" ||
      characters.obstruction !== parsed.value.header.obstruction ||
      canonicalJson(characters.observation) !==
        canonicalJson(parsed.value.header.characterObservation)
    ) {
      fail("Scenario character obstruction diverged during replay.");
    }
    return {
      tag: "obstructed",
      owner: "characterComposition",
      obstruction: characters.obstruction,
      calls: [],
    };
  }
  if (characters.tag === "obstructed") {
    fail("Scenario character composition diverged during replay.");
  }
  const characterSheets = jsonValue(characters.characterSheets);
  if (
    sha256Canonical(characterSheets) !==
      parsed.value.header.characterSheetsSha256 ||
    canonicalJson(characterSheets) !==
      canonicalJson(parsed.value.header.characterSheets) ||
    canonicalJson(characters.observation) !==
      canonicalJson(parsed.value.header.characterObservation)
  ) {
    fail("Scenario character composition diverged during replay.");
  }
  if (
    sha256Text(readFileSync(setupPath, "utf8")) !==
    parsed.value.header.setupSha256
  ) {
    fail("Scenario setup source hash diverged during replay.");
  }
  const initial = await evaluateScenarioSetup(
    setupPath,
    characters.characterSheets,
  );
  if (initial.tag === "invalid") fail(initial.message);
  if (parsed.value.header.setupOutcome === "obstructed") {
    if (
      initial.tag !== "obstructed" ||
      initial.obstruction !== parsed.value.header.obstruction ||
      canonicalJson(initial.observation) !==
        canonicalJson(parsed.value.header.setupObservation)
    ) {
      fail("Scenario setup obstruction diverged during replay.");
    }
    return {
      tag: "obstructed",
      owner: "setup",
      obstruction: initial.obstruction,
      calls: [],
    };
  }
  if (initial.tag === "obstructed") {
    fail("Scenario setup result diverged during replay.");
  }
  const initialSession = jsonValue(initial.session);
  if (
    sha256Canonical(initialSession) !==
      parsed.value.header.initialSessionSha256 ||
    canonicalJson(initialSession) !==
      canonicalJson(parsed.value.header.initialSession) ||
    canonicalJson(initial.observation) !==
      canonicalJson(parsed.value.header.setupObservation)
  ) {
    fail("Scenario setup result diverged during replay.");
  }
  const replayedInitialProjection = playerInitialTurnProjection({
    session: initialSession,
    acts: scenarioBattleActs(initial.session),
  });
  const projectionEvidence = sdkInitialTurnProjectionEvidence(
    parsed.value.header,
  );
  if (
    projectionEvidence.kind === "notRecorded" ||
    replayedInitialProjection.tag === "invalid" ||
    canonicalJson(replayedInitialProjection.projection) !==
      canonicalJson(projectionEvidence.projection)
  ) {
    fail("Initial player turn projection diverged during replay.");
  }
  let session = initial.session;
  for (const call of parsed.value.calls) {
    const cursorHash = sha256Canonical(jsonValue(session));
    const inputMatchesCursor = cursorHash === call.inputSessionSha256;
    const decoded = decodeSdkCallInput(call);
    if (decoded.tag === "invalid") {
      if (
        inputMatchesCursor &&
        call.outcome === "threw" &&
        call.rejection === "operationFailure" &&
        call.error.name === "Error" &&
        call.error.message === decoded.message
      ) {
        continue;
      }
      fail(decoded.message);
    }
    if (call.outcome === "threw" && call.rejection === "sessionConflict") {
      if (
        inputMatchesCursor ||
        call.error.name !== "Error" ||
        call.error.message !== SDK_SESSION_CONFLICT_MESSAGE
      ) {
        fail(`SDK replay adapter error diverged at call ${call.seq}.`);
      }
      continue;
    }
    if (!inputMatchesCursor) {
      fail(`SDK replay input lineage diverged at call ${call.seq}.`);
    }
    try {
      const actual = applyCall(session, decoded.value);
      if (call.outcome === "threw") {
        fail(`SDK replay expected call ${call.seq} to throw.`);
      }
      if (
        cursorHash !== call.inputSessionSha256 ||
        sha256Canonical(jsonValue(actual.session)) !== call.outputSessionSha256
      ) {
        fail(`SDK replay session lineage diverged at call ${call.seq}.`);
      }
      const actualHash = sha256Canonical(actual.result);
      if (actualHash !== call.resultSha256) {
        fail(
          `SDK replay diverged at call ${call.seq} (${call.operation}): expected ${call.resultSha256}, received ${actualHash}.`,
        );
      }
      session = actual.session;
    } catch (error) {
      if (call.outcome !== "threw") throw error;
      const actual =
        error instanceof Error
          ? { name: error.name || "Error", message: error.message }
          : { name: "Error", message: String(error) };
      if (
        actual.name !== call.error.name ||
        actual.message !== call.error.message
      ) {
        fail(`SDK replay error diverged at call ${call.seq}.`);
      }
    }
  }
  return {
    tag: "ready",
    transcriptHeaderSha256: sha256Canonical(parsed.value.header),
    session,
    calls: parsed.value.calls,
  };
}

function appendFrozenContinuation(prefix: FrozenPrefix, body: string): number {
  const continuation = prefix.continuationCount + 1;
  const name = `continuation${String(continuation).padStart(4, "0")}`;
  appendFileSync(
    programPath,
    `\nexport const ${name}: PlayerContinuation = async (context) => {\n${body}\n};\n`,
  );
  const program = readFileSync(programPath, "utf8");
  atomicJson(prefixPath, {
    frozenByteLength: Buffer.byteLength(program),
    frozenSha256: sha256Text(program),
    continuationCount: continuation,
    run: { kind: "active" },
  } satisfies FrozenPrefix);
  return continuation;
}

function typecheckSubmission(
  submissionPathForTypecheck: string,
  submissionConfigPath: string,
): void {
  const compiler = resolve("tooling/typescript/bin/tsc");
  const result = spawnSync(
    process.execPath,
    [
      "--permission",
      `--allow-fs-read=${resolve("tooling")}`,
      `--allow-fs-read=${resolve("declarations")}`,
      `--allow-fs-read=${dirname(submissionPathForTypecheck)}`,
      compiler,
      "--noEmit",
      "-p",
      submissionConfigPath,
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );
  if (result.error !== undefined) throw result.error;
  if (result.signal !== null) fail(`TypeScript stopped by ${result.signal}.`);
  if (result.status !== 0) {
    fail(`Continuation did not typecheck:\n${result.stdout}${result.stderr}`);
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateOutcome(
  value: unknown,
  currentSession: ScenarioSession,
): PlayerContinuationOutcome {
  if (!isRecord(value)) {
    fail("Continuation must return a PlayerContinuationOutcome.");
  }
  const candidate = value;
  if (candidate.session !== currentSession) {
    fail("Continuation must return the supervisor's current SDK session.");
  }
  if (typeof candidate.tacticalNote !== "string") {
    fail("Continuation tacticalNote must be a string.");
  }
  if (candidate.kind === "continue") {
    return {
      kind: "continue",
      session: currentSession,
      tacticalNote: candidate.tacticalNote,
    };
  }
  if (
    candidate.kind === "playerConcluded" &&
    typeof candidate.conclusion === "string" &&
    candidate.conclusion.length > 0 &&
    candidate.conclusion === candidate.conclusion.trim()
  ) {
    return {
      kind: "playerConcluded",
      session: currentSession,
      tacticalNote: candidate.tacticalNote,
      conclusion: candidate.conclusion,
    };
  }
  return fail("Continuation outcome kind or conclusion is invalid.");
}

function retainedPlayerObservation(): unknown | undefined {
  if (existsSync(observationsPath)) {
    const lines = readFileSync(observationsPath, "utf8").trim().split("\n");
    const last = lines.at(-1);
    if (last !== undefined && last.length > 0) return JSON.parse(last);
  }
  return existsSync(latestObservationPath)
    ? JSON.parse(readFileSync(latestObservationPath, "utf8"))
    : undefined;
}

function tacticalNoteBeforeContinuation(): string {
  const observation = retainedPlayerObservation();
  if (observation === undefined) return "";
  if (!isRecord(observation) || typeof observation.tacticalNote !== "string") {
    fail("Retained player observation has no tactical note.");
  }
  return observation.tacticalNote;
}

async function runSubmittedSource(source: string): Promise<unknown> {
  if (existsSync(observationPublicationFailurePath)) {
    fail("Player observation publication previously failed.");
  }
  const prefix = verifyFrozenPrefix();
  const admission = playerContinuationAdmission(prefix.continuationCount);
  if (admission.tag === "limitReached") {
    const obstruction = {
      kind: "continuationLimit" as const,
      limit: admission.limit,
      message: `Player continuation limit ${String(admission.limit)} reached.`,
    };
    atomicJson(prefixPath, {
      ...prefix,
      run: { kind: "playerObstructed", obstruction },
    } satisfies FrozenPrefix);
    fail(obstruction.message);
  }
  const authored = authoredAttemptBody(source);
  if (authored.tag === "invalid") fail(authored.message);
  mkdirSync(submissionsPath, { recursive: true });
  const submissionDirectory = resolve(
    submissionsPath,
    `continuation-${String(prefix.continuationCount + 1).padStart(4, "0")}-${randomUUID()}`,
  );
  mkdirSync(submissionDirectory);
  const submissionPath = resolve(submissionDirectory, "attempt.ts");
  const submissionConfigPath = resolve(submissionDirectory, "tsconfig.json");
  const submissionConfig: unknown = JSON.parse(
    readFileSync(resolve("tsconfig.json"), "utf8"),
  );
  if (!isRecord(submissionConfig)) fail("Player tsconfig must be an object.");
  writeFileSync(
    submissionConfigPath,
    `${JSON.stringify({ ...submissionConfig, include: ["attempt.ts"] }, null, 2)}\n`,
  );
  writeFileSync(submissionPath, source, { flag: "wx" });
  const typecheckStarted = performance.now();
  try {
    typecheckSubmission(submissionPath, submissionConfigPath);
  } catch (error) {
    renameSync(submissionDirectory, `${submissionDirectory}.rejected`);
    throw error;
  }
  const typecheckMilliseconds = performance.now() - typecheckStarted;
  const replayStarted = performance.now();
  const replayed = await replay();
  const replayMilliseconds = performance.now() - replayStarted;
  if (replayed.tag === "obstructed") fail(replayed.obstruction);
  let currentSession = replayed.session;
  const continuationInputSession = jsonValue(currentSession);
  let frozenContinuation: number | undefined;
  let nextSeq = replayed.calls.length + 1;
  const continuationCalls: SdkCallRecord[] = [];
  let sdkExecutionMilliseconds = 0;
  let evidenceWritingMilliseconds = 0;
  let observationCommitted = false;
  const appendSupervisorTiming = (continuation: number): void => {
    appendFileSync(
      supervisorTimingsPath,
      `${JSON.stringify({
        schemaVersion: 1,
        transcriptHeaderSha256: replayed.transcriptHeaderSha256,
        continuation,
        phases: {
          continuationTypecheckMilliseconds: Math.round(typecheckMilliseconds),
          priorCallVerificationReplayMilliseconds:
            Math.round(replayMilliseconds),
          newSdkExecutionMilliseconds: Math.round(sdkExecutionMilliseconds),
          evidenceWritingMilliseconds: Math.round(evidenceWritingMilliseconds),
        },
      } satisfies SupervisorTimingRecord)}\n`,
    );
  };

  const recordedCall = (
    operation: SdkPlayerOperation,
    suppliedSession: ScenarioSession,
    sessionIsCurrent: boolean,
    input: unknown,
    invoke: () => AppliedCall,
  ): AppliedCall => {
    frozenContinuation ??= appendFrozenContinuation(prefix, authored.body);
    const inputSession = jsonValue(suppliedSession);
    const inputSessionSha256 = sha256Canonical(inputSession);
    const appendRecord = (record: SdkCallRecord): void => {
      const evidenceStarted = performance.now();
      appendFileSync(transcriptPath, `${JSON.stringify(record)}\n`);
      evidenceWritingMilliseconds += performance.now() - evidenceStarted;
      continuationCalls.push(record);
      nextSeq += 1;
    };
    const invoked = (() => {
      const executionStarted = performance.now();
      try {
        const result = invoke();
        sdkExecutionMilliseconds += performance.now() - executionStarted;
        return result;
      } catch (error) {
        sdkExecutionMilliseconds += performance.now() - executionStarted;
        const caught =
          error instanceof Error ? error : new Error(String(error));
        appendRecord({
          type: "sdk-call",
          seq: nextSeq,
          continuation: frozenContinuation,
          operation,
          inputSession,
          inputSessionSha256,
          input: jsonValue(input),
          outcome: "threw",
          rejection: sessionIsCurrent ? "operationFailure" : "sessionConflict",
          error: { name: caught.name || "Error", message: caught.message },
        });
        throw error;
      }
    })();
    currentSession = invoked.session;
    const outputSession = jsonValue(currentSession);
    const result = invoked.result;
    const record: SdkCallRecord = {
      type: "sdk-call",
      seq: nextSeq,
      continuation: frozenContinuation,
      operation,
      inputSession,
      inputSessionSha256,
      input: jsonValue(input),
      outcome: "returned",
      outputSession,
      outputSessionSha256: sha256Canonical(outputSession),
      result,
      resultSha256: sha256Canonical(result),
    };
    appendRecord(record);
    return invoked;
  };

  try {
    const call = (
      operation: SdkPlayerOperation,
      suppliedSession: ScenarioSession,
      input: unknown,
    ): AppliedCall => {
      const canonical = canonicalSdkCallInput({ operation, input });
      const sessionIsCurrent =
        sha256Canonical(jsonValue(suppliedSession)) ===
        sha256Canonical(jsonValue(currentSession));
      return recordedCall(
        operation,
        suppliedSession,
        sessionIsCurrent,
        canonical.input,
        () => {
          if (!sessionIsCurrent) {
            fail(SDK_SESSION_CONFLICT_MESSAGE);
          }
          if (canonical.tag === "invalid") fail(canonical.message);
          const applied = applyCall(currentSession, canonical.value);
          if (!isAppliedCallForOperation(operation, applied)) {
            fail(`SDK operation ${operation} produced a mismatched result.`);
          }
          return applied;
        },
      );
    };
    const sdk: PlayerSdk = {
      scenarioRelation: ({ session, ...input }) => {
        const applied = call("scenarioRelation", session, input);
        return applied.operation === "scenarioRelation"
          ? applied.value
          : fail("Scenario relation returned a mismatched SDK result.");
      },
      discoverBattleActs: (session) => {
        const applied = call("discoverBattleActs", session, {});
        return applied.operation === "discoverBattleActs"
          ? applied.value
          : fail("Battle discovery returned a mismatched SDK result.");
      },
      resolveBattleRuntimeSubject: ({ session, ...input }) => {
        const applied = call("resolveBattleRuntimeSubject", session, input);
        return applied.operation === "resolveBattleRuntimeSubject"
          ? applied.value
          : fail("Battle subject resolution returned a mismatched SDK result.");
      },
      resolveScenarioMovement: ({ session, ...input }) => {
        const applied = call("resolveScenarioMovement", session, input);
        return applied.operation === "resolveScenarioMovement"
          ? applied.value
          : fail("Scenario movement returned a mismatched SDK result.");
      },
      resolveBattleRuntimeInterrupt: ({ session, ...input }) => {
        const applied = call("resolveBattleRuntimeInterrupt", session, input);
        return applied.operation === "resolveBattleRuntimeInterrupt"
          ? applied.value
          : fail(
              "Battle interrupt resolution returned a mismatched SDK result.",
            );
      },
      endBattleRuntimeTurn: ({ session, ...input }) => {
        const applied = call("endBattleRuntimeTurn", session, input);
        return applied.operation === "endBattleRuntimeTurn"
          ? applied.value
          : fail("Battle turn completion returned a mismatched SDK result.");
      },
    };
    const submitted: unknown = await import(
      `${pathToFileURL(submissionPath).href}?${randomUUID()}`
    );
    if (
      !isRecord(submitted) ||
      typeof submitted.continueBattle !== "function"
    ) {
      fail("Continuation must export continueBattle.");
    }
    const outcome = validateOutcome(
      await submitted.continueBattle({ session: currentSession, sdk }),
      currentSession,
    );
    if (frozenContinuation === undefined) {
      fail("Continuation made no observable SDK call and remains editable.");
    }
    const projected = playerCurrentTurnProjection({
      continuation: frozenContinuation,
      calls: continuationCalls,
      beforeSession: continuationInputSession,
      afterSession: jsonValue(currentSession),
      tacticalNote: outcome.tacticalNote,
    });
    if (projected.tag === "invalid") fail(projected.message);
    const observation = {
      transcriptHeaderSha256: replayed.transcriptHeaderSha256,
      continuation: frozenContinuation,
      kind: outcome.kind,
      projection: projected.projection,
      tacticalNote: outcome.tacticalNote,
      ...(outcome.kind === "playerConcluded"
        ? { conclusion: outcome.conclusion }
        : {}),
    };
    const observationWritingStarted = performance.now();
    atomicAppendJsonLine(observationsPath, observation);
    observationCommitted = true;
    publishLatestPlayerObservation(observation);
    if (outcome.kind === "playerConcluded") {
      const completedPrefix = readPrefix();
      atomicJson(prefixPath, {
        ...completedPrefix,
        run: { kind: "playerConcluded", conclusion: outcome.conclusion },
      } satisfies FrozenPrefix);
      atomicJson(finalPath, observation);
    }
    evidenceWritingMilliseconds +=
      performance.now() - observationWritingStarted;
    appendSupervisorTiming(frozenContinuation);
    console.log(JSON.stringify(observation, null, 2));
    return observation;
  } catch (error) {
    if (frozenContinuation !== undefined && !observationCommitted) {
      const tacticalNote = tacticalNoteBeforeContinuation();
      const projected = playerCurrentTurnProjection({
        continuation: frozenContinuation,
        calls: continuationCalls,
        beforeSession: continuationInputSession,
        afterSession: jsonValue(currentSession),
        tacticalNote,
      });
      const message = error instanceof Error ? error.message : String(error);
      const observation = Match.value(projected).pipe(
        Match.when({ tag: "valid" }, ({ projection }) => ({
          transcriptHeaderSha256: replayed.transcriptHeaderSha256,
          continuation: frozenContinuation,
          kind: "executionError" as const,
          message,
          projection,
          tacticalNote,
        })),
        Match.when({ tag: "invalid" }, (projectionIssue) => ({
          transcriptHeaderSha256: replayed.transcriptHeaderSha256,
          continuation: frozenContinuation,
          kind: "executionError" as const,
          message,
          projectionIssue,
          tacticalNote,
        })),
        Match.exhaustive,
      );
      const observationWritingStarted = performance.now();
      atomicAppendJsonLine(observationsPath, observation);
      observationCommitted = true;
      publishLatestPlayerObservation(observation);
      evidenceWritingMilliseconds +=
        performance.now() - observationWritingStarted;
      appendSupervisorTiming(frozenContinuation);
    }
    throw error;
  }
}

async function serveRequests(
  requestsDirectoryInput: string,
  responsesDirectoryInput: string,
): Promise<never> {
  const requestsDirectory = resolve(requestsDirectoryInput);
  const responsesDirectory = resolve(responsesDirectoryInput);
  while (true) {
    const requestNames = readdirSync(requestsDirectory)
      .filter((name) => name.endsWith(".request.json"))
      .sort();
    for (const requestName of requestNames) {
      const requestPath = resolve(requestsDirectory, requestName);
      const responseName = requestName.replace(
        /\.request\.json$/,
        ".response.json",
      );
      const responsePath = resolve(responsesDirectory, responseName);
      const request: unknown = (() => {
        try {
          return JSON.parse(readFileSync(requestPath, "utf8"));
        } catch {
          return undefined;
        }
      })();
      const continuationCountBeforeRequest = readPrefix().continuationCount;
      const response = await (async (): Promise<unknown> => {
        if (
          !isRecord(request) ||
          typeof request.requestId !== "string" ||
          typeof request.source !== "string" ||
          typeof request.expectedObservationSha256 !== "string" ||
          !/^[0-9a-f]{64}$/.test(request.expectedObservationSha256)
        ) {
          return { tag: "error", message: "Player request is invalid." };
        }
        if (
          request.expectedObservationSha256 !==
          sha256Text(readFileSync(playerPublishedObservationPath, "utf8"))
        ) {
          return {
            tag: "error",
            message:
              "Player request does not follow the latest published observation.",
          };
        }
        const attemptPath = resolve(playerRoot, "attempt.ts");
        if (readFileSync(attemptPath, "utf8") !== request.source) {
          return { tag: "error", message: "Player request source is stale." };
        }
        try {
          return {
            tag: "ok",
            observation: await runSubmittedSource(request.source),
          };
        } catch (error) {
          const terminalState = readPrefix().run;
          if (terminalState.kind === "playerObstructed") {
            return {
              tag: "terminalObstruction",
              obstruction: terminalState.obstruction,
            };
          }
          const continuationWasRecorded =
            readPrefix().continuationCount > continuationCountBeforeRequest;
          const observation = continuationWasRecorded
            ? retainedPlayerObservation()
            : undefined;
          return {
            tag: "error",
            message: error instanceof Error ? error.message : String(error),
            ...(observation === undefined ? {} : { observation }),
          };
        }
      })();
      if (
        readPrefix().continuationCount > continuationCountBeforeRequest &&
        isRecord(response) &&
        isRecord(response.observation)
      ) {
        atomicJson(playerResponsePath, response);
        atomicJson(playerPublishedObservationPath, response);
      }
      exclusiveJson(responsePath, response);
      renameSync(requestPath, `${requestPath}.processed`);
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 50));
  }
}

async function main(args: readonly string[]): Promise<void> {
  const [command, ...rest] = args;
  if (command === "init") {
    const [
      scenarioId,
      gitSha,
      consumerIsolation,
      startedAtInput,
      replaySupervisorSha256,
      scenarioSha256,
      scenarioReviewSha256,
      ...unexpected
    ] = rest;
    if (
      scenarioId === undefined ||
      gitSha === undefined ||
      (consumerIsolation !== "permissionProfile" &&
        consumerIsolation !== "instructionalFallback") ||
      startedAtInput === undefined ||
      replaySupervisorSha256 === undefined ||
      !/^[0-9a-f]{64}$/.test(replaySupervisorSha256) ||
      scenarioSha256 === undefined ||
      !/^[0-9a-f]{64}$/.test(scenarioSha256) ||
      scenarioReviewSha256 === undefined ||
      !/^[0-9a-f]{64}$/.test(scenarioReviewSha256) ||
      unexpected.length > 0
    ) {
      fail(
        "Usage: supervisor.mjs init <scenario-id> <git-sha> <permissionProfile|instructionalFallback> <started-at> <replay-supervisor-sha256> <scenario-sha256> <scenario-review-sha256>",
      );
    }
    const startedAt =
      Schema.decodeUnknownEither(StartedAtSchema)(startedAtInput);
    if (Either.isLeft(startedAt)) {
      fail(`Invalid started-at authority: ${startedAt.left.message}`);
    }
    await initialize(
      scenarioId,
      gitSha,
      consumerIsolation,
      startedAt.right,
      replaySupervisorSha256,
      scenarioSha256,
      scenarioReviewSha256,
    );
    return;
  }
  if (command === "attempt") {
    const [attemptPath, ...unexpected] = rest;
    if (attemptPath === undefined || unexpected.length > 0) {
      fail("Usage: supervisor.mjs attempt <attempt.ts>");
    }
    await runSubmittedSource(readFileSync(resolve(attemptPath), "utf8"));
    return;
  }
  if (command === "replay" && rest.length === 0) {
    const replayed = await replay();
    console.log(
      Match.value(replayed).pipe(
        Match.when(
          { tag: "ready" },
          ({ calls }) =>
            `SDK player replay deterministic: ${calls.length} call(s) matched.`,
        ),
        Match.when(
          { tag: "obstructed", owner: "characterComposition" },
          ({ obstruction }) =>
            `SDK character-composition obstruction replay deterministic: ${obstruction}`,
        ),
        Match.when(
          { tag: "obstructed", owner: "setup" },
          ({ obstruction }) =>
            `SDK setup obstruction replay deterministic: ${obstruction}`,
        ),
        Match.exhaustive,
      ),
    );
    return;
  }
  if (command === "serve") {
    const [requestsDirectory, responsesDirectory, ...unexpected] = rest;
    if (
      requestsDirectory === undefined ||
      responsesDirectory === undefined ||
      unexpected.length > 0
    ) {
      fail(
        "Usage: supervisor.mjs serve <requests-directory> <responses-directory>",
      );
    }
    await serveRequests(requestsDirectory, responsesDirectory);
  }
  fail("Usage: supervisor.mjs <init|attempt|replay|serve> ...");
}

await main(process.argv.slice(2));
