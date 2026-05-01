import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

type JsonObject = Record<string, unknown>;

const REPO_ROOT = "/workspace/typescript/dnd";

const expectedTools = [
  "describe_mcp_workflow",
  "list_stat_blocks",
  "list_catalog_units",
  "create_character_draft",
  "discover_creation_holes",
  "fill_creation_holes",
  "finalize_character",
  "list_characters",
  "select_stat_block",
  "start_battle",
  "read_battle_state",
  "discover_battle_acts",
  "fill_battle_hole",
  "resolve_battle_act",
  "end_turn",
  "end_battle",
] as const;

const agentConversationScenarios = [
  {
    name: "Discover the MCP surface",
    userSays: "What can you do for DND character creation and battle?",
    agentReads:
      "The agent calls listTools and sees workflow guide, catalog discovery, create/discover/fill/finalize/list character tools plus select/start/read/discover/fill/resolve/end battle tools.",
    agentDecision:
      "It first calls describe_mcp_workflow, list_catalog_units, or list_stat_blocks as needed, then treats returned holes and battle subjects as the source of truth for sequencing.",
    executableCoverage: "verifyToolContract",
    insufficiency:
      "This is now discoverable through MCP. Every tool exposes codec-derived inputSchema and outputSchema, and responses include structuredContent.",
  },
  {
    name: "Create a warrior 2nd level",
    userSays: "Create a warrior 2nd level.",
    agentReads:
      "No tool accepts natural language character goals. The agent can call list_catalog_units and see Fighter as class_fighter, but the workflow guide says MCP does not own synonym lists.",
    agentDecision:
      "It should either ask whether 'warrior' means Fighter or proceed only if its product vocabulary maps warrior to Fighter. It then fills primary class, background, species, ability scores, languages, alignment, class advancement, class/background choices, equipment purchase, and loadout using optionIds returned by discover_creation_holes.",
    executableCoverage: "createAndFinalizeFighterTwo",
    insufficiency:
      "The ambiguity is now explicit: a cold agent knows it should ask before mapping 'warrior' to Fighter.",
  },
  {
    name: "Create the first green character",
    userSays: "Create the Orc Soldier Fighter we support.",
    agentReads:
      "create_character_draft returns initial holes and finalization status. discover_creation_holes returns concrete holeId and optionId values after each accepted batch.",
    agentDecision:
      "It fills only currently returned holes, tracks expectedRevision from the draft, and calls finalize_character only after finalization reports ready or no holes remain.",
    executableCoverage: "verifyGreenVertical",
    insufficiency:
      "The input schema now exposes the fill union shapes. Cardinality and option meaning still correctly come from the returned runtime hole payload.",
  },
  {
    name: "Create a Wizard with spells",
    userSays:
      "Create an Orc Soldier Wizard 1 with Ray of Frost and Magic Missile.",
    agentReads:
      "After class_wizard and class_wizard:level_1, discovery returns wizard skill, cantrip, spellbook, prepared spell, background, equipment, and loadout holes.",
    agentDecision:
      "It selects ray_of_frost in wizard_cantrip_choices, magic_missile in both spellbook and prepared spell choices, and verifies finalization exposes spellSlots before entering battle.",
    executableCoverage: "createAndFinalizeWizardOne",
    insufficiency:
      "Spell Unit ids are now catalog-discoverable, but legal prepared/cantrip choices still correctly come from creation holes.",
  },
  {
    name: "Select monsters",
    userSays: "Fight a Goblin Warrior, then fight a Skeleton.",
    agentReads:
      "select_stat_block requires a statBlockId string and returns the selected record if the id exists.",
    agentDecision:
      "It calls select_stat_block with stat_block_goblin_warrior or stat_block_skeleton, then verifies the returned displayName/provenance before starting battle.",
    executableCoverage: "verifyGreenVertical and verifyWidthVertical",
    insufficiency:
      "Stat Block ids are now discoverable through list_stat_blocks.",
  },
  {
    name: "Start battle with Initiative",
    userSays: "Start battle with these characters and initiative scores.",
    agentReads:
      "start_battle exposes battleId, non-empty characters, statBlockCombatantId, statBlockInitiative, optional statBlock HP overrides, and per-character sourceDraftId/combatantId/characterId/initiative.",
    agentDecision:
      "It uses sourceDraftIds from finalized character sessions, caller-chosen combatantIds for table actors, caller-chosen durable characterIds for battle handoff, and rejects/repairs an empty characters array.",
    executableCoverage:
      "verifyToolContract, verifyGreenVertical, verifyWidthVertical",
    insufficiency:
      "The schema now describes sourceDraftId, combatantId, and characterId, and list_characters exposes a formal outputSchema for sourceDraftId result rows.",
  },
  {
    name: "Take turns and resolve attacks",
    userSays: "Run the battle round.",
    agentReads:
      "discover_battle_acts returns the current actor, turn order, acts, subjects, and initial holes. fill_battle_hole requires the exact subject returned by discovery and one fill at a time.",
    agentDecision:
      "It chooses an available act, copies its subject exactly, fills targetChoice, then attackRoll, then rolledDice using the holeIds requested by the runtime. If the result says needsHoles, it continues the same subject; if resolved, it rediscovers or ends turn.",
    executableCoverage: "verifyGreenVertical and verifyWidthVertical",
    insufficiency:
      "Battle fill shapes are now schema-discoverable. The MCP still intentionally does not roll dice, so the agent needs user-provided rolls, an external roller, or a future dice tool.",
  },
  {
    name: "Use Action Surge",
    userSays: "Use Action Surge and attack again.",
    agentReads:
      "discover_battle_acts returns an Action Surge act with a unitFeature subject and no initial holes.",
    agentDecision:
      "It calls resolve_battle_act with that subject, verifies the resource has zero uses remaining and usedThisTurn=true, then rediscovers available acts before attacking again.",
    executableCoverage: "verifyWidthVertical",
    insufficiency:
      "Only no-hole acts fit resolve_battle_act. If the agent tries resolve_battle_act for Attack or Magic, MCP returns a requires-holes error and the agent must switch to fill_battle_hole.",
  },
  {
    name: "Cast cantrips and slotted spells",
    userSays: "Cast Ray of Frost, then Magic Missile.",
    agentReads:
      "discover_battle_acts returns Magic-action subjects for wizard spells. Ray of Frost uses targetChoice and attackRoll; Magic Missile uses targetChoice and rolledDice.",
    agentDecision:
      "It resolves Ray of Frost and verifies spellSlots remain unspent, then resolves Magic Missile and verifies one level-1 slot is expended.",
    executableCoverage: "verifyWidthVertical",
    insufficiency:
      "Tool metadata now describes fill shapes, while the exact per-spell fill sequence remains runtime-owned and discoverable from battle act holes.",
  },
  {
    name: "Finish battle and inspect durable character state",
    userSays: "End the battle and show the updated character list.",
    agentReads:
      "end_battle takes empty args and returns endedBattleId, character sessions, and session snapshot. list_characters returns available characters with current HP and spellSlots.",
    agentDecision:
      "It calls end_battle only when no transient fills are pending, then list_characters to show durable HP and Spell Slot expenditure handoff.",
    executableCoverage: "verifyGreenVertical and verifyWidthVertical",
    insufficiency:
      "Post-battle handoff currently rejects 0 HP characters; the first vertical cannot finish a battle where a character is at 0 HP.",
  },
  {
    name: "Recover from invalid or stale actions",
    userSays: "Do the thing from earlier.",
    agentReads:
      "MCP rejects stale/unavailable subjects, different-subject fills while pending fills exist, empty character starts, unknown draft ids, duplicate ids, and end_turn/end_battle during pending fills.",
    agentDecision:
      "It reads the error code, rediscovers current holes or battle acts, then retries with the current revision/subject instead of replaying stale input.",
    executableCoverage: "verifyToolContract and verifyGreenVertical",
    insufficiency:
      "Errors are structured enough to recover, but there is no single 'what should I do next?' field in every response.",
  },
  {
    name: "Navigate result payloads without repository context",
    userSays: "Use whatever the MCP returns to decide the next step.",
    agentReads:
      "Tool results arrive as JSON text content. Creation state is under holes/finalization/draft, battle options are under snapshot.acts, follow-up battle holes are under result.holes, and pending fills are under session.transientBattleFills.",
    agentDecision:
      "It must parse the text payload as JSON, learn the response shape by inspection, and keep using returned holeIds, optionIds, subjects, revisions, actorIds, and result tags instead of inventing them.",
    executableCoverage:
      "callTool, holeIds, actionLabels, combatantHp, wizardSpellSlots",
    insufficiency:
      "describe_mcp_workflow documents these result paths, and the runtime tools expose outputSchema plus structuredContent for machine readers.",
  },
  {
    name: "Distinguish known-good acceptance from autonomous discovery",
    userSays:
      "Can an LLM with only this MCP create and run the whole scenario?",
    agentReads:
      "The executable client can run the full current domain and now verifies that key catalogs, input schemas, and result-path guidance are discoverable from MCP.",
    agentDecision:
      "A real LLM agent should still rely on discovery responses once started, but it cannot bootstrap every id and protocol detail from listTools alone. It needs examples, richer schemas, or catalog/guide tools.",
    executableCoverage: "whole file",
    insufficiency:
      "This QA runner still uses known-good decisions for speed. True autonomous validation would need a separate agent that chooses from discovered response payloads at runtime.",
  },
] as const;

async function main() {
  verifyAgentConversationScenarios();

  const preexistingDndMcpPids = dndMcpServerPids();
  assert.deepEqual(
    preexistingDndMcpPids,
    [],
    `Preexisting DND MCP server processes: ${preexistingDndMcpPids.join(", ")}`,
  );

  const transport = new StdioClientTransport({
    command: "pnpm",
    args: ["--filter", "@dnd/mcp", "dev"],
    cwd: REPO_ROOT,
    stderr: "inherit",
  });
  const client = new Client({
    name: "dnd-full-acceptance-client",
    version: "0.1.0",
  });

  try {
    await client.connect(transport);
    await verifyToolContract(client);
    await verifyGreenVertical(client);
    await verifyWidthVertical(client);
  } finally {
    await closeTransportBestEffort(transport);
    killDndMcpServerPids(preexistingDndMcpPids);
  }

  assert.deepEqual(dndMcpServerPids(), []);
}

async function verifyToolContract(client: Client) {
  const listed = await client.listTools();
  const toolNames = listed.tools.map((tool) => tool.name).sort();
  assert.deepEqual(toolNames, [...expectedTools].sort());
  for (const tool of listed.tools) {
    assert.ok(tool.inputSchema, `${tool.name} must expose inputSchema`);
    assert.ok(
      (tool as { readonly outputSchema?: unknown }).outputSchema,
      `${tool.name} must expose outputSchema`,
    );
  }

  const startBattle = listed.tools.find((tool) => tool.name === "start_battle");
  assert.ok(startBattle, "start_battle tool must be registered");
  const schemaText = JSON.stringify(startBattle.inputSchema);
  const startBattleOutputSchemaText = JSON.stringify(
    (startBattle as { readonly outputSchema?: unknown }).outputSchema,
  );
  assert.match(schemaText, /characters/);
  assert.match(schemaText, /sourceDraftId comes from list_characters/);
  assert.doesNotMatch(schemaText, /characterCombatantId/);
  assert.doesNotMatch(schemaText, /additionalCharacters/);
  assert.match(startBattleOutputSchemaText, /battleState/);
  assert.match(startBattleOutputSchemaText, /snapshot/);
  assert.match(startBattleOutputSchemaText, /session/);

  const fillCreationHoles = listed.tools.find(
    (tool) => tool.name === "fill_creation_holes",
  );
  assert.ok(fillCreationHoles, "fill_creation_holes tool must be registered");
  const creationSchemaText = JSON.stringify(fillCreationHoles.inputSchema);
  assert.match(creationSchemaText, /anyOf|oneOf/);
  assert.match(creationSchemaText, /abilityScores/);
  assert.match(creationSchemaText, /optionIds/);

  const fillBattleHole = listed.tools.find(
    (tool) => tool.name === "fill_battle_hole",
  );
  assert.ok(fillBattleHole, "fill_battle_hole tool must be registered");
  const battleFillSchemaText = JSON.stringify(fillBattleHole.inputSchema);
  assert.match(battleFillSchemaText, /targetChoice/);
  assert.match(battleFillSchemaText, /attackRoll/);
  assert.match(battleFillSchemaText, /rolledDice/);

  const selected = await callTool(client, "select_stat_block", {
    statBlockId: "stat_block_goblin_warrior",
  });
  assert.equal(
    get(selected, "selectedStatBlock.statBlock.displayName"),
    "Goblin Warrior",
  );

  await expectToolError(client, "start_battle", {
    battleId: "battle:empty-rejected",
    characters: [],
    statBlockCombatantId: "goblin",
    statBlockInitiative: 10,
  });

  const workflow = await callTool(client, "describe_mcp_workflow", {});
  assert.ok((get(workflow, "lifecycle") as string[]).length > 0);
  assert.equal(get(workflow, "resultPaths.battleActs"), "snapshot.acts");

  const units = await callTool(client, "list_catalog_units", {});
  assert.ok(
    unitSummaries(units, "class").some((unit) => unit.id === "class_fighter"),
  );
  assert.ok(
    unitSummaries(units, "spell").some((unit) => unit.id === "magic_missile"),
  );

  const statBlocks = await callTool(client, "list_stat_blocks", {});
  assert.deepEqual(
    (get(statBlocks, "statBlocks") as Array<{ statBlockId: string }>).map(
      (statBlock) => statBlock.statBlockId,
    ),
    ["stat_block_goblin_warrior", "stat_block_skeleton"],
  );
}

async function verifyGreenVertical(client: Client) {
  const draftId = "draft:stdio-accepted-orc-soldier-fighter";
  const created = await callTool(client, "create_character_draft", { draftId });
  assert.deepEqual(holeIds(created), [
    "cc:draft:draft.primaryClass",
    "cc:draft:draft.background",
    "cc:draft:draft.species",
    "cc:draft:draft.abilityScoreGeneration",
    "cc:draft:draft.languages",
    "cc:draft:draft.alignment",
  ]);

  await callTool(client, "fill_creation_holes", {
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

  const choices = await callTool(client, "discover_creation_holes", {
    draftId,
  });
  assert.deepEqual(holeIds(choices), [
    "cc:draft:draft.advancement.initial",
    "cc:unit:class_fighter:fighter_skill_choices",
    "cc:unit:fighter_fighting_style_l1:fighter_fighting_style",
    "cc:unit:fighter_weapon_mastery_l1:fighter_weapon_mastery_choices",
    "cc:unit:class_fighter:class_equipment_choice",
    "cc:unit:background_soldier:background_ability_score_increase",
    "cc:unit:background_soldier:background_tool_choice",
    "cc:unit:background_soldier:background_equipment_choice",
  ]);

  await callTool(client, "fill_creation_holes", {
    draftId,
    expectedRevision: 1,
    fills: [
      choiceFill("cc:draft:draft.advancement.initial", "class_fighter:level_1"),
    ],
  });
  await callTool(client, "fill_creation_holes", {
    draftId,
    expectedRevision: 2,
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
  await callTool(client, "fill_creation_holes", {
    draftId,
    expectedRevision: 3,
    fills: [
      choiceFill(
        "cc:unit:class_fighter:equipment_purchase",
        "armor_chain_mail",
        "weapon_longsword",
        "equipment_shield",
      ),
    ],
  });
  await callTool(client, "fill_creation_holes", {
    draftId,
    expectedRevision: 4,
    fills: [
      choiceFill("cc:unit:armor_chain_mail:loadout_armor", "worn"),
      choiceFill("cc:unit:equipment_shield:loadout_shield", "wielded"),
      choiceFill(
        "cc:unit:weapon_longsword:loadout_weapon",
        "wielded_one_handed",
      ),
    ],
  });

  const finalized = await callTool(client, "finalize_character", { draftId });
  assert.equal(get(finalized, "finalization.tag"), "ready");
  assert.equal(get(finalized, "finalization.build.hitPoints.maximum"), 12);

  const listedBeforeBattle = await callTool(client, "list_characters", {});
  assert.equal(get(listedBeforeBattle, "characters.0.hitPoints.current"), 12);

  const selected = await callTool(client, "select_stat_block", {
    statBlockId: "stat_block_goblin_warrior",
  });
  assert.equal(
    get(selected, "selectedStatBlock.statBlock.displayName"),
    "Goblin Warrior",
  );

  const started = await callTool(client, "start_battle", {
    battleId: "battle:stdio-accepted-vertical",
    characters: [
      {
        sourceDraftId: draftId,
        combatantId: "fighter",
        characterId: "character:stdio-accepted-fighter",
        initiative: 18,
      },
    ],
    statBlockCombatantId: "goblin",
    statBlockInitiative: 7,
  });
  assert.deepEqual(get(started, "snapshot.turnOrder"), ["fighter", "goblin"]);
  assert.equal(get(started, "snapshot.currentActorId"), "fighter");

  const read = await callTool(client, "read_battle_state", {});
  assert.equal(get(read, "snapshot.currentActorId"), "fighter");
  assert.deepEqual(
    actionLabels(await callTool(client, "discover_battle_acts", {})),
    ["Attack", "End Turn"],
  );

  await callTool(client, "fill_battle_hole", {
    subject: attackSubject("fighter", "Longsword"),
    fill: targetFill("goblin"),
  });
  await expectToolError(client, "end_turn", { actorId: "fighter" });
  await expectToolError(client, "end_battle", {});

  await callTool(client, "fill_battle_hole", {
    subject: attackSubject("fighter", "Longsword"),
    fill: attackRollFill(16, 14),
  });
  const fighterDamage = await callTool(client, "fill_battle_hole", {
    subject: attackSubject("fighter", "Longsword"),
    fill: rolledDiceFill("battle:attack:damage-result:1d8+3-slashing", [[5]]),
  });
  assert.equal(get(fighterDamage, "result.tag"), "resolved");
  assert.equal(combatantHp(fighterDamage, "goblin"), 2);

  const endedFighterTurn = await callTool(client, "end_turn", {
    actorId: "fighter",
  });
  assert.equal(get(endedFighterTurn, "snapshot.currentActorId"), "goblin");
  assert.deepEqual(
    actionLabels(await callTool(client, "discover_battle_acts", {})),
    ["Attack", "Attack", "End Turn"],
  );

  await callTool(client, "fill_battle_hole", {
    subject: attackSubject("goblin", "Scimitar"),
    fill: targetFill("fighter"),
  });
  await callTool(client, "fill_battle_hole", {
    subject: attackSubject("goblin", "Scimitar"),
    fill: attackRollFill(20, 18),
  });
  const goblinDamage = await callTool(client, "fill_battle_hole", {
    subject: attackSubject("goblin", "Scimitar"),
    fill: rolledDiceFill("battle:attack:damage-result:1d6+2-slashing", [[5]]),
  });
  assert.equal(combatantHp(goblinDamage, "fighter"), 5);

  const ended = await callTool(client, "end_battle", {});
  assert.equal(get(ended, "endedBattleId"), "battle:stdio-accepted-vertical");
  assert.equal(get(ended, "session.activeBattle"), null);

  const listed = await callTool(client, "list_characters", {});
  assert.equal(get(listed, "characters.0.status"), "available");
  assert.equal(get(listed, "characters.0.displayName"), "Orc Soldier Fighter");
  assert.equal(get(listed, "characters.0.hitPoints.current"), 5);
  assert.equal(get(listed, "characters.0.hitPoints.maximum"), 12);
  assert.equal(
    (get(listed, "characters") as JsonObject[]).some(
      (character) => character.displayName === "Goblin Warrior",
    ),
    false,
  );
}

async function verifyWidthVertical(client: Client) {
  const fighterDraftId = "draft:stdio-post5-orc-soldier-fighter-two";
  const wizardDraftId = "draft:stdio-post5-orc-soldier-wizard-one";
  await createAndFinalizeFighterTwo(client, fighterDraftId);
  const finalizedWizard = await createAndFinalizeWizardOne(
    client,
    wizardDraftId,
  );
  assert.deepEqual(
    get(finalizedWizard, "finalization.build.spellcasting.spellSlots"),
    [{ count: 2, spellLevel: 1 }],
  );
  assert.ok(
    (
      get(
        finalizedWizard,
        "finalization.build.spellcasting.cantrips",
      ) as string[]
    ).includes("ray_of_frost"),
  );
  assert.ok(
    (
      get(
        finalizedWizard,
        "finalization.build.spellcasting.preparedSpells",
      ) as string[]
    ).includes("magic_missile"),
  );

  const selected = await callTool(client, "select_stat_block", {
    statBlockId: "stat_block_skeleton",
  });
  assert.equal(
    get(selected, "selectedStatBlock.statBlock.displayName"),
    "Skeleton",
  );
  assert.deepEqual(
    get(selected, "selectedStatBlock.statBlock.vulnerabilities.damageTypes"),
    ["bludgeoning"],
  );
  assert.deepEqual(
    get(selected, "selectedStatBlock.statBlock.immunities.damageTypes"),
    ["poison"],
  );

  const started = await callTool(client, "start_battle", {
    battleId: "battle:stdio-post5-width",
    characters: [
      {
        sourceDraftId: fighterDraftId,
        combatantId: "fighter",
        characterId: "character:stdio-post5-fighter",
        initiative: 18,
      },
      {
        sourceDraftId: wizardDraftId,
        combatantId: "wizard",
        characterId: "character:stdio-post5-wizard",
        initiative: 14,
      },
    ],
    statBlockCombatantId: "skeleton",
    statBlockInitiative: 8,
  });
  assert.deepEqual(get(started, "snapshot.turnOrder"), [
    "fighter",
    "wizard",
    "skeleton",
  ]);
  assert.equal(combatantHp(started, "fighter"), 20);
  assert.equal(combatantHp(started, "wizard"), 8);
  assert.equal(combatantHp(started, "skeleton"), 13);

  assert.deepEqual(
    actionLabels(await callTool(client, "discover_battle_acts", {})),
    ["Attack", "Action Surge", "End Turn"],
  );

  await callTool(client, "fill_battle_hole", {
    subject: attackSubject("fighter", "Flail"),
    fill: targetFill("skeleton"),
  });
  await callTool(client, "fill_battle_hole", {
    subject: attackSubject("fighter", "Flail"),
    fill: attackRollFill(18, 15),
  });
  const afterBludgeoning = await callTool(client, "fill_battle_hole", {
    subject: attackSubject("fighter", "Flail"),
    fill: rolledDiceFill("battle:attack:damage-result:1d8+3-bludgeoning", [
      [1],
    ]),
  });
  assert.equal(combatantHp(afterBludgeoning, "skeleton"), 5);

  const surged = await callTool(client, "resolve_battle_act", {
    subject: {
      tag: "unitFeature",
      actorId: "fighter",
      unitId: "fighter_action_surge",
    },
  });
  assert.equal(get(surged, "result.tag"), "resolved");
  const resources = get(
    surged,
    "battleState.combatants.0.origin.resources",
  ) as JsonObject[];
  assert.ok(
    resources.some(
      (resource) =>
        resource.unitId === "fighter_action_surge" &&
        resource.usesRemaining === 0 &&
        resource.usedThisTurn === true,
    ),
  );

  await callTool(client, "fill_battle_hole", {
    subject: attackSubject("fighter", "Flail"),
    fill: targetFill("skeleton"),
  });
  const missedExtraAttack = await callTool(client, "fill_battle_hole", {
    subject: attackSubject("fighter", "Flail"),
    fill: attackRollFill(1, 1),
  });
  assert.equal(get(missedExtraAttack, "result.tag"), "resolved");

  assert.equal(
    get(
      await callTool(client, "end_turn", { actorId: "fighter" }),
      "snapshot.currentActorId",
    ),
    "wizard",
  );

  const wizardActs = await callTool(client, "discover_battle_acts", {});
  assert.ok(actionLabels(wizardActs).includes("Magic Missile"));
  assert.ok(actionLabels(wizardActs).includes("Ray of Frost"));

  await callTool(client, "fill_battle_hole", {
    subject: magicSubject("wizard", "ray_of_frost"),
    fill: targetFill("skeleton"),
  });
  const afterRayMiss = await callTool(client, "fill_battle_hole", {
    subject: magicSubject("wizard", "ray_of_frost"),
    fill: attackRollFill(1, 1),
  });
  assert.equal(get(afterRayMiss, "result.tag"), "resolved");
  assert.deepEqual(wizardSpellSlots(afterRayMiss), [
    { count: 2, expended: 0, spellLevel: 1 },
  ]);

  assert.equal(
    get(
      await callTool(client, "end_turn", { actorId: "wizard" }),
      "snapshot.currentActorId",
    ),
    "skeleton",
  );
  const skeletonActs = await callTool(client, "discover_battle_acts", {});
  assert.ok(actionLabels(skeletonActs).includes("Attack"));

  await callTool(client, "fill_battle_hole", {
    subject: attackSubject("skeleton", "Shortsword"),
    fill: targetFill("fighter"),
  });
  await callTool(client, "fill_battle_hole", {
    subject: attackSubject("skeleton", "Shortsword"),
    fill: attackRollFill(20, 15),
  });
  const afterSkeletonAttack = await callTool(client, "fill_battle_hole", {
    subject: attackSubject("skeleton", "Shortsword"),
    fill: rolledDiceFill("battle:attack:damage-result:1d6+3-piercing", [[1]]),
  });
  assert.equal(combatantHp(afterSkeletonAttack, "fighter"), 16);

  assert.equal(
    get(
      await callTool(client, "end_turn", { actorId: "skeleton" }),
      "snapshot.currentActorId",
    ),
    "fighter",
  );
  assert.equal(
    get(
      await callTool(client, "end_turn", { actorId: "fighter" }),
      "snapshot.currentActorId",
    ),
    "wizard",
  );

  await callTool(client, "fill_battle_hole", {
    subject: magicSubject("wizard", "magic_missile"),
    fill: targetFill("skeleton"),
  });
  const afterMagicMissile = await callTool(client, "fill_battle_hole", {
    subject: magicSubject("wizard", "magic_missile"),
    fill: rolledDiceFill(
      "battle:spell:damage-result:magic_missile:3d4+3-force",
      [[1, 1, 1]],
    ),
  });
  assert.equal(get(afterMagicMissile, "result.tag"), "resolved");
  assert.equal(combatantHp(afterMagicMissile, "skeleton"), 0);
  assert.deepEqual(wizardSpellSlots(afterMagicMissile), [
    { count: 2, expended: 1, spellLevel: 1 },
  ]);

  const ended = await callTool(client, "end_battle", {});
  const sourceDraftIds = get(ended, "session.sourceDraftIds") as string[];
  assert.ok(sourceDraftIds.includes(fighterDraftId));
  assert.ok(sourceDraftIds.includes(wizardDraftId));
  const listed = await callTool(client, "list_characters", {});
  const fighter = characterRow(listed, fighterDraftId);
  const wizard = characterRow(listed, wizardDraftId);
  assert.equal(get(fighter, "hitPoints.current"), 16);
  assert.equal(get(fighter, "hitPoints.maximum"), 20);
  assert.equal(get(wizard, "hitPoints.current"), 8);
  assert.deepEqual(get(wizard, "spellSlots"), [
    { count: 2, expended: 1, spellLevel: 1 },
  ]);
}

async function createAndFinalizeFighterTwo(client: Client, draftId: string) {
  await callTool(client, "create_character_draft", { draftId });
  await fillBaseOrcSoldier(client, draftId, "class_fighter", {
    str: 15,
    dex: 14,
    con: 13,
    int: 8,
    wis: 10,
    cha: 12,
  });
  await callTool(client, "fill_creation_holes", {
    draftId,
    expectedRevision: 1,
    fills: [
      choiceFill("cc:draft:draft.advancement.initial", "class_fighter:level_2"),
    ],
  });
  await callTool(client, "fill_creation_holes", {
    draftId,
    expectedRevision: 2,
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
  await callTool(client, "fill_creation_holes", {
    draftId,
    expectedRevision: 3,
    fills: [
      choiceFill(
        "cc:unit:class_fighter:equipment_purchase",
        "armor_chain_mail",
        "weapon_flail",
        "equipment_shield",
      ),
    ],
  });
  await callTool(client, "fill_creation_holes", {
    draftId,
    expectedRevision: 4,
    fills: [
      choiceFill("cc:unit:armor_chain_mail:loadout_armor", "worn"),
      choiceFill("cc:unit:equipment_shield:loadout_shield", "wielded"),
      choiceFill("cc:unit:weapon_flail:loadout_weapon", "wielded_one_handed"),
    ],
  });
  return callTool(client, "finalize_character", { draftId });
}

async function createAndFinalizeWizardOne(client: Client, draftId: string) {
  await callTool(client, "create_character_draft", { draftId });
  await fillBaseOrcSoldier(client, draftId, "class_wizard", {
    str: 8,
    dex: 14,
    con: 13,
    int: 15,
    wis: 10,
    cha: 12,
  });
  await callTool(client, "fill_creation_holes", {
    draftId,
    expectedRevision: 1,
    fills: [
      choiceFill("cc:draft:draft.advancement.initial", "class_wizard:level_1"),
    ],
  });
  await callTool(client, "fill_creation_holes", {
    draftId,
    expectedRevision: 2,
    fills: [
      choiceFill(
        "cc:unit:class_wizard:wizard_skill_choices",
        "arcana",
        "history",
      ),
      choiceFill(
        "cc:unit:class_wizard:wizard_cantrip_choices",
        "light",
        "fire_bolt",
        "ray_of_frost",
      ),
      choiceFill(
        "cc:unit:class_wizard:wizard_spellbook_choices",
        "detect_magic",
        "mage_armor",
        "magic_missile",
        "shield",
        "sleep",
        "thunderwave",
      ),
      choiceFill(
        "cc:unit:class_wizard:wizard_prepared_spell_choices",
        "detect_magic",
        "mage_armor",
        "magic_missile",
        "sleep",
      ),
      choiceFill(
        "cc:unit:background_soldier:background_ability_score_increase",
        "two_and_one:str:con",
      ),
      choiceFill(
        "cc:unit:background_soldier:background_tool_choice",
        "tool_dice_set",
      ),
      choiceFill("cc:unit:class_wizard:class_equipment_choice", "option_b"),
      choiceFill(
        "cc:unit:background_soldier:background_equipment_choice",
        "option_b",
      ),
    ],
  });
  await callTool(client, "fill_creation_holes", {
    draftId,
    expectedRevision: 3,
    fills: [
      choiceFill(
        "cc:unit:class_wizard:equipment_purchase",
        "weapon_longsword",
        "weapon_dagger",
        "equipment_shield",
      ),
    ],
  });
  await callTool(client, "fill_creation_holes", {
    draftId,
    expectedRevision: 4,
    fills: [
      choiceFill("cc:unit:equipment_shield:loadout_shield", "wielded"),
      choiceFill(
        "cc:unit:weapon_longsword:loadout_weapon",
        "wielded_one_handed",
      ),
    ],
  });
  return callTool(client, "finalize_character", { draftId });
}

async function fillBaseOrcSoldier(
  client: Client,
  draftId: string,
  primaryClass: string,
  abilityScores: JsonObject,
) {
  await callTool(client, "fill_creation_holes", {
    draftId,
    expectedRevision: 0,
    fills: [
      choiceFill("cc:draft:draft.primaryClass", primaryClass),
      choiceFill("cc:draft:draft.background", "background_soldier"),
      choiceFill("cc:draft:draft.species", "species_orc"),
      {
        kind: "abilityScores",
        holeId: "cc:draft:draft.abilityScoreGeneration",
        method: "standardArray",
        value: abilityScores,
      },
      choiceFill("cc:draft:draft.languages", "Dwarvish", "Goblin"),
      choiceFill("cc:draft:draft.alignment", "lawful_good"),
    ],
  });
}

async function callTool(client: Client, name: string, args: JsonObject) {
  const result = await client.callTool({ name, arguments: args });
  if (result.isError === true) {
    throw new Error(`${name} returned error: ${JSON.stringify(result)}`);
  }
  assert.notEqual(
    result.structuredContent,
    undefined,
    `${name} success result must include structuredContent`,
  );
  return parseToolPayload(result, name);
}

async function expectToolError(client: Client, name: string, args: JsonObject) {
  const result = await client.callTool({ name, arguments: args });
  assert.equal(result.isError, true, `${name} should return a tool error`);
  return parseToolPayload(result, name);
}

function parseToolPayload(result: unknown, name: string) {
  const content = (result as { readonly content?: unknown }).content;
  const structuredContent = (result as { readonly structuredContent?: unknown })
    .structuredContent;
  assert.ok(Array.isArray(content), `${name} result content must be an array`);
  const [first] = content;
  assert.equal(
    (first as { readonly type?: unknown }).type,
    "text",
    `${name} result content must be text`,
  );
  const textPayload = JSON.parse((first as { readonly text: string }).text);
  if (structuredContent !== undefined) {
    assert.deepEqual(
      structuredContent,
      textPayload,
      `${name} structuredContent must match text JSON`,
    );
  }
  return textPayload;
}

function choiceFill(holeId: string, ...optionIds: readonly string[]) {
  return { kind: "choice", holeId, optionIds };
}

function attackSubject(actorId: string, attackName: string) {
  return { tag: "srdAction", actorId, action: "attack", attackName };
}

function magicSubject(actorId: string, spellId: string) {
  return { tag: "srdAction", actorId, action: "magic", spellId };
}

function targetFill(value: string) {
  return { kind: "targetChoice", holeId: "battle:attack:target", value };
}

function attackRollFill(total: number, naturalD20: number) {
  return {
    kind: "attackRoll",
    holeId: "battle:attack:roll",
    value: { total, naturalD20 },
  };
}

function rolledDiceFill(
  holeId: string,
  groups: readonly (readonly number[])[],
) {
  return {
    kind: "rolledDice",
    holeId,
    value: groups.map((results) => ({ results })),
  };
}

function holeIds(payload: JsonObject) {
  return (payload.holes as ReadonlyArray<{ readonly holeId: string }>).map(
    (hole) => hole.holeId,
  );
}

function actionLabels(payload: JsonObject) {
  return (
    get(payload, "snapshot.acts") as ReadonlyArray<{ readonly label: string }>
  ).map((act) => act.label);
}

function combatantHp(payload: JsonObject, combatantId: string) {
  const combatants = get(payload, "battleState.combatants") as ReadonlyArray<{
    readonly combatantId: string;
    readonly hp: number;
  }>;
  const combatant = combatants.find(
    (candidate) => candidate.combatantId === combatantId,
  );
  assert.ok(combatant, `Missing combatant ${combatantId}`);
  return combatant.hp;
}

function wizardSpellSlots(payload: JsonObject) {
  const combatants = get(payload, "battleState.combatants") as ReadonlyArray<{
    readonly combatantId: string;
    readonly origin: {
      readonly spellcasting?: {
        readonly spellSlots: readonly JsonObject[];
      };
    };
  }>;
  const wizard = combatants.find(
    (candidate) => candidate.combatantId === "wizard",
  );
  assert.ok(wizard, "Missing wizard combatant");
  return wizard.origin.spellcasting?.spellSlots;
}

function characterRow(payload: JsonObject, sourceDraftId: string) {
  const characters = get(payload, "characters") as JsonObject[];
  const character = characters.find(
    (candidate) => candidate.sourceDraftId === sourceDraftId,
  );
  assert.ok(character, `Missing listed character ${sourceDraftId}`);
  return character;
}

function unitSummaries(payload: JsonObject, kind: string) {
  return get(payload, `unitsByKind.${kind}`) as Array<{ readonly id: string }>;
}

function get(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current == null) return undefined;
    if (Array.isArray(current)) return current[Number(key)];
    return (current as JsonObject)[key];
  }, value);
}

function verifyAgentConversationScenarios() {
  assert.equal(agentConversationScenarios.length, 13);
  for (const scenario of agentConversationScenarios) {
    assert.notEqual(scenario.name.trim(), "");
    assert.notEqual(scenario.userSays.trim(), "");
    assert.notEqual(scenario.agentReads.trim(), "");
    assert.notEqual(scenario.agentDecision.trim(), "");
    assert.notEqual(scenario.executableCoverage.trim(), "");
    assert.notEqual(scenario.insufficiency.trim(), "");
  }
}

async function closeTransportBestEffort(transport: StdioClientTransport) {
  await Promise.race([
    transport.close(),
    new Promise<void>((resolve) => setTimeout(resolve, 1_000)),
  ]);
}

function dndMcpServerPids() {
  const output = execFileSync("ps", ["-eo", "pid=,ppid=,command="], {
    encoding: "utf8",
  });
  const processes = output
    .split("\n")
    .map((line) => line.trim())
    .map((line) => {
      const [pidText, ppidText, ...commandParts] = line.split(/\s+/);
      return {
        pid: Number(pidText),
        ppid: Number(ppidText),
        command: commandParts.join(" "),
      };
    })
    .filter(
      (entry) =>
        Number.isInteger(entry.pid) &&
        entry.pid > 0 &&
        entry.pid !== process.pid,
    );
  const roots = new Set(
    processes
      .filter((entry) => dndMcpServerRootCommand(entry.command))
      .map((entry) => entry.pid),
  );
  const pids = new Set(roots);
  let changed = true;
  while (changed) {
    changed = false;
    for (const entry of processes) {
      if (pids.has(entry.ppid) && !pids.has(entry.pid)) {
        pids.add(entry.pid);
        changed = true;
      }
    }
  }
  return [...pids];
}

function dndMcpServerRootCommand(command: string) {
  return /\bpnpm\b/.test(command) && /--filter\s+@dnd\/mcp\s+dev/.test(command);
}

function killDndMcpServerPids(preexistingPids: readonly number[]) {
  const preexisting = new Set(preexistingPids);
  const pids = dndMcpServerPids().filter((pid) => !preexisting.has(pid));
  if (pids.length === 0) return;
  for (const pid of pids) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Already exited.
    }
  }
  const remaining = dndMcpServerPids().filter((pid) => !preexisting.has(pid));
  for (const pid of remaining) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // Already exited.
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
