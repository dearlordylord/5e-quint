import {
  discoverRunBlockProofModules,
  proofModuleTimeoutMs,
  runProofModule as runQntProofModule,
  type ProofModule,
  type ProofModuleOutcome,
} from "../../../scripts/qnt-proof-harness.ts";

const packageRootUrl = new URL("../", import.meta.url);
const testNamePrefix = "test_";

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

/* v8 ignore start -- @preserve -- QNT proof execution belongs to the opt-in proof lane, not V8 unit coverage. */
export async function runProofModule(
  proofModule: ProofModule,
): Promise<ProofModuleOutcome> {
  return runQntProofModule({
    packageRootUrl,
    proofModule,
    matchPattern: testNamePrefix,
  });
}
/* v8 ignore stop -- @preserve */
