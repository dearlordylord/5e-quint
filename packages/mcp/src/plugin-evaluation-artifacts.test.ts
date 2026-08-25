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
import {
  decodeCapabilityMatrix,
  CapabilityMatrixSchema,
  NON_DERIVED_CAPABILITY_ROW_ID_VALUES,
  type CapabilityMatrix,
} from "../test-support/capability-matrix.ts";
import {
  CharacterSessionQueryKindsSchema,
  CHARACTER_SESSION_QUERY_KIND_VALUES,
} from "./character-session-query-tool-input.ts";
import { sourceDefinesVitestScenario } from "../test-support/mcp-scenario-executable.ts";
import { createDndMcpProtocolServer } from "./protocol-server.ts";

const repoRoot = resolve(import.meta.dirname, "../../..");
const evalRoot = resolve(repoRoot, "plugins/dnd-srd-oracle/evals");
const manifestPath = resolve(
  repoRoot,
  "plans/unit-profile-coverage/mcp-scenario-evidence.json",
);

const McpManifestRowCommonFields = {
  kind: Schema.Literal("mcp-scenario"),
  flowId: Schema.String,
  scopeIds: Schema.NonEmptyArray(Schema.String),
  scenarioId: Schema.String,
  ownerPath: Schema.String,
  testPath: Schema.String,
  taskId: Schema.String,
  summary: Schema.String,
};

type EvidenceRefKey = `${string}\u0000${string}\u0000${string}`;

declare const NonQueryCoverageScenarioIdBrand: unique symbol;
type NonQueryCoverageScenarioId = string & {
  readonly [NonQueryCoverageScenarioIdBrand]: true;
};

function evidenceRefKey(ref: {
  readonly scenarioId: string;
  readonly flowId: string;
  readonly taskId: string;
}): EvidenceRefKey {
  return `${ref.scenarioId}\u0000${ref.flowId}\u0000${ref.taskId}`;
}

function mcpManifestSchemaFor(matrix: CapabilityMatrix) {
  const derivedQueryEvidenceRefs = matrix.rows
    .filter((row) => row.id === "character-sheet-derived-queries")
    .flatMap((row) =>
      row.mcpEvidence.status === "observed" ? row.mcpEvidence.refs : [],
    );
  const derivedQueryEvidenceKeys = new Set<EvidenceRefKey>(
    derivedQueryEvidenceRefs.map(evidenceRefKey),
  );
  const derivedQueryScenarioIds = new Set(
    derivedQueryEvidenceRefs.map(({ scenarioId }) => scenarioId),
  );
  const derivedRowSchemas = derivedQueryEvidenceRefs.map((ref) =>
    Schema.Struct({
      ...McpManifestRowCommonFields,
      flowId: Schema.Literal(ref.flowId),
      scenarioId: Schema.Literal(ref.scenarioId),
      taskId: Schema.Literal(ref.taskId),
      queryKinds: CharacterSessionQueryKindsSchema,
    }),
  );
  const derivedRowSchema = Schema.Union(...derivedRowSchemas, Schema.Never);
  const NonQueryCoverageScenarioIdSchema = Schema.String.pipe(
    Schema.filter(
      (scenarioId): scenarioId is NonQueryCoverageScenarioId =>
        !derivedQueryScenarioIds.has(scenarioId),
      {
        description:
          "ordinary manifest rows cannot use a canonical derived-query scenario id",
      },
    ),
  );
  const nonDerivedRowSchema = Schema.Struct({
    ...McpManifestRowCommonFields,
    scenarioId: NonQueryCoverageScenarioIdSchema,
  }).pipe(
    Schema.filter((row) => !derivedQueryEvidenceKeys.has(evidenceRefKey(row)), {
      description:
        "ordinary manifest rows cannot use a canonical derived-query evidence key",
    }),
  );
  const rowSchema = Schema.Union(derivedRowSchema, nonDerivedRowSchema);
  return Schema.Struct({
    schema: Schema.Literal("dnd.mcp-scenario-evidence.v1"),
    ownerPackage: Schema.Literal("@dnd/mcp"),
    check: Schema.Struct({
      packageName: Schema.Literal("@dnd/mcp"),
      script: Schema.String,
    }),
    requiredFlows: Schema.NonEmptyArray(
      Schema.Struct({
        flowId: Schema.String,
        scopeIds: Schema.NonEmptyArray(Schema.String),
        followUpTaskIdsByScope: Schema.Record({
          key: Schema.String,
          value: Schema.String,
        }),
        description: Schema.String,
      }),
    ),
    evidence: Schema.NonEmptyArray(rowSchema),
    scopeAuditDecisions: Schema.Array(Schema.Any),
  });
}
const ApiMcpSelectionOperatorStepSchema = Schema.Struct({
  step: Schema.Literal("api-mcp-selection"),
  evidenceKind: Schema.Literal("apiMcpToolSelection"),
  instructions: Schema.String,
  requiredCases: Schema.NonEmptyArray(Schema.String),
});
const ConnectionToolSelectionOperatorStepSchema = Schema.Struct({
  step: Schema.Literal("mcp-connection"),
  evidenceKind: Schema.Literal("installedConnectionToolSelection"),
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

function unobservedCaseResultSchema<Kind extends string>(
  evidenceKind: Schema.Literal<[Kind]>,
) {
  return Schema.Union(
    Schema.Struct({
      caseId: Schema.String,
      evidenceKind,
      status: Schema.Literal("pending"),
    }),
    Schema.Struct({
      caseId: Schema.String,
      evidenceKind,
      status: Schema.Literal("blocked"),
      blocker: Schema.String,
    }),
  );
}

const UnobservedApiMcpSelectionCaseResultSchema = unobservedCaseResultSchema(
  Schema.Literal("apiMcpToolSelection"),
);
const UnobservedConnectionToolSelectionCaseResultSchema =
  unobservedCaseResultSchema(
    Schema.Literal("installedConnectionToolSelection"),
  );
const UnobservedSkillActivationCaseResultSchema = unobservedCaseResultSchema(
  Schema.Literal("installedSkillActivation"),
);
const UnobservedWorkflowCaseResultSchema = unobservedCaseResultSchema(
  Schema.Literal("installedCompleteWorkflow"),
);
const UnobservedInstalledCaseResultSchema = Schema.Union(
  UnobservedConnectionToolSelectionCaseResultSchema,
  UnobservedSkillActivationCaseResultSchema,
  UnobservedWorkflowCaseResultSchema,
);
const ConfirmationBehaviorSchema = Schema.Union(
  Schema.Struct({ tag: Schema.Literal("notRequested") }),
  Schema.Struct({
    tag: Schema.Literal("requested"),
    outcome: Schema.Literal("accepted", "declined"),
  }),
);
const ToolSelectionObservationSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("toolSelected"),
    selectedTool: Schema.String,
    arguments: Schema.Record({ key: Schema.String, value: Schema.Any }),
    alsoCalledTools: Schema.Array(Schema.String),
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
type ToolSelectionObservation = typeof ToolSelectionObservationSchema.Type;
const ServerAdvertisementSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("advertised"),
    serverLabel: Schema.String,
    toolNames: Schema.NonEmptyArray(Schema.String),
  }),
  Schema.Struct({
    tag: Schema.Literal("notAdvertised"),
    reason: Schema.String,
  }),
);
const InventoryConclusionSchema = Schema.Literal(
  "metExpectation",
  "missedExpectation",
);
const ToolSelectionCaseFields = {
  caseId: Schema.String,
  status: Schema.Literal("observed"),
  model: Schema.String,
  serverAdvertisement: ServerAdvertisementSchema,
  observation: ToolSelectionObservationSchema,
  conclusion: InventoryConclusionSchema,
  promptRef: Schema.String,
  observedAt: Schema.String,
  resultSummary: Schema.String,
};
const ObservedApiMcpSelectionCaseResultSchema = Schema.Struct({
  ...ToolSelectionCaseFields,
  evidenceKind: Schema.Literal("apiMcpToolSelection"),
  responseId: Schema.String,
});
const ObservedConnectionToolSelectionCaseResultSchema = Schema.Struct({
  ...ToolSelectionCaseFields,
  evidenceKind: Schema.Literal("installedConnectionToolSelection"),
  conversationId: Schema.String,
});
const ApiMcpSelectionCaseResultSchema = Schema.Union(
  UnobservedApiMcpSelectionCaseResultSchema,
  ObservedApiMcpSelectionCaseResultSchema,
);
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
const ObservedInstalledCaseResultSchema = Schema.Union(
  ObservedConnectionToolSelectionCaseResultSchema,
  ObservedSkillCaseResultSchema,
);
const InstalledCaseResultSchema = Schema.Union(
  UnobservedInstalledCaseResultSchema,
  ObservedInstalledCaseResultSchema,
);
const ObservedEnvironmentSchema = Schema.Struct({
  tag: Schema.Literal("observed"),
  accountScope: Schema.String,
  browserProfile: Schema.String,
  workspacePolicy: Schema.String,
});
const InstalledEvidenceCommonSchema = {
  schema: Schema.Literal("dnd.srd-oracle.installed-chatgpt-evidence.v4"),
  recordedAt: Schema.String,
  scope: Schema.String,
  promptOwner: Schema.Literal(
    "plugins/dnd-srd-oracle/evals/evaluation-inventory.json",
  ),
  capabilityMatrix: Schema.Literal(
    "plugins/dnd-srd-oracle/evals/capability-matrix.json",
  ),
  canonicalMcpEvidence: Schema.Struct({
    manifestPath: Schema.Literal(
      "plans/unit-profile-coverage/mcp-scenario-evidence.json",
    ),
    status: Schema.Literal("observed"),
    evidenceKind: Schema.Literal("mcpScenario"),
  }),
  apiMcpSelectionEvidence: Schema.Struct({
    artifactPath: Schema.Literal(
      "plugins/dnd-srd-oracle/evals/api-mcp-selection-evidence.json",
    ),
    evidenceKind: Schema.Literal("apiMcpToolSelection"),
  }),
  officialGuidance: Schema.Literal(
    "https://developers.openai.com/plugins/deploy/connect-chatgpt",
  ),
  operatorProtocol: Schema.Tuple(
    ConnectionToolSelectionOperatorStepSchema,
    SkillActivationOperatorStepSchema,
    CompleteWorkflowOperatorStepSchema,
  ),
};
const PendingInstalledEvidenceSchema = Schema.Struct({
  ...InstalledEvidenceCommonSchema,
  status: Schema.Literal("pending"),
  environment: Schema.Struct({ tag: Schema.Literal("notObserved") }),
  unresolvedEvidenceReason: Schema.String,
  caseResults: Schema.Array(UnobservedInstalledCaseResultSchema),
});
const PartiallyObservedInstalledEvidenceSchema = Schema.Struct({
  ...InstalledEvidenceCommonSchema,
  status: Schema.Literal("partiallyObserved"),
  environment: ObservedEnvironmentSchema,
  unresolvedEvidenceReason: Schema.String,
  caseResults: Schema.NonEmptyArray(InstalledCaseResultSchema),
});
const ObservedInstalledEvidenceSchema = Schema.Struct({
  ...InstalledEvidenceCommonSchema,
  status: Schema.Literal("observed"),
  environment: ObservedEnvironmentSchema,
  caseResults: Schema.NonEmptyArray(ObservedInstalledCaseResultSchema),
});
const InstalledEvidenceSchema = Schema.Union(
  PendingInstalledEvidenceSchema,
  PartiallyObservedInstalledEvidenceSchema,
  ObservedInstalledEvidenceSchema,
).pipe(
  Schema.filter(installedEvidenceHasCompleteCoverage, {
    description:
      "installed evidence with every connection, activation, and workflow case",
  }),
  Schema.filter(evidenceStatusMatchesCaseResults, {
    description: "installed evidence status consistent with its case results",
  }),
);
type InstalledEvidence = typeof InstalledEvidenceSchema.Type;

const ApiMcpSelectionEvidenceCommonSchema = {
  schema: Schema.Literal("dnd.srd-oracle.api-mcp-selection-evidence.v1"),
  recordedAt: Schema.String,
  scope: Schema.String,
  promptOwner: Schema.Literal(
    "plugins/dnd-srd-oracle/evals/evaluation-inventory.json",
  ),
  officialGuidance: Schema.Literal(
    "https://developers.openai.com/plugins/deploy/connect-chatgpt",
  ),
  operatorProtocol: Schema.Tuple(ApiMcpSelectionOperatorStepSchema),
};
const ObservedApiEnvironmentSchema = Schema.Struct({
  tag: Schema.Literal("observed"),
  apiEndpoint: Schema.String,
  transport: Schema.Union(
    Schema.Struct({
      tag: Schema.Literal("publicHttps"),
      serverUrl: Schema.String,
    }),
    Schema.Struct({
      tag: Schema.Literal("secureMcpTunnel"),
      tunnelId: Schema.String,
    }),
  ),
});
const UnobservedApiEnvironmentSchema = Schema.Struct({
  tag: Schema.Literal("notObserved"),
});
const PendingApiMcpSelectionEvidenceSchema = Schema.Struct({
  ...ApiMcpSelectionEvidenceCommonSchema,
  status: Schema.Literal("pending"),
  environment: UnobservedApiEnvironmentSchema,
  unresolvedEvidenceReason: Schema.String,
  caseResults: Schema.Array(UnobservedApiMcpSelectionCaseResultSchema),
});
const BlockedApiMcpSelectionEvidenceSchema = Schema.Struct({
  ...ApiMcpSelectionEvidenceCommonSchema,
  status: Schema.Literal("blocked"),
  environment: UnobservedApiEnvironmentSchema,
  unresolvedEvidenceReason: Schema.String,
  caseResults: Schema.NonEmptyArray(UnobservedApiMcpSelectionCaseResultSchema),
});
const PartiallyObservedApiMcpSelectionEvidenceSchema = Schema.Struct({
  ...ApiMcpSelectionEvidenceCommonSchema,
  status: Schema.Literal("partiallyObserved"),
  environment: ObservedApiEnvironmentSchema,
  unresolvedEvidenceReason: Schema.String,
  caseResults: Schema.NonEmptyArray(ApiMcpSelectionCaseResultSchema),
});
const ObservedApiMcpSelectionEvidenceSchema = Schema.Struct({
  ...ApiMcpSelectionEvidenceCommonSchema,
  status: Schema.Literal("observed"),
  environment: ObservedApiEnvironmentSchema,
  caseResults: Schema.NonEmptyArray(ObservedApiMcpSelectionCaseResultSchema),
});
const ApiMcpSelectionEvidenceSchema = Schema.Union(
  PendingApiMcpSelectionEvidenceSchema,
  BlockedApiMcpSelectionEvidenceSchema,
  PartiallyObservedApiMcpSelectionEvidenceSchema,
  ObservedApiMcpSelectionEvidenceSchema,
).pipe(
  Schema.filter(apiMcpSelectionEvidenceHasCompleteCoverage, {
    description: "API evidence with every MCP tool-selection case",
  }),
  Schema.filter(evidenceStatusMatchesCaseResults, {
    description: "API evidence status consistent with its case results",
  }),
);
type ApiMcpSelectionEvidence = typeof ApiMcpSelectionEvidenceSchema.Type;

const evaluationInventory = decodeEvaluationInventory(
  resolve(evalRoot, "evaluation-inventory.json"),
);

const API_EVIDENCE_KIND_VALUES = ["apiMcpToolSelection"] as const;
const INSTALLED_EVIDENCE_KIND_VALUES = [
  "installedConnectionToolSelection",
  "installedSkillActivation",
  "installedCompleteWorkflow",
] as const;
type EvaluationEvidenceKind =
  | (typeof API_EVIDENCE_KIND_VALUES)[number]
  | (typeof INSTALLED_EVIDENCE_KIND_VALUES)[number];

function expectedCaseIds(
  inventory: EvaluationInventory,
  evidenceKind: EvaluationEvidenceKind,
): ReadonlySet<string> {
  return Match.value(evidenceKind).pipe(
    Match.when(
      "apiMcpToolSelection",
      () => new Set(inventory.mcpToolSelection.map(({ id }) => id)),
    ),
    Match.when(
      "installedConnectionToolSelection",
      () => new Set(inventory.mcpToolSelection.map(({ id }) => id)),
    ),
    Match.when(
      "installedSkillActivation",
      () => new Set(inventory.skillActivation.map(({ id }) => id)),
    ),
    Match.when(
      "installedCompleteWorkflow",
      () => new Set(inventory.completeWorkflow.map(({ id }) => id)),
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

type EvidenceCoverageInput = {
  readonly operatorProtocol: ReadonlyArray<{
    readonly step: string;
    readonly requiredCases: ReadonlyArray<string>;
    readonly evidenceKind: EvaluationEvidenceKind;
  }>;
  readonly caseResults: ReadonlyArray<{
    readonly caseId: string;
    readonly evidenceKind: string;
    readonly observation?: unknown;
    readonly conclusion?: unknown;
  }>;
};

type EvidenceStatusInput = {
  readonly status: "pending" | "blocked" | "partiallyObserved" | "observed";
  readonly caseResults: ReadonlyArray<{
    readonly status: "pending" | "blocked" | "observed";
  }>;
};

type EvidenceCoverageResult =
  | { readonly tag: "valid" }
  | { readonly tag: "invalid"; readonly reason: string };

function installedEvidenceHasCompleteCoverage(
  evidence: EvidenceCoverageInput,
): boolean {
  return (
    validateEvidenceCaseCoverage(
      evidence,
      evaluationInventory,
      INSTALLED_EVIDENCE_KIND_VALUES,
    ).tag === "valid"
  );
}

function apiMcpSelectionEvidenceHasCompleteCoverage(
  evidence: EvidenceCoverageInput,
): boolean {
  return (
    validateEvidenceCaseCoverage(
      evidence,
      evaluationInventory,
      API_EVIDENCE_KIND_VALUES,
    ).tag === "valid"
  );
}

function evidenceStatusMatchesCaseResults(
  evidence: EvidenceStatusInput,
): boolean {
  const countOf = (status: "pending" | "blocked" | "observed") =>
    evidence.caseResults.filter((result) => result.status === status).length;
  const pendingCount = countOf("pending");
  const blockedCount = countOf("blocked");
  const observedCount = countOf("observed");
  const total = evidence.caseResults.length;
  return Match.value(evidence.status).pipe(
    Match.when("pending", () => pendingCount === total),
    Match.when("blocked", () => blockedCount === total && total > 0),
    Match.when(
      "partiallyObserved",
      () => observedCount > 0 && observedCount < total,
    ),
    Match.when("observed", () => observedCount === total && total > 0),
    Match.exhaustive,
  );
}

function validateEvidenceCaseCoverage(
  evidence: EvidenceCoverageInput,
  inventory: EvaluationInventory,
  ownedEvidenceKinds: ReadonlyArray<EvaluationEvidenceKind>,
): EvidenceCoverageResult {
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
    if (!ownedEvidenceKinds.includes(step.evidenceKind)) {
      return {
        tag: "invalid",
        reason: `${step.step} records an evidence kind owned by another artifact`,
      };
    }
    if (
      !caseSetEquals(
        step.requiredCases,
        expectedCaseIds(inventory, step.evidenceKind),
      )
    ) {
      return {
        tag: "invalid",
        reason: `${step.step} must exactly equal its inventory group`,
      };
    }
  }
  for (const evidenceKind of ownedEvidenceKinds) {
    const actualCaseIds = evidence.caseResults
      .filter((result) => result.evidenceKind === evidenceKind)
      .map(({ caseId }) => caseId);
    if (
      !caseSetEquals(actualCaseIds, expectedCaseIds(inventory, evidenceKind))
    ) {
      return {
        tag: "invalid",
        reason: `${evidenceKind} results must exactly equal its inventory group`,
      };
    }
  }
  for (const result of evidence.caseResults) {
    if (result.observation === undefined) continue;
    const expected = toolSelectionMeetsInventoryExpectation(
      inventory,
      result.caseId,
      result.observation,
    )
      ? "metExpectation"
      : "missedExpectation";
    if (result.conclusion !== expected) {
      return {
        tag: "invalid",
        reason: `${result.caseId} conclusion must be ${expected} for its observed tool selection`,
      };
    }
  }
  return { tag: "valid" };
}

function toolSelectionMeetsInventoryExpectation(
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

function observedToolSelectionObservation(
  caseId: string,
  index: number,
): ToolSelectionObservation {
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
    alsoCalledTools: [],
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
  ...NON_DERIVED_CAPABILITY_ROW_ID_VALUES.slice(0, 4),
  "character-sheet-derived-queries",
  ...NON_DERIVED_CAPABILITY_ROW_ID_VALUES.slice(4),
] as const;
const expectedLeafIssues = [
  318, 320, 320, 318, 319, 318, 321, 322, 323, 323, 319, 321, 324, 324, 324,
  325, 326, 324, 327, 327, 327,
] as const;

describe("5.5e SRD Oracle evaluation artifacts", () => {
  test("specializes query-kind metadata to the canonical capability and scenario", () => {
    const matrixPath = resolve(evalRoot, "capability-matrix.json");
    const rawMatrix = JSON.parse(readFileSync(matrixPath, "utf8"));
    const unrelatedMatrixRow = rawMatrix.rows.find(
      (row: { readonly id: string }) =>
        row.id !== "character-sheet-derived-queries",
    );
    if (unrelatedMatrixRow === undefined) {
      throw new Error("Expected an unrelated capability matrix row.");
    }
    const matrixWithUnrelatedKinds = {
      ...rawMatrix,
      rows: rawMatrix.rows.map((row: { readonly id: string }) =>
        row.id === unrelatedMatrixRow.id
          ? {
              ...row,
              requiredQueryKinds: [...CHARACTER_SESSION_QUERY_KIND_VALUES],
            }
          : row,
      ),
    };
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(CapabilityMatrixSchema, {
          onExcessProperty: "error",
        })(matrixWithUnrelatedKinds),
      ),
    ).toBe(true);
    const matrixWithDerivedIdentityAsOrdinary = {
      ...rawMatrix,
      rows: rawMatrix.rows.map(
        (row: {
          readonly id: string;
          readonly requiredQueryKinds?: readonly string[];
        }) => {
          if (row.id !== "character-sheet-derived-queries") return row;
          const {
            requiredQueryKinds: _requiredQueryKinds,
            ...withoutRequiredQueryKinds
          } = row;
          void _requiredQueryKinds;
          return withoutRequiredQueryKinds;
        },
      ),
    };
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(CapabilityMatrixSchema, {
          onExcessProperty: "error",
        })(matrixWithDerivedIdentityAsOrdinary),
      ),
    ).toBe(true);

    const matrix = decodeCapabilityMatrix(matrixPath);
    const rawManifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const coverageRow = rawManifest.evidence.find(
      (row: { readonly queryKinds?: readonly string[] }) =>
        row.queryKinds !== undefined,
    );
    const unrelatedManifestRow = rawManifest.evidence.find(
      (row: { readonly queryKinds?: readonly string[] }) =>
        row.queryKinds === undefined,
    );
    if (coverageRow === undefined || unrelatedManifestRow === undefined) {
      throw new Error(
        "Expected both query coverage and ordinary manifest rows.",
      );
    }
    const manifestWithUnrelatedKinds = {
      ...rawManifest,
      evidence: rawManifest.evidence.map(
        (row: { readonly scenarioId: string }) =>
          row.scenarioId === unrelatedManifestRow.scenarioId
            ? {
                ...row,
                queryKinds: [...CHARACTER_SESSION_QUERY_KIND_VALUES],
              }
            : row,
      ),
    };
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(mcpManifestSchemaFor(matrix), {
          onExcessProperty: "error",
        })(manifestWithUnrelatedKinds),
      ),
    ).toBe(true);
    const manifestWithoutCoverageKinds = {
      ...rawManifest,
      evidence: rawManifest.evidence.map(
        (row: {
          readonly scenarioId: string;
          readonly queryKinds?: unknown;
        }) => {
          if (row.scenarioId !== coverageRow.scenarioId) return row;
          const { queryKinds: _queryKinds, ...withoutQueryKinds } = row;
          void _queryKinds;
          return withoutQueryKinds;
        },
      ),
    };
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(mcpManifestSchemaFor(matrix), {
          onExcessProperty: "error",
        })(manifestWithoutCoverageKinds),
      ),
    ).toBe(true);

    const decodedManifest = decodeFile(
      mcpManifestSchemaFor(matrix),
      manifestPath,
    );
    for (const row of decodedManifest.evidence) {
      if ("queryKinds" in row) {
        expect(row.scenarioId).toBe(coverageRow.scenarioId);
      } else {
        expect(row.scenarioId).not.toBe(coverageRow.scenarioId);
      }
    }
  });

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
    expect(
      derivedQueries !== undefined && "requiredQueryKinds" in derivedQueries
        ? derivedQueries.requiredQueryKinds
        : undefined,
    ).toEqual([...CHARACTER_SESSION_QUERY_KIND_VALUES]);
    for (const row of matrix.rows) {
      if (row.id === "character-sheet-derived-queries") {
        expect(row.requiredQueryKinds).toEqual(
          CHARACTER_SESSION_QUERY_KIND_VALUES,
        );
      } else {
        expect("requiredQueryKinds" in row).toBe(false);
      }
    }
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
    expect(installedEvidence.status).toBe("partiallyObserved");
    expect(
      installedEvidence.operatorProtocol.map((step) => step.evidenceKind),
    ).toEqual(matrix.installedChatGptEvidence.evidenceKinds);
    expect(
      existsSync(
        resolve(repoRoot, matrix.apiMcpSelectionEvidence.artifactPath),
      ),
    ).toBe(true);
    const apiEvidence = decodeApiMcpSelectionEvidence(
      JSON.parse(
        readFileSync(
          resolve(repoRoot, matrix.apiMcpSelectionEvidence.artifactPath),
          "utf8",
        ),
      ),
    );
    expect(apiEvidence.status).toBe("blocked");
    expect(
      apiEvidence.operatorProtocol.map((step) => step.evidenceKind),
    ).toEqual(matrix.apiMcpSelectionEvidence.evidenceKinds);
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
    const manifest = decodeFile(mcpManifestSchemaFor(matrix), manifestPath);
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
          if ("requiredQueryKinds" in row) {
            expect(
              manifestRow !== undefined && "queryKinds" in manifestRow
                ? manifestRow.queryKinds
                : undefined,
              row.id,
            ).toEqual(row.requiredQueryKinds);
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
      name: "dnd-srd-oracle-capability-matrix-check",
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

  test("records partial installed ChatGPT evidence without promoting pending cases", () => {
    const evidence = decodeInstalledEvidence(
      JSON.parse(
        readFileSync(
          resolve(evalRoot, "installed-chatgpt-evidence.json"),
          "utf8",
        ),
      ),
    );
    expect(evidence.status).toBe("partiallyObserved");
    if (evidence.status !== "partiallyObserved") return;
    expect(evidence.environment.tag).toBe("observed");
    expect(
      evidence.caseResults
        .filter(({ status }) => status === "observed")
        .map(({ caseId, evidenceKind }) => `${caseId}:${evidenceKind}`)
        .sort(),
    ).toEqual([
      "complete-newcomer-journey:installedCompleteWorkflow",
      "mcp-direct-catalog:installedConnectionToolSelection",
      "mcp-follow-up-detail:installedConnectionToolSelection",
      "mcp-indirect-catalog:installedConnectionToolSelection",
      "mcp-unsupported-history:installedConnectionToolSelection",
    ]);
    expect(
      evidence.caseResults.filter(({ status }) => status === "blocked"),
    ).toHaveLength(5);
    expect(
      evidence.caseResults.filter(({ status }) => status === "pending"),
    ).toHaveLength(0);
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
    expect(
      validateEvidenceCaseCoverage(
        evidence,
        inventory,
        INSTALLED_EVIDENCE_KIND_VALUES,
      ),
    ).toEqual({ tag: "valid" });
    expect(evidence.operatorProtocol.map(({ step }) => step)).toEqual([
      "mcp-connection",
      "complete-plugin",
      "newcomer-journey",
    ]);
  });

  test("keeps API MCP-selection evidence in its own blocked artifact", () => {
    const evidence = decodeApiMcpSelectionEvidence(
      JSON.parse(
        readFileSync(
          resolve(evalRoot, "api-mcp-selection-evidence.json"),
          "utf8",
        ),
      ),
    );
    expect(evidence.status).toBe("blocked");
    expect(evidence.environment.tag).toBe("notObserved");
    expect(
      evidence.caseResults.every(({ status }) => status === "blocked"),
    ).toBe(true);
    expect(evidence.operatorProtocol.map(({ step }) => step)).toEqual([
      "api-mcp-selection",
    ]);
    const inventory: EvaluationInventory = decodeEvaluationInventory(
      resolve(evalRoot, "evaluation-inventory.json"),
    );
    expect(
      validateEvidenceCaseCoverage(
        evidence,
        inventory,
        API_EVIDENCE_KIND_VALUES,
      ),
    ).toEqual({ tag: "valid" });
    expect(
      evidence.caseResults.every(
        ({ evidenceKind }) => evidenceKind === "apiMcpToolSelection",
      ),
    ).toBe(true);
  });

  test("refuses API MCP-selection cases inside the installed ChatGPT artifact", () => {
    const installed = JSON.parse(
      readFileSync(
        resolve(evalRoot, "installed-chatgpt-evidence.json"),
        "utf8",
      ),
    );
    const apiEvidence = JSON.parse(
      readFileSync(
        resolve(evalRoot, "api-mcp-selection-evidence.json"),
        "utf8",
      ),
    );
    const merged = {
      ...installed,
      operatorProtocol: [
        ...apiEvidence.operatorProtocol,
        ...installed.operatorProtocol,
      ],
      caseResults: [...apiEvidence.caseResults, ...installed.caseResults],
    };
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(InstalledEvidenceSchema, {
          onExcessProperty: "error",
        })(merged),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(ApiMcpSelectionEvidenceSchema, {
          onExcessProperty: "error",
        })(installed),
      ),
    ).toBe(true);
  });

  test("accepts typed API tool-selection observations only in observed state", () => {
    const blocked = decodeApiMcpSelectionEvidence(
      JSON.parse(
        readFileSync(
          resolve(evalRoot, "api-mcp-selection-evidence.json"),
          "utf8",
        ),
      ),
    );
    if (blocked.status !== "blocked")
      throw new Error("Expected blocked API fixture.");
    const {
      unresolvedEvidenceReason: _unresolvedEvidenceReason,
      ...blockedWithoutReason
    } = blocked;
    void _unresolvedEvidenceReason;
    const observed = {
      ...blockedWithoutReason,
      status: "observed",
      environment: {
        tag: "observed",
        apiEndpoint: "https://api.openai.com/v1/responses",
        transport: {
          tag: "secureMcpTunnel",
          tunnelId: "tunnel_synthetic_observation",
        },
      },
      caseResults: blocked.caseResults.map(
        ({ caseId, evidenceKind }, index) => ({
          caseId,
          evidenceKind,
          status: "observed" as const,
          model: "synthetic-observation-model",
          responseId: `resp_synthetic_${index}`,
          serverAdvertisement: {
            tag: "advertised" as const,
            serverLabel: "dnd-srd-oracle",
            toolNames: ["list_catalog_units", "inspect_catalog_unit"],
          },
          observation: observedToolSelectionObservation(caseId, index),
          conclusion: "metExpectation" as const,
          promptRef: caseId,
          observedAt: `2026-08-21T00:${String(index).padStart(2, "0")}:00Z`,
          resultSummary:
            index === 1
              ? "The observed case reported a tool error."
              : "The observed case produced the expected behavior.",
        }),
      ),
    };
    expect(decodeApiMcpSelectionEvidence(observed).status).toBe("observed");
    const contradictory = Schema.decodeUnknownEither(
      ApiMcpSelectionEvidenceSchema,
      { onExcessProperty: "error" },
    )({ ...observed, environment: { tag: "notObserved" } });
    expect(Either.isLeft(contradictory)).toBe(true);
    const missReportedAsMet = Schema.decodeUnknownEither(
      ApiMcpSelectionEvidenceSchema,
      { onExcessProperty: "error" },
    )({
      ...observed,
      caseResults: observed.caseResults.map((result) =>
        result.caseId === "mcp-follow-up-detail"
          ? {
              ...result,
              observation: {
                tag: "toolSelected",
                selectedTool: "list_catalog_units",
                arguments: {},
                alsoCalledTools: [],
                outcome: {
                  tag: "success",
                  result: { tag: "ok" },
                  confirmation: { tag: "notRequested" },
                },
              },
            }
          : result,
      ),
    });
    expect(Either.isLeft(missReportedAsMet)).toBe(true);
    const missReportedHonestly = decodeApiMcpSelectionEvidence({
      ...observed,
      caseResults: observed.caseResults.map((result) =>
        result.caseId === "mcp-follow-up-detail"
          ? {
              ...result,
              conclusion: "missedExpectation" as const,
              observation: {
                tag: "toolSelected",
                selectedTool: "list_catalog_units",
                arguments: {},
                alsoCalledTools: [],
                outcome: {
                  tag: "success",
                  result: { tag: "ok" },
                  confirmation: { tag: "notRequested" },
                },
              },
            }
          : result,
      ),
    });
    expect(missReportedHonestly.status).toBe("observed");
  });

  test("accepts typed passed and failed installed observations only in observed state", () => {
    const partial = decodeInstalledEvidence(
      JSON.parse(
        readFileSync(
          resolve(evalRoot, "installed-chatgpt-evidence.json"),
          "utf8",
        ),
      ),
    );
    if (partial.status !== "partiallyObserved")
      throw new Error("Expected partially observed fixture.");
    const {
      unresolvedEvidenceReason: _unresolvedEvidenceReason,
      ...partialWithoutReason
    } = partial;
    void _unresolvedEvidenceReason;
    const observed = {
      ...partialWithoutReason,
      status: "observed",
      environment: partial.environment,
      caseResults: partial.caseResults.map((result, index) =>
        result.status === "observed"
          ? result
          : {
              caseId: result.caseId,
              evidenceKind: result.evidenceKind,
              status: "observed" as const,
              result: index === 1 ? ("failed" as const) : ("passed" as const),
              promptRef: result.caseId,
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
      ...partial,
      environment: { tag: "notObserved" },
    });
    expect(Either.isLeft(contradictory)).toBe(true);
  });

  test("couples observed MCP selections to inventory expectations", () => {
    expect(
      toolSelectionMeetsInventoryExpectation(
        evaluationInventory,
        "mcp-direct-catalog",
        {
          tag: "toolSelected",
          selectedTool: "list_catalog_units",
        },
      ),
    ).toBe(true);
    expect(
      toolSelectionMeetsInventoryExpectation(
        evaluationInventory,
        "mcp-follow-up-detail",
        {
          tag: "toolSelected",
          selectedTool: "list_catalog_units",
        },
      ),
    ).toBe(false);
    expect(
      toolSelectionMeetsInventoryExpectation(
        evaluationInventory,
        "mcp-follow-up-detail",
        {
          tag: "toolSelected",
          selectedTool: "inspect_catalog_unit",
        },
      ),
    ).toBe(true);
    expect(
      toolSelectionMeetsInventoryExpectation(
        evaluationInventory,
        "mcp-direct-catalog",
        { tag: "noToolSelected" },
      ),
    ).toBe(false);
    expect(
      toolSelectionMeetsInventoryExpectation(
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

function decodeApiMcpSelectionEvidence(
  value: unknown,
): ApiMcpSelectionEvidence {
  return Schema.decodeUnknownSync(ApiMcpSelectionEvidenceSchema, {
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
  return Schema.decodeUnknownSync(schema, { onExcessProperty: "error" })(
    JSON.parse(readFileSync(path, "utf8")),
  );
}
