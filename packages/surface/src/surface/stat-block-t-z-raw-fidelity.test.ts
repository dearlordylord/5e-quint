import { describe, expect, test } from "vitest";

import {
  defineRawStatBlockFidelityLane,
  projectRawStatBlockSourceOccurrences,
} from "./stat-block-raw-fidelity-lane.test-support.ts";
import { projectRawStatBlocks } from "./stat-block-raw-projection.test-support.ts";

const REPEATED_NAMES = [
  "Stone Giant",
  "Stone Golem",
  "Storm Giant",
  "Succubus",
] as const;

defineRawStatBlockFidelityLane({
  label: "T–Z",
  sourcePath: ".references/srd-5.2.1/Monsters/Monsters-T-Z.md",
  authoredSourcePrefix: "Monsters/Monsters-T-Z.md:",
  expectedRecordCount: 32,
  retainedIdentityNames: REPEATED_NAMES,
});

const repeatedPToS = projectRawStatBlockSourceOccurrences({
  sourcePath: ".references/srd-5.2.1/Monsters/Monsters-P-S.md",
  names: REPEATED_NAMES,
});
const repeatedTToZ = projectRawStatBlockSourceOccurrences({
  sourcePath: ".references/srd-5.2.1/Monsters/Monsters-T-Z.md",
  names: REPEATED_NAMES,
});

const withoutSourceSection = <T extends { readonly sourceSection: string }>(
  projection: T,
): Omit<T, "sourceSection"> => {
  const { sourceSection: _sourceSection, ...rest } = projection;
  return rest;
};

const projectionByName = <T extends { readonly name: string }>(
  projections: readonly T[],
): ReadonlyMap<string, T> =>
  new Map(projections.map((projection) => [projection.name, projection]));

const requireNamed = <T>(byName: ReadonlyMap<string, T>, name: string): T => {
  const value = byName.get(name);
  if (value === undefined) throw new Error(`Missing RAW projection ${name}`);
  return value;
};

describe("T–Z repeated source occurrence reconciliation", () => {
  test("covers all 36 anchors while publishing each repeated identity once", () => {
    expect(repeatedTToZ.occurrences.map(({ name }) => name)).toEqual(
      REPEATED_NAMES,
    );
    expect(repeatedTToZ.records.map(({ name }) => name).sort()).toEqual(
      [...REPEATED_NAMES].sort(),
    );
  });

  test("retains three agreements and the precise Stone Giant save divergence", () => {
    const pToS = projectionByName(repeatedPToS.projection);
    const tToZ = projectionByName(repeatedTToZ.projection);
    for (const name of ["Stone Golem", "Storm Giant", "Succubus"] as const) {
      expect(withoutSourceSection(requireNamed(pToS, name))).toEqual(
        withoutSourceSection(requireNamed(tToZ, name)),
      );
    }
    const dexSave = (projection: (typeof repeatedPToS.projection)[number]) =>
      projection.generalFacts.savingThrowModifiers.find(
        ({ name }) => name === "dex",
      )?.modifier;
    expect(dexSave(requireNamed(pToS, "Stone Giant"))).toBe(2);
    expect(dexSave(requireNamed(tToZ, "Stone Giant"))).toBe(5);
  });
});

describe("T–Z form-restricted Speed fidelity", () => {
  const lycanthropes = projectRawStatBlockSourceOccurrences({
    sourcePath: ".references/srd-5.2.1/Monsters/Monsters-T-Z.md",
    names: ["Werebear", "Wereboar", "Wererat", "Weretiger", "Werewolf"],
  });

  test("preserves every canonical form-only spelling without making it unrestricted", () => {
    const byName = projectionByName(lycanthropes.projection);
    expect(requireNamed(byName, "Werebear").generalFacts.speeds).toEqual([
      { kind: "walk", feet: 30, hover: false },
      {
        kind: "walk",
        feet: 40,
        hover: false,
        availability: { kind: "forms_only", forms: ["bear"] },
      },
      {
        kind: "climb",
        feet: 30,
        hover: false,
        availability: { kind: "forms_only", forms: ["bear"] },
      },
    ]);
    expect(requireNamed(byName, "Wereboar").generalFacts.speeds[1]).toEqual({
      kind: "walk",
      feet: 40,
      hover: false,
      availability: { kind: "forms_only", forms: ["boar"] },
    });
    expect(requireNamed(byName, "Wererat").generalFacts.speeds).toEqual([
      { kind: "walk", feet: 30, hover: false },
      { kind: "climb", feet: 30, hover: false },
    ]);
    expect(requireNamed(byName, "Weretiger").generalFacts.speeds[1]).toEqual({
      kind: "walk",
      feet: 40,
      hover: false,
      availability: { kind: "forms_only", forms: ["tiger"] },
    });
    expect(requireNamed(byName, "Werewolf").generalFacts.speeds[1]).toEqual({
      kind: "walk",
      feet: 40,
      hover: false,
      availability: { kind: "forms_only", forms: ["wolf"] },
    });
  });

  test("parses a multi-form restriction as one typed availability state", () => {
    const source = lycanthropes.statBlockSource.replace(
      "40 ft. (bear form only)",
      "40 ft. (bear or hybrid form only)",
    );
    expect(source).not.toBe(lycanthropes.statBlockSource);
    const projected = projectRawStatBlocks(
      source,
      lycanthropes.occurrences,
      lycanthropes.records,
      lycanthropes.equipmentSource,
    );
    const werebear = requireNamed(projectionByName(projected), "Werebear");
    expect(werebear.generalFacts.speeds[1]?.availability).toEqual({
      kind: "forms_only",
      forms: ["bear", "hybrid"],
    });
  });
});

describe("qualified condition Immunity fidelity", () => {
  test("preserves the exact Archmage and Vampire Familiar qualifications", () => {
    const archmage = projectRawStatBlockSourceOccurrences({
      sourcePath: ".references/srd-5.2.1/Monsters/Monsters-M-O.md",
      names: ["Archmage"],
    }).projection[0];
    const vampireFamiliar = projectRawStatBlockSourceOccurrences({
      sourcePath: ".references/srd-5.2.1/Monsters/Monsters-T-Z.md",
      names: ["Vampire Familiar"],
    }).projection[0];
    expect(archmage?.generalFacts.immunityQualifiedConditions).toEqual([
      { condition: "charmed", qualifier: "with *Mind Blank*" },
    ]);
    expect(vampireFamiliar?.generalFacts.immunityQualifiedConditions).toEqual([
      { condition: "charmed", qualifier: "except from its vampire master" },
    ]);
  });
});
