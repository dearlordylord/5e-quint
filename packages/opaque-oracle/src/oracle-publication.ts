import {
  OracleCaseDocumentJsonSchema,
  OracleEvaluationBatchDocumentJsonSchema,
  OracleTraceDocumentJsonSchema,
  documentJsonSchema,
} from "./oracle-document.ts";

/** The source-owned Document graphs that the Opaque Oracle publishes. */
export const ORACLE_PUBLICATION_MEMBERS = [
  "case",
  "trace",
  "evaluationBatch",
] as const;
export type OraclePublicationMember =
  (typeof ORACLE_PUBLICATION_MEMBERS)[number];

export const ORACLE_PUBLICATION_FILE_NAMES = {
  case: "oracle-case.schema.json",
  trace: "oracle-trace.schema.json",
  evaluationBatch: "oracle-evaluation-batch.schema.json",
} as const satisfies Readonly<Record<OraclePublicationMember, string>>;

export const ORACLE_PUBLICATION_ROOT_IDS = {
  case: "urn:dnd:opaque-oracle:oracle-case.schema.json",
  trace: "urn:dnd:opaque-oracle:oracle-trace.schema.json",
  evaluationBatch: "urn:dnd:opaque-oracle:oracle-evaluation-batch.schema.json",
} as const satisfies Readonly<Record<OraclePublicationMember, string>>;

export function isOraclePublicationArtifactFileName(fileName: string): boolean {
  return ORACLE_PUBLICATION_MEMBERS.some(
    (member) => ORACLE_PUBLICATION_FILE_NAMES[member] === fileName,
  );
}

type DocumentJsonSchema = ReturnType<typeof documentJsonSchema>;

function withPublicationRootId<T extends DocumentJsonSchema>(
  schema: T,
  rootId: string,
): T & { readonly $id: string } {
  return { ...schema, $id: rootId };
}

const caseSchema = withPublicationRootId(
  OracleCaseDocumentJsonSchema,
  ORACLE_PUBLICATION_ROOT_IDS.case,
);
const traceSchema = withPublicationRootId(
  OracleTraceDocumentJsonSchema,
  ORACLE_PUBLICATION_ROOT_IDS.trace,
);
const evaluationBatchSchema = withPublicationRootId(
  OracleEvaluationBatchDocumentJsonSchema,
  ORACLE_PUBLICATION_ROOT_IDS.evaluationBatch,
);

export function serializeOraclePublicationArtifact(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
}

export const ORACLE_PUBLICATION_ARTIFACTS = {
  case: {
    fileName: ORACLE_PUBLICATION_FILE_NAMES.case,
    rootId: ORACLE_PUBLICATION_ROOT_IDS.case,
    schema: caseSchema,
    bytes: serializeOraclePublicationArtifact(caseSchema),
  },
  trace: {
    fileName: ORACLE_PUBLICATION_FILE_NAMES.trace,
    rootId: ORACLE_PUBLICATION_ROOT_IDS.trace,
    schema: traceSchema,
    bytes: serializeOraclePublicationArtifact(traceSchema),
  },
  evaluationBatch: {
    fileName: ORACLE_PUBLICATION_FILE_NAMES.evaluationBatch,
    rootId: ORACLE_PUBLICATION_ROOT_IDS.evaluationBatch,
    schema: evaluationBatchSchema,
    bytes: serializeOraclePublicationArtifact(evaluationBatchSchema),
  },
} as const satisfies Readonly<
  Record<
    OraclePublicationMember,
    {
      readonly fileName: string;
      readonly rootId: string;
      readonly schema: DocumentJsonSchema & { readonly $id: string };
      readonly bytes: Buffer;
    }
  >
>;
