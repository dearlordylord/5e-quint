import { statBlockId as authoredStatBlockId } from "@dnd/shared/game-facts";
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import {
  battleActSpellPresentation,
  battleActSpellSlotPresentation,
  battleAreaId,
  battleObjectId,
  battleSpellEffectOccurrenceId,
  battleObscurementZones,
  breakBattleConcentration,
  ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE,
  PASSIVE_SPEED_BONUS_SUPPORT_PROFILE,
  REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
  combatantId,
  characterProcedureBinding,
  discoverBattleActs,
  endTurn,
  resolveBattleInterrupt,
  resolveBattleSubject,
  snapshotBattle,
  SPELL_CAST_REACTION_FACTS_HOLE_ID,
  type AvailableBattleAct,
  type BattleActiveEffect,
  type BattleCreatureState,
  type BattleFill,
  type BattleHole,
  type BattleInterruptProcedureChoice,
  type BattleObjectIgnitionDisposition,
  type BattleProcedureExecutionRef,
  type BattleResolutionResult,
  type BattleRuntimeSession,
  type BattleState,
  type BattleTrackedOngoingSpellLightEmitter,
  type CombatantId,
  type SpellSlotProcedure,
} from "@dnd/battle-runtime";
import { battleRuntimeSessionForTest } from "@dnd/battle-runtime/test-support";
import {
  CHARACTER_SHEET_SHORT_REST_TICKS,
  characterSheetId,
  characterSheetResources,
  completeShortRest,
  rebuildCharacterSheet,
  finishShortRest,
  startShortRest,
} from "@dnd/character-sheet-runtime";
import type { CharacterBuild } from "@dnd/character-creation-runtime";
import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  Hp,
  movementDeltaFeet,
  movementFeet,
  resourceCount,
} from "@dnd/shared/types";
import type {
  DamageType,
  StatBlockRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";

import {
  attackRollFill,
  attackSubject,
  attackTargetFill,
  areaSavingThrowOutcomeFill,
  battleFromSheets,
  battleSessionFromSheets,
  battleProcedureExecutionRefForHole,
  battleProcedureExecutionRefForTest,
  characterResources,
  characterSheet,
  damageRollFillWithGroups,
  knownWillingSpellTargetFill,
  levelFiveBardBuild,
  levelFiveClericBuild,
  levelFiveDruidWildShapeKnownFormStatBlockIds,
  levelFiveDruidBuild,
  levelFiveLegalFighterBuild,
  levelFiveMartialBuild,
  levelFiveSorcererBuild,
  levelFiveWarlockBuild,
  levelFiveWizardBuild,
  monsterBattleInput,
  ordinaryAttackDamageFills,
  requireCharacterCombatant,
  requireCombatant,
  requireHole,
  requireHoleFromList,
  requireResolved,
  requireRight,
  savingThrowOutcomeFill,
  spellSlotActForProcedure,
  srdStatBlock,
  unitFeatureDecisionFill,
  unitLibrary,
} from "./sdk-integration-test-support.ts";

const extraAttackBarbarianId = combatantId(
  "combatant:l5-tracer-extra-attack-barbarian",
);
const fastMovementBarbarianId = combatantId(
  "combatant:l5-tracer-fast-movement-barbarian",
);
const extraAttackFighterId = combatantId(
  "combatant:l5-tracer-extra-attack-fighter",
);
const legalExtraAttackFighterId = combatantId(
  "combatant:l5-tracer-legal-extra-attack-fighter",
);
const extraAttackPaladinId = combatantId(
  "combatant:l5-tracer-extra-attack-paladin",
);
const extraAttackRangerId = combatantId(
  "combatant:l5-tracer-extra-attack-ranger",
);
const extraAttackMonkId = combatantId("combatant:l5-tracer-extra-attack-monk");
const monkId = combatantId("combatant:l5-tracer-monk");
const rogueId = combatantId("combatant:l5-tracer-rogue");
const rogueAllyId = combatantId("combatant:l5-tracer-rogue-ally");
const wizardId = combatantId("combatant:l5-tracer-wizard");
const wardedId = combatantId("combatant:l5-tracer-warded");
const monsterId = combatantId("combatant:l5-tracer-monster");
const counterspellSorcererId = combatantId(
  "combatant:l5-tracer-counterspell-sorcerer",
);
const counterspellWarlockId = combatantId(
  "combatant:l5-tracer-counterspell-warlock",
);
const counterspellWizardId = combatantId(
  "combatant:l5-tracer-counterspell-wizard",
);
const counterspellTriggeringWizardId = combatantId(
  "combatant:l5-tracer-counterspell-triggering-wizard",
);
const dispelMagicBardId = combatantId("combatant:l5-tracer-dispel-bard");
const dispelMagicClericId = combatantId("combatant:l5-tracer-dispel-cleric");
const dispelMagicDruidId = combatantId("combatant:l5-tracer-dispel-druid");
const dispelMagicSorcererId = combatantId(
  "combatant:l5-tracer-dispel-sorcerer",
);
const dispelMagicWarlockId = combatantId("combatant:l5-tracer-dispel-warlock");
const dispelMagicWizardId = combatantId("combatant:l5-tracer-dispel-wizard");
const fireballSorcererId = combatantId("combatant:l5-tracer-fireball-sorcerer");
const fireballWizardId = combatantId("combatant:l5-tracer-fireball-wizard");
const fireballTargetId = combatantId("combatant:l5-tracer-fireball-target");
const flySorcererId = combatantId("combatant:l5-tracer-fly-sorcerer");
const flyWarlockId = combatantId("combatant:l5-tracer-fly-warlock");
const flyWizardId = combatantId("combatant:l5-tracer-fly-wizard");
const hasteSorcererId = combatantId("combatant:l5-tracer-haste-sorcerer");
const glyphOfWardingBardId = combatantId(
  "combatant:l5-tracer-glyph-of-warding-bard",
);
const glyphOfWardingClericId = combatantId(
  "combatant:l5-tracer-glyph-of-warding-cleric",
);
const glyphOfWardingWizardId = combatantId(
  "combatant:l5-tracer-glyph-of-warding-wizard",
);
const hypnoticPatternBardId = combatantId(
  "combatant:l5-tracer-hypnotic-pattern-bard",
);
const hypnoticPatternSorcererId = combatantId(
  "combatant:l5-tracer-hypnotic-pattern-sorcerer",
);
const hypnoticPatternWarlockId = combatantId(
  "combatant:l5-tracer-hypnotic-pattern-warlock",
);
const hypnoticPatternWizardId = combatantId(
  "combatant:l5-tracer-hypnotic-pattern-wizard",
);
const lightningBoltSorcererId = combatantId(
  "combatant:l5-tracer-lightning-bolt-sorcerer",
);
const lightningBoltWizardId = combatantId(
  "combatant:l5-tracer-lightning-bolt-wizard",
);
const lightningBoltFailedSaveTargetId = combatantId(
  "combatant:l5-tracer-lightning-bolt-failed-save-target",
);
const lightningBoltSuccessfulSaveTargetId = combatantId(
  "combatant:l5-tracer-lightning-bolt-successful-save-target",
);
const massHealingWordBardId = combatantId(
  "combatant:l5-tracer-mass-healing-word-bard",
);
const massHealingWordClericId = combatantId(
  "combatant:l5-tracer-mass-healing-word-cleric",
);
const massHealingWordTargetAId = combatantId(
  "combatant:l5-tracer-mass-healing-word-target-a",
);
const massHealingWordTargetBId = combatantId(
  "combatant:l5-tracer-mass-healing-word-target-b",
);
const protectionFromEnergyClericId = combatantId(
  "combatant:l5-tracer-protection-from-energy-cleric",
);
const protectionFromEnergyDruidId = combatantId(
  "combatant:l5-tracer-protection-from-energy-druid",
);
const protectionFromEnergySorcererId = combatantId(
  "combatant:l5-tracer-protection-from-energy-sorcerer",
);
const sleetStormDruidId = combatantId("combatant:l5-tracer-sleet-storm-druid");
const sleetStormSorcererId = combatantId(
  "combatant:l5-tracer-sleet-storm-sorcerer",
);
const sleetStormWizardId = combatantId(
  "combatant:l5-tracer-sleet-storm-wizard",
);
const sleetStormTargetId = combatantId(
  "combatant:l5-tracer-sleet-storm-target",
);
const slowBardId = combatantId("combatant:l5-tracer-slow-bard");
const slowSorcererId = combatantId("combatant:l5-tracer-slow-sorcerer");
const slowWizardId = combatantId("combatant:l5-tracer-slow-wizard");
const slowFailedSaveTargetId = combatantId(
  "combatant:l5-tracer-slow-failed-save-target",
);
const slowSuccessfulSaveTargetId = combatantId(
  "combatant:l5-tracer-slow-successful-save-target",
);

const barbarianExtraAttackUnitId = "barbarian_extra_attack";
const fighterExtraAttackUnitId = "fighter_extra_attack";
const paladinExtraAttackUnitId = "paladin_extra_attack";
const rangerExtraAttackUnitId = "ranger_extra_attack";
const monkExtraAttackUnitId = "monk_extra_attack";
const monkFocusUnitId = "monk_monks_focus";
const rogueUncannyDodgeUnitId = "rogue_uncanny_dodge";
const sorcererFontOfMagicUnitId = "sorcerer_font_of_magic";
const hasteSpellId = "haste";
const protectionFromEnergySpellId = "protection_from_energy";
const counterspellSpellId = "counterspell";
const dispelMagicSpellId = "dispel_magic";
const continualFlameSpellId = "continual_flame";
const fireballSpellId = "fireball";
const flySpellId = "fly";
const glyphOfWardingSpellId = "glyph_of_warding";
const hypnoticPatternSpellId = "hypnotic_pattern";
const lightningBoltSpellId = "lightning_bolt";
const massHealingWordSpellId = "mass_healing_word";
const sleetStormSpellId = "sleet_storm";
const slowSpellId = "slow";
const counterspellCastLevel = 3;
const dispelMagicCastLevel = 3;
const fireballCastLevel = 3;
const flyCastLevel = 3;
const hasteCastLevel = 3;
const glyphOfWardingCastLevel = 3;
const hypnoticPatternCastLevel = 3;
const lightningBoltCastLevel = 3;
const massHealingWordCastLevel = 3;
const protectionFromEnergyCastLevel = 3;
const sleetStormCastLevel = 3;
const slowCastLevel = 3;
const slowCubeSideFeet = 40;
const slowMaxTargets = 6;
const slowDurationTicks = elapsedTimeTicks(10);
const flySpeedFeet = 60;
const magicMissileSpellId = "magic_missile";
const magicMissileTriggerSlotLevel = 1;
const sleetStormAreaId = battleAreaId("area:l5-tracer-sleet-storm-cylinder");
const syntheticSleetStormTargetConcentrationSpellId =
  "synthetic_l5_tracer_sleet_storm_target_concentration";
const fireballObjectId = battleObjectId("object:l5-tracer-fireball-kindling");
const fireballDamageRollResults = [4, 4, 4, 4, 4, 4, 4, 4] as const;
const fireballDamageTotal = fireballDamageRollResults.reduce(
  (total, roll) => total + roll,
  0,
);
const lightningBoltDamageDiceCount = 8;
const lightningBoltDamageRollResults = Array.from(
  { length: lightningBoltDamageDiceCount },
  () => 2,
);
const lightningBoltDamageTotal = lightningBoltDamageRollResults.reduce(
  (total, roll) => total + roll,
  0,
);
const lightningBoltHalfDamageTotal = Math.floor(lightningBoltDamageTotal / 2);
const massHealingWordHealingRollResults = [2, 3] as const;
const massHealingWordSpellcastingAbilityModifier = 3;
const massHealingWordHealingTotal =
  massHealingWordHealingRollResults.reduce((total, roll) => total + roll, 0) +
  massHealingWordSpellcastingAbilityModifier;
type CounterspellClassAccessCase = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly reactorId: CombatantId;
  readonly build: CharacterBuild;
};
type DispelMagicClassAccessCase = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly casterId: CombatantId;
  readonly build: CharacterBuild;
  readonly druidWildShapeKnownFormStatBlockIds?: readonly StatBlockRecord["id"][];
};
type FireballClassAccessCase = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly casterId: CombatantId;
  readonly build: CharacterBuild;
};
type HasteClassAccessCase = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly casterId: CombatantId;
  readonly build: CharacterBuild;
};
type FlyClassAccessCase = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly casterId: CombatantId;
  readonly build: CharacterBuild;
};
type GlyphOfWardingClassAccessCase = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly casterId: CombatantId;
  readonly build: CharacterBuild;
};
type HypnoticPatternClassAccessCase = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly casterId: CombatantId;
  readonly build: CharacterBuild;
};
type LightningBoltClassAccessCase = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly casterId: CombatantId;
  readonly build: CharacterBuild;
};
type MassHealingWordClassAccessCase = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly casterId: CombatantId;
  readonly build: CharacterBuild;
};
type ProtectionFromEnergyClassAccessCase = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly casterId: CombatantId;
  readonly build: CharacterBuild;
  readonly druidWildShapeKnownFormStatBlockIds?: readonly StatBlockRecord["id"][];
};
type SleetStormClassAccessCase = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly casterId: CombatantId;
  readonly build: CharacterBuild;
  readonly druidWildShapeKnownFormStatBlockIds?: readonly StatBlockRecord["id"][];
};
type SlowClassAccessCase = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly casterId: CombatantId;
  readonly build: CharacterBuild;
};
type CastBonusActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<
    AvailableBattleAct["subject"],
    { readonly tag: "bonusActionSpell" }
  >;
};
type OngoingSpellTargetChoiceFill = Extract<
  BattleFill,
  { readonly kind: "ongoingSpellTargetChoice" }
>;
type OngoingSpellTarget = OngoingSpellTargetChoiceFill["value"];
type OngoingSpellTargetWithinRangeFact =
  OngoingSpellTargetChoiceFill["spatialFacts"][number];
type ReactionRollOrDamageReductionChoice = Extract<
  BattleInterruptProcedureChoice,
  { readonly kind: "reactionRollOrDamageReduction" }
>;

describe("level 5 SDK tracer bullets", () => {
  test("Barbarian Fast Movement projects through sheet handoff and increases Speed plus Dash without Heavy armor", () => {
    assertLevelFiveFastMovementHandoff();
  });

  test("Barbarian Extra Attack projects through sheet handoff and opens exactly one added attack slot", () => {
    assertLevelFiveExtraAttackHandoff({
      actorId: extraAttackBarbarianId,
      battleIdText: "battle:l5-tracer-extra-attack-barbarian",
      characterIdText: "character:l5-tracer-extra-attack-barbarian",
      classUnitId: authoredUnitId("class_barbarian"),
      sourceUnitId: authoredUnitId(barbarianExtraAttackUnitId),
      weaponUnitId: authoredUnitId("weapon_longsword"),
      attackName: "Longsword",
      abilityScores: {
        str: 16,
        dex: 10,
        con: 14,
        int: 10,
        wis: 10,
        cha: 10,
      },
    });
  });

  test("Fighter Extra Attack projects through sheet handoff and opens exactly one added attack slot", () => {
    assertLevelFiveExtraAttackHandoff({
      actorId: extraAttackFighterId,
      battleIdText: "battle:l5-tracer-extra-attack-fighter",
      characterIdText: "character:l5-tracer-extra-attack-fighter",
      classUnitId: authoredUnitId("class_fighter"),
      sourceUnitId: authoredUnitId(fighterExtraAttackUnitId),
      weaponUnitId: authoredUnitId("weapon_longsword"),
      attackName: "Longsword",
      abilityScores: {
        str: 16,
        dex: 10,
        con: 14,
        int: 10,
        wis: 10,
        cha: 10,
      },
    });
  });

  test("rule-legal Fighter 5 creation carries Extra Attack through sheet handoff and spends exactly one added attack slot", () => {
    assertLevelFiveExtraAttackHandoff({
      actorId: legalExtraAttackFighterId,
      battleIdText: "battle:l5-tracer-legal-extra-attack-fighter",
      characterIdText: "character:l5-tracer-legal-extra-attack-fighter",
      classUnitId: authoredUnitId("class_fighter"),
      build: levelFiveLegalFighterBuild(),
      sourceUnitId: authoredUnitId(fighterExtraAttackUnitId),
      weaponUnitId: authoredUnitId("weapon_longsword"),
      attackName: "Longsword",
    });
  });

  test("Paladin Extra Attack projects through sheet handoff and opens exactly one added attack slot", () => {
    assertLevelFiveExtraAttackHandoff({
      actorId: extraAttackPaladinId,
      battleIdText: "battle:l5-tracer-extra-attack-paladin",
      characterIdText: "character:l5-tracer-extra-attack-paladin",
      classUnitId: authoredUnitId("class_paladin"),
      sourceUnitId: authoredUnitId(paladinExtraAttackUnitId),
      weaponUnitId: authoredUnitId("weapon_longsword"),
      attackName: "Longsword",
      abilityScores: {
        str: 16,
        dex: 10,
        con: 14,
        int: 10,
        wis: 10,
        cha: 16,
      },
    });
  });

  test("Ranger Extra Attack projects through sheet handoff and opens exactly one added attack slot", () => {
    assertLevelFiveExtraAttackHandoff({
      actorId: extraAttackRangerId,
      battleIdText: "battle:l5-tracer-extra-attack-ranger",
      characterIdText: "character:l5-tracer-extra-attack-ranger",
      classUnitId: authoredUnitId("class_ranger"),
      sourceUnitId: authoredUnitId(rangerExtraAttackUnitId),
      weaponUnitId: authoredUnitId("weapon_longsword"),
      attackName: "Longsword",
      abilityScores: {
        str: 16,
        dex: 14,
        con: 14,
        int: 10,
        wis: 16,
        cha: 10,
      },
    });
  });

  test("Extra Attack projects a level-5 martial character through sheet handoff and opens exactly one added attack slot", () => {
    assertLevelFiveExtraAttackHandoff({
      actorId: extraAttackMonkId,
      battleIdText: "battle:l5-tracer-extra-attack",
      characterIdText: "character:l5-tracer-extra-attack",
      classUnitId: authoredUnitId("class_monk"),
      sourceUnitId: authoredUnitId(monkExtraAttackUnitId),
      weaponUnitId: authoredUnitId("weapon_dagger"),
      attackName: "Dagger",
      abilityScores: {
        str: 10,
        dex: 16,
        con: 14,
        int: 10,
        wis: 16,
        cha: 10,
      },
    });
  });

  test("Stunning Strike projects Monk Focus, spends one Focus Point, and applies the failed-save Stunned result", () => {
    const session = battleSessionFromSheets({
      battleIdText: "battle:l5-tracer-stunning-strike",
      characters: [
        characterSheet({
          characterIdText: "character:l5-tracer-stunning-strike",
          build: levelFiveMartialBuild({
            classUnitId: authoredUnitId("class_monk"),
            weaponUnitId: authoredUnitId("weapon_dagger"),
            abilityScores: {
              str: 10,
              dex: 16,
              con: 14,
              int: 10,
              wis: 16,
              cha: 10,
            },
          }),
          combatantId: monkId,
          initiative: 20,
        }),
      ],
      monsters: [
        monsterBattleInput(
          monsterId,
          10,
          srdStatBlock(authoredStatBlockId("stat_block_skeleton")),
        ),
      ],
    });
    const state = session.state;
    const subject = attackSubject(session, monkId, "Dagger");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [attackTargetFill(target, monkId, monsterId, "Dagger")],
      }),
      "attackRoll",
    );
    const hitFills = [
      attackTargetFill(target, monkId, monsterId, "Dagger"),
      attackRollFill(roll, { total: 20, naturalD20: 15 }),
    ];
    const decision = requireHole(
      resolveBattleSubject({ state, subject, fills: hitFills }),
      "unitFeatureDecision",
    );
    const save = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [...hitFills, unitFeatureDecisionFill(decision, "attempt")],
      }),
      "savingThrowOutcome",
    );

    expect(save).toMatchObject({ ability: "con", targetIds: [monsterId] });

    const saveFills = [
      ...hitFills,
      unitFeatureDecisionFill(decision, "attempt"),
      savingThrowOutcomeFill(save, [{ targetId: monsterId, succeeded: false }]),
    ];
    const damage = requireHole(
      resolveBattleSubject({ state, subject, fills: saveFills }),
      "rolledDice",
    );
    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: ordinaryAttackDamageFills({
          state,
          subject,
          prefixFills: saveFills,
          damage,
          damageDice: [[2]],
        }),
      }),
    );
    const monk = requireCharacterCombatant(resolved.state, monkId);
    const targetAfterStrike = requireCombatant(resolved.state, monsterId);
    const stunningStrikeEffect = targetAfterStrike.activeEffects.find(
      (effect) => effect.kind === "unitFeatureCondition",
    );
    if (stunningStrikeEffect?.kind !== "unitFeatureCondition") {
      throw new Error("Expected Stunning Strike active effect.");
    }
    const stunningStrikeProcedureRef =
      monk.origin.execution.procedureBindings.find((binding) => {
        const procedure = binding.procedure;
        return (
          binding.procedureRef === stunningStrikeEffect.sourceProcedureRef &&
          (procedure.kind === "unitFeature" ||
            procedure.kind === "unitSupportProfile") &&
          typeof procedure.execution === "object" &&
          procedure.execution.kind === "stunningStrike"
        );
      })?.procedureRef;

    expect(stunningStrikeProcedureRef).toBeDefined();

    expect(hasCondition(targetAfterStrike.conditions, "stunned")).toBe(true);
    expect(targetAfterStrike.activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "unitFeatureCondition",
          sourceProcedureRef: stunningStrikeProcedureRef,
          sourceCombatantId: monkId,
          condition: "stunned",
          expiresAt: { kind: "startOfTurn", combatantId: monkId },
        }),
      ]),
    );
    const monkFocusOwnership = session.context.characters
      .get(monkId)
      ?.resourceOwnership.find(
        (ownership) => ownership.unit.id === monkFocusUnitId,
      );
    if (monkFocusOwnership === undefined) {
      throw new Error("Expected Monk Focus resource ownership.");
    }
    const monkFocusResource = characterResources(monk).find(
      (resource) =>
        resource.resourcePoolRef === monkFocusOwnership.resourcePoolRef,
    );

    expect(monkFocusResource).toMatchObject({ usesRemaining: 4 });
  });

  test("Cunning Strike projects Sneak Attack, forgoes one die for Trip, and applies Prone after a failed save", () => {
    const session = battleSessionFromSheets({
      battleIdText: "battle:l5-tracer-cunning-strike",
      characters: [
        characterSheet({
          characterIdText: "character:l5-tracer-cunning-strike",
          build: levelFiveMartialBuild({
            classUnitId: authoredUnitId("class_rogue"),
            weaponUnitId: authoredUnitId("weapon_dagger"),
            abilityScores: {
              str: 10,
              dex: 16,
              con: 14,
              int: 10,
              wis: 10,
              cha: 10,
            },
          }),
          combatantId: rogueId,
          initiative: 20,
        }),
        characterSheet({
          characterIdText: "character:l5-tracer-cunning-strike-ally",
          build: levelFiveMartialBuild({
            classUnitId: authoredUnitId("class_fighter"),
            weaponUnitId: authoredUnitId("weapon_longsword"),
          }),
          combatantId: rogueAllyId,
          initiative: 15,
        }),
      ],
      monsters: [
        monsterBattleInput(
          monsterId,
          10,
          srdStatBlock(authoredStatBlockId("stat_block_skeleton")),
          {
            tempHp: 40,
          },
        ),
      ],
    });
    const state = session.state;
    const subject = attackSubject(session, rogueId, "Dagger");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetSelection = attackTargetFill(
      target,
      rogueId,
      monsterId,
      "Dagger",
      [
        {
          kind: "attackerAllyWithin5FeetOfTarget",
          attackerId: rogueId,
          targetId: monsterId,
          allyId: rogueAllyId,
        },
      ],
    );
    const roll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetSelection],
      }),
      "attackRoll",
    );
    const attackRoll = attackRollFill(roll, { total: 18, naturalD20: 13 });
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetSelection, attackRoll],
      }),
      "rolledDice",
    );

    expect(damage).toMatchObject({
      attackDamageRiders: expect.arrayContaining([
        expect.objectContaining({
          damage: { dice: 3, dieSize: 6, damageType: "piercing" },
        }),
      ]),
      cunningStrikeOptions: expect.arrayContaining([
        expect.objectContaining({
          optionId: "trip",
          dieCost: { dice: 1, dieSize: 6 },
        }),
      ]),
    });
    if (!("attackDamageRiders" in damage)) {
      throw new Error("Expected an attack damage roll hole.");
    }
    const sneakAttackProcedureRef =
      damage.attackDamageRiders?.[0]?.procedureRef;
    const tripOption = damage.cunningStrikeOptions?.find(
      (option) => option.optionId === "trip",
    );
    if (sneakAttackProcedureRef === undefined || tripOption === undefined) {
      throw new Error(
        "Expected Cunning Strike mechanical procedure references.",
      );
    }

    const damageFills = ordinaryAttackDamageFills({
      state,
      subject,
      prefixFills: [targetSelection, attackRoll],
      damage,
      damageDice: [[4], [6, 5]],
      selectedAttackDamageRiderProcedureRefs: [sneakAttackProcedureRef],
      cunningStrikeOption: {
        procedureRef: tripOption.procedureRef,
        optionId: "trip",
      },
    });
    const save = requireHole(
      resolveBattleSubject({ state, subject, fills: damageFills }),
      "savingThrowOutcome",
    );
    expect(save).toMatchObject({ ability: "dex", targetIds: [monsterId] });

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...damageFills,
          savingThrowOutcomeFill(save, [
            { targetId: monsterId, succeeded: false },
          ]),
        ],
      }),
    );

    expect(
      hasCondition(
        requireCombatant(resolved.state, monsterId).conditions,
        "prone",
      ),
    ).toBe(true);
    expect(
      resolved.state.currentTurnResources.attackDamageRidersUsedThisTurn,
    ).toEqual([{ attackerId: rogueId, procedureRef: sneakAttackProcedureRef }]);
  });

  test("Rogue Uncanny Dodge projects through sheet handoff and halves visible attack-roll damage", () => {
    const scimitarDamageDieRoll = 6;
    const expectedUncannyDodgeDamage = 4;
    const session = battleSessionFromSheets({
      battleIdText: "battle:l5-tracer-uncanny-dodge",
      characters: [
        characterSheet({
          characterIdText: "character:l5-tracer-uncanny-dodge",
          build: levelFiveMartialBuild({
            classUnitId: authoredUnitId("class_rogue"),
            weaponUnitId: authoredUnitId("weapon_dagger"),
            abilityScores: {
              str: 10,
              dex: 16,
              con: 14,
              int: 10,
              wis: 10,
              cha: 10,
            },
          }),
          combatantId: rogueId,
          initiative: 10,
        }),
      ],
      monsters: [
        monsterBattleInput(
          monsterId,
          20,
          srdStatBlock(authoredStatBlockId("stat_block_goblin_warrior")),
        ),
      ],
    });
    const state = session.state;

    expect(
      session.context.characters.get(rogueId)?.unitPresentationSources,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          unit: expect.objectContaining({ id: rogueUncannyDodgeUnitId }),
          supportProfiles: expect.arrayContaining([
            REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
          ]),
        }),
      ]),
    );

    const beforeHp = requireCharacterCombatant(state, rogueId).hp;
    const subject = attackSubject(session, monsterId, "Scimitar");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetSelection = attackTargetFill(
      target,
      monsterId,
      rogueId,
      subject,
    );
    const roll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetSelection],
      }),
      "attackRoll",
    );
    const attackRoll = attackRollFill(roll, { total: 20, naturalD20: 15 });
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [targetSelection, attackRoll],
    });

    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Uncanny Dodge Reaction window.");
    }
    const choice = requireUncannyDodgeAttackDamageChoice(
      awaitingReaction,
      rogueId,
    );
    expect(choice.initialHoles).toEqual([]);
    expect(choice.choice.reduction).toEqual({ kind: "halfDamage" });

    const afterReaction = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHoleFromList(awaitingReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: rogueId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            procedureRef: choice.choice.procedureRef,
            modifierKind: "attackDamageReduction",
            fills: [],
          },
        },
      ),
    });
    if (afterReaction.tag !== "needsHoles") {
      throw new Error("Expected Uncanny Dodge damage roll hole.");
    }
    const damage = requireHole(afterReaction, "rolledDice");
    const resolved = requireResolved(
      resolveBattleSubject({
        state: afterReaction.state,
        subject,
        fills: ordinaryAttackDamageFills({
          state: afterReaction.state,
          subject,
          prefixFills: [targetSelection, attackRoll],
          damage,
          damageDice: [[scimitarDamageDieRoll]],
        }),
      }),
    );
    const rogue = requireCharacterCombatant(resolved.state, rogueId);

    expect(rogue.hp).toBe(Hp(Number(beforeHp) - expectedUncannyDodgeDamage));
    expect(rogue.reactionAvailable).toBe(false);
    expect(resolved.snapshot.pendingInterrupt).toBeNull();
  });

  test("Haste casts from a level-5 spellcaster sheet and projects speed, AC, Dexterity save, action, slot, and lethargy behavior", () => {
    const hasteCases = [
      {
        sourceUnitId: authoredUnitId("class_sorcerer"),
        casterId: hasteSorcererId,
        build: levelFiveSorcererBuild({
          preparedSpells: [authoredUnitId(hasteSpellId)],
        }),
      },
      {
        sourceUnitId: authoredUnitId("class_wizard"),
        casterId: wizardId,
        build: levelFiveWizardBuild({
          preparedSpells: [authoredUnitId(hasteSpellId)],
        }),
      },
    ] as const satisfies ReadonlyArray<HasteClassAccessCase>;

    for (const hasteCase of hasteCases) {
      expectHasteClassAccess(hasteCase);

      const session = battleSessionFromSheets({
        battleIdText: `battle:l5-tracer-haste-${hasteCase.sourceUnitId}`,
        characters: [
          characterSheet({
            characterIdText: `character:l5-tracer-haste-${hasteCase.sourceUnitId}`,
            build: hasteCase.build,
            combatantId: hasteCase.casterId,
            initiative: 20,
          }),
        ],
        monsters: [
          monsterBattleInput(
            monsterId,
            10,
            srdStatBlock(authoredStatBlockId("stat_block_skeleton")),
          ),
        ],
      });
      const state = session.state;
      const act = spellSlotActForProcedure(
        session,
        hasteSpellId,
        hasteCastLevel,
        "hastePositive",
      );
      const target = requireHoleFromList(act.initialHoles, "targetChoice");
      const resolved = requireResolved(
        resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [
            knownWillingSpellTargetFill(
              target,
              hasteSpellId,
              hasteCase.casterId,
              hasteCase.casterId,
            ),
          ],
        }),
      );
      const caster = requireCharacterCombatant(
        resolved.state,
        hasteCase.casterId,
      );

      expect(resolved.snapshot.combatants).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            combatantId: hasteCase.casterId,
            concentrating: true,
            armorClass: 14,
            movement: expect.objectContaining({ speedFeet: 60 }),
          }),
        ]),
      );
      expect(caster.origin.spellcasting?.spellSlots).toEqual([
        { spellLevel: 1, count: 4, expended: 0 },
        { spellLevel: 2, count: 3, expended: 0 },
        { spellLevel: hasteCastLevel, count: 2, expended: 1 },
      ]);
      expect(caster.activeEffects).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: "speedRatio",
            sourceProcedureRef: act.subject.procedureRef,
          }),
          expect.objectContaining({
            kind: "spellArmorClassBonus",
            sourceProcedureRef: act.subject.procedureRef,
          }),
          expect.objectContaining({
            kind: "savingThrowRollMode",
            sourceProcedureRef: act.subject.procedureRef,
            ability: "dex",
            mode: "advantage",
          }),
          expect.objectContaining({
            kind: "spellGrantedActionResource",
            sourceProcedureRef: act.subject.procedureRef,
          }),
        ]),
      );
      expect(resolved.state.currentTurnResources.actionResources).toEqual([
        expect.objectContaining({
          kind: "action",
          source: "spellEffect",
          sourceOwnerId: hasteCase.casterId,
          restriction: {
            kind: "allow_only",
            actions: [
              {
                action: "attack",
                attackLimit: { kind: "attack_count", count: 1 },
              },
              { action: "dash" },
              { action: "disengage" },
              { action: "hide" },
              { action: "utilize" },
            ],
          },
        }),
      ]);

      const ended = breakBattleConcentration(
        resolved.state,
        hasteCase.casterId,
      );
      const lethargic = requireCombatant(ended, hasteCase.casterId);

      expect(hasCondition(lethargic.conditions, "incapacitated")).toBe(true);
      expect(snapshotBattle(ended).combatants).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            combatantId: hasteCase.casterId,
            movement: expect.objectContaining({ speedFeet: 0 }),
          }),
        ]),
      );
      expect(
        lethargic.activeEffects.some(
          (effect) =>
            effect.kind === "spellGrantedActionResource" &&
            effect.sourceProcedureRef === act.subject.procedureRef,
        ),
      ).toBe(false);
    }
  });

  test("Protection from Energy projects Cleric, Druid, and Sorcerer access while the Wizard seed halves only the chosen damage type", () => {
    const protectionFromEnergyCases = [
      {
        sourceUnitId: authoredUnitId("class_cleric"),
        casterId: protectionFromEnergyClericId,
        build: levelFiveClericBuild({
          preparedSpells: [authoredUnitId(protectionFromEnergySpellId)],
        }),
      },
      {
        sourceUnitId: authoredUnitId("class_druid"),
        casterId: protectionFromEnergyDruidId,
        build: levelFiveDruidBuild({
          preparedSpells: [authoredUnitId(protectionFromEnergySpellId)],
        }),
        druidWildShapeKnownFormStatBlockIds:
          levelFiveDruidWildShapeKnownFormStatBlockIds,
      },
      {
        sourceUnitId: authoredUnitId("class_sorcerer"),
        casterId: protectionFromEnergySorcererId,
        build: levelFiveSorcererBuild({
          preparedSpells: [authoredUnitId(protectionFromEnergySpellId)],
        }),
      },
    ] as const satisfies ReadonlyArray<ProtectionFromEnergyClassAccessCase>;

    for (const protectionFromEnergyCase of protectionFromEnergyCases) {
      expectProtectionFromEnergyClassAccess(protectionFromEnergyCase);
    }

    const matching = protectionFromEnergyDamageScenario("fire");
    expect(matching.afterDamageHp).toBe(
      Hp(Number(matching.beforeDamageHp) - 4),
    );
    expect(matching.protectedTarget.activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "damageResistance",
          sourceProcedureRef: matching.sourceProcedureRef,
          sourceCombatantId: wizardId,
          damageType: "fire",
        }),
      ]),
    );

    const nonmatching = protectionFromEnergyDamageScenario("cold");
    expect(nonmatching.afterDamageHp).toBe(
      Hp(Number(nonmatching.beforeDamageHp) - 8),
    );
  });

  test("Sleet Storm projects Druid, Sorcerer, and Wizard access and applies caller-supplied Cylinder hazards", () => {
    const sleetStormCases: readonly SleetStormClassAccessCase[] = [
      {
        sourceUnitId: authoredUnitId("class_druid"),
        casterId: sleetStormDruidId,
        build: levelFiveDruidBuild({
          preparedSpells: [authoredUnitId(sleetStormSpellId)],
        }),
        druidWildShapeKnownFormStatBlockIds:
          levelFiveDruidWildShapeKnownFormStatBlockIds,
      },
      {
        sourceUnitId: authoredUnitId("class_sorcerer"),
        casterId: sleetStormSorcererId,
        build: levelFiveSorcererBuild({
          preparedSpells: [authoredUnitId(sleetStormSpellId)],
        }),
      },
      {
        sourceUnitId: authoredUnitId("class_wizard"),
        casterId: sleetStormWizardId,
        build: levelFiveWizardBuild({
          preparedSpells: [authoredUnitId(sleetStormSpellId)],
        }),
      },
    ];

    for (const sleetStormCase of sleetStormCases) {
      expectSleetStormClassAccess(sleetStormCase);

      const druidWildShapeKnownFormStatBlockIds =
        sleetStormCase.druidWildShapeKnownFormStatBlockIds;
      const session = battleSessionFromSheets({
        battleIdText: `battle:l5-tracer-sleet-storm-${sleetStormCase.sourceUnitId}`,
        characters: [
          characterSheet({
            characterIdText: `character:l5-tracer-sleet-storm-${sleetStormCase.sourceUnitId}`,
            build: sleetStormCase.build,
            combatantId: sleetStormCase.casterId,
            initiative: 20,
            ...(druidWildShapeKnownFormStatBlockIds === undefined
              ? {}
              : {
                  druidWildShapeKnownFormStatBlockIds:
                    druidWildShapeKnownFormStatBlockIds,
                }),
          }),
        ],
        monsters: [
          monsterBattleInput(
            sleetStormTargetId,
            10,
            srdStatBlock(authoredStatBlockId("stat_block_sphinx_of_wonder")),
          ),
        ],
      });
      const state = stateWithSleetStormTargetConcentration(session.state);
      const sessionWithTargetConcentration = battleRuntimeSessionForTest({
        ...session,
        state,
      });
      const act = spellSlotActForProcedure(
        sessionWithTargetConcentration,
        sleetStormSpellId,
        sleetStormCastLevel,
        "sleetStormAreaHazard",
      );
      const area = requireHoleFromList(act.initialHoles, "spellAreaChoice");

      expect({
        ...act.subject,
        invocation: battleActSpellPresentation(act)?.invocation,
      }).toMatchObject({
        tag: "actionSpell",
        actorId: sleetStormCase.casterId,
        invocation: {
          tag: "spellSlot",
          spellId: sleetStormSpellId,
          slotLevel: sleetStormCastLevel,
          procedure: "sleetStormAreaHazard",
        },
        mode: { tag: "cast" },
      });
      expect(area).toMatchObject({
        sourceProcedureRef: act.subject.procedureRef,
        area: {
          kind: "pointOriginCylinder",
          radiusFeet: movementFeet(20),
          heightFeet: movementFeet(40),
        },
      });
      expect(
        requireSpellProcedureExecution(
          state,
          sleetStormCase.casterId,
          act.subject.procedureRef,
        ),
      ).toMatchObject({
        procedure: "sleetStormAreaHazard",
        resource: { tag: "spellSlot", slotLevel: sleetStormCastLevel },
        ability: "dex",
        dc: { kind: "caster_spell_save_dc" },
        targeting: {
          kind: "pointOriginCylinder",
          radiusFeet: movementFeet(20),
          heightFeet: movementFeet(40),
        },
        rangeFeet: movementFeet(150),
      });

      const cast = requireResolved(
        resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [sleetStormAreaChoiceFill(area)],
        }),
      );
      const sleetStormProcedureRef = battleProcedureExecutionRefForHole(area);
      const caster = requireCharacterCombatant(
        cast.state,
        sleetStormCase.casterId,
      );

      expect(caster).toMatchObject({
        concentration: {
          sourceProcedureRef: sleetStormProcedureRef,
          effectKind: "spellEffect",
        },
        activeEffects: expect.arrayContaining([
          expect.objectContaining({
            kind: "sleetStormAreaHazard",
            sourceProcedureRef: sleetStormProcedureRef,
            sourceCombatantId: sleetStormCase.casterId,
            areaId: sleetStormAreaId,
            radiusFeet: movementFeet(20),
            heightFeet: movementFeet(40),
            save: { ability: "dex", dc: { kind: "caster_spell_save_dc" } },
          }),
        ]),
      });
      expect(caster.origin.spellcasting?.spellSlots).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            spellLevel: sleetStormCastLevel,
            expended: 1,
          }),
        ]),
      );

      const targetTurn = requireResolved(
        endTurn({ state: cast.state, actorId: sleetStormCase.casterId }),
      ).state;
      expect(battleObscurementZones(targetTurn)).toEqual([
        expect.objectContaining({
          kind: "spellObscurementZone",
          sourceProcedureRef: sleetStormProcedureRef,
          sourceCombatantId: sleetStormCase.casterId,
          obscurement: "heavilyObscured",
          area: {
            kind: "pointOriginCylinder",
            areaId: sleetStormAreaId,
            radiusFeet: movementFeet(20),
            heightFeet: movementFeet(40),
          },
        }),
      ]);

      const moveSubject = {
        tag: "runtimeCommand" as const,
        actorId: sleetStormTargetId,
        command: "move" as const,
      };
      const moveHole = requireHole(
        resolveBattleSubject({
          state: targetTurn,
          subject: moveSubject,
          fills: [],
        }),
        "movement",
      );
      const moved = requireResolved(
        resolveBattleSubject({
          state: targetTurn,
          subject: moveSubject,
          fills: [
            movementFill(moveHole, {
              movementCostFeet: 15,
              provokedOpportunityAttacks: [],
              areaDifficultTerrain: {
                kind: "areaDifficultTerrain",
                sources: [
                  {
                    kind: "sleetStormHazard",
                    sourceCombatantId: sleetStormCase.casterId,
                    sourceProcedureRef: sleetStormProcedureRef,
                    areaId: sleetStormAreaId,
                  },
                ],
                totalDistanceFeet: movementFeet(10),
                difficultTerrainDistanceFeet: movementFeet(5),
              },
            }),
          ],
        }),
      );

      expect(requireCombatant(moved.state, sleetStormTargetId)).toMatchObject({
        movementSpentFeet: movementFeet(15),
      });

      const entrySaveSubject = sleetStormAreaHazardSaveSubject();
      const entrySave = requireHole(
        resolveBattleSubject({
          state: moved.state,
          subject: entrySaveSubject,
          fills: [],
        }),
        "savingThrowOutcome",
      );

      expect(entrySave).toMatchObject({
        ability: "dex",
        dc: { kind: "caster_spell_save_dc" },
        sleetStormAreaHazard: {
          trigger: "entersArea",
          areaId: sleetStormAreaId,
          sourceCombatantId: sleetStormCase.casterId,
          sourceProcedureRef: sleetStormProcedureRef,
        },
      });

      const failedSave = requireResolved(
        resolveBattleSubject({
          state: moved.state,
          subject: entrySaveSubject,
          fills: [
            savingThrowOutcomeFill(entrySave, [
              { targetId: sleetStormTargetId, succeeded: false },
            ]),
          ],
        }),
      );
      const targetAfterSave = requireCombatant(
        failedSave.state,
        sleetStormTargetId,
      );

      expect(hasCondition(targetAfterSave.conditions, "prone")).toBe(true);
      expect(targetAfterSave.concentration).toBeNull();
      expect(
        targetAfterSave.activeEffects.some(
          (effect) =>
            "sourceProcedureRef" in effect &&
            effect.sourceProcedureRef ===
              syntheticSleetStormTargetConcentrationSpellId,
        ),
      ).toBe(false);

      const ended = breakBattleConcentration(
        failedSave.state,
        sleetStormCase.casterId,
      );
      expect(
        requireCombatant(ended, sleetStormCase.casterId).activeEffects.some(
          (effect) =>
            effect.kind === "sleetStormAreaHazard" &&
            effect.sourceProcedureRef === sleetStormProcedureRef,
        ),
      ).toBe(false);
      expect(battleObscurementZones(ended)).toEqual([]);
    }
  });

  test("Slow projects Bard, Sorcerer, and Wizard access and applies failed-save active penalties", () => {
    const slowCases = [
      {
        sourceUnitId: authoredUnitId("class_bard"),
        casterId: slowBardId,
        build: levelFiveBardBuild({
          preparedSpells: [authoredUnitId(slowSpellId)],
        }),
      },
      {
        sourceUnitId: authoredUnitId("class_sorcerer"),
        casterId: slowSorcererId,
        build: levelFiveSorcererBuild({
          preparedSpells: [authoredUnitId(slowSpellId)],
        }),
      },
      {
        sourceUnitId: authoredUnitId("class_wizard"),
        casterId: slowWizardId,
        build: levelFiveWizardBuild({
          preparedSpells: [authoredUnitId(slowSpellId)],
        }),
      },
    ] as const satisfies ReadonlyArray<SlowClassAccessCase>;

    for (const slowCase of slowCases) {
      expectSlowClassAccess(slowCase);

      const session = battleSessionFromSheets({
        battleIdText: `battle:l5-tracer-slow-${slowCase.sourceUnitId}`,
        characters: [
          characterSheet({
            characterIdText: `character:l5-tracer-slow-${slowCase.sourceUnitId}`,
            build: slowCase.build,
            combatantId: slowCase.casterId,
            initiative: 20,
          }),
        ],
        monsters: [
          monsterBattleInput(
            slowFailedSaveTargetId,
            10,
            srdStatBlock(authoredStatBlockId("stat_block_skeleton")),
          ),
          monsterBattleInput(
            slowSuccessfulSaveTargetId,
            9,
            srdStatBlock(authoredStatBlockId("stat_block_skeleton")),
          ),
        ],
      });
      const state = session.state;
      const beforeCast = snapshotBattle(state);
      const beforeFailedSaveTarget = requireSnapshotCombatant(
        beforeCast,
        slowFailedSaveTargetId,
      );
      const beforeSuccessfulSaveTarget = requireSnapshotCombatant(
        beforeCast,
        slowSuccessfulSaveTargetId,
      );
      const act = spellSlotActForProcedure(
        session,
        slowSpellId,
        slowCastLevel,
        "slowActivePenalties",
      );
      const savingThrow = requireHoleFromList(
        act.initialHoles,
        "savingThrowOutcome",
      );

      expect({
        ...act.subject,
        invocation: battleActSpellPresentation(act)?.invocation,
      }).toMatchObject({
        tag: "actionSpell",
        actorId: slowCase.casterId,
        invocation: {
          tag: "spellSlot",
          spellId: slowSpellId,
          slotLevel: slowCastLevel,
          procedure: "slowActivePenalties",
        },
        mode: { tag: "cast" },
      });
      expect(savingThrow).toMatchObject({
        sourceProcedureRef: act.subject.procedureRef,
        ability: "wis",
        dc: { kind: "caster_spell_save_dc" },
      });
      expect(
        requireSpellProcedureExecution(
          state,
          slowCase.casterId,
          act.subject.procedureRef,
        ),
      ).toMatchObject({
        procedure: "slowActivePenalties",
        resource: { tag: "spellSlot", slotLevel: slowCastLevel },
        targeting: {
          kind: "pointOriginCube",
          sideFeet: movementFeet(slowCubeSideFeet),
        },
        maxTargets: slowMaxTargets,
        rangeFeet: movementFeet(120),
        durationTicks: slowDurationTicks,
      });

      const resolved = requireResolved(
        resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [
            slowSavingThrowOutcomeFill({
              hole: savingThrow,
              casterId: slowCase.casterId,
              outcomes: [
                { targetId: slowFailedSaveTargetId, succeeded: false },
                { targetId: slowSuccessfulSaveTargetId, succeeded: true },
              ],
            }),
          ],
        }),
      );
      const caster = requireCharacterCombatant(
        resolved.state,
        slowCase.casterId,
      );
      const failedSaveTarget = requireCombatant(
        resolved.state,
        slowFailedSaveTargetId,
      );
      const successfulSaveTarget = requireCombatant(
        resolved.state,
        slowSuccessfulSaveTargetId,
      );
      const afterCast = snapshotBattle(resolved.state);
      const afterFailedSaveTarget = requireSnapshotCombatant(
        afterCast,
        slowFailedSaveTargetId,
      );
      const afterSuccessfulSaveTarget = requireSnapshotCombatant(
        afterCast,
        slowSuccessfulSaveTargetId,
      );

      expect(caster).toMatchObject({
        concentration: {
          sourceProcedureRef: act.subject.procedureRef,
          effectKind: "spellEffect",
        },
      });
      expect(caster.origin.spellcasting?.spellSlots).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            spellLevel: slowCastLevel,
            expended: 1,
          }),
        ]),
      );
      expect(failedSaveTarget.activeEffects).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: "slowActivePenalties",
            sourceProcedureRef: act.subject.procedureRef,
            sourceCombatantId: slowCase.casterId,
            save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
            expiresAt: {
              kind: "concentration",
              combatantId: slowCase.casterId,
              durationTicks: slowDurationTicks,
            },
          }),
        ]),
      );
      expect(
        successfulSaveTarget.activeEffects.some(
          (effect) =>
            effect.kind === "slowActivePenalties" &&
            effect.sourceProcedureRef === act.subject.procedureRef,
        ),
      ).toBe(false);
      expect(Number(afterFailedSaveTarget.movement.speedFeet)).toBe(
        Number(beforeFailedSaveTarget.movement.speedFeet) / 2,
      );
      expect(Number(afterFailedSaveTarget.armorClass)).toBe(
        Number(beforeFailedSaveTarget.armorClass) - 2,
      );
      expect(Number(afterSuccessfulSaveTarget.movement.speedFeet)).toBe(
        Number(beforeSuccessfulSaveTarget.movement.speedFeet),
      );
      expect(Number(afterSuccessfulSaveTarget.armorClass)).toBe(
        Number(beforeSuccessfulSaveTarget.armorClass),
      );

      const failedTargetTurn = requireResolved(
        endTurn({ state: resolved.state, actorId: slowCase.casterId }),
      ).state;
      expect(snapshotBattle(failedTargetTurn).currentActorId).toBe(
        slowFailedSaveTargetId,
      );
      expect(
        failedTargetTurn.currentTurnResources.actionOrBonusActionExclusion,
      ).toEqual({
        kind: "restricted",
        choice: "notChosen",
      });
    }
  });

  test("Counterspell projects Sorcerer, Warlock, and Wizard access and interrupts a spell-cast Reaction", () => {
    const counterspellCases = [
      {
        sourceUnitId: authoredUnitId("class_sorcerer"),
        reactorId: counterspellSorcererId,
        build: levelFiveSorcererBuild({
          preparedSpells: [authoredUnitId(counterspellSpellId)],
        }),
      },
      {
        sourceUnitId: authoredUnitId("class_warlock"),
        reactorId: counterspellWarlockId,
        build: levelFiveWarlockBuild({
          preparedSpells: [authoredUnitId(counterspellSpellId)],
        }),
      },
      {
        sourceUnitId: authoredUnitId("class_wizard"),
        reactorId: counterspellWizardId,
        build: levelFiveWizardBuild({
          preparedSpells: [authoredUnitId(counterspellSpellId)],
        }),
      },
    ] as const satisfies ReadonlyArray<CounterspellClassAccessCase>;

    for (const counterspellCase of counterspellCases) {
      expectCounterspellClassAccess(counterspellCase);

      const session = battleSessionFromSheets({
        battleIdText: `battle:l5-tracer-counterspell-${counterspellCase.sourceUnitId}`,
        characters: [
          characterSheet({
            characterIdText: `character:l5-tracer-counterspell-trigger-${counterspellCase.sourceUnitId}`,
            build: levelFiveWizardBuild({
              preparedSpells: [authoredUnitId(magicMissileSpellId)],
            }),
            combatantId: counterspellTriggeringWizardId,
            initiative: 20,
          }),
          characterSheet({
            characterIdText: `character:l5-tracer-counterspell-${counterspellCase.sourceUnitId}`,
            build: counterspellCase.build,
            combatantId: counterspellCase.reactorId,
            initiative: 15,
          }),
        ],
        monsters: [],
      });
      const awaitingCounterspell = startCounterspellableMagicMissile({
        session,
        casterId: counterspellTriggeringWizardId,
        targetId: counterspellCase.reactorId,
        reactorId: counterspellCase.reactorId,
      });
      const choice = requireCounterspellChoice(
        awaitingCounterspell,
        counterspellCase.reactorId,
      );
      const save = requireHoleFromList(
        choice.initialHoles,
        "savingThrowOutcome",
      );

      const resolved = requireResolved(
        resolveBattleInterrupt({
          state: awaitingCounterspell.state,
          fill: interruptDecisionFill(
            requireHoleFromList(
              awaitingCounterspell.holes,
              "interruptDecision",
            ),
            counterspellDecision(counterspellCase.reactorId, choice, [
              savingThrowOutcomeFill(save, [
                {
                  targetId: counterspellTriggeringWizardId,
                  succeeded: false,
                },
              ]),
            ]),
          ),
        }),
      );
      const reactor = requireCharacterCombatant(
        resolved.state,
        counterspellCase.reactorId,
      );
      const triggeringCaster = requireCharacterCombatant(
        resolved.state,
        counterspellTriggeringWizardId,
      );

      expect(resolved.snapshot.pendingInterrupt).toBeNull();
      expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);
      expect(reactor.reactionAvailable).toBe(false);
      expect(reactor.origin.spellcasting?.spellSlots).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            spellLevel: counterspellCastLevel,
            expended: 1,
          }),
        ]),
      );
      expect(triggeringCaster.origin.spellcasting?.spellSlots).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            spellLevel: magicMissileTriggerSlotLevel,
            expended: 0,
          }),
        ]),
      );
    }
  });

  test("Dispel Magic projects Bard, Cleric, Druid, Sorcerer, Warlock, and Wizard access and ends a tracked ongoing spell effect", () => {
    const dispelMagicCases: readonly DispelMagicClassAccessCase[] = [
      {
        sourceUnitId: authoredUnitId("class_bard"),
        casterId: dispelMagicBardId,
        build: levelFiveBardBuild({
          preparedSpells: [authoredUnitId(dispelMagicSpellId)],
        }),
      },
      {
        sourceUnitId: authoredUnitId("class_cleric"),
        casterId: dispelMagicClericId,
        build: levelFiveClericBuild({
          preparedSpells: [authoredUnitId(dispelMagicSpellId)],
        }),
      },
      {
        sourceUnitId: authoredUnitId("class_druid"),
        casterId: dispelMagicDruidId,
        build: levelFiveDruidBuild({
          preparedSpells: [authoredUnitId(dispelMagicSpellId)],
        }),
        druidWildShapeKnownFormStatBlockIds:
          levelFiveDruidWildShapeKnownFormStatBlockIds,
      },
      {
        sourceUnitId: authoredUnitId("class_sorcerer"),
        casterId: dispelMagicSorcererId,
        build: levelFiveSorcererBuild({
          preparedSpells: [authoredUnitId(dispelMagicSpellId)],
        }),
      },
      {
        sourceUnitId: authoredUnitId("class_warlock"),
        casterId: dispelMagicWarlockId,
        build: levelFiveWarlockBuild({
          preparedSpells: [authoredUnitId(dispelMagicSpellId)],
        }),
      },
      {
        sourceUnitId: authoredUnitId("class_wizard"),
        casterId: dispelMagicWizardId,
        build: levelFiveWizardBuild({
          preparedSpells: [authoredUnitId(dispelMagicSpellId)],
        }),
      },
    ];

    for (const dispelMagicCase of dispelMagicCases) {
      expectDispelMagicClassAccess(dispelMagicCase);

      const druidWildShapeKnownFormStatBlockIds =
        dispelMagicCase.druidWildShapeKnownFormStatBlockIds;
      const objectId = battleObjectId(
        `object:l5-tracer-dispel-${dispelMagicCase.sourceUnitId}`,
      );
      const session = battleSessionFromSheets({
        battleIdText: `battle:l5-tracer-dispel-${dispelMagicCase.sourceUnitId}`,
        characters: [
          characterSheet({
            characterIdText: `character:l5-tracer-dispel-${dispelMagicCase.sourceUnitId}`,
            build: dispelMagicCase.build,
            combatantId: dispelMagicCase.casterId,
            initiative: 20,
            ...(druidWildShapeKnownFormStatBlockIds === undefined
              ? {}
              : {
                  druidWildShapeKnownFormStatBlockIds:
                    druidWildShapeKnownFormStatBlockIds,
                }),
          }),
        ],
        monsters: [],
      });
      const state: BattleState = {
        ...session.state,
        lightEmitters: [
          trackedObjectSpellLightEmitter({
            objectId,
            sourceCombatantId: dispelMagicCase.casterId,
          }),
        ],
      };
      const sessionWithTrackedLightEmitter = battleRuntimeSessionForTest({
        ...session,
        state,
      });
      const act = spellSlotActForProcedure(
        sessionWithTrackedLightEmitter,
        dispelMagicSpellId,
        dispelMagicCastLevel,
        "ongoingSpellEnd",
      );
      const target = requireHoleFromList(
        act.initialHoles,
        "ongoingSpellTargetChoice",
      );

      expect(target).toMatchObject({
        requiresTableSpatialFact: true,
        choices: expect.arrayContaining([{ kind: "object", objectId }]),
      });

      const resolved = requireResolved(
        resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [
            ongoingSpellTargetFill({
              hole: target,
              casterId: dispelMagicCase.casterId,
              target: { kind: "object", objectId },
            }),
          ],
        }),
      );
      const caster = requireCharacterCombatant(
        resolved.state,
        dispelMagicCase.casterId,
      );

      expect(resolved.state.lightEmitters).toEqual([]);
      expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);
      expect(caster.origin.spellcasting?.spellSlots).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            spellLevel: dispelMagicCastLevel,
            expended: 1,
          }),
        ]),
      );
    }
  });

  test("Fireball projects Sorcerer and Wizard access and resolves point-origin Sphere Fire damage with unattended object ignition", () => {
    const fireballCases = [
      {
        sourceUnitId: authoredUnitId("class_sorcerer"),
        casterId: fireballSorcererId,
        build: levelFiveSorcererBuild({
          preparedSpells: [authoredUnitId(fireballSpellId)],
        }),
      },
      {
        sourceUnitId: authoredUnitId("class_wizard"),
        casterId: fireballWizardId,
        build: levelFiveWizardBuild({
          preparedSpells: [authoredUnitId(fireballSpellId)],
        }),
      },
    ] as const satisfies ReadonlyArray<FireballClassAccessCase>;

    for (const fireballCase of fireballCases) {
      expectFireballClassAccess(fireballCase);

      const session = battleSessionFromSheets({
        battleIdText: `battle:l5-tracer-fireball-${fireballCase.sourceUnitId}`,
        characters: [
          characterSheet({
            characterIdText: `character:l5-tracer-fireball-${fireballCase.sourceUnitId}`,
            build: fireballCase.build,
            combatantId: fireballCase.casterId,
            initiative: 20,
          }),
        ],
        monsters: [
          monsterBattleInput(
            fireballTargetId,
            10,
            srdStatBlock(authoredStatBlockId("stat_block_sphinx_of_wonder")),
          ),
        ],
      });
      const state = session.state;
      const act = spellSlotActForProcedure(
        session,
        fireballSpellId,
        fireballCastLevel,
        "saveGatedDamage",
      );
      const savingThrow = requireHoleFromList(
        act.initialHoles,
        "savingThrowOutcome",
      );

      expect({
        ...act.subject,
        invocation: battleActSpellPresentation(act)?.invocation,
      }).toMatchObject({
        tag: "actionSpell",
        actorId: fireballCase.casterId,
        invocation: {
          tag: "spellSlot",
          spellId: fireballSpellId,
          slotLevel: fireballCastLevel,
          procedure: "saveGatedDamage",
        },
        mode: { tag: "cast" },
      });
      expect(savingThrow).toMatchObject({
        sourceProcedureRef: act.subject.procedureRef,
        ability: "dex",
        dc: { kind: "caster_spell_save_dc" },
      });
      expect(
        requireSpellProcedureExecution(
          state,
          fireballCase.casterId,
          act.subject.procedureRef,
        ),
      ).toMatchObject({
        procedure: "saveGatedDamage",
        resource: { tag: "spellSlot", slotLevel: fireballCastLevel },
        ability: "dex",
        dc: { kind: "caster_spell_save_dc" },
        targeting: { kind: "pointOriginSphere", radiusFeet: 20 },
        damage: {
          expr: { dice: fireballDamageRollResults.length, dieSize: 6 },
          damageType: "fire",
        },
        successDamage: "half",
        rangeFeet: 150,
      });

      const saveFill = fireballSavingThrowOutcomeFill({
        casterId: fireballCase.casterId,
        hole: savingThrow,
        outcomes: [{ targetId: fireballTargetId, succeeded: false }],
        objectIgnitionFacts: [
          {
            objectId: fireballObjectId,
            disposition: { kind: "flammableUnattended" },
          },
        ],
      });
      const damageRoll = requireHole(
        resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [saveFill],
        }),
        "rolledDice",
      );
      const targetBeforeDamage = requireCombatant(state, fireballTargetId);
      const resolved = requireResolved(
        resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [
            saveFill,
            damageRollFillWithGroups(damageRoll, [fireballDamageRollResults]),
          ],
        }),
      );
      const caster = requireCharacterCombatant(
        resolved.state,
        fireballCase.casterId,
      );

      expect(
        Number(requireCombatant(resolved.state, fireballTargetId).hp),
      ).toBe(Number(targetBeforeDamage.hp) - fireballDamageTotal);
      expect(resolved.objectIgnitions).toEqual([
        {
          kind: "startsBurning",
          objectId: fireballObjectId,
          sourceCombatantId: fireballCase.casterId,
          sourceProcedureRef: act.subject.procedureRef,
        },
      ]);
      expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);
      expect(caster.origin.spellcasting?.spellSlots).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            spellLevel: fireballCastLevel,
            expended: 1,
          }),
        ]),
      );
    }
  });

  test("Fly projects Sorcerer, Warlock, and Wizard access and grants a fixed hovering Fly Speed", () => {
    const flyCases = [
      {
        sourceUnitId: authoredUnitId("class_sorcerer"),
        casterId: flySorcererId,
        build: levelFiveSorcererBuild({
          preparedSpells: [authoredUnitId(flySpellId)],
        }),
      },
      {
        sourceUnitId: authoredUnitId("class_warlock"),
        casterId: flyWarlockId,
        build: levelFiveWarlockBuild({
          preparedSpells: [authoredUnitId(flySpellId)],
        }),
      },
      {
        sourceUnitId: authoredUnitId("class_wizard"),
        casterId: flyWizardId,
        build: levelFiveWizardBuild({
          preparedSpells: [authoredUnitId(flySpellId)],
        }),
      },
    ] as const satisfies ReadonlyArray<FlyClassAccessCase>;

    for (const flyCase of flyCases) {
      expectFlyClassAccess(flyCase);

      const session = battleSessionFromSheets({
        battleIdText: `battle:l5-tracer-fly-${flyCase.sourceUnitId}`,
        characters: [
          characterSheet({
            characterIdText: `character:l5-tracer-fly-${flyCase.sourceUnitId}`,
            build: flyCase.build,
            combatantId: flyCase.casterId,
            initiative: 20,
          }),
        ],
        monsters: [],
      });
      const state = session.state;
      const act = spellSlotActForProcedure(
        session,
        flySpellId,
        flyCastLevel,
        "scalarBuff",
      );
      const target = requireHoleFromList(act.initialHoles, "targetChoice");

      expect(target.choices).toContain(flyCase.casterId);

      const resolved = requireResolved(
        resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [
            knownWillingSpellTargetFill(
              target,
              flySpellId,
              flyCase.casterId,
              flyCase.casterId,
            ),
          ],
        }),
      );
      const caster = requireCharacterCombatant(
        resolved.state,
        flyCase.casterId,
      );

      expect(resolved.snapshot.combatants).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            combatantId: flyCase.casterId,
            concentrating: true,
            movement: expect.objectContaining({
              speedKinds: expect.arrayContaining([
                expect.objectContaining({
                  kind: "fly",
                  speedFeet: flySpeedFeet,
                  remainingFeet: flySpeedFeet,
                }),
              ]),
            }),
          }),
        ]),
      );
      expect(caster.activeEffects).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: "specialSpeedGrant",
            sourceProcedureRef: act.subject.procedureRef,
            sourceCombatantId: flyCase.casterId,
            speedKind: "fly",
            speed: { kind: "fixed", speedFeet: movementFeet(flySpeedFeet) },
            hover: true,
          }),
        ]),
      );
      expect(caster.origin.spellcasting?.spellSlots).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            spellLevel: flyCastLevel,
            expended: 1,
          }),
        ]),
      );
    }
  });

  test("Glyph of Warding projects Bard, Cleric, and Wizard access while one-hour creation stays outside Magic Action discovery", () => {
    const glyphOfWardingCases = [
      {
        sourceUnitId: authoredUnitId("class_bard"),
        casterId: glyphOfWardingBardId,
        build: levelFiveBardBuild({
          preparedSpells: [authoredUnitId(glyphOfWardingSpellId)],
        }),
      },
      {
        sourceUnitId: authoredUnitId("class_cleric"),
        casterId: glyphOfWardingClericId,
        build: levelFiveClericBuild({
          preparedSpells: [authoredUnitId(glyphOfWardingSpellId)],
        }),
      },
      {
        sourceUnitId: authoredUnitId("class_wizard"),
        casterId: glyphOfWardingWizardId,
        build: levelFiveWizardBuild({
          preparedSpells: [authoredUnitId(glyphOfWardingSpellId)],
        }),
      },
    ] as const satisfies ReadonlyArray<GlyphOfWardingClassAccessCase>;

    for (const glyphOfWardingCase of glyphOfWardingCases) {
      expectGlyphOfWardingClassAccess(glyphOfWardingCase);

      const session = battleSessionFromSheets({
        battleIdText: `battle:l5-tracer-glyph-of-warding-${glyphOfWardingCase.sourceUnitId}`,
        characters: [
          characterSheet({
            characterIdText: `character:l5-tracer-glyph-of-warding-${glyphOfWardingCase.sourceUnitId}`,
            build: glyphOfWardingCase.build,
            combatantId: glyphOfWardingCase.casterId,
            initiative: 20,
          }),
        ],
        monsters: [],
      });
      const glyphCreationActs = discoverBattleActs(session).filter(
        (candidate) =>
          candidate.subject.tag === "actionSpell" &&
          candidate.subject.mode.tag === "cast" &&
          battleActSpellPresentation(candidate)?.invocation.tag ===
            "spellSlot" &&
          battleActSpellPresentation(candidate)?.invocation.spellId ===
            glyphOfWardingSpellId,
      );

      expect(glyphCreationActs).toEqual([]);
    }
  });

  test("Hypnotic Pattern projects Bard, Sorcerer, Warlock, and Wizard access and applies failed-save control", () => {
    const hypnoticPatternCases = [
      {
        sourceUnitId: authoredUnitId("class_bard"),
        casterId: hypnoticPatternBardId,
        build: levelFiveBardBuild({
          preparedSpells: [authoredUnitId(hypnoticPatternSpellId)],
        }),
      },
      {
        sourceUnitId: authoredUnitId("class_sorcerer"),
        casterId: hypnoticPatternSorcererId,
        build: levelFiveSorcererBuild({
          preparedSpells: [authoredUnitId(hypnoticPatternSpellId)],
        }),
      },
      {
        sourceUnitId: authoredUnitId("class_warlock"),
        casterId: hypnoticPatternWarlockId,
        build: levelFiveWarlockBuild({
          preparedSpells: [authoredUnitId(hypnoticPatternSpellId)],
        }),
      },
      {
        sourceUnitId: authoredUnitId("class_wizard"),
        casterId: hypnoticPatternWizardId,
        build: levelFiveWizardBuild({
          preparedSpells: [authoredUnitId(hypnoticPatternSpellId)],
        }),
      },
    ] as const satisfies ReadonlyArray<HypnoticPatternClassAccessCase>;

    for (const hypnoticPatternCase of hypnoticPatternCases) {
      expectHypnoticPatternClassAccess(hypnoticPatternCase);

      const session = battleSessionFromSheets({
        battleIdText: `battle:l5-tracer-hypnotic-pattern-${hypnoticPatternCase.sourceUnitId}`,
        characters: [
          characterSheet({
            characterIdText: `character:l5-tracer-hypnotic-pattern-${hypnoticPatternCase.sourceUnitId}`,
            build: hypnoticPatternCase.build,
            combatantId: hypnoticPatternCase.casterId,
            initiative: 20,
          }),
        ],
        monsters: [
          monsterBattleInput(
            monsterId,
            10,
            srdStatBlock(authoredStatBlockId("stat_block_goblin_warrior")),
          ),
        ],
      });
      const state = session.state;
      const act = spellSlotActForProcedure(
        session,
        hypnoticPatternSpellId,
        hypnoticPatternCastLevel,
        "hypnoticPattern",
      );
      const savingThrow = requireHoleFromList(
        act.initialHoles,
        "savingThrowOutcome",
      );

      expect({
        ...act.subject,
        invocation: battleActSpellPresentation(act)?.invocation,
      }).toMatchObject({
        tag: "actionSpell",
        actorId: hypnoticPatternCase.casterId,
        invocation: {
          tag: "spellSlot",
          spellId: hypnoticPatternSpellId,
          slotLevel: hypnoticPatternCastLevel,
          procedure: "hypnoticPattern",
        },
        mode: { tag: "cast" },
      });
      expect(savingThrow).toMatchObject({
        sourceProcedureRef: act.subject.procedureRef,
        ability: "wis",
        dc: { kind: "caster_spell_save_dc" },
      });
      expect(
        requireSpellProcedureExecution(
          state,
          hypnoticPatternCase.casterId,
          act.subject.procedureRef,
        ),
      ).toMatchObject({
        procedure: "hypnoticPattern",
        resource: { tag: "spellSlot", slotLevel: hypnoticPatternCastLevel },
        targeting: { kind: "pointOriginCube", sideFeet: 30 },
        rangeFeet: 120,
      });

      const resolved = requireResolved(
        resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [
            hypnoticPatternSavingThrowOutcomeFill({
              casterId: hypnoticPatternCase.casterId,
              hole: savingThrow,
              outcomes: [{ targetId: monsterId, succeeded: false }],
            }),
          ],
        }),
      );
      const caster = requireCharacterCombatant(
        resolved.state,
        hypnoticPatternCase.casterId,
      );
      const target = requireCombatant(resolved.state, monsterId);

      expect(snapshotBattle(resolved.state).combatants).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            combatantId: hypnoticPatternCase.casterId,
            concentrating: true,
          }),
          expect.objectContaining({
            combatantId: monsterId,
            conditions: expect.arrayContaining(["charmed", "incapacitated"]),
            movement: expect.objectContaining({ speedFeet: 0 }),
          }),
        ]),
      );
      expect(target.activeEffects).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: "hypnoticPatternControl",
            sourceProcedureRef: act.subject.procedureRef,
            sourceCombatantId: hypnoticPatternCase.casterId,
          }),
        ]),
      );
      expect(caster.origin.spellcasting?.spellSlots).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            spellLevel: hypnoticPatternCastLevel,
            expended: 1,
          }),
        ]),
      );
      expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);
    }
  });

  test("Lightning Bolt projects Sorcerer and Wizard access and resolves self-origin Line Lightning damage", () => {
    const lightningBoltCases = [
      {
        sourceUnitId: authoredUnitId("class_sorcerer"),
        casterId: lightningBoltSorcererId,
        build: levelFiveSorcererBuild({
          preparedSpells: [authoredUnitId(lightningBoltSpellId)],
        }),
      },
      {
        sourceUnitId: authoredUnitId("class_wizard"),
        casterId: lightningBoltWizardId,
        build: levelFiveWizardBuild({
          preparedSpells: [authoredUnitId(lightningBoltSpellId)],
        }),
      },
    ] as const satisfies ReadonlyArray<LightningBoltClassAccessCase>;

    for (const lightningBoltCase of lightningBoltCases) {
      expectLightningBoltClassAccess(lightningBoltCase);

      const session = battleSessionFromSheets({
        battleIdText: `battle:l5-tracer-lightning-bolt-${lightningBoltCase.sourceUnitId}`,
        characters: [
          characterSheet({
            characterIdText: `character:l5-tracer-lightning-bolt-${lightningBoltCase.sourceUnitId}`,
            build: lightningBoltCase.build,
            combatantId: lightningBoltCase.casterId,
            initiative: 20,
          }),
        ],
        monsters: [
          monsterBattleInput(
            lightningBoltFailedSaveTargetId,
            10,
            srdStatBlock(authoredStatBlockId("stat_block_sphinx_of_wonder")),
          ),
          monsterBattleInput(
            lightningBoltSuccessfulSaveTargetId,
            9,
            srdStatBlock(authoredStatBlockId("stat_block_sphinx_of_wonder")),
          ),
        ],
      });
      const state = session.state;
      const act = spellSlotActForProcedure(
        session,
        lightningBoltSpellId,
        lightningBoltCastLevel,
        "saveGatedDamage",
      );
      const savingThrow = requireHoleFromList(
        act.initialHoles,
        "savingThrowOutcome",
      );

      expect({
        ...act.subject,
        invocation: battleActSpellPresentation(act)?.invocation,
      }).toMatchObject({
        tag: "actionSpell",
        actorId: lightningBoltCase.casterId,
        invocation: {
          tag: "spellSlot",
          spellId: lightningBoltSpellId,
          slotLevel: lightningBoltCastLevel,
          procedure: "saveGatedDamage",
        },
        mode: { tag: "cast" },
      });
      expect(savingThrow).toMatchObject({
        sourceProcedureRef: act.subject.procedureRef,
        ability: "dex",
        dc: { kind: "caster_spell_save_dc" },
      });
      expect(
        requireSpellProcedureExecution(
          state,
          lightningBoltCase.casterId,
          act.subject.procedureRef,
        ),
      ).toMatchObject({
        procedure: "saveGatedDamage",
        resource: { tag: "spellSlot", slotLevel: lightningBoltCastLevel },
        targeting: { kind: "selfOriginLine", lengthFeet: 100, widthFeet: 5 },
        damage: {
          expr: { dice: lightningBoltDamageDiceCount, dieSize: 6 },
          damageType: "lightning",
        },
        successDamage: "half",
        rangeFeet: 0,
      });

      const saveFill = areaSavingThrowOutcomeFill(
        savingThrow,
        lightningBoltCase.casterId,
        [
          { targetId: lightningBoltFailedSaveTargetId, succeeded: false },
          { targetId: lightningBoltSuccessfulSaveTargetId, succeeded: true },
        ],
      );
      const damageRoll = requireHole(
        resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [saveFill],
        }),
        "rolledDice",
      );
      const failedSaveTargetBeforeDamage = requireCombatant(
        state,
        lightningBoltFailedSaveTargetId,
      );
      const successfulSaveTargetBeforeDamage = requireCombatant(
        state,
        lightningBoltSuccessfulSaveTargetId,
      );
      const resolved = requireResolved(
        resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [
            saveFill,
            damageRollFillWithGroups(damageRoll, [
              lightningBoltDamageRollResults,
            ]),
          ],
        }),
      );
      const caster = requireCharacterCombatant(
        resolved.state,
        lightningBoltCase.casterId,
      );

      expect(
        Number(
          requireCombatant(resolved.state, lightningBoltFailedSaveTargetId).hp,
        ),
      ).toBe(
        Number(failedSaveTargetBeforeDamage.hp) - lightningBoltDamageTotal,
      );
      expect(
        Number(
          requireCombatant(resolved.state, lightningBoltSuccessfulSaveTargetId)
            .hp,
        ),
      ).toBe(
        Number(successfulSaveTargetBeforeDamage.hp) -
          lightningBoltHalfDamageTotal,
      );
      expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);
      expect(caster.origin.spellcasting?.spellSlots).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            spellLevel: lightningBoltCastLevel,
            expended: 1,
          }),
        ]),
      );
    }
  });

  test("Mass Healing Word projects Bard and Cleric access and restores a visible target list as a Bonus Action", () => {
    const massHealingWordCases = [
      {
        sourceUnitId: authoredUnitId("class_bard"),
        casterId: massHealingWordBardId,
        build: levelFiveBardBuild({
          preparedSpells: [authoredUnitId(massHealingWordSpellId)],
        }),
      },
      {
        sourceUnitId: authoredUnitId("class_cleric"),
        casterId: massHealingWordClericId,
        build: levelFiveClericBuild({
          preparedSpells: [authoredUnitId(massHealingWordSpellId)],
        }),
      },
    ] as const satisfies ReadonlyArray<MassHealingWordClassAccessCase>;

    for (const massHealingWordCase of massHealingWordCases) {
      expectMassHealingWordClassAccess(massHealingWordCase);

      const session = battleSessionFromSheets({
        battleIdText: `battle:l5-tracer-mass-healing-word-${massHealingWordCase.sourceUnitId}`,
        characters: [
          characterSheet({
            characterIdText: `character:l5-tracer-mass-healing-word-${massHealingWordCase.sourceUnitId}`,
            build: massHealingWordCase.build,
            combatantId: massHealingWordCase.casterId,
            initiative: 20,
          }),
          characterSheet({
            characterIdText: `character:l5-tracer-mass-healing-word-target-a-${massHealingWordCase.sourceUnitId}`,
            build: levelFiveMartialBuild({
              classUnitId: authoredUnitId("class_fighter"),
              weaponUnitId: authoredUnitId("weapon_longsword"),
            }),
            combatantId: massHealingWordTargetAId,
            initiative: 15,
            currentHp: 3,
          }),
          characterSheet({
            characterIdText: `character:l5-tracer-mass-healing-word-target-b-${massHealingWordCase.sourceUnitId}`,
            build: levelFiveMartialBuild({
              classUnitId: authoredUnitId("class_fighter"),
              weaponUnitId: authoredUnitId("weapon_longsword"),
            }),
            combatantId: massHealingWordTargetBId,
            initiative: 10,
            currentHp: 5,
          }),
        ],
        monsters: [],
      });
      const state = session.state;
      const act = bonusActionSpellSlotActForProcedure(
        session,
        massHealingWordCase.casterId,
        massHealingWordSpellId,
        massHealingWordCastLevel,
        "directHitPointRestoration",
      );
      const targetList = requireHoleFromList(
        act.initialHoles,
        "spellTargetList",
      );

      expect({
        ...act.subject,
        invocation: battleActSpellPresentation(act)?.invocation,
      }).toMatchObject({
        tag: "bonusActionSpell",
        actorId: massHealingWordCase.casterId,
        invocation: {
          tag: "spellSlot",
          spellId: massHealingWordSpellId,
          slotLevel: massHealingWordCastLevel,
          procedure: "directHitPointRestoration",
        },
        mode: { tag: "cast" },
      });
      expect(targetList).toMatchObject({
        sourceProcedureRef: act.subject.procedureRef,
        minTargets: 1,
        maxTargets: 6,
        requiresTableSpatialFact: true,
        choices: expect.arrayContaining([
          massHealingWordCase.casterId,
          massHealingWordTargetAId,
          massHealingWordTargetBId,
        ]),
      });
      expect(
        requireSpellProcedureExecution(
          state,
          massHealingWordCase.casterId,
          act.subject.procedureRef,
        ),
      ).toMatchObject({
        procedure: "directHitPointRestoration",
        actionCost: "bonusAction",
        resource: { tag: "spellSlot", slotLevel: massHealingWordCastLevel },
        targeting: { kind: "targetList", minTargets: 1, maxTargets: 6 },
        healing: {
          expr: {
            dice: 2,
            dieSize: 4,
            flat: massHealingWordSpellcastingAbilityModifier,
          },
        },
        rangeFeet: 60,
      });

      const targetIds = [massHealingWordTargetAId, massHealingWordTargetBId];
      const targetFill = spellTargetListFill(
        targetList,
        massHealingWordCase.casterId,
        targetIds,
      );
      const healingRoll = requireHole(
        resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [targetFill],
        }),
        "rolledDice",
      );

      expect(healingRoll).toMatchObject({
        sourceProcedureRef: act.subject.procedureRef,
      });

      const firstTargetBeforeHealing = requireCombatant(
        state,
        massHealingWordTargetAId,
      );
      const secondTargetBeforeHealing = requireCombatant(
        state,
        massHealingWordTargetBId,
      );
      const resolved = requireResolved(
        resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [
            targetFill,
            damageRollFillWithGroups(healingRoll, [
              massHealingWordHealingRollResults,
            ]),
          ],
        }),
      );
      const caster = requireCharacterCombatant(
        resolved.state,
        massHealingWordCase.casterId,
      );

      expect(
        Number(requireCombatant(resolved.state, massHealingWordTargetAId).hp),
      ).toBe(Number(firstTargetBeforeHealing.hp) + massHealingWordHealingTotal);
      expect(
        Number(requireCombatant(resolved.state, massHealingWordTargetBId).hp),
      ).toBe(
        Number(secondTargetBeforeHealing.hp) + massHealingWordHealingTotal,
      );
      expect(snapshotBattle(resolved.state).turn.bonusActionAvailable).toBe(
        false,
      );
      expect(resolved.state.currentTurnResources.spellSlotUsesThisTurn).toEqual(
        [{ kind: "committed", combatantId: massHealingWordCase.casterId }],
      );
      expect(caster.concentration).toBeNull();
      expect(caster.origin.spellcasting?.spellSlots).toEqual([
        { spellLevel: 1, count: 4, expended: 0 },
        { spellLevel: 2, count: 3, expended: 0 },
        { spellLevel: massHealingWordCastLevel, count: 2, expended: 1 },
      ]);
    }
  });

  test("Sorcerous Restoration uses the sheet rest lifecycle to recover half level rounded down once per Long Rest", () => {
    const sheet = requireRight(
      rebuildCharacterSheet({
        characterId: characterSheetId(
          "character:l5-tracer-sorcerous-restoration",
        ),
        build: levelFiveSorcererBuild(),
        hitPointMaximumReduction: Hp(0),
        currentHp: Hp(32),
        tempHp: Hp(0),
        conditions: [],
        unitLibrary,
        resourceExpenditures: [
          {
            tag: "pointPoolResource",
            unitId: authoredUnitId(sorcererFontOfMagicUnitId),
            expended: resourceCount(4),
          },
        ],
      }),
    );

    expect(characterSheetResources(sheet, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "pointPoolResource",
          unitId: sorcererFontOfMagicUnitId,
          count: 5,
          expended: 4,
        }),
      ]),
    });

    const rest = requireRight(startShortRest({ sheet }));
    const completion = requireRight(
      finishShortRest({
        rest,
        restedTicks: CHARACTER_SHEET_SHORT_REST_TICKS,
      }),
    );
    const rested = requireRight(
      completeShortRest({
        completion,
        unitLibrary,
        sorcerousRestoration: {
          recoverSorceryPoints: resourceCount(2),
        },
      }),
    );

    expect(rested.resourceExpenditures).toEqual([
      {
        tag: "pointPoolResource",
        unitId: sorcererFontOfMagicUnitId,
        expended: resourceCount(2),
      },
    ]);
    expect(rested.restFeatureUses).toEqual([
      { tag: "sorcerousRestoration", usedSinceLongRest: true },
    ]);
    expect(characterSheetResources(rested, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "pointPoolResource",
          unitId: sorcererFontOfMagicUnitId,
          count: 5,
          expended: 2,
        }),
      ]),
    });
  });
});

function expectCounterspellClassAccess(input: {
  readonly sourceUnitId: UnitRecord["id"];
  readonly build: CharacterBuild;
}): void {
  expect(input.build.spellcasting?.sources).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        sourceUnitId: input.sourceUnitId,
        preparedSpells: expect.arrayContaining([counterspellSpellId]),
      }),
    ]),
  );
  if (input.sourceUnitId === "class_warlock") {
    expect(input.build.spellcasting?.slotPools).toMatchObject({
      pactMagic: {
        kind: "pactMagic",
        slotLevel: counterspellCastLevel,
        count: 2,
      },
    });
    return;
  }
  expect(input.build.spellcasting?.slotPools).toMatchObject({
    spellcasting: {
      kind: "spellcasting",
      slots: expect.arrayContaining([
        expect.objectContaining({
          spellLevel: counterspellCastLevel,
          count: 2,
        }),
      ]),
    },
  });
}

function expectDispelMagicClassAccess(input: {
  readonly sourceUnitId: UnitRecord["id"];
  readonly build: CharacterBuild;
}): void {
  expect(input.build.spellcasting?.sources).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        sourceUnitId: input.sourceUnitId,
        preparedSpells: expect.arrayContaining([dispelMagicSpellId]),
      }),
    ]),
  );
  if (input.sourceUnitId === "class_warlock") {
    expect(input.build.spellcasting?.slotPools).toMatchObject({
      pactMagic: {
        kind: "pactMagic",
        slotLevel: dispelMagicCastLevel,
        count: 2,
      },
    });
    return;
  }
  expect(input.build.spellcasting?.slotPools).toMatchObject({
    spellcasting: {
      kind: "spellcasting",
      slots: expect.arrayContaining([
        expect.objectContaining({
          spellLevel: dispelMagicCastLevel,
          count: 2,
        }),
      ]),
    },
  });
}

function expectFireballClassAccess(input: {
  readonly sourceUnitId: UnitRecord["id"];
  readonly build: CharacterBuild;
}): void {
  expect(input.build.spellcasting?.sources).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        sourceUnitId: input.sourceUnitId,
        preparedSpells: expect.arrayContaining([fireballSpellId]),
      }),
    ]),
  );
  expect(input.build.spellcasting?.slotPools).toMatchObject({
    spellcasting: {
      kind: "spellcasting",
      slots: expect.arrayContaining([
        expect.objectContaining({
          spellLevel: fireballCastLevel,
          count: 2,
        }),
      ]),
    },
  });
}

function expectHasteClassAccess(input: {
  readonly sourceUnitId: UnitRecord["id"];
  readonly build: CharacterBuild;
}): void {
  expect(input.build.spellcasting?.sources).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        sourceUnitId: input.sourceUnitId,
        preparedSpells: expect.arrayContaining([hasteSpellId]),
      }),
    ]),
  );
  expect(input.build.spellcasting?.slotPools).toMatchObject({
    spellcasting: {
      kind: "spellcasting",
      slots: expect.arrayContaining([
        expect.objectContaining({
          spellLevel: hasteCastLevel,
          count: 2,
        }),
      ]),
    },
  });
}

function expectFlyClassAccess(input: {
  readonly sourceUnitId: UnitRecord["id"];
  readonly build: CharacterBuild;
}): void {
  expect(input.build.spellcasting?.sources).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        sourceUnitId: input.sourceUnitId,
        preparedSpells: expect.arrayContaining([flySpellId]),
      }),
    ]),
  );
  if (input.sourceUnitId === "class_warlock") {
    expect(input.build.spellcasting?.slotPools).toMatchObject({
      pactMagic: {
        kind: "pactMagic",
        slotLevel: flyCastLevel,
        count: 2,
      },
    });
    return;
  }
  expect(input.build.spellcasting?.slotPools).toMatchObject({
    spellcasting: {
      kind: "spellcasting",
      slots: expect.arrayContaining([
        expect.objectContaining({
          spellLevel: flyCastLevel,
          count: 2,
        }),
      ]),
    },
  });
}

function expectGlyphOfWardingClassAccess(input: {
  readonly sourceUnitId: UnitRecord["id"];
  readonly build: CharacterBuild;
}): void {
  expect(input.build.spellcasting?.sources).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        sourceUnitId: input.sourceUnitId,
        preparedSpells: expect.arrayContaining([glyphOfWardingSpellId]),
      }),
    ]),
  );
  expect(input.build.spellcasting?.slotPools).toMatchObject({
    spellcasting: {
      kind: "spellcasting",
      slots: expect.arrayContaining([
        expect.objectContaining({
          spellLevel: glyphOfWardingCastLevel,
          count: 2,
        }),
      ]),
    },
  });
}

function expectHypnoticPatternClassAccess(input: {
  readonly sourceUnitId: UnitRecord["id"];
  readonly build: CharacterBuild;
}): void {
  expect(input.build.spellcasting?.sources).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        sourceUnitId: input.sourceUnitId,
        preparedSpells: expect.arrayContaining([hypnoticPatternSpellId]),
      }),
    ]),
  );
  if (input.sourceUnitId === "class_warlock") {
    expect(input.build.spellcasting?.slotPools).toMatchObject({
      pactMagic: {
        kind: "pactMagic",
        slotLevel: hypnoticPatternCastLevel,
        count: 2,
      },
    });
    return;
  }
  expect(input.build.spellcasting?.slotPools).toMatchObject({
    spellcasting: {
      kind: "spellcasting",
      slots: expect.arrayContaining([
        expect.objectContaining({
          spellLevel: hypnoticPatternCastLevel,
          count: 2,
        }),
      ]),
    },
  });
}

function expectLightningBoltClassAccess(input: {
  readonly sourceUnitId: UnitRecord["id"];
  readonly build: CharacterBuild;
}): void {
  expect(input.build.spellcasting?.sources).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        sourceUnitId: input.sourceUnitId,
        preparedSpells: expect.arrayContaining([lightningBoltSpellId]),
      }),
    ]),
  );
  expect(input.build.spellcasting?.slotPools).toMatchObject({
    spellcasting: {
      kind: "spellcasting",
      slots: expect.arrayContaining([
        expect.objectContaining({
          spellLevel: lightningBoltCastLevel,
          count: 2,
        }),
      ]),
    },
  });
}

function expectMassHealingWordClassAccess(input: {
  readonly sourceUnitId: UnitRecord["id"];
  readonly build: CharacterBuild;
}): void {
  expect(input.build.spellcasting?.sources).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        sourceUnitId: input.sourceUnitId,
        preparedSpells: expect.arrayContaining([massHealingWordSpellId]),
      }),
    ]),
  );
  expect(input.build.spellcasting?.slotPools).toMatchObject({
    spellcasting: {
      kind: "spellcasting",
      slots: expect.arrayContaining([
        expect.objectContaining({
          spellLevel: massHealingWordCastLevel,
          count: 2,
        }),
      ]),
    },
  });
}

function expectProtectionFromEnergyClassAccess(input: {
  readonly sourceUnitId: UnitRecord["id"];
  readonly casterId: CombatantId;
  readonly build: CharacterBuild;
  readonly druidWildShapeKnownFormStatBlockIds?: readonly StatBlockRecord["id"][];
}): void {
  expect(input.build.spellcasting?.sources).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        sourceUnitId: input.sourceUnitId,
        preparedSpells: expect.arrayContaining([protectionFromEnergySpellId]),
      }),
    ]),
  );
  expect(input.build.spellcasting?.slotPools).toMatchObject({
    spellcasting: {
      kind: "spellcasting",
      slots: expect.arrayContaining([
        expect.objectContaining({
          spellLevel: protectionFromEnergyCastLevel,
          count: 2,
        }),
      ]),
    },
  });

  const session = battleSessionFromSheets({
    battleIdText: `battle:l5-tracer-protection-from-energy-access-${input.sourceUnitId}`,
    characters: [
      characterSheet({
        characterIdText: `character:l5-tracer-protection-from-energy-access-${input.sourceUnitId}`,
        build: input.build,
        combatantId: input.casterId,
        initiative: 20,
        ...(input.druidWildShapeKnownFormStatBlockIds === undefined
          ? {}
          : {
              druidWildShapeKnownFormStatBlockIds:
                input.druidWildShapeKnownFormStatBlockIds,
            }),
      }),
    ],
    monsters: [],
  });
  const act = spellSlotActForProcedure(
    session,
    protectionFromEnergySpellId,
    protectionFromEnergyCastLevel,
    "chosenDamageResistance",
  );
  const target = requireHoleFromList(act.initialHoles, "targetChoice");
  const damageType = requireHoleFromList(act.initialHoles, "damageTypeChoice");

  expect({
    ...act.subject,
    invocation: battleActSpellPresentation(act)?.invocation,
  }).toMatchObject({
    tag: "actionSpell",
    actorId: input.casterId,
    invocation: {
      tag: "spellSlot",
      spellId: protectionFromEnergySpellId,
      slotLevel: protectionFromEnergyCastLevel,
      procedure: "chosenDamageResistance",
    },
    mode: { tag: "cast" },
  });
  expect(target.choices).toEqual(expect.arrayContaining([input.casterId]));
  expect(damageType.choices).toEqual([
    "acid",
    "cold",
    "fire",
    "lightning",
    "thunder",
  ]);
}

function expectSleetStormClassAccess(input: {
  readonly sourceUnitId: UnitRecord["id"];
  readonly casterId: CombatantId;
  readonly build: CharacterBuild;
  readonly druidWildShapeKnownFormStatBlockIds?: readonly StatBlockRecord["id"][];
}): void {
  expect(input.build.spellcasting?.sources).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        sourceUnitId: input.sourceUnitId,
        preparedSpells: expect.arrayContaining([sleetStormSpellId]),
      }),
    ]),
  );
  expect(input.build.spellcasting?.slotPools).toMatchObject({
    spellcasting: {
      kind: "spellcasting",
      slots: expect.arrayContaining([
        expect.objectContaining({
          spellLevel: sleetStormCastLevel,
          count: 2,
        }),
      ]),
    },
  });

  const session = battleSessionFromSheets({
    battleIdText: `battle:l5-tracer-sleet-storm-access-${input.sourceUnitId}`,
    characters: [
      characterSheet({
        characterIdText: `character:l5-tracer-sleet-storm-access-${input.sourceUnitId}`,
        build: input.build,
        combatantId: input.casterId,
        initiative: 20,
        ...(input.druidWildShapeKnownFormStatBlockIds === undefined
          ? {}
          : {
              druidWildShapeKnownFormStatBlockIds:
                input.druidWildShapeKnownFormStatBlockIds,
            }),
      }),
    ],
    monsters: [],
  });
  const state = session.state;
  const act = spellSlotActForProcedure(
    session,
    sleetStormSpellId,
    sleetStormCastLevel,
    "sleetStormAreaHazard",
  );
  const area = requireHoleFromList(act.initialHoles, "spellAreaChoice");

  expect({
    ...act.subject,
    invocation: battleActSpellPresentation(act)?.invocation,
  }).toMatchObject({
    tag: "actionSpell",
    actorId: input.casterId,
    invocation: {
      tag: "spellSlot",
      spellId: sleetStormSpellId,
      slotLevel: sleetStormCastLevel,
      procedure: "sleetStormAreaHazard",
    },
    mode: { tag: "cast" },
  });
  expect(area).toMatchObject({
    sourceProcedureRef: act.subject.procedureRef,
    area: {
      kind: "pointOriginCylinder",
      radiusFeet: movementFeet(20),
      heightFeet: movementFeet(40),
    },
  });
  expect(
    requireSpellProcedureExecution(
      state,
      input.casterId,
      act.subject.procedureRef,
    ),
  ).toMatchObject({
    procedure: "sleetStormAreaHazard",
    resource: { tag: "spellSlot", slotLevel: sleetStormCastLevel },
    targeting: {
      kind: "pointOriginCylinder",
      radiusFeet: movementFeet(20),
      heightFeet: movementFeet(40),
    },
    rangeFeet: movementFeet(150),
  });
}

function expectSlowClassAccess(input: {
  readonly sourceUnitId: UnitRecord["id"];
  readonly build: CharacterBuild;
}): void {
  expect(input.build.spellcasting?.sources).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        sourceUnitId: input.sourceUnitId,
        preparedSpells: expect.arrayContaining([slowSpellId]),
      }),
    ]),
  );
  expect(input.build.spellcasting?.slotPools).toMatchObject({
    spellcasting: {
      kind: "spellcasting",
      slots: expect.arrayContaining([
        expect.objectContaining({
          spellLevel: slowCastLevel,
          count: 2,
        }),
      ]),
    },
  });
}

function bonusActionSpellSlotActForProcedure(
  session: BattleRuntimeSession,
  casterId: CombatantId,
  spellId: string,
  slotLevel: number,
  procedure: SpellSlotProcedure,
): CastBonusActionSpellAct {
  const act = discoverBattleActs(session).find(
    (candidate): candidate is CastBonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.actorId === casterId &&
      candidate.subject.mode.tag === "cast" &&
      battleActSpellPresentation(candidate)?.invocation.tag === "spellSlot" &&
      battleActSpellPresentation(candidate)?.invocation.spellId === spellId &&
      battleActSpellSlotPresentation(candidate)?.invocation.slotLevel ===
        slotLevel &&
      battleActSpellPresentation(candidate)?.invocation.procedure === procedure,
  );
  if (act === undefined) {
    throw new Error(`Expected ${spellId} Bonus Action spell-slot act.`);
  }
  return act;
}

function spellTargetListFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetList" }>,
  casterId: CombatantId,
  targetIds: readonly CombatantId[],
): Extract<BattleFill, { readonly kind: "spellTargetList" }> {
  return {
    kind: "spellTargetList",
    holeId: hole.holeId,
    value: { targetIds },
    spatialFacts: targetIds.map((targetId) => ({
      kind: "spellTarget" as const,
      casterId,
      targetId,
      sourceProcedureRef: battleProcedureExecutionRefForHole(hole),
    })),
  };
}

function trackedObjectSpellLightEmitter(input: {
  readonly objectId: ReturnType<typeof battleObjectId>;
  readonly sourceCombatantId: CombatantId;
}): BattleTrackedOngoingSpellLightEmitter {
  return {
    kind: "spellLightEmitter",
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      "continual-flame-light-emitter",
    ),
    sourceCombatantId: input.sourceCombatantId,
    sourceEffectId: battleSpellEffectOccurrenceId(
      `${input.sourceCombatantId}:${continualFlameSpellId}:${input.objectId}:l5-tracer`,
    ),
    sourceSpellLevel: spellEffectLevel(2),
    attachment: { kind: "object", objectId: input.objectId },
    emission: {
      kind: "brightAndDim",
      brightRadiusFeet: movementFeet(20),
      dimAdditionalFeet: movementFeet(20),
    },
    opaqueCoverInteraction: { kind: "blocksEmission" },
    expiresAt: { kind: "untilDispelled" },
  };
}

function spellEffectLevel(
  value: number,
): BattleTrackedOngoingSpellLightEmitter["sourceSpellLevel"] {
  if (!Number.isInteger(value) || value < 0 || value > 9) {
    throw new Error(`Invalid spell effect level test fixture: ${value}.`);
  }
  // BattleSpellEffectLevel is a number brand erased at runtime; the guard above
  // enforces the same integer 0-9 range used by the battle-runtime parser.
  return value as BattleTrackedOngoingSpellLightEmitter["sourceSpellLevel"];
}

function ongoingSpellTargetFill(input: {
  readonly hole: Extract<
    BattleHole,
    { readonly kind: "ongoingSpellTargetChoice" }
  >;
  readonly casterId: CombatantId;
  readonly target: OngoingSpellTarget;
}): OngoingSpellTargetChoiceFill {
  return {
    kind: "ongoingSpellTargetChoice",
    holeId: input.hole.holeId,
    value: input.target,
    spatialFacts: [
      ongoingSpellTargetWithinRangeFact({
        casterId: input.casterId,
        target: input.target,
        sourceProcedureRef: battleProcedureExecutionRefForHole(input.hole),
      }),
    ],
  };
}

function fireballSavingThrowOutcomeFill(input: {
  readonly hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>;
  readonly casterId: CombatantId;
  readonly outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[];
  readonly objectIgnitionFacts: readonly {
    readonly objectId: ReturnType<typeof battleObjectId>;
    readonly disposition: BattleObjectIgnitionDisposition;
  }[];
}): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: input.hole.holeId,
    value: {
      area: {
        kind: "fireballArea",
        originAnchorId: input.casterId,
        affectedTargetIds: input.outcomes.map((outcome) => outcome.targetId),
        objectIgnitionFacts: input.objectIgnitionFacts,
      },
      outcomes: input.outcomes,
    },
  };
}

function hypnoticPatternSavingThrowOutcomeFill(input: {
  readonly hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>;
  readonly casterId: CombatantId;
  readonly outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[];
}): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: input.hole.holeId,
    value: {
      area: {
        kind: "hypnoticPatternArea",
        originAnchorId: input.casterId,
        affectedTargetIds: input.outcomes.map((outcome) => outcome.targetId),
        cubeSideFeet: 30,
        affectedCreatureWitnesses: input.outcomes.map((outcome) => ({
          targetId: outcome.targetId,
          inCube: true,
          canSeePattern: true,
        })),
      },
      outcomes: input.outcomes,
    },
  };
}

function slowSavingThrowOutcomeFill(input: {
  readonly hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>;
  readonly casterId: CombatantId;
  readonly outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[];
}): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: input.hole.holeId,
    value: {
      area: {
        kind: "slowArea",
        originAnchorId: input.casterId,
        affectedTargetIds: input.outcomes.map((outcome) => outcome.targetId),
        cubeSideFeet: slowCubeSideFeet,
        affectedCreatureWitnesses: input.outcomes.map((outcome) => ({
          targetId: outcome.targetId,
          inCube: true,
          chosenByCaster: true,
        })),
      },
      outcomes: input.outcomes,
    },
  };
}

function requireSnapshotCombatant(
  snapshot: ReturnType<typeof snapshotBattle>,
  combatantIdValue: CombatantId,
): ReturnType<typeof snapshotBattle>["combatants"][number] {
  const combatant = snapshot.combatants.find(
    (candidate) => candidate.combatantId === combatantIdValue,
  );
  if (combatant === undefined) {
    throw new Error(`Expected snapshot combatant ${combatantIdValue}.`);
  }
  return combatant;
}

function requireSpellProcedureExecution(
  state: BattleState,
  casterId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
) {
  const caster = requireCharacterCombatant(state, casterId);
  const binding = characterProcedureBinding(
    caster.origin.execution,
    procedureRef,
  );
  if (binding?.procedure.kind !== "spellInvocation") {
    throw new Error("Expected a bound mechanical spell procedure execution.");
  }
  return binding.procedure.execution;
}

function ongoingSpellTargetWithinRangeFact(input: {
  readonly casterId: CombatantId;
  readonly target: OngoingSpellTarget;
  readonly sourceProcedureRef: OngoingSpellTargetWithinRangeFact["sourceProcedureRef"];
}): OngoingSpellTargetWithinRangeFact {
  return {
    kind: "ongoingSpellTargetWithinRange",
    casterId: input.casterId,
    sourceProcedureRef: input.sourceProcedureRef,
    target: input.target,
    rangeFeet: movementFeet(120),
  };
}

function startCounterspellableMagicMissile(input: {
  readonly session: BattleRuntimeSession;
  readonly casterId: CombatantId;
  readonly targetId: CombatantId;
  readonly reactorId: CombatantId;
}): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  const state = input.session.state;
  const act = spellSlotActForProcedure(
    input.session,
    magicMissileSpellId,
    magicMissileTriggerSlotLevel,
    "repeatedDamageAllocation",
  );
  if (act.subject.actorId !== input.casterId) {
    throw new Error("Expected Magic Missile action from triggering caster.");
  }
  const allocation = requireHoleFromList(
    act.initialHoles,
    "spellTargetAllocation",
  );
  const allocationFill = magicMissileTargetAllocationFill({
    hole: allocation,
    casterId: input.casterId,
    targetId: input.targetId,
    dartCount: allocation.allocationCount,
  });
  const reactor = requireCharacterCombatant(state, input.reactorId);
  const counterspellProcedureRef =
    reactor.origin.execution.procedureBindings.flatMap((binding) => {
      return binding?.procedure.kind === "spellInvocation" &&
        binding.procedure.execution.procedure === "counterspell" &&
        binding.procedure.execution.resource.tag === "spellSlot" &&
        Number(binding.procedure.execution.resource.slotLevel) ===
          counterspellCastLevel
        ? [binding.procedureRef]
        : [];
    })[0];
  if (counterspellProcedureRef === undefined) {
    throw new Error("Expected admitted Counterspell execution binding.");
  }
  const result = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      allocationFill,
      spellCastReactionFactsFill([
        counterspellTriggerFact({
          reactorId: input.reactorId,
          casterId: input.casterId,
          sourceProcedureRef: counterspellProcedureRef,
        }),
      ]),
    ],
  });
  expect(result).toMatchObject({
    tag: "needsHoles",
    snapshot: { pendingInterrupt: { trigger: "spellCast" } },
  });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected Counterspell Reaction window.");
  }
  return result;
}

function magicMissileTargetAllocationFill(input: {
  readonly hole: Extract<
    BattleHole,
    { readonly kind: "spellTargetAllocation" }
  >;
  readonly casterId: CombatantId;
  readonly targetId: CombatantId;
  readonly dartCount: number;
}): Extract<BattleFill, { readonly kind: "spellTargetAllocation" }> {
  return {
    kind: "spellTargetAllocation",
    holeId: input.hole.holeId,
    value: {
      allocations: [{ targetId: input.targetId, count: input.dartCount }],
    },
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId: input.casterId,
        targetId: input.targetId,
        sourceProcedureRef: battleProcedureExecutionRefForHole(input.hole),
      },
    ],
  };
}

type CounterspellTriggerFact = Extract<
  Extract<
    BattleFill,
    { readonly kind: "targetSpatialFacts" }
  >["spatialFacts"][number],
  { readonly kind: "counterspellTriggerCasterVisibleWithinRange" }
>;

function counterspellTriggerFact(input: {
  readonly reactorId: CombatantId;
  readonly casterId: CombatantId;
  readonly sourceProcedureRef: CounterspellTriggerFact["sourceProcedureRef"];
}): CounterspellTriggerFact {
  return {
    kind: "counterspellTriggerCasterVisibleWithinRange",
    reactorId: input.reactorId,
    casterId: input.casterId,
    sourceProcedureRef: input.sourceProcedureRef,
    rangeFeet: movementFeet(60),
  };
}

function spellCastReactionFactsFill(
  facts: readonly CounterspellTriggerFact[],
): Extract<BattleFill, { readonly kind: "targetSpatialFacts" }> {
  return {
    kind: "targetSpatialFacts",
    holeId: SPELL_CAST_REACTION_FACTS_HOLE_ID,
    spatialFacts: facts,
  };
}

type CounterspellReactionChoice = Extract<
  BattleInterruptProcedureChoice,
  { readonly kind: "castTriggeredReactionSpell" }
>;

function requireCounterspellChoice(
  result: Extract<BattleResolutionResult, { readonly tag: "needsHoles" }>,
  reactorId: CombatantId,
): CounterspellReactionChoice {
  const reactor = result.state.combatants.get(reactorId);
  const choice = result.snapshot.pendingInterrupt?.choices.find(
    (candidate): candidate is CounterspellReactionChoice => {
      if (
        candidate.kind !== "castTriggeredReactionSpell" ||
        candidate.reactorId !== reactorId ||
        reactor?.origin.kind !== "character"
      ) {
        return false;
      }
      const binding = characterProcedureBinding(
        reactor.origin.execution,
        candidate.subject.procedureRef,
      );
      return (
        binding?.procedure.kind === "spellInvocation" &&
        binding.procedure.execution.procedure === "counterspell" &&
        binding.procedure.execution.resource.tag === "spellSlot" &&
        Number(binding.procedure.execution.resource.slotLevel) ===
          counterspellCastLevel
      );
    },
  );
  if (choice === undefined) {
    throw new Error("Expected Counterspell Reaction choice.");
  }
  return choice;
}

function requireUncannyDodgeAttackDamageChoice(
  result: Extract<BattleResolutionResult, { readonly tag: "needsHoles" }>,
  reactorId: CombatantId,
): ReactionRollOrDamageReductionChoice {
  const reactor = result.state.combatants.get(reactorId);
  const choice = result.snapshot.pendingInterrupt?.choices.find(
    (candidate): candidate is ReactionRollOrDamageReductionChoice => {
      if (
        candidate.kind !== "reactionRollOrDamageReduction" ||
        candidate.reactorId !== reactorId ||
        candidate.choice.kind !== "attackDamageReduction" ||
        reactor?.origin.kind !== "character"
      ) {
        return false;
      }
      const binding = characterProcedureBinding(
        reactor.origin.execution,
        candidate.choice.procedureRef,
      );
      return (
        binding?.procedure.kind === "unitFeature" &&
        binding.procedure.execution.kind ===
          REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE
      );
    },
  );
  if (choice === undefined) {
    throw new Error("Expected Uncanny Dodge attack-damage Reaction choice.");
  }
  return choice;
}

function counterspellDecision(
  reactorId: CombatantId,
  choice: CounterspellReactionChoice,
  fills: readonly BattleFill[],
): Extract<BattleFill, { readonly kind: "interruptDecision" }>["value"] {
  return {
    kind: "resolve",
    responderId: reactorId,
    choice: {
      kind: "castTriggeredReactionSpell",
      procedureRef: choice.subject.procedureRef,
      fills,
    },
  };
}

function interruptDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "interruptDecision" }>,
  value: Extract<BattleFill, { readonly kind: "interruptDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "interruptDecision" }> {
  return { kind: "interruptDecision", holeId: hole.holeId, value };
}

function elementalTouchStatBlock(damageType: "fire" | "cold"): StatBlockRecord {
  const base = srdStatBlock(authoredStatBlockId("stat_block_goblin_warrior"));
  const scimitar = base.statBlock.actions?.attacks?.find(
    (attack) => attack.name === "Scimitar",
  );
  if (scimitar === undefined) {
    throw new Error("Expected Goblin Warrior Scimitar fixture.");
  }
  const displayDamageType = damageType === "fire" ? "Fire" : "Cold";
  return {
    ...base,
    id: authoredStatBlockId(
      `stat_block_synthetic_l5_tracer_${damageType}_touch`,
    ),
    name: `Synthetic ${displayDamageType} Touch`,
    provenance: {
      kind: "xphb",
      section: "level5-sdk-tracer-bullets synthetic test fixture",
    },
    statBlock: {
      ...base.statBlock,
      displayName: `Synthetic ${displayDamageType} Touch`,
      actions: {
        attacks: [
          {
            ...scimitar,
            name: "Elemental Touch",
            onHit: [
              {
                kind: "damage",
                damageType,
                amount: {
                  kind: "fixed",
                  static: 8,
                  expr: { dice: 1, dieSize: 8 },
                },
              },
            ],
          },
        ],
      },
    },
  };
}

function protectionFromEnergyDamageScenario(damageType: "fire" | "cold"): {
  readonly protectedTarget: BattleCreatureState;
  readonly beforeDamageHp: Hp;
  readonly afterDamageHp: Hp;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
} {
  const session = battleSessionFromSheets({
    battleIdText: `battle:l5-tracer-protection-from-energy-${damageType}`,
    characters: [
      characterSheet({
        characterIdText: `character:l5-tracer-protection-from-energy-caster-${damageType}`,
        build: levelFiveWizardBuild({
          preparedSpells: [authoredUnitId(protectionFromEnergySpellId)],
        }),
        combatantId: wizardId,
        initiative: 20,
      }),
      characterSheet({
        characterIdText: `character:l5-tracer-protection-from-energy-warded-${damageType}`,
        build: levelFiveMartialBuild({
          classUnitId: authoredUnitId("class_fighter"),
          weaponUnitId: authoredUnitId("weapon_longsword"),
        }),
        combatantId: wardedId,
        initiative: 5,
      }),
    ],
    monsters: [
      monsterBattleInput(monsterId, 10, elementalTouchStatBlock(damageType)),
    ],
  });
  const state = session.state;
  const act = spellSlotActForProcedure(
    session,
    protectionFromEnergySpellId,
    protectionFromEnergyCastLevel,
    "chosenDamageResistance",
  );
  const target = requireHoleFromList(act.initialHoles, "targetChoice");
  const damageTypeHole = requireHoleFromList(
    act.initialHoles,
    "damageTypeChoice",
  );
  const cast = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          target,
          protectionFromEnergySpellId,
          wizardId,
          wardedId,
        ),
        protectionFromEnergyDamageTypeChoiceFill(damageTypeHole, "fire"),
      ],
    }),
  );
  const monsterTurn = requireResolved(
    endTurn({ state: cast.state, actorId: wizardId }),
  ).state;
  const subject = attackSubject(
    battleRuntimeSessionForTest({
      state: monsterTurn,
      context: session.context,
    }),
    monsterId,
    "Elemental Touch",
  );
  const targetHole = requireHole(
    resolveBattleSubject({ state: monsterTurn, subject, fills: [] }),
    "targetChoice",
  );
  const targetFill = attackTargetFill(targetHole, monsterId, wardedId, subject);
  const attackRoll = requireHole(
    resolveBattleSubject({
      state: monsterTurn,
      subject,
      fills: [targetFill],
    }),
    "attackRoll",
  );
  const attackFill = attackRollFill(attackRoll, {
    total: 20,
    naturalD20: 15,
  });
  const damage = requireHole(
    resolveBattleSubject({
      state: monsterTurn,
      subject,
      fills: [targetFill, attackFill],
    }),
    "rolledDice",
  );
  const beforeDamageHp = requireCombatant(monsterTurn, wardedId).hp;
  const resolved = requireResolved(
    resolveBattleSubject({
      state: monsterTurn,
      subject,
      fills: [targetFill, attackFill, damageRollFillWithGroups(damage, [[8]])],
    }),
  );
  return {
    protectedTarget: requireCombatant(cast.state, wardedId),
    beforeDamageHp,
    afterDamageHp: requireCombatant(resolved.state, wardedId).hp,
    sourceProcedureRef: act.subject.procedureRef,
  };
}

function assertLevelFiveFastMovementHandoff(): void {
  const fastMovementDeltaFeet = movementDeltaFeet(10);
  const expectedNotHeavyArmorSpeedFeet = movementFeet(40);
  const expectedPostDashRemainingFeet = movementFeet(
    expectedNotHeavyArmorSpeedFeet * 2,
  );

  const state = battleFromSheets({
    battleIdText: "battle:l5-tracer-fast-movement-barbarian",
    characters: [
      characterSheet({
        characterIdText: "character:l5-tracer-fast-movement-barbarian",
        build: levelFiveMartialBuild({
          classUnitId: authoredUnitId("class_barbarian"),
          weaponUnitId: authoredUnitId("weapon_longsword"),
          abilityScores: {
            str: 16,
            dex: 10,
            con: 14,
            int: 10,
            wis: 10,
            cha: 10,
          },
        }),
        combatantId: fastMovementBarbarianId,
        initiative: 20,
      }),
    ],
    monsters: [
      monsterBattleInput(
        monsterId,
        10,
        srdStatBlock(authoredStatBlockId("stat_block_skeleton")),
      ),
    ],
  });

  expect(
    requireCharacterCombatant(state, fastMovementBarbarianId).origin.execution
      .procedureBindings,
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        procedure: expect.objectContaining({
          kind: "unitFeature",
          execution: {
            kind: PASSIVE_SPEED_BONUS_SUPPORT_PROFILE,
            speed: {
              deltaFeet: fastMovementDeltaFeet,
              condition: {
                kind: "notWearingArmor",
                categories: ["heavy"],
              },
            },
          },
        }),
      }),
    ]),
  );

  expect(snapshotBattle(state).combatants).toContainEqual(
    expect.objectContaining({
      combatantId: fastMovementBarbarianId,
      movement: expect.objectContaining({
        speedFeet: expectedNotHeavyArmorSpeedFeet,
        remainingFeet: expectedNotHeavyArmorSpeedFeet,
      }),
    }),
  );

  const dashed = requireResolved(
    resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: fastMovementBarbarianId,
        action: "dash",
        speedKind: "walk",
      },
      fills: [],
    }),
  );

  expect(dashed.snapshot.turn.dashMovementBonusFeet).toBe(
    expectedNotHeavyArmorSpeedFeet,
  );
  expect(dashed.snapshot.combatants).toContainEqual(
    expect.objectContaining({
      combatantId: fastMovementBarbarianId,
      movement: expect.objectContaining({
        speedFeet: expectedNotHeavyArmorSpeedFeet,
        remainingFeet: expectedPostDashRemainingFeet,
      }),
    }),
  );
}

function assertLevelFiveExtraAttackHandoff(input: {
  readonly actorId: CombatantId;
  readonly battleIdText: string;
  readonly characterIdText: string;
  readonly classUnitId: UnitRecord["id"];
  readonly build?: CharacterBuild;
  readonly sourceUnitId: UnitRecord["id"];
  readonly weaponUnitId: UnitRecord["id"];
  readonly attackName: string;
  readonly abilityScores?: Parameters<
    typeof levelFiveMartialBuild
  >[0]["abilityScores"];
}): void {
  const session = battleSessionFromSheets({
    battleIdText: input.battleIdText,
    characters: [
      characterSheet({
        characterIdText: input.characterIdText,
        build:
          input.build ??
          levelFiveMartialBuild({
            classUnitId: input.classUnitId,
            weaponUnitId: input.weaponUnitId,
            ...(input.abilityScores === undefined
              ? {}
              : { abilityScores: input.abilityScores }),
          }),
        combatantId: input.actorId,
        initiative: 20,
      }),
    ],
    monsters: [
      monsterBattleInput(
        monsterId,
        10,
        srdStatBlock(authoredStatBlockId("stat_block_skeleton")),
      ),
    ],
  });
  expect(
    session.context.characters.get(input.actorId)?.unitPresentationSources,
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        unit: expect.objectContaining({ id: input.sourceUnitId }),
        supportProfiles: expect.arrayContaining([
          expect.objectContaining({
            kind: ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE,
            additionalAttacks: 1,
          }),
        ]),
      }),
    ]),
  );

  const first = resolveWeaponAttackMiss({
    session,
    actorId: input.actorId,
    targetId: monsterId,
    attackName: input.attackName,
  });

  expect(snapshotBattle(first.state).turn.actionResources).toEqual([
    expect.objectContaining({
      source: "classFeatureExtraAttack",
      sourceOwnerId: input.actorId,
    }),
  ]);

  const second = resolveWeaponAttackMiss({
    session: battleRuntimeSessionForTest({
      state: first.state,
      context: session.context,
    }),
    actorId: input.actorId,
    targetId: monsterId,
    attackName: input.attackName,
  });

  expect(snapshotBattle(second.state).turn.actionResources).toEqual([]);
}

function resolveWeaponAttackMiss(input: {
  readonly session: BattleRuntimeSession;
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly attackName: string;
}): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  const subject = attackSubject(input.session, input.actorId, input.attackName);
  const state = input.session.state;
  const target = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const roll = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        attackTargetFill(
          target,
          input.actorId,
          input.targetId,
          input.attackName,
        ),
      ],
    }),
    "attackRoll",
  );
  return requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        attackTargetFill(
          target,
          input.actorId,
          input.targetId,
          input.attackName,
        ),
        attackRollFill(roll, { total: 1, naturalD20: 1 }),
      ],
    }),
  );
}

function protectionFromEnergyDamageTypeChoiceFill(
  hole: Extract<BattleHole, { readonly kind: "damageTypeChoice" }>,
  value: Extract<
    DamageType,
    "acid" | "cold" | "fire" | "lightning" | "thunder"
  >,
): Extract<BattleFill, { readonly kind: "damageTypeChoice" }> {
  return { kind: "damageTypeChoice", holeId: hole.holeId, value };
}

function stateWithSleetStormTargetConcentration(
  state: BattleState,
): BattleState {
  const target = requireCombatant(state, sleetStormTargetId);
  const concentrationProcedureRef = battleProcedureExecutionRefForTest(
    "sleet-storm-target-concentration",
  );
  const concentrationEffect = {
    kind: "spellArmorClassBonus",
    sourceProcedureRef: concentrationProcedureRef,
    sourceCombatantId: sleetStormTargetId,
    bonus: 1,
    negatesRepeatedDamageAllocation: false,
    expiresAt: {
      kind: "concentration",
      combatantId: sleetStormTargetId,
    },
  } satisfies BattleActiveEffect;
  return {
    ...state,
    combatants: new Map(state.combatants).set(sleetStormTargetId, {
      ...target,
      concentration: {
        sourceProcedureRef: concentrationProcedureRef,
        effectKind: "spellEffect",
      },
      activeEffects: [...target.activeEffects, concentrationEffect],
    }),
  };
}

function sleetStormAreaChoiceFill(
  hole: Extract<BattleHole, { readonly kind: "spellAreaChoice" }>,
): Extract<BattleFill, { readonly kind: "spellAreaChoice" }> {
  return {
    kind: "spellAreaChoice",
    holeId: hole.holeId,
    value: { kind: "sleetStormCylinderArea", areaId: sleetStormAreaId },
  };
}

function movementFill(
  hole: Extract<BattleHole, { readonly kind: "movement" }>,
  value: {
    readonly movementCostFeet: number;
    readonly provokedOpportunityAttacks: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["provokedOpportunityAttacks"];
    readonly areaDifficultTerrain?: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["areaDifficultTerrain"];
  },
): Extract<BattleFill, { readonly kind: "movement" }> {
  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      speedKind: "walk",
      movementCostFeet: movementFeet(value.movementCostFeet),
      provokedOpportunityAttacks: value.provokedOpportunityAttacks,
      ...(value.areaDifficultTerrain === undefined
        ? {}
        : { areaDifficultTerrain: value.areaDifficultTerrain }),
    },
  };
}

function sleetStormAreaHazardSaveSubject(): Extract<
  AvailableBattleAct["subject"],
  {
    readonly tag: "runtimeCommand";
    readonly command: "sleetStormAreaHazardSave";
  }
> {
  return {
    tag: "runtimeCommand",
    actorId: sleetStormTargetId,
    command: "sleetStormAreaHazardSave",
    areaMembershipTrigger: {
      kind: "firstEntryOnTurn",
      areaId: sleetStormAreaId,
    },
  };
}
