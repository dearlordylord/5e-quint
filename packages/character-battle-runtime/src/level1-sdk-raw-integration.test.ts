import {
  cantripSpellInvocationRef,
  combatantId,
  discoverBattleActs,
  endTurn,
  resolveBattleSubject,
  snapshotBattle,
  spellSaveDcForCaster,
  type AvailableBattleAct,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
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
  unitChoiceKey,
  unitChoiceSourceHoleIdText,
  unitChoiceSourceUnitId,
  type CharacterBuild,
  type CharacterDraft,
  type CreationBatchFillResult,
  type CreationFill,
  type CreationHoleIdText,
  type UnitChoiceKey,
} from "@dnd/character-creation-runtime";
import { Hp, movementFeet } from "@dnd/shared/types";
import type { UnitRecord } from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";

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
  srdStatBlock,
  spellSlotActForProcedure,
  unitLibrary,
} from "./sdk-integration-test-support.ts";

const fighterId = combatantId("combatant:l1-sdk-fighter");
const barbarianId = combatantId("combatant:l1-sdk-barbarian");
const bardId = combatantId("combatant:l1-sdk-bard");
const inspiredAllyId = combatantId("combatant:l1-sdk-inspired-ally");
const rogueId = combatantId("combatant:l1-sdk-rogue");
const rogueAllyId = combatantId("combatant:l1-sdk-rogue-ally");
const sorcererId = combatantId("combatant:l1-sdk-sorcerer");
const burningHandsCasterId = combatantId("combatant:l1-sdk-burning-hands");
const fireBoltSorcererId = combatantId("combatant:l1-sdk-fire-bolt-sorcerer");
const fireBoltWizardId = combatantId("combatant:l1-sdk-fire-bolt-wizard");
const wizardBurningHandsCasterId = combatantId(
  "combatant:l1-sdk-wizard-burning-hands",
);
const monkId = combatantId("combatant:l1-sdk-monk");
const monsterId = combatantId("combatant:l1-sdk-monster");
const secondMonsterId = combatantId("combatant:l1-sdk-second-monster");

const fighterSecondWindUnitId = "fighter_second_wind";
const barbarianRageUnitId = "barbarian_rage";
const bardBardicInspirationUnitId = "bard_bardic_inspiration";
const monkMartialArtsUnitId = "monk_martial_arts";
const rogueSneakAttackUnitId = "rogue_sneak_attack";
const rogueSneakAttackName = "Dagger";
const sorcererInnateSorceryUnitId = "sorcerer_innate_sorcery";
const sorcerousBurstSpellId = "sorcerous_burst";
const burningHandsSpellId = "burning_hands";
const fireBoltSpellId = "fire_bolt";

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
            "shocking_grasp",
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

function finalizedLevelOneSorcererFireBoltBuild(): CharacterBuild {
  const draft = createCharacterDraft({
    unitLibrary,
    draftId: characterDraftId("draft:l1-sdk-sorcerer-fire-bolt"),
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
          fireBoltSpellId,
          "light",
          "shocking_grasp",
          sorcerousBurstSpellId,
        ),
        creationChoiceFill(
          testUnitChoiceHoleId(
            "class_sorcerer",
            "class_prepared_spell_choices",
          ),
          burningHandsSpellId,
          "detect_magic",
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
      `Expected finalized Sorcerer Fire Bolt build, received ${creationFinalizationResultSummary(result)}`,
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
): CastActionSpellAct {
  const expectedInvocation = cantripSpellInvocationRef(
    spellId,
    "spellAttackDamage",
  );
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

function damageTypeChoiceFill(
  hole: Extract<BattleHole, { readonly kind: "damageTypeChoice" }>,
  value: Extract<BattleFill, { readonly kind: "damageTypeChoice" }>["value"],
): Extract<BattleFill, { readonly kind: "damageTypeChoice" }> {
  return { kind: "damageTypeChoice", holeId: hole.holeId, value };
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
