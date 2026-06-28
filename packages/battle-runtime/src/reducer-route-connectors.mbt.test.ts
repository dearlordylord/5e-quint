// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  createAdrenalineRushRouteDriver,
  createActiveFeatureSpellBenefitRouteDriver,
  createAttackActionAreaSaveDamageReplacementRouteDriver,
  createChainedAttackProcedureRouteDriver,
  createConditionRiderRouteDriver,
  createConcentrationBreakTeardownRouteDriver,
  createBattleRuntimeRouteDriver,
  createCommandOrderingRouteDriver,
  createDeathSavingThrowRouteDriver,
  createHitPointRestorationOrderingRouteDriver,
  createHitPointRegainPreventionRouteDriver,
  createIndependentSpellAttackSequenceRouteDriver,
  createMagicMissileRouteDriver,
  createMetamagicRouteDriver,
  createNextAttackRollModeRouteDriver,
  createObjectLightRouteDriver,
  createOpportunityAttackDenialRouteDriver,
  createProtectionCharmRouteDriver,
  createScalarBuffRouteDriver,
  createSaveGatedSpellOrderingRouteDriver,
  createSpellBaseArmorClassEffectRouteDriver,
  createSpellAttackOrderingRouteDriver,
  createWeaponAttackOrderingRouteDriver,
  createWeaponMasteryPropertyRouteDriver,
  createWardedTargetInterdictionRouteDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  reducerRoutedSpellAttackOrderingStateCheck,
  reducerRoutedConcentrationBreakTeardownStateCheck,
  reducerRoutedDeathSavingThrowStateCheck,
  reducerRoutedHitPointRestorationOrderingStateCheck,
  reducerRoutedHitPointRegainPreventionStateCheck,
  reducerRoutedActiveFeatureSpellBenefitStateCheck,
  reducerRoutedAdrenalineRushStateCheck,
  reducerRoutedAttackActionAreaSaveDamageReplacementStateCheck,
  reducerRoutedChainedAttackProcedureStateCheck,
  reducerRoutedConditionRiderStateCheck,
  reducerRoutedIndependentSpellAttackSequenceStateCheck,
  reducerRoutedMagicMissileStateCheck,
  reducerRoutedCommandOrderingStateCheck,
  reducerRoutedMetamagicStateCheck,
  reducerRoutedNextAttackRollModeStateCheck,
  reducerRoutedObjectLightStateCheck,
  reducerRoutedOpportunityAttackDenialStateCheck,
  reducerRoutedProtectionCharmStateCheck,
  reducerRoutedScalarBuffStateCheck,
  reducerRoutedSaveGatedSpellOrderingStateCheck,
  reducerRoutedSpellBaseArmorClassEffectStateCheck,
  reducerRoutedWeaponAttackOrderingStateCheck,
  reducerRoutedWeaponAttackSkeletonStateCheck,
  reducerRoutedWeaponMasteryPropertyStateCheck,
  reducerRoutedWardedTargetInterdictionStateCheck,
  run,
} from "./battle-runtime-mbt-driver-kit.ts";

describe("battle reducer route connector MBT", () => {
  it(
    "routes Magic Missile through the shared reducer surface",
    async () => {
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
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes weapon Attack skeleton replay through the shared reducer surface",
    async () => {
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
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes weapon Attack ordering through the shared reducer surface",
    async () => {
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
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes weapon mastery property substrates through the shared reducer surface",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-weapon-mastery-selected-identity.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createWeaponMasteryPropertyRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(4),
        stateCheck: reducerRoutedWeaponMasteryPropertyStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes Attack-action area save damage replacement substrates through the shared reducer surface",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-attack-action-area-save-damage-replacement.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createAttackActionAreaSaveDamageReplacementRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(4),
        stateCheck:
          reducerRoutedAttackActionAreaSaveDamageReplacementStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes active feature spell benefits through active-effect facts",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-feature-selected-identity.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createActiveFeatureSpellBenefitRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(1),
        stateCheck: reducerRoutedActiveFeatureSpellBenefitStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes Metamagic governor and option substrates through the shared reducer surface",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-sorcerer-metamagic.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createMetamagicRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(1),
        stateCheck: reducerRoutedMetamagicStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes protection, charm, and creature-type substrates through the shared reducer surface",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-creature-type-protection-and-charm-selected-identity.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createProtectionCharmRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(1),
        stateCheck: reducerRoutedProtectionCharmStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes warded-target interdiction through the shared reducer surface",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-sanctuary-selected-identity.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createWardedTargetInterdictionRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(1),
        stateCheck: reducerRoutedWardedTargetInterdictionStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes spell base Armor Class effects through the shared reducer surface",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-spell-base-armor-class-effect.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createSpellBaseArmorClassEffectRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(1),
        stateCheck: reducerRoutedSpellBaseArmorClassEffectStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes save-gated spell ordering through the shared reducer surface",
    async () => {
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
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes spell Attack ordering through the shared reducer surface",
    async () => {
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
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes chained spell Attack procedures through the shared reducer surface",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-chained-attack-sequence.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createChainedAttackProcedureRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(8),
        stateCheck: reducerRoutedChainedAttackProcedureStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes independent spell Attack sequences through the shared reducer surface",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-eldritch-blast.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createIndependentSpellAttackSequenceRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(4),
        stateCheck: reducerRoutedIndependentSpellAttackSequenceStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes Hit Point restoration through the shared reducer surface",
    async () => {
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
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes Hit Point regain prevention through the shared reducer surface",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-hit-point-regain-prevention.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createHitPointRegainPreventionRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(3),
        stateCheck: reducerRoutedHitPointRegainPreventionStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes next Attack Roll mode effects through active-effect and roll-mode owners",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-next-attack-roll-mode.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createNextAttackRollModeRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(3),
        stateCheck: reducerRoutedNextAttackRollModeStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes Opportunity Attack denial through active-effect and reaction-discovery owners",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-opportunity-attack-denial.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createOpportunityAttackDenialRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(3),
        stateCheck: reducerRoutedOpportunityAttackDenialStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes condition and poison riders through lifecycle, repeat-save, and escape owners",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-condition-riders.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createConditionRiderRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(3),
        stateCheck: reducerRoutedConditionRiderStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes object and light riders through object boundary, active-effect, projection, and table-witness owners",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-object-light-riders.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createObjectLightRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(3),
        stateCheck: reducerRoutedObjectLightStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes Death Saving Throw through the shared reducer surface",
    async () => {
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
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes Concentration teardown through the shared reducer surface",
    async () => {
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
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes Command effect ordering through the shared reducer surface",
    async () => {
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
    },
    MBT_TEST_TIMEOUT_MS,
  );

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

  it(
    "routes scalar buff effects through the shared reducer surface",
    async () => {
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
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes bonus-action feature Dash with Temporary Hit Points through the shared reducer surface",
    async () => {
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
    },
    MBT_TEST_TIMEOUT_MS,
  );
});
