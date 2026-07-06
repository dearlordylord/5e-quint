import {
  discoverRunBlockProofModules,
  proofModuleTimeoutMs,
  runProofModule as runQntProofModule,
  type ProofModule,
  type ProofModuleOutcome,
} from "../../../scripts/qnt-proof-harness.ts";

// Package root holds the `.qnt` corpus; this module lives in `src/`.
const packageRootUrl = new URL("../", import.meta.url);

// Tests in this corpus are `run test_*` blocks. The lane keys both halves on
// this one prefix -- discovery (which files hold tests) and `--match` (which
// names to run) -- so the two can never disagree about what counts as a test.
const testNamePrefix = "test_";

// A proof module is any package-root `.qnt` file carrying `run test_*` tests.
// Discovering the corpus by content -- not by a hand-maintained import list --
// means a newly added proof slice cannot silently go unrun. The retired
// `battle-runtime-self-tests.qnt` aggregator had already drifted: two slices
// with real tests were never imported, so the per-commit lane skipped them.
export function discoverProofModules(): readonly ProofModule[] {
  return discoverRunBlockProofModules({
    packageRootUrl,
    corpusRootRelativePath: "",
    recursive: false,
    runNamePrefix: testNamePrefix,
  });
}

export { proofModuleTimeoutMs };
export type { ProofModuleOutcome };

export async function runProofModule(
  proofModule: ProofModule,
): Promise<ProofModuleOutcome> {
  return runQntProofModule({
    packageRootUrl,
    proofModule,
    matchPattern: testNamePrefix,
  });
}
