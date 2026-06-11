// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY

// Battle hole-family vocabulary shared by protocol witnesses and the
// rules-kernel frontier registry.
//
// LEAF MODULE -- intentionally has no imports. These variants are promoted
// from semantic-frontier `holeKind` rows in
// plans/rules-kernel-coverage/battle-hole-frontier.jsonl. Table-owned fact
// rows stay boundary-documented and are intentionally not modeled here.
module battleRuntimeHoleKinds {
  type BattleHoleFamilyKind =
    | AbilityCheckHoleKind
    | AbilityChoiceHoleKind
    | AttackDamageDispositionHoleKind
    | AttackRollHoleKind
    | CommandOptionChoiceHoleKind
    | CompanionReappearanceInitiativeHoleKind
    | ConcentrationSavingThrowHoleKind
    | ConditionChoiceHoleKind
    | DamageTypeChoiceHoleKind
    | DeathSavingThrowHoleKind
    | GrappleOutcomeHoleKind
    | GustOfWindLineDirectionChoiceHoleKind
    | HitPointHealingDistributionHoleKind
    | InterruptDecisionHoleKind
    | LevitateAltitudeChangeHoleKind
    | LevitateInitialRiseHoleKind
    | MovementHoleKind
    | ObjectDropResolutionHoleKind
    | OngoingSpellTargetChoiceHoleKind
    | RolledDiceHoleKind
    | SanctuaryInterdictionOutcomeHoleKind
    | SavingThrowOutcomeHoleKind
    | SelfTransformationModeChoiceHoleKind
    | ShoveOutcomeHoleKind
    | SkillChoiceHoleKind
    | SpellTargetAllocationHoleKind
    | SpellTargetListHoleKind
    | SpellcastingAbilityCheckHoleKind
    | StatBlockRechargeRollHoleKind
    | TargetAbilityChoicesHoleKind
    | TargetChoiceHoleKind
    | UnitFeatureDecisionHoleKind
    | WildShapeEquipmentDispositionHoleKind
}
