#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const defaultArtifactDir =
  "plans/ralph-artifacts/l12-cleanroom-generation";
const allowedLevelBands = new Set([
  "level-1",
  "level-2",
  "spell-level-0",
  "spell-level-1",
]);
const cleanroomDispositions = new Set([
  "executable",
  "no-battle-table-closed",
  "character-sheet-owned",
  "handoff-owned",
  "outside-cleanroom-battle-route-denominator",
]);
const factFamilies = [
  "actionTiming",
  "resourceCost",
  "targetShape",
  "attackSaveCheckShape",
  "damageEffectFacts",
  "durationLifecycle",
  "owners",
  "exactArithmetic",
];
const factFamilySet = new Set(factFamilies);
const factRequirementValues = new Set([
  "required",
  "not-applicable",
  "needs-research",
]);
const routeProofClassifications = new Set([
  "focused-qRoute",
  "focused-qComponentRoute",
  "equivalent-machine-proof",
  "grouped-selected-identity-not-accepted",
  "missing-proof",
]);
const mappingProofStatuses = new Set([
  "candidate-proof-found",
  "missing-proof-join",
  "not-required",
]);

function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${name} requires a value`);
  }
  return value;
}

function repoPath(...parts) {
  return path.join(...parts).split(path.sep).join("/");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function addError(errors, message) {
  errors.push(`l12-cleanroom-generation: ${message}`);
}

function requireArtifact(artifactDir, name, errors) {
  const filePath = path.join(artifactDir, name);
  if (!fs.existsSync(filePath)) {
    addError(errors, `${repoPath(filePath)} is missing.`);
    return undefined;
  }
  try {
    return readJson(filePath);
  } catch (error) {
    addError(errors, `${repoPath(filePath)} is not valid JSON: ${error.message}`);
    return undefined;
  }
}

function validateSourceHashes(root, artifactName, artifact, errors) {
  const sourceHashes = artifact?.sourceHashes;
  if (sourceHashes === undefined || sourceHashes === null) {
    addError(errors, `${artifactName} is missing sourceHashes.`);
    return;
  }
  for (const [sourcePath, expectedHash] of Object.entries(sourceHashes)) {
    if (typeof expectedHash !== "string" || !/^[0-9a-f]{64}$/i.test(expectedHash)) {
      addError(errors, `${artifactName} source hash for ${sourcePath} is not a sha256.`);
      continue;
    }
    const filePath = path.join(root, sourcePath);
    if (!fs.existsSync(filePath)) {
      addError(errors, `${artifactName} source ${sourcePath} is missing.`);
      continue;
    }
    const actualHash = sha256File(filePath);
    if (actualHash !== expectedHash) {
      addError(
        errors,
        `${artifactName} source ${sourcePath} hash is stale: expected ${expectedHash}, got ${actualHash}.`,
      );
    }
  }
}

function validateDenominator(root, denominator, errors) {
  if (denominator?.schema !== "srd-l12-cleanroom-denominator.v1") {
    addError(errors, "srd-l12-denominator.json has the wrong schema.");
    return new Map();
  }
  validateSourceHashes(root, "srd-l12-denominator.json", denominator, errors);
  if (denominator.collectionBoundary?.provenance !== "srd-5.2.1") {
    addError(errors, "denominator collectionBoundary.provenance must be srd-5.2.1.");
  }
  const rows = Array.isArray(denominator.rows) ? denominator.rows : [];
  if (!Array.isArray(denominator.rows)) {
    addError(errors, "denominator rows must be an array.");
  }
  const rowsById = new Map();
  const dispositionCounts = new Map();
  const levelCounts = new Map();
  for (const [index, row] of rows.entries()) {
    const label = `denominator row ${index + 1}`;
    if (typeof row.rowId !== "string" || row.rowId.length === 0) {
      addError(errors, `${label} must have rowId.`);
      continue;
    }
    if (rowsById.has(row.rowId)) {
      addError(errors, `${label} duplicates rowId ${row.rowId}.`);
    }
    rowsById.set(row.rowId, row);
    if (row.collectionId !== "srd-5.2.1" || row.provenance !== "srd-5.2.1") {
      addError(errors, `${label} must be SRD 5.2.1 only.`);
    }
    if (!allowedLevelBands.has(row.levelBand)) {
      addError(errors, `${label} has invalid levelBand ${row.levelBand}.`);
    }
    if (!cleanroomDispositions.has(row.cleanroomDisposition)) {
      addError(errors, `${label} has invalid cleanroomDisposition ${row.cleanroomDisposition}.`);
    } else {
      dispositionCounts.set(
        row.cleanroomDisposition,
        (dispositionCounts.get(row.cleanroomDisposition) ?? 0) + 1,
      );
    }
    levelCounts.set(row.levelBand, (levelCounts.get(row.levelBand) ?? 0) + 1);
  }
  if (denominator.counts?.rows !== rows.length) {
    addError(
      errors,
      `denominator counts.rows is ${denominator.counts?.rows}, expected ${rows.length}.`,
    );
  }
  for (const [disposition, count] of dispositionCounts) {
    if (denominator.counts?.byDisposition?.[disposition] !== count) {
      addError(errors, `denominator byDisposition.${disposition} count is stale.`);
    }
  }
  for (const [levelBand, count] of levelCounts) {
    if (denominator.counts?.byLevelBand?.[levelBand] !== count) {
      addError(errors, `denominator byLevelBand.${levelBand} count is stale.`);
    }
  }
  return rowsById;
}

function validateCapabilityMatrix(root, capability, denominatorRows, errors) {
  if (capability?.schema !== "l12-capability-fact-coverage-matrix.v1") {
    addError(errors, "capability-fact-coverage-matrix.json has the wrong schema.");
    return new Map();
  }
  validateSourceHashes(root, "capability-fact-coverage-matrix.json", capability, errors);
  const families = capability.factFamilies ?? [];
  for (const family of factFamilies) {
    if (!families.includes(family)) {
      addError(errors, `capability fact family ${family} is missing.`);
    }
  }
  const capabilityRows = new Map();
  for (const [index, row] of (capability.rows ?? []).entries()) {
    const label = `capability row ${index + 1}`;
    if (capabilityRows.has(row.rowId)) {
      addError(errors, `${label} duplicates rowId ${row.rowId}.`);
    }
    capabilityRows.set(row.rowId, row);
    const denominatorRow = denominatorRows.get(row.rowId);
    if (denominatorRow === undefined) {
      addError(errors, `${label} references unknown denominator row ${row.rowId}.`);
    } else if (denominatorRow.cleanroomDisposition !== "executable") {
      addError(errors, `${label} references non-executable denominator row ${row.rowId}.`);
    }
    const requirements = row.requirements ?? {};
    for (const family of factFamilies) {
      if (!factRequirementValues.has(requirements[family])) {
        addError(errors, `${label} has invalid or missing requirement ${family}.`);
      }
    }
    for (const key of Object.keys(requirements)) {
      if (!factFamilySet.has(key)) {
        addError(errors, `${label} has non-generic fact key ${key}.`);
      }
    }
  }
  for (const row of denominatorRows.values()) {
    if (
      row.cleanroomDisposition === "executable" &&
      !capabilityRows.has(row.rowId)
    ) {
      addError(errors, `executable denominator row ${row.rowId} has no capability fact row.`);
    }
  }
  return capabilityRows;
}

function validateRouteProofInventory(root, routeProof, options, errors) {
  if (routeProof?.schema !== "l12-route-proof-inventory.v1") {
    addError(errors, "route-proof-inventory.json has the wrong schema.");
    return;
  }
  validateSourceHashes(root, "route-proof-inventory.json", routeProof, errors);
  for (const [index, row] of (routeProof.rows ?? []).entries()) {
    const label = `route-proof row ${index + 1} ${row.driverPath ?? ""}`.trim();
    if (!routeProofClassifications.has(row.proofClassification)) {
      addError(errors, `${label} has invalid proofClassification ${row.proofClassification}.`);
    }
    if (
      row.proofClassification === "grouped-selected-identity-not-accepted" &&
      row.selectedIdentityDriverAccepted !== false
    ) {
      addError(errors, `${label} counts grouped selected identity as accepted evidence.`);
    }
    if (Array.isArray(row.missingConnectors) && row.missingConnectors.length > 0) {
      const hasExplicitBlocker =
        Array.isArray(row.derivabilityBlockers) &&
        row.derivabilityBlockers.length > 0;
      if (options.strictAcceptance || !hasExplicitBlocker) {
        addError(errors, `${label} has missing connector(s): ${row.missingConnectors.join(", ")}.`);
      }
    }
    if (
      options.strictAcceptance &&
      row.proofClassification === "grouped-selected-identity-not-accepted"
    ) {
      addError(errors, `${label} remains grouped selected-identity evidence.`);
    }
    if (options.strictAcceptance && row.proofClassification === "missing-proof") {
      addError(errors, `${label} remains missing proof.`);
    }
  }
}

function validateMapping(root, mapping, denominatorRows, capabilityRows, options, errors) {
  if (mapping?.schema !== "srd-row-generic-fact-map.v1") {
    addError(errors, "srd-row-generic-fact-map.json has the wrong schema.");
    return;
  }
  validateSourceHashes(root, "srd-row-generic-fact-map.json", mapping, errors);
  const mappedRows = new Map();
  for (const [index, row] of (mapping.rows ?? []).entries()) {
    const label = `mapping row ${index + 1}`;
    if (!mappingProofStatuses.has(row.routeProofStatus)) {
      addError(errors, `${label} has invalid routeProofStatus ${row.routeProofStatus}.`);
    }
    if (mappedRows.has(row.rowId)) {
      addError(errors, `${label} duplicates rowId ${row.rowId}.`);
    }
    mappedRows.set(row.rowId, row);
    const denominatorRow = denominatorRows.get(row.rowId);
    if (denominatorRow === undefined) {
      addError(errors, `${label} references unknown denominator row ${row.rowId}.`);
      continue;
    }
    if (row.cleanroomDisposition !== denominatorRow.cleanroomDisposition) {
      addError(errors, `${label} disposition conflicts with denominator ${row.rowId}.`);
    }
    if (denominatorRow.cleanroomDisposition === "executable") {
      if (!capabilityRows.has(row.rowId)) {
        addError(errors, `${label} executable row lacks capability fact row ${row.rowId}.`);
      }
      if (
        options.strictAcceptance &&
        row.routeProofStatus !== "candidate-proof-found"
      ) {
        addError(errors, `${label} executable row ${row.rowId} has ${row.routeProofStatus}.`);
      }
    } else if (row.routeProofStatus !== "not-required") {
      addError(errors, `${label} non-executable row ${row.rowId} requires route proof.`);
    }
  }
  for (const rowId of denominatorRows.keys()) {
    if (!mappedRows.has(rowId)) {
      addError(errors, `denominator row ${rowId} is absent from mapping.`);
    }
  }
}

function validateVerifierSpec(root, verifierSpec, errors) {
  if (verifierSpec?.schema !== "l12-cleanroom-verifier-gate-spec.v1") {
    addError(errors, "verifier-gate-spec.json has the wrong schema.");
    return;
  }
  validateSourceHashes(root, "verifier-gate-spec.json", verifierSpec, errors);
  const gateIds = new Set((verifierSpec.gates ?? []).map((gate) => gate.id));
  for (const gateId of [
    "L12VG-01-DENOMINATOR-SCHEMA-HASH",
    "L12VG-02-CAPABILITY-FACT-COVERAGE",
    "L12VG-03-ROUTE-PROOF-COVERAGE",
    "L12VG-04-MAPPING-JOIN-COVERAGE",
    "L12VG-05-TARGET-REPLAY-EVIDENCE",
  ]) {
    if (!gateIds.has(gateId)) {
      addError(errors, `verifier-gate-spec.json is missing ${gateId}.`);
    }
  }
}

function validateTaskGraph(root, taskGraph, denominatorRows, errors) {
  if (taskGraph?.schema !== "l12-cleanroom-exhaustive-task-graph.v1") {
    addError(errors, "exhaustive-task-graph.json has the wrong schema.");
    return;
  }
  validateSourceHashes(root, "exhaustive-task-graph.json", taskGraph, errors);
  const expectedTaskIds = [
    "L12CEG-01-CHECKER-LANDING-AND-STRICT-GATE",
    "L12CEG-02-L12-ARTIFACT-PACKAGE-INCLUSION",
    "L12CEG-03-SCAFFOLD-L12-CONTRACT",
    "L12CEG-04-TARGET-REPLAY-EVIDENCE-SCHEMA-GATE",
    "L12CEG-05-REPLAY-BATCH-PARTITION-PLAN",
  ];
  const taskIds = (taskGraph.tasks ?? []).map((task) => task.id);
  if (JSON.stringify(taskIds) !== JSON.stringify(expectedTaskIds)) {
    addError(errors, "exhaustive-task-graph.json must contain the five L12CEG preparation tasks in order.");
  }
  const dependencies = new Map(
    (taskGraph.tasks ?? []).map((task) => [task.id, task.dependencies ?? []]),
  );
  const visiting = new Set();
  const visited = new Set();
  function visit(taskId) {
    if (visited.has(taskId)) return;
    if (visiting.has(taskId)) {
      addError(errors, `exhaustive-task-graph.json dependency cycle at ${taskId}.`);
      return;
    }
    visiting.add(taskId);
    for (const dependency of dependencies.get(taskId) ?? []) {
      if (!dependencies.has(dependency)) {
        addError(errors, `exhaustive-task-graph.json ${taskId} depends on unknown ${dependency}.`);
      } else {
        visit(dependency);
      }
    }
    visiting.delete(taskId);
    visited.add(taskId);
  }
  for (const taskId of taskIds) visit(taskId);

  const executableRowIds = new Set(
    [...denominatorRows.values()]
      .filter((row) => row.cleanroomDisposition === "executable")
      .map((row) => row.rowId),
  );
  const seen = new Set();
  for (const [batchIndex, batch] of (taskGraph.replayBatches ?? []).entries()) {
    const context = `exhaustive-task-graph.json replayBatches[${batchIndex}]`;
    if (batch.status !== "planned-not-executed") {
      addError(errors, `${context}.status must be planned-not-executed.`);
    }
    if (!Array.isArray(batch.rowIds) || batch.rowIds.length === 0) {
      addError(errors, `${context}.rowIds must be a non-empty array.`);
      continue;
    }
    for (const rowId of batch.rowIds) {
      if (!executableRowIds.has(rowId)) {
        addError(errors, `${context}.rowIds includes non-executable row ${rowId}.`);
      }
      if (seen.has(rowId)) {
        addError(errors, `${context}.rowIds duplicates executable row ${rowId}.`);
      }
      seen.add(rowId);
    }
    if (
      batch.evidenceStatus !== "pending-target-replay" ||
      batch.acceptanceStatus !== "not-accepted"
    ) {
      addError(errors, `${context} must remain pending and not accepted.`);
    }
  }
  if (seen.size !== executableRowIds.size) {
    addError(
      errors,
      `exhaustive-task-graph.json replay batches cover ${seen.size} executable rows, expected ${executableRowIds.size}.`,
    );
  }

  const executableRowsByUnit = new Map();
  for (const row of denominatorRows.values()) {
    if (row.cleanroomDisposition !== "executable") continue;
    const existing = executableRowsByUnit.get(row.candidateUnitId) ?? [];
    existing.push(row.rowId);
    executableRowsByUnit.set(row.candidateUnitId, existing);
  }
  const unitProofBatches = taskGraph.dirtyCleanroomUnitProofBatches ?? [];
  if (unitProofBatches.length !== executableRowsByUnit.size) {
    addError(
      errors,
      `exhaustive-task-graph.json dirtyCleanroomUnitProofBatches has ${unitProofBatches.length} units, expected ${executableRowsByUnit.size}.`,
    );
  }
  const seenUnitProofIds = new Set();
  for (const [batchIndex, batch] of unitProofBatches.entries()) {
    const context = `exhaustive-task-graph.json dirtyCleanroomUnitProofBatches[${batchIndex}]`;
    if (batch.status !== "planned-not-executed") {
      addError(errors, `${context}.status must be planned-not-executed.`);
    }
    if (batch.dirtyCleanroomStatus !== "pending-latest-dirty-target-check") {
      addError(
        errors,
        `${context}.dirtyCleanroomStatus must be pending-latest-dirty-target-check.`,
      );
    }
    if (!batch.unitId || !executableRowsByUnit.has(batch.unitId)) {
      addError(errors, `${context}.unitId must name an executable Unit.`);
      continue;
    }
    if (seenUnitProofIds.has(batch.unitId)) {
      addError(errors, `${context}.unitId duplicates ${batch.unitId}.`);
    }
    seenUnitProofIds.add(batch.unitId);
    const expectedRowIds = [...executableRowsByUnit.get(batch.unitId)].sort();
    const actualRowIds = [...(batch.rowIds ?? [])].sort();
    if (JSON.stringify(actualRowIds) !== JSON.stringify(expectedRowIds)) {
      addError(
        errors,
        `${context}.rowIds must exactly match executable rows for ${batch.unitId}.`,
      );
    }
    for (const replayBatchId of batch.replayBatchIds ?? []) {
      if (
        !(taskGraph.replayBatches ?? []).some(
          (replayBatch) => replayBatch.batchId === replayBatchId,
        )
      ) {
        addError(errors, `${context}.replayBatchIds references unknown ${replayBatchId}.`);
      }
    }
  }
}

function check(root, artifactDir, options = {}) {
  const errors = [];
  const denominator = requireArtifact(artifactDir, "srd-l12-denominator.json", errors);
  const capability = requireArtifact(
    artifactDir,
    "capability-fact-coverage-matrix.json",
    errors,
  );
  const routeProof = requireArtifact(artifactDir, "route-proof-inventory.json", errors);
  const mapping = requireArtifact(artifactDir, "srd-row-generic-fact-map.json", errors);
  const verifierSpec = requireArtifact(artifactDir, "verifier-gate-spec.json", errors);
  const taskGraph = requireArtifact(artifactDir, "exhaustive-task-graph.json", errors);

  if (errors.length > 0) return errors;

  const denominatorRows = validateDenominator(root, denominator, errors);
  const capabilityRows = validateCapabilityMatrix(
    root,
    capability,
    denominatorRows,
    errors,
  );
  validateRouteProofInventory(root, routeProof, options, errors);
  validateMapping(root, mapping, denominatorRows, capabilityRows, options, errors);
  validateVerifierSpec(root, verifierSpec, errors);
  validateTaskGraph(root, taskGraph, denominatorRows, errors);
  return errors;
}

function writeFixture(root, artifactDir, overrides = {}) {
  const sourcePath = path.join(root, "source.json");
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(sourcePath, "{\"ok\":true}\n");
  const sourceHashes = {
    "source.json": sha256File(sourcePath),
  };
  const denominator = {
    schema: "srd-l12-cleanroom-denominator.v1",
    sourceHashes,
    collectionBoundary: {
      provenance: "srd-5.2.1",
    },
    counts: {
      rows: 2,
      byDisposition: {
        executable: 1,
        "no-battle-table-closed": 1,
      },
      byLevelBand: {
        "level-1": 1,
        "spell-level-1": 1,
      },
    },
    rows: [
      {
        rowId: "row-executable",
        collectionId: "srd-5.2.1",
        provenance: "srd-5.2.1",
        levelBand: "level-1",
        cleanroomDisposition: "executable",
        candidateUnitId: "unit_a",
      },
      {
        rowId: "row-table",
        collectionId: "srd-5.2.1",
        provenance: "srd-5.2.1",
        levelBand: "spell-level-1",
        cleanroomDisposition: "no-battle-table-closed",
        candidateUnitId: "unit_b",
      },
    ],
  };
  const capability = {
    schema: "l12-capability-fact-coverage-matrix.v1",
    sourceHashes,
    factFamilies,
    rows: [
      {
        rowId: "row-executable",
        candidateUnitId: "unit_a",
        profileIds: ["unit.test-profile"],
        requirements: Object.fromEntries(
          factFamilies.map((family) => [family, "required"]),
        ),
      },
    ],
  };
  const routeProof = {
    schema: "l12-route-proof-inventory.v1",
    sourceHashes,
    counts: {},
    rows: [
      {
        driverPath: "driver.mbt.qnt",
        route: "reducer-routed",
        proofClassification: "focused-qRoute",
        selectedIdentityDriverAccepted: true,
        acceptedProjection: "qRoute",
        connectorPaths: ["driver.route.mbt.qnt"],
        missingConnectors: [],
        derivabilityBlockers: [],
      },
    ],
  };
  const mapping = {
    schema: "srd-row-generic-fact-map.v1",
    sourceHashes,
    counts: {},
    rows: [
      {
        rowId: "row-executable",
        candidateUnitId: "unit_a",
        cleanroomDisposition: "executable",
        routeProofStatus: "candidate-proof-found",
        verifierExpectation:
          "require-generic-facts-and-observed-focused-route-proof",
      },
      {
        rowId: "row-table",
        candidateUnitId: "unit_b",
        cleanroomDisposition: "no-battle-table-closed",
        routeProofStatus: "not-required",
        verifierExpectation: "enforce-disposition-no-battle-table-closed",
      },
    ],
  };
  const verifierSpec = {
    schema: "l12-cleanroom-verifier-gate-spec.v1",
    sourceHashes,
    gates: [
      "L12VG-01-DENOMINATOR-SCHEMA-HASH",
      "L12VG-02-CAPABILITY-FACT-COVERAGE",
      "L12VG-03-ROUTE-PROOF-COVERAGE",
      "L12VG-04-MAPPING-JOIN-COVERAGE",
      "L12VG-05-TARGET-REPLAY-EVIDENCE",
    ].map((id) => ({ id })),
  };
  const taskGraph = {
    schema: "l12-cleanroom-exhaustive-task-graph.v1",
    sourceHashes,
    tasks: [
      {
        id: "L12CEG-01-CHECKER-LANDING-AND-STRICT-GATE",
        dependencies: [],
      },
      {
        id: "L12CEG-02-L12-ARTIFACT-PACKAGE-INCLUSION",
        dependencies: ["L12CEG-01-CHECKER-LANDING-AND-STRICT-GATE"],
      },
      {
        id: "L12CEG-03-SCAFFOLD-L12-CONTRACT",
        dependencies: [
          "L12CEG-01-CHECKER-LANDING-AND-STRICT-GATE",
          "L12CEG-02-L12-ARTIFACT-PACKAGE-INCLUSION",
        ],
      },
      {
        id: "L12CEG-04-TARGET-REPLAY-EVIDENCE-SCHEMA-GATE",
        dependencies: [
          "L12CEG-01-CHECKER-LANDING-AND-STRICT-GATE",
          "L12CEG-02-L12-ARTIFACT-PACKAGE-INCLUSION",
          "L12CEG-03-SCAFFOLD-L12-CONTRACT",
        ],
      },
      {
        id: "L12CEG-05-REPLAY-BATCH-PARTITION-PLAN",
        dependencies: [
          "L12CEG-01-CHECKER-LANDING-AND-STRICT-GATE",
          "L12CEG-02-L12-ARTIFACT-PACKAGE-INCLUSION",
          "L12CEG-03-SCAFFOLD-L12-CONTRACT",
          "L12CEG-04-TARGET-REPLAY-EVIDENCE-SCHEMA-GATE",
        ],
      },
    ],
    replayBatches: [
      {
        batchId: "L12CEG-RP-001",
        status: "planned-not-executed",
        evidenceStatus: "pending-target-replay",
        acceptanceStatus: "not-accepted",
        rowIds: ["row-executable"],
      },
    ],
    dirtyCleanroomUnitProofBatches: [
      {
        batchId: "L12CEG-DU-001",
        status: "planned-not-executed",
        dirtyCleanroomStatus: "pending-latest-dirty-target-check",
        unitId: "unit_a",
        rowIds: ["row-executable"],
        replayBatchIds: ["L12CEG-RP-001"],
      },
    ],
  };
  writeJson(
    path.join(artifactDir, "srd-l12-denominator.json"),
    overrides.denominator?.(denominator) ?? denominator,
  );
  writeJson(
    path.join(artifactDir, "capability-fact-coverage-matrix.json"),
    overrides.capability?.(capability) ?? capability,
  );
  writeJson(
    path.join(artifactDir, "route-proof-inventory.json"),
    overrides.routeProof?.(routeProof) ?? routeProof,
  );
  writeJson(
    path.join(artifactDir, "srd-row-generic-fact-map.json"),
    overrides.mapping?.(mapping) ?? mapping,
  );
  writeJson(
    path.join(artifactDir, "verifier-gate-spec.json"),
    overrides.verifierSpec?.(verifierSpec) ?? verifierSpec,
  );
  writeJson(
    path.join(artifactDir, "exhaustive-task-graph.json"),
    overrides.taskGraph?.(taskGraph) ?? taskGraph,
  );
}

function assertSelfTest(name, expected, fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `l12-cleanroom-${name}-`));
  const artifactDir = path.join(root, "artifacts");
  writeFixture(root, artifactDir, fn);
  const errors = check(root, artifactDir, {
    strictAcceptance: name.includes("strict"),
  });
  const passed = errors.length === 0;
  if (passed !== expected) {
    throw new Error(
      `${name} expected ${expected ? "pass" : "fail"}, got ${passed ? "pass" : "fail"}:\n${errors.join("\n")}`,
    );
  }
}

function runSelfTest() {
  assertSelfTest("valid", true);
  assertSelfTest("stale-hash", false, {
    denominator: (denominator) => ({
      ...denominator,
      sourceHashes: { "source.json": "0".repeat(64) },
    }),
  });
  assertSelfTest("non-srd-row", false, {
    denominator: (denominator) => ({
      ...denominator,
      rows: [
        {
          ...denominator.rows[0],
          collectionId: "phb-plus",
          provenance: "phb-plus",
        },
        denominator.rows[1],
      ],
    }),
  });
  assertSelfTest("missing-capability-fact", false, {
    capability: (capability) => ({
      ...capability,
      rows: [],
    }),
  });
  assertSelfTest("non-generic-fact-key", false, {
    capability: (capability) => ({
      ...capability,
      rows: [
        {
          ...capability.rows[0],
          requirements: {
            ...capability.rows[0].requirements,
            magic_missile: "required",
          },
        },
      ],
    }),
  });
  assertSelfTest("grouped-selected-identity-accepted", false, {
    routeProof: (routeProof) => ({
      ...routeProof,
      rows: [
        {
          ...routeProof.rows[0],
          proofClassification: "grouped-selected-identity-not-accepted",
          selectedIdentityDriverAccepted: true,
        },
      ],
    }),
  });
  assertSelfTest("dropped-mapping-row", false, {
    mapping: (mapping) => ({
      ...mapping,
      rows: [mapping.rows[0]],
    }),
  });
  assertSelfTest("strict-missing-proof", false, {
    mapping: (mapping) => ({
      ...mapping,
      rows: [
        {
          ...mapping.rows[0],
          routeProofStatus: "missing-proof-join",
        },
        mapping.rows[1],
      ],
    }),
  });
  console.log("l12 cleanroom generation checker self-test OK.");
}

function main() {
  if (process.argv.includes("--self-test")) {
    runSelfTest();
    return;
  }
  const artifactDir = path.resolve(
    repoRoot,
    argValue("--artifact-dir") ?? defaultArtifactDir,
  );
  const strictAcceptance = process.argv.includes("--strict-acceptance");
  const errors = check(repoRoot, artifactDir, { strictAcceptance });
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
    return;
  }
  console.log(
    `l12 cleanroom generation gate passed${strictAcceptance ? " in strict acceptance mode" : ""}.`,
  );
}

main();
