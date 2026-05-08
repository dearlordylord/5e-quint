import type { BattleCreatureState } from "@dnd/battle-runtime";
import {
  battleCombatantSide,
  characterId,
  combatantId,
  initiativeScore,
} from "@dnd/battle-runtime";
import {
  abilityScoreAssignment,
  characterEquipmentItemId,
  characterEquipmentItemUnitId,
  classUnitId,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import {
  characterSheetId,
  characterSheetTempHp,
  createFreshCharacterSheet,
} from "@dnd/character-sheet-runtime";
import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import { elapsedTimeTicks } from "@dnd/shared/elapsed-time";
import { Hp } from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { Either } from "effect";
import { describe, expect, test } from "vitest";

import {
  applyBattleHandoffToCharacterSheet,
  battleCreatureInitFromCharacterBuild,
  characterArmorClassState,
} from "./index.ts";

// The handoff test exercises identity rejection before build-derived fields are
// inspected; this fixture only needs the non-spellcasting discriminator.
const build = { spellcasting: undefined } as unknown as CharacterBuild;

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Character battle runtime test Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;

describe("Character Sheet battle handoff", () => {
  test("rejects mismatched battle character identity", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:sheet"),
      build,
      maximumHp: Hp(10),
      currentHp: Hp(10),
      tempHp: Hp(0),
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const handoff = applyBattleHandoffToCharacterSheet({
      sheet: sheet.right,
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:battle"),
        },
      }),
    });

    expect(Either.isLeft(handoff)).toBe(true);
  });

  test("rejects handoff maximum HP drift from the existing Character Sheet", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:sheet"),
      build,
      maximumHp: Hp(10),
      currentHp: Hp(10),
      tempHp: Hp(0),
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const handoff = applyBattleHandoffToCharacterSheet({
      sheet: sheet.right,
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:sheet"),
        },
        hp: Hp(10),
        maxHp: Hp(12),
      }),
    });

    expect(Either.isLeft(handoff)).toBe(true);
  });

  test("preserves remaining Temporary Hit Points from battle handoff", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:sheet"),
      build,
      maximumHp: Hp(10),
      currentHp: Hp(10),
      tempHp: Hp(0),
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const handoff = applyBattleHandoffToCharacterSheet({
      sheet: sheet.right,
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:sheet"),
        },
        hp: Hp(8),
        maxHp: Hp(10),
        tempHp: Hp(4),
        positiveHpUnconscious: null,
      }),
    });

    expect(Either.isRight(handoff)).toBe(true);
    if (Either.isRight(handoff)) {
      expect(characterSheetTempHp(handoff.right)).toBe(4);
    }
  });

  test("rejects stable battle handoff when the sheet has in-progress Stable recovery time", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:stable"),
      build,
      maximumHp: Hp(10),
      currentHp: Hp(0),
      tempHp: Hp(0),
      zeroHpLifecycle: {
        tag: "stable",
        recovery: {
          kind: "regains1HpAfter1d4Hours",
          elapsedBeforeRecoveryRoll: elapsedTimeTicks(1),
        },
      },
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const handoff = applyBattleHandoffToCharacterSheet({
      sheet: sheet.right,
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:stable"),
        },
        hp: Hp(0),
        maxHp: Hp(10),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
        zeroHpLifecycle: {
          policy: "usesDeathSavingThrows",
          deathSaves: {
            deathSaves: { successes: 0, failures: 0 },
            stable: true,
            dead: false,
            hpRegained: false,
          },
        },
      }),
    });

    expect(Either.isLeft(handoff)).toBe(true);
  });
});

describe("Character Build battle projection", () => {
  test("applies Defense Armor Class bonus while wearing eligible armor", () => {
    const armorClass = expectRight(
      characterArmorClassState({
        build: defenseBuild({ wearingArmor: true }),
        unitLibrary,
      }),
    );

    expect(currentArmorClass(armorClass)).toBe(17);
    expect(armorClass.bonuses).toContainEqual({
      kind: "wearing_armor",
      bonus: 1,
      categories: ["light", "medium", "heavy"],
      sourceUnitId: "defense",
    });
  });

  test("does not apply Defense Armor Class bonus when no eligible armor is worn", () => {
    const armorClass = expectRight(
      characterArmorClassState({
        build: defenseBuild({ wearingArmor: false }),
        unitLibrary,
      }),
    );

    expect(currentArmorClass(armorClass)).toBe(12);
    expect(armorClass.bonuses).toContainEqual({
      kind: "wearing_armor",
      bonus: 1,
      categories: ["light", "medium", "heavy"],
      sourceUnitId: "defense",
    });
  });

  test("threads selected Armor Class base choice through battle initialization", () => {
    const init = expectRight(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("barbarian-monk"),
        characterId: characterId("character:barbarian-monk"),
        displayName: "Barbarian Monk",
        build: multiclassUnarmoredDefenseBuild(),
        initiative: initiativeScore(10),
        side: battleCombatantSide("party"),
        unitLibrary,
        armorClassBaseChoice: {
          kind: "class_feature",
          unitId: "monk_unarmored_defense",
        },
      }),
    );

    expect(init.creatureInit.kind).toBe("character");
    if (init.creatureInit.kind !== "character") return;
    expect(init.creatureInit.armorClass.base).toMatchObject({
      source: "monk_unarmored_defense",
      sourceUnitId: "monk_unarmored_defense",
    });
    expect(currentArmorClass(init.creatureInit.armorClass)).toBe(15);
  });
});

function multiclassUnarmoredDefenseBuild(): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId("class_barbarian"),
      advancements: [
        {
          classUnitId: classUnitId("class_monk"),
          hitPointRule: { tag: "fixedHigherLevelGain" },
        },
      ],
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
      owned: [],
      loadout: {},
    },
  };
}

function defenseBuild(input: {
  readonly wearingArmor: boolean;
}): CharacterBuild {
  const armorItemId = characterEquipmentItemId({
    slot: "armor",
    unitId: expectRight(characterEquipmentItemUnitId("armor_chain_mail")),
  });

  return {
    progression: {
      startingClass: classUnitId("class_fighter"),
      advancements: [],
    },
    background: "background_soldier",
    species: "species_orc",
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: 15,
        dex: 14,
        con: 13,
        int: 8,
        wis: 10,
        cha: 12,
      }),
    ),
    proficiencyChoices: [],
    features: [
      {
        selectedFromUnitId: "fighter_fighting_style",
        kind: "selectedClassChoice",
        unitId: "defense",
      },
    ],
    equipment: {
      owned: [{ itemId: armorItemId, unitId: "armor_chain_mail" }],
      loadout: input.wearingArmor ? { armor: armorItemId } : {},
    },
  };
}

function expectRight<T, E>(result: Either.Either<T, E>): T {
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(`Expected Right, got ${JSON.stringify(result.left)}`);
  }
  return result.right;
}

function handoffBranchCombatant(
  combatant: Omit<Partial<BattleCreatureState>, "origin"> & {
    readonly origin: Partial<
      Extract<BattleCreatureState["origin"], { readonly kind: "character" }>
    > & {
      readonly kind: "character";
      readonly characterId: ReturnType<typeof characterId>;
    };
  },
): BattleCreatureState {
  // Branch-specific handoff fixtures provide every field read before the tested
  // branch exits. BattleCreatureState's remaining fields are unreachable here.
  return combatant as BattleCreatureState;
}
