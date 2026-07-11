#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { intake, measure } = require("./cleanroom-intake.cjs");

const SOURCE_ROOT = path.resolve(__dirname, "..");
const ARTIFACT_ROOT = "plans/ralph-artifacts/l12-cleanroom-ice-knife-pilot";

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function renderPrompt({
  catalog,
  targetRoot,
  evidenceRoot,
  receipt,
  resultPath,
  measurementPath,
  promptPath,
  recommendationPath,
  convergencePath,
  runId,
}) {
  const planPaths = [
    "plans/RALPH_L12_CLEANROOM_ICE_KNIFE_PILOT.md",
    "plans/RALPH_L12_CLEANROOM_GUIDANCE_GENERATOR.md",
    "plans/L12_CLEANROOM_EXPERIMENT_CONTRACT.md",
  ];
  const command = (name, args) =>
    `pnpm ${name} ${args.map((value) => shellQuote(value)).join(" ")}`;
  return `# Fresh source-review agent prompt

You are a fresh source-review agent for the completed Ice Knife cleanroom
experiment. Do not resume either Ralph implementation agent, launch another
target, or treat this receipt as source success. Work only in the source
repository at ${shellQuote(SOURCE_ROOT)}.

## Returned immutable inputs

- Catalog: ${shellQuote(catalog)}
- Target checkout at receipt finish: ${shellQuote(targetRoot)}
- Returned evidence root: ${shellQuote(evidenceRoot)}
- Receipt: ${shellQuote(receipt)}
- Intake result: ${shellQuote(resultPath)}
- Measurement report: ${shellQuote(measurementPath)}
- Ralph run id: ${runId ? shellQuote(runId) : "unavailable"}

The intake/status commands already require the evidence root to contain
exactly the receipt's declared retained artifacts and evidence references, with
matching SHA-256 values. Re-run them as the first fresh-agent action:

\`\`\`sh
${command("cleanroom:status:l12-ice-knife", [
  "--",
  "--catalog",
  catalog,
  "--target-root",
  targetRoot,
  "--evidence-root",
  evidenceRoot,
  "--receipt",
  receipt,
  "--intake-result",
  resultPath,
])}
${command("cleanroom:intake:l12-ice-knife", [
  "--",
  "--catalog",
  catalog,
  "--target-root",
  targetRoot,
  "--evidence-root",
  evidenceRoot,
  "--receipt",
  receipt,
  "--output",
  resultPath,
])}
${command("cleanroom:measure:l12-ice-knife", [
  "--",
  "--receipt",
  receipt,
  "--result",
  resultPath,
  ...(runId ? ["--run-id", runId] : []),
  "--output",
  measurementPath,
])}
\`\`\`

## Required convergent reviewer loop

Run exactly these review dimensions in two rounds. Round 2 must re-check every
Round 1 finding and may close only when it introduces no new reasonable
finding. Record each finding, disposition, and evidence in
${shellQuote(convergencePath)}:

1. Round 1: RAW and ubiquitous-language traceability, QNT/branch/parity,
   architecture and connascence, contamination/freshness, and code review.
2. Round 2: repeat all five dimensions, verify the Round 1 dispositions, and
   record convergence or the remaining blocker.

Compare both scope plans with the canonical shared contract:

\`\`\`sh
git diff --no-index -- ${planPaths
    .slice(0, 2)
    .map((plan) => shellQuote(plan))
    .join(" ")} || true
git diff --no-index -- ${shellQuote(planPaths[0])} ${shellQuote(planPaths[2])} || true
git diff --no-index -- ${shellQuote(planPaths[1])} ${shellQuote(planPaths[2])} || true
\`\`\`

Write source-review recommendations to ${shellQuote(recommendationPath)}.
Shared-rule findings update the canonical contract once; scaling or corpus
findings update only the full-plan recommendations. Do not claim real target
success. The derived transition must be exactly one of target-goal,
fresh-source-review, or full-plan-revision, as reported by status.

## Exact fresh-agent invocation

From the source repository, run:

\`\`\`sh
codex exec --full-auto --cd ${shellQuote(SOURCE_ROOT)} < ${shellQuote(promptPath)}
\`\`\`
`;
}

function option(argv, name) {
  const index = argv.indexOf(name);
  if (index < 0) return undefined;
  const value = argv[index + 1];
  if (!value || value.startsWith("--"))
    throw new Error(`${name} requires a value`);
  return value;
}

function main(argv) {
  const catalog = option(argv, "--catalog");
  const targetRoot = option(argv, "--target-root");
  const evidenceRoot = option(argv, "--evidence-root");
  const receipt = option(argv, "--receipt");
  if (!catalog || !targetRoot || !evidenceRoot || !receipt)
    throw new Error(
      "source review requires --catalog, --target-root, --evidence-root, and --receipt",
    );
  const resultPath = path.resolve(
    option(argv, "--result") ??
      "plans/ralph-artifacts/l12-cleanroom-ice-knife-pilot/intake-result.json",
  );
  const measurementPath = path.resolve(
    option(argv, "--measurement") ??
      "plans/ralph-artifacts/l12-cleanroom-ice-knife-pilot/measurement-report.json",
  );
  const runId = option(argv, "--run-id");
  const promptPath = path.resolve(
    option(argv, "--prompt") ?? `${ARTIFACT_ROOT}/source-review-prompt.md`,
  );
  const recommendationPath = path.resolve(
    option(argv, "--recommendations") ??
      `${ARTIFACT_ROOT}/source-review-recommendations.md`,
  );
  const convergencePath = path.resolve(
    option(argv, "--convergence") ??
      `${ARTIFACT_ROOT}/source-review-convergence.md`,
  );
  const result = intake({
    catalogRoot: path.resolve(catalog),
    targetRoot: path.resolve(targetRoot),
    evidenceRoot: path.resolve(evidenceRoot),
    receiptPath: path.resolve(receipt),
    outputPath: resultPath,
  });
  const report = measure({
    receiptPath: path.resolve(receipt),
    resultPath,
    ralphEventsPath: runId
      ? path.resolve(".ralph/runs", runId, "events.tsv")
      : undefined,
    intakeEventsPath: `${resultPath}.events.tsv`,
    outputPath: measurementPath,
  });
  fs.mkdirSync(path.dirname(promptPath), { recursive: true });
  fs.writeFileSync(
    promptPath,
    renderPrompt({
      catalog: path.resolve(catalog),
      targetRoot: path.resolve(targetRoot),
      evidenceRoot: path.resolve(evidenceRoot),
      receipt: path.resolve(receipt),
      resultPath,
      measurementPath,
      promptPath,
      recommendationPath,
      convergencePath,
      runId,
    }),
  );
  process.stdout.write(
    `${JSON.stringify({
      schema: "cleanroom-source-review-handoff.v1",
      resultPath,
      measurementPath,
      promptPath,
      recommendationPath,
      convergencePath,
      evidenceRoot: path.resolve(evidenceRoot),
      outcome: result.outcome,
      nextAction: result.nextAction,
      measurementSchema: report.schema,
      freshAgentInvocation: `codex exec --full-auto --cd ${shellQuote(SOURCE_ROOT)} < ${shellQuote(promptPath)}`,
      reviewerLoopRounds: 2,
      reviewerLoop: [
        "raw-ubiquitous-language",
        "qnt-branch-parity",
        "architecture-connascence",
        "contamination-freshness",
        "code-review",
      ],
      planPaths: [
        "plans/RALPH_L12_CLEANROOM_ICE_KNIFE_PILOT.md",
        "plans/RALPH_L12_CLEANROOM_GUIDANCE_GENERATOR.md",
        "plans/L12_CLEANROOM_EXPERIMENT_CONTRACT.md",
      ],
      instruction:
        "Complete at least two convergent reviewer rounds without resuming either implementation agent; shared-rule findings update the canonical contract once, while scaling or corpus findings update only the full plan.",
    })}\n`,
  );
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`cleanroom source review: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { main };
