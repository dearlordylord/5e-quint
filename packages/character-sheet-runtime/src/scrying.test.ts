// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.scrying-session-invocation
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test table-caller.scrying-remote-sensor-perception
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION scrying
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION scrying
// UNIT-IDENTITY-REPLAY: L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION scrying doCastScrying
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, it, test } from "vitest";

import {
  Result,
  Hp,
  armorClassBuild,
  castScrying,
  characterSheetId,
  characterSheetScryingLocationId,
  characterSheetScryingTargetId,
  completedScryingCasting,
  rebuildCharacterSheetFixture,
  requireRight,
  scryingSavingThrowModifier,
  spellSlotLevel,
  unitLibrary,
} from "./test-support.test-support.ts";
import {
  type CharacterSheetScryingCreatureTarget,
  type CharacterSheetScryingLocationTarget,
} from "./sheet-types.ts";

type ScryingSelectedIdentityDriverAction = "doCastScrying";

type ScryingSelectedIdentityProjection = {
  readonly spellId: string;
  readonly spellSlotCost: "ordinary";
  readonly slotLevel: number;
  readonly slotExpended: number;
  readonly durationMinutes: number;
  readonly concentrationRequired: true;
  readonly materialFocusCostGpMinimum: number;
  readonly materialConsumed: false;
  readonly targetTag: "creature";
  readonly saveAbility: "wis";
  readonly saveModifier: number;
  readonly sensorVisibility: "invisible";
  readonly remoteContentsOwner: "table";
};

type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly ScryingSelectedIdentityDriverAction[];
  readonly expected: ScryingSelectedIdentityProjection;
};

type SelectedUnitIdentityReplay = {
  readonly taskId: "L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION";
  readonly unitId: "scrying";
  readonly actions: readonly ScryingSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION",
    unitId: "scrying",
    actions: ["doCastScrying"],
    sequences: [
      {
        name: "selected-scrying-slot-cast-returns-moving-remote-sensor-contract",
        actions: ["doCastScrying"],
        expected: expectedScryingProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Character Sheet runtime / Scrying", () => {
  it("replays selected Unit identities deterministically", () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions = new Set<ScryingSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        let projection: ScryingSelectedIdentityProjection | undefined;

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          projection = scryingSelectedIdentityActions[actionName]();
        }

        expect(projection, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  test("Scrying spends a level-5 prepared spell slot and returns a moving remote sensor contract after a failed creature save", () => {
    const target = scryingCreatureTarget({
      knowledge: { tag: "extensive", saveModifier: -5 },
      connection: {
        tag: "bodyPartLockOfHairOrBitOfNail",
        objectChoice: "body_part_lock_of_hair_or_bit_of_nail",
        saveModifier: -10,
      },
      savingThrowOutcome: { tag: "failed" },
    });
    const result = requireRight(
      castScrying({
        sheet: scryingWizardSheet({ preparedSpells: ["scrying"], slots: 1 }),
        unitLibrary,
        casting: completedScryingCasting,
        target,
      }),
    );

    expect(result.invocation).toEqual({
      tag: "scrying",
      spellId: "scrying",
      spellLevel: 5,
      spellSlotCost: { kind: "ordinary", spellLevel: spellSlotLevel(5) },
      preparationRequirement: "prepared",
      requiredSpellAccess: "class_prepared",
      castingTime: { kind: "minutes", amount: 10 },
      materialComponents: {
        focusCostGpMinimum: 1000,
        consumed: false,
        focusExamples: ["crystal_ball", "mirror", "water_filled_font"],
      },
      duration: { kind: "timeSpan", unit: "minute", amount: 10 },
      concentrationRequired: true,
      target,
      savingThrow: {
        tag: "requiredForCreatureTarget",
        ability: "wis",
        dc: "caster_spell_save_dc",
        targetAwareness: "feels_uneasy_without_knowing_source",
        knowledge: target.knowledge,
        connection: target.connection,
      },
      outcome: {
        tag: "creatureSaveFailed",
        sensor: {
          tag: "movingWithCreatureTarget",
          visibility: "invisible",
          tangibility: "intangible",
          maxDistanceFromTargetFeet: 10,
          casterPerception: "see_and_hear_as_if_there",
          visibleAppearance: "fist_sized_luminous_orb",
          remoteContentsOwner: "table",
          specialSenseVisibilityOwner: "table",
          mapPlacementOwner: "table",
        },
      },
    });
    expect(scryingSavingThrowModifier(target)).toBe(-15);
    expect(result.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 1 },
    ]);
  });

  test("Scrying records the 24-hour retry lockout after a successful creature save", () => {
    const target = scryingCreatureTarget({
      knowledge: { tag: "secondhand", saveModifier: 5 },
      connection: {
        tag: "pictureOrOtherLikeness",
        objectChoice: "picture_or_other_likeness",
        saveModifier: -2,
      },
      savingThrowOutcome: { tag: "succeeded" },
    });
    const result = requireRight(
      castScrying({
        sheet: scryingWizardSheet({ preparedSpells: ["scrying"], slots: 1 }),
        unitLibrary,
        casting: completedScryingCasting,
        target,
      }),
    );

    expect(result.invocation.savingThrow).toEqual({
      tag: "requiredForCreatureTarget",
      ability: "wis",
      dc: "caster_spell_save_dc",
      targetAwareness: "feels_uneasy_without_knowing_source",
      knowledge: target.knowledge,
      connection: target.connection,
    });
    expect(result.invocation.outcome).toEqual({
      tag: "creatureSaveSucceeded",
      targetAffected: false,
      retryLockout: {
        targetId: target.targetId,
        duration: { kind: "timeSpan", unit: "hour", amount: 24 },
      },
    });
    expect(scryingSavingThrowModifier(target)).toBe(3);
    expect(result.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 1 },
    ]);
  });

  test("Scrying can target a seen location and returns a stationary sensor without a Wisdom Saving Throw", () => {
    const locationTarget = scryingLocationTarget();
    const result = requireRight(
      castScrying({
        sheet: scryingWizardSheet({ preparedSpells: ["scrying"], slots: 1 }),
        unitLibrary,
        casting: completedScryingCasting,
        target: locationTarget,
      }),
    );

    expect(result.invocation.target).toEqual(locationTarget);
    expect(result.invocation.savingThrow).toEqual({
      tag: "notRequiredForSeenLocation",
    });
    expect(result.invocation.outcome).toEqual({
      tag: "locationSensor",
      sensor: {
        tag: "stationaryAtSeenLocation",
        visibility: "invisible",
        tangibility: "intangible",
        casterPerception: "see_and_hear_as_if_there",
        visibleAppearance: "fist_sized_luminous_orb",
        remoteContentsOwner: "table",
        specialSenseVisibilityOwner: "table",
        mapPlacementOwner: "table",
      },
    });
    expect(result.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 1 },
    ]);
  });

  test("Scrying requires prepared class Spell Access", () => {
    const result = castScrying({
      sheet: scryingWizardSheet({ preparedSpells: [], slots: 1 }),
      unitLibrary,
      casting: completedScryingCasting,
      target: scryingLocationTarget(),
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure.message).toBe(
        "Scrying requires prepared class Spell Access.",
      );
    }
  });
});

const scryingSelectedIdentityActions = {
  doCastScrying: () => {
    const target = scryingCreatureTarget({
      knowledge: { tag: "extensive", saveModifier: -5 },
      connection: {
        tag: "bodyPartLockOfHairOrBitOfNail",
        objectChoice: "body_part_lock_of_hair_or_bit_of_nail",
        saveModifier: -10,
      },
      savingThrowOutcome: { tag: "failed" },
    });
    const result = requireRight(
      castScrying({
        sheet: scryingWizardSheet({ preparedSpells: ["scrying"], slots: 1 }),
        unitLibrary,
        casting: completedScryingCasting,
        target,
      }),
    );
    const outcome = result.invocation.outcome;
    if (outcome.tag !== "creatureSaveFailed") {
      throw new Error("Expected Scrying replay to create a creature sensor.");
    }
    if (result.invocation.savingThrow.tag !== "requiredForCreatureTarget") {
      throw new Error("Expected Scrying creature target to require a save.");
    }
    return {
      spellId: result.invocation.spellId,
      spellSlotCost: result.invocation.spellSlotCost.kind,
      slotLevel: result.invocation.spellSlotCost.spellLevel,
      slotExpended:
        (result.sheet.spellSlotExpenditures ?? []).find(
          (slot) => slot.spellLevel === spellSlotLevel(5),
        )?.expended ?? 0,
      durationMinutes: result.invocation.duration.amount,
      concentrationRequired: result.invocation.concentrationRequired,
      materialFocusCostGpMinimum:
        result.invocation.materialComponents.focusCostGpMinimum,
      materialConsumed: result.invocation.materialComponents.consumed,
      targetTag: target.tag,
      saveAbility: result.invocation.savingThrow.ability,
      saveModifier: scryingSavingThrowModifier(target),
      sensorVisibility: outcome.sensor.visibility,
      remoteContentsOwner: outcome.sensor.remoteContentsOwner,
    };
  },
} as const satisfies Record<
  ScryingSelectedIdentityDriverAction,
  () => ScryingSelectedIdentityProjection
>;

function expectedScryingProjection(): ScryingSelectedIdentityProjection {
  return {
    spellId: "scrying",
    spellSlotCost: "ordinary",
    slotLevel: 5,
    slotExpended: 1,
    durationMinutes: 10,
    concentrationRequired: true,
    materialFocusCostGpMinimum: 1000,
    materialConsumed: false,
    targetTag: "creature",
    saveAbility: "wis",
    saveModifier: -15,
    sensorVisibility: "invisible",
    remoteContentsOwner: "table",
  };
}

function scryingCreatureTarget(input: {
  readonly knowledge: CharacterSheetScryingCreatureTarget["knowledge"];
  readonly connection: CharacterSheetScryingCreatureTarget["connection"];
  readonly savingThrowOutcome: CharacterSheetScryingCreatureTarget["savingThrowOutcome"];
}): CharacterSheetScryingCreatureTarget {
  return {
    tag: "creature",
    targetId: requireRight(characterSheetScryingTargetId("scrying-target:1")),
    plane: "same_plane_as_caster",
    knowledge: input.knowledge,
    connection: input.connection,
    savingThrowOutcome: input.savingThrowOutcome,
  };
}

function scryingLocationTarget(): CharacterSheetScryingLocationTarget {
  return {
    tag: "location",
    locationId: requireRight(
      characterSheetScryingLocationId("scrying-location:seen-courtyard"),
    ),
    seenByCaster: true,
  };
}

function scryingWizardSheet(input: {
  readonly preparedSpells: readonly string[];
  readonly slots: number;
}) {
  return requireRight(
    rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:scrying-wizard-9"),
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
