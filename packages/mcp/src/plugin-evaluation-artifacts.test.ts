import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Either, Schema } from "effect";
import { describe, expect, test } from "vitest";

import { mcpAcceptanceScenarioIds } from "../test-support/mcp-acceptance-scenarios.ts";
import { createDndMcpProtocolServer } from "./protocol-server.ts";

const repoRoot = resolve(import.meta.dirname, "../../..");
const evalRoot = resolve(repoRoot, "plugins/srd-play/evals");
const manifestPath = resolve(
  repoRoot,
  "plans/unit-profile-coverage/mcp-scenario-evidence.json",
);

const EvidenceRefSchema = Schema.Struct({
  scenarioId: Schema.String,
  flowId: Schema.String,
  taskId: Schema.String,
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
const InstalledRowEvidenceSchema = Schema.Union(
  Schema.Struct({
    status: Schema.Literal("pending"),
    caseIds: Schema.NonEmptyArray(Schema.String),
  }),
  Schema.Struct({
    status: Schema.Literal("observed"),
    caseIds: Schema.NonEmptyArray(Schema.String),
  }),
);
const CapabilityRowSchema = Schema.Struct({
  id: Schema.String,
  capability: Schema.String,
  leafIssue: Schema.Number,
  mcpSurface: Schema.NonEmptyArray(Schema.String),
  modelVisibleProjection: Schema.NonEmptyArray(Schema.String),
  mcpEvidence: McpEvidenceSchema,
  installedChatGptEvidence: InstalledRowEvidenceSchema,
  boundary: Schema.String,
});
const CapabilityMatrixSchema = Schema.Struct({
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
    status: Schema.Literal("pending"),
  }),
  rows: Schema.NonEmptyArray(CapabilityRowSchema),
});
const EvaluationCaseSchema = Schema.Struct({
  id: Schema.String,
  kind: Schema.String,
  prompt: Schema.String,
  after: Schema.optionalWith(Schema.String, { exact: true }),
});
const EvaluationInventorySchema = Schema.Struct({
  mcpToolSelection: Schema.Array(EvaluationCaseSchema),
  skillActivation: Schema.Array(EvaluationCaseSchema),
});
const McpManifestRowSchema = Schema.Struct({
  kind: Schema.Literal("mcp-scenario"),
  flowId: Schema.String,
  scopeIds: Schema.NonEmptyArray(Schema.String),
  scenarioId: Schema.String,
  ownerPath: Schema.String,
  testPath: Schema.String,
  taskId: Schema.String,
  summary: Schema.String,
});
const McpManifestSchema = Schema.Struct({
  schema: Schema.Literal("dnd.mcp-scenario-evidence.v1"),
  evidence: Schema.NonEmptyArray(McpManifestRowSchema),
});
const OperatorStepSchema = Schema.Struct({
  step: Schema.String,
  evidenceKind: Schema.Literal(
    "connectionAndToolSelection",
    "installedSkillActivation",
    "installedCompleteWorkflow",
  ),
  instructions: Schema.String,
  requiredCases: Schema.NonEmptyArray(Schema.String),
});
const PendingCaseResultSchema = Schema.Struct({
  caseId: Schema.String,
  evidenceKind: Schema.Literal(
    "installedSkillActivation",
    "installedCompleteWorkflow",
  ),
  status: Schema.Literal("pending"),
});
const ObservedCaseResultSchema = Schema.Struct({
  caseId: Schema.String,
  evidenceKind: Schema.Literal(
    "installedSkillActivation",
    "installedCompleteWorkflow",
  ),
  status: Schema.Literal("observed"),
  result: Schema.Literal("passed", "failed"),
  promptRef: Schema.String,
  observedAt: Schema.String,
  resultSummary: Schema.String,
  observedToolNames: Schema.Array(Schema.String),
});
const InstalledEvidenceCommonSchema = {
  schema: Schema.Literal("dnd.srd-play.installed-chatgpt-evidence.v2"),
  recordedAt: Schema.String,
  scope: Schema.String,
  promptOwner: Schema.Literal(
    "plugins/srd-play/evals/evaluation-inventory.json",
  ),
  capabilityMatrix: Schema.Literal(
    "plugins/srd-play/evals/capability-matrix.json",
  ),
  canonicalMcpEvidence: Schema.Struct({
    manifestPath: Schema.Literal(
      "plans/unit-profile-coverage/mcp-scenario-evidence.json",
    ),
    status: Schema.Literal("observed"),
    evidenceKind: Schema.Literal("mcpScenario"),
  }),
  officialGuidance: Schema.Literal(
    "https://developers.openai.com/plugins/deploy/connect-chatgpt",
  ),
  operatorProtocol: Schema.NonEmptyArray(OperatorStepSchema),
};
const PendingInstalledEvidenceSchema = Schema.Struct({
  ...InstalledEvidenceCommonSchema,
  status: Schema.Literal("pending"),
  environment: Schema.Struct({ tag: Schema.Literal("notObserved") }),
  pendingReason: Schema.String,
  caseResults: Schema.Array(PendingCaseResultSchema),
});
const ObservedInstalledEvidenceSchema = Schema.Struct({
  ...InstalledEvidenceCommonSchema,
  status: Schema.Literal("observed"),
  environment: Schema.Struct({
    tag: Schema.Literal("observed"),
    accountScope: Schema.String,
    workspacePolicy: Schema.String,
  }),
  caseResults: Schema.NonEmptyArray(ObservedCaseResultSchema),
});
const InstalledEvidenceSchema = Schema.Union(
  PendingInstalledEvidenceSchema,
  ObservedInstalledEvidenceSchema,
);
type InstalledEvidence = typeof InstalledEvidenceSchema.Type;

const expectedRowIds = [
  "character-creation-draft-finalization",
  "character-progression-class-level",
  "character-progression-druid-known-form",
  "character-session-list-detail",
  "character-sheet-derived-queries",
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
const expectedLeafIssues = [
  318, 320, 320, 318, 319, 318, 321, 322, 323, 323, 319, 321, 324, 324, 324,
  325, 326, 324, 327, 327, 327,
] as const;

describe("SRD Play evaluation artifacts", () => {
  test("keeps exactly the normative #314 capability rows", () => {
    const matrix = decodeJson(CapabilityMatrixSchema, "capability-matrix.json");
    expect(matrix.rows.map((row) => row.id)).toEqual(expectedRowIds);
    expect(matrix.rows.map((row) => row.leafIssue)).toEqual(expectedLeafIssues);
    expect(new Set(matrix.rows.map((row) => row.id)).size).toBe(21);
    expect(
      existsSync(
        resolve(repoRoot, matrix.representativeHeadlessJourney.testPath),
      ),
    ).toBe(true);
    expect(
      existsSync(
        resolve(repoRoot, matrix.representativeHeadlessJourney.supportPath),
      ),
    ).toBe(true);
    expect(
      existsSync(resolve(repoRoot, matrix.canonicalMcpEvidence.manifestPath)),
    ).toBe(true);
    expect(
      existsSync(
        resolve(repoRoot, matrix.installedChatGptEvidence.artifactPath),
      ),
    ).toBe(true);
    expect(mcpAcceptanceScenarioIds()).toContain(
      matrix.representativeHeadlessJourney.scenarioId,
    );
    for (const row of matrix.rows) {
      expect(row.capability.trim(), row.id).not.toBe("");
      expect(row.boundary.trim(), row.id).not.toBe("");
      expect(row.mcpSurface.length, row.id).toBeGreaterThan(0);
      expect(row.modelVisibleProjection.length, row.id).toBeGreaterThan(0);
      expect(row.mcpEvidence.status, row.id).toBe("observed");
      expect(row.installedChatGptEvidence.status, row.id).toBe("pending");
    }
  });

  test("cross-validates MCP refs, inventory cases, scenario ids, and projection contracts", async () => {
    const matrix = decodeJson(CapabilityMatrixSchema, "capability-matrix.json");
    const manifest = decodeFile(McpManifestSchema, manifestPath);
    const inventory = decodeJson(
      EvaluationInventorySchema,
      "evaluation-inventory.json",
    );
    const manifestByKey = new Map(
      manifest.evidence.map((row) => [
        `${row.scenarioId}\u0000${row.flowId}\u0000${row.taskId}`,
        row,
      ]),
    );
    const scenarioIds = new Set<string>(mcpAcceptanceScenarioIds());
    const skillCaseIds = new Set(inventory.skillActivation.map(({ id }) => id));
    for (const row of matrix.rows) {
      if (row.mcpEvidence.status === "observed") {
        for (const ref of row.mcpEvidence.refs) {
          expect(
            scenarioIds.has(ref.scenarioId),
            `${row.id}: ${ref.scenarioId}`,
          ).toBe(true);
          const manifestRow = manifestByKey.get(
            `${ref.scenarioId}\u0000${ref.flowId}\u0000${ref.taskId}`,
          );
          expect(manifestRow, row.id).toBeDefined();
          expect(
            existsSync(resolve(repoRoot, manifestRow?.ownerPath ?? "")),
          ).toBe(true);
          expect(
            existsSync(resolve(repoRoot, manifestRow?.testPath ?? "")),
          ).toBe(true);
        }
      }
      for (const caseId of row.installedChatGptEvidence.caseIds) {
        expect(skillCaseIds.has(caseId), `${row.id}: ${caseId}`).toBe(true);
      }
    }

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const { server } = createDndMcpProtocolServer();
    const client = new Client({
      name: "srd-play-capability-matrix-check",
      version: "0.1.0",
    });
    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);
      const tools = await client.listTools();
      const toolByName = new Map(tools.tools.map((tool) => [tool.name, tool]));
      for (const row of matrix.rows) {
        const outputSchemaText = row.mcpSurface
          .map((toolName) => {
            const tool = toolByName.get(toolName);
            expect(tool, `${row.id}: ${toolName}`).toBeDefined();
            expect(
              tool?.outputSchema,
              `${row.id}: ${toolName} outputSchema`,
            ).toBeDefined();
            return JSON.stringify(tool?.outputSchema);
          })
          .join(" ");
        for (const projection of row.modelVisibleProjection) {
          const root = projection.split(/[.[]/u, 1)[0];
          expect(outputSchemaText, `${row.id}: ${projection}`).toContain(root);
        }
      }
    } finally {
      await Promise.allSettled([client.close(), server.close()]);
    }
  }, 30_000);

  test("keeps installed ChatGPT evidence pending without contradictory case states", () => {
    const evidence = decodeInstalledEvidence(
      JSON.parse(
        readFileSync(
          resolve(evalRoot, "installed-chatgpt-evidence.json"),
          "utf8",
        ),
      ),
    );
    expect(evidence.status).toBe("pending");
    if (evidence.status !== "pending") return;
    expect(evidence.environment).toEqual({ tag: "notObserved" });
    expect(
      evidence.caseResults.every(({ status }) => status === "pending"),
    ).toBe(true);
    expect(
      new Set(
        evidence.caseResults.map(
          ({ caseId, evidenceKind }) => `${caseId}:${evidenceKind}`,
        ),
      ).size,
    ).toBe(evidence.caseResults.length);
    expect(evidence.operatorProtocol.map(({ step }) => step)).toEqual([
      "mcp-connection",
      "complete-plugin",
      "newcomer-journey",
    ]);
    const inventory = decodeJson(
      EvaluationInventorySchema,
      "evaluation-inventory.json",
    );
    const mcpCaseIds = new Set(inventory.mcpToolSelection.map(({ id }) => id));
    const skillCaseIds = new Set(inventory.skillActivation.map(({ id }) => id));
    for (const step of evidence.operatorProtocol) {
      const expectedCaseIds =
        step.evidenceKind === "connectionAndToolSelection"
          ? mcpCaseIds
          : skillCaseIds;
      for (const caseId of step.requiredCases) {
        expect(expectedCaseIds.has(caseId), `${step.step}: ${caseId}`).toBe(
          true,
        );
      }
    }
    for (const result of evidence.caseResults) {
      expect(skillCaseIds.has(result.caseId)).toBe(true);
    }
  });

  test("accepts typed passed and failed installed observations only in observed state", () => {
    const pending = decodeInstalledEvidence(
      JSON.parse(
        readFileSync(
          resolve(evalRoot, "installed-chatgpt-evidence.json"),
          "utf8",
        ),
      ),
    );
    if (pending.status !== "pending")
      throw new Error("Expected pending fixture.");
    const { pendingReason: _pendingReason, ...pendingWithoutReason } = pending;
    void _pendingReason;
    const observed = {
      ...pendingWithoutReason,
      status: "observed",
      environment: {
        tag: "observed",
        accountScope: "developer-mode-account",
        workspacePolicy: "developer-mode-enabled",
      },
      caseResults: [
        {
          caseId: "skill-direct",
          evidenceKind: "installedSkillActivation",
          status: "observed",
          result: "passed",
          promptRef: "skill-direct",
          observedAt: "2026-08-21T00:00:00Z",
          resultSummary: "Skill activated and selected the catalog tool.",
          observedToolNames: ["list_catalog_units"],
        },
        {
          caseId: "skill-unrelated-dnd",
          evidenceKind: "installedSkillActivation",
          status: "observed",
          result: "failed",
          promptRef: "skill-unrelated-dnd",
          observedAt: "2026-08-21T00:01:00Z",
          resultSummary: "Skill activated unexpectedly.",
          observedToolNames: [],
        },
      ],
    };
    const decoded = decodeInstalledEvidence(observed);
    expect(decoded.status).toBe("observed");
    const contradictory = Schema.decodeUnknownEither(InstalledEvidenceSchema, {
      onExcessProperty: "error",
    })({
      ...pending,
      environment: { tag: "observed" },
    });
    expect(Either.isLeft(contradictory)).toBe(true);
  });
});

function decodeInstalledEvidence(value: unknown): InstalledEvidence {
  return Schema.decodeUnknownSync(InstalledEvidenceSchema, {
    onExcessProperty: "error",
  })(value);
}

function decodeJson<S extends Schema.Schema.AnyNoContext>(
  schema: S,
  name: string,
): Schema.Schema.Type<S> {
  return Schema.decodeUnknownSync(schema)(
    JSON.parse(readFileSync(resolve(evalRoot, name), "utf8")),
  );
}

function decodeFile<S extends Schema.Schema.AnyNoContext>(
  schema: S,
  path: string,
): Schema.Schema.Type<S> {
  return Schema.decodeUnknownSync(schema)(
    JSON.parse(readFileSync(path, "utf8")),
  );
}
