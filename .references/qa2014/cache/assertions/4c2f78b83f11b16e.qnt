// Source: https://rpg.stackexchange.com/q/71923
module _qa_4c2f78b83f11b16e {
  import dnd.* from "./dnd"

  // How to use Silence effectively against spellcasters?
  run qa_grappled_caster_cannot_escape_silence_zone = {
    // Grappled caster has speed 0 and cannot walk out of the Silence area
    val caster = freshCreature(20).with("grappled", true)
    val t = pStartTurn(TEST_CONFIG, caster, Unarmored, false, 0, false, false)
    assert(t.movementRemaining == 0)
  }
  
  // How to use Silence effectively against spellcasters?
  run qa_silence_verbal_component_blocked = {
    // Silence suppresses sound; a creature that cannot speak cannot satisfy Verbal component requirement
    val silencedCaster = pApplyCondition(freshCreature(20), CParalyzed)
    assert(not(pCanProvideComponents(silencedCaster, true, false, true)))
  }
}
