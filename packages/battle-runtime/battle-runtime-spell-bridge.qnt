// -*- mode: Bluespec; -*-

module battleRuntimeSpellBridge {
  import spellProcedureProfiles.* from "../shared-algebras/proofs/rule-core/spell-procedure-profiles"

  type BattleRuntimeDirectHitPointRestorationProfile =
    | BattleRuntimeHealingWordRestoration
    | BattleRuntimeCureWoundsRestoration
    | BattleRuntimeMassHealingWordRestoration

  pure def battleRuntimeDirectHitPointRestorationSpellProfile(
    profile: BattleRuntimeDirectHitPointRestorationProfile
  ): SpellDefinitionProfile =
    match profile {
      | BattleRuntimeHealingWordRestoration => HealingWordSpellProfile
      | BattleRuntimeCureWoundsRestoration => CureWoundsSpellProfile
      | BattleRuntimeMassHealingWordRestoration => MassHealingWordSpellProfile
    }

  pure def battleRuntimeDirectHitPointRestorationUsesBonusAction(
    profile: BattleRuntimeDirectHitPointRestorationProfile
  ): bool =
    spellProfileAction(battleRuntimeDirectHitPointRestorationSpellProfile(profile)) == BonusActionSpellInvocation

  pure def battleRuntimeDirectHitPointRestorationMaximumTargets(
    profile: BattleRuntimeDirectHitPointRestorationProfile,
    slotLevel: int
  ): int =
    if (legalSpellInvocationTargetCount(battleRuntimeDirectHitPointRestorationSpellProfile(profile), slotLevel, 6)) 6 else 1

  pure def battleRuntimeDirectHitPointRestorationHealing(
    healingRoll: int,
    spellcastingAbilityModifier: int
  ): int =
    healingRoll + spellcastingAbilityModifier

  run test_direct_hit_point_restoration_profile_projection = {
    all {
      assert(battleRuntimeDirectHitPointRestorationUsesBonusAction(BattleRuntimeHealingWordRestoration)),
      assert(not(battleRuntimeDirectHitPointRestorationUsesBonusAction(BattleRuntimeCureWoundsRestoration))),
      assert(battleRuntimeDirectHitPointRestorationMaximumTargets(BattleRuntimeMassHealingWordRestoration, 3) == 6),
      assert(battleRuntimeDirectHitPointRestorationMaximumTargets(BattleRuntimeCureWoundsRestoration, 1) == 1),
      assert(battleRuntimeDirectHitPointRestorationHealing(5, 3) == 8),
    }
  }
}
