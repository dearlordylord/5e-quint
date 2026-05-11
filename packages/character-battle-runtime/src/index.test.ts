import type {
  BattleCreatureState,
  CharacterBattleSpellcastingState,
} from "@dnd/battle-runtime";
import {
  battleCombatantSide,
  battleId,
  characterId,
  combatantId,
  discoverBattleActs,
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
  characterSheetPactSlots,
  characterSheetSpellSlots,
  characterSheetId,
  characterSheetTempHp,
  createFreshCharacterSheet as createFreshCharacterSheetCore,
  type CharacterSheetInput,
} from "@dnd/character-sheet-runtime";
import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import { elapsedTimeTicks } from "@dnd/shared/elapsed-time";
import {
  Hp,
  abilityModifier,
  proficiencyBonus,
  resourceCount,
  spellSlotLevel,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import { Either } from "effect";
import { describe, expect, test } from "vitest";

import {
  applyBattleHandoffToCharacterSheet,
  battleCreatureInitFromCharacterBuild,
  characterArmorClassState,
  startBattleFromCharacterBuildAndStatBlock,
} from "./index.ts";

const build = defenseBuild({ wearingArmor: false });

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});
if (unitCatalogResult.tag !== "ok" || statBlockCatalogResult.tag !== "ok") {
  throw new Error("Character battle runtime test Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;
const statBlockCatalog = statBlockCatalogResult.catalog;

function createFreshCharacterSheet(
  input: Omit<CharacterSheetInput, "conditions"> &
    Partial<Pick<CharacterSheetInput, "conditions">>,
) {
  return createFreshCharacterSheetCore({
    conditions: [],
    ...input,
  });
}

describe("Character Sheet battle handoff", () => {
  test("rejects mismatched battle character identity", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:sheet"),
      build,
      maximumHp: Hp(10),
      currentHp: Hp(10),
      tempHp: Hp(0),
      unitLibrary,
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const handoff = applyBattleHandoffToCharacterSheet({
      sheet: sheet.right,
      unitLibrary,
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
      unitLibrary,
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const handoff = applyBattleHandoffToCharacterSheet({
      sheet: sheet.right,
      unitLibrary,
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
      unitLibrary,
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const handoff = applyBattleHandoffToCharacterSheet({
      sheet: sheet.right,
      unitLibrary,
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
      unitLibrary,
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
      unitLibrary,
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

  test("preserves non-battle sheet state while settling battle-owned HP and Spell Slots", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:rest-state"),
      build: wizardWarlockBuild(),
      maximumHp: Hp(10),
      currentHp: Hp(10),
      tempHp: Hp(0),
      unitLibrary,
      spentHitDice: [{ classUnitId: "class_wizard", spent: resourceCount(1) }],
      spellSlots: [
        {
          spellLevel: spellSlotLevel(1),
          count: resourceCount(2),
          expended: resourceCount(1),
        },
      ],
      pactSlots: {
        slotLevel: spellSlotLevel(1),
        count: resourceCount(1),
        expended: resourceCount(1),
      },
      restFeatureUses: [{ tag: "arcaneRecovery", usedSinceLongRest: true }],
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const handoff = applyBattleHandoffToCharacterSheet({
      sheet: sheet.right,
      unitLibrary,
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:rest-state"),
          spellcasting: handoffSpellcastingState(),
        },
        hp: Hp(6),
        maxHp: Hp(10),
        tempHp: Hp(3),
        positiveHpUnconscious: null,
      }),
    });

    const settled = expectRight(handoff);
    expect(settled.spentHitDice).toEqual([
      { classUnitId: "class_wizard", spent: 1 },
    ]);
    expect(settled.restFeatureUses).toEqual([
      { tag: "arcaneRecovery", usedSinceLongRest: true },
    ]);
    expect(characterSheetPactSlots(settled)).toEqual({
      slotLevel: 1,
      count: 1,
      expended: 1,
    });
    expect(characterSheetSpellSlots(settled)).toEqual([
      { spellLevel: 1, count: 2, expended: 2 },
    ]);
    expect(characterSheetTempHp(settled)).toBe(3);
  });

  test("preserves sheet-owned healing resource expenditures", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:paladin-handoff"),
      build: paladinBuild(),
      maximumHp: Hp(12),
      currentHp: Hp(12),
      tempHp: Hp(0),
      unitLibrary,
      resourceExpenditures: [
        { tag: "layOnHandsHealingPool", expended: resourceCount(3) },
      ],
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const handoff = applyBattleHandoffToCharacterSheet({
      sheet: sheet.right,
      unitLibrary,
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:paladin-handoff"),
        },
        hp: Hp(9),
        maxHp: Hp(12),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    });

    const settled = expectRight(handoff);
    expect(settled.resourceExpenditures).toEqual([
      { tag: "layOnHandsHealingPool", expended: 3 },
    ]);
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
      source: "unarmored_defense",
      sourceUnitId: "monk_unarmored_defense",
    });
    expect(currentArmorClass(init.creatureInit.armorClass)).toBe(15);
  });

  test("does not project sheet-owned charge-pool resources into battle init", () => {
    const init = expectRight(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("fighter-lay-on-hands"),
        characterId: characterId("character:fighter-lay-on-hands"),
        displayName: "Fighter With Sheet Resource",
        build: fighterWithLayOnHandsResourceBuild(),
        initiative: initiativeScore(10),
        side: battleCombatantSide("party"),
        unitLibrary,
      }),
    );

    expect(init.creatureInit.kind).toBe("character");
    if (init.creatureInit.kind !== "character") return;
    expect(
      (init.creatureInit.resources ?? []).map((resource) => resource.unit.id),
    ).not.toContain("paladin_lay_on_hands");
  });

  test("threads build weapon proficiencies into True Strike discovery", () => {
    const casterId = combatantId("true-strike-wizard");
    const targetId = combatantId("true-strike-target");
    const state = expectRight(
      startBattleFromCharacterBuildAndStatBlock({
        battleId: battleId("character-battle-true-strike"),
        character: {
          combatantId: casterId,
          characterId: characterId("character:true-strike-wizard"),
          displayName: "True Strike Wizard",
          build: trueStrikeWizardBuild(),
          initiative: initiativeScore(20),
          side: battleCombatantSide("party"),
        },
        statBlockBattleInput: {
          combatantId: targetId,
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
          initiative: initiativeScore(10),
          side: battleCombatantSide("monsters"),
        },
        unitLibrary,
      }),
    );

    const trueStrike = discoverBattleActs(state).find(
      (act) => act.label === "True Strike (Dagger)",
    );

    expect(trueStrike?.subject).toMatchObject({
      tag: "actionSpell",
      actorId: casterId,
      componentWeaponItemId: trueStrikeDaggerItemId(),
    });
    expect(trueStrike?.summary).toBe(
      "Cast True Strike as a cantrip using Dagger.",
    );
    expect(
      trueStrike?.initialHoles.find((hole) => hole.kind === "targetChoice"),
    ).toMatchObject({ choices: [targetId] });
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

function trueStrikeWizardBuild(): CharacterBuild {
  const daggerItemId = trueStrikeDaggerItemId();

  return {
    progression: {
      startingClass: classUnitId("class_wizard"),
      advancements: [],
    },
    background: "background_soldier",
    species: "species_orc",
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: 8,
        dex: 14,
        con: 13,
        int: 16,
        wis: 10,
        cha: 12,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    equipment: {
      owned: [{ itemId: daggerItemId, unitId: "weapon_dagger" }],
      loadout: {
        weapon: {
          itemId: daggerItemId,
          grip: "one_handed",
        },
      },
    },
    spellcasting: {
      sources: [
        {
          sourceUnitId: "class_wizard",
          spellcastingAbility: "int",
          cantrips: ["true_strike"],
          spellbook: [],
          preparedSpells: [],
          spellcastingFocuses: ["arcane_focus"],
        },
      ],
      slotPools: {},
    },
  };
}

function trueStrikeDaggerItemId() {
  return characterEquipmentItemId({
    slot: "main",
    unitId: expectRight(characterEquipmentItemUnitId("weapon_dagger")),
  });
}

function handoffSpellcastingState(): CharacterBattleSpellcastingState {
  return {
    spellcastingAbilityModifier: abilityModifier(3),
    proficiencyBonus: proficiencyBonus(2),
    canCastSpells: true,
    cantrips: [],
    preparedSpells: [],
    spellSlots: [
      {
        spellLevel: spellSlotLevel(1),
        count: resourceCount(2),
        expended: resourceCount(2),
      },
    ],
  };
}

function wizardWarlockBuild(): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId("class_wizard"),
      advancements: [],
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
        int: 16,
        wis: 10,
        cha: 12,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    equipment: {
      owned: [],
      loadout: {},
    },
    spellcasting: {
      sources: [
        {
          sourceUnitId: "class_wizard",
          spellcastingAbility: "int",
          cantrips: [],
          spellbook: [],
          preparedSpells: [],
          spellcastingFocuses: ["arcane_focus"],
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: [{ spellLevel: 1, count: 2 }],
        },
        pactMagic: {
          kind: "pactMagic",
          slotLevel: 1,
          count: 1,
        },
      },
    },
  };
}

function paladinBuild(): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId("class_paladin"),
      advancements: [],
    },
    background: "background_soldier",
    species: "species_orc",
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: 15,
        dex: 10,
        con: 13,
        int: 8,
        wis: 12,
        cha: 14,
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

function fighterWithLayOnHandsResourceBuild(): CharacterBuild {
  return {
    ...build,
    features: [
      ...build.features,
      {
        selectedFromUnitId: "class_paladin",
        kind: "selectedClassChoice",
        unitId: "paladin_lay_on_hands",
      },
    ],
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
