// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.creation-session-invocation
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test table-caller.creation-object-lifecycle
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE creation
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE creation
// UNIT-IDENTITY-REPLAY: L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE creation doCastCreation
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, it, test } from "vitest";

import {
  Either,
  Hp,
  armorClassBuild,
  castCreation,
  characterSheetCreationObjectId,
  characterSheetId,
  rebuildCharacterSheetFixture,
  requireRight,
  spellSlotLevel,
  unitLibrary,
} from "./test-support.test-support.ts";
import { type CharacterSheetCreationObject } from "./sheet-types.ts";

type CreationSelectedIdentityDriverAction = "doCastCreation";

type CreationSelectedIdentityProjection = {
  readonly spellId: string;
  readonly spellSlotCost: "ordinary";
  readonly slotLevel: number;
  readonly slotExpended: number;
  readonly castingTimeMinutes: number;
  readonly rangeFeet: number;
  readonly maxCubeSideFeet: number;
  readonly objectCubeSideFeet: number;
  readonly durationMinutes: number;
  readonly materialComponentUse: "causes_other_spell_to_fail";
};

type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly CreationSelectedIdentityDriverAction[];
  readonly expected: CreationSelectedIdentityProjection;
};

type SelectedUnitIdentityReplay = {
  readonly taskId: "L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE";
  readonly unitId: "creation";
  readonly actions: readonly CreationSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE",
    unitId: "creation",
    actions: ["doCastCreation"],
    sequences: [
      {
        name: "selected-creation-slot-cast-returns-created-object-contract",
        actions: ["doCastCreation"],
        expected: expectedCreationProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Character Sheet runtime / Creation", () => {
  it("replays selected Unit identities deterministically", () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions = new Set<CreationSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        let projection: CreationSelectedIdentityProjection | undefined;

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          projection = creationSelectedIdentityActions[actionName]();
        }

        expect(projection, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  test("Creation spends a level-5 prepared spell slot and returns a created-object lifecycle contract", () => {
    const result = requireRight(
      castCreation({
        sheet: creationWizardSheet({
          preparedSpells: ["creation"],
          slots: 1,
        }),
        unitLibrary,
        object: mixedGemAndVegetableObject,
      }),
    );

    expect(result.invocation).toEqual({
      tag: "creation",
      spellId: "creation",
      spellLevel: 5,
      castLevel: spellSlotLevel(5),
      spellSlotCost: { kind: "ordinary", spellLevel: spellSlotLevel(5) },
      preparationRequirement: "prepared",
      requiredSpellAccess: "class_prepared",
      castingTime: { kind: "minutes", amount: 1 },
      rangeFeet: 30,
      maxCubeSideFeet: 5,
      object: mixedGemAndVegetableObject,
      objectDuration: { kind: "timeSpan", unit: "minute", amount: 10 },
      materialComponentUse: "causes_other_spell_to_fail",
    });
    expect(result.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 1 },
    ]);
  });

  test("Creation rejects oversized objects before spending a spell slot", () => {
    const sheet = creationWizardSheet({
      preparedSpells: ["creation"],
      slots: 1,
    });
    const result = castCreation({
      sheet,
      unitLibrary,
      object: { ...mixedGemAndVegetableObject, cubeSideFeet: 6 },
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe(
        "Creation object must fit inside the slot-scaled Cube.",
      );
    }
    expect(sheet.spellSlotExpenditures).toEqual([]);
  });

  test("Creation requires prepared class Spell Access", () => {
    const result = castCreation({
      sheet: creationWizardSheet({ preparedSpells: [], slots: 1 }),
      unitLibrary,
      object: mixedGemAndVegetableObject,
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe(
        "Creation requires prepared class Spell Access.",
      );
    }
  });
});

const creationSelectedIdentityActions = {
  doCastCreation: () => {
    const result = requireRight(
      castCreation({
        sheet: creationWizardSheet({
          preparedSpells: ["creation"],
          slots: 1,
        }),
        unitLibrary,
        object: mixedGemAndVegetableObject,
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
      maxCubeSideFeet: result.invocation.maxCubeSideFeet,
      objectCubeSideFeet: result.invocation.object.cubeSideFeet,
      durationMinutes: result.invocation.objectDuration.amount,
      materialComponentUse: result.invocation.materialComponentUse,
    };
  },
} as const satisfies Record<
  CreationSelectedIdentityDriverAction,
  () => CreationSelectedIdentityProjection
>;

const mixedGemAndVegetableObject = {
  objectId: requireRight(
    characterSheetCreationObjectId("object:shadow-gem-box"),
  ),
  materials: ["vegetable_matter", "gems"],
  formAndMaterialSeenByCaster: true,
  cubeSideFeet: 5,
} as const satisfies CharacterSheetCreationObject;

function expectedCreationProjection(): CreationSelectedIdentityProjection {
  return {
    spellId: "creation",
    spellSlotCost: "ordinary",
    slotLevel: 5,
    slotExpended: 1,
    castingTimeMinutes: 1,
    rangeFeet: 30,
    maxCubeSideFeet: 5,
    objectCubeSideFeet: 5,
    durationMinutes: 10,
    materialComponentUse: "causes_other_spell_to_fail",
  };
}

function creationWizardSheet(input: {
  readonly preparedSpells: readonly string[];
  readonly slots: number;
}) {
  return requireRight(
    rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:creation-wizard-9"),
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
              spellbook: [authoredUnitId("creation")],
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
