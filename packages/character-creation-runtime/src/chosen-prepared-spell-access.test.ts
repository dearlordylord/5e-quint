// KERNEL-COVERAGE: parity-witness CREATION.SPELL_ACCESS.CHOSEN_PREPARED_PAIR
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-creation.chosen-prepared-spell-access
import { Option, Result } from "effect";
import { expect, test } from "vitest";
import { unitId } from "@dnd/shared/game-facts";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import {
  bardCreationAtLevel,
  bardGainSpellcastingLevel,
} from "./bard-feature-sdk.test-support.ts";
import { characterBuildFeatureUnitIds } from "./finalization.ts";
import {
  eligibleChosenPreparedSpellIds,
  selectedPreparedSpellAccess,
  validateChosenPreparedSpellAccessBuild,
} from "./chosen-prepared-spell-access.ts";
import type { CharacterBuild, UnitCatalog } from "./types.ts";
const catalog = buildUnitCatalog({ collections: [srdUnitCollection] });
if (catalog.tag !== "ok") throw new Error("Installed catalog required");
const unitLibrary = catalog.catalog;
const feature = unitLibrary.requireUnit("bard_magical_discoveries");
if (
  feature.kind !== "class_feature" ||
  feature.mechanics.family !== "chosen_prepared_spell_access"
)
  throw new Error("Chosen spell owner required");
function validate(build: CharacterBuild, library: UnitCatalog = unitLibrary) {
  return validateChosenPreparedSpellAccessBuild({
    build,
    unitLibrary: library,
    earnedFeatureUnitIds: characterBuildFeatureUnitIds(build, library),
  });
}
test("stored source pair is exact, earned, distinct and eligible for its own slots", () => {
  const build = bardCreationAtLevel(6, unitLibrary).build;
  expect(
    Result.isSuccess(validate(bardCreationAtLevel(2, unitLibrary).build)),
  ).toBe(true);
  expect(Result.isSuccess(validate(build))).toBe(true);
  const selected = build.features.find(
    (f) => f.kind === "selectedPreparedSpellAccess",
  );
  if (selected?.kind !== "selectedPreparedSpellAccess")
    throw new Error("Pair required");
  const retained = build.features.filter(
    (f) => f.kind !== "selectedPreparedSpellAccess",
  );
  expect(Result.isFailure(validate({ ...build, features: retained }))).toBe(
    true,
  );
  expect(
    Result.isFailure(
      validate({ ...build, features: [...build.features, selected] }),
    ),
  ).toBe(true);
  expect(
    Result.isFailure(
      validateChosenPreparedSpellAccessBuild({
        build: { ...build, features: [...retained, selected, selected] },
        unitLibrary,
        earnedFeatureUnitIds: [feature.id, feature.id],
      }),
    ),
  ).toBe(true);
  expect(
    Result.isFailure(
      validate({
        ...build,
        features: [
          ...retained,
          { ...selected, selectedFromUnitId: unitId("fighter_second_wind") },
        ],
      }),
    ),
  ).toBe(true);
  expect(
    Result.isFailure(
      validate({
        ...build,
        features: [
          ...retained,
          { ...selected, spellIds: [unitId("fire_bolt"), unitId("fire_bolt")] },
        ],
      }),
    ),
  ).toBe(true);
  expect(
    Result.isFailure(
      validate({
        ...build,
        features: [
          ...retained,
          {
            ...selected,
            spellIds: [unitId("fire_bolt"), unitId("mass_cure_wounds")],
          },
        ],
      }),
    ),
  ).toBe(true);
  const absentOwnerLibrary = {
    ...unitLibrary,
    getUnit: (id: Parameters<UnitCatalog["getUnit"]>[0]) =>
      id === build.progression.startingClass
        ? Option.none()
        : unitLibrary.getUnit(id),
  };
  expect(
    Result.isFailure(
      validateChosenPreparedSpellAccessBuild({
        build,
        unitLibrary: absentOwnerLibrary,
        earnedFeatureUnitIds: [feature.id],
      }),
    ),
  ).toBe(true);
});
test("eligibility requires parsed mechanics, canonical class, its spellcasting and installed spells", () => {
  const other = unitLibrary.requireUnit("fighter_second_wind");
  if (other.kind !== "class_feature") throw new Error("Feature required");
  expect(
    eligibleChosenPreparedSpellIds({
      feature: other,
      classLevel: 6,
      unitLibrary,
    }),
  ).toEqual([]);
  expect(
    eligibleChosenPreparedSpellIds({ feature, classLevel: 99, unitLibrary }),
  ).toEqual([]);
  const noClass = {
    ...unitLibrary,
    listUnits: () => unitLibrary.listUnits().filter((u) => u.kind !== "class"),
  };
  expect(
    eligibleChosenPreparedSpellIds({
      feature,
      classLevel: 6,
      unitLibrary: noClass,
    }),
  ).toEqual([]);
  const noCasting = {
    ...unitLibrary,
    listUnits: () =>
      unitLibrary.listUnits().map((u) => {
        if (u.kind !== "class" || u.className !== "bard") return u;
        const { spellcasting, ...rest } = u;
        return rest;
      }),
  };
  expect(
    eligibleChosenPreparedSpellIds({
      feature,
      classLevel: 6,
      unitLibrary: noCasting,
    }),
  ).toEqual([]);
  const noSpells = {
    ...unitLibrary,
    getUnit: (id: Parameters<UnitCatalog["getUnit"]>[0]) => {
      const unit = unitLibrary.getUnit(id);
      return Option.isSome(unit) && unit.value.kind === "spell"
        ? Option.none()
        : unit;
    },
  };
  expect(
    eligibleChosenPreparedSpellIds({
      feature,
      classLevel: 6,
      unitLibrary: noSpells,
    }),
  ).toEqual([]);
  const absentLists = {
    ...unitLibrary,
    listUnits: () =>
      unitLibrary
        .listUnits()
        .filter((u) => u.kind !== "class" || u.className === "bard"),
  };
  expect(
    eligibleChosenPreparedSpellIds({
      feature,
      classLevel: 6,
      unitLibrary: absentLists,
    }),
  ).toEqual([]);
  for (const spellIds of [
    [],
    [unitId("aid")],
    [unitId("aid"), unitId("aid")],
    [unitId("aid"), unitId("fire_bolt"), unitId("revivify")],
  ])
    expect(
      Result.isFailure(
        selectedPreparedSpellAccess({ featureUnitId: feature.id, spellIds }),
      ),
    ).toBe(true);
});
test("real gained source selection retains a pair and permits only one later replacement", () => {
  const five = bardCreationAtLevel(5, unitLibrary).build;
  const gain = (spellIds: readonly ReturnType<typeof unitId>[]) => ({
    kind: "preparedSpellAccess" as const,
    featureUnitId: feature.id,
    spellIds,
  });
  expect(
    Result.isFailure(
      bardGainSpellcastingLevel({
        build: five,
        nextLevel: 6,
        gainedChoices: [],
        unitLibrary,
      }),
    ),
  ).toBe(true);
  for (const ids of [
    [unitId("fire_bolt")],
    [unitId("fire_bolt"), unitId("mass_cure_wounds")],
    [unitId("fire_bolt"), unitId("eldritch_blast")],
  ])
    expect(
      Result.isFailure(
        bardGainSpellcastingLevel({
          build: five,
          nextLevel: 6,
          gainedChoices: [gain(ids)],
          unitLibrary,
        }),
      ),
    ).toBe(true);
  expect(
    bardGainSpellcastingLevel({
      build: five,
      nextLevel: 6,
      gainedChoices: [
        {
          ...gain([unitId("fire_bolt"), unitId("aid")]),
          featureUnitId: unitId("fighter_second_wind"),
        },
      ],
      unitLibrary,
    }),
  ).toMatchObject({
    _tag: "Failure",
    failure: {
      code: "invalidPreparedSpellAccessGain",
      message: "Prepared Spell Access names an unearned feature source.",
    },
  });
  const six = bardGainSpellcastingLevel({
    build: five,
    nextLevel: 6,
    gainedChoices: [gain([unitId("fire_bolt"), unitId("revivify")])],
    unitLibrary,
  });
  if (Result.isFailure(six)) throw new Error(JSON.stringify(six.failure));
  expect(
    Result.isSuccess(
      bardGainSpellcastingLevel({
        build: six.success,
        nextLevel: 7,
        gainedChoices: [],
        unitLibrary,
      }),
    ),
  ).toBe(true);
  expect(
    Result.isFailure(
      bardGainSpellcastingLevel({
        build: six.success,
        nextLevel: 7,
        gainedChoices: [gain([unitId("aid"), unitId("guidance")])],
        unitLibrary,
      }),
    ),
  ).toBe(true);
  expect(
    Result.isSuccess(
      bardGainSpellcastingLevel({
        build: six.success,
        nextLevel: 7,
        gainedChoices: [gain([unitId("fire_bolt"), unitId("aid")])],
        unitLibrary,
      }),
    ),
  ).toBe(true);
  expect(
    Result.isFailure(
      bardGainSpellcastingLevel({
        build: five,
        nextLevel: 6,
        gainedChoices: [
          gain([unitId("fire_bolt"), unitId("aid")]),
          gain([unitId("fire_bolt"), unitId("aid")]),
        ],
        unitLibrary,
      }),
    ),
  ).toBe(true);
});
