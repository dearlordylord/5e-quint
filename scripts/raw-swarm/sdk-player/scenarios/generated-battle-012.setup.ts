import type { ScenarioSetup } from "@dnd/scenario-setup-sdk";

export const setupScenario: ScenarioSetup = () => ({
  kind: "obstructed",
  obstruction:
    "The public setup surface can bind Table-authored spatial decisions only to the scenario session's current fingerprint. This scenario requires separate Goblin-Warrior-to-Skeleton Grapple reach decisions for two alternative post-Shove fingerprints, but no listed setup operation can register either future fingerprint or its branch-specific decision. Putting both decisions in the initial session would attach them to the wrong fingerprint and would not faithfully represent the scenario.",
  observation: {
    scenarioId: "generated-battle-012",
    unsupportedRequirement: "branch-specific future spatial decisions",
    publicOperation: "createScenarioSession",
    representableNow: {
      initialSpatialBoundary: "tableAuthored",
      initialDecision: "Skeleton shoveTarget Goblin Warrior",
    },
    notRepresentable: [
      "Goblin Warrior grappleTarget Skeleton after a successful knock-prone Shove",
      "Goblin Warrior grappleTarget Skeleton after an unsuccessful knock-prone Shove",
    ],
    rejectedSubstitute:
      "Attach both future Grapple reach answers to the initial spatial fingerprint",
  },
});
