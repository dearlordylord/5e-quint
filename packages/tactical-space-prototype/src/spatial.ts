const arenaBrand: unique symbol = Symbol("TacticalArena");
const stateBrand: unique symbol = Symbol("TacticalSpace");
const routeBrand: unique symbol = Symbol("SpatialRoute");

export type CellFeet = number & { readonly __cellFeet: unique symbol };
export type BoundaryId = string & { readonly __boundaryId: unique symbol };
export type AnchorId = string & { readonly __anchorId: unique symbol };

export const DOOR_STATES = ["open", "closed"] as const;
export type DoorState = (typeof DOOR_STATES)[number];

export const COVER_VALUES = [
  "none",
  "half",
  "three-quarters",
  "total",
] as const;
export type Cover = (typeof COVER_VALUES)[number];

export const TERRAIN_KINDS = ["ordinary", "difficult"] as const;
export type TerrainKind = (typeof TERRAIN_KINDS)[number];

export type CellCoordinate = Readonly<{
  readonly x: number;
  readonly y: number;
  readonly level: number;
}>;

export type Footprint = Readonly<{
  readonly widthCells: number;
  readonly heightCells: number;
}>;

export type CellDefinition = Readonly<{
  readonly coordinate: CellCoordinate;
  readonly terrain: TerrainKind;
}>;

export type StaticBoundaryDefinition = Readonly<{
  readonly tag: "static";
  readonly between: readonly [CellCoordinate, CellCoordinate];
  readonly traversal: "open" | "blocked";
  readonly sight: "open" | "blocked";
  readonly coverFromFirst: Cover;
  readonly coverFromSecond: Cover;
}>;

export type DoorBoundaryDefinition = Readonly<{
  readonly tag: "door";
  readonly id: BoundaryId;
  readonly between: readonly [CellCoordinate, CellCoordinate];
  readonly initialState: DoorState;
}>;

export type BoundaryDefinition =
  | StaticBoundaryDefinition
  | DoorBoundaryDefinition;

export type VerticalLinkDefinition = Readonly<{
  readonly from: CellCoordinate;
  readonly to: CellCoordinate;
  readonly distanceFeet: CellFeet;
}>;

export type AnchorDefinition = Readonly<{
  readonly id: AnchorId;
  readonly label: string;
  readonly cells: readonly [CellCoordinate, ...CellCoordinate[]];
}>;

/**
 * This prototype implements exactly one explicit policy profile. Supporting a
 * second profile means adding a new parsed arena variant, not interpreting
 * optional flags throughout the query code.
 */
export type SquareArenaDefinition = Readonly<{
  readonly topology: Readonly<{
    readonly tag: "square";
    readonly neighborhood: "eight";
    readonly quantumFeet: CellFeet;
  }>;
  readonly policies: Readonly<{
    readonly quantizedDistance: "chebyshev";
    readonly diagonalTraversal: "require-both-cardinals-open";
    readonly lineOfSight: "strict-center-ray";
    readonly cornerSight: "blocked-if-either-cardinal-blocks";
    readonly interLevelSight: "blocked";
  }>;
  readonly cells: readonly CellDefinition[];
  readonly boundaries: readonly BoundaryDefinition[];
  readonly verticalLinks: readonly VerticalLinkDefinition[];
  readonly anchors: readonly AnchorDefinition[];
}>;

export type TacticalArena = Readonly<{ readonly [arenaBrand]: true }>;
export type TacticalSpace<TokenId> = Readonly<{
  readonly [stateBrand]: (token: TokenId) => TokenId;
}>;

export type SpatialIssue = Readonly<{ readonly message: string }>;
export type SpatialResult<Value> =
  | Readonly<{ readonly tag: "ok"; readonly value: Value }>
  | Readonly<{ readonly tag: "error"; readonly issue: SpatialIssue }>;

export type TokenPlacement<TokenId> = Readonly<{
  readonly token: TokenId;
  readonly origin: CellCoordinate;
  readonly footprint: Footprint;
}>;

export type ArenaSnapshot = Readonly<{
  readonly topology: SquareArenaDefinition["topology"];
  readonly policies: SquareArenaDefinition["policies"];
  readonly cells: readonly CellDefinition[];
  readonly boundaries: readonly BoundaryDefinition[];
  readonly verticalLinks: readonly VerticalLinkDefinition[];
  readonly anchors: readonly AnchorDefinition[];
}>;

export type SpatialSnapshot<TokenId> = Readonly<{
  readonly revision: number;
  readonly doors: readonly Readonly<{
    readonly id: BoundaryId;
    readonly state: DoorState;
  }>[];
  readonly placements: readonly TokenPlacement<TokenId>[];
}>;

export type RouteStep = Readonly<{
  readonly from: CellCoordinate;
  readonly to: CellCoordinate;
  readonly distanceFeet: CellFeet;
  readonly enteredCells: readonly Readonly<{
    readonly coordinate: CellCoordinate;
    readonly terrain: TerrainKind;
  }>[];
  readonly transition:
    | Readonly<{ readonly tag: "horizontal" }>
    | Readonly<{ readonly tag: "vertical-link" }>;
}>;

export type StepEvaluation =
  | Readonly<{ readonly tag: "passable"; readonly weight: number }>
  | Readonly<{ readonly tag: "blocked" }>;

/** Must be pure and deterministic for stable search and replay. */
export type TraversalEvaluator = (step: RouteStep) => StepEvaluation;

export type RouteRequest<TokenId> = Readonly<{
  readonly token: TokenId;
  readonly destination: CellCoordinate;
  readonly evaluateStep: TraversalEvaluator;
}>;

export type SpatialRoute<TokenId> = Readonly<{
  readonly [routeBrand]: TacticalArena;
  readonly spatialRevision: number;
  readonly token: TokenId;
  readonly origin: CellCoordinate;
  readonly destination: CellCoordinate;
  readonly steps: readonly RouteStep[];
  readonly distanceFeet: CellFeet;
  readonly weight: number;
}>;

export type SpatialRelation<
  TokenId,
  Visibility extends "clear" | "blocked" = "clear" | "blocked",
> = Readonly<{
  readonly from: TokenId;
  readonly target: TokenId;
  readonly frame: Readonly<{
    readonly kind: "arena";
    readonly northAxis: "+y";
    readonly cellFeet: CellFeet;
  }>;
  readonly deltaCells: readonly [number, number, number];
  readonly arenaDirection: Readonly<{
    readonly octant:
      | "same"
      | "north"
      | "north-east"
      | "east"
      | "south-east"
      | "south"
      | "south-west"
      | "west"
      | "north-west";
    readonly bearingDegrees: number | null;
  }>;
  readonly range: Readonly<{
    readonly quantizedDistanceFeet: CellFeet;
    readonly centerHorizontalFeet: number;
    readonly levelSeparationFeet: number;
    readonly routeLengthFeet: CellFeet | null;
  }>;
  readonly visibility: Visibility;
  readonly cover: Cover;
  readonly anchor: Readonly<{
    readonly id: AnchorId;
    readonly label: string;
  }> | null;
}>;

export type SpatialObservation<TokenId> = Readonly<{
  readonly revision: number;
  readonly viewer: TokenPlacement<TokenId>;
  readonly entities: readonly SpatialRelation<TokenId, "clear">[];
}>;

type StoredCell = Readonly<{
  readonly coordinate: CellCoordinate;
  readonly terrain: TerrainKind;
}>;

type StoredBoundary = Readonly<{
  readonly definition: BoundaryDefinition;
}>;

type StoredVerticalLink = Readonly<{
  readonly fromKey: string;
  readonly toKey: string;
  readonly distanceFeet: CellFeet;
}>;

type StoredAnchor = Readonly<{
  readonly id: AnchorId;
  readonly label: string;
}>;

type ArenaData = Readonly<{
  readonly definition: SquareArenaDefinition;
  readonly cells: ReadonlyMap<string, StoredCell>;
  readonly boundaries: ReadonlyMap<string, StoredBoundary>;
  readonly doors: ReadonlyMap<BoundaryId, DoorBoundaryDefinition>;
  readonly verticalLinks: ReadonlyMap<string, readonly StoredVerticalLink[]>;
  readonly anchorsByCell: ReadonlyMap<string, StoredAnchor>;
}>;

type SpaceData<TokenId> = Readonly<{
  readonly arena: TacticalArena;
  readonly revision: number;
  readonly doors: ReadonlyMap<BoundaryId, DoorState>;
  readonly placements: ReadonlyMap<TokenId, TokenPlacement<TokenId>>;
}>;

type BoundaryFacts = Readonly<{
  readonly traversal: "open" | "blocked";
  readonly sight: "open" | "blocked";
  readonly cover: Cover;
}>;

type PathResult = Readonly<{
  readonly weight: number;
  readonly distanceFeet: CellFeet;
  readonly steps: readonly RouteStep[];
}>;

type WeightedEdge = Readonly<{
  readonly key: string;
  readonly weight: number;
  readonly step: RouteStep;
}>;

const arenaData = new WeakMap<TacticalArena, ArenaData>();
const spaceData = new WeakMap<object, SpaceData<unknown>>();

export function parseCellFeet(value: number): SpatialResult<CellFeet> {
  if (!Number.isInteger(value) || value < 0) {
    return error("Feet must be a non-negative integer.");
  }
  // CellFeet is erased at runtime; this parser establishes its integer invariant.
  return ok(value as CellFeet);
}

export function parseBoundaryId(value: string): SpatialResult<BoundaryId> {
  if (value.trim() === "") return error("Boundary id must not be empty.");
  // BoundaryId is erased at runtime; this parser establishes its non-empty invariant.
  return ok(value as BoundaryId);
}

export function parseAnchorId(value: string): SpatialResult<AnchorId> {
  if (value.trim() === "") return error("Anchor id must not be empty.");
  // AnchorId is erased at runtime; this parser establishes its non-empty invariant.
  return ok(value as AnchorId);
}

export function cell(x: number, y: number, level = 0): CellCoordinate {
  return Object.freeze({ x, y, level });
}

export function footprint(widthCells: number, heightCells: number): Footprint {
  return Object.freeze({ widthCells, heightCells });
}

export function createArena(
  definition: SquareArenaDefinition,
): SpatialResult<TacticalArena> {
  if (!isPositiveInteger(definition.topology.quantumFeet)) {
    return error("Arena quantumFeet must be a positive integer.");
  }

  const cells = new Map<string, StoredCell>();
  for (const candidate of definition.cells) {
    if (!isCoordinate(candidate.coordinate)) {
      return error("Every cell coordinate must contain integers.");
    }
    if (!TERRAIN_KINDS.some((terrain) => terrain === candidate.terrain)) {
      return error(
        `Cell ${cellKey(candidate.coordinate)} has unknown terrain ${String(candidate.terrain)}.`,
      );
    }
    const key = cellKey(candidate.coordinate);
    if (cells.has(key)) return error(`Duplicate cell: ${key}`);
    cells.set(
      key,
      Object.freeze({
        coordinate: freezeCell(candidate.coordinate),
        terrain: candidate.terrain,
      }),
    );
  }
  if (cells.size === 0) return error("Arena must contain at least one cell.");

  const boundaries = new Map<string, StoredBoundary>();
  const doors = new Map<BoundaryId, DoorBoundaryDefinition>();
  for (const candidate of definition.boundaries) {
    const [first, second] = candidate.between;
    const firstKey = cellKey(first);
    const secondKey = cellKey(second);
    if (!cells.has(firstKey) || !cells.has(secondKey)) {
      return error(
        `Boundary ${firstKey} / ${secondKey} references a missing cell.`,
      );
    }
    if (!areOrthogonalNeighbours(first, second)) {
      return error(
        `Boundary ${firstKey} / ${secondKey} must join orthogonal cells on one level.`,
      );
    }
    const key = pairKey(firstKey, secondKey);
    if (boundaries.has(key)) return error(`Duplicate boundary: ${key}`);
    const frozenDefinition = freezeBoundary(candidate);
    boundaries.set(key, Object.freeze({ definition: frozenDefinition }));
    if (frozenDefinition.tag === "door") {
      if (doors.has(frozenDefinition.id)) {
        return error(`Duplicate door id: ${frozenDefinition.id}`);
      }
      doors.set(frozenDefinition.id, frozenDefinition);
    }
  }

  const verticalLinks = new Map<string, StoredVerticalLink[]>();
  const verticalPairs = new Set<string>();
  for (const link of definition.verticalLinks) {
    const fromKey = cellKey(link.from);
    const toKey = cellKey(link.to);
    if (!cells.has(fromKey) || !cells.has(toKey)) {
      return error(
        `Vertical link ${fromKey} -> ${toKey} references a missing cell.`,
      );
    }
    if (fromKey === toKey || link.from.level === link.to.level) {
      return error(`Vertical link ${fromKey} -> ${toKey} must change level.`);
    }
    if (!isPositiveInteger(link.distanceFeet)) {
      return error(
        `Vertical link ${fromKey} -> ${toKey} has invalid distance.`,
      );
    }
    const directedKey = `${fromKey}->${toKey}`;
    if (verticalPairs.has(directedKey))
      return error(`Duplicate vertical link: ${directedKey}`);
    verticalPairs.add(directedKey);
    const outgoing = verticalLinks.get(fromKey) ?? [];
    outgoing.push(
      Object.freeze({ fromKey, toKey, distanceFeet: link.distanceFeet }),
    );
    verticalLinks.set(fromKey, outgoing);
  }

  const anchorsByCell = new Map<string, StoredAnchor>();
  const anchorIds = new Set<AnchorId>();
  for (const anchor of definition.anchors) {
    if (anchorIds.has(anchor.id))
      return error(`Duplicate anchor: ${anchor.id}`);
    if (anchor.label.trim() === "")
      return error(`Anchor ${anchor.id} needs a label.`);
    anchorIds.add(anchor.id);
    for (const coordinate of anchor.cells) {
      const key = cellKey(coordinate);
      if (!cells.has(key))
        return error(`Anchor ${anchor.id} references missing cell ${key}.`);
      if (anchorsByCell.has(key))
        return error(`Cell ${key} belongs to more than one anchor.`);
      anchorsByCell.set(
        key,
        Object.freeze({ id: anchor.id, label: anchor.label }),
      );
    }
  }

  const frozenDefinition = freezeArenaDefinition(definition);
  const arena: TacticalArena = Object.freeze({ [arenaBrand]: true });
  arenaData.set(
    arena,
    Object.freeze({
      definition: frozenDefinition,
      cells,
      boundaries,
      doors,
      verticalLinks: new Map(
        [...verticalLinks].map(([key, links]) => [
          key,
          Object.freeze([...links]),
        ]),
      ),
      anchorsByCell,
    }),
  );
  return ok(arena);
}

export function createSpace<TokenId>(
  arena: TacticalArena,
): TacticalSpace<TokenId> {
  const doors = new Map<BoundaryId, DoorState>();
  for (const door of requireArena(arena).doors.values())
    doors.set(door.id, door.initialState);
  return makeSpace(
    arena,
    0,
    doors,
    new Map<TokenId, TokenPlacement<TokenId>>(),
  );
}

export function arenaSnapshot(arena: TacticalArena): ArenaSnapshot {
  const definition = requireArena(arena).definition;
  return Object.freeze({
    topology: definition.topology,
    policies: definition.policies,
    cells: definition.cells,
    boundaries: definition.boundaries,
    verticalLinks: definition.verticalLinks,
    anchors: definition.anchors,
  });
}

export function snapshot<TokenId>(
  state: TacticalSpace<TokenId>,
): SpatialSnapshot<TokenId> {
  const data = requireSpace(state);
  return Object.freeze({
    revision: data.revision,
    doors: Object.freeze(
      [...data.doors]
        .sort(([first], [second]) => first.localeCompare(second))
        .map(([id, doorState]) => Object.freeze({ id, state: doorState })),
    ),
    placements: Object.freeze(
      [...data.placements.values()].sort((first, second) =>
        String(first.token).localeCompare(String(second.token)),
      ),
    ),
  });
}

export function placeToken<TokenId>(
  state: TacticalSpace<TokenId>,
  token: TokenId,
  origin: CellCoordinate,
  tokenFootprint: Footprint,
): SpatialResult<TacticalSpace<TokenId>> {
  const data = requireSpace(state);
  if (data.placements.has(token))
    return error(`Token ${String(token)} is already placed.`);
  const footprintIssue = validateFootprint(tokenFootprint);
  if (footprintIssue !== null) return error(footprintIssue);
  const occupancyIssue = placementIssue(
    data,
    origin,
    tokenFootprint,
    undefined,
  );
  if (occupancyIssue !== null) return error(occupancyIssue);
  const placements = new Map(data.placements);
  placements.set(
    token,
    freezePlacement({ token, origin, footprint: tokenFootprint }),
  );
  return ok(makeSpace(data.arena, data.revision + 1, data.doors, placements));
}

export function removeToken<TokenId>(
  state: TacticalSpace<TokenId>,
  token: TokenId,
): SpatialResult<TacticalSpace<TokenId>> {
  const data = requireSpace(state);
  if (!data.placements.has(token))
    return error(`Unknown token: ${String(token)}`);
  const placements = new Map(data.placements);
  placements.delete(token);
  return ok(makeSpace(data.arena, data.revision + 1, data.doors, placements));
}

export function setDoorState<TokenId>(
  state: TacticalSpace<TokenId>,
  id: BoundaryId,
  nextState: DoorState,
): SpatialResult<TacticalSpace<TokenId>> {
  const data = requireSpace(state);
  if (!requireArena(data.arena).doors.has(id))
    return error(`Unknown door: ${id}`);
  if (data.doors.get(id) === nextState) return ok(state);
  const doors = new Map(data.doors);
  doors.set(id, nextState);
  return ok(makeSpace(data.arena, data.revision + 1, doors, data.placements));
}

export function findRoute<TokenId>(
  state: TacticalSpace<TokenId>,
  request: RouteRequest<TokenId>,
): SpatialResult<SpatialRoute<TokenId>> {
  const data = requireSpace(state);
  const placement = data.placements.get(request.token);
  if (placement === undefined)
    return error(`Unknown token: ${String(request.token)}`);
  const searched = shortestPath(
    data,
    placement.origin,
    request.destination,
    placement.footprint,
    request.token,
    true,
    request.evaluateStep,
  );
  if (searched.tag === "error") return searched;
  if (searched.value === null)
    return error(`No traversable route to ${cellKey(request.destination)}.`);
  return ok(
    Object.freeze({
      spatialRevision: data.revision,
      [routeBrand]: data.arena,
      token: request.token,
      origin: placement.origin,
      destination: freezeCell(request.destination),
      steps: searched.value.steps,
      distanceFeet: searched.value.distanceFeet,
      weight: searched.value.weight,
    }),
  );
}

export function traverseRoute<TokenId>(
  state: TacticalSpace<TokenId>,
  route: SpatialRoute<TokenId>,
): SpatialResult<TacticalSpace<TokenId>> {
  const data = requireSpace(state);
  if (route[routeBrand] !== data.arena) {
    return error("Route belongs to a different arena.");
  }
  if (route.spatialRevision !== data.revision) {
    return error(
      `Route spatial revision ${route.spatialRevision} is stale; state revision is ${data.revision}.`,
    );
  }
  const placement = data.placements.get(route.token);
  if (placement === undefined)
    return error(`Unknown token: ${String(route.token)}`);
  if (!sameCell(placement.origin, route.origin)) {
    return error("Route origin does not match the token placement.");
  }

  let current = placement.origin;
  for (const suppliedStep of route.steps) {
    if (!sameCell(suppliedStep.from, current)) {
      return error(`Route is discontinuous at ${cellKey(current)}.`);
    }
    const edges = movementEdges(
      data,
      current,
      placement.footprint,
      route.token,
      true,
      distanceEvaluator,
    );
    if (edges.tag === "error") return edges;
    const matching = edges.value.find((edge) =>
      sameCell(edge.step.to, suppliedStep.to),
    );
    if (matching === undefined) {
      return error(
        `Route step ${cellKey(current)} -> ${cellKey(suppliedStep.to)} is no longer traversable.`,
      );
    }
    current = matching.step.to;
  }
  if (!sameCell(current, route.destination)) {
    return error("Route destination does not match its final step.");
  }
  if (sameCell(placement.origin, route.destination)) return ok(state);
  const placements = new Map(data.placements);
  placements.set(
    route.token,
    freezePlacement({ ...placement, origin: route.destination }),
  );
  return ok(makeSpace(data.arena, data.revision + 1, data.doors, placements));
}

export function relationBetween<TokenId>(
  state: TacticalSpace<TokenId>,
  observer: TokenId,
  target: TokenId,
): SpatialResult<SpatialRelation<TokenId>> {
  const data = requireSpace(state);
  const from = data.placements.get(observer);
  const to = data.placements.get(target);
  if (from === undefined) return error(`Unknown observer: ${String(observer)}`);
  if (to === undefined) return error(`Unknown target: ${String(target)}`);
  return ok(deriveRelation(data, from, to));
}

export function observeFrom<TokenId>(
  state: TacticalSpace<TokenId>,
  viewer: TokenId,
): SpatialResult<SpatialObservation<TokenId>> {
  const data = requireSpace(state);
  const viewerPlacement = data.placements.get(viewer);
  if (viewerPlacement === undefined)
    return error(`Unknown viewer: ${String(viewer)}`);
  return ok(
    Object.freeze({
      revision: data.revision,
      viewer: viewerPlacement,
      entities: Object.freeze(
        [...data.placements.values()]
          .filter((candidate) => candidate.token !== viewer)
          .map((candidate) => deriveRelation(data, viewerPlacement, candidate))
          .filter(isVisibleRelation)
          .sort((first, second) =>
            String(first.target).localeCompare(String(second.target)),
          ),
      ),
    }),
  );
}

function deriveRelation<TokenId>(
  data: SpaceData<TokenId>,
  from: TokenPlacement<TokenId>,
  target: TokenPlacement<TokenId>,
): SpatialRelation<TokenId> {
  const arena = requireArena(data.arena);
  const quantum = arena.definition.topology.quantumFeet;
  const fromCenter = footprintCenter(from);
  const targetCenter = footprintCenter(target);
  const deltaX = targetCenter.x - fromCenter.x;
  const deltaY = targetCenter.y - fromCenter.y;
  const deltaLevel = targetCenter.level - fromCenter.level;
  const lineFacts = bestLineFacts(data, from, target);
  const searched = shortestPath(
    data,
    from.origin,
    target.origin,
    from.footprint,
    from.token,
    false,
    distanceEvaluator,
  );
  if (searched.tag === "error") {
    throw new Error(
      `Internal invariant: distance evaluator failed: ${searched.issue.message}`,
    );
  }
  return Object.freeze({
    from: from.token,
    target: target.token,
    frame: Object.freeze({ kind: "arena", northAxis: "+y", cellFeet: quantum }),
    deltaCells: Object.freeze([deltaX, deltaY, deltaLevel] as const),
    arenaDirection: direction(deltaX, deltaY),
    range: Object.freeze({
      quantizedDistanceFeet: minimumQuantizedDistance(from, target, quantum),
      centerHorizontalFeet: round(Math.hypot(deltaX, deltaY) * quantum),
      levelSeparationFeet: Math.abs(deltaLevel) * quantum,
      routeLengthFeet: searched.value?.distanceFeet ?? null,
    }),
    visibility: lineFacts.visibility,
    cover: lineFacts.cover,
    anchor: arena.anchorsByCell.get(cellKey(target.origin)) ?? null,
  });
}

function bestLineFacts<TokenId>(
  data: SpaceData<TokenId>,
  from: TokenPlacement<TokenId>,
  target: TokenPlacement<TokenId>,
): Readonly<{
  readonly visibility: "clear" | "blocked";
  readonly cover: Cover;
}> {
  let bestCover: Cover | null = null;
  for (const fromCell of occupiedCells(from.origin, from.footprint)) {
    for (const targetCell of occupiedCells(target.origin, target.footprint)) {
      const facts = traceSight(data, fromCell, targetCell);
      if (facts.sight === "open")
        bestCover = lesserCover(bestCover, facts.cover);
    }
  }
  return bestCover === null
    ? Object.freeze({ visibility: "blocked", cover: "total" })
    : Object.freeze({ visibility: "clear", cover: bestCover });
}

function traceSight<TokenId>(
  data: SpaceData<TokenId>,
  from: CellCoordinate,
  target: CellCoordinate,
): BoundaryFacts {
  if (from.level !== target.level) {
    return Object.freeze({
      traversal: "blocked",
      sight: "blocked",
      cover: "total",
    });
  }
  let current = from;
  let cover: Cover = "none";
  const deltaX = target.x - from.x;
  const deltaY = target.y - from.y;
  const stepX = Math.sign(deltaX);
  const stepY = Math.sign(deltaY);
  const absoluteX = Math.abs(deltaX);
  const absoluteY = Math.abs(deltaY);
  let crossedX = 0;
  let crossedY = 0;

  while (!sameCell(current, target)) {
    const nextXTime =
      absoluteX === 0 ? Number.POSITIVE_INFINITY : (crossedX + 0.5) / absoluteX;
    const nextYTime =
      absoluteY === 0 ? Number.POSITIVE_INFINITY : (crossedY + 0.5) / absoluteY;
    if (Math.abs(nextXTime - nextYTime) < Number.EPSILON * 8) {
      const sideX = cell(current.x + stepX, current.y, current.level);
      const sideY = cell(current.x, current.y + stepY, current.level);
      const first = boundaryFacts(data, current, sideX);
      const second = boundaryFacts(data, current, sideY);
      cover = greaterCover(cover, greaterCover(first.cover, second.cover));
      if (first.sight === "blocked" || second.sight === "blocked") {
        return Object.freeze({
          traversal: "blocked",
          sight: "blocked",
          cover: "total",
        });
      }
      current = cell(current.x + stepX, current.y + stepY, current.level);
      crossedX += 1;
      crossedY += 1;
    } else if (nextXTime < nextYTime) {
      const next = cell(current.x + stepX, current.y, current.level);
      const facts = boundaryFacts(data, current, next);
      cover = greaterCover(cover, facts.cover);
      if (facts.sight === "blocked") return facts;
      current = next;
      crossedX += 1;
    } else {
      const next = cell(current.x, current.y + stepY, current.level);
      const facts = boundaryFacts(data, current, next);
      cover = greaterCover(cover, facts.cover);
      if (facts.sight === "blocked") return facts;
      current = next;
      crossedY += 1;
    }
  }
  return Object.freeze({ traversal: "open", sight: "open", cover });
}

function shortestPath<TokenId>(
  data: SpaceData<TokenId>,
  origin: CellCoordinate,
  destination: CellCoordinate,
  tokenFootprint: Footprint,
  movingToken: TokenId,
  considerOccupants: boolean,
  evaluateStep: TraversalEvaluator,
): SpatialResult<PathResult | null> {
  if (
    !footprintFitsArena(data.arena, destination, tokenFootprint) ||
    !footprintHasClearance(data, destination, tokenFootprint)
  )
    return ok(null);
  if (
    considerOccupants &&
    placementIssue(data, destination, tokenFootprint, movingToken) !== null
  )
    return ok(null);
  const originKey = cellKey(origin);
  const destinationKey = cellKey(destination);
  const frontier: Array<
    Readonly<{ readonly key: string; readonly weight: number }>
  > = [Object.freeze({ key: originKey, weight: 0 })];
  const weights = new Map<string, number>([[originKey, 0]]);
  const previous = new Map<
    string,
    Readonly<{ readonly key: string; readonly step: RouteStep }>
  >();

  while (frontier.length > 0) {
    frontier.sort(
      (first, second) =>
        first.weight - second.weight || first.key.localeCompare(second.key),
    );
    const current = frontier.shift();
    if (current === undefined) break;
    if (current.weight !== weights.get(current.key)) continue;
    if (current.key === destinationKey) {
      const steps = reconstructSteps(previous, destinationKey);
      return ok(
        Object.freeze({
          weight: current.weight,
          distanceFeet: computedFeet(
            steps.reduce((total, step) => total + step.distanceFeet, 0),
          ),
          steps,
        }),
      );
    }
    const currentCell = requireArena(data.arena).cells.get(
      current.key,
    )?.coordinate;
    if (currentCell === undefined) continue;
    const edges = movementEdges(
      data,
      currentCell,
      tokenFootprint,
      movingToken,
      considerOccupants,
      evaluateStep,
    );
    if (edges.tag === "error") return edges;
    for (const edge of edges.value) {
      const nextWeight = current.weight + edge.weight;
      const knownWeight = weights.get(edge.key);
      if (knownWeight === undefined || nextWeight < knownWeight) {
        weights.set(edge.key, nextWeight);
        previous.set(
          edge.key,
          Object.freeze({ key: current.key, step: edge.step }),
        );
        frontier.push(Object.freeze({ key: edge.key, weight: nextWeight }));
      }
    }
  }
  return ok(null);
}

function movementEdges<TokenId>(
  data: SpaceData<TokenId>,
  origin: CellCoordinate,
  tokenFootprint: Footprint,
  movingToken: TokenId,
  considerOccupants: boolean,
  evaluateStep: TraversalEvaluator,
): SpatialResult<readonly WeightedEdge[]> {
  const quantum = requireArena(data.arena).definition.topology.quantumFeet;
  const result: WeightedEdge[] = [];
  for (let deltaY = -1; deltaY <= 1; deltaY += 1) {
    for (let deltaX = -1; deltaX <= 1; deltaX += 1) {
      if (deltaX === 0 && deltaY === 0) continue;
      const destination = cell(
        origin.x + deltaX,
        origin.y + deltaY,
        origin.level,
      );
      if (
        canMoveFootprint(data, origin, destination, tokenFootprint) &&
        (!considerOccupants ||
          placementIssue(data, destination, tokenFootprint, movingToken) ===
            null)
      ) {
        const step = makeRouteStep(
          data.arena,
          origin,
          destination,
          tokenFootprint,
          quantum,
          "horizontal",
        );
        const evaluated = evaluateStep(step);
        if (evaluated.tag === "passable") {
          if (!isValidWeight(evaluated.weight)) {
            return error(
              `Traversal evaluator returned invalid weight ${evaluated.weight}.`,
            );
          }
          result.push(
            Object.freeze({
              key: cellKey(destination),
              weight: evaluated.weight,
              step,
            }),
          );
        }
      }
    }
  }
  for (const vertical of verticalMoves(data.arena, origin, tokenFootprint)) {
    const geometryFits =
      footprintFitsArena(data.arena, vertical.destination, tokenFootprint) &&
      footprintHasClearance(data, vertical.destination, tokenFootprint);
    const occupancyFits =
      !considerOccupants ||
      placementIssue(
        data,
        vertical.destination,
        tokenFootprint,
        movingToken,
      ) === null;
    if (geometryFits && occupancyFits) {
      const step = makeRouteStep(
        data.arena,
        origin,
        vertical.destination,
        tokenFootprint,
        vertical.distanceFeet,
        "vertical-link",
      );
      const evaluated = evaluateStep(step);
      if (evaluated.tag === "passable") {
        if (!isValidWeight(evaluated.weight)) {
          return error(
            `Traversal evaluator returned invalid weight ${evaluated.weight}.`,
          );
        }
        result.push(
          Object.freeze({
            key: cellKey(vertical.destination),
            weight: evaluated.weight,
            step,
          }),
        );
      }
    }
  }
  return ok(
    Object.freeze(
      result.sort((first, second) => first.key.localeCompare(second.key)),
    ),
  );
}

function canMoveFootprint<TokenId>(
  data: SpaceData<TokenId>,
  origin: CellCoordinate,
  destination: CellCoordinate,
  tokenFootprint: Footprint,
): boolean {
  if (
    !footprintFitsArena(data.arena, destination, tokenFootprint) ||
    !footprintHasClearance(data, destination, tokenFootprint)
  )
    return false;
  const deltaX = destination.x - origin.x;
  const deltaY = destination.y - origin.y;
  for (const occupied of occupiedCells(origin, tokenFootprint)) {
    const target = cell(
      occupied.x + deltaX,
      occupied.y + deltaY,
      occupied.level,
    );
    if (deltaX !== 0 && deltaY !== 0) {
      const sideX = cell(occupied.x + deltaX, occupied.y, occupied.level);
      const sideY = cell(occupied.x, occupied.y + deltaY, occupied.level);
      if (
        !isTraversalOpen(data, occupied, sideX) ||
        !isTraversalOpen(data, occupied, sideY) ||
        !isTraversalOpen(data, sideX, target) ||
        !isTraversalOpen(data, sideY, target)
      )
        return false;
    } else if (!isTraversalOpen(data, occupied, target)) return false;
  }
  return true;
}

function verticalMoves(
  arena: TacticalArena,
  origin: CellCoordinate,
  tokenFootprint: Footprint,
): readonly Readonly<{
  readonly destination: CellCoordinate;
  readonly distanceFeet: CellFeet;
}>[] {
  const data = requireArena(arena);
  const firstLinks = data.verticalLinks.get(cellKey(origin)) ?? [];
  const result: Array<
    Readonly<{
      readonly destination: CellCoordinate;
      readonly distanceFeet: CellFeet;
    }>
  > = [];
  for (const firstLink of firstLinks) {
    const firstTarget = data.cells.get(firstLink.toKey)?.coordinate;
    if (firstTarget === undefined) continue;
    const delta = {
      x: firstTarget.x - origin.x,
      y: firstTarget.y - origin.y,
      level: firstTarget.level - origin.level,
    };
    let maximumDistance = firstLink.distanceFeet;
    let complete = true;
    for (const occupied of occupiedCells(origin, tokenFootprint)) {
      const expected = cell(
        occupied.x + delta.x,
        occupied.y + delta.y,
        occupied.level + delta.level,
      );
      const matching = (data.verticalLinks.get(cellKey(occupied)) ?? []).find(
        (candidate) => candidate.toKey === cellKey(expected),
      );
      if (matching === undefined) {
        complete = false;
        break;
      }
      maximumDistance = computedFeet(
        Math.max(maximumDistance, matching.distanceFeet),
      );
    }
    if (complete) {
      result.push(
        Object.freeze({
          destination: cell(
            origin.x + delta.x,
            origin.y + delta.y,
            origin.level + delta.level,
          ),
          distanceFeet: maximumDistance,
        }),
      );
    }
  }
  return Object.freeze(result);
}

function makeRouteStep(
  arena: TacticalArena,
  from: CellCoordinate,
  to: CellCoordinate,
  tokenFootprint: Footprint,
  distanceFeet: CellFeet,
  transitionTag: RouteStep["transition"]["tag"],
): RouteStep {
  const data = requireArena(arena);
  const previousCells = new Set(
    occupiedCells(from, tokenFootprint).map(cellKey),
  );
  const enteredCells = occupiedCells(to, tokenFootprint)
    .filter((coordinate) => !previousCells.has(cellKey(coordinate)))
    .map((coordinate) => {
      const terrain = data.cells.get(cellKey(coordinate))?.terrain;
      if (terrain === undefined) {
        throw new Error(
          `Internal invariant: route enters missing cell ${cellKey(coordinate)}.`,
        );
      }
      return Object.freeze({ coordinate, terrain });
    });
  const transition: RouteStep["transition"] =
    transitionTag === "horizontal"
      ? Object.freeze({ tag: "horizontal" })
      : Object.freeze({ tag: "vertical-link" });
  return Object.freeze({
    from: freezeCell(from),
    to: freezeCell(to),
    distanceFeet,
    enteredCells: Object.freeze(enteredCells),
    transition,
  });
}

const distanceEvaluator: TraversalEvaluator = (step) =>
  Object.freeze({ tag: "passable", weight: step.distanceFeet });

function isTraversalOpen<TokenId>(
  data: SpaceData<TokenId>,
  first: CellCoordinate,
  second: CellCoordinate,
): boolean {
  return (
    requireArena(data.arena).cells.has(cellKey(second)) &&
    boundaryFacts(data, first, second).traversal === "open"
  );
}

function boundaryFacts<TokenId>(
  data: SpaceData<TokenId>,
  from: CellCoordinate,
  to: CellCoordinate,
): BoundaryFacts {
  const arena = requireArena(data.arena);
  if (!arena.cells.has(cellKey(from)) || !arena.cells.has(cellKey(to))) {
    return Object.freeze({
      traversal: "blocked",
      sight: "blocked",
      cover: "total",
    });
  }
  const stored = arena.boundaries.get(pairKey(cellKey(from), cellKey(to)));
  if (stored === undefined) {
    return Object.freeze({ traversal: "open", sight: "open", cover: "none" });
  }
  const definition = stored.definition;
  if (definition.tag === "door") {
    return data.doors.get(definition.id) === "open"
      ? Object.freeze({ traversal: "open", sight: "open", cover: "none" })
      : Object.freeze({
          traversal: "blocked",
          sight: "blocked",
          cover: "total",
        });
  }
  const fromFirst = cellKey(definition.between[0]) === cellKey(from);
  return Object.freeze({
    traversal: definition.traversal,
    sight: definition.sight,
    cover: fromFirst ? definition.coverFromFirst : definition.coverFromSecond,
  });
}

function placementIssue<TokenId>(
  data: SpaceData<TokenId>,
  origin: CellCoordinate,
  tokenFootprint: Footprint,
  ignoredToken: TokenId | undefined,
): string | null {
  if (!footprintFitsArena(data.arena, origin, tokenFootprint)) {
    return `Footprint does not fit at ${cellKey(origin)}.`;
  }
  if (!footprintHasClearance(data, origin, tokenFootprint)) {
    return `Footprint crosses a blocked boundary at ${cellKey(origin)}.`;
  }
  const requested = new Set(occupiedCells(origin, tokenFootprint).map(cellKey));
  for (const placement of data.placements.values()) {
    if (placement.token === ignoredToken) continue;
    if (
      occupiedCells(placement.origin, placement.footprint).some((item) =>
        requested.has(cellKey(item)),
      )
    ) {
      return `Footprint at ${cellKey(origin)} overlaps token ${String(placement.token)}.`;
    }
  }
  return null;
}

function footprintHasClearance<TokenId>(
  data: SpaceData<TokenId>,
  origin: CellCoordinate,
  tokenFootprint: Footprint,
): boolean {
  for (const occupied of occupiedCells(origin, tokenFootprint)) {
    if (
      occupied.x < origin.x + tokenFootprint.widthCells - 1 &&
      !isTraversalOpen(
        data,
        occupied,
        cell(occupied.x + 1, occupied.y, occupied.level),
      )
    ) {
      return false;
    }
    if (
      occupied.y < origin.y + tokenFootprint.heightCells - 1 &&
      !isTraversalOpen(
        data,
        occupied,
        cell(occupied.x, occupied.y + 1, occupied.level),
      )
    ) {
      return false;
    }
  }
  return true;
}

function footprintFitsArena(
  arena: TacticalArena,
  origin: CellCoordinate,
  tokenFootprint: Footprint,
): boolean {
  const cells = requireArena(arena).cells;
  return occupiedCells(origin, tokenFootprint).every((candidate) =>
    cells.has(cellKey(candidate)),
  );
}

function occupiedCells(
  origin: CellCoordinate,
  tokenFootprint: Footprint,
): readonly CellCoordinate[] {
  const result: CellCoordinate[] = [];
  for (let y = 0; y < tokenFootprint.heightCells; y += 1) {
    for (let x = 0; x < tokenFootprint.widthCells; x += 1) {
      result.push(cell(origin.x + x, origin.y + y, origin.level));
    }
  }
  return Object.freeze(result);
}

function minimumQuantizedDistance<TokenId>(
  first: TokenPlacement<TokenId>,
  second: TokenPlacement<TokenId>,
  quantum: CellFeet,
): CellFeet {
  let minimum = Number.POSITIVE_INFINITY;
  for (const firstCell of occupiedCells(first.origin, first.footprint)) {
    for (const secondCell of occupiedCells(second.origin, second.footprint)) {
      minimum = Math.min(
        minimum,
        Math.max(
          Math.abs(secondCell.x - firstCell.x),
          Math.abs(secondCell.y - firstCell.y),
          Math.abs(secondCell.level - firstCell.level),
        ) * quantum,
      );
    }
  }
  return computedFeet(minimum);
}

function footprintCenter<TokenId>(
  placement: TokenPlacement<TokenId>,
): CellCoordinate {
  return Object.freeze({
    x: placement.origin.x + (placement.footprint.widthCells - 1) / 2,
    y: placement.origin.y + (placement.footprint.heightCells - 1) / 2,
    level: placement.origin.level,
  });
}

function direction(
  deltaX: number,
  deltaY: number,
): SpatialRelation<unknown>["arenaDirection"] {
  if (deltaX === 0 && deltaY === 0) {
    return Object.freeze({ octant: "same", bearingDegrees: null });
  }
  const bearingDegrees = (Math.atan2(deltaX, deltaY) * 180) / Math.PI;
  const normalizedBearing = round((bearingDegrees + 360) % 360);
  const octants = [
    "north",
    "north-east",
    "east",
    "south-east",
    "south",
    "south-west",
    "west",
    "north-west",
  ] as const;
  const index = Math.round(normalizedBearing / 45) % octants.length;
  return Object.freeze({
    octant: octants[index] ?? "north",
    bearingDegrees: normalizedBearing,
  });
}

function isVisibleRelation<TokenId>(
  relation: SpatialRelation<TokenId>,
): relation is SpatialRelation<TokenId, "clear"> {
  return relation.visibility === "clear";
}

function reconstructSteps(
  previous: ReadonlyMap<
    string,
    Readonly<{ readonly key: string; readonly step: RouteStep }>
  >,
  destinationKey: string,
): readonly RouteStep[] {
  const result: RouteStep[] = [];
  let current: string | undefined = destinationKey;
  while (current !== undefined) {
    const edge = previous.get(current);
    if (edge === undefined) break;
    result.push(edge.step);
    current = edge.key;
  }
  return Object.freeze(result.reverse());
}

function lesserCover(first: Cover | null, second: Cover): Cover {
  if (first === null) return second;
  return coverRank(first) <= coverRank(second) ? first : second;
}

function greaterCover(first: Cover, second: Cover): Cover {
  return coverRank(first) >= coverRank(second) ? first : second;
}

function coverRank(value: Cover): number {
  if (value === "none") return 0;
  if (value === "half") return 1;
  if (value === "three-quarters") return 2;
  return 3;
}

function validateFootprint(candidate: Footprint): string | null {
  return isPositiveInteger(candidate.widthCells) &&
    isPositiveInteger(candidate.heightCells)
    ? null
    : "Footprint dimensions must be positive integers.";
}

function areOrthogonalNeighbours(
  first: CellCoordinate,
  second: CellCoordinate,
): boolean {
  return (
    first.level === second.level &&
    Math.abs(first.x - second.x) + Math.abs(first.y - second.y) === 1
  );
}

function freezeArenaDefinition(
  definition: SquareArenaDefinition,
): SquareArenaDefinition {
  return Object.freeze({
    topology: Object.freeze({ ...definition.topology }),
    policies: Object.freeze({ ...definition.policies }),
    cells: Object.freeze(
      definition.cells.map((item) =>
        Object.freeze({
          coordinate: freezeCell(item.coordinate),
          terrain: item.terrain,
        }),
      ),
    ),
    boundaries: Object.freeze(definition.boundaries.map(freezeBoundary)),
    verticalLinks: Object.freeze(
      definition.verticalLinks.map((item) =>
        Object.freeze({
          from: freezeCell(item.from),
          to: freezeCell(item.to),
          distanceFeet: item.distanceFeet,
        }),
      ),
    ),
    anchors: Object.freeze(
      definition.anchors.map((item) => {
        const [first, ...rest] = item.cells;
        const cells: readonly [CellCoordinate, ...CellCoordinate[]] =
          Object.freeze([freezeCell(first), ...rest.map(freezeCell)]);
        return Object.freeze({ id: item.id, label: item.label, cells });
      }),
    ),
  });
}

function freezeBoundary(definition: BoundaryDefinition): BoundaryDefinition {
  const between: readonly [CellCoordinate, CellCoordinate] = Object.freeze([
    freezeCell(definition.between[0]),
    freezeCell(definition.between[1]),
  ]);
  return definition.tag === "door"
    ? Object.freeze({ ...definition, between })
    : Object.freeze({ ...definition, between });
}

function freezePlacement<TokenId>(
  placement: TokenPlacement<TokenId>,
): TokenPlacement<TokenId> {
  return Object.freeze({
    token: placement.token,
    origin: freezeCell(placement.origin),
    footprint: Object.freeze({ ...placement.footprint }),
  });
}

function freezeCell(coordinate: CellCoordinate): CellCoordinate {
  return Object.freeze({ ...coordinate });
}

function makeSpace<TokenId>(
  arena: TacticalArena,
  revision: number,
  doors: ReadonlyMap<BoundaryId, DoorState>,
  placements: ReadonlyMap<TokenId, TokenPlacement<TokenId>>,
): TacticalSpace<TokenId> {
  const state = Object.freeze({ [stateBrand]: (token: TokenId) => token });
  spaceData.set(
    state,
    Object.freeze({
      arena,
      revision,
      doors: new Map(doors),
      placements: new Map(placements),
    }),
  );
  return state;
}

function requireArena(arena: TacticalArena): ArenaData {
  const data = arenaData.get(arena);
  if (data === undefined)
    throw new Error("Internal invariant: unknown arena handle.");
  return data;
}

function requireSpace<TokenId>(
  state: TacticalSpace<TokenId>,
): SpaceData<TokenId> {
  // The opaque handle is created only by makeSpace; its private brand carries
  // TokenId while WeakMap storage necessarily erases that generic at runtime.
  const data = spaceData.get(state) as SpaceData<TokenId> | undefined;
  if (data === undefined)
    throw new Error("Internal invariant: unknown spatial-state handle.");
  return data;
}

function cellKey(coordinate: CellCoordinate): string {
  return `${coordinate.x},${coordinate.y},${coordinate.level}`;
}

function pairKey(first: string, second: string): string {
  return first < second ? `${first}|${second}` : `${second}|${first}`;
}

function sameCell(first: CellCoordinate, second: CellCoordinate): boolean {
  return (
    first.x === second.x && first.y === second.y && first.level === second.level
  );
}

function isCoordinate(candidate: CellCoordinate): boolean {
  return (
    Number.isInteger(candidate.x) &&
    Number.isInteger(candidate.y) &&
    Number.isInteger(candidate.level)
  );
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function isValidWeight(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function computedFeet(value: number): CellFeet {
  // CellFeet is erased at runtime. Callers provide parsed integer lengths and
  // all arithmetic in this module is addition, multiplication, min, or max.
  return value as CellFeet;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function ok<Value>(value: Value): SpatialResult<Value> {
  return Object.freeze({ tag: "ok", value });
}

function error(message: string): SpatialResult<never> {
  return Object.freeze({ tag: "error", issue: Object.freeze({ message }) });
}
