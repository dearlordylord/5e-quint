// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.commune-session-invocation
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test table-caller.planar-entity-answers
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION commune
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION commune
// UNIT-IDENTITY-REPLAY: L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION commune doCastCommune doCastCommuneRepeatedBeforeLongRest
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, it, test } from "vitest";

import {
  Result,
  Hp,
  armorClassBuild,
  castCommune,
  characterSheetId,
  parseCharacterSheet,
  completeLongRest,
  rebuildCharacterSheetFixture,
  requireSuccess,
  spellSlotLevel,
  unitLibrary,
} from "./test-support.test-support.ts";

type CommuneSelectedIdentityDriverAction =
  | "doCastCommune"
  | "doCastCommuneRepeatedBeforeLongRest";

type CommuneSelectedIdentityProjection = {
  readonly spellId: string;
  readonly spellSlotCost: "ordinary";
  readonly slotLevel: number;
  readonly slotExpended: number;
  readonly previousCastCountSinceLongRest: number;
  readonly noAnswerChancePercent: number;
  readonly questionCount: number;
  readonly answerOwner: "gm";
};

type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly CommuneSelectedIdentityDriverAction[];
  readonly expected: CommuneSelectedIdentityProjection;
};

type SelectedUnitIdentityReplay = {
  readonly taskId: "L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION";
  readonly unitId: "commune";
  readonly actions: readonly CommuneSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION",
    unitId: "commune",
    actions: ["doCastCommune", "doCastCommuneRepeatedBeforeLongRest"],
    sequences: [
      {
        name: "selected-commune-slot-cast-returns-gm-answer-contract",
        actions: ["doCastCommune"],
        expected: expectedCommuneProjection({
          slotExpended: 1,
          previousCastCountSinceLongRest: 0,
          noAnswerChancePercent: 0,
        }),
      },
      {
        name: "selected-commune-repeat-before-long-rest-projects-no-answer-chance",
        actions: ["doCastCommuneRepeatedBeforeLongRest"],
        expected: expectedCommuneProjection({
          slotExpended: 2,
          previousCastCountSinceLongRest: 1,
          noAnswerChancePercent: 25,
        }),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Character Sheet runtime / Commune", () => {
  it("replays selected Unit identities deterministically", () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions = new Set<CommuneSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        let projection: CommuneSelectedIdentityProjection | undefined;

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          projection = communeSelectedIdentityActions[actionName]();
        }

        expect(projection, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  test("Commune spends a level-5 prepared spell slot and returns table-facing divine answer facts", () => {
    const sheet = communeClericSheet();
    const first = requireSuccess(castCommune({ sheet, unitLibrary }));

    expect(first.invocation).toEqual({
      tag: "commune",
      spellId: "commune",
      spellLevel: 5,
      spellSlotCost: { kind: "ordinary", spellLevel: spellSlotLevel(5) },
      preparationRequirement: "prepared",
      requiredSpellAccess: "class_prepared",
      questions: {
        count: 3,
        answerOwner: "gm",
        primaryAnswer: "yes_no",
        unknownAnswer: "unclear",
        misleadingAnswerFallback: "short_phrase_if_one_word_misleading",
        window: { kind: "timeSpan", unit: "minute", amount: 1 },
      },
      repeatedCasting: {
        previousCastCountSinceLongRest: 0,
        noAnswerChancePercent: 0,
      },
    });
    expect(first.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 1 },
    ]);
    expect(first.sheet.restFeatureUses).toEqual([
      {
        tag: "communeCastingSinceLongRest",
        usedSinceLongRest: true,
        castCount: 1,
      },
    ]);
    expect(
      requireSuccess(parseCharacterSheet(first.sheet, unitLibrary))
        .restFeatureUses,
    ).toEqual(first.sheet.restFeatureUses);

    const second = requireSuccess(
      castCommune({ sheet: first.sheet, unitLibrary }),
    );
    expect(second.invocation.repeatedCasting).toEqual({
      previousCastCountSinceLongRest: 1,
      noAnswerChancePercent: 25,
    });
    expect(second.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 2 },
    ]);
    expect(second.sheet.restFeatureUses).toEqual([
      {
        tag: "communeCastingSinceLongRest",
        usedSinceLongRest: true,
        castCount: 2,
      },
    ]);

    const third = castCommune({ sheet: second.sheet, unitLibrary });
    expect(Result.isFailure(third)).toBe(true);
    if (Result.isFailure(third)) {
      expect(third.failure.message).toBe(
        "Spell Slot spend requires an unexpended ordinary Spell Slot.",
      );
    }

    const rested = requireSuccess(
      completeLongRest({ sheet: second.sheet, unitLibrary }),
    );
    expect(rested.spellSlotExpenditures).toEqual([]);
    expect(rested.restFeatureUses).toEqual([]);
    const afterRest = requireSuccess(
      castCommune({ sheet: rested, unitLibrary }),
    );
    expect(afterRest.invocation.repeatedCasting).toEqual({
      previousCastCountSinceLongRest: 0,
      noAnswerChancePercent: 0,
    });
  });
});

const communeSelectedIdentityActions = {
  doCastCommune: () => projectCommuneInvocation(1),
  doCastCommuneRepeatedBeforeLongRest: () => projectCommuneInvocation(2),
} as const satisfies Record<
  CommuneSelectedIdentityDriverAction,
  () => CommuneSelectedIdentityProjection
>;

function projectCommuneInvocation(
  castCount: 1 | 2,
): CommuneSelectedIdentityProjection {
  const first = requireSuccess(
    castCommune({ sheet: communeClericSheet(), unitLibrary }),
  );
  const result =
    castCount === 1
      ? first
      : requireSuccess(castCommune({ sheet: first.sheet, unitLibrary }));
  return {
    spellId: result.invocation.spellId,
    spellSlotCost: result.invocation.spellSlotCost.kind,
    slotLevel: result.invocation.spellSlotCost.spellLevel,
    slotExpended:
      (result.sheet.spellSlotExpenditures ?? []).find(
        (slot) => slot.spellLevel === spellSlotLevel(5),
      )?.expended ?? 0,
    previousCastCountSinceLongRest:
      result.invocation.repeatedCasting.previousCastCountSinceLongRest,
    noAnswerChancePercent:
      result.invocation.repeatedCasting.noAnswerChancePercent,
    questionCount: result.invocation.questions.count,
    answerOwner: result.invocation.questions.answerOwner,
  };
}

function expectedCommuneProjection(input: {
  readonly slotExpended: number;
  readonly previousCastCountSinceLongRest: number;
  readonly noAnswerChancePercent: number;
}): CommuneSelectedIdentityProjection {
  return {
    spellId: "commune",
    spellSlotCost: "ordinary",
    slotLevel: 5,
    questionCount: 3,
    answerOwner: "gm",
    ...input,
  };
}

function communeClericSheet() {
  return requireSuccess(
    rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:commune-cleric-9"),
      build: {
        ...armorClassBuild({
          startingClass: "class_cleric",
          advancements: Array.from({ length: 8 }, () => "class_cleric"),
        }),
        spellcasting: {
          sources: [
            {
              sourceUnitId: authoredUnitId("class_cleric"),
              spellcastingAbility: "wis",
              cantrips: [
                authoredUnitId("guidance"),
                authoredUnitId("sacred_flame"),
                authoredUnitId("thaumaturgy"),
              ],
              spellbook: [],
              preparedSpells: [
                authoredUnitId("bless"),
                authoredUnitId("cure_wounds"),
                authoredUnitId("guiding_bolt"),
                authoredUnitId("spiritual_weapon"),
                authoredUnitId("lesser_restoration"),
                authoredUnitId("beacon_of_hope"),
                authoredUnitId("dispel_magic"),
                authoredUnitId("death_ward"),
                authoredUnitId("commune"),
              ],
              spellcastingFocuses: ["holy_symbol"],
            },
          ],
          slotPools: {
            spellcasting: {
              kind: "spellcasting",
              slots: [{ spellLevel: 5, count: 2 }],
            },
          },
        },
      },
      currentHp: Hp(57),
      tempHp: Hp(0),
      unitLibrary,
    }),
  );
}
