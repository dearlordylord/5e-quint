// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-sanctuary-targeting-interdiction

module battleRuntimeSanctuaryTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSanctuary.* from "./battle-runtime-sanctuary"
  import battleRuntimeSanctuarySpellResolution.* from "./battle-runtime-sanctuary-spell-resolution"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeTimedEffects.* from "./battle-runtime-timed-effects"

  run test_sanctuary_targeting_interdiction_trigger_scope = {
    val warded = resolveSanctuaryWardSpell(initialState, Goblin)
    all {
      assert(activeEffectsContainSanctuaryWard(warded.goblin.activeEffects)),
      assert(activeEffectsSanctuaryWardDurationTicks(warded.goblin.activeEffects) == 10),
      assert(activeEffectsSanctuaryWardDurationTicks(tickDurationActiveEffects(warded.goblin.activeEffects)) == 9),
      assert(wardTargetingInterdictionApplies(SanctuaryAttackRollTargeting)),
      assert(wardTargetingInterdictionApplies(SanctuaryDamagingSpellTargeting)),
      assert(not(wardTargetingInterdictionApplies(SanctuaryAreaOfEffectTargeting))),
      assert(sanctuaryTargetingInterdictionOutcomeApplies(
        warded,
        Goblin,
        SanctuaryAttackRollTargeting,
        SanctuarySaveSucceeded,
      )),
      assert(not(sanctuaryTargetingInterdictionOutcomeApplies(
        warded,
        Goblin,
        SanctuaryAreaOfEffectTargeting,
        SanctuarySaveSucceeded,
      ))),
    }
  }

  run test_sanctuary_targeting_interdiction_outcomes = {
    val warded = resolveSanctuaryWardSpell(initialState, Goblin)
    all {
      assert(wardInterdictionLosesAttackOrSpell(SanctuaryLoseAttackOrSpell)),
      assert(not(wardInterdictionLosesAttackOrSpell(SanctuarySaveSucceeded))),
      assert(not(sanctuaryTargetingInterdictionOutcomeApplies(
        warded,
        Goblin,
        SanctuaryAttackRollTargeting,
        SanctuaryLoseAttackOrSpell,
      ))),
      assert(sanctuaryTargetingInterdictionResolvedTarget(
        warded,
        Goblin,
        SanctuaryAttackRollTargeting,
        SanctuarySaveSucceeded,
      ) == Goblin),
      assert(sanctuaryTargetingInterdictionResolvedTarget(
        warded,
        Goblin,
        SanctuaryDamagingSpellTargeting,
        SanctuaryChooseNewTarget({ target: Fighter }),
      ) == Fighter),
    }
  }

  run test_sanctuary_early_end_lifecycle = {
    val fighterWarded = resolveSanctuaryWardSpell(initialState, Fighter)
    val afterAttackRoll = recordFighterAttackRoll(fighterWarded)
    val afterSpellCast = resolveSanctuaryWardSpell({ ...fighterWarded, bonusActionAvailable: true, spellSlotUsesThisTurn: Set() }, Goblin)
    val afterDamage = battleStateAfterSanctuaryEarlyEndForActor(fighterWarded, Fighter)
    all {
      assert(activeEffectsContainSanctuaryWard(fighterWarded.fighter.activeEffects)),
      assert(not(activeEffectsContainSanctuaryWard(afterAttackRoll.fighter.activeEffects))),
      assert(not(activeEffectsContainSanctuaryWard(afterSpellCast.fighter.activeEffects))),
      assert(activeEffectsContainSanctuaryWard(afterSpellCast.goblin.activeEffects)),
      assert(not(activeEffectsContainSanctuaryWard(afterDamage.fighter.activeEffects))),
    }
  }

}
