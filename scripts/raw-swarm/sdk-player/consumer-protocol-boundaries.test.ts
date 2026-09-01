import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

import { Result } from "effect";
import ts from "typescript";
import { describe, expect, expectTypeOf, test } from "vitest";

import type * as BattleIndex from "../../../packages/battle-runtime/src/index.ts";
import type * as BattleProtocol from "../../../packages/battle-runtime/src/consumer-protocol.ts";
import type * as CharacterCreationIndex from "../../../packages/character-creation-runtime/src/index.ts";
import type * as CharacterCreationProtocol from "../../../packages/character-creation-runtime/src/consumer-protocol.ts";
import type * as CharacterSheetIndex from "../../../packages/character-sheet-runtime/src/index.ts";
import type * as CharacterSheetProtocol from "../../../packages/character-sheet-runtime/src/consumer-protocol.ts";
import type { ResultFailureRefinement } from "./result-failure-refinement.ts";

const repoRoot = resolve(import.meta.dirname, "../../..");

function declarationProtocolSourcePaths(): ReadonlySet<string> {
  const configPath = resolve(
    repoRoot,
    "scripts/raw-swarm/sdk-player/declarations.tsconfig.json",
  );
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error !== undefined) {
    throw new Error(
      ts.flattenDiagnosticMessageText(config.error.messageText, "\n"),
    );
  }
  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    resolve(configPath, ".."),
  );
  const host = ts.createCompilerHost(parsed.options);
  const pending = parsed.fileNames.map((path) => resolve(path));
  const reachable = new Set(pending);
  while (pending.length > 0) {
    const sourcePath = pending.shift();
    if (sourcePath === undefined) break;
    const source = readFileSync(sourcePath, "utf8");
    for (const imported of ts.preProcessFile(source, true, true)
      .importedFiles) {
      const resolved = ts.resolveModuleName(
        imported.fileName,
        sourcePath,
        parsed.options,
        host,
      ).resolvedModule;
      if (resolved === undefined) continue;
      const dependency = resolve(resolved.resolvedFileName);
      if (reachable.has(dependency)) continue;
      reachable.add(dependency);
      pending.push(dependency);
    }
  }
  return new Set(
    [...reachable].map((path) =>
      relative(repoRoot, path).replaceAll("\\", "/"),
    ),
  );
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
    const reachable = declarationProtocolSourcePaths();
    expect(reachable).not.toContain("packages/battle-runtime/src/index.ts");
    expect(reachable).not.toContain(
      "packages/character-creation-runtime/src/index.ts",
    );
    expect(reachable).not.toContain(
      "packages/character-sheet-runtime/src/index.ts",
    );
    expect(reachable).not.toContain(
      "packages/battle-runtime/src/battle-mechanical-frontier.ts",
    );
    expect(reachable).not.toContain(
      "packages/battle-runtime/src/battle-reducer/battle-codecs.ts",
    );
    expect(reachable).not.toContain(
      "packages/battle-runtime/src/battle-snapshot-presentation.ts",
    );
  });
});
