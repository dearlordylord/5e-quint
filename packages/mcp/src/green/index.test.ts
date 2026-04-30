import { describe, expect, test } from "vitest";

import {
  battleId,
  characterId,
  combatantId,
  initiativeScore,
  snapshotBattle,
} from "@dnd/battle-runtime";
import {
  characterDraftId,
  createCharacterDraft,
  creationChoiceOptionId,
  creationHoleId,
  fillCreationHoles,
  finalizeCharacterDraft,
  type CharacterDraft,
  type CharacterBuild,
  type CreationFill,
} from "@dnd/character-creation-runtime";
import { Hp } from "@dnd/shared/types";

import {
  createGreenMcpCompositionRoot,
  startBattleFromCharacterBuildAndStatBlock,
} from "./index.ts";

const fighterId = combatantId("fighter");
const goblinId = combatantId("goblin");

describe("MCP green composition root", () => {
  test("builds SRD catalogs and keeps selected Stat Block state identity-only", () => {
    const root = createGreenMcpCompositionRoot();
    const selected = root.sessionStore.selectStatBlock(
      "stat_block_goblin_warrior",
    );

    expect(root.unitLibrary.listUnits().length).toBeGreaterThan(0);
    expect(root.statBlockCatalog.listStatBlocks()).toHaveLength(1);
    expect(selected.id).toBe("stat_block_goblin_warrior");
    expect(root.sessionStore.snapshot()).toMatchObject({
      draftIds: [],
      finalizedDraftIds: [],
      selectedStatBlockId: "stat_block_goblin_warrior",
      battleState: null,
      transientBattleFills: null,
    });
    expect(root.sessionStore.getSelectedStatBlock()?.id).toBe(
      "stat_block_goblin_warrior",
    );

    root.sessionStore.clearSelectedStatBlock();

    expect(root.sessionStore.snapshot().selectedStatBlockId).toBeNull();
    expect(root.sessionStore.getSelectedStatBlock()).toBeNull();
  });

  test("starts battle from Character Build at the MCP composition boundary", () => {
    const root = createGreenMcpCompositionRoot();
    const state = startBattleFromCharacterBuildAndStatBlock({
      battleId: battleId("battle-green-root"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Orc Soldier Fighter",
        build: fighterCharacterBuild(root.unitLibrary),
        initiative: initiativeScore(12),
      },
      statBlockBattleInput: {
        combatantId: goblinId,
        statBlock: root.statBlockCatalog.requireStatBlock(
          "stat_block_goblin_warrior",
        ),
      },
      unitLibrary: root.unitLibrary,
    });

    root.sessionStore.battleState = state;
    root.sessionStore.transientBattleFills = null;

    expect(snapshotBattle(state)).toMatchObject({
      battleId: battleId("battle-green-root"),
      currentActorId: fighterId,
      turnOrder: [fighterId, goblinId],
      combatants: [
        {
          combatantId: fighterId,
          displayName: "Orc Soldier Fighter",
          hp: 12,
          armorClass: 19,
        },
        {
          combatantId: goblinId,
          displayName: "Goblin Warrior",
          hp: 10,
          armorClass: 15,
        },
      ],
    });
    expect(state.combatants.get(fighterId)?.initiative).toBe(12);
    expect(state.combatants.get(goblinId)?.initiative).toBe(12);
    expect(root.sessionStore.snapshot().battleState).toBe(state);
    expect(root.sessionStore.snapshot().transientBattleFills).toBeNull();
  });

  test("does not apply Defense Fighting Style when no armor is worn", () => {
    const root = createGreenMcpCompositionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const state = startBattleFromCharacterBuildAndStatBlock({
      battleId: battleId("battle-green-root-unarmored"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Orc Soldier Fighter",
        initiative: initiativeScore(12),
        build: {
          ...build,
          equipment: {
            shield: "equipment_shield",
            weapon: { unitId: "weapon_longsword", grip: "one_handed" },
          },
        },
      },
      statBlockBattleInput: {
        combatantId: goblinId,
        statBlock: root.statBlockCatalog.requireStatBlock(
          "stat_block_goblin_warrior",
        ),
      },
      unitLibrary: root.unitLibrary,
    });

    expect(snapshotBattle(state).combatants[0]).toMatchObject({
      combatantId: fighterId,
      armorClass: 14,
    });
  });

  test("rejects character battle init when current HP exceeds build max HP", () => {
    const root = createGreenMcpCompositionRoot();

    expect(() =>
      startBattleFromCharacterBuildAndStatBlock({
        battleId: battleId("battle-green-root-overmax-hp"),
        character: {
          combatantId: fighterId,
          characterId: characterId("fighter-character"),
          displayName: "Orc Soldier Fighter",
          build: fighterCharacterBuild(root.unitLibrary),
          initiative: initiativeScore(12),
          currentHp: Hp(13),
        },
        statBlockBattleInput: {
          combatantId: goblinId,
          statBlock: root.statBlockCatalog.requireStatBlock(
            "stat_block_goblin_warrior",
          ),
        },
        unitLibrary: root.unitLibrary,
      }),
    ).toThrow("Character battle initialization current HP exceeds max HP.");
  });
});

function fighterCharacterBuild(
  unitLibrary: ReturnType<typeof createGreenMcpCompositionRoot>["unitLibrary"],
): CharacterBuild {
  const result = finalizeCharacterDraft({
    draft: completeManifestDraft(unitLibrary),
    unitLibrary,
  });
  if (result.tag !== "ready") {
    throw new Error("Expected complete manifest draft to finalize.");
  }

  return result.build;
}

function createTestDraft(draftId: string): CharacterDraft {
  return createCharacterDraft({
    draftId: characterDraftId(draftId),
  });
}

function completeManifestDraft(
  unitLibrary: ReturnType<typeof createGreenMcpCompositionRoot>["unitLibrary"],
): CharacterDraft {
  const draft = createTestDraft("draft:mcp-green-complete-manifest");
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
        choiceFill(
          "cc:unit:class_fighter:fighter_skill_choices",
          "perception",
          "survival",
        ),
        choiceFill(
          "cc:unit:fighter_fighting_style_l1:fighter_fighting_style",
          "defense",
        ),
        choiceFill(
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
        choiceFill(
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
      method: "standardArray",
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
      kind: "choice",
      holeId: creationHoleId("cc:draft:draft.languages"),
      optionIds: [
        creationChoiceOptionId("Dwarvish"),
        creationChoiceOptionId("Goblin"),
      ],
    },
    choiceFill("cc:draft:draft.alignment", "lawful_good"),
  ];
}

function choiceFill(
  holeId: string,
  ...optionIds: readonly string[]
): CreationFill {
  return {
    kind: "choice",
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
