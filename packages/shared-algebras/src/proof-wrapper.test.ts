import { describe, expect, test, vi } from "vitest";

const proofHarness = vi.hoisted(() => ({
  runProofModule: vi.fn(async () => ({
    tag: "passed" as const,
    durationMs: 1,
  })),
  runInductiveProofModule: vi.fn(async () => ({
    tag: "passed" as const,
    durationMs: 1,
  })),
}));

vi.mock("../../../scripts/qnt-proof-harness.ts", () => ({
  discoverQntModulePaths: vi.fn(() => []),
  discoverRunBlockProofModules: vi.fn(() => []),
  proofModuleTimeoutMs: 1,
  runProofModule: proofHarness.runProofModule,
  runInductiveProofModule: proofHarness.runInductiveProofModule,
}));

import { runInductiveProofModule } from "./shared-algebras-inductive-proofs.ts";
import { runProofModule } from "./shared-algebras-qnt-proofs.ts";

describe("shared algebra proof wrappers", () => {
  test("thread package ownership into the shared QNT harness", async () => {
    const proofModule = {
      modulePath: "proofs/synthetic-proof.qnt",
      runNames: ["synthetic-proof"],
      testCount: 1,
    } as const;
    const inductiveProofModule = {
      modulePath: "proofs/synthetic-inductive.qnt",
      invariantName: "invariant",
      maxSteps: 1,
    };

    await expect(runProofModule(proofModule)).resolves.toMatchObject({
      tag: "passed",
    });
    await expect(
      runInductiveProofModule(inductiveProofModule),
    ).resolves.toMatchObject({ tag: "passed" });
    expect(proofHarness.runProofModule).toHaveBeenCalledWith(
      expect.objectContaining({ proofModule }),
    );
    expect(proofHarness.runInductiveProofModule).toHaveBeenCalledWith(
      expect.objectContaining({ proofModule: inductiveProofModule }),
    );
  });
});
