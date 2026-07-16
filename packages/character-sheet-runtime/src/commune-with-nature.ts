// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.commune-with-nature-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.nature-exploration-facts
import { PositiveInteger, spellSlotLevel } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import { hasPreparedClassSpellAccess } from "./prepared-spell-access.ts";
import { spendCharacterSheetSpellSlot } from "./spell-slots.ts";
import {
  characterSheetIssue,
  getRequiredUnit,
  type CharacterSheet,
  type CharacterSheetCommuneWithNatureInvocation,
  type CharacterSheetCommuneWithNatureResult,
  type CharacterSheetIssue,
} from "./sheet-types.ts";

const COMMUNE_WITH_NATURE_SPELL_ID = "commune_with_nature" as const;
const COMMUNE_WITH_NATURE_SPELL_LEVEL = spellSlotLevel(5);

export function castCommuneWithNature(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<CharacterSheetCommuneWithNatureResult, CharacterSheetIssue> {
  const spell = communeWithNatureSpell(input.unitLibrary);
  if (Either.isLeft(spell)) return Either.left(spell.left);

  if (!hasPreparedClassSpellAccess(input.sheet, spell.right.id)) {
    return characterSheetIssue(
      "Commune with Nature requires prepared class Spell Access.",
    );
  }

  const invocation = communeWithNatureInvocationFromSpell(spell.right);
  if (Either.isLeft(invocation)) return Either.left(invocation.left);

  const spent = spendCharacterSheetSpellSlot({
    sheet: input.sheet,
    spellLevel: COMMUNE_WITH_NATURE_SPELL_LEVEL,
    spellSlotSource: "ordinary",
  });
  if (Either.isLeft(spent)) return Either.left(spent.left);

  return Either.right({
    sheet: spent.right,
    invocation: invocation.right,
  });
}

function communeWithNatureSpell(
  unitLibrary: UnitCatalog,
): Either.Either<SpellRecord, CharacterSheetIssue> {
  const unit = getRequiredUnit(unitLibrary, COMMUNE_WITH_NATURE_SPELL_ID);
  if (Either.isLeft(unit)) return Either.left(unit.left);
  if (unit.right.kind !== "spell") {
    return characterSheetIssue("Commune with Nature requires a Spell record.");
  }
  return Either.right(unit.right);
}

function communeWithNatureInvocationFromSpell(
  spell: SpellRecord,
): Either.Either<
  CharacterSheetCommuneWithNatureInvocation,
  CharacterSheetIssue
> {
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 5 ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.castingTime.kind !== "minutes" ||
    spell.mechanics.duration.kind !== "instantaneous"
  ) {
    return characterSheetIssue(
      "Commune with Nature requires the supported self-range level-5 Divination profile.",
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
      "Commune with Nature requires the supported direct self exploration-query profile.",
    );
  }

  return Either.right({
    tag: "communeWithNature",
    spellId: spell.id,
    spellLevel: spell.mechanics.level,
    spellSlotCost: {
      kind: "ordinary",
      spellLevel: COMMUNE_WITH_NATURE_SPELL_LEVEL,
    },
    preparationRequirement: "prepared",
    requiredSpellAccess: "class_prepared",
    facts: {
      count: PositiveInteger(3),
      answerOwner: "gm",
      scope: {
        outdoorsRadiusMiles: 3,
        naturalUndergroundRadiusFeet: 300,
        blockedWhenNatureReplacedByConstruction: true,
      },
      categories: [
        "settlements",
        "planar_portals",
        "powerful_creatures",
        "plants_minerals_beasts",
        "bodies_of_water",
      ],
    },
  });
}
