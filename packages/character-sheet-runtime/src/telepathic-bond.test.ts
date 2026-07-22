// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.telepathic-bond-session-invocation
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test table-caller.telepathic-bond-communication
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION telepathic_bond
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION telepathic_bond
// UNIT-IDENTITY-REPLAY: L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION telepathic_bond doCastTelepathicBond
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, it, test } from "vitest";

import {
  Either,
  Hp,
  armorClassBuild,
  castTelepathicBond,
  characterSheetId,
  characterSheetTelepathicBondTargetId,
  rebuildCharacterSheetFixture,
  requireRight,
  spellSlotLevel,
  unitLibrary,
} from "./test-support.ts";
import { type CharacterSheetTelepathicBondTarget } from "./sheet-types.ts";

const telepathicBondSelectedIdentityDriverSchema = {
  doCastTelepathicBond: {},
} as const;

type TelepathicBondSelectedIdentityDriverAction =
  keyof typeof telepathicBondSelectedIdentityDriverSchema;

type TelepathicBondSelectedIdentityProjection = {
  readonly spellId: string;
  readonly spellSlotCost: "ordinary";
  readonly slotLevel: number;
  readonly slotExpended: number;
  readonly targetCount: number;
  readonly targetLimit: number;
  readonly durationHours: number;
  readonly sharedLanguageRequired: false;
  readonly otherPlanesExcluded: true;
};

type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly TelepathicBondSelectedIdentityDriverAction[];
  readonly expected: TelepathicBondSelectedIdentityProjection;
};

type SelectedUnitIdentityReplay = {
  readonly taskId: "L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION";
  readonly unitId: "telepathic_bond";
  readonly actions: readonly TelepathicBondSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION",
    unitId: "telepathic_bond",
    actions: ["doCastTelepathicBond"],
    sequences: [
      {
        name: "selected-telepathic-bond-slot-cast-returns-same-plane-link-contract",
        actions: ["doCastTelepathicBond"],
        expected: expectedTelepathicBondProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Character Sheet runtime / Telepathic Bond", () => {
  it("replays selected Unit identities deterministically", () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<TelepathicBondSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        let projection: TelepathicBondSelectedIdentityProjection | undefined;

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          projection = telepathicBondSelectedIdentityActions[actionName]();
        }

        expect(projection, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  test("Telepathic Bond spends a level-5 prepared spell slot and returns a same-plane communication link contract", () => {
    const result = requireRight(
      castTelepathicBond({
        sheet: telepathicBondBardSheet({
          preparedSpells: ["telepathic_bond"],
          slots: 1,
        }),
        unitLibrary,
        targets: telepathicBondTargets(3),
      }),
    );

    expect(result.invocation).toEqual({
      tag: "telepathicBond",
      spellId: "telepathic_bond",
      spellLevel: 5,
      spellSlotCost: { kind: "ordinary", spellLevel: spellSlotLevel(5) },
      preparationRequirement: "prepared",
      requiredSpellAccess: "class_prepared",
      ritualAvailable: true,
      rangeFeet: 30,
      targetLimit: 8,
      duration: { kind: "timeSpan", unit: "hour", amount: 1 },
      targets: telepathicBondTargets(3),
      communication: {
        answerOwner: "session",
        sharedLanguageRequired: false,
        distanceLimit: "any_distance_same_plane",
        otherPlanesExcluded: true,
      },
    });
    expect(result.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 1 },
    ]);
  });

  test("Telepathic Bond rejects empty, over-limit, and duplicate target sets before spending the spell slot", () => {
    const sheet = telepathicBondBardSheet({
      preparedSpells: ["telepathic_bond"],
      slots: 1,
    });
    const empty = castTelepathicBond({ sheet, unitLibrary, targets: [] });
    expect(Either.isLeft(empty)).toBe(true);
    if (Either.isLeft(empty)) {
      expect(empty.left.message).toBe(
        "Telepathic Bond requires at least one target.",
      );
    }

    const overLimit = castTelepathicBond({
      sheet,
      unitLibrary,
      targets: telepathicBondTargets(9),
    });
    expect(Either.isLeft(overLimit)).toBe(true);
    if (Either.isLeft(overLimit)) {
      expect(overLimit.left.message).toBe(
        "Telepathic Bond supports up to eight willing targets.",
      );
    }

    const duplicateTarget = telepathicBondTargets(1)[0];
    const duplicate = castTelepathicBond({
      sheet,
      unitLibrary,
      targets: [duplicateTarget, duplicateTarget],
    });
    expect(Either.isLeft(duplicate)).toBe(true);
    if (Either.isLeft(duplicate)) {
      expect(duplicate.left.message).toBe(
        "Telepathic Bond requires unique target ids.",
      );
    }
    expect(sheet.spellSlotExpenditures).toEqual([]);
  });

  test("Telepathic Bond requires prepared class Spell Access", () => {
    const result = castTelepathicBond({
      sheet: telepathicBondBardSheet({ preparedSpells: [], slots: 1 }),
      unitLibrary,
      targets: telepathicBondTargets(2),
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe(
        "Telepathic Bond requires prepared class Spell Access.",
      );
    }
  });
});

const telepathicBondSelectedIdentityActions = {
  doCastTelepathicBond: () => {
    const result = requireRight(
      castTelepathicBond({
        sheet: telepathicBondBardSheet({
          preparedSpells: ["telepathic_bond"],
          slots: 1,
        }),
        unitLibrary,
        targets: telepathicBondTargets(3),
      }),
    );
    return {
      spellId: result.invocation.spellId,
      spellSlotCost: result.invocation.spellSlotCost.kind,
      slotLevel: result.invocation.spellSlotCost.spellLevel,
      slotExpended:
        (result.sheet.spellSlotExpenditures ?? []).find(
          (slot) => slot.spellLevel === spellSlotLevel(5),
        )?.expended ?? 0,
      targetCount: result.invocation.targets.length,
      targetLimit: result.invocation.targetLimit,
      durationHours: result.invocation.duration.amount,
      sharedLanguageRequired:
        result.invocation.communication.sharedLanguageRequired,
      otherPlanesExcluded: result.invocation.communication.otherPlanesExcluded,
    };
  },
} as const satisfies Record<
  TelepathicBondSelectedIdentityDriverAction,
  () => TelepathicBondSelectedIdentityProjection
>;

function expectedTelepathicBondProjection(): TelepathicBondSelectedIdentityProjection {
  return {
    spellId: "telepathic_bond",
    spellSlotCost: "ordinary",
    slotLevel: 5,
    slotExpended: 1,
    targetCount: 3,
    targetLimit: 8,
    durationHours: 1,
    sharedLanguageRequired: false,
    otherPlanesExcluded: true,
  };
}

function telepathicBondTargets(
  count: number,
): readonly CharacterSheetTelepathicBondTarget[] {
  return Array.from(
    { length: count },
    (_, index) =>
      ({
        targetId: requireRight(
          characterSheetTelepathicBondTargetId(
            `telepathic-bond-target:${index + 1}`,
          ),
        ),
        willing: true,
        withinRangeFeet: 30,
        canCommunicateInLanguage: true,
        plane: "same_plane_as_caster",
      }) as const,
  );
}

function telepathicBondBardSheet(input: {
  readonly preparedSpells: readonly string[];
  readonly slots: number;
}) {
  return requireRight(
    rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:telepathic-bond-bard-9"),
      build: {
        ...armorClassBuild({
          startingClass: "class_bard",
          advancements: Array.from({ length: 8 }, () => "class_bard"),
        }),
        spellcasting: {
          sources: [
            {
              sourceUnitId: authoredUnitId("class_bard"),
              spellcastingAbility: "cha",
              cantrips: [
                authoredUnitId("mage_hand"),
                authoredUnitId("minor_illusion"),
                authoredUnitId("vicious_mockery"),
              ],
              spellbook: [],
              preparedSpells: input.preparedSpells.map(authoredUnitId),
              spellcastingFocuses: ["musical_instrument"],
            },
          ],
          slotPools: {
            spellcasting: {
              kind: "spellcasting",
              slots: [{ spellLevel: 5, count: input.slots }],
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
