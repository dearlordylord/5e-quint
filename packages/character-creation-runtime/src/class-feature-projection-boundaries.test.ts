import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { abilityScore } from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { UnitRecord } from "@dnd/surface/surface/types";
import { Option } from "effect";
import { describe, expect, test } from "vitest";

import {
  characterBuildClassFeatureFactsProjectionWithRoute,
  characterBuildMonkUncannyMetabolismFacts,
  characterBuildMonksFocusFacts,
  characterBuildSorcererFontOfMagicFacts,
  characterBuildSorcererMetamagicFacts,
  classUnitId,
  type CharacterBuild,
  type CharacterBuildFeature,
  type UnitCatalog,
} from "./index.ts";

const catalogResult = buildUnitCatalog({ collections: [srdUnitCollection] });
if (catalogResult.tag !== "ok") {
  throw new Error("The SRD Unit catalog projection fixture must compose.");
}
const unitLibrary = catalogResult.catalog;

const featureCases = [
  {
    unitId: authoredUnitId("monk_monks_focus"),
    project: characterBuildMonksFocusFacts,
    issueTag: "monksFocusFactsIssue",
    featureName: "Monk's Focus",
    ownerClassName: "Monk",
    ownerPrerequisiteUnitIds: [],
  },
  {
    unitId: authoredUnitId("monk_uncanny_metabolism"),
    project: characterBuildMonkUncannyMetabolismFacts,
    issueTag: "monkUncannyMetabolismFactsIssue",
    featureName: "Uncanny Metabolism",
    ownerClassName: "Monk",
    ownerPrerequisiteUnitIds: [authoredUnitId("monk_monks_focus")],
  },
  {
    unitId: authoredUnitId("sorcerer_font_of_magic"),
    project: characterBuildSorcererFontOfMagicFacts,
    issueTag: "sorcererFontOfMagicFactsIssue",
    featureName: "Font of Magic",
    ownerClassName: "Sorcerer",
    ownerPrerequisiteUnitIds: [],
  },
  {
    unitId: authoredUnitId("sorcerer_metamagic"),
    project: characterBuildSorcererMetamagicFacts,
    issueTag: "sorcererMetamagicFactsIssue",
    featureName: "Metamagic",
    ownerClassName: "Sorcerer",
    ownerPrerequisiteUnitIds: [],
  },
] as const;

function buildWithRetainedFeatures(
  unitIds: readonly UnitRecord["id"][] = [],
): CharacterBuild {
  const features: readonly CharacterBuildFeature[] = unitIds.map((unitId) => ({
    kind: "selectedClassChoice",
    selectedFromUnitId: authoredUnitId("synthetic_feature_source"),
    unitId,
  }));
  return {
    progression: {
      startingClass: classUnitId(authoredUnitId("class_fighter")),
      advancements: [],
    },
    background: authoredUnitId("background_soldier"),
    species: authoredUnitId("species_orc"),
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: {
      str: abilityScore(13),
      dex: abilityScore(14),
      con: abilityScore(13),
      int: abilityScore(8),
      wis: abilityScore(16),
      cha: abilityScore(10),
    },
    proficiencyChoices: [],
    features,
    equipment: { owned: [], loadout: {} },
  };
}

function catalogWithout(unitId: UnitRecord["id"]): UnitCatalog {
  return {
    getUnit: (candidate) =>
      candidate === unitId ? Option.none() : unitLibrary.getUnit(candidate),
    listUnits: () =>
      unitLibrary.listUnits().filter((candidate) => candidate.id !== unitId),
    requireUnit: (candidate) => {
      if (candidate === unitId) {
        throw new Error(
          `The ${unitId} Unit is deliberately absent from this test catalog.`,
        );
      }
      return unitLibrary.requireUnit(candidate);
    },
  };
}

function catalogWithWrongKind(unitId: UnitRecord["id"]): UnitCatalog {
  const weapon = unitLibrary.getUnit("weapon_longsword");
  if (Option.isNone(weapon)) {
    throw new Error("The wrong-kind Unit fixture must be installed.");
  }
  const replacement = {
    ...weapon.value,
    id: unitId,
  } satisfies UnitRecord;
  return {
    getUnit: (candidate) =>
      candidate === unitId
        ? Option.some(replacement)
        : unitLibrary.getUnit(candidate),
    listUnits: () => [
      ...unitLibrary.listUnits().filter((candidate) => candidate.id !== unitId),
      replacement,
    ],
    requireUnit: (candidate) =>
      candidate === unitId ? replacement : unitLibrary.requireUnit(candidate),
  };
}

describe("class-feature projection boundaries", () => {
  test.each(featureCases)(
    "returns no $unitId facts when the build does not retain the feature",
    ({ project }) => {
      expect(
        project({ build: buildWithRetainedFeatures(), unitLibrary }),
      ).toMatchObject({
        _tag: "Right",
        right: undefined,
      });
    },
  );

  test.each(featureCases)(
    "reports missing, wrong-kind, and owner-mismatched $unitId facts",
    ({
      unitId,
      project,
      issueTag,
      featureName,
      ownerClassName,
      ownerPrerequisiteUnitIds,
    }) => {
      const build = buildWithRetainedFeatures([unitId]);
      expect(
        project({ build, unitLibrary: catalogWithout(unitId) }),
      ).toMatchObject({
        _tag: "Left",
        left: {
          tag: issueTag,
          message: `${featureName} requires an installed Unit.`,
        },
      });
      expect(
        project({ build, unitLibrary: catalogWithWrongKind(unitId) }),
      ).toMatchObject({
        _tag: "Left",
        left: {
          tag: issueTag,
          message: `${featureName} requires the installed Surface feature record.`,
        },
      });
      expect(
        project({
          build: buildWithRetainedFeatures([
            unitId,
            ...ownerPrerequisiteUnitIds,
          ]),
          unitLibrary,
        }),
      ).toMatchObject({
        _tag: "Left",
        left: {
          tag: issueTag,
          message: expect.stringContaining(
            `requires ${ownerClassName} class progression`,
          ),
        },
      });
    },
  );

  test.each(featureCases)(
    "propagates $unitId projection failure through the routed aggregate",
    ({ unitId, issueTag }) => {
      expect(
        characterBuildClassFeatureFactsProjectionWithRoute({
          build: buildWithRetainedFeatures([unitId]),
          unitLibrary,
          route: ["seed"],
        }),
      ).toMatchObject({
        _tag: "Left",
        left: { tag: issueTag },
      });
    },
  );
});
