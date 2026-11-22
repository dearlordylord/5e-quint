// KERNEL-COVERAGE: runtime-owner BATTLE.ATTACK.PRONE_TARGET_ROLL_MODE BATTLE.ATTACK.RANGED_CLOSE_COMBAT_ROLL_MODE
import type { CombatantId } from "../identity.ts";
import type {
  BattleAttackExecutionSelection,
  BattleAttackRangeBand,
  BattleState,
  BattleCreatureState,
  BattleTargetSpatialFact,
} from "../battle-state-execution.ts";
import {
  boundAttackExecutionSelectionMatchesOption,
  type SupportedAttackActionOption,
} from "../battle-action-options.ts";
import { attackTargetConstraint } from "./statblock-attacks.ts";
import {
  qualifyRangedAttackEnemyProximity,
  type RangedAttackEnemyProximityScope,
  type SpatialQualificationIssue,
  type RangedAttackEnemyProximityEvidence,
} from "./ranged-attack-close-combat.ts";
import type { MovementFeet } from "@dnd/shared/types";

export function attackExecutionSelectionMatchesOption(
  selection: BattleAttackExecutionSelection,
  attack: SupportedAttackActionOption,
): boolean {
  if (!("procedureRef" in attack)) return false;
  return boundAttackExecutionSelectionMatchesOption(selection, attack);
}

export function attackTargetIsLegal(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
  facts: readonly BattleTargetSpatialFact[],
): boolean {
  const target = state.combatants.get(targetId);
  return (
    target !== undefined &&
    creatureAttackTargetIsLegal(actorId, target, attack, facts)
  );
}

export function creatureAttackTargetIsLegal(
  actorId: CombatantId,
  target: BattleCreatureState,
  attack: SupportedAttackActionOption,
  facts: readonly BattleTargetSpatialFact[],
): boolean {
  const targetId = target.combatantId;
  const constraint = attackTargetConstraint(attack);
  const distanceFeet = attackTargetDistanceFeet(
    facts,
    actorId,
    targetId,
    attack,
  );
  return (
    actorId !== targetId &&
    distanceFeet !== null &&
    (constraint.kind === "meleeReach"
      ? Number(distanceFeet) <= Number(constraint.reachFeet)
      : attackTargetRangeBand(facts, actorId, targetId, attack) !== null)
  );
}

/** A ranged attack's proximity scope; a melee or unbound attack has none. */
function rangedAttackProximityScope(
  actorId: CombatantId,
  attack: SupportedAttackActionOption,
): RangedAttackEnemyProximityScope | null {
  return attackTargetConstraint(attack).kind === "rangedRange" &&
    "procedureRef" in attack
    ? { attackerId: actorId, procedureRef: attack.procedureRef }
    : null;
}

/** Admit proximity evidence for a ranged attack; melee attacks need none. */
export function qualifyAttackEnemyProximity(
  state: BattleState,
  actorId: CombatantId,
  attack: SupportedAttackActionOption,
  facts: readonly BattleTargetSpatialFact[],
): RangedAttackEnemyProximityEvidence | SpatialQualificationIssue | null {
  const scope = rangedAttackProximityScope(actorId, attack);
  if (scope === null) return null;
  return qualifyRangedAttackEnemyProximity({ state, scope, facts });
}

export function attackTargetRangeBand(
  facts: readonly BattleTargetSpatialFact[],
  actorId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
): BattleAttackRangeBand | null {
  if (attackTargetConstraint(attack).kind !== "rangedRange") {
    return null;
  }
  const distanceFeet = attackTargetDistanceFeet(
    facts,
    actorId,
    targetId,
    attack,
  );
  if (distanceFeet === null) return null;
  const constraint = attackTargetConstraint(attack);
  if (constraint.kind !== "rangedRange") return null;
  if (Number(distanceFeet) <= Number(constraint.normalFeet)) return "normal";
  if (Number(distanceFeet) <= Number(constraint.longFeet)) return "long";
  return null;
}

export function attackTargetDistanceFeet(
  facts: readonly BattleTargetSpatialFact[],
  actorId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
): MovementFeet | null {
  for (const fact of facts) {
    if (
      fact.kind === "attackTargetDistance" &&
      fact.actorId === actorId &&
      fact.targetId === targetId &&
      attackExecutionSelectionMatchesOption(fact, attack)
    ) {
      return fact.distanceFeet;
    }
  }
  return null;
}
