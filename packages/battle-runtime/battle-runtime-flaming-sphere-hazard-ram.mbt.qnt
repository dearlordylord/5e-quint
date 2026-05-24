// -*- mode: Bluespec; -*-

module battleRuntimeFlamingSphereHazardRamMbt {
  import battleRuntimeFlamingSphereHazardRam.* from "./battle-runtime-flaming-sphere-hazard-ram"
  import hitPointDamage.* from "../shared-algebras/proofs/rule-core/hit-point-damage"

  var qActionAvailable: bool
  var qCasterHasBonusAction: bool
  var qSphereActive: bool
  var qSphereDamageDice: int
  var qSphereDurationTicks: int
  var qSphereRamMaxMoveFeet: int
  var qSlotLedgerLevel: int
  var qSlotsRemaining: int
  var qSlotSpellCastThisTurn: bool
  var qTargetHitPoints: int
  var qTargetHitPointMaximum: int
  var qTargetTemporaryHitPoints: int
  var qTargetDead: bool
  var qTargetUnconscious: bool

  pure def flamingSphereHazardRamState(
    actionAvailable: bool,
    casterHasBonusAction: bool,
    sphereActive: bool,
    sphereDamageDice: int,
    sphereDurationTicks: int,
    sphereRamMaxMoveFeet: int,
    slotLedgerLevel: int,
    slotsRemaining: int,
    slotSpellCastThisTurn: bool,
    targetHitPoints: int,
    targetHitPointMaximum: int,
    targetTemporaryHitPoints: int,
    targetDead: bool,
    targetUnconscious: bool,
  ): FlamingSphereHazardRamState = {
    actionAvailable: actionAvailable,
    casterHasBonusAction: casterHasBonusAction,
    sphere:
      if (sphereActive)
        FlamingSphereActive({
          damageDice: sphereDamageDice,
          durationTicks: sphereDurationTicks,
          ramMaxMoveFeet: sphereRamMaxMoveFeet,
        })
      else
        FlamingSphereAbsent,
    slotLedger: {
      slotLevel: slotLedgerLevel,
      slotsRemaining: slotsRemaining,
    },
    slotSpellCastThisTurn: slotSpellCastThisTurn,
    targetVitals: {
      kind: MonsterCreature,
      hitPoints: targetHitPoints,
      hitPointMaximum: targetHitPointMaximum,
      temporaryHitPoints: targetTemporaryHitPoints,
      dead: targetDead,
      unconscious: targetUnconscious,
    },
  }

  action recordNextState(nextState: FlamingSphereHazardRamState): bool = all {
    qActionAvailable' = nextState.actionAvailable,
    qCasterHasBonusAction' = nextState.casterHasBonusAction,
    qSphereActive' = match nextState.sphere {
      | FlamingSphereAbsent => false
      | FlamingSphereActive(_) => true
    },
    qSphereDamageDice' = match nextState.sphere {
      | FlamingSphereAbsent => 0
      | FlamingSphereActive(sphere) => sphere.damageDice
    },
    qSphereDurationTicks' = match nextState.sphere {
      | FlamingSphereAbsent => 0
      | FlamingSphereActive(sphere) => sphere.durationTicks
    },
    qSphereRamMaxMoveFeet' = match nextState.sphere {
      | FlamingSphereAbsent => 0
      | FlamingSphereActive(sphere) => sphere.ramMaxMoveFeet
    },
    qSlotLedgerLevel' = nextState.slotLedger.slotLevel,
    qSlotsRemaining' = nextState.slotLedger.slotsRemaining,
    qSlotSpellCastThisTurn' = nextState.slotSpellCastThisTurn,
    qTargetHitPoints' = nextState.targetVitals.hitPoints,
    qTargetHitPointMaximum' = nextState.targetVitals.hitPointMaximum,
    qTargetTemporaryHitPoints' = nextState.targetVitals.temporaryHitPoints,
    qTargetDead' = nextState.targetVitals.dead,
    qTargetUnconscious' = nextState.targetVitals.unconscious,
  }

  action init = {
    nondet slotLedgerLevel = flamingSphereMinimumSlotLevel.to(4).oneOf()
    all {
    qActionAvailable' = true,
    qCasterHasBonusAction' = true,
    qSphereActive' = false,
    qSphereDamageDice' = 0,
    qSphereDurationTicks' = 0,
    qSphereRamMaxMoveFeet' = 0,
    qSlotLedgerLevel' = slotLedgerLevel,
    qSlotsRemaining' = 1,
    qSlotSpellCastThisTurn' = false,
    qTargetHitPoints' = 12,
    qTargetHitPointMaximum' = 12,
    qTargetTemporaryHitPoints' = 0,
    qTargetDead' = false,
    qTargetUnconscious' = false,
    }
  }

  action doCastFlamingSphere = {
    nondet slotLevel = flamingSphereMinimumSlotLevel.to(4).oneOf()
    all {
      recordNextState(resolveFlamingSphereCast(flamingSphereHazardRamState(
        qActionAvailable,
        qCasterHasBonusAction,
        qSphereActive,
        qSphereDamageDice,
        qSphereDurationTicks,
        qSphereRamMaxMoveFeet,
        qSlotLedgerLevel,
        qSlotsRemaining,
        qSlotSpellCastThisTurn,
        qTargetHitPoints,
        qTargetHitPointMaximum,
        qTargetTemporaryHitPoints,
        qTargetDead,
        qTargetUnconscious,
      ), slotLevel)),
    }
  }

  action doEndWithinFiveFeet = {
    nondet savingThrowSucceeded = Set(true, false).oneOf()
    nondet rolledDamage = 0.to(24).oneOf()
    all {
      recordNextState(resolveFlamingSphereHazardRam(
        flamingSphereHazardRamState(
          qActionAvailable,
          qCasterHasBonusAction,
          qSphereActive,
          qSphereDamageDice,
          qSphereDurationTicks,
          qSphereRamMaxMoveFeet,
          qSlotLedgerLevel,
          qSlotsRemaining,
          qSlotSpellCastThisTurn,
          qTargetHitPoints,
          qTargetHitPointMaximum,
          qTargetTemporaryHitPoints,
          qTargetDead,
          qTargetUnconscious,
        ),
        FlamingSphereEndWithinFiveFeet,
        {
          savingThrowSucceeded: savingThrowSucceeded,
          rolledDamage: rolledDamage,
          moveFeet: 0,
        },
      )),
    }
  }

  action doRam = {
    nondet savingThrowSucceeded = Set(true, false).oneOf()
    nondet rolledDamage = 0.to(24).oneOf()
    nondet moveFeet = 0.to(31).oneOf()
    all {
      recordNextState(resolveFlamingSphereHazardRam(
        flamingSphereHazardRamState(
          qActionAvailable,
          qCasterHasBonusAction,
          qSphereActive,
          qSphereDamageDice,
          qSphereDurationTicks,
          qSphereRamMaxMoveFeet,
          qSlotLedgerLevel,
          qSlotsRemaining,
          qSlotSpellCastThisTurn,
          qTargetHitPoints,
          qTargetHitPointMaximum,
          qTargetTemporaryHitPoints,
          qTargetDead,
          qTargetUnconscious,
        ),
        FlamingSphereRam,
        {
          savingThrowSucceeded: savingThrowSucceeded,
          rolledDamage: rolledDamage,
          moveFeet: moveFeet,
        },
      )),
    }
  }

  action step = any {
    doCastFlamingSphere,
    doEndWithinFiveFeet,
    doRam,
  }
}
