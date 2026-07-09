// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.antilife-shell-session-invocation
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test table-caller.antilife-shell-barrier-contract
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-04-L5-BARRIER-WALL antilife_shell
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L19E-04-L5-BARRIER-WALL antilife_shell
// UNIT-IDENTITY-REPLAY: L19E-04-L5-BARRIER-WALL antilife_shell doCastAntilifeShell
import { describe, expect, it, test } from "vitest";
import {
  abilityScoreAssignment,
  classUnitId,
  type CharacterBuild,
  type UnitCatalog,
} from "@dnd/character-creation-runtime";
import { Hp, resourceCount, spellSlotLevel } from "@dnd/shared/types";
import { decodeUnitRecordSync } from "../../surface/src/surface/schema.ts";
import type { UnitRecord } from "@dnd/surface/surface/types";
import { Either, Option } from "effect";

import antilifeShellInput from "../../surface/content/antilife_shell.json";
import classDruidInput from "../../surface/content/class_druid.json";
import druidAbilityScoreImprovementL4Input from "../../surface/content/druid_ability_score_improvement_l4.json";
import druidDruidicInput from "../../surface/content/druid_druidic.json";
import druidPrimalOrderInput from "../../surface/content/druid_primal_order.json";
import druidWildCompanionInput from "../../surface/content/druid_wild_companion.json";
import druidWildShapeInput from "../../surface/content/druid_wild_shape.json";
import {
  castAntilifeShell,
  characterSheetAntilifeShellBarrierId,
  characterSheetId,
} from "./index.ts";
import type {
  CharacterSheet,
  CharacterSheetAntilifeShellBarrierPlacement,
} from "./index.ts";

const antilifeShellSelectedIdentityDriverSchema = {
  doCastAntilifeShell: {},
} as const;

type AntilifeShellSelectedIdentityDriverAction =
  keyof typeof antilifeShellSelectedIdentityDriverSchema;

type AntilifeShellSelectedIdentityProjection = {
  readonly spellId: string;
  readonly spellSlotCost: "ordinary";
  readonly slotLevel: number;
  readonly slotExpended: number;
  readonly rangeKind: "self";
  readonly durationHours: number;
  readonly concentrationRequired: true;
  readonly radiusFeet: number;
  readonly exceptCreatureTypes: readonly string[];
  readonly allowedThroughBarrier: readonly string[];
  readonly crossingMembershipOwner: "table";
  readonly forcedPassageEndsSpell: true;
};

type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly AntilifeShellSelectedIdentityDriverAction[];
  readonly expected: AntilifeShellSelectedIdentityProjection;
};

type SelectedUnitIdentityReplay = {
  readonly taskId: "L19E-04-L5-BARRIER-WALL";
  readonly unitId: "antilife_shell";
  readonly actions: readonly AntilifeShellSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L19E-04-L5-BARRIER-WALL",
    unitId: "antilife_shell",
    actions: ["doCastAntilifeShell"],
    sequences: [
      {
        name: "selected-antilife-shell-slot-cast-returns-barrier-contract",
        actions: ["doCastAntilifeShell"],
        expected: expectedAntilifeShellProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Character Sheet runtime / Antilife Shell", () => {
  it("replays selected Unit identities deterministically", () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<AntilifeShellSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        let projection: AntilifeShellSelectedIdentityProjection | undefined;

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          projection = antilifeShellSelectedIdentityActions[actionName]();
        }

        expect(projection, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  test("Antilife Shell spends a level-5 prepared spell slot and returns a table-facing barrier contract", () => {
    const result = requireRight(
      castAntilifeShell({
        sheet: antilifeShellDruidSheet({
          preparedSpells: ["antilife_shell"],
          slots: 1,
        }),
        unitLibrary,
        placement: antilifeShellPlacement,
      }),
    );

    expect(result.invocation).toEqual({
      tag: "antilifeShell",
      spellId: "antilife_shell",
      spellLevel: 5,
      spellSlotCost: { kind: "ordinary", spellLevel: spellSlotLevel(5) },
      preparationRequirement: "prepared",
      requiredSpellAccess: "class_prepared",
      castingTime: { kind: "action" },
      range: { kind: "self" },
      duration: { kind: "timeSpan", unit: "hour", amount: 1 },
      concentrationRequired: true,
      placement: antilifeShellPlacement,
      barrier: {
        origin: "caster",
        shape: {
          kind: "emanation",
          radiusFeet: 10,
          movesWithCaster: true,
        },
        prevents: ["creature_passage", "creature_reach_through"],
        exceptCreatureTypes: ["construct", "undead"],
        allowedThroughBarrier: [
          "spells",
          "ranged_attacks",
          "reach_weapon_attacks",
        ],
        crossingMembershipOwner: "table",
        forcedPassageByCasterMovement: {
          endsSpell: true,
          owner: "table",
        },
      },
    });
    expect(result.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 1 },
    ]);
  });

  test("Antilife Shell requires prepared class Spell Access", () => {
    const result = castAntilifeShell({
      sheet: antilifeShellDruidSheet({ preparedSpells: [], slots: 1 }),
      unitLibrary,
      placement: antilifeShellPlacement,
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe(
        "Antilife Shell requires prepared class Spell Access.",
      );
    }
  });
});

const antilifeShellSelectedIdentityActions = {
  doCastAntilifeShell: () => {
    const result = requireRight(
      castAntilifeShell({
        sheet: antilifeShellDruidSheet({
          preparedSpells: ["antilife_shell"],
          slots: 1,
        }),
        unitLibrary,
        placement: antilifeShellPlacement,
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
      rangeKind: result.invocation.range.kind,
      durationHours: result.invocation.duration.amount,
      concentrationRequired: result.invocation.concentrationRequired,
      radiusFeet: result.invocation.barrier.shape.radiusFeet,
      exceptCreatureTypes: result.invocation.barrier.exceptCreatureTypes,
      allowedThroughBarrier: result.invocation.barrier.allowedThroughBarrier,
      crossingMembershipOwner:
        result.invocation.barrier.crossingMembershipOwner,
      forcedPassageEndsSpell:
        result.invocation.barrier.forcedPassageByCasterMovement.endsSpell,
    };
  },
} as const satisfies Record<
  AntilifeShellSelectedIdentityDriverAction,
  () => AntilifeShellSelectedIdentityProjection
>;

const antilifeShellPlacement = {
  barrierId: requireRight(
    characterSheetAntilifeShellBarrierId("barrier:antilife-shell"),
  ),
  casterOriginWitnessed: true,
} as const satisfies CharacterSheetAntilifeShellBarrierPlacement;

function expectedAntilifeShellProjection(): AntilifeShellSelectedIdentityProjection {
  return {
    spellId: "antilife_shell",
    spellSlotCost: "ordinary",
    slotLevel: 5,
    slotExpended: 1,
    rangeKind: "self",
    durationHours: 1,
    concentrationRequired: true,
    radiusFeet: 10,
    exceptCreatureTypes: ["construct", "undead"],
    allowedThroughBarrier: [
      "spells",
      "ranged_attacks",
      "reach_weapon_attacks",
    ],
    crossingMembershipOwner: "table",
    forcedPassageEndsSpell: true,
  };
}

function antilifeShellDruidSheet(input: {
  readonly preparedSpells: readonly string[];
  readonly slots: number;
}): CharacterSheet {
  return {
    tag: "available",
    characterId: characterSheetId("character:antilife-shell-druid-9"),
    build: {
      ...armorClassBuild({
        startingClass: "class_druid",
        advancements: Array.from({ length: 8 }, () => "class_druid"),
      }),
      classFeatureLanguages: [
        {
          kind: "classFeatureLanguageGrant",
          sourceUnitId: "druid_druidic",
          language: "Druidic",
        },
      ],
      spellcasting: {
        sources: [
          {
            sourceUnitId: "class_druid",
            spellcastingAbility: "wis",
            cantrips: ["druidcraft", "guidance", "produce_flame"],
            spellbook: [],
            preparedSpells: input.preparedSpells,
            spellcastingFocuses: ["druidic_focus"],
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
    hitPoints: { tag: "positive", currentHp: Hp(57), tempHp: Hp(0) },
    conditions: [],
    spentHitDice: [],
    restFeatureUses: [],
    resourceExpenditures: [],
    heroicInspiration: { tag: "none" },
    companion: { tag: "none" },
    bookOfShadowsPresence: undefined,
    spellSlotExpenditures: [
      { spellLevel: spellSlotLevel(5), expended: resourceCount(0) },
    ],
    createdSpellSlots: [],
    pactSlotExpenditure: undefined,
  } as CharacterSheet;
}

function armorClassBuild(input: {
  readonly startingClass: string;
  readonly advancements?: readonly string[];
}): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId(input.startingClass),
      advancements: (input.advancements ?? []).map((classId) => ({
        classUnitId: classUnitId(classId),
        hitPointRule: { tag: "fixedHigherLevelGain" },
      })),
    },
    background: "background_soldier",
    species: "species_orc",
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: requireRight(
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
    equipment: { owned: [], loadout: {} },
  };
}

const unitLibrary = minimalUnitCatalog([
  decodeUnitRecordSync(antilifeShellInput),
  decodeUnitRecordSync(classDruidInput),
  decodeUnitRecordSync(druidAbilityScoreImprovementL4Input),
  decodeUnitRecordSync(druidDruidicInput),
  decodeUnitRecordSync(druidPrimalOrderInput),
  decodeUnitRecordSync(druidWildCompanionInput),
  decodeUnitRecordSync(druidWildShapeInput),
]);

function requireRight<R, L>(result: Either.Either<R, L>): R {
  if (Either.isRight(result)) return result.right;
  throw new Error(`Expected Right, received Left: ${JSON.stringify(result.left)}`);
}

function minimalUnitCatalog(units: readonly UnitRecord[]): UnitCatalog {
  const records = new Map(units.map((unit) => [unit.id, unit]));
  return {
    getUnit: (id) => Option.fromNullable(records.get(id)),
    listUnits: () => [...records.values()],
    requireUnit: (id) => {
      const unit = records.get(id);
      if (unit === undefined) {
        throw new Error(`Missing test Unit: ${id}`);
      }
      return unit;
    },
  };
}
