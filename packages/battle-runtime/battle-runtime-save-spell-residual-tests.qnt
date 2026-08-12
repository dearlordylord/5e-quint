// -*- mode: Bluespec; -*-
// TEMPORARY RESIDUAL: these scenarios depend on the master-owned Light/concentration/prone lane; delete this root and its closure exception only after synchronization.
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-attack-roll-advantage-save
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-hideous-laughter-repeat-save-lifecycle

module battleRuntimeSaveSpellResidualTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeWeaponAttacks.* from "./battle-runtime-weapon-attacks"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeSleepHideousLaughter.* from "./battle-runtime-sleep-hideous-laughter"
  import battleRuntimeSpellAttackRollAndVisibilityFacts.* from "./battle-runtime-spell-attack-roll-and-visibility-facts"
  import battleRuntimeSaveConditionFaerieFire.* from "./battle-runtime-save-condition-faerie-fire"
  import battleRuntimeLight.* from "./battle-runtime-light"
  import battleRuntimeProneMovement.* from "./battle-runtime-prone-movement"

  run test_roll_modifier_concentration_effects_end_when_caster_concentration_breaks = {
    val concentrating = {
      ...endTurn(initialState),
      fighter: {
        ...initialState.fighter,
        concentrating: true,
        activeEffects: Set(BaneD20RollPenalty, BlessD20RollBonus, GuidanceAbilityCheckBonus({ skill: StealthSkill }), PassWithoutTraceStealthBonus),
      },
      goblin: {
        ...initialState.goblin,
        activeEffects: Set(BaneD20RollPenalty, BlessD20RollBonus, GuidanceAbilityCheckBonus({ skill: StealthSkill }), PassWithoutTraceStealthBonus),
      },
    }
    val result = resolveGoblinAttack(concentrating, 20, 18, 5, false)
    all {
      assert(not(result.fighter.concentrating)),
      assert(not(result.fighter.activeEffects.contains(BaneD20RollPenalty))),
      assert(not(result.fighter.activeEffects.contains(BlessD20RollBonus))),
      assert(not(result.fighter.activeEffects.contains(GuidanceAbilityCheckBonus({ skill: StealthSkill })))),
      assert(not(result.fighter.activeEffects.contains(PassWithoutTraceStealthBonus))),
      assert(not(result.goblin.activeEffects.contains(BaneD20RollPenalty))),
      assert(not(result.goblin.activeEffects.contains(BlessD20RollBonus))),
      assert(not(result.goblin.activeEffects.contains(GuidanceAbilityCheckBonus({ skill: StealthSkill })))),
      assert(not(result.goblin.activeEffects.contains(PassWithoutTraceStealthBonus))),
    }
  }

  run test_faerie_fire_applies_outline_until_concentration_break = {
    val lit = resolveFaerieFire(initialState, true, false)
    val broken = breakConcentrationSpellEffects(lit, Fighter)
    all {
      assert(lit.actionAvailable == false),
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

  run test_hideous_laughter_suppresses_standing_from_prone = {
    val laughedAtFighter = {
      ...initialState,
      fighter: hideousLaughterTarget(initialState.fighter, Fighter, false, Goblin, Fighter),
    }
    val stood = standFighterFromProneUnlessHideousLaughter(laughedAtFighter)
    assert(stood == laughedAtFighter)
  }

}
