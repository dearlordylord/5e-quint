import { afterAll, describe, expect, test, vi } from "vitest";
import { Option } from "effect";
import type {
  SrdStatBlockCollection,
  StatBlockCatalog,
} from "@dnd/surface/surface/installed-srd-stat-block-catalog";
import type {
  SrdUnitCollection,
  UnitCatalog,
} from "@dnd/surface/surface/unit-catalog";

const catalogFailure = vi.hoisted<{
  invalidCatalog: "unit" | "statBlock";
}>(() => ({ invalidCatalog: "unit" }));

vi.mock("@dnd/surface/surface/unit-catalog", () => {
  const emptyUnitCatalog = {
    getUnit: () => {
      throw new Error("Synthetic empty Unit catalog has no Units");
    },
    listUnits: () => [],
    requireUnit: (id) => {
      throw new Error(`Synthetic empty Unit catalog has no Unit ${id}`);
    },
  } satisfies UnitCatalog;
  const emptySrdUnitCollection = {
    kind: "srdUnitCollection",
    provenance: { kind: "srd-5.2.1" },
    units: [],
  } as const satisfies SrdUnitCollection;

  return {
    srdUnitCollection: emptySrdUnitCollection,
    buildUnitCatalog: () =>
      catalogFailure.invalidCatalog === "unit"
        ? {
            tag: "invalid",
            issues: [{ tag: "syntheticUnitCatalogIssue" }],
          }
        : { tag: "ok", catalog: emptyUnitCatalog },
  };
});

vi.mock("@dnd/surface/surface/installed-srd-stat-block-catalog", () => {
  const emptyStatBlockCatalog = {
    getStatBlock: () => Option.none(),
    listStatBlocks: () => [],
  } satisfies StatBlockCatalog;
  const emptySrdStatBlockCollection = {
    kind: "srdStatBlockCollection",
    provenance: { kind: "srd-5.2.1" },
    statBlocks: [],
  } as const satisfies SrdStatBlockCollection;

  return {
    srdStatBlockCollection: emptySrdStatBlockCollection,
    buildStatBlockCatalog: () =>
      catalogFailure.invalidCatalog === "statBlock"
        ? {
            tag: "invalid",
            issues: [{ tag: "syntheticStatBlockCatalogIssue" }],
          }
        : { tag: "ok", catalog: emptyStatBlockCatalog },
  };
});

vi.resetModules();
const { createMcpApplicationServices } = await import("./composition-root.ts");

afterAll(() => {
  vi.doUnmock("@dnd/surface/surface/unit-catalog");
  vi.doUnmock("@dnd/surface/surface/installed-srd-stat-block-catalog");
  vi.resetModules();
});

describe("MCP canonical catalog composition failures", () => {
  test("reports an invalid canonical Unit catalog", () => {
    catalogFailure.invalidCatalog = "unit";

    expect(() => createMcpApplicationServices()).toThrow(
      "Invalid SRD Unit catalog for MCP application services",
    );
  });

  test("reports an invalid canonical Stat Block catalog", () => {
    catalogFailure.invalidCatalog = "statBlock";

    expect(() => createMcpApplicationServices()).toThrow(
      "Invalid SRD Stat Block catalog for MCP application services",
    );
  });
});
