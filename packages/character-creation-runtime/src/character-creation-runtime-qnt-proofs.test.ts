import { describe, expect, test } from "vitest";

import {
  discoverProofModules,
  proofModuleTimeoutMs,
  runProofModule,
} from "./character-creation-runtime-qnt-proofs.ts";

const proofModules = discoverProofModules();
const runProofs = process.env.RUN_QNT_PROOFS === "1";

test("character-creation QNT proof lane is opt-in -- run `pnpm test:qnt-proofs` to check run-block proofs", () => {
  expect(proofModules.map((proofModule) => proofModule.modulePath)).toContain(
    "character-creation-runtime-slice-tests.qnt",
  );

  if (!runProofs) {
    console.warn(
      `[qnt-proofs] ${proofModules.length} character-creation proof modules are not ` +
        "run by `pnpm test`. Run `pnpm test:qnt-proofs` before merging " +
        "character-creation QNT proof changes.",
    );
  }
});

describe.skipIf(!runProofs)(
  "character-creation QNT proofs (opt-in, bounded per module)",
  () => {
    for (const proofModule of proofModules) {
      test(
        proofModule.modulePath,
        async () => {
          const outcome = await runProofModule(proofModule);
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
