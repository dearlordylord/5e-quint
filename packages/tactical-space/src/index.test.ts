import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  CELL_SIZE_FEET,
  type Arena,
  type ArenaDefinition,
  type CellCoordinate,
  type CellDefinition,
  type CoverDegree,
  type ProspectiveStep,
  type Result,
  type SpatialState,
  type StepPreview,
  type TokenId,
  arenaSnapshot,
  commitPreview,
  createState,
  interveningTokens,
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
  restoreState,
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

function expectFailure<Value, Error>(
  result: Result<Value, Error>,
  error: Error,
): void {
  expect(result).toEqual({ tag: "error", error });
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
  facts: Partial<Omit<ArenaDefinition["boundaries"][number], "cover">> & {
    readonly cover?: CoverDegree;
  } = {},
): ArenaDefinition["boundaries"][number] {
  return {
    between: [first, second],
    traversal: facts.traversal ?? "open",
    sight: facts.sight ?? "open",
    cover: { kind: "intervening", degree: facts.cover ?? "none" },
  };
}

describe("public arena and state seam", () => {
  it("restores the opaque query state from its canonical evidence snapshots", () => {
    const map = arena(squareDefinition(3, 1));
    let state = createState(map);
    state = place(state, "source", { x: 0, y: 0 });
    state = place(state, "target", { x: 2, y: 0 });

    const restored = value(restoreState(arenaSnapshot(map), snapshot(state)));

    expect(snapshot(restored)).toEqual(snapshot(state));
    expect(
      value(relationBetween(restored, token("source"), token("target"))),
    ).toEqual(value(relationBetween(state, token("source"), token("target"))));
  });

  it("rejects protected-occupant Cover with no protective degree", () => {
    const result = parseArena({
      cells: [
        { x: 0, y: 0, terrain: "ordinary" },
        { x: 1, y: 0, terrain: "ordinary" },
      ],
      boundaries: [
        {
          between: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
          ],
          traversal: "open",
          sight: "open",
          cover: {
            kind: "protected-occupant",
            degree: "none",
            protectedCell: { x: 1, y: 0 },
          },
        },
      ],
    });

    expect(result).toMatchObject({
      tag: "error",
      issues: [{ tag: "invalid-cover", path: "boundaries[0].cover" }],
    });
  });

  it("finds occupied cells crossed away from their centers", () => {
    const map = arena(squareDefinition(5, 2));
    let state = createState(map);
    state = place(state, "source", { x: 0, y: 0 });
    state = place(state, "off-center-interceptor", { x: 2, y: 0 });
    state = place(state, "outside-ray", { x: 1, y: 1 });
    state = place(state, "target", { x: 4, y: 1 });

    expect(
      value(interveningTokens(state, token("source"), token("target"))),
    ).toEqual({
      source: "source",
      target: "target",
      tokens: ["off-center-interceptor"],
    });
  });

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
          cover: { kind: "intervening", degree: "none" },
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

  it("rejects only authored spans that exceed exact distance capacity", () => {
    const tooWide = parseArena({
      cells: [
        { x: 0, y: 0, terrain: "ordinary" },
        { x: 1_801_439_850_948_199, y: 0, terrain: "ordinary" },
      ],
      boundaries: [],
    });
    expect(tooWide.tag).toBe("error");
    if (tooWide.tag === "error") {
      expect(tooWide.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ tag: "arena-span-too-large" }),
        ]),
      );
    }

    const exactCapacity = parseArena({
      cells: [
        { x: 0, y: 0, terrain: "ordinary" },
        { x: 1_801_439_850_948_198, y: 0, terrain: "ordinary" },
      ],
      boundaries: [],
    });
    expect(exactCapacity.tag).toBe("ok");
    if (exactCapacity.tag === "ok") {
      const first = place(
        place(createState(exactCapacity.value), "source", { x: 0, y: 0 }),
        "target",
        { x: 1_801_439_850_948_198, y: 0 },
      );
      const relation = value(
        relationBetween(first, token("source"), token("target")),
      );
      expect(relation.distanceFeet).toBe(9_007_199_254_740_990);
      expect(relation.sight).toBe("blocked");
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
    expect(JSON.parse(JSON.stringify(arenaView))).toEqual(arenaView);
    expect(JSON.parse(JSON.stringify(stateView))).toEqual(stateView);
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
          boundary(
            { x: 1, y: 0 },
            { x: 1, y: 1 },
            { sight: "blocked", cover: "total" },
          ),
          boundary({ x: 0, y: 1 }, { x: 1, y: 1 }, { cover: "half" }),
        ],
      ),
    );
    const state = place(place(createState(map), "a", { x: 0, y: 0 }), "b", {
      x: 1,
      y: 1,
    });
    const forward = value(relationBetween(state, token("a"), token("b")));
    const reverse = value(relationBetween(state, token("b"), token("a")));
    expect(forward.cover).toBe("total");
    expect(forward.sight).toBe("blocked");
    expect(reverse.cover).toBe(forward.cover);
    expect(reverse.sight).toBe(forward.sight);
  });

  it("applies protected-occupant Cover only to a target in the protected cell", () => {
    const map = arena({
      cells: squareDefinition(3, 1).cells,
      boundaries: [
        {
          between: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
          ],
          traversal: "open",
          sight: "open",
          cover: {
            kind: "protected-occupant",
            degree: "half",
            protectedCell: { x: 1, y: 0 },
          },
        },
      ],
    });
    let state = createState(map);
    state = place(state, "west", { x: 0, y: 0 });
    state = place(state, "occupant", { x: 1, y: 0 });
    state = place(state, "east", { x: 2, y: 0 });

    expect(
      value(relationBetween(state, token("west"), token("occupant"))).cover,
    ).toBe("half");
    expect(
      value(relationBetween(state, token("occupant"), token("west"))).cover,
    ).toBe("none");
    expect(
      value(relationBetween(state, token("west"), token("east"))).cover,
    ).toBe("none");
  });

  it("keeps named sight and Cover cases independent", () => {
    const isolatedBlocked = arena(
      squareDefinition(
        2,
        1,
        [],
        [
          boundary(
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { sight: "blocked", cover: "none" },
          ),
        ],
      ),
    );
    const blockedState = place(
      place(createState(isolatedBlocked), "source", { x: 0, y: 0 }),
      "target",
      { x: 1, y: 0 },
    );
    const blocked = value(
      relationBetween(blockedState, token("source"), token("target")),
    );
    expect(blocked.sight).toBe("blocked");
    expect(blocked.cover).toBe("none");

    const opaqueTotal = arena(
      squareDefinition(
        2,
        1,
        [],
        [
          boundary(
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { sight: "blocked", cover: "total" },
          ),
        ],
      ),
    );
    const opaqueTotalState = place(
      place(createState(opaqueTotal), "source", { x: 0, y: 0 }),
      "target",
      { x: 1, y: 0 },
    );
    const opaque = value(
      relationBetween(opaqueTotalState, token("source"), token("target")),
    );
    expect(opaque.sight).toBe("blocked");
    expect(opaque.cover).toBe("total");

    for (const [cover, expected] of [
      ["half", "half"],
      ["three-quarters", "three-quarters"],
      ["total", "total"],
    ] as const) {
      const direct = arena(
        squareDefinition(
          2,
          1,
          [],
          [boundary({ x: 0, y: 0 }, { x: 1, y: 0 }, { sight: "open", cover })],
        ),
      );
      const directState = place(
        place(createState(direct), "source", { x: 0, y: 0 }),
        "target",
        { x: 1, y: 0 },
      );
      const relation = value(
        relationBetween(directState, token("source"), token("target")),
      );
      expect(relation.sight).toBe("clear");
      expect(relation.cover).toBe(expected);
    }
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

describe("public error protocol seam", () => {
  it("returns precise token, coordinate, and arena parsing failures", () => {
    expect(parseTokenId("")).toEqual({
      tag: "error",
      error: {
        tag: "invalid-token-id",
        message: "A token identity must be a nonempty string.",
      },
    });
    expect(parseTokenId(42)).toEqual({
      tag: "error",
      error: {
        tag: "invalid-token-id",
        message: "A token identity must be a nonempty string.",
      },
    });
    expect(parseCoordinate({ x: 0, y: Number.POSITIVE_INFINITY })).toEqual({
      tag: "error",
      error: {
        tag: "invalid-coordinate",
        message: "A coordinate requires finite safe integer x and y values.",
      },
    });
    expect(parseCoordinate(null)).toEqual({
      tag: "error",
      error: {
        tag: "invalid-coordinate",
        message: "A coordinate requires finite safe integer x and y values.",
      },
    });
    expect(parseArena(null)).toEqual({
      tag: "error",
      issues: [
        {
          tag: "invalid-arena",
          path: "arena",
          message: "An arena must be an object.",
        },
      ],
    });
    expect(parseArena({ cells: "not-an-array", boundaries: {} })).toEqual({
      tag: "error",
      issues: [
        {
          tag: "invalid-cells",
          path: "cells",
          message: "Arena cells must be an array.",
        },
        {
          tag: "invalid-boundaries",
          path: "boundaries",
          message: "Arena boundaries must be an array.",
        },
      ],
    });

    const malformed = parseArena({
      cells: [
        null,
        { x: 0, y: 0, terrain: "ordinary" },
        { x: 1, y: 0, terrain: "ordinary" },
      ],
      boundaries: [
        null,
        { between: [] },
        {
          between: [
            { x: "bad", y: 0 },
            { x: 1, y: 0 },
          ],
          traversal: "open",
          sight: "open",
          cover: { kind: "intervening", degree: "none" },
        },
        boundary({ x: 0, y: 0 }, { x: 1, y: 0 }),
        boundary({ x: 1, y: 0 }, { x: 0, y: 0 }),
        boundary({ x: 0, y: 0 }, { x: 3, y: 0 }),
      ],
    });
    expect(malformed.tag).toBe("error");
    if (malformed.tag === "error") {
      expect(malformed.issues).toEqual([
        {
          tag: "invalid-cell-coordinate",
          path: "cells[0]",
          message: "A cell must be an object with x, y, and terrain.",
        },
        {
          tag: "invalid-boundary-shape",
          path: "boundaries[0]",
          message: "A boundary requires a pair of cell coordinates.",
        },
        {
          tag: "invalid-boundary-shape",
          path: "boundaries[1].between",
          message: "A boundary requires exactly two cell coordinates.",
        },
        {
          tag: "invalid-boundary-coordinate",
          path: "boundaries[2].between[0]",
          message:
            "A boundary endpoint requires finite safe integer x and y values.",
        },
        {
          tag: "duplicate-boundary",
          path: "boundaries[4]",
          message: "Each pair of adjacent cells may have only one boundary.",
        },
        {
          tag: "missing-boundary-cell",
          path: "boundaries[5].between[1]",
          message: "A boundary endpoint must name an authored cell.",
        },
        {
          tag: "invalid-boundary-adjacency",
          path: "boundaries[5].between",
          message: "A boundary must join orthogonally adjacent cells.",
        },
      ]);
    }
  });

  it("keeps state mutation and query failures typed and nonmutating", () => {
    const map = arena(squareDefinition(2, 1));
    const initial = createState(map);
    const mover = token("mover");
    const missingCell = coordinateValue({ x: 2, y: 0 });
    // placeToken and occupantsAt publicly promise invalid-coordinate results
    // for values that only counterfeit the erased CellCoordinate brand.
    const forgedCoordinate = Object.freeze({ x: 0, y: 0 }) as CellCoordinate;

    expect(placeToken(initial, mover, forgedCoordinate)).toEqual({
      tag: "error",
      error: {
        tag: "invalid-coordinate",
        message:
          "Coordinates must come from parseCoordinate or a public snapshot.",
      },
    });
    expect(placeToken(initial, mover, missingCell)).toEqual({
      tag: "error",
      error: { tag: "missing-cell", coordinate: missingCell },
    });

    const placed = place(initial, "mover", { x: 0, y: 0 });
    expect(placeToken(placed, mover, coordinateValue({ x: 1, y: 0 }))).toEqual({
      tag: "error",
      error: { tag: "duplicate-token", token: mover },
    });
    expect(removeToken(initial, token("missing"))).toEqual({
      tag: "error",
      error: { tag: "unknown-token", token: token("missing") },
    });
    expect(occupantsAt(initial, forgedCoordinate)).toEqual({
      tag: "error",
      error: {
        tag: "invalid-coordinate",
        message:
          "Coordinates must come from parseCoordinate or a public snapshot.",
      },
    });
    expect(occupantsAt(initial, missingCell)).toEqual({
      tag: "error",
      error: { tag: "missing-cell", coordinate: missingCell },
    });
    expect(placementOf(initial, token("missing"))).toEqual({
      tag: "error",
      error: { tag: "unknown-token", token: token("missing") },
    });
    expect(relationBetween(placed, token("missing"), mover)).toEqual({
      tag: "error",
      error: { tag: "unknown-token", token: token("missing") },
    });
    expect(relationBetween(placed, mover, token("missing"))).toEqual({
      tag: "error",
      error: { tag: "unknown-token", token: token("missing") },
    });
    const prefixed = place(place(initial, "aa", { x: 0, y: 0 }), "a", {
      x: 0,
      y: 0,
    });
    expect(
      value(occupantsAt(prefixed, coordinateValue({ x: 0, y: 0 }))),
    ).toEqual([token("a"), token("aa")]);
    expect(snapshot(initial).placements).toEqual([]);
    expect(snapshot(placed).placements).toEqual([
      { token: mover, coordinate: coordinateValue({ x: 0, y: 0 }) },
    ]);
  });
});

describe("public movement error protocol", () => {
  it("keeps route planning failures typed with precise consequences", () => {
    const map = arena(squareDefinition(2, 1));
    const state = place(createState(map), "mover", { x: 0, y: 0 });
    const mover = token("mover");
    // Route planning explicitly promises a typed function-boundary failure.
    const invalidEvaluator = undefined as unknown as Parameters<
      typeof planRoute
    >[3];

    expectFailure(
      planRoute(
        state,
        token("missing"),
        coordinateValue({ x: 1, y: 0 }),
        physicalDistanceEvaluator,
      ),
      { tag: "unknown-token", token: token("missing") },
    );
    expectFailure(
      planRoute(
        state,
        mover,
        coordinateValue({ x: 2, y: 0 }),
        physicalDistanceEvaluator,
      ),
      {
        tag: "missing-destination-cell",
        coordinate: coordinateValue({ x: 2, y: 0 }),
      },
    );
    expectFailure(routePlan(state, mover, { x: 1, y: 0 }, invalidEvaluator), {
      tag: "invalid-evaluator",
      message: "A route evaluator must be a function.",
    });

    const throwingEvaluator: Parameters<typeof planRoute>[3] = () => {
      throw new Error("evaluator exploded");
    };
    expectFailure(routePlan(state, mover, { x: 1, y: 0 }, throwingEvaluator), {
      tag: "evaluator-threw",
      message: "evaluator exploded",
    });
    const nonErrorThrowingEvaluator: Parameters<typeof planRoute>[3] = () => {
      throw "non-error evaluator failure";
    };
    expectFailure(
      routePlan(state, mover, { x: 1, y: 0 }, nonErrorThrowingEvaluator),
      { tag: "evaluator-threw", message: "The evaluator threw." },
    );
    const malformedOutputEvaluator: Parameters<typeof planRoute>[3] = () =>
      undefined as never;
    expectFailure(
      routePlan(state, mover, { x: 1, y: 0 }, malformedOutputEvaluator),
      {
        tag: "invalid-evaluator-output",
        message: "The evaluator must return passable or impassable.",
      },
    );
    const wrongShapeEvaluator: Parameters<typeof planRoute>[3] = () =>
      ({ tag: "passable", weight: "not-a-number" }) as never;
    expectFailure(
      routePlan(state, mover, { x: 1, y: 0 }, wrongShapeEvaluator),
      {
        tag: "invalid-evaluator-output",
        message: "A passable evaluator weight must be finite and nonnegative.",
      },
    );
    expectFailure(
      routePlan(state, mover, { x: 1, y: 0 }, () => ({
        tag: "passable",
        weight: Number.NaN,
      })),
      {
        tag: "invalid-evaluator-output",
        message: "A passable evaluator weight must be finite and nonnegative.",
      },
    );

    const overflowMap = arena(squareDefinition(3, 1));
    const overflowState = place(createState(overflowMap), "mover", {
      x: 0,
      y: 0,
    });
    expectFailure(
      routePlan(overflowState, mover, { x: 2, y: 0 }, () => ({
        tag: "passable",
        weight: Number.MAX_VALUE,
      })),
      {
        tag: "invalid-evaluator-output",
        message: "The evaluator route total must be finite and nonnegative.",
      },
    );

    const blockedMap = arena(
      squareDefinition(
        2,
        1,
        [],
        [boundary({ x: 0, y: 0 }, { x: 1, y: 0 }, { traversal: "blocked" })],
      ),
    );
    const blockedState = place(createState(blockedMap), "mover", {
      x: 0,
      y: 0,
    });
    expectFailure(
      routePlan(blockedState, mover, { x: 1, y: 0 }, physicalDistanceEvaluator),
      {
        tag: "no-route",
        mover,
        destination: coordinateValue({ x: 1, y: 0 }),
      },
    );
    const zeroStepPlan = value(
      routePlan(state, mover, { x: 0, y: 0 }, physicalDistanceEvaluator),
    );
    expect(renderRoute(zeroStepPlan)).toContain("no steps.");
  });

  it("replays stale route candidates and preserves edge coordinates", () => {
    const map = arena(squareDefinition(3, 2));
    const state = place(createState(map), "mover", { x: 0, y: 0 });
    const mover = token("mover");
    const evaluator: Parameters<typeof planRoute>[3] = (step) => {
      if (
        step.from.x === 0 &&
        step.from.y === 0 &&
        step.to.x === 1 &&
        step.to.y === 0
      ) {
        return { tag: "passable", weight: 10 };
      }
      if (step.to.x === 2 && step.to.y === 0) {
        return { tag: "passable", weight: 100 };
      }
      return { tag: "passable", weight: 1 };
    };
    const plan = value(routePlan(state, mover, { x: 2, y: 0 }, evaluator));
    expect(plan.destination).toEqual({ x: 2, y: 0 });
    expect(plan.steps).toEqual([
      expect.objectContaining({
        from: { x: 0, y: 0 },
        to: { x: 1, y: 1 },
        weight: 1,
      }),
      expect.objectContaining({
        from: { x: 1, y: 1 },
        to: { x: 2, y: 0 },
        weight: 100,
      }),
    ]);
    expect(plan.distanceFeet).toBe(10);
    expect(plan.weight).toBe(101);

    const edge = Number.MAX_SAFE_INTEGER;
    const edgeArena = arena({
      cells: [
        { x: edge - 1, y: 0, terrain: "ordinary" },
        { x: edge, y: 0, terrain: "ordinary" },
      ],
      boundaries: [],
    });
    const edgeState = place(createState(edgeArena), "mover", {
      x: edge,
      y: 0,
    });
    const edgePlan = value(
      routePlan(
        edgeState,
        mover,
        { x: edge - 1, y: 0 },
        physicalDistanceEvaluator,
      ),
    );
    expect(edgePlan.steps).toHaveLength(1);
  });

  it("keeps step preview, relation, and commit failures typed", () => {
    const map = arena(
      squareDefinition(
        3,
        3,
        [],
        [boundary({ x: 0, y: 0 }, { x: 1, y: 0 }, { traversal: "blocked" })],
      ),
    );
    const state = place(createState(map), "mover", { x: 0, y: 0 });
    const mover = token("mover");
    const invalidEvaluator = undefined as unknown as Parameters<
      typeof previewStep
    >[3];
    // previewStep publicly promises invalid-coordinate rejection for a value
    // that only counterfeits the erased coordinate brand.
    const forgedCoordinate = Object.freeze({ x: 0, y: 0 }) as CellCoordinate;

    expectFailure(
      previewStep(state, mover, forgedCoordinate, physicalDistanceEvaluator),
      {
        tag: "invalid-coordinate",
        message:
          "Coordinates must come from parseCoordinate or a public snapshot.",
      },
    );
    expectFailure(
      stepPreview(
        state,
        token("missing"),
        { x: 0, y: 1 },
        physicalDistanceEvaluator,
      ),
      { tag: "unknown-token", token: token("missing") },
    );
    expectFailure(
      stepPreview(state, mover, { x: 3, y: 0 }, physicalDistanceEvaluator),
      { tag: "missing-cell", coordinate: coordinateValue({ x: 3, y: 0 }) },
    );
    expectFailure(
      stepPreview(state, mover, { x: 2, y: 0 }, physicalDistanceEvaluator),
      {
        tag: "not-adjacent",
        from: coordinateValue({ x: 0, y: 0 }),
        to: coordinateValue({ x: 2, y: 0 }),
      },
    );
    expectFailure(
      stepPreview(state, mover, { x: 1, y: 0 }, physicalDistanceEvaluator),
      {
        tag: "blocked-step",
        from: coordinateValue({ x: 0, y: 0 }),
        to: coordinateValue({ x: 1, y: 0 }),
      },
    );
    expectFailure(stepPreview(state, mover, { x: 0, y: 1 }, invalidEvaluator), {
      tag: "invalid-evaluator",
      message: "A route evaluator must be a function.",
    });

    const throwingEvaluator: Parameters<typeof previewStep>[3] = () => {
      throw new Error("preview evaluator exploded");
    };
    expectFailure(
      stepPreview(state, mover, { x: 0, y: 1 }, throwingEvaluator),
      { tag: "evaluator-threw", message: "preview evaluator exploded" },
    );
    const malformedOutputEvaluator: Parameters<typeof previewStep>[3] = () =>
      undefined as never;
    expectFailure(
      stepPreview(state, mover, { x: 0, y: 1 }, malformedOutputEvaluator),
      {
        tag: "invalid-evaluator-output",
        message: "The evaluator must return passable or impassable.",
      },
    );
    expectFailure(
      stepPreview(state, mover, { x: 0, y: 1 }, () => ({ tag: "impassable" })),
      { tag: "step-impassable" },
    );

    const relationState = place(state, "target", { x: 1, y: 1 });
    const preview = value(
      stepPreview(
        relationState,
        mover,
        { x: 0, y: 1 },
        physicalDistanceEvaluator,
      ),
    );
    expectFailure(previewRelation(preview, token("missing"), "before"), {
      tag: "unknown-token",
      token: token("missing"),
    });
    // previewRelation also publicly rejects handles it did not issue.
    const forgedPreview = Object.freeze({}) as StepPreview;
    expectFailure(previewRelation(forgedPreview, token("target"), "before"), {
      tag: "forged-preview",
    });
    expectFailure(
      previewRelation(
        null as unknown as StepPreview,
        token("target"),
        "before",
      ),
      { tag: "forged-preview" },
    );
    expectFailure(commitPreview(state, "forged" as unknown as StepPreview), {
      tag: "forged-preview",
    });

    const changedOrigin = place(createState(map), "mover", { x: 1, y: 0 });
    expect(commitPreview(changedOrigin, preview)).toEqual({
      tag: "error",
      error: expect.objectContaining({
        tag: "stale-preview",
        cause: {
          tag: "mover-origin-changed",
          mover,
          expected: coordinateValue({ x: 0, y: 0 }),
          actual: coordinateValue({ x: 1, y: 0 }),
        },
      }),
    });
  });

  it("rejects sparse diagonal sight and keeps vertical rays parallel to walls", () => {
    const sparse = arena({
      cells: [
        { x: 0, y: 0, terrain: "ordinary" },
        { x: 1, y: 1, terrain: "ordinary" },
      ],
      boundaries: [],
    });
    const sparseState = place(createState(sparse), "mover", { x: 0, y: 0 });
    expectFailure(
      stepPreview(
        sparseState,
        token("mover"),
        { x: 1, y: 1 },
        physicalDistanceEvaluator,
      ),
      {
        tag: "blocked-diagonal",
        from: coordinateValue({ x: 0, y: 0 }),
        to: coordinateValue({ x: 1, y: 1 }),
      },
    );

    const vertical = arena(
      squareDefinition(2, 3, [], [boundary({ x: 0, y: 0 }, { x: 1, y: 0 })]),
    );
    const verticalState = place(
      place(createState(vertical), "source", { x: 0, y: 0 }),
      "target",
      { x: 0, y: 2 },
    );
    expect(
      value(relationBetween(verticalState, token("source"), token("target")))
        .sight,
    ).toBe("clear");
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

  it("compares movement policies on one geometry without embedding their rules", () => {
    const map = arena(squareDefinition(3, 2, ["1,0"]));
    const state = place(
      place(createState(map), "mover", { x: 0, y: 0 }),
      "blocker",
      { x: 1, y: 0 },
    );
    const destination = { x: 2, y: 0 };
    const ordinary = value(
      routePlan(state, token("mover"), destination, (step) => ({
        tag: "passable",
        weight: step.distanceFeet,
      })),
    );
    const crawling = value(
      routePlan(state, token("mover"), destination, (step) => ({
        tag: "passable",
        weight: step.distanceFeet * 2,
      })),
    );
    const occupantPermitting = value(
      routePlan(state, token("mover"), destination, () => ({
        tag: "passable",
        weight: 1,
      })),
    );
    const occupantBlocking = value(
      routePlan(state, token("mover"), destination, (step) =>
        step.occupants.length === 0
          ? { tag: "passable", weight: step.distanceFeet }
          : { tag: "impassable" },
      ),
    );
    const difficultTerrainUnaffected = value(
      routePlan(state, token("mover"), destination, (step) => ({
        tag: "passable",
        weight: step.distanceFeet,
      })),
    );

    expect(ordinary.steps.map((step) => step.to)).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]);
    expect(crawling.steps.map((step) => step.to)).toEqual(
      ordinary.steps.map((step) => step.to),
    );
    expect(occupantPermitting.steps.map((step) => step.to)).toEqual(
      ordinary.steps.map((step) => step.to),
    );
    expect(occupantBlocking.steps.map((step) => step.to)).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 0 },
    ]);
    expect(difficultTerrainUnaffected.steps.map((step) => step.to)).toEqual(
      ordinary.steps.map((step) => step.to),
    );
    expect(crawling.weight).toBe(ordinary.weight * 2);
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
    expect(JSON.parse(JSON.stringify(plan))).toEqual(plan);
    expect(JSON.parse(JSON.stringify(relation))).toEqual(relation);
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
    expect(preview.stateFingerprint).toBe(snapshot(initial).fingerprint);
    expect(preview.revision).toBe(snapshot(initial).revision);
    expect(preview.mover).toBe(token("mover"));
    expect(preview.step.from).toEqual({ x: 0, y: 0 });
    expect(preview.step.to).toEqual({ x: 1, y: 0 });
    expect(preview.step.distanceFeet).toBe(CELL_SIZE_FEET);
    expect(Object.isFrozen(preview)).toBe(true);
    expect(Object.isFrozen(preview.step)).toBe(true);
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
      if (stale.error.tag === "stale-preview") {
        expect(stale.error.cause).toEqual({ tag: "state-changed" });
      }
    }

    const sameRevisionSibling = place(createState(firstArena), "other", {
      x: 2,
      y: 0,
    });
    const sameRevisionStale = commitPreview(sameRevisionSibling, preview);
    expect(sameRevisionStale.tag).toBe("error");
    if (sameRevisionStale.tag === "error") {
      expect(sameRevisionStale.error.tag).toBe("stale-preview");
      if (sameRevisionStale.error.tag === "stale-preview") {
        expect(sameRevisionStale.error.expectedRevision).toBe(
          sameRevisionStale.error.actualRevision,
        );
        expect(sameRevisionStale.error.cause).toEqual({
          tag: "mover-missing",
          mover: token("mover"),
        });
      }
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

  it("traces several current previews, occupancy change, and named-counterpart reach", () => {
    const map = arena(squareDefinition(6, 1));
    const counterpart = token("counterpart");
    const mover = token("mover");
    const routeOrigin = place(
      place(createState(map), "mover", { x: 1, y: 0 }),
      "counterpart",
      { x: 0, y: 0 },
    );
    const originalPlan = value(
      routePlan(routeOrigin, mover, { x: 5, y: 0 }, physicalDistanceEvaluator),
    );
    const observed: Array<readonly [number, number]> = [];
    const firstPreview = value(
      stepPreview(
        routeOrigin,
        mover,
        originalPlan.steps[0].to,
        physicalDistanceEvaluator,
      ),
    );
    observed.push([
      value(previewRelation(firstPreview, counterpart, "before")).distanceFeet,
      value(previewRelation(firstPreview, counterpart, "after")).distanceFeet,
    ]);
    const afterFirst = value(commitPreview(routeOrigin, firstPreview));
    const secondPreview = value(
      stepPreview(
        afterFirst,
        mover,
        originalPlan.steps[1].to,
        physicalDistanceEvaluator,
      ),
    );
    observed.push([
      value(previewRelation(secondPreview, counterpart, "before")).distanceFeet,
      value(previewRelation(secondPreview, counterpart, "after")).distanceFeet,
    ]);
    const afterSecond = value(commitPreview(afterFirst, secondPreview));
    expect(observed).toEqual([
      [5, 10],
      [10, 15],
    ]);

    const occupied = place(afterSecond, "obstacle", originalPlan.steps[2].to);
    const occupantBlockingEvaluator = (step: ProspectiveStep) =>
      step.occupants.length === 0
        ? { tag: "passable" as const, weight: step.distanceFeet }
        : { tag: "impassable" as const };
    expect(
      previewStep(
        occupied,
        mover,
        originalPlan.steps[2].to,
        occupantBlockingEvaluator,
      ),
    ).toEqual({
      tag: "error",
      error: {
        tag: "step-impassable",
      },
    });
    const replanned = routePlan(
      occupied,
      mover,
      { x: 5, y: 0 },
      occupantBlockingEvaluator,
    );
    expect(replanned).toEqual({
      tag: "error",
      error: {
        tag: "no-route",
        mover,
        destination: { x: 5, y: 0 },
      },
    });
    expect(snapshot(routeOrigin).revision).toBe(2);
    expect(snapshot(afterSecond).revision).toBe(4);
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

const cornerBoundaryFactsArbitrary = fc.record({
  traversal: fc.constantFrom("open" as const, "blocked" as const),
  sight: fc.constantFrom("open" as const, "blocked" as const),
  cover: fc.constantFrom(
    "none" as const,
    "half" as const,
    "three-quarters" as const,
    "total" as const,
  ),
});

const cornerArenaDefinitionArbitrary = fc
  .array(cornerBoundaryFactsArbitrary, { minLength: 4, maxLength: 4 })
  .map((facts) => ({
    cells: squareDefinition(2, 2).cells,
    boundaries: [
      boundary({ x: 0, y: 0 }, { x: 1, y: 0 }, facts[0]),
      boundary({ x: 0, y: 0 }, { x: 0, y: 1 }, facts[1]),
      boundary({ x: 1, y: 0 }, { x: 1, y: 1 }, facts[2]),
      boundary({ x: 0, y: 1 }, { x: 1, y: 1 }, facts[3]),
    ],
  }));

const smallCoordinateArbitrary = fc.constantFrom(
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
);

type OraclePoint = Readonly<{ readonly x: number; readonly y: number }>;
type OracleEdge = readonly [OraclePoint, OraclePoint];

function gridEdges(width: number, height: number): readonly OracleEdge[] {
  const edges: OracleEdge[] = [];
  for (let x = 0; x < width - 1; x += 1) {
    for (let y = 0; y < height; y += 1) {
      edges.push([
        { x, y },
        { x: x + 1, y },
      ]);
    }
  }
  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height - 1; y += 1) {
      edges.push([
        { x, y },
        { x, y: y + 1 },
      ]);
    }
  }
  return edges;
}

const ORACLE_GRID_WIDTH = 4;
const ORACLE_GRID_HEIGHT = 4;
const ORACLE_GRID_POINT_COUNT = ORACLE_GRID_WIDTH * ORACLE_GRID_HEIGHT;
const oracleGridEdges = gridEdges(ORACLE_GRID_WIDTH, ORACLE_GRID_HEIGHT);
const oracleGridPoints: readonly OraclePoint[] = Array.from(
  { length: ORACLE_GRID_POINT_COUNT },
  (_, index) => ({
    x: index % ORACLE_GRID_WIDTH,
    y: Math.floor(index / ORACLE_GRID_WIDTH),
  }),
);
const oracleEdgeFactArbitrary = fc.record({
  present: fc.boolean(),
  sight: fc.constantFrom("open" as const, "blocked" as const),
  cover: fc.constantFrom(
    "none" as const,
    "half" as const,
    "three-quarters" as const,
    "total" as const,
  ),
});
const oracleSlopePairs: readonly (readonly [OraclePoint, OraclePoint])[] =
  (() => {
    const pairs: Array<readonly [OraclePoint, OraclePoint]> = [];
    for (const source of oracleGridPoints) {
      for (const target of oracleGridPoints) {
        const deltaX = Math.abs(source.x - target.x);
        const deltaY = Math.abs(source.y - target.y);
        if (deltaX !== 0 && deltaY !== 0 && deltaX !== deltaY) {
          pairs.push([source, target]);
        }
      }
    }
    return pairs;
  })();
const oracleSlopeExampleArbitrary = fc
  .constantFrom(...oracleSlopePairs)
  .chain(([source, target]) =>
    fc.record({
      source: fc.constant(source),
      target: fc.constant(target),
      edgeFacts: fc.array(oracleEdgeFactArbitrary, {
        minLength: oracleGridEdges.length,
        maxLength: oracleGridEdges.length,
      }),
    }),
  );

function oraclePointKey(point: OraclePoint): string {
  return `${point.x},${point.y}`;
}

function oracleEdgeKey(first: OraclePoint, second: OraclePoint): string {
  const firstComesFirst =
    first.x < second.x || (first.x === second.x && first.y <= second.y);
  const earlier = firstComesFirst ? first : second;
  const later = firstComesFirst ? second : first;
  return `${oraclePointKey(earlier)}|${oraclePointKey(later)}`;
}

type OracleRayFacts = Readonly<{
  readonly sight: "clear" | "blocked";
  readonly cover: CoverDegree;
}>;

/** Test-only floating-point supercover oracle; production uses exact BigInt intersections. */
function oracleRayFacts(
  source: OraclePoint,
  target: OraclePoint,
  cells: ReadonlySet<string>,
  boundaries: ReadonlyArray<ArenaDefinition["boundaries"][number]>,
): OracleRayFacts {
  const touchedEdges = new Set<string>();
  const deltaX = target.x - source.x;
  const deltaY = target.y - source.y;
  const stepX = Math.sign(deltaX);
  const stepY = Math.sign(deltaY);
  const absoluteX = Math.abs(deltaX);
  const absoluteY = Math.abs(deltaY);
  const incrementX = absoluteX === 0 ? Number.POSITIVE_INFINITY : 1 / absoluteX;
  const incrementY = absoluteY === 0 ? Number.POSITIVE_INFINITY : 1 / absoluteY;
  let nextX = absoluteX === 0 ? Number.POSITIVE_INFINITY : 0.5 / absoluteX;
  let nextY = absoluteY === 0 ? Number.POSITIVE_INFINITY : 0.5 / absoluteY;
  let current = source;
  let missingCell = false;

  while (current.x !== target.x || current.y !== target.y) {
    const atCorner = Math.abs(nextX - nextY) < 1e-12;
    if (atCorner) {
      const sideX = { x: current.x + stepX, y: current.y };
      const sideY = { x: current.x, y: current.y + stepY };
      const diagonal = {
        x: current.x + stepX,
        y: current.y + stepY,
      };
      touchedEdges.add(oracleEdgeKey(current, sideX));
      touchedEdges.add(oracleEdgeKey(current, sideY));
      touchedEdges.add(oracleEdgeKey(sideX, diagonal));
      touchedEdges.add(oracleEdgeKey(sideY, diagonal));
      missingCell =
        missingCell ||
        !cells.has(oraclePointKey(sideX)) ||
        !cells.has(oraclePointKey(sideY)) ||
        !cells.has(oraclePointKey(diagonal));
      current = diagonal;
      nextX += incrementX;
      nextY += incrementY;
      continue;
    }

    if (nextX < nextY) {
      const next = { x: current.x + stepX, y: current.y };
      touchedEdges.add(oracleEdgeKey(current, next));
      missingCell = missingCell || !cells.has(oraclePointKey(next));
      current = next;
      nextX += incrementX;
      continue;
    }

    const next = { x: current.x, y: current.y + stepY };
    touchedEdges.add(oracleEdgeKey(current, next));
    missingCell = missingCell || !cells.has(oraclePointKey(next));
    current = next;
    nextY += incrementY;
  }

  const sightBlockedByBoundary = boundaries.some(
    (boundary) =>
      boundary.sight === "blocked" &&
      touchedEdges.has(oracleEdgeKey(boundary.between[0], boundary.between[1])),
  );
  const coverRanks = {
    none: 0,
    half: 1,
    "three-quarters": 2,
    total: 3,
  } as const;
  const cover = boundaries.reduce<CoverDegree>((highest, boundary) => {
    if (
      !touchedEdges.has(oracleEdgeKey(boundary.between[0], boundary.between[1]))
    ) {
      return highest;
    }
    return coverRanks[boundary.cover.degree] > coverRanks[highest]
      ? boundary.cover.degree
      : highest;
  }, "none");
  return {
    sight: sightBlockedByBoundary || missingCell ? "blocked" : "clear",
    cover,
  };
}

function oracleSlopeDefinition(example: {
  readonly source: OraclePoint;
  readonly target: OraclePoint;
  readonly edgeFacts: readonly {
    readonly present: boolean;
    readonly sight: "open" | "blocked";
    readonly cover: CoverDegree;
  }[];
}): ArenaDefinition {
  const cellsByKey = new Map<string, OraclePoint>();
  const addCell = (point: OraclePoint): void => {
    cellsByKey.set(oraclePointKey(point), point);
  };
  addCell(example.source);
  addCell(example.target);
  const boundaries = oracleGridEdges.flatMap((edge, index) => {
    const facts = example.edgeFacts[index];
    if (!facts.present) {
      return [];
    }
    addCell(edge[0]);
    addCell(edge[1]);
    return [
      boundary(edge[0], edge[1], {
        sight: facts.sight,
        cover: facts.cover,
      }),
    ];
  });
  return {
    cells: Array.from(cellsByKey.values()).map((point) => ({
      ...point,
      terrain: "ordinary" as const,
    })),
    boundaries,
  };
}

describe("public property seam", () => {
  it("preserves generated authored cells in deterministic snapshots", () => {
    fc.assert(
      fc.property(validArenaDefinitionArbitrary, (definition) => {
        const firstParsed = parseArena(definition);
        expect(firstParsed.tag).toBe("ok");
        if (firstParsed.tag === "error") {
          return;
        }
        const firstSnapshot = arenaSnapshot(firstParsed.value);
        const cellsByCoordinate = new Map(
          definition.cells.map((cell) => [`${cell.x},${cell.y}`, cell.terrain]),
        );
        expect(firstSnapshot.cells).toHaveLength(definition.cells.length);
        const snapshotCellsByCoordinate = new Map(
          firstSnapshot.cells.map((cell) => [
            `${cell.coordinate.x},${cell.coordinate.y}`,
            cell.terrain,
          ]),
        );
        expect(snapshotCellsByCoordinate).toEqual(cellsByCoordinate);
        for (const cell of firstSnapshot.cells) {
          expect(
            cellsByCoordinate.get(`${cell.coordinate.x},${cell.coordinate.y}`),
          ).toBe(cell.terrain);
        }
        const secondParsed = parseArena({
          cells: [...definition.cells].reverse(),
          boundaries: [],
        });
        expect(secondParsed.tag).toBe("ok");
        if (secondParsed.tag === "error") {
          return;
        }
        const secondSnapshot = arenaSnapshot(secondParsed.value);
        expect(secondSnapshot).toEqual(firstSnapshot);
        expect(secondSnapshot.fingerprint).toBe(firstSnapshot.fingerprint);
      }),
      { numRuns: 40 },
    );
  });

  it("preserves generated authored cells and static boundaries", () => {
    fc.assert(
      fc.property(cornerArenaDefinitionArbitrary, (definition) => {
        const parsed = parseArena(definition);
        expect(parsed.tag).toBe("ok");
        if (parsed.tag === "error") {
          return;
        }
        const view = arenaSnapshot(parsed.value);
        expect(view.cells).toHaveLength(definition.cells.length);
        expect(view.boundaries).toHaveLength(definition.boundaries.length);
        for (const authored of definition.boundaries) {
          const [first, second] = authored.between;
          const normalized = view.boundaries.find(
            (candidate) =>
              candidate.between.some(
                (coordinate) =>
                  coordinate.x === first.x && coordinate.y === first.y,
              ) &&
              candidate.between.some(
                (coordinate) =>
                  coordinate.x === second.x && coordinate.y === second.y,
              ),
          );
          expect(normalized).toEqual(
            expect.objectContaining({
              traversal: authored.traversal,
              sight: authored.sight,
              cover: authored.cover,
            }),
          );
        }
        expect(JSON.parse(JSON.stringify(view))).toEqual(view);
      }),
      { numRuns: 30 },
    );
  });

  it("keeps generated arenas immutable after raw definitions are mutated", () => {
    fc.assert(
      fc.property(cornerArenaDefinitionArbitrary, (definition) => {
        const rawCells = definition.cells.map((cell) => ({ ...cell }));
        const rawBoundaries = definition.boundaries.map((boundary) => ({
          ...boundary,
          between: boundary.between.map((coordinate) => ({ ...coordinate })),
        }));
        const parsed = parseArena({
          cells: rawCells,
          boundaries: rawBoundaries,
        });
        expect(parsed.tag).toBe("ok");
        if (parsed.tag === "error") {
          return;
        }
        const before = arenaSnapshot(parsed.value);
        rawCells[0].x += 100;
        rawCells[0].terrain =
          rawCells[0].terrain === "ordinary" ? "difficult" : "ordinary";
        rawBoundaries[0].between[0].x += 100;
        expect(arenaSnapshot(parsed.value)).toEqual(before);
      }),
      { numRuns: 40 },
    );
  });

  it("aggregates independently malformed cell and boundary facts", () => {
    const malformedDefinitionArbitrary = fc
      .record({
        badCellCoordinate: fc.boolean(),
        badTerrain: fc.boolean(),
        badBoundaryShape: fc.boolean(),
        badTraversal: fc.boolean(),
        badSight: fc.boolean(),
        badCover: fc.boolean(),
      })
      .filter((flags) => Object.values(flags).some(Boolean));
    fc.assert(
      fc.property(malformedDefinitionArbitrary, (flags) => {
        const cells: unknown[] = [
          {
            x: 0,
            y: 0,
            terrain: flags.badTerrain ? "unknown" : "ordinary",
          },
          { x: 1, y: 0, terrain: "ordinary" },
        ];
        if (flags.badCellCoordinate) {
          cells.push({ x: Number.NaN, y: 1, terrain: "ordinary" });
        }
        const validBoundary = {
          between: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
          ],
          traversal: flags.badTraversal ? "unknown" : "open",
          sight: flags.badSight ? "unknown" : "open",
          cover: flags.badCover ? "unknown" : "none",
        };
        const boundaries: unknown[] = flags.badBoundaryShape
          ? [{ between: [{ x: 0, y: 0 }] }, validBoundary]
          : [validBoundary];
        const parsed = parseArena({ cells, boundaries });
        expect(parsed.tag).toBe("error");
        if (parsed.tag === "ok") {
          throw new Error("malformed arena unexpectedly parsed successfully");
        }
        const tags = parsed.issues.map((issue) => issue.tag);
        const expected = [
          flags.badCellCoordinate ? "invalid-cell-coordinate" : undefined,
          flags.badTerrain ? "invalid-terrain" : undefined,
          flags.badBoundaryShape ? "invalid-boundary-shape" : undefined,
          flags.badTraversal ? "invalid-traversal" : undefined,
          flags.badSight ? "invalid-sight" : undefined,
          flags.badCover ? "invalid-cover" : undefined,
        ].filter((tag): tag is string => tag !== undefined);
        expect(tags).toEqual(expect.arrayContaining(expected));
      }),
      { numRuns: 40 },
    );
  });

  it("keeps overlap and occupant completeness for generated placements", () => {
    fc.assert(
      fc.property(
        fc.array(smallCoordinateArbitrary, { minLength: 3, maxLength: 3 }),
        (coordinates) => {
          const map = arena(squareDefinition(2, 2));
          const ids = ["alpha", "beta", "gamma"];
          const state = ids.reduce(
            (current, id, index) => place(current, id, coordinates[index]),
            createState(map),
          );
          for (const coordinate of [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            { x: 1, y: 1 },
          ]) {
            const expected = ids
              .filter(
                (_, index) =>
                  coordinates[index].x === coordinate.x &&
                  coordinates[index].y === coordinate.y,
              )
              .map(token)
              .sort();
            expect(value(occupantQuery(state, coordinate))).toEqual(expected);
          }
        },
      ),
      { numRuns: 30 },
    );
  });

  it("keeps Cover and sight independent and symmetric for generated corners", () => {
    fc.assert(
      fc.property(cornerArenaDefinitionArbitrary, (definition) => {
        const map = arena(definition);
        const state = place(
          place(createState(map), "source", { x: 0, y: 0 }),
          "target",
          { x: 1, y: 1 },
        );
        const before = snapshot(state);
        const forward = value(
          relationBetween(state, token("source"), token("target")),
        );
        const reverse = value(
          relationBetween(state, token("target"), token("source")),
        );
        const expectedSight = definition.boundaries.some(
          (fact) => fact.sight === "blocked",
        )
          ? "blocked"
          : "clear";
        const coverRanks = {
          none: 0,
          half: 1,
          "three-quarters": 2,
          total: 3,
        } as const;
        const expectedCover = definition.boundaries.reduce<CoverDegree>(
          (highest, fact) =>
            coverRanks[fact.cover.degree] > coverRanks[highest]
              ? fact.cover.degree
              : highest,
          "none" as const,
        );
        expect(forward.sight).toBe(expectedSight);
        expect(forward.cover).toBe(expectedCover);
        expect(reverse.sight).toBe(forward.sight);
        expect(reverse.cover).toBe(forward.cover);
        expect(snapshot(state)).toEqual(before);
      }),
      { numRuns: 30 },
    );
  });

  it("matches an independent supercover oracle for generated rational slopes", () => {
    fc.assert(
      fc.property(oracleSlopeExampleArbitrary, (example) => {
        const definition = oracleSlopeDefinition(example);
        const map = arena(definition);
        const state = place(
          place(createState(map), "source", example.source),
          "target",
          example.target,
        );
        const cellKeys = new Set(
          definition.cells.map((cell) => `${cell.x},${cell.y}`),
        );
        const forwardExpected = oracleRayFacts(
          example.source,
          example.target,
          cellKeys,
          definition.boundaries,
        );
        const reverseExpected = oracleRayFacts(
          example.target,
          example.source,
          cellKeys,
          definition.boundaries,
        );
        const forward = value(
          relationBetween(state, token("source"), token("target")),
        );
        const reverse = value(
          relationBetween(state, token("target"), token("source")),
        );
        expect(forward.sight).toBe(forwardExpected.sight);
        expect(forward.cover).toBe(forwardExpected.cover);
        expect(reverse.sight).toBe(reverseExpected.sight);
        expect(reverse.cover).toBe(reverseExpected.cover);
        expect(reverse.sight).toBe(forward.sight);
        expect(reverse.cover).toBe(forward.cover);
      }),
      { numRuns: 40 },
    );
  });

  it("keeps direct distance symmetric and relation rendering nonmutating", () => {
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
        const equivalentArena = arena({
          cells: [...definition.cells].reverse(),
          boundaries: [],
        });
        const equivalentState = place(
          place(createState(equivalentArena), "first", firstCoordinate),
          "second",
          secondCoordinate,
        );
        const equivalentForward = value(
          relationBetween(equivalentState, token("first"), token("second")),
        );
        const before = snapshot(state);
        expect(forward.distanceFeet).toBe(reverse.distanceFeet);
        expect(renderRelation(forward)).toBe(renderRelation(equivalentForward));
        expect(snapshot(state)).toEqual(before);
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
        const expectedStepCount = Math.max(
          Math.abs(example.destinationX - example.sourceX),
          Math.abs(example.destinationY - example.sourceY),
        );
        expect(result.value.steps).toHaveLength(expectedStepCount);
        if (expectedStepCount === 0) {
          expect(result.value.steps).toEqual([]);
          expect(result.value.distanceFeet).toBe(0);
        } else {
          expect(result.value.steps[0].from).toEqual({
            x: example.sourceX,
            y: example.sourceY,
          });
          expect(result.value.steps[result.value.steps.length - 1].to).toEqual({
            x: example.destinationX,
            y: example.destinationY,
          });
          expect(result.value.distanceFeet).toBe(
            expectedStepCount * CELL_SIZE_FEET,
          );
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

  it("replays generated routes deterministically and accepts every returned step", () => {
    const routeExampleArbitrary = fc
      .record({
        width: fc.integer({ min: 2, max: 4 }),
        height: fc.integer({ min: 2, max: 4 }),
      })
      .map(({ width, height }) => ({ width, height }));
    fc.assert(
      fc.property(routeExampleArbitrary, ({ width, height }) => {
        const map = arena(squareDefinition(width, height));
        const state = place(createState(map), "mover", { x: 0, y: 0 });
        const before = snapshot(state);
        const first = routePlan(
          state,
          token("mover"),
          { x: width - 1, y: height - 1 },
          physicalDistanceEvaluator,
        );
        const replay = routePlan(
          state,
          token("mover"),
          { x: width - 1, y: height - 1 },
          physicalDistanceEvaluator,
        );
        expect(first).toEqual(replay);
        expect(snapshot(state)).toEqual(before);
        expect(first.tag).toBe("ok");
        if (first.tag === "error") {
          return;
        }
        for (const step of first.value.steps) {
          const stepState = place(createState(map), "mover", step.from);
          const preview = stepPreview(
            stepState,
            token("mover"),
            step.to,
            physicalDistanceEvaluator,
          );
          expect(preview.tag).toBe("ok");
          if (preview.tag === "ok") {
            expect(preview.value.step).toEqual(step);
          }
        }
      }),
      { numRuns: 25 },
    );
  });

  it("keeps equal-state fingerprints stable across independently parsed values", () => {
    fc.assert(
      fc.property(validArenaDefinitionArbitrary, (definition) => {
        const firstArena = arena(definition);
        const secondArena = arena({
          cells: [...definition.cells].reverse(),
          boundaries: [],
        });
        const firstState = place(
          place(createState(firstArena), "first", definition.cells[0]),
          "second",
          definition.cells[1],
        );
        const secondState = place(
          place(createState(secondArena), "first", definition.cells[0]),
          "second",
          definition.cells[1],
        );
        expect(snapshot(firstState).fingerprint).toBe(
          snapshot(secondState).fingerprint,
        );
      }),
      { numRuns: 30 },
    );
  });

  it("rejects equal-revision sibling previews with a precise stale cause", () => {
    fc.assert(
      fc.property(fc.constantFrom({ x: 0, y: 0 }, { x: 1, y: 0 }), (origin) => {
        const map = arena(squareDefinition(2, 1));
        const alternate = origin.x === 0 ? { x: 1, y: 0 } : { x: 0, y: 0 };
        const first = place(createState(map), "mover", origin);
        const sibling = place(createState(map), "mover", alternate);
        const preview = stepPreview(
          first,
          token("mover"),
          alternate,
          physicalDistanceEvaluator,
        );
        expect(preview.tag).toBe("ok");
        if (preview.tag === "error") {
          return;
        }
        const stale = commitPreview(sibling, preview.value);
        expect(stale.tag).toBe("error");
        if (stale.tag === "error" && stale.error.tag === "stale-preview") {
          expect(stale.error.expectedRevision).toBe(stale.error.actualRevision);
          expect(stale.error.cause).toEqual({
            tag: "mover-origin-changed",
            mover: token("mover"),
            expected: origin,
            actual: alternate,
          });
        }
      }),
      { numRuns: 20 },
    );
  });

  it("commits one mover frame, advances once, stales after every successful change, and replays history", () => {
    fc.assert(
      fc.property(
        fc.constantFrom({ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }),
        (destination) => {
          const map = arena(squareDefinition(2, 2));
          const initial = place(
            place(createState(map), "mover", { x: 0, y: 0 }),
            "other",
            { x: 0, y: 1 },
          );
          const before = snapshot(initial);
          const preview = stepPreview(
            initial,
            token("mover"),
            destination,
            physicalDistanceEvaluator,
          );
          expect(preview.tag).toBe("ok");
          if (preview.tag === "error") {
            return;
          }
          const committed = commitPreview(initial, preview.value);
          expect(committed.tag).toBe("ok");
          if (committed.tag === "error") {
            return;
          }
          expect(snapshot(committed.value).revision).toBe(before.revision + 1);
          expect(
            value(placementOf(committed.value, token("other"))).coordinate,
          ).toEqual({ x: 0, y: 1 });
          expect(snapshot(initial)).toEqual(before);
          const changed = place(initial, "changed", { x: 1, y: 1 });
          const stale = commitPreview(changed, preview.value);
          expect(stale.tag).toBe("error");
          if (stale.tag === "error") {
            expect(stale.error.tag).toBe("stale-preview");
          }
          const removed = removeToken(initial, token("other"));
          expect(removed.tag).toBe("ok");
          if (removed.tag === "ok") {
            expect(snapshot(removed.value).revision).toBe(before.revision + 1);
            const removedStale = commitPreview(removed.value, preview.value);
            expect(removedStale.tag).toBe("error");
            if (removedStale.tag === "error") {
              expect(removedStale.error.tag).toBe("stale-preview");
              if (removedStale.error.tag === "stale-preview") {
                expect(removedStale.error.cause).toEqual({
                  tag: "state-changed",
                });
              }
            }
          }
          const replay = commitPreview(initial, preview.value);
          expect(replay.tag).toBe("ok");
          if (replay.tag === "ok") {
            expect(snapshot(replay.value)).toEqual(snapshot(committed.value));
          }
        },
      ),
      { numRuns: 20 },
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
