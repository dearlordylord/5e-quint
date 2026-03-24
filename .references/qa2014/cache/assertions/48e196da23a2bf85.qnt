// Source: https://rpg.stackexchange.com/q/127373
module _qa_48e196da23a2bf85 {
  import dnd.* from "./dnd"

  // Does UA Mystic's Tough Hide (+2 AC) stack with UA Warforged's Composite Plating (+1 AC)?
  run qa_tough_hide_stacks_with_composite_plating = {
    val dexMod = abilityModifier(12) // DEX 12 → +1
    val baseAC = calculateAC(Unarmored, dexMod, false, NoUnarmoredDefense, 0, 0)
    val compositePlating = 1 // Warforged racial trait: +1 AC
    val toughHide = 2        // Mystic Bestial Transformation / Tough Hide: +2 AC
    // RAW accepted ruling: flat AC bonuses from distinct sources add together
    val stackedAC = baseAC + compositePlating + toughHide
    // Rejected alternative: larger bonus replaces smaller (only one applies)
    val replacedAC = baseAC + intMax(compositePlating, toughHide)
    assert(stackedAC == baseAC + 3 and stackedAC > replacedAC)
  }
}
