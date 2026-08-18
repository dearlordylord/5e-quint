import { resolve } from "node:path";

import { buildConsumerDistribution } from "./consumer-distribution.ts";

function fail(message: string): never {
  throw new Error(message);
}

const [destination, trustedDestination, scenarioPath, ...unexpected] =
  process.argv.slice(2);
if (
  destination === undefined ||
  trustedDestination === undefined ||
  scenarioPath === undefined ||
  unexpected.length > 0
) {
  fail(
    "Usage: consumer-distribution-cli.ts <player-directory> <trusted-directory> <scenario.md>",
  );
}

buildConsumerDistribution({
  destination: resolve(destination),
  trustedDestination: resolve(trustedDestination),
  scenarioPath: resolve(scenarioPath),
});
