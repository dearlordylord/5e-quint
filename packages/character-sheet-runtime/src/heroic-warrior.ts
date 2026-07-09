// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.fighter-heroic-warrior
import {
  characterBuildFeatureUnitIds,
  type UnitCatalog,
} from "@dnd/character-creation-runtime";
import type {
  CombatTurnStartHeroicInspirationMechanics,
  UnitRecord,
} from "@dnd/surface/surface/types";
import { Either, Option } from "effect";

import {
  CHARACTER_SHEET_HEROIC_INSPIRATION_AVAILABLE,
  characterSheetIssue,
  type CharacterSheet,
  type CharacterSheetIssue,
} from "./sheet-types.ts";

type CharacterSheetCombatTurnStartHeroicInspirationFeature = Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> & {
  readonly mechanics: CombatTurnStartHeroicInspirationMechanics;
};

export function useHeroicWarriorAtCombatTurnStart(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<CharacterSheet, CharacterSheetIssue> {
  const feature = combatTurnStartHeroicInspirationFeature(input);
  if (Either.isLeft(feature)) return Either.left(feature.left);
  if (feature.right === undefined) {
    return characterSheetIssue(
      "Heroic Warrior requires a retained combat turn-start Heroic Inspiration feature.",
    );
  }
  if (input.sheet.heroicInspiration.tag === "available") {
    return characterSheetIssue(
      "Heroic Warrior requires starting the combat turn without Heroic Inspiration.",
    );
  }
  return Either.right({
    ...input.sheet,
    heroicInspiration: CHARACTER_SHEET_HEROIC_INSPIRATION_AVAILABLE,
  });
}

function combatTurnStartHeroicInspirationFeature(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  CharacterSheetCombatTurnStartHeroicInspirationFeature | undefined,
  CharacterSheetIssue
> {
  for (const unitId of characterBuildFeatureUnitIds(
    input.sheet.build,
    input.unitLibrary,
  )) {
    const unit = input.unitLibrary.getUnit(unitId);
    if (Option.isNone(unit)) {
      return characterSheetIssue(`Missing class feature Unit ${unitId}.`);
    }
    if (isCombatTurnStartHeroicInspirationFeature(unit.value)) {
      return Either.right(unit.value);
    }
  }
  return Either.right(undefined);
}

function isCombatTurnStartHeroicInspirationFeature(
  unit: UnitRecord,
): unit is CharacterSheetCombatTurnStartHeroicInspirationFeature {
  return (
    unit.kind === "class_feature" &&
    unit.mechanics.family === "combat_turn_start_heroic_inspiration" &&
    unit.mechanics.trigger.kind === "start_turn" &&
    unit.mechanics.trigger.encounter === "combat" &&
    unit.mechanics.trigger.requiresMissingHeroicInspiration === true &&
    unit.mechanics.grant.kind === "heroic_inspiration"
  );
}
