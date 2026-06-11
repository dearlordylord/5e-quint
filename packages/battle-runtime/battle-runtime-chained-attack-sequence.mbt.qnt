// -*- mode: Bluespec; -*-

module battleRuntimeChainedAttackSequenceMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole =
    | DamageTypeChoice
    | TargetChoice0
    | AttackRoll0
    | DamageRoll0
    | TargetChoice1
    | AttackRoll1
    | DamageRoll1
    | TargetChoice2
  type ChainedAttackSequenceScenarioOutcome = | Init | AwaitingDamageType | AwaitingInitialTarget | AwaitingStep0Attack | AwaitingStep0Damage | Step0NoLeapComplete | AwaitingFirstLeapTarget | AwaitingStep1Attack | AwaitingStep1Damage | Slot1LeapLimitComplete | AwaitingSecondLeapTarget



  // RAW trace:
  // - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Chromatic Orb:
  //   choose Acid, Cold, Fire, Lightning, Poison, or Thunder; make a ranged
  //   Spell Attack; on a hit roll 3d8 damage of the chosen type; duplicate d8
  //   faces allow a leap to a different target within 30 feet; higher-level
  //   slots increase damage dice and cap leap count at the slot level.
  // - .references/srd-5.2.1/Rules-Glossary.md#Spell Attack.
  // - UBIQUITOUS_LANGUAGE.md: Spell Attack, Damage Roll, Damage Type, Spell
  //   Slot, and Cast Level.
  type WitnessState = {
    qDamageType: str,
    qSlotLevel: int,
    qTargeted: Set[str],
    qPreviousTarget: str,
    qLeapsUsed: int,
    qStepIndex: int,
    qFirstTargetHp: int,
    qSecondTargetHp: int,
    qThirdTargetHp: int,
    qStep0AttackTotal: int,
    qStep0NaturalD20: int,
    qStep0DamageTotal: int,
    qStep0DamageHasDuplicate: bool,
    qStep1AttackTotal: int,
    qStep1NaturalD20: int,
    qStep1DamageTotal: int,
    qStep1DamageHasDuplicate: bool,
    qScenarioOutcome: ChainedAttackSequenceScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: WitnessState

  pure def qDamageType: str = qState.qDamageType
  pure def qSlotLevel: int = qState.qSlotLevel
  pure def qTargeted: Set[str] = qState.qTargeted
  pure def qPreviousTarget: str = qState.qPreviousTarget
  pure def qLeapsUsed: int = qState.qLeapsUsed
  pure def qStepIndex: int = qState.qStepIndex
  pure def qFirstTargetHp: int = qState.qFirstTargetHp
  pure def qSecondTargetHp: int = qState.qSecondTargetHp
  pure def qThirdTargetHp: int = qState.qThirdTargetHp
  pure def qStep0AttackTotal: int = qState.qStep0AttackTotal
  pure def qStep0NaturalD20: int = qState.qStep0NaturalD20
  pure def qStep0DamageTotal: int = qState.qStep0DamageTotal
  pure def qStep0DamageHasDuplicate: bool = qState.qStep0DamageHasDuplicate
  pure def qStep1AttackTotal: int = qState.qStep1AttackTotal
  pure def qStep1NaturalD20: int = qState.qStep1NaturalD20
  pure def qStep1DamageTotal: int = qState.qStep1DamageTotal
  pure def qStep1DamageHasDuplicate: bool = qState.qStep1DamageHasDuplicate
  pure def protocolHoles: Set[WitnessHole] = qState.protocol.holes
  pure def qScenarioOutcome: ChainedAttackSequenceScenarioOutcome = qState.qScenarioOutcome

  pure val noDamageType: str = "none"
  pure val noTarget: str = "none"
  pure val firstTarget: str = "first"
  pure val secondTarget: str = "second"
  pure val legalDamageTypes: Set[str] = Set("acid", "cold", "fire", "lightning", "poison", "thunder")
  pure val noHoles: Set[WitnessHole] = Set()
  pure val damageTypeChoiceHoles: Set[WitnessHole] = Set(DamageTypeChoice)
  pure val targetChoice0Holes: Set[WitnessHole] = Set(TargetChoice0)
  pure val attackRoll0Holes: Set[WitnessHole] = Set(AttackRoll0)
  pure val damageRoll0Holes: Set[WitnessHole] = Set(DamageRoll0)
  pure val targetChoice1Holes: Set[WitnessHole] = Set(TargetChoice1)
  pure val attackRoll1Holes: Set[WitnessHole] = Set(AttackRoll1)
  pure val damageRoll1Holes: Set[WitnessHole] = Set(DamageRoll1)
  pure val targetChoice2Holes: Set[WitnessHole] = Set(TargetChoice2)
  pure val targetFullHp: int = 12


  action recordChainedAttackState(
    damageType: str,
    slotLevel: int,
    targeted: Set[str],
    previousTarget: str,
    leapsUsed: int,
    stepIndex: int,
    firstTargetHp: int,
    secondTargetHp: int,
    thirdTargetHp: int,
    step0AttackTotal: int,
    step0NaturalD20: int,
    step0DamageTotal: int,
    step0DamageHasDuplicate: bool,
    step1AttackTotal: int,
    step1NaturalD20: int,
    step1DamageTotal: int,
    step1DamageHasDuplicate: bool,
    scenarioOutcome: ChainedAttackSequenceScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  ): bool = all {
    qState' = {
      qDamageType: damageType,
      qSlotLevel: slotLevel,
      qTargeted: targeted,
      qPreviousTarget: previousTarget,
      qLeapsUsed: leapsUsed,
      qStepIndex: stepIndex,
      qFirstTargetHp: firstTargetHp,
      qSecondTargetHp: secondTargetHp,
      qThirdTargetHp: thirdTargetHp,
      qStep0AttackTotal: step0AttackTotal,
      qStep0NaturalD20: step0NaturalD20,
      qStep0DamageTotal: step0DamageTotal,
      qStep0DamageHasDuplicate: step0DamageHasDuplicate,
      qStep1AttackTotal: step1AttackTotal,
      qStep1NaturalD20: step1NaturalD20,
      qStep1DamageTotal: step1DamageTotal,
      qStep1DamageHasDuplicate: step1DamageHasDuplicate,
      qScenarioOutcome: scenarioOutcome,
      protocol: protocol,
    },
  }

  action init = recordChainedAttackState(
    noDamageType,
    0,
    Set(),
    noTarget,
    0,
    0,
    targetFullHp,
    targetFullHp,
    targetFullHp,
    0,
    0,
    0,
    false,
    0,
    0,
    0,
    false,
    Init,
    witnessInit(DamageTypeChoice),
  )

  action doStartCast = {
    nondet slotLevel = 1.to(2).oneOf()
    all {
      qScenarioOutcome == Init,
      recordChainedAttackState(
        noDamageType,
        slotLevel,
        Set(),
        noTarget,
        0,
        0,
        targetFullHp,
        targetFullHp,
        targetFullHp,
        0,
        0,
        0,
        false,
        0,
        0,
        0,
        false,
        AwaitingDamageType,
    witnessNeedsHoles(damageTypeChoiceHoles),
  ),
    }
  }

  action doChooseDamageType = {
    nondet damageType = legalDamageTypes.oneOf()
    all {
      protocolHoles == damageTypeChoiceHoles,
      recordChainedAttackState(
        damageType,
        qSlotLevel,
        Set(),
        noTarget,
        0,
        0,
        targetFullHp,
        targetFullHp,
        targetFullHp,
        0,
        0,
        0,
        false,
        0,
        0,
        0,
        false,
        AwaitingInitialTarget,
    witnessNeedsHoles(targetChoice0Holes),
  ),
    }
  }

  action doChooseInitialTarget = all {
    protocolHoles == targetChoice0Holes,
    recordChainedAttackState(
      qDamageType,
      qSlotLevel,
      Set(firstTarget),
      firstTarget,
      0,
      0,
      targetFullHp,
      targetFullHp,
      targetFullHp,
      0,
      0,
      0,
      false,
      0,
      0,
      0,
      false,
      AwaitingStep0Attack,
    witnessNeedsHoles(attackRoll0Holes),
  ),
  }

  action doResolveStep0AttackHit = all {
    protocolHoles == attackRoll0Holes,
    recordChainedAttackState(
      qDamageType,
      qSlotLevel,
      qTargeted,
      qPreviousTarget,
      qLeapsUsed,
      0,
      targetFullHp,
      targetFullHp,
      targetFullHp,
      18,
      12,
      0,
      false,
      0,
      0,
      0,
      false,
      AwaitingStep0Damage,
    witnessNeedsHoles(damageRoll0Holes),
  ),
  }

  action doResolveStep0DamageNoDuplicate = {
    val damageTotal = if (qSlotLevel == 1) 6 else 10
    all {
      protocolHoles == damageRoll0Holes,
      recordChainedAttackState(
        qDamageType,
        qSlotLevel,
        qTargeted,
        qPreviousTarget,
        0,
        0,
        targetFullHp - damageTotal,
        targetFullHp,
        targetFullHp,
        qStep0AttackTotal,
        qStep0NaturalD20,
        damageTotal,
        false,
        0,
        0,
        0,
        false,
        Step0NoLeapComplete,
    witnessResolved(DamageTypeChoice),
  ),
    }
  }

  action doResolveStep0DamageDuplicate = {
    val damageTotal = if (qSlotLevel == 1) 9 else 10
    all {
      protocolHoles == damageRoll0Holes,
      recordChainedAttackState(
        qDamageType,
        qSlotLevel,
        qTargeted,
        firstTarget,
        0,
        0,
        targetFullHp - damageTotal,
        targetFullHp,
        targetFullHp,
        qStep0AttackTotal,
        qStep0NaturalD20,
        damageTotal,
        true,
        0,
        0,
        0,
        false,
        AwaitingFirstLeapTarget,
    witnessNeedsHoles(targetChoice1Holes),
  ),
    }
  }

  action doChooseFirstLeapTarget = all {
    protocolHoles == targetChoice1Holes,
    qTargeted == Set(firstTarget),
    qLeapsUsed < qSlotLevel,
    recordChainedAttackState(
      qDamageType,
      qSlotLevel,
      Set(firstTarget, secondTarget),
      secondTarget,
      1,
      1,
      qFirstTargetHp,
      targetFullHp,
      targetFullHp,
      qStep0AttackTotal,
      qStep0NaturalD20,
      qStep0DamageTotal,
      qStep0DamageHasDuplicate,
      0,
      0,
      0,
      false,
      AwaitingStep1Attack,
    witnessNeedsHoles(attackRoll1Holes),
  ),
  }

  action doResolveStep1AttackHit = all {
    protocolHoles == attackRoll1Holes,
    recordChainedAttackState(
      qDamageType,
      qSlotLevel,
      qTargeted,
      qPreviousTarget,
      qLeapsUsed,
      1,
      qFirstTargetHp,
      targetFullHp,
      targetFullHp,
      qStep0AttackTotal,
      qStep0NaturalD20,
      qStep0DamageTotal,
      qStep0DamageHasDuplicate,
      18,
      12,
      0,
      false,
      AwaitingStep1Damage,
    witnessNeedsHoles(damageRoll1Holes),
  ),
  }

  action doResolveStep1DuplicateDamageSlot1Limit = all {
    qSlotLevel == 1,
    protocolHoles == damageRoll1Holes,
    recordChainedAttackState(
      qDamageType,
      qSlotLevel,
      qTargeted,
      qPreviousTarget,
      1,
      1,
      qFirstTargetHp,
      9,
      targetFullHp,
      qStep0AttackTotal,
      qStep0NaturalD20,
      qStep0DamageTotal,
      qStep0DamageHasDuplicate,
      qStep1AttackTotal,
      qStep1NaturalD20,
      3,
      true,
      Slot1LeapLimitComplete,
    witnessResolved(DamageTypeChoice),
  ),
  }

  action doResolveStep1DuplicateDamageSlot2AllowsLeap = all {
    qSlotLevel == 2,
    protocolHoles == damageRoll1Holes,
    recordChainedAttackState(
      qDamageType,
      qSlotLevel,
      qTargeted,
      qPreviousTarget,
      1,
      1,
      qFirstTargetHp,
      8,
      targetFullHp,
      qStep0AttackTotal,
      qStep0NaturalD20,
      qStep0DamageTotal,
      qStep0DamageHasDuplicate,
      qStep1AttackTotal,
      qStep1NaturalD20,
      4,
      true,
      AwaitingSecondLeapTarget,
    witnessNeedsHoles(targetChoice2Holes),
  ),
  }

  action step = any {
    doStartCast,
    doChooseDamageType,
    doChooseInitialTarget,
    doResolveStep0AttackHit,
    doResolveStep0DamageNoDuplicate,
    doResolveStep0DamageDuplicate,
    doChooseFirstLeapTarget,
    doResolveStep1AttackHit,
    doResolveStep1DuplicateDamageSlot1Limit,
    doResolveStep1DuplicateDamageSlot2AllowsLeap,
  }
}
