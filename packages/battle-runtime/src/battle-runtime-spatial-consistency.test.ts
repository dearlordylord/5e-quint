import { prepareAttackRollInput } from "./battle-reducer/attack-roll-admission.ts";
import { requiredSpellAttackRollMode } from "./battle-reducer/attack-roll.ts";
import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import { battleCreatureStateWithKnockOutPreservedConditions } from "./battle-reducer/creature-hit-point-state.ts";
import {
  qualifyRangedAttackEnemyProximity,
  rangedAttackCloseCombatDisadvantage,
} from "./battle-reducer/ranged-attack-close-combat.ts";
import type { BattleSubject } from "./battle-runtime.test-support.ts";
import { combatantId } from "./identity.ts";
// KERNEL-COVERAGE: parity-witness BATTLE.ATTACK.RANGED_CLOSE_COMBAT_ROLL_MODE
import { expect, test } from "vitest";
import type { BattleTargetSpatialFact } from "./battle-state-execution.ts";
import {
  battleId,
  cantripSpellInvocationRef,
  characterSeed,
  characterSpellInvocationForProcedureRefForTest,
  endTurn,
  goblinId,
  movementFeet,
  requireCharacterSpellProcedureRefForTest,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  startBattleSessionRight,
  statBlockCreatureInit,
  snapshotBattle,
  targetFill,
  wizardId,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";

function spellAttack(readied: boolean) {
  const session = startBattleSessionRight({
    battleId: battleId("synthetic-spatial-spell"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        initiative: 20,
        attack: null,
        spellcasting: wizardSpellcasting(),
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
  const procedureRef = requireCharacterSpellProcedureRefForTest(
    session,
    wizardId,
    cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
  );
  const invocation = characterSpellInvocationForProcedureRefForTest(
    session,
    wizardId,
    procedureRef,
  );
  const cast: BattleSubject = {
    tag: "actionSpell",
    actorId: wizardId,
    procedureRef,
    mode: { tag: "cast" },
  };
  if (!readied)
    return {
      state: session.state,
      invocation,
      subject: cast,
      scope: { attackerId: wizardId, procedureRef },
    };
  const ready = requireResolved(
    resolveBattleSubject({
      state: session.state,
      subject: { ...cast, mode: { tag: "ready", trigger: "attackHit" } },
      fills: [],
    }),
  );
  const state = requireResolved(
    endTurn({ state: ready.state, actorId: wizardId }),
  ).state;
  const held = state.readiedSpells.get(wizardId);
  if (held === undefined) throw new Error("Expected the readied spell.");
  const subject: BattleSubject = {
    tag: "runtimeCommand",
    actorId: goblinId,
    command: "releaseReadiedSpell",
    readiedSpellCasterId: wizardId,
    procedureRef: held.procedureRef,
  };
  return {
    state,
    subject,
    invocation,
    scope: { attackerId: wizardId, procedureRef },
  };
}

for (const readied of [false, true]) {
  test.each([
    [5, 30],
    [30, 5],
  ])(
    `a ${readied ? "readied" : "cast"} ranged Spell Attack rejects contradictory target/enemy distances %s/%s without changing resources`,
    (distance, enemyDistance) => {
      const { state, subject } = spellAttack(readied);
      const hole = requireHole(
        resolveBattleSubject({ state, subject, fills: [] }),
        "targetChoice",
      );
      const fill = targetFill(hole, goblinId);
      const facts: readonly BattleTargetSpatialFact[] = (
        fill.spatialFacts ?? []
      ).map((fact) =>
        fact.kind === "spellTarget"
          ? { ...fact, distanceFeet: movementFeet(distance) }
          : fact.kind === "rangedAttackEnemyProximity"
            ? {
                ...fact,
                enemies: [
                  {
                    enemyId: goblinId,
                    distanceFeet: movementFeet(enemyDistance),
                    enemyCanSeeAttacker: true,
                  },
                ],
              }
            : fact,
      );
      const before = snapshotBattle(state);
      expect(
        resolveBattleSubject({
          state,
          subject,
          fills: [{ ...fill, spatialFacts: facts }],
        }),
      ).toMatchObject({
        tag: "invalid",
        reason: "invalidFill",
        message: expect.stringMatching(/distance/i),
      });
      expect(snapshotBattle(state)).toEqual(before);
    },
  );

  test.each([
    [5, "disadvantage"],
    [6, undefined],
    [30, undefined],
  ])(
    `a ${readied ? "readied" : "cast"} ranged Spell Attack preserves coherent %s-foot proximity`,
    (distance, mode) => {
      const { state, subject } = spellAttack(readied);
      const hole = requireHole(
        resolveBattleSubject({ state, subject, fills: [] }),
        "targetChoice",
      );
      const fill = targetFill(hole, goblinId);
      const facts = (fill.spatialFacts ?? []).map((fact) =>
        fact.kind === "spellTarget"
          ? { ...fact, distanceFeet: movementFeet(Number(distance)) }
          : fact.kind === "rangedAttackEnemyProximity"
            ? {
                ...fact,
                enemies: [
                  {
                    enemyId: goblinId,
                    distanceFeet: movementFeet(Number(distance)),
                    enemyCanSeeAttacker: true,
                  },
                ],
              }
            : fact,
      );
      expect(
        requireHole(
          resolveBattleSubject({
            state,
            subject,
            fills: [{ ...fill, spatialFacts: facts }],
          }),
          "attackRoll",
        ).rollMode,
      ).toBe(mode);
    },
  );
}

test.each(["missing", "unknownEnemy", "checkedEmpty"] as const)(
  "ranged spell proximity preserves %s evidence",
  (scenario) => {
    const { state, subject } = spellAttack(false);
    const hole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const fill = targetFill(hole, goblinId);
    const facts = (fill.spatialFacts ?? [])
      .filter(
        (fact) =>
          scenario !== "missing" || fact.kind !== "rangedAttackEnemyProximity",
      )
      .map((fact) =>
        fact.kind === "rangedAttackEnemyProximity" &&
        scenario === "unknownEnemy"
          ? {
              ...fact,
              enemies: [
                {
                  enemyId: combatantId("synthetic-absent-enemy"),
                  distanceFeet: movementFeet(5),
                  enemyCanSeeAttacker: true,
                },
              ],
            }
          : fact,
      );
    const result = resolveBattleSubject({
      state,
      subject,
      fills: [{ ...fill, spatialFacts: facts }],
    });
    if (scenario === "checkedEmpty")
      expect(requireHole(result, "attackRoll").rollMode).toBeUndefined();
    else
      expect(result).toMatchObject({ tag: "invalid", reason: "invalidFill" });
  },
);

test("admitted proximity uses live enemy conditions and rejects a vanished enemy", () => {
  const { state, scope } = spellAttack(false);
  const evidence = qualifyRangedAttackEnemyProximity({
    state,
    scope,
    facts: [
      {
        kind: "rangedAttackEnemyProximity",
        ...scope,
        enemies: [
          {
            enemyId: goblinId,
            distanceFeet: movementFeet(5),
            enemyCanSeeAttacker: true,
          },
        ],
      },
    ],
  });
  if (evidence.tag === "invalid") throw new Error(evidence.message);
  expect(rangedAttackCloseCombatDisadvantage(state, evidence)).toBe(true);
  const enemy = state.combatants.get(goblinId);
  if (enemy === undefined) throw new Error("Expected the admitted enemy.");
  const incapacitated = {
    ...state,
    combatants: new Map(state.combatants).set(
      goblinId,
      battleCreatureStateWithKnockOutPreservedConditions(
        enemy,
        applyCondition(enemy.conditions, "incapacitated"),
      ),
    ),
  };
  expect(rangedAttackCloseCombatDisadvantage(incapacitated, evidence)).toBe(
    false,
  );
  const withoutEnemy = new Map(state.combatants);
  withoutEnemy.delete(goblinId);
  expect(
    rangedAttackCloseCombatDisadvantage(
      { ...state, combatants: withoutEnemy },
      evidence,
    ),
  ).toMatchObject({ tag: "invalid" });
});

test.each([true, false])(
  "ranged spell same-pair sight claims with enemyCanSeeAttacker %s remain consistent",
  (enemyCanSeeAttacker) => {
    const { state, subject, scope } = spellAttack(false);
    const hole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const fill = targetFill(hole, goblinId);
    const facts: readonly BattleTargetSpatialFact[] = [
      ...(fill.spatialFacts ?? []).map((fact) =>
        fact.kind === "rangedAttackEnemyProximity"
          ? {
              ...fact,
              enemies: [
                {
                  enemyId: goblinId,
                  distanceFeet: movementFeet(30),
                  enemyCanSeeAttacker,
                },
              ],
            }
          : fact,
      ),
      {
        kind: "attackTargetCannotSeeAttacker",
        attackerId: scope.attackerId,
        targetId: goblinId,
      },
    ];
    const result = resolveBattleSubject({
      state,
      subject,
      fills: [{ ...fill, spatialFacts: facts }],
    });
    if (enemyCanSeeAttacker)
      expect(result).toMatchObject({
        tag: "invalid",
        reason: "invalidFill",
        message: expect.stringContaining("sight facts contradict"),
      });
    else expect(requireHole(result, "attackRoll").rollMode).toBe("advantage");
  },
);

test.each([5, 30])(
  "a ranged target's independent exact distance claims must agree (%s)",
  (otherDistance) => {
    const { state, scope } = spellAttack(false);
    const facts: readonly BattleTargetSpatialFact[] = [
      {
        kind: "spellTarget",
        casterId: scope.attackerId,
        sourceProcedureRef: scope.procedureRef,
        targetId: goblinId,
        distanceFeet: movementFeet(30),
      },
      {
        kind: "spellTarget",
        casterId: scope.attackerId,
        sourceProcedureRef: scope.procedureRef,
        targetId: goblinId,
        distanceFeet: movementFeet(otherDistance),
      },
      { kind: "rangedAttackEnemyProximity", ...scope, enemies: [] },
    ];
    const result = qualifyRangedAttackEnemyProximity({ state, scope, facts });
    if (otherDistance === 30) expect(result.tag).toBe("qualified");
    else
      expect(result).toMatchObject({
        tag: "invalid",
        message: expect.stringContaining("contradictory distances"),
      });
  },
);

test.each(["missing", "vanished"] as const)(
  "failed %s spatial evidence refuses a roll request",
  (scenario) => {
    const { state, scope, invocation } = spellAttack(false);
    const target = state.combatants.get(goblinId);
    if (target === undefined) throw new Error("Expected the admitted target.");
    const evidence = qualifyRangedAttackEnemyProximity({
      state,
      scope,
      facts: [
        {
          kind: "rangedAttackEnemyProximity",
          ...scope,
          enemies: [
            {
              enemyId: goblinId,
              distanceFeet: movementFeet(30),
              enemyCanSeeAttacker: true,
            },
          ],
        },
      ],
    });
    if (evidence.tag === "invalid") throw new Error(evidence.message);
    const combatants = new Map(state.combatants);
    combatants.delete(goblinId);
    const currentState =
      scenario === "vanished" ? { ...state, combatants } : state;
    const requiredRollMode = requiredSpellAttackRollMode(
      currentState,
      wizardId,
      target,
      invocation,
      [],
      scenario === "missing" ? null : evidence,
    );
    const result = prepareAttackRollInput({
      errorState: currentState,
      requiredRollMode,
      attackRoll: undefined,
      requestRoll: () => {
        throw new Error(
          "A refused spatial calculation must not ask for a roll.",
        );
      },
    });
    expect(result).toMatchObject({
      tag: "result",
      result: {
        tag: "invalid",
        reason: "invalidFill",
        message:
          scenario === "missing"
            ? "Ranged spell attack requires admitted enemy proximity evidence."
            : "Admitted ranged attack enemy is no longer in the battle.",
      },
    });
  },
);
