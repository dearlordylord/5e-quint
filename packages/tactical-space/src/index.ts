/**
 * A public, single-level five-foot tactical-space kernel.
 *
 * The module intentionally contains no D&D runtime, adjudicator, networking,
 * or content imports.  Its only policy is quantized square-cell geometry;
 * callers own movement costs and battle legality.
 */

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

const DIRECTIONS = Object.freeze([
  "same-horizontal-position",
  "north",
  "north-east",
  "east",
  "south-east",
  "south",
  "south-west",
  "west",
  "north-west",
] as const) satisfies ReadonlyArray<string>;
export type Direction = (typeof DIRECTIONS)[number];

const PREVIEW_RELATION_PHASES = ["before", "after"] as const;
export type PreviewRelationPhase = (typeof PREVIEW_RELATION_PHASES)[number];

const PREVIEW_RELATION_POLICIES = {
  before: { movePreview: false },
  after: { movePreview: true },
} as const satisfies Record<
  PreviewRelationPhase,
  Readonly<{ readonly movePreview: boolean }>
>;

export type GeometricSight = "clear" | "blocked";

declare const tokenIdBrand: unique symbol;
declare const coordinateBrand: unique symbol;
declare const distanceFeetBrand: unique symbol;
declare const opaqueWeightBrand: unique symbol;
declare const spatialRevisionBrand: unique symbol;
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
export type DistanceFeet = number & { readonly [distanceFeetBrand]: true };
export type CellStepFeet = 5 & DistanceFeet;
export type OpaqueWeight = number & { readonly [opaqueWeightBrand]: true };
export type SpatialRevision = number & {
  readonly [spatialRevisionBrand]: true;
};
export type ArenaFingerprint = string & {
  readonly [arenaFingerprintBrand]: true;
};
export type StateFingerprint = string & {
  readonly [fingerprintBrand]: true;
};

function makeCellStepFeet(): CellStepFeet {
  const value = 5 as const;
  // The literal value proves the fixed five-foot step; this cast only adds the
  // compile-time domain brand to that already-checked literal.
  return value as CellStepFeet;
}

export const CELL_SIZE_FEET = makeCellStepFeet();

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
export type StepPreview = Readonly<{
  readonly [previewBrand]: true;
  readonly stateFingerprint: StateFingerprint;
  readonly revision: SpatialRevision;
  readonly mover: TokenId;
  readonly step: RouteStep;
}>;

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
  readonly cellSizeFeet: CellStepFeet;
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
  readonly revision: SpatialRevision;
  readonly fingerprint: StateFingerprint;
  readonly placements: readonly TokenPlacement[];
}>;

export type SpatialRelation = Readonly<{
  readonly source: TokenId;
  readonly target: TokenId;
  readonly direction: Direction;
  readonly distanceFeet: DistanceFeet;
  readonly sight: GeometricSight;
  readonly cover: CoverDegree;
}>;

export type ProspectiveStep = Readonly<{
  readonly from: CellCoordinate;
  readonly to: CellCoordinate;
  readonly distanceFeet: CellStepFeet;
  readonly terrain: TerrainKind;
  readonly occupants: readonly TokenId[];
}>;

export type StepEvaluation =
  | Readonly<{ readonly tag: "passable"; readonly weight: number }>
  | Readonly<{ readonly tag: "impassable" }>;

export type StepEvaluator = (step: ProspectiveStep) => StepEvaluation;

export type RouteStep = ProspectiveStep &
  Readonly<{
    readonly weight: OpaqueWeight;
  }>;

export type RoutePlan = Readonly<{
  readonly plannedAtStateFingerprint: StateFingerprint;
  readonly plannedAtRevision: SpatialRevision;
  readonly mover: TokenId;
  readonly origin: CellCoordinate;
  readonly destination: CellCoordinate;
  readonly steps: readonly RouteStep[];
  readonly distanceFeet: DistanceFeet;
  readonly weight: OpaqueWeight;
}>;

export type Result<Value, Error> =
  | Readonly<{ readonly tag: "ok"; readonly value: Value }>
  | Readonly<{ readonly tag: "error"; readonly error: Error }>;

type NonEmptyReadonlyArray<Value> = readonly [Value, ...Value[]];

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
    | "invalid-cover"
    | "arena-span-too-large";
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

export type RevisionLimitError = Readonly<{
  readonly tag: "revision-limit";
  readonly message: string;
}>;

export type PlaceTokenError =
  | CoordinateError
  | MissingCellError
  | DuplicateTokenError
  | RevisionLimitError;
export type RemoveTokenError = UnknownTokenError | RevisionLimitError;
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
  | RevisionLimitError
  | StalePreviewError;

export type StalePreviewCause =
  | Readonly<{
      readonly tag: "state-changed";
    }>
  | Readonly<{
      readonly tag: "mover-missing";
      readonly mover: TokenId;
    }>
  | Readonly<{
      readonly tag: "mover-origin-changed";
      readonly mover: TokenId;
      readonly expected: CellCoordinate;
      readonly actual: CellCoordinate;
    }>;

export type StalePreviewError = Readonly<{
  readonly tag: "stale-preview";
  readonly cause: StalePreviewCause;
  readonly expectedFingerprint: StateFingerprint;
  readonly actualFingerprint: StateFingerprint;
  readonly expectedRevision: SpatialRevision;
  readonly actualRevision: SpatialRevision;
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
  readonly revision: SpatialRevision;
  readonly fingerprint: StateFingerprint;
  readonly placements: ReadonlyMap<TokenId, CellCoordinate>;
}>;

type PreviewData = Readonly<{
  readonly arena: Arena;
  readonly state: SpatialState;
}>;

type PreviewProjection = Readonly<{
  readonly stateFingerprint: StateFingerprint;
  readonly revision: SpatialRevision;
  readonly mover: TokenId;
  readonly step: RouteStep;
}>;

type CanonicalCoordinate = Readonly<{
  readonly x: number;
  readonly y: number;
}>;

type CanonicalArenaCell = Readonly<{
  readonly coordinate: CanonicalCoordinate;
  readonly terrain: TerrainKind;
}>;

type CanonicalArenaBoundary = Readonly<{
  readonly between: readonly [CanonicalCoordinate, CanonicalCoordinate];
  readonly traversal: BoundaryOpenness;
  readonly sight: BoundaryOpenness;
  readonly cover: CoverDegree;
}>;

type CanonicalArenaProjection = Readonly<{
  readonly schema: "tactical-space/1";
  readonly cellSizeFeet: CellStepFeet;
  readonly cells: readonly CanonicalArenaCell[];
  readonly boundaries: readonly CanonicalArenaBoundary[];
}>;

type CanonicalPlacement = Readonly<{
  readonly token: TokenId;
  readonly x: number;
  readonly y: number;
}>;

type CanonicalStateProjection = Readonly<{
  readonly schema: "tactical-space/state/1";
  readonly arenaFingerprint: ArenaFingerprint;
  readonly revision: SpatialRevision;
  readonly placements: readonly CanonicalPlacement[];
}>;

const MAX_EXACT_DISTANCE_FEET = BigInt(Number.MAX_SAFE_INTEGER);
const MAX_AUTHORED_CELL_SPAN = MAX_EXACT_DISTANCE_FEET / BigInt(CELL_SIZE_FEET);

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
      const canonicalBetween: readonly [CellCoordinate, CellCoordinate] = [
        canonicalFirst,
        canonicalSecond,
      ];
      const boundary = freezeValue({
        between: canonicalBetween,
        traversal,
        sight,
        cover,
      });
      boundaries.push(boundary);
      boundaryByKey.set(key, boundary);
    });
  }

  const spanIssue = authoredArenaSpanIssue(cells);
  if (spanIssue !== undefined) {
    issues.push(spanIssue);
  }

  const nonEmptyIssues = asNonEmpty(issues);
  if (nonEmptyIssues !== undefined) {
    return arenaFailure(nonEmptyIssues);
  }

  cells.sort(compareCells);
  boundaries.sort(compareBoundaries);
  const snapshotWithoutFingerprint: Omit<ArenaSnapshot, "fingerprint"> = {
    cellSizeFeet: CELL_SIZE_FEET,
    cells,
    boundaries,
  };
  const fingerprint = makeArenaFingerprint(
    canonicalArenaProjection(snapshotWithoutFingerprint),
  );
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
  return makeState(arena, initialRevision(), placements);
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
  const revision = nextRevision(stateData.revision);
  return typeof revision === "number"
    ? success(makeState(stateData.arena, revision, placements))
    : failure(revision);
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
  const revision = nextRevision(stateData.revision);
  return typeof revision === "number"
    ? success(makeState(stateData.arena, revision, placements))
    : failure(revision);
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
      makeRoutePlan(
        stateData,
        mover,
        origin,
        destination,
        [],
        zeroDistanceFeet(),
        zeroOpaqueWeight(),
      ),
    );
  }

  type SearchNode = Readonly<{
    readonly coordinate: CellCoordinate;
    readonly steps: readonly RouteStep[];
    readonly weight: OpaqueWeight;
    readonly distanceFeet: DistanceFeet;
  }>;
  const initial: SearchNode = {
    coordinate: origin,
    steps: [],
    weight: zeroOpaqueWeight(),
    distanceFeet: zeroDistanceFeet(),
  };
  const queue: SearchNode[] = [initial];
  const bestByCell = new Map<string, SearchNode>([
    [coordinateKey(origin), initial],
  ]);

  while (queue.length > 0) {
    queue.sort(compareSearchNodes);
    const node = queue.shift() as SearchNode;
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
    for (const destinationCell of movementNeighbours(
      arenaData,
      node.coordinate,
    )) {
      const stepGeometry = makeProspectiveStep(
        stateData.placements,
        mover,
        node.coordinate,
        destinationCell,
      );
      const evaluation = evaluateProspectiveStep(evaluateStep, stepGeometry);
      if (evaluation.tag === "error") {
        return failure(evaluation.error);
      }
      if (evaluation.tag === "impassable") {
        continue;
      }
      const weight = addOpaqueWeights(node.weight, evaluation.step.weight);
      const distanceFeet = addDistanceFeet(
        node.distanceFeet,
        evaluation.step.distanceFeet,
      );
      if (weight === undefined || distanceFeet === undefined) {
        return failure({
          tag: "invalid-evaluator-output",
          message: "The evaluator route total must be finite and nonnegative.",
        });
      }
      const candidate: SearchNode = {
        coordinate: destinationCell.coordinate,
        steps: [...node.steps, evaluation.step],
        weight,
        distanceFeet,
      };
      const nextKey = coordinateKey(destinationCell.coordinate);
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
  const from = stateData.placements.get(mover);
  if (from === undefined) {
    return failure({ tag: "unknown-token", token: mover });
  }
  const destinationCell = arenaData.cells.get(coordinateKey(destination));
  if (destinationCell === undefined) {
    return failure({ tag: "missing-cell", coordinate: destination });
  }
  const destinationCoordinate = destinationCell.coordinate;
  const deltaX = Math.abs(destinationCoordinate.x - from.x);
  const deltaY = Math.abs(destinationCoordinate.y - from.y);
  if (deltaX > 1 || deltaY > 1 || (deltaX === 0 && deltaY === 0)) {
    return failure({ tag: "not-adjacent", from, to: destinationCoordinate });
  }
  if (
    isDiagonal(from, destinationCoordinate) &&
    !isDiagonalTraversalOpen(arenaData, from, destinationCoordinate)
  ) {
    return failure({
      tag: "blocked-diagonal",
      from,
      to: destinationCoordinate,
    });
  }
  if (
    !isDiagonal(from, destinationCoordinate) &&
    !boundaryTraversalOpen(arenaData, from, destinationCoordinate)
  ) {
    return failure({ tag: "blocked-step", from, to: destinationCoordinate });
  }
  if (typeof evaluateStep !== "function") {
    return failure({
      tag: "invalid-evaluator",
      message: "A route evaluator must be a function.",
    });
  }
  const geometry = makeProspectiveStep(
    stateData.placements,
    mover,
    from,
    destinationCell,
  );
  const evaluation = evaluateProspectiveStep(evaluateStep, geometry);
  if (evaluation.tag === "error") {
    return failure(evaluation.error);
  }
  if (evaluation.tag === "impassable") {
    return failure({ tag: "step-impassable" });
  }
  const step = evaluation.step;
  const handle = makePreviewHandle(
    {
      stateFingerprint: stateData.fingerprint,
      revision: stateData.revision,
      mover,
      step,
    },
    {
      arena: stateData.arena,
      state,
    },
  );
  return success(handle);
}

export function previewRelation(
  preview: StepPreview,
  counterpart: TokenId,
  phase: PreviewRelationPhase,
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
  if (PREVIEW_RELATION_POLICIES[phase].movePreview) {
    placements.set(preview.mover, preview.step.to);
  }
  return relationForPlacements(
    arenaDataOf(previewData.arena),
    placements,
    preview.mover,
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
  const actualOrigin = stateData.placements.get(preview.mover);
  const cause: StalePreviewCause =
    actualOrigin === undefined
      ? { tag: "mover-missing", mover: preview.mover }
      : !sameCoordinate(actualOrigin, preview.step.from)
        ? {
            tag: "mover-origin-changed",
            mover: preview.mover,
            expected: preview.step.from,
            actual: actualOrigin,
          }
        : { tag: "state-changed" };
  const moverConflicts =
    actualOrigin === undefined ||
    !sameCoordinate(actualOrigin, preview.step.from);
  if (stateData.fingerprint !== preview.stateFingerprint || moverConflicts) {
    return failure({
      tag: "stale-preview",
      cause,
      expectedFingerprint: preview.stateFingerprint,
      actualFingerprint: stateData.fingerprint,
      expectedRevision: preview.revision,
      actualRevision: stateData.revision,
    });
  }
  const placements = new Map(stateData.placements);
  placements.set(preview.mover, preview.step.to);
  const revision = nextRevision(stateData.revision);
  return typeof revision === "number"
    ? success(makeState(stateData.arena, revision, placements))
    : failure(revision);
}

function relationForPlacements(
  arenaData: ArenaData,
  placements: ReadonlyMap<TokenId, CellCoordinate>,
  source: TokenId,
  target: TokenId,
): Result<SpatialRelation, RelationError> {
  const sourceCoordinate = placements.get(source);
  if (sourceCoordinate === undefined) {
    return failure({ tag: "unknown-token", token: source });
  }
  const targetCoordinate = placements.get(target);
  if (targetCoordinate === undefined) {
    return failure({ tag: "unknown-token", token: target });
  }
  const deltaX = targetCoordinate.x - sourceCoordinate.x;
  const deltaY = targetCoordinate.y - sourceCoordinate.y;
  const ray = rayFacts(arenaData, sourceCoordinate, targetCoordinate);
  return success(
    freezeValue({
      source,
      target,
      direction: directionFor(deltaX, deltaY),
      distanceFeet: makeDistanceFeet(
        Math.max(Math.abs(deltaX), Math.abs(deltaY)),
      ),
      sight: ray.sightBlocked ? "blocked" : "clear",
      cover: ray.cover,
    }),
  );
}

function distanceFeetFromCellDistance(
  cellDistance: number,
): DistanceFeet | undefined {
  const value = cellDistance * Number(CELL_SIZE_FEET);
  if (!Number.isSafeInteger(value) || value < 0) {
    return undefined;
  }
  // The checks immediately above establish a finite, nonnegative safe integer;
  // this cast adds only the domain brand.
  return value as DistanceFeet;
}

function makeDistanceFeet(cellDistance: number): DistanceFeet {
  const distance = distanceFeetFromCellDistance(cellDistance);
  if (distance === undefined) {
    // Arena parsing bounds authored spans so every reachable relation has an
    // exact safe distance. This branch protects the internal invariant if a
    // future caller bypasses that aggregate.
    throw new Error("Tactical-space distance exceeded exact numeric capacity.");
  }
  return distance;
}

function zeroDistanceFeet(): DistanceFeet {
  return makeDistanceFeet(0);
}

function addDistanceFeet(
  first: DistanceFeet,
  second: DistanceFeet,
): DistanceFeet | undefined {
  const value = first + second;
  if (!Number.isSafeInteger(value) || value < 0) {
    return undefined;
  }
  // Both operands are branded safe distances and the checks above establish
  // that their sum remains in the same domain.
  return value as DistanceFeet;
}

function makeOpaqueWeight(raw: number): OpaqueWeight | undefined {
  if (!Number.isFinite(raw) || raw < 0) {
    return undefined;
  }
  // The runtime predicate immediately above establishes the opaque evaluator
  // fact; only its compile-time brand is added here.
  return raw as OpaqueWeight;
}

function zeroOpaqueWeight(): OpaqueWeight {
  return 0 as OpaqueWeight;
}

function addOpaqueWeights(
  first: OpaqueWeight,
  second: OpaqueWeight,
): OpaqueWeight | undefined {
  return makeOpaqueWeight(first + second);
}

function initialRevision(): SpatialRevision {
  return makeSpatialRevision(0);
}

function nextRevision(
  revision: SpatialRevision,
): SpatialRevision | RevisionLimitError {
  const candidate = revision + 1;
  if (!Number.isSafeInteger(candidate) || candidate < 0) {
    return {
      tag: "revision-limit",
      message:
        "The spatial revision cannot advance beyond exact numeric capacity.",
    };
  }
  // The checks immediately above establish a nonnegative safe integer; this
  // cast adds only the compile-time revision brand.
  return candidate as SpatialRevision;
}

function makeSpatialRevision(value: number): SpatialRevision {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("Spatial revision exceeded exact numeric capacity.");
  }
  // The check above establishes the post-construction revision invariant.
  return value as SpatialRevision;
}

function makeState(
  arena: Arena,
  revision: SpatialRevision,
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
  distanceFeet: DistanceFeet,
  weight: OpaqueWeight,
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
  placements: ReadonlyMap<TokenId, CellCoordinate>,
  mover: TokenId,
  from: CellCoordinate,
  destinationCell: ArenaCell,
): ProspectiveStep {
  const to = destinationCell.coordinate;
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

type EvaluatorCall =
  | Readonly<{ readonly tag: "returned"; readonly value: unknown }>
  | Readonly<{ readonly tag: "threw"; readonly message: string }>;

function invokeStepEvaluator(
  evaluateStep: StepEvaluator,
  step: ProspectiveStep,
): EvaluatorCall {
  try {
    return { tag: "returned", value: evaluateStep(step) };
  } catch (error) {
    return {
      tag: "threw",
      message: error instanceof Error ? error.message : "The evaluator threw.",
    };
  }
}

function evaluateProspectiveStep(
  evaluateStep: StepEvaluator,
  step: ProspectiveStep,
): EvaluationResult {
  const call = invokeStepEvaluator(evaluateStep, step);
  if (call.tag === "threw") {
    return {
      tag: "error",
      error: {
        tag: "evaluator-threw",
        message: call.message,
      },
    };
  }
  const raw = call.value;
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
  if (raw.tag !== "passable" || typeof raw.weight !== "number") {
    return {
      tag: "error",
      error: {
        tag: "invalid-evaluator-output",
        message: "A passable evaluator weight must be finite and nonnegative.",
      },
    };
  }
  const weight = makeOpaqueWeight(raw.weight);
  if (weight === undefined) {
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
    step: freezeValue({ ...step, weight }),
  };
}

function movementNeighbours(
  arena: ArenaData,
  from: CellCoordinate,
): readonly ArenaCell[] {
  const candidates: ArenaCell[] = [];
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
      const candidateCell = arena.cells.get(coordinateKey(candidate));
      if (
        candidateCell !== undefined &&
        isTraversalOpenForNeighbor(arena, from, candidateCell)
      ) {
        candidates.push(candidateCell);
      }
    }
  }
  return candidates.sort(compareCells);
}

function isTraversalOpenForNeighbor(
  arena: ArenaData,
  from: CellCoordinate,
  destinationCell: ArenaCell,
): boolean {
  const to = destinationCell.coordinate;
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
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
  const initialBoundaryFacts: RayFacts = {
    sightBlocked: false,
    cover: "none",
  };
  const boundaryFacts = Array.from(arena.boundaries.values())
    .filter((boundary) => rayTouchesBoundary(source, target, boundary.between))
    .reduce(
      (facts, boundary) => ({
        sightBlocked: facts.sightBlocked || boundary.sight === "blocked",
        cover: moreProtectiveCover(facts.cover, boundary.cover),
      }),
      initialBoundaryFacts,
    );
  const sightBlockedByMissingCell = boundaryFacts.sightBlocked
    ? false
    : rayCellsHaveMissing(arena, source, target);
  return {
    sightBlocked: sightBlockedByMissingCell || boundaryFacts.sightBlocked,
    cover: boundaryFacts.cover,
  };
}

function rayCellsHaveMissing(
  arena: ArenaData,
  source: CellCoordinate,
  target: CellCoordinate,
): boolean {
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
      if (!arena.cells.has(coordinateKey(next))) {
        return true;
      }
      current = next;
      nextX = (nextX as bigint) + 2n;
      continue;
    }
    if (yBeforeX) {
      const next = coordinateFromIntegers(current.x, current.y + stepY);
      if (!arena.cells.has(coordinateKey(next))) {
        return true;
      }
      current = next;
      nextY = (nextY as bigint) + 2n;
      continue;
    }

    // An exact corner traverses both possible cardinal transition orders.
    // All four touched cells must be authored for sight to continue.
    const sideX = coordinateFromIntegers(current.x + stepX, current.y);
    const sideY = coordinateFromIntegers(current.x, current.y + stepY);
    const diagonal = coordinateFromIntegers(
      current.x + stepX,
      current.y + stepY,
    );
    if (
      !arena.cells.has(coordinateKey(sideX)) ||
      !arena.cells.has(coordinateKey(sideY)) ||
      !arena.cells.has(coordinateKey(diagonal))
    ) {
      return true;
    }
    current = diagonal;
    nextX = (nextX as bigint) + 2n;
    nextY = (nextY as bigint) + 2n;
  }
  return false;
}

function rayTouchesBoundary(
  source: CellCoordinate,
  target: CellCoordinate,
  between: readonly [CellCoordinate, CellCoordinate],
): boolean {
  const [first, second] = between;
  const sourceX = BigInt(source.x) * 2n;
  const sourceY = BigInt(source.y) * 2n;
  const deltaX = (BigInt(target.x) - BigInt(source.x)) * 2n;
  const deltaY = (BigInt(target.y) - BigInt(source.y)) * 2n;
  if (first.y === second.y) {
    const boundaryX = BigInt(first.x) + BigInt(second.x);
    const minimumY = BigInt(first.y) * 2n - 1n;
    const maximumY = BigInt(first.y) * 2n + 1n;
    return rationalCoordinateInRange(
      boundaryX - sourceX,
      deltaX,
      sourceY,
      deltaY,
      minimumY,
      maximumY,
    );
  }
  const boundaryY = BigInt(first.y) + BigInt(second.y);
  const minimumX = BigInt(first.x) * 2n - 1n;
  const maximumX = BigInt(first.x) * 2n + 1n;
  return rationalCoordinateInRange(
    boundaryY - sourceY,
    deltaY,
    sourceX,
    deltaX,
    minimumX,
    maximumX,
  );
}

function rationalCoordinateInRange(
  numerator: bigint,
  denominator: bigint,
  start: bigint,
  delta: bigint,
  minimum: bigint,
  maximum: bigint,
): boolean {
  if (denominator === 0n) {
    return false;
  }
  const positiveNumerator = denominator < 0n ? -numerator : numerator;
  const positiveDenominator = denominator < 0n ? -denominator : denominator;
  if (positiveNumerator < 0n || positiveNumerator > positiveDenominator) {
    return false;
  }
  const coordinateNumerator =
    start * positiveDenominator + delta * positiveNumerator;
  return (
    coordinateNumerator >= minimum * positiveDenominator &&
    coordinateNumerator <= maximum * positiveDenominator
  );
}

function directionFor(deltaX: number, deltaY: number): Direction {
  const direction: Direction =
    deltaX === 0
      ? deltaY === 0
        ? "same-horizontal-position"
        : deltaY > 0
          ? "north"
          : "south"
      : deltaY === 0
        ? deltaX > 0
          ? "east"
          : "west"
        : deltaX > 0
          ? deltaY > 0
            ? "north-east"
            : "south-east"
          : deltaY > 0
            ? "north-west"
            : "south-west";
  return direction;
}

function compareSearchNodes(
  first: Readonly<{
    readonly steps: readonly RouteStep[];
    readonly weight: OpaqueWeight;
    readonly distanceFeet: DistanceFeet;
  }>,
  second: Readonly<{
    readonly steps: readonly RouteStep[];
    readonly weight: OpaqueWeight;
    readonly distanceFeet: DistanceFeet;
  }>,
): number {
  if (first.weight !== second.weight) {
    return first.weight - second.weight;
  }
  if (first.distanceFeet !== second.distanceFeet) {
    return first.distanceFeet - second.distanceFeet;
  }
  return compareStepSequences(first.steps, second.steps);
}

function compareStepSequences(
  first: readonly RouteStep[],
  second: readonly RouteStep[],
): number {
  const length = Math.min(first.length, second.length);
  let firstDifference = 0;
  for (let index = 0; index < length; index += 1) {
    const comparison = compareCoordinates(first[index].to, second[index].to);
    firstDifference ||= comparison;
  }
  return firstDifference || first.length - second.length;
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

const COVER_INFO = {
  none: { rank: 0, label: "no cover" },
  half: { rank: 1, label: "Half Cover" },
  "three-quarters": { rank: 2, label: "Three-Quarters Cover" },
  total: { rank: 3, label: "Total Cover" },
} as const satisfies Record<
  CoverDegree,
  Readonly<{ readonly rank: number; readonly label: string }>
>;

function moreProtectiveCover(
  first: CoverDegree,
  second: CoverDegree,
): CoverDegree {
  return COVER_INFO[first].rank >= COVER_INFO[second].rank ? first : second;
}

function coverLabel(cover: CoverDegree): string {
  return COVER_INFO[cover].label;
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

function authoredArenaSpanIssue(
  cells: readonly ArenaCell[],
): ArenaIssue | undefined {
  const first = cells[0];
  if (first === undefined) {
    return undefined;
  }
  const bounds = cells.slice(1).reduce(
    (current, cell) => ({
      minX: Math.min(current.minX, cell.coordinate.x),
      maxX: Math.max(current.maxX, cell.coordinate.x),
      minY: Math.min(current.minY, cell.coordinate.y),
      maxY: Math.max(current.maxY, cell.coordinate.y),
    }),
    {
      minX: first.coordinate.x,
      maxX: first.coordinate.x,
      minY: first.coordinate.y,
      maxY: first.coordinate.y,
    },
  );
  const xSpan = BigInt(bounds.maxX) - BigInt(bounds.minX);
  const ySpan = BigInt(bounds.maxY) - BigInt(bounds.minY);
  if (
    xSpan * BigInt(CELL_SIZE_FEET) <= MAX_EXACT_DISTANCE_FEET &&
    ySpan * BigInt(CELL_SIZE_FEET) <= MAX_EXACT_DISTANCE_FEET
  ) {
    return undefined;
  }
  return arenaIssue(
    "arena-span-too-large",
    "cells",
    `Authored cell span must be at most ${MAX_AUTHORED_CELL_SPAN.toString()} cells per axis so distances remain exact safe integers.`,
  );
}

function arenaIssue(
  tag: ArenaIssue["tag"],
  path: string,
  message: string,
): ArenaIssue {
  return freezeValue({ tag, path, message });
}

function asNonEmpty(
  issues: readonly ArenaIssue[],
): NonEmptyReadonlyArray<ArenaIssue> | undefined {
  const first = issues[0];
  return first === undefined ? undefined : [first, ...issues.slice(1)];
}

function arenaFailure(
  issues: NonEmptyReadonlyArray<ArenaIssue>,
): ArenaParseResult {
  return freezeValue({
    tag: "error",
    issues,
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

function makePreviewHandle(
  projection: PreviewProjection,
  data: PreviewData,
): StepPreview {
  // The public projection is deeply frozen for inspection, while WeakMap
  // membership remains the unforgeable commit authority.
  const handle = freezeValue({ ...projection }) as StepPreview;
  previewDataByHandle.set(handle, freezeValue(data));
  return handle;
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
  revision: SpatialRevision,
  placements: ReadonlyMap<TokenId, CellCoordinate>,
): StateFingerprint {
  const canonicalPlacements = Array.from(placements.entries())
    .sort(([first], [second]) => compareStringsByCodeUnit(first, second))
    .map(
      ([token, coordinate]): CanonicalPlacement => ({
        token,
        x: coordinate.x,
        y: coordinate.y,
      }),
    );
  const projection: CanonicalStateProjection = {
    schema: "tactical-space/state/1",
    arenaFingerprint,
    revision,
    placements: canonicalPlacements,
  };
  const digest = fingerprintCanonicalJson(canonicalJson(projection));
  // The canonical state projection is constructed immediately above; the
  // brand distinguishes this digest from the arena digest at the API type.
  return digest as StateFingerprint;
}

function canonicalArenaProjection(
  snapshot: Omit<ArenaSnapshot, "fingerprint">,
): CanonicalArenaProjection {
  return {
    schema: "tactical-space/1",
    cellSizeFeet: snapshot.cellSizeFeet,
    cells: snapshot.cells.map(
      (cell): CanonicalArenaCell => ({
        coordinate: {
          x: cell.coordinate.x,
          y: cell.coordinate.y,
        },
        terrain: cell.terrain,
      }),
    ),
    boundaries: snapshot.boundaries.map((boundary): CanonicalArenaBoundary => {
      const between: readonly [CanonicalCoordinate, CanonicalCoordinate] = [
        {
          x: boundary.between[0].x,
          y: boundary.between[0].y,
        },
        {
          x: boundary.between[1].x,
          y: boundary.between[1].y,
        },
      ];
      return {
        between,
        traversal: boundary.traversal,
        sight: boundary.sight,
        cover: boundary.cover,
      };
    }),
  };
}

function makeArenaFingerprint(
  projection: CanonicalArenaProjection,
): ArenaFingerprint {
  const digest = fingerprintCanonicalJson(canonicalJson(projection));
  // The canonical arena projection is the only caller of this helper; the
  // brand distinguishes its digest from a state fingerprint at the API type.
  return digest as ArenaFingerprint;
}

type CanonicalProjection = CanonicalArenaProjection | CanonicalStateProjection;

function canonicalJson(projection: CanonicalProjection): string {
  const canonical = JSON.stringify(projection);
  if (canonical === undefined) {
    throw new Error(
      "A proven tactical-space canonical projection was not serializable.",
    );
  }
  return canonical;
}

function fingerprintCanonicalJson(canonical: string): string {
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
