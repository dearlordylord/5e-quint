import { fileURLToPath } from "node:url";

import { Effect, Result, Exit, Match, Stream } from "effect";

import {
  loadOracleApplicationFromExecutable,
  type OracleApplication,
  type OracleDistributionLoadIssue,
} from "./oracle-distribution.ts";
import {
  decodeOracleBindPort,
  encodeOracleIdentityResponseJson,
  ORACLE_LOOPBACK_HOST,
  type OracleLoopbackHost,
  type OracleBindPort,
} from "./oracle-process-contract.ts";
import { runOracleStream } from "./oracle-stream.ts";
import { runOracleHttpService } from "./oracle-http.ts";

const ORACLE_CLI_COMMAND_DEFINITIONS = [
  { tag: "identity", arguments: "none" },
  { tag: "stream", arguments: "none" },
  {
    tag: "serve",
    arguments: "serve",
    hostFlag: "--host",
    portFlag: "--port",
  },
] as const;

type OracleCliCommandDefinition =
  (typeof ORACLE_CLI_COMMAND_DEFINITIONS)[number];
export type OracleCliCommand = {
  [Definition in OracleCliCommandDefinition as Definition["tag"]]: Definition extends {
    readonly arguments: "serve";
  }
    ? {
        readonly tag: Definition["tag"];
        readonly host: OracleLoopbackHost;
        readonly port: OracleBindPort;
      }
    : { readonly tag: Definition["tag"] };
}[OracleCliCommandDefinition["tag"]];

const oracleCliCommandUsage = (
  definition: OracleCliCommandDefinition,
): string =>
  Match.value(definition).pipe(
    Match.when(
      { arguments: "serve" },
      ({ tag, hostFlag, portFlag }) =>
        `oracle ${tag} ${hostFlag} ${ORACLE_LOOPBACK_HOST} ${portFlag} <0..65535>`,
    ),
    Match.when({ arguments: "none" }, ({ tag }) => `oracle ${tag}`),
    Match.exhaustive,
  );

export const ORACLE_CLI_USAGE = `Usage: ${ORACLE_CLI_COMMAND_DEFINITIONS.map(
  oracleCliCommandUsage,
).join(
  " | ",
)} (the stream mode reads UTF-8 LF-framed batches from stdin; serve writes one readiness value before accepting requests)`;

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
};

/** Parse the one root command and its serve-only options. */
export function parseOracleCliCommand(
  args: readonly string[],
): Result.Result<OracleCliCommand, OracleCliArgumentIssue> {
  const [mode, ...remaining] = args;
  const definition = ORACLE_CLI_COMMAND_DEFINITIONS.find(
    (candidate) => candidate.tag === mode,
  );
  if (definition === undefined) return Result.fail(invalidArguments());
  return Match.value(definition).pipe(
    Match.when({ arguments: "serve" }, (serveDefinition) =>
      parseOracleServeCommand(serveDefinition, remaining),
    ),
    Match.when({ arguments: "none" }, ({ tag }) =>
      remaining.length === 0
        ? Result.succeed({ tag })
        : Result.fail(invalidArguments()),
    ),
    Match.exhaustive,
  );
}

/**
 * Run one root command with injectable process edges. Production command-line
 * input always uses the single application returned by the distribution
 * loader.
 */
export async function runOracleProcess(
  args: readonly string[],
  dependencies: OracleProcessDependencies = {},
): Promise<number> {
  const writeStdout = dependencies.writeStdout ?? defaultWriteStdout;
  const writeStderr = dependencies.writeStderr ?? defaultWriteStderr;
  const mode = parseOracleCliCommand(args);
  if (Result.isFailure(mode)) {
    await report(writeStderr, mode.failure.message);
    return 2;
  }

  const executablePath =
    dependencies.executablePath ?? fileURLToPath(import.meta.url);
  const loadApplication =
    dependencies.loadApplication ?? loadOracleApplicationFromExecutable;
  const loaded = loadOracleApplicationSafely(executablePath, loadApplication);
  if (Result.isFailure(loaded)) {
    await report(writeStderr, loaded.failure);
    return 1;
  }

  const application = loaded.success;
  return Match.value(mode.success).pipe(
    Match.when({ tag: "identity" }, () =>
      runIdentityMode(application, writeStdout, writeStderr),
    ),
    Match.when({ tag: "stream" }, () =>
      runStreamMode(application, dependencies, writeStdout, writeStderr),
    ),
    Match.when({ tag: "serve" }, ({ host, port }) =>
      runServeMode(application, host, port, writeStdout, writeStderr),
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
  const result = await Effect.runPromiseExit(
    runOracleStream({
      input,
      application,
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

function parseOracleServeCommand(
  definition: Extract<OracleCliCommandDefinition, { arguments: "serve" }>,
  args: readonly string[],
): Result.Result<OracleCliCommand, OracleCliArgumentIssue> {
  const values = parseOracleServeFlags(definition, args);
  if (values === undefined) return Result.fail(invalidArguments());

  const host = values.get(definition.hostFlag);
  const portToken = values.get(definition.portFlag);
  if (!isValidOracleServeAddress(host, portToken)) {
    return Result.fail(invalidArguments());
  }
  const decodedPort = decodeOracleBindPort(Number(portToken));
  if (Result.isFailure(decodedPort)) return Result.fail(invalidArguments());
  return Result.succeed({
    tag: "serve",
    host: ORACLE_LOOPBACK_HOST,
    port: decodedPort.success,
  });
}

function loadOracleApplicationSafely(
  executablePath: string,
  loadApplication: NonNullable<OracleProcessDependencies["loadApplication"]>,
): Result.Result<OracleApplication, string> {
  try {
    const loaded = loadApplication(executablePath);
    return Result.isFailure(loaded)
      ? Result.fail(formatDistributionIssue(loaded.failure))
      : Result.succeed(loaded.success);
  } catch (cause) {
    return Result.fail(`failed to load distribution: ${String(cause)}`);
  }
}

function parseOracleServeFlags(
  definition: Extract<OracleCliCommandDefinition, { arguments: "serve" }>,
  args: readonly string[],
): Map<string, string> | undefined {
  if (args.length === 0 || args.length % 2 !== 0) return undefined;
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!isValidOracleServeFlag(definition, flag, value, values)) {
      return undefined;
    }
    values.set(flag, value);
  }
  return values;
}

function isValidOracleServeFlag(
  definition: Extract<OracleCliCommandDefinition, { arguments: "serve" }>,
  flag: string | undefined,
  value: string | undefined,
  values: ReadonlyMap<string, string>,
): value is string {
  return (
    (flag === definition.hostFlag || flag === definition.portFlag) &&
    value !== undefined &&
    !value.startsWith("--") &&
    !values.has(flag)
  );
}

function isValidOracleServeAddress(
  host: string | undefined,
  portToken: string | undefined,
): portToken is string {
  return (
    host === ORACLE_LOOPBACK_HOST &&
    portToken !== undefined &&
    /^(?:0|[1-9][0-9]{0,4})$/u.test(portToken)
  );
}

function invalidArguments(): OracleCliArgumentIssue {
  return { tag: "invalidArguments", message: ORACLE_CLI_USAGE };
}

async function runServeMode(
  application: OracleApplication,
  host: OracleLoopbackHost,
  port: OracleBindPort,
  writeStdout: OracleProcessWriter,
  writeStderr: OracleProcessWriter,
): Promise<number> {
  const result = await runOracleHttpService({
    application,
    host,
    port,
    writeReady: writeStdout,
  });
  if (Result.isSuccess(result)) return 0;
  await report(writeStderr, `serve failed: ${result.failure.tag}`);
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
