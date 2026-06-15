#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const {
  sha256Text,
  stableStringify,
  validateTargetReplayEvidence,
} = require("./cleanroom-branch-coverage-check.cjs");

const selfTest = process.argv.includes("--self-test");
const SOURCE_SCOPE_SNAPSHOT_PATH = path.resolve(
  __dirname,
  "../plans/cleanroom-scaffolds/tasks/LEVEL_1_2_SCOPE.snapshot.md",
);

const requiredReviewChecklists = [
  "raw-qnt-traceability",
  "ubiquitous-language-domain",
  "architecture-connascence",
  "branch-coverage",
  "code-shape-depth",
  "adapter-quarantine",
  "engine-depth",
  "state-owner-derivability",
  "authored-identity-dispatch",
  "report-honesty",
];

const requiredDeciderGates = [
  "start-gate",
  "branch-coverage",
  "adapter-quarantine",
  "engine-depth",
  "state-owner-derivability",
  "authored-identity-dispatch",
  "report-honesty",
  "reviewer-loop-convergence",
];

const engineModuleRoles = new Set([
  "domain-engine",
  "domain-api",
  "rule-facts",
  "runtime-projection",
]);

const stateOwners = new Set([
  "authored-provenance",
  "structured-input",
  "build-evidence",
  "sheet-state",
  "battle-state",
  "executable-boundary-projection",
  "harness-witness-protocol",
]);

const harnessWitnessProtocolNames = [
  "mbt::actionTaken",
  "mbt::nondetPicks",
  "observedActionTaken",
  "traceId",
  "qntFileSha256",
  "sourceBranchInventorySha256",
  "cleanroomManifestSourceCommitSha",
  "targetProfile",
  "targetProfileSha256",
  "stateCheck",
  "comparator",
  "expectedProjectionSha256",
  "observedProjectionSha256",
  "checkedTargetStateFields",
  "harnessTestPath",
];

const skippedSourceDirs = new Set([
  ".git",
  "node_modules",
  "dist",
  "coverage",
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

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readJsonIfExists(filePath) {
  return fs.existsSync(filePath) ? readJson(filePath) : undefined;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, stableStringify(value));
}

function sha256File(filePath) {
  return sha256Text(fs.readFileSync(filePath));
}

function repoPath(rootPath, filePath) {
  return path.relative(rootPath, filePath).split(path.sep).join("/");
}

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function listFiles(rootPath, acceptFile) {
  if (!fs.existsSync(rootPath)) return [];
  const files = [];
  for (const entry of fs.readdirSync(rootPath, { withFileTypes: true })) {
    if (skippedSourceDirs.has(entry.name)) continue;
    const entryPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(entryPath, acceptFile));
      continue;
    }
    if (entry.isFile() && acceptFile(entryPath)) files.push(entryPath);
  }
  return files.sort();
}

function normalizeProtocolName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function containsProtocolName(value, protocolName) {
  const needle = normalizeProtocolName(protocolName);
  if (needle.length === 0) return false;
  return normalizeProtocolName(value).includes(needle);
}

function validateString(value, context, issues) {
  if (typeof value !== "string" || value.trim() === "") {
    issues.push(`${context} must be a non-empty string.`);
  }
}

function validateStringArray(value, context, issues) {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((item) => typeof item !== "string" || item.trim() === "")
  ) {
    issues.push(`${context} must be a non-empty string array.`);
  }
}

function validateHarnessProfile(profile, issues) {
  if (!isRecord(profile)) {
    issues.push("target profile is required for cleanroom harness acceptance.");
    return;
  }
  for (const field of ["targetProfileId", "enginePath"]) {
    validateString(profile[field], `target profile ${field}`, issues);
  }
  validateStringArray(
    profile.sourceFileExtensions,
    "target profile sourceFileExtensions",
    issues,
  );
  if (
    typeof profile.enginePath === "string" &&
    (path.isAbsolute(profile.enginePath) ||
      profile.enginePath.split(/[\\/]/).includes(".."))
  ) {
    issues.push("target profile enginePath must be a relative path inside the cleanroom repo.");
  }
  if (Array.isArray(profile.sourceFileExtensions)) {
    for (const extension of profile.sourceFileExtensions) {
      if (
        typeof extension === "string" &&
        (!extension.startsWith(".") ||
          extension.includes("/") ||
          extension.includes("\\"))
      ) {
        issues.push(
          `target profile sourceFileExtensions entry ${extension} must be a file extension like .ext.`,
        );
      }
    }
  }
}

function isUsableHarnessProfile(profile) {
  return (
    isRecord(profile) &&
    typeof profile.targetProfileId === "string" &&
    profile.targetProfileId.trim() !== "" &&
    typeof profile.enginePath === "string" &&
    profile.enginePath.trim() !== "" &&
    !path.isAbsolute(profile.enginePath) &&
    !profile.enginePath.split(/[\\/]/).includes("..") &&
    Array.isArray(profile.sourceFileExtensions) &&
    profile.sourceFileExtensions.length > 0 &&
    profile.sourceFileExtensions.every(
      (extension) =>
        typeof extension === "string" &&
        extension.startsWith(".") &&
        !extension.includes("/") &&
        !extension.includes("\\"),
    )
  );
}


function isSafeRelativePath(relativePath) {
  return (
    typeof relativePath === "string" &&
    relativePath.trim() !== "" &&
    !path.isAbsolute(relativePath) &&
    !relativePath.split(/[\\/]/).includes("..")
  );
}

function readRequiredArtifact(rootPath, relativePath, issues) {
  const artifactPath = path.join(rootPath, relativePath);
  const artifact = readJsonIfExists(artifactPath);
  if (artifact === undefined) {
    issues.push(`${relativePath} is missing.`);
  }
  return artifact;
}

function readCleanroomManifest(rootPath, issues) {
  const manifestPath = path.join(rootPath, "cleanroom-input/MANIFEST.md");
  if (!fs.existsSync(manifestPath)) {
    issues.push("cleanroom-input/MANIFEST.md is missing.");
    return undefined;
  }
  const manifest = fs.readFileSync(manifestPath, "utf8");
  const match = manifest.match(/^- Source commit SHA:\s*([0-9a-f]{40})\s*$/im);
  if (match === null) {
    issues.push("cleanroom-input/MANIFEST.md must record a full Source commit SHA.");
  }
  const fileHashes = new Map();
  for (const [lineIndex, line] of manifest.split("\n").entries()) {
    const row = line.match(
      /^\|\s*`([^`]+)`\s*\|\s*`([0-9a-f]{64})`\s*\|\s*`([^`]*)`\s*\|/i,
    );
    if (row === null) continue;
    const relativePath = row[1];
    const expectedSha = row[2].toLowerCase();
    if (!isSafeRelativePath(relativePath)) {
      issues.push(
        `cleanroom-input/MANIFEST.md:${lineIndex + 1} has unsafe file path ${relativePath}.`,
      );
      continue;
    }
    const filePath = path.join(rootPath, "cleanroom-input", relativePath);
    if (!fs.existsSync(filePath)) {
      issues.push(
        `cleanroom-input/MANIFEST.md:${lineIndex + 1} lists missing cleanroom-input/${relativePath}.`,
      );
      continue;
    }
    const actualSha = sha256File(filePath);
    if (actualSha !== expectedSha) {
      issues.push(
        `cleanroom-input/MANIFEST.md:${lineIndex + 1} hash for cleanroom-input/${relativePath} is stale: expected ${expectedSha}, got ${actualSha}.`,
      );
    }
    fileHashes.set(relativePath, expectedSha);
  }
  if (fileHashes.size === 0) {
    issues.push("cleanroom-input/MANIFEST.md must include per-file inventory hashes.");
  }
  return {
    sourceCommitSha: match?.[1],
    fileHashes,
  };
}

function targetProfileSha256(profile) {
  return sha256Text(stableStringify(profile));
}

function validateCleanroomInputIntegrity({
  rootPath,
  inventory,
  cleanroomManifest,
  issues,
}) {
  if (!isRecord(inventory) || cleanroomManifest === undefined) return;
  const inventoryManifestPath = "branch-coverage/source-branch-inventory.json";
  if (!cleanroomManifest.fileHashes.has(inventoryManifestPath)) {
    issues.push(
      "cleanroom-input/MANIFEST.md must include branch-coverage/source-branch-inventory.json.",
    );
  }
  const checkedDrivers = new Set();
  for (const obligation of inventory.branchObligations ?? []) {
    if (!isRecord(obligation) || typeof obligation.driverPath !== "string") continue;
    if (checkedDrivers.has(obligation.driverPath)) continue;
    checkedDrivers.add(obligation.driverPath);
    if (!obligation.driverPath.startsWith("cleanroom-input/")) {
      issues.push(
        `${obligation.driverPath}: source branch inventory driverPath must be cleanroom-input local.`,
      );
      continue;
    }
    const manifestPath = obligation.driverPath.slice("cleanroom-input/".length);
    const qntFilePath = path.join(rootPath, obligation.driverPath);
    const manifestSha = cleanroomManifest.fileHashes.get(manifestPath);
    if (manifestSha === undefined) {
      issues.push(
        `cleanroom-input/MANIFEST.md must include copied QNT driver ${manifestPath}.`,
      );
    }
    if (!fs.existsSync(qntFilePath)) {
      issues.push(`${obligation.driverPath}: copied QNT driver is missing.`);
      continue;
    }
    const actualSha = sha256File(qntFilePath);
    if (manifestSha !== undefined && manifestSha !== actualSha) {
      issues.push(
        `${obligation.driverPath}: cleanroom manifest hash ${manifestSha} does not match copied file ${actualSha}.`,
      );
    }
    if (obligation.qntFileSha256 !== actualSha) {
      issues.push(
        `${obligation.driverPath}: source branch inventory qntFileSha256 ${obligation.qntFileSha256} does not match copied file ${actualSha}.`,
      );
    }
  }
}

function selectedInventory(inventory, selectedDrivers) {
  const selected = new Set(selectedDrivers);
  return {
    ...inventory,
    branchObligations: (inventory.branchObligations ?? []).filter((entry) =>
      selected.has(entry.driverPath),
    ),
    sampledInputs: (inventory.sampledInputs ?? []).filter((entry) =>
      selected.has(entry.driverPath),
    ),
  };
}

function requiredSelectedObligations(inventory) {
  return (inventory.branchObligations ?? []).filter(
    (entry) =>
      entry.scope?.tag === "in-scope" && entry.replay?.tag !== "source-blocker",
  );
}

function readExpectedScopeSnapshot(rootPath, issues) {
  if (fs.existsSync(SOURCE_SCOPE_SNAPSHOT_PATH)) {
    return fs.readFileSync(SOURCE_SCOPE_SNAPSHOT_PATH, "utf8");
  }
  try {
    return execFileSync(
      "git",
      ["-C", rootPath, "show", "HEAD:tasks/LEVEL_1_2_SCOPE.md"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch (_error) {
    issues.push(
      "source cleanroom LEVEL_1_2_SCOPE snapshot is missing and git HEAD does not contain tasks/LEVEL_1_2_SCOPE.md.",
    );
    return undefined;
  }
}

function activeQueuedDrivers(rootPath, issues) {
  const scopePath = path.join(rootPath, "tasks/LEVEL_1_2_SCOPE.md");
  if (!fs.existsSync(scopePath)) {
    issues.push("tasks/LEVEL_1_2_SCOPE.md is missing.");
    return [];
  }
  const expectedScope = readExpectedScopeSnapshot(rootPath, issues);
  if (expectedScope !== undefined) {
    const actualScope = fs.readFileSync(scopePath, "utf8");
    if (actualScope !== expectedScope) {
      issues.push(
        "tasks/LEVEL_1_2_SCOPE.md must match the source-owned LEVEL_1_2_SCOPE snapshot; do not reorder the queue in target tasks.",
      );
    }
  }
  const lines = fs.readFileSync(scopePath, "utf8").split("\n");
  const start = lines.findIndex((line) =>
    /^##\s+Current Branch-Inventory-Ready Queue\s*$/.test(line),
  );
  if (start === -1) {
    issues.push("tasks/LEVEL_1_2_SCOPE.md must contain Current Branch-Inventory-Ready Queue.");
    return [];
  }
  const queued = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s+/.test(line)) break;
    const match = line.match(/^\s*\d+\.\s+`([^`]+)`/);
    if (match !== null) queued.push(match[1]);
  }
  if (queued.length === 0) {
    issues.push("Current Branch-Inventory-Ready Queue must list at least one driver.");
  }
  return queued;
}

function validateActiveWork(activeWork, issues) {
  if (!isRecord(activeWork)) return new Map();
  if (activeWork.schemaVersion !== 1) {
    issues.push("tasks/ACTIVE_WORK.json schemaVersion must be 1.");
  }
  if (!Array.isArray(activeWork.assignments) || activeWork.assignments.length === 0) {
    issues.push("tasks/ACTIVE_WORK.json assignments must be a non-empty array.");
    return new Map();
  }
  const assignments = new Map();
  for (const [assignmentIndex, assignment] of activeWork.assignments.entries()) {
    const assignmentContext = `tasks/ACTIVE_WORK.json assignments[${assignmentIndex}]`;
    if (!isRecord(assignment)) {
      issues.push(`${assignmentContext} must be an object.`);
      continue;
    }
    validateString(assignment.assignmentId, `${assignmentContext}.assignmentId`, issues);
    if (assignments.has(assignment.assignmentId)) {
      issues.push(`${assignmentContext}.assignmentId duplicates ${assignment.assignmentId}.`);
    }
    if (!Array.isArray(assignment.lanes) || assignment.lanes.length === 0) {
      issues.push(`${assignmentContext}.lanes must be a non-empty array.`);
      continue;
    }
    const lanes = new Map();
    for (const [laneIndex, lane] of assignment.lanes.entries()) {
      const laneContext = `${assignmentContext}.lanes[${laneIndex}]`;
      if (!isRecord(lane)) {
        issues.push(`${laneContext} must be an object.`);
        continue;
      }
      validateString(lane.laneId, `${laneContext}.laneId`, issues);
      if (lanes.has(lane.laneId)) {
        issues.push(`${laneContext}.laneId duplicates ${lane.laneId}.`);
      }
      validateStringArray(lane.queue, `${laneContext}.queue`, issues);
      lanes.set(lane.laneId, new Set(lane.queue ?? []));
    }
    assignments.set(assignment.assignmentId, lanes);
  }
  return assignments;
}

function git(repoRoot, args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function validateStartGate(startGate, rootPath, issues) {
  if (!isRecord(startGate)) return;
  if (startGate.schemaVersion !== 1) {
    issues.push("tasks/START_GATE.json schemaVersion must be 1.");
  }
  validateString(startGate.taskId, "tasks/START_GATE.json taskId", issues);
  validateString(
    startGate.startHeadSha,
    "tasks/START_GATE.json startHeadSha",
    issues,
  );
  if (
    typeof startGate.startHeadSha === "string" &&
    !/^[0-9a-f]{40}$/i.test(startGate.startHeadSha)
  ) {
    issues.push("tasks/START_GATE.json startHeadSha must be a full Git SHA.");
  }
  if (!isRecord(startGate.preImplementationStatus)) {
    issues.push("tasks/START_GATE.json preImplementationStatus must be an object.");
  } else {
    validateString(
      startGate.preImplementationStatus.command,
      "tasks/START_GATE.json preImplementationStatus.command",
      issues,
    );
    if (startGate.preImplementationStatus.command !== "git status --short") {
      issues.push(
        "tasks/START_GATE.json preImplementationStatus.command must be git status --short.",
      );
    }
    if (startGate.preImplementationStatus.result !== "clean") {
      issues.push(
        "tasks/START_GATE.json preImplementationStatus.result must be clean before work starts.",
      );
    }
    if (
      typeof startGate.preImplementationStatus.output === "string" &&
      startGate.preImplementationStatus.output.trim() !== ""
    ) {
      issues.push("tasks/START_GATE.json preImplementationStatus.output must be empty.");
    }
  }
  const gitDir = path.join(rootPath, ".git");
  if (!fs.existsSync(gitDir)) {
    issues.push("task root must be a git repository for start gate validation.");
  } else if (
    typeof startGate.startHeadSha === "string" &&
    /^[0-9a-f]{40}$/i.test(startGate.startHeadSha)
  ) {
    try {
      const actualHead = git(rootPath, ["rev-parse", "HEAD"]);
      git(rootPath, [
        "merge-base",
        "--is-ancestor",
        startGate.startHeadSha,
        actualHead,
      ]);
    } catch (error) {
      issues.push(
        `tasks/START_GATE.json startHeadSha is not in current HEAD history: ${error.message}`,
      );
    }
  }
  if (!isRecord(startGate.taskScope)) {
    issues.push("tasks/START_GATE.json taskScope must be an object.");
  } else {
    validateString(
      startGate.taskScope.assignmentId,
      "tasks/START_GATE.json taskScope.assignmentId",
      issues,
    );
    validateString(
      startGate.taskScope.laneId,
      "tasks/START_GATE.json taskScope.laneId",
      issues,
    );
    validateStringArray(
      startGate.taskScope.selectedDrivers,
      "tasks/START_GATE.json taskScope.selectedDrivers",
      issues,
    );
  }
}

function validateEvidenceDocs({
  rootPath,
  profile,
  inventory,
  selected,
  declaredEvidencePaths,
  expectedCleanroomManifestSourceCommitSha,
  issues,
}) {
  const expectedTargetProfileSha256 = targetProfileSha256(profile);
  const evidenceDir = path.join(rootPath, "tasks/target-replay-evidence");
  const evidenceFiles = listFiles(evidenceDir, (filePath) =>
    filePath.endsWith(".json"),
  );
  const declared = declaredEvidencePaths ?? new Set();
  const actualEvidencePaths = new Set(
    evidenceFiles.map((filePath) => repoPath(rootPath, filePath)),
  );
  const inventorySha = sha256Text(stableStringify(inventory));
  const selectedObligations = requiredSelectedObligations(selected);
  if (selectedObligations.length === 0) {
    issues.push("selected task scope has no replayable in-scope branch obligations.");
  }
  if (evidenceFiles.length === 0) {
    issues.push("tasks/target-replay-evidence has no harness-generated evidence files.");
  }

  for (const evidencePath of actualEvidencePaths) {
    if (!declared.has(evidencePath)) {
      issues.push(`${evidencePath} is not declared by tasks/ENGINE_DEPTH_MANIFEST.json.`);
    }
  }
  for (const evidencePath of declared) {
    if (!actualEvidencePaths.has(evidencePath)) {
      issues.push(`${evidencePath} is declared but missing.`);
    }
  }

  const runs = [];
  for (const filePath of evidenceFiles) {
    const context = repoPath(rootPath, filePath);
    if (!declared.has(context)) continue;
    const evidence = readJson(filePath);
    if (!isRecord(evidence)) {
      issues.push(`${context} must be an object.`);
      continue;
    }
    const perFileResult = validateTargetReplayEvidence(
      evidence,
      selected,
      inventorySha,
      {
        expectedCleanroomManifestSourceCommitSha,
        expectedTargetProfileSha256,
        requireAllObligations: false,
      },
    );
    issues.push(
      ...perFileResult.issues.map((issue) => `${context}: ${issue}`),
    );
    if (evidence.targetProfile !== profile.targetProfileId) {
      issues.push(
        `${context} targetProfile must match target profile ${profile.targetProfileId}.`,
      );
    }
    if (evidence.targetProfileSha256 !== expectedTargetProfileSha256) {
      issues.push(
        `${context} targetProfileSha256 must match target profile content hash ${expectedTargetProfileSha256}.`,
      );
    }
    if (!Array.isArray(evidence.runs)) {
      issues.push(`${context} requires runs array.`);
    } else if (perFileResult.issues.length === 0) {
      runs.push(
        ...evidence.runs.filter((run) =>
          selectedObligations.some(
            (obligation) =>
              isRecord(run) &&
              run.driverPath === obligation.driverPath &&
              run.branchFamily === obligation.branchFamily &&
              run.branchAction === obligation.branchAction,
          ),
        ),
      );
    }
  }

  const aggregateEvidence = {
    generatedBy: { tag: "target-harness", name: "aggregate-harness-check" },
    cleanroomManifestSourceCommitSha:
      expectedCleanroomManifestSourceCommitSha ?? "aggregate",
    sourceBranchInventorySha256: inventorySha,
    targetProfile: profile.targetProfileId,
    targetProfileSha256: expectedTargetProfileSha256,
    runs,
  };
  const targetEvidenceResult = validateTargetReplayEvidence(
    aggregateEvidence,
    selected,
    inventorySha,
    {
      expectedCleanroomManifestSourceCommitSha,
      expectedTargetProfileSha256,
    },
  );
  issues.push(...targetEvidenceResult.issues);
  const coveredObligationIds = new Set(targetEvidenceResult.covered);
  const coveredEvidenceRefsByObligation = new Map();
  const checkedTargetStateFields = new Set();
  for (const filePath of evidenceFiles) {
    const context = repoPath(rootPath, filePath);
    if (!declared.has(context)) continue;
    const evidence = readJson(filePath);
    if (!Array.isArray(evidence.runs)) continue;
    for (const run of evidence.runs) {
      if (!isRecord(run)) continue;
      const obligationId = `${run.driverPath}#${run.branchFamily}:${run.branchAction}`;
      if (!coveredObligationIds.has(obligationId)) continue;
      const singleRunEvidence = {
        ...evidence,
        runs: [run],
      };
      const singleRunResult = validateTargetReplayEvidence(
        singleRunEvidence,
        selected,
        inventorySha,
        {
          expectedCleanroomManifestSourceCommitSha,
          expectedTargetProfileSha256,
          requireAllObligations: false,
        },
      );
      if (!singleRunResult.covered.includes(obligationId)) continue;
      const ref = targetReplayEvidenceRef(context, run);
      if (!coveredEvidenceRefsByObligation.has(obligationId)) {
        coveredEvidenceRefsByObligation.set(obligationId, new Set());
      }
      coveredEvidenceRefsByObligation.get(obligationId).add(ref);
      for (const fieldPath of run.stateCheck?.checkedTargetStateFields ?? []) {
        if (typeof fieldPath === "string" && fieldPath.trim() !== "") {
          checkedTargetStateFields.add(fieldPath);
        }
      }
    }
  }
  return {
    coveredObligationIds,
    coveredEvidenceRefsByObligation,
    checkedTargetStateFields,
  };
}

function targetReplayEvidenceRef(context, run) {
  return `${context}#${run.traceId}#${run.branchFamily}:${run.branchAction}`;
}

function protocolNamesForObligations(selected) {
  return Array.from(
    new Set(
      (selected.branchObligations ?? [])
        .filter((entry) => entry.scope?.tag === "in-scope")
        .map((entry) => entry.branchAction),
    ),
  ).sort();
}

function forbiddenWitnessNamesForSelection(selected) {
  const sampledInputNames = (selected.sampledInputs ?? []).map(
    (input) => input.pickName,
  );
  return Array.from(
    new Set([
      ...protocolNamesForObligations(selected),
      ...sampledInputNames,
      ...harnessWitnessProtocolNames,
    ]),
  ).sort();
}

function validateManifestPath({
  relativePath,
  context,
  rootPath,
  profile,
  requireExists,
  issues,
}) {
  validateString(relativePath, context, issues);
  if (typeof relativePath !== "string" || relativePath.trim() === "") return;
  if (!isSafeRelativePath(relativePath)) {
    issues.push(`${context} must be a relative path without parent segments.`);
    return;
  }
  if (!relativePath.startsWith(`${profile.enginePath}/`)) {
    issues.push(`${context} must be under ${profile.enginePath}/.`);
  }
  if (!profile.sourceFileExtensions.includes(path.extname(relativePath))) {
    issues.push(
      `${context} must use one of target source extensions ${profile.sourceFileExtensions.join(", ")}.`,
    );
  }
  if (requireExists && !fs.existsSync(path.join(rootPath, relativePath))) {
    issues.push(`${context} references a missing file ${relativePath}.`);
  }
}

function validateEngineDepth({
  engineDepth,
  selected,
  profile,
  rootPath,
  issues,
}) {
  if (!isRecord(engineDepth)) return { adapterPaths: new Set() };
  if (engineDepth.schemaVersion !== 1) {
    issues.push("tasks/ENGINE_DEPTH_MANIFEST.json schemaVersion must be 1.");
  }
  validateString(
    engineDepth.taskId,
    "tasks/ENGINE_DEPTH_MANIFEST.json taskId",
    issues,
  );
  const productionModules = Array.isArray(engineDepth.productionModulesExtended)
    ? engineDepth.productionModulesExtended
    : [];
  if (!Array.isArray(engineDepth.productionModulesExtended)) {
    issues.push(
      "tasks/ENGINE_DEPTH_MANIFEST.json productionModulesExtended must be an array.",
    );
  }
  const adapterModules = Array.isArray(engineDepth.adapterModules)
    ? engineDepth.adapterModules
    : [];
  if (!Array.isArray(engineDepth.adapterModules)) {
    issues.push("tasks/ENGINE_DEPTH_MANIFEST.json adapterModules must be an array.");
  }
  const expectedNextReuse = Array.isArray(engineDepth.expectedNextReuse)
    ? engineDepth.expectedNextReuse
    : [];
  if (!Array.isArray(engineDepth.expectedNextReuse)) {
    issues.push(
      "tasks/ENGINE_DEPTH_MANIFEST.json expectedNextReuse must be an array.",
    );
  }
  const adapterOnly =
    engineDepth.completion?.tag === "adapter-only-with-paired-engine-task";
  if (productionModules.length === 0 && !adapterOnly) {
    issues.push(
      "engine depth manifest must record production modules or an adapter-only paired engine task.",
    );
  }
  if (adapterOnly) {
    validateString(
      engineDepth.completion.pairedTaskId,
      "tasks/ENGINE_DEPTH_MANIFEST.json completion.pairedTaskId",
      issues,
    );
  }
  if (expectedNextReuse.length === 0 && !adapterOnly) {
    issues.push(
      "engine depth manifest must record expected next reuse for the domain module.",
    );
  }

  const witnessNames = forbiddenWitnessNamesForSelection(selected);
  for (const [index, moduleRow] of productionModules.entries()) {
    const context = `tasks/ENGINE_DEPTH_MANIFEST.json productionModulesExtended[${index}]`;
    if (!isRecord(moduleRow)) {
      issues.push(`${context} must be an object.`);
      continue;
    }
    validateManifestPath({
      relativePath: moduleRow.path,
      context: `${context}.path`,
      rootPath,
      profile,
      requireExists: true,
      issues,
    });
    if (
      typeof moduleRow.path === "string" &&
      !isProductionSource(moduleRow.path, new Set())
    ) {
      issues.push(`${context}.path must be production source, not test, fixture, catalog, or selection support.`);
    }
    if (!engineModuleRoles.has(moduleRow.role)) {
      issues.push(`${context}.role must be one of ${Array.from(engineModuleRoles).join(", ")}.`);
    }
    validateStringArray(moduleRow.domainApis, `${context}.domainApis`, issues);
    if (
      typeof moduleRow.path === "string" &&
      /(?:^|\/)(?:qnt|mbt|adapter|adapters|harness|witness)(?:\/|[-_.]|$)/i.test(
        moduleRow.path,
      )
    ) {
      issues.push(`${context}.path looks like an adapter or witness path.`);
    }
    for (const witnessName of witnessNames) {
      if (containsProtocolName(moduleRow.path, witnessName)) {
        issues.push(`${context}.path leaks witness protocol name ${witnessName}.`);
      }
      for (const api of moduleRow.domainApis ?? []) {
        if (containsProtocolName(api, witnessName)) {
          issues.push(`${context}.domainApis leaks public domain API from witness protocol name ${witnessName}.`);
        }
      }
    }
  }

  const adapterPaths = new Set();
  const quarantined = new Set();
  for (const [index, adapterRow] of adapterModules.entries()) {
    const context = `tasks/ENGINE_DEPTH_MANIFEST.json adapterModules[${index}]`;
    if (!isRecord(adapterRow)) {
      issues.push(`${context} must be an object.`);
      continue;
    }
    validateManifestPath({
      relativePath: adapterRow.path,
      context: `${context}.path`,
      rootPath,
      profile,
      requireExists: true,
      issues,
    });
    if (typeof adapterRow.path === "string") {
      adapterPaths.add(adapterRow.path);
    }
    validateStringArray(
      adapterRow.quarantinedWitnessNames,
      `${context}.quarantinedWitnessNames`,
      issues,
    );
    validateStringArray(adapterRow.targetReplayEvidence, `${context}.targetReplayEvidence`, issues);
    for (const evidencePath of adapterRow.targetReplayEvidence ?? []) {
      if (!isSafeRelativePath(evidencePath)) {
        issues.push(`${context}.targetReplayEvidence path ${evidencePath} must be relative without parent segments.`);
      } else if (!evidencePath.startsWith("tasks/target-replay-evidence/")) {
        issues.push(`${context}.targetReplayEvidence path ${evidencePath} must be under tasks/target-replay-evidence/.`);
      } else if (!evidencePath.endsWith(".json")) {
        issues.push(`${context}.targetReplayEvidence path ${evidencePath} must be a JSON file.`);
      } else if (!fs.existsSync(path.join(rootPath, evidencePath))) {
        issues.push(`${context}.targetReplayEvidence references missing ${evidencePath}.`);
      }
    }
    for (const name of adapterRow.quarantinedWitnessNames ?? []) {
      quarantined.add(name);
    }
  }
  for (const witnessName of witnessNames) {
    if (!quarantined.has(witnessName)) {
      issues.push(`adapter quarantine is missing witness protocol name ${witnessName}.`);
    }
  }

  for (const [index, row] of (engineDepth.accumulatorGrowth ?? []).entries()) {
    const context = `tasks/ENGINE_DEPTH_MANIFEST.json accumulatorGrowth[${index}]`;
    if (!isRecord(row)) {
      issues.push(`${context} must be an object.`);
      continue;
    }
    if (
      row.owner === "production" &&
      (row.reason === "driver-witness-table" || Number(row.addedEntries) >= 12)
    ) {
      issues.push(
        `${context} records large production accumulator growth; driver witness tables must stay in adapters or data boundaries.`,
      );
    }
  }

  return {
    adapterPaths,
    declaredEvidencePaths: new Set(
      adapterModules
        .flatMap((entry) => (isRecord(entry) ? entry.targetReplayEvidence ?? [] : []))
        .filter((entry) => typeof entry === "string"),
    ),
  };
}

function validateStateOwnerManifest({
  stateOwnerManifest,
  engineDepth,
  profile,
  rootPath,
  requiredStateFieldPaths = new Set(),
  issues,
}) {
  if (!isRecord(stateOwnerManifest)) return;
  if (stateOwnerManifest.schemaVersion !== 1) {
    issues.push("tasks/STATE_OWNER_MANIFEST.json schemaVersion must be 1.");
  }
  validateString(
    stateOwnerManifest.taskId,
    "tasks/STATE_OWNER_MANIFEST.json taskId",
    issues,
  );
  if (!Array.isArray(stateOwnerManifest.durableFields)) {
    issues.push("tasks/STATE_OWNER_MANIFEST.json durableFields must be an array.");
    return;
  }
  if (
    stateOwnerManifest.durableFields.length === 0 &&
    (requiredStateFieldPaths.size > 0 ||
      typeof stateOwnerManifest.noDurableFieldsReason !== "string" ||
      stateOwnerManifest.noDurableFieldsReason.trim() === "")
  ) {
    issues.push(
      "tasks/STATE_OWNER_MANIFEST.json empty durableFields requires noDurableFieldsReason and no checked replay state fields.",
    );
  }
  const durableFieldPaths = new Set(
    stateOwnerManifest.durableFields
      .filter(isRecord)
      .map((field) => field.fieldPath)
      .filter((fieldPath) => typeof fieldPath === "string"),
  );
  for (const fieldPath of requiredStateFieldPaths) {
    if (!durableFieldPaths.has(fieldPath)) {
      issues.push(
        `tasks/STATE_OWNER_MANIFEST.json must record checked replay state field ${fieldPath}.`,
      );
    }
  }
  const adapterPaths = new Set(
    (engineDepth?.adapterModules ?? [])
      .filter(isRecord)
      .map((entry) => entry.path)
      .filter((entry) => typeof entry === "string"),
  );
  for (const [index, field] of stateOwnerManifest.durableFields.entries()) {
    const context = `tasks/STATE_OWNER_MANIFEST.json durableFields[${index}]`;
    if (!isRecord(field)) {
      issues.push(`${context} must be an object.`);
      continue;
    }
    const isCheckedReplayStateField =
      typeof field.fieldPath === "string" &&
      requiredStateFieldPaths.has(field.fieldPath);
    validateString(field.fieldPath, `${context}.fieldPath`, issues);
    validateManifestPath({
      relativePath: field.introducedIn,
      context: `${context}.introducedIn`,
      rootPath,
      profile,
      requireExists: true,
      issues,
    });
    if (!stateOwners.has(field.owner)) {
      issues.push(`${context}.owner must be one of ${Array.from(stateOwners).join(", ")}.`);
    }
    if (isCheckedReplayStateField) {
      if (field.owner === "harness-witness-protocol") {
        issues.push(
          `${context} checked replay state field must not use owner harness-witness-protocol.`,
        );
      }
      if (adapterPaths.has(field.introducedIn)) {
        issues.push(
          `${context} checked replay state field must be owned by production state, not an adapter module.`,
        );
      }
    }
    if (!isRecord(field.derivability) || typeof field.derivability.tag !== "string") {
      issues.push(`${context}.derivability must be a tagged record.`);
      continue;
    }
    if (
      isCheckedReplayStateField &&
      field.derivability.tag === "harness-witness-protocol"
    ) {
      issues.push(
        `${context} checked replay state field must not use harness-witness-protocol derivability.`,
      );
    }
    if (field.derivability.tag === "canonical-source") {
      if (
        field.owner === "executable-boundary-projection" ||
        field.owner === "harness-witness-protocol"
      ) {
        issues.push(
          `${context} canonical-source derivability cannot be used with owner ${field.owner}.`,
        );
      }
      if (field.derivability.sourceField !== undefined) {
        issues.push(`${context} canonical-source derivability must not name sourceField.`);
      }
      continue;
    }
    if (field.derivability.tag === "stored-executable-boundary-projection") {
      if (field.owner !== "executable-boundary-projection") {
        issues.push(
          `${context} executable boundary projections must use owner executable-boundary-projection.`,
        );
      }
      validateString(field.derivability.sourceField, `${context}.derivability.sourceField`, issues);
      validateString(field.derivability.boundary, `${context}.derivability.boundary`, issues);
      continue;
    }
    if (field.derivability.tag === "harness-witness-protocol") {
      if (field.owner !== "harness-witness-protocol") {
        issues.push(`${context} harness witness fields must use owner harness-witness-protocol.`);
      }
      validateString(field.derivability.witnessName, `${context}.derivability.witnessName`, issues);
      if (
        typeof field.introducedIn === "string" &&
        !adapterPaths.has(field.introducedIn)
      ) {
        issues.push(`${context} harness witness field must be introduced in an adapter module.`);
      }
      continue;
    }
    issues.push(`${context} has redundant durable state derivability tag ${field.derivability.tag}.`);
  }
}

function validateReviewLoop(reviewLoop, issues) {
  if (!isRecord(reviewLoop)) return;
  if (reviewLoop.schemaVersion !== 1) {
    issues.push("tasks/REVIEW_LOOP.json schemaVersion must be 1.");
  }
  validateString(reviewLoop.taskId, "tasks/REVIEW_LOOP.json taskId", issues);
  if (!Array.isArray(reviewLoop.rounds) || reviewLoop.rounds.length === 0) {
    issues.push("tasks/REVIEW_LOOP.json rounds must be a non-empty array.");
  } else {
    const finalRound = reviewLoop.rounds.at(-1);
    const passes = new Map(
      (finalRound?.passes ?? [])
        .filter(isRecord)
        .map((entry) => [entry.checklist, entry.status]),
    );
    for (const checklist of requiredReviewChecklists) {
      if (passes.get(checklist) !== "pass") {
        issues.push(`final review loop round must pass checklist ${checklist}.`);
      }
    }
  }
  if (!Array.isArray(reviewLoop.findings)) {
    issues.push("tasks/REVIEW_LOOP.json findings must be an array.");
    return;
  }
  const hasReasonableFindings = reviewLoop.findings.some(
    (finding) => isRecord(finding) && finding.reasonableness !== "not-reasonable",
  );
  if (hasReasonableFindings && (!Array.isArray(reviewLoop.rounds) || reviewLoop.rounds.length < 2)) {
    issues.push("reviewer-loop convergence with reasonable findings requires a follow-up review round.");
  }
  for (const [index, finding] of reviewLoop.findings.entries()) {
    const context = `tasks/REVIEW_LOOP.json findings[${index}]`;
    if (!isRecord(finding)) {
      issues.push(`${context} must be an object.`);
      continue;
    }
    validateString(finding.id, `${context}.id`, issues);
    const reasonable = finding.reasonableness !== "not-reasonable";
    if (reasonable && finding.status !== "fixed" && finding.status !== "rejected") {
      issues.push(`${context} is an unresolved reasonable reviewer finding.`);
    }
    if (reasonable && finding.status === "fixed") {
      validateString(finding.resolution, `${context}.resolution`, issues);
    }
    if (reasonable && finding.status === "rejected") {
      validateString(finding.deciderRationale, `${context}.deciderRationale`, issues);
    }
  }
}

function validateDeciderDecision(deciderDecision, issues) {
  if (!isRecord(deciderDecision)) return;
  if (deciderDecision.schemaVersion !== 1) {
    issues.push("tasks/DECIDER_DECISION.json schemaVersion must be 1.");
  }
  validateString(
    deciderDecision.taskId,
    "tasks/DECIDER_DECISION.json taskId",
    issues,
  );
  if (deciderDecision.decision !== "accepted") {
    issues.push("tasks/DECIDER_DECISION.json decision must be accepted.");
  }
  if (!Array.isArray(deciderDecision.deterministicGates)) {
    issues.push("tasks/DECIDER_DECISION.json deterministicGates must be an array.");
    return;
  }
  const gates = new Map(
    deciderDecision.deterministicGates
      .filter(isRecord)
      .map((entry) => [entry.gate, entry.status]),
  );
  for (const gate of requiredDeciderGates) {
    if (gates.get(gate) !== "pass") {
      issues.push(`decider deterministic gate ${gate} must be pass.`);
    }
  }
}

function parseMarkdownTableLine(line) {
  if (!line.trim().startsWith("|")) return undefined;
  const cells = line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
  return cells.length >= 4 ? cells : undefined;
}

function plainCell(value) {
  return String(value ?? "")
    .replace(/^`|`$/g, "")
    .trim();
}

function validateReportHonesty({
  rootPath,
  selected,
  evidenceSummary,
  expectedCleanroomManifestSourceCommitSha,
  sourceBranchInventorySha256,
  issues,
}) {
  const reportPath = path.join(rootPath, "tasks/VALIDATION_REPORT.md");
  if (!fs.existsSync(reportPath)) {
    issues.push("tasks/VALIDATION_REPORT.md is missing.");
    return;
  }
  const report = fs.readFileSync(reportPath, "utf8");
  const selectedObligationIds = new Set(
    requiredSelectedObligations(selected).map((obligation) => obligation.obligationId),
  );
  if (
    /(?:diagnostic|unit)[^\n.]{0,80}(?:close|satisfy|cover)[^\n.]{0,80}(?:branch|mbt)/i.test(
      report,
    )
  ) {
    issues.push(
      "validation report claims diagnostic target-language tests close MBT branch coverage.",
    );
  }
  if (
    typeof expectedCleanroomManifestSourceCommitSha !== "string" ||
    !report.includes(expectedCleanroomManifestSourceCommitSha)
  ) {
    issues.push(
      "tasks/VALIDATION_REPORT.md must include current manifest source commit SHA.",
    );
  }
  if (!report.includes(sourceBranchInventorySha256)) {
    issues.push(
      "tasks/VALIDATION_REPORT.md must include source branch inventory SHA.",
    );
  }
  for (const driverPath of new Set(
    requiredSelectedObligations(selected).map((obligation) => obligation.driverPath),
  )) {
    if (!report.includes(driverPath)) {
      issues.push(
        `tasks/VALIDATION_REPORT.md must include selected driver ${driverPath}.`,
      );
    }
  }
  for (const requiredText of [
    "Allowed inputs used:",
    "Behavior implemented:",
    "Generated branch coverage:",
    "Target replay evidence:",
    "Harness artifacts:",
    "Remaining gaps:",
    "Verification results:",
  ]) {
    if (!report.includes(requiredText)) {
      issues.push(`tasks/VALIDATION_REPORT.md must include ${requiredText}`);
    }
  }
  const seenCoveredObligations = new Set();
  for (const [lineIndex, line] of report.split("\n").entries()) {
    const cells = parseMarkdownTableLine(line);
    if (cells === undefined) continue;
    const status = plainCell(cells.at(-1)).toLowerCase();
    if (status !== "covered") continue;
    const evidenceCell = plainCell(cells[1]);
    const obligationId = plainCell(cells[0]);
    if (
      evidenceCell === "_none_" ||
      !evidenceCell.includes("tasks/target-replay-evidence/")
    ) {
      issues.push(
        `tasks/VALIDATION_REPORT.md:${lineIndex + 1} marks branch covered without target replay evidence.`,
      );
    }
    if (/diagnostic|unit/i.test(evidenceCell)) {
      issues.push(
        `tasks/VALIDATION_REPORT.md:${lineIndex + 1} uses diagnostic evidence as target replay evidence.`,
      );
    }
    if (!selectedObligationIds.has(obligationId)) {
      issues.push(
        `tasks/VALIDATION_REPORT.md:${lineIndex + 1} marks unknown or unselected obligation ${obligationId} covered.`,
      );
      continue;
    }
    const validEvidenceRefs =
      evidenceSummary.coveredEvidenceRefsByObligation.get(obligationId) ??
      new Set();
    if (validEvidenceRefs.size === 0) {
      issues.push(
        `tasks/VALIDATION_REPORT.md:${lineIndex + 1} marks ${obligationId} covered but target replay evidence does not cover it.`,
      );
    } else if (!validEvidenceRefs.has(evidenceCell)) {
      issues.push(
        `tasks/VALIDATION_REPORT.md:${lineIndex + 1} cites ${evidenceCell}, but accepted target replay evidence for ${obligationId} is ${Array.from(validEvidenceRefs).join(", ")}.`,
      );
    } else {
      seenCoveredObligations.add(obligationId);
    }
  }
  for (const obligationId of selectedObligationIds) {
    if (!seenCoveredObligations.has(obligationId)) {
      issues.push(
        `tasks/VALIDATION_REPORT.md is missing covered row for selected obligation ${obligationId}.`,
      );
    }
  }
}

function isProductionSource(relativePath, adapterPaths) {
  if (adapterPaths.has(relativePath)) return false;
  return !/(^|\/)(?:test|tests|fixture|fixtures|catalog|selection)(?:\/|$)/i.test(
    relativePath,
  );
}

function lineWithoutTrailingComment(line) {
  const slashIndex = line.indexOf("//");
  const hashIndex = line.indexOf("#");
  const indexes = [slashIndex, hashIndex].filter((index) => index >= 0);
  if (indexes.length === 0) return line;
  return line.slice(0, Math.min(...indexes));
}

function hasAuthoredIdentityDispatch(line) {
  const source = lineWithoutTrailingComment(line);
  const identityFieldSource =
    String.raw`(?:\.|_|\b)(?:id|name|slug|source|provenance|section|page|pageRef|pageReference|sourceHeading|sourceSection|provenanceSection|label)\b`;
  const authoredIdentityField = new RegExp(identityFieldSource, "i");
  return (
    authoredIdentityField.test(source) &&
    (/\b(?:if|switch|case|when|match)\b/i.test(source) ||
      new RegExp(String.raw`(?:\b(?:const|let|var|val)\b[^=]*=|=>|:=)\s*[^;]*${identityFieldSource}`, "i").test(source) ||
      new RegExp(
        String.raw`(?:==|!=|===|!==|\bin\b|\.get\s*\(|\.contains\s*\(|\.includes\s*\(|\.has\s*\(|\[[^\]]*${identityFieldSource}|\b[A-Za-z_][A-Za-z0-9_]*\s*\([^)]*${identityFieldSource})`,
        "i",
      ).test(source))
  );
}

function adapterImportNeedles(adapterPaths) {
  return Array.from(adapterPaths)
    .flatMap((adapterPath) => {
      const normalized = adapterPath.replace(/\\/g, "/");
      const extension = path.posix.extname(normalized);
      const withoutExtension =
        extension === "" ? normalized : normalized.slice(0, -extension.length);
      return [
        normalized,
        withoutExtension,
        path.posix.dirname(normalized),
        path.posix.basename(withoutExtension),
      ];
    })
    .filter((needle) => needle.length >= 3);
}

function adapterImportTargets(adapterPaths) {
  return Array.from(adapterPaths).map((adapterPath) => {
    const normalized = adapterPath.replace(/\\/g, "/");
    const extension = path.posix.extname(normalized);
    const withoutExtension =
      extension === "" ? normalized : normalized.slice(0, -extension.length);
    return {
      directory: path.posix.dirname(normalized),
      file: normalized,
      withoutExtension,
    };
  });
}

function lineImportsAdapter(line, adapterNeedles, adapterTargets, importerPath) {
  const source = lineWithoutTrailingComment(line).replace(/\\/g, "/");
  if (!/\b(?:import|from|require|include|use|mod)\b/i.test(source)) {
    return undefined;
  }
  const directNeedle = adapterNeedles.find((needle) => source.includes(needle));
  if (directNeedle !== undefined) return directNeedle;
  const importerDir = path.posix.dirname(importerPath);
  const stringLiterals = Array.from(
    source.matchAll(/["'`]([^"'`]+)["'`]/g),
    (match) => match[1].replace(/\\/g, "/"),
  );
  for (const literal of stringLiterals) {
    if (!literal.startsWith(".")) continue;
    const resolved = path.posix.normalize(path.posix.join(importerDir, literal));
    const target = adapterTargets.find(
      (candidate) =>
        resolved === candidate.directory ||
        resolved.startsWith(`${candidate.directory}/`) ||
        resolved === candidate.file ||
        resolved === candidate.withoutExtension,
    );
    if (target !== undefined) return resolved;
  }
  return undefined;
}

function sourceWindows(text, size) {
  const lines = text.split("\n").map(lineWithoutTrailingComment);
  return lines.flatMap((line, index) => {
    const windows = [{ line: index + 1, text: line }];
    const end = Math.min(lines.length, index + size);
    if (end > index + 1) {
      windows.push({
        line: index + 1,
        text: lines.slice(index, end).join(" "),
      });
    }
    return windows;
  });
}

function validateProductionSourceScan({
  rootPath,
  profile,
  engineDepth,
  selected,
  issues,
}) {
  if (!isRecord(profile)) {
    issues.push("target profile is required for cleanroom harness source scan.");
    return;
  }
  const enginePath = path.join(rootPath, profile.enginePath ?? "");
  if (!fs.existsSync(enginePath)) {
    issues.push(`target engine path is missing: ${profile.enginePath}.`);
    return;
  }
  const extensions = new Set(profile.sourceFileExtensions ?? []);
  const adapterPaths = new Set(
    (engineDepth?.adapterModules ?? [])
      .filter(isRecord)
      .map((entry) => entry.path)
      .filter((entry) => typeof entry === "string"),
  );
  const witnessNames = forbiddenWitnessNamesForSelection(selected);
  const adapterNeedles = adapterImportNeedles(adapterPaths);
  const adapterTargets = adapterImportTargets(adapterPaths);
  const sourceFiles = listFiles(enginePath, (filePath) =>
    extensions.has(path.extname(filePath)),
  );
  for (const filePath of sourceFiles) {
    const relativePath = toPosix(path.relative(rootPath, filePath));
    if (!isProductionSource(relativePath, adapterPaths)) continue;
    const text = fs.readFileSync(filePath, "utf8");
    for (const witnessName of witnessNames) {
      if (
        text.includes(witnessName) ||
        containsProtocolName(text, witnessName)
      ) {
        issues.push(
          `${relativePath} leaks witness protocol name ${witnessName} outside an adapter.`,
        );
      }
    }
    for (const window of sourceWindows(text, 5)) {
      if (hasAuthoredIdentityDispatch(window.text)) {
        issues.push(
          `${relativePath}:${window.line} appears to branch on authored identity dispatch.`,
        );
        break;
      }
    }
    for (const [lineIndex, line] of text.split("\n").entries()) {
      const adapterNeedle = lineImportsAdapter(
        line,
        adapterNeedles,
        adapterTargets,
        relativePath,
      );
      if (adapterNeedle !== undefined) {
        issues.push(
          `${relativePath}:${lineIndex + 1} imports adapter module ${adapterNeedle}; production modules must not import adapters.`,
        );
        break;
      }
    }
  }
}

function validateTaskArtifacts({ taskRoot, profile }) {
  const issues = [];
  validateHarnessProfile(profile, issues);
  const inventory = readRequiredArtifact(
    taskRoot,
    "cleanroom-input/branch-coverage/source-branch-inventory.json",
    issues,
  );
  const activeWork = readRequiredArtifact(taskRoot, "tasks/ACTIVE_WORK.json", issues);
  const startGate = readRequiredArtifact(taskRoot, "tasks/START_GATE.json", issues);
  const engineDepth = readRequiredArtifact(
    taskRoot,
    "tasks/ENGINE_DEPTH_MANIFEST.json",
    issues,
  );
  const stateOwnerManifest = readRequiredArtifact(
    taskRoot,
    "tasks/STATE_OWNER_MANIFEST.json",
    issues,
  );
  const reviewLoop = readRequiredArtifact(taskRoot, "tasks/REVIEW_LOOP.json", issues);
  const deciderDecision = readRequiredArtifact(
    taskRoot,
    "tasks/DECIDER_DECISION.json",
    issues,
  );
  const cleanroomManifest = readCleanroomManifest(taskRoot, issues);
  validateStartGate(startGate, taskRoot, issues);
  if (!isRecord(inventory) || !isRecord(startGate) || !isUsableHarnessProfile(profile)) {
    return issues;
  }
  validateCleanroomInputIntegrity({
    rootPath: taskRoot,
    inventory,
    cleanroomManifest,
    issues,
  });
  const selectedDrivers = startGate.taskScope?.selectedDrivers ?? [];
  activeQueuedDrivers(taskRoot, issues);
  const activeAssignments = validateActiveWork(activeWork, issues);
  const selected = selectedInventory(inventory, selectedDrivers);
  const knownDrivers = new Set(
    (inventory.branchObligations ?? []).map((entry) => entry.driverPath),
  );
  if (selectedDrivers.length !== 1) {
    issues.push("tasks/START_GATE.json taskScope.selectedDrivers must contain exactly one queued driver.");
  }
  const assignmentId = startGate.taskScope?.assignmentId;
  const laneId = startGate.taskScope?.laneId;
  const lanes = activeAssignments.get(assignmentId);
  const laneQueue = lanes?.get(laneId);
  if (typeof assignmentId === "string" && lanes === undefined) {
    issues.push(`selected assignment is missing from tasks/ACTIVE_WORK.json: ${assignmentId}.`);
  }
  if (typeof laneId === "string" && lanes !== undefined && laneQueue === undefined) {
    issues.push(`selected lane is missing from active assignment ${assignmentId}: ${laneId}.`);
  }
  for (const selectedDriver of selectedDrivers) {
    if (!knownDrivers.has(selectedDriver)) {
      issues.push(`selected driver is missing from source branch inventory: ${selectedDriver}.`);
    }
    if (laneQueue !== undefined && !laneQueue.has(selectedDriver)) {
      issues.push(
        `selected driver is not in active assignment ${assignmentId} lane ${laneId}: ${selectedDriver}.`,
      );
    }
  }
  const { adapterPaths, declaredEvidencePaths } = validateEngineDepth({
    engineDepth,
    selected,
    profile,
    rootPath: taskRoot,
    issues,
  });
  const evidenceSummary = validateEvidenceDocs({
    rootPath: taskRoot,
    profile,
    inventory,
    selected,
    declaredEvidencePaths,
    expectedCleanroomManifestSourceCommitSha: cleanroomManifest?.sourceCommitSha,
    issues,
  });
  validateStateOwnerManifest({
    stateOwnerManifest,
    engineDepth,
    profile,
    rootPath: taskRoot,
    requiredStateFieldPaths: evidenceSummary.checkedTargetStateFields,
    issues,
  });
  validateReviewLoop(reviewLoop, issues);
  validateDeciderDecision(deciderDecision, issues);
  validateReportHonesty({
    rootPath: taskRoot,
    selected,
    evidenceSummary,
    expectedCleanroomManifestSourceCommitSha: cleanroomManifest?.sourceCommitSha,
    sourceBranchInventorySha256: sha256Text(stableStringify(inventory)),
    issues,
  });
  validateProductionSourceScan({
    rootPath: taskRoot,
    profile,
    engineDepth: isRecord(engineDepth) ? engineDepth : { adapterModules: [] },
    selected,
    issues,
  });
  if (adapterPaths.size === 0 && requiredSelectedObligations(selected).length > 0) {
    issues.push("adapter quarantine must record adapter modules for selected QNT branches.");
  }
  return issues;
}

function fixtureSha(char) {
  return char.repeat(40);
}

function initGitFixture(rootPath) {
  git(rootPath, ["init", "-b", "main"]);
  git(rootPath, ["config", "user.email", "cleanroom@example.invalid"]);
  git(rootPath, ["config", "user.name", "Cleanroom Fixture"]);
  fs.writeFileSync(path.join(rootPath, ".base"), "base\n");
  git(rootPath, ["add", ".base"]);
  git(rootPath, ["commit", "-m", "base"]);
  return git(rootPath, ["rev-parse", "HEAD"]);
}

function fixtureValidationReport(inventory, rows) {
  const driverPath = inventory.branchObligations[0].driverPath;
  return [
    "# Validation Report",
    "",
    `- Manifest source commit SHA: \`${fixtureSha("3")}\``,
    `- Source branch inventory SHA: \`${sha256Text(stableStringify(inventory))}\``,
    `- Driver: \`${driverPath}\``,
    "- Allowed inputs used:",
    "  - `cleanroom-input/MANIFEST.md`",
    "  - `cleanroom-input/branch-coverage/source-branch-inventory.json`",
    `  - \`${driverPath}\``,
    "",
    "Behavior implemented:",
    "",
    "- Force projectile allocation and damage projection.",
    "",
    "Generated branch coverage:",
    "",
    "| Obligation | Target replay evidence | Diagnostic tests | Status |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
    "Target replay evidence:",
    "",
    "- Evidence file: `tasks/target-replay-evidence/mm.json`",
    "",
    "Harness artifacts:",
    "",
    "- Start gate: `tasks/START_GATE.json`",
    "- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`",
    "- State ownership: `tasks/STATE_OWNER_MANIFEST.json`",
    "- Reviewer loop: `tasks/REVIEW_LOOP.json`",
    "- Decider decision: `tasks/DECIDER_DECISION.json`",
    "",
    "Remaining gaps:",
    "",
    "- `_none_`",
    "",
    "Verification results:",
    "",
    "- `fixture test` passed.",
    "",
  ].join("\n");
}

function validFixture(rootPath) {
  const baseSha = initGitFixture(rootPath);
  const profile = {
    targetProfileId: "synthetic-alpha",
    targetLabel: "Aster",
    enginePath: "engine",
    sourceFileExtensions: [".aster"],
  };
  const driverPath = "cleanroom-input/qnt/battle-runtime/battle-runtime-magic-missile.mbt.qnt";
  const qntContent = [
    "module fixtureMagicMissileMbt {",
    "  action step = any { doFillMagicMissileAllocation, doFillMagicMissileDamage }",
    "  action doFillMagicMissileAllocation = all { true }",
    "  action doFillMagicMissileDamage = all { true }",
    "}",
    "",
  ].join("\n");
  const qntSha = sha256Text(qntContent);
  const inventory = {
    schemaVersion: 1,
    generatedBy: "fixture",
    sourceArtifacts: { branchScope: "fixture" },
    quintMetadataModel: {
      branchActionSource: "mbt::actionTaken",
      sampledInputSource: "mbt::nondetPicks",
    },
    branchObligations: [
      {
        obligationId: `${driverPath}#step:doFillMagicMissileAllocation`,
        driverPath,
        qntFileSha256: qntSha,
        branchFamily: "step",
        branchPath: ["step", "doFillMagicMissileAllocation"],
        branchAction: "doFillMagicMissileAllocation",
        scope: { tag: "in-scope" },
        replay: { tag: "observable-from-step", stepAction: "step" },
        decisionSource: "default",
      },
      {
        obligationId: `${driverPath}#step:doFillMagicMissileDamage`,
        driverPath,
        qntFileSha256: qntSha,
        branchFamily: "step",
        branchPath: ["step", "doFillMagicMissileDamage"],
        branchAction: "doFillMagicMissileDamage",
        scope: { tag: "in-scope" },
        replay: { tag: "observable-from-step", stepAction: "step" },
        decisionSource: "default",
      },
    ],
    sampledInputs: [
      {
        driverPath,
        qntFileSha256: qntSha,
        branchFamily: "step",
        branchAction: "doFillMagicMissileDamage",
        pickName: "dartRollTotal",
      },
    ],
  };
  const inventorySha = sha256Text(stableStringify(inventory));
  const profileSha = targetProfileSha256(profile);
  fs.mkdirSync(path.join(rootPath, path.dirname(driverPath)), { recursive: true });
  fs.writeFileSync(path.join(rootPath, driverPath), qntContent);
  writeJson(
    path.join(
      rootPath,
      "cleanroom-input/branch-coverage/source-branch-inventory.json",
    ),
    inventory,
  );
  const inventoryFileSha = sha256File(
    path.join(
      rootPath,
      "cleanroom-input/branch-coverage/source-branch-inventory.json",
    ),
  );
  fs.mkdirSync(path.join(rootPath, "cleanroom-input"), { recursive: true });
  fs.writeFileSync(
    path.join(rootPath, "cleanroom-input/MANIFEST.md"),
    [
      "# Cleanroom Input Manifest",
      "",
      `- Source commit SHA: ${fixtureSha("3")}`,
      "",
      "## Per-File Inventory",
      "",
      "| File | sha256 | Source path |",
      "| --- | --- | --- |",
      `| \`branch-coverage/source-branch-inventory.json\` | \`${inventoryFileSha}\` | \`plans/cleanroom-branch-coverage/source-branch-inventory.json\` |`,
      `| \`${driverPath.slice("cleanroom-input/".length)}\` | \`${qntSha}\` | \`packages/battle-runtime/battle-runtime-magic-missile.mbt.qnt\` |`,
      "",
    ].join("\n"),
  );
  writeJson(path.join(rootPath, "tasks/START_GATE.json"), {
    schemaVersion: 1,
    taskId: "T001",
    startHeadSha: baseSha,
    preImplementationStatus: {
      command: "git status --short",
      result: "clean",
      output: "",
    },
    taskScope: {
      assignmentId: "tracer-bullet",
      laneId: "battle",
      selectedDrivers: [driverPath],
    },
  });
  writeJson(path.join(rootPath, "tasks/ACTIVE_WORK.json"), {
    schemaVersion: 1,
    assignments: [
      {
        assignmentId: "tracer-bullet",
        lanes: [
          {
            laneId: "battle",
            queue: [driverPath],
          },
        ],
      },
    ],
  });
  fs.writeFileSync(
    path.join(rootPath, "tasks/LEVEL_1_2_SCOPE.md"),
    fs.readFileSync(SOURCE_SCOPE_SNAPSHOT_PATH, "utf8"),
  );
  writeJson(path.join(rootPath, "tasks/target-replay-evidence/mm.json"), {
    generatedBy: { tag: "target-harness", name: "Aster Quint Bridge" },
    cleanroomManifestSourceCommitSha: fixtureSha("3"),
    sourceBranchInventorySha256: inventorySha,
    targetProfile: "synthetic-alpha",
    targetProfileSha256: profileSha,
    runs: inventory.branchObligations.map((obligation) => ({
      evidenceKind: "target-qnt-mbt-replay",
      driverPath: obligation.driverPath,
      qntFileSha256: obligation.qntFileSha256,
      branchFamily: obligation.branchFamily,
      branchAction: obligation.branchAction,
        observedActionTaken: obligation.branchAction,
        harnessTestPath: "engine/qnt-adapters/magic_missile_adapter.aster",
        traceId: `seed=1 action=${obligation.branchAction}`,
      stateCheck: {
        tag: "state-match",
        projection: "Magic missile allocation and damage projection",
        comparator: "fixture-magic-missile-projection-v1",
        expectedProjectionSha256: sha256Text(
          `projection ${obligation.branchAction}`,
        ),
        observedProjectionSha256: sha256Text(
          `projection ${obligation.branchAction}`,
        ),
        checkedTargetStateFields: ["BattleState.pendingForceProjectiles"],
      },
      result: { tag: "pass" },
      ...(obligation.branchAction === "doFillMagicMissileDamage"
        ? { sampledInputs: [{ pickName: "dartRollTotal", value: 7 }] }
        : {}),
    })),
  });
  writeJson(path.join(rootPath, "tasks/ENGINE_DEPTH_MANIFEST.json"), {
    schemaVersion: 1,
    taskId: "T001",
    productionModulesExtended: [
      {
        path: "engine/rules/force_projectiles.aster",
        role: "domain-engine",
        domainApis: ["allocateForceProjectiles", "resolveForceProjectileDamage"],
      },
    ],
    adapterModules: [
      {
        path: "engine/qnt-adapters/magic_missile_adapter.aster",
        quarantinedWitnessNames: [
          "doFillMagicMissileAllocation",
          "doFillMagicMissileDamage",
          "dartRollTotal",
          ...harnessWitnessProtocolNames,
        ],
        targetReplayEvidence: ["tasks/target-replay-evidence/mm.json"],
      },
    ],
    accumulatorGrowth: [],
    expectedNextReuse: [
      {
        driver: "cleanroom-input/qnt/battle-runtime/battle-runtime-level1-damage-spell-selected-identity.mbt.qnt",
        module: "engine/rules/force_projectiles.aster",
        api: "resolveForceProjectileDamage",
      },
    ],
  });
  writeJson(path.join(rootPath, "tasks/STATE_OWNER_MANIFEST.json"), {
    schemaVersion: 1,
    taskId: "T001",
    durableFields: [
      {
        fieldPath: "BattleState.pendingForceProjectiles",
        introducedIn: "engine/rules/force_projectiles.aster",
        owner: "battle-state",
        derivability: { tag: "canonical-source" },
      },
      {
        fieldPath: "QntMagicMissileWitness.observedActionTaken",
        introducedIn: "engine/qnt-adapters/magic_missile_adapter.aster",
        owner: "harness-witness-protocol",
        derivability: {
          tag: "harness-witness-protocol",
          witnessName: "mbt::actionTaken",
        },
      },
    ],
  });
  writeJson(path.join(rootPath, "tasks/REVIEW_LOOP.json"), {
    schemaVersion: 1,
    taskId: "T001",
    rounds: [
      {
        round: 1,
        passes: requiredReviewChecklists.map((checklist) => ({
          checklist,
          status: "pass",
        })),
      },
    ],
    findings: [],
  });
  writeJson(path.join(rootPath, "tasks/DECIDER_DECISION.json"), {
    schemaVersion: 1,
    taskId: "T001",
    decision: "accepted",
    deterministicGates: requiredDeciderGates.map((gate) => ({
      gate,
      status: "pass",
      evidence: "checked by scripts/check-cleanroom-harness.cjs",
    })),
  });
  fs.mkdirSync(path.join(rootPath, "tasks"), { recursive: true });
  fs.writeFileSync(
    path.join(rootPath, "tasks/VALIDATION_REPORT.md"),
    fixtureValidationReport(inventory, [
      `| \`${inventory.branchObligations[0].obligationId}\` | \`tasks/target-replay-evidence/mm.json#seed=1 action=${inventory.branchObligations[0].branchAction}#step:${inventory.branchObligations[0].branchAction}\` | \`_none_\` | \`covered\` |`,
      `| \`${inventory.branchObligations[1].obligationId}\` | \`tasks/target-replay-evidence/mm.json#seed=1 action=${inventory.branchObligations[1].branchAction}#step:${inventory.branchObligations[1].branchAction}\` | \`_none_\` | \`covered\` |`,
    ]),
  );
  fs.mkdirSync(path.join(rootPath, "engine/rules"), { recursive: true });
  fs.writeFileSync(
    path.join(rootPath, "engine/rules/force_projectiles.aster"),
    "fn resolveForceProjectileDamage(input) = input\n",
  );
  fs.mkdirSync(path.join(rootPath, "engine/qnt-adapters"), { recursive: true });
  fs.writeFileSync(
    path.join(rootPath, "engine/qnt-adapters/magic_missile_adapter.aster"),
    "fn replay(doFillMagicMissileDamage) = doFillMagicMissileDamage\n",
  );
  return { profile };
}

function expectFailure(
  validRoot,
  profile,
  name,
  mutate,
  expectedSubstring,
  profileOverride,
) {
  const badRoot = fs.mkdtempSync(path.join(os.tmpdir(), `cleanroom-harness-${name}-`));
  fs.cpSync(validRoot, badRoot, { recursive: true });
  mutate(badRoot);
  const issues = validateTaskArtifacts({
    taskRoot: badRoot,
    profile: profileOverride ?? profile,
  });
  fs.rmSync(badRoot, { recursive: true, force: true });
  if (!issues.some((issue) => issue.includes(expectedSubstring))) {
    throw new Error(
      `${name}: expected issue containing ${JSON.stringify(expectedSubstring)}, got ${JSON.stringify(issues)}`,
    );
  }
}

function assertHarnessTemplatesMentionRequiredGates() {
  const scaffoldTaskRoot = path.join(
    __dirname,
    "../plans/cleanroom-scaffolds/tasks",
  );
  const reviewTemplates = [
    "REVIEWER_CHECKLIST.template.md",
    "REVIEW_LOOP.example.template.json",
  ]
    .map((fileName) =>
      fs.readFileSync(path.join(scaffoldTaskRoot, fileName), "utf8"),
    )
    .join("\n");
  for (const checklist of requiredReviewChecklists) {
    if (!reviewTemplates.includes(checklist)) {
      throw new Error(`review templates omit checklist ${checklist}.`);
    }
  }
  const deciderTemplates = [
    "DECIDER_CHECKLIST.template.md",
    "DECIDER_DECISION.example.template.json",
  ]
    .map((fileName) =>
      fs.readFileSync(path.join(scaffoldTaskRoot, fileName), "utf8"),
    )
    .join("\n");
  for (const gate of requiredDeciderGates) {
    if (!deciderTemplates.includes(gate)) {
      throw new Error(`decider templates omit gate ${gate}.`);
    }
  }
}

function runSelfTest() {
  assertHarnessTemplatesMentionRequiredGates();
  const validRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cleanroom-harness-valid-"));
  try {
    const { profile } = validFixture(validRoot);
    const validIssues = validateTaskArtifacts({ taskRoot: validRoot, profile });
    if (validIssues.length > 0) {
      throw new Error(`expected valid cleanroom harness fixture to pass: ${validIssues.join("; ")}`);
    }

    expectFailure(
      validRoot,
      profile,
      "empty-extensions",
      (_rootPath) => {},
      "target profile sourceFileExtensions",
      { ...profile, sourceFileExtensions: [] },
    );
    expectFailure(
      validRoot,
      profile,
	      "wrong-manifest-sha",
	      (rootPath) => {
	        const evidencePath = path.join(rootPath, "tasks/target-replay-evidence/mm.json");
	        const evidence = readJson(evidencePath);
	        evidence.cleanroomManifestSourceCommitSha = fixtureSha("4");
	        writeJson(evidencePath, evidence);
	      },
	      "cleanroomManifestSourceCommitSha",
	    );
    expectFailure(
      validRoot,
      profile,
      "missing-evidence-profile",
      (rootPath) => {
        const evidencePath = path.join(rootPath, "tasks/target-replay-evidence/mm.json");
        const evidence = readJson(evidencePath);
        delete evidence.targetProfile;
        writeJson(evidencePath, evidence);
      },
      "target replay evidence requires targetProfile",
    );
    expectFailure(
      validRoot,
      profile,
      "undeclared-evidence",
      (rootPath) => {
	        writeJson(path.join(rootPath, "tasks/target-replay-evidence/stray.json"), {
	          generatedBy: { tag: "target-harness", name: "fixture" },
	          cleanroomManifestSourceCommitSha: fixtureSha("3"),
	          sourceBranchInventorySha256: "stray",
	          targetProfile: "synthetic-alpha",
	          targetProfileSha256: targetProfileSha256(profile),
	          runs: [],
	        });
	      },
	      "is not declared by tasks/ENGINE_DEPTH_MANIFEST.json",
	    );
	    expectFailure(
	      validRoot,
	      profile,
	      "tampered-cleanroom-qnt",
	      (rootPath) => {
	        fs.appendFileSync(
	          path.join(
	            rootPath,
	            "cleanroom-input/qnt/battle-runtime/battle-runtime-magic-missile.mbt.qnt",
	          ),
	          "// tampered\n",
	        );
	      },
	      "hash for cleanroom-input/qnt/battle-runtime/battle-runtime-magic-missile.mbt.qnt is stale",
	    );
	    expectFailure(
	      validRoot,
	      profile,
	      "queue-order",
	      (rootPath) => {
	        fs.writeFileSync(
	          path.join(rootPath, "tasks/LEVEL_1_2_SCOPE.md"),
	          [
	            "# Level 1-2 Driver Scope",
	            "",
	            "## Current Branch-Inventory-Ready Queue",
	            "",
	            "1. `cleanroom-input/qnt/battle-runtime/earlier-driver.mbt.qnt`",
	            "2. `cleanroom-input/qnt/battle-runtime/battle-runtime-magic-missile.mbt.qnt`",
	            "",
	          ].join("\n"),
	        );
	      },
	      "tasks/LEVEL_1_2_SCOPE.md must match the source-owned LEVEL_1_2_SCOPE snapshot",
	    );
	    expectFailure(
	      validRoot,
	      profile,
	      "queue-and-selection-reordered",
	      (rootPath) => {
	        const laterDriver =
	          "cleanroom-input/qnt/battle-runtime/battle-runtime-adrenaline-rush.mbt.qnt";
	        fs.writeFileSync(
	          path.join(rootPath, "tasks/LEVEL_1_2_SCOPE.md"),
	          fs
	            .readFileSync(SOURCE_SCOPE_SNAPSHOT_PATH, "utf8")
	            .replace(
	              "1. `cleanroom-input/qnt/character-creation-runtime/character-creation-class-feature-projections.mbt.qnt`",
	              `1. \`${laterDriver}\``,
	            ),
	        );
	        const startGatePath = path.join(rootPath, "tasks/START_GATE.json");
	        const startGate = readJson(startGatePath);
	        startGate.taskScope.selectedDrivers = [laterDriver];
	        writeJson(startGatePath, startGate);
	      },
	      "tasks/LEVEL_1_2_SCOPE.md must match the source-owned LEVEL_1_2_SCOPE snapshot",
	    );
    expectFailure(
      validRoot,
      profile,
      "wrong-profile-sha",
      (rootPath) => {
        const evidencePath = path.join(rootPath, "tasks/target-replay-evidence/mm.json");
        const evidence = readJson(evidencePath);
        evidence.targetProfileSha256 = fixtureSha("5");
        writeJson(evidencePath, evidence);
      },
      "targetProfileSha256",
    );
    expectFailure(
      validRoot,
      profile,
      "missing-sampled-input",
      (rootPath) => {
        const evidencePath = path.join(rootPath, "tasks/target-replay-evidence/mm.json");
        const evidence = readJson(evidencePath);
        const damageRun = evidence.runs.find(
          (run) => run.branchAction === "doFillMagicMissileDamage",
        );
        delete damageRun.sampledInputs;
        writeJson(evidencePath, evidence);
      },
      "sampledInputs array is required",
    );
    expectFailure(
      validRoot,
      profile,
      "uncovered",
      (rootPath) => {
        const evidencePath = path.join(rootPath, "tasks/target-replay-evidence/mm.json");
        const evidence = readJson(evidencePath);
        evidence.runs.pop();
        writeJson(evidencePath, evidence);
      },
      "missing passing target replay evidence",
    );
    expectFailure(
      validRoot,
      profile,
      "sampled-input-leak",
      (rootPath) => {
        fs.appendFileSync(
          path.join(rootPath, "engine/rules/force_projectiles.aster"),
          "fn leakedPick(dartRollTotal) = dartRollTotal\n",
        );
      },
      "leaks witness protocol name dartRollTotal",
    );
    expectFailure(
      validRoot,
      profile,
      "dirty-start",
      (rootPath) => {
        const startGatePath = path.join(rootPath, "tasks/START_GATE.json");
        const startGate = readJson(startGatePath);
        startGate.preImplementationStatus.result = "dirty";
        startGate.preImplementationStatus.output = " M README.md";
        writeJson(startGatePath, startGate);
      },
      "preImplementationStatus.result must be clean",
    );
	    expectFailure(
	      validRoot,
	      profile,
	      "authored-lookup",
      (rootPath) => {
        fs.appendFileSync(
          path.join(rootPath, "engine/rules/force_projectiles.aster"),
          "const resolver = rulesByName.get(spell.name)\n",
        );
      },
	      "authored identity dispatch",
	    );
	    expectFailure(
	      validRoot,
	      profile,
	      "authored-alias",
	      (rootPath) => {
	        fs.appendFileSync(
	          path.join(rootPath, "engine/rules/force_projectiles.aster"),
	          "const spellKey = spell.name\n",
	        );
	      },
	      "authored identity dispatch",
	    );
    expectFailure(
      validRoot,
      profile,
      "review",
      (rootPath) => {
        const reviewPath = path.join(rootPath, "tasks/REVIEW_LOOP.json");
        const review = readJson(reviewPath);
        review.findings = [
          {
            id: "R1",
            checklist: "code-shape-depth",
            reasonableness: "reasonable",
            status: "open",
            summary: "production API is witness-shaped",
          },
        ];
        writeJson(reviewPath, review);
      },
      "unresolved reasonable reviewer finding",
    );
	    expectFailure(
	      validRoot,
	      profile,
	      "adapter-leak",
      (rootPath) => {
        fs.appendFileSync(
          path.join(rootPath, "engine/rules/force_projectiles.aster"),
          "fn leaked() = doFillMagicMissileDamage\n",
        );
      },
	      "leaks witness protocol name doFillMagicMissileDamage",
	    );
	    expectFailure(
	      validRoot,
	      profile,
	      "adapter-import",
	      (rootPath) => {
	        fs.appendFileSync(
	          path.join(rootPath, "engine/rules/force_projectiles.aster"),
	          "import replay from \"engine/qnt-adapters/magic_missile_adapter\"\n",
	        );
	      },
	      "imports adapter module engine/qnt-adapters/magic_missile_adapter",
	    );
	    expectFailure(
	      validRoot,
	      profile,
	      "adapter-directory-import",
	      (rootPath) => {
	        fs.appendFileSync(
	          path.join(rootPath, "engine/rules/force_projectiles.aster"),
	          "import replay from \"engine/qnt-adapters\"\n",
	        );
	      },
	      "imports adapter module engine/qnt-adapters",
	    );
	    expectFailure(
	      validRoot,
	      profile,
	      "adapter-relative-directory-import",
	      (rootPath) => {
	        fs.appendFileSync(
	          path.join(rootPath, "engine/rules/force_projectiles.aster"),
	          "import replay from \"../qnt-adapters\"\n",
	        );
	      },
	      "imports adapter module engine/qnt-adapters",
	    );
	    expectFailure(
	      validRoot,
	      profile,
	      "witness-field-leak",
      (rootPath) => {
        fs.appendFileSync(
          path.join(rootPath, "engine/rules/force_projectiles.aster"),
          "fn leakedHarnessField(observedActionTaken) = observedActionTaken\n",
        );
      },
      "leaks witness protocol name observedActionTaken",
    );
    expectFailure(
      validRoot,
      profile,
      "public-witness",
      (rootPath) => {
        const manifestPath = path.join(rootPath, "tasks/ENGINE_DEPTH_MANIFEST.json");
        const manifest = readJson(manifestPath);
        manifest.productionModulesExtended[0].domainApis = [
          "doFillMagicMissileDamage",
        ];
        writeJson(manifestPath, manifest);
      },
      "public domain API from witness protocol name doFillMagicMissileDamage",
    );
    expectFailure(
      validRoot,
      profile,
      "test-path-engine-depth",
      (rootPath) => {
        const testPath = path.join(rootPath, "engine/tests/fake_depth.aster");
        fs.mkdirSync(path.dirname(testPath), { recursive: true });
        fs.writeFileSync(testPath, "fn fakeDepth() = 1\n");
        const manifestPath = path.join(rootPath, "tasks/ENGINE_DEPTH_MANIFEST.json");
        const manifest = readJson(manifestPath);
        manifest.productionModulesExtended[0].path = "engine/tests/fake_depth.aster";
        writeJson(manifestPath, manifest);
      },
      "must be production source",
    );
    expectFailure(
      validRoot,
      profile,
      "accumulator",
      (rootPath) => {
        const manifestPath = path.join(rootPath, "tasks/ENGINE_DEPTH_MANIFEST.json");
        const manifest = readJson(manifestPath);
        manifest.accumulatorGrowth = [
          {
            path: "engine/rules/force_projectiles.aster",
            symbol: "driverRows",
            owner: "production",
            addedEntries: 30,
            reason: "driver-witness-table",
          },
        ];
        writeJson(manifestPath, manifest);
      },
      "large production accumulator growth",
    );
    expectFailure(
      validRoot,
      profile,
      "depth-missing",
      (rootPath) => {
        const manifestPath = path.join(rootPath, "tasks/ENGINE_DEPTH_MANIFEST.json");
        const manifest = readJson(manifestPath);
        manifest.productionModulesExtended = [];
        delete manifest.completion;
        writeJson(manifestPath, manifest);
      },
      "engine depth manifest must record production modules",
    );
    expectFailure(
      validRoot,
      profile,
      "redundant-state",
      (rootPath) => {
        const manifestPath = path.join(rootPath, "tasks/STATE_OWNER_MANIFEST.json");
        const manifest = readJson(manifestPath);
        manifest.durableFields[0].derivability = {
          tag: "stored-derived-copy",
          sourceField: "CharacterBuild.spellFacts",
        };
        writeJson(manifestPath, manifest);
      },
      "redundant durable state derivability tag stored-derived-copy",
    );
    expectFailure(
      validRoot,
      profile,
      "authored-id",
      (rootPath) => {
        fs.appendFileSync(
          path.join(rootPath, "engine/rules/force_projectiles.aster"),
          [
            "if (",
            "  spell.name",
            "  == \"Magic Missile\"",
            ") { resolveForceProjectileDamage(spell) }",
            "",
          ].join("\n"),
        );
      },
      "authored identity dispatch",
    );
    expectFailure(
      validRoot,
      profile,
      "authored-source",
      (rootPath) => {
        fs.appendFileSync(
          path.join(rootPath, "engine/rules/force_projectiles.aster"),
          "if spell.source == \"PHB\" { resolveForceProjectileDamage(spell) }\n",
        );
      },
      "authored identity dispatch",
    );
	    expectFailure(
	      validRoot,
	      profile,
	      "report-honesty",
      (rootPath) => {
        fs.writeFileSync(
          path.join(rootPath, "tasks/VALIDATION_REPORT.md"),
          [
            "| Obligation | Target replay evidence | Diagnostic tests | Status |",
            "| --- | --- | --- | --- |",
            "| `cleanroom-input/qnt/battle-runtime/battle-runtime-magic-missile.mbt.qnt#step:doFillMagicMissileDamage` | `_none_` | `engine/tests/mm.aster` | `covered` |",
            "",
          ].join("\n"),
        );
      },
	      "marks branch covered without target replay evidence",
	    );
	    expectFailure(
	      validRoot,
	      profile,
	      "report-shape",
	      (rootPath) => {
	        const inventory = readJson(
	          path.join(
	            rootPath,
	            "cleanroom-input/branch-coverage/source-branch-inventory.json",
	          ),
	        );
	        fs.writeFileSync(
	          path.join(rootPath, "tasks/VALIDATION_REPORT.md"),
	          [
	            "# Validation Report",
	            "",
	            `- Manifest source commit SHA: \`${fixtureSha("3")}\``,
	            `- Source branch inventory SHA: \`${sha256Text(stableStringify(inventory))}\``,
	            `- Driver: \`${inventory.branchObligations[0].driverPath}\``,
	            "",
	            "| Obligation | Target replay evidence | Diagnostic tests | Status |",
	            "| --- | --- | --- | --- |",
	            `| \`${inventory.branchObligations[0].obligationId}\` | \`tasks/target-replay-evidence/mm.json#seed=1 action=${inventory.branchObligations[0].branchAction}#step:${inventory.branchObligations[0].branchAction}\` | \`_none_\` | \`covered\` |`,
	            `| \`${inventory.branchObligations[1].obligationId}\` | \`tasks/target-replay-evidence/mm.json#seed=1 action=${inventory.branchObligations[1].branchAction}#step:${inventory.branchObligations[1].branchAction}\` | \`_none_\` | \`covered\` |`,
	            "",
	          ].join("\n"),
	        );
	      },
	      "tasks/VALIDATION_REPORT.md must include Allowed inputs used:",
	    );
    expectFailure(
      validRoot,
      profile,
      "report-wrong-branch",
      (rootPath) => {
	        fs.writeFileSync(
	          path.join(rootPath, "tasks/VALIDATION_REPORT.md"),
	          fixtureValidationReport(
	            readJson(
	              path.join(
	                rootPath,
	                "cleanroom-input/branch-coverage/source-branch-inventory.json",
	              ),
	            ),
	            [
	              "| `notARealBranch` | `tasks/target-replay-evidence/mm.json#seed=1` | `_none_` | `covered` |",
	            ],
	          ),
	        );
	      },
	      "marks unknown or unselected obligation notARealBranch covered",
    );
    expectFailure(
      validRoot,
      profile,
      "report-stale-evidence-ref",
      (rootPath) => {
        const inventory = readJson(
          path.join(
            rootPath,
            "cleanroom-input/branch-coverage/source-branch-inventory.json",
          ),
        );
	        fs.writeFileSync(
	          path.join(rootPath, "tasks/VALIDATION_REPORT.md"),
	          fixtureValidationReport(inventory, [
	            `| \`${inventory.branchObligations[0].obligationId}\` | \`tasks/target-replay-evidence/missing.json#bogus\` | \`_none_\` | \`covered\` |`,
	            `| \`${inventory.branchObligations[1].obligationId}\` | \`tasks/target-replay-evidence/mm.json#seed=1 action=${inventory.branchObligations[1].branchAction}#step:${inventory.branchObligations[1].branchAction}\` | \`_none_\` | \`covered\` |`,
	          ]),
	        );
	      },
	      "accepted target replay evidence",
    );
    expectFailure(
      validRoot,
      profile,
      "report-failing-trace-ref",
      (rootPath) => {
        const evidencePath = path.join(rootPath, "tasks/target-replay-evidence/mm.json");
        const evidence = readJson(evidencePath);
        const failedRun = {
          ...evidence.runs[0],
          traceId: "failed-trace",
          result: { tag: "fail", reason: "fixture failure" },
        };
        evidence.runs.push(failedRun);
        writeJson(evidencePath, evidence);
        const inventory = readJson(
          path.join(
            rootPath,
            "cleanroom-input/branch-coverage/source-branch-inventory.json",
          ),
        );
	        fs.writeFileSync(
	          path.join(rootPath, "tasks/VALIDATION_REPORT.md"),
	          fixtureValidationReport(inventory, [
	            `| \`${inventory.branchObligations[0].obligationId}\` | \`tasks/target-replay-evidence/mm.json#failed-trace#step:${inventory.branchObligations[0].branchAction}\` | \`_none_\` | \`covered\` |`,
	            `| \`${inventory.branchObligations[1].obligationId}\` | \`tasks/target-replay-evidence/mm.json#seed=1 action=${inventory.branchObligations[1].branchAction}#step:${inventory.branchObligations[1].branchAction}\` | \`_none_\` | \`covered\` |`,
	          ]),
	        );
	      },
	      "accepted target replay evidence",
	    );
	    expectFailure(
	      validRoot,
	      profile,
	      "state-owner-missing-checked-field",
	      (rootPath) => {
	        const manifestPath = path.join(rootPath, "tasks/STATE_OWNER_MANIFEST.json");
	        const manifest = readJson(manifestPath);
	        manifest.durableFields[0].fieldPath = "BattleState.otherField";
	        writeJson(manifestPath, manifest);
	      },
	      "must record checked replay state field BattleState.pendingForceProjectiles",
	    );
	    expectFailure(
	      validRoot,
	      profile,
	      "state-owner-checked-field-as-witness",
	      (rootPath) => {
	        const manifestPath = path.join(rootPath, "tasks/STATE_OWNER_MANIFEST.json");
	        const manifest = readJson(manifestPath);
	        manifest.durableFields[0] = {
	          fieldPath: "BattleState.pendingForceProjectiles",
	          introducedIn: "engine/qnt-adapters/magic_missile_adapter.aster",
	          owner: "harness-witness-protocol",
	          derivability: {
	            tag: "harness-witness-protocol",
	            witnessName: "stateCheck",
	          },
	        };
	        writeJson(manifestPath, manifest);
	      },
	      "checked replay state field must not use owner harness-witness-protocol",
	    );
    expectFailure(
      validRoot,
      profile,
      "state-owner-missing",
      (rootPath) => {
        const manifestPath = path.join(rootPath, "tasks/STATE_OWNER_MANIFEST.json");
        const manifest = readJson(manifestPath);
        delete manifest.durableFields[0].owner;
        writeJson(manifestPath, manifest);
      },
      "durableFields[0].owner",
    );
    expectFailure(
      validRoot,
      profile,
      "canonical-projection-state",
      (rootPath) => {
        const manifestPath = path.join(rootPath, "tasks/STATE_OWNER_MANIFEST.json");
        const manifest = readJson(manifestPath);
        manifest.durableFields[0].owner = "executable-boundary-projection";
        manifest.durableFields[0].derivability = { tag: "canonical-source" };
        writeJson(manifestPath, manifest);
      },
      "canonical-source derivability cannot be used with owner executable-boundary-projection",
    );
    expectFailure(
      validRoot,
      profile,
      "fixed-finding-no-followup",
      (rootPath) => {
        const reviewPath = path.join(rootPath, "tasks/REVIEW_LOOP.json");
        const review = readJson(reviewPath);
        review.findings = [
          {
            id: "R1",
            checklist: "code-shape-depth",
            reasonableness: "reasonable",
            status: "fixed",
            summary: "production API is witness-shaped",
          },
        ];
        writeJson(reviewPath, review);
      },
      "requires a follow-up review round",
    );
  } finally {
    fs.rmSync(validRoot, { recursive: true, force: true });
  }
  console.log("cleanroom harness self-test OK.");
}

function readProfile(taskRoot) {
  const profileArg = argValue("--profile");
  if (profileArg !== undefined) return readJson(path.resolve(profileArg));
  const candidates = [
    path.join(taskRoot, "cleanroom-input/target-profile.json"),
    path.join(taskRoot, "target-profile.json"),
  ];
  for (const candidate of candidates) {
    const profile = readJsonIfExists(candidate);
    if (profile !== undefined) return profile;
  }
  return undefined;
}

function main() {
  if (selfTest) {
    runSelfTest();
    return;
  }
  const taskRoot = path.resolve(argValue("--task-root") ?? process.cwd());
  const profile = readProfile(taskRoot);
  const issues = validateTaskArtifacts({ taskRoot, profile });
  if (issues.length > 0) {
    console.error("cleanroom harness acceptance FAILED:");
    for (const issue of issues) console.error(`  - ${issue}`);
    process.exit(1);
  }
  console.log("cleanroom harness acceptance passed.");
}

if (require.main === module) {
  main();
}
