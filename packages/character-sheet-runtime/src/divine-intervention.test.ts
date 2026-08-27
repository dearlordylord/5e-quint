// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.cleric-divine-intervention-session-invocation
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.class-feature-use-count-resource
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L110C-03-DIVINE-INTERVENTION-SESSION cleric_divine_intervention flame_strike
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L110C-03-DIVINE-INTERVENTION-SESSION cleric_divine_intervention flame_strike
// UNIT-IDENTITY-REPLAY: L110C-03-DIVINE-INTERVENTION-SESSION cleric_divine_intervention doUseClericDivineIntervention
// UNIT-IDENTITY-REPLAY: L110C-03-DIVINE-INTERVENTION-SESSION flame_strike doCastFlameStrikeThroughDivineIntervention
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, it, test } from "vitest";
import { classSpellListPreparedSpellLevel } from "@dnd/surface/surface/unit-catalog";

import {
  Result,
  Hp,
  armorClassBuild,
  castDivineIntervention,
  characterSheetId,
  characterSheetResources,
  characterSheetSpellSlots,
  completeLongRest,
  rebuildCharacterSheetFixture,
  requireSuccess,
  spellSlotLevel,
  unitLibrary,
} from "./test-support.test-support.ts";

type DivineInterventionSelectedIdentityDriverAction =
  | "doUseClericDivineIntervention"
  | "doCastFlameStrikeThroughDivineIntervention";

type DivineInterventionSelectedIdentityProjection = {
  readonly spellId: string;
  readonly featureUnitId: string;
  readonly activationAction: "magic";
  readonly spellSlotCost: "none";
  readonly materialComponentsSuppressed: true;
  readonly resourceExpended: number;
};

type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly DivineInterventionSelectedIdentityDriverAction[];
  readonly expected: DivineInterventionSelectedIdentityProjection;
};

type SelectedUnitIdentityReplay = {
  readonly taskId: "L110C-03-DIVINE-INTERVENTION-SESSION";
  readonly unitId: "cleric_divine_intervention" | "flame_strike";
  readonly actions: readonly DivineInterventionSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L110C-03-DIVINE-INTERVENTION-SESSION",
    unitId: "cleric_divine_intervention",
    actions: ["doUseClericDivineIntervention"],
    sequences: [
      {
        name: "selected-cleric-divine-intervention-free-casts-a-cleric-spell",
        actions: ["doUseClericDivineIntervention"],
        expected: expectedDivineInterventionProjection(),
      },
    ],
  },
  {
    taskId: "L110C-03-DIVINE-INTERVENTION-SESSION",
    unitId: "flame_strike",
    actions: ["doCastFlameStrikeThroughDivineIntervention"],
    sequences: [
      {
        name: "selected-flame-strike-is-handed-off-through-divine-intervention",
        actions: ["doCastFlameStrikeThroughDivineIntervention"],
        expected: expectedDivineInterventionProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Character Sheet runtime / Divine Intervention", () => {
  it("replays selected Unit identities deterministically", () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<DivineInterventionSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        let projection:
          | DivineInterventionSelectedIdentityProjection
          | undefined;

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          projection = divineInterventionSelectedIdentityActions[actionName]();
        }

        expect(projection, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  test("casts an action-time Cleric spell through Divine Intervention without slots or Material components", () => {
    const sheet = divineInterventionClericSheet();

    expect(requireSuccess(characterSheetResources(sheet, unitLibrary))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          unitId: authoredUnitId("cleric_divine_intervention"),
          tag: "useCountResource",
          count: 1,
          expended: 0,
        }),
      ]),
    );

    const result = requireSuccess(
      castDivineIntervention({
        sheet,
        unitLibrary,
        spellId: authoredUnitId("flame_strike"),
      }),
    );

    expect(result.invocation).toEqual({
      tag: "divineIntervention",
      spellId: "flame_strike",
      spellLevel: 5,
      featureUnitId: "cleric_divine_intervention",
      spellList: "cleric",
      activationAction: "magic",
      spellSlotCost: { kind: "none" },
      materialComponentRequirement: {
        kind: "not_required_by_feature",
        suppressesSpellMaterialComponents: true,
      },
      preparationRequirement: "not_required",
      requiredSpellAccess: "class_spell_list",
      castingTime: { kind: "action" },
    });
    expect(characterSheetSpellSlots(result.sheet)).toEqual(
      characterSheetSpellSlots(sheet),
    );
    expect(result.sheet.resourceExpenditures).toEqual([
      {
        tag: "useCountResource",
        unitId: authoredUnitId("cleric_divine_intervention"),
        expended: 1,
      },
    ]);

    const secondUse = castDivineIntervention({
      sheet: result.sheet,
      unitLibrary,
      spellId: authoredUnitId("flame_strike"),
    });
    expect(Result.isFailure(secondUse)).toBe(true);
    if (Result.isFailure(secondUse)) {
      expect(secondUse.failure.message).toBe(
        "Divine Intervention cannot be used again until a Long Rest.",
      );
    }

    const rested = requireSuccess(
      completeLongRest({ sheet: result.sheet, unitLibrary }),
    );
    expect(rested.resourceExpenditures).toEqual([]);
    expect(
      Result.isSuccess(
        castDivineIntervention({
          sheet: rested,
          unitLibrary,
          spellId: authoredUnitId("flame_strike"),
        }),
      ),
    ).toBe(true);
  });

  test("admits an installed level-5 Cleric spell from the canonical class list", () => {
    expect(
      classSpellListPreparedSpellLevel({
        className: "cleric",
        spellId: authoredUnitId("contagion"),
        unitLibrary,
      }),
    ).toBe(5);

    const invocation = requireSuccess(
      castDivineIntervention({
        sheet: divineInterventionClericSheet(),
        unitLibrary,
        spellId: authoredUnitId("contagion"),
      }),
    ).invocation;

    expect(invocation).toMatchObject({
      spellId: "contagion",
      spellLevel: 5,
      spellList: "cleric",
    });
  });

  test("admits an action-time Cleric cantrip without a Spell Slot", () => {
    const invocation = requireSuccess(
      castDivineIntervention({
        sheet: divineInterventionClericSheet(),
        unitLibrary,
        spellId: authoredUnitId("sacred_flame"),
      }),
    ).invocation;

    expect(invocation).toMatchObject({
      spellId: "sacred_flame",
      spellLevel: 0,
      spellSlotCost: { kind: "none" },
    });
  });

  test("rejects non-action or non-Cleric spell handoffs", () => {
    const sheet = divineInterventionClericSheet();

    const nonActionClericSpell = castDivineIntervention({
      sheet,
      unitLibrary,
      spellId: authoredUnitId("raise_dead"),
    });
    expect(Result.isFailure(nonActionClericSpell)).toBe(true);
    if (Result.isFailure(nonActionClericSpell)) {
      expect(nonActionClericSpell.failure.message).toBe(
        "Divine Intervention session handoff supports action-time Cleric spells.",
      );
    }

    const nonClericReactionSpell = castDivineIntervention({
      sheet,
      unitLibrary,
      spellId: authoredUnitId("counterspell"),
    });
    expect(Result.isFailure(nonClericReactionSpell)).toBe(true);
    if (Result.isFailure(nonClericReactionSpell)) {
      expect(nonClericReactionSpell.failure.message).toBe(
        "Divine Intervention requires a Cleric spell of level 5 or lower.",
      );
    }
  });

  test("rejects a sheet without the Divine Intervention feature", () => {
    const sheet = requireSuccess(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId(
          "character:synthetic-no-divine-intervention",
        ),
        build: armorClassBuild({ startingClass: "class_fighter" }),
        currentHp: Hp(11),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );

    const result = castDivineIntervention({
      sheet,
      unitLibrary,
      spellId: authoredUnitId("sacred_flame"),
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure.message).toBe(
        "Divine Intervention requires the Cleric Divine Intervention feature.",
      );
    }
  });
});

const divineInterventionSelectedIdentityActions = {
  doUseClericDivineIntervention: projectDivineInterventionInvocation,
  doCastFlameStrikeThroughDivineIntervention:
    projectDivineInterventionInvocation,
} as const satisfies Record<
  DivineInterventionSelectedIdentityDriverAction,
  () => DivineInterventionSelectedIdentityProjection
>;

function projectDivineInterventionInvocation(): DivineInterventionSelectedIdentityProjection {
  const result = requireSuccess(
    castDivineIntervention({
      sheet: divineInterventionClericSheet(),
      unitLibrary,
      spellId: authoredUnitId("flame_strike"),
    }),
  );
  return {
    spellId: result.invocation.spellId,
    featureUnitId: result.invocation.featureUnitId,
    activationAction: result.invocation.activationAction,
    spellSlotCost: result.invocation.spellSlotCost.kind,
    materialComponentsSuppressed:
      result.invocation.materialComponentRequirement
        .suppressesSpellMaterialComponents,
    resourceExpended:
      result.sheet.resourceExpenditures.find(
        (expenditure) =>
          expenditure.tag === "useCountResource" &&
          expenditure.unitId === result.invocation.featureUnitId,
      )?.expended ?? 0,
  };
}

function expectedDivineInterventionProjection(): DivineInterventionSelectedIdentityProjection {
  return {
    spellId: "flame_strike",
    featureUnitId: "cleric_divine_intervention",
    activationAction: "magic",
    spellSlotCost: "none",
    materialComponentsSuppressed: true,
    resourceExpended: 1,
  };
}

function divineInterventionClericSheet() {
  return requireSuccess(
    rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:divine-intervention-cleric-10"),
      build: {
        ...armorClassBuild({
          startingClass: "class_cleric",
          advancements: Array.from({ length: 9 }, () => "class_cleric"),
        }),
        spellcasting: {
          sources: [
            {
              sourceUnitId: authoredUnitId("class_cleric"),
              spellcastingAbility: "wis",
              cantrips: [
                authoredUnitId("guidance"),
                authoredUnitId("light"),
                authoredUnitId("mending"),
                authoredUnitId("resistance"),
                authoredUnitId("sacred_flame"),
              ],
              spellbook: [],
              preparedSpells: [
                authoredUnitId("bless"),
                authoredUnitId("spirit_guardians"),
              ],
              spellcastingFocuses: ["holy_symbol"],
            },
          ],
          slotPools: {
            spellcasting: {
              kind: "spellcasting",
              slots: [
                { spellLevel: spellSlotLevel(1), count: 4 },
                { spellLevel: spellSlotLevel(2), count: 3 },
                { spellLevel: spellSlotLevel(3), count: 3 },
                { spellLevel: spellSlotLevel(4), count: 3 },
                { spellLevel: spellSlotLevel(5), count: 2 },
              ],
            },
          },
        },
      },
      currentHp: Hp(63),
      tempHp: Hp(0),
      unitLibrary,
    }),
  );
}
