import { Result } from "effect";
import { describe, expect, it } from "vitest";

import { decodeSrdSurfaceResult } from "@dnd/surface/surface/schema";
import { srdSurface } from "@dnd/surface/surface/surface-catalog";
import {
  buildOracleStartupCatalog,
  encodeOracleStartupSurface,
} from "./oracle-startup-catalog.ts";

describe("Oracle startup catalog", () => {
  it("builds one parsed projection and services from the same bytes", () => {
    const result = buildOracleStartupCatalog(srdSurface);

    expect(Result.isFailure(result)).toBe(false);
    if (Result.isFailure(result)) return;

    const decodedBytes = decodeSrdSurfaceResult(
      JSON.parse(new TextDecoder().decode(result.success.projectionBytes)),
    );
    expect(Result.isSuccess(decodedBytes)).toBe(true);
    if (Result.isFailure(decodedBytes)) return;
    expect(decodedBytes.success).toEqual(result.success.projection);
    expect(encodeOracleStartupSurface(result.success.projection)).toEqual(
      result.success.projectionBytes,
    );
    expect(result.success.services.unitLibrary.listUnits()).toEqual(
      result.success.projection.units,
    );
    expect(result.success.services.statBlockCatalog.listStatBlocks()).toEqual(
      result.success.projection.statBlocks,
    );
  });

  it("keeps every canonical stat block because the Case contract selects any of them", () => {
    const result = buildOracleStartupCatalog(srdSurface);

    expect(Result.isFailure(result)).toBe(false);
    if (Result.isFailure(result)) return;
    expect(result.success.projection.statBlocks).toEqual(srdSurface.statBlocks);
  });

  it("filters the unit aggregate while preserving canonical order", () => {
    const result = buildOracleStartupCatalog(srdSurface);

    expect(Result.isFailure(result)).toBe(false);
    if (Result.isFailure(result)) return;
    expect(result.success.projection.units.length).toBeLessThan(
      srdSurface.units.length,
    );
    let previousIndex = -1;
    for (const unit of result.success.projection.units) {
      const index = srdSurface.units.findIndex(
        (candidate) => candidate.id === unit.id,
      );
      expect(index).toBeGreaterThan(previousIndex);
      previousIndex = index;
    }
  });
});
