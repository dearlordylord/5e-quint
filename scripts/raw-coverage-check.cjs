#!/usr/bin/env node

const crypto = require("node:crypto");
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
  taskClaims: path.join(rawCoverageDir, "task-claims.jsonl"),
  matrix: path.join(rawCoverageDir, "matrix.json"),
  report: path.join(rawCoverageDir, "REPORT.md"),
  activePlan: path.join(root, "plans/ACTIVE_PLAN.md"),
};

const executableClassifications = new Set([
  "rule-procedure",
  "rule-guard",
  "rule-consequence",
  "table-caller-responsibility",
]);
const domainClassifications = new Set([
  "definition",
  "rule-procedure",
  "rule-guard",
  "rule-consequence",
  "authored-data",
  "table-caller-responsibility",
]);
const closedOutOfScopeClassifications = new Set([
  "unsupported-out-of-promoted-scope",
]);
const rawCoverageClaimKinds = new Set([
  "qnt-owner",
  "runtime-owner",
  "verification-owner:qnt-proof",
  "verification-owner:focused-mbt",
  "verification-owner:runtime-test",
  "verification-owner:doc",
]);
const skippedClaimScanDirs = new Set([
  ".git",
  ".turbo",
  "coverage",
  "dist",
  "node_modules",
  "test-results",
]);

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
        fail(`${path.relative(root, filePath)}:${index + 1} is not valid JSON: ${error.message}`);
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
      if (entry.isFile() && entry.name.endsWith(".md")) return [entryPath];
      return [];
    })
    .sort();
}

function sectionPathId(sourcePath) {
  return slug(sourcePath.replace(/^\.references\/srd-5\.2\.1\//, "").replace(/\.md$/, ""));
}

function generatedSectionForHeading(sourcePath, headingPath, headingLine, lineNumber) {
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
  return text.match(/[^.!?]+[.!?](?=$| )/g)?.map((span) => span.trim()) ?? [text.trim()];
}

function generateSectionSpans(section) {
  const sourcePath = path.join(root, section.path);
  const lines = fs.readFileSync(sourcePath, "utf8").split("\n");
  const startIndex = lines.findIndex((line, index) => index + 1 >= section.startLine && line === section.headingLine);
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
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function assertDeepEqual(actual, expected, label) {
  const actualJson = JSON.stringify(stable(actual), null, 2);
  const expectedJson = JSON.stringify(stable(expected), null, 2);
  if (actualJson !== expectedJson) {
    fail(`${label} is stale. Run node scripts/raw-coverage-check.cjs --write to refresh it.`);
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

function walkClaimCandidateFiles(dirPath, scanRoot = root, files = []) {
  if (!fs.existsSync(dirPath)) return files;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!skippedClaimScanDirs.has(entry.name)) {
        walkClaimCandidateFiles(path.join(dirPath, entry.name), scanRoot, files);
      }
      continue;
    }
    if (entry.isFile()) files.push(path.join(dirPath, entry.name));
  }
  return files;
}

function parseRawCoverageClaimsFromText(text, ownerPath) {
  return text.split("\n").flatMap((line, lineIndex) => {
    const match = line.match(/RAW-COVERAGE:\s+([a-z-]+(?::[a-z-]+)?)\s+(.+)$/);
    if (!match) return [];
    const kind = match[1];
    const requirementIds = match[2].trim().split(/\s+/);
    if (!rawCoverageClaimKinds.has(kind)) {
      fail(`${ownerPath}:${lineIndex + 1} uses unknown RAW-COVERAGE claim kind ${kind}.`);
    }
    return requirementIds.map((requirementId) => {
      if (!/^RAW-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(requirementId)) {
        fail(`${ownerPath}:${lineIndex + 1} has invalid RAW requirement id ${requirementId}.`);
      }
      return { ownerPath, line: lineIndex + 1, kind, requirementId };
    });
  });
}

function scanRawCoverageClaims(scanRoot = root) {
  const sourceDirs = ["packages", "plans"].map((name) => path.join(scanRoot, name));
  return sourceDirs.flatMap((sourceDir) =>
    walkClaimCandidateFiles(sourceDir, scanRoot).flatMap((filePath) => {
      const text = fs.readFileSync(filePath, "utf8");
      return parseRawCoverageClaimsFromText(text, toRepoPath(filePath, scanRoot));
    }),
  );
}

function claimKey(ownerPath, kind, requirementId) {
  return `${ownerPath}\u0000${kind}\u0000${requirementId}`;
}

function requirementIdsForAnnotation(annotation) {
  if (annotation.closure?.tag === "requirement") return annotation.closure.requirementIds ?? [];
  return annotation.requirementIds ?? [];
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
  if (annotation.closure?.tag === "closed-by-assumption") return annotation.closure.assumptionId;
  return annotation.assumptionId;
}

function annotationNeedsAssumption(annotation) {
  return (
    annotation.classification === "ambiguous-needs-assumption" ||
    annotation.closure?.tag === "needs-assumption"
  );
}

function validateRawCoverageOwnerClaims(requirements, scanRoot = root) {
  const requirementsById = new Map(requirements.map((requirement) => [requirement.id, requirement]));
  const claims = scanRawCoverageClaims(scanRoot);
  const claimsByKey = new Set(
    claims.map((claim) => claimKey(claim.ownerPath, claim.kind, claim.requirementId)),
  );

  for (const claim of claims) {
    const requirement = requirementsById.get(claim.requirementId);
    if (!requirement) {
      fail(`${claim.ownerPath}:${claim.line} cites unknown RAW requirement ${claim.requirementId}.`);
    }
    if (
      claim.kind === "qnt-owner" &&
      !(requirement.qntOwners ?? []).includes(claim.ownerPath)
    ) {
      fail(`${claim.ownerPath}:${claim.line} cites ${claim.requirementId} as qnt-owner, but requirements.jsonl does not list that owner.`);
    }
    if (
      claim.kind === "runtime-owner" &&
      !(requirement.runtimeOwners ?? []).includes(claim.ownerPath)
    ) {
      fail(`${claim.ownerPath}:${claim.line} cites ${claim.requirementId} as runtime-owner, but requirements.jsonl does not list that owner.`);
    }
    if (claim.kind.startsWith("verification-owner:")) {
      const verificationKind = claim.kind.slice("verification-owner:".length);
      if (
        !(requirement.verificationOwners ?? []).some(
          (owner) => owner.kind === verificationKind && owner.ownerPath === claim.ownerPath,
        )
      ) {
        fail(`${claim.ownerPath}:${claim.line} cites ${claim.requirementId} as ${claim.kind}, but requirements.jsonl does not list that verification owner.`);
      }
    }
  }

  for (const requirement of requirements) {
    for (const ownerPath of requirement.qntOwners ?? []) {
      if (!claimsByKey.has(claimKey(ownerPath, "qnt-owner", requirement.id))) {
        fail(`${requirement.id} lists qnt owner ${ownerPath}, but that artifact does not cite it with RAW-COVERAGE: qnt-owner.`);
      }
    }
    for (const ownerPath of requirement.runtimeOwners ?? []) {
      if (!claimsByKey.has(claimKey(ownerPath, "runtime-owner", requirement.id))) {
        fail(`${requirement.id} lists runtime owner ${ownerPath}, but that artifact does not cite it with RAW-COVERAGE: runtime-owner.`);
      }
    }
    for (const owner of requirement.verificationOwners ?? []) {
      const kind = `verification-owner:${owner.kind}`;
      if (!claimsByKey.has(claimKey(owner.ownerPath, kind, requirement.id))) {
        fail(`${requirement.id} lists ${owner.kind} verification owner ${owner.ownerPath}, but that artifact does not cite it with RAW-COVERAGE: ${kind}.`);
      }
    }
  }
}

function activePlanTaskStatuses() {
  const raw = fs.readFileSync(paths.activePlan, "utf8");
  const statuses = new Map();
  const regex = /### Task \d+ - ([A-Z0-9]+) - [^\n]+\n\nStatus: `([^`]+)`/g;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    statuses.set(match[1], match[2]);
  }
  return statuses;
}

function buildMatrix() {
  const sections = readSections();
  const annotations = readJsonl(paths.annotations);
  const requirements = readJsonl(paths.requirements);
  const rawReviews = readJsonl(paths.rawReviews);
  const taskClaims = readJsonl(paths.taskClaims);
  const generatedSpans = sections.flatMap(generateSectionSpans);

  const sectionsById = new Map(sections.map((section) => [section.sectionId, section]));
  const generatedById = new Map(generatedSpans.map((span) => [span.spanId, span]));
  const annotationsById = new Map(annotations.map((span) => [span.spanId, span]));
  const requirementsById = new Map(requirements.map((requirement) => [requirement.id, requirement]));
  const rawReviewsBySectionId = new Map(rawReviews.map((review) => [review.sectionId, review]));
  const taskStatuses = activePlanTaskStatuses();

  for (const section of sections) {
    if (!section.spanIdPrefix) fail(`Section ${section.sectionId} must define spanIdPrefix.`);
    const review = rawReviewsBySectionId.get(section.sectionId);
    if (!review) fail(`Section ${section.sectionId} is missing a RAW review.`);
    if (review.reviewer !== "raw-review-agent") {
      fail(`Section ${section.sectionId} RAW review must be recorded by raw-review-agent.`);
    }
    if (review.verdict !== "pass") {
      fail(`Section ${section.sectionId} RAW review verdict must be pass.`);
    }
    if (!Array.isArray(review.sourcesChecked) || !review.sourcesChecked.includes(section.path)) {
      fail(`Section ${section.sectionId} RAW review must cite ${section.path}.`);
    }
    if (
      !Array.isArray(review.sourcesChecked) ||
      !review.sourcesChecked.includes("UBIQUITOUS_LANGUAGE.md")
    ) {
      fail(`Section ${section.sectionId} RAW review must cite UBIQUITOUS_LANGUAGE.md.`);
    }
  }

  for (const review of rawReviews) {
    if (!sectionsById.has(review.sectionId)) {
      fail(`RAW review references unknown section ${review.sectionId}.`);
    }
  }

  for (const generated of generatedSpans) {
    const annotation = annotationsById.get(generated.spanId);
    if (!annotation) fail(`Generated span is unclassified: ${generated.spanId}`);
    if (annotation.source) {
      assertDeepEqual(annotation.source, generated.source, `Annotation source for ${generated.spanId}`);
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
    if (!generatedById.has(annotation.spanId)) fail(`Annotation references unknown generated span: ${annotation.spanId}`);
    if (!annotation.classification) fail(`Annotation ${annotation.spanId} has no classification.`);
    const requirementIds = requirementIdsForAnnotation(annotation);
    if (domainClassifications.has(annotation.classification)) {
      if (
        requirementIds.length === 0 &&
        !annotationIsOutOfScope(annotation) &&
        !annotationAssumptionId(annotation) &&
        !annotationNeedsAssumption(annotation)
      ) {
        fail(`Domain span ${annotation.spanId} must cite requirements or carry a closure disposition.`);
      }
    }
    if (annotationIsOutOfScope(annotation) && typeof annotationOutOfScopeReason(annotation) !== "string") {
      fail(`Out-of-promoted-scope span ${annotation.spanId} must carry a reason.`);
    }
    if (annotation.classification === "fluff" && requirementIds.length > 0) {
      fail(`Fluff span ${annotation.spanId} must not cite requirements.`);
    }
    for (const requirementId of requirementIds) {
      if (!requirementsById.has(requirementId)) {
        fail(`Annotation ${annotation.spanId} references unknown requirement ${requirementId}.`);
      }
    }
  }

  for (const requirement of requirements) {
    if (!Array.isArray(requirement.sourceSpanIds) || requirement.sourceSpanIds.length === 0) {
      fail(`Requirement ${requirement.id} must cite source spans.`);
    }
    for (const spanId of requirement.sourceSpanIds) {
      const annotation = annotationsById.get(spanId);
      if (!annotation) fail(`Requirement ${requirement.id} references unknown span ${spanId}.`);
      if (!requirementIdsForAnnotation(annotation).includes(requirement.id)) {
        fail(`Requirement ${requirement.id} source span ${spanId} does not cite it back.`);
      }
    }
    for (const ownerPath of requirement.qntOwners ?? []) validateOwnerPath(ownerPath, requirement.id);
    for (const ownerPath of requirement.runtimeOwners ?? []) validateOwnerPath(ownerPath, requirement.id);
    for (const owner of requirement.verificationOwners ?? []) validateOwnerPath(owner.ownerPath, requirement.id);
  }
  validateRawCoverageOwnerClaims(requirements);

  for (const taskClaim of taskClaims) {
    if (!taskStatuses.has(taskClaim.taskId)) {
      fail(`Task claim references unknown ACTIVE_PLAN task ${taskClaim.taskId}.`);
    }
    for (const requirementId of taskClaim.requirementIds) {
      if (!requirementsById.has(requirementId)) {
        fail(`Task claim ${taskClaim.taskId} references unknown requirement ${requirementId}.`);
      }
    }
    for (const evidence of taskClaim.evidence ?? []) validateOwnerPath(evidence.ownerPath, taskClaim.taskId);
  }

  const executableRequirements = requirements.filter((requirement) => requirement.coverageKind === "executable");
  const qntModeled = executableRequirements.filter((requirement) => requirement.qntOwners.length > 0);
  const qntProved = executableRequirements.filter((requirement) =>
    requirement.verificationOwners.some((owner) => owner.kind === "qnt-proof"),
  );
  const runtimeMapped = executableRequirements.filter((requirement) => requirement.runtimeOwners.length > 0);
  const runtimeParityCovered = executableRequirements.filter((requirement) =>
    requirement.verificationOwners.some((owner) => owner.kind === "focused-mbt" || owner.kind === "runtime-test"),
  );
  const nonFluffAnnotations = annotations.filter((annotation) => annotation.classification !== "fluff");
  const outOfScopeAnnotations = annotations.filter(annotationIsOutOfScope);
  const ambiguousAnnotations = annotations.filter(annotationNeedsAssumption);
  const closedNonFluffAnnotations = nonFluffAnnotations.filter((annotation) => {
    if (requirementIdsForAnnotation(annotation).length > 0) return true;
    if (annotationAssumptionId(annotation)) return true;
    if (annotationIsOutOfScope(annotation) && annotationOutOfScopeReason(annotation)) return true;
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
      fluffSpans: annotations.filter((annotation) => annotation.classification === "fluff").length,
      nonFluffSpans: nonFluffAnnotations.length,
      closedNonFluffSpans: closedNonFluffAnnotations.length,
      requirements: requirements.length,
      executableRequirements: executableRequirements.length,
      qntModeled: qntModeled.length,
      qntProved: qntProved.length,
      runtimeMapped: runtimeMapped.length,
      runtimeParityCovered: runtimeParityCovered.length,
      outOfScopeSpans: outOfScopeAnnotations.length,
      ambiguousSpans: ambiguousAnnotations.length,
      rawReviewedSections: rawReviews.filter((review) => review.verdict === "pass").length,
    },
    rawReviews: rawReviews.map((review) => ({
      sectionId: review.sectionId,
      reviewer: review.reviewer,
      verdict: review.verdict,
      sourcesChecked: review.sourcesChecked,
    })),
    activePlanTasks: taskClaims.map((taskClaim) => ({
      taskId: taskClaim.taskId,
      status: taskStatuses.get(taskClaim.taskId),
      requirementIds: taskClaim.requirementIds,
    })),
    requirements: requirements.map((requirement) => ({
      id: requirement.id,
      title: requirement.title,
      coverageKind: requirement.coverageKind,
      sourceSpanIds: requirement.sourceSpanIds,
      qntModeled: requirement.qntOwners.length > 0,
      qntProved: requirement.verificationOwners.some((owner) => owner.kind === "qnt-proof"),
      runtimeMapped: requirement.runtimeOwners.length > 0,
      runtimeParityCovered: requirement.verificationOwners.some(
        (owner) => owner.kind === "focused-mbt" || owner.kind === "runtime-test",
      ),
      activePlanTasks: taskClaims
        .filter((taskClaim) => taskClaim.requirementIds.includes(requirement.id))
        .map((taskClaim) => taskClaim.taskId),
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
    ...matrix.tracer.source.slice(0, 200).map((source) => `- ${renderSource(source)}`),
    ...(matrix.tracer.source.length > 200
      ? [`- ... ${matrix.tracer.source.length - 200} additional sections omitted from the Markdown report; see matrix.json.`]
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
    "## Active Plan Tasks",
    "",
    "| Task | Status | Requirements |",
    "| --- | --- | --- |",
    ...matrix.activePlanTasks.map(
      (task) => `| ${task.taskId} | ${task.status} | ${task.requirementIds.join(", ")} |`,
    ),
    "",
    "## Requirement Rows",
    "",
    "| Requirement | Kind | QNT modeled | QNT proved | Runtime mapped | Runtime parity | Active tasks |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...matrix.requirements.map(
      (requirement) =>
        `| ${requirement.id} | ${requirement.coverageKind} | ${requirement.qntModeled ? "yes" : "no"} | ${
          requirement.qntProved ? "yes" : "no"
        } | ${requirement.runtimeMapped ? "yes" : "no"} | ${
          requirement.runtimeParityCovered ? "yes" : "no"
        } | ${requirement.activePlanTasks.join(", ")} |`,
    ),
    "",
    "## Out Of Promoted Scope",
    "",
    ...matrix.outOfScope.slice(0, 200).map(
      (span) =>
        `- ${span.spanId} (${span.source.path} > ${span.source.headingPath.join(" > ")}): ${span.reason}`,
    ),
    ...(matrix.outOfScope.length > 200
      ? [`- ... ${matrix.outOfScope.length - 200} additional out-of-scope spans omitted from the Markdown report; see matrix.json.`]
      : []),
    "",
    "## Ambiguous",
    "",
    ...(
      matrix.ambiguous.length === 0
        ? ["- None"]
        : matrix.ambiguous.map(
            (span) =>
              `- ${span.spanId} (${span.source.path} > ${span.source.headingPath.join(" > ")}): ${span.assumptionId}`,
          )
    ),
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
  const fixtureRoot = fs.mkdtempSync(path.join(root, ".raw-coverage-check-fixture-"));
  try {
    fs.mkdirSync(path.join(fixtureRoot, "packages/proofs"), { recursive: true });
    fs.mkdirSync(path.join(fixtureRoot, "packages/runtime/src"), { recursive: true });
    fn(fixtureRoot);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

function runSelfTests() {
  const baseRequirement = {
    id: "RAW-FIXTURE-001",
    qntOwners: ["packages/proofs/owner.qnt"],
    runtimeOwners: ["packages/runtime/src/owner.ts"],
    verificationOwners: [
      { kind: "focused-mbt", ownerPath: "packages/runtime/src/owner.mbt.test.ts" },
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
    fs.writeFileSync(
      path.join(fixtureRoot, "packages/runtime/src/owner.mbt.test.ts"),
      "// RAW-COVERAGE: verification-owner:focused-mbt RAW-FIXTURE-001\n",
    );
    validateRawCoverageOwnerClaims([baseRequirement], fixtureRoot);
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
    fs.writeFileSync(
      path.join(fixtureRoot, "packages/runtime/src/owner.mbt.test.ts"),
      "// RAW-COVERAGE: verification-owner:focused-mbt RAW-FIXTURE-001\n",
    );
    assertThrowsWith("unknown requirement claim", () => {
      validateRawCoverageOwnerClaims([baseRequirement], fixtureRoot);
    }, "unknown RAW requirement RAW-FIXTURE-MISSING");
  });

  withFixtureRoot((fixtureRoot) => {
    fs.writeFileSync(path.join(fixtureRoot, "packages/proofs/owner.qnt"), "\n");
    fs.writeFileSync(
      path.join(fixtureRoot, "packages/runtime/src/owner.ts"),
      "// RAW-COVERAGE: runtime-owner RAW-FIXTURE-001\n",
    );
    fs.writeFileSync(
      path.join(fixtureRoot, "packages/runtime/src/owner.mbt.test.ts"),
      "// RAW-COVERAGE: verification-owner:focused-mbt RAW-FIXTURE-001\n",
    );
    assertThrowsWith("missing reverse qnt claim", () => {
      validateRawCoverageOwnerClaims([baseRequirement], fixtureRoot);
    }, "does not cite it with RAW-COVERAGE: qnt-owner");
  });
}

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
    assertDeepEqual(readJson(paths.matrix), matrix, "plans/raw-coverage/matrix.json");
    const existingReport = fs.readFileSync(paths.report, "utf8");
    if (existingReport !== report) {
      fail("plans/raw-coverage/REPORT.md is stale. Run node scripts/raw-coverage-check.cjs --write to refresh it.");
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
