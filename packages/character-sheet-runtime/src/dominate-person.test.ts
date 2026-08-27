// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.dominate-person-session-invocation
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test table-caller.dominate-person-command-control
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-02-L5-SAVE-CONDITION-CONTROL dominate_person
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L19E-02-L5-SAVE-CONDITION-CONTROL dominate_person
// UNIT-IDENTITY-REPLAY: L19E-02-L5-SAVE-CONDITION-CONTROL dominate_person doCastDominatePerson
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, it, test } from "vitest";

import {
  abilityScoreAssignment,
  classUnitId,
  copperPieceAmount,
  type CharacterBuild,
  type UnitCatalog,
} from "@dnd/character-creation-runtime";
import { Hp, spellSlotLevel } from "@dnd/shared/types";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type { UnitRecord } from "@dnd/surface/surface/types";
import { Result, Option } from "effect";
import backgroundSoldierInput from "../../surface/content/background_soldier.json";
import classWizardInput from "../../surface/content/class_wizard.json";
import dominatePersonInput from "../../surface/content/dominate_person.json";
import speciesOrcInput from "../../surface/content/species_orc.json";
import { characterSheetId } from "./index.ts";
import { castDominatePerson } from "./dominate-person.ts";
import { characterSheetDominatePersonTargetId } from "./sheet-types.ts";
import type { CharacterSheet } from "./index.ts";
import {
  type CharacterSheetDominatePersonSavingThrowOutcome,
  type CharacterSheetDominatePersonTarget,
} from "./sheet-types.ts";

type DominatePersonSelectedIdentityDriverAction = "doCastDominatePerson";

type DominatePersonSelectedIdentityProjection = {
  readonly spellId: string;
  readonly spellSlotCost: "ordinary";
  readonly slotLevel: number;
  readonly slotExpended: number;
  readonly rangeFeet: 60;
  readonly saveAbility: "wis";
  readonly condition: "charmed";
  readonly durationMinutes: number;
  readonly commandActionCost: "none";
  readonly repeatSaveTrigger: "target_takes_damage";
  readonly commandOwner: "table";
};

type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly DominatePersonSelectedIdentityDriverAction[];
  readonly expected: DominatePersonSelectedIdentityProjection;
};

type SelectedUnitIdentityReplay = {
  readonly taskId: "L19E-02-L5-SAVE-CONDITION-CONTROL";
  readonly unitId: "dominate_person";
  readonly actions: readonly DominatePersonSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L19E-02-L5-SAVE-CONDITION-CONTROL",
    unitId: "dominate_person",
    actions: ["doCastDominatePerson"],
    sequences: [
      {
        name: "selected-dominate-person-slot-cast-returns-control-contract",
        actions: ["doCastDominatePerson"],
        expected: expectedDominatePersonProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Character Sheet runtime / Dominate Person", () => {
  it("replays selected Unit identities deterministically", () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<DominatePersonSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        let projection: DominatePersonSelectedIdentityProjection | undefined;

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          projection = dominatePersonSelectedIdentityActions[actionName]();
        }

        expect(projection, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  test("Dominate Person spends a prepared level-5 spell slot and returns the failed-save command-control contract", () => {
    const target = dominatePersonTarget({
      savingThrowOutcome: { tag: "failed" },
      fightingCasterOrAllies: true,
    });
    const result = requireSuccess(
      castDominatePerson({
        sheet: dominatePersonWizardSheet({
          preparedSpells: ["dominate_person"],
          slots: 1,
        }),
        unitLibrary: dominatePersonUnitLibrary,
        target,
      }),
    );

    expect(result.invocation).toEqual({
      tag: "dominate_person",
      spellId: "dominate_person",
      spellLevel: 5,
      spellSlotCost: { kind: "ordinary", spellLevel: spellSlotLevel(5) },
      preparationRequirement: "prepared",
      requiredSpellAccess: "class_prepared",
      castingTime: { kind: "action" },
      rangeFeet: 60,
      components: ["v", "s"],
      target,
      savingThrow: {
        ability: "wis",
        dc: "caster_spell_save_dc",
        advantageIfCasterOrAlliesAreFightingTarget: true,
      },
      outcome: {
        tag: "savingThrowFailed",
        affected: true,
        condition: "charmed",
        duration: { kind: "timeSpan", unit: "minute", amount: 1 },
        concentrationRequired: true,
        telepathicCommandLink: {
          actionCost: "none",
          commandTransmissionOwner: "character-sheet-session",
          obedienceAdjudicationOwner: "table",
        },
        repeatSave: {
          trigger: "target_takes_damage",
          ability: "wis",
          dc: "caster_spell_save_dc",
          onSuccess: "ends_on_target",
          observationOwner: "table-session",
        },
      },
    });
    expect(result.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 1 },
    ]);
  });

  test("Dominate Person returns no effect on a successful Wisdom save", () => {
    const result = requireSuccess(
      castDominatePerson({
        sheet: dominatePersonWizardSheet({
          preparedSpells: ["dominate_person"],
          slots: 1,
        }),
        unitLibrary: dominatePersonUnitLibrary,
        target: dominatePersonTarget({
          savingThrowOutcome: { tag: "succeeded" },
          fightingCasterOrAllies: false,
        }),
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

  test("Dominate Person requires prepared class Spell Access", () => {
    const result = castDominatePerson({
      sheet: dominatePersonWizardSheet({ preparedSpells: [], slots: 1 }),
      unitLibrary: dominatePersonUnitLibrary,
      target: dominatePersonTarget({ savingThrowOutcome: { tag: "failed" } }),
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure.message).toBe(
        "Dominate Person requires prepared class Spell Access.",
      );
    }
  });
});

const dominatePersonSelectedIdentityActions = {
  doCastDominatePerson: () => {
    const result = requireSuccess(
      castDominatePerson({
        sheet: dominatePersonWizardSheet({
          preparedSpells: ["dominate_person"],
          slots: 1,
        }),
        unitLibrary: dominatePersonUnitLibrary,
        target: dominatePersonTarget({
          savingThrowOutcome: { tag: "failed" },
          fightingCasterOrAllies: true,
        }),
      }),
    );
    if (result.invocation.outcome.tag !== "savingThrowFailed") {
      throw new Error(
        "Expected Dominate Person replay to return failed-save outcome.",
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
      rangeFeet: result.invocation.rangeFeet,
      saveAbility: result.invocation.savingThrow.ability,
      condition: result.invocation.outcome.condition,
      durationMinutes: result.invocation.outcome.duration.amount,
      commandActionCost:
        result.invocation.outcome.telepathicCommandLink.actionCost,
      repeatSaveTrigger: result.invocation.outcome.repeatSave.trigger,
      commandOwner:
        result.invocation.outcome.telepathicCommandLink
          .obedienceAdjudicationOwner,
    };
  },
} as const satisfies Record<
  DominatePersonSelectedIdentityDriverAction,
  () => DominatePersonSelectedIdentityProjection
>;

function expectedDominatePersonProjection(): DominatePersonSelectedIdentityProjection {
  return {
    spellId: "dominate_person",
    spellSlotCost: "ordinary",
    slotLevel: 5,
    slotExpended: 1,
    rangeFeet: 60,
    saveAbility: "wis",
    condition: "charmed",
    durationMinutes: 1,
    commandActionCost: "none",
    repeatSaveTrigger: "target_takes_damage",
    commandOwner: "table",
  };
}

function dominatePersonTarget(input: {
  readonly savingThrowOutcome: CharacterSheetDominatePersonSavingThrowOutcome;
  readonly fightingCasterOrAllies?: boolean;
}): CharacterSheetDominatePersonTarget {
  return {
    targetId: requireSuccess(
      characterSheetDominatePersonTargetId("dominate-person-target:humanoid"),
    ),
    visibleByCaster: true,
    withinRangeFeet: 60,
    creatureType: "humanoid",
    fightingCasterOrAllies: input.fightingCasterOrAllies ?? false,
    savingThrowOutcome: input.savingThrowOutcome,
  };
}

function dominatePersonWizardSheet(input: {
  readonly preparedSpells: readonly string[];
  readonly slots: number;
}): CharacterSheet {
  return {
    tag: "available",
    characterId: characterSheetId("character:dominate-person-wizard-9"),
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
    hitPointMaximumReduction: Hp(0),
    exhaustionLevel: 0,
    hitPoints: { tag: "positive", currentHp: Hp(30), tempHp: Hp(0) },
    conditions: [],
    spentHitDice: [],
    restFeatureUses: [],
    resourceExpenditures: [],
    heroicInspiration: { tag: "none" },
    companion: { tag: "none" },
    bookOfShadowsPresence: undefined,
    spellSlotExpenditures: [],
    createdSpellSlots: [],
    pactSlotExpenditure: undefined,
  };
}

const dominatePersonUnit = decodeUnitRecordSync(
  dominatePersonInput,
) as UnitRecord;
const dominatePersonCatalogUnits = [
  decodeUnitRecordSync(classWizardInput),
  decodeUnitRecordSync(backgroundSoldierInput),
  decodeUnitRecordSync(speciesOrcInput),
  dominatePersonUnit,
] as const satisfies readonly UnitRecord[];
const dominatePersonCatalogById = new Map(
  dominatePersonCatalogUnits.map((unit) => [unit.id, unit]),
);
const dominatePersonUnitLibrary: UnitCatalog = {
  getUnit: (id) =>
    Option.fromNullishOr(dominatePersonCatalogById.get(authoredUnitId(id))),
  listUnits: () => dominatePersonCatalogUnits,
  requireUnit: (id) => {
    const unit = dominatePersonCatalogById.get(authoredUnitId(id));
    if (unit !== undefined) return unit;
    throw new Error(`Unknown Unit id: ${id}`);
  },
};

function armorClassBuild(input: {
  readonly startingClass: string;
  readonly advancements?: readonly string[];
}): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId(authoredUnitId(input.startingClass)),
      advancements: (input.advancements ?? []).map((classId) => ({
        classUnitId: classUnitId(authoredUnitId(classId)),
        hitPointRule: { tag: "fixedHigherLevelGain" as const },
      })),
    },
    background: authoredUnitId("background_soldier"),
    species: authoredUnitId("species_orc"),
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful" as const, morality: "good" as const },
    abilityScores: requireSuccess(
      abilityScoreAssignment({
        str: 13,
        dex: 14,
        con: 13,
        int: 8,
        wis: 16,
        cha: 10,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    magicInitiateSpellAccesses: [],
    equipment: {
      startingEquipmentCurrencyRemainderCp: copperPieceAmount(0),
      owned: [],
      loadout: {},
    },
  };
}

function requireSuccess<A, E>(result: Result.Result<A, E>): A {
  if (Result.isFailure(result)) {
    throw new Error(
      `Expected Result success, got failure: ${JSON.stringify(result.failure)}`,
    );
  }
  return result.success;
}
