import { Match } from "effect";

import type {
  AvailableBattleAct,
  BattleHole,
  BattleInvalidReasonCode,
  BattleResolutionResult,
} from "./battle-reducer.ts";

export const BATTLE_TRACE_HOLE_KINDS = [
  "targetChoice",
  "targetSpatialFacts",
  "objectTargetChoice",
  "heldObjectFacts",
  "damageTypeChoice",
  "spellTargetAllocation",
  "spellTargetList",
  "attackRoll",
  "rolledDice",
  "skillChoice",
  "abilityChoice",
  "conditionChoice",
  "commandOptionChoice",
  "thaumaturgyActiveOneMinuteEffectCount",
  "dancingLightsPlacement",
  "spellAreaChoice",
  "savingThrowOutcome",
  "deathSavingThrow",
  "statBlockRechargeRoll",
  "concentrationSavingThrow",
  "reactionDecision",
  "unitFeatureDecision",
  "movement",
  "abilityCheck",
  "grappleOutcome",
  "shoveOutcome",
  "sanctuaryInterdictionOutcome",
  "attackDamageDisposition",
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
