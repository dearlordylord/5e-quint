// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.wall-of-force-session-invocation
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test table-caller.wall-of-force-barrier-contract
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-04-L5-BARRIER-WALL wall_of_force
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L19E-04-L5-BARRIER-WALL wall_of_force
// UNIT-IDENTITY-REPLAY: L19E-04-L5-BARRIER-WALL wall_of_force doCastWallOfForce
import { describe, expect, it, test } from "vitest";

import {
  Either,
  Hp,
  armorClassBuild,
  castWallOfForce,
  characterSheetId,
  characterSheetWallOfForceBarrierId,
  createFreshCharacterSheet,
  requireRight,
  spellSlotLevel,
  unitLibrary,
} from "./test-support.ts";
import {
  type CharacterSheetWallOfForcePlacement,
  type CharacterSheetWallOfForceShape,
} from "./sheet-types.ts";

const wallOfForceSelectedIdentityDriverSchema = {
  doCastWallOfForce: {},
} as const;

type WallOfForceSelectedIdentityDriverAction =
  keyof typeof wallOfForceSelectedIdentityDriverSchema;

type WallOfForceSelectedIdentityProjection = {
  readonly spellId: string;
  readonly spellSlotCost: "ordinary";
  readonly slotLevel: number;
  readonly slotExpended: number;
  readonly rangeFeet: number;
  readonly durationMinutes: number;
  readonly concentrationRequired: true;
  readonly shapeKind: CharacterSheetWallOfForceShape["kind"];
  readonly panelCount: number;
  readonly physicalPassage: "blocked";
  readonly damageImmunity: "all_damage";
  readonly cannotBeDispelledBy: "dispel_magic";
  readonly destroyedBy: "disintegrate";
  readonly disintegrateHarmsInside: false;
  readonly etherealTravel: "blocked";
  readonly geometryOwner: "table";
  readonly effectBlockingOwner: "table";
};

type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly WallOfForceSelectedIdentityDriverAction[];
  readonly expected: WallOfForceSelectedIdentityProjection;
};

type SelectedUnitIdentityReplay = {
  readonly taskId: "L19E-04-L5-BARRIER-WALL";
  readonly unitId: "wall_of_force";
  readonly actions: readonly WallOfForceSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L19E-04-L5-BARRIER-WALL",
    unitId: "wall_of_force",
    actions: ["doCastWallOfForce"],
    sequences: [
      {
        name: "selected-wall-of-force-slot-cast-returns-barrier-contract",
        actions: ["doCastWallOfForce"],
        expected: expectedWallOfForceProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Character Sheet runtime / Wall of Force", () => {
  it("replays selected Unit identities deterministically", () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<WallOfForceSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        let projection: WallOfForceSelectedIdentityProjection | undefined;

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          projection = wallOfForceSelectedIdentityActions[actionName]();
        }

        expect(projection, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  test("Wall of Force spends a level-5 prepared spell slot and returns a table-facing barrier contract", () => {
    const result = requireRight(
      castWallOfForce({
        sheet: wallOfForceWizardSheet({
          preparedSpells: ["wall_of_force"],
          slots: 1,
        }),
        unitLibrary,
        placement: wallOfForcePlacement,
        shape: wallOfForceFlatPanels,
      }),
    );

    expect(result.invocation).toEqual({
      tag: "wallOfForce",
      spellId: "wall_of_force",
      spellLevel: 5,
      spellSlotCost: { kind: "ordinary", spellLevel: spellSlotLevel(5) },
      preparationRequirement: "prepared",
      requiredSpellAccess: "class_prepared",
      castingTime: { kind: "action" },
      rangeFeet: 120,
      duration: { kind: "timeSpan", unit: "minute", amount: 10 },
      concentrationRequired: true,
      placement: wallOfForcePlacement,
      shape: wallOfForceFlatPanels,
      barrier: {
        invisible: true,
        physicalPassage: "blocked",
        effectBlockingOwner: "table",
        containmentAndSideChoiceOwner: "table",
        geometryOwner: "table",
        initialCreaturePush: {
          trigger: "wall_cuts_through_creature_space",
          distanceFeet: 5,
          sideChoiceOwner: "caster_and_table",
        },
        damageImmunity: "all_damage",
        cannotBeDispelledBy: "dispel_magic",
        destroyedBy: "disintegrate",
        disintegrateHarmsInside: false,
        etherealTravel: "blocked",
      },
    });
    expect(result.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 1 },
    ]);
  });

  test("Wall of Force accepts the globe-or-dome shape facts", () => {
    const result = requireRight(
      castWallOfForce({
        sheet: wallOfForceWizardSheet({
          preparedSpells: ["wall_of_force"],
          slots: 1,
        }),
        unitLibrary,
        placement: wallOfForcePlacement,
        shape: wallOfForceGlobeOrDome,
      }),
    );

    expect(result.invocation.shape).toEqual(wallOfForceGlobeOrDome);
    expect(result.invocation.barrier.geometryOwner).toBe("table");
    expect(result.invocation.barrier.effectBlockingOwner).toBe("table");
  });

  test("Wall of Force rejects oversized globe-or-dome radius before spending a spell slot", () => {
    const sheet = wallOfForceWizardSheet({
      preparedSpells: ["wall_of_force"],
      slots: 1,
    });
    const result = castWallOfForce({
      sheet,
      unitLibrary,
      placement: wallOfForcePlacement,
      shape: { ...wallOfForceGlobeOrDome, radiusFeet: 11 },
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe(
        "Wall of Force globe or dome radius must be at most 10 feet.",
      );
    }
    expect(sheet.spellSlotExpenditures).toEqual([]);
  });

  test("Wall of Force requires prepared class Spell Access", () => {
    const result = castWallOfForce({
      sheet: wallOfForceWizardSheet({ preparedSpells: [], slots: 1 }),
      unitLibrary,
      placement: wallOfForcePlacement,
      shape: wallOfForceFlatPanels,
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe(
        "Wall of Force requires prepared class Spell Access.",
      );
    }
  });
});

const wallOfForceSelectedIdentityActions = {
  doCastWallOfForce: () => {
    const result = requireRight(
      castWallOfForce({
        sheet: wallOfForceWizardSheet({
          preparedSpells: ["wall_of_force"],
          slots: 1,
        }),
        unitLibrary,
        placement: wallOfForcePlacement,
        shape: wallOfForceFlatPanels,
      }),
    );
    const shape = result.invocation.shape;
    return {
      spellId: result.invocation.spellId,
      spellSlotCost: result.invocation.spellSlotCost.kind,
      slotLevel: result.invocation.spellSlotCost.spellLevel,
      slotExpended:
        (result.sheet.spellSlotExpenditures ?? []).find(
          (slot) => slot.spellLevel === spellSlotLevel(5),
        )?.expended ?? 0,
      rangeFeet: result.invocation.rangeFeet,
      durationMinutes: result.invocation.duration.amount,
      concentrationRequired: result.invocation.concentrationRequired,
      shapeKind: shape.kind,
      panelCount: shape.kind === "flatPanels" ? shape.panelCount : 0,
      physicalPassage: result.invocation.barrier.physicalPassage,
      damageImmunity: result.invocation.barrier.damageImmunity,
      cannotBeDispelledBy: result.invocation.barrier.cannotBeDispelledBy,
      destroyedBy: result.invocation.barrier.destroyedBy,
      disintegrateHarmsInside:
        result.invocation.barrier.disintegrateHarmsInside,
      etherealTravel: result.invocation.barrier.etherealTravel,
      geometryOwner: result.invocation.barrier.geometryOwner,
      effectBlockingOwner: result.invocation.barrier.effectBlockingOwner,
    };
  },
} as const satisfies Record<
  WallOfForceSelectedIdentityDriverAction,
  () => WallOfForceSelectedIdentityProjection
>;

const wallOfForcePlacement = {
  barrierId: requireRight(
    characterSheetWallOfForceBarrierId("barrier:wall-of-force"),
  ),
  pointWithinRange: true,
  orientation: "table_witnessed",
  support: "free_floating_or_solid_surface",
} as const satisfies CharacterSheetWallOfForcePlacement;

const wallOfForceFlatPanels = {
  kind: "flatPanels",
  panelCount: 10,
  panelWidthFeet: 10,
  panelHeightFeet: 10,
  panelContiguity: "table_witnessed",
  thicknessInches: 0.25,
} as const satisfies CharacterSheetWallOfForceShape;

const wallOfForceGlobeOrDome = {
  kind: "globeOrDome",
  radiusFeet: 10,
  thicknessInches: 0.25,
} as const satisfies CharacterSheetWallOfForceShape;

function expectedWallOfForceProjection(): WallOfForceSelectedIdentityProjection {
  return {
    spellId: "wall_of_force",
    spellSlotCost: "ordinary",
    slotLevel: 5,
    slotExpended: 1,
    rangeFeet: 120,
    durationMinutes: 10,
    concentrationRequired: true,
    shapeKind: "flatPanels",
    panelCount: 10,
    physicalPassage: "blocked",
    damageImmunity: "all_damage",
    cannotBeDispelledBy: "dispel_magic",
    destroyedBy: "disintegrate",
    disintegrateHarmsInside: false,
    etherealTravel: "blocked",
    geometryOwner: "table",
    effectBlockingOwner: "table",
  };
}

function wallOfForceWizardSheet(input: {
  readonly preparedSpells: readonly string[];
  readonly slots: number;
}) {
  return requireRight(
    createFreshCharacterSheet({
      characterId: characterSheetId("character:wall-of-force-wizard-9"),
      build: {
        ...armorClassBuild({
          startingClass: "class_wizard",
          advancements: Array.from({ length: 8 }, () => "class_wizard"),
        }),
        spellcasting: {
          sources: [
            {
              sourceUnitId: "class_wizard",
              spellcastingAbility: "int",
              cantrips: ["fire_bolt", "light", "mage_hand"],
              spellbook: ["wall_of_force"],
              preparedSpells: input.preparedSpells,
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
      currentHp: Hp(44),
      tempHp: Hp(0),
      unitLibrary,
    }),
  );
}
