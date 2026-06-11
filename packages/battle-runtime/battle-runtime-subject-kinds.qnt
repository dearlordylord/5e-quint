// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY

// Battle subject-kind vocabulary shared by protocol witnesses and the
// rules-kernel frontier registry.
//
// LEAF MODULE -- intentionally has no imports. These variants are promoted
// as procedure-family folds over schema-derived `BattleSubject` protocol
// discriminants in plans/rules-kernel-coverage/battle-hole-frontier.jsonl.
module battleRuntimeSubjectKinds {
  type BattleSubjectKind =
    | ActionAttackSubjectKind
    | ActionMovementSubjectKind
    | ActionAvoidanceSubjectKind
    | ActionSupportSubjectKind
    | ActionExplorationSubjectKind
    | ActionReadySubjectKind
    | ActionContestSubjectKind
    | ActionConditionInterventionSubjectKind
    | CompanionAttackSubjectKind
    | BonusActionAttackSubjectKind
    | BonusActionGrantedStandardActionSubjectKind
    | FeatureOptionSubjectKind
    | FeatureAttackSubjectKind
    | ActionMagicSubjectKind
    | BonusActionMagicSubjectKind
    | SpellGrantedMovementSubjectKind
    | FeatureActivationSubjectKind
    | FeatureWeaponActivationSubjectKind
    | FormTransformationSubjectKind
    | CompanionLifecycleSubjectKind
    | CompanionSensesSubjectKind
    | CompanionDeliveredMagicSubjectKind
    | RuntimeTurnBoundarySubjectKind
    | RuntimeMovementSubjectKind
    | RuntimeReadiedResponseSubjectKind
    | RuntimeReactionSubjectKind
    | RuntimeLinkReleaseSubjectKind
    | RuntimeSavingThrowSubjectKind
    | RuntimeEffectCleanupSubjectKind
    | RuntimeEffectControlSubjectKind
    | RuntimeHeldObjectReleaseSubjectKind
    | RuntimeProtectionSaveSubjectKind
    | RuntimeTransformationModeSubjectKind
    | RuntimeCompelledActionSubjectKind
    | RuntimeAltitudeControlSubjectKind
    | RuntimeAreaEffectSubjectKind
}
