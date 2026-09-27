import { describe, expect, test } from "vitest";

import { projectRawStatBlockSourceOccurrences } from "./stat-block-raw-fidelity-fixture.test-support.ts";
import {
  projectAuthoredStatBlocks,
  projectRawStatBlocks,
} from "./stat-block-raw-projection.test-support.ts";

const REPEATED_NAMES = [
  "Stone Giant",
  "Stone Golem",
  "Storm Giant",
  "Succubus",
] as const;

const repeatedPToS = projectRawStatBlockSourceOccurrences({
  sourcePath: ".references/srd-5.2.1/monsters-A-Z.md",
  names: REPEATED_NAMES,
});
const repeatedTToZ = projectRawStatBlockSourceOccurrences({
  sourcePath: ".references/srd-5.2.1/monsters-A-Z.md",
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

const RAW_PARSER_REGRESSION_NAMES = [
  "Archmage",
  "Druid",
  "Gibbering Mouther",
  "Sphinx of Valor",
] as const;
const rawParserRegressions = projectRawStatBlockSourceOccurrences({
  sourcePath: ".references/srd-5.2.1/monsters-A-Z.md",
  names: RAW_PARSER_REGRESSION_NAMES,
});
const rawParserProjectionByName = projectionByName(
  rawParserRegressions.projection,
);
const authoredParserProjectionByName = projectionByName(
  projectAuthoredStatBlocks(
    rawParserRegressions.records,
    rawParserRegressions.equipmentSource,
  ),
);

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
        ({ ability }) => ability === "dex",
      )?.modifier;
    expect(dexSave(requireNamed(pToS, "Stone Giant"))).toBe(5);
    expect(dexSave(requireNamed(tToZ, "Stone Giant"))).toBe(5);
  });
});

describe("T–Z form-restricted Speed fidelity", () => {
  const lycanthropes = projectRawStatBlockSourceOccurrences({
    sourcePath: ".references/srd-5.2.1/monsters-A-Z.md",
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
    const archmage = requireNamed(rawParserProjectionByName, "Archmage");
    const vampireFamiliar = projectRawStatBlockSourceOccurrences({
      sourcePath: ".references/srd-5.2.1/monsters-A-Z.md",
      names: ["Vampire Familiar"],
    }).projection[0];
    expect(
      archmage?.generalFacts.immunities.kind === "some" &&
        "qualifiedConditions" in archmage.generalFacts.immunities.value
        ? archmage.generalFacts.immunities.value.qualifiedConditions
        : undefined,
    ).toEqual([{ condition: "charmed", qualifier: "with *Mind Blank*" }]);
    expect(
      vampireFamiliar?.generalFacts.immunities.kind === "some" &&
        "qualifiedConditions" in vampireFamiliar.generalFacts.immunities.value
        ? vampireFamiliar.generalFacts.immunities.value.qualifiedConditions
        : undefined,
    ).toEqual([
      { condition: "charmed", qualifier: "except from its vampire master" },
    ]);

    const equivalentEmphasisSource =
      rawParserRegressions.statBlockSource.replace(
        "Charmed (with _Mind Blank_)",
        "Charmed (with *Mind Blank*)",
      );
    expect(equivalentEmphasisSource).not.toBe(
      rawParserRegressions.statBlockSource,
    );
    const equivalentEmphasisArchmage = requireNamed(
      projectionByName(
        projectRawStatBlocks(
          equivalentEmphasisSource,
          rawParserRegressions.occurrences,
          rawParserRegressions.equipmentSource,
        ),
      ),
      "Archmage",
    );
    expect(withoutSourceSection(equivalentEmphasisArchmage)).toEqual(
      withoutSourceSection(archmage),
    );
  });
});

describe("RAW parser source identity and nested outcomes", () => {
  test("resolves Druid Long-strider to the Longstrider spell identity", () => {
    const druid = requireNamed(rawParserProjectionByName, "Druid");
    const spellcasting = druid.procedures.find(
      (procedure) =>
        procedure.section === "Actions" &&
        procedure.name === "Spellcasting" &&
        procedure.kind === "spellcasting",
    );
    if (spellcasting?.kind !== "spellcasting") {
      throw new Error(
        "Druid source-identity check requires its Spellcasting action",
      );
    }
    expect(
      spellcasting.groups.flatMap((group) =>
        group.spells.map((spell) => spell.spellId),
      ),
    ).toContain("longstrider");
    expect(
      spellcasting.groups.flatMap((group) =>
        group.spells.map((spell) => spell.spellId),
      ),
    ).not.toContain("long_strider");
  });

  test("keeps numbered Gibbering results inside the Gibbering trait", () => {
    const mouther = requireNamed(
      rawParserProjectionByName,
      "Gibbering Mouther",
    );
    const gibbering = mouther.traits.find(({ name }) => name === "Gibbering");
    if (gibbering === undefined) {
      throw new Error(
        "Gibbering Mouther source check requires its Gibbering trait",
      );
    }
    expect(gibbering.description).toContain(
      "Failure: The target rolls 1d8 to determine what it does during the current turn: - 1–4. The target does nothing.",
    );
    expect(gibbering.description).toContain(
      "- 5–6. The target takes no action",
    );
    expect(gibbering.description).toContain(
      "- 7–8. The target makes a melee attack",
    );
    expect(mouther.traits.map(({ name }) => name)).not.toEqual(
      expect.arrayContaining(["1–4", "5–6", "7–8"]),
    );
  });

  test("keeps the Sphinx of Valor's three Roar results under one action", () => {
    const sphinx = requireNamed(rawParserProjectionByName, "Sphinx of Valor");
    const roar = sphinx.procedures.find(
      (procedure) =>
        procedure.section === "Actions" && procedure.name === "Roar",
    );
    if (roar?.kind !== "textOnly") {
      throw new Error(
        "Sphinx of Valor source check requires one text-only Roar action",
      );
    }
    expect(roar.description).toContain("- First Roar. Wisdom Saving Throw:");
    expect(roar.description).toContain("- Second Roar. Wisdom Saving Throw:");
    expect(roar.description).toContain(
      "- Third Roar. Constitution Saving Throw:",
    );
    expect(sphinx.procedures.map(({ name }) => name)).not.toEqual(
      expect.arrayContaining(["First Roar", "Second Roar", "Third Roar"]),
    );
  });

  test("matches the four source-owned facts to their authored projections", () => {
    const archmage = requireNamed(rawParserProjectionByName, "Archmage");
    const authoredArchmage = requireNamed(
      authoredParserProjectionByName,
      "Archmage",
    );
    expect(archmage.generalFacts.immunities).toEqual(
      authoredArchmage.generalFacts.immunities,
    );

    const druid = requireNamed(rawParserProjectionByName, "Druid");
    const authoredDruid = requireNamed(authoredParserProjectionByName, "Druid");
    const rawDruidSpellcasting = druid.procedures.find(
      (procedure) =>
        procedure.name === "Spellcasting" && procedure.kind === "spellcasting",
    );
    const authoredDruidSpellcasting = authoredDruid.procedures.find(
      (procedure) =>
        procedure.name === "Spellcasting" && procedure.kind === "spellcasting",
    );
    expect(rawDruidSpellcasting).toEqual(authoredDruidSpellcasting);

    const mouther = requireNamed(
      rawParserProjectionByName,
      "Gibbering Mouther",
    );
    const authoredMouther = requireNamed(
      authoredParserProjectionByName,
      "Gibbering Mouther",
    );
    expect(mouther.traits.find(({ name }) => name === "Gibbering")).toEqual(
      authoredMouther.traits.find(({ name }) => name === "Gibbering"),
    );

    const sphinx = requireNamed(rawParserProjectionByName, "Sphinx of Valor");
    const authoredSphinx = requireNamed(
      authoredParserProjectionByName,
      "Sphinx of Valor",
    );
    expect(
      sphinx.textOnlyProcedures.find(
        ({ section, name }) => section === "Actions" && name === "Roar",
      ),
    ).toEqual(
      authoredSphinx.textOnlyProcedures.find(
        ({ section, name }) => section === "Actions" && name === "Roar",
      ),
    );
  });
});
