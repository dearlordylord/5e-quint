// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.hide-action-obscurement-permission

module unitFeatureHideObscurementPermissionCoreExamples {
  import creatureSizeOrder.* from "./creature-size-order"
  import unitFeatureHideObscurementPermissionCore.* from "./unit-feature-hide-obscurement-permission-core"

  run test_selected_permission_admits_hide_when_only_obscured_by_larger_creature = {
    val facts = {
      hiderSize: SmallSize,
      obscuringCreatureSize: MediumSize,
      obscuredOnlyByCreature: true,
      outOfEnemyLineOfSight: true,
      permission: ObscuredOnlyByLargerCreatureHidePermission,
    }
    all {
      assert(hideActionObscurementPermissionAdmitted(facts)),
    }
  }

  run test_permission_does_not_apply_without_larger_obscuring_creature = {
    val sameSize = {
      hiderSize: SmallSize,
      obscuringCreatureSize: SmallSize,
      obscuredOnlyByCreature: true,
      outOfEnemyLineOfSight: true,
      permission: ObscuredOnlyByLargerCreatureHidePermission,
    }
    val smaller = {
      hiderSize: MediumSize,
      obscuringCreatureSize: SmallSize,
      obscuredOnlyByCreature: true,
      outOfEnemyLineOfSight: true,
      permission: ObscuredOnlyByLargerCreatureHidePermission,
    }
    all {
      assert(not(hideActionObscurementPermissionAdmitted(sameSize))),
      assert(not(hideActionObscurementPermissionAdmitted(smaller))),
    }
  }

  run test_permission_does_not_replace_line_of_sight_or_selected_profile = {
    val noPermission = {
      hiderSize: SmallSize,
      obscuringCreatureSize: MediumSize,
      obscuredOnlyByCreature: true,
      outOfEnemyLineOfSight: true,
      permission: NoHideObscurementPermission,
    }
    val inLineOfSight = {
      hiderSize: SmallSize,
      obscuringCreatureSize: MediumSize,
      obscuredOnlyByCreature: true,
      outOfEnemyLineOfSight: false,
      permission: ObscuredOnlyByLargerCreatureHidePermission,
    }
    all {
      assert(not(hideActionObscurementPermissionAdmitted(noPermission))),
      assert(not(hideActionObscurementPermissionAdmitted(inLineOfSight))),
    }
  }
}
