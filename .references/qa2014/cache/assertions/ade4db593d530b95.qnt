// Source: https://rpg.stackexchange.com/q/92055
module _qa_ade4db593d530b95 {
  import dnd.* from "./dnd"

  // Do you need proficiencies for riding?
  run qa_mount_no_proficiency_check = {
    // pMountOrDismount takes no proficiency parameter — basic riding only costs half speed
    val t1 = pMountOrDismount(FRESH_TURN)
    // FRESH_TURN: effectiveSpeed=30, movementRemaining=30; half-speed cost = 15
    assert(t1.movementRemaining == 15)
  }
  
  // Do you need proficiencies for riding?
  run qa_forced_dismount_save_succeeds_without_proficiency = {
    // When a situational check IS called (e.g. mount moves against rider's will),
    // it is a DC 10 DEX save — isProficient=false, but a solid roll still passes
    val succeeded = pForcedDismountSave(12, 0, false, 3)
    // roll 12 + dexMod 0 + no prof = 12 >= DC 10 → succeeds without ride proficiency
    assert(succeeded)
  }
}
