// Source: https://rpg.stackexchange.com/q/180473
module _qa_9417309727a65eaf {
  import dnd.* from "./dnd"

  // Is there a way to make a perfect body double? — Clone (8th-level) needs slot >= 8; lower slot insufficient
  run qa_clone_requires_8th_level_slot = {
    val ss = {
      slotsMax: Map(1->0, 2->0, 3->0, 4->0, 5->0, 6->0, 7->1, 8->1, 9->0),
      slotsCurrent: Map(1->0, 2->0, 3->0, 4->0, 5->0, 6->0, 7->1, 8->1, 9->0),
      pactSlotsMax: 0,
      pactSlotsCurrent: 0,
      pactSlotLevel: 0,
      concentrationSpellId: "",
    }
    assert(
      pCanCastAtLevel(ss, 8, 8) and
      not(pCanCastAtLevel(ss, 8, 7))
    )
  }
  
  // Is there a way to make a perfect body double? — Animate Objects (concentration) ends early on failed save
  run qa_animate_objects_concentration_breaks_on_failed_save = {
    val ss = {
      slotsMax: Map(1->2, 2->2, 3->2, 4->2, 5->2, 6->0, 7->0, 8->0, 9->0),
      slotsCurrent: Map(1->2, 2->2, 3->2, 4->2, 5->2, 6->0, 7->0, 8->0, 9->0),
      pactSlotsMax: 0,
      pactSlotsCurrent: 0,
      pactSlotLevel: 0,
      concentrationSpellId: "",
    }
    val ss1 = pStartConcentration(ss, "animate_objects")
    // 20 damage -> DC max(20/2, 10) = 10; failed save breaks concentration
    val dc = pConcentrationDC(20)
    val ss2 = pConcentrationCheck(ss1, false)
    assert(
      isConcentrating(ss1) and
      dc == 10 and
      not(isConcentrating(ss2))
    )
  }
}
