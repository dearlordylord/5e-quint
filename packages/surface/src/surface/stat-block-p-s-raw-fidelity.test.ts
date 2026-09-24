import { describe, expect, test } from "vitest";

import { projectRawStatBlockSourceOccurrences } from "./stat-block-raw-fidelity-fixture.test-support.ts";
import { projectRawStatBlocks } from "./stat-block-raw-projection.test-support.ts";

const REPEATED_NAMES = [
  "Stone Giant",
  "Stone Golem",
  "Storm Giant",
  "Succubus",
] as const;

const pToS = projectRawStatBlockSourceOccurrences({
  sourcePath: ".references/srd-5.2.1/monsters-A-Z.md",
  names: REPEATED_NAMES,
});
const tToZ = projectRawStatBlockSourceOccurrences({
  sourcePath: ".references/srd-5.2.1/monsters-A-Z.md",
  names: REPEATED_NAMES,
});
const vulnerabilityStates = projectRawStatBlockSourceOccurrences({
  sourcePath: ".references/srd-5.2.1/monsters-A-Z.md",
  names: ["Pegasus", "Rakshasa", "Salamander"],
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

const mutateStoneGiantSourceLine = (
  source: string,
  search: string,
  replacement: string,
): string => {
  const occurrence = tToZ.occurrences.find(
    ({ name }) => name === "Stone Giant",
  );
  if (occurrence === undefined) {
    throw new Error("Expected the Stone Giant RAW occurrence");
  }
  let replaced = false;
  return source
    .split(/\r?\n/)
    .map((line, index) => {
      if (
        replaced ||
        index + 1 < occurrence.anchor.lineStart ||
        index + 1 > occurrence.anchor.lineEnd ||
        !line.includes(search)
      ) {
        return line;
      }
      replaced = true;
      return line.replace(search, replacement);
    })
    .join("\n");
};

describe("P–S repeated source occurrences", () => {
  test("publishes each repeated identity once while retaining both anchors", () => {
    expect(pToS.occurrences.map(({ name }) => name)).toEqual(REPEATED_NAMES);
    expect(tToZ.occurrences.map(({ name }) => name)).toEqual(REPEATED_NAMES);
    expect(pToS.records.map(({ name }) => name).sort()).toEqual(
      [...REPEATED_NAMES].sort(),
    );
  });

  test("proves every repeated record agrees across both source anchors", () => {
    const pToSByName = projectionByName(pToS.projection);
    const tToZByName = projectionByName(tToZ.projection);
    for (const name of REPEATED_NAMES) {
      expect(withoutSourceSection(requireProjection(pToSByName, name))).toEqual(
        withoutSourceSection(requireProjection(tToZByName, name)),
      );
    }

    const pToSStoneGiant = requireProjection(pToSByName, "Stone Giant");
    const tToZStoneGiant = requireProjection(tToZByName, "Stone Giant");
    const dexSave = (projection: typeof pToSStoneGiant): number | undefined =>
      projection.generalFacts.savingThrowModifiers.find(
        ({ ability }) => ability === "dex",
      )?.modifier;

    expect(dexSave(pToSStoneGiant)).toBe(5);
    expect(dexSave(tToZStoneGiant)).toBe(5);
  });

  test("rejects malformed ability matrix rows at the RAW projection boundary", () => {
    const projectMutation = (statBlockSource: string) =>
      projectRawStatBlocks(
        statBlockSource,
        tToZ.occurrences,
        tToZ.equipmentSource,
      );
    const widened = mutateStoneGiantSourceLine(
      tToZ.statBlockSource,
      "<td><strong>STR</strong></td>",
      "<td><strong>STR</strong></td><td>EXTRA</td>",
    );
    const empty = mutateStoneGiantSourceLine(
      tToZ.statBlockSource,
      "<td>15</td>",
      "<td></td>",
    );
    const unknownAbility = mutateStoneGiantSourceLine(
      tToZ.statBlockSource,
      "<td><strong>DEX</strong></td>",
      "<td><strong>POWER</strong></td>",
    );

    expect(widened).not.toBe(tToZ.statBlockSource);
    expect(empty).not.toBe(tToZ.statBlockSource);
    expect(unknownAbility).not.toBe(tToZ.statBlockSource);
    expect(() => projectMutation(widened)).toThrow(
      /malformed-evidence.*abilityScores\.matrix\.0.*twelve nonempty Stone Giant cells/,
    );
    expect(() => projectMutation(empty)).toThrow(
      /malformed-evidence.*abilityScores\.matrix\.0.*twelve nonempty Stone Giant cells/,
    );
    expect(() => projectMutation(unknownAbility)).toThrow(
      /unsupported-evidence.*abilityScores\.matrix\.1\.label.*POWER.*str, dex, con, int, wis, cha/,
    );
  });
});

describe("P–S vulnerability projection states", () => {
  test("distinguishes absence, fixed damage types, and qualified damage types", () => {
    const byName = projectionByName(vulnerabilityStates.projection);

    expect(
      requireProjection(byName, "Pegasus").generalFacts.vulnerabilities,
    ).toEqual({ kind: "none" });
    expect(
      requireProjection(byName, "Salamander").generalFacts.vulnerabilities,
    ).toEqual({ kind: "fixed", damageTypes: ["cold"] });
    expect(
      requireProjection(byName, "Rakshasa").generalFacts.vulnerabilities,
    ).toEqual({
      kind: "qualified",
      damageTypes: ["piercing"],
      qualifier:
        "from weapons wielded by creatures under the effect of a Bless spell",
    });
  });
});
