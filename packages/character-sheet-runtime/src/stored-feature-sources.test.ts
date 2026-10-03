import { Result } from "effect";
import { expect, test } from "vitest";
import { bardCreationAtLevel } from "../../character-creation-runtime/src/bard-feature-sdk.test-support.ts";
import { armorClassBuild, unitLibrary } from "./test-support.test-support.ts";
import { parseCharacterBuild } from "./stored-sheet-parser.ts";

function expectRejected(build: unknown, message: string) {
  const result = parseCharacterBuild(build, unitLibrary);
  expect(Result.isFailure(result), JSON.stringify(result)).toBe(true);
  if (Result.isFailure(result))
    expect(result.failure.message).toContain(message);
}

test("stored chosen spell pair retains its exact source and rejects malformed pairs", () => {
  const build = bardCreationAtLevel(6, unitLibrary).build;
  expect(
    Result.isSuccess(
      parseCharacterBuild(JSON.parse(JSON.stringify(build)), unitLibrary),
    ),
  ).toBe(true);
  const pair = build.features.find(
    (feature) => feature.kind === "selectedPreparedSpellAccess",
  );
  expect(pair).toBeDefined();
  const retained = build.features.filter((feature) => feature !== pair);
  for (const spellIds of [
    null,
    [],
    ["aid"],
    ["aid", "aid"],
    ["aid", "fire_bolt", "revivify"],
  ]) {
    expectRejected(
      { ...build, features: [...retained, { ...pair, spellIds }] },
      "two distinct",
    );
  }
  expectRejected({ ...build, features: retained }, "Prepared");
  expectRejected({ ...build, features: [...build.features, pair] }, "Prepared");
});

test("stored defense selection must belong to exactly one earned source", () => {
  const rawBase = armorClassBuild({
    startingClass: "class_ranger",
    advancements: Array(6).fill("class_ranger"),
  });
  const base = {
    ...rawBase,
    classFeatureLanguages: [
      {
        kind: "classFeatureLanguageChoice",
        sourceUnitId: "ranger_deft_explorer",
        language: "Elvish",
      },
      {
        kind: "classFeatureLanguageChoice",
        sourceUnitId: "ranger_deft_explorer",
        language: "Halfling",
      },
    ],
  };
  const subclass = {
    kind: "selectedClassChoice",
    unitId: "subclass_ranger_hunter",
    selectedFromUnitId: "class_ranger",
  };
  const selection = {
    kind: "selectedClassChoice",
    unitId: "ranger_defensive_tactics",
    selectedFromUnitId: "ranger_defensive_tactics",
    selectedOption: {
      kind: "attackRollDefense",
      selection: "opportunityAttackDisadvantage",
    },
  };
  const features = [...base.features, subclass];
  const build = { ...base, features: [...features, selection] };
  expect(parseCharacterBuild(build, unitLibrary)).toMatchObject({
    _tag: "Success",
  });
  for (const replacement of [
    undefined,
    { ...selection, selectedOption: undefined },
    { ...selection, selectedFromUnitId: "class_ranger" },
  ]) {
    expectRejected(
      {
        ...base,
        features: [
          ...features,
          ...(replacement === undefined ? [] : [replacement]),
        ],
      },
      "exactly one",
    );
  }
  expectRejected(
    { ...build, features: [...build.features, selection] },
    "exactly one",
  );
  expectRejected(
    {
      ...build,
      features: [
        ...build.features,
        { ...selection, unitId: "missing_feature" },
      ],
    },
    "earned feature mechanics",
  );
  expectRejected(
    {
      ...build,
      features: [...build.features, { ...selection, unitId: "feat_archery" }],
    },
    "earned feature mechanics",
  );
  expectRejected(
    {
      ...build,
      features: [
        ...features,
        {
          ...selection,
          selectedOption: { kind: "attackRollDefense", selection: "forged" },
        },
      ],
    },
    "selected option",
  );
});

test("stored repeatable feat occurrences preserve grant levels and reject forged provenance", () => {
  const build = armorClassBuild({
    startingClass: "class_fighter",
    advancements: Array(7).fill("class_fighter"),
  });
  expect(parseCharacterBuild(build, unitLibrary)).toMatchObject({
    _tag: "Success",
  });
  const feat = build.features.find(
    (feature) =>
      feature.kind === "selectedClassChoice" &&
      feature.selectedFromGrantLevel === 8,
  );
  expect(feat).toBeDefined();
  const retained = build.features.filter((feature) => feature !== feat);
  expectRejected({ ...build, features: retained }, "missing an earned");
  expectRejected(
    { ...build, features: [...build.features, feat] },
    "duplicated",
  );
  for (const selectedFromGrantLevel of [0, 21, "8"]) {
    expectRejected(
      {
        ...build,
        features: [...retained, { ...feat, selectedFromGrantLevel }],
      },
      "grant level is invalid",
    );
  }
  expectRejected(
    {
      ...build,
      features: [...retained, { ...feat, selectedFromGrantLevel: 9 }],
    },
    "exceeds",
  );
  expectRejected(
    {
      ...build,
      features: [...retained, { ...feat, selectedFromGrantLevel: 7 }],
    },
    "canonical grant occurrence",
  );
  expectRejected(
    {
      ...build,
      features: [
        ...retained,
        { ...feat, selectedFromUnitId: "missing_source" },
      ],
    },
    "no class-feature source",
  );
  expectRejected(
    {
      ...build,
      features: [
        ...retained,
        { ...feat, selectedFromUnitId: "wizard_ability_score_improvement_l4" },
      ],
    },
    "exceeds",
  );
});

test("chosen prepared spells project the earned pair with the owning class ability", async () => {
  const {
    characterSheetClassFeaturePreparedSpellAccessesForBuild,
    characterSheetSpellAccessesForBuild,
  } = await import("./class-feature-spells.ts");
  const { projectFixtureCatalog } =
    await import("./class-feature-catalog.test-support.ts");
  const { Option } = await import("effect");
  const build = bardCreationAtLevel(6, unitLibrary).build;
  const pair = build.features.find(
    (feature) => feature.kind === "selectedPreparedSpellAccess",
  );
  if (pair?.kind !== "selectedPreparedSpellAccess")
    throw new Error("Earned Bard pair required");
  expect(
    characterSheetClassFeaturePreparedSpellAccessesForBuild({
      build,
      unitLibrary,
    }),
  ).toContainEqual({
    sourceUnitId: pair.selectedFromUnitId,
    spellIds: pair.spellIds,
  });
  const projected = characterSheetSpellAccessesForBuild({ build, unitLibrary });
  for (const spellId of pair.spellIds)
    expect(projected).toContainEqual({
      source: "classFeature",
      sourceUnitId: pair.selectedFromUnitId,
      spellId,
      spellcastingAbility: "cha",
      preparation: "alwaysPrepared",
    });
  const missingSource = projectFixtureCatalog(unitLibrary, (unit) =>
    unit.id === pair.selectedFromUnitId ? Option.none() : Option.some(unit),
  );
  expect(
    characterSheetSpellAccessesForBuild({
      build,
      unitLibrary: missingSource,
    }).filter((access) => access.sourceUnitId === pair.selectedFromUnitId),
  ).toEqual([]);
  const missingClass = projectFixtureCatalog(unitLibrary, (unit) =>
    unit.kind === "class" ? Option.none() : Option.some(unit),
  );
  expect(
    characterSheetSpellAccessesForBuild({
      build,
      unitLibrary: missingClass,
    }).filter((access) => access.sourceUnitId === pair.selectedFromUnitId),
  ).toEqual([]);
  const { spellcasting: omittedSpellcasting, ...withoutSpellcasting } = build;
  expect(omittedSpellcasting).toBeDefined();
  expect(
    characterSheetSpellAccessesForBuild({
      build: withoutSpellcasting,
      unitLibrary,
    }).filter((access) => access.sourceUnitId === pair.selectedFromUnitId),
  ).toEqual([]);
});

test("stored feature parsing rejects malformed selections before source projection", () => {
  const base = armorClassBuild({ startingClass: "class_fighter" });
  for (const feature of [
    {
      kind: "selectedEldritchInvocation",
      selectedFromUnitId: "warlock_eldritch_invocations",
      selection: null,
    },
    {
      kind: "selectedSorcererMetamagicOption",
      selectedFromUnitId: "sorcerer_metamagic",
      optionId: 1,
    },
    { kind: "forged_feature", selectedFromUnitId: "fighter_fighting_style" },
  ])
    expectRejected(
      { ...base, features: [...base.features, feature] },
      "feature is invalid",
    );
  expectRejected({ ...base, alignment: null }, "requires alignment");
});
