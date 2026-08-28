import { fileURLToPath } from "node:url";

import { Effect, Either, Exit, Match, Stream } from "effect";

import {
  loadOracleApplicationFromExecutable,
  type OracleApplication,
  type OracleDistributionLoadIssue,
} from "./oracle-distribution.ts";
import { encodeOracleIdentityResponseJson } from "./oracle-process-contract.ts";
import {
  runOracleStream,
  type OracleStreamEvaluator,
} from "./oracle-stream.ts";

export const ORACLE_CLI_MODES = ["identity", "stream"] as const;
export type OracleCliMode = (typeof ORACLE_CLI_MODES)[number];
export const ORACLE_CLI_USAGE = `Usage: ${ORACLE_CLI_MODES.map((mode) => `oracle ${mode}`).join(" | ")} (the stream mode reads UTF-8 LF-framed batches from stdin)`;

const isOracleCliMode = (value: string | undefined): value is OracleCliMode =>
  value !== undefined && ORACLE_CLI_MODES.some((mode) => mode === value);

export type OracleCliArgumentIssue = {
  readonly tag: "invalidArguments";
  readonly message: string;
};

export type OracleProcessWriter = (text: string) => Promise<void>;

export type OracleProcessDependencies = {
  readonly executablePath?: string;
  readonly stdin?: AsyncIterable<Uint8Array>;
  readonly writeStdout?: OracleProcessWriter;
  readonly writeStderr?: OracleProcessWriter;
  readonly loadApplication?: (
    executablePath: string,
  ) => ReturnType<typeof loadOracleApplicationFromExecutable>;
  /** Test-build seam; production leaves this unset and uses the application operation. */
  readonly evaluate?: OracleStreamEvaluator<never, never>;
};

/** Parse the deliberately small root command mode exhaustively. */
export function parseOracleCliMode(
  args: readonly string[],
): Either.Either<OracleCliMode, OracleCliArgumentIssue> {
  const [mode, ...remaining] = args;
  if (isOracleCliMode(mode) && remaining.length === 0) {
    return Either.right(mode);
  }
  return Either.left({
    tag: "invalidArguments",
    message: ORACLE_CLI_USAGE,
  });
}

/**
 * Run one root command with injectable process edges. The optional evaluator
 * is intentionally a test-build seam and is never selected by production
 * command-line input.
 */
export async function runOracleProcess(
  args: readonly string[],
  dependencies: OracleProcessDependencies = {},
): Promise<number> {
  const writeStdout = dependencies.writeStdout ?? defaultWriteStdout;
  const writeStderr = dependencies.writeStderr ?? defaultWriteStderr;
  const mode = parseOracleCliMode(args);
  if (Either.isLeft(mode)) {
    await report(writeStderr, mode.left.message);
    return 2;
  }

  const executablePath =
    dependencies.executablePath ?? fileURLToPath(import.meta.url);
  const loadApplication =
    dependencies.loadApplication ?? loadOracleApplicationFromExecutable;
  let loaded: ReturnType<typeof loadOracleApplicationFromExecutable>;
  try {
    loaded = loadApplication(executablePath);
  } catch (cause) {
    await report(writeStderr, `failed to load distribution: ${String(cause)}`);
    return 1;
  }
  if (Either.isLeft(loaded)) {
    await report(writeStderr, formatDistributionIssue(loaded.left));
    return 1;
  }

  const application = loaded.right;
  return Match.value(mode.right).pipe(
    Match.when("identity", () =>
      runIdentityMode(application, writeStdout, writeStderr),
    ),
    Match.when("stream", () =>
      runStreamMode(application, dependencies, writeStdout, writeStderr),
    ),
    Match.exhaustive,
  );
}

async function runIdentityMode(
  application: OracleApplication,
  writeStdout: OracleProcessWriter,
  writeStderr: OracleProcessWriter,
): Promise<number> {
  try {
    await writeStdout(
      `${encodeOracleIdentityResponseJson(application.identity)}\n`,
    );
    return 0;
  } catch (cause) {
    await report(writeStderr, `stdout write failed: ${String(cause)}`);
    return 1;
  }
}

async function runStreamMode(
  application: OracleApplication,
  dependencies: OracleProcessDependencies,
  writeStdout: OracleProcessWriter,
  writeStderr: OracleProcessWriter,
): Promise<number> {
  const input = Stream.fromAsyncIterable(
    dependencies.stdin ?? process.stdin,
    toProcessError,
  );
  const evaluate: OracleStreamEvaluator<never, never> =
    dependencies.evaluate ??
    ((request) => application.evaluateJson(request.rawJson));
  const result = await Effect.runPromiseExit(
    runOracleStream({
      input,
      application,
      evaluate,
      write: (encodedResponse) =>
        Effect.tryPromise({
          try: () => writeStdout(encodedResponse),
          catch: toProcessError,
        }),
    }),
  );
  if (Exit.isSuccess(result)) return 0;
  await report(writeStderr, `stream failed: ${String(result.cause)}`);
  return 1;
}

function toProcessError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error(String(cause));
}

function formatDistributionIssue(issue: OracleDistributionLoadIssue): string {
  return `distribution rejected: ${issue.tag}`;
}

async function report(
  writeStderr: OracleProcessWriter,
  message: string,
): Promise<void> {
  try {
    await writeStderr(`opaque-oracle: ${message}\n`);
  } catch {
    // A failed diagnostic sink cannot produce a contract response or recover the process.
  }
}

function defaultWriteStdout(text: string): Promise<void> {
  return writeNodeStream(process.stdout, text);
}

function defaultWriteStderr(text: string): Promise<void> {
  return writeNodeStream(process.stderr, text);
}

function writeNodeStream(
  stream: NodeJS.WritableStream,
  text: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    stream.write(text, "utf8", (error?: Error | null) => {
      if (error == null) resolve();
      else reject(error);
    });
  });
}
