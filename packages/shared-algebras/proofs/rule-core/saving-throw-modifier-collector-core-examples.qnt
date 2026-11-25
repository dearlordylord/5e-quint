// -*- mode: Bluespec; -*-

module savingThrowModifierCollectorCoreExamples {
  import d20TestCircumstanceCore.* from "./d20-test-circumstance-core"
  import savingThrowModifierCollectorCore.* from "./saving-throw-modifier-collector-core"

  pure val plainDexteritySave: SavingThrowCircumstances = {
    ability: DexteritySave,
    dodgeBenefit: false,
    restrained: false,
    failsStrengthAndDexteritySaves: false,
    otherAdvantageSources: 0,
    otherDisadvantageSources: 0,
    bonuses: [],
  }

  pure def rolledWith(mode: D20TestRollMode, bonus: int): SavingThrowRequirement =
    RolledSave({ mode: mode, bonus: bonus })

  run restrainedHasDisadvantageOnlyOnDexterity = all {
    val restrained = { ...plainDexteritySave, restrained: true }
    all {
      assert(savingThrowRequirement(restrained) == rolledWith(DisadvantageD20TestRoll, 0)),
      assert(savingThrowRequirement({ ...restrained, ability: StrengthSave }) == rolledWith(NormalD20TestRoll, 0)),
    }
  }

  run dodgeGivesAdvantageOnlyOnDexterity = all {
    val dodging = { ...plainDexteritySave, dodgeBenefit: true }
    all {
      assert(savingThrowRequirement(dodging) == rolledWith(AdvantageD20TestRoll, 0)),
      assert(savingThrowRequirement({ ...dodging, ability: WisdomSave }) == rolledWith(NormalD20TestRoll, 0)),
    }
  }

  run oneSourceOfEachCancels = all {
    val restrainedWithHaste = { ...plainDexteritySave, restrained: true, otherAdvantageSources: 2 }
    assert(savingThrowRequirement(restrainedWithHaste) == rolledWith(NormalD20TestRoll, 0))
  }

  run bonusesAdd = all {
    val slowedInHalfCover = { ...plainDexteritySave, bonuses: [-2, 2, 1] }
    assert(savingThrowRequirement(slowedInHalfCover) == rolledWith(NormalD20TestRoll, 1))
  }

  run paralysisFailsStrengthAndDexteritySaves = all {
    val paralyzed = { ...plainDexteritySave, failsStrengthAndDexteritySaves: true, otherAdvantageSources: 1 }
    all {
      assert(savingThrowRequirement(paralyzed) == AutomaticallyFailedSave),
      assert(savingThrowRequirement({ ...paralyzed, ability: StrengthSave }) == AutomaticallyFailedSave),
      assert(savingThrowRequirement({ ...paralyzed, ability: ConstitutionSave }) == rolledWith(AdvantageD20TestRoll, 0)),
    }
  }

  run grappleTargetChoosesBetweenStrengthAndDexterity = all {
    val restrained = { ...plainDexteritySave, restrained: true }
    val paralyzed = { ...plainDexteritySave, failsStrengthAndDexteritySaves: true }
    all {
      assert(strengthOrDexterityChoices(restrained) == [
        rolledWith(NormalD20TestRoll, 0),
        rolledWith(DisadvantageD20TestRoll, 0),
      ]),
      assert(strengthOrDexteritySaveCanSucceed(restrained)),
      assert(not(strengthOrDexteritySaveCanSucceed(paralyzed))),
    }
  }
}
