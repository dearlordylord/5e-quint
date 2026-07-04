import {
  discoverQntModulePaths,
  proofModuleTimeoutMs,
  runInductiveProofModule as runQntInductiveProofModule,
  type InductiveProofModule,
  type ProofModuleOutcome,
} from "../../../scripts/qnt-proof-harness.ts";

const packageRootUrl = new URL("../", import.meta.url);

const invariantName = "invariant";
const maxSteps = 1;

const rootAlgebraInductiveProofModules = [
  "proofs/action-economy-algebra-inductive.qnt",
  "proofs/conditions-algebra-inductive.qnt",
  "proofs/death-saves-algebra-inductive.qnt",
] as const;

const ruleCoreInductiveProofModules = [
  "proofs/rule-core/action-turn-procedures-inductive.qnt",
  "proofs/rule-core/attack-damage-composition-inductive.qnt",
  "proofs/rule-core/damage-component-adjustments-inductive.qnt",
  "proofs/rule-core/hit-point-damage-inductive.qnt",
  "proofs/rule-core/hit-point-recovery-inductive.qnt",
  "proofs/rule-core/movement-spatial-grapple-inductive.qnt",
  "proofs/rule-core/reactions-continuations-concentration-inductive.qnt",
  "proofs/rule-core/spell-procedure-profiles-inductive.qnt",
  "proofs/rule-core/stat-block-controls-inductive.qnt",
  "proofs/rule-core/unit-feature-procedure-profiles-inductive.qnt",
  "proofs/rule-core/zero-hit-point-lifecycle-inductive.qnt",
] as const;

export const stateSpaceRepairInductiveModulePaths = [] as const;

const inductiveProofModulePaths = [
  ...rootAlgebraInductiveProofModules,
  ...ruleCoreInductiveProofModules,
] as const;

export const inductiveProofModules = inductiveProofModulePaths.map(
  (modulePath) => ({
    modulePath,
    invariantName,
    maxSteps,
  }),
) satisfies ReadonlyArray<InductiveProofModule>;

export function classifiedInductiveModulePaths(): readonly string[] {
  return [
    ...inductiveProofModules.map((proofModule) => proofModule.modulePath),
    ...stateSpaceRepairInductiveModulePaths,
  ].sort((left, right) => left.localeCompare(right));
}

export function discoverInductiveModulePaths(): readonly string[] {
  return discoverQntModulePaths({
    packageRootUrl,
    corpusRootRelativePath: "proofs/",
    recursive: true,
  }).filter((modulePath) => modulePath.endsWith("-inductive.qnt"));
}

export { proofModuleTimeoutMs };
export type { InductiveProofModule, ProofModuleOutcome };

export async function runInductiveProofModule(
  proofModule: InductiveProofModule,
): Promise<ProofModuleOutcome> {
  return runQntInductiveProofModule({ packageRootUrl, proofModule });
}
