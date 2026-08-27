// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.mislead-session-invocation
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test table-caller.mislead-illusion-remote-senses
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION mislead
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION mislead
// UNIT-IDENTITY-REPLAY: L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION mislead doCastMislead
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, it } from "vitest";

import {
  Result,
  Hp,
  armorClassBuild,
  castMislead,
  characterSheetId,
  rebuildCharacterSheetFixture,
  requireSuccess,
  spellSlotLevel,
  unitLibrary,
} from "./test-support.test-support.ts";

type MisleadSelectedIdentityDriverAction = "doCastMislead";

type MisleadSelectedIdentityProjection = {
  readonly spellId: string;
  readonly spellSlotCost: "ordinary";
  readonly slotLevel: number;
  readonly slotExpended: number;
  readonly castingTime: "action";
  readonly range: "self";
  readonly components: readonly ["s"];
  readonly condition: "invisible";
  readonly durationHours: number;
  readonly doubleMoveFeet: number;
  readonly movementAction: "magic";
  readonly remoteSight: "through_double_eyes";
  readonly remoteHearing: "through_double_ears";
  readonly tableOwner: "table";
};

type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly MisleadSelectedIdentityDriverAction[];
  readonly expected: MisleadSelectedIdentityProjection;
};

type SelectedUnitIdentityReplay = {
  readonly taskId: "L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION";
  readonly unitId: "mislead";
  readonly actions: readonly MisleadSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION",
    unitId: "mislead",
    actions: ["doCastMislead"],
    sequences: [
      {
        name: "selected-mislead-slot-cast-returns-double-contract",
        actions: ["doCastMislead"],
        expected: expectedMisleadProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Character Sheet runtime / Mislead", () => {
  it("replays selected Unit identities deterministically", () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions = new Set<MisleadSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        let projection: MisleadSelectedIdentityProjection | undefined;

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          projection = misleadSelectedIdentityActions[actionName]();
        }

        expect(projection, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("spends a prepared level-5 spell slot and returns the invisible-double contract", () => {
    const result = requireSuccess(
      castMislead({
        sheet: misleadWizardSheet({ preparedSpells: ["mislead"], slots: 1 }),
        unitLibrary,
        casting: { casterSpeedFeet: 30 },
      }),
    );

    expect(result.invocation).toEqual({
      tag: "mislead",
      spellId: "mislead",
      spellLevel: 5,
      spellSlotCost: { kind: "ordinary", spellLevel: spellSlotLevel(5) },
      preparationRequirement: "prepared",
      requiredSpellAccess: "class_prepared",
      castingTime: { kind: "action" },
      range: "self",
      components: ["s"],
      concentration: {
        upTo: { kind: "timeSpan", unit: "hour", amount: 1 },
        doubleDurationMatchesConcentration: true,
      },
      invisibility: {
        condition: "invisible",
        startsWhenDoubleAppears: true,
        earlyEnd: [
          "caster_makes_attack_roll",
          "caster_deals_damage",
          "caster_casts_spell",
        ],
      },
      illusoryDouble: {
        appearsWhereCasterStands: true,
        tangible: false,
        invulnerable: true,
        movementControl: {
          action: "magic",
          maxDistanceFeet: 60,
          basedOnCasterSpeedMultiplier: 2,
          movementPathOwner: "table",
        },
        behaviorControl: {
          gesturesSpeaksAndBehavesAsCasterChooses: true,
          behaviorRenderingOwner: "table",
        },
        remoteSenses: {
          sight: "through_double_eyes",
          hearing: "through_double_ears",
          asIfLocatedAtDouble: true,
          sensoryContentsOwner: "table",
        },
        mapPlacementOwner: "table",
      },
    });
    expect(result.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 1 },
    ]);
  });

  it("rejects invalid caster Speed before spending the spell slot", () => {
    const sheet = misleadWizardSheet({ preparedSpells: ["mislead"], slots: 1 });
    const result = castMislead({
      sheet,
      unitLibrary,
      casting: { casterSpeedFeet: 0 },
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure.message).toBe(
        "Mislead requires a positive caster Speed.",
      );
    }
    expect(sheet.spellSlotExpenditures).toEqual([]);
  });

  it("requires prepared class Spell Access", () => {
    const result = castMislead({
      sheet: misleadWizardSheet({ preparedSpells: [], slots: 1 }),
      unitLibrary,
      casting: { casterSpeedFeet: 30 },
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure.message).toBe(
        "Mislead requires prepared class Spell Access.",
      );
    }
  });
});

const misleadSelectedIdentityActions = {
  doCastMislead: () => {
    const result = requireSuccess(
      castMislead({
        sheet: misleadWizardSheet({ preparedSpells: ["mislead"], slots: 1 }),
        unitLibrary,
        casting: { casterSpeedFeet: 30 },
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
      castingTime: result.invocation.castingTime.kind,
      range: result.invocation.range,
      components: result.invocation.components,
      condition: result.invocation.invisibility.condition,
      durationHours: result.invocation.concentration.upTo.amount,
      doubleMoveFeet:
        result.invocation.illusoryDouble.movementControl.maxDistanceFeet,
      movementAction: result.invocation.illusoryDouble.movementControl.action,
      remoteSight: result.invocation.illusoryDouble.remoteSenses.sight,
      remoteHearing: result.invocation.illusoryDouble.remoteSenses.hearing,
      tableOwner: result.invocation.illusoryDouble.mapPlacementOwner,
    };
  },
} as const satisfies Record<
  MisleadSelectedIdentityDriverAction,
  () => MisleadSelectedIdentityProjection
>;

function expectedMisleadProjection(): MisleadSelectedIdentityProjection {
  return {
    spellId: "mislead",
    spellSlotCost: "ordinary",
    slotLevel: 5,
    slotExpended: 1,
    castingTime: "action",
    range: "self",
    components: ["s"],
    condition: "invisible",
    durationHours: 1,
    doubleMoveFeet: 60,
    movementAction: "magic",
    remoteSight: "through_double_eyes",
    remoteHearing: "through_double_ears",
    tableOwner: "table",
  };
}

function misleadWizardSheet(input: {
  readonly preparedSpells: readonly string[];
  readonly slots: number;
}) {
  return requireSuccess(
    rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:mislead-wizard-9"),
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
