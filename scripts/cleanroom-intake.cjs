#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const {
  buildReceiptContractProjection,
  stableStringify,
  validateTargetReceipt,
} = require("./cleanroom-target-receipt.cjs");
const {
  catalogBasis,
  inputHashes,
  sha256Text,
  stableJson: exportStableJson,
} = require("./cleanroom-experiment.cjs");

const SOURCE_ROOT = path.resolve(__dirname, "..");
const CONTRACT_PATH = path.join(
  SOURCE_ROOT,
  "plans/L12_CLEANROOM_EXPERIMENT_CONTRACT.md",
);
const EMPTY_STATUS_SHA256 =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const OUTPUT_MARKER = ".cleanroom-experiment-output";
const OUTPUT_MARKER_CONTENT = "cleanroom-experiment-output.v1\n";
const BLOCKER_CLASSES = new Set([
  "source-qnt-corpus",
  "source-scope",
  "target-implementation",
]);
const TRANSITIONS = new Set([
  "target-goal",
  "fresh-source-review",
  "full-plan-revision",
]);
const SHA256_PATTERN = /^[0-9a-f]{64}$/i;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/i;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stable(entry)]),
  );
}

function stableJson(value) {
  return stableStringify(value);
}

function canonicalMeasurementFields() {
  const projection = buildReceiptContractProjection(CONTRACT_PATH);
  if (
    !Array.isArray(projection.measurementFields) ||
    projection.measurementFields.some((field) => typeof field !== "string")
  )
    throw new Error("canonical receipt contract has no measurement field list");
  return projection.measurementFields;
}

function reportMeasurementValue(value, field) {
  if (!isRecord(value)) return unavailable(`receipt did not report ${field}`);
  if (
    value.tag === "reported" &&
    value.value !== undefined &&
    value.value !== null &&
    value.value !== ""
  )
    return value;
  if (
    value.tag === "unavailable" &&
    typeof value.reason === "string" &&
    value.reason !== ""
  )
    return value;
  return unavailable(`receipt reported an invalid ${field} measurement`);
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

function git(root, ...args) {
  return execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function gitRaw(root, ...args) {
  return execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function safeRelative(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !path.posix.isAbsolute(value) &&
    !value.split(/[\\/]/).includes("..") &&
    !value.split(/[\\/]/).includes(".git")
  );
}

function isSha256(value) {
  return typeof value === "string" && SHA256_PATTERN.test(value);
}

function isCommit(value) {
  return typeof value === "string" && COMMIT_PATTERN.test(value);
}

function requireManifestField(manifest, field, predicate, findings) {
  if (!predicate(manifest?.[field]))
    addFinding(
      findings,
      "source-scope",
      "incomplete-manifest",
      `manifest.${field}`,
      `Task 3 manifest field ${field} is missing or malformed`,
    );
}

function addFinding(findings, blockerClass, code, issuePath, message) {
  if (!BLOCKER_CLASSES.has(blockerClass))
    throw new Error(`unknown blocker class: ${blockerClass}`);
  const finding = {
    blockerClass,
    code,
    path: issuePath,
    message,
  };
  if (
    !findings.some(
      (entry) =>
        entry.blockerClass === finding.blockerClass &&
        entry.code === finding.code &&
        entry.path === finding.path &&
        entry.message === finding.message,
    )
  ) {
    findings.push(finding);
  }
}

function receiptIssueClass(issuePath) {
  if (issuePath === "manifest" || issuePath.startsWith("manifest."))
    return "source-scope";
  if (issuePath === "scope" || issuePath.startsWith("scope."))
    return "source-scope";
  return "target-implementation";
}

function sourcePathForCatalog(catalogRoot, relativePath) {
  return path.join(catalogRoot, ...relativePath.split("/"));
}

function catalogInputs(catalogRoot, manifest, findings) {
  const copies = [];
  if (!isRecord(manifest) || !Array.isArray(manifest.inputHashes))
    return copies;
  const seen = new Set();
  for (const [index, input] of manifest.inputHashes.entries()) {
    const issuePath = `manifest.inputHashes[${index}]`;
    if (!isRecord(input) || !safeRelative(input.dest)) {
      addFinding(
        findings,
        "source-scope",
        "invalid-manifest-input",
        issuePath,
        "manifest input must name a safe relative catalog path",
      );
      continue;
    }
    if (seen.has(input.dest))
      addFinding(
        findings,
        "source-scope",
        "duplicate-manifest-input",
        issuePath,
        `manifest declares ${input.dest} more than once`,
      );
    seen.add(input.dest);
    if (!isSha256(input.sha256))
      addFinding(
        findings,
        "source-scope",
        "invalid-manifest-input-hash",
        `${issuePath}.sha256`,
        "manifest input hash must be a SHA-256 digest",
      );
    const inputPath = sourcePathForCatalog(catalogRoot, input.dest);
    if (!fs.existsSync(inputPath)) {
      addFinding(
        findings,
        "source-scope",
        "catalog-input-missing",
        input.dest,
        "manifest-declared input is absent from the immutable catalog",
      );
    } else {
      const content = fs.readFileSync(inputPath);
      const actual = sha256(content);
      copies.push({ dest: input.dest, content });
      if (actual !== input.sha256)
        addFinding(
          findings,
          "source-scope",
          "catalog-input-hash-mismatch",
          input.dest,
          `catalog input hash is ${actual}, manifest declares ${input.sha256}`,
        );
    }
  }
  return copies;
}

function validateManifestCatalog(catalogRoot, manifest, findings) {
  if (!isRecord(manifest)) {
    addFinding(
      findings,
      "source-scope",
      "manifest-unreadable",
      "manifest.json",
      "Task 3 manifest must be an object",
    );
    return;
  }
  const markerPath = path.join(catalogRoot, OUTPUT_MARKER);
  if (
    !fs.existsSync(markerPath) ||
    fs.readFileSync(markerPath, "utf8") !== OUTPUT_MARKER_CONTENT
  )
    addFinding(
      findings,
      "source-scope",
      "catalog-marker-missing",
      OUTPUT_MARKER,
      "catalog is not an exporter-owned Task 3 output",
    );
  requireManifestField(
    manifest,
    "schema",
    (value) => value === "cleanroom-experiment-manifest.v1",
    findings,
  );
  requireManifestField(manifest, "sourceCommitSha", isCommit, findings);
  if (isCommit(manifest.sourceCommitSha)) {
    let currentSourceCommit;
    try {
      currentSourceCommit = git(SOURCE_ROOT, "rev-parse", "HEAD");
    } catch (_error) {
      currentSourceCommit = undefined;
    }
    if (currentSourceCommit && currentSourceCommit !== manifest.sourceCommitSha)
      addFinding(
        findings,
        "source-scope",
        "stale-source-commit",
        "manifest.sourceCommitSha",
        "catalog was not generated from the current source HEAD",
      );
  }
  requireManifestField(
    manifest,
    "runKind",
    (value) => value === "fresh-experiment" || value === "diagnostic-rehearsal",
    findings,
  );
  requireManifestField(manifest, "catalogSha256", isSha256, findings);
  requireManifestField(
    manifest,
    "scope",
    (value) =>
      isRecord(value) &&
      value.kind === "single-unit" &&
      value.fullCorpus === false &&
      Array.isArray(value.unitIds) &&
      value.unitIds.length === 1 &&
      typeof value.unitIds[0] === "string",
    findings,
  );
  requireManifestField(
    manifest,
    "finalization",
    (value) =>
      isRecord(value) &&
      ["scoped-export", "post-ralph-finalization"].includes(value.tag) &&
      typeof value.trackedCleanCommitVerified === "boolean" &&
      (value.tag === "post-ralph-finalization"
        ? value.trackedCleanCommitVerified === true
        : value.trackedCleanCommitVerified === false),
    findings,
  );
  requireManifestField(
    manifest,
    "sourceReadiness",
    (value) =>
      isRecord(value) &&
      value.status === "ready" &&
      isSha256(value.resultSha256),
    findings,
  );
  requireManifestField(
    manifest,
    "sourceCalibration",
    (value) =>
      isRecord(value) &&
      value.status === "passed" &&
      isSha256(value.indexSha256),
    findings,
  );
  requireManifestField(
    manifest,
    "generatorHashes",
    (value) =>
      Array.isArray(value) &&
      value.length > 0 &&
      value.every(
        (entry) =>
          isRecord(entry) &&
          typeof entry.role === "string" &&
          isSha256(entry.sha256),
      ),
    findings,
  );
  requireManifestField(manifest, "canonicalContractSha256", isSha256, findings);
  requireManifestField(
    manifest,
    "targetProfile",
    (value) =>
      isRecord(value) &&
      typeof value.id === "string" &&
      /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value.id) &&
      isSha256(value.sha256) &&
      isSha256(value.projectionSha256),
    findings,
  );
  requireManifestField(
    manifest,
    "inputHashes",
    (value) => Array.isArray(value) && value.length > 0,
    findings,
  );
  requireManifestField(
    manifest,
    "cleanroomUnitIndexSha256",
    isSha256,
    findings,
  );
  requireManifestField(
    manifest,
    "receiptContractProjectionSha256",
    isSha256,
    findings,
  );
  requireManifestField(
    manifest,
    "emptyStatusOutputSha256",
    (value) => value === EMPTY_STATUS_SHA256,
    findings,
  );
  requireManifestField(
    manifest,
    "selectedBranches",
    (value) =>
      Array.isArray(value) &&
      value.length > 0 &&
      value.every(
        (branch) =>
          isRecord(branch) &&
          safeRelative(branch.driverPath) &&
          typeof branch.branchAction === "string" &&
          isSha256(branch.qntFileSha256) &&
          Array.isArray(branch.calibratedObligationIds) &&
          branch.calibratedObligationIds.length > 0 &&
          branch.replayLane === "native-qnt-mbt" &&
          isRecord(branch.targetEvidence) &&
          branch.targetEvidence.productionEntrypoint === "required" &&
          branch.targetEvidence.productionProjection === "required",
      ),
    findings,
  );
  requireManifestField(
    manifest,
    "targetGoalPath",
    (value) => value === "target-goal.md",
    findings,
  );
  requireManifestField(
    manifest,
    "receiptPath",
    (value) => value === "target-receipt.json",
    findings,
  );

  const copies = catalogInputs(catalogRoot, manifest, findings);
  const catalogHashByPath = new Map(
    (manifest.inputHashes ?? []).map((entry) => [entry.dest, entry.sha256]),
  );
  for (const [field, relativePath] of [
    [
      "cleanroomUnitIndexSha256",
      "cleanroom-input/unit/unit-readiness-index.json",
    ],
    [
      "receiptContractProjectionSha256",
      "cleanroom-input/harness/target-receipt-contract.json",
    ],
  ]) {
    if (
      isSha256(manifest[field]) &&
      catalogHashByPath.get(relativePath) !== manifest[field]
    )
      addFinding(
        findings,
        "source-scope",
        "manifest-derived-hash-mismatch",
        `manifest.${field}`,
        `${field} does not match the catalog input inventory`,
      );
  }
  const sourceBoundFiles = {
    "catalog-generator": "scripts/cleanroom-experiment.cjs",
    "receipt-contract-generator": "scripts/cleanroom-target-receipt.cjs",
    "package-entrypoint": "scripts/package-cleanroom-refresh.cjs",
    "cleanroom-input-sync": "scripts/sync-cleanroom-input.cjs",
    "source-calibration-gate": "scripts/source-calibration-check.cjs",
    "unit-readiness-gate": "scripts/unit-readiness-check.cjs",
  };
  const generatorByRole = new Map(
    (manifest.generatorHashes ?? []).map((entry) => [entry.role, entry.sha256]),
  );
  const expectedGeneratorRoles = Object.keys(sourceBoundFiles);
  if (
    generatorByRole.size !== expectedGeneratorRoles.length ||
    expectedGeneratorRoles.some((role) => !generatorByRole.has(role))
  )
    addFinding(
      findings,
      "source-scope",
      "generator-role-inventory-mismatch",
      "manifest.generatorHashes",
      "manifest generator hashes must contain exactly the Task 3 generator roles",
    );
  for (const [role, relativePath] of Object.entries(sourceBoundFiles)) {
    const sourcePath = path.join(SOURCE_ROOT, relativePath);
    const expected = generatorByRole.get(role);
    if (!isSha256(expected)) {
      addFinding(
        findings,
        "source-scope",
        "generator-hash-missing",
        `manifest.generatorHashes.${role}`,
        `${role} generator hash is missing`,
      );
      continue;
    }
    if (!fs.existsSync(sourcePath)) {
      addFinding(
        findings,
        "source-scope",
        "generator-source-missing",
        `manifest.generatorHashes.${role}`,
        `${relativePath} is unavailable in the source tree`,
      );
      continue;
    }
    const actual = sha256(fs.readFileSync(sourcePath));
    if (actual !== expected)
      addFinding(
        findings,
        "source-scope",
        "generator-hash-stale",
        `manifest.generatorHashes.${role}`,
        `${relativePath} changed after export`,
      );
  }
  const readinessResultPath = path.join(
    SOURCE_ROOT,
    "plans/ralph-artifacts/l12-cleanroom-ice-knife-pilot/unit-readiness-result.json",
  );
  const calibrationIndexPath = path.join(
    SOURCE_ROOT,
    "plans/ralph-artifacts/l12-cleanroom-ice-knife-pilot/source-calibration-index.json",
  );
  if (!fs.existsSync(readinessResultPath))
    addFinding(
      findings,
      "source-scope",
      "readiness-result-missing",
      "manifest.sourceReadiness.resultSha256",
      "source readiness result is unavailable",
    );
  else if (
    isSha256(manifest.sourceReadiness?.resultSha256) &&
    sha256(fs.readFileSync(readinessResultPath)) !==
      manifest.sourceReadiness.resultSha256
  )
    addFinding(
      findings,
      "source-scope",
      "readiness-result-stale",
      "manifest.sourceReadiness.resultSha256",
      "source readiness result changed after export",
    );
  if (!fs.existsSync(calibrationIndexPath))
    addFinding(
      findings,
      "source-scope",
      "calibration-index-missing",
      "manifest.sourceCalibration.indexSha256",
      "source calibration index is unavailable",
    );
  else if (
    isSha256(manifest.sourceCalibration?.indexSha256) &&
    sha256(fs.readFileSync(calibrationIndexPath)) !==
      manifest.sourceCalibration.indexSha256
  )
    addFinding(
      findings,
      "source-scope",
      "calibration-index-stale",
      "manifest.sourceCalibration.indexSha256",
      "source calibration index changed after export",
    );
  const profilePath = path.join(
    SOURCE_ROOT,
    "plans/cleanroom-scaffolds/target-profiles",
    `${manifest.targetProfile?.id ?? ""}.json`,
  );
  if (!fs.existsSync(profilePath))
    addFinding(
      findings,
      "source-scope",
      "target-profile-source-missing",
      "manifest.targetProfile.id",
      "manifest target profile is unavailable in the source tree",
    );
  else if (
    isSha256(manifest.targetProfile?.sha256) &&
    sha256(fs.readFileSync(profilePath)) !== manifest.targetProfile.sha256
  )
    addFinding(
      findings,
      "source-scope",
      "target-profile-stale",
      "manifest.targetProfile.sha256",
      "source target profile changed after export",
    );
  const goalPath = sourcePathForCatalog(
    catalogRoot,
    manifest.targetGoalPath ?? "target-goal.md",
  );
  if (!fs.existsSync(goalPath))
    addFinding(
      findings,
      "source-scope",
      "target-goal-missing",
      "targetGoalPath",
      "catalog target-goal.md is missing",
    );
  const goal = fs.existsSync(goalPath) ? fs.readFileSync(goalPath, "utf8") : "";
  if (copies.length > 0 && isSha256(manifest.catalogSha256)) {
    const actualInputHashes = inputHashes(copies);
    if (
      exportStableJson(actualInputHashes) !==
      exportStableJson(manifest.inputHashes)
    )
      addFinding(
        findings,
        "source-scope",
        "catalog-input-inventory-mismatch",
        "manifest.inputHashes",
        "catalog files do not match the manifest input inventory",
      );
    const basis = catalogBasis(
      { ...manifest, catalogSha256: undefined },
      copies,
      goal,
    );
    const actualCatalogSha256 = sha256Text(exportStableJson(basis));
    if (actualCatalogSha256 !== manifest.catalogSha256)
      addFinding(
        findings,
        "source-scope",
        "catalog-hash-mismatch",
        "manifest.catalogSha256",
        `catalog recomputes to ${actualCatalogSha256}, manifest declares ${manifest.catalogSha256}`,
      );
  }
}

function commitFile(root, commit, relativePath) {
  if (!safeRelative(relativePath)) return undefined;
  try {
    return execFileSync(
      "git",
      ["-C", root, "show", `${commit}:${relativePath}`],
      { encoding: "buffer", stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch (_error) {
    return undefined;
  }
}

function verifyFinishReference(
  targetRoot,
  finishCommit,
  reference,
  issuePath,
  findings,
) {
  if (!isRecord(reference) || !safeRelative(reference.path)) {
    addFinding(
      findings,
      "target-implementation",
      "invalid-finish-reference",
      issuePath,
      "target reference must be a safe relative path",
    );
    return;
  }
  const content = commitFile(targetRoot, finishCommit, reference.path);
  if (content === undefined) {
    addFinding(
      findings,
      "target-implementation",
      "finish-artifact-missing",
      `${issuePath}.path`,
      `finish commit does not contain ${reference.path}`,
    );
    return;
  }
  const actual = sha256(content);
  if (actual !== reference.sha256)
    addFinding(
      findings,
      "target-implementation",
      "finish-artifact-hash-mismatch",
      `${issuePath}.sha256`,
      `${reference.path} hashes to ${actual}, receipt declares ${reference.sha256}`,
    );
}

function validateEvidenceRoot(evidenceRoot, receipt, findings) {
  if (!evidenceRoot) {
    addFinding(
      findings,
      "target-implementation",
      "evidence-root-missing",
      "evidenceRoot",
      "returned evidence root is required for source intake",
    );
    return;
  }
  if (
    !fs.existsSync(evidenceRoot) ||
    !fs.statSync(evidenceRoot).isDirectory()
  ) {
    addFinding(
      findings,
      "target-implementation",
      "evidence-root-missing",
      "evidenceRoot",
      "returned evidence root is not an available directory",
    );
    return;
  }
  const expected = new Map();
  const declare = (reference, issuePath) => {
    if (
      !isRecord(reference) ||
      !safeRelative(reference.path) ||
      !isSha256(reference.sha256)
    )
      return;
    const prior = expected.get(reference.path);
    if (prior !== undefined && prior !== reference.sha256)
      addFinding(
        findings,
        "target-implementation",
        "evidence-reference-conflict",
        issuePath,
        `evidence path ${reference.path} has conflicting declared hashes`,
      );
    expected.set(reference.path, reference.sha256);
  };
  for (const [index, reference] of (receipt.retainedArtifacts ?? []).entries())
    declare(reference, `retainedArtifacts[${index}]`);
  for (const [index, observation] of (
    receipt.branchObservations ?? []
  ).entries())
    declare(
      { path: observation.evidencePath, sha256: observation.evidenceSha256 },
      `branchObservations[${index}].evidence`,
    );
  for (const [index, observation] of (
    receipt.targetOutcome?.observations ?? []
  ).entries())
    declare(
      observation.evidence,
      `targetOutcome.observations[${index}].evidence`,
    );

  const actual = new Map();
  const actualDirectories = new Set();
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relative = path
        .relative(evidenceRoot, absolute)
        .split(path.sep)
        .join("/");
      if (entry.isSymbolicLink()) {
        addFinding(
          findings,
          "target-implementation",
          "evidence-symlink-forbidden",
          relative,
          "returned evidence must contain regular files only",
        );
      } else if (entry.isDirectory()) {
        actualDirectories.add(relative);
        visit(absolute);
      } else if (entry.isFile())
        actual.set(relative, sha256(fs.readFileSync(absolute)));
      else
        addFinding(
          findings,
          "target-implementation",
          "evidence-entry-invalid",
          relative,
          "returned evidence contains a non-file entry",
        );
    }
  };
  visit(evidenceRoot);
  const expectedDirectories = new Set();
  for (const relative of expected.keys()) {
    const segments = relative.split("/");
    segments.pop();
    for (let index = 1; index <= segments.length; index += 1)
      expectedDirectories.add(segments.slice(0, index).join("/"));
  }
  for (const relative of actualDirectories)
    if (!expectedDirectories.has(relative))
      addFinding(
        findings,
        "target-implementation",
        "evidence-unexpected",
        relative,
        "returned evidence contains an undeclared directory",
      );
  for (const [relative, expectedSha256] of expected.entries()) {
    const actualSha256 = actual.get(relative);
    if (actualSha256 === undefined)
      addFinding(
        findings,
        "target-implementation",
        "evidence-missing",
        relative,
        "declared retained evidence is absent from the returned evidence root",
      );
    else if (actualSha256 !== expectedSha256)
      addFinding(
        findings,
        "target-implementation",
        "evidence-hash-mismatch",
        relative,
        `returned evidence hashes to ${actualSha256}, receipt declares ${expectedSha256}`,
      );
  }
  for (const relative of actual.keys())
    if (!expected.has(relative))
      addFinding(
        findings,
        "target-implementation",
        "evidence-unexpected",
        relative,
        "returned evidence is not declared by the target receipt",
      );
}

function selectedBranchKey(branch) {
  return `${branch.driverPath}#${branch.branchAction}`;
}

function validateSelectedBranches(
  catalogRoot,
  manifest,
  receipt,
  targetRoot,
  findings,
) {
  const expected = Array.isArray(manifest?.selectedBranches)
    ? manifest.selectedBranches
    : [];
  const observed = Array.isArray(receipt.branchObservations)
    ? receipt.branchObservations
    : [];
  const expectedByKey = new Map(
    expected.map((branch) => [selectedBranchKey(branch), branch]),
  );
  const catalogHashes = new Map(
    (manifest?.inputHashes ?? []).map((input) => [input.dest, input.sha256]),
  );
  const observedByKey = new Map();
  for (const [index, branch] of observed.entries()) {
    const key = selectedBranchKey(branch ?? {});
    if (observedByKey.has(key))
      addFinding(
        findings,
        "target-implementation",
        "duplicate-branch-observation",
        `branchObservations[${index}]`,
        `branch ${key} was observed more than once`,
      );
    observedByKey.set(key, branch);
    const declared = expectedByKey.get(key);
    if (declared === undefined) {
      addFinding(
        findings,
        "target-implementation",
        "unexpected-branch-observation",
        `branchObservations[${index}]`,
        `branch ${key} is not selected by the immutable manifest`,
      );
      continue;
    }
    if (branch.qntFileSha256 !== declared.qntFileSha256)
      addFinding(
        findings,
        "target-implementation",
        "branch-qnt-hash-mismatch",
        `branchObservations[${index}].qntFileSha256`,
        `branch declares ${branch.qntFileSha256}, manifest declares ${declared.qntFileSha256}`,
      );
    if (catalogHashes.get(declared.driverPath) !== declared.qntFileSha256)
      addFinding(
        findings,
        "source-qnt-corpus",
        "selected-driver-catalog-hash-mismatch",
        `selectedBranches.${key}.qntFileSha256`,
        "selected branch QNT hash does not match the immutable catalog input hash",
      );
    const driverContent = commitFile(
      targetRoot,
      receipt.targetFinishCommit,
      branch.driverPath,
    );
    if (driverContent === undefined)
      addFinding(
        findings,
        "target-implementation",
        "branch-driver-missing",
        `branchObservations[${index}].driverPath`,
        `branch driver ${branch.driverPath} is absent from the finish commit`,
      );
    else if (sha256(driverContent) !== declared.qntFileSha256)
      addFinding(
        findings,
        "target-implementation",
        "branch-driver-hash-mismatch",
        `branchObservations[${index}].driverPath`,
        `branch driver does not resolve to the manifest QNT hash`,
      );
    verifyFinishReference(
      targetRoot,
      receipt.targetFinishCommit,
      branch.production?.entrypoint,
      `branchObservations[${index}].production.entrypoint`,
      findings,
    );
    verifyFinishReference(
      targetRoot,
      receipt.targetFinishCommit,
      branch.production?.projection,
      `branchObservations[${index}].production.projection`,
      findings,
    );
    verifyFinishReference(
      targetRoot,
      receipt.targetFinishCommit,
      { path: branch.evidencePath, sha256: branch.evidenceSha256 },
      `branchObservations[${index}].evidence`,
      findings,
    );
  }
  for (const [key, branch] of expectedByKey.entries()) {
    if (receipt.targetOutcome?.tag === "completed" && !observedByKey.has(key))
      addFinding(
        findings,
        "target-implementation",
        "missing-branch-observation",
        `selectedBranches.${key}`,
        `selected branch ${key} has no target observation`,
      );
    if (!safeRelative(branch.driverPath))
      addFinding(
        findings,
        "source-scope",
        "unsafe-selected-driver",
        `selectedBranches.${key}.driverPath`,
        "manifest selected driver is not a safe catalog path",
      );
  }
  if (
    receipt.targetOutcome?.tag === "completed" &&
    observed.length !== expected.length
  )
    addFinding(
      findings,
      "target-implementation",
      "selected-branch-cardinality",
      "branchObservations",
      `completed receipt observed ${observed.length} of ${expected.length} selected branches`,
    );
  if (receipt.targetOutcome?.tag === "blocked") {
    for (const [index, observation] of (
      receipt.targetOutcome.observations ?? []
    ).entries()) {
      const blockerClass =
        observation.tag === "contradictory-copied-input"
          ? "source-qnt-corpus"
          : observation.tag === "missing-copied-input"
            ? "source-scope"
            : "target-implementation";
      addFinding(
        findings,
        blockerClass,
        `target-observation-${observation.tag}`,
        `targetOutcome.observations[${index}]`,
        `${observation.tag}: ${observation.subject}`,
      );
    }
  }
}

function validateTargetGit(targetRoot, receipt, contract, findings) {
  let currentHead;
  try {
    currentHead = git(targetRoot, "rev-parse", "HEAD");
  } catch (error) {
    addFinding(
      findings,
      "target-implementation",
      "target-not-git",
      "targetRoot",
      error.message,
    );
    return;
  }
  if (currentHead !== receipt.targetFinishCommit)
    addFinding(
      findings,
      "target-implementation",
      "stale-target-head",
      "targetFinishCommit",
      `target HEAD is ${currentHead}, receipt finish is ${receipt.targetFinishCommit}`,
    );
  const status = gitRaw(targetRoot, "status", "--porcelain=v2");
  if (status !== "")
    addFinding(
      findings,
      "target-implementation",
      "dirty-target-finish",
      "targetFinishStatus",
      "target worktree has uncommitted changes after the receipt finish commit",
    );
  if (
    receipt.targetFinishStatus?.clean !== true ||
    receipt.targetFinishStatus?.outputSha256 !== EMPTY_STATUS_SHA256
  )
    addFinding(
      findings,
      "target-implementation",
      "dirty-finish-attestation",
      "targetFinishStatus",
      "receipt does not attest a clean finish with the empty status digest",
    );
  if (
    receipt.runKind === "fresh-experiment" &&
    receipt.targetStartStatus?.clean !== true
  )
    addFinding(
      findings,
      "target-implementation",
      "dirty-fresh-start",
      "targetStartStatus",
      "fresh experiments must start from a clean target",
    );
  try {
    execFileSync(
      "git",
      [
        "-C",
        targetRoot,
        "merge-base",
        "--is-ancestor",
        receipt.targetStartCommit,
        receipt.targetFinishCommit,
      ],
      { stdio: "ignore" },
    );
  } catch (_error) {
    addFinding(
      findings,
      "target-implementation",
      "non-ancestor-finish",
      "ancestorProof",
      "target start commit is not an ancestor of the finish commit",
    );
  }
  if (receipt.ancestorProof?.verified !== true)
    addFinding(
      findings,
      "target-implementation",
      "unverified-ancestor-proof",
      "ancestorProof",
      "receipt does not carry a verified ancestor proof",
    );
  if (contract.emptyStatusOutputSha256 !== EMPTY_STATUS_SHA256)
    addFinding(
      findings,
      "source-scope",
      "contract-empty-status-drift",
      "contract.emptyStatusOutputSha256",
      "receipt contract empty-status digest is not the canonical value",
    );
}

function validateManifestBinding(
  catalogRoot,
  manifest,
  receipt,
  contract,
  findings,
) {
  validateManifestCatalog(catalogRoot, manifest, findings);
  if (receipt.manifest?.catalogSha256 !== manifest?.catalogSha256)
    addFinding(
      findings,
      "source-scope",
      "stale-manifest",
      "manifest.catalogSha256",
      "receipt is bound to a different catalog",
    );
  if (receipt.manifest?.sourceCommitSha !== manifest?.sourceCommitSha)
    addFinding(
      findings,
      "source-scope",
      "stale-manifest-source",
      "manifest.sourceCommitSha",
      "receipt source commit does not match the catalog manifest",
    );
  if (receipt.manifest?.targetProfileId !== manifest?.targetProfile?.id)
    addFinding(
      findings,
      "source-scope",
      "target-profile-mismatch",
      "manifest.targetProfileId",
      "receipt target profile does not match the catalog manifest",
    );
  if (
    receipt.runKind !== manifest?.runKind ||
    receipt.manifest?.runKind !== manifest?.runKind
  )
    addFinding(
      findings,
      "source-scope",
      "run-kind-mismatch",
      "runKind",
      "receipt and catalog use different run kinds",
    );
  if (stableJson(receipt.scope) !== stableJson(manifest?.scope))
    addFinding(
      findings,
      "source-scope",
      "scope-contradiction",
      "scope",
      "receipt scope does not match the immutable manifest scope",
    );
  if (manifest?.receiptContractProjectionSha256 !== undefined) {
    const targetProjectionPath = sourcePathForCatalog(
      catalogRoot,
      "cleanroom-input/harness/target-receipt-contract.json",
    );
    if (!fs.existsSync(targetProjectionPath))
      addFinding(
        findings,
        "source-scope",
        "receipt-projection-missing",
        "cleanroom-input/harness/target-receipt-contract.json",
        "catalog receipt projection is missing",
      );
    else if (
      sha256(fs.readFileSync(targetProjectionPath)) !==
      manifest.receiptContractProjectionSha256
    )
      addFinding(
        findings,
        "source-scope",
        "receipt-projection-hash-mismatch",
        "receiptContractProjectionSha256",
        "catalog receipt projection differs from its manifest hash",
      );
  }
  const targetProfilePath = sourcePathForCatalog(
    catalogRoot,
    "target-profile.json",
  );
  if (!fs.existsSync(targetProfilePath))
    addFinding(
      findings,
      "source-scope",
      "target-profile-missing",
      "target-profile.json",
      "catalog target profile projection is missing",
    );
  else if (
    isSha256(manifest?.targetProfile?.projectionSha256) &&
    sha256(fs.readFileSync(targetProfilePath)) !==
      manifest.targetProfile.projectionSha256
  )
    addFinding(
      findings,
      "source-scope",
      "target-profile-projection-mismatch",
      "targetProfile.projectionSha256",
      "catalog target profile projection does not match the manifest",
    );
  if (manifest?.canonicalContractSha256 !== undefined) {
    const actual = sha256(fs.readFileSync(CONTRACT_PATH));
    if (actual !== manifest.canonicalContractSha256)
      addFinding(
        findings,
        "source-scope",
        "canonical-contract-changed",
        "canonicalContractSha256",
        "the source contract changed after the export manifest was created",
      );
  }
  if (typeof manifest?.sourceCommitSha === "string") {
    try {
      execFileSync(
        "git",
        [
          "-C",
          SOURCE_ROOT,
          "cat-file",
          "-e",
          `${manifest.sourceCommitSha}^{commit}`,
        ],
        { stdio: "ignore" },
      );
    } catch (_error) {
      addFinding(
        findings,
        "source-scope",
        "source-commit-unavailable",
        "manifest.sourceCommitSha",
        "manifest source commit is not available in the source repository",
      );
    }
  }
  try {
    const canonicalProjection = buildReceiptContractProjection(CONTRACT_PATH);
    if (stableJson(canonicalProjection) !== stableJson(contract))
      addFinding(
        findings,
        "source-scope",
        "receipt-projection-drift",
        "cleanroom-input/harness/target-receipt-contract.json",
        "catalog receipt projection differs from the canonical shared contract",
      );
  } catch (error) {
    addFinding(
      findings,
      "source-scope",
      "canonical-contract-unreadable",
      "plans/L12_CLEANROOM_EXPERIMENT_CONTRACT.md",
      error.message,
    );
  }
  if (isRecord(contract.jsonSchema) === false)
    addFinding(
      findings,
      "source-scope",
      "malformed-receipt-contract",
      "cleanroom-input/harness/target-receipt-contract.json",
      "receipt projection has no JSON schema",
    );
}

function accountingRowIds(catalogRoot, manifest) {
  try {
    const index = readJson(
      sourcePathForCatalog(
        catalogRoot,
        "cleanroom-input/unit/unit-readiness-index.json",
      ),
      "cleanroom Unit index",
    );
    const rows =
      index.units?.find((unit) => unit.unitId === manifest.scope?.unitIds?.[0])
        ?.accountingRowIds ?? [];
    return rows.length > 0 ? rows : (manifest.accountingRowIds ?? []);
  } catch (_error) {
    return manifest.accountingRowIds ?? [];
  }
}

function buildResult(manifest, receipt, findings, rowIds, bindings) {
  const effectiveRunKind = receipt?.runKind ?? manifest?.runKind;
  const sourceFindings = findings.filter(
    (entry) => entry.blockerClass !== "target-implementation",
  );
  const targetFindings = findings.filter(
    (entry) => entry.blockerClass === "target-implementation",
  );
  const sourceBlocked = sourceFindings.length > 0;
  const targetOnly = !sourceBlocked && targetFindings.length > 0;
  const diagnostic =
    effectiveRunKind === "diagnostic-rehearsal" && findings.length === 0;
  const accepted =
    effectiveRunKind === "fresh-experiment" &&
    findings.length === 0 &&
    receipt.targetOutcome?.tag === "completed";
  const nextAction =
    accepted || diagnostic
      ? "full-plan-revision"
      : targetOnly && effectiveRunKind === "fresh-experiment"
        ? "target-implementation-same-manifest"
        : "fresh-source-review";
  return {
    schema: "cleanroom-intake-result.v1",
    manifest: {
      catalogSha256: manifest?.catalogSha256,
      sourceCommitSha: manifest?.sourceCommitSha,
      runKind: manifest?.runKind,
    },
    scope: manifest?.scope,
    runKind: effectiveRunKind,
    bindings,
    outcome: accepted ? "accepted" : diagnostic ? "diagnostic" : "blocked",
    accepted,
    accounting: accepted
      ? { unitIds: manifest.scope.unitIds, rowIds }
      : { unitIds: [], rowIds: [] },
    blockers: findings,
    sameManifestContinuation:
      nextAction === "target-implementation-same-manifest",
    nextAction,
  };
}

function intake({
  catalogRoot,
  targetRoot,
  evidenceRoot,
  receiptPath,
  outputPath,
}) {
  const startedAt = new Date().toISOString();
  const findings = [];
  let manifest;
  let receipt;
  let contract;
  let receiptSha256;
  try {
    manifest = readJson(
      path.join(catalogRoot, "manifest.json"),
      "catalog manifest",
    );
  } catch (error) {
    addFinding(
      findings,
      "source-scope",
      "manifest-unreadable",
      "manifest.json",
      error.message,
    );
  }
  try {
    receiptSha256 = sha256(fs.readFileSync(receiptPath));
    receipt = readJson(receiptPath, "target receipt");
  } catch (error) {
    addFinding(
      findings,
      "target-implementation",
      "receipt-unreadable",
      receiptPath,
      error.message,
    );
  }
  try {
    contract = readJson(
      path.join(
        catalogRoot,
        "cleanroom-input/harness/target-receipt-contract.json",
      ),
      "target receipt contract",
    );
  } catch (error) {
    addFinding(
      findings,
      "source-scope",
      "receipt-contract-unreadable",
      "cleanroom-input/harness/target-receipt-contract.json",
      error.message,
    );
  }
  if (receipt && contract) {
    for (const issue of validateTargetReceipt(receipt, contract))
      addFinding(
        findings,
        receiptIssueClass(issue.path),
        "receipt-contract-invalid",
        issue.path,
        issue.message,
      );
    validateManifestBinding(catalogRoot, manifest, receipt, contract, findings);
    validateTargetGit(targetRoot, receipt, contract, findings);
    validateSelectedBranches(
      catalogRoot,
      manifest,
      receipt,
      targetRoot,
      findings,
    );
    for (const [index, artifact] of (receipt.retainedArtifacts ?? []).entries())
      verifyFinishReference(
        targetRoot,
        receipt.targetFinishCommit,
        artifact,
        `retainedArtifacts[${index}]`,
        findings,
      );
    validateEvidenceRoot(evidenceRoot, receipt, findings);
  }
  const rowIds = accountingRowIds(catalogRoot, manifest ?? {});
  if (rowIds.length !== 3 || new Set(rowIds).size !== rowIds.length)
    addFinding(
      findings,
      "source-scope",
      "accounting-aliases-incomplete",
      "cleanroom-input/unit/unit-readiness-index.json",
      "the Ice Knife pilot must retain three distinct denominator rows for its one atomic Unit",
    );
  const finishedAt = new Date().toISOString();
  const result = buildResult(manifest ?? {}, receipt ?? {}, findings, rowIds, {
    catalogSha256: manifest?.catalogSha256,
    sourceCommitSha: manifest?.sourceCommitSha,
    receiptSha256,
    targetFinishCommit: receipt?.targetFinishCommit,
  });
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, stableJson(result));
  fs.writeFileSync(
    `${outputPath}.events.tsv`,
    `${startedAt}\tintake\tstart\n${finishedAt}\tintake\tfinish outcome=${result.outcome}\n`,
  );
  return result;
}

function parseEvents(eventsPath) {
  if (!eventsPath || !fs.existsSync(eventsPath)) return undefined;
  const events = [];
  for (const [index, line] of fs
    .readFileSync(eventsPath, "utf8")
    .split(/\r?\n/)
    .entries()) {
    if (!line.trim()) continue;
    const fields = line.split("\t");
    const timestamp = Date.parse(fields[0]);
    if (Number.isNaN(timestamp)) continue;
    events.push({
      timestamp,
      kind: fields[1] ?? "event",
      detail: fields.slice(2).join("\t"),
      line: index + 1,
    });
  }
  return events.length > 0 ? events : undefined;
}

function unavailable(reason) {
  return { tag: "unavailable", reason };
}

function duration(start, finish) {
  return finish >= start ? finish - start : undefined;
}

function eventHasLabel(event, label) {
  return (
    event.kind === label ||
    event.detail.split(/\s+/).includes(label) ||
    event.detail.startsWith(`${label} `)
  );
}

function eventValue(event, name) {
  return event.detail.match(new RegExp(`${name}=([^\\s]+)`))?.[1];
}

function measuredDuration(start, finish, unavailableReason) {
  const elapsedMs =
    start === undefined || finish === undefined
      ? undefined
      : duration(start, finish);
  if (elapsedMs === undefined) return unavailable(unavailableReason);
  return { tag: "reported", value: { elapsedMs } };
}

function sourceRalphPhases(events) {
  if (!events)
    return {
      measurement: unavailable(
        "Ralph events.tsv was not supplied or had no parseable timestamps",
      ),
      clock: undefined,
    };
  const phases = [];
  const open = new Map();
  const phaseKey = (phase, event) =>
    `${phase}:task-${eventValue(event, "task") ?? "run"}:round-${eventValue(event, "round") ?? "run"}`;
  const begin = (phase, event) => {
    const key = phaseKey(phase, event);
    open.set(key, {
      phase,
      key,
      task: eventValue(event, "task"),
      round: eventValue(event, "round"),
      startedAt: event.timestamp,
      startLine: event.line,
    });
  };
  const finish = (phase, event) => {
    const key = phaseKey(phase, event);
    const started = open.get(key);
    if (!started) return;
    phases.push({
      phase: started.phase,
      key: started.key,
      task: started.task,
      round: started.round,
      orderTimestamp: started.startedAt,
      elapsed: measuredDuration(
        started.startedAt,
        event.timestamp,
        "phase finish was unavailable",
      ),
    });
    open.delete(key);
  };
  for (const event of events) {
    if (eventHasLabel(event, "implementation-start"))
      begin("implementation", event);
    if (eventHasLabel(event, "implementation-finished")) {
      finish("implementation", event);
      begin("review", event);
    }
    if (eventHasLabel(event, "implementation-reviewed")) {
      finish("review", event);
      begin("handoff", event);
    }
    if (eventHasLabel(event, "implementation-handoff"))
      finish("handoff", event);
    if (event.kind === "task" && event.detail.startsWith("start "))
      begin("task", event);
    if (
      event.kind === "task" &&
      (event.detail.startsWith("complete ") ||
        event.detail.startsWith("done ") ||
        eventHasLabel(event, "task-finished"))
    )
      finish("task", event);
  }
  for (const phase of open.values())
    phases.push({
      phase: phase.phase,
      key: phase.key,
      task: phase.task,
      round: phase.round,
      orderTimestamp: phase.startedAt,
      elapsed: unavailable("phase has no matching finish event"),
    });
  phases.sort(
    (left, right) =>
      left.orderTimestamp - right.orderTimestamp ||
      left.key.localeCompare(right.key),
  );
  const phaseReport = phases.map(
    ({ orderTimestamp: _orderTimestamp, ...phase }) => phase,
  );
  const runStart = events.find(
    (event) => event.kind === "run" && event.detail.startsWith("start"),
  )?.timestamp;
  const runFinish = [...events]
    .reverse()
    .find(
      (event) =>
        event.kind === "run" && /\b(done|finish|complete)\b/.test(event.detail),
    )?.timestamp;
  const elapsed = measuredDuration(
    runStart,
    runFinish,
    "Ralph run start or finish event was unavailable",
  );
  return {
    measurement: {
      tag: "reported",
      value: {
        elapsed,
        phases: phaseReport,
        eventsPath: undefined,
      },
    },
    clock:
      runStart !== undefined && runFinish !== undefined && runFinish >= runStart
        ? { startedAt: runStart, finishedAt: runFinish }
        : undefined,
  };
}

function intakeClock(events) {
  if (!events)
    return {
      measurement: unavailable(
        "intake events were not supplied or had no parseable timestamps",
      ),
      clock: undefined,
    };
  const startedAt = events.find(
    (event) => event.kind === "intake" && event.detail.startsWith("start"),
  )?.timestamp;
  const finishedAt = [...events]
    .reverse()
    .find(
      (event) => event.kind === "intake" && event.detail.startsWith("finish"),
    )?.timestamp;
  return {
    measurement: measuredDuration(
      startedAt,
      finishedAt,
      "intake start or finish event was unavailable",
    ),
    clock:
      startedAt !== undefined &&
      finishedAt !== undefined &&
      finishedAt >= startedAt
        ? { startedAt, finishedAt }
        : undefined,
  };
}

function measure({
  receiptPath,
  resultPath,
  ralphEventsPath,
  intakeEventsPath,
  outputPath,
}) {
  const receipt = readJson(receiptPath, "target receipt");
  const measurementFields = canonicalMeasurementFields();
  const result =
    resultPath && fs.existsSync(resultPath)
      ? readJson(resultPath, "intake result")
      : undefined;
  const sourceEvents = parseEvents(ralphEventsPath);
  const intakeEvents = parseEvents(intakeEventsPath);
  const targetStart = Date.parse(receipt.timing?.startedAt ?? "");
  const targetFinish = Date.parse(receipt.timing?.finishedAt ?? "");
  const sourceRun = sourceRalphPhases(sourceEvents);
  const sourceMeasurement = sourceRun.measurement;
  if (sourceMeasurement.tag === "reported")
    sourceMeasurement.value.eventsPath = ralphEventsPath;
  const intakeRun = intakeClock(intakeEvents);
  const intakeMeasurement = intakeRun.measurement;
  const targetMeasurement = measuredDuration(
    Number.isNaN(targetStart) ? undefined : targetStart,
    Number.isNaN(targetFinish) ? undefined : targetFinish,
    "receipt timing does not contain two parseable timestamps",
  );
  const targetGoal = {
    diagnosticRehearsal:
      receipt.runKind === "diagnostic-rehearsal"
        ? targetMeasurement
        : unavailable("receipt run kind is fresh-experiment"),
    freshExperiment:
      receipt.runKind === "fresh-experiment"
        ? targetMeasurement
        : unavailable("receipt run kind is diagnostic-rehearsal"),
  };
  const totalWall =
    sourceRun.clock &&
    intakeRun.clock &&
    !Number.isNaN(targetStart) &&
    !Number.isNaN(targetFinish) &&
    targetFinish >= targetStart
      ? {
          tag: "reported",
          value: {
            elapsedMs:
              Math.max(
                sourceRun.clock.finishedAt,
                targetFinish,
                intakeRun.clock.finishedAt,
              ) -
              Math.min(
                sourceRun.clock.startedAt,
                targetStart,
                intakeRun.clock.startedAt,
              ),
          },
        }
      : unavailable(
          "source Ralph, target, and intake clocks are all required for total wall time",
        );
  const measurementProvenance = Object.fromEntries(
    measurementFields.map((field) => [
      field,
      reportMeasurementValue(receipt.measurementProvenance?.[field], field),
    ]),
  );
  const report = {
    schema: "cleanroom-measurement-report.v1",
    conformance: result
      ? { outcome: result.outcome, accepted: result.accepted }
      : unavailable("intake result was not supplied"),
    sourceRalph: sourceMeasurement,
    targetGoal,
    intake: { ...intakeMeasurement, eventsPath: intakeEventsPath },
    totalWall,
    measurementProvenance,
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, stableJson(report));
  return report;
}

function validateIntakeResult(
  result,
  manifest,
  receipt,
  receiptPath,
  findings,
) {
  const expectedRunKind = receipt?.runKind ?? manifest?.runKind;
  if (!isRecord(result)) {
    addFinding(
      findings,
      "source-scope",
      "intake-result-malformed",
      "intake-result.json",
      "intake result must be an object",
    );
    return;
  }
  if (result.schema !== "cleanroom-intake-result.v1")
    addFinding(
      findings,
      "source-scope",
      "intake-result-schema",
      "intake-result.schema",
      "intake result has an unsupported schema",
    );
  if (!Array.isArray(result.blockers))
    addFinding(
      findings,
      "source-scope",
      "intake-result-blockers",
      "intake-result.blockers",
      "intake result blockers must be an array",
    );
  if (
    !TRANSITIONS.has(result.nextAction) &&
    result.nextAction !== "target-implementation-same-manifest"
  )
    addFinding(
      findings,
      "source-scope",
      "intake-result-next-action",
      "intake-result.nextAction",
      "intake result has an unsupported next action",
    );
  if (
    stableJson(result.scope) !== stableJson(manifest?.scope) ||
    result.runKind !== expectedRunKind
  )
    addFinding(
      findings,
      "source-scope",
      "intake-result-scope-binding",
      "intake-result.scope",
      "intake result is not bound to the current receipt scope and run kind",
    );
  if (
    result.manifest?.catalogSha256 !== manifest?.catalogSha256 ||
    result.manifest?.sourceCommitSha !== manifest?.sourceCommitSha ||
    result.manifest?.runKind !== manifest?.runKind
  )
    addFinding(
      findings,
      "source-scope",
      "intake-result-manifest-binding",
      "intake-result.manifest",
      "intake result is not bound to the current catalog manifest",
    );
  if (result.bindings?.receiptSha256 !== sha256(fs.readFileSync(receiptPath)))
    addFinding(
      findings,
      "source-scope",
      "intake-result-receipt-binding",
      "intake-result.bindings.receiptSha256",
      "intake result is not bound to the returned receipt bytes",
    );
  if (result.bindings?.catalogSha256 !== manifest?.catalogSha256)
    addFinding(
      findings,
      "source-scope",
      "intake-result-catalog-binding",
      "intake-result.bindings.catalogSha256",
      "intake result is not bound to the current catalog",
    );
  if (result.bindings?.sourceCommitSha !== manifest?.sourceCommitSha)
    addFinding(
      findings,
      "source-scope",
      "intake-result-source-binding",
      "intake-result.bindings.sourceCommitSha",
      "intake result is not bound to the current source commit",
    );
  if (result.bindings?.targetFinishCommit !== receipt?.targetFinishCommit)
    addFinding(
      findings,
      "source-scope",
      "intake-result-target-binding",
      "intake-result.bindings.targetFinishCommit",
      "intake result is not bound to the returned target finish commit",
    );
}

function status({
  catalogRoot,
  targetRoot,
  receiptPath,
  intakeResultPath,
  evidenceRoot,
}) {
  const findings = [];
  const catalogPresent = Boolean(catalogRoot && fs.existsSync(catalogRoot));
  const receiptPresent = Boolean(receiptPath && fs.existsSync(receiptPath));
  const resultPresent = Boolean(
    intakeResultPath && fs.existsSync(intakeResultPath),
  );
  let manifest;
  let contract;
  let receipt;
  let result;
  let resultReproducible = false;

  if (!catalogPresent) {
    addFinding(
      findings,
      "source-scope",
      "status-catalog-missing",
      "catalog",
      "the finalized catalog is required before any target transition can be derived",
    );
  } else {
    try {
      manifest = readJson(
        path.join(catalogRoot, "manifest.json"),
        "catalog manifest",
      );
      contract = readJson(
        path.join(
          catalogRoot,
          "cleanroom-input/harness/target-receipt-contract.json",
        ),
        "target receipt contract",
      );
      validateManifestCatalog(catalogRoot, manifest, findings);
      const canonicalProjection = buildReceiptContractProjection(CONTRACT_PATH);
      if (stableJson(canonicalProjection) !== stableJson(contract))
        addFinding(
          findings,
          "source-scope",
          "receipt-projection-drift",
          "cleanroom-input/harness/target-receipt-contract.json",
          "catalog receipt projection differs from the canonical shared contract",
        );
    } catch (error) {
      addFinding(
        findings,
        "source-scope",
        "status-artifact-unreadable",
        "catalog",
        error.message,
      );
    }
  }

  if (receiptPresent) {
    try {
      receipt = readJson(receiptPath, "target receipt");
    } catch (error) {
      addFinding(
        findings,
        "target-implementation",
        "status-receipt-unreadable",
        receiptPath,
        error.message,
      );
    }
  }
  if (resultPresent) {
    try {
      result = readJson(intakeResultPath, "intake result");
    } catch (error) {
      addFinding(
        findings,
        "source-scope",
        "status-result-unreadable",
        intakeResultPath,
        error.message,
      );
    }
  }

  if (manifest && contract && receipt) {
    validateManifestBinding(catalogRoot, manifest, receipt, contract, findings);
    for (const issue of validateTargetReceipt(receipt, contract))
      addFinding(
        findings,
        receiptIssueClass(issue.path),
        "receipt-contract-invalid",
        issue.path,
        issue.message,
      );
    if (!targetRoot)
      addFinding(
        findings,
        "target-implementation",
        "status-target-root-missing",
        "targetRoot",
        "status requires the returned target root to verify the finish tree",
      );
    else {
      validateTargetGit(targetRoot, receipt, contract, findings);
      validateSelectedBranches(
        catalogRoot,
        manifest,
        receipt,
        targetRoot,
        findings,
      );
      for (const [index, artifact] of (
        receipt.retainedArtifacts ?? []
      ).entries())
        verifyFinishReference(
          targetRoot,
          receipt.targetFinishCommit,
          artifact,
          `retainedArtifacts[${index}]`,
          findings,
        );
    }
    validateEvidenceRoot(evidenceRoot, receipt, findings);
    if (result)
      validateIntakeResult(result, manifest, receipt, receiptPath, findings);
    else
      addFinding(
        findings,
        "source-scope",
        "status-result-missing",
        "intake-result.json",
        "a returned receipt must have a correlated intake result",
      );
    if (result && targetRoot) {
      const verificationRoot = fs.mkdtempSync(
        path.join(os.tmpdir(), "cleanroom-status-recompute-"),
      );
      try {
        const recomputed = intake({
          catalogRoot,
          targetRoot,
          evidenceRoot,
          receiptPath,
          outputPath: path.join(verificationRoot, "intake-result.json"),
        });
        if (stableJson(recomputed) !== stableJson(result))
          addFinding(
            findings,
            "source-scope",
            "intake-result-not-reproducible",
            "intake-result.json",
            "available intake result does not match a fresh validation of the current artifacts",
          );
        else resultReproducible = true;
      } catch (error) {
        addFinding(
          findings,
          "source-scope",
          "intake-result-recompute-failed",
          "intake-result.json",
          error.message,
        );
      } finally {
        fs.rmSync(verificationRoot, { recursive: true, force: true });
      }
    }
  } else if (result && !receiptPresent) {
    addFinding(
      findings,
      "source-scope",
      "orphan-intake-result",
      "intake-result.json",
      "an intake result cannot be trusted without its correlated receipt and catalog",
    );
  } else if (receiptPresent && !receipt) {
    addFinding(
      findings,
      "target-implementation",
      "status-receipt-missing",
      "target-receipt.json",
      "returned receipt could not be read",
    );
  }
  if (manifest && contract && result && receiptPresent && !receipt) {
    validateIntakeResult(result, manifest, undefined, receiptPath, findings);
    if (targetRoot) {
      const verificationRoot = fs.mkdtempSync(
        path.join(os.tmpdir(), "cleanroom-status-recompute-"),
      );
      try {
        const recomputed = intake({
          catalogRoot,
          targetRoot,
          evidenceRoot,
          receiptPath,
          outputPath: path.join(verificationRoot, "intake-result.json"),
        });
        if (stableJson(recomputed) !== stableJson(result))
          addFinding(
            findings,
            "source-scope",
            "intake-result-not-reproducible",
            "intake-result.json",
            "available intake result does not match a fresh validation of the current artifacts",
          );
        else resultReproducible = true;
      } catch (error) {
        addFinding(
          findings,
          "source-scope",
          "intake-result-recompute-failed",
          "intake-result.json",
          error.message,
        );
      } finally {
        fs.rmSync(verificationRoot, { recursive: true, force: true });
      }
    }
  }

  let nextTransition = "target-goal";
  let reason =
    "no returned receipt is available; launch the target from the finalized catalog";
  const sourceFindings = findings.filter(
    (entry) => entry.blockerClass !== "target-implementation",
  );
  if (sourceFindings.length > 0) {
    nextTransition = "fresh-source-review";
    reason =
      "available catalog, receipt, target, or intake artifacts failed validation";
  } else if (
    resultReproducible &&
    result?.nextAction === "target-implementation-same-manifest"
  ) {
    nextTransition = "target-goal";
    reason =
      "intake found only target implementation failures under the same manifest";
  } else if (findings.length > 0) {
    nextTransition = "fresh-source-review";
    reason =
      "available catalog, receipt, target, or intake artifacts failed validation";
  } else if (receipt && !result) {
    nextTransition = "fresh-source-review";
    reason = "a returned receipt is available but has not been intaken";
  } else if (result?.nextAction === "full-plan-revision") {
    nextTransition = "full-plan-revision";
    reason =
      "the recorded experiment is complete or diagnostic and needs source review before scaling";
  } else if (result) {
    nextTransition = "fresh-source-review";
    reason =
      "intake found source or contract blockers that require a fresh source review";
  }
  if (!TRANSITIONS.has(nextTransition))
    throw new Error(`invalid derived transition ${nextTransition}`);
  process.stdout.write(
    `${JSON.stringify({ schema: "cleanroom-status.v1", nextTransition, reason })}\n`,
  );
}

function renderHandoff(outputPath) {
  const artifactRoot = "plans/ralph-artifacts/l12-cleanroom-ice-knife-pilot";
  const text = [
    "# Ice Knife cleanroom handoff",
    "",
    "This handoff is source orchestration only. It does not claim a real target result.",
    "",
    "## Finalize the source export",
    "",
    "```sh",
    "pnpm cleanroom:export:l12-ice-knife -- --finalize \\",
    "  --scope " + artifactRoot + "/unit-readiness-scope.json \\",
    "  --profile plans/cleanroom-scaffolds/target-profiles/rust.json \\",
    "  --output /workspace/typescript/dnd-cleanroom-ice-knife-final",
    "pnpm cleanroom:status:l12-ice-knife -- --catalog /workspace/typescript/dnd-cleanroom-ice-knife-final",
    "```",
    "",
    "Export location: `/workspace/typescript/dnd-cleanroom-ice-knife-final`",
    "Target launch prompt: `/workspace/typescript/dnd-cleanroom-ice-knife-final/target-goal.md`",
    "Expected external receipt: `/workspace/typescript/dnd-cleanroom-ice-knife-final/target-receipt.json`",
    "",
    "## Executable source-review procedure",
    "",
    "The procedure accepts four positional parameters: `RECEIPT_PATH`, `TARGET_ROOT`, `EVIDENCE_ROOT`, and `CATALOG_ROOT`.",
    "",
    "```sh",
    'RECEIPT_PATH="${1:?path to returned target-receipt.json}"',
    'TARGET_ROOT="${2:?path to target checkout at receipt finish}"',
    'EVIDENCE_ROOT="${3:?path to retained target evidence}"',
    'CATALOG_ROOT="${4:?path to finalized cleanroom export}"',
    `RESULT_PATH=\"${artifactRoot}/intake-result.json\"`,
    `MEASUREMENT_PATH=\"${artifactRoot}/measurement-report.json\"`,
    `PROMPT_PATH=\"${artifactRoot}/source-review-prompt.md\"`,
    "",
    'pnpm cleanroom:status:l12-ice-knife -- --catalog "$CATALOG_ROOT" --target-root "$TARGET_ROOT" --evidence-root "$EVIDENCE_ROOT" --receipt "$RECEIPT_PATH" --intake-result "$RESULT_PATH"',
    'pnpm cleanroom:source-review:l12-ice-knife -- --catalog "$CATALOG_ROOT" --target-root "$TARGET_ROOT" --evidence-root "$EVIDENCE_ROOT" --receipt "$RECEIPT_PATH" --result "$RESULT_PATH" --measurement "$MEASUREMENT_PATH" --prompt "$PROMPT_PATH" --run-id l12-ice-knife-pilot-sol-restart-20260710T213037Z',
    'codex exec --full-auto --cd "$PWD" < "$PROMPT_PATH"',
    "```",
    "",
    "After those commands, run at least two convergent reviewer rounds covering RAW/ubiquitous-language, QNT/branch/parity, architecture/connascence, contamination/freshness, and code review. Do not resume either implementation agent, launch another target, or treat synthetic receipts as cleanroom evidence. Compare `plans/RALPH_L12_CLEANROOM_ICE_KNIFE_PILOT.md` and `plans/RALPH_L12_CLEANROOM_GUIDANCE_GENERATOR.md` against `plans/L12_CLEANROOM_EXPERIMENT_CONTRACT.md`; shared-rule findings update the canonical contract once, while scaling or corpus findings update only the full plan. End with exactly one derived transition: target /goal, fresh source review, or full-plan revision.",
    "",
  ].join("\n");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, text);
}

function parseArgs(argv) {
  const options = {
    command: "intake",
    catalog: undefined,
    targetRoot: undefined,
    evidenceRoot: undefined,
    receipt: undefined,
    output: undefined,
    result: undefined,
    runId: undefined,
    ralphEvents: undefined,
    intakeEvents: undefined,
    selfTest: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--self-test") options.selfTest = true;
    else if (
      ["intake", "measure", "status", "handoff"].includes(argument) &&
      index === 0
    )
      options.command = argument;
    else if (argument.startsWith("--") === false && index === 0)
      throw new Error(`unknown command ${argument}`);
    else if (
      [
        "--catalog",
        "--target-root",
        "--evidence-root",
        "--receipt",
        "--output",
        "--result",
        "--intake-result",
        "--run-id",
        "--ralph-events",
        "--intake-events",
      ].includes(argument)
    )
      options[
        argument === "--intake-result"
          ? "result"
          : argument.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())
      ] = argv[++index];
    else if (argument === "--help") {
      process.stdout.write(
        "usage: node scripts/cleanroom-intake.cjs <intake|measure|status|handoff> [options]\n",
      );
      return undefined;
    } else if (argument !== "--")
      throw new Error(`unknown argument ${argument}`);
  }
  return options;
}

function runSelfTest() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "cleanroom-intake-self-test-"),
  );
  const target = path.join(root, "target");
  const catalog = path.join(root, "catalog");
  const evidenceRoot = path.join(root, "evidence");
  const receiptPath = path.join(root, "receipt.json");
  const resultPath = path.join(root, "result.json");
  const run = (...args) =>
    execFileSync("git", ["-C", target, ...args], { encoding: "utf8" }).trim();
  try {
    fs.mkdirSync(target, { recursive: true });
    run("init", "-q");
    run("config", "user.email", "cleanroom-intake@example.invalid");
    run("config", "user.name", "Cleanroom intake");
    fs.writeFileSync(path.join(target, "BOOTSTRAP"), "bootstrap\n");
    run("add", "BOOTSTRAP");
    run("commit", "-q", "-m", "bootstrap");
    const start = run("rev-parse", "HEAD");
    const files = {
      "cleanroom-input/qnt/fixture.mbt.qnt": "step = 1\n",
      "src/entry": "entry\n",
      "src/projection": "projection\n",
      "target-artifacts/evidence.json": "evidence\n",
    };
    for (const [file, content] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(target, file)), { recursive: true });
      fs.writeFileSync(path.join(target, file), content);
    }
    run("add", ".");
    run("commit", "-q", "-m", "implementation");
    const finish = run("rev-parse", "HEAD");
    const hash = (file) => sha256(fs.readFileSync(path.join(target, file)));
    const projection = buildReceiptContractProjection(CONTRACT_PATH);
    fs.mkdirSync(path.join(catalog, "cleanroom-input/harness"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(catalog, "cleanroom-input/qnt"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(
        catalog,
        "cleanroom-input/harness/target-receipt-contract.json",
      ),
      stableJson(projection),
    );
    fs.writeFileSync(
      path.join(catalog, "cleanroom-input/qnt/fixture.mbt.qnt"),
      files["cleanroom-input/qnt/fixture.mbt.qnt"],
    );
    const sourceFile = (relativePath) =>
      fs.readFileSync(path.join(SOURCE_ROOT, relativePath));
    const profileBytes = sourceFile(
      "plans/cleanroom-scaffolds/target-profiles/synthetic-alpha.json",
    );
    const unitIndexBytes = Buffer.from(
      stableJson({
        units: [
          { unitId: "fixture", accountingRowIds: ["row-1", "row-2", "row-3"] },
        ],
      }),
    );
    fs.mkdirSync(path.join(catalog, "cleanroom-input/unit"), {
      recursive: true,
    });
    fs.writeFileSync(path.join(catalog, "target-profile.json"), profileBytes);
    fs.writeFileSync(
      path.join(catalog, "cleanroom-input/unit/unit-readiness-index.json"),
      unitIndexBytes,
    );
    fs.writeFileSync(path.join(catalog, "target-goal.md"), "fixture goal\n");
    fs.writeFileSync(path.join(catalog, OUTPUT_MARKER), OUTPUT_MARKER_CONTENT);
    const inputFiles = {
      "cleanroom-input/harness/target-receipt-contract.json": Buffer.from(
        stableJson(projection),
      ),
      "cleanroom-input/qnt/fixture.mbt.qnt": Buffer.from(
        files["cleanroom-input/qnt/fixture.mbt.qnt"],
      ),
      "cleanroom-input/unit/unit-readiness-index.json": unitIndexBytes,
      "target-profile.json": profileBytes,
    };
    const generatorPaths = {
      "catalog-generator": "scripts/cleanroom-experiment.cjs",
      "receipt-contract-generator": "scripts/cleanroom-target-receipt.cjs",
      "package-entrypoint": "scripts/package-cleanroom-refresh.cjs",
      "cleanroom-input-sync": "scripts/sync-cleanroom-input.cjs",
      "source-calibration-gate": "scripts/source-calibration-check.cjs",
      "unit-readiness-gate": "scripts/unit-readiness-check.cjs",
    };
    const manifestInputHashes = Object.entries(inputFiles)
      .map(([dest, content]) => ({ dest, sha256: sha256(content) }))
      .sort((left, right) => left.dest.localeCompare(right.dest));
    const manifest = {
      schema: "cleanroom-experiment-manifest.v1",
      catalogSha256: undefined,
      sourceCommitSha: git(SOURCE_ROOT, "rev-parse", "HEAD"),
      scope: { kind: "single-unit", unitIds: ["fixture"], fullCorpus: false },
      runKind: "fresh-experiment",
      finalization: {
        tag: "scoped-export",
        trackedCleanCommitVerified: false,
      },
      sourceReadiness: {
        status: "ready",
        resultSha256: sha256(
          sourceFile(
            "plans/ralph-artifacts/l12-cleanroom-ice-knife-pilot/unit-readiness-result.json",
          ),
        ),
      },
      sourceCalibration: {
        status: "passed",
        indexSha256: sha256(
          sourceFile(
            "plans/ralph-artifacts/l12-cleanroom-ice-knife-pilot/source-calibration-index.json",
          ),
        ),
      },
      generatorHashes: Object.entries(generatorPaths).map(
        ([role, relativePath]) => ({
          role,
          sha256: sha256(sourceFile(relativePath)),
        }),
      ),
      canonicalContractSha256: sha256(
        sourceFile("plans/L12_CLEANROOM_EXPERIMENT_CONTRACT.md"),
      ),
      targetProfile: { id: "synthetic-alpha" },
      inputHashes: manifestInputHashes,
      cleanroomUnitIndexSha256: sha256(unitIndexBytes),
      receiptContractProjectionSha256: sha256(
        inputFiles["cleanroom-input/harness/target-receipt-contract.json"],
      ),
      emptyStatusOutputSha256: EMPTY_STATUS_SHA256,
      selectedBranches: [
        {
          driverPath: "cleanroom-input/qnt/fixture.mbt.qnt",
          branchAction: "step",
          qntFileSha256: hash("cleanroom-input/qnt/fixture.mbt.qnt"),
          calibratedObligationIds: ["fixture.obligation"],
          replayLane: "native-qnt-mbt",
          targetEvidence: {
            productionEntrypoint: "required",
            productionProjection: "required",
          },
        },
      ],
      targetGoalPath: "target-goal.md",
      receiptPath: "target-receipt.json",
    };
    manifest.targetProfile.sha256 = sha256(profileBytes);
    manifest.targetProfile.projectionSha256 = sha256(profileBytes);
    const catalogCopies = Object.entries(inputFiles).map(([dest, content]) => ({
      dest,
      content,
    }));
    manifest.catalogSha256 = sha256Text(
      exportStableJson(
        catalogBasis(
          { ...manifest, catalogSha256: undefined },
          catalogCopies,
          "fixture goal\n",
        ),
      ),
    );
    fs.writeFileSync(path.join(catalog, "manifest.json"), stableJson(manifest));
    const ref = (file) => ({ path: file, sha256: hash(file) });
    const unavailableFields = Object.fromEntries(
      projection.measurementFields.map((field) => [
        field,
        unavailable("fixture"),
      ]),
    );
    let receipt = {
      schema: projection.schema,
      version: projection.version,
      runKind: "fresh-experiment",
      manifest: {
        catalogSha256: manifest.catalogSha256,
        sourceCommitSha: manifest.sourceCommitSha,
        targetProfileId: "synthetic-alpha",
        runKind: "fresh-experiment",
      },
      scope: manifest.scope,
      targetStartCommit: start,
      targetStartStatus: {
        command: "git status --porcelain=v2",
        clean: true,
        outputSha256: EMPTY_STATUS_SHA256,
        implementationBoundary: { tag: "none" },
      },
      targetFinishCommit: finish,
      targetFinishStatus: {
        command: "git status --porcelain=v2",
        clean: true,
        outputSha256: EMPTY_STATUS_SHA256,
        implementationBoundary: { tag: "none" },
      },
      ancestorProof: {
        verified: true,
        command:
          "git merge-base --is-ancestor targetStartCommit targetFinishCommit",
        outputSha256: EMPTY_STATUS_SHA256,
      },
      targetOutcome: { tag: "completed" },
      branchObservations: [
        {
          driverPath: "cleanroom-input/qnt/fixture.mbt.qnt",
          branchAction: "step",
          qntFileSha256: hash("cleanroom-input/qnt/fixture.mbt.qnt"),
          observedActionTaken: "step",
          replayLane: { tag: "native-qnt-mbt" },
          production: {
            entrypoint: ref("src/entry"),
            projection: ref("src/projection"),
          },
          evidencePath: "target-artifacts/evidence.json",
          evidenceSha256: hash("target-artifacts/evidence.json"),
        },
      ],
      retainedArtifacts: [
        ref("src/entry"),
        ref("src/projection"),
        ref("target-artifacts/evidence.json"),
      ],
      timing: {
        startedAt: "2026-01-01T00:00:00.000Z",
        finishedAt: "2026-01-01T00:01:00.000Z",
      },
      measurementProvenance: unavailableFields,
      nextAction: "source-intake",
    };
    fs.writeFileSync(receiptPath, stableJson(receipt));
    for (const relativePath of [
      "src/entry",
      "src/projection",
      "target-artifacts/evidence.json",
    ]) {
      const destination = path.join(evidenceRoot, relativePath);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(path.join(target, relativePath), destination);
    }
    const good = intake({
      catalogRoot: catalog,
      targetRoot: target,
      evidenceRoot,
      receiptPath,
      outputPath: resultPath,
    });
    if (!good.accepted || good.accounting.rowIds.length !== 3)
      throw new Error("conformance fixture was not atomically accepted");
    const firstResultBytes = fs.readFileSync(resultPath);
    intake({
      catalogRoot: catalog,
      targetRoot: target,
      evidenceRoot,
      receiptPath,
      outputPath: resultPath,
    });
    if (!firstResultBytes.equals(fs.readFileSync(resultPath)))
      throw new Error("re-intake was not idempotent");
    const completeManifestBytes = fs.readFileSync(
      path.join(catalog, "manifest.json"),
    );
    const incompleteManifest = JSON.parse(completeManifestBytes);
    delete incompleteManifest.generatorHashes;
    fs.writeFileSync(
      path.join(catalog, "manifest.json"),
      stableJson(incompleteManifest),
    );
    const incomplete = intake({
      catalogRoot: catalog,
      targetRoot: target,
      evidenceRoot,
      receiptPath,
      outputPath: `${resultPath}.incomplete-manifest`,
    });
    if (
      incomplete.accepted ||
      incomplete.nextAction !== "fresh-source-review" ||
      !incomplete.blockers.some((entry) => entry.code === "incomplete-manifest")
    )
      throw new Error("incomplete manifest was accepted or misrouted");
    fs.writeFileSync(
      path.join(catalog, "manifest.json"),
      completeManifestBytes,
    );
    const validStatus = JSON.parse(
      execFileSync(
        process.execPath,
        [
          __filename,
          "status",
          "--catalog",
          catalog,
          "--target-root",
          target,
          "--evidence-root",
          evidenceRoot,
          "--receipt",
          receiptPath,
          "--intake-result",
          resultPath,
        ],
        { encoding: "utf8" },
      ),
    );
    if (validStatus.nextTransition !== "full-plan-revision")
      throw new Error(
        "valid status artifacts did not derive full-plan-revision",
      );
    const noCatalogStatus = JSON.parse(
      execFileSync(
        process.execPath,
        [__filename, "status", "--catalog", path.join(root, "missing-catalog")],
        { encoding: "utf8" },
      ),
    );
    if (noCatalogStatus.nextTransition === "target-goal")
      throw new Error("missing catalog incorrectly directed target launch");
    const targetFailureReceipt = JSON.parse(stableJson(receipt));
    targetFailureReceipt.targetOutcome = {
      tag: "blocked",
      observations: [
        {
          tag: "implementation-failure",
          subject: "target-artifacts/failure.json",
          evidence: ref("target-artifacts/evidence.json"),
        },
      ],
    };
    targetFailureReceipt.branchObservations = [];
    fs.writeFileSync(receiptPath, stableJson(targetFailureReceipt));
    const targetFailureResultPath = `${resultPath}.target-failure`;
    const targetFailureResult = intake({
      catalogRoot: catalog,
      targetRoot: target,
      evidenceRoot,
      receiptPath,
      outputPath: targetFailureResultPath,
    });
    if (
      targetFailureResult.nextAction !== "target-implementation-same-manifest"
    )
      throw new Error(
        "target-only intake did not permit same-manifest continuation",
      );
    const targetFailureStatus = JSON.parse(
      execFileSync(
        process.execPath,
        [
          __filename,
          "status",
          "--catalog",
          catalog,
          "--target-root",
          target,
          "--evidence-root",
          evidenceRoot,
          "--receipt",
          receiptPath,
          "--intake-result",
          targetFailureResultPath,
        ],
        { encoding: "utf8" },
      ),
    );
    if (targetFailureStatus.nextTransition !== "target-goal")
      throw new Error("target-only status did not derive target-goal");
    fs.writeFileSync(receiptPath, stableJson(receipt));
    fs.writeFileSync(receiptPath, "{ malformed target receipt\n");
    const malformedReceiptResultPath = `${resultPath}.malformed-receipt`;
    const malformedReceiptResult = intake({
      catalogRoot: catalog,
      targetRoot: target,
      evidenceRoot,
      receiptPath,
      outputPath: malformedReceiptResultPath,
    });
    if (
      malformedReceiptResult.nextAction !==
        "target-implementation-same-manifest" ||
      malformedReceiptResult.blockers.some(
        (entry) => entry.blockerClass !== "target-implementation",
      ) ||
      !malformedReceiptResult.blockers.some(
        (entry) => entry.code === "receipt-unreadable",
      )
    )
      throw new Error("malformed receipt was misclassified or misrouted");
    const malformedReceiptStatus = JSON.parse(
      execFileSync(
        process.execPath,
        [
          __filename,
          "status",
          "--catalog",
          catalog,
          "--target-root",
          target,
          "--evidence-root",
          evidenceRoot,
          "--receipt",
          receiptPath,
          "--intake-result",
          malformedReceiptResultPath,
        ],
        { encoding: "utf8" },
      ),
    );
    if (malformedReceiptStatus.nextTransition !== "target-goal")
      throw new Error("malformed receipt intake/status transitions diverged");
    fs.writeFileSync(receiptPath, stableJson(receipt));
    const statusForEvidence = (rootPath) =>
      JSON.parse(
        execFileSync(
          process.execPath,
          [
            __filename,
            "status",
            "--catalog",
            catalog,
            "--target-root",
            target,
            "--evidence-root",
            rootPath,
            "--receipt",
            receiptPath,
            "--intake-result",
            resultPath,
          ],
          { encoding: "utf8" },
        ),
      );
    const intakeForEvidence = (rootPath, label) =>
      intake({
        catalogRoot: catalog,
        targetRoot: target,
        evidenceRoot: rootPath,
        receiptPath,
        outputPath: `${resultPath}.${label}`,
      });
    const missingEvidenceRoot = `${evidenceRoot}.missing`;
    fs.renameSync(evidenceRoot, missingEvidenceRoot);
    if (
      statusForEvidence(evidenceRoot).nextTransition !==
        "fresh-source-review" ||
      !intakeForEvidence(evidenceRoot, "missing-evidence").blockers.some(
        (entry) => entry.code === "evidence-root-missing",
      )
    )
      throw new Error("missing evidence root was accepted");
    fs.renameSync(missingEvidenceRoot, evidenceRoot);
    fs.writeFileSync(path.join(evidenceRoot, "unrelated.txt"), "unrelated\n");
    if (
      statusForEvidence(evidenceRoot).nextTransition !==
        "fresh-source-review" ||
      !intakeForEvidence(evidenceRoot, "unrelated-evidence").blockers.some(
        (entry) => entry.code === "evidence-unexpected",
      )
    )
      throw new Error("unrelated evidence was accepted");
    fs.rmSync(path.join(evidenceRoot, "unrelated.txt"));
    const evidenceFile = path.join(evidenceRoot, "src/entry");
    const evidenceBytes = fs.readFileSync(evidenceFile);
    fs.writeFileSync(evidenceFile, "tampered\n");
    if (
      statusForEvidence(evidenceRoot).nextTransition !==
        "fresh-source-review" ||
      !intakeForEvidence(evidenceRoot, "mismatched-evidence").blockers.some(
        (entry) => entry.code === "evidence-hash-mismatch",
      )
    )
      throw new Error("hash-mismatched evidence was accepted");
    fs.writeFileSync(evidenceFile, evidenceBytes);
    const promptPath = path.join(root, "source-review-prompt.md");
    const sourceReview = JSON.parse(
      execFileSync(
        process.execPath,
        [
          path.join(SOURCE_ROOT, "scripts/cleanroom-source-review.cjs"),
          "--catalog",
          catalog,
          "--target-root",
          target,
          "--evidence-root",
          evidenceRoot,
          "--receipt",
          receiptPath,
          "--result",
          resultPath,
          "--measurement",
          path.join(root, "source-review-measurement.json"),
          "--prompt",
          promptPath,
        ],
        { cwd: SOURCE_ROOT, encoding: "utf8" },
      ),
    );
    const prompt = fs.readFileSync(promptPath, "utf8");
    if (
      sourceReview.reviewerLoopRounds !== 2 ||
      !sourceReview.freshAgentInvocation.includes("codex exec") ||
      !prompt.includes("Round 1") ||
      !prompt.includes("Round 2") ||
      !prompt.includes("at least two rounds") ||
      !prompt.includes(
        "additional rounds until no reasonable finding remains",
      ) ||
      !prompt.includes("source-review-recommendations.md") ||
      !prompt.includes("source-review-convergence.md") ||
      !prompt.includes("L12_CLEANROOM_EXPERIMENT_CONTRACT.md")
    )
      throw new Error("fresh source-review prompt was incomplete");
    const handoffPath = path.join(root, "real-experiment-handoff.md");
    renderHandoff(handoffPath);
    const handoff = fs.readFileSync(handoffPath, "utf8");
    const preLaunchStatus =
      "pnpm cleanroom:status:l12-ice-knife -- --catalog /workspace/typescript/dnd-cleanroom-ice-knife-final";
    if (
      handoff.indexOf(preLaunchStatus) < handoff.indexOf("--finalize") ||
      handoff.indexOf(preLaunchStatus) >
        handoff.indexOf("## Executable source-review procedure")
    )
      throw new Error(
        "handoff omitted the pre-target catalog status transition",
      );
    const staleResult = JSON.parse(fs.readFileSync(resultPath, "utf8"));
    staleResult.bindings.receiptSha256 = "f".repeat(64);
    fs.writeFileSync(resultPath, stableJson(staleResult));
    const staleStatus = JSON.parse(
      execFileSync(
        process.execPath,
        [
          __filename,
          "status",
          "--catalog",
          catalog,
          "--target-root",
          target,
          "--evidence-root",
          evidenceRoot,
          "--receipt",
          receiptPath,
          "--intake-result",
          resultPath,
        ],
        { encoding: "utf8" },
      ),
    );
    if (staleStatus.nextTransition !== "fresh-source-review")
      throw new Error("stale status result was trusted");
    fs.writeFileSync(resultPath, firstResultBytes);
    const cases = [
      [
        "source-qnt",
        () => {
          receipt.targetOutcome = {
            tag: "blocked",
            observations: [
              {
                tag: "contradictory-copied-input",
                subject: "cleanroom-input/qnt/fixture.mbt.qnt",
                evidence: ref("target-artifacts/evidence.json"),
              },
            ],
          };
          receipt.branchObservations = [];
        },
        "source-qnt-corpus",
        ["target-observation-contradictory-copied-input"],
      ],
      [
        "scope",
        () => {
          receipt.targetOutcome = { tag: "completed" };
          receipt.branchObservations = [];
          receipt.scope = { ...manifest.scope, unitIds: ["other"] };
        },
        "source-scope",
        [
          "scope-contradiction",
          "receipt-contract-invalid",
          "missing-branch-observation",
          "selected-branch-cardinality",
        ],
      ],
      [
        "stale",
        () => {
          receipt.scope = manifest.scope;
          receipt.manifest.catalogSha256 = "c".repeat(64);
        },
        "source-scope",
        ["stale-manifest"],
      ],
      [
        "missing-branch",
        () => {
          receipt.manifest.catalogSha256 = manifest.catalogSha256;
          receipt.targetOutcome = { tag: "completed" };
          receipt.branchObservations = [];
        },
        "target-implementation",
        [
          "receipt-contract-invalid",
          "missing-branch-observation",
          "selected-branch-cardinality",
        ],
      ],
      [
        "adapter-only",
        () => {
          receipt.branchObservations = [
            {
              ...receipt.branchObservations[0],
              replayLane: { tag: "adapter-only" },
            },
          ];
        },
        "target-implementation",
        ["receipt-contract-invalid"],
      ],
      [
        "target-failure",
        () => {
          receipt.branchObservations = [];
          receipt.targetOutcome = {
            tag: "blocked",
            observations: [
              {
                tag: "implementation-failure",
                subject: "target-artifacts/failure.json",
                evidence: ref("target-artifacts/evidence.json"),
              },
            ],
          };
        },
        "target-implementation",
        ["target-observation-implementation-failure"],
      ],
      [
        "malformed-target-protocol",
        () => {
          receipt.timing = {
            startedAt: "not-a-timestamp",
            finishedAt: "also-bad",
          };
        },
        "target-implementation",
        ["receipt-contract-invalid", "receipt-contract-invalid"],
      ],
    ];
    for (const [name, mutate, blocker, expectedCodes] of cases) {
      const base = JSON.parse(stableJson(receipt));
      mutate();
      fs.writeFileSync(receiptPath, stableJson(receipt));
      const outcome = intake({
        catalogRoot: catalog,
        targetRoot: target,
        evidenceRoot,
        receiptPath,
        outputPath: `${resultPath}.${name}`,
      });
      if (!outcome.blockers.some((entry) => entry.blockerClass === blocker))
        throw new Error(`${name} fixture did not classify as ${blocker}`);
      const actualCodes = outcome.blockers.map((entry) => entry.code).sort();
      if (stableJson(actualCodes) !== stableJson([...expectedCodes].sort()))
        throw new Error(
          `${name} fixture accumulated ${stableJson(actualCodes)} instead of ${stableJson(expectedCodes)}`,
        );
      receipt = base;
    }
    fs.writeFileSync(receiptPath, stableJson(receipt));
    const events = path.join(root, "events.tsv");
    fs.writeFileSync(
      events,
      "2026-01-01T00:00:00.000Z\trun\tstart\n2026-01-01T00:00:01.000Z\ttask\tstart task=1\n2026-01-01T00:00:02.000Z\ttask\timplementation-start task=1 round=1\n2026-01-01T00:00:03.000Z\ttask\timplementation-finished task=1 round=1\n2026-01-01T00:00:04.000Z\ttask\timplementation-reviewed task=1 round=1\n2026-01-01T00:00:05.000Z\ttask\timplementation-handoff task=1 round=1\n2026-01-01T00:00:06.000Z\ttask\timplementation-start task=1 round=2\n2026-01-01T00:00:07.000Z\ttask\timplementation-finished task=1 round=2\n2026-01-01T00:00:08.000Z\ttask\timplementation-reviewed task=1 round=2\n2026-01-01T00:00:09.000Z\ttask\timplementation-handoff task=1 round=2\n2026-01-01T00:00:10.000Z\ttask\tcomplete task=1\n2026-01-01T00:00:11.000Z\trun\tdone\n",
    );
    const measurement = measure({
      receiptPath,
      resultPath,
      ralphEventsPath: events,
      intakeEventsPath: `${resultPath}.events.tsv`,
      outputPath: `${root}/measurement.json`,
    });
    if (
      measurement.targetGoal.freshExperiment.tag !== "reported" ||
      measurement.sourceRalph.tag !== "reported" ||
      measurement.sourceRalph.value.phases.filter(
        (phase) => phase.phase === "implementation",
      ).length !== 2 ||
      measurement.sourceRalph.value.phases.find(
        (phase) => phase.phase === "task",
      )?.elapsed.tag !== "reported"
    )
      throw new Error("measurement fixture was not reported");
    if (
      Object.keys(measurement.measurementProvenance).length !==
        projection.measurementFields.length ||
      measurement.targetGoal.diagnosticRehearsal.tag !== "unavailable" ||
      measurement.totalWall.tag !== "reported" ||
      measurement.sourceRalph.value.phases.some(
        (phase) => "startedAt" in phase || "finishedAt" in phase,
      ) ||
      measurement.totalWall.value.elapsedMs < 60_000
    )
      throw new Error("measurement variants were not explicit");
    const malformedProvenanceReceipt = JSON.parse(stableJson(receipt));
    const malformedFields = projection.measurementFields;
    malformedProvenanceReceipt.measurementProvenance[malformedFields[0]] = {};
    malformedProvenanceReceipt.measurementProvenance[malformedFields[1]] = {
      tag: "invalid",
    };
    malformedProvenanceReceipt.measurementProvenance[malformedFields[2]] = {
      tag: "reported",
      value: "",
    };
    fs.writeFileSync(receiptPath, stableJson(malformedProvenanceReceipt));
    const malformedMeasurement = measure({
      receiptPath,
      resultPath,
      ralphEventsPath: events,
      intakeEventsPath: `${resultPath}.events.tsv`,
      outputPath: `${root}/measurement-malformed-provenance.json`,
    });
    if (
      Object.keys(malformedMeasurement.measurementProvenance).length !==
        projection.measurementFields.length ||
      malformedMeasurement.measurementProvenance[malformedFields[0]].tag !==
        "unavailable" ||
      malformedMeasurement.measurementProvenance[malformedFields[1]].tag !==
        "unavailable" ||
      malformedMeasurement.measurementProvenance[malformedFields[2]].tag !==
        "unavailable"
    )
      throw new Error("malformed measurement provenance was not normalized");
    fs.writeFileSync(receiptPath, stableJson(receipt));
    const unavailableMeasurement = measure({
      receiptPath,
      resultPath,
      ralphEventsPath: path.join(root, "missing-events.tsv"),
      intakeEventsPath: path.join(root, "missing-intake-events.tsv"),
      outputPath: `${root}/measurement-unavailable.json`,
    });
    if (
      unavailableMeasurement.sourceRalph.tag !== "unavailable" ||
      unavailableMeasurement.intake.tag !== "unavailable" ||
      unavailableMeasurement.totalWall.tag !== "unavailable"
    )
      throw new Error("unavailable measurement clocks were not preserved");
    process.stdout.write(
      "cleanroom intake self-test OK (commit, branch, blocker, idempotence, and measurement fixtures).\n",
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options === undefined) return;
  if (options.selfTest) {
    runSelfTest();
    return;
  }
  if (options.command === "intake") {
    if (
      !options.catalog ||
      !options.targetRoot ||
      !options.evidenceRoot ||
      !options.receipt ||
      !options.output
    )
      throw new Error(
        "intake requires --catalog, --target-root, --evidence-root, --receipt, and --output",
      );
    const result = intake({
      catalogRoot: path.resolve(options.catalog),
      targetRoot: path.resolve(options.targetRoot),
      evidenceRoot: path.resolve(options.evidenceRoot),
      receiptPath: path.resolve(options.receipt),
      outputPath: path.resolve(options.output),
    });
    process.stdout.write(`${stableJson(result)}`);
    return;
  }
  if (options.command === "measure") {
    if (!options.receipt || !options.output)
      throw new Error("measure requires --receipt and --output");
    const runId = options.runId ?? "";
    const ralphEvents =
      options.ralphEvents ??
      path.join(SOURCE_ROOT, ".ralph/runs", runId, "events.tsv");
    const resultPath = options.result;
    const intakeEvents =
      options.intakeEvents ??
      (resultPath ? `${path.resolve(resultPath)}.events.tsv` : undefined);
    const report = measure({
      receiptPath: path.resolve(options.receipt),
      resultPath: resultPath ? path.resolve(resultPath) : undefined,
      ralphEventsPath: ralphEvents,
      intakeEventsPath: intakeEvents,
      outputPath: path.resolve(options.output),
    });
    process.stdout.write(`${stableJson(report)}`);
    return;
  }
  if (options.command === "status") {
    status({
      catalogRoot: options.catalog && path.resolve(options.catalog),
      targetRoot: options.targetRoot && path.resolve(options.targetRoot),
      receiptPath: options.receipt && path.resolve(options.receipt),
      intakeResultPath: options.result && path.resolve(options.result),
      evidenceRoot: options.evidenceRoot && path.resolve(options.evidenceRoot),
    });
    return;
  }
  if (options.command === "handoff") {
    renderHandoff(
      path.resolve(
        options.output ??
          "plans/ralph-artifacts/l12-cleanroom-ice-knife-pilot/real-experiment-handoff.md",
      ),
    );
    return;
  }
  throw new Error(`unsupported command ${options.command}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`cleanroom intake: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  intake,
  measure,
  parseEvents,
  renderHandoff,
  status,
  validateSelectedBranches,
};
