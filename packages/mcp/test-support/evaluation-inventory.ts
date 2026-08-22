import { readFileSync } from "node:fs";

import { Schema } from "effect";

export const McpEvaluationCaseSchema = Schema.Struct({
  id: Schema.String,
  kind: Schema.String,
  prompt: Schema.String,
  after: Schema.optionalWith(Schema.String, { exact: true }),
  expectedToolNames: Schema.Array(Schema.String),
});

export const SkillEvaluationCaseSchema = Schema.Struct({
  id: Schema.String,
  kind: Schema.String,
  prompt: Schema.String,
  after: Schema.optionalWith(Schema.String, { exact: true }),
  expectedActivation: Schema.Literal("activate", "doNotActivate"),
});

export const EvaluationInventorySchema = Schema.Struct({
  officialGuidance: Schema.Literal(
    "https://developers.openai.com/plugins/deploy/connect-chatgpt",
  ),
  evidenceOwners: Schema.Struct({
    localMcp: Schema.Struct({
      kind: Schema.Literal("automatedTest"),
      testPath: Schema.Literal(
        "packages/mcp/src/plugin-local-connection.test.ts",
      ),
    }),
    skillForwardTest: Schema.Struct({
      kind: Schema.Literal("independentStaticForwardTest"),
      resultPath: Schema.Literal(
        "plugins/srd-play/evals/forward-test-results.json",
      ),
    }),
    installedChatGpt: Schema.Struct({
      kind: Schema.Literal("requiredExternalEvidence"),
      issue: Schema.Literal(328),
      reason: Schema.String,
    }),
  }),
  mcpToolSelection: Schema.Array(McpEvaluationCaseSchema),
  skillActivation: Schema.Array(SkillEvaluationCaseSchema),
});

export type EvaluationInventory = typeof EvaluationInventorySchema.Type;

export function decodeEvaluationInventory(path: string): EvaluationInventory {
  return Schema.decodeUnknownSync(EvaluationInventorySchema)(
    JSON.parse(readFileSync(path, "utf8")),
  );
}
