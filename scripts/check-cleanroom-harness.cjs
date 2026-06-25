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

const validatorFiles = [
  "scripts/check-cleanroom-harness.cjs",
  "scripts/cleanroom-branch-coverage-check.cjs",
];

const historicalArtifacts = {
  startGate: "START_GATE.json",
  engineDepth: "ENGINE_DEPTH_MANIFEST.json",
  stateOwnerManifest: "STATE_OWNER_MANIFEST.json",
  reviewLoop: "REVIEW_LOOP.json",
  deciderDecision: "DECIDER_DECISION.json",
};

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

function sourceRepoRoot() {
  try {
    return git(path.resolve(__dirname, ".."), ["rev-parse", "--show-toplevel"]);
  } catch (_error) {
    return undefined;
  }
}

function gitTextAtCommit(repoRoot, commitSha, relativePath) {
  return execFileSync(
    "git",
    ["-C", repoRoot, "show", `${commitSha}:${relativePath}`],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
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
  const validatorHashes = new Map();
  for (const [lineIndex, line] of manifest.split("\n").entries()) {
    const validatorRow = line.match(
      /^\|\s*`(scripts\/[^`]+)`\s*\|\s*`([0-9a-f]{64})`\s*\|$/i,
    );
    if (validatorRow !== null) {
      validatorHashes.set(validatorRow[1], validatorRow[2].toLowerCase());
      continue;
    }
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
    validatorHashes,
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
  const routeInventoryManifestPath =
    "branch-coverage/reducer-route-inventory.json";
  if (!cleanroomManifest.fileHashes.has(routeInventoryManifestPath)) {
    issues.push(
      "cleanroom-input/MANIFEST.md must include branch-coverage/reducer-route-inventory.json.",
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

function readValidatorPatch(rootPath) {
  return readJsonIfExists(path.join(rootPath, "tasks/VALIDATOR_PATCH.json"));
}

function validatorPatchEntry(patch, relativePath) {
  if (!isRecord(patch) || !Array.isArray(patch.files)) return undefined;
  return patch.files.find(
    (entry) => isRecord(entry) && entry.path === relativePath,
  );
}

function validateValidatorPatchEntry({
  patch,
  relativePath,
  sourceCommitSha,
  baseSha,
  targetSha,
  issues,
}) {
  const entry = validatorPatchEntry(patch, relativePath);
  if (entry === undefined) {
    issues.push(
      `${relativePath} differs from the manifest source checker but tasks/VALIDATOR_PATCH.json has no patch record for it.`,
    );
    return false;
  }
  const context = `tasks/VALIDATOR_PATCH.json files[path=${relativePath}]`;
  if (patch.schemaVersion !== 1) {
    issues.push("tasks/VALIDATOR_PATCH.json schemaVersion must be 1.");
  }
  if (patch.sourceCommitSha !== sourceCommitSha) {
    issues.push("tasks/VALIDATOR_PATCH.json sourceCommitSha must match cleanroom-input/MANIFEST.md.");
  }
  validateString(patch.patchId, "tasks/VALIDATOR_PATCH.json patchId", issues);
  validateString(patch.rationale, "tasks/VALIDATOR_PATCH.json rationale", issues);
  if (entry.baseSha256 !== baseSha) {
    issues.push(`${context}.baseSha256 must match the source commit checker hash ${baseSha}.`);
  }
  if (entry.patchedSha256 !== targetSha) {
    issues.push(`${context}.patchedSha256 must match target-local ${relativePath} hash ${targetSha}.`);
  }
  return (
    patch.schemaVersion === 1 &&
    patch.sourceCommitSha === sourceCommitSha &&
    typeof patch.patchId === "string" &&
    patch.patchId.trim() !== "" &&
    typeof patch.rationale === "string" &&
    patch.rationale.trim() !== "" &&
    entry.baseSha256 === baseSha &&
    entry.patchedSha256 === targetSha
  );
}

function validatorProvenance({ taskRoot, cleanroomManifest, issues }) {
  const sourceCommitSha = cleanroomManifest?.sourceCommitSha;
  if (typeof sourceCommitSha !== "string") {
    return { shouldUseCurrentChecker: true };
  }
  const repoRoot = sourceRepoRoot();
  const patch = readValidatorPatch(taskRoot);
  const sourceHashes = new Map();
  const targetHashes = new Map();
  let canResolveSource = repoRoot !== undefined;
  for (const relativePath of validatorFiles) {
    const targetPath = path.join(taskRoot, relativePath);
    if (!fs.existsSync(targetPath)) {
      issues.push(`${relativePath} is missing from the cleanroom target.`);
      continue;
    }
    const targetSha = sha256File(targetPath);
    targetHashes.set(relativePath, targetSha);
    const manifestSha = cleanroomManifest.validatorHashes.get(relativePath);
    if (manifestSha !== undefined && manifestSha !== targetSha) {
      issues.push(
        `cleanroom-input/MANIFEST.md validator hash for ${relativePath} is stale: expected ${manifestSha}, got ${targetSha}.`,
      );
    }
    if (manifestSha === undefined) {
      issues.push(
        `cleanroom-input/MANIFEST.md must record validator hash for ${relativePath}.`,
      );
    }
    if (repoRoot === undefined) continue;
    try {
      const sourceText = gitTextAtCommit(repoRoot, sourceCommitSha, relativePath);
      const sourceSha = sha256Text(sourceText);
      sourceHashes.set(relativePath, sourceSha);
      if (manifestSha !== undefined && manifestSha !== sourceSha) {
        const approved = validateValidatorPatchEntry({
          patch,
          relativePath,
          sourceCommitSha,
          baseSha: sourceSha,
          targetSha,
          issues,
        });
        if (!approved) {
          issues.push(
            `cleanroom-input/MANIFEST.md validator hash for ${relativePath} must match source commit ${sourceCommitSha} unless tasks/VALIDATOR_PATCH.json approves the patch.`,
          );
        }
      }
      if (targetSha !== sourceSha) {
        validateValidatorPatchEntry({
          patch,
          relativePath,
          sourceCommitSha,
          baseSha: sourceSha,
          targetSha,
          issues,
        });
      }
    } catch (_error) {
      canResolveSource = false;
    }
  }
  return {
    shouldUseCurrentChecker:
      !canResolveSource ||
      sourceHashes.get("scripts/check-cleanroom-harness.cjs") ===
        sha256File(__filename) ||
      validatorPatchEntry(patch, "scripts/check-cleanroom-harness.cjs") !==
        undefined,
    sourceHashes,
    targetHashes,
    sourceRepoRoot: repoRoot,
  };
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
  routeInventory,
  selected,
  declaredEvidencePaths,
  expectedCleanroomManifestSourceCommitSha,
  evidencePaths,
  enforceNoExtraEvidence = true,
  issues,
}) {
  const expectedTargetProfileSha256 = targetProfileSha256(profile);
  const evidenceDir = path.join(rootPath, "tasks/target-replay-evidence");
  const evidenceFiles = listFiles(evidenceDir, (filePath) =>
    filePath.endsWith(".json"),
  );
  const declared = declaredEvidencePaths ?? new Set();
  const actualEvidencePaths = new Set(
    (evidencePaths === undefined
      ? evidenceFiles.map((filePath) => repoPath(rootPath, filePath))
      : evidencePaths
    ),
  );
  const inventorySha = sha256Text(stableStringify(inventory));
  const selectedObligations = requiredSelectedObligations(selected);
  if (selectedObligations.length === 0) {
    issues.push("selected task scope has no replayable in-scope branch obligations.");
  }
  if (evidenceFiles.length === 0) {
    issues.push("tasks/target-replay-evidence has no harness-generated evidence files.");
  }

  if (enforceNoExtraEvidence) {
    for (const evidencePath of actualEvidencePaths) {
      if (!declared.has(evidencePath)) {
        issues.push(`${evidencePath} is not declared by tasks/ENGINE_DEPTH_MANIFEST.json.`);
      }
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
    if (!actualEvidencePaths.has(context)) continue;
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
        routeInventory,
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
      routeInventory,
    },
  );
  issues.push(...targetEvidenceResult.issues);
  const coveredObligationIds = new Set(targetEvidenceResult.covered);
  const coveredEvidenceRefsByObligation = new Map();
  const checkedTargetStateFields = new Set();
  for (const filePath of evidenceFiles) {
    const context = repoPath(rootPath, filePath);
    if (!actualEvidencePaths.has(context)) continue;
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
          routeInventory,
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

function artifactPathForTask(taskId, fileName) {
  return `tasks/history/${taskId}/${fileName}`;
}

function validateArtifactRef({ rootPath, artifact, context, issues }) {
  if (!isRecord(artifact)) {
    issues.push(`${context} must be an object.`);
    return undefined;
  }
  validateString(artifact.path, `${context}.path`, issues);
  validateString(artifact.sha256, `${context}.sha256`, issues);
  if (
    typeof artifact.sha256 === "string" &&
    !/^[0-9a-f]{64}$/i.test(artifact.sha256)
  ) {
    issues.push(`${context}.sha256 must be a sha256 hex digest.`);
  }
  if (typeof artifact.path !== "string" || !isSafeRelativePath(artifact.path)) {
    issues.push(`${context}.path must be relative without parent segments.`);
    return undefined;
  }
  const filePath = path.join(rootPath, artifact.path);
  if (!fs.existsSync(filePath)) {
    issues.push(`${context}.path references missing ${artifact.path}.`);
    return undefined;
  }
  const actualSha = sha256File(filePath);
  if (artifact.sha256 !== actualSha) {
    issues.push(`${context}.sha256 is stale for ${artifact.path}: expected ${artifact.sha256}, got ${actualSha}.`);
  }
  return filePath;
}

function evidenceRefsFromSummary(summary) {
  return new Set(
    Array.from(summary.coveredEvidenceRefsByObligation.values()).flatMap((refs) =>
      Array.from(refs),
    ),
  );
}

function validateLedgerEntry({
  rootPath,
  entry,
  entryIndex,
  inventory,
  routeInventory,
  inventorySha,
  cleanroomManifest,
  activeAssignments,
  profile,
  issues,
}) {
  const context = `tasks/RUN_LEDGER.json entries[${entryIndex}]`;
  if (!isRecord(entry)) {
    issues.push(`${context} must be an object.`);
    return undefined;
  }
  validateString(entry.taskId, `${context}.taskId`, issues);
  validateString(entry.assignmentId, `${context}.assignmentId`, issues);
  validateString(entry.laneId, `${context}.laneId`, issues);
  validateStringArray(entry.selectedDrivers, `${context}.selectedDrivers`, issues);
  if (entry.manifestSourceCommitSha !== cleanroomManifest?.sourceCommitSha) {
    issues.push(`${context}.manifestSourceCommitSha must match cleanroom-input/MANIFEST.md.`);
  }
  if (entry.sourceBranchInventorySha256 !== inventorySha) {
    issues.push(`${context}.sourceBranchInventorySha256 must match cleanroom-input branch inventory hash ${inventorySha}.`);
  }
  if (!Array.isArray(entry.commandResults) || entry.commandResults.length === 0) {
    issues.push(`${context}.commandResults must be a non-empty array.`);
  } else {
    for (const [commandIndex, commandResult] of entry.commandResults.entries()) {
      const commandContext = `${context}.commandResults[${commandIndex}]`;
      if (!isRecord(commandResult)) {
        issues.push(`${commandContext} must be an object.`);
        continue;
      }
      validateString(commandResult.command, `${commandContext}.command`, issues);
      if (commandResult.status !== "pass") {
        issues.push(`${commandContext}.status must be pass.`);
      }
    }
  }
  if (!isRecord(entry.artifacts)) {
    issues.push(`${context}.artifacts must be an object.`);
    return undefined;
  }

  const artifactPaths = {};
  for (const [artifactKey, fileName] of Object.entries(historicalArtifacts)) {
    const artifactContext = `${context}.artifacts.${artifactKey}`;
    const artifact = entry.artifacts[artifactKey];
    const expectedPath =
      typeof entry.taskId === "string"
        ? artifactPathForTask(entry.taskId, fileName)
        : undefined;
    if (isRecord(artifact) && expectedPath !== undefined && artifact.path !== expectedPath) {
      issues.push(`${artifactContext}.path must be ${expectedPath}.`);
    }
    const filePath = validateArtifactRef({
      rootPath,
      artifact,
      context: artifactContext,
      issues,
    });
    if (filePath !== undefined) artifactPaths[artifactKey] = filePath;
  }
  if (Object.keys(artifactPaths).length !== Object.keys(historicalArtifacts).length) {
    return undefined;
  }

  const lanes = activeAssignments.get(entry.assignmentId);
  const laneQueue = lanes?.get(entry.laneId);
  if (typeof entry.assignmentId === "string" && lanes === undefined) {
    issues.push(`${context}.assignmentId is missing from tasks/ACTIVE_WORK.json.`);
  }
  if (typeof entry.laneId === "string" && lanes !== undefined && laneQueue === undefined) {
    issues.push(`${context}.laneId is missing from active assignment ${entry.assignmentId}.`);
  }
  for (const selectedDriver of entry.selectedDrivers ?? []) {
    if (laneQueue !== undefined && !laneQueue.has(selectedDriver)) {
      issues.push(`${context}.selectedDrivers includes driver not in active assignment lane: ${selectedDriver}.`);
    }
  }
  if ((entry.selectedDrivers ?? []).length !== 1) {
    issues.push(`${context}.selectedDrivers must contain exactly one queued driver.`);
  }

  const startGate = readJson(artifactPaths.startGate);
  const engineDepth = readJson(artifactPaths.engineDepth);
  const stateOwnerManifest = readJson(artifactPaths.stateOwnerManifest);
  const reviewLoop = readJson(artifactPaths.reviewLoop);
  const deciderDecision = readJson(artifactPaths.deciderDecision);
  for (const [artifactKey, artifact] of Object.entries({
    startGate,
    engineDepth,
    stateOwnerManifest,
    reviewLoop,
    deciderDecision,
  })) {
    if (artifact.taskId !== entry.taskId) {
      issues.push(`${context}.artifacts.${artifactKey} taskId must match ${entry.taskId}.`);
    }
  }
  if (
    JSON.stringify(startGate.taskScope?.selectedDrivers ?? []) !==
    JSON.stringify(entry.selectedDrivers ?? [])
  ) {
    issues.push(`${context}.selectedDrivers must match START_GATE taskScope.selectedDrivers.`);
  }

  const selected = selectedInventory(inventory, entry.selectedDrivers ?? []);
  const knownDrivers = new Set(
    (inventory.branchObligations ?? []).map((obligation) => obligation.driverPath),
  );
  for (const selectedDriver of entry.selectedDrivers ?? []) {
    if (!knownDrivers.has(selectedDriver)) {
      issues.push(`${context}.selectedDrivers includes unknown source branch inventory driver ${selectedDriver}.`);
    }
  }

  validateStartGate(startGate, rootPath, issues);
  const { adapterPaths, declaredEvidencePaths } = validateEngineDepth({
    engineDepth,
    selected,
    profile,
    rootPath,
    issues,
  });
  if (!Array.isArray(entry.targetReplayEvidence) || entry.targetReplayEvidence.length === 0) {
    issues.push(`${context}.targetReplayEvidence must be a non-empty array.`);
  }
  const ledgerEvidencePaths = new Set();
  const ledgerEvidenceRefs = new Set();
  for (const [evidenceIndex, evidenceRecord] of (entry.targetReplayEvidence ?? []).entries()) {
    const evidenceContext = `${context}.targetReplayEvidence[${evidenceIndex}]`;
    const filePath = validateArtifactRef({
      rootPath,
      artifact: evidenceRecord,
      context: evidenceContext,
      issues,
    });
    if (isRecord(evidenceRecord) && typeof evidenceRecord.path === "string") {
      if (!evidenceRecord.path.startsWith("tasks/target-replay-evidence/")) {
        issues.push(`${evidenceContext}.path must be under tasks/target-replay-evidence/.`);
      }
      ledgerEvidencePaths.add(evidenceRecord.path);
    }
    if (!Array.isArray(evidenceRecord?.evidenceRefs) || evidenceRecord.evidenceRefs.length === 0) {
      issues.push(`${evidenceContext}.evidenceRefs must be a non-empty array.`);
    } else {
      for (const ref of evidenceRecord.evidenceRefs) {
        if (typeof ref !== "string" || !ref.startsWith(`${evidenceRecord.path}#`)) {
          issues.push(`${evidenceContext}.evidenceRefs entry ${ref} must start with ${evidenceRecord.path}#.`);
        } else {
          ledgerEvidenceRefs.add(ref);
        }
      }
    }
    if (filePath !== undefined && !declaredEvidencePaths.has(evidenceRecord.path)) {
      issues.push(`${evidenceContext}.path is not declared by ${artifactPathForTask(entry.taskId, "ENGINE_DEPTH_MANIFEST.json")}.`);
    }
  }
  for (const declaredPath of declaredEvidencePaths) {
    if (!ledgerEvidencePaths.has(declaredPath)) {
      issues.push(`${context}.targetReplayEvidence must include declared evidence ${declaredPath}.`);
    }
  }

  const evidenceSummary = validateEvidenceDocs({
    rootPath,
    profile,
    inventory,
    routeInventory,
    selected,
    declaredEvidencePaths,
    evidencePaths: ledgerEvidencePaths,
    enforceNoExtraEvidence: false,
    expectedCleanroomManifestSourceCommitSha: cleanroomManifest?.sourceCommitSha,
    issues,
  });
  const acceptedEvidenceRefs = evidenceRefsFromSummary(evidenceSummary);
  for (const ref of ledgerEvidenceRefs) {
    if (!acceptedEvidenceRefs.has(ref)) {
      issues.push(`${context}.targetReplayEvidence cites non-accepted evidence ref ${ref}.`);
    }
  }
  for (const ref of acceptedEvidenceRefs) {
    if (!ledgerEvidenceRefs.has(ref)) {
      issues.push(`${context}.targetReplayEvidence is missing accepted evidence ref ${ref}.`);
    }
  }

  validateStateOwnerManifest({
    stateOwnerManifest,
    engineDepth,
    profile,
    rootPath,
    requiredStateFieldPaths: evidenceSummary.checkedTargetStateFields,
    issues,
  });
  validateReviewLoop(reviewLoop, issues);
  validateDeciderDecision(deciderDecision, issues);
  validateProductionSourceScan({
    rootPath,
    profile,
    engineDepth: isRecord(engineDepth) ? engineDepth : { adapterModules: [] },
    selected,
    issues,
  });
  if (adapterPaths.size === 0 && requiredSelectedObligations(selected).length > 0) {
    issues.push(`${context} adapter quarantine must record adapter modules for selected QNT branches.`);
  }
  return {
    entry,
    selected,
    evidenceSummary,
    evidencePaths: ledgerEvidencePaths,
    evidenceRefs: acceptedEvidenceRefs,
  };
}

function validateRollingLatestMatchesLedger({ rootPath, latestEntry, issues }) {
  if (!isRecord(latestEntry)) return;
  for (const [artifactKey, fileName] of Object.entries(historicalArtifacts)) {
    const latestPath = path.join(rootPath, "tasks", fileName);
    if (!fs.existsSync(latestPath)) {
      issues.push(`tasks/${fileName} latest view is missing.`);
      continue;
    }
    const latestSha = sha256File(latestPath);
    const historySha = latestEntry.artifacts?.[artifactKey]?.sha256;
    if (latestSha !== historySha) {
      issues.push(`tasks/${fileName} latest view must match newest RUN_LEDGER entry ${latestEntry.taskId}.`);
    }
  }
}

function validateRunLedger({
  rootPath,
  ledger,
  inventory,
  routeInventory,
  activeAssignments,
  profile,
  cleanroomManifest,
  issues,
}) {
  if (!isRecord(ledger)) return [];
  if (ledger.schemaVersion !== 1) {
    issues.push("tasks/RUN_LEDGER.json schemaVersion must be 1.");
  }
  if (ledger.manifestSourceCommitSha !== cleanroomManifest?.sourceCommitSha) {
    issues.push("tasks/RUN_LEDGER.json manifestSourceCommitSha must match cleanroom-input/MANIFEST.md.");
  }
  const inventorySha = sha256Text(stableStringify(inventory));
  if (ledger.sourceBranchInventorySha256 !== inventorySha) {
    issues.push(`tasks/RUN_LEDGER.json sourceBranchInventorySha256 must match ${inventorySha}.`);
  }
  if (!Array.isArray(ledger.entries) || ledger.entries.length === 0) {
    issues.push("tasks/RUN_LEDGER.json entries must be a non-empty array.");
    return [];
  }
  const taskIds = new Set();
  const summaries = [];
  const ledgerEvidencePaths = new Set();
  for (const [entryIndex, entry] of ledger.entries.entries()) {
    if (isRecord(entry) && typeof entry.taskId === "string") {
      if (taskIds.has(entry.taskId)) {
        issues.push(`tasks/RUN_LEDGER.json entries[${entryIndex}].taskId duplicates ${entry.taskId}.`);
      }
      taskIds.add(entry.taskId);
    }
    const summary = validateLedgerEntry({
      rootPath,
      entry,
      entryIndex,
      inventory,
      routeInventory,
      inventorySha,
      cleanroomManifest,
      activeAssignments,
      profile,
      issues,
    });
    if (summary !== undefined) {
      summaries.push(summary);
      for (const evidencePath of summary.evidencePaths) ledgerEvidencePaths.add(evidencePath);
    }
  }
  const actualEvidencePaths = new Set(
    listFiles(path.join(rootPath, "tasks/target-replay-evidence"), (filePath) =>
      filePath.endsWith(".json"),
    ).map((filePath) => repoPath(rootPath, filePath)),
  );
  for (const evidencePath of actualEvidencePaths) {
    if (!ledgerEvidencePaths.has(evidencePath)) {
      issues.push(`tasks/RUN_LEDGER.json does not account for target replay evidence ${evidencePath}.`);
    }
  }
  validateRollingLatestMatchesLedger({
    rootPath,
    latestEntry: ledger.entries.at(-1),
    issues,
  });
  return summaries;
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

function validateLedgerReportHonesty({
  rootPath,
  ledgerSummaries,
  cleanroomManifest,
  sourceBranchInventorySha256,
  issues,
}) {
  const reportPath = path.join(rootPath, "tasks/VALIDATION_REPORT.md");
  if (!fs.existsSync(reportPath)) {
    issues.push("tasks/VALIDATION_REPORT.md is missing.");
    return;
  }
  const report = fs.readFileSync(reportPath, "utf8");
  if (!report.includes("tasks/RUN_LEDGER.json")) {
    issues.push("tasks/VALIDATION_REPORT.md must cite tasks/RUN_LEDGER.json as the machine-readable run ledger.");
  }
  if (
    typeof cleanroomManifest?.sourceCommitSha !== "string" ||
    !report.includes(cleanroomManifest.sourceCommitSha)
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
  if (
    /(?:diagnostic|unit)[^\n.]{0,80}(?:close|satisfy|cover)[^\n.]{0,80}(?:branch|mbt)/i.test(
      report,
    )
  ) {
    issues.push(
      "validation report claims diagnostic target-language tests close MBT branch coverage.",
    );
  }

  const selectedObligationIds = new Set();
  const validEvidenceRefsByObligation = new Map();
  for (const summary of ledgerSummaries) {
    const taskId = summary.entry.taskId;
    if (!report.includes(taskId)) {
      issues.push(`tasks/VALIDATION_REPORT.md must include ledger task ${taskId}.`);
    }
    for (const driverPath of summary.entry.selectedDrivers ?? []) {
      if (!report.includes(driverPath)) {
        issues.push(`tasks/VALIDATION_REPORT.md must include selected driver ${driverPath}.`);
      }
    }
    for (const obligation of requiredSelectedObligations(summary.selected)) {
      selectedObligationIds.add(obligation.obligationId);
      validEvidenceRefsByObligation.set(
        obligation.obligationId,
        summary.evidenceSummary.coveredEvidenceRefsByObligation.get(
          obligation.obligationId,
        ) ?? new Set(),
      );
    }
  }

  const seenCoveredObligations = new Set();
  for (const [lineIndex, line] of report.split("\n").entries()) {
    const cells = parseMarkdownTableLine(line);
    if (cells === undefined) continue;
    const status = plainCell(cells.at(-1)).toLowerCase();
    if (status !== "covered") continue;
    const obligationId = plainCell(cells[0]);
    const evidenceCell = plainCell(cells[1]);
    if (
      evidenceCell === "_none_" ||
      !evidenceCell.includes("tasks/target-replay-evidence/")
    ) {
      issues.push(
        `tasks/VALIDATION_REPORT.md:${lineIndex + 1} marks branch covered without target replay evidence.`,
      );
    }
    if (/(?:diagnostic|\bunit\b)/i.test(evidenceCell)) {
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
      validEvidenceRefsByObligation.get(obligationId) ?? new Set();
    if (!validEvidenceRefs.has(evidenceCell)) {
      issues.push(
        `tasks/VALIDATION_REPORT.md:${lineIndex + 1} cites ${evidenceCell}, but RUN_LEDGER accepted evidence for ${obligationId} is ${Array.from(validEvidenceRefs).join(", ")}.`,
      );
    } else {
      seenCoveredObligations.add(obligationId);
    }
  }
  for (const obligationId of selectedObligationIds) {
    if (!seenCoveredObligations.has(obligationId)) {
      issues.push(
        `tasks/VALIDATION_REPORT.md is missing covered row for ledger obligation ${obligationId}.`,
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
  const routeInventory = readRequiredArtifact(
    taskRoot,
    "cleanroom-input/branch-coverage/reducer-route-inventory.json",
    issues,
  );
  const activeWork = readRequiredArtifact(taskRoot, "tasks/ACTIVE_WORK.json", issues);
  const runLedger = readRequiredArtifact(taskRoot, "tasks/RUN_LEDGER.json", issues);
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
  if (
    !isRecord(inventory) ||
    !isRecord(routeInventory) ||
    !isRecord(startGate) ||
    !isUsableHarnessProfile(profile)
  ) {
    return issues;
  }
  validateCleanroomInputIntegrity({
    rootPath: taskRoot,
    inventory,
    cleanroomManifest,
    issues,
  });
  activeQueuedDrivers(taskRoot, issues);
  const activeAssignments = validateActiveWork(activeWork, issues);
  if (isRecord(runLedger)) {
    const ledgerSummaries = validateRunLedger({
      rootPath: taskRoot,
      ledger: runLedger,
      inventory,
      routeInventory,
      activeAssignments,
      profile,
      cleanroomManifest,
      issues,
    });
    validateLedgerReportHonesty({
      rootPath: taskRoot,
      ledgerSummaries,
      cleanroomManifest,
      sourceBranchInventorySha256: sha256Text(stableStringify(inventory)),
      issues,
    });
    return issues;
  }
  const selectedDrivers = startGate.taskScope?.selectedDrivers ?? [];
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
    routeInventory,
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
    "- Immutable history: `tasks/history/T001/`",
    "- Run ledger: `tasks/RUN_LEDGER.json`",
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

function writeFixtureHistoryAndLedger({
  rootPath,
  taskId,
  inventory,
  selectedDrivers,
  evidencePath,
  evidenceRefs,
}) {
  const historyDir = path.join(rootPath, "tasks/history", taskId);
  fs.mkdirSync(historyDir, { recursive: true });
  const artifacts = {};
  for (const [artifactKey, fileName] of Object.entries(historicalArtifacts)) {
    const sourcePath = path.join(rootPath, "tasks", fileName);
    const destRelative = artifactPathForTask(taskId, fileName);
    const destPath = path.join(rootPath, destRelative);
    fs.copyFileSync(sourcePath, destPath);
    artifacts[artifactKey] = {
      path: destRelative,
      sha256: sha256File(destPath),
    };
  }
  writeJson(path.join(rootPath, "tasks/RUN_LEDGER.json"), {
    schemaVersion: 1,
    manifestSourceCommitSha: fixtureSha("3"),
    sourceBranchInventorySha256: sha256Text(stableStringify(inventory)),
    entries: [
      {
        taskId,
        assignmentId: "tracer-bullet",
        laneId: "battle",
        selectedDrivers,
        manifestSourceCommitSha: fixtureSha("3"),
        sourceBranchInventorySha256: sha256Text(stableStringify(inventory)),
        artifacts,
        targetReplayEvidence: [
          {
            path: evidencePath,
            sha256: sha256File(path.join(rootPath, evidencePath)),
            evidenceRefs,
          },
        ],
        commandResults: [
          {
            command: "node scripts/check-cleanroom-harness.cjs",
            status: "pass",
          },
        ],
      },
    ],
  });
}

function updateFixtureLedgerArtifact(rootPath, artifactKey, mutate) {
  const fileName = historicalArtifacts[artifactKey];
  const historyPath = path.join(rootPath, artifactPathForTask("T001", fileName));
  const latestPath = path.join(rootPath, "tasks", fileName);
  const artifact = readJson(historyPath);
  mutate(artifact);
  writeJson(historyPath, artifact);
  writeJson(latestPath, artifact);
  const ledgerPath = path.join(rootPath, "tasks/RUN_LEDGER.json");
  const ledger = readJson(ledgerPath);
  ledger.entries[0].artifacts[artifactKey].sha256 = sha256File(historyPath);
  writeJson(ledgerPath, ledger);
}

function updateFixtureLedgerEvidence(rootPath, mutate) {
  const evidencePath = path.join(rootPath, "tasks/target-replay-evidence/mm.json");
  const evidence = readJson(evidencePath);
  mutate(evidence);
  writeJson(evidencePath, evidence);
  const ledgerPath = path.join(rootPath, "tasks/RUN_LEDGER.json");
  const ledger = readJson(ledgerPath);
  ledger.entries[0].targetReplayEvidence[0].sha256 = sha256File(evidencePath);
  writeJson(ledgerPath, ledger);
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
  const routeInventory = {
    schemaVersion: 1,
    levelDenominators: [
      {
        denominatorId: "fixture-level-1-5-route",
        driverRouteAssignments: [
          {
            driverPath,
            route: "reducer-routed",
          },
        ],
        branchDecisionClasses: [],
      },
    ],
  };
  writeJson(
    path.join(
      rootPath,
      "cleanroom-input/branch-coverage/reducer-route-inventory.json",
    ),
    routeInventory,
  );
  const inventoryFileSha = sha256File(
    path.join(
      rootPath,
      "cleanroom-input/branch-coverage/source-branch-inventory.json",
    ),
  );
  const routeInventoryFileSha = sha256File(
    path.join(
      rootPath,
      "cleanroom-input/branch-coverage/reducer-route-inventory.json",
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
      `| \`branch-coverage/reducer-route-inventory.json\` | \`${routeInventoryFileSha}\` | \`plans/cleanroom-branch-coverage/reducer-route-inventory.json\` |`,
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
        projection: "qRoute",
        comparator: "route-event-list",
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
  writeFixtureHistoryAndLedger({
    rootPath,
    taskId: "T001",
    inventory,
    selectedDrivers: [driverPath],
    evidencePath: "tasks/target-replay-evidence/mm.json",
    evidenceRefs: inventory.branchObligations.map(
      (obligation) =>
        `tasks/target-replay-evidence/mm.json#seed=1 action=${obligation.branchAction}#${obligation.branchFamily}:${obligation.branchAction}`,
    ),
  });
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
	        updateFixtureLedgerEvidence(rootPath, (evidence) => {
	        evidence.cleanroomManifestSourceCommitSha = fixtureSha("4");
	        });
	      },
	      "cleanroomManifestSourceCommitSha",
	    );
    expectFailure(
      validRoot,
      profile,
      "missing-evidence-profile",
      (rootPath) => {
        updateFixtureLedgerEvidence(rootPath, (evidence) => {
        delete evidence.targetProfile;
        });
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
	      "tasks/RUN_LEDGER.json does not account for target replay evidence tasks/target-replay-evidence/stray.json",
	    );
    expectFailure(
      validRoot,
      profile,
      "missing-history-artifact",
      (rootPath) => {
        fs.rmSync(path.join(rootPath, "tasks/history/T001/START_GATE.json"));
      },
      "tasks/RUN_LEDGER.json entries[0].artifacts.startGate.path references missing tasks/history/T001/START_GATE.json",
    );
    expectFailure(
      validRoot,
      profile,
      "duplicate-ledger-task",
      (rootPath) => {
        const ledgerPath = path.join(rootPath, "tasks/RUN_LEDGER.json");
        const ledger = readJson(ledgerPath);
        ledger.entries.push({ ...ledger.entries[0] });
        writeJson(ledgerPath, ledger);
      },
      "taskId duplicates T001",
    );
    expectFailure(
      validRoot,
      profile,
      "stale-ledger-hash",
      (rootPath) => {
        const ledgerPath = path.join(rootPath, "tasks/RUN_LEDGER.json");
        const ledger = readJson(ledgerPath);
        ledger.entries[0].artifacts.engineDepth.sha256 = fixtureSha("9").padEnd(64, "9");
        writeJson(ledgerPath, ledger);
      },
      "artifacts.engineDepth.sha256 is stale",
    );
    expectFailure(
      validRoot,
      profile,
      "rolling-latest-mismatch",
      (rootPath) => {
        const latestPath = path.join(rootPath, "tasks/REVIEW_LOOP.json");
        const latest = readJson(latestPath);
        latest.rounds[0].round = 2;
        writeJson(latestPath, latest);
      },
      "tasks/REVIEW_LOOP.json latest view must match newest RUN_LEDGER entry T001",
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
        updateFixtureLedgerEvidence(rootPath, (evidence) => {
        evidence.targetProfileSha256 = fixtureSha("5");
        });
      },
      "targetProfileSha256",
    );
    expectFailure(
      validRoot,
      profile,
      "missing-sampled-input",
      (rootPath) => {
        updateFixtureLedgerEvidence(rootPath, (evidence) => {
        const damageRun = evidence.runs.find(
          (run) => run.branchAction === "doFillMagicMissileDamage",
        );
        delete damageRun.sampledInputs;
        });
      },
      "sampledInputs array is required",
    );
    expectFailure(
      validRoot,
      profile,
      "uncovered",
      (rootPath) => {
        updateFixtureLedgerEvidence(rootPath, (evidence) => {
        evidence.runs.pop();
        });
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
        updateFixtureLedgerArtifact(rootPath, "startGate", (startGate) => {
        startGate.preImplementationStatus.result = "dirty";
        startGate.preImplementationStatus.output = " M README.md";
        });
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
        updateFixtureLedgerArtifact(rootPath, "reviewLoop", (review) => {
        review.findings = [
          {
            id: "R1",
            checklist: "code-shape-depth",
            reasonableness: "reasonable",
            status: "open",
            summary: "production API is witness-shaped",
          },
        ];
        });
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
        updateFixtureLedgerArtifact(rootPath, "engineDepth", (manifest) => {
        manifest.productionModulesExtended[0].domainApis = [
          "doFillMagicMissileDamage",
        ];
        });
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
        updateFixtureLedgerArtifact(rootPath, "engineDepth", (manifest) => {
        manifest.productionModulesExtended[0].path = "engine/tests/fake_depth.aster";
        });
      },
      "must be production source",
    );
    expectFailure(
      validRoot,
      profile,
      "accumulator",
      (rootPath) => {
        updateFixtureLedgerArtifact(rootPath, "engineDepth", (manifest) => {
        manifest.accumulatorGrowth = [
          {
            path: "engine/rules/force_projectiles.aster",
            symbol: "driverRows",
            owner: "production",
            addedEntries: 30,
            reason: "driver-witness-table",
          },
        ];
        });
      },
      "large production accumulator growth",
    );
    expectFailure(
      validRoot,
      profile,
      "depth-missing",
      (rootPath) => {
        updateFixtureLedgerArtifact(rootPath, "engineDepth", (manifest) => {
        manifest.productionModulesExtended = [];
        delete manifest.completion;
        });
      },
      "engine depth manifest must record production modules",
    );
    expectFailure(
      validRoot,
      profile,
      "redundant-state",
      (rootPath) => {
        updateFixtureLedgerArtifact(rootPath, "stateOwnerManifest", (manifest) => {
        manifest.durableFields[0].derivability = {
          tag: "stored-derived-copy",
          sourceField: "CharacterBuild.spellFacts",
        };
        });
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
	      "RUN_LEDGER accepted evidence",
    );
    expectFailure(
      validRoot,
      profile,
      "report-failing-trace-ref",
      (rootPath) => {
        updateFixtureLedgerEvidence(rootPath, (evidence) => {
        const failedRun = {
          ...evidence.runs[0],
          traceId: "failed-trace",
          result: { tag: "fail", reason: "fixture failure" },
        };
        evidence.runs.push(failedRun);
        });
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
	      "RUN_LEDGER accepted evidence",
	    );
	    expectFailure(
	      validRoot,
	      profile,
	      "state-owner-missing-checked-field",
	      (rootPath) => {
	        updateFixtureLedgerArtifact(rootPath, "stateOwnerManifest", (manifest) => {
	        manifest.durableFields[0].fieldPath = "BattleState.otherField";
	        });
	      },
	      "must record checked replay state field BattleState.pendingForceProjectiles",
	    );
	    expectFailure(
	      validRoot,
	      profile,
	      "state-owner-checked-field-as-witness",
	      (rootPath) => {
	        updateFixtureLedgerArtifact(rootPath, "stateOwnerManifest", (manifest) => {
	        manifest.durableFields[0] = {
	          fieldPath: "BattleState.pendingForceProjectiles",
	          introducedIn: "engine/qnt-adapters/magic_missile_adapter.aster",
	          owner: "harness-witness-protocol",
	          derivability: {
	            tag: "harness-witness-protocol",
	            witnessName: "stateCheck",
	          },
	        };
	        });
	      },
	      "checked replay state field must not use owner harness-witness-protocol",
	    );
    expectFailure(
      validRoot,
      profile,
      "state-owner-missing",
      (rootPath) => {
        updateFixtureLedgerArtifact(rootPath, "stateOwnerManifest", (manifest) => {
        delete manifest.durableFields[0].owner;
        });
      },
      "durableFields[0].owner",
    );
    expectFailure(
      validRoot,
      profile,
      "canonical-projection-state",
      (rootPath) => {
        updateFixtureLedgerArtifact(rootPath, "stateOwnerManifest", (manifest) => {
        manifest.durableFields[0].owner = "executable-boundary-projection";
        manifest.durableFields[0].derivability = { tag: "canonical-source" };
        });
      },
      "canonical-source derivability cannot be used with owner executable-boundary-projection",
    );
    expectFailure(
      validRoot,
      profile,
      "fixed-finding-no-followup",
      (rootPath) => {
        updateFixtureLedgerArtifact(rootPath, "reviewLoop", (review) => {
        review.findings = [
          {
            id: "R1",
            checklist: "code-shape-depth",
            reasonableness: "reasonable",
            status: "fixed",
            summary: "production API is witness-shaped",
          },
        ];
        });
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

function runManifestPinnedCheckerIfNeeded(taskRoot) {
  if (process.env.CLEANROOM_CHECKER_SOURCE_RESOLVED === "1") return false;
  const manifestIssues = [];
  const cleanroomManifest = readCleanroomManifest(taskRoot, manifestIssues);
  if (manifestIssues.length > 0 || cleanroomManifest === undefined) {
    return false;
  }
  const provenanceIssues = [];
  const provenance = validatorProvenance({
    taskRoot,
    cleanroomManifest,
    issues: provenanceIssues,
  });
  if (provenanceIssues.length > 0) {
    console.error("cleanroom harness acceptance FAILED:");
    for (const issue of provenanceIssues) console.error(`  - ${issue}`);
    process.exit(1);
  }
  if (provenance.shouldUseCurrentChecker) return false;
  const repoRoot = provenance.sourceRepoRoot;
  const sourceCommitSha = cleanroomManifest.sourceCommitSha;
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cleanroom-source-checker-"));
  try {
    for (const relativePath of validatorFiles) {
      const outputPath = path.join(tempRoot, relativePath);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(
        outputPath,
        gitTextAtCommit(repoRoot, sourceCommitSha, relativePath),
      );
    }
    const args = [
      path.join(tempRoot, "scripts/check-cleanroom-harness.cjs"),
      "--task-root",
      taskRoot,
    ];
    const profileArg = argValue("--profile");
    if (profileArg !== undefined) args.push("--profile", path.resolve(profileArg));
    try {
      execFileSync(process.execPath, args, {
        cwd: repoRoot,
        stdio: "inherit",
        env: {
          ...process.env,
          CLEANROOM_CHECKER_SOURCE_RESOLVED: "1",
        },
      });
      process.exit(0);
    } catch (error) {
      process.exit(typeof error.status === "number" ? error.status : 1);
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function main() {
  if (selfTest) {
    runSelfTest();
    return;
  }
  const taskRoot = path.resolve(argValue("--task-root") ?? process.cwd());
  runManifestPinnedCheckerIfNeeded(taskRoot);
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
