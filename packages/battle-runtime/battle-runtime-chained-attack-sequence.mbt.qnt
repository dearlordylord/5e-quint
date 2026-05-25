// -*- mode: Bluespec; -*-

module battleRuntimeChainedAttackSequenceMbt {
  // RAW trace:
  // - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Chromatic Orb:
  //   choose Acid, Cold, Fire, Lightning, Poison, or Thunder; make a ranged
  //   Spell Attack; on a hit roll 3d8 damage of the chosen type; duplicate d8
  //   faces allow a leap to a different target within 30 feet; higher-level
  //   slots increase damage dice and cap leap count at the slot level.
  // - .references/srd-5.2.1/Rules-Glossary.md#Spell Attack.
  // - UBIQUITOUS_LANGUAGE.md: Spell Attack, Damage Roll, Damage Type, Spell
  //   Slot, and Cast Level.
  var qDamageType: str
  var qSlotLevel: int
  var qTargeted: Set[str]
  var qPreviousTarget: str
  var qLeapsUsed: int
  var qStepIndex: int
  var qFirstTargetHp: int
  var qSecondTargetHp: int
  var qThirdTargetHp: int
  var qStep0AttackTotal: int
  var qStep0NaturalD20: int
  var qStep0DamageTotal: int
  var qStep0DamageHasDuplicate: bool
  var qStep1AttackTotal: int
  var qStep1NaturalD20: int
  var qStep1DamageTotal: int
  var qStep1DamageHasDuplicate: bool
  var qHoles: Set[str]
  var qLastResult: str

  pure val noDamageType: str = "none"
  pure val noTarget: str = "none"
  pure val firstTarget: str = "first"
  pure val secondTarget: str = "second"
  pure val legalDamageTypes: Set[str] = Set("acid", "cold", "fire", "lightning", "poison", "thunder")
  pure val noHoles: Set[str] = Set()
  pure val damageTypeChoiceHoles: Set[str] = Set("DamageTypeChoice")
  pure val targetChoice0Holes: Set[str] = Set("TargetChoice0")
  pure val attackRoll0Holes: Set[str] = Set("AttackRoll0")
  pure val damageRoll0Holes: Set[str] = Set("DamageRoll0")
  pure val targetChoice1Holes: Set[str] = Set("TargetChoice1")
  pure val attackRoll1Holes: Set[str] = Set("AttackRoll1")
  pure val damageRoll1Holes: Set[str] = Set("DamageRoll1")
  pure val targetChoice2Holes: Set[str] = Set("TargetChoice2")
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
    holes: Set[str],
    lastResult: str,
  ): bool = all {
    qDamageType' = damageType,
    qSlotLevel' = slotLevel,
    qTargeted' = targeted,
    qPreviousTarget' = previousTarget,
    qLeapsUsed' = leapsUsed,
    qStepIndex' = stepIndex,
    qFirstTargetHp' = firstTargetHp,
    qSecondTargetHp' = secondTargetHp,
    qThirdTargetHp' = thirdTargetHp,
    qStep0AttackTotal' = step0AttackTotal,
    qStep0NaturalD20' = step0NaturalD20,
    qStep0DamageTotal' = step0DamageTotal,
    qStep0DamageHasDuplicate' = step0DamageHasDuplicate,
    qStep1AttackTotal' = step1AttackTotal,
    qStep1NaturalD20' = step1NaturalD20,
    qStep1DamageTotal' = step1DamageTotal,
    qStep1DamageHasDuplicate' = step1DamageHasDuplicate,
    qHoles' = holes,
    qLastResult' = lastResult,
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
    noHoles,
    "init",
  )

  action doStartCast = {
    nondet slotLevel = 1.to(2).oneOf()
    all {
      qLastResult == "init",
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
        damageTypeChoiceHoles,
        "awaitingDamageType",
      ),
    }
  }

  action doChooseDamageType = {
    nondet damageType = legalDamageTypes.oneOf()
    all {
      qHoles == damageTypeChoiceHoles,
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
        targetChoice0Holes,
        "awaitingInitialTarget",
      ),
    }
  }

  action doChooseInitialTarget = all {
    qHoles == targetChoice0Holes,
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
      attackRoll0Holes,
      "awaitingStep0Attack",
    ),
  }

  action doResolveStep0AttackHit = all {
    qHoles == attackRoll0Holes,
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
      damageRoll0Holes,
      "awaitingStep0Damage",
    ),
  }

  action doResolveStep0DamageNoDuplicate = {
    val damageTotal = if (qSlotLevel == 1) 6 else 10
    all {
      qHoles == damageRoll0Holes,
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
        noHoles,
        "step0NoLeapComplete",
      ),
    }
  }

  action doResolveStep0DamageDuplicate = {
    val damageTotal = if (qSlotLevel == 1) 9 else 10
    all {
      qHoles == damageRoll0Holes,
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
        targetChoice1Holes,
        "awaitingFirstLeapTarget",
      ),
    }
  }

  action doChooseFirstLeapTarget = all {
    qHoles == targetChoice1Holes,
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
      attackRoll1Holes,
      "awaitingStep1Attack",
    ),
  }

  action doResolveStep1AttackHit = all {
    qHoles == attackRoll1Holes,
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
      damageRoll1Holes,
      "awaitingStep1Damage",
    ),
  }

  action doResolveStep1DuplicateDamageSlot1Limit = all {
    qSlotLevel == 1,
    qHoles == damageRoll1Holes,
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
      noHoles,
      "slot1LeapLimitComplete",
    ),
  }

  action doResolveStep1DuplicateDamageSlot2AllowsLeap = all {
    qSlotLevel == 2,
    qHoles == damageRoll1Holes,
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
      targetChoice2Holes,
      "awaitingSecondLeapTarget",
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
