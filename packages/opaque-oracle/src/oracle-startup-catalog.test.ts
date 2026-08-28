import { Either } from "effect";
import { describe, expect, it } from "vitest";

import { decodeSrdSurfaceEither } from "@dnd/surface/surface/schema";
import { srdSurface } from "@dnd/surface/surface/surface-catalog";
import {
  buildOracleStartupCatalog,
  encodeOracleStartupSurface,
} from "./oracle-startup-catalog.ts";

describe("Oracle startup catalog", () => {
  it("builds one parsed projection and services from the same bytes", () => {
    const result = buildOracleStartupCatalog();

    expect(Either.isLeft(result)).toBe(false);
    if (Either.isLeft(result)) return;

    const decodedBytes = decodeSrdSurfaceEither(
      JSON.parse(new TextDecoder().decode(result.right.projectionBytes)),
    );
    expect(Either.isRight(decodedBytes)).toBe(true);
    if (Either.isLeft(decodedBytes)) return;
    expect(decodedBytes.right).toEqual(result.right.projection);
    expect(encodeOracleStartupSurface(result.right.projection)).toEqual(
      result.right.projectionBytes,
    );
    expect(result.right.services.unitLibrary.listUnits()).toEqual(
      result.right.projection.units,
    );
    expect(result.right.services.statBlockCatalog.listStatBlocks()).toEqual(
      result.right.projection.statBlocks,
    );
  });

  it("keeps every canonical stat block because the Case contract selects any of them", () => {
    const result = buildOracleStartupCatalog();

    expect(Either.isLeft(result)).toBe(false);
    if (Either.isLeft(result)) return;
    expect(result.right.projection.statBlocks).toEqual(srdSurface.statBlocks);
  });

  it("filters the unit aggregate while preserving canonical order", () => {
    const result = buildOracleStartupCatalog();

    expect(Either.isLeft(result)).toBe(false);
    if (Either.isLeft(result)) return;
    expect(result.right.projection.units.length).toBeLessThan(
      srdSurface.units.length,
    );
    let previousIndex = -1;
    for (const unit of result.right.projection.units) {
      const index = srdSurface.units.findIndex(
        (candidate) => candidate.id === unit.id,
      );
      expect(index).toBeGreaterThan(previousIndex);
      previousIndex = index;
    }
  });
});
