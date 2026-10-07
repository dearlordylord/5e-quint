import { readFileSync } from "node:fs";
import {
  discoverSrdStatBlocks,
  SRD_STAT_BLOCK_SOURCE_PATHS,
} from "../../../scripts/srd521-stat-block-parity.ts";
import type { StatBlockProcedurePressureSourceAuthority } from "./stat-block-procedure-pressure.ts";
import { Result } from "effect";
import { expect, test } from "vitest";
import { srdStatBlockCollection } from "@dnd/surface/surface/stat-block-catalog";
import { analyzeStatBlockProcedurePressure } from "./stat-block-procedure-pressure.ts";
import {
  isolatedSpellcastingAdmission,
  spellcastingIsolationBase,
} from "./stat-block-spellcasting-admission.test-support.ts";
import { unitLibrary } from "./battle-runtime.test-support.ts";

test("pressure dispositions consume canonical admission without changing structural rows", () => {
  const records = srdStatBlockCollection.statBlocks;
  const discovery = discoverSrdStatBlocks(
    SRD_STAT_BLOCK_SOURCE_PATHS.map((sourcePath) => ({
      sourcePath,
      contents: readFileSync(
        new URL(`../../../${sourcePath}`, import.meta.url),
        "utf8",
      ),
    })),
  );
  expect(discovery.issues).toEqual([]);
  const sourceAuthority: StatBlockProcedurePressureSourceAuthority = {
    identities: discovery.identities.map(({ name, occurrences }) => {
      const [first, ...remaining] = occurrences;
      if (first === undefined)
        throw new Error("Proved source discovery requires an anchor");
      return {
        name,
        anchors: [first.anchor, ...remaining.map(({ anchor }) => anchor)],
      };
    }),
  };
  const structural = analyzeStatBlockProcedurePressure(
    records,
    sourceAuthority,
    { kind: "unavailable" },
  );
  const isolationBase = spellcastingIsolationBase();
  const admitted = analyzeStatBlockProcedurePressure(records, sourceAuthority, {
    kind: "available",
    admit: (input) => {
      const result = isolatedSpellcastingAdmission({
        ...input,
        isolationBase,
        unitCatalog: unitLibrary,
      });
      return Result.mapError(result, (failure) => failure.kind);
    },
  });
  expect(admitted.occurrences.map((row) => row.rowId)).toEqual(
    structural.occurrences.map((row) => row.rowId),
  );
  expect(admitted.occurrences).toHaveLength(2601);
  const groups = admitted.occurrences.filter(
    (row) =>
      row.kind === "spellcastingGroup" && row.disposition.kind === "executable",
  );
  expect(groups).toHaveLength(107);
  const children = admitted.occurrences.filter(
    (row) =>
      row.kind === "spellReference" && row.disposition.kind === "executable",
  );
  expect(children).toHaveLength(101);
});
