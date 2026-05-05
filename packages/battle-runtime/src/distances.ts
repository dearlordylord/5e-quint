import { Match } from "effect";
import * as Either from "effect/Either";
import { movementFeet, type MovementFeet } from "@dnd/shared/types";
import type { CombatantId } from "./identity.ts";

export type BattleCombatantDistance = {
  readonly combatantA: CombatantId;
  readonly combatantB: CombatantId;
  readonly feet: MovementFeet;
};

export type BattleCombatantDistanceValidationIssue =
  | {
      readonly tag: "invalidFeet";
    }
  | {
      readonly tag: "unknownCombatant";
      readonly combatantA: CombatantId;
      readonly combatantB: CombatantId;
    }
  | {
      readonly tag: "selfDistance";
      readonly combatantId: CombatantId;
    }
  | {
      readonly tag: "duplicatePair";
      readonly combatantA: CombatantId;
      readonly combatantB: CombatantId;
    }
  | {
      readonly tag: "incompletePairs";
      readonly expectedPairCount: number;
      readonly actualPairCount: number;
    };

export type BattleCombatantDistanceMap = ReadonlyMap<
  CombatantId,
  ReadonlyMap<CombatantId, MovementFeet>
>;

const AcceptedBattleCombatantDistances = Symbol(
  "AcceptedBattleCombatantDistances",
);

export type AcceptedBattleCombatantDistances = {
  readonly combatantIds: readonly CombatantId[];
  readonly distances: BattleCombatantDistanceMap;
  readonly [AcceptedBattleCombatantDistances]: true;
};

const DEFAULT_INITIAL_COMBATANT_DISTANCE_FEET = movementFeet(5);

export function battleCombatantDistances(input: {
  readonly combatantIds: readonly CombatantId[];
  readonly combatantDistances?: readonly BattleCombatantDistance[];
}): Either.Either<
  AcceptedBattleCombatantDistances,
  BattleCombatantDistanceValidationIssue
> {
  const distances = new Map<CombatantId, Map<CombatantId, MovementFeet>>();
  const authoredDistances =
    input.combatantDistances ??
    input.combatantIds.flatMap((combatantA, index) =>
      input.combatantIds.slice(index + 1).map((combatantB) => ({
        combatantA,
        combatantB,
        feet: DEFAULT_INITIAL_COMBATANT_DISTANCE_FEET,
      })),
    );
  const distanceIssue = validateBattleCombatantDistances({
    combatantIds: input.combatantIds,
    combatantDistances: authoredDistances,
    requireCompletePairs: input.combatantDistances !== undefined,
  });
  if (distanceIssue !== null) {
    return Either.left(distanceIssue);
  }

  for (const distance of authoredDistances) {
    setBattleCombatantDistance(
      distances,
      distance.combatantA,
      distance.combatantB,
      distance.feet,
    );
    setBattleCombatantDistance(
      distances,
      distance.combatantB,
      distance.combatantA,
      distance.feet,
    );
  }

  // The private symbol makes this accepted value unconstructable outside this
  // module; this parser has checked every combatant pair for these ids.
  return Either.right({
    combatantIds: input.combatantIds,
    distances,
    [AcceptedBattleCombatantDistances]: true,
  });
}

export function combatantDistancesAsPairs(
  distances: BattleCombatantDistanceMap,
): readonly BattleCombatantDistance[] {
  const pairs: BattleCombatantDistance[] = [];
  for (const [combatantA, peers] of distances) {
    for (const [combatantB, feet] of peers) {
      if (combatantA < combatantB) {
        pairs.push({ combatantA, combatantB, feet });
      }
    }
  }
  return pairs;
}

export function validateBattleCombatantDistances(input: {
  readonly combatantIds: readonly CombatantId[];
  readonly combatantDistances: readonly BattleCombatantDistance[];
  readonly requireCompletePairs: boolean;
}): BattleCombatantDistanceValidationIssue | null {
  const explicitDistancePairs = new Set<string>();

  for (const distance of input.combatantDistances) {
    if (!Number.isInteger(distance.feet) || distance.feet < 0) {
      return { tag: "invalidFeet" };
    }
    if (
      !input.combatantIds.includes(distance.combatantA) ||
      !input.combatantIds.includes(distance.combatantB)
    ) {
      return {
        tag: "unknownCombatant",
        combatantA: distance.combatantA,
        combatantB: distance.combatantB,
      };
    }
    if (distance.combatantA === distance.combatantB) {
      return {
        tag: "selfDistance",
        combatantId: distance.combatantA,
      };
    }

    const pairKey = combatantDistancePairKey(
      distance.combatantA,
      distance.combatantB,
    );
    if (explicitDistancePairs.has(pairKey)) {
      return {
        tag: "duplicatePair",
        combatantA: distance.combatantA,
        combatantB: distance.combatantB,
      };
    }
    explicitDistancePairs.add(pairKey);
  }

  if (input.requireCompletePairs) {
    const expectedPairCount =
      (input.combatantIds.length * (input.combatantIds.length - 1)) / 2;
    if (explicitDistancePairs.size !== expectedPairCount) {
      return {
        tag: "incompletePairs",
        expectedPairCount,
        actualPairCount: explicitDistancePairs.size,
      };
    }
  }

  return null;
}

export function battleCombatantDistanceValidationMessage(
  issue: BattleCombatantDistanceValidationIssue,
): string {
  return Match.value(issue).pipe(
    Match.when(
      { tag: "invalidFeet" },
      () => "Battle combatant distance must be a non-negative integer.",
    ),
    Match.when(
      { tag: "unknownCombatant" },
      () => "Battle combatant distance references an unknown combatant.",
    ),
    Match.when(
      { tag: "selfDistance" },
      () => "Battle combatant distance requires two combatants.",
    ),
    Match.when(
      { tag: "duplicatePair" },
      () => "Duplicate battle combatant distance pair.",
    ),
    Match.when(
      { tag: "incompletePairs" },
      () => "Battle combatant distances must include every combatant pair.",
    ),
    Match.exhaustive,
  );
}

export function setBattleCombatantDistance(
  distances: Map<CombatantId, Map<CombatantId, MovementFeet>>,
  from: CombatantId,
  to: CombatantId,
  feet: MovementFeet,
): void {
  const existing = distances.get(from);
  if (existing == null) {
    distances.set(from, new Map([[to, feet]]));
    return;
  }
  existing.set(to, feet);
}

export function cloneCombatantDistances(
  distances: BattleCombatantDistanceMap,
): Map<CombatantId, Map<CombatantId, MovementFeet>> {
  return new Map([...distances].map(([id, peers]) => [id, new Map(peers)]));
}

export function combatantDistanceFeet(
  distances: BattleCombatantDistanceMap,
  actorId: CombatantId,
  targetId: CombatantId,
): number | undefined {
  return distances.get(actorId)?.get(targetId);
}

function combatantDistancePairKey(
  combatantA: CombatantId,
  combatantB: CombatantId,
): string {
  return [combatantA, combatantB].sort().join("\u0000");
}
