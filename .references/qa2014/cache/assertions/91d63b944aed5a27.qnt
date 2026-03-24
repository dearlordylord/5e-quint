// Source: https://rpg.stackexchange.com/q/60551
module _qa_91d63b944aed5a27 {
  import dnd.* from "./dnd"

  // How does concentration interact with spells cast via the Wild Magic Surge table?
  // Accepted answer (PHB errata): wild magic surge spells don't require concentration; existing concentration is preserved.
  run qa_wild_magic_surge_preserves_concentration = {
    // Caster is concentrating on "bless" (normal concentration spell)
    val ss0 = FRESH_SPELL_SLOTS.with("concentrationSpellId", "bless")
    // Wild Magic Surge fires "fog_cloud" — per errata it requires NO concentration,
    // so pStartConcentration is NOT called; "bless" must remain active.
    val ss_wild = ss0
    // Contrast: casting fog_cloud normally (voluntarily) WOULD replace "bless"
    val ss_normal = pStartConcentration(ss0, "fog_cloud")
    assert(
      // Wild magic path: original concentration untouched
      ss_wild.concentrationSpellId == "bless"
      // Normal cast path: new spell replaces old
      and ss_normal.concentrationSpellId == "fog_cloud"
      // The two paths diverge — wild magic does NOT break existing concentration
      and ss_wild.concentrationSpellId != ss_normal.concentrationSpellId
    )
  }
  
  // Corollary: a wild magic surge spell also cannot itself be dropped early
  // (no concentration handle exists), so isConcentrating stays unchanged by the surge.
  run qa_wild_magic_surge_no_new_concentration_entry = {
    val ss_empty = FRESH_SPELL_SLOTS
    // Wild magic fires fog_cloud — no pStartConcentration call
    val ss_after = ss_empty
    assert(not(isConcentrating(ss_after)))
  }
}
