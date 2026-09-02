#!/usr/bin/env node

const crypto = require("node:crypto");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = process.env.RAW_COVERAGE_ROOT ?? process.cwd();
const rawCoverageDir = path.join(root, "plans/raw-coverage");
const write = process.argv.includes("--write");
const selfTest = process.argv.includes("--self-test");

const paths = {
  sections: path.join(rawCoverageDir, "sections.json"),
  annotations: path.join(rawCoverageDir, "annotations.jsonl"),
  requirements: path.join(rawCoverageDir, "requirements.jsonl"),
  rawReviews: path.join(rawCoverageDir, "raw-reviews.jsonl"),
  evidenceClaims: path.join(rawCoverageDir, "evidence-claims.jsonl"),
  trackerClaims: path.join(rawCoverageDir, "tracker-claims.jsonl"),
  matrix: path.join(rawCoverageDir, "matrix.json"),
  report: path.join(rawCoverageDir, "REPORT.md"),
};

const domainClassifications = new Set([
  "definition",
  "rule-procedure",
  "rule-guard",
  "rule-consequence",
  "authored-data",
  "table-caller-responsibility",
]);
const rawCoverageClaimKinds = new Set([
  "qnt-owner",
  "runtime-owner",
  "verification-owner:qnt-proof",
  "verification-owner:focused-mbt",
  "verification-owner:runtime-test",
  "verification-owner:doc",
]);
const evidenceCoverageMetrics = new Set([
  "qnt-proof",
  "runtime-parity",
  "runtime-test",
]);
const evidenceMetricVerificationOwnerKinds = new Map([
  ["qnt-proof", "qnt-proof"],
  ["runtime-parity", "focused-mbt"],
  ["runtime-test", "runtime-test"],
]);
const trackerCoverageMetrics = new Set([
  "missing-qnt-owner",
  "missing-runtime-owner",
]);
const nonRulesCorpusFiles = new Set(["ATTRIBUTION.md"]);

function fail(message) {
  throw new Error(message);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readJsonl(filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        fail(
          `${path.relative(root, filePath)}:${index + 1} is not valid JSON: ${error.message}`,
        );
      }
    });
}

function hashText(text) {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
}

function generatedSpanId(section, ordinal) {
  return `${section.spanIdPrefix}-${String(ordinal).padStart(3, "0")}`;
}

function slug(value) {
  return (
    value
      .normalize("NFKD")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toUpperCase()
      .slice(0, 48) || "ROOT"
  );
}

function markdownFiles(dirPath) {
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) return markdownFiles(entryPath);
      if (
        entry.isFile() &&
        entry.name.endsWith(".md") &&
        !nonRulesCorpusFiles.has(entry.name)
      ) {
        return [entryPath];
      }
      return [];
    })
    .sort();
}

function sectionPathId(sourcePath) {
  return slug(
    sourcePath.replace(/^\.references\/srd-5\.2\.1\//, "").replace(/\.md$/, ""),
  );
}

function generatedSectionForHeading(
  sourcePath,
  headingPath,
  headingLine,
  lineNumber,
) {
  const fileSlug = sectionPathId(sourcePath);
  const reactionTracer =
    sourcePath === ".references/srd-5.2.1/Playing-the-Game.md" &&
    headingPath.join("\u0000") === "Actions\u0000Reactions";
  const spanIdPrefix = reactionTracer
    ? "SRD521-PTG-ACTIONS-REACTIONS"
    : `SRD521-${fileSlug}-${String(lineNumber).padStart(4, "0")}`;
  return {
    sectionId: reactionTracer
      ? "srd521-playing-the-game-actions-reactions"
      : `srd521-${fileSlug.toLowerCase()}-${String(lineNumber).padStart(4, "0")}`,
    spanIdPrefix,
    corpus: "srd-5.2.1",
    path: sourcePath,
    headingPath,
    headingLine,
    startLine: lineNumber,
  };
}

function discoverCorpusSections(corpusRoot) {
  return markdownFiles(path.join(root, corpusRoot)).flatMap((filePath) => {
    const sourcePath = path.relative(root, filePath).split(path.sep).join("/");
    const lines = fs.readFileSync(filePath, "utf8").split("\n");
    const headingStack = [];
    return lines.flatMap((line, index) => {
      const match = line.match(/^(#+)\s+(.+)$/);
      if (!match) return [];
      const level = match[1].length;
      headingStack.length = level - 1;
      headingStack[level - 1] = match[2].trim();
      return [
        generatedSectionForHeading(
          sourcePath,
          headingStack.filter(Boolean).slice(1),
          line,
          index + 1,
        ),
      ];
    });
  });
}

function readSections() {
  const config = readJson(paths.sections);
  if (config.corpusRoot) return discoverCorpusSections(config.corpusRoot);
  return config.sections;
}

function splitSentences(text) {
  return (
    text.match(/[^.!?]+[.!?](?=$| )/g)?.map((span) => span.trim()) ?? [
      text.trim(),
    ]
  );
}

function generateSectionSpans(section) {
  const sourcePath = path.join(root, section.path);
  const lines = fs.readFileSync(sourcePath, "utf8").split("\n");
  const startIndex = lines.findIndex(
    (line, index) =>
      index + 1 >= section.startLine && line === section.headingLine,
  );
  if (startIndex === -1) {
    fail(`Could not find heading ${section.headingLine} in ${section.path}.`);
  }
  const spans = [];
  let ordinal = 1;
  spans.push({
    spanId: generatedSpanId(section, ordinal),
    text: section.headingLine.replace(/^#+\s+/, ""),
    lineStart: startIndex + 1,
    lineEnd: startIndex + 1,
    ordinal,
  });
  ordinal += 1;

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === section.endBeforeHeading) break;
    if (/^#+\s+/.test(line)) break;
    if (line.trim().length === 0) continue;
    for (const sentence of splitSentences(line)) {
      spans.push({
        spanId: generatedSpanId(section, ordinal),
        text: sentence,
        lineStart: index + 1,
        lineEnd: index + 1,
        ordinal,
      });
      ordinal += 1;
    }
  }

  return spans.map((span) => ({
    spanId: span.spanId,
    source: {
      corpus: section.corpus,
      path: section.path,
      headingPath: section.headingPath,
      ordinal: span.ordinal,
      lineStart: span.lineStart,
      lineEnd: span.lineEnd,
      textHash: hashText(span.text),
    },
    text: span.text,
  }));
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stable(value[key])]),
    );
  }
  return value;
}

function assertDeepEqual(actual, expected, label) {
  const actualJson = JSON.stringify(stable(actual), null, 2);
  const expectedJson = JSON.stringify(stable(expected), null, 2);
  if (actualJson !== expectedJson) {
    fail(
      `${label} is stale. Run node scripts/raw-coverage-check.cjs --write to refresh it.`,
    );
  }
}

function validateOwnerPath(ownerPath, context) {
  if (!fs.existsSync(path.join(root, ownerPath))) {
    fail(`${context} references missing owner path: ${ownerPath}`);
  }
}

function toRepoPath(filePath, scanRoot = root) {
  return path.relative(scanRoot, filePath).split(path.sep).join("/");
}

function claimCandidateFiles(scanRoot = root) {
  return childProcess
    .execFileSync(
      "git",
      [
        "ls-files",
        "-z",
        "--cached",
        "--others",
        "--exclude-per-directory=.gitignore",
        "--",
        "packages",
        "plans",
      ],
      { cwd: scanRoot, encoding: "utf8" },
    )
    .split("\0")
    .filter((repoPath) => repoPath.length > 0)
    .map((repoPath) => path.join(scanRoot, repoPath))
    .filter(
      (filePath) => fs.existsSync(filePath) && fs.lstatSync(filePath).isFile(),
    );
}

function parseRawCoverageClaimsFromText(text, ownerPath) {
  return text.split("\n").flatMap((line, lineIndex) => {
    const match = line.match(/RAW-COVERAGE:\s+([a-z-]+(?::[a-z-]+)?)\s+(.+)$/);
    if (!match) return [];
    const kind = match[1];
    const requirementIds = match[2].trim().split(/\s+/);
    if (!rawCoverageClaimKinds.has(kind)) {
      fail(
        `${ownerPath}:${lineIndex + 1} uses unknown RAW-COVERAGE claim kind ${kind}.`,
      );
    }
    return requirementIds.map((requirementId) => {
      if (!/^RAW-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(requirementId)) {
        fail(
          `${ownerPath}:${lineIndex + 1} has invalid RAW requirement id ${requirementId}.`,
        );
      }
      return { ownerPath, line: lineIndex + 1, kind, requirementId };
    });
  });
}

function scanRawCoverageClaims(scanRoot = root) {
  return claimCandidateFiles(scanRoot).flatMap((filePath) => {
    const text = fs.readFileSync(filePath, "utf8");
    return parseRawCoverageClaimsFromText(text, toRepoPath(filePath, scanRoot));
  });
}

function claimKey(ownerPath, kind, requirementId) {
  return `${ownerPath}\u0000${kind}\u0000${requirementId}`;
}

function requirementIdsForAnnotation(annotation) {
  if (annotation.closure?.tag === "requirement")
    return annotation.closure.requirementIds ?? [];
  return annotation.requirementIds ?? [];
}

function validateCoverageClaimRows({
  rows,
  identityField,
  allowedMetrics,
  requirementsById,
  claimKind,
  metricVerificationOwnerKinds,
}) {
  const allowedFields = new Set([
    identityField,
    "coverageMetric",
    "requirementIds",
  ]);
  if (claimKind === "evidence") allowedFields.add("ownerPath");
  const identities = new Set();
  for (const [index, row] of rows.entries()) {
    const context = `${claimKind} claim row ${index + 1}`;
    if (row === null || typeof row !== "object" || Array.isArray(row)) {
      fail(`${context} must be an object.`);
    }
    const unknownFields = Object.keys(row).filter(
      (field) => !allowedFields.has(field),
    );
    if (unknownFields.length > 0) {
      fail(`${context} has unknown fields: ${unknownFields.join(", ")}.`);
    }
    const identity = row[identityField];
    if (typeof identity !== "string" || identity.trim().length === 0) {
      fail(`${context}.${identityField} must be a non-empty string.`);
    }
    if (identities.has(identity)) {
      fail(`${claimKind} claim identity ${identity} is duplicated.`);
    }
    identities.add(identity);
    if (claimKind === "tracker" && !/^GH-[1-9][0-9]*$/.test(identity)) {
      fail(`${context}.${identityField} must be a stable GH issue id.`);
    }
    if (!allowedMetrics.has(row.coverageMetric)) {
      fail(
        `${context}.coverageMetric has unknown value ${row.coverageMetric}.`,
      );
    }
    if (
      claimKind === "evidence" &&
      (typeof row.ownerPath !== "string" || row.ownerPath.trim().length === 0)
    ) {
      fail(`${context}.ownerPath must be a non-empty string.`);
    }
    if (!Array.isArray(row.requirementIds) || row.requirementIds.length === 0) {
      fail(`${context}.requirementIds must be a non-empty array.`);
    }
    const referencedIds = new Set();
    for (const [requirementIndex, requirementId] of (
      row.requirementIds ?? []
    ).entries()) {
      if (
        typeof requirementId !== "string" ||
        requirementId.trim().length === 0
      ) {
        fail(
          `${context}.requirementIds[${requirementIndex}] must be a non-empty string.`,
        );
      }
      if (referencedIds.has(requirementId)) {
        fail(`${context}.requirementIds duplicates ${requirementId}.`);
      }
      referencedIds.add(requirementId);
      if (!requirementsById.has(requirementId)) {
        fail(`${context} references unknown requirement ${requirementId}.`);
      }
      const requiredOwnerKind = metricVerificationOwnerKinds?.get(
        row.coverageMetric,
      );
      const requirement = requirementsById.get(requirementId);
      if (
        requiredOwnerKind !== undefined &&
        !(requirement.verificationOwners ?? []).some(
          (owner) =>
            owner.kind === requiredOwnerKind &&
            owner.ownerPath === row.ownerPath,
        )
      ) {
        fail(
          `${context} metric ${row.coverageMetric} requires ${requirementId} to have exact verification owner ${requiredOwnerKind}:${row.ownerPath}.`,
        );
      }
    }
  }
}

function annotationIsOutOfScope(annotation) {
  return (
    annotation.classification === "unsupported-out-of-promoted-scope" ||
    annotation.closure?.tag === "out-of-promoted-scope"
  );
}

function annotationOutOfScopeReason(annotation) {
  return annotation.closure?.reason ?? annotation.reason;
}

function annotationAssumptionId(annotation) {
  if (annotation.closure?.tag === "closed-by-assumption")
    return annotation.closure.assumptionId;
  return annotation.assumptionId;
}

function annotationNeedsAssumption(annotation) {
  return (
    annotation.classification === "ambiguous-needs-assumption" ||
    annotation.closure?.tag === "needs-assumption"
  );
}

function validateRawCoverageOwnerClaims(requirements, scanRoot = root) {
  const requirementsById = new Map(
    requirements.map((requirement) => [requirement.id, requirement]),
  );
  const claims = scanRawCoverageClaims(scanRoot);
  const claimsByKey = new Set(
    claims.map((claim) =>
      claimKey(claim.ownerPath, claim.kind, claim.requirementId),
    ),
  );

  for (const claim of claims) {
    const requirement = requirementsById.get(claim.requirementId);
    if (!requirement) {
      fail(
        `${claim.ownerPath}:${claim.line} cites unknown RAW requirement ${claim.requirementId}.`,
      );
    }
    if (
      claim.kind === "qnt-owner" &&
      !(requirement.qntOwners ?? []).includes(claim.ownerPath)
    ) {
      fail(
        `${claim.ownerPath}:${claim.line} cites ${claim.requirementId} as qnt-owner, but requirements.jsonl does not list that owner.`,
      );
    }
    if (
      claim.kind === "runtime-owner" &&
      !(requirement.runtimeOwners ?? []).includes(claim.ownerPath)
    ) {
      fail(
        `${claim.ownerPath}:${claim.line} cites ${claim.requirementId} as runtime-owner, but requirements.jsonl does not list that owner.`,
      );
    }
    if (claim.kind.startsWith("verification-owner:")) {
      const verificationKind = claim.kind.slice("verification-owner:".length);
      if (
        !(requirement.verificationOwners ?? []).some(
          (owner) =>
            owner.kind === verificationKind &&
            owner.ownerPath === claim.ownerPath,
        )
      ) {
        fail(
          `${claim.ownerPath}:${claim.line} cites ${claim.requirementId} as ${claim.kind}, but requirements.jsonl does not list that verification owner.`,
        );
      }
    }
  }

  for (const requirement of requirements) {
    for (const ownerPath of requirement.qntOwners ?? []) {
      if (!claimsByKey.has(claimKey(ownerPath, "qnt-owner", requirement.id))) {
        fail(
          `${requirement.id} lists qnt owner ${ownerPath}, but that artifact does not cite it with RAW-COVERAGE: qnt-owner.`,
        );
      }
    }
    for (const ownerPath of requirement.runtimeOwners ?? []) {
      if (
        !claimsByKey.has(claimKey(ownerPath, "runtime-owner", requirement.id))
      ) {
        fail(
          `${requirement.id} lists runtime owner ${ownerPath}, but that artifact does not cite it with RAW-COVERAGE: runtime-owner.`,
        );
      }
    }
    for (const owner of requirement.verificationOwners ?? []) {
      const kind = `verification-owner:${owner.kind}`;
      if (!claimsByKey.has(claimKey(owner.ownerPath, kind, requirement.id))) {
        fail(
          `${requirement.id} lists ${owner.kind} verification owner ${owner.ownerPath}, but that artifact does not cite it with RAW-COVERAGE: ${kind}.`,
        );
      }
    }
  }
}

function buildMatrix() {
  const sections = readSections();
  const annotations = readJsonl(paths.annotations);
  const requirements = readJsonl(paths.requirements);
  const rawReviews = readJsonl(paths.rawReviews);
  const evidenceClaims = readJsonl(paths.evidenceClaims);
  const trackerClaims = readJsonl(paths.trackerClaims);
  const generatedSpans = sections.flatMap(generateSectionSpans);

  const sectionsById = new Map(
    sections.map((section) => [section.sectionId, section]),
  );
  const generatedById = new Map(
    generatedSpans.map((span) => [span.spanId, span]),
  );
  const annotationsById = new Map(
    annotations.map((span) => [span.spanId, span]),
  );
  const requirementsById = new Map(
    requirements.map((requirement) => [requirement.id, requirement]),
  );
  const rawReviewsBySectionId = new Map(
    rawReviews.map((review) => [review.sectionId, review]),
  );

  for (const section of sections) {
    if (!section.spanIdPrefix)
      fail(`Section ${section.sectionId} must define spanIdPrefix.`);
    const review = rawReviewsBySectionId.get(section.sectionId);
    if (!review) fail(`Section ${section.sectionId} is missing a RAW review.`);
    if (review.reviewer !== "raw-review-agent") {
      fail(
        `Section ${section.sectionId} RAW review must be recorded by raw-review-agent.`,
      );
    }
    if (review.verdict !== "pass") {
      fail(`Section ${section.sectionId} RAW review verdict must be pass.`);
    }
    if (
      !Array.isArray(review.sourcesChecked) ||
      !review.sourcesChecked.includes(section.path)
    ) {
      fail(
        `Section ${section.sectionId} RAW review must cite ${section.path}.`,
      );
    }
    if (
      !Array.isArray(review.sourcesChecked) ||
      !review.sourcesChecked.includes("UBIQUITOUS_LANGUAGE.md")
    ) {
      fail(
        `Section ${section.sectionId} RAW review must cite UBIQUITOUS_LANGUAGE.md.`,
      );
    }
  }

  for (const review of rawReviews) {
    if (!sectionsById.has(review.sectionId)) {
      fail(`RAW review references unknown section ${review.sectionId}.`);
    }
  }

  for (const generated of generatedSpans) {
    const annotation = annotationsById.get(generated.spanId);
    if (!annotation)
      fail(`Generated span is unclassified: ${generated.spanId}`);
    if (annotation.source) {
      assertDeepEqual(
        annotation.source,
        generated.source,
        `Annotation source for ${generated.spanId}`,
      );
    }
    if (annotation.text && annotation.text !== generated.text) {
      fail(`Annotation text drifted for ${generated.spanId}.`);
    }
  }

  for (const section of sections) {
    const review = rawReviewsBySectionId.get(section.sectionId);
    const sectionSpanIds = generatedSpans
      .filter((span) => span.spanId.startsWith(`${section.spanIdPrefix}-`))
      .map((span) => span.spanId);
    for (const spanId of sectionSpanIds) {
      if (review.reviewedSpanIds && !review.reviewedSpanIds.includes(spanId)) {
        fail(`RAW review for ${section.sectionId} does not cover ${spanId}.`);
      }
    }
  }

  for (const annotation of annotations) {
    if (!generatedById.has(annotation.spanId))
      fail(
        `Annotation references unknown generated span: ${annotation.spanId}`,
      );
    if (!annotation.classification)
      fail(`Annotation ${annotation.spanId} has no classification.`);
    const requirementIds = requirementIdsForAnnotation(annotation);
    if (domainClassifications.has(annotation.classification)) {
      if (
        requirementIds.length === 0 &&
        !annotationIsOutOfScope(annotation) &&
        !annotationAssumptionId(annotation) &&
        !annotationNeedsAssumption(annotation)
      ) {
        fail(
          `Domain span ${annotation.spanId} must cite requirements or carry a closure disposition.`,
        );
      }
    }
    if (
      annotationIsOutOfScope(annotation) &&
      typeof annotationOutOfScopeReason(annotation) !== "string"
    ) {
      fail(
        `Out-of-promoted-scope span ${annotation.spanId} must carry a reason.`,
      );
    }
    if (annotation.classification === "fluff" && requirementIds.length > 0) {
      fail(`Fluff span ${annotation.spanId} must not cite requirements.`);
    }
    for (const requirementId of requirementIds) {
      if (!requirementsById.has(requirementId)) {
        fail(
          `Annotation ${annotation.spanId} references unknown requirement ${requirementId}.`,
        );
      }
    }
  }

  for (const requirement of requirements) {
    if (
      !Array.isArray(requirement.sourceSpanIds) ||
      requirement.sourceSpanIds.length === 0
    ) {
      fail(`Requirement ${requirement.id} must cite source spans.`);
    }
    for (const spanId of requirement.sourceSpanIds) {
      const annotation = annotationsById.get(spanId);
      if (!annotation)
        fail(
          `Requirement ${requirement.id} references unknown span ${spanId}.`,
        );
      if (!requirementIdsForAnnotation(annotation).includes(requirement.id)) {
        fail(
          `Requirement ${requirement.id} source span ${spanId} does not cite it back.`,
        );
      }
    }
    for (const ownerPath of requirement.qntOwners ?? [])
      validateOwnerPath(ownerPath, requirement.id);
    for (const ownerPath of requirement.runtimeOwners ?? [])
      validateOwnerPath(ownerPath, requirement.id);
    for (const owner of requirement.verificationOwners ?? [])
      validateOwnerPath(owner.ownerPath, requirement.id);
  }
  validateRawCoverageOwnerClaims(requirements);

  validateCoverageClaimRows({
    rows: evidenceClaims,
    identityField: "evidenceId",
    allowedMetrics: evidenceCoverageMetrics,
    requirementsById,
    claimKind: "evidence",
    metricVerificationOwnerKinds: evidenceMetricVerificationOwnerKinds,
  });
  validateCoverageClaimRows({
    rows: trackerClaims,
    identityField: "trackerId",
    allowedMetrics: trackerCoverageMetrics,
    requirementsById,
    claimKind: "tracker",
  });

  const executableRequirements = requirements.filter(
    (requirement) => requirement.coverageKind === "executable",
  );
  const qntModeled = executableRequirements.filter(
    (requirement) => requirement.qntOwners.length > 0,
  );
  const qntProved = executableRequirements.filter((requirement) =>
    requirement.verificationOwners.some((owner) => owner.kind === "qnt-proof"),
  );
  const runtimeMapped = executableRequirements.filter(
    (requirement) => requirement.runtimeOwners.length > 0,
  );
  const runtimeTested = executableRequirements.filter((requirement) =>
    requirement.verificationOwners.some(
      (owner) => owner.kind === "runtime-test",
    ),
  );
  const runtimeParityCovered = executableRequirements.filter((requirement) =>
    requirement.verificationOwners.some(
      (owner) => owner.kind === "focused-mbt",
    ),
  );
  const nonFluffAnnotations = annotations.filter(
    (annotation) => annotation.classification !== "fluff",
  );
  const outOfScopeAnnotations = annotations.filter(annotationIsOutOfScope);
  const ambiguousAnnotations = annotations.filter(annotationNeedsAssumption);
  const closedNonFluffAnnotations = nonFluffAnnotations.filter((annotation) => {
    if (requirementIdsForAnnotation(annotation).length > 0) return true;
    if (annotationAssumptionId(annotation)) return true;
    if (
      annotationIsOutOfScope(annotation) &&
      annotationOutOfScopeReason(annotation)
    )
      return true;
    return false;
  });

  return {
    tracer: {
      sectionIds: sections.map((section) => section.sectionId),
      source: sections.map((section) => ({
        corpus: section.corpus,
        path: section.path,
        headingPath: section.headingPath,
      })),
    },
    summary: {
      generatedSpans: generatedSpans.length,
      classifiedSpans: annotations.length,
      fluffSpans: annotations.filter(
        (annotation) => annotation.classification === "fluff",
      ).length,
      nonFluffSpans: nonFluffAnnotations.length,
      closedNonFluffSpans: closedNonFluffAnnotations.length,
      requirements: requirements.length,
      executableRequirements: executableRequirements.length,
      qntModeled: qntModeled.length,
      qntProved: qntProved.length,
      runtimeMapped: runtimeMapped.length,
      runtimeTested: runtimeTested.length,
      runtimeParityCovered: runtimeParityCovered.length,
      outOfScopeSpans: outOfScopeAnnotations.length,
      ambiguousSpans: ambiguousAnnotations.length,
      rawReviewedSections: rawReviews.filter(
        (review) => review.verdict === "pass",
      ).length,
    },
    rawReviews: rawReviews.map((review) => ({
      sectionId: review.sectionId,
      reviewer: review.reviewer,
      verdict: review.verdict,
      sourcesChecked: review.sourcesChecked,
    })),
    evidenceClaims: evidenceClaims.map((claim) => ({
      evidenceId: claim.evidenceId,
      coverageMetric: claim.coverageMetric,
      ownerPath: claim.ownerPath,
      requirementIds: claim.requirementIds,
    })),
    trackerClaims: trackerClaims.map((claim) => ({
      trackerId: claim.trackerId,
      coverageMetric: claim.coverageMetric,
      requirementIds: claim.requirementIds,
    })),
    requirements: requirements.map((requirement) => ({
      id: requirement.id,
      title: requirement.title,
      coverageKind: requirement.coverageKind,
      sourceSpanIds: requirement.sourceSpanIds,
      qntModeled: requirement.qntOwners.length > 0,
      qntProved: requirement.verificationOwners.some(
        (owner) => owner.kind === "qnt-proof",
      ),
      runtimeMapped: requirement.runtimeOwners.length > 0,
      runtimeTested: requirement.verificationOwners.some(
        (owner) => owner.kind === "runtime-test",
      ),
      runtimeParityCovered: requirement.verificationOwners.some(
        (owner) => owner.kind === "focused-mbt",
      ),
      evidenceClaims: evidenceClaims
        .filter((claim) => claim.requirementIds.includes(requirement.id))
        .map((claim) => claim.evidenceId),
      trackerClaims: trackerClaims
        .filter((claim) => claim.requirementIds.includes(requirement.id))
        .map((claim) => claim.trackerId),
    })),
    outOfScope: outOfScopeAnnotations.map((annotation) => ({
      spanId: annotation.spanId,
      source: generatedById.get(annotation.spanId).source,
      classification: annotation.classification,
      reason: annotationOutOfScopeReason(annotation),
      text: generatedById.get(annotation.spanId).text,
    })),
    ambiguous: ambiguousAnnotations.map((annotation) => ({
      spanId: annotation.spanId,
      source: generatedById.get(annotation.spanId).source,
      assumptionId: annotationAssumptionId(annotation),
      text: generatedById.get(annotation.spanId).text,
    })),
  };
}

function pct(done, total) {
  if (total === 0) return "n/a";
  return `${((done / total) * 100).toFixed(2)}%`;
}

function renderReport(matrix) {
  const s = matrix.summary;
  const renderSource = (source) =>
    source.headingPath.length > 0
      ? `${source.path} > ${source.headingPath.join(" > ")}`
      : source.path;
  const lines = [
    "# RAW Coverage Matrix Report",
    "",
    "## Tracer Scope",
    "",
    ...matrix.tracer.source
      .slice(0, 200)
      .map((source) => `- ${renderSource(source)}`),
    ...(matrix.tracer.source.length > 200
      ? [
          `- ... ${matrix.tracer.source.length - 200} additional sections omitted from the Markdown report; see matrix.json.`,
        ]
      : []),
    "",
    "## Summary",
    "",
    `- SRD span classification: ${s.classifiedSpans} / ${s.generatedSpans} = ${pct(s.classifiedSpans, s.generatedSpans)}`,
    `- Non-fluff span closure: ${s.closedNonFluffSpans} / ${s.nonFluffSpans} = ${pct(s.closedNonFluffSpans, s.nonFluffSpans)}`,
    `- Executable requirements: ${s.executableRequirements}`,
    `- QNT modeled: ${s.qntModeled} / ${s.executableRequirements} = ${pct(s.qntModeled, s.executableRequirements)}`,
    `- QNT proved: ${s.qntProved} / ${s.executableRequirements} = ${pct(s.qntProved, s.executableRequirements)}`,
    `- Runtime mapped: ${s.runtimeMapped} / ${s.executableRequirements} = ${pct(s.runtimeMapped, s.executableRequirements)}`,
    `- Runtime tested: ${s.runtimeTested} / ${s.executableRequirements} = ${pct(s.runtimeTested, s.executableRequirements)}`,
    `- Runtime parity covered: ${s.runtimeParityCovered} / ${s.executableRequirements} = ${pct(s.runtimeParityCovered, s.executableRequirements)}`,
    `- Out of promoted scope spans: ${s.outOfScopeSpans}`,
    `- Ambiguous spans: ${s.ambiguousSpans}`,
    `- RAW-reviewed sections: ${s.rawReviewedSections} / ${matrix.tracer.sectionIds.length} = ${pct(
      s.rawReviewedSections,
      matrix.tracer.sectionIds.length,
    )}`,
    "",
    "## RAW Review",
    "",
    "| Section | Reviewer | Verdict | Sources checked |",
    "| --- | --- | --- | --- |",
    ...matrix.rawReviews.map(
      (review) =>
        `| ${review.sectionId} | ${review.reviewer} | ${review.verdict} | ${review.sourcesChecked.join(", ")} |`,
    ),
    "",
    "## Historical Evidence Claims",
    "",
    "| Evidence | Coverage metric | Exact owner | Requirements |",
    "| --- | --- | --- | --- |",
    ...matrix.evidenceClaims.map(
      (claim) =>
        `| ${claim.evidenceId} | ${claim.coverageMetric} | ${claim.ownerPath} | ${claim.requirementIds.join(", ")} |`,
    ),
    "",
    "## Tracker Follow-up Claims",
    "",
    "GitHub owns tracker status. These rows only join checked coverage gaps to stable issue identities.",
    "",
    "| Tracker | Gap metric | Requirements |",
    "| --- | --- | --- |",
    ...matrix.trackerClaims.map(
      (claim) =>
        `| ${claim.trackerId} | ${claim.coverageMetric} | ${claim.requirementIds.join(", ")} |`,
    ),
    "",
    "## Requirement Rows",
    "",
    "| Requirement | Kind | QNT modeled | QNT proved | Runtime mapped | Runtime tested | Runtime parity | Evidence | Follow-up |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...matrix.requirements.map(
      (requirement) =>
        `| ${requirement.id} | ${requirement.coverageKind} | ${requirement.qntModeled ? "yes" : "no"} | ${
          requirement.qntProved ? "yes" : "no"
        } | ${requirement.runtimeMapped ? "yes" : "no"} | ${
          requirement.runtimeTested ? "yes" : "no"
        } | ${
          requirement.runtimeParityCovered ? "yes" : "no"
        } | ${requirement.evidenceClaims.join(", ")} | ${requirement.trackerClaims.join(", ")} |`,
    ),
    "",
    "## Out Of Promoted Scope",
    "",
    ...matrix.outOfScope
      .slice(0, 200)
      .map(
        (span) =>
          `- ${span.spanId} (${span.source.path} > ${span.source.headingPath.join(" > ")}): ${span.reason}`,
      ),
    ...(matrix.outOfScope.length > 200
      ? [
          `- ... ${matrix.outOfScope.length - 200} additional out-of-scope spans omitted from the Markdown report; see matrix.json.`,
        ]
      : []),
    "",
    "## Ambiguous",
    "",
    ...(matrix.ambiguous.length === 0
      ? ["- None"]
      : matrix.ambiguous.map(
          (span) =>
            `- ${span.spanId} (${span.source.path} > ${span.source.headingPath.join(" > ")}): ${span.assumptionId}`,
        )),
    "",
  ];
  return `${lines.join("\n")}`;
}

function assertThrowsWith(label, fn, expectedMessage) {
  try {
    fn();
  } catch (error) {
    if (error.message.includes(expectedMessage)) return;
    fail(`${label} threw the wrong error: ${error.message}`);
  }
  fail(`${label} did not throw.`);
}

function withFixtureRoot(fn) {
  const fixtureRoot = fs.mkdtempSync(
    path.join(root, ".raw-coverage-check-fixture-"),
  );
  try {
    childProcess.execFileSync("git", ["init", "--quiet"], {
      cwd: fixtureRoot,
    });
    fs.mkdirSync(path.join(fixtureRoot, "packages/proofs"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(fixtureRoot, "packages/runtime/src"), {
      recursive: true,
    });
    fn(fixtureRoot);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

function runFixtureGit(fixtureRoot, gitArguments) {
  return childProcess.execFileSync("git", gitArguments, {
    cwd: fixtureRoot,
    encoding: "utf8",
  });
}

function assertClaimDiscovered(claims, expected, label) {
  if (
    !claims.some(
      (claim) =>
        claim.ownerPath === expected.ownerPath &&
        claim.kind === expected.kind &&
        claim.requirementId === expected.requirementId,
    )
  ) {
    fail(`${label} was not discovered.`);
  }
}

function writeFixtureVerificationClaims(fixtureRoot) {
  fs.writeFileSync(
    path.join(fixtureRoot, "packages/proofs/owner-proof.qnt"),
    "// RAW-COVERAGE: verification-owner:qnt-proof RAW-FIXTURE-001\n",
  );
  fs.writeFileSync(
    path.join(fixtureRoot, "packages/runtime/src/owner.mbt.test.ts"),
    "// RAW-COVERAGE: verification-owner:focused-mbt RAW-FIXTURE-001\n",
  );
  fs.writeFileSync(
    path.join(fixtureRoot, "packages/runtime/src/owner.test.ts"),
    "// RAW-COVERAGE: verification-owner:runtime-test RAW-FIXTURE-001\n",
  );
}

function runSelfTests() {
  const baseRequirement = {
    id: "RAW-FIXTURE-001",
    qntOwners: ["packages/proofs/owner.qnt"],
    runtimeOwners: ["packages/runtime/src/owner.ts"],
    verificationOwners: [
      {
        kind: "qnt-proof",
        ownerPath: "packages/proofs/owner-proof.qnt",
      },
      {
        kind: "focused-mbt",
        ownerPath: "packages/runtime/src/owner.mbt.test.ts",
      },
      {
        kind: "runtime-test",
        ownerPath: "packages/runtime/src/owner.test.ts",
      },
    ],
  };

  withFixtureRoot((fixtureRoot) => {
    fs.writeFileSync(
      path.join(fixtureRoot, "packages/proofs/owner.qnt"),
      "// RAW-COVERAGE: qnt-owner RAW-FIXTURE-001\n",
    );
    fs.writeFileSync(
      path.join(fixtureRoot, "packages/runtime/src/owner.ts"),
      "// RAW-COVERAGE: runtime-owner RAW-FIXTURE-001\n",
    );
    writeFixtureVerificationClaims(fixtureRoot);
    fs.writeFileSync(path.join(fixtureRoot, ".gitignore"), "coverage_tmp*/\n");
    fs.mkdirSync(
      path.join(fixtureRoot, "packages/runtime/coverage_tmp_current"),
    );
    fs.writeFileSync(
      path.join(
        fixtureRoot,
        "packages/runtime/coverage_tmp_current/owner.ts.html",
      ),
      "// RAW-COVERAGE: runtime-owner RAW-IGNORED-GENERATED-001\n",
    );
    runFixtureGit(fixtureRoot, ["add", ".gitignore", "packages"]);
    validateRawCoverageOwnerClaims([baseRequirement], fixtureRoot);
  });

  withFixtureRoot((fixtureRoot) => {
    const infoExcludedOwnerPath = "packages/runtime/src/info-excluded-owner.ts";
    const globalExcludedOwnerPath =
      "packages/runtime/src/global-excluded-owner.ts";
    fs.writeFileSync(
      path.join(fixtureRoot, ".git/info/exclude"),
      "info-excluded-owner.ts\n",
    );
    const globalExcludesPath = path.join(
      fixtureRoot,
      "controlled-global-excludes",
    );
    fs.writeFileSync(globalExcludesPath, "global-excluded-owner.ts\n");
    runFixtureGit(fixtureRoot, [
      "config",
      "core.excludesFile",
      globalExcludesPath,
    ]);
    fs.writeFileSync(
      path.join(fixtureRoot, infoExcludedOwnerPath),
      "// RAW-COVERAGE: runtime-owner RAW-INFO-EXCLUDED-001\n",
    );
    fs.writeFileSync(
      path.join(fixtureRoot, globalExcludedOwnerPath),
      "// RAW-COVERAGE: runtime-owner RAW-GLOBAL-EXCLUDED-001\n",
    );
    const claims = scanRawCoverageClaims(fixtureRoot);
    assertClaimDiscovered(
      claims,
      {
        ownerPath: infoExcludedOwnerPath,
        kind: "runtime-owner",
        requirementId: "RAW-INFO-EXCLUDED-001",
      },
      "Claim hidden by .git/info/exclude",
    );
    assertClaimDiscovered(
      claims,
      {
        ownerPath: globalExcludedOwnerPath,
        kind: "runtime-owner",
        requirementId: "RAW-GLOBAL-EXCLUDED-001",
      },
      "Claim hidden by core.excludesFile",
    );
  });

  withFixtureRoot((fixtureRoot) => {
    const trackedOwnerPath = "packages/runtime/src/tracked-owner.ts";
    const untrackedOwnerPath = "packages/runtime/src/untracked-owner.ts";
    fs.writeFileSync(
      path.join(fixtureRoot, trackedOwnerPath),
      "// RAW-COVERAGE: runtime-owner RAW-LINKED-TRACKED-001\n",
    );
    runFixtureGit(fixtureRoot, ["add", trackedOwnerPath]);
    runFixtureGit(fixtureRoot, [
      "-c",
      "user.name=RAW Coverage Self-Test",
      "-c",
      "user.email=raw-coverage-self-test@example.invalid",
      "-c",
      "commit.gpgsign=false",
      "-c",
      "core.hooksPath=/dev/null",
      "commit",
      "--quiet",
      "-m",
      "fixture",
    ]);
    const linkedWorktreeRoot = path.join(fixtureRoot, "linked-worktree");
    runFixtureGit(fixtureRoot, [
      "worktree",
      "add",
      "--quiet",
      "--detach",
      linkedWorktreeRoot,
      "HEAD",
    ]);
    try {
      fs.writeFileSync(
        path.join(linkedWorktreeRoot, untrackedOwnerPath),
        "// RAW-COVERAGE: runtime-owner RAW-LINKED-UNTRACKED-001\n",
      );
      const claims = scanRawCoverageClaims(linkedWorktreeRoot);
      assertClaimDiscovered(
        claims,
        {
          ownerPath: trackedOwnerPath,
          kind: "runtime-owner",
          requirementId: "RAW-LINKED-TRACKED-001",
        },
        "Tracked claim in linked worktree",
      );
      assertClaimDiscovered(
        claims,
        {
          ownerPath: untrackedOwnerPath,
          kind: "runtime-owner",
          requirementId: "RAW-LINKED-UNTRACKED-001",
        },
        "Untracked claim in linked worktree",
      );
    } finally {
      runFixtureGit(fixtureRoot, [
        "worktree",
        "remove",
        "--force",
        linkedWorktreeRoot,
      ]);
    }
  });

  withFixtureRoot((fixtureRoot) => {
    fs.writeFileSync(
      path.join(fixtureRoot, "packages/proofs/owner.qnt"),
      "// RAW-COVERAGE: qnt-owner RAW-FIXTURE-MISSING\n",
    );
    fs.writeFileSync(
      path.join(fixtureRoot, "packages/runtime/src/owner.ts"),
      "// RAW-COVERAGE: runtime-owner RAW-FIXTURE-001\n",
    );
    writeFixtureVerificationClaims(fixtureRoot);
    assertThrowsWith(
      "unknown requirement claim",
      () => {
        validateRawCoverageOwnerClaims([baseRequirement], fixtureRoot);
      },
      "unknown RAW requirement RAW-FIXTURE-MISSING",
    );
  });

  withFixtureRoot((fixtureRoot) => {
    fs.writeFileSync(path.join(fixtureRoot, "packages/proofs/owner.qnt"), "\n");
    fs.writeFileSync(
      path.join(fixtureRoot, "packages/runtime/src/owner.ts"),
      "// RAW-COVERAGE: runtime-owner RAW-FIXTURE-001\n",
    );
    writeFixtureVerificationClaims(fixtureRoot);
    assertThrowsWith(
      "missing reverse qnt claim",
      () => {
        validateRawCoverageOwnerClaims([baseRequirement], fixtureRoot);
      },
      "does not cite it with RAW-COVERAGE: qnt-owner",
    );
  });

  const requirementsById = new Map([[baseRequirement.id, baseRequirement]]);
  const validEvidenceClaim = {
    evidenceId: "FIXTURE-PROOF",
    coverageMetric: "qnt-proof",
    ownerPath: "packages/proofs/owner-proof.qnt",
    requirementIds: [baseRequirement.id],
  };
  const validateEvidenceClaims = (rows) =>
    validateCoverageClaimRows({
      rows,
      identityField: "evidenceId",
      allowedMetrics: evidenceCoverageMetrics,
      requirementsById,
      claimKind: "evidence",
      metricVerificationOwnerKinds: evidenceMetricVerificationOwnerKinds,
    });
  validateEvidenceClaims([validEvidenceClaim]);
  validateCoverageClaimRows({
    rows: [
      {
        trackerId: "GH-351",
        coverageMetric: "missing-qnt-owner",
        requirementIds: [baseRequirement.id],
      },
    ],
    identityField: "trackerId",
    allowedMetrics: trackerCoverageMetrics,
    requirementsById,
    claimKind: "tracker",
  });

  const invalidEvidenceClaims = [
    {
      label: "empty evidence identity",
      rows: [{ ...validEvidenceClaim, evidenceId: "" }],
      message: "evidenceId must be a non-empty string",
    },
    {
      label: "duplicate evidence identity",
      rows: [validEvidenceClaim, validEvidenceClaim],
      message: "evidence claim identity FIXTURE-PROOF is duplicated",
    },
    {
      label: "unknown evidence metric",
      rows: [{ ...validEvidenceClaim, coverageMetric: "done" }],
      message: "coverageMetric has unknown value done",
    },
    {
      label: "missing evidence owner path",
      rows: [{ ...validEvidenceClaim, ownerPath: "" }],
      message: "ownerPath must be a non-empty string",
    },
    {
      label: "empty requirement ids",
      rows: [{ ...validEvidenceClaim, requirementIds: [] }],
      message: "requirementIds must be a non-empty array",
    },
    {
      label: "duplicate requirement id",
      rows: [
        {
          ...validEvidenceClaim,
          requirementIds: [baseRequirement.id, baseRequirement.id],
        },
      ],
      message: `requirementIds duplicates ${baseRequirement.id}`,
    },
    {
      label: "unknown requirement id",
      rows: [{ ...validEvidenceClaim, requirementIds: ["RAW-UNKNOWN-001"] }],
      message: "references unknown requirement RAW-UNKNOWN-001",
    },
    {
      label: "unknown claim field",
      rows: [{ ...validEvidenceClaim, status: "done" }],
      message: "has unknown fields: status",
    },
    {
      label: "malformed claim row",
      rows: [null],
      message: "must be an object",
    },
  ];
  for (const fixture of invalidEvidenceClaims) {
    assertThrowsWith(
      fixture.label,
      () => validateEvidenceClaims(fixture.rows),
      fixture.message,
    );
  }

  for (const [coverageMetric, requiredOwnerKind] of [
    ["qnt-proof", "qnt-proof"],
    ["runtime-parity", "focused-mbt"],
    ["runtime-test", "runtime-test"],
  ]) {
    const requirementWithoutMetricOwner = {
      ...baseRequirement,
      verificationOwners: baseRequirement.verificationOwners.filter(
        (owner) => owner.kind !== requiredOwnerKind,
      ),
    };
    assertThrowsWith(
      `${coverageMetric} evidence owner mismatch`,
      () =>
        validateCoverageClaimRows({
          rows: [{ ...validEvidenceClaim, coverageMetric }],
          identityField: "evidenceId",
          allowedMetrics: evidenceCoverageMetrics,
          requirementsById: new Map([
            [requirementWithoutMetricOwner.id, requirementWithoutMetricOwner],
          ]),
          claimKind: "evidence",
          metricVerificationOwnerKinds: evidenceMetricVerificationOwnerKinds,
        }),
      `metric ${coverageMetric} requires ${baseRequirement.id} to have exact verification owner ${requiredOwnerKind}:${validEvidenceClaim.ownerPath}`,
    );
  }
}

function main() {
  try {
    if (selfTest) {
      runSelfTests();
      console.log("RAW coverage checker self-test OK.");
      return;
    }

    const matrix = buildMatrix();
    const report = renderReport(matrix);

    if (write) {
      fs.writeFileSync(paths.matrix, `${JSON.stringify(matrix, null, 2)}\n`);
      fs.writeFileSync(paths.report, report);
    } else {
      assertDeepEqual(
        readJson(paths.matrix),
        matrix,
        "plans/raw-coverage/matrix.json",
      );
      const existingReport = fs.readFileSync(paths.report, "utf8");
      if (existingReport !== report) {
        fail(
          "plans/raw-coverage/REPORT.md is stale. Run node scripts/raw-coverage-check.cjs --write to refresh it.",
        );
      }
    }

    console.log(
      `RAW coverage tracer OK: ${matrix.summary.classifiedSpans}/${matrix.summary.generatedSpans} spans classified, ` +
        `${matrix.summary.closedNonFluffSpans}/${matrix.summary.nonFluffSpans} non-fluff spans closed.`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { scanRawCoverageClaims, validateRawCoverageOwnerClaims };

if (require.main === module) main();
