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

import { buildSrdStatBlockAggregateModule } from "./srd-stat-block-aggregate.ts";
import { SRD_STAT_BLOCK_SOURCE_PATHS } from "./srd521-stat-block-parity.ts";

describe("SRD Stat Block aggregate discovery", () => {
  it("selects strictly decoded Stat Blocks from canonical peers without a filename prefix", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "srd-stat-block-aggregate-"));
    try {
      for (const sourcePath of SRD_STAT_BLOCK_SOURCE_PATHS) {
        const target = join(repoRoot, sourcePath);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, readFileSync(sourcePath));
      }

      const contentDirectory = join(repoRoot, "packages", "surface", "content");
      mkdirSync(contentDirectory, { recursive: true });
      writeFileSync(join(contentDirectory, "animal_peer.dhall"), "{=}");
      writeFileSync(
        join(contentDirectory, "animal_peer.json"),
        readFileSync("packages/surface/content/stat_block_giant_frog.json"),
      );
      writeFileSync(join(contentDirectory, "mixed_other.dhall"), "{=}");
      writeFileSync(
        join(contentDirectory, "mixed_other.json"),
        readFileSync("packages/surface/content/bless.json"),
      );

      const aggregate = buildSrdStatBlockAggregateModule(repoRoot);

      expect(aggregate).toContain(
        'import statBlockPeer0 from "../../../content/animal_peer.json";',
      );
      expect(aggregate).not.toContain("mixed_other.json");
      expect(aggregate.match(/^  statBlockPeer/gm)).toHaveLength(1);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});
