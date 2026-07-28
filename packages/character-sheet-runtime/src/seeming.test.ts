// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.seeming-session-invocation
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test table-caller.seeming-illusion-perception
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION seeming
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION seeming
// UNIT-IDENTITY-REPLAY: L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION seeming doCastSeeming
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, it, test } from "vitest";

import {
  Either,
  Hp,
  armorClassBuild,
  castSeeming,
  characterSheetId,
  characterSheetSeemingTargetId,
  rebuildCharacterSheetFixture,
  requireRight,
  spellSlotLevel,
  unitLibrary,
} from "./test-support.test-support.ts";
import {
  type CharacterSheetSeemingAppearance,
  type CharacterSheetSeemingUnwillingTarget,
  type CharacterSheetSeemingWillingTarget,
} from "./sheet-types.ts";

type SeemingSelectedIdentityDriverAction = "doCastSeeming";

type SeemingSelectedIdentityProjection = {
  readonly spellId: string;
  readonly spellSlotCost: "ordinary";
  readonly slotLevel: number;
  readonly slotExpended: number;
  readonly durationHours: number;
  readonly rangeFeet: 30;
  readonly targetCount: number;
  readonly saveAbility: "cha";
  readonly disguisedCount: number;
  readonly unaffectedCount: number;
  readonly physicalInspectionFails: true;
  readonly studyRevealSkill: "investigation";
  readonly targetAppearanceRenderingOwner: "table";
};

type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly SeemingSelectedIdentityDriverAction[];
  readonly expected: SeemingSelectedIdentityProjection;
};

type SelectedUnitIdentityReplay = {
  readonly taskId: "L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION";
  readonly unitId: "seeming";
  readonly actions: readonly SeemingSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION",
    unitId: "seeming",
    actions: ["doCastSeeming"],
    sequences: [
      {
        name: "selected-seeming-slot-cast-returns-multitarget-illusion-contract",
        actions: ["doCastSeeming"],
        expected: expectedSeemingProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Character Sheet runtime / Seeming", () => {
  it("replays selected Unit identities deterministically", () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions = new Set<SeemingSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        let projection: SeemingSelectedIdentityProjection | undefined;

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          projection = seemingSelectedIdentityActions[actionName]();
        }

        expect(projection, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  test("Seeming spends a prepared level-5 spell slot and returns willing plus unwilling target illusion outcomes", () => {
    const willing = seemingWillingTarget("seeming-target:willing", {
      heightChangeFeet: 1,
      apparentWeightChange: "heavier",
    });
    const unwillingFailed = seemingUnwillingTarget(
      "seeming-target:failed-save",
      "failed",
      {
        heightChangeFeet: -1,
        apparentWeightChange: "lighter",
      },
    );
    const unwillingSucceeded = seemingUnwillingTarget(
      "seeming-target:succeeded-save",
      "succeeded",
      {
        heightChangeFeet: 0,
        apparentWeightChange: "unchanged",
      },
    );
    const result = requireRight(
      castSeeming({
        sheet: seemingWizardSheet({ preparedSpells: ["seeming"], slots: 1 }),
        unitLibrary,
        targets: [willing, unwillingFailed, unwillingSucceeded],
      }),
    );

    expect(result.invocation).toEqual({
      tag: "seeming",
      spellId: "seeming",
      spellLevel: 5,
      spellSlotCost: { kind: "ordinary", spellLevel: spellSlotLevel(5) },
      preparationRequirement: "prepared",
      requiredSpellAccess: "class_prepared",
      rangeFeet: 30,
      duration: { kind: "timeSpan", unit: "hour", amount: 8 },
      targets: [willing, unwillingFailed, unwillingSucceeded],
      savingThrow: {
        tag: "unwillingTargetsOnly",
        ability: "cha",
        dc: "caster_spell_save_dc",
      },
      illusion: {
        channels: ["visual"],
        sameOrDifferentAppearancesAllowed: true,
        changesBodiesAndEquipment: true,
        maxHeightChangeFeet: 1,
        sameBasicArrangementOfLimbsRequired: true,
        physicalInspection: {
          failsToHoldUp: true,
          objectsPassThroughAddedAppearance: true,
        },
        studyReveal: {
          action: "study",
          ability: "int",
          skill: "investigation",
          dc: "caster_spell_save_dc",
          success: "aware_target_is_disguised",
        },
        targetAppearanceRenderingOwner: "table",
        ongoingPerceptionAdjudicationOwner: "table",
      },
      outcomes: [
        {
          tag: "targetDisguised",
          targetId: willing.targetId,
          saveRequired: false,
          appearance: willing.appearance,
        },
        {
          tag: "unwillingSaveFailed",
          targetId: unwillingFailed.targetId,
          saveRequired: true,
          appearance: unwillingFailed.appearance,
        },
        {
          tag: "unwillingSaveSucceeded",
          targetId: unwillingSucceeded.targetId,
          saveRequired: true,
          affected: false,
        },
      ],
    });
    expect(result.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 1 },
    ]);
  });

  test("Seeming rejects duplicate target ids before spending the spell slot", () => {
    const sheet = seemingWizardSheet({ preparedSpells: ["seeming"], slots: 1 });
    const duplicateA = seemingWillingTarget("seeming-target:duplicate", {
      heightChangeFeet: 1,
      apparentWeightChange: "heavier",
    });
    const duplicateB = seemingUnwillingTarget(
      "seeming-target:duplicate",
      "failed",
      {
        heightChangeFeet: -1,
        apparentWeightChange: "lighter",
      },
    );
    const result = castSeeming({
      sheet,
      unitLibrary,
      targets: [duplicateA, duplicateB],
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe("Seeming requires unique target ids.");
    }
    expect(sheet.spellSlotExpenditures).toEqual([]);
  });

  test("Seeming requires prepared class Spell Access", () => {
    const result = castSeeming({
      sheet: seemingWizardSheet({ preparedSpells: [], slots: 1 }),
      unitLibrary,
      targets: [
        seemingWillingTarget("seeming-target:no-access", {
          heightChangeFeet: 0,
          apparentWeightChange: "unchanged",
        }),
      ],
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe(
        "Seeming requires prepared class Spell Access.",
      );
    }
  });
});

const seemingSelectedIdentityActions = {
  doCastSeeming: () => {
    const result = requireRight(
      castSeeming({
        sheet: seemingWizardSheet({ preparedSpells: ["seeming"], slots: 1 }),
        unitLibrary,
        targets: [
          seemingWillingTarget("seeming-target:replay-willing", {
            heightChangeFeet: 1,
            apparentWeightChange: "heavier",
          }),
          seemingUnwillingTarget(
            "seeming-target:replay-unwilling-failed",
            "failed",
            {
              heightChangeFeet: -1,
              apparentWeightChange: "lighter",
            },
          ),
          seemingUnwillingTarget(
            "seeming-target:replay-unwilling-succeeded",
            "succeeded",
            {
              heightChangeFeet: 0,
              apparentWeightChange: "unchanged",
            },
          ),
        ],
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
      durationHours: result.invocation.duration.amount,
      rangeFeet: result.invocation.rangeFeet,
      targetCount: result.invocation.targets.length,
      saveAbility: result.invocation.savingThrow.ability,
      disguisedCount: result.invocation.outcomes.filter(
        (outcome) =>
          outcome.tag === "targetDisguised" ||
          outcome.tag === "unwillingSaveFailed",
      ).length,
      unaffectedCount: result.invocation.outcomes.filter(
        (outcome) => outcome.tag === "unwillingSaveSucceeded",
      ).length,
      physicalInspectionFails:
        result.invocation.illusion.physicalInspection.failsToHoldUp,
      studyRevealSkill: result.invocation.illusion.studyReveal.skill,
      targetAppearanceRenderingOwner:
        result.invocation.illusion.targetAppearanceRenderingOwner,
    };
  },
} as const satisfies Record<
  SeemingSelectedIdentityDriverAction,
  () => SeemingSelectedIdentityProjection
>;

function expectedSeemingProjection(): SeemingSelectedIdentityProjection {
  return {
    spellId: "seeming",
    spellSlotCost: "ordinary",
    slotLevel: 5,
    slotExpended: 1,
    durationHours: 8,
    rangeFeet: 30,
    targetCount: 3,
    saveAbility: "cha",
    disguisedCount: 2,
    unaffectedCount: 1,
    physicalInspectionFails: true,
    studyRevealSkill: "investigation",
    targetAppearanceRenderingOwner: "table",
  };
}

function seemingWillingTarget(
  targetId: string,
  input: {
    readonly heightChangeFeet: CharacterSheetSeemingAppearance["heightChangeFeet"];
    readonly apparentWeightChange: CharacterSheetSeemingAppearance["apparentWeightChange"];
  },
): CharacterSheetSeemingWillingTarget {
  return {
    targetId: requireRight(characterSheetSeemingTargetId(targetId)),
    willingness: "willing",
    visibleByCaster: true,
    withinRangeFeet: 30,
    appearance: seemingAppearance(input),
  };
}

function seemingUnwillingTarget(
  targetId: string,
  savingThrowOutcome: CharacterSheetSeemingUnwillingTarget["savingThrowOutcome"]["tag"],
  input: {
    readonly heightChangeFeet: CharacterSheetSeemingAppearance["heightChangeFeet"];
    readonly apparentWeightChange: CharacterSheetSeemingAppearance["apparentWeightChange"];
  },
): CharacterSheetSeemingUnwillingTarget {
  return {
    targetId: requireRight(characterSheetSeemingTargetId(targetId)),
    willingness: "unwilling",
    visibleByCaster: true,
    withinRangeFeet: 30,
    savingThrowOutcome: { tag: savingThrowOutcome },
    appearance: seemingAppearance(input),
  };
}

function seemingAppearance(input: {
  readonly heightChangeFeet: CharacterSheetSeemingAppearance["heightChangeFeet"];
  readonly apparentWeightChange: CharacterSheetSeemingAppearance["apparentWeightChange"];
}): CharacterSheetSeemingAppearance {
  return {
    bodyAndEquipmentAppearance: "changed",
    heightChangeFeet: input.heightChangeFeet,
    apparentWeightChange: input.apparentWeightChange,
    sameBasicArrangementOfLimbs: true,
    appearanceDetailOwner: "session",
  };
}

function seemingWizardSheet(input: {
  readonly preparedSpells: readonly string[];
  readonly slots: number;
}) {
  return requireRight(
    rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:seeming-wizard-9"),
      build: {
        ...armorClassBuild({
          startingClass: "class_wizard",
          advancements: Array.from({ length: 8 }, () => "class_wizard"),
        }),
        spellcasting: {
          sources: [
            {
              sourceUnitId: authoredUnitId("class_wizard"),
              spellcastingAbility: "int",
              cantrips: [
                authoredUnitId("fire_bolt"),
                authoredUnitId("light"),
                authoredUnitId("mage_hand"),
              ],
              spellbook: [],
              preparedSpells: input.preparedSpells.map(authoredUnitId),
              spellcastingFocuses: ["arcane_focus"],
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
      currentHp: Hp(30),
      tempHp: Hp(0),
      unitLibrary,
    }),
  );
}
