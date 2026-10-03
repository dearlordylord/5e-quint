// KERNEL-COVERAGE: runtime-owner CREATION.SPELL_ACCESS.CHOSEN_PREPARED_PAIR
// UNIT-PROFILE-COVERAGE: runtime-owner character-creation.chosen-prepared-spell-access
import { Option, Result } from "effect";
import { classSpellListForClassName } from "@dnd/surface/surface/unit-catalog-core";
import type {
  ClassFeatureRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import type {
  CharacterBuild,
  CharacterBuildFeature,
  UnitCatalog,
} from "./types.ts";
import {
  classLevelForUnit,
  progressionClassUnitIds,
} from "./character-progression-types.ts";
import { projectClassDefinitionFacts } from "./character-definition-projection.ts";
import {
  classSpellcastingCreationAtLevel,
  availableSpellSlotLevels,
} from "./class-spellcasting.ts";

export type SelectedPreparedSpellAccess = Extract<
  CharacterBuildFeature,
  { readonly kind: "selectedPreparedSpellAccess" }
>;
export const CHOSEN_PREPARED_SPELL_ACCESS_CHOICE_KEY =
  "chosen_prepared_spell_access" as const;

export function eligibleChosenPreparedSpellIds(input: {
  readonly feature: ClassFeatureRecord;
  readonly classLevel: number;
  readonly unitLibrary: UnitCatalog;
}): readonly UnitRecord["id"][] {
  if (input.feature.mechanics.family !== "chosen_prepared_spell_access")
    return [];
  const owner = input.unitLibrary
    .listUnits()
    .find(
      (unit) =>
        unit.kind === "class" && unit.className === input.feature.className,
    );
  if (owner === undefined || owner.kind !== "class") return [];
  const spellcasting = classSpellcastingCreationAtLevel(
    projectClassDefinitionFacts(owner).spellcasting,
    input.classLevel,
  );
  if (spellcasting === undefined || !("spellSlotProjection" in spellcasting))
    return [];
  const levels = availableSpellSlotLevels(
    spellcasting.spellSlotProjection.slots,
  );
  const ids = input.feature.mechanics.eligibleSpellLists.flatMap(
    (className) => {
      const list = classSpellListForClassName({
        className,
        unitLibrary: input.unitLibrary,
      });
      return list === undefined
        ? []
        : [
            ...list.cantrips,
            ...list.leveled
              .filter((spell) => levels.has(spell.spellLevel))
              .map((spell) => spell.spellId),
          ];
    },
  );
  return [...new Set(ids)].filter((id) => {
    const unit = input.unitLibrary.getUnit(id);
    return Option.isSome(unit) && unit.value.kind === "spell";
  });
}

export function selectedPreparedSpellAccess(input: {
  readonly featureUnitId: UnitRecord["id"];
  readonly spellIds: readonly UnitRecord["id"][];
}): Result.Result<SelectedPreparedSpellAccess, string> {
  const [first, second, ...extra] = input.spellIds;
  return first === undefined ||
    second === undefined ||
    extra.length > 0 ||
    first === second
    ? Result.fail("Prepared Spell Access requires exactly two distinct spells.")
    : Result.succeed({
        kind: "selectedPreparedSpellAccess",
        selectedFromUnitId: input.featureUnitId,
        spellIds: [first, second],
      });
}

/** Storage admission checks the retained source against earned catalog grants. */
export function validateChosenPreparedSpellAccessBuild(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly earnedFeatureUnitIds: readonly UnitRecord["id"][];
}): Result.Result<void, string> {
  const expected = input.earnedFeatureUnitIds.flatMap((id) => {
    const unit = input.unitLibrary.getUnit(id);
    return Option.isSome(unit) &&
      unit.value.kind === "class_feature" &&
      unit.value.mechanics.family === "chosen_prepared_spell_access"
      ? [unit.value]
      : [];
  });
  const selected = input.build.features.filter(
    (feature) => feature.kind === "selectedPreparedSpellAccess",
  );
  if (selected.length !== expected.length)
    return Result.fail(
      "Chosen Prepared Spell Access requires exactly one selection per earned feature source.",
    );
  for (const feature of expected) {
    const selections = selected.filter(
      (selection) => selection.selectedFromUnitId === feature.id,
    );
    const selection = selections[0];
    if (selection === undefined || selections.length !== 1)
      return Result.fail(
        "Chosen Prepared Spell Access must retain its earned source.",
      );
    const distinct = selectedPreparedSpellAccess({
      featureUnitId: feature.id,
      spellIds: selection.spellIds,
    });
    if (Result.isFailure(distinct)) return Result.fail(distinct.failure);
    const ownerId = progressionClassUnitIds(input.build.progression).find(
      (id) => {
        const unit = input.unitLibrary.getUnit(id);
        return (
          Option.isSome(unit) &&
          unit.value.kind === "class" &&
          unit.value.className === feature.className
        );
      },
    );
    if (ownerId === undefined)
      return Result.fail(
        "Chosen Prepared Spell Access must have its owning class in the build.",
      );
    const eligible = new Set(
      eligibleChosenPreparedSpellIds({
        feature,
        classLevel: classLevelForUnit(input.build.progression, ownerId),
        unitLibrary: input.unitLibrary,
      }),
    );
    if (selection.spellIds.some((id) => !eligible.has(id)))
      return Result.fail(
        "Chosen Prepared Spell Access contains an ineligible spell for its owning class level.",
      );
  }
  return Result.succeed(undefined);
}
