const { spawnSync } = require("node:child_process");
const { realpathSync, statSync } = require("node:fs");

const TRUSTED_C_COMPILER_PATH = "/usr/bin/cc";
const TRUSTED_COMPILER_DIRECTORIES = ["/usr/bin/", "/bin/"];
const TRUSTED_COMPILER_ENVIRONMENT = Object.freeze({
  PATH: "/usr/bin:/bin",
  LC_ALL: "C",
  LANG: "C",
});

function resolveTrustedCCompiler() {
  let compilerPath;
  try {
    compilerPath = realpathSync(TRUSTED_C_COMPILER_PATH);
    const compilerStats = statSync(compilerPath);
    if (
      !compilerStats.isFile() ||
      (compilerStats.mode & 0o111) === 0 ||
      !TRUSTED_COMPILER_DIRECTORIES.some((directory) =>
        compilerPath.startsWith(directory),
      )
    ) {
      return {
        ok: false,
        message: `Trusted compiler ${TRUSTED_C_COMPILER_PATH} is not an executable system compiler.`,
      };
    }
  } catch (error) {
    return {
      ok: false,
      message: `Trusted compiler ${TRUSTED_C_COMPILER_PATH} is unavailable: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  return { ok: true, compilerPath };
}

function compileTrustedCSource(sourcePath, binaryPath) {
  const compiler = resolveTrustedCCompiler();
  if (!compiler.ok) return compiler;
  const compilation = spawnSync(
    compiler.compilerPath,
    [
      "-std=c11",
      "-O2",
      "-Wall",
      "-Wextra",
      "-Werror",
      sourcePath,
      "-o",
      binaryPath,
    ],
    {
      env: TRUSTED_COMPILER_ENVIRONMENT,
      stdio: "inherit",
    },
  );
  if (compilation.error !== undefined || compilation.status !== 0) {
    return {
      ok: false,
      message: `Trusted compiler failed for ${sourcePath}: ${compilation.error?.message ?? `exit ${String(compilation.status)}`}`,
    };
  }
  return { ok: true };
}

module.exports = {
  compileTrustedCSource,
};
