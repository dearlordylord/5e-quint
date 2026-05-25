const fs = require("node:fs");
const path = require("node:path");

const passStatus = "pass";
const blockedStatus = "blocked";
const mcpScenarioEvidenceSchema = "dnd.mcp-scenario-evidence.v1";
const mcpScenarioEvidenceSourcePath =
  "plans/unit-profile-coverage/mcp-scenario-evidence.json";
const layerId = Object.freeze({
  supportCompleteness: "support-completeness",
  qntGeneratorReadiness: "qnt-generator-readiness",
  mbtParityEvidence: "mbt-parity-evidence",
  mcpScenarioEvidence: "mcp-scenario-evidence",
});

const layerDefinitions = [
  {
    id: layerId.supportCompleteness,
    label: "Support completeness",
    criterion:
      "The strict level-support claim has no open strict rows, selected-identity blockers, or SRD-authored product-readiness blockers.",
  },
  {
    id: layerId.qntGeneratorReadiness,
    label: "QNT/generator readiness",
    criterion:
      "Every scoped reducer-semantic obligation is covered, and every scoped semantic-core QNT owner is generation-subset-clean with no run-block blocker.",
  },
  {
    id: layerId.mbtParityEvidence,
    label: "MBT/parity evidence",
    criterion:
      "Every scoped reducer-semantic obligation has at least one rules-kernel parity witness.",
  },
  {
    id: layerId.mcpScenarioEvidence,
    label: "MCP scenario evidence",
    criterion:
      "Every scoped user-facing MCP flow has checker-owned scenario evidence backed by the package-local MCP scenario evidence command.",
  },
];

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stable(entry)]),
    );
  }
  return value;
}

function uniqueSorted(values) {
  return Array.from(new Set(values)).sort();
}

function countCoverage(numerator, denominator) {
  return { denominator, numerator };
}

function statusFor(blockingCount) {
  return blockingCount === 0 ? passStatus : blockedStatus;
}

function isRecord(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function unexpectedFieldIssues(value, allowedFields, context) {
  return Object.keys(value)
    .filter((field) => !allowedFields.has(field))
    .map((field) => `${context} must not include unsupported field ${field}.`);
}

function repoRelativePathIssue(ownerPath, context) {
  if (
    path.isAbsolute(ownerPath) ||
    ownerPath.includes("\\") ||
    ownerPath.split("/").includes("..")
  ) {
    return `${context} must be a repo-relative source path.`;
  }
  return undefined;
}

const mcpScenarioEvidenceFields = new Set([
  "schema",
  "ownerPackage",
  "check",
  "requiredFlows",
  "evidence",
]);
const mcpScenarioEvidenceCheckFields = new Set(["packageName", "script"]);
const mcpRequiredFlowFields = new Set([
  "flowId",
  "scopeIds",
  "followUpTaskId",
  "description",
]);
const mcpEvidenceRowFields = new Set([
  "flowId",
  "scenarioId",
  "ownerPath",
  "testPath",
  "taskId",
  "summary",
]);

function validateMcpScenarioEvidence(manifest, { root }) {
  const context = "MCP scenario evidence manifest";
  const issues = [];
  if (!isRecord(manifest)) return [`${context} must be an object.`];
  issues.push(
    ...unexpectedFieldIssues(manifest, mcpScenarioEvidenceFields, context),
  );
  if (manifest.schema !== mcpScenarioEvidenceSchema) {
    issues.push(`${context} schema must be ${mcpScenarioEvidenceSchema}.`);
  }
  if (manifest.ownerPackage !== "@dnd/mcp") {
    issues.push(`${context} ownerPackage must be @dnd/mcp.`);
  }
  if (!isRecord(manifest.check)) {
    issues.push(`${context} check must be an object.`);
  } else {
    issues.push(
      ...unexpectedFieldIssues(
        manifest.check,
        mcpScenarioEvidenceCheckFields,
        `${context} check`,
      ),
    );
    if (manifest.check.packageName !== "@dnd/mcp") {
      issues.push(`${context} check.packageName must be @dnd/mcp.`);
    }
    if (!isNonEmptyString(manifest.check.script)) {
      issues.push(`${context} check.script must be a non-empty string.`);
    } else {
      const packageJsonPath = path.join(root, "packages/mcp/package.json");
      if (!fs.existsSync(packageJsonPath)) {
        issues.push(`${context} cannot find packages/mcp/package.json.`);
      } else {
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, "utf8"),
        );
        if (!isRecord(packageJson.scripts)) {
          issues.push(`${context} cannot read @dnd/mcp scripts.`);
        } else if (
          !isNonEmptyString(packageJson.scripts[manifest.check.script])
        ) {
          issues.push(
            `${context} check script ${manifest.check.script} is not defined in packages/mcp/package.json.`,
          );
        }
      }
    }
  }
  if (!Array.isArray(manifest.requiredFlows)) {
    issues.push(`${context} requiredFlows must be an array.`);
  } else if (manifest.requiredFlows.length === 0) {
    issues.push(`${context} requiredFlows must not be empty.`);
  } else {
    const seenFlowIds = new Set();
    for (const [index, flow] of manifest.requiredFlows.entries()) {
      const flowContext = `${context} requiredFlows[${index}]`;
      if (!isRecord(flow)) {
        issues.push(`${flowContext} must be an object.`);
        continue;
      }
      issues.push(
        ...unexpectedFieldIssues(flow, mcpRequiredFlowFields, flowContext),
      );
      if (!isNonEmptyString(flow.flowId)) {
        issues.push(`${flowContext}.flowId must be a non-empty string.`);
      } else if (seenFlowIds.has(flow.flowId)) {
        issues.push(`${context} has duplicate required flow ${flow.flowId}.`);
      }
      seenFlowIds.add(flow.flowId);
      if (!Array.isArray(flow.scopeIds) || flow.scopeIds.length === 0) {
        issues.push(`${flowContext}.scopeIds must be a non-empty array.`);
      } else {
        for (const scopeId of flow.scopeIds) {
          if (scopeId !== "level-1" && scopeId !== "level-1-2") {
            issues.push(`${flowContext}.scopeIds includes unknown ${scopeId}.`);
          }
        }
      }
      if (!isNonEmptyString(flow.followUpTaskId)) {
        issues.push(
          `${flowContext}.followUpTaskId must be a non-empty string.`,
        );
      }
      if (!isNonEmptyString(flow.description)) {
        issues.push(`${flowContext}.description must be a non-empty string.`);
      }
    }
  }
  if (!Array.isArray(manifest.evidence)) {
    issues.push(`${context} evidence must be an array.`);
  } else {
    const requiredFlowIds = new Set(
      (Array.isArray(manifest.requiredFlows) ? manifest.requiredFlows : [])
        .filter(isRecord)
        .map((flow) => flow.flowId),
    );
    const seenEvidenceRows = new Set();
    for (const [index, row] of manifest.evidence.entries()) {
      const rowContext = `${context} evidence[${index}]`;
      if (!isRecord(row)) {
        issues.push(`${rowContext} must be an object.`);
        continue;
      }
      issues.push(
        ...unexpectedFieldIssues(row, mcpEvidenceRowFields, rowContext),
      );
      for (const field of mcpEvidenceRowFields) {
        if (!isNonEmptyString(row[field])) {
          issues.push(`${rowContext}.${field} must be a non-empty string.`);
        }
      }
      if (isNonEmptyString(row.flowId) && !requiredFlowIds.has(row.flowId)) {
        issues.push(
          `${rowContext}.flowId references unknown flow ${row.flowId}.`,
        );
      }
      const rowKey = `${row.flowId}\u0000${row.scenarioId}\u0000${row.testPath}`;
      if (seenEvidenceRows.has(rowKey)) {
        issues.push(`${context} has duplicate evidence row ${row.scenarioId}.`);
      }
      seenEvidenceRows.add(rowKey);
      for (const field of ["ownerPath", "testPath"]) {
        if (!isNonEmptyString(row[field])) continue;
        const pathIssue = repoRelativePathIssue(
          row[field],
          `${rowContext}.${field}`,
        );
        if (pathIssue !== undefined) {
          issues.push(pathIssue);
          continue;
        }
        if (!fs.existsSync(path.join(root, row[field]))) {
          issues.push(
            `${rowContext}.${field} references missing ${row[field]}.`,
          );
        }
      }
    }
  }
  return issues;
}

function scopedObligationIds(levelReport) {
  return uniqueSorted(
    (levelReport.rulesKernelSupportedUnitJoin?.units ?? []).flatMap((unit) =>
      unit.profiles.flatMap((profile) =>
        profile.obligations.map((obligation) => obligation.obligationId),
      ),
    ),
  );
}

function buildKernelIndexes(rulesKernelMatrix) {
  const obligationsById = new Map(
    (rulesKernelMatrix.obligations ?? []).map((obligation) => [
      obligation.id,
      obligation,
    ]),
  );
  const readinessByObligationId = new Map(
    (rulesKernelMatrix.generatorReadiness ?? []).map((readiness) => [
      readiness.obligationId,
      readiness,
    ]),
  );
  const semanticCoreOwnerPathsByObligationId = new Map();
  for (const ownerRole of rulesKernelMatrix.qntOwnerRoles ?? []) {
    if (ownerRole.role !== "semantic-core") continue;
    for (const obligationId of ownerRole.obligationIds ?? []) {
      const current =
        semanticCoreOwnerPathsByObligationId.get(obligationId) ?? [];
      current.push(ownerRole.ownerPath);
      semanticCoreOwnerPathsByObligationId.set(obligationId, current);
    }
  }
  const runBlockFindingsByObligationId = new Map(
    (rulesKernelMatrix.semanticCoreRunBlockFindings ?? []).map((finding) => [
      finding.obligationId,
      finding,
    ]),
  );
  return {
    obligationsById,
    readinessByObligationId,
    runBlockFindingsByObligationId,
    semanticCoreOwnerPathsByObligationId,
  };
}

function buildSupportCompletenessLayer(levelReport) {
  const blockers = [
    {
      count: levelReport.claimGate.strictTargetOpenCount,
      kind: "strict-target-open",
    },
    {
      count: levelReport.claimGate.selectedIdentityBlockerCount,
      kind: "selected-identity-blocker",
    },
    {
      count: levelReport.claimGate.authoredReadinessBlockerCount,
      kind: "srd-authored-readiness-blocker",
    },
  ].filter((blocker) => blocker.count > 0);
  return stable({
    id: layerId.supportCompleteness,
    status: levelReport.claimGate.status,
    blockingCount: blockers.reduce(
      (total, blocker) => total + blocker.count,
      0,
    ),
    blockers,
    evidence: {
      claimGate: levelReport.claimGate,
      strictTargetClosure: levelReport.metrics.strictTargetClosure,
      selectedIdentityReadiness: levelReport.selectedIdentityReadiness.metrics,
      srdAuthoredProductReadiness:
        levelReport.srdAuthoredProductReadiness.metrics,
    },
  });
}

function buildQntGeneratorReadinessLayer({ kernelIndexes, obligationIds }) {
  const missingOrOpenObligations = obligationIds
    .map((obligationId) => ({
      obligationId,
      obligation: kernelIndexes.obligationsById.get(obligationId),
    }))
    .filter(
      ({ obligation }) =>
        obligation === undefined || obligation.status !== "covered",
    )
    .map(({ obligationId, obligation }) => ({
      obligationId,
      status: obligation?.status ?? "missing",
    }));
  const semanticCoreRows = obligationIds
    .map((obligationId) => ({
      obligationId,
      ownerPaths:
        kernelIndexes.semanticCoreOwnerPathsByObligationId.get(obligationId) ??
        [],
      readiness: kernelIndexes.readinessByObligationId.get(obligationId),
      runBlockFinding:
        kernelIndexes.runBlockFindingsByObligationId.get(obligationId),
    }))
    .filter((row) => row.ownerPaths.length > 0);
  const generatorBlockingRows = semanticCoreRows
    .filter(
      (row) =>
        row.readiness?.status !== "generation-subset-clean" ||
        row.runBlockFinding !== undefined,
    )
    .map((row) => ({
      blockedBy: row.readiness?.blockedBy ?? [],
      obligationId: row.obligationId,
      ownerPaths: row.ownerPaths,
      readinessStatus: row.readiness?.status ?? "missing",
      runBlockOwners: (row.runBlockFinding?.owners ?? []).map(
        (owner) => owner.ownerPath,
      ),
    }));
  const blockingCount =
    missingOrOpenObligations.length + generatorBlockingRows.length;
  return stable({
    id: layerId.qntGeneratorReadiness,
    status: statusFor(blockingCount),
    blockingCount,
    evidence: {
      qntCoveredObligations: countCoverage(
        obligationIds.length - missingOrOpenObligations.length,
        obligationIds.length,
      ),
      generatorReadySemanticCoreObligations: countCoverage(
        semanticCoreRows.length - generatorBlockingRows.length,
        semanticCoreRows.length,
      ),
    },
    generatorBlockingRows,
    missingOrOpenObligations,
  });
}

function buildMbtParityEvidenceLayer({ kernelIndexes, obligationIds }) {
  const witnessRows = obligationIds.map((obligationId) => {
    const obligation = kernelIndexes.obligationsById.get(obligationId);
    return {
      obligationId,
      witnessKinds: (obligation?.parityWitnesses ?? []).map(
        (witness) => witness.kind,
      ),
    };
  });
  const missingWitnessRows = witnessRows.filter(
    (row) => row.witnessKinds.length === 0,
  );
  const witnessKinds = Object.fromEntries(
    Array.from(
      witnessRows
        .flatMap((row) => row.witnessKinds)
        .reduce((counts, kind) => {
          counts.set(kind, (counts.get(kind) ?? 0) + 1);
          return counts;
        }, new Map()),
    ).sort(([left], [right]) => left.localeCompare(right)),
  );
  return stable({
    id: layerId.mbtParityEvidence,
    status: statusFor(missingWitnessRows.length),
    blockingCount: missingWitnessRows.length,
    evidence: {
      parityWitnessedObligations: countCoverage(
        obligationIds.length - missingWitnessRows.length,
        obligationIds.length,
      ),
      witnessKinds,
    },
    missingWitnessRows,
  });
}

function buildMcpScenarioEvidenceLayer(scopeId, mcpScenarioEvidence) {
  const requiredFlows = (mcpScenarioEvidence.requiredFlows ?? []).filter(
    (flow) => flow.scopeIds.includes(scopeId),
  );
  const evidenceRows = mcpScenarioEvidence.evidence ?? [];
  const evidenceRowsByFlowId = evidenceRows.reduce((groups, row) => {
    const current = groups.get(row.flowId) ?? [];
    current.push(row);
    groups.set(row.flowId, current);
    return groups;
  }, new Map());
  const coveredFlowIds = new Set(evidenceRows.map((row) => row.flowId));
  const missingEvidenceRows = requiredFlows
    .filter((flow) => !coveredFlowIds.has(flow.flowId))
    .map((flow) => ({
      description: flow.description,
      flowId: flow.flowId,
      followUpTaskId: flow.followUpTaskId,
    }));
  return stable({
    id: layerId.mcpScenarioEvidence,
    status: statusFor(missingEvidenceRows.length),
    blockingCount: missingEvidenceRows.length,
    evidence: {
      check: {
        command: `pnpm --filter ${mcpScenarioEvidence.check.packageName} ${mcpScenarioEvidence.check.script}`,
        packageName: mcpScenarioEvidence.check.packageName,
        script: mcpScenarioEvidence.check.script,
      },
      scenarioEvidenceFlows: countCoverage(
        requiredFlows.length - missingEvidenceRows.length,
        requiredFlows.length,
      ),
      source: mcpScenarioEvidenceSourcePath,
    },
    evidenceRows: requiredFlows.flatMap((flow) =>
      (evidenceRowsByFlowId.get(flow.flowId) ?? []).map((row) => ({
        flowId: flow.flowId,
        scenarioId: row.scenarioId,
        taskId: row.taskId,
        testPath: row.testPath,
      })),
    ),
    missingEvidenceRows,
    requiredFlows: requiredFlows.map((flow) => ({
      description: flow.description,
      flowId: flow.flowId,
      followUpTaskId: flow.followUpTaskId,
    })),
  });
}

function buildScopeGate({
  levelReport,
  mcpScenarioEvidence,
  rulesKernelMatrix,
  scopeId,
}) {
  const obligationIds = scopedObligationIds(levelReport);
  const kernelIndexes = buildKernelIndexes(rulesKernelMatrix);
  const layers = [
    buildSupportCompletenessLayer(levelReport),
    buildQntGeneratorReadinessLayer({ kernelIndexes, obligationIds }),
    buildMbtParityEvidenceLayer({ kernelIndexes, obligationIds }),
    buildMcpScenarioEvidenceLayer(scopeId, mcpScenarioEvidence),
  ];
  const blockedLayers = layers.filter((layer) => layer.status !== passStatus);
  return stable({
    scopeId,
    title: levelReport.scope.title,
    status: blockedLayers.length === 0 ? passStatus : blockedStatus,
    layerResult: {
      completeLayers: layers.length - blockedLayers.length,
      totalLayers: layers.length,
    },
    scopedObligationIds: obligationIds,
    layers,
  });
}

function buildUltraGoldenGate({
  level1FullSupport,
  level12FullSupport,
  mcpScenarioEvidence,
  rulesKernelMatrix,
}) {
  const scopes = [
    buildScopeGate({
      levelReport: level1FullSupport,
      mcpScenarioEvidence,
      rulesKernelMatrix,
      scopeId: "level-1",
    }),
    buildScopeGate({
      levelReport: level12FullSupport,
      mcpScenarioEvidence,
      rulesKernelMatrix,
      scopeId: "level-1-2",
    }),
  ];
  const blockedScopes = scopes.filter((scope) => scope.status !== passStatus);
  return stable({
    generatedBy: "scripts/unit-profile-coverage-check.cjs",
    sourceArtifacts: {
      level1FullSupport: "plans/unit-profile-coverage/level1-full-support.json",
      level12FullSupport:
        "plans/unit-profile-coverage/level1-2-full-support.json",
      mcpScenarioEvidence: mcpScenarioEvidenceSourcePath,
      rulesKernelMatrix: "plans/rules-kernel-coverage/matrix.json",
    },
    definition: {
      aggregateRule:
        "Ultra-golden passes only when every required layer passes for every scoped level report. The checker deliberately does not publish a blended ultra-golden percentage.",
      layers: layerDefinitions,
    },
    status: blockedScopes.length === 0 ? passStatus : blockedStatus,
    blockedScopeIds: blockedScopes.map((scope) => scope.scopeId),
    scopes,
  });
}

function md(value) {
  return String(value ?? "")
    .replace(/\n/g, " ")
    .replace(/\|/g, "\\|");
}

function renderLayerRow(scope, layer) {
  const blocking =
    layer.blockingCount === 0 ? "_none_" : `${layer.blockingCount} blocker(s)`;
  return `| ${scope.scopeId} | ${layer.id} | ${layer.status} | ${blocking} |`;
}

function renderDefinitionRows() {
  return layerDefinitions.map(
    (definition) =>
      `| ${definition.id} | ${definition.label} | ${md(definition.criterion)} |`,
  );
}

function renderScopeSummaryRow(scope) {
  return `| ${scope.scopeId} | ${scope.status} | ${scope.layerResult.completeLayers}/${scope.layerResult.totalLayers} | ${scope.scopedObligationIds.length} |`;
}

function renderMcpScenarioEvidenceRows(scope) {
  const mcpLayer = scope.layers.find(
    (layer) => layer.id === layerId.mcpScenarioEvidence,
  );
  return (mcpLayer?.requiredFlows ?? []).map((flow) => {
    const evidenceRows = (mcpLayer.evidenceRows ?? []).filter(
      (row) => row.flowId === flow.flowId,
    );
    const scenarioIds =
      evidenceRows.length === 0
        ? "_missing_"
        : evidenceRows.map((row) => `\`${row.scenarioId}\``).join(", ");
    const followUp =
      evidenceRows.length === 0 ? `\`${flow.followUpTaskId}\`` : "_none_";
    const status = evidenceRows.length === 0 ? blockedStatus : passStatus;
    return `| ${scope.scopeId} | ${flow.flowId} | ${status} | ${scenarioIds} | ${followUp} |`;
  });
}

function renderUltraGoldenGate(gate) {
  return `${[
    "# Ultra-Golden Aggregate Gate",
    "",
    "Generated by `scripts/unit-profile-coverage-check.cjs`.",
    "",
    `Ultra-golden gate: **${gate.status}**.`,
    "",
    "The aggregate rule is conjunctive: every scope must pass every layer. The checker deliberately does not publish a blended ultra-golden percentage, because a 100% value in one layer does not complete another layer.",
    "",
    "## Layer Definition",
    "",
    "| Layer | Label | Criterion |",
    "| --- | --- | --- |",
    ...renderDefinitionRows(),
    "",
    "## Scope Summary",
    "",
    "| Scope | Status | Complete layers | Scoped obligations |",
    "| --- | --- | ---: | ---: |",
    ...gate.scopes.map(renderScopeSummaryRow),
    "",
    "## Layer Results",
    "",
    "| Scope | Layer | Status | Blocking issue |",
    "| --- | --- | --- | --- |",
    ...gate.scopes.flatMap((scope) =>
      scope.layers.map((layer) => renderLayerRow(scope, layer)),
    ),
    "",
    "## MCP Scenario Evidence",
    "",
    "MCP scenario evidence is an explicit required layer. Its manifest records required user-facing flows separately from support-profile claims, and the package-local command checks that admitted evidence stays tied to executable MCP scenario tests.",
    "",
    "| Scope | Flow | Status | Scenario evidence | Follow-up task |",
    "| --- | --- | --- | --- | --- |",
    ...gate.scopes.flatMap(renderMcpScenarioEvidenceRows),
    "",
  ].join("\n")}`;
}

module.exports = {
  buildUltraGoldenGate,
  renderUltraGoldenGate,
  validateMcpScenarioEvidence,
};
