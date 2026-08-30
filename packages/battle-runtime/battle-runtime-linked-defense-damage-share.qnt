// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING

module battleRuntimeLinkedDefenseDamageShare {
  pure def linkedDefenseNonnegative(value: int): int =
    if (value < 0) 0 else value

  type LinkedDefenseDamageShareState = {
    sourceHitPoints: int,
    targetHitPoints: int,
    linkPresent: bool,
    sourceTookSharedDamage: bool,
  }

  type LinkedDefenseDamageShareFill = {
    incomingDamage: int,
  }

  type LinkedDefenseDamageShareCleanup = {
    sourceAndTargetSeparated: bool,
    linkReplaced: bool,
  }

  pure def linkedDefenseDamageShareInitialState(
    sourceHitPoints: int,
    targetHitPoints: int,
    linkPresent: bool,
  ): LinkedDefenseDamageShareState = {
    sourceHitPoints: linkedDefenseNonnegative(sourceHitPoints),
    targetHitPoints: linkedDefenseNonnegative(targetHitPoints),
    linkPresent: linkPresent and sourceHitPoints > 0,
    sourceTookSharedDamage: false,
  }

  pure def linkedDefenseDamageAfterResistance(incomingDamage: int): int =
    linkedDefenseNonnegative(incomingDamage) / 2

  pure def hitPointsAfterLinkedDamage(hitPoints: int, damage: int): int =
    linkedDefenseNonnegative(hitPoints - linkedDefenseNonnegative(damage))

  pure def linkedDefenseStateAfterCleanup(
    state: LinkedDefenseDamageShareState,
    cleanup: LinkedDefenseDamageShareCleanup,
  ): LinkedDefenseDamageShareState =
    if (
      state.linkPresent and (
        state.sourceHitPoints == 0 or
        cleanup.sourceAndTargetSeparated or
        cleanup.linkReplaced
      )
    ) { ...state, linkPresent: false } else state

  pure def resolveLinkedDefenseSharedDamage(
    state: LinkedDefenseDamageShareState,
    fill: LinkedDefenseDamageShareFill,
  ): LinkedDefenseDamageShareState = {
    val targetDamage =
      if (state.linkPresent)
        linkedDefenseDamageAfterResistance(fill.incomingDamage)
      else
        linkedDefenseNonnegative(fill.incomingDamage)
    val sourceSharesDamage =
      state.linkPresent and state.sourceHitPoints > 0 and targetDamage > 0
    val damaged = {
      ...state,
      sourceHitPoints:
        if (sourceSharesDamage)
          hitPointsAfterLinkedDamage(state.sourceHitPoints, targetDamage)
        else
          state.sourceHitPoints,
      targetHitPoints: hitPointsAfterLinkedDamage(state.targetHitPoints, targetDamage),
      sourceTookSharedDamage: sourceSharesDamage,
    }
    linkedDefenseStateAfterCleanup(
      damaged,
      {
        sourceAndTargetSeparated: false,
        linkReplaced: false,
      },
    )
  }
}
