const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  battleReadinessClosureKind,
  deterministicAdmissionProjectionEvidenceTag,
  mcpScenarioWitnessKind,
  selectedIdentityMbtEvidenceTag,
} = require("./unit-profile-coverage-config.cjs");
const {
  extractDriverSchemaActionNames,
  extractMbtFixtureActionSet,
  extractSelectedUnitIdentityReplays,
} = require("./unit-profile-coverage-claim-scan.cjs");
const {
  hasExecutableMechanics,
  hasVariantMagicMechanics,
} = require("./unit-profile-coverage-discovery.cjs");
const {
  buildSelectedIdentityReadiness,
  characterLevelBands,
  buildSrdAuthoredProductReadiness,
} = require("./level1-full-support-report.cjs");
const {
  buildRulesKernelProfileJoin,
  buildRulesKernelSupportedUnitJoin,
} = require("./rules-kernel-profile-join.cjs");
const { fail, toRepoPath } = require("./unit-profile-coverage-io.cjs");
const {
  validateCollections,
  validateCoverageInputs,
  validateOwnerClaims,
} = require("./unit-profile-coverage-validation.cjs");
const { validateSrdUnitInventory } = require("./srd-unit-inventory.cjs");
const {
  buildUltraGoldenGate,
  renderUltraGoldenGate,
  validateMcpScenarioEvidence,
} = require("./ultra-golden-gate.cjs");
const {
  buildSpellProcedureMbtEvidenceGate,
} = require("./spell-procedure-mbt-evidence-gate.cjs");
const {
  buildFeatureProcedureMbtEvidenceGate,
} = require("./feature-procedure-mbt-evidence-gate.cjs");
const {
  selectedIdentityEvidenceStatus,
  selectedIdentityStatus,
} = require("./unit-profile-coverage-report.cjs");

const mindSpikeFixture = Object.freeze({
  unitId: "mind_spike",
  profileId: "spell.invocation-damage-save-or-attack",
  sourceRecordPath: "packages/surface/content/mind_spike.json",
  selectedIdentityTaskId: "L13UG-A01-MIND-SPIKE-SELECTED-IDENTITY",
  selectedIdentityOwnerPath:
    "packages/battle-runtime/src/mind-spike-selected-identity.mbt.test.ts",
});

function writeFixtureJson(root, relativePath, value) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`);
}

function installedFixtureUnit(unitId, kind, sourceRecordPath) {
  return {
    unitId,
    collectionId: "srd-5.2.1",
    catalogAdmission: {
      status: "installed",
      collectionId: "srd-5.2.1",
    },
    sourceRecordPath,
    kind,
    executableMechanics: kind !== "background" && kind !== "class",
  };
}

function mcpScenarioEvidenceFixture(kind) {
  return {
    schema: "dnd.mcp-scenario-evidence.v1",
    ownerPackage: "@dnd/mcp",
    check: {
      packageName: "@dnd/mcp",
      script: "test:mcp-scenario-evidence",
    },
    requiredFlows: [
      {
        flowId: "mcp-workflow-discovery",
        scopeIds: ["level-1", "level-1-3"],
        followUpTaskIdsByScope: {
          "level-1": "C3-MCP-LEVEL12-SCENARIO-GATE",
          "level-1-3": "L13UG-A04-MCP-LEVEL13-EVIDENCE-AUDIT",
        },
        description: "sample MCP flow",
      },
    ],
    evidence: [
      {
        kind,
        flowId: "mcp-workflow-discovery",
        scopeIds: ["level-1"],
        scenarioId: "discover-mcp-surface",
        ownerPath: "packages/mcp/test-support/mcp-acceptance-scenarios.ts",
        testPath: "packages/mcp/src/mcp-protocol.test.ts",
        taskId: "C3-MCP-LEVEL12-SCENARIO-GATE",
        summary: "sample MCP evidence",
      },
    ],
    scopeAuditDecisions: [
      {
        scopeId: "level-1-3",
        auditTaskId: "L13UG-A04-MCP-LEVEL13-EVIDENCE-AUDIT",
        result: "new-scenario-required",
        reason: "fixture missing scenario evidence",
        reusedFlowIds: [],
        requiredEvidence: {
          scenarioGoal: "fixture scenario",
          inputs: ["fixture input"],
        },
      },
    ],
  };
}

function groupFixtureRowsByUnitId(rows) {
  return rows.reduce((groups, row) => {
    const current = groups.get(row.unitId) ?? [];
    current.push(row);
    groups.set(row.unitId, current);
    return groups;
  }, new Map());
}

function authoredReadinessFixture(root, options = {}) {
  const contentDir = "packages/surface/content";
  const backgroundRecords = [
    {
      id: "background_acolyte",
      originFeatId: "feat_magic_initiate_cleric",
      startingEquipment: [],
    },
    {
      id: "background_criminal",
      originFeatId: "alert",
      startingEquipment: [],
    },
    {
      id: "background_sage",
      originFeatId: "feat_magic_initiate_wizard",
      startingEquipment: [],
    },
    {
      id: "background_soldier",
      originFeatId: "feat_savage_attacker",
      startingEquipment: [],
    },
  ];
  const classRecords = [
    {
      id: "class_warlock",
      featureGrants: [{ level: 1, unitId: "warlock_pact_magic" }],
      startingEquipment: [],
    },
  ];
  for (const record of [...backgroundRecords, ...classRecords]) {
    writeFixtureJson(root, `${contentDir}/${record.id}.json`, record);
  }

  const rows = [
    ...backgroundRecords.map((record) =>
      installedFixtureUnit(
        record.id,
        "background",
        `${contentDir}/${record.id}.json`,
      ),
    ),
    installedFixtureUnit(
      "feat_magic_initiate_cleric",
      "feat",
      `${contentDir}/feat_magic_initiate_cleric.json`,
    ),
    installedFixtureUnit("alert", "feat", `${contentDir}/alert.json`),
    installedFixtureUnit(
      "feat_magic_initiate_wizard",
      "feat",
      `${contentDir}/feat_magic_initiate_wizard.json`,
    ),
    installedFixtureUnit(
      "feat_savage_attacker",
      "feat",
      `${contentDir}/feat_savage_attacker.json`,
    ),
    ...classRecords.map((record) =>
      installedFixtureUnit(
        record.id,
        "class",
        `${contentDir}/${record.id}.json`,
      ),
    ),
    installedFixtureUnit(
      "warlock_pact_magic",
      "class_feature",
      `${contentDir}/warlock_pact_magic.json`,
    ),
  ].filter((row) => !(options.omitUnitIds ?? []).includes(row.unitId));

  if (options.duplicateAlert) {
    rows.push({
      ...installedFixtureUnit("alert", "feat", `${contentDir}/alert_copy.json`),
      catalogAdmission: {
        status: "not-in-unit-catalog",
        expectedCollectionId: "srd-5.2.1",
      },
    });
  }

  return buildSrdAuthoredProductReadiness(
    groupFixtureRowsByUnitId(rows),
    { maxCharacterLevel: 1 },
    { root },
  );
}

function assertAuthoredReadinessBlocked(readiness, expected) {
  const matchingBlocker = readiness.blockerRows.find(
    (row) =>
      row.group === expected.group &&
      row.ownerUnitId === expected.ownerUnitId &&
      row.unitId === expected.unitId &&
      row.status === expected.status,
  );
  if (matchingBlocker === undefined || readiness.openBlockerCount === 0) {
    fail(
      `Self-test failed: expected authored readiness blocker ${JSON.stringify(expected)}, got ${JSON.stringify(readiness.blockerRows)}`,
    );
  }
}

function fullSupportReportFixture({
  claimGate,
  rulesKernelSupportedUnitJoin,
  scopeTitle,
}) {
  return {
    scope: { title: scopeTitle },
    metrics: {
      strictTargetClosure:
        claimGate.strictTargetOpenCount === 0
          ? { denominator: 1, numerator: 1, percent: "100%" }
          : { denominator: 1, numerator: 0, percent: "0%" },
    },
    selectedIdentityReadiness: {
      metrics:
        claimGate.selectedIdentityBlockerCount === 0
          ? { denominator: 1, numerator: 1, percent: "100%" }
          : { denominator: 1, numerator: 0, percent: "0%" },
    },
    srdAuthoredProductReadiness: {
      metrics:
        claimGate.authoredReadinessBlockerCount === 0
          ? { denominator: 1, numerator: 1, percent: "100%" }
          : { denominator: 1, numerator: 0, percent: "0%" },
    },
    claimGate,
    groups: [],
    rulesKernelSupportedUnitJoin,
  };
}

function requireSelfTestScope(gate, scopeId) {
  const scope = gate.scopes.find((entry) => entry.scopeId === scopeId);
  if (scope === undefined) {
    fail(`Self-test failed: expected ultra-golden scope ${scopeId}.`);
  }
  return scope;
}

function requireSelfTestLayer(scope, layerId) {
  const layer = scope.layers.find((entry) => entry.id === layerId);
  if (layer === undefined) {
    fail(
      `Self-test failed: expected ultra-golden layer ${layerId} in ${scope.scopeId}.`,
    );
  }
  return layer;
}

function mindSpikeDeferredSelectedIdentityUnit(withSelectedIdentityEvidence) {
  return {
    unitId: mindSpikeFixture.unitId,
    collectionId: "srd-5.2.1",
    catalogAdmission: {
      status: "installed",
      collectionId: "srd-5.2.1",
    },
    sourceRecordPath: mindSpikeFixture.sourceRecordPath,
    kind: "spell",
    executableMechanics: true,
    claim: {
      tag: "profile-subset-supported",
      profileIds: [mindSpikeFixture.profileId],
      supportedMechanics: [
        "Magic Action level-2-or-higher Spell Slot casting",
        "Wisdom Saving Throw against the caster Spell Save DC",
        "Psychic damage on failed or successful save",
        "failed-save Concentration ownership and duration cleanup",
      ],
      deferredMechanics: [
        {
          mechanic:
            "failed-save same-plane location knowledge, Hidden prevention, and observer-scoped Invisible benefit denial",
          battleReadinessClosure: {
            kind:
              battleReadinessClosureKind.outsideRuntimePresentationExploration,
            owner: "runtime-detached table/perception/knowledge owner",
            reason:
              "The promoted battle runtime does not store duplicate table/perception knowledge state.",
          },
        },
      ],
      deferredMechanicsSelectedIdentityDisposition: {
        tag: "not-applicable",
        owner: "runtime-detached table/perception/knowledge owner",
        reason:
          "The location knowledge, Hidden prevention, and observer-scoped Invisible benefit denial are table/perception knowledge facts outside promoted battle-runtime replay.",
      },
    },
    evidence: withSelectedIdentityEvidence
      ? [
          {
            tag: selectedIdentityMbtEvidenceTag,
            taskId: mindSpikeFixture.selectedIdentityTaskId,
            ownerPath: mindSpikeFixture.selectedIdentityOwnerPath,
          },
        ]
      : [],
  };
}

function mindSpikeDeferredSelectedIdentityReadinessRow(
  withSelectedIdentityEvidence,
) {
  const unit = mindSpikeDeferredSelectedIdentityUnit(
    withSelectedIdentityEvidence,
  );
  return {
    unitId: unit.unitId,
    status: "closed-outside-battle-runtime-boundary",
    claimTag: unit.claim.tag,
    selectedIdentity: selectedIdentityEvidenceStatus(
      unit,
      selectedIdentityMbtEvidenceTag,
    ),
    sourceRecordPath: unit.sourceRecordPath,
  };
}

function assertMindSpikeDeferredSelectedIdentityGate() {
  const withoutWitness = buildSelectedIdentityReadiness([
    mindSpikeDeferredSelectedIdentityReadinessRow(false),
  ]);
  if (
    withoutWitness.blockingRows.length !== 1 ||
    withoutWitness.blockingRows[0].unitId !== mindSpikeFixture.unitId ||
    withoutWitness.blockingRows[0].selectedIdentityStatus !==
      selectedIdentityStatus.missingWitnessDeferredNotApplicable
  ) {
    fail(
      `Self-test failed: expected Mind Spike deferred selected-identity disposition to block without selected identity evidence, got ${JSON.stringify(withoutWitness)}`,
    );
  }

  const withWitness = buildSelectedIdentityReadiness([
    mindSpikeDeferredSelectedIdentityReadinessRow(true),
  ]);
  if (
    withWitness.blockingRows.length !== 0 ||
    withWitness.readyRowsByStatus[selectedIdentityStatus.witnessPresent] !== 1
  ) {
    fail(
      `Self-test failed: expected Mind Spike selected identity evidence to satisfy the supported subset gate, got ${JSON.stringify(withWitness)}`,
    );
  }
}

function runSelfTest(root) {
  const levelTwoBands = characterLevelBands(2);
  if (
    JSON.stringify(levelTwoBands) !==
    JSON.stringify(["level-1", "level-2", "spell-level-0", "spell-level-1"])
  ) {
    fail(
      `Self-test failed: expected character level 2 bands to exclude spell-level-2, got ${JSON.stringify(levelTwoBands)}`,
    );
  }
  const levelThreeBands = characterLevelBands(3);
  if (
    JSON.stringify(levelThreeBands) !==
    JSON.stringify([
      "level-1",
      "level-2",
      "level-3",
      "spell-level-0",
      "spell-level-1",
      "spell-level-2",
    ])
  ) {
    fail(
      `Self-test failed: expected character level 3 bands to include spell-level-2 and exclude spell-level-3, got ${JSON.stringify(levelThreeBands)}`,
    );
  }
  assertMindSpikeDeferredSelectedIdentityGate();

  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "unit-profile-coverage-self-test-"),
  );
  try {
    writeFixtureJson(tempDir, "packages/mcp/package.json", {
      scripts: {
        "test:mcp-scenario-evidence": "vitest run src/mcp-protocol.test.ts",
      },
    });
    writeFixtureJson(
      tempDir,
      "packages/mcp/test-support/mcp-acceptance-scenarios.ts",
      {},
    );
    writeFixtureJson(tempDir, "packages/mcp/src/mcp-protocol.test.ts", {});
    const validMcpScenarioIssues = validateMcpScenarioEvidence(
      mcpScenarioEvidenceFixture(mcpScenarioWitnessKind),
      { root: tempDir },
    );
    if (validMcpScenarioIssues.length !== 0) {
      fail(
        `Self-test failed: expected valid MCP scenario evidence to pass, got ${JSON.stringify(validMcpScenarioIssues)}`,
      );
    }
    const invalidMcpScenarioIssues = validateMcpScenarioEvidence(
      mcpScenarioEvidenceFixture("focused-mbt"),
      { root: tempDir },
    );
    const expectedMcpScenarioIssue =
      "MCP scenario evidence manifest evidence[0].kind must be mcp-scenario.";
    if (!invalidMcpScenarioIssues.includes(expectedMcpScenarioIssue)) {
      fail(
        `Self-test failed: expected invalid MCP witness kind issue ${JSON.stringify(expectedMcpScenarioIssue)}, got ${JSON.stringify(invalidMcpScenarioIssues)}`,
      );
    }
    const duplicateMcpAuditOwnership = mcpScenarioEvidenceFixture(
      mcpScenarioWitnessKind,
    );
    duplicateMcpAuditOwnership.scopeAuditDecisions[0].missingFlowIds = [
      "mcp-workflow-discovery",
    ];
    duplicateMcpAuditOwnership.scopeAuditDecisions[0].requiredEvidence.followUpTaskId =
      "fixture-duplicate-follow-up";
    duplicateMcpAuditOwnership.scopeAuditDecisions[0].requiredEvidence.coveredFlowIds =
      ["mcp-workflow-discovery"];
    const duplicateMcpAuditOwnershipIssues = validateMcpScenarioEvidence(
      duplicateMcpAuditOwnership,
      { root: tempDir },
    );
    const expectedDuplicateMcpAuditOwnershipIssues = [
      "MCP scenario evidence manifest scopeAuditDecisions[0] must not include unsupported field missingFlowIds.",
      "MCP scenario evidence manifest scopeAuditDecisions[0].requiredEvidence must not include unsupported field followUpTaskId.",
      "MCP scenario evidence manifest scopeAuditDecisions[0].requiredEvidence must not include unsupported field coveredFlowIds.",
    ];
    for (const expectedIssue of expectedDuplicateMcpAuditOwnershipIssues) {
      if (!duplicateMcpAuditOwnershipIssues.includes(expectedIssue)) {
        fail(
          `Self-test failed: expected duplicate MCP audit ownership issue ${JSON.stringify(expectedIssue)}, got ${JSON.stringify(duplicateMcpAuditOwnershipIssues)}`,
        );
      }
    }
    const incompleteLevelReport = fullSupportReportFixture({
      scopeTitle: "Fixture incomplete level",
      claimGate: {
        status: "blocked",
        strictTargetOpenCount: 1,
        selectedIdentityBlockerCount: 1,
        authoredReadinessBlockerCount: 1,
      },
      rulesKernelSupportedUnitJoin: {
        units: [
          {
            unitId: "fixture_incomplete_unit",
            profiles: [
              {
                profileId: "fixture.incomplete-profile",
                obligations: [
                  {
                    obligationId: "BATTLE.FIXTURE.INCOMPLETE",
                    runtime: "battle",
                  },
                ],
              },
            ],
          },
        ],
      },
    });
    const completeLevelReport = fullSupportReportFixture({
      scopeTitle: "Fixture complete level",
      claimGate: {
        status: "pass",
        strictTargetOpenCount: 0,
        selectedIdentityBlockerCount: 0,
        authoredReadinessBlockerCount: 0,
      },
      rulesKernelSupportedUnitJoin: { units: [] },
    });
    const ultraGoldenGate = buildUltraGoldenGate({
      level1FullSupport: incompleteLevelReport,
      level12FullSupport: completeLevelReport,
      level13FullSupport: completeLevelReport,
      mcpScenarioEvidence: {
        check: {
          packageName: "@dnd/mcp",
          script: "test:mcp-scenario-evidence",
        },
        requiredFlows: [
          {
            flowId: "fixture-missing-flow",
            scopeIds: ["level-1", "level-1-3"],
            followUpTaskIdsByScope: {
              "level-1": "C15-ULTRA-GOLDEN-CHECKER-REGRESSION",
              "level-1-3": "L13UG-A04-MCP-LEVEL13-EVIDENCE-AUDIT",
            },
            description: "fixture missing scenario evidence",
          },
        ],
        evidence: [],
        scopeAuditDecisions: [
          {
            scopeId: "level-1",
            auditTaskId: "C15-ULTRA-GOLDEN-CHECKER-REGRESSION",
            result: "new-scenario-required",
            reason: "fixture missing scenario evidence",
            reusedFlowIds: [],
            requiredEvidence: {
              scenarioGoal: "fixture scenario",
              inputs: ["fixture input"],
            },
          },
          {
            scopeId: "level-1-3",
            auditTaskId: "L13UG-A04-MCP-LEVEL13-EVIDENCE-AUDIT",
            result: "new-scenario-required",
            reason: "fixture missing scenario evidence",
            reusedFlowIds: [],
            requiredEvidence: {
              scenarioGoal: "fixture scenario",
              inputs: ["fixture input"],
            },
          },
        ],
      },
      rulesKernelMatrix: {
        obligations: [
          {
            id: "BATTLE.FIXTURE.INCOMPLETE",
            runtime: "battle",
            status: "boundary-only",
            parityWitnesses: [],
          },
        ],
        generatorReadiness: [],
        qntOwnerRoles: [
          {
            ownerPath: "fixture/incomplete.qnt",
            role: "semantic-core",
            obligationIds: ["BATTLE.FIXTURE.INCOMPLETE"],
          },
        ],
      },
      selectedIdentityMbtEvidenceTag,
      unitMatrix: { units: [] },
    });
    const incompleteScope = requireSelfTestScope(ultraGoldenGate, "level-1");
    const completeScope = requireSelfTestScope(ultraGoldenGate, "level-1-2");
    const completeLevel13Scope = requireSelfTestScope(
      ultraGoldenGate,
      "level-1-3",
    );
    if (
      ultraGoldenGate.status !== "blocked" ||
      !ultraGoldenGate.blockedScopeIds.includes("level-1") ||
      !ultraGoldenGate.blockedScopeIds.includes("level-1-3") ||
      incompleteScope.status !== "blocked" ||
      completeScope.status !== "pass" ||
      completeLevel13Scope.status !== "blocked" ||
      incompleteScope.layerResult.completeLayers !== 0 ||
      incompleteScope.layerResult.totalLayers !== 4
    ) {
      fail(
        `Self-test failed: expected incomplete ultra-golden fixture to block every level-1 layer, block level-1-3 on MCP evidence, and leave level-1-2 pass, got ${JSON.stringify(ultraGoldenGate)}`,
      );
    }
    for (const fixtureLayerId of [
      "support-completeness",
      "qnt-generator-readiness",
      "mbt-parity-evidence",
      "mcp-scenario-evidence",
    ]) {
      const layer = requireSelfTestLayer(incompleteScope, fixtureLayerId);
      if (layer.status !== "blocked" || layer.blockingCount < 1) {
        fail(
          `Self-test failed: expected incomplete ultra-golden layer ${fixtureLayerId} to report blockers, got ${JSON.stringify(layer)}`,
        );
      }
    }
    const renderedUltraGoldenGate = renderUltraGoldenGate(ultraGoldenGate);
    for (const expectedRow of [
      "Ultra-golden gate: **blocked**.",
      "| level-1 | support-completeness | blocked |",
      "| level-1 | qnt-generator-readiness | blocked |",
      "| level-1 | mbt-parity-evidence | blocked |",
      "| level-1 | mcp-scenario-evidence | blocked |",
      "| level-1-2 | pass | 4/4 | 0 |",
      "| level-1-3 | blocked | 3/4 | 0 |",
      "| level-1-3 | mcp-scenario-evidence | blocked |",
    ]) {
      if (!renderedUltraGoldenGate.includes(expectedRow)) {
        fail(
          `Self-test failed: expected rendered ultra-golden gate row ${JSON.stringify(expectedRow)}, got ${JSON.stringify(renderedUltraGoldenGate)}`,
        );
      }
    }
    const completeLevel13ScopeId = "level-1-3";
    const completeLevel13ObligationId = "BATTLE.FIXTURE.COMPLETE";
    const completeLevel13McpFlowId = "fixture-covered-flow";
    const completeLevel13McpTaskId =
      "L13UG-A05-MCP-LEVEL13-SCENARIO-IF-NEEDED";
    const completeLevel13Report = fullSupportReportFixture({
      scopeTitle: "Fixture complete level 1-3",
      claimGate: {
        status: "pass",
        strictTargetOpenCount: 0,
        selectedIdentityBlockerCount: 0,
        authoredReadinessBlockerCount: 0,
      },
      rulesKernelSupportedUnitJoin: {
        units: [
          {
            unitId: "fixture_complete_unit",
            profiles: [
              {
                profileId: "fixture.complete-profile",
                obligations: [
                  {
                    obligationId: completeLevel13ObligationId,
                    runtime: "battle",
                  },
                ],
              },
            ],
          },
        ],
      },
    });
    const completeLevel13Gate = buildUltraGoldenGate({
      level1FullSupport: completeLevelReport,
      level12FullSupport: completeLevelReport,
      level13FullSupport: completeLevel13Report,
      mcpScenarioEvidence: {
        check: {
          packageName: "@dnd/mcp",
          script: "test:mcp-scenario-evidence",
        },
        requiredFlows: [
          {
            flowId: completeLevel13McpFlowId,
            scopeIds: [completeLevel13ScopeId],
            followUpTaskIdsByScope: {
              [completeLevel13ScopeId]: "L13UG-A04-MCP-LEVEL13-EVIDENCE-AUDIT",
            },
            description: "fixture covered scenario evidence",
          },
        ],
        evidence: [
          {
            kind: mcpScenarioWitnessKind,
            flowId: completeLevel13McpFlowId,
            scopeIds: [completeLevel13ScopeId],
            scenarioId: "fixture-covered-scenario",
            ownerPath:
              "packages/mcp/test-support/mcp-acceptance-scenarios.ts",
            testPath: "packages/mcp/src/mcp-protocol.test.ts",
            taskId: completeLevel13McpTaskId,
            summary: "fixture MCP scenario evidence",
          },
        ],
        scopeAuditDecisions: [],
      },
      rulesKernelMatrix: {
        obligations: [
          {
            id: completeLevel13ObligationId,
            runtime: "battle",
            status: "covered",
            parityWitnesses: [
              {
                kind: "focused-mbt",
                ownerPath: "fixture/complete.mbt.test.ts",
              },
            ],
          },
        ],
        generatorReadiness: [
          {
            obligationId: completeLevel13ObligationId,
            status: "generation-subset-clean",
            blockedBy: [],
          },
        ],
        qntOwnerRoles: [
          {
            ownerPath: "fixture/complete.qnt",
            role: "semantic-core",
            obligationIds: [completeLevel13ObligationId],
          },
        ],
      },
      selectedIdentityMbtEvidenceTag,
      unitMatrix: { units: [] },
    });
    const completeLevel13PassScope = requireSelfTestScope(
      completeLevel13Gate,
      completeLevel13ScopeId,
    );
    if (
      completeLevel13Gate.status !== "pass" ||
      completeLevel13PassScope.status !== "pass" ||
      completeLevel13PassScope.layerResult.completeLayers !== 4 ||
      completeLevel13PassScope.layerResult.totalLayers !== 4 ||
      completeLevel13PassScope.scopedObligationIds.length !== 1
    ) {
      fail(
        `Self-test failed: expected complete level-1-3 ultra-golden fixture to pass all four layers with a scoped obligation, got ${JSON.stringify(completeLevel13Gate)}`,
      );
    }
    for (const fixtureLayerId of [
      "support-completeness",
      "qnt-generator-readiness",
      "mbt-parity-evidence",
      "mcp-scenario-evidence",
    ]) {
      const layer = requireSelfTestLayer(
        completeLevel13PassScope,
        fixtureLayerId,
      );
      if (layer.status !== "pass" || layer.blockingCount !== 0) {
        fail(
          `Self-test failed: expected complete level-1-3 ultra-golden layer ${fixtureLayerId} to pass, got ${JSON.stringify(layer)}`,
        );
      }
    }
    const renderedCompleteLevel13Gate = renderUltraGoldenGate(
      completeLevel13Gate,
    );
    for (const expectedRow of [
      "Ultra-golden gate: **pass**.",
      `| ${completeLevel13ScopeId} | pass | 4/4 | 1 |`,
      `| ${completeLevel13ScopeId} | support-completeness | pass |`,
      `| ${completeLevel13ScopeId} | qnt-generator-readiness | pass |`,
      `| ${completeLevel13ScopeId} | mbt-parity-evidence | pass |`,
      `| ${completeLevel13ScopeId} | mcp-scenario-evidence | pass |`,
    ]) {
      if (!renderedCompleteLevel13Gate.includes(expectedRow)) {
        fail(
          `Self-test failed: expected rendered complete level-1-3 ultra-golden gate row ${JSON.stringify(expectedRow)}, got ${JSON.stringify(renderedCompleteLevel13Gate)}`,
        );
      }
    }

    const specPath = path.join(tempDir, "fixture.mbt.qnt");
    const testPath = path.join(tempDir, "fixture.mbt.test.ts");
    fs.writeFileSync(
      specPath,
      [
        "module fixture {",
        "  action doReachableBareString = true",
        "  action doReachableAction = true",
        "  action doReachableWrongUnit = true",
        "  action step = any {",
        "    doReachableBareString,",
        "    doReachableAction,",
        "    doReachableWrongUnit,",
        "  }",
        "}",
        "",
      ].join("\n"),
    );
    const testText = [
      "const driverSchema = {",
      "  doReachableAction: {},",
      "  doDriverOnly: {},",
      "} as const;",
      "const selectedUnitIdentityReplays = [",
      "  {",
      '    taskId: "QMBT10",',
      '    unitId: "fixture_unit",',
      '    actions: ["doReachableAction"],',
      "    sequences: [],",
      "  },",
      "] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;",
      "const driver = defineDriver(driverSchema, () => ({",
      '  doReachableAction: () => unitFeatureSubject("fixture_unit"),',
      "}));",
      'it("replays selected Unit identities deterministically", () => {',
      "  for (const replay of selectedUnitIdentityReplays) {",
      "    for (const sequence of replay.sequences) {",
      "      void sequence;",
      "    }",
      "  }",
      "});",
      "await run({",
      '  spec: path.resolve(import.meta.dirname, "./fixture.mbt.qnt"),',
      '  step: "step",',
      "});",
      "",
    ].join("\n");
    const fixtureActionSet = extractMbtFixtureActionSet(
      root,
      testText,
      testPath,
    );
    const issues = validateOwnerClaims(
      [],
      [],
      [],
      {
        unitEvidence: [],
        unitIdentityMbtReplays: [
          {
            ownerPath: "fixture/rule-core-features.mbt.test.ts",
            line: 1,
            taskId: "QMBT10",
            unitId: "fixture_unit",
            actionNames: ["doDriverOnly"],
            declaredActions: extractDriverSchemaActionNames(testText),
            stepActionNames: fixtureActionSet.actionNames,
            stepDescription: fixtureActionSet.description,
          },
          {
            ownerPath: "fixture/rule-core-features.mbt.test.ts",
            line: 2,
            taskId: "QMBT10",
            unitId: "fixture_unit",
            actionNames: ["doReachableAction"],
            declaredActions: extractDriverSchemaActionNames(testText),
            stepActionNames: fixtureActionSet.actionNames,
            stepDescription: fixtureActionSet.description,
          },
          {
            ownerPath: "fixture/rule-core-features.mbt.test.ts",
            line: 3,
            taskId: "QMBT10",
            unitId: "fixture_unit",
            actionNames: ["doReachableAction", "doDriverOnly"],
            declaredActions: extractDriverSchemaActionNames(testText),
            stepActionNames: fixtureActionSet.actionNames,
            stepDescription: fixtureActionSet.description,
          },
        ],
        selectedUnitIdentityReplays: extractSelectedUnitIdentityReplays(
          testText,
        ).map((replay) => ({
          ownerPath: "fixture/rule-core-features.mbt.test.ts",
          ...replay,
        })),
        selectedUnitIdentityReplayConsumers: [
          { ownerPath: "fixture/rule-core-features.mbt.test.ts" },
        ],
      },
      [
        {
          unitId: "fixture_unit",
          evidence: {
            ownerPath: "fixture/rule-core-features.mbt.test.ts",
            tag: selectedIdentityMbtEvidenceTag,
            taskId: "QMBT10",
          },
        },
      ],
    );
    const expected = `fixture/rule-core-features.mbt.test.ts:1 cites Unit identity MBT replay action doDriverOnly that is not reachable from ${toRepoPath(root, specPath)} step.`;
    if (!issues.includes(expected)) {
      fail(
        `Self-test failed: expected unreachable Quint step action issue, got ${JSON.stringify(issues)}`,
      );
    }
    const actionMismatchExpected =
      "fixture/rule-core-features.mbt.test.ts:3 claims selected identity MBT replay actions for fixture_unit that do not match deterministic replay data.";
    if (!issues.includes(actionMismatchExpected)) {
      fail(
        `Self-test failed: expected deterministic replay action mismatch issue, got ${JSON.stringify(issues)}`,
      );
    }
    const boundaryIssue = issues.find(
      (issue) =>
        issue ===
        "fixture/rule-core-features.mbt.test.ts:2 claims selected identity MBT replay actions for fixture_unit that do not match deterministic replay data.",
    );
    if (boundaryIssue !== undefined) {
      fail(
        `Self-test failed: expected matching deterministic replay action marker to pass, got ${JSON.stringify(issues)}`,
      );
    }
    const taskClaimDriftIssues = validateOwnerClaims(
      [
        {
          id: "fixture.profile",
          qntOwners: [],
          runtimeOwners: [],
          verificationOwners: [
            { kind: "qnt-proof", ownerPath: "fixture/proof.qnt" },
            { kind: "focused-mbt", ownerPath: "fixture/parity.test.ts" },
          ],
          taskRefs: ["QCORE_FIXTURE", "QMBT_FIXTURE"],
        },
      ],
      [
        {
          taskId: "QCORE_FIXTURE",
          claimKind: "qnt-proof",
          profileIds: [],
        },
        {
          taskId: "QMBT_FIXTURE",
          claimKind: "completed-runtime-parity",
          profileIds: [],
        },
      ],
      [
        {
          ownerPath: "fixture/proof.qnt",
          claimKind: "verification-owner:qnt-proof",
          profileIds: ["fixture.profile"],
        },
        {
          ownerPath: "fixture/parity.test.ts",
          claimKind: "verification-owner:focused-mbt",
          profileIds: ["fixture.profile"],
        },
      ],
      {
        unitEvidence: [],
        unitIdentityMbtReplays: [],
        selectedUnitIdentityReplays: [],
        selectedUnitIdentityReplayConsumers: [],
      },
      [],
    );
    for (const expectedIssue of [
      "fixture.profile has qnt-proof verification ownership but no qnt-proof task claim.",
      "fixture.profile has runtime parity verification ownership but no completed runtime parity task claim.",
      "fixture.profile taskRefs includes QCORE_FIXTURE but no matching task claim includes the profile.",
      "fixture.profile taskRefs includes QMBT_FIXTURE but no matching task claim includes the profile.",
    ]) {
      if (!taskClaimDriftIssues.includes(expectedIssue)) {
        fail(
          `Self-test failed: expected task claim drift issue ${JSON.stringify(expectedIssue)}, got ${JSON.stringify(taskClaimDriftIssues)}`,
        );
      }
    }
    const reverseTaskClaimDriftIssues = validateOwnerClaims(
      [
        {
          id: "fixture.profile",
          qntOwners: [],
          runtimeOwners: [],
          verificationOwners: [
            { kind: "qnt-proof", ownerPath: "fixture/proof.qnt" },
            { kind: "focused-mbt", ownerPath: "fixture/parity.test.ts" },
          ],
          taskRefs: [],
        },
      ],
      [
        {
          taskId: "QCORE_STRAY",
          claimKind: "qnt-proof",
          profileIds: ["fixture.profile"],
        },
        {
          taskId: "QMBT_STRAY",
          claimKind: "completed-runtime-parity",
          profileIds: ["fixture.profile"],
        },
      ],
      [
        {
          ownerPath: "fixture/proof.qnt",
          claimKind: "verification-owner:qnt-proof",
          profileIds: ["fixture.profile"],
        },
        {
          ownerPath: "fixture/parity.test.ts",
          claimKind: "verification-owner:focused-mbt",
          profileIds: ["fixture.profile"],
        },
      ],
      {
        unitEvidence: [],
        unitIdentityMbtReplays: [],
        selectedUnitIdentityReplays: [],
        selectedUnitIdentityReplayConsumers: [],
      },
      [],
    );
    for (const expectedIssue of [
      "Task claim QCORE_STRAY includes fixture.profile but the profile taskRefs do not include the task.",
      "Task claim QMBT_STRAY includes fixture.profile but the profile taskRefs do not include the task.",
    ]) {
      if (!reverseTaskClaimDriftIssues.includes(expectedIssue)) {
        fail(
          `Self-test failed: expected reverse task claim drift issue ${JSON.stringify(expectedIssue)}, got ${JSON.stringify(reverseTaskClaimDriftIssues)}`,
        );
      }
    }
    const copiedJoinFieldIssues = validateCoverageInputs({
      root: tempDir,
      collections: {
        collections: [{ id: "srd-5.2.1", policy: { tag: "srd" } }],
      },
      inventory: [
        {
          unitId: "fixture_unit",
          collectionId: "srd-5.2.1",
          sourceRecordPath: "fixture/unit.json",
          provenance: { kind: "srd-5.2.1" },
          rawRecord: {},
        },
      ],
      profiles: [
        {
          id: "fixture.profile",
          profileKind: "equipment",
          qntOwners: [],
          runtimeOwners: [],
          verificationOwners: [],
          obligationIds: ["BATTLE.SAMPLE"],
        },
      ],
      unitClaims: [
        {
          unitId: "fixture_unit",
          collectionId: "srd-5.2.1",
          claim: {
            tag: "supported-profile",
            profileIds: ["fixture.profile"],
            rulesKernelObligations: ["BATTLE.SAMPLE"],
          },
        },
      ],
      unitEvidence: [],
      taskClaims: [],
      authoredSurfaceUnits: [],
      scannedClaims: {
        profileClaims: [],
        unitEvidence: [],
        unitIdentityMbtReplays: [],
        selectedUnitIdentityReplays: [],
        selectedUnitIdentityReplayConsumers: [],
      },
    });
    for (const expectedIssue of [
      "fixture.profile profile row must not copy rules-kernel join field obligationIds; use plans/rules-kernel-coverage/profile-obligations.jsonl.",
      "Unit fixture_unit claim row.claim must not copy rules-kernel join field rulesKernelObligations; use plans/rules-kernel-coverage/profile-obligations.jsonl.",
    ]) {
      if (!copiedJoinFieldIssues.includes(expectedIssue)) {
        fail(
          `Self-test failed: expected copied rules-kernel join field issue ${JSON.stringify(expectedIssue)}, got ${JSON.stringify(copiedJoinFieldIssues)}`,
        );
      }
    }
    const rulesKernelProfileJoin = buildRulesKernelProfileJoin({
      obligations: [],
      profileObligations: [
        {
          profileId: "fixture.profile",
          followUpTaskIds: ["C7-SPELL-PROCEDURE-MBT-EVIDENCE-GATE"],
          reason: "fixture missing rules-kernel mapping",
        },
      ],
      profiles: [
        {
          id: "fixture.profile",
          profileKind: "spell-invocation",
        },
      ],
    });
    const rulesKernelSupportedUnitJoin = buildRulesKernelSupportedUnitJoin(
      [
        {
          unitId: "fixture_unit",
          claim: { tag: "supported-profile" },
          profiles: [
            {
              id: "fixture.profile",
              profileKind: "spell-invocation",
            },
          ],
        },
      ],
      rulesKernelProfileJoin,
    );
    const fixtureProfileGap = rulesKernelSupportedUnitJoin.units[0]?.profiles[0];
    if (
      fixtureProfileGap?.joinStatus !== "unmapped" ||
      fixtureProfileGap.followUpTaskIds?.[0] !==
        "C7-SPELL-PROCEDURE-MBT-EVIDENCE-GATE" ||
      fixtureProfileGap.gapReason !== "fixture missing rules-kernel mapping"
    ) {
      fail(
        `Self-test failed: expected rules-kernel profile gap follow-up ownership, got ${JSON.stringify(fixtureProfileGap)}`,
      );
    }
    const spellProcedureEvidenceGate = buildSpellProcedureMbtEvidenceGate({
      level1FullSupport: {
        scope: { title: "Fixture level 1" },
        rulesKernelSupportedUnitJoin,
      },
      level12FullSupport: {
        scope: { title: "Fixture level 1-2" },
        rulesKernelSupportedUnitJoin: {
          units: [
            {
              unitId: "fixture_spell",
              profiles: [
                {
                  profileId: "fixture.spell",
                  profileKind: "spell-invocation",
                  joinStatus: "covered",
                  obligations: [
                    {
                      obligationId: "BATTLE.FIXTURE.SPELL",
                      runtime: "battle",
                      status: "covered",
                      title: "Fixture spell obligation",
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      rulesKernelMatrix: {
        obligations: [
          {
            id: "BATTLE.FIXTURE.SPELL",
            status: "covered",
            runtime: "battle",
            title: "Fixture spell obligation",
            qntOwners: ["fixture/spell.qnt"],
            parityWitnesses: [
              {
                kind: "runtime-test",
                ownerPath: "fixture/spell.test.ts",
              },
            ],
          },
        ],
        qntOwnerRoles: [
          {
            ownerPath: "fixture/spell.qnt",
            role: "semantic-core",
          },
        ],
      },
    });
    const fixtureSpellScope = spellProcedureEvidenceGate.scopes.find(
      (scope) => scope.scopeId === "level-1-2",
    );
    const fixtureSpellGap = fixtureSpellScope?.openGapRows[0]?.gaps[0];
    if (
      spellProcedureEvidenceGate.status !== "blocked" ||
      fixtureSpellGap?.kind !== "missing-qnt-mbt-witness"
    ) {
      fail(
        `Self-test failed: expected spell procedure gate to expose runtime-test-only QNT/MBT gap, got ${JSON.stringify(spellProcedureEvidenceGate)}`,
      );
    }
    const featureProcedureEvidenceGate = buildFeatureProcedureMbtEvidenceGate({
      level1FullSupport: {
        scope: { title: "Fixture level 1" },
        rulesKernelSupportedUnitJoin: {
          units: [
            {
              unitId: "fixture_feature",
              profiles: [
                {
                  profileId: "unit-feature.fixture",
                  profileKind: "resource",
                  qntOwners: ["fixture/feature-profile.qnt"],
                  joinStatus: "covered",
                  obligations: [
                    {
                      obligationId: "BATTLE.FIXTURE.FEATURE",
                      runtime: "battle",
                      status: "covered",
                      title: "Fixture feature obligation",
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      level12FullSupport: {
        scope: { title: "Fixture level 1-2" },
        rulesKernelSupportedUnitJoin: { units: [] },
      },
      rulesKernelMatrix: {
        obligations: [
          {
            id: "BATTLE.FIXTURE.FEATURE",
            status: "covered",
            runtime: "battle",
            title: "Fixture feature obligation",
            qntOwners: [
              "fixture/feature-profile.qnt",
              "fixture/stale-obligation-owner.qnt",
            ],
            parityWitnesses: [
              {
                kind: "runtime-test",
                ownerPath: "fixture/feature.test.ts",
              },
            ],
          },
        ],
        qntOwnerRoles: [
          {
            ownerPath: "fixture/feature-profile.qnt",
            role: "semantic-core",
          },
          {
            ownerPath: "fixture/stale-obligation-owner.qnt",
            role: "semantic-core",
          },
        ],
      },
    });
    const fixtureFeatureScope = featureProcedureEvidenceGate.scopes.find(
      (scope) => scope.scopeId === "level-1",
    );
    const fixtureFeatureGap = fixtureFeatureScope?.openGapRows[0]?.gaps[0];
    if (
      featureProcedureEvidenceGate.status !== "blocked" ||
      fixtureFeatureGap?.kind !== "missing-qnt-mbt-witness"
    ) {
      fail(
        `Self-test failed: expected feature procedure gate to expose runtime-test-only QNT/MBT gap, got ${JSON.stringify(featureProcedureEvidenceGate)}`,
      );
    }
    const fixtureFeatureOwners =
      fixtureFeatureScope?.rows[0]?.qntOwners.map((owner) => owner.ownerPath) ??
      [];
    if (
      fixtureFeatureOwners.length !== 1 ||
      fixtureFeatureOwners[0] !== "fixture/feature-profile.qnt"
    ) {
      fail(
        `Self-test failed: expected feature procedure gate to emit profile-scoped QNT owner evidence, got ${JSON.stringify(fixtureFeatureOwners)}`,
      );
    }
    const malformedUnitEvidenceIssues = validateCoverageInputs({
      root: tempDir,
      collections: {
        collections: [{ id: "srd-5.2.1", policy: { tag: "srd" } }],
      },
      inventory: [
        {
          unitId: "fixture_unit",
          collectionId: "srd-5.2.1",
          sourceRecordPath: "fixture/unit.json",
          provenance: { kind: "srd-5.2.1" },
          rawRecord: {},
        },
      ],
      profiles: [
        {
          id: "fixture.profile",
          profileKind: "equipment",
          qntOwners: [],
          runtimeOwners: [],
          verificationOwners: [],
        },
      ],
      unitClaims: [
        {
          unitId: "fixture_unit",
          collectionId: "srd-5.2.1",
          claim: {
            tag: "supported-profile",
            profileIds: ["fixture.profile"],
          },
        },
      ],
      unitEvidence: [
        null,
        {
          unitId: "",
          evidence: {
            tag: selectedIdentityMbtEvidenceTag,
            taskId: "B2",
            ownerPath: "fixture/selected.mbt.test.ts",
          },
        },
        {
          unitId: "fixture_unit",
          evidence: {
            tag: selectedIdentityMbtEvidenceTag,
            taskId: "B2",
            ownerPath: "fixture/selected.mbt.test.ts",
            note: "ambiguous optional evidence text",
          },
        },
        {
          unitId: "missing_fixture_unit",
          evidence: {
            tag: selectedIdentityMbtEvidenceTag,
            taskId: "B2",
            ownerPath: "fixture/selected.mbt.test.ts",
          },
        },
        {
          unitId: "fixture_unit",
          evidence: {
            tag: "selected-identity",
            taskId: "B2",
            ownerPath: "fixture/selected.mbt.test.ts",
          },
        },
        {
          unitId: "fixture_unit",
          evidence: {
            tag: deterministicAdmissionProjectionEvidenceTag,
            taskId: "B2",
            ownerPath: "../outside.test.ts",
          },
        },
        {
          unitId: "fixture_unit",
          evidence: {
            tag: selectedIdentityMbtEvidenceTag,
            taskId: "B2",
            ownerPath: "fixture/source.test.ts",
          },
        },
        {
          unitId: "fixture_unit",
          evidence: {
            tag: selectedIdentityMbtEvidenceTag,
            taskId: "B2",
            ownerPath: "fixture/missing-selected.mbt.test.ts",
          },
        },
      ],
      taskClaims: [],
      authoredSurfaceUnits: [],
      scannedClaims: {
        profileClaims: [],
        unitEvidence: [],
        unitIdentityMbtReplays: [],
        selectedUnitIdentityReplays: [],
        selectedUnitIdentityReplayConsumers: [],
      },
    });
    for (const expectedIssue of [
      "Unit evidence row 1 must be an object.",
      "Unit evidence row 2.unitId must be a non-empty string.",
      "Unit evidence row 3.evidence must not include unsupported field note; Unit evidence rows have no optional fields.",
      "Unit evidence references unknown Unit id missing_fixture_unit.",
      "Unit evidence for fixture_unit has unknown tag selected-identity.",
      "Unit evidence for fixture_unit ownerPath must be a repo-relative source path.",
      "Selected identity MBT evidence for fixture_unit ownerPath must be a repo-relative .mbt.test.ts source test path.",
      "Unit evidence for fixture_unit references missing owner fixture/missing-selected.mbt.test.ts.",
    ]) {
      if (!malformedUnitEvidenceIssues.includes(expectedIssue)) {
        fail(
          `Self-test failed: expected malformed Unit evidence issue ${JSON.stringify(expectedIssue)}, got ${JSON.stringify(malformedUnitEvidenceIssues)}`,
        );
      }
    }
    const selectedIdentityHardGateIssues = validateCoverageInputs(
      {
        root: tempDir,
        collections: {
          collections: [{ id: "srd-5.2.1", policy: { tag: "srd" } }],
        },
        inventory: [
          {
            unitId: "fixture_missing_identity",
            collectionId: "srd-5.2.1",
            sourceRecordPath: "fixture/missing-identity.json",
            provenance: { kind: "srd-5.2.1" },
            rawRecord: {},
            executableMechanics: true,
          },
          {
            unitId: "fixture_non_applicable_identity",
            collectionId: "srd-5.2.1",
            sourceRecordPath: "fixture/non-applicable-identity.json",
            provenance: { kind: "srd-5.2.1" },
            rawRecord: {},
            executableMechanics: true,
          },
          {
            unitId: mindSpikeFixture.unitId,
            collectionId: "srd-5.2.1",
            sourceRecordPath: mindSpikeFixture.sourceRecordPath,
            provenance: { kind: "srd-5.2.1" },
            rawRecord: {},
            executableMechanics: true,
          },
        ],
        profiles: [
          {
            id: "fixture.profile",
            profileKind: "equipment",
            qntOwners: [],
            runtimeOwners: [],
            verificationOwners: [],
          },
          {
            id: mindSpikeFixture.profileId,
            profileKind: "spell-invocation",
            qntOwners: [],
            runtimeOwners: [],
            verificationOwners: [],
          },
        ],
        unitClaims: [
          {
            unitId: "fixture_missing_identity",
            collectionId: "srd-5.2.1",
            claim: {
              tag: "supported-profile",
              profileIds: ["fixture.profile"],
            },
          },
          {
            unitId: "fixture_non_applicable_identity",
            collectionId: "srd-5.2.1",
            claim: {
              tag: "profile-subset-supported",
              profileIds: ["fixture.profile"],
              supportedMechanics: ["fixture supported executable subset"],
              deferredMechanics: [
                {
                  mechanic: "fixture outside-runtime portion",
                  battleReadinessClosure: {
                    kind: "outside-battle-runtime",
                    owner: "fixture self-test",
                    reason: "The fixture closed portion has no selected identity replay entrypoint.",
                  },
                },
              ],
              selectedIdentityEvidenceDisposition: {
                tag: "not-applicable",
                owner: "fixture self-test",
                reason: "The fixture closed portion has no selected identity replay entrypoint.",
              },
            },
          },
          {
            unitId: mindSpikeFixture.unitId,
            collectionId: "srd-5.2.1",
            claim: mindSpikeDeferredSelectedIdentityUnit(false).claim,
          },
        ],
        unitEvidence: [],
        taskClaims: [],
        authoredSurfaceUnits: [],
        scannedClaims: {
          profileClaims: [],
          unitEvidence: [],
          unitIdentityMbtReplays: [],
          selectedUnitIdentityReplays: [],
          selectedUnitIdentityReplayConsumers: [],
        },
      },
      { selectedIdentityHardGate: true },
    );
    const missingIdentityExpected =
      "Supported executable Unit fixture_missing_identity has no selected-identity-mbt evidence and no selectedIdentityEvidenceDisposition not-applicable classification.";
    if (!selectedIdentityHardGateIssues.includes(missingIdentityExpected)) {
      fail(
        `Self-test failed: expected selected identity hard-gate issue ${JSON.stringify(missingIdentityExpected)}, got ${JSON.stringify(selectedIdentityHardGateIssues)}`,
      );
    }
    const mindSpikeMissingIdentityExpected =
      `Supported executable Unit ${mindSpikeFixture.unitId} has no selected-identity-mbt evidence and no selectedIdentityEvidenceDisposition not-applicable classification.`;
    if (
      !selectedIdentityHardGateIssues.includes(mindSpikeMissingIdentityExpected)
    ) {
      fail(
        `Self-test failed: expected Mind Spike deferred mechanics disposition to keep the supported subset in the selected identity hard gate, got ${JSON.stringify(selectedIdentityHardGateIssues)}`,
      );
    }
    const nonApplicableBoundaryIssue = selectedIdentityHardGateIssues.find(
      (issue) => issue.includes("fixture_non_applicable_identity"),
    );
    if (nonApplicableBoundaryIssue !== undefined) {
      fail(
        `Self-test failed: expected explicit selected identity non-applicable disposition to satisfy hard gate, got ${JSON.stringify(selectedIdentityHardGateIssues)}`,
      );
    }
    const malformedSelectedIdentityDispositionIssues = validateCoverageInputs({
      root: tempDir,
      collections: {
        collections: [{ id: "srd-5.2.1", policy: { tag: "srd" } }],
      },
      inventory: [
        {
          unitId: "fixture_bad_disposition",
          collectionId: "srd-5.2.1",
          sourceRecordPath: "fixture/bad-disposition.json",
          provenance: { kind: "srd-5.2.1" },
          rawRecord: {},
          executableMechanics: true,
        },
      ],
      profiles: [],
      unitClaims: [
        {
          unitId: "fixture_bad_disposition",
          collectionId: "srd-5.2.1",
          claim: {
            tag: "unsupported-profile",
            selectedIdentityEvidenceDisposition: {
              tag: "not-needed",
              owner: "",
              reason: "",
              note: "ambiguous optional disposition text",
            },
            deferredMechanicsSelectedIdentityDisposition: {
              tag: "not-needed",
              owner: "",
              reason: "",
              note: "ambiguous deferred disposition text",
            },
          },
        },
      ],
      unitEvidence: [],
      taskClaims: [],
      authoredSurfaceUnits: [],
      scannedClaims: {
        profileClaims: [],
        unitEvidence: [],
        unitIdentityMbtReplays: [],
        selectedUnitIdentityReplays: [],
        selectedUnitIdentityReplayConsumers: [],
      },
    });
    for (const expectedIssue of [
      "Unit fixture_bad_disposition selectedIdentityEvidenceDisposition must not include unsupported field note.",
      "Unit fixture_bad_disposition selectedIdentityEvidenceDisposition.tag must be not-applicable.",
      "Unit fixture_bad_disposition selectedIdentityEvidenceDisposition.owner must be a non-empty string.",
      "Unit fixture_bad_disposition selectedIdentityEvidenceDisposition.reason must be a non-empty string.",
      "Unit fixture_bad_disposition selectedIdentityEvidenceDisposition requires a supported-profile or profile-subset-supported claim.",
      "Unit fixture_bad_disposition deferredMechanicsSelectedIdentityDisposition must not include unsupported field note.",
      "Unit fixture_bad_disposition deferredMechanicsSelectedIdentityDisposition.tag must be not-applicable.",
      "Unit fixture_bad_disposition deferredMechanicsSelectedIdentityDisposition.owner must be a non-empty string.",
      "Unit fixture_bad_disposition deferredMechanicsSelectedIdentityDisposition.reason must be a non-empty string.",
      "Unit fixture_bad_disposition must not declare both selectedIdentityEvidenceDisposition and deferredMechanicsSelectedIdentityDisposition.",
      "Unit fixture_bad_disposition deferredMechanicsSelectedIdentityDisposition requires a profile-subset-supported claim.",
    ]) {
      if (!malformedSelectedIdentityDispositionIssues.includes(expectedIssue)) {
        fail(
          `Self-test failed: expected selected identity disposition schema issue ${JSON.stringify(expectedIssue)}, got ${JSON.stringify(malformedSelectedIdentityDispositionIssues)}`,
        );
      }
    }
    const unreviewedLevelThreeSpellIssues = validateSrdUnitInventory({
      rows: [
        {
          id: "fixture:l3-authored-not-installed",
          category: "spell Unit pressure",
          rowKind: "spell-unit-pressure",
          levelBand: "spell-level-3",
          candidateUnitId: "fixture_level_three_spell",
          surface: { state: "current-surface-can-express-source-facts" },
          authoredContent: { state: "authored-record-present" },
          catalogAdmission: { state: "not-installed" },
          finalDisposition: "catalog-only/dead-for-now",
          ownerEvidence: [],
        },
      ],
      recommendedBatches: [],
    });
    const levelThreeReviewExpected =
      "fixture:l3-authored-not-installed is an unreviewed level-3 authored not-installed Spell Unit row but is not classified catalog-authored-review-required.";
    if (!unreviewedLevelThreeSpellIssues.includes(levelThreeReviewExpected)) {
      fail(
        `Self-test failed: expected unreviewed level-3 spell issue ${JSON.stringify(levelThreeReviewExpected)}, got ${JSON.stringify(unreviewedLevelThreeSpellIssues)}`,
      );
    }
    if (
      !hasVariantMagicMechanics({
        id: "fixture_magic_template",
        kind: "weapon_template",
        variants: [{ magic: { mechanics: { family: "passive" } } }],
      })
    ) {
      fail(
        "Self-test failed: expected variant magic mechanics to count as executable mechanics.",
      );
    }
    if (
      !hasExecutableMechanics({
        id: "fixture_magic_template",
        kind: "weapon_template",
        variants: [{ magic: { mechanics: { family: "passive" } } }],
      })
    ) {
      fail(
        "Self-test failed: expected variant magic mechanics to count toward executable mechanics.",
      );
    }
    const policyIssues = validateCollections(
      [
        {
          id: "classic-2024-non-srd-mechanics",
          policy: { tag: "classic-non-srd-mechanics" },
        },
      ],
      [
        {
          unitId: "phb_action_surge",
          collectionId: "classic-2024-non-srd-mechanics",
          syntheticLabel: "Action Surge",
          sourceRecordPath: "fixture/private-pressure.json",
          provenance: { kind: "xphb" },
          rawRecord: {
            id: "phb_action_surge",
            syntheticLabel: "Action Surge",
            canonicalName: "Action Surge",
            provenance: { kind: "xphb" },
            mechanics: { family: "extra_action" },
          },
        },
        {
          unitId: "mycelium_step",
          collectionId: "srd-5.2.1",
          sourceRecordPath: "fixture/srd-overlap.json",
          provenance: { kind: "srd-5.2.1" },
          rawRecord: {
            id: "mycelium_step",
            provenance: { kind: "srd-5.2.1" },
            mechanics: { family: "extra_action" },
          },
        },
      ],
    );
    for (const expectedIssue of [
      "phb_action_surge must use classic-2024-mechanics-source-lane provenance.",
      "phb_action_surge must use fungi-themed synthetic id and label.",
      "phb_action_surge contains protected-expression field canonicalName.",
      "phb_action_surge uses near-canonical protected label/id text: phb.",
      "phb_action_surge duplicates SRD Unit mechanics from mycelium_step.",
    ]) {
      if (!policyIssues.includes(expectedIssue)) {
        fail(
          `Self-test failed: expected Classic non-SRD policy issue ${JSON.stringify(expectedIssue)}, got ${JSON.stringify(policyIssues)}`,
        );
      }
    }
    const completeAuthoredReadiness = authoredReadinessFixture(tempDir);
    if (completeAuthoredReadiness.openBlockerCount !== 0) {
      fail(
        `Self-test failed: expected complete authored readiness fixture to pass, got ${JSON.stringify(completeAuthoredReadiness.blockerRows)}`,
      );
    }
    assertAuthoredReadinessBlocked(
      authoredReadinessFixture(tempDir, {
        omitUnitIds: ["feat_magic_initiate_cleric"],
      }),
      {
        group: "background-origin-feat-refs",
        ownerUnitId: "background_acolyte",
        unitId: "feat_magic_initiate_cleric",
        status: "missing-authored-record",
      },
    );
    assertAuthoredReadinessBlocked(
      authoredReadinessFixture(tempDir, { duplicateAlert: true }),
      {
        group: "background-origin-feat-refs",
        ownerUnitId: "background_criminal",
        unitId: "alert",
        status: "duplicate-catalog-identity",
      },
    );
    assertAuthoredReadinessBlocked(
      authoredReadinessFixture(tempDir, {
        omitUnitIds: ["warlock_pact_magic"],
      }),
      {
        group: "level-scoped-class-feature-grants",
        ownerUnitId: "class_warlock",
        unitId: "warlock_pact_magic",
        status: "missing-authored-record",
      },
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  console.log("Unit profile coverage self-test OK.");
}

module.exports = { runSelfTest };
