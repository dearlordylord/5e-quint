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

  run coverSavingThrowExamples = all {
    assert(coverSavingThrowBonus(DexteritySave, false, NoCover) == 0),
    assert(coverSavingThrowBonus(DexteritySave, false, HalfCover) == 2),
    assert(coverSavingThrowBonus(DexteritySave, false, ThreeQuartersCover) == 5),
    assert(coverSavingThrowBonus(ConstitutionSave, false, HalfCover) == 0),
    assert(coverSavingThrowBonus(WisdomSave, false, ThreeQuartersCover) == 0),
    assert(coverSavingThrowBonus(DexteritySave, true, HalfCover) == 0),
    assert(coverSavingThrowBonus(DexteritySave, true, ThreeQuartersCover) == 0),
  }
}
