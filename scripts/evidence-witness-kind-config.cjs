const focusedMbtWitnessKind = "focused-mbt";
const deterministicQntReplayWitnessKind = "deterministic-qnt-replay";
const runtimeTestWitnessKind = "runtime-test";
const mcpScenarioWitnessKind = "mcp-scenario";

const parityWitnessKindValues = [
  focusedMbtWitnessKind,
  deterministicQntReplayWitnessKind,
  runtimeTestWitnessKind,
];

const witnessKindDescriptions = Object.freeze({
  [focusedMbtWitnessKind]:
    "Random-trace QNT/MBT parity evidence for reducer sequencing, holes, resources, active effects, reactions, or interleavings.",
  [deterministicQntReplayWitnessKind]:
    "Closed-case QNT replay evidence for fixed projections, scalar checks, or tiny named fixtures; not random MBT coverage.",
  [runtimeTestWitnessKind]:
    "Focused runtime test evidence for a profile-scoped reducer or projection path that already has profile-level QNT proof ownership or declared semantic-core QNT ownership.",
  [mcpScenarioWitnessKind]:
    "Package-local MCP acceptance scenario evidence for user-facing tool and workflow flows.",
});

const parityWitnessKinds = new Set(parityWitnessKindValues);
const ultraGoldenWitnessKinds = new Set([
  ...parityWitnessKindValues,
  mcpScenarioWitnessKind,
]);

function witnessKindCatalogIssues() {
  const issues = [];
  for (const kind of ultraGoldenWitnessKinds) {
    const description = witnessKindDescriptions[kind];
    if (typeof description !== "string" || description.trim().length === 0) {
      issues.push(`witness kind ${kind} must have a non-empty description.`);
    }
  }
  for (const kind of Object.keys(witnessKindDescriptions)) {
    if (!ultraGoldenWitnessKinds.has(kind)) {
      issues.push(`witness kind description references unknown kind ${kind}.`);
    }
  }
  return issues;
}

module.exports = {
  deterministicQntReplayWitnessKind,
  focusedMbtWitnessKind,
  mcpScenarioWitnessKind,
  parityWitnessKinds,
  runtimeTestWitnessKind,
  ultraGoldenWitnessKinds,
  witnessKindCatalogIssues,
  witnessKindDescriptions,
};
