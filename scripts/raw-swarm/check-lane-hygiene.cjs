const assert = require("node:assert/strict");
const { readdirSync, readFileSync } = require("node:fs");
const { join, relative, resolve } = require("node:path");

const {
  QUALITY_OWNED_DETERMINISTIC_RAW_SWARM_TESTS,
  MODEL_BACKED_OPERATIONS,
  MODEL_BACKED_PROFILE_BUDGET_SECONDS,
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
  const source = readFileSync(join(root, testPath), "utf8");
  assert.doesNotMatch(
    source,
    /\b(?:fetch|curl|wget)\b|https?\.request|node:https/,
    `Deterministic Raw Swarm test ${testPath} contains a network execution primitive.`,
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
  ". scripts/resource-lock-owner.sh && with_resource_lock_owner scripts/raw-swarm/with-model-lane-lock.sh node scripts/raw-swarm/run-model-backed.mjs trial",
);
assert.equal(
  scripts["raw-swarm:model:campaign"],
  ". scripts/resource-lock-owner.sh && with_resource_lock_owner scripts/raw-swarm/with-model-lane-lock.sh node scripts/raw-swarm/run-model-backed.mjs campaign",
);

const qualityBody = scripts["quality:body"];
assert.match(qualityBody, /pnpm check:raw-swarm-lane-hygiene/);
assert.match(qualityBody, /pnpm check:raw-swarm-deterministic:body/);
assert.doesNotMatch(qualityBody, /raw-swarm:model|check:raw-swarm-sdk-player/);

const modelEntrypoints = new Set(
  Object.values(MODEL_BACKED_OPERATIONS).map(({ command }) => command),
);
assert.equal(
  modelEntrypoints.size,
  Object.keys(MODEL_BACKED_OPERATIONS).length,
);
assert.deepEqual(MODEL_BACKED_PROFILE_BUDGET_SECONDS, {
  campaign: 28_800,
  trial: 7_200,
});
for (const path of modelEntrypoints) {
  assert.equal(
    QUALITY_OWNED_DETERMINISTIC_RAW_SWARM_TESTS.includes(path),
    false,
    `Model entry point ${path} entered the deterministic inventory.`,
  );
}

const deterministicRunner = readFileSync(
  join(root, "scripts/raw-swarm/run-deterministic-check.cjs"),
  "utf8",
);
const codexBlocker = readFileSync(
  join(root, "scripts/raw-swarm/deterministic-bin/codex"),
  "utf8",
);
assert.match(deterministicRunner, /deterministic-bin/);
assert.match(deterministicRunner, /RAW_SWARM_EXECUTION_LANE: "deterministic"/);
assert.match(codexBlocker, /Codex execution is forbidden/);
assert.match(
  readFileSync(join(root, "scripts/raw-swarm/run-model-backed.mjs"), "utf8"),
  /MODEL_BACKED_PROFILE_BUDGET_SECONDS\[profile\]/,
);

process.stdout.write(
  `Raw Swarm lane hygiene passed: ${QUALITY_OWNED_DETERMINISTIC_RAW_SWARM_TESTS.length} quality-owned deterministic tests, ${Object.keys(RAW_SWARM_TESTS_OUTSIDE_QUALITY).length} closed prototype exclusions, and ${modelEntrypoints.size} explicit model-backed operations.\n`,
);
