// Source: https://rpg.stackexchange.com/q/97230
module _qa_d5d7ae46cb79a146 {
  import dnd.* from "./dnd"

  // Can a Wildshaped druid ride a mount?
  run qa_wildshaped_druid_can_ride_mount = {
    // Black Bear (Large, wildshaped druid) riding an Elephant (Huge):
    // mount must be at least one size category larger than the rider
    val riderSize = Large  // druid wildshaped as Black Bear
    val mountSize = Huge   // Elephant
    assert(sizeOrd(mountSize) >= sizeOrd(riderSize) + 1)
  }
}
