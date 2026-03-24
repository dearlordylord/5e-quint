// Source: https://rpg.stackexchange.com/q/136006
module _qa_6186c3b6d351f6ec {
  import dnd.* from "./dnd"

  // Is the AC of a Mirror Image Duplicate fixed at Point of Casting?
  run qa_mirror_image_duplicate_ac_tracks_dex = {
      // Accepted answer: duplicate AC = 10 + DEX mod, recalculates as DEX changes
      val dexAtCast    = 14  // mod +2 → duplicate AC 12 at cast time
      val dexAfterBuff = 18  // mod +4 → e.g. Dexterity-boosting spell/item applied mid-duration
      val dexAfterNerf = 8   // mod -1 → e.g. ability drain reduces DEX during duration
  
      val duplicateAC_atCast    = 10 + abilityModifier(dexAtCast)
      val duplicateAC_afterBuff = 10 + abilityModifier(dexAfterBuff)
      val duplicateAC_afterNerf = 10 + abilityModifier(dexAfterNerf)
  
      assert(
          // baseline
          duplicateAC_atCast    == 12
          // DEX increases → duplicate AC increases (not locked at 12)
          and duplicateAC_afterBuff == 14
          and duplicateAC_afterBuff != duplicateAC_atCast
          // DEX decreases → duplicate AC decreases (not locked at 12)
          and duplicateAC_afterNerf == 9
          and duplicateAC_afterNerf != duplicateAC_atCast
      )
  }
}
