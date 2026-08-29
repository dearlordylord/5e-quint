// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.HASTE_POSITIVE_EFFECTS
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-haste-positive

module compositeTargetBuffCore {
  type StandardAction =
    | AttackAction
    | DashAction
    | DisengageAction
    | HideAction
    | UtilizeAction
    | DodgeAction
    | MagicAction

  type Ability =
    | StrengthAbility
    | DexterityAbility
    | ConstitutionAbility

  type RollMode =
    | NormalRoll
    | AdvantageRoll
    | DisadvantageRoll

  type CompositeTargetBuffFacts = {
    speedRatioNumerator: int,
    speedRatioDenominator: int,
    armorClassBonus: int,
    savingThrowAbility: Ability,
    savingThrowRollMode: RollMode,
  }

  type RestrictedAdditionalActionFacts = {
    requestedAction: StandardAction,
    attackCount: int,
  }

  pure def compositeTargetBuffFacts: CompositeTargetBuffFacts = {
    speedRatioNumerator: 2,
    speedRatioDenominator: 1,
    armorClassBonus: 2,
    savingThrowAbility: DexterityAbility,
    savingThrowRollMode: AdvantageRoll,
  }

  pure def restrictedAdditionalActionAllows(
    requestedAction: StandardAction
  ): bool =
    requestedAction.in(Set(
      AttackAction,
      DashAction,
      DisengageAction,
      HideAction,
      UtilizeAction
    ))

  pure def legalRestrictedAdditionalAction(
    facts: RestrictedAdditionalActionFacts
  ): bool =
    if (facts.requestedAction == AttackAction)
      facts.attackCount == 1
    else
      all {
        restrictedAdditionalActionAllows(facts.requestedAction),
        facts.attackCount == 0,
      }

  pure def restrictedAdditionalActionPermitsExtraAttacks(
    facts: RestrictedAdditionalActionFacts
  ): bool =
    facts.requestedAction == AttackAction and facts.attackCount != 1

  pure def compositeTargetBuffDoublesSpeed(
    facts: CompositeTargetBuffFacts
  ): bool =
    facts.speedRatioNumerator == 2 and facts.speedRatioDenominator == 1

  pure def compositeTargetBuffValid(facts: CompositeTargetBuffFacts): bool =
    all {
      compositeTargetBuffDoublesSpeed(facts),
      facts.armorClassBonus == 2,
      facts.savingThrowAbility == DexterityAbility,
      facts.savingThrowRollMode == AdvantageRoll,
    }

  pure def compositeTargetBuffProfileAdmitted(
    effectFacts: CompositeTargetBuffFacts,
    actionFacts: RestrictedAdditionalActionFacts
  ): bool =
    all {
      compositeTargetBuffValid(effectFacts),
      legalRestrictedAdditionalAction(actionFacts),
      not(restrictedAdditionalActionPermitsExtraAttacks(actionFacts)),
    }
}
