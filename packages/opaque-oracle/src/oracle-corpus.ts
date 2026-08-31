import { Result, Schema } from "effect";

import type { OracleEvaluationServices } from "./oracle-evaluation.ts";
import { evaluateOracleBatch } from "./oracle-evaluation.ts";
import {
  decodeWithSchema,
  parseJsonWithDuplicateDetection,
  type OracleDecodeIssues,
} from "./oracle-decode.ts";
import {
  canonicalizeBatchInput,
  canonicalizeTraceInput,
} from "./oracle-input-canonical.ts";
import { documentJsonSchema, documentSchema } from "./oracle-document.ts";
import {
  OracleEvaluationBatchSchema,
  OracleTraceSchema,
  type OracleCase,
  type OracleTrace,
} from "./oracle-case-trace-schema.ts";
import { semanticRefinement } from "@dnd/shared/semantic-refinement";
import {
  oracleEvaluationSourceCases,
  type OracleEvaluationSourceIssue,
} from "./oracle-evaluation-corpus-source.ts";

const OracleCorpusShapeSchema = Schema.Struct({
  batch: OracleEvaluationBatchSchema,
  traces: Schema.NonEmptyArray(OracleTraceSchema),
}).annotate({
  identifier: "OracleCorpus",
  parseOptions: { onExcessProperty: "error" },
});

const OracleCorpusWithPositionalLengthSchema = OracleCorpusShapeSchema.pipe(
  Schema.check(
    Schema.makeFilter(
      (corpus) => corpus.batch.cases.length === corpus.traces.length,
      {
        message:
          "Oracle corpus traces must have one entry for every batch Case.",
        ...semanticRefinement("corpusBatchTraceLengthCorrelation"),
      },
    ),
  ),
);

export const OracleCorpusSchema = OracleCorpusWithPositionalLengthSchema.pipe(
  Schema.brand("OracleCorpus"),
).annotate({
  identifier: "OracleCorpus",
  parseOptions: { onExcessProperty: "error" },
});
export type OracleCorpus = Schema.Schema.Type<typeof OracleCorpusSchema>;

function requireAuthoredOracleCorpusDocumentSchema() {
  return Result.getOrThrowWith(
    documentSchema(OracleCorpusSchema),
    ([issue]) =>
      new Error(
        `Invalid authored Oracle Corpus Document schema (${issue.tag} at ${issue.path}).`,
      ),
  );
}

export const OracleCorpusDocumentSchema =
  requireAuthoredOracleCorpusDocumentSchema();
export const OracleCorpusDocumentJsonSchema = documentJsonSchema(
  OracleCorpusDocumentSchema,
);
export type OracleCorpusDocument = Schema.Schema.Type<
  typeof OracleCorpusDocumentSchema
>;

export type OracleCorpusCases = readonly [OracleCase, ...OracleCase[]];

export type OracleCorpusEvaluationInput = {
  readonly cases: OracleCorpusCases;
  readonly services: OracleEvaluationServices;
};

export type OracleCorpusIssue =
  | OracleEvaluationSourceIssue
  | {
      readonly tag: "evaluationDefect";
      readonly message: string;
    }
  | {
      readonly tag: "traceCountMismatch";
      readonly expected: number;
      readonly actual: number;
    };

export type OracleCorpusIssues = readonly [
  OracleCorpusIssue,
  ...OracleCorpusIssue[],
];

/** Build the committed ordered source corpus and evaluate its batch once. */
export function buildOracleEvaluationCorpus(
  services: OracleEvaluationServices,
): Result.Result<OracleCorpus, OracleCorpusIssues> {
  const sourceCases = oracleEvaluationSourceCases(services);
  if (Result.isFailure(sourceCases)) return Result.fail([sourceCases.failure]);
  return buildOracleCorpus({ cases: sourceCases.success, services });
}

/**
 * Construct the one ordered batch and evaluate it once. Cases are the only
 * authoring input; traces are derived from that batch and are not evaluated
 * independently.
 */
export function buildOracleCorpus(
  input: OracleCorpusEvaluationInput,
): Result.Result<OracleCorpus, OracleCorpusIssues> {
  const batch = OracleEvaluationBatchSchema.make({ cases: input.cases });
  const evaluatedTraces = evaluateCorpusTraces({
    batch,
    services: input.services,
  });
  if (Result.isFailure(evaluatedTraces)) {
    return Result.fail([evaluatedTraces.failure]);
  }
  const traces = evaluatedTraces.success;
  if (traces.length !== batch.cases.length) {
    return Result.fail([
      {
        tag: "traceCountMismatch",
        expected: batch.cases.length,
        actual: traces.length,
      },
    ]);
  }
  const [firstTrace, ...remainingTraces] = traces;
  if (firstTrace === undefined) {
    return Result.fail([
      {
        tag: "traceCountMismatch",
        expected: batch.cases.length,
        actual: traces.length,
      },
    ]);
  }
  return Result.succeed(
    OracleCorpusSchema.make({
      batch,
      traces: [firstTrace, ...remainingTraces],
    }),
  );
}

export function admitOracleCorpusDocument(
  document: OracleCorpusDocument,
): Result.Result<OracleCorpus, OracleDecodeIssues> {
  const decoded = decodeWithSchema(
    OracleCorpusSchema,
    canonicalizeOracleCorpusInput(document),
  );
  return Result.isFailure(decoded)
    ? Result.fail(repathCorpusIssues(decoded.failure))
    : decoded;
}

export function decodeOracleCorpusDocument(
  input: unknown,
): Result.Result<OracleCorpusDocument, OracleDecodeIssues> {
  return decodeWithSchema(
    OracleCorpusDocumentSchema,
    canonicalizeOracleCorpusInput(input),
  );
}

export function decodeOracleCorpus(
  input: unknown,
): Result.Result<OracleCorpus, OracleDecodeIssues> {
  const document = decodeOracleCorpusDocument(input);
  return Result.isFailure(document)
    ? Result.fail(document.failure)
    : admitOracleCorpusDocument(document.success);
}

export function decodeOracleCorpusJson(
  input: string,
): Result.Result<OracleCorpus, OracleDecodeIssues> {
  const parsed = parseJsonWithDuplicateDetection(input);
  return Result.isFailure(parsed)
    ? Result.fail(parsed.failure)
    : decodeOracleCorpus(parsed.success);
}

/** Serialize the corpus as formatter-stable, deterministic JSON with a final newline. */
export function serializeOracleCorpus(
  corpus: OracleCorpus | OracleCorpusDocument,
): Buffer {
  return Buffer.from(
    `${JSON.stringify(canonicalizeOracleCorpusInput(corpus), null, 2)}\n`,
    "utf8",
  );
}

function evaluateCorpusTraces(
  input: Parameters<typeof evaluateOracleBatch>[0],
): Result.Result<readonly OracleTrace[], OracleCorpusIssue> {
  try {
    return Result.succeed(evaluateOracleBatch(input));
  } catch (error) {
    return Result.fail({
      tag: "evaluationDefect",
      message: safeErrorMessage(error),
    });
  }
}

function canonicalizeOracleCorpusInput(input: unknown): unknown {
  try {
    if (!isRecord(input)) return input;
    const canonicalBatch =
      input.batch === undefined
        ? undefined
        : canonicalizeBatchInput(input.batch);
    const canonicalTraces = Array.isArray(input.traces)
      ? input.traces.map((trace) => canonicalizeTraceInput(trace))
      : undefined;
    return {
      ...input,
      ...(canonicalBatch === undefined ? {} : { batch: canonicalBatch }),
      ...(canonicalTraces === undefined ? {} : { traces: canonicalTraces }),
    };
  } catch {
    return input;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  try {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  } catch {
    return false;
  }
}

function safeErrorMessage(error: unknown): string {
  try {
    return error instanceof Error ? error.message : String(error);
  } catch {
    return "Unknown Oracle corpus evaluation failure";
  }
}

function repathCorpusIssues(issues: OracleDecodeIssues): OracleDecodeIssues {
  const [first, ...rest] = issues;
  if (first === undefined) return [{ path: "", code: "wrongType" }];
  const repath = (issue: OracleDecodeIssues[number]) =>
    issue.path === "" && issue.code === "nonCanonicalDomainValue"
      ? { ...issue, path: "/traces" }
      : issue;
  return [repath(first), ...rest.map(repath)];
}
