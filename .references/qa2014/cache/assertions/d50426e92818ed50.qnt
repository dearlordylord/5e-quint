// Source: https://rpg.stackexchange.com/q/206914
module _qa_d50426e92818ed50 {
  import dnd.* from "./dnd"

  // Can mundane light penetrate magical darkness to illuminate regions outside the dark space?
  run qa_magical_darkness_is_heavily_obscured = {
    // Darkness spell creates Dark illumination; Dark -> HeavilyObscured blocks vision entirely (PHB p.183)
    assert(pIlluminationObscurement(Dark) == HeavilyObscured)
  }
  
  // Mundane light (torch) outside darkness is unobscured; inside the darkness boundary it becomes Dark regardless
  run qa_mundane_light_does_not_penetrate_darkness = {
    // Torch in normal air: Bright -> Unobscured (illuminates normally)
    // Same torch entering magical darkness: area is Dark -> HeavilyObscured (light cannot penetrate through)
    assert(
      pIlluminationObscurement(Bright) == Unobscured and
      pIlluminationObscurement(Dark)   == HeavilyObscured
    )
  }
  
  // A creature standing inside magical darkness is effectively blinded by the heavily obscured area
  run qa_darkness_blinds_creatures_inside = {
    // HeavilyObscured blocks vision entirely; pBlindedByObscurement returns true for it
    assert(pBlindedByObscurement(pIlluminationObscurement(Dark)) == true)
  }
  
  // Darkvision does not fully overcome magical darkness (still lightly obscured, not unobscured)
  run qa_darkvision_still_impaired_in_magical_darkness = {
    // Without darkvision: Dark -> HeavilyObscured (blinded)
    // With darkvision: Dark -> LightlyObscured (still perceives disadvantage, not full vision)
    // Either way, light from inside does not illuminate outside the darkness boundary
    assert(
      pEffectiveObscurement(Dark, false) == HeavilyObscured and
      pEffectiveObscurement(Dark, true)  == LightlyObscured
    )
  }
}
