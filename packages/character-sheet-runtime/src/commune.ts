// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.commune-session-invocation
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.planar-entity-answers
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { timeSpanDuration } from "@dnd/shared/elapsed-time";
import {
  PositiveInteger,
  resourceCount,
  spellSlotLevel,
} from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { CharacterSheetSpellSource } from "./character-spell-projection.ts";
import { Result } from "effect";

import {
  COMMUNE_CASTING_REST_FEATURE_TAG,
  characterSheetIssue,
  type CharacterSheet,
  type CharacterSheetCommuneInvocation,
  type CharacterSheetCommuneResult,
  type CharacterSheetIssue,
  type CharacterSheetRestFeatureUse,
} from "./sheet-types.ts";

import { castPreparedSpell } from "./prepared-spell-cast.ts";

const COMMUNE_SPELL_ID = "commune" as const;
const COMMUNE_SPELL_LEVEL = spellSlotLevel(5);
const COMMUNE_NO_ANSWER_CHANCE_PERCENT_PER_REPEAT_CASTING = 25;

export function castCommune(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
}): Result.Result<CharacterSheetCommuneResult, CharacterSheetIssue> {
  const cast = castPreparedSpell({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
    spellId: authoredUnitId(COMMUNE_SPELL_ID),
    spellLevel: COMMUNE_SPELL_LEVEL,
    spellName: "Commune",
    invocation: (spell) => {
      return communeInvocationFromSpell({
        spell: spell,
        previousCastCountSinceLongRest: communeCastCountSinceLongRest(
          input.sheet,
        ),
      });
    },
  });
  if (Result.isFailure(cast)) return Result.fail(cast.failure);
  return Result.succeed({
    sheet: {
      ...cast.success.sheet,
      restFeatureUses: replaceCommuneCastCountSinceLongRest({
        restFeatureUses: cast.success.sheet.restFeatureUses,
        nextCastCount: resourceCount(
          cast.success.invocation.repeatedCasting
            .previousCastCountSinceLongRest + 1,
        ),
      }),
    },
    invocation: cast.success.invocation,
  });
}

function communeInvocationFromSpell(input: {
  readonly spell: CharacterSheetSpellSource;
  readonly previousCastCountSinceLongRest: CharacterSheetCommuneInvocation["repeatedCasting"]["previousCastCountSinceLongRest"];
}): Result.Result<CharacterSheetCommuneInvocation, CharacterSheetIssue> {
  /* v8 ignore start -- @preserve -- The catalog record failed the exact authored level-5 Commune support profile required by this projector. */
  if (
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
  /* v8 ignore stop -- @preserve */
  const directPhase = input.spell.mechanics.phases.find(
    (phase) =>
      phase.kind === "direct" &&
      phase.attachment.kind === "self" &&
      /* v8 ignore next -- @preserve -- Unsupported authored Commune data: the admitted direct phase requires exactly one explicit no-op effect. */
      (phase.effects ?? []).length === 1 &&
      /* v8 ignore next -- @preserve -- Unsupported authored Commune data: omission of that required effect was rejected by the same profile predicate. */
      (phase.effects ?? [])[0]?.kind === "none",
  );
  /* v8 ignore start -- @preserve -- The catalog record has Commune facts but no supported direct self answer phase. */
  if (directPhase === undefined) {
    return characterSheetIssue(
      "Commune requires the supported direct self table-answer profile.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const questionWindow = timeSpanDuration(input.spell.mechanics.duration.value);
  /* v8 ignore start -- @preserve -- The authored Commune question window is always accepted by the elapsed-time parser. */
  if (Result.isFailure(questionWindow)) {
    return characterSheetIssue("Commune requires a supported duration.");
  }
  /* v8 ignore stop -- @preserve */

  return Result.succeed({
    tag: "commune",
    spellId: input.spell.unitId,
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
      window: questionWindow.success,
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
      (
        use,
      ): use is Extract<
        CharacterSheetRestFeatureUse,
        { readonly tag: typeof COMMUNE_CASTING_REST_FEATURE_TAG }
      > => use.tag === COMMUNE_CASTING_REST_FEATURE_TAG,
    )?.castCount ?? resourceCount(0)
  );
}

function replaceCommuneCastCountSinceLongRest(input: {
  readonly restFeatureUses: readonly CharacterSheetRestFeatureUse[];
  readonly nextCastCount: CharacterSheetCommuneInvocation["repeatedCasting"]["previousCastCountSinceLongRest"];
}): readonly CharacterSheetRestFeatureUse[] {
  return [
    ...input.restFeatureUses.filter(
      (use) => use.tag !== COMMUNE_CASTING_REST_FEATURE_TAG,
    ),
    {
      tag: COMMUNE_CASTING_REST_FEATURE_TAG,
      usedSinceLongRest: true,
      castCount: input.nextCastCount,
    },
  ];
}
