// Source: https://rpg.stackexchange.com/q/55090
module _qa_250ab507b62a26aa {
  import dnd.* from "./dnd"

  // While using Wild Shape, do I use Unarmored Defense or the creature's Armor Class?
  run qa_wild_shape_monk_ud_beats_beast_natural_ac = {
    // Giant Eagle example: beast Dex +3, character retains Wis +2, beast natural AC 13
    // Monk UD = 10 + beast Dex mod + character Wis mod = 15 > 13 → UD wins
    val beastDexMod = 3
    val charWisMod = 2
    val beastNaturalAC = 13
    val monkUDAC = calculateAC(Unarmored, beastDexMod, false, MonkUD, 0, charWisMod)
    val wildShapeAC = intMax(beastNaturalAC, monkUDAC)
    assert(monkUDAC == 15 and wildShapeAC == 15)
  }
  
  // While using Wild Shape, do I use Unarmored Defense or the creature's Armor Class?
  run qa_wild_shape_beast_natural_ac_beats_monk_ud = {
    // Beast with high natural armor: beast Dex +0, character Wis +2, beast natural AC 17
    // Monk UD = 10 + 0 + 2 = 12 < 17 → beast AC wins
    val beastDexMod = 0
    val charWisMod = 2
    val beastNaturalAC = 17
    val monkUDAC = calculateAC(Unarmored, beastDexMod, false, MonkUD, 0, charWisMod)
    val wildShapeAC = intMax(beastNaturalAC, monkUDAC)
    assert(monkUDAC == 12 and wildShapeAC == 17)
  }
  
  // While using Wild Shape, retained mental stats (Wis) used for Monk UD, not beast Wis
  run qa_wild_shape_monk_ud_uses_character_wis_not_beast_wis = {
    // Character has high Wis +4; beast has beast Dex +3 and beast natural AC 11
    // Monk UD uses character's Wis (+4), beast's Dex (+3): 10 + 3 + 4 = 17
    val beastDexMod = 3
    val charWisMod = 4
    val beastNaturalAC = 11
    val monkUDAC = calculateAC(Unarmored, beastDexMod, false, MonkUD, 0, charWisMod)
    val wildShapeAC = intMax(beastNaturalAC, monkUDAC)
    assert(monkUDAC == 17 and wildShapeAC == 17)
  }
}
