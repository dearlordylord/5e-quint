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
      "cc:draft:draft.advancement.initial",
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
          "cc:draft:draft.advancement.initial",
          "class_fighter:level_1",
        ),
      ],
    });

    const classChoices = callTool(root, "discover_creation_holes", { draftId });
    expect(holeIds(classChoices)).toEqual([
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

    callTool(root, "fill_creation_holes", {
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

    callTool(root, "fill_creation_holes", {
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
      "Second Wind",
      "Move",
      "End Turn",
    ]);

    callTool(root, "fill_battle_hole", {
      subject: {
        tag: "action",
        actorId: "fighter",
        action: "attack",
        attackName: "Longsword",
      },
      fill: {
        kind: "targetChoice",
        holeId: "battle:attack:target",
        value: "goblin",
      },
    });
    callTool(root, "fill_battle_hole", {
      subject: {
        tag: "action",
        actorId: "fighter",
        action: "attack",
        attackName: "Longsword",
      },
      fill: {
        kind: "attackRoll",
        holeId: "battle:attack:roll",
        value: { total: 16, naturalD20: 14 },
      },
    });
    const fighterDamage = callTool(root, "fill_battle_hole", {
      subject: {
        tag: "action",
        actorId: "fighter",
        action: "attack",
        attackName: "Longsword",
      },
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
      "Move",
      "End Turn",
    ]);

    callTool(root, "fill_battle_hole", {
      subject: {
        tag: "action",
        actorId: "goblin",
        action: "attack",
        attackName: "Scimitar",
      },
      fill: {
        kind: "targetChoice",
        holeId: "battle:attack:target",
        value: "fighter",
      },
    });
    callTool(root, "fill_battle_hole", {
      subject: {
        tag: "action",
        actorId: "goblin",
        action: "attack",
        attackName: "Scimitar",
      },
      fill: {
        kind: "attackRoll",
        holeId: "battle:attack:roll",
        value: { total: 20, naturalD20: 18 },
      },
    });
    const goblinDamage = callTool(root, "fill_battle_hole", {
      subject: {
        tag: "action",
        actorId: "goblin",
        action: "attack",
        attackName: "Scimitar",
      },
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
      session: { activeBattle: null, transientBattleFills: null },
    });

    const listed = callTool(root, "list_characters", {});
    expect(listed.characters).toEqual([
      expect.objectContaining({
        sourceDraftId: draftId,
        status: "available",
        displayName: "Orc Soldier Fighter",
        hitPoints: expect.objectContaining({ current: 5, maximum: 12 }),
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

  test("creates Fighter 2 and Wizard 1, then runs the widened Skeleton workflow", () => {
    const root = createMcpCompositionRoot();
    const fighterDraftId = "draft:post5-orc-soldier-fighter-two";
    const wizardDraftId = "draft:post5-orc-soldier-wizard-one";

    createAndFinalizeFighterTwo(root, fighterDraftId);
    const wizard = createAndFinalizeWizardOne(root, wizardDraftId);
    expect(wizard.finalization).toMatchObject({
      tag: "ready",
      build: {
        spellcasting: {
          cantrips: expect.arrayContaining(["ray_of_frost"]),
          preparedSpells: expect.arrayContaining(["magic_missile"]),
          spellSlots: [{ count: 2, spellLevel: 1 }],
        },
      },
    });

    const selected = callTool(root, "select_stat_block", {
      statBlockId: "stat_block_skeleton",
    });
    expect(selected.selectedStatBlock).toMatchObject({
      id: "stat_block_skeleton",
      provenance: { kind: "srd-5.2.1" },
      statBlock: {
        displayName: "Skeleton",
        vulnerabilities: { damageTypes: ["bludgeoning"] },
        immunities: {
          damageTypes: ["poison"],
          conditions: ["exhaustion", "poisoned"],
        },
      },
    });

    const started = callTool(root, "start_battle", {
      battleId: "battle:post5-width",
      initialCombatants: [
        {
          kind: "characterSession",
          sourceDraftId: fighterDraftId,
          combatantId: "fighter",
          initiative: 18,
        },
        {
          kind: "characterSession",
          sourceDraftId: wizardDraftId,
          combatantId: "wizard",
          initiative: 14,
        },
        {
          kind: "statBlock",
          statBlockId: "stat_block_skeleton",
          combatantId: "skeleton",
          initiative: 8,
        },
      ],
    });
    expect(started.snapshot).toMatchObject({
      currentActorId: "fighter",
      turnOrder: ["fighter", "wizard", "skeleton"],
      combatants: [
        { combatantId: "fighter", hp: 20 },
        { combatantId: "wizard", hp: 8 },
        { combatantId: "skeleton", hp: 13 },
      ],
    });
    expect(started.battleState.combatants).toEqual([
      expect.objectContaining({
        combatantId: "fighter",
        origin: expect.objectContaining({ kind: "character" }),
      }),
      expect.objectContaining({
        combatantId: "wizard",
        origin: expect.objectContaining({ kind: "character" }),
      }),
      expect.objectContaining({
        combatantId: "skeleton",
        origin: expect.objectContaining({ kind: "statBlock" }),
      }),
    ]);

    const fighterActs = callTool(root, "discover_battle_acts", {});
    expect(actionLabels(fighterActs)).toEqual([
      "Attack",
      "Second Wind",
      "Action Surge",
      "Move",
      "End Turn",
    ]);

    fillBattleSubject(root, attackSubject("fighter", "Flail"), {
      kind: "targetChoice",
      holeId: "battle:attack:target",
      value: "skeleton",
    });
    fillBattleSubject(root, attackSubject("fighter", "Flail"), {
      kind: "attackRoll",
      holeId: "battle:attack:roll",
      value: { total: 18, naturalD20: 15 },
    });
    const afterBludgeoning = fillBattleSubject(
      root,
      attackSubject("fighter", "Flail"),
      {
        kind: "rolledDice",
        holeId: "battle:attack:damage-result:1d8+3-bludgeoning",
        value: [{ results: [1] }],
      },
    );
    expect(afterBludgeoning.battleState.combatants).toEqual([
      expect.objectContaining({ combatantId: "fighter", hp: 20 }),
      expect.objectContaining({ combatantId: "wizard", hp: 8 }),
      expect.objectContaining({ combatantId: "skeleton", hp: 5 }),
    ]);

    const surged = callTool(root, "resolve_battle_act", {
      subject: {
        tag: "unitFeature",
        actorId: "fighter",
        unitId: "fighter_action_surge",
      },
    });
    expect(surged.result.tag).toBe("resolved");
    expect(surged.battleState.combatants[0].origin.resources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          unitId: "fighter_action_surge",
          usesRemaining: 0,
          usedThisTurn: true,
        }),
      ]),
    );
    expect(actionLabels(surged)).toEqual([
      "Attack",
      "Second Wind",
      "Move",
      "End Turn",
    ]);

    fillBattleSubject(root, attackSubject("fighter", "Flail"), {
      kind: "targetChoice",
      holeId: "battle:attack:target",
      value: "skeleton",
    });
    const missedExtraAttack = fillBattleSubject(
      root,
      attackSubject("fighter", "Flail"),
      {
        kind: "attackRoll",
        holeId: "battle:attack:roll",
        value: { total: 1, naturalD20: 1 },
      },
    );
    expect(missedExtraAttack.result.tag).toBe("resolved");
    expect(missedExtraAttack.snapshot.currentActorId).toBe("fighter");

    expect(
      callTool(root, "end_turn", { actorId: "fighter" }).snapshot,
    ).toMatchObject({
      currentActorId: "wizard",
    });

    const wizardActs = callTool(root, "discover_battle_acts", {});
    expect(wizardActs.snapshot.acts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Magic Missile",
          summary:
            "Cast Magic Missile using a level 1 Spell Slot, with all darts at one target.",
        }),
        expect.objectContaining({
          label: "Ray of Frost",
          summary: "Cast Ray of Frost as a cantrip.",
        }),
      ]),
    );

    fillBattleSubject(root, magicSubject("wizard", "ray_of_frost"), {
      kind: "targetChoice",
      holeId: "battle:attack:target",
      value: "skeleton",
    });
    const afterRayMiss = fillBattleSubject(
      root,
      magicSubject("wizard", "ray_of_frost"),
      {
        kind: "attackRoll",
        holeId: "battle:attack:roll",
        value: { total: 1, naturalD20: 1 },
      },
    );
    expect(afterRayMiss.result.tag).toBe("resolved");
    expect(afterRayMiss.battleState.combatants).toEqual([
      expect.objectContaining({ combatantId: "fighter", hp: 20 }),
      expect.objectContaining({
        combatantId: "wizard",
        origin: expect.objectContaining({
          kind: "character",
          characterId: wizardDraftId,
          resources: [],
          spellcasting: {
            spellSlots: [{ count: 2, expended: 0, spellLevel: 1 }],
          },
        }),
      }),
      expect.objectContaining({ combatantId: "skeleton", hp: 5 }),
    ]);

    expect(
      callTool(root, "end_turn", { actorId: "wizard" }).snapshot,
    ).toMatchObject({
      currentActorId: "skeleton",
    });

    const skeletonActs = callTool(root, "discover_battle_acts", {});
    expect(skeletonActs.snapshot.acts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Attack",
          subject: attackSubject("skeleton", "Shortsword"),
        }),
      ]),
    );
    fillBattleSubject(root, attackSubject("skeleton", "Shortsword"), {
      kind: "targetChoice",
      holeId: "battle:attack:target",
      value: "fighter",
    });
    fillBattleSubject(root, attackSubject("skeleton", "Shortsword"), {
      kind: "attackRoll",
      holeId: "battle:attack:roll",
      value: { total: 20, naturalD20: 15 },
    });
    const afterSkeletonAttack = fillBattleSubject(
      root,
      attackSubject("skeleton", "Shortsword"),
      {
        kind: "rolledDice",
        holeId: "battle:attack:damage-result:1d6+3-piercing",
        value: [{ results: [1] }],
      },
    );
    expect(afterSkeletonAttack.battleState.combatants).toEqual([
      expect.objectContaining({ combatantId: "fighter", hp: 16 }),
      expect.objectContaining({ combatantId: "wizard", hp: 8 }),
      expect.objectContaining({ combatantId: "skeleton", hp: 5 }),
    ]);
    expect(
      callTool(root, "end_turn", { actorId: "skeleton" }).snapshot,
    ).toMatchObject({
      currentActorId: "fighter",
    });

    fillBattleSubject(
      root,
      unitFeatureSubject("fighter", "fighter_second_wind"),
      {
        kind: "rolledDice",
        holeId: "battle:unit-feature:fighter_second_wind:healing-roll",
        value: [{ results: [2] }],
      },
    );
    expect(
      callTool(root, "read_battle_state", {}).battleState.combatants,
    ).toEqual([
      expect.objectContaining({ combatantId: "fighter", hp: 20 }),
      expect.objectContaining({ combatantId: "wizard", hp: 8 }),
      expect.objectContaining({ combatantId: "skeleton", hp: 5 }),
    ]);

    expect(
      callTool(root, "end_turn", { actorId: "fighter" }).snapshot,
    ).toMatchObject({
      currentActorId: "wizard",
    });

    fillBattleSubject(root, magicSubject("wizard", "magic_missile"), {
      kind: "targetChoice",
      holeId: "battle:attack:target",
      value: "skeleton",
    });
    const afterMagicMissile = fillBattleSubject(
      root,
      magicSubject("wizard", "magic_missile"),
      {
        kind: "rolledDice",
        holeId: "battle:spell:damage-result:magic_missile:3d4+3-force",
        value: [{ results: [1, 1, 1] }],
      },
    );
    expect(afterMagicMissile.result.tag).toBe("resolved");
    expect(afterMagicMissile.battleState.combatants).toEqual([
      expect.objectContaining({ combatantId: "fighter", hp: 20 }),
      expect.objectContaining({
        combatantId: "wizard",
        origin: expect.objectContaining({
          kind: "character",
          characterId: wizardDraftId,
          resources: [],
          spellcasting: {
            spellSlots: [{ count: 2, expended: 1, spellLevel: 1 }],
          },
        }),
      }),
      expect.objectContaining({ combatantId: "skeleton", hp: 0 }),
    ]);

    const ended = callTool(root, "end_battle", {});
    expect(ended.session).toMatchObject({
      activeBattle: null,
      transientBattleFills: null,
      sourceDraftIds: [fighterDraftId, wizardDraftId],
    });

    const listed = callTool(root, "list_characters", {});
    expect(listed.characters).toEqual([
      expect.objectContaining({
        sourceDraftId: fighterDraftId,
        status: "available",
        hitPoints: expect.objectContaining({ current: 20, maximum: 20 }),
      }),
      expect.objectContaining({
        sourceDraftId: wizardDraftId,
        characterId: wizardDraftId,
        status: "available",
        hitPoints: expect.objectContaining({ current: 8, maximum: 8 }),
        spellSlots: [{ count: 2, expended: 1, spellLevel: 1 }],
      }),
    ]);
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

function createAndFinalizeFighterTwo(
  root: ReturnType<typeof createMcpCompositionRoot>,
  draftId: string,
) {
  callTool(root, "create_character_draft", { draftId });
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
  callTool(root, "fill_creation_holes", {
    draftId,
    expectedRevision: 1,
    fills: [
      choiceFill("cc:draft:draft.advancement.initial", "class_fighter:level_2"),
    ],
  });
  callTool(root, "fill_creation_holes", {
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
  callTool(root, "fill_creation_holes", {
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
  callTool(root, "fill_creation_holes", {
    draftId,
    expectedRevision: 4,
    fills: [
      choiceFill("cc:unit:armor_chain_mail:loadout_armor", "worn"),
      choiceFill("cc:unit:equipment_shield:loadout_shield", "wielded"),
      choiceFill("cc:unit:weapon_flail:loadout_weapon", "wielded_one_handed"),
    ],
  });
  return callTool(root, "finalize_character", { draftId });
}

function createAndFinalizeWizardOne(
  root: ReturnType<typeof createMcpCompositionRoot>,
  draftId: string,
) {
  callTool(root, "create_character_draft", { draftId });
  callTool(root, "fill_creation_holes", {
    draftId,
    expectedRevision: 0,
    fills: [
      choiceFill("cc:draft:draft.primaryClass", "class_wizard"),
      choiceFill("cc:draft:draft.background", "background_soldier"),
      choiceFill("cc:draft:draft.species", "species_orc"),
      {
        kind: "abilityScores",
        holeId: "cc:draft:draft.abilityScoreGeneration",
        method: "standardArray",
        value: { str: 8, dex: 14, con: 13, int: 15, wis: 10, cha: 12 },
      },
      choiceFill("cc:draft:draft.languages", "Dwarvish", "Goblin"),
      choiceFill("cc:draft:draft.alignment", "lawful_good"),
    ],
  });
  callTool(root, "fill_creation_holes", {
    draftId,
    expectedRevision: 1,
    fills: [
      choiceFill("cc:draft:draft.advancement.initial", "class_wizard:level_1"),
    ],
  });
  callTool(root, "fill_creation_holes", {
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
  callTool(root, "fill_creation_holes", {
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
  callTool(root, "fill_creation_holes", {
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
  return callTool(root, "finalize_character", { draftId });
}

function attackSubject(actorId: string, attackName: string) {
  return { tag: "action", actorId, action: "attack", attackName };
}

function magicSubject(actorId: string, spellId: string) {
  return { tag: "actionSpell", actorId, spellId };
}

function unitFeatureSubject(actorId: string, unitId: string) {
  return { tag: "unitFeature", actorId, unitId };
}

function fillBattleSubject(
  root: ReturnType<typeof createMcpCompositionRoot>,
  subject:
    | ReturnType<typeof attackSubject>
    | ReturnType<typeof magicSubject>
    | ReturnType<typeof unitFeatureSubject>,
  fill: {
    readonly kind: "targetChoice" | "attackRoll" | "rolledDice";
    readonly holeId: string;
    readonly value: unknown;
  },
) {
  return callTool(root, "fill_battle_hole", { subject, fill });
}
