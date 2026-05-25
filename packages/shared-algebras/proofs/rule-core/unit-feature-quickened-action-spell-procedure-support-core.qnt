// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR

module unitFeatureQuickenedActionSpellProcedureSupportCore {
  import unitFeatureMetamagicOptionFactCore.* from "./unit-feature-metamagic-option-fact-core"

  // RAW anchors:
  // - Classes/Sorcerer.md: Quickened Spell changes an action casting time to
  //   a Bonus Action for the current casting.
  // - Spells/Gaining-and-Casting.md: a spell's Casting Time entry specifies
  //   whether casting uses the Magic action, a Bonus Action, a Reaction, or
  //   a longer casting time.
  // - UBIQUITOUS_LANGUAGE.md: Magic Action and Bonus Action.
  //
  // This core models the profile support subset owned by this task. Direct Hit Point
  // restoration and scalar buff action-casting procedures admit the rewrite;
  // damage, control, ongoing-effect, and other action procedures stay closed
  // for the deferred all-action-spell expansion.

  type BattleRuntimeQuickenedActionSpellProcedure =
    | QuickenedDirectRestorationProcedure
    | QuickenedScalarBuffProcedure
    | QuickenedDamageProcedure
    | QuickenedControlProcedure
    | QuickenedOngoingEffectProcedure
    | QuickenedOtherActionProcedure

  pure def quickenedActionSpellProcedureSupportsBonusActionRewrite(
    procedure: BattleRuntimeQuickenedActionSpellProcedure,
  ): bool =
    match procedure {
      | QuickenedDirectRestorationProcedure => true
      | QuickenedScalarBuffProcedure => true
      | QuickenedDamageProcedure => false
      | QuickenedControlProcedure => false
      | QuickenedOngoingEffectProcedure => false
      | QuickenedOtherActionProcedure => false
    }

  pure def selectedMetamagicOptionsSupportedByQuickenedActionSpell(
    procedure: BattleRuntimeQuickenedActionSpellProcedure,
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
  ): bool =
    selectedOptions == Set(quickenedSpellMetamagicFact) and
    quickenedActionSpellProcedureSupportsBonusActionRewrite(procedure)
}
