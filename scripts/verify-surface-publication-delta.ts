import {
  describeSurfacePublicationDeltaIssue,
  verifySurfacePublicationDelta,
} from "../packages/surface/src/surface/publication-delta-verifier.ts";

const result = verifySurfacePublicationDelta({ repoRoot: process.cwd() });
if (result.tag === "invalid") {
  console.error("Surface publication delta verification failed:");
  for (const issue of result.issues) {
    console.error(`- ${describeSurfacePublicationDeltaIssue(issue)}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Surface publication delta verified against baseline commit ${result.baselineCommit}.`,
  );
}
