import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { buildSync } from "esbuild";
import { describe, expect, it } from "vitest";

import {
  assertSharedPackageEffectRuntime,
  resolvePackageEffectRuntimePaths,
} from "./package-effect-runtime.ts";
import { repoRoot } from "./raw-swarm/transcript.ts";
import {
  buildConsumerDistribution,
  buildPackageEffectRuntimeBundle,
} from "./raw-swarm/sdk-player/consumer-distribution.ts";

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
      buildPackageEffectRuntimeBundle(["surface", "battle-runtime"], {
        stdin: {
          contents: `import { effectRuntimeForPackageOwners } from "#dnd-package-effect-runtime";
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
        logLevel: "silent",
      });

      expect(
        execFileSync(process.execPath, [output], { encoding: "utf8" }),
      ).toBe("ok\n");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("does not accept a forged bundle-validation define", () => {
    const directory = mkdtempSync(join(tmpdir(), "dnd-package-effect-forged-"));
    const output = join(directory, "consumer.mjs");
    try {
      buildSync({
        stdin: {
          contents: `import { effectRuntimeForPackageOwners } from "#dnd-package-effect-runtime";
effectRuntimeForPackageOwners(["surface", "battle-runtime"]);
console.log("forged bypass accepted");`,
          resolveDir: process.cwd(),
          sourcefile: "forged-package-effect-runtime-consumer.ts",
          loader: "ts",
        },
        outfile: output,
        bundle: true,
        platform: "node",
        format: "esm",
        target: "node24",
        define: { PACKAGE_EFFECT_RUNTIME_BUNDLE_VALIDATED: "true" },
        logLevel: "silent",
      });

      const execution = spawnSync(process.execPath, [output], {
        encoding: "utf8",
      });
      expect(execution.status).not.toBe(0);
      expect(execution.stderr).toContain(
        "Workspace package-local Effect installation is required",
      );
      expect(execution.stdout).not.toContain("forged bypass accepted");
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
      buildPackageEffectRuntimeBundle(["surface", "battle-runtime"], {
        entryPoints: [
          resolve("scripts/raw-swarm/sdk-player/supervisor-cli.ts"),
        ],
        outfile: output,
        bundle: true,
        platform: "node",
        format: "esm",
        target: "node24",
        sourcemap: false,
        logLevel: "silent",
      });

      const execution = spawnSync(process.execPath, [output], {
        encoding: "utf8",
      });
      expect(execution.status).not.toBe(0);
      expect(execution.stderr).toContain(
        "Usage: supervisor.mjs <init|attempt|replay|serve> ...",
      );
      expect(execution.stderr).not.toContain("Dynamic require");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it(
    "initializes and replays the relocated Raw Swarm supervisor",
    () => {
      const destination = mkdtempSync(
        join(tmpdir(), "dnd-package-effect-player-"),
      );
      const trustedDestination = mkdtempSync(
        join(tmpdir(), "dnd-package-effect-supervisor-lifecycle-"),
      );
      try {
        buildConsumerDistribution({
          destination,
          trustedDestination,
          scenarioPath: resolve(
            repoRoot,
            "scripts/raw-swarm/sdk-player/test-fixtures/ready-mixed.md",
          ),
          contextDelivery: {
            tag: "canonicalRoleProjection",
            role: "player",
          },
        });
        mkdirSync(join(trustedDestination, "evidence"), { recursive: true });
        copyFileSync(
          resolve(
            repoRoot,
            "scripts/raw-swarm/sdk-player/test-fixtures/ready-fighter.characters.ts",
          ),
          join(trustedDestination, "evidence/characters.ts"),
        );
        copyFileSync(
          resolve(
            repoRoot,
            "scripts/raw-swarm/sdk-player/test-fixtures/table-authored-movement.setup.ts",
          ),
          join(trustedDestination, "evidence/setup.ts"),
        );

        const supervisor = join(trustedDestination, "supervisor.mjs");
        const supervisorEncoding: BufferEncoding = "utf8";
        const supervisorOptions = {
          cwd: trustedDestination,
          env: { ...process.env, RAW_SWARM_PLAYER_ROOT: destination },
          encoding: supervisorEncoding,
        };
        execFileSync(
          process.execPath,
          [
            supervisor,
            "init",
            "package-effect-runtime-lifecycle",
            "a".repeat(40),
            "instructionalFallback",
            "2026-08-21T08:00:00.000Z",
            "b".repeat(64),
            "c".repeat(64),
            "d".repeat(64),
          ],
          supervisorOptions,
        );
        const transcript = readFileSync(
          join(trustedDestination, "evidence/sdk-calls.jsonl"),
          "utf8",
        )
          .trim()
          .split("\n")
          .map((line): unknown => JSON.parse(line));
        expect(transcript).toHaveLength(1);
        expect(
          execFileSync(
            process.execPath,
            [supervisor, "replay"],
            supervisorOptions,
          ),
        ).toContain("0 call(s) matched");
      } finally {
        rmSync(destination, { recursive: true, force: true });
        rmSync(trustedDestination, { recursive: true, force: true });
      }
    },
    10 * 60 * 1_000,
  );
});
