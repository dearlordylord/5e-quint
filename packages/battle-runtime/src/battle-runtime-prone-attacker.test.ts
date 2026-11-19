// KERNEL-COVERAGE: parity-witness BATTLE.ATTACK.PRONE_ATTACKER_ROLL_MODE
import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import { armorClass } from "@dnd/shared-algebras/armor-class-algebra";
import { Hp, movementFeet } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";
import {
  attackRollFill,
  attackTargetDistanceSpatialFact,
  attackTargetFill,
  fighterAttackSubject,
  fighterId,
  fighterVsGoblinBattle,
  goblinId,
  requireHole,
  resolveBattleSubject,
} from "./battle-runtime.test-support.ts";
import { battleObjectId, type CombatantId } from "./identity.ts";
import type { BattleFill, BattleState } from "./battle-state-execution.ts";
import { battleCreatureStateWithKnockOutPreservedConditions } from "./battle-reducer/creature-hit-point-state.ts";
import { requiredAttackRollMode } from "./battle-reducer/attack-roll.ts";

// RAW: .references/srd-5.2.1/rules-glossary.md#Prone, "Attacks Affected.":
// "You have Disadvantage on attack rolls. An attack roll against you has
// Advantage if the attacker is within 5 feet of you. Otherwise, that attack
// roll has Disadvantage."

function withProne(
  state: BattleState,
  ...ids: readonly CombatantId[]
): BattleState {
  const combatants = new Map(state.combatants);
  for (const id of ids) {
    const creature = state.combatants.get(id);
    if (creature === undefined) {
      throw new Error(`Expected combatant ${id}.`);
    }
    combatants.set(
      id,
      battleCreatureStateWithKnockOutPreservedConditions(
        creature,
        applyCondition(creature.conditions, "prone"),
      ),
    );
  }
  return { ...state, combatants };
}

function fighterAttackRollMode(state: BattleState, distanceFeet: number) {
  const fighter = state.combatants.get(fighterId);
  if (fighter?.origin.kind !== "character" || fighter.origin.attack === null) {
    throw new Error("Expected the fighter attack fixture.");
  }
  const targetHole = requireHole(
    resolveBattleSubject({
      state,
      subject: fighterAttackSubject(state),
      fills: [],
    }),
    "targetChoice",
  );
  if (targetHole.attack === undefined) {
    throw new Error("Expected the attack target selection.");
  }
  return requiredAttackRollMode(
    state,
    fighterId,
    goblinId,
    fighter.origin.attack,
    [
      attackTargetDistanceSpatialFact(
        fighterId,
        goblinId,
        targetHole.attack.selection,
        movementFeet(distanceFeet),
      ),
    ],
  );
}

describe("battle runtime: a Prone attacker's attack rolls", () => {
  test("have Disadvantage against a creature within 5 feet", () => {
    expect(fighterAttackRollMode(fighterVsGoblinBattle(), 5)).toBeUndefined();
    expect(
      fighterAttackRollMode(withProne(fighterVsGoblinBattle(), fighterId), 5),
    ).toBe("disadvantage");
  });

  test("compose with a Prone target's distance source before cancellation", () => {
    const bothProne = withProne(fighterVsGoblinBattle(), fighterId, goblinId);
    expect(fighterAttackRollMode(bothProne, 5)).toBe("normal");
    expect(fighterAttackRollMode(bothProne, 6)).toBe("disadvantage");
  });

  test("require Disadvantage on the attack-roll hole and reject a normal fill", () => {
    const state = withProne(fighterVsGoblinBattle(), fighterId);
    const subject = fighterAttackSubject(state);
    const target = attackTargetFill(
      requireHole(
        resolveBattleSubject({ state, subject, fills: [] }),
        "targetChoice",
      ),
      fighterId,
      goblinId,
    );
    const attackRoll = requireHole(
      resolveBattleSubject({ state, subject, fills: [target] }),
      "attackRoll",
    );
    expect(attackRoll).toMatchObject({ rollMode: "disadvantage" });
    expect(
      resolveBattleSubject({
        state,
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

  test("have Disadvantage against an object", () => {
    const state = withProne(fighterVsGoblinBattle(), fighterId);
    const subject = fighterAttackSubject(state, "Longsword");
    const targetHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const objectId = battleObjectId("synthetic_prone_attacker_target");
    const target = {
      kind: "objectTargetChoice",
      holeId: targetHole.holeId,
      value: objectId,
      spatialFacts: [
        {
          kind: "attackObjectTarget",
          actorId: fighterId,
          objectId,
          range: { kind: "meleeReach" },
          attackerCanSeeObject: true,
          cover: "none",
          armorClass: armorClass(15),
          damageDisposition: { kind: "hitPoints", hitPoints: Hp(30) },
        },
      ],
    } as const satisfies BattleFill;
    expect(
      requireHole(
        resolveBattleSubject({ state, subject, fills: [target] }),
        "attackRoll",
      ),
    ).toMatchObject({ rollMode: "disadvantage" });
  });
});
