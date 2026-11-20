// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner SHEET.HIT_POINTS.MAXIMUM_DERIVATION

module hitPointMaximum {
  // A level after 1 adds the fixed value or the Hit Die as the player rolled it.
  type HigherLevelHitPointRule =
    | FixedHigherLevelGain
    | RolledHigherLevelGain(int)

  // Each level records the Constitution modifier the character had when gaining
  // it, before that level's own score increases.
  type HigherLevelHitPointGain = {
    hitPointDie: int,
    rule: HigherLevelHitPointRule,
    constitutionModifierAtGain: int,
  }

  type HitPointMaximumFacts = {
    startingHitPointDie: int,
    constitutionModifier: int,
    higherLevelHitPointGains: List[HigherLevelHitPointGain],
    hitPointMaximumBonus: int,
    hitPointMaximumReduction: int,
  }

  pure def fixedHigherLevelHitPointGainFor(
    hitPointDie: int,
    constitutionModifierAtGain: int,
  ): HigherLevelHitPointGain =
    {
      hitPointDie: hitPointDie,
      rule: FixedHigherLevelGain,
      constitutionModifierAtGain: constitutionModifierAtGain,
    }

  pure def rolledHigherLevelHitPointGainFor(
    hitPointDie: int,
    hitDieResult: int,
    constitutionModifierAtGain: int,
  ): HigherLevelHitPointGain =
    {
      hitPointDie: hitPointDie,
      rule: RolledHigherLevelGain(hitDieResult),
      constitutionModifierAtGain: constitutionModifierAtGain,
    }

  pure def higherLevelHitDieValue(gain: HigherLevelHitPointGain): int =
    match gain.rule {
      | FixedHigherLevelGain => (gain.hitPointDie / 2) + 1
      | RolledHigherLevelGain(hitDieResult) => hitDieResult
    }

  // Level Advancement step 2: the value plus the modifier at the time, minimum 1.
  // Step 5: each later +1 to the modifier adds 1 for the level.
  pure def higherLevelHitPointGain(gain: HigherLevelHitPointGain, constitutionModifier: int): int = {
    val gained = higherLevelHitDieValue(gain) + gain.constitutionModifierAtGain
    val atGain = if (gained < 1) 1 else gained
    atGain + constitutionModifier - gain.constitutionModifierAtGain
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

  // A built character's scores only rise, so no level records a modifier above
  // the current one.
  pure def legalHitPointMaximumFacts(facts: HitPointMaximumFacts): bool = all {
    facts.startingHitPointDie > 0,
    facts.higherLevelHitPointGains.foldl(true, (legal, gain) =>
      legal
        and legalHigherLevelHitPointGain(gain)
        and gain.constitutionModifierAtGain <= facts.constitutionModifier
    ),
    normalHitPointMaximum(facts) > 0,
    facts.hitPointMaximumReduction >= 0,
    facts.hitPointMaximumReduction < normalHitPointMaximum(facts),
  }
}
