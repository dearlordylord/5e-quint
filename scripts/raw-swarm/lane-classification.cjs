// This is the canonical source-extension inventory for Vitest's default
// include glob: **/*.{test,spec}.?(c|m)[jt]s?(x). Test suffixes and the hygiene
// checker's extensionless internal-import resolver both derive from it, so a
// supported JavaScript or TypeScript form cannot be omitted by one path.
const SUPPORTED_VITEST_SOURCE_FILE_EXTENSIONS = Object.freeze([
  ".cjs",
  ".cjsx",
  ".cts",
  ".ctsx",
  ".js",
  ".jsx",
  ".mjs",
  ".mjsx",
  ".mts",
  ".mtsx",
  ".ts",
  ".tsx",
]);
const SUPPORTED_VITEST_TEST_FILE_SUFFIXES = Object.freeze(
  [".test", ".spec"].flatMap((testKind) =>
    SUPPORTED_VITEST_SOURCE_FILE_EXTENSIONS.map(
      (extension) => `${testKind}${extension}`,
    ),
  ),
);

const DETERMINISTIC_WORKFLOW_PATH_FILTERS = Object.freeze([
  ".github/workflows/raw-swarm-deterministic.yml",
  "mise.toml",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "packages/**",
  "scripts/raw-swarm/**",
  "scripts/assert-resource-lock.sh",
  "scripts/process-supervision.sh",
  "scripts/resource-lock-owner.sh",
  "scripts/with-broad-workspace-lock.sh",
  "scripts/with-resource-lock.sh",
  "vitest.config.ts",
]);

// Consumer distribution is compiled from these repository-owned child
// entrypoints at runtime. The builder and deterministic capability scanner
// share this named inventory so an esbuild entry cannot become an invisible
// deterministic-lane dependency.
const CONSUMER_DISTRIBUTION_BUILD_ENTRYPOINTS = Object.freeze({
  supervisor: "scripts/raw-swarm/sdk-player/supervisor-cli.ts",
  playerClient: "scripts/raw-swarm/sdk-player/player-client.ts",
  scenarioCharacterClient:
    "scripts/raw-swarm/sdk-player/scenario-character-client.ts",
});
const CONSUMER_DISTRIBUTION_RUNTIME_ENTRYPOINTS = Object.freeze({
  cli: "scripts/raw-swarm/sdk-player/consumer-distribution-cli.ts",
  builder: "scripts/raw-swarm/sdk-player/consumer-distribution.ts",
});

function isSupportedVitestTestFilename(path) {
  return SUPPORTED_VITEST_TEST_FILE_SUFFIXES.some((suffix) =>
    path.endsWith(suffix),
  );
}

const DETERMINISTIC_RAW_SWARM_TESTS = [
  "scripts/raw-swarm/artifact-index.test.ts",
  "scripts/raw-swarm/battle-slice-server.test.ts",
  "scripts/raw-swarm/capability-projection.test.ts",
  "scripts/raw-swarm/complete-path-comparison.test.ts",
  "scripts/raw-swarm/deterministic-capability.test.ts",
  "scripts/raw-swarm/findings.test.ts",
  "scripts/raw-swarm/fixed-baseline-measurement.test.ts",
  "scripts/raw-swarm/fixed-scenario-benchmark.test.ts",
  "scripts/raw-swarm/model-telemetry.test.ts",
  "scripts/raw-swarm/performance-comparison.test.ts",
  "scripts/raw-swarm/player-continuation-evidence.test.ts",
  "scripts/raw-swarm/replay-cache-measurement.test.ts",
  "scripts/raw-swarm/replay-freeplay.test.ts",
  "scripts/raw-swarm/replay-sdk-player.test.ts",
  "scripts/raw-swarm/report.test.ts",
  "scripts/raw-swarm/repository-path.test.ts",
  "scripts/raw-swarm/review-comparison.test.ts",
  "scripts/raw-swarm/review-invocation-evidence.test.ts",
  "scripts/raw-swarm/review-invocation-policy.test.ts",
  "scripts/raw-swarm/review-output-validation.test.ts",
  "scripts/raw-swarm/run-sdk-player.test.ts",
  "scripts/raw-swarm/runner-boundaries.test.ts",
  "scripts/raw-swarm/scenario-admission.test.ts",
  "scripts/raw-swarm/scenario-authoring.test.ts",
  "scripts/raw-swarm/scenario-campaign.test.ts",
  "scripts/raw-swarm/scenario-catalogue.test.ts",
  "scripts/raw-swarm/scenario-stage-plan.test.ts",
  "scripts/raw-swarm/sdk-player/attempt-source.test.ts",
  "scripts/raw-swarm/sdk-player/authored-source-admission.test.ts",
  "scripts/raw-swarm/sdk-player/consumer-distribution.test.ts",
  "scripts/raw-swarm/sdk-player/consumer-protocol-boundaries.test.ts",
  "scripts/raw-swarm/sdk-player/player-turn-projection.test.ts",
  "scripts/raw-swarm/sdk-player/scenario-character-runtime.test.ts",
  "scripts/raw-swarm/sdk-player/scenario-setup-authoring.test.ts",
  "scripts/raw-swarm/sdk-player/scenario-setup-runtime.test.ts",
  "scripts/raw-swarm/sdk-player/scenario-spatial-decisions.test.ts",
  "scripts/raw-swarm/sdk-player/sdk-audit.test.ts",
  "scripts/raw-swarm/sdk-player/sdk-replay-input.test.ts",
  "scripts/raw-swarm/sdk-player/sdk-review-packet.test.ts",
  "scripts/raw-swarm/sdk-player/sdk-transcript.property.test.ts",
  "scripts/raw-swarm/sdk-player/supervisor-authored-source-admission.test.ts",
  "scripts/raw-swarm/stage-plan-authority.test.ts",
].sort();

// These suites exercise the native process and fixture boundaries themselves.
// They need to start nested supervisors, synthetic coding-agent processes, and
// permission-restricted children, so the phase that owns them gets process-tree
// supervision without the outer JavaScript capability preload. The list is
// deliberately closed; the guarded phase is derived as its exact complement.
const DETERMINISTIC_TRUSTED_BOUNDARY_TESTS = Object.freeze(
  [
    "scripts/raw-swarm/battle-slice-server.test.ts",
    "scripts/raw-swarm/model-telemetry.test.ts",
    "scripts/raw-swarm/run-sdk-player.test.ts",
    "scripts/raw-swarm/runner-boundaries.test.ts",
    "scripts/raw-swarm/sdk-player/consumer-distribution.test.ts",
    "scripts/raw-swarm/sdk-player/supervisor-authored-source-admission.test.ts",
  ].sort(),
);
const GUARDED_DETERMINISTIC_RAW_SWARM_TESTS = Object.freeze(
  DETERMINISTIC_RAW_SWARM_TESTS.filter(
    (testPath) => !DETERMINISTIC_TRUSTED_BOUNDARY_TESTS.includes(testPath),
  ),
);

const RAW_SWARM_TESTS_OUTSIDE_DETERMINISTIC_LANE = Object.freeze({
  "scripts/raw-swarm/battle-slice-tools.test.ts":
    "Pre-existing MCP tool-surface prototype contract; not part of the established Raw Swarm deterministic lane.",
  "scripts/raw-swarm/transcript.property.test.ts":
    "Pre-existing MCP transcript prototype property suite; not part of the established Raw Swarm deterministic lane.",
});

const MODEL_BACKED_OPERATIONS = Object.freeze({
  "fixed-benchmark-prepare": {
    command: "scripts/raw-swarm/fixed-scenario-benchmark.ts",
    fixedArguments: ["prepare"],
    writesCatalogue: false,
  },
  "post-play-review": {
    command: "scripts/raw-swarm/run-raw-review.sh",
    additionalEntrypoints: ["scripts/raw-swarm/model-telemetry-cli.ts"],
    fixedArguments: [],
    writesCatalogue: false,
  },
  freeplay: {
    command: "scripts/raw-swarm/run-freeplay.ts",
    fixedArguments: [],
    writesCatalogue: false,
  },
  "scenario-campaign": {
    command: "scripts/raw-swarm/generate-scenario.ts",
    fixedArguments: [],
    writesCatalogue: true,
  },
  "scenario-character-authoring": {
    command: "scripts/raw-swarm/author-scenario-characters.ts",
    fixedArguments: [],
    writesCatalogue: true,
  },
  "scenario-review": {
    command: "scripts/raw-swarm/review-scenario.ts",
    fixedArguments: [],
    writesCatalogue: false,
  },
  "scenario-setup-authoring": {
    command: "scripts/raw-swarm/author-scenario-setup.ts",
    fixedArguments: [],
    writesCatalogue: true,
  },
  "sdk-player": {
    command: "scripts/raw-swarm/run-sdk-player.ts",
    fixedArguments: [],
    writesCatalogue: false,
  },
});

const MODEL_BACKED_PROFILE_BUDGET_SECONDS = Object.freeze({
  campaign: 8 * 60 * 60,
  trial: 2 * 60 * 60,
});

const MODEL_BACKED_ENTRYPOINTS = Object.freeze(
  [
    ...new Set(
      Object.values(MODEL_BACKED_OPERATIONS).flatMap(
        ({ command, additionalEntrypoints = [] }) => [
          command,
          ...additionalEntrypoints,
        ],
      ),
    ),
  ].sort(),
);

// These implementation files are intentionally model-backed even when a
// deterministic-lane test exercises their process-lifecycle or evidence
// boundary.
// The hygiene checker inventories them explicitly instead of treating an
// imported model command as deterministic merely because its caller is a
// deterministic-lane test.
const MODEL_BACKED_SOURCE_FILES = Object.freeze(
  [
    ...MODEL_BACKED_ENTRYPOINTS,
    "scripts/raw-swarm/model-telemetry.ts",
    "scripts/raw-swarm/sdk-player/consumer-codex-profile.ts",
  ].sort(),
);

// The MCP composition root carries an optional, disabled-by-default admin
// mirror publisher. It is an explicit external capability boundary rather
// than a deterministic Raw Swarm implementation dependency; deterministic
// tests exercise the disabled projection path and never invoke its publisher.
const DETERMINISTIC_TRANSITIVE_SCAN_BOUNDARIES = Object.freeze([
  "packages/mcp/src/admin-mirror.ts",
]);

const CODING_AGENT_EXECUTABLES = Object.freeze([
  "aider",
  "amp",
  "claude",
  "cline",
  "codex",
  "copilot",
  "cursor",
  "gemini",
  "goose",
  "opencode",
  "roo",
  "windsurf",
]);

// This is the static-source-checker capability catalog. Keep both bare and
// node: forms because Node exposes the same built-in through either specifier;
// the CommonJS guard owns its runtime enforcement vocabulary separately.
const NETWORK_NODE_BUILTIN_MODULES = Object.freeze([
  "http",
  "https",
  "http2",
  "net",
  "tls",
  "dns",
  "dns/promises",
  "dgram",
]);
const DETERMINISTIC_NETWORK_MODULES = Object.freeze([
  ...NETWORK_NODE_BUILTIN_MODULES,
  ...NETWORK_NODE_BUILTIN_MODULES.map((moduleName) => `node:${moduleName}`),
  "undici",
  "node:undici",
  "ws",
  "websocket",
  "isomorphic-ws",
]);
const DETERMINISTIC_NETWORK_GLOBALS = Object.freeze([
  "fetch",
  "WebSocket",
  "XMLHttpRequest",
  "WebTransport",
  "EventSource",
]);

const NETWORK_CLI_EXECUTABLES = Object.freeze(["curl", "wget"]);
const DETERMINISTIC_BLOCKED_EXECUTABLES = Object.freeze(
  [
    ...new Set([...CODING_AGENT_EXECUTABLES, ...NETWORK_CLI_EXECUTABLES]),
  ].sort(),
);
module.exports = {
  CONSUMER_DISTRIBUTION_BUILD_ENTRYPOINTS,
  CONSUMER_DISTRIBUTION_RUNTIME_ENTRYPOINTS,
  SUPPORTED_VITEST_SOURCE_FILE_EXTENSIONS,
  SUPPORTED_VITEST_TEST_FILE_SUFFIXES,
  DETERMINISTIC_WORKFLOW_PATH_FILTERS,
  isSupportedVitestTestFilename,
  DETERMINISTIC_RAW_SWARM_TESTS,
  DETERMINISTIC_TRUSTED_BOUNDARY_TESTS,
  GUARDED_DETERMINISTIC_RAW_SWARM_TESTS,
  RAW_SWARM_TESTS_OUTSIDE_DETERMINISTIC_LANE,
  MODEL_BACKED_OPERATIONS,
  MODEL_BACKED_ENTRYPOINTS,
  MODEL_BACKED_SOURCE_FILES,
  DETERMINISTIC_TRANSITIVE_SCAN_BOUNDARIES,
  MODEL_BACKED_PROFILE_BUDGET_SECONDS,
  CODING_AGENT_EXECUTABLES,
  DETERMINISTIC_NETWORK_MODULES,
  DETERMINISTIC_NETWORK_GLOBALS,
  NETWORK_CLI_EXECUTABLES,
  DETERMINISTIC_BLOCKED_EXECUTABLES,
};
