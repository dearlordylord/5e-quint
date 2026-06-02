// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner SHEET.HIT_POINTS.MAXIMUM_DERIVATION

module hitPointMaximum {
  type HitPointMaximumFacts = {
    startingHitPointDie: int,
    constitutionModifier: int,
    fixedHigherLevelHitPointDice: List[int],
    hitPointMaximumBonus: int,
    hitPointMaximumReduction: int,
  }

  pure def fixedHigherLevelHitPointGain(hitPointDie: int, constitutionModifier: int): int = {
    val gain = (hitPointDie / 2) + 1 + constitutionModifier
    if (gain < 1) 1 else gain
  }

  pure def normalHitPointMaximum(facts: HitPointMaximumFacts): int =
    facts.startingHitPointDie
      + facts.constitutionModifier
      + facts.fixedHigherLevelHitPointDice.foldl(0, (total, hitPointDie) =>
        total + fixedHigherLevelHitPointGain(hitPointDie, facts.constitutionModifier)
      )
      + facts.hitPointMaximumBonus

  pure def effectiveHitPointMaximum(facts: HitPointMaximumFacts): int =
    normalHitPointMaximum(facts) - facts.hitPointMaximumReduction

  pure def legalHitPointMaximumFacts(facts: HitPointMaximumFacts): bool = all {
    facts.startingHitPointDie > 0,
    facts.fixedHigherLevelHitPointDice.foldl(true, (legal, hitPointDie) =>
      legal and hitPointDie > 0
    ),
    normalHitPointMaximum(facts) > 0,
    facts.hitPointMaximumReduction >= 0,
    facts.hitPointMaximumReduction < normalHitPointMaximum(facts),
  }
}
