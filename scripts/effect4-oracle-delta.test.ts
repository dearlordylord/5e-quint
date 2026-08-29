import { readFileSync } from "node:fs";

import { Result } from "effect";
import { describe, expect, test } from "vitest";

import {
  EFFECT4_ORACLE_DELTA_CERTIFICATE_PATH,
  calculateOracleDeltaEvidence,
  classifyOracleDeltas,
  compareOracleDeltaCertificate,
  decodeOracleDeltaCertificate,
  type OracleDelta,
  type OracleDeltaCategory,
} from "./effect4-oracle-delta.ts";

const changedDelta = (segments: readonly string[]): OracleDelta => ({
  operation: "changed",
  path: `/${segments.join("/")}`,
  segments,
  baseline: { tag: "present", sha256: "a".repeat(64) },
  candidate: { tag: "present", sha256: "b".repeat(64) },
});

describe("Effect 4 finite oracle delta", () => {
  test("rejects duplicate delta identities", () => {
    const delta = changedDelta(["rawSwarm", "artifacts", "0"]);
    const result = classifyOracleDeltas([delta, delta]);
    expect(result).toMatchObject({
      tag: "invalid",
      issues: [{ kind: "duplicate-delta", path: delta.path }],
    });
  });

  test("rejects unclassified and multiply classified identities", () => {
    expect(
      classifyOracleDeltas([changedDelta(["unexpected", "value"])]),
    ).toMatchObject({
      tag: "invalid",
      issues: [{ kind: "unclassified-delta" }],
    });

    const overlapping: readonly OracleDeltaCategory[] = [
      { id: "first", matches: () => true },
      { id: "second", matches: () => true },
    ];
    expect(
      classifyOracleDeltas(
        [changedDelta(["rawSwarm", "artifacts", "0"])],
        overlapping,
      ),
    ).toMatchObject({
      tag: "invalid",
      issues: [
        {
          kind: "multiply-classified-delta",
          classificationIds: ["first", "second"],
        },
      ],
    });
  });

  test("rejects stale baseline, candidate, and classified delta evidence", () => {
    const decoded = decodeOracleDeltaCertificate(
      JSON.parse(readFileSync(EFFECT4_ORACLE_DELTA_CERTIFICATE_PATH, "utf8")),
    );
    expect(Result.isSuccess(decoded)).toBe(true);
    if (Result.isFailure(decoded)) return;
    const certificate = decoded.success;
    const staleEvidence = {
      baseline: {
        ...certificate.baseline.artifact,
        byteLength: certificate.baseline.artifact.byteLength + 1,
      },
      candidate: {
        ...certificate.candidate,
        byteLength: certificate.candidate.byteLength + 1,
      },
      delta: {
        totalCount: certificate.delta.totalCount + 1,
        identitySha256: certificate.delta.identitySha256,
        identities: certificate.delta.identities,
        classifications: certificate.delta.classifications,
      },
    };
    expect(compareOracleDeltaCertificate(certificate, staleEvidence)).toEqual([
      {
        kind: "baseline-certificate-stale",
        message:
          "immutable baseline digest does not match the reviewed certificate",
      },
      {
        kind: "candidate-certificate-stale",
        message: "candidate digest does not match the reviewed certificate",
      },
      {
        kind: "delta-certificate-stale",
        message:
          "classified delta identities, counts, or hashes do not match the reviewed certificate",
      },
    ]);
  });

  test("rejects a stale reviewed identity even when aggregate evidence is unchanged", () => {
    const decoded = decodeOracleDeltaCertificate(
      JSON.parse(readFileSync(EFFECT4_ORACLE_DELTA_CERTIFICATE_PATH, "utf8")),
    );
    expect(Result.isSuccess(decoded)).toBe(true);
    if (Result.isFailure(decoded)) return;
    const certificate = decoded.success;
    const firstIdentity = certificate.delta.identities[0];
    expect(firstIdentity).toBeDefined();
    if (firstIdentity === undefined) return;
    expect(
      compareOracleDeltaCertificate(certificate, {
        baseline: certificate.baseline.artifact,
        candidate: certificate.candidate,
        delta: {
          totalCount: certificate.delta.totalCount,
          identitySha256: certificate.delta.identitySha256,
          identities: [
            { ...firstIdentity, path: `${firstIdentity.path}/stale` },
            ...certificate.delta.identities.slice(1),
          ],
          classifications: certificate.delta.classifications,
        },
      }),
    ).toEqual([
      {
        kind: "delta-certificate-stale",
        message:
          "classified delta identities, counts, or hashes do not match the reviewed certificate",
      },
    ]);
  });

  test("records stable classes as zero-count fail-closed evidence", () => {
    const result = calculateOracleDeltaEvidence(
      { reducers: { characterCreation: { value: 1 } } },
      { reducers: { characterCreation: { value: 1 } } },
    );
    expect(result.tag).toBe("evidence");
    if (result.tag === "invalid") return;
    expect(
      result.value.delta.classifications.find(
        ({ id }) => id === "reducer-character-creation",
      ),
    ).toMatchObject({
      deltaCount: 0,
      operations: { added: 0, removed: 0, changed: 0 },
    });
  });
});
