import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { buildSync } from "esbuild";
import { describe, expect, it } from "vitest";

import {
  assertSharedPackageEffectRuntime,
  resolvePackageEffectRuntimePaths,
  validatedPackageEffectRuntimeBundleDefine,
} from "./package-effect-runtime.ts";

describe("package-owned Effect runtime", () => {
  it.each([
    { packageOwner: "Surface", packageDirectory: "/repo/packages/surface" },
    {
      packageOwner: "Battle Runtime",
      packageDirectory: "/repo/packages/battle-runtime",
    },
  ])(
    "requires Effect and SchemaAST to resolve inside the $packageOwner package install",
    ({ packageOwner, packageDirectory }) => {
      const localEffectDirectory = `/store/${packageOwner.toLowerCase().replaceAll(" ", "-")}-effect`;
      const realpath = (candidate: string): string =>
        candidate === `${packageDirectory}/node_modules/effect`
          ? localEffectDirectory
          : candidate;
      const effectEntry = (
        directory: string,
        specifier: "effect" | "effect/SchemaAST",
      ): string =>
        `${directory}/dist/${specifier === "effect" ? "index" : "SchemaAST"}.js`;

      expect(
        resolvePackageEffectRuntimePaths({
          packageOwner,
          packageDirectory,
          resolveModule: (specifier) =>
            effectEntry(
              localEffectDirectory,
              specifier === "effect" ? "effect" : "effect/SchemaAST",
            ),
          realpath,
        }),
      ).toEqual({
        packageOwner,
        effectDirectory: localEffectDirectory,
        effectEntry: `${localEffectDirectory}/dist/index.js`,
        schemaAstEntry: `${localEffectDirectory}/dist/SchemaAST.js`,
      });

      for (const fallbackSpecifier of ["effect", "effect/SchemaAST"] as const) {
        expect(() =>
          resolvePackageEffectRuntimePaths({
            packageOwner,
            packageDirectory,
            resolveModule: (specifier) =>
              effectEntry(
                specifier === fallbackSpecifier
                  ? "/repo/node_modules/effect"
                  : localEffectDirectory,
                specifier === "effect" ? "effect" : "effect/SchemaAST",
              ),
            realpath,
          }),
        ).toThrow(`resolved outside ${localEffectDirectory}`);
      }

      for (const missingSpecifier of ["effect", "effect/SchemaAST"] as const) {
        expect(() =>
          resolvePackageEffectRuntimePaths({
            packageOwner,
            packageDirectory,
            resolveModule: (specifier) => {
              if (specifier === missingSpecifier) {
                throw new Error("missing package entry");
              }
              return effectEntry(localEffectDirectory, specifier);
            },
            realpath,
          }),
        ).toThrow(
          `${packageOwner} package-local ${missingSpecifier} entry is required: missing package entry`,
        );
      }

      expect(() =>
        resolvePackageEffectRuntimePaths({
          packageOwner,
          packageDirectory,
          resolveModule: () => "/repo/node_modules/effect/dist/index.js",
          realpath: () => {
            throw new Error("missing local dependency");
          },
        }),
      ).toThrow(
        `${packageOwner} package-local Effect installation is required at ${packageDirectory}/node_modules/effect: missing local dependency`,
      );
    },
  );

  it("rejects package owners whose Effect or SchemaAST entries are not physically shared", () => {
    const surface = {
      packageOwner: "Surface",
      effectDirectory: "/store/effect-a",
      effectEntry: "/store/effect-a/dist/index.js",
      schemaAstEntry: "/store/effect-a/dist/SchemaAST.js",
    };

    expect(() =>
      assertSharedPackageEffectRuntime([
        surface,
        {
          packageOwner: "Battle Runtime",
          effectDirectory: "/store/effect-b",
          effectEntry: "/store/effect-b/dist/index.js",
          schemaAstEntry: "/store/effect-b/dist/SchemaAST.js",
        },
      ]),
    ).toThrow("Battle Runtime Effect runtime does not match Surface");

    expect(() =>
      assertSharedPackageEffectRuntime([
        surface,
        {
          ...surface,
          packageOwner: "Battle Runtime",
          schemaAstEntry: "/store/effect-a/dist/other-SchemaAST.js",
        },
      ]),
    ).toThrow("Battle Runtime SchemaAST entry does not match Surface");
  });

  it("preserves the validated runtime when a package-schema consumer is relocated", () => {
    const directory = mkdtempSync(
      join(tmpdir(), "dnd-package-effect-runtime-"),
    );
    const output = join(directory, "consumer.mjs");
    try {
      buildSync({
        stdin: {
          contents: `import { effectRuntimeForPackageOwners } from ${JSON.stringify(resolve("scripts/package-effect-runtime.ts"))};
const { Schema, Result } = effectRuntimeForPackageOwners(["surface", "battle-runtime"]).effect;
const decoded = Schema.decodeUnknownResult(Schema.Struct({ value: Schema.Literal("ok") }))({ value: "ok" });
if (Result.isFailure(decoded)) throw new Error(decoded.failure.message);
console.log(decoded.success.value);`,
          resolveDir: process.cwd(),
          sourcefile: "package-effect-runtime-consumer.ts",
          loader: "ts",
        },
        outfile: output,
        bundle: true,
        platform: "node",
        format: "esm",
        target: "node24",
        define: validatedPackageEffectRuntimeBundleDefine([
          "surface",
          "battle-runtime",
        ]),
        logLevel: "silent",
      });

      expect(
        execFileSync(process.execPath, [output], { encoding: "utf8" }),
      ).toBe("ok\n");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("loads the relocated Raw Swarm supervisor through the validated bundle", () => {
    const directory = mkdtempSync(
      join(tmpdir(), "dnd-package-effect-supervisor-"),
    );
    const output = join(directory, "supervisor.mjs");
    try {
      buildSync({
        entryPoints: [
          resolve("scripts/raw-swarm/sdk-player/supervisor-cli.ts"),
        ],
        outfile: output,
        bundle: true,
        platform: "node",
        format: "esm",
        target: "node24",
        define: validatedPackageEffectRuntimeBundleDefine([
          "surface",
          "battle-runtime",
        ]),
        sourcemap: false,
        logLevel: "silent",
      });

      let stderr = "";
      try {
        execFileSync(process.execPath, [output], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        });
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "stderr" in error &&
          typeof error.stderr === "string"
        ) {
          stderr = error.stderr;
        }
      }
      expect(stderr).toContain(
        "Usage: supervisor.mjs <init|attempt|replay|serve> ...",
      );
      expect(stderr).not.toContain("Dynamic require");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
