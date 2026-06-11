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
  endTurn,
  initiativeScore,
  KNOCKED_OUT_UNCONSCIOUS,
  snapshotBattle,
  WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE,
  type BattleCreatureState,
  type BattleSubject,
  type BattleState,
} from "@dnd/battle-runtime";
import {
  characterDraftId,
  characterBuildHitPoints,
  abilityScoreAssignment,
  characterClassLevel,
  characterEquipmentItemId,
  characterEquipmentItemUnitId,
  classUnitIdFromClassUnit,
  createCharacterDraft,
  creationChoiceOptionId,
  creationHoleId,
  fillCreationHoles,
  finalizeCharacterDraft,
  sorcererMetamagicOptionId,
  SORCERER_METAMAGIC_UNIT_ID,
  type CharacterDraft,
  type CharacterBuild,
  type CreationFill,
  type CreationHole,
  type CreationHoleIdText,
  type CharacterEquipmentItemSlot,
  type CharacterBuildSpellcasting,
} from "@dnd/character-creation-runtime";
import { elapsedTimeTicks } from "@dnd/shared/elapsed-time";
import { Hp, resourceCount, spellSlotLevel } from "@dnd/shared/types";
import type { AbilityScoreAssignment as RawAbilityScoreAssignment } from "@dnd/shared-algebras/ability-score-algebra";
import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import {
  battleToolDefinitions,
  characterToolDefinitions,
  contentToolDefinitions,
  createMcpCompositionRoot,
  createMcpSessionStore,
  handleToolCall,
  startBattleFromCharacterBuildAndStatBlock,
} from "./server.ts";
import type { BattleToolResult } from "./battle-tools.ts";
import type { CharacterToolResult } from "./character-tools.ts";
import { characterUnitRefsWithBattleSupportProfiles } from "@dnd/character-battle-runtime";
import {
  availableCharacterSession,
  characterIdFromDraftId,
} from "./session-store.ts";
import {
  parseCharacterSheet,
  parseCharacterSheetRetainedCompanionId,
  replaceCharacterSheetCompanion,
  type CharacterSheetCompanion,
  type CharacterSheetRetainedCompanionCurrentHitPoints,
} from "@dnd/character-sheet-runtime";
import {
  GENERIC_COMBAT_ACTION_LABELS,
  GENERIC_COMBAT_ACTION_LABELS_WITH_SHOVE,
  GENERIC_READY_TRIGGERS,
} from "../test-support/battle-act-labels.ts";
import {
  loadoutHoleId,
  unitHoleId,
} from "../test-support/creation-hole-ids.ts";
import type { UnitRecord } from "@dnd/surface/surface/types";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import {
  assertSrd521StatBlock,
  buildStatBlockCatalog,
  defineSrdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";

function testAbilityScoreAssignment(scores: RawAbilityScoreAssignment) {
  const parsed = abilityScoreAssignment(scores);
  if (Either.isLeft(parsed)) {
    throw new Error(
      "Test fixture ability scores must be valid AbilityScore values.",
    );
  }
  return parsed.right;
}

function testCharacterId(draftId: string) {
  return characterIdFromDraftId(characterDraftId(draftId));
}

function testBattleCreatureStateWithoutKnockOut(
  combatant: BattleCreatureState,
  input: Pick<BattleCreatureState, "hp" | "conditions">,
): BattleCreatureState {
  return {
    ...combatant,
    hp: input.hp,
    conditions: input.conditions,
    positiveHpUnconscious: null,
  };
}

function startBattleFromCharacterBuildAndStatBlockRight(
  input: Parameters<typeof startBattleFromCharacterBuildAndStatBlock>[0],
): BattleState {
  const result = startBattleFromCharacterBuildAndStatBlock(input);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function resolvedState(result: ReturnType<typeof endTurn>): BattleState {
  if (result.tag !== "resolved") {
    throw new Error("Expected battle runtime result to resolve.");
  }
  return result.state;
}

function characterEquipmentItemUnitIdRight(value: string) {
  const result = characterEquipmentItemUnitId(value);
  if (Either.isLeft(result)) {
    throw new Error(
      `Invalid test CharacterBuild equipment item Unit id: ${value}`,
    );
  }
  return result.right;
}

function testWizardSpellcasting(input: {
  readonly cantrips: readonly string[];
  readonly spellbook?: readonly string[];
  readonly preparedSpells: readonly string[];
  readonly spellSlots: readonly { readonly spellLevel: 1; readonly count: 2 }[];
  readonly sourceUnitId?: string;
  readonly spellcastingAbility?: CharacterBuildSpellcasting["sources"][number]["spellcastingAbility"];
}): CharacterBuildSpellcasting {
  return {
    sources: [
      {
        sourceUnitId: input.sourceUnitId ?? "class_wizard",
        spellcastingAbility: input.spellcastingAbility ?? "int",
        cantrips: input.cantrips,
        spellbook: input.spellbook ?? input.preparedSpells,
        preparedSpells: input.preparedSpells,
        spellcastingFocuses: ["spellbook"],
      },
    ],
    slotPools: {
      spellcasting: {
        kind: "spellcasting",
        slots: input.spellSlots,
      },
    },
  };
}

function characterBuildMaximumHp(
  build: CharacterBuild,
  unitLibrary: ReturnType<typeof createMcpCompositionRoot>["unitLibrary"],
) {
  return expectRight(characterBuildHitPoints(build, unitLibrary)).maximum;
}

function wizardProgression(
  root: ReturnType<typeof createMcpCompositionRoot>,
  level = 1,
): CharacterBuild["progression"] {
  const wizard = root.unitLibrary.requireUnit("class_wizard");
  if (wizard.kind !== "class") {
    throw new Error("Expected Wizard class Unit.");
  }
  if (level !== 1) {
    return characterBuildForClassProgression({
      base: fighterCharacterBuild(root.unitLibrary),
      classUnit: wizard,
      level,
      keepClassChoices: false,
    }).progression;
  }
  return {
    startingClass: expectRight(classUnitIdFromClassUnit(wizard)),
    advancements: [],
  };
}

function testCharacterEquipmentItemId<
  const Slot extends CharacterEquipmentItemSlot,
>(slot: Slot, unitId: string) {
  return characterEquipmentItemId({
    slot,
    unitId: characterEquipmentItemUnitIdRight(unitId),
  });
}

function availableCharacterSessionRight(
  input: Omit<Parameters<typeof availableCharacterSession>[0], "conditions"> &
    Partial<
      Pick<Parameters<typeof availableCharacterSession>[0], "conditions">
    >,
) {
  const result = availableCharacterSession({ conditions: [], ...input });
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

function retainedCompanionId(value: string) {
  return expectRight(parseCharacterSheetRetainedCompanionId(value));
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
    ).toEqual(
      expect.arrayContaining([
        "stat_block_goblin_warrior",
        "stat_block_skeleton",
        "stat_block_owl",
      ]),
    );
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
    root.sessionStore.pendingBattleFills = null;

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
            ...build.equipment,
            loadout: {
              ...(build.equipment.loadout.armor === undefined
                ? {}
                : { armor: build.equipment.loadout.armor }),
              ...(build.equipment.loadout.shield === undefined
                ? {}
                : { shield: build.equipment.loadout.shield }),
            },
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

  test("admits Cunning Action alternate action cost through the retained feature Unit", () => {
    const root = createMcpCompositionRoot();
    const rogueBuild = rogueCharacterBuild(root.unitLibrary, {
      level: 2,
    });
    const state = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-supported-cunning-action"),
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
      characterUnitRef(state, fighterId, "rogue_cunning_action"),
    ).toMatchObject({
      supportProfiles: [
        {
          kind: "alternateActionCost",
          from: {
            kind: "standardAction",
            actions: ["dash", "disengage", "hide"],
          },
          to: { kind: "bonusAction" },
        },
      ],
    });
    expect(characterUnitRef(state, fighterId, "class_rogue")).toMatchObject({
      supportProfiles: [],
    });
  });

  test("does not infer Cunning Action support from Rogue class name or level", () => {
    const root = createMcpCompositionRoot();
    const rogueOneState = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-rogue-one-no-cunning-action"),
      character: {
        combatantId: fighterId,
        characterId: characterId("rogue-character"),
        displayName: "Orc Soldier Rogue",
        build: rogueCharacterBuild(root.unitLibrary),
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
    const rogueBuild = rogueCharacterBuild(root.unitLibrary, {
      level: 2,
    });
    const buildWithoutCunningAction: CharacterBuild = {
      ...rogueBuild,
      features: rogueBuild.features.filter(
        (feature) =>
          feature.kind !== "selectedClassChoice" ||
          feature.unitId !== "rogue_cunning_action",
      ),
    };
    const state = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-no-inferred-cunning-action"),
      character: {
        combatantId: fighterId,
        characterId: characterId("rogue-character"),
        displayName: "Orc Soldier Rogue",
        build: buildWithoutCunningAction,
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
      characterUnitRef(rogueOneState, fighterId, "class_rogue"),
    ).toMatchObject({
      supportProfiles: [],
    });
    expect(characterUnitRef(state, fighterId, "class_rogue")).toMatchObject({
      supportProfiles: [],
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

  test("reports every missing Character Build Unit ref at the battle support boundary", () => {
    const root = createMcpCompositionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const result = characterUnitRefsWithBattleSupportProfiles(
      {
        ...build,
        features: [
          ...build.features,
          {
            kind: "selectedClassChoice",
            unitId: "missing_feature_one",
            selectedFromUnitId: "fighter_fighting_style",
          },
          {
            kind: "selectedClassChoice",
            unitId: "missing_feature_two",
            selectedFromUnitId: "fighter_fighting_style",
          },
        ],
      },
      root.unitLibrary,
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isRight(result)) return;
    expect(result.left.map((issue) => issue.message)).toEqual([
      "Unknown Character Build Unit for battle initialization: missing_feature_one.",
      "Unknown Character Build Unit for battle initialization: missing_feature_two.",
    ]);
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

  test("discovers Stat Block Multiattack and Bonus Action subjects through battle runtime", () => {
    const root = createMcpCompositionRoot();
    const fighterTurn = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-root-stat-block-procedures"),
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
        statBlock: goblinWarriorMultiattackStatBlock(root),
        initiative: initiativeScore(11),
        side: oppositionSide,
      },
      unitLibrary: root.unitLibrary,
    });
    const goblinTurn = resolvedState(
      endTurn({ state: fighterTurn, actorId: fighterId }),
    );

    expect(discoverBattleActs(goblinTurn).map((act) => act.subject)).toEqual(
      expect.arrayContaining([
        {
          tag: "action",
          actorId: goblinId,
          action: "multiattack",
          multiattackName: "Multiattack",
        },
        {
          tag: "bonusAction",
          actorId: goblinId,
          action: "statBlockActionOption",
          optionName: "Nimble Escape",
          standardAction: "disengage",
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
      "apply_character_session_operation",
      "list_characters",
    ]);
  });

  test("does not expose retained companion creation HP inputs in the MCP schema", () => {
    const applyOperationTool = characterToolDefinitions.find(
      (tool) => tool.name === "apply_character_session_operation",
    );
    // Cast evidence: mcpObjectJsonSchema returns an object JSON schema for
    // tool input schemas; this test inspects that generated object shape.
    const inputSchema = applyOperationTool?.inputSchema as
      | {
          readonly properties?: {
            readonly operation?: {
              readonly properties?: Readonly<Record<string, unknown>>;
            };
          };
        }
      | undefined;
    const operationSchema = inputSchema?.properties?.operation;

    expect(operationSchema?.properties?.kind).toEqual({
      type: "string",
      enum: ["retainOneAtATimeCompanion"],
    });
    expect(operationSchema?.properties).not.toHaveProperty("currentHp");
    expect(operationSchema?.properties).not.toHaveProperty("tempHp");
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
    expect(statBlocks.statBlocks).toEqual(
      expect.arrayContaining([
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
        expect.objectContaining({
          statBlockId: "stat_block_owl",
          displayName: "Owl",
        }),
      ]),
    );
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

    const startResponse = handleToolCall(root, "start_battle", {
      battleId: "battle:mcp-shell",
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
          currentHp: 0,
        },
      ],
    });
    const started = readPayload(startResponse);

    expect(root.sessionStore.battleState).not.toBeNull();
    expect(
      root.sessionStore.battleState?.combatants.get(goblinId),
    ).toMatchObject({
      displayName: "Goblin Warrior",
      initiative: 7,
      hp: 0,
    });
    expect(started).toMatchObject({
      snapshot: {
        battleId: "battle:mcp-shell",
        currentActorId: "fighter",
        turnOrder: ["fighter", "goblin"],
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
        readiedResponses: { spells: [], movements: [] },
        helpAttackMarkers: [],
        pendingInterrupt: null,
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
    expect(started.snapshot.combatants[0]).toMatchObject({
      combatantId: "fighter",
      movement: { speedFeet: 30, spentFeet: 0, remainingFeet: 30 },
    });
    expect(started.snapshot.combatants[0]).not.toHaveProperty("defeated");
    if ("isError" in startResponse) {
      throw new Error("Expected start_battle to return structured content.");
    }
    expect(startResponse.structuredContent).toMatchObject({
      snapshot: {
        combatants: [
          {
            combatantId: "fighter",
          },
          {
            combatantId: "goblin",
          },
        ],
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
      ...GENERIC_COMBAT_ACTION_LABELS_WITH_SHOVE,
      "Adrenaline Rush",
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
    expect(read.snapshot.combatants).toHaveLength(2);
  });

  test("discovers Stat Block Multiattack dispatch and Movement continuations through MCP tools", () => {
    const baseRoot = createMcpCompositionRoot();
    const multiattackStatBlock = goblinWarriorMultiattackStatBlock(baseRoot);
    const catalogResult = buildStatBlockCatalog({
      collections: [
        defineSrdStatBlockCollection({
          statBlocks: [assertSrd521StatBlock(multiattackStatBlock)],
        }),
      ],
    });
    if (catalogResult.tag !== "ok") {
      throw new Error("Expected MCP Multiattack test catalog to build.");
    }
    const root = {
      ...baseRoot,
      statBlockCatalog: catalogResult.catalog,
      sessionStore: createMcpSessionStore(catalogResult.catalog),
    };
    const draftId = "draft:mcp-multiattack-continuation";
    createFinalizedFighterSheet(root, draftId);

    readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-multiattack-continuation",
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
            statBlockId: multiattackStatBlock.id,
            combatantId: "goblin",
            initiative: 7,
            side: "opposition",
            admissionSource: { kind: "encounterParticipant" },
          },
        ],
      }),
    );
    readPayload(handleToolCall(root, "end_turn", { actorId: "fighter" }));
    const opened = readPayload(
      handleToolCall(root, "resolve_battle_act", {
        subject: {
          tag: "action",
          actorId: "goblin",
          action: "multiattack",
          multiattackName: "Multiattack",
        },
      }),
    );
    expect(opened.result.tag).toBe("resolved");
    expect(opened.snapshot.currentActorId).toBe("goblin");
    expect(opened.snapshot.turn.actionResources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "statBlockMultiattack",
          sourceOwnerId: "goblin",
        }),
      ]),
    );
    expect(
      root.sessionStore.battleState?.currentTurnResources.actionResources,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "statBlockMultiattack",
          sourceOwnerId: "goblin",
        }),
      ]),
    );

    const continuation = readPayload(
      handleToolCall(root, "discover_battle_acts", {}),
    );
    expect(
      continuation.snapshot.acts.map((act: { label: string }) => act.label),
    ).toEqual(["Attack", "Move", "End Turn"]);
    expect(
      continuation.snapshot.acts.map(
        (act: { subject: unknown }) => act.subject,
      ),
    ).toEqual([
      {
        tag: "action",
        actorId: "goblin",
        action: "attack",
        attackName: "Shortbow",
      },
      {
        tag: "runtimeCommand",
        actorId: "goblin",
        command: "move",
      },
      {
        tag: "runtimeCommand",
        actorId: "goblin",
        command: "endTurn",
      },
    ]);
  });

  test("fills a battle movement hole through MCP", () => {
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
      }),
    );

    const moved = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: { tag: "runtimeCommand", actorId: "fighter", command: "move" },
        fill: {
          kind: "movement",
          holeId: "battle:movement",
          value: {
            speedKind: "walk",
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
          },
        },
      }),
    );
    expect(moved.result.tag).toBe("resolved");
    expect(moved.snapshot.combatants).toContainEqual(
      expect.objectContaining({
        combatantId: "fighter",
        movement: expect.objectContaining({ spentFeet: 10 }),
      }),
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
            characterId: testCharacterId(firstDraftId),
            combatantId: "first-fighter",
            initiative: 11,
            side: "party",
          },
          {
            kind: "characterSession",
            characterId: testCharacterId(secondDraftId),
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
      root.sessionStore.characters.get(testCharacterId(firstDraftId)),
    ).toMatchObject({ tag: "inBattle" });
    expect(
      root.sessionStore.characters.get(testCharacterId(secondDraftId)),
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
            characterId: testCharacterId(firstDraftId),
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
            characterId: testCharacterId(secondDraftId),
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
            admissionSource: { kind: "encounterParticipant" },
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
      root.sessionStore.characters.get(testCharacterId(firstDraftId)),
    ).toMatchObject({
      tag: "inBattle",
      battleId: "battle:mcp-active-battle-first",
      sheet: { characterId: testCharacterId(firstDraftId) },
    });
    expect(
      root.sessionStore.characters.get(testCharacterId(secondDraftId)),
    ).toMatchObject({
      tag: "available",
      hitPoints: { tag: "positive", currentHp: 12, tempHp: 0 },
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
          spatialFacts: [
            {
              kind: "attackTargetInMeleeReach",
              actorId: "fighter",
              targetId: "goblin",
              attackName: "Longsword",
            },
          ],
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
    expect(root.sessionStore.pendingBattleFills).not.toBeNull();

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
    expect(afterDamage.snapshot.combatants).toEqual([
      expect.objectContaining({ combatantId: "fighter", hp: 12 }),
      expect.objectContaining({ combatantId: "goblin", hp: 2 }),
    ]);
    expect(
      afterDamage.snapshot.acts.map((act: { label: string }) => act.label),
    ).toEqual(["Adrenaline Rush", "Second Wind", "Move", "End Turn"]);
    expect(root.sessionStore.pendingBattleFills).toBeNull();

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
      "Nimble Escape",
      "Move",
      "End Turn",
    ]);

    const afterGoblinTarget = readPayload(
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
          spatialFacts: [
            {
              kind: "attackTargetInMeleeReach",
              actorId: "goblin",
              targetId: "fighter",
              attackName: "Scimitar",
            },
          ],
        },
      }),
    );
    const goblinAttackRoll = afterGoblinTarget.result.holes.find(
      (hole: { readonly kind?: string }) => hole.kind === "attackRoll",
    );
    if (goblinAttackRoll === undefined) {
      throw new Error("Expected Goblin attack roll hole.");
    }
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
          holeId: goblinAttackRoll.holeId,
          value: {
            total: 20,
            naturalD20: 18,
            ...("rollMode" in goblinAttackRoll
              ? { rollMode: goblinAttackRoll.rollMode }
              : {}),
          },
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
    expect(afterGoblinDamage.snapshot.combatants).toEqual([
      expect.objectContaining({ combatantId: "fighter", hp: 5 }),
      expect.objectContaining({ combatantId: "goblin", hp: 2 }),
    ]);
  });

  test("replays long-range attack target facts into a Disadvantage attack-roll hole", () => {
    const root = createMcpCompositionRoot();
    root.sessionStore.battleState =
      startBattleFromCharacterBuildAndStatBlockRight({
        battleId: battleId("battle:mcp-long-range-attack"),
        character: {
          combatantId: fighterId,
          characterId: characterId("fighter-character"),
          displayName: "Orc Soldier Fighter",
          build: fighterCharacterBuild(root.unitLibrary),
          initiative: initiativeScore(7),
          side: partySide,
        },
        statBlockBattleInput: {
          combatantId: goblinId,
          statBlock: root.statBlockCatalog.requireStatBlock(
            "stat_block_goblin_warrior",
          ),
          initiative: initiativeScore(18),
          side: oppositionSide,
        },
        unitLibrary: root.unitLibrary,
      });
    root.sessionStore.pendingBattleFills = null;

    const afterTarget = fillBattleHoleThroughTool(root, "goblin", "Shortbow", {
      kind: "targetChoice",
      holeId: "battle:attack:target",
      value: "fighter",
      spatialFacts: [
        {
          kind: "attackTargetInRangedRange",
          actorId: "goblin",
          targetId: "fighter",
          attackName: "Shortbow",
          rangeBand: "long",
        },
      ],
    });

    expect(afterTarget.result).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "attackRoll", rollMode: "disadvantage" }],
    });
    expect(afterTarget.session.transientBattleFills).toMatchObject({
      fills: [
        {
          kind: "targetChoice",
          spatialFacts: [
            {
              kind: "attackTargetInRangedRange",
              rangeBand: "long",
            },
          ],
        },
      ],
    });
    expect(root.sessionStore.pendingBattleFills).not.toBeNull();
  });

  test("rejects contradictory long-range and normal-range attack target facts", () => {
    const root = createMcpCompositionRoot();
    root.sessionStore.battleState =
      startBattleFromCharacterBuildAndStatBlockRight({
        battleId: battleId("battle:mcp-contradictory-range-attack"),
        character: {
          combatantId: fighterId,
          characterId: characterId("fighter-character"),
          displayName: "Orc Soldier Fighter",
          build: fighterCharacterBuild(root.unitLibrary),
          initiative: initiativeScore(7),
          side: partySide,
        },
        statBlockBattleInput: {
          combatantId: goblinId,
          statBlock: root.statBlockCatalog.requireStatBlock(
            "stat_block_goblin_warrior",
          ),
          initiative: initiativeScore(18),
          side: oppositionSide,
        },
        unitLibrary: root.unitLibrary,
      });
    root.sessionStore.pendingBattleFills = null;

    const afterTarget = fillBattleHoleThroughTool(root, "goblin", "Shortbow", {
      kind: "targetChoice",
      holeId: "battle:attack:target",
      value: "fighter",
      spatialFacts: [
        {
          kind: "attackTargetInRangedRange",
          actorId: "goblin",
          targetId: "fighter",
          attackName: "Shortbow",
          rangeBand: "normal",
        },
        {
          kind: "attackTargetInRangedRange",
          actorId: "goblin",
          targetId: "fighter",
          attackName: "Shortbow",
          rangeBand: "long",
        },
      ],
    });

    expect(afterTarget.result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Attack target range facts must contain at most one range band for each actor, target, and attack.",
    });
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
    root.sessionStore.battleState = {
      ...battleState,
      combatants,
    };
    root.sessionStore.pendingBattleFills = null;

    const afterTarget = fillBattleHoleThroughTool(root, "fighter", "Dagger", {
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
      afterTarget.result.subject,
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

    const afterDamage = fillBattleHoleThroughTool(
      root,
      "fighter",
      "Dagger",
      {
        kind: "rolledDice",
        holeId: "battle:attack:damage-result:1d4+3-piercing",
        selectedAttackDamageRiderUnitIds: ["rogue_sneak_attack"],
        value: [{ results: [2] }, { results: [3] }],
      },
      afterAttackRoll.result.subject,
    );

    expect(afterDamage.result).toMatchObject({ tag: "resolved" });
    expect(afterDamage.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: "fighter", hp: 10 }),
        expect.objectContaining({ combatantId: "goblin", hp: 2 }),
      ]),
    );
    expect(afterDamage.snapshot.turn.attackDamageRidersUsedThisTurn).toEqual([
      { attackerId: "fighter", unitId: "rogue_sneak_attack" },
    ]);
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
            characterId: testCharacterId(draftId),
            combatantId: "fighter",
            initiative: 18,
            side: "party",
          },
          {
            kind: "statBlock",
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            side: "opposition",
            admissionSource: { kind: "encounterParticipant" },
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
          admissionSource: { kind: "encounterParticipant" },
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
              characterId: testCharacterId(draftId),
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
            characterId: testCharacterId(draftId),
            combatantId: "fighter",
            initiative: 18,
            side: "party",
          },
          {
            kind: "characterSession",
            characterId: testCharacterId(
              "draft:mcp-missing-additional-secondary",
            ),
            combatantId: "second-fighter",
            initiative: 16,
            side: "party",
          },
          {
            kind: "characterSession",
            characterId: testCharacterId("draft:mcp-missing-additional-third"),
            combatantId: "third-fighter",
            initiative: 14,
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
      }),
    );

    expect(rejected).toMatchObject({
      details: {
        code: "INVALID_BATTLE_COMBATANTS",
        issues: [
          {
            details: {
              code: "UNKNOWN_FINALIZED_CHARACTER_SESSION",
              characterId: testCharacterId(
                "draft:mcp-missing-additional-secondary",
              ),
            },
          },
          {
            details: {
              code: "UNKNOWN_FINALIZED_CHARACTER_SESSION",
              characterId: testCharacterId(
                "draft:mcp-missing-additional-third",
              ),
            },
          },
        ],
      },
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
            admissionSource: { kind: "encounterParticipant" },
          },
          {
            kind: "statBlock",
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "second-goblin",
            initiative: 8,
            side: "opposition",
            admissionSource: { kind: "encounterParticipant" },
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

  test("start_battle admits a retained companion from Character Sheet state", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-find-familiar-admission";
    createFinalizedWizardWithFindFamiliar(root, draftId);
    setStoredRetainedFamiliarCompanion(root, draftId, {
      formId: "cat",
      currentHp: Hp(1),
      tempHp: Hp(3),
    });

    const started = readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-find-familiar-admission",
        initialCombatants: [
          {
            kind: "characterSession",
            characterId: testCharacterId(draftId),
            combatantId: "wizard",
            initiative: 12,
            side: "party",
          },
        ],
        companionAdmissions: [
          {
            ownerCharacterId: testCharacterId(draftId),
            companionCombatantId: "wizard-familiar",
            initiative: 18,
          },
        ],
      }),
    );

    expect(started.snapshot).toMatchObject({
      currentActorId: "wizard-familiar",
      turnOrder: ["wizard-familiar", "wizard"],
      combatants: [
        {
          combatantId: "wizard-familiar",
          displayName: "Cat",
          initiative: 18,
          origin: { kind: "statBlock" },
        },
        { combatantId: "wizard", origin: { kind: "character" } },
      ],
      companions: [
        {
          ownerId: "wizard",
          companionId: "wizard-familiar",
          formSelection: { tag: "normalNamedForm", formId: "cat" },
          creatureTypeOverride: "fey",
        },
      ],
    });
    expect(
      root.sessionStore.battleState?.combatants.get(
        combatantId("wizard-familiar"),
      ),
    ).toMatchObject({
      hp: Hp(1),
      tempHp: Hp(3),
    });
    expect(
      root.sessionStore.battleState === null
        ? []
        : snapshotBattle(root.sessionStore.battleState).companions,
    ).toMatchObject([
      {
        companionId: combatantId("wizard-familiar"),
        status: "present",
      },
    ]);

    const ended = readPayload(handleToolCall(root, "end_battle", {}));
    expect(ended.characters).toMatchObject([
      {
        characterId: testCharacterId(draftId),
        session: {
          companion: {
            tag: "retainedOneAtATime",
            companion: {
              // Settlement derives the protocol from the battle facts; an
              // ordinary familiar round-trips to the ordinary protocol.
              protocol: { tag: "ordinaryFamiliarLikeOneAtATime" },
              manifestation: {
                tag: "embodiedOutsideBattle",
                resolvedStatBlockId: "stat_block_cat",
                hitPoints: { currentHp: 1, tempHp: 3 },
              },
            },
          },
        },
      },
    ]);
  });

  test("fills companion reappearance holes one at a time through MCP", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-find-familiar-reappearance-fills";
    createFinalizedWizardWithFindFamiliar(root, draftId);
    setRetainedFamiliarCompanion(root, draftId);

    readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-find-familiar-reappearance-fills",
        initialCombatants: [
          {
            kind: "characterSession",
            characterId: testCharacterId(draftId),
            combatantId: "wizard",
            initiative: 18,
            side: "party",
          },
        ],
        companionAdmissions: [
          {
            ownerCharacterId: testCharacterId(draftId),
            companionCombatantId: "wizard-familiar",
            initiative: 12,
          },
        ],
      }),
    );

    const dismissalAct = readPayload(
      handleToolCall(root, "discover_battle_acts", {}),
    ).snapshot.acts.find(
      (act: {
        readonly subject: { readonly tag: string; readonly action?: string };
      }) =>
        act.subject.tag === "companionLifecycle" &&
        act.subject.action === "temporarilyDismiss",
    );
    expect(dismissalAct).toBeDefined();
    if (dismissalAct === undefined) return;
    const heldObjectHole = dismissalAct.initialHoles.find(
      (hole: { readonly kind: string }) => hole.kind === "heldObjectFacts",
    );
    expect(heldObjectHole).toBeDefined();
    if (heldObjectHole === undefined) return;

    const dismissed = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: dismissalAct.subject,
        fill: {
          kind: "heldObjectFacts",
          holeId: heldObjectHole.holeId,
          value: { objectIds: [] },
        },
      }),
    );
    expect(dismissed.result.tag).toBe("resolved");
    expect(dismissed.snapshot.companions).toMatchObject([
      {
        ownerId: "wizard",
        identity: {
          tag: "retainedBetweenBattles",
          durableCompanionId: "durable-wizard-familiar",
        },
        status: "temporarilyDismissed",
      },
    ]);

    readPayload(handleToolCall(root, "end_turn", { actorId: "wizard" }));
    const reappearanceAct = readPayload(
      handleToolCall(root, "discover_battle_acts", {}),
    ).snapshot.acts.find(
      (act: {
        readonly subject: { readonly tag: string; readonly action?: string };
      }) =>
        act.subject.tag === "companionLifecycle" &&
        act.subject.action === "reappear",
    );
    expect(reappearanceAct).toBeDefined();
    if (reappearanceAct === undefined) return;
    const placementHole = reappearanceAct.initialHoles.find(
      (hole: { readonly kind: string }) =>
        hole.kind === "companionReappearancePlacement",
    );
    expect(placementHole).toBeDefined();
    if (placementHole === undefined) return;

    const afterPlacement = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: reappearanceAct.subject,
        fill: {
          kind: "companionReappearancePlacement",
          holeId: placementHole.holeId,
          value: { kind: "unoccupiedSpaceWithin30Feet" },
        },
      }),
    );
    expect(afterPlacement.result.tag).toBe("needsHoles");
    expect(afterPlacement.session.transientBattleFills).toMatchObject({
      subject: reappearanceAct.subject,
      fills: [
        expect.objectContaining({ kind: "companionReappearancePlacement" }),
      ],
    });
    const initiativeHole = afterPlacement.result.holes.find(
      (hole: { readonly kind: string }) =>
        hole.kind === "companionReappearanceInitiative",
    );
    expect(initiativeHole).toBeDefined();
    if (initiativeHole === undefined) return;

    const afterInitiative = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: reappearanceAct.subject,
        fill: {
          kind: "companionReappearanceInitiative",
          holeId: initiativeHole.holeId,
          value: 14,
        },
      }),
    );
    expect(afterInitiative.result.tag).toBe("resolved");
    expect(afterInitiative.session.transientBattleFills).toBeNull();
    expect(afterInitiative.snapshot.companions).toMatchObject([
      {
        companionId: "wizard-familiar",
        status: "present",
        initiative: 14,
      },
    ]);
  });

  test("fills familiar touch spell delivery holes one at a time through MCP", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-find-familiar-touch-delivery-fills";
    createFinalizedWizardWithFindFamiliar(root, draftId, {
      preparedSpells: ["find_familiar", "cure_wounds"],
      spellcastingSafeLoadout: true,
    });
    setRetainedFamiliarCompanion(root, draftId);

    readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-find-familiar-touch-delivery-fills",
        initialCombatants: [
          {
            kind: "characterSession",
            characterId: testCharacterId(draftId),
            combatantId: "wizard",
            initiative: 18,
            side: "party",
          },
          {
            kind: "statBlock",
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 7,
            currentHp: 1,
            side: "opposition",
            admissionSource: { kind: "encounterParticipant" },
          },
        ],
        companionAdmissions: [
          {
            ownerCharacterId: testCharacterId(draftId),
            companionCombatantId: "wizard-familiar",
            initiative: 12,
          },
        ],
      }),
    );

    const deliveryAct = readPayload(
      handleToolCall(root, "discover_battle_acts", {}),
    ).snapshot.acts.find(
      (act: {
        readonly subject: {
          readonly tag: string;
          readonly invocation?: { readonly spellId?: string };
        };
      }) =>
        act.subject.tag === "findFamiliarTouchSpell" &&
        act.subject.invocation?.spellId === "cure_wounds",
    );
    expect(deliveryAct).toBeDefined();
    if (deliveryAct === undefined) return;
    const connectionHole = deliveryAct.initialHoles.find(
      (hole: { readonly kind: string }) =>
        hole.kind === "findFamiliarConnection",
    );
    expect(connectionHole).toBeDefined();
    if (connectionHole === undefined) return;

    const afterConnection = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: deliveryAct.subject,
        fill: {
          kind: "findFamiliarConnection",
          holeId: connectionHole.holeId,
          value: { withinRange: true },
        },
      }),
    );
    expect(afterConnection.result.tag).toBe("needsHoles");
    expect(afterConnection.session.transientBattleFills).toMatchObject({
      subject: deliveryAct.subject,
      fills: [expect.objectContaining({ kind: "findFamiliarConnection" })],
    });
    expect(
      root.sessionStore.battleState?.combatants.get(
        combatantId("wizard-familiar"),
      )?.reactionAvailable,
    ).toBe(true);
    const targetHole = afterConnection.result.holes.find(
      (hole: { readonly kind: string }) => hole.kind === "targetChoice",
    );
    expect(targetHole).toMatchObject({
      label: "Familiar touch delivery target",
      requiresTableSpatialFact: true,
    });
    if (targetHole === undefined) return;

    const afterTarget = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: deliveryAct.subject,
        fill: {
          kind: "targetChoice",
          holeId: targetHole.holeId,
          value: "goblin",
          spatialFacts: [
            {
              kind: "findFamiliarTouchSpellTarget",
              ownerId: "wizard",
              familiarId: "wizard-familiar",
              targetId: "goblin",
              spellId: "cure_wounds",
            },
          ],
        },
      }),
    );
    expect(afterTarget.result.tag).toBe("needsHoles");
    expect(
      root.sessionStore.battleState?.combatants.get(
        combatantId("wizard-familiar"),
      )?.reactionAvailable,
    ).toBe(true);
    const healingRollHole = afterTarget.result.holes.find(
      (hole: { readonly kind: string }) => hole.kind === "rolledDice",
    );
    expect(healingRollHole).toBeDefined();
    if (healingRollHole === undefined) return;

    const afterHealingRoll = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: deliveryAct.subject,
        fill: {
          kind: "rolledDice",
          holeId: healingRollHole.holeId,
          value: [{ results: [4, 4] }],
        },
      }),
    );
    expect(afterHealingRoll.result.tag).toBe("resolved");
    expect(afterHealingRoll.session.transientBattleFills).toBeNull();
    expect(
      root.sessionStore.battleState?.combatants.get(
        combatantId("wizard-familiar"),
      )?.reactionAvailable,
    ).toBe(false);
    expect(
      afterHealingRoll.snapshot.combatants.find(
        (combatant: { readonly combatantId: string }) =>
          combatant.combatantId === "goblin",
      ),
    ).toMatchObject({ hp: 8 });
  });

  test("start_battle admits a retained companion without prepared Find Familiar", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-find-familiar-spellbook-ritual-admission";
    createFinalizedWizardWithFindFamiliar(root, draftId, {
      preparedSpells: [],
    });
    setRetainedFamiliarCompanion(root, draftId, {
      formId: "owl",
    });

    const started = readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-find-familiar-spellbook-ritual-admission",
        initialCombatants: [
          {
            kind: "characterSession",
            characterId: testCharacterId(draftId),
            combatantId: "wizard",
            initiative: 12,
            side: "party",
          },
        ],
        companionAdmissions: [
          {
            ownerCharacterId: testCharacterId(draftId),
            companionCombatantId: "wizard-familiar",
            initiative: 18,
          },
        ],
      }),
    );

    expect(started.snapshot).toMatchObject({
      currentActorId: "wizard-familiar",
      turnOrder: ["wizard-familiar", "wizard"],
      companions: [
        {
          ownerId: "wizard",
          companionId: "wizard-familiar",
          formSelection: { tag: "normalNamedForm", formId: "owl" },
        },
      ],
    });
  });

  test("apply_character_session_operation retains a companion from ordinary Spell Slot casting", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-find-familiar-spell-slot-retain";
    createFinalizedWizardWithFindFamiliar(root, draftId);

    const retained = readPayload(
      handleToolCall(root, "apply_character_session_operation", {
        characterId: testCharacterId(draftId),
        operation: {
          kind: "retainOneAtATimeCompanion",
          companionId: "durable-slot-familiar",
          source: {
            tag: "spellSlotSpellCast",
            spellId: "find_familiar",
            spellLevel: 1,
          },
          selectedForm: { tag: "normalNamedForm", formId: "cat" },
          creatureTypeOverrideChoiceId: "fey",
        },
      }),
    );

    expect(retained.character).toMatchObject({
      companion: {
        tag: "retainedOneAtATime",
        companion: {
          companionId: "durable-slot-familiar",
          manifestation: {
            tag: "embodiedOutsideBattle",
            resolvedStatBlockId: "stat_block_cat",
            hitPoints: { currentHp: 2, tempHp: 0 },
          },
        },
      },
      spellSlotExpenditures: [{ spellLevel: 1, expended: 1 }],
    });
  });

  test("apply_character_session_operation rejects a durable companion id used by another character", () => {
    const root = createMcpCompositionRoot();
    const firstDraftId = "draft:mcp-duplicate-durable-familiar-first";
    const secondDraftId = "draft:mcp-duplicate-durable-familiar-second";
    createFinalizedWizardWithFindFamiliar(root, firstDraftId);
    createFinalizedWizardWithFindFamiliar(root, secondDraftId);

    readPayload(
      handleToolCall(root, "apply_character_session_operation", {
        characterId: testCharacterId(firstDraftId),
        operation: {
          kind: "retainOneAtATimeCompanion",
          companionId: "shared-durable-familiar",
          source: { tag: "ritualSpell", spellId: "find_familiar" },
          selectedForm: { tag: "normalNamedForm", formId: "cat" },
          creatureTypeOverrideChoiceId: "fey",
        },
      }),
    );

    const rejected = readPayload(
      handleToolCall(root, "apply_character_session_operation", {
        characterId: testCharacterId(secondDraftId),
        operation: {
          kind: "retainOneAtATimeCompanion",
          companionId: "shared-durable-familiar",
          source: { tag: "ritualSpell", spellId: "find_familiar" },
          selectedForm: { tag: "normalNamedForm", formId: "owl" },
          creatureTypeOverrideChoiceId: "fey",
        },
      }),
    );

    expect(rejected).toMatchObject({
      details: {
        code: "CHARACTER_SESSION_OPERATION_INVALID",
        message:
          "Retained companion id is already used by another character session.",
      },
    });
    expect(
      root.sessionStore.characters.get(testCharacterId(secondDraftId)),
    ).toMatchObject({ companion: { tag: "none" } });
  });

  test("apply_character_session_operation rejects caller-minted companion HP", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-find-familiar-hp-input-rejected";
    createFinalizedWizardWithFindFamiliar(root, draftId);

    const rejected = readPayload(
      handleToolCall(root, "apply_character_session_operation", {
        characterId: testCharacterId(draftId),
        operation: {
          kind: "retainOneAtATimeCompanion",
          companionId: "durable-hp-forged-familiar",
          source: { tag: "ritualSpell", spellId: "find_familiar" },
          selectedForm: { tag: "normalNamedForm", formId: "cat" },
          creatureTypeOverrideChoiceId: "fey",
          currentHp: 999999,
          tempHp: 50,
        },
      }),
    );

    expect(rejected).toMatchObject({
      details: { code: "INVALID_ARGUMENTS" },
    });
    expect(root.sessionStore.characters.get(testCharacterId(draftId))).toEqual(
      expect.objectContaining({ companion: { tag: "none" } }),
    );
  });

  test("start_battle orders retained companion ties after the initial owner roster", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-find-familiar-tie-order";
    createFinalizedWizardWithFindFamiliar(root, draftId);
    setRetainedFamiliarCompanion(root, draftId, {
      formId: "owl",
    });

    const started = readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-find-familiar-tie-order",
        initialCombatants: [
          {
            kind: "characterSession",
            characterId: testCharacterId(draftId),
            combatantId: "wizard",
            initiative: 18,
            side: "party",
          },
        ],
        companionAdmissions: [
          {
            ownerCharacterId: testCharacterId(draftId),
            companionCombatantId: "wizard-familiar",
            initiative: 18,
          },
        ],
      }),
    );

    expect(started.snapshot).toMatchObject({
      currentActorId: "wizard",
      turnOrder: ["wizard", "wizard-familiar"],
    });
  });

  test("end_battle clears a retained companion permanently dismissed in battle", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-find-familiar-permanent-dismiss-handoff";
    createFinalizedWizardWithFindFamiliar(root, draftId);
    setRetainedFamiliarCompanion(root, draftId, {
      formId: "owl",
    });

    readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-find-familiar-permanent-dismiss-handoff",
        initialCombatants: [
          {
            kind: "characterSession",
            characterId: testCharacterId(draftId),
            combatantId: "wizard",
            initiative: 18,
            side: "party",
          },
        ],
        companionAdmissions: [
          {
            ownerCharacterId: testCharacterId(draftId),
            companionCombatantId: "wizard-familiar",
            initiative: 12,
          },
        ],
      }),
    );

    const permanentDismissAct = readPayload(
      handleToolCall(root, "discover_battle_acts", {}),
    ).snapshot.acts.find(
      (act: {
        readonly subject: { readonly tag: string; readonly action?: string };
      }) =>
        act.subject.tag === "companionLifecycle" &&
        act.subject.action === "permanentlyDismiss",
    );
    expect(permanentDismissAct).toBeDefined();
    if (permanentDismissAct === undefined) return;

    const dismissed = readPayload(
      handleToolCall(root, "resolve_battle_act", {
        subject: permanentDismissAct.subject,
      }),
    );
    expect(dismissed.result.tag).toBe("resolved");
    expect(dismissed.snapshot.companions).toEqual([]);
    expect(
      dismissed.snapshot.combatants.some(
        (combatant: { readonly combatantId: string }) =>
          combatant.combatantId === "wizard-familiar",
      ),
    ).toBe(false);

    const ended = readPayload(handleToolCall(root, "end_battle", {}));
    expect(ended.characters).toMatchObject([
      {
        characterId: testCharacterId(draftId),
        session: {
          companion: { tag: "none" },
        },
      },
    ]);
  });

  test("end_battle leaves a retained companion untouched when it was never admitted", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-find-familiar-never-admitted-handoff";
    createFinalizedWizardWithFindFamiliar(root, draftId);
    setRetainedFamiliarCompanion(root, draftId, { formId: "owl" });

    readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-find-familiar-never-admitted-handoff",
        initialCombatants: [
          {
            kind: "characterSession",
            characterId: testCharacterId(draftId),
            combatantId: "wizard",
            initiative: 18,
            side: "party",
          },
        ],
        // No companionAdmissions: the retained companion stays out of battle, so
        // there is no battle companion entry to settle from. The Character Sheet
        // remains the source of truth and the durable slot survives end_battle.
      }),
    );

    const ended = readPayload(handleToolCall(root, "end_battle", {}));
    expect(ended.characters).toMatchObject([
      {
        characterId: testCharacterId(draftId),
        session: {
          companion: {
            tag: "retainedOneAtATime",
            companion: {
              companionId: "durable-wizard-familiar",
              manifestation: {
                selectedForm: { tag: "normalNamedForm", formId: "owl" },
              },
            },
          },
        },
      },
    ]);
  });

  test("start_battle rejects retained companion admission with a missing owner", () => {
    const root = createMcpCompositionRoot();
    const rejected = readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-find-familiar-missing-owner",
        initialCombatants: [
          {
            kind: "statBlock",
            statBlockId: "stat_block_goblin_warrior",
            combatantId: "goblin",
            initiative: 18,
            side: "opposition",
            admissionSource: { kind: "encounterParticipant" },
          },
        ],
        companionAdmissions: [
          {
            ownerCharacterId: "missing-wizard",
            companionCombatantId: "orphan-familiar",
            initiative: 18,
          },
        ],
      }),
    );

    expect(rejected).toMatchObject({
      details: {
        code: "COMPANION_OWNER_NOT_IN_ROSTER",
        companionCombatantId: "orphan-familiar",
        characterId: "missing-wizard",
      },
    });
    expect(root.sessionStore.battleState).toBeNull();
  });

  test("Character Sheet rejects invalid retained companion HP before MCP admission", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-find-familiar-invalid-form";
    createFinalizedWizardWithFindFamiliar(root, draftId);
    const session = root.sessionStore.characters.get(testCharacterId(draftId));
    if (session?.tag !== "available") {
      throw new Error("Expected test character session.");
    }

    const rejected = parseCharacterSheet(
      {
        ...session,
        companion: retainedFamiliarCompanionInput({
          currentHp: Hp(0),
        }),
      },
      root.unitLibrary,
    );

    expect(rejected).toMatchObject({
      _tag: "Left",
      left: {
        message: "Retained companion current HP must be positive.",
      },
    });
    expect(root.sessionStore.battleState).toBeNull();
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

  test("start_battle rejects duplicate character and combatant ids", () => {
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
          characterId: testCharacterId(firstDraftId),
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
    };
    const secondCharacter = {
      kind: "characterSession",
      characterId: testCharacterId(secondDraftId),
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
            { ...secondCharacter, characterId: testCharacterId(firstDraftId) },
          ],
        }),
      ),
    ).toMatchObject({
      details: {
        code: "DUPLICATE_BATTLE_CHARACTER_ID",
        characterId: testCharacterId(firstDraftId),
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
      },
    });
    expect(finalized.build).toMatchObject({
      background: "background_soldier",
      species: "species_orc",
    });
    expect(root.sessionStore.drafts.has(characterDraftId(draftId))).toBe(false);
    expect(root.sessionStore.characters.get(testCharacterId(draftId))).toEqual({
      tag: "available",
      characterId: testCharacterId(draftId),
      build: finalized.finalization.build,
      maximumHp: 12,
      hitPointMaximumReduction: 0,
      hitPoints: { tag: "positive", currentHp: 12, tempHp: 0 },
      conditions: [],
      spentHitDice: [],
      restFeatureUses: [],
      resourceExpenditures: [],
      companion: { tag: "none" },
    });
    expect(finalized.session).toMatchObject({
      draftIds: [],
      characterIds: [testCharacterId(draftId)],
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
      },
    });
    expect(root.sessionStore.snapshot()).toMatchObject({
      draftIds: [],
      characterIds: [testCharacterId(draftId)],
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
      ...GENERIC_COMBAT_ACTION_LABELS_WITH_SHOVE,
      "Adrenaline Rush",
      "Second Wind",
      "Move",
      "End Turn",
    ]);

    const afterFighterTarget = fillBattleHoleThroughTool(
      root,
      "fighter",
      "Longsword",
      {
        kind: "targetChoice",
        holeId: "battle:attack:target",
        value: "goblin",
      },
    );
    expect(root.sessionStore.battleState?.combatants.get(goblinId)?.hp).toBe(
      10,
    );
    expect(root.sessionStore.pendingBattleFills).toMatchObject({
      subject: { actorId: "fighter", attackName: "Longsword" },
      fills: [{ kind: "targetChoice", value: "goblin" }],
    });

    const afterFighterAttackRoll = fillBattleHoleThroughTool(
      root,
      "fighter",
      "Longsword",
      {
        kind: "attackRoll",
        holeId: "battle:attack:roll",
        value: { total: 16, naturalD20: 14 },
      },
      afterFighterTarget.result.subject,
    );
    const afterFighterDamage = fillBattleHoleThroughTool(
      root,
      "fighter",
      "Longsword",
      {
        kind: "rolledDice",
        holeId: "battle:attack:damage-result:1d8+3-slashing",
        value: [{ results: [5] }],
      },
      afterFighterAttackRoll.result.subject,
    );

    expect(afterFighterDamage.result.tag).toBe("resolved");
    expect(afterFighterDamage.snapshot.combatants).toEqual([
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
      "Nimble Escape",
      "Move",
      "End Turn",
    ]);

    const afterGoblinTarget = fillBattleHoleThroughTool(
      root,
      "goblin",
      "Scimitar",
      {
        kind: "targetChoice",
        holeId: "battle:attack:target",
        value: "fighter",
      },
    );
    const goblinAttackRoll = afterGoblinTarget.result.holes.find(
      (hole: { kind: string }) => hole.kind === "attackRoll",
    );
    const afterGoblinAttackRoll = fillBattleHoleThroughTool(
      root,
      "goblin",
      "Scimitar",
      {
        kind: "attackRoll",
        holeId: "battle:attack:roll",
        value: {
          total: 20,
          naturalD20: 18,
          ...(goblinAttackRoll?.rollMode === undefined
            ? {}
            : { rollMode: goblinAttackRoll.rollMode }),
        },
      },
      afterGoblinTarget.result.subject,
    );
    const afterGoblinDamage = fillBattleHoleThroughTool(
      root,
      "goblin",
      "Scimitar",
      {
        kind: "rolledDice",
        holeId: "battle:attack:damage-result:1d6+2-slashing",
        value: [{ results: [5] }],
      },
      afterGoblinAttackRoll.result.subject,
    );

    expect(afterGoblinDamage.result.tag).toBe("resolved");
    expect(afterGoblinDamage.snapshot.combatants).toEqual([
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
        characterIds: [testCharacterId(draftId)],
      },
    });
    expect(root.sessionStore.battleState).toBeNull();
    expect(root.sessionStore.characters.get(testCharacterId(draftId))).toEqual(
      expect.objectContaining({
        tag: "available",
        hitPoints: { tag: "positive", currentHp: 5, tempHp: 0 },
      }),
    );

    const characterList = readPayload(
      handleToolCall(root, "list_characters", {}),
    );
    expect(characterList.characters).toEqual([
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
      characterList.characters.some(
        (character: { readonly displayName: string | null }) =>
          character.displayName === "Goblin Warrior",
      ),
    ).toBe(false);
  });

  test("lists effective Character Sheet Hit Point maximum after reduction", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-reduced-maximum-list";
    const build = createFinalizedFighterSheet(root, draftId);
    root.sessionStore.characters.set(
      availableCharacterSessionRight({
        characterId: testCharacterId(draftId),
        build,
        maximumHp: Hp(characterBuildMaximumHp(build, root.unitLibrary)),
        currentHp: Hp(7),
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(5),
        unitLibrary: root.unitLibrary,
      }),
    );

    const characterList = readPayload(
      handleToolCall(root, "list_characters", {}),
    );

    expect(characterList.characters).toEqual([
      expect.objectContaining({
        characterId: testCharacterId(draftId),
        hitPoints: expect.objectContaining({ current: 7, maximum: 7 }),
      }),
    ]);
  });

  test("returns Shove push outcomes through MCP battle resolution output", () => {
    const root = createMcpCompositionRoot();
    root.sessionStore.battleState =
      startBattleFromCharacterBuildAndStatBlockRight({
        battleId: battleId("battle:mcp-shove-push-outcome"),
        character: {
          combatantId: fighterId,
          characterId: characterId("fighter-character"),
          displayName: "Orc Soldier Fighter",
          build: fighterCharacterBuild(root.unitLibrary),
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
        unitLibrary: root.unitLibrary,
      });

    const acts = readPayload(handleToolCall(root, "discover_battle_acts", {}));
    const shove = acts.snapshot.acts.find(
      (act: { label: string }) => act.label === "Unarmed Strike (Shove)",
    );
    expect(shove).toBeDefined();

    const afterTarget = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: shove.subject,
        fill: {
          kind: "targetChoice",
          holeId: "battle:shove:target",
          value: "goblin",
          spatialFacts: [
            {
              kind: "shoveTargetWithinReach",
              shoverId: "fighter",
              targetId: "goblin",
            },
          ],
        },
      }),
    );
    const shoveOutcome = afterTarget.result.holes.find(
      (hole: { kind: string }) => hole.kind === "shoveOutcome",
    );

    const afterShove = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: afterTarget.result.subject,
        fill: {
          kind: "shoveOutcome",
          holeId: shoveOutcome.holeId,
          value: {
            succeeded: false,
            failedEffect: {
              kind: "pushAway",
              disposition: {
                kind: "pushed",
                distanceFeet: 5,
                destinationId: "square:goblin:pushed",
                provokesOpportunityAttacks: false,
              },
            },
          },
        },
      }),
    );

    expect(afterShove.result).toMatchObject({
      tag: "resolved",
      shovePushes: [
        {
          targetId: "goblin",
          disposition: {
            kind: "pushed",
            distanceFeet: 5,
            destinationId: "square:goblin:pushed",
            provokesOpportunityAttacks: false,
          },
        },
      ],
    });
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
            characterId: testCharacterId(draftId),
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
            admissionSource: { kind: "encounterParticipant" },
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
        ...testBattleCreatureStateWithoutKnockOut(fighter, {
          hp: Hp(0),
          conditions: fighter.conditions,
        }),
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
    expect(root.sessionStore.characters.get(testCharacterId(draftId))).toEqual(
      expect.objectContaining({
        tag: "available",
        hitPoints: {
          tag: "zero",
          tempHp: 0,
          lifecycle: {
            tag: "stable",
            recovery: {
              kind: "regains1HpAfter1d4Hours",
              elapsedBeforeRecoveryRoll: 0,
            },
          },
        },
      }),
    );
    expect(readPayload(handleToolCall(root, "list_characters", {}))).toEqual(
      expect.objectContaining({
        characters: [
          expect.objectContaining({
            characterId: testCharacterId(draftId),
            hitPoints: expect.objectContaining({
              current: 0,
              maximum: 12,
              state: {
                tag: "zero",
                tempHp: 0,
                lifecycle: {
                  tag: "stable",
                  recovery: {
                    kind: "regains1HpAfter1d4Hours",
                    elapsedBeforeRecoveryRoll: 0,
                  },
                },
              },
            }),
          }),
        ],
      }),
    );
  });

  test("ends battle with a Knocked Out positive-HP character session state", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-knocked-out-closeout";
    createFinalizedFighterSheet(root, draftId);
    readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-knocked-out-closeout",
        initialCombatants: [
          {
            kind: "characterSession",
            characterId: testCharacterId(draftId),
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
            admissionSource: { kind: "encounterParticipant" },
          },
        ],
      }),
    );
    const battleState = root.sessionStore.battleState;
    const fighter = battleState?.combatants.get(fighterId);
    if (battleState === null || fighter === undefined) {
      throw new Error("Expected in-battle Fighter character combatant.");
    }
    root.sessionStore.battleState = {
      ...battleState,
      combatants: new Map(battleState.combatants).set(
        fighterId,
        testBattleCreatureStateWithoutKnockOut(fighter, {
          hp: Hp(3),
          conditions: fighter.conditions,
        }),
      ),
    } satisfies BattleState;

    readPayload(handleToolCall(root, "end_turn", { actorId: "fighter" }));
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
          spatialFacts: [
            {
              kind: "attackTargetInMeleeReach",
              actorId: "goblin",
              targetId: "fighter",
              attackName: "Scimitar",
            },
          ],
        },
      }),
    );
    readPayload(
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
    readPayload(
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
    readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: {
          tag: "action",
          actorId: "goblin",
          action: "attack",
          attackName: "Scimitar",
        },
        fill: {
          kind: "attackDamageDisposition",
          holeId: "battle:attack:damage-disposition",
          value: { kind: "knockOut" },
        },
      }),
    );

    readPayload(handleToolCall(root, "end_battle", {}));

    expect(root.sessionStore.characters.get(testCharacterId(draftId))).toEqual(
      expect.objectContaining({
        tag: "available",
        hitPoints: {
          tag: "knockedOut",
          tempHp: 0,
        },
      }),
    );
    expect(readPayload(handleToolCall(root, "list_characters", {}))).toEqual(
      expect.objectContaining({
        characters: [
          expect.objectContaining({
            characterId: testCharacterId(draftId),
            hitPoints: expect.objectContaining({
              current: 1,
              maximum: 12,
              state: {
                tag: "knockedOut",
                tempHp: 0,
              },
            }),
          }),
        ],
      }),
    );
  });

  test("ends battle without inferring Knocked Out state from positive-HP Unconscious", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-positive-unconscious-closeout";
    createFinalizedFighterSheet(root, draftId);
    readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-positive-unconscious-closeout",
        initialCombatants: [
          {
            kind: "characterSession",
            characterId: testCharacterId(draftId),
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
            admissionSource: { kind: "encounterParticipant" },
          },
        ],
      }),
    );
    const battleState = root.sessionStore.battleState;
    const fighter = battleState?.combatants.get(fighterId);
    if (battleState === null || fighter === undefined) {
      throw new Error("Expected in-battle Fighter character combatant.");
    }
    root.sessionStore.battleState = {
      ...battleState,
      combatants: new Map(battleState.combatants).set(
        fighterId,
        testBattleCreatureStateWithoutKnockOut(fighter, {
          hp: Hp(1),
          conditions: applyCondition(fighter.conditions, "unconscious"),
        }),
      ),
    } satisfies BattleState;

    readPayload(handleToolCall(root, "end_battle", {}));

    expect(root.sessionStore.characters.get(testCharacterId(draftId))).toEqual(
      expect.objectContaining({
        tag: "available",
        hitPoints: { tag: "positive", currentHp: 1, tempHp: 0 },
      }),
    );
  });

  test("starts battle with Knocked Out state from positive-HP character session state", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-knocked-out-start";
    const build = createFinalizedFighterSheet(root, draftId);
    root.sessionStore.characters.set(
      availableCharacterSessionRight({
        characterId: testCharacterId(draftId),
        build,
        maximumHp: Hp(characterBuildMaximumHp(build, root.unitLibrary)),
        currentHp: Hp(1),
        tempHp: Hp(4),
        hitPointMaximumReduction: Hp(0),
        unitLibrary: root.unitLibrary,
        positiveHpUnconscious: KNOCKED_OUT_UNCONSCIOUS,
      }),
    );

    const started = readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:mcp-knocked-out-start",
        initialCombatants: [
          {
            kind: "characterSession",
            characterId: testCharacterId(draftId),
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
            admissionSource: { kind: "encounterParticipant" },
          },
        ],
      }),
    );

    expect(started.snapshot.combatants).toEqual([
      expect.objectContaining({
        combatantId: "fighter",
        hp: 1,
        tempHp: 4,
        conditions: expect.arrayContaining(["unconscious"]),
      }),
      expect.objectContaining({ combatantId: "goblin" }),
    ]);
    expect(started.snapshot.combatants).toEqual([
      expect.objectContaining({
        combatantId: "fighter",
      }),
      expect.objectContaining({ combatantId: "goblin" }),
    ]);
  });

  test("rejects Knocked Out character session state above 1 HP", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-invalid-knocked-out-hp";
    const build = createFinalizedFighterSheet(root, draftId);

    expect(
      availableCharacterSession({
        characterId: testCharacterId(draftId),
        build,
        maximumHp: Hp(characterBuildMaximumHp(build, root.unitLibrary)),
        currentHp: Hp(6),
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        conditions: [],
        unitLibrary: root.unitLibrary,
        positiveHpUnconscious: KNOCKED_OUT_UNCONSCIOUS,
      }),
    ).toEqual(
      Either.left({
        tag: "characterSessionIssue",
        message:
          "Knocked Out character session must have exactly 1 current HP.",
      }),
    );
  });

  test("starts battle from a Stable zero-HP character session without resetting death saves", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-stable-zero-hp-start";
    const build = createFinalizedFighterSheet(root, draftId);
    root.sessionStore.characters.set(
      availableCharacterSessionRight({
        characterId: testCharacterId(draftId),
        build,
        maximumHp: Hp(characterBuildMaximumHp(build, root.unitLibrary)),
        currentHp: Hp(0),
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        unitLibrary: root.unitLibrary,
        zeroHpLifecycle: {
          tag: "stable",
          recovery: {
            kind: "regains1HpAfter1d4Hours",
            elapsedBeforeRecoveryRoll: elapsedTimeTicks(0),
          },
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
            admissionSource: { kind: "encounterParticipant" },
          },
          {
            kind: "characterSession",
            characterId: testCharacterId(draftId),
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
      availableCharacterSessionRight({
        characterId: testCharacterId(draftId),
        build,
        maximumHp: Hp(characterBuildMaximumHp(build, root.unitLibrary)),
        currentHp: Hp(0),
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        unitLibrary: root.unitLibrary,
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
            admissionSource: { kind: "encounterParticipant" },
          },
          {
            kind: "characterSession",
            characterId: testCharacterId(draftId),
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
      maximumHp: Hp(characterBuildMaximumHp(build, root.unitLibrary)),
      currentHp: Hp(0),
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      unitLibrary: root.unitLibrary,
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
            characterId: testCharacterId(draftId),
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
            admissionSource: { kind: "encounterParticipant" },
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
        ...testBattleCreatureStateWithoutKnockOut(fighter, {
          hp: Hp(0),
          conditions: fighter.conditions,
        }),
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

    expect(root.sessionStore.characters.get(testCharacterId(draftId))).toEqual(
      expect.objectContaining({
        tag: "available",
        hitPoints: {
          tag: "zero",
          tempHp: 0,
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

  test("fill_creation_holes reports every malformed fill input", () => {
    const root = createMcpCompositionRoot();
    const draftId = "draft:mcp-tool-malformed-fills";
    readPayload(handleToolCall(root, "create_character_draft", { draftId }));
    const before = root.sessionStore.drafts.get(characterDraftId(draftId));

    const rejected = readPayload(
      handleToolCall(root, "fill_creation_holes", {
        draftId,
        expectedRevision: 0,
        fills: [
          {
            kind: "choice",
            holeId: "not-a-hole",
            optionIds: ["class_fighter"],
          },
          {
            kind: "abilityScores",
            holeId: "also-not-a-hole",
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
        ],
      }),
    );

    expect(root.sessionStore.drafts.get(characterDraftId(draftId))).toEqual(
      before,
    );
    expect(rejected).toMatchObject({
      details: {
        code: "INVALID_FILLS",
        issues: [
          {
            details: {
              code: "INVALID_FIELD",
              field: "fills[0].holeId",
            },
          },
          {
            details: {
              code: "INVALID_FIELD",
              field: "fills[1].holeId",
            },
          },
        ],
      },
    });
  });

  test("finalization stores no build until the draft is ready", () => {
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
    expect(finalized.build).toBeNull();
    expect(root.sessionStore.drafts.has(characterDraftId(draftId))).toBe(true);
    expect(root.sessionStore.characters.has(testCharacterId(draftId))).toBe(
      false,
    );
  });

  test("rejects reused draft ids for active drafts and finalized character sessions", () => {
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

    readPayload(
      handleToolCall(root, "create_character_draft", {
        draftId: "draft:mcp-tool-encoded-draft",
      }),
    );
    const nonCollidingDraft = readPayload(
      handleToolCall(root, "create_character_draft", {
        draftId: "mcp-tool-encoded-draft",
      }),
    );
    expect(nonCollidingDraft.draft.draftId).toBe("mcp-tool-encoded-draft");

    const finalizedSessionDraftId = "draft:mcp-tool-duplicate-finalized";
    readPayload(
      handleToolCall(root, "create_character_draft", {
        draftId: finalizedSessionDraftId,
      }),
    );
    fillThroughTool(root, finalizedSessionDraftId, 0, initialManifestFills());
    fillThroughTool(root, finalizedSessionDraftId, 1, manifestChoiceFills());
    fillThroughTool(root, finalizedSessionDraftId, 2, manifestPurchaseFills());
    fillThroughTool(root, finalizedSessionDraftId, 3, manifestLoadoutFills());
    readPayload(
      handleToolCall(root, "finalize_character", {
        draftId: finalizedSessionDraftId,
      }),
    );

    const duplicateFinalized = handleToolCall(root, "create_character_draft", {
      draftId: finalizedSessionDraftId,
    });

    expect(readPayload(duplicateFinalized)).toMatchObject({
      details: {
        code: "DUPLICATE_CHARACTER_DRAFT_ID",
        draftId: finalizedSessionDraftId,
        existingOwner: "finalizedSession",
      },
    });
    expect(
      root.sessionStore.drafts.has(characterDraftId(finalizedSessionDraftId)),
    ).toBe(false);
    expect(
      root.sessionStore.characters.has(
        testCharacterId(finalizedSessionDraftId),
      ),
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
            ...build.equipment,
            loadout: {
              shield: testCharacterEquipmentItemId(
                "shield",
                "equipment_shield",
              ),
              weapon: {
                itemId: testCharacterEquipmentItemId(
                  "main",
                  "weapon_longsword",
                ),
                grip: "one_handed",
              },
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
          progression: wizardProgression(root),
          spellcasting: testWizardSpellcasting({
            cantrips: ["ray_of_frost"],
            preparedSpells: ["magic_missile"],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
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
          progression: wizardProgression(root),
          equipment: {
            ...build.equipment,
            loadout: {
              shield: testCharacterEquipmentItemId(
                "shield",
                "equipment_shield",
              ),
            },
          },
          spellcasting: testWizardSpellcasting({
            cantrips: ["ray_of_frost"],
            preparedSpells: ["magic_missile"],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
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
          progression: wizardProgression(root),
          equipment: {
            ...build.equipment,
            loadout: {
              shield: testCharacterEquipmentItemId(
                "shield",
                "equipment_shield",
              ),
            },
          },
          spellcasting: testWizardSpellcasting({
            cantrips: ["acid_splash"],
            preparedSpells: ["magic_missile"],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
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
    root.sessionStore.battleState = state;
    root.sessionStore.pendingBattleFills = null;

    const discovered = readPayload(
      handleToolCall(root, "discover_battle_acts", {}),
    );
    const act = discovered.snapshot.acts.find(
      (candidate: {
        readonly subject?: {
          readonly invocation?: { readonly spellId?: string };
        };
      }) => candidate.subject?.invocation?.spellId === "acid_splash",
    );
    if (act === undefined) {
      throw new Error("Expected Acid Splash battle act.");
    }
    expect(act).toMatchObject({
      initialHoles: [
        expect.objectContaining({
          kind: "savingThrowOutcome",
          areaChoices: [],
        }),
      ],
    });
    const subject = act.subject;

    const afterSavingThrow = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject,
        fill: {
          kind: "savingThrowOutcome",
          holeId: "battle:spell:saving-throw-outcome:acid_splash",
          value: {
            area: {
              originAnchorId: "fighter",
              affectedTargetIds: ["goblin"],
            },
            outcomes: [{ targetId: "goblin", succeeded: false }],
          },
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
          { combatantId: "fighter", hp: 8 },
          { combatantId: "goblin", hp: 6 },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(root.sessionStore.pendingBattleFills).toBeNull();
  });

  test("returns Fire Bolt object damage and ignition through MCP battle fills", () => {
    const root = createMcpCompositionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const state = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-root-fire-bolt-object"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Fire Bolt Spellcaster",
        initiative: initiativeScore(12),
        side: partySide,
        build: {
          ...build,
          progression: wizardProgression(root),
          equipment: {
            ...build.equipment,
            loadout: {
              shield: testCharacterEquipmentItemId(
                "shield",
                "equipment_shield",
              ),
            },
          },
          spellcasting: testWizardSpellcasting({
            cantrips: ["fire_bolt"],
            preparedSpells: [],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
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
    root.sessionStore.battleState = state;
    root.sessionStore.pendingBattleFills = null;

    const discovered = readPayload(
      handleToolCall(root, "discover_battle_acts", {}),
    );
    const act = discovered.snapshot.acts.find(
      (candidate: {
        readonly subject?: {
          readonly invocation?: { readonly spellId?: string };
        };
      }) => candidate.subject?.invocation?.spellId === "fire_bolt",
    );
    if (act === undefined) {
      throw new Error("Expected Fire Bolt battle act.");
    }
    const objectTarget = act.initialHoles.find(
      (hole: { readonly kind?: string }) => hole.kind === "objectTargetChoice",
    );
    if (objectTarget === undefined) {
      throw new Error("Expected Fire Bolt object target hole.");
    }

    const afterObjectTarget = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: act.subject,
        fill: {
          kind: "objectTargetChoice",
          holeId: objectTarget.holeId,
          value: "dry-training-dummy",
          spatialFacts: [
            {
              kind: "spellObjectTarget",
              casterId: "fighter",
              objectId: "dry-training-dummy",
              spellId: "fire_bolt",
              rangeFeet: 120,
              armorClass: 13,
              damageDisposition: { kind: "hitPoints", hitPoints: 8 },
            },
            {
              kind: "spellObjectIgnition",
              casterId: "fighter",
              objectId: "dry-training-dummy",
              spellId: "fire_bolt",
              disposition: { kind: "flammableUnattended" },
            },
          ],
        },
      }),
    );
    const attackRoll = afterObjectTarget.result.holes.find(
      (hole: { readonly kind?: string }) => hole.kind === "attackRoll",
    );
    if (attackRoll === undefined) {
      throw new Error("Expected Fire Bolt object attack roll hole.");
    }

    const afterAttackRoll = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: act.subject,
        fill: {
          kind: "attackRoll",
          holeId: attackRoll.holeId,
          value: { total: 18, naturalD20: 12 },
        },
      }),
    );
    const damage = afterAttackRoll.result.holes.find(
      (hole: { readonly kind?: string }) => hole.kind === "rolledDice",
    );
    if (damage === undefined) {
      throw new Error("Expected Fire Bolt object damage hole.");
    }

    const afterDamage = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: act.subject,
        fill: {
          kind: "rolledDice",
          holeId: damage.holeId,
          value: [{ results: [4] }],
        },
      }),
    );

    expect(afterDamage.result).toMatchObject({
      tag: "resolved",
      objectDamages: [
        {
          kind: "hitPoints",
          objectId: "dry-training-dummy",
          damageType: "fire",
          rolledDamage: 4,
          effectiveDamage: 4,
          priorHitPoints: 8,
          nextHitPoints: 4,
          destroyed: false,
        },
      ],
      objectIgnitions: [
        {
          kind: "startsBurning",
          objectId: "dry-training-dummy",
          sourceCombatantId: "fighter",
          sourceSpellId: "fire_bolt",
        },
      ],
    });
    expect(root.sessionStore.pendingBattleFills).toBeNull();
  });

  test("replays Sorcerous Burst damage-type and exploding damage through MCP battle fills", () => {
    const root = createMcpCompositionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const sorcerer = root.unitLibrary.requireUnit("class_sorcerer");
    if (sorcerer.kind !== "class") {
      throw new Error("Expected Sorcerer class Unit.");
    }
    const state = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-root-sorcerous-burst"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Sorcerous Burst Spellcaster",
        initiative: initiativeScore(12),
        side: partySide,
        build: {
          ...build,
          progression: characterBuildForClassProgression({
            base: build,
            classUnit: sorcerer,
            level: 5,
            keepClassChoices: false,
          }).progression,
          // A level-5 Sorcerer knows two Metamagic options; the build is
          // invalid without them (Metamagic known option count must match the
          // Sorcerer level).
          features: [
            ...build.features,
            {
              kind: "selectedSorcererMetamagicOption" as const,
              selectedFromUnitId: SORCERER_METAMAGIC_UNIT_ID,
              optionId: expectRight(
                sorcererMetamagicOptionId("sorcerer_quickened_spell"),
              ),
            },
            {
              kind: "selectedSorcererMetamagicOption" as const,
              selectedFromUnitId: SORCERER_METAMAGIC_UNIT_ID,
              optionId: expectRight(
                sorcererMetamagicOptionId("sorcerer_careful_spell"),
              ),
            },
          ],
          equipment: {
            ...build.equipment,
            loadout: {
              shield: testCharacterEquipmentItemId(
                "shield",
                "equipment_shield",
              ),
            },
          },
          spellcasting: testWizardSpellcasting({
            sourceUnitId: "class_sorcerer",
            spellcastingAbility: "cha",
            cantrips: ["sorcerous_burst"],
            preparedSpells: [],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
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
    root.sessionStore.battleState = state;
    root.sessionStore.pendingBattleFills = null;

    const discovered = readPayload(
      handleToolCall(root, "discover_battle_acts", {}),
    );
    const act = discovered.snapshot.acts.find(
      (candidate: {
        readonly subject?: {
          readonly invocation?: { readonly spellId?: string };
        };
      }) => candidate.subject?.invocation?.spellId === "sorcerous_burst",
    );
    if (act === undefined) {
      throw new Error("Expected Sorcerous Burst battle act.");
    }
    expect(act.initialHoles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "damageTypeChoice",
          choices: [
            "acid",
            "cold",
            "fire",
            "lightning",
            "poison",
            "psychic",
            "thunder",
          ],
        }),
        expect.objectContaining({
          kind: "targetChoice",
          choices: expect.arrayContaining(["goblin"]),
        }),
        expect.objectContaining({ kind: "objectTargetChoice" }),
      ]),
    );
    const damageType = act.initialHoles.find(
      (hole: { readonly kind?: string }) => hole.kind === "damageTypeChoice",
    );
    const target = act.initialHoles.find(
      (hole: { readonly kind?: string }) => hole.kind === "targetChoice",
    );
    if (damageType === undefined || target === undefined) {
      throw new Error("Expected Sorcerous Burst damage type and target holes.");
    }

    readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: act.subject,
        fill: {
          kind: "damageTypeChoice",
          holeId: damageType.holeId,
          value: "thunder",
        },
      }),
    );
    const afterTarget = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: act.subject,
        fill: {
          kind: "targetChoice",
          holeId: target.holeId,
          value: "goblin",
          spatialFacts: [
            {
              kind: "spellTarget",
              casterId: "fighter",
              targetId: "goblin",
              spellId: "sorcerous_burst",
            },
          ],
        },
      }),
    );
    const attackRoll = afterTarget.result.holes.find(
      (hole: { readonly kind?: string }) => hole.kind === "attackRoll",
    );
    if (attackRoll === undefined) {
      throw new Error("Expected Sorcerous Burst attack roll hole.");
    }

    const afterAttackRoll = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: act.subject,
        fill: {
          kind: "attackRoll",
          holeId: attackRoll.holeId,
          value: { total: 18, naturalD20: 12 },
        },
      }),
    );
    const damage = afterAttackRoll.result.holes.find(
      (hole: { readonly kind?: string }) => hole.kind === "rolledDice",
    );
    if (damage === undefined) {
      throw new Error("Expected Sorcerous Burst damage hole.");
    }
    expect(damage).toMatchObject({
      label: "Sorcerous Burst damage (2d8-thunder)",
    });

    const afterDamage = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: act.subject,
        fill: {
          kind: "rolledDice",
          holeId: damage.holeId,
          value: [{ results: [8, 3, 5] }],
        },
      }),
    );

    expect(afterDamage.result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: "fighter" },
          { combatantId: "goblin", hp: 0 },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(root.sessionStore.pendingBattleFills).toBeNull();
  });

  test("replays Spare the Dying stable lifecycle through MCP battle tools", () => {
    const root = createMcpCompositionRoot();
    const casterBuild = {
      ...fighterCharacterBuild(root.unitLibrary),
      progression: wizardProgression(root),
      equipment: {
        ...fighterCharacterBuild(root.unitLibrary).equipment,
        loadout: {
          shield: testCharacterEquipmentItemId("shield", "equipment_shield"),
        },
      },
      spellcasting: testWizardSpellcasting({
        cantrips: ["spare_the_dying"],
        preparedSpells: [],
        spellSlots: [{ spellLevel: 1, count: 2 }],
      }),
    };
    const targetBuild = fighterCharacterBuild(root.unitLibrary);
    root.sessionStore.characters.set(
      availableCharacterSessionRight({
        characterId: characterId("spare-the-dying-caster-character"),
        build: casterBuild,
        maximumHp: Hp(characterBuildMaximumHp(casterBuild, root.unitLibrary)),
        currentHp: Hp(characterBuildMaximumHp(casterBuild, root.unitLibrary)),
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        unitLibrary: root.unitLibrary,
      }),
    );
    root.sessionStore.characters.set(
      availableCharacterSessionRight({
        characterId: characterId("spare-the-dying-target-character"),
        build: targetBuild,
        maximumHp: Hp(characterBuildMaximumHp(targetBuild, root.unitLibrary)),
        currentHp: Hp(characterBuildMaximumHp(targetBuild, root.unitLibrary)),
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        unitLibrary: root.unitLibrary,
      }),
    );

    readPayload(
      handleToolCall(root, "start_battle", {
        battleId: "battle:spare-the-dying-mcp",
        initialCombatants: [
          {
            kind: "characterSession",
            characterId: "spare-the-dying-caster-character",
            combatantId: "fighter",
            initiative: 18,
            side: "party",
          },
          {
            kind: "characterSession",
            characterId: "spare-the-dying-target-character",
            combatantId: "dying-ally",
            initiative: 7,
            side: "party",
          },
        ],
      }),
    );
    const battleState = root.sessionStore.battleState;
    const targetCombatant = battleState?.combatants.get(
      combatantId("dying-ally"),
    );
    if (
      battleState === null ||
      targetCombatant === undefined ||
      targetCombatant.zeroHpLifecycle.policy !== "usesDeathSavingThrows"
    ) {
      throw new Error("Expected in-battle dying ally character combatant.");
    }
    root.sessionStore.battleState = {
      ...battleState,
      combatants: new Map(battleState.combatants).set(
        combatantId("dying-ally"),
        {
          ...testBattleCreatureStateWithoutKnockOut(targetCombatant, {
            hp: Hp(0),
            conditions: targetCombatant.conditions,
          }),
          zeroHpLifecycle: {
            ...targetCombatant.zeroHpLifecycle,
            deathSaves: {
              deathSaves: { successes: 2, failures: 1 },
              stable: false,
              dead: false,
              hpRegained: false,
            },
          },
        },
      ),
    } satisfies BattleState;
    const discovered = readPayload(
      handleToolCall(root, "discover_battle_acts", {}),
    );
    const act = discovered.snapshot.acts.find(
      (candidate: {
        readonly subject?: {
          readonly invocation?: { readonly spellId?: string };
        };
      }) => candidate.subject?.invocation?.spellId === "spare_the_dying",
    );
    if (act === undefined) {
      throw new Error("Expected Spare the Dying battle act.");
    }
    const target = act.initialHoles.find(
      (hole: { readonly kind?: string }) => hole.kind === "targetChoice",
    );
    if (target === undefined) {
      throw new Error("Expected Spare the Dying target hole.");
    }
    expect(target).toMatchObject({ choices: ["dying-ally"] });

    const afterTarget = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: act.subject,
        fill: {
          kind: "targetChoice",
          holeId: target.holeId,
          value: "dying-ally",
          spatialFacts: [
            {
              kind: "spellTarget",
              casterId: "fighter",
              targetId: "dying-ally",
              spellId: "spare_the_dying",
            },
          ],
        },
      }),
    );

    expect(afterTarget.result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: "fighter" },
          {
            combatantId: "dying-ally",
            hp: 0,
            zeroHpLifecycle: {
              policy: "usesDeathSavingThrows",
              deathSaves: { successes: 0, failures: 0 },
              stable: true,
              dead: false,
            },
          },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(root.sessionStore.pendingBattleFills).toBeNull();
  });

  test("returns Starry Wisp object damage through MCP battle fills", () => {
    const root = createMcpCompositionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const state = startBattleFromCharacterBuildAndStatBlockRight({
      battleId: battleId("battle-root-starry-wisp-object"),
      character: {
        combatantId: fighterId,
        characterId: characterId("fighter-character"),
        displayName: "Starry Wisp Spellcaster",
        initiative: initiativeScore(12),
        side: partySide,
        build: {
          ...build,
          progression: wizardProgression(root),
          equipment: {
            ...build.equipment,
            loadout: {
              shield: testCharacterEquipmentItemId(
                "shield",
                "equipment_shield",
              ),
            },
          },
          spellcasting: testWizardSpellcasting({
            cantrips: ["starry_wisp"],
            preparedSpells: [],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
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
    root.sessionStore.battleState = state;
    root.sessionStore.pendingBattleFills = null;

    const discovered = readPayload(
      handleToolCall(root, "discover_battle_acts", {}),
    );
    const act = discovered.snapshot.acts.find(
      (candidate: {
        readonly subject?: {
          readonly invocation?: { readonly spellId?: string };
        };
      }) => candidate.subject?.invocation?.spellId === "starry_wisp",
    );
    if (act === undefined) {
      throw new Error("Expected Starry Wisp battle act.");
    }
    const objectTarget = act.initialHoles.find(
      (hole: { readonly kind?: string }) => hole.kind === "objectTargetChoice",
    );
    if (objectTarget === undefined) {
      throw new Error("Expected Starry Wisp object target hole.");
    }

    const afterObjectTarget = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: act.subject,
        fill: {
          kind: "objectTargetChoice",
          holeId: objectTarget.holeId,
          value: "training-crystal",
          spatialFacts: [
            {
              kind: "spellObjectTarget",
              casterId: "fighter",
              objectId: "training-crystal",
              spellId: "starry_wisp",
              rangeFeet: 60,
              armorClass: 13,
              damageDisposition: { kind: "hitPoints", hitPoints: 5 },
            },
          ],
        },
      }),
    );
    const attackRoll = afterObjectTarget.result.holes.find(
      (hole: { readonly kind?: string }) => hole.kind === "attackRoll",
    );
    if (attackRoll === undefined) {
      throw new Error("Expected Starry Wisp object attack roll hole.");
    }

    const afterAttackRoll = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: act.subject,
        fill: {
          kind: "attackRoll",
          holeId: attackRoll.holeId,
          value: { total: 18, naturalD20: 12 },
        },
      }),
    );
    const damage = afterAttackRoll.result.holes.find(
      (hole: { readonly kind?: string }) => hole.kind === "rolledDice",
    );
    if (damage === undefined) {
      throw new Error("Expected Starry Wisp object damage hole.");
    }

    const afterDamage = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: act.subject,
        fill: {
          kind: "rolledDice",
          holeId: damage.holeId,
          value: [{ results: [6] }],
        },
      }),
    );

    expect(afterDamage.result).toMatchObject({
      tag: "resolved",
      objectDamages: [
        {
          kind: "hitPoints",
          objectId: "training-crystal",
          damageType: "radiant",
          rolledDamage: 6,
          effectiveDamage: 6,
          priorHitPoints: 5,
          nextHitPoints: 0,
          destroyed: true,
        },
      ],
    });
    expect(root.sessionStore.pendingBattleFills).toBeNull();
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
          progression: wizardProgression(root),
          equipment: {
            ...build.equipment,
            loadout: {
              shield: testCharacterEquipmentItemId(
                "shield",
                "equipment_shield",
              ),
            },
          },
          spellcasting: testWizardSpellcasting({
            cantrips: ["ray_of_frost"],
            preparedSpells: ["magic_missile"],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
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
    root.sessionStore.battleState = state;
    root.sessionStore.pendingBattleFills = null;

    readPayload(
      handleToolCall(root, "resolve_battle_act", {
        subject: {
          tag: "actionSpell",
          actorId: "fighter",
          invocation: {
            tag: "cantrip",
            spellId: "ray_of_frost",
            procedure: "spellAttackDamage",
          },
          mode: { tag: "ready", trigger: "attackHit" },
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
          spatialFacts: [
            {
              kind: "attackTargetInRangedRange",
              actorId: "goblin",
              targetId: "fighter",
              attackName: "Shortbow",
              rangeBand: "normal",
            },
          ],
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
        holes: [{ kind: "interruptDecision", trigger: "attackHit" }],
      },
      snapshot: {
        pendingInterrupt: { trigger: "attackHit" },
      },
    });

    const afterReactionDecision = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: goblinAttack,
        fill: {
          kind: "interruptDecision",
          holeId: "battle:interrupt:decision",
          value: {
            kind: "resolve",
            responderId: "fighter",
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
      snapshot: {
        pendingInterrupt: { trigger: "attackHit" },
      },
    });
    expect(root.sessionStore.battleState?.interruptStack).toHaveLength(1);
    expect(afterReactionDecision.session.transientBattleFills).toMatchObject({
      subject: {
        command: "releaseReadiedSpell",
      },
    });

    const releaseSubject = afterReactionDecision.result.subject;
    const spellTarget = afterReactionDecision.result.holes.find(
      (hole: { readonly kind?: string }) => hole.kind === "targetChoice",
    );
    const afterReadiedTarget = readPayload(
      handleToolCall(root, "fill_battle_hole", {
        subject: releaseSubject,
        fill: {
          kind: "targetChoice",
          holeId: spellTarget.holeId,
          value: "goblin",
          spatialFacts: [
            {
              kind: "spellTarget",
              casterId: "fighter",
              targetId: "goblin",
              spellId: "ray_of_frost",
            },
          ],
        },
      }),
    );
    expect(afterReadiedTarget.result).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "attackRoll" }],
    });
  });

  test("rejects available character sessions with non-canonical Spell Slot state", () => {
    const root = createMcpCompositionRoot();
    const build = fighterCharacterBuild(root.unitLibrary);
    const spellcastingBuild = {
      ...build,
      progression: wizardProgression(root),
      spellcasting: testWizardSpellcasting({
        cantrips: ["ray_of_frost"],
        preparedSpells: ["magic_missile"],
        spellSlots: [{ spellLevel: 1 as const, count: 2 as const }],
      }),
    };

    expect(() =>
      availableCharacterSessionRight({
        characterId: characterId("character:spell-slot-duplicate-levels"),
        build: spellcastingBuild,
        maximumHp: Hp(
          characterBuildMaximumHp(spellcastingBuild, root.unitLibrary),
        ),
        currentHp: Hp(
          characterBuildMaximumHp(spellcastingBuild, root.unitLibrary),
        ),
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        unitLibrary: root.unitLibrary,
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
            slotPools: {
              spellcasting: {
                kind: "spellcasting",
                slots: [
                  { spellLevel: 1, count: 2 },
                  { spellLevel: 2, count: 1 },
                ],
              },
            },
          },
        },
        maximumHp: Hp(
          characterBuildMaximumHp(spellcastingBuild, root.unitLibrary),
        ),
        currentHp: Hp(
          characterBuildMaximumHp(spellcastingBuild, root.unitLibrary),
        ),
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        unitLibrary: root.unitLibrary,
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

function goblinWarriorMultiattackStatBlock(
  root: ReturnType<typeof createMcpCompositionRoot>,
): StatBlockRecord {
  const base = root.statBlockCatalog.requireStatBlock(
    "stat_block_goblin_warrior",
  );
  // MCP-only upgraded Goblin Warrior fixture: the SRD Goblin Warrior has no
  // Multiattack, but this keeps the fixture small while exercising the tool path.
  return {
    ...base,
    id: "stat_block_goblin_warrior_mcp_multiattack",
    name: "Upgraded Goblin Warrior",
    statBlock: {
      ...base.statBlock,
      actions: {
        ...base.statBlock.actions,
        multiattacks: [
          {
            name: "Multiattack",
            dispatches: [
              { name: "Scimitar", count: { kind: "literal", value: 1 } },
              { name: "Shortbow", count: { kind: "literal", value: 1 } },
            ],
          },
        ],
      },
    },
  };
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
      ...fighterCharacterBuild(unitLibrary).equipment,
      loadout: {
        armor: testCharacterEquipmentItemId("armor", "armor_chain_mail"),
        weapon: {
          itemId: testCharacterEquipmentItemId("main", "weapon_shortsword"),
          grip: "one_handed",
        },
        offHandWeapon: {
          itemId: testCharacterEquipmentItemId("off", "weapon_dagger"),
        },
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
    availableCharacterSessionRight({
      characterId: testCharacterId(draftId),
      build,
      maximumHp: Hp(characterBuildMaximumHp(build, root.unitLibrary)),
      currentHp: Hp(characterBuildMaximumHp(build, root.unitLibrary)),
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      unitLibrary: root.unitLibrary,
    }),
  );
  return build;
}

function createFinalizedWizardWithFindFamiliar(
  root: ReturnType<typeof createMcpCompositionRoot>,
  draftId: string,
  input: {
    readonly preparedSpells?: readonly string[];
    readonly spellcastingSafeLoadout?: boolean;
  } = {},
): CharacterBuild {
  const fighter = fighterCharacterBuild(root.unitLibrary);
  const build = {
    ...fighter,
    progression: wizardProgression(root),
    ...(input.spellcastingSafeLoadout === true
      ? {
          equipment: {
            ...fighter.equipment,
            loadout: {
              shield: testCharacterEquipmentItemId(
                "shield",
                "equipment_shield",
              ),
            },
          },
        }
      : {}),
    spellcasting: testWizardSpellcasting({
      cantrips: [],
      spellbook: ["find_familiar"],
      preparedSpells: input.preparedSpells ?? ["find_familiar"],
      spellSlots: [{ spellLevel: 1, count: 2 }],
    }),
  };
  root.sessionStore.characters.set(
    availableCharacterSessionRight({
      characterId: testCharacterId(draftId),
      build,
      maximumHp: Hp(characterBuildMaximumHp(build, root.unitLibrary)),
      currentHp: Hp(characterBuildMaximumHp(build, root.unitLibrary)),
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      unitLibrary: root.unitLibrary,
    }),
  );
  return build;
}

function setRetainedFamiliarCompanion(
  root: ReturnType<typeof createMcpCompositionRoot>,
  draftId: string,
  input: {
    readonly formId?: string;
  } = {},
) {
  const formId = input.formId ?? "cat";
  const retained = readPayload(
    handleToolCall(root, "apply_character_session_operation", {
      characterId: testCharacterId(draftId),
      operation: {
        kind: "retainOneAtATimeCompanion",
        companionId: "durable-wizard-familiar",
        source: { tag: "ritualSpell", spellId: "find_familiar" },
        selectedForm: { tag: "normalNamedForm", formId },
        creatureTypeOverrideChoiceId: "fey",
      },
    }),
  );
  expect(retained.character).toMatchObject({
    companion: {
      tag: "retainedOneAtATime",
      companion: {
        companionId: "durable-wizard-familiar",
        manifestation: {
          selectedForm: { tag: "normalNamedForm", formId },
        },
      },
    },
  });
}

function setStoredRetainedFamiliarCompanion(
  root: ReturnType<typeof createMcpCompositionRoot>,
  draftId: string,
  input: {
    readonly formId?: string;
    readonly currentHp?: Hp;
    readonly tempHp?: Hp;
  } = {},
) {
  const session = root.sessionStore.characters.get(testCharacterId(draftId));
  if (session?.tag !== "available") {
    throw new Error("Expected test character session.");
  }
  root.sessionStore.characters.set(
    expectRight(
      replaceCharacterSheetCompanion({
        sheet: session,
        companion: retainedFamiliarCompanionInput(input),
      }),
    ),
  );
}

function retainedFamiliarCompanionInput(
  input: {
    readonly formId?: string;
    readonly currentHp?: Hp;
    readonly tempHp?: Hp;
  } = {},
): CharacterSheetCompanion {
  const formId = input.formId ?? "cat";
  return {
    tag: "retainedOneAtATime",
    companion: {
      companionId: retainedCompanionId("durable-wizard-familiar"),
      protocol: { tag: "ordinaryFamiliarLikeOneAtATime" },
      manifestation: {
        tag: "embodiedOutsideBattle",
        selectedForm: { tag: "normalNamedForm", formId },
        creatureTypeOverride: "fey",
        resolvedStatBlockId: `stat_block_${formId}`,
        hitPoints: {
          // Cast evidence: retainedFamiliarCompanionInput is a test fixture
          // helper; tests pass zero explicitly only when asserting rejection.
          currentHp: (input.currentHp ??
            Hp(1)) as CharacterSheetRetainedCompanionCurrentHitPoints,
          tempHp: input.tempHp ?? Hp(0),
        },
      },
    },
  };
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
      value: testAbilityScoreAssignment({
        str: 15,
        dex: 14,
        con: 13,
        int: 8,
        wis: 10,
        cha: 12,
      }),
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
    readonly spatialFacts?: readonly unknown[];
    readonly selectedAttackDamageRiderUnitIds?: readonly string[];
    readonly value: unknown;
  },
  subject: BattleSubject = {
    tag: "action",
    actorId: combatantId(actorId),
    action: "attack",
    attackName,
  },
) {
  const battleFill =
    fill.kind === "targetChoice" && fill.spatialFacts === undefined
      ? {
          ...fill,
          spatialFacts: [
            attackName === "Shortbow"
              ? {
                  kind: "attackTargetInRangedRange",
                  actorId,
                  targetId: String(fill.value),
                  attackName,
                  rangeBand: "normal",
                }
              : {
                  kind: "attackTargetInMeleeReach",
                  actorId,
                  targetId: String(fill.value),
                  attackName,
                },
            {
              kind: "sneakAttackAllyWithin5FeetOfTarget",
              attackerId: actorId,
              targetId: String(fill.value),
              allyId: "ally",
            },
            {
              kind: "sneakAttackAllyWithin5FeetOfTarget",
              attackerId: actorId,
              targetId: String(fill.value),
              allyId: "sneak-attack-ally",
            },
          ],
        }
      : fill;
  const payload = readPayload(
    handleToolCall(root, "fill_battle_hole", {
      subject,
      fill: battleFill,
    }),
  );
  if ("error" in payload) {
    throw new Error(JSON.stringify(payload));
  }
  return payload;
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
      ...fighterCharacterBuild(unitLibrary).equipment,
      loadout: {
        weapon: {
          itemId: testCharacterEquipmentItemId("main", "weapon_dagger"),
          grip: "one_handed",
        },
      },
    },
  };
}

function rogueBattleUnitLibrary(
  root: ReturnType<typeof createMcpCompositionRoot>,
  overrides?: {
    readonly cunningActionUnit?: UnitRecord;
    readonly sneakAttackUnit?: UnitRecord;
    readonly evasionUnit?: UnitRecord;
    readonly uncannyDodgeUnit?: UnitRecord;
  },
): ReturnType<typeof createMcpCompositionRoot>["unitLibrary"] {
  const rogueClass = rogueClassUnit(root.unitLibrary);
  const overriddenUnits = [
    rogueClass,
    ...(overrides?.cunningActionUnit === undefined
      ? []
      : [overrides.cunningActionUnit]),
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
      { level: 2, unitId: "rogue_cunning_action" },
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
    features: [
      ...input.base.features.filter(
        (feature) =>
          input.keepClassChoices || feature.kind !== "selectedClassChoice",
      ),
    ],
  };
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
