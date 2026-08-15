import { describe, expect, test } from "vitest";

import type { SdkAudit } from "./sdk-audit.ts";
import { catalogSections } from "./sdk-review-packet-cli.ts";
import {
  encodeSdkReviewPacket,
  sdkReviewPacketSource,
} from "./sdk-review-packet.ts";

const audit: SdkAudit = {
  header: {
    type: "sdk-audit-header",
    schemaVersion: 1,
    scenarioId: "packet-example",
    scenarioSha256: "1".repeat(64),
    scenarioReviewSha256: "2".repeat(64),
    charactersSha256: "3".repeat(64),
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

describe("bounded SDK review packet", () => {
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
