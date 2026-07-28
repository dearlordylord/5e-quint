// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.teleportation-circle-session-invocation
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test table-caller.teleportation-circle-travel
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-08-L5-TELEPORT-TRAVEL teleportation_circle
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L19E-08-L5-TELEPORT-TRAVEL teleportation_circle
// UNIT-IDENTITY-REPLAY: L19E-08-L5-TELEPORT-TRAVEL teleportation_circle doCastTeleportationCircle
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, it, test } from "vitest";

import {
  Either,
  Hp,
  armorClassBuild,
  castTeleportationCircle,
  characterSheetId,
  characterSheetTeleportationCircleSigilSequenceId,
  completedTeleportationCircleCasting,
  rebuildCharacterSheetFixture,
  requireRight,
  spellSlotLevel,
  unitLibrary,
} from "./test-support.test-support.ts";
import { type CharacterSheetTeleportationCircleDestination } from "./sheet-types.ts";

type TeleportationCircleSelectedIdentityDriverAction =
  "doCastTeleportationCircle";

type TeleportationCircleSelectedIdentityProjection = {
  readonly spellId: string;
  readonly spellSlotCost: "ordinary";
  readonly slotLevel: number;
  readonly slotExpended: number;
  readonly castingTimeMinutes: number;
  readonly rangeFeet: number;
  readonly radiusFeet: number;
  readonly durationRounds: number;
  readonly consumedRareInksCostGp: number;
  readonly samePlaneDestinationRequired: true;
};

type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly TeleportationCircleSelectedIdentityDriverAction[];
  readonly expected: TeleportationCircleSelectedIdentityProjection;
};

type SelectedUnitIdentityReplay = {
  readonly taskId: "L19E-08-L5-TELEPORT-TRAVEL";
  readonly unitId: "teleportation_circle";
  readonly actions: readonly TeleportationCircleSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L19E-08-L5-TELEPORT-TRAVEL",
    unitId: "teleportation_circle",
    actions: ["doCastTeleportationCircle"],
    sequences: [
      {
        name: "selected-teleportation-circle-slot-cast-returns-portal-contract",
        actions: ["doCastTeleportationCircle"],
        expected: expectedTeleportationCircleProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Character Sheet runtime / Teleportation Circle", () => {
  it("replays selected Unit identities deterministically", () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<TeleportationCircleSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        let projection:
          | TeleportationCircleSelectedIdentityProjection
          | undefined;

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          projection = teleportationCircleSelectedIdentityActions[actionName]();
        }

        expect(projection, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  test("Teleportation Circle spends a level-5 prepared spell slot and returns a same-plane portal contract", () => {
    const result = requireRight(
      castTeleportationCircle({
        sheet: teleportationCircleBardSheet({
          preparedSpells: ["teleportation_circle"],
          slots: 1,
        }),
        unitLibrary,
        destination: destinationCircle,
        casting: completedTeleportationCircleCasting,
      }),
    );

    expect(result.invocation).toEqual({
      tag: "teleportationCircle",
      spellId: "teleportation_circle",
      spellLevel: 5,
      spellSlotCost: { kind: "ordinary", spellLevel: spellSlotLevel(5) },
      preparationRequirement: "prepared",
      requiredSpellAccess: "class_prepared",
      castingTime: { kind: "minutes", amount: 1 },
      rangeFeet: 10,
      drawnCircleRadiusFeet: 5,
      duration: { kind: "timeSpan", unit: "round", amount: 1 },
      materialComponents: { consumedRareInksCostGp: 50 },
      destination: destinationCircle,
      portal: {
        opensWithinDrawnCircle: true,
        openUntil: "end_of_casters_next_turn",
        entrantArrival: "within_5_feet_or_nearest_unoccupied",
        samePlaneDestinationRequired: true,
      },
      permanentCircleCreation: {
        cadence: "daily",
        requiredCastCount: 365,
        locationRequirement: "same_location",
      },
    });
    expect(result.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 1 },
    ]);

    const second = castTeleportationCircle({
      sheet: result.sheet,
      unitLibrary,
      destination: destinationCircle,
      casting: completedTeleportationCircleCasting,
    });
    expect(Either.isLeft(second)).toBe(true);
    if (Either.isLeft(second)) {
      expect(second.left.message).toBe(
        "Spell Slot spend requires an unexpended ordinary Spell Slot.",
      );
    }
  });

  test("Teleportation Circle requires prepared class Spell Access", () => {
    const result = castTeleportationCircle({
      sheet: teleportationCircleBardSheet({ preparedSpells: [], slots: 1 }),
      unitLibrary,
      destination: destinationCircle,
      casting: completedTeleportationCircleCasting,
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe(
        "Teleportation Circle requires prepared class Spell Access.",
      );
    }
  });
});

const teleportationCircleSelectedIdentityActions = {
  doCastTeleportationCircle: () => {
    const result = requireRight(
      castTeleportationCircle({
        sheet: teleportationCircleBardSheet({
          preparedSpells: ["teleportation_circle"],
          slots: 1,
        }),
        unitLibrary,
        destination: destinationCircle,
        casting: completedTeleportationCircleCasting,
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
      rangeFeet: result.invocation.rangeFeet,
      radiusFeet: result.invocation.drawnCircleRadiusFeet,
      durationRounds: result.invocation.duration.amount,
      consumedRareInksCostGp:
        result.invocation.materialComponents.consumedRareInksCostGp,
      samePlaneDestinationRequired:
        result.invocation.portal.samePlaneDestinationRequired,
    };
  },
} as const satisfies Record<
  TeleportationCircleSelectedIdentityDriverAction,
  () => TeleportationCircleSelectedIdentityProjection
>;

const destinationCircle = {
  sigilSequenceId: requireRight(
    characterSheetTeleportationCircleSigilSequenceId(
      "sigil-sequence:material-plane-temple",
    ),
  ),
  knownByCaster: true,
  destinationKind: "permanent_teleportation_circle",
  plane: "same_plane_as_caster",
} as const satisfies CharacterSheetTeleportationCircleDestination;

function expectedTeleportationCircleProjection(): TeleportationCircleSelectedIdentityProjection {
  return {
    spellId: "teleportation_circle",
    spellSlotCost: "ordinary",
    slotLevel: 5,
    slotExpended: 1,
    castingTimeMinutes: 1,
    rangeFeet: 10,
    radiusFeet: 5,
    durationRounds: 1,
    consumedRareInksCostGp: 50,
    samePlaneDestinationRequired: true,
  };
}

function teleportationCircleBardSheet(input: {
  readonly preparedSpells: readonly string[];
  readonly slots: number;
}) {
  return requireRight(
    rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:teleportation-circle-bard-9"),
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
