import { describe, expect, test } from "vitest";

import {
  defineRawStatBlockFidelityLane,
  projectRawStatBlockSourceOccurrences,
} from "./stat-block-raw-fidelity-lane.test-support.ts";

defineRawStatBlockFidelityLane({
  label: "P–S",
  sourcePath: ".references/srd-5.2.1/Monsters/Monsters-P-S.md",
  authoredSourcePrefix: "Monsters/Monsters-P-S.md:",
  expectedRecordCount: 48,
});

const REPEATED_NAMES = [
  "Stone Giant",
  "Stone Golem",
  "Storm Giant",
  "Succubus",
] as const;
const AGREEMENT_NAMES = ["Stone Golem", "Storm Giant", "Succubus"] as const;

const pToS = projectRawStatBlockSourceOccurrences({
  sourcePath: ".references/srd-5.2.1/Monsters/Monsters-P-S.md",
  names: REPEATED_NAMES,
});
const tToZ = projectRawStatBlockSourceOccurrences({
  sourcePath: ".references/srd-5.2.1/Monsters/Monsters-T-Z.md",
  names: REPEATED_NAMES,
});

const projectionByName = (
  projection: typeof pToS.projection,
): ReadonlyMap<string, (typeof projection)[number]> =>
  new Map(projection.map((record) => [record.name, record]));

const requireProjection = (
  projections: ReturnType<typeof projectionByName>,
  name: string,
): (typeof pToS.projection)[number] => {
  const projection = projections.get(name);
  if (projection === undefined) {
    throw new Error(`Missing repeated RAW projection ${name}`);
  }
  return projection;
};

const withoutSourceSection = <T extends { readonly sourceSection: string }>(
  projection: T,
): Omit<T, "sourceSection"> => {
  const { sourceSection: _sourceSection, ...rest } = projection;
  return rest;
};

describe("P–S repeated source occurrences", () => {
  test("publishes each repeated identity once while retaining both anchors", () => {
    expect(pToS.occurrences.map(({ name }) => name)).toEqual(REPEATED_NAMES);
    expect(tToZ.occurrences.map(({ name }) => name)).toEqual(REPEATED_NAMES);
    expect(pToS.records.map(({ name }) => name).sort()).toEqual(
      [...REPEATED_NAMES].sort(),
    );
  });

  test("proves three repeated records agree and isolates Stone Giant's save conflict", () => {
    const pToSByName = projectionByName(pToS.projection);
    const tToZByName = projectionByName(tToZ.projection);
    for (const name of AGREEMENT_NAMES) {
      expect(withoutSourceSection(requireProjection(pToSByName, name))).toEqual(
        withoutSourceSection(requireProjection(tToZByName, name)),
      );
    }

    const pToSStoneGiant = requireProjection(pToSByName, "Stone Giant");
    const tToZStoneGiant = requireProjection(tToZByName, "Stone Giant");
    const dexSave = (projection: typeof pToSStoneGiant): number | undefined =>
      projection.generalFacts.savingThrowModifiers.find(
        ({ name }) => name === "dex",
      )?.modifier;
    const withoutDexSave = (projection: typeof pToSStoneGiant) => ({
      ...withoutSourceSection(projection),
      generalFacts: {
        ...projection.generalFacts,
        savingThrowModifiers:
          projection.generalFacts.savingThrowModifiers.filter(
            ({ name }) => name !== "dex",
          ),
      },
    });

    expect(dexSave(pToSStoneGiant)).toBe(2);
    expect(dexSave(tToZStoneGiant)).toBe(5);
    expect(withoutDexSave(pToSStoneGiant)).toEqual(
      withoutDexSave(tToZStoneGiant),
    );
  });
});
