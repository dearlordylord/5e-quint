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
import type { MovementFeet } from "@dnd/shared/types";
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
export type SpatialQualificationIssue = {
  readonly tag: "invalid";
  readonly message: string;
};

export type RangedAttackEnemyProximityEvidence = {
  readonly tag: "qualified";
  readonly qualification: RangedAttackEnemyProximityFact;
};

export function qualifyRangedAttackEnemyProximity(input: {
  readonly state: BattleState;
  readonly scope: RangedAttackEnemyProximityScope;
  readonly facts: readonly BattleTargetSpatialFact[];
}): RangedAttackEnemyProximityEvidence | SpatialQualificationIssue {
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
  )
    return {
      tag: "invalid",
      message:
        "Ranged attack target requires one scoped enemy proximity qualification; supply enemies: [] only after checking no enemies qualify.",
    };
  const distanceIssue = attackSpatialConsistencyIssue(
    input.scope,
    input.facts,
    qualification,
  );
  if (distanceIssue !== null) return distanceIssue;
  return {
    tag: "qualified",
    qualification,
  };
}

type AttackTargetDistance = {
  readonly targetId: CombatantId;
  readonly feet: MovementFeet;
};

function scopedAttackTargetDistance(
  scope: RangedAttackEnemyProximityScope,
  fact: BattleTargetSpatialFact,
): AttackTargetDistance | null {
  if (
    fact.kind === "attackTargetDistance" &&
    fact.actorId === scope.attackerId &&
    fact.procedureRef === scope.procedureRef
  )
    return { targetId: fact.targetId, feet: fact.distanceFeet };
  if (
    fact.kind === "spellTarget" &&
    fact.casterId === scope.attackerId &&
    fact.sourceProcedureRef === scope.procedureRef &&
    fact.distanceFeet !== undefined
  )
    return { targetId: fact.targetId, feet: fact.distanceFeet };
  return null;
}

function attackTargetDistances(
  scope: RangedAttackEnemyProximityScope,
  facts: readonly BattleTargetSpatialFact[],
): Map<CombatantId, MovementFeet> | SpatialQualificationIssue {
  const distances = new Map<CombatantId, MovementFeet>();
  for (const fact of facts) {
    const distance = scopedAttackTargetDistance(scope, fact);
    if (distance === null) continue;
    const previous = distances.get(distance.targetId);
    if (previous !== undefined && previous !== distance.feet)
      return {
        tag: "invalid",
        message:
          "Attack spatial facts give contradictory distances for the same attacker and target.",
      };
    distances.set(distance.targetId, distance.feet);
  }
  return distances;
}

function enemyProximityConsistencyIssue(
  scope: RangedAttackEnemyProximityScope,
  facts: readonly BattleTargetSpatialFact[],
  distances: ReadonlyMap<CombatantId, MovementFeet>,
  enemy: RangedAttackEnemyProximityFact["enemies"][number],
): SpatialQualificationIssue | null {
  if (
    enemy.enemyCanSeeAttacker &&
    facts.some(
      (fact) =>
        fact.kind === "attackTargetCannotSeeAttacker" &&
        fact.attackerId === scope.attackerId &&
        fact.targetId === enemy.enemyId,
    )
  )
    return {
      tag: "invalid",
      message:
        "Attack sight facts contradict whether the same enemy can see the attacker.",
    };
  const distance = distances.get(enemy.enemyId);
  if (distance !== undefined && distance !== enemy.distanceFeet)
    return {
      tag: "invalid",
      message:
        "Attack target and enemy proximity facts give contradictory distances for the same attacker and enemy.",
    };
  return null;
}

function attackSpatialConsistencyIssue(
  scope: RangedAttackEnemyProximityScope,
  facts: readonly BattleTargetSpatialFact[],
  qualification: RangedAttackEnemyProximityFact,
): SpatialQualificationIssue | null {
  const distances = attackTargetDistances(scope, facts);
  if (!(distances instanceof Map)) return distances;
  for (const enemy of qualification.enemies) {
    const issue = enemyProximityConsistencyIssue(
      scope,
      facts,
      distances,
      enemy,
    );
    if (issue !== null) return issue;
  }
  return null;
}

export function isSpatialQualificationIssue(
  value: RangedAttackEnemyProximityEvidence | SpatialQualificationIssue | null,
): value is SpatialQualificationIssue {
  return value?.tag === "invalid";
}

/** Only admitted evidence can contribute this source to roll-mode calculation. */
export function rangedAttackCloseCombatDisadvantage(
  state: BattleState,
  evidence: RangedAttackEnemyProximityEvidence,
): boolean | SpatialQualificationIssue {
  const enemies = evidence.qualification.enemies.map((entry) => ({
    ...entry,
    enemy: state.combatants.get(entry.enemyId),
  }));
  if (enemies.some((entry) => entry.enemy === undefined))
    return {
      tag: "invalid",
      message: "Admitted ranged attack enemy is no longer in the battle.",
    };
  return enemies.some(
    (entry) =>
      entry.distanceFeet <= RANGED_ATTACK_ENEMY_PROXIMITY_FEET &&
      entry.enemyCanSeeAttacker &&
      entry.enemy !== undefined &&
      !isIncapacitated(entry.enemy.conditions),
  );
}
