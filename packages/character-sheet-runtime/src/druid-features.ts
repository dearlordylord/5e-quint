// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.druid-circle-land-spell-access
import {
  characterBuildDruidWildShapeFacts,
  characterBuildFeatureUnitIds,
  classLevelForUnit,
  messageForDruidWildShapeKnownFormIssue,
  replaceDruidWildShapeKnownForm,
  validateDruidWildShapeKnownFormIssues,
  type DruidWildShapeKnownFormIssue,
  type CharacterBuild,
  type UnitCatalog,
} from "@dnd/character-creation-runtime";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
  type StatBlockCatalog,
} from "@dnd/surface/surface/installed-srd-stat-block-catalog";
import {
  DRUID_CIRCLE_LAND_CHOICES,
  type DruidCircleLandChoice,
  type LandChoicePreparedSpellAccessGrant,
  type UnitRecord,
} from "@dnd/surface/surface/types";
import { Either, Match, Option } from "effect";

import {
  characterSheetIssue,
  type CharacterSheet,
  type CharacterSheetDruidCircleLand,
  type CharacterSheetDruidCircleLandPreparedSpellAccess,
  type CharacterSheetDruidWildShapeKnownForms,
  type CharacterSheetInput,
  type CharacterSheetIssue,
  type CharacterSheetLongRestInput,
} from "./sheet-types.ts";

type DruidWildShapeKnownFormsConstructionIssue =
  | {
      readonly code:
        | "wildShapeKnownFormsUnexpected"
        | "wildShapeKnownFormsRequired"
        | "wildShapeKnownFormsInvalid";
    }
  | DruidWildShapeKnownFormIssue;

const DEFAULT_SRD_STAT_BLOCK_CATALOG_RESULT = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});

export function characterSheetDruidWildShapeKnownForms(
  sheet: CharacterSheet,
): CharacterSheetDruidWildShapeKnownForms | undefined {
  return sheet.druidWildShapeKnownForms;
}

export function characterSheetDruidCircleLandPreparedSpellAccess(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  CharacterSheetDruidCircleLandPreparedSpellAccess | undefined,
  CharacterSheetIssue
> {
  return druidCircleLandPreparedSpellAccessForBuild({
    build: input.sheet.build,
    unitLibrary: input.unitLibrary,
    circleLand: input.sheet.druidCircleLand,
  });
}

export function druidWildShapeKnownFormsFromInput(
  input: Pick<
    CharacterSheetInput,
    | "build"
    | "unitLibrary"
    | "druidWildShapeKnownFormStatBlockIds"
    | "statBlockCatalog"
  >,
): Either.Either<
  CharacterSheetDruidWildShapeKnownForms | undefined,
  CharacterSheetIssue
> {
  const result = druidWildShapeKnownFormsConstruction(input);
  if (Either.isRight(result)) return Either.right(result.right);
  const issue = result.left[0];
  /* v8 ignore start -- @preserve -- These translations describe malformed or unsupported stored known-form inputs rejected during construction. */
  if ("statBlockId" in issue) {
    return characterSheetIssue(messageForDruidWildShapeKnownFormIssue(issue));
  }
  return Match.value(issue.code).pipe(
    Match.when("wildShapeKnownFormsUnexpected", () =>
      characterSheetIssue(
        "Wild Shape known forms require the Druid Wild Shape feature.",
      ),
    ),
    Match.when("wildShapeKnownFormsRequired", () =>
      characterSheetIssue(
        "Wild Shape known forms require selected Beast Stat Block identities.",
      ),
    ),
    Match.when("wildShapeKnownFormsInvalid", () =>
      characterSheetIssue("Wild Shape known form state is invalid."),
    ),
    Match.when("wildShapeKnownFormCountMismatch", () =>
      characterSheetIssue(
        messageForDruidWildShapeKnownFormIssue({
          code: "wildShapeKnownFormCountMismatch",
        }),
      ),
    ),
    Match.exhaustive,
  );
  /* v8 ignore stop -- @preserve */
}

export function druidWildShapeKnownFormsConstruction(
  input: Pick<
    CharacterSheetInput,
    | "build"
    | "unitLibrary"
    | "druidWildShapeKnownFormStatBlockIds"
    | "statBlockCatalog"
  >,
): Either.Either<
  CharacterSheetDruidWildShapeKnownForms | undefined,
  ReadonlyNonEmptyArray<DruidWildShapeKnownFormsConstructionIssue>
> {
  const facts = characterBuildDruidWildShapeFacts({
    build: input.build,
    unitLibrary: input.unitLibrary,
  });
  /* v8 ignore start -- @preserve -- Build-owned Wild Shape feature ids and their Unit facts are correlated by Character Build parsing. */
  if (Either.isLeft(facts)) {
    return Either.left([{ code: "wildShapeKnownFormsInvalid" }]);
  }
  /* v8 ignore stop -- @preserve */
  if (facts.right === undefined) {
    return input.druidWildShapeKnownFormStatBlockIds === undefined
      ? Either.right(undefined)
      : Either.left([{ code: "wildShapeKnownFormsUnexpected" }]);
  }
  const statBlockCatalog = druidWildShapeStatBlockCatalogFromInput(
    input.statBlockCatalog,
  );
  /* v8 ignore start -- @preserve -- The caller-supplied or bundled SRD Stat Block catalog must parse before known-form construction. */
  if (Either.isLeft(statBlockCatalog)) {
    return Either.left([{ code: "wildShapeKnownFormsInvalid" }]);
  }
  /* v8 ignore stop -- @preserve */
  if (input.druidWildShapeKnownFormStatBlockIds === undefined) {
    return Either.left([{ code: "wildShapeKnownFormsRequired" }]);
  }
  const knownFormIssues = validateDruidWildShapeKnownFormIssues({
    facts: facts.right,
    knownFormStatBlockIds: input.druidWildShapeKnownFormStatBlockIds,
    statBlockCatalog: statBlockCatalog.right,
  });
  if (knownFormIssues !== undefined) return Either.left(knownFormIssues);
  return Either.right({
    statBlockIds: input.druidWildShapeKnownFormStatBlockIds,
  });
}

export function druidCircleLandFromInput(
  input: Pick<CharacterSheetInput, "build" | "unitLibrary" | "druidCircleLand">,
): Either.Either<
  CharacterSheetDruidCircleLand | undefined,
  CharacterSheetIssue
> {
  const ownedGrants = druidCircleLandPreparedSpellAccessGrantsForBuild({
    build: input.build,
    unitLibrary: input.unitLibrary,
  });
  /* v8 ignore next -- @preserve -- Malformed build/catalog correlation: Circle of the Land grants are projected only from feature ids admitted into this build. */
  if (Either.isLeft(ownedGrants)) return Either.left(ownedGrants.left);
  if (ownedGrants.right.length === 0) {
    /* v8 ignore start -- @preserve -- Malformed sheet input: V8 maps retained Circle of the Land state without its owning Circle Spells feature to this conditional. */
    if (input.druidCircleLand === undefined) return Either.right(undefined);
    return characterSheetIssue(
      "Circle of the Land selected land requires the Circle Spells feature.",
    );
    /* v8 ignore stop -- @preserve */
  }
  /* v8 ignore start -- @preserve -- Malformed sheet input: an admitted Circle Spells feature requires its retained land selection. */
  if (input.druidCircleLand === undefined) {
    return characterSheetIssue(
      "Circle of the Land requires selected land state.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- The stored land field has already been parsed into the canonical Circle of the Land choice vocabulary. */
  if (!isDruidCircleLandChoice(input.druidCircleLand.land)) {
    return characterSheetIssue("Circle of the Land selected land is invalid.");
  }
  /* v8 ignore stop -- @preserve */
  const druidSourceUnitId = druidCircleLandSpellcastingSourceUnitId({
    build: input.build,
    unitLibrary: input.unitLibrary,
  });
  if (Either.isLeft(druidSourceUnitId))
    return Either.left(druidSourceUnitId.left);
  return Either.right(input.druidCircleLand);
}

export function isDruidCircleLandChoice(
  value: unknown,
): value is DruidCircleLandChoice {
  return (
    typeof value === "string" &&
    DRUID_CIRCLE_LAND_CHOICES.some((land) => land === value)
  );
}

export function druidWildShapeStatBlockCatalogFromInput(
  statBlockCatalog: StatBlockCatalog | undefined,
): Either.Either<StatBlockCatalog, CharacterSheetIssue> {
  if (statBlockCatalog !== undefined) return Either.right(statBlockCatalog);
  /* v8 ignore start -- @preserve -- The bundled SRD Stat Block collection is static and must build successfully at module initialization. */
  if (DEFAULT_SRD_STAT_BLOCK_CATALOG_RESULT.tag === "invalid") {
    return characterSheetIssue(
      "Wild Shape known forms require a valid SRD Stat Block catalog.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return Either.right(DEFAULT_SRD_STAT_BLOCK_CATALOG_RESULT.catalog);
}

export function druidWildShapeKnownFormsAfterLongRest(input: {
  readonly input: CharacterSheetLongRestInput;
  readonly build: CharacterBuild;
}): Either.Either<
  CharacterSheetDruidWildShapeKnownForms | undefined,
  CharacterSheetIssue
> {
  const sheet = input.input.completion.startedRest.sheet;
  if (input.input.druidWildShapeKnownFormReplacement === undefined) {
    return Either.right(sheet.druidWildShapeKnownForms);
  }
  /* v8 ignore start -- @preserve -- A Long Rest replacement is admitted only from a sheet retaining current Wild Shape known forms. */
  if (sheet.druidWildShapeKnownForms === undefined) {
    return characterSheetIssue(
      "Wild Shape known-form replacement requires current known forms.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const facts = characterBuildDruidWildShapeFacts({
    build: input.build,
    unitLibrary: input.input.unitLibrary,
  });
  /* v8 ignore next -- @preserve -- Malformed build/catalog correlation: retained Wild Shape state is projected only from its admitted Druid feature Units. */
  if (Either.isLeft(facts)) return characterSheetIssue(facts.left.message);
  /* v8 ignore start -- @preserve -- Retained known forms and the owning Wild Shape feature are correlated by sheet construction. */
  if (facts.right === undefined) {
    return characterSheetIssue(
      "Wild Shape known-form replacement requires the Druid Wild Shape feature.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const statBlockCatalog = druidWildShapeStatBlockCatalogFromInput(
    input.input.statBlockCatalog,
  );
  /* v8 ignore start -- @preserve -- Malformed Long Rest input: a Wild Shape replacement requires the same parsed StatBlock catalog used to admit known forms. */
  if (Either.isLeft(statBlockCatalog))
    return Either.left(statBlockCatalog.left);
  /* v8 ignore stop -- @preserve */
  const replaced = replaceDruidWildShapeKnownForm({
    facts: facts.right,
    currentKnownFormStatBlockIds: sheet.druidWildShapeKnownForms.statBlockIds,
    replacement: input.input.druidWildShapeKnownFormReplacement,
    statBlockCatalog: statBlockCatalog.right,
  });
  /* v8 ignore start -- @preserve -- Malformed Long Rest input: replacement forms must satisfy the retained Wild Shape profile and known-form roster. */
  if (Either.isLeft(replaced))
    return characterSheetIssue(replaced.left.message);
  /* v8 ignore stop -- @preserve */
  return Either.right({
    statBlockIds: replaced.right,
  });
}

export function druidCircleLandAfterLongRest(input: {
  readonly input: CharacterSheetLongRestInput;
  readonly build: CharacterBuild;
}): Either.Either<
  CharacterSheetDruidCircleLand | undefined,
  CharacterSheetIssue
> {
  const grants = druidCircleLandPreparedSpellAccessGrantsForBuild({
    build: input.build,
    unitLibrary: input.input.unitLibrary,
  });
  /* v8 ignore next -- @preserve -- Malformed build/catalog correlation: Circle of the Land grants are projected only from feature ids admitted into this build. */
  if (Either.isLeft(grants)) return Either.left(grants.left);
  if (grants.right.length === 0) {
    if (input.input.druidCircleLandChoice === undefined) {
      return Either.right(undefined);
    }
    /* v8 ignore start -- @preserve -- A Long Rest land reselection without the owning Circle Spells feature is a malformed rest request. */
    return characterSheetIssue(
      "Circle of the Land land choice requires the Circle Spells feature.",
    );
    /* v8 ignore stop -- @preserve */
  }
  const druidSourceUnitId = druidCircleLandSpellcastingSourceUnitId({
    build: input.build,
    unitLibrary: input.input.unitLibrary,
  });
  /* v8 ignore start -- @preserve -- Malformed admitted build: Circle Spells ownership requires its correlated Druid spellcasting source. */
  if (Either.isLeft(druidSourceUnitId))
    return Either.left(druidSourceUnitId.left);
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed Long Rest input: an admitted Circle Spells feature requires a land selection for the completed rest. */
  if (input.input.druidCircleLandChoice === undefined) {
    return characterSheetIssue(
      "Circle of the Land requires a Long Rest land choice.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const selectedLand = input.input.druidCircleLandChoice;
  /* v8 ignore start -- @preserve -- The Long Rest land choice has already been parsed into the canonical Circle of the Land vocabulary. */
  if (!isDruidCircleLandChoice(selectedLand)) {
    return characterSheetIssue(
      "Circle of the Land Long Rest land choice is invalid.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const circleLand: CharacterSheetDruidCircleLand = { land: selectedLand };
  const duplicateBookOfShadowsIssue =
    storedBookOfShadowsDruidCircleLandSelectionIssue({
      build: input.build,
      unitLibrary: input.input.unitLibrary,
      circleLand,
    });
  if (Either.isLeft(duplicateBookOfShadowsIssue)) {
    return Either.left(duplicateBookOfShadowsIssue.left);
  }
  return Either.right(circleLand);
}

function druidCircleLandPreparedSpellAccessForBuild(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly circleLand: CharacterSheetDruidCircleLand | undefined;
}): Either.Either<
  CharacterSheetDruidCircleLandPreparedSpellAccess | undefined,
  CharacterSheetIssue
> {
  const grants = druidCircleLandPreparedSpellAccessGrantsForBuild(input);
  /* v8 ignore next -- @preserve -- Malformed build/catalog correlation: Circle of the Land grants are projected only from feature ids admitted into this build. */
  if (Either.isLeft(grants)) return Either.left(grants.left);
  if (grants.right.length === 0) {
    /* v8 ignore start -- @preserve -- Malformed sheet state: V8 maps retained land state without the owning Circle Spells grant to this conditional. */
    if (input.circleLand === undefined) return Either.right(undefined);
    return characterSheetIssue(
      "Circle of the Land selected land requires the Circle Spells feature.",
    );
    /* v8 ignore stop -- @preserve */
  }
  /* v8 ignore start -- @preserve -- Malformed sheet input: an admitted Circle Spells grant requires its retained land selection. */
  if (input.circleLand === undefined) {
    return characterSheetIssue(
      "Circle of the Land requires selected land state.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const druidSourceUnitId = druidCircleLandSpellcastingSourceUnitId({
    build: input.build,
    unitLibrary: input.unitLibrary,
  });
  /* v8 ignore start -- @preserve -- Malformed admitted build: Circle Spells ownership requires its correlated Druid spellcasting source. */
  if (Either.isLeft(druidSourceUnitId))
    return Either.left(druidSourceUnitId.left);
  /* v8 ignore stop -- @preserve */
  const druidLevel = classLevelForUnit(
    input.build.progression,
    druidSourceUnitId.right,
  );
  const grant = grants.right[0];
  /* v8 ignore start -- @preserve -- A nonempty, uniqueness-checked grant collection always has a first prepared-spell grant. */
  if (grant === undefined) {
    return characterSheetIssue(
      "Circle of the Land Spell Access requires a prepared spell grant.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const spellIds = grant.grant.spellsByLand[input.circleLand.land]
    .filter((tier) => tier.minimumClassLevel <= druidLevel)
    .flatMap((tier) => tier.spellIds.map(authoredUnitId));
  return Either.right({
    sourceUnitId: grant.sourceUnitId,
    spellcastingSourceUnitId: druidSourceUnitId.right,
    land: input.circleLand.land,
    druidLevel,
    spellIds,
  });
}

function druidCircleLandPreparedSpellAccessGrantsForBuild(input: {
  readonly build: Pick<CharacterBuild, "progression" | "features">;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  readonly {
    readonly sourceUnitId: UnitRecord["id"];
    readonly grant: LandChoicePreparedSpellAccessGrant;
  }[],
  CharacterSheetIssue
> {
  const grants: {
    sourceUnitId: UnitRecord["id"];
    grant: LandChoicePreparedSpellAccessGrant;
  }[] = [];
  for (const unitId of characterBuildFeatureUnitIds(
    input.build,
    input.unitLibrary,
  )) {
    const unit = input.unitLibrary.getUnit(unitId);
    if (
      Option.isNone(unit) ||
      unit.value.kind !== "class_feature" ||
      unit.value.mechanics.family !== "passive"
    ) {
      continue;
    }
    for (const grant of unit.value.mechanics.grants) {
      if (grant.kind === "grant_land_choice_prepared_spell_access") {
        grants.push({ sourceUnitId: unit.value.id, grant });
      }
    }
  }
  /* v8 ignore start -- @preserve -- More than one Circle Spells grant is an unsupported duplicate authored support profile. */
  if (grants.length > 1) {
    return characterSheetIssue(
      "Character Sheet supports one Circle of the Land Spell Access source.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return Either.right(grants);
}

function druidCircleLandSpellcastingSourceUnitId(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<UnitRecord["id"], CharacterSheetIssue> {
  const druidSourceUnitId = spellcastingSourceUnitIdForClassName({
    build: input.build,
    unitLibrary: input.unitLibrary,
    className: "druid",
  });
  /* v8 ignore start -- @preserve -- Malformed build/catalog correlation: a retained Druid spellcasting source id must resolve in the same Unit catalog. */
  if (Either.isLeft(druidSourceUnitId))
    return Either.left(druidSourceUnitId.left);
  /* v8 ignore stop -- @preserve */
  if (druidSourceUnitId.right !== undefined) {
    return Either.right(druidSourceUnitId.right);
  }
  /* v8 ignore start -- @preserve -- A retained Circle Spells grant without its Druid spellcasting source is malformed build state. */
  return characterSheetIssue(
    "Circle of the Land selected land requires Druid spellcasting source.",
  );
  /* v8 ignore stop -- @preserve */
}

function spellcastingSourceUnitIdForClassName(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly className: "druid";
}): Either.Either<UnitRecord["id"] | undefined, CharacterSheetIssue> {
  const sourceUnitIds = input.build.spellcasting?.sources.flatMap((source) => {
    const unit = input.unitLibrary.getUnit(source.sourceUnitId);
    if (
      Option.isNone(unit) ||
      unit.value.kind !== "class" ||
      unit.value.className !== input.className
    ) {
      return [];
    }
    return [source.sourceUnitId];
  });
  if (sourceUnitIds === undefined || sourceUnitIds.length === 0) {
    return Either.right(undefined);
  }
  /* v8 ignore start -- @preserve -- Unsupported duplicate build correlation: V8 maps the multiple-Druid-source edge to this final conditional, but the runtime admits one spellcasting source per class. */
  if (sourceUnitIds.length === 1) return Either.right(sourceUnitIds[0]);
  return characterSheetIssue(
    "Character Sheet supports one spellcasting source for a class.",
  );
  /* v8 ignore stop -- @preserve */
}

export function storedBookOfShadowsDruidCircleLandSelectionIssue(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly circleLand: CharacterSheetDruidCircleLand | undefined;
}): Either.Either<void, CharacterSheetIssue> {
  const projectedAccess = druidCircleLandPreparedSpellAccessForBuild(input);
  /* v8 ignore next -- @preserve -- Malformed retained Druid state: Circle of the Land access must reproject from its admitted build and catalog. */
  if (Either.isLeft(projectedAccess)) return Either.left(projectedAccess.left);
  if (projectedAccess.right === undefined) return Either.right(undefined);
  const selectedSpellIds = new Set(projectedAccess.right.spellIds);
  /* v8 ignore start -- @preserve -- Malformed build correlation: projected Circle Spells access can exist only with the Druid spellcasting source that owns it. */
  const spellcastingSources = input.build.spellcasting?.sources ?? [];
  /* v8 ignore stop -- @preserve */
  for (const source of spellcastingSources) {
    const bookOfShadows = source.bookOfShadows;
    if (bookOfShadows === undefined) continue;
    const duplicate = [
      ...bookOfShadows.cantrips,
      ...bookOfShadows.ritualSpells,
    ].some((spellId) => selectedSpellIds.has(spellId));
    if (duplicate) {
      return characterSheetIssue(
        "Character Build Book of Shadows Spell Access cannot select spells the character already has prepared or known.",
      );
    }
  }
  return Either.right(undefined);
}
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
