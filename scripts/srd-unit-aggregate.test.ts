import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import {
  buildSrdUnitAggregateModule,
  SRD_UNIT_PUBLICATION_MEMBERSHIP_RELATIVE_PATH,
} from "./srd-unit-aggregate.ts";

describe("SRD Unit aggregate membership", () => {
  it("selects canonical Unit peers in the declared publication order", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "srd-unit-aggregate-"));
    try {
      copyCanonicalPeer(repoRoot, "aid");
      copyCanonicalPeer(repoRoot, "bless");
      copyCanonicalPeer(repoRoot, "stat_block_giant_frog");
      writeMembership(repoRoot, ["bless", "aid"]);

      const aggregate = buildSrdUnitAggregateModule(repoRoot);

      expect(aggregate).toContain(
        'import unitPeer0 from "../../../content/aid.json";',
      );
      expect(aggregate).toContain(
        'import unitPeer1 from "../../../content/bless.json";',
      );
      expect(aggregate).not.toContain("stat_block_giant_frog.json");
      expect(aggregate.match(/^  unitPeer\d+(?:\[\d+\])?,/gm)).toEqual([
        "  unitPeer1,",
        "  unitPeer0,",
      ]);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects duplicate publication identities", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "srd-unit-aggregate-"));
    try {
      copyCanonicalPeer(repoRoot, "bless");
      writeMembership(repoRoot, ["bless", "bless"]);

      expect(() => buildSrdUnitAggregateModule(repoRoot)).toThrow(
        "Duplicate SRD Unit publication member bless",
      );
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects publication identities without canonical peers", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "srd-unit-aggregate-"));
    try {
      copyCanonicalPeer(repoRoot, "bless");
      writeMembership(repoRoot, ["synthetic_missing_unit"]);

      expect(() => buildSrdUnitAggregateModule(repoRoot)).toThrow(
        "SRD Unit publication member synthetic_missing_unit has no canonical strict JSON peer",
      );
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});

function copyCanonicalPeer(repoRoot: string, baseName: string): void {
  const targetDirectory = join(repoRoot, "packages", "surface", "content");
  mkdirSync(targetDirectory, { recursive: true });
  for (const extension of ["dhall", "json"] as const) {
    writeFileSync(
      join(targetDirectory, `${baseName}.${extension}`),
      readFileSync(`packages/surface/content/${baseName}.${extension}`),
    );
  }
}

function writeMembership(repoRoot: string, unitIds: readonly string[]): void {
  const membershipPath = join(
    repoRoot,
    SRD_UNIT_PUBLICATION_MEMBERSHIP_RELATIVE_PATH,
  );
  mkdirSync(dirname(membershipPath), { recursive: true });
  writeFileSync(
    membershipPath,
    `${JSON.stringify(
      { schema: "dnd.srd-unit-publication-membership.v1", unitIds },
      null,
      2,
    )}\n`,
  );
}
