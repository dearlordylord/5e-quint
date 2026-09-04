import { readFileSync } from "node:fs";
import { dirname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { combatantId } from "@dnd/battle-runtime/consumer-protocol";
import { statBlockId } from "@dnd/shared/game-facts";
import { describe, expect, test } from "vitest";

import * as packageRoot from "./index.ts";
import {
  characterSheetBattleInit,
  characterSheetBattleInitWithRoute,
  composeBattleRoster,
} from "./source-free-construction.ts";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packagesDirectory = resolve(packageDirectory, "..");
const moduleSpecifierPattern =
  /\b(?:from\s+|import\s*(?:\(\s*)?)["']([^"']+)["']/g;

function workspaceModulePath(
  importerPath: string,
  specifier: string,
): string | undefined {
  if (specifier.startsWith(".")) {
    return normalize(resolve(dirname(importerPath), specifier));
  }
  if (!specifier.startsWith("@dnd/")) return undefined;

  const [scope, packageName, ...subpathParts] = specifier.split("/");
  const dependencyDirectory = join(packagesDirectory, packageName ?? "");
  const packageJson: unknown = JSON.parse(
    readFileSync(join(dependencyDirectory, "package.json"), "utf8"),
  );
  const exportName =
    subpathParts.length === 0 ? "." : `./${subpathParts.join("/")}`;
  const exports =
    typeof packageJson === "object" &&
    packageJson !== null &&
    "exports" in packageJson &&
    typeof packageJson.exports === "object" &&
    packageJson.exports !== null
      ? packageJson.exports
      : undefined;
  const target =
    exports === undefined ? undefined : Reflect.get(exports, exportName);
  if (scope !== "@dnd" || typeof target !== "string") {
    throw new Error(`Unresolved workspace module ${specifier}.`);
  }
  return normalize(resolve(dependencyDirectory, target));
}

function sourceFreeWorkspaceGraph(entryPath: string): readonly string[] {
  const pending = [entryPath];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const modulePath = pending.pop();
    if (modulePath === undefined || visited.has(modulePath)) continue;
    visited.add(modulePath);
    const source = readFileSync(modulePath, "utf8").replace(
      /\b(?:import|export)\s+type\b[\s\S]*?\bfrom\s+["'][^"']+["'];?/g,
      "",
    );
    for (const match of source.matchAll(moduleSpecifierPattern)) {
      const specifier = match[1];
      if (specifier === undefined) continue;
      expect(specifier).not.toBe("@dnd/character-sheet-runtime");
      expect(specifier).not.toBe("@dnd/battle-runtime");
      const dependencyPath = workspaceModulePath(modulePath, specifier);
      if (dependencyPath !== undefined) pending.push(dependencyPath);
    }
  }
  return [...visited];
}

describe("source-free Character Battle construction", () => {
  test("keeps the package root and narrow subpath on one algorithm owner", () => {
    expect(packageRoot.composeBattleRoster).toBe(composeBattleRoster);
    expect(packageRoot.characterSheetBattleInit).toBe(characterSheetBattleInit);
    expect(packageRoot.characterSheetBattleInitWithRoute).toBe(
      characterSheetBattleInitWithRoute,
    );

    expect(
      composeBattleRoster([
        {
          kind: "statBlock",
          source: {
            kind: "missing",
            statBlockId: statBlockId("stat_block_synthetic_missing_roster"),
            combatantId: combatantId("combatant:synthetic-missing-roster"),
          },
        },
      ]),
    ).toEqual({
      tag: "rejected",
      admissions: [],
      issues: [
        {
          kind: "statBlockSourceUnavailable",
          index: 0,
          statBlockId: statBlockId("stat_block_synthetic_missing_roster"),
          combatantId: combatantId("combatant:synthetic-missing-roster"),
        },
      ],
    });
  });

  test("does not traverse runtime roots or eager Surface catalog data", () => {
    const graph = sourceFreeWorkspaceGraph(
      join(packageDirectory, "src/source-free-construction.ts"),
    );
    expect(graph).not.toContain(join(packageDirectory, "src/index.ts"));
    expect(
      graph.filter(
        (modulePath) =>
          modulePath.includes("/content/") ||
          modulePath.endsWith("/surface-catalog.ts") ||
          modulePath.endsWith("/unit-catalog-data.ts") ||
          modulePath.endsWith("/stat-block-catalog-data.ts"),
      ),
    ).toEqual([]);
  });
});
