import type { CharacterBuild } from "@dnd/character-creation-runtime";
import {
  abilityScoreAssignment,
  characterEquipmentItemId,
  characterEquipmentItemUnitId,
  classUnitId,
} from "@dnd/character-creation-runtime";
import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import { elapsedTimeTicks, timeSpanDuration } from "@dnd/shared/elapsed-time";
import { DieRollResult, Hp } from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { Either } from "effect";
import { describe, expect, test } from "vitest";

import {
  characterSheetArmorClassState,
  characterSheetId,
  characterSheetTempHp,
  createFreshCharacterSheet,
  parseCharacterSheet,
  timePassed,
  type CharacterSheet,
} from "./index.ts";

// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.armor-class-base-formula

// These tests exercise Character Sheet HP invariants; the fixture only needs
// the non-spellcasting discriminator read by createFreshCharacterSheet.
const build = { spellcasting: undefined } as unknown as CharacterBuild;

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Character Sheet runtime test Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;

describe("Character Sheet runtime", () => {
  test("creates a fresh non-spellcasting Character Sheet at current HP", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:test"),
      build,
      maximumHp: Hp(12),
      currentHp: Hp(12),
      tempHp: Hp(0),
    });

    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isRight(sheet)) {
      expect(sheet.right.hitPoints).toEqual({
        tag: "positive",
        currentHp: 12,
        tempHp: 0,
      });
    }
  });

  test("stores Temporary Hit Points as in-play HP state", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:test"),
      build,
      maximumHp: Hp(12),
      currentHp: Hp(12),
      tempHp: Hp(5),
    });

    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isRight(sheet)) {
      expect(characterSheetTempHp(sheet.right)).toBe(5);
    }
  });

  test("rejects contradictory positive and zero-HP state", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:test"),
      build,
      maximumHp: Hp(12),
      currentHp: Hp(1),
      tempHp: Hp(0),
      zeroHpLifecycle: {
        tag: "unstable",
        deathSaves: { successes: 0, failures: 0 },
      },
    });

    expect(Either.isLeft(sheet)).toBe(true);
  });

  test("rejects current HP above sheet maximum HP", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:test"),
      build,
      maximumHp: Hp(12),
      currentHp: Hp(13),
      tempHp: Hp(0),
    });

    expect(Either.isLeft(sheet)).toBe(true);
  });

  test("rejects stored sheets with malformed Character Build shape", () => {
    const sheet = parseCharacterSheet({
      tag: "available",
      characterId: "character:test",
      build: {
        progression: {},
        background: "background_soldier",
        species: "species_orc",
        abilityScores: {},
        proficiencyChoices: [],
        features: [],
        equipment: {},
      },
      maximumHp: 12,
      hitPoints: { tag: "positive", currentHp: 12 },
    });

    expect(Either.isLeft(sheet)).toBe(true);
  });

  test("timePassed accumulates Stable recovery time before one hour can pass", () => {
    const result = timePassed({
      sheet: stableSheet("character:stable-round"),
      duration: requireRight(timeSpanDuration({ unit: "round", amount: 1 })),
      fills: [],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      elapsedTicks: 1,
      sheet: {
        hitPoints: {
          tag: "zero",
          lifecycle: {
            tag: "stable",
            recovery: {
              kind: "regains1HpAfter1d4Hours",
              elapsedBeforeRecoveryRoll: 1,
            },
          },
        },
      },
    });
  });

  test("timePassed asks for a Stable recovery roll at the one-hour boundary", () => {
    const result = timePassed({
      sheet: stableSheet("character:stable-roll"),
      duration: requireRight(timeSpanDuration({ unit: "hour", amount: 1 })),
      fills: [],
    });

    expect(result).toMatchObject({
      tag: "needsHoles",
      elapsedTicks: 0,
      remainingTicks: 600,
      holes: [
        {
          kind: "rolledDice",
          holeId: "character-sheet:character:stable-roll:stable-recovery-roll",
          label: "Stable recovery 1d4 hours",
        },
      ],
    });
  });

  test("timePassed reaches the Stable recovery roll boundary across multiple calls", () => {
    const firstHalfHour = timePassed({
      sheet: stableSheet("character:stable-halves"),
      duration: requireRight(timeSpanDuration({ unit: "minute", amount: 30 })),
      fills: [],
    });
    if (firstHalfHour.tag !== "resolved") {
      throw new Error(`Expected resolved, got ${firstHalfHour.tag}.`);
    }

    const secondHalfHour = timePassed({
      sheet: firstHalfHour.sheet,
      duration: requireRight(timeSpanDuration({ unit: "minute", amount: 30 })),
      fills: [],
    });

    expect(secondHalfHour).toMatchObject({
      tag: "needsHoles",
      elapsedTicks: 0,
      remainingTicks: 600,
    });
  });

  test("timePassed rejects a Stable recovery roll before the one-hour boundary", () => {
    const sheet = stableSheet("character:stable-early-roll");
    const awaitingRoll = timePassed({
      sheet,
      duration: requireRight(timeSpanDuration({ unit: "hour", amount: 1 })),
      fills: [],
    });
    if (awaitingRoll.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingRoll.tag}.`);
    }

    expect(
      timePassed({
        sheet,
        duration: requireRight(
          timeSpanDuration({ unit: "minute", amount: 30 }),
        ),
        fills: [
          {
            kind: "rolledDice",
            holeId: awaitingRoll.holes[0].holeId,
            value: [{ results: [DieRollResult(1)] }],
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });

  test("timePassed consumes a Stable recovery roll and recovers after the rolled duration", () => {
    const sheet = stableSheet("character:stable-recovery");
    const awaitingRoll = timePassed({
      sheet,
      duration: requireRight(timeSpanDuration({ unit: "hour", amount: 1 })),
      fills: [],
    });
    if (awaitingRoll.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingRoll.tag}.`);
    }

    const firstHour = timePassed({
      sheet,
      duration: requireRight(timeSpanDuration({ unit: "hour", amount: 1 })),
      fills: [
        {
          kind: "rolledDice",
          holeId: awaitingRoll.holes[0].holeId,
          value: [{ results: [DieRollResult(2)] }],
        },
      ],
    });

    expect(firstHour).toMatchObject({
      tag: "resolved",
      elapsedTicks: 600,
      sheet: {
        hitPoints: {
          tag: "zero",
          lifecycle: {
            tag: "stable",
            recovery: { kind: "regains1HpAfter", remaining: 600 },
          },
        },
      },
    });
    if (firstHour.tag !== "resolved") {
      throw new Error(`Expected resolved, got ${firstHour.tag}.`);
    }

    expect(
      timePassed({
        sheet: firstHour.sheet,
        duration: requireRight(timeSpanDuration({ unit: "hour", amount: 1 })),
        fills: [],
      }),
    ).toMatchObject({
      tag: "resolved",
      elapsedTicks: 600,
      sheet: { hitPoints: { tag: "positive", currentHp: 1, tempHp: 0 } },
    });
  });

  test("derives default unarmored Armor Class from Dexterity", () => {
    const state = requireRight(
      characterSheetArmorClassState({
        build: armorClassBuild({ startingClass: "class_fighter" }),
        unitLibrary,
      }),
    );

    expect(state.base).toMatchObject({
      kind: "ability_sum",
      source: "default_unarmored",
    });
    expect(currentArmorClass(state)).toBe(12);
  });

  test("derives Barbarian Unarmored Defense and still allows Shield bonus", () => {
    const state = requireRight(
      characterSheetArmorClassState({
        build: armorClassBuild({
          startingClass: "class_barbarian",
          shield: true,
        }),
        unitLibrary,
      }),
    );

    expect(state.base).toMatchObject({
      kind: "ability_sum",
      source: "barbarian_unarmored_defense",
      sourceUnitId: "barbarian_unarmored_defense",
    });
    expect(currentArmorClass(state)).toBe(15);
  });

  test("suppresses Monk Unarmored Defense while wielding a Shield", () => {
    const state = requireRight(
      characterSheetArmorClassState({
        build: armorClassBuild({ startingClass: "class_monk", shield: true }),
        unitLibrary,
      }),
    );

    expect(state.base).toMatchObject({
      kind: "ability_sum",
      source: "default_unarmored",
    });
    expect(currentArmorClass(state)).toBe(12);
  });

  test("requires an Armor Class base choice when multiple class formulas apply", () => {
    const result = characterSheetArmorClassState({
      build: armorClassBuild({
        startingClass: "class_barbarian",
        advancements: ["class_monk"],
      }),
      unitLibrary,
    });

    expect(Either.isLeft(result)).toBe(true);
  });

  test("rejects missing class-feature Units while deriving Armor Class base formulas", () => {
    const result = characterSheetArmorClassState({
      build: {
        ...armorClassBuild({ startingClass: "class_fighter" }),
        features: [
          {
            kind: "selectedClassChoice",
            selectedFromUnitId: "class_fighter",
            unitId: "missing_unarmored_defense",
          },
        ],
      },
      unitLibrary,
    });

    expect(result).toMatchObject({
      _tag: "Left",
      left: { message: "Unknown Unit id: missing_unarmored_defense" },
    });
  });

  test("uses the selected Armor Class base formula for multiclass characters", () => {
    const monkState = requireRight(
      characterSheetArmorClassState({
        build: armorClassBuild({
          startingClass: "class_barbarian",
          advancements: ["class_monk"],
        }),
        unitLibrary,
        baseChoice: {
          kind: "class_feature",
          unitId: "monk_unarmored_defense",
        },
      }),
    );
    const barbarianState = requireRight(
      characterSheetArmorClassState({
        build: armorClassBuild({
          startingClass: "class_barbarian",
          advancements: ["class_monk"],
        }),
        unitLibrary,
        baseChoice: {
          kind: "class_feature",
          unitId: "barbarian_unarmored_defense",
        },
      }),
    );

    expect(monkState.base).toMatchObject({
      source: "monk_unarmored_defense",
      sourceUnitId: "monk_unarmored_defense",
    });
    expect(currentArmorClass(monkState)).toBe(15);
    expect(barbarianState.base).toMatchObject({
      source: "barbarian_unarmored_defense",
      sourceUnitId: "barbarian_unarmored_defense",
    });
    expect(currentArmorClass(barbarianState)).toBe(13);
  });

  test("uses worn armor instead of unarmored base formulas", () => {
    const state = requireRight(
      characterSheetArmorClassState({
        build: armorClassBuild({
          startingClass: "class_barbarian",
          armor: "armor_chain_mail",
        }),
        unitLibrary,
      }),
    );

    expect(state.base).toMatchObject({
      kind: "armor",
      category: "heavy",
    });
    expect(currentArmorClass(state)).toBe(16);
  });
});

function stableSheet(characterIdText: string): CharacterSheet {
  return requireRight(
    createFreshCharacterSheet({
      characterId: characterSheetId(characterIdText),
      build,
      maximumHp: Hp(12),
      currentHp: Hp(0),
      tempHp: Hp(0),
      zeroHpLifecycle: {
        tag: "stable",
        recovery: {
          kind: "regains1HpAfter1d4Hours",
          elapsedBeforeRecoveryRoll: elapsedTimeTicks(0),
        },
      },
    }),
  );
}

function requireRight<A, E>(either: Either.Either<A, E>): A {
  if (Either.isRight(either)) return either.right;
  throw new Error("Expected Either.right.");
}

function armorClassBuild(input: {
  readonly startingClass: string;
  readonly advancements?: readonly string[];
  readonly armor?: string;
  readonly shield?: boolean;
}): CharacterBuild {
  const armorItemId =
    input.armor === undefined
      ? undefined
      : characterEquipmentItemId({
          slot: "armor",
          unitId: expectRight(characterEquipmentItemUnitId(input.armor)),
        });
  const shieldItemId =
    input.shield === true
      ? characterEquipmentItemId({
          slot: "shield",
          unitId: expectRight(characterEquipmentItemUnitId("equipment_shield")),
        })
      : undefined;
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
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
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
    equipment: {
      owned: [
        ...(armorItemId === undefined || input.armor === undefined
          ? []
          : [{ itemId: armorItemId, unitId: input.armor }]),
        ...(shieldItemId === undefined
          ? []
          : [{ itemId: shieldItemId, unitId: "equipment_shield" }]),
      ],
      loadout: {
        ...(armorItemId === undefined ? {} : { armor: armorItemId }),
        ...(shieldItemId === undefined ? {} : { shield: shieldItemId }),
      },
    },
  };
}

function expectRight<A, E>(either: Either.Either<A, E>): A {
  if (Either.isRight(either)) return either.right;
  throw new Error(`Expected Either.right, got ${JSON.stringify(either.left)}.`);
}
