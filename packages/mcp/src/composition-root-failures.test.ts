import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.doUnmock("@dnd/surface/surface/unit-catalog");
  vi.doUnmock("@dnd/surface/surface/stat-block-catalog");
  vi.resetModules();
});

describe("MCP canonical catalog composition failures", () => {
  test("reports an invalid canonical Unit catalog", async () => {
    const actual = await vi.importActual<
      typeof import("@dnd/surface/surface/unit-catalog")
    >("@dnd/surface/surface/unit-catalog");
    vi.doMock("@dnd/surface/surface/unit-catalog", () => ({
      ...actual,
      buildUnitCatalog: () => ({
        tag: "invalid",
        issues: [{ tag: "syntheticUnitCatalogIssue" }],
      }),
    }));
    const { createMcpCompositionRoot } = await import("./composition-root.ts");

    expect(() => createMcpCompositionRoot()).toThrow(
      "Invalid SRD Unit catalog for MCP root",
    );
  }, 10_000);

  test("reports an invalid canonical Stat Block catalog", async () => {
    const actual = await vi.importActual<
      typeof import("@dnd/surface/surface/stat-block-catalog")
    >("@dnd/surface/surface/stat-block-catalog");
    vi.doMock("@dnd/surface/surface/stat-block-catalog", () => ({
      ...actual,
      buildStatBlockCatalog: () => ({
        tag: "invalid",
        issues: [{ tag: "syntheticStatBlockCatalogIssue" }],
      }),
    }));
    const { createMcpCompositionRoot } = await import("./composition-root.ts");

    expect(() => createMcpCompositionRoot()).toThrow(
      "Invalid SRD Stat Block catalog for MCP root",
    );
  }, 10_000);
});
