// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.passwall-session-invocation
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test table-caller.passwall-spatial-passage
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-04-L5-BARRIER-WALL passwall
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L19E-04-L5-BARRIER-WALL passwall
// UNIT-IDENTITY-REPLAY: L19E-04-L5-BARRIER-WALL passwall doCastPasswall
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, it, test } from "vitest";

import {
  Either,
  Hp,
  armorClassBuild,
  castPasswall,
  characterSheetId,
  characterSheetPasswallSurfaceId,
  rebuildCharacterSheetFixture,
  requireRight,
  spellSlotLevel,
  unitLibrary,
} from "./test-support.ts";
import {
  type CharacterSheetPasswallDimensions,
  type CharacterSheetPasswallSurface,
} from "./sheet-types.ts";

type PasswallSelectedIdentityDriverAction = "doCastPasswall";

type PasswallSelectedIdentityProjection = {
  readonly spellId: string;
  readonly spellSlotCost: "ordinary";
  readonly slotLevel: number;
  readonly slotExpended: number;
  readonly rangeFeet: number;
  readonly durationHours: number;
  readonly widthFeet: number;
  readonly heightFeet: number;
  readonly depthFeet: number;
  readonly createsNoStructuralInstability: true;
};

type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly PasswallSelectedIdentityDriverAction[];
  readonly expected: PasswallSelectedIdentityProjection;
};

type SelectedUnitIdentityReplay = {
  readonly taskId: "L19E-04-L5-BARRIER-WALL";
  readonly unitId: "passwall";
  readonly actions: readonly PasswallSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L19E-04-L5-BARRIER-WALL",
    unitId: "passwall",
    actions: ["doCastPasswall"],
    sequences: [
      {
        name: "selected-passwall-slot-cast-returns-spatial-passage-contract",
        actions: ["doCastPasswall"],
        expected: expectedPasswallProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Character Sheet runtime / Passwall", () => {
  it("replays selected Unit identities deterministically", () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions = new Set<PasswallSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        let projection: PasswallSelectedIdentityProjection | undefined;

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          projection = passwallSelectedIdentityActions[actionName]();
        }

        expect(projection, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  test("Passwall spends a level-5 prepared spell slot and returns a table-facing passage contract", () => {
    const result = requireRight(
      castPasswall({
        sheet: passwallWizardSheet({
          preparedSpells: ["passwall"],
          slots: 1,
        }),
        unitLibrary,
        surface: passwallSurface,
        dimensions: passwallDimensions,
      }),
    );

    expect(result.invocation).toEqual({
      tag: "passwall",
      spellId: "passwall",
      spellLevel: 5,
      spellSlotCost: { kind: "ordinary", spellLevel: spellSlotLevel(5) },
      preparationRequirement: "prepared",
      requiredSpellAccess: "class_prepared",
      rangeFeet: 30,
      duration: { kind: "timeSpan", unit: "hour", amount: 1 },
      surface: passwallSurface,
      dimensions: passwallDimensions,
      passage: {
        createsNoStructuralInstability: true,
        ejectionWhenOpeningDisappears:
          "nearest_unoccupied_space_to_cast_surface",
      },
    });
    expect(result.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 1 },
    ]);
  });

  test("Passwall rejects invalid dimensions before spending a spell slot", () => {
    const sheet = passwallWizardSheet({
      preparedSpells: ["passwall"],
      slots: 1,
    });
    const overWide = castPasswall({
      sheet,
      unitLibrary,
      surface: passwallSurface,
      dimensions: { ...passwallDimensions, widthFeet: 6 },
    });
    expect(Either.isLeft(overWide)).toBe(true);
    if (Either.isLeft(overWide)) {
      expect(overWide.left.message).toBe(
        "Passwall width must be at most 5 feet.",
      );
    }
    expect(sheet.spellSlotExpenditures).toEqual([]);
  });

  test("Passwall requires prepared class Spell Access", () => {
    const result = castPasswall({
      sheet: passwallWizardSheet({ preparedSpells: [], slots: 1 }),
      unitLibrary,
      surface: passwallSurface,
      dimensions: passwallDimensions,
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe(
        "Passwall requires prepared class Spell Access.",
      );
    }
  });
});

const passwallSelectedIdentityActions = {
  doCastPasswall: () => {
    const result = requireRight(
      castPasswall({
        sheet: passwallWizardSheet({
          preparedSpells: ["passwall"],
          slots: 1,
        }),
        unitLibrary,
        surface: passwallSurface,
        dimensions: passwallDimensions,
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
      rangeFeet: result.invocation.rangeFeet,
      durationHours: result.invocation.duration.amount,
      widthFeet: result.invocation.dimensions.widthFeet,
      heightFeet: result.invocation.dimensions.heightFeet,
      depthFeet: result.invocation.dimensions.depthFeet,
      createsNoStructuralInstability:
        result.invocation.passage.createsNoStructuralInstability,
    };
  },
} as const satisfies Record<
  PasswallSelectedIdentityDriverAction,
  () => PasswallSelectedIdentityProjection
>;

const passwallSurface = {
  surfaceId: requireRight(
    characterSheetPasswallSurfaceId("surface:visible-stone-wall"),
  ),
  material: "stone",
  surfaceKind: "wall",
  visiblePointWithinRange: true,
} as const satisfies CharacterSheetPasswallSurface;

const passwallDimensions = {
  widthFeet: 5,
  heightFeet: 8,
  depthFeet: 20,
} as const satisfies CharacterSheetPasswallDimensions;

function expectedPasswallProjection(): PasswallSelectedIdentityProjection {
  return {
    spellId: "passwall",
    spellSlotCost: "ordinary",
    slotLevel: 5,
    slotExpended: 1,
    rangeFeet: 30,
    durationHours: 1,
    widthFeet: 5,
    heightFeet: 8,
    depthFeet: 20,
    createsNoStructuralInstability: true,
  };
}

function passwallWizardSheet(input: {
  readonly preparedSpells: readonly string[];
  readonly slots: number;
}) {
  return requireRight(
    rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:passwall-wizard-9"),
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
              spellbook: [authoredUnitId("passwall")],
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
      currentHp: Hp(44),
      tempHp: Hp(0),
      unitLibrary,
    }),
  );
}
