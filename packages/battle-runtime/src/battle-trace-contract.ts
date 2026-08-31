// KERNEL-COVERAGE: runtime-owner BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING

import { Match } from "effect";

import type {
  AvailableBattleAct,
  BattleHole,
  BattleInvalidReasonCode,
  BattleResolutionResult,
} from "./battle-state-execution.ts";

export const BATTLE_TRACE_HOLE_KINDS = [
  "readyDeclaration",
  "helpAttackAllyDecision",
  "helpAttackEnemyDecision",
  "areaWindStrength",
  "targetChoice",
  "targetSpatialFacts",
  "hitPointHealingDistribution",
  "objectTargetChoice",
  "ongoingSpellTargetChoice",
  "objectContactTargets",
  "objectDropResolution",
  "heldObjectFacts",
  "spawnedCompanionConnection",
  "companionReappearancePlacement",
  "companionReappearanceInitiative",
  "weaponAttackDamageEnhancementTargetItem",
  "damageTypeChoice",
  "spellTargetAllocation",
  "spellTargetList",
  "attackRoll",
  "rolledDice",
  "skillChoice",
  "abilityChoice",
  "targetAbilityChoices",
  "conditionChoice",
  "compelledBehaviorOptionChoice",
  "selfTransformationModeChoice",
  "wildShapeEquipmentDisposition",
  "temporaryAbilityCheckRollModeActiveEffectCount",
  "movableLightPlacement",
  "spellAreaChoice",
  "directionalPersistentAreaDirectionChoice",
  "teleportDestination",
  "spatialMeleeSpellAttackProxyPosition",
  "movableZoneRamMovement",
  "movableZoneRepositionMovement",
  "startTurnOccurrenceOrder",
  "temporaryHitPointChoice",
  "persistentAreaSourceTurnTranslation",
  "savingThrowOutcome",
  "turnConstraintSomaticSpellFailureOutcome",
  "deathSavingThrow",
  "statBlockRechargeRoll",
  "concentrationSavingThrow",
  "interruptDecision",
  "unitFeatureDecision",
  "toolPossessionFacts",
  "movement",
  "controlledVerticalSuspensionAltitudeChange",
  "controlledVerticalSuspensionInitialRise",
  "abilityCheck",
  "spellcastingAbilityCheck",
  "grappleOutcome",
  "shoveOutcome",
  "targetingSaveInterdictionOutcome",
  "attackDamageDisposition",
  "damageRelationshipDecisions",
  "cunningStrikeEndTurnCoverFacts",
] as const satisfies ReadonlyArray<BattleHole["kind"]>;

export type BattleTraceHoleKind = (typeof BATTLE_TRACE_HOLE_KINDS)[number];

export type BattleTraceCheckpoint =
  | {
      readonly tag: "actAvailable";
      readonly holeKinds: readonly BattleTraceHoleKind[];
    }
  | {
      readonly tag: "needsHoles";
      readonly holeKinds: readonly BattleTraceHoleKind[];
    }
  | {
      readonly tag: "resolved";
    }
  | {
      readonly tag: "invalid";
      readonly reason: BattleInvalidReasonCode;
    };

export function battleActTraceCheckpoint(
  act: Pick<AvailableBattleAct, "initialHoles">,
): BattleTraceCheckpoint {
  return {
    tag: "actAvailable",
    holeKinds: battleTraceHoleKinds(act.initialHoles),
  };
}

export function battleResolutionTraceCheckpoint(
  result: BattleResolutionResult,
): BattleTraceCheckpoint {
  return Match.value(result).pipe(
    Match.when({ tag: "resolved" }, () => ({ tag: "resolved" as const })),
    Match.when({ tag: "needsHoles" }, (needsHoles) => ({
      tag: "needsHoles" as const,
      holeKinds: battleTraceHoleKinds(needsHoles.holes),
    })),
    Match.when({ tag: "invalid" }, (invalid) => ({
      tag: "invalid" as const,
      reason: invalid.reason,
    })),
    Match.exhaustive,
  );
}

export function battleTraceHoleKinds(
  holes: readonly Pick<BattleHole, "kind">[],
): readonly BattleTraceHoleKind[] {
  return holes.map((hole) => hole.kind);
}
