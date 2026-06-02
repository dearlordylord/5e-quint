import { describe, expect, test } from "vitest";

import {
  discoverProofModules,
  proofModuleTimeoutMs,
  runProofModule,
} from "./shared-algebras-qnt-proofs.ts";

const proofModules = discoverProofModules();
const runProofs = process.env.RUN_QNT_PROOFS === "1";

test("shared-algebras QNT proof lane is opt-in -- run `pnpm test:qnt-proofs` to check run-block proofs", () => {
  const modulePaths = proofModules.map((proofModule) => proofModule.modulePath);
  expect(modulePaths).toContain("proofs/multiclass-prerequisite-algebra.qnt");
  expect(
    modulePaths.some((modulePath) =>
      modulePath.startsWith("proofs/rule-core/"),
    ),
  ).toBe(true);

  if (!runProofs) {
    console.warn(
      `[qnt-proofs] ${proofModules.length} shared-algebras proof modules are not ` +
        "run by `pnpm test`. Run `pnpm test:qnt-proofs` before merging shared " +
        "QNT proof changes.",
    );
  }
});

describe.skipIf(!runProofs)(
  "shared-algebras QNT proofs (opt-in, bounded per module)",
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
