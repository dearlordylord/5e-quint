#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const {
  coveragePaths,
  coveredStatuses,
  generatorReadinessStatuses,
  markerKinds,
  nonSemanticStatuses,
  obligationKinds,
  obligationStatuses,
  parityWitnessKinds,
  runtimes,
} = require("./rules-kernel-coverage-config.cjs");
const { scanClaimFiles } = require("./rules-kernel-coverage-claim-scan.cjs");

const root = process.env.RULES_KERNEL_COVERAGE_ROOT ?? process.cwd();
const write = process.argv.includes("--write");
const selfTest = process.argv.includes("--self-test");

function isRecord(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function repoPath(rootPath, filePath) {
  return path.relative(rootPath, filePath).split(path.sep).join("/");
}

function readJsonl(rootPath, filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(
          `${repoPath(rootPath, filePath)}:${index + 1} is not valid JSON: ${error.message}`,
        );
      }
    });
}

function readTextIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

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

function compareOrWrite(rootPath, writeOutput, filePath, text) {
  if (writeOutput) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, text);
    return [];
  }
  if (!fs.existsSync(filePath)) {
    return [
      `${repoPath(rootPath, filePath)} is missing. Run rules-kernel-coverage:check -- --write.`,
    ];
  }
  const actual = fs.readFileSync(filePath, "utf8");
  if (actual !== text) {
    return [
      `${repoPath(rootPath, filePath)} is stale. Run rules-kernel-coverage:check -- --write.`,
    ];
  }
  return [];
}

function markerKey(markerKind, obligationId, ownerPath) {
  return `${markerKind}\u0000${obligationId}\u0000${ownerPath}`;
}

function buildMarkerIndex(markers) {
  return new Set(
    markers.flatMap((marker) =>
      marker.obligationIds.map((obligationId) =>
        markerKey(marker.markerKind, obligationId, marker.ownerPath),
      ),
    ),
  );
}

function hasMarker(markerIndex, markerKind, obligationId, ownerPath) {
  return markerIndex.has(markerKey(markerKind, obligationId, ownerPath));
}

function validateStringArray(value, context) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return [`${context} must be an array.`];
  return value.flatMap((entry, index) =>
    typeof entry === "string" && entry.length > 0
      ? []
      : [`${context}[${index}] must be a non-empty string.`],
  );
}

function validateRequiredStringArray(value, context) {
  if (value === undefined) return [`${context} must be an array.`];
  return validateStringArray(value, context);
}

function validateWitness(witness, context) {
  const issues = [];
  if (!isRecord(witness)) return [`${context} must be an object.`];
  if (!parityWitnessKinds.has(witness.kind)) {
    issues.push(`${context}.kind has unknown value ${witness.kind}.`);
  }
  if (typeof witness.ownerPath !== "string" || witness.ownerPath.length === 0) {
    issues.push(`${context}.ownerPath must be a non-empty string.`);
  }
  if (
    witness.qntSpecPath !== undefined &&
    (typeof witness.qntSpecPath !== "string" ||
      witness.qntSpecPath.length === 0)
  ) {
    issues.push(
      `${context}.qntSpecPath must be a non-empty string when present.`,
    );
  }
  if (
    witness.stepAction !== undefined &&
    (typeof witness.stepAction !== "string" || witness.stepAction.length === 0)
  ) {
    issues.push(
      `${context}.stepAction must be a non-empty string when present.`,
    );
  }
  return issues;
}

function validateObligationShape(obligation) {
  const issues = [];
  if (!isRecord(obligation)) return ["Obligation row must be an object."];
  for (const field of ["id", "title", "runtime", "kind", "status"]) {
    if (
      typeof obligation[field] !== "string" ||
      obligation[field].length === 0
    ) {
      issues.push(
        `${obligation.id ?? "<unknown>"}.${field} must be a non-empty string.`,
      );
    }
  }
  if (
    typeof obligation.id === "string" &&
    !/^[A-Z][A-Z0-9]*(?:\.[A-Z0-9_]+)+$/.test(obligation.id)
  ) {
    issues.push(
      `${obligation.id} must be a stable uppercase dotted obligation id.`,
    );
  }
  if (!runtimes.has(obligation.runtime)) {
    issues.push(`${obligation.id} has unknown runtime ${obligation.runtime}.`);
  }
  if (!obligationKinds.has(obligation.kind)) {
    issues.push(`${obligation.id} has unknown kind ${obligation.kind}.`);
  }
  if (!obligationStatuses.has(obligation.status)) {
    issues.push(`${obligation.id} has unknown status ${obligation.status}.`);
  }
  for (const field of [
    "profiles",
    "surfaceEvidence",
    "qntOwners",
    "runtimeOwners",
  ]) {
    issues.push(
      ...validateStringArray(obligation[field], `${obligation.id}.${field}`),
    );
  }
  if (obligation.parityWitnesses !== undefined) {
    if (!Array.isArray(obligation.parityWitnesses)) {
      issues.push(`${obligation.id}.parityWitnesses must be an array.`);
    } else {
      for (const [index, witness] of obligation.parityWitnesses.entries()) {
        issues.push(
          ...validateWitness(
            witness,
            `${obligation.id}.parityWitnesses[${index}]`,
          ),
        );
      }
    }
  }
  if (
    nonSemanticStatuses.has(obligation.status) &&
    (typeof obligation.reason !== "string" || obligation.reason.length === 0)
  ) {
    issues.push(
      `${obligation.id} with status ${obligation.status} must declare reason.`,
    );
  }
  return issues;
}

function validateProfileMapping(mapping, index, obligationIds, profileIds) {
  const issues = [];
  const context = `profile-obligations row ${index + 1}`;
  if (!isRecord(mapping)) return [`${context} must be an object.`];
  if (typeof mapping.profileId !== "string" || mapping.profileId.length === 0) {
    issues.push(`${context}.profileId must be a non-empty string.`);
  } else if (!profileIds.has(mapping.profileId)) {
    issues.push(`${context} references unknown profile ${mapping.profileId}.`);
  }
  if (
    !Array.isArray(mapping.obligationIds) ||
    mapping.obligationIds.length === 0
  ) {
    issues.push(`${context}.obligationIds must be a non-empty array.`);
  } else {
    for (const obligationId of mapping.obligationIds) {
      if (!obligationIds.has(obligationId)) {
        issues.push(
          `${context} references unknown obligation ${obligationId}.`,
        );
      }
    }
  }
  return issues;
}

function validateGeneratorReadiness(
  readiness,
  index,
  rootPath,
  obligationsById,
) {
  const issues = [];
  const context = `generator-readiness row ${index + 1}`;
  if (!isRecord(readiness)) return [`${context} must be an object.`];
  const obligation =
    typeof readiness.obligationId === "string"
      ? obligationsById.get(readiness.obligationId)
      : undefined;
  if (
    typeof readiness.obligationId !== "string" ||
    readiness.obligationId.length === 0
  ) {
    issues.push(`${context}.obligationId must be a non-empty string.`);
  } else if (obligation === undefined) {
    issues.push(
      `${context} references unknown obligation ${readiness.obligationId}.`,
    );
  }
  if (!generatorReadinessStatuses.has(readiness.status)) {
    issues.push(`${context}.status has unknown value ${readiness.status}.`);
  }
  for (const field of [
    "semanticCore",
    "proofOnly",
    "generatorSubset",
    "blockedBy",
  ]) {
    issues.push(
      ...validateRequiredStringArray(readiness[field], `${context}.${field}`),
    );
  }
  const semanticCore = readiness.semanticCore ?? [];
  const generatorSubset = readiness.generatorSubset ?? [];
  const blockedBy = readiness.blockedBy ?? [];
  if (
    (readiness.status === "semantic-core-candidate" ||
      readiness.status === "fixture-bound" ||
      readiness.status === "generation-subset-clean") &&
    semanticCore.length === 0
  ) {
    issues.push(`${context}.${readiness.status} requires semanticCore.`);
  }
  if (
    (readiness.status === "semantic-core-candidate" ||
      readiness.status === "generation-subset-clean") &&
    generatorSubset.length === 0
  ) {
    issues.push(`${context}.${readiness.status} requires generatorSubset.`);
  }
  if (
    (readiness.status === "fixture-bound" || readiness.status === "blocked") &&
    blockedBy.length === 0
  ) {
    issues.push(`${context}.${readiness.status} requires blockedBy.`);
  }
  if (readiness.status === "generation-subset-clean" && blockedBy.length > 0) {
    issues.push(`${context}.generation-subset-clean must not have blockedBy.`);
  }
  for (const field of ["semanticCore", "proofOnly"]) {
    for (const ownerPath of readiness[field] ?? []) {
      if (!fs.existsSync(path.join(rootPath, ownerPath))) {
        issues.push(`${context}.${field} path ${ownerPath} does not exist.`);
      }
    }
  }
  if (obligation !== undefined) {
    const qntOwners = new Set(obligation.qntOwners ?? []);
    for (const ownerPath of readiness.semanticCore ?? []) {
      if (!qntOwners.has(ownerPath)) {
        issues.push(
          `${context}.semanticCore path ${ownerPath} is not declared as a QNT owner by ${obligation.id}.`,
        );
      }
    }
  }
  if (readiness.dryRun !== undefined) {
    if (typeof readiness.dryRun !== "string" || readiness.dryRun.length === 0) {
      issues.push(`${context}.dryRun must be a non-empty string when present.`);
    } else if (!fs.existsSync(path.join(rootPath, readiness.dryRun))) {
      issues.push(`${context}.dryRun path ${readiness.dryRun} does not exist.`);
    }
  }
  return issues;
}

function validateCoveredEvidence(rootPath, obligation, markerIndex) {
  const issues = [];
  const qntOwners = obligation.qntOwners ?? [];
  const runtimeOwners = obligation.runtimeOwners ?? [];
  const parityWitnesses = obligation.parityWitnesses ?? [];
  if (qntOwners.length === 0)
    issues.push(`${obligation.id} is covered but has no qntOwners.`);
  if (runtimeOwners.length === 0)
    issues.push(`${obligation.id} is covered but has no runtimeOwners.`);
  if (parityWitnesses.length === 0) {
    issues.push(`${obligation.id} is covered but has no parityWitnesses.`);
  }

  for (const ownerPath of qntOwners) {
    const absolutePath = path.join(rootPath, ownerPath);
    if (!fs.existsSync(absolutePath)) {
      issues.push(`${obligation.id} QNT owner ${ownerPath} does not exist.`);
      continue;
    }
    if (!hasMarker(markerIndex, "qnt-owner", obligation.id, ownerPath)) {
      issues.push(
        `${obligation.id} QNT owner ${ownerPath} lacks KERNEL-COVERAGE qnt-owner marker.`,
      );
    }
  }

  for (const ownerPath of runtimeOwners) {
    const absolutePath = path.join(rootPath, ownerPath);
    if (!fs.existsSync(absolutePath)) {
      issues.push(
        `${obligation.id} runtime owner ${ownerPath} does not exist.`,
      );
      continue;
    }
    if (!hasMarker(markerIndex, "runtime-owner", obligation.id, ownerPath)) {
      issues.push(
        `${obligation.id} runtime owner ${ownerPath} lacks KERNEL-COVERAGE runtime-owner marker.`,
      );
    }
  }

  for (const witness of parityWitnesses) {
    const absolutePath = path.join(rootPath, witness.ownerPath);
    if (!fs.existsSync(absolutePath)) {
      issues.push(
        `${obligation.id} parity witness ${witness.ownerPath} does not exist.`,
      );
      continue;
    }
    if (
      !hasMarker(
        markerIndex,
        "parity-witness",
        obligation.id,
        witness.ownerPath,
      )
    ) {
      issues.push(
        `${obligation.id} parity witness ${witness.ownerPath} lacks KERNEL-COVERAGE parity-witness marker.`,
      );
    }
    const witnessText = readTextIfExists(absolutePath);
    if (
      witness.kind === "focused-mbt" ||
      witness.kind === "deterministic-qnt-replay"
    ) {
      if (!/\brun\s*\(/.test(witnessText)) {
        issues.push(
          `${obligation.id} parity witness ${witness.ownerPath} does not call quint-connect run().`,
        );
      }
      if (!/\bstateCheck\s*\(/.test(witnessText)) {
        issues.push(
          `${obligation.id} parity witness ${witness.ownerPath} does not define a stateCheck().`,
        );
      }
    }
    if (witness.qntSpecPath !== undefined) {
      const qntPath = path.join(rootPath, witness.qntSpecPath);
      if (!fs.existsSync(qntPath)) {
        issues.push(
          `${obligation.id} parity QNT spec ${witness.qntSpecPath} does not exist.`,
        );
      } else if (witness.stepAction !== undefined) {
        const qntText = fs.readFileSync(qntPath, "utf8");
        const stepPattern = new RegExp(
          `\\baction\\s+${escapeRegExp(witness.stepAction)}\\b`,
        );
        if (!stepPattern.test(qntText)) {
          issues.push(
            `${obligation.id} parity QNT spec ${witness.qntSpecPath} has no action ${witness.stepAction}.`,
          );
        }
      }
      const specBasename = path.basename(witness.qntSpecPath);
      if (!witnessText.includes(specBasename)) {
        issues.push(
          `${obligation.id} parity witness ${witness.ownerPath} does not reference ${specBasename}.`,
        );
      }
    }
  }

  return issues;
}

function escapeRegExp(value) {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

function buildSummary(obligations) {
  const byStatus = Object.fromEntries(
    [...obligationStatuses].map((status) => [status, 0]),
  );
  const byRuntime = Object.fromEntries(
    [...runtimes].map((runtime) => [runtime, 0]),
  );
  for (const obligation of obligations) {
    byStatus[obligation.status] = (byStatus[obligation.status] ?? 0) + 1;
    byRuntime[obligation.runtime] = (byRuntime[obligation.runtime] ?? 0) + 1;
  }
  return {
    total: obligations.length,
    covered: obligations.filter((obligation) =>
      coveredStatuses.has(obligation.status),
    ).length,
    open: obligations.filter(
      (obligation) =>
        !coveredStatuses.has(obligation.status) &&
        !nonSemanticStatuses.has(obligation.status),
    ).length,
    nonSemantic: obligations.filter((obligation) =>
      nonSemanticStatuses.has(obligation.status),
    ).length,
    byRuntime,
    byStatus,
  };
}

function buildMatrix(rootPath) {
  const paths = coveragePaths(rootPath);
  const obligations = readJsonl(rootPath, paths.obligations);
  const profileObligations = readJsonl(rootPath, paths.profileObligations);
  const generatorReadiness = readJsonl(rootPath, paths.generatorReadiness);
  const profiles = readJsonl(rootPath, paths.unitProfiles);
  return {
    summary: buildSummary(obligations),
    obligations: obligations.map((obligation) => stable(obligation)),
    profileObligations: profileObligations.map((mapping) => stable(mapping)),
    generatorReadiness: generatorReadiness.map((readiness) =>
      stable(readiness),
    ),
    profileIdsSeenFromUnitProfileCoverage: profiles
      .map((profile) => profile.id)
      .sort(),
  };
}

function renderReport(matrix, issues) {
  const lines = [];
  lines.push("# Rules Kernel Coverage Report");
  lines.push("");
  lines.push(
    "Generated from `plans/rules-kernel-coverage/obligations.jsonl`, `profile-obligations.jsonl`, `generator-readiness.jsonl`, and `KERNEL-COVERAGE` source markers.",
  );
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Total obligations: ${matrix.summary.total}`);
  lines.push(`- Covered obligations: ${matrix.summary.covered}`);
  lines.push(`- Open transitional obligations: ${matrix.summary.open}`);
  lines.push(
    `- Boundary or unsupported obligations: ${matrix.summary.nonSemantic}`,
  );
  lines.push("");
  lines.push("| Status | Count |");
  lines.push("| --- | ---: |");
  for (const [status, count] of Object.entries(matrix.summary.byStatus)) {
    lines.push(`| ${status} | ${count} |`);
  }
  lines.push("");
  lines.push("| Runtime | Count |");
  lines.push("| --- | ---: |");
  for (const [runtime, count] of Object.entries(matrix.summary.byRuntime)) {
    lines.push(`| ${runtime} | ${count} |`);
  }
  lines.push("");
  lines.push("## Obligations");
  lines.push("");
  lines.push("| Obligation | Runtime | Status | Profiles |");
  lines.push("| --- | --- | --- | --- |");
  for (const obligation of matrix.obligations) {
    lines.push(
      `| \`${obligation.id}\` | ${obligation.runtime} | ${obligation.status} | ${(obligation.profiles ?? []).map((profile) => `\`${profile}\``).join(", ")} |`,
    );
  }
  lines.push("");
  lines.push("## Generator Readiness");
  lines.push("");
  if (matrix.generatorReadiness.length === 0) {
    lines.push("No generator-readiness rows recorded yet.");
  } else {
    lines.push("| Obligation | Status | Subset |");
    lines.push("| --- | --- | --- |");
    for (const readiness of matrix.generatorReadiness) {
      lines.push(
        `| \`${readiness.obligationId}\` | ${readiness.status} | ${(readiness.generatorSubset ?? []).map((entry) => `\`${entry}\``).join(", ")} |`,
      );
    }
  }
  lines.push("");
  lines.push("## Open Work");
  lines.push("");
  const open = matrix.obligations.filter(
    (obligation) =>
      !coveredStatuses.has(obligation.status) &&
      !nonSemanticStatuses.has(obligation.status),
  );
  if (open.length === 0) {
    lines.push("No open transitional obligations.");
  } else {
    for (const obligation of open) {
      lines.push(
        `- \`${obligation.id}\` (${obligation.status}): ${obligation.title}`,
      );
    }
  }
  lines.push("");
  lines.push("## Checker Issues");
  lines.push("");
  if (issues.length === 0) {
    lines.push("No checker issues.");
  } else {
    for (const issue of issues) lines.push(`- ${issue}`);
  }
  return `${lines.join("\n")}\n`;
}

function buildKernelCoverage({ root: rootPath }) {
  const paths = coveragePaths(rootPath);
  const obligations = readJsonl(rootPath, paths.obligations);
  const profileObligations = readJsonl(rootPath, paths.profileObligations);
  const generatorReadiness = readJsonl(rootPath, paths.generatorReadiness);
  const profiles = readJsonl(rootPath, paths.unitProfiles);
  const scanned = scanClaimFiles(rootPath);
  const markerIndex = buildMarkerIndex(scanned.markers);
  const issues = [];
  const obligationIds = new Set();
  const obligationsById = new Map();
  const profileIds = new Set(profiles.map((profile) => profile.id));

  for (const [index, obligation] of obligations.entries()) {
    issues.push(
      ...validateObligationShape(obligation).map(
        (issue) => `obligations.jsonl:${index + 1}: ${issue}`,
      ),
    );
    if (obligationIds.has(obligation.id)) {
      issues.push(
        `obligations.jsonl:${index + 1}: duplicate obligation id ${obligation.id}.`,
      );
    }
    obligationIds.add(obligation.id);
    obligationsById.set(obligation.id, obligation);
  }

  for (const marker of scanned.markers) {
    if (!markerKinds.has(marker.markerKind)) {
      issues.push(
        `${marker.ownerPath}:${marker.line}: unknown KERNEL-COVERAGE marker kind ${marker.markerKind}.`,
      );
    }
    for (const obligationId of marker.obligationIds) {
      if (!obligationIds.has(obligationId)) {
        issues.push(
          `${marker.ownerPath}:${marker.line}: marker references unknown obligation ${obligationId}.`,
        );
      }
    }
  }

  for (const [index, mapping] of profileObligations.entries()) {
    issues.push(
      ...validateProfileMapping(mapping, index, obligationIds, profileIds),
    );
  }

  const readinessObligationIds = new Set();
  for (const [index, readiness] of generatorReadiness.entries()) {
    if (isRecord(readiness) && typeof readiness.obligationId === "string") {
      if (readinessObligationIds.has(readiness.obligationId)) {
        issues.push(
          `generator-readiness row ${index + 1}: duplicate readiness row for ${readiness.obligationId}.`,
        );
      }
      readinessObligationIds.add(readiness.obligationId);
    }
    issues.push(
      ...validateGeneratorReadiness(
        readiness,
        index,
        rootPath,
        obligationsById,
      ),
    );
  }

  for (const obligation of obligations) {
    for (const profileId of obligation.profiles ?? []) {
      if (!profileIds.has(profileId)) {
        issues.push(
          `${obligation.id} references unknown unit profile ${profileId}.`,
        );
      }
    }
    if (coveredStatuses.has(obligation.status)) {
      issues.push(
        ...validateCoveredEvidence(rootPath, obligation, markerIndex),
      );
    }
  }

  const matrix = buildMatrix(rootPath);
  return {
    issues,
    matrix,
    report: renderReport(matrix, issues),
  };
}

function main() {
  const { runSelfTest } = require("./rules-kernel-coverage-self-test.cjs");
  if (selfTest) {
    runSelfTest();
    console.log("Rules kernel coverage self-test OK.");
    return;
  }

  const paths = coveragePaths(root);
  const result = buildKernelCoverage({ root });
  const outputIssues = [
    ...result.issues,
    ...compareOrWrite(
      root,
      write,
      paths.matrix,
      `${JSON.stringify(result.matrix, null, 2)}\n`,
    ),
    ...compareOrWrite(root, write, paths.report, result.report),
  ];
  if (outputIssues.length > 0) {
    for (const issue of outputIssues) {
      console.error(`rules-kernel-coverage: ${issue}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log(
    `Rules kernel coverage OK: ${result.matrix.summary.total} obligations.`,
  );
}

module.exports = {
  buildKernelCoverage,
  renderReport,
};

if (require.main === module) main();
