import {
  discoverQntModulePaths,
  discoverRunBlockProofModules,
  proofModuleTimeoutMs,
  runInductiveProofModule as runQntInductiveProofModule,
  runProofModule as runQntProofModule,
  type InductiveProofModule,
  type ProofModule,
  type ProofModuleOutcome,
} from "../../../scripts/qnt-proof-harness.ts";

// Package root holds the `.qnt` corpus; this module lives in `src/`.
const packageRootUrl = new URL("../", import.meta.url);

// Tests in this corpus are `run test_*` blocks. The lane keys both halves on
// this one prefix -- discovery (which files hold tests) and `--match` (which
// names to run) -- so the two can never disagree about what counts as a test.
const testNamePrefix = "test_";
const inductiveProofModulePaths = [
  "battle-runtime-persistent-area-identity-inductive.qnt",
] as const;

export const inductiveProofModules = inductiveProofModulePaths.map(
  (modulePath) => ({
    modulePath,
    invariantName: "persistentAreaIdentityInvariant",
    maxSteps: 1,
  }),
) satisfies ReadonlyArray<InductiveProofModule>;

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

export function classifiedInductiveModulePaths(): readonly string[] {
  return inductiveProofModules
    .map((proofModule) => proofModule.modulePath)
    .sort((left, right) => left.localeCompare(right));
}

export function discoverInductiveModulePaths(): readonly string[] {
  return discoverQntModulePaths({
    packageRootUrl,
    corpusRootRelativePath: "",
    recursive: false,
  }).filter((modulePath) => modulePath.endsWith("-inductive.qnt"));
}

export { proofModuleTimeoutMs };
export type { ProofModuleOutcome };

/* v8 ignore start -- @preserve -- Default coverage deliberately skips the resource-locked, opt-in QNT proof lanes; these wrappers are exercised only by the package proof scripts, and counting them would require running Quint inside the unrelated runtime coverage lane. */
export async function runProofModule(
  proofModule: ProofModule,
): Promise<ProofModuleOutcome> {
  return runQntProofModule({
    packageRootUrl,
    proofModule,
    matchPattern: testNamePrefix,
  });
}

export async function runInductiveProofModule(
  proofModule: InductiveProofModule,
): Promise<ProofModuleOutcome> {
  return runQntInductiveProofModule({ packageRootUrl, proofModule });
}
/* v8 ignore stop -- @preserve */
