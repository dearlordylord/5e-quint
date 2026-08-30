import { pathToFileURL } from "node:url";

import { Command, Flag } from "effect/unstable/cli";
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import type { ErrorObject, ValidateFunction } from "ajv";
import {
  Effect,
  Result,
  Exit,
  FileSystem,
  Match,
  Path,
  Terminal,
} from "effect";
import type { PlatformError } from "effect/PlatformError";

import {
  buildOracleEvaluationCorpus,
  canonicalStructuralKey,
  decodeOracleCorpusDocument,
  admitOracleCorpusDocument,
  evaluateOracleBatch,
  serializeOracleCorpus,
  type OracleCorpus,
  type OracleCorpusIssue,
  type OracleCorpusIssues,
  type OracleEvaluationServices,
  type OracleTrace,
} from "../src/index.ts";
import {
  parseJsonWithDuplicateDetection,
  type OracleDecodeIssues,
} from "../src/oracle-decode.ts";
import {
  ORACLE_PUBLICATION_ARTIFACTS,
  ORACLE_PUBLICATION_MEMBERS,
  isOraclePublicationArtifactFileName,
  type OraclePublicationMember,
} from "../src/oracle-publication.ts";
import {
  type OraclePublicationSchemaIssues,
  type OraclePublicationSchemaValidation,
  validateOraclePublicationSchemaBytes,
} from "./oracle-publication-validation.ts";
import { type StatBlockCatalogBuildIssue } from "@dnd/surface/surface/stat-block-catalog";
import { type UnitCatalogBuildIssue } from "@dnd/surface/surface/unit-catalog";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import { toReadonlyNonEmpty } from "./oracle-evaluation-cli-support.ts";
import { buildOracleEvaluationServices } from "../src/oracle-catalog-services.ts";
import { srdStatBlockCollection } from "@dnd/surface/surface/stat-block-catalog";
import { srdUnitCollection } from "@dnd/surface/surface/unit-catalog";

/** Paths are relative to the package directory used by pnpm scripts. */
export const DEFAULT_CORPUS_PATH = "corpus/oracle-evaluation-corpus.json";
export const DEFAULT_PUBLICATION_DIRECTORY = "publication";

const CLI_VERSION = "0.0.0";

export type OracleCatalogIssue =
  | {
      readonly tag: "unitCatalogIssue";
      readonly issue: UnitCatalogBuildIssue;
    }
  | {
      readonly tag: "statBlockCatalogIssue";
      readonly issue: StatBlockCatalogBuildIssue;
    }
  | {
      readonly tag: "catalogBuildDefect";
      readonly catalog: "unit" | "statBlock";
      readonly cause: unknown;
    };

export type OracleSourceIssue =
  | {
      readonly tag: "sourceIssue";
      readonly issue: OracleCorpusIssue;
    }
  | {
      readonly tag: "sourceDefect";
      readonly cause: unknown;
    };

export type OracleCorpusValidationIssue =
  | {
      readonly tag: "decode";
      readonly stage: "json" | "document" | "semantic";
      readonly issues: OracleDecodeIssues;
    }
  | {
      readonly tag: "publicationSchemaRead";
      readonly member: OraclePublicationMember;
      readonly path: string;
      readonly error: PlatformError;
    }
  | {
      readonly tag: "publicationDirectoryRead";
      readonly path: string;
      readonly error: PlatformError;
    }
  | {
      readonly tag: "publicationSchemaOrphan";
      readonly path: string;
    }
  | {
      readonly tag: "publicationSchema";
      readonly member: OraclePublicationMember;
      readonly path: string;
      readonly issues: OraclePublicationSchemaIssues;
    }
  | {
      readonly tag: "publishedValue";
      readonly member: OraclePublicationMember;
      readonly path: string;
      readonly errors: readonly ErrorObject[];
    }
  | {
      readonly tag: "liveEvaluation";
      readonly cause: unknown;
    }
  | {
      readonly tag: "traceLengthMismatch";
      readonly committed: number;
      readonly live: number;
    }
  | {
      readonly tag: "traceMismatch";
      readonly position: number;
      readonly committed: OracleTrace;
      readonly live: OracleTrace;
    }
  | {
      readonly tag: "canonicalArtifactMismatch";
      readonly path: string;
    }
  | {
      readonly tag: "sourceBuild";
      readonly issues: ReadonlyNonEmptyArray<OracleSourceIssue>;
    };

export type OracleEvaluationCliError =
  | {
      readonly tag: "catalogBuildFailed";
      readonly issues: ReadonlyNonEmptyArray<OracleCatalogIssue>;
    }
  | {
      readonly tag: "sourceBuildFailed";
      readonly issues: ReadonlyNonEmptyArray<OracleSourceIssue>;
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
      readonly error: PlatformError;
    }
  | {
      readonly tag: "corpusValidationFailed";
      readonly issues: ReadonlyNonEmptyArray<OracleCorpusValidationIssue>;
    }
  | {
      readonly tag: "terminalFailed";
      readonly error: PlatformError;
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
) => Result.Result<OracleCorpus, OracleCorpusIssues>;

export type OracleEvaluationCliDependencies = {
  readonly buildCorpus?: OracleEvaluationCorpusBuilder;
};

/**
 * Build the production catalogs once at the CLI composition root. The
 * command handlers receive the exact evaluator service shape and never build
 * a second catalog or access authored records directly.
 */
export function buildProductionOracleEvaluationServices(): Result.Result<
  OracleEvaluationServices,
  OracleEvaluationCliError
> {
  try {
    const services = buildOracleEvaluationServices({
      unitCollection: srdUnitCollection,
      statBlockCollection: srdStatBlockCollection,
    });
    if (Result.isSuccess(services)) return Result.succeed(services.success);
    const issues = services.failure.flatMap((issue) =>
      issue.tag === "unitCatalog"
        ? issue.issues.map(unitCatalogIssue)
        : issue.tag === "statBlockCatalog"
          ? issue.issues.map(statBlockCatalogIssue)
          : [catalogBuildDefect(issue.catalog, new Error(issue.message))],
    );
    return Result.fail(
      catalogBuildFailed(
        toReadonlyNonEmpty(issues, () =>
          catalogBuildDefect("unit", new Error("Missing catalog issues.")),
        ),
      ),
    );
  } catch (cause) {
    return Result.fail(catalogBuildFailed([catalogBuildDefect("unit", cause)]));
  }
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
  return Command.runWith(command, {
    version: CLI_VERSION,
  })(normalizeCliArgs(args));
}

function normalizeCliArgs(args: ReadonlyArray<string>): ReadonlyArray<string> {
  // The short form keeps the exported runner convenient for focused tests;
  // process.argv includes the executable and script path.
  return args[0] === "generate" || args[0] === "check" || args[0] === "write"
    ? args
    : args.slice(2);
}

function makeRootCommand(
  services: OracleEvaluationServices,
  buildCorpus: OracleEvaluationCorpusBuilder,
) {
  const corpusOption = Flag.string("corpus").pipe(
    Flag.withDefault(DEFAULT_CORPUS_PATH),
    Flag.withDescription("Path to the one Oracle evaluation corpus."),
  );
  const publicationDirectoryOption = Flag.string("publication-directory").pipe(
    Flag.withDefault(DEFAULT_PUBLICATION_DIRECTORY),
    Flag.withDescription("Directory containing committed publication schemas."),
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
    ).pipe(Effect.result);
    const canonical = yield* buildGeneratedCorpus(services, buildCorpus).pipe(
      Effect.result,
    );
    const issues: OracleCorpusValidationIssue[] = [
      ...(yield* validationIssuesOrFail(validation)),
      ...(yield* canonicalIssuesOrFail(canonical)),
    ];
    if (Result.isSuccess(canonical)) {
      if (
        !Buffer.from(text, "utf8").equals(
          serializeOracleCorpus(canonical.success),
        )
      ) {
        issues.push({
          tag: "canonicalArtifactMismatch",
          path: paths.corpusPath,
        });
      }
    }
    const nonEmptyIssues = toReadonlyNonEmpty(issues);
    if (nonEmptyIssues !== undefined) {
      return yield* Effect.fail(corpusValidationFailed(nonEmptyIssues));
    }
    const terminal = yield* Terminal.Terminal;
    yield* terminal
      .display(`Opaque Oracle corpus is valid: ${paths.corpusPath}\n`)
      .pipe(Effect.mapError(terminalError));
  });
}

function validationIssuesOrFail(
  validation: Result.Result<OracleCorpus, OracleEvaluationCliError>,
): Effect.Effect<
  readonly OracleCorpusValidationIssue[],
  OracleEvaluationCliError
> {
  if (Result.isSuccess(validation)) return Effect.succeed([]);
  return Match.value(validation.failure).pipe(
    Match.when({ tag: "corpusValidationFailed" }, ({ issues }) =>
      Effect.succeed(issues),
    ),
    Match.when({ tag: "catalogBuildFailed" }, failValidation),
    Match.when({ tag: "sourceBuildFailed" }, failValidation),
    Match.when({ tag: "filesystemFailed" }, failValidation),
    Match.when({ tag: "terminalFailed" }, failValidation),
    Match.exhaustive,
  );
}

function canonicalIssuesOrFail(
  canonical: Result.Result<OracleCorpus, OracleEvaluationCliError>,
): Effect.Effect<
  readonly OracleCorpusValidationIssue[],
  OracleEvaluationCliError
> {
  if (Result.isSuccess(canonical)) return Effect.succeed([]);
  return Match.value(canonical.failure).pipe(
    Match.when({ tag: "sourceBuildFailed" }, ({ issues }) =>
      Effect.succeed(
        oneCorpusIssue({
          tag: "sourceBuild",
          issues,
        }),
      ),
    ),
    Match.when({ tag: "catalogBuildFailed" }, failValidation),
    Match.when({ tag: "filesystemFailed" }, failValidation),
    Match.when({ tag: "corpusValidationFailed" }, failValidation),
    Match.when({ tag: "terminalFailed" }, failValidation),
    Match.exhaustive,
  );
}

function failValidation(
  error: OracleEvaluationCliError,
): Effect.Effect<
  readonly OracleCorpusValidationIssue[],
  OracleEvaluationCliError
> {
  return Effect.fail(error);
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
    return Result.isFailure(result)
      ? Effect.fail(
          sourceBuildFailed(
            toReadonlyNonEmpty(result.failure.map(sourceIssue), () => ({
              tag: "sourceDefect" as const,
              cause: new Error("Source builder returned no diagnostic issues."),
            })),
          ),
        )
      : Effect.succeed(result.success);
  } catch (cause) {
    return Effect.fail(sourceBuildFailed([{ tag: "sourceDefect", cause }]));
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
type CorpusAssessment =
  | {
      readonly tag: "jsonRejected";
      readonly issues: OracleDecodeIssues;
    }
  | {
      readonly tag: "documentRejected";
      readonly raw: unknown;
      readonly issues: OracleDecodeIssues;
    }
  | {
      readonly tag: "semanticRejected";
      readonly raw: unknown;
      readonly issues: OracleDecodeIssues;
    }
  | {
      readonly tag: "admitted";
      readonly raw: unknown;
      readonly corpus: OracleCorpus;
    };

type PublicationSchemaRead =
  | {
      readonly tag: "readFailed";
      readonly member: OraclePublicationMember;
      readonly path: string;
      readonly error: PlatformError;
    }
  | {
      readonly tag: "read";
      readonly member: OraclePublicationMember;
      readonly path: string;
      readonly validation: OraclePublicationSchemaValidation;
    };

type PublicationSchemaCollection = {
  readonly validators: ReadonlyMap<
    OraclePublicationMember,
    ValidateFunction<unknown>
  >;
  readonly issues: readonly OracleCorpusValidationIssue[];
};

type PublicationDirectoryRead =
  | {
      readonly tag: "readFailed";
      readonly path: string;
      readonly error: PlatformError;
    }
  | {
      readonly tag: "read";
      readonly path: string;
      readonly entries: readonly string[];
    };

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
    const assessment = assessCorpusText(text);
    const fileSystem = yield* FileSystem.FileSystem;
    const schemas = yield* readPublicationSchemas(
      fileSystem,
      publicationDirectory,
    );
    const issues = [
      ...assessmentIssues(assessment),
      ...schemas.issues,
      ...publishedValueIssues(assessment, schemas.validators),
      ...liveEvaluationIssues(assessment, services),
    ];
    const nonEmptyIssues = toReadonlyNonEmpty(issues);
    if (nonEmptyIssues !== undefined) {
      return yield* Effect.fail(corpusValidationFailed(nonEmptyIssues));
    }

    return yield* Match.value(assessment).pipe(
      Match.when({ tag: "admitted" }, ({ corpus }) => Effect.succeed(corpus)),
      Match.when({ tag: "jsonRejected" }, ({ issues }) =>
        Effect.fail(
          corpusValidationFailed([{ tag: "decode", stage: "json", issues }]),
        ),
      ),
      Match.when({ tag: "documentRejected" }, ({ issues }) =>
        Effect.fail(
          corpusValidationFailed([
            { tag: "decode", stage: "document", issues },
          ]),
        ),
      ),
      Match.when({ tag: "semanticRejected" }, ({ issues }) =>
        Effect.fail(
          corpusValidationFailed([
            { tag: "decode", stage: "semantic", issues },
          ]),
        ),
      ),
      Match.exhaustive,
    );
  });
}

function assessCorpusText(text: string): CorpusAssessment {
  const parsed = parseJsonWithDuplicateDetection(text);
  return Result.isFailure(parsed)
    ? { tag: "jsonRejected", issues: parsed.failure }
    : assessCorpusDocument(parsed.success);
}

function assessCorpusDocument(raw: unknown): CorpusAssessment {
  const document = decodeOracleCorpusDocument(raw);
  return Result.isFailure(document)
    ? { tag: "documentRejected", raw, issues: document.failure }
    : assessCorpusSemantics(raw, document.success);
}

function assessCorpusSemantics(
  raw: unknown,
  document: Parameters<typeof admitOracleCorpusDocument>[0],
): CorpusAssessment {
  const semantic = admitOracleCorpusDocument(document);
  return Result.isFailure(semantic)
    ? { tag: "semanticRejected", raw, issues: semantic.failure }
    : { tag: "admitted", raw, corpus: semantic.success };
}

function readPublicationSchemas(
  fileSystem: FileSystem.FileSystem,
  publicationDirectory: string,
): Effect.Effect<PublicationSchemaCollection, never, Path.Path> {
  return Effect.gen(function* () {
    const directory = yield* readPublicationDirectory(
      fileSystem,
      publicationDirectory,
    );
    const path = yield* Path.Path;
    const reads = yield* Effect.forEach(
      ORACLE_PUBLICATION_MEMBERS,
      (member) =>
        readPublicationSchema(fileSystem, publicationDirectory, member),
      { concurrency: 1 },
    );
    const validatorEntries = reads.flatMap(publicationValidatorEntries);
    return {
      validators: new Map<OraclePublicationMember, ValidateFunction<unknown>>(
        validatorEntries,
      ),
      issues: [
        ...publicationDirectoryIssues(directory, path),
        ...reads.flatMap(publicationSchemaIssues),
      ],
    };
  });
}

function readPublicationDirectory(
  fileSystem: FileSystem.FileSystem,
  publicationDirectory: string,
): Effect.Effect<PublicationDirectoryRead, never> {
  return fileSystem.readDirectory(publicationDirectory).pipe(
    Effect.result,
    Effect.map((entries) =>
      Result.isFailure(entries)
        ? {
            tag: "readFailed" as const,
            path: publicationDirectory,
            error: entries.failure,
          }
        : {
            tag: "read" as const,
            path: publicationDirectory,
            entries: entries.success,
          },
    ),
  );
}

function publicationDirectoryIssues(
  directory: PublicationDirectoryRead,
  path: Path.Path,
): readonly OracleCorpusValidationIssue[] {
  return Match.value(directory).pipe(
    Match.when({ tag: "readFailed" }, ({ path: directoryPath, error }) => [
      {
        tag: "publicationDirectoryRead" as const,
        path: directoryPath,
        error,
      },
    ]),
    Match.when({ tag: "read" }, ({ path: directoryPath, entries }) =>
      entries
        .filter((entry) => !isOraclePublicationArtifactFileName(entry))
        .map((entry) => ({
          tag: "publicationSchemaOrphan" as const,
          path: path.join(directoryPath, entry),
        })),
    ),
    Match.exhaustive,
  );
}

function readPublicationSchema(
  fileSystem: FileSystem.FileSystem,
  publicationDirectory: string,
  member: OraclePublicationMember,
): Effect.Effect<PublicationSchemaRead, never, Path.Path> {
  return Effect.gen(function* () {
    const path = yield* Path.Path;
    const schemaPath = path.join(
      publicationDirectory,
      ORACLE_PUBLICATION_ARTIFACTS[member].fileName,
    );
    const bytes = yield* fileSystem.readFile(schemaPath).pipe(Effect.result);
    return Result.isFailure(bytes)
      ? publicationSchemaReadFailure(member, schemaPath, bytes.failure)
      : publicationSchemaReadSuccess(
          member,
          schemaPath,
          validateOraclePublicationSchemaBytes(member, bytes.success),
        );
  });
}

function publicationSchemaReadFailure(
  member: OraclePublicationMember,
  path: string,
  error: PlatformError,
): PublicationSchemaRead {
  return { tag: "readFailed", member, path, error };
}

function publicationSchemaReadSuccess(
  member: OraclePublicationMember,
  path: string,
  validation: OraclePublicationSchemaValidation,
): PublicationSchemaRead {
  return { tag: "read", member, path, validation };
}

function publicationValidatorEntries(
  read: PublicationSchemaRead,
): readonly (readonly [OraclePublicationMember, ValidateFunction<unknown>])[] {
  return Match.value(read).pipe(
    Match.when({ tag: "readFailed" }, () => []),
    Match.when({ tag: "read" }, ({ member, validation }) =>
      validation.validate === undefined
        ? []
        : [publicationValidatorEntry(member, validation.validate)],
    ),
    Match.exhaustive,
  );
}

function publicationValidatorEntry(
  member: OraclePublicationMember,
  validate: ValidateFunction<unknown>,
): readonly [OraclePublicationMember, ValidateFunction<unknown>] {
  return [member, validate];
}

function publicationSchemaIssues(
  read: PublicationSchemaRead,
): readonly OracleCorpusValidationIssue[] {
  return Match.value(read).pipe(
    Match.when({ tag: "readFailed" }, ({ member, path, error }) =>
      oneCorpusIssue({ tag: "publicationSchemaRead", member, path, error }),
    ),
    Match.when({ tag: "read" }, ({ member, path, validation }) =>
      Match.value(validation).pipe(
        Match.when({ tag: "valid" }, () => []),
        Match.when({ tag: "invalid" }, ({ issues }) =>
          oneCorpusIssue({
            tag: "publicationSchema",
            member,
            path,
            issues,
          }),
        ),
        Match.exhaustive,
      ),
    ),
    Match.exhaustive,
  );
}

function assessmentIssues(
  assessment: CorpusAssessment,
): readonly OracleCorpusValidationIssue[] {
  return Match.value(assessment).pipe(
    Match.when({ tag: "jsonRejected" }, ({ issues }) =>
      oneCorpusIssue({ tag: "decode", stage: "json", issues }),
    ),
    Match.when({ tag: "documentRejected" }, ({ issues }) =>
      oneCorpusIssue({ tag: "decode", stage: "document", issues }),
    ),
    Match.when({ tag: "semanticRejected" }, ({ issues }) =>
      oneCorpusIssue({ tag: "decode", stage: "semantic", issues }),
    ),
    Match.when({ tag: "admitted" }, () => []),
    Match.exhaustive,
  );
}

function publishedValueIssues(
  assessment: CorpusAssessment,
  validators: ReadonlyMap<OraclePublicationMember, ValidateFunction<unknown>>,
): readonly OracleCorpusValidationIssue[] {
  return Match.value(assessment).pipe(
    Match.when({ tag: "jsonRejected" }, () => []),
    Match.when({ tag: "documentRejected" }, ({ raw }) =>
      validatePublishedValues(raw, validators),
    ),
    Match.when({ tag: "semanticRejected" }, ({ raw }) =>
      validatePublishedValues(raw, validators),
    ),
    Match.when({ tag: "admitted" }, ({ raw }) =>
      validatePublishedValues(raw, validators),
    ),
    Match.exhaustive,
  );
}

function liveEvaluationIssues(
  assessment: CorpusAssessment,
  services: OracleEvaluationServices,
): readonly OracleCorpusValidationIssue[] {
  return Match.value(assessment).pipe(
    Match.when({ tag: "admitted" }, ({ corpus }) => {
      const live = evaluateLiveCorpus(corpus, services);
      return Result.isFailure(live)
        ? oneCorpusIssue({ tag: "liveEvaluation", cause: live.failure })
        : compareLiveTraces(corpus, live.success);
    }),
    Match.when({ tag: "jsonRejected" }, () => []),
    Match.when({ tag: "documentRejected" }, () => []),
    Match.when({ tag: "semanticRejected" }, () => []),
    Match.exhaustive,
  );
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
  validators: ReadonlyMap<OraclePublicationMember, ValidateFunction<unknown>>,
): readonly OracleCorpusValidationIssue[] {
  const issues: OracleCorpusValidationIssue[] = [];
  const record = asRecord(raw);
  const batch = record?.batch;
  const traces = record?.traces;
  const batchValidator = validators.get("evaluationBatch");
  if (batchValidator !== undefined && !batchValidator(batch)) {
    issues.push({
      tag: "publishedValue",
      member: "evaluationBatch",
      path: "/batch",
      errors: [...(batchValidator.errors ?? [])],
    });
  }

  const caseValidator = validators.get("case");
  const cases = asRecord(batch)?.cases;
  if (caseValidator !== undefined && Array.isArray(cases)) {
    for (const [index, oracleCase] of cases.entries()) {
      if (!caseValidator(oracleCase)) {
        issues.push({
          tag: "publishedValue",
          member: "case",
          path: `/batch/cases/${index}`,
          errors: [...(caseValidator.errors ?? [])],
        });
      }
    }
  }

  const traceValidator = validators.get("trace");
  if (traceValidator !== undefined && Array.isArray(traces)) {
    for (const [index, trace] of traces.entries()) {
      if (!traceValidator(trace)) {
        issues.push({
          tag: "publishedValue",
          member: "trace",
          path: `/traces/${index}`,
          errors: [...(traceValidator.errors ?? [])],
        });
      }
    }
  }
  return issues;
}

function evaluateLiveCorpus(
  corpus: OracleCorpus,
  services: OracleEvaluationServices,
): Result.Result<readonly OracleTrace[], unknown> {
  // Check evaluates the admitted committed batch, preserving corpus order and
  // identity. The source builder is used only by generate/write.
  return evaluateAdmittedBatch(corpus, services);
}

function evaluateAdmittedBatch(
  corpus: OracleCorpus,
  services: OracleEvaluationServices,
): Result.Result<readonly OracleTrace[], unknown> {
  try {
    return Result.succeed(
      evaluateOracleBatch({ batch: corpus.batch, services }),
    );
  } catch (cause) {
    return Result.fail(cause);
  }
}

function compareLiveTraces(
  committed: OracleCorpus,
  live: readonly OracleTrace[],
): readonly OracleCorpusValidationIssue[] {
  const issues: OracleCorpusValidationIssue[] = [];
  if (committed.traces.length !== live.length) {
    issues.push({
      tag: "traceLengthMismatch",
      committed: committed.traces.length,
      live: live.length,
    });
  }
  const count = Math.max(committed.traces.length, live.length);
  for (let index = 0; index < count; index += 1) {
    const committedTrace = committed.traces[index];
    const liveTrace = live[index];
    if (committedTrace === undefined || liveTrace === undefined) continue;
    const committedKey = canonicalStructuralKey(committedTrace);
    const liveKey = canonicalStructuralKey(liveTrace);
    if (committedKey !== liveKey) {
      issues.push({
        tag: "traceMismatch",
        position: index,
        committed: committedTrace,
        live: liveTrace,
      });
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
    error,
  };
}

function sourceBuildFailed(
  issues: ReadonlyNonEmptyArray<OracleSourceIssue>,
): Extract<OracleEvaluationCliError, { readonly tag: "sourceBuildFailed" }> {
  return { tag: "sourceBuildFailed", issues };
}

function catalogBuildFailed(
  issues: ReadonlyNonEmptyArray<OracleCatalogIssue>,
): Extract<OracleEvaluationCliError, { readonly tag: "catalogBuildFailed" }> {
  return { tag: "catalogBuildFailed", issues };
}

function corpusValidationFailed(
  issues: ReadonlyNonEmptyArray<OracleCorpusValidationIssue>,
): Extract<
  OracleEvaluationCliError,
  { readonly tag: "corpusValidationFailed" }
> {
  return { tag: "corpusValidationFailed", issues };
}

function terminalError(
  error: PlatformError,
): Extract<OracleEvaluationCliError, { readonly tag: "terminalFailed" }> {
  return { tag: "terminalFailed", error };
}

function sourceIssue(issue: OracleCorpusIssue): OracleSourceIssue {
  return { tag: "sourceIssue", issue };
}

function unitCatalogIssue(issue: UnitCatalogBuildIssue): OracleCatalogIssue {
  return { tag: "unitCatalogIssue", issue };
}

function statBlockCatalogIssue(
  issue: StatBlockCatalogBuildIssue,
): OracleCatalogIssue {
  return { tag: "statBlockCatalogIssue", issue };
}

function catalogBuildDefect(
  catalog: "unit" | "statBlock",
  cause: unknown,
): OracleCatalogIssue {
  return { tag: "catalogBuildDefect", catalog, cause };
}

function oneCorpusIssue(
  issue: OracleCorpusValidationIssue,
): readonly OracleCorpusValidationIssue[] {
  return [issue];
}

function runMain(): void {
  const services = buildProductionOracleEvaluationServices();
  const program = Result.isFailure(services)
    ? Effect.fail(services.failure)
    : runOracleEvaluationCli(process.argv, services.success);
  NodeRuntime.runMain(program.pipe(Effect.provide(NodeServices.layer)));
}

const invokedScript = process.argv[1];
if (
  invokedScript !== undefined &&
  import.meta.url === pathToFileURL(invokedScript).href
) {
  runMain();
}
