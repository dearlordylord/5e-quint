// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties spell.invocation-haste-positive
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE BATTLE.SPELL.HASTE_POSITIVE_EFFECTS
import type { SpeedType } from "@dnd/shared/game-facts";
import {
  movementDeltaFeet,
  movementFeet,
  type MovementDeltaFeet,
  type MovementFeet,
} from "@dnd/shared/types";

export type SpeedChange =
  | {
      readonly kind: "delta";
      readonly deltaFeet: MovementDeltaFeet;
    }
  | {
      readonly kind: "ratio";
      readonly numerator: number;
      readonly denominator: number;
    };

export type SpecialSpeedCandidate =
  | {
      readonly kind: "fixed";
      readonly speedType: Exclude<SpeedType, "walk">;
      readonly speedFeet: MovementFeet;
    }
  | {
      readonly kind: "equalToSpeed";
      readonly speedType: Exclude<SpeedType, "walk">;
    };

export type CreatureSpeedFacts = {
  readonly ordinarySpeedFeet: MovementFeet;
  readonly speedChanges: readonly SpeedChange[];
  readonly specialSpeeds: readonly SpecialSpeedCandidate[];
  readonly terminalSpeedZero: boolean;
};

export type EffectiveSpeedTable = ReadonlyMap<SpeedType, MovementFeet>;

export function effectiveSpeeds(
  facts: CreatureSpeedFacts,
): EffectiveSpeedTable {
  if (facts.terminalSpeedZero) {
    return zeroSpeedTable(facts.specialSpeeds);
  }

  const speedChange = combinedSpeedChange(facts.speedChanges);
  const ordinarySpeedFeet = changedSpeed(facts.ordinarySpeedFeet, speedChange);
  const speeds = new Map<SpeedType, MovementFeet>([
    ["walk", ordinarySpeedFeet],
  ]);

  for (const candidate of facts.specialSpeeds) {
    const speed = specialSpeed(candidate, ordinarySpeedFeet, speedChange);
    const current = speeds.get(candidate.speedType);
    if (current === undefined || Number(speed) > Number(current)) {
      speeds.set(candidate.speedType, speed);
    }
  }

  return speeds;
}

function zeroSpeedTable(
  specialSpeeds: readonly SpecialSpeedCandidate[],
): EffectiveSpeedTable {
  const speeds = new Map<SpeedType, MovementFeet>([["walk", movementFeet(0)]]);
  for (const candidate of specialSpeeds) {
    speeds.set(candidate.speedType, movementFeet(0));
  }
  return speeds;
}

export function effectiveSpeed(
  facts: CreatureSpeedFacts,
  speedType: SpeedType,
): MovementFeet | null {
  return effectiveSpeeds(facts).get(speedType) ?? null;
}

type CombinedSpeedChange = {
  readonly deltaFeet: MovementDeltaFeet;
  readonly ratioNumerator: number;
  readonly ratioDenominator: number;
};

function combinedSpeedChange(
  changes: readonly SpeedChange[],
): CombinedSpeedChange {
  return changes.reduce<CombinedSpeedChange>(
    (combined, change) => {
      if (change.kind === "delta") {
        return {
          ...combined,
          deltaFeet: movementDeltaFeet(
            Number(combined.deltaFeet) + Number(change.deltaFeet),
          ),
        };
      }
      return {
        ...combined,
        ratioNumerator: combined.ratioNumerator * change.numerator,
        ratioDenominator: combined.ratioDenominator * change.denominator,
      };
    },
    {
      deltaFeet: movementDeltaFeet(0),
      ratioNumerator: 1,
      ratioDenominator: 1,
    },
  );
}

function changedSpeed(
  speedFeet: MovementFeet,
  change: CombinedSpeedChange,
): MovementFeet {
  const deltaAdjustedSpeed = Number(speedFeet) + Number(change.deltaFeet);
  return movementFeet(
    Math.trunc(
      (deltaAdjustedSpeed * change.ratioNumerator) /
        change.ratioDenominator,
    ),
  );
}

function specialSpeed(
  candidate: SpecialSpeedCandidate,
  ordinarySpeedFeet: MovementFeet,
  globalChange: CombinedSpeedChange,
): MovementFeet {
  if (candidate.kind === "equalToSpeed") {
    return ordinarySpeedFeet;
  }
  if (candidate.kind === "fixed") {
    return changedSpeed(candidate.speedFeet, globalChange);
  }
  const exhaustive: never = candidate;
  return exhaustive;
}
