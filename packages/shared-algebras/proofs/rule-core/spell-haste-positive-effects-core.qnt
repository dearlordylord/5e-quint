// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-haste-positive
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.HASTE_POSITIVE_EFFECTS

module spellHastePositiveEffectsCore {
  // RAW anchors:
  // - Spells/Descriptions-E-L.md: Haste.
  // - UBIQUITOUS_LANGUAGE.md: Speed, Armor Class, Action Lifecycle, and
  //   Multiattack/Extra Attack.

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

  type HastePositiveEffectFacts = {
    speedRatioNumerator: int,
    speedRatioDenominator: int,
    armorClassBonus: int,
    savingThrowAbility: Ability,
    savingThrowRollMode: RollMode,
  }

  type HasteExtraActionFacts = {
    requestedAction: StandardAction,
    attackCount: int,
  }

  pure def hastePositiveEffectFacts: HastePositiveEffectFacts = {
    speedRatioNumerator: 2,
    speedRatioDenominator: 1,
    armorClassBonus: 2,
    savingThrowAbility: DexterityAbility,
    savingThrowRollMode: AdvantageRoll,
  }

  pure def hasteExtraActionAllowsAction(requestedAction: StandardAction): bool =
    requestedAction.in(Set(
      AttackAction,
      DashAction,
      DisengageAction,
      HideAction,
      UtilizeAction
    ))

  pure def legalHasteExtraActionFacts(facts: HasteExtraActionFacts): bool =
    if (facts.requestedAction == AttackAction)
      facts.attackCount == 1
    else
      all {
        hasteExtraActionAllowsAction(facts.requestedAction),
        facts.attackCount == 0,
      }

  pure def hasteExtraActionPermitsAdditionalAttacks(
    facts: HasteExtraActionFacts
  ): bool =
    facts.requestedAction == AttackAction and facts.attackCount != 1

  pure def hasteDoublesSpeed(facts: HastePositiveEffectFacts): bool =
    facts.speedRatioNumerator == 2 and facts.speedRatioDenominator == 1

  pure def hastePositiveEffectsValid(
    facts: HastePositiveEffectFacts
  ): bool =
    all {
      hasteDoublesSpeed(facts),
      facts.armorClassBonus == 2,
      facts.savingThrowAbility == DexterityAbility,
      facts.savingThrowRollMode == AdvantageRoll,
    }

  pure def hastePositiveProfileAdmitted(
    effectFacts: HastePositiveEffectFacts,
    actionFacts: HasteExtraActionFacts
  ): bool =
    all {
      hastePositiveEffectsValid(effectFacts),
      legalHasteExtraActionFacts(actionFacts),
      not(hasteExtraActionPermitsAdditionalAttacks(actionFacts)),
    }
}
