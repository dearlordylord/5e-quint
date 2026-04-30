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
  createMcpSessionStore,
  type McpSessionStore,
} from "./session-store.ts";

export type McpCompositionRoot = {
  readonly unitLibrary: UnitCatalog;
  readonly statBlockCatalog: StatBlockCatalog;
  readonly sessionStore: McpSessionStore;
};

export function createMcpCompositionRoot(): McpCompositionRoot {
  const unitCatalog = buildUnitCatalog({
    collections: [srdUnitCollection],
  });
  if (unitCatalog.tag === "invalid") {
    throw new Error(
      `Invalid SRD Unit catalog for MCP root: ${formatBuildIssues(
        unitCatalog.issues,
      )}`,
    );
  }

  const statBlockCatalog = buildStatBlockCatalog({
    collections: [srdStatBlockCollection],
  });
  if (statBlockCatalog.tag === "invalid") {
    throw new Error(
      `Invalid SRD Stat Block catalog for MCP root: ${formatBuildIssues(
        statBlockCatalog.issues,
      )}`,
    );
  }

  return {
    unitLibrary: unitCatalog.catalog,
    statBlockCatalog: statBlockCatalog.catalog,
    sessionStore: createMcpSessionStore(statBlockCatalog.catalog),
  };
}

function formatBuildIssues(
  issues: readonly (UnitCatalogBuildIssue | StatBlockCatalogBuildIssue)[],
) {
  return JSON.stringify(issues);
}
