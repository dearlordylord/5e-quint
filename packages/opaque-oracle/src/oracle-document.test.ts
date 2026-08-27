import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

import {
  OracleCaseDocumentJsonSchema,
  OracleEvaluationBatchDocumentJsonSchema,
  OracleTraceDocumentJsonSchema,
} from "./oracle-document.ts";

const documentSchemas = [
  ["Case", OracleCaseDocumentJsonSchema],
  ["Trace", OracleTraceDocumentJsonSchema],
  ["Evaluation Batch", OracleEvaluationBatchDocumentJsonSchema],
] as const;

describe("Opaque Oracle document JSON Schemas", () => {
  it("compiles every derived document graph with an independent Ajv2020", () => {
    for (const [name, schema] of documentSchemas) {
      expect(() =>
        new Ajv2020({
          strict: false,
          inlineRefs: false,
          code: { optimize: 0 },
        }).compile(schema),
      ).not.toThrow(`the ${name} document schema should compile`);
    }
  }, 120_000);
});
