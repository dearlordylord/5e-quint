// Source: https://rpg.stackexchange.com/q/168378
module _qa_154edebafb049760 {
  import dnd.* from "./dnd"

  // Can a Minor Illusion block light?
  // Minor Illusion is purely visual with no physical properties; light passes through unimpeded.
  // A creature "behind" an illusory object in Bright light remains fully Unobscured — no blinding effect.
  run qa_minor_illusion_cannot_block_light = {
    // The illusion changes nothing about the ambient illumination.
    // Bright light (e.g. sun blade, torch) reaches the creature exactly as if the illusion weren't there.
    val lightAfterIllusion = Bright // Minor Illusion cannot reduce or block a light source
    val obs = pEffectiveObscurement(lightAfterIllusion, false)
    assert(
      obs == Unobscured
      and not(pBlindedByObscurement(obs))
      and not(pPerceptionDisadvantage(obs))
    )
  }
}
