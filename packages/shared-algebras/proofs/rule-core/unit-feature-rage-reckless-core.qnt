// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.attack-damage-rider unit-feature.bonus-action-ongoing-rage unit-feature.first-attack-roll-reckless-advantage
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS BATTLE.DAMAGE.ATTACK_BRANCHES

module unitFeatureRageRecklessCore {
  import actionTurnProcedures.* from "./action-turn-procedures"
  import damageComponentAdjustments.* from "./damage-component-adjustments"
  import reactionsContinuationsConcentration.* from "./reactions-continuations-concentration"
  import unitFeaturePoolCostCore.* from "./unit-feature-pool-cost-core"

  // RAW anchors:
  // - Classes/Barbarian.md: Rage, Reckless Attack, and Path of the Berserker
  //   Frenzy.
  // - Playing-the-Game.md: Bonus Actions, Attack Rolls, Damage Rolls, and
  //   Resistance and Vulnerability.
  // - Rules-Glossary.md: Concentration.
  // - UBIQUITOUS_LANGUAGE.md: Active Ongoing Feature Occurrences.

  type RageResistanceDamageType =
    | RageBludgeoningDamage
    | RagePiercingDamage
    | RageSlashingDamage
    | RageOtherDamage

  type RageOccurrence =
    | NoRageOccurrence
    | RageUntilEndOfNextTurn
    | PersistentRageTenMinuteDuration

  type RageState = {
    turn: TurnProcedureState,
    pool: FeatureUsePool,
    occurrence: RageOccurrence,
    concentration: ActorConcentrationState,
  }

  type RageActivationFacts = {
    wearingHeavyArmor: bool,
    incapacitated: bool,
    persistentRage: bool,
  }

  type RageExtensionFacts = {
    madeAttackRollAgainstEnemy: bool,
    forcedEnemySavingThrow: bool,
    spendsBonusAction: bool,
    incapacitated: bool,
    unconscious: bool,
    wearingHeavyArmor: bool,
  }

  type RageAttackForm =
    | RageWeaponAttack
    | RageUnarmedStrikeAttack
    | RageSpellAttack

  type RageAttackFacts = {
    usesStrength: bool,
    dealsDamage: bool,
    attackForm: RageAttackForm,
  }

  type RecklessAttackOccurrence =
    | NoRecklessAttackOccurrence
    | RecklessAttackUntilStartOfTurn

  type RecklessAttackState = {
    occurrence: RecklessAttackOccurrence,
    attackRollMadeThisTurn: bool,
  }

  type RecklessAttackFacts = {
    choosesRecklessAttack: bool,
    strengthAttackRoll: bool,
  }

  type RecklessAttackAdvantageFacts = {
    strengthAttackRoll: bool,
  }

  type FrenzyState = {
    rage: RageState,
    recklessAttack: RecklessAttackState,
    recklessAttackUsedWhileRagingThisTurn: bool,
    firstEligibleHitResolvedThisTurn: bool,
  }

  type FrenzyAttackFacts = {
    hitWithAttackRoll: bool,
    strengthBasedAttack: bool,
    attackForm: RageAttackForm,
    barbarianLevel: int,
    attackDamageType: RuleDamageType,
  }

  type FrenzyResult = {
    state: FrenzyState,
    admitted: bool,
    damageDice: int,
    damageType: RuleDamageType,
  }

  pure def legalRageActivationFacts(facts: RageActivationFacts): bool = all {
    facts.wearingHeavyArmor.in(Set(true, false)),
    facts.incapacitated.in(Set(true, false)),
    facts.persistentRage.in(Set(true, false)),
  }

  pure def legalRageState(state: RageState): bool = all {
    legalTurnProcedureState(state.turn),
    legalFeatureUsePool(state.pool),
    state.occurrence.in(Set(
      NoRageOccurrence,
      RageUntilEndOfNextTurn,
      PersistentRageTenMinuteDuration
    )),
    state.concentration.interruptedActor.in(Set(NoConcentration, Concentrating)),
    state.concentration.reactor.in(Set(NoConcentration, Concentrating)),
  }

  pure def startRage(state: RageState, facts: RageActivationFacts): RageState = {
    val admitted = all {
      legalRageActivationFacts(facts),
      canSpendBonusAction(state.turn),
      state.pool.usesRemaining > 0,
      state.occurrence == NoRageOccurrence,
      not(facts.wearingHeavyArmor),
      not(facts.incapacitated),
    }
    if (not(admitted)) state
    else {
      turn: spendActionCost(state.turn, BonusActionCost),
      pool: spendFeatureUsePool(state.pool),
      occurrence:
        if (facts.persistentRage) PersistentRageTenMinuteDuration
        else RageUntilEndOfNextTurn,
      concentration: endConcentration(state.concentration, InterruptedActor),
    }
  }

  pure def ragePreventsConcentrationOrSpellcasting(state: RageState): bool =
    state.occurrence != NoRageOccurrence

  pure def rageGrantsResistance(damageType: RageResistanceDamageType): bool =
    damageType == RageBludgeoningDamage
      or damageType == RagePiercingDamage
      or damageType == RageSlashingDamage

  pure def rageDamageBonus(barbarianLevel: int): int =
    if (barbarianLevel >= 16) 4
    else if (barbarianLevel >= 9) 3
    else 2

  pure def rageDamageAdmitted(state: RageState, facts: RageAttackFacts): bool = all {
    state.occurrence != NoRageOccurrence,
    facts.usesStrength,
    facts.dealsDamage,
    facts.attackForm == RageWeaponAttack or facts.attackForm == RageUnarmedStrikeAttack,
  }

  pure def applyRageDamageBonus(
    state: RageState,
    facts: RageAttackFacts,
    barbarianLevel: int,
    damageRoll: int
  ): int =
    if (rageDamageAdmitted(state, facts)) damageRoll + rageDamageBonus(barbarianLevel)
    else damageRoll

  pure def endRageIfBlocked(state: RageState, facts: RageExtensionFacts): RageState =
    if (state.occurrence == NoRageOccurrence) state
    else if (facts.wearingHeavyArmor) state.with("occurrence", NoRageOccurrence)
    else if (state.occurrence == PersistentRageTenMinuteDuration and facts.unconscious) {
      state.with("occurrence", NoRageOccurrence)
    } else if (state.occurrence == RageUntilEndOfNextTurn and facts.incapacitated) {
      state.with("occurrence", NoRageOccurrence)
    } else state

  pure def extendRage(state: RageState, facts: RageExtensionFacts): RageState = {
    val unblocked = endRageIfBlocked(state, facts)
    val extensionTrigger = facts.madeAttackRollAgainstEnemy
      or facts.forcedEnemySavingThrow
      or facts.spendsBonusAction
    val canPayBonusExtension =
      not(facts.spendsBonusAction) or canSpendBonusAction(unblocked.turn)
    if (unblocked.occurrence != RageUntilEndOfNextTurn or not(extensionTrigger) or not(canPayBonusExtension)) {
      unblocked
    } else {
      turn:
        if (facts.spendsBonusAction) spendActionCost(unblocked.turn, BonusActionCost)
        else unblocked.turn,
      pool: unblocked.pool,
      occurrence: RageUntilEndOfNextTurn,
      concentration: unblocked.concentration,
    }
  }

  pure def activateRecklessAttackOnFirstAttackRoll(
    state: RecklessAttackState,
    facts: RecklessAttackFacts
  ): RecklessAttackState =
    if (state.attackRollMadeThisTurn) state
    else {
      occurrence:
        if (facts.choosesRecklessAttack and facts.strengthAttackRoll)
        RecklessAttackUntilStartOfTurn
        else state.occurrence,
      attackRollMadeThisTurn: true,
    }

  pure def startTurnRecklessAttack(state: RecklessAttackState): RecklessAttackState = {
    occurrence: NoRecklessAttackOccurrence,
    attackRollMadeThisTurn: false,
  }

  pure def recklessAttackGrantsAdvantage(
    state: RecklessAttackState,
    facts: RecklessAttackAdvantageFacts
  ): bool = all {
    state.occurrence == RecklessAttackUntilStartOfTurn,
    facts.strengthAttackRoll,
  }

  pure def recklessAttackGrantsIncomingAttackAdvantage(state: RecklessAttackState): bool =
    state.occurrence == RecklessAttackUntilStartOfTurn

  pure def legalFrenzyState(state: FrenzyState): bool = all {
    legalRageState(state.rage),
    state.recklessAttack.occurrence.in(Set(
      NoRecklessAttackOccurrence,
      RecklessAttackUntilStartOfTurn
    )),
    state.recklessAttack.attackRollMadeThisTurn.in(Set(true, false)),
    state.recklessAttackUsedWhileRagingThisTurn.in(Set(true, false)),
    state.firstEligibleHitResolvedThisTurn.in(Set(true, false)),
    not(state.recklessAttackUsedWhileRagingThisTurn)
      or state.firstEligibleHitResolvedThisTurn
      or state.recklessAttack.occurrence == RecklessAttackUntilStartOfTurn,
    not(state.firstEligibleHitResolvedThisTurn)
      or state.recklessAttackUsedWhileRagingThisTurn,
  }

  pure def initialFrenzyState(
    rage: RageState,
    recklessAttack: RecklessAttackState,
    recklessAttackUsedWhileRagingThisTurn: bool
  ): FrenzyState = {
    rage: rage,
    recklessAttack: recklessAttack,
    recklessAttackUsedWhileRagingThisTurn: recklessAttackUsedWhileRagingThisTurn,
    firstEligibleHitResolvedThisTurn: false,
  }

  pure def frenzyAttackFormEligible(form: RageAttackForm): bool =
    form == RageWeaponAttack or form == RageUnarmedStrikeAttack

  pure def resolveFrenzy(state: FrenzyState, facts: FrenzyAttackFacts): FrenzyResult = {
    val dice = rageDamageBonus(facts.barbarianLevel)
    val admitted = all {
      legalFrenzyState(state),
      state.rage.occurrence != NoRageOccurrence,
      state.recklessAttack.occurrence == RecklessAttackUntilStartOfTurn,
      state.recklessAttackUsedWhileRagingThisTurn,
      facts.hitWithAttackRoll,
      facts.strengthBasedAttack,
      frenzyAttackFormEligible(facts.attackForm),
      not(state.firstEligibleHitResolvedThisTurn),
      dice > 0,
    }
    {
      state:
        if (admitted) state.with("firstEligibleHitResolvedThisTurn", true)
        else state,
      admitted: admitted,
      damageDice: if (admitted) dice else 0,
      damageType: facts.attackDamageType,
    }
  }
}
