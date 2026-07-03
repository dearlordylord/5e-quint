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

export async function runProofModule(
  proofModule: ProofModule,
): Promise<ProofModuleOutcome> {
  return runQntProofModule({
    packageRootUrl,
    proofModule,
    matchPattern: testNamePrefix,
  });
}
