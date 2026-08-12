// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-direct-condition

module battleRuntimeInvisibilityTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeInvisibility.* from "./battle-runtime-invisibility"
  import battleRuntimeDirectConditionActionLifecycle.* from "./battle-runtime-direct-condition-action-lifecycle"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeTimedEffects.* from "./battle-runtime-timed-effects"

  run test_invisibility_direct_condition_lifecycle = {
    val invisible = resolveInvisibilityConditionSpell(initialState, Set(Fighter, Goblin), 3)
    val afterAttackRoll = recordFighterAttackRoll(invisible)
    val afterSpellCast = resolveInvisibilityConditionSpell({ ...invisible, actionAvailable: true, spellSlotUsesThisTurn: Set() }, Set(Goblin), 2)
    val afterDamage = battleStateAfterTargetActionEarlyEndForActor(invisible, Fighter)
    val brokenConcentration = breakConcentrationSpellEffects(invisible, Fighter)
    val expired = tickRoundDurationSpellEffects({
      ...invisible,
      fighter: {
        ...invisible.fighter,
        activeEffects: Set(InvisibilityCondition({ source: Fighter, durationTicks: 1 })),
      },
      goblin: {
        ...invisible.goblin,
        activeEffects: Set(InvisibilityCondition({ source: Fighter, durationTicks: 1 })),
      },
    })
    all {
      assert(activeEffectsContainInvisibilityCondition(invisible.fighter.activeEffects)),
      assert(activeEffectsContainInvisibilityCondition(invisible.goblin.activeEffects)),
      assert(activeEffectsInvisibilityDurationTicks(tickDurationActiveEffects(invisible.goblin.activeEffects)) == 599),
      assert(not(activeEffectsContainInvisibilityCondition(afterAttackRoll.fighter.activeEffects))),
      assert(not(activeEffectsContainInvisibilityCondition(afterAttackRoll.goblin.activeEffects))),
      assert(not(afterAttackRoll.fighter.concentrating)),
      assert(not(activeEffectsContainInvisibilityCondition(afterSpellCast.fighter.activeEffects))),
      assert(activeEffectsContainInvisibilityCondition(afterSpellCast.goblin.activeEffects)),
      assert(afterSpellCast.fighter.concentrating),
      assert(not(activeEffectsContainInvisibilityCondition(afterDamage.fighter.activeEffects))),
      assert(not(activeEffectsContainInvisibilityCondition(afterDamage.goblin.activeEffects))),
      assert(not(afterDamage.fighter.concentrating)),
      assert(not(activeEffectsContainInvisibilityCondition(brokenConcentration.fighter.activeEffects))),
      assert(not(activeEffectsContainInvisibilityCondition(brokenConcentration.goblin.activeEffects))),
      assert(not(activeEffectsContainInvisibilityCondition(expired.fighter.activeEffects))),
      assert(not(activeEffectsContainInvisibilityCondition(expired.goblin.activeEffects))),
      assert(not(expired.fighter.concentrating)),
    }
  }
}
