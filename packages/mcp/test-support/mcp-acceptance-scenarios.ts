import assert from "node:assert/strict";

import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { characterDraftId } from "@dnd/character-creation-runtime";
import { characterIdFromDraftId } from "../src/session-store.ts";

import {
  GENERIC_COMBAT_ACTION_LABELS,
  GENERIC_COMBAT_ACTION_LABELS_WITH_HELP_AND_SHOVE,
  GENERIC_COMBAT_ACTION_LABELS_WITH_SHOVE,
} from "./battle-act-labels.ts";
import { loadoutHoleId, unitHoleId } from "./creation-hole-ids.ts";

type JsonObject = Record<string, unknown>;

function testCharacterId(draftId: string) {
  return characterIdFromDraftId(characterDraftId(draftId));
}

const expectedTools = [
  "describe_mcp_workflow",
  "list_stat_blocks",
  "list_catalog_units",
  "create_character_draft",
  "apply_character_session_operation",
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

const levelFourWizardProgressionOptionId =
  "12:class_wizard|12:class_wizard|12:class_wizard|12:class_wizard:level_4:fixed_hp_gain";
const levelFiveWizardProgressionOptionId =
  "12:class_wizard|12:class_wizard|12:class_wizard|12:class_wizard|12:class_wizard:level_5:fixed_hp_gain";

const levelFiveWizardSlotCapacities = [
  { count: 4, spellLevel: 1 },
  { count: 3, spellLevel: 2 },
  { count: 2, spellLevel: 3 },
] as const;
const levelFiveWizardUnexpendedSpellSlots = levelFiveWizardSlotCapacities.map(
  (slot) => ({ ...slot, expended: 0 }),
);
const levelFiveWizardAfterFireballSpellSlots =
  levelFiveWizardSlotCapacities.map((slot) => ({
    ...slot,
    expended: slot.spellLevel === 3 ? 1 : 0,
  }));
const levelFiveWizardFireballDraftId =
  "draft:stdio-level-five-elf-soldier-wizard-fireball";
const levelFiveWizardFireballCombatantId = "wizard-level-5";
const levelFiveWizardFireballBattleId = "battle:stdio-level-five-fireball";

const agentConversationScenarios = [
  {
    id: "discover-mcp-surface",
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
    id: "create-warrior-second-level",
    name: "Create a warrior 2nd level",
    userSays: "Create a warrior 2nd level.",
    agentReads:
      "No tool accepts natural language character goals. The agent can call list_catalog_units and see Fighter as class_fighter, but the workflow guide says MCP does not own synonym lists.",
    agentDecision:
      "It should either ask whether 'warrior' means Fighter or proceed only if its product vocabulary maps warrior to Fighter. It then fills progression, background, species, ability scores, languages, alignment, class/background choices, equipment purchase, and loadout using optionIds returned by discover_creation_holes.",
    executableCoverage: "createAndFinalizeFighterTwo",
    insufficiency:
      "The ambiguity is now explicit: a cold agent knows it should ask before mapping 'warrior' to Fighter.",
  },
  {
    id: "create-baseline-character",
    name: "Create the baseline character",
    userSays: "Create the Orc Soldier Fighter we support.",
    agentReads:
      "create_character_draft returns initial holes and finalization status. discover_creation_holes returns concrete holeId and optionId values after each accepted batch.",
    agentDecision:
      "It fills only currently returned holes, tracks expectedRevision from the draft, and calls finalize_character only after finalization reports ready or no holes remain.",
    executableCoverage: "verifyBaselineVertical",
    insufficiency:
      "The input schema now exposes the fill union shapes. Cardinality and option meaning still correctly come from the returned runtime hole payload.",
  },
  {
    id: "create-wizard-with-spells",
    name: "Create a Wizard with spells",
    userSays:
      "Create an Elf Soldier Wizard 2 with Ray of Frost, Shield, and Magic Missile.",
    agentReads:
      "After the level-2 Wizard progression fill, discovery returns wizard skill, cantrip, spellbook, prepared spell, background, equipment, and loadout holes.",
    agentDecision:
      "It selects ray_of_frost in wizard_cantrip_choices, magic_missile and shield in both spellbook and prepared spell choices, and verifies finalization exposes level-1 spellSlots before entering battle.",
    executableCoverage: "createAndFinalizeElfWizardTwo",
    insufficiency:
      "Spell Unit ids are now catalog-discoverable, but legal prepared/cantrip choices still correctly come from creation holes.",
  },
  {
    id: "create-level-three-wizard-and-cast-scorching-ray",
    name: "Create a level 3 Wizard and cast Scorching Ray",
    userSays:
      "Create an Elf Soldier Wizard 3 Evoker with Scorching Ray, then cast it in battle.",
    agentReads:
      "After the Wizard 3 progression fill, discovery returns the subclass, spellbook, prepared spell, equipment, and Evocation Savant holes. The finalized Character Sheet exposes four level-1 Spell Slots and two level-2 Spell Slots before battle.",
    agentDecision:
      "It selects subclass_wizard_evoker, includes scorching_ray in the returned spellbook and prepared-spell holes, starts battle from the finalized Character Sheet and an SRD Stat Block, then follows Scorching Ray target, attack-roll, and damage holes returned by discover_battle_acts and fill_battle_hole.",
    executableCoverage: "verifyLevelThreeWizardVertical",
    insufficiency:
      "This is a known-good MCP scenario. It proves the level-3 path and level-2 Spell Slot handoff, while autonomous id selection remains delegated to catalog and hole discovery.",
  },
  {
    id: "create-level-four-wizard-asi-and-battle-handoff",
    name: "Create a level 4 Wizard with Ability Score Improvement",
    userSays:
      "Create an Elf Soldier Wizard 4 Evoker, take Ability Score Improvement, then show the sheet and start battle.",
    agentReads:
      "After the Wizard 4 progression fill, discovery returns the level-4 Ability Score Improvement feat choice, the ASI ability-score increase choice, Wizard cantrip, spellbook, prepared-spell, equipment, and loadout holes. The finalized Character Sheet exposes Intelligence 17 plus four level-1 Spell Slots and three level-2 Spell Slots.",
    agentDecision:
      "It selects the Ability Score Improvement feat and its returned Intelligence +2 option, finalizes only after MCP reports no remaining holes, reads list_characters for durable Character Sheet state, then starts battle from the finalized Character Sheet and inspects the returned battle spell-slot projection.",
    executableCoverage: "verifyLevelFourWizardVertical",
    insufficiency:
      "This is a known-good MCP scenario for level 4. It still relies on MCP-returned holes and option ids for sequencing, while autonomous natural-language planning remains outside this acceptance runner.",
  },
  {
    id: "create-level-five-wizard-fireball-and-battle-handoff",
    name: "Create a level 5 Wizard and cast Fireball",
    userSays:
      "Create an Elf Soldier Wizard 5 Evoker with Fireball, then cast Fireball in battle.",
    agentReads:
      "After the Wizard 5 progression fill, discovery returns Wizard cantrip, spellbook, prepared-spell, equipment, loadout, subclass, and feature holes. The finalized Character Sheet exposes Fireball Spell Access plus four level-1 Spell Slots, three level-2 Spell Slots, and two level-3 Spell Slots before battle.",
    agentDecision:
      "It selects Fireball only through returned spellbook and prepared-spell option ids, starts battle from the finalized Character Sheet, follows the returned Fireball subject and battle holes, supplies area, saving throw, object ignition, and rolled dice facts, then verifies one level-3 Spell Slot is expended.",
    executableCoverage: "verifyLevelFiveWizardFireballBattleHandoff",
    insufficiency:
      "This is a known-good MCP scenario for level 5. It proves durable Wizard 5 sheet state, Fireball Spell Access, level-3 Spell Slot projection, and battle handoff while keeping tactical fills caller-owned.",
  },
  {
    id: "select-monsters",
    name: "Select monsters",
    userSays: "Fight a Goblin Warrior, then fight a Skeleton.",
    agentReads:
      "select_stat_block requires a statBlockId string and returns the selected record if the id exists.",
    agentDecision:
      "It calls select_stat_block with stat_block_goblin_warrior or stat_block_skeleton, then verifies the returned displayName/provenance before starting battle.",
    executableCoverage: "verifyBaselineVertical and verifyWidthVertical",
    insufficiency:
      "Stat Block ids are now discoverable through list_stat_blocks.",
  },
  {
    id: "start-battle-with-initiative",
    name: "Start battle with Initiative",
    userSays: "Start battle with these characters and initiative scores.",
    agentReads:
      "start_battle exposes battleId, a non-empty initialCombatants roster, and per-combatant Initiative.",
    agentDecision:
      "It uses characterIds from finalized character sessions, statBlock roster entries with Stat Block ids from list_stat_blocks, caller-chosen combatantIds for table actors, and rejects/repairs an empty initialCombatants array.",
    executableCoverage:
      "verifyToolContract, verifyBaselineVertical, verifyWidthVertical",
    insufficiency:
      "The schema now describes initialCombatants, characterId, statBlockId, and combatantId entries; list_characters exposes a formal outputSchema for characterId result rows.",
  },
  {
    id: "take-turns-and-resolve-attacks",
    name: "Take turns and resolve attacks",
    userSays: "Run the battle round.",
    agentReads:
      "discover_battle_acts returns the current actor, turn order, acts, subjects, and initial holes. fill_battle_hole requires the exact subject returned by discovery and one fill at a time.",
    agentDecision:
      "It chooses an available act, copies its subject exactly, fills targetChoice, then attackRoll, then rolledDice using the holeIds requested by the runtime. If the result says needsHoles, it continues the same subject; if resolved, it rediscovers or ends turn.",
    executableCoverage: "verifyBaselineVertical and verifyWidthVertical",
    insufficiency:
      "Battle fill shapes are now schema-discoverable. The MCP still intentionally does not roll dice, so the agent needs user-provided rolls, an external roller, or a future dice tool.",
  },
  {
    id: "use-action-surge",
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
    id: "cast-cantrips-and-slotted-spells",
    name: "Cast cantrips and slotted spells",
    userSays: "Cast Ray of Frost, then Magic Missile.",
    agentReads:
      "discover_battle_acts returns action-time spell subjects for wizard spells. Ray of Frost uses targetChoice and attackRoll; Magic Missile uses targetChoice and rolledDice.",
    agentDecision:
      "It resolves Ray of Frost and verifies spellSlots remain unspent, then resolves Magic Missile and verifies one level-1 slot is expended.",
    executableCoverage: "verifyWidthVertical",
    insufficiency:
      "Tool metadata now describes fill shapes, while the exact per-spell fill sequence remains runtime-owned and discoverable from battle act holes.",
  },
  {
    id: "finish-battle-and-inspect-character-state",
    name: "Finish battle and inspect durable character state",
    userSays: "End the battle and show the updated character list.",
    agentReads:
      "end_battle takes empty args and returns endedBattleId, character sessions, and session snapshot. list_characters returns available characters with current HP and spellSlots.",
    agentDecision:
      "It calls end_battle only when no transient fills are pending, then list_characters to show durable HP and Spell Slot expenditure handoff.",
    executableCoverage: "verifyBaselineVertical and verifyWidthVertical",
    insufficiency:
      "Post-battle handoff currently rejects 0 HP characters; the first vertical cannot finish a battle where a character is at 0 HP.",
  },
  {
    id: "recover-from-invalid-or-stale-actions",
    name: "Recover from invalid or stale actions",
    userSays: "Do the thing from earlier.",
    agentReads:
      "MCP rejects stale/unavailable subjects, different-subject fills while pending fills exist, empty character starts, unknown draft ids, duplicate ids, and end_turn/end_battle during pending fills.",
    agentDecision:
      "It reads the error code, rediscovers current holes or battle acts, then retries with the current revision/subject instead of replaying stale input.",
    executableCoverage: "verifyToolContract and verifyBaselineVertical",
    insufficiency:
      "Errors are structured enough to recover, but there is no single 'what should I do next?' field in every response.",
  },
  {
    id: "navigate-result-payloads",
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
    id: "distinguish-known-good-acceptance",
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

export async function verifyToolContract(client: Client) {
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
  assert.match(schemaText, /initialCombatants/);
  assert.match(schemaText, /characterSession/);
  assert.match(schemaText, /statBlockId/);
  assert.doesNotMatch(schemaText, /characterCombatantId/);
  assert.doesNotMatch(schemaText, /additionalCharacters/);
  assert.doesNotMatch(startBattleOutputSchemaText, /battleState/);
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
    initialCombatants: [],
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
  const statBlockIds = (
    get(statBlocks, "statBlocks") as Array<{ statBlockId: string }>
  ).map((statBlock) => statBlock.statBlockId);
  assert.ok(statBlockIds.includes("stat_block_goblin_warrior"));
  assert.ok(statBlockIds.includes("stat_block_skeleton"));
}

export async function verifyBaselineVertical(client: Client) {
  const draftId = "draft:stdio-accepted-orc-soldier-fighter";
  const created = await callTool(client, "create_character_draft", { draftId });
  assert.deepEqual(holeIds(created), [
    "cc:draft:draft.progression.initial",
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
      choiceFill(
        "cc:draft:draft.progression.initial",
        "13:class_fighter:level_1:maximum_hit_die",
      ),
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
    unitHoleId("class_fighter", "class_skill_proficiency_choice"),
    unitHoleId("fighter_fighting_style", "class_feature_feat_choice"),
    unitHoleId("fighter_weapon_mastery", "weapon_mastery_options"),
    unitHoleId("class_fighter", "class_equipment_choice"),
    unitHoleId("background_soldier", "background_ability_score_increase"),
    unitHoleId("background_soldier", "background_tool_choice"),
    unitHoleId("background_soldier", "background_equipment_choice"),
  ]);

  await callTool(client, "fill_creation_holes", {
    draftId,
    expectedRevision: 1,
    fills: [
      choiceFill(
        unitHoleId("class_fighter", "class_skill_proficiency_choice"),
        "perception",
        "survival",
      ),
      choiceFill(
        unitHoleId("fighter_fighting_style", "class_feature_feat_choice"),
        "defense",
      ),
      choiceFill(
        unitHoleId("fighter_weapon_mastery", "weapon_mastery_options"),
        "weapon_longsword",
        "weapon_spear",
        "weapon_flail",
      ),
      choiceFill(
        unitHoleId("class_fighter", "class_equipment_choice"),
        "option_c",
      ),
      choiceFill(
        unitHoleId("background_soldier", "background_ability_score_increase"),
        "two_and_one:str:con",
      ),
      choiceFill(
        unitHoleId("background_soldier", "background_tool_choice"),
        "tool_dice_set",
      ),
      choiceFill(
        unitHoleId("background_soldier", "background_equipment_choice"),
        "option_b",
      ),
    ],
  });
  await callTool(client, "fill_creation_holes", {
    draftId,
    expectedRevision: 2,
    fills: [
      choiceFill(
        unitHoleId("class_fighter", "equipment_purchase"),
        "armor_chain_mail",
        "weapon_longsword",
        "equipment_shield",
      ),
    ],
  });
  await callTool(client, "fill_creation_holes", {
    draftId,
    expectedRevision: 3,
    fills: [
      choiceFill(loadoutHoleId("armor_chain_mail", "armor"), "worn"),
      choiceFill(loadoutHoleId("equipment_shield", "shield"), "wielded"),
      choiceFill(
        loadoutHoleId("weapon_longsword", "weapon"),
        "wielded_one_handed",
      ),
    ],
  });

  const finalized = await callTool(client, "finalize_character", { draftId });
  assert.equal(get(finalized, "finalization.tag"), "ready");

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
    initialCombatants: [
      {
        kind: "characterSession",
        characterId: testCharacterId(draftId),
        combatantId: "fighter",
        initiative: 18,
        side: "party",
      },
      {
        kind: "statBlock",
        statBlockId: "stat_block_goblin_warrior",
        combatantId: "goblin",
        initiative: 7,
        side: "opposition",
        admissionSource: { kind: "encounterParticipant" },
      },
    ],
  });
  assert.deepEqual(get(started, "snapshot.turnOrder"), ["fighter", "goblin"]);
  assert.equal(get(started, "snapshot.currentActorId"), "fighter");

  const read = await callTool(client, "read_battle_state", {});
  assert.equal(get(read, "snapshot.currentActorId"), "fighter");
  assert.deepEqual(
    actionLabels(await callTool(client, "discover_battle_acts", {})),
    [
      "Attack",
      "Attack",
      ...GENERIC_COMBAT_ACTION_LABELS_WITH_SHOVE,
      "Adrenaline Rush",
      "Second Wind",
      "Move",
      "End Turn",
    ],
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
    [
      "Attack",
      "Attack",
      "Attack",
      "Attack",
      ...GENERIC_COMBAT_ACTION_LABELS,
      "Nimble Escape",
      "Move",
      "End Turn",
    ],
  );

  const goblinTarget = await callTool(client, "fill_battle_hole", {
    subject: attackSubject("goblin", "Scimitar"),
    fill: targetFill("fighter"),
  });
  const goblinAttackRoll = (
    get(goblinTarget, "result.holes") as JsonObject[]
  ).find((hole) => hole.kind === "attackRoll");
  assert.ok(goblinAttackRoll);
  await callTool(client, "fill_battle_hole", {
    subject: attackSubject("goblin", "Scimitar"),
    fill: attackRollFill(
      20,
      18,
      typeof goblinAttackRoll.rollMode === "string"
        ? goblinAttackRoll.rollMode
        : undefined,
    ),
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

export async function verifyWidthVertical(client: Client) {
  const fighterDraftId = "draft:stdio-post5-orc-soldier-fighter-two";
  const wizardDraftId = "draft:stdio-post5-elf-soldier-wizard-two";
  await createAndFinalizeFighterTwo(client, fighterDraftId);
  const finalizedWizard = await createAndFinalizeElfWizardTwo(
    client,
    wizardDraftId,
  );
  assert.deepEqual(
    get(
      finalizedWizard,
      "finalization.build.spellcasting.slotPools.spellcasting.slots",
    ),
    [{ count: 3, spellLevel: 1 }],
  );
  assert.equal(
    get(finalizedWizard, "finalization.build.species"),
    "species_elf",
  );
  assert.ok(
    (
      get(
        finalizedWizard,
        "finalization.build.spellcasting.sources.0.cantrips",
      ) as string[]
    ).includes("ray_of_frost"),
  );
  const preparedSpells = get(
    finalizedWizard,
    "finalization.build.spellcasting.sources.0.preparedSpells",
  ) as string[];
  assert.ok(preparedSpells.includes("magic_missile"));
  assert.ok(preparedSpells.includes("shield"));

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
    initialCombatants: [
      {
        kind: "characterSession",
        characterId: testCharacterId(fighterDraftId),
        combatantId: "fighter",
        initiative: 18,
        side: "party",
      },
      {
        kind: "characterSession",
        characterId: testCharacterId(wizardDraftId),
        combatantId: "wizard",
        initiative: 14,
        side: "party",
      },
      statBlockCombatant("skeleton-a", "stat_block_skeleton", 8),
      statBlockCombatant("skeleton-b", "stat_block_skeleton", 7),
      statBlockCombatant("goblin", "stat_block_goblin_warrior", 6),
    ],
  });
  assert.deepEqual(get(started, "snapshot.turnOrder"), [
    "fighter",
    "wizard",
    "skeleton-a",
    "skeleton-b",
    "goblin",
  ]);
  assert.equal(combatantHp(started, "fighter"), 20);
  assert.equal(combatantHp(started, "wizard"), 14);
  assert.equal(combatantHp(started, "skeleton-a"), 13);
  assert.equal(combatantHp(started, "skeleton-b"), 13);
  assert.equal(combatantHp(started, "goblin"), 10);

  assert.deepEqual(
    actionLabels(await callTool(client, "discover_battle_acts", {})),
    [
      "Attack",
      "Attack",
      ...GENERIC_COMBAT_ACTION_LABELS_WITH_HELP_AND_SHOVE,
      "Adrenaline Rush",
      "Second Wind",
      "Action Surge",
      "Move",
      "End Turn",
    ],
  );

  await callTool(client, "fill_battle_hole", {
    subject: attackSubject("fighter", "Flail"),
    fill: targetFill("skeleton-a"),
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
  assert.equal(combatantHp(afterBludgeoning, "skeleton-a"), 5);

  await callTool(client, "resolve_battle_act", {
    subject: {
      tag: "unitFeature",
      actorId: "fighter",
      unitId: "fighter_action_surge",
    },
  });
  await callTool(client, "fill_battle_hole", {
    subject: attackSubject("fighter", "Flail"),
    fill: targetFill("skeleton-a"),
  });
  await callTool(client, "fill_battle_hole", {
    subject: attackSubject("fighter", "Flail"),
    fill: attackRollFill(1, 1),
  });
  assert.equal(combatantHp(afterBludgeoning, "skeleton-a"), 5);

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
    fill: targetFill("skeleton-b"),
  });
  await callTool(client, "fill_battle_hole", {
    subject: magicSubject("wizard", "ray_of_frost"),
    fill: attackRollFill(18, 15),
  });
  const afterRayDamage = await callTool(client, "fill_battle_hole", {
    subject: magicSubject("wizard", "ray_of_frost"),
    fill: rolledDiceFill("battle:spell:damage-result:ray_of_frost:1d8-cold", [
      [4],
    ]),
  });
  assert.deepEqual(wizardSpellSlots(afterRayDamage), [
    { count: 3, expended: 0, spellLevel: 1 },
  ]);
  assert.equal(combatantHp(afterRayDamage, "skeleton-b"), 9);

  assert.equal(
    get(
      await callTool(client, "end_turn", { actorId: "wizard" }),
      "snapshot.currentActorId",
    ),
    "skeleton-a",
  );
  assert.equal(
    get(
      await callTool(client, "end_turn", { actorId: "skeleton-a" }),
      "snapshot.currentActorId",
    ),
    "skeleton-b",
  );

  await callTool(client, "fill_battle_hole", {
    subject: attackSubject("skeleton-b", "Shortsword"),
    fill: targetFill("fighter"),
  });
  await callTool(client, "fill_battle_hole", {
    subject: attackSubject("skeleton-b", "Shortsword"),
    fill: attackRollFill(20, 15),
  });
  const afterSkeletonAttack = await callTool(client, "fill_battle_hole", {
    subject: attackSubject("skeleton-b", "Shortsword"),
    fill: rolledDiceFill("battle:attack:damage-result:1d6+3-piercing", [[1]]),
  });
  assert.equal(combatantHp(afterSkeletonAttack, "fighter"), 16);

  assert.equal(
    get(
      await callTool(client, "end_turn", { actorId: "skeleton-b" }),
      "snapshot.currentActorId",
    ),
    "goblin",
  );
  assert.equal(
    get(
      await callTool(client, "end_turn", { actorId: "goblin" }),
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
    fill: {
      kind: "spellTargetAllocation",
      holeId: "battle:spell:target-allocation:magic_missile",
      value: { allocations: [{ targetId: "skeleton-b", count: 3 }] },
      spatialFacts: [
        {
          kind: "spellTarget",
          casterId: "wizard",
          targetId: "skeleton-b",
          spellId: "magic_missile",
        },
      ],
    },
  });
  const afterMagicMissile = await callTool(client, "fill_battle_hole", {
    subject: magicSubject("wizard", "magic_missile"),
    fill: rolledDiceFill(
      "battle:spell:damage-result:magic_missile:3d4+3-force",
      [[2, 2, 2]],
    ),
  });
  assert.equal(get(afterMagicMissile, "result.tag"), "resolved");
  assert.equal(combatantHp(afterMagicMissile, "skeleton-b"), 0);
  assert.deepEqual(wizardSpellSlots(afterMagicMissile), [
    { count: 3, expended: 1, spellLevel: 1 },
  ]);

  const ended = await callTool(client, "end_battle", {});
  const characterIds = get(ended, "session.characterIds") as string[];
  assert.ok(characterIds.includes(testCharacterId(fighterDraftId)));
  assert.ok(characterIds.includes(testCharacterId(wizardDraftId)));
  const listed = await callTool(client, "list_characters", {});
  const fighter = characterRow(listed, testCharacterId(fighterDraftId));
  const wizard = characterRow(listed, testCharacterId(wizardDraftId));
  assert.equal(get(fighter, "hitPoints.current"), 16);
  assert.equal(get(fighter, "hitPoints.maximum"), 20);
  assert.equal(get(wizard, "hitPoints.current"), 14);
  assert.deepEqual(get(wizard, "spellSlots"), [
    { count: 3, expended: 1, spellLevel: 1 },
  ]);
}

export async function verifyLevelThreeWizardVertical(client: Client) {
  const wizardDraftId = "draft:stdio-level-three-elf-soldier-wizard";
  const finalizedWizard = await createAndFinalizeElfWizardThree(
    client,
    wizardDraftId,
  );
  assert.deepEqual(
    get(
      finalizedWizard,
      "finalization.build.spellcasting.slotPools.spellcasting.slots",
    ),
    [
      { count: 4, spellLevel: 1 },
      { count: 2, spellLevel: 2 },
    ],
  );
  assert.equal(
    get(finalizedWizard, "finalization.build.species"),
    "species_elf",
  );
  assert.ok(
    stringArrayAt(
      finalizedWizard,
      "finalization.build.spellcasting.sources.0.spellbook",
    ).includes("scorching_ray"),
  );
  assert.ok(
    stringArrayAt(
      finalizedWizard,
      "finalization.build.spellcasting.sources.0.preparedSpells",
    ).includes("scorching_ray"),
  );

  const listedBeforeBattle = await callTool(client, "list_characters", {});
  assert.deepEqual(
    get(
      characterRow(listedBeforeBattle, testCharacterId(wizardDraftId)),
      "spellSlots",
    ),
    [
      { count: 4, expended: 0, spellLevel: 1 },
      { count: 2, expended: 0, spellLevel: 2 },
    ],
  );

  const selected = await callTool(client, "select_stat_block", {
    statBlockId: "stat_block_sphinx_of_wonder",
  });
  assert.equal(
    get(selected, "selectedStatBlock.statBlock.displayName"),
    "Sphinx of Wonder",
  );

  const started = await callTool(client, "start_battle", {
    battleId: "battle:stdio-level-three-scorching-ray",
    initialCombatants: [
      {
        kind: "characterSession",
        characterId: testCharacterId(wizardDraftId),
        combatantId: "wizard-level-3",
        initiative: 16,
        side: "party",
      },
      statBlockCombatant("sphinx", "stat_block_sphinx_of_wonder", 8),
    ],
  });
  assert.deepEqual(get(started, "snapshot.turnOrder"), [
    "wizard-level-3",
    "sphinx",
  ]);
  assert.deepEqual(wizardSpellSlotsFor(started, "wizard-level-3"), [
    { count: 4, expended: 0, spellLevel: 1 },
    { count: 2, expended: 0, spellLevel: 2 },
  ]);

  const wizardActs = await callTool(client, "discover_battle_acts", {});
  const scorchingRayAct = battleActByLabel(wizardActs, "Scorching Ray");
  assert.ok(scorchingRayAct, "Missing Scorching Ray act");
  const targetHoles = initialHolesOfKind(scorchingRayAct, "targetChoice");
  assert.equal(targetHoles.length, 3);
  const scorchingRaySubject = spellSlotSubject(
    "wizard-level-3",
    "scorching_ray",
    2,
    "spellAttackSequence",
  );

  let pendingScorchingRay = wizardActs;
  for (const hole of targetHoles) {
    pendingScorchingRay = await callTool(client, "fill_battle_hole", {
      subject: scorchingRaySubject,
      fill: spellTargetFill(
        hole.holeId,
        "wizard-level-3",
        "scorching_ray",
        "sphinx",
      ),
    });
  }

  let next = await fillAttackSequencePart(client, {
    subject: scorchingRaySubject,
    pending: pendingScorchingRay,
    partIndex: 0,
    attackTotal: 18,
    naturalD20: 13,
    damageRolls: [3, 4],
  });
  assert.equal(combatantHp(next, "sphinx"), 32);
  next = await fillAttackSequencePart(client, {
    subject: scorchingRaySubject,
    pending: next,
    partIndex: 1,
    attackTotal: 17,
    naturalD20: 12,
    damageRolls: [2, 3],
  });
  assert.equal(combatantHp(next, "sphinx"), 27);
  next = await fillAttackSequencePart(client, {
    subject: scorchingRaySubject,
    pending: next,
    partIndex: 2,
    attackTotal: 16,
    naturalD20: 11,
    damageRolls: [1, 1],
  });
  assert.equal(get(next, "result.tag"), "resolved");
  assert.deepEqual(wizardSpellSlotsFor(next, "wizard-level-3"), [
    { count: 4, expended: 0, spellLevel: 1 },
    { count: 2, expended: 1, spellLevel: 2 },
  ]);

  const ended = await callTool(client, "end_battle", {});
  assert.equal(
    get(ended, "endedBattleId"),
    "battle:stdio-level-three-scorching-ray",
  );
  const listedAfterBattle = await callTool(client, "list_characters", {});
  const wizard = characterRow(
    listedAfterBattle,
    testCharacterId(wizardDraftId),
  );
  assert.equal(get(wizard, "displayName"), "Elf Soldier Wizard 3");
  assert.deepEqual(get(wizard, "spellSlots"), [
    { count: 4, expended: 0, spellLevel: 1 },
    { count: 2, expended: 1, spellLevel: 2 },
  ]);
}

export async function verifyLevelFourWizardVertical(client: Client) {
  const workflow = await callTool(client, "describe_mcp_workflow", {});
  assert.equal(get(workflow, "resultPaths.creationHoles"), "holes");
  assert.equal(
    get(workflow, "resultPaths.draftRevision"),
    "draft.revision or storedDraft.revision",
  );

  const units = await callTool(client, "list_catalog_units", {});
  assert.ok(
    unitSummaries(units, "class").some((unit) => unit.id === "class_wizard"),
  );
  assert.ok(
    unitSummaries(units, "class_feature").some(
      (unit) => unit.id === "wizard_ability_score_improvement_l4",
    ),
  );

  const wizardDraftId = "draft:stdio-level-four-elf-soldier-wizard";
  const finalizedWizard = await createAndFinalizeElfWizardFour(
    client,
    wizardDraftId,
  );
  assert.equal(get(finalizedWizard, "finalization.tag"), "ready");
  assert.deepEqual(get(finalizedWizard, "finalization.build.abilityScores"), {
    str: 10,
    dex: 14,
    con: 14,
    int: 17,
    wis: 10,
    cha: 12,
  });
  assert.deepEqual(
    get(
      finalizedWizard,
      "finalization.build.spellcasting.slotPools.spellcasting.slots",
    ),
    [
      { count: 4, spellLevel: 1 },
      { count: 3, spellLevel: 2 },
    ],
  );
  assert.ok(
    jsonObjectArrayAt(finalizedWizard, "finalization.build.features").some(
      (feature) =>
        feature.kind === "selectedClassChoice" &&
        feature.selectedFromUnitId === "wizard_ability_score_improvement_l4" &&
        feature.unitId === "feat_ability_score_improvement",
    ),
  );

  const listedBeforeBattle = await callTool(client, "list_characters", {});
  const wizard = characterRow(
    listedBeforeBattle,
    testCharacterId(wizardDraftId),
  );
  assert.equal(get(wizard, "displayName"), "Elf Soldier Wizard 4");
  assert.equal(get(wizard, "hitPoints.current"), 26);
  assert.equal(get(wizard, "hitPoints.maximum"), 26);
  assert.deepEqual(get(wizard, "build.abilityScores"), {
    str: 10,
    dex: 14,
    con: 14,
    int: 17,
    wis: 10,
    cha: 12,
  });
  assert.deepEqual(get(wizard, "spellSlots"), [
    { count: 4, expended: 0, spellLevel: 1 },
    { count: 3, expended: 0, spellLevel: 2 },
  ]);

  const started = await callTool(client, "start_battle", {
    battleId: "battle:stdio-level-four-wizard-asi",
    initialCombatants: [
      {
        kind: "characterSession",
        characterId: testCharacterId(wizardDraftId),
        combatantId: "wizard-level-4",
        initiative: 16,
        side: "party",
      },
      statBlockCombatant("sphinx", "stat_block_sphinx_of_wonder", 8),
    ],
  });
  assert.deepEqual(get(started, "snapshot.turnOrder"), [
    "wizard-level-4",
    "sphinx",
  ]);
  assert.deepEqual(wizardSpellSlotsFor(started, "wizard-level-4"), [
    { count: 4, expended: 0, spellLevel: 1 },
    { count: 3, expended: 0, spellLevel: 2 },
  ]);

  const wizardActs = await callTool(client, "discover_battle_acts", {});
  assert.ok(battleActByLabel(wizardActs, "Scorching Ray"));
}

export async function verifyLevelFiveWizardFireballSheetScenario(
  client: Client,
) {
  const workflow = await callTool(client, "describe_mcp_workflow", {});
  assert.equal(get(workflow, "resultPaths.creationHoles"), "holes");
  assert.equal(
    get(workflow, "resultPaths.draftRevision"),
    "draft.revision or storedDraft.revision",
  );

  const units = await callTool(client, "list_catalog_units", {});
  assert.ok(
    unitSummaries(units, "class").some((unit) => unit.id === "class_wizard"),
  );
  assert.ok(
    unitSummaries(units, "spell").some((unit) => unit.id === "fireball"),
  );

  const finalizedWizard = await createAndFinalizeElfWizardFive(
    client,
    levelFiveWizardFireballDraftId,
  );
  assert.equal(get(finalizedWizard, "finalization.tag"), "ready");
  assert.equal(
    get(finalizedWizard, "finalization.build.species"),
    "species_elf",
  );
  assert.deepEqual(
    get(
      finalizedWizard,
      "finalization.build.spellcasting.slotPools.spellcasting.slots",
    ),
    levelFiveWizardSlotCapacities,
  );
  assert.ok(
    stringArrayAt(
      finalizedWizard,
      "finalization.build.spellcasting.sources.0.spellbook",
    ).includes("fireball"),
  );
  assert.ok(
    stringArrayAt(
      finalizedWizard,
      "finalization.build.spellcasting.sources.0.preparedSpells",
    ).includes("fireball"),
  );

  const listedBeforeBattle = await callTool(client, "list_characters", {});
  const wizard = characterRow(
    listedBeforeBattle,
    testCharacterId(levelFiveWizardFireballDraftId),
  );
  assert.equal(get(wizard, "displayName"), "Elf Soldier Wizard 5");
  assert.equal(get(wizard, "hitPoints.current"), 32);
  assert.equal(get(wizard, "hitPoints.maximum"), 32);
  assert.ok(
    stringArrayAt(wizard, "build.spellcasting.sources.0.spellbook").includes(
      "fireball",
    ),
  );
  assert.ok(
    stringArrayAt(
      wizard,
      "build.spellcasting.sources.0.preparedSpells",
    ).includes("fireball"),
  );
  assert.deepEqual(
    get(wizard, "spellSlots"),
    levelFiveWizardUnexpendedSpellSlots,
  );
}

export async function verifyLevelFiveWizardFireballBattleHandoff(
  client: Client,
) {
  const workflow = await callTool(client, "describe_mcp_workflow", {});
  assert.equal(get(workflow, "resultPaths.battleActs"), "snapshot.acts");
  assert.equal(
    get(workflow, "resultPaths.battleCombatants"),
    "snapshot.combatants",
  );

  const units = await callTool(client, "list_catalog_units", {});
  assert.ok(
    unitSummaries(units, "spell").some((unit) => unit.id === "fireball"),
  );

  const finalizedWizard = await createAndFinalizeElfWizardFive(
    client,
    levelFiveWizardFireballDraftId,
  );
  assert.equal(get(finalizedWizard, "finalization.tag"), "ready");

  const listedBeforeBattle = await callTool(client, "list_characters", {});
  assert.deepEqual(
    get(
      characterRow(
        listedBeforeBattle,
        testCharacterId(levelFiveWizardFireballDraftId),
      ),
      "spellSlots",
    ),
    levelFiveWizardUnexpendedSpellSlots,
  );

  const selected = await callTool(client, "select_stat_block", {
    statBlockId: "stat_block_sphinx_of_wonder",
  });
  assert.equal(
    get(selected, "selectedStatBlock.statBlock.displayName"),
    "Sphinx of Wonder",
  );

  const started = await callTool(client, "start_battle", {
    battleId: levelFiveWizardFireballBattleId,
    initialCombatants: [
      {
        kind: "characterSession",
        characterId: testCharacterId(levelFiveWizardFireballDraftId),
        combatantId: levelFiveWizardFireballCombatantId,
        initiative: 16,
        side: "party",
      },
      statBlockCombatant("sphinx", "stat_block_sphinx_of_wonder", 8),
    ],
  });
  assert.equal(
    get(started, "snapshot.battleId"),
    levelFiveWizardFireballBattleId,
  );
  assert.deepEqual(get(started, "snapshot.turnOrder"), [
    levelFiveWizardFireballCombatantId,
    "sphinx",
  ]);
  assert.deepEqual(
    wizardSpellSlotsFor(started, levelFiveWizardFireballCombatantId),
    levelFiveWizardUnexpendedSpellSlots,
  );

  const wizardActs = await callTool(client, "discover_battle_acts", {});
  assert.equal(
    get(wizardActs, "snapshot.currentActorId"),
    levelFiveWizardFireballCombatantId,
  );
  const fireballAct = battleActByLabel(wizardActs, "Fireball");
  assert.ok(fireballAct, "Missing Fireball act");
  const savingThrowHole = singleInitialHoleOfKind(
    fireballAct,
    "savingThrowOutcome",
  );

  const afterSavingThrow = await callTool(client, "fill_battle_hole", {
    subject: fireballAct.subject,
    fill: {
      kind: "savingThrowOutcome",
      holeId: savingThrowHole.holeId,
      value: {
        area: {
          kind: "fireballArea",
          originAnchorId: "sphinx",
          affectedTargetIds: ["sphinx"],
          objectIgnitionFacts: [],
        },
        outcomes: [{ targetId: "sphinx", succeeded: false }],
      },
    },
  });
  assert.equal(get(afterSavingThrow, "result.tag"), "needsHoles");
  const damageHole = resultHole(afterSavingThrow, "rolledDice");
  const afterDamage = await callTool(client, "fill_battle_hole", {
    subject: fireballAct.subject,
    fill: rolledDiceFill(damageHole.holeId, [[4, 4, 4, 4, 3, 3, 3, 3]]),
  });
  assert.equal(get(afterDamage, "result.tag"), "resolved");
  assert.deepEqual(
    wizardSpellSlotsFor(afterDamage, levelFiveWizardFireballCombatantId),
    levelFiveWizardAfterFireballSpellSlots,
  );
}

async function createAndFinalizeFighterTwo(client: Client, draftId: string) {
  await callTool(client, "create_character_draft", { draftId });
  await fillBaseOrcSoldier(
    client,
    draftId,
    "13:class_fighter|13:class_fighter:level_2:fixed_hp_gain",
    {
      str: 15,
      dex: 14,
      con: 13,
      int: 8,
      wis: 10,
      cha: 12,
    },
  );
  await callTool(client, "fill_creation_holes", {
    draftId,
    expectedRevision: 1,
    fills: [
      choiceFill(
        unitHoleId("class_fighter", "class_skill_proficiency_choice"),
        "perception",
        "survival",
      ),
      choiceFill(
        unitHoleId("fighter_fighting_style", "class_feature_feat_choice"),
        "defense",
      ),
      choiceFill(
        unitHoleId("fighter_weapon_mastery", "weapon_mastery_options"),
        "weapon_longsword",
        "weapon_spear",
        "weapon_flail",
      ),
      choiceFill(
        unitHoleId("class_fighter", "class_equipment_choice"),
        "option_c",
      ),
      choiceFill(
        unitHoleId("background_soldier", "background_ability_score_increase"),
        "two_and_one:str:con",
      ),
      choiceFill(
        unitHoleId("background_soldier", "background_tool_choice"),
        "tool_dice_set",
      ),
      choiceFill(
        unitHoleId("background_soldier", "background_equipment_choice"),
        "option_b",
      ),
    ],
  });
  await callTool(client, "fill_creation_holes", {
    draftId,
    expectedRevision: 2,
    fills: [
      choiceFill(
        unitHoleId("class_fighter", "equipment_purchase"),
        "armor_chain_mail",
        "weapon_flail",
        "equipment_shield",
      ),
    ],
  });
  await callTool(client, "fill_creation_holes", {
    draftId,
    expectedRevision: 3,
    fills: [
      choiceFill(loadoutHoleId("armor_chain_mail", "armor"), "worn"),
      choiceFill(loadoutHoleId("equipment_shield", "shield"), "wielded"),
      choiceFill(loadoutHoleId("weapon_flail", "weapon"), "wielded_one_handed"),
    ],
  });
  return callTool(client, "finalize_character", { draftId });
}

async function createAndFinalizeElfWizardTwo(client: Client, draftId: string) {
  await callTool(client, "create_character_draft", { draftId });
  await fillBaseCharacter(client, draftId, {
    progression: "12:class_wizard|12:class_wizard:level_2:fixed_hp_gain",
    species: "species_elf",
    abilityScores: {
      str: 8,
      dex: 14,
      con: 13,
      int: 15,
      wis: 10,
      cha: 12,
    },
  });
  await callTool(client, "fill_creation_holes", {
    draftId,
    expectedRevision: 1,
    fills: [
      choiceFill(
        unitHoleId("class_wizard", "class_skill_proficiency_choice"),
        "arcana",
        "history",
      ),
      choiceFill(
        unitHoleId("class_wizard", "wizard_cantrip_choices"),
        "light",
        "fire_bolt",
        "ray_of_frost",
      ),
      choiceFill(
        unitHoleId("class_wizard", "wizard_spellbook_choices"),
        "detect_magic",
        "mage_armor",
        "magic_missile",
        "shield",
        "sleep",
        "thunderwave",
        "chromatic_orb",
        "feather_fall",
      ),
      choiceFill(
        unitHoleId("class_wizard", "wizard_prepared_spell_choices"),
        "mage_armor",
        "magic_missile",
        "shield",
        "thunderwave",
        "chromatic_orb",
      ),
      choiceFill(
        unitHoleId("background_soldier", "background_ability_score_increase"),
        "two_and_one:str:con",
      ),
      choiceFill(
        unitHoleId("background_soldier", "background_tool_choice"),
        "tool_dice_set",
      ),
      choiceFill(
        unitHoleId("class_wizard", "class_equipment_choice"),
        "option_b",
      ),
      choiceFill(
        unitHoleId("background_soldier", "background_equipment_choice"),
        "option_b",
      ),
    ],
  });
  await callTool(client, "fill_creation_holes", {
    draftId,
    expectedRevision: 2,
    fills: [
      choiceFill(
        unitHoleId("class_wizard", "equipment_purchase"),
        "weapon_longsword",
        "weapon_dagger",
        "equipment_shield",
      ),
    ],
  });
  await callTool(client, "fill_creation_holes", {
    draftId,
    expectedRevision: 3,
    fills: [
      choiceFill(loadoutHoleId("equipment_shield", "shield"), "wielded"),
      choiceFill(
        loadoutHoleId("weapon_longsword", "weapon"),
        "wielded_one_handed",
      ),
    ],
  });
  await callTool(client, "fill_creation_holes", {
    draftId,
    expectedRevision: 4,
    fills: [
      choiceFill(
        unitHoleId("wizard_scholar", "class_feature_proficiency_choice"),
        "arcana",
      ),
    ],
  });
  return callTool(client, "finalize_character", { draftId });
}

async function createAndFinalizeElfWizardThree(
  client: Client,
  draftId: string,
) {
  await callTool(client, "create_character_draft", { draftId });
  await fillBaseCharacter(client, draftId, {
    progression:
      "12:class_wizard|12:class_wizard|12:class_wizard:level_3:fixed_hp_gain",
    species: "species_elf",
    abilityScores: {
      str: 8,
      dex: 14,
      con: 13,
      int: 15,
      wis: 10,
      cha: 12,
    },
  });

  const choices = await callTool(client, "discover_creation_holes", {
    draftId,
  });
  assert.ok(
    holeIds(choices).includes(
      unitHoleId("class_wizard", "class_subclass_choice"),
    ),
  );
  assert.ok(
    holeIds(choices).includes(
      unitHoleId("class_wizard", "wizard_spellbook_choices"),
    ),
  );
  assert.ok(
    holeIds(choices).includes(
      unitHoleId("class_wizard", "wizard_prepared_spell_choices"),
    ),
  );

  await callTool(client, "fill_creation_holes", {
    draftId,
    expectedRevision: 1,
    fills: [
      choiceFill(
        unitHoleId("class_wizard", "class_skill_proficiency_choice"),
        "arcana",
        "history",
      ),
      choiceFill(
        unitHoleId("class_wizard", "class_subclass_choice"),
        "subclass_wizard_evoker",
      ),
      choiceFill(
        unitHoleId("class_wizard", "wizard_cantrip_choices"),
        "light",
        "fire_bolt",
        "ray_of_frost",
      ),
      choiceFill(
        unitHoleId("class_wizard", "wizard_spellbook_choices"),
        "detect_magic",
        "mage_armor",
        "magic_missile",
        "shield",
        "sleep",
        "thunderwave",
        "chromatic_orb",
        "scorching_ray",
        "mirror_image",
        "misty_step",
      ),
      choiceFill(
        unitHoleId("class_wizard", "wizard_prepared_spell_choices"),
        "mage_armor",
        "magic_missile",
        "shield",
        "chromatic_orb",
        "scorching_ray",
        "misty_step",
      ),
      choiceFill(
        unitHoleId("background_soldier", "background_ability_score_increase"),
        "two_and_one:str:con",
      ),
      choiceFill(
        unitHoleId("background_soldier", "background_tool_choice"),
        "tool_dice_set",
      ),
      choiceFill(
        unitHoleId("class_wizard", "class_equipment_choice"),
        "option_b",
      ),
      choiceFill(
        unitHoleId("background_soldier", "background_equipment_choice"),
        "option_b",
      ),
    ],
  });

  const evocationSavantChoices = await callTool(
    client,
    "discover_creation_holes",
    { draftId },
  );
  assert.ok(
    holeIds(evocationSavantChoices).includes(
      unitHoleId("wizard_evocation_savant", "wizard_spellbook_choices"),
    ),
  );
  await callTool(client, "fill_creation_holes", {
    draftId,
    expectedRevision: 2,
    fills: [
      choiceFill(
        unitHoleId("wizard_evocation_savant", "wizard_spellbook_choices"),
        "continual_flame",
        "shatter",
      ),
    ],
  });
  await callTool(client, "fill_creation_holes", {
    draftId,
    expectedRevision: 3,
    fills: [
      choiceFill(
        unitHoleId("class_wizard", "equipment_purchase"),
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
      choiceFill(loadoutHoleId("equipment_shield", "shield"), "wielded"),
      choiceFill(
        loadoutHoleId("weapon_longsword", "weapon"),
        "wielded_one_handed",
      ),
    ],
  });
  await callTool(client, "fill_creation_holes", {
    draftId,
    expectedRevision: 5,
    fills: [
      choiceFill(
        unitHoleId("wizard_scholar", "class_feature_proficiency_choice"),
        "arcana",
      ),
    ],
  });
  return callTool(client, "finalize_character", { draftId });
}

async function createAndFinalizeElfWizardFour(client: Client, draftId: string) {
  return createAndFinalizeElfSoldierWizardWithAsi(client, draftId, {
    progressionOptionId: levelFourWizardProgressionOptionId,
    wizardSpellbookOptionIds: [
      "detect_magic",
      "mage_armor",
      "magic_missile",
      "shield",
      "sleep",
      "thunderwave",
      "chromatic_orb",
      "scorching_ray",
      "mirror_image",
      "misty_step",
      "acid_arrow",
      "shatter",
    ],
    wizardPreparedSpellOptionIds: [
      "mage_armor",
      "magic_missile",
      "shield",
      "chromatic_orb",
      "scorching_ray",
      "misty_step",
      "acid_arrow",
    ],
  });
}

async function createAndFinalizeElfWizardFive(client: Client, draftId: string) {
  return createAndFinalizeElfSoldierWizardWithAsi(client, draftId, {
    progressionOptionId: levelFiveWizardProgressionOptionId,
    wizardSpellbookOptionIds: [
      "detect_magic",
      "mage_armor",
      "magic_missile",
      "shield",
      "sleep",
      "thunderwave",
      "chromatic_orb",
      "scorching_ray",
      "mirror_image",
      "misty_step",
      "acid_arrow",
      "shatter",
      "fireball",
      "lightning_bolt",
    ],
    wizardPreparedSpellOptionIds: [
      "mage_armor",
      "magic_missile",
      "shield",
      "chromatic_orb",
      "scorching_ray",
      "misty_step",
      "acid_arrow",
      "fireball",
      "lightning_bolt",
    ],
  });
}

async function createAndFinalizeElfSoldierWizardWithAsi(
  client: Client,
  draftId: string,
  input: {
    readonly progressionOptionId: string;
    readonly wizardSpellbookOptionIds: readonly string[];
    readonly wizardPreparedSpellOptionIds: readonly string[];
  },
) {
  const created = await callTool(client, "create_character_draft", { draftId });
  const createdRevision = returnedDraftRevision(created);
  const initialFill = await callTool(client, "fill_creation_holes", {
    draftId,
    expectedRevision: createdRevision,
    fills: [
      choiceFillFromReturnedHole(
        created,
        "cc:draft:draft.progression.initial",
        input.progressionOptionId,
      ),
      choiceFillFromReturnedHole(
        created,
        "cc:draft:draft.background",
        "background_soldier",
      ),
      choiceFillFromReturnedHole(
        created,
        "cc:draft:draft.species",
        "species_elf",
      ),
      {
        kind: "abilityScores",
        holeId: "cc:draft:draft.abilityScoreGeneration",
        method: "standardArray",
        value: {
          str: 8,
          dex: 14,
          con: 13,
          int: 15,
          wis: 10,
          cha: 12,
        },
      },
      choiceFillFromReturnedHole(
        created,
        "cc:draft:draft.languages",
        "Dwarvish",
        "Goblin",
      ),
      choiceFillFromReturnedHole(
        created,
        "cc:draft:draft.alignment",
        "lawful_good",
      ),
    ],
  });
  const afterInitialRevision = acceptedFillDraftRevision(initialFill);

  const classChoices = await callTool(client, "discover_creation_holes", {
    draftId,
  });
  assert.equal(returnedDraftRevision(classChoices), afterInitialRevision);
  assert.deepEqual(holeIds(classChoices), [
    unitHoleId("class_wizard", "class_skill_proficiency_choice"),
    unitHoleId(
      "wizard_ability_score_improvement_l4",
      "class_feature_feat_choice",
    ),
    unitHoleId("class_wizard", "class_subclass_choice"),
    unitHoleId("class_wizard", "class_equipment_choice"),
    unitHoleId("class_wizard", "wizard_cantrip_choices"),
    unitHoleId("class_wizard", "wizard_spellbook_choices"),
    unitHoleId("class_wizard", "wizard_prepared_spell_choices"),
    unitHoleId("background_soldier", "background_ability_score_increase"),
    unitHoleId("background_soldier", "background_tool_choice"),
    unitHoleId("background_soldier", "background_equipment_choice"),
  ]);

  const classFill = await callTool(client, "fill_creation_holes", {
    draftId,
    expectedRevision: returnedDraftRevision(classChoices),
    fills: [
      choiceFillFromReturnedHole(
        classChoices,
        unitHoleId("class_wizard", "class_skill_proficiency_choice"),
        "arcana",
        "history",
      ),
      choiceFillFromReturnedHole(
        classChoices,
        unitHoleId(
          "wizard_ability_score_improvement_l4",
          "class_feature_feat_choice",
        ),
        "feat_ability_score_improvement",
      ),
      choiceFillFromReturnedHole(
        classChoices,
        unitHoleId("class_wizard", "class_subclass_choice"),
        "subclass_wizard_evoker",
      ),
      choiceFillFromReturnedHole(
        classChoices,
        unitHoleId("class_wizard", "wizard_cantrip_choices"),
        "light",
        "fire_bolt",
        "ray_of_frost",
        "minor_illusion",
      ),
      choiceFillFromReturnedHole(
        classChoices,
        unitHoleId("class_wizard", "wizard_spellbook_choices"),
        ...input.wizardSpellbookOptionIds,
      ),
      choiceFillFromReturnedHole(
        classChoices,
        unitHoleId("class_wizard", "wizard_prepared_spell_choices"),
        ...input.wizardPreparedSpellOptionIds,
      ),
      choiceFillFromReturnedHole(
        classChoices,
        unitHoleId("background_soldier", "background_ability_score_increase"),
        "two_and_one:str:con",
      ),
      choiceFillFromReturnedHole(
        classChoices,
        unitHoleId("background_soldier", "background_tool_choice"),
        "tool_dice_set",
      ),
      choiceFillFromReturnedHole(
        classChoices,
        unitHoleId("class_wizard", "class_equipment_choice"),
        "option_b",
      ),
      choiceFillFromReturnedHole(
        classChoices,
        unitHoleId("background_soldier", "background_equipment_choice"),
        "option_b",
      ),
    ],
  });
  const afterClassRevision = acceptedFillDraftRevision(classFill);

  const featureChoices = await callTool(client, "discover_creation_holes", {
    draftId,
  });
  assert.equal(returnedDraftRevision(featureChoices), afterClassRevision);
  assert.deepEqual(holeIds(featureChoices), [
    unitHoleId("wizard_scholar", "class_feature_proficiency_choice"),
    unitHoleId("wizard_evocation_savant", "wizard_spellbook_choices"),
    unitHoleId(
      "wizard_ability_score_improvement_l4",
      "class_feature_ability_score_increase_choice",
    ),
    unitHoleId("class_wizard", "equipment_purchase"),
  ]);
  const featureFill = await callTool(client, "fill_creation_holes", {
    draftId,
    expectedRevision: returnedDraftRevision(featureChoices),
    fills: [
      choiceFillFromReturnedHole(
        featureChoices,
        unitHoleId("wizard_scholar", "class_feature_proficiency_choice"),
        "arcana",
      ),
      choiceFillFromReturnedHole(
        featureChoices,
        unitHoleId("wizard_evocation_savant", "wizard_spellbook_choices"),
        "continual_flame",
        "darkness",
      ),
      choiceFillFromReturnedHole(
        featureChoices,
        unitHoleId(
          "wizard_ability_score_improvement_l4",
          "class_feature_ability_score_increase_choice",
        ),
        "ability_score:int:+2:max20",
      ),
      choiceFillFromReturnedHole(
        featureChoices,
        unitHoleId("class_wizard", "equipment_purchase"),
        "weapon_longsword",
        "weapon_dagger",
        "equipment_shield",
      ),
    ],
  });
  const afterFeatureRevision = acceptedFillDraftRevision(featureFill);

  const loadoutChoices = await callTool(client, "discover_creation_holes", {
    draftId,
  });
  assert.equal(returnedDraftRevision(loadoutChoices), afterFeatureRevision);
  assert.deepEqual(holeIds(loadoutChoices), [
    loadoutHoleId("equipment_shield", "shield"),
    loadoutHoleId("weapon_longsword", "weapon"),
  ]);
  const loadoutFill = await callTool(client, "fill_creation_holes", {
    draftId,
    expectedRevision: returnedDraftRevision(loadoutChoices),
    fills: [
      choiceFillFromReturnedHole(
        loadoutChoices,
        loadoutHoleId("equipment_shield", "shield"),
        "wielded",
      ),
      choiceFillFromReturnedHole(
        loadoutChoices,
        loadoutHoleId("weapon_longsword", "weapon"),
        "wielded_one_handed",
      ),
    ],
  });
  const afterLoadoutRevision = acceptedFillDraftRevision(loadoutFill);

  const complete = await callTool(client, "discover_creation_holes", {
    draftId,
  });
  assert.equal(returnedDraftRevision(complete), afterLoadoutRevision);
  assert.deepEqual(holeIds(complete), []);
  return callTool(client, "finalize_character", { draftId });
}

async function fillBaseOrcSoldier(
  client: Client,
  draftId: string,
  progression: string,
  abilityScores: JsonObject,
) {
  await fillBaseCharacter(client, draftId, {
    progression,
    species: "species_orc",
    abilityScores,
  });
}

async function fillBaseCharacter(
  client: Client,
  draftId: string,
  input: {
    readonly progression: string;
    readonly species: string;
    readonly abilityScores: JsonObject;
  },
) {
  await callTool(client, "fill_creation_holes", {
    draftId,
    expectedRevision: 0,
    fills: [
      choiceFill("cc:draft:draft.progression.initial", input.progression),
      choiceFill("cc:draft:draft.background", "background_soldier"),
      choiceFill("cc:draft:draft.species", input.species),
      {
        kind: "abilityScores",
        holeId: "cc:draft:draft.abilityScoreGeneration",
        method: "standardArray",
        value: input.abilityScores,
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

function choiceFillFromReturnedHole(
  payload: JsonObject,
  holeId: string,
  ...optionIds: readonly string[]
) {
  const hole = returnedChoiceHole(payload, holeId);
  const returnedOptionIds = new Set(
    hole.options.map((option) => option.optionId),
  );
  for (const optionId of optionIds) {
    assert.ok(
      returnedOptionIds.has(optionId),
      `Expected returned hole ${holeId} to include option ${optionId}`,
    );
  }
  return choiceFill(hole.holeId, ...optionIds);
}

function returnedChoiceHole(payload: JsonObject, holeId: string) {
  const holes = jsonObjectArrayAt(payload, "holes");
  const hole = holes.find((candidate) => candidate.holeId === holeId);
  assert.ok(hole, `Expected returned creation hole ${holeId}`);
  assert.equal(hole.kind, "choice");
  const options = jsonObjectArrayAt(hole, "options");
  return {
    holeId: parseString(hole.holeId, `${holeId}.holeId`),
    options: options.map((option, index) => ({
      optionId: parseString(
        get(option, "optionId"),
        `${holeId}.options.${index}.optionId`,
      ),
    })),
  };
}

function choiceFill(holeId: string, ...optionIds: readonly string[]) {
  return { kind: "choice", holeId, optionIds };
}

function acceptedFillDraftRevision(payload: JsonObject) {
  assert.equal(get(payload, "result.tag"), "accepted");
  return returnedDraftRevision(payload);
}

function returnedDraftRevision(payload: JsonObject) {
  const revision =
    get(payload, "storedDraft.revision") ?? get(payload, "draft.revision");
  assert.equal(typeof revision, "number");
  return revision;
}

function attackSubject(actorId: string, attackName: string) {
  return { tag: "action", actorId, action: "attack", attackName };
}

function statBlockCombatant(
  combatantId: string,
  statBlockId: string,
  initiative: number,
) {
  return {
    kind: "statBlock",
    statBlockId,
    combatantId,
    initiative,
    side: "opposition",
    admissionSource: { kind: "encounterParticipant" },
  };
}

function magicSubject(actorId: string, spellId: string) {
  if (spellId === "magic_missile") {
    return spellSlotSubject(actorId, spellId, 1, "repeatedDamageAllocation");
  }
  return {
    tag: "actionSpell",
    actorId,
    invocation: { tag: "cantrip", spellId, procedure: "spellAttackDamage" },
    mode: { tag: "cast" },
  };
}

function spellSlotSubject(
  actorId: string,
  spellId: string,
  slotLevel: number,
  procedure:
    | "repeatedDamageAllocation"
    | "spellAttackDamage"
    | "spellAttackSequence",
) {
  return {
    tag: "actionSpell",
    actorId,
    invocation: {
      tag: "spellSlot",
      spellId,
      slotLevel,
      procedure,
    },
    mode: { tag: "cast" },
  };
}

function targetFill(value: string) {
  return {
    kind: "targetChoice",
    holeId: "battle:attack:target",
    value,
    spatialFacts: [
      {
        kind: "attackTargetInMeleeReach",
        actorId: "fighter",
        targetId: value,
        attackName: "Longsword",
      },
      {
        kind: "attackTargetInMeleeReach",
        actorId: "fighter",
        targetId: value,
        attackName: "Flail",
      },
      {
        kind: "attackTargetInMeleeReach",
        actorId: "goblin",
        targetId: value,
        attackName: "Scimitar",
      },
      {
        kind: "attackTargetInMeleeReach",
        actorId: "skeleton-a",
        targetId: value,
        attackName: "Shortsword",
      },
      {
        kind: "attackTargetInMeleeReach",
        actorId: "skeleton-b",
        targetId: value,
        attackName: "Shortsword",
      },
      {
        kind: "spellTarget",
        casterId: "wizard",
        targetId: value,
        spellId: "ray_of_frost",
      },
      {
        kind: "spellTarget",
        casterId: "wizard",
        targetId: value,
        spellId: "magic_missile",
      },
    ],
  };
}

function spellTargetFill(
  holeId: string,
  casterId: string,
  spellId: string,
  targetId: string,
) {
  return {
    kind: "targetChoice",
    holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId,
        targetId,
        spellId,
      },
    ],
  };
}

function attackRollFill(total: number, naturalD20: number, rollMode?: string) {
  return battleAttackRollFill(
    "battle:attack:roll",
    total,
    naturalD20,
    rollMode,
  );
}

function battleAttackRollFill(
  holeId: string,
  total: number,
  naturalD20: number,
  rollMode?: string,
) {
  return {
    kind: "attackRoll",
    holeId,
    value: {
      total,
      naturalD20,
      ...(rollMode === undefined ? {} : { rollMode }),
    },
  };
}

async function fillAttackSequencePart(
  client: Client,
  input: {
    readonly subject: JsonObject;
    readonly pending: JsonObject;
    readonly partIndex: number;
    readonly attackTotal: number;
    readonly naturalD20: number;
    readonly damageRolls: readonly number[];
  },
) {
  const attackRollHole = resultHole(input.pending, "attackRoll");
  assert.equal(
    attackRollHole.holeId,
    `battle:spell:attack-sequence-part-attack-roll:scorching_ray:${input.partIndex}`,
  );
  const attackResult = await callTool(client, "fill_battle_hole", {
    subject: input.subject,
    fill: battleAttackRollFill(
      attackRollHole.holeId,
      input.attackTotal,
      input.naturalD20,
    ),
  });
  const damageHole = resultHole(attackResult, "rolledDice");
  assert.equal(
    damageHole.holeId,
    `battle:spell:attack-sequence-part-damage:scorching_ray:${input.partIndex}:normal`,
  );
  return callTool(client, "fill_battle_hole", {
    subject: input.subject,
    fill: rolledDiceFill(damageHole.holeId, [input.damageRolls]),
  });
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
  const combatants = get(payload, "snapshot.combatants") as ReadonlyArray<{
    readonly combatantId: string;
    readonly hp: number;
  }>;
  const combatant = combatants.find(
    (candidate) => candidate.combatantId === combatantId,
  );
  assert.ok(combatant, `Missing combatant ${combatantId}`);
  return combatant.hp;
}

function resultHole(payload: JsonObject, kind: string) {
  const holes = get(payload, "result.holes") as
    | ReadonlyArray<{ readonly kind: string; readonly holeId: string }>
    | undefined;
  assert.ok(holes, "Expected result holes");
  const hole = holes.find((candidate) => candidate.kind === kind);
  assert.ok(hole, `Missing ${kind} result hole`);
  return hole;
}

function wizardSpellSlots(payload: JsonObject) {
  return wizardSpellSlotsFor(payload, "wizard");
}

function wizardSpellSlotsFor(payload: JsonObject, combatantId: string) {
  const combatants = get(payload, "snapshot.combatants") as ReadonlyArray<{
    readonly combatantId: string;
    readonly origin: {
      readonly spellcasting?: {
        readonly spellSlots: readonly JsonObject[];
      };
    };
  }>;
  const wizard = combatants.find(
    (candidate) => candidate.combatantId === combatantId,
  );
  assert.ok(wizard, `Missing ${combatantId} combatant`);
  return wizard.origin.spellcasting?.spellSlots;
}

function battleActByLabel(payload: JsonObject, label: string) {
  return (
    get(payload, "snapshot.acts") as ReadonlyArray<{
      readonly label: string;
      readonly subject: JsonObject;
      readonly initialHoles: readonly JsonObject[];
    }>
  ).find((act) => act.label === label);
}

function singleInitialHoleOfKind(
  act: { readonly initialHoles: readonly JsonObject[] },
  kind: string,
) {
  const matchingHoles = initialHolesOfKind(act, kind);
  assert.equal(matchingHoles.length, 1);
  const [hole] = matchingHoles;
  assert.ok(hole, `Missing ${kind} initial hole`);
  return hole;
}

function initialHolesOfKind(
  act: { readonly initialHoles: readonly JsonObject[] },
  kind: string,
) {
  const matchingHoles: Array<{
    readonly kind: string;
    readonly holeId: string;
  }> = [];
  for (const hole of act.initialHoles) {
    if (hole.kind !== kind) continue;
    const holeId = parseString(hole.holeId, `${kind} holeId`);
    matchingHoles.push({ kind, holeId });
  }
  return matchingHoles;
}

function characterRow(payload: JsonObject, characterId: string) {
  const characters = get(payload, "characters") as JsonObject[];
  const character = characters.find(
    (candidate) => candidate.characterId === characterId,
  );
  assert.ok(character, `Missing listed character ${characterId}`);
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

function stringArrayAt(payload: JsonObject, path: string) {
  const value = get(payload, path);
  assert.ok(Array.isArray(value), `${path} must be an array`);
  const strings: string[] = [];
  for (const [index, entry] of value.entries()) {
    strings.push(parseString(entry, `${path}.${index}`));
  }
  return strings;
}

function jsonObjectArrayAt(payload: JsonObject, path: string) {
  const value = get(payload, path);
  assert.ok(Array.isArray(value), `${path} must be an array`);
  const objects: JsonObject[] = [];
  for (const [index, entry] of value.entries()) {
    assert.ok(isJsonObject(entry), `${path}.${index} must be an object`);
    objects.push(entry);
  }
  return objects;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseString(value: unknown, context: string) {
  if (typeof value !== "string") {
    assert.fail(`${context} must be a string`);
  }
  return value;
}

export function verifyAgentConversationScenarios() {
  assert.equal(agentConversationScenarios.length, 16);
  const scenarioIds = new Set<string>();
  for (const scenario of agentConversationScenarios) {
    assert.match(scenario.id, /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/);
    assert.equal(scenarioIds.has(scenario.id), false);
    scenarioIds.add(scenario.id);
    assert.notEqual(scenario.name.trim(), "");
    assert.notEqual(scenario.userSays.trim(), "");
    assert.notEqual(scenario.agentReads.trim(), "");
    assert.notEqual(scenario.agentDecision.trim(), "");
    assert.notEqual(scenario.executableCoverage.trim(), "");
    assert.notEqual(scenario.insufficiency.trim(), "");
  }
}

export function mcpAcceptanceScenarioIds() {
  return agentConversationScenarios.map((scenario) => scenario.id);
}
