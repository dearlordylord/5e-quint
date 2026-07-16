// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.dream-session-invocation
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test table-caller.dream-communication-nightmare
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION dream
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION dream
// UNIT-IDENTITY-REPLAY: L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION dream doCastDream
import { describe, expect, it, test } from "vitest";

import {
  Either,
  Hp,
  armorClassBuild,
  castDream,
  characterSheetDreamMessengerId,
  characterSheetDreamTargetId,
  characterSheetId,
  completedDreamCasting,
  createFreshCharacterSheet,
  requireRight,
  spellSlotLevel,
  unitLibrary,
} from "./test-support.ts";
import {
  type CharacterSheetDreamMessenger,
  type CharacterSheetDreamMode,
  type CharacterSheetDreamTarget,
} from "./sheet-types.ts";

const dreamSelectedIdentityDriverSchema = {
  doCastDream: {},
} as const;

type DreamSelectedIdentityDriverAction =
  keyof typeof dreamSelectedIdentityDriverSchema;

type DreamSelectedIdentityProjection = {
  readonly spellId: string;
  readonly spellSlotCost: "ordinary";
  readonly slotLevel: number;
  readonly slotExpended: number;
  readonly castingMinutes: number;
  readonly durationHours: number;
  readonly targetPlane: "same_plane_as_caster";
  readonly messengerCondition: "incapacitated";
  readonly messengerSpeedFeet: 0;
  readonly saveAbility: "wis";
  readonly maxMessageWords: number;
  readonly restMutationOwner: "table";
  readonly damageType: "psychic";
};

type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly DreamSelectedIdentityDriverAction[];
  readonly expected: DreamSelectedIdentityProjection;
};

type SelectedUnitIdentityReplay = {
  readonly taskId: "L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION";
  readonly unitId: "dream";
  readonly actions: readonly DreamSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION",
    unitId: "dream",
    actions: ["doCastDream"],
    sequences: [
      {
        name: "selected-dream-slot-cast-returns-nightmare-rest-and-damage-contract",
        actions: ["doCastDream"],
        expected: expectedDreamProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Character Sheet runtime / Dream", () => {
  it("replays selected Unit identities deterministically", () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions = new Set<DreamSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        let projection: DreamSelectedIdentityProjection | undefined;

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          projection = dreamSelectedIdentityActions[actionName]();
        }

        expect(projection, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  test("Dream spends a level-5 prepared spell slot and returns a table-owned conversation contract", () => {
    const target = dreamTarget();
    const messenger = dreamMessenger();
    const result = requireRight(
      castDream({
        sheet: dreamWizardSheet({ preparedSpells: ["dream"], slots: 1 }),
        unitLibrary,
        casting: completedDreamCasting,
        target,
        messenger,
        mode: { tag: "conversation" },
      }),
    );

    expect(result.invocation).toEqual({
      tag: "dream",
      spellId: "dream",
      spellLevel: 5,
      spellSlotCost: { kind: "ordinary", spellLevel: spellSlotLevel(5) },
      preparationRequirement: "prepared",
      requiredSpellAccess: "class_prepared",
      castingTime: { kind: "minutes", amount: 1 },
      range: "special",
      duration: { kind: "timeSpan", unit: "hour", amount: 8 },
      materialComponents: { sand: "handful" },
      target,
      messenger,
      trance: {
        messengerCondition: "incapacitated",
        messengerSpeedFeet: 0,
        messengerCanEndAnyTime: true,
      },
      targetSleepContract: {
        targetMustBeSamePlaneCreatureKnownByCaster: true,
        sleepStateOwner: "table",
        awakeAtCastOptions: ["end_spell", "wait_for_sleep"],
      },
      messengerAppearance: { owner: "table" },
      mode: { tag: "conversation" },
      savingThrow: { tag: "notRequiredForConversation" },
      outcome: {
        tag: "conversation",
        targetRecall: "perfect_on_waking",
        dreamContentsOwner: "table",
        dreamDeliveryOwner: "table",
      },
    });
    expect(result.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 1 },
    ]);
  });

  test("Dream nightmare records the Wisdom save, no-rest-benefit, and wakeup Psychic damage contract", () => {
    const result = requireRight(
      castDream({
        sheet: dreamWizardSheet({ preparedSpells: ["dream"], slots: 1 }),
        unitLibrary,
        casting: completedDreamCasting,
        target: dreamTarget(),
        messenger: { tag: "caster" },
        mode: dreamNightmare({ savingThrowOutcome: { tag: "failed" } }),
      }),
    );

    expect(result.invocation.savingThrow).toEqual({
      tag: "requiredForNightmare",
      ability: "wis",
      dc: "caster_spell_save_dc",
      maxMessageWords: 10,
    });
    expect(result.invocation.outcome).toEqual({
      tag: "nightmareSaveFailed",
      restBenefitDenied: {
        timing: "target_rest",
        stateMutationOwner: "table",
      },
      damage: {
        diceCount: 3,
        dieSize: 6,
        damageType: "psychic",
        timing: "when_target_wakes",
        applicationOwner: "table",
      },
    });
    expect(result.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 1 },
    ]);
  });

  test("Dream nightmare successful saves do not deny rest benefits or apply damage", () => {
    const result = requireRight(
      castDream({
        sheet: dreamWizardSheet({ preparedSpells: ["dream"], slots: 1 }),
        unitLibrary,
        casting: completedDreamCasting,
        target: dreamTarget(),
        messenger: { tag: "caster" },
        mode: dreamNightmare({ savingThrowOutcome: { tag: "succeeded" } }),
      }),
    );

    expect(result.invocation.outcome).toEqual({
      tag: "nightmareSaveSucceeded",
      restBenefitDenied: false,
      damage: null,
    });
    expect(result.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 1 },
    ]);
  });

  test("Dream rejects invalid target eligibility before spending the spell slot", () => {
    const sheet = dreamWizardSheet({ preparedSpells: ["dream"], slots: 1 });
    const otherPlaneTarget = {
      ...dreamTarget(),
      plane: "different_plane",
    } as unknown as CharacterSheetDreamTarget;
    const result = castDream({
      sheet,
      unitLibrary,
      casting: completedDreamCasting,
      target: otherPlaneTarget,
      messenger: { tag: "caster" },
      mode: { tag: "conversation" },
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe(
        "Dream requires the target to be on the same plane as the caster.",
      );
    }
    expect(sheet.spellSlotExpenditures).toEqual([]);
  });

  test("Dream rejects nightmare messages over ten words before spending the spell slot", () => {
    const sheet = dreamWizardSheet({ preparedSpells: ["dream"], slots: 1 });
    const result = castDream({
      sheet,
      unitLibrary,
      casting: completedDreamCasting,
      target: dreamTarget(),
      messenger: { tag: "caster" },
      mode: {
        tag: "nightmare",
        messageWordCount: 11,
        savingThrowOutcome: { tag: "failed" },
      },
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe(
        "Dream nightmare message must be one to ten words.",
      );
    }
    expect(sheet.spellSlotExpenditures).toEqual([]);
  });

  test("Dream requires prepared class Spell Access", () => {
    const result = castDream({
      sheet: dreamWizardSheet({ preparedSpells: [], slots: 1 }),
      unitLibrary,
      casting: completedDreamCasting,
      target: dreamTarget(),
      messenger: { tag: "caster" },
      mode: { tag: "conversation" },
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe(
        "Dream requires prepared class Spell Access.",
      );
    }
  });
});

const dreamSelectedIdentityActions = {
  doCastDream: () => {
    const result = requireRight(
      castDream({
        sheet: dreamWizardSheet({ preparedSpells: ["dream"], slots: 1 }),
        unitLibrary,
        casting: completedDreamCasting,
        target: dreamTarget(),
        messenger: { tag: "caster" },
        mode: dreamNightmare({ savingThrowOutcome: { tag: "failed" } }),
      }),
    );
    if (result.invocation.savingThrow.tag !== "requiredForNightmare") {
      throw new Error("Expected Dream replay to require a nightmare save.");
    }
    if (result.invocation.outcome.tag !== "nightmareSaveFailed") {
      throw new Error("Expected Dream replay to return nightmare failure.");
    }
    return {
      spellId: result.invocation.spellId,
      spellSlotCost: result.invocation.spellSlotCost.kind,
      slotLevel: result.invocation.spellSlotCost.spellLevel,
      slotExpended:
        (result.sheet.spellSlotExpenditures ?? []).find(
          (slot) => slot.spellLevel === spellSlotLevel(5),
        )?.expended ?? 0,
      castingMinutes: result.invocation.castingTime.amount,
      durationHours: result.invocation.duration.amount,
      targetPlane: result.invocation.target.plane,
      messengerCondition: result.invocation.trance.messengerCondition,
      messengerSpeedFeet: result.invocation.trance.messengerSpeedFeet,
      saveAbility: result.invocation.savingThrow.ability,
      maxMessageWords: result.invocation.savingThrow.maxMessageWords,
      restMutationOwner:
        result.invocation.outcome.restBenefitDenied.stateMutationOwner,
      damageType: result.invocation.outcome.damage.damageType,
    };
  },
} as const satisfies Record<
  DreamSelectedIdentityDriverAction,
  () => DreamSelectedIdentityProjection
>;

function expectedDreamProjection(): DreamSelectedIdentityProjection {
  return {
    spellId: "dream",
    spellSlotCost: "ordinary",
    slotLevel: 5,
    slotExpended: 1,
    castingMinutes: 1,
    durationHours: 8,
    targetPlane: "same_plane_as_caster",
    messengerCondition: "incapacitated",
    messengerSpeedFeet: 0,
    saveAbility: "wis",
    maxMessageWords: 10,
    restMutationOwner: "table",
    damageType: "psychic",
  };
}

function dreamTarget(): CharacterSheetDreamTarget {
  return {
    targetId: requireRight(characterSheetDreamTargetId("dream-target:known")),
    knownByCaster: true,
    plane: "same_plane_as_caster",
    sleepStateOwner: "table",
  };
}

function dreamMessenger(): CharacterSheetDreamMessenger {
  return {
    tag: "willingTouchedCreature",
    messengerId: requireRight(
      characterSheetDreamMessengerId("dream-messenger:willing-ally"),
    ),
    willing: true,
    touchedByCaster: true,
  };
}

function dreamNightmare(input: {
  readonly savingThrowOutcome: Extract<
    CharacterSheetDreamMode,
    { readonly tag: "nightmare" }
  >["savingThrowOutcome"];
}): CharacterSheetDreamMode {
  return {
    tag: "nightmare",
    messageWordCount: 10,
    savingThrowOutcome: input.savingThrowOutcome,
  };
}

function dreamWizardSheet(input: {
  readonly preparedSpells: readonly string[];
  readonly slots: number;
}) {
  return requireRight(
    createFreshCharacterSheet({
      characterId: characterSheetId("character:dream-wizard-9"),
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
              spellbook: [],
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
      currentHp: Hp(30),
      tempHp: Hp(0),
      unitLibrary,
    }),
  );
}
