const DETERMINISTIC_RAW_SWARM_TESTS = [
  "scripts/raw-swarm/artifact-index.test.ts",
  "scripts/raw-swarm/battle-slice-tools.test.ts",
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
  "scripts/raw-swarm/transcript.property.test.ts",
].sort();

const MODEL_BACKED_OPERATIONS = Object.freeze({
  "fixed-benchmark-prepare": {
    command: "scripts/raw-swarm/fixed-scenario-benchmark.ts",
    fixedArguments: ["prepare"],
    writesCatalogue: false,
  },
  "post-play-review": {
    command: "scripts/raw-swarm/run-raw-review.sh",
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

module.exports = {
  DETERMINISTIC_RAW_SWARM_TESTS,
  MODEL_BACKED_OPERATIONS,
  MODEL_BACKED_PROFILE_BUDGET_SECONDS,
};
