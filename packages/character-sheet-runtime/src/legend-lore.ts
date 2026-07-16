// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.legend-lore-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.legend-lore-summary
import { spellSlotLevel } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import { hasPreparedClassSpellAccess } from "./prepared-spell-access.ts";
import { spendCharacterSheetSpellSlot } from "./spell-slots.ts";
import {
  LEGEND_LORE_MATERIAL_COMPONENTS,
  characterSheetIssue,
  getRequiredUnit,
  type CharacterSheet,
  type CharacterSheetIssue,
  type CharacterSheetLegendLoreCasting,
  type CharacterSheetLegendLoreInvocation,
  type CharacterSheetLegendLoreOutcome,
  type CharacterSheetLegendLoreResult,
  type CharacterSheetLegendLoreSubject,
} from "./sheet-types.ts";

const LEGEND_LORE_SPELL_ID = "legend_lore" as const;
const LEGEND_LORE_SPELL_LEVEL = spellSlotLevel(5);

export function castLegendLore(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly subject: CharacterSheetLegendLoreSubject;
  readonly casting: CharacterSheetLegendLoreCasting;
}): Either.Either<CharacterSheetLegendLoreResult, CharacterSheetIssue> {
  const spell = legendLoreSpell(input.unitLibrary);
  if (Either.isLeft(spell)) return Either.left(spell.left);

  if (!hasPreparedClassSpellAccess(input.sheet, spell.right.id)) {
    return characterSheetIssue(
      "Legend Lore requires prepared class Spell Access.",
    );
  }

  const invocation = legendLoreInvocationFromSpell({
    spell: spell.right,
    subject: input.subject,
    casting: input.casting,
  });
  if (Either.isLeft(invocation)) return Either.left(invocation.left);

  const spent = spendCharacterSheetSpellSlot({
    sheet: input.sheet,
    spellLevel: LEGEND_LORE_SPELL_LEVEL,
    spellSlotSource: "ordinary",
  });
  if (Either.isLeft(spent)) return Either.left(spent.left);

  return Either.right({
    sheet: spent.right,
    invocation: invocation.right,
  });
}

function legendLoreSpell(
  unitLibrary: UnitCatalog,
): Either.Either<SpellRecord, CharacterSheetIssue> {
  const unit = getRequiredUnit(unitLibrary, LEGEND_LORE_SPELL_ID);
  if (Either.isLeft(unit)) return Either.left(unit.left);
  if (unit.right.kind !== "spell") {
    return characterSheetIssue("Legend Lore requires a Spell record.");
  }
  return Either.right(unit.right);
}

function legendLoreInvocationFromSpell(input: {
  readonly spell: SpellRecord;
  readonly subject: CharacterSheetLegendLoreSubject;
  readonly casting: CharacterSheetLegendLoreCasting;
}): Either.Either<CharacterSheetLegendLoreInvocation, CharacterSheetIssue> {
  const spell = input.spell;
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 5 ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.castingTime.kind !== "minutes" ||
    spell.mechanics.castingTime.amount !== 10 ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    spell.mechanics.components.v !== true ||
    spell.mechanics.components.s !== true ||
    !("materialCostGp" in spell.mechanics.components) ||
    spell.mechanics.components.materialCostGp !== 450
  ) {
    return characterSheetIssue(
      "Legend Lore requires the supported self-range level-5 Divination profile.",
    );
  }
  const directPhase = spell.mechanics.phases.find(
    (phase) =>
      phase.kind === "direct" &&
      phase.attachment.kind === "self" &&
      (phase.effects ?? []).length === 1 &&
      (phase.effects ?? [])[0]?.kind === "none",
  );
  if (directPhase === undefined) {
    return characterSheetIssue(
      "Legend Lore requires the supported direct self lore-query profile.",
    );
  }

  return Either.right({
    tag: "legendLore",
    spellId: spell.id,
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
