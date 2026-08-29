import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import { movementFeet } from "@dnd/shared/types";
import * as Either from "effect/Either";
import * as Schema from "effect/Schema";
import { describe, expect, test } from "vitest";

import {
  attackBonus,
  attackDamageDispositionFill,
  battleAbilityModifier,
  battleId,
  battleProcedureExecutionRefForTest,
  battleObjectId,
  battleTablePositionId,
  characterSeed,
  attackDamageHoleAfterHit,
  attackInitialTargetHole,
  attackRollFill,
  attackRollHoleAfterTarget,
  damageRollFill,
  fighterId,
  fighterAttackSubject,
  fighterVsGoblinBattle,
  goblinId,
  recklessAttackFeature,
  requireHole,
  resolveBattleSubject,
  startBattleRight,
  statBlockCreatureInit,
  supportedBattleUnitRef,
  targetFill,
  attackTargetDistanceSpatialFact,
  attackTargetFill,
  testDaggerAttack,
  testLongswordAttack,
  testShortswordAttack,
  testCharacterD20Statistics,
  testUnarmedStrikeDieAttack,
  unitLibrary,
  wizardVsSkeletonBattle,
  skeletonId,
  wizardId,
} from "./battle-runtime.test-support.ts";
import { combatantId } from "./identity.ts";
import type { BattleTargetSpatialFact } from "./battle-state-execution.ts";
import { BattleHoleSchema } from "./battle-reducer/battle-codecs.ts";
import { spellTargetId } from "./unit-profile-admission-catalog.test-support.ts";
import { relentlessEnduranceBattle } from "./unit-profile-admission-feature-fixture.test-support.ts";
import { battleStateWithGroundObjects } from "./battle-reducer/battle-object-lifecycle.ts";
import { battleCreatureStateWithKnockOutPreservedConditions } from "./battle-reducer/creature-hit-point-state.ts";
import {
  attackDamageDispositionHole,
  attackDamageHole,
  attackActionOptionsForActor,
  damageDispositionFillValidation,
  damageDispositionFillsValidation,
  damageDispositionForTarget,
  heldWeaponItemIdForAttack,
  isLightMeleeWeapon,
  martialArtsBonusUnarmedStrikeActionOptionForActor,
  offHandAttackActionOptionsForActor,
  offHandAttackPrerequisiteMet,
  offHandWeaponItemIdForActor,
  zeroHitPointReplacementChoices,
} from "./battle-reducer/attack-damage-apply.ts";
import { attackExecutionSelectionForOption } from "./battle-action-options.ts";
import {
  attackExecutionSelectionMatchesOption,
  attackTargetDistanceFeet,
} from "./battle-reducer/attack-spatial.ts";
import { applyHpDamage } from "./battle-reducer/damage-apply.ts";
import {
  attackRollHole,
  attackRollOngoingFeatureActivationProfile,
  attackRollOngoingFeatureActivations,
  attackRollModeWithOptionalOngoingFeature,
  requiredAttackRollMode,
} from "./battle-reducer/attack-roll.ts";
import {
  compatibleAttackActionResource,
  spendAttackActionResource,
} from "./battle-reducer/attack-resolution.ts";

describe("battle runtime: attack pipeline boundaries", () => {
  test("attack holes project bound character attacks into the canonical unbound shape", () => {
    const state = fighterVsGoblinBattle();
    const fighter = state.combatants.get(fighterId);
    if (
      fighter?.origin.kind !== "character" ||
      fighter.origin.attack === null
    ) {
      throw new Error("Expected the fighter attack fixture.");
    }

    const holes = [
      attackRollHole(fighter, fighter.origin.attack),
      attackDamageHole(fighter.origin.attack),
    ];

    for (const hole of holes) {
      expect(hole.attack).not.toHaveProperty("procedureRef");
      expect(
        attackExecutionSelectionMatchesOption(
          attackExecutionSelectionForOption(fighter.origin.attack),
          hole.attack,
        ),
      ).toBe(false);
      expect(
        attackTargetDistanceFeet([], fighterId, goblinId, hole.attack),
      ).toBeNull();
      expect(
        Either.isRight(
          Schema.decodeUnknownEither(BattleHoleSchema, {
            onExcessProperty: "error",
          })(hole),
        ),
      ).toBe(true);
    }
  });

  test("damage disposition validation follows the discovered choice frontier", () => {
    const state = fighterVsGoblinBattle();
    const fighter = state.combatants.get(fighterId);
    const goblin = state.combatants.get(goblinId);
    if (
      fighter?.origin.kind !== "character" ||
      fighter.origin.attack === null ||
      goblin === undefined
    ) {
      throw new Error("Expected the fighter and goblin attack fixtures.");
    }

    const hole = attackDamageDispositionHole({
      attack: fighter.origin.attack,
      attackerId: fighterId,
      target: goblin,
      damageAmount: Number(goblin.hp),
    });
    if (hole === null) {
      throw new Error("Expected the damage disposition choice frontier.");
    }

    const ordinary = attackDamageDispositionFill(hole, {
      kind: "ordinaryDamage",
    });
    expect(
      damageDispositionFillsValidation({ holes: [hole], fills: [ordinary] }),
    ).toBeNull();
    expect(damageDispositionForTarget([hole], [], goblinId)).toEqual({
      kind: "ordinaryDamage",
    });
    expect(damageDispositionForTarget([hole], [ordinary], goblinId)).toEqual(
      ordinary.value,
    );

    const unknownHoleFill = {
      ...ordinary,
      holeId: holeId(`${hole.holeId}:unknown`),
    };
    expect(
      damageDispositionFillsValidation({
        holes: [hole],
        fills: [unknownHoleFill],
      }),
    ).toBe(
      "Damage disposition is only valid when damage offers a disposition choice.",
    );

    const invalidChoice = attackDamageDispositionFill(hole, {
      kind: "zeroHitPointReplacement",
      procedureRef: battleProcedureExecutionRefForTest("not-offered"),
    });
    expect(
      damageDispositionFillsValidation({
        holes: [hole],
        fills: [invalidChoice],
      }),
    ).toBe(
      "Damage disposition must match one of the currently offered choices.",
    );
    expect(
      damageDispositionFillValidation({
        hole: null,
        filled: false,
        value: ordinary.value,
      }),
    ).toBeNull();
    expect(
      damageDispositionFillValidation({
        hole: null,
        filled: true,
        value: ordinary.value,
      }),
    ).toBe(
      "Damage disposition is only valid when damage offers a disposition choice.",
    );
    expect(
      damageDispositionFillValidation({
        hole,
        filled: false,
        value: ordinary.value,
      }),
    ).toBeNull();
  });

  test("zero-hit-point replacement choices suppress positive, zero, massive, and non-character targets", () => {
    const replacementSession = relentlessEnduranceBattle({ targetHp: 3 });
    const target = replacementSession.state.combatants.get(spellTargetId);
    const goblin = fighterVsGoblinBattle().combatants.get(goblinId);
    if (target === undefined || goblin === undefined) {
      throw new Error("Expected the replacement target and goblin fixtures.");
    }

    expect(zeroHitPointReplacementChoices(target, 1)).toEqual([]);
    expect(zeroHitPointReplacementChoices(target, Number(target.hp))).toEqual([
      expect.objectContaining({ kind: "zeroHitPointReplacement" }),
    ]);
    const zeroHpTarget = applyHpDamage(target, Number(target.hp), {
      deathFailuresAtZeroHp: 1,
    });
    expect(zeroHitPointReplacementChoices(zeroHpTarget, 1)).toEqual([]);
    expect(
      zeroHitPointReplacementChoices(
        target,
        Number(target.hp) + Number(target.maxHp),
      ),
    ).toEqual([]);
    expect(zeroHitPointReplacementChoices(goblin, 1)).toEqual([]);
  });

  test("an attack can damage an already-zero target through the death lifecycle", () => {
    const state = startBattleRight({
      battleId: battleId("battle-attack-zero-target"),
      combatants: [
        characterSeed({ initiative: 20 }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 10,
          currentHp: 0,
          attack: null,
        }),
      ],
    });
    const subject = fighterAttackSubject(state, "Longsword");
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);
    const attackRoll = attackRollFill(rollHole, {
      total: 15,
      naturalD20: 10,
      rollMode: "advantage",
    });
    const damageHole = attackDamageHoleAfterHit(
      state,
      targetHole,
      rollHole,
      { total: 15, naturalD20: 10, rollMode: "advantage" },
      subject,
      goblinId,
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(targetHole, goblinId),
        attackRoll,
        damageRollFill(damageHole, 4),
      ],
    });
    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: goblinId,
            hp: 0,
            zeroHpLifecycle: {
              policy: "usesDeathSavingThrows",
              deathSaves: { successes: 0, failures: 1 },
              stable: false,
              dead: false,
            },
          }),
        ]),
      },
    });
  });

  test("attack option projection keeps character, Stat Block, and missing actors distinct", () => {
    const state = fighterVsGoblinBattle();

    expect(
      attackActionOptionsForActor(state, fighterId).length,
    ).toBeGreaterThan(0);
    expect(attackActionOptionsForActor(state, goblinId).length).toBeGreaterThan(
      0,
    );
    expect(
      attackActionOptionsForActor(state, combatantId("missing-attacker")),
    ).toEqual([]);
  });

  test("Martial Arts projection accepts a held Monk weapon in the off-hand", () => {
    const mainAttack = testDaggerAttack();
    const offHandAttack = {
      ...testDaggerAttack(),
      weaponObjectId: battleObjectId("off:weapon_dagger"),
    };
    const state = startBattleRight({
      battleId: battleId("battle-attack-projection-monk-off-hand"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "monk", level: 1 }],
          attack: mainAttack,
          offHandAttack,
          unarmedStrike: testUnarmedStrikeDieAttack(),
          characterUnitRefs: [
            supportedBattleUnitRef(
              unitLibrary.requireUnit("monk_martial_arts"),
            ),
          ],
          selectedLoadout: {
            weapon: {
              itemId: mainAttack.weaponObjectId,
              unitId: parseSharedUnitId("weapon_dagger"),
              grip: "one_handed",
            },
            offHandWeapon: {
              itemId: offHandAttack.weaponObjectId,
              unitId: parseSharedUnitId("weapon_dagger"),
            },
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });

    expect(
      martialArtsBonusUnarmedStrikeActionOptionForActor(state, fighterId),
    ).toMatchObject({ kind: "unarmedStrike" });
  });

  test("Light-property attack projection tracks held weapons, prerequisite, and non-character helper guards", () => {
    const mainAttack = testShortswordAttack();
    const offHandAttack = {
      ...testDaggerAttack(),
      weaponObjectId: battleObjectId("off:weapon_dagger"),
    };
    const state = startBattleRight({
      battleId: battleId("battle-attack-projection-light-property"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: mainAttack,
          offHandAttack,
          selectedLoadout: {
            weapon: {
              itemId: mainAttack.weaponObjectId,
              unitId: parseSharedUnitId("weapon_shortsword"),
              grip: "one_handed",
            },
            offHandWeapon: {
              itemId: offHandAttack.weaponObjectId,
              unitId: parseSharedUnitId("weapon_dagger"),
            },
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const actor = state.combatants.get(fighterId);
    if (
      actor?.origin.kind !== "character" ||
      actor.origin.offHandAttack === undefined
    ) {
      throw new Error("Expected the dual-wielding character fixture.");
    }

    const projected = offHandAttackActionOptionsForActor(state, fighterId);
    expect(projected.length).toBeGreaterThan(0);
    expect(
      offHandAttackPrerequisiteMet(
        state,
        fighterId,
        actor.origin.offHandAttack,
      ),
    ).toBe(false);
    const afterMainAttack = {
      ...state,
      currentTurnResources: {
        ...state.currentTurnResources,
        lightWeaponAttackMade: { weaponItemId: mainAttack.weaponObjectId },
      },
    };
    expect(
      offHandAttackPrerequisiteMet(
        afterMainAttack,
        fighterId,
        actor.origin.offHandAttack,
      ),
    ).toBe(true);
    expect(heldWeaponItemIdForAttack(state, fighterId, mainAttack)).toBe(
      mainAttack.weaponObjectId,
    );
    expect(
      heldWeaponItemIdForAttack(state, fighterId, actor.origin.offHandAttack),
    ).toBe(actor.origin.offHandAttack.weaponObjectId);
    expect(
      offHandWeaponItemIdForActor(state, fighterId, actor.origin.offHandAttack),
    ).toBe(actor.origin.offHandAttack.weaponObjectId);
    expect(
      offHandWeaponItemIdForActor(state, goblinId, actor.origin.offHandAttack),
    ).toBe(undefined);
    expect(
      offHandAttackPrerequisiteMet(state, goblinId, actor.origin.offHandAttack),
    ).toBe(false);
    expect(isLightMeleeWeapon(mainAttack.weapon)).toBe(true);
    expect(isLightMeleeWeapon(testLongswordAttack().weapon)).toBe(false);
    expect(
      martialArtsBonusUnarmedStrikeActionOptionForActor(state, goblinId),
    ).toBe(undefined);
    expect(
      martialArtsBonusUnarmedStrikeActionOptionForActor(
        state,
        combatantId("missing-monk"),
      ),
    ).toBeUndefined();
  });

  test("Light-property projection handles alternate abilities and a dropped off-hand weapon", () => {
    const mainAttack = testShortswordAttack();
    const offHandWeaponObjectId = battleObjectId("off:weapon_dagger");
    const offHandAttack = {
      ...testDaggerAttack(),
      weaponObjectId: offHandWeaponObjectId,
      ability: "dex",
      abilityModifier: battleAbilityModifier(-1),
      alternateAbilityChoices: [
        {
          ability: "dex",
          abilityModifier: battleAbilityModifier(-1),
          attackBonus: attackBonus(1),
          damageAbilityModifier: battleAbilityModifier(-1),
        },
        {
          ability: "str",
          abilityModifier: battleAbilityModifier(3),
          attackBonus: attackBonus(5),
          damageAbilityModifier: battleAbilityModifier(3),
        },
      ],
    } satisfies ReturnType<typeof testDaggerAttack>;
    const input = {
      battleId: battleId("battle-attack-projection-dropped-off-hand"),
      combatants: [
        characterSeed({
          initiative: 20,
          d20Statistics: testCharacterD20Statistics({ str: 16, dex: 8 }),
          attack: mainAttack,
          offHandAttack,
          selectedLoadout: {
            weapon: {
              itemId: mainAttack.weaponObjectId,
              unitId: parseSharedUnitId("weapon_shortsword"),
              grip: "one_handed",
            },
            offHandWeapon: {
              itemId: offHandWeaponObjectId,
              unitId: parseSharedUnitId("weapon_dagger"),
            },
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    };
    const state = startBattleRight(input);
    const projected = offHandAttackActionOptionsForActor(state, fighterId);
    expect(projected).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "weapon",
          ability: "dex",
          damageAbilityModifier: battleAbilityModifier(-1),
        }),
        expect.objectContaining({
          kind: "weapon",
          ability: "str",
          damageAbilityModifier: battleAbilityModifier(0),
        }),
      ]),
    );

    const dropped = battleStateWithGroundObjects(state, [
      {
        actorId: fighterId,
        objectId: offHandWeaponObjectId,
        positionId: battleTablePositionId("attack-projection-off-hand-drop"),
        source: {
          kind: "spell",
          sourceCombatantId: fighterId,
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            "attack-projection-off-hand-drop",
          ),
        },
      },
    ]);
    if (dropped.tag !== "applied") {
      throw new Error("Expected the off-hand weapon drop to apply.");
    }
    expect(
      offHandAttackActionOptionsForActor(dropped.state, fighterId),
    ).toEqual([]);
    const actor = state.combatants.get(fighterId);
    if (
      actor?.origin.kind !== "character" ||
      actor.origin.offHandAttack === undefined
    ) {
      throw new Error("Expected the dual-wielding character fixture.");
    }
    expect(
      offHandWeaponItemIdForActor(
        dropped.state,
        fighterId,
        actor.origin.offHandAttack,
      ),
    ).toBeUndefined();
  });

  test("attack-roll sources cancel an optional advantage activation", () => {
    const state = fighterVsGoblinBattle();
    const fighter = state.combatants.get(fighterId);
    if (
      fighter?.origin.kind !== "character" ||
      fighter.origin.attack === null
    ) {
      throw new Error("Expected the fighter weapon attack fixture.");
    }
    const attack = fighter.origin.attack;
    const activationRef = battleProcedureExecutionRefForTest(
      "synthetic-attack-roll-activation",
    );

    const poisonedFighter = battleCreatureStateWithKnockOutPreservedConditions(
      fighter,
      applyCondition(fighter.conditions, "poisoned"),
    );
    const poisonedState = {
      ...state,
      combatants: new Map(state.combatants).set(fighterId, poisonedFighter),
    };
    expect(
      requiredAttackRollMode(poisonedState, fighterId, goblinId, attack, []),
    ).toBe("disadvantage");
    expect(
      attackRollModeWithOptionalOngoingFeature(
        poisonedState,
        fighterId,
        goblinId,
        attack,
        [],
        activationRef,
      ),
    ).toBe("normal");

    const helperId = combatantId("synthetic-helper");
    const helpBattle = startBattleRight({
      battleId: battleId("battle-attack-roll-help-cancellation"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ combatantId: helperId, initiative: 15 }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
      ],
    });
    const helpFighter = helpBattle.combatants.get(fighterId);
    if (
      helpFighter?.origin.kind !== "character" ||
      helpFighter.origin.attack === null
    ) {
      throw new Error("Expected the helped fighter weapon attack fixture.");
    }
    const helpedAttack = helpFighter.origin.attack;
    const poisonedHelpFighter =
      battleCreatureStateWithKnockOutPreservedConditions(
        helpFighter,
        applyCondition(helpFighter.conditions, "poisoned"),
      );
    const helpedState = {
      ...helpBattle,
      combatants: new Map(helpBattle.combatants).set(
        fighterId,
        poisonedHelpFighter,
      ),
      helpAttacks: [
        {
          helperId,
          allyId: fighterId,
          targetEnemyId: goblinId,
          expiresAt: { kind: "startOfTurn" as const, combatantId: helperId },
        },
      ],
    };
    expect(
      requiredAttackRollMode(
        helpedState,
        fighterId,
        goblinId,
        helpedAttack,
        [],
      ),
    ).toBe("normal");
    expect(
      attackRollModeWithOptionalOngoingFeature(
        helpedState,
        fighterId,
        goblinId,
        helpedAttack,
        [],
        activationRef,
      ),
    ).toBe("normal");
    expect(
      attackRollModeWithOptionalOngoingFeature(
        state,
        fighterId,
        goblinId,
        attack,
        [],
        activationRef,
      ),
    ).toBe("advantage");
    expect(attackRollHole(undefined, attack)).not.toHaveProperty(
      "missToHitReplacement",
    );
  });

  test.each([
    [movementFeet(5), "advantage"],
    [movementFeet(6), "disadvantage"],
  ] as const)(
    "derives the Prone target attack-roll mode from %s feet",
    (distanceFeet, expectedMode) => {
      const state = fighterVsGoblinBattle();
      const fighter = state.combatants.get(fighterId);
      const goblin = state.combatants.get(goblinId);
      if (
        fighter?.origin.kind !== "character" ||
        fighter.origin.attack === null ||
        goblin === undefined
      ) {
        throw new Error("Expected the fighter attack and goblin fixtures.");
      }
      const subject = fighterAttackSubject(state);
      const targetHole = requireHole(
        resolveBattleSubject({ state, subject, fills: [] }),
        "targetChoice",
      );
      if (targetHole.attack === undefined) {
        throw new Error("Expected the attack target selection.");
      }
      const proneGoblin = battleCreatureStateWithKnockOutPreservedConditions(
        goblin,
        applyCondition(goblin.conditions, "prone"),
      );
      const proneState = {
        ...state,
        combatants: new Map(state.combatants).set(goblinId, proneGoblin),
      };
      expect(
        requiredAttackRollMode(
          proneState,
          fighterId,
          goblinId,
          fighter.origin.attack,
          [
            attackTargetDistanceSpatialFact(
              fighterId,
              goblinId,
              targetHole.attack.selection,
              distanceFeet,
            ),
          ],
        ),
      ).toBe(expectedMode);
    },
  );

  test("does not infer Prone attack-roll mode without its required runtime facts", () => {
    const state = fighterVsGoblinBattle();
    const fighter = state.combatants.get(fighterId);
    const goblin = state.combatants.get(goblinId);
    if (
      fighter?.origin.kind !== "character" ||
      fighter.origin.attack === null ||
      goblin === undefined
    ) {
      throw new Error("Expected the fighter attack and goblin fixtures.");
    }
    const proneGoblin = battleCreatureStateWithKnockOutPreservedConditions(
      goblin,
      applyCondition(goblin.conditions, "prone"),
    );
    const proneState = {
      ...state,
      combatants: new Map(state.combatants).set(goblinId, proneGoblin),
    };

    expect(
      requiredAttackRollMode(
        proneState,
        fighterId,
        goblinId,
        fighter.origin.attack,
        [],
      ),
    ).toBeUndefined();
    expect(
      requiredAttackRollMode(proneState, fighterId, goblinId, undefined, []),
    ).toBeUndefined();
    expect(
      requiredAttackRollMode(
        proneState,
        fighterId,
        combatantId("absent-target"),
        fighter.origin.attack,
        [],
      ),
    ).toBeUndefined();
  });

  test("requires an exact attack selection for target distance", () => {
    type AttackTargetDistanceFact = Extract<
      BattleTargetSpatialFact,
      { readonly kind: "attackTargetDistance" }
    >;
    const characterState = fighterVsGoblinBattle();
    const characterAttack = attackActionOptionsForActor(
      characterState,
      fighterId,
    ).find((attack) => attack.kind === "weapon");
    if (characterAttack === undefined || characterAttack.kind !== "weapon") {
      throw new Error("Expected the bound fighter weapon attack.");
    }
    const characterSelection =
      attackExecutionSelectionForOption(characterAttack);
    const characterDistance: AttackTargetDistanceFact = {
      kind: "attackTargetDistance",
      actorId: fighterId,
      targetId: goblinId,
      ...characterSelection,
      distanceFeet: movementFeet(5),
    };
    const conflictingCharacterAbility: AttackTargetDistanceFact = {
      ...characterDistance,
      attackAbility:
        characterSelection.attackAbility === "dex"
          ? ("str" as const)
          : ("dex" as const),
      distanceFeet: movementFeet(100),
    };
    const conflictingCharacterDamage: AttackTargetDistanceFact = {
      ...characterDistance,
      attackDamageType:
        characterSelection.attackDamageType === "slashing"
          ? ("piercing" as const)
          : ("slashing" as const),
      distanceFeet: movementFeet(100),
    };

    expect(
      attackTargetDistanceFeet(
        [
          conflictingCharacterAbility,
          conflictingCharacterDamage,
          characterDistance,
        ],
        fighterId,
        goblinId,
        characterAttack,
      ),
    ).toEqual(movementFeet(5));
    expect(
      attackTargetDistanceFeet(
        [conflictingCharacterDamage],
        fighterId,
        goblinId,
        characterAttack,
      ),
    ).toBeNull();
    expect(
      attackTargetDistanceFeet(
        [conflictingCharacterAbility, conflictingCharacterDamage],
        fighterId,
        goblinId,
        characterAttack,
      ),
    ).toBeNull();
    expect(
      attackTargetDistanceFeet(
        [
          characterDistance,
          conflictingCharacterDamage,
          conflictingCharacterAbility,
        ],
        fighterId,
        goblinId,
        characterAttack,
      ),
    ).toEqual(movementFeet(5));

    const statBlockState = wizardVsSkeletonBattle().state;
    const statBlockAttack = attackActionOptionsForActor(
      statBlockState,
      skeletonId,
    ).find((attack) => attack.kind === "statBlockAttack");
    if (statBlockAttack?.kind !== "statBlockAttack") {
      throw new Error("Expected a bound Stat Block attack.");
    }
    const statBlockSelection =
      attackExecutionSelectionForOption(statBlockAttack);
    const statBlockDistance: AttackTargetDistanceFact = {
      kind: "attackTargetDistance",
      actorId: skeletonId,
      targetId: wizardId,
      ...statBlockSelection,
      distanceFeet: movementFeet(5),
    };
    const conflictingStatBlockNotation: AttackTargetDistanceFact =
      statBlockAttack.damageNotation === "rolled"
        ? {
            ...statBlockDistance,
            statBlockDamageNotation: "static" as const,
            distanceFeet: movementFeet(100),
          }
        : {
            kind: "attackTargetDistance",
            actorId: skeletonId,
            targetId: wizardId,
            procedureRef: statBlockSelection.procedureRef,
            distanceFeet: movementFeet(100),
          };
    expect(
      attackTargetDistanceFeet(
        [conflictingStatBlockNotation, statBlockDistance],
        skeletonId,
        wizardId,
        statBlockAttack,
      ),
    ).toEqual(movementFeet(5));
    expect(
      attackTargetDistanceFeet(
        [statBlockDistance, conflictingStatBlockNotation],
        skeletonId,
        wizardId,
        statBlockAttack,
      ),
    ).toEqual(movementFeet(5));
    expect(
      attackTargetDistanceFeet(
        [conflictingStatBlockNotation],
        skeletonId,
        wizardId,
        statBlockAttack,
      ),
    ).toBeNull();
  });

  test("composes Prone distance with other attack-roll sources", () => {
    const state = fighterVsGoblinBattle();
    const fighter = state.combatants.get(fighterId);
    const goblin = state.combatants.get(goblinId);
    if (
      fighter?.origin.kind !== "character" ||
      fighter.origin.attack === null ||
      goblin === undefined
    ) {
      throw new Error("Expected the fighter attack and goblin fixtures.");
    }
    const subject = fighterAttackSubject(state);
    const targetHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    if (targetHole.attack === undefined) {
      throw new Error("Expected the attack target selection.");
    }
    const proneGoblin = battleCreatureStateWithKnockOutPreservedConditions(
      goblin,
      applyCondition(goblin.conditions, "prone"),
    );
    const poisonedFighter = battleCreatureStateWithKnockOutPreservedConditions(
      fighter,
      applyCondition(fighter.conditions, "poisoned"),
    );
    const composedState = {
      ...state,
      combatants: new Map(state.combatants)
        .set(goblinId, proneGoblin)
        .set(fighterId, poisonedFighter),
    };
    expect(
      requiredAttackRollMode(
        composedState,
        fighterId,
        goblinId,
        fighter.origin.attack,
        [
          attackTargetDistanceSpatialFact(
            fighterId,
            goblinId,
            targetHole.attack.selection,
            movementFeet(5),
          ),
        ],
      ),
    ).toBe("normal");
    const helpedState = {
      ...composedState,
      helpAttacks: [
        {
          helperId: combatantId("synthetic-helper"),
          allyId: fighterId,
          targetEnemyId: goblinId,
          expiresAt: { kind: "startOfTurn" as const, combatantId: fighterId },
        },
      ],
    };
    expect(
      requiredAttackRollMode(
        helpedState,
        fighterId,
        goblinId,
        fighter.origin.attack,
        [
          attackTargetDistanceSpatialFact(
            fighterId,
            goblinId,
            targetHole.attack.selection,
            movementFeet(6),
          ),
        ],
      ),
    ).toBe("normal");
  });

  test("rejects a normal fill against a Prone target within five feet", () => {
    const state = fighterVsGoblinBattle();
    const goblin = state.combatants.get(goblinId);
    if (goblin === undefined) {
      throw new Error("Expected the goblin fixture.");
    }
    const proneState = {
      ...state,
      combatants: new Map(state.combatants).set(
        goblinId,
        battleCreatureStateWithKnockOutPreservedConditions(
          goblin,
          applyCondition(goblin.conditions, "prone"),
        ),
      ),
    };
    const subject = fighterAttackSubject(proneState);
    const targetHole = requireHole(
      resolveBattleSubject({ state: proneState, subject, fills: [] }),
      "targetChoice",
    );
    const target = attackTargetFill(
      targetHole,
      fighterId,
      goblinId,
      undefined,
      [],
      movementFeet(5),
    );
    const attackRoll = requireHole(
      resolveBattleSubject({ state: proneState, subject, fills: [target] }),
      "attackRoll",
    );
    expect(attackRoll).toMatchObject({ rollMode: "advantage" });
    expect(
      resolveBattleSubject({
        state: proneState,
        subject,
        fills: [
          target,
          attackRollFill(attackRoll, {
            total: 16,
            naturalD20: 14,
            rollMode: "normal",
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Attack roll mode does not match the current attack-roll rule.",
    });
  });

  test("a real first-attack ongoing feature projects and replays its activation profile", () => {
    const state = startBattleRight({
      battleId: battleId("battle-attack-roll-ongoing-profile"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 2 }],
          unitFeatures: [recklessAttackFeature()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const fighter = state.combatants.get(fighterId);
    if (
      fighter?.origin.kind !== "character" ||
      fighter.origin.attack === null
    ) {
      throw new Error("Expected the Reckless Attack character fixture.");
    }
    const attack = fighter.origin.attack;
    const activations = attackRollOngoingFeatureActivations(
      state,
      fighterId,
      attack,
    );
    expect(activations).toHaveLength(1);
    const activation = activations[0];
    if (activation === undefined) {
      throw new Error("Expected the admitted first-attack activation.");
    }
    expect(
      attackRollOngoingFeatureActivationProfile(
        state,
        fighterId,
        attack,
        activation.procedureRef,
        false,
      ),
    ).toMatchObject({
      procedureRef: activation.procedureRef,
      execution: {
        kind: "ongoingFeature",
        activationTrigger: "firstAttackRoll",
      },
    });
    expect(
      attackRollOngoingFeatureActivationProfile(
        state,
        fighterId,
        attack,
        undefined,
        false,
      ),
    ).toBeNull();

    const subject = fighterAttackSubject(state);
    const target = attackInitialTargetHole(state, subject);
    const roll = attackRollHoleAfterTarget(state, target, subject);
    const activated = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(roll, {
          total: 15,
          naturalD20: 10,
          rollMode: "advantage",
          activatedOngoingFeatureProcedureRef: activation.procedureRef,
        }),
      ],
    });
    expect(activated.tag).toBe("needsHoles");
    if (activated.tag !== "needsHoles") {
      throw new Error("Expected the activated attack to continue to damage.");
    }
    expect(
      attackRollOngoingFeatureActivationProfile(
        activated.state,
        fighterId,
        attack,
        activation.procedureRef,
        false,
      ),
    ).toBeNull();
    expect(
      attackRollOngoingFeatureActivationProfile(
        activated.state,
        fighterId,
        attack,
        activation.procedureRef,
        true,
      ),
    ).toMatchObject({
      procedureRef: activation.procedureRef,
      execution: { kind: "ongoingFeature" },
    });
  });

  test("attack action resources prefer extra attacks, then restricted resources", () => {
    const extraAttack = {
      kind: "action" as const,
      source: "classFeatureExtraAttack" as const,
      sourceOwnerId: fighterId,
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic-extra-attack",
      ),
      restriction: { kind: "none" as const },
    };
    const restricted = {
      kind: "action" as const,
      source: "unit" as const,
      sourceOwnerId: fighterId,
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic-restricted-attack",
      ),
      restriction: { kind: "exclude" as const, actions: ["magic"] as const },
    };
    const turn = { kind: "action" as const, source: "turn" as const };

    expect(compatibleAttackActionResource([])).toBeNull();
    expect(compatibleAttackActionResource([turn, restricted])).toMatchObject({
      resource: restricted,
      index: 1,
    });
    expect(compatibleAttackActionResource([turn, extraAttack])).toMatchObject({
      resource: extraAttack,
      index: 1,
    });
    expect(
      compatibleAttackActionResource([turn, restricted, extraAttack]),
    ).toMatchObject({ resource: extraAttack, index: 2 });

    const state = fighterVsGoblinBattle();
    const noResourceState = {
      ...state.currentTurnResources,
      actionResources: [],
    };
    const unavailable = spendAttackActionResource(noResourceState);
    expect(unavailable).toEqual(Either.left("no action resource available"));

    const spent = spendAttackActionResource({
      ...state.currentTurnResources,
      actionResources: [turn],
    });
    expect(spent).toMatchObject({
      _tag: "Right",
      right: {
        spentResource: turn,
        state: { actionTakenThisTurn: true },
      },
    });

    const spentExtraAttack = spendAttackActionResource({
      ...state.currentTurnResources,
      actionResources: [extraAttack],
    });
    expect(spentExtraAttack).toMatchObject({
      _tag: "Right",
      right: { state: { actionTakenThisTurn: false } },
    });

    const spentUnitAction = spendAttackActionResource({
      ...state.currentTurnResources,
      actionResources: [restricted],
    });
    expect(spentUnitAction).toMatchObject({
      _tag: "Right",
      right: { state: { actionTakenThisTurn: true } },
    });
  });
});
// KERNEL-COVERAGE: parity-witness BATTLE.ATTACK.PRONE_TARGET_ROLL_MODE
