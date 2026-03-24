// Source: https://rpg.stackexchange.com/q/180391
module _qa_4968cf6b5bcbd039 {
  import dnd.* from "./dnd"

  // What happens if I use the Coiling Grasp Tattoo on the same target multiple times?
  run qa_coiling_grasp_second_use_grapple_persists = {
    // Target is already grappled from the first successful tattoo use
    val alreadyGrappled = freshCreature(20).with("grappled", true)
    // Second use on same target: creature succeeds the save (BWins = target wins contest)
    // Attacker Medium, target Medium, free hand available
    val result = pGrapple(Medium, Medium, alreadyGrappled, BWins, true)
    // Successful save against second use does NOT end the pre-existing grapple
    assert(result.targetState.grappled == true)
  }
}
