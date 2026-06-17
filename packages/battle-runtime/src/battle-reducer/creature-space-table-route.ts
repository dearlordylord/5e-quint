// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.creature-space-movement-permission

import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type { BattleCreatureSpaceTraversalMovementFact } from "../battle-reducer.ts";
import type { BattleTablePositionId, CombatantId } from "../identity.ts";

const BATTLE_CREATURE_SPACE_SIZE_RELATIONS_TO_MOVER = [
  "larger",
  "notLarger",
] as const;
export type BattleCreatureSpaceSizeRelationToMover =
  (typeof BATTLE_CREATURE_SPACE_SIZE_RELATIONS_TO_MOVER)[number];

const BATTLE_CREATURE_SPACE_TABLE_ROUTE_DERIVATION_INVALID_REASONS = [
  "duplicateCreatureFootprint",
  "occupiedRouteIncludesMoverFootprint",
  "occupiedRouteCreatureIsNotLarger",
] as const;
export type BattleCreatureSpaceTableRouteDerivationInvalidReason =
  (typeof BATTLE_CREATURE_SPACE_TABLE_ROUTE_DERIVATION_INVALID_REASONS)[number];

type OccupiedCreatureSpaceWitness =
  BattleCreatureSpaceTraversalMovementFact["occupiedSpaces"][number];
type BattleCreatureSpaceRoutePosition = {
  readonly kind: "enteredBeforeDestination" | "destination";
  readonly positionId: BattleTablePositionId;
};
type OccupiedCreatureSpaceRouteCandidate = OccupiedCreatureSpaceWitness & {
  readonly routePositionKind: BattleCreatureSpaceRoutePosition["kind"];
};

export type BattleRouteDerivedCreatureSpaceTraversalMovementFact = {
  readonly kind: "occupiedCreatureSpaceTraversal";
  readonly occupiedSpaces: ReadonlyNonEmptyArray<OccupiedCreatureSpaceWitness>;
  readonly destination: BattleCreatureSpaceTraversalMovementFact["destination"];
};

export type BattleCreatureSpaceTableRoute = {
  readonly positionsEnteredBeforeDestination: readonly BattleTablePositionId[];
  readonly destination: {
    readonly positionId: BattleTablePositionId;
  };
};

export type BattleCreatureSpaceOccupantFootprintFact = {
  readonly occupantId: CombatantId;
  readonly creatureSizeRelationToMover: BattleCreatureSpaceSizeRelationToMover;
  readonly occupiedPositions: ReadonlyNonEmptyArray<BattleTablePositionId>;
};

export type BattleCreatureSpaceTableRouteDerivationInput = {
  readonly moverId: CombatantId;
  readonly route: BattleCreatureSpaceTableRoute;
  readonly occupiedCreatureFootprints: readonly BattleCreatureSpaceOccupantFootprintFact[];
};

export type BattleCreatureSpaceTableRouteDerivationResult =
  | {
      readonly tag: "movementFact";
      readonly creatureSpaceTraversal: BattleRouteDerivedCreatureSpaceTraversalMovementFact;
    }
  | {
      readonly tag: "noOccupiedCreatureSpaceTraversal";
    }
  | {
      readonly tag: "invalid";
      readonly reason: BattleCreatureSpaceTableRouteDerivationInvalidReason;
      readonly message: string;
    };

export function deriveCreatureSpaceTraversalMovementFactFromTableRoute(
  input: BattleCreatureSpaceTableRouteDerivationInput,
): BattleCreatureSpaceTableRouteDerivationResult {
  const duplicateOccupantId = duplicateFootprintOccupantId(
    input.occupiedCreatureFootprints,
  );
  if (duplicateOccupantId !== null) {
    return invalidDerivation(
      "duplicateCreatureFootprint",
      "Creature-space route derivation requires one footprint per occupied creature.",
    );
  }

  const routePositions = creatureSpaceRoutePositions(input.route);
  const occupiedCandidates: OccupiedCreatureSpaceRouteCandidate[] = [];
  for (const routePosition of routePositions) {
    const result = collectOccupiedPosition({
      moverId: input.moverId,
      routePosition,
      footprints: input.occupiedCreatureFootprints,
      occupiedCandidates,
    });
    if (result !== null) return result;
  }

  const occupiedSpaces =
    collapseRouteOccupiedCandidatesByOccupant(occupiedCandidates);
  const nonEmptyOccupiedSpaces = readonlyNonEmptyArray(occupiedSpaces);
  if (nonEmptyOccupiedSpaces === null) {
    return { tag: "noOccupiedCreatureSpaceTraversal" };
  }
  const occupiedDestination = occupiedDestinationCandidate(occupiedCandidates);

  return {
    tag: "movementFact",
    creatureSpaceTraversal: {
      kind: "occupiedCreatureSpaceTraversal",
      occupiedSpaces: nonEmptyOccupiedSpaces,
      destination:
        occupiedDestination === null
          ? {
              kind: "unoccupiedSpace",
              positionId: input.route.destination.positionId,
            }
          : {
              kind: "occupiedCreatureSpace",
              occupantId: occupiedDestination.occupantId,
              positionId: input.route.destination.positionId,
            },
    },
  };
}

function creatureSpaceRoutePositions(
  route: BattleCreatureSpaceTableRoute,
): readonly BattleCreatureSpaceRoutePosition[] {
  return [
    ...route.positionsEnteredBeforeDestination.map(
      (positionId): BattleCreatureSpaceRoutePosition => ({
        kind: "enteredBeforeDestination",
        positionId,
      }),
    ),
    {
      kind: "destination",
      positionId: route.destination.positionId,
    },
  ];
}

function collectOccupiedPosition(input: {
  readonly moverId: CombatantId;
  readonly routePosition: BattleCreatureSpaceRoutePosition;
  readonly footprints: readonly BattleCreatureSpaceOccupantFootprintFact[];
  readonly occupiedCandidates: OccupiedCreatureSpaceRouteCandidate[];
}): Extract<
  BattleCreatureSpaceTableRouteDerivationResult,
  { tag: "invalid" }
> | null {
  for (const footprint of input.footprints) {
    if (!footprintOccupiesPosition(footprint, input.routePosition.positionId)) {
      continue;
    }
    if (footprint.occupantId === input.moverId) {
      return invalidDerivation(
        "occupiedRouteIncludesMoverFootprint",
        "Creature-space route derivation cannot treat the mover's own footprint as an occupied creature space.",
      );
    }
    if (footprint.creatureSizeRelationToMover !== "larger") {
      return invalidDerivation(
        "occupiedRouteCreatureIsNotLarger",
        "Creature-space route derivation requires occupied route creatures to be larger than the mover.",
      );
    }
    input.occupiedCandidates.push({
      occupantId: footprint.occupantId,
      positionId: input.routePosition.positionId,
      routePositionKind: input.routePosition.kind,
    });
  }
  return null;
}

function collapseRouteOccupiedCandidatesByOccupant(
  candidates: readonly OccupiedCreatureSpaceRouteCandidate[],
): OccupiedCreatureSpaceWitness[] {
  const occupiedSpaces: OccupiedCreatureSpaceWitness[] = [];
  const witnessedOccupants = new Set<CombatantId>();
  for (const candidate of candidates) {
    if (witnessedOccupants.has(candidate.occupantId)) continue;
    witnessedOccupants.add(candidate.occupantId);
    occupiedSpaces.push({
      occupantId: candidate.occupantId,
      positionId: candidate.positionId,
    });
  }
  return occupiedSpaces;
}

function occupiedDestinationCandidate(
  candidates: readonly OccupiedCreatureSpaceRouteCandidate[],
): OccupiedCreatureSpaceRouteCandidate | null {
  return (
    candidates.find(
      (candidate) => candidate.routePositionKind === "destination",
    ) ?? null
  );
}

function duplicateFootprintOccupantId(
  footprints: readonly BattleCreatureSpaceOccupantFootprintFact[],
): CombatantId | null {
  const seen = new Set<CombatantId>();
  for (const footprint of footprints) {
    if (seen.has(footprint.occupantId)) return footprint.occupantId;
    seen.add(footprint.occupantId);
  }
  return null;
}

function footprintOccupiesPosition(
  footprint: BattleCreatureSpaceOccupantFootprintFact,
  positionId: BattleTablePositionId,
): boolean {
  return footprint.occupiedPositions.some(
    (occupiedPositionId) => occupiedPositionId === positionId,
  );
}

function readonlyNonEmptyArray<T>(
  values: readonly T[],
): ReadonlyNonEmptyArray<T> | null {
  const [first, ...rest] = values;
  if (first === undefined) return null;
  return [first, ...rest];
}

function invalidDerivation(
  reason: BattleCreatureSpaceTableRouteDerivationInvalidReason,
  message: string,
): Extract<BattleCreatureSpaceTableRouteDerivationResult, { tag: "invalid" }> {
  return { tag: "invalid", reason, message };
}
