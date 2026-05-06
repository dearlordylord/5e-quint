#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const rawCoverageDir = path.join(root, "plans/raw-coverage");
const write = process.argv.includes("--write");

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
    if (line.trim().length === 0) continue;
    if (/^#+\s+/.test(line)) {
      fail(`Unexpected nested heading in tracer section at ${section.path}:${index + 1}.`);
    }
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
  const sections = readJson(paths.sections).sections;
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
    assertDeepEqual(annotation.source, generated.source, `Annotation source for ${generated.spanId}`);
    if (annotation.text !== generated.text) fail(`Annotation text drifted for ${generated.spanId}.`);
  }

  for (const section of sections) {
    const review = rawReviewsBySectionId.get(section.sectionId);
    const sectionSpanIds = generatedSpans
      .filter((span) => span.source.path === section.path && span.source.headingPath.join("\u0000") === section.headingPath.join("\u0000"))
      .map((span) => span.spanId);
    for (const spanId of sectionSpanIds) {
      if (!review.reviewedSpanIds.includes(spanId)) {
        fail(`RAW review for ${section.sectionId} does not cover ${spanId}.`);
      }
    }
  }

  for (const annotation of annotations) {
    if (!generatedById.has(annotation.spanId)) fail(`Annotation references unknown generated span: ${annotation.spanId}`);
    if (!annotation.classification) fail(`Annotation ${annotation.spanId} has no classification.`);
    if (domainClassifications.has(annotation.classification)) {
      if (!Array.isArray(annotation.requirementIds) || annotation.requirementIds.length === 0) {
        fail(`Domain span ${annotation.spanId} must cite at least one requirement id.`);
      }
    }
    if (annotation.classification === "fluff" && annotation.requirementIds?.length > 0) {
      fail(`Fluff span ${annotation.spanId} must not cite requirements.`);
    }
    for (const requirementId of annotation.requirementIds ?? []) {
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
      if (!(annotation.requirementIds ?? []).includes(requirement.id)) {
        fail(`Requirement ${requirement.id} source span ${spanId} does not cite it back.`);
      }
    }
    for (const ownerPath of requirement.qntOwners ?? []) validateOwnerPath(ownerPath, requirement.id);
    for (const ownerPath of requirement.runtimeOwners ?? []) validateOwnerPath(ownerPath, requirement.id);
    for (const owner of requirement.verificationOwners ?? []) validateOwnerPath(owner.ownerPath, requirement.id);
  }

  for (const taskClaim of taskClaims) {
    if (!taskStatuses.has(taskClaim.taskId)) {
      fail(`Task claim references unknown ACTIVE_PLAN task ${taskClaim.taskId}.`);
    }
    for (const requirementId of taskClaim.requirementIds) {
      if (!requirementsById.has(requirementId)) {
        fail(`Task claim ${taskClaim.taskId} references unknown requirement ${requirementId}.`);
      }
    }
    for (const evidence of taskClaim.evidence) validateOwnerPath(evidence.ownerPath, taskClaim.taskId);
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
  const closedNonFluffAnnotations = nonFluffAnnotations.filter((annotation) => {
    if (annotation.requirementIds?.length > 0) return true;
    if (annotation.assumptionId) return true;
    if (annotation.reason) return true;
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
  };
}

function pct(done, total) {
  if (total === 0) return "n/a";
  return `${((done / total) * 100).toFixed(2)}%`;
}

function renderReport(matrix) {
  const s = matrix.summary;
  const lines = [
    "# RAW Coverage Matrix Report",
    "",
    "## Tracer Scope",
    "",
    ...matrix.tracer.source.map(
      (source) => `- ${source.path} > ${source.headingPath.join(" > ")}`,
    ),
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
  ];
  return `${lines.join("\n")}`;
}

try {
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
