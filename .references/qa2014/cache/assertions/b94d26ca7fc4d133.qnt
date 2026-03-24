// Source: https://rpg.stackexchange.com/q/164884
module _qa_b94d26ca7fc4d133 {
  import dnd.* from "./dnd"

  // Can the artificer Magical Tinkering be used to falsify documents?
  run qa_magical_tinkering_forgery_check = {
    // Accepted answer: yes; DM calls Deception(Cha) or Sleight of Hand(Dex),
    // possibly with advantage because magical production is easier than ink/paint.
  
    // Confirm the relevant skill→ability mappings
    val deceptionIsChaBased    = skillAbility(Deception)     == Cha
    val sleightOfHandIsDexBased = skillAbility(SleightOfHand) == Dex
  
    // Illustrate the mechanical impact of advantage:
    // A proficient artificer (level 5, profBonus 3, Cha +1) tries DC 15 forgery.
    // Without advantage (manual forgery difficulty): passive = 10 + 1 + 3 = 14  → fails
    // With advantage (magical tinkering eases the task): passive = 14 + 5 = 19  → succeeds
    val dc = 15
    val chaMod = 1
    val pb = proficiencyBonus(5) // = 3
  
    val normalPassive    = passiveCheck(chaMod, Proficient, pb, false, false)
    val advantagePassive = passiveCheck(chaMod, Proficient, pb, true,  false)
  
    assert(
      deceptionIsChaBased
      and sleightOfHandIsDexBased
      and normalPassive    < dc   // borderline fail without magical assistance
      and advantagePassive >= dc  // succeeds when DM grants advantage for magic
    )
  }
}
