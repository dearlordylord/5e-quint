import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  CELL_SIZE_FEET,
  type Arena,
  type ArenaDefinition,
  type CellCoordinate,
  type CellDefinition,
  type ProspectiveStep,
  type Result,
  type SpatialState,
  type StepPreview,
  type TokenId,
  arenaSnapshot,
  commitPreview,
  createState,
  occupantsAt,
  parseCoordinate,
  parseArena,
  parseTokenId,
  physicalDistanceEvaluator,
  placeToken,
  placementOf,
  planRoute,
  previewRelation,
  previewStep,
  relationBetween,
  removeToken,
  renderRelation,
  renderRoute,
  snapshot,
} from "./index";

function token(value: string): TokenId {
  const result = parseTokenId(value);
  if (result.tag === "error") {
    throw new Error(result.error.message);
  }
  return result.value;
}

function arena(definition: ArenaDefinition): Arena {
  const result = parseArena(definition);
  if (result.tag === "error") {
    throw new Error(result.issues.map((issue) => issue.message).join("; "));
  }
  return result.value;
}

function value<Value, Error>(result: Result<Value, Error>): Value {
  if (result.tag === "error") {
    throw new Error(JSON.stringify(result.error));
  }
  return result.value;
}

function place(
  state: SpatialState,
  id: string,
  coordinate: { readonly x: number; readonly y: number },
): SpatialState {
  return value(placeToken(state, token(id), coordinateValue(coordinate)));
}

function coordinateValue(coordinate: {
  readonly x: number;
  readonly y: number;
}): CellCoordinate {
  return value(parseCoordinate(coordinate));
}

function occupantQuery(
  state: SpatialState,
  coordinate: { readonly x: number; readonly y: number },
) {
  return occupantsAt(state, coordinateValue(coordinate));
}

function routePlan(
  state: SpatialState,
  mover: TokenId,
  destination: { readonly x: number; readonly y: number },
  evaluator: Parameters<typeof planRoute>[3],
) {
  return planRoute(state, mover, coordinateValue(destination), evaluator);
}

function stepPreview(
  state: SpatialState,
  mover: TokenId,
  destination: { readonly x: number; readonly y: number },
  evaluator: Parameters<typeof previewStep>[3],
) {
  return previewStep(state, mover, coordinateValue(destination), evaluator);
}

function squareDefinition(
  width: number,
  height: number,
  difficult: readonly string[] = [],
  boundaries: ArenaDefinition["boundaries"] = [],
): ArenaDefinition {
  const difficultKeys = new Set(difficult);
  const cells: CellDefinition[] = [];
  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      cells.push({
        x,
        y,
        terrain: difficultKeys.has(`${x},${y}`) ? "difficult" : "ordinary",
      });
    }
  }
  return { cells, boundaries };
}

function boundary(
  first: { readonly x: number; readonly y: number },
  second: { readonly x: number; readonly y: number },
  facts: Partial<ArenaDefinition["boundaries"][number]> = {},
): ArenaDefinition["boundaries"][number] {
  return {
    between: [first, second],
    traversal: facts.traversal ?? "open",
    sight: facts.sight ?? "open",
    cover: facts.cover ?? "none",
  };
}

describe("public arena and state seam", () => {
  it("aggregates independent cell and boundary definition issues", () => {
    const result = parseArena({
      cells: [
        { x: 0, y: 0, terrain: "ordinary" },
        { x: 0, y: 0, terrain: "difficult" },
        { x: "bad", y: 1, terrain: "unknown" },
      ],
      boundaries: [
        {
          between: [
            { x: 0, y: 0 },
            { x: 3, y: 3 },
          ],
          traversal: "bad",
          sight: "bad",
          cover: "bad",
        },
        {
          between: [
            { x: 0, y: 0 },
            { x: 0, y: 1 },
          ],
          traversal: "open",
          sight: "open",
          cover: "none",
        },
      ],
    });

    expect(result.tag).toBe("error");
    if (result.tag === "error") {
      const tags = result.issues.map((issue) => issue.tag);
      expect(tags).toEqual(
        expect.arrayContaining([
          "duplicate-cell",
          "invalid-cell-coordinate",
          "invalid-terrain",
          "missing-boundary-cell",
          "invalid-boundary-adjacency",
          "invalid-traversal",
          "invalid-sight",
          "invalid-cover",
        ]),
      );
      expect(result.issues.length).toBeGreaterThan(7);
    }
  });

  it("normalizes negative zero and rejects duplicate coordinate identity", () => {
    const result = parseArena({
      cells: [
        { x: -0, y: 0, terrain: "ordinary" },
        { x: 0, y: 0, terrain: "ordinary" },
      ],
      boundaries: [],
    });
    expect(result.tag).toBe("error");
    if (result.tag === "error") {
      expect(
        result.issues.some((issue) => issue.tag === "duplicate-cell"),
      ).toBe(true);
    }
  });

  it("uses the canonical SHA-256 digest for arena and empty-state identity", () => {
    const map = arena(squareDefinition(1, 1));
    expect(arenaSnapshot(map).fingerprint).toBe(
      "sha256:97037fd3f9f86f373392551e342a6ac523c07e309fdeee5c3ccc3558e037aadf",
    );
    expect(snapshot(createState(map)).fingerprint).toBe(
      "sha256:f4e111cae6bf81f6d973dade39db951dceb8926672c4ae5c160bbc94080c75f9",
    );
  });

  it("keeps authored arena input and complete snapshots deeply immutable", () => {
    const sourceCells: Array<{
      x: number;
      y: number;
      terrain: "ordinary" | "difficult";
    }> = [
      { x: 0, y: 0, terrain: "ordinary" },
      { x: 1, y: 0, terrain: "ordinary" },
    ];
    const definition: ArenaDefinition = { cells: sourceCells, boundaries: [] };
    const parsed = parseArena(definition);
    expect(parsed.tag).toBe("ok");
    if (parsed.tag === "error") {
      return;
    }
    sourceCells[0].x = 99;
    const arenaValue = parsed.value;
    const arenaView = arenaSnapshot(arenaValue);
    expect(arenaView.cells[0].coordinate.x).toBe(0);
    expect(Object.isFrozen(arenaView)).toBe(true);
    expect(Object.isFrozen(arenaView.cells)).toBe(true);
    expect(Object.isFrozen(arenaView.cells[0])).toBe(true);
    expect(Object.isFrozen(arenaView.cells[0].coordinate)).toBe(true);

    const initial = createState(arenaValue);
    const moved = place(initial, "alpha", { x: 0, y: 0 });
    const stateView = snapshot(moved);
    expect(Object.isFrozen(stateView)).toBe(true);
    expect(Object.isFrozen(stateView.placements)).toBe(true);
    expect(Object.isFrozen(stateView.placements[0])).toBe(true);
    expect(Object.isFrozen(stateView.placements[0].coordinate)).toBe(true);
    expect(() => {
      Object.defineProperty(stateView.placements, "0", { value: undefined });
    }).toThrow();
    expect(snapshot(initial).placements).toEqual([]);
  });

  it("places, overlaps, removes, and reports stable occupants", () => {
    const map = arena(squareDefinition(2, 1));
    const initial = createState(map);
    const first = place(initial, "zeta", { x: 0, y: 0 });
    const overlapping = place(first, "alpha", { x: 0, y: 0 });

    expect(snapshot(first).revision).toBe(1);
    expect(snapshot(overlapping).revision).toBe(2);
    expect(value(occupantQuery(overlapping, { x: 0, y: 0 }))).toEqual([
      token("alpha"),
      token("zeta"),
    ]);
    expect(value(placementOf(overlapping, token("alpha"))).coordinate).toEqual({
      x: 0,
      y: 0,
    });

    const removed = value(removeToken(overlapping, token("zeta")));
    expect(snapshot(removed).revision).toBe(3);
    expect(value(occupantQuery(removed, { x: 0, y: 0 }))).toEqual([
      token("alpha"),
    ]);
  });

  it("reports every horizontal direction, same-horizontal-position, and direct distance", () => {
    const map = arena(squareDefinition(5, 5));
    const source = place(createState(map), "source", { x: 2, y: 2 });
    const cases: readonly [
      string,
      { readonly x: number; readonly y: number },
      string,
      number,
    ][] = [
      ["north", { x: 2, y: 4 }, "north", 10],
      ["north-east", { x: 4, y: 4 }, "north-east", 10],
      ["east", { x: 4, y: 2 }, "east", 10],
      ["south-east", { x: 4, y: 0 }, "south-east", 10],
      ["south", { x: 2, y: 0 }, "south", 10],
      ["south-west", { x: 0, y: 0 }, "south-west", 10],
      ["west", { x: 0, y: 2 }, "west", 10],
      ["north-west", { x: 0, y: 4 }, "north-west", 10],
      ["same", { x: 2, y: 2 }, "same-horizontal-position", 0],
    ];

    for (const [id, coordinate, direction, distanceFeet] of cases) {
      const state = place(source, id, coordinate);
      const relation = value(
        relationBetween(state, token("source"), token(id)),
      );
      expect(relation.direction).toBe(direction);
      expect(relation.distanceFeet).toBe(distanceFeet);
      expect(relation.sight).toBe("clear");
      expect(relation.cover).toBe("none");
    }
  });

  it("renders structured relations without route information", () => {
    const map = arena(squareDefinition(2, 1));
    const state = place(
      place(createState(map), "mage", { x: 0, y: 0 }),
      "orc",
      { x: 1, y: 0 },
    );
    const relation = value(relationBetween(state, token("mage"), token("orc")));
    expect(renderRelation(relation)).toBe(
      "orc: east, 5 ft; geometric sight clear; no cover.",
    );
    expect(renderRelation(relation)).not.toContain("route");

    const overlapping = place(state, "ally", { x: 0, y: 0 });
    const overlapRelation = value(
      relationBetween(overlapping, token("mage"), token("ally")),
    );
    expect(renderRelation(overlapRelation)).toBe(
      "ally: same horizontal position, 0 ft; geometric sight clear; no cover.",
    );
  });
});

describe("static boundaries and geometric relations", () => {
  it("keeps sight and Cover independent and Cover symmetric", () => {
    const map = arena(
      squareDefinition(
        3,
        1,
        [],
        [
          boundary(
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { sight: "blocked", cover: "none" },
          ),
          boundary(
            { x: 1, y: 0 },
            { x: 2, y: 0 },
            { sight: "open", cover: "total" },
          ),
        ],
      ),
    );
    const state = place(
      place(createState(map), "left", { x: 0, y: 0 }),
      "right",
      { x: 2, y: 0 },
    );
    const forward = value(
      relationBetween(state, token("left"), token("right")),
    );
    const reverse = value(
      relationBetween(state, token("right"), token("left")),
    );
    expect(forward.sight).toBe("blocked");
    expect(forward.cover).toBe("total");
    expect(reverse.sight).toBe("blocked");
    expect(reverse.cover).toBe("total");

    const clearTotal = arena(
      squareDefinition(
        2,
        1,
        [],
        [
          boundary(
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { sight: "open", cover: "total" },
          ),
        ],
      ),
    );
    const clearTotalState = place(
      place(createState(clearTotal), "left", { x: 0, y: 0 }),
      "right",
      { x: 1, y: 0 },
    );
    const clearRelation = value(
      relationBetween(clearTotalState, token("left"), token("right")),
    );
    expect(clearRelation.sight).toBe("clear");
    expect(clearRelation.cover).toBe("total");
  });

  it("uses maximum Cover across a corner in both directions", () => {
    const map = arena(
      squareDefinition(
        2,
        2,
        [],
        [
          boundary({ x: 0, y: 0 }, { x: 1, y: 0 }, { cover: "half" }),
          boundary({ x: 0, y: 0 }, { x: 0, y: 1 }, { cover: "three-quarters" }),
        ],
      ),
    );
    const state = place(place(createState(map), "a", { x: 0, y: 0 }), "b", {
      x: 1,
      y: 1,
    });
    const forward = value(relationBetween(state, token("a"), token("b")));
    const reverse = value(relationBetween(state, token("b"), token("a")));
    expect(forward.cover).toBe("three-quarters");
    expect(reverse.cover).toBe(forward.cover);
    expect(reverse.sight).toBe(forward.sight);
  });

  it("does not grant Cover from other token footprints", () => {
    const map = arena(squareDefinition(3, 1));
    const state = place(
      place(place(createState(map), "source", { x: 0, y: 0 }), "intervening", {
        x: 1,
        y: 0,
      }),
      "target",
      { x: 2, y: 0 },
    );
    const relation = value(
      relationBetween(state, token("source"), token("target")),
    );
    expect(relation.cover).toBe("none");
  });

  it("rejects diagonal corner cutting for routes and previews", () => {
    const map = arena(
      squareDefinition(
        2,
        2,
        [],
        [boundary({ x: 0, y: 0 }, { x: 1, y: 0 }, { traversal: "blocked" })],
      ),
    );
    const state = place(createState(map), "mover", { x: 0, y: 0 });
    const route = routePlan(
      state,
      token("mover"),
      { x: 1, y: 1 },
      physicalDistanceEvaluator,
    );
    expect(route.tag).toBe("ok");
    if (route.tag === "ok") {
      expect(route.value.steps[0].to).not.toEqual({ x: 1, y: 1 });
    }
    const preview = stepPreview(
      state,
      token("mover"),
      { x: 1, y: 1 },
      physicalDistanceEvaluator,
    );
    expect(preview).toEqual({
      tag: "error",
      error: {
        tag: "blocked-diagonal",
        from: { x: 0, y: 0 },
        to: { x: 1, y: 1 },
      },
    });
  });
});

describe("explicit route planning", () => {
  it("lets trusted evaluators choose different routes over the same geometry", () => {
    const map = arena(squareDefinition(5, 3, ["1,0"]));
    const state = place(createState(map), "mover", { x: 0, y: 1 });
    const ordinary = value(
      routePlan(state, token("mover"), { x: 4, y: 1 }, (step) => ({
        tag: "passable",
        weight: step.distanceFeet,
      })),
    );
    const terrainAware = value(
      routePlan(state, token("mover"), { x: 4, y: 1 }, (step) => ({
        tag: "passable",
        weight: step.terrain === "difficult" ? 50 : step.distanceFeet,
      })),
    );
    expect(
      ordinary.steps.some((step) => step.to.x === 1 && step.to.y === 0),
    ).toBe(true);
    expect(
      terrainAware.steps.some((step) => step.to.x === 1 && step.to.y === 0),
    ).toBe(false);
    expect(ordinary.distanceFeet).toBe(
      ordinary.steps.reduce((total, step) => total + step.distanceFeet, 0),
    );
    expect(terrainAware.distanceFeet).toBe(
      terrainAware.steps.reduce((total, step) => total + step.distanceFeet, 0),
    );
    expect(renderRoute(terrainAware)).toContain("opaque weight");
  });

  it("passes terrain and stable occupants to an evaluator and supports zero-step routes", () => {
    const map = arena(squareDefinition(2, 1, ["1,0"]));
    const state = place(
      place(createState(map), "mover", { x: 0, y: 0 }),
      "blocker",
      { x: 1, y: 0 },
    );
    const seen: ProspectiveStep[] = [];
    const zeroStepPlan = value(
      routePlan(state, token("mover"), { x: 0, y: 0 }, (step) => {
        seen.push(step);
        return step.occupants.length > 0
          ? { tag: "impassable" }
          : { tag: "passable", weight: step.distanceFeet };
      }),
    );
    expect(zeroStepPlan.steps).toEqual([]);
    expect(zeroStepPlan.distanceFeet).toBe(0);
    expect(zeroStepPlan.weight).toBe(0);
    expect(seen).toEqual([]);
    const blocked = routePlan(state, token("mover"), { x: 1, y: 0 }, (step) => {
      seen.push(step);
      return step.occupants.length > 0
        ? { tag: "impassable" }
        : { tag: "passable", weight: step.distanceFeet };
    });
    expect(blocked).toEqual({
      tag: "error",
      error: {
        tag: "no-route",
        mover: token("mover"),
        destination: { x: 1, y: 0 },
      },
    });
    expect(seen[0].occupants).toEqual([token("blocker")]);
  });

  it("returns typed evaluator failures rather than accepting invalid weights", () => {
    const map = arena(squareDefinition(2, 1));
    const state = place(createState(map), "mover", { x: 0, y: 0 });
    const result = routePlan(state, token("mover"), { x: 1, y: 0 }, () => ({
      tag: "passable",
      weight: Number.NaN,
    }));
    expect(result.tag).toBe("error");
    if (result.tag === "error") {
      expect(result.error.tag).toBe("invalid-evaluator-output");
    }
  });

  it("deeply freezes route and relation facts", () => {
    const map = arena(squareDefinition(2, 1));
    const state = place(createState(map), "mover", { x: 0, y: 0 });
    const plan = value(
      routePlan(
        state,
        token("mover"),
        { x: 1, y: 0 },
        physicalDistanceEvaluator,
      ),
    );
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.steps)).toBe(true);
    expect(Object.isFrozen(plan.steps[0])).toBe(true);
    expect(Object.isFrozen(plan.steps[0].occupants)).toBe(true);

    const relationState = place(state, "target", { x: 1, y: 0 });
    const relation = value(
      relationBetween(relationState, token("mover"), token("target")),
    );
    expect(Object.isFrozen(relation)).toBe(true);
  });

  it("replays route ties with the documented coordinate tie-break", () => {
    const map = arena(squareDefinition(3, 2));
    const state = place(createState(map), "mover", { x: 0, y: 0 });
    const evaluator = () => ({ tag: "passable" as const, weight: 0 });
    const first = value(
      routePlan(state, token("mover"), { x: 2, y: 1 }, evaluator),
    );
    const replay = value(
      routePlan(state, token("mover"), { x: 2, y: 1 }, evaluator),
    );
    expect(first).toEqual(replay);
    expect(first.steps.map((step) => step.to)).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 1 },
    ]);
  });

  it("keeps malformed coordinates at the parse boundary", () => {
    expect(parseCoordinate({ x: 1.5, y: 0 })).toEqual({
      tag: "error",
      error: {
        tag: "invalid-coordinate",
        message: "A coordinate requires finite safe integer x and y values.",
      },
    });
    const map = arena(squareDefinition(2, 1));
    const state = place(createState(map), "mover", { x: 0, y: 0 });
    // Deliberately forge the erased coordinate brand to exercise runtime
    // parsed-coordinate authenticity rejection.
    const forgedCoordinate = Object.freeze({ x: 1.5, y: 0 }) as CellCoordinate;
    expect(
      planRoute(
        state,
        token("mover"),
        forgedCoordinate,
        physicalDistanceEvaluator,
      ),
    ).toEqual({
      tag: "error",
      error: {
        tag: "invalid-coordinate",
        message:
          "Coordinates must come from parseCoordinate or a public snapshot.",
      },
    });
  });
});

describe("state-bound step preview and commitment", () => {
  it("previews before/after relations and commits exactly one current step", () => {
    const map = arena(squareDefinition(3, 1));
    const initial = place(
      place(createState(map), "mover", { x: 0, y: 0 }),
      "target",
      { x: 2, y: 0 },
    );
    const preview = value(
      stepPreview(
        initial,
        token("mover"),
        { x: 1, y: 0 },
        physicalDistanceEvaluator,
      ),
    );
    const before = value(previewRelation(preview, token("target"), "before"));
    const after = value(previewRelation(preview, token("target"), "after"));
    expect(before.distanceFeet).toBe(10);
    expect(after.distanceFeet).toBe(5);
    const next = value(commitPreview(initial, preview));
    expect(snapshot(next).revision).toBe(snapshot(initial).revision + 1);
    expect(value(placementOf(next, token("mover"))).coordinate).toEqual({
      x: 1,
      y: 0,
    });
  });

  it("rejects stale, sibling, cross-arena, and forged previews", () => {
    const definition = squareDefinition(3, 1);
    const firstArena = arena(definition);
    const secondArena = arena(definition);
    const initial = place(createState(firstArena), "mover", { x: 0, y: 0 });
    const preview = value(
      stepPreview(
        initial,
        token("mover"),
        { x: 1, y: 0 },
        physicalDistanceEvaluator,
      ),
    );
    const changed = place(initial, "other", { x: 2, y: 0 });
    const stale = commitPreview(changed, preview);
    expect(stale.tag).toBe("error");
    if (stale.tag === "error") {
      expect(stale.error.tag).toBe("stale-preview");
    }

    const sibling = place(createState(firstArena), "mover", { x: 0, y: 0 });
    const siblingPreview = value(
      stepPreview(
        sibling,
        token("mover"),
        { x: 1, y: 0 },
        physicalDistanceEvaluator,
      ),
    );
    const branch = place(createState(firstArena), "mover", { x: 0, y: 0 });
    const branchWithOther = place(branch, "other", { x: 1, y: 0 });
    const siblingStale = commitPreview(branchWithOther, siblingPreview);
    expect(siblingStale.tag).toBe("error");
    if (siblingStale.tag === "error") {
      expect(siblingStale.error.tag).toBe("stale-preview");
    }

    const otherState = place(createState(secondArena), "mover", { x: 0, y: 0 });
    expect(commitPreview(otherState, preview)).toEqual({
      tag: "error",
      error: { tag: "cross-arena-preview" },
    });
    // Deliberately bypass the erased compile-time brand to test runtime
    // WeakMap authenticity rejection for a forged preview object.
    const forgedPreview = Object.freeze({}) as StepPreview;
    expect(commitPreview(initial, forgedPreview)).toEqual({
      tag: "error",
      error: { tag: "forged-preview" },
    });
  });

  it("has no hidden preview consumption state and keeps old route plans readable", () => {
    const map = arena(squareDefinition(3, 1));
    const initial = place(createState(map), "mover", { x: 0, y: 0 });
    const route = value(
      routePlan(
        initial,
        token("mover"),
        { x: 2, y: 0 },
        physicalDistanceEvaluator,
      ),
    );
    const preview = value(
      stepPreview(
        initial,
        token("mover"),
        route.steps[0].to,
        physicalDistanceEvaluator,
      ),
    );
    const first = value(commitPreview(initial, preview));
    const replay = value(commitPreview(initial, preview));
    expect(snapshot(first)).toEqual(snapshot(replay));
    expect(renderRoute(route)).toContain("route to");
    expect(snapshot(initial).revision).toBe(1);
  });
});

const validArenaDefinitionArbitrary = fc
  .uniqueArray(
    fc.record({
      x: fc.integer({ min: -2, max: 2 }),
      y: fc.integer({ min: -2, max: 2 }),
    }),
    {
      minLength: 2,
      maxLength: 12,
      selector: (coordinate) => `${coordinate.x},${coordinate.y}`,
    },
  )
  .map((coordinates) => ({
    cells: coordinates.map((coordinate, index) => ({
      ...coordinate,
      terrain: index % 2 === 0 ? ("ordinary" as const) : ("difficult" as const),
    })),
    boundaries: [],
  }));

describe("public property seam", () => {
  it("preserves generated authored cells in deterministic snapshots", () => {
    fc.assert(
      fc.property(validArenaDefinitionArbitrary, (definition) => {
        const parsed = parseArena(definition);
        expect(parsed.tag).toBe("ok");
        if (parsed.tag === "error") {
          return;
        }
        const actual = arenaSnapshot(parsed.value).cells.map((cell) => ({
          ...cell.coordinate,
          terrain: cell.terrain,
        }));
        const expected = [...definition.cells].sort(
          (first, second) => first.x - second.x || first.y - second.y,
        );
        expect(actual).toEqual(expected);
      }),
      { numRuns: 40 },
    );
  });

  it("keeps direct distance symmetric and query output deterministic", () => {
    fc.assert(
      fc.property(validArenaDefinitionArbitrary, (definition) => {
        const parsed = parseArena(definition);
        if (parsed.tag === "error") {
          throw new Error("generator produced an invalid arena");
        }
        const coordinates = definition.cells;
        const firstCoordinate = coordinates[0];
        const secondCoordinate = coordinates[1];
        const initial = createState(parsed.value);
        const state = place(
          place(initial, "first", firstCoordinate),
          "second",
          secondCoordinate,
        );
        const forward = value(
          relationBetween(state, token("first"), token("second")),
        );
        const reverse = value(
          relationBetween(state, token("second"), token("first")),
        );
        expect(forward.distanceFeet).toBe(reverse.distanceFeet);
        expect(relationBetween(state, token("first"), token("second"))).toEqual(
          relationBetween(state, token("first"), token("second")),
        );
        expect(snapshot(state).fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/);
      }),
      { numRuns: 40 },
    );
  });

  it("distinguishes equal-revision branches and preserves prior state values", () => {
    fc.assert(
      fc.property(validArenaDefinitionArbitrary, (definition) => {
        const parsed = parseArena(definition);
        if (parsed.tag === "error") {
          throw new Error("generator produced an invalid arena");
        }
        const initial = createState(parsed.value);
        const first = place(initial, "mover", definition.cells[0]);
        const second = place(initial, "mover", definition.cells[1]);
        expect(snapshot(first).revision).toBe(1);
        expect(snapshot(second).revision).toBe(1);
        expect(snapshot(first).fingerprint).not.toBe(
          snapshot(second).fingerprint,
        );
        expect(snapshot(initial).placements).toEqual([]);
      }),
      { numRuns: 40 },
    );
  });

  it("keeps generated physical routes contiguous and distance-preserving", () => {
    const fullSquareArbitrary = fc
      .record({
        width: fc.integer({ min: 2, max: 4 }),
        height: fc.integer({ min: 2, max: 4 }),
      })
      .chain(({ width, height }) =>
        fc.record({
          width: fc.constant(width),
          height: fc.constant(height),
          sourceX: fc.integer({ min: 0, max: width - 1 }),
          sourceY: fc.integer({ min: 0, max: height - 1 }),
          destinationX: fc.integer({ min: 0, max: width - 1 }),
          destinationY: fc.integer({ min: 0, max: height - 1 }),
        }),
      );
    fc.assert(
      fc.property(fullSquareArbitrary, (example) => {
        const map = arena(squareDefinition(example.width, example.height));
        const state = place(createState(map), "mover", {
          x: example.sourceX,
          y: example.sourceY,
        });
        const result = routePlan(
          state,
          token("mover"),
          { x: example.destinationX, y: example.destinationY },
          physicalDistanceEvaluator,
        );
        expect(result.tag).toBe("ok");
        if (result.tag === "error") {
          return;
        }
        expect(result.value.distanceFeet).toBe(
          result.value.steps.reduce(
            (total, step) => total + step.distanceFeet,
            0,
          ),
        );
        for (let index = 1; index < result.value.steps.length; index += 1) {
          expect(result.value.steps[index].from).toEqual(
            result.value.steps[index - 1].to,
          );
        }
      }),
      { numRuns: 40 },
    );
  });

  it("gives semantically equal arenas and states equal identities", () => {
    const firstDefinition = squareDefinition(
      2,
      1,
      [],
      [boundary({ x: 0, y: 0 }, { x: 1, y: 0 }, { cover: "half" })],
    );
    const secondDefinition: ArenaDefinition = {
      cells: [...firstDefinition.cells].reverse(),
      boundaries: [boundary({ x: 1, y: 0 }, { x: 0, y: 0 }, { cover: "half" })],
    };
    const firstArena = arena(firstDefinition);
    const secondArena = arena(secondDefinition);
    expect(arenaSnapshot(firstArena).fingerprint).toBe(
      arenaSnapshot(secondArena).fingerprint,
    );
    const firstState = place(createState(firstArena), "mover", { x: 0, y: 0 });
    const secondState = place(createState(secondArena), "mover", {
      x: 0,
      y: 0,
    });
    expect(snapshot(firstState).fingerprint).toBe(
      snapshot(secondState).fingerprint,
    );

    const later = value(removeToken(firstState, token("mover")));
    const restored = place(later, "mover", { x: 0, y: 0 });
    expect(snapshot(restored).revision).toBe(3);
    expect(snapshot(restored).fingerprint).not.toBe(
      snapshot(firstState).fingerprint,
    );
  });
});

expect(CELL_SIZE_FEET).toBe(5);
