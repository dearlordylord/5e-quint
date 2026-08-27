// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.passwall-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.passwall-spatial-passage
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { timeSpanDuration } from "@dnd/shared/elapsed-time";
import { spellSlotLevel } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Result } from "effect";

import {
  characterSheetIssue,
  type CharacterSheet,
  type CharacterSheetIssue,
  type CharacterSheetPasswallDimensions,
  type CharacterSheetPasswallInvocation,
  type CharacterSheetPasswallResult,
  type CharacterSheetPasswallSurface,
} from "./sheet-types.ts";

import { castPreparedSpell } from "./prepared-spell-cast.ts";

const PASSWALL_SPELL_ID = "passwall" as const;
const PASSWALL_SPELL_LEVEL = spellSlotLevel(5);
const PASSWALL_RANGE_FEET = 30;
const PASSWALL_MAX_WIDTH_FEET = 5;
const PASSWALL_MAX_HEIGHT_FEET = 8;
const PASSWALL_MAX_DEPTH_FEET = 20;

export function castPasswall(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly surface: CharacterSheetPasswallSurface;
  readonly dimensions: CharacterSheetPasswallDimensions;
}): Result.Result<CharacterSheetPasswallResult, CharacterSheetIssue> {
  return castPreparedSpell({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
    spellId: authoredUnitId(PASSWALL_SPELL_ID),
    spellLevel: PASSWALL_SPELL_LEVEL,
    spellName: "Passwall",
    invocation: (spell) => {
      const dimensionIssue = passwallDimensionIssue(input.dimensions);
      if (dimensionIssue !== null) return characterSheetIssue(dimensionIssue);
      return passwallInvocationFromSpell({
        spell: spell,
        surface: input.surface,
        dimensions: input.dimensions,
      });
    },
  });
}

function passwallDimensionIssue(
  dimensions: CharacterSheetPasswallDimensions,
): string | null {
  /* v8 ignore start -- @preserve -- These branches reject nonpositive or oversized dimensions outside the narrowed Passwall request contract. */
  if (
    dimensions.widthFeet <= 0 ||
    dimensions.heightFeet <= 0 ||
    dimensions.depthFeet <= 0
  ) {
    return "Passwall dimensions must be positive.";
  }
  if (dimensions.widthFeet > PASSWALL_MAX_WIDTH_FEET) {
    return "Passwall width must be at most 5 feet.";
  }
  if (dimensions.heightFeet > PASSWALL_MAX_HEIGHT_FEET) {
    return "Passwall height must be at most 8 feet.";
  }
  if (dimensions.depthFeet > PASSWALL_MAX_DEPTH_FEET) {
    return "Passwall depth must be at most 20 feet.";
  }
  /* v8 ignore stop -- @preserve */
  return null;
}

function passwallInvocationFromSpell(input: {
  readonly spell: SpellRecord;
  readonly surface: CharacterSheetPasswallSurface;
  readonly dimensions: CharacterSheetPasswallDimensions;
}): Result.Result<CharacterSheetPasswallInvocation, CharacterSheetIssue> {
  const spell = input.spell;
  /* v8 ignore start -- @preserve -- The catalog record failed the exact authored level-5 Passwall support profile required by this projector. */
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 5 ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== PASSWALL_RANGE_FEET ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.components.v !== true ||
    spell.mechanics.components.s !== true
  ) {
    return characterSheetIssue(
      "Passwall requires the supported level-5 surface-passage profile.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const duration = timeSpanDuration(spell.mechanics.duration.value);
  /* v8 ignore start -- @preserve -- The authored Passwall duration admitted above is always accepted by the elapsed-time parser. */
  if (Result.isFailure(duration)) {
    return characterSheetIssue("Passwall requires a supported duration.");
  }
  /* v8 ignore stop -- @preserve */
  const directPhase = spell.mechanics.phases.find(
    (phase) =>
      phase.kind === "direct" &&
      phase.attachment.kind === "location" &&
      /* v8 ignore next -- @preserve -- Unsupported authored Passwall data: the admitted location phase requires exactly one explicit no-op effect. */
      (phase.effects ?? []).length === 1 &&
      /* v8 ignore next -- @preserve -- Unsupported authored Passwall data: omission of that required effect was rejected by the same profile predicate. */
      (phase.effects ?? [])[0]?.kind === "none",
  );
  /* v8 ignore start -- @preserve -- The catalog record has Passwall spell facts but no supported visible-surface location phase. */
  if (directPhase === undefined) {
    return characterSheetIssue(
      "Passwall requires the supported visible surface location profile.",
    );
  }
  /* v8 ignore stop -- @preserve */

  return Result.succeed({
    tag: "passwall",
    spellId: spell.id,
    spellLevel: spell.mechanics.level,
    spellSlotCost: {
      kind: "ordinary",
      spellLevel: PASSWALL_SPELL_LEVEL,
    },
    preparationRequirement: "prepared",
    requiredSpellAccess: "class_prepared",
    rangeFeet: PASSWALL_RANGE_FEET,
    duration: duration.success,
    surface: input.surface,
    dimensions: input.dimensions,
    passage: {
      createsNoStructuralInstability: true,
      ejectionWhenOpeningDisappears: "nearest_unoccupied_space_to_cast_surface",
    },
  });
}
