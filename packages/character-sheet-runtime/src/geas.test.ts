// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.geas-session-invocation
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test table-caller.geas-command-compliance
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION geas
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION geas
// UNIT-IDENTITY-REPLAY: L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION geas doCastGeas
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, it, test } from "vitest";

import {
  Either,
  Hp,
  armorClassBuild,
  castGeas,
  characterSheetGeasTargetId,
  characterSheetId,
  rebuildCharacterSheetFixture,
  requireRight,
  spellSlotLevel,
  unitLibrary,
} from "./test-support.test-support.ts";
import {
  type CharacterSheetGeasCommand,
  type CharacterSheetGeasSavingThrowOutcome,
  type CharacterSheetGeasTarget,
} from "./sheet-types.ts";

type GeasSelectedIdentityDriverAction = "doCastGeas";

type GeasSelectedIdentityProjection = {
  readonly spellId: string;
  readonly spellSlotCost: "ordinary";
  readonly slotLevel: number;
  readonly slotExpended: number;
  readonly castingMinutes: number;
  readonly rangeFeet: 60;
  readonly saveAbility: "wis";
  readonly condition: "charmed";
  readonly durationDays: number;
  readonly damageDice: "5d10";
  readonly damageType: "psychic";
  readonly damageFrequency: "once_per_day";
  readonly complianceOwner: "table";
};

type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly GeasSelectedIdentityDriverAction[];
  readonly expected: GeasSelectedIdentityProjection;
};

type SelectedUnitIdentityReplay = {
  readonly taskId: "L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION";
  readonly unitId: "geas";
  readonly actions: readonly GeasSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION",
    unitId: "geas",
    actions: ["doCastGeas"],
    sequences: [
      {
        name: "selected-geas-slot-cast-returns-charmed-command-contract",
        actions: ["doCastGeas"],
        expected: expectedGeasProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Character Sheet runtime / Geas", () => {
  it("replays selected Unit identities deterministically", () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions = new Set<GeasSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        let projection: GeasSelectedIdentityProjection | undefined;

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          projection = geasSelectedIdentityActions[actionName]();
        }

        expect(projection, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  test("Geas spends a prepared level-5 spell slot and returns the failed-save command contract", () => {
    const target = geasTarget({ savingThrowOutcome: { tag: "failed" } });
    const command = geasCommand();
    const result = requireRight(
      castGeas({
        sheet: geasWizardSheet({ preparedSpells: ["geas"], slots: 1 }),
        unitLibrary,
        target,
        command,
      }),
    );

    expect(result.invocation).toEqual({
      tag: "geas",
      spellId: "geas",
      spellLevel: 5,
      spellSlotCost: { kind: "ordinary", spellLevel: spellSlotLevel(5) },
      preparationRequirement: "prepared",
      requiredSpellAccess: "class_prepared",
      castingTime: { kind: "minutes", amount: 1 },
      rangeFeet: 60,
      components: ["v"],
      target,
      command,
      savingThrow: {
        ability: "wis",
        dc: "caster_spell_save_dc",
        automaticSuccessIfTargetCannotUnderstandCommand: true,
      },
      outcome: {
        tag: "savingThrowFailed",
        affected: true,
        condition: "charmed",
        duration: { kind: "timeSpan", unit: "day", amount: 30 },
        commandCompliance: {
          commandContentOwner: "table",
          counterCommandAdjudicationOwner: "table",
        },
        damage: {
          diceCount: 5,
          dieSize: 10,
          damageType: "psychic",
          trigger: "acts_directly_counter_to_command",
          maxFrequency: "once_per_day",
          applicationOwner: "table",
        },
        endedBySpells: ["remove_curse", "greater_restoration", "wish"],
      },
    });
    expect(result.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 1 },
    ]);
  });

  test("Geas returns no effect when the target cannot understand the command", () => {
    const result = requireRight(
      castGeas({
        sheet: geasWizardSheet({ preparedSpells: ["geas"], slots: 1 }),
        unitLibrary,
        target: geasTargetCannotUnderstand(),
        command: geasCommand(),
      }),
    );

    expect(result.invocation.outcome).toEqual({
      tag: "targetCannotUnderstandCommand",
      affected: false,
      automaticSuccess: true,
    });
    expect(result.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 1 },
    ]);
  });

  test("Geas ends immediately when the table marks the command as suicidal", () => {
    const result = requireRight(
      castGeas({
        sheet: geasWizardSheet({ preparedSpells: ["geas"], slots: 1 }),
        unitLibrary,
        target: geasTarget({ savingThrowOutcome: { tag: "failed" } }),
        command: geasCommand({ tag: "suicidalCommand", certainDeath: true }),
      }),
    );

    expect(result.invocation.outcome).toEqual({
      tag: "spellEndedBySuicidalCommand",
      affected: false,
      endReason: "suicidal_command",
      adjudicationOwner: "table",
    });
    expect(result.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 1 },
    ]);
  });

  test("Geas leaves a target unaffected after a successful save", () => {
    const result = requireRight(
      castGeas({
        sheet: geasWizardSheet({ preparedSpells: ["geas"], slots: 1 }),
        unitLibrary,
        target: geasTarget({ savingThrowOutcome: { tag: "succeeded" } }),
        command: geasCommand(),
      }),
    );

    expect(result.invocation.outcome).toEqual({
      tag: "savingThrowSucceeded",
      affected: false,
    });
  });

  test("Geas rejects empty commands before spending the spell slot", () => {
    const sheet = geasWizardSheet({ preparedSpells: ["geas"], slots: 1 });
    const result = castGeas({
      sheet,
      unitLibrary,
      target: geasTarget({ savingThrowOutcome: { tag: "failed" } }),
      command: geasCommand({ commandText: "   " }),
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe("Geas requires a nonempty command.");
    }
    expect(sheet.spellSlotExpenditures).toEqual([]);
  });

  test("Geas requires prepared class Spell Access", () => {
    const result = castGeas({
      sheet: geasWizardSheet({ preparedSpells: [], slots: 1 }),
      unitLibrary,
      target: geasTarget({ savingThrowOutcome: { tag: "failed" } }),
      command: geasCommand(),
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe(
        "Geas requires prepared class Spell Access.",
      );
    }
  });
});

const geasSelectedIdentityActions = {
  doCastGeas: () => {
    const result = requireRight(
      castGeas({
        sheet: geasWizardSheet({ preparedSpells: ["geas"], slots: 1 }),
        unitLibrary,
        target: geasTarget({ savingThrowOutcome: { tag: "failed" } }),
        command: geasCommand(),
      }),
    );
    if (result.invocation.outcome.tag !== "savingThrowFailed") {
      throw new Error("Expected Geas replay to return failed-save outcome.");
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
      rangeFeet: result.invocation.rangeFeet,
      saveAbility: result.invocation.savingThrow.ability,
      condition: result.invocation.outcome.condition,
      durationDays: result.invocation.outcome.duration.amount,
      damageDice:
        `${result.invocation.outcome.damage.diceCount}d${result.invocation.outcome.damage.dieSize}` as const,
      damageType: result.invocation.outcome.damage.damageType,
      damageFrequency: result.invocation.outcome.damage.maxFrequency,
      complianceOwner:
        result.invocation.outcome.commandCompliance.commandContentOwner,
    };
  },
} as const satisfies Record<
  GeasSelectedIdentityDriverAction,
  () => GeasSelectedIdentityProjection
>;

function expectedGeasProjection(): GeasSelectedIdentityProjection {
  return {
    spellId: "geas",
    spellSlotCost: "ordinary",
    slotLevel: 5,
    slotExpended: 1,
    castingMinutes: 1,
    rangeFeet: 60,
    saveAbility: "wis",
    condition: "charmed",
    durationDays: 30,
    damageDice: "5d10",
    damageType: "psychic",
    damageFrequency: "once_per_day",
    complianceOwner: "table",
  };
}

function geasTarget(input: {
  readonly savingThrowOutcome: CharacterSheetGeasSavingThrowOutcome;
}): CharacterSheetGeasTarget {
  return {
    targetId: requireRight(characterSheetGeasTargetId("geas-target:known")),
    visibleByCaster: true,
    withinRangeFeet: 60,
    understandsCommand: true,
    savingThrowOutcome: input.savingThrowOutcome,
  };
}

function geasTargetCannotUnderstand(): CharacterSheetGeasTarget {
  return {
    targetId: requireRight(
      characterSheetGeasTargetId("geas-target:no-language"),
    ),
    visibleByCaster: true,
    withinRangeFeet: 60,
    understandsCommand: false,
  };
}

function geasCommand(
  input: Partial<CharacterSheetGeasCommand> = {},
): CharacterSheetGeasCommand {
  if (input.tag === "suicidalCommand") {
    return {
      tag: "suicidalCommand",
      commandText: input.commandText ?? "Leap into certain death.",
      certainDeath: true,
      adjudicationOwner: "table",
    };
  }
  return {
    tag: "validCommand",
    commandText: input.commandText ?? "Guard this gate and admit no intruders.",
    certainDeath: false,
    adjudicationOwner: "table",
  };
}

function geasWizardSheet(input: {
  readonly preparedSpells: readonly string[];
  readonly slots: number;
}) {
  return requireRight(
    rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:geas-wizard-9"),
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
