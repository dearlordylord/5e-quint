import { describe, expect, test } from "vitest";

import {
  battleId,
  characterId,
  combatantId,
  discoverBattleActs,
  endTurn,
  initiativeScore,
  monsterId,
  snapshotBattle,
  startBattle,
  startBattleFromCharacterSheetAndStatBlock,
  type BattleState,
  type CombatantSeedInput,
} from "./index.ts";
import {
  characterDraftId,
  createCharacterDraft,
  creationChoiceOptionId,
  creationHoleId,
  fillCreationHoles,
  finalizeCharacterDraft,
} from "@dnd/character-creation-runtime";
import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import { Hp } from "@dnd/shared/types";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import type {
  CharacterDraft,
  CharacterSheet,
  CreationFill,
} from "@dnd/character-creation-runtime";

const fighterId = combatantId("fighter");
const goblinId = combatantId("goblin");
const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});

if (unitCatalogResult.tag !== "ok" || statBlockCatalogResult.tag !== "ok") {
  throw new Error("Battle runtime test catalogs must build successfully.");
}

const unitLibrary = unitCatalogResult.catalog;
const statBlockCatalog = statBlockCatalogResult.catalog;

describe("battle runtime skeleton", () => {
  test("starts a battle from a finalized Character Sheet and Goblin Warrior Stat Block", () => {
    const state = startBattleFromCharacterSheetAndStatBlock({
      battleId: battleId("battle-1"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Orc Soldier Fighter",
        sheet: fighterCharacterSheet(),
      },
      monster: {
        combatantId: goblinId,
        monsterId: monsterId("goblin-warrior"),
        statBlock: statBlockRecord(),
      },
      unitLibrary,
    });

    const fighter = state.combatants.get(fighterId);
    const goblin = state.combatants.get(goblinId);

    expect(snapshotBattle(state)).toMatchObject({
      battleId: battleId("battle-1"),
      round: 1,
      currentActorId: fighterId,
      turnOrder: [fighterId, goblinId],
      combatants: [
        {
          combatantId: fighterId,
          displayName: "Orc Soldier Fighter",
          sourceKind: "character",
          hp: 12,
          maxHp: 12,
          tempHp: 0,
          armorClass: 19,
          defeated: false,
          zeroHpLifecyclePolicy: "usesDeathSavingThrows",
        },
        {
          combatantId: goblinId,
          displayName: "Goblin Warrior",
          sourceKind: "monster",
          hp: 10,
          maxHp: 10,
          tempHp: 0,
          armorClass: 15,
          defeated: false,
          zeroHpLifecyclePolicy: "diesAtZeroHp",
        },
      ],
      currentTurnResources: {
        actionResources: [{ kind: "action", source: "turn" }],
        currentHasBonusAction: true,
      },
    });
    expect(fighter?.initiative).toBe(12);
    expect(goblin?.initiative).toBe(12);
    expect(fighter?.source).toMatchObject({
      kind: "character",
      selectedLoadout: {
        armor: "armor_chain_mail",
        shield: "equipment_shield",
        weapon: { unitId: "weapon_longsword", grip: "one_handed" },
      },
    });
    expect(goblin?.source).toMatchObject({
      kind: "monster",
      statBlock: {
        id: "stat_block_goblin_warrior",
        statBlock: {
          ac: { kind: "literal", value: 15 },
          hp: { kind: "literal", value: 10 },
          initiativeModifier: 2,
        },
      },
    });
  });

  test("does not apply Defense Fighting Style when no armor is worn", () => {
    const sheet = fighterCharacterSheet();
    const state = startBattleFromCharacterSheetAndStatBlock({
      battleId: battleId("battle-unarmored-defense"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Orc Soldier Fighter",
        sheet: {
          ...sheet,
          equipment: {
            ...sheet.equipment,
            loadout: {
              shield: "equipment_shield",
              weapon: { unitId: "weapon_longsword", grip: "one_handed" },
            },
          },
        },
      },
      monster: {
        combatantId: goblinId,
        monsterId: monsterId("goblin-warrior"),
        statBlock: statBlockRecord(),
      },
      unitLibrary,
    });

    expect(snapshotBattle(state).combatants[0]).toMatchObject({
      combatantId: fighterId,
      armorClass: 14,
    });
  });

  test("startBattle creates sorted Initiative state and the MCP snapshot contract", () => {
    const state = startBattle({
      battleId: battleId("battle-1"),
      combatants: [
        characterSeed({ initiative: 12 }),
        monsterSeed({ initiative: 16, currentHp: 0 }),
      ],
    });

    expect(snapshotBattle(state)).toMatchObject({
      battleId: battleId("battle-1"),
      round: 1,
      currentActorId: goblinId,
      turnOrder: [goblinId, fighterId],
      combatants: [
        {
          combatantId: goblinId,
          displayName: "Goblin Warrior",
          sourceKind: "monster",
          hp: 0,
          maxHp: 10,
          tempHp: 0,
          armorClass: 15,
          defeated: true,
          zeroHpLifecyclePolicy: "diesAtZeroHp",
          conditions: [],
        },
        {
          combatantId: fighterId,
          displayName: "Fighter",
          sourceKind: "character",
          hp: 12,
          maxHp: 12,
          tempHp: 0,
          armorClass: 10,
          defeated: false,
          zeroHpLifecyclePolicy: "usesDeathSavingThrows",
          conditions: [],
        },
      ],
      acts: [
        {
          subject: { tag: "coreAct", actorId: goblinId, act: "attack" },
          label: "Attack",
          initialHoles: [],
        },
        {
          subject: { tag: "coreAct", actorId: goblinId, act: "endTurn" },
          label: "End Turn",
          initialHoles: [],
        },
      ],
      currentTurnResources: {
        actionResources: [{ kind: "action", source: "turn" }],
        currentHasBonusAction: true,
      },
    });
  });

  test("discoverBattleActs exposes only attack and endTurn for the current actor", () => {
    const acts = discoverBattleActs(
      startBattle({
        battleId: battleId("battle-1"),
        combatants: [
          characterSeed({ initiative: 20 }),
          monsterSeed({ initiative: 10 }),
        ],
      }),
    );

    expect(acts.map((act) => act.subject)).toEqual([
      { tag: "coreAct", actorId: fighterId, act: "attack" },
      { tag: "coreAct", actorId: fighterId, act: "endTurn" },
    ]);
  });

  test("snapshotBattle projects current acts from the supplied state", () => {
    const state = {
      ...startBattle({
        battleId: battleId("battle-1"),
        combatants: [
          characterSeed({ initiative: 20 }),
          monsterSeed({ initiative: 10 }),
        ],
      }),
      currentTurnResources: {
        actionResources: [],
        currentHasBonusAction: false,
      },
    } satisfies BattleState;

    expect(snapshotBattle(state).acts.map((act) => act.subject.act)).toEqual([
      "endTurn",
    ]);
  });

  test("endTurn is discoverable but not resolved before the CAM15 slice", () => {
    const state = {
      ...startBattle({
        battleId: battleId("battle-1"),
        combatants: [
          characterSeed({ initiative: 20 }),
          monsterSeed({ initiative: 10 }),
        ],
      }),
      currentTurnResources: {
        actionResources: [],
        currentHasBonusAction: false,
      },
    } satisfies BattleState;

    const result = endTurn({ state, actorId: fighterId });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "unsupportedSubject",
      snapshot: {
        currentActorId: fighterId,
        round: 1,
        currentTurnResources: {
          actionResources: [],
          currentHasBonusAction: false,
        },
      },
    });
  });
});

function characterSeed(input: {
  readonly initiative: number;
}): CombatantSeedInput {
  return {
    combatantId: fighterId,
    displayName: "Fighter",
    initiative: initiativeScore(input.initiative),
    seed: {
      kind: "character",
      characterId: characterId("fighter-character"),
      sheetUnitRefs: [],
      armorClass: defaultArmorClassState(),
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      zeroHpLifecyclePolicy: "usesDeathSavingThrows",
      selectedLoadout: {},
    },
  };
}

function monsterSeed(input: {
  readonly initiative: number;
  readonly currentHp?: number;
}): CombatantSeedInput {
  return {
    combatantId: goblinId,
    displayName: "Goblin Warrior",
    initiative: initiativeScore(input.initiative),
    seed: {
      kind: "monster",
      monsterId: monsterId("goblin-warrior"),
      statBlock: statBlockRecord(),
      currentHp: Hp(input.currentHp ?? 10),
      maxHp: Hp(10),
      tempHp: Hp(0),
      zeroHpLifecyclePolicy: "diesAtZeroHp",
    },
  };
}

function statBlockRecord(): StatBlockRecord {
  return statBlockCatalog.requireStatBlock("stat_block_goblin_warrior");
}

function fighterCharacterSheet(): CharacterSheet {
  const result = finalizeCharacterDraft({
    draft: completeManifestDraft(),
    unitLibrary,
  });
  if (result.tag !== "ready") {
    throw new Error("Expected complete manifest draft to finalize.");
  }

  return result.sheet;
}

function createTestDraft(draftId: string): CharacterDraft {
  return createCharacterDraft({
    unitLibrary,
    draftId: characterDraftId(draftId),
  });
}

function completeManifestDraft(): CharacterDraft {
  const draft = createTestDraft("draft:battle-runtime-complete-manifest");
  const afterInitial = requireAcceptedBatch(
    fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: initialManifestFills(),
    }),
  );
  const afterChoices = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterInitial,
      unitLibrary,
      expectedRevision: afterInitial.revision,
      fills: [
        multiChoiceFill(
          "cc:unit:class_fighter:fighter_skill_choices",
          "perception",
          "survival",
        ),
        choiceFill(
          "cc:unit:fighter_fighting_style_l1:fighter_fighting_style",
          "defense",
        ),
        multiChoiceFill(
          "cc:unit:fighter_weapon_mastery_l1:fighter_weapon_mastery_choices",
          "weapon_longsword",
          "weapon_spear",
          "weapon_flail",
        ),
        choiceFill(
          "cc:unit:background_soldier:background_ability_score_increase",
          "two_and_one:str:con",
        ),
        choiceFill(
          "cc:unit:background_soldier:background_tool_choice",
          "tool_dice_set",
        ),
        choiceFill("cc:unit:class_fighter:class_equipment_choice", "option_c"),
        choiceFill(
          "cc:unit:background_soldier:background_equipment_choice",
          "option_b",
        ),
      ],
    }),
  );
  const afterPurchase = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterChoices,
      unitLibrary,
      expectedRevision: afterChoices.revision,
      fills: [
        multiChoiceFill(
          "cc:unit:class_fighter:equipment_purchase",
          "armor_chain_mail",
          "weapon_longsword",
          "equipment_shield",
        ),
      ],
    }),
  );

  return requireAcceptedBatch(
    fillCreationHoles({
      draft: afterPurchase,
      unitLibrary,
      expectedRevision: afterPurchase.revision,
      fills: [
        choiceFill("cc:unit:armor_chain_mail:loadout_armor", "worn"),
        choiceFill("cc:unit:equipment_shield:loadout_shield", "wielded"),
        choiceFill(
          "cc:unit:weapon_longsword:loadout_weapon",
          "wielded_one_handed",
        ),
      ],
    }),
  );
}

function initialManifestFills(): readonly CreationFill[] {
  return [
    choiceFill("cc:draft:draft.primaryClass", "class_fighter"),
    choiceFill("cc:draft:draft.background", "background_soldier"),
    choiceFill("cc:draft:draft.species", "species_orc"),
    {
      kind: "abilityScores",
      holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
      value: {
        str: 15,
        dex: 14,
        con: 13,
        int: 8,
        wis: 10,
        cha: 12,
      },
    },
    {
      kind: "multiChoice",
      holeId: creationHoleId("cc:draft:draft.languages"),
      optionIds: [
        creationChoiceOptionId("Dwarvish"),
        creationChoiceOptionId("Goblin"),
      ],
    },
    choiceFill("cc:draft:draft.alignment", "lawful_good"),
  ];
}

function choiceFill(holeId: string, optionId: string): CreationFill {
  return {
    kind: "choice",
    holeId: testCreationHoleId(holeId),
    optionId: creationChoiceOptionId(optionId),
  };
}

function multiChoiceFill(
  holeId: string,
  ...optionIds: readonly string[]
): CreationFill {
  return {
    kind: "multiChoice",
    holeId: testCreationHoleId(holeId),
    optionIds: optionIds.map(creationChoiceOptionId),
  };
}

function testCreationHoleId(holeId: string): ReturnType<typeof creationHoleId> {
  return creationHoleId(holeId as Parameters<typeof creationHoleId>[0]);
}

function requireAcceptedBatch(result: ReturnType<typeof fillCreationHoles>) {
  if (result.tag !== "accepted") {
    throw new Error("Expected accepted character-creation fill batch.");
  }

  return result.draft;
}
