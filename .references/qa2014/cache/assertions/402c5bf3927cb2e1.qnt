// Source: https://rpg.stackexchange.com/q/165246
module _qa_402c5bf3927cb2e1 {
  import dnd.* from "./dnd"

  // Can I pretend to be casting from a spell scroll, but instead cast normally, or vice versa?
  run qa_bonus_action_spell_prevents_noncantrap_action = {
    // PHB/XGE: casting a bonus action spell restricts your action to cantrips only
    val t1 = pMarkBonusActionSpell(FRESH_TURN)
    assert(not(canCastNonCantripAction(t1)))
  }
  
  // Can I pretend to be casting from a spell scroll, but instead cast normally, or vice versa?
  run qa_action_noncantrap_prevents_bonus_action_spell = {
    // PHB: casting a non-cantrip as your action blocks bonus action spellcasting that turn
    val t1 = pMarkNonCantripActionSpell(FRESH_TURN)
    assert(not(canCastBonusActionSpell(t1)))
  }
  
  // Can I pretend to be casting from a spell scroll, but instead cast normally, or vice versa?
  run qa_verbal_component_requires_speech = {
    // XGE: spell is perceptible (and counterspellable) only if it has V/S/M;
    // paralyzed creature cannot speak -> cannot provide verbal component -> can't cast V spells
    val paralyzed = freshCreature(20)
      .with("paralyzed", true)
      .with("incapacitatedSources", Set(ISParalyzed))
    assert(not(pCanProvideComponents(paralyzed, true, false, true)))
  }
  
  // Can I pretend to be casting from a spell scroll, but instead cast normally, or vice versa?
  run qa_no_vs_components_castable_without_speech = {
    // XGE: a spell with no V or S component is imperceptible; even a paralyzed
    // creature can satisfy its component requirements (nothing required = nothing blocked)
    val paralyzed = freshCreature(20)
      .with("paralyzed", true)
      .with("incapacitatedSources", Set(ISParalyzed))
    assert(pCanProvideComponents(paralyzed, false, false, true))
  }
}
