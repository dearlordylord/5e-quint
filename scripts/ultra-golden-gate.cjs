const passStatus = "pass";
const blockedStatus = "blocked";
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
      "Every scoped user-facing MCP flow has checker-owned scenario evidence. The evidence source is intentionally absent until the MCP scenario gate lands.",
  },
];

const mcpScenarioFollowUpTaskIds = [
  "C3-MCP-LEVEL12-SCENARIO-GATE",
  "C9-CHARACTER-CREATION-MCP-EVIDENCE",
  "C10-CHARACTER-SHEET-MCP-EVIDENCE",
  "C11-BATTLE-MCP-EVIDENCE",
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
    blockingCount: blockers.reduce((total, blocker) => total + blocker.count, 0),
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

function buildQntGeneratorReadinessLayer({
  kernelIndexes,
  obligationIds,
}) {
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

function buildMcpScenarioEvidenceLayer(levelReport) {
  return stable({
    id: layerId.mcpScenarioEvidence,
    status: blockedStatus,
    blockingCount: 1,
    blockers: [
      {
        followUpTaskIds: mcpScenarioFollowUpTaskIds,
        reason:
          "No checker-owned MCP scenario evidence source has been admitted for this ultra-golden scope.",
      },
    ],
    evidence: {
      scopedStrictUnits: levelReport.summary.strictDenominator,
      source: "not-admitted",
    },
  });
}

function buildScopeGate({ levelReport, rulesKernelMatrix, scopeId }) {
  const obligationIds = scopedObligationIds(levelReport);
  const kernelIndexes = buildKernelIndexes(rulesKernelMatrix);
  const layers = [
    buildSupportCompletenessLayer(levelReport),
    buildQntGeneratorReadinessLayer({ kernelIndexes, obligationIds }),
    buildMbtParityEvidenceLayer({ kernelIndexes, obligationIds }),
    buildMcpScenarioEvidenceLayer(levelReport),
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
  rulesKernelMatrix,
}) {
  const scopes = [
    buildScopeGate({
      levelReport: level1FullSupport,
      rulesKernelMatrix,
      scopeId: "level-1",
    }),
    buildScopeGate({
      levelReport: level12FullSupport,
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
    layer.blockingCount === 0
      ? "_none_"
      : `${layer.blockingCount} blocker(s)`;
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
    "MCP scenario evidence is an explicit required layer and is currently blocked until checker-owned scenario evidence is admitted.",
    "",
    "| Scope | Follow-up tasks | Reason |",
    "| --- | --- | --- |",
    ...gate.scopes.map((scope) => {
      const mcpLayer = scope.layers.find(
        (layer) => layer.id === layerId.mcpScenarioEvidence,
      );
      const blocker = mcpLayer?.blockers?.[0];
      const followUps = (blocker?.followUpTaskIds ?? [])
        .map((taskId) => `\`${taskId}\``)
        .join(", ");
      return `| ${scope.scopeId} | ${followUps} | ${md(blocker?.reason)} |`;
    }),
    "",
  ].join("\n")}`;
}

module.exports = {
  buildUltraGoldenGate,
  renderUltraGoldenGate,
};
