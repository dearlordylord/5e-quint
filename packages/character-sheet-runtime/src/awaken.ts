// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.awaken-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.awaken-transformation
import { timeSpanDuration } from "@dnd/shared/elapsed-time";
import { spellSlotLevel } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import { hasPreparedClassSpellAccess } from "./prepared-spell-access.ts";
import { spendCharacterSheetSpellSlot } from "./spell-slots.ts";
import {
  AWAKEN_MATERIAL_COMPONENTS,
  characterSheetIssue,
  getRequiredUnit,
  type CharacterSheet,
  type CharacterSheetAwakenCasting,
  type CharacterSheetAwakenInvocation,
  type CharacterSheetAwakenResult,
  type CharacterSheetAwakenTarget,
  type CharacterSheetIssue,
} from "./sheet-types.ts";

const AWAKEN_SPELL_ID = "awaken" as const;
const AWAKEN_SPELL_LEVEL = spellSlotLevel(5);
const AWAKEN_CASTING_TIME_HOURS = 8;
const AWAKEN_CHARM_DURATION_DAYS = 30;
const AWAKEN_INTELLIGENCE_SCORE = 10;
const AWAKEN_MAX_TARGET_INTELLIGENCE_SCORE = 3;

export function castAwaken(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly casting: CharacterSheetAwakenCasting;
  readonly target: CharacterSheetAwakenTarget;
}): Either.Either<CharacterSheetAwakenResult, CharacterSheetIssue> {
  const spell = awakenSpell(input.unitLibrary);
  if (Either.isLeft(spell)) return Either.left(spell.left);

  if (!hasPreparedClassSpellAccess(input.sheet, spell.right.id)) {
    return characterSheetIssue("Awaken requires prepared class Spell Access.");
  }

  const targetIssue = awakenTargetIssue(input.target);
  if (targetIssue !== null) return characterSheetIssue(targetIssue);

  const invocation = awakenInvocationFromSpell({
    spell: spell.right,
    casting: input.casting,
    target: input.target,
  });
  if (Either.isLeft(invocation)) return Either.left(invocation.left);

  const spent = spendCharacterSheetSpellSlot({
    sheet: input.sheet,
    spellLevel: AWAKEN_SPELL_LEVEL,
    spellSlotSource: "ordinary",
  });
  if (Either.isLeft(spent)) return Either.left(spent.left);

  return Either.right({
    sheet: spent.right,
    invocation: invocation.right,
  });
}

function awakenSpell(
  unitLibrary: UnitCatalog,
): Either.Either<SpellRecord, CharacterSheetIssue> {
  const unit = getRequiredUnit(unitLibrary, AWAKEN_SPELL_ID);
  if (Either.isLeft(unit)) return Either.left(unit.left);
  if (unit.right.kind !== "spell") {
    return characterSheetIssue("Awaken requires a Spell record.");
  }
  return Either.right(unit.right);
}

function awakenTargetIssue(target: CharacterSheetAwakenTarget): string | null {
  if (target.languageGranted.length === 0) {
    return "Awaken requires one language the caster knows.";
  }
  if (
    target.tag === "beastOrPlantCreature" &&
    target.intelligenceScore > AWAKEN_MAX_TARGET_INTELLIGENCE_SCORE
  ) {
    return "Awaken creature targets must have Intelligence 3 or less.";
  }
  return null;
}

function awakenInvocationFromSpell(input: {
  readonly spell: SpellRecord;
  readonly casting: CharacterSheetAwakenCasting;
  readonly target: CharacterSheetAwakenTarget;
}): Either.Either<CharacterSheetAwakenInvocation, CharacterSheetIssue> {
  const spell = input.spell;
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 5 ||
    spell.mechanics.range.kind !== "touch" ||
    spell.mechanics.castingTime.kind !== "hours" ||
    spell.mechanics.castingTime.amount !== AWAKEN_CASTING_TIME_HOURS ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    spell.mechanics.components.v !== true ||
    spell.mechanics.components.s !== true ||
    !("materialCostGp" in spell.mechanics.components) ||
    spell.mechanics.components.materialCostGp !==
      AWAKEN_MATERIAL_COMPONENTS.agateCostGpMinimum ||
    !("materialConsumed" in spell.mechanics.components) ||
    spell.mechanics.components.materialConsumed !== true
  ) {
    return characterSheetIssue(
      "Awaken requires the supported level-5 touch transformation profile.",
    );
  }
  if (
    input.casting.materialComponents.agateCostGpMinimum <
      AWAKEN_MATERIAL_COMPONENTS.agateCostGpMinimum ||
    input.casting.materialComponents.consumed !== true
  ) {
    return characterSheetIssue(
      "Awaken requires the consumed 1,000 GP agate material component contract.",
    );
  }
  const directPhase = spell.mechanics.phases.find(
    (phase) =>
      phase.kind === "direct" &&
      phase.attachment.kind === "hole" &&
      phase.attachment.holeId === "awaken_target" &&
      (phase.effects ?? []).some(
        (effect) =>
          effect.kind === "set_ability_score" &&
          effect.ability === "int" &&
          effect.mode === "set" &&
          effect.value === AWAKEN_INTELLIGENCE_SCORE,
      ),
  );
  if (directPhase === undefined) {
    return characterSheetIssue(
      "Awaken requires the supported Intelligence-setting target profile.",
    );
  }

  const charmDuration = timeSpanDuration({
    unit: "day",
    amount: AWAKEN_CHARM_DURATION_DAYS,
  });
  if (Either.isLeft(charmDuration)) {
    return characterSheetIssue("Awaken requires a supported charm duration.");
  }

  return Either.right({
    tag: "awaken",
    spellId: spell.id,
    spellLevel: spell.mechanics.level,
    spellSlotCost: {
      kind: "ordinary",
      spellLevel: AWAKEN_SPELL_LEVEL,
    },
    preparationRequirement: "prepared",
    requiredSpellAccess: "class_prepared",
    castingTime: { kind: "hours", amount: AWAKEN_CASTING_TIME_HOURS },
    range: "touch",
    materialComponents: input.casting.materialComponents,
    target: input.target,
    transformation: {
      intelligenceScore: AWAKEN_INTELLIGENCE_SCORE,
      language: {
        source: "one_language_the_caster_knows",
        selectedLanguage: input.target.languageGranted,
      },
      naturalPlantCreatureChange:
        input.target.tag === "naturalPlant"
          ? {
              applies: true,
              creatureType: "plant",
              gainsMovement: true,
              gainsHumanlikeSenses: true,
              statisticsOwner: "gm-table",
              suggestedStatistics: ["awakened_shrub", "awakened_tree"],
            }
          : { applies: false },
    },
    charm: {
      condition: "charmed",
      duration: charmDuration.right,
      endsIfCasterOrAlliesDamageTarget: true,
      attitudeAfterConditionEndsOwner: "gm-table",
    },
    tableStateOwners: [
      "stat-block-or-creature-conversion",
      "world-plant-object-mutation",
      "social-attitude-after-charm",
    ],
  });
}
