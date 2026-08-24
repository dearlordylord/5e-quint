import { readFileSync } from "node:fs";

import { Schema } from "effect";

const McpEvaluationCaseBase = {
  id: Schema.String,
  prompt: Schema.String,
};

export const McpEvaluationCaseSchema = Schema.Union(
  Schema.Struct({
    ...McpEvaluationCaseBase,
    kind: Schema.Literal("direct"),
    expectedToolNames: Schema.NonEmptyArray(Schema.String),
  }),
  Schema.Struct({
    ...McpEvaluationCaseBase,
    kind: Schema.Literal("indirect"),
    expectedToolNames: Schema.NonEmptyArray(Schema.String),
  }),
  Schema.Struct({
    ...McpEvaluationCaseBase,
    kind: Schema.Literal("followUp"),
    after: Schema.String,
    expectedToolNames: Schema.NonEmptyArray(Schema.String),
  }),
  Schema.Struct({
    ...McpEvaluationCaseBase,
    kind: Schema.Literal("negative"),
    expectedToolNames: Schema.Tuple(),
  }),
);

const SkillEvaluationCaseBase = {
  id: Schema.String,
  prompt: Schema.String,
};

export const SkillEvaluationCaseSchema = Schema.Union(
  Schema.Struct({
    ...SkillEvaluationCaseBase,
    kind: Schema.Literal("direct"),
    expectedActivation: Schema.Literal("activate"),
  }),
  Schema.Struct({
    ...SkillEvaluationCaseBase,
    kind: Schema.Literal("indirect"),
    expectedActivation: Schema.Literal("activate"),
  }),
  Schema.Struct({
    ...SkillEvaluationCaseBase,
    kind: Schema.Literal("followUp"),
    after: Schema.String,
    expectedActivation: Schema.Literal("activate"),
  }),
  Schema.Struct({
    ...SkillEvaluationCaseBase,
    kind: Schema.Literal("negative"),
    expectedActivation: Schema.Literal("doNotActivate"),
  }),
  Schema.Struct({
    ...SkillEvaluationCaseBase,
    kind: Schema.Literal("boundary"),
    expectedActivation: Schema.Literal("activate"),
  }),
);

export const CompleteWorkflowEvaluationCaseSchema = Schema.Struct({
  ...SkillEvaluationCaseBase,
  kind: Schema.Literal("completeWorkflow"),
  expectedActivation: Schema.Literal("activate"),
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
  completeWorkflow: Schema.NonEmptyArray(CompleteWorkflowEvaluationCaseSchema),
});

export type EvaluationInventory = typeof EvaluationInventorySchema.Type;

export function decodeEvaluationInventory(path: string): EvaluationInventory {
  return Schema.decodeUnknownSync(EvaluationInventorySchema, {
    onExcessProperty: "error",
  })(JSON.parse(readFileSync(path, "utf8")));
}
