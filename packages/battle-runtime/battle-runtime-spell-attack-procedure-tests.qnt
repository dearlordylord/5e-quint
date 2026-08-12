// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-independent-attack-sequence spell.reaction-shield

module battleRuntimeSpellAttackProcedureTests {
  import battleRuntimeSpellAttackDirectResolution.* from "./battle-runtime-spell-attack-direct-resolution"
  import battleRuntimeDirectShieldReactionResolution.* from "./battle-runtime-direct-shield-reaction-resolution"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeMirrorImage.* from "./battle-runtime-mirror-image"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeEndOfTurnRiderExpiration.* from "./battle-runtime-end-of-turn-rider-expiration"
  import battleRuntimeSpellAttackFacts.* from "./battle-runtime-spell-attack-facts"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeSpellAttackRollAndVisibilityFacts.* from "./battle-runtime-spell-attack-roll-and-visibility-facts"
  import battleRuntimeEndOfTurnLightExpiration.* from "./battle-runtime-end-of-turn-light-expiration"
  import battleRuntimeSpellAttackIndependentSequence.* from "./battle-runtime-spell-attack-independent-sequence"
  import unitFeatureMetamagicOptionFactCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-option-fact-core"
  import battleRuntimeMetamagicQuickenedSpellAttack.* from "./battle-runtime-metamagic-quickened-spell-attack"
  import battleRuntimeSorcerousBurstDamageChoice.* from "./battle-runtime-sorcerous-burst-damage-choice"
  import battleRuntimeSpellIndependentSequenceBridge.* from "./battle-runtime-spell-independent-sequence-bridge"

  run test_spell_attack_procedures = all {
{
        val noReaction = { ...initialState, goblin: { ...initialState.goblin, reactionAvailable: false } }
        val result = resolvePoisonSpray(noReaction, 15, 10, 7, true)
        all {
          assert(result.actionAvailable == false),
          assert(result.goblin.hp == 3),
          assert(not(battleActorHasSpellSlotUse(result, Fighter))),
        }
      },
    {
        val mirroredGoblin = {
          ...initialState,
          goblin: {
            ...initialState.goblin,
            activeEffects: Set(mirrorImageActiveEffect),
            reactionAvailable: false,
          },
        }
        val redirected = resolveRayOfFrostWithMirrorImageDuplicateRoll(mirroredGoblin, 15, 10, 4, true, 3, false)
        val failedRoll = resolveRayOfFrostWithMirrorImageDuplicateRoll(mirroredGoblin, 15, 10, 4, true, 2, false)
        all {
          assert(redirected.goblin.hp == 10),
          assert(activeEffectsMirrorImageRemainingDuplicates(redirected.goblin.activeEffects) == 2),
          assert(not(redirected.goblin.activeEffects.contains(RayOfFrostSpeedDelta))),
          assert(redirected.actionAvailable == false),
          assert(failedRoll.goblin.hp == 6),
          assert(activeEffectsMirrorImageRemainingDuplicates(failedRoll.goblin.activeEffects) == 3),
          assert(failedRoll.goblin.activeEffects.contains(RayOfFrostSpeedDelta)),
        }
      },
    {
        val poisonAwaiting = resolvePoisonSpray(initialState, 15, 10, 7, true)
        val poisonTaken = resolveDirectShieldReactionOffer(poisonAwaiting, Goblin)
        val poisonDeclined = declineDirectShieldReactionOfferAndResume(poisonAwaiting, Goblin)
        val chillAwaiting = resolveChillTouch(initialState, 15, 10, 6, true)
        val chillTaken = resolveDirectShieldReactionOffer(chillAwaiting, Goblin)
        val chillDeclined = declineDirectShieldReactionOfferAndResume(chillAwaiting, Goblin)
        all {
          assert(poisonTaken.interruptStack == []),
          assert(poisonTaken.goblin.activeEffects.contains(ShieldArmorClassBonus)),
          assert(not(poisonTaken.goblin.reactionAvailable)),
          assert(battleActorHasCommittedSpellSlotUse(poisonTaken, Goblin)),
          assert(poisonTaken.goblin.hp == 10),
          assert(poisonDeclined.interruptStack == []),
          assert(poisonDeclined.goblin.reactionAvailable),
          assert(not(poisonDeclined.goblin.activeEffects.contains(ShieldArmorClassBonus))),
          assert(not(battleActorHasSpellSlotUse(poisonDeclined, Goblin))),
          assert(poisonDeclined.goblin.hp == 3),
          assert(chillTaken.interruptStack == []),
          assert(chillTaken.goblin.activeEffects.contains(ShieldArmorClassBonus)),
          assert(not(chillTaken.goblin.reactionAvailable)),
          assert(battleActorHasCommittedSpellSlotUse(chillTaken, Goblin)),
          assert(chillTaken.goblin.hp == 10),
          assert(chillDeclined.interruptStack == []),
          assert(chillDeclined.goblin.reactionAvailable),
          assert(not(chillDeclined.goblin.activeEffects.contains(ShieldArmorClassBonus))),
          assert(not(battleActorHasSpellSlotUse(chillDeclined, Goblin))),
          assert(chillDeclined.goblin.hp == 4),
        }
      },
    {
        val noReaction = { ...initialState, goblin: { ...initialState.goblin, reactionAvailable: false } }
        val result = resolveChillTouch(noReaction, 15, 10, 6, true)
        all {
          assert(result.actionAvailable == false),
          assert(result.goblin.hp == 4),
          assert(result.goblin.activeEffects.contains(ChillTouchHitPointRegainPrevented({ source: Fighter, expiresAtRound: 2 }))),
          assert(not(battleActorHasSpellSlotUse(result, Fighter))),
        }
      },
{
      val target = { ...initialState.goblin, hp: 3 }
      val hit = applyChillTouchHitPointRegainPrevention(initialState, target, Fighter)
      val blockedHealing = applyHealing(hit, 5)
      val retained = activeEffectsWithoutExpiredEndOfTurnRiders(hit.activeEffects, Goblin, 2)
      val expired = activeEffectsWithoutExpiredEndOfTurnRiders(hit.activeEffects, Fighter, 2)
      all {
        assert(hit.hp == 3),
        assert(blockedHealing.hp == 3),
        assert(retained.contains(ChillTouchHitPointRegainPrevented({ source: Fighter, expiresAtRound: 2 }))),
        assert(not(expired.exists(effect => match effect {
          | ChillTouchHitPointRegainPrevented(_) => true
          | _ => false
        }))),
        assert(applyHealing({ ...hit, activeEffects: expired }, 5).hp == 8),
      }
    },
{
      val hit = applyStarryWispDimLightEmitter(initialState, Fighter, CombatantLightEmitter({ actor: Goblin }))
      val emitter = starryWispDimLightEmitter(initialState, Fighter, CombatantLightEmitter({ actor: Goblin }))
      val retained = lightEmittersWithoutExpiredEndOfTurnEmitters(hit.lightEmitters, Goblin, 2)
      val expired = lightEmittersWithoutExpiredEndOfTurnEmitters(hit.lightEmitters, Fighter, 2)
      all {
        assert(hit.lightEmitters.contains(emitter)),
        assert(retained.contains(emitter)),
        assert(not(expired.contains(emitter))),
      }
    },
    {
      val hitGoblin = applyStarryWispInvisibleBenefitDenied(initialState, initialState.goblin, Fighter)
      val hit = { ...initialState, goblin: hitGoblin }
      val effect = StarryWispInvisibleBenefitDenied({ source: Fighter, expiresAtRound: 2 })
      val retained = activeEffectsWithoutExpiredEndOfTurnRiders(hit.goblin.activeEffects, Goblin, 2)
      val expired = activeEffectsWithoutExpiredEndOfTurnRiders(hit.goblin.activeEffects, Fighter, 2)
      all {
        assert(hit.goblin.activeEffects.contains(effect)),
        assert(activeEffectsDenyInvisibleBenefit(hit.goblin.activeEffects)),
        assert(retained.contains(effect)),
        assert(not(expired.contains(effect))),
        assert(not(activeEffectsDenyInvisibleBenefit(expired))),
      }
    },
    {
      val hit = applyStarryWispDimLightEmitter(initialState, Fighter, ObjectLightEmitter({ object: StarryWispObjectTarget }))
      val miss = initialState
      val retained = lightEmittersWithoutExpiredEndOfTurnEmitters(hit.lightEmitters, Goblin, 2)
      val expired = lightEmittersWithoutExpiredEndOfTurnEmitters(hit.lightEmitters, Fighter, 2)
      all {
        assert(objectInvisibleBenefitDenied(hit, StarryWispObjectTarget)),
        assert(not(objectInvisibleBenefitDenied(miss, StarryWispObjectTarget))),
        assert(objectInvisibleBenefitDenied({ ...hit, lightEmitters: retained }, StarryWispObjectTarget)),
        assert(not(objectInvisibleBenefitDenied({ ...hit, lightEmitters: expired }, StarryWispObjectTarget))),
        assert(hit.objectOutlines == Set()),
      }
    },
{
      val mirroredGoblin = {
        ...initialState,
        goblin: {
          ...initialState.goblin,
          activeEffects: Set(mirrorImageActiveEffect),
          reactionAvailable: false,
        },
      }
      val result = resolveEldritchBlastTwoBeamsWithMirrorImageDuplicateRolls(
        mirroredGoblin,
        15,
        10,
        4,
        true,
        3,
        false,
        16,
        11,
        6,
        true,
        3,
        false,
      )
      all {
        assert(result.goblin.hp == 10),
        assert(activeEffectsMirrorImageRemainingDuplicates(result.goblin.activeEffects) == 1),
        assert(result.actionAvailable == false),
      }
    },
    {
      val result = resolveEldritchBlastTwoBeams(initialState, 15, 10, 4, true, 1, 1, 6, true)
      val twoHits = resolveEldritchBlastTwoBeams(initialState, 15, 10, 4, true, 16, 11, 6, true)
      all {
        assert(result.actionAvailable == false),
        assert(result.goblin.hp == 6),
        assert(not(battleActorHasSpellSlotUse(result, Fighter))),
        assert(twoHits.actionAvailable == false),
        assert(twoHits.goblin.hp == 0),
        assert(not(battleActorHasSpellSlotUse(twoHits, Fighter))),
      }
    },
    {
      val noReaction = { ...initialState, goblin: { ...initialState.goblin, reactionAvailable: false } }
      val result = resolveQuickenedRayOfFrost(
        noReaction,
        15,
        10,
        7,
        true,
        Set(quickenedSpellMetamagicFact),
        Set(quickenedSpellMetamagicFact),
        2,
      )
      all {
        assert(result.state.actionAvailable),
        assert(not(result.state.bonusActionAvailable)),
        assert(battleActorHasQuickenedLevelOnePlusSpellThisTurn(result.state, Fighter)),
        assert(result.sorceryPointsRemaining == 0),
        assert(result.state.goblin.hp == 3),
        assert(result.state.goblin.activeEffects.contains(RayOfFrostSpeedDelta)),
      }
    },
    {
      val priorSpell = commitActorLevelOnePlusSpellCast(initialState, Fighter)
      val result = resolveQuickenedRayOfFrost(
        priorSpell,
        15,
        10,
        7,
        true,
        Set(quickenedSpellMetamagicFact),
        Set(quickenedSpellMetamagicFact),
        2,
      )
      assert(result == { state: priorSpell, sorceryPointsRemaining: 2 })
    },
    {
      all {
        assert(eldritchBlastBeamCount(1) == 1),
        assert(eldritchBlastBeamCount(5) == 2),
        assert(eldritchBlastBeamCount(11) == 3),
        assert(eldritchBlastBeamCount(17) == 4),
        assert(scorchingRayRayCount(1) == 0),
        assert(scorchingRayRayCount(2) == 3),
        assert(scorchingRayRayCount(3) == 4),
        assert(scorchingRayRayCount(5) == 6),
        assert(spellAttackSequenceReplayHoles(EldritchBlastBeamSequence, true, 2, 0, 0, 0, 0) == Set(TargetChoice, ObjectTargetChoice)),
        assert(spellAttackSequenceReplayHoles(EldritchBlastBeamSequence, true, 2, 2, 1, 0, 0) == Set(AttackRoll)),
        assert(spellAttackSequenceReplayHoles(EldritchBlastBeamSequence, true, 2, 2, 2, 2, 1) == Set(SpellDamageRoll)),
        assert(spellAttackSequenceReplayHoles(EldritchBlastBeamSequence, true, 2, 2, 2, 1, 1) == Set()),
        assert(spellAttackSequenceReplayHoles(ScorchingRaySequence, true, 3, 0, 0, 0, 0) == Set(TargetChoice, ObjectTargetChoice)),
        assert(spellAttackSequenceReplayHoles(ScorchingRaySequence, true, 3, 3, 2, 0, 0) == Set(AttackRoll)),
        assert(spellAttackSequenceReplayHoles(ScorchingRaySequence, true, 3, 3, 3, 2, 1) == Set(SpellDamageRoll)),
        assert(spellAttackSequenceReplayHoles(ScorchingRaySequence, true, 3, 3, 3, 1, 1) == Set()),
        assert(spellAttackDamageObjectReplayHoles(StarryWispSpellAttack, true, false, false, false, false) == Set(ObjectTargetChoice)),
        assert(spellAttackDamageObjectReplayHoles(StarryWispSpellAttack, true, true, false, false, false) == Set(AttackRoll)),
        assert(spellAttackDamageObjectReplayHoles(StarryWispSpellAttack, true, true, true, true, false) == Set(SpellDamageRoll)),
        assert(spellAttackDamageObjectReplayHoles(StarryWispSpellAttack, true, true, true, false, false) == Set()),
        assert(rayOfFrostSpeedEffectActive(true, Goblin, Fighter)),
        assert(not(rayOfFrostSpeedEffectActive(true, Fighter, Fighter))),
        assert(spellAttackDamageType(PoisonSpraySpellAttack) == Poison),
        assert(spellAttackDamageType(ChillTouchSpellAttack) == Necrotic),
        assert(spellAttackDamageType(StarryWispSpellAttack) == Radiant),
        assert(spellAttackDamageType(FireBoltSpellAttack) == Fire),
        assert(spellAttackDamageType(ShockingGraspSpellAttack) == Lightning),
        assert(spellAttackDamageType(GuidingBoltSpellAttack) == Radiant),
        assert(spellAttackDamageType(RayOfSicknessSpellAttack) == Poison),
        assert(spellAttackDamageType(SorcerousBurstSpellAttack({ damageTypeChoice: BattleRuntimeSorcerousBurstThunderDamage, spellcastingAbilityModifier: 3, characterLevel: 5 })) == Thunder),
        assert(battleRuntimeSorcerousBurstBaseDamageDice(5) == 2),
        assert(battleRuntimeSorcerousBurstCanRollAdditionalD8(1, 3, 0)),
        assert(not(battleRuntimeSorcerousBurstCanRollAdditionalD8(1, 3, 1))),
        assert(spellAttackDamageActiveEffects(RayOfSicknessSpellAttack) == Set(RayOfSicknessPoisoned)),
        assert(spellAttackDamageSupportsObjectTarget(StarryWispSpellAttack)),
        assert(spellAttackDamageSupportsObjectTarget(ChillTouchSpellAttack)),
        assert(spellAttackDamageSupportsObjectTarget(FireBoltSpellAttack)),
        assert(spellAttackDamageSupportsObjectTarget(ProduceFlameHurlSpellAttack)),
        assert(spellAttackDamageSupportsObjectTarget(SorcerousBurstSpellAttack({ damageTypeChoice: BattleRuntimeSorcerousBurstPsychicDamage, spellcastingAbilityModifier: 3, characterLevel: 5 }))),
        assert(spellAttackSequenceDamageType(EldritchBlastBeamSequence) == Force),
        assert(spellAttackSequenceDamageType(ScorchingRaySequence) == Fire),
        assert(spellObjectDamageOutcome(ProduceFlameHurlSpellAttack, ProduceFlameObjectTarget, 6, ObjectHitPoints({ hitPoints: 5 })) == ObjectHitPointDamage({ object: ProduceFlameObjectTarget, damageType: Fire, rolledDamage: 6, effectiveDamage: 6, priorHitPoints: 5, nextHitPoints: 0, destroyed: true })),
        assert(spellAttackSequenceObjectDamageOutcome(EldritchBlastBeamSequence, EldritchBlastObjectTarget, 6, ObjectHitPoints({ hitPoints: 10 })) == ObjectHitPointDamage({ object: EldritchBlastObjectTarget, damageType: Force, rolledDamage: 6, effectiveDamage: 6, priorHitPoints: 10, nextHitPoints: 4, destroyed: false })),
        assert(spellAttackSequenceObjectDamageOutcome(ScorchingRaySequence, ScorchingRayObjectTarget, 7, ObjectHitPoints({ hitPoints: 10 })) == ObjectHitPointDamage({ object: ScorchingRayObjectTarget, damageType: Fire, rolledDamage: 7, effectiveDamage: 7, priorHitPoints: 10, nextHitPoints: 3, destroyed: false })),
        assert(spellAttackDamageActiveEffects(ShockingGraspSpellAttack) == Set(ShockingGraspOpportunityAttackDenied)),
        assert(spellAttackDamageActiveEffects(GuidingBoltSpellAttack) == Set(GuidingBoltNextAttackAdvantage)),
        assert(resolveRayOfFrostWithDamageRoll({ ...initialState, fighter: { ...initialState.fighter, activeEffects: Set(HuntersMarkDamageRider({ target: Goblin, transfer: AwaitingTargetDrop, durationTicks: 600 })) }, goblin: { ...initialState.goblin, reactionAvailable: false } }, 15, 10, fighterSpellAttackDamageRollWithHuntersMark(4, 6), true).goblin.hp == 0),
      }
    },
    {

        all {
          assert(spellAttackDamageObjectReplayHoles(ChillTouchSpellAttack, true, false, false, false, false) == Set(ObjectTargetChoice)),
          assert(spellAttackDamageObjectReplayHoles(ChillTouchSpellAttack, true, true, false, false, false) == Set(AttackRoll)),
          assert(spellAttackDamageObjectReplayHoles(ChillTouchSpellAttack, true, true, true, true, false) == Set(SpellDamageRoll)),
          assert(spellAttackDamageObjectReplayHoles(ChillTouchSpellAttack, true, true, true, false, false) == Set()),
          assert(spellAttackDamageObjectReplayHoles(FireBoltSpellAttack, true, false, false, false, false) == Set(ObjectTargetChoice)),
          assert(spellAttackDamageObjectReplayHoles(FireBoltSpellAttack, true, true, false, false, false) == Set(AttackRoll)),
          assert(spellAttackDamageObjectReplayHoles(FireBoltSpellAttack, true, true, true, true, false) == Set(SpellDamageRoll)),
          assert(spellAttackDamageObjectReplayHoles(FireBoltSpellAttack, true, true, true, false, false) == Set()),
          assert(spellAttackDamageObjectReplayHoles(ProduceFlameHurlSpellAttack, true, false, false, false, false) == Set(ObjectTargetChoice)),
          assert(spellAttackDamageObjectReplayHoles(ProduceFlameHurlSpellAttack, true, true, false, false, false) == Set(AttackRoll)),
          assert(spellAttackDamageObjectReplayHoles(ProduceFlameHurlSpellAttack, true, true, true, true, false) == Set(SpellDamageRoll)),
          assert(spellAttackDamageObjectReplayHoles(SorcerousBurstSpellAttack({ damageTypeChoice: BattleRuntimeSorcerousBurstThunderDamage, spellcastingAbilityModifier: 3, characterLevel: 5 }), true, false, false, false, false) == Set(ObjectTargetChoice)),
          assert(spellObjectDamageOutcome(StarryWispSpellAttack, StarryWispObjectTarget, 6, ObjectHitPoints({ hitPoints: 5 })) == ObjectHitPointDamage({
            object: StarryWispObjectTarget,
            damageType: Radiant,
            rolledDamage: 6,
            effectiveDamage: 6,
            priorHitPoints: 5,
            nextHitPoints: 0,
            destroyed: true,
          })),
          assert(spellObjectDamageOutcome(ChillTouchSpellAttack, ChillTouchObjectTarget, 6, ObjectHitPoints({ hitPoints: 10 })) == ObjectHitPointDamage({
            object: ChillTouchObjectTarget,
            damageType: Necrotic,
            rolledDamage: 6,
            effectiveDamage: 6,
            priorHitPoints: 10,
            nextHitPoints: 4,
            destroyed: false,
          })),
          assert(spellObjectDamageOutcome(SorcerousBurstSpellAttack({ damageTypeChoice: BattleRuntimeSorcerousBurstPsychicDamage, spellcastingAbilityModifier: 3, characterLevel: 5 }), FireBoltObjectTarget, 9, ObjectHitPoints({ hitPoints: 8 })) == ObjectHitPointDamage({
            object: FireBoltObjectTarget,
            damageType: Psychic,
            rolledDamage: 9,
            effectiveDamage: 0,
            priorHitPoints: 8,
            nextHitPoints: 8,
            destroyed: false,
          })),
          assert(spellObjectDamageOutcome(StarryWispSpellAttack, StarryWispObjectTarget, 6, ObjectHitPointsWithDamageThreshold({ hitPoints: 10, damageThreshold: 10 })) == ObjectHitPointDamage({
            object: StarryWispObjectTarget,
            damageType: Radiant,
            rolledDamage: 6,
            effectiveDamage: 0,
            priorHitPoints: 10,
            nextHitPoints: 10,
            destroyed: false,
          })),
          assert(spellObjectDamageOutcome(FireBoltSpellAttack, FireBoltObjectTarget, 9, ObjectHitPoints({ hitPoints: 8 })) == ObjectHitPointDamage({
            object: FireBoltObjectTarget,
            damageType: Fire,
            rolledDamage: 9,
            effectiveDamage: 9,
            priorHitPoints: 8,
            nextHitPoints: 0,
            destroyed: true,
          })),
          assert(spellObjectIgnitionOutcomes(FireBoltSpellAttack, FireBoltObjectTarget, Fighter, ObjectFlammableUnattended) == Set(ObjectStartsBurning({
            object: FireBoltObjectTarget,
            source: Fighter,
            sourceSpell: FireBolt,
          }))),
          assert(spellObjectIgnitionOutcomes(FireBoltSpellAttack, FireBoltObjectTarget, Fighter, ObjectWornOrCarried) == Set()),
          assert(spellObjectIgnitionOutcomes(StarryWispSpellAttack, StarryWispObjectTarget, Fighter, ObjectFlammableUnattended) == Set()),
        }
      },
  }
}
