// Source: https://rpg.stackexchange.com/q/156177
module _qa_371dfdcb0ca3e5ca {
  import dnd.* from "./dnd"

  // Does a succubus' Charm end when it dies? — charm has no source-death ending condition; persists until explicitly removed
  run qa_charm_persists_after_source_dies = {
    val target = freshCreature(20)
    // Succubus charms the target
    val charmedTarget = pApplyCondition(target, CCharmed)
    // "Succubus dies" — no function in the spec strips CCharmed from the target as a side effect.
    // The spec has no source-tracking or source-death hook; the condition flag is owned entirely
    // by the target's CreatureState and can only be cleared by an explicit pRemoveCondition call.
    // Charm must therefore persist, matching the accepted ruling.
    val afterSourceDies = charmedTarget   // nothing to call; no source-death function exists
    assert(
      afterSourceDies.charmed == true
      // Confirm explicit removal IS the only off-switch
      and pRemoveCondition(charmedTarget, CCharmed).charmed == false
    )
  }
}
