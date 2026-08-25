const assert = require("node:assert/strict");
const { existsSync, readdirSync, readFileSync } = require("node:fs");
const { dirname, join, relative, resolve } = require("node:path");

const {
  CODING_AGENT_EXECUTABLES,
  DETERMINISTIC_TRANSITIVE_SCAN_BOUNDARIES,
  MODEL_BACKED_OPERATIONS,
  MODEL_BACKED_ENTRYPOINTS,
  MODEL_BACKED_PROFILE_BUDGET_SECONDS,
  MODEL_BACKED_SOURCE_FILES,
  QUALITY_OWNED_DETERMINISTIC_RAW_SWARM_TESTS,
  RAW_SWARM_TESTS_OUTSIDE_QUALITY,
} = require("./lane-classification.cjs");

const root = resolve(__dirname, "../..");
const packageJson = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
);

function filesBelow(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const codingAgentAlternation =
  CODING_AGENT_EXECUTABLES.map(escapeRegExp).join("|");

const forbiddenCapabilityPatterns = Object.freeze([
  {
    kind: "network-module",
    pattern:
      /(?:\bfrom\s*|\bimport\s*\(|\brequire\s*\()\s*["'`](?:undici|(?:node:)?(?:http|https|net|tls|dns))["'`]/g,
  },
  {
    kind: "network-api",
    pattern:
      /\b(?:undici|http|https|net|tls|dns)\s*\.\s*(?:request|get|fetch|createConnection|connect|lookup|resolve|createServer)\s*\(/g,
  },
  {
    kind: "global-fetch",
    pattern: /(?:\bglobalThis\s*\.\s*fetch|\bfetch)\s*\(/g,
  },
  {
    kind: "coding-agent-executable",
    pattern: new RegExp(
      `\\b(?:spawn|spawnSync|exec|execSync|execFile|execFileSync)\\s*\\(\\s*["'\`]([^"'\`\\n]*?(?:${codingAgentAlternation})(?:[/\\\\]|["'\`]|\\s))`,
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
]);

function deterministicCapabilityViolations(source) {
  return forbiddenCapabilityPatterns.flatMap(({ kind, pattern }) => {
    pattern.lastIndex = 0;
    return [...source.matchAll(pattern)].map((match) => ({
      kind,
      match: match[0].slice(0, 120),
    }));
  });
}

const importPatterns = Object.freeze([
  /\bimport\s+(?:type\s+)?(?:[^'"\n;]+?\s+from\s+)?["']([^"']+)["']/g,
  /\bexport\s+(?:[^'"\n;]+?\s+from\s+)?["']([^"']+)["']/g,
  /\b(?:require|import)\s*\(\s*["']([^"']+)["']\s*\)/g,
]);

function relativeImportSpecifiers(source) {
  return importPatterns.flatMap((pattern) => {
    pattern.lastIndex = 0;
    return [...source.matchAll(pattern)]
      .map((match) => match[1])
      .filter((specifier) => specifier.startsWith("."));
  });
}

const sourceExtensions = ["", ".ts", ".tsx", ".js", ".mjs", ".cjs"];

function resolveInternalImport(sourcePath, specifier) {
  const candidate = resolve(dirname(sourcePath), specifier);
  const candidates = sourceExtensions.flatMap((extension) => [
    `${candidate}${extension}`,
    join(candidate, `index${extension}`),
  ]);
  return candidates.find((path) => existsSync(path)) ?? undefined;
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
    for (const specifier of relativeImportSpecifiers(source)) {
      const importedPath = resolveInternalImport(sourcePath, specifier);
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

function runLaneHygiene() {
  const discoveredTests = filesBelow(join(root, "scripts/raw-swarm"))
    .filter((path) => /(?:\.test|\.property\.test)\.ts$/.test(path))
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
    "node scripts/raw-swarm/run-deterministic-check.cjs",
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
  for (const executable of CODING_AGENT_EXECUTABLES) {
    const blockerPath = join(
      root,
      "scripts/raw-swarm/deterministic-bin",
      executable,
    );
    assert.equal(
      existsSync(blockerPath),
      true,
      `Deterministic lane is missing the ${executable} executable guard.`,
    );
    assert.match(
      readFileSync(blockerPath, "utf8"),
      /forbidden in the deterministic Raw Swarm lane/i,
    );
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
  } else {
    runLaneHygiene();
  }
}

module.exports = {
  deterministicCapabilityViolations,
  relativeImportSpecifiers,
  sourcePathsForQualityTest,
};
