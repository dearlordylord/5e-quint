import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Either, Match, Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  decodeEvaluationInventory,
  type EvaluationInventory,
} from "../test-support/evaluation-inventory.ts";
import { decodeCapabilityMatrix } from "../test-support/capability-matrix.ts";
import { CHARACTER_SHEET_DERIVED_QUERY_KINDS } from "../test-support/character-sheet-query-evidence.ts";
import { sourceDefinesVitestScenario } from "../test-support/mcp-scenario-executable.ts";
import { createDndMcpProtocolServer } from "./protocol-server.ts";

const repoRoot = resolve(import.meta.dirname, "../../..");
const evalRoot = resolve(repoRoot, "plugins/srd-play/evals");
const manifestPath = resolve(
  repoRoot,
  "plans/unit-profile-coverage/mcp-scenario-evidence.json",
);

const McpManifestRowSchema = Schema.Struct({
  kind: Schema.Literal("mcp-scenario"),
  flowId: Schema.String,
  scopeIds: Schema.NonEmptyArray(Schema.String),
  scenarioId: Schema.String,
  ownerPath: Schema.String,
  testPath: Schema.String,
  taskId: Schema.String,
  summary: Schema.String,
  queryKinds: Schema.optionalWith(Schema.NonEmptyArray(Schema.String), {
    exact: true,
  }),
});
const McpManifestSchema = Schema.Struct({
  schema: Schema.Literal("dnd.mcp-scenario-evidence.v1"),
  evidence: Schema.NonEmptyArray(McpManifestRowSchema),
});
const ConnectionOperatorStepSchema = Schema.Struct({
  step: Schema.Literal("mcp-connection"),
  evidenceKind: Schema.Literal("connectionAndToolSelection"),
  instructions: Schema.String,
  requiredCases: Schema.NonEmptyArray(Schema.String),
});
const SkillActivationOperatorStepSchema = Schema.Struct({
  step: Schema.Literal("complete-plugin"),
  evidenceKind: Schema.Literal("installedSkillActivation"),
  instructions: Schema.String,
  requiredCases: Schema.NonEmptyArray(Schema.String),
});
const CompleteWorkflowOperatorStepSchema = Schema.Struct({
  step: Schema.Literal("newcomer-journey"),
  evidenceKind: Schema.Literal("installedCompleteWorkflow"),
  instructions: Schema.String,
  requiredCases: Schema.NonEmptyArray(Schema.String),
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
const ConfirmationBehaviorSchema = Schema.Union(
  Schema.Struct({ tag: Schema.Literal("notRequested") }),
  Schema.Struct({
    tag: Schema.Literal("requested"),
    outcome: Schema.Literal("accepted", "declined"),
  }),
);
const ConnectionObservationSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("toolSelected"),
    selectedTool: Schema.String,
    arguments: Schema.Record({ key: Schema.String, value: Schema.Any }),
    outcome: Schema.Union(
      Schema.Struct({
        tag: Schema.Literal("success"),
        result: Schema.Any,
        confirmation: ConfirmationBehaviorSchema,
      }),
      Schema.Struct({
        tag: Schema.Literal("error"),
        details: Schema.NonEmptyArray(Schema.String),
        confirmation: ConfirmationBehaviorSchema,
      }),
    ),
  }),
  Schema.Struct({
    tag: Schema.Literal("noToolSelected"),
    reason: Schema.String,
    confirmation: ConfirmationBehaviorSchema,
  }),
);
type ConnectionObservation = typeof ConnectionObservationSchema.Type;
const ObservedConnectionCaseResultSchema = Schema.Struct({
  caseId: Schema.String,
  evidenceKind: Schema.Literal("connectionAndToolSelection"),
  status: Schema.Literal("observed"),
  observation: ConnectionObservationSchema,
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
  Schema.filter(installedEvidenceHasCompleteCoverage, {
    description:
      "installed evidence with every connection, activation, and workflow case",
  }),
);
type InstalledEvidence = typeof InstalledEvidenceSchema.Type;

const evaluationInventory = decodeEvaluationInventory(
  resolve(evalRoot, "evaluation-inventory.json"),
);

type InstalledEvidenceKind =
  | "connectionAndToolSelection"
  | "installedSkillActivation"
  | "installedCompleteWorkflow";

function expectedInstalledCaseIds(
  inventory: EvaluationInventory,
  evidenceKind: InstalledEvidenceKind,
): ReadonlySet<string> {
  return Match.value(evidenceKind).pipe(
    Match.when(
      "connectionAndToolSelection",
      () => new Set(inventory.mcpToolSelection.map(({ id }) => id)),
    ),
    Match.when(
      "installedSkillActivation",
      () => new Set(inventory.skillActivation.map(({ id }) => id)),
    ),
    Match.when(
      "installedCompleteWorkflow",
      () =>
        new Set(
          inventory.skillActivation
            .filter(({ kind }) => kind === "indirect" || kind === "followUp")
            .map(({ id }) => id),
        ),
    ),
    Match.exhaustive,
  );
}

function caseSetEquals(
  actual: ReadonlyArray<string>,
  expected: ReadonlySet<string>,
): boolean {
  return (
    actual.length === expected.size &&
    new Set(actual).size === expected.size &&
    actual.every((caseId) => expected.has(caseId))
  );
}

type InstalledCoverageInput = {
  readonly operatorProtocol: ReadonlyArray<{
    readonly step: string;
    readonly requiredCases: ReadonlyArray<string>;
    readonly evidenceKind: InstalledEvidenceKind;
  }>;
  readonly caseResults: ReadonlyArray<{
    readonly caseId: string;
    readonly evidenceKind: string;
    readonly observation?: unknown;
  }>;
};

type InstalledCoverageResult =
  | { readonly tag: "valid" }
  | { readonly tag: "invalid"; readonly reason: string };

function installedEvidenceHasCompleteCoverage(
  evidence: InstalledCoverageInput,
): boolean {
  return (
    validateInstalledCaseCoverage(evidence, evaluationInventory).tag === "valid"
  );
}

function validateInstalledCaseCoverage(
  evidence: InstalledCoverageInput,
  inventory: EvaluationInventory,
): InstalledCoverageResult {
  const requiredCaseKeys = evidence.operatorProtocol.flatMap(
    ({ requiredCases, evidenceKind }) =>
      requiredCases.map((caseId) => `${caseId}:${evidenceKind}`),
  );
  const actualCaseKeys = evidence.caseResults.map(
    ({ caseId, evidenceKind }) => `${caseId}:${evidenceKind}`,
  );
  if (!caseSetEquals(actualCaseKeys, new Set(requiredCaseKeys))) {
    return {
      tag: "invalid",
      reason: "caseResults must exactly equal operatorProtocol cases",
    };
  }
  for (const step of evidence.operatorProtocol) {
    if (
      !caseSetEquals(
        step.requiredCases,
        expectedInstalledCaseIds(inventory, step.evidenceKind),
      )
    ) {
      return {
        tag: "invalid",
        reason: `${step.step} must exactly equal its inventory group`,
      };
    }
  }
  for (const evidenceKind of [
    "connectionAndToolSelection",
    "installedSkillActivation",
    "installedCompleteWorkflow",
  ] as const) {
    const actualCaseIds = evidence.caseResults
      .filter((result) => result.evidenceKind === evidenceKind)
      .map(({ caseId }) => caseId);
    if (
      !caseSetEquals(
        actualCaseIds,
        expectedInstalledCaseIds(inventory, evidenceKind),
      )
    ) {
      return {
        tag: "invalid",
        reason: `${evidenceKind} results must exactly equal its inventory group`,
      };
    }
  }
  for (const result of evidence.caseResults) {
    if (
      result.evidenceKind === "connectionAndToolSelection" &&
      result.observation !== undefined &&
      !hasInventoryCompatibleConnectionObservation(
        inventory,
        result.caseId,
        result.observation,
      )
    ) {
      return {
        tag: "invalid",
        reason: `${result.caseId} selected an MCP tool outside its inventory expectation`,
      };
    }
  }
  return { tag: "valid" };
}

function hasInventoryCompatibleConnectionObservation(
  inventory: EvaluationInventory,
  caseId: string,
  observation: unknown,
): boolean {
  const inventoryCase = inventory.mcpToolSelection.find(
    ({ id }) => id === caseId,
  );
  if (inventoryCase === undefined || !isRecord(observation)) return false;
  if (observation.tag === "noToolSelected") {
    return inventoryCase.expectedToolNames.length === 0;
  }
  if (observation.tag !== "toolSelected") return false;
  const expectedToolNames: ReadonlyArray<string> =
    inventoryCase.expectedToolNames;
  return (
    typeof observation.selectedTool === "string" &&
    expectedToolNames.includes(observation.selectedTool)
  );
}

function observedConnectionObservation(
  caseId: string,
  index: number,
): ConnectionObservation {
  const inventoryCase = evaluationInventory.mcpToolSelection.find(
    ({ id }) => id === caseId,
  );
  if (inventoryCase === undefined) {
    throw new Error(`Missing MCP inventory case ${caseId}.`);
  }
  if (inventoryCase.expectedToolNames.length === 0) {
    return {
      tag: "noToolSelected",
      reason: "The request is unrelated to the installed MCP surface.",
      confirmation: { tag: "notRequested" },
    };
  }
  const selectedTool = inventoryCase.expectedToolNames[0];
  if (selectedTool === undefined) {
    throw new Error(`MCP inventory case ${caseId} has no expected tool.`);
  }
  return {
    tag: "toolSelected",
    selectedTool,
    arguments: {},
    outcome:
      index === 1
        ? {
            tag: "error",
            details: ["Observed failure."],
            confirmation: { tag: "notRequested" },
          }
        : {
            tag: "success",
            result: { tag: "ok" },
            confirmation: { tag: "notRequested" },
          },
  };
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
    const matrix = decodeCapabilityMatrix(
      resolve(evalRoot, "capability-matrix.json"),
    );
    expect(matrix.rows.map((row) => row.id)).toEqual(expectedRowIds);
    expect(matrix.rows.map((row) => row.leafIssue)).toEqual(expectedLeafIssues);
    expect(new Set(matrix.rows.map((row) => row.id)).size).toBe(21);
    const derivedQueries = matrix.rows.find(
      (row) => row.id === "character-sheet-derived-queries",
    );
    expect(derivedQueries?.requiredQueryKinds).toEqual([
      ...CHARACTER_SHEET_DERIVED_QUERY_KINDS,
    ]);
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
    const journeySource = readFileSync(
      resolve(repoRoot, matrix.representativeHeadlessJourney.testPath),
      "utf8",
    );
    expect(
      sourceDefinesVitestScenario(
        journeySource,
        matrix.representativeHeadlessJourney.scenarioId,
      ),
    ).toBe(true);
    for (const row of matrix.rows) {
      expect(row.capability.trim(), row.id).not.toBe("");
      expect(row.boundary.trim(), row.id).not.toBe("");
      expect(row.mcpSurface.length, row.id).toBeGreaterThan(0);
      expect(row.modelVisibleProjection.length, row.id).toBeGreaterThan(0);
      expect(row.mcpEvidence.status, row.id).toBe("observed");
    }
  });

  test("cross-validates MCP refs, inventory cases, scenario ids, and projection contracts", async () => {
    const matrix = decodeCapabilityMatrix(
      resolve(evalRoot, "capability-matrix.json"),
    );
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
    expect(manifestByKey.size).toBe(manifest.evidence.length);
    const skillCaseIds = new Set(inventory.skillActivation.map(({ id }) => id));
    for (const row of matrix.rows) {
      if (row.mcpEvidence.status === "observed") {
        const rowRefKeys = new Set<string>();
        for (const ref of row.mcpEvidence.refs) {
          const refKey = `${ref.scenarioId}\u0000${ref.flowId}\u0000${ref.taskId}`;
          expect(
            rowRefKeys.has(refKey),
            `${row.id}: duplicate MCP evidence reference ${refKey}`,
          ).toBe(false);
          rowRefKeys.add(refKey);
          const manifestRow = manifestByKey.get(refKey);
          expect(manifestRow, row.id).toBeDefined();
          if (row.requiredQueryKinds !== undefined) {
            expect(manifestRow?.queryKinds, row.id).toEqual(
              row.requiredQueryKinds,
            );
          }
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
      const toolByName = new Map(
        tools.tools.map((tool) => [
          tool.name,
          { name: tool.name, outputSchema: tool.outputSchema },
        ]),
      );
      const missingProjections: string[] = [];
      for (const row of matrix.rows) {
        for (const projection of row.modelVisibleProjection) {
          if (
            !validateModelVisibleProjection(
              projection,
              row.mcpSurface,
              toolByName,
            )
          ) {
            missingProjections.push(
              `${row.id}: ${projection.toolName}.${projection.pathSegments.join(".")}`,
            );
          }
        }
      }
      expect(missingProjections).toEqual([]);
      expect(
        validateModelVisibleProjection(
          {
            toolName: "read_battle_state",
            pathSegments: ["snapshot", "notReal"],
          },
          ["read_battle_state"],
          toolByName,
        ),
      ).toBe(false);
      expect(
        validateModelVisibleProjection(
          { toolName: "read_battle_state", pathSegments: ["currentActorId"] },
          ["read_battle_state"],
          toolByName,
        ),
      ).toBe(false);
      expect(
        validateModelVisibleProjection(
          { toolName: "start_battle", pathSegments: ["snapshot"] },
          ["read_battle_state"],
          toolByName,
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
    expect(validateInstalledCaseCoverage(evidence, inventory)).toEqual({
      tag: "valid",
    });
    expect(evidence.operatorProtocol.map(({ step }) => step)).toEqual([
      "mcp-connection",
      "complete-plugin",
      "newcomer-journey",
    ]);
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
              observation: observedConnectionObservation(caseId, index),
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

  test("couples observed MCP selections to inventory expectations", () => {
    expect(
      hasInventoryCompatibleConnectionObservation(
        evaluationInventory,
        "mcp-direct-catalog",
        {
          tag: "toolSelected",
          selectedTool: "list_catalog_units",
        },
      ),
    ).toBe(true);
    expect(
      hasInventoryCompatibleConnectionObservation(
        evaluationInventory,
        "mcp-follow-up-detail",
        {
          tag: "toolSelected",
          selectedTool: "list_catalog_units",
        },
      ),
    ).toBe(false);
    expect(
      hasInventoryCompatibleConnectionObservation(
        evaluationInventory,
        "mcp-follow-up-detail",
        {
          tag: "toolSelected",
          selectedTool: "inspect_catalog_unit",
        },
      ),
    ).toBe(true);
    expect(
      hasInventoryCompatibleConnectionObservation(
        evaluationInventory,
        "mcp-direct-catalog",
        { tag: "noToolSelected" },
      ),
    ).toBe(false);
    expect(
      hasInventoryCompatibleConnectionObservation(
        evaluationInventory,
        "mcp-unsupported-history",
        { tag: "noToolSelected" },
      ),
    ).toBe(true);
  });
});

function decodeInstalledEvidence(value: unknown): InstalledEvidence {
  return Schema.decodeUnknownSync(InstalledEvidenceSchema, {
    onExcessProperty: "error",
  })(value);
}

function validateModelVisibleProjection(
  projection: {
    readonly toolName: string;
    readonly pathSegments: readonly string[];
  },
  mcpSurface: readonly string[],
  toolByName: ReadonlyMap<
    string,
    { readonly name: string; readonly outputSchema?: unknown }
  >,
): boolean {
  if (!mcpSurface.includes(projection.toolName)) return false;
  const tool = toolByName.get(projection.toolName);
  return (
    tool !== undefined &&
    tool.name === projection.toolName &&
    tool.outputSchema !== undefined &&
    schemaHasProjectionPath(tool.outputSchema, projection.pathSegments)
  );
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

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeFile<S extends Schema.Schema.AnyNoContext>(
  schema: S,
  path: string,
): Schema.Schema.Type<S> {
  return Schema.decodeUnknownSync(schema)(
    JSON.parse(readFileSync(path, "utf8")),
  );
}
