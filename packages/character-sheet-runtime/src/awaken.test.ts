// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.awaken-session-invocation
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test table-caller.awaken-transformation
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION awaken
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION awaken
// UNIT-IDENTITY-REPLAY: L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION awaken doCastAwaken
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, it, test } from "vitest";

import {
  AWAKEN_MATERIAL_COMPONENTS,
  Either,
  Hp,
  armorClassBuild,
  castAwaken,
  characterSheetAwakenTargetId,
  characterSheetId,
  rebuildCharacterSheetFixture,
  requireRight,
  spellSlotLevel,
  unitLibrary,
} from "./test-support.ts";
import { type CharacterSheetAwakenTarget } from "./sheet-types.ts";

type AwakenSelectedIdentityDriverAction = "doCastAwaken";

type AwakenSelectedIdentityProjection = {
  readonly spellId: string;
  readonly spellSlotCost: "ordinary";
  readonly slotLevel: number;
  readonly slotExpended: number;
  readonly castingHours: number;
  readonly materialAgateCostGpMinimum: number;
  readonly materialConsumed: true;
  readonly targetTag: "naturalPlant";
  readonly intelligenceScore: 10;
  readonly languageSource: "one_language_the_caster_knows";
  readonly charmDurationDays: number;
  readonly statisticsOwner: "gm-table";
};

type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly AwakenSelectedIdentityDriverAction[];
  readonly expected: AwakenSelectedIdentityProjection;
};

type SelectedUnitIdentityReplay = {
  readonly taskId: "L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION";
  readonly unitId: "awaken";
  readonly actions: readonly AwakenSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION",
    unitId: "awaken",
    actions: ["doCastAwaken"],
    sequences: [
      {
        name: "selected-awaken-slot-cast-returns-natural-plant-contract",
        actions: ["doCastAwaken"],
        expected: expectedAwakenProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Character Sheet runtime / Awaken", () => {
  it("replays selected Unit identities deterministically", () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions = new Set<AwakenSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        let projection: AwakenSelectedIdentityProjection | undefined;

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          projection = awakenSelectedIdentityActions[actionName]();
        }

        expect(projection, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  test("Awaken spends a prepared level-5 spell slot and returns the natural Plant transformation contract", () => {
    const target = awakenNaturalPlantTarget();
    const result = requireRight(
      castAwaken({
        sheet: awakenBardSheet({ preparedSpells: ["awaken"], slots: 1 }),
        unitLibrary,
        casting: completedAwakenCasting,
        target,
      }),
    );

    expect(result.invocation).toEqual({
      tag: "awaken",
      spellId: "awaken",
      spellLevel: 5,
      spellSlotCost: { kind: "ordinary", spellLevel: spellSlotLevel(5) },
      preparationRequirement: "prepared",
      requiredSpellAccess: "class_prepared",
      castingTime: { kind: "hours", amount: 8 },
      range: "touch",
      materialComponents: AWAKEN_MATERIAL_COMPONENTS,
      target,
      transformation: {
        intelligenceScore: 10,
        language: {
          source: "one_language_the_caster_knows",
          selectedLanguage: "Druidic",
        },
        naturalPlantCreatureChange: {
          applies: true,
          creatureType: "plant",
          gainsMovement: true,
          gainsHumanlikeSenses: true,
          statisticsOwner: "gm-table",
          suggestedStatistics: ["awakened_shrub", "awakened_tree"],
        },
      },
      charm: {
        condition: "charmed",
        duration: { kind: "timeSpan", unit: "day", amount: 30 },
        endsIfCasterOrAlliesDamageTarget: true,
        attitudeAfterConditionEndsOwner: "gm-table",
      },
      tableStateOwners: [
        "stat-block-or-creature-conversion",
        "world-plant-object-mutation",
        "social-attitude-after-charm",
      ],
    });
    expect(result.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 1 },
    ]);
  });

  test("Awaken admits Beast or Plant creature targets with Intelligence 3 or less", () => {
    const target = awakenCreatureTarget({
      creatureType: "beast",
      intelligenceScore: 3,
      languageGranted: "Sylvan",
    });
    const result = requireRight(
      castAwaken({
        sheet: awakenBardSheet({ preparedSpells: ["awaken"], slots: 1 }),
        unitLibrary,
        casting: completedAwakenCasting,
        target,
      }),
    );

    expect(result.invocation.target).toEqual(target);
    expect(result.invocation.transformation).toEqual({
      intelligenceScore: 10,
      language: {
        source: "one_language_the_caster_knows",
        selectedLanguage: "Sylvan",
      },
      naturalPlantCreatureChange: { applies: false },
    });
    expect(result.invocation.charm.duration).toEqual({
      kind: "timeSpan",
      unit: "day",
      amount: 30,
    });
  });

  test("Awaken rejects ineligible target facts before spending the spell slot", () => {
    const sheet = awakenBardSheet({ preparedSpells: ["awaken"], slots: 1 });
    const result = castAwaken({
      sheet,
      unitLibrary,
      casting: completedAwakenCasting,
      target: awakenCreatureTarget({
        creatureType: "beast",
        intelligenceScore: 4,
        languageGranted: "Sylvan",
      }),
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe(
        "Awaken creature targets must have Intelligence 3 or less.",
      );
    }
    expect(sheet.spellSlotExpenditures).toEqual([]);
  });

  test("Awaken requires prepared class Spell Access", () => {
    const result = castAwaken({
      sheet: awakenBardSheet({ preparedSpells: [], slots: 1 }),
      unitLibrary,
      casting: completedAwakenCasting,
      target: awakenNaturalPlantTarget(),
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe(
        "Awaken requires prepared class Spell Access.",
      );
    }
  });
});

const completedAwakenCasting = {
  tag: "completedAwakenCasting",
  materialComponents: AWAKEN_MATERIAL_COMPONENTS,
} as const;

const awakenSelectedIdentityActions = {
  doCastAwaken: () => {
    const result = requireRight(
      castAwaken({
        sheet: awakenBardSheet({ preparedSpells: ["awaken"], slots: 1 }),
        unitLibrary,
        casting: completedAwakenCasting,
        target: awakenNaturalPlantTarget(),
      }),
    );
    const plantChange =
      result.invocation.transformation.naturalPlantCreatureChange;
    if (plantChange.applies !== true) {
      throw new Error("Expected Awaken replay to transform a natural Plant.");
    }
    return {
      spellId: result.invocation.spellId,
      spellSlotCost: result.invocation.spellSlotCost.kind,
      slotLevel: result.invocation.spellSlotCost.spellLevel,
      slotExpended:
        (result.sheet.spellSlotExpenditures ?? []).find(
          (slot) => slot.spellLevel === spellSlotLevel(5),
        )?.expended ?? 0,
      castingHours: result.invocation.castingTime.amount,
      materialAgateCostGpMinimum:
        result.invocation.materialComponents.agateCostGpMinimum,
      materialConsumed: result.invocation.materialComponents.consumed,
      targetTag: "naturalPlant",
      intelligenceScore: result.invocation.transformation.intelligenceScore,
      languageSource: result.invocation.transformation.language.source,
      charmDurationDays: result.invocation.charm.duration.amount,
      statisticsOwner: plantChange.statisticsOwner,
    };
  },
} as const satisfies Record<
  AwakenSelectedIdentityDriverAction,
  () => AwakenSelectedIdentityProjection
>;

function expectedAwakenProjection(): AwakenSelectedIdentityProjection {
  return {
    spellId: "awaken",
    spellSlotCost: "ordinary",
    slotLevel: 5,
    slotExpended: 1,
    castingHours: 8,
    materialAgateCostGpMinimum: 1000,
    materialConsumed: true,
    targetTag: "naturalPlant",
    intelligenceScore: 10,
    languageSource: "one_language_the_caster_knows",
    charmDurationDays: 30,
    statisticsOwner: "gm-table",
  };
}

function awakenNaturalPlantTarget(): CharacterSheetAwakenTarget {
  return {
    tag: "naturalPlant",
    targetId: requireRight(characterSheetAwakenTargetId("awaken:oak-sapling")),
    languageGranted: "Druidic",
  };
}

function awakenCreatureTarget(input: {
  readonly creatureType: "beast" | "plant";
  readonly intelligenceScore: number;
  readonly languageGranted: string;
}): CharacterSheetAwakenTarget {
  return {
    tag: "beastOrPlantCreature",
    targetId: requireRight(characterSheetAwakenTargetId("awaken:creature")),
    creatureType: input.creatureType,
    intelligenceScore: input.intelligenceScore,
    languageGranted: input.languageGranted,
  };
}

function awakenBardSheet(input: {
  readonly preparedSpells: readonly string[];
  readonly slots: number;
}) {
  return requireRight(
    rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:awaken-bard-9"),
      build: {
        ...armorClassBuild({
          startingClass: "class_bard",
          advancements: Array.from({ length: 8 }, () => "class_bard"),
        }),
        spellcasting: {
          sources: [
            {
              sourceUnitId: authoredUnitId("class_bard"),
              spellcastingAbility: "cha",
              cantrips: [
                authoredUnitId("dancing_lights"),
                authoredUnitId("light"),
                authoredUnitId("vicious_mockery"),
              ],
              spellbook: [],
              preparedSpells: input.preparedSpells.map(authoredUnitId),
              spellcastingFocuses: ["musical_instrument"],
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
      currentHp: Hp(36),
      tempHp: Hp(0),
      unitLibrary,
    }),
  );
}
