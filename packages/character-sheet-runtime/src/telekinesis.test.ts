// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.telekinesis-session-invocation
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test table-caller.telekinesis-force-control
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-02-L5-SAVE-CONDITION-CONTROL telekinesis
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L19E-02-L5-SAVE-CONDITION-CONTROL telekinesis
// UNIT-IDENTITY-REPLAY: L19E-02-L5-SAVE-CONDITION-CONTROL telekinesis doCastTelekinesis
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, it, test } from "vitest";

import {
  Either,
  Hp,
  armorClassBuild,
  castTelekinesis,
  characterSheetId,
  characterSheetTelekinesisTargetId,
  rebuildCharacterSheetFixture,
  requireRight,
  spellSlotLevel,
  unitLibrary,
} from "./test-support.test-support.ts";
import { type CharacterSheetTelekinesisTarget } from "./sheet-types.ts";

type TelekinesisSelectedIdentityDriverAction = "doCastTelekinesis";

type TelekinesisSelectedIdentityProjection = {
  readonly spellId: string;
  readonly spellSlotCost: "ordinary";
  readonly slotLevel: number;
  readonly slotExpended: number;
  readonly rangeFeet: number;
  readonly durationMinutes: number;
  readonly effectTag: string;
  readonly laterTurnAction: "magic_action";
};

type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly TelekinesisSelectedIdentityDriverAction[];
  readonly expected: TelekinesisSelectedIdentityProjection;
};

type SelectedUnitIdentityReplay = {
  readonly taskId: "L19E-02-L5-SAVE-CONDITION-CONTROL";
  readonly unitId: "telekinesis";
  readonly actions: readonly TelekinesisSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L19E-02-L5-SAVE-CONDITION-CONTROL",
    unitId: "telekinesis",
    actions: ["doCastTelekinesis"],
    sequences: [
      {
        name: "selected-telekinesis-slot-cast-returns-force-control-contract",
        actions: ["doCastTelekinesis"],
        expected: expectedTelekinesisProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Character Sheet runtime / Telekinesis", () => {
  it("replays selected Unit identities deterministically", () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<TelekinesisSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        let projection: TelekinesisSelectedIdentityProjection | undefined;

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          projection = telekinesisSelectedIdentityActions[actionName]();
        }

        expect(projection, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  test("Telekinesis spends a prepared level-5 spell slot and returns creature control facts", () => {
    const result = requireRight(
      castTelekinesis({
        sheet: telekinesisWizardSheet({
          preparedSpells: ["telekinesis"],
          slots: 1,
        }),
        unitLibrary,
        target: failedCreatureTarget,
      }),
    );

    expect(result.invocation).toEqual({
      tag: "telekinesis",
      spellId: "telekinesis",
      spellLevel: 5,
      spellSlotCost: { kind: "ordinary", spellLevel: spellSlotLevel(5) },
      preparationRequirement: "prepared",
      requiredSpellAccess: "class_prepared",
      castingTime: { kind: "action" },
      rangeFeet: 60,
      duration: { kind: "timeSpan", unit: "minute", amount: 10 },
      concentrationRequired: true,
      target: failedCreatureTarget,
      savingThrow: {
        creatureOrCarrierAbility: "str",
        dc: "caster_spell_save_dc",
      },
      initialExertion: {
        tag: "creatureSaveFailed",
        forceMoveUpToFeet: 30,
        movementDirection: "any_direction",
        condition: "restrained",
        conditionDuration: "until_end_of_caster_next_turn",
        suspendedIfLifted: true,
        fallsUnlessReapplied: true,
        tablePlacementOwner: "table",
      },
      laterTurnControl: {
        action: "magic_action",
        mayChooseNewVisibleTargetWithinRange: true,
        availableModes: [
          "creature",
          "unattended_object",
          "worn_or_carried_object",
          "fine_object_control",
        ],
      },
    });
    expect(result.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 1 },
    ]);
  });

  test("Telekinesis returns table-owned object movement and fine-control contracts", () => {
    const unattended = requireRight(
      castTelekinesis({
        sheet: telekinesisWizardSheet({
          preparedSpells: ["telekinesis"],
          slots: 2,
        }),
        unitLibrary,
        target: unattendedObjectTarget,
      }),
    );
    expect(unattended.invocation.initialExertion).toEqual({
      tag: "moveUnattendedObject",
      moveUpToFeet: 30,
      tableObjectOwner: "table",
    });

    const fineControl = requireRight(
      castTelekinesis({
        sheet: unattended.sheet,
        unitLibrary,
        target: fineObjectTarget,
      }),
    );
    expect(fineControl.invocation.initialExertion).toEqual({
      tag: "fineObjectControl",
      tableObjectOwner: "table",
    });
    expect(fineControl.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 2 },
    ]);
  });

  test("Telekinesis rejects invalid target facts before spending a spell slot", () => {
    const sheet = telekinesisWizardSheet({
      preparedSpells: ["telekinesis"],
      slots: 1,
    });
    const result = castTelekinesis({
      sheet,
      unitLibrary,
      target: {
        ...failedCreatureTarget,
        visibleWithinRange: false as true,
      },
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe(
        "Telekinesis target must be visible within 60 feet.",
      );
    }
    expect(sheet.spellSlotExpenditures).toEqual([]);
  });

  test("Telekinesis requires prepared class Spell Access", () => {
    const result = castTelekinesis({
      sheet: telekinesisWizardSheet({ preparedSpells: [], slots: 1 }),
      unitLibrary,
      target: failedCreatureTarget,
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe(
        "Telekinesis requires prepared class Spell Access.",
      );
    }
  });
});

const telekinesisSelectedIdentityActions = {
  doCastTelekinesis: () => {
    const result = requireRight(
      castTelekinesis({
        sheet: telekinesisWizardSheet({
          preparedSpells: ["telekinesis"],
          slots: 1,
        }),
        unitLibrary,
        target: failedCreatureTarget,
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
      durationMinutes: result.invocation.duration.amount,
      effectTag: result.invocation.initialExertion.tag,
      laterTurnAction: result.invocation.laterTurnControl.action,
    };
  },
} as const satisfies Record<
  TelekinesisSelectedIdentityDriverAction,
  () => TelekinesisSelectedIdentityProjection
>;

const failedCreatureTarget = {
  tag: "creature",
  targetId: requireRight(
    characterSheetTelekinesisTargetId("creature:huge-or-smaller"),
  ),
  visibleWithinRange: true,
  hugeOrSmaller: true,
  savingThrowOutcome: { tag: "failed" },
} as const satisfies CharacterSheetTelekinesisTarget;

const unattendedObjectTarget = {
  tag: "unattendedObject",
  objectId: requireRight(characterSheetTelekinesisTargetId("object:statue")),
  visibleWithinRange: true,
  hugeOrSmaller: true,
} as const satisfies CharacterSheetTelekinesisTarget;

const fineObjectTarget = {
  tag: "fineObjectControl",
  objectId: requireRight(characterSheetTelekinesisTargetId("object:lock")),
  visibleWithinRange: true,
} as const satisfies CharacterSheetTelekinesisTarget;

function expectedTelekinesisProjection(): TelekinesisSelectedIdentityProjection {
  return {
    spellId: "telekinesis",
    spellSlotCost: "ordinary",
    slotLevel: 5,
    slotExpended: 1,
    rangeFeet: 60,
    durationMinutes: 10,
    effectTag: "creatureSaveFailed",
    laterTurnAction: "magic_action",
  };
}

function telekinesisWizardSheet(input: {
  readonly preparedSpells: readonly string[];
  readonly slots: number;
}) {
  return requireRight(
    rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:telekinesis-wizard-9"),
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
              spellbook: [authoredUnitId("telekinesis")],
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
