import { FileSystem, Path, Terminal } from "@effect/platform";
import { SystemError } from "@effect/platform/Error";
import { Effect, Either, Layer, Option } from "effect";
import { describe, expect, test } from "vitest";

import {
  ORACLE_PUBLICATION_ARTIFACTS,
  ORACLE_PUBLICATION_MEMBERS,
  type OraclePublicationMember,
} from "../src/oracle-publication.ts";
import {
  buildOracleCorpus,
  decodeOracleCase,
  serializeOracleCorpus,
  type OracleCorpus,
  type OracleEvaluationServices,
} from "../src/index.ts";
import {
  buildProductionOracleEvaluationServices,
  runOracleEvaluationCli,
  type OracleEvaluationCorpusBuilder,
  writeOracleEvaluationCorpusAtomically,
} from "./oracle-evaluation-cli.ts";

const services = emptyEvaluationServices();
const fixtureCorpus = createFixtureCorpus();
const buildFixtureCorpus: OracleEvaluationCorpusBuilder = () =>
  Either.right(fixtureCorpus);

describe("Opaque Oracle evaluation CLI", () => {
  test("production composition builds populated evaluator catalogs once", () => {
    const result = buildProductionOracleEvaluationServices();

    expect(Either.isRight(result)).toBe(true);
    if (Either.isLeft(result)) return;
    expect(result.right.unitLibrary.listUnits()).not.toHaveLength(0);
    expect(result.right.statBlockCatalog.listStatBlocks()).not.toHaveLength(0);
  });

  test("generate validates and writes only to stdout", async () => {
    const expected = fixtureCorpusBytes();
    const events: string[] = [];
    const output: string[] = [];
    const result = await runWithPlatform(
      runOracleEvaluationCli(["generate"], services, {
        buildCorpus: buildFixtureCorpus,
      }),
      readOnlyFileSystem(expected, events),
      recordingTerminal(output),
    );

    expect(Either.isRight(result)).toBe(true);
    expect(output).toEqual([expected.toString("utf8")]);
    expect(events).toEqual([]);
  });

  test("check reads the corpus and schemas without filesystem mutation", async () => {
    const expected = fixtureCorpusBytes();
    const events: string[] = [];
    const output: string[] = [];
    const result = await runWithPlatform(
      runOracleEvaluationCli(
        [
          "check",
          "--corpus",
          "corpus/oracle-evaluation-corpus.json",
          "--publication-directory",
          "publication",
        ],
        services,
        { buildCorpus: buildFixtureCorpus },
      ),
      readOnlyFileSystem(expected, events),
      recordingTerminal(output),
    );

    expect(Either.isRight(result)).toBe(true);
    expect(output).toHaveLength(1);
    expect(events).toEqual([]);
  });

  test("write creates the target directory, replaces atomically, and cleans up", async () => {
    const target = "corpus/nested/oracle-evaluation-corpus.json";
    const temporary = "corpus/nested/.oracle-evaluation-corpus.json.test.tmp";
    const files = new Map<string, Uint8Array>([
      [target, Buffer.from("old\n", "utf8")],
    ]);
    const events: string[] = [];
    const fileSystem = recordingFileSystem(files, events, temporary, false);
    const bytes = Buffer.from('{"batch":{},"traces":[]}\n', "utf8");
    const result = await runWithPath(
      writeOracleEvaluationCorpusAtomically(fileSystem, target, bytes),
      fileSystem,
    );

    expect(Either.isRight(result)).toBe(true);
    expect(events).toEqual([
      "directory:corpus/nested:true",
      `temporary:${temporary}:corpus/nested:.oracle-evaluation-corpus.json.:.tmp`,
      `write:${temporary}:w`,
      `rename:${temporary}->${target}`,
      `remove:${temporary}`,
    ]);
    expect(Buffer.from(files.get(target) ?? []).toString("utf8")).toBe(
      bytes.toString("utf8"),
    );
    expect(files.has(temporary)).toBe(false);
  });

  test("write command validates before recording any mutation", async () => {
    const target = "corpus/command/oracle-evaluation-corpus.json";
    const temporary =
      "corpus/command/.oracle-evaluation-corpus.json.command.tmp";
    const files = new Map<string, Uint8Array>([
      [target, Buffer.from("previous\n", "utf8")],
    ]);
    const events: string[] = [];
    const output: string[] = [];
    const fileSystem = recordingFileSystem(files, events, temporary, false);
    const expected = fixtureCorpusBytes();
    const result = await runWithPlatform(
      runOracleEvaluationCli(
        ["write", "--corpus", target, "--publication-directory", "publication"],
        services,
        { buildCorpus: buildFixtureCorpus },
      ),
      fileSystem,
      recordingTerminal(output),
    );

    expect(Either.isRight(result)).toBe(true);
    expect(events).toEqual([
      "directory:corpus/command:true",
      `temporary:${temporary}:corpus/command:.oracle-evaluation-corpus.json.:.tmp`,
      `write:${temporary}:w`,
      `rename:${temporary}->${target}`,
      `remove:${temporary}`,
    ]);
    expect(Buffer.from(files.get(target) ?? []).toString("utf8")).toBe(
      expected.toString("utf8"),
    );
    expect(output).toHaveLength(1);
  });

  test("write failure removes the temporary file and preserves the target", async () => {
    const target = "corpus/oracle-evaluation-corpus.json";
    const temporary = "corpus/.oracle-evaluation-corpus.json.failure.tmp";
    const original = Buffer.from("committed\n", "utf8");
    const files = new Map<string, Uint8Array>([[target, original]]);
    const events: string[] = [];
    const fileSystem = recordingFileSystem(files, events, temporary, true);
    const result = await runWithPath(
      writeOracleEvaluationCorpusAtomically(
        fileSystem,
        target,
        Buffer.from("candidate\n", "utf8"),
      ),
      fileSystem,
    );

    expect(Either.isLeft(result)).toBe(true);
    expect(events).toEqual([
      "directory:corpus:true",
      `temporary:${temporary}:corpus:.oracle-evaluation-corpus.json.:.tmp`,
      `write:${temporary}:w`,
      `remove:${temporary}`,
    ]);
    expect(Buffer.from(files.get(target) ?? []).toString("utf8")).toBe(
      original.toString("utf8"),
    );
    expect(files.has(temporary)).toBe(false);
  });

  test("check fails closed when a committed schema is missing", async () => {
    const result = await runWithPlatform(
      runOracleEvaluationCli(
        ["check", "--corpus", "corpus/oracle-evaluation-corpus.json"],
        services,
        { buildCorpus: buildFixtureCorpus },
      ),
      validationFileSystem(fixtureCorpusBytes(), { trace: "missing" }),
      recordingTerminal([]),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isRight(result)) return;
    expect(result.left).toMatchObject({ tag: "corpusValidationFailed" });
    expect(result.left).toMatchObject({
      issues: expect.arrayContaining([
        expect.stringContaining("oracle-trace.schema.json"),
      ]),
    });
  });

  test("check fails closed when a committed schema is stale", async () => {
    const staleTraceSchema = Buffer.concat([
      ORACLE_PUBLICATION_ARTIFACTS.trace.bytes,
      Buffer.from(" ", "utf8"),
    ]);
    const result = await runWithPlatform(
      runOracleEvaluationCli(
        ["check", "--corpus", "corpus/oracle-evaluation-corpus.json"],
        services,
        { buildCorpus: buildFixtureCorpus },
      ),
      validationFileSystem(fixtureCorpusBytes(), { trace: staleTraceSchema }),
      recordingTerminal([]),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isRight(result)) return;
    expect(result.left).toMatchObject({ tag: "corpusValidationFailed" });
    expect(result.left).toMatchObject({
      issues: expect.arrayContaining([
        expect.stringContaining("publication artifact is out of sync"),
      ]),
    });
  });

  test.each([
    ["malformed JSON", "{\n"],
    ["duplicate raw members", '{"batch":{},"batch":{},"traces":[]}\n'],
  ])("check fails closed for %s corpus JSON", async (_label, text) => {
    const result = await runWithPlatform(
      runOracleEvaluationCli(
        ["check", "--corpus", "corpus/oracle-evaluation-corpus.json"],
        services,
        { buildCorpus: buildFixtureCorpus },
      ),
      validationFileSystem(Buffer.from(text, "utf8")),
      recordingTerminal([]),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isRight(result)) return;
    expect(result.left).toMatchObject({ tag: "corpusValidationFailed" });
    expect(result.left).toMatchObject({
      issues: expect.arrayContaining([
        expect.stringMatching(/duplicate|JSON|json/i),
      ]),
    });
  });

  test("check fails closed when a live trace differs at the same position", async () => {
    const corpus = JSON.parse(fixtureCorpusBytes().toString("utf8")) as {
      readonly traces: Array<{
        readonly creation: {
          readonly started: unknown;
          progression: unknown[];
        };
      }>;
    };
    const firstTrace = corpus.traces[0];
    if (firstTrace === undefined) throw new Error("Fixture has no trace.");
    firstTrace.creation.progression = [firstTrace.creation.started];
    const changedCorpus = Buffer.from(`${JSON.stringify(corpus)}\n`, "utf8");

    const result = await runWithPlatform(
      runOracleEvaluationCli(
        ["check", "--corpus", "corpus/oracle-evaluation-corpus.json"],
        services,
        { buildCorpus: buildFixtureCorpus },
      ),
      validationFileSystem(changedCorpus),
      recordingTerminal([]),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isRight(result)) return;
    expect(result.left).toMatchObject({ tag: "corpusValidationFailed" });
    expect(result.left).toMatchObject({
      issues: expect.arrayContaining([
        expect.stringContaining("trace mismatch at position 0"),
      ]),
    });
  });

  test("generate converts an unexpected source-builder failure to a typed error", async () => {
    const events: string[] = [];
    const result = await runWithPlatform(
      runOracleEvaluationCli(["generate"], services, {
        buildCorpus: () => {
          throw new Error("fixture source failure");
        },
      }),
      readOnlyFileSystem(fixtureCorpusBytes(), events),
      recordingTerminal([]),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isRight(result)) return;
    expect(result.left).toMatchObject({ tag: "sourceBuildFailed" });
    expect(result.left).toMatchObject({
      issues: ["fixture source failure"],
    });
    expect(events).toEqual([]);
  });

  test("check reports corpus read failures as typed filesystem errors", async () => {
    const result = await runWithPlatform(
      runOracleEvaluationCli(
        ["check", "--corpus", "corpus/missing.json"],
        services,
        { buildCorpus: buildFixtureCorpus },
      ),
      failingCorpusReadFileSystem(),
      recordingTerminal([]),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isRight(result)) return;
    expect(result.left).toMatchObject({
      tag: "filesystemFailed",
      operation: "read",
      path: "corpus/missing.json",
    });
  });
});

function fixtureCorpusBytes(): Buffer {
  return serializeOracleCorpus(fixtureCorpus);
}

function createFixtureCorpus(): OracleCorpus {
  const result = buildOracleCorpus({
    cases: [fixtureCase()],
    services,
  });
  if (Either.isLeft(result)) {
    throw new Error(
      `CLI fixture corpus failed: ${JSON.stringify(result.left)}`,
    );
  }
  return result.right;
}

function fixtureCase() {
  const result = decodeOracleCase({
    creation: { fillBatches: [] },
    sheet: { tag: "ordinary" },
    battle: {
      roster: { tag: "statBlocks", entries: [] },
      attempts: [],
    },
  });
  if (Either.isLeft(result)) {
    throw new Error(`CLI fixture Case failed: ${JSON.stringify(result.left)}`);
  }
  return result.right;
}

function emptyEvaluationServices(): OracleEvaluationServices {
  return {
    unitLibrary: {
      getUnit: () => Option.none(),
      listUnits: () => [],
      requireUnit: impossibleLookup,
    },
    statBlockCatalog: {
      getStatBlock: () => Option.none(),
      listStatBlocks: () => [],
      requireStatBlock: impossibleLookup,
    },
  };
}

function impossibleLookup(identifier: string): never {
  throw new Error(`Unexpected fixture catalog lookup: ${identifier}`);
}

function readOnlyFileSystem(
  corpus: Uint8Array,
  events: string[],
): FileSystem.FileSystem {
  return FileSystem.makeNoop({
    readFileString: () => Effect.succeed(Buffer.from(corpus).toString("utf8")),
    readFile: (path) => {
      const member = ORACLE_PUBLICATION_MEMBERS.find((candidate) =>
        path.endsWith(ORACLE_PUBLICATION_ARTIFACTS[candidate].fileName),
      );
      return Effect.succeed(
        member === undefined
          ? Buffer.from(corpus)
          : ORACLE_PUBLICATION_ARTIFACTS[member].bytes,
      );
    },
    makeDirectory: () => {
      events.push("unexpected directory mutation");
      return Effect.succeed(undefined);
    },
    makeTempFile: () => {
      events.push("unexpected temporary mutation");
      return Effect.succeed("unexpected.tmp");
    },
    writeFile: () => {
      events.push("unexpected write mutation");
      return Effect.succeed(undefined);
    },
    rename: () => {
      events.push("unexpected rename mutation");
      return Effect.succeed(undefined);
    },
    remove: () => {
      events.push("unexpected remove mutation");
      return Effect.succeed(undefined);
    },
  });
}

function validationFileSystem(
  corpus: Uint8Array,
  schemaOverrides: Partial<
    Record<OraclePublicationMember, Uint8Array | "missing">
  > = {},
): FileSystem.FileSystem {
  return FileSystem.makeNoop({
    readFileString: () => Effect.succeed(Buffer.from(corpus).toString("utf8")),
    readFile: (path) => {
      const member = ORACLE_PUBLICATION_MEMBERS.find((candidate) =>
        path.endsWith(ORACLE_PUBLICATION_ARTIFACTS[candidate].fileName),
      );
      if (member === undefined) {
        return Effect.fail(
          new SystemError({
            reason: "Unknown",
            module: "FileSystem",
            method: "readFile",
            description: "unknown fixture path",
            pathOrDescriptor: path,
          }),
        );
      }
      const override = schemaOverrides[member];
      if (override === "missing") {
        return Effect.fail(
          new SystemError({
            reason: "NotFound",
            module: "FileSystem",
            method: "readFile",
            description: "missing fixture schema",
            pathOrDescriptor: path,
          }),
        );
      }
      return Effect.succeed(
        override ?? ORACLE_PUBLICATION_ARTIFACTS[member].bytes,
      );
    },
  });
}

function failingCorpusReadFileSystem(): FileSystem.FileSystem {
  return FileSystem.makeNoop({
    readFileString: (path) =>
      Effect.fail(
        new SystemError({
          reason: "NotFound",
          module: "FileSystem",
          method: "readFileString",
          description: "missing fixture corpus",
          pathOrDescriptor: path,
        }),
      ),
  });
}

function recordingFileSystem(
  files: Map<string, Uint8Array>,
  events: string[],
  temporary: string,
  failWrite: boolean,
): FileSystem.FileSystem {
  return FileSystem.makeNoop({
    readFile: (path) => {
      const member = ORACLE_PUBLICATION_MEMBERS.find((candidate) =>
        path.endsWith(ORACLE_PUBLICATION_ARTIFACTS[candidate].fileName),
      );
      return Effect.succeed(
        member === undefined
          ? Buffer.from([])
          : ORACLE_PUBLICATION_ARTIFACTS[member].bytes,
      );
    },
    makeDirectory: (path, options) => {
      events.push(`directory:${path}:${String(options?.recursive)}`);
      return Effect.succeed(undefined);
    },
    makeTempFile: (options) => {
      events.push(
        `temporary:${temporary}:${options?.directory}:${options?.prefix}:${options?.suffix}`,
      );
      files.set(temporary, Buffer.alloc(0));
      return Effect.succeed(temporary);
    },
    writeFile: (path, data, options) => {
      events.push(`write:${path}:${options?.flag}`);
      if (failWrite) {
        return Effect.fail(
          new SystemError({
            reason: "Unknown",
            module: "FileSystem",
            method: "writeFile",
            description: "fixture write failure",
            pathOrDescriptor: path,
          }),
        );
      }
      files.set(path, Buffer.from(data));
      return Effect.succeed(undefined);
    },
    rename: (oldPath, newPath) => {
      events.push(`rename:${oldPath}->${newPath}`);
      const data = files.get(oldPath);
      if (data !== undefined) files.set(newPath, data);
      files.delete(oldPath);
      return Effect.succeed(undefined);
    },
    remove: (path) => {
      events.push(`remove:${path}`);
      files.delete(path);
      return Effect.succeed(undefined);
    },
  });
}

function recordingTerminal(output: string[]): Terminal.Terminal {
  return {
    display: (text: string) => {
      output.push(text);
      return Effect.succeed(undefined);
    },
  } as unknown as Terminal.Terminal;
}

function runWithPlatform<A, E>(
  effect: Effect.Effect<
    A,
    E,
    FileSystem.FileSystem | Path.Path | Terminal.Terminal
  >,
  fileSystem: FileSystem.FileSystem,
  terminal: Terminal.Terminal,
) {
  return Effect.runPromise(
    effect.pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.succeed(FileSystem.FileSystem, fileSystem),
          Path.layer,
          Layer.succeed(Terminal.Terminal, terminal),
        ),
      ),
      Effect.either,
    ),
  );
}

function runWithPath<A, E>(
  effect: Effect.Effect<A, E, FileSystem.FileSystem | Path.Path>,
  fileSystem: FileSystem.FileSystem,
) {
  return Effect.runPromise(
    effect.pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.succeed(FileSystem.FileSystem, fileSystem),
          Path.layer,
        ),
      ),
      Effect.either,
    ),
  );
}
