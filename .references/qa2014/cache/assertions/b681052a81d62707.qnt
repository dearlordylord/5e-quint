// Source: https://rpg.stackexchange.com/q/57276
module _qa_b681052a81d62707 {
  import dnd.* from "./dnd"

  // Can you use Magical Secrets to choose high level spells when multiclassing as a Bard?
  run qa_magical_secrets_bard_multiclass_level_limit = {
    // Wizard 7 / Bard 10: Magical Secrets is bounded by the Bard class table, not multiclass slots
    val bardLevel = 10   // gained 10th Bard level → Magical Secrets feature
    val wizardLevel = 7  // full caster
    val combinedCasterLevel = pMulticlassCasterLevel(bardLevel + wizardLevel, 0, 0)  // 17
  
    // Bard's OWN class table (caster level = bardLevel alone) determines Magical Secrets cap
    val bardCanCast5th = pSlotsPerLevel(bardLevel, 5) > 0  // true: Bard 10 has 5th-level slots
    val bardCanCast6th = pSlotsPerLevel(bardLevel, 6) > 0  // false: Bard 10 has no 6th-level slots
  
    // Combined multiclass slots DO reach 9th level — but this is irrelevant for Magical Secrets
    val multiclassHas9th = pSlotsPerLevel(combinedCasterLevel, 9) > 0
  
    assert(
      // Bard 10 class table tops out at 5th level
      bardCanCast5th
      and not(bardCanCast6th)
      // Multiclass slots reach 9th level (the trap: these don't unlock Magical Secrets choices)
      and multiclassHas9th
      // Magical Secrets uses Bard's own table → 9th level is off-limits
      and pSlotsPerLevel(bardLevel, 9) == 0
    )
  }
}
