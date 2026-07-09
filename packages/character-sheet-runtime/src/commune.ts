// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.commune-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.planar-entity-answers
import { timeSpanDuration } from "@dnd/shared/elapsed-time";
import {
  PositiveInteger,
  resourceCount,
  spellSlotLevel,
} from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type {
  SpellRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import { Either } from "effect";

import { spendCharacterSheetSpellSlot } from "./spell-slots.ts";
import {
  COMMUNE_CASTING_REST_FEATURE_TAG,
  characterSheetIssue,
  getRequiredUnit,
  type CharacterSheet,
  type CharacterSheetCommuneInvocation,
  type CharacterSheetCommuneResult,
  type CharacterSheetIssue,
  type CharacterSheetRestFeatureUse,
} from "./sheet-types.ts";

const COMMUNE_SPELL_ID = "commune" as const;
const COMMUNE_SPELL_LEVEL = spellSlotLevel(5);
const COMMUNE_NO_ANSWER_CHANCE_PERCENT_PER_REPEAT_CASTING = 25;

export function castCommune(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<CharacterSheetCommuneResult, CharacterSheetIssue> {
  const spell = communeSpell(input.unitLibrary);
  if (Either.isLeft(spell)) return Either.left(spell.left);

  if (!hasPreparedCommuneAccess(input.sheet)) {
    return characterSheetIssue(
      "Commune requires prepared class Spell Access.",
    );
  }

  const invocation = communeInvocationFromSpell({
    spell: spell.right,
    previousCastCountSinceLongRest: communeCastCountSinceLongRest(
      input.sheet,
    ),
  });
  if (Either.isLeft(invocation)) return Either.left(invocation.left);

  const spent = spendCharacterSheetSpellSlot({
    sheet: input.sheet,
    spellLevel: COMMUNE_SPELL_LEVEL,
    spellSlotSource: "ordinary",
  });
  if (Either.isLeft(spent)) return Either.left(spent.left);

  return Either.right({
    sheet: {
      ...spent.right,
      restFeatureUses: replaceCommuneCastCountSinceLongRest({
        restFeatureUses: spent.right.restFeatureUses,
        nextCastCount: resourceCount(
          invocation.right.repeatedCasting.previousCastCountSinceLongRest + 1,
        ),
      }),
    },
    invocation: invocation.right,
  });
}

function communeSpell(
  unitLibrary: UnitCatalog,
): Either.Either<SpellRecord, CharacterSheetIssue> {
  const unit = getRequiredUnit(unitLibrary, COMMUNE_SPELL_ID);
  if (Either.isLeft(unit)) return Either.left(unit.left);
  if (unit.right.kind !== "spell") {
    return characterSheetIssue("Commune requires a Spell record.");
  }
  return Either.right(unit.right);
}

function hasPreparedCommuneAccess(sheet: CharacterSheet): boolean {
  return (
    sheet.build.spellcasting?.sources.some((source) =>
      source.preparedSpells.some((spellId) => spellId === COMMUNE_SPELL_ID),
    ) ?? false
  );
}

function communeInvocationFromSpell(input: {
  readonly spell: SpellRecord;
  readonly previousCastCountSinceLongRest: CharacterSheetCommuneInvocation["repeatedCasting"]["previousCastCountSinceLongRest"];
}): Either.Either<CharacterSheetCommuneInvocation, CharacterSheetIssue> {
  if (
    input.spell.id !== COMMUNE_SPELL_ID ||
    input.spell.mechanics.family !== "activation" ||
    input.spell.mechanics.level !== 5 ||
    input.spell.mechanics.range.kind !== "self" ||
    input.spell.mechanics.castingTime.kind !== "minutes" ||
    input.spell.mechanics.duration.kind !== "timed"
  ) {
    return characterSheetIssue(
      "Commune requires the supported self-range level-5 Divination profile.",
    );
  }
  const directPhase = input.spell.mechanics.phases.find(
    (phase) =>
      phase.kind === "direct" &&
      phase.attachment.kind === "self" &&
      (phase.effects ?? []).length === 1 &&
      (phase.effects ?? [])[0]?.kind === "none",
  );
  if (directPhase === undefined) {
    return characterSheetIssue(
      "Commune requires the supported direct self table-answer profile.",
    );
  }
  const questionWindow = timeSpanDuration(input.spell.mechanics.duration.value);
  if (Either.isLeft(questionWindow)) {
    return characterSheetIssue("Commune requires a supported duration.");
  }

  return Either.right({
    tag: "commune",
    spellId: input.spell.id,
    spellLevel: input.spell.mechanics.level,
    spellSlotCost: {
      kind: "ordinary",
      spellLevel: COMMUNE_SPELL_LEVEL,
    },
    preparationRequirement: "prepared",
    requiredSpellAccess: "class_prepared",
    questions: {
      count: PositiveInteger(3),
      answerOwner: "gm",
      primaryAnswer: "yes_no",
      unknownAnswer: "unclear",
      misleadingAnswerFallback: "short_phrase_if_one_word_misleading",
      window: questionWindow.right,
    },
    repeatedCasting: {
      previousCastCountSinceLongRest: input.previousCastCountSinceLongRest,
      noAnswerChancePercent:
        input.previousCastCountSinceLongRest *
        COMMUNE_NO_ANSWER_CHANCE_PERCENT_PER_REPEAT_CASTING,
    },
  });
}

function communeCastCountSinceLongRest(
  sheet: CharacterSheet,
): CharacterSheetCommuneInvocation["repeatedCasting"]["previousCastCountSinceLongRest"] {
  return (
    sheet.restFeatureUses.find(
      (use): use is Extract<
        CharacterSheetRestFeatureUse,
        { readonly tag: typeof COMMUNE_CASTING_REST_FEATURE_TAG }
      > =>
        use.tag === COMMUNE_CASTING_REST_FEATURE_TAG &&
        use.spellId === COMMUNE_SPELL_ID,
    )?.castCount ?? resourceCount(0)
  );
}

function replaceCommuneCastCountSinceLongRest(input: {
  readonly restFeatureUses: readonly CharacterSheetRestFeatureUse[];
  readonly nextCastCount: CharacterSheetCommuneInvocation["repeatedCasting"]["previousCastCountSinceLongRest"];
}): readonly CharacterSheetRestFeatureUse[] {
  return [
    ...input.restFeatureUses.filter(
      (use) =>
        !(
          use.tag === COMMUNE_CASTING_REST_FEATURE_TAG &&
          use.spellId === COMMUNE_SPELL_ID
        ),
    ),
    {
      tag: COMMUNE_CASTING_REST_FEATURE_TAG,
      spellId: COMMUNE_SPELL_ID satisfies UnitRecord["id"],
      usedSinceLongRest: true,
      castCount: input.nextCastCount,
    },
  ];
}
