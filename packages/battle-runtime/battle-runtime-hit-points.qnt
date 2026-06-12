// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-make-stable

// KERNEL-COVERAGE: qnt-owner BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE BATTLE.SPELL.MAKE_STABLE_LIFECYCLE
// KERNEL-COVERAGE: qnt-owner BATTLE.PROTOCOL.ZERO_HIT_POINT_MID_RESOLUTION

module battleRuntimeHitPoints {
  import hitPointDamage.* from "../shared-algebras/proofs/rule-core/hit-point-damage"
  import hitPointRecovery.* from "../shared-algebras/proofs/rule-core/hit-point-recovery"
  import zeroHitPointLifecycle.* from "../shared-algebras/proofs/rule-core/zero-hit-point-lifecycle"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSpellBridge.* from "./battle-runtime-spell-bridge"
  import battleRuntimeCombatantSide.* from "./battle-runtime-combatant-side"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"

  // Rule-core CreatureKind is the HP lifecycle policy, not source provenance.
  pure def combatantCreatureKind(target: Combatant): CreatureKind =
    match target.lifecycle {
      | DiesAtZeroHp => MonsterCreature
      | UsesDeathSavingThrows => PlayerCharacter
    }

  pure def combatantIsDead(target: Combatant): bool =
    match target.lifecycle {
      | DiesAtZeroHp => target.hp == 0
      | UsesDeathSavingThrows => target.deathFailures >= 3
    }

  pure def combatantVitals(target: Combatant): CreatureVitals = {
    kind: combatantCreatureKind(target),
    hitPoints: target.hp,
    hitPointMaximum: target.maxHp,
    temporaryHitPoints: target.tempHp,
    dead: combatantIsDead(target),
    unconscious:
      target.unconscious
        or (target.lifecycle == UsesDeathSavingThrows and target.hp == 0 and target.deathFailures < 3),
  }

  pure def combatantDeathSavingThrows(target: Combatant): DeathSavingThrowLifecycle =
    match target.lifecycle {
      | DiesAtZeroHp => resetDeathSavingThrowLifecycle
      | UsesDeathSavingThrows => {
          successes: target.deathSuccesses,
          failures: target.deathFailures,
          stable: target.stable,
          hpRegained: false,
        }
    }

  pure def combatantPositiveHitPointUnconsciousRecovery(target: Combatant): PositiveHitPointUnconsciousRecovery =
    if (target.knockedOut) EndsWhenHitPointsRegained else NoPositiveHitPointUnconsciousRecovery

  pure def combatantWithHitPointState(
    target: Combatant,
    vitals: CreatureVitals,
    deathSavingThrows: DeathSavingThrowLifecycle,
    recovery: PositiveHitPointUnconsciousRecovery
  ): Combatant =
    match target.lifecycle {
      | DiesAtZeroHp => {
          ...target,
          hp: vitals.hitPoints,
          tempHp: vitals.temporaryHitPoints,
          unconscious: vitals.unconscious,
          knockedOut: recovery == EndsWhenHitPointsRegained,
          stable: false,
        }
      | UsesDeathSavingThrows => {
          ...target,
          hp: vitals.hitPoints,
          tempHp: vitals.temporaryHitPoints,
          unconscious: vitals.unconscious or vitals.dead,
          knockedOut: recovery == EndsWhenHitPointsRegained,
          stable: deathSavingThrows.stable,
          deathSuccesses: deathSavingThrows.successes,
          deathFailures: if (vitals.dead) 3 else deathSavingThrows.failures,
        }
    }

  pure def combatantWithHitPointRecoveryResult(target: Combatant, result: HitPointRecoveryResult): Combatant =
    combatantWithHitPointState(target, result.vitals, result.deathSavingThrows, result.positiveHitPointUnconsciousRecovery)

  pure def combatantWithZeroHitPointLifecycleResult(target: Combatant, result: ZeroHitPointLifecycleResult): Combatant =
    combatantWithHitPointState(target, result.vitals, result.deathSavingThrows, NoPositiveHitPointUnconsciousRecovery)

  pure def activeEffectsPreventHitPointRegain(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | ChillTouchHitPointRegainPrevented(_) => true
      | _ => false
    })

  pure def applyHealing(target: Combatant, healing: int): Combatant = {
    val result = applyHitPointHealing(
      combatantVitals(target),
      combatantDeathSavingThrows(target),
      combatantPositiveHitPointUnconsciousRecovery(target),
      healing,
    )
    if (activeEffectsPreventHitPointRegain(target.activeEffects))
      target
    else
      combatantWithHitPointRecoveryResult(target, result)
  }

  pure def applyDamage(target: Combatant, damage: int, deathFailuresAtZeroHp: int, concentrationSaveSucceeded: bool): Combatant =
    applyDamageWithDisposition(target, damage, deathFailuresAtZeroHp, concentrationSaveSucceeded, OrdinaryDamage)

  pure def applyDamageFromSource(
    target: Combatant,
    damage: int,
    deathFailuresAtZeroHp: int,
    concentrationSaveSucceeded: bool,
    damageDisposition: DamageDisposition,
    damageSource: Actor,
  ): Combatant = {
    val damaged = applyDamageWithDisposition(target, damage, deathFailuresAtZeroHp, concentrationSaveSucceeded, damageDisposition)
    if (damage > 0 and battleRuntimeSleepEffectEndsOnDamage)
      combatantWithoutSleepEffects({
        ...damaged,
        activeEffects: activeEffectsAfterTargetDamagedByCasterOrAlly(damaged.activeEffects, actorDamageSource(damageSource)),
      })
    else
      damaged
  }

  pure def applyDamageWithDisposition(target: Combatant, damage: int, deathFailuresAtZeroHp: int, concentrationSaveSucceeded: bool, damageDisposition: DamageDisposition): Combatant = {
    val effectiveDamage = nonnegative(damage)
    val afterDamage =
      if (effectiveDamage <= 0)
        target
      else if (target.hp <= 0) {
        val result = applyDamageToZeroHitPointCreature(
          combatantVitals(target),
          combatantDeathSavingThrows(target),
          effectiveDamage,
          deathFailuresAtZeroHp >= 2,
        )
        combatantWithZeroHitPointLifecycleResult(target, result)
      } else {
        val result = applyResolvedDamageToPositiveHitPoints(combatantVitals(target), effectiveDamage)
        val recovery =
          if (damageDisposition == KnockOut) {
            applyKnockOutDisposition(result)
          } else {
            {
              vitals: result.vitals,
              deathSavingThrows:
                deathSavingThrowLifecycleAfterPositiveHitPointDamage(combatantDeathSavingThrows(target), result),
              positiveHitPointUnconsciousRecovery: NoPositiveHitPointUnconsciousRecovery,
              hitPointsRegained: 0,
            }
        }
        combatantWithHitPointRecoveryResult(target, recovery)
      }
    val afterIncapacitatingDamage =
      if (target.concentrating and not(target.unconscious) and afterDamage.unconscious)
        breakConcentration(afterDamage)
      else
        afterDamage

    if (target.concentrating and effectiveDamage > 0 and not(concentrationSaveSucceeded))
      breakConcentration(afterIncapacitatingDamage)
    else
      afterIncapacitatingDamage
  }

  pure def applyKnockOut(target: Combatant): Combatant =
    { ...breakConcentration(target), hp: 1, unconscious: true, knockedOut: true }

  pure def applyDropToZeroHp(target: Combatant): Combatant = {
    val damageResult = applyResolvedDamageToPositiveHitPoints(combatantVitals(target), target.hp)
    combatantWithHitPointRecoveryResult(
      breakConcentration(target),
      {
        vitals: damageResult.vitals,
        deathSavingThrows:
          deathSavingThrowLifecycleAfterPositiveHitPointDamage(
            combatantDeathSavingThrows(target),
            damageResult,
          ),
        positiveHitPointUnconsciousRecovery: NoPositiveHitPointUnconsciousRecovery,
        hitPointsRegained: 0,
      }
    )
  }

  pure def spareTheDyingRangeFeet(characterLevel: int): int =
    if (characterLevel >= 17) 120
    else if (characterLevel >= 11) 60
    else if (characterLevel >= 5) 30
    else 15

  pure def spareTheDyingTargetAdmitted(target: Combatant): bool =
    target.hp == 0 and
    target.lifecycle == UsesDeathSavingThrows and
    target.deathFailures < 3

  pure def applySpareTheDying(target: Combatant): Combatant =
    if (not(spareTheDyingTargetAdmitted(target)))
      target
    else
      {
        ...target,
        stable: true,
        deathSuccesses: 0,
        deathFailures: 0,
      }

  pure def applyDamageAtZeroHp(target: Combatant, deathFailuresAtZeroHp: int): Combatant =
    combatantWithZeroHitPointLifecycleResult(
      target,
      addDeathSavingThrowFailures(
        combatantVitals(target),
        combatantDeathSavingThrows(target),
        deathFailuresAtZeroHp,
      )
    )

  pure def applyInstantDeath(target: Combatant): Combatant =
    combatantWithZeroHitPointLifecycleResult(
      target,
      addDeathSavingThrowFailures(combatantVitals(target), combatantDeathSavingThrows(target), 3)
    )

  pure def applyStartTurnDeathSave(target: Combatant, deathSaveRoll: int): Combatant =
    combatantWithZeroHitPointLifecycleResult(
      target,
      resolveStartTurnDeathSavingThrow(combatantVitals(target), combatantDeathSavingThrows(target), deathSaveRoll)
    )
}
