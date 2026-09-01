import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Result } from "effect";
import ts from "typescript";
import { describe, expect, expectTypeOf, test } from "vitest";

import type * as BattleIndex from "@dnd/battle-runtime";
import type * as BattleProtocol from "@dnd/battle-runtime/consumer-protocol";
import type * as CharacterCreationIndex from "@dnd/character-creation-runtime";
import type * as CharacterCreationProtocol from "@dnd/character-creation-runtime/consumer-protocol";
import type * as CharacterSheetIndex from "@dnd/character-sheet-runtime";
import type * as CharacterSheetProtocol from "@dnd/character-sheet-runtime/consumer-protocol";
import type { ResultFailureRefinement } from "./result-failure-refinement.ts";

const repoRoot = resolve(import.meta.dirname, "../../..");

function namedExports(sourcePath: string): ReadonlySet<string> {
  const source = readFileSync(sourcePath, "utf8");
  const sourceFile = ts.createSourceFile(
    sourcePath,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  return new Set(
    sourceFile.statements.flatMap((statement) =>
      ts.isExportDeclaration(statement) &&
      statement.exportClause !== undefined &&
      ts.isNamedExports(statement.exportClause)
        ? statement.exportClause.elements.map((element) => element.name.text)
        : [],
    ),
  );
}

function expectCanonicalProtocolRoot(packageDirectory: string): void {
  const sourceDirectory = resolve(repoRoot, "packages", packageDirectory);
  const protocolPath = resolve(sourceDirectory, "src/consumer-protocol.ts");
  const indexPath = resolve(sourceDirectory, "src/index.ts");
  const protocolExports = namedExports(protocolPath);
  const indexExports = namedExports(indexPath);
  expect(
    [...protocolExports].filter((exportName) => indexExports.has(exportName)),
  ).toEqual([]);
  expect(readFileSync(indexPath, "utf8")).toContain(
    'export * from "./consumer-protocol.ts";',
  );
  expect(
    JSON.parse(readFileSync(resolve(sourceDirectory, "package.json"), "utf8")),
  ).toMatchObject({
    exports: { "./consumer-protocol": "./src/consumer-protocol.ts" },
  });
}

describe("SDK consumer protocol boundaries", () => {
  test("retain canonical helper types without aggregate serialization owners", () => {
    expectTypeOf<BattleProtocol.StartBattle>().toEqualTypeOf<
      typeof BattleIndex.startBattle
    >();
    expectTypeOf<BattleProtocol.BattleInitializationIssueMessage>().toEqualTypeOf<
      typeof BattleIndex.battleInitializationIssueMessage
    >();
    expectTypeOf<typeof BattleProtocol.battleAmmunitionStock>().toEqualTypeOf<
      typeof BattleIndex.battleAmmunitionStock
    >();
    expectTypeOf<
      typeof CharacterCreationProtocol.createCharacterDraft
    >().toEqualTypeOf<typeof CharacterCreationIndex.createCharacterDraft>();
    expectTypeOf<
      typeof CharacterCreationProtocol.finalizeCharacterDraft
    >().toEqualTypeOf<typeof CharacterCreationIndex.finalizeCharacterDraft>();
    expectTypeOf<
      typeof CharacterSheetProtocol.createFreshCharacterSheet
    >().toEqualTypeOf<typeof CharacterSheetIndex.createFreshCharacterSheet>();
    expectTypeOf<
      typeof Result.isFailure
    >().toMatchTypeOf<ResultFailureRefinement>();
    expectCanonicalProtocolRoot("battle-runtime");
    expectCanonicalProtocolRoot("character-creation-runtime");
    expectCanonicalProtocolRoot("character-sheet-runtime");
  });
});
