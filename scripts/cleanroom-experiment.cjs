#!/usr/bin/env node
"use strict";

// Shared scoped cleanroom experiment implementation used by the existing
// package-cleanroom-refresh command. The package script remains the command
// owner; this module supplies reusable catalog and receipt operations.

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const {
  requireCleanSourcePaths,
  verifyImportsResolve,
} = require("./sync-cleanroom-input.cjs");
const {
  buildReceiptContractProjection,
  stableStringify,
  validateTargetReceipt,
} = require("./cleanroom-target-receipt.cjs");

const root = path.resolve(__dirname, "..");
const DEFAULT_SCOPE =
  "plans/ralph-artifacts/l12-cleanroom-ice-knife-pilot/unit-readiness-scope.json";
const DEFAULT_PROFILE =
  "plans/cleanroom-scaffolds/target-profiles/synthetic-alpha.json";
const DEFAULT_OUTPUT_ROOT = path.resolve(
  root,
  "..",
  "dnd-cleanroom-ice-knife-export",
);
const CONTRACT_PATH = "plans/L12_CLEANROOM_EXPERIMENT_CONTRACT.md";
const RECEIPT_PROJECTION_DEST =
  "cleanroom-input/harness/target-receipt-contract.json";
const OUTPUT_MARKER = ".cleanroom-experiment-output";
const OUTPUT_MARKER_CONTENT = "cleanroom-experiment-output.v1\n";
const GENERATOR_PATHS = [
  "scripts/cleanroom-experiment.cjs",
  "scripts/cleanroom-target-receipt.cjs",
  "scripts/package-cleanroom-refresh.cjs",
  "scripts/sync-cleanroom-input.cjs",
  "scripts/source-calibration-check.cjs",
  "scripts/unit-readiness-check.cjs",
];

function fail(message) {
  throw new Error(`cleanroom experiment: ${message}`);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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

function sha256Text(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256Buffer(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256File(filePath) {
  return sha256Buffer(fs.readFileSync(filePath));
}

function repoPath(relativePath) {
  if (typeof relativePath !== "string" || relativePath.trim() === "") {
    fail("repository paths must be non-empty strings");
  }
  if (
    path.isAbsolute(relativePath) ||
    relativePath.split(/[\\/]/).includes("..")
  ) {
    fail(`repository path escapes the source root: ${relativePath}`);
  }
  return path.join(root, relativePath);
}

function readJson(relativePath, label = relativePath) {
  const absolute = repoPath(relativePath);
  if (!fs.existsSync(absolute))
    fail(`${label} is unavailable: ${relativePath}`);
  try {
    return JSON.parse(fs.readFileSync(absolute, "utf8"));
  } catch (error) {
    fail(`${label} is not valid JSON: ${error.message}`);
  }
}

function git(...args) {
  return execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
  }).trim();
}

function sourcePathFromCleanroomPath(value) {
  if (value.startsWith("packages/")) return value;
  if (value.startsWith(".references/")) return value;
  if (value === "UBIQUITOUS_LANGUAGE.md") return value;
  if (value === "plans/CLEANROOM_ASSUMPTIONS.md") return value;
  if (value.startsWith("plans/cleanroom-guidance/")) return value;
  return undefined;
}

function addPath(paths, value) {
  if (typeof value !== "string") return;
  const source = sourcePathFromCleanroomPath(value);
  if (source !== undefined) paths.add(source);
}

function addNestedPathFields(paths, value) {
  if (Array.isArray(value)) {
    for (const entry of value) addNestedPathFields(paths, entry);
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, entry] of Object.entries(value)) {
    if (key.endsWith("Path") && typeof entry === "string")
      addPath(paths, entry);
    if (key === "sourceHashes" && isRecord(entry)) {
      for (const source of Object.keys(entry)) addPath(paths, source);
    }
    addNestedPathFields(paths, entry);
  }
}

function cleanroomDestination(sourcePath) {
  if (sourcePath.startsWith("packages/")) {
    return `cleanroom-input/qnt/${sourcePath.slice("packages/".length)}`;
  }
  if (sourcePath.startsWith(".references/srd-5.2.1/")) {
    return `cleanroom-input/raw/srd-5.2.1/${sourcePath.slice(".references/srd-5.2.1/".length)}`;
  }
  if (sourcePath === "UBIQUITOUS_LANGUAGE.md")
    return "cleanroom-input/domain/UBIQUITOUS_LANGUAGE.md";
  if (sourcePath === "plans/CLEANROOM_ASSUMPTIONS.md")
    return "cleanroom-input/domain/CLEANROOM_ASSUMPTIONS.md";
  if (sourcePath.startsWith("plans/cleanroom-guidance/")) {
    return `cleanroom-input/guidance/${sourcePath.slice("plans/cleanroom-guidance/".length)}`;
  }
  fail(`no cleanroom destination for ${sourcePath}`);
}

function cleanroomPath(sourcePath) {
  return cleanroomDestination(sourcePath);
}

function transformSourcePath(value) {
  if (typeof value !== "string") return value;
  if (value.startsWith("packages/")) return cleanroomPath(value);
  if (value.startsWith(".references/srd-5.2.1/")) return cleanroomPath(value);
  if (value === "UBIQUITOUS_LANGUAGE.md") return cleanroomPath(value);
  if (value === "plans/CLEANROOM_ASSUMPTIONS.md") return cleanroomPath(value);
  if (value.startsWith("plans/cleanroom-guidance/"))
    return cleanroomPath(value);
  return value;
}

function transformPaths(value) {
  if (Array.isArray(value)) return value.map(transformPaths);
  if (!isRecord(value)) return transformSourcePath(value);
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, transformPaths(entry)]),
  );
}

function scopeSelection(scope) {
  const selected = scope?.scope;
  if (
    selected?.kind !== "single-unit" ||
    selected?.fullCorpus !== false ||
    !Array.isArray(selected.unitIds) ||
    selected.unitIds.length !== 1 ||
    typeof selected.unitIds[0] !== "string" ||
    selected.unitIds[0].trim() === ""
  ) {
    fail(
      "export requires one non-empty single-unit selection with fullCorpus false",
    );
  }
  return selected;
}

function findSelectedUnit(index, unitId) {
  const units = Array.isArray(index?.units) ? index.units : [];
  const matches = units.filter((unit) => unit?.unitId === unitId);
  if (matches.length !== 1)
    fail(`readiness index must contain exactly one selected Unit: ${unitId}`);
  return matches[0];
}

function selectedQntPaths(unit) {
  const paths = new Set();
  for (const file of unit.qnt?.files ?? []) addPath(paths, file.path);
  for (const file of unit.qnt?.prerequisiteOrder ?? []) addPath(paths, file);
  addPath(paths, unit.qnt?.driver?.path);
  for (const connector of [
    ...(unit.connectors?.routes ?? []),
    ...(unit.connectors?.components ?? []),
  ]) {
    addPath(paths, connector.path);
  }
  const qnt = [...paths].filter((value) => value.endsWith(".qnt")).sort();
  if (qnt.length === 0) fail("selected Unit has no QNT closure");
  return qnt;
}

function requireQntClosure(qntPaths) {
  const present = new Set(qntPaths);
  const importLine = /^\s*import\b.*?\bfrom\s+"([^"]+)"/;
  for (const sourcePath of qntPaths) {
    const absolute = repoPath(sourcePath);
    if (!fs.existsSync(absolute))
      fail(`selected QNT input is unavailable: ${sourcePath}`);
    for (const line of fs.readFileSync(absolute, "utf8").split("\n")) {
      const match = importLine.exec(line);
      if (
        match === null ||
        (!match[1].startsWith(".") && !match[1].startsWith("/"))
      )
        continue;
      const imported = path
        .normalize(path.join(path.dirname(sourcePath), `${match[1]}.qnt`))
        .split(path.sep)
        .join("/");
      if (!present.has(imported))
        fail(
          `selected QNT closure is missing ${imported}, imported by ${sourcePath}`,
        );
    }
  }
}

function runSourceGate(script, args) {
  execFileSync(process.execPath, [path.join(root, script), ...args], {
    cwd: root,
    stdio: "inherit",
  });
}

function validateOutputPath(outputRoot) {
  const output = path.resolve(outputRoot);
  const source = path.resolve(root);
  const outputWithinSource = path.relative(source, output);
  const sourceWithinOutput = path.relative(output, source);
  const isWithin = (relative) =>
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative));
  if (isWithin(outputWithinSource) || isWithin(sourceWithinOutput)) {
    fail(
      "output must be outside the source tree and must not contain the source tree",
    );
  }
  if (fs.existsSync(output)) {
    const marker = path.join(output, OUTPUT_MARKER);
    if (
      !fs.statSync(output).isDirectory() ||
      !fs.existsSync(marker) ||
      fs.readFileSync(marker, "utf8") !== OUTPUT_MARKER_CONTENT
    ) {
      fail("existing output must be an exporter-owned catalog destination");
    }
  }
  return output;
}

function requireFinalizationClean() {
  const status = git("status", "--porcelain", "--untracked-files=no");
  if (status !== "") {
    fail(
      `--finalize requires a tracked-clean source commit; commit or discard tracked changes first:\n${status}`,
    );
  }
}

function sourceCalibration(scope) {
  const calibration = readJson(
    scope.sourceCalibrationArtifact,
    "source calibration artifact",
  );
  if (calibration.verificationEvidence?.result !== "passed") {
    fail("source calibration artifact is not passed");
  }
  if (!isRecord(calibration.sourceHashes))
    fail("source calibration artifact has no source hashes");
  return calibration;
}

function readiness(scopePath, scope) {
  const calibrationScopePath =
    scope.sourceCalibrationScopePath ??
    scope.sourceCalibrationArtifact.replace(
      /source-calibration-index\.json$/,
      "source-calibration-scope.json",
    );
  runSourceGate("scripts/source-calibration-check.cjs", [
    "--scope",
    calibrationScopePath,
  ]);
  runSourceGate("scripts/unit-readiness-check.cjs", ["--scope", scopePath]);
  const result = readJson(scope.artifacts?.resultPath, "Unit readiness result");
  return requireReadyResult(result);
}

function requireReadyResult(result) {
  if (
    result.status !== "ready" ||
    !Array.isArray(result.issues) ||
    result.issues.length !== 0
  ) {
    fail("source readiness is not ready; export is refused");
  }
  return result;
}

function projectedIndex(index, copies) {
  const projected = transformPaths({
    ...index,
    generatedBy: "cleanroom-export",
  });
  projected.hashes = Object.fromEntries(
    copies
      .filter(
        (copy) =>
          copy.source !== undefined && copy.dest !== RECEIPT_PROJECTION_DEST,
      )
      .map((copy) => [copy.dest, copy.sha256]),
  );
  delete projected.contentSha256;
  projected.contentSha256 = sha256Text(stableJson(projected));
  return projected;
}

function addSourceCopy(copies, sourcePath) {
  const absolute = repoPath(sourcePath);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile())
    fail(`input is unavailable: ${sourcePath}`);
  copies.push({
    source: sourcePath,
    dest: cleanroomDestination(sourcePath),
    content: fs.readFileSync(absolute),
  });
}

function architectureProjection(sourcePath, unitId) {
  const content = fs.readFileSync(repoPath(sourcePath), "utf8");
  const allowedHeadings = new Set([
    "Target Surface",
    "Subject And Fill Lifecycle",
    "Adapter Quarantine",
    "Cleanroom Boundary And Identity Dispatch",
  ]);
  const sections = [];
  let currentHeading;
  let currentLines = [];
  const flush = () => {
    if (currentHeading !== undefined && allowedHeadings.has(currentHeading)) {
      let sectionText = currentLines.join("\n").trim();
      if (currentHeading === "Subject And Fill Lifecycle") {
        sectionText = sectionText
          .split("The reducer-spine contract witness")[0]
          .trim();
      }
      sections.push(`## ${currentHeading}\n\n${sectionText}\n`);
    }
    currentHeading = undefined;
    currentLines = [];
  };
  for (const line of content.split("\n")) {
    const heading = /^## (.+)$/.exec(line)?.[1];
    if (heading !== undefined) {
      flush();
      currentHeading = heading;
    } else if (currentHeading !== undefined) {
      currentLines.push(line);
    }
  }
  flush();
  if (sections.length !== allowedHeadings.size)
    fail(
      `architecture guidance is missing a target-facing section: ${sourcePath}`,
    );
  return Buffer.from(
    `# Target-Facing Architecture Guidance: ${unitId}\n\n` +
      "This projection is limited to the selected Unit. It contains no source workflow backlog, workflow history, or instructions to consult files outside the immutable catalog.\n\n" +
      sections.join("\n"),
  );
}

function buildCopies(scope, index, unit, profilePath) {
  const copies = [];
  const sourcePaths = new Set();
  const architecturePaths = new Set();
  for (const qntPath of selectedQntPaths(unit)) sourcePaths.add(qntPath);
  addPath(sourcePaths, unit.raw?.path);
  for (const domainPath of scope.domainPaths ?? [])
    addPath(sourcePaths, domainPath);
  for (const architecturePath of scope.architecturePaths ?? []) {
    const sourcePath = sourcePathFromCleanroomPath(architecturePath);
    if (sourcePath === undefined)
      fail(
        `architecture guidance is not an approved cleanroom path: ${architecturePath}`,
      );
    architecturePaths.add(sourcePath);
  }
  for (const sourcePath of [...sourcePaths].sort())
    addSourceCopy(copies, sourcePath);
  for (const sourcePath of [...architecturePaths].sort()) {
    const absolute = repoPath(sourcePath);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile())
      fail(`architecture guidance is unavailable: ${sourcePath}`);
    copies.push({
      source: sourcePath,
      dest: cleanroomDestination(sourcePath),
      content: architectureProjection(sourcePath, unit.unitId),
    });
  }
  const projected = projectedIndex(
    index,
    copies.map((copy) => ({ ...copy, sha256: sha256Buffer(copy.content) })),
  );
  copies.push({
    source: undefined,
    dest: "cleanroom-input/unit/unit-readiness-index.json",
    content: Buffer.from(stableJson(projected)),
  });
  const profile = readJson(profilePath, "target profile");
  const targetProfile = targetProfileProjection(profile);
  copies.push({
    source: profilePath,
    dest: "target-profile.json",
    content: Buffer.from(stableJson(targetProfile)),
  });
  const projection = buildReceiptContractProjection(repoPath(CONTRACT_PATH));
  copies.push({
    source: undefined,
    dest: RECEIPT_PROJECTION_DEST,
    content: Buffer.from(stableJson(projection)),
  });
  return { copies, profile: targetProfile, projectedIndex: projected };
}

function branchManifestEntries(unit, calibration) {
  const calibrationByAction = new Map(
    (calibration.branchCalibrations ?? []).map((branch) => [
      branch.branchAction,
      branch,
    ]),
  );
  const driverPath = cleanroomPath(unit.qnt.driver.path);
  return (unit.qnt.driver.actions ?? []).map((action) => {
    const branch = calibrationByAction.get(action);
    if (!branch) fail(`selected branch is not calibrated: ${action}`);
    return {
      driverPath,
      branchAction: action,
      qntFileSha256: branch.qntFileSha256,
      calibratedObligationIds: [
        ...(branch.calibratedObligationIds ?? []),
      ].sort(),
      replayLane: "native-qnt-mbt",
      targetEvidence: {
        productionEntrypoint: "required",
        productionProjection: "required",
      },
    };
  });
}

function inputHashes(copies) {
  return copies
    .map((copy) => ({ dest: copy.dest, sha256: sha256Buffer(copy.content) }))
    .sort((left, right) => left.dest.localeCompare(right.dest));
}

function targetVerificationCommands(profile) {
  const commands = (profile.verificationCommands ?? []).filter(
    (entry) =>
      typeof entry?.command === "string" &&
      !/\bnode\s+(?:\.\/)?scripts\//.test(entry.command),
  );
  if (commands.length === 0)
    fail("target profile has no target-native verification command");
  return commands;
}

function targetProfileProjection(profile) {
  return {
    ...profile,
    verificationCommands: targetVerificationCommands(profile),
  };
}

function renderGoal(manifest, profile) {
  const branches = manifest.selectedBranches
    .map((branch) => `- \`${branch.driverPath}\` — \`${branch.branchAction}\``)
    .join("\n");
  const commands = targetVerificationCommands(profile)
    .map((entry) => `- ${entry.label}: \`${entry.command}\``)
    .join("\n");
  const runDescription =
    manifest.runKind === "fresh-experiment"
      ? "You are running a fresh cleanroom experiment."
      : "You are running a diagnostic rehearsal; its result is never fresh cleanroom acceptance.";
  const baselineStep =
    manifest.runKind === "fresh-experiment"
      ? "1. **Bootstrap:** initialize only the declared target inputs and target toolchain, then create and record the bootstrap commit before implementation begins.\n"
      : "1. **Diagnostic baseline:** use the declared existing implementation baseline, record its baseline commit and known pre-existing implementation paths, and do not modify those paths before the start attestation.\n";
  return (
    `# Target /goal: ${manifest.scope.unitIds[0]}\n\n` +
    `${runDescription} Work in this target repository only. ` +
    "Do not read a source repository, prior target, external rules source, or implementation history. " +
    "The declared input catalog is the complete source of rules knowledge.\n\n" +
    "## Contract\n\n" +
    `Implement exactly the one-Unit scope \`${manifest.scope.unitIds[0]}\`. This is a single-Unit pilot, not full L1-2 readiness. ` +
    "Use the cleanroom input Unit index to navigate the RAW, domain guidance, and QNT closure. " +
    "Do not invent behavior when the corpus is insufficient; record a structured target observation in the receipt. If no branch can be observed, emit a blocked receipt with retained evidence rather than claiming a branch result.\n\n" +
    "## Required branch replay\n\n" +
    "Implement the complete Unit and replay every selected branch through its native QNT/MBT lane and your production API. " +
    "For every branch, retain the exact observed action, target production entrypoint, target production projection, and comparison evidence.\n\n" +
    `${branches}\n\n` +
    "## Verification\n\n" +
    `${commands}\n` +
    "- Run the target harness against every selected branch.\n" +
    "- Keep QNT action dispatch in the quarantined harness boundary; production APIs must remain domain-shaped.\n" +
    "\n" +
    "## Ordered target protocol\n\n" +
    "Follow this order exactly; the start attestation must precede every implementation or replay change.\n\n" +
    baselineStep +
    "2. **Start boundary:** set `targetStartCommit=$(git rev-parse HEAD)` at the bootstrap commit and immediately run `git status --porcelain=v2`. A fresh experiment must be clean with the empty-output SHA-256 `" +
    manifest.emptyStatusOutputSha256 +
    "`. A diagnostic rehearsal must record the actual status independently and declare its pre-existing implementation boundary; a committed diagnostic baseline is normally clean with the same empty-output SHA.\n" +
    "3. **Implementation and replay:** implement the one Unit, run every selected native QNT/MBT branch through the production API, and retain the prescribed evidence.\n" +
    "4. **Finish commit:** commit the implementation and all retained evidence, then set `targetFinishCommit=$(git rev-parse HEAD)`.\n" +
    "5. **Finish attestation:** immediately run `git status --porcelain=v2`, require empty output, record the empty-output SHA-256, and run `git merge-base --is-ancestor targetStartCommit targetFinishCommit`.\n" +
    "6. **External receipt:** only after the finish commit and finish attestation, construct the receipt from `cleanroom-input/harness/target-receipt-contract.json`. Keep the receipt external; do not add it to the finish commit.\n\n" +
    "## Receipt and handoff\n\n" +
    "Write an external receipt after the finish commit using `cleanroom-input/harness/target-receipt-contract.json`. " +
    "The receipt must include the manifest binding, target outcome, exact branch observations when completed, structured target observations when blocked before replay, retained artifact hashes, timestamps, and every measurement-provenance field as reported or explicitly unavailable. " +
    "Return a final handoff message naming the receipt and retained-evidence locations and directing the operator to source intake. " +
    "Do not adjudicate the result as source success; source intake owns classification.\n"
  );
}

function manifestMarkdown(manifest) {
  const files = manifest.inputHashes
    .map((entry) => `| \`${entry.dest}\` | \`${entry.sha256}\` |`)
    .join("\n");
  const branches = manifest.selectedBranches
    .map((entry) => `- \`${entry.branchAction}\` via \`${entry.driverPath}\``)
    .join("\n");
  return (
    `# Cleanroom Experiment Manifest\n\n` +
    `- Schema: \`${manifest.schema}\`\n- Source commit: \`${manifest.sourceCommitSha}\`\n` +
    `- Run kind: \`${manifest.runKind}\`\n- Unit: \`${manifest.scope.unitIds[0]}\`\n` +
    `- Catalog SHA-256: \`${manifest.catalogSha256}\`\n\n` +
    "This catalog is one single-Unit experiment. It is not a full-corpus readiness claim.\n\n" +
    "## Selected branches\n\n" +
    `${branches}\n\n` +
    "## Declared input hashes\n\n| Input | SHA-256 |\n| --- | --- |\n" +
    `${files}\n`
  );
}

function writeCatalog(directory, manifest, goal, copies) {
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, OUTPUT_MARKER), OUTPUT_MARKER_CONTENT);
  for (const copy of copies) {
    const destination = path.join(directory, copy.dest);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, copy.content);
  }
  fs.writeFileSync(path.join(directory, "manifest.json"), stableJson(manifest));
  fs.writeFileSync(
    path.join(directory, "MANIFEST.md"),
    manifestMarkdown(manifest),
  );
  fs.writeFileSync(path.join(directory, "target-goal.md"), goal);
}

function publishOutput(
  outputRoot,
  manifest,
  goal,
  copies,
  verify = verifyImportsResolve,
) {
  const output = validateOutputPath(outputRoot);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const staging = fs.mkdtempSync(
    path.join(path.dirname(output), `.${path.basename(output)}.staging-`),
  );
  try {
    writeCatalog(staging, manifest, goal, copies);
    const importsChecked = verify(
      staging,
      copies.map((copy) => ({ dest: copy.dest })),
    );
    if (fs.existsSync(output)) {
      validateOutputPath(output);
      if (!directoriesIdentical(output, staging)) {
        fail(
          "existing output is an exporter-owned catalog with different bytes; choose a new destination",
        );
      }
      return importsChecked;
    }
    fs.renameSync(staging, output);
    return importsChecked;
  } finally {
    if (fs.existsSync(staging))
      fs.rmSync(staging, { recursive: true, force: true });
  }
}

function catalogBasis(manifestWithoutCatalog, copies, goal) {
  return {
    schema: "cleanroom-experiment-catalog.v1",
    manifest: manifestWithoutCatalog,
    inputHashes: inputHashes(copies),
    targetGoalSha256: sha256Text(goal),
  };
}

function generatorHashes() {
  return GENERATOR_PATHS.map((sourcePath) => ({
    role:
      sourcePath === "scripts/cleanroom-experiment.cjs"
        ? "catalog-generator"
        : sourcePath === "scripts/cleanroom-target-receipt.cjs"
          ? "receipt-contract-generator"
          : sourcePath === "scripts/package-cleanroom-refresh.cjs"
            ? "package-entrypoint"
            : sourcePath === "scripts/sync-cleanroom-input.cjs"
              ? "cleanroom-input-sync"
              : sourcePath === "scripts/source-calibration-check.cjs"
                ? "source-calibration-gate"
                : "unit-readiness-gate",
    sha256: sha256File(repoPath(sourcePath)),
  }));
}

function exportExperiment(options, dependencies = {}) {
  validateOutputPath(options.output);
  if (options.finalize) requireFinalizationClean();
  const scopePath = options.scope;
  const scope = readJson(scopePath, "experiment scope");
  const selectedScope = scopeSelection(scope);
  const unitId = selectedScope.unitIds[0];
  const calibration = sourceCalibration(scope);
  const calibrationScopePath =
    scope.sourceCalibrationScopePath ??
    scope.sourceCalibrationArtifact.replace(
      /source-calibration-index\.json$/,
      "source-calibration-scope.json",
    );
  const index = readJson(scope.artifacts.indexPath, "Unit readiness index");
  const unit = findSelectedUnit(index, unitId);
  const profilePath = options.profile;
  const gatePaths = new Set([
    scopePath,
    calibrationScopePath,
    scope.sourceCalibrationArtifact,
    scope.artifacts.indexPath,
    scope.artifacts.resultPath,
    CONTRACT_PATH,
    profilePath,
    ...GENERATOR_PATHS,
  ]);
  addNestedPathFields(gatePaths, scope);
  addNestedPathFields(gatePaths, calibration);
  addNestedPathFields(gatePaths, index);
  requireQntClosure(selectedQntPaths(unit));
  const {
    copies,
    profile: targetProfile,
    projectedIndex,
  } = buildCopies(scope, index, unit, profilePath);
  for (const copy of copies) {
    if (copy.source !== undefined) gatePaths.add(copy.source);
  }
  requireCleanSourcePaths(root, [...gatePaths]);

  const readinessResult = requireReadyResult(
    (dependencies.readiness ?? readiness)(scopePath, scope),
  );
  if (readinessResult.scope?.unitIds?.[0] !== unitId)
    fail("readiness result does not match declared scope");

  const contractSha256 = sha256File(repoPath(CONTRACT_PATH));
  const calibrationSha256 = sha256File(
    repoPath(scope.sourceCalibrationArtifact),
  );
  const targetProfileSha256 = sha256File(repoPath(profilePath));
  const hashes = inputHashes(copies);
  const branches = branchManifestEntries(unit, calibration);
  const projectionCopy = copies.find(
    (copy) => copy.dest === RECEIPT_PROJECTION_DEST,
  );
  const baseManifest = {
    schema: "cleanroom-experiment-manifest.v1",
    sourceCommitSha: git("rev-parse", "HEAD"),
    scope: { kind: "single-unit", unitIds: [unitId], fullCorpus: false },
    runKind: options.runKind,
    finalization: {
      tag: options.finalize ? "post-ralph-finalization" : "scoped-export",
      trackedCleanCommitVerified: options.finalize,
    },
    sourceReadiness: {
      status: "ready",
      resultSha256: sha256File(repoPath(scope.artifacts.resultPath)),
    },
    sourceCalibration: { status: "passed", indexSha256: calibrationSha256 },
    generatorHashes: generatorHashes(),
    canonicalContractSha256: contractSha256,
    targetProfile: {
      id: targetProfile.targetProfileId,
      sha256: targetProfileSha256,
      projectionSha256: sha256Buffer(
        copies.find((copy) => copy.dest === "target-profile.json").content,
      ),
    },
    inputHashes: hashes,
    cleanroomUnitIndexSha256: sha256Buffer(
      copies.find(
        (copy) =>
          copy.dest === "cleanroom-input/unit/unit-readiness-index.json",
      ).content,
    ),
    receiptContractProjectionSha256: sha256Buffer(projectionCopy.content),
    emptyStatusOutputSha256: JSON.parse(projectionCopy.content)
      .emptyStatusOutputSha256,
    selectedBranches: branches,
    targetGoalPath: "target-goal.md",
    receiptPath: "target-receipt.json",
    catalogSha256: undefined,
  };
  const goal = renderGoal(baseManifest, targetProfile);
  const basis = catalogBasis(
    { ...baseManifest, catalogSha256: undefined },
    copies,
    goal,
  );
  const catalogSha256 = sha256Text(stableJson(basis));
  const manifest = { ...baseManifest, catalogSha256 };
  delete manifest.catalogSha256;
  manifest.catalogSha256 = catalogSha256;
  const importsChecked = publishOutput(options.output, manifest, goal, copies);
  return { manifest, goal, copies, projectedIndex, importsChecked };
}

function parseArgs(argv) {
  const options = {
    scope: DEFAULT_SCOPE,
    profile: DEFAULT_PROFILE,
    output: undefined,
    runKind: "fresh-experiment",
    selfTest: false,
    finalize: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--") continue;
    if (argument === "--self-test") options.selfTest = true;
    else if (argument === "--finalize") options.finalize = true;
    else if (
      ["--scope", "--profile", "--output", "--run-kind"].includes(argument)
    ) {
      const value = argv[++index];
      if (value === undefined || value.startsWith("--"))
        fail(`${argument} requires a value`);
      if (argument === "--scope") options.scope = value;
      if (argument === "--profile") options.profile = value;
      if (argument === "--output") options.output = value;
      if (argument === "--run-kind") options.runKind = value;
    } else if (argument === "--help") {
      process.stdout.write(
        "usage: pnpm cleanroom:export:l12-ice-knife -- --scope scope.json --profile profile.json --output directory [--run-kind fresh-experiment|diagnostic-rehearsal] [--finalize]\n",
      );
      return undefined;
    } else {
      fail(`unknown argument ${argument}`);
    }
  }
  if (!options.output) {
    const sourceSha = git("rev-parse", "HEAD");
    options.output = path.join(DEFAULT_OUTPUT_ROOT, `ice-knife-${sourceSha}`);
  } else {
    options.output = path.resolve(options.output);
  }
  if (!["fresh-experiment", "diagnostic-rehearsal"].includes(options.runKind))
    fail(`unsupported run kind ${options.runKind}`);
  if (options.finalize && options.runKind !== "fresh-experiment")
    fail("--finalize requires fresh-experiment");
  return options;
}

function receiptFixture(projection, runKind = "fresh-experiment") {
  const hash = "a".repeat(64);
  const commit = "b".repeat(40);
  const emptyStatusDigest = projection.emptyStatusOutputSha256;
  const unavailable = Object.fromEntries(
    projection.measurementFields.map((field) => [
      field,
      { tag: "unavailable", reason: "test fixture" },
    ]),
  );
  const boundary =
    runKind === "diagnostic-rehearsal"
      ? {
          tag: "declared-pre-existing-implementation-boundary",
          knownPaths: ["engine/"],
        }
      : { tag: "none" };
  return {
    schema: projection.schema,
    version: projection.version,
    runKind,
    manifest: {
      catalogSha256: hash,
      sourceCommitSha: commit,
      targetProfileId: "fixture-profile",
      runKind,
    },
    scope: {
      kind: "single-unit",
      unitIds: ["fixture_unit"],
      fullCorpus: false,
    },
    targetOutcome: { tag: "completed" },
    targetStartCommit: commit,
    targetStartStatus: {
      command: "git status --porcelain=v2",
      clean: true,
      outputSha256: emptyStatusDigest,
      implementationBoundary: boundary,
    },
    targetFinishCommit: commit,
    targetFinishStatus: {
      command: "git status --porcelain=v2",
      clean: true,
      outputSha256: emptyStatusDigest,
      implementationBoundary: { tag: "none" },
    },
    ancestorProof: {
      verified: true,
      command:
        "git merge-base --is-ancestor targetStartCommit targetFinishCommit",
      outputSha256: emptyStatusDigest,
    },
    branchObservations: [
      {
        driverPath: "cleanroom-input/qnt/fixture/driver.mbt.qnt",
        branchAction: "fixtureBranch",
        qntFileSha256: hash,
        observedActionTaken: "fixtureBranch",
        replayLane: { tag: "native-qnt-mbt" },
        production: {
          entrypoint: { path: "src/engine/entrypoint.rs", sha256: hash },
          projection: { path: "src/engine/projection.rs", sha256: hash },
        },
        evidencePath: "target-artifacts/fixture.json",
        evidenceSha256: hash,
      },
    ],
    retainedArtifacts: [
      { path: "target-artifacts/fixture.json", sha256: hash },
      { path: "src/engine/entrypoint.rs", sha256: hash },
      { path: "src/engine/projection.rs", sha256: hash },
    ],
    timing: {
      startedAt: "2026-01-01T00:00:00.000Z",
      finishedAt: "2026-01-01T00:01:00.000Z",
    },
    measurementProvenance: unavailable,
    nextAction: "source-intake",
  };
}

function blockedReceiptFixture(projection, runKind = "fresh-experiment") {
  const receipt = receiptFixture(projection, runKind);
  const hash = "a".repeat(64);
  receipt.targetOutcome = {
    tag: "blocked",
    observations: [
      {
        tag: "missing-copied-input",
        subject: "cleanroom-input/qnt/fixture/missing.qnt",
        evidence: { path: "target-artifacts/blocker.json", sha256: hash },
      },
    ],
  };
  receipt.branchObservations = [];
  receipt.retainedArtifacts = [
    { path: "target-artifacts/blocker.json", sha256: hash },
  ];
  if (runKind === "diagnostic-rehearsal") {
    receipt.targetStartStatus = {
      ...receipt.targetStartStatus,
      clean: false,
      outputSha256: hash,
      statusEvidence: {
        path: "target-artifacts/start-status.txt",
        sha256: hash,
      },
    };
    receipt.retainedArtifacts.push({
      path: "target-artifacts/start-status.txt",
      sha256: hash,
    });
  }
  return receipt;
}

function schemaIssues(value, schema, root = schema, path = "receipt") {
  if (schema.$ref !== undefined) {
    const definition = schema.$ref.split("#/$defs/")[1];
    return schemaIssues(value, root.$defs[definition], root, path);
  }
  const issues = [];
  if (
    schema.const !== undefined &&
    stableJson(value) !== stableJson(schema.const)
  )
    issues.push(`${path}: const mismatch`);
  if (schema.enum !== undefined && !schema.enum.includes(value))
    issues.push(`${path}: enum mismatch`);
  if (schema.type === "object" && !isRecord(value))
    issues.push(`${path}: expected object`);
  if (schema.type === "array" && !Array.isArray(value))
    issues.push(`${path}: expected array`);
  if (schema.type === "string" && typeof value !== "string")
    issues.push(`${path}: expected string`);
  if (schema.type === "boolean" && typeof value !== "boolean")
    issues.push(`${path}: expected boolean`);
  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength)
      issues.push(`${path}: shorter than minLength`);
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value))
      issues.push(`${path}: pattern mismatch`);
    if (schema.format === "date-time" && Number.isNaN(Date.parse(value)))
      issues.push(`${path}: invalid date-time`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems)
      issues.push(`${path}: fewer than minItems`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems)
      issues.push(`${path}: more than maxItems`);
    if (schema.items !== undefined)
      value.forEach((entry, index) =>
        issues.push(
          ...schemaIssues(entry, schema.items, root, `${path}[${index}]`),
        ),
      );
  }
  if (
    isRecord(value) &&
    (schema.type === "object" ||
      schema.properties !== undefined ||
      schema.required !== undefined)
  ) {
    for (const required of schema.required ?? []) {
      if (!(required in value)) issues.push(`${path}.${required}: required`);
    }
    for (const [key, entry] of Object.entries(value)) {
      const property = schema.properties?.[key];
      if (property === undefined) {
        if (schema.additionalProperties === false)
          issues.push(`${path}.${key}: additional property`);
      } else {
        issues.push(...schemaIssues(entry, property, root, `${path}.${key}`));
      }
    }
  }
  for (const entry of schema.allOf ?? [])
    issues.push(...schemaIssues(value, entry, root, path));
  if (schema.if !== undefined) {
    if (schemaIssues(value, schema.if, root, path).length === 0)
      issues.push(...schemaIssues(value, schema.then ?? {}, root, path));
    else if (schema.else !== undefined)
      issues.push(...schemaIssues(value, schema.else, root, path));
  }
  if (schema.oneOf !== undefined) {
    const matches = schema.oneOf.filter(
      (entry) => schemaIssues(value, entry, root, path).length === 0,
    ).length;
    if (matches !== 1) issues.push(`${path}: oneOf mismatch`);
  }
  return issues;
}

function listBytes(directory) {
  const entries = [];
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) visit(full);
      else
        entries.push({
          path: path.relative(directory, full),
          content: fs.readFileSync(full),
        });
    }
  };
  visit(directory);
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

function assertDirectoriesIdentical(left, right) {
  if (!directoriesIdentical(left, right))
    fail("catalog file inventories or bytes differ");
}

function directoriesIdentical(left, right) {
  const leftEntries = listBytes(left);
  const rightEntries = listBytes(right);
  if (leftEntries.length !== rightEntries.length) return false;
  for (let index = 0; index < leftEntries.length; index += 1) {
    const a = leftEntries[index];
    const b = rightEntries[index];
    if (a.path !== b.path || !a.content.equals(b.content)) return false;
  }
  return true;
}

function runOrderedProtocolSelfTest() {
  const target = fs.mkdtempSync(
    path.join(os.tmpdir(), "cleanroom-target-protocol-self-test-"),
  );
  const targetGit = (...args) =>
    execFileSync("git", ["-C", target, ...args], { encoding: "utf8" }).trim();
  try {
    targetGit("init", "-q");
    targetGit("config", "user.email", "cleanroom-self-test@example.invalid");
    targetGit("config", "user.name", "Cleanroom Self Test");
    fs.writeFileSync(path.join(target, "BOOTSTRAP.md"), "declared inputs\n");
    targetGit("add", "BOOTSTRAP.md");
    targetGit("commit", "-q", "-m", "cleanroom bootstrap");
    const startCommit = targetGit("rev-parse", "HEAD");
    const startStatus = targetGit("status", "--porcelain=v2");
    if (startStatus !== "") fail("bootstrap start status was not clean");

    fs.mkdirSync(path.join(target, "src"));
    fs.writeFileSync(
      path.join(target, "src", "implementation.rs"),
      "fn main() {}\n",
    );
    fs.writeFileSync(path.join(target, "evidence.json"), "{}\n");
    targetGit("add", "src/implementation.rs", "evidence.json");
    targetGit("commit", "-q", "-m", "cleanroom implementation");
    const finishCommit = targetGit("rev-parse", "HEAD");
    const finishStatus = targetGit("status", "--porcelain=v2");
    if (finishStatus !== "") fail("finish status was not clean");
    targetGit("merge-base", "--is-ancestor", startCommit, finishCommit);
    if (startCommit === finishCommit)
      fail("ordered protocol did not create an implementation commit");
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

function runDirtyInputSelfTest() {
  const source = fs.mkdtempSync(
    path.join(os.tmpdir(), "cleanroom-dirty-input-self-test-"),
  );
  const sourceGit = (...args) =>
    execFileSync("git", ["-C", source, ...args], { encoding: "utf8" }).trim();
  try {
    sourceGit("init", "-q");
    sourceGit("config", "user.email", "cleanroom-self-test@example.invalid");
    sourceGit("config", "user.name", "Cleanroom Self Test");
    fs.writeFileSync(path.join(source, "allowlisted-input.txt"), "before\n");
    sourceGit("add", "allowlisted-input.txt");
    sourceGit("commit", "-q", "-m", "cleanroom source");
    fs.writeFileSync(path.join(source, "allowlisted-input.txt"), "after\n");
    let refused = false;
    try {
      execFileSync(
        process.execPath,
        [
          "-e",
          `const {requireCleanSourcePaths}=require(${JSON.stringify(
            path.join(root, "scripts/sync-cleanroom-input.cjs"),
          )}); requireCleanSourcePaths(${JSON.stringify(source)}, ["allowlisted-input.txt"]);`,
        ],
        { encoding: "utf8", stdio: "pipe" },
      );
    } catch (error) {
      refused = String(error.stderr ?? error.message).includes(
        "allowlisted sources",
      );
    }
    if (!refused) fail("dirty allowlisted input was accepted");
  } finally {
    fs.rmSync(source, { recursive: true, force: true });
  }
}

function runExportBoundarySelfTest() {
  const outputParent = fs.mkdtempSync(
    path.join(os.tmpdir(), "cleanroom-export-boundary-self-test-"),
  );
  try {
    const baseOptions = {
      scope: DEFAULT_SCOPE,
      profile: DEFAULT_PROFILE,
      runKind: "fresh-experiment",
      selfTest: false,
      finalize: false,
    };
    const notReadyOutput = path.join(outputParent, "not-ready");
    let notReadyRefused = false;
    try {
      exportExperiment(
        { ...baseOptions, output: notReadyOutput },
        {
          readiness: () => ({
            status: "source-blocked",
            issues: [{ code: "fixture-source-blocker" }],
          }),
        },
      );
    } catch (error) {
      notReadyRefused = String(error.message).includes("source readiness");
    }
    if (!notReadyRefused || fs.existsSync(notReadyOutput))
      fail("non-ready Task 2 result published an output");

    const invalidScopes = [
      { kind: "single-unit", unitIds: [], fullCorpus: false },
      {
        kind: "single-unit",
        unitIds: ["ice_knife", "other"],
        fullCorpus: false,
      },
      { kind: "single-unit", unitIds: ["ice_knife"], fullCorpus: true },
    ];
    for (const [index, selectedScope] of invalidScopes.entries()) {
      const relativePath = `.cleanroom-invalid-scope-${process.pid}-${index}.json`;
      const absolutePath = repoPath(relativePath);
      const output = path.join(outputParent, `invalid-${index}`);
      fs.writeFileSync(
        absolutePath,
        JSON.stringify({ schema: "fixture", scope: selectedScope }),
      );
      try {
        let invalidScopeRefused = false;
        try {
          exportExperiment({ ...baseOptions, scope: relativePath, output });
        } catch (error) {
          invalidScopeRefused = String(error.message).includes(
            "single-unit selection",
          );
        }
        if (!invalidScopeRefused || fs.existsSync(output))
          fail(`invalid scope ${index} was accepted or published output`);
      } finally {
        fs.rmSync(absolutePath, { force: true });
      }
    }
  } finally {
    fs.rmSync(outputParent, { recursive: true, force: true });
  }
}

function runExperimentSelfTest() {
  const projection = buildReceiptContractProjection(repoPath(CONTRACT_PATH));
  if (
    projection.schema !== "cleanroom-target-receipt.v1" ||
    !projection.requiredFields.includes("branchObservations")
  ) {
    fail("receipt projection is incomplete");
  }
  runOrderedProtocolSelfTest();
  runDirtyInputSelfTest();
  runExportBoundarySelfTest();
  for (const unsafePath of [
    root,
    path.dirname(root),
    path.join(root, "unsafe"),
  ]) {
    let rejected = false;
    try {
      validateOutputPath(unsafePath);
    } catch (error) {
      rejected = String(error.message).includes("output");
    }
    if (!rejected) fail(`unsafe output path was accepted: ${unsafePath}`);
  }
  const unrelated = fs.mkdtempSync(
    path.join(os.tmpdir(), "cleanroom-export-unrelated-"),
  );
  try {
    try {
      validateOutputPath(unrelated);
      fail("existing unrelated output directory was accepted");
    } catch (error) {
      if (!String(error.message).includes("exporter-owned")) throw error;
    }
  } finally {
    fs.rmSync(unrelated, { recursive: true, force: true });
  }
  const scope = readJson(DEFAULT_SCOPE);
  const index = readJson(scope.artifacts.indexPath);
  const unit = findSelectedUnit(index, scope.scope.unitIds[0]);
  const qnt = selectedQntPaths(unit);
  if (
    qnt.length !== unit.qnt.files.length ||
    qnt.some((entry) => entry.endsWith(".ts"))
  )
    fail("selected closure is not the expected QNT-only closure");
  const outputParent = fs.mkdtempSync(
    path.join(os.tmpdir(), "cleanroom-export-self-test-"),
  );
  const left = path.join(outputParent, "left");
  const right = path.join(outputParent, "right");
  try {
    const options = {
      scope: DEFAULT_SCOPE,
      profile: DEFAULT_PROFILE,
      runKind: "fresh-experiment",
      selfTest: false,
      finalize: false,
    };
    exportExperiment({ ...options, output: left });
    exportExperiment({ ...options, output: right });
    assertDirectoriesIdentical(left, right);
    exportExperiment({ ...options, output: left });
    const occupiedSnapshot = path.join(outputParent, "occupied-snapshot");
    fs.cpSync(left, occupiedSnapshot, { recursive: true });
    let differingDestinationRefused = false;
    try {
      exportExperiment({
        ...options,
        runKind: "diagnostic-rehearsal",
        output: left,
      });
    } catch (error) {
      differingDestinationRefused = String(error.message).includes(
        "different bytes",
      );
    }
    if (!differingDestinationRefused)
      fail("differing catalog overwrote an existing destination");
    assertDirectoriesIdentical(left, occupiedSnapshot);
    const failedOutput = path.join(outputParent, "failed-publication");
    let finalVerificationRefused = false;
    try {
      publishOutput(
        failedOutput,
        {
          schema: "fixture",
          inputHashes: [],
          selectedBranches: [],
          scope: { unitIds: ["fixture"] },
          catalogSha256: "a".repeat(64),
        },
        "fault-injected publication",
        [],
        () => {
          throw new Error("fault-injected final verification failure");
        },
      );
    } catch (error) {
      finalVerificationRefused = String(error.message).includes(
        "fault-injected final verification failure",
      );
    }
    if (!finalVerificationRefused || fs.existsSync(failedOutput))
      fail("failed final verification left a published catalog");
    const generated = listBytes(left);
    const guidance = generated.find(
      (entry) => entry.path === "cleanroom-input/guidance/reducer-spine.md",
    );
    if (guidance === undefined)
      fail("target-facing architecture guidance was not exported");
    const guidanceText = guidance.content.toString("utf8");
    const generatedPaths = new Set(generated.map((entry) => entry.path));
    for (const match of guidanceText.matchAll(/`(cleanroom-input\/[^`]+)`/g)) {
      if (!generatedPaths.has(match[1]))
        fail(`exported guidance references absent input: ${match[1]}`);
    }
    if (
      !guidanceText.includes("## Target Surface") ||
      !guidanceText.includes("## Cleanroom Boundary And Identity Dispatch")
    )
      fail("target-facing architecture projection is incomplete");
    if (
      /queue|Task 8|dirty-cleanroom|task3Residual|RALPH_|\.ralph|plans\//i.test(
        guidanceText,
      )
    )
      fail("target-facing architecture projection contains workflow authority");
    const generatedProjection = JSON.parse(
      fs.readFileSync(path.join(left, RECEIPT_PROJECTION_DEST), "utf8"),
    );
    if (stableJson(generatedProjection) !== stableJson(projection))
      fail("generated receipt projection drifted from the canonical contract");
    const exportedFreshReceipt = receiptFixture(generatedProjection);
    if (
      schemaIssues(exportedFreshReceipt, generatedProjection.jsonSchema)
        .length !== 0
    )
      fail("exported schema rejected a complete fresh envelope");
    if (
      validateTargetReceipt(exportedFreshReceipt, generatedProjection)
        .length !== 0
    )
      fail("exported receipt contract could not construct a fresh envelope");
    const exportedDiagnosticReceipt = receiptFixture(
      generatedProjection,
      "diagnostic-rehearsal",
    );
    if (
      schemaIssues(exportedDiagnosticReceipt, generatedProjection.jsonSchema)
        .length !== 0
    )
      fail("exported schema rejected a clean diagnostic baseline");
    if (
      validateTargetReceipt(exportedDiagnosticReceipt, generatedProjection)
        .length !== 0
    )
      fail(
        "exported receipt contract could not construct a diagnostic envelope",
      );
    const contradictoryDiagnosticReceipt = receiptFixture(
      generatedProjection,
      "diagnostic-rehearsal",
    );
    contradictoryDiagnosticReceipt.targetStartStatus.outputSha256 = "a".repeat(
      64,
    );
    if (
      schemaIssues(
        contradictoryDiagnosticReceipt,
        generatedProjection.jsonSchema,
      ).length === 0 ||
      validateTargetReceipt(contradictoryDiagnosticReceipt, generatedProjection)
        .length === 0
    )
      fail("contradictory diagnostic clean status was accepted");
    const cleanWithDirtyEvidence = receiptFixture(
      generatedProjection,
      "diagnostic-rehearsal",
    );
    cleanWithDirtyEvidence.targetStartStatus.statusEvidence = {
      path: "target-artifacts/start-status.txt",
      sha256: "a".repeat(64),
    };
    if (
      schemaIssues(cleanWithDirtyEvidence, generatedProjection.jsonSchema)
        .length === 0 ||
      validateTargetReceipt(cleanWithDirtyEvidence, generatedProjection)
        .length === 0
    )
      fail("clean diagnostic status with dirty evidence was accepted");
    const contradictoryDiagnosticBaseline = receiptFixture(
      generatedProjection,
      "diagnostic-rehearsal",
    );
    contradictoryDiagnosticBaseline.targetStartStatus.implementationBoundary.baselineCommit =
      "c".repeat(40);
    if (
      schemaIssues(
        contradictoryDiagnosticBaseline,
        generatedProjection.jsonSchema,
      ).length === 0 ||
      validateTargetReceipt(
        contradictoryDiagnosticBaseline,
        generatedProjection,
      ).length === 0
    )
      fail("redundant diagnostic baseline commit was accepted");
    const exportedBlockedReceipt = blockedReceiptFixture(generatedProjection);
    if (
      schemaIssues(exportedBlockedReceipt, generatedProjection.jsonSchema)
        .length !== 0
    )
      fail("exported schema rejected a structured blocked envelope");
    if (
      validateTargetReceipt(exportedBlockedReceipt, generatedProjection)
        .length !== 0
    )
      fail("receipt validator rejected a structured blocked envelope");
    const blockedDiagnosticReceipt = blockedReceiptFixture(
      generatedProjection,
      "diagnostic-rehearsal",
    );
    if (
      schemaIssues(blockedDiagnosticReceipt, generatedProjection.jsonSchema)
        .length !== 0 ||
      validateTargetReceipt(blockedDiagnosticReceipt, generatedProjection)
        .length !== 0
    )
      fail("receipt validator rejected a blocked diagnostic envelope");
    const missingDiagnosticStatusEvidence = blockedReceiptFixture(
      generatedProjection,
      "diagnostic-rehearsal",
    );
    missingDiagnosticStatusEvidence.retainedArtifacts =
      missingDiagnosticStatusEvidence.retainedArtifacts.filter(
        (artifact) => artifact.path !== "target-artifacts/start-status.txt",
      );
    if (
      validateTargetReceipt(
        missingDiagnosticStatusEvidence,
        generatedProjection,
      ).length === 0
    )
      fail("blocked diagnostic status evidence was not retained");
    const invalid = receiptFixture(generatedProjection);
    delete invalid.branchObservations[0].branchAction;
    if (validateTargetReceipt(invalid, generatedProjection).length === 0)
      fail("receipt validator accepted an incomplete envelope");
    const wrongVersion = receiptFixture(generatedProjection);
    wrongVersion.version += 1;
    if (validateTargetReceipt(wrongVersion, generatedProjection).length === 0)
      fail("receipt validator accepted an incompatible version");
    const wrongCleanDigest = receiptFixture(generatedProjection);
    wrongCleanDigest.targetFinishStatus.outputSha256 = "c".repeat(64);
    if (
      schemaIssues(wrongCleanDigest, generatedProjection.jsonSchema).length ===
      0
    )
      fail("exported schema accepted a clean status with non-empty digest");
    if (
      validateTargetReceipt(wrongCleanDigest, generatedProjection).length === 0
    )
      fail("receipt validator accepted a clean status with non-empty digest");
    const invalidFinish = receiptFixture(generatedProjection);
    invalidFinish.targetFinishStatus = {
      ...invalidFinish.targetFinishStatus,
      clean: false,
      outputSha256: "c".repeat(64),
      implementationBoundary: {
        tag: "declared-pre-existing-implementation-boundary",
        knownPaths: ["engine/"],
      },
    };
    if (
      schemaIssues(invalidFinish, generatedProjection.jsonSchema).length === 0
    )
      fail("exported schema accepted an invalid finish status");
    if (validateTargetReceipt(invalidFinish, generatedProjection).length === 0)
      fail("receipt validator accepted an invalid finish status");
    const missingBoundary = receiptFixture(
      generatedProjection,
      "diagnostic-rehearsal",
    );
    delete missingBoundary.targetStartStatus.implementationBoundary;
    if (
      validateTargetReceipt(missingBoundary, generatedProjection).length === 0
    )
      fail("receipt validator accepted a diagnostic envelope without boundary");
    const unboundProduction = receiptFixture(generatedProjection);
    unboundProduction.branchObservations[0].production.entrypoint = {
      path: "src/engine/other.rs",
      sha256: "c".repeat(64),
    };
    if (
      validateTargetReceipt(unboundProduction, generatedProjection).length === 0
    )
      fail("receipt validator accepted unbound production evidence");
    const forbiddenPaths = generated.filter((entry) =>
      /(^|\/)(plans|\.ralph|surface|typescript)(\/|$)|\.(ts|tsx)$/.test(
        entry.path,
      ),
    );
    if (forbiddenPaths.length > 0)
      fail(
        `catalog contains forbidden paths: ${forbiddenPaths
          .map((entry) => entry.path)
          .join(", ")}`,
      );
    if (
      generated.some(
        (entry) =>
          entry.content.includes(Buffer.from(left)) ||
          entry.content.includes(Buffer.from(right)),
      )
    )
      fail("catalog contains an output path");
    if (
      generated.some((entry) =>
        /20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d/.test(entry.content.toString("utf8")),
      )
    )
      fail("catalog contains a timestamp");
  } finally {
    fs.rmSync(outputParent, { recursive: true, force: true });
  }
  process.stdout.write(
    "cleanroom experiment export self-test OK (real deterministic export and receipt fixtures).\n",
  );
}

module.exports = {
  buildReceiptContractProjection,
  exportExperiment,
  parseArgs,
  runExperimentSelfTest,
  selectedQntPaths,
};
