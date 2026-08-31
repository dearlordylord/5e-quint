import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import * as effect from "effect";
import * as schemaAst from "effect/SchemaAST";

const PACKAGE_EFFECT_OWNER_VALUES = ["surface", "battle-runtime"] as const;
type PackageEffectOwner = (typeof PACKAGE_EFFECT_OWNER_VALUES)[number];

type PackageEffectRuntimePaths = {
  readonly packageOwner: string;
  readonly effectDirectory: string;
  readonly effectEntry: string;
  readonly schemaAstEntry: string;
};

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceDirectory = resolve(scriptsDirectory, "..");
const PACKAGE_EFFECT_OWNERS: Readonly<
  Record<
    PackageEffectOwner,
    { readonly packageOwner: string; readonly packageDirectory: string }
  >
> = {
  surface: {
    packageOwner: "Surface",
    packageDirectory: resolve(workspaceDirectory, "packages/surface"),
  },
  "battle-runtime": {
    packageOwner: "Battle Runtime",
    packageDirectory: resolve(workspaceDirectory, "packages/battle-runtime"),
  },
};

const messageForUnknown = (value: unknown): string =>
  value instanceof Error ? value.message : String(value);

const isWithinDirectory = (directory: string, candidate: string): boolean => {
  const pathFromDirectory = relative(directory, candidate);
  return (
    pathFromDirectory !== ".." &&
    !pathFromDirectory.startsWith(`..${sep}`) &&
    !isAbsolute(pathFromDirectory)
  );
};

export function resolvePackageEffectRuntimePaths(options: {
  readonly packageOwner: string;
  readonly packageDirectory: string;
  readonly resolveModule: (specifier: string) => string;
  readonly realpath: (path: string) => string;
}): PackageEffectRuntimePaths {
  const expectedEffectDirectory = join(
    options.packageDirectory,
    "node_modules/effect",
  );
  const effectDirectory = (() => {
    try {
      return options.realpath(expectedEffectDirectory);
    } catch (error) {
      throw new Error(
        `${options.packageOwner} package-local Effect installation is required at ${expectedEffectDirectory}: ${messageForUnknown(error)}`,
        { cause: error },
      );
    }
  })();

  const resolveEntry = (specifier: "effect" | "effect/SchemaAST"): string => {
    const entry = (() => {
      try {
        return options.realpath(options.resolveModule(specifier));
      } catch (error) {
        throw new Error(
          `${options.packageOwner} package-local ${specifier} entry is required: ${messageForUnknown(error)}`,
          { cause: error },
        );
      }
    })();
    if (!isWithinDirectory(effectDirectory, entry)) {
      throw new Error(
        `${options.packageOwner} package-local ${specifier} entry resolved outside ${effectDirectory}: ${entry}`,
      );
    }
    return entry;
  };

  return {
    packageOwner: options.packageOwner,
    effectDirectory,
    effectEntry: resolveEntry("effect"),
    schemaAstEntry: resolveEntry("effect/SchemaAST"),
  };
}

export function assertSharedPackageEffectRuntime(
  packageRuntimePaths: readonly [
    PackageEffectRuntimePaths,
    ...PackageEffectRuntimePaths[],
  ],
): void {
  const [runtimeOwner, ...otherOwners] = packageRuntimePaths;
  for (const candidate of otherOwners) {
    if (
      candidate.effectDirectory !== runtimeOwner.effectDirectory ||
      candidate.effectEntry !== runtimeOwner.effectEntry
    ) {
      throw new Error(
        `${candidate.packageOwner} Effect runtime does not match ${runtimeOwner.packageOwner}: ${candidate.effectEntry} !== ${runtimeOwner.effectEntry}`,
      );
    }
    if (candidate.schemaAstEntry !== runtimeOwner.schemaAstEntry) {
      throw new Error(
        `${candidate.packageOwner} SchemaAST entry does not match ${runtimeOwner.packageOwner}: ${candidate.schemaAstEntry} !== ${runtimeOwner.schemaAstEntry}`,
      );
    }
  }
}

function validatedPackageEffectRuntimePaths(
  packageOwners: readonly [PackageEffectOwner, ...PackageEffectOwner[]],
): PackageEffectRuntimePaths {
  const workspaceRequire = createRequire(
    join(workspaceDirectory, "package.json"),
  );
  const workspacePaths = resolvePackageEffectRuntimePaths({
    packageOwner: "Workspace",
    packageDirectory: workspaceDirectory,
    resolveModule: workspaceRequire.resolve,
    realpath: realpathSync,
  });
  const packagePaths = packageOwners.map((owner) => {
    if (!PACKAGE_EFFECT_OWNER_VALUES.includes(owner)) {
      throw new Error(`Unknown package Effect runtime owner: ${owner}.`);
    }
    const packageEffectOwner = PACKAGE_EFFECT_OWNERS[owner];
    const requireFromPackage = createRequire(
      join(packageEffectOwner.packageDirectory, "package.json"),
    );
    return resolvePackageEffectRuntimePaths({
      ...packageEffectOwner,
      resolveModule: requireFromPackage.resolve,
      realpath: realpathSync,
    });
  });
  assertSharedPackageEffectRuntime([workspacePaths, ...packagePaths]);
  return workspacePaths;
}

export function validatedPackageEffectRuntimeEntries(
  packageOwners: readonly [PackageEffectOwner, ...PackageEffectOwner[]],
): { readonly effectEntry: string; readonly schemaAstEntry: string } {
  const { effectEntry, schemaAstEntry } =
    validatedPackageEffectRuntimePaths(packageOwners);
  return { effectEntry, schemaAstEntry };
}

export function effectRuntimeForPackageOwners(
  packageOwners: readonly [PackageEffectOwner, ...PackageEffectOwner[]],
): { readonly effect: typeof effect; readonly schemaAst: typeof schemaAst } {
  validatedPackageEffectRuntimePaths(packageOwners);
  return { effect, schemaAst };
}
