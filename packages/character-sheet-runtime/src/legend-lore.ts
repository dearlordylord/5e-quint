// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.legend-lore-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.legend-lore-summary
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { spellSlotLevel } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { CharacterSheetSpellSource } from "./character-spell-projection.ts";
import { Result, Option } from "effect";

import {
  LEGEND_LORE_MATERIAL_COMPONENTS,
  characterSheetIssue,
  type CharacterSheet,
  type CharacterSheetIssue,
  type CharacterSheetLegendLoreCasting,
  type CharacterSheetLegendLoreInvocation,
  type CharacterSheetLegendLoreOutcome,
  type CharacterSheetLegendLoreResult,
  type CharacterSheetLegendLoreSubject,
} from "./sheet-types.ts";
import { hasSingleDirectSelfNoEffectPhase } from "./spell-profile-shape.ts";

import { castPreparedSpell } from "./prepared-spell-cast.ts";

const LEGEND_LORE_SPELL_ID = "legend_lore" as const;
const LEGEND_LORE_SPELL_LEVEL = spellSlotLevel(5);

export function castLegendLore(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly subject: CharacterSheetLegendLoreSubject;
  readonly casting: CharacterSheetLegendLoreCasting;
}): Result.Result<CharacterSheetLegendLoreResult, CharacterSheetIssue> {
  return castPreparedSpell({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
    spellId: authoredUnitId(LEGEND_LORE_SPELL_ID),
    spellLevel: LEGEND_LORE_SPELL_LEVEL,
    spellName: "Legend Lore",
    invocation: (spell) => {
      return legendLoreInvocationFromSpell({
        spell: spell,
        subject: input.subject,
        casting: input.casting,
      });
    },
  });
}

function legendLoreInvocationFromSpell(input: {
  readonly spell: CharacterSheetSpellSource;
  readonly subject: CharacterSheetLegendLoreSubject;
  readonly casting: CharacterSheetLegendLoreCasting;
}): Result.Result<CharacterSheetLegendLoreInvocation, CharacterSheetIssue> {
  const spell = input.spell;
  /* v8 ignore start -- @preserve -- The catalog record failed the exact authored level-5 Legend Lore support profile required by this projector. */
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 5 ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.castingTime.kind !== "minutes" ||
    spell.mechanics.castingTime.amount !== 10 ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    spell.mechanics.components.v !== true ||
    spell.mechanics.components.s !== true ||
    spell.mechanics.components.material.kind !== "present" ||
    Option.isNone(spell.mechanics.components.material.costGp) ||
    spell.mechanics.components.material.costGp.value !== 450
  ) {
    return characterSheetIssue(
      "Legend Lore requires the supported self-range level-5 Divination profile.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- The catalog record has Legend Lore facts but no supported direct self phase. */
  if (!hasSingleDirectSelfNoEffectPhase(spell)) {
    return characterSheetIssue(
      "Legend Lore requires the supported direct self lore-query profile.",
    );
  }
  /* v8 ignore stop -- @preserve */

  return Result.succeed({
    tag: "legendLore",
    spellId: spell.unitId,
    spellLevel: spell.mechanics.level,
    spellSlotCost: {
      kind: "ordinary",
      spellLevel: LEGEND_LORE_SPELL_LEVEL,
    },
    preparationRequirement: "prepared",
    requiredSpellAccess: "class_prepared",
    castingTime: { kind: "minutes", amount: 10 },
    materialComponents: input.casting.materialComponents,
    subject: input.subject,
    lore: legendLoreOutcome(input.subject),
  });
}

function legendLoreOutcome(
  subject: CharacterSheetLegendLoreSubject,
): CharacterSheetLegendLoreOutcome {
  if (subject.tag === "notFamous") {
    return {
      tag: "notFamousFailure",
      answerOwner: "gm",
      signal: "sad_trombone_notes",
    };
  }
  return {
    tag: "gmSummary",
    answerOwner: "gm",
    accuracy: "accurate",
    expression: "literal_or_figurative_poetic",
    precisionBasis: subject.priorKnowledge,
  };
}

export const completedLegendLoreCasting = {
  tag: "completedLegendLoreCasting",
  materialComponents: LEGEND_LORE_MATERIAL_COMPONENTS,
} as const satisfies CharacterSheetLegendLoreCasting;
