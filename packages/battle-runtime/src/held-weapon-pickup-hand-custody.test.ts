// KERNEL-COVERAGE: parity-witness BATTLE.ACTION.OBJECT_INTERACTION_COST
import { unitId } from "@dnd/shared/game-facts";
import { describe, expect, it } from "vitest";
import type { CharacterBattleLoadoutRef } from "./character-creature-execution-facts.ts";
import type { BattleHand, BattleState } from "./battle-state-execution.ts";
import type { BattleObjectId } from "./identity.ts";
import {
  battleId,
  battleObjectId,
  battleProcedureExecutionRefForTest,
  battleTablePositionId,
  characterSeed,
  discoverBattleActCandidates,
  fighterGrapplesGoblin,
  fighterId,
  goblinId,
  requireResolved,
  startBattleRight,
  statBlockCreatureInit,
  testDaggerAttack,
} from "./battle-runtime.test-support.ts";
import { battleStateWithGroundObjects } from "./battle-reducer/battle-object-lifecycle.ts";
import { pickUpLoadoutWeapon } from "./loadout-weapon-pickup.test-support.ts";
import { battleObjectIsOnGround } from "./battle-reducer/object-custody-queries.ts";
import { characterEffectiveLoadout } from "./battle-reducer/character-effective-loadout.ts";
import { combatantHandUses } from "./battle-reducer/creature-state-leaves.ts";
import { isCharacterBattleCreatureState } from "./battle-reducer/creature-state-queries.ts";
import { objectInteractionRulingHole } from "./battle-reducer/object-interaction.ts";
import { battleCreatureWithSpellCreatedHeldObjectHand } from "./battle-reducer/spell-created-held-object.ts";
import { resolveBattleSubject, snapshotBattle } from "./index.ts";

const swordId = battleObjectId("main:weapon_longsword");
const daggerId = battleObjectId("off:weapon_dagger");

function groundedWeapon(
  loadout: CharacterBattleLoadoutRef,
  objectId: BattleObjectId,
) {
  const state = startBattleRight({
    battleId: battleId("synthetic-pickup-hand-custody"),
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
  const placed = battleStateWithGroundObjects(state, [
    {
      actorId: fighterId,
      objectId,
      positionId: battleTablePositionId("synthetic-fallen-weapon"),
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

function actor(state: BattleState) {
  const fighter = state.combatants.get(fighterId);
  if (fighter === undefined || !isCharacterBattleCreatureState(fighter)) {
    throw new Error("Expected character Fighter.");
  }
  return fighter;
}

function pickup(state: BattleState, objectId: BattleObjectId) {
  const hole = objectInteractionRulingHole(state, fighterId);
  return resolveBattleSubject({
    state,
    subject: {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "pickUpHeldWeapon",
      objectId,
    },
    fills: [
      {
        kind: "objectInteractionRuling",
        holeId: hole.holeId,
        value: { requiresUtilize: false },
      },
    ],
  });
}

function expectOccupiedPickupRefused(
  state: BattleState,
  objectId: BattleObjectId,
) {
  const before = snapshotBattle(state);
  expect(
    discoverBattleActCandidates(state).some(
      (act) =>
        act.subject.tag === "runtimeCommand" &&
        act.subject.command === "pickUpHeldWeapon" &&
        act.subject.objectId === objectId,
    ),
  ).toBe(false);
  expect(pickUpLoadoutWeapon(state, fighterId, objectId)).toMatchObject({
    tag: "invalid",
    reason: "handsOccupied",
  });
  expect(pickup(state, objectId)).toMatchObject({
    tag: "invalid",
    reason: "staleSubject",
    snapshot: before,
  });
  expect(snapshotBattle(state)).toEqual(before);
  expect(battleObjectIsOnGround(state, fighterId, objectId)).toBe(true);
}

function withSpellHeldObject(
  state: BattleState,
  hand: BattleHand,
): BattleState {
  return {
    ...state,
    combatants: new Map(state.combatants).set(
      fighterId,
      battleCreatureWithSpellCreatedHeldObjectHand(actor(state), hand),
    ),
  };
}

describe("selected weapon pickup hand custody", () => {
  it("restores a sword in its free hand beside a shield and charges once", () => {
    const before = groundedWeapon(
      {
        weapon: {
          itemId: swordId,
          unitId: unitId("weapon_longsword"),
          grip: "one_handed",
        },
        shield: {
          itemId: battleObjectId("shield:equipment_shield"),
          unitId: unitId("equipment_shield"),
        },
      },
      swordId,
    );
    const after = requireResolved(pickup(before, swordId)).state;
    expect(characterEffectiveLoadout(after, actor(after)).weapon?.itemId).toBe(
      swordId,
    );
    expect(after.currentTurnResources.objectInteraction).toBe("spent");
    expect(after.objectCustody.has(fighterId)).toBe(false);
    expect(combatantHandUses(after, actor(after), after.grapples)).toEqual({
      left: "shield",
      right: "mainWeapon",
    });
  });

  it("refuses the sword hand occupied by an actual Grapple without releasing or charging", () => {
    const fallen = groundedWeapon(
      {
        weapon: {
          itemId: swordId,
          unitId: unitId("weapon_longsword"),
          grip: "one_handed",
        },
        shield: {
          itemId: battleObjectId("shield:equipment_shield"),
          unitId: unitId("equipment_shield"),
        },
      },
      swordId,
    );
    const state = fighterGrapplesGoblin(fallen).state;
    expect(state.grapples).toContainEqual(
      expect.objectContaining({
        grapplerId: fighterId,
        targetId: goblinId,
        hand: "right",
      }),
    );
    expectOccupiedPickupRefused(state, swordId);
  });

  it("does not substitute a free left hand for the selected main weapon's occupied right hand", () => {
    const state = withSpellHeldObject(
      groundedWeapon(
        {
          weapon: {
            itemId: swordId,
            unitId: unitId("weapon_longsword"),
            grip: "one_handed",
          },
        },
        swordId,
      ),
      "right",
    );
    expect(combatantHandUses(state, actor(state), state.grapples)).toEqual({
      left: "free",
      right: "spellCreatedHeldObject",
    });
    expectOccupiedPickupRefused(state, swordId);
  });

  it("restores an off-hand weapon only to its free left hand", () => {
    const free = groundedWeapon(
      { offHandWeapon: { itemId: daggerId, unitId: unitId("weapon_dagger") } },
      daggerId,
    );
    const after = requireResolved(pickup(free, daggerId)).state;
    expect(
      characterEffectiveLoadout(after, actor(after)).offHandWeapon?.itemId,
    ).toBe(daggerId);
    const occupied = withSpellHeldObject(free, "left");
    expect(
      combatantHandUses(occupied, actor(occupied), occupied.grapples),
    ).toEqual({ left: "spellCreatedHeldObject", right: "free" });
    expectOccupiedPickupRefused(occupied, daggerId);
  });

  it("restores the selected weapon in one hand while preserving an actual Grapple", () => {
    const fallen = groundedWeapon(
      {
        weapon: {
          itemId: swordId,
          unitId: unitId("weapon_longsword"),
          grip: "two_handed",
        },
      },
      swordId,
    );
    const state = fighterGrapplesGoblin(fallen).state;
    expect(combatantHandUses(state, actor(state), state.grapples)).toEqual({
      left: "grapple",
      right: "free",
    });
    const after = requireResolved(pickup(state, swordId)).state;
    expect(after.grapples).toEqual(state.grapples);
    expect(combatantHandUses(after, actor(after), after.grapples)).toEqual({
      left: "grapple",
      right: "mainWeapon",
    });
    expect(actor(after).origin.selectedLoadout.weapon?.grip).toBe("one_handed");
    expect(after.currentTurnResources.objectInteraction).toBe("spent");
    expect(battleObjectIsOnGround(after, fighterId, swordId)).toBe(false);
  });

  it.each(["left", "right"] as const)(
    "preserves the occupied %s hand when restoring a two-handed selection",
    (hand) => {
      const free = groundedWeapon(
        {
          weapon: {
            itemId: swordId,
            unitId: unitId("weapon_longsword"),
            grip: "two_handed",
          },
        },
        swordId,
      );
      const restored = requireResolved(pickup(free, swordId)).state;
      expect(
        combatantHandUses(restored, actor(restored), restored.grapples),
      ).toEqual({ left: "mainWeapon", right: "mainWeapon" });
      const occupied = withSpellHeldObject(free, hand);
      if (hand === "right") {
        expectOccupiedPickupRefused(occupied, swordId);
        return;
      }
      const after = requireResolved(pickup(occupied, swordId)).state;
      expect(combatantHandUses(after, actor(after), after.grapples)).toEqual({
        left: "spellCreatedHeldObject",
        right: "mainWeapon",
      });
      expect(actor(after).origin.selectedLoadout.weapon?.grip).toBe(
        "one_handed",
      );
      expect(actor(after).armorClass.leftHandUse).toBe(
        actor(occupied).armorClass.leftHandUse,
      );
      expect(after.currentTurnResources.objectInteraction).toBe("spent");
      expect(battleObjectIsOnGround(after, fighterId, swordId)).toBe(false);
    },
  );
});
