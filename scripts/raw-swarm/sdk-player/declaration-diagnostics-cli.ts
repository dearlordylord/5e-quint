import { performance } from "node:perf_hooks";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Match } from "effect";
import {
  preparePublicDeclarations,
  publicDeclarationBundleManifest,
  publicDeclarationReviewMatches,
  PUBLIC_DECLARATION_BUNDLE_REVIEWED_MANIFEST,
} from "./consumer-distribution.ts";

const [mode, directory, ...unexpected] = process.argv.slice(2);
if (
  (mode !== "--out" && mode !== "--inspect") ||
  directory === undefined ||
  unexpected.length > 0
) {
  console.error(
    "Usage: pnpm declarations:diagnose --out <fresh-directory> | --inspect <declarations-directory>",
  );
  process.exitCode = 64;
} else {
  const started = performance.now();
  try {
    const report = Match.value(mode).pipe(
      Match.when("--out", () => {
        const output = resolve(directory);
        const prepared = preparePublicDeclarations(output);
        return {
          mode: "emit" as const,
          declarationsDirectory: resolve(output, "declarations"),
          ...prepared,
        };
      }),
      Match.when("--inspect", () => {
        const declarationsDirectory = resolve(directory);
        const actual = publicDeclarationBundleManifest(declarationsDirectory);
        return {
          mode: "inspect" as const,
          declarationsDirectory,
          actual,
          matchesReview: publicDeclarationReviewMatches(
            actual,
            PUBLIC_DECLARATION_BUNDLE_REVIEWED_MANIFEST,
          ),
        };
      }),
      Match.exhaustive,
    );
    const text =
      JSON.stringify(
        {
          ...report,
          reviewed: PUBLIC_DECLARATION_BUNDLE_REVIEWED_MANIFEST,
          durationMilliseconds: performance.now() - started,
        },
        null,
        2,
      ) + "\n";
    if (mode === "--out")
      writeFileSync(resolve(directory, "declaration-review.json"), text);
    process.stdout.write(text);
    process.exitCode = report.matchesReview ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
