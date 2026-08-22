import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Either, Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  decodeEvaluationInventory,
  type EvaluationInventory,
} from "../test-support/evaluation-inventory.ts";
import { mcpAcceptanceScenarioIds } from "../test-support/mcp-acceptance-scenarios.ts";
import { sourceDefinesVitestScenario } from "../test-support/mcp-scenario-executable.ts";
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
const CapabilityRowSchema = Schema.Struct({
  id: Schema.String,
  capability: Schema.String,
  leafIssue: Schema.Number,
  mcpSurface: Schema.NonEmptyArray(Schema.String),
  modelVisibleProjection: Schema.NonEmptyArray(ProjectionPathSchema),
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
  }),
  rows: Schema.NonEmptyArray(CapabilityRowSchema),
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
const ConnectionOperatorStepSchema = Schema.Struct({
  step: Schema.Literal("mcp-connection"),
  evidenceKind: Schema.Literal("connectionAndToolSelection"),
  instructions: Schema.String,
  requiredCases: Schema.Tuple(
    Schema.Literal("mcp-direct-catalog"),
    Schema.Literal("mcp-indirect-catalog"),
    Schema.Literal("mcp-follow-up-detail"),
    Schema.Literal("mcp-unsupported-history"),
  ),
});
const SkillActivationOperatorStepSchema = Schema.Struct({
  step: Schema.Literal("complete-plugin"),
  evidenceKind: Schema.Literal("installedSkillActivation"),
  instructions: Schema.String,
  requiredCases: Schema.Tuple(
    Schema.Literal("skill-direct"),
    Schema.Literal("skill-natural"),
    Schema.Literal("skill-continuation"),
    Schema.Literal("skill-unrelated-dnd"),
    Schema.Literal("skill-authoring-boundary"),
  ),
});
const CompleteWorkflowOperatorStepSchema = Schema.Struct({
  step: Schema.Literal("newcomer-journey"),
  evidenceKind: Schema.Literal("installedCompleteWorkflow"),
  instructions: Schema.String,
  requiredCases: Schema.Tuple(
    Schema.Literal("skill-natural"),
    Schema.Literal("skill-continuation"),
  ),
});
const PendingConnectionCaseResultSchema = Schema.Struct({
  caseId: Schema.String,
  evidenceKind: Schema.Literal("connectionAndToolSelection"),
  status: Schema.Literal("pending"),
});
const PendingSkillActivationCaseResultSchema = Schema.Struct({
  caseId: Schema.String,
  evidenceKind: Schema.Literal("installedSkillActivation"),
  status: Schema.Literal("pending"),
});
const PendingWorkflowCaseResultSchema = Schema.Struct({
  caseId: Schema.String,
  evidenceKind: Schema.Literal("installedCompleteWorkflow"),
  status: Schema.Literal("pending"),
});
const PendingCaseResultSchema = Schema.Union(
  PendingConnectionCaseResultSchema,
  PendingSkillActivationCaseResultSchema,
  PendingWorkflowCaseResultSchema,
);
const ObservedConnectionCaseResultSchema = Schema.Struct({
  caseId: Schema.String,
  evidenceKind: Schema.Literal("connectionAndToolSelection"),
  status: Schema.Literal("observed"),
  selectedTool: Schema.String,
  arguments: Schema.Record({ key: Schema.String, value: Schema.Any }),
  result: Schema.Union(
    Schema.Struct({ tag: Schema.Literal("returned"), value: Schema.Any }),
    Schema.Struct({
      tag: Schema.Literal("error"),
      message: Schema.String,
    }),
  ),
  errors: Schema.Union(
    Schema.Struct({ tag: Schema.Literal("none") }),
    Schema.Struct({
      tag: Schema.Literal("reported"),
      messages: Schema.NonEmptyArray(Schema.String),
    }),
  ),
  confirmationBehavior: Schema.Union(
    Schema.Struct({ tag: Schema.Literal("notRequested") }),
    Schema.Struct({
      tag: Schema.Literal("requested"),
      outcome: Schema.Literal("accepted", "declined"),
    }),
  ),
  promptRef: Schema.String,
  observedAt: Schema.String,
  resultSummary: Schema.String,
});
const ObservedSkillCaseResultSchema = Schema.Struct({
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
const ObservedCaseResultSchema = Schema.Union(
  ObservedConnectionCaseResultSchema,
  ObservedSkillCaseResultSchema,
);
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
  operatorProtocol: Schema.Tuple(
    ConnectionOperatorStepSchema,
    SkillActivationOperatorStepSchema,
    CompleteWorkflowOperatorStepSchema,
  ),
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
).pipe(
  Schema.filter(hasCompleteInstalledCaseCoverage, {
    description:
      "installed evidence with every connection, activation, and workflow case",
  }),
);
type InstalledEvidence = typeof InstalledEvidenceSchema.Type;

function hasCompleteInstalledCaseCoverage(evidence: {
  readonly operatorProtocol: ReadonlyArray<{
    readonly requiredCases: ReadonlyArray<string>;
    readonly evidenceKind: string;
  }>;
  readonly caseResults: ReadonlyArray<{
    readonly caseId: string;
    readonly evidenceKind: string;
  }>;
}): boolean {
  const requiredCaseKeys = evidence.operatorProtocol.flatMap(
    ({ requiredCases, evidenceKind }) =>
      requiredCases.map((caseId) => `${caseId}:${evidenceKind}`),
  );
  const actualCaseKeys = evidence.caseResults.map(
    ({ caseId, evidenceKind }) => `${caseId}:${evidenceKind}`,
  );
  return (
    actualCaseKeys.length === requiredCaseKeys.length &&
    new Set(actualCaseKeys).size === requiredCaseKeys.length &&
    requiredCaseKeys.every((key) => actualCaseKeys.includes(key))
  );
}

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
    const installedEvidence = decodeInstalledEvidence(
      JSON.parse(
        readFileSync(
          resolve(repoRoot, matrix.installedChatGptEvidence.artifactPath),
          "utf8",
        ),
      ),
    );
    expect(installedEvidence.status).toBe("pending");
    expect(mcpAcceptanceScenarioIds()).toContain(
      matrix.representativeHeadlessJourney.scenarioId,
    );
    for (const row of matrix.rows) {
      expect(row.capability.trim(), row.id).not.toBe("");
      expect(row.boundary.trim(), row.id).not.toBe("");
      expect(row.mcpSurface.length, row.id).toBeGreaterThan(0);
      expect(row.modelVisibleProjection.length, row.id).toBeGreaterThan(0);
      expect(row.mcpEvidence.status, row.id).toBe("observed");
    }
  });

  test("cross-validates MCP refs, inventory cases, scenario ids, and projection contracts", async () => {
    const matrix = decodeJson(CapabilityMatrixSchema, "capability-matrix.json");
    const manifest = decodeFile(McpManifestSchema, manifestPath);
    const inventory: EvaluationInventory = decodeEvaluationInventory(
      resolve(evalRoot, "evaluation-inventory.json"),
    );
    const manifestByKey = new Map(
      manifest.evidence.map((row) => [
        `${row.scenarioId}\u0000${row.flowId}\u0000${row.taskId}`,
        row,
      ]),
    );
    const acceptanceScenarioIds = new Set<string>(mcpAcceptanceScenarioIds());
    const skillCaseIds = new Set(inventory.skillActivation.map(({ id }) => id));
    for (const row of matrix.rows) {
      if (row.mcpEvidence.status === "observed") {
        for (const ref of row.mcpEvidence.refs) {
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
          const testSource = readFileSync(
            resolve(repoRoot, manifestRow?.testPath ?? ""),
            "utf8",
          );
          expect(
            acceptanceScenarioIds.has(ref.scenarioId) ||
              sourceDefinesVitestScenario(testSource, ref.scenarioId),
            `${row.id}: ${ref.scenarioId} must identify an executable scenario`,
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
      const missingProjections: string[] = [];
      for (const row of matrix.rows) {
        for (const projection of row.modelVisibleProjection) {
          expect(
            row.mcpSurface,
            `${row.id}: projection tool ${projection.toolName}`,
          ).toContain(projection.toolName);
          const tool = toolByName.get(projection.toolName);
          expect(tool, `${row.id}: ${projection.toolName}`).toBeDefined();
          expect(
            tool?.outputSchema,
            `${row.id}: ${projection.toolName} outputSchema`,
          ).toBeDefined();
          if (
            !schemaHasProjectionPath(
              tool?.outputSchema,
              projection.pathSegments,
            )
          ) {
            missingProjections.push(
              `${row.id}: ${projection.toolName}.${projection.pathSegments.join(".")}`,
            );
          }
        }
      }
      expect(missingProjections).toEqual([]);
      const readBattleStateSchema =
        toolByName.get("read_battle_state")?.outputSchema;
      expect(
        schemaHasProjectionPath(readBattleStateSchema, ["snapshot", "notReal"]),
      ).toBe(false);
      expect(
        schemaHasProjectionPath(readBattleStateSchema, [
          "operation",
          "snapshot",
        ]),
      ).toBe(false);
      expect(
        rowProjectionMatchesSurface(
          { toolName: "start_battle", pathSegments: ["snapshot"] },
          ["read_battle_state"],
        ),
      ).toBe(false);
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
    const inventory: EvaluationInventory = decodeEvaluationInventory(
      resolve(evalRoot, "evaluation-inventory.json"),
    );
    expectInstalledCaseCoverage(evidence, inventory);
    expect(evidence.operatorProtocol.map(({ step }) => step)).toEqual([
      "mcp-connection",
      "complete-plugin",
      "newcomer-journey",
    ]);
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
      const caseIds =
        result.evidenceKind === "connectionAndToolSelection"
          ? mcpCaseIds
          : skillCaseIds;
      expect(caseIds.has(result.caseId)).toBe(true);
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
      caseResults: pending.caseResults.map(({ caseId, evidenceKind }, index) =>
        evidenceKind === "connectionAndToolSelection"
          ? {
              caseId,
              evidenceKind,
              status: "observed" as const,
              selectedTool: "list_catalog_units",
              arguments: {},
              result:
                index === 1
                  ? { tag: "error" as const, message: "Observed failure." }
                  : { tag: "returned" as const, value: { tag: "ok" } },
              errors: { tag: "none" as const },
              confirmationBehavior: { tag: "notRequested" as const },
              promptRef: caseId,
              observedAt: `2026-08-21T00:${String(index).padStart(2, "0")}:00Z`,
              resultSummary:
                index === 1
                  ? "The observed case failed its expected behavior."
                  : "The observed case produced the expected behavior.",
            }
          : {
              caseId,
              evidenceKind,
              status: "observed" as const,
              result: index === 1 ? ("failed" as const) : ("passed" as const),
              promptRef: caseId,
              observedAt: `2026-08-21T00:${String(index).padStart(2, "0")}:00Z`,
              resultSummary:
                index === 1
                  ? "The observed case failed its expected behavior."
                  : "The observed case produced the expected behavior.",
              observedToolNames: [],
            },
      ),
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

function expectInstalledCaseCoverage(
  evidence: InstalledEvidence,
  inventory: EvaluationInventory,
): void {
  const expectedKeys = evidence.operatorProtocol.flatMap(
    ({ requiredCases, evidenceKind }) =>
      requiredCases.map((caseId) => `${caseId}:${evidenceKind}`),
  );
  const actualKeys = evidence.caseResults.map(
    ({ caseId, evidenceKind }) => `${caseId}:${evidenceKind}`,
  );
  expect([...actualKeys].sort()).toEqual([...expectedKeys].sort());
  const mcpCaseIds = new Set(inventory.mcpToolSelection.map(({ id }) => id));
  const skillCaseIds = new Set(inventory.skillActivation.map(({ id }) => id));
  for (const step of evidence.operatorProtocol) {
    const inventoryCaseIds =
      step.evidenceKind === "connectionAndToolSelection"
        ? mcpCaseIds
        : skillCaseIds;
    for (const caseId of step.requiredCases) {
      expect(inventoryCaseIds.has(caseId), `${step.step}: ${caseId}`).toBe(
        true,
      );
    }
  }
  for (const result of evidence.caseResults) {
    const inventoryCaseIds =
      result.evidenceKind === "connectionAndToolSelection"
        ? mcpCaseIds
        : skillCaseIds;
    expect(inventoryCaseIds.has(result.caseId), result.caseId).toBe(true);
  }
}

function schemaHasProjectionPath(
  schema: unknown,
  pathSegments: readonly string[],
): boolean {
  const root = isRecord(schema) ? schema : {};
  return schemaContainsPath(root, pathSegments, root, new Set(), 0);
}

function schemaContainsPath(
  schema: unknown,
  segments: readonly string[],
  root: Readonly<Record<string, unknown>>,
  visited: Set<string>,
  depth: number,
): boolean {
  if (segments.length === 0) return true;
  if (depth > 100 || !isRecord(schema)) return false;

  const reference = schema["$ref"];
  if (typeof reference === "string") {
    if (visited.has(reference)) return false;
    const definitionName = reference.startsWith("#/$defs/")
      ? reference.slice("#/$defs/".length)
      : undefined;
    const definitions = isRecord(root["$defs"]) ? root["$defs"] : undefined;
    const definition =
      definitionName === undefined ? undefined : definitions?.[definitionName];
    if (definition === undefined) return false;
    const nextVisited = new Set(visited);
    nextVisited.add(reference);
    return schemaContainsPath(
      definition,
      segments,
      root,
      nextVisited,
      depth + 1,
    );
  }

  for (const combinator of ["anyOf", "oneOf", "allOf"] as const) {
    const branches = schema[combinator];
    if (
      Array.isArray(branches) &&
      branches.some((branch) =>
        schemaContainsPath(branch, segments, root, visited, depth + 1),
      )
    ) {
      return true;
    }
  }

  const [segment, ...remaining] = segments;
  if (segment === "[]") {
    return schemaContainsPath(
      schema.items,
      remaining,
      root,
      visited,
      depth + 1,
    );
  }
  const properties = isRecord(schema.properties) ? schema.properties : {};
  const property = properties[segment];
  return property === undefined
    ? false
    : schemaContainsPath(property, remaining, root, visited, depth + 1);
}

function rowProjectionMatchesSurface(
  projection: {
    readonly toolName: string;
    readonly pathSegments: readonly string[];
  },
  mcpSurface: readonly string[],
): boolean {
  return mcpSurface.includes(projection.toolName);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
