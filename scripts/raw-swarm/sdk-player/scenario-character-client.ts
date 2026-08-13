import { resolve } from "node:path";
import { Match } from "effect";

import { evaluateScenarioCharacters } from "./scenario-character-runtime.ts";

async function main(args: readonly string[]): Promise<void> {
  const [charactersPath, ...unexpected] = args;
  if (charactersPath === undefined || unexpected.length > 0) {
    throw new Error("Usage: node character-client.mjs <characters.ts>");
  }
  const result = await evaluateScenarioCharacters(resolve(charactersPath));
  const projection = Match.value(result).pipe(
    Match.when({ tag: "ready" }, ({ characterSheets, observation }) => ({
      tag: "ready" as const,
      characterIds: characterSheets.map(({ characterId }) => characterId),
      observation,
    })),
    Match.when({ tag: "obstructed" }, (obstructed) => obstructed),
    Match.when({ tag: "invalid" }, (invalid) => invalid),
    Match.exhaustive,
  );
  process.stdout.write(`${JSON.stringify(projection, null, 2)}\n`);
  if (result.tag === "invalid") process.exitCode = 1;
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
