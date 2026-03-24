// Source: https://rpg.stackexchange.com/q/126040
module _qa_7c57e477cd0165da {
  import dnd.* from "./dnd"

  // Can a warlock with Devil's Sight see through Fog Cloud?
  run qa_devils_sight_fog_cloud = {
    // Devil's Sight is modeled as darkvision: pEffectiveObscurement(Dark, true).
    // Fog Cloud is HeavilyObscured independent of light level — it is fog, not darkness.
    // pEffectiveObscurement only reduces darkness-based obscurement; fog is not darkness.
    val devilsSightInDarkness = pEffectiveObscurement(Dark, true)
    // Fog Cloud imposes HeavilyObscured regardless of underlying light or darkvision.
    // Even in a Bright-lit room, Fog Cloud = HeavilyObscured; darkvision does not apply.
    val devilsSightInBrightFog = pEffectiveObscurement(Bright, true)
    val fogCloudObscurement = HeavilyObscured
    assert(
      // Devil's Sight (darkvision) works in darkness → LightlyObscured → NOT blinded
      not(pBlindedByObscurement(devilsSightInDarkness))
      // Fog Cloud (HeavilyObscured, not derived from darkness) still blinds the warlock
      and pBlindedByObscurement(fogCloudObscurement)
      // Darkvision on a bright-lit foggy area also gives no additional benefit — already Unobscured by light,
      // but the fog's HeavilyObscured is orthogonal and persists
      and not(pBlindedByObscurement(devilsSightInBrightFog))
      and fogCloudObscurement == HeavilyObscured
    )
  }
}
