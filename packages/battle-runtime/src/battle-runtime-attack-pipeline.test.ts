import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";

import {
  attackDamageDispositionFill,
  battleId,
  battleProcedureExecutionRefForTest,
  battleObjectId,
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
  resolveBattleSubject,
  startBattleRight,
  statBlockCreatureInit,
  targetFill,
  testDaggerAttack,
  testLongswordAttack,
  testShortswordAttack,
} from "./battle-runtime.test-support.ts";
import { combatantId } from "./identity.ts";
import { battleCreatureStateWithKnockOutPreservedConditions } from "./battle-reducer/creature-hit-point-state.ts";
import {
  attackDamageDispositionHole,
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
import { applyHpDamage } from "./battle-reducer/damage-apply.ts";
import {
  attackRollHole,
  attackRollModeWithOptionalOngoingFeature,
  requiredAttackRollMode,
} from "./battle-reducer/attack-roll.ts";
import {
  compatibleAttackActionResource,
  spendAttackActionResource,
} from "./battle-reducer/attack-resolution.ts";

describe("battle runtime: attack pipeline boundaries", () => {
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
    const state = fighterVsGoblinBattle();
    const fighter = state.combatants.get(fighterId);
    const goblin = state.combatants.get(goblinId);
    if (fighter === undefined || goblin === undefined) {
      throw new Error("Expected the fighter and goblin fixtures.");
    }

    expect(zeroHitPointReplacementChoices(fighter, 1)).toEqual([]);
    const zeroHpFighter = applyHpDamage(fighter, Number(fighter.hp), {
      deathFailuresAtZeroHp: 1,
    });
    expect(zeroHitPointReplacementChoices(zeroHpFighter, 1)).toEqual([]);
    expect(
      zeroHitPointReplacementChoices(fighter, Number(fighter.maxHp) + 1),
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
    });
    const damageHole = attackDamageHoleAfterHit(
      state,
      targetHole,
      rollHole,
      { total: 15, naturalD20: 10 },
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
          expect.objectContaining({ combatantId: goblinId, hp: 0 }),
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

  test("Light-property attack projection tracks held weapons and its prerequisite", () => {
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
      requiredAttackRollMode(poisonedState, fighterId, goblinId, attack),
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
    ).toBeUndefined();

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
      requiredAttackRollMode(helpedState, fighterId, goblinId, helpedAttack),
    ).toBe(undefined);
    expect(
      attackRollModeWithOptionalOngoingFeature(
        helpedState,
        fighterId,
        goblinId,
        helpedAttack,
        [],
        activationRef,
      ),
    ).toBeUndefined();
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

    const state = fighterVsGoblinBattle();
    const noResourceState = {
      ...state.currentTurnResources,
      actionResources: [],
    };
    const unavailable = spendAttackActionResource(noResourceState);
    expect(Either.isLeft(unavailable)).toBe(true);

    const spent = spendAttackActionResource({
      ...state.currentTurnResources,
      actionResources: [turn],
    });
    expect(spent).toMatchObject({
      _tag: "Right",
      right: { spentResource: turn },
    });
  });
});
