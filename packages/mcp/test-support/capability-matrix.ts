import { readFileSync } from "node:fs";

import { Schema } from "effect";

import { CharacterSessionQueryKindsSchema } from "../src/character-session-query-tool-input.ts";

export const NON_DERIVED_CAPABILITY_ROW_ID_VALUES = [
  "character-creation-draft-finalization",
  "character-progression-class-level",
  "character-progression-druid-known-form",
  "character-session-list-detail",
  "character-companion-retention",
  "character-rest-lifecycles",
  "character-healing-rest-benefits",
  "character-feature-resources",
  "character-font-of-magic-conversion",
  "character-ritual-invocation",
  "character-calendar-time",
  "battle-mixed-roster-start",
  "battle-character-settlement",
  "battle-direct-initiative",
  "battle-initial-initiative-setup",
  "battle-roster-lifecycle",
  "battle-snapshot-read",
  "battle-act-discovery",
  "battle-act-resolution",
  "battle-turn-end",
] as const;

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

const CapabilityRowCommonFields = {
  capability: Schema.String,
  leafIssue: Schema.Number,
  mcpSurface: Schema.NonEmptyArray(Schema.String),
  modelVisibleProjection: Schema.NonEmptyArray(ProjectionPathSchema),
  mcpEvidence: McpEvidenceSchema,
  installedChatGptEvidence: InstalledRowEvidenceSchema,
  boundary: Schema.String,
};

const DerivedQueryCapabilityRowSchema = Schema.Struct({
  ...CapabilityRowCommonFields,
  id: Schema.Literal("character-sheet-derived-queries"),
  requiredQueryKinds: CharacterSessionQueryKindsSchema,
});

const NonDerivedCapabilityRowSchema = Schema.Struct({
  ...CapabilityRowCommonFields,
  id: Schema.Literal(...NON_DERIVED_CAPABILITY_ROW_ID_VALUES),
});

const CapabilityRowSchema = Schema.Union(
  DerivedQueryCapabilityRowSchema,
  NonDerivedCapabilityRowSchema,
);

export const CapabilityMatrixSchema = Schema.Struct({
  schema: Schema.Literal("dnd.srd-oracle.capability-matrix.v2"),
  status: Schema.Literal("frozen"),
  owner: Schema.Literal("plugins/dnd-srd-oracle/evals"),
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
      "plugins/dnd-srd-oracle/evals/installed-chatgpt-evidence.json",
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
