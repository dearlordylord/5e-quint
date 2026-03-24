// Source: https://rpg.stackexchange.com/q/79462
module _qa_abb04c34e140cfeb {
  import dnd.* from "./dnd"

  // How much does Heavy Mariner's Armor weigh? — Mariner's Armor is an enchantment on a base armor type; it inherits all base stats (AC, STR req, stealth) unchanged
  run qa_mariners_armor_inherits_base_armor_stats = {
    // Mariner's Chain Mail = CHAIN_MAIL + swim speed enchantment; no new armor type, so base stats are identical
    val marinersChainMail = CHAIN_MAIL
    // Heavy armor AC ignores DEX mod
    val ac = calculateAC(WearingArmor(marinersChainMail), 3, false, NoUnarmoredDefense, 0, 0)
    assert(
      ac == 16                                  // inherits baseAC from chain mail
      and marinersChainMail.strRequirement == 13 // inherits STR requirement
      and marinersChainMail.stealthDisadvantage  // inherits stealth disadvantage
      and marinersChainMail.category == HeavyArmor
    )
  }
}
