// Source: https://rpg.stackexchange.com/q/214077
module _qa_2308ce6af520efe9 {
  import dnd.* from "./dnd"

  // Gaze of Two Minds: hidden creature retains Invisible because the Warlock (not the rogue) is the caster
  run qa_gotm_hidden_creature_retains_invisible_not_caster = {
    val rogueHidden = pApplyCondition(freshCreature(20), CInvisible)
    // Warlock casts Eldritch Blast through GoTM from the rogue's space.
    // The rogue did not cast — caller does NOT call pRemoveCondition on the rogue.
    val rogueAfterWarlockCasts = rogueHidden
    assert(rogueAfterWarlockCasts.invisible == true)
  }
  
  // Gaze of Two Minds contrast: if the hidden creature HAD cast the spell itself (verbal component), Invisible ends
  run qa_gotm_self_cast_with_verbal_ends_invisible = {
    val rogueHidden = pApplyCondition(freshCreature(20), CInvisible)
    // Rogue casts a spell with a Verbal component — caller removes CInvisible per Hide rules
    val rogueAfterSelfCast = pRemoveCondition(rogueHidden, CInvisible)
    assert(rogueAfterSelfCast.invisible == false)
  }
}
