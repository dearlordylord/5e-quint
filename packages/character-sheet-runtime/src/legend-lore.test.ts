// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.legend-lore-session-invocation
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test table-caller.legend-lore-summary
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION legend_lore
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION legend_lore
// UNIT-IDENTITY-REPLAY: L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION legend_lore doCastLegendLore
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, it, test } from "vitest";

import {
  Result,
  Hp,
  armorClassBuild,
  castLegendLore,
  characterSheetId,
  completedLegendLoreCasting,
  rebuildCharacterSheetFixture,
  requireRight,
  spellSlotLevel,
  unitLibrary,
} from "./test-support.test-support.ts";

type LegendLoreSelectedIdentityDriverAction = "doCastLegendLore";

type LegendLoreSelectedIdentityProjection = {
  readonly spellId: string;
  readonly spellSlotCost: "ordinary";
  readonly slotLevel: number;
  readonly slotExpended: number;
  readonly castingTimeMinutes: number;
  readonly consumedIncenseCostGp: number;
  readonly ivoryStripCount: number;
  readonly answerOwner: "gm";
  readonly loreTag: "gmSummary" | "notFamousFailure";
};

type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly LegendLoreSelectedIdentityDriverAction[];
  readonly expected: LegendLoreSelectedIdentityProjection;
};

type SelectedUnitIdentityReplay = {
  readonly taskId: "L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION";
  readonly unitId: "legend_lore";
  readonly actions: readonly LegendLoreSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION",
    unitId: "legend_lore",
    actions: ["doCastLegendLore"],
    sequences: [
      {
        name: "selected-legend-lore-slot-cast-returns-gm-summary-contract",
        actions: ["doCastLegendLore"],
        expected: expectedLegendLoreProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Character Sheet runtime / Legend Lore", () => {
  it("replays selected Unit identities deterministically", () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions = new Set<LegendLoreSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        let projection: LegendLoreSelectedIdentityProjection | undefined;

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          projection = legendLoreSelectedIdentityActions[actionName]();
        }

        expect(projection, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  test("Legend Lore spends a level-5 prepared spell slot and returns a GM-owned lore summary contract", () => {
    const sheet = legendLoreClericSheet({
      preparedSpells: ["legend_lore"],
      slots: 1,
    });
    const result = requireRight(
      castLegendLore({
        sheet,
        unitLibrary,
        subject: famousLegendLoreSubject,
        casting: completedLegendLoreCasting,
      }),
    );

    expect(result.invocation).toEqual({
      tag: "legendLore",
      spellId: "legend_lore",
      spellLevel: 5,
      spellSlotCost: { kind: "ordinary", spellLevel: spellSlotLevel(5) },
      preparationRequirement: "prepared",
      requiredSpellAccess: "class_prepared",
      castingTime: { kind: "minutes", amount: 10 },
      materialComponents: {
        consumedIncenseCostGp: 250,
        ivoryStripCount: 4,
        ivoryStripCostGpEach: 50,
      },
      subject: famousLegendLoreSubject,
      lore: {
        tag: "gmSummary",
        answerOwner: "gm",
        accuracy: "accurate",
        expression: "literal_or_figurative_poetic",
        precisionBasis: "some",
      },
    });
    expect(result.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 1 },
    ]);

    const second = castLegendLore({
      sheet: result.sheet,
      unitLibrary,
      subject: famousLegendLoreSubject,
      casting: completedLegendLoreCasting,
    });
    expect(Result.isFailure(second)).toBe(true);
    if (Result.isFailure(second)) {
      expect(second.failure.message).toBe(
        "Spell Slot spend requires an unexpended ordinary Spell Slot.",
      );
    }
  });

  test("Legend Lore returns the not-famous failure outcome after spending the spell slot", () => {
    const result = requireRight(
      castLegendLore({
        sheet: legendLoreClericSheet({
          preparedSpells: ["legend_lore"],
          slots: 1,
        }),
        unitLibrary,
        subject: {
          tag: "notFamous",
          subjectKind: "object",
          description: "a locally ordinary pewter spoon",
        },
        casting: completedLegendLoreCasting,
      }),
    );

    expect(result.invocation.lore).toEqual({
      tag: "notFamousFailure",
      answerOwner: "gm",
      signal: "sad_trombone_notes",
    });
    expect(result.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 1 },
    ]);
  });

  test("Legend Lore requires prepared class Spell Access", () => {
    const result = castLegendLore({
      sheet: legendLoreClericSheet({
        preparedSpells: [],
        slots: 1,
      }),
      unitLibrary,
      subject: famousLegendLoreSubject,
      casting: completedLegendLoreCasting,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure.message).toBe(
        "Legend Lore requires prepared class Spell Access.",
      );
    }
  });
});

const legendLoreSelectedIdentityActions = {
  doCastLegendLore: () => {
    const result = requireRight(
      castLegendLore({
        sheet: legendLoreClericSheet({
          preparedSpells: ["legend_lore"],
          slots: 1,
        }),
        unitLibrary,
        subject: famousLegendLoreSubject,
        casting: completedLegendLoreCasting,
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
      castingTimeMinutes: result.invocation.castingTime.amount,
      consumedIncenseCostGp:
        result.invocation.materialComponents.consumedIncenseCostGp,
      ivoryStripCount: result.invocation.materialComponents.ivoryStripCount,
      answerOwner: result.invocation.lore.answerOwner,
      loreTag: result.invocation.lore.tag,
    };
  },
} as const satisfies Record<
  LegendLoreSelectedIdentityDriverAction,
  () => LegendLoreSelectedIdentityProjection
>;

const famousLegendLoreSubject = {
  tag: "famous",
  subjectKind: "place",
  description: "an ancient ruined observatory known in the campaign",
  priorKnowledge: "some",
} as const;

function expectedLegendLoreProjection(): LegendLoreSelectedIdentityProjection {
  return {
    spellId: "legend_lore",
    spellSlotCost: "ordinary",
    slotLevel: 5,
    slotExpended: 1,
    castingTimeMinutes: 10,
    consumedIncenseCostGp: 250,
    ivoryStripCount: 4,
    answerOwner: "gm",
    loreTag: "gmSummary",
  };
}

function legendLoreClericSheet(input: {
  readonly preparedSpells: readonly string[];
  readonly slots: number;
}) {
  return requireRight(
    rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:legend-lore-cleric-9"),
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
              preparedSpells: input.preparedSpells.map(authoredUnitId),
              spellcastingFocuses: ["holy_symbol"],
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
