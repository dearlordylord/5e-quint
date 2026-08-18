import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

import { afterEach } from "vitest";
import { describe, expect, test } from "vitest";

import { preflightSdkTranscript, type SdkAudit } from "./sdk-audit.ts";
import { catalogSections } from "./sdk-review-packet-cli.ts";
import {
  encodeSdkReviewPacket,
  sdkReviewPacketHeaderEvidence,
  sdkReviewPacketSource,
  validateSdkReviewPacket,
} from "./sdk-review-packet.ts";
import { parseSdkTranscript } from "./sdk-transcript.ts";
import { reprojectSdkTranscriptTurns } from "./player-turn-projection.ts";
import { repoRoot, sha256Canonical, sha256Text } from "../transcript.ts";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

const audit: SdkAudit = {
  header: {
    type: "sdk-audit-header",
    schemaVersion: 1,
    scenarioId: "packet-example",
    scenarioSha256: "1".repeat(64),
    scenarioReviewSha256: "2".repeat(64),
    charactersSha256: "3".repeat(64),
    characterOutcome: "ready",
    setupOutcome: "ready",
    setupSha256: "4".repeat(64),
    gitSha: "a".repeat(40),
    startedAt: "2026-08-17T00:00:00.000Z",
    transcriptPath: "out/example/evidence/sdk-calls.jsonl",
    transcriptByteLength: 100,
    transcriptSha256: "5".repeat(64),
    replaySupervisorSha256: "6".repeat(64),
    initialSessionSha256: "7".repeat(64),
  },
  calls: [],
};

function validatedPacketFixture() {
  const directory = mkdtempSync(
    resolve(repoRoot, "scripts/raw-swarm/out/sdk-review-packet-test-"),
  );
  temporaryDirectories.push(directory);
  const evidenceDirectory = resolve(directory, "evidence");
  const transcriptPath = resolve(evidenceDirectory, "sdk-calls.jsonl");
  mkdirSync(evidenceDirectory, { recursive: true });
  const supervisor = "export const replay = true;\n";
  writeFileSync(resolve(directory, "replay-supervisor.mjs"), supervisor);
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
      space: {
        placements: [{ token: "actor", coordinate: { x: 0, y: 0 } }],
      },
      objects: [],
    },
  } as const;
  const header = {
    type: "sdk-player-header",
    scenarioId: "packet-fixture",
    gitSha: "a".repeat(40),
    startedAt: "2026-08-17T00:00:00.000Z",
    consumerIsolation: "instructionalFallback",
    replaySupervisorSha256: sha256Text(supervisor),
    scenarioSha256: "1".repeat(64),
    scenarioReviewSha256: "2".repeat(64),
    charactersSha256: "3".repeat(64),
    characterOutcome: "ready",
    characterSheets: [],
    characterSheetsSha256: sha256Canonical([]),
    characterObservation: { outcome: "ready" },
    setupSha256: "4".repeat(64),
    setupOutcome: "ready",
    initialSession: session,
    initialSessionSha256: sha256Canonical(session),
    setupObservation: { outcome: "ready" },
  } as const;
  const result = [] as const;
  const call = {
    type: "sdk-call",
    seq: 1,
    continuation: 1,
    operation: "discoverBattleActs",
    inputSession: session,
    inputSessionSha256: sha256Canonical(session),
    input: {},
    outcome: "returned",
    outputSession: session,
    outputSessionSha256: sha256Canonical(session),
    result,
    resultSha256: sha256Canonical(result),
  } as const;
  const transcript = `${JSON.stringify(header)}\n${JSON.stringify(call)}\n`;
  writeFileSync(transcriptPath, transcript);
  const verified = preflightSdkTranscript({ transcriptPath });
  if (verified.tag === "invalid") throw new Error(verified.message);
  const parsed = parseSdkTranscript([header, call]);
  if (parsed.tag === "invalid") throw new Error(parsed.message);
  const projections = reprojectSdkTranscriptTurns(parsed.value.calls);
  if (projections.tag === "invalid") throw new Error(projections.message);
  const sourceContent = readFileSync(
    resolve(repoRoot, "ASSUMPTIONS.md"),
    "utf8",
  );
  const source = sdkReviewPacketSource({
    path: "ASSUMPTIONS.md",
    content: sourceContent,
  });
  const packet = encodeSdkReviewPacket({
    audit: verified.audit,
    retainedHeaderEvidence: sdkReviewPacketHeaderEvidence(parsed.value.header),
    currentTurnProjections: projections.projections,
    runArtifacts: [],
    domainAuthorities: [],
    rawAuthorities: [source],
  });
  if (packet.tag === "invalid") throw new Error(packet.message);
  return { audit: verified.audit, packet: packet.packet, source };
}

describe("SDK review packet", () => {
  test("retains numbered hash-linked authorities deterministically", () => {
    const raw = sdkReviewPacketSource({
      path: ".references/srd-5.2.1/Example.md",
      content: "first\nsecond\n",
    });
    expect(raw).toMatchObject({
      path: ".references/srd-5.2.1/Example.md",
      byteLength: 13,
      firstLine: 1,
      numberedContent: "1|first\n2|second\n3|",
    });
    expect(raw.sha256).toMatch(/^[0-9a-f]{64}$/);
    const first = encodeSdkReviewPacket({
      audit,
      retainedHeaderEvidence: { characterOutcome: "ready" },
      currentTurnProjections: [],
      runArtifacts: [],
      domainAuthorities: [],
      rawAuthorities: [raw],
    });
    const second = encodeSdkReviewPacket({
      audit,
      retainedHeaderEvidence: { characterOutcome: "ready" },
      currentTurnProjections: [],
      runArtifacts: [],
      domainAuthorities: [],
      rawAuthorities: [raw],
    });
    expect(first).toEqual(second);
    expect(first.tag).toBe("valid");
  });

  test("rejects rather than truncating an oversized packet", () => {
    const result = encodeSdkReviewPacket({
      audit,
      retainedHeaderEvidence: {},
      currentTurnProjections: [],
      runArtifacts: [],
      domainAuthorities: [],
      rawAuthorities: [
        sdkReviewPacketSource({ path: "large.md", content: "x".repeat(100) }),
      ],
      maximumByteLength: 10,
    });
    expect(result).toMatchObject({
      tag: "invalid",
      reason: "packetTooLarge",
      maximumByteLength: 10,
    });
  });

  test("rejects an empty projection when the exact transcript has a turn", () => {
    const fixture = validatedPacketFixture();
    expect(
      validateSdkReviewPacket(
        { ...fixture.packet, currentTurnProjections: [] },
        fixture.audit,
      ),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Review evidence packet current-turn projections do not match the exact transcript.",
    });
  });

  test("rejects forged projection content from the exact transcript", () => {
    const fixture = validatedPacketFixture();
    const projection = fixture.packet.currentTurnProjections[0];
    if (projection === undefined) throw new Error("projection fixture missing");
    expect(
      validateSdkReviewPacket(
        {
          ...fixture.packet,
          currentTurnProjections: [
            { ...projection, continuation: projection.continuation + 1 },
          ],
        },
        fixture.audit,
      ),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Review evidence packet current-turn projections do not match the exact transcript.",
    });
  });

  test("rejects forged retained header evidence", () => {
    const fixture = validatedPacketFixture();
    expect(
      validateSdkReviewPacket(
        {
          ...fixture.packet,
          retainedHeaderEvidence: { characterOutcome: "obstructed" },
        },
        fixture.audit,
      ),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Review evidence packet retained header evidence does not match the exact transcript.",
    });
  });

  test("rejects forged numbered source content", () => {
    const fixture = validatedPacketFixture();
    const forged = {
      ...fixture.source,
      numberedContent: fixture.source.numberedContent.replace(/\|/, "|forged "),
    };
    expect(
      validateSdkReviewPacket(
        {
          ...fixture.packet,
          rawAuthorities: [forged],
        },
        fixture.audit,
      ),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Review evidence packet contains a numbered source that does not match its canonical repository file.",
    });
  });

  test("selects exact authored catalog headings without substring matches", () => {
    const selected = catalogSections({
      path: ".references/srd-5.2.1/Animals.md",
      content: [
        "# Animals",
        "## Cat",
        "Cat facts.",
        "## Wolf",
        "Wolf facts.",
        "### Actions",
        "Bite facts.",
        "## Giant Wolf Spider",
        "Spider facts.",
      ].join("\n"),
      scenarioEvidence:
        "The catalog projection selects stat_block_wolf for Wolf A.",
    });
    expect(selected).toHaveLength(1);
    expect(selected[0]).toMatchObject({
      path: ".references/srd-5.2.1/Animals.md",
      firstLine: 4,
      numberedContent: "4|## Wolf\n5|Wolf facts.\n6|### Actions\n7|Bite facts.",
    });
  });
});
