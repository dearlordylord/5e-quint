import {
  battleObjectId,
  battleTablePositionId,
  breakBattleConcentration,
  cantripSpellInvocationRef,
  combatantId,
  discoverBattleActs,
  endTurn,
  resolveBattleSubject,
  snapshotBattle,
  spellSaveDcForCaster,
  thaumaturgyBoomingVoiceInfluenceAbilityCheckHole,
  type AvailableBattleAct,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSpellAreaChoice,
  type BattleSpellSavingThrowOutcomeHole,
  type BattleSubject,
  type CantripSpellProcedure,
  type CombatantId,
} from "@dnd/battle-runtime";
import {
  abilityScoreAssignment,
  characterEquipmentItemId,
  characterEquipmentItemUnitId,
  characterDraftId,
  classUnitId,
  createCharacterDraft,
  creationChoiceOptionId,
  creationHoleId,
  fillCreationHoles,
  finalizeCharacterDraft,
  loadoutEquipmentUnitId,
  loadoutSourceHoleIdText,
  unitChoiceKey,
  unitChoiceSourceHoleIdText,
  unitChoiceSourceUnitId,
  type CharacterBuild,
  type CharacterDraft,
  type CreationBatchFillResult,
  type CreationFill,
  type CreationHoleIdText,
  type LoadoutSlot,
  type UnitChoiceKey,
} from "@dnd/character-creation-runtime";
import {
  characterSheetPactSlots,
  characterSheetSpellSlots,
} from "@dnd/character-sheet-runtime";
import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import {
  elapsedTimeTicksFromHours,
  elapsedTimeTicksFromMinutes,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  abilityModifier,
  attackBonus,
  difficultyClass,
  Hp,
  movementDeltaFeet,
  movementFeet,
} from "@dnd/shared/types";
import type { UnitRecord } from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";

import { settleCharacterSheetFromBattle } from "./index.ts";

import {
  attackRollFill,
  attackSubject,
  attackTargetFill,
  areaSavingThrowOutcomeFill,
  battleFromSheets,
  characterResources,
  characterSheet,
  damageRollFillWithGroups,
  monsterBattleInput,
  ordinaryAttackDamageFills,
  requireCharacterCombatant,
  requireCombatant,
  requireHole,
  requireHoleFromList,
  requireResolved,
  requireRight,
  savingThrowOutcomeFill,
  srdStatBlock,
  spellSlotActForProcedure,
  unitLibrary,
} from "./sdk-integration-test-support.ts";

type SavingThrowOutcomeHole = Extract<
  BattleHole,
  { readonly kind: "savingThrowOutcome" }
>;
type ThunderwaveSavingThrowOutcomeHole = BattleSpellSavingThrowOutcomeHole & {
  readonly spell: Extract<
    BattleSpellSavingThrowOutcomeHole["spell"],
    { readonly procedure: "saveGatedDamage" }
  > & {
    readonly spell: { readonly id: typeof thunderwaveSpellId };
    readonly targeting: {
      readonly kind: "selfOriginCube";
      readonly sideFeet: 15;
    };
    readonly postSaveAreaEffect: { readonly kind: "thunderwave" };
  };
};

const fighterId = combatantId("combatant:l1-sdk-fighter");
const barbarianId = combatantId("combatant:l1-sdk-barbarian");
const bardId = combatantId("combatant:l1-sdk-bard");
const dissonantWhispersBardId = combatantId(
  "combatant:l1-sdk-dissonant-whispers-bard",
);
const viciousMockeryBardId = combatantId(
  "combatant:l1-sdk-vicious-mockery-bard",
);
const healingWordBardId = combatantId("combatant:l1-sdk-healing-word-bard");
const inspiredAllyId = combatantId("combatant:l1-sdk-inspired-ally");
const rogueId = combatantId("combatant:l1-sdk-rogue");
const rogueAllyId = combatantId("combatant:l1-sdk-rogue-ally");
const sorcererId = combatantId("combatant:l1-sdk-sorcerer");
const sorcerousBurstSorcererId = combatantId(
  "combatant:l1-sdk-sorcerous-burst-sorcerer",
);
const burningHandsCasterId = combatantId("combatant:l1-sdk-burning-hands");
const acidSplashSorcererId = combatantId(
  "combatant:l1-sdk-acid-splash-sorcerer",
);
const acidSplashWizardId = combatantId("combatant:l1-sdk-acid-splash-wizard");
const poisonSprayDruidId = combatantId("combatant:l1-sdk-poison-spray-druid");
const produceFlameDruidId = combatantId("combatant:l1-sdk-produce-flame-druid");
const shillelaghDruidId = combatantId("combatant:l1-sdk-shillelagh-druid");
const sacredFlameClericId = combatantId("combatant:l1-sdk-sacred-flame-cleric");
const thaumaturgyClericId = combatantId("combatant:l1-sdk-thaumaturgy-cleric");
const sanctuaryClericId = combatantId("combatant:l1-sdk-sanctuary-cleric");
const healingWordClericId = combatantId(
  "combatant:l1-sdk-healing-word-cleric",
);
const healingWordDruidId = combatantId("combatant:l1-sdk-healing-word-druid");
const healingWordTargetId = combatantId("combatant:l1-sdk-healing-word-target");
const sanctuaryWardedAllyId = combatantId(
  "combatant:l1-sdk-sanctuary-warded-ally",
);
const guidingBoltClericId = combatantId("combatant:l1-sdk-guiding-bolt-cleric");
const guidingBoltAllyId = combatantId("combatant:l1-sdk-guiding-bolt-ally");
const inflictWoundsClericId = combatantId(
  "combatant:l1-sdk-inflict-wounds-cleric",
);
const poisonSpraySorcererId = combatantId(
  "combatant:l1-sdk-poison-spray-sorcerer",
);
const poisonSprayWarlockId = combatantId(
  "combatant:l1-sdk-poison-spray-warlock",
);
const poisonSprayWizardId = combatantId("combatant:l1-sdk-poison-spray-wizard");
const chillTouchSorcererId = combatantId(
  "combatant:l1-sdk-chill-touch-sorcerer",
);
const chillTouchWarlockId = combatantId("combatant:l1-sdk-chill-touch-warlock");
const chillTouchWizardId = combatantId("combatant:l1-sdk-chill-touch-wizard");
const eldritchBlastWarlockId = combatantId(
  "combatant:l1-sdk-eldritch-blast-warlock",
);
const hexWarlockId = combatantId("combatant:l1-sdk-hex-warlock");
const fireBoltSorcererId = combatantId("combatant:l1-sdk-fire-bolt-sorcerer");
const fireBoltWizardId = combatantId("combatant:l1-sdk-fire-bolt-wizard");
const rayOfFrostSorcererId = combatantId(
  "combatant:l1-sdk-ray-of-frost-sorcerer",
);
const rayOfFrostWizardId = combatantId("combatant:l1-sdk-ray-of-frost-wizard");
const shockingGraspSorcererId = combatantId(
  "combatant:l1-sdk-shocking-grasp-sorcerer",
);
const shockingGraspWizardId = combatantId(
  "combatant:l1-sdk-shocking-grasp-wizard",
);
const chromaticOrbSorcererId = combatantId(
  "combatant:l1-sdk-chromatic-orb-sorcerer",
);
const chromaticOrbWizardId = combatantId(
  "combatant:l1-sdk-chromatic-orb-wizard",
);
const falseLifeSorcererId = combatantId("combatant:l1-sdk-false-life-sorcerer");
const falseLifeWizardId = combatantId("combatant:l1-sdk-false-life-wizard");
const rayOfSicknessSorcererId = combatantId(
  "combatant:l1-sdk-ray-of-sickness-sorcerer",
);
const rayOfSicknessWizardId = combatantId(
  "combatant:l1-sdk-ray-of-sickness-wizard",
);
const mageArmorSorcererId = combatantId("combatant:l1-sdk-mage-armor-sorcerer");
const mageArmorWizardId = combatantId("combatant:l1-sdk-mage-armor-wizard");
const magicMissileSorcererId = combatantId(
  "combatant:l1-sdk-magic-missile-sorcerer",
);
const magicMissileWizardId = combatantId(
  "combatant:l1-sdk-magic-missile-wizard",
);
const thunderwaveSorcererId = combatantId(
  "combatant:l1-sdk-thunderwave-sorcerer",
);
const thunderwaveWizardId = combatantId("combatant:l1-sdk-thunderwave-wizard");
const wizardBurningHandsCasterId = combatantId(
  "combatant:l1-sdk-wizard-burning-hands",
);
const monkId = combatantId("combatant:l1-sdk-monk");
const monsterId = combatantId("combatant:l1-sdk-monster");
const secondMonsterId = combatantId("combatant:l1-sdk-second-monster");
const thunderwaveUnsecuredObjectId = battleObjectId(
  "object:l1-sdk-thunderwave-unsecured",
);

const fighterSecondWindUnitId = "fighter_second_wind";
const barbarianRageUnitId = "barbarian_rage";
const bardBardicInspirationUnitId = "bard_bardic_inspiration";
const monkMartialArtsUnitId = "monk_martial_arts";
const rogueSneakAttackUnitId = "rogue_sneak_attack";
const rogueSneakAttackName = "Dagger";
const sorcererInnateSorceryUnitId = "sorcerer_innate_sorcery";
const dissonantWhispersSpellId = "dissonant_whispers";
const viciousMockerySpellId = "vicious_mockery";
const healingWordSpellId = "healing_word";
const sorcerousBurstSpellId = "sorcerous_burst";
const acidSplashSpellId = "acid_splash";
const poisonSpraySpellId = "poison_spray";
const produceFlameSpellId = "produce_flame";
const shillelaghSpellId = "shillelagh";
const sacredFlameSpellId = "sacred_flame";
const thaumaturgySpellId = "thaumaturgy";
const sanctuarySpellId = "sanctuary";
const guidingBoltSpellId = "guiding_bolt";
const inflictWoundsSpellId = "inflict_wounds";
const chillTouchSpellId = "chill_touch";
const eldritchBlastSpellId = "eldritch_blast";
const hexSpellId = "hex";
const burningHandsSpellId = "burning_hands";
const fireBoltSpellId = "fire_bolt";
const rayOfFrostSpellId = "ray_of_frost";
const shockingGraspSpellId = "shocking_grasp";
const chromaticOrbSpellId = "chromatic_orb";
const falseLifeSpellId = "false_life";
const rayOfSicknessSpellId = "ray_of_sickness";
const mageArmorSpellId = "mage_armor";
const magicMissileSpellId = "magic_missile";
const thunderwaveSpellId = "thunderwave";
const shillelaghQuarterstaffItemId = characterEquipmentItemId({
  slot: "main",
  unitId: requireRight(characterEquipmentItemUnitId("weapon_quarterstaff")),
});
const mageArmorDurationTicks = requireRight(elapsedTimeTicksFromHours(8));
const shillelaghDurationTicks = requireRight(elapsedTimeTicksFromMinutes(1));
const thaumaturgyDurationTicks = requireRight(elapsedTimeTicksFromMinutes(1));
const sanctuaryDurationTicks = requireRight(elapsedTimeTicksFromMinutes(1));

describe("level 1 SDK RAW integration", () => {
  test("Fighter Second Wind heals through sheet projection and spends one Bonus Action use", () => {
    const state = battleFromSheets({
      battleIdText: "battle:l1-sdk-second-wind",
      characters: [
        characterSheet({
          characterIdText: "character:l1-sdk-second-wind",
          build: levelOneSingleClassBuild({
            classUnitId: "class_fighter",
            weaponUnitId: "weapon_longsword",
          }),
          combatantId: fighterId,
          initiative: 20,
          maximumHp: 12,
          currentHp: 4,
        }),
      ],
      monsters: [
        monsterBattleInput(monsterId, 10, srdStatBlock("stat_block_skeleton")),
      ],
    });
    const act = unitFeatureActForUnitId(
      state,
      fighterId,
      fighterSecondWindUnitId,
    );
    const healingRoll = requireHoleFromList(act.initialHoles, "rolledDice");

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [damageRollFillWithGroups(healingRoll, [[3]])],
      }),
    );
    const fighter = requireCharacterCombatant(resolved.state, fighterId);

    expect(requireCombatant(resolved.state, fighterId).hp).toBe(Hp(8));
    expect(snapshotBattle(resolved.state).turn.bonusActionAvailable).toBe(
      false,
    );
    expect(characterResources(fighter)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          unit: expect.objectContaining({ id: fighterSecondWindUnitId }),
          usesRemaining: 1,
        }),
      ]),
    );
    expect(
      discoverBattleActs(resolved.state).some(
        (candidate) =>
          candidate.subject.tag === "unitFeature" &&
          candidate.subject.actorId === fighterId &&
          candidate.subject.unitId === fighterSecondWindUnitId,
      ),
    ).toBe(false);
  });

  test("Barbarian Rage projects from a level-1 sheet, spends a use, and applies damage and Resistance riders", () => {
    const state = battleFromSheets({
      battleIdText: "battle:l1-sdk-rage",
      characters: [
        characterSheet({
          characterIdText: "character:l1-sdk-rage",
          build: levelOneSingleClassBuild({
            classUnitId: "class_barbarian",
            weaponUnitId: "weapon_longsword",
            abilityScores: {
              str: 16,
              dex: 14,
              con: 14,
              int: 10,
              wis: 10,
              cha: 10,
            },
          }),
          combatantId: barbarianId,
          initiative: 20,
          maximumHp: 14,
        }),
      ],
      monsters: [
        monsterBattleInput(monsterId, 10, srdStatBlock("stat_block_skeleton")),
      ],
    });
    const act = unitFeatureActForUnitId(
      state,
      barbarianId,
      barbarianRageUnitId,
    );
    const raging = requireResolved(
      resolveBattleSubject({ state, subject: act.subject, fills: [] }),
    );
    const barbarian = requireCharacterCombatant(raging.state, barbarianId);

    expect(snapshotBattle(raging.state).turn.bonusActionAvailable).toBe(false);
    expect(characterResources(barbarian)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          unit: expect.objectContaining({ id: barbarianRageUnitId }),
          usesRemaining: 1,
        }),
      ]),
    );
    expect([...barbarian.activeOngoingFeatureOccurrences]).toEqual(
      expect.arrayContaining([
        [
          barbarianRageUnitId,
          expect.objectContaining({ kind: "roundExtended" }),
        ],
      ]),
    );

    const rageHit = resolveOrdinaryAttackDamage({
      state: raging.state,
      subject: attackSubject(raging.state, barbarianId, "Longsword"),
      targetId: monsterId,
      attackRoll: { total: 18, naturalD20: 13 },
      damageDice: [[4]],
    });

    expect(requireCombatant(rageHit.state, monsterId).hp).toBe(Hp(4));

    const monsterTurn = requireResolved(
      endTurn({ state: raging.state, actorId: barbarianId }),
    ).state;
    const beforeDamageHp = requireCombatant(monsterTurn, barbarianId).hp;
    const resisted = resolveOrdinaryAttackDamage({
      state: monsterTurn,
      subject: attackSubject(monsterTurn, monsterId, "Shortsword"),
      targetId: barbarianId,
      attackRoll: { total: 18, naturalD20: 13 },
      damageDice: [[4]],
    });

    expect(requireCombatant(resisted.state, barbarianId).hp).toBe(
      Hp(Number(beforeDamageHp) - 3),
    );
  });

  test("Rogue Sneak Attack projects as a level-1 Dagger damage rider and records once-per-turn use", () => {
    const state = battleFromSheets({
      battleIdText: "battle:l1-sdk-sneak-attack",
      characters: [
        characterSheet({
          characterIdText: "character:l1-sdk-sneak-attack",
          build: levelOneSingleClassBuild({
            classUnitId: "class_rogue",
            weaponUnitId: "weapon_dagger",
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
          maximumHp: 10,
        }),
        characterSheet({
          characterIdText: "character:l1-sdk-sneak-attack-ally",
          build: levelOneSingleClassBuild({
            classUnitId: "class_fighter",
            weaponUnitId: "weapon_longsword",
          }),
          combatantId: rogueAllyId,
          initiative: 15,
          maximumHp: 12,
        }),
      ],
      monsters: [
        monsterBattleInput(monsterId, 10, srdStatBlock("stat_block_skeleton")),
      ],
    });
    const subject = attackSubject(state, rogueId, rogueSneakAttackName);
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetSelection = attackTargetFill(
      target,
      rogueId,
      monsterId,
      rogueSneakAttackName,
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
      attackDamageRiders: [
        {
          attackerId: rogueId,
          unitId: rogueSneakAttackUnitId,
          label: "Sneak Attack",
          damage: { dice: 1, dieSize: 6, damageType: "piercing" },
        },
      ],
    });

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: ordinaryAttackDamageFills({
          state,
          subject,
          prefixFills: [targetSelection, attackRoll],
          damage,
          damageDice: [[4], [6]],
          selectedAttackDamageRiderUnitIds: [rogueSneakAttackUnitId],
        }),
      }),
    );

    expect(requireCombatant(resolved.state, monsterId).hp).toBe(Hp(3));
    expect(
      resolved.state.currentTurnResources.attackDamageRidersUsedThisTurn,
    ).toEqual([{ attackerId: rogueId, unitId: rogueSneakAttackUnitId }]);
  });

  test("Bardic Inspiration grants a level-1 d6 die, spends a Charisma-derived use, and spends the Bonus Action", () => {
    const state = battleFromSheets({
      battleIdText: "battle:l1-sdk-bardic-inspiration",
      characters: [
        characterSheet({
          characterIdText: "character:l1-sdk-bardic-inspiration",
          build: levelOneSingleClassBuild({
            classUnitId: "class_bard",
            abilityScores: {
              str: 10,
              dex: 14,
              con: 14,
              int: 10,
              wis: 10,
              cha: 16,
            },
          }),
          combatantId: bardId,
          initiative: 20,
          maximumHp: 10,
        }),
        characterSheet({
          characterIdText: "character:l1-sdk-bardic-inspiration-ally",
          build: levelOneSingleClassBuild({
            classUnitId: "class_fighter",
            weaponUnitId: "weapon_longsword",
          }),
          combatantId: inspiredAllyId,
          initiative: 15,
          maximumHp: 12,
        }),
      ],
      monsters: [
        monsterBattleInput(monsterId, 10, srdStatBlock("stat_block_skeleton")),
      ],
    });
    const act = unitFeatureActForUnitId(
      state,
      bardId,
      bardBardicInspirationUnitId,
    );
    const target = requireHoleFromList(act.initialHoles, "targetChoice");
    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [bardicInspirationTargetFill(target, inspiredAllyId)],
      }),
    );
    const bard = requireCharacterCombatant(resolved.state, bardId);
    const inspiredAlly = requireCombatant(resolved.state, inspiredAllyId);

    expect(snapshotBattle(resolved.state).turn.bonusActionAvailable).toBe(
      false,
    );
    expect(characterResources(bard)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          unit: expect.objectContaining({ id: bardBardicInspirationUnitId }),
          usesRemaining: 2,
        }),
      ]),
    );
    expect(inspiredAlly.activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "bardicInspirationDie",
          sourceUnitId: bardBardicInspirationUnitId,
          sourceCombatantId: bardId,
          dieSize: 6,
        }),
      ]),
    );
  });

  test("Bard Vicious Mockery cantrip resolves from a level-1 sheet as a Wisdom save with Psychic damage and next Attack Roll Disadvantage", () => {
    const bardBuild = finalizedLevelOneBardViciousMockeryBuild();

    expect(bardBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_bard",
          spellcastingAbility: "cha",
          cantrips: expect.arrayContaining([viciousMockerySpellId]),
        }),
      ]),
    );

    assertLevelOneViciousMockery({
      battleIdText: "battle:l1-sdk-vicious-mockery-bard",
      characterIdText: "character:l1-sdk-vicious-mockery-bard",
      build: bardBuild,
      casterId: viciousMockeryBardId,
      expectedSpellSaveDc: 12,
    });
  });

  test("Bard Dissonant Whispers resolves from a level-1 sheet as a Wisdom save with Psychic damage and forced Reaction movement", () => {
    const bardBuild = finalizedLevelOneBardDissonantWhispersBuild();

    expect(bardBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_bard",
          spellcastingAbility: "cha",
          preparedSpells: expect.arrayContaining([dissonantWhispersSpellId]),
        }),
      ]),
    );

    assertLevelOneDissonantWhispers({
      battleIdText: "battle:l1-sdk-dissonant-whispers-bard",
      characterIdText: "character:l1-sdk-dissonant-whispers-bard",
      build: bardBuild,
      casterId: dissonantWhispersBardId,
      expectedSpellSaveDc: 12,
    });
  });

  test("Sorcerer Innate Sorcery spends a use for one minute and projects Sorcerer spell bonuses", () => {
    const state = battleFromSheets({
      battleIdText: "battle:l1-sdk-innate-sorcery",
      characters: [
        characterSheet({
          characterIdText: "character:l1-sdk-innate-sorcery",
          build: levelOneSingleClassBuild({
            classUnitId: "class_sorcerer",
            abilityScores: {
              str: 8,
              dex: 14,
              con: 14,
              int: 10,
              wis: 10,
              cha: 16,
            },
            spellcasting: {
              sources: [
                {
                  sourceUnitId: "class_sorcerer",
                  spellcastingAbility: "cha",
                  cantrips: [
                    "fire_bolt",
                    "light",
                    "shocking_grasp",
                    sorcerousBurstSpellId,
                  ],
                  spellbook: [],
                  preparedSpells: ["burning_hands", "detect_magic"],
                  spellcastingFocuses: ["arcane_focus"],
                },
              ],
              slotPools: {
                spellcasting: {
                  kind: "spellcasting",
                  slots: [{ spellLevel: 1, count: 2 }],
                },
              },
            },
          }),
          combatantId: sorcererId,
          initiative: 20,
          maximumHp: 8,
        }),
      ],
      monsters: [
        monsterBattleInput(monsterId, 10, srdStatBlock("stat_block_skeleton")),
      ],
    });
    const act = unitFeatureActForUnitId(
      state,
      sorcererId,
      sorcererInnateSorceryUnitId,
    );
    const preActivationSorcerer = requireCharacterCombatant(state, sorcererId);

    expect(preActivationSorcerer.origin.characterUnitRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ unitId: sorcererInnateSorceryUnitId }),
      ]),
    );
    expect(characterResources(preActivationSorcerer)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          unit: expect.objectContaining({ id: sorcererInnateSorceryUnitId }),
          usesRemaining: 2,
        }),
      ]),
    );
    expect(spellSaveDcForCaster(state, sorcererId)).toBe(13);

    const activated = requireResolved(
      resolveBattleSubject({ state, subject: act.subject, fills: [] }),
    ).state;
    const sorcerer = requireCharacterCombatant(activated, sorcererId);

    expect(snapshotBattle(activated).turn.bonusActionAvailable).toBe(false);
    expect(characterResources(sorcerer)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          unit: expect.objectContaining({ id: sorcererInnateSorceryUnitId }),
          usesRemaining: 1,
        }),
      ]),
    );
    expect([...sorcerer.activeOngoingFeatureOccurrences]).toEqual([
      [
        sorcererInnateSorceryUnitId,
        {
          kind: "fixedDuration",
          expiresAt: {
            kind: "endOfTurn",
            combatantId: sorcererId,
            round: 11,
          },
        },
      ],
    ]);
    expect(spellSaveDcForCaster(activated, sorcererId)).toBe(14);

    const spellAct = cantripCastActionSpellAct(
      activated,
      sorcererId,
      sorcerousBurstSpellId,
    );
    const damageType = requireHoleFromList(
      spellAct.initialHoles,
      "damageTypeChoice",
    );
    const target = requireHoleFromList(spellAct.initialHoles, "targetChoice");
    const attackRoll = requireHole(
      resolveBattleSubject({
        state: activated,
        subject: spellAct.subject,
        fills: [
          damageTypeChoiceFill(damageType, "fire"),
          spellTargetFill(target, sorcerousBurstSpellId, sorcererId, monsterId),
        ],
      }),
      "attackRoll",
    );

    expect(attackRoll).toMatchObject({ rollMode: "advantage" });
  });

  test("Sorcerer Burning Hands resolves from a level-1 sheet, applies Fire damage, and spends a spell slot", () => {
    assertLevelOneBurningHands({
      battleIdText: "battle:l1-sdk-burning-hands-sorcerer",
      characterIdText: "character:l1-sdk-burning-hands-sorcerer",
      build: levelOneSorcererBurningHandsBuild(),
      casterId: burningHandsCasterId,
      spellId: burningHandsSpellId,
    });
  });

  test("Wizard Burning Hands resolves from a level-1 spellbook sheet, applies Fire damage, and spends a spell slot", () => {
    const wizardBuild = finalizedLevelOneWizardBurningHandsBuild();

    expect(wizardBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_wizard",
          spellbook: expect.arrayContaining([burningHandsSpellId]),
          preparedSpells: expect.arrayContaining([burningHandsSpellId]),
        }),
      ]),
    );
    assertLevelOneBurningHands({
      battleIdText: "battle:l1-sdk-burning-hands-wizard",
      characterIdText: "character:l1-sdk-burning-hands-wizard",
      build: wizardBuild,
      casterId: wizardBurningHandsCasterId,
      spellId: burningHandsSpellId,
    });
  });

  test("Sorcerer and Wizard Thunderwave resolve from level-1 spell access as a self-origin Cube Saving Throw with push and boom facts", () => {
    const sorcererBuild = finalizedLevelOneSorcererThunderwaveBuild();
    const wizardBuild = finalizedLevelOneWizardThunderwaveBuild();

    expect(sorcererBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_sorcerer",
          preparedSpells: expect.arrayContaining([thunderwaveSpellId]),
        }),
      ]),
    );
    expect(wizardBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_wizard",
          spellbook: expect.arrayContaining([thunderwaveSpellId]),
          preparedSpells: expect.arrayContaining([thunderwaveSpellId]),
        }),
      ]),
    );

    assertLevelOneThunderwave({
      battleIdText: "battle:l1-sdk-thunderwave-sorcerer",
      characterIdText: "character:l1-sdk-thunderwave-sorcerer",
      build: sorcererBuild,
      casterId: thunderwaveSorcererId,
      expectedSpellSaveDc: 12,
    });
    assertLevelOneThunderwave({
      battleIdText: "battle:l1-sdk-thunderwave-wizard",
      characterIdText: "character:l1-sdk-thunderwave-wizard",
      build: wizardBuild,
      casterId: thunderwaveWizardId,
      expectedSpellSaveDc: 13,
    });
  });

  test("Sorcerer and Wizard Acid Splash cantrips resolve from level-1 sheets as a point-origin Sphere Dexterity save without spending slots", () => {
    const sorcererBuild = finalizedLevelOneSorcererAcidSplashBuild();
    const wizardBuild = finalizedLevelOneWizardAcidSplashBuild();

    expect(sorcererBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_sorcerer",
          cantrips: expect.arrayContaining([acidSplashSpellId]),
        }),
      ]),
    );
    expect(wizardBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_wizard",
          cantrips: expect.arrayContaining([acidSplashSpellId]),
        }),
      ]),
    );

    assertLevelOneAcidSplash({
      battleIdText: "battle:l1-sdk-acid-splash-sorcerer",
      characterIdText: "character:l1-sdk-acid-splash-sorcerer",
      build: sorcererBuild,
      casterId: acidSplashSorcererId,
      expectedSpellSaveDc: 12,
    });
    assertLevelOneAcidSplash({
      battleIdText: "battle:l1-sdk-acid-splash-wizard",
      characterIdText: "character:l1-sdk-acid-splash-wizard",
      build: wizardBuild,
      casterId: acidSplashWizardId,
      expectedSpellSaveDc: 13,
    });
  });

  test("Sorcerer Sorcerous Burst cantrip resolves from a level-1 sheet with selected exploding Damage Type damage", () => {
    const sorcererBuild = finalizedLevelOneSorcererSorcerousBurstBuild();

    expect(sorcererBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_sorcerer",
          spellcastingAbility: "cha",
          cantrips: expect.arrayContaining([sorcerousBurstSpellId]),
        }),
      ]),
    );

    assertLevelOneSorcerousBurst({
      battleIdText: "battle:l1-sdk-sorcerous-burst-sorcerer",
      characterIdText: "character:l1-sdk-sorcerous-burst-sorcerer",
      build: sorcererBuild,
      casterId: sorcerousBurstSorcererId,
      expectedSpellAttackBonus: 4,
    });
  });

  test("Sorcerer and Wizard Poison Spray cantrips resolve from level-1 sheets as ranged spell attacks with Poison damage", () => {
    const sorcererBuild = finalizedLevelOneSorcererPoisonSprayBuild();
    const wizardBuild = finalizedLevelOneWizardPoisonSprayBuild();

    expect(sorcererBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_sorcerer",
          cantrips: expect.arrayContaining([poisonSpraySpellId]),
        }),
      ]),
    );
    expect(wizardBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_wizard",
          cantrips: expect.arrayContaining([poisonSpraySpellId]),
        }),
      ]),
    );

    assertLevelOnePoisonSpray({
      battleIdText: "battle:l1-sdk-poison-spray-sorcerer",
      characterIdText: "character:l1-sdk-poison-spray-sorcerer",
      build: sorcererBuild,
      casterId: poisonSpraySorcererId,
      expectedSpellAttackBonus: 4,
      expectedSpellSlots: [{ spellLevel: 1, count: 2, expended: 0 }],
    });
    assertLevelOnePoisonSpray({
      battleIdText: "battle:l1-sdk-poison-spray-wizard",
      characterIdText: "character:l1-sdk-poison-spray-wizard",
      build: wizardBuild,
      casterId: poisonSprayWizardId,
      expectedSpellAttackBonus: 5,
      expectedSpellSlots: [{ spellLevel: 1, count: 2, expended: 0 }],
    });
  });

  test("Druid and Warlock Poison Spray cantrips resolve from level-1 sheets as ranged spell attacks with Poison damage", () => {
    const druidBuild = finalizedLevelOneDruidPoisonSprayBuild();
    const warlockBuild = finalizedLevelOneWarlockPoisonSprayBuild();

    expect(druidBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_druid",
          cantrips: expect.arrayContaining([poisonSpraySpellId]),
        }),
      ]),
    );
    expect(warlockBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_warlock",
          cantrips: expect.arrayContaining([poisonSpraySpellId]),
        }),
      ]),
    );
    expect(warlockBuild.spellcasting?.slotPools).toMatchObject({
      pactMagic: { kind: "pactMagic", slotLevel: 1, count: 1 },
    });

    assertLevelOnePoisonSpray({
      battleIdText: "battle:l1-sdk-poison-spray-druid",
      characterIdText: "character:l1-sdk-poison-spray-druid",
      build: druidBuild,
      casterId: poisonSprayDruidId,
      expectedSpellAttackBonus: 4,
      expectedSpellSlots: [{ spellLevel: 1, count: 2, expended: 0 }],
    });
    assertLevelOnePoisonSpray({
      battleIdText: "battle:l1-sdk-poison-spray-warlock",
      characterIdText: "character:l1-sdk-poison-spray-warlock",
      build: warlockBuild,
      casterId: poisonSprayWarlockId,
      expectedSpellAttackBonus: 4,
      expectedSpellSlots: [{ spellLevel: 1, count: 1, expended: 0 }],
    });
  });

  test("Druid Produce Flame cantrip resolves from a level-1 sheet as held light and a ranged hurl without spending slots", () => {
    const druidBuild = finalizedLevelOneDruidProduceFlameBuild();

    expect(druidBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_druid",
          cantrips: expect.arrayContaining([produceFlameSpellId]),
        }),
      ]),
    );

    assertLevelOneProduceFlame({
      battleIdText: "battle:l1-sdk-produce-flame-druid",
      characterIdText: "character:l1-sdk-produce-flame-druid",
      build: druidBuild,
      casterId: produceFlameDruidId,
      expectedSpellAttackBonus: 4,
      expectedSpellSlots: [{ spellLevel: 1, count: 2, expended: 0 }],
    });
  });

  test("Druid Shillelagh cantrip resolves from a level-1 sheet as a Bonus Action Quarterstaff weapon override", () => {
    const druidBuild = finalizedLevelOneDruidShillelaghBuild();

    expect(druidBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_druid",
          cantrips: expect.arrayContaining([shillelaghSpellId]),
        }),
      ]),
    );

    assertLevelOneShillelagh({
      battleIdText: "battle:l1-sdk-shillelagh-druid",
      characterIdText: "character:l1-sdk-shillelagh-druid",
      build: druidBuild,
      casterId: shillelaghDruidId,
      expectedSpellSlots: [{ spellLevel: 1, count: 2, expended: 0 }],
    });
  });

  test("Cleric Sacred Flame cantrip resolves from a level-1 sheet as a Dexterity save with Radiant damage", () => {
    const clericBuild = finalizedLevelOneClericSacredFlameBuild();

    expect(clericBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_cleric",
          spellcastingAbility: "wis",
          cantrips: expect.arrayContaining([sacredFlameSpellId]),
        }),
      ]),
    );

    assertLevelOneSacredFlame({
      battleIdText: "battle:l1-sdk-sacred-flame-cleric",
      characterIdText: "character:l1-sdk-sacred-flame-cleric",
      build: clericBuild,
      casterId: sacredFlameClericId,
      expectedSpellSaveDc: 12,
    });
  });

  test("Cleric Thaumaturgy Booming Voice cantrip resolves from a level-1 sheet with Advantage on Charisma (Intimidation) Ability Checks", () => {
    const clericBuild = finalizedLevelOneClericThaumaturgyBuild();

    expect(clericBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_cleric",
          spellcastingAbility: "wis",
          cantrips: expect.arrayContaining([thaumaturgySpellId]),
        }),
      ]),
    );

    assertLevelOneThaumaturgyBoomingVoice({
      battleIdText: "battle:l1-sdk-thaumaturgy-cleric",
      characterIdText: "character:l1-sdk-thaumaturgy-cleric",
      build: clericBuild,
      casterId: thaumaturgyClericId,
      expectedSpellSlots: [{ spellLevel: 1, count: 2, expended: 0 }],
    });
  });

  test("Cleric Guiding Bolt resolves from a level-1 sheet as a ranged Spell Attack with Advantage on the next Attack Roll against the target before the caster's next turn ends", () => {
    const clericBuild = finalizedLevelOneClericGuidingBoltBuild();

    expect(clericBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_cleric",
          spellcastingAbility: "wis",
          preparedSpells: expect.arrayContaining([guidingBoltSpellId]),
        }),
      ]),
    );

    assertLevelOneGuidingBolt({
      battleIdText: "battle:l1-sdk-guiding-bolt-cleric",
      characterIdText: "character:l1-sdk-guiding-bolt-cleric",
      build: clericBuild,
      casterId: guidingBoltClericId,
      allyId: guidingBoltAllyId,
      expectedSpellAttackBonus: 4,
    });
  });

  test("Cleric Inflict Wounds resolves from a level-1 sheet as a Constitution save with Necrotic damage", () => {
    const clericBuild = finalizedLevelOneClericInflictWoundsBuild();

    expect(clericBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_cleric",
          spellcastingAbility: "wis",
          preparedSpells: expect.arrayContaining([inflictWoundsSpellId]),
        }),
      ]),
    );

    assertLevelOneInflictWounds({
      battleIdText: "battle:l1-sdk-inflict-wounds-cleric",
      characterIdText: "character:l1-sdk-inflict-wounds-cleric",
      build: clericBuild,
      casterId: inflictWoundsClericId,
      expectedSpellSaveDc: 12,
    });
  });

  test("Cleric Sanctuary resolves from a level-1 sheet as a one-minute Bonus Action ward with a Wisdom save interdiction", () => {
    const clericBuild = finalizedLevelOneClericSanctuaryBuild();

    expect(clericBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_cleric",
          spellcastingAbility: "wis",
          preparedSpells: expect.arrayContaining([sanctuarySpellId]),
        }),
      ]),
    );

    assertLevelOneSanctuary({
      battleIdText: "battle:l1-sdk-sanctuary-cleric",
      characterIdText: "character:l1-sdk-sanctuary-cleric",
      build: clericBuild,
      casterId: sanctuaryClericId,
      wardedId: sanctuaryWardedAllyId,
    });
  });

  test("Bard, Cleric, and Druid Healing Word resolve from level-1 sheets as Bonus Action Hit Point restoration", () => {
    const bardBuild = finalizedLevelOneBardHealingWordBuild();
    const clericBuild = finalizedLevelOneClericHealingWordBuild();
    const druidBuild = finalizedLevelOneDruidHealingWordBuild();

    expect(bardBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_bard",
          spellcastingAbility: "cha",
          preparedSpells: expect.arrayContaining([healingWordSpellId]),
        }),
      ]),
    );
    expect(clericBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_cleric",
          spellcastingAbility: "wis",
          preparedSpells: expect.arrayContaining([healingWordSpellId]),
        }),
      ]),
    );
    expect(druidBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_druid",
          spellcastingAbility: "wis",
          preparedSpells: expect.arrayContaining([healingWordSpellId]),
        }),
      ]),
    );

    assertLevelOneHealingWord({
      battleIdText: "battle:l1-sdk-healing-word-bard",
      characterIdText: "character:l1-sdk-healing-word-bard",
      build: bardBuild,
      casterId: healingWordBardId,
      targetId: healingWordTargetId,
    });
    assertLevelOneHealingWord({
      battleIdText: "battle:l1-sdk-healing-word-cleric",
      characterIdText: "character:l1-sdk-healing-word-cleric",
      build: clericBuild,
      casterId: healingWordClericId,
      targetId: healingWordTargetId,
    });
    assertLevelOneHealingWord({
      battleIdText: "battle:l1-sdk-healing-word-druid",
      characterIdText: "character:l1-sdk-healing-word-druid",
      build: druidBuild,
      casterId: healingWordDruidId,
      targetId: healingWordTargetId,
    });
  });

  test("Sorcerer, Warlock, and Wizard Chill Touch cantrips resolve from level-1 sheets as melee spell attacks with Hit Point regain prevention", () => {
    const sorcererBuild = finalizedLevelOneSorcererChillTouchBuild();
    const warlockBuild = finalizedLevelOneWarlockChillTouchBuild();
    const wizardBuild = finalizedLevelOneWizardChillTouchBuild();

    expect(sorcererBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_sorcerer",
          cantrips: expect.arrayContaining([chillTouchSpellId]),
        }),
      ]),
    );
    expect(warlockBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_warlock",
          cantrips: expect.arrayContaining([chillTouchSpellId]),
        }),
      ]),
    );
    expect(warlockBuild.spellcasting?.slotPools).toMatchObject({
      pactMagic: { kind: "pactMagic", slotLevel: 1, count: 1 },
    });
    expect(wizardBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_wizard",
          cantrips: expect.arrayContaining([chillTouchSpellId]),
        }),
      ]),
    );

    assertLevelOneChillTouch({
      battleIdText: "battle:l1-sdk-chill-touch-sorcerer",
      characterIdText: "character:l1-sdk-chill-touch-sorcerer",
      build: sorcererBuild,
      casterId: chillTouchSorcererId,
      expectedSpellAttackBonus: 4,
      expectedSpellSlots: [{ spellLevel: 1, count: 2, expended: 0 }],
    });
    assertLevelOneChillTouch({
      battleIdText: "battle:l1-sdk-chill-touch-warlock",
      characterIdText: "character:l1-sdk-chill-touch-warlock",
      build: warlockBuild,
      casterId: chillTouchWarlockId,
      expectedSpellAttackBonus: 4,
      expectedSpellSlots: [{ spellLevel: 1, count: 1, expended: 0 }],
    });
    assertLevelOneChillTouch({
      battleIdText: "battle:l1-sdk-chill-touch-wizard",
      characterIdText: "character:l1-sdk-chill-touch-wizard",
      build: wizardBuild,
      casterId: chillTouchWizardId,
      expectedSpellAttackBonus: 5,
      expectedSpellSlots: [{ spellLevel: 1, count: 2, expended: 0 }],
    });
  });

  test("Warlock Eldritch Blast cantrip resolves from a level-1 sheet as a ranged one-beam Spell Attack sequence without spending slots", () => {
    const warlockBuild = finalizedLevelOneWarlockEldritchBlastBuild();

    expect(warlockBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_warlock",
          cantrips: expect.arrayContaining([eldritchBlastSpellId]),
        }),
      ]),
    );
    expect(warlockBuild.spellcasting?.slotPools).toMatchObject({
      pactMagic: { kind: "pactMagic", slotLevel: 1, count: 1 },
    });

    assertLevelOneEldritchBlast({
      battleIdText: "battle:l1-sdk-eldritch-blast-warlock",
      characterIdText: "character:l1-sdk-eldritch-blast-warlock",
      build: warlockBuild,
      casterId: eldritchBlastWarlockId,
      expectedSpellAttackBonus: 4,
    });
  });

  test("Warlock Hex resolves from a level-1 sheet through Pact Magic as a marked Necrotic rider and chosen Ability Check Disadvantage", () => {
    const warlockBuild = finalizedLevelOneWarlockHexBuild();

    expect(warlockBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_warlock",
          spellcastingAbility: "cha",
          preparedSpells: expect.arrayContaining([hexSpellId]),
        }),
      ]),
    );
    expect(warlockBuild.spellcasting?.slotPools).toMatchObject({
      pactMagic: { kind: "pactMagic", slotLevel: 1, count: 1 },
    });

    const hexSheet = characterSheet({
      characterIdText: "character:l1-sdk-hex-warlock",
      build: warlockBuild,
      combatantId: hexWarlockId,
      initiative: 20,
      maximumHp: 8,
    });
    const state = battleFromSheets({
      battleIdText: "battle:l1-sdk-hex-warlock",
      characters: [hexSheet],
      monsters: [
        monsterBattleInput(monsterId, 10, srdStatBlock("stat_block_skeleton")),
      ],
    });
    const act = hexBonusActionSpellSlotAct(state, hexWarlockId);
    const target = requireHoleFromList(act.initialHoles, "targetChoice");
    const ability = requireHoleFromList(act.initialHoles, "abilityChoice");

    expect(
      requireCharacterCombatant(state, hexWarlockId).origin.spellcasting,
    ).toMatchObject({
      spellSlots: [{ spellLevel: 1, count: 1, expended: 0 }],
    });
    expect(target).toMatchObject({
      choices: expect.arrayContaining([monsterId]),
    });
    expect(ability).toMatchObject({
      choices: ["str", "dex", "con", "int", "wis", "cha"],
    });

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          spellTargetFill(target, hexSpellId, hexWarlockId, monsterId),
          abilityChoiceFill(ability, "wis"),
        ],
      }),
    );
    const caster = requireCharacterCombatant(resolved.state, hexWarlockId);

    expect(snapshotBattle(resolved.state).turn.bonusActionAvailable).toBe(
      false,
    );
    expect(caster.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 1, count: 1, expended: 1 },
    ]);
    expect(caster.concentration).toEqual({
      sourceSpellId: hexSpellId,
      effectKind: "spellEffect",
    });
    expect(caster.activeEffects).toEqual([
      expect.objectContaining({
        kind: "spellMarkedDamageRider",
        targetCombatantId: monsterId,
        abilityCheckBehavior: {
          kind: "abilityDisadvantage",
          ability: "wis",
        },
        damage: expect.objectContaining({
          expr: { dice: 1, dieSize: 6 },
          damageType: "necrotic",
        }),
        transfer: {
          kind: "awaitingTargetDrop",
          retargetTiming: "laterTurn",
        },
      }),
    ]);
    expect(
      settleCharacterSheetFromBattle({
        sheet: hexSheet.sheet,
        state: resolved.state,
        combatant: caster,
        unitLibrary,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Battle handoff while active battle effects or Concentration are present is blocked; end or resolve battle-local effects before Character Sheet handoff.",
      },
    });
    const concentrationEnded = breakBattleConcentration(
      resolved.state,
      hexWarlockId,
    );
    const cleanedCaster = requireCharacterCombatant(
      concentrationEnded,
      hexWarlockId,
    );
    expect(cleanedCaster.concentration).toBeNull();
    expect(cleanedCaster.activeEffects).toEqual([]);

    const settled = requireRight(
      settleCharacterSheetFromBattle({
        sheet: hexSheet.sheet,
        state: concentrationEnded,
        combatant: cleanedCaster,
        unitLibrary,
      }),
    );
    expect(characterSheetSpellSlots(settled)).toEqual([]);
    expect(characterSheetPactSlots(settled)).toEqual({
      slotLevel: 1,
      count: 1,
      expended: 1,
    });
  });

  test("Sorcerer and Wizard Fire Bolt cantrips resolve from level-1 sheets as ranged spell attacks without spending slots", () => {
    const sorcererBuild = finalizedLevelOneSorcererFireBoltBuild();
    const wizardBuild = finalizedLevelOneWizardFireBoltBuild();

    expect(sorcererBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_sorcerer",
          cantrips: expect.arrayContaining([fireBoltSpellId]),
        }),
      ]),
    );
    expect(wizardBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_wizard",
          cantrips: expect.arrayContaining([fireBoltSpellId]),
        }),
      ]),
    );

    assertLevelOneFireBolt({
      battleIdText: "battle:l1-sdk-fire-bolt-sorcerer",
      characterIdText: "character:l1-sdk-fire-bolt-sorcerer",
      build: sorcererBuild,
      casterId: fireBoltSorcererId,
      expectedSpellAttackBonus: 4,
    });
    assertLevelOneFireBolt({
      battleIdText: "battle:l1-sdk-fire-bolt-wizard",
      characterIdText: "character:l1-sdk-fire-bolt-wizard",
      build: wizardBuild,
      casterId: fireBoltWizardId,
      expectedSpellAttackBonus: 5,
    });
  });

  test("Sorcerer and Wizard Ray of Frost cantrips resolve from level-1 sheets as ranged spell attacks with Cold damage and Speed reduction", () => {
    const sorcererBuild = finalizedLevelOneSorcererRayOfFrostBuild();
    const wizardBuild = finalizedLevelOneWizardRayOfFrostBuild();

    expect(sorcererBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_sorcerer",
          cantrips: expect.arrayContaining([rayOfFrostSpellId]),
        }),
      ]),
    );
    expect(wizardBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_wizard",
          cantrips: expect.arrayContaining([rayOfFrostSpellId]),
        }),
      ]),
    );

    assertLevelOneRayOfFrost({
      battleIdText: "battle:l1-sdk-ray-of-frost-sorcerer",
      characterIdText: "character:l1-sdk-ray-of-frost-sorcerer",
      build: sorcererBuild,
      casterId: rayOfFrostSorcererId,
      expectedSpellAttackBonus: 4,
    });
    assertLevelOneRayOfFrost({
      battleIdText: "battle:l1-sdk-ray-of-frost-wizard",
      characterIdText: "character:l1-sdk-ray-of-frost-wizard",
      build: wizardBuild,
      casterId: rayOfFrostWizardId,
      expectedSpellAttackBonus: 5,
    });
  });

  test("Sorcerer and Wizard Shocking Grasp cantrips resolve from level-1 sheets as melee spell attacks with Lightning damage and Opportunity Attack denial", () => {
    const sorcererBuild = finalizedLevelOneSorcererShockingGraspBuild();
    const wizardBuild = finalizedLevelOneWizardShockingGraspBuild();

    expect(sorcererBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_sorcerer",
          cantrips: expect.arrayContaining([shockingGraspSpellId]),
        }),
      ]),
    );
    expect(wizardBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_wizard",
          cantrips: expect.arrayContaining([shockingGraspSpellId]),
        }),
      ]),
    );

    assertLevelOneShockingGrasp({
      battleIdText: "battle:l1-sdk-shocking-grasp-sorcerer",
      characterIdText: "character:l1-sdk-shocking-grasp-sorcerer",
      build: sorcererBuild,
      casterId: shockingGraspSorcererId,
      expectedSpellAttackBonus: 4,
    });
    assertLevelOneShockingGrasp({
      battleIdText: "battle:l1-sdk-shocking-grasp-wizard",
      characterIdText: "character:l1-sdk-shocking-grasp-wizard",
      build: wizardBuild,
      casterId: shockingGraspWizardId,
      expectedSpellAttackBonus: 5,
    });
  });

  test("Sorcerer and Wizard Chromatic Orb resolve from level-1 spell access with chosen damage and one duplicate-dice leap", () => {
    const sorcererBuild = finalizedLevelOneSorcererChromaticOrbBuild();
    const wizardBuild = finalizedLevelOneWizardChromaticOrbBuild();

    expect(sorcererBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_sorcerer",
          preparedSpells: expect.arrayContaining([chromaticOrbSpellId]),
        }),
      ]),
    );
    expect(wizardBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_wizard",
          spellbook: expect.arrayContaining([chromaticOrbSpellId]),
          preparedSpells: expect.arrayContaining([chromaticOrbSpellId]),
        }),
      ]),
    );

    assertLevelOneChromaticOrb({
      battleIdText: "battle:l1-sdk-chromatic-orb-sorcerer",
      characterIdText: "character:l1-sdk-chromatic-orb-sorcerer",
      build: sorcererBuild,
      casterId: chromaticOrbSorcererId,
      expectedSpellAttackBonus: 4,
    });
    assertLevelOneChromaticOrb({
      battleIdText: "battle:l1-sdk-chromatic-orb-wizard",
      characterIdText: "character:l1-sdk-chromatic-orb-wizard",
      build: wizardBuild,
      casterId: chromaticOrbWizardId,
      expectedSpellAttackBonus: 5,
    });
  });

  test("Sorcerer and Wizard Mage Armor resolve from level-1 spell access as an 8-hour base AC effect", () => {
    const sorcererBuild = finalizedLevelOneSorcererMageArmorBuild();
    const wizardBuild = finalizedLevelOneWizardMageArmorBuild();

    expect(sorcererBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_sorcerer",
          preparedSpells: expect.arrayContaining([mageArmorSpellId]),
        }),
      ]),
    );
    expect(wizardBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_wizard",
          spellbook: expect.arrayContaining([mageArmorSpellId]),
          preparedSpells: expect.arrayContaining([mageArmorSpellId]),
        }),
      ]),
    );

    assertLevelOneMageArmor({
      battleIdText: "battle:l1-sdk-mage-armor-sorcerer",
      characterIdText: "character:l1-sdk-mage-armor-sorcerer",
      build: sorcererBuild,
      casterId: mageArmorSorcererId,
      expectedArmorClass: 16,
    });
    assertLevelOneMageArmor({
      battleIdText: "battle:l1-sdk-mage-armor-wizard",
      characterIdText: "character:l1-sdk-mage-armor-wizard",
      build: wizardBuild,
      casterId: mageArmorWizardId,
      expectedArmorClass: 15,
    });
  });

  test("Sorcerer and Wizard False Life resolve from level-1 spell access as self Temporary Hit Points", () => {
    const sorcererBuild = finalizedLevelOneSorcererFalseLifeBuild();
    const wizardBuild = finalizedLevelOneWizardFalseLifeBuild();

    expect(sorcererBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_sorcerer",
          preparedSpells: expect.arrayContaining([falseLifeSpellId]),
        }),
      ]),
    );
    expect(wizardBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_wizard",
          spellbook: expect.arrayContaining([falseLifeSpellId]),
          preparedSpells: expect.arrayContaining([falseLifeSpellId]),
        }),
      ]),
    );

    assertLevelOneFalseLife({
      battleIdText: "battle:l1-sdk-false-life-sorcerer",
      characterIdText: "character:l1-sdk-false-life-sorcerer",
      build: sorcererBuild,
      casterId: falseLifeSorcererId,
    });
    assertLevelOneFalseLife({
      battleIdText: "battle:l1-sdk-false-life-wizard",
      characterIdText: "character:l1-sdk-false-life-wizard",
      build: wizardBuild,
      casterId: falseLifeWizardId,
    });
  });

  test("Sorcerer and Wizard Ray of Sickness resolve from level-1 spell access as Poison damage plus a turn-scoped Poisoned rider", () => {
    const sorcererBuild = finalizedLevelOneSorcererRayOfSicknessBuild();
    const wizardBuild = finalizedLevelOneWizardRayOfSicknessBuild();

    expect(sorcererBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_sorcerer",
          preparedSpells: expect.arrayContaining([rayOfSicknessSpellId]),
        }),
      ]),
    );
    expect(wizardBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_wizard",
          spellbook: expect.arrayContaining([rayOfSicknessSpellId]),
          preparedSpells: expect.arrayContaining([rayOfSicknessSpellId]),
        }),
      ]),
    );

    assertLevelOneRayOfSickness({
      battleIdText: "battle:l1-sdk-ray-of-sickness-sorcerer",
      characterIdText: "character:l1-sdk-ray-of-sickness-sorcerer",
      build: sorcererBuild,
      casterId: rayOfSicknessSorcererId,
      expectedSpellAttackBonus: 4,
    });
    assertLevelOneRayOfSickness({
      battleIdText: "battle:l1-sdk-ray-of-sickness-wizard",
      characterIdText: "character:l1-sdk-ray-of-sickness-wizard",
      build: wizardBuild,
      casterId: rayOfSicknessWizardId,
      expectedSpellAttackBonus: 5,
    });
  });

  test("Sorcerer and Wizard Magic Missile resolve from level-1 spell access with split dart allocation", () => {
    const sorcererBuild = finalizedLevelOneSorcererMagicMissileBuild();
    const wizardBuild = finalizedLevelOneWizardMagicMissileBuild();

    expect(sorcererBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_sorcerer",
          preparedSpells: expect.arrayContaining([magicMissileSpellId]),
        }),
      ]),
    );
    expect(wizardBuild.spellcasting?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceUnitId: "class_wizard",
          spellbook: expect.arrayContaining([magicMissileSpellId]),
          preparedSpells: expect.arrayContaining([magicMissileSpellId]),
        }),
      ]),
    );

    assertLevelOneMagicMissile({
      battleIdText: "battle:l1-sdk-magic-missile-sorcerer",
      characterIdText: "character:l1-sdk-magic-missile-sorcerer",
      build: sorcererBuild,
      casterId: magicMissileSorcererId,
    });
    assertLevelOneMagicMissile({
      battleIdText: "battle:l1-sdk-magic-missile-wizard",
      characterIdText: "character:l1-sdk-magic-missile-wizard",
      build: wizardBuild,
      casterId: magicMissileWizardId,
    });
  });

  test("Monk Martial Arts projects a level-1 Bonus Action Unarmed Strike using the Martial Arts die and Dexterity", () => {
    const state = battleFromSheets({
      battleIdText: "battle:l1-sdk-martial-arts",
      characters: [
        characterSheet({
          characterIdText: "character:l1-sdk-martial-arts",
          build: levelOneSingleClassBuild({
            classUnitId: "class_monk",
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
          maximumHp: 10,
        }),
      ],
      monsters: [
        monsterBattleInput(
          monsterId,
          10,
          srdStatBlock("stat_block_goblin_warrior"),
        ),
      ],
    });
    expect(
      requireCharacterCombatant(state, monkId).origin.characterUnitRefs,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ unitId: monkMartialArtsUnitId }),
      ]),
    );
    const act = martialArtsBonusUnarmedStrikeAct(state, monkId);
    const resolved = resolveOrdinaryAttackDamage({
      state,
      subject: act.subject,
      targetId: monsterId,
      attackRoll: { total: 18, naturalD20: 13 },
      damageDice: [[4]],
    });

    expect(requireCombatant(resolved.state, monsterId).hp).toBe(Hp(3));
    expect(snapshotBattle(resolved.state).turn.bonusActionAvailable).toBe(
      false,
    );
  });
});

function assertLevelOneBurningHands(input: {
  readonly battleIdText: string;
  readonly characterIdText: string;
  readonly build: CharacterBuild;
  readonly casterId: CombatantId;
  readonly spellId: typeof burningHandsSpellId;
}): void {
  const state = battleFromSheets({
    battleIdText: input.battleIdText,
    characters: [
      characterSheet({
        characterIdText: input.characterIdText,
        build: input.build,
        combatantId: input.casterId,
        initiative: 20,
        maximumHp: 8,
      }),
    ],
    monsters: [
      monsterBattleInput(monsterId, 10, srdStatBlock("stat_block_skeleton")),
      monsterBattleInput(
        secondMonsterId,
        8,
        srdStatBlock("stat_block_skeleton"),
      ),
    ],
  });
  const act = spellSlotActForProcedure(
    state,
    input.spellId,
    1,
    "saveGatedDamage",
  );
  const save = requireHoleFromList(act.initialHoles, "savingThrowOutcome");

  expect(spellSaveDcForCaster(state, input.casterId)).toBe(13);
  expect(save).toMatchObject({
    label: "Burning Hands self-origin Cone Saving Throw outcomes",
    ability: "dex",
    dc: { kind: "caster_spell_save_dc" },
    spell: {
      targeting: { kind: "selfOriginCone", lengthFeet: 15 },
      damage: { expr: { dice: 3, dieSize: 6 }, damageType: "fire" },
      successDamage: "half",
      rangeFeet: 0,
    },
  });

  const saveFill = areaSavingThrowOutcomeFill(save, input.casterId, [
    { targetId: monsterId, succeeded: false },
    { targetId: secondMonsterId, succeeded: true },
  ]);
  const damage = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [saveFill],
    }),
    "rolledDice",
  );

  expect(damage).toMatchObject({
    label: "Burning Hands damage (3d6-fire)",
    spell: {
      damage: { expr: { dice: 3, dieSize: 6 }, damageType: "fire" },
      successDamage: "half",
    },
    critical: false,
  });

  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [saveFill, damageRollFillWithGroups(damage, [[4, 4, 4]])],
    }),
  );
  const caster = requireCharacterCombatant(resolved.state, input.casterId);

  expect(requireCombatant(resolved.state, monsterId).hp).toBe(Hp(1));
  expect(requireCombatant(resolved.state, secondMonsterId).hp).toBe(Hp(7));
  expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);
  expect(caster.origin.spellcasting?.spellSlots).toEqual([
    { spellLevel: 1, count: 2, expended: 1 },
  ]);
}

function assertLevelOneThunderwave(input: {
  readonly battleIdText: string;
  readonly characterIdText: string;
  readonly build: CharacterBuild;
  readonly casterId: CombatantId;
  readonly expectedSpellSaveDc: number;
}): void {
  const state = battleFromSheets({
    battleIdText: input.battleIdText,
    characters: [
      characterSheet({
        characterIdText: input.characterIdText,
        build: input.build,
        combatantId: input.casterId,
        initiative: 20,
        maximumHp: 8,
      }),
    ],
    monsters: [
      monsterBattleInput(monsterId, 10, srdStatBlock("stat_block_skeleton")),
      monsterBattleInput(
        secondMonsterId,
        8,
        srdStatBlock("stat_block_skeleton"),
      ),
    ],
  });
  const act = spellSlotActForProcedure(
    state,
    thunderwaveSpellId,
    1,
    "saveGatedDamage",
  );
  const save = requireThunderwaveSavingThrowHole(
    requireHoleFromList(act.initialHoles, "savingThrowOutcome"),
  );

  expect(spellSaveDcForCaster(state, input.casterId)).toBe(
    input.expectedSpellSaveDc,
  );
  expect(save).toMatchObject({
    label: "Thunderwave self-origin Cube Saving Throw outcomes",
    ability: "con",
    dc: { kind: "caster_spell_save_dc" },
    spell: {
      targeting: { kind: "selfOriginCube", sideFeet: 15 },
      damage: { expr: { dice: 2, dieSize: 8 }, damageType: "thunder" },
      successDamage: "half",
      rangeFeet: 0,
      failedSavePostDamageRiders: [],
      postSaveAreaEffect: {
        kind: "thunderwave",
        creaturePush: {
          distanceFeet: 10,
          originDirection: "away_from_caster",
        },
        unsecuredObjectPush: {
          distanceFeet: 10,
          originDirection: "away_from_caster",
          objectLocation: "entirely_within_area",
        },
        audibleBoom: {
          sound: "thunderous boom",
          audibleRadiusFeet: 300,
        },
      },
    },
  });

  const saveFill = thunderwaveSavingThrowOutcomeFill(save, input.casterId, [
    { targetId: monsterId, succeeded: false },
    { targetId: secondMonsterId, succeeded: true },
  ]);
  expect(saveFill.value).toEqual({
    area: {
      kind: "thunderwaveArea",
      originAnchorId: input.casterId,
      affectedTargetIds: [monsterId, secondMonsterId],
      creaturePushes: [
        {
          targetId: monsterId,
          disposition: {
            kind: "pushed",
            distanceFeet: movementFeet(10),
            destinationId: battleTablePositionId(
              `pushed:l1-sdk-thunderwave:${monsterId}`,
            ),
            provokesOpportunityAttacks: false,
          },
        },
      ],
      unsecuredObjectPushes: [
        {
          objectId: thunderwaveUnsecuredObjectId,
          disposition: {
            kind: "pushed",
            distanceFeet: movementFeet(10),
            destinationId: battleTablePositionId(
              "pushed:l1-sdk-thunderwave-object",
            ),
            provokesOpportunityAttacks: false,
          },
        },
      ],
      audibleBoom: {
        sound: "thunderous boom",
        audibleRadiusFeet: movementFeet(300),
      },
    },
    outcomes: [
      { targetId: monsterId, succeeded: false },
      { targetId: secondMonsterId, succeeded: true },
    ],
  });
  const damage = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [saveFill],
    }),
    "rolledDice",
  );

  expect(damage).toMatchObject({
    label: "Thunderwave damage (2d8-thunder)",
    spell: {
      damage: { expr: { dice: 2, dieSize: 8 }, damageType: "thunder" },
      successDamage: "half",
    },
    critical: false,
  });

  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [saveFill, damageRollFillWithGroups(damage, [[4, 4]])],
    }),
  );
  const caster = requireCharacterCombatant(resolved.state, input.casterId);

  expect(requireCombatant(resolved.state, monsterId).hp).toBe(Hp(5));
  expect(requireCombatant(resolved.state, secondMonsterId).hp).toBe(Hp(9));
  expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);
  expect(caster.origin.spellcasting?.spellSlots).toEqual([
    { spellLevel: 1, count: 2, expended: 1 },
  ]);
}

function assertLevelOneDissonantWhispers(input: {
  readonly battleIdText: string;
  readonly characterIdText: string;
  readonly build: CharacterBuild;
  readonly casterId: CombatantId;
  readonly expectedSpellSaveDc: number;
}): void {
  const state = battleFromSheets({
    battleIdText: input.battleIdText,
    characters: [
      characterSheet({
        characterIdText: input.characterIdText,
        build: input.build,
        combatantId: input.casterId,
        initiative: 20,
        maximumHp: 10,
      }),
    ],
    monsters: [
      monsterBattleInput(monsterId, 10, srdStatBlock("stat_block_skeleton")),
    ],
  });
  const act = spellSlotActForProcedure(
    state,
    dissonantWhispersSpellId,
    1,
    "saveGatedDamage",
  );
  const target = requireHoleFromList(act.initialHoles, "targetChoice");
  const targetFill = spellTargetFill(
    target,
    dissonantWhispersSpellId,
    input.casterId,
    monsterId,
  );
  const save = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill],
    }),
    "savingThrowOutcome",
  );

  expect(target).toMatchObject({
    choices: expect.arrayContaining([monsterId]),
  });
  expect(spellSaveDcForCaster(state, input.casterId)).toBe(
    input.expectedSpellSaveDc,
  );
  expect(save).toMatchObject({
    label: "Dissonant Whispers Saving Throw outcome",
    ability: "wis",
    dc: { kind: "caster_spell_save_dc" },
    spell: {
      resource: { tag: "spellSlot", slotLevel: 1 },
      targeting: { kind: "singleCombatant" },
      damage: { expr: { dice: 3, dieSize: 6 }, damageType: "psychic" },
      successDamage: "half",
      rangeFeet: 60,
      failedSavePostDamageRiders: [
        {
          kind: "forcedReactionMovement",
          direction: "awayFromCaster",
          route: "safest",
          distance: "asFarAsPossible",
          cost: "targetReactionIfAvailable",
        },
      ],
    },
  });

  const failedSaveFill = savingThrowOutcomeFill(save, [
    { targetId: monsterId, succeeded: false },
  ]);
  const failedDamage = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, failedSaveFill],
    }),
    "rolledDice",
  );

  expect(failedDamage).toMatchObject({
    label: "Dissonant Whispers damage (3d6-psychic)",
    spell: {
      resource: { tag: "spellSlot", slotLevel: 1 },
      damage: { expr: { dice: 3, dieSize: 6 }, damageType: "psychic" },
      successDamage: "half",
      failedSavePostDamageRiders: [
        {
          kind: "forcedReactionMovement",
          direction: "awayFromCaster",
          route: "safest",
          distance: "asFarAsPossible",
          cost: "targetReactionIfAvailable",
        },
      ],
    },
    critical: false,
  });

  const movement = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        failedSaveFill,
        damageRollFillWithGroups(failedDamage, [[3, 4, 5]]),
      ],
    }),
    "movement",
  );
  const walkMovementBudget = requireMovementSpeedBudget(movement, "walk");
  expect(movement).toMatchObject({
    actorId: monsterId,
    movementBudgetFeet: movementFeet(30),
    speedKinds: expect.arrayContaining([
      expect.objectContaining({
        kind: "walk",
        movementBudgetFeet: movementFeet(30),
      }),
    ]),
  });

  const failedSave = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        failedSaveFill,
        damageRollFillWithGroups(failedDamage, [[3, 4, 5]]),
        walkMovementFill(movement, {
          movementCostFeet: walkMovementBudget,
          provokedOpportunityAttacks: [],
        }),
      ],
    }),
  );
  const failedSaveCaster = requireCharacterCombatant(
    failedSave.state,
    input.casterId,
  );

  expect(requireCombatant(failedSave.state, monsterId)).toMatchObject({
    hp: Hp(1),
    reactionAvailable: false,
  });
  expect(snapshotBattle(failedSave.state).turn.actionResources).toEqual([]);
  expect(failedSaveCaster.origin.spellcasting?.spellSlots).toEqual([
    { spellLevel: 1, count: 2, expended: 1 },
  ]);

  const successfulSaveFill = savingThrowOutcomeFill(save, [
    { targetId: monsterId, succeeded: true },
  ]);
  const successDamage = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, successfulSaveFill],
    }),
    "rolledDice",
  );
  const successfulSave = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        successfulSaveFill,
        damageRollFillWithGroups(successDamage, [[3, 4, 5]]),
      ],
    }),
  );
  const successfulSaveCaster = requireCharacterCombatant(
    successfulSave.state,
    input.casterId,
  );

  expect(requireCombatant(successfulSave.state, monsterId)).toMatchObject({
    hp: Hp(7),
    reactionAvailable: true,
  });
  expect(snapshotBattle(successfulSave.state).turn.actionResources).toEqual([]);
  expect(successfulSaveCaster.origin.spellcasting?.spellSlots).toEqual([
    { spellLevel: 1, count: 2, expended: 1 },
  ]);
}

function assertLevelOneViciousMockery(input: {
  readonly battleIdText: string;
  readonly characterIdText: string;
  readonly build: CharacterBuild;
  readonly casterId: CombatantId;
  readonly expectedSpellSaveDc: number;
}): void {
  const state = battleFromSheets({
    battleIdText: input.battleIdText,
    characters: [
      characterSheet({
        characterIdText: input.characterIdText,
        build: input.build,
        combatantId: input.casterId,
        initiative: 20,
        maximumHp: 10,
      }),
    ],
    monsters: [
      monsterBattleInput(monsterId, 10, srdStatBlock("stat_block_skeleton")),
    ],
  });
  const act = cantripCastActionSpellAct(
    state,
    input.casterId,
    viciousMockerySpellId,
    "saveGatedDamage",
  );
  const target = requireHoleFromList(act.initialHoles, "targetChoice");
  const targetFill = spellTargetFill(
    target,
    viciousMockerySpellId,
    input.casterId,
    monsterId,
  );
  const save = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill],
    }),
    "savingThrowOutcome",
  );

  expect(target).toMatchObject({
    choices: expect.arrayContaining([monsterId]),
  });
  expect(spellSaveDcForCaster(state, input.casterId)).toBe(
    input.expectedSpellSaveDc,
  );
  expect(save).toMatchObject({
    label: "Vicious Mockery Saving Throw outcome",
    ability: "wis",
    dc: { kind: "caster_spell_save_dc" },
    spell: {
      resource: { tag: "none" },
      targeting: { kind: "singleCombatant" },
      damage: { expr: { dice: 1, dieSize: 6 }, damageType: "psychic" },
      successDamage: "none",
      rangeFeet: 60,
      failedSavePostDamageRiders: [
        {
          kind: "nextAttackRollByTarget",
          mode: "disadvantage",
          expiresAt: "endOfTargetNextTurn",
        },
      ],
    },
  });

  const failedSaveFill = savingThrowOutcomeFill(save, [
    { targetId: monsterId, succeeded: false },
  ]);
  const damage = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, failedSaveFill],
    }),
    "rolledDice",
  );

  expect(damage).toMatchObject({
    label: "Vicious Mockery damage (1d6-psychic)",
    spell: {
      resource: { tag: "none" },
      damage: { expr: { dice: 1, dieSize: 6 }, damageType: "psychic" },
      successDamage: "none",
      failedSavePostDamageRiders: [
        {
          kind: "nextAttackRollByTarget",
          mode: "disadvantage",
          expiresAt: "endOfTargetNextTurn",
        },
      ],
    },
    critical: false,
  });

  const failedSave = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        failedSaveFill,
        damageRollFillWithGroups(damage, [[6]]),
      ],
    }),
  );
  const failedSaveCaster = requireCharacterCombatant(
    failedSave.state,
    input.casterId,
  );

  expect(requireCombatant(failedSave.state, monsterId)).toMatchObject({
    hp: Hp(7),
    activeEffects: expect.arrayContaining([
      expect.objectContaining({
        kind: "nextAttackRollBySelf",
        sourceSpellId: viciousMockerySpellId,
        sourceCombatantId: input.casterId,
        mode: "disadvantage",
        expiresAt: { kind: "endOfTurn", combatantId: monsterId, round: 1 },
      }),
    ]),
  });
  expect(snapshotBattle(failedSave.state).turn.actionResources).toEqual([]);
  expect(failedSaveCaster.origin.spellcasting?.spellSlots).toEqual([
    { spellLevel: 1, count: 2, expended: 0 },
  ]);

  const monsterTurn = requireResolved(
    endTurn({ state: failedSave.state, actorId: input.casterId }),
  ).state;
  const monsterAttack = attackSubject(monsterTurn, monsterId, "Shortsword");
  const attackTarget = requireHole(
    resolveBattleSubject({
      state: monsterTurn,
      subject: monsterAttack,
      fills: [],
    }),
    "targetChoice",
  );
  const attackRoll = requireHole(
    resolveBattleSubject({
      state: monsterTurn,
      subject: monsterAttack,
      fills: [
        attackTargetFill(attackTarget, monsterId, input.casterId, "Shortsword"),
      ],
    }),
    "attackRoll",
  );

  expect(attackRoll).toMatchObject({ rollMode: "disadvantage" });

  const afterMockedAttack = resolveOrdinaryAttackDamage({
    state: monsterTurn,
    subject: monsterAttack,
    targetId: input.casterId,
    attackRoll: { total: 18, naturalD20: 14, rollMode: "disadvantage" },
    damageDice: [[3]],
  });

  expect(
    requireCombatant(afterMockedAttack.state, monsterId).activeEffects,
  ).toEqual([]);

  const successfulSave = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        savingThrowOutcomeFill(save, [
          { targetId: monsterId, succeeded: true },
        ]),
      ],
    }),
  );
  const successfulSaveCaster = requireCharacterCombatant(
    successfulSave.state,
    input.casterId,
  );

  expect(requireCombatant(successfulSave.state, monsterId)).toMatchObject({
    hp: Hp(13),
    activeEffects: [],
  });
  expect(snapshotBattle(successfulSave.state).turn.actionResources).toEqual([]);
  expect(successfulSaveCaster.origin.spellcasting?.spellSlots).toEqual([
    { spellLevel: 1, count: 2, expended: 0 },
  ]);
}

function assertLevelOneAcidSplash(input: {
  readonly battleIdText: string;
  readonly characterIdText: string;
  readonly build: CharacterBuild;
  readonly casterId: CombatantId;
  readonly expectedSpellSaveDc: number;
}): void {
  const state = battleFromSheets({
    battleIdText: input.battleIdText,
    characters: [
      characterSheet({
        characterIdText: input.characterIdText,
        build: input.build,
        combatantId: input.casterId,
        initiative: 20,
        maximumHp: 8,
      }),
    ],
    monsters: [
      monsterBattleInput(monsterId, 10, srdStatBlock("stat_block_skeleton")),
      monsterBattleInput(
        secondMonsterId,
        8,
        srdStatBlock("stat_block_skeleton"),
      ),
    ],
  });
  const act = cantripCastActionSpellAct(
    state,
    input.casterId,
    acidSplashSpellId,
    "saveGatedDamage",
  );
  const save = requireHoleFromList(act.initialHoles, "savingThrowOutcome");

  expect(spellSaveDcForCaster(state, input.casterId)).toBe(
    input.expectedSpellSaveDc,
  );
  expect(save).toMatchObject({
    label: "Acid Splash point-origin Sphere Saving Throw outcomes",
    ability: "dex",
    dc: { kind: "caster_spell_save_dc" },
    areaChoices: [],
    spell: {
      targeting: { kind: "pointOriginSphere", radiusFeet: 5 },
      damage: { expr: { dice: 1, dieSize: 6 }, damageType: "acid" },
      successDamage: "none",
      rangeFeet: 60,
    },
  });

  const saveFill = areaSavingThrowOutcomeFill(save, input.casterId, [
    { targetId: monsterId, succeeded: false },
    { targetId: secondMonsterId, succeeded: true },
  ]);
  const damage = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [saveFill],
    }),
    "rolledDice",
  );

  expect(damage).toMatchObject({
    label: "Acid Splash damage (1d6-acid)",
    spell: {
      damage: { expr: { dice: 1, dieSize: 6 }, damageType: "acid" },
      successDamage: "none",
    },
    critical: false,
  });

  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [saveFill, damageRollFillWithGroups(damage, [[4]])],
    }),
  );
  const caster = requireCharacterCombatant(resolved.state, input.casterId);

  expect(requireCombatant(resolved.state, monsterId).hp).toBe(Hp(9));
  expect(requireCombatant(resolved.state, secondMonsterId).hp).toBe(Hp(13));
  expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);
  expect(caster.origin.spellcasting?.spellSlots).toEqual([
    { spellLevel: 1, count: 2, expended: 0 },
  ]);
}

function assertLevelOneSorcerousBurst(input: {
  readonly battleIdText: string;
  readonly characterIdText: string;
  readonly build: CharacterBuild;
  readonly casterId: CombatantId;
  readonly expectedSpellAttackBonus: number;
}): void {
  const state = battleFromSheets({
    battleIdText: input.battleIdText,
    characters: [
      characterSheet({
        characterIdText: input.characterIdText,
        build: input.build,
        combatantId: input.casterId,
        initiative: 20,
        maximumHp: 8,
      }),
    ],
    monsters: [
      monsterBattleInput(monsterId, 10, srdStatBlock("stat_block_skeleton")),
    ],
  });
  const act = cantripCastActionSpellAct(
    state,
    input.casterId,
    sorcerousBurstSpellId,
  );
  const damageType = requireHoleFromList(act.initialHoles, "damageTypeChoice");
  const target = requireHoleFromList(act.initialHoles, "targetChoice");
  const objectTarget = requireHoleFromList(
    act.initialHoles,
    "objectTargetChoice",
  );
  const damageTypeFill = damageTypeChoiceFill(damageType, "thunder");
  const targetFill = spellTargetFill(
    target,
    sorcerousBurstSpellId,
    input.casterId,
    monsterId,
  );
  const attackRoll = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [damageTypeFill, targetFill],
    }),
    "attackRoll",
  );

  expect(damageType.choices).toEqual([
    "acid",
    "cold",
    "fire",
    "lightning",
    "poison",
    "psychic",
    "thunder",
  ]);
  expect(target).toMatchObject({
    choices: expect.arrayContaining([monsterId]),
  });
  expect(objectTarget).toMatchObject({
    requiresTableSpatialFact: true,
  });
  expect(attackRoll).toMatchObject({
    attackBonus: input.expectedSpellAttackBonus,
    spell: {
      resource: { tag: "none" },
      attackKind: "ranged_spell_attack",
      targeting: { kind: "singleCreatureOrObject" },
      rangeFeet: 120,
      damage: {
        kind: "selectedSorcerousBurstDamage",
        expr: { dice: 1, dieSize: 8 },
        damageType: "thunder",
        maxDieAdditionalDiceLimit: 2,
      },
      postDamageRiders: [],
    },
  });

  const attackFill = attackRollFill(attackRoll, {
    total: 13 + input.expectedSpellAttackBonus,
    naturalD20: 13,
  });
  const damage = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [damageTypeFill, targetFill, attackFill],
    }),
    "rolledDice",
  );

  expect(damage).toMatchObject({
    label: "Sorcerous Burst damage (1d8-thunder)",
    spell: {
      resource: { tag: "none" },
      damage: {
        kind: "selectedSorcerousBurstDamage",
        expr: { dice: 1, dieSize: 8 },
        damageType: "thunder",
        maxDieAdditionalDiceLimit: 2,
      },
      postDamageRiders: [],
    },
    critical: false,
  });

  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: ordinaryAttackDamageFills({
        state,
        subject: act.subject,
        prefixFills: [damageTypeFill, targetFill, attackFill],
        damage,
        damageDice: [[8, 3]],
      }),
    }),
  );
  const caster = requireCharacterCombatant(resolved.state, input.casterId);

  expect(requireCombatant(resolved.state, monsterId).hp).toBe(Hp(2));
  expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);
  expect(caster.origin.spellcasting?.spellSlots).toEqual([
    { spellLevel: 1, count: 2, expended: 0 },
  ]);
}

function assertLevelOnePoisonSpray(input: {
  readonly battleIdText: string;
  readonly characterIdText: string;
  readonly build: CharacterBuild;
  readonly casterId: CombatantId;
  readonly expectedSpellAttackBonus: number;
  readonly expectedSpellSlots: readonly {
    readonly spellLevel: number;
    readonly count: number;
    readonly expended: number;
  }[];
}): void {
  const state = battleFromSheets({
    battleIdText: input.battleIdText,
    characters: [
      characterSheet({
        characterIdText: input.characterIdText,
        build: input.build,
        combatantId: input.casterId,
        initiative: 20,
        maximumHp: 8,
      }),
    ],
    monsters: [
      monsterBattleInput(
        monsterId,
        10,
        srdStatBlock("stat_block_goblin_warrior"),
      ),
    ],
  });
  const act = cantripCastActionSpellAct(
    state,
    input.casterId,
    poisonSpraySpellId,
  );
  const target = requireHoleFromList(act.initialHoles, "targetChoice");
  const targetFill = spellTargetFill(
    target,
    poisonSpraySpellId,
    input.casterId,
    monsterId,
  );
  const attackRoll = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill],
    }),
    "attackRoll",
  );

  expect(target).toMatchObject({
    choices: expect.arrayContaining([monsterId]),
  });
  expect(attackRoll).toMatchObject({
    attackBonus: input.expectedSpellAttackBonus,
    spell: {
      resource: { tag: "none" },
      attackKind: "ranged_spell_attack",
      targeting: { kind: "singleCombatant" },
      rangeFeet: 30,
      damage: {
        kind: "fixedSpellAttackDamage",
        expr: { dice: 1, dieSize: 12 },
        damageType: "poison",
      },
      postDamageRiders: [],
    },
  });

  const attackFill = attackRollFill(attackRoll, {
    total: 13 + input.expectedSpellAttackBonus,
    naturalD20: 13,
  });
  const damage = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, attackFill],
    }),
    "rolledDice",
  );

  expect(damage).toMatchObject({
    label: "Poison Spray damage (1d12-poison)",
    spell: {
      resource: { tag: "none" },
      damage: {
        kind: "fixedSpellAttackDamage",
        expr: { dice: 1, dieSize: 12 },
        damageType: "poison",
      },
      postDamageRiders: [],
    },
    critical: false,
  });

  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: ordinaryAttackDamageFills({
        state,
        subject: act.subject,
        prefixFills: [targetFill, attackFill],
        damage,
        damageDice: [[7]],
      }),
    }),
  );
  const caster = requireCharacterCombatant(resolved.state, input.casterId);

  expect(requireCombatant(resolved.state, monsterId).hp).toBe(Hp(3));
  expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);
  expect(caster.origin.spellcasting?.spellSlots).toEqual(
    input.expectedSpellSlots,
  );
}

function assertLevelOneProduceFlame(input: {
  readonly battleIdText: string;
  readonly characterIdText: string;
  readonly build: CharacterBuild;
  readonly casterId: CombatantId;
  readonly expectedSpellAttackBonus: number;
  readonly expectedSpellSlots: readonly {
    readonly spellLevel: number;
    readonly count: number;
    readonly expended: number;
  }[];
}): void {
  const state = battleFromSheets({
    battleIdText: input.battleIdText,
    characters: [
      characterSheet({
        characterIdText: input.characterIdText,
        build: input.build,
        combatantId: input.casterId,
        initiative: 20,
        maximumHp: 10,
      }),
    ],
    monsters: [
      monsterBattleInput(
        monsterId,
        10,
        srdStatBlock("stat_block_goblin_warrior"),
      ),
    ],
  });
  expect(
    hasCantripSpellInvocationAct(
      state,
      input.casterId,
      produceFlameSpellId,
      "heldLightHurl",
    ),
  ).toBe(false);
  const heldLightAct = cantripCastHeldLightBonusActionSpellAct(
    state,
    input.casterId,
    produceFlameSpellId,
  );
  expect(heldLightAct.initialHoles).toEqual([]);

  const lit = requireResolved(
    resolveBattleSubject({
      state,
      subject: heldLightAct.subject,
      fills: [],
    }),
  );
  const litCaster = requireCharacterCombatant(lit.state, input.casterId);
  expect(requireCombatant(lit.state, input.casterId).activeEffects).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: "heldLight",
        sourceSpellId: produceFlameSpellId,
        sourceCombatantId: input.casterId,
        brightRadiusFeet: 20,
        dimAdditionalFeet: 20,
      }),
    ]),
  );
  expect(snapshotBattle(lit.state)).toMatchObject({
    lightEmitters: [
      {
        kind: "spellLightEmitter",
        sourceSpellId: produceFlameSpellId,
        sourceCombatantId: input.casterId,
        attachment: { kind: "combatant", combatantId: input.casterId },
        emission: {
          kind: "brightAndDim",
          brightRadiusFeet: movementFeet(20),
          dimAdditionalFeet: movementFeet(20),
        },
      },
    ],
    turn: { bonusActionAvailable: false },
  });
  expect(litCaster.origin.spellcasting?.spellSlots).toEqual(
    input.expectedSpellSlots,
  );

  const hurlAct = cantripCastActionSpellAct(
    lit.state,
    input.casterId,
    produceFlameSpellId,
    "heldLightHurl",
  );
  const target = requireHoleFromList(hurlAct.initialHoles, "targetChoice");
  const objectTarget = requireHoleFromList(
    hurlAct.initialHoles,
    "objectTargetChoice",
  );
  const targetFill = spellTargetFill(
    target,
    produceFlameSpellId,
    input.casterId,
    monsterId,
  );
  const attackRoll = requireHole(
    resolveBattleSubject({
      state: lit.state,
      subject: hurlAct.subject,
      fills: [targetFill],
    }),
    "attackRoll",
  );

  expect(hurlAct.initialHoles).toHaveLength(2);
  expect(target).toMatchObject({
    choices: expect.arrayContaining([monsterId]),
  });
  expect(objectTarget).toMatchObject({
    label: "Produce Flame object target",
    requiresTableSpatialFact: true,
  });
  expect(attackRoll).toMatchObject({
    attackBonus: input.expectedSpellAttackBonus,
    spell: {
      resource: { tag: "none" },
      attackKind: "ranged_spell_attack",
      targeting: { kind: "singleCreatureOrObject" },
      rangeFeet: 60,
      damage: {
        expr: { dice: 1, dieSize: 8 },
        damageType: "fire",
      },
    },
  });

  const attackFill = attackRollFill(attackRoll, {
    total: 13 + input.expectedSpellAttackBonus,
    naturalD20: 13,
  });
  const damage = requireHole(
    resolveBattleSubject({
      state: lit.state,
      subject: hurlAct.subject,
      fills: [targetFill, attackFill],
    }),
    "rolledDice",
  );

  expect(damage).toMatchObject({
    label: "Produce Flame damage (1d8-fire)",
    spell: {
      resource: { tag: "none" },
      damage: {
        expr: { dice: 1, dieSize: 8 },
        damageType: "fire",
      },
    },
    critical: false,
  });

  const resolved = requireResolved(
    resolveBattleSubject({
      state: lit.state,
      subject: hurlAct.subject,
      fills: [targetFill, attackFill, damageRollFillWithGroups(damage, [[5]])],
    }),
  );
  const caster = requireCharacterCombatant(resolved.state, input.casterId);

  expect(requireCombatant(resolved.state, monsterId).hp).toBe(Hp(5));
  expect(
    requireCombatant(resolved.state, input.casterId).activeEffects.some(
      (effect) =>
        effect.kind === "heldLight" &&
        effect.sourceSpellId === produceFlameSpellId,
    ),
  ).toBe(false);
  expect(snapshotBattle(resolved.state).lightEmitters).toEqual([]);
  expect(snapshotBattle(resolved.state).turn).toMatchObject({
    actionResources: [],
    bonusActionAvailable: false,
  });
  expect(caster.origin.spellcasting?.spellSlots).toEqual(
    input.expectedSpellSlots,
  );
}

function assertLevelOneShillelagh(input: {
  readonly battleIdText: string;
  readonly characterIdText: string;
  readonly build: CharacterBuild;
  readonly casterId: CombatantId;
  readonly expectedSpellSlots: readonly {
    readonly spellLevel: number;
    readonly count: number;
    readonly expended: number;
  }[];
}): void {
  const state = battleFromSheets({
    battleIdText: input.battleIdText,
    characters: [
      characterSheet({
        characterIdText: input.characterIdText,
        build: input.build,
        combatantId: input.casterId,
        initiative: 20,
        maximumHp: 10,
      }),
    ],
    monsters: [
      monsterBattleInput(monsterId, 10, srdStatBlock("stat_block_skeleton")),
    ],
  });
  const act = shillelaghBonusActionSpellAct(state, input.casterId);

  expect(act).toMatchObject({
    subject: {
      tag: "bonusActionSpell",
      actorId: input.casterId,
      invocation: {
        tag: "cantrip",
        spellId: shillelaghSpellId,
        procedure: "weaponAttackOverride",
      },
      mode: { tag: "cast" },
      componentWeaponItemId: shillelaghQuarterstaffItemId,
    },
    initialHoles: [],
  });

  const resolved = requireResolved(
    resolveBattleSubject({ state, subject: act.subject, fills: [] }),
  );
  const caster = requireCharacterCombatant(resolved.state, input.casterId);

  expect(caster.activeEffects).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: "spellWeaponAttackOverride",
        sourceSpellId: shillelaghSpellId,
        sourceCombatantId: input.casterId,
        weaponItemId: shillelaghQuarterstaffItemId,
        spellcastingAbilityModifier: abilityModifier(2),
        attackBonus: attackBonus(4),
        damage: { expr: { dice: 1, dieSize: 8 } },
        damageTypeChoices: ["force", "bludgeoning"],
        expiresAt: {
          kind: "duration",
          durationTicks: shillelaghDurationTicks,
        },
      }),
    ]),
  );
  expect(snapshotBattle(resolved.state).turn.bonusActionAvailable).toBe(false);
  expect(resolved.state.currentTurnResources.spellSlotUsesThisTurn).toEqual([]);
  expect(caster.concentration).toBeNull();
  expect(caster.origin.spellcasting?.spellSlots).toEqual(
    input.expectedSpellSlots,
  );

  const forceAttack = attackSubject(
    resolved.state,
    input.casterId,
    "Quarterstaff (force)",
  );
  const target = requireHole(
    resolveBattleSubject({
      state: resolved.state,
      subject: forceAttack,
      fills: [],
    }),
    "targetChoice",
  );
  const targetFill = attackTargetFill(
    target,
    input.casterId,
    monsterId,
    "Quarterstaff (force)",
  );
  const attackRoll = requireHole(
    resolveBattleSubject({
      state: resolved.state,
      subject: forceAttack,
      fills: [targetFill],
    }),
    "attackRoll",
  );

  expect(attackRoll).toMatchObject({ attackBonus: attackBonus(4) });

  const attackFill = attackRollFill(attackRoll, {
    total: 13 + 4,
    naturalD20: 13,
  });
  const damage = requireHole(
    resolveBattleSubject({
      state: resolved.state,
      subject: forceAttack,
      fills: [targetFill, attackFill],
    }),
    "rolledDice",
  );

  expect(damage).toMatchObject({
    label: "Quarterstaff (force) damage (1d8+2-force)",
  });
  expect(
    discoverBattleActs(resolved.state).some(
      (candidate) =>
        candidate.subject.tag === "action" &&
        candidate.subject.action === "attack" &&
        candidate.subject.actorId === input.casterId &&
        candidate.subject.attackName === "Quarterstaff (bludgeoning)",
    ),
  ).toBe(true);

  const hit = requireResolved(
    resolveBattleSubject({
      state: resolved.state,
      subject: forceAttack,
      fills: ordinaryAttackDamageFills({
        state: resolved.state,
        subject: forceAttack,
        prefixFills: [targetFill, attackFill],
        damage,
        damageDice: [[5]],
      }),
    }),
  );

  expect(requireCombatant(hit.state, monsterId).hp).toBe(Hp(6));
}

function assertLevelOneSacredFlame(input: {
  readonly battleIdText: string;
  readonly characterIdText: string;
  readonly build: CharacterBuild;
  readonly casterId: CombatantId;
  readonly expectedSpellSaveDc: number;
}): void {
  const state = battleFromSheets({
    battleIdText: input.battleIdText,
    characters: [
      characterSheet({
        characterIdText: input.characterIdText,
        build: input.build,
        combatantId: input.casterId,
        initiative: 20,
        maximumHp: 10,
      }),
    ],
    monsters: [
      monsterBattleInput(monsterId, 10, srdStatBlock("stat_block_skeleton")),
    ],
  });
  const act = cantripCastActionSpellAct(
    state,
    input.casterId,
    sacredFlameSpellId,
    "saveGatedDamage",
  );
  const target = requireHoleFromList(act.initialHoles, "targetChoice");
  const targetFill = spellTargetFill(
    target,
    sacredFlameSpellId,
    input.casterId,
    monsterId,
  );
  const save = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill],
    }),
    "savingThrowOutcome",
  );

  expect(target).toMatchObject({
    choices: expect.arrayContaining([monsterId]),
  });
  expect(spellSaveDcForCaster(state, input.casterId)).toBe(
    input.expectedSpellSaveDc,
  );
  expect(save).toMatchObject({
    label: "Sacred Flame Saving Throw outcome",
    ability: "dex",
    dc: { kind: "caster_spell_save_dc" },
    spell: {
      resource: { tag: "none" },
      targeting: { kind: "singleCombatant" },
      damage: { expr: { dice: 1, dieSize: 8 }, damageType: "radiant" },
      successDamage: "none",
      rangeFeet: 60,
      failedSavePostDamageRiders: [],
    },
  });

  const failedSaveFill = savingThrowOutcomeFill(save, [
    { targetId: monsterId, succeeded: false },
  ]);
  const damage = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, failedSaveFill],
    }),
    "rolledDice",
  );

  expect(damage).toMatchObject({
    label: "Sacred Flame damage (1d8-radiant)",
    spell: {
      resource: { tag: "none" },
      damage: { expr: { dice: 1, dieSize: 8 }, damageType: "radiant" },
      successDamage: "none",
      failedSavePostDamageRiders: [],
    },
    critical: false,
  });

  const failedSave = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        failedSaveFill,
        damageRollFillWithGroups(damage, [[7]]),
      ],
    }),
  );
  const failedSaveCaster = requireCharacterCombatant(
    failedSave.state,
    input.casterId,
  );

  expect(requireCombatant(failedSave.state, monsterId).hp).toBe(Hp(6));
  expect(snapshotBattle(failedSave.state).turn.actionResources).toEqual([]);
  expect(failedSaveCaster.origin.spellcasting?.spellSlots).toEqual([
    { spellLevel: 1, count: 2, expended: 0 },
  ]);

  const successfulSave = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        savingThrowOutcomeFill(save, [
          { targetId: monsterId, succeeded: true },
        ]),
      ],
    }),
  );
  const successfulSaveCaster = requireCharacterCombatant(
    successfulSave.state,
    input.casterId,
  );

  expect(requireCombatant(successfulSave.state, monsterId).hp).toBe(Hp(13));
  expect(snapshotBattle(successfulSave.state).turn.actionResources).toEqual([]);
  expect(successfulSaveCaster.origin.spellcasting?.spellSlots).toEqual([
    { spellLevel: 1, count: 2, expended: 0 },
  ]);
}

function assertLevelOneThaumaturgyBoomingVoice(input: {
  readonly battleIdText: string;
  readonly characterIdText: string;
  readonly build: CharacterBuild;
  readonly casterId: CombatantId;
  readonly expectedSpellSlots: readonly {
    readonly spellLevel: number;
    readonly count: number;
    readonly expended: number;
  }[];
}): void {
  const state = battleFromSheets({
    battleIdText: input.battleIdText,
    characters: [
      characterSheet({
        characterIdText: input.characterIdText,
        build: input.build,
        combatantId: input.casterId,
        initiative: 20,
        maximumHp: 10,
      }),
    ],
    monsters: [
      monsterBattleInput(monsterId, 10, srdStatBlock("stat_block_skeleton")),
    ],
  });
  const act = cantripCastActionSpellAct(
    state,
    input.casterId,
    thaumaturgySpellId,
    "thaumaturgyBoomingVoice",
  );
  const countHole = requireHoleFromList(
    act.initialHoles,
    "thaumaturgyActiveOneMinuteEffectCount",
  );

  expect(act.initialHoles).toHaveLength(1);
  expect(countHole).toMatchObject({
    label: "Thaumaturgy total active 1-minute effects",
    maximumActiveOneMinuteEffects: 3,
    requiresTableSpellEffectCount: true,
  });

  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [noActiveThaumaturgyOneMinuteEffectsFill(countHole)],
    }),
  );
  const caster = requireCharacterCombatant(resolved.state, input.casterId);

  expect(caster.activeEffects).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: "thaumaturgyBoomingVoice",
        sourceSpellId: thaumaturgySpellId,
        sourceCombatantId: input.casterId,
        expiresAt: {
          kind: "duration",
          durationTicks: thaumaturgyDurationTicks,
        },
      }),
    ]),
  );
  expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);
  expect(resolved.state.currentTurnResources.spellSlotUsesThisTurn).toEqual([]);
  expect(caster.concentration).toBeNull();
  expect(caster.origin.spellcasting?.spellSlots).toEqual(
    input.expectedSpellSlots,
  );
  expect(
    thaumaturgyBoomingVoiceInfluenceAbilityCheckHole(
      resolved.state,
      input.casterId,
      difficultyClass(13),
    ),
  ).toMatchObject({
    kind: "abilityCheck",
    ability: "cha",
    skill: "intimidation",
    rollMode: "advantage",
  });
}

function assertLevelOneInflictWounds(input: {
  readonly battleIdText: string;
  readonly characterIdText: string;
  readonly build: CharacterBuild;
  readonly casterId: CombatantId;
  readonly expectedSpellSaveDc: number;
}): void {
  const state = battleFromSheets({
    battleIdText: input.battleIdText,
    characters: [
      characterSheet({
        characterIdText: input.characterIdText,
        build: input.build,
        combatantId: input.casterId,
        initiative: 20,
        maximumHp: 10,
      }),
    ],
    monsters: [
      monsterBattleInput(monsterId, 10, srdStatBlock("stat_block_skeleton")),
    ],
  });
  const act = spellSlotActForProcedure(
    state,
    inflictWoundsSpellId,
    1,
    "saveGatedDamage",
  );
  const target = requireHoleFromList(act.initialHoles, "targetChoice");
  const targetFill = spellTargetFill(
    target,
    inflictWoundsSpellId,
    input.casterId,
    monsterId,
  );
  const save = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill],
    }),
    "savingThrowOutcome",
  );

  expect(target).toMatchObject({
    choices: expect.arrayContaining([monsterId]),
  });
  expect(spellSaveDcForCaster(state, input.casterId)).toBe(
    input.expectedSpellSaveDc,
  );
  expect(save).toMatchObject({
    label: "Inflict Wounds Saving Throw outcome",
    ability: "con",
    dc: { kind: "caster_spell_save_dc" },
    spell: {
      resource: { tag: "spellSlot", slotLevel: 1 },
      targeting: { kind: "singleCombatant" },
      damage: { expr: { dice: 2, dieSize: 10 }, damageType: "necrotic" },
      successDamage: "half",
      rangeFeet: 5,
      failedSavePostDamageRiders: [],
    },
  });

  const failedSaveFill = savingThrowOutcomeFill(save, [
    { targetId: monsterId, succeeded: false },
  ]);
  const failedDamage = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, failedSaveFill],
    }),
    "rolledDice",
  );

  expect(failedDamage).toMatchObject({
    label: "Inflict Wounds damage (2d10-necrotic)",
    spell: {
      resource: { tag: "spellSlot", slotLevel: 1 },
      damage: { expr: { dice: 2, dieSize: 10 }, damageType: "necrotic" },
      successDamage: "half",
      failedSavePostDamageRiders: [],
    },
    critical: false,
  });

  const failedSave = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        failedSaveFill,
        damageRollFillWithGroups(failedDamage, [[5, 5]]),
      ],
    }),
  );
  const failedSaveCaster = requireCharacterCombatant(
    failedSave.state,
    input.casterId,
  );

  expect(requireCombatant(failedSave.state, monsterId).hp).toBe(Hp(3));
  expect(snapshotBattle(failedSave.state).turn.actionResources).toEqual([]);
  expect(failedSaveCaster.origin.spellcasting?.spellSlots).toEqual([
    { spellLevel: 1, count: 2, expended: 1 },
  ]);

  const successfulSaveFill = savingThrowOutcomeFill(save, [
    { targetId: monsterId, succeeded: true },
  ]);
  const successDamage = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, successfulSaveFill],
    }),
    "rolledDice",
  );
  const successfulSave = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        successfulSaveFill,
        damageRollFillWithGroups(successDamage, [[5, 5]]),
      ],
    }),
  );
  const successfulSaveCaster = requireCharacterCombatant(
    successfulSave.state,
    input.casterId,
  );

  expect(requireCombatant(successfulSave.state, monsterId).hp).toBe(Hp(8));
  expect(snapshotBattle(successfulSave.state).turn.actionResources).toEqual([]);
  expect(successfulSaveCaster.origin.spellcasting?.spellSlots).toEqual([
    { spellLevel: 1, count: 2, expended: 1 },
  ]);
}

function assertLevelOneSanctuary(input: {
  readonly battleIdText: string;
  readonly characterIdText: string;
  readonly build: CharacterBuild;
  readonly casterId: CombatantId;
  readonly wardedId: CombatantId;
}): void {
  const state = battleFromSheets({
    battleIdText: input.battleIdText,
    characters: [
      characterSheet({
        characterIdText: input.characterIdText,
        build: input.build,
        combatantId: input.casterId,
        initiative: 20,
        maximumHp: 10,
      }),
      characterSheet({
        characterIdText: "character:l1-sdk-sanctuary-warded-ally",
        build: levelOneSingleClassBuild({
          classUnitId: "class_fighter",
          weaponUnitId: "weapon_longsword",
        }),
        combatantId: input.wardedId,
        initiative: 15,
        maximumHp: 12,
      }),
    ],
    monsters: [
      monsterBattleInput(monsterId, 10, srdStatBlock("stat_block_skeleton")),
    ],
  });
  const act = sanctuaryBonusActionSpellSlotAct(state, input.casterId);
  const targetList = requireHoleFromList(act.initialHoles, "spellTargetList");

  expect(targetList).toMatchObject({
    label: "Sanctuary targets",
    minTargets: 1,
    maxTargets: 1,
    requiresTableSpatialFact: true,
    choices: expect.arrayContaining([input.wardedId]),
    spell: {
      access: { tag: "prepared" },
      procedure: "sanctuaryTargetingInterdiction",
      resource: { tag: "spellSlot", slotLevel: 1 },
      actionCost: "bonusAction",
      targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
      rangeFeet: movementFeet(30),
      activeEffect: {
        kind: "sanctuaryWard",
        sourceSpellId: sanctuarySpellId,
        sourceCombatantId: input.casterId,
        save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
        expiresAt: {
          kind: "duration",
          durationTicks: sanctuaryDurationTicks,
        },
      },
    },
  });

  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        sanctuaryTargetListFill(targetList, input.casterId, input.wardedId),
      ],
    }),
  );
  const caster = requireCharacterCombatant(resolved.state, input.casterId);

  expect(
    requireCombatant(resolved.state, input.wardedId).activeEffects,
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: "sanctuaryWard",
        sourceSpellId: sanctuarySpellId,
        sourceCombatantId: input.casterId,
        save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
        expiresAt: {
          kind: "duration",
          durationTicks: sanctuaryDurationTicks,
        },
      }),
    ]),
  );
  expect(snapshotBattle(resolved.state).turn.bonusActionAvailable).toBe(false);
  expect(resolved.state.currentTurnResources.spellSlotUsesThisTurn).toEqual([
    { kind: "committed", combatantId: input.casterId },
  ]);
  expect(caster.concentration).toBeNull();
  expect(caster.origin.spellcasting?.spellSlots).toEqual([
    { spellLevel: 1, count: 2, expended: 1 },
  ]);
}

function assertLevelOneHealingWord(input: {
  readonly battleIdText: string;
  readonly characterIdText: string;
  readonly build: CharacterBuild;
  readonly casterId: CombatantId;
  readonly targetId: CombatantId;
}): void {
  const state = battleFromSheets({
    battleIdText: input.battleIdText,
    characters: [
      characterSheet({
        characterIdText: input.characterIdText,
        build: input.build,
        combatantId: input.casterId,
        initiative: 20,
        maximumHp: 10,
      }),
      characterSheet({
        characterIdText: `${input.characterIdText}-target`,
        build: levelOneSingleClassBuild({
          classUnitId: "class_fighter",
          weaponUnitId: "weapon_longsword",
        }),
        combatantId: input.targetId,
        initiative: 15,
        maximumHp: 12,
        currentHp: 3,
      }),
    ],
    monsters: [],
  });
  const act = healingWordBonusActionSpellSlotAct(state, input.casterId);
  const target = requireHoleFromList(act.initialHoles, "targetChoice");

  expect(act.subject).toMatchObject({
    tag: "bonusActionSpell",
    actorId: input.casterId,
    invocation: {
      tag: "spellSlot",
      spellId: healingWordSpellId,
      slotLevel: 1,
      procedure: "directHitPointRestoration",
    },
    mode: { tag: "cast" },
  });
  expect(target).toMatchObject({
    requiresTableSpatialFact: true,
    choices: expect.arrayContaining([input.targetId]),
  });

  const targetFill = spellTargetFill(
    target,
    healingWordSpellId,
    input.casterId,
    input.targetId,
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
    label: "Healing Word healing (2d4+2)",
    spell: {
      procedure: "directHitPointRestoration",
      actionCost: "bonusAction",
      resource: { tag: "spellSlot", slotLevel: 1 },
      targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
      healing: { expr: { dice: 2, dieSize: 4, flat: 2 } },
      rangeFeet: 60,
    },
  });

  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, damageRollFillWithGroups(healingRoll, [[2, 3]])],
    }),
  );
  const caster = requireCharacterCombatant(resolved.state, input.casterId);

  expect(requireCombatant(resolved.state, input.targetId).hp).toBe(Hp(10));
  expect(snapshotBattle(resolved.state).turn.bonusActionAvailable).toBe(false);
  expect(resolved.state.currentTurnResources.spellSlotUsesThisTurn).toEqual([
    { kind: "committed", combatantId: input.casterId },
  ]);
  expect(caster.concentration).toBeNull();
  expect(caster.activeEffects).toEqual([]);
  expect(caster.origin.spellcasting?.spellSlots).toEqual([
    { spellLevel: 1, count: 2, expended: 1 },
  ]);
}

function assertLevelOneGuidingBolt(input: {
  readonly battleIdText: string;
  readonly characterIdText: string;
  readonly build: CharacterBuild;
  readonly casterId: CombatantId;
  readonly allyId: CombatantId;
  readonly expectedSpellAttackBonus: number;
}): void {
  const state = battleFromSheets({
    battleIdText: input.battleIdText,
    characters: [
      characterSheet({
        characterIdText: input.characterIdText,
        build: input.build,
        combatantId: input.casterId,
        initiative: 20,
        maximumHp: 10,
      }),
      characterSheet({
        characterIdText: "character:l1-sdk-guiding-bolt-ally",
        build: levelOneSingleClassBuild({
          classUnitId: "class_fighter",
          weaponUnitId: "weapon_longsword",
        }),
        combatantId: input.allyId,
        initiative: 15,
        maximumHp: 12,
      }),
    ],
    monsters: [
      monsterBattleInput(monsterId, 10, srdStatBlock("stat_block_skeleton")),
    ],
  });
  const act = spellSlotActForProcedure(
    state,
    guidingBoltSpellId,
    1,
    "spellAttackDamage",
  );
  const target = requireHoleFromList(act.initialHoles, "targetChoice");
  const targetFill = spellTargetFill(
    target,
    guidingBoltSpellId,
    input.casterId,
    monsterId,
  );
  const attackRoll = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill],
    }),
    "attackRoll",
  );

  expect(target).toMatchObject({
    choices: expect.arrayContaining([monsterId]),
  });
  expect(attackRoll).toMatchObject({
    attackBonus: input.expectedSpellAttackBonus,
    spell: {
      resource: { tag: "spellSlot", slotLevel: 1 },
      attackKind: "ranged_spell_attack",
      targeting: { kind: "singleCombatant" },
      rangeFeet: 120,
      damage: {
        kind: "fixedSpellAttackDamage",
        expr: { dice: 4, dieSize: 6 },
        damageType: "radiant",
      },
      postDamageRiders: [
        {
          kind: "nextAttackRollAgainstTarget",
          mode: "advantage",
          expiresAt: "endOfCasterNextTurn",
        },
      ],
    },
  });

  const attackFill = attackRollFill(attackRoll, {
    total: 13 + input.expectedSpellAttackBonus,
    naturalD20: 13,
  });
  const damage = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, attackFill],
    }),
    "rolledDice",
  );

  expect(damage).toMatchObject({
    label: "Guiding Bolt damage (4d6-radiant)",
    spell: {
      resource: { tag: "spellSlot", slotLevel: 1 },
      damage: {
        kind: "fixedSpellAttackDamage",
        expr: { dice: 4, dieSize: 6 },
        damageType: "radiant",
      },
      postDamageRiders: [
        {
          kind: "nextAttackRollAgainstTarget",
          mode: "advantage",
          expiresAt: "endOfCasterNextTurn",
        },
      ],
    },
    critical: false,
  });

  const guided = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        attackFill,
        damageRollFillWithGroups(damage, [[2, 2, 2, 2]]),
      ],
    }),
  );
  const caster = requireCharacterCombatant(guided.state, input.casterId);

  expect(requireCombatant(guided.state, monsterId)).toMatchObject({
    hp: Hp(5),
    activeEffects: [
      {
        kind: "nextAttackRollAgainstSelf",
        sourceSpellId: guidingBoltSpellId,
        sourceCombatantId: input.casterId,
        mode: "advantage",
        expiresAt: {
          kind: "endOfTurn",
          combatantId: input.casterId,
          round: 2,
        },
      },
    ],
  });
  expect(snapshotBattle(guided.state).turn.actionResources).toEqual([]);
  expect(caster.origin.spellcasting?.spellSlots).toEqual([
    { spellLevel: 1, count: 2, expended: 1 },
  ]);

  const allyTurn = requireResolved(
    endTurn({ state: guided.state, actorId: input.casterId }),
  ).state;
  const allyAttack = attackSubject(allyTurn, input.allyId, "Longsword");
  const allyTarget = requireHole(
    resolveBattleSubject({
      state: allyTurn,
      subject: allyAttack,
      fills: [],
    }),
    "targetChoice",
  );
  const allyTargetFill = attackTargetFill(
    allyTarget,
    input.allyId,
    monsterId,
    "Longsword",
  );
  const allyAttackRoll = requireHole(
    resolveBattleSubject({
      state: allyTurn,
      subject: allyAttack,
      fills: [allyTargetFill],
    }),
    "attackRoll",
  );

  expect(allyAttackRoll).toMatchObject({ rollMode: "advantage" });

  const consumed = requireResolved(
    resolveBattleSubject({
      state: allyTurn,
      subject: allyAttack,
      fills: [
        allyTargetFill,
        attackRollFill(allyAttackRoll, {
          total: 8,
          naturalD20: 4,
          rollMode: "advantage",
        }),
      ],
    }),
  );

  expect(requireCombatant(consumed.state, monsterId).activeEffects).toEqual([]);
}

function assertLevelOneChillTouch(input: {
  readonly battleIdText: string;
  readonly characterIdText: string;
  readonly build: CharacterBuild;
  readonly casterId: CombatantId;
  readonly expectedSpellAttackBonus: number;
  readonly expectedSpellSlots: readonly {
    readonly spellLevel: number;
    readonly count: number;
    readonly expended: number;
  }[];
}): void {
  const state = battleFromSheets({
    battleIdText: input.battleIdText,
    characters: [
      characterSheet({
        characterIdText: input.characterIdText,
        build: input.build,
        combatantId: input.casterId,
        initiative: 20,
        maximumHp: 8,
      }),
    ],
    monsters: [
      monsterBattleInput(
        monsterId,
        10,
        srdStatBlock("stat_block_goblin_warrior"),
      ),
    ],
  });
  const act = cantripCastActionSpellAct(
    state,
    input.casterId,
    chillTouchSpellId,
  );
  const target = requireHoleFromList(act.initialHoles, "targetChoice");
  const objectTarget = requireHoleFromList(
    act.initialHoles,
    "objectTargetChoice",
  );
  const targetFill = spellTargetFill(
    target,
    chillTouchSpellId,
    input.casterId,
    monsterId,
  );
  const attackRoll = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill],
    }),
    "attackRoll",
  );

  expect(target).toMatchObject({
    choices: expect.arrayContaining([monsterId]),
  });
  expect(objectTarget).toMatchObject({
    requiresTableSpatialFact: true,
  });
  expect(attackRoll).toMatchObject({
    attackBonus: input.expectedSpellAttackBonus,
    spell: {
      resource: { tag: "none" },
      attackKind: "melee_spell_attack",
      targeting: { kind: "singleCreatureOrObject" },
      rangeFeet: 5,
      damage: {
        kind: "fixedSpellAttackDamage",
        expr: { dice: 1, dieSize: 10 },
        damageType: "necrotic",
      },
      postDamageRiders: [
        {
          kind: "hitPointRegainPrevented",
          expiresAt: "endOfCasterNextTurn",
        },
      ],
    },
  });

  const attackFill = attackRollFill(attackRoll, {
    total: 13 + input.expectedSpellAttackBonus,
    naturalD20: 13,
  });
  const damage = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, attackFill],
    }),
    "rolledDice",
  );

  expect(damage).toMatchObject({
    label: "Chill Touch damage (1d10-necrotic)",
    spell: {
      resource: { tag: "none" },
      damage: {
        kind: "fixedSpellAttackDamage",
        expr: { dice: 1, dieSize: 10 },
        damageType: "necrotic",
      },
      postDamageRiders: [
        {
          kind: "hitPointRegainPrevented",
          expiresAt: "endOfCasterNextTurn",
        },
      ],
    },
    critical: false,
  });

  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: ordinaryAttackDamageFills({
        state,
        subject: act.subject,
        prefixFills: [targetFill, attackFill],
        damage,
        damageDice: [[6]],
      }),
    }),
  );
  const caster = requireCharacterCombatant(resolved.state, input.casterId);

  expect(requireCombatant(resolved.state, monsterId)).toMatchObject({
    hp: Hp(4),
    activeEffects: [
      {
        kind: "hitPointRegainPrevented",
        sourceSpellId: chillTouchSpellId,
        sourceCombatantId: input.casterId,
        expiresAt: {
          kind: "endOfTurn",
          combatantId: input.casterId,
          round: 2,
        },
      },
    ],
  });
  expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);
  expect(caster.origin.spellcasting?.spellSlots).toEqual(
    input.expectedSpellSlots,
  );
}

function assertLevelOneEldritchBlast(input: {
  readonly battleIdText: string;
  readonly characterIdText: string;
  readonly build: CharacterBuild;
  readonly casterId: CombatantId;
  readonly expectedSpellAttackBonus: number;
}): void {
  const state = battleFromSheets({
    battleIdText: input.battleIdText,
    characters: [
      characterSheet({
        characterIdText: input.characterIdText,
        build: input.build,
        combatantId: input.casterId,
        initiative: 20,
        maximumHp: 8,
      }),
    ],
    monsters: [
      monsterBattleInput(
        monsterId,
        10,
        srdStatBlock("stat_block_goblin_warrior"),
      ),
    ],
  });
  const act = cantripCastActionSpellAct(
    state,
    input.casterId,
    eldritchBlastSpellId,
    "spellAttackSequence",
  );
  const target = requireHoleFromList(act.initialHoles, "targetChoice");
  const objectTarget = requireHoleFromList(
    act.initialHoles,
    "objectTargetChoice",
  );
  const targetFill = spellTargetFill(
    target,
    eldritchBlastSpellId,
    input.casterId,
    monsterId,
  );
  const attackRoll = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill],
    }),
    "attackRoll",
  );

  expect(act.initialHoles).toHaveLength(2);
  expect(target).toMatchObject({
    label: "Eldritch Blast attack 1 target",
    choices: expect.arrayContaining([monsterId]),
  });
  expect(objectTarget).toMatchObject({
    label: "Eldritch Blast attack 1 object target",
    requiresTableSpatialFact: true,
  });
  expect(attackRoll).toMatchObject({
    label: "Eldritch Blast attack 1 spell attack roll",
    attackBonus: input.expectedSpellAttackBonus,
    spell: {
      resource: { tag: "none" },
      attackKind: "ranged_spell_attack",
      targeting: {
        kind: "spellAttackSequenceCreatureOrObject",
        countSource: "characterLevel",
        attackCount: 1,
      },
      rangeFeet: 120,
      damage: {
        expr: { dice: 1, dieSize: 10 },
        damageType: "force",
      },
    },
  });

  const attackFill = attackRollFill(attackRoll, {
    total: 13 + input.expectedSpellAttackBonus,
    naturalD20: 13,
  });
  const damage = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, attackFill],
    }),
    "rolledDice",
  );

  expect(damage).toMatchObject({
    label: "Eldritch Blast attack 1 damage (1d10-force)",
    spell: {
      resource: { tag: "none" },
      damage: {
        expr: { dice: 1, dieSize: 10 },
        damageType: "force",
      },
    },
    critical: false,
  });

  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, attackFill, damageRollFillWithGroups(damage, [[6]])],
    }),
  );
  const caster = requireCharacterCombatant(resolved.state, input.casterId);

  expect(requireCombatant(resolved.state, monsterId).hp).toBe(Hp(4));
  expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);
  expect(caster.origin.spellcasting?.spellSlots).toEqual([
    { spellLevel: 1, count: 1, expended: 0 },
  ]);
}

function assertLevelOneFireBolt(input: {
  readonly battleIdText: string;
  readonly characterIdText: string;
  readonly build: CharacterBuild;
  readonly casterId: CombatantId;
  readonly expectedSpellAttackBonus: number;
}): void {
  const state = battleFromSheets({
    battleIdText: input.battleIdText,
    characters: [
      characterSheet({
        characterIdText: input.characterIdText,
        build: input.build,
        combatantId: input.casterId,
        initiative: 20,
        maximumHp: 8,
      }),
    ],
    monsters: [
      monsterBattleInput(monsterId, 10, srdStatBlock("stat_block_skeleton")),
    ],
  });
  const act = cantripCastActionSpellAct(state, input.casterId, fireBoltSpellId);
  const target = requireHoleFromList(act.initialHoles, "targetChoice");
  const objectTarget = requireHoleFromList(
    act.initialHoles,
    "objectTargetChoice",
  );
  const targetFill = spellTargetFill(
    target,
    fireBoltSpellId,
    input.casterId,
    monsterId,
  );
  const attackRoll = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill],
    }),
    "attackRoll",
  );

  expect(target).toMatchObject({
    choices: expect.arrayContaining([monsterId]),
  });
  expect(objectTarget).toMatchObject({
    requiresTableSpatialFact: true,
  });
  expect(attackRoll).toMatchObject({
    attackBonus: input.expectedSpellAttackBonus,
    spell: {
      targeting: { kind: "singleCreatureOrObject" },
      attackKind: "ranged_spell_attack",
      rangeFeet: 120,
      objectHitEffect: { kind: "igniteFlammableUnattended" },
      damage: {
        expr: { dice: 1, dieSize: 10 },
        damageType: "fire",
      },
    },
  });

  const attackFill = attackRollFill(attackRoll, {
    total: 18,
    naturalD20: 13,
  });
  const damage = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, attackFill],
    }),
    "rolledDice",
  );
  expect(damage).toMatchObject({
    label: "Fire Bolt damage (1d10-fire)",
    spell: {
      damage: {
        expr: { dice: 1, dieSize: 10 },
        damageType: "fire",
      },
    },
    critical: false,
  });

  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: ordinaryAttackDamageFills({
        state,
        subject: act.subject,
        prefixFills: [targetFill, attackFill],
        damage,
        damageDice: [[7]],
      }),
    }),
  );
  const caster = requireCharacterCombatant(resolved.state, input.casterId);

  expect(requireCombatant(resolved.state, monsterId).hp).toBe(Hp(6));
  expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);
  expect(caster.origin.spellcasting?.spellSlots).toEqual([
    { spellLevel: 1, count: 2, expended: 0 },
  ]);
}

function assertLevelOneRayOfFrost(input: {
  readonly battleIdText: string;
  readonly characterIdText: string;
  readonly build: CharacterBuild;
  readonly casterId: CombatantId;
  readonly expectedSpellAttackBonus: number;
}): void {
  const state = battleFromSheets({
    battleIdText: input.battleIdText,
    characters: [
      characterSheet({
        characterIdText: input.characterIdText,
        build: input.build,
        combatantId: input.casterId,
        initiative: 20,
        maximumHp: 8,
      }),
    ],
    monsters: [
      monsterBattleInput(monsterId, 10, srdStatBlock("stat_block_skeleton")),
    ],
  });
  const act = cantripCastActionSpellAct(
    state,
    input.casterId,
    rayOfFrostSpellId,
  );
  const target = requireHoleFromList(act.initialHoles, "targetChoice");
  const attackRoll = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(target, rayOfFrostSpellId, input.casterId, monsterId),
      ],
    }),
    "attackRoll",
  );

  expect(attackRoll).toMatchObject({
    attackBonus: input.expectedSpellAttackBonus,
    spell: {
      attackKind: "ranged_spell_attack",
      targeting: { kind: "singleCombatant" },
      damage: { expr: { dice: 1, dieSize: 8 }, damageType: "cold" },
      rangeFeet: 60,
    },
  });

  const damage = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(target, rayOfFrostSpellId, input.casterId, monsterId),
        attackRollFill(attackRoll, { total: 14, naturalD20: 10 }),
      ],
    }),
    "rolledDice",
  );

  expect(damage).toMatchObject({
    label: "Ray of Frost damage (1d8-cold)",
    critical: false,
  });

  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(target, rayOfFrostSpellId, input.casterId, monsterId),
        attackRollFill(attackRoll, { total: 14, naturalD20: 10 }),
        damageRollFillWithGroups(damage, [[4]]),
      ],
    }),
  );
  const caster = requireCharacterCombatant(resolved.state, input.casterId);

  expect(requireCombatant(resolved.state, monsterId)).toMatchObject({
    hp: Hp(9),
    activeEffects: [
      {
        kind: "speedDelta",
        sourceSpellId: rayOfFrostSpellId,
        sourceCombatantId: input.casterId,
        deltaFeet: movementDeltaFeet(-10),
        expiresAt: {
          kind: "startOfTurn",
          combatantId: input.casterId,
        },
      },
    ],
  });
  expect(snapshotCombatant(resolved.state, monsterId).movement).toMatchObject({
    speedFeet: movementFeet(20),
    remainingFeet: movementFeet(20),
  });
  expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);
  expect(caster.origin.spellcasting?.spellSlots).toEqual([
    { spellLevel: 1, count: 2, expended: 0 },
  ]);

  const afterCasterTurn = requireResolved(
    endTurn({ state: resolved.state, actorId: input.casterId }),
  );
  expect(requireCombatant(afterCasterTurn.state, monsterId)).toMatchObject({
    activeEffects: [
      expect.objectContaining({
        kind: "speedDelta",
        sourceSpellId: rayOfFrostSpellId,
      }),
    ],
  });
  expect(
    snapshotCombatant(afterCasterTurn.state, monsterId).movement,
  ).toMatchObject({
    speedFeet: movementFeet(20),
    remainingFeet: movementFeet(20),
  });

  const afterSkeletonTurn = requireResolved(
    endTurn({ state: afterCasterTurn.state, actorId: monsterId }),
  );
  expect(
    afterSkeletonTurn.state.combatants.get(monsterId)?.activeEffects,
  ).toEqual([]);
  expect(
    snapshotCombatant(afterSkeletonTurn.state, monsterId).movement,
  ).toMatchObject({
    speedFeet: movementFeet(30),
    remainingFeet: movementFeet(30),
  });
}

function assertLevelOneShockingGrasp(input: {
  readonly battleIdText: string;
  readonly characterIdText: string;
  readonly build: CharacterBuild;
  readonly casterId: CombatantId;
  readonly expectedSpellAttackBonus: number;
}): void {
  const state = battleFromSheets({
    battleIdText: input.battleIdText,
    characters: [
      characterSheet({
        characterIdText: input.characterIdText,
        build: input.build,
        combatantId: input.casterId,
        initiative: 20,
        maximumHp: 8,
      }),
    ],
    monsters: [
      monsterBattleInput(
        secondMonsterId,
        15,
        srdStatBlock("stat_block_skeleton"),
      ),
      monsterBattleInput(monsterId, 10, srdStatBlock("stat_block_skeleton")),
    ],
  });
  const act = cantripCastActionSpellAct(
    state,
    input.casterId,
    shockingGraspSpellId,
  );
  const target = requireHoleFromList(act.initialHoles, "targetChoice");
  const attackRoll = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          target,
          shockingGraspSpellId,
          input.casterId,
          monsterId,
        ),
      ],
    }),
    "attackRoll",
  );

  expect(attackRoll).toMatchObject({
    attackBonus: input.expectedSpellAttackBonus,
    spell: {
      attackKind: "melee_spell_attack",
      targeting: { kind: "singleCombatant" },
      damage: { expr: { dice: 1, dieSize: 8 }, damageType: "lightning" },
      rangeFeet: 5,
    },
  });

  const damage = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          target,
          shockingGraspSpellId,
          input.casterId,
          monsterId,
        ),
        attackRollFill(attackRoll, { total: 14, naturalD20: 10 }),
      ],
    }),
    "rolledDice",
  );

  expect(damage).toMatchObject({
    label: "Shocking Grasp damage (1d8-lightning)",
    critical: false,
  });

  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          target,
          shockingGraspSpellId,
          input.casterId,
          monsterId,
        ),
        attackRollFill(attackRoll, { total: 14, naturalD20: 10 }),
        damageRollFillWithGroups(damage, [[4]]),
      ],
    }),
  );
  const caster = requireCharacterCombatant(resolved.state, input.casterId);

  expect(requireCombatant(resolved.state, monsterId)).toMatchObject({
    hp: Hp(9),
    activeEffects: [
      {
        kind: "opportunityAttackDenied",
        sourceSpellId: shockingGraspSpellId,
        sourceCombatantId: input.casterId,
        expiresAt: { kind: "startOfTurn", combatantId: monsterId },
      },
    ],
  });
  expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);
  expect(caster.origin.spellcasting?.spellSlots).toEqual([
    { spellLevel: 1, count: 2, expended: 0 },
  ]);

  const afterInterveningTurnStart = requireResolved(
    endTurn({ state: resolved.state, actorId: input.casterId }),
  );
  expect(
    afterInterveningTurnStart.state.combatants.get(monsterId)?.activeEffects,
  ).toEqual([
    expect.objectContaining({
      kind: "opportunityAttackDenied",
      sourceSpellId: shockingGraspSpellId,
    }),
  ]);

  const afterTargetTurnStart = requireResolved(
    endTurn({
      state: afterInterveningTurnStart.state,
      actorId: secondMonsterId,
    }),
  );
  expect(
    afterTargetTurnStart.state.combatants.get(monsterId)?.activeEffects,
  ).toEqual([]);
}

function assertLevelOneChromaticOrb(input: {
  readonly battleIdText: string;
  readonly characterIdText: string;
  readonly build: CharacterBuild;
  readonly casterId: CombatantId;
  readonly expectedSpellAttackBonus: number;
}): void {
  const state = battleFromSheets({
    battleIdText: input.battleIdText,
    characters: [
      characterSheet({
        characterIdText: input.characterIdText,
        build: input.build,
        combatantId: input.casterId,
        initiative: 20,
        maximumHp: 8,
      }),
    ],
    monsters: [
      monsterBattleInput(monsterId, 10, srdStatBlock("stat_block_skeleton")),
      monsterBattleInput(
        secondMonsterId,
        8,
        srdStatBlock("stat_block_skeleton"),
      ),
    ],
  });
  const act = spellSlotActForProcedure(
    state,
    chromaticOrbSpellId,
    1,
    "chainedSpellAttackDamage",
  );
  const damageType = requireHoleFromList(act.initialHoles, "damageTypeChoice");

  expect(damageType).toMatchObject({
    label: "Chromatic Orb damage type",
    choices: ["acid", "cold", "fire", "lightning", "poison", "thunder"],
    spell: {
      procedure: "chainedSpellAttackDamage",
      resource: { tag: "spellSlot", slotLevel: 1 },
      targeting: { kind: "singleCombatant" },
      attackKind: "ranged_spell_attack",
      attackBonus: input.expectedSpellAttackBonus,
      damage: { expr: { dice: 3, dieSize: 8 } },
      damageTypeChoices: [
        "acid",
        "cold",
        "fire",
        "lightning",
        "poison",
        "thunder",
      ],
      rangeFeet: 90,
      leapRangeFeet: 30,
    },
  });

  const damageTypeFill = damageTypeChoiceFill(damageType, "poison");
  const primaryTarget = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [damageTypeFill],
    }),
    "targetChoice",
  );
  const primaryTargetFill = spellTargetFill(
    primaryTarget,
    chromaticOrbSpellId,
    input.casterId,
    monsterId,
  );
  const primaryAttackRoll = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [damageTypeFill, primaryTargetFill],
    }),
    "attackRoll",
  );

  expect(primaryAttackRoll).toMatchObject({
    attackBonus: input.expectedSpellAttackBonus,
    spell: {
      attackKind: "ranged_spell_attack",
      damage: { expr: { dice: 3, dieSize: 8 } },
      damageTypeChoices: [
        "acid",
        "cold",
        "fire",
        "lightning",
        "poison",
        "thunder",
      ],
      rangeFeet: 90,
      leapRangeFeet: 30,
    },
  });

  const primaryAttackFill = attackRollFill(primaryAttackRoll, {
    total: 14,
    naturalD20: 10,
  });
  const primaryDamage = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [damageTypeFill, primaryTargetFill, primaryAttackFill],
    }),
    "rolledDice",
  );

  expect(primaryDamage).toMatchObject({
    label: "Chromatic Orb damage 1 (3d8-poison)",
    critical: false,
  });

  const primaryDamageFill = damageRollFillWithGroups(primaryDamage, [
    [4, 4, 1],
  ]);
  const leapTarget = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        damageTypeFill,
        primaryTargetFill,
        primaryAttackFill,
        primaryDamageFill,
      ],
    }),
    "targetChoice",
  );

  expect(leapTarget).toMatchObject({
    requiresTableSpatialFact: true,
    choices: expect.arrayContaining([secondMonsterId]),
  });
  expect(leapTarget.choices).not.toContain(monsterId);

  const leapTargetFill = spellLeapTargetFill(
    leapTarget,
    chromaticOrbSpellId,
    monsterId,
    secondMonsterId,
  );
  const leapAttackRoll = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        damageTypeFill,
        primaryTargetFill,
        primaryAttackFill,
        primaryDamageFill,
        leapTargetFill,
      ],
    }),
    "attackRoll",
  );
  const leapDamage = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        damageTypeFill,
        primaryTargetFill,
        primaryAttackFill,
        primaryDamageFill,
        leapTargetFill,
        attackRollFill(leapAttackRoll, { total: 14, naturalD20: 10 }),
      ],
    }),
    "rolledDice",
  );

  expect(leapDamage).toMatchObject({
    label: "Chromatic Orb damage 2 (3d8-poison)",
    critical: false,
  });

  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        damageTypeFill,
        primaryTargetFill,
        primaryAttackFill,
        primaryDamageFill,
        leapTargetFill,
        attackRollFill(leapAttackRoll, { total: 14, naturalD20: 10 }),
        damageRollFillWithGroups(leapDamage, [[2, 2, 2]]),
      ],
    }),
  );
  const caster = requireCharacterCombatant(resolved.state, input.casterId);

  expect(requireCombatant(resolved.state, monsterId).hp).toBe(Hp(13));
  expect(requireCombatant(resolved.state, secondMonsterId).hp).toBe(Hp(13));
  expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);
  expect(caster.origin.spellcasting?.spellSlots).toEqual([
    { spellLevel: 1, count: 2, expended: 1 },
  ]);
}

function assertLevelOneMageArmor(input: {
  readonly battleIdText: string;
  readonly characterIdText: string;
  readonly build: CharacterBuild;
  readonly casterId: CombatantId;
  readonly expectedArmorClass: number;
}): void {
  const state = battleFromSheets({
    battleIdText: input.battleIdText,
    characters: [
      characterSheet({
        characterIdText: input.characterIdText,
        build: input.build,
        combatantId: input.casterId,
        initiative: 20,
        maximumHp: 8,
      }),
    ],
    monsters: [
      monsterBattleInput(monsterId, 10, srdStatBlock("stat_block_skeleton")),
    ],
  });
  const act = spellSlotActForProcedure(
    state,
    mageArmorSpellId,
    1,
    "persistentArmorEffect",
  );
  const target = requireHoleFromList(act.initialHoles, "targetChoice");

  expect(target).toMatchObject({
    choices: [input.casterId],
  });

  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          target,
          mageArmorSpellId,
          input.casterId,
          input.casterId,
        ),
      ],
    }),
  );
  const caster = requireCharacterCombatant(resolved.state, input.casterId);

  expect(snapshotCombatant(resolved.state, input.casterId)).toMatchObject({
    armorClass: input.expectedArmorClass,
  });
  expect(caster.activeEffects).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: "spellBaseArmorClass",
        sourceSpellId: mageArmorSpellId,
        sourceCombatantId: input.casterId,
        base: 13,
        ability: "dex",
        expiresAt: {
          kind: "duration",
          durationTicks: mageArmorDurationTicks,
        },
        earlyEnds: [{ kind: "targetDonsArmor" }],
      }),
    ]),
  );
  expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);
  expect(caster.origin.spellcasting?.spellSlots).toEqual([
    { spellLevel: 1, count: 2, expended: 1 },
  ]);
}

function assertLevelOneFalseLife(input: {
  readonly battleIdText: string;
  readonly characterIdText: string;
  readonly build: CharacterBuild;
  readonly casterId: CombatantId;
}): void {
  const state = battleFromSheets({
    battleIdText: input.battleIdText,
    characters: [
      characterSheet({
        characterIdText: input.characterIdText,
        build: input.build,
        combatantId: input.casterId,
        initiative: 20,
        maximumHp: 8,
      }),
    ],
    monsters: [
      monsterBattleInput(monsterId, 10, srdStatBlock("stat_block_skeleton")),
    ],
  });
  const act = spellSlotActForProcedure(
    state,
    falseLifeSpellId,
    1,
    "scalarBuff",
  );
  const temporaryHitPoints = requireHoleFromList(
    act.initialHoles,
    "rolledDice",
  );

  expect(temporaryHitPoints).toMatchObject({
    label: "False Life Temporary Hit Points (2d4+4)",
    spell: {
      procedure: "scalarBuff",
      targeting: { kind: "self" },
      effect: {
        kind: "temporaryHitPoints",
        amount: { expr: { dice: 2, dieSize: 4, flat: 4 } },
      },
    },
  });

  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [damageRollFillWithGroups(temporaryHitPoints, [[4, 3]])],
    }),
  );
  const caster = requireCharacterCombatant(resolved.state, input.casterId);

  expect(snapshotCombatant(resolved.state, input.casterId)).toMatchObject({
    tempHp: 11,
  });
  expect(caster.activeEffects).toEqual([]);
  expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);
  expect(caster.origin.spellcasting?.spellSlots).toEqual([
    { spellLevel: 1, count: 2, expended: 1 },
  ]);
}

function assertLevelOneRayOfSickness(input: {
  readonly battleIdText: string;
  readonly characterIdText: string;
  readonly build: CharacterBuild;
  readonly casterId: CombatantId;
  readonly expectedSpellAttackBonus: number;
}): void {
  const state = battleFromSheets({
    battleIdText: input.battleIdText,
    characters: [
      characterSheet({
        characterIdText: input.characterIdText,
        build: input.build,
        combatantId: input.casterId,
        initiative: 20,
        maximumHp: 8,
      }),
    ],
    monsters: [
      monsterBattleInput(
        monsterId,
        10,
        srdStatBlock("stat_block_goblin_warrior"),
      ),
    ],
  });
  const act = spellSlotActForProcedure(
    state,
    rayOfSicknessSpellId,
    1,
    "spellAttackDamage",
  );
  const target = requireHoleFromList(act.initialHoles, "targetChoice");

  expect(target).toMatchObject({
    choices: expect.arrayContaining([monsterId]),
    requiresTableSpatialFact: true,
  });

  const targetFill = spellTargetFill(
    target,
    rayOfSicknessSpellId,
    input.casterId,
    monsterId,
  );
  const attackRoll = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill],
    }),
    "attackRoll",
  );

  expect(attackRoll).toMatchObject({
    attackBonus: input.expectedSpellAttackBonus,
    spell: {
      procedure: "spellAttackDamage",
      spell: {
        id: rayOfSicknessSpellId,
        mechanics: { duration: { kind: "instantaneous" } },
      },
      attackKind: "ranged_spell_attack",
      targeting: { kind: "singleCombatant" },
      rangeFeet: 60,
      damage: {
        kind: "fixedSpellAttackDamage",
        expr: { dice: 2, dieSize: 8 },
        damageType: "poison",
      },
      postDamageRiders: [
        {
          kind: "condition",
          condition: "poisoned",
          expiresAt: "endOfCasterNextTurn",
        },
      ],
    },
  });

  const attackFill = attackRollFill(attackRoll, {
    total: 17,
    naturalD20: 13,
  });
  const damage = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, attackFill],
    }),
    "rolledDice",
  );

  expect(damage).toMatchObject({
    label: "Ray of Sickness damage (2d8-poison)",
    critical: false,
  });

  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        attackFill,
        damageRollFillWithGroups(damage, [[1, 1]]),
      ],
    }),
  );
  const caster = requireCharacterCombatant(resolved.state, input.casterId);
  const poisonedTarget = requireCombatant(resolved.state, monsterId);

  expect(poisonedTarget.hp).toBe(Hp(8));
  expect(hasCondition(poisonedTarget.conditions, "poisoned")).toBe(true);
  expect(poisonedTarget.activeEffects).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: "spellCondition",
        sourceSpellId: rayOfSicknessSpellId,
        sourceCombatantId: input.casterId,
        condition: "poisoned",
        escape: null,
        turnStartDamage: null,
        expiresAt: expect.objectContaining({
          kind: "endOfTurn",
          combatantId: input.casterId,
        }),
      }),
    ]),
  );
  expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);
  expect(caster.origin.spellcasting?.spellSlots).toEqual([
    { spellLevel: 1, count: 2, expended: 1 },
  ]);

  const afterCasterTurn = requireResolved(
    endTurn({ state: resolved.state, actorId: input.casterId }),
  ).state;
  expect(
    hasCondition(
      requireCombatant(afterCasterTurn, monsterId).conditions,
      "poisoned",
    ),
  ).toBe(true);

  const afterGoblinTurn = requireResolved(
    endTurn({ state: afterCasterTurn, actorId: monsterId }),
  ).state;
  expect(
    hasCondition(
      requireCombatant(afterGoblinTurn, monsterId).conditions,
      "poisoned",
    ),
  ).toBe(true);

  const afterNextCasterTurn = requireResolved(
    endTurn({ state: afterGoblinTurn, actorId: input.casterId }),
  ).state;
  expect(
    hasCondition(
      requireCombatant(afterNextCasterTurn, monsterId).conditions,
      "poisoned",
    ),
  ).toBe(false);
  expect(
    requireCombatant(afterNextCasterTurn, monsterId).activeEffects,
  ).not.toContainEqual(
    expect.objectContaining({
      kind: "spellCondition",
      sourceSpellId: rayOfSicknessSpellId,
      condition: "poisoned",
    }),
  );
}

function assertLevelOneMagicMissile(input: {
  readonly battleIdText: string;
  readonly characterIdText: string;
  readonly build: CharacterBuild;
  readonly casterId: CombatantId;
}): void {
  const state = battleFromSheets({
    battleIdText: input.battleIdText,
    characters: [
      characterSheet({
        characterIdText: input.characterIdText,
        build: input.build,
        combatantId: input.casterId,
        initiative: 20,
        maximumHp: 8,
      }),
    ],
    monsters: [
      monsterBattleInput(monsterId, 10, srdStatBlock("stat_block_skeleton")),
      monsterBattleInput(
        secondMonsterId,
        8,
        srdStatBlock("stat_block_skeleton"),
      ),
    ],
  });
  const act = spellSlotActForProcedure(
    state,
    magicMissileSpellId,
    1,
    "repeatedDamageAllocation",
  );
  expect(requireCombatant(state, monsterId).hp).toBe(Hp(13));
  expect(requireCombatant(state, secondMonsterId).hp).toBe(Hp(13));
  const allocation = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [],
    }),
    "spellTargetAllocation",
  );

  expect(allocation).toMatchObject({
    label: "Magic Missile target allocation",
    allocationCount: 3,
    choices: expect.arrayContaining([monsterId, secondMonsterId]),
    requiresTableSpatialFact: true,
    spell: {
      spell: {
        id: magicMissileSpellId,
        mechanics: {
          range: { kind: "point", feet: 120 },
          phases: [
            expect.objectContaining({
              effects: [
                expect.objectContaining({
                  kind: "damage",
                  damageType: "force",
                  amount: {
                    expr: { dice: 1, dieSize: 4, flat: 1 },
                    kind: "fixed",
                  },
                }),
              ],
            }),
          ],
        },
      },
    },
  });

  const allocationFill = spellTargetAllocationFill(
    allocation,
    [
      { targetId: monsterId, count: 2 },
      { targetId: secondMonsterId, count: 1 },
    ],
    input.casterId,
  );
  const damage = requireHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [allocationFill],
    }),
    "rolledDice",
  );
  expect(damage).toMatchObject({
    label: "Magic Missile damage (3d4+3-force)",
    critical: false,
  });

  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [allocationFill, damageRollFillWithGroups(damage, [[2, 3], [4]])],
    }),
  );
  const caster = requireCharacterCombatant(resolved.state, input.casterId);

  expect(requireCombatant(resolved.state, monsterId).hp).toBe(Hp(6));
  expect(requireCombatant(resolved.state, secondMonsterId).hp).toBe(Hp(8));
  expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);
  expect(caster.origin.spellcasting?.spellSlots).toEqual([
    { spellLevel: 1, count: 2, expended: 1 },
  ]);
}

type UnitFeatureSubject = Extract<
  BattleSubject,
  { readonly tag: "unitFeature" }
>;
type UnitFeatureAct = AvailableBattleAct & {
  readonly subject: UnitFeatureSubject;
};
type ActionSpellSubject = Extract<
  BattleSubject,
  { readonly tag: "actionSpell" }
>;
type CastActionSpellSubject = ActionSpellSubject & {
  readonly mode: { readonly tag: "cast" };
};
type CastActionSpellAct = AvailableBattleAct & {
  readonly subject: CastActionSpellSubject;
};
type BonusActionSpellSubject = Extract<
  BattleSubject,
  { readonly tag: "bonusActionSpell" }
>;
type CastBonusActionSpellSubject = BonusActionSpellSubject & {
  readonly mode: { readonly tag: "cast" };
};
type CastBonusActionSpellAct = AvailableBattleAct & {
  readonly subject: CastBonusActionSpellSubject;
};
type MartialArtsBonusUnarmedStrikeSubject = Extract<
  BattleSubject,
  {
    readonly tag: "bonusAction";
    readonly action: "martialArtsUnarmedStrike";
  }
>;
type MartialArtsBonusUnarmedStrikeAct = AvailableBattleAct & {
  readonly subject: MartialArtsBonusUnarmedStrikeSubject;
};
type OrdinaryAttackDamageSubject =
  | Extract<
      BattleSubject,
      { readonly tag: "action"; readonly action: "attack" }
    >
  | MartialArtsBonusUnarmedStrikeSubject;

function levelOneSingleClassBuild(input: {
  readonly classUnitId: UnitRecord["id"];
  readonly weaponUnitId?: UnitRecord["id"];
  readonly abilityScores?: Parameters<typeof abilityScoreAssignment>[0];
  readonly spellcasting?: CharacterBuild["spellcasting"];
}): CharacterBuild {
  const equipment = levelOneEquipment(input.weaponUnitId);
  return {
    progression: {
      startingClass: classUnitId(input.classUnitId),
      advancements: [],
    },
    background: "background_soldier",
    species: "species_orc",
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: requireRight(
      abilityScoreAssignment(
        input.abilityScores ?? {
          str: 16,
          dex: 14,
          con: 14,
          int: 10,
          wis: 10,
          cha: 10,
        },
      ),
    ),
    proficiencyChoices: [],
    features: [],
    ...(input.spellcasting === undefined
      ? {}
      : { spellcasting: input.spellcasting }),
    equipment,
  };
}

function levelOneEquipment(
  weaponUnitId: UnitRecord["id"] | undefined,
): CharacterBuild["equipment"] {
  if (weaponUnitId === undefined) return { owned: [], loadout: {} };
  const weaponItemId = characterEquipmentItemId({
    slot: "main",
    unitId: requireRight(characterEquipmentItemUnitId(weaponUnitId)),
  });
  return {
    owned: [{ itemId: weaponItemId, unitId: weaponUnitId }],
    loadout: { weapon: { itemId: weaponItemId, grip: "one_handed" } },
  };
}

function levelOneSorcererBurningHandsBuild(): CharacterBuild {
  return levelOneSingleClassBuild({
    classUnitId: "class_sorcerer",
    abilityScores: {
      str: 8,
      dex: 14,
      con: 14,
      int: 10,
      wis: 10,
      cha: 16,
    },
    spellcasting: {
      sources: [
        {
          sourceUnitId: "class_sorcerer",
          spellcastingAbility: "cha",
          cantrips: [
            "fire_bolt",
            "light",
            shockingGraspSpellId,
            sorcerousBurstSpellId,
          ],
          spellbook: [],
          preparedSpells: [burningHandsSpellId, "detect_magic"],
          spellcastingFocuses: ["arcane_focus"],
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: [{ spellLevel: 1, count: 2 }],
        },
      },
    },
  });
}

function finalizedLevelOneBardDissonantWhispersBuild(): CharacterBuild {
  return finalizedLevelOneBardBuild({
    draftIdText: "draft:l1-sdk-bard-dissonant-whispers",
    expectedBuildLabel: "Bard Dissonant Whispers",
    cantrips: ["dancing_lights", viciousMockerySpellId],
    preparedSpells: [
      "charm_person",
      "color_spray",
      dissonantWhispersSpellId,
      healingWordSpellId,
    ],
  });
}

function finalizedLevelOneBardViciousMockeryBuild(): CharacterBuild {
  return finalizedLevelOneBardBuild({
    draftIdText: "draft:l1-sdk-bard-vicious-mockery",
    expectedBuildLabel: "Bard Vicious Mockery",
    cantrips: ["dancing_lights", viciousMockerySpellId],
    preparedSpells: [
      "charm_person",
      "color_spray",
      healingWordSpellId,
      thunderwaveSpellId,
    ],
  });
}

function finalizedLevelOneBardHealingWordBuild(): CharacterBuild {
  return finalizedLevelOneBardBuild({
    draftIdText: "draft:l1-sdk-bard-healing-word",
    expectedBuildLabel: "Bard Healing Word",
    cantrips: ["dancing_lights", viciousMockerySpellId],
    preparedSpells: [
      "charm_person",
      "color_spray",
      dissonantWhispersSpellId,
      healingWordSpellId,
    ],
  });
}

function finalizedLevelOneBardBuild(input: {
  readonly draftIdText: string;
  readonly expectedBuildLabel: string;
  readonly cantrips: readonly string[];
  readonly preparedSpells: readonly string[];
}): CharacterBuild {
  const draft = createCharacterDraft({
    unitLibrary,
    draftId: characterDraftId(input.draftIdText),
  });
  const afterInitial = requireAcceptedCreationBatch(
    fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        creationChoiceFill(
          "cc:draft:draft.progression.initial",
          "10:class_bard:level_1:maximum_hit_die",
        ),
        creationChoiceFill("cc:draft:draft.background", "background_criminal"),
        creationChoiceFill("cc:draft:draft.species", "species_orc"),
        {
          kind: "abilityScores",
          holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
          method: "standardArray",
          value: requireRight(
            abilityScoreAssignment({
              str: 8,
              dex: 14,
              con: 13,
              int: 10,
              wis: 12,
              cha: 15,
            }),
          ),
        },
        creationChoiceFill("cc:draft:draft.languages", "Dwarvish", "Goblin"),
        creationChoiceFill("cc:draft:draft.alignment", "lawful_good"),
      ],
    }),
  );
  const afterChoices = requireAcceptedCreationBatch(
    fillCreationHoles({
      draft: afterInitial,
      unitLibrary,
      expectedRevision: afterInitial.revision,
      fills: [
        creationChoiceFill(
          testUnitChoiceHoleId("class_bard", "class_skill_proficiency_choice"),
          "arcana",
          "performance",
          "persuasion",
        ),
        creationChoiceFill(
          testUnitChoiceHoleId("class_bard", "class_tool_proficiency_choice"),
          "tool:tool_drum",
          "tool:tool_flute",
          "tool:tool_lute",
        ),
        creationChoiceFill(
          testUnitChoiceHoleId("class_bard", "class_cantrip_choices"),
          ...input.cantrips,
        ),
        creationChoiceFill(
          testUnitChoiceHoleId("class_bard", "class_prepared_spell_choices"),
          ...input.preparedSpells,
        ),
        creationChoiceFill(
          testUnitChoiceHoleId(
            "background_criminal",
            "background_ability_score_increase",
          ),
          "two_and_one:dex:con",
        ),
        creationChoiceFill(
          testUnitChoiceHoleId("background_criminal", "background_tool_choice"),
          "thieves_tools",
        ),
        creationChoiceFill(
          testUnitChoiceHoleId("class_bard", "class_equipment_choice"),
          "option_b",
        ),
        creationChoiceFill(
          testUnitChoiceHoleId(
            "background_criminal",
            "background_equipment_choice",
          ),
          "option_b",
        ),
      ],
    }),
  );
  const afterPurchase = requireAcceptedCreationBatch(
    fillCreationHoles({
      draft: afterChoices,
      unitLibrary,
      expectedRevision: afterChoices.revision,
      fills: [
        creationChoiceFill(
          testUnitChoiceHoleId("class_bard", "equipment_purchase"),
          "weapon_dagger",
        ),
      ],
    }),
  );
  const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });
  if (result.tag !== "ready") {
    throw new Error(
      `Expected finalized ${input.expectedBuildLabel} build, received ${creationFinalizationResultSummary(result)}`,
    );
  }
  return result.build;
}

function finalizedLevelOneClericSacredFlameBuild(): CharacterBuild {
  return finalizedLevelOneClericBuild({
    draftIdText: "draft:l1-sdk-cleric-sacred-flame",
    expectedBuildLabel: "Cleric Sacred Flame",
    cantrips: ["guidance", sacredFlameSpellId, thaumaturgySpellId],
    preparedSpells: ["bless", "cure_wounds", "guiding_bolt", "shield_of_faith"],
  });
}

function finalizedLevelOneClericThaumaturgyBuild(): CharacterBuild {
  return finalizedLevelOneClericBuild({
    draftIdText: "draft:l1-sdk-cleric-thaumaturgy",
    expectedBuildLabel: "Cleric Thaumaturgy",
    cantrips: ["guidance", sacredFlameSpellId, thaumaturgySpellId],
    preparedSpells: ["bless", "cure_wounds", "guiding_bolt", "shield_of_faith"],
  });
}

function finalizedLevelOneClericGuidingBoltBuild(): CharacterBuild {
  return finalizedLevelOneClericBuild({
    draftIdText: "draft:l1-sdk-cleric-guiding-bolt",
    expectedBuildLabel: "Cleric Guiding Bolt",
    cantrips: ["guidance", sacredFlameSpellId, thaumaturgySpellId],
    preparedSpells: [
      "bless",
      "cure_wounds",
      guidingBoltSpellId,
      "shield_of_faith",
    ],
  });
}

function finalizedLevelOneClericInflictWoundsBuild(): CharacterBuild {
  return finalizedLevelOneClericBuild({
    draftIdText: "draft:l1-sdk-cleric-inflict-wounds",
    expectedBuildLabel: "Cleric Inflict Wounds",
    cantrips: ["guidance", sacredFlameSpellId, thaumaturgySpellId],
    preparedSpells: [
      "bless",
      "cure_wounds",
      "guiding_bolt",
      inflictWoundsSpellId,
    ],
  });
}

function finalizedLevelOneClericSanctuaryBuild(): CharacterBuild {
  return finalizedLevelOneClericBuild({
    draftIdText: "draft:l1-sdk-cleric-sanctuary",
    expectedBuildLabel: "Cleric Sanctuary",
    cantrips: ["guidance", sacredFlameSpellId, thaumaturgySpellId],
    preparedSpells: [
      "bless",
      "cure_wounds",
      guidingBoltSpellId,
      sanctuarySpellId,
    ],
  });
}

function finalizedLevelOneClericHealingWordBuild(): CharacterBuild {
  return finalizedLevelOneClericBuild({
    draftIdText: "draft:l1-sdk-cleric-healing-word",
    expectedBuildLabel: "Cleric Healing Word",
    cantrips: ["guidance", sacredFlameSpellId, thaumaturgySpellId],
    preparedSpells: [
      "bless",
      "cure_wounds",
      healingWordSpellId,
      "shield_of_faith",
    ],
  });
}

function finalizedLevelOneClericBuild(input: {
  readonly draftIdText: string;
  readonly expectedBuildLabel: string;
  readonly cantrips: readonly string[];
  readonly preparedSpells: readonly string[];
}): CharacterBuild {
  const draft = createCharacterDraft({
    unitLibrary,
    draftId: characterDraftId(input.draftIdText),
  });
  const afterInitial = requireAcceptedCreationBatch(
    fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        creationChoiceFill(
          "cc:draft:draft.progression.initial",
          "12:class_cleric:level_1:maximum_hit_die",
        ),
        creationChoiceFill("cc:draft:draft.background", "background_criminal"),
        creationChoiceFill("cc:draft:draft.species", "species_orc"),
        {
          kind: "abilityScores",
          holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
          method: "standardArray",
          value: requireRight(
            abilityScoreAssignment({
              str: 8,
              dex: 13,
              con: 14,
              int: 10,
              wis: 15,
              cha: 12,
            }),
          ),
        },
        creationChoiceFill("cc:draft:draft.languages", "Dwarvish", "Goblin"),
        creationChoiceFill("cc:draft:draft.alignment", "lawful_good"),
      ],
    }),
  );
  const afterChoices = requireAcceptedCreationBatch(
    fillCreationHoles({
      draft: afterInitial,
      unitLibrary,
      expectedRevision: afterInitial.revision,
      fills: [
        creationChoiceFill(
          testUnitChoiceHoleId(
            "class_cleric",
            "class_skill_proficiency_choice",
          ),
          "insight",
          "religion",
        ),
        creationChoiceFill(
          testUnitChoiceHoleId("class_cleric", "class_cantrip_choices"),
          ...input.cantrips,
        ),
        creationChoiceFill(
          testUnitChoiceHoleId("class_cleric", "class_prepared_spell_choices"),
          ...input.preparedSpells,
        ),
        creationChoiceFill(
          testUnitChoiceHoleId("cleric_divine_order", "divine_order"),
          "protector",
        ),
        creationChoiceFill(
          testUnitChoiceHoleId(
            "background_criminal",
            "background_ability_score_increase",
          ),
          "two_and_one:dex:con",
        ),
        creationChoiceFill(
          testUnitChoiceHoleId("background_criminal", "background_tool_choice"),
          "thieves_tools",
        ),
        creationChoiceFill(
          testUnitChoiceHoleId("class_cleric", "class_equipment_choice"),
          "option_b",
        ),
        creationChoiceFill(
          testUnitChoiceHoleId(
            "background_criminal",
            "background_equipment_choice",
          ),
          "option_b",
        ),
      ],
    }),
  );
  const afterPurchase = requireAcceptedCreationBatch(
    fillCreationHoles({
      draft: afterChoices,
      unitLibrary,
      expectedRevision: afterChoices.revision,
      fills: [
        creationChoiceFill(
          testUnitChoiceHoleId("class_cleric", "equipment_purchase"),
          "weapon_dagger",
        ),
      ],
    }),
  );
  const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });
  if (result.tag !== "ready") {
    throw new Error(
      `Expected finalized ${input.expectedBuildLabel} build, received ${creationFinalizationResultSummary(result)}`,
    );
  }
  return result.build;
}

function finalizedLevelOneDruidPoisonSprayBuild(): CharacterBuild {
  return finalizedLevelOneDruidBuild({
    draftIdText: "draft:l1-sdk-druid-poison-spray",
    expectedBuildLabel: "Druid Poison Spray",
    cantrips: [poisonSpraySpellId, "produce_flame"],
    preparedSpells: [
      "animal_friendship",
      "cure_wounds",
      "entangle",
      "faerie_fire",
    ],
  });
}

function finalizedLevelOneDruidProduceFlameBuild(): CharacterBuild {
  return finalizedLevelOneDruidBuild({
    draftIdText: "draft:l1-sdk-druid-produce-flame",
    expectedBuildLabel: "Druid Produce Flame",
    cantrips: [produceFlameSpellId, poisonSpraySpellId],
    preparedSpells: [
      "animal_friendship",
      "cure_wounds",
      "entangle",
      "faerie_fire",
    ],
  });
}

function finalizedLevelOneDruidShillelaghBuild(): CharacterBuild {
  return finalizedLevelOneDruidBuild({
    draftIdText: "draft:l1-sdk-druid-shillelagh",
    expectedBuildLabel: "Druid Shillelagh",
    cantrips: [produceFlameSpellId, shillelaghSpellId],
    preparedSpells: [
      "animal_friendship",
      "cure_wounds",
      "entangle",
      "faerie_fire",
    ],
    weaponPurchase: {
      unitId: "weapon_quarterstaff",
      loadout: "wielded_one_handed",
    },
  });
}

function finalizedLevelOneDruidHealingWordBuild(): CharacterBuild {
  return finalizedLevelOneDruidBuild({
    draftIdText: "draft:l1-sdk-druid-healing-word",
    expectedBuildLabel: "Druid Healing Word",
    cantrips: [produceFlameSpellId, poisonSpraySpellId],
    preparedSpells: [
      "animal_friendship",
      "cure_wounds",
      healingWordSpellId,
      "faerie_fire",
    ],
  });
}

type LevelOneDruidWeaponPurchase = {
  readonly unitId: UnitRecord["id"];
  readonly loadout: "not_wielded" | "wielded_one_handed";
};

function finalizedLevelOneDruidBuild(input: {
  readonly draftIdText: string;
  readonly expectedBuildLabel: string;
  readonly cantrips: readonly string[];
  readonly preparedSpells: readonly string[];
  readonly weaponPurchase?: LevelOneDruidWeaponPurchase;
}): CharacterBuild {
  const draft = createCharacterDraft({
    unitLibrary,
    draftId: characterDraftId(input.draftIdText),
  });
  const afterInitial = requireAcceptedCreationBatch(
    fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        creationChoiceFill(
          "cc:draft:draft.progression.initial",
          "11:class_druid:level_1:maximum_hit_die",
        ),
        creationChoiceFill("cc:draft:draft.background", "background_criminal"),
        creationChoiceFill("cc:draft:draft.species", "species_orc"),
        {
          kind: "abilityScores",
          holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
          method: "standardArray",
          value: requireRight(
            abilityScoreAssignment({
              str: 8,
              dex: 13,
              con: 14,
              int: 10,
              wis: 15,
              cha: 12,
            }),
          ),
        },
        creationChoiceFill("cc:draft:draft.languages", "Dwarvish", "Goblin"),
        creationChoiceFill("cc:draft:draft.alignment", "lawful_good"),
      ],
    }),
  );
  const afterChoices = requireAcceptedCreationBatch(
    fillCreationHoles({
      draft: afterInitial,
      unitLibrary,
      expectedRevision: afterInitial.revision,
      fills: [
        creationChoiceFill(
          testUnitChoiceHoleId("class_druid", "class_skill_proficiency_choice"),
          "nature",
          "perception",
        ),
        creationChoiceFill(
          testUnitChoiceHoleId("class_druid", "class_cantrip_choices"),
          ...input.cantrips,
        ),
        creationChoiceFill(
          testUnitChoiceHoleId("class_druid", "class_prepared_spell_choices"),
          ...input.preparedSpells,
        ),
        creationChoiceFill(
          testUnitChoiceHoleId("druid_primal_order", "primal_order"),
          "warden",
        ),
        creationChoiceFill(
          testUnitChoiceHoleId(
            "background_criminal",
            "background_ability_score_increase",
          ),
          "two_and_one:dex:con",
        ),
        creationChoiceFill(
          testUnitChoiceHoleId("background_criminal", "background_tool_choice"),
          "thieves_tools",
        ),
        creationChoiceFill(
          testUnitChoiceHoleId("class_druid", "class_equipment_choice"),
          "option_b",
        ),
        creationChoiceFill(
          testUnitChoiceHoleId(
            "background_criminal",
            "background_equipment_choice",
          ),
          "option_b",
        ),
      ],
    }),
  );
  const afterPurchase = requireAcceptedCreationBatch(
    fillCreationHoles({
      draft: afterChoices,
      unitLibrary,
      expectedRevision: afterChoices.revision,
      fills: [
        creationChoiceFill(
          testUnitChoiceHoleId("class_druid", "equipment_purchase"),
          (input.weaponPurchase ?? defaultDruidWeaponPurchase).unitId,
        ),
      ],
    }),
  );
  const weaponPurchase = input.weaponPurchase ?? defaultDruidWeaponPurchase;
  const afterLoadout =
    weaponPurchase.loadout === "not_wielded"
      ? afterPurchase
      : requireAcceptedCreationBatch(
          fillCreationHoles({
            draft: afterPurchase,
            unitLibrary,
            expectedRevision: afterPurchase.revision,
            fills: [
              creationChoiceFill(
                testLoadoutHoleId(weaponPurchase.unitId, "weapon"),
                weaponPurchase.loadout,
              ),
            ],
          }),
        );
  const result = finalizeCharacterDraft({ draft: afterLoadout, unitLibrary });
  if (result.tag !== "ready") {
    throw new Error(
      `Expected finalized ${input.expectedBuildLabel} build, received ${creationFinalizationResultSummary(result)}`,
    );
  }
  return result.build;
}

const defaultDruidWeaponPurchase = {
  unitId: "weapon_dagger",
  loadout: "not_wielded",
} as const satisfies LevelOneDruidWeaponPurchase;

function finalizedLevelOneSorcererFireBoltBuild(): CharacterBuild {
  return finalizedLevelOneSorcererBuild({
    draftIdText: "draft:l1-sdk-sorcerer-fire-bolt",
    expectedBuildLabel: "Sorcerer Fire Bolt",
    cantrips: [
      fireBoltSpellId,
      "light",
      shockingGraspSpellId,
      sorcerousBurstSpellId,
    ],
    preparedSpells: [burningHandsSpellId, "detect_magic"],
  });
}

function finalizedLevelOneSorcererSorcerousBurstBuild(): CharacterBuild {
  return finalizedLevelOneSorcererBuild({
    draftIdText: "draft:l1-sdk-sorcerer-sorcerous-burst",
    expectedBuildLabel: "Sorcerer Sorcerous Burst",
    cantrips: [
      sorcerousBurstSpellId,
      fireBoltSpellId,
      "light",
      shockingGraspSpellId,
    ],
    preparedSpells: [burningHandsSpellId, "detect_magic"],
  });
}

function finalizedLevelOneSorcererAcidSplashBuild(): CharacterBuild {
  return finalizedLevelOneSorcererBuild({
    draftIdText: "draft:l1-sdk-sorcerer-acid-splash",
    expectedBuildLabel: "Sorcerer Acid Splash",
    cantrips: [
      acidSplashSpellId,
      fireBoltSpellId,
      "light",
      sorcerousBurstSpellId,
    ],
    preparedSpells: [burningHandsSpellId, "detect_magic"],
  });
}

function finalizedLevelOneSorcererPoisonSprayBuild(): CharacterBuild {
  return finalizedLevelOneSorcererBuild({
    draftIdText: "draft:l1-sdk-sorcerer-poison-spray",
    expectedBuildLabel: "Sorcerer Poison Spray",
    cantrips: [
      poisonSpraySpellId,
      fireBoltSpellId,
      shockingGraspSpellId,
      sorcerousBurstSpellId,
    ],
    preparedSpells: [burningHandsSpellId, "detect_magic"],
  });
}

function finalizedLevelOneSorcererChillTouchBuild(): CharacterBuild {
  return finalizedLevelOneSorcererBuild({
    draftIdText: "draft:l1-sdk-sorcerer-chill-touch",
    expectedBuildLabel: "Sorcerer Chill Touch",
    cantrips: [
      chillTouchSpellId,
      fireBoltSpellId,
      shockingGraspSpellId,
      sorcerousBurstSpellId,
    ],
    preparedSpells: [burningHandsSpellId, "detect_magic"],
  });
}

function finalizedLevelOneSorcererRayOfFrostBuild(): CharacterBuild {
  return finalizedLevelOneSorcererBuild({
    draftIdText: "draft:l1-sdk-sorcerer-ray-of-frost",
    expectedBuildLabel: "Sorcerer Ray of Frost",
    cantrips: [
      fireBoltSpellId,
      "light",
      rayOfFrostSpellId,
      sorcerousBurstSpellId,
    ],
    preparedSpells: [burningHandsSpellId, "detect_magic"],
  });
}

function finalizedLevelOneSorcererShockingGraspBuild(): CharacterBuild {
  return finalizedLevelOneSorcererBuild({
    draftIdText: "draft:l1-sdk-sorcerer-shocking-grasp",
    expectedBuildLabel: "Sorcerer Shocking Grasp",
    cantrips: [
      fireBoltSpellId,
      "light",
      shockingGraspSpellId,
      sorcerousBurstSpellId,
    ],
    preparedSpells: [burningHandsSpellId, "detect_magic"],
  });
}

function finalizedLevelOneSorcererChromaticOrbBuild(): CharacterBuild {
  return finalizedLevelOneSorcererBuild({
    draftIdText: "draft:l1-sdk-sorcerer-chromatic-orb",
    expectedBuildLabel: "Sorcerer Chromatic Orb",
    cantrips: [
      fireBoltSpellId,
      "light",
      shockingGraspSpellId,
      sorcerousBurstSpellId,
    ],
    preparedSpells: [chromaticOrbSpellId, burningHandsSpellId],
  });
}

function finalizedLevelOneSorcererMageArmorBuild(): CharacterBuild {
  return finalizedLevelOneSorcererBuild({
    draftIdText: "draft:l1-sdk-sorcerer-mage-armor",
    expectedBuildLabel: "Sorcerer Mage Armor",
    cantrips: [
      fireBoltSpellId,
      "light",
      shockingGraspSpellId,
      sorcerousBurstSpellId,
    ],
    preparedSpells: [mageArmorSpellId, burningHandsSpellId],
  });
}

function finalizedLevelOneSorcererFalseLifeBuild(): CharacterBuild {
  return finalizedLevelOneSorcererBuild({
    draftIdText: "draft:l1-sdk-sorcerer-false-life",
    expectedBuildLabel: "Sorcerer False Life",
    cantrips: [
      fireBoltSpellId,
      "light",
      shockingGraspSpellId,
      sorcerousBurstSpellId,
    ],
    preparedSpells: [falseLifeSpellId, burningHandsSpellId],
  });
}

function finalizedLevelOneSorcererRayOfSicknessBuild(): CharacterBuild {
  return finalizedLevelOneSorcererBuild({
    draftIdText: "draft:l1-sdk-sorcerer-ray-of-sickness",
    expectedBuildLabel: "Sorcerer Ray of Sickness",
    cantrips: [
      fireBoltSpellId,
      "light",
      shockingGraspSpellId,
      sorcerousBurstSpellId,
    ],
    preparedSpells: [rayOfSicknessSpellId, burningHandsSpellId],
  });
}

function finalizedLevelOneSorcererThunderwaveBuild(): CharacterBuild {
  return finalizedLevelOneSorcererBuild({
    draftIdText: "draft:l1-sdk-sorcerer-thunderwave",
    expectedBuildLabel: "Sorcerer Thunderwave",
    cantrips: [
      fireBoltSpellId,
      "light",
      shockingGraspSpellId,
      sorcerousBurstSpellId,
    ],
    preparedSpells: [thunderwaveSpellId, burningHandsSpellId],
  });
}

function finalizedLevelOneSorcererMagicMissileBuild(): CharacterBuild {
  return finalizedLevelOneSorcererBuild({
    draftIdText: "draft:l1-sdk-sorcerer-magic-missile",
    expectedBuildLabel: "Sorcerer Magic Missile",
    cantrips: [
      fireBoltSpellId,
      "light",
      shockingGraspSpellId,
      sorcerousBurstSpellId,
    ],
    preparedSpells: [magicMissileSpellId, burningHandsSpellId],
  });
}

function finalizedLevelOneSorcererBuild(input: {
  readonly draftIdText: string;
  readonly expectedBuildLabel: string;
  readonly cantrips: readonly string[];
  readonly preparedSpells: readonly string[];
}): CharacterBuild {
  const draft = createCharacterDraft({
    unitLibrary,
    draftId: characterDraftId(input.draftIdText),
  });
  const afterInitial = requireAcceptedCreationBatch(
    fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        creationChoiceFill(
          "cc:draft:draft.progression.initial",
          "14:class_sorcerer:level_1:maximum_hit_die",
        ),
        creationChoiceFill("cc:draft:draft.background", "background_criminal"),
        creationChoiceFill("cc:draft:draft.species", "species_orc"),
        {
          kind: "abilityScores",
          holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
          method: "standardArray",
          value: requireRight(
            abilityScoreAssignment({
              str: 8,
              dex: 14,
              con: 13,
              int: 10,
              wis: 12,
              cha: 15,
            }),
          ),
        },
        creationChoiceFill("cc:draft:draft.languages", "Dwarvish", "Goblin"),
        creationChoiceFill("cc:draft:draft.alignment", "lawful_good"),
      ],
    }),
  );
  const afterChoices = requireAcceptedCreationBatch(
    fillCreationHoles({
      draft: afterInitial,
      unitLibrary,
      expectedRevision: afterInitial.revision,
      fills: [
        creationChoiceFill(
          testUnitChoiceHoleId(
            "class_sorcerer",
            "class_skill_proficiency_choice",
          ),
          "arcana",
          "persuasion",
        ),
        creationChoiceFill(
          testUnitChoiceHoleId("class_sorcerer", "class_cantrip_choices"),
          ...input.cantrips,
        ),
        creationChoiceFill(
          testUnitChoiceHoleId(
            "class_sorcerer",
            "class_prepared_spell_choices",
          ),
          ...input.preparedSpells,
        ),
        creationChoiceFill(
          testUnitChoiceHoleId(
            "background_criminal",
            "background_ability_score_increase",
          ),
          "two_and_one:dex:con",
        ),
        creationChoiceFill(
          testUnitChoiceHoleId("background_criminal", "background_tool_choice"),
          "thieves_tools",
        ),
        creationChoiceFill(
          testUnitChoiceHoleId("class_sorcerer", "class_equipment_choice"),
          "option_b",
        ),
        creationChoiceFill(
          testUnitChoiceHoleId(
            "background_criminal",
            "background_equipment_choice",
          ),
          "option_b",
        ),
      ],
    }),
  );
  const afterPurchase = requireAcceptedCreationBatch(
    fillCreationHoles({
      draft: afterChoices,
      unitLibrary,
      expectedRevision: afterChoices.revision,
      fills: [
        creationChoiceFill(
          testUnitChoiceHoleId("class_sorcerer", "equipment_purchase"),
          "weapon_dagger",
        ),
      ],
    }),
  );
  const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });
  if (result.tag !== "ready") {
    throw new Error(
      `Expected finalized ${input.expectedBuildLabel} build, received ${creationFinalizationResultSummary(result)}`,
    );
  }
  return result.build;
}

function finalizedLevelOneWarlockPoisonSprayBuild(): CharacterBuild {
  return finalizedLevelOneWarlockBuild({
    draftIdText: "draft:l1-sdk-warlock-poison-spray",
    expectedBuildLabel: "Warlock Poison Spray",
    cantrips: [poisonSpraySpellId, "eldritch_blast"],
    preparedSpells: [hexSpellId, "hellish_rebuke"],
    eldritchInvocation: "eldritch_mind",
  });
}

function finalizedLevelOneWarlockChillTouchBuild(): CharacterBuild {
  return finalizedLevelOneWarlockBuild({
    draftIdText: "draft:l1-sdk-warlock-chill-touch",
    expectedBuildLabel: "Warlock Chill Touch",
    cantrips: [chillTouchSpellId, "eldritch_blast"],
    preparedSpells: [hexSpellId, "hellish_rebuke"],
    eldritchInvocation: "eldritch_mind",
  });
}

function finalizedLevelOneWarlockEldritchBlastBuild(): CharacterBuild {
  return finalizedLevelOneWarlockBuild({
    draftIdText: "draft:l1-sdk-warlock-eldritch-blast",
    expectedBuildLabel: "Warlock Eldritch Blast",
    cantrips: [eldritchBlastSpellId, poisonSpraySpellId],
    preparedSpells: [hexSpellId, "hellish_rebuke"],
    eldritchInvocation: "eldritch_mind",
  });
}

function finalizedLevelOneWarlockHexBuild(): CharacterBuild {
  return finalizedLevelOneWarlockBuild({
    draftIdText: "draft:l1-sdk-warlock-hex",
    expectedBuildLabel: "Warlock Hex",
    cantrips: [eldritchBlastSpellId, poisonSpraySpellId],
    preparedSpells: [hexSpellId, "hellish_rebuke"],
    eldritchInvocation: "eldritch_mind",
  });
}

function finalizedLevelOneWarlockBuild(input: {
  readonly draftIdText: string;
  readonly expectedBuildLabel: string;
  readonly cantrips: readonly string[];
  readonly preparedSpells: readonly string[];
  readonly eldritchInvocation: string;
}): CharacterBuild {
  const draft = createCharacterDraft({
    unitLibrary,
    draftId: characterDraftId(input.draftIdText),
  });
  const afterInitial = requireAcceptedCreationBatch(
    fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        creationChoiceFill(
          "cc:draft:draft.progression.initial",
          "13:class_warlock:level_1:maximum_hit_die",
        ),
        creationChoiceFill("cc:draft:draft.background", "background_criminal"),
        creationChoiceFill("cc:draft:draft.species", "species_orc"),
        {
          kind: "abilityScores",
          holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
          method: "standardArray",
          value: requireRight(
            abilityScoreAssignment({
              str: 8,
              dex: 14,
              con: 13,
              int: 10,
              wis: 12,
              cha: 15,
            }),
          ),
        },
        creationChoiceFill("cc:draft:draft.languages", "Dwarvish", "Goblin"),
        creationChoiceFill("cc:draft:draft.alignment", "lawful_good"),
      ],
    }),
  );
  const afterChoices = requireAcceptedCreationBatch(
    fillCreationHoles({
      draft: afterInitial,
      unitLibrary,
      expectedRevision: afterInitial.revision,
      fills: [
        creationChoiceFill(
          testUnitChoiceHoleId(
            "class_warlock",
            "class_skill_proficiency_choice",
          ),
          "arcana",
          "history",
        ),
        creationChoiceFill(
          testUnitChoiceHoleId("class_warlock", "class_cantrip_choices"),
          ...input.cantrips,
        ),
        creationChoiceFill(
          testUnitChoiceHoleId("class_warlock", "class_prepared_spell_choices"),
          ...input.preparedSpells,
        ),
        creationChoiceFill(
          testUnitChoiceHoleId(
            "warlock_eldritch_invocations",
            "eldritch_invocations",
          ),
          input.eldritchInvocation,
        ),
        creationChoiceFill(
          testUnitChoiceHoleId(
            "background_criminal",
            "background_ability_score_increase",
          ),
          "two_and_one:dex:con",
        ),
        creationChoiceFill(
          testUnitChoiceHoleId("background_criminal", "background_tool_choice"),
          "thieves_tools",
        ),
        creationChoiceFill(
          testUnitChoiceHoleId("class_warlock", "class_equipment_choice"),
          "option_b",
        ),
        creationChoiceFill(
          testUnitChoiceHoleId(
            "background_criminal",
            "background_equipment_choice",
          ),
          "option_b",
        ),
      ],
    }),
  );
  const afterPurchase = requireAcceptedCreationBatch(
    fillCreationHoles({
      draft: afterChoices,
      unitLibrary,
      expectedRevision: afterChoices.revision,
      fills: [
        creationChoiceFill(
          testUnitChoiceHoleId("class_warlock", "equipment_purchase"),
          "weapon_dagger",
        ),
      ],
    }),
  );
  const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });
  if (result.tag !== "ready") {
    throw new Error(
      `Expected finalized ${input.expectedBuildLabel} build, received ${creationFinalizationResultSummary(result)}`,
    );
  }
  return result.build;
}

function finalizedLevelOneWizardBurningHandsBuild(): CharacterBuild {
  return finalizedLevelOneWizardBuild({
    draftIdText: "draft:l1-sdk-wizard-burning-hands",
    expectedBuildLabel: "Wizard Burning Hands",
    cantrips: ["light", fireBoltSpellId, "ray_of_frost"],
    spellbook: [
      "detect_magic",
      burningHandsSpellId,
      "mage_armor",
      "magic_missile",
      "shield",
      "sleep",
    ],
    preparedSpells: [
      burningHandsSpellId,
      "detect_magic",
      "magic_missile",
      "shield",
    ],
  });
}

function finalizedLevelOneWizardFireBoltBuild(): CharacterBuild {
  return finalizedLevelOneWizardBuild({
    draftIdText: "draft:l1-sdk-wizard-fire-bolt",
    expectedBuildLabel: "Wizard Fire Bolt",
    cantrips: ["light", fireBoltSpellId, "ray_of_frost"],
    spellbook: [
      "detect_magic",
      "mage_armor",
      "magic_missile",
      "shield",
      "sleep",
      "thunderwave",
    ],
    preparedSpells: ["detect_magic", "mage_armor", "magic_missile", "shield"],
  });
}

function finalizedLevelOneWizardAcidSplashBuild(): CharacterBuild {
  return finalizedLevelOneWizardBuild({
    draftIdText: "draft:l1-sdk-wizard-acid-splash",
    expectedBuildLabel: "Wizard Acid Splash",
    cantrips: [acidSplashSpellId, fireBoltSpellId, "ray_of_frost"],
    spellbook: [
      "detect_magic",
      "mage_armor",
      "magic_missile",
      "shield",
      "sleep",
      "thunderwave",
    ],
    preparedSpells: ["detect_magic", "mage_armor", "magic_missile", "shield"],
  });
}

function finalizedLevelOneWizardPoisonSprayBuild(): CharacterBuild {
  return finalizedLevelOneWizardBuild({
    draftIdText: "draft:l1-sdk-wizard-poison-spray",
    expectedBuildLabel: "Wizard Poison Spray",
    cantrips: [poisonSpraySpellId, fireBoltSpellId, "ray_of_frost"],
    spellbook: [
      "detect_magic",
      "mage_armor",
      "magic_missile",
      "shield",
      "sleep",
      "thunderwave",
    ],
    preparedSpells: ["detect_magic", "mage_armor", "magic_missile", "shield"],
  });
}

function finalizedLevelOneWizardChillTouchBuild(): CharacterBuild {
  return finalizedLevelOneWizardBuild({
    draftIdText: "draft:l1-sdk-wizard-chill-touch",
    expectedBuildLabel: "Wizard Chill Touch",
    cantrips: [chillTouchSpellId, fireBoltSpellId, "ray_of_frost"],
    spellbook: [
      "detect_magic",
      "mage_armor",
      "magic_missile",
      "shield",
      "sleep",
      "thunderwave",
    ],
    preparedSpells: ["detect_magic", "mage_armor", "magic_missile", "shield"],
  });
}

function finalizedLevelOneWizardRayOfFrostBuild(): CharacterBuild {
  return finalizedLevelOneWizardBuild({
    draftIdText: "draft:l1-sdk-wizard-ray-of-frost",
    expectedBuildLabel: "Wizard Ray of Frost",
    cantrips: ["light", fireBoltSpellId, rayOfFrostSpellId],
    spellbook: [
      "detect_magic",
      "mage_armor",
      "magic_missile",
      "shield",
      "sleep",
      "thunderwave",
    ],
    preparedSpells: ["detect_magic", "mage_armor", "magic_missile", "shield"],
  });
}

function finalizedLevelOneWizardShockingGraspBuild(): CharacterBuild {
  return finalizedLevelOneWizardBuild({
    draftIdText: "draft:l1-sdk-wizard-shocking-grasp",
    expectedBuildLabel: "Wizard Shocking Grasp",
    cantrips: ["light", fireBoltSpellId, shockingGraspSpellId],
    spellbook: [
      "detect_magic",
      "mage_armor",
      "magic_missile",
      "shield",
      "sleep",
      "thunderwave",
    ],
    preparedSpells: ["detect_magic", "mage_armor", "magic_missile", "shield"],
  });
}

function finalizedLevelOneWizardChromaticOrbBuild(): CharacterBuild {
  return finalizedLevelOneWizardBuild({
    draftIdText: "draft:l1-sdk-wizard-chromatic-orb",
    expectedBuildLabel: "Wizard Chromatic Orb",
    cantrips: ["light", fireBoltSpellId, "ray_of_frost"],
    spellbook: [
      "detect_magic",
      "mage_armor",
      "magic_missile",
      chromaticOrbSpellId,
      "sleep",
      "thunderwave",
    ],
    preparedSpells: [
      "detect_magic",
      "mage_armor",
      chromaticOrbSpellId,
      "sleep",
    ],
  });
}

function finalizedLevelOneWizardMageArmorBuild(): CharacterBuild {
  return finalizedLevelOneWizardBuild({
    draftIdText: "draft:l1-sdk-wizard-mage-armor",
    expectedBuildLabel: "Wizard Mage Armor",
    cantrips: ["light", fireBoltSpellId, "ray_of_frost"],
    spellbook: [
      "detect_magic",
      "feather_fall",
      mageArmorSpellId,
      magicMissileSpellId,
      "sleep",
      "thunderwave",
    ],
    preparedSpells: [
      "detect_magic",
      mageArmorSpellId,
      magicMissileSpellId,
      "sleep",
    ],
  });
}

function finalizedLevelOneWizardFalseLifeBuild(): CharacterBuild {
  return finalizedLevelOneWizardBuild({
    draftIdText: "draft:l1-sdk-wizard-false-life",
    expectedBuildLabel: "Wizard False Life",
    cantrips: ["light", fireBoltSpellId, "ray_of_frost"],
    spellbook: [
      "detect_magic",
      "feather_fall",
      falseLifeSpellId,
      mageArmorSpellId,
      magicMissileSpellId,
      "sleep",
    ],
    preparedSpells: [
      "detect_magic",
      falseLifeSpellId,
      mageArmorSpellId,
      magicMissileSpellId,
    ],
  });
}

function finalizedLevelOneWizardRayOfSicknessBuild(): CharacterBuild {
  const rayOfSicknessWizardSpellbook = [
    "detect_magic",
    "feather_fall",
    "mage_armor",
    magicMissileSpellId,
    rayOfSicknessSpellId,
    "sleep",
  ] as const;
  const rayOfSicknessWizardPreparedSpells = [
    "detect_magic",
    "mage_armor",
    magicMissileSpellId,
    rayOfSicknessSpellId,
  ] as const;
  return finalizedLevelOneWizardBuild({
    draftIdText: "draft:l1-sdk-wizard-ray-of-sickness",
    expectedBuildLabel: "Wizard Ray of Sickness",
    cantrips: ["light", fireBoltSpellId, "ray_of_frost"],
    spellbook: rayOfSicknessWizardSpellbook,
    preparedSpells: rayOfSicknessWizardPreparedSpells,
  });
}

function finalizedLevelOneWizardMagicMissileBuild(): CharacterBuild {
  return finalizedLevelOneWizardBuild({
    draftIdText: "draft:l1-sdk-wizard-magic-missile",
    expectedBuildLabel: "Wizard Magic Missile",
    cantrips: ["light", fireBoltSpellId, "ray_of_frost"],
    spellbook: [
      "detect_magic",
      "feather_fall",
      "mage_armor",
      magicMissileSpellId,
      "sleep",
      "thunderwave",
    ],
    preparedSpells: [
      "detect_magic",
      "mage_armor",
      magicMissileSpellId,
      "sleep",
    ],
  });
}

function finalizedLevelOneWizardThunderwaveBuild(): CharacterBuild {
  const thunderwaveWizardSpellbook = [
    "detect_magic",
    "feather_fall",
    "mage_armor",
    magicMissileSpellId,
    "sleep",
    thunderwaveSpellId,
  ] as const;
  const thunderwaveWizardPreparedSpells = [
    "detect_magic",
    "mage_armor",
    magicMissileSpellId,
    thunderwaveSpellId,
  ] as const;
  return finalizedLevelOneWizardBuild({
    draftIdText: "draft:l1-sdk-wizard-thunderwave",
    expectedBuildLabel: "Wizard Thunderwave",
    cantrips: ["light", fireBoltSpellId, "ray_of_frost"],
    spellbook: thunderwaveWizardSpellbook,
    preparedSpells: thunderwaveWizardPreparedSpells,
  });
}

function finalizedLevelOneWizardBuild(input: {
  readonly draftIdText: string;
  readonly expectedBuildLabel: string;
  readonly cantrips: readonly string[];
  readonly spellbook: readonly string[];
  readonly preparedSpells: readonly string[];
}): CharacterBuild {
  const draft = createCharacterDraft({
    unitLibrary,
    draftId: characterDraftId(input.draftIdText),
  });
  const afterInitial = requireAcceptedCreationBatch(
    fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        creationChoiceFill(
          "cc:draft:draft.progression.initial",
          "12:class_wizard:level_1:maximum_hit_die",
        ),
        creationChoiceFill("cc:draft:draft.background", "background_criminal"),
        creationChoiceFill("cc:draft:draft.species", "species_orc"),
        {
          kind: "abilityScores",
          holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
          method: "standardArray",
          value: requireRight(
            abilityScoreAssignment({
              str: 8,
              dex: 14,
              con: 13,
              int: 15,
              wis: 10,
              cha: 12,
            }),
          ),
        },
        creationChoiceFill("cc:draft:draft.languages", "Dwarvish", "Goblin"),
        creationChoiceFill("cc:draft:draft.alignment", "lawful_good"),
      ],
    }),
  );
  const afterChoices = requireAcceptedCreationBatch(
    fillCreationHoles({
      draft: afterInitial,
      unitLibrary,
      expectedRevision: afterInitial.revision,
      fills: [
        creationChoiceFill(
          testUnitChoiceHoleId(
            "class_wizard",
            "class_skill_proficiency_choice",
          ),
          "arcana",
          "history",
        ),
        creationChoiceFill(
          testUnitChoiceHoleId("class_wizard", "wizard_cantrip_choices"),
          ...input.cantrips,
        ),
        creationChoiceFill(
          testUnitChoiceHoleId("class_wizard", "wizard_spellbook_choices"),
          ...input.spellbook,
        ),
        creationChoiceFill(
          testUnitChoiceHoleId("class_wizard", "wizard_prepared_spell_choices"),
          ...input.preparedSpells,
        ),
        creationChoiceFill(
          testUnitChoiceHoleId(
            "background_criminal",
            "background_ability_score_increase",
          ),
          "two_and_one:int:con",
        ),
        creationChoiceFill(
          testUnitChoiceHoleId("background_criminal", "background_tool_choice"),
          "thieves_tools",
        ),
        creationChoiceFill(
          testUnitChoiceHoleId("class_wizard", "class_equipment_choice"),
          "option_b",
        ),
        creationChoiceFill(
          testUnitChoiceHoleId(
            "background_criminal",
            "background_equipment_choice",
          ),
          "option_b",
        ),
      ],
    }),
  );
  const afterPurchase = requireAcceptedCreationBatch(
    fillCreationHoles({
      draft: afterChoices,
      unitLibrary,
      expectedRevision: afterChoices.revision,
      fills: [
        creationChoiceFill(
          testUnitChoiceHoleId("class_wizard", "equipment_purchase"),
          "weapon_dagger",
        ),
      ],
    }),
  );
  const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });
  if (result.tag !== "ready") {
    throw new Error(
      `Expected finalized ${input.expectedBuildLabel} build, received ${creationFinalizationResultSummary(result)}`,
    );
  }
  return result.build;
}

function requireAcceptedCreationBatch(
  result: CreationBatchFillResult,
): CharacterDraft {
  if (result.tag !== "accepted") {
    throw new Error(
      `Expected character-creation fill batch to be accepted, received ${creationBatchResultSummary(result)}`,
    );
  }
  return result.draft;
}

function creationBatchResultSummary(result: CreationBatchFillResult): string {
  return result.tag === "accepted"
    ? "accepted"
    : `rejected with issues ${JSON.stringify(result.issues)}`;
}

function creationFinalizationResultSummary(
  result: ReturnType<typeof finalizeCharacterDraft>,
): string {
  if (result.tag === "ready") {
    return "ready";
  }
  if (result.tag === "incomplete") {
    return `incomplete with holes ${JSON.stringify(
      result.holes.map((hole) => hole.holeId),
    )}`;
  }
  return `invalid with issues ${JSON.stringify(result.issues)}`;
}

function spellTargetAllocationFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetAllocation" }>,
  allocations: readonly {
    readonly targetId: CombatantId;
    readonly count: number;
  }[],
  casterId: CombatantId,
): Extract<BattleFill, { readonly kind: "spellTargetAllocation" }> {
  return {
    kind: "spellTargetAllocation",
    holeId: hole.holeId,
    value: { allocations },
    spatialFacts: allocations.map((allocation) => ({
      kind: "spellTarget",
      casterId,
      targetId: allocation.targetId,
      spellId: hole.spell.spell.id,
    })),
  };
}

function creationChoiceFill(
  holeId: CreationHoleIdText,
  ...optionIds: readonly string[]
): CreationFill {
  return {
    kind: "choice",
    holeId: creationHoleId(holeId),
    optionIds: optionIds.map(creationChoiceOptionId),
  };
}

function testUnitChoiceHoleId(
  unitId: UnitRecord["id"],
  choiceKey: UnitChoiceKey,
): CreationHoleIdText {
  return unitChoiceSourceHoleIdText({
    tag: "unitChoice",
    unitId: requireRight(unitChoiceSourceUnitId(unitId)),
    choiceKey: requireRight(unitChoiceKey(choiceKey)),
  });
}

function testLoadoutHoleId(
  equipmentUnitId: UnitRecord["id"],
  slot: LoadoutSlot,
): CreationHoleIdText {
  return loadoutSourceHoleIdText({
    tag: "loadout",
    equipmentUnitId: requireRight(loadoutEquipmentUnitId(equipmentUnitId)),
    slot,
  });
}

function unitFeatureActForUnitId(
  state: BattleState,
  actorId: CombatantId,
  unitId: UnitRecord["id"],
): UnitFeatureAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is UnitFeatureAct =>
      candidate.subject.tag === "unitFeature" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.unitId === unitId,
  );
  if (act === undefined) {
    throw new Error(`Expected ${unitId} unit feature act.`);
  }
  return act;
}

function cantripCastActionSpellAct(
  state: BattleState,
  actorId: CombatantId,
  spellId: UnitRecord["id"],
  procedure: CantripSpellProcedure = "spellAttackDamage",
): CastActionSpellAct {
  const expectedInvocation = cantripSpellInvocationRef(spellId, procedure);
  if (expectedInvocation.tag !== "cantrip") {
    throw new Error(`Expected ${spellId} cantrip invocation.`);
  }
  const act = discoverBattleActs(state).find(
    (candidate): candidate is CastActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.mode.tag === "cast" &&
      candidate.subject.invocation.tag === "cantrip" &&
      candidate.subject.invocation.spellId === expectedInvocation.spellId &&
      candidate.subject.invocation.procedure === expectedInvocation.procedure,
  );
  if (act === undefined) {
    throw new Error(`Expected ${spellId} cantrip spell act.`);
  }
  return act;
}

function cantripCastHeldLightBonusActionSpellAct(
  state: BattleState,
  actorId: CombatantId,
  spellId: UnitRecord["id"],
): CastBonusActionSpellAct {
  const expectedInvocation = cantripSpellInvocationRef(spellId, "heldLight");
  if (expectedInvocation.tag !== "cantrip") {
    throw new Error(`Expected ${spellId} cantrip invocation.`);
  }
  const act = discoverBattleActs(state).find(
    (candidate): candidate is CastBonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.mode.tag === "cast" &&
      candidate.subject.invocation.tag === "cantrip" &&
      candidate.subject.invocation.spellId === expectedInvocation.spellId &&
      candidate.subject.invocation.procedure === expectedInvocation.procedure,
  );
  if (act === undefined) {
    throw new Error(`Expected ${spellId} Bonus Action cantrip spell act.`);
  }
  return act;
}

function shillelaghBonusActionSpellAct(
  state: BattleState,
  actorId: CombatantId,
): CastBonusActionSpellAct {
  const expectedInvocation = cantripSpellInvocationRef(
    shillelaghSpellId,
    "weaponAttackOverride",
  );
  if (expectedInvocation.tag !== "cantrip") {
    throw new Error("Expected Shillelagh cantrip invocation.");
  }
  const act = discoverBattleActs(state).find(
    (candidate): candidate is CastBonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.mode.tag === "cast" &&
      candidate.subject.invocation.tag === "cantrip" &&
      candidate.subject.invocation.spellId === expectedInvocation.spellId &&
      candidate.subject.invocation.procedure === expectedInvocation.procedure &&
      candidate.subject.componentWeaponItemId === shillelaghQuarterstaffItemId,
  );
  if (act === undefined) {
    throw new Error(
      "Expected Shillelagh Quarterstaff Bonus Action cantrip spell act.",
    );
  }
  return act;
}

function sanctuaryBonusActionSpellSlotAct(
  state: BattleState,
  actorId: CombatantId,
): CastBonusActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is CastBonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.mode.tag === "cast" &&
      candidate.subject.invocation.tag === "spellSlot" &&
      candidate.subject.invocation.spellId === sanctuarySpellId &&
      candidate.subject.invocation.slotLevel === 1 &&
      candidate.subject.invocation.procedure ===
        "sanctuaryTargetingInterdiction",
  );
  if (act === undefined) {
    throw new Error("Expected Sanctuary Bonus Action spell-slot act.");
  }
  return act;
}

function healingWordBonusActionSpellSlotAct(
  state: BattleState,
  actorId: CombatantId,
): CastBonusActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is CastBonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.mode.tag === "cast" &&
      candidate.subject.invocation.tag === "spellSlot" &&
      candidate.subject.invocation.spellId === healingWordSpellId &&
      candidate.subject.invocation.slotLevel === 1 &&
      candidate.subject.invocation.procedure === "directHitPointRestoration",
  );
  if (act === undefined) {
    throw new Error("Expected Healing Word Bonus Action spell-slot act.");
  }
  return act;
}

function hexBonusActionSpellSlotAct(
  state: BattleState,
  actorId: CombatantId,
): CastBonusActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is CastBonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.mode.tag === "cast" &&
      candidate.subject.invocation.tag === "spellSlot" &&
      candidate.subject.invocation.spellId === hexSpellId &&
      candidate.subject.invocation.slotLevel === 1 &&
      candidate.subject.invocation.procedure === "markedDamageRider",
  );
  if (act === undefined) {
    throw new Error("Expected Hex Bonus Action spell-slot act.");
  }
  return act;
}

function hasCantripSpellInvocationAct(
  state: BattleState,
  actorId: CombatantId,
  spellId: UnitRecord["id"],
  procedure: CantripSpellProcedure,
): boolean {
  const expectedInvocation = cantripSpellInvocationRef(spellId, procedure);
  if (expectedInvocation.tag !== "cantrip") {
    throw new Error(`Expected ${spellId} cantrip invocation.`);
  }
  return discoverBattleActs(state).some(
    (candidate) =>
      "actorId" in candidate.subject &&
      "invocation" in candidate.subject &&
      candidate.subject.actorId === actorId &&
      candidate.subject.invocation.tag === "cantrip" &&
      candidate.subject.invocation.spellId === expectedInvocation.spellId &&
      candidate.subject.invocation.procedure === expectedInvocation.procedure,
  );
}

function martialArtsBonusUnarmedStrikeAct(
  state: BattleState,
  actorId: CombatantId,
): MartialArtsBonusUnarmedStrikeAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is MartialArtsBonusUnarmedStrikeAct =>
      candidate.subject.tag === "bonusAction" &&
      candidate.subject.action === "martialArtsUnarmedStrike" &&
      candidate.subject.actorId === actorId,
  );
  if (act === undefined) {
    throw new Error("Expected Martial Arts Bonus Action Unarmed Strike act.");
  }
  return act;
}

function requireThunderwaveSavingThrowHole(
  hole: SavingThrowOutcomeHole,
): ThunderwaveSavingThrowOutcomeHole {
  if (!("spell" in hole)) {
    throw new Error("Expected Thunderwave spell Saving Throw outcome hole.");
  }
  const spell = hole.spell;
  if (
    spell.procedure !== "saveGatedDamage" ||
    spell.spell.id !== thunderwaveSpellId ||
    spell.targeting.kind !== "selfOriginCube" ||
    spell.targeting.sideFeet !== 15 ||
    spell.postSaveAreaEffect?.kind !== "thunderwave"
  ) {
    throw new Error("Expected Thunderwave self-origin Cube Saving Throw hole.");
  }
  // The checks above establish the exact Thunderwave spell-hole shape; the cast
  // carries those literal refinements through the mixed Saving Throw hole union.
  return hole as ThunderwaveSavingThrowOutcomeHole;
}

function thunderwaveSavingThrowOutcomeFill(
  hole: ThunderwaveSavingThrowOutcomeHole,
  originAnchorId: CombatantId,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: thunderwaveArea(
        originAnchorId,
        outcomes.map((outcome) => outcome.targetId),
        outcomes.flatMap((outcome) =>
          outcome.succeeded ? [] : [outcome.targetId],
        ),
      ),
      outcomes,
    },
  };
}

function thunderwaveArea(
  originAnchorId: CombatantId,
  affectedTargetIds: readonly CombatantId[],
  failedTargetIds: readonly CombatantId[],
): Extract<BattleSpellAreaChoice, { readonly kind: "thunderwaveArea" }> {
  return {
    kind: "thunderwaveArea",
    originAnchorId,
    affectedTargetIds,
    creaturePushes: failedTargetIds.map((targetId) => ({
      targetId,
      disposition: {
        kind: "pushed" as const,
        distanceFeet: movementFeet(10),
        destinationId: battleTablePositionId(
          `pushed:l1-sdk-thunderwave:${targetId}`,
        ),
        provokesOpportunityAttacks: false as const,
      },
    })),
    unsecuredObjectPushes: [
      {
        objectId: thunderwaveUnsecuredObjectId,
        disposition: {
          kind: "pushed",
          distanceFeet: movementFeet(10),
          destinationId: battleTablePositionId(
            "pushed:l1-sdk-thunderwave-object",
          ),
          provokesOpportunityAttacks: false,
        },
      },
    ],
    audibleBoom: {
      sound: "thunderous boom",
      audibleRadiusFeet: movementFeet(300),
    },
  };
}

function noActiveThaumaturgyOneMinuteEffectsFill(
  hole: Extract<
    BattleHole,
    { readonly kind: "thaumaturgyActiveOneMinuteEffectCount" }
  >,
): Extract<
  BattleFill,
  { readonly kind: "thaumaturgyActiveOneMinuteEffectCount" }
> {
  return {
    kind: "thaumaturgyActiveOneMinuteEffectCount",
    holeId: hole.holeId,
    value: { activeOneMinuteEffectCount: 0 },
  };
}

function damageTypeChoiceFill(
  hole: Extract<BattleHole, { readonly kind: "damageTypeChoice" }>,
  value: Extract<BattleFill, { readonly kind: "damageTypeChoice" }>["value"],
): Extract<BattleFill, { readonly kind: "damageTypeChoice" }> {
  return { kind: "damageTypeChoice", holeId: hole.holeId, value };
}

function abilityChoiceFill(
  hole: Extract<BattleHole, { readonly kind: "abilityChoice" }>,
  value: Extract<BattleFill, { readonly kind: "abilityChoice" }>["value"],
): Extract<BattleFill, { readonly kind: "abilityChoice" }> {
  return { kind: "abilityChoice", holeId: hole.holeId, value };
}

function spellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  spellId: UnitRecord["id"],
  casterId: CombatantId,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [{ kind: "spellTarget", casterId, targetId, spellId }],
  };
}

function sanctuaryTargetListFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetList" }>,
  casterId: CombatantId,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "spellTargetList" }> {
  return {
    kind: "spellTargetList",
    holeId: hole.holeId,
    value: { targetIds: [targetId] },
    spatialFacts: [
      { kind: "spellTarget", casterId, targetId, spellId: sanctuarySpellId },
    ],
  };
}

function requireMovementSpeedBudget(
  hole: Extract<BattleHole, { readonly kind: "movement" }>,
  kind: Extract<
    BattleFill,
    { readonly kind: "movement" }
  >["value"]["speedKind"],
): Extract<
  BattleHole,
  { readonly kind: "movement" }
>["speedKinds"][number]["movementBudgetFeet"] {
  const speedKind = hole.speedKinds.find(
    (candidate) => candidate.kind === kind,
  );
  if (speedKind === undefined) {
    throw new Error(`Expected ${kind} movement budget.`);
  }
  return speedKind.movementBudgetFeet;
}

function walkMovementFill(
  hole: Extract<BattleHole, { readonly kind: "movement" }>,
  value: {
    readonly movementCostFeet: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["movementCostFeet"];
    readonly provokedOpportunityAttacks: readonly {
      readonly reactorId: CombatantId;
      readonly attackName: string;
    }[];
  },
): Extract<BattleFill, { readonly kind: "movement" }> {
  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      speedKind: "walk",
      movementCostFeet: value.movementCostFeet,
      provokedOpportunityAttacks: value.provokedOpportunityAttacks,
    },
  };
}

function spellLeapTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  spellId: UnitRecord["id"],
  previousTargetId: CombatantId,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "spellLeapTargetWithinRange",
        previousTargetId,
        targetId,
        spellId,
        rangeFeet: movementFeet(30),
      },
    ],
  };
}

function snapshotCombatant(
  state: BattleState,
  combatantId: CombatantId,
): ReturnType<typeof snapshotBattle>["combatants"][number] {
  const combatant = snapshotBattle(state).combatants.find(
    (candidate) => candidate.combatantId === combatantId,
  );
  if (combatant === undefined) {
    throw new Error(`Expected snapshot for combatant ${combatantId}.`);
  }
  return combatant;
}

function bardicInspirationTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "bardicInspirationTargetWithinRange",
        bardId,
        targetId,
        unitId: bardBardicInspirationUnitId,
        rangeFeet: movementFeet(60),
      },
    ],
  };
}

function resolveOrdinaryAttackDamage(input: {
  readonly state: BattleState;
  readonly subject: OrdinaryAttackDamageSubject;
  readonly targetId: CombatantId;
  readonly attackRoll: {
    readonly total: number;
    readonly naturalD20: number;
    readonly rollMode?: "advantage" | "disadvantage" | "normal";
  };
  readonly damageDice: readonly (readonly number[])[];
}): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  const target = requireHole(
    resolveBattleSubject({
      state: input.state,
      subject: input.subject,
      fills: [],
    }),
    "targetChoice",
  );
  const targetFill = attackTargetFill(
    target,
    input.subject.actorId,
    input.targetId,
    input.subject.attackName,
  );
  const roll = requireHole(
    resolveBattleSubject({
      state: input.state,
      subject: input.subject,
      fills: [targetFill],
    }),
    "attackRoll",
  );
  const attackFill = attackRollFill(roll, input.attackRoll);
  const damage = requireHole(
    resolveBattleSubject({
      state: input.state,
      subject: input.subject,
      fills: [targetFill, attackFill],
    }),
    "rolledDice",
  );
  return requireResolved(
    resolveBattleSubject({
      state: input.state,
      subject: input.subject,
      fills: ordinaryAttackDamageFills({
        state: input.state,
        subject: input.subject,
        prefixFills: [targetFill, attackFill],
        damage,
        damageDice: input.damageDice,
      }),
    }),
  );
}
