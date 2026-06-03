I have enough data. Producing the final report.

---

# `battle-reducer.ts` Dependency Map

**Source**: `/Users/firfi/work/typescript/dnd/.claude/worktrees/agent-a92bcce8ee30a53f7/packages/battle-runtime/src/battle-reducer.ts`
**Size**: 30,566 LOC, 719 `function` declarations (20 exported), 97 `export type/interface`, 135 internal types, 5 exported `const` (Schemas + REASON_CODES).
**Imports already moved**: 54 lines of constants + 25 of helpers + barrel — extraction so far ≈ 79 LOC.

---

## 1. Function inventory (clustered)

719 `function`s organized by line range. Format: `[lineStart..lineEnd] count: leaf-export names ; representative internal names`. Internal names listed only when topically distinctive.

### Cluster A — `types_and_schemas` (276..4480, 7 stray funcs, 3,546 LOC)
Largely constants, types, `Schema.*` unions. The 7 functions in this band:
- 935 `isPreparedDamageSpellSource` (5)
- 940 `damageSpellSource` (144)
- 1084 `isScalarBuffTargetListInvocation` (16)
- 1100 `isTargetListSpellInvocation` (561) — heavy nested type-narrowing helper
- 1661 `ongoingFeatureSourceKey` (6)
- 1667 `ongoingFeatureSourceForUnit` (6)
- 1673 `ongoingFeatureSourceKeyForUnit` (6)

Exports: `ActiveOngoingFeatureOccurrenceSnapshotSchema` (1638), `BattleHoleSchema` (2802), `BattleFillSchema` (3481), `BATTLE_INVALID_REASON_CODES` (3883), `BattleSnapshotSchema` (4358).

### Cluster B — `api_lifecycle` (4481..4666, 4 funcs, ~437 LOC including `discoverBattleActs` start)
- 4481 **E** `startBattle` (69)
- 4550 **E** `addBattleCombatant` (41)
- 4591 **E** `removeBattleCombatants` (76)

### Cluster C — `subjects_discovery` (4667..5322, 23 funcs, 405 LOC)
Discovers what acts a subject can take. Anchor:
- 4667 **E** `discoverBattleActs` (251) — top dispatch, calls into ~10 clusters
- `releaseGrappleActs`, `movementActs`, `dashActsForActor`, `dashSubjectForSpeedKind`, `bonusActionDashSubjectForSpeedKind`, `statBlockMultiattackActs`, `statBlockBonusActionOptionActs`, `supportedStatBlockMultiattacks`, `supportedLiteralMultiattackDispatches`, `isSupportedLiteralMultiattackDispatch`, `supportedStatBlockBonusActionOptions`, `supportedStatBlockBonusActionStandardAction`, `isStatBlockMultiattackActionResource`, `isClassFeatureExtraAttackActionResource`, `actorHasStatBlockMultiattackActionResource`, `currentActorHasOpenStatBlockMultiattackDispatch`, `actorHasClassFeatureExtraAttackActionResource`, `canSpendEscapeGrappleActionResource`, `subjectAllowedDuringStatBlockMultiattackDispatch`, `hasTurnActionResource`, `spendTurnAction`, `isStatBlockBattleCreatureState`, `standardActionLabel`

### Cluster D — `subject_resolution` (5323..5797, 9 funcs, 475 LOC)
- 5323 **E** `resolveBattleSubject` (6)
- 5329 `resolveBattleSubjectInternal` (372) — large dispatcher
- `actionHideSubject`, `actionSearchSubject`, `isReleaseGrappleSubject`, `standardActionKindForSubject`, `consumeOrCloseLegendaryActionWindow`, plus 5779 `openBattleReactionWindow` (E) and `reactionInterruptFrame` straddling into reactions

### Cluster E — `reactions` (5798..7336, 44 funcs, 1,539 LOC)
- 5798 **E** `resolveBattleReaction` (131)
- spend/modifier helpers (`spendReaction`, `spendReactionModifierResource`, `reactionModifierResourceUnitId`)
- `resolveReactionRollOrDamageReduction` (101), `resolveCastTriggeredReactionSpellCommand` (118), `completeResolvedActiveReactionIfPending`
- reaction-modifier reduction roll math (`reactionModifierReductionRoll`, `reactionModifierReductionTotal`, `reactionReductionResourceDieRollTotal/Label`, `isBattleRolledDiceFill`, `attackDamageReductionZeroDamageRedirectSelection` (101))
- after-damage events (`attackDamageEvent*` x 7), `resolveAttackDamageReductionZeroDamageRedirectAfterReduction` (127)
- continuation/replay frames (`replayContinuationFrame`, `resolveReplayContinuation`, `resolveReplayContinuationFromState`, `activeReactionWithReplayContinuationAttackDamageReductions`, `resolveAttackDamageContinuationConcentration` (48), `attackDamageContinuationConcentrationFill`)
- equality helpers (`battleFillEquals`, `rolledDiceGroupsEqual`, `attackDamageRiderSelectionsEqual`)

### Cluster F — `turn` (7337..8243, 33 funcs, 907 LOC)
- 7337 **E** `endTurn` (17)
- 7354 **E** `snapshotBattle` (31) + `battleTurnSnapshot`, `pendingReactionSnapshot`
- reaction-window orchestration: `currentInterruptFrame`, `currentReactionFrame`, `reactionDecisionHole`, `reactionTriggerLabel`, `unofferedEligibleReactors`, `maybeOpenReactionWindow` (61), `readiedSpellReactionChoices`, `readiedMovementReactionChoices`, `triggeredReactionSpellChoices` (56), `triggeredReactionSpellTurnResourceAvailable`, `currentActorHasPendingSlottedSpellCast`, `shieldReactionSpellMatchesTrigger`, `reactionChoices`, `reactionRollOrDamageReductionChoices`, `reactionRollOrDamageReductionChoiceForProfile` (145)
- visibility/hole sundries (`combatantCanSee`, `reactionModifierRollHole`, `attackDamageReductionZeroDamageRedirectHoles` (61), `attackDamageReductionZeroDamageRedirectTargetChoices`, `attackDamageReductionRedirectResourceAvailable`, `spendAttackDamageReductionRedirectResource`, `attackDamageReductionRedirectResource`, `hasAttackDamageReductionRedirectTargetSpatialFact`, `characterAbilityModifier`, `abilityProficiencyDifficultyClass`, `attackDamageReductionOriginalDamageType`, `reactionModifierResourceAvailable`, `reactionModifierResourceSpend`, `opportunityAttackReactionChoices`)

### Cluster G — `creature_state` (8244..9122, 46 funcs, 879 LOC)
- 8244 `battleCreatureStateFromInit` (116) and assertion helpers
- snapshots: `combatantSnapshot`, `combatantOriginSnapshot`, `characterResourceSnapshot`, `combatantZeroHpLifecycleSnapshot`
- knock-out brand helpers: `knockedOutOneHp`, `knockedOutConditionState`, `battleCreatureStateWithKnockOutPreservedConditions`, `nonKnockOutLifecycleFields`, `battleCreatureStateWithoutKnockOut`, `battleCreatureStateWithDamageProjection`, `initialKnockOutLifecycleFields`
- 8813 **E** `combatantKnockedOutUnconscious` (15)
- can-act helpers: `combatantCanTakeActions`, `combatantCanTakeReactions`, `activeConditions`, `grappledBy`, `combatantHandUses`, `handUseForOccupancy`, `battleSubjectActorId`, `isLegendaryAttackSubject`, `statBlockLegendaryActionWindowIsOpen`, `closeLegendaryActionWindow`, `consumeLegendaryActionWindow`
- character feature profile aggregators: `characterOngoingFeatureProfiles`, `characterAttackDamageRiderProfiles`, `characterSaveDamageReplacementProfiles`, `characterReactionRollOrDamageReductionProfiles`, `characterFailedAbilityCheckResourceBoostProfiles`
- `unitRefSupportsProfile`, `unitRefSupportsProfileKind`, `literalStatBlockNumber`, `currentActorId`, `activeOngoingFeatureOccurrencesForCombatant`, `ongoingFeatureProfileForSourceKey`, `combatantWearingArmorCategory`, `normalizeEarlyEndedOngoingFeatures`, `activeEffectArmorClass`, `initialZeroHpLifecycleForCreatureOrigin`, `positiveHpUnconsciousInitIssue`, `hidePrerequisitesReferenceCombatantsIssue`, `assertCharacterBattleResourcesHaveUniqueUnits/Features`, `assertCharacterBattleLoadoutMatchesHands`, `literalCreatureSize`, `combatantInitiativeInsertionIndex`

### Cluster H — `attack_resolution` (9123..12403, 57 funcs, 3,281 LOC)
- 9123 **E** `battleCreatureInitFromStatBlock` (21)
- 9144 **E** `breakBattleConcentration` (19), 9163 `breakBattleConcentrationAfterDamage`
- 9193 **E** `resolveBattleConcentrationDamage` (18)
- 9211 `resolveAttack` (771) — **largest single function**
- 9982 `needsAttackDamageConcentrationResult`
- standard action resolvers: `resolveDash`, `applyDashToActor`, `resolveDisengage`, `resolveBonusActionStandardAction`, `resolveBonusActionDash`, `resolveBonusActionDashTemporaryHitPoints`, `applyTemporaryHitPoints`, `resolveBonusActionDisengage`, `applyDisengage`, `resolveDodge`, `resolveReady`, `resolveHelpAttack` (100), `resolveHide` (77), `resolveMultiattack` (90), `resolveSearch` (66)
- help-attack hole helpers (`helpAttackAllyHole`, `helpAttackTargetHole`, `helpAttackAllyChoices`, `helpAttackTargetChoices`, `hasHelpAttackTargetSpatialFact`)
- 10760 `resolveOffHandAttack` (434), `spendOffHandBonusAction`
- statblock bonus actions: `resolveStatBlockBonusActionOption`, `resolveStatBlockBonusActionDisengage`, `resolveStatBlockBonusActionHide`
- grapple: `resolveGrapple` (80), `resolveEscapeGrapple` (73), `resolveEscapeSpellRestraint` (78), `resolveReleaseGrappleCommand`
- shared hole/fill helpers (cohabits cluster): `assertCurrentHpWithinMaxHp`, `attackFillSet` (157), `validateUniqueAttackTargetRangeFacts`, `abilityCheckFill`, `hideAbilityCheckHole`, `searchAbilityCheckHole`, `escapeSpellRestraintAbilityCheckHole`, `spellSaveDcForCaster`, `grappleFillSet`, `validateAttackDamageFill` (57), `validateRolledDiceForWeaponAttack` (63), `fixedAttackDamageAmount`, `fixedAttackDamageByTypeEntries`, `attackRollHitsWithCriticalThreshold`, `attackRollIsCriticalHit`, `criticalThresholdForAttack`, `attackUsesWeaponOrUnarmedStrikeCriticalRange`, `compatibleAttackActionResource`, `spendAttackActionResource`, `classFeatureExtraAttackForActor`, `openClassFeatureExtraAttackResource`, `spendAttackAction` (105)

### Cluster I — `turn_end_movement` (12404..13987, 30 funcs, 1,584 LOC)
- 12404 `resolveEndTurn` (106), `resetSpellDamageReductionsForNewTurn`
- expiration/tick helpers: `expireStartOfTurnEffects`, `applyStartOfTurnActiveEffects`, `expireEndOfTurnEffects`, `tickDurationEffects`, `expireActiveEffects`, `expireStartOfTurnOngoingFeatures`, `expireEndOfTurnOngoingFeatures`, `expireOngoingFeatures`, `resetBattleTurnResources`
- 12717 `resolveEndTurnCommand` (105), `statBlockRechargeRollFillMatchesHole`
- 12843 `resolveMoveCommand` (60)
- 12903 `resolveStandFromProneCommand` (40), `standFromProneCostFeet`
- 12961 `resolveOpportunityAttackCommand` (555) — second-largest function
- movement holes: `movementHole`, `readiedMovementHole`, `movementHoleWithBudget`, `readiedMovementBudgetForActor`
- 13587 `parseBattleMovement` (104), `applyBattleMovement` (40), `normalizeBattleGrapples`
- readied: `readiedSpellInitialHoles`, `readiedMovementInitialHoles`, 13775 `resolveReleaseReadiedSpellCommand` (69), 13844 `resolveReleaseReadiedMovementCommand` (100), `resetStartOfTurnCombatant`, `resetPerTurnCharacterResources`

### Cluster J — `unit_features` (13988..14899, 24 funcs, 912 LOC)
- 13988 `discoverLegendaryActionActs` (42), `supportedUnitFeatureActs` (76), `isCharacterBattleCreatureState`, `supportedUnitFeatureProfileForResource`, `resolveUnitFeature` (58)
- 14182 **E** `resolveFailedAbilityCheckResourceBoost` (83)
- 14265 **E** `resolveSuccessfulAbilityCheckReactionReduction` (114)
- 14379 `hasReactionRollOrDamageReductionRangeFact`, `resolveExtraActionGrantUnitFeature` (68), `resolveSelfBonusActionHealingUnitFeature` (70), `ongoingFeatureIsAvailable` (35), `resolveOngoingFeatureUnitFeature` (95), `activeOngoingFeatureOccurrenceFromProfile` (39), `requireEndOfTurnOngoingFeatureExpiration`, `ongoingFeatureExpirationFromProfile`, `extendOngoingFeatureToEndOfNextTurn`, `clampOngoingFeatureExpiration`
- self-bonus-action healing: `selfBonusActionHealingRollFill`, `selfBonusActionHealingRollHole`, `selfBonusActionHealingStaleMessage`, `selfBonusActionHealingRollProtocolId/HoleId/HoleInstanceKey`, `selfBonusActionHealingAmount`

### Cluster K — `spells_discovery` (14900..15423, 10 funcs, 524 LOC)
- 14900 `discoverSupportedSpellInvocations` (323)
- 15223 `spellInvocationCastSummary` (57)
- `spellActivationInvocationCastSummary`, `spellSubjectTagForInvocation`, `activeOngoingFeaturesPreventSpellcasting`, `spellInvocationIsSpellcasting`, `spellInvocationCasterPrerequisiteIsMet`, `spellRequiresVerbal`, `isReadiedSpellInvocation`, `readiedSpellAct`

### Cluster L — `spells_resolve` (15424..21001, 45 funcs, 5,578 LOC)
- 15424 `resolveSpellAct` (672)
- 16096 `resolveChainedSpellAttackDamageAct` (358), `resolveCompletedChainedSpell`, `emptyChainedSpellStepFills`, `chainedSpellFillSet` (124), `chainedSpellStepIndexForFill`, `chainedSpellLaterStepsAreEmpty`, `validateChainedSpellFollowUpFills`, `damageRollHasDuplicateD8Face`, `validateChainedSpellDamageFill`, `chainedSpellDamageAmountForTarget`, `applyChainedSpellDamage`
- 16817 `resolveBonusActionSpellAct` (136)
- 16953 `resolveHeldLightSpellAct` (67)
- 17020 `resolveWeaponDamageRiderSpellAct` (88)
- 17108 `resolveMarkedDamageRiderSpellAct` (154)
- 17387 `resolveScalarBuffSpellAct` (131)
- 17518 `resolveRollModifierSpellAct` (111)
- 17629 `resolveCreatureTypeProtectionSpellAct` (84)
- 17713 `resolveDamageReductionSpellAct` (119)
- target-selection helpers: `healingSpellTargetSelection`, `scalarBuffSpellTargetSelection`, `rollModifierSpellTargetSelection`, `creatureTypeProtectionSpellTargetSelection`, `rollModifierSpellSkillSelection`, `rollModifierSpellAffectedTargets`
- 18398 `resolveReadySpellAct` (103)
- 18501 `resolveSpellRelease` (317), `resolveSaveGateDamageSpellRelease`
- 18896 `spellFillSet` (371), `spellFillSetSavingThrowTargeting`, `concentrationSavingThrowFillFor`
- 19291 `resolvePreparedSlotSpellRelease`, 19308 `resolvePreparedSlotSpellAct` (294)
- 19602 `resolveAttackBurstSaveDamageSpellAct` (543)
- 20145 `resolveSaveGateDamageSpellAct` (328)
- 20473 `resolveSaveGateConditionSpellAct` (171)
- 20644 `resolveSaveGateAttackRollAdvantageSpellAct` (109)
- `validateSavingThrowOutcomes` (140), `spendSpellCastResources` (82), `spellRequiresConcentration`, `startSpellEffectConcentration`

### Cluster M — `damage_apply` (21002..21801, 29 funcs, 800 LOC)
- 21002 `applyAttackDamage` (71), `applyAttackDamageAmount` (62)
- `recordAttackDamageUnitsUsed`, `markMarkedDamageRiderTransferAvailable`, `removeSpellConditionEffectsFromTargetDamagedByCasterOrAlly` (58)
- `applyHpDamage`, `hpDamageProjection`, `damageAllowsKnockOut`, `zeroHitPointReplacementCanApply`, `zeroHitPointReplacementResource`, `applyZeroHitPointReplacement`, `battleCreatureStateWithKnockedOutUnconsciousFields`, `applyKnockOut`
- `applyHpHealing`, `applyInitialZeroHpLifecycle`, `applyDropToZeroHpLifecycle`, `applyDamageAtZeroHp`, `startTurnDeathSavingThrowRequired`, `applyStartTurnDeathSavingThrow`, `deathSavingThrowHole`, `statBlockRechargeRollHole`, `unavailableRechargeTargets`, `processStatBlockRechargeRolls`, `concentrationSavingThrowHole`, `applyInstantDeath`, `withoutConcentration`, `breakCombatantConcentration` (42), `concentrationBrokenEffectFrom`, `zeroHpLifecycleIsTerminal`

### Cluster N — `damage_helpers` (21802..22214, 20 funcs, 413 LOC)
By-type damage decomposition; `attackDamageByTypeEntries`, `attackDamageByType`, `damageAmountByTypeEntriesToMap`, `damageAmountByTypeMapEntries`, `isSpellDamageReductionRollFill`, `spellDamageReductionRoll{ProtocolId,Hole}`, `availableSpellDamageReduction`, `spellDamageReductionRollForTarget`, `applyAvailableSpellDamageReduction` (43), `applySpellDamageReductions` (58), `entriesAfterProportionalDamageReduction`, `ongoingFeatureDamageModifier`, `activeSpellWeaponDamageRiders`, `activeMarkedDamageRiderEffect`, `activeMarkedDamageRiders`, `ongoingFeatureDamageModifierApplies`, `addDamageAmountForType`, `damageAmountByTypeAfterTargetAdjustments`, `damageAmountAfterTargetAdjustments`

### Cluster O — `spells_profiles` (22215..25358, 96 funcs, 3,144 LOC)
- 22215 `supportedSpellActs` (146)
- supported{CantripHeldLightSpell,CantripHeldLightHurlSpell,PreparedShieldReactionSpell,PreparedHealingSpell,PreparedSlotSpell,PreparedScalarBuffSpell,PreparedRollModifierSpell,PreparedCreatureTypeProtectionSpell,PreparedConditionImmunityAndTurnStartTemporaryHitPointsSpell,PreparedWeaponDamageRiderSpell,PreparedMarkedDamageRiderSpell,CantripRollModifierSpell,CantripDamageReductionSpell,PreparedPersistentSpell,CantripSpellAttack,PreparedSpellAttack,PreparedChainedSpellAttackDamage,PreparedAttackBurstSaveDamage,SpellAttackDamage,CantripSaveGateDamage,PreparedSaveGateDamage,PreparedSaveGateCondition,PreparedSaveGateAttackRollAdvantage,SaveGateDamage}Profile* — ~25 profile predicates
- spell-specific bodies (`faerieFireSaveGateAttackRollAdvantageSpell`, `animalFriendshipSaveGateConditionSpell`, `colorSpraySaveGateConditionSpell`, `entangleSaveGateConditionSpell`)
- targeting/range helpers (`healingSpellTargeting`, `healingSpellActionCost`, `healingSpellTargetBounds`, `healingSpellRangeFeet`, `scalarBuffSpellActionCost/RangeFeet/Targeting/TargetCount/Effect`, `rollModifierSpellProjection/Targeting/ActiveEffect`, `damageReductionSpellProjection`, `creatureTypeProtectionSpellProjection`, `saveGateTargeting`, `areaSaveGateSpellRangeFeet`, `singleTargetSpellRangeFeet`, `supportedSpellAttackKind`, `spellAttackKindForRedirect`, `spellAttackDamageTargeting`, `primaryTargetOriginEmanationTargeting`, `supportedSaveGateConditionSpell`, `supportedSpellPostDamageRiders`, `supportedSaveGateFailedSaveEffects`, `supportedFailedSavePostDamageRiders`, `supportedRepeatedEffectCount`, `supportedDamageAmountExpr`, `diceExprWithDelta`, `supportedHealingAmountExpr`, `spellHasAvailableSpend`, `spellActTurnResourceAvailable`, `markSpellSlotExpendedThisTurn`)
- shape predicates (`isProduceFlameOngoingEffectSpell`, `isChromaticOrbContinuationLimitSetShape`, `isRayOfSicknessPoisonedRiderShape`, `isShockingGraspOpportunityAttackRiderShape`, `isGuidingBoltNextAttackRiderShape`, `isViciousMockeryNextAttackRiderShape`)
- equality (`sameStringSet`, `sameDiceExpr`, `sameCreatureTypeSet`, `rollModifierKindsAreSupported`, `rollModifierSkillFilter`, `scalarBuffActiveEffectExpiration`, `supportedTemporaryHitPointsAmountExpr`, `rollModifierDelta`)

### Cluster P — `spells_holes_fills` (25359..27314, 73 funcs, 1,957 LOC)
- 25359 `supportedSpellInvocationRef` (127), `damageSpellInvocationRef`, `sameSpellInvocationRef`, `supportedSpellInvocationMatchesRef`
- spell holes: `spellAttackRollHole`, `spellDamageTypeChoiceHole`, `chainedSpellTargetHole`, `chainedSpellAttackRollHole`, `chainedSpellDamageRollHole`, ID/protocol siblings, `chainedSpellDamageExpression`, `chainedSpellLeapTargetIsLegal`, `spellDamageTypes`, `spellDamageHole`, `spellBurstDamageHole`, `spellHealingRollHole`, `spellScalarBuffRollHole`, `spellRollModifierSkillChoiceHole(Id)`, `scalarBuffInitialHoles`, `spellSavingThrowOutcomeHole(Id)`, `spellSavingThrowAbility`, `spellSavingThrowTargeting`, `spellAreaTargetingLabel`, `savingThrowRollModeProjections`
- target validators: `spellTargetHole`, `spellTargetAllocationHole(Id)`, `spellTargetListHole(Id)`, `spellTargetIsLegal`, `spellTargetSpatialFactMatches`, `spellTargetHasNonSpatialPrerequisites`, `validateSpellTargetAllocation`, `validateSpellTargetList`, `validatePointOriginSphereSpellTargetList`, `sameCombatantIdSet`, `spellInvocationRequiresKnownWillingTarget`, `spellTargetIsKnownWilling`
- damage validators/applicators: `validateSpellDamageFill`, `validateSpellHealingFill`, `validateScalarBuffTemporaryHitPointsFill`, `validateSpellBurstDamageFill`, `validatePreparedSlotSpellDamageGroups`, `applySpellDamage` (67), `applyPreparedSlotSpellDamage`, `spellDamageAmountForTarget`, `spellDamageByTypeForTarget` (55), `spellBurstDamageAmountForTarget`, `repeatedDamageAllocationSpellDamageAmount`, `spellDamageNegatedForTarget`, `saveGateDamageResultForOutcome`, `saveDamageReplacementForInvocation`, `applySaveDamageResult`
- effect application: `applySpellActiveEffects`, `battleCreatureWithSpellActiveEffects`, `applyFailedSaveSpellActiveEffects` (48), `applyFailedSaveSpellConditionEffects` (50), `applyFailedSaveAttackRollAdvantageEffects`, `activeEffectKindForSpellPostDamageRider`, `spellPostDamageRiderReplacesActiveEffect`, `spellPostDamageRiderExpiration`, `spellPostDamageRiderActiveEffect` (50), `activeEffectExpirationForPostDamageRider`, `endOfNextTurnExpiration`, `conditionHasNonSpellSource`, `conditionHadNonSpellSourceBeforeSpellEffect`, `spellRestraintEffects`, `spellRestraintEffectFor`, `removeSpellConditionEffect`, `conditionsAfterApplyingSpellConditionEffects`, `conditionsAfterExpiringSpellConditionEffects`, `applyPersistentSpellActiveEffect`, `applyHeldLightSpellEffect`, `applyMarkedDamageRiderSpellEffect`, `applyScalarBuffSpellEffect`, `applyRollModifierSpellEffect`, `applyCreatureTypeProtectionSpellEffect`, `applyDamageReductionSpellEffect`, `applyShieldReactionSpellActiveEffect`

### Cluster Q — `spell_effects` (27316..27457, 8 funcs, 145 LOC)
`expendSpellSlot`, `spellDamageExpression`, `spellDamageComponents`, `spellBurstDamageExpression`, `spellHealingExpression`, `scalarBuffTemporaryHitPointsExpression`, `spellHealingAmount`, `scalarBuffTemporaryHitPointsAmount`

### Cluster R — `hole_helpers` (27461..27780, 18 funcs, 321 LOC)
`needsHolesResult`, `attackTargetHole`, `searchTargetHole`, `grappleTargetHole`, `grappleOutcomeHole`, `escapeGrappleOutcomeHole`, `attackTargetChoices`, `hiddenSearchTargetChoices`, `revealHidden`, `bonusActionStandardActionActs` (64), `alternateActionCostProfilesForActor`, `bonusActionDashTemporaryHitPointsProfilesForActor`, `alternateActionCostActionAvailable`, `actorHasAlternateActionCost`, `bonusActionDashTemporaryHitPointsForActor`, `alternateActionCostActionLabel`, `canHideInCurrentCircumstances`, `grappleTargetChoices`

### Cluster S — `movement_speed` (27782..28289, 31 funcs, 508 LOC)
`battleMovementBudget` (54), `battleMovementBudgetForActor`, `movementHoleHasRemainingBudget`, `effectiveWalkSpeed`, `effectiveMovementSpeed`, `baseWalkSpeed`, `battleCreatureSpeedFacts`, `battleSpeedChanges`, `battleSpecialSpeedCandidates`, `battleTerminalSpeedZero`, `representedMovementSpeedKinds`, `isBattleLiteralSpecialSpeed`, `passiveSpeedKindGrantKinds`, `passiveSpeedBonusDelta`, `speedBonusDeltaForProfile`, `profileSpeedBonusCondition`, `profileSpeedBonusDeltaFeet`, `combatantCanMoveInState`, `combatantCanMoveWithBudget`, `opportunityAttackThreatsForMovement`, `opportunityAttackOptionForReactor`, `attackTargetIsLegal`, `attackKindForDeflectRedirect`, `attackTargetRangeBand`, `grappleLinkForTarget` (62), `firstFreeHand`, `grappleEscapeDc`, `strengthModifier`, `combatantProficiencyBonus`, `targetIsNoMoreThanOneSizeLarger`, `grappleDragCostExempt`

### Cluster T — `attack_roll` (28290..28862, 23 funcs, 574 LOC)
`attackRollHole`, `requiredAttackRollMode` (47), `attackRollHasAdvantageSource`, `attackRollModeWithOptionalOngoingFeature`, `ongoingFeatureLifecycleHasExtensionTrigger`, `ongoingFeatureProfileHasExtensionTrigger`, `attackRollOngoingFeatureActivations`, `attackRollOngoingFeatureActivationProfile`, `ongoingFeatureGrantsAttackRollMode`, `activeEffectGrantsAttackRollMode`, `battleCreatureType`, `attackAbilityMatchesModifier`, `hasDodgeBenefit`, `hasDodgeAttackRollBenefit`, `consumeHelpAttackForAttackRoll`, `consumeOneShotAttackRollEffects`, `combatantsAreEnemies`, `combatantsAreAllies`, `extendAttackRollOngoingFeatures` (46), `extendSavingThrowOngoingFeatures` (49), `recordAttackRollOngoingFeatures`, `stateWithActiveOngoingFeatureOccurrence`, `attackRollModeMatches`

### Cluster U — `attack_damage_apply` (28864..29248, 20 funcs, 386 LOC)
`attackDamageHole` (49), `attackDamageDispositionHole`, `zeroHitPointReplacementDispositionHole`, `iceKnifeDamageDispositionHoleKey`, `damageDispositionHoleIdForTarget`, `damageDispositionHoleInstanceForTarget`, `damageDispositionFillFor`, `damageDispositionFillsValidation`, `damageDispositionForTarget`, `damageDispositionFillValidation`, `damageDispositionChoicesEqual`, `zeroHitPointReplacementChoices`, `attackDamageHoleId`, `attackActionOptionForSubject`, `attackActionOptionsForActor`, `offHandAttackActionOptionForActor`, `offHandAttackPrerequisiteMet`, `heldWeaponItemIdForAttack`, `offHandWeaponItemIdForActor`, `isLightMeleeWeapon`

### Cluster V — `statblock` (29249..29699, 23 funcs, 451 LOC)
`supportedStatBlockAttackActionOption`, `statBlockAttackActionOptions`, `attackActionOptionIsOrdinaryAttackAction`, `statBlockActionSectionAttackOptions`, `isSupportedCreatureNamedAttackRoll`, `statBlockResourceState`, `statBlockLimitedUseInitialStates`, `statBlockAuthoredLimitedUses`, `statBlockActionSectionLimitedUseInitialStates`, `statBlockAuthoredLimitedUse`, `statBlockResourceSnapshot` (60), `statBlockLimitedUseForPart`, `refreshStatBlockStartTurnResources`, `statBlockAttackResourceAvailable`, `statBlockPartLimitedUseAvailable`, `spendStatBlockAttackResources`, `updateStatBlockActorResources`, `spendStatBlockPartResources`, `statBlockSectionMatchesSubject`, `statBlockSubjectPart`, `sameStatBlockPartKey`, `assertUniqueStatBlockPartKeys`, `statBlockPartKeyString`

### Cluster W — `statblock_attacks` (29701..30566, 46 funcs, 865 LOC)
- TS overload group: `supportedStatBlockAttackDamage` (3 sigs), `supportedStatBlockBaseDamageEffect`, `supportedStatBlockAdvantageBonusDamageEffect`, `supportedStatBlockAttackTargetConstraint` (3 sigs)
- `statBlockAttackDamage`, `statBlockAttackTargetConstraint`, `statBlockAttackBonus`, `attackTargetConstraint`, `attackCanCarryKnockOutChoice`, `weaponTargetConstraint`, `selectedWeaponDamage`, `attackActionOptionName`, `attackDamage`, `unarmedStrikeAttackDamage`, `unarmedStrikeDamageDiceExpr`, `attackDamageRiderDiceCount`, `attackDamageRiderForProfile`, `weaponAttackSupportsFinesseOrRanged`, `targetHasAdjacentNonIncapacitatedAlly`, `eligibleAttackDamageRiders` (47), `selectedAttackDamageRiders`, `attackDamageComponents` (94), `weaponDamageComponent`, `attackPotentialDamageTypes`, `attackDamageModifier`, `attackActionBonus`, `attackActionBonusWithPassiveFeatureBonus`, `passiveRangedAttackRollBonus`, `eligibleWeaponDamageDiceRollChoiceUnitIds`, `attackRollMissToHitReplacementHolePayload(ForAttacker)`, `eligibleAttackRollMissToHitReplacements`, `selectedAttackRollMissToHitReplacement`, `attackRollMissToHitReplacementForUnit` (37), `recordAttackRollMissToHitReplacementUsed` (39), `samePendingAttackRollMissToHitReplacementContext`, `sameAttackRollMissToHitReplacementRoll`, `clearPendingAttackRollMissToHitReplacementSelection`, `selectedWeaponDamageDiceRollChoice`, `weaponAttackDamageExpression`, `signedModifier`, `invalidResult`

---

## 2. Type inventory

### Exported types (97 total) — line + group
Schema/snapshot core (4358..4480) and three large `Schema.Union` constants (`BattleHoleSchema` 2802, `BattleFillSchema` 3481, `BattleSnapshotSchema` 4358) sit in `types_and_schemas`. Selected exports:

| Line | Name | Cluster | Models |
|---|---|---|---|
| 310 | `BattleActiveEffectExpiration` | T | When an active effect ends |
| 332 | `BattleSpellEffectEarlyEnd` | T | Conditions ending a spell early |
| 348 | `BattleActiveEffect` | T | Active effects on creatures |
| 450 | `BattleConcentration` | T | Concentration state |
| 458 | `BattleReadiedSpell` | T | Spell readied for trigger |
| 466 | `BattleReadiedMovement` | T | Movement readied for trigger |
| 476 | `BattleHelpAttack` | T | Pending help-attack flag |
| 482 | `BattleInterruptedProcedure` | T | Continuation envelope (broad) |
| 670 | `BattleAttackDamageDisposition` | T | Disposition of attack damage |
| 683 | `BattleReactionProcedureChoice` | T | Reaction choice union |
| 686 | `BattleReactionProcedureSelection` | T | Persisted reaction selection |
| 729 | `BattleReactionFrame` | T | Active reaction frame |
| 793 | `BattleReactionDecision` | T | Pending decision |
| 811 | `BattleAttackRangeBand` | T | "normal"/"long" |
| 812 | `BattleHand` | T | "left"/"right" |
| 813 | `BattleGrappleLink` | T | Grappler-grapplee link |
| 821 | `BattleHiddenState` | T | Hidden flag with prereq |
| 824 | `BattleHidePrerequisite` | T | Cause justifying hidden |
| 832 | `BattleMovementFillValue` | T | Filled movement value |
| 837 | `BattleOpportunityAttackThreat` | T | Threat from movement |
| 841 | `BattleTargetSpatialFact` | T | Spatial fact tagged with target |
| 1259 | `SupportedSpellInvocation` | T | All authored-supported invocations (refs 22 internal types) |
| 1500 | `BattleTurnResources` | T | Per-turn resources |
| 1515 | `OngoingFeatureExpiration` | T | When ongoing feature ends |
| 1529 | `AttackDamageRider` | T | Rider on attack damage |
| 1547 | `AttackDamageRiderUsage` | T | Usage tracking |
| 1551 | `OngoingFeatureSource` | T | Source of ongoing feature |
| 1562 | `OngoingFeatureSourceKey` | T | Branded string id |
| 1565 | `ActiveOngoingFeatureOccurrence` | T | Live occurrence |
| 1579/1601 | `ActiveOngoingFeatureOccurrenceSnapshot[Encoded]` | T | Snapshot variants |
| 1679 | `KnockedOutOneHp` | T | Branded HP |
| 1681 | `KnockedOutConditionState` | T | Branded condition state |
| 1689 | `KnockOutEligibleBattleCreatureState` | T | Narrowed creature |
| 1782 | `BattleCreatureState` | T | Combatant state |
| 1785 | `LegendaryActionWindow` | T | Legendary window |
| 1790 | `BattleState` | T | Top-level state |
| 1804 | `BattleFailedAbilityCheckFacts` | T | Failed-check facts |
| 1812 | `BattleSuccessfulAbilityCheckFacts` | T | Successful-check facts |
| 1821 | `FailedAbilityCheckResourceBoostResolutionInput` | T | API input |
| 1828 | `SuccessfulAbilityCheckReactionReductionResolutionInput` | T | API input |
| 1836/1845 | `*ResolutionResult` | T | API result |
| 1854 | `BattleStateInitIssue` | T | Init issue |
| 1867 | `AvailableBattleAct` | T | Discovered act |
| 1874/1875 | `BattleHoleId/InstanceKey` | T | Hole identity aliases |
| 1876 | `BattleTargetChoiceHole` | T | Target choice hole |
| 1883 | `BattleSpellTargetAllocation` | T | Spell target allocation |
| 1887 | `BattleSpellDamageTypeChoiceHole` | T | Damage-type choice hole |
| 1909 | `BattleSpellTargetAllocationHole` | T | Allocation hole |
| 1919 | `BattleSpellTargetListHole` | T | Target list hole |
| 1942 | `BattleAttackRollHole` | T | Attack roll hole |
| 1952 | `AttackRollFeatureActivation` | T | Activation marker |
| 1957 | `AttackRollMissToHitReplacement` | T | Miss-to-hit replacement |
| 1961 | `BattleSpellAttackRollHole` | T | Spell attack roll hole |
| 1970 | `BattleDamageRollHole` | T | Damage roll hole |
| 1981/2000/2006/... | `BattleSpellDamageRollHole`, `BattleSpellDamageReductionRollHole`, `BattleSpellHealingRollHole`, etc. | T | Spell roll holes (~12 more) |
| 3060 | `BattleAttackRollResult` | T | |
| 3064 | `BattleRolledDiceFill` | T | |
| 3084 | `BattleFill` | T | Fill union |
| 3894 | `BattleResolutionResult` | T | Result envelope |
| 3914 | `BattleSnapshot` | T | Top snapshot |
| 3935..4027 | `BattleCreatureSnapshot`, `BattleTurnSnapshot`, `BattleReadiedSpellSnapshot`, `BattleReadiedMovementSnapshot`, `BattleHelpAttackSnapshot`, `BattleCreatureOriginSnapshot`, `BattleCharacterResourceSnapshot`, `BattleCreatureZeroHpLifecycleSnapshot` | T | Snapshot members |

Plus exported `Schema` consts: `ActiveOngoingFeatureOccurrenceSnapshotSchema` (1638), `BattleHoleSchema` (2802), `BattleFillSchema` (3481), `BATTLE_INVALID_REASON_CODES` (3883), `BattleSnapshotSchema` (4358).

### Internal types (135 total) — referenced by exported types

**56 internal types are referenced by exported types** (must move with them or be promoted to exports). Map (exported → internal deps):

| Exported | Internal deps |
|---|---|
| `ActiveOngoingFeatureOccurrence` | `EndOfTurnOngoingFeatureExpiration` |
| `ActiveOngoingFeatureOccurrenceSnapshotEncoded` | `EndOfTurnOngoingFeatureExpirationEncoded`, `OngoingFeatureExpirationEncoded`, `OngoingFeatureSourceEncoded` |
| `BattleActiveEffect` | `BattleD20RollModifierDelta`, `BattleD20RollModifierKind`, `BattleSpellEffectBase`, `SpellConditionEscape` |
| `BattleCreatureState` | `BattleCreatureKnockOutLifecycle`, `BattleCreatureStateCommon` |
| `BattleDamageRollHole` | `SpellMarkedDamageRider`, `SpellWeaponDamageRider` |
| `BattleFill` | `BattleSpellTargetListSpatialFact` |
| `BattleHelpAttack` | `TurnAnchoredBattleActiveEffectExpiration` |
| `BattleInterruptedProcedure` | `BattleAfterDamageEvent`, `BattleAttackDamageEvent`, `BattleAttackDamagePrefixFill`, `BattleAttackHostSubject`, `BattlePendingAttackDamageReduction`, `BattleResolvedMovement`, `WeaponDamageDiceRollChoiceFill` |
| `BattleReactionFrame` | `BattleAttackDamageContinuationWithoutConcentration`, `BattleAttackKindForRedirect`, `BattleReactionFrameBase`, `BattleReactionFrameWithContinuationBase` |
| `BattleReactionProcedureChoice` | `BattleReactionProcedureChoiceWithSubject`, `BattleReactionProcedureModifierChoice` |
| `BattleReactionProcedureSelection` | `BattleReactionModifierChoice` |
| `BattleReadiedMovement` | `TurnAnchoredBattleActiveEffectExpiration` |
| `BattleReadiedSpell` | `ReadiedSpellInvocation`, `TurnAnchoredBattleActiveEffectExpiration` |
| `BattleRolledDiceFill` | `WeaponDamageDiceRollChoiceFill` |
| `BattleSpellDamageReductionRollHole` | `SpellDamageReductionRoll` |
| `BattleSpellDamageRollHole` | `SpellMarkedDamageRider` |
| `BattleState` | `BattleInterruptFrame` |
| `BattleTurnResources` | `PendingAttackRollMissToHitReplacementSelection`, `WeaponDamageDiceRollChoiceUsage` |
| `BattleTurnSnapshot` | `WeaponDamageDiceRollChoiceUsage` |
| `BattleUnitFeatureRollHole` | `BattleReactionModifierChoice` |
| `KnockOutEligibleBattleCreatureState` | `KnockOutEligibleZeroHpLifecycle` |
| `SupportedSpellInvocation` | 22 internal types: `ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation`, `CreatureTypeProtectionSpellInvocation`, `DamageReductionSpellInvocation`, `DamageSpellSource`, `HealingSpellActionCost`, `HealingSpellTargeting`, `HeldLightHurlSpellInvocation`, `HeldLightSpellInvocation`, `MarkedDamageRiderSpellInvocation`, `PreparedDamageSpellSource`, `PreparedSpellAccess`, `RollModifierSpellInvocation`, `ScalarBuffSpellEffect`, `ScalarBuffSpellTargeting`, `SpellAttackKind`, `SpellFailedSaveAttackRollEffect`, `SpellFailedSaveConditionEffect`, `SpellFailedSavePostDamageRider`, `SpellPostDamageRider`, `SpellSlotInvocationResource`, `SpellTargeting`, `WeaponDamageRiderSpellInvocation` |

The remaining 79 internal types are private to the file and tied to the cluster where they live (e.g. `SpellFillSet`, `BattleResolutionInputForSubject`, `ActionSpellBattleResolutionInput`, `BonusActionSpellBattleResolutionInput`, `SaveDamageResult`, `SupportedDamageSpellInvocation`, etc. — all spell-region types).

---

## 3. Cluster proposal (mapped to original plan)

Plan's `types/constants/helpers/damage/movement/turn/actions/spells` → 8 boxes is **insufficient**: spells alone is ~12,000 LOC and naturally splits into 5 sub-clusters. Recommended 23-cluster carve (mapped to plan tags):

| # | Cluster | Lines | LOC | Funcs | Plan tag |
|---|---|---|---|---|---|
| A | types_and_schemas | 276..4480 | 3,546 | 7 | types + constants |
| B | api_lifecycle | 4481..4666 | 437 | 4 | actions |
| C | subjects_discovery | 4667..5322 | 405 | 23 | actions |
| D | subject_resolution | 5323..5797 | 475 | 9 | actions |
| E | reactions | 5798..7336 | 1,539 | 44 | actions |
| F | turn | 7337..8243 | 907 | 33 | turn |
| G | creature_state | 8244..9122 | 879 | 46 | helpers |
| H | attack_resolution | 9123..12403 | 3,281 | 57 | actions |
| I | turn_end_movement | 12404..13987 | 1,584 | 30 | turn + movement |
| J | unit_features | 13988..14899 | 912 | 24 | actions |
| K | spells_discovery | 14900..15423 | 524 | 10 | spells |
| L | spells_resolve | 15424..21001 | 5,578 | 45 | spells |
| M | damage_apply | 21002..21801 | 800 | 29 | damage |
| N | damage_helpers | 21802..22214 | 413 | 20 | damage |
| O | spells_profiles | 22215..25358 | 3,144 | 96 | spells |
| P | spells_holes_fills | 25359..27314 | 1,957 | 73 | spells |
| Q | spell_effects | 27316..27457 | 145 | 8 | spells |
| R | hole_helpers | 27461..27780 | 321 | 18 | helpers |
| S | movement_speed | 27782..28289 | 508 | 31 | movement |
| T | attack_roll | 28290..28862 | 574 | 23 | actions |
| U | attack_damage_apply | 28864..29248 | 386 | 20 | damage |
| V | statblock | 29249..29699 | 451 | 23 | helpers |
| W | statblock_attacks | 29701..30566 | 865 | 46 | actions |

Notes:
- "constants" of the plan reduces to ~280..295; already moved.
- "helpers" of the plan is too small a bucket for 879+321+451 LOC of distinct domains — split as G/R/V.
- `spells` MUST be split into K/L/O/P/Q (12,348 LOC combined) — single-file extraction is impractical.
- `damage` splits cleanly into M (apply/HP/lifecycle) + N (by-type math) + U (attack damage hole).

---

## 4. Cross-cluster edges (top counts)

Edges below show `caller → callee` with `pairs=N call_sites=K` (pairs = distinct caller→callee function pairs; sites = total occurrences). Only edges with ≥ 5 pairs OR involved in cycles are shown; full table is 159 directed edges.

```
api_lifecycle             -> creature_state             7/7
attack_damage_apply       -> statblock_attacks          5/5
attack_resolution         -> attack_damage_apply       12/14
attack_resolution         -> attack_roll               19/19
attack_resolution         -> creature_state             7/7
attack_resolution         -> damage_apply               9/11
attack_resolution         -> damage_helpers            19/25
attack_resolution         -> hole_helpers              24/40
attack_resolution         -> movement_speed             9/9
attack_resolution         -> reactions                 15/24
attack_resolution         -> statblock                  6/7
attack_resolution         -> statblock_attacks         47/140
attack_resolution         -> subjects_discovery        12/13
attack_resolution         -> turn                      23/31
attack_resolution         -> turn_end_movement          7/7
attack_roll               -> creature_state            10/14
attack_roll               -> unit_features              6/7
creature_state            -> damage_apply              10/15      [cycle]
creature_state            -> statblock                  2/2
damage_apply              -> creature_state            10/15      [cycle]
damage_helpers            -> creature_state             4/4
hole_helpers              -> subjects_discovery         1/2
hole_helpers              -> movement_speed             2/3
movement_speed            -> creature_state             5/5       [cycle]
movement_speed            -> statblock_attacks          7/7
reactions                 -> statblock_attacks         12/28
reactions                 -> subject_resolution         7/8       [cycle]
reactions                 -> turn                      25/29      [cycle]
spells_discovery          -> spells_holes_fills         7/21
spells_discovery          -> spells_profiles            6/17
spells_holes_fills        -> spell_effects              7/7
spells_holes_fills        -> damage_helpers             6/7
spells_resolve            -> attack_damage_apply       27/36
spells_resolve            -> attack_resolution         13/16
spells_resolve            -> attack_roll               19/24
spells_resolve            -> hole_helpers              17/54
spells_resolve            -> spells_holes_fills        72/84
spells_resolve            -> spells_profiles           57/57
spells_resolve            -> statblock_attacks         31/153
spells_resolve            -> turn                      35/46
subject_resolution        -> attack_resolution        16/16
subject_resolution        -> creature_state            10/17
subject_resolution        -> turn_end_movement          6/6
subjects_discovery        -> creature_state             7/20
subjects_discovery        -> hole_helpers              10/12
subjects_discovery        -> statblock                  6/6
turn                      -> creature_state            12/13
turn                      -> spells_profiles            5/5
turn                      -> statblock_attacks          5/5
turn_end_movement         -> attack_damage_apply        4/6
turn_end_movement         -> attack_resolution          9/9       [cycle]
turn_end_movement         -> attack_roll                5/5
turn_end_movement         -> damage_apply               9/12      [cycle]
turn_end_movement         -> damage_helpers             7/11
turn_end_movement         -> hole_helpers               4/11
turn_end_movement         -> movement_speed            16/16
turn_end_movement         -> reactions                  6/11      [cycle]
turn_end_movement         -> spells_holes_fills         5/5
turn_end_movement         -> statblock_attacks         15/49
turn_end_movement         -> turn                      11/17      [cycle]
unit_features             -> creature_state             7/7
unit_features             -> statblock_attacks          7/23
unit_features             -> turn                       7/7
```

Type-reference edges align mostly with call edges. The dense type-reference fanout is from `BattleState` (cluster A) → all clusters and `BattleCreatureState` (A) → almost all clusters. Every other cluster reads these, so cluster A imports must remain widely available.

---

## 5. Cycle analysis

**26 mutual cluster pairs** (cycles between proposed clusters). Causes and proposed resolutions:

| # | Cycle | Drivers | Proposed resolution |
|---|---|---|---|
| 1 | `creature_state ↔ damage_apply` | `damage_apply.applyHpHealing/applyDropToZeroHpLifecycle/applyDamageAtZeroHp/applyInstantDeath` call `creature_state.battleCreatureStateWithoutKnockOut`, `applyHpDamage→battleCreatureStateWithDamageProjection`, `battleCreatureStateWithKnockedOutUnconsciousFields→knockedOutOneHp/knockedOutConditionState` (8761/8769/8730/8734). Reverse: `battleCreatureStateFromInit→applyInitialZeroHpLifecycle` (21459), `combatantCanTakeActions→zeroHpLifecycleIsTerminal` (21786). | Hoist `battleCreatureStateWithoutKnockOut`, `battleCreatureStateWithDamageProjection`, `knockedOutOneHp`, `knockedOutConditionState`, `zeroHpLifecycleIsTerminal`, `applyInitialZeroHpLifecycle` into a shared `creature_lifecycle` leaf (no other clusters call these except G/M/I). |
| 2 | `reactions ↔ turn` | `turn.maybeOpenReactionWindow/reactionRollOrDamageReductionChoiceForProfile/snapshotBattle/etc.` ↔ `reactions.completeActiveReactionProcedure/resumeInterruptedProcedure/etc.` (15+ pairs each direction). | **Merge** reactions+turn or extract `reaction_window` (the 6 functions in `turn` that call `reactions`) into `reactions`. The merge is cheap (1,539+907=2,446 LOC) and reflects the runtime dispatcher protocol. |
| 3 | `reactions ↔ subject_resolution` | `subject_resolution.resolveBattleSubjectInternal` calls `reactions.resolveAttackDamageContinuationConcentration/resolveReplayContinuation/completeActiveReactionProcedure/resolveCastTriggeredReactionSpellCommand`. Reverse: `reactions.*→reactionInterruptFrame, resolveBattleSubjectInternal`. | `reactionInterruptFrame` (5792) is a 6-line helper — move it into `reactions`. The remaining `subject_resolution → reactions` calls are unavoidable; declare `reactions` depends on `subject_resolution` interface only via `resolveBattleSubjectInternal` callback (parameterize). |
| 4 | `subject_resolution ↔ turn` | `subject_resolution.resolveBattleSubjectInternal/consumeOrCloseLegendaryActionWindow → snapshotBattle/endTurn/currentInterruptFrame`. Reverse: `turn.endTurn → resolveBattleSubject`, `turn.maybeOpenReactionWindow → openBattleReactionWindow`. | Treat `endTurn`+`snapshotBattle`+`maybeOpenReactionWindow`+the three subject-resolution exports as one orchestration module. Or: extract `currentInterruptFrame` (7418, 6 LOC) and `endTurn` body's `resolveBattleSubject` invocation behind a passed-in callback. |
| 5 | `subjects_discovery ↔ turn` | `discoverBattleActs → endTurn/reactionTriggerLabel`; `snapshotBattle → discoverBattleActs`. | `snapshotBattle` only needs `discoverBattleActs` for an `availableActs` field; extract that snapshot call to a higher orchestration layer or accept C→F→C. |
| 6 | `subjects_discovery ↔ attack_resolution` | `discoverBattleActs → helpAttackAllyChoices/Hole, hideAbilityCheckHole, escapeSpellRestraintAbilityCheckHole`; reverse: `spendAttackAction → isStatBlockMultiattackActionResource`, `resolveMultiattack → supportedStatBlockMultiattacks/spendTurnAction/isStatBlockBattleCreatureState`, `resolveStatBlockBonusActionOption → supportedStatBlockBonusActionOptions/Standard`, `resolveGrapple → actorHasStatBlockMultiattackActionResource`. | The "supported*StatBlock*MultiattackDispatch" predicates and `spendTurnAction` are properly *helpers*, not discovery. Hoist them to a `multiattack_dispatch_helpers` shared module called by both C and H. |
| 7 | `subjects_discovery ↔ hole_helpers` | `discoverBattleActs → attackTargetChoices/Hole, searchTargetHole, grappleTargetHole/Choices, escapeGrappleOutcomeHole, canHideInCurrentCircumstances, hiddenSearchTargetChoices`. Reverse: `bonusActionStandardActionActs → bonusActionDashSubjectForSpeedKind`. | One-way: move `bonusActionDashSubjectForSpeedKind` (4979) into hole_helpers; cycle becomes C→R unidirectional. |
| 8 | `subjects_discovery ↔ attack_damage_apply` | `discoverBattleActs → attackActionOptionsForActor/offHandAttackActionOptionForActor/offHandAttackPrerequisiteMet`; reverse: `attackActionOptionsForActor → isStatBlockMultiattackActionResource`. | Move `isStatBlockMultiattackActionResource` (5199) into the `multiattack_dispatch_helpers` shared module from #6. |
| 9 | `attack_resolution ↔ creature_state` | One stray `battleCreatureStateFromInit → assertCurrentHpWithinMaxHp` (G→H). Move `assertCurrentHpWithinMaxHp` (11641) into G. |
| 10 | `attack_resolution ↔ damage_apply` | `breakBattleConcentration/breakBattleConcentrationAfterDamage` are exported from H but called by `applyAttackDamage*` in M. | Move `breakBattleConcentration` (9144 export), `breakBattleConcentrationAfterDamage` (9163), and `resolveBattleConcentrationDamage` (9193 export) into M (`damage_apply`); they're concentration logic that lives in the wrong cluster by line position. |
| 11 | `attack_resolution ↔ hole_helpers` | `bonusActionStandardActionActs → hideAbilityCheckHole`. Reverse: heavy `resolveAttack/resolveOffHandAttack → needsHolesResult/attackTargetHole/revealHidden`. | Move `hideAbilityCheckHole`, `searchAbilityCheckHole`, `escapeSpellRestraintAbilityCheckHole` into R; one-way after that. |
| 12 | `attack_resolution ↔ unit_features` | One stray `resolveBonusActionDash → isCharacterBattleCreatureState`; reverse: `resolveOngoingFeatureUnitFeature → breakBattleConcentration`. Both relocations from #10/#13 dissolve this. |
| 13 | `attack_resolution ↔ turn_end_movement` | `applyStartOfTurnActiveEffects → applyTemporaryHitPoints` (10234). Plus 7 `normalizeBattleGrapples` callers in H. Reverse: `resolveOpportunityAttackCommand` calls 8 attack helpers. | `applyTemporaryHitPoints` (10234, 10 LOC) is a leaf — move into a shared `creature_lifecycle` leaf. `normalizeBattleGrapples` (13731) is also leaf-ish — move to `creature_state` or shared. `resolveOpportunityAttackCommand` calling H is unavoidable; accept I→H direction. |
| 14 | `attack_resolution ↔ subjects_discovery` | See #6. |
| 15 | `attack_resolution ↔ spells_holes_fills` | `resolveEscapeSpellRestraint → spellRestraintEffectFor/removeSpellConditionEffect`. Reverse: `applySpellDamage → breakBattleConcentrationAfterDamage`, `applyScalarBuffSpellEffect → applyTemporaryHitPoints`. After moves in #10/#13, only H→P remains: `resolveEscapeSpellRestraint` reading spell condition state. Acceptable one-way (H→P) since spells_holes_fills is a leaf for these helpers. |
| 16 | `creature_state ↔ unit_features` | `ongoingFeatureProfileForSourceKey → isCharacterBattleCreatureState` (one-way G→J via 14106). Reverse: `discoverLegendaryActionActs/supportedUnitFeatureActs/resolveOngoingFeatureUnitFeature → activeOngoingFeatureOccurrencesForCombatant/combatantCanTakeActions/combatantWearingArmorCategory`. | Move `isCharacterBattleCreatureState` (14106, 6 LOC) into G; cycle becomes J→G one-way. |
| 17 | `creature_state ↔ movement_speed` | `combatantSnapshot → battleMovementBudgetForActor`. Reverse: `battleMovementBudgetForActor → currentActorId`, `speedBonusDeltaForProfile → combatantWearingArmorCategory`, `opportunityAttackThreatsForMovement → currentActorId`, `grappleLinkForTarget → grappledBy`, `firstFreeHand → combatantHandUses`. | `currentActorId`, `combatantWearingArmorCategory`, `grappledBy`, `combatantHandUses` are all 4-13 LOC leaves used by S — extract a `creature_state_leaves` module read by both G and S. Then S no longer cycles back. |
| 18 | `creature_state ↔ types_and_schemas` | Misclassification: `ongoingFeatureSourceKeyForUnit/ForSourceKey` (1661/1667/1673) sit at line 1661 (cluster A) but are called from G's `characterOngoingFeatureProfiles`. | Reassign these 3 helpers (~12 LOC) to G; cycle dissolves entirely. |
| 19 | `damage_apply ↔ spells_holes_fills` | `removeSpellConditionEffectsFromTargetDamagedByCasterOrAlly/breakCombatantConcentration → conditionsAfterExpiringSpellConditionEffects`. Reverse: `applySpellDamage/applyPreparedSlotSpellDamage → applyHpDamage/markMarkedDamageRiderTransferAvailable`. | `conditionsAfterExpiringSpellConditionEffects` (26932, 19 LOC) and `removeSpellConditionEffect` (26868) are leaf helpers — move into damage_apply, or extract `spell_condition_effects_helpers` (4 small functions) read by both M and P. |
| 20 | `attack_roll ↔ unit_features` | `ongoingFeatureGrantsAttackRollMode/attackRollOngoingFeatureActivation* → isCharacterBattleCreatureState` (use #16 fix). `extendAttackRollOngoingFeatures/extendSavingThrowOngoingFeatures → extendOngoingFeatureToEndOfNextTurn`, `stateWithActiveOngoingFeatureOccurrence → activeOngoingFeatureOccurrenceFromProfile`. Reverse: `ongoingFeatureIsAvailable → ongoingFeatureLifecycleHasExtensionTrigger`. | Extract a small shared `ongoing_feature_helpers` (~8 functions) called by both J and T. Both clusters then depend on the helper, no cycle. |
| 21 | `statblock_attacks ↔ unit_features` | `resolveSuccessfulAbilityCheckReactionReduction/resolveFailedAbilityCheckResourceBoost/resolveExtraActionGrantUnitFeature/resolveSelfBonusActionHealingUnitFeature/resolveOngoingFeatureUnitFeature/discoverLegendaryActionActs/resolveUnitFeature → invalidResult/attackActionOptionName`. Reverse: `eligibleAttackDamageRiders → isCharacterBattleCreatureState`. | Move `invalidResult` (30555, 11 LOC) into a shared `result_helpers` leaf. After #16 reassignment, cycle dissolves. |
| 22 | `statblock_attacks ↔ turn` | `reactionTriggerLabel/maybeOpenReactionWindow/reactionRollOrDamageReductionChoices*/opportunityAttackReactionChoices → attackDamage/attackActionOptionName`. Reverse: one stray `invalidResult → snapshotBattle`. | One-way after `invalidResult` is moved (cycle 21). Then F→W only. |
| 23 | `statblock_attacks ↔ attack_roll` | `attackRollHole → attackActionOptionName/attackActionBonusWithPassiveFeatureBonus/attackRollMissToHitReplacementHolePayloadForAttacker`. Reverse: `targetHasAdjacentNonIncapacitatedAlly → combatantsAreAllies`. | Move `combatantsAreAllies/combatantsAreEnemies` (28679/28691) into G or `creature_state_leaves`. T→W one-way after. |
| 24 | `turn ↔ turn_end_movement` | `readiedSpellReactionChoices/readiedMovementReactionChoices → readiedSpellInitialHoles/readiedMovementInitialHoles`. Reverse: `resolveOpportunityAttackCommand/resolveEndTurn*/resolveMoveCommand → maybeOpenReactionWindow/snapshotBattle`. | Pull `readiedSpellInitialHoles`/`readiedMovementInitialHoles` (13748/13767, 21 LOC) into F. |
| 25 | `turn ↔ spells_discovery` | `triggeredReactionSpellChoices → activeOngoingFeaturesPreventSpellcasting`; `readiedSpellAct → reactionTriggerLabel`. | Move `activeOngoingFeaturesPreventSpellcasting` (15327, 12 LOC) into F; move `reactionTriggerLabel` (7442) into a shared `reaction_metadata` helper read by F and K. |
| 26 | `turn ↔ movement_speed` | `abilityProficiencyDifficultyClass → combatantProficiencyBonus`; `opportunityAttackReactionChoices → opportunityAttackOptionForReactor`. Reverse: `opportunityAttackThreatsForMovement → combatantCanSee`. | Move `combatantCanSee` (7913, 16 LOC) into S or shared. |

After applying these moves, the cluster graph approaches a DAG with the following remaining (necessary) edges:

```
A (types) ← everyone
G (creature_state) ← almost everyone
W (statblock_attacks) ← H, T, U, F, I, K, L
S (movement_speed) ← H, I, R, F
R (hole_helpers) ← C, D, H, I, J, L, T, U, W
N (damage_helpers) ← H, I, M, P, R, T, W
Q (spell_effects) ← L, P
P (spells_holes_fills) ← L, M, T (after fixes)
O (spells_profiles) ← K, L, F
K (spells_discovery) ← L, F
M (damage_apply) ← H, I
T (attack_roll) ← H, I, L
U (attack_damage_apply) ← H, L
H (attack_resolution) ← C, D, I, L, J
J (unit_features) ← I, F
I (turn_end_movement) ← (top of subgraph)
F (turn) ← B, C, D, E, J
E (reactions) ↔ D ↔ F  (residual; recommend MERGE)
C (subjects_discovery) ← B
B (api_lifecycle) ← (top)
```

Recommendation: **merge E (reactions) + D (subject_resolution) + F (turn) into a single `dispatcher` cluster** (~3,000 LOC) — these three are mutually inseparable.

---

## 6. Recommended extraction order

Each pass: extract cluster, leave thin re-export shim from `battle-reducer.ts`, run typecheck. Ordered by safety (low incoming + leaf nature first, then up the DAG).

| Pass | Cluster(s) | LOC | Rationale | Risk |
|---|---|---|---|---|
| 1 | **Q `spell_effects`** | 145 | 8 pure expression functions, only consumed by L and P. No types. | Very low |
| 2 | **N `damage_helpers`** | 413 | Pure by-type math. Consumed by many but consumes only G and W (small). Move 1 stray internal type `DamageAmountByTypeEntry` with it. | Low |
| 3 | **R `hole_helpers`** | 321 | After pulling `bonusActionDashSubjectForSpeedKind` (C→R) and `hideAbilityCheckHole/searchAbilityCheckHole/escapeSpellRestraintAbilityCheckHole` (H→R), cluster is leaf-only. | Low (with prerequisite moves) |
| 4 | **S `movement_speed`** | 508 | After moving `currentActorId/combatantWearingArmorCategory/grappledBy/combatantHandUses/combatantCanSee` to a `creature_state_leaves` mini-cluster, S is leaf for movement. | Low-medium |
| 5 | **V `statblock`** + **W `statblock_attacks`** (together) | 451 + 865 | They share types and `invalidResult` is at the bottom. Extract together; `invalidResult` becomes a shared util. Heavy fan-in (W is read by 7 clusters) but no fan-out except T-cycle (resolved by moving `combatantsAreAllies/Enemies`). | Medium (TS overload signatures need careful copy) |
| 6 | **U `attack_damage_apply`** | 386 | Mostly leaf for damage holes. Calls W (already extracted) and small set of others. | Low |
| 7 | **T `attack_roll`** | 574 | After ongoing-feature-helpers extraction (cycle #20), T is one-way consumer of G/W/J. | Medium |
| 8 | **G `creature_state`** | 879 | Now its remaining outgoing edges (M, S) are extracted; G has only inbound from `creature_state_leaves`. Move `OFSK` helpers in (cycle #18). | Medium-high (heavy reuse) |
| 9 | **M `damage_apply`** + concentration moves | 800 + ~70 | Add `breakBattleConcentration/AfterDamage/resolveBattleConcentrationDamage` from H. After this, H stops calling M. | Medium |
| 10 | **K `spells_discovery`** | 524 | Self-contained spell discovery leaf for the spells subsystem. | Low |
| 11 | **O `spells_profiles`** | 3,144 | Profile predicates; consumed by K, L, F, I. Leaf in spell subsystem after K extracted. ~96 functions but topically homogenous. **Move with 60+ internal "Supported*Profile" types.** | High (size) |
| 12 | **P `spells_holes_fills`** | 1,957 | Holes/fills/effect application. Calls Q (extracted), N (extracted), uses M (extracted). | High |
| 13 | **L `spells_resolve`** | 5,578 | Largest cluster. Consumes everything below. Extract last in spells subsystem. Internal types like `SpellFillSet`, `ActionSpellBattleResolutionInput`, `BattleResolutionInputForSubject` move with it. | Very high |
| 14 | **J `unit_features`** | 912 | After ongoing-feature-helpers extracted, J is mostly leaf (uses G/W/F). | Medium |
| 15 | **H `attack_resolution`** | 3,281 | Largest non-spell cluster; once T/U/M extracted it shrinks. Note `resolveAttack` (771) and `resolveOffHandAttack` (434) move whole. | Very high |
| 16 | **I `turn_end_movement`** | 1,584 | Includes second-largest function `resolveOpportunityAttackCommand` (555). Heavy I↔H, I↔M, I↔F couplings; extract late. | Very high |
| 17 | **C `subjects_discovery`** | 405 | After multiattack_dispatch_helpers split out, C is a leaf consumer of H, R, S, V, W. | Medium |
| 18 | **B `api_lifecycle`** | 437 | Three top-level exports + 1 internal. Extract trivially. | Low |
| 19 | **A `types_and_schemas`** + **dispatcher (D+E+F)** | 3,546 + ~3,000 | Move types/schemas to `battle-reducer/types.ts` + `battle-reducer/schemas.ts`. Dispatcher (subject_resolution+reactions+turn merged) sits in `battle-reducer/dispatcher.ts` because the cycles cannot be cleanly broken. | High; types easy, dispatcher merge requires acceptance that it remains one big file (~3 kLOC, half the original) |

**Estimated final shape**: 18 modules averaging ~1,500 LOC, max ~5.5 kLOC (`spells_resolve`), min ~140 (`spell_effects`). The original 30,566 LOC distributes as:
- 4 modules ≥ 2,000 LOC (spells_resolve, types_and_schemas, dispatcher, attack_resolution)
- 5 modules 800–2,000 LOC
- 9 modules < 800 LOC

**Must-extract-together groups**:
- Group 1: V + W (TS overloads, shared types)
- Group 2: D + E + F (irreducible cycles — recommended merge)
- Group 3: A (types) extracted last, since every module imports types from it; until then types stay in `battle-reducer.ts` and modules import via existing shims

---

## 7. Risk register

### Huge functions (line counts measured between `function` declarations; bodies may be slightly shorter due to trailing comments/blank lines)

| Lines | Function | Cluster | Role |
|---|---|---|---|
| 9211–9981 (~771) | **`resolveAttack`** | H | Master attack resolution — owns the entire attack pipeline (target selection, attack roll holes/fills, advantage modes, damage holes/dispositions, post-damage reactions, concentration). The "2,626-line function" the prior agent reported corresponds to a misread of the gap between 1673 and 4481 — that's a 2,808-line *band of types/schemas* between two 6-line helpers, not a single function. The actual largest function is 771 lines. |
| 12961–13515 (~555) | **`resolveOpportunityAttackCommand`** | I | Opportunity attack pathway with reaction frames and damage continuation. |
| 19602–20144 (~543) | `resolveAttackBurstSaveDamageSpellAct` | L | Spell that combines attack-roll target with burst save damage. |
| 1100–1660 (~561) | `isTargetListSpellInvocation` | A | Predicate with deeply nested narrowings of `SupportedSpellInvocation`. |
| 15424–16095 (~672) | `resolveSpellAct` | L | Master spell dispatch. |
| 14900–15222 (~323) | `discoverSupportedSpellInvocations` | K | Per-actor spell discovery. |
| 18501–18817 (~317) | `resolveSpellRelease` | L | |
| 19308–19601 (~294) | `resolvePreparedSlotSpellAct` | L | |
| 4667–4917 (~251) | `discoverBattleActs` (E) | C | Top-level discovery dispatch. |

### TypeScript overload runs
- `supportedStatBlockAttackDamage` and `supportedStatBlockAttackTargetConstraint` each have 3 successive `function` declarations (lines 29701/29704/29707 and 29773/29776/29779) — these are **TS overload signatures + implementation**, not duplicates. The 3-line "size" of the first two is signature-only. Extraction must keep all three lines together.

### Schema unions
- `BattleHoleSchema` (line 2802, ~677 LOC) and `BattleFillSchema` (3481, ~401 LOC) are giant `Schema.Union(...)` literals. They reference dozens of internal helper Schemas defined inline; moving them requires moving the entire chain of small Schemas immediately before each Union. These two schemas are exported and are referenced from outside via `index.ts`.

### Cycles that cannot be cleanly broken
- **`reactions ↔ subject_resolution ↔ turn`** (cycles #2, #3, #4): The dispatcher trio cannot be fully separated because `endTurn`, `snapshotBattle`, `resolveBattleSubject`, `resolveBattleReaction`, `openBattleReactionWindow`, and `maybeOpenReactionWindow` form a closed protocol. Recommended: keep them in one file (`dispatcher.ts`).

### External references (cross-package consumers)
`grep -rn "from \"@dnd/battle-runtime\"" packages/*/src/`: imports come from `app`, `character-battle-runtime`, and `mcp` packages. The re-exports they rely on (per `packages/battle-runtime/src/index.ts` lines 96–192) are exactly the 20 exported functions and 60+ exported types from `battle-reducer.ts`. **Action**: `packages/battle-runtime/src/index.ts` must be updated whenever an extraction passes — the import paths change from `./battle-reducer.ts` to the new submodules. There are no direct `from "...battle-reducer"` imports outside `packages/battle-runtime/`.

### Internal type promotion needed
56 internal types are referenced by exported types. In particular:
- `SupportedSpellInvocation` references **22** internal spell-invocation variants. Moving `SupportedSpellInvocation` requires moving (or exporting) all 22.
- `BattleInterruptedProcedure` references 7 internal types (event/redirect/replay shapes).
- `BattleReactionFrame` references 4 internal frame-base types.
- `BattleActiveEffect` references 4 internal modifier/effect types.

When extracting `types_and_schemas` (cluster A) split: `BattleReactionFrame`/`BattleInterruptedProcedure` types live with the dispatcher's reaction logic, while `SupportedSpellInvocation` and its 22 satellites belong with the spell modules. **Pre-condition for spells extraction**: promote those 22 invocation types to `export type` so `spells_*` modules can import them from `types_and_schemas`.

### Stale-data risk
- `ongoingFeatureSourceKey/ForUnit/ForSourceKey` at lines 1661/1667/1673 are misplaced — they live among types but are pure helpers used by `creature_state` (G). Easy fix: relocate during pass 1.

### Re-entrancy / circular calls within one cluster
- `resolveBattleSubjectInternal` (5329) is recursive via `resolveAttack → … → resolveBattleSubjectInternal` indirectly through `resumeInterruptedProcedure` (6884). Extraction must keep both call sides in the same module **or** parameterize the recursion via a callback parameter.

### Files already modified in worktree
`packages/battle-runtime/src/battle-reducer.ts` already has 31 fewer LOC than master (30,566 vs 30,597) and imports from `./battle-reducer/{domain-constants,domain-helpers}.ts`. The barrel `./battle-reducer/index.ts` re-exports those. Future passes should follow this pattern: create new file under `battle-reducer/`, delete original block from `battle-reducer.ts`, add import + re-export from barrel.

### Test infrastructure
Not investigated (out of scope). The plan asserts behavior is preserved; vitest battle-runtime suite must pass after each pass. Focused QNT/MBT parity runs are expensive — defer until a coherent multi-cluster batch is complete.
