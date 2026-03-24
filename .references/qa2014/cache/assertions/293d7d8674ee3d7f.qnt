// Source: https://rpg.stackexchange.com/q/106774
module _qa_293d7d8674ee3d7f {
  import dnd.* from "./dnd"

  // Does Darkvision grant normal Vision — darkvision useless to a blind character; darkness→dim light, blind can't see dim light
  run qa_darkvision_useless_when_blind = {
    // Darkvision converts Dark to LightlyObscured (not HeavilyObscured)
    val darkWithDarkvision    = pEffectiveObscurement(Dark, true)
    val darkWithoutDarkvision = pEffectiveObscurement(Dark, false)
  
    // A blinded creature with darkvision in darkness:
    // obscurement-based blindness is gone (only LightlyObscured),
    // but the Blinded condition still auto-fails every sight-requiring check.
    val blindedCreature = freshCreature(20).with("blinded", true)
    val checkMods = pCheckModifiers(blindedCreature, true, false, false)
  
    assert(and {
      // Darkvision does convert darkness to dim-light equivalent
      darkWithDarkvision == LightlyObscured,
      darkWithoutDarkvision == HeavilyObscured,
      // That dim-light equivalent is NOT enough to un-blind by obscurement alone
      not(pBlindedByObscurement(darkWithDarkvision)),
      // But the Blinded condition independently auto-fails sight-based checks —
      // darkvision cannot remove the Blinded condition, so it provides no benefit
      checkMods.autoFail == true,
    })
  }
}
