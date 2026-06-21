import {
  combatantId,
  discoverBattleActs,
  endTurn,
  resolveBattleSubject,
  snapshotBattle,
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
  classUnitId,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import { Hp, movementFeet } from "@dnd/shared/types";
import type { UnitRecord } from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";

import {
  attackRollFill,
  attackSubject,
  attackTargetFill,
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
} from "./sdk-integration-test-support.ts";

const fighterId = combatantId("combatant:l1-sdk-fighter");
const barbarianId = combatantId("combatant:l1-sdk-barbarian");
const bardId = combatantId("combatant:l1-sdk-bard");
const inspiredAllyId = combatantId("combatant:l1-sdk-inspired-ally");
const rogueId = combatantId("combatant:l1-sdk-rogue");
const rogueAllyId = combatantId("combatant:l1-sdk-rogue-ally");
const monkId = combatantId("combatant:l1-sdk-monk");
const monsterId = combatantId("combatant:l1-sdk-monster");

const fighterSecondWindUnitId = "fighter_second_wind";
const barbarianRageUnitId = "barbarian_rage";
const bardBardicInspirationUnitId = "bard_bardic_inspiration";
const monkMartialArtsUnitId = "monk_martial_arts";
const rogueSneakAttackUnitId = "rogue_sneak_attack";
const rogueSneakAttackName = "Dagger";

describe("level 1 SDK RAW integration", () => {
  test("Fighter Second Wind heals through sheet projection and spends one Bonus Action use", () => {
    const state = battleFromSheets({
      battleIdText: "battle:l1-sdk-second-wind",
      characters: [
        characterSheet({
          characterIdText: "character:l1-sdk-second-wind",
          build: levelOneMartialBuild({
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
          build: levelOneMartialBuild({
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
          build: levelOneMartialBuild({
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
          build: levelOneMartialBuild({
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
          build: levelOneMartialBuild({
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
          build: levelOneMartialBuild({
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

  test("Monk Martial Arts projects a level-1 Bonus Action Unarmed Strike using the Martial Arts die and Dexterity", () => {
    const state = battleFromSheets({
      battleIdText: "battle:l1-sdk-martial-arts",
      characters: [
        characterSheet({
          characterIdText: "character:l1-sdk-martial-arts",
          build: levelOneMartialBuild({
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

type UnitFeatureSubject = Extract<
  BattleSubject,
  { readonly tag: "unitFeature" }
>;
type UnitFeatureAct = AvailableBattleAct & {
  readonly subject: UnitFeatureSubject;
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

function levelOneMartialBuild(input: {
  readonly classUnitId: UnitRecord["id"];
  readonly weaponUnitId?: UnitRecord["id"];
  readonly abilityScores?: Parameters<typeof abilityScoreAssignment>[0];
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
