// Source: https://rpg.stackexchange.com/q/157128
module _qa_e42bbdc46b786c54 {
  import dnd.* from "./dnd"

  // Do Chain Devils' Animated Chains restrain creatures on a grapple?
  run qa_animated_chain_grapple_also_restrains = {
      val creature = freshCreature(20)
      // Chain attack (animated or devil-direct) applies grapple AND restrain on hit
      val afterChainHit = pApplyCondition(pApplyCondition(creature, CGrappled), CRestrained)
      assert(afterChainHit.grappled and afterChainHit.restrained)
  }
}
