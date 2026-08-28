import { Either, Schema } from "effect";

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
}).annotations({
  identifier: "OracleCorpus",
  parseOptions: { onExcessProperty: "error" },
});

const OracleCorpusWithPositionalLengthSchema = OracleCorpusShapeSchema.pipe(
  Schema.filter(
    (corpus) => corpus.batch.cases.length === corpus.traces.length,
    {
      message: () =>
        "Oracle corpus traces must have one entry for every batch Case.",
      ...semanticRefinement("corpusBatchTraceLengthCorrelation"),
    },
  ),
);

export const OracleCorpusSchema = OracleCorpusWithPositionalLengthSchema.pipe(
  Schema.brand("OracleCorpus"),
).annotations({
  identifier: "OracleCorpus",
  parseOptions: { onExcessProperty: "error" },
});
export type OracleCorpus = Schema.Schema.Type<typeof OracleCorpusSchema>;

export const OracleCorpusDocumentSchema = documentSchema(OracleCorpusSchema);
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
): Either.Either<OracleCorpus, OracleCorpusIssues> {
  const sourceCases = oracleEvaluationSourceCases(services);
  if (Either.isLeft(sourceCases)) return Either.left([sourceCases.left]);
  return buildOracleCorpus({ cases: sourceCases.right, services });
}

/**
 * Construct the one ordered batch and evaluate it once. Cases are the only
 * authoring input; traces are derived from that batch and are not evaluated
 * independently.
 */
export function buildOracleCorpus(
  input: OracleCorpusEvaluationInput,
): Either.Either<OracleCorpus, OracleCorpusIssues> {
  const batch = OracleEvaluationBatchSchema.make({ cases: input.cases });
  const evaluatedTraces = evaluateCorpusTraces({
    batch,
    services: input.services,
  });
  if (Either.isLeft(evaluatedTraces)) {
    return Either.left([evaluatedTraces.left]);
  }
  const traces = evaluatedTraces.right;
  if (traces.length !== batch.cases.length) {
    return Either.left([
      {
        tag: "traceCountMismatch",
        expected: batch.cases.length,
        actual: traces.length,
      },
    ]);
  }
  const [firstTrace, ...remainingTraces] = traces;
  if (firstTrace === undefined) {
    return Either.left([
      {
        tag: "traceCountMismatch",
        expected: batch.cases.length,
        actual: traces.length,
      },
    ]);
  }
  return Either.right(
    OracleCorpusSchema.make({
      batch,
      traces: [firstTrace, ...remainingTraces],
    }),
  );
}

export function admitOracleCorpusDocument(
  document: OracleCorpusDocument,
): Either.Either<OracleCorpus, OracleDecodeIssues> {
  const decoded = decodeWithSchema(
    OracleCorpusSchema,
    canonicalizeOracleCorpusInput(document),
  );
  return Either.isLeft(decoded)
    ? Either.left(repathCorpusIssues(decoded.left))
    : decoded;
}

export function decodeOracleCorpusDocument(
  input: unknown,
): Either.Either<OracleCorpusDocument, OracleDecodeIssues> {
  return decodeWithSchema(
    OracleCorpusDocumentSchema,
    canonicalizeOracleCorpusInput(input),
  );
}

export function decodeOracleCorpus(
  input: unknown,
): Either.Either<OracleCorpus, OracleDecodeIssues> {
  const document = decodeOracleCorpusDocument(input);
  return Either.isLeft(document)
    ? Either.left(document.left)
    : admitOracleCorpusDocument(document.right);
}

export function decodeOracleCorpusJson(
  input: string,
): Either.Either<OracleCorpus, OracleDecodeIssues> {
  const parsed = parseJsonWithDuplicateDetection(input);
  return Either.isLeft(parsed)
    ? Either.left(parsed.left)
    : decodeOracleCorpus(parsed.right);
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
): Either.Either<readonly OracleTrace[], OracleCorpusIssue> {
  try {
    return Either.right(evaluateOracleBatch(input));
  } catch (error) {
    return Either.left({
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
