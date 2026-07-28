import {
  statBlockId as authoredStatBlockId,
  unitId as authoredUnitId,
} from "@dnd/shared/game-facts";
import { abilityScore, resourceCount } from "@dnd/shared/types";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { UnitRecord } from "@dnd/surface/surface/types";
import { Either, Option } from "effect";
import { describe, expect, test } from "vitest";

import {
  DRUID_WILD_SHAPE_KNOWN_FORM_ISSUE_CODES,
  DRUID_WILD_SHAPE_UNIT_ID,
  characterBuildDruidWildShapeFacts,
  classUnitId,
  messageForDruidWildShapeKnownFormIssue,
  replaceDruidWildShapeKnownForm,
  validateDruidWildShapeKnownFormIssues,
  validateDruidWildShapeKnownFormRecords,
  validateDruidWildShapeKnownForms,
  type CharacterBuild,
  type CharacterBuildDruidWildShapeFacts,
  type DruidWildShapeKnownFormIssue,
  type UnitCatalog,
} from "./index.ts";

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("The SRD Unit catalog Wild Shape fixture must compose.");
}
const unitLibrary = unitCatalogResult.catalog;

const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});
if (statBlockCatalogResult.tag !== "ok") {
  throw new Error("The SRD Stat Block Wild Shape fixture must compose.");
}
const statBlockCatalog = statBlockCatalogResult.catalog;

const eligibleFormIds = [
  authoredStatBlockId("stat_block_rat"),
  authoredStatBlockId("stat_block_riding_horse"),
  authoredStatBlockId("stat_block_spider"),
  authoredStatBlockId("stat_block_wolf"),
] as const;

const wildShapeFacts: CharacterBuildDruidWildShapeFacts = {
  unitId: DRUID_WILD_SHAPE_UNIT_ID,
  useCount: {
    maximum: resourceCount(2),
    shortRestRefill: resourceCount(1),
    longRestRefillsAll: true,
  },
  duration: { unit: "hour", amount: 1 },
  knownFormRoster: {
    creatureType: "beast",
    count: 4,
    maxChallengeRating: 0.25,
    flySpeed: "forbidden",
    longRestReplacementCount: 1,
  },
};

function retainedFeatureBuild(
  featureUnitIds: readonly UnitRecord["id"][],
): CharacterBuild {
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
    features: featureUnitIds.map((unitId) => ({
      kind: "selectedClassChoice",
      selectedFromUnitId: authoredUnitId("synthetic_feature_source"),
      unitId,
    })),
    equipment: { owned: [], loadout: {} },
  };
}

function catalogWithSecondWildShapeFeature(): {
  readonly catalog: UnitCatalog;
  readonly featureUnitId: UnitRecord["id"];
} {
  const wildShape = unitLibrary.getUnit(DRUID_WILD_SHAPE_UNIT_ID);
  if (Option.isNone(wildShape) || wildShape.value.kind !== "class_feature") {
    throw new Error("The Wild Shape feature fixture must be installed.");
  }
  const featureUnitId = authoredUnitId("synthetic_second_wild_shape");
  const duplicate = {
    ...wildShape.value,
    id: featureUnitId,
  } satisfies UnitRecord;
  return {
    featureUnitId,
    catalog: {
      getUnit: (unitId) =>
        unitId === featureUnitId
          ? Option.some(duplicate)
          : unitLibrary.getUnit(unitId),
      listUnits: () => [...unitLibrary.listUnits(), duplicate],
      requireUnit: (unitId) =>
        unitId === featureUnitId ? duplicate : unitLibrary.requireUnit(unitId),
    },
  };
}

describe("Druid Wild Shape boundaries", () => {
  test("distinguishes absent, owner-mismatched, and ambiguous retained features", () => {
    expect(
      characterBuildDruidWildShapeFacts({
        build: retainedFeatureBuild([]),
        unitLibrary,
      }),
    ).toEqual(Either.right(undefined));
    expect(
      characterBuildDruidWildShapeFacts({
        build: retainedFeatureBuild([DRUID_WILD_SHAPE_UNIT_ID]),
        unitLibrary,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: "Wild Shape projection requires Druid class progression.",
      },
    });

    const secondFeature = catalogWithSecondWildShapeFeature();
    expect(
      characterBuildDruidWildShapeFacts({
        build: retainedFeatureBuild([
          DRUID_WILD_SHAPE_UNIT_ID,
          secondFeature.featureUnitId,
        ]),
        unitLibrary: secondFeature.catalog,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Wild Shape projection supports exactly one Druid Wild Shape feature.",
      },
    });
  });

  test("reports every identified known-form eligibility issue", () => {
    const scenarioByIssueCode = {
      wildShapeKnownFormCountMismatch: {
        knownFormStatBlockIds: [
          eligibleFormIds[0],
          eligibleFormIds[0],
          eligibleFormIds[2],
          eligibleFormIds[3],
        ],
        expected: { code: "wildShapeKnownFormCountMismatch" },
      },
      wildShapeKnownFormUnavailable: {
        knownFormStatBlockIds: [
          ...eligibleFormIds.slice(0, 3),
          authoredStatBlockId("synthetic_unavailable"),
        ],
        expected: {
          code: "wildShapeKnownFormUnavailable",
          statBlockId: authoredStatBlockId("synthetic_unavailable"),
        },
      },
      wildShapeKnownFormWrongCreatureType: {
        knownFormStatBlockIds: [
          ...eligibleFormIds.slice(0, 3),
          authoredStatBlockId("stat_block_skeleton"),
        ],
        expected: {
          code: "wildShapeKnownFormWrongCreatureType",
          statBlockId: authoredStatBlockId("stat_block_skeleton"),
        },
      },
      wildShapeKnownFormChallengeRatingExceeded: {
        knownFormStatBlockIds: [
          ...eligibleFormIds.slice(0, 3),
          authoredStatBlockId("stat_block_imp"),
        ],
        expected: {
          code: "wildShapeKnownFormChallengeRatingExceeded",
          statBlockId: authoredStatBlockId("stat_block_imp"),
        },
      },
      wildShapeKnownFormFlySpeedForbidden: {
        knownFormStatBlockIds: [
          ...eligibleFormIds.slice(0, 3),
          authoredStatBlockId("stat_block_hawk"),
        ],
        expected: {
          code: "wildShapeKnownFormFlySpeedForbidden",
          statBlockId: authoredStatBlockId("stat_block_hawk"),
        },
      },
    } as const satisfies Record<
      DruidWildShapeKnownFormIssue["code"],
      {
        readonly knownFormStatBlockIds: readonly ReturnType<
          typeof authoredStatBlockId
        >[];
        readonly expected: DruidWildShapeKnownFormIssue;
      }
    >;

    for (const code of DRUID_WILD_SHAPE_KNOWN_FORM_ISSUE_CODES) {
      const { knownFormStatBlockIds, expected } = scenarioByIssueCode[code];
      expect(
        validateDruidWildShapeKnownFormIssues({
          facts: wildShapeFacts,
          knownFormStatBlockIds,
          statBlockCatalog,
        }),
      ).toContainEqual(expected);
    }

    expect(
      validateDruidWildShapeKnownFormIssues({
        facts: wildShapeFacts,
        knownFormStatBlockIds: [
          authoredStatBlockId("synthetic_unavailable"),
          authoredStatBlockId("stat_block_skeleton"),
          authoredStatBlockId("stat_block_hawk"),
          authoredStatBlockId("stat_block_rat"),
        ],
        statBlockCatalog,
      }),
    ).toEqual([
      {
        code: "wildShapeKnownFormFlySpeedForbidden",
        statBlockId: "stat_block_hawk",
      },
      {
        code: "wildShapeKnownFormWrongCreatureType",
        statBlockId: "stat_block_skeleton",
      },
      {
        code: "wildShapeKnownFormUnavailable",
        statBlockId: "synthetic_unavailable",
      },
    ]);
  });

  test("validates known-form ids and records with cause-specific messages", () => {
    expect(
      validateDruidWildShapeKnownForms({
        facts: wildShapeFacts,
        knownFormStatBlockIds: eligibleFormIds,
        statBlockCatalog,
      }),
    ).toEqual(Either.right(eligibleFormIds));
    expect(
      validateDruidWildShapeKnownForms({
        facts: wildShapeFacts,
        knownFormStatBlockIds: eligibleFormIds.slice(0, 3),
        statBlockCatalog,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Wild Shape known forms must match the Druid's known-form count.",
      },
    });

    const eligibleRecords = eligibleFormIds.map((statBlockId) =>
      statBlockCatalog.requireStatBlock(statBlockId),
    );
    expect(
      validateDruidWildShapeKnownFormRecords({
        facts: wildShapeFacts,
        knownForms: eligibleRecords,
      }),
    ).toEqual(Either.right(eligibleRecords));
    expect(
      validateDruidWildShapeKnownFormRecords({
        facts: wildShapeFacts,
        knownForms: eligibleRecords.slice(0, 3),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Wild Shape known forms must match the Druid's known-form count.",
      },
    });
    expect(
      validateDruidWildShapeKnownFormRecords({
        facts: wildShapeFacts,
        knownForms: [
          ...eligibleRecords.slice(0, 3),
          statBlockCatalog.requireStatBlock("stat_block_hawk"),
        ],
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Wild Shape known forms cannot have a Fly Speed at this Druid level.",
      },
    });
  });

  test("rejects each invalid known-form replacement relation", () => {
    const cases = [
      {
        currentKnownFormStatBlockIds: eligibleFormIds.slice(0, 3),
        replacement: {
          replaceStatBlockId: eligibleFormIds[0],
          selectedStatBlockId: authoredStatBlockId("stat_block_cat"),
        },
        message:
          "Wild Shape known forms must match the Druid's known-form count.",
      },
      {
        currentKnownFormStatBlockIds: eligibleFormIds,
        replacement: {
          replaceStatBlockId: eligibleFormIds[0],
          selectedStatBlockId: eligibleFormIds[0],
        },
        message:
          "Wild Shape known-form replacement must choose another eligible form.",
      },
      {
        currentKnownFormStatBlockIds: eligibleFormIds,
        replacement: {
          replaceStatBlockId: authoredStatBlockId("stat_block_cat"),
          selectedStatBlockId: authoredStatBlockId("stat_block_frog"),
        },
        message:
          "Wild Shape known-form replacement must replace a currently known form.",
      },
      {
        currentKnownFormStatBlockIds: eligibleFormIds,
        replacement: {
          replaceStatBlockId: eligibleFormIds[0],
          selectedStatBlockId: eligibleFormIds[1],
        },
        message:
          "Wild Shape known forms must remain distinct after replacement.",
      },
      {
        currentKnownFormStatBlockIds: eligibleFormIds,
        replacement: {
          replaceStatBlockId: eligibleFormIds[0],
          selectedStatBlockId: authoredStatBlockId("stat_block_hawk"),
        },
        message:
          "Wild Shape known forms cannot have a Fly Speed at this Druid level.",
      },
    ] as const;

    for (const {
      currentKnownFormStatBlockIds,
      replacement,
      message,
    } of cases) {
      expect(
        replaceDruidWildShapeKnownForm({
          facts: wildShapeFacts,
          currentKnownFormStatBlockIds,
          replacement,
          statBlockCatalog,
        }),
      ).toMatchObject({
        _tag: "Left",
        left: { tag: "druidWildShapeFactsIssue", message },
      });
    }
  });

  test("maps every known-form issue code to its stable user-facing message", () => {
    const messageFragmentByCode = {
      wildShapeKnownFormCountMismatch: "known-form count",
      wildShapeKnownFormUnavailable: "available Stat Blocks",
      wildShapeKnownFormWrongCreatureType: "eligible Beast",
      wildShapeKnownFormChallengeRatingExceeded: "Challenge Rating",
      wildShapeKnownFormFlySpeedForbidden: "Fly Speed",
    } as const satisfies Record<DruidWildShapeKnownFormIssue["code"], string>;
    for (const code of DRUID_WILD_SHAPE_KNOWN_FORM_ISSUE_CODES) {
      const issue =
        code === "wildShapeKnownFormCountMismatch"
          ? { code }
          : {
              code,
              statBlockId: authoredStatBlockId("synthetic_form"),
            };
      expect(messageForDruidWildShapeKnownFormIssue(issue)).toContain(
        messageFragmentByCode[code],
      );
    }
  });
});
