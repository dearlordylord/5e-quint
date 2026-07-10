#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const defaultScopePath =
  "plans/ralph-artifacts/l12-cleanroom-ice-knife-pilot/unit-readiness-scope.json";
const scopeArgument = process.argv.indexOf("--scope");
const scopePath =
  scopeArgument === -1 ? defaultScopePath : process.argv[scopeArgument + 1];
const write = process.argv.includes("--write");
const selfTest = process.argv.includes("--self-test");

function repoPath(relativePath) {
  return path.join(root, relativePath);
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stable(value[key])]),
    );
  }
  return value;
}

function contentSha256(value) {
  const { contentSha256: _ignored, ...content } = value;
  return crypto
    .createHash("sha256")
    .update(`${JSON.stringify(stable(content))}\n`)
    .digest("hex");
}

function jsonSha256(value) {
  return crypto
    .createHash("sha256")
    .update(`${JSON.stringify(stable(value))}\n`)
    .digest("hex");
}

function verificationReceiptSha256(evidence) {
  const {
    stdoutSha256: _stdout,
    stderrSha256: _stderr,
    combinedOutputSha256: _combined,
    ...receipt
  } = evidence ?? {};
  return jsonSha256(receipt);
}

function sha256File(relativePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(repoPath(relativePath)))
    .digest("hex");
}

function issue(issues, code, message, details = {}) {
  issues.push({ code, message, ...details });
}

function readJson(relativePath, issues, label = relativePath) {
  if (typeof relativePath !== "string" || relativePath.trim() === "") {
    issue(
      issues,
      "source-scope",
      `${label} is not a non-empty repository path.`,
    );
    return undefined;
  }
  if (!fs.existsSync(repoPath(relativePath))) {
    issue(issues, "source-scope", `${label} is unavailable: ${relativePath}.`, {
      path: relativePath,
    });
    return undefined;
  }
  try {
    return JSON.parse(fs.readFileSync(repoPath(relativePath), "utf8"));
  } catch (error) {
    issue(
      issues,
      "source-scope",
      `${label} is not valid JSON: ${relativePath}.`,
      { path: relativePath, error: String(error) },
    );
    return undefined;
  }
}

function readJsonl(relativePath, issues, label) {
  if (!fs.existsSync(repoPath(relativePath))) {
    issue(issues, "source-scope", `${label} is unavailable: ${relativePath}.`, {
      path: relativePath,
    });
    return [];
  }
  const rows = [];
  for (const [lineNumber, line] of fs
    .readFileSync(repoPath(relativePath), "utf8")
    .split("\n")
    .entries()) {
    if (line.trim() === "") continue;
    try {
      rows.push(JSON.parse(line));
    } catch (error) {
      issue(
        issues,
        "source-scope",
        `${label} has invalid JSON at line ${lineNumber + 1}.`,
        { path: relativePath },
      );
    }
  }
  return rows;
}

function validateSelection(scope, issues) {
  const selection = scope?.scope;
  const unitIds = selection?.unitIds;
  if (selection?.kind !== "single-unit") {
    issue(
      issues,
      "scope-single-unit",
      "experiment scope must declare kind single-unit.",
    );
  }
  if (selection?.fullCorpus !== false) {
    issue(
      issues,
      "scope-full-corpus",
      "single-Unit scope must explicitly declare fullCorpus false.",
    );
  }
  if (!Array.isArray(unitIds) || unitIds.length === 0) {
    issue(
      issues,
      "scope-empty",
      "single-Unit selection must contain one Unit id.",
    );
    return undefined;
  }
  const duplicates = unitIds.filter(
    (unitId, index) => unitIds.indexOf(unitId) !== index,
  );
  if (duplicates.length > 0) {
    issue(
      issues,
      "scope-duplicate",
      "single-Unit selection contains duplicate Unit ids.",
      { unitIds: [...new Set(duplicates)] },
    );
  }
  if (unitIds.length !== 1) {
    issue(
      issues,
      "scope-cardinality",
      "single-Unit selection must contain exactly one Unit id.",
      { unitIds },
    );
  }
  if (
    unitIds.some((unitId) => typeof unitId !== "string" || unitId.trim() === "")
  ) {
    issue(
      issues,
      "scope-invalid-unit",
      "single-Unit selection contains an empty or non-string Unit id.",
    );
  }
  return typeof unitIds[0] === "string" ? unitIds[0] : undefined;
}

function validateDenominatorRows(rows, unitId, issues, accounting = {}) {
  if (!Array.isArray(rows)) {
    issue(
      issues,
      "accounting-rows",
      "the L1-2 denominator does not expose rows.",
    );
    return [];
  }
  const selected = rows.filter((row) => row?.candidateUnitId === unitId);
  const rowIds = selected.map((row) => row.rowId);
  const duplicates = rowIds.filter(
    (rowId, index) => rowIds.indexOf(rowId) !== index,
  );
  if (duplicates.length > 0) {
    issue(
      issues,
      "accounting-row-duplicate",
      "Unit accounting rows are assigned more than once.",
      { rowIds: [...new Set(duplicates)] },
    );
  }
  if (selected.length !== accounting.expectedRowCount) {
    issue(
      issues,
      "accounting-row-cardinality",
      "the declared Unit does not account for the scope-declared number of denominator rows.",
      {
        unitId,
        rowCount: selected.length,
        expectedRowCount: accounting.expectedRowCount,
      },
    );
  }
  const expectedClasses = new Set(accounting.expectedOwnerKeys ?? []);
  if (expectedClasses.size === 0)
    issue(
      issues,
      "accounting-policy",
      "scope must declare expected accounting owners for the selected Unit.",
    );
  const rowOwnerKey = (row) =>
    row.accountingOwner ??
    row.className ??
    row.rowId
      ?.match(/:classes\/([^:]+)/)?.[1]
      ?.replace(/(^|-)([a-z])/g, (_match, _separator, letter) =>
        letter.toUpperCase(),
      );
  const actualClasses = new Set(selected.map(rowOwnerKey).filter(Boolean));
  for (const className of expectedClasses) {
    if (!actualClasses.has(className)) {
      issue(
        issues,
        "accounting-row-missing",
        `the ${className} denominator row is missing or assigned elsewhere.`,
        { className },
      );
    }
  }
  for (const row of selected) {
    if (row.collectionId !== "srd-5.2.1" || row.provenance !== "srd-5.2.1") {
      issue(
        issues,
        "accounting-row-provenance",
        `accounting row ${row.rowId} has contradictory collection provenance.`,
      );
    }
    if (
      row.unitProfileDisposition !== "supported-profile" ||
      row.cleanroomDisposition !== "executable" ||
      row.executableMechanics !== true
    ) {
      issue(
        issues,
        "accounting-row-support",
        `accounting row ${row.rowId} is not admitted as an executable supported-profile row.`,
      );
    }
  }
  return selected;
}

function validateRawAnchor(calibration, issues) {
  const anchor = calibration?.scope?.rawAnchor;
  if (typeof anchor !== "string" || !anchor.includes("#")) {
    issue(
      issues,
      "raw-anchor",
      "calibration does not provide an exact RAW anchor.",
    );
    return;
  }
  const separator = anchor.lastIndexOf("#");
  const rawPath = anchor.slice(0, separator);
  const heading = anchor.slice(separator + 1);
  if (!fs.existsSync(repoPath(rawPath))) {
    issue(issues, "raw-anchor", `RAW anchor file is unavailable: ${rawPath}.`, {
      path: rawPath,
    });
    return;
  }
  const raw = fs.readFileSync(repoPath(rawPath), "utf8");
  if (
    !new RegExp(
      `^## ${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      "m",
    ).test(raw)
  ) {
    issue(issues, "raw-anchor", `RAW heading is not present: ${anchor}.`, {
      anchor,
    });
  }
}

function validateSemanticJoins(
  calibration,
  profileObligations,
  obligations,
  ownerRoles,
  issues,
) {
  const profileId = calibration?.scope?.profileId;
  const expected =
    profileObligations.find((row) => row.profileId === profileId)
      ?.obligationIds ?? [];
  const actual = calibration?.supportedProfileObligationIds ?? [];
  if (
    JSON.stringify([...actual].sort()) !== JSON.stringify([...expected].sort())
  ) {
    issue(
      issues,
      "obligation-join",
      "supported profile does not join its registered semantic obligations exactly.",
      { profileId },
    );
  }
  const rows = calibration?.obligationCalibrations;
  if (!Array.isArray(rows)) {
    issue(
      issues,
      "obligation-calibration",
      "source calibration has no obligation calibration rows.",
    );
    return [];
  }
  const seen = new Set();
  for (const row of rows) {
    if (seen.has(row.obligationId))
      issue(
        issues,
        "obligation-duplicate",
        `obligation ${row.obligationId} is calibrated more than once.`,
      );
    seen.add(row.obligationId);
    if (!expected.includes(row.obligationId))
      issue(
        issues,
        "obligation-join",
        `obligation ${row.obligationId} is not registered for profile ${profileId}.`,
      );
    const registered = obligations.find(
      (candidate) => candidate.id === row.obligationId,
    );
    if (!registered) {
      issue(
        issues,
        "obligation-missing",
        `obligation ${row.obligationId} is not registered.`,
      );
      continue;
    }
    if (row.calibrationResult !== "exact-current-executable")
      issue(
        issues,
        "calibration-result",
        `obligation ${row.obligationId} is not exactly calibrated.`,
      );
    const owners = new Set((row.qntOwners ?? []).map((owner) => owner.path));
    for (const ownerPath of registered.qntOwners ?? []) {
      const owner = row.qntOwners?.find(
        (candidate) => candidate.path === ownerPath,
      );
      if (!owner)
        issue(
          issues,
          "qnt-owner",
          `obligation ${row.obligationId} is missing registered QNT owner ${ownerPath}.`,
        );
      else {
        if (
          ownerRoles.find((candidate) => candidate.ownerPath === ownerPath)
            ?.role !== owner.role
        )
          issue(
            issues,
            "qnt-owner-role",
            `QNT owner ${ownerPath} has no current registered role.`,
          );
        if (!fs.existsSync(repoPath(ownerPath)))
          issue(
            issues,
            "qnt-owner-missing",
            `calibrated QNT owner is unavailable: ${ownerPath}.`,
            { path: ownerPath },
          );
        else if (owner.sha256 !== sha256File(ownerPath))
          issue(
            issues,
            "qnt-owner-hash",
            `calibrated QNT owner hash is stale: ${ownerPath}.`,
            { path: ownerPath },
          );
      }
    }
    for (const ownerPath of owners) {
      if (!(registered.qntOwners ?? []).includes(ownerPath)) {
        issue(
          issues,
          "qnt-owner",
          `obligation ${row.obligationId} contains unregistered QNT owner ${ownerPath}.`,
        );
        const owner = row.qntOwners?.find(
          (candidate) => candidate.path === ownerPath,
        );
        if (!fs.existsSync(repoPath(ownerPath)))
          issue(
            issues,
            "qnt-owner-missing",
            `calibrated QNT owner is unavailable: ${ownerPath}.`,
            { path: ownerPath },
          );
        else if (owner?.sha256 !== sha256File(ownerPath))
          issue(
            issues,
            "qnt-owner-hash",
            `calibrated QNT owner hash is stale: ${ownerPath}.`,
            { path: ownerPath },
          );
      }
    }
  }
  if (seen.size !== expected.length)
    issue(
      issues,
      "obligation-join",
      "obligation calibrations do not cover every registered profile obligation.",
    );
  return rows;
}

function qntActions(relativePath) {
  if (!fs.existsSync(repoPath(relativePath))) return [];
  const source = fs.readFileSync(repoPath(relativePath), "utf8");
  const step = source.match(/action\s+step\s*=\s*any\s*\{([\s\S]*?)\n\s*\}/);
  return step === null
    ? []
    : [...step[1].matchAll(/\b(do[A-Z][A-Za-z0-9_]*)\b/g)]
        .map((match) => match[1])
        .filter((action, index, all) => all.indexOf(action) === index)
        .sort();
}

function validateDriver(calibration, branchInventory, issues) {
  const driverPath = calibration?.qntBranchDiscovery?.driverPath;
  const branchRows = calibration?.branchCalibrations ?? [];
  const selectedActions =
    calibration?.qntBranchDiscovery?.selectedActions ?? [];
  if (selectedActions.length === 0)
    issue(
      issues,
      "exact-actions",
      "calibration does not select any direct MBT branch actions.",
    );
  if (new Set(selectedActions).size !== selectedActions.length)
    issue(
      issues,
      "exact-actions",
      "calibration selects a direct MBT branch action more than once.",
    );
  if (typeof driverPath !== "string" || !fs.existsSync(repoPath(driverPath))) {
    issue(
      issues,
      "driver-missing",
      `selected QNT driver is unavailable: ${driverPath}.`,
      { path: driverPath },
    );
    return { driverPath, selectedActions, branchRows };
  }
  const discovered = new Set(qntActions(driverPath));
  for (const action of selectedActions) {
    if (!discovered.has(action))
      issue(
        issues,
        "driver-selection",
        `selected driver does not contain calibrated action ${action}.`,
        { driverPath, action },
      );
  }
  if (branchRows.length !== selectedActions.length)
    issue(
      issues,
      "branch-cardinality",
      "branch calibration is not one row per selected action.",
    );
  const inventoryRows = (branchInventory?.branchObligations ?? []).filter(
    (row) => row.driverPath === driverPath,
  );
  for (const action of selectedActions) {
    const branch = branchRows.find((row) => row.branchAction === action);
    if (!branch) {
      issue(
        issues,
        "branch-missing",
        `selected action ${action} has no calibration row.`,
      );
      continue;
    }
    const expectedObligationIds = [
      ...(calibration?.supportedProfileObligationIds ?? []),
    ].sort();
    if (
      JSON.stringify([...(branch.calibratedObligationIds ?? [])].sort()) !==
      JSON.stringify(expectedObligationIds)
    )
      issue(
        issues,
        "branch-obligation-join",
        `branch ${action} does not join every selected semantic obligation exactly once.`,
        { action },
      );
    if (branch.branchId !== `${driverPath}#step:${action}`)
      issue(
        issues,
        "branch-identity",
        `branch ${action} has a stale calibration identity.`,
        { action },
      );
    const production = branch.productionTypeScript;
    const requiredProductionFields = [
      "harnessPath",
      "harnessEntrypoint",
      "productionEntrypointPath",
      "productionEntrypoint",
      "productionProjectionPath",
      "productionProjection",
    ];
    for (const field of requiredProductionFields)
      if (
        typeof production?.[field] !== "string" ||
        production[field].trim() === ""
      )
        issue(
          issues,
          "production-replay",
          `branch ${action} is missing production replay evidence ${field}.`,
          { action, field },
        );
    for (const field of [
      "productionEntrypointPath",
      "productionProjectionPath",
    ])
      if (
        typeof production?.[field] === "string" &&
        !fs.existsSync(repoPath(production[field]))
      )
        issue(
          issues,
          "production-replay",
          `branch ${action} production replay source is unavailable: ${production[field]}.`,
          { action, path: production[field] },
        );
    if (
      typeof production?.productionEntrypointPath === "string" &&
      fs.existsSync(repoPath(production.productionEntrypointPath)) &&
      production.productionEntrypointSha256 !==
        sha256File(production.productionEntrypointPath)
    )
      issue(
        issues,
        "production-replay",
        `branch ${action} production entrypoint hash is stale.`,
        { action },
      );
    if (
      typeof production?.productionProjectionPath === "string" &&
      fs.existsSync(repoPath(production.productionProjectionPath)) &&
      production.productionProjectionSha256 !==
        sha256File(production.productionProjectionPath)
    )
      issue(
        issues,
        "production-replay",
        `branch ${action} production projection hash is stale.`,
        { action },
      );
    const dispatch = production?.productionDispatchEvidence;
    if (
      dispatch?.mode !== "registered-production-dispatch-chain" ||
      dispatch?.entrypoint !== production?.productionEntrypoint ||
      dispatch?.projection !== production?.productionProjection
    )
      issue(
        issues,
        "production-replay",
        `branch ${action} has incomplete production dispatch evidence.`,
        { action },
      );
    if (branch.qntFileSha256 !== sha256File(driverPath))
      issue(issues, "hash-stale", `branch ${action} has a stale QNT hash.`);
    if (
      branch.qntReplay?.actionTaken !== action ||
      branch.qntReplay?.observationMode !== "deterministic-qnt-step-action"
    )
      issue(
        issues,
        "replayability",
        `branch ${action} has no exact replay observation.`,
      );
    if (
      calibration?.qntBranchDiscovery?.deterministicReplayActions?.[
        branch.qntReplay?.stepAction
      ] !== action
    )
      issue(
        issues,
        "replayability",
        `branch ${action} is not linked to its registered deterministic replay action.`,
      );
    if (
      branch.verificationEvidenceSha256 !==
      verificationReceiptSha256(calibration.verificationEvidence)
    )
      issue(
        issues,
        "calibration-replay",
        `branch ${action} has stale verification evidence.`,
      );
    const inventoryMatches = inventoryRows.filter(
      (row) => row.branchAction === action && row.scope?.tag !== "out-of-scope",
    );
    if (inventoryMatches.length !== 1)
      issue(
        issues,
        "branch-inventory",
        `branch ${action} is not present exactly once in the in-scope branch inventory.`,
        { count: inventoryMatches.length },
      );
  }
  const evidence = calibration.verificationEvidence;
  if (
    evidence?.result !== "passed" ||
    JSON.stringify([...(evidence?.branchActions ?? [])].sort()) !==
      JSON.stringify([...selectedActions].sort())
  )
    issue(
      issues,
      "calibration-replay",
      "calibration evidence does not replay every selected action.",
    );
  return { driverPath, selectedActions, branchRows };
}

function relativeImportTargets(relativePath) {
  if (!fs.existsSync(repoPath(relativePath))) return [];
  const source = fs.readFileSync(repoPath(relativePath), "utf8");
  return [...source.matchAll(/^\s*(?:import|export)\b.*?\bfrom\s+"([^"]+)"/gm)]
    .map((match) => match[1])
    .filter(
      (importPath) => importPath.startsWith(".") || importPath.startsWith("/"),
    )
    .map((importPath) =>
      path.posix.normalize(
        `${path.posix.join(path.posix.dirname(relativePath), importPath)}.qnt`,
      ),
    );
}

function syncSourcePaths(syncScriptPath, issues) {
  const result = spawnSync(process.execPath, [syncScriptPath, "--dry-run"], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    issue(
      issues,
      "cleanroom-sync",
      "cleanroom sync could not enumerate its allowlist.",
      { stderr: result.stderr },
    );
    return new Set();
  }
  return new Set(
    (result.stdout ?? "").split("\n").flatMap((line) => {
      const match = line.match(/^(.+?) -> cleanroom-input\//);
      return match ? [match[1]] : [];
    }),
  );
}

function collectQntClosure(
  seedRecords,
  syncScriptPath,
  issues,
  allowedOverride,
) {
  const files = new Map();
  const edges = [];
  const visiting = new Set();
  function visit(relativePath, roles, obligationIds) {
    if (typeof relativePath !== "string" || relativePath.trim() === "") {
      issue(issues, "qnt-file-missing", "a required QNT path is empty.");
      return;
    }
    const existing = files.get(relativePath);
    if (existing) {
      existing.roles = [...new Set([...existing.roles, ...roles])].sort();
      existing.obligationIds = [
        ...new Set([...existing.obligationIds, ...obligationIds]),
      ].sort();
      return;
    }
    if (!fs.existsSync(repoPath(relativePath))) {
      issue(
        issues,
        "qnt-file-missing",
        `required QNT file is unavailable: ${relativePath}.`,
        { path: relativePath },
      );
      return;
    }
    files.set(relativePath, {
      path: relativePath,
      roles: [...new Set(roles)].sort(),
      obligationIds: [...new Set(obligationIds)].sort(),
      imports: [],
    });
    if (visiting.has(relativePath)) return;
    visiting.add(relativePath);
    for (const target of relativeImportTargets(relativePath)) {
      files.get(relativePath).imports.push(target);
      edges.push({ from: relativePath, to: target });
      visit(target, ["import-closure"], []);
    }
    files.get(relativePath).imports.sort();
    visiting.delete(relativePath);
  }
  for (const seed of seedRecords)
    visit(seed.path, [seed.role], seed.obligationIds ?? []);
  const allowed = allowedOverride ?? syncSourcePaths(syncScriptPath, issues);
  for (const relativePath of files.keys()) {
    if (!allowed.has(relativePath))
      issue(
        issues,
        "cleanroom-import",
        `required QNT file is not copied by cleanroom sync: ${relativePath}.`,
        { path: relativePath },
      );
  }
  return {
    files: [...files.values()].sort((left, right) =>
      left.path.localeCompare(right.path),
    ),
    edges: edges.sort((left, right) =>
      `${left.from}:${left.to}`.localeCompare(`${right.from}:${right.to}`),
    ),
  };
}

function buildPrerequisiteOrder(files, importEdges, architectureEdges, issues) {
  const dependencies = new Map(files.map((file) => [file.path, new Set()]));
  for (const edge of importEdges) {
    if (!dependencies.has(edge.from) || !dependencies.has(edge.to)) continue;
    dependencies.get(edge.from).add(edge.to);
  }
  for (const edge of architectureEdges) {
    if (!dependencies.has(edge.from) || !dependencies.has(edge.to)) {
      issue(
        issues,
        "architecture-order",
        `architecture prerequisite edge references an unavailable QNT file: ${edge.from} -> ${edge.to}.`,
        edge,
      );
      continue;
    }
    dependencies.get(edge.to).add(edge.from);
  }
  const order = [];
  const visiting = new Set();
  const visited = new Set();
  function append(relativePath) {
    if (visited.has(relativePath)) return;
    if (visiting.has(relativePath)) {
      issue(
        issues,
        "architecture-order",
        `prerequisite dependency cycle includes ${relativePath}.`,
        { path: relativePath },
      );
      return;
    }
    visiting.add(relativePath);
    for (const dependency of [...(dependencies.get(relativePath) ?? [])].sort())
      append(dependency);
    visiting.delete(relativePath);
    visited.add(relativePath);
    order.push(relativePath);
  }
  for (const file of files) append(file.path);
  return order;
}

function cleanroomProjectionIssues(value) {
  const issues = [];
  function walk(node, location) {
    if (Array.isArray(node))
      return node.forEach((entry, index) =>
        walk(entry, `${location}[${index}]`),
      );
    if (node !== null && typeof node === "object")
      return Object.entries(node).forEach(([key, entry]) => {
        if (/(typescript|surface|production|calibration)/i.test(key))
          issue(
            issues,
            "projection-contamination",
            `cleanroom projection contains forbidden field ${location}.${key}.`,
          );
        walk(entry, `${location}.${key}`);
      });
    if (
      typeof node === "string" &&
      (/\.tsx?$/.test(node) || node.includes("packages/surface/"))
    )
      issue(
        issues,
        "projection-contamination",
        `cleanroom projection contains forbidden source path at ${location}.`,
        { value: node },
      );
  }
  walk(value, "$projection");
  return issues;
}

function validateCalibrationHashes(calibration, issues) {
  for (const [relativePath, expectedHash] of Object.entries(
    calibration?.sourceHashes ?? {},
  )) {
    if (!fs.existsSync(repoPath(relativePath)))
      issue(
        issues,
        "calibration-missing",
        `Task 1 calibration source is unavailable: ${relativePath}.`,
        { path: relativePath },
      );
    else if (sha256File(relativePath) !== expectedHash)
      issue(
        issues,
        "calibration-stale",
        `Task 1 calibration hash is stale for ${relativePath}.`,
        { path: relativePath },
      );
  }
}

function selectApplicableRouteConnectors(
  selectedRoute,
  scope,
  calibration,
  selectedActions,
  selectedObligationIds,
  issues,
) {
  const candidates = selectedRoute?.connectorPaths ?? [];
  const records = scope?.connectorApplicability ?? [];
  const recordsByPath = new Map();
  for (const record of records) {
    if (recordsByPath.has(record.path))
      issue(
        issues,
        "connector-applicability",
        `connector applicability is declared more than once for ${record.path}.`,
        { path: record.path },
      );
    recordsByPath.set(record.path, record);
  }
  const decisions = new Map(
    (calibration?.obligationFamilyDecisions ?? []).map((decision) => [
      decision.family,
      decision,
    ]),
  );
  const selected = [];
  const coveredActions = new Set();
  for (const connectorPath of candidates) {
    const record = recordsByPath.get(connectorPath);
    if (!record) {
      issue(
        issues,
        "connector-applicability",
        `connector ${connectorPath} has no supported-shape applicability join.`,
        { path: connectorPath },
      );
      continue;
    }
    const branchActions = record.branchActions ?? [];
    const obligationIds = record.obligationIds ?? [];
    if (record.family === null) {
      if (branchActions.length !== 0 || obligationIds.length !== 0)
        issue(
          issues,
          "connector-applicability",
          `unsupported connector ${connectorPath} carries an action or obligation join.`,
          { path: connectorPath },
        );
      continue;
    }
    const decision = decisions.get(record.family);
    if (!decision) {
      issue(
        issues,
        "connector-applicability",
        `connector ${connectorPath} names an unregistered supported-shape family ${record.family}.`,
        { path: connectorPath, family: record.family },
      );
      continue;
    }
    if (decision.applicability !== "applicable") {
      issue(
        issues,
        "connector-applicability",
        `connector ${connectorPath} is joined to a non-applicable family ${record.family}.`,
        { path: connectorPath, family: record.family },
      );
      continue;
    }
    if (
      JSON.stringify([...obligationIds].sort()) !==
      JSON.stringify([...(decision.obligationIds ?? [])].sort())
    )
      issue(
        issues,
        "connector-applicability",
        `connector ${connectorPath} has an obligation join different from family ${record.family}.`,
        { path: connectorPath, family: record.family },
      );
    if (branchActions.length === 0)
      issue(
        issues,
        "connector-applicability",
        `applicable connector ${connectorPath} has no direct branch-action join.`,
        { path: connectorPath },
      );
    for (const action of branchActions) {
      if (!selectedActions.includes(action))
        issue(
          issues,
          "connector-applicability",
          `connector ${connectorPath} names an unselected branch action ${action}.`,
          { path: connectorPath, action },
        );
      coveredActions.add(action);
    }
    for (const obligationId of obligationIds) {
      if (!selectedObligationIds.includes(obligationId))
        issue(
          issues,
          "connector-applicability",
          `connector ${connectorPath} names an unselected obligation ${obligationId}.`,
          { path: connectorPath, obligationId },
        );
    }
    selected.push({
      path: connectorPath,
      kind: "route",
      family: record.family,
    });
  }
  for (const action of selectedActions)
    if (!coveredActions.has(action))
      issue(
        issues,
        "connector-applicability",
        `no applicable route connector joins direct branch action ${action}.`,
        { action },
      );
  for (const record of records)
    if (!candidates.includes(record.path))
      issue(
        issues,
        "connector-applicability",
        `connector applicability names a path not offered by the selected driver: ${record.path}.`,
        { path: record.path },
      );
  return selected;
}

function validateFamilyDispositions(
  calibration,
  scope,
  obligationRows,
  selectedConnectors,
  issues,
) {
  const decisions = calibration?.obligationFamilyDecisions ?? [];
  const declarations = scope?.familyDispositions;
  if (!Array.isArray(declarations)) {
    issue(
      issues,
      "family-disposition",
      "scope must register a disposition for every calibrated obligation family.",
    );
    return [];
  }
  const byFamily = new Map();
  for (const declaration of declarations) {
    if (byFamily.has(declaration.family))
      issue(
        issues,
        "family-disposition",
        `family ${declaration.family} has more than one disposition.`,
      );
    byFamily.set(declaration.family, declaration);
  }
  const decisionFamilies = new Set(
    decisions.map((decision) => decision.family),
  );
  for (const declaration of declarations)
    if (!decisionFamilies.has(declaration.family))
      issue(
        issues,
        "family-disposition",
        `family disposition names an unregistered family ${declaration.family}.`,
      );

  const applicableOwnersByObligation = new Map(
    obligationRows.map((row) => [
      row.obligationId,
      new Set(
        (row.qntOwners ?? [])
          .filter((owner) => owner.applicability === "applicable")
          .map((owner) => owner.path),
      ),
    ]),
  );
  const selectedByPath = new Map(
    selectedConnectors.map((connector) => [connector.path, connector]),
  );
  const ownerSeeds = [];
  for (const decision of decisions) {
    const declaration = byFamily.get(decision.family);
    if (!declaration) {
      issue(
        issues,
        "family-disposition",
        `calibrated family ${decision.family} has no readiness disposition.`,
        { family: decision.family },
      );
      continue;
    }
    const declarationObligations = declaration.obligationIds ?? [];
    if (
      JSON.stringify([...declarationObligations].sort()) !==
      JSON.stringify([...(decision.obligationIds ?? [])].sort())
    )
      issue(
        issues,
        "family-disposition",
        `family ${decision.family} has a stale semantic-obligation disposition.`,
        { family: decision.family },
      );
    const connectorPaths = declaration.connectorPaths ?? [];
    const ownerPaths = declaration.ownerPaths ?? [];
    if (decision.applicability !== "applicable") {
      if (
        declaration.disposition !== "not-applicable" ||
        connectorPaths.length !== 0 ||
        ownerPaths.length !== 0
      )
        issue(
          issues,
          "family-disposition",
          `non-applicable family ${decision.family} has executable readiness evidence.`,
          { family: decision.family },
        );
      continue;
    }
    if (
      declaration.disposition !== "route-connector" &&
      declaration.disposition !== "qnt-owner"
    ) {
      issue(
        issues,
        "family-disposition",
        `applicable family ${decision.family} has no executable disposition.`,
        { family: decision.family },
      );
      continue;
    }
    if (declaration.disposition === "route-connector") {
      if (connectorPaths.length === 0)
        issue(
          issues,
          "family-disposition",
          `applicable family ${decision.family} has no route connector disposition.`,
          { family: decision.family },
        );
      if (ownerPaths.length !== 0)
        issue(
          issues,
          "family-disposition",
          `route family ${decision.family} also declares QNT owners.`,
          { family: decision.family },
        );
      for (const connectorPath of connectorPaths) {
        const connector = selectedByPath.get(connectorPath);
        if (!connector)
          issue(
            issues,
            "family-disposition",
            `family ${decision.family} names an unselected route connector ${connectorPath}.`,
            { family: decision.family, path: connectorPath },
          );
        else if (connector.family !== decision.family)
          issue(
            issues,
            "family-disposition",
            `route connector ${connectorPath} is assigned to the wrong family.`,
            { family: decision.family, path: connectorPath },
          );
      }
    } else {
      if (connectorPaths.length !== 0)
        issue(
          issues,
          "family-disposition",
          `QNT-owner family ${decision.family} also declares route connectors.`,
          { family: decision.family },
        );
      if (ownerPaths.length === 0)
        issue(
          issues,
          "family-disposition",
          `applicable family ${decision.family} has no registered QNT-owner disposition.`,
          { family: decision.family },
        );
      const allowedOwners = new Set(
        declarationObligations.flatMap((obligationId) => [
          ...(applicableOwnersByObligation.get(obligationId) ?? []),
        ]),
      );
      for (const ownerPath of ownerPaths) {
        if (!allowedOwners.has(ownerPath))
          issue(
            issues,
            "family-disposition",
            `family ${decision.family} names a QNT owner outside its calibrated applicable obligations: ${ownerPath}.`,
            { family: decision.family, path: ownerPath },
          );
        ownerSeeds.push({
          path: ownerPath,
          role: "family-obligation-owner",
          obligationIds: declarationObligations,
        });
      }
    }
  }
  if (byFamily.size !== decisionFamilies.size)
    issue(
      issues,
      "family-disposition",
      "scope family dispositions do not cover exactly the calibrated family set.",
    );
  return ownerSeeds;
}

function build(scope) {
  const issues = [];
  const unitId = validateSelection(scope, issues);
  const calibration = readJson(
    scope?.sourceCalibrationArtifact,
    issues,
    "source calibration artifact",
  );
  const denominator = readJson(scope?.denominatorPath, issues, "denominator");
  const ownerRoles = readJsonl(
    scope?.ownerRolesPath,
    issues,
    "QNT owner roles",
  );
  const obligations = readJsonl(scope?.obligationsPath, issues, "obligations");
  const profileObligations = readJsonl(
    scope?.profileObligationsPath,
    issues,
    "profile obligations",
  );
  const routeInventory = readJson(
    scope?.routeInventoryPath,
    issues,
    "route inventory",
  );
  const branchInventory = readJson(
    scope?.branchInventoryPath,
    issues,
    "branch inventory",
  );
  const rows = validateDenominatorRows(
    denominator?.rows,
    unitId,
    issues,
    scope?.accounting,
  );
  if (calibration?.scope?.unitId !== unitId)
    issue(
      issues,
      "scope-calibration-join",
      "source calibration and experiment scope select different Unit ids.",
      { selectedUnitId: unitId, calibratedUnitId: calibration?.scope?.unitId },
    );
  if (calibration?.contentSha256 !== contentSha256(calibration ?? {}))
    issue(
      issues,
      "calibration-hash",
      "source calibration content hash is stale.",
    );
  validateRawAnchor(calibration, issues);
  const obligationRows = validateSemanticJoins(
    calibration,
    profileObligations,
    obligations,
    ownerRoles,
    issues,
  );
  const driver = validateDriver(calibration, branchInventory, issues);

  const seeds = [];
  for (const row of obligationRows) {
    for (const owner of row.qntOwners ?? []) {
      if (owner.applicability === "applicable")
        seeds.push({
          path: owner.path,
          role: owner.role,
          obligationIds: [row.obligationId],
        });
    }
  }
  if (driver.driverPath)
    seeds.push({
      path: driver.driverPath,
      role: "selected-identity-driver",
      obligationIds: obligationRows.map((row) => row.obligationId),
    });
  const selectedRoute = (routeInventory?.rows ?? []).find(
    (row) => row.driverPath === driver.driverPath,
  );
  const routeConnectors = [];
  const architectureEdges = [];
  const routeArchitectureOwnerId =
    scope?.architectureDependencies?.routeConnectorOwnerId;
  const componentArchitectureOwnerId =
    scope?.architectureDependencies?.componentConnectorOwnerId;
  if (!selectedRoute) {
    issue(
      issues,
      "connector-missing",
      `no registered route inventory row exists for selected driver ${driver.driverPath}.`,
    );
  } else {
    if (
      !Array.isArray(selectedRoute.connectorPaths) ||
      selectedRoute.connectorPaths.length === 0
    )
      issue(
        issues,
        "connector-missing",
        "selected-identity driver has no generic route connectors.",
      );
    if ((selectedRoute.missingConnectors ?? []).length > 0)
      issue(
        issues,
        "connector-missing",
        "route inventory reports missing generic connectors.",
        { connectors: selectedRoute.missingConnectors },
      );
    const applicableConnectors = selectApplicableRouteConnectors(
      selectedRoute,
      scope,
      calibration,
      driver.selectedActions,
      calibration?.supportedProfileObligationIds ?? [],
      issues,
    );
    const familyOwnerSeeds = validateFamilyDispositions(
      calibration,
      scope,
      obligationRows,
      applicableConnectors,
      issues,
    );
    seeds.push(...familyOwnerSeeds);
    for (const connector of applicableConnectors) {
      const connectorPath = connector.path;
      seeds.push({
        path: connectorPath,
        role: "generic-route-connector",
        obligationIds: [],
      });
      routeConnectors.push({ path: connector.path, kind: connector.kind });
      if (typeof routeArchitectureOwnerId === "string")
        architectureEdges.push({
          from: connectorPath,
          to: driver.driverPath,
          ownerId: routeArchitectureOwnerId,
        });
    }
  }
  const componentConnectors = [];
  for (const row of obligationRows) {
    const qntSpecPath = row.parityWitness?.qntSpecPath;
    if (typeof qntSpecPath !== "string") continue;
    const component = (routeInventory?.rows ?? []).find(
      (candidate) => candidate.driverPath === qntSpecPath,
    );
    if (!component) {
      issue(
        issues,
        "connector-missing",
        `no component connector is registered for parity QNT ${qntSpecPath}.`,
      );
      continue;
    }
    if (component.proofClassification !== "focused-qComponentRoute")
      issue(
        issues,
        "connector-classification",
        `parity QNT ${qntSpecPath} is not classified as a component route.`,
      );
    if ((component.missingConnectors ?? []).length > 0)
      issue(
        issues,
        "connector-missing",
        `component route ${qntSpecPath} reports missing connectors.`,
      );
    for (const connectorPath of component.connectorPaths ?? []) {
      seeds.push({
        path: connectorPath,
        role: "generic-component-connector",
        obligationIds: [row.obligationId],
      });
      componentConnectors.push({
        path: connectorPath,
        kind: "component",
        obligationId: row.obligationId,
      });
      if (typeof componentArchitectureOwnerId === "string")
        architectureEdges.push({
          from: connectorPath,
          to: driver.driverPath,
          ownerId: componentArchitectureOwnerId,
        });
    }
  }
  const closure = collectQntClosure(seeds, scope?.syncScriptPath, issues);
  const uniqueArchitectureEdges = [
    ...new Map(
      architectureEdges.map((edge) => [
        `${edge.from}:${edge.to}:${edge.ownerId}`,
        edge,
      ]),
    ).values(),
  ].sort((left, right) =>
    `${left.from}:${left.to}:${left.ownerId}`.localeCompare(
      `${right.from}:${right.to}:${right.ownerId}`,
    ),
  );
  const prerequisiteOrder = buildPrerequisiteOrder(
    closure.files,
    closure.edges,
    uniqueArchitectureEdges,
    issues,
  );
  const prerequisitePositions = new Map(
    prerequisiteOrder.map((filePath, index) => [filePath, index]),
  );
  for (const edge of uniqueArchitectureEdges) {
    if (
      (prerequisitePositions.get(edge.from) ?? Number.MAX_SAFE_INTEGER) >=
      (prerequisitePositions.get(edge.to) ?? -1)
    )
      issue(
        issues,
        "architecture-order",
        `architecture prerequisite ${edge.from} must precede ${edge.to}.`,
        edge,
      );
  }

  const hashes = {};
  const hashPaths = [
    ...(calibration?.scope?.rawAnchor?.split("#")[0]
      ? [calibration.scope.rawAnchor.split("#")[0]]
      : []),
    ...(calibration?.scope?.ubiquitousLanguageAnchors ?? []).map(
      (anchor) => anchor.split("#")[0],
    ),
    ...(scope?.domainPaths ?? []),
    ...(scope?.architecturePaths ?? []),
    scope?.denominatorPath,
    scope?.routeInventoryPath,
    scope?.branchInventoryPath,
    ...(closure.files ?? []).map((file) => file.path),
  ];
  for (const relativePath of [...new Set(hashPaths)].sort()) {
    if (typeof relativePath !== "string") continue;
    if (fs.existsSync(repoPath(relativePath)))
      hashes[relativePath] = sha256File(relativePath);
    else
      issue(
        issues,
        "hash-missing",
        `required navigation hash source is unavailable: ${relativePath}.`,
        { path: relativePath },
      );
  }
  const architectureOwners = scope?.architectureOwners ?? [];
  const architectureOwnerIds = new Set();
  if (architectureOwners.length === 0)
    issue(
      issues,
      "architecture-owner",
      "scope has no curated language-independent architecture owners.",
    );
  for (const owner of architectureOwners) {
    if (architectureOwnerIds.has(owner.ownerId))
      issue(
        issues,
        "architecture-owner",
        `architecture owner ${owner.ownerId} is declared more than once.`,
      );
    architectureOwnerIds.add(owner.ownerId);
    if (!scope.architecturePaths?.includes(owner.path))
      issue(
        issues,
        "architecture-owner",
        `architecture owner ${owner.ownerId} is outside the declared architecture inputs.`,
      );
    if (!fs.existsSync(repoPath(owner.path)))
      issue(
        issues,
        "architecture-owner",
        `architecture owner ${owner.ownerId} is unavailable: ${owner.path}.`,
      );
  }
  for (const [dependencyKind, ownerId] of Object.entries(
    scope?.architectureDependencies ?? {},
  )) {
    if (!architectureOwnerIds.has(ownerId))
      issue(
        issues,
        "architecture-owner",
        `architecture dependency ${dependencyKind} names undeclared owner ${ownerId}.`,
        { ownerId },
      );
  }
  validateCalibrationHashes(calibration, issues);

  const accountingRowIds = rows.map((row) => row.rowId);
  const obligationIds = (calibration?.supportedProfileObligationIds ?? [])
    .slice()
    .sort();
  const index = {
    schema: "unit-readiness-index.v1",
    generatedBy: "scripts/unit-readiness-check.cjs",
    scope: {
      kind: "single-unit",
      unitIds: unitId === undefined ? [] : [unitId],
      fullCorpus: false,
    },
    units:
      unitId === undefined
        ? []
        : [
            {
              unitId,
              accountingRowIds,
              raw: {
                path: calibration?.scope?.rawAnchor?.split("#")[0],
                anchor: calibration?.scope?.rawAnchor,
              },
              supportedProfile: {
                profileId: calibration?.scope?.profileId,
                obligationIds,
              },
              qnt: {
                driver: {
                  path: driver.driverPath,
                  actions: driver.selectedActions.slice().sort(),
                },
                files: closure.files.map((file) => ({
                  path: file.path,
                  roles: file.roles,
                  obligationIds: file.obligationIds,
                  imports: file.imports,
                })),
                importEdges: closure.edges,
                architectureEdges: uniqueArchitectureEdges,
                prerequisiteOrder,
              },
              connectors: {
                routes: routeConnectors.sort((left, right) =>
                  left.path.localeCompare(right.path),
                ),
                components: componentConnectors.sort((left, right) =>
                  left.path.localeCompare(right.path),
                ),
              },
            },
          ],
    domain: { paths: [...(scope?.domainPaths ?? [])].sort() },
    architecture: {
      paths: [...(scope?.architecturePaths ?? [])].sort(),
      ownerIds: [...architectureOwnerIds].sort(),
    },
    hashes,
  };
  index.contentSha256 = contentSha256(index);
  issues.push(...cleanroomProjectionIssues(index));
  return { index, issues };
}

function validateStoredIndex(index, expected, issues) {
  if (!index || index.schema !== "unit-readiness-index.v1")
    issue(issues, "index-schema", "stored Unit index has the wrong schema.");
  else {
    if (index.contentSha256 !== contentSha256(index))
      issue(issues, "index-hash", "stored Unit index content hash is stale.");
    if (JSON.stringify(stable(index)) !== JSON.stringify(stable(expected)))
      issue(
        issues,
        "index-stale",
        "stored Unit index does not match current source navigation.",
      );
    issues.push(...cleanroomProjectionIssues(index));
  }
}

function readinessResult(index, indexPath, issues) {
  const result = {
    schema: "unit-readiness-result.v1",
    generatedBy: "scripts/unit-readiness-check.cjs",
    scope: structuredClone(index.scope),
    status: issues.length === 0 ? "ready" : "source-blocked",
    issues,
    indexPath,
    indexContentSha256: index.contentSha256,
  };
  result.contentSha256 = contentSha256(result);
  return result;
}

function validateStoredResult(storedResult, expectedResult, issues) {
  if (storedResult?.contentSha256 !== contentSha256(storedResult ?? {}))
    issue(
      issues,
      "result-hash",
      "stored Unit readiness result content hash is stale.",
    );
  if (
    JSON.stringify(stable(storedResult)) !==
    JSON.stringify(stable(expectedResult))
  )
    issue(
      issues,
      "result-stale",
      "stored Unit readiness result does not match the complete current source result.",
    );
}

function validateFixture(condition, message) {
  if (!condition) throw new Error(`unit readiness self-test: ${message}`);
}

function runSelfTest() {
  const scope = readJson(scopePath, [], "scope");
  const baseline = build(scope);
  validateFixture(
    baseline.issues.length === 0,
    JSON.stringify(baseline.issues, null, 2),
  );
  const forgedFullCorpusResult = readinessResult(
    baseline.index,
    scope.artifacts.resultPath,
    baseline.issues,
  );
  forgedFullCorpusResult.scope.fullCorpus = true;
  forgedFullCorpusResult.contentSha256 = contentSha256(forgedFullCorpusResult);
  const forgedFullCorpusIssues = [];
  validateStoredResult(
    forgedFullCorpusResult,
    readinessResult(
      baseline.index,
      scope.artifacts.resultPath,
      baseline.issues,
    ),
    forgedFullCorpusIssues,
  );
  validateFixture(
    forgedFullCorpusIssues.some((entry) => entry.code === "result-stale"),
    "forged full-corpus readiness result was accepted",
  );
  const baselineRoutePaths = new Set(
    baseline.index.units[0].connectors.routes.map(
      (connector) => connector.path,
    ),
  );
  for (const unrelatedPath of [
    "packages/battle-runtime/battle-runtime-chained-attack-sequence.route.mbt.qnt",
    "packages/battle-runtime/battle-runtime-condition-riders.route.mbt.qnt",
    "packages/battle-runtime/battle-runtime-starry-wisp-object.route.mbt.qnt",
  ])
    validateFixture(
      !baselineRoutePaths.has(unrelatedPath),
      `unrelated connector was included: ${unrelatedPath}`,
    );
  const invalidConnectorScope = structuredClone(scope);
  invalidConnectorScope.connectorApplicability.find(
    (record) => record.family === "mixed-target",
  ).obligationIds = [];
  const invalidConnectorResult = build(invalidConnectorScope);
  validateFixture(
    invalidConnectorResult.issues.some(
      (entry) => entry.code === "connector-applicability",
    ),
    "connector obligation applicability mismatch was accepted",
  );
  const invalidFamilyScope = structuredClone(scope);
  invalidFamilyScope.familyDispositions =
    invalidFamilyScope.familyDispositions.filter(
      (declaration) => declaration.family !== "exact-damage",
    );
  const invalidFamilyResult = build(invalidFamilyScope);
  validateFixture(
    invalidFamilyResult.issues.some(
      (entry) => entry.code === "family-disposition",
    ),
    "calibrated family without a readiness disposition was accepted",
  );
  const selected = structuredClone(scope);
  selected.scope.unitIds = [];
  const emptyIssues = [];
  validateSelection(selected, emptyIssues);
  validateFixture(
    emptyIssues.some((entry) => entry.code === "scope-empty"),
    "empty scope was accepted",
  );
  const unitId = scope.scope.unitIds[0];
  const duplicateSelection = structuredClone(scope);
  duplicateSelection.scope.unitIds = [unitId, unitId];
  const duplicateSelectionIssues = [];
  validateSelection(duplicateSelection, duplicateSelectionIssues);
  validateFixture(
    duplicateSelectionIssues.some((entry) => entry.code === "scope-duplicate"),
    "duplicate Unit selection was accepted",
  );
  for (const fullCorpus of [undefined, null, true, "false"]) {
    const malformedScope = structuredClone(scope);
    if (fullCorpus === undefined) delete malformedScope.scope.fullCorpus;
    else malformedScope.scope.fullCorpus = fullCorpus;
    const malformedScopeIssues = [];
    validateSelection(malformedScope, malformedScopeIssues);
    validateFixture(
      malformedScopeIssues.some((entry) => entry.code === "scope-full-corpus"),
      `malformed fullCorpus selection was accepted: ${String(fullCorpus)}`,
    );
  }
  const rows = readJson(scope.denominatorPath, [], "denominator").rows;
  const unitRows = rows.filter((row) => row.candidateUnitId === unitId);
  const rowIssues = [];
  validateDenominatorRows(
    unitRows.slice(0, 2),
    unitId,
    rowIssues,
    scope.accounting,
  );
  validateFixture(
    rowIssues.some((entry) => entry.code === "accounting-row-missing"),
    "missing denominator row was accepted",
  );
  const duplicateIssues = [];
  validateDenominatorRows(
    [
      ...rows.filter((row) => row.candidateUnitId === unitId),
      rows.find((row) => row.candidateUnitId === unitId),
    ],
    unitId,
    duplicateIssues,
    scope.accounting,
  );
  validateFixture(
    duplicateIssues.some((entry) => entry.code === "accounting-row-duplicate"),
    "duplicate denominator row was accepted",
  );
  const calibration = readJson(
    scope.sourceCalibrationArtifact,
    [],
    "calibration",
  );
  const branchInventory = readJson(
    scope.branchInventoryPath,
    [],
    "branch inventory",
  );
  const invalidOwnerHashCalibration = structuredClone(calibration);
  const ownerWithHash = invalidOwnerHashCalibration.obligationCalibrations
    .flatMap((row) => row.qntOwners ?? [])
    .find((owner) => owner.applicability === "applicable");
  ownerWithHash.sha256 = "0".repeat(64);
  const invalidOwnerHashIssues = [];
  validateSemanticJoins(
    invalidOwnerHashCalibration,
    readJsonl(scope.profileObligationsPath, [], "profiles"),
    readJsonl(scope.obligationsPath, [], "obligations"),
    readJsonl(scope.ownerRolesPath, [], "owners"),
    invalidOwnerHashIssues,
  );
  validateFixture(
    invalidOwnerHashIssues.some((entry) => entry.code === "qnt-owner-hash"),
    "stale calibrated semantic-owner hash was accepted",
  );
  const invalidOwnerJoinCalibration = structuredClone(calibration);
  invalidOwnerJoinCalibration.obligationCalibrations[0].qntOwners.push({
    path: "packages/battle-runtime/battle-runtime-save-spell-tests.qnt",
    role: "focused-proof-companion",
    applicability: "applicable",
    sha256: sha256File(
      "packages/battle-runtime/battle-runtime-save-spell-tests.qnt",
    ),
  });
  const invalidOwnerJoinIssues = [];
  validateSemanticJoins(
    invalidOwnerJoinCalibration,
    readJsonl(scope.profileObligationsPath, [], "profiles"),
    readJsonl(scope.obligationsPath, [], "obligations"),
    readJsonl(scope.ownerRolesPath, [], "owners"),
    invalidOwnerJoinIssues,
  );
  validateFixture(
    invalidOwnerJoinIssues.some((entry) => entry.code === "qnt-owner"),
    "QNT owner without canonical obligation ownership was accepted",
  );
  const invalidBranchJoin = structuredClone(calibration);
  invalidBranchJoin.branchCalibrations[0].calibratedObligationIds = [];
  const invalidBranchJoinIssues = [];
  validateDriver(invalidBranchJoin, branchInventory, invalidBranchJoinIssues);
  validateFixture(
    invalidBranchJoinIssues.some(
      (entry) => entry.code === "branch-obligation-join",
    ),
    "branch semantic-obligation join omission was accepted",
  );
  const invalidProductionReplay = structuredClone(calibration);
  invalidProductionReplay.branchCalibrations[0].productionTypeScript.productionProjection =
    "";
  const invalidProductionIssues = [];
  validateDriver(
    invalidProductionReplay,
    branchInventory,
    invalidProductionIssues,
  );
  validateFixture(
    invalidProductionIssues.some((entry) => entry.code === "production-replay"),
    "missing production replay projection was accepted",
  );
  const missingCalibrationSourceIssues = [];
  validateCalibrationHashes(
    {
      ...calibration,
      sourceHashes: {
        ...calibration.sourceHashes,
        "packages/missing-calibration-source.ts": "0".repeat(64),
      },
    },
    missingCalibrationSourceIssues,
  );
  validateFixture(
    missingCalibrationSourceIssues.some(
      (entry) => entry.code === "calibration-missing",
    ),
    "missing calibration source was accepted",
  );
  const wrongDriverIssues = [];
  validateDriver(
    {
      ...calibration,
      qntBranchDiscovery: {
        ...calibration.qntBranchDiscovery,
        driverPath:
          "packages/battle-runtime/battle-runtime-attack-spell-shape-selected-identity.mbt.qnt",
      },
    },
    { branchObligations: [] },
    wrongDriverIssues,
  );
  validateFixture(
    wrongDriverIssues.some((entry) => entry.code === "driver-selection"),
    "first candidate driver was accepted",
  );
  const missingImportIssues = [];
  collectQntClosure(
    [
      {
        path: "packages/battle-runtime/battle-runtime-model.qnt",
        role: "import-closure",
        obligationIds: [],
      },
    ],
    scope.syncScriptPath,
    missingImportIssues,
    new Set(),
  );
  validateFixture(
    missingImportIssues.some((entry) => entry.code === "cleanroom-import"),
    "missing copied import was accepted",
  );
  const contaminationIssues = cleanroomProjectionIssues({
    sourcePath: "packages/surface/content/example.json",
    ownerPath: "packages/battle-runtime/src/example.ts",
  });
  validateFixture(
    contaminationIssues.some(
      (entry) => entry.code === "projection-contamination",
    ),
    "Surface mechanics entered projection",
  );
  const prerequisiteOrder = baseline.index.units[0].qnt.prerequisiteOrder;
  const prerequisitePositions = new Map(
    prerequisiteOrder.map((filePath, index) => [filePath, index]),
  );
  const selectedDriverPath = baseline.index.units[0].qnt.driver.path;
  for (const connector of [
    ...baseline.index.units[0].connectors.routes,
    ...baseline.index.units[0].connectors.components,
  ]) {
    validateFixture(
      prerequisitePositions.get(connector.path) <
        prerequisitePositions.get(selectedDriverPath),
      `connector ${connector.path} does not precede selected identity driver`,
    );
  }
  const proseIssues = [];
  validateSemanticJoins(
    {
      scope: calibration.scope,
      supportedProfileObligationIds: [],
      obligationCalibrations: [],
    },
    readJsonl(scope.profileObligationsPath, [], "profiles"),
    readJsonl(scope.obligationsPath, [], "obligations"),
    readJsonl(scope.ownerRolesPath, [], "owners"),
    proseIssues,
  );
  validateFixture(
    proseIssues.some((entry) => entry.code === "obligation-join"),
    "prose-only missing obligation was accepted",
  );
  console.log("unit readiness self-test passed (22 negative/order fixtures).");
}

function main() {
  if (!scopePath)
    throw new Error("unit readiness requires --scope <scope.json>");
  if (selfTest) return runSelfTest();
  const scope = readJson(scopePath, [], "scope");
  const built = build(scope ?? {});
  const resultPath = scope?.artifacts?.resultPath;
  const indexPath = scope?.artifacts?.indexPath;
  const issues = [...built.issues];
  if (!write && indexPath && fs.existsSync(repoPath(indexPath))) {
    validateStoredIndex(
      readJson(indexPath, issues, "stored Unit index"),
      built.index,
      issues,
    );
  } else if (!write) {
    issue(
      issues,
      "index-missing",
      `cleanroom Unit index is unavailable: ${indexPath}.`,
    );
  }
  const sourceIssues = [...issues];
  if (!write && resultPath && fs.existsSync(repoPath(resultPath))) {
    const storedResult = readJson(
      resultPath,
      issues,
      "stored Unit readiness result",
    );
    validateStoredResult(
      storedResult,
      readinessResult(built.index, indexPath, sourceIssues),
      issues,
    );
  } else if (!write) {
    issue(
      issues,
      "result-missing",
      `Unit readiness result is unavailable: ${resultPath}.`,
    );
  }
  const result = readinessResult(built.index, indexPath, issues);
  if (write) {
    fs.mkdirSync(path.dirname(repoPath(indexPath)), { recursive: true });
    fs.writeFileSync(
      repoPath(indexPath),
      `${JSON.stringify(built.index, null, 2)}\n`,
    );
    fs.mkdirSync(path.dirname(repoPath(resultPath)), { recursive: true });
    fs.writeFileSync(
      repoPath(resultPath),
      `${JSON.stringify(result, null, 2)}\n`,
    );
  }
  if (issues.length > 0) {
    console.error(JSON.stringify(result, null, 2));
    process.exitCode = 1;
    return;
  }
  console.log(
    `unit readiness passed (${built.index.units.length} Unit, ${built.index.units[0].accountingRowIds.length} accounting rows, ${built.index.units[0].qnt.files.length} QNT files).`,
  );
}

main();
