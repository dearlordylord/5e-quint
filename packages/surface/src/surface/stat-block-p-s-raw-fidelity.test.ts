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
    const stoneGiantOccurrence = tToZ.occurrences.find(
      ({ name }) => name === "Stone Giant",
    );
    if (stoneGiantOccurrence === undefined) {
      throw new Error("The P–S fixture requires its Stone Giant source anchor");
    }
    const sourceLines = tToZ.statBlockSource.split("\n");
    const anchorStart = stoneGiantOccurrence.anchor.lineStart - 1;
    const anchorEnd = stoneGiantOccurrence.anchor.lineEnd;
    const anchoredLines = sourceLines.slice(anchorStart, anchorEnd);
    const anchoredSource = anchoredLines.join("\n");
    const mutateStoneGiant = (mutation: (source: string) => string) => {
      const mutated = mutation(anchoredSource);
      expect(mutated).not.toBe(anchoredSource);
      return [
        ...sourceLines.slice(0, anchorStart),
        ...mutated.split("\n"),
        ...sourceLines.slice(anchorEnd),
      ].join("\n");
    };
    const projectMutation = (statBlockSource: string) =>
      projectRawStatBlocks(
        statBlockSource,
        tToZ.occurrences,
        tToZ.equipmentSource,
      );
    const widened = mutateStoneGiant((source) =>
      source.replace(
        /(<td><strong>STR<\/strong><\/td>\s*<td>23<\/td>\s*<td>\+6<\/td>\s*<td>\+6<\/td>)\s*(<td><strong>DEX<\/strong><\/td>)/,
        "$1\n      <td>EXTRA</td>\n      $2",
      ),
    );
    const empty = mutateStoneGiant((source) =>
      source.replace("<td>15</td>", "<td></td>"),
    );
    const unknownAbility = mutateStoneGiant((source) =>
      source.replace(
        "<td><strong>DEX</strong></td>",
        "<td><strong>POWER</strong></td>",
      ),
    );

    expect(() => projectMutation(widened)).toThrow(
      /missing-required-evidence.*abilityScores.*six Stone Giant ability scores/,
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
