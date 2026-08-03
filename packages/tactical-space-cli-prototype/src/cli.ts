import { createInterface } from "node:readline";
import {
  isMovementProfile,
  movementEvaluatorFor,
  MOVEMENT_PROFILES,
  type MovementProfile,
} from "@dnd/tactical-adjudicator-prototype";
import {
  arenaSnapshot,
  cell,
  createArena,
  createSpace,
  findRoute,
  footprint,
  observeFrom,
  parseAnchorId,
  parseBoundaryId,
  parseCellFeet,
  placeToken,
  relationBetween,
  removeToken,
  setDoorState,
  snapshot,
  traverseRoute,
  type BoundaryId,
  type BoundaryDefinition,
  type CellDefinition,
  type CellCoordinate,
  type DoorState,
  type SpatialObservation,
  type SpatialRelation,
  type SpatialRoute,
  type SpatialResult,
  type SquareArenaDefinition,
} from "@dnd/tactical-space-prototype";

const MAP_MIN_X = -4;
const MAP_MAX_X = 4;
const MAP_SOUTH_Y = -18;
const MAP_NORTH_Y = 0;
const GATE_NORTH_Y = -9;
const GATE_SOUTH_Y = GATE_NORTH_Y - 1;
const CELL_QUANTUM_FEET = requireOk(parseCellFeet(5));
const ROUTE_EXPERIMENT_DESTINATION = cell(0, -8);
const CLEAR_ROUTE = [
  cell(0, 0),
  cell(-1, 0),
  cell(-2, -1),
  cell(-3, -2),
  cell(-3, -3),
  cell(-3, -4),
  cell(-3, -5),
  cell(-3, -6),
  cell(-2, -7),
  cell(-1, -8),
  ROUTE_EXPERIMENT_DESTINATION,
];
const CLEAR_ROUTE_KEYS = new Set(CLEAR_ROUTE.map(formatCell));
const DIFFICULT_TERRAIN = new Set(
  rectangle(MAP_MIN_X, MAP_MAX_X, -8, 0, 0)
    .filter((coordinate) => !CLEAR_ROUTE_KEYS.has(formatCell(coordinate)))
    .map(formatCell),
);

const gate = requireOk(parseBoundaryId("south-gate"));
const groundCells = rectangle(
  MAP_MIN_X,
  MAP_MAX_X,
  MAP_SOUTH_Y,
  MAP_NORTH_Y,
  0,
);
const balconyCells = rectangle(2, 2, -8, -5, 1);
const gateWall: readonly BoundaryDefinition[] = inclusiveIntegers(
  MAP_MIN_X,
  MAP_MAX_X,
).map<BoundaryDefinition>((x) =>
  x === 0
    ? {
        tag: "door",
        id: gate,
        between: [cell(x, GATE_NORTH_Y), cell(x, GATE_SOUTH_Y)],
        initialState: "open",
      }
    : {
        tag: "static",
        between: [cell(x, GATE_NORTH_Y), cell(x, GATE_SOUTH_Y)],
        traversal: "blocked",
        sight: "blocked",
        coverFromFirst: "total",
        coverFromSecond: "total",
      },
);

const arenaDefinition: SquareArenaDefinition = {
  topology: {
    tag: "square",
    neighborhood: "eight",
    quantumFeet: CELL_QUANTUM_FEET,
  },
  policies: {
    quantizedDistance: "chebyshev",
    diagonalTraversal: "require-both-cardinals-open",
    lineOfSight: "strict-center-ray",
    cornerSight: "blocked-if-either-cardinal-blocks",
    interLevelSight: "blocked",
  },
  cells: [...groundCells, ...balconyCells].map((coordinate) => ({
    coordinate,
    terrain: DIFFICULT_TERRAIN.has(formatCell(coordinate))
      ? "difficult"
      : "ordinary",
  })),
  boundaries: [
    ...gateWall,
    {
      tag: "static",
      between: [cell(-1, -7), cell(0, -7)],
      traversal: "open",
      sight: "open",
      coverFromFirst: "none",
      coverFromSecond: "half",
    },
  ],
  verticalLinks: [
    {
      from: cell(2, -8, 0),
      to: cell(2, -8, 1),
      distanceFeet: requireOk(parseCellFeet(15)),
    },
    {
      from: cell(2, -8, 1),
      to: cell(2, -8, 0),
      distanceFeet: requireOk(parseCellFeet(15)),
    },
  ],
  anchors: [
    {
      id: requireOk(parseAnchorId("north-nave")),
      label: "North nave",
      cells: nonEmpty(rectangle(MAP_MIN_X, MAP_MAX_X, -5, MAP_NORTH_Y, 0)),
    },
    {
      id: requireOk(parseAnchorId("south-nave")),
      label: "South nave",
      cells: nonEmpty(
        rectangle(MAP_MIN_X, MAP_MAX_X, MAP_SOUTH_Y, GATE_SOUTH_Y, 0),
      ),
    },
    {
      id: requireOk(parseAnchorId("choir-balcony")),
      label: "Choir balcony",
      cells: nonEmpty(balconyCells),
    },
  ],
};

const arena = requireOk(createArena(arenaDefinition));
let state = requireOk(
  placeToken(
    createSpace<string>(arena),
    "fighter",
    cell(0, MAP_NORTH_Y),
    footprint(1, 1),
  ),
);
state = requireOk(
  placeToken(state, "orc", cell(0, MAP_SOUTH_Y), footprint(1, 1)),
);
state = requireOk(placeToken(state, "ogre", cell(1, -15), footprint(2, 2)));
state = requireOk(placeToken(state, "archer", cell(2, -6, 1), footprint(1, 1)));

let focus = "fighter";
let movementProfile: MovementProfile = "ordinary";
let routeDestination = ROUTE_EXPERIMENT_DESTINATION;
let status = `Ready. The orc is exactly ${MAP_NORTH_Y - MAP_SOUTH_Y} cells south of the fighter.`;

const terminal = createInterface({
  input: process.stdin,
  output: process.stdout,
});
terminal.on("line", (line) => {
  const [command = "", ...args] = line.trim().split(/\s+/);
  if (command === "q" || command === "quit") {
    terminal.close();
    return;
  }
  if (command === "focus" && args[0] !== undefined) {
    focus = args[0];
    status = `Focused ${focus}.`;
  } else if (command === "profile" && isMovementProfile(args[0])) {
    movementProfile = args[0];
    status = `Adjudicator traversal profile is ${movementProfile}.`;
  } else if (command === "route" && args.length >= 3) {
    routeDestination = coordinateFrom(args);
    status = `Previewing route to ${formatCell(routeDestination)}.`;
  } else if (command === "move") {
    const preview = previewRoute();
    if (preview.tag === "error") status = preview.issue.message;
    else {
      const traversed = traverseRoute(state, preview.value);
      if (traversed.tag === "ok") {
        state = traversed.value;
        status = `Traversed ${preview.value.distanceFeet} geometric ft with adjudicator weight ${preview.value.weight}.`;
      } else status = traversed.issue.message;
    }
  } else if (
    command === "door" &&
    (args[0] === "open" || args[0] === "closed")
  ) {
    const changed = setDoorState(state, gate, args[0]);
    if (changed.tag === "ok") {
      state = changed.value;
      status = `South gate is ${args[0]}.`;
    } else status = changed.issue.message;
  } else if (command === "add" && args.length >= 4) {
    const token = args[0] ?? "";
    const origin = coordinateFrom(args.slice(1));
    const placed = placeToken(
      state,
      token,
      origin,
      footprint(Number(args[4] ?? "1"), Number(args[5] ?? "1")),
    );
    if (placed.tag === "ok") {
      state = placed.value;
      status = `Placed ${token} at ${formatCell(origin)}.`;
    } else status = placed.issue.message;
  } else if (command === "remove" && args[0] !== undefined) {
    const removed = removeToken(state, args[0]);
    if (removed.tag === "ok") {
      state = removed.value;
      status = `Removed ${args[0]}.`;
    } else status = removed.issue.message;
  } else if (command === "help") {
    status = "Commands are shown below.";
  } else {
    status = `Unknown command: ${line.trim() || "(empty)"}`;
  }
  render();
});
terminal.on("close", () => process.stdout.write("\nPrototype closed.\n"));

render();

function render(): void {
  console.clear();
  const arenaView = arenaSnapshot(arena);
  const stateView = snapshot(state);
  const observation = observeFrom(state, focus);
  const routePreview = previewRoute();
  const gateState = requireDoorState(stateView.doors, gate);

  process.stdout.write(
    `${bold("QUANTIZED TACTICAL SPACE")} ${dim("throwaway / in-memory")}\n`,
  );
  process.stdout.write(
    `${dim(`square-8 · ${arenaView.topology.quantumFeet} ft cells · ${arenaView.policies.quantizedDistance} distance · revision ${stateView.revision}`)}\n\n`,
  );
  process.stdout.write(
    `${bold("GROUND LEVEL")} ${dim("north is up; @ focus; ~ Difficult Terrain; * preview route")}\n`,
  );
  process.stdout.write(
    renderGroundMap(
      arenaView.cells,
      stateView.placements,
      focus,
      gateState,
      routePreview.tag === "ok" ? routePreview.value : null,
    ),
  );

  process.stdout.write(`\n${bold("CANONICAL STATE")}\n`);
  process.stdout.write(`door ${gate}: ${gateState}\n`);
  for (const placement of stateView.placements) {
    process.stdout.write(
      `${String(placement.token).padEnd(8)} origin ${formatCell(placement.origin).padEnd(11)} footprint ${placement.footprint.widthCells}x${placement.footprint.heightCells}\n`,
    );
  }

  process.stdout.write(
    `\n${bold(`ADJUDICATOR-ONLY RELATIONS: ${focus}`)} ${dim("includes unseen creatures")}\n`,
  );
  for (const placement of stateView.placements) {
    if (placement.token === focus) continue;
    const relation = relationBetween(state, focus, placement.token);
    process.stdout.write(
      relation.tag === "ok"
        ? `${renderRelation(relation.value)}\n`
        : `${String(placement.token)}: ${relation.issue.message}\n`,
    );
  }

  process.stdout.write(
    `\n${bold("ROUTE PREVIEW")} ${dim("evaluator supplied by deterministic adjudicator")}\n`,
  );
  process.stdout.write(`profile: ${movementProfile}\n`);
  process.stdout.write(`destination: ${formatCell(routeDestination)}\n`);
  if (routePreview.tag === "error") {
    process.stdout.write(`${routePreview.issue.message}\n`);
  } else {
    process.stdout.write(
      `geometry: ${routePreview.value.distanceFeet} ft; adjudicator weight: ${routePreview.value.weight}\n`,
    );
    process.stdout.write(`${renderRoute(routePreview.value)}\n`);
  }

  process.stdout.write(`\n${bold(`PLAYER OBSERVATION: ${focus}`)}\n`);
  if (observation.tag === "error") {
    process.stdout.write(`${observation.issue.message}\n`);
  } else {
    for (const relation of observation.value.entities)
      process.stdout.write(`${renderRelation(relation)}\n`);
    process.stdout.write(
      `${dim(`observation revision: ${observation.value.revision}`)}\n`,
    );
  }

  process.stdout.write(`\n${bold("COMMANDS")}\n`);
  process.stdout.write(
    `${bold("focus <token>")}                 ${dim("change observer/mover")}\n`,
  );
  process.stdout.write(
    `${bold("profile <name>")}                ${dim(MOVEMENT_PROFILES.join(" | "))}\n`,
  );
  process.stdout.write(
    `${bold("route <x> <y> <level>")}         ${dim("choose preview destination")}\n`,
  );
  process.stdout.write(
    `${bold("move")}                          ${dim("commit the current revision-bound route")}\n`,
  );
  process.stdout.write(
    `${bold("door <open|closed>")}           ${dim("change one dynamic boundary")}\n`,
  );
  process.stdout.write(
    `${bold("add <id> <x> <y> <level> [w h]")} ${dim("place a footprint")}\n`,
  );
  process.stdout.write(
    `${bold("remove <token>")}                ${dim("remove a token")}\n`,
  );
  process.stdout.write(
    `${bold("quit")}                          ${dim("exit")}\n`,
  );
  process.stdout.write(`\n${bold("STATUS")} ${status}\n> `);
}

function renderRelation(relation: SpatialRelation<string>): string {
  const path =
    relation.range.routeLengthFeet === null
      ? "no route"
      : `${relation.range.routeLengthFeet} ft route length`;
  const anchor =
    relation.anchor === null ? "unanchored" : relation.anchor.label;
  return `${String(relation.target).padEnd(8)} ${relation.arenaDirection.octant.padEnd(10)} ${relation.range.quantizedDistanceFeet} ft quantized; ${path}; visibility ${relation.visibility}; ${coverLabel(relation.cover)}; ${anchor}`;
}

function renderRoute(route: SpatialRoute<string>): string {
  if (route.steps.length === 0) return "already at destination";
  return route.steps
    .map((step) => {
      const terrain = step.enteredCells.some(
        (entered) => entered.terrain === "difficult",
      )
        ? "difficult"
        : "ordinary";
      return `${formatCell(step.to)} [${terrain}; ${step.distanceFeet} ft]`;
    })
    .join(" -> ");
}

function coverLabel(cover: SpatialRelation<string>["cover"]): string {
  return cover === "none" ? "no cover" : `${cover} cover`;
}

function renderGroundMap(
  cells: readonly CellDefinition[],
  placements: readonly SpatialObservation<string>["viewer"][],
  focusedToken: string,
  doorState: DoorState,
  route: SpatialRoute<string> | null,
): string {
  const terrain = new Map(
    cells.map((definition) => [
      formatCell(definition.coordinate),
      definition.terrain,
    ]),
  );
  const routeCells = new Set(
    route?.steps.map((step) => formatCell(step.to)) ?? [],
  );
  const occupied = new Map<string, string>();
  for (const placement of placements) {
    for (let y = 0; y < placement.footprint.heightCells; y += 1) {
      for (let x = 0; x < placement.footprint.widthCells; x += 1) {
        occupied.set(
          formatCell(
            cell(
              placement.origin.x + x,
              placement.origin.y + y,
              placement.origin.level,
            ),
          ),
          placement.token === focusedToken
            ? "@"
            : String(placement.token).slice(0, 1).toUpperCase(),
        );
      }
    }
  }
  const rows: string[] = [];
  for (let y = MAP_NORTH_Y; y >= MAP_SOUTH_Y; y -= 1) {
    const cells = inclusiveIntegers(MAP_MIN_X, MAP_MAX_X)
      .map((x) => {
        const key = formatCell(cell(x, y));
        return (
          occupied.get(key) ??
          (routeCells.has(key) ? "*" : undefined) ??
          (terrain.get(key) === "difficult" ? "~" : "·")
        );
      })
      .join(" ");
    rows.push(`${String(y).padStart(3)}  ${cells}`);
    if (y === GATE_NORTH_Y) {
      const gateSide = "─".repeat(MAP_MAX_X - MAP_MIN_X);
      rows.push(
        `     ${gateSide}${doorState === "open" ? "╫" : "█"}${gateSide}  south gate`,
      );
    }
  }
  return `${rows.join("\n")}\n`;
}

function previewRoute(): SpatialResult<SpatialRoute<string>> {
  const placement = snapshot(state).placements.find(
    (candidate) => candidate.token === focus,
  );
  if (placement === undefined) return cliError(`Unknown token: ${focus}`);
  if (
    placement.footprint.widthCells !== 1 ||
    placement.footprint.heightCells !== 1
  ) {
    return cliError(
      "The evaluator comparison intentionally supports only the one-cell fighter.",
    );
  }
  return findRoute(state, {
    token: focus,
    destination: routeDestination,
    evaluateStep: movementEvaluatorFor(movementProfile),
  });
}

function cliError(message: string): SpatialResult<never> {
  return Object.freeze({
    tag: "error",
    issue: Object.freeze({ message }),
  });
}

function rectangle(
  minimumX: number,
  maximumX: number,
  minimumY: number,
  maximumY: number,
  level: number,
): readonly CellCoordinate[] {
  const result: CellCoordinate[] = [];
  for (let y = minimumY; y <= maximumY; y += 1) {
    for (let x = minimumX; x <= maximumX; x += 1)
      result.push(cell(x, y, level));
  }
  return result;
}

function inclusiveIntegers(
  minimum: number,
  maximum: number,
): readonly number[] {
  return Array.from(
    { length: maximum - minimum + 1 },
    (_, index) => minimum + index,
  );
}

function nonEmpty(
  cells: readonly CellCoordinate[],
): readonly [CellCoordinate, ...CellCoordinate[]] {
  const first = cells[0];
  if (first === undefined)
    throw new Error("Internal invariant: authored anchor is empty.");
  return [first, ...cells.slice(1)];
}

function coordinateFrom(values: readonly string[]): CellCoordinate {
  return cell(Number(values[0]), Number(values[1]), Number(values[2]));
}

function formatCell(coordinate: CellCoordinate): string {
  return `${coordinate.x},${coordinate.y},${coordinate.level}`;
}

function requireOk<Value>(result: SpatialResult<Value>): Value {
  if (result.tag === "error") throw new Error(result.issue.message);
  return result.value;
}

function requireDoorState(
  doors: readonly Readonly<{
    readonly id: BoundaryId;
    readonly state: DoorState;
  }>[],
  id: BoundaryId,
): DoorState {
  const match = doors.find((candidate) => candidate.id === id);
  if (match === undefined) {
    throw new Error(`Internal invariant: authored door ${id} is absent.`);
  }
  return match.state;
}

function bold(value: string): string {
  return `\u001B[1m${value}\u001B[0m`;
}

function dim(value: string): string {
  return `\u001B[2m${value}\u001B[0m`;
}
