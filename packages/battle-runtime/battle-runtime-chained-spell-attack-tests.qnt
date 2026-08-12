// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-chained-attack-damage

module battleRuntimeChainedSpellAttackTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeChainedSpellAttack.* from "./battle-runtime-chained-spell-attack"

  run test_chromatic_orb_chained_replay_facts = {
    val noDuplicateFaces = {
      face1: 1,
      face2: 1,
      face3: 1,
      face4: 0,
      face5: 0,
      face6: 0,
      face7: 0,
      face8: 0,
    }
    val duplicateFaces = {
      face1: 2,
      face2: 0,
      face3: 1,
      face4: 0,
      face5: 0,
      face6: 0,
      face7: 0,
      face8: 0,
    }
    val criticalDuplicateFaces = {
      face1: 2,
      face2: 1,
      face3: 1,
      face4: 1,
      face5: 1,
      face6: 0,
      face7: 0,
      face8: 0,
    }
    val level3DuplicateFaces = {
      face1: 2,
      face2: 1,
      face3: 1,
      face4: 1,
      face5: 0,
      face6: 0,
      face7: 0,
      face8: 0,
    }
    val negativeFaceCount = {
      face1: -1,
      face2: 2,
      face3: 2,
      face4: 0,
      face5: 0,
      face6: 0,
      face7: 0,
      face8: 0,
    }

    all {
      assert(d8FaceCountsMatchRolledDice(ChromaticOrbChainedSpellAttack, 1, false, noDuplicateFaces)),
      assert(d8FaceCountsMatchRolledDice(ChromaticOrbChainedSpellAttack, 1, true, criticalDuplicateFaces)),
      assert(not(d8FaceCountsMatchRolledDice(ChromaticOrbChainedSpellAttack, 0, false, noDuplicateFaces))),
      assert(not(d8FaceCountsMatchRolledDice(ChromaticOrbChainedSpellAttack, 1, false, negativeFaceCount))),
      assert(not(damageRollHasDuplicateD8Face(noDuplicateFaces))),
      assert(damageRollHasDuplicateD8Face(duplicateFaces)),
      assert(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 1, 0, false, duplicateFaces)),
      assert(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 1, 0, true, criticalDuplicateFaces)),
      assert(not(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 1, 1, false, duplicateFaces))),
      assert(not(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 1, -1, false, duplicateFaces))),
      assert(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 3, 2, false, level3DuplicateFaces)),
      assert(not(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 3, 2, false, duplicateFaces))),
      assert(not(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 3, 3, false, level3DuplicateFaces))),
      assert(not(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 3, 0, false, noDuplicateFaces))),
      assert(not(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 3, 0, false, negativeFaceCount))),
      assert(chromaticOrbDamageTypeChoice(ChromaticOrbAcid) == Acid),
      assert(chromaticOrbDamageTypeChoice(ChromaticOrbCold) == Cold),
      assert(chromaticOrbDamageTypeChoice(ChromaticOrbFire) == Fire),
      assert(chromaticOrbDamageTypeChoice(ChromaticOrbLightning) == Lightning),
      assert(chromaticOrbDamageTypeChoice(ChromaticOrbPoison) == Poison),
      assert(chromaticOrbDamageTypeChoice(ChromaticOrbThunder) == Thunder),
      assert(chainedSpellAttackDamageStepDamageType(ChromaticOrbChainedSpellAttack, ChromaticOrbFire, 0) == Fire),
      assert(chainedSpellAttackDamageStepDamageType(ChromaticOrbChainedSpellAttack, ChromaticOrbFire, 2) == Fire),
    }
  }

  run test_chromatic_orb_chained_replay_holes_are_ordered = {
    all {
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsDamageType) == Set(ChainedSpellDamageTypeChoice)),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsInitialTarget({ slotLevel: 1, selectedDamageType: ChromaticOrbLightning })) == Set(ChainedStepTargetChoice({ stepIndex: 0 }))),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsInitialTarget({ slotLevel: 0, selectedDamageType: ChromaticOrbLightning })) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsAttackRoll({
        slotLevel: 1,
        selectedDamageType: ChromaticOrbLightning,
        stepIndex: 0,
        target: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 0,
      })) == Set(ChainedStepAttackRoll({ stepIndex: 0 }))),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsAttackRoll({
        slotLevel: 1,
        selectedDamageType: ChromaticOrbLightning,
        stepIndex: 1,
        target: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 0,
      })) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsAttackRoll({
        slotLevel: 1,
        selectedDamageType: ChromaticOrbLightning,
        stepIndex: 0,
        target: Fighter,
        targeted: Set(Goblin),
        leapsUsed: 0,
      })) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsDamageRoll({
        slotLevel: 1,
        selectedDamageType: ChromaticOrbLightning,
        stepIndex: 0,
        target: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 0,
        criticalHit: false,
      })) == Set(ChainedStepDamageRoll({ stepIndex: 0 }))),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsDamageRoll({
        slotLevel: 1,
        selectedDamageType: ChromaticOrbLightning,
        stepIndex: 0,
        target: Goblin,
        targeted: Set(Goblin),
        leapsUsed: -1,
        criticalHit: false,
      })) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsDamageRoll({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbLightning,
        stepIndex: 1,
        target: Goblin,
        targeted: Set(),
        leapsUsed: 1,
        criticalHit: false,
      })) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsLeapTarget({
        slotLevel: 1,
        selectedDamageType: ChromaticOrbLightning,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 0,
      })) == Set(ChainedStepTargetChoice({ stepIndex: 1 }))),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsLeapTarget({
        slotLevel: 1,
        selectedDamageType: ChromaticOrbLightning,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 1,
      })) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsLeapTarget({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbLightning,
        previousTarget: Fighter,
        targeted: Set(Goblin),
        leapsUsed: 0,
      })) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsLeapTarget({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbLightning,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 1,
      })) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedComplete) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, false, ChainedNeedsDamageType) == Set()),
    }
  }

  run test_chromatic_orb_leap_target_invariants = {
    all {
      assert(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsInitialTarget({ slotLevel: 1, selectedDamageType: ChromaticOrbAcid }), Goblin, false)),
      assert(not(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsInitialTarget({ slotLevel: 0, selectedDamageType: ChromaticOrbAcid }), Goblin, false))),
      assert(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsLeapTarget({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbAcid,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 0,
      }), Fighter, true)),
      assert(not(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsLeapTarget({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbAcid,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 0,
      }), Goblin, true))),
      assert(not(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsLeapTarget({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbAcid,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 0,
      }), Fighter, false))),
      assert(not(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsLeapTarget({
        slotLevel: 1,
        selectedDamageType: ChromaticOrbAcid,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 1,
      }), Fighter, true))),
      assert(not(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsLeapTarget({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbAcid,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: -1,
      }), Fighter, true))),
      assert(not(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsLeapTarget({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbAcid,
        previousTarget: Fighter,
        targeted: Set(Goblin),
        leapsUsed: 0,
      }), Fighter, true))),
      assert(not(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsLeapTarget({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbAcid,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 1,
      }), Fighter, true))),
    }
  }

}
