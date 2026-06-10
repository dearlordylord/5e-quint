// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.rogue-steady-aim
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L3PUTB-01-ROGUE-STEADY-AIM-RUNTIME rogue_steady_aim
// UNIT-IDENTITY-MBT-REPLAY: L3PUTB-01-ROGUE-STEADY-AIM-RUNTIME rogue_steady_aim doSteadyAim doRejectAfterMoved doRejectSecondAim
import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  createRogueSteadyAimDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  rogueSteadyAimStateCheck,
  run,
  runSelectedUnitIdentityReplay,
  type RogueSteadyAimSelectedUnitIdentityReplay,
} from "./battle-runtime-mbt-driver-kit.ts";

const rogueSteadyAimDriverSchema = {
  init: {},
  doSteadyAim: {},
  doRejectAfterMoved: {},
  doRejectSecondAim: {},
  doAttackConsumesAdvantage: {},
  doEndTurnCleanup: {},
  step: {},
} as const;

const selectedUnitIdentityReplays = [
  {
    taskId: "L3PUTB-01-ROGUE-STEADY-AIM-RUNTIME",
    unitId: "rogue_steady_aim",
    driver: "rogueSteadyAim",
    actions: ["doSteadyAim", "doRejectAfterMoved", "doRejectSecondAim"],
    sequences: [
      {
        name: "bonus-action-aim-projects-next-attack-and-speed-zero",
        actions: ["doSteadyAim"],
        expected: {
          bonusActionAvailable: false,
          actorSpeedFeet: 0,
          nextAttackAdvantageActive: true,
          speedZeroActive: true,
          attackRollMode: "advantage",
          lastResult: "resolved",
          lastInvalidReason: "",
        },
      },
      {
        name: "moved-this-turn-rejects",
        actions: ["doRejectAfterMoved"],
        expected: {
          bonusActionAvailable: true,
          actorSpeedFeet: 30,
          nextAttackAdvantageActive: false,
          speedZeroActive: false,
          attackRollMode: "normal",
          lastResult: "invalid",
          lastInvalidReason: "staleSubject",
        },
      },
      {
        name: "spent-bonus-action-rejects-second-aim",
        actions: ["doSteadyAim", "doRejectSecondAim"],
        expected: {
          bonusActionAvailable: false,
          actorSpeedFeet: 0,
          nextAttackAdvantageActive: true,
          speedZeroActive: true,
          attackRollMode: "advantage",
          lastResult: "invalid",
          lastInvalidReason: "staleSubject",
        },
      },
    ],
  },
] as const satisfies ReadonlyArray<RogueSteadyAimSelectedUnitIdentityReplay>;

describe("Rogue Steady Aim MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      for (const sequence of replay.sequences) {
        expect(sequence.actions.length).toBeGreaterThan(0);
      }
      await runSelectedUnitIdentityReplay(replay);
    }
  });

  it("replays Bonus Action aim, movement rejection, next attack Advantage, Speed 0, and cleanup", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-rogue-steady-aim.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createRogueSteadyAimDriver(rogueSteadyAimDriverSchema),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(4),
      stateCheck: rogueSteadyAimStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);
});
