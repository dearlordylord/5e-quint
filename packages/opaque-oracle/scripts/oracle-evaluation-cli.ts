import { pathToFileURL } from "node:url";

import { Command, Options } from "@effect/cli";
import { FileSystem, Path, Terminal } from "@effect/platform";
import type { PlatformError } from "@effect/platform/Error";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Effect, Either, Exit } from "effect";

import {
  buildOracleEvaluationCorpus,
  canonicalStructuralKey,
  type OracleCorpusIssues,
  decodeOracleCorpusDocument,
  admitOracleCorpusDocument,
  evaluateOracleBatch,
  serializeOracleCorpus,
  type OracleCorpus,
  type OracleEvaluationServices,
  type OracleTrace,
} from "../src/index.ts";
import { parseJsonWithDuplicateDetection } from "../src/oracle-decode.ts";
import {
  ORACLE_PUBLICATION_ARTIFACTS,
  ORACLE_PUBLICATION_MEMBERS,
  type OraclePublicationMember,
} from "../src/oracle-publication.ts";
import {
  formatOraclePublicationValidationErrors,
  validateOraclePublicationSchemaBytes,
} from "./oracle-publication-validation.ts";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";

/** Paths are relative to the package directory used by pnpm scripts. */
export const DEFAULT_CORPUS_PATH = "corpus/oracle-evaluation-corpus.json";
export const DEFAULT_PUBLICATION_DIRECTORY = "publication";

const CLI_NAME = "opaque-oracle-evaluation";
const CLI_VERSION = "0.0.0";

export type OracleEvaluationCliError =
  | {
      readonly tag: "catalogBuildFailed";
      readonly catalog: "unit" | "statBlock";
      readonly issues: readonly string[];
    }
  | {
      readonly tag: "sourceBuildFailed";
      readonly issues: readonly string[];
    }
  | {
      readonly tag: "filesystemFailed";
      readonly operation:
        | "read"
        | "write"
        | "directory"
        | "temporary"
        | "rename"
        | "remove";
      readonly path: string;
      readonly message: string;
    }
  | {
      readonly tag: "corpusValidationFailed";
      readonly issues: readonly string[];
    }
  | {
      readonly tag: "terminalFailed";
      readonly message: string;
    };

type OracleFilesystemError = Extract<
  OracleEvaluationCliError,
  { readonly tag: "filesystemFailed" }
>;

export type OracleEvaluationCliEnvironment =
  | FileSystem.FileSystem
  | Path.Path
  | Terminal.Terminal;

export type OracleEvaluationCliPaths = {
  readonly corpusPath: string;
  readonly publicationDirectory: string;
};

/** Injectable source builder used by tests; production uses the core builder. */
export type OracleEvaluationCorpusBuilder = (
  services: OracleEvaluationServices,
) => Either.Either<OracleCorpus, OracleCorpusIssues>;

export type OracleEvaluationCliDependencies = {
  readonly buildCorpus?: OracleEvaluationCorpusBuilder;
};

/**
 * Build the production catalogs once at the CLI composition root. The
 * command handlers receive the exact evaluator service shape and never build
 * a second catalog or access authored records directly.
 */
export function buildProductionOracleEvaluationServices(): Either.Either<
  OracleEvaluationServices,
  OracleEvaluationCliError
> {
  const units = buildUnitCatalog({ collections: [srdUnitCollection] });
  if (units.tag !== "ok") {
    return Either.left(
      catalogBuildFailed(
        "unit",
        units.issues.map((issue) => JSON.stringify(issue)),
      ),
    );
  }

  const statBlocks = buildStatBlockCatalog({
    collections: [srdStatBlockCollection],
  });
  if (statBlocks.tag !== "ok") {
    return Either.left(
      catalogBuildFailed(
        "statBlock",
        statBlocks.issues.map((issue) => JSON.stringify(issue)),
      ),
    );
  }

  return Either.right({
    unitLibrary: units.catalog,
    statBlockCatalog: statBlocks.catalog,
  });
}

/** Run the Effect CLI with injected evaluator services and platform layers. */
export function runOracleEvaluationCli(
  args: ReadonlyArray<string>,
  services: OracleEvaluationServices,
  dependencies: OracleEvaluationCliDependencies = {},
) {
  const command = makeRootCommand(
    services,
    dependencies.buildCorpus ?? buildOracleEvaluationCorpus,
  );
  return Command.run(command, {
    name: CLI_NAME,
    version: CLI_VERSION,
  })(normalizeCliArgs(args));
}

function normalizeCliArgs(args: ReadonlyArray<string>): ReadonlyArray<string> {
  // @effect/cli consumes process.argv, including executable and script. The
  // short form keeps the exported runner convenient for focused tests.
  return args[0] === "generate" || args[0] === "check" || args[0] === "write"
    ? ["node", CLI_NAME, ...args]
    : args;
}

function makeRootCommand(
  services: OracleEvaluationServices,
  buildCorpus: OracleEvaluationCorpusBuilder,
) {
  const corpusOption = Options.text("corpus").pipe(
    Options.withDefault(DEFAULT_CORPUS_PATH),
    Options.withDescription("Path to the one Oracle evaluation corpus."),
  );
  const publicationDirectoryOption = Options.text("publication-directory").pipe(
    Options.withDefault(DEFAULT_PUBLICATION_DIRECTORY),
    Options.withDescription(
      "Directory containing committed publication schemas.",
    ),
  );

  const generate = Command.make(
    "generate",
    { publicationDirectory: publicationDirectoryOption },
    ({ publicationDirectory }) =>
      generateEffect(services, buildCorpus, publicationDirectory),
  ).pipe(
    Command.withDescription(
      "Generate the canonical corpus to stdout without filesystem writes.",
    ),
  );
  const check = Command.make(
    "check",
    {
      corpus: corpusOption,
      publicationDirectory: publicationDirectoryOption,
    },
    ({ corpus, publicationDirectory }) =>
      checkEffect(
        services,
        {
          corpusPath: corpus,
          publicationDirectory,
        },
        buildCorpus,
      ),
  ).pipe(
    Command.withDescription(
      "Validate the corpus, schemas, and live evaluator output without writes.",
    ),
  );
  const write = Command.make(
    "write",
    {
      corpus: corpusOption,
      publicationDirectory: publicationDirectoryOption,
    },
    ({ corpus, publicationDirectory }) =>
      writeEffect(
        services,
        {
          corpusPath: corpus,
          publicationDirectory,
        },
        buildCorpus,
      ),
  ).pipe(
    Command.withDescription(
      "Generate, validate, and atomically replace the committed corpus.",
    ),
  );

  return Command.make("oracle", {}).pipe(
    Command.withDescription("Opaque Oracle evaluation corpus tools."),
    Command.withSubcommands([generate, check, write]),
  );
}

function generateEffect(
  services: OracleEvaluationServices,
  buildCorpus: OracleEvaluationCorpusBuilder,
  publicationDirectory: string,
): Effect.Effect<
  void,
  OracleEvaluationCliError,
  OracleEvaluationCliEnvironment
> {
  return Effect.gen(function* () {
    const corpus = yield* buildGeneratedCorpus(services, buildCorpus);
    const bytes = serializeOracleCorpus(corpus);
    yield* validateCorpusText(
      bytes.toString("utf8"),
      services,
      publicationDirectory,
    );
    const terminal = yield* Terminal.Terminal;
    // This is the only output of generate; validation itself is silent.
    yield* terminal
      .display(bytes.toString("utf8"))
      .pipe(Effect.mapError(terminalError));
  });
}

function checkEffect(
  services: OracleEvaluationServices,
  paths: OracleEvaluationCliPaths,
  buildCorpus: OracleEvaluationCorpusBuilder,
): Effect.Effect<
  void,
  OracleEvaluationCliError,
  OracleEvaluationCliEnvironment
> {
  return Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const text = yield* readCorpusText(fileSystem, paths.corpusPath);
    const validation = yield* validateCorpusText(
      text,
      services,
      paths.publicationDirectory,
    ).pipe(Effect.either);
    const canonical = yield* buildGeneratedCorpus(services, buildCorpus).pipe(
      Effect.either,
    );
    const issues: string[] = [];
    if (Either.isLeft(validation))
      issues.push(...cliErrorIssues(validation.left));
    if (Either.isLeft(canonical)) {
      issues.push(...cliErrorIssues(canonical.left));
    } else if (
      !Buffer.from(text, "utf8").equals(serializeOracleCorpus(canonical.right))
    ) {
      issues.push(
        `corpus is not the canonical generated artifact: ${paths.corpusPath}`,
      );
    }
    if (issues.length > 0) {
      return yield* Effect.fail(corpusValidationFailed(issues));
    }
    const terminal = yield* Terminal.Terminal;
    yield* terminal
      .display(`Opaque Oracle corpus is valid: ${paths.corpusPath}\n`)
      .pipe(Effect.mapError(terminalError));
  });
}

function writeEffect(
  services: OracleEvaluationServices,
  paths: OracleEvaluationCliPaths,
  buildCorpus: OracleEvaluationCorpusBuilder,
): Effect.Effect<
  void,
  OracleEvaluationCliError,
  OracleEvaluationCliEnvironment
> {
  return Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const corpus = yield* buildGeneratedCorpus(services, buildCorpus);
    const bytes = serializeOracleCorpus(corpus);

    // Validation completes before makeTempFile, writeFile, rename, or remove.
    yield* validateCorpusText(
      bytes.toString("utf8"),
      services,
      paths.publicationDirectory,
    );
    yield* writeAtomically(fileSystem, paths.corpusPath, bytes);

    const terminal = yield* Terminal.Terminal;
    yield* terminal
      .display(`Opaque Oracle corpus written: ${paths.corpusPath}\n`)
      .pipe(Effect.mapError(terminalError));
  });
}

function buildGeneratedCorpus(
  services: OracleEvaluationServices,
  buildCorpus: OracleEvaluationCorpusBuilder,
): Effect.Effect<OracleCorpus, OracleEvaluationCliError> {
  try {
    const result = buildCorpus(services);
    return Either.isLeft(result)
      ? Effect.fail(
          sourceBuildFailed(result.left.map((issue) => JSON.stringify(issue))),
        )
      : Effect.succeed(result.right);
  } catch (error) {
    return Effect.fail(sourceBuildFailed([safeErrorMessage(error)]));
  }
}

function readCorpusText(
  fileSystem: FileSystem.FileSystem,
  path: string,
): Effect.Effect<string, OracleEvaluationCliError> {
  return fileSystem
    .readFileString(path)
    .pipe(Effect.mapError((error) => fileSystemError("read", path, error)));
}

/**
 * Validate in the publication boundary's required order. Schema reads are
 * independent so malformed corpus data does not suppress missing/stale
 * publication diagnostics; live evaluation is attempted only after semantic
 * admission succeeds.
 */
function validateCorpusText(
  text: string,
  services: OracleEvaluationServices,
  publicationDirectory: string,
): Effect.Effect<
  OracleCorpus,
  OracleEvaluationCliError,
  OracleEvaluationCliEnvironment
> {
  return Effect.gen(function* () {
    const issues: string[] = [];
    const parsed = parseJsonWithDuplicateDetection(text);
    let raw: unknown = undefined;
    let admitted: OracleCorpus | undefined;

    if (Either.isLeft(parsed)) {
      issues.push(...formatDecodeIssues(parsed.left));
    } else {
      raw = parsed.right;
      const document = decodeOracleCorpusDocument(raw);
      if (Either.isLeft(document)) {
        issues.push(...formatDecodeIssues(document.left));
      } else {
        const semantic = admitOracleCorpusDocument(document.right);
        if (Either.isLeft(semantic)) {
          issues.push(...formatDecodeIssues(semantic.left));
        } else {
          admitted = semantic.right;
        }
      }
    }

    const fileSystem = yield* FileSystem.FileSystem;
    const schemaValidators = new Map<
      OraclePublicationMember,
      ReturnType<typeof validateOraclePublicationSchemaBytes>
    >();
    for (const member of ORACLE_PUBLICATION_MEMBERS) {
      const artifact = ORACLE_PUBLICATION_ARTIFACTS[member];
      const path = yield* Path.Path;
      const schemaPath = path.join(publicationDirectory, artifact.fileName);
      const bytes = yield* fileSystem.readFile(schemaPath).pipe(Effect.either);
      if (Either.isLeft(bytes)) {
        issues.push(
          `publication artifact cannot be read (${artifact.fileName}): ${safeErrorMessage(bytes.left)}`,
        );
        continue;
      }
      const validation = validateOraclePublicationSchemaBytes(
        member,
        bytes.right,
      );
      schemaValidators.set(member, validation);
      issues.push(...validation.issues);
    }

    validatePublishedValues(raw, schemaValidators, issues);

    if (admitted !== undefined) {
      const live = evaluateLiveCorpus(admitted, services);
      if (Either.isLeft(live)) {
        issues.push(...live.left);
      } else {
        issues.push(...compareLiveTraces(admitted, live.right));
      }
    }

    if (issues.length > 0) {
      return yield* Effect.fail(corpusValidationFailed(issues));
    }
    if (admitted === undefined) {
      return yield* Effect.fail(
        corpusValidationFailed(["corpus did not produce an admitted value"]),
      );
    }
    return admitted;
  });
}

/**
 * Expose the complete read-only validation effect for command-level tests and
 * embedding callers. It requires only the injected platform services.
 */
export function validateOracleEvaluationCorpus(
  text: string,
  services: OracleEvaluationServices,
  publicationDirectory = DEFAULT_PUBLICATION_DIRECTORY,
): Effect.Effect<
  OracleCorpus,
  OracleEvaluationCliError,
  OracleEvaluationCliEnvironment
> {
  return validateCorpusText(text, services, publicationDirectory);
}

function validatePublishedValues(
  raw: unknown,
  validators: ReadonlyMap<
    OraclePublicationMember,
    ReturnType<typeof validateOraclePublicationSchemaBytes>
  >,
  issues: string[],
): void {
  const record = asRecord(raw);
  const batch = record?.batch;
  const traces = record?.traces;
  const batchValidator = validators.get("evaluationBatch")?.validate;
  if (batchValidator !== undefined && !batchValidator(batch)) {
    issues.push(
      ...formatOraclePublicationValidationErrors(batchValidator).map(
        (issue) => `evaluationBatch.batch ${issue}`,
      ),
    );
  }

  const caseValidator = validators.get("case")?.validate;
  const cases = asRecord(batch)?.cases;
  if (caseValidator !== undefined && Array.isArray(cases)) {
    for (const [index, oracleCase] of cases.entries()) {
      if (!caseValidator(oracleCase)) {
        issues.push(
          ...formatOraclePublicationValidationErrors(caseValidator).map(
            (issue) => `case[${index}] ${issue}`,
          ),
        );
      }
    }
  }

  const traceValidator = validators.get("trace")?.validate;
  if (traceValidator !== undefined && Array.isArray(traces)) {
    for (const [index, trace] of traces.entries()) {
      if (!traceValidator(trace)) {
        issues.push(
          ...formatOraclePublicationValidationErrors(traceValidator).map(
            (issue) => `trace[${index}] ${issue}`,
          ),
        );
      }
    }
  }
}

function evaluateLiveCorpus(
  corpus: OracleCorpus,
  services: OracleEvaluationServices,
): Either.Either<readonly OracleTrace[], readonly string[]> {
  // Check evaluates the admitted committed batch, preserving corpus order and
  // identity. The source builder is used only by generate/write.
  return evaluateAdmittedBatch(corpus, services);
}

function evaluateAdmittedBatch(
  corpus: OracleCorpus,
  services: OracleEvaluationServices,
): Either.Either<readonly OracleTrace[], readonly string[]> {
  try {
    return Either.right(evaluateOracleBatch({ batch: corpus.batch, services }));
  } catch (error) {
    return Either.left([`live evaluator failed: ${safeErrorMessage(error)}`]);
  }
}

function compareLiveTraces(
  committed: OracleCorpus,
  live: readonly OracleTrace[],
): readonly string[] {
  const issues: string[] = [];
  if (committed.traces.length !== live.length) {
    issues.push(
      `trace length mismatch: committed=${committed.traces.length} live=${live.length}`,
    );
  }
  const count = Math.max(committed.traces.length, live.length);
  for (let index = 0; index < count; index += 1) {
    const committedTrace = committed.traces[index];
    const liveTrace = live[index];
    if (committedTrace === undefined || liveTrace === undefined) continue;
    const committedKey = canonicalStructuralKey(committedTrace);
    const liveKey = canonicalStructuralKey(liveTrace);
    if (committedKey !== liveKey) {
      issues.push(`trace mismatch at position ${index}`);
    }
  }
  return issues;
}

function writeAtomically(
  fileSystem: FileSystem.FileSystem,
  targetPath: string,
  bytes: Uint8Array,
): Effect.Effect<void, OracleEvaluationCliError, Path.Path> {
  return Effect.gen(function* () {
    const path = yield* Path.Path;
    yield* fileSystem
      .makeDirectory(path.dirname(targetPath), { recursive: true })
      .pipe(
        Effect.mapError((error) =>
          fileSystemError("directory", path.dirname(targetPath), error),
        ),
      );
    const temporary = yield* fileSystem
      .makeTempFile({
        directory: path.dirname(targetPath),
        prefix: `.${path.basename(targetPath)}.`,
        suffix: ".tmp",
      })
      .pipe(
        Effect.mapError((error) =>
          fileSystemError("temporary", targetPath, error),
        ),
      );

    const writeAndRename = fileSystem
      .writeFile(temporary, bytes, { flag: "w" })
      .pipe(
        Effect.mapError((error) => fileSystemError("write", temporary, error)),
        Effect.flatMap(() =>
          fileSystem
            .rename(temporary, targetPath)
            .pipe(
              Effect.mapError((error) =>
                fileSystemError("rename", targetPath, error),
              ),
            ),
        ),
      );
    const useExit = yield* Effect.exit(writeAndRename);
    const cleanupExit = yield* Effect.exit(
      fileSystem
        .remove(temporary, { force: true })
        .pipe(
          Effect.mapError((error) =>
            fileSystemError("remove", temporary, error),
          ),
        ),
    );
    if (Exit.isFailure(useExit)) {
      return yield* Effect.failCause(useExit.cause);
    }
    if (Exit.isFailure(cleanupExit)) {
      return yield* Effect.failCause(cleanupExit.cause);
    }
  });
}

/** Atomically publish already-validated corpus bytes in the target directory. */
export function writeOracleEvaluationCorpusAtomically(
  fileSystem: FileSystem.FileSystem,
  targetPath: string,
  bytes: Uint8Array,
): Effect.Effect<void, OracleEvaluationCliError, Path.Path> {
  return writeAtomically(fileSystem, targetPath, bytes);
}

function formatDecodeIssues(
  issues: ReadonlyArray<{ readonly path: string; readonly code: string }>,
): readonly string[] {
  return issues.map((issue) => `${issue.path || "/"} ${issue.code}`);
}

function cliErrorIssues(error: OracleEvaluationCliError): readonly string[] {
  switch (error.tag) {
    case "catalogBuildFailed":
      return [`${error.catalog} catalog build failed`, ...error.issues];
    case "sourceBuildFailed":
      return ["source corpus build failed", ...error.issues];
    case "filesystemFailed":
      return [
        `filesystem ${error.operation} failed (${error.path}): ${error.message}`,
      ];
    case "corpusValidationFailed":
      return error.issues;
    case "terminalFailed":
      return [`terminal display failed: ${error.message}`];
  }
}

function asRecord(
  value: unknown,
): Readonly<Record<string, unknown>> | undefined {
  return isRecord(value) ? value : undefined;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fileSystemError(
  operation: OracleFilesystemError["operation"],
  path: string,
  error: PlatformError,
): OracleFilesystemError {
  return {
    tag: "filesystemFailed",
    operation,
    path,
    message: safeErrorMessage(error),
  };
}

function sourceBuildFailed(
  issues: readonly string[],
): Extract<OracleEvaluationCliError, { readonly tag: "sourceBuildFailed" }> {
  return { tag: "sourceBuildFailed", issues };
}

function catalogBuildFailed(
  catalog: "unit" | "statBlock",
  issues: readonly string[],
): Extract<OracleEvaluationCliError, { readonly tag: "catalogBuildFailed" }> {
  return { tag: "catalogBuildFailed", catalog, issues };
}

function corpusValidationFailed(
  issues: readonly string[],
): Extract<
  OracleEvaluationCliError,
  { readonly tag: "corpusValidationFailed" }
> {
  return { tag: "corpusValidationFailed", issues };
}

function terminalError(
  error: PlatformError,
): Extract<OracleEvaluationCliError, { readonly tag: "terminalFailed" }> {
  return { tag: "terminalFailed", message: safeErrorMessage(error) };
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function runMain(): void {
  const services = buildProductionOracleEvaluationServices();
  const program = Either.isLeft(services)
    ? Effect.fail(services.left)
    : runOracleEvaluationCli(process.argv, services.right);
  NodeRuntime.runMain(program.pipe(Effect.provide(NodeContext.layer)), {
    disablePrettyLogger: true,
  });
}

const invokedScript = process.argv[1];
if (
  invokedScript !== undefined &&
  import.meta.url === pathToFileURL(invokedScript).href
) {
  runMain();
}
