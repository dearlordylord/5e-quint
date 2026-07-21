// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS

module battleRuntimeSpellRestorationBridge {
  import spellDefinitionProfiles.* from "../shared-algebras/proofs/rule-core/spell-definition-profiles"
  import spellInvocationActionSlotCore.* from "../shared-algebras/proofs/rule-core/spell-invocation-action-slot-core"
  import spellInvocationResourceCore.* from "../shared-algebras/proofs/rule-core/spell-invocation-resource-core"
  import spellInvocationTargetCardinalityCore.* from "../shared-algebras/proofs/rule-core/spell-invocation-target-cardinality-core"

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
}
