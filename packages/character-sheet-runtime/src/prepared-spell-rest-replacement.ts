// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.prepared-spell-rest-replacement
import { isCharacterSheetWithSpellSlots } from "./spell-slots.ts";
// KERNEL-COVERAGE: runtime-owner SHEET.SPELL_ACCESS.SHORT_REST_PREPARED_REPLACEMENT
import {
  availableSpellSlotLevels,
  classSpellcastingCreationAtLevel,
  characterBuildFeatureUnitIds,
  classLevelForUnit,
  type UnitCatalog,
} from "@dnd/character-creation-runtime/consumer-protocol";
import type { PreparedSpellRestReplacementMechanics } from "@dnd/surface/surface/types";
import type { ClassName } from "@dnd/shared/game-facts";
import { readClassCreationFacts } from "@dnd/surface/surface/character-creation-readers";
import { Array, Option, Result } from "effect";
import { projectCharacterSheetClassFeature } from "./character-feature-projection.ts";
import {
  characterSheetIssue,
  type CharacterSheet,
  type CharacterSheetIssue,
  type CharacterSheetPreparedSpellRestReplacement,
} from "./sheet-types.ts";

/** Called only at the completed Short Rest boundary; the build selection owns preparation. */
export function characterSheetWithPreparedSpellRestReplacement(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly replacement: CharacterSheetPreparedSpellRestReplacement | undefined;
}): Result.Result<CharacterSheet, CharacterSheetIssue> {
  const { sheet, replacement, unitLibrary } = input;
  if (replacement === undefined) return Result.succeed(sheet);
  if (!isCharacterSheetWithSpellSlots(sheet))
    return characterSheetIssue(
      "Prepared Spell replacement requires class Spellcasting.",
    );
  const spellcasting = sheet.build.spellcasting;
  const source = spellcasting.sources.find(
    (source) => source.sourceUnitId === replacement.spellcastingSourceUnitId,
  );
  if (source === undefined)
    return characterSheetIssue(
      "Prepared Spell replacement requires an owned Spellcasting source.",
    );
  const eligibility = preparedReplacementEligibility(
    sheet,
    replacement,
    unitLibrary,
  );
  if (Result.isFailure(eligibility)) return Result.fail(eligibility.failure);
  const eligible = eligibility.success;
  const validated = validatePreparedReplacement(source, replacement, eligible);
  if (Result.isFailure(validated)) return Result.fail(validated.failure);
  const build = {
    ...sheet.build,
    spellcasting: {
      ...spellcasting,
      sources: Array.map(spellcasting.sources, (ownedSource) =>
        ownedSource === source
          ? {
              ...ownedSource,
              preparedSpells: ownedSource.preparedSpells.map((spell) =>
                spell === replacement.removedSpellUnitId
                  ? replacement.addedSpellUnitId
                  : spell,
              ),
            }
          : ownedSource,
      ),
    },
  };
  return Result.succeed({ ...sheet, build });
}

function preparedReplacementEligibility(
  sheet: CharacterSheet,
  replacement: CharacterSheetPreparedSpellRestReplacement,
  unitLibrary: UnitCatalog,
): Result.Result<
  ReadonlySet<CharacterSheetPreparedSpellRestReplacement["addedSpellUnitId"]>,
  CharacterSheetIssue
> {
  const classUnit = Option.getOrUndefined(
    unitLibrary.getUnit(replacement.spellcastingSourceUnitId),
  );
  if (classUnit === undefined)
    return characterSheetIssue(
      "Prepared Spell replacement requires an owned Spellcasting source.",
    );
  const facts = readClassCreationFacts(classUnit);
  if (
    facts.tag !== "readable" ||
    facts.value.spellcasting?.kind !== "wizard_spellcasting_creation"
  )
    return characterSheetIssue(
      "Prepared Spell replacement requires Spellbook Spellcasting.",
    );
  const classLevel = classLevelForUnit(
    sheet.build.progression,
    replacement.spellcastingSourceUnitId,
  );
  const rules = ownedPreparedReplacementRules(
    sheet,
    unitLibrary,
    facts.value.className,
    classLevel,
  );
  if (Result.isFailure(rules)) return Result.fail(rules.failure);
  const mechanics = rules.success;
  const owningSpellcasting = classSpellcastingCreationAtLevel(
    facts.value.spellcasting,
    classLevel,
  );
  if (owningSpellcasting?.kind !== "wizard_spellcasting_creation")
    return characterSheetIssue(
      "Prepared Spell replacement requires an admitted Spellcasting table row.",
    );
  const availableLevels = availableSpellSlotLevels(
    owningSpellcasting.spellSlotProjection.slots,
  );
  const eligible = new Set(
    owningSpellcasting.spellbookAccess.spells
      .filter(
        (spell) =>
          spell.spellLevel >= mechanics.minimumSpellLevel &&
          availableLevels.has(spell.spellLevel),
      )
      .map((spell) => spell.spellId),
  );
  return Result.succeed(eligible);
}

function ownedPreparedReplacementRules(
  sheet: CharacterSheet,
  unitLibrary: UnitCatalog,
  className: ClassName,
  classLevel: ReturnType<typeof classLevelForUnit>,
): Result.Result<PreparedSpellRestReplacementMechanics, CharacterSheetIssue> {
  const replacementRules = characterBuildFeatureUnitIds(
    sheet.build,
    unitLibrary,
  ).flatMap((featureId) => {
    const featureUnit = Option.getOrUndefined(unitLibrary.getUnit(featureId));
    if (featureUnit === undefined) return [];
    const feature = Option.getOrUndefined(
      projectCharacterSheetClassFeature(featureUnit),
    );
    return feature?.mechanics.family === "prepared_spell_rest_replacement" &&
      feature.className === className &&
      classLevel >= feature.acquiredAtLevel
      ? [feature.mechanics]
      : [];
  });
  const [mechanics, ...additionalRules] = replacementRules;
  if (mechanics === undefined || additionalRules.length !== 0)
    return characterSheetIssue(
      "Prepared Spell replacement requires one owned Short Rest replacement feature.",
    );
  return Result.succeed(mechanics);
}

type PreparedSpellSource = NonNullable<
  CharacterSheet["build"]["spellcasting"]
>["sources"][number];
function validatePreparedReplacement(
  source: PreparedSpellSource,
  replacement: CharacterSheetPreparedSpellRestReplacement,
  eligible: ReadonlySet<
    CharacterSheetPreparedSpellRestReplacement["addedSpellUnitId"]
  >,
): Result.Result<void, CharacterSheetIssue> {
  if (
    !source.preparedSpells.includes(replacement.removedSpellUnitId) ||
    !eligible.has(replacement.removedSpellUnitId)
  )
    return characterSheetIssue(
      "Prepared Spell replacement must remove one prepared level 1+ class spell.",
    );
  if (
    !source.spellbook.includes(replacement.addedSpellUnitId) ||
    !eligible.has(replacement.addedSpellUnitId) ||
    source.preparedSpells.includes(replacement.addedSpellUnitId)
  )
    return characterSheetIssue(
      "Prepared Spell replacement must add another eligible level 1+ spell from the owned Spellbook.",
    );
  return Result.succeed(undefined);
}
