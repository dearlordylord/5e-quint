import {
  characterBuildDruidWildShapeFacts,
  characterBuildFeatureUnitIds,
  classLevelForUnit,
  replaceDruidWildShapeKnownForm,
  validateDruidWildShapeKnownForms,
  type CharacterBuild,
  type UnitCatalog,
} from "@dnd/character-creation-runtime";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
  type StatBlockCatalog,
} from "@dnd/surface/surface/stat-block-catalog";
import {
  DRUID_CIRCLE_LAND_CHOICES,
  type DruidCircleLandChoice,
  type LandChoicePreparedSpellAccessGrant,
  type UnitRecord,
} from "@dnd/surface/surface/types";
import { Either, Option } from "effect";

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
  const facts = characterBuildDruidWildShapeFacts({
    build: input.build,
    unitLibrary: input.unitLibrary,
  });
  if (Either.isLeft(facts)) return characterSheetIssue(facts.left.message);
  if (facts.right === undefined) {
    return input.druidWildShapeKnownFormStatBlockIds === undefined
      ? Either.right(undefined)
      : characterSheetIssue(
          "Wild Shape known forms require the Druid Wild Shape feature.",
        );
  }
  const statBlockCatalog = druidWildShapeStatBlockCatalogFromInput(
    input.statBlockCatalog,
  );
  if (Either.isLeft(statBlockCatalog))
    return Either.left(statBlockCatalog.left);
  if (input.druidWildShapeKnownFormStatBlockIds === undefined) {
    return characterSheetIssue(
      "Wild Shape known forms require selected Beast Stat Block identities.",
    );
  }
  const knownForms = validateDruidWildShapeKnownForms({
    facts: facts.right,
    knownFormStatBlockIds: input.druidWildShapeKnownFormStatBlockIds,
    statBlockCatalog: statBlockCatalog.right,
  });
  if (Either.isLeft(knownForms))
    return characterSheetIssue(knownForms.left.message);
  return Either.right({
    statBlockIds: knownForms.right,
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
  if (Either.isLeft(ownedGrants)) return Either.left(ownedGrants.left);
  if (ownedGrants.right.length === 0) {
    return input.druidCircleLand === undefined
      ? Either.right(undefined)
      : characterSheetIssue(
          "Circle of the Land selected land requires the Circle Spells feature.",
        );
  }
  if (input.druidCircleLand === undefined) {
    return characterSheetIssue(
      "Circle of the Land requires selected land state.",
    );
  }
  if (!isDruidCircleLandChoice(input.druidCircleLand.land)) {
    return characterSheetIssue("Circle of the Land selected land is invalid.");
  }
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

function druidWildShapeStatBlockCatalogFromInput(
  statBlockCatalog: StatBlockCatalog | undefined,
): Either.Either<StatBlockCatalog, CharacterSheetIssue> {
  if (statBlockCatalog !== undefined) return Either.right(statBlockCatalog);
  if (DEFAULT_SRD_STAT_BLOCK_CATALOG_RESULT.tag === "invalid") {
    return characterSheetIssue(
      "Wild Shape known forms require a valid SRD Stat Block catalog.",
    );
  }
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
  if (sheet.druidWildShapeKnownForms === undefined) {
    return characterSheetIssue(
      "Wild Shape known-form replacement requires current known forms.",
    );
  }
  const facts = characterBuildDruidWildShapeFacts({
    build: input.build,
    unitLibrary: input.input.unitLibrary,
  });
  if (Either.isLeft(facts)) return characterSheetIssue(facts.left.message);
  if (facts.right === undefined) {
    return characterSheetIssue(
      "Wild Shape known-form replacement requires the Druid Wild Shape feature.",
    );
  }
  const statBlockCatalog = druidWildShapeStatBlockCatalogFromInput(
    input.input.statBlockCatalog,
  );
  if (Either.isLeft(statBlockCatalog))
    return Either.left(statBlockCatalog.left);
  const replaced = replaceDruidWildShapeKnownForm({
    facts: facts.right,
    currentKnownFormStatBlockIds: sheet.druidWildShapeKnownForms.statBlockIds,
    replacement: input.input.druidWildShapeKnownFormReplacement,
    statBlockCatalog: statBlockCatalog.right,
  });
  if (Either.isLeft(replaced))
    return characterSheetIssue(replaced.left.message);
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
  if (Either.isLeft(grants)) return Either.left(grants.left);
  if (grants.right.length === 0) {
    return input.input.druidCircleLandChoice === undefined
      ? Either.right(undefined)
      : characterSheetIssue(
          "Circle of the Land land choice requires the Circle Spells feature.",
        );
  }
  const druidSourceUnitId = druidCircleLandSpellcastingSourceUnitId({
    build: input.build,
    unitLibrary: input.input.unitLibrary,
  });
  if (Either.isLeft(druidSourceUnitId))
    return Either.left(druidSourceUnitId.left);
  if (input.input.druidCircleLandChoice === undefined) {
    return characterSheetIssue(
      "Circle of the Land requires a Long Rest land choice.",
    );
  }
  const selectedLand = input.input.druidCircleLandChoice;
  if (!isDruidCircleLandChoice(selectedLand)) {
    return characterSheetIssue(
      "Circle of the Land Long Rest land choice is invalid.",
    );
  }
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
  if (Either.isLeft(grants)) return Either.left(grants.left);
  if (grants.right.length === 0) {
    return input.circleLand === undefined
      ? Either.right(undefined)
      : characterSheetIssue(
          "Circle of the Land selected land requires the Circle Spells feature.",
        );
  }
  if (input.circleLand === undefined) {
    return characterSheetIssue(
      "Circle of the Land requires selected land state.",
    );
  }
  const druidSourceUnitId = druidCircleLandSpellcastingSourceUnitId({
    build: input.build,
    unitLibrary: input.unitLibrary,
  });
  if (Either.isLeft(druidSourceUnitId))
    return Either.left(druidSourceUnitId.left);
  const druidLevel = classLevelForUnit(
    input.build.progression,
    druidSourceUnitId.right,
  );
  const grant = grants.right[0];
  if (grant === undefined) {
    return characterSheetIssue(
      "Circle of the Land Spell Access requires a prepared spell grant.",
    );
  }
  const spellIds = grant.grant.spellsByLand[input.circleLand.land]
    .filter((tier) => tier.minimumClassLevel <= druidLevel)
    .flatMap((tier) => tier.spellIds);
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
  if (grants.length > 1) {
    return characterSheetIssue(
      "Character Sheet supports one Circle of the Land Spell Access source.",
    );
  }
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
  if (Either.isLeft(druidSourceUnitId))
    return Either.left(druidSourceUnitId.left);
  return druidSourceUnitId.right === undefined
    ? characterSheetIssue(
        "Circle of the Land selected land requires Druid spellcasting source.",
      )
    : Either.right(druidSourceUnitId.right);
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
  return sourceUnitIds.length === 1
    ? Either.right(sourceUnitIds[0])
    : characterSheetIssue(
        "Character Sheet supports one spellcasting source for a class.",
      );
}

export function storedBookOfShadowsDruidCircleLandSelectionIssue(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly circleLand: CharacterSheetDruidCircleLand | undefined;
}): Either.Either<void, CharacterSheetIssue> {
  const projectedAccess = druidCircleLandPreparedSpellAccessForBuild(input);
  if (Either.isLeft(projectedAccess)) return Either.left(projectedAccess.left);
  if (projectedAccess.right === undefined) return Either.right(undefined);
  const selectedSpellIds = new Set(projectedAccess.right.spellIds);
  for (const source of input.build.spellcasting?.sources ?? []) {
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
