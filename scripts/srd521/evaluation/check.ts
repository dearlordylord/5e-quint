import { resolve } from "node:path";

import {
  assertPdfAuthority,
  assessCandidate,
  ensureRegularOutputFiles,
  evaluationArtifactRoot,
  generateCandidate,
  readPdfPages,
  treeDigest,
} from "./runner.ts";

const artifactRoot = evaluationArtifactRoot(process.argv[2], "check");
const first = resolve(artifactRoot, "first");
const second = resolve(artifactRoot, "second");
generateCandidate(first);
generateCandidate(second);
ensureRegularOutputFiles(first);
ensureRegularOutputFiles(second);
const pdfPages = readPdfPages();
assertPdfAuthority(pdfPages);
const firstAssessment = assessCandidate(first, pdfPages);
const secondAssessment = assessCandidate(second, pdfPages);
const firstDigest = treeDigest(first);
const secondDigest = treeDigest(second);
const issues = [
  ...firstAssessment.issues,
  ...secondAssessment.issues,
  ...(firstDigest === secondDigest
    ? []
    : ["two clean generations produced different artifact digests"]),
  ...(firstAssessment.evaluation.qualityLossPpm ===
  secondAssessment.evaluation.qualityLossPpm
    ? []
    : ["two clean generations produced different quality metrics"]),
];
if (issues.length > 0)
  throw new Error(`SRD generation checks failed:\n${issues.join("\n")}`);

console.log(
  JSON.stringify(
    {
      status: "accepted",
      artifactDigest: firstDigest,
      qualityLossPpm: firstAssessment.evaluation.qualityLossPpm,
      oracleAssertions: firstAssessment.oracleAssertions,
      nativeTextOracleMisses: firstAssessment.nativeTextOracleMisses,
      candidateOracleFailurePages: firstAssessment.candidateOracleFailurePages,
      deterministicRuns: 2,
    },
    null,
    2,
  ),
);
