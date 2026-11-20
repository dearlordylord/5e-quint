// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner SHEET.HIT_POINTS.MAXIMUM_DERIVATION

module hitPointMaximum {
  // A level after 1 adds the fixed value or the Hit Die as the player rolled it.
  type HigherLevelHitPointRule =
    | FixedHigherLevelGain
    | RolledHigherLevelGain(int)

  type HigherLevelHitPointGain = {
    hitPointDie: int,
    rule: HigherLevelHitPointRule,
  }

  type HitPointMaximumFacts = {
    startingHitPointDie: int,
    constitutionModifier: int,
    higherLevelHitPointGains: List[HigherLevelHitPointGain],
    hitPointMaximumBonus: int,
    hitPointMaximumReduction: int,
  }

  pure def fixedHigherLevelHitPointGainFor(hitPointDie: int): HigherLevelHitPointGain =
    { hitPointDie: hitPointDie, rule: FixedHigherLevelGain }

  pure def rolledHigherLevelHitPointGainFor(hitPointDie: int, hitDieResult: int): HigherLevelHitPointGain =
    { hitPointDie: hitPointDie, rule: RolledHigherLevelGain(hitDieResult) }

  pure def higherLevelHitDieValue(gain: HigherLevelHitPointGain): int =
    match gain.rule {
      | FixedHigherLevelGain => (gain.hitPointDie / 2) + 1
      | RolledHigherLevelGain(hitDieResult) => hitDieResult
    }

  // Recomputed from the current Constitution modifier, with the minimum of 1.
  pure def higherLevelHitPointGain(gain: HigherLevelHitPointGain, constitutionModifier: int): int = {
    val total = higherLevelHitDieValue(gain) + constitutionModifier
    if (total < 1) 1 else total
  }

  pure def legalHigherLevelHitPointGain(gain: HigherLevelHitPointGain): bool = all {
    gain.hitPointDie > 0,
    match gain.rule {
      | FixedHigherLevelGain => true
      | RolledHigherLevelGain(hitDieResult) => hitDieResult >= 1 and hitDieResult <= gain.hitPointDie
    },
  }

  pure def normalHitPointMaximum(facts: HitPointMaximumFacts): int =
    facts.startingHitPointDie
      + facts.constitutionModifier
      + facts.higherLevelHitPointGains.foldl(0, (total, gain) =>
        total + higherLevelHitPointGain(gain, facts.constitutionModifier)
      )
      + facts.hitPointMaximumBonus

  pure def effectiveHitPointMaximum(facts: HitPointMaximumFacts): int =
    normalHitPointMaximum(facts) - facts.hitPointMaximumReduction

  pure def legalHitPointMaximumFacts(facts: HitPointMaximumFacts): bool = all {
    facts.startingHitPointDie > 0,
    facts.higherLevelHitPointGains.foldl(true, (legal, gain) =>
      legal and legalHigherLevelHitPointGain(gain)
    ),
    normalHitPointMaximum(facts) > 0,
    facts.hitPointMaximumReduction >= 0,
    facts.hitPointMaximumReduction < normalHitPointMaximum(facts),
  }
}
