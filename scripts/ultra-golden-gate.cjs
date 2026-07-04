const fs = require("node:fs");
const path = require("node:path");
const {
  mcpScenarioWitnessKind,
  ultraGoldenWitnessKinds,
  witnessKindDescriptions,
} = require("./unit-profile-coverage-config.cjs");

const passStatus = "pass";
const blockedStatus = "blocked";
const mcpScenarioEvidenceSchema = "dnd.mcp-scenario-evidence.v1";
const mcpScenarioEvidenceSourcePath =
  "plans/unit-profile-coverage/mcp-scenario-evidence.json";
const ultraGoldenScopeFields = Object.freeze([
  { scopeId: "level-1", reportField: "level1FullSupport" },
  { scopeId: "level-1-2", reportField: "level12FullSupport" },
  { scopeId: "level-1-3", reportField: "level13FullSupport" },
  { scopeId: "level-1-4", reportField: "level14FullSupport" },
  { scopeId: "level-1-5", reportField: "level15FullSupport" },
  { scopeId: "level-1-6", reportField: "level16FullSupport" },
]);
const ultraGoldenScopeIds = Object.freeze(
  ultraGoldenScopeFields.map((scope) => scope.scopeId),
);
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
      "The strict level-support claim has no open strict rows, selected-identity blockers, or SRD-authored product-readiness blockers; diagnostic product-readiness rows do not block unless promoted into that blocker set.",
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
      "Every scoped user-facing MCP flow has checker-owned scenario evidence backed by the MCP scenario evidence command.",
  },
];

const selectedIdentityAuditClaimTags = new Set([
  "profile-subset-supported",
  "supported-profile",
]);
const mcpFlowByProfileKind = new Map([
  ["action", "battle"],
  ["bonus-action", "battle"],
  ["character-creation", "character-creation"],
  ["character-sheet", "character-sheet"],
  ["passive", "battle"],
  ["persistent-effect", "battle"],
  ["reaction", "battle"],
  ["resource", "battle"],
  ["spell-invocation", "battle"],
  ["stat-block-control", "battle"],
  ["summoned-companion", "battle"],
  ["table-caller", "battle"],
]);

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
  "scopeAuditDecisions",
]);
const mcpScenarioEvidenceCheckFields = new Set(["packageName", "script"]);
const mcpRequiredFlowFields = new Set([
  "flowId",
  "scopeIds",
  "followUpTaskIdsByScope",
  "description",
]);
const mcpEvidenceRowFields = new Set([
  "kind",
  "flowId",
  "scopeIds",
  "scenarioId",
  "ownerPath",
  "testPath",
  "taskId",
  "summary",
]);
const mcpScopeAuditDecisionFields = new Set([
  "scopeId",
  "auditTaskId",
  "result",
  "reason",
  "reusedFlowIds",
  "requiredEvidence",
]);
const mcpRequiredEvidenceFields = new Set([
  "scenarioGoal",
  "inputs",
]);
const mcpAuditDecisionResults = new Set([
  "new-scenario-required",
  "reuse-existing-evidence",
]);

function validateNonEmptyStringArray(value, context) {
  if (!Array.isArray(value) || value.length === 0) {
    return [`${context} must be a non-empty array.`];
  }
  return value.flatMap((entry, index) =>
    isNonEmptyString(entry)
      ? []
      : [`${context}[${index}] must be a non-empty string.`],
  );
}

function validateStringArray(value, context) {
  if (!Array.isArray(value)) {
    return [`${context} must be an array.`];
  }
  return value.flatMap((entry, index) =>
    isNonEmptyString(entry)
      ? []
      : [`${context}[${index}] must be a non-empty string.`],
  );
}

function mcpMissingFlowIdsByScope(manifest) {
  const evidenceRows = Array.isArray(manifest.evidence)
    ? manifest.evidence.filter(isRecord)
    : [];
  const flowIdsByCoveredScope = new Map();
  for (const row of evidenceRows) {
    if (!isNonEmptyString(row.flowId) || !Array.isArray(row.scopeIds)) {
      continue;
    }
    for (const scopeId of row.scopeIds) {
      const coveredForScope = flowIdsByCoveredScope.get(scopeId) ?? new Set();
      coveredForScope.add(row.flowId);
      flowIdsByCoveredScope.set(scopeId, coveredForScope);
    }
  }

  const missingByScope = new Map();
  const requiredFlows = Array.isArray(manifest.requiredFlows)
    ? manifest.requiredFlows.filter(isRecord)
    : [];
  for (const flow of requiredFlows) {
    if (!isNonEmptyString(flow.flowId) || !Array.isArray(flow.scopeIds)) {
      continue;
    }
    for (const scopeId of flow.scopeIds) {
      const coveredFlowIds = flowIdsByCoveredScope.get(scopeId) ?? new Set();
      if (coveredFlowIds.has(flow.flowId)) continue;
      const missingForScope = missingByScope.get(scopeId) ?? [];
      missingForScope.push(flow.flowId);
      missingByScope.set(scopeId, missingForScope);
    }
  }
  return new Map(
    Array.from(missingByScope, ([scopeId, flowIds]) => [
      scopeId,
      uniqueSorted(flowIds),
    ]),
  );
}

function validateMcpScopeAuditDecisions(manifest, context) {
  const issues = [];
  const requiredFlowIdsByScope = new Map();
  for (const flow of Array.isArray(manifest.requiredFlows)
    ? manifest.requiredFlows.filter(isRecord)
    : []) {
    if (!isNonEmptyString(flow.flowId) || !Array.isArray(flow.scopeIds)) {
      continue;
    }
    for (const scopeId of flow.scopeIds) {
      const requiredForScope = requiredFlowIdsByScope.get(scopeId) ?? [];
      requiredForScope.push(flow.flowId);
      requiredFlowIdsByScope.set(scopeId, requiredForScope);
    }
  }
  const missingByScope = mcpMissingFlowIdsByScope(manifest);
  const decisions = manifest.scopeAuditDecisions;
  if (!Array.isArray(decisions)) {
    if (missingByScope.size > 0) {
      issues.push(
        `${context} scopeAuditDecisions must be an array when scoped MCP evidence is missing.`,
      );
    }
    return issues;
  }

  const decisionsByScope = new Map();
  for (const [index, decision] of decisions.entries()) {
    const decisionContext = `${context} scopeAuditDecisions[${index}]`;
    if (!isRecord(decision)) {
      issues.push(`${decisionContext} must be an object.`);
      continue;
    }
    issues.push(
      ...unexpectedFieldIssues(
        decision,
        mcpScopeAuditDecisionFields,
        decisionContext,
      ),
    );
    for (const field of ["scopeId", "auditTaskId", "result", "reason"]) {
      if (!isNonEmptyString(decision[field])) {
        issues.push(`${decisionContext}.${field} must be a non-empty string.`);
      }
    }
    if (
      isNonEmptyString(decision.result) &&
      !mcpAuditDecisionResults.has(decision.result)
    ) {
      issues.push(
        `${decisionContext}.result must be one of ${Array.from(
          mcpAuditDecisionResults,
        ).join(", ")}.`,
      );
    }
    if (
      isNonEmptyString(decision.scopeId) &&
      !ultraGoldenScopeIds.includes(decision.scopeId)
    ) {
      issues.push(
        `${decisionContext}.scopeId references unknown scope ${decision.scopeId}.`,
      );
    } else if (isNonEmptyString(decision.scopeId)) {
      if (decisionsByScope.has(decision.scopeId)) {
        issues.push(
          `${context} has duplicate scope audit decision for ${decision.scopeId}.`,
        );
      }
      decisionsByScope.set(decision.scopeId, decision);
    }

    const requiredFlowIds = new Set(
      requiredFlowIdsByScope.get(decision.scopeId) ?? [],
    );
    issues.push(
      ...validateStringArray(
        decision.reusedFlowIds,
        `${decisionContext}.reusedFlowIds`,
      ),
    );
    if (Array.isArray(decision.reusedFlowIds)) {
      const seen = new Set();
      const missingFlowIdsForScope = new Set(
        missingByScope.get(decision.scopeId) ?? [],
      );
      for (const flowId of decision.reusedFlowIds) {
        if (seen.has(flowId)) {
          issues.push(
            `${decisionContext}.reusedFlowIds must not repeat ${flowId}.`,
          );
        }
        seen.add(flowId);
        if (isNonEmptyString(flowId) && !requiredFlowIds.has(flowId)) {
          issues.push(
            `${decisionContext}.reusedFlowIds references flow ${flowId}, which is not required by ${decision.scopeId}.`,
          );
        }
        if (isNonEmptyString(flowId) && missingFlowIdsForScope.has(flowId)) {
          issues.push(
            `${decisionContext}.reusedFlowIds must not include missing flow ${flowId}.`,
          );
        }
      }
    }
    if (
      decision.result === "new-scenario-required" &&
      (missingByScope.get(decision.scopeId) ?? []).length === 0
    ) {
      issues.push(
        `${decisionContext}.result must not require a new scenario when the scope has no missing MCP flows.`,
      );
    }
    if (
      decision.result === "reuse-existing-evidence" &&
      Array.isArray(decision.reusedFlowIds) &&
      decision.reusedFlowIds.length === 0
    ) {
      issues.push(
        `${decisionContext}.reusedFlowIds must be non-empty for a reuse-existing-evidence decision.`,
      );
    }
    if (
      decision.result === "reuse-existing-evidence" &&
      (missingByScope.get(decision.scopeId) ?? []).length !== 0
    ) {
      issues.push(
        `${decisionContext}.result must require a new scenario while the scope has missing MCP flows.`,
      );
    }

    if (decision.result === "new-scenario-required") {
      if (!isRecord(decision.requiredEvidence)) {
        issues.push(`${decisionContext}.requiredEvidence must be an object.`);
      } else {
        issues.push(
          ...unexpectedFieldIssues(
            decision.requiredEvidence,
            mcpRequiredEvidenceFields,
            `${decisionContext}.requiredEvidence`,
          ),
        );
        if (!isNonEmptyString(decision.requiredEvidence.scenarioGoal)) {
          issues.push(
            `${decisionContext}.requiredEvidence.scenarioGoal must be a non-empty string.`,
          );
        }
        issues.push(
          ...validateNonEmptyStringArray(
            decision.requiredEvidence.inputs,
            `${decisionContext}.requiredEvidence.inputs`,
          ),
        );
      }
    } else if (decision.requiredEvidence !== undefined) {
      issues.push(
        `${decisionContext}.requiredEvidence is only allowed for new-scenario-required decisions.`,
      );
    }
  }

  for (const [scopeId, missingFlowIds] of missingByScope) {
    const decision = decisionsByScope.get(scopeId);
    if (decision === undefined) {
      issues.push(
        `${context} must include a scope audit decision for ${scopeId} missing flows ${missingFlowIds.join(", ")}.`,
      );
      continue;
    }
    if (decision.result !== "new-scenario-required") {
      issues.push(
        `${context} scope audit decision for ${scopeId} must require a new scenario while evidence is missing.`,
      );
    }
  }
  return issues;
}

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
          if (!ultraGoldenScopeIds.includes(scopeId)) {
            issues.push(`${flowContext}.scopeIds includes unknown ${scopeId}.`);
          }
        }
      }
      if (!isNonEmptyString(flow.description)) {
        issues.push(`${flowContext}.description must be a non-empty string.`);
      }
      if (!isRecord(flow.followUpTaskIdsByScope)) {
        issues.push(`${flowContext}.followUpTaskIdsByScope must be an object.`);
      } else if (Array.isArray(flow.scopeIds)) {
        const requiredScopeIds = new Set(flow.scopeIds);
        for (const scopeId of flow.scopeIds) {
          if (!isNonEmptyString(flow.followUpTaskIdsByScope[scopeId])) {
            issues.push(
              `${flowContext}.followUpTaskIdsByScope.${scopeId} must be a non-empty string.`,
            );
          }
        }
        for (const scopeId of Object.keys(flow.followUpTaskIdsByScope)) {
          if (!requiredScopeIds.has(scopeId)) {
            issues.push(
              `${flowContext}.followUpTaskIdsByScope includes non-required scope ${scopeId}.`,
            );
          }
        }
      }
    }
  }
  if (!Array.isArray(manifest.evidence)) {
    issues.push(`${context} evidence must be an array.`);
  } else {
    const requiredFlowsById = new Map(
      (Array.isArray(manifest.requiredFlows) ? manifest.requiredFlows : [])
        .filter(isRecord)
        .map((flow) => [flow.flowId, flow]),
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
      if (row.kind !== mcpScenarioWitnessKind) {
        issues.push(`${rowContext}.kind must be ${mcpScenarioWitnessKind}.`);
      }
      for (const field of [
        "kind",
        "flowId",
        "scenarioId",
        "ownerPath",
        "testPath",
        "taskId",
        "summary",
      ]) {
        if (!isNonEmptyString(row[field])) {
          issues.push(`${rowContext}.${field} must be a non-empty string.`);
        }
      }
      const requiredFlow = requiredFlowsById.get(row.flowId);
      if (isNonEmptyString(row.flowId) && requiredFlow === undefined) {
        issues.push(
          `${rowContext}.flowId references unknown flow ${row.flowId}.`,
        );
      }
      if (!Array.isArray(row.scopeIds) || row.scopeIds.length === 0) {
        issues.push(`${rowContext}.scopeIds must be a non-empty array.`);
      } else {
        const requiredScopeIds = new Set(requiredFlow?.scopeIds ?? []);
        for (const scopeId of row.scopeIds) {
          if (!ultraGoldenScopeIds.includes(scopeId)) {
            issues.push(`${rowContext}.scopeIds includes unknown ${scopeId}.`);
          } else if (!requiredScopeIds.has(scopeId)) {
            issues.push(
              `${rowContext}.scopeIds includes ${scopeId}, which is not required by flow ${row.flowId}.`,
            );
          }
        }
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
  issues.push(...validateMcpScopeAuditDecisions(manifest, context));
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
  const evidenceRows = (mcpScenarioEvidence.evidence ?? []).filter((row) =>
    row.scopeIds.includes(scopeId),
  );
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
      followUpTaskId: flow.followUpTaskIdsByScope[scopeId],
    }));
  return stable({
    auditDecision: (mcpScenarioEvidence.scopeAuditDecisions ?? []).find(
      (decision) => decision.scopeId === scopeId,
    ),
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
      witnessKind: mcpScenarioWitnessKind,
    },
    evidenceRows: requiredFlows.flatMap((flow) =>
      (evidenceRowsByFlowId.get(flow.flowId) ?? []).map((row) => ({
        flowId: flow.flowId,
        kind: row.kind,
        scenarioId: row.scenarioId,
        taskId: row.taskId,
        testPath: row.testPath,
      })),
    ),
    missingEvidenceRows,
    requiredFlows: requiredFlows.map((flow) => ({
      description: flow.description,
      flowId: flow.flowId,
      followUpTaskId: flow.followUpTaskIdsByScope[scopeId],
    })),
  });
}

function supportedUnitIds(levelReport) {
  return new Set(
    (levelReport.groups ?? [])
      .filter((group) => selectedIdentityAuditClaimTags.has(group.status))
      .flatMap((group) => group.unitIds),
  );
}

function indexUnits(unitMatrix) {
  return new Map((unitMatrix.units ?? []).map((unit) => [unit.unitId, unit]));
}

function requireAuditUnit(unitsById, unitId) {
  const unit = unitsById.get(unitId);
  if (unit === undefined) {
    throw new Error(
      `Selected identity audit expected Unit matrix row for scoped supported Unit ${unitId}.`,
    );
  }
  return unit;
}

function requireAuditProfileIds(unit) {
  if (!selectedIdentityAuditClaimTags.has(unit.claim?.tag)) {
    throw new Error(
      `Selected identity audit expected supported profile claim for scoped Unit ${unit.unitId}.`,
    );
  }
  return unit.claim.profileIds;
}

function profileScopedQntMbtJoinRows(unit) {
  return (unit.profiles ?? []).flatMap((profile) => {
    if (profile.profileKind !== "battle-admission") return [];
    const qntOwners = profile.qntOwners ?? [];
    const parityWitnesses = (profile.verificationOwners ?? [])
      .filter((owner) => owner.kind === "focused-mbt")
      .map((owner) => ({
        kind: owner.kind,
        ownerPath: owner.ownerPath,
      }));
    if (qntOwners.length === 0 || parityWitnesses.length === 0) return [];
    return [
      {
        obligationId: "UNIT_PROFILE.BATTLE_ADMISSION_QNT_MBT",
        parityWitnesses,
        profileId: profile.id,
        runtime: "battle",
      },
    ];
  });
}

function qntMbtJoinRowsByUnitId(levelReport, kernelIndexes, unitMatrix) {
  const rowsByUnitId = new Map();
  for (const unit of levelReport.rulesKernelSupportedUnitJoin?.units ?? []) {
    const current = rowsByUnitId.get(unit.unitId) ?? [];
    for (const profile of unit.profiles) {
      for (const obligationRef of profile.obligations) {
        const obligation = kernelIndexes.obligationsById.get(
          obligationRef.obligationId,
        );
        current.push({
          obligationId: obligationRef.obligationId,
          parityWitnesses: obligation?.parityWitnesses ?? [],
          profileId: profile.profileId,
          runtime: obligation?.runtime ?? obligationRef.runtime,
        });
      }
    }
    if (current.length > 0) rowsByUnitId.set(unit.unitId, current);
  }
  for (const unit of unitMatrix.units ?? []) {
    const current = rowsByUnitId.get(unit.unitId) ?? [];
    const profileScopedRows = profileScopedQntMbtJoinRows(unit);
    if (profileScopedRows.length > 0) {
      rowsByUnitId.set(unit.unitId, [...current, ...profileScopedRows]);
    }
  }
  return rowsByUnitId;
}

function mcpFlowIdsForUnit(unit, qntMbtRows) {
  const fromQntRows = qntMbtRows
    .map((row) => {
      if (row.runtime === "battle") return "battle";
      if (row.runtime === "character-creation") return "character-creation";
      if (row.runtime === "character-sheet") return "character-sheet";
      return undefined;
    })
    .filter((flowId) => flowId !== undefined);
  const fromProfiles = (unit.profiles ?? [])
    .map((profile) => mcpFlowByProfileKind.get(profile.profileKind))
    .filter((flowId) => flowId !== undefined);
  return uniqueSorted([...fromQntRows, ...fromProfiles]);
}

function buildSelectedIdentityAuditRow({
  coveredMcpFlowIds,
  evidence,
  qntMbtRows,
  unit,
}) {
  const joinedQntMbtRows = qntMbtRows.filter((row) =>
    row.parityWitnesses.some(
      (witness) => witness.ownerPath === evidence.ownerPath,
    ),
  );
  const qntMbtWitnessOwners = uniqueSorted(
    qntMbtRows.flatMap((row) =>
      row.parityWitnesses.map((witness) => witness.ownerPath),
    ),
  );
  const requiredMcpFlowIds = mcpFlowIdsForUnit(unit, qntMbtRows);
  const coveredRequiredMcpFlowIds = requiredMcpFlowIds.filter((flowId) =>
    coveredMcpFlowIds.has(flowId),
  );
  const missingMcpFlowIds = requiredMcpFlowIds.filter(
    (flowId) => !coveredMcpFlowIds.has(flowId),
  );
  const hasQntMbtJoin = joinedQntMbtRows.length > 0;
  const hasMcpScenarioJoin = coveredRequiredMcpFlowIds.length > 0;
  const qntMbtJoinStatus = hasQntMbtJoin
    ? "selected-evidence-owner-joined"
    : qntMbtRows.length > 0
      ? "unit-profile-joined-with-different-owner"
      : "missing-unit-profile-join";
  const mcpScenarioJoinStatus = hasMcpScenarioJoin
    ? "flow-evidence-present"
    : requiredMcpFlowIds.length > 0
      ? "missing-flow-evidence"
      : "not-applicable";
  return stable({
    unitId: unit.unitId,
    kind: unit.kind,
    collectionId: unit.collectionId,
    sourceRecordPath: unit.sourceRecordPath,
    profileIds: requireAuditProfileIds(unit),
    evidence: {
      tag: evidence.tag,
      taskId: evidence.taskId,
      ownerPath: evidence.ownerPath,
    },
    qntMbtJoin: {
      status: qntMbtJoinStatus,
      joinedRows: joinedQntMbtRows.map((row) => ({
        obligationId: row.obligationId,
        profileId: row.profileId,
        witnessKinds: uniqueSorted(
          row.parityWitnesses
            .filter((witness) => witness.ownerPath === evidence.ownerPath)
            .map((witness) => witness.kind),
        ),
      })),
      unitProfileJoinRowCount: qntMbtRows.length,
      unitProfileWitnessOwners: qntMbtWitnessOwners,
    },
    mcpScenarioJoin: {
      status: mcpScenarioJoinStatus,
      coveredFlowIds: coveredRequiredMcpFlowIds,
      missingFlowIds: missingMcpFlowIds,
      requiredFlowIds: requiredMcpFlowIds,
    },
  });
}

function buildSelectedIdentityEvidenceAuditScope({
  kernelIndexes,
  levelReport,
  mcpScenarioEvidence,
  scopeId,
  selectedIdentityMbtEvidenceTag,
  unitMatrix,
}) {
  const unitsById = indexUnits(unitMatrix);
  const scopedSupportedUnitIds = supportedUnitIds(levelReport);
  const qntMbtRowsByUnitId = qntMbtJoinRowsByUnitId(
    levelReport,
    kernelIndexes,
    unitMatrix,
  );
  const coveredMcpFlowIds = new Set(
    (mcpScenarioEvidence.evidence ?? [])
      .filter((row) => row.scopeIds.includes(scopeId))
      .map((row) => row.flowId),
  );
  const auditedRows = Array.from(scopedSupportedUnitIds)
    .map((unitId) => requireAuditUnit(unitsById, unitId))
    .flatMap((unit) =>
      (unit.evidence ?? [])
        .filter((evidence) => evidence.tag === selectedIdentityMbtEvidenceTag)
        .map((evidence) =>
          buildSelectedIdentityAuditRow({
            coveredMcpFlowIds,
            evidence,
            qntMbtRows: qntMbtRowsByUnitId.get(unit.unitId) ?? [],
            unit,
          }),
        ),
    )
    .sort(
      (left, right) =>
        left.kind.localeCompare(right.kind) ||
        left.unitId.localeCompare(right.unitId) ||
        left.evidence.ownerPath.localeCompare(right.evidence.ownerPath),
    );
  const missingJoinRows = auditedRows.filter(
    (row) =>
      row.qntMbtJoin.status !== "selected-evidence-owner-joined" &&
      row.mcpScenarioJoin.status !== "flow-evidence-present",
  );
  return stable({
    scopeId,
    metrics: {
      auditedEvidenceRows: countCoverage(
        auditedRows.length,
        auditedRows.length,
      ),
      joinedEvidenceRows: countCoverage(
        auditedRows.length - missingJoinRows.length,
        auditedRows.length,
      ),
      missingJoinRows: countCoverage(
        missingJoinRows.length,
        auditedRows.length,
      ),
    },
    rowCount: missingJoinRows.length,
    rows: missingJoinRows,
  });
}

function buildSelectedIdentityEvidenceAudit({
  level1FullSupport,
  level12FullSupport,
  level13FullSupport,
  level14FullSupport,
  level15FullSupport,
  level16FullSupport,
  mcpScenarioEvidence,
  rulesKernelMatrix,
  selectedIdentityMbtEvidenceTag,
  unitMatrix,
}) {
  const kernelIndexes = buildKernelIndexes(rulesKernelMatrix);
  const levelReports = {
    level1FullSupport,
    level12FullSupport,
    level13FullSupport,
    level14FullSupport,
    level15FullSupport,
    level16FullSupport,
  };
  return stable({
    criteria: {
      evidenceTag: selectedIdentityMbtEvidenceTag,
      qntMbtJoin:
        "A selected-identity evidence row is joined to QNT/MBT when its ownerPath is also a rules-kernel parity witness for a scoped supported Unit profile or a profile-scoped focused MBT verification owner for battle-admission profiles with QNT owners.",
      mcpScenarioJoin:
        "A selected-identity evidence row is joined to MCP when at least one required MCP flow inferred from its scoped supported profile has scenario evidence.",
      rowPolicy:
        "Rows list scoped supported Units whose selected-identity evidence exists but has neither an exact QNT/MBT parity-witness owner join nor an MCP scenario-evidence flow join.",
    },
    scopes: ultraGoldenScopeFields.map(({ reportField, scopeId }) =>
      buildSelectedIdentityEvidenceAuditScope({
        kernelIndexes,
        levelReport: levelReports[reportField],
        mcpScenarioEvidence,
        scopeId,
        selectedIdentityMbtEvidenceTag,
        unitMatrix,
      }),
    ),
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
  level13FullSupport,
  level14FullSupport,
  level15FullSupport,
  level16FullSupport,
  mcpScenarioEvidence,
  rulesKernelMatrix,
  selectedIdentityMbtEvidenceTag,
  unitMatrix,
}) {
  const levelReports = {
    level1FullSupport,
    level12FullSupport,
    level13FullSupport,
    level14FullSupport,
    level15FullSupport,
    level16FullSupport,
  };
  const scopes = ultraGoldenScopeFields.map(({ reportField, scopeId }) =>
    buildScopeGate({
      levelReport: levelReports[reportField],
      mcpScenarioEvidence,
      rulesKernelMatrix,
      scopeId,
    }),
  );
  const blockedScopes = scopes.filter((scope) => scope.status !== passStatus);
  const selectedIdentityEvidenceAudit = buildSelectedIdentityEvidenceAudit({
    level1FullSupport,
    level12FullSupport,
    level13FullSupport,
    level14FullSupport,
    level15FullSupport,
    level16FullSupport,
    mcpScenarioEvidence,
    rulesKernelMatrix,
    selectedIdentityMbtEvidenceTag,
    unitMatrix,
  });
  return stable({
    generatedBy: "scripts/unit-profile-coverage-check.cjs",
    sourceArtifacts: {
      level1FullSupport: "plans/unit-profile-coverage/level1-full-support.json",
      level12FullSupport:
        "plans/unit-profile-coverage/level1-2-full-support.json",
      level13FullSupport:
        "plans/unit-profile-coverage/level1-3-full-support.json",
      level14FullSupport:
        "plans/unit-profile-coverage/level1-4-full-support.json",
      level15FullSupport:
        "plans/unit-profile-coverage/level1-5-full-support.json",
      level16FullSupport:
        "plans/unit-profile-coverage/level1-6-full-support.json",
      mcpScenarioEvidence: mcpScenarioEvidenceSourcePath,
      rulesKernelMatrix: "plans/rules-kernel-coverage/matrix.json",
      unitMatrix: "plans/unit-profile-coverage/unit-matrix.json",
    },
    definition: {
      aggregateRule:
        "Ultra-golden passes only when every required layer passes for every scoped level report. The checker deliberately does not publish a blended ultra-golden percentage.",
      layers: layerDefinitions,
      witnessKinds: Object.fromEntries(
        Array.from(ultraGoldenWitnessKinds)
          .sort()
          .map((kind) => [kind, witnessKindDescriptions[kind]]),
      ),
    },
    status: blockedScopes.length === 0 ? passStatus : blockedStatus,
    blockedScopeIds: blockedScopes.map((scope) => scope.scopeId),
    selectedIdentityEvidenceAudit,
    scopes,
  });
}

function md(value) {
  return String(value ?? "")
    .replace(/\n/g, " ")
    .replace(/\|/g, "\\|");
}

function code(value) {
  return `\`${md(value)}\``;
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

function renderWitnessKindRows(gate) {
  return Object.entries(gate.definition.witnessKinds).map(
    ([kind, description]) => `| ${kind} | ${md(description)} |`,
  );
}

function renderScopeSummaryRow(scope) {
  return `| ${scope.scopeId} | ${scope.status} | ${scope.layerResult.completeLayers}/${scope.layerResult.totalLayers} | ${scope.scopedObligationIds.length} |`;
}

function renderAuditMetricRow(scope) {
  const metrics = scope.metrics;
  return `| ${scope.scopeId} | ${metrics.auditedEvidenceRows.denominator} | ${metrics.joinedEvidenceRows.numerator}/${metrics.joinedEvidenceRows.denominator} | ${metrics.missingJoinRows.numerator} |`;
}

function renderList(values) {
  if (values.length === 0) return "_none_";
  return values.map(code).join(", ");
}

function renderSelectedIdentityAuditRows(scope) {
  return scope.rows.map((row) => {
    const profiles = renderList(row.profileIds);
    const qntOwners = renderList(row.qntMbtJoin.unitProfileWitnessOwners);
    const requiredMcpFlows = renderList(row.mcpScenarioJoin.requiredFlowIds);
    const missingMcpFlows = renderList(row.mcpScenarioJoin.missingFlowIds);
    return `| ${scope.scopeId} | ${code(row.unitId)} | ${md(row.kind)} | ${code(row.evidence.taskId)} | ${code(row.evidence.ownerPath)} | ${md(row.qntMbtJoin.status)} | ${qntOwners} | ${md(row.mcpScenarioJoin.status)} | ${requiredMcpFlows} | ${missingMcpFlows} | ${profiles} |`;
  });
}

function renderMcpScenarioEvidenceRow({ flow, includeScope, mcpLayer, scope }) {
  const evidenceRows = (mcpLayer.evidenceRows ?? []).filter(
    (row) => row.flowId === flow.flowId,
  );
  const scenarioIds =
    evidenceRows.length === 0
      ? "_missing_"
      : evidenceRows.map((row) => `\`${row.scenarioId}\``).join(", ");
  const witnessKinds =
    evidenceRows.length === 0
      ? "_missing_"
      : evidenceRows.map((row) => `\`${row.kind}\``).join(", ");
  const followUp =
    evidenceRows.length === 0 ? `\`${flow.followUpTaskId}\`` : "_none_";
  const status = evidenceRows.length === 0 ? blockedStatus : passStatus;
  const scopeCells = includeScope ? `${scope.scopeId} | ` : "";
  return `| ${scopeCells}${flow.flowId} | ${status} | ${witnessKinds} | ${scenarioIds} | ${followUp} |`;
}

function renderMcpScenarioEvidenceRows(scope, { includeScope = true } = {}) {
  const mcpLayer = scope.layers.find(
    (layer) => layer.id === layerId.mcpScenarioEvidence,
  );
  return (mcpLayer?.requiredFlows ?? []).map((flow) =>
    renderMcpScenarioEvidenceRow({ flow, includeScope, mcpLayer, scope }),
  );
}

function renderMcpAuditDecisionRow(scope) {
  const mcpLayer = findLayer(scope, layerId.mcpScenarioEvidence);
  const decision = mcpLayer.auditDecision;
  if (decision === undefined) {
    return `| ${scope.scopeId} | _none_ | _none_ | _none_ | _none_ | _none_ |`;
  }
  const requiredEvidence = decision.requiredEvidence;
  const missingFlowIds = (mcpLayer.missingEvidenceRows ?? []).map(
    (row) => row.flowId,
  );
  const followUpTaskIds = uniqueSorted(
    (mcpLayer.missingEvidenceRows ?? []).map((row) => row.followUpTaskId),
  );
  const followUp =
    followUpTaskIds.length === 0 ? "_none_" : renderList(followUpTaskIds);
  const inputs = requiredEvidence?.inputs?.map(md).join("<br>") ?? "_none_";
  return `| ${scope.scopeId} | ${md(decision.result)} | ${renderList(decision.reusedFlowIds)} | ${renderList(missingFlowIds)} | ${followUp} | ${inputs} |`;
}

function countBy(values, selectKey) {
  return Object.fromEntries(
    Array.from(
      values.reduce((counts, value) => {
        const key = selectKey(value);
        counts.set(key, (counts.get(key) ?? 0) + 1);
        return counts;
      }, new Map()),
    ).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function findLayer(scope, id) {
  const layer = scope.layers.find((entry) => entry.id === id);
  if (layer === undefined) {
    throw new Error(`Missing ultra-golden layer ${id} for ${scope.scopeId}.`);
  }
  return layer;
}

function renderCoverageMetric(metric) {
  return `${metric.numerator}/${metric.denominator}${
    metric.percent === undefined ? "" : ` (${metric.percent})`
  }`;
}

function renderCountCoverage(metric) {
  return `${metric.numerator}/${metric.denominator}`;
}

function renderCountRows(counts) {
  const entries = Object.entries(counts).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  if (entries.length === 0) return ["| _none_ | 0 |"];
  return entries.map(([key, count]) => `| ${md(key)} | ${count} |`);
}

function renderLayerSnapshotRow({ detail, layer, layerLabel }) {
  const blocking =
    layer.blockingCount === 0 ? "_none_" : `${layer.blockingCount} blocker(s)`;
  return `| ${layerLabel} | ${layer.status} | ${md(detail)} | ${blocking} |`;
}

function renderLevel12UltraGoldenSummary({
  level12FullSupport,
  level12QntMbtJoin,
  ultraGoldenGate,
}) {
  const scope = ultraGoldenGate.scopes.find(
    (entry) => entry.scopeId === "level-1-2",
  );
  if (scope === undefined) {
    throw new Error("Missing level-1-2 ultra-golden scope.");
  }
  const supportLayer = findLayer(scope, layerId.supportCompleteness);
  const qntGeneratorLayer = findLayer(scope, layerId.qntGeneratorReadiness);
  const mbtParityLayer = findLayer(scope, layerId.mbtParityEvidence);
  const mcpScenarioLayer = findLayer(scope, layerId.mcpScenarioEvidence);
  const qntReadinessCounts = countBy(
    qntGeneratorLayer.generatorBlockingRows ?? [],
    (row) => row.readinessStatus,
  );
  const qntBlockerCounts = countBy(
    (qntGeneratorLayer.generatorBlockingRows ?? []).flatMap((row) =>
      row.blockedBy.length === 0
        ? ["no blocker token (readiness not assessed)"]
        : row.blockedBy,
    ),
    (blockedBy) => blockedBy,
  );
  const mcpFlowRows = renderMcpScenarioEvidenceRows(scope, {
    includeScope: false,
  });
  const productRowsByStatus =
    level12FullSupport.metrics.productReadiness.rowsByStatus ?? {};
  const witnessKinds = mbtParityLayer.evidence.witnessKinds ?? {};
  const sourceArtifacts = uniqueSorted([
    level12QntMbtJoin.sourceArtifacts.level12FullSupport,
    level12QntMbtJoin.sourceArtifacts.rulesKernelMatrix,
    level12QntMbtJoin.sourceArtifacts.profileObligations,
    ultraGoldenGate.sourceArtifacts.mcpScenarioEvidence,
    ultraGoldenGate.sourceArtifacts.unitMatrix,
  ]);
  return `${[
    "# Level 1-2 Ultra-Golden Summary",
    "",
    "Generated by `scripts/unit-profile-coverage-check.cjs`.",
    "",
    `Scope: **${md(level12FullSupport.scope.title)}**.`,
    "",
    `Ultra-golden status: **${scope.status}** (${scope.layerResult.completeLayers}/${scope.layerResult.totalLayers} required layers complete).`,
    "",
    "This summary is layer-by-layer. It deliberately does not publish a blended ultra-golden percentage; a pass in support completeness, MBT/parity, or MCP scenario evidence cannot satisfy a blocked QNT/generator readiness layer.",
    "",
    "## Layer Snapshot",
    "",
    "| Layer | Status | Evidence | Blocking issue |",
    "| --- | --- | --- | --- |",
    renderLayerSnapshotRow({
      layer: supportLayer,
      layerLabel: "Support completeness",
      detail: [
        `strict target closure ${renderCoverageMetric(level12FullSupport.metrics.strictTargetClosure)}`,
        `selected identity ${renderCoverageMetric(level12FullSupport.selectedIdentityReadiness.metrics)}`,
        `SRD authored product readiness ${renderCoverageMetric(level12FullSupport.srdAuthoredProductReadiness.metrics)}`,
      ].join("; "),
    }),
    renderLayerSnapshotRow({
      layer: qntGeneratorLayer,
      layerLabel: "QNT/generator readiness",
      detail: [
        `QNT-covered obligations ${renderCountCoverage(qntGeneratorLayer.evidence.qntCoveredObligations)}`,
        `generator-ready semantic-core obligations ${renderCountCoverage(qntGeneratorLayer.evidence.generatorReadySemanticCoreObligations)}`,
      ].join("; "),
    }),
    renderLayerSnapshotRow({
      layer: mbtParityLayer,
      layerLabel: "MBT/parity evidence",
      detail: [
        `parity-witnessed obligations ${renderCountCoverage(mbtParityLayer.evidence.parityWitnessedObligations)}`,
        `witness kinds ${Object.entries(witnessKinds)
          .map(([kind, count]) => `${kind}: ${count}`)
          .join(", ")}`,
      ].join("; "),
    }),
    renderLayerSnapshotRow({
      layer: mcpScenarioLayer,
      layerLabel: "MCP scenario evidence",
      detail: [
        `scenario flows ${renderCountCoverage(mcpScenarioLayer.evidence.scenarioEvidenceFlows)}`,
        `check ${mcpScenarioLayer.evidence.check.command}`,
      ].join("; "),
    }),
    "",
    "## Support Claim",
    "",
    `Full-support claim gate: **${level12FullSupport.claimGate.status}**.`,
    "",
    "| Gate | Result | Blocking rows |",
    "| --- | ---: | ---: |",
    `| Strict target closure | ${renderCoverageMetric(level12FullSupport.metrics.strictTargetClosure)} | ${level12FullSupport.claimGate.strictTargetOpenCount} |`,
    `| Selected identity readiness | ${renderCoverageMetric(level12FullSupport.selectedIdentityReadiness.metrics)} | ${level12FullSupport.claimGate.selectedIdentityBlockerCount} |`,
    `| SRD authored product readiness | ${renderCoverageMetric(level12FullSupport.srdAuthoredProductReadiness.metrics)} | ${level12FullSupport.claimGate.authoredReadinessBlockerCount} |`,
    "",
    "Diagnostic product readiness remains a separate lower-layer accounting view, not a substitute for the support claim gate. It can be below 100% while support completeness passes when the strict, selected-identity, and SRD-authored blocker counts are all zero.",
    "",
    "| Diagnostic product-readiness status | Rows |",
    "| --- | ---: |",
    ...renderCountRows(productRowsByStatus),
    "",
    "## QNT, Generator, And Parity",
    "",
    `Level 1-2 QNT/MBT join open gaps: **${level12QntMbtJoin.openGapRows.length}**.`,
    "",
    "| Join metric | Result |",
    "| --- | ---: |",
    `| Supported Units in join | ${renderCoverageMetric(level12QntMbtJoin.metrics.supportedUnits)} |`,
    `| Rules-kernel profiles in join | ${renderCoverageMetric(level12QntMbtJoin.metrics.rulesKernelProfiles)} |`,
    `| Obligation join rows without open gaps | ${renderCoverageMetric(level12QntMbtJoin.metrics.obligationJoinRows)} |`,
    `| Unique covered obligations | ${renderCoverageMetric(level12QntMbtJoin.metrics.uniqueCoveredObligations)} |`,
    `| Unique QNT-owned obligations | ${renderCoverageMetric(level12QntMbtJoin.metrics.uniqueQntOwnedObligations)} |`,
    `| Unique parity-witnessed obligations | ${renderCoverageMetric(level12QntMbtJoin.metrics.uniqueParityWitnessedObligations)} |`,
    "",
    "Generator readiness passes when every scoped semantic-core obligation is generation-subset-clean and has no blocker or follow-up rows. It does not require a generator implementation or committed generated Rust.",
    "",
    "| Generator readiness status | Blocking rows |",
    "| --- | ---: |",
    ...renderCountRows(qntReadinessCounts),
    "",
    "| Generator blocker | Blocking rows |",
    "| --- | ---: |",
    ...renderCountRows(qntBlockerCounts),
    "",
    "## MCP Scenario Evidence",
    "",
    "| Flow | Status | Witness kind | Scenario evidence | Follow-up task |",
    "| --- | --- | --- | --- | --- |",
    ...mcpFlowRows,
    "",
    "## Source Artifacts",
    "",
    ...sourceArtifacts.map((sourceArtifact) => `- \`${sourceArtifact}\``),
    "",
  ].join("\n")}`;
}

function renderUltraGoldenGate(gate) {
  const selectedIdentityAuditRows =
    gate.selectedIdentityEvidenceAudit.scopes.flatMap(
      renderSelectedIdentityAuditRows,
    );
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
    "## Witness Kind Vocabulary",
    "",
    "The metric distinguishes reducer parity witnesses from MCP scenario evidence by checked witness kind. Rules-kernel parity rows may use `focused-mbt`, `deterministic-qnt-replay`, `runtime-test`, or `contract-test`; MCP scenario rows must use `mcp-scenario`.",
    "",
    "| Witness kind | Meaning |",
    "| --- | --- |",
    ...renderWitnessKindRows(gate),
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
    "MCP scenario evidence is an explicit required layer. Its manifest records required user-facing flows separately from support-profile claims, and the MCP scenario evidence command checks that admitted evidence stays tied to executable MCP scenario tests.",
    "",
    "| Scope | Flow | Status | Witness kind | Scenario evidence | Follow-up task |",
    "| --- | --- | --- | --- | --- | --- |",
    ...gate.scopes.flatMap(renderMcpScenarioEvidenceRows),
    "",
    "## MCP Level-Scope Audit Decisions",
    "",
    "Scope audit decisions are checker-owned conclusions from the MCP scenario evidence manifest. When existing executable scenarios are insufficient for a scoped flow, the required follow-up inputs stay with the missing evidence row instead of being inferred from selected-identity or support-profile coverage.",
    "",
    "| Scope | Decision | Existing evidence reused | Missing flows | Follow-up task | Required scenario inputs |",
    "| --- | --- | --- | --- | --- | --- |",
    ...gate.scopes.map(renderMcpAuditDecisionRow),
    "",
    "## Selected Identity Evidence Join Audit",
    "",
    "Selected-identity replay is Unit identity wiring evidence. This audit keeps it separate from the ultra-golden QNT/MBT and MCP layers by listing scoped supported Units whose selected-identity evidence owner has neither an exact QNT/MBT parity-witness join nor inferred MCP flow scenario evidence.",
    "",
    "| Scope | Selected-identity evidence rows | Joined through QNT/MBT or MCP | Missing join rows |",
    "| --- | ---: | ---: | ---: |",
    ...gate.selectedIdentityEvidenceAudit.scopes.map(renderAuditMetricRow),
    "",
    "| Scope | Unit | Kind | Evidence task | Evidence owner | QNT/MBT join | QNT/MBT witness owners for Unit | MCP join | Required MCP flows | Missing MCP flows | Profiles |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...(selectedIdentityAuditRows.length === 0
      ? [
          "| _none_ | _none_ | _none_ | _none_ | _none_ | _none_ | _none_ | _none_ | _none_ | _none_ | _none_ |",
        ]
      : selectedIdentityAuditRows),
    "",
  ].join("\n")}`;
}

module.exports = {
  buildUltraGoldenGate,
  renderLevel12UltraGoldenSummary,
  renderUltraGoldenGate,
  validateMcpScenarioEvidence,
};
