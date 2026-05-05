import { describe, expect, test } from "vitest";
import { Either, Option } from "effect";

import {
  ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE,
  REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
  SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
  battleId,
  battleCombatantSide,
  characterId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  snapshotBattle,
  WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE,
  type BattleState,
} from "@dnd/battle-runtime";
import {
  characterDraftId,
  characterClassLevel,
  classUnitIdFromClassUnit,
  createCharacterDraft,
  creationChoiceOptionId,
  creationHoleId,
  fillCreationHoles,
  finalizeCharacterDraft,
  hitDieSize,
  hitDieTotal,
  type CharacterDraft,
  type CharacterBuild,
  type CreationFill,
  type CreationHole,
  type CreationHoleIdText,
} from "@dnd/character-creation-runtime";
import {
  Hp,
  hp,
  movementFeet,
  resourceCount,
  spellSlotLevel,
} from "@dnd/shared/types";

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
import {
  GENERIC_COMBAT_ACTION_LABELS,
  GENERIC_READY_TRIGGERS,
} from "../test-support/battle-act-labels.ts";
import {
  loadoutHoleId,
  unitHoleId,
} from "../test-support/creation-hole-ids.ts";
import type { UnitRecord } from "@dnd/surface/surface/types";

function startBattleFromCharacterBuildAndStatBlockRight(
  input: Parameters<typeof startBattleFromCharacterBuildAndStatBlock>[0],
): BattleState {
  const result = startBattleFromCharacterBuildAndStatBlock(input);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function availableCharacterSessionRight(
  input: Parameters<typeof availableCharacterSession>[0],
) {
  const result = availableCharacterSession(input);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function expectRight<T, E>(result: Either.Either<T, E>): T {
  if (Either.isLeft(result)) {
    throw new Error(
      `Expected Either.right, received ${JSON.stringify(result.left)}`,
    );
  }

  return result.right;
}

const fighterId = combatantId("fighter");
const goblinId = combatantId("goblin");
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");

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
    expect(Either.isRight(selected) ? selected.right.id : undefined).toBe(
      "stat_block_goblin_warrior",
    );
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
    const state = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-root"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Orc Soldier Fighter",
        build: fighterCharacterBuild(root.unitLibrary),
        initiative: initiativeScore(12),
        side: partySide,
      },
      statBlockBattleInput: {
        combatantId: goblinId,
        statBlock: root.statBlockCatalog.requireStatBlock(
          "stat_block_goblin_warrior",
        ),
        initiative: initiativeScore(11),
        side: oppositionSide,
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
    expect(discoverBattleActs(state).map((act) => act.subject)).toEqual(
      expect.arrayContaining([
        {
          tag: "action",
          actorId: fighterId,
          action: "attack",
          attackName: "Longsword",
        },
        {
          tag: "action",
          actorId: fighterId,
          action: "attack",
          attackName: "Unarmed Strike",
        },
      ]),
    );
  });

  test("projects all progression class levels at the battle boundary", () => {
    const root = createMcpCompositionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const wizard = root.unitLibrary.requireUnit("class_wizard");
    if (wizard.kind !== "class") {
      throw new Error("Expected Wizard class Unit.");
    }
    const wizardClassUnitId = expectRight(classUnitIdFromClassUnit(wizard));
    const multiclassBuild: CharacterBuild = {
      ...build,
      progression: {
        startingClass: expectRight(
          classUnitIdFromClassUnit(
            root.unitLibrary.requireUnit("class_fighter"),
          ),
        ),
        advancements: [
          {
            classUnitId: wizardClassUnitId,
            hitPointRule: { tag: "fixedHigherLevelGain" },
          },
        ],
      },
      hitPoints: {
        maximum: hp(
          build.hitPoints.maximum +
            Math.max(
              1,
              Math.floor(wizard.hitPointDie / 2) +
                1 +
                Math.floor((build.abilityScores.con - 10) / 2),
            ),
        ),
        hitDice: [
          ...build.hitPoints.hitDice,
          {
            classUnitId: wizard.id,
            dieSize: hitDieSize(wizard.hitPointDie),
            total: hitDieTotal(1),
          },
        ],
      },
    };

    const state = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-root-multiclass"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-wizard-character"),
        displayName: "Orc Soldier Fighter / Wizard",
        build: multiclassBuild,
        initiative: initiativeScore(12),
        side: partySide,
      },
      statBlockBattleInput: {
        combatantId: goblinId,
        statBlock: root.statBlockCatalog.requireStatBlock(
          "stat_block_goblin_warrior",
        ),
        initiative: initiativeScore(11),
        side: oppositionSide,
      },
      unitLibrary: root.unitLibrary,
    });

    expect(state.combatants.get(fighterId)?.origin).toMatchObject({
      kind: "character",
      classLevels: [
        { className: "fighter", level: 1 },
        { className: "wizard", level: 1 },
      ],
    });
  });

  test("derives base Unarmed Strike when no weapon is selected", () => {
    const root = createMcpCompositionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const state = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-root-unarmed"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Orc Soldier Fighter",
        build: {
          ...build,
          equipment: {
            armor: build.equipment.armor,
            shield: build.equipment.shield,
          },
        },
        initiative: initiativeScore(12),
        side: partySide,
      },
      statBlockBattleInput: {
        combatantId: goblinId,
        statBlock: root.statBlockCatalog.requireStatBlock(
          "stat_block_goblin_warrior",
        ),
        initiative: initiativeScore(11),
        side: oppositionSide,
      },
      unitLibrary: root.unitLibrary,
    });
    const combatant = state.combatants.get(fighterId);

    expect(combatant?.origin).toMatchObject({
      kind: "character",
      attack: null,
      unarmedStrike: {
        kind: "unarmedStrike",
        effect: {
          kind: "damage",
          damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
        },
        attackAbility: "str",
        attackAbilityModifier: 3,
        attackBonus: 5,
        damageAbilityModifier: 3,
      },
    });
    expect(discoverBattleActs(state).map((act) => act.subject)).toContainEqual({
      tag: "action",
      actorId: fighterId,
      action: "attack",
      attackName: "Unarmed Strike",
    });
  });

  test("admits only supported authored critical-range Unit hooks at the battle support boundary", () => {
    const root = createMcpCompositionRoot();
    const improvedCriticalUnit = root.unitLibrary.requireUnit(
      "fighter_improved_critical",
    );
    if (improvedCriticalUnit.kind !== "class_feature") {
      throw new Error("Expected Improved Critical class-feature Unit.");
    }
    const supportedLibrary = fighterUnitLibraryWithClassFeatureGrant(
      root.unitLibrary,
      improvedCriticalUnit,
    );
    const supportedBuild = fighterCharacterBuildAtLevel(
      supportedLibrary,
      improvedCriticalUnit.acquiredAtLevel,
    );
    const supportedState = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-supported-critical-range"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Champion Fighter",
        build: supportedBuild,
        initiative: initiativeScore(12),
        side: partySide,
      },
      statBlockBattleInput: {
        combatantId: goblinId,
        statBlock: root.statBlockCatalog.requireStatBlock(
          "stat_block_goblin_warrior",
        ),
        initiative: initiativeScore(11),
        side: oppositionSide,
      },
      unitLibrary: supportedLibrary,
    });

    expect(
      characterUnitRef(supportedState, fighterId, "fighter_improved_critical"),
    ).toMatchObject({
      supportProfiles: [WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE],
    });

    const unsupportedCriticalRangeUnit: UnitRecord = {
      ...improvedCriticalUnit,
      id: "fighter_unsupported_critical_range",
      mechanics: {
        family: "passive",
        grants: [
          {
            kind: "modify_crit_range",
            threshold: 18,
            attackRollFilter: "weapon_or_unarmed_strike",
          },
        ],
      },
    };
    const unsupportedLibrary = fighterUnitLibraryWithClassFeatureGrant(
      root.unitLibrary,
      unsupportedCriticalRangeUnit,
    );
    const unsupportedBuild = fighterCharacterBuildAtLevel(
      unsupportedLibrary,
      unsupportedCriticalRangeUnit.acquiredAtLevel,
    );
    expect(() =>
      startBattleFromCharacterBuildAndStatBlockRight({
        battleId: battleId("battle-unsupported-critical-range"),
        character: {
          combatantId: fighterId,
          characterId: characterId("fighter-character"),
          displayName: "Unsupported Critical Range Fighter",
          build: unsupportedBuild,
          initiative: initiativeScore(12),
          side: partySide,
        },
        statBlockBattleInput: {
          combatantId: goblinId,
          statBlock: root.statBlockCatalog.requireStatBlock(
            "stat_block_goblin_warrior",
          ),
          initiative: initiativeScore(11),
          side: oppositionSide,
        },
        unitLibrary: unsupportedLibrary,
      }),
    ).toThrow(
      `Unsupported battle critical-range Unit hook: ${unsupportedCriticalRangeUnit.id}.`,
    );
  });

  test("admits attack-damage rider Unit hooks through their owning class feature", () => {
    const root = createMcpCompositionRoot();
    const rogueBuild = rogueCharacterBuild(root.unitLibrary);
    const supportedLibrary = rogueBattleUnitLibrary(root);
    const supportedState = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-supported-attack-damage-rider"),
      character: {
        combatantId: fighterId,
        characterId: characterId("rogue-character"),
        displayName: "Orc Soldier Rogue",
        build: rogueBuild,
        initiative: initiativeScore(12),
        side: partySide,
      },
      statBlockBattleInput: {
        combatantId: goblinId,
        statBlock: root.statBlockCatalog.requireStatBlock(
          "stat_block_goblin_warrior",
        ),
        initiative: initiativeScore(11),
        side: oppositionSide,
      },
      unitLibrary: supportedLibrary,
    });

    expect(
      characterUnitRef(supportedState, fighterId, "rogue_sneak_attack"),
    ).toMatchObject({
      supportProfiles: [ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE],
    });

    const sneakAttackUnit = root.unitLibrary.requireUnit("rogue_sneak_attack");
    expect(sneakAttackUnit).toMatchObject({
      kind: "class_feature",
      className: "rogue",
      mechanics: {
        effect: {
          dice: {
            kind: "class_level_table",
          },
        },
      },
    });
  });

  test("admits only save-damage replacement Unit hooks with Evasion-style mechanics", () => {
    const root = createMcpCompositionRoot();
    const evasionBuild = rogueCharacterBuild(root.unitLibrary, {
      level: 7,
    });
    const supportedState = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-supported-save-damage-replacement"),
      character: {
        combatantId: fighterId,
        characterId: characterId("rogue-character"),
        displayName: "Orc Soldier Rogue",
        build: evasionBuild,
        initiative: initiativeScore(12),
        side: partySide,
      },
      statBlockBattleInput: {
        combatantId: goblinId,
        statBlock: root.statBlockCatalog.requireStatBlock(
          "stat_block_goblin_warrior",
        ),
        initiative: initiativeScore(11),
        side: oppositionSide,
      },
      unitLibrary: rogueBattleUnitLibrary(root),
    });

    expect(
      characterUnitRef(supportedState, fighterId, "rogue_evasion"),
    ).toMatchObject({
      supportProfiles: [SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE],
    });

    const evasionUnit = root.unitLibrary.requireUnit("rogue_evasion");
    if (
      evasionUnit.kind !== "class_feature" ||
      evasionUnit.mechanics.family !== "save_damage_replacement"
    ) {
      throw new Error("Expected Evasion class-feature Unit.");
    }
    const unsupportedEvasionUnit: UnitRecord = {
      ...evasionUnit,
      mechanics: {
        ...evasionUnit.mechanics,
        trigger: {
          ...evasionUnit.mechanics.trigger,
          ability: "con",
        },
      },
    };

    expect(() =>
      startBattleFromCharacterBuildAndStatBlockRight({
        battleId: battleId("battle-unsupported-save-damage-replacement"),
        character: {
          combatantId: fighterId,
          characterId: characterId("rogue-character"),
          displayName: "Unsupported Evasion Rogue",
          build: evasionBuild,
          initiative: initiativeScore(12),
          side: partySide,
        },
        statBlockBattleInput: {
          combatantId: goblinId,
          statBlock: root.statBlockCatalog.requireStatBlock(
            "stat_block_goblin_warrior",
          ),
          initiative: initiativeScore(11),
          side: oppositionSide,
        },
        unitLibrary: rogueBattleUnitLibrary(root, {
          evasionUnit: unsupportedEvasionUnit,
        }),
      }),
    ).toThrow("Unsupported battle save-damage replacement Unit hook");
  });

  test("admits reaction roll or damage reduction Unit hooks through support profiles", () => {
    const root = createMcpCompositionRoot();
    const rogueBuild = rogueCharacterBuild(root.unitLibrary, {
      level: 5,
    });
    const state = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-supported-reaction-modifier"),
      character: {
        combatantId: fighterId,
        characterId: characterId("rogue-character"),
        displayName: "Orc Soldier Rogue",
        build: rogueBuild,
        initiative: initiativeScore(12),
        side: partySide,
      },
      statBlockBattleInput: {
        combatantId: goblinId,
        statBlock: root.statBlockCatalog.requireStatBlock(
          "stat_block_goblin_warrior",
        ),
        initiative: initiativeScore(11),
        side: oppositionSide,
      },
      unitLibrary: rogueBattleUnitLibrary(root),
    });

    expect(
      characterUnitRef(state, fighterId, "rogue_uncanny_dodge"),
    ).toMatchObject({
      supportProfiles: [REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE],
    });

    const uncannyDodgeUnit = root.unitLibrary.requireUnit(
      "rogue_uncanny_dodge",
    );
    if (
      uncannyDodgeUnit.kind !== "class_feature" ||
      uncannyDodgeUnit.mechanics.family !== "reaction_roll_or_damage_reduction"
    ) {
      throw new Error("Expected Uncanny Dodge reaction modifier Unit.");
    }
    const unsupportedUnit: UnitRecord = {
      ...uncannyDodgeUnit,
      provenance: {
        kind: "xphb",
        section: "structured-input-only",
      },
      mechanics: {
        family: "reaction_roll_or_damage_reduction",
        modifiers: [
          {
            kind: "ability_check_reduction",
            trigger: {
              kind: "creature_succeeds_ability_check",
              rangeFeet: 60,
              requiresVisibleCreature: true,
            },
            reduction: { kind: "bardic_inspiration_die" },
          },
        ],
      },
    };
    const unsupportedBuild = {
      ...rogueBuild,
      features: rogueBuild.features,
    };
    expect(() =>
      startBattleFromCharacterBuildAndStatBlockRight({
        battleId: battleId("battle-unsupported-reaction-modifier"),
        character: {
          combatantId: fighterId,
          characterId: characterId("rogue-character"),
          displayName: "Unsupported Rogue",
          build: unsupportedBuild,
          initiative: initiativeScore(12),
          side: partySide,
        },
        statBlockBattleInput: {
          combatantId: goblinId,
          statBlock: root.statBlockCatalog.requireStatBlock(
            "stat_block_goblin_warrior",
          ),
          initiative: initiativeScore(11),
          side: oppositionSide,
        },
        unitLibrary: rogueBattleUnitLibrary(root, {
          uncannyDodgeUnit: unsupportedUnit,
        }),
      }),
    ).toThrow("Unsupported battle reaction roll or damage reduction Unit hook");
  });

  test("carries finalized Fighter 2 Action Surge resources into battle discovery", () => {
    const root = createMcpCompositionRoot();
    const state = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-root-fighter-two"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Orc Soldier Fighter 2",
        build: fighterTwoCharacterBuild(root.unitLibrary),
        initiative: initiativeScore(12),
        side: partySide,
      },
      statBlockBattleInput: {
        combatantId: goblinId,
        statBlock: root.statBlockCatalog.requireStatBlock(
          "stat_block_goblin_warrior",
        ),
        initiative: initiativeScore(11),
        side: oppositionSide,
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

  test("starts battle from a CharacterBuild with two Light weapons for the off-hand runtime path", () => {
    const root = createMcpCompositionRoot();
    const state = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-root-off-hand"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Orc Soldier Fighter",
        build: fighterTwoLightWeaponBuild(root.unitLibrary),
        initiative: initiativeScore(12),
        side: partySide,
      },
      statBlockBattleInput: {
        combatantId: goblinId,
        statBlock: root.statBlockCatalog.requireStatBlock(
          "stat_block_goblin_warrior",
        ),
        initiative: initiativeScore(11),
        side: oppositionSide,
      },
      unitLibrary: root.unitLibrary,
    });

    expect(snapshotBattle(state).combatants).toContainEqual(
      expect.objectContaining({
        combatantId: fighterId,
        hands: { left: "offWeapon", right: "mainWeapon" },
      }),
    );
    expect(
      discoverBattleActs(state).map((act) => act.subject),
    ).not.toContainEqual({
      tag: "bonusAction",
      actorId: fighterId,
      action: "offHandAttack",
      attackName: "Dagger",
    });
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
        progressionFill: expect.stringContaining("draft.progression.initial"),
        choiceFill: expect.stringContaining('"kind":"choice"'),
        attackRollFill: expect.stringContaining('"kind":"attackRoll"'),
      },
    });
    expect(workflow.lifecycle).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "draft.progression.initial choice is the whole Character Progression profile",
        ),
      ]),
    );
    expect(workflow.limits).toEqual(
      expect.arrayContaining([
        expect.stringContaining("does not expose a later level-1 class-entry"),
      ]),
    );

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
        expect.objectContaining({
          holeId: "cc:draft:draft.progression.initial",
          options: expect.arrayContaining([
            expect.objectContaining({
              label: expect.stringContaining("Fighter 1"),
              unitRef: { unitId: "class_fighter" },
            }),
            expect.objectContaining({
              label: expect.stringContaining("Fighter 2"),
              unitRef: { unitId: "class_fighter" },
            }),
            expect.objectContaining({
              label: expect.stringContaining("Wizard 1"),
              unitRef: { unitId: "class_wizard" },
            }),
          ]),
        }),
      ]),
    });
  });

  test("documents progression fills as atomic profiles in the MCP input schema", () => {
    const fillTool = characterToolDefinitions.find(
      (tool) => tool.name === "fill_creation_holes",
    );
    expect(fillTool).toBeDefined();
    const schemaText = JSON.stringify(fillTool?.inputSchema);

    expect(schemaText).toContain(
      "there is no separate level-1 class-entry hole",
    );
    expect(schemaText).toContain(
      "starting class plus any post-start advancement entries",
    );
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
            side: "party",
          },
          {
            kind: "statBlock",
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 7,
            side: "opposition",
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
    ).toEqual([
      "Attack",
      "Attack",
      ...GENERIC_COMBAT_ACTION_LABELS,
      "Second Wind",
      "Move",
      "End Turn",
    ]);
    expect(
      read.snapshot.acts
        .filter((act: { label: string }) => act.label === "Ready")
        .map(
          (act: { subject: { readonly readyTrigger?: string } }) =>
            act.subject.readyTrigger,
        ),
    ).toEqual([...GENERIC_READY_TRIGGERS]);
    expect(read.battleState.combatants).toHaveLength(2);
  });

  test("fills a promoted battle movement hole through MCP", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-battle-movement";
    createFinalizedFighterSheet(root, draftId);
    readPayload(
      handleToolCall(root, "select_stat_block", {
        statBlockId: "stat_block_goblin_warrior",
      }),
    );
    readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-movement",
        initialCombatants: [
          {
            kind: "characterSession",
            sourceDraftId: draftId,
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
          },
        ],
      }),
    );

    const moved = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: { tag: "runtimeCommand", actorId: "fighter", command: "move" },
        fill: {
          kind: "movement",
          holeId: "battle:movement",
          value: {
            movementCostFeet: 10,
            distanceMovedFeet: 10,
            destinationDistances: [{ combatantId: "goblin", feet: 4 }],
          },
        },
      }),
    );

    expect(moved.result.tag).toBe("resolved");
    expect(moved.battleState.combatants).toContainEqual(
      expect.objectContaining({
        combatantId: "fighter",
        movementSpentFeet: 10,
      }),
    );
    expect(moved.battleState.combatantDistances).toEqual(
      expect.arrayContaining([
        { from: "fighter", to: "goblin", feet: 4 },
        { from: "goblin", to: "fighter", feet: 4 },
      ]),
    );
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
            side: "party",
          },
          {
            kind: "characterSession",
            sourceDraftId: secondDraftId,
            combatantId: "second-fighter",
            initiative: 17,
            side: "party",
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
            side: "party",
          },
          {
            kind: "statBlock",
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 7,
            side: "opposition",
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
            side: "party",
          },
          {
            kind: "statBlock",
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "second-goblin",
            initiative: 8,
            side: "opposition",
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
      hitPoints: { tag: "positive", currentHp: 12 },
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
            side: "party",
          },
          {
            kind: "statBlock",
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 7,
            side: "opposition",
          },
        ],
      }),
    );

    const discovered = readPayload(
      handleToolCall(root, "discover_battle_acts", {}),
    );
    expect(discovered.snapshot).toMatchObject({
      currentActorId: "fighter",
      acts: expect.arrayContaining([
        expect.objectContaining({
          label: "Attack",
          subject: expect.objectContaining({
            tag: "action",
            actorId: "fighter",
            action: "attack",
            attackName: "Longsword",
          }),
          initialHoles: [
            expect.objectContaining({
              kind: "targetChoice",
              holeId: "battle:attack:target",
              choices: ["goblin"],
            }),
          ],
        }),
        expect.objectContaining({
          label: "Second Wind",
          subject: expect.objectContaining({
            tag: "unitFeature",
            actorId: "fighter",
            unitId: "fighter_second_wind",
          }),
        }),
        expect.objectContaining({
          label: "Move",
          subject: expect.objectContaining({
            tag: "runtimeCommand",
            actorId: "fighter",
            command: "move",
          }),
        }),
        expect.objectContaining({
          label: "End Turn",
          subject: expect.objectContaining({
            tag: "runtimeCommand",
            actorId: "fighter",
            command: "endTurn",
          }),
        }),
      ]),
    });

    const afterTarget = readPayload(
      handleToolCall(root, "fill_battle_hole", {
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
      }),
    );
    expect(afterTarget.result).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "attackRoll", holeId: "battle:attack:roll" }],
    });
    expect(afterTarget.session.transientBattleFills).toMatchObject({
      subject: {
        tag: "action",
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
      }),
    );
    expect(afterDamage.result.tag).toBe("resolved");
    expect(afterDamage.battleState.combatants).toEqual([
      expect.objectContaining({ combatantId: "fighter", hp: 12 }),
      expect.objectContaining({ combatantId: "goblin", hp: 2 }),
    ]);
    expect(
      afterDamage.snapshot.acts.map((act: { label: string }) => act.label),
    ).toEqual(["Second Wind", "Move", "End Turn"]);
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
    expect(goblinActs.snapshot.acts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Attack",
          subject: expect.objectContaining({
            tag: "action",
            actorId: "goblin",
            action: "attack",
            attackName: "Scimitar",
          }),
        }),
        expect.objectContaining({
          label: "Attack",
          subject: expect.objectContaining({
            tag: "action",
            actorId: "goblin",
            action: "attack",
            attackName: "Shortbow",
          }),
        }),
        expect.objectContaining({ label: "Move" }),
        expect.objectContaining({ label: "End Turn" }),
      ]),
    );
    expect(
      goblinActs.snapshot.acts.map((act: { label: string }) => act.label),
    ).toEqual([
      "Attack",
      "Attack",
      ...GENERIC_COMBAT_ACTION_LABELS,
      "Move",
      "End Turn",
    ]);

    readPayload(
      handleToolCall(root, "fill_battle_hole", {
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
      }),
    );
    const afterGoblinAttackRoll = readPayload(
      handleToolCall(root, "fill_battle_hole", {
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
      }),
    );
    expect(afterGoblinDamage.result.tag).toBe("resolved");
    expect(afterGoblinDamage.battleState.combatants).toEqual([
      expect.objectContaining({ combatantId: "fighter", hp: 5 }),
      expect.objectContaining({ combatantId: "goblin", hp: 2 }),
    ]);
  });

  test("replays visible Sneak Attack rider hole and fill shape through MCP battle tools", () => {
    const root = createMcpCompositionRoot();
    root.sessionStore.battleState =
      startBattleFromCharacterBuildAndStatBlockRight({
        battleId: battleId("battle:mcp-sneak-attack-rider"),
        character: {
          combatantId: fighterId,
          characterId: characterId("rogue-character"),
          displayName: "Orc Soldier Rogue",
          build: rogueCharacterBuild(root.unitLibrary),
          initiative: initiativeScore(18),
          side: partySide,
        },
        statBlockBattleInput: {
          combatantId: goblinId,
          statBlock: root.statBlockCatalog.requireStatBlock(
            "stat_block_goblin_warrior",
          ),
          initiative: initiativeScore(7),
          side: oppositionSide,
        },
        unitLibrary: rogueBattleUnitLibrary(root),
      });
    const allyId = combatantId("sneak-attack-ally");
    const battleState = root.sessionStore.battleState;
    const rogue = battleState.combatants.get(fighterId);
    if (rogue === undefined) {
      throw new Error("Expected rogue combatant in MCP Sneak Attack fixture.");
    }
    const combatants = new Map(battleState.combatants).set(allyId, {
      ...rogue,
      combatantId: allyId,
      displayName: "Sneak Attack Ally",
    });
    const combatantDistances = new Map(battleState.combatantDistances);
    const setDistance = (
      from: typeof fighterId,
      to: typeof fighterId,
      feet: ReturnType<typeof movementFeet>,
    ): void => {
      combatantDistances.set(
        from,
        new Map(combatantDistances.get(from)).set(to, feet),
      );
    };
    setDistance(fighterId, goblinId, movementFeet(5));
    setDistance(goblinId, fighterId, movementFeet(5));
    setDistance(fighterId, allyId, movementFeet(5));
    setDistance(allyId, fighterId, movementFeet(5));
    setDistance(allyId, goblinId, movementFeet(5));
    setDistance(goblinId, allyId, movementFeet(5));
    root.sessionStore.battleState = {
      ...battleState,
      combatants,
      combatantDistances,
    };
    root.sessionStore.transientBattleFills = null;

    fillBattleHoleThroughTool(root, "fighter", "Dagger", {
      kind: "targetChoice",
      holeId: "battle:attack:target",
      value: "goblin",
    });
    const afterAttackRoll = fillBattleHoleThroughTool(
      root,
      "fighter",
      "Dagger",
      {
        kind: "attackRoll",
        holeId: "battle:attack:roll",
        value: { total: 16, naturalD20: 14 },
      },
    );

    expect(afterAttackRoll.result).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "rolledDice",
          holeId: "battle:attack:damage-result:1d4+3-piercing",
          attackDamageRiders: [
            {
              unitId: "rogue_sneak_attack",
              label: "Sneak Attack",
              damage: { dice: 1, dieSize: 6, damageType: "piercing" },
            },
          ],
        },
      ],
    });

    const afterDamage = fillBattleHoleThroughTool(root, "fighter", "Dagger", {
      kind: "rolledDice",
      holeId: "battle:attack:damage-result:1d4+3-piercing",
      selectedAttackDamageRiderUnitIds: ["rogue_sneak_attack"],
      value: [{ results: [2] }, { results: [3] }],
    });

    expect(afterDamage.result).toMatchObject({ tag: "resolved" });
    expect(afterDamage.battleState.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: "fighter", hp: 10 }),
        expect.objectContaining({ combatantId: "goblin", hp: 2 }),
      ]),
    );
    expect(
      afterDamage.battleState.currentTurnResources
        .attackDamageRidersUsedThisTurn,
    ).toEqual([{ attackerId: "fighter", unitId: "rogue_sneak_attack" }]);
    expect(afterDamage.session).toMatchObject({ transientBattleFills: null });
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
            side: "party",
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
          side: "opposition",
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
              side: "party",
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
            side: "party",
          },
          {
            kind: "characterSession",
            sourceDraftId: "draft:mcp-missing-additional-secondary",
            combatantId: "second-fighter",
            initiative: 16,
            side: "party",
          },
          {
            kind: "statBlock",
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 7,
            side: "opposition",
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
          side: "party",
        },
        {
          kind: "statBlock",
          statBlockId: "stat_block_goblin_warrior",
          combatantId: "goblin",
          initiative: 7,
          side: "opposition",
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
            side: "opposition",
          },
          {
            kind: "statBlock",
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "second-goblin",
            initiative: 8,
            side: "opposition",
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
            side: "party",
          },
          {
            kind: "statBlock",
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 7,
            side: "opposition",
          },
        ],
      }),
    );

    expect(
      readPayload(
        handleToolCall(root, "fill_battle_hole", {
          subject: {
            tag: "action",
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
            tag: "action",
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
          side: "party",
        },
        {
          kind: "statBlock",
          statBlockId: "stat_block_goblin_warrior",
          combatantId: "goblin",
          initiative: 7,
          side: "opposition",
        },
      ],
    };
    const secondCharacter = {
      kind: "characterSession",
      sourceDraftId: secondDraftId,
      combatantId: "second-fighter",
      initiative: 16,
      side: "party",
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
      "cc:draft:draft.progression.initial",
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
        hitPoints: { tag: "positive", currentHp: 12 },
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
            side: "party",
          },
          {
            kind: "statBlock",
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 7,
            side: "opposition",
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
    expect(fighterActs.snapshot.acts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Attack",
          subject: expect.objectContaining({
            tag: "action",
            actorId: "fighter",
            action: "attack",
            attackName: "Longsword",
          }),
        }),
        expect.objectContaining({
          label: "Second Wind",
          subject: expect.objectContaining({
            tag: "unitFeature",
            actorId: "fighter",
            unitId: "fighter_second_wind",
          }),
        }),
        expect.objectContaining({
          label: "Move",
          subject: expect.objectContaining({
            tag: "runtimeCommand",
            actorId: "fighter",
            command: "move",
          }),
        }),
        expect.objectContaining({
          label: "End Turn",
          subject: expect.objectContaining({
            tag: "runtimeCommand",
            actorId: "fighter",
            command: "endTurn",
          }),
        }),
      ]),
    );
    expect(
      fighterActs.snapshot.acts.map((act: { label: string }) => act.label),
    ).toEqual([
      "Attack",
      "Attack",
      ...GENERIC_COMBAT_ACTION_LABELS,
      "Second Wind",
      "Move",
      "End Turn",
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
    expect(goblinActs.snapshot.acts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Attack",
          subject: expect.objectContaining({
            tag: "action",
            actorId: "goblin",
            action: "attack",
            attackName: "Scimitar",
          }),
        }),
        expect.objectContaining({
          label: "Attack",
          subject: expect.objectContaining({
            tag: "action",
            actorId: "goblin",
            action: "attack",
            attackName: "Shortbow",
          }),
        }),
        expect.objectContaining({ label: "Move" }),
        expect.objectContaining({ label: "End Turn" }),
      ]),
    );
    expect(
      goblinActs.snapshot.acts.map((act: { label: string }) => act.label),
    ).toEqual([
      "Attack",
      "Attack",
      ...GENERIC_COMBAT_ACTION_LABELS,
      "Move",
      "End Turn",
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
        hitPoints: { tag: "positive", currentHp: 5 },
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
        hitPoints: expect.objectContaining({ current: 5, maximum: 12 }),
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

  test("ends battle with a Stable zero-HP character session lifecycle", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-stable-zero-hp-closeout";
    createFinalizedFighterSheet(root, draftId);
    readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-stable-zero-hp-closeout",
        initialCombatants: [
          {
            kind: "characterSession",
            sourceDraftId: draftId,
            combatantId: "fighter",
            initiative: 12,
            side: "party",
          },
          {
            kind: "statBlock",
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 10,
            side: "opposition",
          },
        ],
      }),
    );
    const battleState = root.sessionStore.battleState;
    const fighter = battleState?.combatants.get(fighterId);
    if (
      battleState === null ||
      fighter === undefined ||
      fighter.zeroHpLifecycle.policy !== "usesDeathSavingThrows"
    ) {
      throw new Error("Expected in-battle Fighter character combatant.");
    }
    root.sessionStore.battleState = {
      ...battleState,
      combatants: new Map(battleState.combatants).set(fighterId, {
        ...fighter,
        hp: Hp(0),
        zeroHpLifecycle: {
          ...fighter.zeroHpLifecycle,
          deathSaves: {
            deathSaves: { successes: 0, failures: 0 },
            stable: true,
            dead: false,
            hpRegained: false,
          },
        },
      }),
    } satisfies BattleState;

    const ended = readPayload(handleToolCall(root, "end_battle", {}));

    expect(ended.session).toMatchObject({
      activeBattle: null,
      transientBattleFills: null,
    });
    expect(root.sessionStore.characters.get(characterDraftId(draftId))).toEqual(
      expect.objectContaining({
        tag: "available",
        hitPoints: {
          tag: "zero",
          lifecycle: {
            tag: "stable",
            recovery: { kind: "regains1HpAfter1d4Hours" },
          },
        },
      }),
    );
    expect(readPayload(handleToolCall(root, "list_characters", {}))).toEqual(
      expect.objectContaining({
        characters: [
          expect.objectContaining({
            sourceDraftId: draftId,
            hitPoints: expect.objectContaining({
              current: 0,
              maximum: 12,
              state: {
                tag: "zero",
                lifecycle: {
                  tag: "stable",
                  recovery: { kind: "regains1HpAfter1d4Hours" },
                },
              },
            }),
          }),
        ],
      }),
    );
  });

  test("starts battle from a Stable zero-HP character session without resetting death saves", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-stable-zero-hp-start";
    const build = createFinalizedFighterSheet(root, draftId);
    root.sessionStore.characters.set(
      characterDraftId(draftId),
      availableCharacterSessionRight({
        characterId: characterId(draftId),
        build,
        currentHp: Hp(0),
        zeroHpLifecycle: {
          tag: "stable",
          recovery: { kind: "regains1HpAfter1d4Hours" },
        },
      }),
    );

    const started = readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-stable-zero-hp-start",
        initialCombatants: [
          {
            kind: "statBlock",
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 12,
            side: "opposition",
          },
          {
            kind: "characterSession",
            sourceDraftId: draftId,
            combatantId: "fighter",
            initiative: 10,
            side: "party",
          },
        ],
      }),
    );

    expect(started.snapshot.combatants).toEqual([
      expect.objectContaining({ combatantId: "goblin" }),
      expect.objectContaining({
        combatantId: "fighter",
        hp: 0,
        conditions: expect.arrayContaining(["unconscious"]),
        zeroHpLifecycle: {
          policy: "usesDeathSavingThrows",
          deathSaves: { successes: 0, failures: 0 },
          stable: true,
          dead: false,
        },
      }),
    ]);

    const afterGoblinTurn = readPayload(
      handleToolCall(root, "end_turn", { actorId: "goblin" }),
    );
    expect(afterGoblinTurn.result.tag).toBe("resolved");
    expect(afterGoblinTurn.snapshot.currentActorId).toBe("fighter");
  });

  test("starts battle from a dead zero-HP character session without reviving it", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-dead-zero-hp-start";
    const build = createFinalizedFighterSheet(root, draftId);
    root.sessionStore.characters.set(
      characterDraftId(draftId),
      availableCharacterSessionRight({
        characterId: characterId(draftId),
        build,
        currentHp: Hp(0),
        zeroHpLifecycle: {
          tag: "dead",
          deathSaves: { successes: 0, failures: 3 },
        },
      }),
    );

    const started = readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-dead-zero-hp-start",
        initialCombatants: [
          {
            kind: "statBlock",
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 12,
            side: "opposition",
          },
          {
            kind: "characterSession",
            sourceDraftId: draftId,
            combatantId: "fighter",
            initiative: 10,
            side: "party",
          },
        ],
      }),
    );

    expect(started.snapshot.combatants).toEqual([
      expect.objectContaining({ combatantId: "goblin" }),
      expect.objectContaining({
        combatantId: "fighter",
        hp: 0,
        conditions: expect.arrayContaining(["unconscious"]),
        zeroHpLifecycle: {
          policy: "usesDeathSavingThrows",
          deathSaves: { successes: 0, failures: 3 },
          stable: false,
          dead: true,
        },
      }),
    ]);

    const afterGoblinTurn = readPayload(
      handleToolCall(root, "end_turn", { actorId: "goblin" }),
    );
    expect(afterGoblinTurn.result.tag).toBe("resolved");
    expect(afterGoblinTurn.snapshot.currentActorId).toBe("fighter");
    expect(afterGoblinTurn.snapshot.combatants).toEqual([
      expect.objectContaining({ combatantId: "goblin" }),
      expect.objectContaining({
        combatantId: "fighter",
        hp: 0,
        zeroHpLifecycle: expect.objectContaining({ dead: true }),
      }),
    ]);
  });

  test("rejects non-canonical zero-HP character session lifecycles", () => {
    const root = createMcpCompositionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const sessionInput = {
      characterId: characterId("character:zero-hp-boundary"),
      build,
      currentHp: Hp(0),
    };

    expect(() =>
      availableCharacterSessionRight({
        ...sessionInput,
        zeroHpLifecycle: {
          tag: "unstable",
          deathSaves: { successes: 3, failures: 0 },
        },
      }),
    ).toThrow(
      "Unstable character session cannot carry terminal death save counts.",
    );
    expect(() =>
      availableCharacterSessionRight({
        ...sessionInput,
        zeroHpLifecycle: {
          tag: "unstable",
          deathSaves: { successes: 0, failures: 3 },
        },
      }),
    ).toThrow(
      "Unstable character session cannot carry terminal death save counts.",
    );
    expect(() =>
      availableCharacterSessionRight({
        ...sessionInput,
        zeroHpLifecycle: {
          tag: "dead",
          deathSaves: { successes: 0, failures: 2 },
        },
      }),
    ).toThrow(
      "Dead character session requires exactly three death save failures.",
    );
  });

  test("ends battle with a dead zero-HP character session lifecycle", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-dead-zero-hp-closeout";
    createFinalizedFighterSheet(root, draftId);
    readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-dead-zero-hp-closeout",
        initialCombatants: [
          {
            kind: "characterSession",
            sourceDraftId: draftId,
            combatantId: "fighter",
            initiative: 12,
            side: "party",
          },
          {
            kind: "statBlock",
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 10,
            side: "opposition",
          },
        ],
      }),
    );
    const battleState = root.sessionStore.battleState;
    const fighter = battleState?.combatants.get(fighterId);
    if (
      battleState === null ||
      fighter === undefined ||
      fighter.zeroHpLifecycle.policy !== "usesDeathSavingThrows"
    ) {
      throw new Error("Expected in-battle Fighter character combatant.");
    }
    root.sessionStore.battleState = {
      ...battleState,
      combatants: new Map(battleState.combatants).set(fighterId, {
        ...fighter,
        hp: Hp(0),
        zeroHpLifecycle: {
          ...fighter.zeroHpLifecycle,
          deathSaves: {
            deathSaves: { successes: 0, failures: 3 },
            stable: false,
            dead: true,
            hpRegained: false,
          },
        },
      }),
    } satisfies BattleState;

    readPayload(handleToolCall(root, "end_battle", {}));

    expect(root.sessionStore.characters.get(characterDraftId(draftId))).toEqual(
      expect.objectContaining({
        tag: "available",
        hitPoints: {
          tag: "zero",
          lifecycle: {
            tag: "dead",
            deathSaves: { successes: 0, failures: 3 },
          },
        },
      }),
    );
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
        fills: [
          choiceFill("cc:draft:draft.progression.initial", "not_a_class"),
        ],
      }),
    );

    expect(rejected.result).toMatchObject({
      tag: "rejected",
      issues: [
        {
          tag: "illegalFill",
          code: "invalidChoice",
          holeId: "cc:draft:draft.progression.initial",
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
    fillThroughTool(root, finalizedDraftId, 1, manifestChoiceFills());
    fillThroughTool(root, finalizedDraftId, 2, manifestPurchaseFills());
    fillThroughTool(root, finalizedDraftId, 3, manifestLoadoutFills());
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
    const state = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-root-unarmored"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Orc Soldier Fighter",
        initiative: initiativeScore(12),
        side: partySide,
        build: {
          ...build,
          equipment: {
            shield: "equipment_shield",
            weapon: {
              itemId: "main:weapon_longsword",
              unitId: "weapon_longsword",
              grip: "one_handed",
            },
          },
        },
      },
      statBlockBattleInput: {
        combatantId: goblinId,
        statBlock: root.statBlockCatalog.requireStatBlock(
          "stat_block_goblin_warrior",
        ),
        initiative: initiativeScore(10),
        side: oppositionSide,
      },
      unitLibrary: root.unitLibrary,
    });

    expect(snapshotBattle(state).combatants[0]).toMatchObject({
      combatantId: fighterId,
      armorClass: 14,
    });
  });

  test("keeps spell slots but suppresses action-time spell acts when armor training blocks casting", () => {
    const root = createMcpCompositionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const state = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-root-armored-spellcaster"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Armored Spellcaster",
        initiative: initiativeScore(12),
        side: partySide,
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
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(2),
            expended: resourceCount(1),
          },
        ],
      },
      statBlockBattleInput: {
        combatantId: goblinId,
        statBlock: root.statBlockCatalog.requireStatBlock(
          "stat_block_goblin_warrior",
        ),
        initiative: initiativeScore(10),
        side: oppositionSide,
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
    ).not.toContainEqual(expect.objectContaining({ tag: "actionSpell" }));
  });

  test("keeps spell acts when only shield training is missing", () => {
    const root = createMcpCompositionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const state = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-root-shield-spellcaster"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Shield Spellcaster",
        initiative: initiativeScore(12),
        side: partySide,
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
        side: oppositionSide,
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
      expect.objectContaining({ tag: "actionSpell" }),
    );
  });

  test("replays Acid Splash save-gate damage through MCP battle fills", () => {
    const root = createMcpCompositionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const state = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-root-acid-splash"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Acid Splash Spellcaster",
        initiative: initiativeScore(12),
        side: partySide,
        build: {
          ...build,
          armorTraining: [],
          equipment: {
            shield: "equipment_shield",
          },
          spellcasting: {
            spellcastingAbility: "int",
            cantrips: ["acid_splash"],
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
        side: oppositionSide,
      },
      combatantDistances: [
        { combatantA: fighterId, combatantB: goblinId, feet: movementFeet(30) },
      ],
      unitLibrary: root.unitLibrary,
    });
    root.sessionStore.battleState = state;
    root.sessionStore.transientBattleFills = null;

    const subject = {
      tag: "actionSpell",
      actorId: "fighter",
      spellId: "acid_splash",
      spellActId: "cantripSaveGateDamage:acid_splash",
    };
    const discovered = readPayload(
      handleToolCall(root, "discover_battle_acts", {}),
    );
    expect(discovered.snapshot.acts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject,
          initialHoles: [
            expect.objectContaining({
              kind: "savingThrowOutcome",
              areaChoices: expect.arrayContaining([
                {
                  originAnchorId: "goblin",
                  affectedTargetIds: ["goblin"],
                },
              ]),
            }),
          ],
        }),
      ]),
    );

    const afterSavingThrow = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject,
        fill: {
          kind: "savingThrowOutcome",
          holeId: "battle:spell:saving-throw-outcome:acid_splash",
          value: [{ targetId: "goblin", succeeded: false }],
        },
      }),
    );
    expect(afterSavingThrow.result).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "rolledDice",
          holeId: "battle:spell:damage-result:acid_splash:1d6-acid",
        },
      ],
    });

    const afterDamage = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject,
        fill: {
          kind: "rolledDice",
          holeId: "battle:spell:damage-result:acid_splash:1d6-acid",
          value: [{ results: [4] }],
        },
      }),
    );
    expect(afterDamage.result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: "fighter", hp: 12 },
          { combatantId: "goblin", hp: 6 },
        ],
        currentTurnResources: { actionResources: [] },
      },
    });
    expect(root.sessionStore.transientBattleFills).toBeNull();
  });

  test("preserves pending reaction state while MCP replays a readied spell procedure", () => {
    const root = createMcpCompositionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const state = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-root-reaction-replay"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Readied Spell Fighter",
        initiative: initiativeScore(12),
        side: partySide,
        build: {
          ...build,
          armorTraining: [],
          equipment: { shield: "equipment_shield" },
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
        side: oppositionSide,
      },
      combatantDistances: [
        { combatantA: fighterId, combatantB: goblinId, feet: movementFeet(30) },
      ],
      unitLibrary: root.unitLibrary,
    });
    root.sessionStore.battleState = state;
    root.sessionStore.transientBattleFills = null;

    readPayload(
      handleToolCall(root, "resolve_battle_act", {
        subject: {
          tag: "actionSpell",
          actorId: "fighter",
          spellId: "ray_of_frost",
          spellActId: "readiedSpell:cantripSpellAttack:ray_of_frost",
          readyTrigger: "attackHit",
        },
      }),
    );
    const readiedState = root.sessionStore.battleState;
    if (readiedState?.readiedSpells.get(fighterId) === undefined) {
      throw new Error("Expected Fighter to hold a readied spell.");
    }
    readPayload(handleToolCall(root, "end_turn", { actorId: "fighter" }));

    const goblinAttack = {
      tag: "action" as const,
      actorId: "goblin",
      action: "attack" as const,
      attackName: "Shortbow",
    };
    readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: goblinAttack,
        fill: {
          kind: "targetChoice",
          holeId: "battle:attack:target",
          value: "fighter",
        },
      }),
    );
    const afterAttackRoll = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: goblinAttack,
        fill: {
          kind: "attackRoll",
          holeId: "battle:attack:roll",
          value: { total: 20, naturalD20: 18 },
        },
      }),
    );
    expect(afterAttackRoll).toMatchObject({
      result: {
        tag: "needsHoles",
        holes: [{ kind: "reactionDecision", trigger: "attackHit" }],
      },
      battleState: {
        pendingReaction: { frame: { trigger: "attackHit" } },
      },
    });

    const afterReactionDecision = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: goblinAttack,
        fill: {
          kind: "reactionDecision",
          holeId: "battle:reaction:decision",
          value: {
            kind: "resolve",
            reactorId: "fighter",
            choice: {
              kind: "releaseReadiedSpell",
              readiedSpellCasterId: "fighter",
              fills: [],
            },
          },
        },
      }),
    );
    expect(afterReactionDecision).toMatchObject({
      result: {
        tag: "needsHoles",
        subject: {
          tag: "runtimeCommand",
          command: "releaseReadiedSpell",
          readiedSpellCasterId: "fighter",
        },
        holes: [{ kind: "targetChoice" }],
      },
      battleState: {
        pendingReaction: {
          frame: { activeReaction: { reactorId: "fighter" } },
        },
      },
    });
    expect(root.sessionStore.battleState?.interruptStack).toHaveLength(1);
    expect(afterReactionDecision.session.transientBattleFills).toMatchObject({
      subject: {
        command: "releaseReadiedSpell",
      },
    });
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
      availableCharacterSessionRight({
        characterId: characterId("character:spell-slot-duplicate-levels"),
        build: spellcastingBuild,
        currentHp: Hp(spellcastingBuild.hitPoints.maximum),
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(2),
            expended: resourceCount(0),
          },
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(2),
            expended: resourceCount(0),
          },
        ],
      }),
    ).toThrow("Spell Slot state must match build capacity exactly.");
    expect(() =>
      availableCharacterSessionRight({
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
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(2),
            expended: resourceCount(0),
          },
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(2),
            expended: resourceCount(0),
          },
        ],
      }),
    ).toThrow("Spell Slot state must not duplicate spell levels.");
  });

  test("rejects character battle init when current HP exceeds build max HP", () => {
    const root = createMcpCompositionRoot();

    expect(() =>
      startBattleFromCharacterBuildAndStatBlockRight({
        battleId: battleId("battle-root-overmax-hp"),
        character: {
          combatantId: fighterId,
          characterId: characterId("fighter-character"),
          displayName: "Orc Soldier Fighter",
          build: fighterCharacterBuild(root.unitLibrary),
          initiative: initiativeScore(12),
          side: partySide,
          currentHp: Hp(13),
        },
        statBlockBattleInput: {
          combatantId: goblinId,
          statBlock: root.statBlockCatalog.requireStatBlock(
            "stat_block_goblin_warrior",
          ),
          initiative: initiativeScore(10),
          side: oppositionSide,
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
      fills: initialManifestFills(
        "13:class_fighter|13:class_fighter:level_2:fixed_hp_gain",
      ),
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

function characterUnitRef(
  state: BattleState,
  combatantId: typeof fighterId,
  unitId: string,
) {
  const combatant = state.combatants.get(combatantId);
  if (combatant?.origin.kind !== "character") {
    throw new Error(`Expected character combatant: ${combatantId}`);
  }
  return combatant.origin.characterUnitRefs.find(
    (ref) => ref.unitId === unitId,
  );
}

function fighterTwoLightWeaponBuild(
  unitLibrary: ReturnType<typeof createMcpCompositionRoot>["unitLibrary"],
): CharacterBuild {
  return {
    ...fighterCharacterBuild(unitLibrary),
    equipment: {
      armor: "armor_chain_mail",
      weapon: {
        itemId: "main:weapon_shortsword",
        unitId: "weapon_shortsword",
        grip: "one_handed",
      },
      offHandWeapon: {
        itemId: "off:weapon_dagger",
        unitId: "weapon_dagger",
      },
    },
  };
}

function createFinalizedFighterSheet(
  root: ReturnType<typeof createMcpCompositionRoot>,
  draftId: string,
): CharacterBuild {
  const build = fighterCharacterBuild(root.unitLibrary);
  root.sessionStore.characters.set(
    characterDraftId(draftId),
    availableCharacterSessionRight({
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

function initialManifestFills(
  progressionOptionId = "13:class_fighter:level_1:maximum_hit_die",
): readonly CreationFill[] {
  return [
    choiceFill("cc:draft:draft.progression.initial", progressionOptionId),
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
      unitHoleId("class_fighter", "fighter_skill_choices"),
      "perception",
      "survival",
    ),
    choiceFill(
      unitHoleId("fighter_fighting_style_l1", "fighter_fighting_style"),
      "defense",
    ),
    choiceFill(
      unitHoleId("fighter_weapon_mastery_l1", "fighter_weapon_mastery_choices"),
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
  ];
}

function manifestPurchaseFills(): readonly CreationFill[] {
  return [
    choiceFill(
      unitHoleId("class_fighter", "equipment_purchase"),
      "armor_chain_mail",
      "weapon_longsword",
      "equipment_shield",
    ),
  ];
}

function manifestLoadoutFills(): readonly CreationFill[] {
  return [
    choiceFill(loadoutHoleId("armor_chain_mail", "armor"), "worn"),
    choiceFill(loadoutHoleId("equipment_shield", "shield"), "wielded"),
    choiceFill(
      loadoutHoleId("weapon_longsword", "weapon"),
      "wielded_one_handed",
    ),
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
    "cc:draft:draft.progression.initial",
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

  fillThroughTool(root, draftId, 1, manifestChoiceFills());
  fillThroughTool(root, draftId, 2, manifestPurchaseFills());
  fillThroughTool(root, draftId, 3, manifestLoadoutFills());

  return readPayload(handleToolCall(root, "finalize_character", { draftId }));
}

function fillBattleHoleThroughTool(
  root: ReturnType<typeof createMcpCompositionRoot>,
  actorId: string,
  attackName: string,
  fill: {
    readonly kind: "targetChoice" | "attackRoll" | "rolledDice";
    readonly holeId: string;
    readonly selectedAttackDamageRiderUnitIds?: readonly string[];
    readonly value: unknown;
  },
) {
  return readPayload(
    handleToolCall(root, "fill_battle_hole", {
      subject: {
        tag: "action",
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
  return manifestChoiceFills().map((fill) => fill.holeId);
}

function fighterUnitLibraryWithClassFeatureGrant(
  unitLibrary: ReturnType<typeof createMcpCompositionRoot>["unitLibrary"],
  featureUnit: Extract<UnitRecord, { readonly kind: "class_feature" }>,
): ReturnType<typeof createMcpCompositionRoot>["unitLibrary"] {
  const fighter = unitLibrary.requireUnit("class_fighter");
  if (fighter.kind !== "class") {
    throw new Error("Expected Fighter class Unit.");
  }

  return unitLibraryWithOverrides(unitLibrary, [
    {
      ...fighter,
      featureGrants: fighter.featureGrants.some(
        (grant) => grant.unitId === featureUnit.id,
      )
        ? fighter.featureGrants
        : [
            ...fighter.featureGrants,
            { level: featureUnit.acquiredAtLevel, unitId: featureUnit.id },
          ],
    },
    featureUnit,
  ]);
}

function fighterCharacterBuildAtLevel(
  unitLibrary: ReturnType<typeof createMcpCompositionRoot>["unitLibrary"],
  level: number,
): CharacterBuild {
  const classUnit = unitLibrary.requireUnit("class_fighter");
  if (classUnit.kind !== "class") {
    throw new Error("Expected Fighter class Unit.");
  }

  return characterBuildForClassProgression({
    base: fighterCharacterBuild(unitLibrary),
    classUnit,
    level,
    keepClassChoices: true,
  });
}

function rogueCharacterBuild(
  unitLibrary: ReturnType<typeof createMcpCompositionRoot>["unitLibrary"],
  input: {
    readonly level?: number;
  } = {},
): CharacterBuild {
  const classUnit = rogueClassUnit(unitLibrary);
  return {
    ...characterBuildForClassProgression({
      base: fighterCharacterBuild(unitLibrary),
      classUnit,
      level: input.level ?? 1,
      keepClassChoices: false,
    }),
    equipment: {
      weapon: {
        itemId: "main:weapon_dagger",
        unitId: "weapon_dagger",
        grip: "one_handed",
      },
    },
  };
}

function rogueBattleUnitLibrary(
  root: ReturnType<typeof createMcpCompositionRoot>,
  overrides?: {
    readonly sneakAttackUnit?: UnitRecord;
    readonly evasionUnit?: UnitRecord;
    readonly uncannyDodgeUnit?: UnitRecord;
  },
): ReturnType<typeof createMcpCompositionRoot>["unitLibrary"] {
  const rogueClass = rogueClassUnit(root.unitLibrary);
  const overriddenUnits = [
    rogueClass,
    ...(overrides?.sneakAttackUnit === undefined
      ? []
      : [overrides.sneakAttackUnit]),
    ...(overrides?.evasionUnit === undefined ? [] : [overrides.evasionUnit]),
    ...(overrides?.uncannyDodgeUnit === undefined
      ? []
      : [overrides.uncannyDodgeUnit]),
  ] as const;
  return unitLibraryWithOverrides(root.unitLibrary, overriddenUnits);
}

function rogueClassUnit(
  unitLibrary: ReturnType<typeof createMcpCompositionRoot>["unitLibrary"],
): Extract<UnitRecord, { readonly kind: "class" }> {
  const fighter = unitLibrary.requireUnit("class_fighter");
  if (fighter.kind !== "class") {
    throw new Error("Expected Fighter class Unit.");
  }
  const { spellcasting: _spellcasting, ...fighterWithoutSpellcasting } =
    fighter;
  return {
    ...fighterWithoutSpellcasting,
    id: "class_rogue",
    name: "Rogue",
    className: "rogue",
    hitPointDie: 8,
    featureGrants: [
      { level: 1, unitId: "rogue_sneak_attack" },
      { level: 5, unitId: "rogue_uncanny_dodge" },
      { level: 7, unitId: "rogue_evasion" },
    ],
  };
}

function characterBuildForClassProgression(input: {
  readonly base: CharacterBuild;
  readonly classUnit: Extract<UnitRecord, { readonly kind: "class" }>;
  readonly level: number;
  readonly keepClassChoices: boolean;
}): CharacterBuild {
  const classLevel = characterClassLevel(input.level);
  const classUnitId = expectRight(classUnitIdFromClassUnit(input.classUnit));
  const progression = {
    startingClass: classUnitId,
    advancements: Array.from({ length: classLevel - 1 }, () => ({
      classUnitId,
      hitPointRule: { tag: "fixedHigherLevelGain" as const },
    })),
  };
  return {
    ...input.base,
    progression,
    hitPoints: {
      maximum: fixedClassHitPointMaximum(
        input.classUnit.hitPointDie,
        input.base.abilityScores.con,
        classLevel,
      ),
      hitDice: [
        {
          classUnitId: input.classUnit.id,
          dieSize: hitDieSize(input.classUnit.hitPointDie),
          total: hitDieTotal(classLevel),
        },
      ],
    },
    features: [
      ...input.base.features.filter(
        (feature) =>
          feature.kind !== "classFeature" &&
          (input.keepClassChoices || feature.kind !== "classChoice"),
      ),
      ...input.classUnit.featureGrants
        .filter((grant) => grant.level <= classLevel)
        .map((grant) => ({
          kind: "classFeature" as const,
          unitId: grant.unitId,
        })),
    ],
    resources: [],
  };
}

function fixedClassHitPointMaximum(
  hitPointDie: number,
  constitutionScore: number,
  classLevel: number,
): ReturnType<typeof hp> {
  const constitutionModifier = Math.floor((constitutionScore - 10) / 2);
  return hp(
    hitPointDie +
      constitutionModifier +
      (classLevel - 1) *
        Math.max(1, Math.floor(hitPointDie / 2) + 1 + constitutionModifier),
  );
}

function unitLibraryWithOverrides(
  unitLibrary: ReturnType<typeof createMcpCompositionRoot>["unitLibrary"],
  overrides: readonly UnitRecord[],
): ReturnType<typeof createMcpCompositionRoot>["unitLibrary"] {
  const unitById = new Map(
    unitLibrary.listUnits().map((unit) => [unit.id, unit]),
  );
  for (const override of overrides) {
    unitById.set(override.id, override);
  }

  return {
    ...unitLibrary,
    getUnit: (unitId: string) => {
      const unit = unitById.get(unitId);
      return unit === undefined ? Option.none() : Option.some(unit);
    },
    listUnits: () => [...unitById.values()],
    requireUnit: (unitId: string) => {
      const unit = unitById.get(unitId);
      return unit === undefined ? unitLibrary.requireUnit(unitId) : unit;
    },
  };
}
