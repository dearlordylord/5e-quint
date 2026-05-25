// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.zero-hit-point-replacement
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP

module unitFeatureZeroHitPointCore {
  import hitPointDamage.* from "./hit-point-damage"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"
  import unitFeaturePoolCostCore.* from "./unit-feature-pool-cost-core"

  // RAW anchors:
  // - Character-Origins.md: Orc Relentless Endurance.
  // - Playing-the-Game.md: Dropping to 0 Hit Points and Instant Death.
  // - UBIQUITOUS_LANGUAGE.md: Hit Points and Death.

  type ZeroHitPointReplacementFacts = {
    incomingDamage: int,
    choosesFeature: bool,
  }

  type ZeroHitPointReplacementResult = {
    admitted: bool,
    pool: FeatureUsePool,
    vitals: CreatureVitals,
    deathSavingThrows: DeathSavingThrowLifecycle,
  }

  pure def damageWouldKillOutright(
    before: CreatureVitals,
    damageResult: DamageResult
  ): bool =
    before.kind == PlayerCharacter
      and before.hitPoints > 0
      and damageResult.vitals.hitPoints == 0
      and damageResult.remainingDamageAtZero >= before.hitPointMaximum

  pure def resolveZeroHitPointReplacement(
    before: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle,
    pool: FeatureUsePool,
    facts: ZeroHitPointReplacementFacts
  ): ZeroHitPointReplacementResult = {
    val damaged = applyResolvedDamageToPositiveHitPoints(
      before,
      facts.incomingDamage
    )
    val admitted = all {
      legalVitals(before),
      legalDeathSavingThrowLifecycle(lifecycle),
      before.kind == PlayerCharacter,
      before.hitPoints > 0,
      damaged.vitals.hitPoints == 0,
      not(damageWouldKillOutright(before, damaged)),
      facts.choosesFeature,
      legalFeatureUsePool(pool),
      pool.usesRemaining > 0,
    }
    {
      admitted: admitted,
      pool: if (admitted) spendFeatureUsePool(pool) else pool,
      vitals:
        if (admitted) {
          kind: before.kind,
          hitPoints: 1,
          hitPointMaximum: before.hitPointMaximum,
          temporaryHitPoints: damaged.vitals.temporaryHitPoints,
          dead: false,
          unconscious: false,
        } else damaged.vitals,
      deathSavingThrows:
        if (admitted) lifecycle
        else deathSavingThrowLifecycleAfterPositiveHitPointDamage(
          lifecycle,
          damaged
      ),
    }
  }
}
