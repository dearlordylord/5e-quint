// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.hallow-session-invocation
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test table-caller.hallow-durable-area
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-04-L5-BARRIER-WALL hallow
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L19E-04-L5-BARRIER-WALL hallow
// UNIT-IDENTITY-REPLAY: L19E-04-L5-BARRIER-WALL hallow doCastHallow
import { describe, expect, it, test } from "vitest";

import {
  Either,
  Hp,
  armorClassBuild,
  castHallow,
  characterSheetHallowAreaId,
  characterSheetId,
  completedHallowCasting,
  createFreshCharacterSheet,
  requireRight,
  spellSlotLevel,
  unitLibrary,
} from "./test-support.ts";
import {
  type CharacterSheetHallowArea,
  type CharacterSheetHallowCreatureTypes,
  type CharacterSheetHallowExtraEffect,
} from "./sheet-types.ts";

const hallowSelectedIdentityDriverSchema = {
  doCastHallow: {},
} as const;

type HallowSelectedIdentityDriverAction =
  keyof typeof hallowSelectedIdentityDriverSchema;

type HallowSelectedIdentityProjection = {
  readonly spellId: string;
  readonly spellSlotCost: "ordinary";
  readonly slotLevel: number;
  readonly slotExpended: number;
  readonly castingTimeHours: number;
  readonly radiusFeet: number;
  readonly duration: "until_dispelled";
  readonly materialCostGpMinimum: number;
  readonly blockedCreatureTypes: readonly string[];
  readonly extraEffect: "resistance";
  readonly extraEffectDamageType: "fire";
  readonly durableAreaOwner: "table";
};

type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly HallowSelectedIdentityDriverAction[];
  readonly expected: HallowSelectedIdentityProjection;
};

type SelectedUnitIdentityReplay = {
  readonly taskId: "L19E-04-L5-BARRIER-WALL";
  readonly unitId: "hallow";
  readonly actions: readonly HallowSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L19E-04-L5-BARRIER-WALL",
    unitId: "hallow",
    actions: ["doCastHallow"],
    sequences: [
      {
        name: "selected-hallow-slot-cast-returns-durable-area-contract",
        actions: ["doCastHallow"],
        expected: expectedHallowProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Character Sheet runtime / Hallow", () => {
  it("replays selected Unit identities deterministically", () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions = new Set<HallowSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        let projection: HallowSelectedIdentityProjection | undefined;

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          projection = hallowSelectedIdentityActions[actionName]();
        }

        expect(projection, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  test("Hallow spends a level-5 prepared spell slot and returns a durable area contract", () => {
    const result = requireRight(
      castHallow({
        sheet: hallowClericSheet({ preparedSpells: ["hallow"], slots: 1 }),
        unitLibrary,
        casting: completedHallowCasting,
        area: hallowArea,
        wardCreatureTypes,
        extraEffect: resistanceEffect,
      }),
    );

    expect(result.invocation).toEqual({
      tag: "hallow",
      spellId: "hallow",
      spellLevel: 5,
      spellSlotCost: { kind: "ordinary", spellLevel: spellSlotLevel(5) },
      preparationRequirement: "prepared",
      requiredSpellAccess: "class_prepared",
      castingTime: { kind: "hours", amount: 24 },
      range: "touch",
      duration: "until_dispelled",
      materialComponents: { consumedIncenseCostGpMinimum: 1000 },
      area: hallowArea,
      hallowedWard: {
        blockedCreatureTypes: wardCreatureTypes,
        preventsPossessionCharmedFrightenedFromBlockedTypes: true,
      },
      extraEffect: resistanceEffect,
      durableArea: {
        persistenceOwner: "table",
        spatialMembershipOwner: "table",
        dispelEndingOwner: "table",
      },
    });
    expect(result.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 1 },
    ]);
  });

  test("Hallow rejects overlapping Hallow areas and oversized radii before spending the slot", () => {
    const sheet = hallowClericSheet({ preparedSpells: ["hallow"], slots: 1 });
    const overlapping = castHallow({
      sheet,
      unitLibrary,
      casting: completedHallowCasting,
      area: {
        ...hallowArea,
        areaAlreadyHallowed: true,
      } as unknown as CharacterSheetHallowArea,
      wardCreatureTypes,
      extraEffect: resistanceEffect,
    });
    const oversized = castHallow({
      sheet,
      unitLibrary,
      casting: completedHallowCasting,
      area: { ...hallowArea, radiusFeet: 61 },
      wardCreatureTypes,
      extraEffect: resistanceEffect,
    });

    expect(Either.isLeft(overlapping)).toBe(true);
    if (Either.isLeft(overlapping)) {
      expect(overlapping.left.message).toBe(
        "Hallow requires the target area to be outside existing Hallow effects.",
      );
    }
    expect(Either.isLeft(oversized)).toBe(true);
    if (Either.isLeft(oversized)) {
      expect(oversized.left.message).toBe(
        "Hallow area radius must be at most 60 feet.",
      );
    }
    expect(sheet.spellSlotExpenditures).toEqual([]);
  });

  test("Hallow rejects duplicate chosen creature types before spending the slot", () => {
    const sheet = hallowClericSheet({ preparedSpells: ["hallow"], slots: 1 });
    const result = castHallow({
      sheet,
      unitLibrary,
      casting: completedHallowCasting,
      area: hallowArea,
      wardCreatureTypes: [
        "fiend",
        "fiend",
      ] as unknown as CharacterSheetHallowCreatureTypes,
      extraEffect: resistanceEffect,
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe(
        "Hallow creature type choices must be unique.",
      );
    }
    expect(sheet.spellSlotExpenditures).toEqual([]);
  });

  test("Hallow requires prepared class Spell Access", () => {
    const result = castHallow({
      sheet: hallowClericSheet({ preparedSpells: [], slots: 1 }),
      unitLibrary,
      casting: completedHallowCasting,
      area: hallowArea,
      wardCreatureTypes,
      extraEffect: resistanceEffect,
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe(
        "Hallow requires prepared class Spell Access.",
      );
    }
  });
});

const hallowSelectedIdentityActions = {
  doCastHallow: () => {
    const result = requireRight(
      castHallow({
        sheet: hallowClericSheet({ preparedSpells: ["hallow"], slots: 1 }),
        unitLibrary,
        casting: completedHallowCasting,
        area: hallowArea,
        wardCreatureTypes,
        extraEffect: resistanceEffect,
      }),
    );
    const extraEffect = result.invocation.extraEffect;
    if (
      extraEffect.kind !== "resistance" ||
      extraEffect.damageType !== "fire"
    ) {
      throw new Error("Expected Hallow Resistance extra effect.");
    }
    return {
      spellId: result.invocation.spellId,
      spellSlotCost: result.invocation.spellSlotCost.kind,
      slotLevel: result.invocation.spellSlotCost.spellLevel,
      slotExpended:
        (result.sheet.spellSlotExpenditures ?? []).find(
          (slot) => slot.spellLevel === spellSlotLevel(5),
        )?.expended ?? 0,
      castingTimeHours: result.invocation.castingTime.amount,
      radiusFeet: result.invocation.area.radiusFeet,
      duration: result.invocation.duration,
      materialCostGpMinimum:
        result.invocation.materialComponents.consumedIncenseCostGpMinimum,
      blockedCreatureTypes: result.invocation.hallowedWard.blockedCreatureTypes,
      extraEffect: extraEffect.kind,
      extraEffectDamageType: extraEffect.damageType,
      durableAreaOwner: result.invocation.durableArea.persistenceOwner,
    };
  },
} as const satisfies Record<
  HallowSelectedIdentityDriverAction,
  () => HallowSelectedIdentityProjection
>;

const hallowArea = {
  areaId: requireRight(characterSheetHallowAreaId("area:hallowed-sanctum")),
  radiusFeet: 60,
  touchedPointWithinReach: true,
  areaAlreadyHallowed: false,
} as const satisfies CharacterSheetHallowArea;

const wardCreatureTypes = [
  "fiend",
  "undead",
] as const satisfies CharacterSheetHallowCreatureTypes;

const resistanceEffect = {
  kind: "resistance",
  affectedCreatureTypes: ["celestial", "humanoid"],
  damageType: "fire",
} as const satisfies CharacterSheetHallowExtraEffect;

function expectedHallowProjection(): HallowSelectedIdentityProjection {
  return {
    spellId: "hallow",
    spellSlotCost: "ordinary",
    slotLevel: 5,
    slotExpended: 1,
    castingTimeHours: 24,
    radiusFeet: 60,
    duration: "until_dispelled",
    materialCostGpMinimum: 1000,
    blockedCreatureTypes: ["fiend", "undead"],
    extraEffect: "resistance",
    extraEffectDamageType: "fire",
    durableAreaOwner: "table",
  };
}

function hallowClericSheet(input: {
  readonly preparedSpells: readonly string[];
  readonly slots: number;
}) {
  return requireRight(
    createFreshCharacterSheet({
      characterId: characterSheetId("character:hallow-cleric-9"),
      build: {
        ...armorClassBuild({
          startingClass: "class_cleric",
          advancements: Array.from({ length: 8 }, () => "class_cleric"),
        }),
        spellcasting: {
          sources: [
            {
              sourceUnitId: "class_cleric",
              spellcastingAbility: "wis",
              cantrips: ["light", "resistance", "sacred_flame"],
              spellbook: [],
              preparedSpells: input.preparedSpells,
              spellcastingFocuses: ["holy_symbol"],
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
      currentHp: Hp(1),
      tempHp: Hp(0),
      unitLibrary,
    }),
  );
}
