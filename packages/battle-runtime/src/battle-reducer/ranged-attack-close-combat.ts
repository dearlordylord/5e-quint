// KERNEL-COVERAGE: runtime-owner BATTLE.ATTACK.RANGED_CLOSE_COMBAT_ROLL_MODE
// Ranged Attacks in Close Combat: one table-supplied enemy proximity fact for
// every ranged attack roll on a creature, whether a weapon, a Stat Block attack
// or a spell makes it, and for ranged spell attacks on objects. Weapon and Stat
// Block attacks on objects still read attackObjectTarget's range boolean.
import { isIncapacitated } from "@dnd/shared-algebras/conditions-algebra";
import type {
  BattleState,
  BattleTargetSpatialFact,
} from "../battle-state-execution.ts";
import type { BattleProcedureExecutionRef, CombatantId } from "../identity.ts";
import { RANGED_ATTACK_ENEMY_PROXIMITY_FEET } from "./domain-constants.ts";

type RangedAttackEnemyProximityFact = Extract<
  BattleTargetSpatialFact,
  { readonly kind: "rangedAttackEnemyProximity" }
>;

/** The attack a proximity fact answers for: its attacker and procedure. */
export type RangedAttackEnemyProximityScope = {
  readonly attackerId: CombatantId;
  readonly procedureRef: BattleProcedureExecutionRef;
};

function rangedAttackEnemyProximityFacts(
  facts: readonly BattleTargetSpatialFact[],
): readonly RangedAttackEnemyProximityFact[] {
  return facts.filter(
    (fact): fact is RangedAttackEnemyProximityFact =>
      fact.kind === "rangedAttackEnemyProximity",
  );
}

/**
 * A ranged attack needs exactly one proximity fact, scoped to its attacker and
 * procedure, naming each enemy once. `enemies: []` means the table checked and
 * found none; a missing fact is refused rather than read as "no enemy near".
 */
export function rangedAttackEnemyProximityQualificationIssue(input: {
  readonly state: BattleState;
  readonly scope: RangedAttackEnemyProximityScope;
  readonly facts: readonly BattleTargetSpatialFact[];
}): { readonly tag: "invalid"; readonly message: string } | null {
  const qualifications = rangedAttackEnemyProximityFacts(input.facts);
  const qualification = qualifications[0];
  if (
    qualifications.length !== 1 ||
    qualification === undefined ||
    qualification.attackerId !== input.scope.attackerId ||
    qualification.procedureRef !== input.scope.procedureRef ||
    new Set(qualification.enemies.map((enemy) => enemy.enemyId)).size !==
      qualification.enemies.length ||
    qualification.enemies.some(
      (enemy) =>
        enemy.enemyId === input.scope.attackerId ||
        !input.state.combatants.has(enemy.enemyId),
    )
  ) {
    return {
      tag: "invalid",
      message:
        "Ranged attack target requires one scoped enemy proximity qualification; supply enemies: [] only after checking no enemies qualify.",
    };
  }
  return null;
}

/**
 * SRD 5.2.1 "Ranged Attacks in Close Combat": Disadvantage when an enemy within
 * 5 feet can see the attacker and doesn't have the Incapacitated condition.
 */
export function rangedAttackCloseCombatDisadvantage(
  state: BattleState,
  scope: RangedAttackEnemyProximityScope,
  facts: readonly BattleTargetSpatialFact[],
): boolean {
  return rangedAttackEnemyProximityFacts(facts).some(
    (fact) =>
      fact.attackerId === scope.attackerId &&
      fact.procedureRef === scope.procedureRef &&
      fact.enemies.some((entry) => {
        const enemy = state.combatants.get(entry.enemyId);
        return (
          entry.enemyId !== scope.attackerId &&
          entry.distanceFeet <= RANGED_ATTACK_ENEMY_PROXIMITY_FEET &&
          entry.enemyCanSeeAttacker &&
          enemy !== undefined &&
          !isIncapacitated(enemy.conditions)
        );
      }),
  );
}

/**
 * The target facts for a later roll of the same ranged attack, such as Horde
 * Breaker's second target or an attack-redirection ward's replacement target.
 * The attacker hasn't moved, so its enemy proximity carries over from the
 * attack's own target facts unless the later fill states it.
 */
export function withAttackEnemyProximityFrom(
  attackFacts: readonly BattleTargetSpatialFact[],
  facts: readonly BattleTargetSpatialFact[],
): readonly BattleTargetSpatialFact[] {
  return rangedAttackEnemyProximityFacts(facts).length > 0
    ? facts
    : [...facts, ...rangedAttackEnemyProximityFacts(attackFacts)];
}
