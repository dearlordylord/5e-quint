#!/usr/bin/env node
"use strict";

const fs = require("node:fs");

const RECEIPT_SCHEMA = "cleanroom-target-receipt.v1";
const EMPTY_STATUS_OUTPUT_SHA256 =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

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

function stableStringify(value) {
  return `${JSON.stringify(stable(value), null, 2)}\n`;
}

function sha256Pattern(value) {
  return typeof value === "string" && /^[0-9a-f]{64}$/i.test(value);
}

function commitPattern(value) {
  return typeof value === "string" && /^[0-9a-f]{40}$/i.test(value);
}

function addIssue(issues, path, message) {
  issues.push({ path, message });
}

function requireString(value, path, issues) {
  if (typeof value !== "string" || value.trim() === "") {
    addIssue(issues, path, "must be a non-empty string");
  }
}

function requireSha256(value, path, issues) {
  if (!sha256Pattern(value)) addIssue(issues, path, "must be a sha256 digest");
}

function requireCommit(value, path, issues) {
  if (!commitPattern(value)) addIssue(issues, path, "must be a git commit sha");
}

function requireStringArray(value, path, issues) {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((entry) => typeof entry !== "string" || entry.trim() === "")
  ) {
    addIssue(issues, path, "must be a non-empty string array");
  }
}

function validateContractProjection(contract, issues) {
  if (!isRecord(contract.jsonSchema)) {
    addIssue(
      issues,
      "contract.jsonSchema",
      "must export the complete receipt schema",
    );
    return;
  }
  if (contract.jsonSchema.type !== "object") {
    addIssue(issues, "contract.jsonSchema.type", "must be object");
  }
  if (!isRecord(contract.jsonSchema.properties)) {
    addIssue(
      issues,
      "contract.jsonSchema.properties",
      "must describe every top-level receipt field",
    );
  }
  if (!isRecord(contract.jsonSchema.$defs)) {
    addIssue(
      issues,
      "contract.jsonSchema.$defs",
      "must describe every nested receipt shape",
    );
  }
  if (!sha256Pattern(contract.emptyStatusOutputSha256)) {
    addIssue(
      issues,
      "contract.emptyStatusOutputSha256",
      "must be a sha256 digest",
    );
  }
}

function validateRetainedReference(value, path, issues) {
  if (!isRecord(value)) {
    addIssue(issues, path, "must contain a retained path and sha256");
    return;
  }
  requireString(value.path, `${path}.path`, issues);
  if (
    typeof value.path === "string" &&
    (value.path.startsWith("/") || value.path.split(/[\\/]/).includes(".."))
  ) {
    addIssue(issues, `${path}.path`, "must be a relative finish-tree path");
  }
  requireSha256(value.sha256, `${path}.sha256`, issues);
}

function validateTargetObservation(value, path, issues) {
  if (!isRecord(value)) {
    addIssue(issues, path, "must be a target observation");
    return;
  }
  if (
    ![
      "missing-copied-input",
      "contradictory-copied-input",
      "unavailable-target-verification",
      "implementation-failure",
    ].includes(value.tag)
  ) {
    addIssue(issues, `${path}.tag`, "must be a supported target observation");
  }
  requireString(value.subject, `${path}.subject`, issues);
  validateRetainedReference(value.evidence, `${path}.evidence`, issues);
}

function validateStatusAttestation(
  value,
  path,
  issues,
  implementationBoundaryTag,
  emptyStatusOutputSha256,
) {
  if (!isRecord(value)) {
    addIssue(issues, path, "must be a status attestation");
    return;
  }
  if (value.command !== "git status --porcelain=v2") {
    addIssue(
      issues,
      `${path}.command`,
      "must record git status --porcelain=v2",
    );
  }
  if (typeof value.clean !== "boolean") {
    addIssue(issues, `${path}.clean`, "must be boolean");
  }
  requireSha256(value.outputSha256, `${path}.outputSha256`, issues);
  if (value.clean === true && value.outputSha256 !== emptyStatusOutputSha256) {
    addIssue(
      issues,
      `${path}.outputSha256`,
      "clean status must hash the empty git status output",
    );
  }
  if (value.clean === true && value.statusEvidence !== undefined) {
    addIssue(
      issues,
      `${path}.statusEvidence`,
      "clean status must not carry dirty-status evidence",
    );
  }
  if (value.clean === false) {
    validateRetainedReference(
      value.statusEvidence,
      `${path}.statusEvidence`,
      issues,
    );
    if (value.statusEvidence?.sha256 !== value.outputSha256) {
      addIssue(
        issues,
        `${path}.statusEvidence.sha256`,
        "must match the non-empty status output digest",
      );
    }
  }
  if (
    implementationBoundaryTag ===
    "declared-pre-existing-implementation-boundary"
  ) {
    const boundary = value.implementationBoundary;
    if (!isRecord(boundary) || boundary.tag !== implementationBoundaryTag) {
      addIssue(
        issues,
        `${path}.implementationBoundary`,
        `must declare ${implementationBoundaryTag}`,
      );
    } else {
      if (boundary.baselineCommit !== undefined) {
        addIssue(
          issues,
          `${path}.implementationBoundary.baselineCommit`,
          "must be omitted; targetStartCommit is the diagnostic baseline",
        );
      }
      requireStringArray(
        boundary.knownPaths,
        `${path}.implementationBoundary.knownPaths`,
        issues,
      );
    }
  } else if (
    !isRecord(value.implementationBoundary) ||
    value.implementationBoundary.tag !== "none"
  ) {
    addIssue(
      issues,
      `${path}.implementationBoundary`,
      "must use the none boundary for a fresh or finished target attestation",
    );
  }
}

function validateMeasurementValue(value, path, issues) {
  if (!isRecord(value)) {
    addIssue(issues, path, "must be reported or explicitly unavailable");
    return;
  }
  if (value.tag === "reported") {
    if (
      value.value === undefined ||
      value.value === null ||
      value.value === ""
    ) {
      addIssue(issues, `${path}.value`, "reported values must not be empty");
    }
    return;
  }
  if (value.tag === "unavailable") {
    requireString(value.reason, `${path}.reason`, issues);
    return;
  }
  addIssue(issues, `${path}.tag`, "must be reported or unavailable");
}

function validateTargetReceipt(receipt, contract) {
  const issues = [];
  if (!isRecord(receipt))
    return [{ path: "receipt", message: "must be an object" }];
  if (!isRecord(contract)) {
    return [
      { path: "contract", message: "canonical receipt contract is required" },
    ];
  }
  if (receipt.schema !== contract.schema || receipt.schema !== RECEIPT_SCHEMA) {
    addIssue(issues, "schema", `must be ${contract.schema}`);
  }
  if (receipt.version !== contract.version) {
    addIssue(issues, "version", `must be ${contract.version}`);
  }
  if (contract.emptyStatusOutputSha256 !== EMPTY_STATUS_OUTPUT_SHA256) {
    addIssue(
      issues,
      "contract.emptyStatusOutputSha256",
      "must equal the sha256 of empty git status output",
    );
  }
  validateContractProjection(contract, issues);
  const runKindContract = contract.runKinds?.[receipt.runKind];
  if (!isRecord(runKindContract)) {
    addIssue(issues, "runKind", "must be a supported run kind");
  }
  for (const field of contract.requiredFields ?? []) {
    if (!(field in receipt))
      addIssue(issues, field, "is required by the canonical receipt contract");
  }

  const manifest = receipt.manifest;
  if (!isRecord(manifest)) {
    addIssue(issues, "manifest", "must bind the receipt to one export");
  } else {
    requireSha256(manifest.catalogSha256, "manifest.catalogSha256", issues);
    requireCommit(manifest.sourceCommitSha, "manifest.sourceCommitSha", issues);
    requireString(manifest.targetProfileId, "manifest.targetProfileId", issues);
    if (manifest.runKind !== receipt.runKind) {
      addIssue(issues, "manifest.runKind", "must match receipt.runKind");
    }
  }

  if (!isRecord(receipt.scope) || receipt.scope.kind !== "single-unit") {
    addIssue(issues, "scope", "must be a single-unit scope");
  } else {
    if (receipt.scope.fullCorpus !== false) {
      addIssue(issues, "scope.fullCorpus", "must be false for the pilot");
    }
    if (
      !Array.isArray(receipt.scope.unitIds) ||
      receipt.scope.unitIds.length !== 1
    ) {
      addIssue(issues, "scope.unitIds", "must contain exactly one Unit");
    }
  }

  for (const [name, commit, status, boundaryTag] of [
    [
      "targetStart",
      receipt.targetStartCommit,
      receipt.targetStartStatus,
      runKindContract?.requiresPreExistingImplementationBoundary
        ? "declared-pre-existing-implementation-boundary"
        : "none",
    ],
    [
      "targetFinish",
      receipt.targetFinishCommit,
      receipt.targetFinishStatus,
      "none",
    ],
  ]) {
    requireCommit(commit, `${name}Commit`, issues);
    validateStatusAttestation(
      status,
      `${name}Status`,
      issues,
      boundaryTag,
      contract.emptyStatusOutputSha256,
    );
  }
  if (
    runKindContract?.startStatus === "clean-required" &&
    receipt.targetStartStatus?.clean !== true
  ) {
    addIssue(
      issues,
      "targetStartStatus.clean",
      "fresh experiments must start clean",
    );
  }
  if (receipt.targetFinishStatus?.clean !== true) {
    addIssue(
      issues,
      "targetFinishStatus.clean",
      "target runs must finish clean",
    );
  }
  const targetOutcome = receipt.targetOutcome;
  if (!isRecord(targetOutcome)) {
    addIssue(issues, "targetOutcome", "must report completed or blocked");
  } else if (targetOutcome.tag === "completed") {
    if (Object.keys(targetOutcome).length !== 1) {
      addIssue(
        issues,
        "targetOutcome",
        "completed outcomes must not carry blocker observations",
      );
    }
  } else if (targetOutcome.tag === "blocked") {
    if (
      !Array.isArray(targetOutcome.observations) ||
      targetOutcome.observations.length === 0
    ) {
      addIssue(
        issues,
        "targetOutcome.observations",
        "blocked outcomes require structured target observations",
      );
    } else {
      for (const [index, observation] of targetOutcome.observations.entries()) {
        validateTargetObservation(
          observation,
          `targetOutcome.observations[${index}]`,
          issues,
        );
      }
    }
  } else {
    addIssue(issues, "targetOutcome.tag", "must be completed or blocked");
  }
  if (!isRecord(receipt.ancestorProof)) {
    addIssue(
      issues,
      "ancestorProof",
      "must prove start is an ancestor of finish",
    );
  } else if (receipt.ancestorProof.verified !== true) {
    addIssue(issues, "ancestorProof.verified", "must be true");
  } else {
    if (
      receipt.ancestorProof.command !==
      "git merge-base --is-ancestor targetStartCommit targetFinishCommit"
    ) {
      addIssue(
        issues,
        "ancestorProof.command",
        "must record the ancestor command",
      );
    }
    requireSha256(
      receipt.ancestorProof.outputSha256,
      "ancestorProof.outputSha256",
      issues,
    );
  }

  const retainedArtifactHashes = new Map();
  if (Array.isArray(receipt.retainedArtifacts)) {
    for (const artifact of receipt.retainedArtifacts) {
      if (isRecord(artifact) && typeof artifact.path === "string") {
        retainedArtifactHashes.set(artifact.path, artifact.sha256);
      }
    }
  }

  if (!Array.isArray(receipt.branchObservations)) {
    addIssue(issues, "branchObservations", "must be an array");
  } else if (
    receipt.targetOutcome?.tag === "completed" &&
    receipt.branchObservations.length === 0
  ) {
    addIssue(
      issues,
      "branchObservations",
      "completed outcomes require exact selected branch observations",
    );
  } else if (
    receipt.targetOutcome?.tag === "blocked" &&
    receipt.branchObservations.length !== 0
  ) {
    addIssue(
      issues,
      "branchObservations",
      "blocked outcomes cannot claim branch observations",
    );
  } else {
    for (const [index, observation] of receipt.branchObservations.entries()) {
      const path = `branchObservations[${index}]`;
      if (!isRecord(observation)) {
        addIssue(issues, path, "must be an observation object");
        continue;
      }
      requireString(observation.driverPath, `${path}.driverPath`, issues);
      requireString(observation.branchAction, `${path}.branchAction`, issues);
      requireSha256(observation.qntFileSha256, `${path}.qntFileSha256`, issues);
      if (observation.observedActionTaken !== observation.branchAction) {
        addIssue(
          issues,
          `${path}.observedActionTaken`,
          "must equal branchAction",
        );
      }
      if (observation.replayLane?.tag !== "native-qnt-mbt") {
        addIssue(issues, `${path}.replayLane`, "must be native-qnt-mbt");
      }
      if (!isRecord(observation.production)) {
        addIssue(
          issues,
          `${path}.production`,
          "must carry target entrypoint/projection evidence",
        );
      } else {
        validateRetainedReference(
          observation.production.entrypoint,
          `${path}.production.entrypoint`,
          issues,
        );
        validateRetainedReference(
          observation.production.projection,
          `${path}.production.projection`,
          issues,
        );
      }
      requireString(observation.evidencePath, `${path}.evidencePath`, issues);
      requireSha256(
        observation.evidenceSha256,
        `${path}.evidenceSha256`,
        issues,
      );
    }
  }

  if (
    !Array.isArray(receipt.retainedArtifacts) ||
    receipt.retainedArtifacts.length === 0
  ) {
    addIssue(
      issues,
      "retainedArtifacts",
      "must retain implementation-independent evidence",
    );
  } else {
    for (const [index, artifact] of receipt.retainedArtifacts.entries()) {
      const path = `retainedArtifacts[${index}]`;
      if (!isRecord(artifact)) {
        addIssue(issues, path, "must be an artifact reference");
        continue;
      }
      validateRetainedReference(artifact, path, issues);
    }
  }

  for (const [index, observation] of (
    receipt.branchObservations ?? []
  ).entries()) {
    const observationPath = `branchObservations[${index}]`;
    const evidenceHash = retainedArtifactHashes.get(observation.evidencePath);
    if (
      evidenceHash !== undefined &&
      evidenceHash !== observation.evidenceSha256
    ) {
      addIssue(
        issues,
        `${observationPath}.evidenceSha256`,
        "must match the retained branch evidence artifact",
      );
    }
    if (!retainedArtifactHashes.has(observation.evidencePath)) {
      addIssue(
        issues,
        `${observationPath}.evidencePath`,
        "must reference a retained artifact",
      );
    }
    for (const [fact, reference] of Object.entries(
      observation.production ?? {},
    )) {
      const retainedHash = retainedArtifactHashes.get(reference?.path);
      if (retainedHash !== reference?.sha256) {
        addIssue(
          issues,
          `${observationPath}.production.${fact}`,
          "must reference a retained artifact with the same sha256",
        );
      }
    }
  }

  for (const [statusName, status] of [
    ["targetStartStatus", receipt.targetStartStatus],
    ["targetFinishStatus", receipt.targetFinishStatus],
  ]) {
    if (status?.clean === false) {
      const statusHash = retainedArtifactHashes.get(
        status.statusEvidence?.path,
      );
      if (statusHash !== status.statusEvidence?.sha256) {
        addIssue(
          issues,
          `${statusName}.statusEvidence`,
          "must reference a retained non-empty status output",
        );
      }
    }
  }

  for (const [index, observation] of (
    receipt.targetOutcome?.observations ?? []
  ).entries()) {
    const observationPath = `targetOutcome.observations[${index}]`;
    const evidence = observation?.evidence;
    const retainedHash = retainedArtifactHashes.get(evidence?.path);
    if (retainedHash !== evidence?.sha256) {
      addIssue(
        issues,
        `${observationPath}.evidence`,
        "must reference a retained artifact with the same sha256",
      );
    }
  }

  if (!isRecord(receipt.timing)) {
    addIssue(issues, "timing", "must contain start and finish timestamps");
  } else {
    for (const field of ["startedAt", "finishedAt"]) {
      requireString(receipt.timing[field], `timing.${field}`, issues);
      if (
        typeof receipt.timing[field] === "string" &&
        Number.isNaN(Date.parse(receipt.timing[field]))
      ) {
        addIssue(issues, `timing.${field}`, "must be an ISO timestamp");
      }
    }
  }

  if (!isRecord(receipt.measurementProvenance)) {
    addIssue(
      issues,
      "measurementProvenance",
      "must record reported or unavailable measurements",
    );
  } else {
    for (const field of contract.measurementFields ?? []) {
      validateMeasurementValue(
        receipt.measurementProvenance[field],
        `measurementProvenance.${field}`,
        issues,
      );
    }
  }
  if (receipt.nextAction !== "source-intake") {
    addIssue(
      issues,
      "nextAction",
      "must direct the target back to source intake",
    );
  }
  return issues;
}

function buildReceiptContractProjection(contractPath) {
  if (typeof contractPath !== "string" || !fs.existsSync(contractPath)) {
    throw new Error("canonical cleanroom contract is unavailable");
  }
  const blocks = fs
    .readFileSync(contractPath, "utf8")
    .split("```json")
    .slice(1)
    .map((block) => block.split("```", 1)[0].trim());
  for (const block of blocks) {
    let candidate;
    try {
      candidate = JSON.parse(block);
    } catch (_error) {
      continue;
    }
    if (candidate?.schema === RECEIPT_SCHEMA) {
      if (
        candidate.version !== 1 ||
        !isRecord(candidate.runKinds) ||
        !Array.isArray(candidate.requiredFields) ||
        !Array.isArray(candidate.measurementFields) ||
        !sha256Pattern(candidate.emptyStatusOutputSha256) ||
        !isRecord(candidate.jsonSchema) ||
        !isRecord(candidate.jsonSchema.properties) ||
        !isRecord(candidate.jsonSchema.$defs)
      ) {
        throw new Error("canonical cleanroom receipt contract is malformed");
      }
      return candidate;
    }
  }
  throw new Error("canonical cleanroom receipt contract block is missing");
}

module.exports = {
  RECEIPT_SCHEMA,
  buildReceiptContractProjection,
  stableStringify,
  validateTargetReceipt,
};
