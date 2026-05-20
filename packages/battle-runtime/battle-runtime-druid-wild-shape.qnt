// -*- mode: Bluespec; -*-

module battleRuntimeDruidWildShape {
  type DruidWildShapeFormFacts = {
    armorClass: int,
    creatureSize: str,
    speedFeet: int,
    strengthModifier: int,
  }
  type DruidWildShapeFormState = NoDruidWildShape | ActiveDruidWildShape({ form: DruidWildShapeFormFacts })
  type DruidWildShapeProjection = {
    bonusActionAvailable: bool,
    usesRemaining: int,
    activeForm: DruidWildShapeFormState,
    tempHp: int,
  }

  pure def initialProjection: DruidWildShapeProjection = {
    bonusActionAvailable: true,
    usesRemaining: 2,
    activeForm: NoDruidWildShape,
    tempHp: 0,
  }

  pure def proficiencyBonus: int = 2

  pure def largeFastFormFacts: DruidWildShapeFormFacts = {
    armorClass: 11,
    creatureSize: "large",
    speedFeet: 60,
    strengthModifier: 3,
  }

  pure def mediumSwiftFormFacts: DruidWildShapeFormFacts = {
    armorClass: 12,
    creatureSize: "medium",
    speedFeet: 40,
    strengthModifier: 2,
  }

  pure def projectedArmorClass(state: DruidWildShapeProjection): int =
    match state.activeForm {
      | NoDruidWildShape => 16
      | ActiveDruidWildShape(data) => data.form.armorClass
    }

  pure def projectedSize(state: DruidWildShapeProjection): str =
    match state.activeForm {
      | NoDruidWildShape => "medium"
      | ActiveDruidWildShape(data) => data.form.creatureSize
    }

  pure def projectedSpeedFeet(state: DruidWildShapeProjection): int =
    match state.activeForm {
      | NoDruidWildShape => 30
      | ActiveDruidWildShape(data) => data.form.speedFeet
    }

  pure def canCastSpells(state: DruidWildShapeProjection): bool =
    match state.activeForm {
      | NoDruidWildShape => true
      | ActiveDruidWildShape(_) => false
    }

  pure def projectedShoveSaveDc(state: DruidWildShapeProjection): int =
    match state.activeForm {
      | NoDruidWildShape => 13
      | ActiveDruidWildShape(data) => 8 + data.form.strengthModifier + proficiencyBonus
    }

  pure def canAssumeForm(state: DruidWildShapeProjection): bool =
    state.bonusActionAvailable and state.usesRemaining > 0

  pure def canDismissForm(state: DruidWildShapeProjection): bool =
    state.bonusActionAvailable and match state.activeForm {
      | NoDruidWildShape => false
      | ActiveDruidWildShape(_) => true
    }

  pure def assumeForm(
    state: DruidWildShapeProjection,
    form: DruidWildShapeFormFacts,
  ): DruidWildShapeProjection =
    if (canAssumeForm(state)) {
      bonusActionAvailable: false,
      usesRemaining: state.usesRemaining - 1,
      activeForm: ActiveDruidWildShape({ form: form }),
      tempHp: if (state.tempHp > 2) state.tempHp else 2,
    } else state

  pure def dismissForm(state: DruidWildShapeProjection): DruidWildShapeProjection =
    if (canDismissForm(state)) {
      bonusActionAvailable: false,
      usesRemaining: state.usesRemaining,
      activeForm: NoDruidWildShape,
      tempHp: state.tempHp,
    } else state

  pure def revertForm(state: DruidWildShapeProjection): DruidWildShapeProjection = {
    bonusActionAvailable: state.bonusActionAvailable,
    usesRemaining: state.usesRemaining,
    activeForm: NoDruidWildShape,
    tempHp: state.tempHp,
  }

  run test_druid_wild_shape_assume_form_projects_beast_combat_facts = {
    val state = assumeForm(initialProjection, largeFastFormFacts)
    all {
      assert(state.bonusActionAvailable == false),
      assert(state.usesRemaining == 1),
      assert(state.tempHp == 2),
      assert(projectedArmorClass(state) == 11),
      assert(projectedSize(state) == "large"),
      assert(projectedSpeedFeet(state) == 60),
      assert(projectedShoveSaveDc(state) == 13),
      assert(canCastSpells(state) == false),
    }
  }

  run test_druid_wild_shape_reuse_replaces_active_form_and_spends_use = {
    val first = assumeForm(initialProjection, largeFastFormFacts)
    val second = assumeForm({ ...first, bonusActionAvailable: true }, mediumSwiftFormFacts)
    all {
      assert(second.usesRemaining == 0),
      assert(projectedArmorClass(second) == 12),
      assert(projectedSpeedFeet(second) == 40),
      assert(projectedShoveSaveDc(second) == 12),
    }
  }

  run test_druid_wild_shape_rejects_unavailable_assume_form = {
    val unavailable = { ...initialProjection, bonusActionAvailable: false, usesRemaining: 0 }
    val result = assumeForm(unavailable, largeFastFormFacts)
    all {
      assert(result.usesRemaining == 0),
      assert(result.activeForm == NoDruidWildShape),
    }
  }

  run test_druid_wild_shape_dismiss_and_revert_restore_true_form_projection = {
    val active = assumeForm(initialProjection, largeFastFormFacts)
    val dismissed = dismissForm({ ...active, bonusActionAvailable: true })
    val reverted = revertForm({ ...active, bonusActionAvailable: true })
    all {
      assert(dismissed.activeForm == NoDruidWildShape),
      assert(dismissed.usesRemaining == 1),
      assert(projectedSize(dismissed) == "medium"),
      assert(projectedSpeedFeet(dismissed) == 30),
      assert(reverted.activeForm == NoDruidWildShape),
      assert(projectedSize(reverted) == "medium"),
      assert(projectedSpeedFeet(reverted) == 30),
    }
  }

  run test_druid_wild_shape_rejects_unavailable_dismiss = {
    val noForm = dismissForm(initialProjection)
    val active = assumeForm(initialProjection, largeFastFormFacts)
    val noBonusAction = dismissForm(active)
    all {
      assert(noForm.activeForm == NoDruidWildShape),
      assert(noForm.bonusActionAvailable == true),
      assert(noBonusAction.activeForm == active.activeForm),
      assert(noBonusAction.bonusActionAvailable == false),
    }
  }
}
