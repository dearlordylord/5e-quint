// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.mislead-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.mislead-illusion-remote-senses
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { timeSpanDuration } from "@dnd/shared/elapsed-time";
import { spellSlotLevel } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import { hasPreparedClassSpellAccess } from "./prepared-spell-access.ts";
import { spendCharacterSheetSpellSlot } from "./spell-slots.ts";
import {
  characterSheetIssue,
  getRequiredUnit,
  type CharacterSheet,
  type CharacterSheetIssue,
  type CharacterSheetMisleadCasting,
  type CharacterSheetMisleadInvocation,
  type CharacterSheetMisleadResult,
} from "./sheet-types.ts";

const MISLEAD_SPELL_ID = "mislead" as const;
const MISLEAD_SPELL_LEVEL = spellSlotLevel(5);
const MISLEAD_DURATION_HOURS = 1;

export function castMislead(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly casting: CharacterSheetMisleadCasting;
}): Either.Either<CharacterSheetMisleadResult, CharacterSheetIssue> {
  const spell = misleadSpell(input.unitLibrary);
  if (Either.isLeft(spell)) return Either.left(spell.left);

  if (!hasPreparedClassSpellAccess(input.sheet, spell.right.id)) {
    return characterSheetIssue("Mislead requires prepared class Spell Access.");
  }

  if (!Number.isInteger(input.casting.casterSpeedFeet)) {
    return characterSheetIssue("Mislead requires an integer caster Speed.");
  }
  if (input.casting.casterSpeedFeet <= 0) {
    return characterSheetIssue("Mislead requires a positive caster Speed.");
  }

  const invocation = misleadInvocationFromSpell({
    spell: spell.right,
    casting: input.casting,
  });
  if (Either.isLeft(invocation)) return Either.left(invocation.left);

  const spent = spendCharacterSheetSpellSlot({
    sheet: input.sheet,
    spellLevel: MISLEAD_SPELL_LEVEL,
    spellSlotSource: "ordinary",
  });
  if (Either.isLeft(spent)) return Either.left(spent.left);

  return Either.right({
    sheet: spent.right,
    invocation: invocation.right,
  });
}

function misleadSpell(
  unitLibrary: UnitCatalog,
): Either.Either<SpellRecord, CharacterSheetIssue> {
  const unit = getRequiredUnit(unitLibrary, authoredUnitId(MISLEAD_SPELL_ID));
  if (Either.isLeft(unit)) return Either.left(unit.left);
  if (unit.right.kind !== "spell") {
    return characterSheetIssue("Mislead requires a Spell record.");
  }
  return Either.right(unit.right);
}

function misleadInvocationFromSpell(input: {
  readonly spell: SpellRecord;
  readonly casting: CharacterSheetMisleadCasting;
}): Either.Either<CharacterSheetMisleadInvocation, CharacterSheetIssue> {
  const spell = input.spell;
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 5 ||
    spell.mechanics.school !== "illusion" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "hour" ||
    spell.mechanics.duration.upTo.amount !== MISLEAD_DURATION_HOURS ||
    spell.mechanics.components.v !== false ||
    spell.mechanics.components.s !== true ||
    spell.mechanics.components.m !== false
  ) {
    return characterSheetIssue(
      "Mislead requires the supported self-range level-5 Illusion profile.",
    );
  }

  if (
    !hasDurationEnd(spell, "target_makes_attack_roll") ||
    !hasDurationEnd(spell, "target_deals_damage") ||
    !hasDurationEnd(spell, "target_casts_spell")
  ) {
    return characterSheetIssue(
      "Mislead requires the supported Invisible early-ending profile.",
    );
  }

  const directPhase = spell.mechanics.phases.find(
    (phase) =>
      phase.kind === "direct" &&
      phase.attachment.kind === "self" &&
      phase.effects?.some(
        (effect) =>
          effect.kind === "apply_condition" && effect.condition === "invisible",
      ) === true,
  );
  if (directPhase === undefined) {
    return characterSheetIssue(
      "Mislead requires the supported self Invisible profile.",
    );
  }

  const duration = timeSpanDuration(spell.mechanics.duration.upTo);
  if (Either.isLeft(duration)) {
    return characterSheetIssue("Mislead requires a supported duration.");
  }

  return Either.right({
    tag: "mislead",
    spellId: spell.id,
    spellLevel: spell.mechanics.level,
    spellSlotCost: {
      kind: "ordinary",
      spellLevel: MISLEAD_SPELL_LEVEL,
    },
    preparationRequirement: "prepared",
    requiredSpellAccess: "class_prepared",
    castingTime: { kind: "action" },
    range: "self",
    components: ["s"],
    concentration: {
      upTo: duration.right,
      doubleDurationMatchesConcentration: true,
    },
    invisibility: {
      condition: "invisible",
      startsWhenDoubleAppears: true,
      earlyEnd: [
        "caster_makes_attack_roll",
        "caster_deals_damage",
        "caster_casts_spell",
      ],
    },
    illusoryDouble: {
      appearsWhereCasterStands: true,
      tangible: false,
      invulnerable: true,
      movementControl: {
        action: "magic",
        maxDistanceFeet: input.casting.casterSpeedFeet * 2,
        basedOnCasterSpeedMultiplier: 2,
        movementPathOwner: "table",
      },
      behaviorControl: {
        gesturesSpeaksAndBehavesAsCasterChooses: true,
        behaviorRenderingOwner: "table",
      },
      remoteSenses: {
        sight: "through_double_eyes",
        hearing: "through_double_ears",
        asIfLocatedAtDouble: true,
        sensoryContentsOwner: "table",
      },
      mapPlacementOwner: "table",
    },
  });
}

function hasDurationEnd(spell: SpellRecord, kind: string): boolean {
  return spell.mechanics.duration.kind === "concentration"
    ? spell.mechanics.duration.earlyEnd?.some(
        (trigger) => trigger.kind === kind,
      ) === true
    : false;
}
