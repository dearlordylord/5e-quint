const assert = require("node:assert/strict");
const { existsSync, readdirSync, readFileSync } = require("node:fs");
const {
  basename,
  dirname,
  join,
  relative,
  resolve,
  sep,
} = require("node:path");

const {
  CODING_AGENT_EXECUTABLES,
  DETERMINISTIC_BLOCKED_EXECUTABLES,
  DETERMINISTIC_NETWORK_GLOBALS,
  DETERMINISTIC_NETWORK_MODULES,
  DETERMINISTIC_TRANSITIVE_SCAN_BOUNDARIES,
  MODEL_BACKED_OPERATIONS,
  MODEL_BACKED_ENTRYPOINTS,
  MODEL_BACKED_PROFILE_BUDGET_SECONDS,
  MODEL_BACKED_SOURCE_FILES,
  NETWORK_CLI_EXECUTABLES,
  QUALITY_OWNED_DETERMINISTIC_RAW_SWARM_TESTS,
  RAW_SWARM_TESTS_OUTSIDE_QUALITY,
  SUPPORTED_VITEST_SOURCE_FILE_EXTENSIONS,
  isSupportedVitestTestFilename,
} = require("./lane-classification.cjs");

const root = resolve(__dirname, "../..");
const packageJson = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
);

function filesBelow(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() && entry.name !== "node_modules"
      ? filesBelow(path)
      : entry.isDirectory()
        ? []
        : [path];
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const codingAgentAlternation =
  CODING_AGENT_EXECUTABLES.map(escapeRegExp).join("|");
const networkCliAlternation =
  NETWORK_CLI_EXECUTABLES.map(escapeRegExp).join("|");
const blockedExecutableAlternation =
  DETERMINISTIC_BLOCKED_EXECUTABLES.map(escapeRegExp).join("|");
const childProcessCallAlternation =
  "(?:spawn|spawnSync|exec|execSync|execFile|execFileSync|fork)";
const networkModuleAlternation =
  DETERMINISTIC_NETWORK_MODULES.map(escapeRegExp).join("|");
const networkApiAlternation = [
  ...new Set(
    DETERMINISTIC_NETWORK_MODULES.map(
      (moduleName) => moduleName.replace(/^node:/u, "").split("/")[0],
    ),
  ),
]
  .map(escapeRegExp)
  .join("|");
const browserGlobalAlternation = DETERMINISTIC_NETWORK_GLOBALS.filter(
  (name) => name !== "fetch",
)
  .map(escapeRegExp)
  .join("|");

const forbiddenCapabilityPatterns = Object.freeze([
  {
    kind: "network-module",
    pattern: new RegExp(
      String.raw`(?:\bfrom\s*|\bimport\s*\(|\brequire\s*\()\s*["'\`](${networkModuleAlternation})["'\`]`,
      "g",
    ),
  },
  {
    kind: "network-api",
    pattern: new RegExp(
      String.raw`\b(?:${networkApiAlternation})\s*\.\s*(?:request|get|fetch|createConnection|connect|lookup|resolve|createServer|createSocket)\s*\(`,
      "g",
    ),
  },
  {
    kind: "global-fetch",
    pattern: /(?:\bglobalThis\s*\.\s*fetch|\bfetch)\s*\(/g,
  },
  {
    kind: "browser-network-global",
    pattern: new RegExp(
      String.raw`\b(?:new\s+)?(?:${browserGlobalAlternation})\s*(?:\(|\[)|\b(?:globalThis|window)\s*(?:\.\s*(?:${browserGlobalAlternation})|\[\s*["'\`](?:${browserGlobalAlternation})["'\`]\s*\])`,
      "g",
    ),
  },
  {
    kind: "coding-agent-executable",
    pattern: new RegExp(
      `\\b${childProcessCallAlternation}\\s*\\(\\s*["'\`]([^"'\`\\n]*?(?:${codingAgentAlternation})(?:[/\\\\]|["'\`]|\\s))`,
      "gi",
    ),
  },
  {
    kind: "coding-agent-shell-command",
    pattern: new RegExp(
      `\\b(?:exec|execSync)\\s*\\(\\s*["'\`][^"'\`\\n]*\\b(?:${codingAgentAlternation})\\b`,
      "gi",
    ),
  },
  {
    kind: "blocked-custom-executable",
    pattern: new RegExp(
      `\\bfork\\s*\\([\\s\\S]{0,320}\\bexecPath\\s*:\\s*["'\`]([^"'\`\\n]*?(?:${blockedExecutableAlternation})[^"'\`\\n]*)["'\`]`,
      "gi",
    ),
  },
  {
    kind: "coding-agent-indirection",
    pattern: new RegExp(
      String.raw`\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*["'\`][^"'\`\n]*?(?:${codingAgentAlternation})(?=[/\\\s"'\`])[^"'\`\n]*["'\`]\s*;?[\s\S]{0,320}?\b${childProcessCallAlternation}\s*\(\s*\1\b`,
      "gi",
    ),
  },
  {
    kind: "network-cli-executable",
    pattern: new RegExp(
      `\\b${childProcessCallAlternation}\\s*\\(\\s*["'\`]([^"'\`\\n]*?(?:${networkCliAlternation})(?:[/\\\\]|["'\`]|\\s))`,
      "gi",
    ),
  },
  {
    kind: "network-cli-shell-command",
    pattern: new RegExp(
      `\\b${childProcessCallAlternation}\\s*\\([^\\n]{0,320}\\b(?:${networkCliAlternation})\\b`,
      "gi",
    ),
  },
  {
    kind: "blocked-executable-shell-option",
    pattern: new RegExp(
      `\\b(?:spawn|spawnSync|execFile|execFileSync)\\s*\\([\\s\\S]{0,320}\\bshell\\s*:\\s*["'\`]([^"'\`\\n]*?(?:${blockedExecutableAlternation})[^"'\`\\n]*)["'\`]`,
      "gi",
    ),
  },
]);

function deterministicCapabilityViolations(source) {
  const violations = forbiddenCapabilityPatterns.flatMap(
    ({ kind, pattern }) => {
      pattern.lastIndex = 0;
      return [...source.matchAll(pattern)].map((match) => ({
        kind,
        match: match[0].slice(0, 120),
      }));
    },
  );
  return violations.filter(
    (violation, index) =>
      violations.findIndex(
        (candidate) =>
          candidate.kind === violation.kind &&
          candidate.match === violation.match,
      ) === index,
  );
}

const importPatterns = Object.freeze([
  /\bimport\s+(?:type\s+)?(?:[^'"\n;]+?\s+from\s+)?["']([^"']+)["']/g,
  /\bexport\s+(?:[^'"\n;]+?\s+from\s+)?["']([^"']+)["']/g,
  /\b(?:require|import)\s*\(\s*["']([^"']+)["']\s*\)/g,
]);

function importSpecifiers(source) {
  return importPatterns.flatMap((pattern) => {
    pattern.lastIndex = 0;
    return [...source.matchAll(pattern)].map((match) => match[1]);
  });
}

const sourceResolutionSuffixes = Object.freeze([
  "",
  ...SUPPORTED_VITEST_SOURCE_FILE_EXTENSIONS,
]);

function resolveInternalImport(sourcePath, specifier) {
  const candidate = resolve(dirname(sourcePath), specifier);
  const candidates = sourceResolutionSuffixes.flatMap((extension) => [
    `${candidate}${extension}`,
    join(candidate, `index${extension}`),
  ]);
  return candidates.find((path) => existsSync(path)) ?? undefined;
}

function repositoryOwnedPath(path) {
  const relativePath = relative(root, path);
  return (
    relativePath !== ".." &&
    !relativePath.startsWith(`..${sep}`) &&
    !relativePath.split(sep).includes("node_modules")
  );
}

function readJsonFile(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

function sourcePathForTarget(target) {
  if (typeof target !== "string") return undefined;
  const candidate = resolve(target);
  if (!repositoryOwnedPath(candidate)) return undefined;
  for (const extension of sourceResolutionSuffixes) {
    const path = `${candidate}${extension}`;
    if (existsSync(path)) return path;
  }
  for (const extension of sourceResolutionSuffixes) {
    const path = join(candidate, `index${extension}`);
    if (existsSync(path)) return path;
  }
  return undefined;
}

function targetFromPackageExports(exportsValue, subpath) {
  if (typeof exportsValue === "string") return exportsValue;
  if (Array.isArray(exportsValue)) {
    for (const candidate of exportsValue) {
      const target = targetFromPackageExports(candidate, subpath);
      if (target !== undefined) return target;
    }
    return undefined;
  }
  if (exportsValue === null || typeof exportsValue !== "object") {
    return undefined;
  }
  if (Object.hasOwn(exportsValue, subpath)) {
    return targetFromPackageExports(exportsValue[subpath], subpath);
  }
  for (const [key, value] of Object.entries(exportsValue)) {
    if (key.endsWith("/*") && subpath.startsWith(key.slice(0, -1))) {
      const target = targetFromPackageExports(value, subpath);
      return target?.replaceAll("*", subpath.slice(key.length - 1));
    }
  }
  for (const condition of ["types", "import", "default", "node"]) {
    if (Object.hasOwn(exportsValue, condition)) {
      const target = targetFromPackageExports(exportsValue[condition], subpath);
      if (target !== undefined) return target;
    }
  }
  return undefined;
}

function workspacePackageRecords() {
  const packagesDirectory = join(root, "packages");
  if (!existsSync(packagesDirectory)) return new Map();
  const records = new Map();
  for (const packageJsonPath of filesBelow(packagesDirectory).filter(
    (path) => basename(path) === "package.json",
  )) {
    const packageJson = readJsonFile(packageJsonPath);
    if (
      packageJson === undefined ||
      typeof packageJson.name !== "string" ||
      !packageJson.name.startsWith("@dnd/")
    ) {
      continue;
    }
    records.set(packageJson.name, {
      root: dirname(packageJsonPath),
      exports: packageJson.exports,
    });
  }
  return records;
}

const workspacePackages = workspacePackageRecords();

function workspacePackageImportPath(specifier) {
  for (const [packageName, record] of workspacePackages) {
    if (specifier !== packageName && !specifier.startsWith(`${packageName}/`)) {
      continue;
    }
    const suffix = specifier.slice(packageName.length);
    const subpath = suffix.length === 0 ? "." : `.${suffix}`;
    const target =
      targetFromPackageExports(record.exports, subpath) ??
      (subpath === "." ? "./src/index.ts" : undefined);
    if (target === undefined) continue;
    const sourcePath = sourcePathForTarget(resolve(record.root, target));
    if (sourcePath !== undefined) return sourcePath;
  }
  return undefined;
}

function workspaceTsconfigPathMaps() {
  const configPaths = [
    resolve(root, "scripts/raw-swarm/sdk-player/tsconfig.json"),
    ...filesBelow(join(root, "packages")).filter(
      (path) => basename(path) === "tsconfig.json",
    ),
  ];
  return configPaths.flatMap((configPath) => {
    const config = readJsonFile(configPath);
    const paths = config?.compilerOptions?.paths;
    if (paths === null || typeof paths !== "object") return [];
    return [
      {
        directory: dirname(configPath),
        paths,
      },
    ];
  });
}

const workspaceTsconfigMaps = workspaceTsconfigPathMaps();

function pathIsInside(path, directory) {
  const relativePath = relative(directory, path);
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !relativePath.startsWith(sep))
  );
}

function workspaceTsconfigImportPath(sourcePath, specifier) {
  const config = workspaceTsconfigMaps
    .filter(({ directory }) => pathIsInside(sourcePath, directory))
    .sort((left, right) => right.directory.length - left.directory.length)[0];
  if (config === undefined) return undefined;
  for (const [alias, targets] of Object.entries(config.paths)) {
    const aliasPrefix = alias.endsWith("/*") ? alias.slice(0, -1) : alias;
    const matches = alias.endsWith("/*")
      ? specifier.startsWith(aliasPrefix)
      : specifier === alias;
    if (!matches || !Array.isArray(targets)) continue;
    const suffix = alias.endsWith("/*")
      ? specifier.slice(aliasPrefix.length)
      : "";
    for (const target of targets) {
      if (typeof target !== "string") continue;
      const targetPath = target.replaceAll("*", suffix);
      const sourceTarget = sourcePathForTarget(
        resolve(config.directory, targetPath),
      );
      if (sourceTarget !== undefined) return sourceTarget;
    }
  }
  return undefined;
}

function workspaceImportPath(sourcePath, specifier) {
  return (
    workspaceTsconfigImportPath(sourcePath, specifier) ??
    workspacePackageImportPath(specifier)
  );
}

function sourcePathsForQualityTest(testPath) {
  const pending = [resolve(root, testPath)];
  const visited = new Set();
  const paths = [];
  while (pending.length > 0) {
    const sourcePath = pending.pop();
    if (sourcePath === undefined || visited.has(sourcePath)) continue;
    visited.add(sourcePath);
    paths.push(sourcePath);
    const relativePath = relative(root, sourcePath);
    // Model-backed modules are an explicit boundary. Their process and
    // network capabilities are checked by model-entrypoint guards, while the
    // deterministic test still owns lifecycle/evidence assertions around it.
    if (
      MODEL_BACKED_SOURCE_FILES.includes(relativePath) ||
      DETERMINISTIC_TRANSITIVE_SCAN_BOUNDARIES.includes(relativePath)
    ) {
      continue;
    }
    const source = readFileSync(sourcePath, "utf8");
    for (const specifier of importSpecifiers(source)) {
      const importedPath = specifier.startsWith(".")
        ? resolveInternalImport(sourcePath, specifier)
        : workspaceImportPath(sourcePath, specifier);
      if (importedPath !== undefined) pending.push(importedPath);
    }
  }
  return paths;
}

function assertSourceCapabilities(sourcePath) {
  const source = readFileSync(sourcePath, "utf8");
  const violations = deterministicCapabilityViolations(source);
  assert.equal(
    violations.length,
    0,
    `Deterministic Raw Swarm source ${relative(root, sourcePath)} contains forbidden capabilities: ${JSON.stringify(violations)}`,
  );
}

function runSourceCheck(sourcePathArgument) {
  const sourcePath = resolve(root, sourcePathArgument);
  assert.equal(
    existsSync(sourcePath),
    true,
    `Source does not exist: ${sourcePathArgument}`,
  );
  assertSourceCapabilities(sourcePath);
  process.stdout.write(`Deterministic source passed: ${sourcePathArgument}\n`);
}

function runTestSourceCheck(testPathArgument) {
  const testPath = resolve(root, testPathArgument);
  assert.equal(
    existsSync(testPath),
    true,
    `Test source does not exist: ${testPathArgument}`,
  );
  for (const sourcePath of sourcePathsForQualityTest(testPathArgument)) {
    const relativeSourcePath = relative(root, sourcePath);
    if (
      MODEL_BACKED_SOURCE_FILES.includes(relativeSourcePath) ||
      DETERMINISTIC_TRANSITIVE_SCAN_BOUNDARIES.includes(relativeSourcePath)
    ) {
      continue;
    }
    assertSourceCapabilities(sourcePath);
  }
  process.stdout.write(
    `Deterministic source tree passed: ${testPathArgument}\n`,
  );
}

function runLaneHygiene() {
  const discoveredTests = filesBelow(join(root, "scripts/raw-swarm"))
    .filter((path) => isSupportedVitestTestFilename(path))
    .map((path) => relative(root, path))
    .sort();

  assert.deepEqual(
    [
      ...QUALITY_OWNED_DETERMINISTIC_RAW_SWARM_TESTS,
      ...Object.keys(RAW_SWARM_TESTS_OUTSIDE_QUALITY),
    ].sort(),
    discoveredTests,
    "Every Raw Swarm test must be classified as quality-owned or an explicitly retained prototype exclusion. Live model work belongs behind a public model command, not in a test file.",
  );
  assert.deepEqual(
    Object.keys(RAW_SWARM_TESTS_OUTSIDE_QUALITY).sort(),
    [
      "scripts/raw-swarm/battle-slice-tools.test.ts",
      "scripts/raw-swarm/transcript.property.test.ts",
    ],
    "Only the two established Raw Swarm prototype tests may remain outside quality.",
  );
  assert.equal(
    QUALITY_OWNED_DETERMINISTIC_RAW_SWARM_TESTS.some((testPath) =>
      Object.hasOwn(RAW_SWARM_TESTS_OUTSIDE_QUALITY, testPath),
    ),
    false,
    "A Raw Swarm test cannot be both quality-owned and excluded from quality.",
  );
  for (const testPath of discoveredTests) {
    for (const sourcePath of sourcePathsForQualityTest(testPath)) {
      const relativeSourcePath = relative(root, sourcePath);
      if (
        MODEL_BACKED_SOURCE_FILES.includes(relativeSourcePath) ||
        DETERMINISTIC_TRANSITIVE_SCAN_BOUNDARIES.includes(relativeSourcePath)
      ) {
        continue;
      }
      assertSourceCapabilities(sourcePath);
    }
  }

  assert.deepEqual(
    [...new Set(MODEL_BACKED_SOURCE_FILES)].sort(),
    MODEL_BACKED_SOURCE_FILES,
    "Model-backed source classification must be deterministic and duplicate-free.",
  );
  for (const sourcePath of MODEL_BACKED_SOURCE_FILES) {
    assert.equal(
      existsSync(join(root, sourcePath)),
      true,
      `Model-backed source classification points to a missing file: ${sourcePath}`,
    );
  }
  for (const sourcePath of DETERMINISTIC_TRANSITIVE_SCAN_BOUNDARIES) {
    assert.equal(
      existsSync(join(root, sourcePath)),
      true,
      `Deterministic transitive-scan boundary points to a missing file: ${sourcePath}`,
    );
  }

  const scripts = packageJson.scripts;
  assert.equal(
    scripts["check:raw-swarm-deterministic:body"],
    "env -u NODE_OPTIONS RAW_SWARM_EXECUTION_LANE=deterministic node --require=scripts/raw-swarm/deterministic-capability-guard.cjs scripts/raw-swarm/run-deterministic-check.cjs",
  );
  assert.match(
    scripts["check:raw-swarm-deterministic"],
    /with-broad-workspace-lock\.sh pnpm run check:raw-swarm-deterministic:body$/,
  );
  assert.equal(
    scripts["raw-swarm:model:trial"],
    ". scripts/resource-lock-owner.sh && with_resource_lock_owner scripts/raw-swarm/with-model-lane-lock.sh trial node scripts/raw-swarm/run-model-backed.mjs trial",
  );
  assert.equal(
    scripts["raw-swarm:model:campaign"],
    ". scripts/resource-lock-owner.sh && with_resource_lock_owner scripts/raw-swarm/with-model-lane-lock.sh campaign node scripts/raw-swarm/run-model-backed.mjs campaign",
  );

  const qualityBody = scripts["quality:body"];
  assert.match(qualityBody, /pnpm check:raw-swarm-lane-hygiene/);
  assert.match(qualityBody, /pnpm check:raw-swarm-deterministic:body/);
  assert.doesNotMatch(
    qualityBody,
    /raw-swarm:model|check:raw-swarm-sdk-player/,
  );
  for (const entrypoint of MODEL_BACKED_ENTRYPOINTS) {
    assert.doesNotMatch(
      qualityBody,
      new RegExp(entrypoint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      `Quality must not invoke model-backed entrypoint ${entrypoint}.`,
    );
  }
  assert.equal(
    new Set(MODEL_BACKED_ENTRYPOINTS).size,
    MODEL_BACKED_ENTRYPOINTS.length,
  );
  assert.equal(Object.keys(MODEL_BACKED_OPERATIONS).length, 8);
  assert.deepEqual(MODEL_BACKED_PROFILE_BUDGET_SECONDS, {
    campaign: 28_800,
    trial: 7_200,
  });
  for (const path of MODEL_BACKED_ENTRYPOINTS) {
    assert.equal(
      QUALITY_OWNED_DETERMINISTIC_RAW_SWARM_TESTS.includes(path),
      false,
      `Model entry point ${path} entered the deterministic inventory.`,
    );
    const source = readFileSync(join(root, path), "utf8");
    assert.match(
      source,
      /assertModelEntryPointGuard\(\)|DND_RAW_SWARM_MODEL_ENTRYPOINT_GUARD/,
      `Model entry point ${path} must enforce the public model-entrypoint guard.`,
    );
  }

  const deterministicRunner = readFileSync(
    join(root, "scripts/raw-swarm/run-deterministic-check.cjs"),
    "utf8",
  );
  assert.match(deterministicRunner, /deterministic-bin/);
  assert.match(
    deterministicRunner,
    /RAW_SWARM_EXECUTION_LANE: "deterministic"/,
  );
  assert.match(deterministicRunner, /deterministic-capability-guard\.cjs/);
  assert.match(deterministicRunner, /process-supervisor\.c/);
  assert.match(deterministicRunner, /deterministic-toolchain\.cjs/);
  assert.match(deterministicRunner, /deterministic-runner\.cjs/);
  assert.match(deterministicRunner, /NODE_OPTIONS: deterministicNodeOptions/);
  assert.doesNotMatch(
    deterministicRunner,
    /process\.env\.NODE_OPTIONS/,
    "Deterministic phases must not inherit arbitrary NODE_OPTIONS values.",
  );
  assert.equal(
    existsSync(
      join(root, "scripts/raw-swarm/deterministic-capability-guard.cjs"),
    ),
    true,
    "Deterministic lane is missing its Node capability guard.",
  );
  assert.equal(
    existsSync(join(root, "scripts/raw-swarm/process-supervisor.c")),
    true,
    "Deterministic lane is missing its native process supervisor source.",
  );
  const deterministicToolchain = readFileSync(
    join(root, "scripts/raw-swarm/deterministic-toolchain.cjs"),
    "utf8",
  );
  assert.match(
    deterministicToolchain,
    /TRUSTED_C_COMPILER_PATH = "\/usr\/bin\/cc"/,
  );
  assert.match(deterministicToolchain, /PATH: "\/usr\/bin:\/bin"/);
  assert.doesNotMatch(
    deterministicToolchain,
    /process\.env/,
    "Deterministic boundary compilation must not inherit compiler environment variables.",
  );
  assert.doesNotMatch(
    deterministicToolchain,
    /spawnSync\(\s*["'`]cc["'`]/,
    "Deterministic boundary compilation must not resolve cc through PATH.",
  );
  const deterministicProcessRunner = readFileSync(
    join(root, "scripts/raw-swarm/deterministic-runner.cjs"),
    "utf8",
  );
  assert.match(deterministicProcessRunner, /stdio: "inherit"/);
  assert.match(
    deterministicProcessRunner,
    /--owner-pid[\s\S]*String\(process\.pid\)/,
    "The native helper must receive the exact JavaScript owner PID.",
  );
  assert.match(
    deterministicProcessRunner,
    /HANDLED_SIGNAL_EXIT_STATUSES[\s\S]*includes\(result\.status\)/,
    "The runner must accept any native handled-signal completion status.",
  );
  assert.doesNotMatch(
    deterministicProcessRunner,
    /\/proc|readdirSync|readFileSync|capture/i,
    "Native supervision owns process lifecycle and inherited output; the JavaScript wrapper must not rediscover or capture it.",
  );
  assert.doesNotMatch(
    deterministicProcessRunner,
    /spawnSync/,
    "Deterministic child lifecycle must use asynchronous native supervision.",
  );
  const sharedProcessSupervision = readFileSync(
    join(root, "scripts/process-supervision.sh"),
    "utf8",
  );
  assert.match(
    sharedProcessSupervision,
    /--supervise-only/,
    "Resource and model wrappers must use the shared native supervisor.",
  );
  assert.doesNotMatch(
    sharedProcessSupervision,
    /DND_PROCESS_SUPERVISION_MARKER|\/proc\/\[0-9\]\*\/environ/,
    "Process ownership must not rely on an inherited environment marker.",
  );
  assert.doesNotMatch(
    sharedProcessSupervision,
    /supervision_signal_helper KILL|kill -["']?KILL/,
    "The shell must not kill the native supervisor while its descendants may survive.",
  );
  const blockerDirectory = join(root, "scripts/raw-swarm/deterministic-bin");
  const commonBlockerPath = join(blockerDirectory, "forbidden-command");
  assert.equal(
    existsSync(commonBlockerPath),
    true,
    "Deterministic lane is missing its shared executable guard.",
  );
  assert.match(
    readFileSync(commonBlockerPath, "utf8"),
    /forbidden in the deterministic Raw Swarm lane/i,
  );
  for (const executable of DETERMINISTIC_BLOCKED_EXECUTABLES) {
    const blockerPath = join(blockerDirectory, executable);
    assert.equal(
      existsSync(blockerPath),
      true,
      `Deterministic lane is missing the ${executable} executable guard.`,
    );
    assert.match(readFileSync(blockerPath, "utf8"), /forbidden-command/);
  }
  assert.match(
    readFileSync(join(root, "scripts/raw-swarm/run-model-backed.mjs"), "utf8"),
    /MODEL_BACKED_PROFILE_BUDGET_SECONDS\[profile\]/,
  );
  assert.match(
    readFileSync(join(root, "scripts/raw-swarm/run-model-backed.mjs"), "utf8"),
    /DND_RAW_SWARM_MODEL_ENTRYPOINT_GUARD/,
  );

  process.stdout.write(
    `Raw Swarm lane hygiene passed: ${QUALITY_OWNED_DETERMINISTIC_RAW_SWARM_TESTS.length} quality-owned deterministic tests, ${Object.keys(RAW_SWARM_TESTS_OUTSIDE_QUALITY).length} closed prototype exclusions, and ${Object.keys(MODEL_BACKED_OPERATIONS).length} explicit model-backed operations.\n`,
  );
}

if (require.main === module) {
  if (process.argv[2] === "--source") {
    runSourceCheck(process.argv[3]);
  } else if (process.argv[2] === "--test") {
    runTestSourceCheck(process.argv[3]);
  } else {
    runLaneHygiene();
  }
}
