// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  createAdrenalineRushRouteDriver,
  createConcentrationBreakTeardownRouteDriver,
  createBattleRuntimeRouteDriver,
  createCommandOrderingRouteDriver,
  createDeathSavingThrowRouteDriver,
  createHitPointRestorationOrderingRouteDriver,
  createMagicMissileRouteDriver,
  createScalarBuffRouteDriver,
  createSaveGatedSpellOrderingRouteDriver,
  createSpellAttackOrderingRouteDriver,
  createWeaponAttackOrderingRouteDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  reducerRoutedSpellAttackOrderingStateCheck,
  reducerRoutedConcentrationBreakTeardownStateCheck,
  reducerRoutedDeathSavingThrowStateCheck,
  reducerRoutedHitPointRestorationOrderingStateCheck,
  reducerRoutedAdrenalineRushStateCheck,
  reducerRoutedMagicMissileStateCheck,
  reducerRoutedCommandOrderingStateCheck,
  reducerRoutedScalarBuffStateCheck,
  reducerRoutedSaveGatedSpellOrderingStateCheck,
  reducerRoutedWeaponAttackOrderingStateCheck,
  reducerRoutedWeaponAttackSkeletonStateCheck,
  run,
} from "./battle-runtime-mbt-driver-kit.ts";

describe("battle reducer route connector MBT", () => {
  it("routes Magic Missile through the shared reducer surface", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-magic-missile.route.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createMagicMissileRouteDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(2),
      stateCheck: reducerRoutedMagicMissileStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes weapon Attack skeleton replay through the shared reducer surface", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-weapon-attack-skeleton.route.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createBattleRuntimeRouteDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(4),
      stateCheck: reducerRoutedWeaponAttackSkeletonStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes weapon Attack ordering through the shared reducer surface", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-weapon-attack-ordering.route.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createWeaponAttackOrderingRouteDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(4),
      stateCheck: reducerRoutedWeaponAttackOrderingStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes save-gated spell ordering through the shared reducer surface", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-save-gated-spell-ordering.route.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createSaveGatedSpellOrderingRouteDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(5),
      stateCheck: reducerRoutedSaveGatedSpellOrderingStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes spell Attack ordering through the shared reducer surface", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-spell-attack-ordering.route.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createSpellAttackOrderingRouteDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(5),
      stateCheck: reducerRoutedSpellAttackOrderingStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes Hit Point restoration through the shared reducer surface", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-hit-point-restoration-ordering.route.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createHitPointRestorationOrderingRouteDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(4),
      stateCheck: reducerRoutedHitPointRestorationOrderingStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes Death Saving Throw through the shared reducer surface", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-death-saving-throw.route.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createDeathSavingThrowRouteDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(3),
      stateCheck: reducerRoutedDeathSavingThrowStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes Concentration teardown through the shared reducer surface", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-concentration-break-teardown.route.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createConcentrationBreakTeardownRouteDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(3),
      stateCheck: reducerRoutedConcentrationBreakTeardownStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes Command effect ordering through the shared reducer surface", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-command-ordering.route.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createCommandOrderingRouteDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(5),
      stateCheck: reducerRoutedCommandOrderingStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes Command Flee opportunity windows to the interrupt stack owner", () => {
    const driver = createCommandOrderingRouteDriver()();
    driver.actions.init.handler({});
    driver.actions.doFleeMovement.handler({});
    driver.actions.doFleeOpportunityAttack.handler({});

    if (driver.getState === undefined) {
      throw new Error("Expected Command route driver state projection.");
    }

    const state = driver.getState();
    expect(state).toMatchObject({
      holes: ["interruptDecision"],
      lastResult: "needsHoles",
      pendingCommandOption: "flee",
      reactionWindowOpen: true,
    });
    expect(state.route.at(-1)).toEqual({
      kind: "resolveBattleSubject",
      subject: "commandEffect",
      fill: "movement",
      holes: ["interruptDecision"],
      owner: "battleInterruptStack",
    });
  });

  it("routes scalar buff effects through the shared reducer surface", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-scalar-buff.route.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createScalarBuffRouteDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(2),
      stateCheck: reducerRoutedScalarBuffStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes bonus-action feature Dash with Temporary Hit Points through the shared reducer surface", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-adrenaline-rush.route.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createAdrenalineRushRouteDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(2),
      stateCheck: reducerRoutedAdrenalineRushStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);
});
