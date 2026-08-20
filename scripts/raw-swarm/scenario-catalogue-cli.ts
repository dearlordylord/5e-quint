import { resolve } from "node:path";

import { Either, Match } from "effect";

import { readRawSwarmCatalogue } from "./scenario-catalogue.ts";
import { repoRoot } from "./transcript.ts";

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const args = process.argv.slice(2).filter((arg) => arg !== "--");
if (args.some((arg) => arg !== "--json" && arg !== "--rejected")) {
  fail("Usage: pnpm raw-swarm:catalogue [--json] [--rejected]");
}

const catalogue = readRawSwarmCatalogue({
  repositoryRoot: repoRoot,
  scenarioDirectory: resolve(
    repoRoot,
    "scripts/raw-swarm/sdk-player/scenarios",
  ),
  evidenceDirectory: resolve(repoRoot, "scripts/raw-swarm/out"),
});
if (Either.isLeft(catalogue)) {
  fail(JSON.stringify(catalogue.left));
}

const projection = args.includes("--rejected")
  ? catalogue.right.rejectedCandidates
  : catalogue.right.scenarios;

if (args.includes("--json")) {
  process.stdout.write(`${JSON.stringify(projection, null, 2)}\n`);
} else if (args.includes("--rejected")) {
  for (const candidate of catalogue.right.rejectedCandidates) {
    process.stdout.write(
      `${candidate.candidateId}\n  campaign: ${candidate.campaignId}\n  evidence: ${candidate.evidenceSetId}\n  reason: ${candidate.reason}\n`,
    );
  }
} else {
  for (const scenario of catalogue.right.scenarios) {
    const spatial = Match.value(scenario.spatialRequirement).pipe(
      Match.when({ tag: "notRequired" }, () => "not required"),
      Match.when({ tag: "geometryAssisted" }, () => "geometry assisted"),
      Match.when(
        { tag: "outsideExperimentEnvelope", resolution: "tableAuthored" },
        () => "Table authored",
      ),
      Match.when(
        { tag: "outsideExperimentEnvelope", resolution: "incoherent" },
        () => "incoherent",
      ),
      Match.exhaustive,
    );
    const sdkCapability = Match.value(scenario.sdkCapability).pipe(
      Match.when(
        { tag: "assessed" },
        ({ sdkCapabilityIntent, sdkCapabilityReview }) =>
          `${sdkCapabilityIntent}/${sdkCapabilityReview.classification}`,
      ),
      Match.when({ tag: "notAssessed" }, () => "not assessed"),
      Match.exhaustive,
    );
    process.stdout.write(
      `${scenario.scenarioId} — ${scenario.title}\n  purpose: ${scenario.purpose}\n  characters: ${scenario.characterRequirement.tag}; spatial: ${spatial}; SDK: ${sdkCapability}\n`,
    );
  }
}
