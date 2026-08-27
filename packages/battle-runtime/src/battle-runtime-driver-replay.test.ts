import { describe, expect, test } from "vitest";

import {
  createActiveFeatureSpellBenefitRouteDriver,
  createAdrenalineRushRouteDriver,
  createAttackActionAreaSaveDamageReplacementRouteDriver,
  createBattleRuntimeDriver,
  createBattleRuntimeRouteDriver,
  createChainedAttackProcedureRouteDriver,
  createCommandOrderingRouteDriver,
  createConcentrationBreakTeardownRouteDriver,
  createConditionRiderRouteDriver,
  createDeathSavingThrowRouteDriver,
  createHitPointRestorationOrderingRouteDriver,
  createHitPointRegainPreventionRouteDriver,
  createIndependentSpellAttackSequenceRouteDriver,
  createInterruptStackResumeRouteDriver,
  createLevel1SpatialCompositionRouteDriver,
  createLevel1WeaponHostedSelectedRouteDriver,
  createMagicMissileRouteDriver,
  createMarkedDamageImmunityRouteDriver,
  createMetamagicRouteDriver,
  createMixedTargetOutcomeRouteDriver,
  createNextAttackRollModeRouteDriver,
  createObjectLightRouteDriver,
  createOpportunityAttackDenialRouteDriver,
  createProtectionCharmRouteDriver,
  createRogueSteadyAimDriver,
  createSaveGatedSpellOrderingRouteDriver,
  createScalarBuffRouteDriver,
  createSelectedConcentrationHazardRouteDriver,
  createSpatialEffectRouteDriver,
  createSpellBaseArmorClassEffectRouteDriver,
  createSpellAttackOrderingRouteDriver,
  createWardedTargetInterdictionRouteDriver,
  createWeaponAttackOrderingRouteDriver,
  createWeaponMasteryPropertyRouteDriver,
  reducerRouteDiscoverBattleActs,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";

describe("battle runtime deterministic driver replays", () => {
  test("table-owned area wind strength stays outside the semantic route-hole frontier", () => {
    expect(
      reducerRouteDiscoverBattleActs({
        subject: "spatialEffect",
        holes: [{ kind: "areaWindStrength" }],
        owner: "battleAreaShape",
      }),
    ).toMatchObject({ holes: [] });
  });

  test("save-gated spell route accepts either independent fill ordering", () => {
    const driver = createSaveGatedSpellOrderingRouteDriver()();

    driver.actions.init.handler({});
    driver.actions.doDiscoverAreaSaveDamage.handler({});
    driver.actions.doSubmitDamageBeforeSavingThrow.handler({});
    expect(driver.getState?.()).toMatchObject({ lastResult: "needsHoles" });

    driver.actions.init.handler({});
    driver.actions.doDiscoverAreaSaveDamage.handler({});
    driver.actions.doFillAreaSaveFailed.handler({});
    driver.actions.doFillAreaDamageDice.handler({});
    expect(driver.getState?.()).toMatchObject({ lastResult: "resolved" });

    driver.actions.init.handler({});
    driver.actions.doDiscoverTargetListConditionChoice.handler({});
    driver.actions.doFillTargetListBeforeConditionChoice.handler({});
    driver.actions.doFillConditionChoiceAfterTargetList.handler({});
    driver.actions.doFillConditionSavingThrow.handler({});
    expect(driver.getState?.()).toMatchObject({ lastResult: "resolved" });

    driver.actions.init.handler({});
    driver.actions.doDiscoverTargetListConditionChoice.handler({});
    driver.actions.doFillConditionChoiceBeforeTargetList.handler({});
    driver.actions.doFillTargetListAfterConditionChoice.handler({});
    driver.actions.doFillConditionSavingThrow.handler({});
    expect(driver.getState?.()).toMatchObject({ lastResult: "resolved" });
  });

  test("spell-attack route retains partial fills and accepts typed choices in either order", () => {
    const driver = createSpellAttackOrderingRouteDriver()();

    driver.actions.init.handler({});
    driver.actions.doDiscoverSingleTargetSpellAttack.handler({});
    driver.actions.doSubmitAttackRollBeforeTargetChoice.handler({});
    expect(driver.getState?.()).toMatchObject({ lastResult: "needsHoles" });

    driver.actions.init.handler({});
    driver.actions.doDiscoverSingleTargetSpellAttack.handler({});
    driver.actions.doFillTargetChoice.handler({});
    driver.actions.doSubmitDamageBeforeAttackRoll.handler({});
    expect(driver.getState?.()).toMatchObject({ lastResult: "needsHoles" });

    driver.actions.init.handler({});
    driver.actions.doDiscoverSingleTargetSpellAttack.handler({});
    driver.actions.doFillTargetChoice.handler({});
    driver.actions.doFillAttackRollHit.handler({});
    driver.actions.doFillDamageDice.handler({});
    expect(driver.getState?.()).toMatchObject({ lastResult: "resolved" });

    driver.actions.init.handler({});
    driver.actions.doDiscoverTypedSpellAttack.handler({});
    driver.actions.doFillDamageTypeBeforeTargetChoice.handler({});
    driver.actions.doFillTargetChoiceAfterDamageType.handler({});
    expect(driver.getState?.()).toMatchObject({ lastResult: "needsHoles" });

    driver.actions.init.handler({});
    driver.actions.doDiscoverTypedSpellAttack.handler({});
    driver.actions.doFillTargetChoiceBeforeDamageType.handler({});
    driver.actions.doFillDamageTypeAfterTargetChoice.handler({});
    expect(driver.getState?.()).toMatchObject({ lastResult: "needsHoles" });
  });

  test("healing routes replay single-target and target-list outcomes", () => {
    const healing = createHitPointRestorationOrderingRouteDriver()();
    healing.actions.init.handler({});
    healing.actions.doDiscoverSingleTargetSpellHealing.handler({});
    healing.actions.doSubmitHealingRollBeforeTargetChoice.handler({});
    expect(healing.getState?.()).toMatchObject({ lastResult: "needsHoles" });

    healing.actions.init.handler({});
    healing.actions.doDiscoverSingleTargetSpellHealing.handler({});
    healing.actions.doFillSpellHealingTargetChoice.handler({});
    healing.actions.doFillSpellHealingRoll.handler({});
    expect(healing.getState?.()).toMatchObject({ lastResult: "resolved" });

    healing.actions.init.handler({});
    healing.actions.doDiscoverTargetListSpellHealing.handler({});
    healing.actions.doFillSpellHealingTargetList.handler({});
    healing.actions.doFillSpellHealingRoll.handler({});
    expect(healing.getState?.()).toMatchObject({ lastResult: "resolved" });
  });

  test("condition, marked-damage, concentration, and mixed-target route projections replay", () => {
    const concentration = createConcentrationBreakTeardownRouteDriver()();
    concentration.actions.init.handler({});
    concentration.actions.doCastConcentrationSpell.handler({});
    concentration.actions.doDamageRequestsConcentrationSave.handler({
      damageDiePip: 6,
    });
    concentration.actions.doFailConcentrationSave.handler({
      saveRollTotal: 1,
    });
    expect(concentration.getState?.()).toBeDefined();

    concentration.actions.init.handler({});
    concentration.actions.doCastConcentrationSpell.handler({});
    concentration.actions.doVoluntaryEndConcentration.handler({});
    expect(concentration.getState?.()).toBeDefined();

    concentration.actions.init.handler({});
    concentration.actions.doCastConcentrationSpell.handler({});
    concentration.actions.doCastReplacementConcentrationSpell.handler({});
    expect(concentration.getState?.()).toBeDefined();

    const condition = createConditionRiderRouteDriver()();
    const independentConditionActions = [
      condition.actions.doAdmitAttackHitPoisonConditionRider,
      condition.actions.doRejectAttackHitPoisonConditionRiderByImmunity,
      condition.actions.doExpireAttackHitPoisonConditionRider,
      condition.actions.doAdmitFailedSaveBlindedNextTurnConditionRider,
      condition.actions.doExpireFailedSaveBlindedNextTurnConditionRider,
      condition.actions.doRejectFailedSaveBlindedConditionRiderByImmunity,
      condition.actions
        .doAdmitFailedSaveIncapacitatedProneSelfEndBlockedConditionRider,
    ];
    for (const action of independentConditionActions) {
      condition.actions.init.handler({});
      action.handler({});
      expect(condition.getState?.()).toBeDefined();
    }

    condition.actions.init.handler({});
    condition.actions.doAdmitFailedSaveBlindedRepeatSaveConditionRider.handler(
      {},
    );
    condition.actions.doOpenFailedSaveConditionRepeatSaveFrontier.handler({});
    condition.actions.doResolveFailedSaveConditionRepeatSaveSuccessCleanup.handler(
      {},
    );
    expect(condition.getState?.()).toBeDefined();

    condition.actions.init.handler({});
    condition.actions.doAdmitFailedSaveRestrainedUntilSpellEndEscapeConditionRider.handler(
      {},
    );
    condition.actions.doOpenRestrainedAthleticsEscapeFrontier.handler({});
    condition.actions.doResolveRestrainedAthleticsEscapeSuccessCleanup.handler(
      {},
    );
    expect(condition.getState?.()).toBeDefined();

    condition.actions.init.handler({});
    condition.actions.doAdmitFailedSaveSleepIncapacitatedConditionRider.handler(
      {},
    );
    condition.actions.doOpenSleepRepeatSaveFrontier.handler({});
    condition.actions.doResolveSleepRepeatSaveFailureTransitionToUnconscious.handler(
      {},
    );
    expect(condition.getState?.()).toBeDefined();

    const marked = createMarkedDamageImmunityRouteDriver()();
    const markedDamageActions = [
      marked.actions.doAdmitMarkedDamageRider,
      marked.actions.doAdmitTargetedAbilityCheckMarkedDamageRider,
      marked.actions.doAdmitConditionImmunityTemporaryHitPoints,
    ];
    for (const action of markedDamageActions) {
      marked.actions.init.handler({});
      action.handler({});
      expect(marked.getState?.()).toBeDefined();
    }

    const mixed = createMixedTargetOutcomeRouteDriver()();
    const mixedTargetActions = [
      mixed.actions.doRouteAreaSavingThrowMixedOutcomes,
      mixed.actions.doRouteAttackHitBurstSavingThrowMixedOutcomes,
      mixed.actions.doRouteAttackMissBurstSavingThrowMixedOutcomes,
      mixed.actions.doRouteObjectAttackSecondaryProjection,
      mixed.actions.doRouteAttackHitConditionProjection,
      mixed.actions.doRouteSaveFailureNextAttackProjection,
      mixed.actions.doRouteChainedAttackMixedTargetOutcomes,
    ];
    for (const action of mixedTargetActions) {
      mixed.actions.init.handler({});
      action.handler({});
      expect(mixed.getState?.()).toBeDefined();
    }
  });

  test("scalar buff route resolves and rejects its stale subject", () => {
    const scalarBuff = createScalarBuffRouteDriver()();
    scalarBuff.actions.init.handler({});
    scalarBuff.actions.doFillLongstriderTarget.handler({});
    expect(scalarBuff.getState?.()).toMatchObject({ lastResult: "resolved" });
    scalarBuff.actions.doRejectStaleAfterResolved.handler({});
    expect(scalarBuff.getState?.()).toMatchObject({ lastResult: "invalid" });
  });

  test.each([
    ["direct", createBattleRuntimeDriver],
    ["routed", createBattleRuntimeRouteDriver],
  ] as const)(
    "%s attack driver replays valid and rejected transitions",
    (_label, createDriver) => {
      const driver = createDriver()();

      driver.actions.init.handler({});
      driver.actions.doDiscoverAttack.handler({});
      driver.actions.doRejectWrongTarget.handler({});
      expect(driver.getState?.()).toMatchObject({ lastResult: "invalid" });

      driver.actions.init.handler({});
      driver.actions.doDiscoverAttack.handler({});
      driver.actions.doFillTarget.handler({});
      driver.actions.doFillAttackRollMiss.handler({});
      expect(driver.getState?.()).toMatchObject({ lastResult: "resolved" });
      driver.actions.doRejectStaleAfterResolved.handler({});
      expect(driver.getState?.()).toMatchObject({ lastResult: "invalid" });

      driver.actions.init.handler({});
      driver.actions.doDiscoverAttack.handler({});
      driver.actions.doFillTarget.handler({});
      driver.actions.doFillAttackRollHit.handler({});
      driver.actions.doFillDamageLow.handler({});
      expect(driver.getState?.()).toMatchObject({ lastResult: "resolved" });

      driver.actions.init.handler({});
      driver.actions.doStartSkeletonTurn.handler({});
      driver.actions.doResolveSkeletonMultiattack.handler({});
      driver.actions.doSpendSkeletonMultiattackDispatch.handler({});
      expect(driver.getState?.()).toMatchObject({ lastResult: "resolved" });
    },
  );

  test("magic-missile route replays allocation and exact damage", () => {
    const driver = createMagicMissileRouteDriver()();

    driver.actions.init.handler({});
    driver.actions.doFillMagicMissileAllocation.handler({});
    driver.actions.doFillMagicMissileDamage.handler({ dartRollTotal: 3 });

    expect(driver.getState?.()).toMatchObject({ lastResult: "resolved" });
  });

  test("weapon-attack ordering rejects premature fills and resolves hit damage", () => {
    const driver = createWeaponAttackOrderingRouteDriver()();

    driver.actions.init.handler({});
    driver.actions.doDiscoverAttack.handler({});
    driver.actions.doRejectAttackRollBeforeTargetChoice.handler({});
    expect(driver.getState?.()).toMatchObject({ lastResult: "invalid" });

    driver.actions.init.handler({});
    driver.actions.doDiscoverAttack.handler({});
    driver.actions.doFillTargetChoice.handler({});
    driver.actions.doRejectDamageBeforeAttackRoll.handler({});
    expect(driver.getState?.()).toMatchObject({ lastResult: "invalid" });

    driver.actions.init.handler({});
    driver.actions.doDiscoverAttack.handler({});
    driver.actions.doFillTargetChoice.handler({});
    driver.actions.doFillAttackRollHit.handler({});
    driver.actions.doFillDamageDice.handler({});
    expect(driver.getState?.()).toMatchObject({ lastResult: "resolved" });
  });

  test("chained spell attacks replay terminal and continued-leap routes", () => {
    const driver = createChainedAttackProcedureRouteDriver()();

    driver.actions.init.handler({});
    driver.actions.doStartCast.handler({ slotLevel: 1 });
    driver.actions.doChooseDamageType.handler({});
    driver.actions.doChooseInitialTarget.handler({});
    driver.actions.doResolveStep0AttackHit.handler({});
    driver.actions.doResolveStep0DamageNoDuplicate.handler({});
    expect(driver.getState?.()).toBeDefined();

    driver.actions.init.handler({});
    driver.actions.doStartCast.handler({ slotLevel: 2 });
    driver.actions.doChooseDamageType.handler({});
    driver.actions.doChooseInitialTarget.handler({});
    driver.actions.doResolveStep0AttackHit.handler({});
    driver.actions.doResolveStep0DamageDuplicate.handler({});
    driver.actions.doChooseFirstLeapTarget.handler({});
    driver.actions.doResolveStep1AttackHit.handler({});
    driver.actions.doResolveStep1DuplicateDamageSlot2AllowsLeap.handler({});
    expect(driver.getState?.()).toBeDefined();
  });

  test("independent spell-attack sequence replays miss and hit routes", () => {
    const driver = createIndependentSpellAttackSequenceRouteDriver()();

    driver.actions.init.handler({});
    driver.actions.doFillTwoCreatureTargets.handler({});
    driver.actions.doFillFirstAttackMiss.handler({});
    driver.actions.doFillSecondAttackMiss.handler({});
    expect(driver.getState?.()).toBeDefined();

    driver.actions.init.handler({});
    driver.actions.doFillTwoCreatureTargets.handler({});
    driver.actions.doFillFirstAttackHit.handler({});
    driver.actions.doFillFirstDamageLow.handler({});
    driver.actions.doFillSecondAttackHit.handler({});
    driver.actions.doFillSecondDamageLow.handler({});
    driver.actions.doRejectStaleAfterResolved.handler({});
    expect(driver.getState?.()).toBeDefined();
  });

  test("interrupt continuation routes replay each public resume shape", () => {
    const driver = createInterruptStackResumeRouteDriver()();
    const independentActions = [
      driver.actions.doNestedDeclineResumesOuterInterrupt,
      driver.actions.doShieldMutationResumesInterruptedAttack,
      driver.actions.doReplayRecordedProcedureFromRoot,
    ];

    for (const action of independentActions) {
      driver.actions.init.handler({});
      action.handler({});
      expect(driver.getState?.()).toBeDefined();
    }
  });

  test("death-save and command routes replay legal ordering and typed rejections", () => {
    const deathSave = createDeathSavingThrowRouteDriver()();
    deathSave.actions.init.handler({});
    deathSave.actions.doDiscoverEndTurnDeathSavingThrow.handler({});
    deathSave.actions.doFillDeathSavingThrow.handler({ roll: 10 });
    deathSave.actions.doRejectWrongActorEndTurnAfterResolved.handler({});
    expect(deathSave.getState?.()).toBeDefined();

    const command = createCommandOrderingRouteDriver()();
    command.actions.init.handler({});
    command.actions.doDiscoverCommand.handler({});
    command.actions.doFillTargetList.handler({});
    command.actions.doFillGrovelOption.handler({});
    command.actions.doFillFailedGrovelSavingThrow.handler({});
    command.actions.doFollowGrovel.handler({});
    expect(command.getState?.()).toBeDefined();

    command.actions.init.handler({});
    command.actions.doDropNeedsHeldObjectFacts.handler({});
    command.actions.doFillDropHeldObjectFacts.handler({});
    expect(command.getState?.()).toBeDefined();

    command.actions.init.handler({});
    command.actions.doApproachMovementContinues.handler({});
    command.actions.doFillApproachMovementWithinFive.handler({});
    expect(command.getState?.()).toBeDefined();

    command.actions.init.handler({});
    command.actions.doFleeMovement.handler({});
    command.actions.doRejectFleePartialMovement.handler({});
    expect(command.getState?.()).toBeDefined();

    command.actions.init.handler({});
    command.actions.doDiscoverCommand.handler({});
    command.actions.doSubmitOptionBeforeTargetList.handler({});
    expect(command.getState?.()).toBeDefined();

    command.actions.init.handler({});
    command.actions.doDiscoverCommand.handler({});
    command.actions.doFillTargetList.handler({});
    command.actions.doSubmitSavingThrowBeforeOption.handler({});
    expect(command.getState?.()).toBeDefined();

    const independentCommandActions = [
      command.actions.doHaltSuppresses,
      command.actions.doApproachNoMovement,
      command.actions.doFleeNoMovement,
    ];
    for (const action of independentCommandActions) {
      command.actions.init.handler({});
      action.handler({});
      expect(command.getState?.()).toBeDefined();
    }

    command.actions.init.handler({});
    command.actions.doFleeMovement.handler({});
    command.actions.doFleeOpportunityAttack.handler({});
    expect(command.getState?.()).toBeDefined();
  });

  test("feature activation routes replay resource, movement, and spell benefits", () => {
    const adrenaline = createAdrenalineRushRouteDriver()();
    adrenaline.actions.init.handler({});
    adrenaline.actions.doAdrenalineRushDash.handler({});
    adrenaline.actions.doRejectSecondDash.handler({});
    expect(adrenaline.getState?.()).toMatchObject({
      lastResult: "invalid",
    });

    const steadyAim = createRogueSteadyAimDriver()();
    steadyAim.actions.init.handler({});
    steadyAim.actions.doRejectAfterMoved.handler({});
    expect(steadyAim.getState?.()).toMatchObject({ lastResult: "invalid" });

    steadyAim.actions.init.handler({});
    steadyAim.actions.doSteadyAim.handler({});
    steadyAim.actions.doRejectSecondAim.handler({});
    expect(steadyAim.getState?.()).toMatchObject({ lastResult: "invalid" });

    steadyAim.actions.init.handler({});
    steadyAim.actions.doSteadyAim.handler({});
    steadyAim.actions.doAttackConsumesAdvantage.handler({});
    steadyAim.actions.doEndTurnCleanup.handler({});
    expect(steadyAim.getState?.()).toBeDefined();

    const activeBenefit = createActiveFeatureSpellBenefitRouteDriver()();
    const activeBenefitActions = [
      activeBenefit.actions.doRouteActiveFeatureSpellSaveDcBenefit,
      activeBenefit.actions.doRouteActiveFeatureSpellAttackBenefit,
      activeBenefit.actions.doRouteNonSourceSpellExcluded,
    ];
    for (const action of activeBenefitActions) {
      activeBenefit.actions.init.handler({});
      action.handler({});
      expect(activeBenefit.getState?.()).toBeDefined();
    }
  });

  test("weapon and attack-action connector projections replay every route", () => {
    const mastery = createWeaponMasteryPropertyRouteDriver()();

    mastery.actions.init.handler({});
    mastery.actions.doRouteSapPropertyActiveEffectRider.handler({});

    mastery.actions.init.handler({});
    mastery.actions.doRouteTopplePropertySaveGate.handler({});
    mastery.actions.doRouteTopplePropertyConditionRider.handler({});

    mastery.actions.init.handler({});
    mastery.actions.doRouteCleavePropertyDecision.handler({});
    mastery.actions.doRouteCleavePropertySecondTarget.handler({});
    mastery.actions.doRouteCleavePropertySecondAttack.handler({});
    mastery.actions.doRouteCleavePropertySecondDamage.handler({});
    expect(mastery.getState?.()).toBeDefined();

    const areaReplacement =
      createAttackActionAreaSaveDamageReplacementRouteDriver()();
    const independentAreaReplacementActions = [
      areaReplacement.actions.doDiscoverAreaSaveDamageReplacement,
      areaReplacement.actions.doFillAreaSavingThrows,
      areaReplacement.actions.doFillDamageRoll,
      areaReplacement.actions.doResolveWithoutExtraAttackContinuation,
      areaReplacement.actions.doOpenExtraAttackContinuation,
      areaReplacement.actions.doRejectMissingResource,
      areaReplacement.actions.doRejectMismatchedArea,
      areaReplacement.actions.doRejectInvalidDamageRoll,
    ];
    for (const action of independentAreaReplacementActions) {
      areaReplacement.actions.init.handler({});
      action.handler({});
      expect(areaReplacement.getState?.()).toBeDefined();
    }
  });

  test("feature and interdiction connector projections replay every route", () => {
    const metamagic = createMetamagicRouteDriver()();
    const metamagicActions = [
      metamagic.actions.doRouteMetamagicResourceGovernor,
      metamagic.actions.doRejectMetamagicResourceGovernor,
      metamagic.actions.doRouteBonusActionCastingTime,
      metamagic.actions.doRejectPriorLevelOnePlusSpell,
      metamagic.actions.doResolveQuickenedSaveGatedDamage,
      metamagic.actions.doResolveQuickenedRestoration,
      metamagic.actions.doResolveQuickenedSaveGatedCondition,
      metamagic.actions.doResolveQuickenedSaveGatedConditionImmunity,
      metamagic.actions.doResolveQuickenedDirectCondition,
      metamagic.actions.doResolveQuickenedRollModifier,
      metamagic.actions.doResolveQuickenedAfterMagicActionSpent,
      metamagic.actions.doRouteSavingThrowProtectionSaveGatedDamage,
      metamagic.actions.doRouteSavingThrowProtectionNoEffect,
      metamagic.actions.doRouteSavingThrowRollMode,
      metamagic.actions.doRouteDamageTypeSubstitution,
      metamagic.actions.doRouteEffectiveSpellLevel,
      metamagic.actions.doRouteSpellRangeProjection,
      metamagic.actions.doRouteSpellDurationProjection,
      metamagic.actions.doRouteSpellComponentProjection,
      metamagic.actions.doRouteMissedSpellAttackReroll,
      metamagic.actions.doRouteDamageDiceReroll,
    ];
    for (const action of metamagicActions) {
      metamagic.actions.init.handler({});
      action.handler({});
      expect(metamagic.getState?.()).toBeDefined();
    }

    const protection = createProtectionCharmRouteDriver()();
    const protectionActions = [
      protection.actions.doDiscoverAnimalFriendshipBeastTargetAdmission,
      protection.actions.doResolveAnimalFriendshipFailedSaveCharmed,
      protection.actions.doResolveAnimalFriendshipCasterDamageBreak,
      protection.actions
        .doResolveProtectionFromEvilAndGoodKnownWillingTargetProtection,
      protection.actions
        .doProjectProtectionFromEvilAndGoodScopedAttackDisadvantage,
      protection.actions
        .doPreventProtectionFromEvilAndGoodScopedCharmAndPossession,
      protection.actions
        .doResolveProtectionFromEvilAndGoodRelevantCharmSaveAdvantage,
    ];
    for (const action of protectionActions) {
      protection.actions.init.handler({});
      action.handler({});
      expect(protection.getState?.()).toBeDefined();
    }

    const sanctuary = createWardedTargetInterdictionRouteDriver()();
    const sanctuaryActions = [
      sanctuary.actions.doCastSanctuaryWardCreation,
      sanctuary.actions.doInterdictDirectAttackFailedSaveLoss,
      sanctuary.actions.doInterdictDirectSpellSuccessfulSavePassThrough,
      sanctuary.actions.doRetargetDirectAttackToLegalReplacement,
      sanctuary.actions.doRejectIllegalReplacementTarget,
      sanctuary.actions.doExcludeAreaEffectFromInterdiction,
      sanctuary.actions.doEndWardOnWardedAttackRoll,
      sanctuary.actions.doEndWardOnWardedSpellCast,
      sanctuary.actions.doEndWardOnWardedDamageDealt,
    ];
    for (const action of sanctuaryActions) {
      sanctuary.actions.init.handler({});
      action.handler({});
      expect(sanctuary.getState?.()).toBeDefined();
    }
  });

  test("effect-lifecycle connector projections replay every route", () => {
    const baseArmorClass = createSpellBaseArmorClassEffectRouteDriver()();
    const baseArmorClassActions = [
      baseArmorClass.actions.doRouteUnarmoredTargetAdmission,
      baseArmorClass.actions.doRouteArmoredTargetRejection,
      baseArmorClass.actions.doRouteBaseArmorClassProjection,
      baseArmorClass.actions.doRouteDurationExpiry,
    ];
    for (const action of baseArmorClassActions) {
      baseArmorClass.actions.init.handler({});
      action.handler({});
      expect(baseArmorClass.getState?.()).toBeDefined();
    }

    const regainPrevention = createHitPointRegainPreventionRouteDriver()();
    const regainPreventionActions = [
      regainPrevention.actions.doAdmitAttackHitRegainPreventionEffect,
      regainPrevention.actions.doInterdictLaterHitPointHealing,
      regainPrevention.actions.doExpireAtTurnBoundary,
      regainPrevention.actions.doStutterAfterExpiry,
    ];
    for (const action of regainPreventionActions) {
      regainPrevention.actions.init.handler({});
      action.handler({});
      expect(regainPrevention.getState?.()).toBeDefined();
    }

    const nextAttack = createNextAttackRollModeRouteDriver()();
    const nextAttackActions = [
      nextAttack.actions.doAdmitHostAttackHitNextAttackAdvantageEffect,
      nextAttack.actions.doAdmitHostEffectNextAttackDisadvantageEffect,
      nextAttack.actions.doProjectAdvantageOnLaterAttackAgainstAffectedTarget,
      nextAttack.actions.doProjectDisadvantageOnAffectedTargetNextAttack,
      nextAttack.actions.doExpireAdvantageAtBoundary,
      nextAttack.actions.doExpireDisadvantageAtBoundary,
      nextAttack.actions.doStutterAfterCleanup,
    ];
    for (const action of nextAttackActions) {
      nextAttack.actions.init.handler({});
      action.handler({});
      expect(nextAttack.getState?.()).toBeDefined();
    }

    const opportunityAttackDenial =
      createOpportunityAttackDenialRouteDriver()();
    const opportunityAttackDenialActions = [
      opportunityAttackDenial.actions
        .doAdmitAttackHitOpportunityAttackDenialEffect,
      opportunityAttackDenial.actions
        .doProjectOpportunityAttackDenialIntoMovementReactionDiscovery,
      opportunityAttackDenial.actions
        .doExpireActiveDenialAtAffectedTargetTurnStart,
      opportunityAttackDenial.actions
        .doExpireProjectedDenialAtAffectedTargetTurnStart,
      opportunityAttackDenial.actions.doStutterAfterCleanup,
    ];
    for (const action of opportunityAttackDenialActions) {
      opportunityAttackDenial.actions.init.handler({});
      action.handler({});
      expect(opportunityAttackDenial.getState?.()).toBeDefined();
    }
  });

  test("spatial connector projections replay every route", () => {
    const objectLight = createObjectLightRouteDriver()();
    const objectLightActions = [
      objectLight.actions.doAdmitObjectAttachedEmitter,
      objectLight.actions.doRejectObjectAttachedEmitterWithoutObjectWitness,
      objectLight.actions.doAdmitHeldLightEmitter,
      objectLight.actions.doProjectObjectAttachedBrightDimLight,
      objectLight.actions.doProjectHeldBrightDimLight,
      objectLight.actions.doCleanupObjectAttachedEmitterOnReplacement,
      objectLight.actions.doCleanupHeldEmitterOnHurl,
      objectLight.actions.doCleanupObjectAttachedEmitterOnDuration,
      objectLight.actions.doRecordTableOwnedGeometryAndCoverWitnesses,
      objectLight.actions.doStutterAfterTerminalSurface,
    ];
    for (const action of objectLightActions) {
      objectLight.actions.init.handler({});
      action.handler({});
      expect(objectLight.getState?.()).toBeDefined();
    }

    const spatial = createSpatialEffectRouteDriver()();
    const spatialActions = [
      spatial.actions.doAdmitMovableMultiEmitterLight,
      spatial.actions.doMoveMovableMultiEmitterLight,
      spatial.actions.doAdmitOutlineSightEffect,
      spatial.actions.doProjectOutlineSightAttackAdvantage,
      spatial.actions.doAdmitAreaObscurement,
      spatial.actions.doCleanupAreaObscurementByDuration,
      spatial.actions.doDisperseAreaObscurementByStrongWind,
      spatial.actions.doAdmitAreaHazard,
      spatial.actions.doResolveAreaHazardSavingThrowTrigger,
      spatial.actions.doResolveAreaHazardDifficultTerrainMovement,
      spatial.actions.doResolveAreaHazardMovementDamageTrigger,
      spatial.actions.doCleanupAreaHazard,
      spatial.actions.doAdmitConcentrationBackedAreaHazard,
      spatial.actions.doResolveConcentrationBackedAreaHazardSavingThrowTrigger,
      spatial.actions
        .doResolveConcentrationBackedAreaHazardDifficultTerrainMovement,
      spatial.actions
        .doResolveConcentrationBackedAreaHazardMovementDamageTrigger,
      spatial.actions
        .doCleanupConcentrationBackedAreaHazardAfterConcentrationBreak,
      spatial.actions.doRecordTableOwnedSpatialWitnesses,
      spatial.actions.doStutterAfterTerminalSurface,
    ];
    for (const action of spatialActions) {
      spatial.actions.init.handler({});
      action.handler({});
      expect(spatial.getState?.()).toBeDefined();
    }

    const selectedHazards = createSelectedConcentrationHazardRouteDriver()();
    const selectedHazardActions = [
      selectedHazards.actions.doDiscoverFlamingSphereHazard,
      selectedHazards.actions.doDiscoverMoonbeamMovableZone,
      selectedHazards.actions.doDiscoverSpikeGrowthMovementHazard,
      selectedHazards.actions.doDiscoverWebRestraintHazard,
      selectedHazards.actions.doStutterAfterTerminalSurface,
    ];
    for (const action of selectedHazardActions) {
      selectedHazards.actions.init.handler({});
      action.handler({});
      expect(selectedHazards.getState?.()).toBeDefined();
    }

    const level1Spatial = createLevel1SpatialCompositionRouteDriver()();
    const level1SpatialActions = [
      level1Spatial.actions.doRouteMovableMultiEmitterLight,
      level1Spatial.actions.doRouteOutlineSightAdvantage,
      level1Spatial.actions.doRouteFallMitigation,
      level1Spatial.actions.doRouteAreaObscurementCleanup,
      level1Spatial.actions.doRouteAreaHazardSave,
      level1Spatial.actions.doRouteAreaHazardMovement,
      level1Spatial.actions.doRouteMovementReplacement,
      level1Spatial.actions.doRouteObjectLightEmitter,
      level1Spatial.actions.doRouteHeldLightEmitter,
      level1Spatial.actions.doRouteSavePushPresentation,
      level1Spatial.actions.doStutterAfterTerminalSurface,
    ];
    for (const action of level1SpatialActions) {
      level1Spatial.actions.init.handler({});
      action.handler({});
      expect(level1Spatial.getState?.()).toBeDefined();
    }

    const weaponHosted = createLevel1WeaponHostedSelectedRouteDriver()();
    const weaponHostedActions = [
      weaponHosted.actions.doDivineFavorWeaponDamageRider,
      weaponHosted.actions.doShillelaghWeaponAttackOverride,
      weaponHosted.actions.doTrueStrikeSpellHostedWeaponAttack,
      weaponHosted.actions.doStutterAfterTerminalSurface,
    ];
    for (const action of weaponHostedActions) {
      weaponHosted.actions.init.handler({});
      action.handler({});
      expect(weaponHosted.getState?.()).toBeDefined();
    }
  });
});
