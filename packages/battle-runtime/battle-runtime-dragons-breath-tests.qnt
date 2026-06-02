// -*- mode: Bluespec; -*-

module battleRuntimeDragonsBreathTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeDragonsBreath.* from "./battle-runtime-dragons-breath"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"

  pure def goblinTurnState(state: BattleState): BattleState =
    {
      ...state,
      initiative: { round: 1, alreadyActed: [Fighter], stillToAct: { actor: Goblin, waiting: [] } },
      actionAvailable: true,
      bonusActionAvailable: true,
      spellSlotUsesThisTurn: Set(),
      levelOnePlusSpellCastsThisTurn: Set(),
      quickenedLevelOnePlusSpellCastsThisTurn: Set(),
    }

  run test_dragons_breath_initial_cast_stores_target_effect_and_spends_bonus_action_slot = {
    val cast = resolveDragonsBreathInitialSpell(initialState, Goblin, Set(Goblin), Acid, 2, 13)
    all {
      assert(cast.goblin.activeEffects.contains(dragonsBreathInitialEffect(Fighter, Acid, 2, 13))),
      assert(cast.fighter.concentrating),
      assert(not(cast.bonusActionAvailable)),
      assert(cast.spellSlotUsesThisTurn.contains(BattleCommittedSpellSlotUse(Fighter))),
    }
  }

  run test_dragons_breath_initial_cast_requires_willing_target_and_raw_damage_type = {
    val unwilling = resolveDragonsBreathInitialSpell(initialState, Goblin, Set(Fighter), Acid, 2, 13)
    val illegal = resolveDragonsBreathInitialSpell(initialState, Goblin, Set(Goblin), Radiant, 2, 13)
    all {
      assert(dragonsBreathDamageTypeChoiceIsLegal(Fire)),
      assert(not(dragonsBreathDamageTypeChoiceIsLegal(Radiant))),
      assert(unwilling == initialState),
      assert(illegal == initialState),
    }
  }

  run test_dragons_breath_initial_cast_removes_effect_when_source_concentration_breaks = {
    val cast = resolveDragonsBreathInitialSpell(initialState, Goblin, Set(Goblin), Poison, 2, 13)
    val cleaned = breakConcentrationSpellEffects(cast, Fighter)
    all {
      assert(cast.goblin.activeEffects.contains(dragonsBreathInitialEffect(Fighter, Poison, 2, 13))),
      assert(not(cleaned.goblin.activeEffects.exists(effect => match effect {
        | DragonsBreathEffect(_) => true
        | _ => false
      }))),
    }
  }

  run test_dragons_breath_exhale_damages_every_area_target = {
    val cast = resolveDragonsBreathInitialSpell(initialState, Goblin, Set(Goblin), Fire, 2, 13)
    val goblinTurn = goblinTurnState(cast)
    val result = resolveDragonsBreathExhale(
      goblinTurn,
      Goblin,
      Set(Fighter, Goblin),
      Set(Goblin),
      6,
      true,
    )
    all {
      assert(result.fighter.hp == goblinTurn.fighter.hp - 6),
      assert(result.goblin.hp == goblinTurn.goblin.hp - 3),
      assert(not(result.actionAvailable)),
      assert(result.goblin.activeEffects.contains(dragonsBreathInitialEffect(Fighter, Fire, 2, 13))),
    }
  }

  run test_dragons_breath_exhale_rejects_save_target_outside_area = {
    val cast = resolveDragonsBreathInitialSpell(initialState, Goblin, Set(Goblin), Lightning, 2, 13)
    val goblinTurn = goblinTurnState(cast)
    all {
      assert(resolveDragonsBreathExhale(goblinTurn, Goblin, Set(Fighter), Set(Goblin), 6, true) == goblinTurn),
    }
  }

  run test_dragons_breath_exhale_rejects_damage_roll_above_dice_maximum = {
    val cast = resolveDragonsBreathInitialSpell(initialState, Goblin, Set(Goblin), Fire, 2, 13)
    val goblinTurn = goblinTurnState(cast)
    all {
      assert(dragonsBreathDamageRollAccepted(18, dragonsBreathDamageDice(2))),
      assert(not(dragonsBreathDamageRollAccepted(19, dragonsBreathDamageDice(2)))),
      assert(resolveDragonsBreathExhale(goblinTurn, Goblin, Set(Fighter), Set(), 19, true) == goblinTurn),
    }
  }

  run test_dragons_breath_exhale_empty_area_spends_magic_action_without_damage_roll = {
    val cast = resolveDragonsBreathInitialSpell(initialState, Goblin, Set(Goblin), Fire, 2, 13)
    val goblinTurn = goblinTurnState(cast)
    val result = resolveDragonsBreathExhale(goblinTurn, Goblin, Set(), Set(), 999, true)
    all {
      assert(not(result.actionAvailable)),
      assert(result.fighter.hp == goblinTurn.fighter.hp),
      assert(result.goblin.hp == goblinTurn.goblin.hp),
    }
  }

  run test_dragons_breath_exhale_uses_exhaler_as_damage_source = {
    val cast = resolveDragonsBreathInitialSpell(initialState, Goblin, Set(Goblin), Fire, 2, 13)
    val goblinTurn = goblinTurnState(cast)
    val charmedByGoblin = CharmPersonCharmed({ source: Goblin, durationTicks: 10 })
    val charmedFighter = {
      ...goblinTurn,
      fighter: {
        ...goblinTurn.fighter,
        activeEffects: goblinTurn.fighter.activeEffects.union(Set(charmedByGoblin)),
      },
    }
    val result = resolveDragonsBreathExhale(charmedFighter, Goblin, Set(Fighter), Set(), 6, true)
    all {
      assert(not(result.fighter.activeEffects.contains(charmedByGoblin))),
      assert(result.fighter.hp == charmedFighter.fighter.hp - 6),
    }
  }
}
