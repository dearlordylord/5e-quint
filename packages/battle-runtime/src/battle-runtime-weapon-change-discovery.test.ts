// KERNEL-COVERAGE: parity-witness BATTLE.ACTION.ATTACK_WEAPON_CHANGE BATTLE.ATTACK.THROWN_WEAPON_ATTACK
import { unitId } from "@dnd/shared/game-facts";
import { movementFeet } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";

import {
  admitCharacterWeaponAttackExecutionWeapon,
  attackRollFill,
  attackTargetSpatialFact,
  battleAbilityModifier,
  battleId,
  battleObjectId,
  battleTablePositionId,
  characterSeed,
  discoverBattleActCandidates,
  fighterId,
  goblinId,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  startBattleSessionRight,
  statBlockCreatureInit,
  targetFill,
  testSlingAttack,
  testSlingUnitRef,
  unitLibrary,
} from "./battle-runtime.test-support.ts";
import type { BattleFill } from "./battle-state-execution.ts";
import { battleAmmunitionStock } from "./battle-ammunition.ts";
import { battleGroundObjectState } from "./battle-reducer/object-custody-queries.ts";

const mainSpearId = battleObjectId("main:weapon_spear");
const offHandSpearId = battleObjectId("off:weapon_spear");
const droppedPosition = battleTablePositionId("unequipped-weapon-position");
const thrownPosition = battleTablePositionId("thrown-weapon-position");

function spearBattle(withOffHandWeapon = false) {
  const weapon = unitLibrary.requireUnit("weapon_spear");
  if (weapon.kind !== "weapon") throw new Error("Expected Spear fixture.");
  return startBattleSessionRight({
    battleId: battleId("weapon-change-discovery"),
    combatants: [
      characterSeed({
        initiative: 20,
        attack: {
          kind: "weapon",
          ...admitCharacterWeaponAttackExecutionWeapon(weapon, mainSpearId),
          ability: "str",
          abilityModifier: battleAbilityModifier(3),
        },
        ...(withOffHandWeapon
          ? {
              offHandAttack: {
                kind: "weapon" as const,
                ...admitCharacterWeaponAttackExecutionWeapon(
                  weapon,
                  offHandSpearId,
                ),
                ability: "str" as const,
                abilityModifier: battleAbilityModifier(3),
              },
            }
          : {}),
        selectedLoadout: {
          weapon: {
            itemId: mainSpearId,
            unitId: unitId("weapon_spear"),
            grip: "one_handed",
          },
          ...(withOffHandWeapon
            ? {
                offHandWeapon: {
                  itemId: offHandSpearId,
                  unitId: unitId("weapon_spear"),
                },
              }
            : {}),
        },
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  }).state;
}

function thrownAttacks(state: ReturnType<typeof spearBattle>) {
  return discoverBattleActCandidates(state).flatMap(
    ({ subject, initialHoles }) =>
      subject.tag === "action" &&
      subject.action === "attack" &&
      subject.attackAbility !== undefined &&
      subject.weaponDelivery === "thrown"
        ? [{ subject, initialHoles }]
        : [],
  );
}

function advertisedThrow(
  state: ReturnType<typeof spearBattle>,
  kind: "stow" | "drop",
  objectId: typeof mainSpearId,
) {
  const act = thrownAttacks(state).find(
    ({ subject }) =>
      subject.weaponChange?.kind === kind &&
      subject.weaponChange.objectId === objectId,
  );
  if (act === undefined)
    throw new Error("Expected advertised weapon change and throw.");
  return act;
}

function completeMiss(
  state: ReturnType<typeof spearBattle>,
  act: ReturnType<typeof advertisedThrow>,
) {
  const drop = act.initialHoles.find(
    (hole) => hole.kind === "weaponDropPosition",
  );
  const changeFills: BattleFill[] =
    drop === undefined
      ? []
      : [
          {
            kind: "weaponDropPosition",
            holeId: drop.holeId,
            value: { positionId: droppedPosition },
          },
        ];
  const subject = act.subject;
  const target = requireHole(
    resolveBattleSubject({ state, subject, fills: changeFills }),
    "targetChoice",
  );
  if (target.attack === undefined) throw new Error("Expected attack target.");
  const selected = targetFill(target, goblinId, [
    attackTargetSpatialFact(
      fighterId,
      goblinId,
      target.attack.selection,
      movementFeet(15),
    ),
    {
      kind: "rangedAttackEnemyProximity",
      attackerId: fighterId,
      procedureRef: subject.procedureRef,
      enemies: [],
    },
    {
      kind: "thrownWeaponLanding",
      attackerId: fighterId,
      procedureRef: subject.procedureRef,
      positionId: thrownPosition,
    },
  ]);
  const roll = requireHole(
    resolveBattleSubject({ state, subject, fills: [...changeFills, selected] }),
    "attackRoll",
  );
  return requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        ...changeFills,
        selected,
        attackRollFill(roll, { total: 7, naturalD20: 2 }),
      ],
    }),
  );
}

function slingWithOffHandSpear() {
  const weapon = unitLibrary.requireUnit("weapon_spear");
  if (weapon.kind !== "weapon") throw new Error("Expected Spear fixture.");
  return startBattleSessionRight({
    battleId: battleId("weapon-change-loading-hand"),
    combatants: [
      characterSeed({
        initiative: 20,
        characterUnitRefs: [testSlingUnitRef()],
        attack: testSlingAttack(),
        ammunitionStocks: [battleAmmunitionStock("sling_bullet", 20)],
        offHandAttack: {
          kind: "weapon",
          ...admitCharacterWeaponAttackExecutionWeapon(weapon, offHandSpearId),
          ability: "str",
          abilityModifier: battleAbilityModifier(3),
        },
        selectedLoadout: {
          weapon: {
            itemId: battleObjectId("main:weapon_sling"),
            unitId: unitId("weapon_sling"),
            grip: "one_handed",
          },
          offHandWeapon: {
            itemId: offHandSpearId,
            unitId: unitId("weapon_spear"),
          },
        },
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  }).state;
}

describe("weapon-change discovery preserves custody", () => {
  test("does not offer dropping a weapon and then throwing that same weapon", () => {
    const state = spearBattle();
    expect(
      thrownAttacks(state).some(
        ({ subject }) =>
          subject.weaponChange?.kind === "drop" &&
          subject.weaponChange.objectId === mainSpearId,
      ),
    ).toBe(false);
  });

  test("still offers and resolves stowing a weapon and drawing it as part of its throw", () => {
    const state = spearBattle();
    const resolved = completeMiss(
      state,
      advertisedThrow(state, "stow", mainSpearId),
    );
    expect(
      battleGroundObjectState(resolved.state, fighterId, mainSpearId)
        ?.positionId,
    ).toBe(thrownPosition);
  });

  test("still offers and resolves dropping another held weapon before the throw", () => {
    const state = spearBattle(true);
    const act = advertisedThrow(state, "drop", offHandSpearId);
    expect(act.initialHoles.map((hole) => hole.kind)).toContain(
      "weaponDropPosition",
    );
    const resolved = completeMiss(state, act);
    expect(
      battleGroundObjectState(resolved.state, fighterId, offHandSpearId)
        ?.positionId,
    ).toBe(droppedPosition);
    expect(
      battleGroundObjectState(resolved.state, fighterId, mainSpearId)
        ?.positionId,
    ).toBe(thrownPosition);
  });

  test("dropping the other weapon frees a real loading hand for an Ammunition attack", () => {
    const state = slingWithOffHandSpear();
    const actor = state.combatants.get(fighterId);
    if (actor?.origin.kind !== "character" || actor.origin.attack === null)
      throw new Error("Expected weapon-wielding fixture character.");
    const slingProcedure = actor.origin.attack.procedureRef;
    const acts = discoverBattleActCandidates(state);
    expect(
      acts.some(
        ({ subject }) =>
          subject.tag === "action" &&
          subject.action === "attack" &&
          subject.attackAbility !== undefined &&
          subject.procedureRef === slingProcedure &&
          subject.weaponChange === undefined,
      ),
    ).toBe(false);
    const act = acts.find(
      ({ subject }) =>
        subject.tag === "action" &&
        subject.action === "attack" &&
        subject.attackAbility !== undefined &&
        subject.procedureRef === slingProcedure &&
        subject.weaponChange?.kind === "drop" &&
        subject.weaponChange.objectId === offHandSpearId,
    );
    if (
      act?.subject.tag !== "action" ||
      act.subject.action !== "attack" ||
      act.subject.attackAbility === undefined
    )
      throw new Error("Expected drop and Sling attack.");
    const drop = act.initialHoles.find(
      (hole) => hole.kind === "weaponDropPosition",
    );
    if (drop === undefined)
      throw new Error("Expected advertised drop position.");
    const change: BattleFill = {
      kind: "weaponDropPosition",
      holeId: drop.holeId,
      value: { positionId: droppedPosition },
    };
    const subject = act.subject;
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [change] }),
      "targetChoice",
    );
    if (target.attack === undefined) throw new Error("Expected Sling target.");
    const selected = targetFill(target, goblinId, [
      attackTargetSpatialFact(
        fighterId,
        goblinId,
        target.attack.selection,
        movementFeet(15),
      ),
      {
        kind: "rangedAttackEnemyProximity",
        attackerId: fighterId,
        procedureRef: subject.procedureRef,
        enemies: [],
      },
    ]);
    const roll = requireHole(
      resolveBattleSubject({ state, subject, fills: [change, selected] }),
      "attackRoll",
    );
    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          change,
          selected,
          attackRollFill(roll, { total: 7, naturalD20: 2 }),
        ],
      }),
    );
    expect(
      battleGroundObjectState(resolved.state, fighterId, offHandSpearId)
        ?.positionId,
    ).toBe(droppedPosition);
    expect(resolved.state.combatants.get(fighterId)?.ammunitionStocks).toEqual([
      battleAmmunitionStock("sling_bullet", 19),
    ]);
  });
});
