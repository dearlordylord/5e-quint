// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY

// Battle fill-kind vocabulary shared by protocol witnesses and the
// rules-kernel frontier registry.
//
// LEAF MODULE -- intentionally has no imports. These variants are promoted
// from semantic-frontier `fillKind` rows in
// plans/rules-kernel-coverage/battle-hole-frontier.jsonl. Table-owned fact
// rows stay boundary-documented and are intentionally not modeled here.
module battleRuntimeFillKinds {
  type BattleFillKind =
    | AbilityCheckFillKind
    | AbilityChoiceFillKind
    | AttackDamageDispositionFillKind
    | AttackRollFillKind
    | CommandOptionChoiceFillKind
    | CompanionReappearanceInitiativeFillKind
    | ConcentrationSavingThrowFillKind
    | ConditionChoiceFillKind
    | DamageTypeChoiceFillKind
    | DeathSavingThrowFillKind
    | GrappleOutcomeFillKind
    | GustOfWindLineDirectionChoiceFillKind
    | HitPointHealingDistributionFillKind
    | InterruptDecisionFillKind
    | LevitateAltitudeChangeFillKind
    | LevitateInitialRiseFillKind
    | MovementFillKind
    | ObjectDropResolutionFillKind
    | OngoingSpellTargetChoiceFillKind
    | RolledDiceFillKind
    | SanctuaryInterdictionOutcomeFillKind
    | SavingThrowOutcomeFillKind
    | SelfTransformationModeChoiceFillKind
    | ShoveOutcomeFillKind
    | SkillChoiceFillKind
    | SlowSomaticSpellFailureOutcomeFillKind
    | SpellTargetAllocationFillKind
    | SpellTargetListFillKind
    | StatBlockRechargeRollFillKind
    | TargetAbilityChoicesFillKind
    | TargetChoiceFillKind
    | UnitFeatureDecisionFillKind
    | WildShapeEquipmentDispositionFillKind
}
