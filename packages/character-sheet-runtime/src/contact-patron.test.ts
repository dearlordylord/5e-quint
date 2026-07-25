// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.contact-patron-session-invocation
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.class-feature-spell-free-cast-resource
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test table-caller.planar-entity-answers
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19C-04-CONTACT-PATRON-SHEET-SESSION warlock_contact_patron contact_other_plane
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L19C-04-CONTACT-PATRON-SHEET-SESSION warlock_contact_patron contact_other_plane
// UNIT-IDENTITY-REPLAY: L19C-04-CONTACT-PATRON-SHEET-SESSION warlock_contact_patron doCastWarlockContactPatron
// UNIT-IDENTITY-REPLAY: L19C-04-CONTACT-PATRON-SHEET-SESSION contact_other_plane doCastContactOtherPlaneThroughContactPatron
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, it, test } from "vitest";

import {
  Either,
  Hp,
  armorClassBuild,
  castContactPatron,
  characterSheetClassFeaturePreparedSpellAccessesForBuild,
  characterSheetId,
  characterSheetResources,
  completeLongRest,
  contactPatronSessionInvocationTestName,
  rebuildCharacterSheetFixture,
  requireRight,
  unitLibrary,
} from "./test-support.ts";

type ContactPatronSelectedIdentityDriverAction =
  | "doCastWarlockContactPatron"
  | "doCastContactOtherPlaneThroughContactPatron";

type ContactPatronSelectedIdentityProjection = {
  readonly spellId: string;
  readonly featureUnitId: string;
  readonly spellSlotCost: "none";
  readonly resourceExpended: number;
  readonly savingThrowOutcome: "automatic_success";
  readonly questionCount: number;
};

type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly ContactPatronSelectedIdentityDriverAction[];
  readonly expected: ContactPatronSelectedIdentityProjection;
};

type SelectedUnitIdentityReplay = {
  readonly taskId: "L19C-04-CONTACT-PATRON-SHEET-SESSION";
  readonly unitId: "warlock_contact_patron" | "contact_other_plane";
  readonly actions: readonly ContactPatronSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L19C-04-CONTACT-PATRON-SHEET-SESSION",
    unitId: "warlock_contact_patron",
    actions: ["doCastWarlockContactPatron"],
    sequences: [
      {
        name: "selected-warlock-contact-patron-free-casts-contact-other-plane",
        actions: ["doCastWarlockContactPatron"],
        expected: expectedContactPatronProjection(),
      },
    ],
  },
  {
    taskId: "L19C-04-CONTACT-PATRON-SHEET-SESSION",
    unitId: "contact_other_plane",
    actions: ["doCastContactOtherPlaneThroughContactPatron"],
    sequences: [
      {
        name: "selected-contact-other-plane-is-invoked-through-contact-patron",
        actions: ["doCastContactOtherPlaneThroughContactPatron"],
        expected: expectedContactPatronProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Character Sheet runtime / Contact Patron", () => {
  it("replays selected Unit identities deterministically", () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<ContactPatronSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        let projection: ContactPatronSelectedIdentityProjection | undefined;

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          projection = contactPatronSelectedIdentityActions[actionName]();
        }

        expect(projection, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  test(contactPatronSessionInvocationTestName, () => {
    const sheet = requireRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:contact-patron-warlock-9"),
        build: {
          ...armorClassBuild({
            startingClass: "class_warlock",
            advancements: Array.from({ length: 8 }, () => "class_warlock"),
            features: [
              {
                kind: "selectedClassChoice",
                selectedFromUnitId: authoredUnitId("class_warlock"),
                unitId: authoredUnitId("subclass_warlock_fiend_patron"),
              },
            ],
          }),
          spellcasting: {
            sources: [
              {
                sourceUnitId: authoredUnitId("class_warlock"),
                spellcastingAbility: "cha",
                cantrips: [
                  authoredUnitId("chill_touch"),
                  authoredUnitId("eldritch_blast"),
                  authoredUnitId("minor_illusion"),
                ],
                spellbook: [],
                preparedSpells: [
                  authoredUnitId("charm_person"),
                  authoredUnitId("hellish_rebuke"),
                  authoredUnitId("hex"),
                  authoredUnitId("hold_person"),
                  authoredUnitId("invisibility"),
                  authoredUnitId("mirror_image"),
                  authoredUnitId("counterspell"),
                  authoredUnitId("dispel_magic"),
                  authoredUnitId("fear"),
                  authoredUnitId("fly"),
                ],
                spellcastingFocuses: ["arcane_focus"],
              },
            ],
            slotPools: {
              pactMagic: {
                kind: "pactMagic",
                slotLevel: 5,
                count: 2,
              },
            },
          },
        },
        currentHp: Hp(52),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );

    expect(
      characterSheetClassFeaturePreparedSpellAccessesForBuild({
        build: sheet.build,
        unitLibrary,
      }),
    ).toEqual(
      expect.arrayContaining([
        {
          sourceUnitId: authoredUnitId("warlock_contact_patron"),
          spellIds: ["contact_other_plane"],
        },
      ]),
    );
    expect(characterSheetResources(sheet, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        {
          unitId: authoredUnitId("warlock_contact_patron"),
          tag: "contactPatronContactOtherPlaneFreeCast",
          count: 1,
          expended: 0,
        },
      ]),
    });

    const result = requireRight(castContactPatron({ sheet, unitLibrary }));

    expect(result.invocation).toMatchObject({
      tag: "contactPatron",
      spellId: "contact_other_plane",
      spellLevel: 5,
      featureUnitId: "warlock_contact_patron",
      spellSlotCost: { kind: "none" },
      preparationRequirement: "prepared",
      requiredSpellAccess: "class_feature",
      savingThrow: {
        ability: "int",
        dc: 15,
        outcome: "automatic_success",
        scope: "patron_contact",
      },
      questions: {
        count: 5,
        answerOwner: "gm",
        primaryAnswer: "one_word",
        unknownAnswer: "unclear",
        misleadingAnswerFallback: "short_phrase_if_one_word_misleading",
        window: { kind: "timeSpan", unit: "minute", amount: 1 },
      },
    });
    expect(result.sheet.pactSlotExpenditure).toBeUndefined();
    expect(result.sheet.resourceExpenditures).toEqual([
      {
        tag: "contactPatronContactOtherPlaneFreeCast",
        expended: 1,
      },
    ]);

    const secondUse = castContactPatron({
      sheet: result.sheet,
      unitLibrary,
    });
    expect(Either.isLeft(secondUse)).toBe(true);
    if (Either.isLeft(secondUse)) {
      expect(secondUse.left.message).toBe(
        "Contact Patron cannot be used again until a Long Rest.",
      );
    }

    const rested = requireRight(
      completeLongRest({ sheet: result.sheet, unitLibrary }),
    );
    expect(rested.resourceExpenditures).toEqual([]);
    expect(
      Either.isRight(castContactPatron({ sheet: rested, unitLibrary })),
    ).toBe(true);
  });
});

const contactPatronSelectedIdentityActions = {
  doCastWarlockContactPatron: projectContactPatronInvocation,
  doCastContactOtherPlaneThroughContactPatron: projectContactPatronInvocation,
} as const satisfies Record<
  ContactPatronSelectedIdentityDriverAction,
  () => ContactPatronSelectedIdentityProjection
>;

function projectContactPatronInvocation(): ContactPatronSelectedIdentityProjection {
  const result = requireRight(
    castContactPatron({
      sheet: contactPatronWarlockSheet(),
      unitLibrary,
    }),
  );
  return {
    spellId: result.invocation.spellId,
    featureUnitId: result.invocation.featureUnitId,
    spellSlotCost: result.invocation.spellSlotCost.kind,
    resourceExpended:
      result.sheet.resourceExpenditures.find(
        (expenditure) =>
          expenditure.tag === result.invocation.freeCastResourceTag,
      )?.expended ?? 0,
    savingThrowOutcome: result.invocation.savingThrow.outcome,
    questionCount: result.invocation.questions.count,
  };
}

function expectedContactPatronProjection(): ContactPatronSelectedIdentityProjection {
  return {
    spellId: "contact_other_plane",
    featureUnitId: "warlock_contact_patron",
    spellSlotCost: "none",
    resourceExpended: 1,
    savingThrowOutcome: "automatic_success",
    questionCount: 5,
  };
}

function contactPatronWarlockSheet() {
  return requireRight(
    rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:contact-patron-warlock-9"),
      build: {
        ...armorClassBuild({
          startingClass: "class_warlock",
          advancements: Array.from({ length: 8 }, () => "class_warlock"),
          features: [
            {
              kind: "selectedClassChoice",
              selectedFromUnitId: authoredUnitId("class_warlock"),
              unitId: authoredUnitId("subclass_warlock_fiend_patron"),
            },
          ],
        }),
        spellcasting: {
          sources: [
            {
              sourceUnitId: authoredUnitId("class_warlock"),
              spellcastingAbility: "cha",
              cantrips: [
                authoredUnitId("chill_touch"),
                authoredUnitId("eldritch_blast"),
                authoredUnitId("minor_illusion"),
              ],
              spellbook: [],
              preparedSpells: [
                authoredUnitId("charm_person"),
                authoredUnitId("hellish_rebuke"),
                authoredUnitId("hex"),
                authoredUnitId("hold_person"),
                authoredUnitId("invisibility"),
                authoredUnitId("mirror_image"),
                authoredUnitId("counterspell"),
                authoredUnitId("dispel_magic"),
                authoredUnitId("fear"),
                authoredUnitId("fly"),
              ],
              spellcastingFocuses: ["arcane_focus"],
            },
          ],
          slotPools: {
            pactMagic: {
              kind: "pactMagic",
              slotLevel: 5,
              count: 2,
            },
          },
        },
      },
      currentHp: Hp(52),
      tempHp: Hp(0),
      unitLibrary,
    }),
  );
}
