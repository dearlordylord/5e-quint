// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-damage-save-or-attack spell.hit-point-restoration spell.reaction-shield spell.readied-action-time-spell
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS BATTLE.SPELL.HIT_POINT_RESTORATION

module spellProcedureProfiles {
  import hitPointDamage.* from "./hit-point-damage"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"
  import hitPointRecovery.* from "./hit-point-recovery"
  import damageComponentAdjustments.* from "./damage-component-adjustments"
  import attackDamageComposition.* from "./attack-damage-composition"
  import actionTurnProcedures.* from "./action-turn-procedures"
  import spellDefinitionProfiles.* from "./spell-definition-profiles"
  import spellInvocationResourceCore.* from "./spell-invocation-resource-core"
  import spellInvocationActionSlotCore.* from "./spell-invocation-action-slot-core"
  import spellInvocationTargetCardinalityCore.* from "./spell-invocation-target-cardinality-core"
  import spellDamageProjectionCore.* from "./spell-damage-projection-core"
  import spellAttackDamageProjectionCore.* from "./spell-attack-damage-projection-core"
  import spellSaveDamageProjectionCore.* from "./spell-save-damage-projection-core"
  import spellChainedAttackDamageProjectionCore.* from "./spell-chained-attack-damage-projection-core"
  import reactionsContinuationsConcentration.* from "./reactions-continuations-concentration"

  // RAW anchors:
  // - Spells/Gaining-and-Casting.md: Spell Slots, cantrips, Casting Time,
  //   targets, Saving Throws, Attack Rolls, and spell effects.
  // - Rules-Glossary.md: Ready, Magic, Concentration, Spell Attack, Target.
  // - Spells/Descriptions-A-D.md: Acid Splash and Cure Wounds.
  // - Spells/Descriptions-E-L.md: Healing Word.
  // - Spells/Descriptions-M-P.md: Mage Armor, Magic Missile, Mass Cure
  //   Wounds, Mass Healing Word, and Mind Spike.
  // - Spells/Descriptions-Q-R.md: Ray of Frost.

  type AttackBurstSaveDamageProfile =
    | IceKnifeAttackBurstSaveDamageProfile

  type SleepRepeatSaveLifecycle =
    | NoSleepRepeatSaveLifecycle
    | PendingSleepRepeatSaveLifecycle({ hadIncapacitated: bool })
    | UnconsciousSleepRepeatSaveLifecycle({
        hadIncapacitated: bool,
        hadUnconscious: bool,
      })

  type SpellAreaProfile =
    | NoSpellAreaProfile
    | MassCureWoundsPointOriginSphereArea

  type ReadiedSpellProfile =
    | ReadiedMagicMissileSpellProfile
    | ReadiedRayOfFrostSpellProfile
    | ReadiedAcidSplashSpellProfile
    | ReadiedMageArmorSpellProfile

  type MagicMissileEffectFacts = {
    slotLevel: int,
    allocatedDarts: int,
    dartDamageRoll: int,
  }

  type RayOfFrostEffectFacts = {
    attackRoll: AttackRollProcedureFacts,
    baseDamageDice: int,
    rolledDamageDiceCount: int,
    damageRoll: int,
  }

  type SaveDamageSpellEffectFacts = {
    savingThrowFailed: bool,
    damageRoll: int,
  }

  type DirectHitPointRestorationEffectFacts = {
    profile: SpellDefinitionProfile,
    slotLevel: int,
    healingDiceRoll: int,
    spellcastingAbilityModifier: int,
  }

  type MageArmorEffectFacts = {
    willingTarget: bool,
    targetWearingArmor: bool,
    dexterityModifier: int,
  }

  type SpellEffect =
    | NoSpellEffect
    | RayOfFrostSpeedReductionEffect
    | MageArmorActiveEffect

  type ReadiedSpellHeldEffect =
    | NoReadiedSpellHeldEffect
    | HeldReadiedSpellEffect({ profile: ReadiedSpellProfile })

  type DamageSpellEffectResult = {
    damageAmount: int,
    damageType: RuleDamageType,
    effect: SpellEffect,
  }

  type MageArmorResult = {
    effect: SpellEffect,
    baseArmorClass: int,
  }

  type ReadiedSpellProcedureState = {
    reaction: ReactionProtocolState,
    heldEffect: ReadiedSpellHeldEffect,
  }

  type ReadiedSpellRelease =
    | NoReadiedSpellRelease
    | ReleasedMagicMissileSpell
    | ReleasedRayOfFrostSpell
    | ReleasedAcidSplashSpell
    | ReleasedMageArmorSpell

  type ReadiedSpellReleaseResult = {
    readiedSpell: ReadiedSpellProcedureState,
    released: ReadiedSpellRelease,
  }

  type ReadiedSpellHoldResult = {
    spellcasting: SpellcastingProcedureState,
    readiedSpell: ReadiedSpellProcedureState,
    held: bool,
    slotExpended: bool,
  }

  pure def initialReadiedSpellProcedureState: ReadiedSpellProcedureState = {
    reaction: initialReactionProtocolState,
    heldEffect: NoReadiedSpellHeldEffect,
  }

  pure def legalSpellEffects: Set[SpellEffect] = Set(
    NoSpellEffect,
    RayOfFrostSpeedReductionEffect,
    MageArmorActiveEffect
  )

  pure def legalReadiedSpellHeldEffects: Set[ReadiedSpellHeldEffect] = Set(
    NoReadiedSpellHeldEffect,
    HeldReadiedSpellEffect({ profile: ReadiedMagicMissileSpellProfile }),
    HeldReadiedSpellEffect({ profile: ReadiedRayOfFrostSpellProfile }),
    HeldReadiedSpellEffect({ profile: ReadiedAcidSplashSpellProfile }),
    HeldReadiedSpellEffect({ profile: ReadiedMageArmorSpellProfile })
  )

  pure def legalSpellEffect(effect: SpellEffect): bool =
    effect.in(legalSpellEffects)

  pure def legalReadiedSpellHeldEffect(effect: ReadiedSpellHeldEffect): bool =
    effect.in(legalReadiedSpellHeldEffects)

  pure def legalReadiedSpellProcedureState(state: ReadiedSpellProcedureState): bool = all {
    legalReactionProtocolState(state.reaction),
    legalReadiedSpellHeldEffect(state.heldEffect),
  }

  pure def legalReadiedSpellRelease(release: ReadiedSpellRelease): bool =
    release.in(Set(
      NoReadiedSpellRelease,
      ReleasedMagicMissileSpell,
      ReleasedRayOfFrostSpell,
      ReleasedAcidSplashSpell,
      ReleasedMageArmorSpell
    ))

  pure def spellProfileArea(profile: SpellDefinitionProfile): SpellAreaProfile =
    if (profile == MassCureWoundsSpellProfile) MassCureWoundsPointOriginSphereArea else NoSpellAreaProfile

  val massCureWoundsPointOriginSphereRadiusFeet = 30

  pure def attackBurstSaveDamageRequiresSlot(profile: AttackBurstSaveDamageProfile): bool =
    match profile {
      | IceKnifeAttackBurstSaveDamageProfile => true
    }

  pure def attackBurstSaveDamageAttackType(profile: AttackBurstSaveDamageProfile): RuleDamageType =
    match profile {
      | IceKnifeAttackBurstSaveDamageProfile => PiercingDamage
    }

  pure def attackBurstSaveDamageBurstType(profile: AttackBurstSaveDamageProfile): RuleDamageType =
    match profile {
      | IceKnifeAttackBurstSaveDamageProfile => ColdDamage
    }

  pure def attackBurstSaveDamageBurstDice(profile: AttackBurstSaveDamageProfile, slotLevel: int): int =
    match profile {
      | IceKnifeAttackBurstSaveDamageProfile => if (slotLevel < 1) 0 else 2 + (slotLevel - 1)
    }

  pure def attackBurstSaveDamageBurstAmount(damageRoll: int, savingThrowSucceeded: bool): int =
    if (savingThrowSucceeded) 0 else damageRoll

  pure def sleepInitialSaveLifecycle(
    savingThrowSucceeded: bool,
    hadIncapacitated: bool,
  ): SleepRepeatSaveLifecycle =
    if (savingThrowSucceeded)
      NoSleepRepeatSaveLifecycle
    else
      PendingSleepRepeatSaveLifecycle({ hadIncapacitated: hadIncapacitated })

  pure def sleepSavingThrowAutomaticallySucceeds(
    targetDoesNotSleep: bool,
    targetHasExhaustionImmunity: bool,
  ): bool =
    targetDoesNotSleep or targetHasExhaustionImmunity

  pure def sleepRepeatSaveLifecycle(
    pending: SleepRepeatSaveLifecycle,
    savingThrowSucceeded: bool,
    hadUnconscious: bool,
  ): SleepRepeatSaveLifecycle =
    match pending {
      | PendingSleepRepeatSaveLifecycle(data) =>
          if (savingThrowSucceeded)
            NoSleepRepeatSaveLifecycle
          else
            UnconsciousSleepRepeatSaveLifecycle({
              hadIncapacitated: data.hadIncapacitated,
              hadUnconscious: hadUnconscious,
            })
      | _ => pending
    }

  pure def sleepEffectEndsOnDamage: bool = true

  pure def sleepEffectEndsOnAdjacentShakeAwakeAction: bool = true

  pure def rayOfFrostMaximumBaseDamageDice: int = 4

  pure def magicMissileDirectDamageFacts(
    facts: MagicMissileEffectFacts
  ): DirectSpellDamageFacts = {
    damageType: ForceDamage,
    instanceCount: facts.allocatedDarts,
    damagePerInstance: facts.dartDamageRoll,
    minimumInstanceCount: 1,
    maximumInstanceCount: magicMissileDartCount(facts.slotLevel),
    minimumDamagePerInstance: 2,
    maximumDamagePerInstance: 5,
  }

  pure def legalMagicMissileEffectFacts(facts: MagicMissileEffectFacts): bool = all {
    facts.slotLevel >= 1,
    facts.slotLevel <= 9,
    legalDirectSpellDamageFacts(magicMissileDirectDamageFacts(facts)),
  }

  pure def resolveMagicMissileDamage(facts: MagicMissileEffectFacts): DamageSpellEffectResult = {
    val result = resolveDirectSpellDamage(magicMissileDirectDamageFacts(facts))
    if (facts.slotLevel < 1 or facts.slotLevel > 9) {
      damageAmount: 0,
      damageType: ForceDamage,
      effect: NoSpellEffect,
    } else {
      damageAmount: result.damageAmount,
      damageType: result.damageType,
      effect: NoSpellEffect,
    }
  }

  pure def resolveRayOfFrostEffect(facts: RayOfFrostEffectFacts): DamageSpellEffectResult = {
    val result = resolveSpellAttackDamageBranch({
      attackRoll: facts.attackRoll,
      damageType: ColdDamage,
      hitProjections: Set(SpellAttackSpeedReductionHitProjection),
      baseDamageDice: facts.baseDamageDice,
      maximumBaseDamageDice: rayOfFrostMaximumBaseDamageDice,
      rolledDamageDiceCount: facts.rolledDamageDiceCount,
      damageDieSize: 8,
      damageRoll: facts.damageRoll,
    })
    {
      damageAmount: result.damageAmount,
      damageType: result.damageType,
      effect:
        if (result.hitProjections.contains(SpellAttackSpeedReductionHitProjection))
          RayOfFrostSpeedReductionEffect
        else
          NoSpellEffect,
    }
  }

  pure def resolveAcidSplashEffect(facts: SaveDamageSpellEffectFacts): DamageSpellEffectResult = {
    val result = resolveSpellSaveDamageBranch({
      damageType: AcidDamage,
      successPolicy: SpellNoDamageOnSuccessfulSave,
      failedSaveProjections: Set(),
      savingThrowFailed: facts.savingThrowFailed,
      damageRoll: facts.damageRoll,
    })
    {
      damageAmount: result.damageAmount,
      damageType: result.damageType,
      effect: NoSpellEffect,
    }
  }

  pure def directHitPointRestorationDiceCount(
    profile: SpellDefinitionProfile,
    slotLevel: int
  ): int =
    if (profile == CureWoundsSpellProfile) 2 + (2 * (slotLevel - 1))
    else if (profile == MassHealingWordSpellProfile) 2 + (slotLevel - 3)
    else if (profile == MassCureWoundsSpellProfile) 5 + (slotLevel - 5)
    else 2 + (2 * (slotLevel - 1))

  pure def directHitPointRestorationDieSize(profile: SpellDefinitionProfile): int =
    if (profile == CureWoundsSpellProfile or profile == MassCureWoundsSpellProfile) 8 else 4

  pure def legalDirectHitPointRestorationEffectFacts(facts: DirectHitPointRestorationEffectFacts): bool = {
    val diceCount = directHitPointRestorationDiceCount(facts.profile, facts.slotLevel)
    val dieSize = directHitPointRestorationDieSize(facts.profile)
    all {
      facts.profile.in(Set(HealingWordSpellProfile, CureWoundsSpellProfile, MassHealingWordSpellProfile, MassCureWoundsSpellProfile)),
      facts.slotLevel >= spellProfileMinimumSlotLevel(facts.profile),
      facts.slotLevel <= 9,
      facts.healingDiceRoll >= diceCount,
      facts.healingDiceRoll <= diceCount * dieSize,
      facts.spellcastingAbilityModifier >= -5,
      facts.spellcastingAbilityModifier <= 10,
    }
  }

  pure def resolveDirectHitPointRestorationEffect(
    vitals: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle,
    recovery: PositiveHitPointUnconsciousRecovery,
    facts: DirectHitPointRestorationEffectFacts
  ): HitPointRecoveryResult =
    if (not(legalDirectHitPointRestorationEffectFacts(facts))) {
      vitals: vitals,
      deathSavingThrows: lifecycle,
      positiveHitPointUnconsciousRecovery: recovery,
      hitPointsRegained: 0,
    } else {
      applyHitPointHealing(
        vitals,
        lifecycle,
        recovery,
        facts.healingDiceRoll + facts.spellcastingAbilityModifier
      )
    }

  pure def resolveMageArmorEffect(facts: MageArmorEffectFacts): MageArmorResult =
    if (facts.willingTarget and not(facts.targetWearingArmor) and facts.dexterityModifier >= -5 and facts.dexterityModifier <= 10) {
      effect: MageArmorActiveEffect,
      baseArmorClass: 13 + facts.dexterityModifier,
    } else {
      effect: NoSpellEffect,
      baseArmorClass: 0,
    }

  pure def endMageArmorIfTargetDonsArmor(effect: SpellEffect, targetDonsArmor: bool): SpellEffect =
    if (effect == MageArmorActiveEffect and targetDonsArmor) NoSpellEffect else effect

  pure def asReadiedSpellProfile(profile: SpellDefinitionProfile): ReadiedSpellHeldEffect =
    if (profile == MagicMissileSpellProfile) {
      HeldReadiedSpellEffect({ profile: ReadiedMagicMissileSpellProfile })
    } else if (profile == RayOfFrostSpellProfile) {
      HeldReadiedSpellEffect({ profile: ReadiedRayOfFrostSpellProfile })
    } else if (profile == AcidSplashSpellProfile) {
      HeldReadiedSpellEffect({ profile: ReadiedAcidSplashSpellProfile })
    } else if (profile == MageArmorSpellProfile) {
      HeldReadiedSpellEffect({ profile: ReadiedMageArmorSpellProfile })
    } else {
      NoReadiedSpellHeldEffect
    }

  pure def isHeldReadiedSpellEffect(effect: ReadiedSpellHeldEffect): bool =
    match effect {
      | HeldReadiedSpellEffect(_) => true
      | NoReadiedSpellHeldEffect => false
    }

  pure def readiedSpellReleaseForHeldEffect(effect: ReadiedSpellHeldEffect): ReadiedSpellRelease =
    match effect {
      | HeldReadiedSpellEffect(v) =>
        if (v.profile == ReadiedMagicMissileSpellProfile) ReleasedMagicMissileSpell
        else if (v.profile == ReadiedRayOfFrostSpellProfile) ReleasedRayOfFrostSpell
        else if (v.profile == ReadiedAcidSplashSpellProfile) ReleasedAcidSplashSpell
        else ReleasedMageArmorSpell
      | NoReadiedSpellHeldEffect => NoReadiedSpellRelease
    }

  pure def readiedSpellDissipationWindow(window: ReactionWindowState): ReactionWindowState =
    if (reactionWindowIsKind(window, ReadiedSpellReactionWindow)) {
      advanceContinuation(window)
    } else window

  pure def dissipateReadiedSpellIfConcentrationBroken(
    state: ReadiedSpellProcedureState
  ): ReadiedSpellProcedureState =
    if (isHeldReadiedSpellEffect(state.heldEffect)
      and state.reaction.concentration.reactor == NoConcentration) {
      {
        reaction: state.reaction.with(
          "reactionWindow",
          readiedSpellDissipationWindow(state.reaction.reactionWindow)
        ),
        heldEffect: NoReadiedSpellHeldEffect,
      }
    } else state

  pure def holdReadiedSpellResponse(
    spellcasting: SpellcastingProcedureState,
    state: ReadiedSpellProcedureState,
    facts: SpellInvocationFacts,
    triggerSelected: bool,
    canConcentrate: bool
  ): ReadiedSpellHoldResult = {
    val held = asReadiedSpellProfile(facts.profile)
    val resourceFacts = spellInvocationResourceFacts(facts)
    val invocation = resolveSpellInvocationResourceWithActionCost(
      spellcasting,
      resourceFacts,
      StandardActionCost(ReadyAction)
    )
    val admitted = all {
      triggerSelected,
      canConcentrate,
      isHeldReadiedSpellEffect(held),
      invocation.admitted,
    }
    val slotExpended = admitted and invocation.slotExpended
    if (not(admitted)) {
      spellcasting: spellcasting,
      readiedSpell: state,
      held: false,
      slotExpended: false,
    } else {
      spellcasting: invocation.state,
      readiedSpell: {
        reaction: state.reaction.with(
          "reactor",
          state.reaction.reactor.with("turn", invocation.state.turn)
        ).with(
          "concentration",
          startConcentration(state.reaction.concentration, Reactor, canConcentrate)
        ),
        heldEffect: held,
      },
      held: true,
      slotExpended: slotExpended,
    }
  }

  pure def offerReadiedSpellReaction(state: ReadiedSpellProcedureState): ReadiedSpellProcedureState = {
    val current = dissipateReadiedSpellIfConcentrationBroken(state)
    if (isHeldReadiedSpellEffect(current.heldEffect) and current.reaction.concentration.reactor == Concentrating) {
      current.with("reaction", current.reaction.with(
        "reactionWindow",
        offerReactionWindow(current.reaction.reactionWindow, ReadiedSpellReactionWindow)
      ))
    } else current
  }

  pure def releaseReadiedSpellReaction(state: ReadiedSpellProcedureState): ReadiedSpellReleaseResult = {
    val current = dissipateReadiedSpellIfConcentrationBroken(state)
    val canRelease = all {
      isHeldReadiedSpellEffect(current.heldEffect),
      current.reaction.concentration.reactor == Concentrating,
      reactionWindowIsKind(current.reaction.reactionWindow, ReadiedSpellReactionWindow),
    }
    val choice = resolveReactionChoice(
      current.reaction.reactor.turn,
      current.reaction.reactionWindow,
      TakeReadiedSpellReaction
    )
    if (not(canRelease) or choice.reactionWindow == current.reaction.reactionWindow) {
      readiedSpell: current,
      released: NoReadiedSpellRelease,
    }
    else {
      readiedSpell: {
        reaction: {
          interruptedActor: current.reaction.interruptedActor,
          reactor: current.reaction.reactor.with("turn", choice.turn),
          reactionWindow: choice.reactionWindow,
          concentration: endConcentration(current.reaction.concentration, Reactor),
        },
        heldEffect: NoReadiedSpellHeldEffect,
      },
      released: readiedSpellReleaseForHeldEffect(current.heldEffect),
    }
  }

}
