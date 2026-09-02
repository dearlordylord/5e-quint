import { describe, expect, test } from "vitest";

import {
  projectSrdStatBlockPeerObservation,
  type SurfacePublicationPeerObservation,
} from "./surface-publication-peer-observation.ts";

describe("SRD Stat Block publication peer observations", () => {
  test.each([
    ["other", undefined],
    ["unknown", undefined],
  ] as const)("rejects the %s publication family", (recordKind, expected) => {
    const observation = {
      tag: "present",
      recordKind,
      sourcePath: "synthetic/source.ts",
      peerPath: "synthetic/peer.json",
    } satisfies SurfacePublicationPeerObservation;

    expect(projectSrdStatBlockPeerObservation(observation)).toBe(expected);
  });

  test("preserves a Stat Block publication observation", () => {
    const observation = {
      tag: "present",
      recordKind: "statBlock",
      sourcePath: "synthetic/stat-block.ts",
      peerPath: "synthetic/stat-block.json",
    } as const satisfies SurfacePublicationPeerObservation;

    expect(projectSrdStatBlockPeerObservation(observation)).toBe(observation);
  });
});
