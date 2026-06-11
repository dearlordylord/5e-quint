// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.bonus-action-dash-temporary-hit-points
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1H-ORC-ADRENALINE-RUSH orc_adrenaline_rush
// UNIT-IDENTITY-MBT-REPLAY: L1H-ORC-ADRENALINE-RUSH orc_adrenaline_rush doAdrenalineRushDash doRejectSecondDash
import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  adrenalineRushStateCheck,
  createAdrenalineRushDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  run,
  runSelectedUnitIdentityReplay,
  type AdrenalineRushSelectedUnitIdentityReplay,
} from "./battle-runtime-mbt-driver-kit.ts";

const adrenalineRushDriverSchema = {
  init: {},
  doAdrenalineRushDash: {},
  doRejectSecondDash: {},
  step: {},
} as const;

const selectedUnitIdentityReplays = [
  {
    taskId: "L1H-ORC-ADRENALINE-RUSH",
    unitId: "orc_adrenaline_rush",
    driver: "adrenalineRush",
    actions: ["doAdrenalineRushDash", "doRejectSecondDash"],
    sequences: [
      {
        name: "bonus-action-dash-grants-temporary-hit-points",
        actions: ["doAdrenalineRushDash"],
        expected: {
          actorTempHp: 3,
          bonusActionAvailable: false,
          dashBonusFeet: 30,
          featureUsesRemaining: 2,
          lastResult: "resolved",
          lastInvalidReason: "",
        },
      },
      {
        name: "spent-bonus-action-rejects-second-dash",
        actions: ["doAdrenalineRushDash", "doRejectSecondDash"],
        expected: {
          actorTempHp: 3,
          bonusActionAvailable: false,
          dashBonusFeet: 30,
          featureUsesRemaining: 2,
          lastResult: "invalid",
          lastInvalidReason: "staleSubject",
        },
      },
    ],
  },
] as const satisfies ReadonlyArray<AdrenalineRushSelectedUnitIdentityReplay>;

describe("Adrenaline Rush MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      for (const sequence of replay.sequences) {
        expect(sequence.actions.length).toBeGreaterThan(0);
      }
      await runSelectedUnitIdentityReplay(replay);
    }
  });

  it("replays Orc Adrenaline Rush Bonus Action Dash and Temporary Hit Points", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-adrenaline-rush.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createAdrenalineRushDriver(adrenalineRushDriverSchema),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(2),
      stateCheck: adrenalineRushStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);
});
