/**
 * A public, single-level five-foot tactical-space kernel.
 *
 * The module intentionally contains no D&D runtime, adjudicator, networking,
 * or content imports.  Its only policy is quantized square-cell geometry;
 * callers own movement costs and battle legality.
 */

export const CELL_SIZE_FEET = 5 as const;

const TERRAIN_KINDS = [
  "ordinary",
  "difficult",
] as const satisfies ReadonlyArray<string>;
export type TerrainKind = (typeof TERRAIN_KINDS)[number];

const BOUNDARY_OPENNESS = [
  "open",
  "blocked",
] as const satisfies ReadonlyArray<string>;
export type BoundaryOpenness = (typeof BOUNDARY_OPENNESS)[number];

const COVER_DEGREES = [
  "none",
  "half",
  "three-quarters",
  "total",
] as const satisfies ReadonlyArray<string>;
export type CoverDegree = (typeof COVER_DEGREES)[number];

const DIRECTIONS = [
  "same-horizontal-position",
  "north",
  "north-east",
  "east",
  "south-east",
  "south",
  "south-west",
  "west",
  "north-west",
] as const satisfies ReadonlyArray<string>;
export type Direction = (typeof DIRECTIONS)[number];

export type GeometricSight = "clear" | "blocked";

declare const tokenIdBrand: unique symbol;
declare const coordinateBrand: unique symbol;
declare const arenaFingerprintBrand: unique symbol;
declare const fingerprintBrand: unique symbol;
declare const arenaBrand: unique symbol;
declare const stateBrand: unique symbol;
declare const previewBrand: unique symbol;

export type TokenId = string & { readonly [tokenIdBrand]: true };
export type CoordinateInput = Readonly<{
  readonly x: number;
  readonly y: number;
}>;
export type CellCoordinate = CoordinateInput & {
  readonly [coordinateBrand]: true;
};
export type ArenaFingerprint = string & {
  readonly [arenaFingerprintBrand]: true;
};
export type StateFingerprint = string & {
  readonly [fingerprintBrand]: true;
};

export type CellDefinition = Readonly<{
  readonly x: number;
  readonly y: number;
  readonly terrain: TerrainKind;
}>;

export type BoundaryDefinition = Readonly<{
  readonly between: readonly [CoordinateInput, CoordinateInput];
  readonly traversal: BoundaryOpenness;
  readonly sight: BoundaryOpenness;
  readonly cover: CoverDegree;
}>;

export type ArenaDefinition = Readonly<{
  readonly cells: readonly CellDefinition[];
  readonly boundaries: readonly BoundaryDefinition[];
}>;

export type Arena = Readonly<{ readonly [arenaBrand]: true }>;
export type SpatialState = Readonly<{ readonly [stateBrand]: true }>;
export type StepPreview = Readonly<{ readonly [previewBrand]: true }>;

export type ArenaCell = Readonly<{
  readonly coordinate: CellCoordinate;
  readonly terrain: TerrainKind;
}>;

export type ArenaBoundary = Readonly<{
  readonly between: readonly [CellCoordinate, CellCoordinate];
  readonly traversal: BoundaryOpenness;
  readonly sight: BoundaryOpenness;
  readonly cover: CoverDegree;
}>;

export type ArenaSnapshot = Readonly<{
  readonly cellSizeFeet: typeof CELL_SIZE_FEET;
  readonly fingerprint: ArenaFingerprint;
  readonly cells: readonly ArenaCell[];
  readonly boundaries: readonly ArenaBoundary[];
}>;

export type TokenPlacement = Readonly<{
  readonly token: TokenId;
  readonly coordinate: CellCoordinate;
}>;

export type SpatialSnapshot = Readonly<{
  readonly arenaFingerprint: ArenaFingerprint;
  readonly revision: number;
  readonly fingerprint: StateFingerprint;
  readonly placements: readonly TokenPlacement[];
}>;

export type SpatialRelation = Readonly<{
  readonly source: TokenId;
  readonly target: TokenId;
  readonly direction: Direction;
  readonly distanceFeet: number;
  readonly sight: GeometricSight;
  readonly cover: CoverDegree;
}>;

export type ProspectiveStep = Readonly<{
  readonly from: CellCoordinate;
  readonly to: CellCoordinate;
  readonly distanceFeet: typeof CELL_SIZE_FEET;
  readonly terrain: TerrainKind;
  readonly occupants: readonly TokenId[];
}>;

export type StepEvaluation =
  | Readonly<{ readonly tag: "passable"; readonly weight: number }>
  | Readonly<{ readonly tag: "impassable" }>;

export type StepEvaluator = (step: ProspectiveStep) => StepEvaluation;

export type RouteStep = ProspectiveStep &
  Readonly<{
    readonly weight: number;
  }>;

export type RoutePlan = Readonly<{
  readonly plannedAtStateFingerprint: StateFingerprint;
  readonly plannedAtRevision: number;
  readonly mover: TokenId;
  readonly origin: CellCoordinate;
  readonly destination: CellCoordinate;
  readonly steps: readonly RouteStep[];
  readonly distanceFeet: number;
  readonly weight: number;
}>;

export type Result<Value, Error> =
  | Readonly<{ readonly tag: "ok"; readonly value: Value }>
  | Readonly<{ readonly tag: "error"; readonly error: Error }>;

export type ArenaIssue = Readonly<{
  readonly tag:
    | "invalid-arena"
    | "invalid-cells"
    | "invalid-boundaries"
    | "invalid-cell-coordinate"
    | "invalid-terrain"
    | "duplicate-cell"
    | "invalid-boundary-shape"
    | "invalid-boundary-coordinate"
    | "missing-boundary-cell"
    | "invalid-boundary-adjacency"
    | "duplicate-boundary"
    | "invalid-traversal"
    | "invalid-sight"
    | "invalid-cover";
  readonly path: string;
  readonly message: string;
}>;

export type ArenaParseResult =
  | Readonly<{ readonly tag: "ok"; readonly value: Arena }>
  | Readonly<{
      readonly tag: "error";
      readonly issues: readonly [ArenaIssue, ...ArenaIssue[]];
    }>;

export type TokenIdError = Readonly<{
  readonly tag: "invalid-token-id";
  readonly message: string;
}>;

export type CoordinateError = Readonly<{
  readonly tag: "invalid-coordinate";
  readonly message: string;
}>;

export type MissingCellError = Readonly<{
  readonly tag: "missing-cell";
  readonly coordinate: CellCoordinate;
}>;

export type DuplicateTokenError = Readonly<{
  readonly tag: "duplicate-token";
  readonly token: TokenId;
}>;

export type UnknownTokenError = Readonly<{
  readonly tag: "unknown-token";
  readonly token: TokenId;
}>;

export type PlaceTokenError =
  | CoordinateError
  | MissingCellError
  | DuplicateTokenError;
export type RemoveTokenError = UnknownTokenError;
export type OccupantsAtError = CoordinateError | MissingCellError;
export type PlacementOfError = UnknownTokenError;
export type RelationError = UnknownTokenError;

export type InvalidEvaluatorError = Readonly<{
  readonly tag: "invalid-evaluator";
  readonly message: string;
}>;

export type EvaluatorThrewError = Readonly<{
  readonly tag: "evaluator-threw";
  readonly message: string;
}>;

export type InvalidEvaluatorOutputError = Readonly<{
  readonly tag: "invalid-evaluator-output";
  readonly message: string;
}>;

export type RouteError =
  | UnknownTokenError
  | CoordinateError
  | Readonly<{
      readonly tag: "missing-destination-cell";
      readonly coordinate: CellCoordinate;
    }>
  | InvalidEvaluatorError
  | EvaluatorThrewError
  | InvalidEvaluatorOutputError
  | Readonly<{
      readonly tag: "no-route";
      readonly mover: TokenId;
      readonly destination: CellCoordinate;
    }>;

export type PreviewError =
  | CoordinateError
  | MissingCellError
  | UnknownTokenError
  | Readonly<{
      readonly tag: "not-adjacent";
      readonly from: CellCoordinate;
      readonly to: CellCoordinate;
    }>
  | Readonly<{
      readonly tag: "blocked-diagonal";
      readonly from: CellCoordinate;
      readonly to: CellCoordinate;
    }>
  | Readonly<{
      readonly tag: "blocked-step";
      readonly from: CellCoordinate;
      readonly to: CellCoordinate;
    }>
  | Readonly<{
      readonly tag: "step-impassable";
    }>
  | InvalidEvaluatorError
  | EvaluatorThrewError
  | InvalidEvaluatorOutputError;

export type CommitError =
  | Readonly<{
      readonly tag: "forged-preview";
    }>
  | Readonly<{
      readonly tag: "cross-arena-preview";
    }>
  | Readonly<{
      readonly tag: "stale-preview";
      readonly expectedFingerprint: StateFingerprint;
      readonly actualFingerprint: StateFingerprint;
      readonly expectedRevision: number;
      readonly actualRevision: number;
    }>
  | Readonly<{
      readonly tag: "mismatched-origin";
      readonly expected: CellCoordinate;
      readonly actual: CellCoordinate;
    }>;

export type PreviewRelationError =
  | Readonly<{
      readonly tag: "forged-preview";
    }>
  | UnknownTokenError;

type ArenaData = Readonly<{
  readonly snapshot: ArenaSnapshot;
  readonly cells: ReadonlyMap<string, ArenaCell>;
  readonly boundaries: ReadonlyMap<string, ArenaBoundary>;
}>;

type StateData = Readonly<{
  readonly arena: Arena;
  readonly revision: number;
  readonly fingerprint: StateFingerprint;
  readonly placements: ReadonlyMap<TokenId, CellCoordinate>;
}>;

type PreviewData = Readonly<{
  readonly arena: Arena;
  readonly state: SpatialState;
  readonly stateFingerprint: StateFingerprint;
  readonly revision: number;
  readonly mover: TokenId;
  readonly from: CellCoordinate;
  readonly to: CellCoordinate;
  readonly step: RouteStep;
}>;

const arenaDataByHandle = new WeakMap<Arena, ArenaData>();
const stateDataByHandle = new WeakMap<SpatialState, StateData>();
const previewDataByHandle = new WeakMap<object, PreviewData>();
const parsedCoordinates = new WeakSet<object>();

export function parseTokenId(input: unknown): Result<TokenId, TokenIdError> {
  if (typeof input !== "string" || input.length === 0) {
    return failure({
      tag: "invalid-token-id",
      message: "A token identity must be a nonempty string.",
    });
  }

  // The brand is compile-time only; the length check immediately above is the
  // runtime proof that makes this boundary conversion safe.
  const token = input as TokenId;
  return success(token);
}

export function parseCoordinate(
  input: unknown,
): Result<CellCoordinate, CoordinateError> {
  const coordinate = readCoordinate(input);
  if (coordinate === undefined) {
    return failure({
      tag: "invalid-coordinate",
      message: "A coordinate requires finite safe integer x and y values.",
    });
  }
  return success(coordinate);
}

export function parseArena(input: unknown): ArenaParseResult {
  const issues: ArenaIssue[] = [];
  if (!isRecord(input)) {
    return arenaFailure([
      arenaIssue("invalid-arena", "arena", "An arena must be an object."),
    ]);
  }

  const rawCells = input.cells;
  const rawBoundaries = input.boundaries;
  const cells: ArenaCell[] = [];
  const cellByKey = new Map<string, ArenaCell>();
  const seenCellKeys = new Set<string>();

  if (!Array.isArray(rawCells)) {
    issues.push(
      arenaIssue("invalid-cells", "cells", "Arena cells must be an array."),
    );
  } else {
    rawCells.forEach((rawCell, index) => {
      const path = `cells[${index}]`;
      if (!isRecord(rawCell)) {
        issues.push(
          arenaIssue(
            "invalid-cell-coordinate",
            path,
            "A cell must be an object with x, y, and terrain.",
          ),
        );
        return;
      }
      const coordinate = readCoordinateFromRecord(rawCell, path, issues);
      const terrain = readTerrain(rawCell.terrain);
      if (terrain === undefined) {
        issues.push(
          arenaIssue(
            "invalid-terrain",
            `${path}.terrain`,
            "Terrain must be ordinary or difficult.",
          ),
        );
      }
      if (coordinate === undefined) {
        return;
      }
      const key = coordinateKey(coordinate);
      if (seenCellKeys.has(key)) {
        issues.push(
          arenaIssue(
            "duplicate-cell",
            path,
            "Each coordinate may appear only once in an arena.",
          ),
        );
        return;
      }
      seenCellKeys.add(key);
      if (terrain === undefined) {
        return;
      }
      const cell = freezeValue({ coordinate, terrain });
      cells.push(cell);
      cellByKey.set(key, cell);
    });
  }

  const boundaries: ArenaBoundary[] = [];
  const boundaryByKey = new Map<string, ArenaBoundary>();
  const seenBoundaryKeys = new Set<string>();
  if (!Array.isArray(rawBoundaries)) {
    issues.push(
      arenaIssue(
        "invalid-boundaries",
        "boundaries",
        "Arena boundaries must be an array.",
      ),
    );
  } else {
    rawBoundaries.forEach((rawBoundary, index) => {
      const path = `boundaries[${index}]`;
      if (!isRecord(rawBoundary) || !Array.isArray(rawBoundary.between)) {
        issues.push(
          arenaIssue(
            "invalid-boundary-shape",
            path,
            "A boundary requires a pair of cell coordinates.",
          ),
        );
        return;
      }
      if (rawBoundary.between.length !== 2) {
        issues.push(
          arenaIssue(
            "invalid-boundary-shape",
            `${path}.between`,
            "A boundary requires exactly two cell coordinates.",
          ),
        );
        return;
      }
      const first = readBoundaryCoordinate(
        rawBoundary.between[0],
        `${path}.between[0]`,
        issues,
      );
      const second = readBoundaryCoordinate(
        rawBoundary.between[1],
        `${path}.between[1]`,
        issues,
      );
      const traversal = readBoundaryOpenness(rawBoundary.traversal);
      if (traversal === undefined) {
        issues.push(
          arenaIssue(
            "invalid-traversal",
            `${path}.traversal`,
            "Traversal must be open or blocked.",
          ),
        );
      }
      const sight = readBoundaryOpenness(rawBoundary.sight);
      if (sight === undefined) {
        issues.push(
          arenaIssue(
            "invalid-sight",
            `${path}.sight`,
            "Sight must be open or blocked.",
          ),
        );
      }
      const cover = readCover(rawBoundary.cover);
      if (cover === undefined) {
        issues.push(
          arenaIssue(
            "invalid-cover",
            `${path}.cover`,
            "Cover must be none, half, three-quarters, or total.",
          ),
        );
      }
      if (first === undefined || second === undefined) {
        return;
      }
      const key = boundaryKey(first, second);
      if (!cellByKey.has(coordinateKey(first))) {
        issues.push(
          arenaIssue(
            "missing-boundary-cell",
            `${path}.between[0]`,
            "A boundary endpoint must name an authored cell.",
          ),
        );
      }
      if (!cellByKey.has(coordinateKey(second))) {
        issues.push(
          arenaIssue(
            "missing-boundary-cell",
            `${path}.between[1]`,
            "A boundary endpoint must name an authored cell.",
          ),
        );
      }
      if (!areOrthogonalNeighbours(first, second)) {
        issues.push(
          arenaIssue(
            "invalid-boundary-adjacency",
            `${path}.between`,
            "A boundary must join orthogonally adjacent cells.",
          ),
        );
      }
      if (seenBoundaryKeys.has(key)) {
        issues.push(
          arenaIssue(
            "duplicate-boundary",
            path,
            "Each pair of adjacent cells may have only one boundary.",
          ),
        );
      }
      seenBoundaryKeys.add(key);
      if (
        traversal === undefined ||
        sight === undefined ||
        cover === undefined ||
        !cellByKey.has(coordinateKey(first)) ||
        !cellByKey.has(coordinateKey(second)) ||
        !areOrthogonalNeighbours(first, second) ||
        boundaryByKey.has(key)
      ) {
        return;
      }
      const [canonicalFirst, canonicalSecond] = canonicalPair(first, second);
      const boundary = freezeValue({
        between: [canonicalFirst, canonicalSecond] as const,
        traversal,
        sight,
        cover,
      });
      boundaries.push(boundary);
      boundaryByKey.set(key, boundary);
    });
  }

  if (issues.length > 0) {
    return arenaFailure(issues);
  }

  cells.sort(compareCells);
  boundaries.sort(compareBoundaries);
  const snapshotWithoutFingerprint = {
    cellSizeFeet: CELL_SIZE_FEET,
    cells,
    boundaries,
  };
  const fingerprint = makeArenaFingerprint({
    schema: "tactical-space/1",
    ...snapshotWithoutFingerprint,
  });
  const snapshot = freezeValue({
    ...snapshotWithoutFingerprint,
    fingerprint,
  });
  const handle = makeArenaHandle();
  const data = freezeValue({
    snapshot,
    cells: new Map(cells.map((cell) => [coordinateKey(cell.coordinate), cell])),
    boundaries: new Map(
      boundaries.map((boundary) => [
        boundaryKey(boundary.between[0], boundary.between[1]),
        boundary,
      ]),
    ),
  });
  arenaDataByHandle.set(handle, data);
  return arenaSuccess(handle);
}

export function arenaSnapshot(arena: Arena): ArenaSnapshot {
  return arenaDataOf(arena).snapshot;
}

export function createState(arena: Arena): SpatialState {
  const placements = new Map<TokenId, CellCoordinate>();
  return makeState(arena, 0, placements);
}

export function snapshot(state: SpatialState): SpatialSnapshot {
  const data = stateDataOf(state);
  return makeStateSnapshot(data, arenaDataOf(data.arena));
}

export function placeToken(
  state: SpatialState,
  token: TokenId,
  coordinate: CellCoordinate,
): Result<SpatialState, PlaceTokenError> {
  const stateData = stateDataOf(state);
  const arenaData = arenaDataOf(stateData.arena);
  if (!isParsedCoordinate(coordinate)) {
    return failure({
      tag: "invalid-coordinate",
      message:
        "Coordinates must come from parseCoordinate or a public snapshot.",
    });
  }
  if (!arenaData.cells.has(coordinateKey(coordinate))) {
    return failure({ tag: "missing-cell", coordinate });
  }
  if (stateData.placements.has(token)) {
    return failure({ tag: "duplicate-token", token });
  }
  const placements = new Map(stateData.placements);
  placements.set(token, coordinate);
  return success(
    makeState(stateData.arena, stateData.revision + 1, placements),
  );
}

export function removeToken(
  state: SpatialState,
  token: TokenId,
): Result<SpatialState, RemoveTokenError> {
  const stateData = stateDataOf(state);
  if (!stateData.placements.has(token)) {
    return failure({ tag: "unknown-token", token });
  }
  const placements = new Map(stateData.placements);
  placements.delete(token);
  return success(
    makeState(stateData.arena, stateData.revision + 1, placements),
  );
}

export function occupantsAt(
  state: SpatialState,
  coordinate: CellCoordinate,
): Result<readonly TokenId[], OccupantsAtError> {
  const stateData = stateDataOf(state);
  const arenaData = arenaDataOf(stateData.arena);
  if (!isParsedCoordinate(coordinate)) {
    return failure({
      tag: "invalid-coordinate",
      message:
        "Coordinates must come from parseCoordinate or a public snapshot.",
    });
  }
  if (!arenaData.cells.has(coordinateKey(coordinate))) {
    return failure({ tag: "missing-cell", coordinate });
  }
  const occupants = Array.from(stateData.placements.entries())
    .filter(([, placement]) => sameCoordinate(placement, coordinate))
    .map(([token]) => token)
    .sort(compareStringsByCodeUnit);
  return success(freezeValue(occupants));
}

export function placementOf(
  state: SpatialState,
  token: TokenId,
): Result<TokenPlacement, PlacementOfError> {
  const stateData = stateDataOf(state);
  const coordinate = stateData.placements.get(token);
  if (coordinate === undefined) {
    return failure({ tag: "unknown-token", token });
  }
  return success(freezeValue({ token, coordinate }));
}

export function relationBetween(
  state: SpatialState,
  source: TokenId,
  target: TokenId,
): Result<SpatialRelation, RelationError> {
  const stateData = stateDataOf(state);
  return relationForPlacements(
    arenaDataOf(stateData.arena),
    stateData.placements,
    source,
    target,
  );
}

export function renderRelation(relation: SpatialRelation): string {
  const cover = coverLabel(relation.cover);
  const direction =
    relation.direction === "same-horizontal-position"
      ? "same horizontal position"
      : relation.direction;
  return `${relation.target}: ${direction}, ${relation.distanceFeet} ft; geometric sight ${relation.sight}; ${cover}.`;
}

export const physicalDistanceEvaluator: StepEvaluator = (step) =>
  freezeValue({ tag: "passable", weight: step.distanceFeet });

export function planRoute(
  state: SpatialState,
  mover: TokenId,
  destination: CellCoordinate,
  evaluateStep: StepEvaluator,
): Result<RoutePlan, RouteError> {
  const stateData = stateDataOf(state);
  const arenaData = arenaDataOf(stateData.arena);
  if (!isParsedCoordinate(destination)) {
    return failure({
      tag: "invalid-coordinate",
      message:
        "Coordinates must come from parseCoordinate or a public snapshot.",
    });
  }
  const origin = stateData.placements.get(mover);
  if (origin === undefined) {
    return failure({ tag: "unknown-token", token: mover });
  }
  if (!arenaData.cells.has(coordinateKey(destination))) {
    return failure({
      tag: "missing-destination-cell",
      coordinate: destination,
    });
  }
  if (typeof evaluateStep !== "function") {
    return failure({
      tag: "invalid-evaluator",
      message: "A route evaluator must be a function.",
    });
  }
  if (sameCoordinate(origin, destination)) {
    return success(
      makeRoutePlan(stateData, mover, origin, destination, [], 0, 0),
    );
  }

  type SearchNode = Readonly<{
    readonly coordinate: CellCoordinate;
    readonly steps: readonly RouteStep[];
    readonly coordinates: readonly CellCoordinate[];
    readonly weight: number;
    readonly distanceFeet: number;
  }>;
  const initial: SearchNode = {
    coordinate: origin,
    steps: [],
    coordinates: [origin],
    weight: 0,
    distanceFeet: 0,
  };
  const queue: SearchNode[] = [initial];
  const bestByCell = new Map<string, SearchNode>([
    [coordinateKey(origin), initial],
  ]);

  while (queue.length > 0) {
    queue.sort(compareSearchNodes);
    const node = queue.shift();
    if (node === undefined) {
      break;
    }
    const best = bestByCell.get(coordinateKey(node.coordinate));
    if (best !== node) {
      continue;
    }
    if (sameCoordinate(node.coordinate, destination)) {
      return success(
        makeRoutePlan(
          stateData,
          mover,
          origin,
          destination,
          node.steps,
          node.distanceFeet,
          node.weight,
        ),
      );
    }
    for (const next of movementNeighbours(arenaData, node.coordinate)) {
      const stepGeometry = makeProspectiveStep(
        arenaData,
        stateData.placements,
        mover,
        node.coordinate,
        next,
      );
      if (stepGeometry === undefined) {
        continue;
      }
      const evaluation = evaluateProspectiveStep(evaluateStep, stepGeometry);
      if (evaluation.tag === "error") {
        return failure(evaluation.error);
      }
      if (evaluation.tag === "impassable") {
        continue;
      }
      const candidate: SearchNode = {
        coordinate: next,
        steps: [...node.steps, evaluation.step],
        coordinates: [...node.coordinates, next],
        weight: node.weight + evaluation.step.weight,
        distanceFeet: node.distanceFeet + evaluation.step.distanceFeet,
      };
      if (!Number.isFinite(candidate.weight)) {
        return failure({
          tag: "invalid-evaluator-output",
          message: "The evaluator weights must have a finite route total.",
        });
      }
      const nextKey = coordinateKey(next);
      const previous = bestByCell.get(nextKey);
      if (
        previous === undefined ||
        compareSearchNodes(candidate, previous) < 0
      ) {
        bestByCell.set(nextKey, candidate);
        queue.push(candidate);
      }
    }
  }

  return failure({
    tag: "no-route",
    mover,
    destination,
  });
}

export function renderRoute(plan: RoutePlan): string {
  const steps = plan.steps
    .map(
      (step, index) =>
        `${index + 1}. ${formatCoordinate(step.from)} -> ${formatCoordinate(step.to)}; ${step.distanceFeet} ft; ${step.terrain}; occupants: ${step.occupants.join(", ") || "none"}; weight ${step.weight}`,
    )
    .join(" ");
  const suffix = steps.length === 0 ? " no steps." : ` steps: ${steps}.`;
  return `route to ${formatCoordinate(plan.destination)}; physical distance ${plan.distanceFeet} ft; opaque weight ${plan.weight}.${suffix}`;
}

export function previewStep(
  state: SpatialState,
  mover: TokenId,
  destination: CellCoordinate,
  evaluateStep: StepEvaluator,
): Result<StepPreview, PreviewError> {
  const stateData = stateDataOf(state);
  const arenaData = arenaDataOf(stateData.arena);
  if (!isParsedCoordinate(destination)) {
    return failure({
      tag: "invalid-coordinate",
      message:
        "Coordinates must come from parseCoordinate or a public snapshot.",
    });
  }
  if (!stateData.placements.has(mover)) {
    return failure({
      tag: "unknown-token",
      token: mover,
    });
  }
  const from = stateData.placements.get(mover);
  if (from === undefined) {
    return failure({ tag: "unknown-token", token: mover });
  }
  if (!arenaData.cells.has(coordinateKey(destination))) {
    return failure({ tag: "missing-cell", coordinate: destination });
  }
  const deltaX = Math.abs(destination.x - from.x);
  const deltaY = Math.abs(destination.y - from.y);
  if (deltaX > 1 || deltaY > 1 || (deltaX === 0 && deltaY === 0)) {
    return failure({ tag: "not-adjacent", from, to: destination });
  }
  if (
    isDiagonal(from, destination) &&
    !isDiagonalTraversalOpen(arenaData, from, destination)
  ) {
    return failure({ tag: "blocked-diagonal", from, to: destination });
  }
  if (
    !isDiagonal(from, destination) &&
    !boundaryTraversalOpen(arenaData, from, destination)
  ) {
    return failure({ tag: "blocked-step", from, to: destination });
  }
  if (typeof evaluateStep !== "function") {
    return failure({
      tag: "invalid-evaluator",
      message: "A route evaluator must be a function.",
    });
  }
  const geometry = makeProspectiveStep(
    arenaData,
    stateData.placements,
    mover,
    from,
    destination,
  );
  if (geometry === undefined) {
    return failure({ tag: "blocked-diagonal", from, to: destination });
  }
  const evaluation = evaluateProspectiveStep(evaluateStep, geometry);
  if (evaluation.tag === "error") {
    return failure(evaluation.error);
  }
  if (evaluation.tag === "impassable") {
    return failure({ tag: "step-impassable" });
  }
  const step = evaluation.step;
  const handle = makePreviewHandle();
  previewDataByHandle.set(
    handle,
    freezeValue({
      arena: stateData.arena,
      state,
      stateFingerprint: stateData.fingerprint,
      revision: stateData.revision,
      mover,
      from,
      to: destination,
      step,
    }),
  );
  return success(handle);
}

export function previewRelation(
  preview: StepPreview,
  counterpart: TokenId,
  phase: "before" | "after",
): Result<SpatialRelation, PreviewRelationError> {
  const previewData = isObject(preview)
    ? previewDataByHandle.get(preview)
    : undefined;
  if (previewData === undefined) {
    return failure({ tag: "forged-preview" });
  }
  const stateData = stateDataOf(previewData.state);
  if (!stateData.placements.has(counterpart)) {
    return failure({
      tag: "unknown-token",
      token: counterpart,
    });
  }
  const placements = new Map(stateData.placements);
  if (phase === "after") {
    placements.set(previewData.mover, previewData.to);
  }
  return relationForPlacements(
    arenaDataOf(previewData.arena),
    placements,
    previewData.mover,
    counterpart,
  );
}

export function commitPreview(
  state: SpatialState,
  preview: StepPreview,
): Result<SpatialState, CommitError> {
  const previewData = isObject(preview)
    ? previewDataByHandle.get(preview)
    : undefined;
  if (previewData === undefined) {
    return failure({ tag: "forged-preview" });
  }
  const stateData = stateDataOf(state);
  if (stateData.arena !== previewData.arena) {
    return failure({ tag: "cross-arena-preview" });
  }
  if (stateData.fingerprint !== previewData.stateFingerprint) {
    return failure({
      tag: "stale-preview",
      expectedFingerprint: previewData.stateFingerprint,
      actualFingerprint: stateData.fingerprint,
      expectedRevision: previewData.revision,
      actualRevision: stateData.revision,
    });
  }
  const actualOrigin = stateData.placements.get(previewData.mover);
  if (actualOrigin === undefined) {
    return failure({
      tag: "mismatched-origin",
      expected: previewData.from,
      actual: previewData.from,
    });
  }
  if (!sameCoordinate(actualOrigin, previewData.from)) {
    return failure({
      tag: "mismatched-origin",
      expected: previewData.from,
      actual: actualOrigin,
    });
  }
  const placements = new Map(stateData.placements);
  placements.set(previewData.mover, previewData.to);
  return success(
    makeState(stateData.arena, stateData.revision + 1, placements),
  );
}

function relationForPlacements(
  arenaData: ArenaData,
  placements: ReadonlyMap<TokenId, CellCoordinate>,
  source: TokenId,
  target: TokenId,
): Result<SpatialRelation, RelationError> {
  if (!placements.has(source)) {
    return failure({ tag: "unknown-token", token: source });
  }
  if (!placements.has(target)) {
    return failure({ tag: "unknown-token", token: target });
  }
  const sourceCoordinate = placements.get(source);
  const targetCoordinate = placements.get(target);
  if (sourceCoordinate === undefined || targetCoordinate === undefined) {
    // The map lookup checks immediately above establish this as an internal
    // invariant; the branch keeps the implementation total if its type widens.
    throw new Error("placement map lost a token after presence check");
  }
  const deltaX = targetCoordinate.x - sourceCoordinate.x;
  const deltaY = targetCoordinate.y - sourceCoordinate.y;
  const ray = rayFacts(arenaData, sourceCoordinate, targetCoordinate);
  return success(
    freezeValue({
      source,
      target,
      direction: directionFor(deltaX, deltaY),
      distanceFeet:
        Math.max(Math.abs(deltaX), Math.abs(deltaY)) * CELL_SIZE_FEET,
      sight: ray.sightBlocked ? "blocked" : "clear",
      cover: ray.cover,
    }),
  );
}

function makeState(
  arena: Arena,
  revision: number,
  placements: Map<TokenId, CellCoordinate>,
): SpatialState {
  const arenaData = arenaDataOf(arena);
  const frozenPlacements = new Map(
    Array.from(placements.entries()).map(([token, coordinate]) => [
      token,
      coordinateFromIntegers(coordinate.x, coordinate.y),
    ]),
  );
  const fingerprint = makeStateFingerprint(
    arenaData.snapshot.fingerprint,
    revision,
    frozenPlacements,
  );
  // The handle carries no state at runtime.  WeakMap membership is the
  // authenticity check used by all public operations on an opaque state.
  const handle = Object.freeze({}) as SpatialState;
  stateDataByHandle.set(
    handle,
    freezeValue({
      arena,
      revision,
      fingerprint,
      placements: frozenPlacements,
    }),
  );
  return handle;
}

function makeStateSnapshot(
  state: StateData,
  arena: ArenaData,
): SpatialSnapshot {
  const placements = Array.from(state.placements.entries())
    .sort(([first], [second]) => compareStringsByCodeUnit(first, second))
    .map(([token, coordinate]) =>
      freezeValue({
        token,
        coordinate: coordinateFromIntegers(coordinate.x, coordinate.y),
      }),
    );
  return freezeValue({
    arenaFingerprint: arena.snapshot.fingerprint,
    revision: state.revision,
    fingerprint: state.fingerprint,
    placements,
  });
}

function makeRoutePlan(
  state: StateData,
  mover: TokenId,
  origin: CellCoordinate,
  destination: CellCoordinate,
  steps: readonly RouteStep[],
  distanceFeet: number,
  weight: number,
): RoutePlan {
  return freezeValue({
    plannedAtStateFingerprint: state.fingerprint,
    plannedAtRevision: state.revision,
    mover,
    origin,
    destination,
    steps: steps.map((step) =>
      freezeValue({
        from: step.from,
        to: step.to,
        distanceFeet: step.distanceFeet,
        terrain: step.terrain,
        occupants: freezeValue([...step.occupants]),
        weight: step.weight,
      }),
    ),
    distanceFeet,
    weight,
  });
}

function makeProspectiveStep(
  arena: ArenaData,
  placements: ReadonlyMap<TokenId, CellCoordinate>,
  mover: TokenId,
  from: CellCoordinate,
  to: CellCoordinate,
): ProspectiveStep | undefined {
  if (!isAdjacentStep(arena, from, to)) {
    return undefined;
  }
  const destinationCell = arena.cells.get(coordinateKey(to));
  if (destinationCell === undefined) {
    return undefined;
  }
  const occupants = Array.from(placements.entries())
    .filter(
      ([token, coordinate]) =>
        token !== mover && sameCoordinate(coordinate, to),
    )
    .map(([token]) => token)
    .sort(compareStringsByCodeUnit);
  return freezeValue({
    from,
    to,
    distanceFeet: CELL_SIZE_FEET,
    terrain: destinationCell.terrain,
    occupants: freezeValue(occupants),
  });
}

type EvaluationResult =
  | Readonly<{ readonly tag: "passable"; readonly step: RouteStep }>
  | Readonly<{ readonly tag: "impassable" }>
  | Readonly<{
      readonly tag: "error";
      readonly error: Extract<
        RouteError,
        Readonly<
          | { readonly tag: "invalid-evaluator" }
          | { readonly tag: "evaluator-threw" }
          | { readonly tag: "invalid-evaluator-output" }
        >
      >;
    }>;

function evaluateProspectiveStep(
  evaluateStep: StepEvaluator,
  step: ProspectiveStep,
): EvaluationResult {
  let raw: unknown;
  try {
    raw = evaluateStep(step);
  } catch (error) {
    return {
      tag: "error",
      error: {
        tag: "evaluator-threw",
        message:
          error instanceof Error ? error.message : "The evaluator threw.",
      },
    };
  }
  if (!isRecord(raw) || typeof raw.tag !== "string") {
    return {
      tag: "error",
      error: {
        tag: "invalid-evaluator-output",
        message: "The evaluator must return passable or impassable.",
      },
    };
  }
  if (raw.tag === "impassable") {
    return { tag: "impassable" };
  }
  if (
    raw.tag !== "passable" ||
    typeof raw.weight !== "number" ||
    !Number.isFinite(raw.weight) ||
    raw.weight < 0
  ) {
    return {
      tag: "error",
      error: {
        tag: "invalid-evaluator-output",
        message: "A passable evaluator weight must be finite and nonnegative.",
      },
    };
  }
  return {
    tag: "passable",
    step: freezeValue({ ...step, weight: raw.weight }),
  };
}

function movementNeighbours(
  arena: ArenaData,
  from: CellCoordinate,
): readonly CellCoordinate[] {
  const candidates: CellCoordinate[] = [];
  for (const dx of [-1, 0, 1]) {
    for (const dy of [-1, 0, 1]) {
      if (dx === 0 && dy === 0) {
        continue;
      }
      const candidateX = from.x + dx;
      const candidateY = from.y + dy;
      if (
        !Number.isSafeInteger(candidateX) ||
        !Number.isSafeInteger(candidateY)
      ) {
        continue;
      }
      const candidate = coordinateFromIntegers(candidateX, candidateY);
      if (
        arena.cells.has(coordinateKey(candidate)) &&
        isAdjacentStep(arena, from, candidate)
      ) {
        candidates.push(candidate);
      }
    }
  }
  return candidates.sort(compareCoordinates);
}

function isAdjacentStep(
  arena: ArenaData,
  from: CellCoordinate,
  to: CellCoordinate,
): boolean {
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  if (dx > 1 || dy > 1 || (dx === 0 && dy === 0)) {
    return false;
  }
  if (
    !arena.cells.has(coordinateKey(from)) ||
    !arena.cells.has(coordinateKey(to))
  ) {
    return false;
  }
  if (dx === 1 && dy === 1) {
    return isDiagonalTraversalOpen(arena, from, to);
  }
  return boundaryTraversalOpen(arena, from, to);
}

function isDiagonalTraversalOpen(
  arena: ArenaData,
  from: CellCoordinate,
  to: CellCoordinate,
): boolean {
  const stepX = coordinateFromIntegers(to.x, from.y);
  const stepY = coordinateFromIntegers(from.x, to.y);
  if (
    !arena.cells.has(coordinateKey(stepX)) ||
    !arena.cells.has(coordinateKey(stepY))
  ) {
    return false;
  }
  return (
    boundaryTraversalOpen(arena, from, stepX) &&
    boundaryTraversalOpen(arena, stepX, to) &&
    boundaryTraversalOpen(arena, from, stepY) &&
    boundaryTraversalOpen(arena, stepY, to)
  );
}

function boundaryTraversalOpen(
  arena: ArenaData,
  first: CellCoordinate,
  second: CellCoordinate,
): boolean {
  const boundary = arena.boundaries.get(boundaryKey(first, second));
  return boundary?.traversal !== "blocked";
}

type RayFacts = Readonly<{
  readonly sightBlocked: boolean;
  readonly cover: CoverDegree;
}>;

function rayFacts(
  arena: ArenaData,
  source: CellCoordinate,
  target: CellCoordinate,
): RayFacts {
  let sightBlocked = false;
  let cover: CoverDegree = "none";
  let current = source;
  const deltaX = target.x - source.x;
  const deltaY = target.y - source.y;
  const stepX = Math.sign(deltaX);
  const stepY = Math.sign(deltaY);
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  let nextX = absX === 0 ? undefined : 1n;
  let nextY = absY === 0 ? undefined : 1n;
  const denominatorX = absX === 0 ? undefined : 2n * BigInt(absX);
  const denominatorY = absY === 0 ? undefined : 2n * BigInt(absY);

  const inspect = (first: CellCoordinate, second: CellCoordinate): void => {
    if (!arena.cells.has(coordinateKey(second))) {
      sightBlocked = true;
    }
    const boundary = arena.boundaries.get(boundaryKey(first, second));
    if (boundary === undefined) {
      return;
    }
    if (boundary.sight === "blocked") {
      sightBlocked = true;
    }
    cover = moreProtectiveCover(cover, boundary.cover);
  };

  while (!sameCoordinate(current, target)) {
    const xBeforeY =
      nextX !== undefined &&
      denominatorX !== undefined &&
      (nextY === undefined ||
        denominatorY === undefined ||
        nextX * denominatorY < nextY * denominatorX);
    const yBeforeX =
      nextY !== undefined &&
      denominatorY !== undefined &&
      (nextX === undefined ||
        denominatorX === undefined ||
        nextY * denominatorX < nextX * denominatorY);
    if (xBeforeY) {
      const next = coordinateFromIntegers(current.x + stepX, current.y);
      inspect(current, next);
      current = next;
      nextX = (nextX ?? 1n) + 2n;
      continue;
    }
    if (yBeforeX) {
      const next = coordinateFromIntegers(current.x, current.y + stepY);
      inspect(current, next);
      current = next;
      nextY = (nextY ?? 1n) + 2n;
      continue;
    }

    // At an exact grid corner the center ray touches all four local
    // cardinal boundaries.  Inspecting both orthogonal transition orders on
    // each side makes reversal symmetric and applies blocked-if-either plus
    // maximum-Cover without coupling the two facts.
    const sideX = coordinateFromIntegers(current.x + stepX, current.y);
    const sideY = coordinateFromIntegers(current.x, current.y + stepY);
    const diagonal = coordinateFromIntegers(
      current.x + stepX,
      current.y + stepY,
    );
    inspect(current, sideX);
    inspect(current, sideY);
    inspect(sideX, diagonal);
    inspect(sideY, diagonal);
    current = diagonal;
    nextX = (nextX ?? 1n) + 2n;
    nextY = (nextY ?? 1n) + 2n;
  }
  return { sightBlocked, cover };
}

function directionFor(deltaX: number, deltaY: number): Direction {
  let direction: Direction;
  if (deltaX === 0 && deltaY === 0) {
    direction = "same-horizontal-position";
  } else if (deltaX === 0 && deltaY > 0) {
    direction = "north";
  } else if (deltaX === 0 && deltaY < 0) {
    direction = "south";
  } else if (deltaX > 0 && deltaY > 0) {
    direction = "north-east";
  } else if (deltaX > 0 && deltaY < 0) {
    direction = "south-east";
  } else if (deltaX < 0 && deltaY > 0) {
    direction = "north-west";
  } else if (deltaX < 0 && deltaY < 0) {
    direction = "south-west";
  } else if (deltaX > 0) {
    direction = "east";
  } else {
    direction = "west";
  }
  if (!DIRECTIONS.includes(direction)) {
    // Every branch above assigns a Direction; this protects the fixed runtime
    // vocabulary if a future branch is edited without updating the array.
    throw new Error("Direction vocabulary drifted from directionFor.");
  }
  return direction;
}

function compareSearchNodes(
  first: Readonly<{
    readonly coordinates: readonly CellCoordinate[];
    readonly weight: number;
    readonly distanceFeet: number;
  }>,
  second: Readonly<{
    readonly coordinates: readonly CellCoordinate[];
    readonly weight: number;
    readonly distanceFeet: number;
  }>,
): number {
  if (first.weight !== second.weight) {
    return first.weight - second.weight;
  }
  if (first.distanceFeet !== second.distanceFeet) {
    return first.distanceFeet - second.distanceFeet;
  }
  return compareCoordinateSequences(first.coordinates, second.coordinates);
}

function compareCoordinateSequences(
  first: readonly CellCoordinate[],
  second: readonly CellCoordinate[],
): number {
  const length = Math.min(first.length, second.length);
  for (let index = 0; index < length; index += 1) {
    const comparison = compareCoordinates(first[index], second[index]);
    if (comparison !== 0) {
      return comparison;
    }
  }
  return first.length - second.length;
}

function compareCells(first: ArenaCell, second: ArenaCell): number {
  return compareCoordinates(first.coordinate, second.coordinate);
}

function compareBoundaries(
  first: ArenaBoundary,
  second: ArenaBoundary,
): number {
  const firstPair = first.between;
  const secondPair = second.between;
  return (
    compareCoordinates(firstPair[0], secondPair[0]) ||
    compareCoordinates(firstPair[1], secondPair[1])
  );
}

function compareCoordinates(
  first: CellCoordinate,
  second: CellCoordinate,
): number {
  return first.x - second.x || first.y - second.y;
}

function compareStringsByCodeUnit(first: string, second: string): number {
  const length = Math.min(first.length, second.length);
  for (let index = 0; index < length; index += 1) {
    const difference = first.charCodeAt(index) - second.charCodeAt(index);
    if (difference !== 0) {
      return difference;
    }
  }
  return first.length - second.length;
}

function moreProtectiveCover(
  first: CoverDegree,
  second: CoverDegree,
): CoverDegree {
  return coverRank(first) >= coverRank(second) ? first : second;
}

function coverRank(cover: CoverDegree): number {
  if (cover === "none") {
    return 0;
  }
  if (cover === "half") {
    return 1;
  }
  if (cover === "three-quarters") {
    return 2;
  }
  return 3;
}

function coverLabel(cover: CoverDegree): string {
  if (cover === "none") {
    return "no cover";
  }
  if (cover === "half") {
    return "Half Cover";
  }
  if (cover === "three-quarters") {
    return "Three-Quarters Cover";
  }
  return "Total Cover";
}

function formatCoordinate(coordinate: CellCoordinate): string {
  return `(${coordinate.x},${coordinate.y})`;
}

function canonicalPair(
  first: CellCoordinate,
  second: CellCoordinate,
): readonly [CellCoordinate, CellCoordinate] {
  return compareCoordinates(first, second) <= 0
    ? [first, second]
    : [second, first];
}

function boundaryKey(first: CellCoordinate, second: CellCoordinate): string {
  const [canonicalFirst, canonicalSecond] = canonicalPair(first, second);
  return `${coordinateKey(canonicalFirst)}|${coordinateKey(canonicalSecond)}`;
}

function coordinateKey(coordinate: CellCoordinate): string {
  return `${coordinate.x},${coordinate.y}`;
}

function sameCoordinate(
  first: CellCoordinate,
  second: CellCoordinate,
): boolean {
  return first.x === second.x && first.y === second.y;
}

function areOrthogonalNeighbours(
  first: CellCoordinate,
  second: CellCoordinate,
): boolean {
  return Math.abs(first.x - second.x) + Math.abs(first.y - second.y) === 1;
}

function isDiagonal(first: CellCoordinate, second: CellCoordinate): boolean {
  return (
    Math.abs(first.x - second.x) === 1 && Math.abs(first.y - second.y) === 1
  );
}

function readCoordinate(input: unknown): CellCoordinate | undefined {
  if (!isRecord(input)) {
    return undefined;
  }
  const x = input.x;
  const y = input.y;
  if (!isSafeInteger(x) || !isSafeInteger(y)) {
    return undefined;
  }
  return coordinateFromIntegers(normalizeZero(x), normalizeZero(y));
}

function coordinateFromIntegers(x: number, y: number): CellCoordinate {
  // Callers of this helper already passed the integer parser or derive both
  // values from parsed coordinates. The assertion records that local fact in
  // the compile-time type; WeakSet registration supplies runtime capability
  // authenticity for coordinates accepted by public operations.
  const coordinate = freezeValue({ x, y });
  parsedCoordinates.add(coordinate);
  return coordinate as CellCoordinate;
}

function isParsedCoordinate(input: unknown): input is CellCoordinate {
  return (
    input !== null && typeof input === "object" && parsedCoordinates.has(input)
  );
}

function readCoordinateFromRecord(
  record: Record<string, unknown>,
  path: string,
  issues: ArenaIssue[],
): CellCoordinate | undefined {
  const coordinate = readCoordinate(record);
  if (coordinate === undefined) {
    issues.push(
      arenaIssue(
        "invalid-cell-coordinate",
        path,
        "A coordinate requires finite safe integer x and y values.",
      ),
    );
  }
  return coordinate;
}

function readBoundaryCoordinate(
  input: unknown,
  path: string,
  issues: ArenaIssue[],
): CellCoordinate | undefined {
  const coordinate = readCoordinate(input);
  if (coordinate === undefined) {
    issues.push(
      arenaIssue(
        "invalid-boundary-coordinate",
        path,
        "A boundary endpoint requires finite safe integer x and y values.",
      ),
    );
  }
  return coordinate;
}

function readTerrain(input: unknown): TerrainKind | undefined {
  return isOneOf(TERRAIN_KINDS, input) ? input : undefined;
}

function readBoundaryOpenness(input: unknown): BoundaryOpenness | undefined {
  return isOneOf(BOUNDARY_OPENNESS, input) ? input : undefined;
}

function readCover(input: unknown): CoverDegree | undefined {
  return isOneOf(COVER_DEGREES, input) ? input : undefined;
}

function isOneOf<const Values extends readonly string[]>(
  values: Values,
  input: unknown,
): input is Values[number] {
  return typeof input === "string" && values.some((value) => value === input);
}

function isSafeInteger(input: unknown): input is number {
  return typeof input === "number" && Number.isSafeInteger(input);
}

function normalizeZero(input: number): number {
  return input === 0 ? 0 : input;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return input !== null && typeof input === "object" && !Array.isArray(input);
}

function isObject(input: unknown): input is object {
  return input !== null && typeof input === "object";
}

function arenaIssue(
  tag: ArenaIssue["tag"],
  path: string,
  message: string,
): ArenaIssue {
  return freezeValue({ tag, path, message });
}

function arenaFailure(issues: readonly ArenaIssue[]): ArenaParseResult {
  // The caller of this helper supplies at least one issue by construction.
  return freezeValue({
    tag: "error",
    issues: issues as readonly [ArenaIssue, ...ArenaIssue[]],
  });
}

function arenaSuccess(arena: Arena): ArenaParseResult {
  return freezeValue({ tag: "ok", value: arena });
}

function makeArenaHandle(): Arena {
  // Brands are erased at runtime; WeakMap membership is the authenticity
  // proof for this opaque handle and no caller data is stored on the handle.
  return Object.freeze({}) as Arena;
}

function makePreviewHandle(): StepPreview {
  // Brands are erased at runtime; previewDataByHandle rejects forged objects.
  return Object.freeze({}) as StepPreview;
}

function arenaDataOf(arena: Arena): ArenaData {
  const data = arenaDataByHandle.get(arena);
  if (data === undefined) {
    throw new Error("Arena handle was not created by parseArena.");
  }
  return data;
}

function stateDataOf(state: SpatialState): StateData {
  const data = stateDataByHandle.get(state);
  if (data === undefined) {
    throw new Error("Spatial state handle was not created by createState.");
  }
  return data;
}

function makeStateFingerprint(
  arenaFingerprint: ArenaFingerprint,
  revision: number,
  placements: ReadonlyMap<TokenId, CellCoordinate>,
): StateFingerprint {
  const canonicalPlacements = Array.from(placements.entries())
    .sort(([first], [second]) => compareStringsByCodeUnit(first, second))
    .map(([token, coordinate]) => ({
      token,
      x: coordinate.x,
      y: coordinate.y,
    }));
  const digest = makeFingerprint({
    schema: "tactical-space/state/1",
    arenaFingerprint,
    revision,
    placements: canonicalPlacements,
  });
  // The canonical state projection is constructed immediately above; the
  // brand distinguishes this digest from the arena digest at the API type.
  return digest as StateFingerprint;
}

function makeArenaFingerprint(value: unknown): ArenaFingerprint {
  const digest = makeFingerprint(value);
  // The canonical arena projection is the only caller of this helper; the
  // brand distinguishes its digest from a state fingerprint at the API type.
  return digest as ArenaFingerprint;
}

function makeFingerprint(value: unknown): string {
  const canonical = JSON.stringify(value);
  if (canonical === undefined) {
    throw new Error(
      "Canonical tactical-space projection was not serializable.",
    );
  }
  return `sha256:${sha256Hex(canonical)}`;
}

function sha256Hex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const bitLength = bytes.length * 8;
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;
  const words = new Uint32Array(64);
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(offset + index * 4);
    }
    for (let index = 16; index < 64; index += 1) {
      const valueA = words[index - 15];
      const valueB = words[index - 2];
      const sigma0 =
        rotateRight(valueA, 7) ^ rotateRight(valueA, 18) ^ (valueA >>> 3);
      const sigma1 =
        rotateRight(valueB, 17) ^ rotateRight(valueB, 19) ^ (valueB >>> 10);
      words[index] =
        (words[index - 16] + sigma0 + words[index - 7] + sigma1) >>> 0;
    }
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;
    for (let index = 0; index < 64; index += 1) {
      const sigma1 =
        rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choose = (e & f) ^ (~e & g);
      const temporary1 =
        (h + sigma1 + choose + SHA256_CONSTANTS[index] + words[index]) >>> 0;
      const sigma0 =
        rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temporary2 = (sigma0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temporary1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporary1 + temporary2) >>> 0;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((value) => value.toString(16).padStart(8, "0"))
    .join("");
}

const SHA256_CONSTANTS = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
] as const;

function rotateRight(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

function freezeValue<Value extends object>(value: Value): Readonly<Value> {
  deepFreeze(value);
  return value;
}

function deepFreeze(value: object): void {
  const visited = new Set<object>();
  const visit = (current: object): void => {
    if (visited.has(current)) {
      return;
    }
    visited.add(current);
    for (const key of Reflect.ownKeys(current)) {
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      if (descriptor !== undefined && "value" in descriptor) {
        const child = descriptor.value;
        if (child !== null && typeof child === "object") {
          visit(child);
        }
      }
    }
    Object.freeze(current);
  };
  visit(value);
}

function success<Value>(value: Value): Result<Value, never> {
  return freezeValue({ tag: "ok", value });
}

function failure<Error>(error: Error): Result<never, Error> {
  return freezeValue({ tag: "error", error });
}
