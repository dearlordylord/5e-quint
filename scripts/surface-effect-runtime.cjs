const { realpathSync } = require("node:fs");
const { createRequire } = require("node:module");
const path = require("node:path");

const messageForUnknown = (value) =>
  value instanceof Error ? value.message : String(value);

const isWithinDirectory = (directory, candidate) => {
  const pathFromDirectory = path.relative(directory, candidate);
  return (
    pathFromDirectory !== ".." &&
    !pathFromDirectory.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(pathFromDirectory)
  );
};

function resolveSurfaceEffectRuntimePaths({
  surfacePackageDirectory,
  resolveModule,
  realpath,
}) {
  const expectedEffectDirectory = path.join(
    surfacePackageDirectory,
    "node_modules/effect",
  );
  const effectDirectory = (() => {
    try {
      return realpath(expectedEffectDirectory);
    } catch (error) {
      throw new Error(
        `Surface package-local Effect installation is required at ${expectedEffectDirectory}: ${messageForUnknown(error)}`,
        { cause: error },
      );
    }
  })();

  const resolveEntry = (specifier) => {
    const entry = (() => {
      try {
        return realpath(resolveModule(specifier));
      } catch (error) {
        throw new Error(
          `Surface package-local ${specifier} entry is required: ${messageForUnknown(error)}`,
          { cause: error },
        );
      }
    })();
    if (!isWithinDirectory(effectDirectory, entry)) {
      throw new Error(
        `Surface package-local ${specifier} entry resolved outside ${effectDirectory}: ${entry}`,
      );
    }
    return entry;
  };

  return {
    effectDirectory,
    effectEntry: resolveEntry("effect"),
    schemaAstEntry: resolveEntry("effect/SchemaAST"),
  };
}

const surfacePackageDirectory = path.resolve(__dirname, "../packages/surface");
const requireFromSurface = createRequire(
  path.join(surfacePackageDirectory, "package.json"),
);
resolveSurfaceEffectRuntimePaths({
  surfacePackageDirectory,
  resolveModule: requireFromSurface.resolve,
  realpath: realpathSync,
});

module.exports = {
  resolveSurfaceEffectRuntimePaths,
  surfaceEffect: requireFromSurface("effect"),
  surfaceSchemaAst: requireFromSurface("effect/SchemaAST"),
};
