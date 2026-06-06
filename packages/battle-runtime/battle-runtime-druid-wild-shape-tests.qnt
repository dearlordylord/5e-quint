// -*- mode: Bluespec; -*-

module battleRuntimeDruidWildShapeTests {
  import battleRuntimeDruidWildShape.* from "./battle-runtime-druid-wild-shape"
  import battleRuntimeShapeShifting.* from "./battle-runtime-shape-shifting"

  run test_druid_wild_shape_assume_form_projects_beast_combat_facts = {
    val state = assumeForm(initialProjection, largeFastFormFacts)
    all {
      assert(state.bonusActionAvailable == false),
      assert(state.usesRemaining == 1),
      assert(state.tempHp == 2),
      assert(druidWildShapeIsShapeShifted(state.activeForm)),
      assert(projectedArmorClass(state) == 11),
      assert(projectedSize(state) == "large"),
      assert(projectedSpeedFeet(state) == 60),
      assert(projectedShoveSaveDc(state) == 13),
      assert(canCastSpells(state) == false),
    }
  }

  run test_druid_wild_shape_worn_equipment_projects_effective_loadout = {
    val state = assumeFormWithEquipment(initialProjection, largeFastFormFacts, wornShieldEquipmentDisposition)
    all {
      assert(projectedArmorClass(state) == 13),
      assert(projectedSize(state) == "large"),
      assert(canCastSpells(state) == false),
    }
  }

  run test_druid_wild_shape_worn_armor_projects_effective_loadout = {
    val state = assumeFormWithEquipment(initialProjection, largeFastFormFacts, wornArmorEquipmentDisposition)
    all {
      assert(projectedArmorClass(state) == 16),
      assert(projectedSize(state) == "large"),
      assert(canCastSpells(state) == false),
    }
  }

  run test_druid_wild_shape_worn_weapon_requires_form_object_handling = {
    val canHandle = assumeFormWithEquipmentAndObjectHandling(
      initialProjection,
      largeFastFormFacts,
      wornMainWeaponEquipmentDisposition,
      true,
    )
    val cannotHandle = assumeFormWithEquipmentAndObjectHandling(
      initialProjection,
      largeFastFormFacts,
      wornMainWeaponEquipmentDisposition,
      false,
    )
    all {
      assert(canUseWornMainWeapon(canHandle) == true),
      assert(canUseWornMainWeapon(cannotHandle) == false),
      assert(canHandle.equipmentDisposition.wornMainWeapon == true),
      assert(cannotHandle.equipmentDisposition.wornMainWeapon == true),
    }
  }

  run test_druid_wild_shape_fallen_equipment_projects_object_boundary = {
    val result = assumeFormWithEquipmentResult(initialProjection, largeFastFormFacts, fallenShieldEquipmentDisposition)
    all {
      assert(result.droppedEquipmentCount == 1),
      assert(result.projection.equipmentDisposition == allMergedEquipmentDisposition),
      assert(projectedArmorClass(result.projection) == 11),
      assert(projectedSize(result.projection) == "large"),
      assert(canCastSpells(result.projection) == false),
    }
  }

  run test_druid_wild_shape_projects_d20_statistics = {
    val state = assumeForm(initialProjection, mediumSwiftFormFacts)
    all {
      assert(projectedStrengthModifier(state) == 2),
      assert(projectedDexterityModifier(state) == 2),
      assert(projectedConstitutionModifier(state) == 1),
      assert(projectedIntelligenceModifier(state) == 3),
      assert(projectedWisdomModifier(state) == 2),
      assert(projectedCharismaModifier(state) == 1),
      assert(projectedNatureModifier(state) == 5),
      assert(projectedStealthModifier(state) == 4),
      assert(projectedPerceptionModifier(state) == 5),
      assert(projectedDexteritySavingThrowModifier(state) == 6),
      assert(projectedWisdomSavingThrowModifier(state) == 4),
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
      assert(result.activeForm == DruidWildShapeTrueForm),
    }
  }

  run test_druid_wild_shape_dismiss_and_revert_restore_true_form_projection = {
    val active = assumeForm(initialProjection, largeFastFormFacts)
    val dismissed = dismissForm({ ...active, bonusActionAvailable: true })
    val reverted = revertForm({ ...active, bonusActionAvailable: true })
    all {
      assert(dismissed.activeForm == DruidWildShapeTrueForm),
      assert(dismissed.usesRemaining == 1),
      assert(projectedSize(dismissed) == "medium"),
      assert(projectedSpeedFeet(dismissed) == 30),
      assert(dismissed.equipmentDisposition == allMergedEquipmentDisposition),
      assert(reverted.activeForm == DruidWildShapeTrueForm),
      assert(projectedSize(reverted) == "medium"),
      assert(projectedSpeedFeet(reverted) == 30),
      assert(reverted.equipmentDisposition == allMergedEquipmentDisposition),
    }
  }

  run test_druid_wild_shape_rejects_unavailable_dismiss = {
    val noForm = dismissForm(initialProjection)
    val active = assumeForm(initialProjection, largeFastFormFacts)
    val noBonusAction = dismissForm(active)
    all {
      assert(noForm.activeForm == DruidWildShapeTrueForm),
      assert(noForm.bonusActionAvailable == true),
      assert(noBonusAction.activeForm == active.activeForm),
      assert(noBonusAction.bonusActionAvailable == false),
    }
  }
}
