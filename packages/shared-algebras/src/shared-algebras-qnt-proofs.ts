import {
  discoverRunBlockProofModules,
  proofModuleTimeoutMs,
  runProofModule as runQntProofModule,
  type ProofModule,
  type ProofModuleOutcome,
} from "../../../scripts/qnt-proof-harness.ts";

const packageRootUrl = new URL("../", import.meta.url);

export function discoverProofModules(): readonly ProofModule[] {
  return discoverRunBlockProofModules({
    packageRootUrl,
    corpusRootRelativePath: "proofs/",
    recursive: true,
  });
}

export { proofModuleTimeoutMs };
export type { ProofModule, ProofModuleOutcome };

export async function runProofModule(
  proofModule: ProofModule,
): Promise<ProofModuleOutcome> {
  return runQntProofModule({ packageRootUrl, proofModule });
}
