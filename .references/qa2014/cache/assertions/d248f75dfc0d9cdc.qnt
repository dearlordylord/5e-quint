// Source: https://rpg.stackexchange.com/q/181230
module _qa_d248f75dfc0d9cdc {
  import dnd.* from "./dnd"

  // Does wearing magic items with armor affect AC negatively?
  // Accepted answer: No — rules have no armor-component granularity; plate is plate.
  run qa_magic_item_gauntlets_do_not_reduce_plate_ac = {
    // "Swapping gauntlets for Gauntlets of Ogre Power" is not represented in the spec
    // at all — armor is a single unit. Both before and after the swap the character is
    // WearingArmor(PLATE). Calculate AC both ways and assert they are identical and == 18.
    val dexMod = 4  // high DEX: irrelevant for heavy armor, but shows it doesn't sneak in
    val acNormal     = calculateAC(WearingArmor(PLATE), dexMod, false, NoUnarmoredDefense, 0, 0)
    val acMagicGaunt = calculateAC(WearingArmor(PLATE), dexMod, false, NoUnarmoredDefense, 0, 0)
    assert(acNormal == 18 and acMagicGaunt == 18 and acNormal == acMagicGaunt)
  }
}
