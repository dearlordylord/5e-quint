import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, relative, resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { sha256Canonical, sha256Text } from "../transcript.ts";
import {
  extractSdkTranscriptSequences,
  preflightSdkTranscript,
  sdkAuditTranscript,
  writeSdkAudit,
} from "./sdk-audit.ts";

function fixture() {
  const initialSession = { battle: { round: 1, hp: 10 } };
  const outputSession = { battle: { round: 1, hp: 6 } };
  const result = {
    tag: "needsHoles",
    session: outputSession,
    snapshot: { large: "omitted" },
    holes: [{ kind: "damageRoll", label: "Damage", choices: [1, 2] }],
  };
  const header = {
    type: "sdk-player-header",
    scenarioId: "audit-example",
    gitSha: "a".repeat(40),
    startedAt: "2026-08-14T00:00:00.000Z",
    consumerIsolation: "instructionalFallback",
    replaySupervisorSha256: "b".repeat(64),
    scenarioSha256: "c".repeat(64),
    scenarioReviewSha256: "d".repeat(64),
    charactersSha256: "e".repeat(64),
    characterObservation: {},
    characterOutcome: "ready",
    characterSheets: [],
    characterSheetsSha256: sha256Canonical([]),
    setupSha256: "1".repeat(64),
    setupObservation: {},
    setupOutcome: "ready",
    initialSession,
    initialSessionSha256: sha256Canonical(initialSession),
  } as const;
  const call = {
    type: "sdk-call",
    seq: 1,
    continuation: 1,
    operation: "resolveBattleRuntimeSubject",
    inputSession: initialSession,
    inputSessionSha256: sha256Canonical(initialSession),
    input: { subject: { tag: "action", actorId: "a" }, fills: [] },
    outcome: "returned",
    outputSession,
    outputSessionSha256: sha256Canonical(outputSession),
    result,
    resultSha256: sha256Canonical(result),
  } as const;
  return { header, call };
}

describe("SDK player derived audit evidence", () => {
  test("retains readiness outcomes as discriminated audit header state", () => {
    const { header } = fixture();
    const common = {
      type: header.type,
      scenarioId: header.scenarioId,
      gitSha: header.gitSha,
      startedAt: header.startedAt,
      consumerIsolation: header.consumerIsolation,
      replaySupervisorSha256: header.replaySupervisorSha256,
      scenarioSha256: header.scenarioSha256,
      scenarioReviewSha256: header.scenarioReviewSha256,
      charactersSha256: header.charactersSha256,
    } as const;
    const characterObstructed = sdkAuditTranscript({
      records: [
        {
          ...common,
          characterObservation: {},
          characterOutcome: "obstructed" as const,
          obstruction: "characters unavailable",
        },
      ],
      transcriptPath: "scripts/raw-swarm/out/audit/evidence/sdk-calls.jsonl",
      transcriptByteLength: 123,
      transcriptSha256: "3".repeat(64),
      replaySupervisorSha256: "b".repeat(64),
    });
    expect(characterObstructed).toMatchObject({
      tag: "valid",
      audit: {
        header: { characterOutcome: "obstructed" },
        calls: [],
      },
    });

    const {
      initialSession: _initialSession,
      initialSessionSha256: _initialSessionSha256,
      ...withoutInitialSession
    } = header;
    const setupObstructed = sdkAuditTranscript({
      records: [
        {
          ...withoutInitialSession,
          setupOutcome: "obstructed" as const,
          obstruction: "setup unavailable",
        },
      ],
      transcriptPath: "scripts/raw-swarm/out/audit/evidence/sdk-calls.jsonl",
      transcriptByteLength: 123,
      transcriptSha256: "3".repeat(64),
      replaySupervisorSha256: "b".repeat(64),
    });
    expect(setupObstructed).toMatchObject({
      tag: "valid",
      audit: {
        header: {
          characterOutcome: "ready",
          setupOutcome: "obstructed",
          setupSha256: header.setupSha256,
        },
        calls: [],
      },
    });
  });

  test("retains canonical inputs and typed review facts without sessions or full results", () => {
    const { header, call } = fixture();
    const audit = sdkAuditTranscript({
      records: [header, call],
      transcriptPath: "scripts/raw-swarm/out/audit/evidence/sdk-calls.jsonl",
      transcriptByteLength: 123,
      transcriptSha256: "3".repeat(64),
      replaySupervisorSha256: "b".repeat(64),
    });

    expect(audit.tag).toBe("valid");
    if (audit.tag !== "valid") return;
    expect(audit.audit.header).toMatchObject({
      characterOutcome: "ready",
      setupOutcome: "ready",
      setupSha256: header.setupSha256,
      initialSessionSha256: header.initialSessionSha256,
    });
    expect(audit.audit.calls[0]).toMatchObject({
      seq: 1,
      input: { subject: { tag: "action", actorId: "a" }, fills: [] },
      outcome: "returned",
      outputSessionSha256: call.outputSessionSha256,
      resultSha256: call.resultSha256,
      reviewFacts: {
        kind: "resolution",
        tag: "needsHoles",
        holes: [{ kind: "damageRoll", label: "Damage", choiceCount: 2 }],
      },
    });
    const encoded = JSON.stringify(audit.audit);
    expect(encoded).not.toContain('inputSession"');
    expect(encoded).not.toContain('outputSession"');
    expect(encoded).not.toContain('large":"omitted');

    const thrownCall = {
      type: call.type,
      seq: call.seq,
      continuation: call.continuation,
      operation: call.operation,
      inputSession: call.inputSession,
      inputSessionSha256: call.inputSessionSha256,
      input: call.input,
      outcome: "threw" as const,
      rejection: "operationFailure" as const,
      error: { name: "Error", message: "operation failed" },
    };
    const thrownAudit = sdkAuditTranscript({
      records: [header, thrownCall],
      transcriptPath: "scripts/raw-swarm/out/audit/evidence/sdk-calls.jsonl",
      transcriptByteLength: 123,
      transcriptSha256: "3".repeat(64),
      replaySupervisorSha256: "b".repeat(64),
    });
    expect(thrownAudit).toMatchObject({
      tag: "valid",
      audit: {
        calls: [
          {
            outcome: "threw",
            rejection: "operationFailure",
            reviewFacts: { kind: "error", rejection: "operationFailure" },
          },
        ],
      },
    });

    const invalidFillResult = {
      tag: "invalid",
      reason: "invalidFill",
      message: "The supplied roll mode is invalid.",
      session: call.outputSession,
    };
    expect(
      sdkAuditTranscript({
        records: [
          header,
          {
            ...call,
            result: invalidFillResult,
            resultSha256: sha256Canonical(invalidFillResult),
          },
        ],
        transcriptPath: "scripts/raw-swarm/out/audit/evidence/sdk-calls.jsonl",
        transcriptByteLength: 123,
        transcriptSha256: "3".repeat(64),
        replaySupervisorSha256: "b".repeat(64),
      }),
    ).toMatchObject({
      tag: "valid",
      audit: {
        calls: [
          {
            reviewFacts: {
              kind: "resolution",
              tag: "invalid",
              reason: "invalidFill",
              message: "The supplied roll mode is invalid.",
            },
          },
        ],
      },
    });

    const malformedResult = { ...call.result, holes: [{}] };
    expect(
      sdkAuditTranscript({
        records: [
          header,
          {
            ...call,
            result: malformedResult,
            resultSha256: sha256Canonical(malformedResult),
          },
        ],
        transcriptPath: "scripts/raw-swarm/out/audit/evidence/sdk-calls.jsonl",
        transcriptByteLength: 123,
        transcriptSha256: "3".repeat(64),
        replaySupervisorSha256: "b".repeat(64),
      }).tag,
    ).toBe("invalid");
    const hugeResult = {
      ...call.result,
      holes: [{ kind: "damageRoll", label: "x".repeat(20_000) }],
    };
    expect(
      sdkAuditTranscript({
        records: [
          header,
          {
            ...call,
            result: hugeResult,
            resultSha256: sha256Canonical(hugeResult),
          },
        ],
        transcriptPath: "scripts/raw-swarm/out/audit/evidence/sdk-calls.jsonl",
        transcriptByteLength: 123,
        transcriptSha256: "3".repeat(64),
        replaySupervisorSha256: "b".repeat(64),
      }).tag,
    ).toBe("invalid");
    for (const malformedResult of [
      { tag: "unknownResolution" },
      { tag: "needsHoles" },
      { tag: "resolved", reason: 12 },
      { tag: "scenarioSessionConflict" },
      { tag: "resolved", issue: { tag: "unexpected" } },
    ]) {
      expect(
        sdkAuditTranscript({
          records: [
            header,
            {
              ...call,
              result: malformedResult,
              resultSha256: sha256Canonical(malformedResult),
            },
          ],
          transcriptPath:
            "scripts/raw-swarm/out/audit/evidence/sdk-calls.jsonl",
          transcriptByteLength: 123,
          transcriptSha256: "3".repeat(64),
          replaySupervisorSha256: "b".repeat(64),
        }).tag,
      ).toBe("invalid");
    }
  });

  test("rejects an AvailableBattleAct with missing initial holes", () => {
    const { header, call } = fixture();
    const discoveryCall = {
      ...call,
      operation: "discoverBattleActs" as const,
      input: {},
      result: [
        {
          subject: { tag: "runtimeCommand", actorId: "a", command: "move" },
          label: "Move",
          summary: "Use Move.",
          presentation: { kind: "intrinsic" },
        },
      ],
      resultSha256: sha256Canonical([
        {
          subject: {
            tag: "runtimeCommand",
            actorId: "a",
            command: "move",
          },
          label: "Move",
          summary: "Use Move.",
          presentation: { kind: "intrinsic" },
        },
      ]),
    };
    expect(
      sdkAuditTranscript({
        records: [header, discoveryCall],
        transcriptPath: "scripts/raw-swarm/out/audit/evidence/sdk-calls.jsonl",
        transcriptByteLength: 123,
        transcriptSha256: "3".repeat(64),
        replaySupervisorSha256: "b".repeat(64),
      }),
    ).toEqual({
      tag: "invalid",
      message: "SDK call seq 1 cannot be projected into typed audit facts.",
    });
  });

  test("preflights immutable bytes and extracts exact sequences with provenance", () => {
    const directory = mkdtempSync(resolve(tmpdir(), "sdk-audit-"));
    const transcriptPath = resolve(directory, "evidence/sdk-calls.jsonl");
    const supervisorPath = resolve(directory, "replay-supervisor.mjs");
    mkdirSync(dirname(transcriptPath), { recursive: true });
    const { header, call } = fixture();
    writeFileSync(supervisorPath, "export {};\n");
    const correctedHeader = {
      ...header,
      replaySupervisorSha256: sha256Text("export {};\n"),
    };
    const transcript = `${JSON.stringify(correctedHeader)}\n${JSON.stringify(call)}\n`;
    writeFileSync(transcriptPath, transcript);
    const relativePath = relative(process.cwd(), transcriptPath);

    const preflight = preflightSdkTranscript({ transcriptPath: relativePath });
    expect(preflight.tag).toBe("valid");
    if (preflight.tag !== "valid") return;
    const auditPath = resolve(directory, "audit.jsonl");
    writeSdkAudit(auditPath, preflight.audit);
    expect(
      readFileSync(auditPath, "utf8").split("\n").filter(Boolean),
    ).toHaveLength(2);

    const extraction = extractSdkTranscriptSequences({
      audit: preflight.audit,
      sequences: [1],
    });
    expect(extraction).toMatchObject({
      tag: "valid",
      provenance: {
        requestedSequences: [1],
        extractedRecordsByteLength: Buffer.byteLength(
          `${JSON.stringify(call)}\n`,
        ),
        records: [
          {
            seq: 1,
            operation: "resolveBattleRuntimeSubject",
            extractedByteLength: Buffer.byteLength(JSON.stringify(call)),
          },
        ],
      },
    });
    if (extraction.tag === "valid") {
      expect(extraction.encodedRecords).toBe(`${JSON.stringify(call)}\n`);
    }
    writeFileSync(transcriptPath, `${transcript}changed\n`);
    expect(
      extractSdkTranscriptSequences({ audit: preflight.audit, sequences: [1] }),
    ).toEqual({
      tag: "invalid",
      message: "SDK transcript byte length changed.",
    });
    writeFileSync(transcriptPath, "{not-json}\n");
    expect(preflightSdkTranscript({ transcriptPath: relativePath })).toEqual({
      tag: "invalid",
      message: "SDK evidence contains malformed JSONL.",
    });
    writeFileSync(transcriptPath, transcript);
    rmSync(supervisorPath);
    expect(preflightSdkTranscript({ transcriptPath: relativePath })).toEqual({
      tag: "invalid",
      message: "SDK replay supervisor artifact is unreadable.",
    });
  });
});
