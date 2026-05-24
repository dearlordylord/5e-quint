// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SEE_INVISIBILITY_OBSERVER_SIGHT
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-see-invisible-observer-sight
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-see-invisible-observer-sight

module battleRuntimeSeeInvisibility {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeActorCombatants.* from "./battle-runtime-actor-combatants"
  import battleRuntimeSpellAttack.* from "./battle-runtime-spell-attack"
  import battleRuntimeSanctuary.* from "./battle-runtime-sanctuary"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeSeeInvisibilityConstants.* from "./battle-runtime-see-invisibility-constants"

  pure def seeInvisibleAndEtherealActiveEffect(
    source: Actor,
    durationTicks: int,
  ): ActiveEffect =
    SeeInvisibleAndEthereal({
      source: source,
      durationTicks: durationTicks,
    })

  pure def activeEffectsWithoutSeeInvisibleAndEtherealFrom(
    effects: Set[ActiveEffect],
    source: Actor,
  ): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | SeeInvisibleAndEthereal(data) => data.source != source
      | _ => true
    })

  pure def activeEffectsContainSeeInvisibleAndEtherealFrom(
    effects: Set[ActiveEffect],
    source: Actor,
  ): bool =
    effects.exists(effect => match effect {
      | SeeInvisibleAndEthereal(data) => data.source == source
      | _ => false
    })

  pure def activeEffectsSeeInvisibleAndEtherealDurationTicks(
    effects: Set[ActiveEffect],
    source: Actor,
  ): int =
    effects
      .map(effect => match effect {
        | SeeInvisibleAndEthereal(data) =>
            if (data.source == source) data.durationTicks else 0
        | _ => 0
      })
      .fold(0, (highest, ticks) => if (highest > ticks) highest else ticks)

  pure def combatantWithSeeInvisibleAndEthereal(
    target: Combatant,
    source: Actor,
    durationTicks: int,
  ): Combatant =
    {
      ...target,
      activeEffects:
        activeEffectsWithoutSeeInvisibleAndEtherealFrom(
          target.activeEffects,
          source,
        ).union(Set(seeInvisibleAndEtherealActiveEffect(source, durationTicks))),
    }

  pure def combatantCanSeeTargetWithSeeInvisible(
    viewer: Combatant,
    target: Combatant,
    viewerSource: Actor,
  ): bool =
    target.hidden == NotHidden and (
      not(activeEffectsContainInvisibilityCondition(target.activeEffects)) or
      activeEffectsDenyInvisibleBenefit(target.activeEffects) or
      activeEffectsContainSeeInvisibleAndEtherealFrom(
        viewer.activeEffects,
        viewerSource,
      )
    )

  pure def seeInvisibleRevealsInvisibleObject(
    observer: Combatant,
    observerSource: Actor,
    objectHasInvisibleCondition: bool,
    hasSightLine: bool,
    blockedByOpaqueCover: bool,
  ): bool =
    activeEffectsContainSeeInvisibleAndEtherealFrom(
      observer.activeEffects,
      observerSource,
    ) and
    objectHasInvisibleCondition and
    hasSightLine and
    not(blockedByOpaqueCover)

  pure def seeInvisibleRevealsEtherealWitness(
    observer: Combatant,
    observerSource: Actor,
    targetPlane: SeeInvisibleWitnessPlane,
    hasSightLine: bool,
    blockedByOpaqueCover: bool,
  ): bool =
    activeEffectsContainSeeInvisibleAndEtherealFrom(
      observer.activeEffects,
      observerSource,
    ) and
    targetPlane == EtherealPlane and
    hasSightLine and
    not(blockedByOpaqueCover)

  pure def resolveSeeInvisibilitySpell(
    state: BattleState,
    slotLevel: int,
  ): BattleState =
    if (
      currentActor(state) == Fighter and
      state.actionAvailable and
      canExpendSpellSlotThisTurn(state) and
      slotLevel >= 2 and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    ) {
      val spent = spendFighterSpellActionCost(state, SpellMagicAction)
      commitActorSpellSlotUse({
        ...spent,
        fighter: combatantWithSeeInvisibleAndEthereal(
          spent.fighter,
          Fighter,
          seeInvisibilityDurationTicks,
        ),
      }, Fighter)
    } else {
      state
    }
}
