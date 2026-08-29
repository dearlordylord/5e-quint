// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.ANTIMAGIC_FIELD_ONGOING_SUPPRESSION BATTLE.SPELL.ANTIMAGIC_FIELD_ACTION_INTERDICTION BATTLE.SPELL.ANTIMAGIC_FIELD_MAGICAL_EFFECT_INTERDICTION
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-antimagic-field-ongoing-spell-suppression spell.invocation-antimagic-field-action-interdiction spell.invocation-antimagic-field-magical-effect-interdiction

module battleRuntimeMagicSuppression {
  type SuppressibleOngoingEffect = {
    insideSuppressionArea: bool,
    exemptSource: bool,
  }

  type SuppressionInterdiction = {
    actorInsideSuppressionArea: bool,
    isSpellCast: bool,
    isMagicAction: bool,
    createsMagicalEffect: bool,
  }

  pure def ongoingEffectFunctions(effect: SuppressibleOngoingEffect): bool =
    not(effect.insideSuppressionArea) or effect.exemptSource

  pure def actionAllowedDuringMagicSuppression(
    interdiction: SuppressionInterdiction
  ): bool =
    not(interdiction.actorInsideSuppressionArea) or
      not(or {
        interdiction.isSpellCast,
        interdiction.isMagicAction,
        interdiction.createsMagicalEffect,
      })

  pure def magicalEffectMayTargetOrAffect(
    isMagicalEffect: bool,
    targetInsideSuppressionArea: bool
  ): bool =
    not(isMagicalEffect and targetInsideSuppressionArea)

  pure def remainingDurationAfterSuppressedTicks(
    remainingDurationTicks: int,
    elapsedTicks: int
  ): int =
    if (remainingDurationTicks <= 0) 0
    else if (elapsedTicks <= 0) remainingDurationTicks
    else if (elapsedTicks >= remainingDurationTicks) 0
    else remainingDurationTicks - elapsedTicks
}
