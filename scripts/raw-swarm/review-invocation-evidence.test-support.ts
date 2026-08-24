import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { Either, Schema } from "effect";

import {
  codexOutputJsonSchema,
  HistoricalScenarioCompositeReviewSchema,
} from "./scenario-campaign.ts";
import type { CurrentModelInvocationLedgerEntry } from "./model-telemetry.ts";
import {
  invocationEventsSha256,
  modelInvocationCompletedEvent,
  modelInvocationStartedEvent,
} from "./model-telemetry.ts";
import { writeReviewInvocationEvidenceManifest } from "./review-invocation-evidence.ts";
import {
  preflightSdkTranscript,
  writeSdkAudit,
} from "./sdk-player/sdk-audit.ts";
import {
  encodeSdkReviewPacket,
  sdkReviewPacketHeaderEvidence,
  sdkReviewPacketSource,
} from "./sdk-player/sdk-review-packet.ts";
import { parseSdkTranscript } from "./sdk-player/sdk-transcript.ts";
import { reprojectSdkTranscriptTurns } from "./sdk-player/player-turn-projection.ts";
import { repoRoot, sha256Canonical, sha256Text } from "./transcript.ts";
import { ScenarioIdSchema } from "./transcript.ts";
import {
  planAdmittedScenarioStages,
  scenarioStagePlanFindings,
} from "./scenario-stage-plan.ts";

function eventValue<A, E>(result: Either.Either<A, E>): A {
  if (Either.isLeft(result)) throw new Error(String(result.left));
  return result.right;
}

export function controlledReviewEvidenceFixture(input: {
  readonly directory: string;
  readonly ledgerEntries: readonly Omit<
    CurrentModelInvocationLedgerEntry,
    "subject" | "gitSha" | "eventsSha256"
  >[];
  readonly callCount?: number;
  readonly ledgerScenarioId?: string;
  readonly postPlayUsesTool?: boolean;
  readonly eventEntries?: readonly Omit<
    CurrentModelInvocationLedgerEntry,
    "subject" | "gitSha" | "eventsSha256"
  >[];
}) {
  if (
    input.eventEntries !== undefined &&
    input.eventEntries.length !== input.ledgerEntries.length
  ) {
    throw new Error("Event and ledger fixture entries must have equal length.");
  }
  const evidenceSetDirectory = resolve(input.directory, "run");
  const evidenceDirectory = resolve(evidenceSetDirectory, "evidence");
  mkdirSync(evidenceDirectory, { recursive: true });
  const charactersPath = resolve(evidenceDirectory, "characters.ts");
  const setupPath = resolve(evidenceDirectory, "setup.ts");
  const scenarioPath = resolve(evidenceSetDirectory, "SCENARIO.md");
  const scenarioReviewPath = resolve(
    evidenceSetDirectory,
    "SCENARIO_REVIEW.json",
  );
  const transcriptPath = resolve(evidenceDirectory, "sdk-calls.jsonl");
  const programPath = resolve(evidenceDirectory, "program.ts");
  writeFileSync(
    resolve(evidenceSetDirectory, "execution.json"),
    `${JSON.stringify({
      schemaVersion: 1,
      executionId: "fixture-execution",
      evidenceSetId: "fixture-evidence",
      scenarioId: "same",
    })}\n`,
  );
  const frozenPrefixPath = resolve(evidenceDirectory, "frozen-prefix.json");
  const finalPath = resolve(evidenceDirectory, "final.json");
  const observationPath = resolve(evidenceSetDirectory, "OBSERVATION.json");
  const agentFinalPath = resolve(evidenceDirectory, "agent-final.txt");
  const replaySupervisorPath = resolve(
    evidenceSetDirectory,
    "replay-supervisor.mjs",
  );
  const reviewPath = resolve(input.directory, "review.json");
  const auditPath = resolve(input.directory, "review.audit.jsonl");
  const packetPath = resolve(input.directory, "review.packet.json");
  const ledgerPath = resolve(input.directory, "review.invocations.jsonl");
  const manifestPath = resolve(input.directory, "review.evidence.json");
  const sourcePrePlayReviewInputPaths = [
    resolve(input.directory, "milestone-source-input.json"),
    resolve(input.directory, "final-source-input.json"),
  ] as const;
  const replayPrePlayReviewInputPaths = [
    resolve(input.directory, "milestone-replay-input.json"),
    resolve(input.directory, "final-replay-input.json"),
  ] as const;
  const characters = "export const characters = [];\n";
  const setup = "export const setup = {};\n";
  const scenario = "# Controlled evidence fixture\n";
  const scenarioSourceGitSha = "a".repeat(40);
  const transcriptGitSha = "b".repeat(40);
  const invocationGitSha = "c".repeat(40);
  writeFileSync(
    resolve(evidenceDirectory, "execution-start.json"),
    `${JSON.stringify({
      type: "raw-swarm-execution-start",
      schemaVersion: 1,
      executionId: "fixture-execution",
      evidenceSetId: "fixture-evidence",
      scenarioId: "same",
      gitSha: transcriptGitSha,
      startedAt: "2026-08-14T00:00:00.000Z",
    })}\n`,
  );
  writeFileSync(
    resolve(input.directory, "campaign.json"),
    `${JSON.stringify({
      type: "raw-swarm-scenario-campaign",
      schemaVersion: 1,
      campaignId: "fixture-campaign",
      plannedScenarioId: "same",
      evidenceSetId: "fixture-evidence",
      gitSha: scenarioSourceGitSha,
      startedAt: "2026-08-14T00:00:00.000Z",
      configSha256: "c".repeat(64),
    })}\n`,
  );
  const scenarioCompositeResults = [0, 1].map(() => ({
    raw: { classification: "supported" as const, evidence: "supported" },
    contentAvailability: {
      classification: "supplied" as const,
      evidence: "supplied",
    },
    sdkCapability: {
      classification: "supported" as const,
      evidence: "supported",
    },
    artifactPolicy: { classification: "safe" as const, evidence: "safe" },
  }));
  const scenarioReview = `${JSON.stringify({
    scenarioId: "same",
    scenarioSha256: sha256Text(scenario),
    gitSha: scenarioSourceGitSha,
    admitReviewedUnsupported: false,
    reviewScope: "rawContentSdkCapabilityPolicy",
    contentAvailabilityIntent: "availableOnly",
    sdkCapabilityIntent: "supportedOnly",
    rawReview: scenarioCompositeResults[1]!.raw,
    contentReview: scenarioCompositeResults[1]!.contentAvailability,
    sdkCapabilityReview: scenarioCompositeResults[1]!.sdkCapability,
    policyReview: scenarioCompositeResults[1]!.artifactPolicy,
  })}\n`;
  const replaySupervisor = "export const replay = true;\n";
  const program = "export const program = true;\n";
  const conclusion = "Controlled evidence fixture complete.";
  const frozenPrefix = `${JSON.stringify({
    run: { kind: "playerConcluded", conclusion },
  })}\n`;
  const final = `${JSON.stringify({
    kind: "playerConcluded",
    conclusion,
  })}\n`;
  const observation = `${JSON.stringify({
    kind: "playerConcluded",
    conclusion,
  })}\n`;
  const agentFinal = `${conclusion}\n`;
  writeFileSync(charactersPath, characters);
  writeFileSync(setupPath, setup);
  writeFileSync(scenarioPath, scenario);
  writeFileSync(scenarioReviewPath, scenarioReview);
  const stagePlan = planAdmittedScenarioStages({
    scenarioId: Schema.decodeUnknownSync(ScenarioIdSchema)("same"),
    scenarioSha256: sha256Text(scenario),
    scenarioReviewSha256: sha256Text(scenarioReview),
    facts: {
      schemaVersion: 1,
      characterRequirement: {
        tag: "statBlocksOnly",
        evidence: "The fixture uses canonical stat blocks.",
      },
      spatialRequirement: {
        tag: "notRequired",
        evidence: "The fixture requires no geometry.",
      },
    },
  });
  if (Either.isLeft(stagePlan)) throw new Error(stagePlan.left);
  writeFileSync(
    resolve(evidenceDirectory, "stage-plan.json"),
    `${JSON.stringify(stagePlan.right)}\n`,
  );
  writeFileSync(
    resolve(evidenceDirectory, "stage-plan-findings.json"),
    `${JSON.stringify(scenarioStagePlanFindings(stagePlan.right))}\n`,
  );
  writeFileSync(replaySupervisorPath, replaySupervisor);
  writeFileSync(programPath, program);
  writeFileSync(frozenPrefixPath, frozenPrefix);
  writeFileSync(finalPath, final);
  writeFileSync(observationPath, observation);
  writeFileSync(agentFinalPath, agentFinal);
  const reviewInput = (
    index: number,
    sourceGitSha: string,
    invocationId: string,
  ) => ({
    schemaVersion: 2,
    phase: "scenarioCompositeReview",
    reviewStage: index === 0 ? "milestone" : "final",
    scenarioId: "same",
    sourceGitSha,
    invocationId,
    model: "gpt-5.6-luna",
    reasoningEffort: "max",
    prompt: `review input ${index + 1}`,
    outputJsonSchema: codexOutputJsonSchema(
      HistoricalScenarioCompositeReviewSchema,
    ),
    result: scenarioCompositeResults[index],
  });
  sourcePrePlayReviewInputPaths.forEach((path, index) => {
    writeFileSync(
      path,
      `${JSON.stringify(reviewInput(index, scenarioSourceGitSha, `source-${index + 1}`))}\n`,
    );
    writeFileSync(
      replayPrePlayReviewInputPaths[index]!,
      `${JSON.stringify(reviewInput(index, invocationGitSha, `pre-play-${index + 1}`))}\n`,
    );
  });
  const session = {
    battle: {
      state: {
        initiative: { round: 1, stillToAct: [{ creature: "actor" }] },
        subjectResolutionPhase: { kind: "subjectSelection" },
        combatants: {
          $map: [
            [
              "actor",
              {
                hp: 10,
                maxHp: 10,
                tempHp: 0,
                conditions: {},
                reactionAvailable: true,
                movementSpentFeet: 0,
                zeroHpLifecycle: {
                  policy: "usesDeathSavingThrows",
                  deathSaves: {
                    deathSaves: { successes: 0, failures: 0 },
                    stable: false,
                    dead: false,
                    hpRegained: false,
                  },
                },
                ammunitionStocks: [],
                origin: {
                  kind: "character",
                  resources: [],
                  spellcasting: { spellSlots: [] },
                },
              },
            ],
          ],
        },
        groundObjects: { $map: [] },
      },
    },
    battlefield: {
      spatial: {
        kind: "geometryDerived",
        arena: {},
        space: {
          placements: [{ token: "actor", coordinate: { x: 0, y: 0 } }],
        },
        tableAuthoredDecisions: [],
      },
      objects: [],
    },
  } as const;
  const callCount = input.callCount ?? 1;
  const header = {
    type: "sdk-player-header",
    scenarioId: "same",
    gitSha: transcriptGitSha,
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
    initialTurnProjection: {},
    initialTurnProjectionSha256: sha256Canonical({}),
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
  const parsedTranscript = parseSdkTranscript([header, ...calls]);
  if (parsedTranscript.tag === "invalid")
    throw new Error(parsedTranscript.message);
  const projections = reprojectSdkTranscriptTurns({
    calls: parsedTranscript.value.calls,
    holeEvidenceSource: { kind: "recordedCurrentRuntime" },
  });
  if (projections.tag === "invalid") throw new Error(projections.message);
  const executionArtifacts = (
    [
      [scenarioPath, scenario],
      [scenarioReviewPath, scenarioReview],
      [charactersPath, characters],
      [setupPath, setup],
      [programPath, program],
      [frozenPrefixPath, frozenPrefix],
      [observationPath, observation],
      [agentFinalPath, agentFinal],
      [finalPath, final],
    ] as const
  ).map(([path, content]) => {
    const artifact = sdkReviewPacketSource({
      path: relative(repoRoot, path),
      content,
    });
    if (artifact.tag === "invalid") throw new Error(artifact.message);
    return artifact.source;
  });
  const packet = encodeSdkReviewPacket({
    audit: audit.audit,
    retainedHeaderEvidence: sdkReviewPacketHeaderEvidence(
      parsedTranscript.value.header,
    ),
    currentTurnProjections: projections.projections,
    executionArtifacts,
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
  const reviewOutput: unknown = JSON.parse(readFileSync(reviewPath, "utf8"));
  const prePlayEntries = [0, 1].map(
    (
      index,
    ): Omit<
      CurrentModelInvocationLedgerEntry,
      "subject" | "gitSha" | "eventsSha256"
    > => ({
      schemaVersion: 4,
      phase: "scenarioCompositeReview",
      stagePlanReason: "The fixture stage requires a composite review.",
      invocationId: `pre-play-${index + 1}`,
      model: "gpt-5.6-luna",
      reasoningEffort: "max",
      startedAt: `2026-08-14T00:00:0${index}.000Z`,
      elapsedMilliseconds: 1,
      exit: { tag: "exited", status: 0 },
      result: { tag: "succeeded" },
      usage: {
        tag: "unavailable",
        reason:
          "The first-party event stream exposed no turn.completed usage object.",
      },
    }),
  );
  const ledgerEntryInputs = [...prePlayEntries, ...input.ledgerEntries];
  const eventEntryInputs = [
    ...prePlayEntries,
    ...(input.eventEntries ?? input.ledgerEntries),
  ];
  const eventPaths = ledgerEntryInputs.map((_, index) =>
    resolve(input.directory, `invocation-${index + 1}.events.jsonl`),
  );
  const invocationSubject = (
    phase: CurrentModelInvocationLedgerEntry["phase"],
    index: number,
  ) =>
    phase === "scenarioCompositeReview"
      ? {
          tag: "scenarioCandidate" as const,
          campaignId: "fixture-campaign",
          evidenceSetId: "fixture-evidence",
          candidateId: `fixture-candidate-${String(index + 1)}`,
          candidateScenarioSha256:
            index === 0 ? "b".repeat(64) : sha256Text(scenario),
          plannedScenarioId: "same",
        }
      : phase === "player" || phase === "postPlayReview"
        ? {
            tag: "execution" as const,
            executionId: "fixture-execution",
            evidenceSetId: "fixture-evidence",
            scenarioId: input.ledgerScenarioId ?? header.scenarioId,
          }
        : {
            tag: "scenario" as const,
            scenarioId: input.ledgerScenarioId ?? header.scenarioId,
          };
  ledgerEntryInputs.forEach((entry, index) => {
    const eventEntry = eventEntryInputs[index]!;
    const events = [
      eventValue(
        modelInvocationStartedEvent({
          subject: invocationSubject(eventEntry.phase, index),
          gitSha: invocationGitSha,
          phase: eventEntry.phase,
          stagePlanReason:
            eventEntry.stagePlanReason ??
            `The fixture ${eventEntry.phase} stage requires this invocation.`,
          fallbackInvocationId: eventEntry.invocationId,
          model: eventEntry.model,
          reasoningEffort: eventEntry.reasoningEffort,
          startedAt: eventEntry.startedAt,
        }),
      ),
      { type: "thread.started", thread_id: eventEntry.invocationId },
      ...(eventEntry.phase === "postPlayReview" &&
      input.postPlayUsesTool === true
        ? [
            {
              type: "item.completed",
              item: { type: "command_execution", command: "cat packet.json" },
            },
          ]
        : []),
      {
        type: "item.completed",
        item: {
          type: "agent_message",
          text: JSON.stringify(
            eventEntry.phase === "postPlayReview"
              ? reviewOutput
              : eventEntry.phase === "scenarioCompositeReview"
                ? {
                    result:
                      scenarioCompositeResults[
                        Number(eventEntry.invocationId.endsWith("2"))
                      ],
                  }
                : { tag: "complete" },
          ),
        },
      },
      ...(eventEntry.usage.tag === "available"
        ? [
            {
              type: "turn.completed",
              usage: {
                input_tokens:
                  eventEntry.usage.input.tag === "available"
                    ? eventEntry.usage.input.count
                    : undefined,
                cached_input_tokens:
                  eventEntry.usage.cachedInput.tag === "available"
                    ? eventEntry.usage.cachedInput.count
                    : undefined,
                cache_write_input_tokens:
                  eventEntry.usage.cacheWriteInput.tag === "available"
                    ? eventEntry.usage.cacheWriteInput.count
                    : undefined,
                output_tokens:
                  eventEntry.usage.output.tag === "available"
                    ? eventEntry.usage.output.count
                    : undefined,
                reasoning_output_tokens:
                  eventEntry.usage.reasoningOutput.tag === "available"
                    ? eventEntry.usage.reasoningOutput.count
                    : undefined,
              },
            },
          ]
        : []),
      eventValue(
        modelInvocationCompletedEvent({
          elapsedMilliseconds: eventEntry.elapsedMilliseconds,
          exit: eventEntry.exit,
          result:
            eventEntry.result ??
            (eventEntry.exit.tag === "exited" && eventEntry.exit.status === 0
              ? { tag: "succeeded" }
              : {
                  tag: "failed",
                  reason: "The fixture invocation exited unsuccessfully.",
                }),
        }),
      ),
    ];
    const eventBytes = `${events.map((event) => JSON.stringify(event)).join("\n")}\n`;
    writeFileSync(eventPaths[index]!, eventBytes);
    const replayInputPath = replayPrePlayReviewInputPaths[index];
    if (replayInputPath !== undefined) {
      writeFileSync(
        `${replayInputPath.slice(0, -".json".length)}.events.jsonl`,
        eventBytes,
      );
    }
  });
  const ledgerEntries = ledgerEntryInputs.map((entry, index) => ({
    ...entry,
    subject: invocationSubject(entry.phase, index),
    gitSha: invocationGitSha,
    eventsSha256: invocationEventsSha256(eventPaths[index]!),
  }));
  writeFileSync(
    ledgerPath,
    `${ledgerEntries.map((entry) => JSON.stringify(entry)).join("\n")}\n`,
  );
  writeReviewInvocationEvidenceManifest({
    transcriptPath,
    reviewPath,
    auditPath,
    packetPath,
    prePlayReviewPaths: [
      {
        sourceInputPath: sourcePrePlayReviewInputPaths[0],
        replayInputPath: replayPrePlayReviewInputPaths[0],
      },
      {
        sourceInputPath: sourcePrePlayReviewInputPaths[1],
        replayInputPath: replayPrePlayReviewInputPaths[1],
      },
    ],
    invocationLedgerPaths: [ledgerPath],
    invocationEventPaths: eventPaths,
    outputPath: manifestPath,
  });
  return {
    transcriptPath,
    reviewPath,
    auditPath,
    packetPath,
    ledgerPath,
    eventPaths,
    manifestPath,
    sourcePrePlayReviewInputPaths,
    replayPrePlayReviewInputPaths,
    header,
    calls,
  };
}
