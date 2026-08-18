import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type { ModelInvocationLedgerEntry } from "./model-telemetry.ts";
import { writeReviewInvocationEvidenceManifest } from "./review-invocation-evidence.ts";
import {
  preflightSdkTranscript,
  writeSdkAudit,
} from "./sdk-player/sdk-audit.ts";
import { encodeSdkReviewPacket } from "./sdk-player/sdk-review-packet.ts";
import { sha256Canonical, sha256Text } from "./transcript.ts";

export function controlledReviewEvidenceFixture(input: {
  readonly directory: string;
  readonly ledgerEntries: readonly ModelInvocationLedgerEntry[];
  readonly callCount?: number;
}) {
  const runDirectory = resolve(input.directory, "run");
  const evidenceDirectory = resolve(runDirectory, "evidence");
  mkdirSync(evidenceDirectory, { recursive: true });
  const charactersPath = resolve(evidenceDirectory, "characters.ts");
  const setupPath = resolve(evidenceDirectory, "setup.ts");
  const scenarioPath = resolve(runDirectory, "SCENARIO.md");
  const scenarioReviewPath = resolve(runDirectory, "SCENARIO_REVIEW.json");
  const transcriptPath = resolve(evidenceDirectory, "sdk-calls.jsonl");
  const replaySupervisorPath = resolve(runDirectory, "replay-supervisor.mjs");
  const reviewPath = resolve(input.directory, "review.json");
  const auditPath = resolve(input.directory, "review.audit.jsonl");
  const packetPath = resolve(input.directory, "review.packet.json");
  const ledgerPath = resolve(input.directory, "review.invocations.jsonl");
  const manifestPath = resolve(input.directory, "review.evidence.json");
  const characters = "export const characters = [];\n";
  const setup = "export const setup = {};\n";
  const scenario = "# Controlled evidence fixture\n";
  const scenarioReview = '{"classification":"supported"}\n';
  const replaySupervisor = "export const replay = true;\n";
  writeFileSync(charactersPath, characters);
  writeFileSync(setupPath, setup);
  writeFileSync(scenarioPath, scenario);
  writeFileSync(scenarioReviewPath, scenarioReview);
  writeFileSync(replaySupervisorPath, replaySupervisor);
  const session = { round: 1 };
  const callCount = input.callCount ?? 1;
  const header = {
    type: "sdk-player-header",
    scenarioId: "same",
    gitSha: "b".repeat(40),
    startedAt: "2026-08-14T00:00:00.000Z",
    consumerIsolation: "instructionalFallback",
    replaySupervisorSha256: sha256Text(replaySupervisor),
    scenarioSha256: sha256Text(scenario),
    scenarioReviewSha256: sha256Text(scenarioReview),
    charactersSha256: sha256Text(characters),
    characterOutcome: "ready",
    characterSheets: [],
    characterSheetsSha256: sha256Canonical([]),
    characterObservation: {},
    setupSha256: sha256Text(setup),
    setupOutcome: "ready",
    initialSession: session,
    initialSessionSha256: sha256Canonical(session),
    setupObservation: {},
  } as const;
  const calls = Array.from({ length: callCount }, (_, index) => {
    const seq = index + 1;
    return {
      type: "sdk-call",
      seq,
      continuation: seq,
      operation: "discoverBattleActs",
      inputSession: session,
      inputSessionSha256: sha256Canonical(session),
      input: {},
      outcome: "returned",
      outputSession: session,
      outputSessionSha256: sha256Canonical(session),
      result: [],
      resultSha256: sha256Canonical([]),
    };
  });
  writeFileSync(
    transcriptPath,
    `${[header, ...calls].map((record) => JSON.stringify(record)).join("\n")}\n`,
  );
  const audit = preflightSdkTranscript({ transcriptPath });
  if (audit.tag === "invalid") throw new Error(audit.message);
  writeSdkAudit(auditPath, audit.audit);
  const packet = encodeSdkReviewPacket({
    audit: audit.audit,
    retainedHeaderEvidence: {},
    currentTurnProjections: [],
    runArtifacts: [],
    domainAuthorities: [],
    rawAuthorities: [],
  });
  if (packet.tag === "invalid") throw new Error(packet.message);
  writeFileSync(packetPath, packet.encoded);
  writeFileSync(
    reviewPath,
    `${JSON.stringify({
      scenarioId: header.scenarioId,
      gitSha: header.gitSha,
      transcriptSha256: audit.audit.header.transcriptSha256,
      reviewer: "scenario-reviewer",
      verdicts: [
        {
          class: "pass",
          claim: "The retained transition is reviewable.",
          evidence: "SDK sequence 1 records the transition.",
        },
      ],
    })}\n`,
  );
  writeFileSync(
    ledgerPath,
    `${input.ledgerEntries.map((entry) => JSON.stringify(entry)).join("\n")}\n`,
  );
  writeReviewInvocationEvidenceManifest({
    transcriptPath,
    reviewPath,
    auditPath,
    packetPath,
    invocationLedgerPaths: [ledgerPath],
    outputPath: manifestPath,
  });
  return {
    transcriptPath,
    reviewPath,
    auditPath,
    packetPath,
    ledgerPath,
    manifestPath,
    header,
    calls,
  };
}
