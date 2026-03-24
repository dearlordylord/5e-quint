// Source: https://rpg.stackexchange.com/q/75919
module _qa_26e86b11945e2fbe {
  import dnd.* from "./dnd"

  // Does Fey Ancestry or other resistance grant advantage against Madness saving throws?
  run qa_madness_save_no_implicit_advantage = {
    // Accepted answer: only features that explicitly cover madness/magical saves grant
    // advantage. Fey Ancestry (advantage vs charmed) does NOT apply — Madness ≠ charmed.
    val creature = freshCreature(20)
    // pSaveModifiers always returns hasAdvantage: false; no creature condition
    // implicitly grants save advantage (Fey Ancestry is not tracked as a condition)
    val wisMods = pSaveModifiers(creature, Wis)
    val noConditionAdvantage = not(wisMods.hasAdvantage) and not(wisMods.autoFail)
    // Without any advantage source, a marginal Wis save fails:
    // roll 8 + Wis mod 1 + no prof = 9 < DC 15
    val failsWithNoFeature = not(saveSucceeds(8, 1, false, 2, 0, 15))
    // An explicit matching feature (Gnome Cunning, Robe of Archmagi, inspiration)
    // grants advantage — modeled by the player passing the better of two rolls (14):
    // 14 + 1 = 15 >= DC 15 → succeeds
    val succeedsWithExplicitFeature = saveSucceeds(14, 1, false, 2, 0, 15)
    // resolveAdvantage: explicit feature sets hasAdvantage=true → retained
    val explicitAdvState = resolveAdvantage({ hasAdvantage: true, hasDisadvantage: false })
    val featureAdvantagePropagates = explicitAdvState.hasAdvantage
    // resolveAdvantage: no matching feature → no advantage
    val noAdvState = resolveAdvantage({ hasAdvantage: false, hasDisadvantage: false })
    val feyAncestryGivesNoAdvantage = not(noAdvState.hasAdvantage)
    assert(
      noConditionAdvantage
      and failsWithNoFeature
      and succeedsWithExplicitFeature
      and featureAdvantagePropagates
      and feyAncestryGivesNoAdvantage
    )
  }
}
