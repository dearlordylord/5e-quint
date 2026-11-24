// -*- mode: Bluespec; -*-

module coverDefenseCoreExamples {
  import coverDefenseCore.* from "./cover-defense-core"

  run coverTargetingExamples = all {
    assert(coverAllowsDirectTargeting(NoCover)),
    assert(coverAllowsDirectTargeting(HalfCover)),
    assert(coverAllowsDirectTargeting(ThreeQuartersCover)),
    assert(not(coverAllowsDirectTargeting(TotalCover))),
  }

  run coverArmorClassExamples = all {
    assert(armorClassBehindCover(15, NoCover) == 15),
    assert(armorClassBehindCover(15, HalfCover) == 17),
    assert(armorClassBehindCover(15, ThreeQuartersCover) == 20),
  }
}
