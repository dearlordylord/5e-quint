// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.magic-action-area-save-damage-healing

module unitFeatureLandsAidCoreExamples {
  import unitFeatureLandsAidCore.* from "./unit-feature-lands-aid-core"

  run test_lands_aid_projects_area_save_damage_healing_scaling = {
    all {
      assert(landsAidPointRangeFeet == 60),
      assert(landsAidSphereRadiusFeet == 10),
      assert(landsAidDamageDieSize == 6),
      assert(landsAidDice(3) == 2),
      assert(landsAidDice(10) == 3),
      assert(landsAidDice(14) == 4),
      assert(landsAidSuccessfulSaveDamage(9) == 4),
    }
  }
}
