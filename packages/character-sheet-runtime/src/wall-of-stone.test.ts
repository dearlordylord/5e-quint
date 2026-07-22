// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.wall-of-stone-session-invocation
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test table-caller.wall-of-stone-object-barrier-contract
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-04-L5-BARRIER-WALL wall_of_stone
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L19E-04-L5-BARRIER-WALL wall_of_stone
// UNIT-IDENTITY-REPLAY: L19E-04-L5-BARRIER-WALL wall_of_stone doCastWallOfStone
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
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

import classWizardInput from "../../surface/content/class_wizard.json";
import wizardAbilityScoreImprovementL4Input from "../../surface/content/wizard_ability_score_improvement_l4.json";
import wizardArcaneRecoveryInput from "../../surface/content/wizard_arcane_recovery.json";
import wizardRitualAdeptInput from "../../surface/content/wizard_ritual_adept.json";
import wizardScholarInput from "../../surface/content/wizard_scholar.json";
import wallOfStoneInput from "../../surface/content/wall_of_stone.json";
import { characterSheetId } from "./index.ts";
import { characterSheetWallOfStoneWallId } from "./sheet-types.ts";
import { castWallOfStone } from "./wall-of-stone.ts";
import type { CharacterSheet } from "./index.ts";
import {
  type CharacterSheetWallOfStonePlacement,
  type CharacterSheetWallOfStoneShape,
} from "./sheet-types.ts";

const wallOfStoneSelectedIdentityDriverSchema = {
  doCastWallOfStone: {},
} as const;

type WallOfStoneSelectedIdentityDriverAction =
  keyof typeof wallOfStoneSelectedIdentityDriverSchema;

type WallOfStoneSelectedIdentityProjection = {
  readonly spellId: string;
  readonly spellSlotCost: "ordinary";
  readonly slotLevel: number;
  readonly slotExpended: number;
  readonly rangeFeet: number;
  readonly durationMinutes: number;
  readonly concentrationRequired: true;
  readonly permanentIfMaintainedFullDuration: true;
  readonly panelCount: number;
  readonly thicknessInches: number;
  readonly material: "nonmagical_solid_stone";
  readonly pushDistanceFeet: number;
  readonly enclosureSavingThrowAbility: "dex";
  readonly wallAc: number;
  readonly hitPointsPerInchOfThickness: number;
  readonly panelDamageOwner: "table_object_state";
};

type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly WallOfStoneSelectedIdentityDriverAction[];
  readonly expected: WallOfStoneSelectedIdentityProjection;
};

type SelectedUnitIdentityReplay = {
  readonly taskId: "L19E-04-L5-BARRIER-WALL";
  readonly unitId: "wall_of_stone";
  readonly actions: readonly WallOfStoneSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L19E-04-L5-BARRIER-WALL",
    unitId: "wall_of_stone",
    actions: ["doCastWallOfStone"],
    sequences: [
      {
        name: "selected-wall-of-stone-slot-cast-returns-object-barrier-contract",
        actions: ["doCastWallOfStone"],
        expected: expectedWallOfStoneProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Character Sheet runtime / Wall of Stone", () => {
  it("replays selected Unit identities deterministically", () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<WallOfStoneSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        let projection: WallOfStoneSelectedIdentityProjection | undefined;

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          projection = wallOfStoneSelectedIdentityActions[actionName]();
        }

        expect(projection, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  test("Wall of Stone spends a level-5 prepared spell slot and returns a table-facing wall contract", () => {
    const result = requireRight(
      castWallOfStone({
        sheet: wallOfStoneWizardSheet({
          preparedSpells: ["wall_of_stone"],
          slots: 1,
        }),
        unitLibrary,
        placement: wallOfStonePlacement,
        shape: wallOfStoneStandardPanels,
      }),
    );

    expect(result.invocation).toEqual({
      tag: "wallOfStone",
      spellId: "wall_of_stone",
      spellLevel: 5,
      spellSlotCost: { kind: "ordinary", spellLevel: spellSlotLevel(5) },
      preparationRequirement: "prepared",
      requiredSpellAccess: "class_prepared",
      castingTime: { kind: "action" },
      rangeFeet: 120,
      duration: { kind: "timeSpan", unit: "minute", amount: 10 },
      concentrationRequired: true,
      permanentIfMaintainedFullDuration: true,
      placement: wallOfStonePlacement,
      shape: wallOfStoneStandardPanels,
      wall: {
        material: "nonmagical_solid_stone",
        anyShapeDesiredOwner: "table",
        initialCreaturePush: {
          trigger: "wall_cuts_through_creature_space",
          distanceFeet: 5,
          sideChoiceOwner: "caster_and_table",
        },
        enclosureEscape: {
          savingThrowAbility: "dex",
          onSuccess: "may_use_reaction_move_up_to_speed",
          owner: "table",
        },
        durability: {
          ac: 15,
          hitPointsPerInchOfThickness: 30,
          damageImmunities: ["poison", "psychic"],
          panelDamageOwner: "table_object_state",
          connectedPanelCollapseOwner: "dm_table",
        },
        permanence: {
          ifConcentrationMaintainedFullDuration: true,
          cannotBeDispelled: true,
        },
        disappearsWhenSpellEndsBeforePermanence: true,
      },
    });
    expect(result.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 1 },
    ]);
  });

  test("Wall of Stone accepts the thin panel facts", () => {
    const result = requireRight(
      castWallOfStone({
        sheet: wallOfStoneWizardSheet({
          preparedSpells: ["wall_of_stone"],
          slots: 1,
        }),
        unitLibrary,
        placement: wallOfStonePlacement,
        shape: wallOfStoneThinPanels,
      }),
    );

    expect(result.invocation.shape).toEqual(wallOfStoneThinPanels);
    expect(result.invocation.wall.durability.panelDamageOwner).toBe(
      "table_object_state",
    );
  });

  test("Wall of Stone rejects unsupported panel geometry before spending a spell slot", () => {
    const sheet = wallOfStoneWizardSheet({
      preparedSpells: ["wall_of_stone"],
      slots: 1,
    });
    const result = castWallOfStone({
      sheet,
      unitLibrary,
      placement: wallOfStonePlacement,
      shape: { ...wallOfStoneStandardPanels, thicknessInches: 3 },
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe(
        "Wall of Stone panels must be either 10-by-10 feet and 6 inches thick or 10-by-20 feet and 3 inches thick.",
      );
    }
    expect(sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 0 },
    ]);
  });

  test("Wall of Stone requires prepared class Spell Access", () => {
    const result = castWallOfStone({
      sheet: wallOfStoneWizardSheet({ preparedSpells: [], slots: 1 }),
      unitLibrary,
      placement: wallOfStonePlacement,
      shape: wallOfStoneStandardPanels,
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe(
        "Wall of Stone requires prepared class Spell Access.",
      );
    }
  });
});

const wallOfStoneSelectedIdentityActions = {
  doCastWallOfStone: () => {
    const result = requireRight(
      castWallOfStone({
        sheet: wallOfStoneWizardSheet({
          preparedSpells: ["wall_of_stone"],
          slots: 1,
        }),
        unitLibrary,
        placement: wallOfStonePlacement,
        shape: wallOfStoneStandardPanels,
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
      concentrationRequired: result.invocation.concentrationRequired,
      permanentIfMaintainedFullDuration:
        result.invocation.permanentIfMaintainedFullDuration,
      panelCount: result.invocation.shape.panelCount,
      thicknessInches: result.invocation.shape.thicknessInches,
      material: result.invocation.wall.material,
      pushDistanceFeet: result.invocation.wall.initialCreaturePush.distanceFeet,
      enclosureSavingThrowAbility:
        result.invocation.wall.enclosureEscape.savingThrowAbility,
      wallAc: result.invocation.wall.durability.ac,
      hitPointsPerInchOfThickness:
        result.invocation.wall.durability.hitPointsPerInchOfThickness,
      panelDamageOwner: result.invocation.wall.durability.panelDamageOwner,
    };
  },
} as const satisfies Record<
  WallOfStoneSelectedIdentityDriverAction,
  () => WallOfStoneSelectedIdentityProjection
>;

const wallOfStonePlacement = {
  wallId: requireRight(characterSheetWallOfStoneWallId("wall:stone")),
  pointWithinRange: true,
  geometry: "table_witnessed",
  mergesWithExistingStone: true,
  solidlySupportedByExistingStone: true,
  occupiesNoCreatureOrObjectSpace: true,
} as const satisfies CharacterSheetWallOfStonePlacement;

const wallOfStoneStandardPanels = {
  kind: "stonePanels",
  panelCount: 10,
  panelWidthFeet: 10,
  panelHeightFeet: 10,
  thicknessInches: 6,
  panelContiguity: "table_witnessed",
} as const satisfies CharacterSheetWallOfStoneShape;

const wallOfStoneThinPanels = {
  kind: "stonePanels",
  panelCount: 10,
  panelWidthFeet: 10,
  panelHeightFeet: 20,
  thicknessInches: 3,
  panelContiguity: "table_witnessed",
} as const satisfies CharacterSheetWallOfStoneShape;

function expectedWallOfStoneProjection(): WallOfStoneSelectedIdentityProjection {
  return {
    spellId: "wall_of_stone",
    spellSlotCost: "ordinary",
    slotLevel: 5,
    slotExpended: 1,
    rangeFeet: 120,
    durationMinutes: 10,
    concentrationRequired: true,
    permanentIfMaintainedFullDuration: true,
    panelCount: 10,
    thicknessInches: 6,
    material: "nonmagical_solid_stone",
    pushDistanceFeet: 5,
    enclosureSavingThrowAbility: "dex",
    wallAc: 15,
    hitPointsPerInchOfThickness: 30,
    panelDamageOwner: "table_object_state",
  };
}

function wallOfStoneWizardSheet(input: {
  readonly preparedSpells: readonly string[];
  readonly slots: number;
}): CharacterSheet {
  return {
    tag: "available",
    characterId: characterSheetId("character:wall-of-stone-wizard-9"),
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
            spellbook: [authoredUnitId("wall_of_stone")],
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
    hitPoints: { tag: "positive", currentHp: Hp(44), tempHp: Hp(0) },
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
      startingClass: classUnitId(authoredUnitId(input.startingClass)),
      advancements: (input.advancements ?? []).map((classId) => ({
        classUnitId: classUnitId(authoredUnitId(classId)),
        hitPointRule: { tag: "fixedHigherLevelGain" },
      })),
    },
    background: authoredUnitId("background_soldier"),
    species: authoredUnitId("species_orc"),
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: requireRight(
      abilityScoreAssignment({
        str: 13,
        dex: 14,
        con: 13,
        int: 16,
        wis: 10,
        cha: 8,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    equipment: { owned: [], loadout: {} },
  };
}

const unitLibrary = minimalUnitCatalog([
  decodeUnitRecordSync(wallOfStoneInput),
  decodeUnitRecordSync(classWizardInput),
  decodeUnitRecordSync(wizardAbilityScoreImprovementL4Input),
  decodeUnitRecordSync(wizardArcaneRecoveryInput),
  decodeUnitRecordSync(wizardRitualAdeptInput),
  decodeUnitRecordSync(wizardScholarInput),
]);

function requireRight<R, L>(result: Either.Either<R, L>): R {
  if (Either.isRight(result)) return result.right;
  throw new Error(
    `Expected Right, received Left: ${JSON.stringify(result.left)}`,
  );
}

function minimalUnitCatalog(units: readonly UnitRecord[]): UnitCatalog {
  const records = new Map(units.map((unit) => [unit.id, unit]));
  return {
    getUnit: (id) => Option.fromNullable(records.get(authoredUnitId(id))),
    listUnits: () => [...records.values()],
    requireUnit: (id) => {
      const unit = records.get(authoredUnitId(id));
      if (unit === undefined) {
        throw new Error(`Missing test Unit: ${id}`);
      }
      return unit;
    },
  };
}
