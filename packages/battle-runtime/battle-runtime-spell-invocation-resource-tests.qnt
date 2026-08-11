// -*- mode: Bluespec; -*-

module battleRuntimeSpellInvocationResourceTests {
  import spellInvocationResourceCore.* from "../shared-algebras/proofs/rule-core/spell-invocation-resource-core"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeMagicMissileArithmetic.* from "./battle-runtime-magic-missile-arithmetic"
  import battleRuntimeSpellSlotClassification.* from "./battle-runtime-spell-slot-classification"


  run test_spell_invocation_slot_spend_distinguishes_prepared_spell_from_cantrip = {
    val magicMissileResourceFacts = repeatedDamageAllocationInvocationResourceFacts({
      hasSpellAccess: true,
      selectedSlotLevel: 1,
      targetCount: 1,
      targetsAreValid: true,
      repeatedEffectCount: magicMissileDartCount(1),
    })
    all {
      assert(expendedSlotsAfterSpellInvocationResource(magicMissileResourceFacts, 0) == 1),
      assert(expendedSlotsAfterInvocation(RayOfFrost, 0) == 0),
      assert(expendedSlotsAfterInvocation(AcidSplash, 0) == 0),
      assert(expendedSlotsAfterInvocation(PoisonSpray, 0) == 0),
      assert(expendedSlotsAfterInvocation(ChillTouch, 0) == 0),
      assert(expendedSlotsAfterInvocation(StarryWisp, 0) == 0),
      assert(expendedSlotsAfterInvocation(SacredFlame, 0) == 0),
      assert(expendedSlotsAfterInvocation(InflictWounds, 0) == 1),
      assert(expendedSlotsAfterInvocation(BurningHands, 0) == 1),
      assert(expendedSlotsAfterInvocation(Fireball, 0) == 1),
      assert(expendedSlotsAfterInvocation(ColorSpray, 0) == 1),
      assert(expendedSlotsAfterInvocation(Entangle, 0) == 1),
      assert(expendedSlotsAfterInvocation(HealingWord, 0) == 1),
      assert(expendedSlotsAfterInvocation(CureWounds, 0) == 1),
      assert(expendedSlotsAfterInvocation(MassHealingWord, 0) == 1),
      assert(expendedSlotsAfterInvocation(Heroism, 0) == 1),
      assert(expendedSlotsAfterInvocation(Bane, 0) == 1),
      assert(expendedSlotsAfterInvocation(Bless, 0) == 1),
      assert(expendedSlotsAfterInvocation(Guidance, 0) == 0),
      assert(expendedSlotsAfterInvocation(Grease, 0) == 1),
      assert(expendedSlotsAfterInvocation(FogCloud, 0) == 1),
      assert(expendedSlotsAfterInvocation(Darkness, 0) == 1),
      assert(expendedSlotsAfterInvocation(Command, 0) == 1),
    }
  }
}
