module battleRuntimeWardingBondTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeWardingBond.* from "./battle-runtime-warding-bond"

  run test_warding_bond_cast_requires_all_runtime_witnesses = {
    val initial = initialWardingBondState
    val cast = castWardingBond(initial, Fighter, Goblin, true, true, true)
    all {
      assert(not(cast.actionAvailable)),
      assert(not(cast.spellSlotAvailable)),
      assert(wardingBondConnects(cast.bond, Fighter, Goblin)),
      assert(not(wardingBondConnects(
        castWardingBond(initial, Fighter, Fighter, true, true, true).bond,
        Fighter,
        Fighter,
      ))),
      assert(castWardingBond(initial, Fighter, Goblin, false, true, true).bond == NoWardingBond),
      assert(castWardingBond(initial, Fighter, Goblin, true, false, true).bond == NoWardingBond),
      assert(castWardingBond(initial, Fighter, Goblin, true, true, false).bond == NoWardingBond),
    }
  }

  run test_warding_bond_projects_target_defenses_only = {
    val cast = castWardingBond(initialWardingBondState, Fighter, Goblin, true, true, true)
    all {
      assert(wardingBondArmorClassBonus(cast, Goblin) == 1),
      assert(wardingBondArmorClassBonus(cast, Fighter) == 0),
      assert(wardingBondSavingThrowBonus(cast, Goblin) == 1),
      assert(wardingBondSavingThrowBonus(cast, Fighter) == 0),
      assert(wardingBondHasAllDamageResistance(cast, Goblin)),
      assert(not(wardingBondHasAllDamageResistance(cast, Fighter))),
    }
  }

  run test_warding_bond_shares_same_final_damage_to_source = {
    val cast = castWardingBond(initialWardingBondState, Fighter, Goblin, true, true, true)
    val damaged = applyWardingBondTargetDamage(cast, Goblin, 9)
    all {
      assert(wardingBondAdjustedTargetDamage(cast, Goblin, 9) == 4),
      assert(actorHp(damaged, Goblin) == 8),
      assert(actorHp(damaged, Fighter) == 8),
      assert(wardingBondConnects(damaged.bond, Fighter, Goblin)),
    }
  }

  run test_warding_bond_ends_on_source_zero_separation_recast_or_duration = {
    val cast = castWardingBond(initialWardingBondState, Fighter, Goblin, true, true, true)
    val sourceZero = applyWardingBondTargetDamage(
      cast.with("fighterHp", 4),
      Goblin,
      9,
    )
    val separated = separateWardingBond(cast, Fighter, Goblin, true)
    val recast = castWardingBond(
      cast.with("actionAvailable", true).with("spellSlotAvailable", true),
      Goblin,
      Fighter,
      true,
      true,
      true,
    )
    val expiring = cast.with(
      "bond",
      ActiveWardingBond({ source: Fighter, target: Goblin, durationTicks: 1 })
    )
    all {
      assert(sourceZero.bond == NoWardingBond),
      assert(separated.bond == NoWardingBond),
      assert(wardingBondConnects(recast.bond, Goblin, Fighter)),
      assert(tickWardingBondDuration(expiring).bond == NoWardingBond),
    }
  }

}
