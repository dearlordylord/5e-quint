// Source: https://rpg.stackexchange.com/q/192662
module _qa_411a8bc8b094b45e {
  import dnd.* from "./dnd"

  // SKIP: The spec does not model multi-round/multi-minute casting time progression, magic item touch-as-prerequisite for casting, or casting interruption due to a failed continuous prerequisite mid-cast. The relevant rule (touch condition must be maintained throughout the entire casting time or the cast immediately fails) has no corresponding primitive in the spec — `pCanProvideComponents` covers only verbal/somatic components, not item-touch requirements, and there is no state machine for in-progress spell casting.
}
