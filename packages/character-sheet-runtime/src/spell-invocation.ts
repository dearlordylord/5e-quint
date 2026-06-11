// KERNEL-COVERAGE: runtime-owner SHEET.SPELLBOOK_RITUAL.SPELL_ACCESS_PROJECTION
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.spellbook-ritual-invocation
import {
  characterBuildFeatureUnitIds,
  classLevelForUnit,
  type CharacterBuild,
  type UnitCatalog,
} from "@dnd/character-creation-runtime";
import { readClassCreationFacts } from "@dnd/surface/surface/character-creation-readers";
import type {
  SpellRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import { Either, Option } from "effect";

import {
  RITUAL_ADDITIONAL_CASTING_TIME_MINUTES,
  characterSheetIssue,
  getRequiredUnit,
  type CharacterSheetBookOfShadowsRitualInvocation,
  type CharacterSheetIssue,
  type CharacterSheetSpellInvocation,
  type CharacterSheetSpellInvocationInput,
  type CharacterSheetSpellbookRitualAccess,
  type CharacterSheetSpellbookRitualAccessInput,
  type CharacterSheetSpellbookRitualInvocation,
  type SpellcastingCharacterBuild,
} from "./sheet-types.ts";

type CharacterSheetClassFeatureRecord = Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
>;
type SpellbookRitualAccessMechanics = Extract<
  CharacterSheetClassFeatureRecord["mechanics"],
  { readonly family: "spellbook_ritual_access" }
>;
type CharacterSheetSpellbookRitualFeature = CharacterSheetClassFeatureRecord & {
  readonly mechanics: SpellbookRitualAccessMechanics;
};

export function characterSheetSpellInvocation(
  input: CharacterSheetSpellInvocationInput,
): Either.Either<CharacterSheetSpellInvocation, CharacterSheetIssue> {
  const bookOfShadowsRitual =
    characterSheetBookOfShadowsRitualInvocation(input);
  if (bookOfShadowsRitual !== null) {
    return bookOfShadowsRitual;
  }
  return characterSheetSpellbookRitualInvocation(input);
}

export function characterSheetSpellbookRitualAccess(
  input: CharacterSheetSpellbookRitualAccessInput,
): Either.Either<CharacterSheetSpellbookRitualAccess, CharacterSheetIssue> {
  return characterSheetSpellbookRitualAccessForSpell(input, {
    missingSpellbookMessage:
      "Wizard Ritual Adept requires the spell in the spellbook.",
  });
}

export function characterSheetSpellbookRitualAccessesForBuild(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  readonly CharacterSheetSpellbookRitualAccess[],
  CharacterSheetIssue
> {
  if (!isSpellcastingBuild(input.build)) {
    return Either.right([]);
  }

  const accesses: CharacterSheetSpellbookRitualAccess[] = [];
  for (const source of input.build.spellcasting.sources) {
    if (source.spellbook.length === 0) continue;
    const feature = optionalSpellbookRitualAccessFeatureForSource({
      build: input.build,
      unitLibrary: input.unitLibrary,
      sourceUnitId: source.sourceUnitId,
    });
    if (Either.isLeft(feature)) return Either.left(feature.left);
    if (feature.right === null) continue;
    for (const spellId of source.spellbook) {
      const spell = getRequiredUnit(input.unitLibrary, spellId);
      if (Either.isLeft(spell)) return Either.left(spell.left);
      if (!isSpellRecord(spell.right)) {
        return characterSheetIssue(
          "Spellbook Ritual Access requires Spell records in the spellbook.",
        );
      }
      if (!spellHasLeveledRitualTag(spell.right)) continue;
      accesses.push({
        tag: "spellbookRitual",
        spell: spell.right,
        spellcastingSourceUnitId: source.sourceUnitId,
        featureUnitId: feature.right.id,
      });
    }
  }
  return Either.right(accesses);
}

export function characterBuildHasSpellbookSpell(input: {
  readonly build: CharacterBuild;
  readonly spellId: UnitRecord["id"];
}): boolean {
  return (
    input.build.spellcasting?.sources.some((source) =>
      source.spellbook.some((spellId) => spellId === input.spellId),
    ) ?? false
  );
}

function characterSheetBookOfShadowsRitualInvocation(
  input: CharacterSheetSpellInvocationInput,
): Either.Either<
  CharacterSheetBookOfShadowsRitualInvocation,
  CharacterSheetIssue
> | null {
  if (!isSpellcastingBuild(input.sheet.build)) {
    return null;
  }
  const source = input.sheet.build.spellcasting.sources.find((candidate) =>
    candidate.bookOfShadows?.ritualSpells.some(
      (spellId) => spellId === input.spellId,
    ),
  );
  if (source === undefined) {
    return null;
  }
  if (input.sheet.bookOfShadowsPresence?.tag !== "onPerson") {
    return characterSheetIssue(
      "Book of Shadows Ritual requires the book on your person.",
    );
  }
  const spell = getRequiredUnit(input.unitLibrary, input.spellId);
  if (Either.isLeft(spell)) return Either.left(spell.left);
  if (!isSpellRecord(spell.right)) {
    return characterSheetIssue("Ritual spell invocation requires a Spell.");
  }
  if (!spellHasRitualTag(spell.right)) {
    return characterSheetIssue(
      "Ritual spell invocation requires a ritual-tagged Spell Definition.",
    );
  }
  return Either.right({
    tag: "bookOfShadowsRitual",
    spellId: input.spellId,
    spellLevel: spell.right.mechanics.level,
    spellcastingSourceUnitId: source.sourceUnitId,
    spellSlotCost: { kind: "none" },
    preparationRequirement: "prepared",
    requiredSpellAccess: "bookOfShadows",
    additionalCastingTimeMinutes: RITUAL_ADDITIONAL_CASTING_TIME_MINUTES,
    requiresBookOfShadowsOnPerson: true,
  });
}

function characterSheetSpellbookRitualInvocation(
  input: CharacterSheetSpellInvocationInput,
): Either.Either<CharacterSheetSpellbookRitualInvocation, CharacterSheetIssue> {
  const access = characterSheetSpellbookRitualAccess({
    build: input.sheet.build,
    unitLibrary: input.unitLibrary,
    spellId: input.spellId,
  });
  if (Either.isLeft(access)) return Either.left(access.left);
  return Either.right({
    tag: "spellbookRitual",
    spellId: access.right.spell.id,
    spellLevel: access.right.spell.mechanics.level,
    spellcastingSourceUnitId: access.right.spellcastingSourceUnitId,
    featureUnitId: access.right.featureUnitId,
    spellSlotCost: { kind: "none" },
    preparationRequirement: "not_required",
    requiredSpellAccess: "spellbook",
    additionalCastingTimeMinutes: RITUAL_ADDITIONAL_CASTING_TIME_MINUTES,
    requiresReadingSpellbook: true,
  });
}

function characterSheetSpellbookRitualAccessForSpell(
  input: CharacterSheetSpellbookRitualAccessInput,
  messages: { readonly missingSpellbookMessage: string },
): Either.Either<CharacterSheetSpellbookRitualAccess, CharacterSheetIssue> {
  if (!isSpellcastingBuild(input.build)) {
    return characterSheetIssue(
      "Ritual spell invocation requires spellcasting Spell Access.",
    );
  }
  const spell = getRequiredUnit(input.unitLibrary, input.spellId);
  if (Either.isLeft(spell)) return Either.left(spell.left);
  if (!isSpellRecord(spell.right)) {
    return characterSheetIssue("Ritual spell invocation requires a Spell.");
  }
  if (!spellHasLeveledRitualTag(spell.right)) {
    return characterSheetIssue(
      "Ritual spell invocation requires a ritual-tagged Spell Definition.",
    );
  }
  const spellbookSources = input.build.spellcasting.sources.filter(
    (candidate) =>
      candidate.spellbook.some((spellId) => spellId === input.spellId),
  );
  if (spellbookSources.length === 0) {
    return characterSheetIssue(messages.missingSpellbookMessage);
  }
  for (const source of spellbookSources) {
    const feature = optionalSpellbookRitualAccessFeatureForSource({
      build: input.build,
      unitLibrary: input.unitLibrary,
      sourceUnitId: source.sourceUnitId,
    });
    if (Either.isLeft(feature)) return Either.left(feature.left);
    if (feature.right === null) continue;
    return Either.right({
      tag: "spellbookRitual",
      spell: spell.right,
      spellcastingSourceUnitId: source.sourceUnitId,
      featureUnitId: feature.right.id,
    });
  }
  return characterSheetIssue(
    "Spellbook ritual invocation requires a spellbook Ritual Access feature for the spellbook source.",
  );
}

function optionalSpellbookRitualAccessFeatureForSource(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly sourceUnitId: UnitRecord["id"];
}): Either.Either<
  CharacterSheetSpellbookRitualFeature | null,
  CharacterSheetIssue
> {
  const feature = optionalSpellbookRitualAccessFeatureForBuild(
    input.build,
    input.unitLibrary,
  );
  if (Either.isLeft(feature)) return Either.left(feature.left);
  if (feature.right === null) return Either.right(null);
  const sourceGrantsFeature = classSourceGrantsFeatureAtBuildLevel({
    build: input.build,
    unitLibrary: input.unitLibrary,
    classUnitId: input.sourceUnitId,
    featureUnitId: feature.right.id,
  });
  if (Either.isLeft(sourceGrantsFeature)) {
    return Either.left(sourceGrantsFeature.left);
  }
  return Either.right(sourceGrantsFeature.right ? feature.right : null);
}

function classSourceGrantsFeatureAtBuildLevel(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: UnitRecord["id"];
  readonly featureUnitId: UnitRecord["id"];
}): Either.Either<boolean, CharacterSheetIssue> {
  const classUnit = getRequiredUnit(input.unitLibrary, input.classUnitId);
  if (Either.isLeft(classUnit)) return Either.left(classUnit.left);
  const facts = readClassCreationFacts(classUnit.right);
  if (facts.tag !== "readable") return Either.right(false);
  const classLevel = classLevelForUnit(
    input.build.progression,
    input.classUnitId,
  );
  return Either.right(
    facts.value.featureGrants.some(
      (grant) =>
        grant.unitId === input.featureUnitId && grant.level <= classLevel,
    ),
  );
}

function optionalSpellbookRitualAccessFeatureForBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<
  CharacterSheetSpellbookRitualFeature | null,
  CharacterSheetIssue
> {
  const features: CharacterSheetSpellbookRitualFeature[] = [];
  for (const unitId of characterBuildFeatureUnitIds(build, unitLibrary)) {
    const unit = unitLibrary.getUnit(unitId);
    if (Option.isNone(unit)) {
      continue;
    }
    if (isSpellbookRitualAccessFeature(unit.value)) {
      features.push(unit.value);
    }
  }
  if (features.length === 0) {
    return Either.right(null);
  }
  if (features.length > 1) {
    return characterSheetIssue(
      "Character Sheet supports only one spellbook Ritual Access feature.",
    );
  }
  const feature = features[0];
  if (feature === undefined) {
    return Either.right(null);
  }
  return Either.right(feature);
}

function isSpellRecord(unit: UnitRecord): unit is SpellRecord {
  return unit.kind === "spell";
}

function spellHasRitualTag(spell: SpellRecord): boolean {
  return "ritual" in spell.mechanics.castingTime
    ? spell.mechanics.castingTime.ritual === true
    : false;
}

function spellHasLeveledRitualTag(spell: SpellRecord): boolean {
  return spell.mechanics.level >= 1 && spellHasRitualTag(spell);
}

function isSpellcastingBuild(
  build: CharacterBuild,
): build is SpellcastingCharacterBuild {
  return build.spellcasting !== undefined;
}

function isSpellbookRitualAccessFeature(
  unit: UnitRecord,
): unit is CharacterSheetSpellbookRitualFeature {
  return (
    unit.kind === "class_feature" &&
    unit.mechanics.family === "spellbook_ritual_access" &&
    unit.mechanics.source === "spellbook" &&
    unit.mechanics.preparationRequirement === "not_prepared"
  );
}
