// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.creature-space-movement-permission
// KERNEL-COVERAGE: runtime-owner BATTLE.MOVEMENT.ORDINARY_CREATURE_SPACE_TABLE_ROUTE

import {
  SIZES,
  type MovementFeet,
  type ReadonlyNonEmptyArray,
  type Size,
} from "@dnd/shared/types";
import type { BattleCreatureSpaceTraversalMovementFact } from "../battle-state-execution.ts";
import type { BattleTablePositionId, CombatantId } from "../identity.ts";

export type BattleCreatureSpaceSizeRelationToMover = "larger" | "notLarger";

export type BattleCreatureSpaceTableRouteDerivationInvalidReason =
  | "duplicateCreatureFootprint"
  | "occupiedRouteIncludesMoverFootprint"
  | "occupiedRouteCreatureIsNotLarger";

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

export type BattleOrdinaryMovementRouteOccupant =
  | {
      readonly kind: "livingCreature";
      readonly occupantId: CombatantId;
      readonly creatureSize: Size;
      readonly incapacitated: boolean;
      readonly allyOfMover: boolean;
      readonly occupiedPositions: ReadonlyNonEmptyArray<BattleTablePositionId>;
    }
  | {
      readonly kind: "corpse";
      readonly tokenId: CombatantId;
      readonly occupiedPositions: ReadonlyNonEmptyArray<BattleTablePositionId>;
    };

export type BattleOrdinaryMovementTableRouteResult =
  | {
      readonly tag: "routeFacts";
      readonly difficultTerrainSteps: readonly {
        readonly positionId: BattleTablePositionId;
        readonly distanceFeet: MovementFeet;
      }[];
      readonly creatureSpaceTraversal?: BattleRouteDerivedCreatureSpaceTraversalMovementFact;
    }
  | {
      readonly tag: "invalid";
      readonly reason:
        | "livingCreatureBlocksTraversal"
        | "livingCreatureDestination"
        | "corpseDestinationUnsupported";
      readonly tokenId: CombatantId;
      readonly message: string;
    };

type OrdinaryMovementRoutePosition = {
  readonly kind: "enteredBeforeDestination" | "destination";
  readonly positionId: BattleTablePositionId;
  readonly distanceFeet: MovementFeet;
};

export function deriveOrdinaryMovementTableRouteFacts(input: {
  readonly moverId: CombatantId;
  readonly moverSize: Size;
  readonly route: {
    readonly positionsEnteredBeforeDestination: readonly {
      readonly positionId: BattleTablePositionId;
      readonly distanceFeet: MovementFeet;
    }[];
    readonly destination: {
      readonly positionId: BattleTablePositionId;
      readonly distanceFeet: MovementFeet;
    };
  };
  readonly occupants: readonly BattleOrdinaryMovementRouteOccupant[];
}): BattleOrdinaryMovementTableRouteResult {
  const positions = [
    ...input.route.positionsEnteredBeforeDestination.map((position) => ({
      ...position,
      kind: "enteredBeforeDestination" as const,
    })),
    { ...input.route.destination, kind: "destination" as const },
  ];
  const difficultTerrainSteps = new Map<BattleTablePositionId, MovementFeet>();
  const traversedCreatures = new Map<CombatantId, BattleTablePositionId>();
  for (const position of positions) {
    const positionResult = processOrdinaryMovementRoutePosition(
      input,
      position,
      difficultTerrainSteps,
      traversedCreatures,
    );
    if (positionResult !== null) return positionResult;
  }
  const occupiedSpaces = readonlyNonEmptyArray(
    [...traversedCreatures].map(([occupantId, positionId]) => ({
      occupantId,
      positionId,
    })),
  );
  return {
    tag: "routeFacts",
    difficultTerrainSteps: [...difficultTerrainSteps].map(
      ([positionId, distanceFeet]) => ({ positionId, distanceFeet }),
    ),
    ...(occupiedSpaces === null
      ? {}
      : {
          creatureSpaceTraversal: {
            kind: "occupiedCreatureSpaceTraversal",
            occupiedSpaces,
            destination: {
              kind: "unoccupiedSpace",
              positionId: input.route.destination.positionId,
            },
          },
        }),
  };
}

function processOrdinaryMovementRoutePosition(
  input: Parameters<typeof deriveOrdinaryMovementTableRouteFacts>[0],
  position: OrdinaryMovementRoutePosition,
  difficultTerrainSteps: Map<BattleTablePositionId, MovementFeet>,
  traversedCreatures: Map<CombatantId, BattleTablePositionId>,
): Extract<
  BattleOrdinaryMovementTableRouteResult,
  { readonly tag: "invalid" }
> | null {
  for (const occupant of input.occupants) {
    const result = processOrdinaryMovementRouteOccupant(
      input,
      position,
      occupant,
      difficultTerrainSteps,
      traversedCreatures,
    );
    if (result !== null) return result;
  }
  return null;
}

function processOrdinaryMovementRouteOccupant(
  input: Parameters<typeof deriveOrdinaryMovementTableRouteFacts>[0],
  position: OrdinaryMovementRoutePosition,
  occupant: BattleOrdinaryMovementRouteOccupant,
  difficultTerrainSteps: Map<BattleTablePositionId, MovementFeet>,
  traversedCreatures: Map<CombatantId, BattleTablePositionId>,
): Extract<
  BattleOrdinaryMovementTableRouteResult,
  { readonly tag: "invalid" }
> | null {
  if (!occupant.occupiedPositions.includes(position.positionId)) return null;
  const tokenId =
    occupant.kind === "livingCreature" ? occupant.occupantId : occupant.tokenId;
  if (tokenId === input.moverId) return null;
  const destinationIssue = ordinaryMovementDestinationIssue(
    position,
    occupant,
    tokenId,
  );
  if (destinationIssue !== null) return destinationIssue;
  if (occupant.kind === "corpse") return null;
  return processOrdinaryLivingMovementOccupant(
    input,
    position,
    occupant,
    tokenId,
    difficultTerrainSteps,
    traversedCreatures,
  );
}

function ordinaryMovementDestinationIssue(
  position: OrdinaryMovementRoutePosition,
  occupant: BattleOrdinaryMovementRouteOccupant,
  tokenId: CombatantId,
): Extract<
  BattleOrdinaryMovementTableRouteResult,
  { readonly tag: "invalid" }
> | null {
  if (position.kind !== "destination") return null;
  return occupant.kind === "livingCreature"
    ? {
        tag: "invalid",
        reason: "livingCreatureDestination",
        tokenId,
        message:
          "A creature cannot willingly end its movement in another creature's space.",
      }
    : {
        tag: "invalid",
        reason: "corpseDestinationUnsupported",
        tokenId,
        message:
          "Scenario movement does not yet adjudicate ending in a corpse's space.",
      };
}

function processOrdinaryLivingMovementOccupant(
  input: Parameters<typeof deriveOrdinaryMovementTableRouteFacts>[0],
  position: OrdinaryMovementRoutePosition,
  occupant: Extract<
    BattleOrdinaryMovementRouteOccupant,
    { readonly kind: "livingCreature" }
  >,
  tokenId: CombatantId,
  difficultTerrainSteps: Map<BattleTablePositionId, MovementFeet>,
  traversedCreatures: Map<CombatantId, BattleTablePositionId>,
): Extract<
  BattleOrdinaryMovementTableRouteResult,
  { readonly tag: "invalid" }
> | null {
  const occupantIsTiny = occupant.creatureSize === "tiny";
  if (
    !(
      occupant.incapacitated ||
      occupantIsTiny ||
      occupant.allyOfMover ||
      twoOrMoreCreatureSizesDifferent(input.moverSize, occupant.creatureSize)
    )
  ) {
    return {
      tag: "invalid",
      reason: "livingCreatureBlocksTraversal",
      tokenId,
      message: `Scenario combatant ${String(tokenId)} blocks movement through its space.`,
    };
  }
  if (!occupantIsTiny && !occupant.allyOfMover) {
    difficultTerrainSteps.set(position.positionId, position.distanceFeet);
  }
  if (occupant.incapacitated) {
    traversedCreatures.set(tokenId, position.positionId);
  }
  return null;
}

function twoOrMoreCreatureSizesDifferent(first: Size, second: Size): boolean {
  return Math.abs(SIZES.indexOf(first) - SIZES.indexOf(second)) >= 2;
}

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
