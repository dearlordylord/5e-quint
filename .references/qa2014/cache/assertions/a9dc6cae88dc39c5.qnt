module _qa_a9dc6cae88dc39c5 {
  import dnd.* from "./dnd"

  // Is there a feat akin to the Fighter's Action Surge which is available to other classes?
  run qa_no_feat_grants_action_surge = {
    // Accepted answer: no such feat exists; extra attacks come only from class features.
    // A Paladin-like config with no Fighter features gets 0 extra attacks — the Feature
    // type (FExtraAttack / FExtraAttack2 / FExtraAttack3) contains only class features,
    // not feats, so no feat can grant Action Surge-style attack doubling.
    val paladinConfig: CharConfig = TEST_CONFIG.with("features", Set())
    assert(extraAttacksFromConfig(paladinConfig) == 0)
  }
}
