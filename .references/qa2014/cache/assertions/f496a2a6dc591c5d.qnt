// Source: https://rpg.stackexchange.com/q/98229
module _qa_f496a2a6dc591c5d {
  import dnd.* from "./dnd"

  // Benefits for Animal Companion: wolf bite is finesse (DEX not STR), yielding +2 DEX + +2 prof = +4 at level 3
  run qa_wolf_bite_finesse_uses_dex = {
    val biteWeapon: Weapon = {
      name: "Bite",
      damageDie: 4,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Finesse),
      isMelee: true,
      normalRange: 0,
      longRange: 0,
    }
    val wolfStrMod = 1   // STR 12
    val wolfDexMod = 2   // DEX 15
    val profBonus = proficiencyBonus(3)  // level 3 -> +2
    val atkMod = weaponAttackAbility(biteWeapon, wolfStrMod, wolfDexMod)
    // Finesse picks higher of STR/DEX; DEX wins; +2 + +2 = +4
    assert(atkMod == wolfDexMod and atkMod + profBonus == 4)
  }
  
  // Benefits for Animal Companion: wolf keeps its stat-block proficiencies (Perception, Stealth) AND gains additional ones from the ranger feature — union, not replacement
  run qa_animal_companion_skill_proficiencies_stack = {
    val baseWolfSkills: Set[Skill] = Set(Perception, Stealth)
    val gainedSkills: Set[Skill] = Set(Athletics, Survival)
    // Accepted answer: existing skills are retained; companion gains on top
    val totalSkills = baseWolfSkills.union(gainedSkills)
    // Rejected interpretation: only 2 skills total (gained replaces base)
    val replacedSkills = gainedSkills
    assert(
      totalSkills.size() == 4
      and replacedSkills.size() == 2
      and totalSkills.contains(Perception)
      and totalSkills.contains(Stealth)
      and totalSkills.contains(Athletics)
      and totalSkills.contains(Survival)
    )
  }
}
