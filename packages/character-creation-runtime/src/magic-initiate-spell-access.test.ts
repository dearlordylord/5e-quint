// KERNEL-COVERAGE: parity-witness CREATION.MAGIC_INITIATE.CHOICE_FINALIZATION
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import {
  buildUnitCatalog,
  srdUnitCollection,
  type UnitCatalog,
} from "@dnd/surface/surface/unit-catalog";
import type { SpeciesTraitRecord } from "@dnd/surface/surface/types";
import { Result, Option } from "effect";
import { describe, expect, test } from "vitest";

import { eldritchInvocationId } from "./types.ts";
import {
  characterBuildSpeciesOriginFeatUnitIds,
  parseCharacterBuildMagicInitiateSpellAccesses,
} from "./magic-initiate-spell-access.ts";

const unitLibrary = (() => {
  const result = buildUnitCatalog({ collections: [srdUnitCollection] });
  if (result.tag !== "ok") {
    throw new Error("Expected the SRD Unit catalog fixture to build.");
  }
  return result.catalog;
})();

const wizardAccess = {
  featUnitId: authoredUnitId("feat_magic_initiate_wizard"),
  spellcastingAbility: "int" as const,
  cantrips: [authoredUnitId("fire_bolt"), authoredUnitId("light")] as const,
  levelOneSpell: authoredUnitId("mage_armor"),
};

const clericAccess = {
  featUnitId: authoredUnitId("feat_magic_initiate_cleric"),
  spellcastingAbility: "wis" as const,
  cantrips: [
    authoredUnitId("guidance"),
    authoredUnitId("sacred_flame"),
  ] as const,
  levelOneSpell: authoredUnitId("bless"),
};

const humanOriginFeat = {
  kind: "selectedClassChoice" as const,
  selectedFromUnitId: authoredUnitId("species_human_versatile"),
  unitId: authoredUnitId("feat_magic_initiate_wizard"),
};

const humanClericOriginFeat = {
  ...humanOriginFeat,
  unitId: authoredUnitId("feat_magic_initiate_cleric"),
};

const buildWithoutMagicInitiateGrants = {
  background: authoredUnitId("missing_background"),
  species: authoredUnitId("species_elf"),
  features: [],
} as const;

const catalogWithoutSpellcastingClasses: UnitCatalog = {
  ...unitLibrary,
  listUnits: () =>
    unitLibrary.listUnits().filter((unit) => unit.kind !== "class"),
};

const catalogWithoutHumanVersatileTrait: UnitCatalog = {
  ...unitLibrary,
  getUnit: (id) =>
    id === "species_human_versatile" ? Option.none() : unitLibrary.getUnit(id),
};

const catalogWithWrongHumanVersatileTraitKind: UnitCatalog = {
  ...unitLibrary,
  getUnit: (id) =>
    id === "species_human_versatile"
      ? Option.some(unitLibrary.requireUnit("feat_magic_initiate_wizard"))
      : unitLibrary.getUnit(id),
};

const humanVersatileTrait = unitLibrary.requireUnit("species_human_versatile");
if (humanVersatileTrait.kind !== "species_trait") {
  throw new Error(
    "Expected the Human Versatile fixture to be a species trait.",
  );
}

const humanVersatileWithCategoryGrant = {
  ...humanVersatileTrait,
  mechanics: {
    family: "passive",
    grants: [{ kind: "grant_feat", categories: ["origin"] }],
  },
} as const satisfies SpeciesTraitRecord;

const catalogWithHumanVersatileCategoryGrant: UnitCatalog = {
  ...unitLibrary,
  getUnit: (id) =>
    id === "species_human_versatile"
      ? Option.some(humanVersatileWithCategoryGrant)
      : unitLibrary.getUnit(id),
};

const malformedMagicInitiateEntries = [
  { name: "null", value: null },
  { name: "array", value: [] },
  {
    name: "extra exact-shape key",
    value: { ...wizardAccess, unexpected: true },
  },
  {
    name: "missing exact-shape key",
    value: {
      featUnitId: wizardAccess.featUnitId,
      spellcastingAbility: wizardAccess.spellcastingAbility,
      cantrips: wizardAccess.cantrips,
    },
  },
  {
    name: "non-string source Unit id",
    value: { ...wizardAccess, featUnitId: 42 },
  },
  {
    name: "unsupported spellcasting ability",
    value: { ...wizardAccess, spellcastingAbility: "str" },
  },
  {
    name: "non-array cantrips",
    value: { ...wizardAccess, cantrips: "fire_bolt" },
  },
  {
    name: "wrong cantrip count",
    value: { ...wizardAccess, cantrips: ["fire_bolt"] },
  },
  {
    name: "non-string first cantrip",
    value: { ...wizardAccess, cantrips: [42, "light"] },
  },
  {
    name: "non-string second cantrip",
    value: { ...wizardAccess, cantrips: ["fire_bolt", 42] },
  },
  {
    name: "non-string level-one spell",
    value: { ...wizardAccess, levelOneSpell: 1 },
  },
] as const satisfies ReadonlyArray<{
  readonly name: string;
  readonly value: unknown;
}>;

describe("creation-owned Magic Initiate Spell Access parsing", () => {
  test("rejects background and Human grants of the same spell list", () => {
    const result = parseCharacterBuildMagicInitiateSpellAccesses({
      value: [wizardAccess],
      build: {
        background: authoredUnitId("background_sage"),
        species: authoredUnitId("species_human"),
        features: [humanOriginFeat],
      },
      unitLibrary,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure.map((issue) => issue.message)).toContain(
        "Character Build cannot acquire Magic Initiate more than once for the same spell list.",
      );
    }
  });

  test("accepts background and Human grants from different spell lists", () => {
    const result = parseCharacterBuildMagicInitiateSpellAccesses({
      value: [wizardAccess, clericAccess],
      build: {
        background: authoredUnitId("background_sage"),
        species: authoredUnitId("species_human"),
        features: [humanClericOriginFeat],
      },
      unitLibrary,
    });

    expect(result).toEqual(Result.succeed([wizardAccess, clericAccess]));
  });

  test("does not treat an unrelated selected feature as a Human grant", () => {
    const result = parseCharacterBuildMagicInitiateSpellAccesses({
      value: [wizardAccess],
      build: {
        background: authoredUnitId("background_soldier"),
        species: authoredUnitId("species_human"),
        features: [
          {
            ...humanOriginFeat,
            selectedFromUnitId: authoredUnitId("class_wizard"),
          },
        ],
      },
      unitLibrary,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure.map((issue) => issue.message)).toContain(
        "Magic Initiate Spell Access source Unit feat_magic_initiate_wizard is not owned by the Character Build.",
      );
    }
  });

  test("omits an unreadable selected species from origin-feat ownership", () => {
    expect(
      characterBuildSpeciesOriginFeatUnitIds({
        species: authoredUnitId("weapon_longsword"),
        features: [humanOriginFeat],
        unitLibrary,
      }),
    ).toEqual([]);
  });

  test("omits a background grant whose source feat is absent", () => {
    const sage = unitLibrary.requireUnit("background_sage");
    if (sage.kind !== "background") {
      throw new Error("The Sage fixture must remain a background.");
    }
    const catalogWithMissingGrantedFeat: UnitCatalog = {
      ...unitLibrary,
      getUnit: (id) =>
        id === sage.id
          ? Option.some({
              ...sage,
              originFeatId: authoredUnitId("synthetic_missing_origin_feat"),
            })
          : unitLibrary.getUnit(id),
    };

    expect(
      parseCharacterBuildMagicInitiateSpellAccesses({
        value: [],
        build: {
          ...buildWithoutMagicInitiateGrants,
          background: sage.id,
        },
        unitLibrary: catalogWithMissingGrantedFeat,
      }),
    ).toEqual(Result.succeed([]));
  });

  test("rejects a non-array Magic Initiate access value at the boundary", () => {
    const result = parseCharacterBuildMagicInitiateSpellAccesses({
      value: { ...wizardAccess },
      build: buildWithoutMagicInitiateGrants,
      unitLibrary,
    });

    expect(result).toEqual(
      Result.fail([
        { message: "Character Build requires Magic Initiate Spell Accesses." },
      ]),
    );
  });

  test.each(malformedMagicInitiateEntries)(
    "rejects $name access entry without accepting a partial shape",
    ({ value }) => {
      const result = parseCharacterBuildMagicInitiateSpellAccesses({
        value: [value],
        build: buildWithoutMagicInitiateGrants,
        unitLibrary,
      });

      expect(result).toEqual(
        Result.fail([
          {
            index: 0,
            message:
              "Magic Initiate Spell Access must contain exactly source Unit id, Intelligence, Wisdom, or Charisma, two cantrip Unit ids, and one level-1 spell Unit id.",
          },
        ]),
      );
    },
  );

  test.each([
    {
      name: "an absent source Unit",
      featUnitId: "missing_magic_initiate_source",
    },
    {
      name: "a non-Magic-Initiate feat source",
      featUnitId: "feat_savage_attacker",
    },
  ] as const)("rejects $name", ({ featUnitId }) => {
    const result = parseCharacterBuildMagicInitiateSpellAccesses({
      value: [
        {
          ...wizardAccess,
          featUnitId: authoredUnitId(featUnitId),
        },
      ],
      build: buildWithoutMagicInitiateGrants,
      unitLibrary,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      const messages = result.failure.map((issue) => issue.message);
      expect(messages).toContain(
        `Magic Initiate Spell Access source Unit ${featUnitId} is not owned by the Character Build.`,
      );
      expect(messages).toContain(
        `Magic Initiate Spell Access source Unit ${featUnitId} is invalid.`,
      );
    }
  });

  test("rejects duplicate cantrips from the selected spell list", () => {
    const result = parseCharacterBuildMagicInitiateSpellAccesses({
      value: [
        {
          ...wizardAccess,
          cantrips: [authoredUnitId("fire_bolt"), authoredUnitId("fire_bolt")],
        },
      ],
      build: {
        ...buildWithoutMagicInitiateGrants,
        background: authoredUnitId("background_sage"),
      },
      unitLibrary,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure.map((issue) => issue.message)).toContain(
        "Magic Initiate cantrips must be two distinct cantrips from the selected spell list.",
      );
    }
  });

  test("rejects a level-one spell from another class spell list", () => {
    const result = parseCharacterBuildMagicInitiateSpellAccesses({
      value: [
        {
          ...wizardAccess,
          levelOneSpell: authoredUnitId("bless"),
        },
      ],
      build: {
        ...buildWithoutMagicInitiateGrants,
        background: authoredUnitId("background_sage"),
      },
      unitLibrary,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure.map((issue) => issue.message)).toContain(
        "Magic Initiate level-1 spell must come from the selected spell list.",
      );
    }
  });

  test("rejects a valid source when its class spell list is absent", () => {
    const result = parseCharacterBuildMagicInitiateSpellAccesses({
      value: [wizardAccess],
      build: {
        ...buildWithoutMagicInitiateGrants,
        background: authoredUnitId("background_sage"),
      },
      unitLibrary: catalogWithoutSpellcastingClasses,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      const messages = result.failure.map((issue) => issue.message);
      expect(messages).toContain(
        "Magic Initiate cantrips must be two distinct cantrips from the selected spell list.",
      );
      expect(messages).toContain(
        "Magic Initiate level-1 spell must come from the selected spell list.",
      );
    }
  });

  test("requires one access for every owned Magic Initiate source", () => {
    const result = parseCharacterBuildMagicInitiateSpellAccesses({
      value: [],
      build: {
        ...buildWithoutMagicInitiateGrants,
        background: authoredUnitId("background_sage"),
      },
      unitLibrary,
    });

    expect(result).toEqual(
      Result.fail([
        {
          message:
            "Character Build requires exactly one Magic Initiate Spell Access for owned source Unit feat_magic_initiate_wizard.",
        },
      ]),
    );
  });

  test("counts repeated ownership of one source Unit rather than dropping it", () => {
    const result = parseCharacterBuildMagicInitiateSpellAccesses({
      value: [],
      build: {
        background: authoredUnitId("background_sage"),
        species: authoredUnitId("species_human"),
        features: [humanOriginFeat],
      },
      unitLibrary,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      const messages = result.failure.map((issue) => issue.message);
      expect(messages).toContain(
        "Character Build cannot acquire Magic Initiate more than once for the same spell list.",
      );
      expect(messages).toContain(
        "Character Build requires exactly 2 Magic Initiate Spell Accesses for owned source Unit feat_magic_initiate_wizard.",
      );
    }
  });

  test("rejects duplicate parsed accesses even when the source is owned once", () => {
    const result = parseCharacterBuildMagicInitiateSpellAccesses({
      value: [wizardAccess, wizardAccess],
      build: {
        ...buildWithoutMagicInitiateGrants,
        background: authoredUnitId("background_sage"),
      },
      unitLibrary,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure.map((issue) => issue.message)).toContain(
        "Character Build Magic Initiate Spell Accesses must use distinct spell lists.",
      );
    }
  });
});

describe("species-owned origin-feat source projection", () => {
  test("keeps only origin feats selected through an actual species source", () => {
    expect(
      characterBuildSpeciesOriginFeatUnitIds({
        species: authoredUnitId("species_human"),
        features: [humanOriginFeat],
        unitLibrary,
      }),
    ).toEqual([authoredUnitId("feat_magic_initiate_wizard")]);

    expect(
      characterBuildSpeciesOriginFeatUnitIds({
        species: authoredUnitId("species_human"),
        features: [
          {
            ...humanOriginFeat,
            unitId: authoredUnitId("missing_origin_feat"),
          },
        ],
        unitLibrary,
      }),
    ).toEqual([]);

    expect(
      characterBuildSpeciesOriginFeatUnitIds({
        species: authoredUnitId("species_human"),
        features: [
          {
            ...humanOriginFeat,
            unitId: authoredUnitId("species_human_versatile"),
          },
        ],
        unitLibrary,
      }),
    ).toEqual([]);

    expect(
      characterBuildSpeciesOriginFeatUnitIds({
        species: authoredUnitId("species_human"),
        features: [
          {
            ...humanOriginFeat,
            unitId: authoredUnitId("defense"),
          },
        ],
        unitLibrary,
      }),
    ).toEqual([]);
  });

  test("rejects missing, non-species, and non-passive origin source facts", () => {
    expect(
      characterBuildSpeciesOriginFeatUnitIds({
        species: authoredUnitId("missing_species"),
        features: [humanOriginFeat],
        unitLibrary,
      }),
    ).toEqual([]);

    expect(
      characterBuildSpeciesOriginFeatUnitIds({
        species: authoredUnitId("species_elf"),
        features: [humanOriginFeat],
        unitLibrary,
      }),
    ).toEqual([]);

    expect(
      characterBuildSpeciesOriginFeatUnitIds({
        species: authoredUnitId("species_human"),
        features: [humanOriginFeat],
        unitLibrary: catalogWithoutHumanVersatileTrait,
      }),
    ).toEqual([]);

    expect(
      characterBuildSpeciesOriginFeatUnitIds({
        species: authoredUnitId("species_human"),
        features: [humanOriginFeat],
        unitLibrary: catalogWithWrongHumanVersatileTraitKind,
      }),
    ).toEqual([]);

    expect(
      characterBuildSpeciesOriginFeatUnitIds({
        species: authoredUnitId("species_human"),
        features: [
          {
            ...humanOriginFeat,
            selectedFromUnitId: authoredUnitId("species_human_skillful"),
          },
        ],
        unitLibrary,
      }),
    ).toEqual([]);

    expect(
      characterBuildSpeciesOriginFeatUnitIds({
        species: authoredUnitId("species_human"),
        features: [
          {
            kind: "selectedEldritchInvocation",
            selectedFromUnitId: authoredUnitId("species_human_versatile"),
            selection: {
              kind: "nonRepeatable",
              invocationId: eldritchInvocationId("synthetic_invocation"),
            },
          },
        ],
        unitLibrary,
      }),
    ).toEqual([]);
  });

  test("accepts either authored origin-grant shape from a species trait", () => {
    expect(
      characterBuildSpeciesOriginFeatUnitIds({
        species: authoredUnitId("species_human"),
        features: [humanOriginFeat],
        unitLibrary: catalogWithHumanVersatileCategoryGrant,
      }),
    ).toEqual([authoredUnitId("feat_magic_initiate_wizard")]);
  });
});
