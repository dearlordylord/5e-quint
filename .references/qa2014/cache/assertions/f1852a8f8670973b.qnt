// Source: https://rpg.stackexchange.com/q/139766
module _qa_f1852a8f8670973b {
  import dnd.* from "./dnd"

  // Can I cast guidance immediately before a check and keep Hex active?
  run qa_casting_concentration_spell_breaks_previous_concentration = {
    // Start concentrating on Hex
    val ssWithHex = FRESH_SPELL_SLOTS.with("concentrationSpellId", "hex")
    // Cast Guidance (also requires concentration) — PHB: you lose concentration on
    // the previous spell immediately; no time limit or "instantaneous" exception applies
    val ssAfterGuidance = pStartConcentration(ssWithHex, "guidance")
    assert(
      // Guidance is now the active concentration spell
      ssAfterGuidance.concentrationSpellId == "guidance"
      // Hex is gone — you cannot maintain both
      and ssAfterGuidance.concentrationSpellId != "hex"
      // Still concentrating (on Guidance), just not on Hex
      and isConcentrating(ssAfterGuidance)
    )
  }
}
