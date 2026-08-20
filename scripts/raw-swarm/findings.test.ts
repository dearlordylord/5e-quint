import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import {
  projectRunFindings,
  readFindingsProjection,
  makeFinding,
  validateFindingsProjection,
  writeFindingsProjection,
} from "./findings.ts";
import { renderFindingsAudit } from "./findings-audit.ts";
import { projectGenerationFindings } from "./generation-findings.ts";
import {
  codexOutputJsonSchema,
  CurrentScenarioCompositeReviewSchema,
} from "./scenario-campaign.ts";
import {
  ingestGenerationFindings,
  openArtifactIndex,
} from "./artifact-index.ts";
import { rawSwarmTestOutputDirectory } from "./test-output.ts";
import { isJsonRecord, repoRoot, sha256Canonical } from "./transcript.ts";
import {
  planAdmittedScenarioStages,
  planScenarioStages,
  scenarioStagePlanFindings,
} from "./scenario-stage-plan.ts";

const directories: string[] = [];
const reportScript = resolve(repoRoot, "scripts/raw-swarm/report.ts");

function parseJsonRecord(text: string): Record<string, unknown> {
  const value: unknown = JSON.parse(text);
  if (!isJsonRecord(value)) throw new Error("Expected a JSON object fixture.");
  return value;
}

function parseJsonRecordArray(text: string): Array<Record<string, unknown>> {
  const value: unknown = JSON.parse(text);
  if (!Array.isArray(value) || !value.every(isJsonRecord)) {
    throw new Error("Expected a JSON object array fixture.");
  }
  return value;
}

function directory(): string {
  const value = rawSwarmTestOutputDirectory("findings-test-");
  directories.push(value);
  return value;
}

afterEach(() => {
  for (const value of directories.splice(0)) {
    rmSync(value, { recursive: true, force: true });
  }
});

function fixture() {
  const root = directory();
  const run = resolve(root, "run");
  const evidence = resolve(run, "evidence");
  mkdirSync(evidence, { recursive: true });
  const runStartPath = resolve(evidence, "run-start.json");
  writeFileSync(
    runStartPath,
    `${JSON.stringify({
      type: "raw-swarm-player-run-start",
      schemaVersion: 1,
      scenarioId: "findings-example",
      gitSha: "a".repeat(40),
      startedAt: "2026-08-18T00:00:00.000Z",
    })}\n`,
  );
  const initialSession = { battle: { round: 1 } };
  const outputSession = { battle: { round: 1 } };
  const result = { tag: "resolved" };
  const scenarioBytes = "# Findings scenario\n";
  const scenarioSha256 = createHash("sha256")
    .update(scenarioBytes)
    .digest("hex");
  const scenarioReviewValue = finalScenarioReview({
    scenarioId: "findings-example",
    scenarioSha256,
    gitSha: "a".repeat(40),
  });
  const scenarioReviewBytes = `${JSON.stringify(scenarioReviewValue, null, 2)}\n`;
  const scenarioReviewSha256 = createHash("sha256")
    .update(scenarioReviewBytes)
    .digest("hex");
  writeFileSync(resolve(run, "SCENARIO.md"), scenarioBytes);
  writeFileSync(resolve(run, "SCENARIO_REVIEW.json"), scenarioReviewBytes);
  const stagePlan = planAdmittedScenarioStages({
    scenarioId: "findings-example",
    scenarioSha256,
    scenarioReviewSha256,
    facts: {
      schemaVersion: 1,
      characterRequirement: {
        tag: "statBlocksOnly",
        evidence: "Fixture uses stat-block creatures.",
      },
      spatialRequirement: {
        tag: "notRequired",
        evidence: "Fixture has no spatial witness.",
      },
    },
  });
  if (stagePlan._tag === "Left") throw new Error(stagePlan.left);
  writeFileSync(
    resolve(evidence, "stage-plan.json"),
    `${JSON.stringify(stagePlan.right, null, 2)}\n`,
  );
  writeFileSync(
    resolve(evidence, "stage-plan-findings.json"),
    `${JSON.stringify(scenarioStagePlanFindings(stagePlan.right), null, 2)}\n`,
  );
  const transcriptPath = resolve(evidence, "sdk-calls.jsonl");
  const header = {
    type: "sdk-player-header",
    scenarioId: "findings-example",
    gitSha: "a".repeat(40),
    startedAt: "2026-08-18T00:00:00.000Z",
    consumerIsolation: "instructionalFallback",
    replaySupervisorSha256: "b".repeat(64),
    scenarioSha256,
    scenarioReviewSha256,
    charactersSha256: "e".repeat(64),
    characterObservation: {},
    characterOutcome: "ready",
    characterSheets: [],
    characterSheetsSha256: sha256Canonical([]),
    setupSha256: "f".repeat(64),
    setupObservation: {},
    setupOutcome: "ready",
    initialSession,
    initialSessionSha256: sha256Canonical(initialSession),
    initialTurnProjection: {},
    initialTurnProjectionSha256: sha256Canonical({}),
  } as const;
  const call = {
    type: "sdk-call",
    seq: 1,
    continuation: 1,
    operation: "discoverBattleActs",
    inputSession: initialSession,
    inputSessionSha256: sha256Canonical(initialSession),
    input: {},
    outcome: "returned",
    outputSession,
    outputSessionSha256: sha256Canonical(outputSession),
    result,
    resultSha256: sha256Canonical(result),
  } as const;
  writeFileSync(
    transcriptPath,
    `${JSON.stringify(header)}\n${JSON.stringify(call)}\n`,
  );

  const eventPath = resolve(evidence, "player-events.jsonl");
  writeFileSync(
    eventPath,
    `${[
      {
        type: "item.completed",
        item: {
          type: "command_execution",
          command: "node player-client.mjs attempt.ts",
          aggregated_output:
            '{"tag":"error","message":"Continuation did not typecheck: TS2353"}',
          exit_code: 1,
          status: "failed",
        },
      },
      {
        type: "item.completed",
        item: {
          type: "command_execution",
          command: "node player-client.mjs attempt.ts",
          aggregated_output: '{"tag":"ok"}',
          exit_code: 0,
          status: "completed",
        },
      },
    ]
      .map((value) => JSON.stringify(value))
      .join("\n")}\n`,
  );
  writeFileSync(
    resolve(evidence, "frozen-prefix.json"),
    `${JSON.stringify({
      scenarioId: header.scenarioId,
      gitSha: header.gitSha,
      transcriptSha256: "0".repeat(64),
      reviewer: "not-a-review-authority",
      verdicts: [],
    })}\n`,
  );

  const reviewPath = resolve(root, "review.json");
  const transcriptSha256 = createHash("sha256")
    .update(readFileSync(transcriptPath))
    .digest("hex");
  const claim = "Accepted transition contradicts the local rule.";
  writeFileSync(
    reviewPath,
    `${JSON.stringify({
      scenarioId: header.scenarioId,
      gitSha: header.gitSha,
      transcriptSha256,
      reviewer: "test-reviewer",
      verdicts: [
        {
          class: "bug",
          claim,
          evidence: "Transcript seq 1; local RAW passage.",
        },
      ],
    })}\n`,
  );
  return {
    root,
    run,
    transcriptPath,
    eventPath,
    reviewPath,
    transcriptRelative: relative(repoRoot, transcriptPath),
    eventRelative: relative(repoRoot, eventPath),
    runStartRelative: relative(repoRoot, runStartPath),
    reviewRelative: relative(repoRoot, reviewPath),
    runRelative: relative(repoRoot, run),
    claim,
  };
}

function finalScenarioReview(input: {
  readonly scenarioId: string;
  readonly scenarioSha256: string;
  readonly gitSha: string;
}) {
  return {
    scenarioId: input.scenarioId,
    scenarioSha256: input.scenarioSha256,
    gitSha: input.gitSha,
    reviewScope: "rawContentSdkCapabilityPolicy" as const,
    contentAvailabilityIntent: "availableOnly" as const,
    sdkCapabilityIntent: "supportedOnly" as const,
    admitReviewedUnsupported: false,
    rawReview: { classification: "supported" as const, evidence: "RAW." },
    contentReview: {
      classification: "supplied" as const,
      evidence: "Catalog.",
    },
    sdkCapabilityReview: {
      classification: "supported" as const,
      evidence: "SDK.",
    },
    policyReview: { classification: "safe" as const, evidence: "Policy." },
  };
}

function retainedCompositeReviewInput(input: {
  readonly reviewStage: "milestone" | "final";
  readonly invocationId: string;
}) {
  return {
    schemaVersion: 2 as const,
    phase: "scenarioCompositeReview" as const,
    reviewStage: input.reviewStage,
    scenarioId: "findings-example",
    sourceGitSha: "a".repeat(40),
    invocationId: input.invocationId,
    model: "gpt-5.6-luna" as const,
    reasoningEffort: "max" as const,
    prompt: `${input.reviewStage} prompt`,
    outputJsonSchema: codexOutputJsonSchema(
      CurrentScenarioCompositeReviewSchema,
    ),
    result: {
      raw: { classification: "supported" as const, evidence: "RAW." },
      contentAvailability: {
        classification: "supplied" as const,
        evidence: "Catalog.",
      },
      sdkCapability: {
        classification: "supported" as const,
        evidence: "SDK.",
      },
      artifactPolicy: { classification: "safe" as const, evidence: "Policy." },
      scenarioQuality: {
        classification: "ready" as const,
        evidence: "Quality.",
      },
    },
  };
}

function retainedGenerationReviewLedger(root: string): string {
  const path = resolve(root, "generation-invocations.jsonl");
  const reviewResult = (invocationId: string) =>
    retainedCompositeReviewInput({
      reviewStage:
        invocationId === "original-milestone" ? "milestone" : "final",
      invocationId,
    }).result;
  const eventBytes = (invocationId: string): string =>
    `${[
      {
        type: "raw-swarm.invocation.started",
        schemaVersion: 2,
        scenarioId: "findings-example",
        gitSha: "a".repeat(40),
        phase: "scenarioCompositeReview",
        stagePlanReason: "The campaign requires a composite review.",
        fallbackInvocationId: invocationId,
        model: "gpt-5.6-luna",
        reasoningEffort: "max",
        startedAt: "2026-08-18T00:00:00.000Z",
      },
      {
        type: "thread.started",
        thread_id: invocationId,
      },
      {
        type: "item.completed",
        item: {
          type: "agent_message",
          text: JSON.stringify({ result: reviewResult(invocationId) }),
        },
      },
      {
        type: "raw-swarm.invocation.completed",
        schemaVersion: 2,
        elapsedMilliseconds: 10,
        exit: { tag: "exited", status: 0 },
        result: { tag: "succeeded" },
      },
    ]
      .map((value) => JSON.stringify(value))
      .join("\n")}\n`;
  const eventPath = (invocationId: string) =>
    resolve(root, `${invocationId}.events.jsonl`);
  for (const invocationId of ["original-milestone", "original-final"]) {
    writeFileSync(eventPath(invocationId), eventBytes(invocationId));
  }
  const entry = (invocationId: string) => ({
    schemaVersion: 2,
    scenarioId: "findings-example",
    gitSha: "a".repeat(40),
    eventsSha256: createHash("sha256")
      .update(readFileSync(eventPath(invocationId)))
      .digest("hex"),
    phase: "scenarioCompositeReview",
    stagePlanReason: "The campaign requires a composite review.",
    invocationId,
    model: "gpt-5.6-luna",
    reasoningEffort: "max",
    startedAt: "2026-08-18T00:00:00.000Z",
    elapsedMilliseconds: 10,
    exit: { tag: "exited", status: 0 },
    result: { tag: "succeeded" },
    usage: {
      tag: "unavailable",
      reason:
        "The first-party event stream exposed no turn.completed usage object.",
    },
  });
  writeFileSync(
    path,
    `${JSON.stringify(entry("original-milestone"))}\n${JSON.stringify(entry("original-final"))}\n`,
  );
  return relative(repoRoot, path);
}

function findingIdentity(finding: {
  readonly stage: string;
  readonly category: string;
  readonly kind: string;
  readonly summary: string;
  readonly detail?: string;
  readonly pointer: unknown;
  readonly fingerprint?: string;
}) {
  return {
    stage: finding.stage,
    category: finding.category,
    kind: finding.kind,
    summary: finding.summary,
    ...(finding.detail === undefined ? {} : { detail: finding.detail }),
    pointer: finding.pointer,
    ...(finding.fingerprint === undefined
      ? {}
      : { fingerprint: finding.fingerprint }),
  };
}

function reportCommand(args: readonly string[]): string {
  return execFileSync(
    "mise",
    ["exec", "--", "node", "--experimental-strip-types", reportScript, ...args],
    { cwd: repoRoot, encoding: "utf8" },
  );
}

describe("Raw Swarm findings projection", () => {
  test("retains original milestone/final composite-review envelopes as replay authorities without ledger rows", () => {
    const input = fixture();
    const generationLedgerRelative = retainedGenerationReviewLedger(input.root);
    const milestonePath = resolve(input.root, "original-milestone.json");
    const finalPath = resolve(input.root, "original-final.json");
    writeFileSync(
      milestonePath,
      `${JSON.stringify(
        retainedCompositeReviewInput({
          reviewStage: "milestone",
          invocationId: "original-milestone",
        }),
      )}\n`,
    );
    writeFileSync(
      finalPath,
      `${JSON.stringify(
        retainedCompositeReviewInput({
          reviewStage: "final",
          invocationId: "original-final",
        }),
      )}\n`,
    );
    const projection = projectRunFindings({
      transcriptPath: input.transcriptRelative,
      runDirectory: input.runRelative,
      reviewPaths: [input.reviewRelative],
      scenarioReviewPaths: [],
      generationLedgerPaths: [generationLedgerRelative],
      reviewReplay: {
        tag: "milestoneAndFinal",
        milestonePath: relative(repoRoot, milestonePath),
        finalPath: relative(repoRoot, finalPath),
      },
      issueLinks: [],
    });
    expect(projection.authorities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "replay-milestone" }),
        expect.objectContaining({ role: "replay-final" }),
      ]),
    );
    expect(
      projection.authorities.filter(({ role }) => role.startsWith("replay-")),
    ).toHaveLength(2);
    expect(JSON.stringify(projection)).not.toContain("usage");
    expect(projection.findings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          pointer: expect.objectContaining({
            authorityRole: "replay-milestone",
          }),
        }),
      ]),
    );
    const tamperedEventPath = resolve(
      input.root,
      "original-milestone.events.jsonl",
    );
    const tamperedEvents = readFileSync(tamperedEventPath, "utf8").replace(
      '\\"classification\\":\\"supported\\"',
      '\\"classification\\":\\"unsupported\\"',
    );
    writeFileSync(tamperedEventPath, tamperedEvents);
    const tamperedLedgerPath = resolve(repoRoot, generationLedgerRelative);
    const tamperedLedgerEntries = readFileSync(tamperedLedgerPath, "utf8")
      .trim()
      .split("\n")
      .map(parseJsonRecord);
    tamperedLedgerEntries[0] = {
      ...tamperedLedgerEntries[0],
      eventsSha256: createHash("sha256").update(tamperedEvents).digest("hex"),
    };
    writeFileSync(
      tamperedLedgerPath,
      `${tamperedLedgerEntries.map((entry) => JSON.stringify(entry)).join("\n")}\n`,
    );
    expect(() =>
      projectRunFindings({
        transcriptPath: input.transcriptRelative,
        runDirectory: input.runRelative,
        reviewPaths: [input.reviewRelative],
        scenarioReviewPaths: [],
        generationLedgerPaths: [generationLedgerRelative],
        reviewReplay: {
          tag: "milestoneAndFinal",
          milestonePath: relative(repoRoot, milestonePath),
          finalPath: relative(repoRoot, finalPath),
        },
        issueLinks: [],
      }),
    ).toThrow(/result does not match its invocation event output/);
  });

  test("retains the bounded final-only composite-review envelope", () => {
    const input = fixture();
    const generationLedgerRelative = retainedGenerationReviewLedger(input.root);
    const finalPath = resolve(input.root, "original-final.json");
    writeFileSync(
      finalPath,
      `${JSON.stringify(
        retainedCompositeReviewInput({
          reviewStage: "final",
          invocationId: "original-final",
        }),
      )}\n`,
    );

    const projection = projectRunFindings({
      transcriptPath: input.transcriptRelative,
      runDirectory: input.runRelative,
      reviewPaths: [input.reviewRelative],
      scenarioReviewPaths: [],
      generationLedgerPaths: [generationLedgerRelative],
      reviewReplay: {
        tag: "finalOnly",
        finalPath: relative(repoRoot, finalPath),
      },
      issueLinks: [],
    });

    expect(projection.authorities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "replay-final" }),
        expect.objectContaining({
          role: "prePlayReviewReplayEvents-final",
        }),
      ]),
    );
    expect(
      projection.authorities.some(({ role }) => role.includes("milestone")),
    ).toBe(false);
  });

  test("rejects missing, duplicate-stage, and mismatched original review replay inputs", () => {
    const input = fixture();
    const generationLedgerRelative = retainedGenerationReviewLedger(input.root);
    const milestonePath = resolve(input.root, "original-milestone.json");
    const finalPath = resolve(input.root, "original-final.json");
    writeFileSync(
      milestonePath,
      `${JSON.stringify(
        retainedCompositeReviewInput({
          reviewStage: "milestone",
          invocationId: "original-milestone",
        }),
      )}\n`,
    );
    writeFileSync(
      finalPath,
      `${JSON.stringify(
        retainedCompositeReviewInput({
          reviewStage: "final",
          invocationId: "original-final",
        }),
      )}\n`,
    );
    const common = {
      transcriptPath: input.transcriptRelative,
      runDirectory: input.runRelative,
      reviewPaths: [input.reviewRelative],
      scenarioReviewPaths: [],
      generationLedgerPaths: [generationLedgerRelative],
      issueLinks: [],
    } as const;
    expect(() =>
      projectRunFindings({
        ...common,
        reviewReplay: {
          tag: "finalOnly",
          finalPath: relative(repoRoot, milestonePath),
        },
      }),
    ).toThrow(/expected final/);
    expect(() =>
      projectRunFindings({
        ...common,
        reviewReplay: {
          tag: "milestoneAndFinal",
          milestonePath: relative(repoRoot, milestonePath),
          finalPath: relative(repoRoot, milestonePath),
        },
      }),
    ).toThrow(/distinct envelope paths/);
    const duplicateStagePath = resolve(input.root, "duplicate-milestone.json");
    writeFileSync(
      duplicateStagePath,
      `${JSON.stringify(
        retainedCompositeReviewInput({
          reviewStage: "milestone",
          invocationId: "original-final",
        }),
      )}\n`,
    );
    expect(() =>
      projectRunFindings({
        ...common,
        reviewReplay: {
          tag: "milestoneAndFinal",
          milestonePath: relative(repoRoot, milestonePath),
          finalPath: relative(repoRoot, duplicateStagePath),
        },
      }),
    ).toThrow(/expected final/);

    const foreign = parseJsonRecord(readFileSync(finalPath, "utf8"));
    foreign.scenarioId = "foreign-scenario";
    writeFileSync(finalPath, `${JSON.stringify(foreign)}\n`);
    expect(() =>
      projectRunFindings({
        ...common,
        reviewReplay: {
          tag: "milestoneAndFinal",
          milestonePath: relative(repoRoot, milestonePath),
          finalPath: relative(repoRoot, finalPath),
        },
      }),
    ).toThrow(/belongs to scenario foreign-scenario/);
    writeFileSync(
      finalPath,
      `${JSON.stringify(
        retainedCompositeReviewInput({
          reviewStage: "final",
          invocationId: "original-final",
        }),
      )}\n`,
    );

    const ledgerPath = resolve(repoRoot, generationLedgerRelative);
    const ledgerEntries = readFileSync(ledgerPath, "utf8")
      .trim()
      .split("\n")
      .map(parseJsonRecord);
    for (const [field, value] of [
      ["model", "gpt-5.6-sol"],
      ["reasoningEffort", "medium"],
      ["gitSha", "b".repeat(40)],
    ] as const) {
      ledgerEntries[1] = { ...ledgerEntries[1], [field]: value };
      writeFileSync(
        ledgerPath,
        `${ledgerEntries.map((entry) => JSON.stringify(entry)).join("\n")}\n`,
      );
      expect(() =>
        projectRunFindings({
          ...common,
          reviewReplay: {
            tag: "milestoneAndFinal",
            milestonePath: relative(repoRoot, milestonePath),
            finalPath: relative(repoRoot, finalPath),
          },
        }),
      ).toThrow(/does not match original composite-review invocation/);
      ledgerEntries[1] = {
        ...ledgerEntries[1],
        [field]:
          field === "gitSha"
            ? "a".repeat(40)
            : field === "model"
              ? "gpt-5.6-luna"
              : "max",
      };
    }
  });

  test("retains pre-call failure, correction, accepted verdict, and exact authorities", () => {
    const input = fixture();
    const projection = projectRunFindings({
      transcriptPath: input.transcriptRelative,
      runDirectory: input.runRelative,
      reviewPaths: [input.reviewRelative],
      scenarioReviewPaths: [],
      generationLedgerPaths: [],
      issueLinks: [],
    });
    expect(validateFindingsProjection(projection)).toEqual({
      tag: "valid",
      projection,
    });
    expect(projection.run.callCount).toBe(1);
    expect(projection.authorities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "transcript",
          path: input.transcriptRelative,
        }),
        expect.objectContaining({
          role: "playerEvents",
          path: input.eventRelative,
        }),
        expect.objectContaining({
          role: "review-1",
          path: input.reviewRelative,
        }),
      ]),
    );
    expect(projection.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "pre-call-compilation-failure" }),
        expect.objectContaining({ kind: "successful-correction" }),
        expect.objectContaining({
          kind: "accepted-call-verdict",
          category: "runtime-rules-defect",
          fingerprint: sha256Canonical({
            class: "bug",
            claim: input.claim,
          }),
          pointer: expect.objectContaining({
            kind: "sdkSequence",
            sequence: 1,
          }),
        }),
        expect.objectContaining({
          stage: "character-authoring",
          category: "informational-observation",
          kind: "informational-observation",
        }),
      ]),
    );
    expect(
      projection.findings.some(
        (finding) => finding.pointer.authorityRole === "frozenPrefix",
      ),
    ).toBe(false);
    expect(JSON.stringify(projection)).not.toContain("inputSession");
    expect(renderFindingsAudit(projection)).toContain(
      "pre-call-compilation-failure",
    );
  });

  test("reprojection is deterministic and writing is immutable/idempotent", () => {
    const input = fixture();
    const options = {
      transcriptPath: input.transcriptRelative,
      runDirectory: input.runRelative,
      reviewPaths: [input.reviewRelative],
      scenarioReviewPaths: [],
      generationLedgerPaths: [],
      issueLinks: [],
    } as const;
    const first = projectRunFindings(options);
    const second = projectRunFindings(options);
    expect(second).toEqual(first);
    const path = resolve(input.run, "evidence/findings.json");
    const authority = writeFindingsProjection({
      projection: first,
      path: relative(repoRoot, path),
    });
    expect(authority.sha256).toBe(
      createHash("sha256").update(readFileSync(path)).digest("hex"),
    );
    expect(
      writeFindingsProjection({
        projection: second,
        path: relative(repoRoot, path),
      }),
    ).toEqual(authority);
    expect(readFindingsProjection(relative(repoRoot, path))).toEqual(first);
  });

  test("rejects a review authority from another run", () => {
    const input = fixture();
    const foreignReviewPath = resolve(input.root, "foreign-review.json");
    const foreignReview = parseJsonRecord(
      readFileSync(resolve(input.root, "review.json"), "utf8"),
    );
    foreignReview.scenarioId = "another-run";
    writeFileSync(foreignReviewPath, `${JSON.stringify(foreignReview)}\n`);
    expect(() =>
      projectRunFindings({
        transcriptPath: input.transcriptRelative,
        runDirectory: input.runRelative,
        reviewPaths: [relative(repoRoot, foreignReviewPath)],
        scenarioReviewPaths: [],
        generationLedgerPaths: [],
        issueLinks: [],
      }),
    ).toThrow(/Review authority identity does not match the run/);
  });

  test("binds a pre-play scenario review without requiring the player commit", () => {
    const input = fixture();
    const scenarioPath = resolve(input.run, "SCENARIO.md");
    const scenarioBytes = "# Findings scenario\n";
    writeFileSync(scenarioPath, scenarioBytes);
    const scenarioSha256 = createHash("sha256")
      .update(scenarioBytes)
      .digest("hex");
    const reviewPath = resolve(input.run, "SCENARIO_REVIEW.json");
    const review = finalScenarioReview({
      scenarioId: "findings-example",
      scenarioSha256,
      gitSha: "b".repeat(40),
    });
    const reviewBytes = `${JSON.stringify(review, null, 2)}\n`;
    writeFileSync(reviewPath, reviewBytes);
    const scenarioReviewSha256 = createHash("sha256")
      .update(reviewBytes)
      .digest("hex");
    const records = readFileSync(input.transcriptPath, "utf8")
      .trimEnd()
      .split("\n")
      .map(parseJsonRecord);
    records[0] = {
      ...records[0],
      scenarioSha256,
      scenarioReviewSha256,
    };
    writeFileSync(
      input.transcriptPath,
      `${records.map((record) => JSON.stringify(record)).join("\n")}\n`,
    );
    const stagePlanFindings = parseJsonRecordArray(
      readFileSync(
        resolve(input.run, "evidence/stage-plan-findings.json"),
        "utf8",
      ),
    );
    stagePlanFindings[0] = {
      ...stagePlanFindings[0],
      identity: {
        tag: "admitted",
        scenarioId: "findings-example",
        scenarioSha256,
        scenarioReviewSha256,
      },
    };
    writeFileSync(
      resolve(input.run, "evidence/stage-plan-findings.json"),
      `${JSON.stringify(stagePlanFindings)}\n`,
    );
    const stagePlanPath = resolve(input.run, "evidence/stage-plan.json");
    const stagePlan = parseJsonRecord(readFileSync(stagePlanPath, "utf8"));
    stagePlan.identity = {
      tag: "admitted",
      scenarioId: "findings-example",
      scenarioSha256,
      scenarioReviewSha256,
    };
    writeFileSync(stagePlanPath, `${JSON.stringify(stagePlan, null, 2)}\n`);

    const projection = projectRunFindings({
      transcriptPath: input.transcriptRelative,
      runDirectory: input.runRelative,
      reviewPaths: [],
      scenarioReviewPaths: [relative(repoRoot, reviewPath)],
      generationLedgerPaths: [],
      issueLinks: [],
    });
    expect(
      projection.authorities.some(
        (authority) => authority.role === "scenarioReview",
      ),
    ).toBe(true);
  });

  test("keeps scenario-review parsing separate from ordinary and historical reviews", () => {
    const input = fixture();
    const scenarioPath = resolve(input.root, "ordinary-scenario.md");
    writeFileSync(scenarioPath, "# Ordinary scenario\n");
    const historicalPath = resolve(
      input.root,
      "historical-scenario-review.json",
    );
    writeFileSync(
      historicalPath,
      `${JSON.stringify({
        raw: { classification: "supported", evidence: "RAW." },
        contentAvailability: {
          classification: "supplied",
          evidence: "Catalog.",
        },
        sdkCapability: { classification: "supported", evidence: "SDK." },
        artifactPolicy: { classification: "safe", evidence: "Policy." },
      })}\n`,
    );
    expect(() =>
      projectRunFindings({
        transcriptPath: input.transcriptRelative,
        runDirectory: input.runRelative,
        reviewPaths: [],
        scenarioReviewPaths: [relative(repoRoot, historicalPath)],
        generationLedgerPaths: [],
        issueLinks: [],
      }),
    ).toThrow(/Historical scenario review has no run identity/);
    expect(() =>
      projectGenerationFindings({
        scenarioId: "findings-example",
        gitSha: "a".repeat(40),
        startedAt: "2026-08-18T00:00:00.000Z",
        authorityPaths: [
          { role: "run", path: input.runStartRelative },
          { role: "scenario", path: relative(repoRoot, scenarioPath) },
          { role: "review", path: input.reviewRelative },
        ],
        scenarioReviewPaths: [input.reviewRelative],
        generationLedgerPaths: [],
        stagePlanPaths: [],
        stagePlanFindingsPaths: [],
      }),
    ).toThrow(/Scenario-review authority has an unsupported schema/);
  });

  test("rejects a foreign final scenario review during generation projection", () => {
    const input = fixture();
    const scenarioPath = resolve(input.root, "generated-candidate.md");
    const scenarioBytes = "# Generated candidate\n";
    writeFileSync(scenarioPath, scenarioBytes);
    const reviewPath = resolve(input.root, "generated-review.json");
    writeFileSync(
      reviewPath,
      `${JSON.stringify(
        finalScenarioReview({
          scenarioId: "findings-example",
          scenarioSha256: createHash("sha256")
            .update(scenarioBytes)
            .digest("hex"),
          gitSha: "b".repeat(40),
        }),
        null,
        2,
      )}\n`,
    );
    expect(() =>
      projectGenerationFindings({
        scenarioId: "findings-example",
        gitSha: "a".repeat(40),
        startedAt: "2026-08-18T00:00:00.000Z",
        authorityPaths: [
          { role: "run", path: input.runStartRelative },
          { role: "scenario", path: relative(repoRoot, scenarioPath) },
          { role: "scenarioReview", path: relative(repoRoot, reviewPath) },
        ],
        scenarioReviewPaths: [relative(repoRoot, reviewPath)],
        generationLedgerPaths: [],
        stagePlanPaths: [],
        stagePlanFindingsPaths: [],
      }),
    ).toThrow(/Scenario review authority identity does not match the run/);
  });

  test("requires transcript-free identities to have no calls or transcript authority", () => {
    const input = fixture();
    const projection = projectGenerationFindings({
      scenarioId: "findings-example",
      gitSha: "a".repeat(40),
      startedAt: "2026-08-18T00:00:00.000Z",
      authorityPaths: [{ role: "run", path: input.runStartRelative }],
      scenarioReviewPaths: [],
      generationLedgerPaths: [],
      stagePlanPaths: [],
      stagePlanFindingsPaths: [],
    });
    const run = { ...projection.run, callCount: 1 };
    expect(
      validateFindingsProjection({
        ...projection,
        run,
        runIdentity: sha256Canonical(run),
      }),
    ).toMatchObject({
      tag: "invalid",
      message: /transcript-free run must have zero SDK calls/,
    });
    expect(
      validateFindingsProjection({
        ...projection,
        authorities: projection.authorities.map((authority) =>
          authority.role === "run"
            ? { ...authority, role: "transcript" }
            : authority,
        ),
      }),
    ).toMatchObject({
      tag: "invalid",
      message: /transcript-free run cannot have a transcript authority/,
    });
  });

  test("projects and indexes a generation rejection without inventing a transcript", () => {
    const root = directory();
    const run = resolve(root, "generation-run");
    const manifest = resolve(run, "run.json");
    const campaign = resolve(root, "campaign.json");
    const ledger = resolve(root, "generation.jsonl");
    const scenario = resolve(root, "candidate.md");
    const stagePlanFindings = resolve(root, "stage-plan-findings.json");
    mkdirSync(run, { recursive: true });
    writeFileSync(
      manifest,
      `${JSON.stringify({
        type: "raw-swarm-generation-run",
        schemaVersion: 1,
        scenarioId: "generation-example",
        gitSha: "a".repeat(40),
        startedAt: "2026-08-18T00:00:00.000Z",
      })}\n`,
    );
    writeFileSync(campaign, '{"scenarioId":"generation-example"}\n');
    const scenarioBytes = "The candidate is incoherent outside the envelope.\n";
    writeFileSync(scenario, scenarioBytes);
    const candidateScenarioSha256 = createHash("sha256")
      .update(scenarioBytes)
      .digest("hex");
    const stagePlan = planScenarioStages({
      identity: {
        tag: "candidate",
        scenarioId: "generation-example",
        candidateScenarioSha256,
      },
      facts: {
        schemaVersion: 1,
        characterRequirement: {
          tag: "statBlocksOnly",
          evidence: "Fixture rejection has no character-sheet requirement.",
        },
        spatialRequirement: {
          tag: "outsideExperimentEnvelope",
          resolution: "incoherent",
          evidence: "Fixture candidate is incoherent.",
        },
      },
    });
    if (stagePlan._tag === "Left") throw new Error(stagePlan.left);
    const stagePlanPath = resolve(root, "stage-plan.json");
    writeFileSync(
      stagePlanPath,
      `${JSON.stringify(stagePlan.right, null, 2)}\n`,
    );
    writeFileSync(
      ledger,
      `${JSON.stringify({
        schemaVersion: 1,
        scenarioId: "generation-example",
        gitSha: "a".repeat(40),
        eventsSha256: "b".repeat(64),
        phase: "scenarioGeneration",
        invocationId: "fixture-generation",
        model: "synthetic",
        reasoningEffort: "medium",
        startedAt: "2026-08-18T00:00:00.000Z",
        elapsedMilliseconds: 0,
        exit: { tag: "exited", status: 1 },
        usage: { tag: "unavailable", reason: "fixture" },
      })}\n`,
    );
    writeFileSync(
      stagePlanFindings,
      `${JSON.stringify(scenarioStagePlanFindings(stagePlan.right), null, 2)}\n`,
    );
    const projectionInput = {
      scenarioId: "generation-example",
      gitSha: "a".repeat(40),
      startedAt: "2026-08-18T00:00:00.000Z",
      authorityPaths: [
        { role: "run", path: relative(repoRoot, manifest) },
        { role: "campaign", path: relative(repoRoot, campaign) },
        { role: "scenario", path: relative(repoRoot, scenario) },
        { role: "generationLedger", path: relative(repoRoot, ledger) },
        { role: "stagePlan", path: relative(repoRoot, stagePlanPath) },
        {
          role: "stagePlanFindings",
          path: relative(repoRoot, stagePlanFindings),
        },
      ],
      scenarioReviewPaths: [],
      generationLedgerPaths: [relative(repoRoot, ledger)],
      stagePlanPaths: [relative(repoRoot, stagePlanPath)],
      stagePlanFindingsPaths: [relative(repoRoot, stagePlanFindings)],
      pointerAuthorityRole: "stagePlanFindings",
      rejectionReason: "The final candidate failed the admission boundary.",
    } as const;
    const projection = projectGenerationFindings(projectionInput);
    expect(projection.run.transcriptSha256).toBeUndefined();
    expect(projection.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "generation-rejection" }),
        expect.objectContaining({ kind: "generation-invocation-failure" }),
        expect.objectContaining({
          kind: "generation-rejection",
          pointer: expect.objectContaining({
            authorityRole: "stagePlanFindings",
          }),
        }),
      ]),
    );
    const foreignLedger = resolve(root, "foreign-generation.jsonl");
    const ledgerEntry = parseJsonRecord(readFileSync(ledger, "utf8"));
    writeFileSync(
      foreignLedger,
      `${JSON.stringify({ ...ledgerEntry, scenarioId: "foreign-scenario" })}\n`,
    );
    expect(() =>
      projectGenerationFindings({
        ...projectionInput,
        authorityPaths: [
          ...projectionInput.authorityPaths.filter(
            ({ role }) => role !== "generationLedger",
          ),
          {
            role: "generationLedger",
            path: relative(repoRoot, foreignLedger),
          },
        ],
        generationLedgerPaths: [relative(repoRoot, foreignLedger)],
      }),
    ).toThrow(/belongs to a different run identity/);
    const mismatchedStagePlanFindings = resolve(
      root,
      "mismatched-stage-plan-findings.json",
    );
    writeFileSync(
      mismatchedStagePlanFindings,
      `${JSON.stringify(
        scenarioStagePlanFindings(stagePlan.right).map((finding) => ({
          ...finding,
          identity: {
            tag: "admitted" as const,
            scenarioId: "generation-example",
            scenarioSha256: candidateScenarioSha256,
            scenarioReviewSha256: "d".repeat(64),
          },
        })),
        null,
        2,
      )}\n`,
    );
    expect(() =>
      projectGenerationFindings({
        scenarioId: "generation-example",
        gitSha: "a".repeat(40),
        startedAt: "2026-08-18T00:00:00.000Z",
        authorityPaths: [
          { role: "run", path: relative(repoRoot, manifest) },
          { role: "scenario", path: relative(repoRoot, scenario) },
          { role: "stagePlan", path: relative(repoRoot, stagePlanPath) },
        ],
        scenarioReviewPaths: [],
        generationLedgerPaths: [],
        stagePlanPaths: [relative(repoRoot, stagePlanPath)],
        stagePlanFindingsPaths: [
          relative(repoRoot, mismatchedStagePlanFindings),
        ],
        pointerAuthorityRole: "stagePlanFindings",
      }),
    ).toThrow(/Stage-plan findings authority does not match the retained plan/);
    const wrongCandidateHashFindings = resolve(
      root,
      "wrong-candidate-hash-findings.json",
    );
    writeFileSync(
      wrongCandidateHashFindings,
      `${JSON.stringify(
        scenarioStagePlanFindings(stagePlan.right).map((finding) => ({
          ...finding,
          identity: {
            tag: "candidate" as const,
            scenarioId: "generation-example",
            candidateScenarioSha256: "0".repeat(64),
          },
        })),
        null,
        2,
      )}\n`,
    );
    expect(() =>
      projectGenerationFindings({
        scenarioId: "generation-example",
        gitSha: "a".repeat(40),
        startedAt: "2026-08-18T00:00:00.000Z",
        authorityPaths: [
          { role: "run", path: relative(repoRoot, manifest) },
          { role: "scenario", path: relative(repoRoot, scenario) },
          { role: "stagePlan", path: relative(repoRoot, stagePlanPath) },
        ],
        scenarioReviewPaths: [],
        generationLedgerPaths: [],
        stagePlanPaths: [relative(repoRoot, stagePlanPath)],
        stagePlanFindingsPaths: [
          relative(repoRoot, wrongCandidateHashFindings),
        ],
        pointerAuthorityRole: "stagePlanFindings",
      }),
    ).toThrow(/Stage-plan findings authority does not match the retained plan/);
    const findingsPath = resolve(run, "evidence/findings.json");
    writeFindingsProjection({
      projection,
      path: relative(repoRoot, findingsPath),
    });
    const dbPath = resolve(root, "generation.sqlite");
    expect(
      ingestGenerationFindings({
        findingsPath: relative(repoRoot, findingsPath),
        dbPath: relative(repoRoot, dbPath),
      }),
    ).toBe(1);
    const db = openArtifactIndex(relative(repoRoot, dbPath));
    try {
      expect(db.prepare("SELECT scenarioId FROM generationRuns").get()).toEqual(
        { scenarioId: "generation-example" },
      );
      expect(
        db.prepare("SELECT COUNT(*) AS count FROM generationFindings").get(),
      ).toEqual({ count: 7 });
    } finally {
      db.close();
    }
    const audit = reportCommand([
      "generation-audit",
      "--generation-run",
      "1",
      "--db",
      relative(repoRoot, dbPath),
    ]);
    expect(audit).toContain("generation-rejection");
  });

  test("rejects malformed projections, duplicate identities, broken pointers, and tampering", () => {
    const input = fixture();
    const projection = projectRunFindings({
      transcriptPath: input.transcriptRelative,
      runDirectory: input.runRelative,
      reviewPaths: [input.reviewRelative],
      scenarioReviewPaths: [],
      generationLedgerPaths: [],
      issueLinks: [],
    });
    expect(
      validateFindingsProjection({
        ...projection,
        authorities: [],
      }),
    ).toMatchObject({ tag: "invalid" });
    const first = projection.findings[0]!;
    expect(
      validateFindingsProjection({
        ...projection,
        findings: [first, first],
      }),
    ).toMatchObject({ tag: "invalid", message: /Duplicate finding/ });
    const unknownPointer = {
      ...first,
      pointer: { kind: "artifact", authorityRole: "missing-authority" },
    };
    expect(
      validateFindingsProjection({
        ...projection,
        findings: [
          {
            ...unknownPointer,
            findingId: sha256Canonical(findingIdentity(unknownPointer)),
          },
        ],
      }),
    ).toMatchObject({ tag: "invalid", message: /unknown authority/ });
    const brokenSequence = projection.findings.find(
      (finding) => finding.pointer.kind === "sdkSequence",
    );
    expect(brokenSequence).toBeDefined();
    if (brokenSequence === undefined) return;
    const pointer = {
      kind: "sdkSequence" as const,
      authorityRole: "transcript",
      sequence: 2,
    };
    expect(
      validateFindingsProjection({
        ...projection,
        findings: [
          {
            ...brokenSequence,
            pointer,
            findingId: sha256Canonical(
              findingIdentity({ ...brokenSequence, pointer }),
            ),
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: /past the recorded SDK call count/,
    });
    expect(
      validateFindingsProjection({
        ...projection,
        findings: [{ ...first, findingId: "0".repeat(64) }],
      }),
    ).toMatchObject({ tag: "invalid", message: /inconsistent identity/ });
    expect(
      validateFindingsProjection({
        ...projection,
        runIdentity: "0".repeat(64),
      }),
    ).toMatchObject({ tag: "invalid", message: /run identity/ });
    expect(
      validateFindingsProjection({
        ...projection,
        authorities: projection.authorities.map((authority) =>
          authority.role === "transcript"
            ? { ...authority, sha256: "0".repeat(64) }
            : authority,
        ),
      }),
    ).toMatchObject({ tag: "invalid", message: /authority hash/ });
    expect(
      validateFindingsProjection({
        ...projection,
        findings: projection.findings.map((finding) => {
          if (finding.pointer.kind !== "sdkSequence") return finding;
          const pointer = { ...finding.pointer, authorityRole: "review-1" };
          return {
            ...finding,
            pointer,
            findingId: sha256Canonical(
              findingIdentity({ ...finding, pointer }),
            ),
          };
        }),
      }),
    ).toMatchObject({ tag: "invalid", message: /must use the transcript/ });
  });

  test("omits empty optional detail and preserves physical JSONL line pointers", () => {
    const input = fixture();
    const emptyDetail = makeFinding({
      stage: "player",
      category: "informational-observation",
      kind: "informational-observation",
      summary: "No detail",
      detail: " \u0000 ",
      pointer: { kind: "artifact", authorityRole: "transcript" },
    });
    expect(emptyDetail).not.toHaveProperty("detail");
    const observationsPath = resolve(input.run, "evidence/observations.jsonl");
    writeFileSync(
      observationsPath,
      "\n\n" +
        `${JSON.stringify({ kind: "executionError", message: "line three" })}\n`,
    );
    const projection = projectRunFindings({
      transcriptPath: input.transcriptRelative,
      runDirectory: input.runRelative,
      reviewPaths: [],
      scenarioReviewPaths: [],
      generationLedgerPaths: [],
      issueLinks: [],
    });
    expect(projection.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          detail: "line three",
          pointer: expect.objectContaining({
            authorityRole: "observations",
            line: 3,
          }),
        }),
      ]),
    );
  });

  test("does not downgrade a structurally malformed SDK transcript to zero calls", () => {
    const input = fixture();
    writeFileSync(
      input.transcriptPath,
      `${JSON.stringify({
        type: "sdk-player-header",
        scenarioId: "findings-example",
        gitSha: "a".repeat(40),
        startedAt: "2026-08-18T00:00:00.000Z",
      })}\n${JSON.stringify({ type: "not-an-sdk-call" })}\n`,
    );
    expect(() =>
      projectRunFindings({
        transcriptPath: input.transcriptRelative,
        runDirectory: input.runRelative,
        reviewPaths: [],
        scenarioReviewPaths: [],
        generationLedgerPaths: [],
        issueLinks: [],
      }),
    ).toThrow(/SDK transcript is malformed/);
  });

  test("rejects non-SDK transcript formats instead of projecting a zero-call run", () => {
    const root = directory();
    const run = resolve(root, "mcp-run");
    const evidence = resolve(run, "evidence");
    mkdirSync(evidence, { recursive: true });
    const transcriptPath = resolve(run, "run.jsonl");
    writeFileSync(
      transcriptPath,
      `${JSON.stringify({ type: "header", scenarioId: "not-sdk" })}\n`,
    );
    expect(() =>
      projectRunFindings({
        transcriptPath: relative(repoRoot, transcriptPath),
        runDirectory: relative(repoRoot, run),
        reviewPaths: [],
        scenarioReviewPaths: [],
        generationLedgerPaths: [],
        issueLinks: [],
      }),
    ).toThrow(/SDK transcript is malformed/);
  });
});
