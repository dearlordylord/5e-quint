// multiclass prerequisite algebra (SRD 5.2.1 Ch18.4)
//
// Run: quint test --match "mc_" packages/shared-algebras/proofs/multiclass-prerequisite-algebra.qnt

module mcPrereqProof::Impl {

  // ── Inline types to match creature.qnt ──

  type Ability = Str | Dex | Con | Int_ | Wis | Cha
  type ClassName = Barbarian | Bard | Cleric | Druid | Fighter | Monk | Paladin | Ranger | Rogue | Sorcerer | Warlock | Wizard

  val MULTICLASS_THRESHOLD: int = 13

  // ── Core logic ──

  pure def mcPrereq(scores: Ability -> int, cls: ClassName): bool = match cls {
    | Barbarian => scores.get(Str) >= MULTICLASS_THRESHOLD
    | Bard => scores.get(Cha) >= MULTICLASS_THRESHOLD
    | Cleric => scores.get(Wis) >= MULTICLASS_THRESHOLD
    | Druid => scores.get(Wis) >= MULTICLASS_THRESHOLD
    | Fighter => scores.get(Str) >= MULTICLASS_THRESHOLD or scores.get(Dex) >= MULTICLASS_THRESHOLD
    | Monk => scores.get(Dex) >= MULTICLASS_THRESHOLD and scores.get(Wis) >= MULTICLASS_THRESHOLD
    | Paladin => scores.get(Str) >= MULTICLASS_THRESHOLD and scores.get(Cha) >= MULTICLASS_THRESHOLD
    | Ranger => scores.get(Dex) >= MULTICLASS_THRESHOLD and scores.get(Wis) >= MULTICLASS_THRESHOLD
    | Rogue => scores.get(Dex) >= MULTICLASS_THRESHOLD
    | Sorcerer => scores.get(Cha) >= MULTICLASS_THRESHOLD
    | Warlock => scores.get(Cha) >= MULTICLASS_THRESHOLD
    | Wizard => scores.get(Int_) >= MULTICLASS_THRESHOLD
  }

  pure def canMulticlass(scores: Ability -> int, currentClasses: Set[ClassName], newClass: ClassName): bool =
    currentClasses.union(Set(newClass)).forall(cls => mcPrereq(scores, cls))

  // ── Score sets ──

  // BASE: standard 15-14-12-10-8-10 array (SRD standard, Wis 13)
  pure val BASE: Ability -> int =
    Map(Str -> 15, Dex -> 14, Con -> 12, Int_ -> 10, Wis -> 13, Cha -> 8)

  // ALL_10: all scores at 10 — below threshold for all classes
  pure val ALL_10: Ability -> int =
    Map(Str -> 10, Dex -> 10, Con -> 10, Int_ -> 10, Wis -> 10, Cha -> 10)

  // ALL_13: all scores at 13 — meets threshold for every class
  pure val ALL_13: Ability -> int =
    Map(Str -> 13, Dex -> 13, Con -> 13, Int_ -> 13, Wis -> 13, Cha -> 13)

  // ── Single-class prereq tests ──

  run mc_barb_pass = assert(mcPrereq(BASE, Barbarian)) // STR 15
  run mc_barb_fail = assert(not(mcPrereq(ALL_10, Barbarian))) // STR 10

  run mc_bard_pass = assert(mcPrereq(ALL_13, Bard))
  run mc_bard_fail = assert(not(mcPrereq(BASE, Bard))) // CHA 8

  run mc_cleric_pass = assert(mcPrereq(BASE, Cleric)) // WIS 13
  run mc_druid_pass = assert(mcPrereq(ALL_13, Druid))
  run mc_druid_fail = assert(not(mcPrereq(ALL_10, Druid)))

  run mc_rogue_pass = assert(mcPrereq(BASE, Rogue)) // DEX 14

  run mc_sorc_pass = assert(mcPrereq(ALL_13, Sorcerer))
  run mc_sorc_fail = assert(not(mcPrereq(BASE, Sorcerer))) // CHA 8

  run mc_warlock_pass = assert(mcPrereq(ALL_13, Warlock))
  run mc_warlock_fail = assert(not(mcPrereq(BASE, Warlock))) // CHA 8

  run mc_wizard_pass = assert(mcPrereq(ALL_13, Wizard))
  run mc_wizard_fail = assert(not(mcPrereq(ALL_10, Wizard))) // INT 10

  // ── Fighter (anyOf: STR or DEX) ──

  val FIGHTER_STR_ONLY: Ability -> int = BASE.set(Dex, 10)
  val FIGHTER_DEX_ONLY: Ability -> int = BASE.set(Str, 10)
  val FIGHTER_NONE: Ability -> int = ALL_10

  run mc_fighter_str_pass = assert(mcPrereq(FIGHTER_STR_ONLY, Fighter)) // STR 15
  run mc_fighter_dex_pass = assert(mcPrereq(FIGHTER_DEX_ONLY, Fighter)) // DEX 14
  run mc_fighter_both_fail = assert(not(mcPrereq(FIGHTER_NONE, Fighter)))

  // ── Monk (allOf: DEX and WIS) ──

  val MONK_PASS: Ability -> int = BASE // DEX 14 AND WIS 13
  val MONK_NO_WIS: Ability -> int = BASE.set(Wis, 10)

  run mc_monk_pass = assert(mcPrereq(MONK_PASS, Monk))
  run mc_monk_no_wis = assert(not(mcPrereq(MONK_NO_WIS, Monk)))

  // ── Paladin (allOf: STR and CHA) ──

  run mc_paladin_no_cha = assert(not(mcPrereq(BASE, Paladin)))
  run mc_paladin_pass = assert(mcPrereq(ALL_13, Paladin))

  // ── Ranger (allOf: DEX and WIS) ──

  val RANGER_PASS: Ability -> int = ALL_13
  val RANGER_NO_WIS: Ability -> int = ALL_13.set(Wis, 10)

  run mc_ranger_pass = assert(mcPrereq(RANGER_PASS, Ranger))
  run mc_ranger_no_wis = assert(not(mcPrereq(RANGER_NO_WIS, Ranger)))

  // ── Boundary tests ──

  run mc_cleric_exact_13 = assert(mcPrereq(Map(Str -> 15, Dex -> 14, Con -> 12, Int_ -> 10, Wis -> 13, Cha -> 18), Cleric))
  // Score 12 does NOT meet prereq
  run mc_cleric_score_12 = assert(not(mcPrereq(Map(Str -> 15, Dex -> 14, Con -> 12, Int_ -> 10, Wis -> 12, Cha -> 8), Cleric)))

  // ── canMulticlass ──

  run mc_can_pass = assert(canMulticlass(ALL_13, Set(Rogue, Druid), Wizard))
  run mc_can_fail_current = assert(not(canMulticlass(BASE, Set(Bard), Cleric))) // Bard needs CHA 13, BASE has CHA 8
  run mc_can_fail_second_current = assert(not(canMulticlass(BASE, Set(Rogue, Druid), Wizard))) // Wizard needs INT 13, BASE has INT 10

}
