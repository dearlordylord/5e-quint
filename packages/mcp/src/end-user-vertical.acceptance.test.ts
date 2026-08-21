import { describe, expect, test } from "vitest";

import { createMcpPlaySessionRoot, handleToolCall } from "./server.ts";
import { battleToolWireArgs } from "../test-support/battle-tool-wire-args.ts";
import { characterDraftId } from "@dnd/character-creation-runtime";
import { combatantId, type BattleActPresentation } from "@dnd/battle-runtime";
import { characterIdFromDraftId } from "./session-store.ts";
import {
  GENERIC_COMBAT_ACTION_LABELS,
  GENERIC_COMBAT_ACTION_LABELS_WITH_HELP_AND_SHOVE,
  GENERIC_COMBAT_ACTION_LABELS_WITH_SHOVE,
} from "../test-support/battle-act-labels.ts";
import {
  loadoutHoleId,
  unitHoleId,
} from "../test-support/creation-hole-ids.ts";
import { statBlockCombatant } from "../test-support/mcp-acceptance-scenarios.ts";

const BATTLE_DEMO_VERTICAL_TEST_TIMEOUT_MS = 10_000;

describe("end-user MCP vertical", () => {
  test("creates an Orc Soldier Fighter, runs battle, ends battle, and lists reduced HP", () => {
    const root = createMcpPlaySessionRoot();
    const draftId = "draft:accepted-orc-soldier-fighter";

    const created = callTool(root, "create_character_draft", { draftId });
    expect(holeIds(created)).toEqual([
      "cc:draft:draft.progression.initial",
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

    const choices = callTool(root, "discover_creation_holes", { draftId });
    expect(holeIds(choices)).toEqual([
      unitHoleId("class_fighter", "class_skill_proficiency_choice"),
      unitHoleId("fighter_fighting_style", "class_feature_feat_choice"),
      unitHoleId("fighter_weapon_mastery", "weapon_mastery_options"),
      unitHoleId("class_fighter", "class_equipment_choice"),
      unitHoleId("background_soldier", "background_ability_score_increase"),
      unitHoleId("background_soldier", "background_tool_choice"),
      unitHoleId("background_soldier", "background_equipment_choice"),
    ]);

    callTool(root, "fill_creation_holes", {
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

    callTool(root, "fill_creation_holes", {
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

    callTool(root, "fill_creation_holes", {
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

    const finalized = callTool(root, "finalize_character", { draftId });
    expect(finalized.finalization).toMatchObject({
      tag: "ready",
      build: {
        background: "background_soldier",
        species: "species_orc",
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
          ammunitionStocks: [],
          characterId: testCharacterId(draftId),
          combatantId: "fighter",
          initiative: 18,
        },
        {
          kind: "statBlock",
          ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
          statBlockId: "stat_block_goblin_warrior",
          combatantId: "goblin",
          initiative: 7,
          admissionSource: { kind: "encounterParticipant" },
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
      "Attack",
      ...GENERIC_COMBAT_ACTION_LABELS_WITH_SHOVE,
      "Adrenaline Rush: Dash",
      "Second Wind",
      "Move",
      "Ready",
      "End Turn",
    ]);
    const fighterLongswordAttack = requireAttackAct(
      root,
      "fighter",
      "Longsword",
    ).subject;

    fillBattleSubject(root, fighterLongswordAttack, {
      kind: "targetChoice",
      holeId: "battle:attack:target",
      value: "goblin",
    });
    fillBattleSubject(root, fighterLongswordAttack, {
      kind: "attackRoll",
      holeId: "battle:attack:roll",
      value: { total: 16, naturalD20: 14 },
    });
    const fighterDamage = fillBattleSubject(root, fighterLongswordAttack, {
      kind: "rolledDice",
      holeId: "battle:attack:damage-result:1d8+3-slashing",
      value: [{ results: [5] }],
    });
    expect(fighterDamage.result.tag).toBe("resolved");
    expect(fighterDamage.snapshot.combatants).toEqual([
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
      "Attack",
      "Attack",
      "Attack",
      ...GENERIC_COMBAT_ACTION_LABELS,
      "Unarmed Strike (Grapple)",
      "Unarmed Strike (Shove)",
      "Nimble Escape",
      "Move",
      "Ready",
      "End Turn",
    ]);

    const goblinAttack = requireAttackAct(root, "goblin", "Scimitar");
    const goblinTarget = fillBattleSubject(root, goblinAttack.subject, {
      kind: "targetChoice",
      holeId: "battle:attack:target",
      value: "fighter",
    });
    const goblinAttackRoll = goblinTarget.result.holes.find(
      (hole: { readonly kind?: string }) => hole.kind === "attackRoll",
    );
    if (goblinAttackRoll === undefined) {
      throw new Error("Expected Goblin attack roll hole.");
    }
    fillBattleSubject(root, goblinAttack.subject, {
      kind: "attackRoll",
      holeId: goblinAttackRoll.holeId,
      value: {
        total: 20,
        naturalD20: 18,
        ...("rollMode" in goblinAttackRoll
          ? { rollMode: goblinAttackRoll.rollMode }
          : {}),
      },
    });
    const goblinDamage = fillBattleSubject(root, goblinAttack.subject, {
      kind: "rolledDice",
      holeId: "battle:attack:damage-result:1d6+2-slashing",
      value: [{ results: [5] }],
    });
    expect(goblinDamage.result.tag).toBe("resolved");
    expect(goblinDamage.snapshot.combatants).toEqual([
      expect.objectContaining({ combatantId: "fighter", hp: 5 }),
      expect.objectContaining({ combatantId: "goblin", hp: 2 }),
    ]);

    const ended = callTool(root, "end_battle", {});
    expect(ended).toMatchObject({
      endedBattleId: "battle:accepted-vertical",
      closedAt: {
        roundReached: 1,
        activeTurnActorId: "goblin",
      },
      session: { activeBattle: null },
    });

    const listed = callTool(root, "list_characters", {});
    expect(listed.characters).toEqual([
      expect.objectContaining({
        characterId: testCharacterId(draftId),
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

  test("creates Fighter 2 and Elf Wizard 2, then runs the widened Skeleton workflow", () => {
    const root = createMcpPlaySessionRoot();
    const fighterDraftId = "draft:post5-orc-soldier-fighter-two";
    const wizardDraftId = "draft:post5-elf-soldier-wizard-two";

    createAndFinalizeFighterTwo(root, fighterDraftId);
    const wizard = createAndFinalizeElfWizardTwo(root, wizardDraftId);
    expect(wizard.finalization).toMatchObject({
      tag: "ready",
      build: {
        species: "species_elf",
        spellcasting: {
          sources: [
            expect.objectContaining({
              cantrips: expect.arrayContaining(["ray_of_frost"]),
              preparedSpells: expect.arrayContaining([
                "chromatic_orb",
                "magic_missile",
                "shield",
              ]),
            }),
          ],
          slotPools: {
            spellcasting: {
              slots: [{ count: 3, spellLevel: 1 }],
            },
          },
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
          ammunitionStocks: [],
          characterId: testCharacterId(fighterDraftId),
          combatantId: "fighter",
          initiative: 18,
        },
        {
          kind: "characterSession",
          ammunitionStocks: [],
          characterId: testCharacterId(wizardDraftId),
          combatantId: "wizard",
          initiative: 14,
        },
        {
          kind: "statBlock",
          ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
          statBlockId: "stat_block_skeleton",
          combatantId: "skeleton-a",
          initiative: 8,
          admissionSource: { kind: "encounterParticipant" },
        },
        {
          kind: "statBlock",
          ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
          statBlockId: "stat_block_skeleton",
          combatantId: "skeleton-b",
          initiative: 7,
          admissionSource: { kind: "encounterParticipant" },
        },
        {
          kind: "statBlock",
          ammunitionStocks: [{ ammunition: "arrow", remaining: 20 }],
          statBlockId: "stat_block_goblin_warrior",
          combatantId: "goblin",
          initiative: 6,
          admissionSource: { kind: "encounterParticipant" },
        },
      ],
    });
    expect(started.snapshot).toMatchObject({
      currentActorId: "fighter",
      turnOrder: ["fighter", "wizard", "skeleton-a", "skeleton-b", "goblin"],
      combatants: [
        { combatantId: "fighter", hp: 20 },
        { combatantId: "wizard", hp: 14 },
        { combatantId: "skeleton-a", hp: 13 },
        { combatantId: "skeleton-b", hp: 13 },
        { combatantId: "goblin", hp: 10 },
      ],
    });
    expect(started.snapshot.combatants).toEqual([
      expect.objectContaining({
        combatantId: "fighter",
        origin: expect.objectContaining({ kind: "character" }),
      }),
      expect.objectContaining({
        combatantId: "wizard",
        origin: expect.objectContaining({ kind: "character" }),
      }),
      expect.objectContaining({
        combatantId: "skeleton-a",
        origin: expect.objectContaining({ kind: "statBlock" }),
      }),
      expect.objectContaining({
        combatantId: "skeleton-b",
        origin: expect.objectContaining({ kind: "statBlock" }),
      }),
      expect.objectContaining({
        combatantId: "goblin",
        origin: expect.objectContaining({ kind: "statBlock" }),
      }),
    ]);

    const fighterActs = callTool(root, "discover_battle_acts", {});
    expect(actionLabels(fighterActs)).toEqual([
      "Attack",
      "Attack",
      ...GENERIC_COMBAT_ACTION_LABELS_WITH_HELP_AND_SHOVE,
      "Adrenaline Rush: Dash",
      "Second Wind",
      "Action Surge",
      "Move",
      "Ready",
      "End Turn",
    ]);
    const fighterFlailAttack = requireAttackAct(
      root,
      "fighter",
      "Flail",
    ).subject;

    fillBattleSubject(root, fighterFlailAttack, {
      kind: "targetChoice",
      holeId: "battle:attack:target",
      value: "skeleton-a",
    });
    fillBattleSubject(root, fighterFlailAttack, {
      kind: "attackRoll",
      holeId: "battle:attack:roll",
      value: { total: 18, naturalD20: 15 },
    });
    const afterBludgeoning = fillBattleSubject(root, fighterFlailAttack, {
      kind: "rolledDice",
      holeId: "battle:attack:damage-result:1d8+3-bludgeoning",
      value: [{ results: [1] }],
    });
    expect(afterBludgeoning.snapshot.combatants).toEqual([
      expect.objectContaining({ combatantId: "fighter", hp: 20 }),
      expect.objectContaining({ combatantId: "wizard", hp: 14 }),
      expect.objectContaining({ combatantId: "skeleton-a", hp: 5 }),
      expect.objectContaining({ combatantId: "skeleton-b", hp: 13 }),
      expect.objectContaining({ combatantId: "goblin", hp: 10 }),
    ]);

    const actionSurgeResourcePoolRef = resourcePoolRefForUnit(
      root,
      "fighter",
      "fighter_action_surge",
    );
    const surged = resolveUnitFeatureAct(
      root,
      "fighter",
      "fighter_action_surge",
    );
    expect(surged.result.tag).toBe("resolved");
    expect(surged.snapshot.combatants[0].origin.resources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourcePoolRef: actionSurgeResourcePoolRef,
          usage: "limited",
          usesRemaining: 0,
          usedThisTurn: true,
        }),
      ]),
    );
    expect(actionLabels(surged)).toEqual([
      "Attack",
      "Attack",
      ...GENERIC_COMBAT_ACTION_LABELS_WITH_HELP_AND_SHOVE,
      "Adrenaline Rush: Dash",
      "Second Wind",
      "Move",
      "Ready",
      "End Turn",
    ]);

    fillBattleSubject(root, fighterFlailAttack, {
      kind: "targetChoice",
      holeId: "battle:attack:target",
      value: "skeleton-a",
    });
    const afterSurgedAttack = fillBattleSubject(root, fighterFlailAttack, {
      kind: "attackRoll",
      holeId: "battle:attack:roll",
      value: { total: 1, naturalD20: 1 },
    });
    expect(afterSurgedAttack.result.tag).toBe("resolved");
    expect(afterSurgedAttack.snapshot.combatants).toEqual([
      expect.objectContaining({ combatantId: "fighter", hp: 20 }),
      expect.objectContaining({ combatantId: "wizard", hp: 14 }),
      expect.objectContaining({ combatantId: "skeleton-a", hp: 5 }),
      expect.objectContaining({ combatantId: "skeleton-b", hp: 13 }),
      expect.objectContaining({ combatantId: "goblin", hp: 10 }),
    ]);

    expect(
      callTool(root, "end_turn", { actorId: "fighter" }).snapshot,
    ).toMatchObject({
      currentActorId: "wizard",
    });

    const wizardActs = callTool(root, "discover_battle_acts", {});
    expect(wizardActs.availableActs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          presentation: expect.objectContaining({
            kind: "spell",
            invocation: expect.objectContaining({ spellId: "magic_missile" }),
          }),
        }),
        expect.objectContaining({
          presentation: expect.objectContaining({
            kind: "spell",
            invocation: expect.objectContaining({ spellId: "ray_of_frost" }),
          }),
        }),
      ]),
    );
    const rayOfFrostAct = requireSpellAct(root, "wizard", "ray_of_frost");

    const afterRayOfFrostTarget = fillBattleSubject(
      root,
      rayOfFrostAct.subject,
      {
        kind: "targetChoice",
        holeId: "battle:attack:target",
        value: "skeleton-b",
        spatialFacts: [
          {
            kind: "spellTarget",
            casterId: "wizard",
            targetId: "skeleton-b",
            sourceProcedureRef: rayOfFrostAct.subject.procedureRef,
          },
        ],
      },
    );
    expect(afterRayOfFrostTarget.result.tag).toBe("needsHoles");
    const rayOfFrostAttackRoll = requireHole(
      afterRayOfFrostTarget.result.holes,
      "attackRoll",
    );
    const afterRayOfFrostAttackRoll = fillBattleSubject(
      root,
      afterRayOfFrostTarget.result.subject ?? rayOfFrostAct.subject,
      {
        kind: "attackRoll",
        holeId: rayOfFrostAttackRoll.holeId,
        value: { total: 18, naturalD20: 15 },
      },
    );
    const rayOfFrostDamage = requireHole(
      afterRayOfFrostAttackRoll.result.holes,
      "rolledDice",
    );
    const afterRayDamage = fillBattleSubject(
      root,
      afterRayOfFrostAttackRoll.result.subject ?? rayOfFrostAct.subject,
      {
        kind: "rolledDice",
        holeId: rayOfFrostDamage.holeId,
        value: [{ results: [4] }],
      },
    );
    expect(afterRayDamage.snapshot.combatants).toEqual([
      expect.objectContaining({ combatantId: "fighter", hp: 20 }),
      expect.objectContaining({
        combatantId: "wizard",
        origin: expect.objectContaining({
          kind: "character",
          characterId: testCharacterId(wizardDraftId),
          resources: [],
          spellcasting: {
            spellSlots: [{ count: 3, expended: 0, spellLevel: 1 }],
          },
        }),
      }),
      expect.objectContaining({ combatantId: "skeleton-a", hp: 5 }),
      expect.objectContaining({ combatantId: "skeleton-b", hp: 9 }),
      expect.objectContaining({ combatantId: "goblin", hp: 10 }),
    ]);

    expect(
      callTool(root, "end_turn", { actorId: "wizard" }).snapshot,
    ).toMatchObject({
      currentActorId: "skeleton-a",
    });

    expect(
      callTool(root, "end_turn", { actorId: "skeleton-a" }).snapshot,
    ).toMatchObject({
      currentActorId: "skeleton-b",
    });

    const skeletonActs = callTool(root, "discover_battle_acts", {});
    const skeletonAttack = requireAttackAct(
      root,
      "skeleton-b",
      "Shortsword",
    ).subject;
    expect(skeletonActs.availableActs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Attack",
          subject: skeletonAttack,
        }),
      ]),
    );
    const skeletonTarget = fillBattleSubject(root, skeletonAttack, {
      kind: "targetChoice",
      holeId: "battle:attack:target",
      value: "fighter",
    });
    const skeletonAttackRoll = skeletonTarget.result.holes.find(
      (hole: { readonly kind?: string }) => hole.kind === "attackRoll",
    );
    if (skeletonAttackRoll === undefined) {
      throw new Error("Expected Skeleton attack roll hole.");
    }
    fillBattleSubject(root, skeletonAttack, {
      kind: "attackRoll",
      holeId: skeletonAttackRoll.holeId,
      value: {
        total: 20,
        naturalD20: 15,
        ...("rollMode" in skeletonAttackRoll
          ? { rollMode: skeletonAttackRoll.rollMode }
          : {}),
      },
    });
    const afterSkeletonAttack = fillBattleSubject(root, skeletonAttack, {
      kind: "rolledDice",
      holeId: "battle:attack:damage-result:1d6+3-piercing",
      value: [{ results: [1] }],
    });
    expect(afterSkeletonAttack.snapshot.combatants).toEqual([
      expect.objectContaining({ combatantId: "fighter", hp: 16 }),
      expect.objectContaining({ combatantId: "wizard", hp: 14 }),
      expect.objectContaining({ combatantId: "skeleton-a", hp: 5 }),
      expect.objectContaining({ combatantId: "skeleton-b", hp: 9 }),
      expect.objectContaining({ combatantId: "goblin", hp: 10 }),
    ]);
    expect(
      callTool(root, "end_turn", { actorId: "skeleton-b" }).snapshot,
    ).toMatchObject({
      currentActorId: "goblin",
    });
    expect(
      callTool(root, "end_turn", { actorId: "goblin" }).snapshot,
    ).toMatchObject({
      currentActorId: "fighter",
    });

    resolveSecondWind(root, "fighter", [2]);
    expect(callTool(root, "read_battle_state", {}).snapshot.combatants).toEqual(
      [
        expect.objectContaining({ combatantId: "fighter", hp: 20 }),
        expect.objectContaining({ combatantId: "wizard", hp: 14 }),
        expect.objectContaining({ combatantId: "skeleton-a", hp: 5 }),
        expect.objectContaining({ combatantId: "skeleton-b", hp: 9 }),
        expect.objectContaining({ combatantId: "goblin", hp: 10 }),
      ],
    );

    expect(
      callTool(root, "end_turn", { actorId: "fighter" }).snapshot,
    ).toMatchObject({
      currentActorId: "wizard",
    });

    const magicMissileAct = requireSpellAct(root, "wizard", "magic_missile");
    const afterMagicMissileTargets = fillBattleSubject(
      root,
      magicMissileAct.subject,
      {
        kind: "spellTargetAllocation",
        holeId: requireHole(
          magicMissileAct.initialHoles,
          "spellTargetAllocation",
        ).holeId,
        value: { allocations: [{ targetId: "skeleton-b", count: 3 }] },
        spatialFacts: [
          {
            kind: "spellTarget",
            casterId: "wizard",
            targetId: "skeleton-b",
            sourceProcedureRef: magicMissileAct.subject.procedureRef,
          },
        ],
      },
    );
    const magicMissileDamage = requireHole(
      afterMagicMissileTargets.result.holes,
      "rolledDice",
    );
    const afterMagicMissile = fillBattleSubject(
      root,
      afterMagicMissileTargets.result.subject ?? magicMissileAct.subject,
      {
        kind: "rolledDice",
        holeId: magicMissileDamage.holeId,
        value: [{ results: [2, 2, 2] }],
      },
    );
    expect(afterMagicMissile.result.tag).toBe("resolved");
    expect(afterMagicMissile.snapshot.combatants).toEqual([
      expect.objectContaining({ combatantId: "fighter", hp: 20 }),
      expect.objectContaining({
        combatantId: "wizard",
        origin: expect.objectContaining({
          kind: "character",
          characterId: testCharacterId(wizardDraftId),
          resources: [],
          spellcasting: {
            spellSlots: [{ count: 3, expended: 1, spellLevel: 1 }],
          },
        }),
      }),
      expect.objectContaining({ combatantId: "skeleton-a", hp: 5 }),
      expect.objectContaining({ combatantId: "skeleton-b", hp: 0 }),
      expect.objectContaining({ combatantId: "goblin", hp: 10 }),
    ]);

    const ended = callTool(root, "end_battle", {});
    expect(ended.session).toMatchObject({
      activeBattle: null,
      characterIds: [
        testCharacterId(fighterDraftId),
        testCharacterId(wizardDraftId),
      ],
    });

    const listed = callTool(root, "list_characters", {});
    expect(listed.characters).toEqual([
      expect.objectContaining({
        characterId: testCharacterId(fighterDraftId),
        status: "available",
        hitPoints: expect.objectContaining({ current: 20, maximum: 20 }),
      }),
      expect.objectContaining({
        characterId: testCharacterId(wizardDraftId),
        status: "available",
        hitPoints: expect.objectContaining({ current: 14, maximum: 14 }),
        spellSlots: [{ count: 3, expended: 1, spellLevel: 1 }],
      }),
    ]);
  });

  // prettier-ignore
  test("starts the battle demo through MCP character creation and start_battle", () => {
    const root = createMcpPlaySessionRoot();
    const fighterDraftId = "draft:demo-fighter-two";
    const wizardDraftId = "draft:demo-wizard-one";
    const bardDraftId = "draft:demo-bard-one";

    createAndFinalizeFighterTwo(root, fighterDraftId);
    const wizard = createAndFinalizeWizardOne(root, wizardDraftId);
    expect(wizard.finalization).toMatchObject({
      tag: "ready",
      build: {
        spellcasting: {
          sources: [
            expect.objectContaining({
              preparedSpells: expect.arrayContaining([
                "magic_missile",
                "shield",
              ]),
            }),
          ],
        },
      },
    });
    createAndFinalizeBardOne(root, bardDraftId);

    const started = callTool(root, "start_battle", {
      battleId: "battle:mcp-demo-scenario",
      initialCombatants: [
        statBlockCombatant("goblin-a", "stat_block_goblin_warrior", 22, [
          { ammunition: "arrow", remaining: 20 },
        ]),
        characterCombatant(bardDraftId, "bard", 21),
        characterCombatant(fighterDraftId, "fighter", 20),
        characterCombatant(wizardDraftId, "wizard", 19),
        statBlockCombatant("goblin-b", "stat_block_goblin_warrior", 18, [
          { ammunition: "arrow", remaining: 20 },
        ]),
        statBlockCombatant("skeleton-a", "stat_block_skeleton", 16, [
          { ammunition: "arrow", remaining: 20 },
        ]),
        statBlockCombatant("skeleton-b", "stat_block_skeleton", 14, [
          { ammunition: "arrow", remaining: 20 },
        ]),
      ],
    });
    if (started.snapshot === undefined) {
      throw new Error(JSON.stringify(started));
    }
    expect(started.snapshot).toMatchObject({
      currentActorId: "goblin-a",
      turnOrder: [
        "goblin-a",
        "bard",
        "fighter",
        "wizard",
        "goblin-b",
        "skeleton-a",
        "skeleton-b",
      ],
    });

    resolveAttackWithShieldReaction(root);
    expect(combatant(root, "wizard")).toMatchObject({
      hp: 8,
      reactionAvailable: false,
      origin: expect.objectContaining({
        spellcasting: {
          spellSlots: [{ spellLevel: 1, count: 2, expended: 1 }],
        },
      }),
    });
    endTurn(root, "goblin-a");

    const bardicInspirationResourcePoolRef = resourcePoolRefForUnit(
      root,
      "bard",
      "bard_bardic_inspiration",
    );
    grantBardicInspiration(root);
    expect(combatant(root, "bard").origin.resources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourcePoolRef: bardicInspirationResourcePoolRef,
          usage: "limited",
          usesRemaining: 1,
        }),
      ]),
    );
    endTurn(root, "bard");

    resolveWeaponAttack(root, {
      actorId: "fighter",
      attackName: "Flail",
      targetId: "skeleton-a",
      total: 18,
      naturalD20: 15,
      damageResults: [1],
    });
    expect(combatant(root, "skeleton-a")).toMatchObject({ hp: 5 });
    resolveUnitFeatureAct(root, "fighter", "fighter_action_surge");
    resolveWeaponAttack(root, {
      actorId: "fighter",
      attackName: "Flail",
      targetId: "skeleton-a",
      total: 18,
      naturalD20: 15,
      damageResults: [1],
    });
    expect(combatant(root, "skeleton-a")).toMatchObject({
      hp: 0,
      zeroHpLifecycle: { dead: true },
    });
    endTurn(root, "fighter");

    castMagicMissile(
      root,
      "wizard",
      [{ targetId: "goblin-a", count: 3 }],
      [3, 3, 2],
    );
    expect(combatant(root, "goblin-a")).toMatchObject({
      hp: 0,
      zeroHpLifecycle: { dead: true },
    });
    expect(combatant(root, "wizard").origin.spellcasting.spellSlots).toEqual([
      { spellLevel: 1, count: 2, expended: 2 },
    ]);
    endTurn(root, "wizard");

    resolveWeaponAttack(root, {
      actorId: "goblin-b",
      attackName: "Scimitar",
      targetId: "bard",
      total: 16,
      naturalD20: 12,
      damageResults: [4],
    });
    expect(combatant(root, "bard")).toMatchObject({ hp: 4 });
    endTurn(root, "goblin-b");
    endTurn(root, "skeleton-a");

    resolveWeaponAttack(root, {
      actorId: "skeleton-b",
      attackName: "Shortsword",
      targetId: "bard",
      total: 18,
      naturalD20: 15,
      damageResults: [5],
    });
    expect(combatant(root, "bard")).toMatchObject({ hp: 0 });
    endTurn(root, "skeleton-b");
    endTurn(root, "goblin-a", 5);
    expect(combatant(root, "bard").zeroHpLifecycle).toMatchObject({
      deathSaves: { failures: 1, successes: 0 },
    });
    endTurn(root, "bard");

    resolveWeaponAttack(root, {
      actorId: "fighter",
      attackName: "Flail",
      targetId: "skeleton-b",
      total: 18,
      naturalD20: 15,
      damageResults: [1],
    });
    expect(combatant(root, "skeleton-b")).toMatchObject({ hp: 5 });
    endTurn(root, "fighter");

    resolveSpellAttack(root, {
      actorId: "wizard",
      spellId: "ray_of_frost",
      targetId: "goblin-b",
      total: 16,
      naturalD20: 11,
      damageResults: [4],
    });
    expect(combatant(root, "goblin-b")).toMatchObject({ hp: 6 });
    endTurn(root, "wizard");

    resolveWeaponAttack(root, {
      actorId: "goblin-b",
      attackName: "Scimitar",
      targetId: "bard",
      total: 16,
      naturalD20: 12,
      damageResults: [2],
    });
    expect(combatant(root, "bard").zeroHpLifecycle).toMatchObject({
      deathSaves: { failures: 2, successes: 0 },
    });
    endTurn(root, "goblin-b");
    endTurn(root, "skeleton-a");

    resolveWeaponAttack(root, {
      actorId: "skeleton-b",
      attackName: "Shortsword",
      targetId: "bard",
      total: 18,
      naturalD20: 15,
      damageResults: [4],
    });
    expect(combatant(root, "bard").zeroHpLifecycle).toMatchObject({
      deathSaves: { failures: 3, successes: 0 },
      dead: true,
    });
    endTurn(root, "skeleton-b");

    endTurn(root, "goblin-a");
    endTurn(root, "bard");
    resolveWeaponAttack(root, {
      actorId: "fighter",
      attackName: "Flail",
      targetId: "skeleton-b",
      total: 18,
      naturalD20: 15,
      damageResults: [1],
    });
    expect(combatant(root, "skeleton-b")).toMatchObject({
      hp: 0,
      zeroHpLifecycle: { dead: true },
    });
    endTurn(root, "fighter");

    resolveSpellAttack(root, {
      actorId: "wizard",
      spellId: "ray_of_frost",
      targetId: "goblin-b",
      total: 16,
      naturalD20: 11,
      damageResults: [4],
    });
    expect(combatant(root, "goblin-b")).toMatchObject({ hp: 2 });
    endTurn(root, "wizard");

    resolveWeaponAttack(root, {
      actorId: "goblin-b",
      attackName: "Scimitar",
      targetId: "fighter",
      total: 20,
      naturalD20: 18,
      damageResults: [5],
    });
    expect(combatant(root, "fighter")).toMatchObject({ hp: 13 });
    endTurn(root, "goblin-b");
    endTurn(root, "skeleton-a");
    endTurn(root, "skeleton-b");
    endTurn(root, "goblin-a");
    endTurn(root, "bard");

    resolveSecondWind(root, "fighter", [5]);
    expect(combatant(root, "fighter")).toMatchObject({ hp: 20 });
    resolveWeaponAttack(root, {
      actorId: "fighter",
      attackName: "Flail",
      targetId: "goblin-b",
      total: 18,
      naturalD20: 15,
      damageResults: [1],
    });
    expect(callTool(root, "read_battle_state", {}).snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: "goblin-a",
          hp: 0,
          zeroHpLifecycle: expect.objectContaining({ dead: true }),
        }),
        expect.objectContaining({
          combatantId: "goblin-b",
          hp: 0,
          zeroHpLifecycle: expect.objectContaining({ dead: true }),
        }),
        expect.objectContaining({
          combatantId: "skeleton-a",
          hp: 0,
          zeroHpLifecycle: expect.objectContaining({ dead: true }),
        }),
        expect.objectContaining({
          combatantId: "skeleton-b",
          hp: 0,
          zeroHpLifecycle: expect.objectContaining({ dead: true }),
        }),
        expect.objectContaining({
          combatantId: "bard",
          hp: 0,
          zeroHpLifecycle: expect.objectContaining({ dead: true }),
        }),
        expect.objectContaining({ combatantId: "fighter", hp: 20 }),
        expect.objectContaining({ combatantId: "wizard", hp: 8 }),
      ]),
    );
  }, BATTLE_DEMO_VERTICAL_TEST_TIMEOUT_MS);

  test("threads selected Light identity from MCP character creation into battle output", () => {
    const root = createMcpPlaySessionRoot();
    const wizardDraftId = "draft:mcp-selected-light-wizard-one";
    const wizardCombatantId = "wizard";
    const goblinCombatantId = "goblin";
    const selectedSpellId = "light";
    const lightObjectId = "wizard-spellbook";

    const wizard = createAndFinalizeWizardOne(root, wizardDraftId);
    expect(wizard.finalization).toMatchObject({
      tag: "ready",
      build: {
        spellcasting: {
          sources: [
            expect.objectContaining({
              cantrips: expect.arrayContaining([selectedSpellId]),
            }),
          ],
        },
      },
    });

    const started = callTool(root, "start_battle", {
      battleId: "battle:mcp-selected-light-identity",
      initialCombatants: [
        characterCombatant(wizardDraftId, wizardCombatantId, 18),
        statBlockCombatant(goblinCombatantId, "stat_block_goblin_warrior", 7, [
          { ammunition: "arrow", remaining: 20 },
        ]),
      ],
    });
    expect(started.snapshot).toMatchObject({
      currentActorId: wizardCombatantId,
      turnOrder: [wizardCombatantId, goblinCombatantId],
    });

    const lightAct = requireSpellAct(root, wizardCombatantId, selectedSpellId);
    expect(lightAct.subject).toMatchObject({
      tag: "actionSpell",
      actorId: wizardCombatantId,
      procedureRef: expect.any(String),
    });
    const objectTarget = requireHole(
      lightAct.initialHoles,
      "objectTargetChoice",
    );

    const resolved = callTool(root, "fill_battle_hole", {
      subject: lightAct.subject,
      fill: {
        kind: "objectTargetChoice",
        holeId: objectTarget.holeId,
        value: lightObjectId,
        spatialFacts: [
          {
            kind: "spellObjectLightTarget",
            casterId: wizardCombatantId,
            objectId: lightObjectId,
            sourceProcedureRef: lightAct.subject.procedureRef,
            size: "tiny",
            wornOrCarried: { kind: "caster" },
          },
        ],
      },
    });

    expect(resolved.result.tag).toBe("resolved");
    expect(resolved.snapshot.lightEmitters).toEqual([
      expect.objectContaining({
        sourceProcedureRef: lightAct.subject.procedureRef,
        sourceCombatantId: wizardCombatantId,
        attachment: { kind: "object", objectId: lightObjectId },
        emission: {
          kind: "brightAndDim",
          brightRadiusFeet: 20,
          dimAdditionalFeet: 20,
        },
        expiresAt: { kind: "duration", durationTicks: 600 },
      }),
    ]);
  });
});

function testCharacterId(draftId: string) {
  return characterIdFromDraftId(characterDraftId(draftId));
}

function choiceFill(holeId: string, ...optionIds: readonly string[]) {
  return {
    kind: "choice",
    holeId,
    optionIds,
  };
}

function choiceFillFromHole(
  holes: readonly CreationHoleView[],
  holeId: string,
  ...requestedOptionIds: readonly string[]
) {
  const hole = requireCreationChoiceHole(holes, holeId);
  return choiceFill(
    hole.holeId,
    ...requestedOptionIds.map((optionId) =>
      requireCreationOption(hole, optionId),
    ),
  );
}

function abilityScoresFillFromHole(
  holes: readonly CreationHoleView[],
  holeId: string,
  value: Record<string, number>,
) {
  const hole = requireCreationHole(holes, holeId);
  if (hole.kind !== "abilityScores") {
    throw new Error(`Expected ability score hole: ${holeId}`);
  }
  if (!hole.methods?.some((method) => method === "standardArray")) {
    throw new Error(`Expected Standard Array method on hole: ${holeId}`);
  }
  return {
    kind: "abilityScores",
    holeId: hole.holeId,
    method: "standardArray",
    value,
  };
}

function callTool(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  name: string,
  args: unknown,
) {
  return JSON.parse(
    handleToolCall(root, name, battleToolWireArgs(name, args)).content[0]
      ?.text ?? "{}",
  );
}

function holeIds(payload: {
  readonly holes: ReadonlyArray<{ holeId: string }>;
}) {
  return payload.holes.map((hole) => hole.holeId);
}

function creationHoles(payload: {
  readonly holes?: readonly CreationHoleView[];
  readonly result?: { readonly holes?: readonly CreationHoleView[] };
}): readonly CreationHoleView[] {
  const holes = payload.holes ?? payload.result?.holes;
  if (holes === undefined) {
    throw new Error("Expected MCP creation holes in tool output.");
  }
  return holes;
}

type CreationHoleView =
  | {
      readonly kind: "choice";
      readonly holeId: string;
      readonly options: readonly { readonly optionId: string }[];
    }
  | {
      readonly kind: "abilityScores";
      readonly holeId: string;
      readonly methods?: readonly string[];
    };

function requireCreationHole(
  holes: readonly CreationHoleView[],
  holeId: string,
): CreationHoleView {
  const hole = holes.find((candidate) => candidate.holeId === holeId);
  if (hole === undefined) throw new Error(`Expected creation hole: ${holeId}`);
  return hole;
}

function requireCreationChoiceHole(
  holes: readonly CreationHoleView[],
  holeId: string,
): Extract<CreationHoleView, { readonly kind: "choice" }> {
  const hole = requireCreationHole(holes, holeId);
  if (hole.kind !== "choice") {
    throw new Error(`Expected choice creation hole: ${holeId}`);
  }
  return hole;
}

function requireCreationOption(
  hole: Extract<CreationHoleView, { readonly kind: "choice" }>,
  optionId: string,
): string {
  const option = hole.options.find(
    (candidate) => candidate.optionId === optionId,
  );
  if (option === undefined) {
    throw new Error(
      `Expected option ${optionId} in creation hole ${hole.holeId}`,
    );
  }
  return option.optionId;
}

function actionLabels(payload: {
  readonly availableActs: ReadonlyArray<{ readonly label: string }>;
}) {
  return payload.availableActs.map((act) => act.label);
}

function createAndFinalizeFighterTwo(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  draftId: string,
) {
  const initial = callTool(root, "create_character_draft", { draftId });
  const classHoles = callTool(root, "fill_creation_holes", {
    draftId,
    expectedRevision: 0,
    fills: [
      choiceFillFromHole(
        initial.holes,
        "cc:draft:draft.progression.initial",
        "13:class_fighter|13:class_fighter:level_2:fixed_hp_gain",
      ),
      choiceFillFromHole(
        initial.holes,
        "cc:draft:draft.background",
        "background_soldier",
      ),
      choiceFillFromHole(
        initial.holes,
        "cc:draft:draft.species",
        "species_orc",
      ),
      abilityScoresFillFromHole(
        initial.holes,
        "cc:draft:draft.abilityScoreGeneration",
        {
          str: 15,
          dex: 14,
          con: 13,
          int: 8,
          wis: 10,
          cha: 12,
        },
      ),
      choiceFillFromHole(
        initial.holes,
        "cc:draft:draft.languages",
        "Dwarvish",
        "Goblin",
      ),
      choiceFillFromHole(
        initial.holes,
        "cc:draft:draft.alignment",
        "lawful_good",
      ),
    ],
  });
  const equipmentHoles = callTool(root, "fill_creation_holes", {
    draftId,
    expectedRevision: 1,
    fills: [
      choiceFillFromHole(
        creationHoles(classHoles),
        unitHoleId("class_fighter", "class_skill_proficiency_choice"),
        "perception",
        "survival",
      ),
      choiceFillFromHole(
        creationHoles(classHoles),
        unitHoleId("fighter_fighting_style", "class_feature_feat_choice"),
        "defense",
      ),
      choiceFillFromHole(
        creationHoles(classHoles),
        unitHoleId("fighter_weapon_mastery", "weapon_mastery_options"),
        "weapon_longsword",
        "weapon_spear",
        "weapon_flail",
      ),
      choiceFillFromHole(
        creationHoles(classHoles),
        unitHoleId("class_fighter", "class_equipment_choice"),
        "option_c",
      ),
      choiceFillFromHole(
        creationHoles(classHoles),
        unitHoleId("background_soldier", "background_ability_score_increase"),
        "two_and_one:str:con",
      ),
      choiceFillFromHole(
        creationHoles(classHoles),
        unitHoleId("background_soldier", "background_tool_choice"),
        "tool_dice_set",
      ),
      choiceFillFromHole(
        creationHoles(classHoles),
        unitHoleId("background_soldier", "background_equipment_choice"),
        "option_b",
      ),
    ],
  });
  const loadoutHoles = callTool(root, "fill_creation_holes", {
    draftId,
    expectedRevision: 2,
    fills: [
      choiceFillFromHole(
        creationHoles(equipmentHoles),
        unitHoleId("class_fighter", "equipment_purchase"),
        "armor_chain_mail",
        "weapon_flail",
        "equipment_shield",
      ),
    ],
  });
  callTool(root, "fill_creation_holes", {
    draftId,
    expectedRevision: 3,
    fills: [
      choiceFillFromHole(
        creationHoles(loadoutHoles),
        loadoutHoleId("armor_chain_mail", "armor"),
        "worn",
      ),
      choiceFillFromHole(
        creationHoles(loadoutHoles),
        loadoutHoleId("equipment_shield", "shield"),
        "wielded",
      ),
      choiceFillFromHole(
        creationHoles(loadoutHoles),
        loadoutHoleId("weapon_flail", "weapon"),
        "wielded_one_handed",
      ),
    ],
  });
  return callTool(root, "finalize_character", { draftId });
}

function createAndFinalizeElfWizardTwo(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  draftId: string,
) {
  const initial = callTool(root, "create_character_draft", { draftId });
  const classHoles = callTool(root, "fill_creation_holes", {
    draftId,
    expectedRevision: 0,
    fills: [
      choiceFillFromHole(
        initial.holes,
        "cc:draft:draft.progression.initial",
        "12:class_wizard|12:class_wizard:level_2:fixed_hp_gain",
      ),
      choiceFillFromHole(
        initial.holes,
        "cc:draft:draft.background",
        "background_soldier",
      ),
      choiceFillFromHole(
        initial.holes,
        "cc:draft:draft.species",
        "species_elf",
      ),
      abilityScoresFillFromHole(
        initial.holes,
        "cc:draft:draft.abilityScoreGeneration",
        {
          str: 8,
          dex: 14,
          con: 13,
          int: 15,
          wis: 10,
          cha: 12,
        },
      ),
      choiceFillFromHole(
        initial.holes,
        "cc:draft:draft.languages",
        "Dwarvish",
        "Goblin",
      ),
      choiceFillFromHole(
        initial.holes,
        "cc:draft:draft.alignment",
        "lawful_good",
      ),
    ],
  });
  const equipmentHoles = callTool(root, "fill_creation_holes", {
    draftId,
    expectedRevision: 1,
    fills: [
      choiceFillFromHole(
        creationHoles(classHoles),
        unitHoleId("class_wizard", "class_skill_proficiency_choice"),
        "arcana",
        "history",
      ),
      choiceFillFromHole(
        creationHoles(classHoles),
        unitHoleId("class_wizard", "wizard_cantrip_choices"),
        "light",
        "fire_bolt",
        "ray_of_frost",
      ),
      choiceFillFromHole(
        creationHoles(classHoles),
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
      choiceFillFromHole(
        creationHoles(classHoles),
        unitHoleId("class_wizard", "wizard_prepared_spell_choices"),
        "mage_armor",
        "magic_missile",
        "shield",
        "thunderwave",
        "chromatic_orb",
      ),
      choiceFillFromHole(
        creationHoles(classHoles),
        unitHoleId("background_soldier", "background_ability_score_increase"),
        "two_and_one:str:con",
      ),
      choiceFillFromHole(
        creationHoles(classHoles),
        unitHoleId("background_soldier", "background_tool_choice"),
        "tool_dice_set",
      ),
      choiceFillFromHole(
        creationHoles(classHoles),
        unitHoleId("class_wizard", "class_equipment_choice"),
        "option_b",
      ),
      choiceFillFromHole(
        creationHoles(classHoles),
        unitHoleId("background_soldier", "background_equipment_choice"),
        "option_b",
      ),
    ],
  });
  const loadoutHoles = callTool(root, "fill_creation_holes", {
    draftId,
    expectedRevision: 2,
    fills: [
      choiceFillFromHole(
        creationHoles(equipmentHoles),
        unitHoleId("class_wizard", "equipment_purchase"),
        "weapon_longsword",
        "weapon_dagger",
        "equipment_shield",
      ),
    ],
  });
  const scholarHoles = callTool(root, "fill_creation_holes", {
    draftId,
    expectedRevision: 3,
    fills: [
      choiceFillFromHole(
        creationHoles(loadoutHoles),
        loadoutHoleId("equipment_shield", "shield"),
        "wielded",
      ),
      choiceFillFromHole(
        creationHoles(loadoutHoles),
        loadoutHoleId("weapon_longsword", "weapon"),
        "wielded_one_handed",
      ),
    ],
  });
  callTool(root, "fill_creation_holes", {
    draftId,
    expectedRevision: 4,
    fills: [
      choiceFillFromHole(
        creationHoles(scholarHoles),
        unitHoleId("wizard_scholar", "class_feature_proficiency_choice"),
        "arcana",
      ),
    ],
  });
  return callTool(root, "finalize_character", { draftId });
}

function createAndFinalizeWizardOne(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  draftId: string,
) {
  const initial = callTool(root, "create_character_draft", { draftId });
  const classHoles = callTool(root, "fill_creation_holes", {
    draftId,
    expectedRevision: 0,
    fills: [
      choiceFillFromHole(
        initial.holes,
        "cc:draft:draft.progression.initial",
        "12:class_wizard:level_1:maximum_hit_die",
      ),
      choiceFillFromHole(
        initial.holes,
        "cc:draft:draft.background",
        "background_soldier",
      ),
      choiceFillFromHole(
        initial.holes,
        "cc:draft:draft.species",
        "species_orc",
      ),
      abilityScoresFillFromHole(
        initial.holes,
        "cc:draft:draft.abilityScoreGeneration",
        {
          str: 8,
          dex: 14,
          con: 13,
          int: 15,
          wis: 10,
          cha: 12,
        },
      ),
      choiceFillFromHole(
        initial.holes,
        "cc:draft:draft.languages",
        "Dwarvish",
        "Goblin",
      ),
      choiceFillFromHole(
        initial.holes,
        "cc:draft:draft.alignment",
        "lawful_good",
      ),
    ],
  });
  const equipmentHoles = callTool(root, "fill_creation_holes", {
    draftId,
    expectedRevision: 1,
    fills: [
      choiceFillFromHole(
        creationHoles(classHoles),
        unitHoleId("class_wizard", "class_skill_proficiency_choice"),
        "arcana",
        "history",
      ),
      choiceFillFromHole(
        creationHoles(classHoles),
        unitHoleId("class_wizard", "wizard_cantrip_choices"),
        "light",
        "fire_bolt",
        "ray_of_frost",
      ),
      choiceFillFromHole(
        creationHoles(classHoles),
        unitHoleId("class_wizard", "wizard_spellbook_choices"),
        "detect_magic",
        "mage_armor",
        "magic_missile",
        "shield",
        "sleep",
        "thunderwave",
      ),
      choiceFillFromHole(
        creationHoles(classHoles),
        unitHoleId("class_wizard", "wizard_prepared_spell_choices"),
        "detect_magic",
        "magic_missile",
        "shield",
        "sleep",
      ),
      choiceFillFromHole(
        creationHoles(classHoles),
        unitHoleId("background_soldier", "background_ability_score_increase"),
        "two_and_one:str:con",
      ),
      choiceFillFromHole(
        creationHoles(classHoles),
        unitHoleId("background_soldier", "background_tool_choice"),
        "tool_dice_set",
      ),
      choiceFillFromHole(
        creationHoles(classHoles),
        unitHoleId("class_wizard", "class_equipment_choice"),
        "option_b",
      ),
      choiceFillFromHole(
        creationHoles(classHoles),
        unitHoleId("background_soldier", "background_equipment_choice"),
        "option_b",
      ),
    ],
  });
  const loadoutHoles = callTool(root, "fill_creation_holes", {
    draftId,
    expectedRevision: 2,
    fills: [
      choiceFillFromHole(
        creationHoles(equipmentHoles),
        unitHoleId("class_wizard", "equipment_purchase"),
        "weapon_longsword",
        "weapon_dagger",
        "equipment_shield",
      ),
    ],
  });
  callTool(root, "fill_creation_holes", {
    draftId,
    expectedRevision: 3,
    fills: [
      choiceFillFromHole(
        creationHoles(loadoutHoles),
        loadoutHoleId("equipment_shield", "shield"),
        "wielded",
      ),
      choiceFillFromHole(
        creationHoles(loadoutHoles),
        loadoutHoleId("weapon_longsword", "weapon"),
        "wielded_one_handed",
      ),
    ],
  });
  return callTool(root, "finalize_character", { draftId });
}

function createAndFinalizeBardOne(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  draftId: string,
) {
  const initial = callTool(root, "create_character_draft", { draftId });
  const classHoles = callTool(root, "fill_creation_holes", {
    draftId,
    expectedRevision: 0,
    fills: [
      choiceFillFromHole(
        initial.holes,
        "cc:draft:draft.progression.initial",
        "10:class_bard:level_1:maximum_hit_die",
      ),
      choiceFillFromHole(
        initial.holes,
        "cc:draft:draft.background",
        "background_soldier",
      ),
      choiceFillFromHole(
        initial.holes,
        "cc:draft:draft.species",
        "species_orc",
      ),
      abilityScoresFillFromHole(
        initial.holes,
        "cc:draft:draft.abilityScoreGeneration",
        {
          str: 8,
          dex: 14,
          con: 13,
          int: 10,
          wis: 12,
          cha: 15,
        },
      ),
      choiceFillFromHole(
        initial.holes,
        "cc:draft:draft.languages",
        "Dwarvish",
        "Goblin",
      ),
      choiceFillFromHole(
        initial.holes,
        "cc:draft:draft.alignment",
        "lawful_good",
      ),
    ],
  });
  const equipmentHoles = callTool(root, "fill_creation_holes", {
    draftId,
    expectedRevision: 1,
    fills: [
      choiceFillFromHole(
        creationHoles(classHoles),
        unitHoleId("class_bard", "class_skill_proficiency_choice"),
        "arcana",
        "perception",
        "persuasion",
      ),
      choiceFillFromHole(
        creationHoles(classHoles),
        unitHoleId("class_bard", "class_tool_proficiency_choice"),
        "tool:tool_lute",
        "tool:tool_flute",
        "tool:tool_drum",
      ),
      choiceFillFromHole(
        creationHoles(classHoles),
        unitHoleId("class_bard", "class_equipment_choice"),
        "option_b",
      ),
      choiceFillFromHole(
        creationHoles(classHoles),
        unitHoleId("class_bard", "class_cantrip_choices"),
        "dancing_lights",
        "vicious_mockery",
      ),
      choiceFillFromHole(
        creationHoles(classHoles),
        unitHoleId("class_bard", "class_prepared_spell_choices"),
        "charm_person",
        "color_spray",
        "dissonant_whispers",
        "healing_word",
      ),
      choiceFillFromHole(
        creationHoles(classHoles),
        unitHoleId("background_soldier", "background_ability_score_increase"),
        "two_and_one:str:con",
      ),
      choiceFillFromHole(
        creationHoles(classHoles),
        unitHoleId("background_soldier", "background_tool_choice"),
        "tool_dice_set",
      ),
      choiceFillFromHole(
        creationHoles(classHoles),
        unitHoleId("background_soldier", "background_equipment_choice"),
        "option_b",
      ),
    ],
  });
  const loadoutHoles = callTool(root, "fill_creation_holes", {
    draftId,
    expectedRevision: 2,
    fills: [
      choiceFillFromHole(
        creationHoles(equipmentHoles),
        unitHoleId("class_bard", "equipment_purchase"),
        "weapon_longsword",
        "weapon_dagger",
        "equipment_shield",
      ),
    ],
  });
  callTool(root, "fill_creation_holes", {
    draftId,
    expectedRevision: 3,
    fills: [
      choiceFillFromHole(
        creationHoles(loadoutHoles),
        loadoutHoleId("equipment_shield", "shield"),
        "wielded",
      ),
      choiceFillFromHole(
        creationHoles(loadoutHoles),
        loadoutHoleId("weapon_longsword", "weapon"),
        "wielded_one_handed",
      ),
    ],
  });
  return callTool(root, "finalize_character", { draftId });
}

function characterCombatant(
  draftId: string,
  combatantId: string,
  initiative: number,
) {
  return {
    kind: "characterSession",
    ammunitionStocks: [],
    characterId: testCharacterId(draftId),
    combatantId,
    initiative,
  };
}

function combatant(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  combatantId: string,
) {
  const found = callTool(
    root,
    "read_battle_state",
    {},
  ).snapshot.combatants.find(
    (candidate: { readonly combatantId: string }) =>
      candidate.combatantId === combatantId,
  );
  if (found === undefined)
    throw new Error(`Expected combatant: ${combatantId}`);
  return found;
}

function requireHole(
  holes: readonly {
    readonly kind: string;
    readonly holeId: string;
    readonly rollMode?: string;
  }[],
  kind: string,
) {
  const hole = holes.find((candidate) => candidate.kind === kind);
  if (hole === undefined) throw new Error(`Expected battle hole: ${kind}`);
  return hole;
}

type BattleActView = {
  readonly summary: string;
  readonly subject: BattleSubjectView;
  readonly presentation: BattleActPresentation;
  readonly initialHoles: readonly BattleHoleView[];
};

type BattleSubjectView =
  | BoundAttackSubjectView
  | CantripSubject
  | SpellSlotSubject
  | UnitFeatureSubject;

type BoundAttackSubjectView = {
  readonly tag: "action";
  readonly actorId: string;
  readonly action: "attack";
  readonly procedureRef: string;
  readonly attackAbility?: string;
  readonly attackDamageType?: string;
};

type BattleHoleView = {
  readonly kind: string;
  readonly holeId: string;
  readonly rollMode?: string;
};

function requireBattleAct(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  predicate: (act: BattleActView) => boolean,
  label: string,
): BattleActView {
  const act = callTool(root, "discover_battle_acts", {}).availableActs.find(
    (candidate: BattleActView) => predicate(candidate),
  );
  if (act === undefined) throw new Error(`Expected battle act: ${label}`);
  return act;
}

function requireAttackAct(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  actorId: string,
  attackName: string,
): BattleActView {
  const matchingActs = callTool(
    root,
    "discover_battle_acts",
    {},
  ).availableActs.filter(
    (act: BattleActView) =>
      act.subject.tag === "action" &&
      act.subject.actorId === actorId &&
      "action" in act.subject &&
      act.subject.action === "attack" &&
      (!("statBlockDamageNotation" in act.subject) ||
        act.subject.statBlockDamageNotation === undefined) &&
      act.summary === `Take the Attack action with ${attackName}.`,
  );
  const [act] = matchingActs;
  if (matchingActs.length !== 1 || act === undefined) {
    throw new Error(`Expected one rolled battle act: ${actorId} ${attackName}`);
  }
  return act;
}

function requireUnitFeatureAct(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  actorId: string,
  unitId: string,
): BattleActView & {
  readonly subject: BattleSubjectView & { readonly procedureRef: string };
} {
  const act = requireBattleAct(
    root,
    (act) =>
      act.subject.tag === "unitFeature" &&
      act.subject.actorId === actorId &&
      act.presentation.kind === "unit" &&
      act.presentation.unitId === unitId,
    `${actorId} ${unitId}`,
  );
  if (!("procedureRef" in act.subject)) {
    throw new Error(`Expected bound unit procedure: ${actorId} ${unitId}`);
  }
  return {
    ...act,
    subject: { ...act.subject, procedureRef: act.subject.procedureRef },
  };
}

function requireSpellAct(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  actorId: string,
  spellId: string,
): BattleActView & {
  readonly subject: BattleSubjectView & { readonly procedureRef: string };
} {
  const act = requireBattleAct(
    root,
    (act) =>
      act.subject.tag === "actionSpell" &&
      act.subject.actorId === actorId &&
      act.presentation.kind === "spell" &&
      act.presentation.invocation.spellId === spellId,
    `${actorId} ${spellId}`,
  );
  if (!("procedureRef" in act.subject)) {
    throw new Error(`Expected bound spell procedure: ${actorId} ${spellId}`);
  }
  return {
    ...act,
    subject: { ...act.subject, procedureRef: act.subject.procedureRef },
  };
}

type TriggeredSpellChoiceView = {
  readonly kind: string;
  readonly reactorId: string;
  readonly subject: { readonly procedureRef: string };
};

function requireTriggeredSpellChoice(
  payload: {
    readonly presentedInterruptChoices: readonly {
      readonly choice: TriggeredSpellChoiceView;
      readonly presentation: {
        readonly kind: string;
        readonly invocation?: {
          readonly spellId: string;
        };
      };
    }[];
  },
  reactorId: string,
  spellId: string,
): TriggeredSpellChoiceView {
  const matchingChoices = payload.presentedInterruptChoices.filter(
    ({ choice, presentation }) => {
      if (
        choice.kind !== "castTriggeredReactionSpell" ||
        choice.reactorId !== reactorId
      ) {
        return false;
      }
      return (
        presentation.kind === "spell" &&
        presentation.invocation?.spellId === spellId
      );
    },
  );
  const [presentedChoice] = matchingChoices;
  if (matchingChoices.length !== 1 || presentedChoice === undefined) {
    throw new Error(`Expected one ${spellId} triggered spell choice.`);
  }
  return presentedChoice.choice;
}

function resolveAttackWithShieldReaction(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
) {
  const act = requireAttackAct(root, "goblin-a", "Scimitar");
  const target = fillBattleSubject(root, act.subject, {
    kind: "targetChoice",
    holeId: requireHole(act.initialHoles, "targetChoice").holeId,
    value: "wizard",
  });
  const attackRoll = requireHole(target.result.holes, "attackRoll");
  const afterRoll = fillBattleSubject(
    root,
    target.result.subject ?? act.subject,
    {
      kind: "attackRoll",
      holeId: attackRoll.holeId,
      value: {
        total: 14,
        naturalD20: 10,
        ...("rollMode" in attackRoll ? { rollMode: attackRoll.rollMode } : {}),
      },
    },
  );
  const reactionHole = requireHole(afterRoll.result.holes, "interruptDecision");
  const shieldChoice = requireTriggeredSpellChoice(
    afterRoll,
    "wizard",
    "shield",
  );
  return callTool(root, "fill_battle_hole", {
    subject: afterRoll.result.subject ?? act.subject,
    fill: {
      kind: "interruptDecision",
      holeId: reactionHole.holeId,
      value: {
        kind: "resolve",
        responderId: "wizard",
        choice: {
          kind: "castTriggeredReactionSpell",
          procedureRef: shieldChoice.subject.procedureRef,
          fills: [],
        },
      },
    },
  });
}

function resolveUnitFeatureAct(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  actorId: string,
  unitId: string,
) {
  const act = requireUnitFeatureAct(root, actorId, unitId);
  return callTool(root, "resolve_battle_act", { subject: act.subject });
}

function resourcePoolRefForUnit(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  combatantIdText: string,
  unitId: string,
): string {
  const session = root.sessionStore.battleSession;
  if (session === null) {
    throw new Error("Expected active battle session.");
  }
  const actor = session.state.combatants.get(combatantId(combatantIdText));
  if (actor?.origin.kind !== "character") {
    throw new Error(
      `Expected character combatant resource owner: ${combatantIdText}`,
    );
  }
  const matchingOwnership = session.context.characters
    .get(combatantId(combatantIdText))
    ?.resourceOwnership.filter((candidate) => candidate.unit.id === unitId);
  const [ownership] = matchingOwnership ?? [];
  if (matchingOwnership?.length !== 1 || ownership === undefined) {
    throw new Error(
      `Expected one ${unitId} resource owner for ${combatantIdText}`,
    );
  }
  const resource = actor.origin.resources.find(
    (candidate) => candidate.resourcePoolRef === ownership.resourcePoolRef,
  );
  if (resource === undefined) {
    throw new Error(`Expected ${unitId} resource for ${combatantIdText}`);
  }
  return resource.resourcePoolRef;
}

function grantBardicInspiration(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
) {
  const act = requireUnitFeatureAct(root, "bard", "bard_bardic_inspiration");
  const target = requireHole(act.initialHoles, "targetChoice");
  return callTool(root, "fill_battle_hole", {
    subject: act.subject,
    fill: {
      kind: "targetChoice",
      holeId: target.holeId,
      value: "fighter",
      spatialFacts: [
        {
          kind: "bardicInspirationTargetWithinRange",
          bardId: "bard",
          targetId: "fighter",
          sourceProcedureRef: act.subject.procedureRef,
          rangeFeet: 60,
        },
      ],
    },
  });
}

function resolveSecondWind(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  actorId: string,
  healingResults: readonly number[],
) {
  const act = requireUnitFeatureAct(root, actorId, "fighter_second_wind");
  const healing = requireHole(act.initialHoles, "rolledDice");
  return fillBattleSubject(root, act.subject, {
    kind: "rolledDice",
    holeId: healing.holeId,
    value: [{ results: healingResults }],
  });
}

function resolveWeaponAttack(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  input: {
    readonly actorId: string;
    readonly attackName: string;
    readonly targetId: string;
    readonly total: number;
    readonly naturalD20: number;
    readonly damageResults: readonly number[];
  },
) {
  const act = requireAttackAct(root, input.actorId, input.attackName);
  const target = fillBattleSubject(root, act.subject, {
    kind: "targetChoice",
    holeId: requireHole(act.initialHoles, "targetChoice").holeId,
    value: input.targetId,
  });
  const attackRoll = requireHole(target.result.holes, "attackRoll");
  const afterAttackRoll = fillBattleSubject(
    root,
    target.result.subject ?? act.subject,
    {
      kind: "attackRoll",
      holeId: attackRoll.holeId,
      value: {
        total: input.total,
        naturalD20: input.naturalD20,
        ...("rollMode" in attackRoll ? { rollMode: attackRoll.rollMode } : {}),
      },
    },
  );
  const damage = requireHole(afterAttackRoll.result.holes, "rolledDice");
  const afterDamage = fillBattleSubject(
    root,
    afterAttackRoll.result.subject ?? act.subject,
    {
      kind: "rolledDice",
      holeId: damage.holeId,
      value: [{ results: input.damageResults }],
    },
  );
  if (afterDamage.result?.tag !== "needsHoles") return afterDamage;
  const disposition = afterDamage.result.holes.find(
    (hole: { readonly kind: string }) =>
      hole.kind === "attackDamageDisposition",
  );
  if (disposition === undefined) return afterDamage;
  return callTool(root, "fill_battle_hole", {
    subject: afterDamage.result.subject ?? act.subject,
    fill: {
      kind: "attackDamageDisposition",
      holeId: disposition.holeId,
      value: { kind: "ordinaryDamage" },
    },
  });
}

function castMagicMissile(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  actorId: string,
  allocations: readonly { readonly targetId: string; readonly count: number }[],
  damageResults: readonly number[],
) {
  const act = requireSpellAct(root, actorId, "magic_missile");
  const targetAllocation = requireHole(
    act.initialHoles,
    "spellTargetAllocation",
  );
  const afterTargets = fillBattleSubject(root, act.subject, {
    kind: "spellTargetAllocation",
    holeId: targetAllocation.holeId,
    value: { allocations },
    spatialFacts: allocations.map(({ targetId }) => ({
      kind: "spellTarget",
      casterId: actorId,
      targetId,
      sourceProcedureRef: act.subject.procedureRef,
    })),
  });
  const damage = requireHole(afterTargets.result.holes, "rolledDice");
  return fillBattleSubject(root, afterTargets.result.subject ?? act.subject, {
    kind: "rolledDice",
    holeId: damage.holeId,
    value: [{ results: damageResults }],
  });
}

function resolveSpellAttack(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  input: {
    readonly actorId: string;
    readonly spellId: string;
    readonly targetId: string;
    readonly total: number;
    readonly naturalD20: number;
    readonly damageResults: readonly number[];
  },
) {
  const act = requireSpellAct(root, input.actorId, input.spellId);
  const target = fillBattleSubject(root, act.subject, {
    kind: "targetChoice",
    holeId: requireHole(act.initialHoles, "targetChoice").holeId,
    value: input.targetId,
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId: input.actorId,
        targetId: input.targetId,
        sourceProcedureRef: act.subject.procedureRef,
      },
    ],
  });
  const attackRoll = requireHole(target.result.holes, "attackRoll");
  const afterAttackRoll = fillBattleSubject(
    root,
    target.result.subject ?? act.subject,
    {
      kind: "attackRoll",
      holeId: attackRoll.holeId,
      value: {
        total: input.total,
        naturalD20: input.naturalD20,
        ...("rollMode" in attackRoll ? { rollMode: attackRoll.rollMode } : {}),
      },
    },
  );
  const damage = requireHole(afterAttackRoll.result.holes, "rolledDice");
  return fillBattleSubject(
    root,
    afterAttackRoll.result.subject ?? act.subject,
    {
      kind: "rolledDice",
      holeId: damage.holeId,
      value: [{ results: input.damageResults }],
    },
  );
}

function endTurn(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  actorId: string,
  deathSaveRoll?: number,
) {
  const result = callTool(root, "end_turn", { actorId });
  if (result.result?.tag !== "needsHoles") return result;
  const deathSave = result.result.holes.find(
    (hole: { readonly kind: string }) => hole.kind === "deathSavingThrow",
  );
  if (deathSave === undefined || deathSaveRoll === undefined) {
    throw new Error(`Unexpected End Turn holes for ${actorId}`);
  }
  return callTool(root, "fill_battle_hole", {
    subject: result.result.subject ?? {
      tag: "runtimeCommand",
      actorId,
      command: "endTurn",
    },
    fill: {
      kind: "deathSavingThrow",
      holeId: deathSave.holeId,
      value: deathSaveRoll,
    },
  });
}

type CantripSubject = {
  tag: "actionSpell";
  actorId: string;
  invocation: { tag: "cantrip"; spellId: string; procedure: string };
  mode: { tag: "cast" };
};

type SpellSlotSubject = {
  tag: "actionSpell";
  actorId: string;
  invocation: {
    tag: "spellSlot";
    spellId: string;
    slotLevel: number;
    procedure: string;
  };
  mode: { tag: "cast" };
};

type UnitFeatureSubject = {
  tag: "unitFeature";
  actorId: string;
  unitId: string;
};

function fillBattleSubject(
  root: ReturnType<typeof createMcpPlaySessionRoot>,
  subject:
    | BoundAttackSubjectView
    | CantripSubject
    | SpellSlotSubject
    | UnitFeatureSubject,
  fill: {
    readonly kind:
      | "targetChoice"
      | "spellTargetAllocation"
      | "attackRoll"
      | "rolledDice";
    readonly holeId: string;
    readonly spatialFacts?: readonly unknown[];
    readonly value: unknown;
  },
) {
  const procedureRef = "procedureRef" in subject ? subject.procedureRef : null;
  const battleFill =
    fill.kind === "targetChoice" && fill.spatialFacts === undefined
      ? {
          ...fill,
          spatialFacts:
            subject.tag === "actionSpell" && procedureRef !== null
              ? [
                  {
                    kind: "spellTarget",
                    casterId: subject.actorId,
                    targetId: String(fill.value),
                    sourceProcedureRef: procedureRef,
                  },
                ]
              : subject.tag === "action" && procedureRef !== null
                ? [
                    {
                      kind: "attackTargetInMeleeReach",
                      actorId: subject.actorId,
                      targetId: String(fill.value),
                      procedureRef,
                      ...(!("attackAbility" in subject) ||
                      subject.attackAbility === undefined
                        ? {}
                        : { attackAbility: subject.attackAbility }),
                      ...(!("attackDamageType" in subject) ||
                      subject.attackDamageType === undefined
                        ? {}
                        : { attackDamageType: subject.attackDamageType }),
                    },
                  ]
                : [],
        }
      : fill.kind === "spellTargetAllocation" &&
          fill.spatialFacts === undefined &&
          procedureRef !== null &&
          typeof fill.value === "object" &&
          fill.value !== null &&
          "allocations" in fill.value &&
          Array.isArray(fill.value.allocations)
        ? {
            ...fill,
            spatialFacts: fill.value.allocations.map((allocation) => ({
              kind: "spellTarget",
              casterId: subject.actorId,
              targetId: String(allocation.targetId),
              sourceProcedureRef: procedureRef,
            })),
          }
        : fill;
  return callTool(root, "fill_battle_hole", { subject, fill: battleFill });
}
