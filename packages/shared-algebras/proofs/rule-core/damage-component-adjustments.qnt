// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION

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

  type DamageByType = {
    acid: int,
    bludgeoning: int,
    cold: int,
    fire: int,
    force: int,
    lightning: int,
    necrotic: int,
    piercing: int,
    poison: int,
    psychic: int,
    radiant: int,
    slashing: int,
    thunder: int,
  }

  type DamageAdjustmentFacts = {
    immuneAcid: bool,
    immuneBludgeoning: bool,
    immuneCold: bool,
    immuneFire: bool,
    immuneForce: bool,
    immuneLightning: bool,
    immuneNecrotic: bool,
    immunePiercing: bool,
    immunePoison: bool,
    immunePsychic: bool,
    immuneRadiant: bool,
    immuneSlashing: bool,
    immuneThunder: bool,
    resistantAcid: bool,
    resistantBludgeoning: bool,
    resistantCold: bool,
    resistantFire: bool,
    resistantForce: bool,
    resistantLightning: bool,
    resistantNecrotic: bool,
    resistantPiercing: bool,
    resistantPoison: bool,
    resistantPsychic: bool,
    resistantRadiant: bool,
    resistantSlashing: bool,
    resistantThunder: bool,
    vulnerableAcid: bool,
    vulnerableBludgeoning: bool,
    vulnerableCold: bool,
    vulnerableFire: bool,
    vulnerableForce: bool,
    vulnerableLightning: bool,
    vulnerableNecrotic: bool,
    vulnerablePiercing: bool,
    vulnerablePoison: bool,
    vulnerablePsychic: bool,
    vulnerableRadiant: bool,
    vulnerableSlashing: bool,
    vulnerableThunder: bool,
  }

  type DamagePair = {
    firstType: RuleDamageType,
    firstAmount: int,
    secondType: RuleDamageType,
    secondAmount: int,
  }

  pure def emptyDamageByType: DamageByType = {
    acid: 0,
    bludgeoning: 0,
    cold: 0,
    fire: 0,
    force: 0,
    lightning: 0,
    necrotic: 0,
    piercing: 0,
    poison: 0,
    psychic: 0,
    radiant: 0,
    slashing: 0,
    thunder: 0,
  }

  pure def noDamageAdjustmentFacts: DamageAdjustmentFacts = {
    immuneAcid: false,
    immuneBludgeoning: false,
    immuneCold: false,
    immuneFire: false,
    immuneForce: false,
    immuneLightning: false,
    immuneNecrotic: false,
    immunePiercing: false,
    immunePoison: false,
    immunePsychic: false,
    immuneRadiant: false,
    immuneSlashing: false,
    immuneThunder: false,
    resistantAcid: false,
    resistantBludgeoning: false,
    resistantCold: false,
    resistantFire: false,
    resistantForce: false,
    resistantLightning: false,
    resistantNecrotic: false,
    resistantPiercing: false,
    resistantPoison: false,
    resistantPsychic: false,
    resistantRadiant: false,
    resistantSlashing: false,
    resistantThunder: false,
    vulnerableAcid: false,
    vulnerableBludgeoning: false,
    vulnerableCold: false,
    vulnerableFire: false,
    vulnerableForce: false,
    vulnerableLightning: false,
    vulnerableNecrotic: false,
    vulnerablePiercing: false,
    vulnerablePoison: false,
    vulnerablePsychic: false,
    vulnerableRadiant: false,
    vulnerableSlashing: false,
    vulnerableThunder: false,
  }

  pure def legalDamageByType(amounts: DamageByType): bool = all {
    amounts.acid >= 0,
    amounts.bludgeoning >= 0,
    amounts.cold >= 0,
    amounts.force >= 0,
    amounts.fire >= 0,
    amounts.lightning >= 0,
    amounts.necrotic >= 0,
    amounts.piercing >= 0,
    amounts.poison >= 0,
    amounts.psychic >= 0,
    amounts.radiant >= 0,
    amounts.slashing >= 0,
    amounts.thunder >= 0,
  }

  pure def damageAmountForType(amounts: DamageByType, damageType: RuleDamageType): int =
    if (damageType == AcidDamage) amounts.acid
    else if (damageType == BludgeoningDamage) amounts.bludgeoning
    else if (damageType == ColdDamage) amounts.cold
    else if (damageType == FireDamage) amounts.fire
    else if (damageType == ForceDamage) amounts.force
    else if (damageType == LightningDamage) amounts.lightning
    else if (damageType == NecroticDamage) amounts.necrotic
    else if (damageType == PiercingDamage) amounts.piercing
    else if (damageType == PoisonDamage) amounts.poison
    else if (damageType == PsychicDamage) amounts.psychic
    else if (damageType == RadiantDamage) amounts.radiant
    else if (damageType == SlashingDamage) amounts.slashing
    else amounts.thunder

  pure def addDamageAmountForType(
    amounts: DamageByType,
    damageType: RuleDamageType,
    rawAmount: int
  ): DamageByType =
    if (damageType == AcidDamage) amounts.with("acid", amounts.acid + nonnegative(rawAmount))
    else if (damageType == BludgeoningDamage) amounts.with("bludgeoning", amounts.bludgeoning + nonnegative(rawAmount))
    else if (damageType == ColdDamage) amounts.with("cold", amounts.cold + nonnegative(rawAmount))
    else if (damageType == FireDamage) amounts.with("fire", amounts.fire + nonnegative(rawAmount))
    else if (damageType == ForceDamage) amounts.with("force", amounts.force + nonnegative(rawAmount))
    else if (damageType == LightningDamage) amounts.with("lightning", amounts.lightning + nonnegative(rawAmount))
    else if (damageType == NecroticDamage) amounts.with("necrotic", amounts.necrotic + nonnegative(rawAmount))
    else if (damageType == PiercingDamage) amounts.with("piercing", amounts.piercing + nonnegative(rawAmount))
    else if (damageType == PoisonDamage) amounts.with("poison", amounts.poison + nonnegative(rawAmount))
    else if (damageType == PsychicDamage) amounts.with("psychic", amounts.psychic + nonnegative(rawAmount))
    else if (damageType == RadiantDamage) amounts.with("radiant", amounts.radiant + nonnegative(rawAmount))
    else if (damageType == SlashingDamage) amounts.with("slashing", amounts.slashing + nonnegative(rawAmount))
    else amounts.with("thunder", amounts.thunder + nonnegative(rawAmount))

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
    if (damageType == AcidDamage) facts.immuneAcid
    else if (damageType == BludgeoningDamage) facts.immuneBludgeoning
    else if (damageType == ColdDamage) facts.immuneCold
    else if (damageType == FireDamage) facts.immuneFire
    else if (damageType == ForceDamage) facts.immuneForce
    else if (damageType == LightningDamage) facts.immuneLightning
    else if (damageType == NecroticDamage) facts.immuneNecrotic
    else if (damageType == PiercingDamage) facts.immunePiercing
    else if (damageType == PoisonDamage) facts.immunePoison
    else if (damageType == PsychicDamage) facts.immunePsychic
    else if (damageType == RadiantDamage) facts.immuneRadiant
    else if (damageType == SlashingDamage) facts.immuneSlashing
    else facts.immuneThunder

  pure def damageTypeIsResistant(
    facts: DamageAdjustmentFacts,
    damageType: RuleDamageType
  ): bool =
    if (damageType == AcidDamage) facts.resistantAcid
    else if (damageType == BludgeoningDamage) facts.resistantBludgeoning
    else if (damageType == ColdDamage) facts.resistantCold
    else if (damageType == FireDamage) facts.resistantFire
    else if (damageType == ForceDamage) facts.resistantForce
    else if (damageType == LightningDamage) facts.resistantLightning
    else if (damageType == NecroticDamage) facts.resistantNecrotic
    else if (damageType == PiercingDamage) facts.resistantPiercing
    else if (damageType == PoisonDamage) facts.resistantPoison
    else if (damageType == PsychicDamage) facts.resistantPsychic
    else if (damageType == RadiantDamage) facts.resistantRadiant
    else if (damageType == SlashingDamage) facts.resistantSlashing
    else facts.resistantThunder

  pure def damageTypeIsVulnerable(
    facts: DamageAdjustmentFacts,
    damageType: RuleDamageType
  ): bool =
    if (damageType == AcidDamage) facts.vulnerableAcid
    else if (damageType == BludgeoningDamage) facts.vulnerableBludgeoning
    else if (damageType == ColdDamage) facts.vulnerableCold
    else if (damageType == FireDamage) facts.vulnerableFire
    else if (damageType == ForceDamage) facts.vulnerableForce
    else if (damageType == LightningDamage) facts.vulnerableLightning
    else if (damageType == NecroticDamage) facts.vulnerableNecrotic
    else if (damageType == PiercingDamage) facts.vulnerablePiercing
    else if (damageType == PoisonDamage) facts.vulnerablePoison
    else if (damageType == PsychicDamage) facts.vulnerablePsychic
    else if (damageType == RadiantDamage) facts.vulnerableRadiant
    else if (damageType == SlashingDamage) facts.vulnerableSlashing
    else facts.vulnerableThunder

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
  ): DamageByType = {
    acid: damageAmountAfterTargetAdjustments(amounts.acid, AcidDamage, facts),
    bludgeoning: damageAmountAfterTargetAdjustments(amounts.bludgeoning, BludgeoningDamage, facts),
    cold: damageAmountAfterTargetAdjustments(amounts.cold, ColdDamage, facts),
    fire: damageAmountAfterTargetAdjustments(amounts.fire, FireDamage, facts),
    force: damageAmountAfterTargetAdjustments(amounts.force, ForceDamage, facts),
    lightning: damageAmountAfterTargetAdjustments(amounts.lightning, LightningDamage, facts),
    necrotic: damageAmountAfterTargetAdjustments(amounts.necrotic, NecroticDamage, facts),
    piercing: damageAmountAfterTargetAdjustments(amounts.piercing, PiercingDamage, facts),
    poison: damageAmountAfterTargetAdjustments(amounts.poison, PoisonDamage, facts),
    psychic: damageAmountAfterTargetAdjustments(amounts.psychic, PsychicDamage, facts),
    radiant: damageAmountAfterTargetAdjustments(amounts.radiant, RadiantDamage, facts),
    slashing: damageAmountAfterTargetAdjustments(amounts.slashing, SlashingDamage, facts),
    thunder: damageAmountAfterTargetAdjustments(amounts.thunder, ThunderDamage, facts),
  }

  pure def totalDamageByType(amounts: DamageByType): int =
    amounts.acid + amounts.bludgeoning + amounts.cold + amounts.fire + amounts.force
      + amounts.lightning + amounts.necrotic + amounts.piercing + amounts.poison
      + amounts.psychic + amounts.radiant + amounts.slashing + amounts.thunder

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
