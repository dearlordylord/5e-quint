import type { SpeedType } from "@dnd/shared/game-facts";
import {
  movementDeltaFeet,
  movementFeet,
  type MovementDeltaFeet,
  type MovementFeet,
} from "@dnd/shared/types";

export type SpeedChange = {
  readonly deltaFeet: MovementDeltaFeet;
};

export type SpeedRatioChange = {
  readonly numerator: 1;
  readonly denominator: 2;
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
  readonly speedRatios: readonly SpeedRatioChange[];
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

  const globalDelta = totalSpeedChangeFeet(facts.speedChanges);
  const ordinarySpeedFeet = changedSpeedByRatios(
    changedSpeed(facts.ordinarySpeedFeet, globalDelta),
    facts.speedRatios,
  );
  const speeds = new Map<SpeedType, MovementFeet>([
    ["walk", ordinarySpeedFeet],
  ]);

  for (const candidate of facts.specialSpeeds) {
    const speed = specialSpeed(
      candidate,
      ordinarySpeedFeet,
      globalDelta,
      facts.speedRatios,
    );
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

function totalSpeedChangeFeet(
  changes: readonly SpeedChange[],
): MovementDeltaFeet {
  return movementDeltaFeet(
    changes.reduce((total, change) => total + Number(change.deltaFeet), 0),
  );
}

function changedSpeed(
  speedFeet: MovementFeet,
  deltaFeet: MovementDeltaFeet,
): MovementFeet {
  return movementFeet(Number(speedFeet) + Number(deltaFeet));
}

function changedSpeedByRatios(
  speedFeet: MovementFeet,
  ratios: readonly SpeedRatioChange[],
): MovementFeet {
  return ratios.reduce(
    (speed, ratio) =>
      movementFeet((Number(speed) * ratio.numerator) / ratio.denominator),
    speedFeet,
  );
}

function specialSpeed(
  candidate: SpecialSpeedCandidate,
  ordinarySpeedFeet: MovementFeet,
  globalDeltaFeet: MovementDeltaFeet,
  speedRatios: readonly SpeedRatioChange[],
): MovementFeet {
  if (candidate.kind === "equalToSpeed") {
    return ordinarySpeedFeet;
  }
  if (candidate.kind === "fixed") {
    return changedSpeedByRatios(
      changedSpeed(candidate.speedFeet, globalDeltaFeet),
      speedRatios,
    );
  }
  const exhaustive: never = candidate;
  return exhaustive;
}
