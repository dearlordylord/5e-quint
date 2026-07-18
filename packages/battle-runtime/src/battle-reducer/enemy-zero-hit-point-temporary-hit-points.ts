// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.enemy-zero-hit-point-temporary-hit-points

import type { MovementFeet } from "@dnd/shared/types";
import type { UnitRecord } from "@dnd/surface/surface/types";
import type {
  BattleCreatureState,
  BattleDamageRelationshipDecision,
  BattleState,
  BattleTargetSpatialFact,
} from "../battle-reducer.ts";
import type { BattleProcedureExecutionRef, CombatantId } from "../identity.ts";
import type { CharacterBattleClassLevel } from "../character-class-level.ts";
import {
  characterUnitProcedureRef,
  type CharacterExecutionState,
} from "../character-execution.ts";
import { ENEMY_ZERO_HIT_POINT_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE } from "../unit-feature-support.ts";
import { scoreModifier } from "./domain-helpers.ts";

export type EnemyZeroHitPointTemporaryHitPointsAward = {
  readonly beneficiaryId: CombatantId;
  readonly temporaryHitPoints: number;
};

type CharacterBattleCreatureState = BattleCreatureState & {
  readonly origin: Extract<
    BattleCreatureState["origin"],
    { readonly kind: "character" }
  >;
};

export function enemyZeroHitPointTemporaryHitPointsAwards(input: {
  readonly state: BattleState;
  readonly damageSourceId: CombatantId | undefined;
  readonly targetId: CombatantId;
  readonly priorTarget: BattleCreatureState;
  readonly damagedTarget: BattleCreatureState;
  readonly spatialFacts: readonly BattleTargetSpatialFact[];
  readonly relationshipDecisions: readonly BattleDamageRelationshipDecision[];
}): readonly EnemyZeroHitPointTemporaryHitPointsAward[] {
  if (
    input.damageSourceId === undefined ||
    !enemyZeroHitPointTransitionOccurs({
      priorHitPoints: Number(input.priorTarget.hp),
      nextHitPoints: Number(input.damagedTarget.hp),
    })
  ) {
    return [];
  }

  const awards: EnemyZeroHitPointTemporaryHitPointsAward[] = [];
  for (const beneficiary of input.state.combatants.values()) {
    if (!isCharacterBattleCreatureState(beneficiary)) {
      continue;
    }
    const awarded = enemyZeroHitPointTemporaryHitPointsAward(
      beneficiary,
      input.damageSourceId,
      input.targetId,
      input.spatialFacts,
      input.relationshipDecisions,
    );
    if (awarded === null) {
      continue;
    }
    awards.push({
      beneficiaryId: beneficiary.combatantId,
      temporaryHitPoints: awarded,
    });
  }

  return awards;
}

export function enemyZeroHitPointTransitionOccurs(input: {
  readonly priorHitPoints: number;
  readonly nextHitPoints: number;
}): boolean {
  return input.priorHitPoints > 0 && input.nextHitPoints === 0;
}

function isCharacterBattleCreatureState(
  creature: BattleCreatureState,
): creature is CharacterBattleCreatureState {
  return creature.origin.kind === "character";
}

function enemyZeroHitPointTemporaryHitPointsAward(
  beneficiary: CharacterBattleCreatureState,
  damageSourceId: CombatantId,
  targetId: CombatantId,
  spatialFacts: readonly BattleTargetSpatialFact[],
  relationshipDecisions: readonly BattleDamageRelationshipDecision[],
): number | null {
  let highestAward: number | null = null;
  for (const profile of beneficiary.origin.enemyZeroHitPointTemporaryHitPointsProfiles.values()) {
    const procedureRef = enemyZeroHitPointTemporaryHitPointsProcedureRef(
      beneficiary.origin.execution,
      profile.unit.id,
    );
    if (
      procedureRef === undefined ||
      !relationshipDecisions.some(
        (decision) =>
          decision.kind === "enemyZeroHitPointTemporaryHitPoints" &&
          decision.beneficiaryId === beneficiary.combatantId &&
          decision.targetId === targetId &&
          decision.procedureRef === procedureRef &&
          decision.targetIsEnemy,
      ) ||
      !enemyZeroHitPointTemporaryHitPointsTriggerApplies({
        procedureRef,
        beneficiaryId: beneficiary.combatantId,
        damageSourceId,
        targetId,
        selfTrigger: profile.temporaryHitPoints.trigger.bySelf,
        otherWithinFeet: profile.temporaryHitPoints.trigger.byOtherWithinFeet,
        spatialFacts,
      })
    ) {
      continue;
    }
    const award = Math.max(
      profile.temporaryHitPoints.amount.minimum,
      scoreModifier(beneficiary.origin.d20Statistics.abilityScores.cha) +
        classLevelForUnit(beneficiary.origin.classLevels, profile.unit),
    );
    highestAward =
      highestAward === null ? award : Math.max(highestAward, award);
  }
  return highestAward;
}

export function enemyZeroHitPointTemporaryHitPointsTriggerApplies(input: {
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly beneficiaryId: CombatantId;
  readonly damageSourceId: CombatantId;
  readonly targetId: CombatantId;
  readonly selfTrigger: true;
  readonly otherWithinFeet: MovementFeet;
  readonly spatialFacts: readonly BattleTargetSpatialFact[];
}): boolean {
  if (input.selfTrigger && input.beneficiaryId === input.damageSourceId) {
    return true;
  }
  if (input.beneficiaryId === input.damageSourceId) {
    return false;
  }
  return input.spatialFacts.some(
    (fact) =>
      fact.kind ===
        "enemyZeroHitPointTemporaryHitPointsBeneficiaryWithinRange" &&
      fact.beneficiaryId === input.beneficiaryId &&
      fact.damageSourceId === input.damageSourceId &&
      fact.targetId === input.targetId &&
      fact.sourceProcedureRef === input.procedureRef &&
      fact.rangeFeet === input.otherWithinFeet,
  );
}

export function enemyZeroHitPointTemporaryHitPointsProcedureRef(
  execution: CharacterExecutionState,
  unitId: UnitRecord["id"],
): BattleProcedureExecutionRef | undefined {
  return characterUnitProcedureRef(execution, unitId, {
    kind: "unitSupportProfile",
    supportKinds: new Set([
      ENEMY_ZERO_HIT_POINT_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
    ]),
  });
}

function classLevelForUnit(
  classLevels: readonly CharacterBattleClassLevel[],
  unit: UnitRecord,
): number {
  return unit.kind === "class_feature"
    ? Number(
        classLevels.find((level) => level.className === unit.className)
          ?.level ?? 0,
      )
    : 0;
}
