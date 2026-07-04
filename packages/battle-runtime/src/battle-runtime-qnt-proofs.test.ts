import { describe, expect, test } from "vitest";

import {
  discoverProofModuleNames,
  proofModuleTimeoutMs,
  runProofModule,
} from "./battle-runtime-qnt-proofs.ts";

const proofModules = discoverProofModuleNames();
const runProofs = process.env.RUN_QNT_PROOFS === "1";

// Always-on in `pnpm test`: a fast, Quint-free reminder plus a glob guard. The
// heavy lane below is opt-in, so without this nag a proof that regressed into a
// forever-running search could sit undetected for weeks -- nobody would run it.
// The `> 0` guard also catches the silent trap where discovery breaks and the
// opt-in lane reports green having executed nothing. See CLAUDE.md
// "QNT proof lane (run consciously)" for why this lane is conscious-only.
test("QNT proof lane is opt-in -- run `pnpm test:qnt-proofs` to check SRD parity", () => {
  expect(proofModules.length).toBeGreaterThan(0);
  if (!runProofs) {
    console.warn(
      `[qnt-proofs] ${proofModules.length} SRD-parity proof modules are not ` +
        "run by `pnpm test` (they are slow). Run `pnpm test:qnt-proofs` before " +
        "merging spec or proof changes to check the specs still match the SRD.",
    );
  }
});

// Heavy SRD-parity proofs: one bounded, isolated `quint test` per module.
// Concurrent module tests are capped by the package Vitest maxConcurrency
// setting. Skipped unless RUN_QNT_PROOFS=1 so a normal `pnpm test` never
// stumbles into the multi-minute corpus run.
describe.skipIf(!runProofs)("QNT proofs (opt-in, bounded per module)", () => {
  test.concurrent.each(proofModules)(
    "%s",
    async (moduleName) => {
      const outcome = await runProofModule(moduleName);
      expect(outcome).toEqual({ tag: "passed", module: moduleName });
    },
    // Outlast the runner's own hard-kill deadline so the child is killed first
    // and the failure carries the captured quint output, not a bare vitest
    // timeout.
    proofModuleTimeoutMs + 30_000,
  );
});
