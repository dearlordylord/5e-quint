import { describe, expect, test } from "vitest";

import {
  parseProofShardEnvironment,
  selectProofModulesForShard,
} from "./qnt-proof-harness.ts";

describe("QNT proof shard selection", () => {
  test("keeps the default proof lane whole when no shard is configured", () => {
    const modules = ["a.qnt", "b.qnt", "c.qnt"] as const;

    expect(parseProofShardEnvironment({})).toBeUndefined();
    expect(selectProofModulesForShard(modules, undefined)).toBe(modules);
  });

  test("partitions modules deterministically without overlap", () => {
    const modules = [
      "a.qnt",
      "b.qnt",
      "c.qnt",
      "d.qnt",
      "e.qnt",
      "f.qnt",
      "g.qnt",
    ] as const;
    const shardCount = 3;
    const shards = Array.from({ length: shardCount }, (_, index) =>
      selectProofModulesForShard(modules, { index, count: shardCount }),
    );

    expect(shards).toEqual([
      ["a.qnt", "d.qnt", "g.qnt"],
      ["b.qnt", "e.qnt"],
      ["c.qnt", "f.qnt"],
    ]);
    expect(new Set(shards.flat())).toEqual(new Set(modules));
  });

  test("parses and validates CI shard configuration", () => {
    expect(
      parseProofShardEnvironment({
        QNT_PROOF_SHARD_INDEX: "2",
        QNT_PROOF_SHARD_COUNT: "4",
      }),
    ).toEqual({ index: 2, count: 4 });
    expect(
      parseProofShardEnvironment({
        QNT_PROOF_SHARD_INDEX: "",
        QNT_PROOF_SHARD_COUNT: "",
      }),
    ).toBeUndefined();
    expect(() =>
      parseProofShardEnvironment({
        QNT_PROOF_SHARD_INDEX: "4",
        QNT_PROOF_SHARD_COUNT: "4",
      }),
    ).toThrow(/index must be less than count/);
  });
});
