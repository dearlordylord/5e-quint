import { describe, expect, it } from "vitest";

import {
  checkSrdStatBlockAggregateSync,
  evaluateSrdStatBlockAggregateSync,
} from "./check-srd-stat-block-aggregate.ts";
import { SRD_STAT_BLOCK_AGGREGATE_RELATIVE_PATH } from "./srd-stat-block-aggregate.ts";

describe("SRD Stat Block aggregate synchronization", () => {
  it("accepts the canonical RAW-ordered aggregate", () => {
    expect(checkSrdStatBlockAggregateSync(process.cwd())).toEqual({
      tag: "synchronized",
    });
  });

  it("rejects byte drift", () => {
    expect(
      evaluateSrdStatBlockAggregateSync(
        { tag: "available", bytes: Buffer.from("expected\n") },
        { tag: "available", bytes: Buffer.from("installed\n") },
      ),
    ).toEqual({
      tag: "unsynchronized",
      issues: [
        {
          kind: "aggregate-out-of-sync",
          file: SRD_STAT_BLOCK_AGGREGATE_RELATIVE_PATH,
        },
      ],
    });
  });

  it("accumulates independent generation and installed-artifact failures", () => {
    expect(
      evaluateSrdStatBlockAggregateSync(
        { tag: "unavailable", message: "synthetic generation failure" },
        { tag: "unavailable", message: "synthetic read failure" },
      ),
    ).toEqual({
      tag: "unsynchronized",
      issues: [
        {
          kind: "aggregate-generation-failed",
          file: SRD_STAT_BLOCK_AGGREGATE_RELATIVE_PATH,
          message: "synthetic generation failure",
        },
        {
          kind: "aggregate-unreadable",
          file: SRD_STAT_BLOCK_AGGREGATE_RELATIVE_PATH,
          message: "synthetic read failure",
        },
      ],
    });
  });
});
