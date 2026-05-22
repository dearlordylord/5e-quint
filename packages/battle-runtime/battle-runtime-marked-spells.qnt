// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER

module battleRuntimeMarkedSpells {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeMarkedRiders.* from "./battle-runtime-marked-riders"

  pure def resolveHuntersMark(state: BattleState, target: Actor, slotLevel: int): BattleState =
    if (
      currentActor(state) == Fighter and
      target == Goblin and
      slotLevel >= 1 and
      state.bonusActionAvailable and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    )
      commitActorSpellSlotUse({
        ...state,
        fighter: {
          ...state.fighter,
          concentrating: true,
          activeEffects: activeEffectsWithoutHuntersMark(state.fighter.activeEffects)
            .union(Set(HuntersMarkDamageRider({
              target: target,
              transfer: AwaitingTargetDrop,
              durationTicks: huntersMarkDurationTicks(slotLevel),
            }))),
        },
        bonusActionAvailable: false,
      }, Fighter)
    else
      state

  pure def resolveFavoredEnemyHuntersMark(
    state: BattleState,
    target: Actor,
    favoredEnemyUsesRemaining: int,
  ): { state: BattleState, favoredEnemyUsesRemaining: int } =
    if (
      currentActor(state) == Fighter and
      target == Goblin and
      favoredEnemyUsesRemaining > 0 and
      state.bonusActionAvailable and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    )
      {
        state: {
          ...state,
          fighter: {
            ...state.fighter,
            concentrating: true,
            activeEffects: activeEffectsWithoutHuntersMark(state.fighter.activeEffects)
              .union(Set(HuntersMarkDamageRider({
                target: target,
                transfer: AwaitingTargetDrop,
                durationTicks: huntersMarkDurationTicks(1),
              }))),
          },
          bonusActionAvailable: false,
        },
        favoredEnemyUsesRemaining: favoredEnemyUsesRemaining - 1,
      }
    else
      { state: state, favoredEnemyUsesRemaining: favoredEnemyUsesRemaining }

  pure def transferHuntersMark(state: BattleState, target: Actor): BattleState =
    if (
      currentActor(state) == Fighter and
      target == Goblin and
      state.bonusActionAvailable and
      activeEffectsContainTransferableHuntersMark(state, state.fighter.activeEffects) and
      state.fighter.concentrating
    )
      {
        ...state,
        fighter: {
          ...state.fighter,
          activeEffects: activeEffectsWithoutHuntersMark(state.fighter.activeEffects)
            .union(Set(HuntersMarkDamageRider({
              target: target,
              transfer: AwaitingTargetDrop,
              durationTicks: activeEffectsHuntersMarkDurationTicks(state.fighter.activeEffects),
            }))),
        },
        bonusActionAvailable: false,
      }
    else
      state

  pure def resolveHex(state: BattleState, target: Actor, ability: Ability, slotLevel: int): BattleState =
    if (
      currentActor(state) == Fighter and
      target == Goblin and
      slotLevel >= 1 and
      state.bonusActionAvailable and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    )
      commitActorSpellSlotUse({
        ...state,
        fighter: {
          ...state.fighter,
          concentrating: true,
          activeEffects: activeEffectsWithoutHex(state.fighter.activeEffects)
            .union(Set(HexDamageRider({
              target: target,
              ability: ability,
              transfer: AwaitingTargetDrop,
              durationTicks: hexDurationTicks(slotLevel),
            }))),
        },
        bonusActionAvailable: false,
      }, Fighter)
    else
      state

  pure def transferHex(state: BattleState, target: Actor): BattleState =
    if (
      currentActor(state) == Fighter and
      target == Goblin and
      state.bonusActionAvailable and
      activeEffectsContainTransferableHex(state, state.fighter.activeEffects) and
      state.fighter.concentrating
    )
      {
        ...state,
        fighter: {
          ...state.fighter,
          activeEffects: activeEffectsWithoutHex(state.fighter.activeEffects)
            .union(Set(HexDamageRider({
              target: target,
              ability: activeEffectsHexAbility(state.fighter.activeEffects),
              transfer: AwaitingTargetDrop,
              durationTicks: activeEffectsHexDurationTicks(state.fighter.activeEffects),
            }))),
        },
        bonusActionAvailable: false,
      }
    else
      state
}
