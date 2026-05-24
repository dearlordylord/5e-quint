// -*- mode: Bluespec; -*-

module battleRuntimeSeeInvisibilityObserverSightMbt {
  import battleRuntimeSeeInvisibilityConstants.* from "./battle-runtime-see-invisibility-constants"

  type SeeInvisibilityObserverEffect =
    | SeeInvisibilityObserverEffectAbsent
    | SeeInvisibilityObserverEffectActive({ durationTicks: int })

  type SeeInvisibilityObjectWitness = {
    objectHasInvisibleCondition: bool,
    hasSightLine: bool,
    blockedByOpaqueCover: bool,
  }

  type SeeInvisibilityEtherealWitness = {
    targetPlane: SeeInvisibleWitnessPlane,
    hasSightLine: bool,
    blockedByOpaqueCover: bool,
  }

  type SeeInvisibilityObserverSightState = {
    actionAvailable: bool,
    slotSpellCastThisTurn: bool,
    observerEffect: SeeInvisibilityObserverEffect,
    targetHasInvisibleCondition: bool,
    targetHidden: bool,
    objectWitness: SeeInvisibilityObjectWitness,
    etherealWitness: SeeInvisibilityEtherealWitness,
  }

  var qActionAvailable: bool
  var qSlotSpellCastThisTurn: bool
  var qObserverEffect: SeeInvisibilityObserverEffect
  var qTargetHasInvisibleCondition: bool
  var qTargetHidden: bool
  var qObjectHasInvisibleCondition: bool
  var qObjectHasSightLine: bool
  var qObjectBlockedByOpaqueCover: bool
  var qEtherealTargetPlane: SeeInvisibleWitnessPlane
  var qEtherealHasSightLine: bool
  var qEtherealBlockedByOpaqueCover: bool
  var qProjectedTargetVisibleToObserver: bool
  var qProjectedObjectVisibleToObserver: bool
  var qProjectedEtherealVisibleToObserver: bool

  pure def observerEffectActive(effect: SeeInvisibilityObserverEffect): bool =
    match effect {
      | SeeInvisibilityObserverEffectAbsent => false
      | SeeInvisibilityObserverEffectActive(_) => true
    }

  pure def projectedTargetVisibleToObserver(
    state: SeeInvisibilityObserverSightState,
  ): bool =
    not(state.targetHidden) and (
      not(state.targetHasInvisibleCondition) or
      observerEffectActive(state.observerEffect)
    )

  pure def projectedObjectVisibleToObserver(
    state: SeeInvisibilityObserverSightState,
  ): bool =
    observerEffectActive(state.observerEffect) and
    state.objectWitness.objectHasInvisibleCondition and
    state.objectWitness.hasSightLine and
    not(state.objectWitness.blockedByOpaqueCover)

  pure def projectedEtherealVisibleToObserver(
    state: SeeInvisibilityObserverSightState,
  ): bool =
    observerEffectActive(state.observerEffect) and
    state.etherealWitness.targetPlane == EtherealPlane and
    state.etherealWitness.hasSightLine and
    not(state.etherealWitness.blockedByOpaqueCover)

  pure def seeInvisibilityObserverSightState(
    actionAvailable: bool,
    slotSpellCastThisTurn: bool,
    observerEffect: SeeInvisibilityObserverEffect,
    targetHasInvisibleCondition: bool,
    targetHidden: bool,
    objectWitness: SeeInvisibilityObjectWitness,
    etherealWitness: SeeInvisibilityEtherealWitness,
  ): SeeInvisibilityObserverSightState = {
    actionAvailable: actionAvailable,
    slotSpellCastThisTurn: slotSpellCastThisTurn,
    observerEffect: observerEffect,
    targetHasInvisibleCondition: targetHasInvisibleCondition,
    targetHidden: targetHidden,
    objectWitness: objectWitness,
    etherealWitness: etherealWitness,
  }

  pure def currentSeeInvisibilityObserverSightState:
    SeeInvisibilityObserverSightState =
    seeInvisibilityObserverSightState(
      qActionAvailable,
      qSlotSpellCastThisTurn,
      qObserverEffect,
      qTargetHasInvisibleCondition,
      qTargetHidden,
      {
        objectHasInvisibleCondition: qObjectHasInvisibleCondition,
        hasSightLine: qObjectHasSightLine,
        blockedByOpaqueCover: qObjectBlockedByOpaqueCover,
      },
      {
        targetPlane: qEtherealTargetPlane,
        hasSightLine: qEtherealHasSightLine,
        blockedByOpaqueCover: qEtherealBlockedByOpaqueCover,
      },
    )

  pure def resolveSeeInvisibilityObserverSightCast(
    state: SeeInvisibilityObserverSightState,
  ): SeeInvisibilityObserverSightState =
    if (state.actionAvailable and not(state.slotSpellCastThisTurn))
      seeInvisibilityObserverSightState(
        false,
        true,
        SeeInvisibilityObserverEffectActive({
          durationTicks: seeInvisibilityDurationTicks,
        }),
        state.targetHasInvisibleCondition,
        state.targetHidden,
        state.objectWitness,
        state.etherealWitness,
      )
    else
      state

  pure def tickSeeInvisibilityObserverEffect(
    effect: SeeInvisibilityObserverEffect,
  ): SeeInvisibilityObserverEffect =
    match effect {
      | SeeInvisibilityObserverEffectAbsent => SeeInvisibilityObserverEffectAbsent
      | SeeInvisibilityObserverEffectActive(data) =>
          if (data.durationTicks <= 1)
            SeeInvisibilityObserverEffectAbsent
          else
            SeeInvisibilityObserverEffectActive({
              durationTicks: data.durationTicks - 1,
            })
    }

  pure def tickSeeInvisibilityObserverSightDuration(
    state: SeeInvisibilityObserverSightState,
  ): SeeInvisibilityObserverSightState =
    seeInvisibilityObserverSightState(
      state.actionAvailable,
      state.slotSpellCastThisTurn,
      tickSeeInvisibilityObserverEffect(state.observerEffect),
      state.targetHasInvisibleCondition,
      state.targetHidden,
      state.objectWitness,
      state.etherealWitness,
    )

  pure def seeInvisibilityObserverSightNearlyExpired(
    state: SeeInvisibilityObserverSightState,
  ): SeeInvisibilityObserverSightState =
    if (observerEffectActive(state.observerEffect))
      seeInvisibilityObserverSightState(
        state.actionAvailable,
        state.slotSpellCastThisTurn,
        SeeInvisibilityObserverEffectActive({ durationTicks: 1 }),
        state.targetHasInvisibleCondition,
        state.targetHidden,
        state.objectWitness,
        state.etherealWitness,
      )
    else
      state

  action recordNextState(nextState: SeeInvisibilityObserverSightState): bool = all {
    qActionAvailable' = nextState.actionAvailable,
    qSlotSpellCastThisTurn' = nextState.slotSpellCastThisTurn,
    qObserverEffect' = nextState.observerEffect,
    qTargetHasInvisibleCondition' = nextState.targetHasInvisibleCondition,
    qTargetHidden' = nextState.targetHidden,
    qObjectHasInvisibleCondition' = nextState.objectWitness.objectHasInvisibleCondition,
    qObjectHasSightLine' = nextState.objectWitness.hasSightLine,
    qObjectBlockedByOpaqueCover' = nextState.objectWitness.blockedByOpaqueCover,
    qEtherealTargetPlane' = nextState.etherealWitness.targetPlane,
    qEtherealHasSightLine' = nextState.etherealWitness.hasSightLine,
    qEtherealBlockedByOpaqueCover' = nextState.etherealWitness.blockedByOpaqueCover,
    qProjectedTargetVisibleToObserver' = projectedTargetVisibleToObserver(nextState),
    qProjectedObjectVisibleToObserver' = projectedObjectVisibleToObserver(nextState),
    qProjectedEtherealVisibleToObserver' = projectedEtherealVisibleToObserver(nextState),
  }

  action init = {
    nondet targetHasInvisibleCondition = Set(true, false).oneOf()
    nondet targetHidden = Set(true, false).oneOf()
    nondet objectHasInvisibleCondition = Set(true, false).oneOf()
    nondet objectHasSightLine = Set(true, false).oneOf()
    nondet objectBlockedByOpaqueCover = Set(true, false).oneOf()
    nondet etherealTargetPlane = Set(MaterialPlane, EtherealPlane).oneOf()
    nondet etherealHasSightLine = Set(true, false).oneOf()
    nondet etherealBlockedByOpaqueCover = Set(true, false).oneOf()
    all {
      recordNextState(seeInvisibilityObserverSightState(
        true,
        false,
        SeeInvisibilityObserverEffectAbsent,
        targetHasInvisibleCondition,
        targetHidden,
        {
          objectHasInvisibleCondition: objectHasInvisibleCondition,
          hasSightLine: objectHasSightLine,
          blockedByOpaqueCover: objectBlockedByOpaqueCover,
        },
        {
          targetPlane: etherealTargetPlane,
          hasSightLine: etherealHasSightLine,
          blockedByOpaqueCover: etherealBlockedByOpaqueCover,
        },
      )),
    }
  }

  action doCastSeeInvisibility = all {
    recordNextState(resolveSeeInvisibilityObserverSightCast(
      currentSeeInvisibilityObserverSightState,
    )),
  }

  action doSetTargetFacts = {
    nondet targetHasInvisibleCondition = Set(true, false).oneOf()
    nondet targetHidden = Set(true, false).oneOf()
    all {
      recordNextState(seeInvisibilityObserverSightState(
        qActionAvailable,
        qSlotSpellCastThisTurn,
        qObserverEffect,
        targetHasInvisibleCondition,
        targetHidden,
        currentSeeInvisibilityObserverSightState.objectWitness,
        currentSeeInvisibilityObserverSightState.etherealWitness,
      )),
    }
  }

  action doSetObjectWitness = {
    nondet objectHasInvisibleCondition = Set(true, false).oneOf()
    nondet objectHasSightLine = Set(true, false).oneOf()
    nondet objectBlockedByOpaqueCover = Set(true, false).oneOf()
    all {
      recordNextState(seeInvisibilityObserverSightState(
        qActionAvailable,
        qSlotSpellCastThisTurn,
        qObserverEffect,
        qTargetHasInvisibleCondition,
        qTargetHidden,
        {
          objectHasInvisibleCondition: objectHasInvisibleCondition,
          hasSightLine: objectHasSightLine,
          blockedByOpaqueCover: objectBlockedByOpaqueCover,
        },
        currentSeeInvisibilityObserverSightState.etherealWitness,
      )),
    }
  }

  action doSetEtherealWitness = {
    nondet etherealTargetPlane = Set(MaterialPlane, EtherealPlane).oneOf()
    nondet etherealHasSightLine = Set(true, false).oneOf()
    nondet etherealBlockedByOpaqueCover = Set(true, false).oneOf()
    all {
      recordNextState(seeInvisibilityObserverSightState(
        qActionAvailable,
        qSlotSpellCastThisTurn,
        qObserverEffect,
        qTargetHasInvisibleCondition,
        qTargetHidden,
        currentSeeInvisibilityObserverSightState.objectWitness,
        {
          targetPlane: etherealTargetPlane,
          hasSightLine: etherealHasSightLine,
          blockedByOpaqueCover: etherealBlockedByOpaqueCover,
        },
      )),
    }
  }

  action doMakeObserverEffectNearlyExpired = all {
    recordNextState(seeInvisibilityObserverSightNearlyExpired(
      currentSeeInvisibilityObserverSightState,
    )),
  }

  action doDurationTick = all {
    recordNextState(tickSeeInvisibilityObserverSightDuration(
      currentSeeInvisibilityObserverSightState,
    )),
  }

  action step = any {
    doCastSeeInvisibility,
    doSetTargetFacts,
    doSetObjectWitness,
    doSetEtherealWitness,
    doMakeObserverEffectNearlyExpired,
    doDurationTick,
  }
}
