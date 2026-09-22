import {
  assertPdfAuthority,
  assessCandidate,
  ensureRegularOutputFiles,
  evaluationArtifactRoot,
  generateCandidate,
  readPdfPages,
  treeDigest,
} from "./runner.ts";

const artifactRoot = evaluationArtifactRoot(process.argv[2], "benchmark");
generateCandidate(artifactRoot);
ensureRegularOutputFiles(artifactRoot);
const pdfPages = readPdfPages();
assertPdfAuthority(pdfPages);
const assessment = assessCandidate(artifactRoot, pdfPages);
if (assessment.issues.length > 0)
  throw new Error(
    `candidate invariant failures:\n${assessment.issues.join("\n")}`,
  );
const worstSemanticPages = [...assessment.evaluation.pages]
  .sort((left, right) => left.semanticSimilarity - right.semanticSimilarity)
  .slice(0, 20)
  .map((page) => ({
    page: page.page,
    tokenF1: Number(page.tokenF1.toFixed(6)),
    shingleF1: Number(page.shingleF1.toFixed(6)),
    semanticSimilarity: Number(page.semanticSimilarity.toFixed(6)),
    polishFailures: page.polishFailures,
  }));

console.log(
  JSON.stringify(
    {
      metric: {
        name: "qualityLossPpm",
        direction: "lower-is-better",
        value: assessment.evaluation.qualityLossPpm,
      },
      semanticLossPpm: assessment.evaluation.semanticLossPpm,
      polishLossPpm: assessment.evaluation.polishLossPpm,
      generatedPages: assessment.evaluation.generatedPages,
      excludedPages: assessment.evaluation.excludedPages,
      polishFailureCounts: assessment.evaluation.polishFailureCounts,
      oracleAssertions: assessment.oracleAssertions,
      nativeTextOracleMisses: assessment.nativeTextOracleMisses,
      candidateOracleFailurePages: assessment.candidateOracleFailurePages,
      worstSemanticPages,
      artifactDigest: treeDigest(artifactRoot),
      artifactRoot,
    },
    null,
    2,
  ),
);
