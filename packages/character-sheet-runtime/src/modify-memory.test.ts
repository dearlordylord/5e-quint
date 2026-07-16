// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.modify-memory-session-invocation
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test table-caller.modify-memory-edit-contract
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION modify_memory
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION modify_memory
// UNIT-IDENTITY-REPLAY: L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION modify_memory doCastModifyMemory
import { describe, expect, it } from "vitest";

import {
  Either,
  Hp,
  armorClassBuild,
  castModifyMemory,
  characterSheetId,
  characterSheetModifyMemoryTargetId,
  createFreshCharacterSheet,
  requireRight,
  spellSlotLevel,
  unitLibrary,
} from "./test-support.ts";
import {
  type CharacterSheetModifyMemoryMemoryEdit,
  type CharacterSheetModifyMemoryTarget,
} from "./sheet-types.ts";

const modifyMemorySelectedIdentityDriverSchema = {
  doCastModifyMemory: {},
} as const;

type ModifyMemorySelectedIdentityDriverAction =
  keyof typeof modifyMemorySelectedIdentityDriverSchema;

type ModifyMemorySelectedIdentityProjection = {
  readonly spellId: string;
  readonly spellSlotCost: "ordinary";
  readonly slotLevel: number;
  readonly slotExpended: number;
  readonly castingTime: "action";
  readonly rangeFeet: 30;
  readonly saveAbility: "wis";
  readonly saveAdvantageIfFighting: true;
  readonly conditions: readonly ["charmed", "incapacitated"];
  readonly durationMinutes: number;
  readonly memoryWindowHours: 24;
  readonly memoryDurationMinutes: 10;
  readonly takesHold: "when_spell_ends";
  readonly behaviorOwner: "table";
};

type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly ModifyMemorySelectedIdentityDriverAction[];
  readonly expected: ModifyMemorySelectedIdentityProjection;
};

type SelectedUnitIdentityReplay = {
  readonly taskId: "L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION";
  readonly unitId: "modify_memory";
  readonly actions: readonly ModifyMemorySelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION",
    unitId: "modify_memory",
    actions: ["doCastModifyMemory"],
    sequences: [
      {
        name: "selected-modify-memory-slot-cast-returns-memory-contract",
        actions: ["doCastModifyMemory"],
        expected: expectedModifyMemoryProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Character Sheet runtime / Modify Memory", () => {
  it("replays selected Unit identities deterministically", () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<ModifyMemorySelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        let projection: ModifyMemorySelectedIdentityProjection | undefined;

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          projection = modifyMemorySelectedIdentityActions[actionName]();
        }

        expect(projection, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("spends a prepared level-5 spell slot and returns the failed-save memory-edit contract", () => {
    const target = modifyMemoryTarget({
      savingThrowOutcome: { tag: "failed" },
    });
    const memoryEdit = modifyMemoryEdit();
    const result = requireRight(
      castModifyMemory({
        sheet: modifyMemoryWizardSheet({
          preparedSpells: ["modify_memory"],
          slots: 1,
        }),
        unitLibrary,
        target,
        memoryEdit,
      }),
    );

    expect(result.invocation).toEqual({
      tag: "modify_memory",
      spellId: "modify_memory",
      spellLevel: 5,
      spellSlotCost: { kind: "ordinary", spellLevel: spellSlotLevel(5) },
      preparationRequirement: "prepared",
      requiredSpellAccess: "class_prepared",
      castingTime: { kind: "action" },
      rangeFeet: 30,
      components: ["v", "s"],
      concentration: {
        upTo: { kind: "timeSpan", unit: "minute", amount: 1 },
        earlyEnd: ["target_takes_damage", "targeted_by_another_spell"],
        noMemoryModifiedOnEarlyEnd: true,
      },
      target,
      memoryEdit,
      savingThrow: {
        ability: "wis",
        dc: "caster_spell_save_dc",
        advantageIfFightingCaster: true,
      },
      charmState: {
        conditions: ["charmed", "incapacitated"],
        unawareOfSurroundings: true,
        canHearCaster: true,
      },
      outcome: {
        tag: "memoryModified",
        affected: true,
        conditionsDuringSpell: ["charmed", "incapacitated"],
        memoryAltered: true,
        takesHold: "when_spell_ends",
        restoredBySpells: ["remove_curse", "greater_restoration"],
        behaviorConsequenceOwner: "table",
        nonsensicalMemoryAdjudicationOwner: "table",
      },
    });
    expect(result.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 1 },
    ]);
  });

  it("returns no effect when the Wisdom Saving Throw succeeds", () => {
    const result = requireRight(
      castModifyMemory({
        sheet: modifyMemoryWizardSheet({
          preparedSpells: ["modify_memory"],
          slots: 1,
        }),
        unitLibrary,
        target: modifyMemoryTarget({
          savingThrowOutcome: { tag: "succeeded" },
        }),
        memoryEdit: modifyMemoryEdit(),
      }),
    );

    expect(result.invocation.outcome).toEqual({
      tag: "savingThrowSucceeded",
      affected: false,
    });
    expect(result.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 1 },
    ]);
  });

  it("keeps the spell conditions but does not alter memory when the target cannot understand", () => {
    const result = requireRight(
      castModifyMemory({
        sheet: modifyMemoryWizardSheet({
          preparedSpells: ["modify_memory"],
          slots: 1,
        }),
        unitLibrary,
        target: modifyMemoryTarget({
          savingThrowOutcome: { tag: "failed" },
          understandsCasterLanguage: false,
        }),
        memoryEdit: modifyMemoryEdit(),
      }),
    );

    expect(result.invocation.outcome).toEqual({
      tag: "targetCannotUnderstandLanguage",
      affected: true,
      conditionsDuringSpell: ["charmed", "incapacitated"],
      memoryAltered: false,
      reason: "target_cannot_understand_spoken_description",
    });
  });

  it("does not alter memory when the description is incomplete before spell end", () => {
    const result = requireRight(
      castModifyMemory({
        sheet: modifyMemoryWizardSheet({
          preparedSpells: ["modify_memory"],
          slots: 1,
        }),
        unitLibrary,
        target: modifyMemoryTarget({ savingThrowOutcome: { tag: "failed" } }),
        memoryEdit: modifyMemoryEdit({
          descriptionCompleteBeforeSpellEnd: false,
        }),
      }),
    );

    expect(result.invocation.outcome).toEqual({
      tag: "descriptionIncomplete",
      affected: true,
      conditionsDuringSpell: ["charmed", "incapacitated"],
      memoryAltered: false,
      reason: "spell_ended_before_description_complete",
    });
  });

  it("rejects invalid target eligibility before spending the spell slot", () => {
    const sheet = modifyMemoryWizardSheet({
      preparedSpells: ["modify_memory"],
      slots: 1,
    });
    const outOfRangeTarget = {
      ...modifyMemoryTarget({ savingThrowOutcome: { tag: "failed" } }),
      withinRangeFeet: 60,
    } as unknown as CharacterSheetModifyMemoryTarget;
    const result = castModifyMemory({
      sheet,
      unitLibrary,
      target: outOfRangeTarget,
      memoryEdit: modifyMemoryEdit(),
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe(
        "Modify Memory targets must be visible creatures within 30 feet.",
      );
    }
    expect(sheet.spellSlotExpenditures).toEqual([]);
  });

  it("rejects unsupported higher-slot memory windows before spending the spell slot", () => {
    const sheet = modifyMemoryWizardSheet({
      preparedSpells: ["modify_memory"],
      slots: 1,
    });
    const unsupportedMemoryEdit = {
      ...modifyMemoryEdit(),
      eventAgeHoursMax: 24 * 7,
    } as unknown as CharacterSheetModifyMemoryMemoryEdit;
    const result = castModifyMemory({
      sheet,
      unitLibrary,
      target: modifyMemoryTarget({ savingThrowOutcome: { tag: "failed" } }),
      memoryEdit: unsupportedMemoryEdit,
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe(
        "Modify Memory level-5 support requires an event within the last 24 hours.",
      );
    }
    expect(sheet.spellSlotExpenditures).toEqual([]);
  });

  it("requires prepared class Spell Access", () => {
    const result = castModifyMemory({
      sheet: modifyMemoryWizardSheet({ preparedSpells: [], slots: 1 }),
      unitLibrary,
      target: modifyMemoryTarget({ savingThrowOutcome: { tag: "failed" } }),
      memoryEdit: modifyMemoryEdit(),
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe(
        "Modify Memory requires prepared class Spell Access.",
      );
    }
  });
});

const modifyMemorySelectedIdentityActions = {
  doCastModifyMemory: () => {
    const result = requireRight(
      castModifyMemory({
        sheet: modifyMemoryWizardSheet({
          preparedSpells: ["modify_memory"],
          slots: 1,
        }),
        unitLibrary,
        target: modifyMemoryTarget({ savingThrowOutcome: { tag: "failed" } }),
        memoryEdit: modifyMemoryEdit(),
      }),
    );
    if (result.invocation.outcome.tag !== "memoryModified") {
      throw new Error(
        "Expected Modify Memory replay to return memory-modified outcome.",
      );
    }
    return {
      spellId: result.invocation.spellId,
      spellSlotCost: result.invocation.spellSlotCost.kind,
      slotLevel: result.invocation.spellSlotCost.spellLevel,
      slotExpended:
        (result.sheet.spellSlotExpenditures ?? []).find(
          (slot) => slot.spellLevel === spellSlotLevel(5),
        )?.expended ?? 0,
      castingTime: result.invocation.castingTime.kind,
      rangeFeet: result.invocation.rangeFeet,
      saveAbility: result.invocation.savingThrow.ability,
      saveAdvantageIfFighting:
        result.invocation.savingThrow.advantageIfFightingCaster,
      conditions: result.invocation.charmState.conditions,
      durationMinutes: result.invocation.concentration.upTo.amount,
      memoryWindowHours: result.invocation.memoryEdit.eventAgeHoursMax,
      memoryDurationMinutes:
        result.invocation.memoryEdit.eventDurationMinutesMax,
      takesHold: result.invocation.outcome.takesHold,
      behaviorOwner: result.invocation.outcome.behaviorConsequenceOwner,
    };
  },
} as const satisfies Record<
  ModifyMemorySelectedIdentityDriverAction,
  () => ModifyMemorySelectedIdentityProjection
>;

function expectedModifyMemoryProjection(): ModifyMemorySelectedIdentityProjection {
  return {
    spellId: "modify_memory",
    spellSlotCost: "ordinary",
    slotLevel: 5,
    slotExpended: 1,
    castingTime: "action",
    rangeFeet: 30,
    saveAbility: "wis",
    saveAdvantageIfFighting: true,
    conditions: ["charmed", "incapacitated"],
    durationMinutes: 1,
    memoryWindowHours: 24,
    memoryDurationMinutes: 10,
    takesHold: "when_spell_ends",
    behaviorOwner: "table",
  };
}

function modifyMemoryTarget(
  input: Partial<CharacterSheetModifyMemoryTarget> & {
    readonly savingThrowOutcome: CharacterSheetModifyMemoryTarget["savingThrowOutcome"];
  },
): CharacterSheetModifyMemoryTarget {
  return {
    targetId: requireRight(
      characterSheetModifyMemoryTargetId("modify-memory-target:known"),
    ),
    visibleByCaster: true,
    withinRangeFeet: 30,
    fightingCaster: input.fightingCaster ?? false,
    understandsCasterLanguage: input.understandsCasterLanguage ?? true,
    savingThrowOutcome: input.savingThrowOutcome,
  };
}

function modifyMemoryEdit(
  input: Partial<CharacterSheetModifyMemoryMemoryEdit> = {},
): CharacterSheetModifyMemoryMemoryEdit {
  return {
    eventAgeHoursMax: input.eventAgeHoursMax ?? 24,
    eventDurationMinutesMax: input.eventDurationMinutesMax ?? 10,
    changeKind: input.changeKind ?? "change_details",
    spokenDescription:
      input.spokenDescription ??
      "You remember the guard waving you through this gate yesterday.",
    descriptionCompleteBeforeSpellEnd:
      input.descriptionCompleteBeforeSpellEnd ?? true,
    behaviorConsequenceOwner: input.behaviorConsequenceOwner ?? "table",
    nonsensicalMemoryAdjudicationOwner:
      input.nonsensicalMemoryAdjudicationOwner ?? "table",
  };
}

function modifyMemoryWizardSheet(input: {
  readonly preparedSpells: readonly string[];
  readonly slots: number;
}) {
  return requireRight(
    createFreshCharacterSheet({
      characterId: characterSheetId("character:modify-memory-wizard-9"),
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
