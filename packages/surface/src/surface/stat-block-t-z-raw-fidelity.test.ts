import { describe, expect, test } from "vitest";

import { projectRawStatBlockSourceOccurrences } from "./stat-block-raw-fidelity-fixture.test-support.ts";
import { projectRawStatBlocks } from "./stat-block-raw-projection.test-support.ts";

const REPEATED_NAMES = [
  "Stone Giant",
  "Stone Golem",
  "Storm Giant",
  "Succubus",
] as const;

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

  test("reconciles all repeated records across both source anchors", () => {
    const pToS = projectionByName(repeatedPToS.projection);
    const tToZ = projectionByName(repeatedTToZ.projection);
    for (const name of REPEATED_NAMES) {
      expect(withoutSourceSection(requireNamed(pToS, name))).toEqual(
        withoutSourceSection(requireNamed(tToZ, name)),
      );
    }
    const dexSave = (projection: (typeof repeatedPToS.projection)[number]) =>
      projection.generalFacts.savingThrowModifiers.find(
        ({ name }) => name === "dex",
      )?.modifier;
    expect(dexSave(requireNamed(pToS, "Stone Giant"))).toBe(5);
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
      { kind: "walk", feet: { kind: "literal", value: 30 } },
      {
        kind: "walk",
        feet: { kind: "literal", value: 40 },
        availability: { kind: "forms_only", forms: ["bear"] },
      },
      {
        kind: "climb",
        feet: { kind: "literal", value: 30 },
        availability: { kind: "forms_only", forms: ["bear"] },
      },
    ]);
    expect(requireNamed(byName, "Wereboar").generalFacts.speeds[1]).toEqual({
      kind: "walk",
      feet: { kind: "literal", value: 40 },
      availability: { kind: "forms_only", forms: ["boar"] },
    });
    expect(requireNamed(byName, "Wererat").generalFacts.speeds).toEqual([
      { kind: "walk", feet: { kind: "literal", value: 30 } },
      { kind: "climb", feet: { kind: "literal", value: 30 } },
    ]);
    expect(requireNamed(byName, "Weretiger").generalFacts.speeds[1]).toEqual({
      kind: "walk",
      feet: { kind: "literal", value: 40 },
      availability: { kind: "forms_only", forms: ["tiger"] },
    });
    expect(requireNamed(byName, "Werewolf").generalFacts.speeds[1]).toEqual({
      kind: "walk",
      feet: { kind: "literal", value: 40 },
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
      lycanthropes.equipmentSource,
    );
    const werebear = requireNamed(projectionByName(projected), "Werebear");
    const werebearRestrictedSpeed = werebear.generalFacts.speeds[1];
    expect(
      werebearRestrictedSpeed !== undefined &&
        "availability" in werebearRestrictedSpeed
        ? werebearRestrictedSpeed.availability
        : undefined,
    ).toEqual({
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
    expect(
      archmage?.generalFacts.immunities.kind === "some"
        && "qualifiedConditions" in archmage.generalFacts.immunities.value
        ? archmage.generalFacts.immunities.value.qualifiedConditions
        : undefined,
    ).toEqual([
      { condition: "charmed", qualifier: "with *Mind Blank*" },
    ]);
    expect(
      vampireFamiliar?.generalFacts.immunities.kind === "some"
        && "qualifiedConditions" in vampireFamiliar.generalFacts.immunities.value
        ? vampireFamiliar.generalFacts.immunities.value.qualifiedConditions
        : undefined,
    ).toEqual([
      { condition: "charmed", qualifier: "except from its vampire master" },
    ]);
  });
});
