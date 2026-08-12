// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-attack-roll-advantage-save

module battleRuntimeFaerieFireVisibilityTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeSpellAttackRollAndVisibilityFacts.* from "./battle-runtime-spell-attack-roll-and-visibility-facts"
  import battleRuntimeSaveConditionFaerieFire.* from "./battle-runtime-save-condition-faerie-fire"
  import battleRuntimeLightEmitters.* from "./battle-runtime-light-emitters"

  run test_faerie_fire_applies_outline_until_concentration_break = {
    val lit = resolveFaerieFire(initialState, true, false)
    val broken = breakConcentrationSpellEffects(lit, Fighter)
    all {
      assert(not(lit.actionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(lit, Fighter)),
      assert(lit.fighter.concentrating),
      assert(not(lit.fighter.activeEffects.contains(FaerieFireOutline))),
      assert(lit.goblin.activeEffects.contains(FaerieFireOutline)),
      assert(faerieFireDimLightRadiusFeet == 10),
      assert(battleRuntimeLightEmitters(lit).contains(SpellLightEmitter({
        source: Fighter,
        sourceSpell: FaerieFire,
        attachment: CombatantLightEmitter({ actor: Goblin }),
        emission: DimLightEmission({ radiusFeet: faerieFireDimLightRadiusFeet }),
        opaqueCoverInteraction: LightEmitterDoesNotBlockOpaqueCover,
        ongoingSpellTracking: UntrackedSpellLightEmitter,
        expiresAt: ConcentrationLightEmitterExpiration({ actor: Fighter }),
      }))),
      assert(activeEffectsDenyInvisibleBenefit(lit.goblin.activeEffects)),
      assert(spellAttackRollModeFromActiveEffects(Set(), lit.goblin.activeEffects, true) == AdvantageSpellAttackRoll),
      assert(spellAttackRollModeFromActiveEffects(Set(), lit.goblin.activeEffects, false) == NormalSpellAttackRoll),
      assert(not(broken.goblin.activeEffects.contains(FaerieFireOutline))),
      assert(not(battleRuntimeLightEmitters(broken).contains(SpellLightEmitter({
        source: Fighter,
        sourceSpell: FaerieFire,
        attachment: CombatantLightEmitter({ actor: Goblin }),
        emission: DimLightEmission({ radiusFeet: faerieFireDimLightRadiusFeet }),
        opaqueCoverInteraction: LightEmitterDoesNotBlockOpaqueCover,
        ongoingSpellTracking: UntrackedSpellLightEmitter,
        expiresAt: ConcentrationLightEmitterExpiration({ actor: Fighter }),
      })))),
      assert(not(activeEffectsDenyInvisibleBenefit(broken.goblin.activeEffects))),
    }
  }

  run test_faerie_fire_object_outline_until_concentration_break = {
    val lit = resolveFaerieFireWithObjects(initialState, true, true, Set(FaerieFireObjectTarget))
    val broken = breakConcentrationSpellEffects(lit, Fighter)
    all {
      assert(lit.objectOutlines.contains(FaerieFireObjectOutline({ source: Fighter, object: FaerieFireObjectTarget }))),
      assert(battleRuntimeLightEmitters(lit).contains(SpellLightEmitter({
        source: Fighter,
        sourceSpell: FaerieFire,
        attachment: ObjectLightEmitter({ object: FaerieFireObjectTarget }),
        emission: DimLightEmission({ radiusFeet: faerieFireDimLightRadiusFeet }),
        opaqueCoverInteraction: LightEmitterDoesNotBlockOpaqueCover,
        ongoingSpellTracking: UntrackedSpellLightEmitter,
        expiresAt: ConcentrationLightEmitterExpiration({ actor: Fighter }),
      }))),
      assert(objectOutlinesDenyInvisibleBenefit(lit.objectOutlines, FaerieFireObjectTarget)),
      assert(battleIlluminationFromLightEmitters(
        battleRuntimeLightEmitters(lit),
        Set(ObjectLightEmitterProjectionFact({
          object: FaerieFireObjectTarget,
          distanceFeet: 10,
          opaqueCover: true,
        }))
      ) == DimLightIllumination),
      assert(spellObjectAttackRollModeFromActiveEffects(Set(), lit.objectOutlines, FaerieFireObjectTarget, true) == AdvantageSpellAttackRoll),
      assert(spellObjectAttackRollModeFromActiveEffects(Set(), lit.objectOutlines, FaerieFireObjectTarget, false) == NormalSpellAttackRoll),
      assert(spellObjectAttackRollModeFromActiveEffects(Set(ViciousMockeryNextAttackDisadvantage), lit.objectOutlines, FaerieFireObjectTarget, true) == NormalSpellAttackRoll),
      assert(not(broken.objectOutlines.contains(FaerieFireObjectOutline({ source: Fighter, object: FaerieFireObjectTarget })))),
      assert(not(battleRuntimeLightEmitters(broken).contains(SpellLightEmitter({
        source: Fighter,
        sourceSpell: FaerieFire,
        attachment: ObjectLightEmitter({ object: FaerieFireObjectTarget }),
        emission: DimLightEmission({ radiusFeet: faerieFireDimLightRadiusFeet }),
        opaqueCoverInteraction: LightEmitterDoesNotBlockOpaqueCover,
        ongoingSpellTracking: UntrackedSpellLightEmitter,
        expiresAt: ConcentrationLightEmitterExpiration({ actor: Fighter }),
      })))),
      assert(not(objectOutlinesDenyInvisibleBenefit(broken.objectOutlines, FaerieFireObjectTarget))),
    }
  }
}
