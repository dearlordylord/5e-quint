import { describe, expect, test } from "vitest";

import {
  parseProofShardEnvironment,
  selectProofModulesForShard,
} from "../../../scripts/qnt-proof-harness.ts";
import {
  classifiedInductiveModulePaths,
  discoverInductiveModulePaths,
  inductiveProofModules,
  proofModuleTimeoutMs,
  runInductiveProofModule,
} from "./battle-runtime-qnt-proofs.ts";

const selectedInductiveProofModules = selectProofModulesForShard(
  inductiveProofModules,
  parseProofShardEnvironment(),
);
const runInductiveProofs = process.env.RUN_QNT_INDUCTIVE_PROOFS === "1";

test("Battle inductive proof lane classifies every package-local inductive module", () => {
  expect(classifiedInductiveModulePaths()).toEqual(
    discoverInductiveModulePaths(),
  );

  if (!runInductiveProofs) {
    console.warn(
      `[inductive-proofs] ${inductiveProofModules.length} Battle inductive ` +
        "proof modules are not run by `pnpm test`. Run `pnpm " +
        "proof:qnt:persistent-area-identity` for the focused invariant or " +
        "`pnpm test:qnt-proofs` for the complete package proof lane.",
    );
  }
});

describe.skipIf(!runInductiveProofs)(
  "Battle inductive proofs (opt-in, bounded per module)",
  () => {
    test.concurrent.each(selectedInductiveProofModules)(
      "$modulePath",
      async (proofModule) => {
        const outcome = await runInductiveProofModule(proofModule);
        expect(outcome).toEqual({
          tag: "passed",
          module: proofModule.modulePath,
        });
      },
      proofModuleTimeoutMs + 30_000,
    );
  },
);
