// Source: https://rpg.stackexchange.com/q/169919
module _qa_2ff22a7c40ad72a9 {
  import dnd.* from "./dnd"

  // Can a Swords bard benefit from Blade Flourish's speed increase again if they take the Attack action again?
  run qa_blade_flourish_speed_stacks = {
    // Blade Flourish grants +10 ft walking speed per Attack action taken.
    // Because the effect lasts until end of turn (< 1 round), same-name stacking
    // rules don't apply, so a second Attack action (e.g. Action Surge) grants
    // an independent second +10 ft — total +20 ft over base speed.
    val base = FRESH_TURN  // effectiveSpeed: 30, movementRemaining: 30
    // First Attack action fires Blade Flourish once: +10 ft
    val after1 = base.with("movementRemaining", base.movementRemaining + 10)
                     .with("effectiveSpeed", base.effectiveSpeed + 10)
    // Second Attack action (e.g. via Action Surge) fires Blade Flourish again: +10 ft more
    val after2 = after1.with("movementRemaining", after1.movementRemaining + 10)
                       .with("effectiveSpeed", after1.effectiveSpeed + 10)
    // Both applications stack: 30 + 10 + 10 = 50 ft, not the non-stacking 30 + 10 = 40 ft
    assert(after2.movementRemaining == 50 and after2.effectiveSpeed == 50)
  }
}
