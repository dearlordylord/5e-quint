import { describe, expect, test } from "vitest";

import {
  battleId,
  characterId,
  combatantId,
  discoverBattleActs,
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
  battleToolDefinitions,
  characterToolDefinitions,
  contentToolDefinitions,
  createMcpCompositionRoot,
  handleToolCall,
  startBattleFromCharacterBuildAndStatBlock,
} from "./server.ts";
import type { BattleToolResult } from "./battle-tools.ts";
import type { CharacterToolResult } from "./character-tools.ts";
import { availableCharacterSession } from "./session-store.ts";

const fighterId = combatantId("fighter");
const goblinId = combatantId("goblin");

describe("MCP server route", () => {
  test("builds SRD catalogs and keeps selected Stat Block state identity-only", () => {
    const root = createMcpCompositionRoot();
    const selected = root.sessionStore.selectStatBlock(
      "stat_block_goblin_warrior",
    );

    expect(root.unitLibrary.listUnits().length).toBeGreaterThan(0);
    expect(
      root.statBlockCatalog.listStatBlocks().map((record) => record.id),
    ).toEqual(["stat_block_goblin_warrior", "stat_block_skeleton"]);
    expect(selected.id).toBe("stat_block_goblin_warrior");
    expect(root.sessionStore.snapshot()).toMatchObject({
      draftIds: [],
      selectedStatBlockId: "stat_block_goblin_warrior",
      activeBattle: null,
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
    const root = createMcpCompositionRoot();
    const state = startBattleFromCharacterBuildAndStatBlock({
      battleId: battleId("battle-root"),
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
      battleId: battleId("battle-root"),
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
    expect(root.sessionStore.snapshot().activeBattle).toEqual({
      battleId: "battle-root",
      currentActorId: fighterId,
    });
    expect(root.sessionStore.snapshot().transientBattleFills).toBeNull();
  });

  test("carries finalized Fighter 2 Action Surge resources into battle discovery", () => {
    const root = createMcpCompositionRoot();
    const state = startBattleFromCharacterBuildAndStatBlock({
      battleId: battleId("battle-root-fighter-two"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Orc Soldier Fighter 2",
        build: fighterTwoCharacterBuild(root.unitLibrary),
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

    expect(discoverBattleActs(state).map((act) => act.subject)).toEqual(
      expect.arrayContaining([
        {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "fighter_action_surge",
        },
      ]),
    );
  });

  test("registers agent-facing content discovery tool names", () => {
    expect(contentToolDefinitions.map((tool) => tool.name)).toEqual([
      "describe_mcp_workflow",
      "list_stat_blocks",
      "list_catalog_units",
    ]);
  });

  test("registers final user-facing character tool names", () => {
    expect(characterToolDefinitions.map((tool) => tool.name)).toEqual([
      "create_character_draft",
      "discover_creation_holes",
      "fill_creation_holes",
      "finalize_character",
      "list_characters",
    ]);
  });

  test("registers battle tool names", () => {
    expect(battleToolDefinitions.map((tool) => tool.name)).toEqual([
      "select_stat_block",
      "start_battle",
      "read_battle_state",
      "discover_battle_acts",
      "fill_battle_hole",
      "resolve_battle_act",
      "end_turn",
      "end_battle",
    ]);
  });

  test("describes MCP workflow and lists discoverable catalogs through tools", () => {
    const root = createMcpCompositionRoot();
    const workflow = readPayload(
      handleToolCall(root, "describe_mcp_workflow", {}),
    );
    expect(workflow).toMatchObject({
      resultPaths: {
        creationHoles: "holes",
        battleActs: "snapshot.acts",
        followUpBattleHoles: "result.holes",
      },
      acceptedInputs: {
        choiceFill: expect.stringContaining('"kind":"choice"'),
        attackRollFill: expect.stringContaining('"kind":"attackRoll"'),
      },
    });

    const units = readPayload(handleToolCall(root, "list_catalog_units", {}));
    expect(units.unitsByKind.class).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "class_fighter", name: "Fighter" }),
        expect.objectContaining({ id: "class_wizard", name: "Wizard" }),
      ]),
    );
    expect(units.unitsByKind.spell).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "magic_missile", name: "Magic Missile" }),
      ]),
    );

    const statBlocks = readPayload(
      handleToolCall(root, "list_stat_blocks", {}),
    );
    expect(statBlocks.statBlocks).toEqual([
      expect.objectContaining({
        statBlockId: "stat_block_goblin_warrior",
        displayName: "Goblin Warrior",
        attacks: expect.arrayContaining([
          expect.objectContaining({ attackName: "Scimitar" }),
        ]),
      }),
      expect.objectContaining({
        statBlockId: "stat_block_skeleton",
        displayName: "Skeleton",
        damageVulnerabilities: ["bludgeoning"],
      }),
    ]);
  });

  test("accepts omitted arguments for no-arg and optional-arg tools", () => {
    const root = createMcpCompositionRoot();

    expect(
      readPayload(handleToolCall(root, "describe_mcp_workflow", undefined)),
    ).toMatchObject({
      resultPaths: { battleActs: "snapshot.acts" },
    });

    expect(
      readPayload(handleToolCall(root, "create_character_draft", undefined)),
    ).toMatchObject({
      draft: { revision: 0 },
      holes: expect.arrayContaining([
        expect.objectContaining({ holeId: "cc:draft:draft.primaryClass" }),
      ]),
    });
  });

  test("selects Goblin Warrior and starts a stored partial battle shell through tools", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-battle-shell";
    createFinalizedFighterSheet(root, draftId);

    const selected = readPayload(
      handleToolCall(root, "select_stat_block", {
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
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-shell",
        initialCombatants: [
          {
            kind: "characterSession",
            sourceDraftId: draftId,
            combatantId: "fighter",
            initiative: 18,
          },
          {
            kind: "statBlock",
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 7,
          },
        ],
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
        battleId: "battle:mcp-shell",
        combatants: [
          {
            combatantId: "fighter",
            origin: { kind: "character" },
            initiative: 18,
          },
          {
            combatantId: "goblin",
            origin: { kind: "statBlock" },
            initiative: 7,
          },
        ],
      },
      snapshot: {
        battleId: "battle:mcp-shell",
        currentActorId: "fighter",
        turnOrder: ["fighter", "goblin"],
      },
      session: {
        selectedStatBlockId: "stat_block_goblin_warrior",
        activeBattle: {
          battleId: "battle:mcp-shell",
          currentActorId: "fighter",
        },
        transientBattleFills: null,
      },
    });

    const read = readPayload(handleToolCall(root, "read_battle_state", {}));
    expect(read.snapshot).toMatchObject({
      battleId: "battle:mcp-shell",
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

  test("starts battle from a character-only initial combatant roster", () => {
    const root = createMcpCompositionRoot();
    const firstDraftId = "draft:mcp-character-roster-first";
    const secondDraftId = "draft:mcp-character-roster-second";
    createFinalizedFighterSheet(root, firstDraftId);
    createFinalizedFighterSheet(root, secondDraftId);

    const started = readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-character-roster",
        initialCombatants: [
          {
            kind: "characterSession",
            sourceDraftId: firstDraftId,
            combatantId: "first-fighter",
            initiative: 11,
          },
          {
            kind: "characterSession",
            sourceDraftId: secondDraftId,
            combatantId: "second-fighter",
            initiative: 17,
          },
        ],
      }),
    );

    expect(started.snapshot).toMatchObject({
      currentActorId: "second-fighter",
      turnOrder: ["second-fighter", "first-fighter"],
    });
    expect(root.sessionStore.snapshot()).toMatchObject({
      selectedStatBlockId: null,
      activeBattle: {
        battleId: "battle:mcp-character-roster",
        currentActorId: "second-fighter",
      },
    });
    expect(
      root.sessionStore.characters.get(characterDraftId(firstDraftId)),
    ).toMatchObject({ tag: "inBattle" });
    expect(
      root.sessionStore.characters.get(characterDraftId(secondDraftId)),
    ).toMatchObject({ tag: "inBattle" });
  });

  test("start_battle rejects a second battle while the single battle slot is active", () => {
    const root = createMcpCompositionRoot();
    const firstDraftId = "draft:mcp-active-battle-first";
    const secondDraftId = "draft:mcp-active-battle-second";
    createFinalizedFighterSheet(root, firstDraftId);
    createFinalizedFighterSheet(root, secondDraftId);
    readPayload(
      handleToolCall(root, "select_stat_block", {
        statBlockId: "stat_block_goblin_warrior",
      }),
    );
    readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-active-battle-first",
        initialCombatants: [
          {
            kind: "characterSession",
            sourceDraftId: firstDraftId,
            combatantId: "fighter",
            initiative: 18,
          },
          {
            kind: "statBlock",
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 7,
          },
        ],
      }),
    );
    const firstBattleState = root.sessionStore.battleState;
    expect(firstBattleState).not.toBeNull();

    const rejected = readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-active-battle-second",
        initialCombatants: [
          {
            kind: "characterSession",
            sourceDraftId: secondDraftId,
            combatantId: "second-fighter",
            initiative: 16,
          },
          {
            kind: "statBlock",
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "second-goblin",
            initiative: 8,
          },
        ],
      }),
    );

    expect(rejected).toMatchObject({
      details: {
        code: "BATTLE_SESSION_ALREADY_ACTIVE",
        battleId: "battle:mcp-active-battle-first",
      },
    });
    expect(root.sessionStore.battleState).toBe(firstBattleState);
    expect(
      root.sessionStore.characters.get(characterDraftId(firstDraftId)),
    ).toMatchObject({
      tag: "inBattle",
      battleId: "battle:mcp-active-battle-first",
      characterId: firstDraftId,
    });
    expect(
      root.sessionStore.characters.get(characterDraftId(secondDraftId)),
    ).toMatchObject({
      tag: "available",
      currentHp: 12,
    });
  });

  test("discovers and resolves Fighter Attack fills, then ends the Fighter turn", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-fighter-battle-flow";
    createFinalizedFighterSheet(root, draftId);
    readPayload(
      handleToolCall(root, "select_stat_block", {
        statBlockId: "stat_block_goblin_warrior",
      }),
    );
    readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-fighter-flow",
        initialCombatants: [
          {
            kind: "characterSession",
            sourceDraftId: draftId,
            combatantId: "fighter",
            initiative: 18,
          },
          {
            kind: "statBlock",
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 7,
          },
        ],
      }),
    );

    const discovered = readPayload(
      handleToolCall(root, "discover_battle_acts", {}),
    );
    expect(discovered.snapshot).toMatchObject({
      currentActorId: "fighter",
      acts: [
        {
          label: "Attack",
          subject: {
            tag: "srdAction",
            actorId: "fighter",
            action: "attack",
            attackName: "Longsword",
          },
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
      handleToolCall(root, "fill_battle_hole", {
        subject: {
          tag: "srdAction",
          actorId: "fighter",
          action: "attack",
          attackName: "Longsword",
        },
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
      subject: {
        tag: "srdAction",
        actorId: "fighter",
        action: "attack",
        attackName: "Longsword",
      },
      fills: [{ kind: "targetChoice", value: "goblin" }],
    });
    expect(
      readPayload(handleToolCall(root, "end_turn", { actorId: "fighter" })),
    ).toMatchObject({
      details: {
        code: "BATTLE_FILLS_PENDING",
      },
    });
    expect(root.sessionStore.transientBattleFills).not.toBeNull();

    const afterAttackRoll = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: {
          tag: "srdAction",
          actorId: "fighter",
          action: "attack",
          attackName: "Longsword",
        },
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
      handleToolCall(root, "fill_battle_hole", {
        subject: {
          tag: "srdAction",
          actorId: "fighter",
          action: "attack",
          attackName: "Longsword",
        },
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
      handleToolCall(root, "end_turn", { actorId: "fighter" }),
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

    const goblinActs = readPayload(
      handleToolCall(root, "discover_battle_acts", {}),
    );
    expect(goblinActs.snapshot.acts).toMatchObject([
      {
        label: "Attack",
        subject: {
          tag: "srdAction",
          actorId: "goblin",
          action: "attack",
          attackName: "Scimitar",
        },
      },
      {
        label: "Attack",
        subject: {
          tag: "srdAction",
          actorId: "goblin",
          action: "attack",
          attackName: "Shortbow",
        },
      },
      {
        label: "End Turn",
        subject: {
          tag: "runtimeCommand",
          actorId: "goblin",
          command: "endTurn",
        },
      },
    ]);

    readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: {
          tag: "srdAction",
          actorId: "goblin",
          action: "attack",
          attackName: "Scimitar",
        },
        fill: {
          kind: "targetChoice",
          holeId: "battle:attack:target",
          value: "fighter",
        },
      }),
    );
    const afterGoblinAttackRoll = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: {
          tag: "srdAction",
          actorId: "goblin",
          action: "attack",
          attackName: "Scimitar",
        },
        fill: {
          kind: "attackRoll",
          holeId: "battle:attack:roll",
          value: { total: 20, naturalD20: 18 },
        },
      }),
    );
    expect(afterGoblinAttackRoll.result).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "rolledDice",
          holeId: "battle:attack:damage-result:1d6+2-slashing",
          attack: {
            kind: "statBlockAttack",
            attack: { name: "Scimitar" },
          },
        },
      ],
    });

    const afterGoblinDamage = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: {
          tag: "srdAction",
          actorId: "goblin",
          action: "attack",
          attackName: "Scimitar",
        },
        fill: {
          kind: "rolledDice",
          holeId: "battle:attack:damage-result:1d6+2-slashing",
          value: [{ results: [5] }],
        },
      }),
    );
    expect(afterGoblinDamage.result.tag).toBe("resolved");
    expect(afterGoblinDamage.battleState.combatants).toEqual([
      expect.objectContaining({ combatantId: "fighter", hp: 5 }),
      expect.objectContaining({ combatantId: "goblin", hp: 2 }),
    ]);
  });

  test("start_battle rejects missing caller-supplied Initiative scores", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-battle-shell-missing-initiative";
    createFinalizedFighterSheet(root, draftId);
    readPayload(
      handleToolCall(root, "select_stat_block", {
        statBlockId: "stat_block_goblin_warrior",
      }),
    );

    const rejected = readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-shell-missing-initiative",
        initialCombatants: [
          {
            kind: "characterSession",
            sourceDraftId: draftId,
            combatantId: "fighter",
            initiative: 18,
          },
          {
            kind: "statBlock",
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
          },
        ],
      }),
    );

    expect(rejected).toMatchObject({
      details: {
        code: "INVALID_ARGUMENTS",
      },
    });
    expect(root.sessionStore.battleState).toBeNull();
  });

  test("start_battle rejects empty or over-wide character inputs", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-start-exact-character-input";
    createFinalizedFighterSheet(root, draftId);
    readPayload(
      handleToolCall(root, "select_stat_block", {
        statBlockId: "stat_block_goblin_warrior",
      }),
    );
    const baseStart = {
      battleId: "battle:mcp-start-exact-character-input",
      initialCombatants: [
        {
          kind: "statBlock",
          statBlockId: "stat_block_goblin_warrior",
          combatantId: "goblin",
          initiative: 7,
        },
      ],
    };

    expect(
      readPayload(
        handleToolCall(root, "start_battle", {
          ...baseStart,
          initialCombatants: [],
        }),
      ),
    ).toMatchObject({
      details: {
        code: "INVALID_ARGUMENTS",
      },
    });
    expect(
      readPayload(
        handleToolCall(root, "start_battle", {
          ...baseStart,
          initialCombatants: [
            {
              kind: "characterSession",
              sourceDraftId: draftId,
              combatantId: "fighter",
              initiative: 18,
              characterDisplayName: "Contradictory Caller Name",
            },
          ],
        }),
      ),
    ).toMatchObject({
      details: {
        code: "INVALID_ARGUMENTS",
      },
    });
    expect(root.sessionStore.battleState).toBeNull();
  });

  test("start_battle reports missing finalized character sessions before runtime start", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-missing-additional-primary";
    createFinalizedFighterSheet(root, draftId);
    readPayload(
      handleToolCall(root, "select_stat_block", {
        statBlockId: "stat_block_goblin_warrior",
      }),
    );

    const rejected = readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-missing-additional",
        initialCombatants: [
          {
            kind: "characterSession",
            sourceDraftId: draftId,
            combatantId: "fighter",
            initiative: 18,
          },
          {
            kind: "characterSession",
            sourceDraftId: "draft:mcp-missing-additional-secondary",
            combatantId: "second-fighter",
            initiative: 16,
          },
          {
            kind: "statBlock",
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 7,
          },
        ],
      }),
    );

    expect(rejected).toMatchObject({
      details: {
        code: "UNKNOWN_FINALIZED_CHARACTER_SESSION",
        sourceDraftId: "draft:mcp-missing-additional-secondary",
      },
    });
    expect(root.sessionStore.battleState).toBeNull();
  });

  test("start_battle rejects incomplete or duplicate explicit combatant distances", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-invalid-distances";
    createFinalizedFighterSheet(root, draftId);

    const baseStart = {
      battleId: "battle:mcp-invalid-distances",
      initialCombatants: [
        {
          kind: "characterSession",
          sourceDraftId: draftId,
          combatantId: "fighter",
          initiative: 18,
        },
        {
          kind: "statBlock",
          statBlockId: "stat_block_goblin_warrior",
          combatantId: "goblin",
          initiative: 7,
        },
      ],
    } as const;

    expect(
      readPayload(
        handleToolCall(root, "start_battle", {
          ...baseStart,
          combatantDistances: [],
        }),
      ),
    ).toMatchObject({
      details: { code: "INCOMPLETE_BATTLE_DISTANCE_PAIRS" },
    });
    expect(
      readPayload(
        handleToolCall(root, "start_battle", {
          ...baseStart,
          combatantDistances: [
            { combatantA: "fighter", combatantB: "goblin", feet: 5 },
            { combatantA: "goblin", combatantB: "fighter", feet: 10 },
          ],
        }),
      ),
    ).toMatchObject({
      details: { code: "DUPLICATE_BATTLE_DISTANCE_PAIR" },
    });
    expect(root.sessionStore.battleState).toBeNull();
  });

  test("starts battle from multiple Stat Block combatants", () => {
    const root = createMcpCompositionRoot();

    const started = readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-stat-block-roster",
        initialCombatants: [
          {
            kind: "statBlock",
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "first-goblin",
            initiative: 11,
          },
          {
            kind: "statBlock",
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "second-goblin",
            initiative: 8,
          },
        ],
      }),
    );

    expect(started.snapshot).toMatchObject({
      currentActorId: "first-goblin",
      turnOrder: ["first-goblin", "second-goblin"],
      combatants: [
        { combatantId: "first-goblin", displayName: "Goblin Warrior" },
        { combatantId: "second-goblin", displayName: "Goblin Warrior" },
      ],
    });
    expect(root.sessionStore.snapshot()).toMatchObject({
      selectedStatBlockId: null,
      activeBattle: {
        battleId: "battle:mcp-stat-block-roster",
        currentActorId: "first-goblin",
      },
    });
  });

  test("battle act tools reject contradictory subjects and no-hole misuse", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-battle-subject-boundary";
    createFinalizedFighterSheet(root, draftId);
    readPayload(
      handleToolCall(root, "select_stat_block", {
        statBlockId: "stat_block_goblin_warrior",
      }),
    );
    readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-battle-subject-boundary",
        initialCombatants: [
          {
            kind: "characterSession",
            sourceDraftId: draftId,
            combatantId: "fighter",
            initiative: 18,
          },
          {
            kind: "statBlock",
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 7,
          },
        ],
      }),
    );

    expect(
      readPayload(
        handleToolCall(root, "fill_battle_hole", {
          subject: {
            tag: "srdAction",
            actorId: "fighter",
            action: "attack",
            attackName: "Longsword",
            spellId: "magic_missile",
          },
          fill: {
            kind: "targetChoice",
            holeId: "battle:attack:target",
            value: "goblin",
          },
        }),
      ),
    ).toMatchObject({
      details: {
        code: "INVALID_ARGUMENTS",
      },
    });
    expect(
      readPayload(
        handleToolCall(root, "resolve_battle_act", {
          subject: {
            tag: "srdAction",
            actorId: "fighter",
            action: "attack",
            attackName: "Longsword",
          },
        }),
      ),
    ).toMatchObject({
      details: {
        code: "BATTLE_ACT_REQUIRES_HOLES",
      },
    });
  });

  test("start_battle rejects duplicate source draft and combatant ids", () => {
    const root = createMcpCompositionRoot();
    const firstDraftId = "draft:mcp-duplicate-first";
    const secondDraftId = "draft:mcp-duplicate-second";
    createFinalizedFighterSheet(root, firstDraftId);
    createFinalizedFighterSheet(root, secondDraftId);
    readPayload(
      handleToolCall(root, "select_stat_block", {
        statBlockId: "stat_block_goblin_warrior",
      }),
    );

    const baseStart = {
      battleId: "battle:mcp-duplicates",
      initialCombatants: [
        {
          kind: "characterSession",
          sourceDraftId: firstDraftId,
          combatantId: "fighter",
          initiative: 18,
        },
        {
          kind: "statBlock",
          statBlockId: "stat_block_goblin_warrior",
          combatantId: "goblin",
          initiative: 7,
        },
      ],
    };
    const secondCharacter = {
      kind: "characterSession",
      sourceDraftId: secondDraftId,
      combatantId: "second-fighter",
      initiative: 16,
    } as const;

    expect(
      readPayload(
        handleToolCall(root, "start_battle", {
          ...baseStart,
          initialCombatants: [
            ...baseStart.initialCombatants,
            { ...secondCharacter, sourceDraftId: firstDraftId },
          ],
        }),
      ),
    ).toMatchObject({
      details: {
        code: "DUPLICATE_BATTLE_SOURCE_DRAFT_ID",
        sourceDraftId: firstDraftId,
      },
    });
    expect(
      readPayload(
        handleToolCall(root, "start_battle", {
          ...baseStart,
          initialCombatants: [
            ...baseStart.initialCombatants,
            { ...secondCharacter, combatantId: "goblin" },
          ],
        }),
      ),
    ).toMatchObject({
      details: {
        code: "DUPLICATE_BATTLE_COMBATANT_ID",
        combatantId: "goblin",
      },
    });
    expect(root.sessionStore.battleState).toBeNull();
  });

  test("creates and finalizes the supported Fighter through stored creation holes", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-tool-complete-fighter";

    const created = readPayload(
      handleToolCall(root, "create_character_draft", {
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
    fillThroughTool(root, draftId, 1, manifestAdvancementFills());
    fillThroughTool(root, draftId, 2, manifestChoiceFills());
    fillThroughTool(root, draftId, 3, manifestPurchaseFills());
    const loadout = fillThroughTool(root, draftId, 4, manifestLoadoutFills());

    expect(loadout.result).toMatchObject({
      tag: "accepted",
      draft: { draftId, revision: 5 },
      holes: [],
      finalization: { tag: "ready" },
    });

    const finalized = readPayload(
      handleToolCall(root, "finalize_character", { draftId }),
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
    expect(root.sessionStore.characters.get(characterDraftId(draftId))).toEqual(
      {
        tag: "available",
        characterId: draftId,
        build: finalized.finalization.build,
        currentHp: 12,
      },
    );
    expect(finalized.session).toMatchObject({
      draftIds: [],
      sourceDraftIds: [draftId],
    });
  });

  test("runs the full Orc Soldier Fighter vs Goblin Warrior vertical through MCP tools only", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-full-vertical";

    const finalized = createAndFinalizeManifestFighterThroughTools(
      root,
      draftId,
    );

    expect(finalized.finalization).toMatchObject({
      tag: "ready",
      build: {
        background: "background_soldier",
        species: "species_orc",
        hitPoints: { maximum: 12 },
      },
    });
    expect(root.sessionStore.snapshot()).toMatchObject({
      draftIds: [],
      sourceDraftIds: [draftId],
      activeBattle: null,
      transientBattleFills: null,
    });

    const selected = readPayload(
      handleToolCall(root, "select_stat_block", {
        statBlockId: "stat_block_goblin_warrior",
      }),
    );
    expect(selected.selectedStatBlock).toMatchObject({
      id: "stat_block_goblin_warrior",
      provenance: { kind: "srd-5.2.1" },
      statBlock: {
        displayName: "Goblin Warrior",
      },
    });

    const started = readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-full-vertical",
        initialCombatants: [
          {
            kind: "characterSession",
            sourceDraftId: draftId,
            combatantId: "fighter",
            initiative: 18,
          },
          {
            kind: "statBlock",
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 7,
          },
        ],
      }),
    );

    expect(started.snapshot).toMatchObject({
      currentActorId: "fighter",
      turnOrder: ["fighter", "goblin"],
      combatants: [
        { combatantId: "fighter", hp: 12, armorClass: 19 },
        { combatantId: "goblin", hp: 10, armorClass: 15 },
      ],
    });
    expect(started.session.transientBattleFills).toBeNull();

    const fighterActs = readPayload(
      handleToolCall(root, "discover_battle_acts", {}),
    );
    expect(fighterActs.snapshot.acts).toMatchObject([
      {
        label: "Attack",
        subject: {
          tag: "srdAction",
          actorId: "fighter",
          action: "attack",
          attackName: "Longsword",
        },
      },
      {
        label: "End Turn",
        subject: {
          tag: "runtimeCommand",
          actorId: "fighter",
          command: "endTurn",
        },
      },
    ]);

    fillBattleHoleThroughTool(root, "fighter", "Longsword", {
      kind: "targetChoice",
      holeId: "battle:attack:target",
      value: "goblin",
    });
    expect(root.sessionStore.battleState?.combatants.get(goblinId)?.hp).toBe(
      10,
    );
    expect(root.sessionStore.transientBattleFills).toMatchObject({
      subject: { actorId: "fighter", attackName: "Longsword" },
      fills: [{ kind: "targetChoice", value: "goblin" }],
    });

    fillBattleHoleThroughTool(root, "fighter", "Longsword", {
      kind: "attackRoll",
      holeId: "battle:attack:roll",
      value: { total: 16, naturalD20: 14 },
    });
    const afterFighterDamage = fillBattleHoleThroughTool(
      root,
      "fighter",
      "Longsword",
      {
        kind: "rolledDice",
        holeId: "battle:attack:damage-result:1d8+3-slashing",
        value: [{ results: [5] }],
      },
    );

    expect(afterFighterDamage.result.tag).toBe("resolved");
    expect(afterFighterDamage.battleState.combatants).toEqual([
      expect.objectContaining({ combatantId: "fighter", hp: 12 }),
      expect.objectContaining({ combatantId: "goblin", hp: 2 }),
    ]);
    expect(afterFighterDamage.session.transientBattleFills).toBeNull();

    const afterEndTurn = readPayload(
      handleToolCall(root, "end_turn", { actorId: "fighter" }),
    );
    expect(afterEndTurn.result.tag).toBe("resolved");
    expect(afterEndTurn.snapshot.currentActorId).toBe("goblin");

    const goblinActs = readPayload(
      handleToolCall(root, "discover_battle_acts", {}),
    );
    expect(goblinActs.snapshot.acts).toMatchObject([
      {
        label: "Attack",
        subject: {
          tag: "srdAction",
          actorId: "goblin",
          action: "attack",
          attackName: "Scimitar",
        },
        initialHoles: [
          {
            kind: "targetChoice",
            choices: ["fighter"],
          },
        ],
      },
      {
        label: "Attack",
        subject: {
          tag: "srdAction",
          actorId: "goblin",
          action: "attack",
          attackName: "Shortbow",
        },
        initialHoles: [
          {
            kind: "targetChoice",
            choices: ["fighter"],
          },
        ],
      },
      { label: "End Turn" },
    ]);

    fillBattleHoleThroughTool(root, "goblin", "Scimitar", {
      kind: "targetChoice",
      holeId: "battle:attack:target",
      value: "fighter",
    });
    fillBattleHoleThroughTool(root, "goblin", "Scimitar", {
      kind: "attackRoll",
      holeId: "battle:attack:roll",
      value: { total: 20, naturalD20: 18 },
    });
    const afterGoblinDamage = fillBattleHoleThroughTool(
      root,
      "goblin",
      "Scimitar",
      {
        kind: "rolledDice",
        holeId: "battle:attack:damage-result:1d6+2-slashing",
        value: [{ results: [5] }],
      },
    );

    expect(afterGoblinDamage.result.tag).toBe("resolved");
    expect(afterGoblinDamage.battleState.combatants).toEqual([
      expect.objectContaining({ combatantId: "fighter", hp: 5 }),
      expect.objectContaining({ combatantId: "goblin", hp: 2 }),
    ]);
    expect(root.sessionStore.snapshot()).toMatchObject({
      selectedStatBlockId: "stat_block_goblin_warrior",
      transientBattleFills: null,
    });
    expect(root.sessionStore.battleState?.combatants.get(fighterId)?.hp).toBe(
      5,
    );

    const ended = readPayload(handleToolCall(root, "end_battle", {}));
    expect(ended).toMatchObject({
      endedBattleId: "battle:mcp-full-vertical",
      session: {
        activeBattle: null,
        transientBattleFills: null,
        sourceDraftIds: [draftId],
      },
    });
    expect(root.sessionStore.battleState).toBeNull();
    expect(root.sessionStore.characters.get(characterDraftId(draftId))).toEqual(
      expect.objectContaining({
        tag: "available",
        currentHp: 5,
      }),
    );

    const characterList = readPayload(
      handleToolCall(root, "list_characters", {}),
    );
    expect(characterList.characters).toEqual([
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
      characterList.characters.some(
        (character: { readonly displayName: string | null }) =>
          character.displayName === "Goblin Warrior",
      ),
    ).toBe(false);
  });

  test("discovers creation holes through the explicit tool path", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-tool-discover-holes";
    readPayload(
      handleToolCall(root, "create_character_draft", {
        draftId,
      }),
    );
    fillThroughTool(root, draftId, 0, initialManifestFills());

    const discovered = readPayload(
      handleToolCall(root, "discover_creation_holes", {
        draftId,
      }),
    );

    expect(discovered.draft).toMatchObject({ draftId, revision: 1 });
    expect(discovered.holes.map((hole: CreationHole) => hole.holeId)).toEqual(
      initialClassHoleIds(),
    );
    expect(discovered.finalization.tag).toBe("incomplete");
    expect(discovered.session).toMatchObject({
      draftIds: [draftId],
    });
    expect(root.sessionStore.drafts.get(characterDraftId(draftId))).toEqual(
      discovered.draft,
    );
  });

  test("rejected creation fill leaves the stored draft unchanged", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-tool-rejected-fill";
    readPayload(
      handleToolCall(root, "create_character_draft", {
        draftId,
      }),
    );
    const before = root.sessionStore.drafts.get(characterDraftId(draftId));
    expect(before).toBeDefined();

    const rejected = readPayload(
      handleToolCall(root, "fill_creation_holes", {
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
    expect(root.sessionStore.characters.size).toBe(0);
  });

  test("finalization stores no sheet until the draft is ready", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-tool-incomplete-finalize";
    readPayload(
      handleToolCall(root, "create_character_draft", {
        draftId,
      }),
    );

    const finalized = readPayload(
      handleToolCall(root, "finalize_character", { draftId }),
    );

    expect(finalized.finalization.tag).toBe("incomplete");
    expect(finalized.sheet).toBeNull();
    expect(root.sessionStore.drafts.has(characterDraftId(draftId))).toBe(true);
    expect(root.sessionStore.characters.has(characterDraftId(draftId))).toBe(
      false,
    );
  });

  test("rejects reused draft ids for active drafts and finalized sheets", () => {
    const root = createMcpCompositionRoot();
    const activeDraftId = "draft:mcp-tool-duplicate-active";
    readPayload(
      handleToolCall(root, "create_character_draft", {
        draftId: activeDraftId,
      }),
    );

    const duplicateActive = handleToolCall(root, "create_character_draft", {
      draftId: activeDraftId,
    });

    expect(readPayload(duplicateActive)).toMatchObject({
      details: {
        code: "DUPLICATE_CHARACTER_DRAFT_ID",
        draftId: activeDraftId,
        existingOwner: "activeDraft",
      },
    });

    const finalizedDraftId = "draft:mcp-tool-duplicate-finalized";
    readPayload(
      handleToolCall(root, "create_character_draft", {
        draftId: finalizedDraftId,
      }),
    );
    fillThroughTool(root, finalizedDraftId, 0, initialManifestFills());
    fillThroughTool(root, finalizedDraftId, 1, manifestAdvancementFills());
    fillThroughTool(root, finalizedDraftId, 2, manifestChoiceFills());
    fillThroughTool(root, finalizedDraftId, 3, manifestPurchaseFills());
    fillThroughTool(root, finalizedDraftId, 4, manifestLoadoutFills());
    readPayload(
      handleToolCall(root, "finalize_character", {
        draftId: finalizedDraftId,
      }),
    );

    const duplicateFinalized = handleToolCall(root, "create_character_draft", {
      draftId: finalizedDraftId,
    });

    expect(readPayload(duplicateFinalized)).toMatchObject({
      details: {
        code: "DUPLICATE_CHARACTER_DRAFT_ID",
        draftId: finalizedDraftId,
        existingOwner: "finalizedSession",
      },
    });
    expect(
      root.sessionStore.drafts.has(characterDraftId(finalizedDraftId)),
    ).toBe(false);
    expect(
      root.sessionStore.characters.has(characterDraftId(finalizedDraftId)),
    ).toBe(true);
  });

  test("does not apply Defense Fighting Style when no armor is worn", () => {
    const root = createMcpCompositionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const state = startBattleFromCharacterBuildAndStatBlock({
      battleId: battleId("battle-root-unarmored"),
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

  test("keeps spell slots but suppresses Magic-action spell acts when armor training blocks casting", () => {
    const root = createMcpCompositionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const state = startBattleFromCharacterBuildAndStatBlock({
      battleId: battleId("battle-root-armored-spellcaster"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Armored Spellcaster",
        initiative: initiativeScore(12),
        build: {
          ...build,
          armorTraining: [],
          spellcasting: {
            spellcastingAbility: "int",
            cantrips: ["ray_of_frost"],
            spellbook: [{ spellId: "magic_missile", spellLevel: 1 }],
            preparedSpells: ["magic_missile"],
            spellSlots: [{ spellLevel: 1, count: 2 }],
            spellcastingFocuses: ["spellbook"],
          },
        },
        spellSlots: [{ spellLevel: 1, count: 2, expended: 1 }],
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

    const actor = state.combatants.get(fighterId);
    expect(actor?.origin.kind).toBe("character");
    if (actor?.origin.kind !== "character") return;
    expect(actor.origin.spellcasting).toMatchObject({
      canCastSpells: false,
      spellSlots: [{ spellLevel: 1, count: 2, expended: 1 }],
    });
    expect(
      discoverBattleActs(state).map((act) => act.subject),
    ).not.toContainEqual(
      expect.objectContaining({ tag: "srdAction", action: "magic" }),
    );
  });

  test("keeps spell acts when only shield training is missing", () => {
    const root = createMcpCompositionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const state = startBattleFromCharacterBuildAndStatBlock({
      battleId: battleId("battle-root-shield-spellcaster"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Shield Spellcaster",
        initiative: initiativeScore(12),
        build: {
          ...build,
          armorTraining: [],
          equipment: {
            shield: "equipment_shield",
          },
          spellcasting: {
            spellcastingAbility: "int",
            cantrips: ["ray_of_frost"],
            spellbook: [{ spellId: "magic_missile", spellLevel: 1 }],
            preparedSpells: ["magic_missile"],
            spellSlots: [{ spellLevel: 1, count: 2 }],
            spellcastingFocuses: ["spellbook"],
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

    const actor = state.combatants.get(fighterId);
    expect(actor?.origin.kind).toBe("character");
    if (actor?.origin.kind !== "character") return;
    expect(actor.origin.spellcasting).toMatchObject({
      canCastSpells: true,
    });
    expect(discoverBattleActs(state).map((act) => act.subject)).toContainEqual(
      expect.objectContaining({ tag: "srdAction", action: "magic" }),
    );
  });

  test("rejects available character sessions with non-canonical Spell Slot state", () => {
    const root = createMcpCompositionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const spellcastingBuild = {
      ...build,
      spellcasting: {
        spellcastingAbility: "int" as const,
        cantrips: ["ray_of_frost"],
        spellbook: [{ spellId: "magic_missile", spellLevel: 1 as const }],
        preparedSpells: ["magic_missile"],
        spellSlots: [{ spellLevel: 1 as const, count: 2 as const }],
        spellcastingFocuses: ["spellbook" as const],
      },
    };

    expect(() =>
      availableCharacterSession({
        characterId: characterId("character:spell-slot-duplicate-levels"),
        build: spellcastingBuild,
        currentHp: Hp(spellcastingBuild.hitPoints.maximum),
        spellSlots: [
          { spellLevel: 1, count: 2, expended: 0 },
          { spellLevel: 1, count: 2, expended: 0 },
        ],
      }),
    ).toThrow("Spell Slot state must match build capacity exactly.");
    expect(() =>
      availableCharacterSession({
        characterId: characterId("character:spell-slot-mismatched-capacity"),
        build: {
          ...spellcastingBuild,
          spellcasting: {
            ...spellcastingBuild.spellcasting,
            spellSlots: [
              { spellLevel: 1, count: 2 },
              { spellLevel: 2, count: 1 },
            ],
          },
        },
        currentHp: Hp(spellcastingBuild.hitPoints.maximum),
        spellSlots: [
          { spellLevel: 1, count: 2, expended: 0 },
          { spellLevel: 1, count: 2, expended: 0 },
        ],
      }),
    ).toThrow("Spell Slot state must not duplicate spell levels.");
  });

  test("rejects character battle init when current HP exceeds build max HP", () => {
    const root = createMcpCompositionRoot();

    expect(() =>
      startBattleFromCharacterBuildAndStatBlock({
        battleId: battleId("battle-root-overmax-hp"),
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
  unitLibrary: ReturnType<typeof createMcpCompositionRoot>["unitLibrary"],
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

function fighterTwoCharacterBuild(
  unitLibrary: ReturnType<typeof createMcpCompositionRoot>["unitLibrary"],
): CharacterBuild {
  const draft = createTestDraft("draft:mcp-complete-fighter-two");
  const afterInitial = requireAcceptedBatch(
    fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: initialManifestFills(),
    }),
  );
  const afterAdvancement = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterInitial,
      unitLibrary,
      expectedRevision: afterInitial.revision,
      fills: [
        choiceFill(
          "cc:draft:draft.advancement.initial",
          "class_fighter:level_2",
        ),
      ],
    }),
  );
  const afterChoices = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterAdvancement,
      unitLibrary,
      expectedRevision: afterAdvancement.revision,
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
  const finalDraft = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterPurchase,
      unitLibrary,
      expectedRevision: afterPurchase.revision,
      fills: manifestLoadoutFills(),
    }),
  );
  const result = finalizeCharacterDraft({ draft: finalDraft, unitLibrary });
  if (result.tag !== "ready") {
    throw new Error("Expected complete Fighter 2 manifest draft to finalize.");
  }

  return result.build;
}

function createFinalizedFighterSheet(
  root: ReturnType<typeof createMcpCompositionRoot>,
  draftId: string,
): CharacterBuild {
  const build = fighterCharacterBuild(root.unitLibrary);
  root.sessionStore.characters.set(
    characterDraftId(draftId),
    availableCharacterSession({
      characterId: characterId(draftId),
      build,
      currentHp: Hp(build.hitPoints.maximum),
    }),
  );
  return build;
}

function createTestDraft(draftId: string): CharacterDraft {
  return createCharacterDraft({
    draftId: characterDraftId(draftId),
  });
}

function completeManifestDraft(
  unitLibrary: ReturnType<typeof createMcpCompositionRoot>["unitLibrary"],
): CharacterDraft {
  const draft = createTestDraft("draft:mcp-complete-manifest");
  const afterInitial = requireAcceptedBatch(
    fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: initialManifestFills(),
    }),
  );
  const afterAdvancement = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterInitial,
      unitLibrary,
      expectedRevision: afterInitial.revision,
      fills: manifestAdvancementFills(),
    }),
  );
  const afterChoices = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterAdvancement,
      unitLibrary,
      expectedRevision: afterAdvancement.revision,
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

function manifestAdvancementFills(): readonly CreationFill[] {
  return [
    choiceFill("cc:draft:draft.advancement.initial", "class_fighter:level_1"),
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
  root: ReturnType<typeof createMcpCompositionRoot>,
  draftId: string,
  expectedRevision: number,
  fills: readonly CreationFill[],
) {
  return readPayload(
    handleToolCall(root, "fill_creation_holes", {
      draftId,
      expectedRevision,
      fills,
    }),
  );
}

function createAndFinalizeManifestFighterThroughTools(
  root: ReturnType<typeof createMcpCompositionRoot>,
  draftId: string,
) {
  const created = readPayload(
    handleToolCall(root, "create_character_draft", { draftId }),
  );
  expect(created.holes.map((hole: CreationHole) => hole.holeId)).toEqual([
    "cc:draft:draft.primaryClass",
    "cc:draft:draft.background",
    "cc:draft:draft.species",
    "cc:draft:draft.abilityScoreGeneration",
    "cc:draft:draft.languages",
    "cc:draft:draft.alignment",
  ]);

  fillThroughTool(root, draftId, 0, initialManifestFills());
  const discoveredChoices = readPayload(
    handleToolCall(root, "discover_creation_holes", { draftId }),
  );
  expect(
    discoveredChoices.holes.map((hole: CreationHole) => hole.holeId),
  ).toEqual(initialClassHoleIds());

  fillThroughTool(root, draftId, 1, manifestAdvancementFills());
  fillThroughTool(root, draftId, 2, manifestChoiceFills());
  fillThroughTool(root, draftId, 3, manifestPurchaseFills());
  fillThroughTool(root, draftId, 4, manifestLoadoutFills());

  return readPayload(handleToolCall(root, "finalize_character", { draftId }));
}

function fillBattleHoleThroughTool(
  root: ReturnType<typeof createMcpCompositionRoot>,
  actorId: string,
  attackName: string,
  fill: {
    readonly kind: "targetChoice" | "attackRoll" | "rolledDice";
    readonly holeId: string;
    readonly value: unknown;
  },
) {
  return readPayload(
    handleToolCall(root, "fill_battle_hole", {
      subject: {
        tag: "srdAction",
        actorId,
        action: "attack",
        attackName,
      },
      fill,
    }),
  );
}

function readPayload(response: CharacterToolResult | BattleToolResult) {
  return JSON.parse(response.content[0]?.text ?? "null");
}

function initialClassHoleIds(): readonly CreationHoleIdText[] {
  return [
    ...manifestAdvancementFills().map((fill) => fill.holeId),
    ...manifestChoiceFills().map((fill) => fill.holeId),
  ];
}
