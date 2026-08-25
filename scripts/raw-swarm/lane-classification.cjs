const QUALITY_OWNED_DETERMINISTIC_RAW_SWARM_TESTS = [
  "scripts/raw-swarm/artifact-index.test.ts",
  "scripts/raw-swarm/capability-projection.test.ts",
  "scripts/raw-swarm/complete-path-comparison.test.ts",
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
  "scripts/raw-swarm/sdk-player/consumer-distribution.test.ts",
  "scripts/raw-swarm/sdk-player/player-turn-projection.test.ts",
  "scripts/raw-swarm/sdk-player/scenario-character-runtime.test.ts",
  "scripts/raw-swarm/sdk-player/scenario-setup-authoring.test.ts",
  "scripts/raw-swarm/sdk-player/scenario-setup-runtime.test.ts",
  "scripts/raw-swarm/sdk-player/sdk-audit.test.ts",
  "scripts/raw-swarm/sdk-player/sdk-replay-input.test.ts",
  "scripts/raw-swarm/sdk-player/sdk-review-packet.test.ts",
  "scripts/raw-swarm/sdk-player/sdk-transcript.property.test.ts",
  "scripts/raw-swarm/stage-plan-authority.test.ts",
].sort();

const RAW_SWARM_TESTS_OUTSIDE_QUALITY = Object.freeze({
  "scripts/raw-swarm/battle-slice-tools.test.ts":
    "Pre-existing MCP tool-surface prototype contract; not part of the established Raw Swarm quality command.",
  "scripts/raw-swarm/transcript.property.test.ts":
    "Pre-existing MCP transcript prototype property suite; not part of the established Raw Swarm quality command.",
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
// deterministic test exercises their process-lifecycle or evidence boundary.
// The hygiene checker inventories them explicitly instead of treating an
// imported model command as deterministic merely because its caller is a
// quality-owned test.
const MODEL_BACKED_SOURCE_FILES = Object.freeze(
  [
    ...MODEL_BACKED_ENTRYPOINTS,
    "scripts/raw-swarm/model-telemetry.ts",
    "scripts/raw-swarm/sdk-player/consumer-codex-profile.ts",
  ].sort(),
);

// The MCP composition root carries an optional, disabled-by-default admin
// mirror publisher. It is an explicit external capability boundary rather
// than a deterministic Raw Swarm implementation dependency; quality tests
// exercise the disabled projection path and never invoke its publisher.
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

// This catalog is the single capability vocabulary shared by the static
// source checker and the CommonJS guard. Keep both bare and node: forms because
// Node exposes the same built-in through either specifier.
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
  QUALITY_OWNED_DETERMINISTIC_RAW_SWARM_TESTS,
  RAW_SWARM_TESTS_OUTSIDE_QUALITY,
  MODEL_BACKED_OPERATIONS,
  MODEL_BACKED_ENTRYPOINTS,
  MODEL_BACKED_SOURCE_FILES,
  DETERMINISTIC_TRANSITIVE_SCAN_BOUNDARIES,
  MODEL_BACKED_PROFILE_BUDGET_SECONDS,
  CODING_AGENT_EXECUTABLES,
  NETWORK_NODE_BUILTIN_MODULES,
  DETERMINISTIC_NETWORK_MODULES,
  DETERMINISTIC_NETWORK_GLOBALS,
  NETWORK_CLI_EXECUTABLES,
  DETERMINISTIC_BLOCKED_EXECUTABLES,
};
