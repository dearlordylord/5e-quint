import { readFileSync } from "node:fs";

import { Schema } from "effect";

import { CharacterSessionQueryKindsSchema } from "../src/character-session-query-tool-input.ts";

const EvidenceRefSchema = Schema.Struct({
  scenarioId: Schema.String,
  flowId: Schema.String,
  taskId: Schema.String,
});

const ProjectionPathSchema = Schema.Struct({
  toolName: Schema.String,
  pathSegments: Schema.NonEmptyArray(Schema.String),
});

const McpEvidenceSchema = Schema.Union(
  Schema.Struct({
    status: Schema.Literal("observed"),
    refs: Schema.NonEmptyArray(EvidenceRefSchema),
  }),
  Schema.Struct({
    status: Schema.Literal("excluded"),
    reason: Schema.String,
  }),
);

const InstalledRowEvidenceSchema = Schema.Struct({
  caseIds: Schema.NonEmptyArray(Schema.String),
});

const CapabilityRowBaseSchema = Schema.Struct({
  id: Schema.String,
  capability: Schema.String,
  leafIssue: Schema.Number,
  mcpSurface: Schema.NonEmptyArray(Schema.String),
  modelVisibleProjection: Schema.NonEmptyArray(ProjectionPathSchema),
  mcpEvidence: McpEvidenceSchema,
  requiredQueryKinds: Schema.optionalWith(CharacterSessionQueryKindsSchema, {
    exact: true,
  }),
  installedChatGptEvidence: InstalledRowEvidenceSchema,
  boundary: Schema.String,
});

const CapabilityRowSchema = CapabilityRowBaseSchema.pipe(
  Schema.filter(
    ({ id, requiredQueryKinds }) =>
      id === "character-sheet-derived-queries"
        ? requiredQueryKinds !== undefined
        : requiredQueryKinds === undefined,
    {
      description:
        "only the derived-query capability row may declare required query kinds",
    },
  ),
);

export const CapabilityMatrixSchema = Schema.Struct({
  schema: Schema.Literal("dnd.srd-play.capability-matrix.v2"),
  status: Schema.Literal("frozen"),
  owner: Schema.Literal("plugins/srd-play/evals"),
  canonicalMcpEvidence: Schema.Struct({
    manifestPath: Schema.Literal(
      "plans/unit-profile-coverage/mcp-scenario-evidence.json",
    ),
    evidenceKind: Schema.Literal("mcpScenario"),
    status: Schema.Literal("observed"),
  }),
  representativeHeadlessJourney: Schema.Struct({
    scenarioId: Schema.Literal("complete-newcomer-journey"),
    testPath: Schema.Literal(
      "packages/mcp/src/plugin-newcomer-journey.test.ts",
    ),
    supportPath: Schema.Literal(
      "packages/mcp/test-support/mcp-acceptance-scenarios.ts",
    ),
    coverage: Schema.Literal("representativeCrossLeafOnly"),
  }),
  installedChatGptEvidence: Schema.Struct({
    artifactPath: Schema.Literal(
      "plugins/srd-play/evals/installed-chatgpt-evidence.json",
    ),
    evidenceKind: Schema.Literal("installedSkillActivation"),
  }),
  rows: Schema.NonEmptyArray(CapabilityRowSchema),
});

export type CapabilityMatrix = typeof CapabilityMatrixSchema.Type;

export function decodeCapabilityMatrix(path: string): CapabilityMatrix {
  return Schema.decodeUnknownSync(CapabilityMatrixSchema, {
    onExcessProperty: "error",
  })(JSON.parse(readFileSync(path, "utf8")));
}
