// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.arcane-hand-session-invocation
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test table-caller.arcane-hand-object-lifecycle
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE arcane_hand
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE arcane_hand
// UNIT-IDENTITY-REPLAY: L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE arcane_hand doCastArcaneHand
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, it } from "vitest";

import {
  Either,
  Hp,
  armorClassBuild,
  castArcaneHand,
  characterSheetArcaneHandObjectId,
  characterSheetHitPointMaximum,
  characterSheetId,
  rebuildCharacterSheetFixture,
  requireRight,
  spellSlotLevel,
  unitLibrary,
} from "./test-support.ts";
import type { CharacterSheet } from "./index.ts";
import { type CharacterSheetArcaneHandSpace } from "./sheet-types.ts";

type ArcaneHandSelectedIdentityDriverAction = "doCastArcaneHand";

type ArcaneHandSelectedIdentityProjection = {
  readonly spellId: string;
  readonly spellSlotCost: "ordinary";
  readonly slotLevel: number;
  readonly slotExpended: number;
  readonly rangeFeet: number;
  readonly durationMinutes: number;
  readonly handArmorClass: number;
  readonly handHitPointMaximum: number;
  readonly occupiesSpace: false;
  readonly laterTurnAction: "bonus_action";
  readonly moveDistanceFeet: number;
  readonly clenchedFistDamageDice: "5d8";
  readonly forcefulHandSave: "str";
  readonly graspingHandSave: "dex";
  readonly interposingCover: "half_cover";
  readonly tableOwner: "table";
};

type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly ArcaneHandSelectedIdentityDriverAction[];
  readonly expected: ArcaneHandSelectedIdentityProjection;
};

type SelectedUnitIdentityReplay = {
  readonly taskId: "L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE";
  readonly unitId: "arcane_hand";
  readonly actions: readonly ArcaneHandSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE",
    unitId: "arcane_hand",
    actions: ["doCastArcaneHand"],
    sequences: [
      {
        name: "selected-arcane-hand-slot-cast-returns-object-contract",
        actions: ["doCastArcaneHand"],
        expected: expectedArcaneHandProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Character Sheet runtime / Arcane Hand", () => {
  it("replays selected Unit identities deterministically", () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions = new Set<ArcaneHandSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        let projection: ArcaneHandSelectedIdentityProjection | undefined;

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          projection = arcaneHandSelectedIdentityActions[actionName]();
        }

        expect(projection, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("spends a prepared level-5 spell slot and returns the magical hand lifecycle contract", () => {
    const sheet = arcaneHandWizardSheet({
      preparedSpells: ["arcane_hand"],
      slots: 1,
    });
    const casterHitPointMaximum = characterSheetHitPointMaximum(sheet);
    const result = requireRight(
      castArcaneHand({
        sheet,
        unitLibrary,
        space: arcaneHandSpace,
      }),
    );

    expect(result.invocation).toEqual({
      tag: "arcaneHand",
      spellId: "arcane_hand",
      spellLevel: 5,
      castLevel: spellSlotLevel(5),
      spellSlotCost: { kind: "ordinary", spellLevel: spellSlotLevel(5) },
      preparationRequirement: "prepared",
      requiredSpellAccess: "class_prepared",
      castingTime: { kind: "action" },
      rangeFeet: 120,
      duration: { kind: "timeSpan", unit: "minute", amount: 1 },
      concentrationRequired: true,
      hand: {
        objectId: arcaneHandSpace.objectId,
        creatureSize: "large",
        objectArmorClass: 20,
        hitPointMaximum: casterHitPointMaximum,
        occupiesSpace: false,
        dropsToZeroEndsSpell: true,
        mapPlacementOwner: "table",
      },
      command: {
        onCast: true,
        laterTurnAction: "bonus_action",
        moveDistanceFeet: 60,
        movementPathOwner: "table",
        availableEffects: [
          "clenched_fist",
          "forceful_hand",
          "grasping_hand",
          "interposing_hand",
        ],
      },
      effectContracts: {
        clenchedFist: {
          attackKind: "melee_spell_attack",
          reachFeet: 5,
          baseDamageDice: { count: 5, die: 8 },
          damageType: "force",
          damageDicePerSlotAboveBase: { count: 2, die: 8 },
        },
        forcefulHand: {
          targetSizeMaximum: "huge",
          savingThrowAbility: "str",
          basePushFeet: 5,
          pushFeetPerSpellcastingAbilityModifier: 5,
          handMovesWithTarget: true,
          remainsWithinFeet: 5,
        },
        graspingHand: {
          targetSizeMaximum: "huge",
          savingThrowAbility: "dex",
          condition: "grappled",
          escapeDc: "caster_spell_save_dc",
          crushAction: "bonus_action",
          crushDamageDice: { count: 4, die: 6 },
          crushAddsSpellcastingAbilityModifier: true,
          damageDicePerSlotAboveBase: { count: 2, die: 6 },
        },
        interposingHand: {
          coverGrantedToCaster: "half_cover",
          difficultTerrainForEnemies: true,
        },
      },
    });
    expect(result.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 1 },
    ]);
  });

  it("rejects below-level slots before spending a spell slot", () => {
    const sheet = arcaneHandWizardSheet({
      preparedSpells: ["arcane_hand"],
      slots: 1,
    });
    const result = castArcaneHand({
      sheet,
      unitLibrary,
      space: arcaneHandSpace,
      castLevel: spellSlotLevel(4),
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe(
        "Arcane Hand requires a level-5 or higher Spell Slot.",
      );
    }
    expect(sheet.spellSlotExpenditures).toEqual([]);
  });

  it("requires prepared class Spell Access", () => {
    const result = castArcaneHand({
      sheet: arcaneHandWizardSheet({ preparedSpells: [], slots: 1 }),
      unitLibrary,
      space: arcaneHandSpace,
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe(
        "Arcane Hand requires prepared class Spell Access.",
      );
    }
  });
});

const arcaneHandSelectedIdentityActions = {
  doCastArcaneHand: () => {
    const result = requireRight(
      castArcaneHand({
        sheet: arcaneHandWizardSheet({
          preparedSpells: ["arcane_hand"],
          slots: 1,
        }),
        unitLibrary,
        space: arcaneHandSpace,
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
      handArmorClass: result.invocation.hand.objectArmorClass,
      handHitPointMaximum: Number(result.invocation.hand.hitPointMaximum),
      occupiesSpace: result.invocation.hand.occupiesSpace,
      laterTurnAction: result.invocation.command.laterTurnAction,
      moveDistanceFeet: result.invocation.command.moveDistanceFeet,
      clenchedFistDamageDice: `${result.invocation.effectContracts.clenchedFist.baseDamageDice.count}d${result.invocation.effectContracts.clenchedFist.baseDamageDice.die}`,
      forcefulHandSave:
        result.invocation.effectContracts.forcefulHand.savingThrowAbility,
      graspingHandSave:
        result.invocation.effectContracts.graspingHand.savingThrowAbility,
      interposingCover:
        result.invocation.effectContracts.interposingHand.coverGrantedToCaster,
      tableOwner: result.invocation.hand.mapPlacementOwner,
    };
  },
} as const satisfies Record<
  ArcaneHandSelectedIdentityDriverAction,
  () => ArcaneHandSelectedIdentityProjection
>;

const arcaneHandSpace = {
  objectId: requireRight(
    characterSheetArcaneHandObjectId("object:arcane-hand"),
  ),
  unoccupiedSpaceVisibleWithinRange: true,
} as const satisfies CharacterSheetArcaneHandSpace;

function expectedArcaneHandProjection(): ArcaneHandSelectedIdentityProjection {
  return {
    spellId: "arcane_hand",
    spellSlotCost: "ordinary",
    slotLevel: 5,
    slotExpended: 1,
    rangeFeet: 120,
    durationMinutes: 1,
    handArmorClass: 20,
    handHitPointMaximum: Number(
      characterSheetHitPointMaximum(
        arcaneHandWizardSheet({
          preparedSpells: ["arcane_hand"],
          slots: 1,
        }),
      ),
    ),
    occupiesSpace: false,
    laterTurnAction: "bonus_action",
    moveDistanceFeet: 60,
    clenchedFistDamageDice: "5d8",
    forcefulHandSave: "str",
    graspingHandSave: "dex",
    interposingCover: "half_cover",
    tableOwner: "table",
  };
}

function arcaneHandWizardSheet(input: {
  readonly preparedSpells: readonly string[];
  readonly slots: number;
}): CharacterSheet {
  return requireRight(
    rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:arcane-hand-wizard-9"),
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
