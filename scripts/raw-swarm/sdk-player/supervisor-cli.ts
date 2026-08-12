import { spawnSync } from "node:child_process";
import { constants } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import {
  appendFileSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  BattleSnapshotSchema,
  discoverBattleActs,
  endBattleRuntimeTurn,
  resolveBattleRuntimeInterrupt,
  resolveBattleRuntimeSubject,
  type BattleRuntimeResolutionResult,
  type BattleRuntimeSession,
} from "../../../packages/battle-runtime/src/index.ts";
import { Either, Match, Schema } from "effect";

import type {
  JsonValue,
  PlayerContinuation,
  PlayerContinuationOutcome,
  PlayerSdk,
} from "./continuation-contract.ts";
import { authoredAttemptBody } from "./attempt-source.ts";
import { tracerScenarioSession, TRACER_SCENARIO_ID } from "./fixed-scenario.ts";
import { decodeSdkCallInput, type SdkCallInput } from "./sdk-replay-input.ts";
import {
  parseSdkTranscript,
  SDK_SESSION_CONFLICT_MESSAGE,
  type SdkCallRecord,
  type SdkPlayerOperation,
} from "./sdk-transcript.ts";
import { canonicalJson, sha256Canonical } from "../transcript.ts";

const transcriptPath = resolve("evidence/sdk-calls.jsonl");
const programPath = resolve("evidence/program.ts");
const prefixPath = resolve("evidence/frozen-prefix.json");
const observationsPath = resolve("evidence/observations.jsonl");
const latestObservationPath = resolve("OBSERVATION.json");
const finalPath = resolve("evidence/final.json");
const playerRoot = resolve(process.env.RAW_SWARM_PLAYER_ROOT ?? process.cwd());
const submissionsPath = resolve("submissions");

const HashSchema = Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/));
const NonNegativeIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
);
const PrefixSchema = Schema.Struct({
  frozenByteLength: NonNegativeIntegerSchema,
  frozenSha256: HashSchema,
  continuationCount: NonNegativeIntegerSchema,
  run: Schema.Union(
    Schema.Struct({ kind: Schema.Literal("active") }),
    Schema.Struct({
      kind: Schema.Literal("playerConcluded"),
      conclusion: Schema.NonEmptyTrimmedString,
    }),
  ),
});
type FrozenPrefix = Schema.Schema.Type<typeof PrefixSchema>;

const PROGRAM_PREFIX = `import type { PlayerContinuation } from "@dnd/player-sdk";
`;

function fail(message: string): never {
  throw new Error(message);
}

function sha256Bytes(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function jsonValue(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(jsonValue);
  if (value instanceof Map) {
    const entries = [...value.entries()]
      .map(([key, entry]) => [jsonValue(key), jsonValue(entry)] as const)
      .sort(([left], [right]) =>
        canonicalJson(left).localeCompare(canonicalJson(right)),
      );
    return { $map: entries };
  }
  if (value instanceof Set) {
    return {
      $set: [...value.values()]
        .map(jsonValue)
        .sort((left, right) =>
          canonicalJson(left).localeCompare(canonicalJson(right)),
        ),
    };
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, jsonValue(entry)]),
    );
  }
  return fail("SDK evidence contains a non-JSON execution value.");
}

function atomicJson(path: string, value: unknown): void {
  const temporaryPath = `${path}.next`;
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporaryPath, path);
}

function exclusiveJson(path: string, value: unknown): void {
  const descriptor = openSync(
    path,
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
  const hash = sha256Bytes(program);
  if (byteLength !== prefix.frozenByteLength || hash !== prefix.frozenSha256) {
    fail("Previously observed SDK program source was modified.");
  }
  if (prefix.run.kind === "playerConcluded") {
    fail(`Player has already concluded its run: ${prefix.run.conclusion}`);
  }
  return prefix;
}

function initialize(
  scenarioId: string,
  gitSha: string,
  consumerIsolation: string,
  replaySupervisorSha256: string,
): void {
  if (scenarioId !== TRACER_SCENARIO_ID) {
    fail(`Unsupported tracer scenario: ${scenarioId}`);
  }
  if (existsSync(transcriptPath)) fail("SDK player evidence already exists.");
  mkdirSync(resolve("evidence"), { recursive: true });
  const program = PROGRAM_PREFIX;
  writeFileSync(programPath, program, "utf8");
  atomicJson(prefixPath, {
    frozenByteLength: Buffer.byteLength(program),
    frozenSha256: sha256Bytes(program),
    continuationCount: 0,
    run: { kind: "active" },
  } satisfies FrozenPrefix);
  appendFileSync(
    transcriptPath,
    `${JSON.stringify({
      type: "sdk-player-header",
      scenarioId,
      gitSha,
      startedAt: new Date().toISOString(),
      consumerIsolation,
      replaySupervisorSha256,
    })}\n`,
  );
}

function transcriptRecords(): readonly unknown[] {
  return readFileSync(transcriptPath, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line): unknown => JSON.parse(line));
}

function resolutionProjection(result: BattleRuntimeResolutionResult): unknown {
  const { snapshot, ...outcome } = result;
  return jsonValue({
    ...outcome,
    snapshot: Schema.encodeSync(BattleSnapshotSchema)(snapshot),
  });
}

type AppliedCall = {
  readonly session: BattleRuntimeSession;
  readonly result: unknown;
  readonly value: unknown;
};

const byOperation = Match.discriminator("operation");

function applyCall(
  session: BattleRuntimeSession,
  call: SdkCallInput,
): AppliedCall {
  return Match.value(call).pipe(
    byOperation("discoverBattleActs", () => {
      const acts = discoverBattleActs(session);
      return { session, result: jsonValue(acts), value: acts };
    }),
    byOperation("resolveBattleRuntimeSubject", ({ input }) => {
      const result = resolveBattleRuntimeSubject({ session, ...input });
      return {
        session: result.session,
        result: resolutionProjection(result),
        value: result,
      };
    }),
    byOperation("resolveBattleRuntimeInterrupt", ({ input }) => {
      const result = resolveBattleRuntimeInterrupt({ session, ...input });
      return {
        session: result.session,
        result: resolutionProjection(result),
        value: result,
      };
    }),
    byOperation("endBattleRuntimeTurn", ({ input }) => {
      const result = endBattleRuntimeTurn({ session, ...input });
      return {
        session: result.session,
        result: resolutionProjection(result),
        value: result,
      };
    }),
    Match.exhaustive,
  );
}

function replay(): {
  readonly session: BattleRuntimeSession;
  readonly calls: readonly SdkCallRecord[];
} {
  const parsed = parseSdkTranscript(transcriptRecords());
  if (parsed.tag === "invalid") fail(parsed.message);
  const initial = tracerScenarioSession();
  if (initial.tag === "invalid") fail(initial.message);
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
  return { session, calls: parsed.value.calls };
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
    frozenSha256: sha256Bytes(program),
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

function isJsonValue(
  value: unknown,
  ancestors: WeakSet<object> = new WeakSet(),
): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object" || value === null) return false;
  if (ancestors.has(value)) return false;
  ancestors.add(value);
  const arrayKeys = Array.isArray(value) ? Object.keys(value) : [];
  const valid = Array.isArray(value)
    ? Object.getOwnPropertySymbols(value).length === 0 &&
      arrayKeys.length === value.length &&
      arrayKeys.every((key) => {
        const index = Number(key);
        return (
          Number.isInteger(index) &&
          index >= 0 &&
          index < 2 ** 32 - 1 &&
          String(index) === key
        );
      }) &&
      Array.from({ length: value.length }, (_, index) => index).every(
        (index) =>
          Object.prototype.hasOwnProperty.call(value, index) &&
          isJsonValue(value[index], ancestors),
      )
    : (Object.getPrototypeOf(value) === Object.prototype ||
        Object.getPrototypeOf(value) === null) &&
      Object.getOwnPropertySymbols(value).length === 0 &&
      Object.values(value).every((entry) => isJsonValue(entry, ancestors));
  ancestors.delete(value);
  return valid;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateOutcome(
  value: unknown,
  currentSession: BattleRuntimeSession,
): PlayerContinuationOutcome {
  if (!isRecord(value)) {
    fail("Continuation must return a PlayerContinuationOutcome.");
  }
  const candidate = value;
  if (candidate.session !== currentSession) {
    fail("Continuation must return the supervisor's current SDK session.");
  }
  if (!isJsonValue(candidate.observation)) {
    fail("Continuation observation must be JSON data.");
  }
  if (candidate.kind === "continue") {
    return {
      kind: "continue",
      session: currentSession,
      observation: candidate.observation,
    };
  }
  if (
    candidate.kind === "playerConcluded" &&
    typeof candidate.conclusion === "string" &&
    candidate.conclusion.trim().length > 0
  ) {
    return {
      kind: "playerConcluded",
      session: currentSession,
      observation: candidate.observation,
      conclusion: candidate.conclusion,
    };
  }
  return fail("Continuation outcome kind or conclusion is invalid.");
}

async function runSubmittedSource(source: string): Promise<unknown> {
  const prefix = verifyFrozenPrefix();
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
  const submissionConfig = JSON.parse(
    readFileSync(resolve("tsconfig.json"), "utf8"),
  ) as Readonly<Record<string, unknown>>;
  writeFileSync(
    submissionConfigPath,
    `${JSON.stringify({ ...submissionConfig, include: ["attempt.ts"] }, null, 2)}\n`,
  );
  writeFileSync(submissionPath, source, { flag: "wx" });
  try {
    typecheckSubmission(submissionPath, submissionConfigPath);
  } catch (error) {
    renameSync(submissionDirectory, `${submissionDirectory}.rejected`);
    throw error;
  }
  const replayed = replay();
  let currentSession = replayed.session;
  let frozenContinuation: number | undefined;
  let nextSeq = replayed.calls.length + 1;

  const recordedCall = <A>(
    operation: SdkPlayerOperation,
    suppliedSession: BattleRuntimeSession,
    sessionIsCurrent: boolean,
    input: unknown,
    invoke: () => { readonly value: A; readonly applied: AppliedCall },
  ): A => {
    frozenContinuation ??= appendFrozenContinuation(prefix, authored.body);
    const inputSession = jsonValue(suppliedSession);
    const inputSessionSha256 = sha256Canonical(inputSession);
    const appendRecord = (record: SdkCallRecord): void => {
      appendFileSync(transcriptPath, `${JSON.stringify(record)}\n`);
      nextSeq += 1;
    };
    let invoked: ReturnType<typeof invoke>;
    try {
      invoked = invoke();
    } catch (error) {
      const caught = error instanceof Error ? error : new Error(String(error));
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
    currentSession = invoked.applied.session;
    const outputSession = jsonValue(currentSession);
    const result = jsonValue(invoked.applied.result);
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
    return invoked.value;
  };

  try {
    const call = <A>(
      operation: SdkPlayerOperation,
      suppliedSession: BattleRuntimeSession,
      input: unknown,
    ): A => {
      const sessionIsCurrent =
        sha256Canonical(jsonValue(suppliedSession)) ===
        sha256Canonical(jsonValue(currentSession));
      return recordedCall(
        operation,
        suppliedSession,
        sessionIsCurrent,
        input,
        () => {
          if (!sessionIsCurrent) {
            fail(SDK_SESSION_CONFLICT_MESSAGE);
          }
          const decoded = decodeSdkCallInput({ operation, input });
          if (decoded.tag === "invalid") fail(decoded.message);
          const applied = applyCall(currentSession, decoded.value);
          return { value: applied.value as A, applied };
        },
      );
    };
    const sdk: PlayerSdk = {
      discoverBattleActs: (session) => call("discoverBattleActs", session, {}),
      resolveBattleRuntimeSubject: ({ session, ...input }) =>
        call("resolveBattleRuntimeSubject", session, input),
      resolveBattleRuntimeInterrupt: ({ session, ...input }) =>
        call("resolveBattleRuntimeInterrupt", session, input),
      endBattleRuntimeTurn: ({ session, ...input }) =>
        call("endBattleRuntimeTurn", session, input),
    };
    const submitted = (await import(
      `${pathToFileURL(submissionPath).href}?${randomUUID()}`
    )) as Readonly<{ continueBattle?: PlayerContinuation }>;
    if (typeof submitted.continueBattle !== "function") {
      fail("Continuation must export continueBattle.");
    }
    const outcome = validateOutcome(
      await submitted.continueBattle({ session: currentSession, sdk }),
      currentSession,
    );
    if (frozenContinuation === undefined) {
      fail("Continuation made no observable SDK call and remains editable.");
    }
    const observation = {
      continuation: frozenContinuation,
      kind: outcome.kind,
      observation: outcome.observation,
      ...(outcome.kind === "playerConcluded"
        ? { conclusion: outcome.conclusion }
        : {}),
    };
    appendFileSync(observationsPath, `${JSON.stringify(observation)}\n`);
    atomicJson(latestObservationPath, observation);
    if (outcome.kind === "playerConcluded") {
      const completedPrefix = readPrefix();
      atomicJson(prefixPath, {
        ...completedPrefix,
        run: { kind: "playerConcluded", conclusion: outcome.conclusion },
      } satisfies FrozenPrefix);
      atomicJson(finalPath, observation);
    }
    console.log(JSON.stringify(observation, null, 2));
    return observation;
  } catch (error) {
    if (frozenContinuation !== undefined) {
      const observation = {
        continuation: frozenContinuation,
        kind: "executionError",
        message: error instanceof Error ? error.message : String(error),
      };
      appendFileSync(observationsPath, `${JSON.stringify(observation)}\n`);
      atomicJson(latestObservationPath, observation);
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
      const request = JSON.parse(readFileSync(requestPath, "utf8")) as unknown;
      const response = await (async (): Promise<unknown> => {
        if (
          !isRecord(request) ||
          typeof request.requestId !== "string" ||
          typeof request.source !== "string"
        ) {
          return { tag: "error", message: "Player request is invalid." };
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
          return {
            tag: "error",
            message: error instanceof Error ? error.message : String(error),
          };
        }
      })();
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
      replaySupervisorSha256,
      ...unexpected
    ] = rest;
    if (
      scenarioId === undefined ||
      gitSha === undefined ||
      (consumerIsolation !== "permissionProfile" &&
        consumerIsolation !== "instructionalFallback") ||
      replaySupervisorSha256 === undefined ||
      !/^[0-9a-f]{64}$/.test(replaySupervisorSha256) ||
      unexpected.length > 0
    ) {
      fail(
        "Usage: supervisor.mjs init <scenario-id> <git-sha> <permissionProfile|instructionalFallback> <replay-supervisor-sha256>",
      );
    }
    initialize(scenarioId, gitSha, consumerIsolation, replaySupervisorSha256);
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
    const replayed = replay();
    console.log(
      `SDK player replay deterministic: ${replayed.calls.length} call(s) matched.`,
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
