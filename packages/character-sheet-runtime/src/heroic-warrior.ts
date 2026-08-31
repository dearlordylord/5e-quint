// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.fighter-heroic-warrior
import {
  characterBuildFeatureUnitIds,
  type UnitCatalog,
} from "@dnd/character-creation-runtime";
import type { CombatTurnStartHeroicInspirationMechanics } from "@dnd/surface/surface/types";
import { Result, Option } from "effect";

import {
  projectCharacterSheetClassFeature,
  type CharacterSheetClassFeatureFacts,
} from "./character-feature-projection.ts";
import {
  CHARACTER_SHEET_HEROIC_INSPIRATION_AVAILABLE,
  characterSheetIssue,
  type CharacterSheet,
  type CharacterSheetIssue,
} from "./sheet-types.ts";

type CharacterSheetCombatTurnStartHeroicInspirationFeature =
  CharacterSheetClassFeatureFacts & {
    readonly mechanics: CombatTurnStartHeroicInspirationMechanics;
  };

export function useHeroicWarriorAtCombatTurnStart(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
}): Result.Result<CharacterSheet, CharacterSheetIssue> {
  const feature = combatTurnStartHeroicInspirationFeature(input);
  /* v8 ignore next -- @preserve -- Malformed build/catalog correlation: Heroic Warrior lookup can fail only when an admitted feature id no longer resolves. */
  if (Result.isFailure(feature)) return Result.fail(feature.failure);
  if (feature.success === undefined) {
    return characterSheetIssue(
      "Heroic Warrior requires a retained combat turn-start Heroic Inspiration feature.",
    );
  }
  if (input.sheet.heroicInspiration.tag === "available") {
    return characterSheetIssue(
      "Heroic Warrior requires starting the combat turn without Heroic Inspiration.",
    );
  }
  return Result.succeed({
    ...input.sheet,
    heroicInspiration: CHARACTER_SHEET_HEROIC_INSPIRATION_AVAILABLE,
  });
}

function combatTurnStartHeroicInspirationFeature(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
}): Result.Result<
  CharacterSheetCombatTurnStartHeroicInspirationFeature | undefined,
  CharacterSheetIssue
> {
  for (const unitId of characterBuildFeatureUnitIds(
    input.sheet.build,
    input.unitLibrary,
  )) {
    const unit = input.unitLibrary.getUnit(unitId);
    /* v8 ignore start -- @preserve -- Malformed build/catalog correlation: every feature id admitted into the build must resolve in its retained Unit catalog. */
    if (Option.isNone(unit)) {
      return characterSheetIssue(`Missing class feature Unit ${unitId}.`);
    }
    /* v8 ignore stop -- @preserve */
    const projection = projectCharacterSheetClassFeature(unit.value);
    if (
      Option.isSome(projection) &&
      isCombatTurnStartHeroicInspirationFeature(projection.value)
    ) {
      return Result.succeed(projection.value);
    }
  }
  return Result.succeed(undefined);
}

function isCombatTurnStartHeroicInspirationFeature(
  facts: CharacterSheetClassFeatureFacts,
): facts is CharacterSheetCombatTurnStartHeroicInspirationFeature {
  return (
    facts.mechanics.family === "combat_turn_start_heroic_inspiration" &&
    facts.mechanics.trigger.kind === "start_turn" &&
    facts.mechanics.trigger.encounter === "combat" &&
    facts.mechanics.trigger.requiresMissingHeroicInspiration === true &&
    facts.mechanics.grant.kind === "heroic_inspiration"
  );
}
