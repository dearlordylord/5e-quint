// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.awaken-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.awaken-transformation
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { timeSpanDuration } from "@dnd/shared/elapsed-time";
import { spellSlotLevel } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import {
  AWAKEN_MATERIAL_COMPONENTS,
  characterSheetIssue,
  type CharacterSheet,
  type CharacterSheetAwakenCasting,
  type CharacterSheetAwakenInvocation,
  type CharacterSheetAwakenResult,
  type CharacterSheetAwakenTarget,
  type CharacterSheetIssue,
} from "./sheet-types.ts";

import { castPreparedSpell } from "./prepared-spell-cast.ts";

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
  return castPreparedSpell({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
    spellId: authoredUnitId(AWAKEN_SPELL_ID),
    spellLevel: AWAKEN_SPELL_LEVEL,
    spellName: "Awaken",
    invocation: (spell) => {
      const targetIssue = awakenTargetIssue(input.target);
      if (targetIssue !== null) return characterSheetIssue(targetIssue);
      return awakenInvocationFromSpell({
        spell: spell,
        casting: input.casting,
        target: input.target,
      });
    },
  });
}

function awakenTargetIssue(target: CharacterSheetAwakenTarget): string | null {
  /* v8 ignore start -- These branches reject malformed language or Intelligence facts outside the narrowed Awaken target contract. */
  if (target.languageGranted.length === 0) {
    return "Awaken requires one language the caster knows.";
  }
  if (
    target.tag === "beastOrPlantCreature" &&
    target.intelligenceScore > AWAKEN_MAX_TARGET_INTELLIGENCE_SCORE
  ) {
    return "Awaken creature targets must have Intelligence 3 or less.";
  }
  /* v8 ignore stop */
  return null;
}

function awakenInvocationFromSpell(input: {
  readonly spell: SpellRecord;
  readonly casting: CharacterSheetAwakenCasting;
  readonly target: CharacterSheetAwakenTarget;
}): Either.Either<CharacterSheetAwakenInvocation, CharacterSheetIssue> {
  const spell = input.spell;
  /* v8 ignore start -- The catalog record failed the exact authored level-5 Awaken support profile required by this projector. */
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
  /* v8 ignore stop */
  /* v8 ignore start -- Missing or underpriced Awaken agate evidence is malformed cast-request material input. */
  if (
    input.casting.materialComponents.agateCostGpMinimum <
      AWAKEN_MATERIAL_COMPONENTS.agateCostGpMinimum ||
    input.casting.materialComponents.consumed !== true
  ) {
    return characterSheetIssue(
      "Awaken requires the consumed 1,000 GP agate material component contract.",
    );
  }
  /* v8 ignore stop */
  const directPhase = spell.mechanics.phases.find(
    (phase) =>
      phase.kind === "direct" &&
      phase.attachment.kind === "hole" &&
      phase.attachment.holeId === "awaken_target" &&
      /* v8 ignore next -- Unsupported authored Awaken data: the admitted target phase requires an explicit ability-score effect list. */
      (phase.effects ?? []).some(
        (effect) =>
          effect.kind === "set_ability_score" &&
          effect.ability === "int" &&
          effect.mode === "set" &&
          effect.value === AWAKEN_INTELLIGENCE_SCORE,
      ),
  );
  /* v8 ignore start -- The catalog record has Awaken spell facts but no supported Intelligence-setting target phase. */
  if (directPhase === undefined) {
    return characterSheetIssue(
      "Awaken requires the supported Intelligence-setting target profile.",
    );
  }
  /* v8 ignore stop */

  const charmDuration = timeSpanDuration({
    unit: "day",
    amount: AWAKEN_CHARM_DURATION_DAYS,
  });
  /* v8 ignore start -- The fixed thirty-day charm duration is always accepted by the elapsed-time parser. */
  if (Either.isLeft(charmDuration)) {
    return characterSheetIssue("Awaken requires a supported charm duration.");
  }
  /* v8 ignore stop */

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
