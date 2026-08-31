import { afterAll, describe, expect, test, vi } from "vitest";
import type { SrdUnitCollection } from "@dnd/surface/surface/unit-catalog";

vi.mock("@dnd/surface/surface/unit-catalog", () => {
  const emptySrdUnitCollection = {
    kind: "srdUnitCollection",
    provenance: { kind: "srd-5.2.1" },
    units: [],
  } as const satisfies SrdUnitCollection;

  return {
    srdUnitCollection: emptySrdUnitCollection,
    buildUnitCatalog: () =>
      ({
        tag: "invalid",
        issues: [{ tag: "syntheticUnitCatalogIssue" }],
      }) as const,
  };
});

vi.resetModules();
const { createMcpApplicationServices } = await import("./composition-root.ts");

afterAll(() => {
  vi.doUnmock("@dnd/surface/surface/unit-catalog");
  vi.resetModules();
});

describe("MCP canonical catalog composition failures", () => {
  test("reports an invalid canonical Unit catalog", () => {
    expect(() => createMcpApplicationServices()).toThrow(
      "Invalid SRD Unit catalog for MCP application services",
    );
  });
});
