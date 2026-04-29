import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
  type StatBlockCatalog,
  type StatBlockCatalogBuildIssue,
} from "@dnd/surface/surface/stat-block-catalog";
import {
  buildUnitCatalog,
  srdUnitCollection,
  type UnitCatalog,
  type UnitCatalogBuildIssue,
} from "@dnd/surface/surface/unit-catalog";

import {
  createGreenMcpSessionStore,
  type GreenMcpSessionStore,
} from "./session-store.ts";

export type GreenMcpCompositionRoot = {
  readonly unitLibrary: UnitCatalog;
  readonly statBlockCatalog: StatBlockCatalog;
  readonly sessionStore: GreenMcpSessionStore;
};

export function createGreenMcpCompositionRoot(): GreenMcpCompositionRoot {
  const unitCatalog = buildUnitCatalog({
    collections: [srdUnitCollection],
  });
  if (unitCatalog.tag === "invalid") {
    throw new Error(
      `Invalid SRD Unit library for MCP green root: ${formatBuildIssues(
        unitCatalog.issues,
      )}`,
    );
  }

  const statBlockCatalog = buildStatBlockCatalog({
    collections: [srdStatBlockCollection],
  });
  if (statBlockCatalog.tag === "invalid") {
    throw new Error(
      `Invalid SRD Stat Block catalog for MCP green root: ${formatBuildIssues(
        statBlockCatalog.issues,
      )}`,
    );
  }

  return {
    unitLibrary: unitCatalog.catalog,
    statBlockCatalog: statBlockCatalog.catalog,
    sessionStore: createGreenMcpSessionStore(statBlockCatalog.catalog),
  };
}

function formatBuildIssues(
  issues: readonly (UnitCatalogBuildIssue | StatBlockCatalogBuildIssue)[],
) {
  return JSON.stringify(issues);
}
