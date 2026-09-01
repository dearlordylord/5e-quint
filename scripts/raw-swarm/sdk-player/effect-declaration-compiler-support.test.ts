import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, test } from "vitest";

import { repoRoot } from "../transcript.ts";
import {
  assertEffectDeclarationCompilerSupport,
  copyEffectDeclarationCompilerSupport,
  EFFECT_DECLARATION_COMPILER_SUPPORT_MANIFEST,
} from "./consumer-distribution.ts";

function filesBelow(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  });
}

test("projects only authentic declaration compiler support", () => {
  const directory = mkdtempSync(join(tmpdir(), "dnd-effect-support-"));
  try {
    copyEffectDeclarationCompilerSupport(directory);
    const compilerSupport = join(directory, "node_modules");
    assertEffectDeclarationCompilerSupport(compilerSupport);
    expect(filesBelow(compilerSupport)).toHaveLength(
      EFFECT_DECLARATION_COMPILER_SUPPORT_MANIFEST.files,
    );
    expect(
      filesBelow(compilerSupport).every(
        (path) =>
          path.endsWith(".d.ts") ||
          path.endsWith(".d.cts") ||
          path.endsWith("/LICENSE") ||
          path.endsWith("/package.json"),
      ),
    ).toBe(true);
    writeFileSync(
      join(directory, "effect-consumer.ts"),
      'import type { Schema } from "effect";\nexport type StringSchema = Schema.Schema<string>;\n',
    );
    writeFileSync(
      join(directory, "tsconfig.json"),
      `${JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "bundler",
          lib: ["ES2022", "ESNext.Disposable", "DOM", "DOM.Iterable"],
          types: [],
          noEmit: true,
          skipLibCheck: false,
          strict: true,
        },
        include: ["effect-consumer.ts"],
      })}\n`,
    );
    execFileSync(
      process.execPath,
      [resolve(repoRoot, "node_modules/typescript/bin/tsc"), "-p", "."],
      { cwd: directory, stdio: "pipe" },
    );
    expect(() =>
      execFileSync(
        process.execPath,
        ["--input-type=module", "--eval", 'await import("effect")'],
        { cwd: directory, stdio: "pipe" },
      ),
    ).toThrow();
    rmSync(join(compilerSupport, "effect"), { recursive: true });
    expect(() =>
      execFileSync(
        process.execPath,
        [resolve(repoRoot, "node_modules/typescript/bin/tsc"), "-p", "."],
        { cwd: directory, stdio: "pipe" },
      ),
    ).toThrow();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
