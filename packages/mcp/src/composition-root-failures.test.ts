import { describe, expect, test, vi } from "vitest";
import type {
  SrdStatBlockCollection,
  StatBlockCatalog,
} from "@dnd/surface/surface/stat-block-catalog";
import type {
  SrdUnitCollection,
  UnitCatalog,
} from "@dnd/surface/surface/unit-catalog";
import { createMcpCompositionRoot } from "./composition-root.ts";

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

vi.mock("@dnd/surface/surface/stat-block-catalog", () => {
  const emptyStatBlockCatalog = {
    getStatBlock: () => {
      throw new Error("Synthetic empty Stat Block catalog has no Stat Blocks");
    },
    listStatBlocks: () => [],
    requireStatBlock: (id) => {
      throw new Error(
        `Synthetic empty Stat Block catalog has no Stat Block ${id}`,
      );
    },
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

describe("MCP canonical catalog composition failures", () => {
  test("reports an invalid canonical Unit catalog", () => {
    catalogFailure.invalidCatalog = "unit";

    expect(() => createMcpCompositionRoot()).toThrow(
      "Invalid SRD Unit catalog for MCP root",
    );
  });

  test("reports an invalid canonical Stat Block catalog", () => {
    catalogFailure.invalidCatalog = "statBlock";

    expect(() => createMcpCompositionRoot()).toThrow(
      "Invalid SRD Stat Block catalog for MCP root",
    );
  });
});
