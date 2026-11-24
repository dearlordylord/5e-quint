// KERNEL-COVERAGE: parity-witness BATTLE.EQUIPMENT.WEAPON_GRIP_CHANGE
import { unitId } from "@dnd/shared/game-facts";
import type { WeaponGrip } from "@dnd/shared/types";
import { describe, expect, it } from "vitest";
import type { CharacterBattleLoadoutRef } from "./character-creature-execution-facts.ts";
import type { BattleState } from "./battle-state-execution.ts";
import type { BattleObjectId } from "./identity.ts";
import {
  attackDamageHoleAfterHit,
  attackInitialTargetHole,
  attackRollHoleAfterTarget,
  battleId,
  battleObjectId,
  battleProcedureExecutionRefForTest,
  battleTablePositionId,
  characterSeed,
  discoverBattleActCandidates,
  fighterAttackSubject,
  fighterGrapplesGoblin,
  fighterId,
  goblinId,
  requireResolved,
  startBattleRight,
  statBlockCreatureInit,
  testDaggerAttack,
  testGreataxeAttack,
} from "./battle-runtime.test-support.ts";
import { battleStateWithGroundObjects } from "./battle-reducer/battle-object-lifecycle.ts";
import { pickUpLoadoutWeapon } from "./loadout-weapon-pickup.test-support.ts";
import { characterEffectiveLoadout } from "./battle-reducer/character-effective-loadout.ts";
import { combatantHandUses } from "./battle-reducer/creature-state-leaves.ts";
import { isCharacterBattleCreatureState } from "./battle-reducer/creature-state-queries.ts";
import { battleCreatureWithSpellCreatedHeldObjectHand } from "./battle-reducer/spell-created-held-object.ts";
import { weaponGripChangeAdmission } from "./battle-reducer/weapon-grip.ts";
import { resolveBattleSubject, snapshotBattle } from "./index.ts";

const swordId = battleObjectId("main:weapon_longsword");
const daggerId = battleObjectId("off:weapon_dagger");
const shieldId = battleObjectId("shield:equipment_shield");

const longsword = (grip: WeaponGrip) => ({
  itemId: swordId,
  unitId: unitId("weapon_longsword"),
  grip,
});

function battle(loadout: CharacterBattleLoadoutRef): BattleState {
  return startBattleRight({
    battleId: battleId("synthetic-weapon-grip"),
    combatants: [
      characterSeed({
        initiative: 20,
        selectedLoadout: loadout,
        ...(loadout.offHandWeapon === undefined
          ? {}
          : { offHandAttack: testDaggerAttack() }),
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

function actor(state: BattleState) {
  const fighter = state.combatants.get(fighterId);
  if (fighter === undefined || !isCharacterBattleCreatureState(fighter)) {
    throw new Error("Expected character Fighter.");
  }
  return fighter;
}

function hands(state: BattleState) {
  return combatantHandUses(state, actor(state), state.grapples);
}

function changeGrip(state: BattleState, grip: WeaponGrip) {
  return resolveBattleSubject({
    state,
    subject: {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "changeWeaponGrip",
      grip,
    },
    fills: [],
  });
}

function offeredGrips(state: BattleState): readonly WeaponGrip[] {
  return discoverBattleActCandidates(state).flatMap((act) =>
    act.subject.tag === "runtimeCommand" &&
    act.subject.command === "changeWeaponGrip"
      ? [act.subject.grip]
      : [],
  );
}

function refusalReason(state: BattleState, grip: WeaponGrip) {
  const admission = weaponGripChangeAdmission(state, actor(state), grip);
  return admission._tag === "Failure" ? admission.failure.reason : null;
}

function expectRefused(
  state: BattleState,
  grip: WeaponGrip,
  reason: string,
  invalidReason: "staleSubject" | "wrongActor" = "staleSubject",
) {
  const before = snapshotBattle(state);
  expect(offeredGrips(state)).not.toContain(grip);
  expect(refusalReason(state, grip)).toBe(reason);
  expect(changeGrip(state, grip)).toMatchObject({
    tag: "invalid",
    reason: invalidReason,
    snapshot: before,
  });
}

function longswordDamageHole(state: BattleState) {
  const subject = fighterAttackSubject(state);
  const targetHole = attackInitialTargetHole(state, subject);
  const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);
  return attackDamageHoleAfterHit(
    state,
    targetHole,
    rollHole,
    { total: 15, naturalD20: 10 },
    subject,
  );
}

function withDropped(state: BattleState, objectId: BattleObjectId) {
  const placed = battleStateWithGroundObjects(state, [
    {
      actorId: fighterId,
      objectId,
      positionId: battleTablePositionId("synthetic-dropped-object"),
      source: {
        kind: "spell",
        sourceCombatantId: goblinId,
        sourceProcedureRef:
          battleProcedureExecutionRefForTest("synthetic-drop"),
      },
    },
  ]);
  if (placed.tag !== "applied") throw new Error(placed.message);
  return placed.state;
}

describe("changing a weapon grip during a battle", () => {
  it("takes a Versatile weapon in both hands and back, with no cost, and derives hands and damage", () => {
    const oneHanded = battle({ weapon: longsword("one_handed") });
    expect(offeredGrips(oneHanded)).toEqual(["two_handed"]);
    expect(hands(oneHanded)).toEqual({ left: "free", right: "mainWeapon" });
    expect(longswordDamageHole(oneHanded)).toMatchObject({
      damageDice: { groups: [{ dice: 1, dieSize: 8 }] },
    });

    const twoHanded = requireResolved(
      changeGrip(oneHanded, "two_handed"),
    ).state;
    expect(
      characterEffectiveLoadout(twoHanded, actor(twoHanded)).weapon?.grip,
    ).toBe("two_handed");
    expect(hands(twoHanded)).toEqual({
      left: "mainWeapon",
      right: "mainWeapon",
    });
    expect(twoHanded.currentTurnResources).toEqual(
      oneHanded.currentTurnResources,
    );
    expect(offeredGrips(twoHanded)).toEqual(["one_handed"]);
    expect(longswordDamageHole(twoHanded)).toMatchObject({
      damageDice: { groups: [{ dice: 1, dieSize: 10 }] },
    });

    const back = requireResolved(changeGrip(twoHanded, "one_handed")).state;
    expect(hands(back)).toEqual({ left: "free", right: "mainWeapon" });
    expect(longswordDamageHole(back)).toMatchObject({
      damageDice: { groups: [{ dice: 1, dieSize: 8 }] },
    });
  });

  it("refuses a two-handed grip while the other hand holds a shield or grapples", () => {
    expectRefused(
      battle({
        weapon: longsword("one_handed"),
        shield: { itemId: shieldId, unitId: unitId("equipment_shield") },
      }),
      "two_handed",
      "handOccupied",
    );
    const grappling = fighterGrapplesGoblin(
      battle({ weapon: longsword("one_handed") }),
    ).state;
    expect(hands(grappling)).toEqual({ left: "grapple", right: "mainWeapon" });
    expectRefused(grappling, "two_handed", "handOccupied");
    const start = battle({ weapon: longsword("one_handed") });
    const holdingSpellObject: BattleState = {
      ...start,
      combatants: new Map(start.combatants).set(
        fighterId,
        battleCreatureWithSpellCreatedHeldObjectHand(actor(start), "left"),
      ),
    };
    expect(hands(holdingSpellObject)).toEqual({
      left: "spellCreatedHeldObject",
      right: "mainWeapon",
    });
    expectRefused(holdingSpellObject, "two_handed", "handOccupied");
  });

  it("offers and makes a grip change under Command's Halt, since it is neither a move nor an action", () => {
    const start = battle({ weapon: longsword("one_handed") });
    const halted: BattleState = {
      ...start,
      currentTurnResources: {
        ...start.currentTurnResources,
        compelledHalt: { kind: "compelledHalt" },
      },
    };
    expect(offeredGrips(halted)).toEqual(["two_handed"]);
    const changed = requireResolved(changeGrip(halted, "two_handed")).state;
    expect(
      characterEffectiveLoadout(changed, actor(changed)).weapon?.grip,
    ).toBe("two_handed");
  });

  it("frees the off hand of a dropped off-hand weapon, which then can't be picked up until the grip is one-handed again", () => {
    const dropped = withDropped(
      battle({
        weapon: longsword("one_handed"),
        offHandWeapon: { itemId: daggerId, unitId: unitId("weapon_dagger") },
      }),
      daggerId,
    );
    const twoHanded = requireResolved(changeGrip(dropped, "two_handed")).state;
    expect(hands(twoHanded)).toEqual({
      left: "mainWeapon",
      right: "mainWeapon",
    });
    expect(pickUpLoadoutWeapon(twoHanded, fighterId, daggerId)).toMatchObject({
      tag: "invalid",
      reason: "handsOccupied",
    });

    const oneHanded = requireResolved(
      changeGrip(twoHanded, "one_handed"),
    ).state;
    expect(hands(oneHanded)).toEqual({ left: "free", right: "mainWeapon" });
    const pickedUp = pickUpLoadoutWeapon(oneHanded, fighterId, daggerId);
    if (pickedUp.tag !== "applied") throw new Error(pickedUp.message);
    expect(hands(pickedUp.state)).toEqual({
      left: "offWeapon",
      right: "mainWeapon",
    });
  });

  it("gives a dropped off-hand weapon no hand while the main weapon's grip is two-handed, even with the main weapon dropped too", () => {
    const twoHanded = requireResolved(
      changeGrip(
        withDropped(
          battle({
            weapon: longsword("one_handed"),
            offHandWeapon: {
              itemId: daggerId,
              unitId: unitId("weapon_dagger"),
            },
          }),
          daggerId,
        ),
        "two_handed",
      ),
    ).state;
    const bothDropped = withDropped(twoHanded, swordId);
    expect(hands(bothDropped)).toEqual({ left: "free", right: "free" });
    expect(pickUpLoadoutWeapon(bothDropped, fighterId, daggerId)).toMatchObject(
      { tag: "invalid", reason: "handsOccupied" },
    );
    const swordBack = pickUpLoadoutWeapon(bothDropped, fighterId, swordId);
    if (swordBack.tag !== "applied") throw new Error(swordBack.message);
    expect(hands(swordBack.state)).toEqual({
      left: "mainWeapon",
      right: "mainWeapon",
    });
  });

  it("keeps a Two-Handed weapon in two hands", () => {
    const state = startBattleRight({
      battleId: battleId("synthetic-weapon-grip-two-handed"),
      combatants: [
        characterSeed({ initiative: 20, attack: testGreataxeAttack() }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(hands(state)).toEqual({ left: "mainWeapon", right: "mainWeapon" });
    expectRefused(state, "one_handed", "twoHandedWeapon");
  });

  it("refuses a grip the weapon already has, a dropped weapon, and another creature's turn", () => {
    const state = battle({ weapon: longsword("one_handed") });
    expectRefused(state, "one_handed", "alreadyHeldWithGrip");
    expectRefused(
      withDropped(state, swordId),
      "two_handed",
      "noHeldMainWeapon",
    );
    const goblinTurn = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "runtimeCommand",
          actorId: fighterId,
          command: "endTurn",
        },
        fills: [],
      }),
    ).state;
    expectRefused(goblinTurn, "two_handed", "notOwnTurn", "wrongActor");
    const goblin = goblinTurn.combatants.get(goblinId);
    if (goblin === undefined) throw new Error("Expected the Goblin.");
    expect(
      weaponGripChangeAdmission(goblinTurn, goblin, "two_handed"),
    ).toMatchObject({
      _tag: "Failure",
      failure: { reason: "actorNotCharacter" },
    });
  });

  it("refuses a grip change while the character can't act or Battle can't tell its main weapon", () => {
    const incapacitated = startBattleRight({
      battleId: battleId("synthetic-weapon-grip-incapacitated"),
      combatants: [
        characterSeed({
          initiative: 20,
          selectedLoadout: { weapon: longsword("one_handed") },
          conditions: ["incapacitated"],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(offeredGrips(incapacitated)).toEqual([]);
    expect(refusalReason(incapacitated, "two_handed")).toBe("cannotAct");

    const unknownAttack = startBattleRight({
      battleId: battleId("synthetic-weapon-grip-unknown-attack"),
      combatants: [
        characterSeed({
          initiative: 20,
          selectedLoadout: { weapon: longsword("one_handed") },
          attack: null,
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expectRefused(unknownAttack, "two_handed", "mainWeaponAttackUnknown");
  });
});
