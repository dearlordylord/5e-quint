// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.passive-damage-resistance

module damageComponentAdjustments {
  import hitPointDamage.* from "./hit-point-damage"

  type RuleDamageType =
    | AcidDamage
    | BludgeoningDamage
    | ColdDamage
    | FireDamage
    | ForceDamage
    | LightningDamage
    | NecroticDamage
    | PiercingDamage
    | PoisonDamage
    | PsychicDamage
    | RadiantDamage
    | SlashingDamage
    | ThunderDamage

  type DamageByType = RuleDamageType -> int

  type DamageAdjustmentFacts = {
    immunities: Set[RuleDamageType],
    resistances: Set[RuleDamageType],
    vulnerabilities: Set[RuleDamageType],
  }

  type DamagePair = {
    firstType: RuleDamageType,
    firstAmount: int,
    secondType: RuleDamageType,
    secondAmount: int,
  }

  pure def emptyDamageByType: DamageByType = Map(
    AcidDamage -> 0,
    BludgeoningDamage -> 0,
    ColdDamage -> 0,
    FireDamage -> 0,
    ForceDamage -> 0,
    LightningDamage -> 0,
    NecroticDamage -> 0,
    PiercingDamage -> 0,
    PoisonDamage -> 0,
    PsychicDamage -> 0,
    RadiantDamage -> 0,
    SlashingDamage -> 0,
    ThunderDamage -> 0
  )

  pure def noDamageAdjustmentFacts: DamageAdjustmentFacts = {
    immunities: Set(),
    resistances: Set(),
    vulnerabilities: Set(),
  }

  pure def legalDamageByType(amounts: DamageByType): bool = all {
    damageAmountForType(amounts, AcidDamage) >= 0,
    damageAmountForType(amounts, BludgeoningDamage) >= 0,
    damageAmountForType(amounts, ColdDamage) >= 0,
    damageAmountForType(amounts, FireDamage) >= 0,
    damageAmountForType(amounts, ForceDamage) >= 0,
    damageAmountForType(amounts, LightningDamage) >= 0,
    damageAmountForType(amounts, NecroticDamage) >= 0,
    damageAmountForType(amounts, PiercingDamage) >= 0,
    damageAmountForType(amounts, PoisonDamage) >= 0,
    damageAmountForType(amounts, PsychicDamage) >= 0,
    damageAmountForType(amounts, RadiantDamage) >= 0,
    damageAmountForType(amounts, SlashingDamage) >= 0,
    damageAmountForType(amounts, ThunderDamage) >= 0,
  }

  pure def damageAmountForType(amounts: DamageByType, damageType: RuleDamageType): int =
    amounts.get(damageType)

  pure def addDamageAmountForType(
    amounts: DamageByType,
    damageType: RuleDamageType,
    rawAmount: int
  ): DamageByType =
    match damageType {
      | AcidDamage => amounts.set(AcidDamage, damageAmountForType(amounts, AcidDamage) + nonnegative(rawAmount))
      | BludgeoningDamage => amounts.set(BludgeoningDamage, damageAmountForType(amounts, BludgeoningDamage) + nonnegative(rawAmount))
      | ColdDamage => amounts.set(ColdDamage, damageAmountForType(amounts, ColdDamage) + nonnegative(rawAmount))
      | FireDamage => amounts.set(FireDamage, damageAmountForType(amounts, FireDamage) + nonnegative(rawAmount))
      | ForceDamage => amounts.set(ForceDamage, damageAmountForType(amounts, ForceDamage) + nonnegative(rawAmount))
      | LightningDamage => amounts.set(LightningDamage, damageAmountForType(amounts, LightningDamage) + nonnegative(rawAmount))
      | NecroticDamage => amounts.set(NecroticDamage, damageAmountForType(amounts, NecroticDamage) + nonnegative(rawAmount))
      | PiercingDamage => amounts.set(PiercingDamage, damageAmountForType(amounts, PiercingDamage) + nonnegative(rawAmount))
      | PoisonDamage => amounts.set(PoisonDamage, damageAmountForType(amounts, PoisonDamage) + nonnegative(rawAmount))
      | PsychicDamage => amounts.set(PsychicDamage, damageAmountForType(amounts, PsychicDamage) + nonnegative(rawAmount))
      | RadiantDamage => amounts.set(RadiantDamage, damageAmountForType(amounts, RadiantDamage) + nonnegative(rawAmount))
      | SlashingDamage => amounts.set(SlashingDamage, damageAmountForType(amounts, SlashingDamage) + nonnegative(rawAmount))
      | ThunderDamage => amounts.set(ThunderDamage, damageAmountForType(amounts, ThunderDamage) + nonnegative(rawAmount))
    }

  pure def aggregateDamagePair(pair: DamagePair): DamageByType =
    addDamageAmountForType(
      addDamageAmountForType(emptyDamageByType, pair.firstType, pair.firstAmount),
      pair.secondType,
      pair.secondAmount
    )

  pure def adjustedDamageRollAmount(baseAmount: int, modifier: int): int =
    nonnegative(baseAmount + modifier)

  pure def damageTypeIsImmune(
    facts: DamageAdjustmentFacts,
    damageType: RuleDamageType
  ): bool =
    facts.immunities.contains(damageType)

  pure def damageTypeIsResistant(
    facts: DamageAdjustmentFacts,
    damageType: RuleDamageType
  ): bool =
    facts.resistances.contains(damageType)

  pure def damageTypeIsVulnerable(
    facts: DamageAdjustmentFacts,
    damageType: RuleDamageType
  ): bool =
    facts.vulnerabilities.contains(damageType)

  pure def adjustedDamageAmountForType(
    amounts: DamageByType,
    facts: DamageAdjustmentFacts,
    damageType: RuleDamageType
  ): int =
    match damageType {
      | AcidDamage => damageAmountAfterTargetAdjustments(damageAmountForType(amounts, AcidDamage), AcidDamage, facts)
      | BludgeoningDamage => damageAmountAfterTargetAdjustments(damageAmountForType(amounts, BludgeoningDamage), BludgeoningDamage, facts)
      | ColdDamage => damageAmountAfterTargetAdjustments(damageAmountForType(amounts, ColdDamage), ColdDamage, facts)
      | FireDamage => damageAmountAfterTargetAdjustments(damageAmountForType(amounts, FireDamage), FireDamage, facts)
      | ForceDamage => damageAmountAfterTargetAdjustments(damageAmountForType(amounts, ForceDamage), ForceDamage, facts)
      | LightningDamage => damageAmountAfterTargetAdjustments(damageAmountForType(amounts, LightningDamage), LightningDamage, facts)
      | NecroticDamage => damageAmountAfterTargetAdjustments(damageAmountForType(amounts, NecroticDamage), NecroticDamage, facts)
      | PiercingDamage => damageAmountAfterTargetAdjustments(damageAmountForType(amounts, PiercingDamage), PiercingDamage, facts)
      | PoisonDamage => damageAmountAfterTargetAdjustments(damageAmountForType(amounts, PoisonDamage), PoisonDamage, facts)
      | PsychicDamage => damageAmountAfterTargetAdjustments(damageAmountForType(amounts, PsychicDamage), PsychicDamage, facts)
      | RadiantDamage => damageAmountAfterTargetAdjustments(damageAmountForType(amounts, RadiantDamage), RadiantDamage, facts)
      | SlashingDamage => damageAmountAfterTargetAdjustments(damageAmountForType(amounts, SlashingDamage), SlashingDamage, facts)
      | ThunderDamage => damageAmountAfterTargetAdjustments(damageAmountForType(amounts, ThunderDamage), ThunderDamage, facts)
    }

  pure def totalDamageContribution(
    amounts: DamageByType,
    damageType: RuleDamageType
  ): int =
    match damageType {
      | AcidDamage => damageAmountForType(amounts, AcidDamage)
      | BludgeoningDamage => damageAmountForType(amounts, BludgeoningDamage)
      | ColdDamage => damageAmountForType(amounts, ColdDamage)
      | FireDamage => damageAmountForType(amounts, FireDamage)
      | ForceDamage => damageAmountForType(amounts, ForceDamage)
      | LightningDamage => damageAmountForType(amounts, LightningDamage)
      | NecroticDamage => damageAmountForType(amounts, NecroticDamage)
      | PiercingDamage => damageAmountForType(amounts, PiercingDamage)
      | PoisonDamage => damageAmountForType(amounts, PoisonDamage)
      | PsychicDamage => damageAmountForType(amounts, PsychicDamage)
      | RadiantDamage => damageAmountForType(amounts, RadiantDamage)
      | SlashingDamage => damageAmountForType(amounts, SlashingDamage)
      | ThunderDamage => damageAmountForType(amounts, ThunderDamage)
    }

  pure def damageAmountAfterTargetAdjustments(
    amount: int,
    damageType: RuleDamageType,
    facts: DamageAdjustmentFacts
  ): int =
    if (damageTypeIsImmune(facts, damageType)) 0
    else {
      val nonnegativeAmount = nonnegative(amount)
      val afterResistance =
        if (damageTypeIsResistant(facts, damageType)) nonnegativeAmount / 2
        else nonnegativeAmount
      if (damageTypeIsVulnerable(facts, damageType)) afterResistance * 2
      else afterResistance
    }

  pure def damageByTypeAfterTargetAdjustments(
    amounts: DamageByType,
    facts: DamageAdjustmentFacts
  ): DamageByType = Map(
    AcidDamage -> adjustedDamageAmountForType(amounts, facts, AcidDamage),
    BludgeoningDamage -> adjustedDamageAmountForType(amounts, facts, BludgeoningDamage),
    ColdDamage -> adjustedDamageAmountForType(amounts, facts, ColdDamage),
    FireDamage -> adjustedDamageAmountForType(amounts, facts, FireDamage),
    ForceDamage -> adjustedDamageAmountForType(amounts, facts, ForceDamage),
    LightningDamage -> adjustedDamageAmountForType(amounts, facts, LightningDamage),
    NecroticDamage -> adjustedDamageAmountForType(amounts, facts, NecroticDamage),
    PiercingDamage -> adjustedDamageAmountForType(amounts, facts, PiercingDamage),
    PoisonDamage -> adjustedDamageAmountForType(amounts, facts, PoisonDamage),
    PsychicDamage -> adjustedDamageAmountForType(amounts, facts, PsychicDamage),
    RadiantDamage -> adjustedDamageAmountForType(amounts, facts, RadiantDamage),
    SlashingDamage -> adjustedDamageAmountForType(amounts, facts, SlashingDamage),
    ThunderDamage -> adjustedDamageAmountForType(amounts, facts, ThunderDamage)
  )

  pure def totalDamageByType(amounts: DamageByType): int =
    totalDamageContribution(amounts, AcidDamage)
      + totalDamageContribution(amounts, BludgeoningDamage)
      + totalDamageContribution(amounts, ColdDamage)
      + totalDamageContribution(amounts, FireDamage)
      + totalDamageContribution(amounts, ForceDamage)
      + totalDamageContribution(amounts, LightningDamage)
      + totalDamageContribution(amounts, NecroticDamage)
      + totalDamageContribution(amounts, PiercingDamage)
      + totalDamageContribution(amounts, PoisonDamage)
      + totalDamageContribution(amounts, PsychicDamage)
      + totalDamageContribution(amounts, RadiantDamage)
      + totalDamageContribution(amounts, SlashingDamage)
      + totalDamageContribution(amounts, ThunderDamage)

  pure def totalDamageAfterTargetAdjustments(
    amounts: DamageByType,
    facts: DamageAdjustmentFacts
  ): int =
    totalDamageByType(damageByTypeAfterTargetAdjustments(amounts, facts))

  pure def pairTotal(pair: DamagePair): int =
    nonnegative(pair.firstAmount) + nonnegative(pair.secondAmount)

  pure def cappedReduction(total: int, reduction: int): int =
    if (reduction < 0) 0
    else if (reduction > total) total
    else reduction

  pure def largestRemainderBonusGoesToFirst(
    firstAmount: int,
    secondAmount: int,
    reduction: int
  ): bool = {
    val total = firstAmount + secondAmount
    val firstProduct = firstAmount * reduction
    val secondProduct = secondAmount * reduction
    val firstBase = firstProduct / total
    val secondBase = secondProduct / total
    val firstRemainder = firstProduct - (firstBase * total)
    val secondRemainder = secondProduct - (secondBase * total)
    firstRemainder >= secondRemainder
  }

  pure def damagePairAfterScalarReduction(pair: DamagePair, rawReduction: int): DamagePair = {
    val first = nonnegative(pair.firstAmount)
    val second = nonnegative(pair.secondAmount)
    val total = first + second
    if (total == 0) {
      firstType: pair.firstType,
      firstAmount: 0,
      secondType: pair.secondType,
      secondAmount: 0,
    } else {
      val reduction = cappedReduction(total, rawReduction)
      val firstBase = (first * reduction) / total
      val secondBase = (second * reduction) / total
      val baseReduction = firstBase + secondBase
      val extraReduction = reduction - baseReduction
      val firstGetsExtra =
        extraReduction > 0 and largestRemainderBonusGoesToFirst(first, second, reduction)
      val secondGetsExtra = extraReduction > 0 and not(firstGetsExtra)
      {
        firstType: pair.firstType,
        firstAmount: first - firstBase - (if (firstGetsExtra) 1 else 0),
        secondType: pair.secondType,
        secondAmount: second - secondBase - (if (secondGetsExtra) 1 else 0),
      }
    }
  }

}
