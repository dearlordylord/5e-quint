import { describe, expect, test } from "vitest";

import { createMcpCompositionRoot, handleToolCall } from "./server.ts";

describe("end-user promoted MCP vertical", () => {
  test("creates an Orc Soldier Fighter, runs battle, ends battle, and lists reduced HP", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:accepted-orc-soldier-fighter";

    const created = callTool(root, "create_character_draft", { draftId });
    expect(holeIds(created)).toEqual([
      "cc:draft:draft.primaryClass",
      "cc:draft:draft.background",
      "cc:draft:draft.species",
      "cc:draft:draft.abilityScoreGeneration",
      "cc:draft:draft.languages",
      "cc:draft:draft.alignment",
    ]);

    callTool(root, "fill_creation_holes", {
      draftId,
      expectedRevision: 0,
      fills: [
        choiceFill("cc:draft:draft.primaryClass", "class_fighter"),
        choiceFill("cc:draft:draft.background", "background_soldier"),
        choiceFill("cc:draft:draft.species", "species_orc"),
        {
          kind: "abilityScores",
          holeId: "cc:draft:draft.abilityScoreGeneration",
          method: "standardArray",
          value: { str: 15, dex: 14, con: 13, int: 8, wis: 10, cha: 12 },
        },
        choiceFill("cc:draft:draft.languages", "Dwarvish", "Goblin"),
        choiceFill("cc:draft:draft.alignment", "lawful_good"),
      ],
    });

    const choices = callTool(root, "discover_creation_holes", { draftId });
    expect(holeIds(choices)).toEqual([
      "cc:unit:class_fighter:fighter_skill_choices",
      "cc:unit:fighter_fighting_style_l1:fighter_fighting_style",
      "cc:unit:fighter_weapon_mastery_l1:fighter_weapon_mastery_choices",
      "cc:unit:class_fighter:class_equipment_choice",
      "cc:unit:background_soldier:background_ability_score_increase",
      "cc:unit:background_soldier:background_tool_choice",
      "cc:unit:background_soldier:background_equipment_choice",
    ]);

    callTool(root, "fill_creation_holes", {
      draftId,
      expectedRevision: 1,
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
        choiceFill("cc:unit:class_fighter:class_equipment_choice", "option_c"),
        choiceFill(
          "cc:unit:background_soldier:background_ability_score_increase",
          "two_and_one:str:con",
        ),
        choiceFill(
          "cc:unit:background_soldier:background_tool_choice",
          "tool_dice_set",
        ),
        choiceFill(
          "cc:unit:background_soldier:background_equipment_choice",
          "option_b",
        ),
      ],
    });

    callTool(root, "fill_creation_holes", {
      draftId,
      expectedRevision: 2,
      fills: [
        choiceFill(
          "cc:unit:class_fighter:equipment_purchase",
          "armor_chain_mail",
          "weapon_longsword",
          "equipment_shield",
        ),
      ],
    });

    callTool(root, "fill_creation_holes", {
      draftId,
      expectedRevision: 3,
      fills: [
        choiceFill("cc:unit:armor_chain_mail:loadout_armor", "worn"),
        choiceFill("cc:unit:equipment_shield:loadout_shield", "wielded"),
        choiceFill(
          "cc:unit:weapon_longsword:loadout_weapon",
          "wielded_one_handed",
        ),
      ],
    });

    const finalized = callTool(root, "finalize_character", { draftId });
    expect(finalized.finalization).toMatchObject({
      tag: "ready",
      build: {
        background: "background_soldier",
        species: "species_orc",
        hitPoints: { maximum: 12 },
      },
    });

    const selected = callTool(root, "select_stat_block", {
      statBlockId: "stat_block_goblin_warrior",
    });
    expect(selected.selectedStatBlock).toMatchObject({
      id: "stat_block_goblin_warrior",
      provenance: { kind: "srd-5.2.1" },
      statBlock: { displayName: "Goblin Warrior" },
    });

    const started = callTool(root, "start_battle", {
      battleId: "battle:accepted-vertical",
      sheetDraftId: draftId,
      characterCombatantId: "fighter",
      characterId: "character:accepted-fighter",
      characterDisplayName: "Orc Soldier Fighter",
      characterInitiative: 18,
      statBlockCombatantId: "goblin",
      statBlockInitiative: 7,
    });
    expect(started.snapshot).toMatchObject({
      currentActorId: "fighter",
      turnOrder: ["fighter", "goblin"],
      combatants: [
        { combatantId: "fighter", hp: 12, armorClass: 19 },
        { combatantId: "goblin", hp: 10, armorClass: 15 },
      ],
    });

    expect(actionLabels(callTool(root, "discover_battle_acts", {}))).toEqual([
      "Attack",
      "End Turn",
    ]);

    callTool(root, "fill_battle_hole", {
      actorId: "fighter",
      attackName: "Longsword",
      fill: {
        kind: "targetChoice",
        holeId: "battle:attack:target",
        value: "goblin",
      },
    });
    callTool(root, "fill_battle_hole", {
      actorId: "fighter",
      attackName: "Longsword",
      fill: {
        kind: "attackRoll",
        holeId: "battle:attack:roll",
        value: { total: 16, naturalD20: 14 },
      },
    });
    const fighterDamage = callTool(root, "fill_battle_hole", {
      actorId: "fighter",
      attackName: "Longsword",
      fill: {
        kind: "rolledDice",
        holeId: "battle:attack:damage-result:1d8+3-slashing",
        value: [{ results: [5] }],
      },
    });
    expect(fighterDamage.result.tag).toBe("resolved");
    expect(fighterDamage.battleState.combatants).toEqual([
      expect.objectContaining({ combatantId: "fighter", hp: 12 }),
      expect.objectContaining({ combatantId: "goblin", hp: 2 }),
    ]);

    const endedFighterTurn = callTool(root, "end_turn", {
      actorId: "fighter",
    });
    expect(endedFighterTurn.snapshot.currentActorId).toBe("goblin");

    expect(actionLabels(callTool(root, "discover_battle_acts", {}))).toEqual([
      "Attack",
      "Attack",
      "End Turn",
    ]);

    callTool(root, "fill_battle_hole", {
      actorId: "goblin",
      attackName: "Scimitar",
      fill: {
        kind: "targetChoice",
        holeId: "battle:attack:target",
        value: "fighter",
      },
    });
    callTool(root, "fill_battle_hole", {
      actorId: "goblin",
      attackName: "Scimitar",
      fill: {
        kind: "attackRoll",
        holeId: "battle:attack:roll",
        value: { total: 20, naturalD20: 18 },
      },
    });
    const goblinDamage = callTool(root, "fill_battle_hole", {
      actorId: "goblin",
      attackName: "Scimitar",
      fill: {
        kind: "rolledDice",
        holeId: "battle:attack:damage-result:1d6+2-slashing",
        value: [{ results: [5] }],
      },
    });
    expect(goblinDamage.result.tag).toBe("resolved");
    expect(goblinDamage.battleState.combatants).toEqual([
      expect.objectContaining({ combatantId: "fighter", hp: 5 }),
      expect.objectContaining({ combatantId: "goblin", hp: 2 }),
    ]);

    const ended = callTool(root, "end_battle", {});
    expect(ended).toMatchObject({
      endedBattleId: "battle:accepted-vertical",
      session: { battleState: null, transientBattleFills: null },
    });

    const listed = callTool(root, "list_characters", {});
    expect(listed.characters).toEqual([
      expect.objectContaining({
        sourceDraftId: draftId,
        status: "available",
        displayName: "Orc Soldier Fighter",
        hitPoints: { current: 5, maximum: 12 },
        build: expect.objectContaining({
          background: "background_soldier",
          species: "species_orc",
        }),
      }),
    ]);
    expect(
      listed.characters.some(
        (character: { readonly displayName: string | null }) =>
          character.displayName === "Goblin Warrior",
      ),
    ).toBe(false);
  });
});

function choiceFill(holeId: string, ...optionIds: readonly string[]) {
  return {
    kind: "choice",
    holeId,
    optionIds,
  };
}

function callTool(
  root: ReturnType<typeof createMcpCompositionRoot>,
  name: string,
  args: unknown,
) {
  return JSON.parse(handleToolCall(root, name, args).content[0]?.text ?? "{}");
}

function holeIds(payload: {
  readonly holes: ReadonlyArray<{ holeId: string }>;
}) {
  return payload.holes.map((hole) => hole.holeId);
}

function actionLabels(payload: {
  readonly snapshot: {
    readonly acts: ReadonlyArray<{ readonly label: string }>;
  };
}) {
  return payload.snapshot.acts.map((act) => act.label);
}
