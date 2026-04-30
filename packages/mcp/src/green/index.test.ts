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
  type CreationHole,
  type CreationHoleIdText,
} from "@dnd/character-creation-runtime";
import { Hp } from "@dnd/shared/types";

import {
  createGreenMcpCompositionRoot,
  greenBattleToolDefinitions,
  greenCharacterToolDefinitions,
  handleGreenBattleToolCall,
  handleGreenCharacterToolCall,
  startBattleFromCharacterBuildAndStatBlock,
} from "./index.ts";
import type { GreenBattleToolResult } from "./battle-tools.ts";
import type { GreenCharacterToolResult } from "./character-tools.ts";

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
      sheetDraftIds: [],
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
        initiative: initiativeScore(11),
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
    expect(state.combatants.get(goblinId)?.initiative).toBe(11);
    expect(root.sessionStore.snapshot().battleState).toBe(state);
    expect(root.sessionStore.snapshot().transientBattleFills).toBeNull();
  });

  test("registers final user-facing Surface-runtime character tool names", () => {
    expect(greenCharacterToolDefinitions.map((tool) => tool.name)).toEqual([
      "create_character_draft",
      "discover_creation_holes",
      "fill_creation_holes",
      "finalize_character",
    ]);
  });

  test("registers partial Surface-runtime battle shell tool names", () => {
    expect(greenBattleToolDefinitions.map((tool) => tool.name)).toEqual([
      "select_stat_block",
      "start_battle",
      "read_battle_state",
      "discover_battle_acts",
      "fill_battle_hole",
      "end_turn",
    ]);
  });

  test("selects Goblin Warrior and starts a stored partial battle shell through tools", () => {
    const root = createGreenMcpCompositionRoot();
    const draftId = "draft:mcp-green-battle-shell";
    createFinalizedFighterSheet(root, draftId);

    const selected = readPayload(
      handleGreenBattleToolCall(root, "select_stat_block", {
        statBlockId: "stat_block_goblin_warrior",
      }),
    );
    expect(selected).toMatchObject({
      selectedStatBlock: {
        id: "stat_block_goblin_warrior",
        provenance: { kind: "srd-5.2.1" },
      },
      session: { selectedStatBlockId: "stat_block_goblin_warrior" },
    });

    const started = readPayload(
      handleGreenBattleToolCall(root, "start_battle", {
        battleId: "battle:mcp-green-shell",
        sheetDraftId: draftId,
        characterCombatantId: "fighter",
        characterId: "character:fighter",
        characterDisplayName: "Orc Soldier Fighter",
        characterInitiative: 18,
        statBlockCombatantId: "goblin",
        statBlockInitiative: 7,
      }),
    );

    expect(root.sessionStore.battleState).not.toBeNull();
    expect(
      root.sessionStore.battleState?.combatants.get(goblinId),
    ).toMatchObject({
      displayName: "Goblin Warrior",
      initiative: 7,
      hp: 10,
    });
    expect(started).toMatchObject({
      battleState: {
        battleId: "battle:mcp-green-shell",
        combatants: [
          {
            combatantId: "fighter",
            originKind: "character",
            initiative: 18,
          },
          {
            combatantId: "goblin",
            originKind: "statBlock",
            initiative: 7,
          },
        ],
      },
      snapshot: {
        battleId: "battle:mcp-green-shell",
        currentActorId: "fighter",
        turnOrder: ["fighter", "goblin"],
      },
      session: {
        selectedStatBlockId: "stat_block_goblin_warrior",
        battleState: {},
        transientBattleFills: null,
      },
    });

    const read = readPayload(
      handleGreenBattleToolCall(root, "read_battle_state", {}),
    );
    expect(read.snapshot).toMatchObject({
      battleId: "battle:mcp-green-shell",
      currentActorId: "fighter",
      combatants: [
        {
          combatantId: "fighter",
          displayName: "Orc Soldier Fighter",
        },
        {
          combatantId: "goblin",
          displayName: "Goblin Warrior",
        },
      ],
    });
    expect(
      read.snapshot.acts.map((act: { label: string }) => act.label),
    ).toEqual(["Attack", "End Turn"]);
    expect(read.battleState.combatants).toHaveLength(2);
  });

  test("discovers and resolves Fighter Attack fills, then ends the Fighter turn", () => {
    const root = createGreenMcpCompositionRoot();
    const draftId = "draft:mcp-green-fighter-battle-flow";
    createFinalizedFighterSheet(root, draftId);
    readPayload(
      handleGreenBattleToolCall(root, "select_stat_block", {
        statBlockId: "stat_block_goblin_warrior",
      }),
    );
    readPayload(
      handleGreenBattleToolCall(root, "start_battle", {
        battleId: "battle:mcp-green-fighter-flow",
        sheetDraftId: draftId,
        characterCombatantId: "fighter",
        characterId: "character:fighter",
        characterDisplayName: "Orc Soldier Fighter",
        characterInitiative: 18,
        statBlockCombatantId: "goblin",
        statBlockInitiative: 7,
      }),
    );

    const discovered = readPayload(
      handleGreenBattleToolCall(root, "discover_battle_acts", {}),
    );
    expect(discovered.snapshot).toMatchObject({
      currentActorId: "fighter",
      acts: [
        {
          label: "Attack",
          subject: { tag: "srdAction", actorId: "fighter", action: "attack" },
          initialHoles: [
            {
              kind: "targetChoice",
              holeId: "battle:attack:target",
              choices: ["goblin"],
            },
          ],
        },
        {
          label: "End Turn",
          subject: {
            tag: "runtimeCommand",
            actorId: "fighter",
            command: "endTurn",
          },
        },
      ],
    });

    const afterTarget = readPayload(
      handleGreenBattleToolCall(root, "fill_battle_hole", {
        actorId: "fighter",
        fill: {
          kind: "targetChoice",
          holeId: "battle:attack:target",
          value: "goblin",
        },
      }),
    );
    expect(afterTarget.result).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "attackRoll", holeId: "battle:attack:roll" }],
    });
    expect(afterTarget.session.transientBattleFills).toMatchObject({
      subject: { tag: "srdAction", actorId: "fighter", action: "attack" },
      fills: [{ kind: "targetChoice", value: "goblin" }],
    });

    const afterAttackRoll = readPayload(
      handleGreenBattleToolCall(root, "fill_battle_hole", {
        actorId: "fighter",
        fill: {
          kind: "attackRoll",
          holeId: "battle:attack:roll",
          value: { total: 16, naturalD20: 14 },
        },
      }),
    );
    expect(afterAttackRoll.result).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "rolledDice",
          holeId: "battle:attack:damage-result:1d8+3-slashing",
          critical: false,
        },
      ],
    });
    expect(afterAttackRoll.session.transientBattleFills.fills).toHaveLength(2);

    const afterDamage = readPayload(
      handleGreenBattleToolCall(root, "fill_battle_hole", {
        actorId: "fighter",
        fill: {
          kind: "rolledDice",
          holeId: "battle:attack:damage-result:1d8+3-slashing",
          value: [{ results: [5] }],
        },
      }),
    );
    expect(afterDamage.result.tag).toBe("resolved");
    expect(afterDamage.battleState.combatants).toEqual([
      expect.objectContaining({ combatantId: "fighter", hp: 12 }),
      expect.objectContaining({ combatantId: "goblin", hp: 2 }),
    ]);
    expect(
      afterDamage.snapshot.acts.map((act: { label: string }) => act.label),
    ).toEqual(["End Turn"]);
    expect(root.sessionStore.transientBattleFills).toBeNull();

    const afterEndTurn = readPayload(
      handleGreenBattleToolCall(root, "end_turn", { actorId: "fighter" }),
    );
    expect(afterEndTurn.result.tag).toBe("resolved");
    expect(afterEndTurn.snapshot).toMatchObject({
      currentActorId: "goblin",
      combatants: [
        { combatantId: "fighter", hp: 12 },
        { combatantId: "goblin", hp: 2 },
      ],
    });
    expect(root.sessionStore.battleState?.combatants.get(goblinId)?.hp).toBe(2);
  });

  test("start_battle rejects missing caller-supplied Initiative scores", () => {
    const root = createGreenMcpCompositionRoot();
    const draftId = "draft:mcp-green-battle-shell-missing-initiative";
    createFinalizedFighterSheet(root, draftId);
    readPayload(
      handleGreenBattleToolCall(root, "select_stat_block", {
        statBlockId: "stat_block_goblin_warrior",
      }),
    );

    const rejected = readPayload(
      handleGreenBattleToolCall(root, "start_battle", {
        battleId: "battle:mcp-green-shell-missing-initiative",
        sheetDraftId: draftId,
        characterCombatantId: "fighter",
        characterId: "character:fighter",
        characterDisplayName: "Orc Soldier Fighter",
        characterInitiative: 18,
        statBlockCombatantId: "goblin",
      }),
    );

    expect(rejected).toMatchObject({
      details: {
        code: "INVALID_FIELD",
        field: "statBlockInitiative",
        expected: "integer Initiative score",
      },
    });
    expect(root.sessionStore.battleState).toBeNull();
  });

  test("creates and finalizes the minimal Fighter through stored creation holes", () => {
    const root = createGreenMcpCompositionRoot();
    const draftId = "draft:mcp-green-tool-complete-fighter";

    const created = readPayload(
      handleGreenCharacterToolCall(root, "create_character_draft", {
        draftId,
      }),
    );

    expect(created.draft).toMatchObject({
      draftId,
      revision: 0,
    });
    expect(created.holes.map((hole: CreationHole) => hole.holeId)).toEqual([
      "cc:draft:draft.primaryClass",
      "cc:draft:draft.background",
      "cc:draft:draft.species",
      "cc:draft:draft.abilityScoreGeneration",
      "cc:draft:draft.languages",
      "cc:draft:draft.alignment",
    ]);

    fillThroughTool(root, draftId, 0, initialManifestFills());
    fillThroughTool(root, draftId, 1, manifestChoiceFills());
    fillThroughTool(root, draftId, 2, manifestPurchaseFills());
    const loadout = fillThroughTool(root, draftId, 3, manifestLoadoutFills());

    expect(loadout.result).toMatchObject({
      tag: "accepted",
      draft: { draftId, revision: 4 },
      holes: [],
      finalization: { tag: "ready" },
    });

    const finalized = readPayload(
      handleGreenCharacterToolCall(root, "finalize_character", { draftId }),
    );

    expect(finalized.finalization).toMatchObject({
      tag: "ready",
      build: {
        background: "background_soldier",
        species: "species_orc",
        hitPoints: { maximum: 12 },
      },
    });
    expect(finalized.sheet).toMatchObject({
      background: "background_soldier",
      species: "species_orc",
      hitPoints: { maximum: 12 },
    });
    expect(root.sessionStore.drafts.has(characterDraftId(draftId))).toBe(false);
    expect(root.sessionStore.sheets.get(characterDraftId(draftId))).toEqual(
      finalized.finalization.build,
    );
    expect(finalized.session).toMatchObject({
      draftIds: [],
      sheetDraftIds: [draftId],
    });
  });

  test("discovers creation holes through the explicit tool path", () => {
    const root = createGreenMcpCompositionRoot();
    const draftId = "draft:mcp-green-tool-discover-holes";
    readPayload(
      handleGreenCharacterToolCall(root, "create_character_draft", {
        draftId,
      }),
    );
    fillThroughTool(root, draftId, 0, initialManifestFills());

    const discovered = readPayload(
      handleGreenCharacterToolCall(root, "discover_creation_holes", {
        draftId,
      }),
    );

    expect(discovered.draft).toMatchObject({ draftId, revision: 1 });
    expect(discovered.holes.map((hole: CreationHole) => hole.holeId)).toEqual(
      manifestChoiceFills().map((fill) => fill.holeId),
    );
    expect(discovered.finalization.tag).toBe("incomplete");
    expect(discovered.session).toMatchObject({
      draftIds: [draftId],
      sheetDraftIds: [],
    });
    expect(root.sessionStore.drafts.get(characterDraftId(draftId))).toEqual(
      discovered.draft,
    );
  });

  test("rejected creation fill leaves the stored draft unchanged", () => {
    const root = createGreenMcpCompositionRoot();
    const draftId = "draft:mcp-green-tool-rejected-fill";
    readPayload(
      handleGreenCharacterToolCall(root, "create_character_draft", {
        draftId,
      }),
    );
    const before = root.sessionStore.drafts.get(characterDraftId(draftId));
    expect(before).toBeDefined();

    const rejected = readPayload(
      handleGreenCharacterToolCall(root, "fill_creation_holes", {
        draftId,
        expectedRevision: 0,
        fills: [choiceFill("cc:draft:draft.primaryClass", "not_a_class")],
      }),
    );

    expect(rejected.result).toMatchObject({
      tag: "rejected",
      issues: [
        {
          tag: "illegalFill",
          code: "invalidChoice",
          holeId: "cc:draft:draft.primaryClass",
        },
      ],
    });
    expect(root.sessionStore.drafts.get(characterDraftId(draftId))).toEqual(
      before,
    );
    expect(rejected.storedDraft).toEqual(before);
    expect(root.sessionStore.sheets.size).toBe(0);
  });

  test("finalization stores no sheet until the draft is ready", () => {
    const root = createGreenMcpCompositionRoot();
    const draftId = "draft:mcp-green-tool-incomplete-finalize";
    readPayload(
      handleGreenCharacterToolCall(root, "create_character_draft", {
        draftId,
      }),
    );

    const finalized = readPayload(
      handleGreenCharacterToolCall(root, "finalize_character", { draftId }),
    );

    expect(finalized.finalization.tag).toBe("incomplete");
    expect(finalized.sheet).toBeNull();
    expect(root.sessionStore.drafts.has(characterDraftId(draftId))).toBe(true);
    expect(root.sessionStore.sheets.has(characterDraftId(draftId))).toBe(false);
  });

  test("rejects reused draft ids for active drafts and finalized sheets", () => {
    const root = createGreenMcpCompositionRoot();
    const activeDraftId = "draft:mcp-green-tool-duplicate-active";
    readPayload(
      handleGreenCharacterToolCall(root, "create_character_draft", {
        draftId: activeDraftId,
      }),
    );

    const duplicateActive = handleGreenCharacterToolCall(
      root,
      "create_character_draft",
      {
        draftId: activeDraftId,
      },
    );

    expect(readPayload(duplicateActive)).toMatchObject({
      details: {
        code: "DUPLICATE_CHARACTER_DRAFT_ID",
        draftId: activeDraftId,
        existingOwner: "activeDraft",
      },
    });

    const finalizedDraftId = "draft:mcp-green-tool-duplicate-finalized";
    readPayload(
      handleGreenCharacterToolCall(root, "create_character_draft", {
        draftId: finalizedDraftId,
      }),
    );
    fillThroughTool(root, finalizedDraftId, 0, initialManifestFills());
    fillThroughTool(root, finalizedDraftId, 1, manifestChoiceFills());
    fillThroughTool(root, finalizedDraftId, 2, manifestPurchaseFills());
    fillThroughTool(root, finalizedDraftId, 3, manifestLoadoutFills());
    readPayload(
      handleGreenCharacterToolCall(root, "finalize_character", {
        draftId: finalizedDraftId,
      }),
    );

    const duplicateFinalized = handleGreenCharacterToolCall(
      root,
      "create_character_draft",
      {
        draftId: finalizedDraftId,
      },
    );

    expect(readPayload(duplicateFinalized)).toMatchObject({
      details: {
        code: "DUPLICATE_CHARACTER_DRAFT_ID",
        draftId: finalizedDraftId,
        existingOwner: "finalizedSheet",
      },
    });
    expect(
      root.sessionStore.drafts.has(characterDraftId(finalizedDraftId)),
    ).toBe(false);
    expect(
      root.sessionStore.sheets.has(characterDraftId(finalizedDraftId)),
    ).toBe(true);
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
        initiative: initiativeScore(10),
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
          initiative: initiativeScore(10),
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

function createFinalizedFighterSheet(
  root: ReturnType<typeof createGreenMcpCompositionRoot>,
  draftId: string,
): CharacterBuild {
  const build = fighterCharacterBuild(root.unitLibrary);
  root.sessionStore.sheets.set(characterDraftId(draftId), build);
  return build;
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
      fills: manifestChoiceFills(),
    }),
  );
  const afterPurchase = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterChoices,
      unitLibrary,
      expectedRevision: afterChoices.revision,
      fills: manifestPurchaseFills(),
    }),
  );

  return requireAcceptedBatch(
    fillCreationHoles({
      draft: afterPurchase,
      unitLibrary,
      expectedRevision: afterPurchase.revision,
      fills: manifestLoadoutFills(),
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
  holeId: CreationHoleIdText,
  ...optionIds: readonly string[]
): CreationFill {
  return {
    kind: "choice",
    holeId: creationHoleId(holeId),
    optionIds: optionIds.map(creationChoiceOptionId),
  };
}

function requireAcceptedBatch(result: ReturnType<typeof fillCreationHoles>) {
  if (result.tag !== "accepted") {
    throw new Error("Expected accepted character-creation fill batch.");
  }

  return result.draft;
}

function manifestChoiceFills(): readonly CreationFill[] {
  return [
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
  ];
}

function manifestPurchaseFills(): readonly CreationFill[] {
  return [
    choiceFill(
      "cc:unit:class_fighter:equipment_purchase",
      "armor_chain_mail",
      "weapon_longsword",
      "equipment_shield",
    ),
  ];
}

function manifestLoadoutFills(): readonly CreationFill[] {
  return [
    choiceFill("cc:unit:armor_chain_mail:loadout_armor", "worn"),
    choiceFill("cc:unit:equipment_shield:loadout_shield", "wielded"),
    choiceFill("cc:unit:weapon_longsword:loadout_weapon", "wielded_one_handed"),
  ];
}

function fillThroughTool(
  root: ReturnType<typeof createGreenMcpCompositionRoot>,
  draftId: string,
  expectedRevision: number,
  fills: readonly CreationFill[],
) {
  return readPayload(
    handleGreenCharacterToolCall(root, "fill_creation_holes", {
      draftId,
      expectedRevision,
      fills,
    }),
  );
}

function readPayload(
  response: GreenCharacterToolResult | GreenBattleToolResult,
) {
  return JSON.parse(response.content[0]?.text ?? "null");
}
