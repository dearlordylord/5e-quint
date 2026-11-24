// KERNEL-COVERAGE: runtime-owner BATTLE.ATTACK.PRONE_TARGET_ROLL_MODE BATTLE.ATTACK.RANGED_CLOSE_COMBAT_ROLL_MODE BATTLE.ATTACK.TARGET_COVER
import {
  directTargetCover,
  type DirectTargetCover,
} from "@dnd/shared-algebras/cover-algebra";
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
  isSpatialQualificationIssue,
  qualifyRangedAttackEnemyProximity,
  type RangedAttackEnemyProximityScope,
  type SpatialQualificationIssue,
  type RangedAttackEnemyProximityEvidence,
} from "./ranged-attack-close-combat.ts";
import { thrownWeaponLandingIssue } from "./thrown-weapon-attack.ts";

import type { CoverType, MovementFeet } from "@dnd/shared/types";

export function attackExecutionSelectionMatchesOption(
  selection: BattleAttackExecutionSelection,
  attack: SupportedAttackActionOption,
): boolean {
  if (!("procedureRef" in attack)) return false;
  return boundAttackExecutionSelectionMatchesOption(selection, attack);
}

export function attackTargetAdmission(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
  facts: readonly BattleTargetSpatialFact[],
): { readonly cover: DirectTargetCover } | null {
  const target = state.combatants.get(targetId);
  return target === undefined
    ? null
    : creatureAttackTargetAdmission(actorId, target, attack, facts);
}

export function attackTargetIsLegal(
  ...args: Parameters<typeof attackTargetAdmission>
): boolean {
  return attackTargetAdmission(...args) !== null;
}

export function creatureAttackTargetAdmission(
  actorId: CombatantId,
  target: BattleCreatureState,
  attack: SupportedAttackActionOption,
  facts: readonly BattleTargetSpatialFact[],
): { readonly cover: DirectTargetCover } | null {
  const targetId = target.combatantId;
  const constraint = attackTargetConstraint(attack);
  const distanceFeet = attackTargetDistanceFeet(
    facts,
    actorId,
    targetId,
    attack,
  );
  const cover = directTargetCover(
    attackTargetStatedCover(facts, actorId, targetId, attack),
  );
  return actorId !== targetId &&
    distanceFeet !== null &&
    cover !== null &&
    (constraint.kind === "meleeReach"
      ? Number(distanceFeet) <= Number(constraint.reachFeet)
      : attackTargetRangeBand(facts, actorId, targetId, attack) !== null)
    ? { cover }
    : null;
}

export function creatureAttackTargetIsLegal(
  ...args: Parameters<typeof creatureAttackTargetAdmission>
): boolean {
  return creatureAttackTargetAdmission(...args) !== null;
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

type AttackTargetDistanceFact = Extract<
  BattleTargetSpatialFact,
  { readonly kind: "attackTargetDistance" }
>;

function attackTargetDistanceFact(
  facts: readonly BattleTargetSpatialFact[],
  actorId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
): AttackTargetDistanceFact | null {
  for (const fact of facts) {
    if (
      fact.kind === "attackTargetDistance" &&
      fact.actorId === actorId &&
      fact.targetId === targetId &&
      attackExecutionSelectionMatchesOption(fact, attack)
    ) {
      return fact;
    }
  }
  return null;
}

/**
 * The table's target facts must qualify a ranged attack's enemy proximity,
 * give a thrown weapon its landing, and place the target inside the attack's
 * target constraint. Returns admitted cover and the roll's proximity evidence.
 */
export function qualifyAttackTargetFacts(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
  targetSpatialFacts: readonly BattleTargetSpatialFact[],
):
  | SpatialQualificationIssue
  | {
      readonly cover: DirectTargetCover;
      readonly enemyProximity: RangedAttackEnemyProximityEvidence | null;
    } {
  const admission = attackTargetAdmission(
    state,
    attackerId,
    targetId,
    attack,
    targetSpatialFacts,
  );
  if (admission === null) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return {
      tag: "invalid",
      message:
        "Attack target is outside the selected attack's supported target constraint.",
    };
  }
  const proximity = qualifyAttackEnemyProximity(
    state,
    attackerId,
    attack,
    targetSpatialFacts,
  );
  if (isSpatialQualificationIssue(proximity)) return proximity;
  const landingIssue = thrownWeaponLandingIssue(
    attackerId,
    attack,
    targetSpatialFacts,
  );
  return landingIssue === null
    ? { ...admission, enemyProximity: proximity }
    : { tag: "invalid", message: landingIssue };
}

export function attackTargetDistanceFeet(
  facts: readonly BattleTargetSpatialFact[],
  actorId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
): MovementFeet | null {
  return (
    attackTargetDistanceFact(facts, actorId, targetId, attack)?.distanceFeet ??
    null
  );
}

/**
 * The degree of cover the table stated between a weapon or Stat Block attacker
 * and a creature target, or undefined when it stated none.
 */
export function attackTargetStatedCover(
  facts: readonly BattleTargetSpatialFact[],
  actorId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
): CoverType | undefined {
  return attackTargetDistanceFact(facts, actorId, targetId, attack)?.cover;
}
