import { describe, expect, test } from "vitest";

import {
  classifiedInductiveModulePaths,
  discoverInductiveModulePaths,
  inductiveProofModules,
  proofModuleTimeoutMs,
  runInductiveProofModule,
  stateSpaceRepairInductiveModulePaths,
} from "./shared-algebras-inductive-proofs.ts";

const runInductiveProofs = process.env.RUN_QNT_INDUCTIVE_PROOFS === "1";

test("shared-algebras inductive proof lane is opt-in -- run `pnpm proof:inductive` to check invariants", () => {
  expect(classifiedInductiveModulePaths()).toEqual(
    discoverInductiveModulePaths(),
  );

  if (!runInductiveProofs) {
    console.warn(
      `[inductive-proofs] ${inductiveProofModules.length} shared-algebras ` +
        "inductive proof modules are not run by `pnpm test`. " +
        `${stateSpaceRepairInductiveModulePaths.length} additional modules ` +
        "are classified as requiring state-space repair before entering the " +
        "bounded lane. Run `pnpm proof:inductive` before merging shared QNT " +
        "invariant changes.",
    );
  }
});

describe.skipIf(!runInductiveProofs)(
  "shared-algebras inductive proofs (opt-in, bounded per module)",
  () => {
    for (const proofModule of inductiveProofModules) {
      test(
        proofModule.modulePath,
        async () => {
          const outcome = await runInductiveProofModule(proofModule);
          expect(outcome).toEqual({
            tag: "passed",
            module: proofModule.modulePath,
          });
        },
        proofModuleTimeoutMs + 30_000,
      );
    }
  },
);
