// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-warding-bond-linked-effect
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-warding-bond-linked-effect

module battleRuntimeWardingBond {
  import battleRuntimeModel.* from "./battle-runtime-model"

  type WardingBond =
    NoWardingBond |
    ActiveWardingBond({ source: Actor, target: Actor, durationTicks: int })

  type WardingBondState = {
    fighterHp: int,
    goblinHp: int,
    actionAvailable: bool,
    spellSlotAvailable: bool,
    bond: WardingBond,
  }

  pure def wardingBondDurationTicks(): int = 600

  pure def initialWardingBondState(): WardingBondState = {
    fighterHp: 12,
    goblinHp: 12,
    actionAvailable: true,
    spellSlotAvailable: true,
    bond: NoWardingBond,
  }

  pure def actorHp(state: WardingBondState, actor: Actor): int =
    match actor {
      | Fighter => state.fighterHp
      | Goblin => state.goblinHp
    }

  pure def stateWithActorHp(
    state: WardingBondState,
    actor: Actor,
    hp: int,
  ): WardingBondState = {
    val clamped = if (hp < 0) 0 else hp
    match actor {
      | Fighter => state.with("fighterHp", clamped)
      | Goblin => state.with("goblinHp", clamped)
    }
  }

  pure def wardingBondConnects(
    bond: WardingBond,
    source: Actor,
    target: Actor,
  ): bool =
    match bond {
      | NoWardingBond => false
      | ActiveWardingBond(active) =>
          active.source == source and active.target == target
    }

  pure def canCastWardingBond(
    state: WardingBondState,
    source: Actor,
    target: Actor,
    willingTarget: bool,
    pairedWornPlatinumRings: bool,
    connectedWithinSixtyFeet: bool,
  ): bool =
    state.actionAvailable and
    state.spellSlotAvailable and
    source != target and
    willingTarget and
    pairedWornPlatinumRings and
    connectedWithinSixtyFeet

  pure def castWardingBond(
    state: WardingBondState,
    source: Actor,
    target: Actor,
    willingTarget: bool,
    pairedWornPlatinumRings: bool,
    connectedWithinSixtyFeet: bool,
  ): WardingBondState =
    if (
      canCastWardingBond(
        state,
        source,
        target,
        willingTarget,
        pairedWornPlatinumRings,
        connectedWithinSixtyFeet,
      )
    ) {
      state
        .with("actionAvailable", false)
        .with("spellSlotAvailable", false)
        .with(
          "bond",
          ActiveWardingBond({
            source: source,
            target: target,
            durationTicks: wardingBondDurationTicks,
          })
        )
    } else state

  pure def wardingBondArmorClassBonus(
    state: WardingBondState,
    actor: Actor,
  ): int =
    match state.bond {
      | NoWardingBond => 0
      | ActiveWardingBond(active) => if (active.target == actor) 1 else 0
    }

  pure def wardingBondSavingThrowBonus(
    state: WardingBondState,
    actor: Actor,
  ): int =
    match state.bond {
      | NoWardingBond => 0
      | ActiveWardingBond(active) => if (active.target == actor) 1 else 0
    }

  pure def wardingBondHasAllDamageResistance(
    state: WardingBondState,
    actor: Actor,
  ): bool =
    match state.bond {
      | NoWardingBond => false
      | ActiveWardingBond(active) => active.target == actor
    }

  pure def wardingBondAdjustedTargetDamage(
    state: WardingBondState,
    actor: Actor,
    damage: int,
  ): int =
    if (wardingBondHasAllDamageResistance(state, actor)) damage / 2 else damage

  pure def applyWardingBondTargetDamage(
    state: WardingBondState,
    target: Actor,
    damage: int,
  ): WardingBondState = {
    val finalDamage = wardingBondAdjustedTargetDamage(state, target, damage)
    val afterTarget =
      stateWithActorHp(state, target, actorHp(state, target) - finalDamage)
    match state.bond {
      | NoWardingBond => afterTarget
      | ActiveWardingBond(active) =>
          if (active.target == target) {
            val afterSource = stateWithActorHp(
              afterTarget,
              active.source,
              actorHp(afterTarget, active.source) - finalDamage,
            )
            if (actorHp(afterSource, active.source) == 0)
              afterSource.with("bond", NoWardingBond)
            else afterSource
          } else afterTarget
    }
  }

  pure def separateWardingBond(
    state: WardingBondState,
    source: Actor,
    target: Actor,
    separatedBeyondSixtyFeet: bool,
  ): WardingBondState =
    if (
      separatedBeyondSixtyFeet and wardingBondConnects(state.bond, source, target)
    ) state.with("bond", NoWardingBond) else state

  pure def tickWardingBondDuration(state: WardingBondState): WardingBondState =
    match state.bond {
      | NoWardingBond => state
      | ActiveWardingBond(active) =>
          if (active.durationTicks <= 1) state.with("bond", NoWardingBond)
          else state.with(
            "bond",
            ActiveWardingBond({
              source: active.source,
              target: active.target,
              durationTicks: active.durationTicks - 1,
            })
          )
    }

}
