import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

type JsonObject = Record<string, unknown>;

const REPO_ROOT = "/workspace/typescript/dnd";

const expectedTools = [
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

async function main() {
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

  const startBattle = listed.tools.find((tool) => tool.name === "start_battle");
  assert.ok(startBattle, "start_battle tool must be registered");
  const schemaText = JSON.stringify(startBattle.inputSchema);
  assert.match(schemaText, /characters/);
  assert.doesNotMatch(schemaText, /characterCombatantId/);
  assert.doesNotMatch(schemaText, /additionalCharacters/);

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
  assert.deepEqual(actionLabels(await callTool(client, "discover_battle_acts", {})), [
    "Attack",
    "End Turn",
  ]);

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
    fill: rolledDiceFill("battle:attack:damage-result:1d8+3-slashing", [
      [5],
    ]),
  });
  assert.equal(get(fighterDamage, "result.tag"), "resolved");
  assert.equal(combatantHp(fighterDamage, "goblin"), 2);

  const endedFighterTurn = await callTool(client, "end_turn", {
    actorId: "fighter",
  });
  assert.equal(get(endedFighterTurn, "snapshot.currentActorId"), "goblin");
  assert.deepEqual(actionLabels(await callTool(client, "discover_battle_acts", {})), [
    "Attack",
    "Attack",
    "End Turn",
  ]);

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
  assert.equal(get(ended, "session.battleState"), null);

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
  const finalizedWizard = await createAndFinalizeWizardOne(client, wizardDraftId);
  assert.deepEqual(get(finalizedWizard, "finalization.build.spellcasting.spellSlots"), [
    { count: 2, spellLevel: 1 },
  ]);
  assert.ok(
    (get(finalizedWizard, "finalization.build.spellcasting.cantrips") as string[])
      .includes("ray_of_frost"),
  );
  assert.ok(
    (get(finalizedWizard, "finalization.build.spellcasting.preparedSpells") as string[])
      .includes("magic_missile"),
  );

  const selected = await callTool(client, "select_stat_block", {
    statBlockId: "stat_block_skeleton",
  });
  assert.equal(get(selected, "selectedStatBlock.statBlock.displayName"), "Skeleton");
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

  assert.deepEqual(actionLabels(await callTool(client, "discover_battle_acts", {})), [
    "Attack",
    "Action Surge",
    "End Turn",
  ]);

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
    get(await callTool(client, "end_turn", { actorId: "fighter" }), "snapshot.currentActorId"),
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
    get(await callTool(client, "end_turn", { actorId: "wizard" }), "snapshot.currentActorId"),
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
    get(await callTool(client, "end_turn", { actorId: "skeleton" }), "snapshot.currentActorId"),
    "fighter",
  );
  assert.equal(
    get(await callTool(client, "end_turn", { actorId: "fighter" }), "snapshot.currentActorId"),
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
  return parseToolPayload(result, name);
}

async function expectToolError(client: Client, name: string, args: JsonObject) {
  const result = await client.callTool({ name, arguments: args });
  assert.equal(result.isError, true, `${name} should return a tool error`);
  return parseToolPayload(result, name);
}

function parseToolPayload(result: unknown, name: string) {
  const content = (result as { readonly content?: unknown }).content;
  assert.ok(Array.isArray(content), `${name} result content must be an array`);
  const [first] = content;
  assert.equal(
    (first as { readonly type?: unknown }).type,
    "text",
    `${name} result content must be text`,
  );
  return JSON.parse((first as { readonly text: string }).text);
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

function rolledDiceFill(holeId: string, groups: readonly (readonly number[])[]) {
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

function get(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current == null) return undefined;
    if (Array.isArray(current)) return current[Number(key)];
    return (current as JsonObject)[key];
  }, value);
}

async function closeTransportBestEffort(transport: StdioClientTransport) {
  await Promise.race([
    transport.close(),
    new Promise<void>((resolve) => setTimeout(resolve, 1_000)),
  ]);
}

function dndMcpServerPids() {
  const output = execFileSync("ps", ["-eo", "pid=,command="], {
    encoding: "utf8",
  });
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /\bsrc\/index\.ts\b/.test(line))
    .filter((line) => /tsx|node/.test(line))
    .map((line) => Number(line.split(/\s+/, 1)[0]))
    .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid);
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
