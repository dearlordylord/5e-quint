// KERNEL-COVERAGE: runtime-owner SHEET.SPELLBOOK_RITUAL.SPELL_ACCESS_PROJECTION
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.spellbook-ritual-invocation
import {
  characterBuildFeatureUnitIds,
  classLevelForUnit,
  type CharacterBuild,
  type UnitCatalog,
} from "@dnd/character-creation-runtime";
import { readClassCreationFacts } from "@dnd/surface/surface/character-creation-readers";
import type { UnitRecord } from "@dnd/surface/surface/types";
import { Result, Option } from "effect";

import {
  projectCharacterSheetClassFeature,
  type CharacterSheetClassFeatureFacts,
} from "./character-feature-projection.ts";
import {
  projectCharacterSheetSpellSource,
  type CharacterSheetSpellSource,
} from "./character-spell-projection.ts";
import { characterSheetTopLevelSpellCastingTime } from "./spell-profile-shape.ts";
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
  type CharacterSheetSpellbookRitualInvocationProjection,
  type CharacterSheetSpellbookRitualInvocationRoute,
  type SpellcastingCharacterBuild,
} from "./sheet-types.ts";

type SpellbookRitualAccessMechanics = Extract<
  CharacterSheetClassFeatureFacts["mechanics"],
  { readonly family: "spellbook_ritual_access" }
>;
type CharacterSheetSpellbookRitualFeature = CharacterSheetClassFeatureFacts & {
  readonly unitId: UnitRecord["id"];
  readonly mechanics: SpellbookRitualAccessMechanics;
};

export function characterSheetSpellInvocation(
  input: CharacterSheetSpellInvocationInput,
): Result.Result<CharacterSheetSpellInvocation, CharacterSheetIssue> {
  const bookOfShadowsRitual =
    characterSheetBookOfShadowsRitualInvocation(input);
  if (bookOfShadowsRitual !== null) {
    return bookOfShadowsRitual;
  }
  return characterSheetSpellbookRitualInvocation(input);
}

export function characterSheetSpellbookRitualAccess(
  input: CharacterSheetSpellbookRitualAccessInput,
): Result.Result<CharacterSheetSpellbookRitualAccess, CharacterSheetIssue> {
  return characterSheetSpellbookRitualAccessForSpell(input, {
    missingSpellbookMessage:
      "Wizard Ritual Adept requires the spell in the spellbook.",
  });
}

export function characterSheetSpellbookRitualAccessesForBuild(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
}): Result.Result<
  readonly CharacterSheetSpellbookRitualAccess[],
  CharacterSheetIssue
> {
  if (!isSpellcastingBuild(input.build)) {
    return Result.succeed([]);
  }

  const accesses: CharacterSheetSpellbookRitualAccess[] = [];
  for (const source of input.build.spellcasting.sources) {
    if (source.spellbook.length === 0) continue;
    const feature = optionalSpellbookRitualAccessFeatureForSource({
      build: input.build,
      unitLibrary: input.unitLibrary,
      sourceUnitId: source.sourceUnitId,
    });
    /* v8 ignore next -- @preserve -- Feature lookup rejection is malformed spellbook-source/catalog correlation. */
    if (Result.isFailure(feature)) return Result.fail(feature.failure);
    if (feature.success === null) continue;
    for (const spellId of source.spellbook) {
      const spell = getRequiredUnit(input.unitLibrary, spellId);
      /* v8 ignore next -- @preserve -- A spellbook id must resolve in the same Unit catalog used to parse the build. */
      if (Result.isFailure(spell)) return Result.fail(spell.failure);
      /* v8 ignore start -- @preserve -- Spellbook ids are parsed against the same Unit catalog and must resolve to Spell records. */
      const spellSource = projectCharacterSheetSpellSource(spell.success);
      if (Option.isNone(spellSource)) {
        return characterSheetIssue(
          "Spellbook Ritual Access requires Spell records in the spellbook.",
        );
      }
      /* v8 ignore stop -- @preserve */
      if (!spellHasLeveledRitualTag(spellSource.value)) continue;
      accesses.push({
        tag: "spellbookRitual",
        spell: spellSource.value,
        spellcastingSourceUnitId: source.sourceUnitId,
        featureUnitId: feature.success.unitId,
      });
    }
  }
  return Result.succeed(accesses);
}

export function characterSheetSpellbookRitualInvocationProjection(
  input: CharacterSheetSpellInvocationInput,
): CharacterSheetSpellbookRitualInvocationProjection {
  const invocation = characterSheetSpellbookRitualInvocation(input);
  if (Result.isSuccess(invocation)) {
    return {
      tag: "accepted",
      invocation: invocation.success,
      qRoute: CHARACTER_SHEET_SPELLBOOK_RITUAL_ACCEPTED_ROUTE,
    };
  }
  return {
    tag: "rejected",
    issue: invocation.failure,
    qRoute: CHARACTER_SHEET_SPELLBOOK_RITUAL_REJECTED_ROUTE,
  };
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
): Result.Result<
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
  const spell = requiredRitualSpell(input, spellHasRitualTag);
  /* v8 ignore next -- @preserve -- Ritual spell rejection is malformed Book of Shadows spell/catalog input. */
  if (Result.isFailure(spell)) return Result.fail(spell.failure);
  return Result.succeed({
    tag: "bookOfShadowsRitual",
    spellId: input.spellId,
    spellLevel: spell.success.mechanics.level,
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
): Result.Result<CharacterSheetSpellbookRitualInvocation, CharacterSheetIssue> {
  const access = characterSheetSpellbookRitualAccess({
    build: input.sheet.build,
    unitLibrary: input.unitLibrary,
    spellId: input.spellId,
  });
  /* v8 ignore next -- @preserve -- Access rejection is propagated from the typed ritual-access boundary. */
  if (Result.isFailure(access)) return Result.fail(access.failure);
  return Result.succeed({
    tag: "spellbookRitual",
    spellId: access.success.spell.unitId,
    spellLevel: access.success.spell.mechanics.level,
    spellcastingSourceUnitId: access.success.spellcastingSourceUnitId,
    featureUnitId: access.success.featureUnitId,
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
): Result.Result<CharacterSheetSpellbookRitualAccess, CharacterSheetIssue> {
  /* v8 ignore start -- @preserve -- Ritual invocation on a non-spellcasting build is malformed internal input after invocation admission. */
  if (!isSpellcastingBuild(input.build)) {
    return characterSheetIssue(
      "Ritual spell invocation requires spellcasting Spell Access.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const spell = requiredRitualSpell(input, spellHasLeveledRitualTag);
  /* v8 ignore next -- @preserve -- Ritual spell rejection is malformed spellbook spell/catalog input. */
  if (Result.isFailure(spell)) return Result.fail(spell.failure);
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
    /* v8 ignore next -- @preserve -- Feature lookup rejection is malformed spellbook-source/catalog correlation. */
    if (Result.isFailure(feature)) return Result.fail(feature.failure);
    if (feature.success === null) continue;
    return Result.succeed({
      tag: "spellbookRitual",
      spell: spell.success,
      spellcastingSourceUnitId: source.sourceUnitId,
      featureUnitId: feature.success.unitId,
    });
  }
  return characterSheetIssue(
    "Spellbook ritual invocation requires a spellbook Ritual Access feature for the spellbook source.",
  );
}

function requiredRitualSpell(
  input: Pick<
    CharacterSheetSpellbookRitualAccessInput,
    "spellId" | "unitLibrary"
  >,
  hasRequiredRitualTag: (spell: CharacterSheetSpellSource) => boolean,
): Result.Result<CharacterSheetSpellSource, CharacterSheetIssue> {
  const spell = getRequiredUnit(input.unitLibrary, input.spellId);
  /* v8 ignore next -- @preserve -- A selected ritual spell id must resolve in the same Unit catalog. */
  if (Result.isFailure(spell)) return Result.fail(spell.failure);
  /* v8 ignore start -- @preserve -- A ritual spell id resolving to a non-Spell Unit is a build/catalog correlation failure. */
  const spellSource = projectCharacterSheetSpellSource(spell.success);
  if (Option.isNone(spellSource)) {
    return characterSheetIssue("Ritual spell invocation requires a Spell.");
  }
  /* v8 ignore stop -- @preserve */
  return hasRequiredRitualTag(spellSource.value)
    ? Result.succeed(spellSource.value)
    : characterSheetIssue(
        "Ritual spell invocation requires a ritual-tagged Spell Definition.",
      );
}

function optionalSpellbookRitualAccessFeatureForSource(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly sourceUnitId: UnitRecord["id"];
}): Result.Result<
  CharacterSheetSpellbookRitualFeature | null,
  CharacterSheetIssue
> {
  const feature = optionalSpellbookRitualAccessFeatureForBuild(
    input.build,
    input.unitLibrary,
  );
  /* v8 ignore next -- @preserve -- Feature lookup rejection is malformed build/catalog correlation. */
  if (Result.isFailure(feature)) return Result.fail(feature.failure);
  if (feature.success === null) return Result.succeed(null);
  const sourceGrantsFeature = classSourceGrantsFeatureAtBuildLevel({
    build: input.build,
    unitLibrary: input.unitLibrary,
    classUnitId: input.sourceUnitId,
    featureUnitId: feature.success.unitId,
  });
  /* v8 ignore start -- @preserve -- The spellcasting source and its class feature grants are correlated by parsed Character Build facts. */
  if (Result.isFailure(sourceGrantsFeature)) {
    return Result.fail(sourceGrantsFeature.failure);
  }
  /* v8 ignore stop -- @preserve */
  return Result.succeed(sourceGrantsFeature.success ? feature.success : null);
}

function classSourceGrantsFeatureAtBuildLevel(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: UnitRecord["id"];
  readonly featureUnitId: UnitRecord["id"];
}): Result.Result<boolean, CharacterSheetIssue> {
  const classUnit = getRequiredUnit(input.unitLibrary, input.classUnitId);
  /* v8 ignore next -- @preserve -- A spellcasting source class id must resolve in the same Unit catalog. */
  if (Result.isFailure(classUnit)) return Result.fail(classUnit.failure);
  const facts = readClassCreationFacts(classUnit.success);
  /* v8 ignore next -- @preserve -- Unsupported authored class data: an admitted spellcasting source must expose readable class-creation facts. */
  if (facts.tag !== "readable") return Result.succeed(false);
  const classLevel = classLevelForUnit(
    input.build.progression,
    input.classUnitId,
  );
  return Result.succeed(
    facts.value.featureGrants.some(
      (grant) =>
        grant.unitId === input.featureUnitId && grant.level <= classLevel,
    ),
  );
}

function optionalSpellbookRitualAccessFeatureForBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Result.Result<
  CharacterSheetSpellbookRitualFeature | null,
  CharacterSheetIssue
> {
  const features: CharacterSheetSpellbookRitualFeature[] = [];
  for (const unitId of characterBuildFeatureUnitIds(build, unitLibrary)) {
    const unit = unitLibrary.getUnit(unitId);
    /* v8 ignore start -- @preserve -- Malformed build/catalog correlation: every feature id returned from this admitted build must resolve in the same catalog. */
    if (Option.isNone(unit)) {
      continue;
    }
    /* v8 ignore stop -- @preserve */
    const projection = projectCharacterSheetClassFeature(unit.value);
    if (
      Option.isSome(projection) &&
      isSpellbookRitualAccessFeature(projection.value)
    ) {
      features.push({ unitId: unit.value.id, ...projection.value });
    }
  }
  if (features.length === 0) {
    return Result.succeed(null);
  }
  /* v8 ignore start -- @preserve -- More than one spellbook Ritual Access feature is an unsupported duplicate authored profile. */
  if (features.length > 1) {
    return characterSheetIssue(
      "Character Sheet supports only one spellbook Ritual Access feature.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const feature = features[0];
  /* v8 ignore start -- @preserve -- A collection proven nonempty above always has a first Ritual Access feature. */
  if (feature === undefined) {
    return Result.succeed(null);
  }
  /* v8 ignore stop -- @preserve */
  return Result.succeed(feature);
}

function spellHasLeveledRitualTag(spell: CharacterSheetSpellSource): boolean {
  return spell.mechanics.level >= 1 && spellHasRitualTag(spell);
}

function spellHasRitualTag(spell: CharacterSheetSpellSource): boolean {
  const castingTime = characterSheetTopLevelSpellCastingTime(spell.mechanics);
  return (
    castingTime !== null &&
    "ritual" in castingTime &&
    castingTime.ritual === true
  );
}

function isSpellcastingBuild(
  build: CharacterBuild,
): build is SpellcastingCharacterBuild {
  return build.spellcasting !== undefined;
}

const CHARACTER_SHEET_SPELLBOOK_RITUAL_ACCEPTED_ROUTE = [
  {
    kind: "retainCharacterSheetSelectedReferences",
    subject: "selectedReferenceProjection",
    owner: "selectedReference",
  },
  {
    kind: "resolveCharacterSheetSubject",
    subject: "spellResource",
    fill: "projectionSelection",
    holes: [],
    owner: "selectedReference",
  },
] as const satisfies CharacterSheetSpellbookRitualInvocationRoute;

const CHARACTER_SHEET_SPELLBOOK_RITUAL_REJECTED_ROUTE = [
  {
    kind: "retainCharacterSheetSelectedReferences",
    subject: "selectedReferenceProjection",
    owner: "selectedReference",
  },
  {
    kind: "resolveCharacterSheetSubject",
    subject: "spellResource",
    fill: "projectionSelection",
    holes: ["projectionChoice"],
    owner: "selectedReference",
  },
] as const satisfies CharacterSheetSpellbookRitualInvocationRoute;

function isSpellbookRitualAccessFeature(
  facts: CharacterSheetClassFeatureFacts,
): facts is Omit<CharacterSheetSpellbookRitualFeature, "unitId"> {
  return (
    facts.mechanics.family === "spellbook_ritual_access" &&
    facts.mechanics.source === "spellbook" &&
    facts.mechanics.preparationRequirement === "not_prepared"
  );
}
