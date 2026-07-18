// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.enemy-zero-hit-point-temporary-hit-points

import type { MovementFeet } from "@dnd/shared/types";
import type { UnitRecord } from "@dnd/surface/surface/types";
import type {
  BattleCreatureState,
  BattleDamageRelationshipDecision,
  BattleState,
  BattleTargetSpatialFact,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import type { CharacterBattleClassLevel } from "../character-class-level.ts";
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
    Number(input.priorTarget.hp) <= 0 ||
    Number(input.damagedTarget.hp) !== 0
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
    if (
      !relationshipDecisions.some(
        (decision) =>
          decision.kind ===
            "enemyZeroHitPointTemporaryHitPointsTargetIsEnemy" &&
          decision.beneficiaryId === beneficiary.combatantId &&
          decision.targetId === targetId &&
          decision.unitId === profile.unit.id,
      ) ||
      !profileTriggerApplies({
        profileUnitId: profile.unit.id,
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

function profileTriggerApplies(input: {
  readonly profileUnitId: UnitRecord["id"];
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
      fact.unitId === input.profileUnitId &&
      fact.rangeFeet === input.otherWithinFeet,
  );
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
