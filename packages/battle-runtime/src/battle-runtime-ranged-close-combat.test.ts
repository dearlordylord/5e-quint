// KERNEL-COVERAGE: parity-witness BATTLE.ATTACK.RANGED_CLOSE_COMBAT_ROLL_MODE
// SRD 5.2.1 "Ranged Attacks in Close Combat" for weapon and Stat Block
// attacks on creatures: one table-supplied enemy proximity fact per ranged
// attack, the same fact ranged Spell Attacks use.
import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import type { Condition } from "@dnd/shared/types";
import { movementFeet, type MovementFeet } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";
import { battleCreatureStateWithKnockOutPreservedConditions } from "./battle-reducer/creature-hit-point-state.ts";
import type { BattleState, BattleTargetSpatialFact } from "./index.ts";
import {
  attackExecutionSelectionForSubjectForTest,
  battleProcedureExecutionRefForTest,
  endTurn,
  fighterAttackSubject,
  fighterId,
  fighterVsGoblinBattle,
  goblinAttackSubject,
  goblinId,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  targetFill,
} from "./battle-runtime.test-support.ts";

type ProximityEnemy = Extract<
  BattleTargetSpatialFact,
  { readonly kind: "rangedAttackEnemyProximity" }
>["enemies"][number];

function goblinTurn(): BattleState {
  return requireResolved(
    endTurn({ state: fighterVsGoblinBattle(), actorId: fighterId }),
  ).state;
}

function withFighterCondition(
  state: BattleState,
  condition: Condition,
): BattleState {
  const fighter = state.combatants.get(fighterId);
  if (fighter === undefined) throw new Error("Expected the fighter.");
  return {
    ...state,
    combatants: new Map(state.combatants).set(
      fighterId,
      battleCreatureStateWithKnockOutPreservedConditions(
        fighter,
        applyCondition(fighter.conditions, condition),
      ),
    ),
  };
}

function fighterWithin5Feet(
  overrides: Partial<ProximityEnemy> = {},
): ProximityEnemy {
  return {
    enemyId: fighterId,
    distanceFeet: movementFeet(5),
    enemyCanSeeAttacker: true,
    ...overrides,
  };
}

function shortbowAttack(input: {
  readonly state: BattleState;
  readonly distanceFeet?: MovementFeet;
  readonly proximity: readonly BattleTargetSpatialFact[];
}) {
  const subject = goblinAttackSubject(input.state, "Shortbow");
  const hole = requireHole(
    resolveBattleSubject({ state: input.state, subject, fills: [] }),
    "targetChoice",
  );
  return resolveBattleSubject({
    state: input.state,
    subject,
    fills: [
      {
        kind: "targetChoice",
        holeId: hole.holeId,
        value: fighterId,
        spatialFacts: [
          {
            kind: "attackTargetDistance",
            actorId: goblinId,
            targetId: fighterId,
            ...attackExecutionSelectionForSubjectForTest(subject),
            distanceFeet: input.distanceFeet ?? movementFeet(5),
          },
          ...input.proximity,
        ],
      },
    ],
  });
}

function shortbowProximity(
  state: BattleState,
  enemies: readonly ProximityEnemy[],
): BattleTargetSpatialFact {
  return {
    kind: "rangedAttackEnemyProximity",
    attackerId: goblinId,
    procedureRef: goblinAttackSubject(state, "Shortbow").procedureRef,
    enemies,
  };
}

function rollModeOf(result: ReturnType<typeof resolveBattleSubject>) {
  return requireHole(result, "attackRoll").rollMode;
}

describe("battle runtime: Ranged Attacks in Close Combat", () => {
  test("a ranged weapon attack has Disadvantage when its 5-foot target can see the attacker", () => {
    const state = goblinTurn();
    expect(
      rollModeOf(
        shortbowAttack({
          state,
          proximity: [shortbowProximity(state, [fighterWithin5Feet()])],
        }),
      ),
    ).toBe("disadvantage");
  });

  test("an enemy other than the target counts, independently of the target", () => {
    const state = goblinTurn();
    expect(
      rollModeOf(
        shortbowAttack({
          state,
          distanceFeet: movementFeet(30),
          proximity: [shortbowProximity(state, [fighterWithin5Feet()])],
        }),
      ),
    ).toBe("disadvantage");
  });

  test("a Prone target 5 feet away cancels the close-combat Disadvantage", () => {
    const state = withFighterCondition(goblinTurn(), "prone");
    expect(
      rollModeOf(
        shortbowAttack({
          state,
          proximity: [shortbowProximity(state, [fighterWithin5Feet()])],
        }),
      ),
    ).toBe("normal");
  });

  test("no qualifying enemy leaves the roll normal", () => {
    const state = goblinTurn();
    for (const enemies of [
      [],
      [fighterWithin5Feet({ enemyCanSeeAttacker: false })],
      [fighterWithin5Feet({ distanceFeet: movementFeet(10) })],
    ]) {
      expect(
        rollModeOf(
          shortbowAttack({
            state,
            proximity: [shortbowProximity(state, enemies)],
          }),
        ),
      ).toBeUndefined();
    }
  });

  test("an Incapacitated enemy within 5 feet doesn't impose Disadvantage", () => {
    const state = withFighterCondition(goblinTurn(), "incapacitated");
    expect(
      rollModeOf(
        shortbowAttack({
          state,
          distanceFeet: movementFeet(30),
          proximity: [shortbowProximity(state, [fighterWithin5Feet()])],
        }),
      ),
    ).toBeUndefined();
  });

  test("a ranged weapon attack requires exactly one proximity fact scoped to the attack", () => {
    const state = goblinTurn();
    const message =
      "Ranged attack target requires one scoped enemy proximity qualification; supply enemies: [] only after checking no enemies qualify.";
    const scoped = shortbowProximity(state, []);
    if (scoped.kind !== "rangedAttackEnemyProximity") return;
    for (const proximity of [
      [],
      [scoped, scoped],
      [
        {
          ...scoped,
          procedureRef: battleProcedureExecutionRefForTest("another-attack"),
        },
      ],
      [{ ...scoped, attackerId: fighterId }],
      [{ ...scoped, enemies: [fighterWithin5Feet(), fighterWithin5Feet()] }],
      [{ ...scoped, enemies: [fighterWithin5Feet({ enemyId: goblinId })] }],
    ]) {
      expect(shortbowAttack({ state, proximity })).toMatchObject({
        tag: "invalid",
        reason: "invalidFill",
        message,
      });
    }
  });

  test("a melee weapon attack needs no proximity fact", () => {
    const state = fighterVsGoblinBattle();
    const subject = fighterAttackSubject(state);
    const hole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    expect(hole.attack?.targetConstraint.kind).toBe("meleeReach");
    const result = resolveBattleSubject({
      state,
      subject,
      fills: [targetFill(hole, goblinId)],
    });
    expect(result).toMatchObject({ tag: "needsHoles" });
    expect(rollModeOf(result)).toBeUndefined();
  });
});
