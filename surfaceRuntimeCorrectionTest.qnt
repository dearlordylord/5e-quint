module surfaceRuntimeCorrectionTest::Impl {
  import creature.* from "./creature"
  import surfaceRuntimeCorrection.* from "./surfaceRuntimeCorrection"

  pure val EMPTY_COMBATANT: BattleCombatant = {
    id: "",
    name: "",
    level: 0,
    currentHp: 0,
    maxHp: 0,
    spellSaveDc: NoSpellSaveDc,
    units: List(),
    unitResourceStates: List(),
  }

  pure val EMPTY_PARTICIPANT: BattleParticipant = {
    combatant: EMPTY_COMBATANT,
    initiativeCount: 0,
    projectionOrder: 0,
  }

  pure val EMPTY_BATTLE_STATE: BattleState = {
    currentParticipant: EMPTY_PARTICIPANT,
    waitingParticipants: List(),
    round: 0,
    turnNumber: 0,
    openPrompt: NoOpenPrompt,
    standardActionsRemaining: 0,
    nonMagicActionsRemaining: 0,
  }

  pure def battleStateOrEmpty(result: BattleStateInitResult): BattleState =
    match result {
      | BattleStateOk(state) => state
      | BattleStateInvalid(_) => EMPTY_BATTLE_STATE
    }

  pure def reducedStateOrEmpty(result: BattleStateReduceResult): BattleState =
    match result {
      | BattleStateReduced(state) => state
      | BattleStateReductionInvalid(_) => EMPTY_BATTLE_STATE
    }

  pure def promptResultStateOrEmpty(result: PromptAnswerResult): BattleState =
    match result {
      | AnswerResolved(payload) => payload.state
      | AnswerOpened(payload) => payload.state
      | AnswerInvalid(_) => EMPTY_BATTLE_STATE
    }

  pure def mkCombatant(
    id: CreatureId,
    name: str,
    level: int,
    currentHp: int,
    maxHp: int,
    spellSaveDc: SpellSaveDc,
    units: List[BattleUnitAccess],
    unitResourceStates: List[BattleUnitResourceState],
  ): BattleCombatant = {
    id: id,
    name: name,
    level: level,
    currentHp: currentHp,
    maxHp: maxHp,
    spellSaveDc: spellSaveDc,
    units: units,
    unitResourceStates: unitResourceStates,
  }

  pure val INITIAL_COMBATANTS: List[BattleCombatant] = [
    mkCombatant("fighter", "Brakka", 1, 20, 20, NoSpellSaveDc, List(), List()),
    mkCombatant(
      "cleric",
      "Mira",
      3,
      18,
      18,
      HasSpellSaveDc(14),
      [{ unitId: "cure_wounds", semantics: BUSingleTargetHeal }],
      [{ unitId: "cure_wounds", expendedUses: 0, usedThisTurn: false }],
    ),
    mkCombatant("ogre", "Ogre", 2, 59, 59, NoSpellSaveDc, List(), List()),
  ]

  pure val PROMPT_COMBATANTS: List[BattleCombatant] = [
    mkCombatant(
      "fighter",
      "Brakka",
      2,
      20,
      20,
      NoSpellSaveDc,
      [{
        unitId: "fighter_action_surge_l2",
        semantics: BUGrantExtraAction({
          restriction: EARExcludeMagic,
          useCountCap: TieredUseCountCap({
            base: 1,
            atLevel: 17,
            upgradedValue: 2,
          }),
          usageLimit: ULOncePerTurn,
        }),
      }],
      [{ unitId: "fighter_action_surge_l2", expendedUses: 0, usedThisTurn: false }],
    ),
    mkCombatant(
      "cleric",
      "Mira",
      3,
      9,
      18,
      HasSpellSaveDc(14),
      [{ unitId: "cure_wounds", semantics: BUSingleTargetHeal }],
      [{ unitId: "cure_wounds", expendedUses: 0, usedThisTurn: false }],
    ),
    mkCombatant(
      "wizard",
      "Nyra",
      5,
      22,
      22,
      HasSpellSaveDc(15),
      [{ unitId: "fireball", semantics: BUAreaSaveDamage({
        rangeFeet: 150,
        radiusFeet: 20,
        saveAbility: Dex,
        damageType: Fire,
      }) }],
      [{ unitId: "fireball", expendedUses: 0, usedThisTurn: false }],
    ),
    mkCombatant("ogre", "Ogre", 2, 59, 59, NoSpellSaveDc, List(), List()),
  ]

  pure val INITIAL_INIT: BattleInit = {
    initiativeCounts: [
      { actorId: "fighter", count: 18 },
      { actorId: "cleric", count: 12 },
      { actorId: "ogre", count: 9 },
    ],
    tieResolutions: List(),
  }

  pure val PROMPT_INIT: BattleInit = {
    initiativeCounts: [
      { actorId: "wizard", count: 18 },
      { actorId: "fighter", count: 16 },
      { actorId: "cleric", count: 12 },
      { actorId: "ogre", count: 9 },
    ],
    tieResolutions: List(),
  }

  pure val PROMPT_BATTLE: BattleState =
    battleStateOrEmpty(initializeBattleState(PROMPT_COMBATANTS, PROMPT_INIT))

  pure def participants(state: BattleState): List[BattleParticipant] =
    [state.currentParticipant].concat(state.waitingParticipants)

  pure def currentActorId(state: BattleState): CreatureId =
    state.currentParticipant.combatant.id

  pure def replaceCombatantInState(
    state: BattleState,
    updatedCombatant: BattleCombatant,
  ): BattleState =
    {
      currentParticipant:
        if (state.currentParticipant.combatant.id != updatedCombatant.id) state.currentParticipant
        else state.currentParticipant.with("combatant", updatedCombatant),
      waitingParticipants: state.waitingParticipants.foldl([], (acc, participant) =>
        acc.append(
          if (participant.combatant.id != updatedCombatant.id) participant
          else participant.with("combatant", updatedCombatant)
        )
      ),
      round: state.round,
      turnNumber: state.turnNumber,
      openPrompt: state.openPrompt,
      standardActionsRemaining: state.standardActionsRemaining,
      nonMagicActionsRemaining: state.nonMagicActionsRemaining,
    }

  run test_createInitiativeOrder_uses_table_supplied_tie_order = {
    val order = createInitiativeOrder(
      ["fighter", "cleric", "ogre"],
      {
        initiativeCounts: [
          { actorId: "fighter", count: 15 },
          { actorId: "cleric", count: 15 },
          { actorId: "ogre", count: 8 },
        ],
        tieResolutions: [["cleric", "fighter"]],
      },
    )
    assert(order == InitiativeOrderOk(["cleric", "fighter", "ogre"]))
  }

  run test_initializeBattleState_projects_initiative_owned_turn_state = {
    val initResult = initializeBattleState(INITIAL_COMBATANTS, INITIAL_INIT)
    val battle = battleStateOrEmpty(initResult)
    all {
      assert(initResult == BattleStateOk(battle)),
      assert(participants(battle).foldl([], (acc, participant) => acc.append(participant.initiativeCount)) == [18, 12, 9]),
      assert(participants(battle).foldl([], (acc, participant) => acc.append(participant.combatant.id)) == ["fighter", "cleric", "ogre"]),
      assert(battle.round == 1),
      assert(battle.turnNumber == 1),
      assert(currentActorId(battle) == "fighter"),
      assert(battle.openPrompt == NoOpenPrompt),
      assert(battle.standardActionsRemaining == 1),
      assert(battle.nonMagicActionsRemaining == 0),
    }
  }

  run test_createInitiativeOrder_rejects_missing_participating_actor = {
    assert(
      createInitiativeOrder(
        ["fighter", "cleric", "ogre"],
        {
          initiativeCounts: [
            { actorId: "fighter", count: 18 },
            { actorId: "cleric", count: 12 },
          ],
          tieResolutions: List(),
        },
      ) ==
      InitiativeOrderInvalid("initiative counts must cover each combatant exactly once")
    )
  }

  run test_advanceBattleTurn_crosses_round_boundary_without_reordering = {
    val battle = battleStateOrEmpty(initializeBattleState(INITIAL_COMBATANTS, INITIAL_INIT))
    val afterFighter = advanceBattleTurn(battle)
    val afterCleric = advanceBattleTurn(afterFighter)
    val afterOgre = advanceBattleTurn(afterCleric)
    all {
      assert(participants(afterFighter).foldl([], (acc, participant) => acc.append(participant.combatant.id)) == ["cleric", "ogre", "fighter"]),
      assert(afterFighter.round == 1),
      assert(afterFighter.turnNumber == 2),
      assert(currentActorId(afterFighter) == "cleric"),
      assert(currentActorId(afterCleric) == "ogre"),
      assert(participants(afterOgre).foldl([], (acc, participant) => acc.append(participant.combatant.id)) == ["fighter", "cleric", "ogre"]),
      assert(afterOgre.round == 2),
      assert(afterOgre.turnNumber == 4),
      assert(currentActorId(afterOgre) == "fighter"),
    }
  }

  run test_discoverAvailableBattlePrompt_derives_choose_action_from_turn_state = {
    val battle = PROMPT_BATTLE
    assert(
      discoverAvailableBattlePrompt(battle) ==
      PromptAvailable(BPChooseAction({
        actorId: "wizard",
        options: [ATOCoreActionAttack, ATOCoreActionEndTurn, ATOUnit("fireball")],
      }))
    )
  }

  run test_answerBattlePrompt_end_turn_resolves_immediately = {
    val battle = PROMPT_BATTLE
    assert(
      answerBattlePrompt(battle, BAChooseAction(ATOCoreActionEndTurn)) ==
      AnswerResolved({
        state: battle.with("openPrompt", NoOpenPrompt),
        resolvedAction: RAEndTurn({
          actorId: "wizard",
        }),
      })
    )
  }

  run test_answerBattlePrompt_attack_opens_choose_attack_target = {
    val battle = PROMPT_BATTLE
    assert(
      answerBattlePrompt(battle, BAChooseAction(ATOCoreActionAttack)) ==
      AnswerOpened({
        state: battle.with("openPrompt", OPChooseAttackTarget),
        prompt: BPChooseAttackTarget({
          actorId: "wizard",
          availableTargetIds: ["fighter", "cleric", "ogre"],
        }),
      })
    )
  }

  run test_attack_flow_reduces_hp_and_spends_one_non_magic_action = {
    val battle = PROMPT_BATTLE
    val chooseAttack = answerBattlePrompt(battle, BAChooseAction(ATOCoreActionAttack))
    val attackPromptState = promptResultStateOrEmpty(chooseAttack)
    val resolvedAttack = answerBattlePrompt(
      attackPromptState,
      BAChooseAttackTarget({
        targetId: "ogre",
        damage: 7,
      }),
    )
    val reduced = match resolvedAttack {
      | AnswerResolved(payload) => reduceBattleState(payload.state, payload.resolvedAction)
      | _ => BattleStateReductionInvalid("attack did not resolve")
    }
    val reducedState = reducedStateOrEmpty(reduced)
    val ogreHp = match combatantById(reducedState, "ogre") {
      | FoundCombatant(combatant) => combatant.currentHp
      | _ => -1
    }
    all {
      assert(chooseAttack == AnswerOpened({
        state: attackPromptState,
        prompt: BPChooseAttackTarget({
          actorId: "wizard",
          availableTargetIds: ["fighter", "cleric", "ogre"],
        }),
      })),
      assert(reduced == BattleStateReduced(reducedState)),
      assert(ogreHp == 52),
      assert(reducedState.openPrompt == NoOpenPrompt),
      assert(reducedState.standardActionsRemaining == 0),
      assert(reducedState.nonMagicActionsRemaining == 0),
    }
  }

  run test_attack_prompt_keeps_zero_hp_target_available_in_this_slice = {
    val ogre = match combatantById(PROMPT_BATTLE, "ogre") {
      | FoundCombatant(combatant) => combatant
      | _ => EMPTY_COMBATANT
    }
    val zeroHpBattle = replaceCombatantInState(
      PROMPT_BATTLE,
      ogre.with("currentHp", 0),
    )
    assert(
      answerBattlePrompt(zeroHpBattle, BAChooseAction(ATOCoreActionAttack)) ==
      AnswerOpened({
        state: zeroHpBattle.with("openPrompt", OPChooseAttackTarget),
        prompt: BPChooseAttackTarget({
          actorId: "wizard",
          availableTargetIds: ["fighter", "cleric", "ogre"],
        }),
      })
    )
  }

  run test_cure_wounds_flow_opens_single_target_prompt_and_clamps_healing = {
    val battle = advanceBattleTurn(advanceBattleTurn(PROMPT_BATTLE))
      .with("standardActionsRemaining", 1)
      .with("nonMagicActionsRemaining", 0)
    val chooseHeal = answerBattlePrompt(battle, BAChooseAction(ATOUnit("cure_wounds")))
    val healed = match chooseHeal {
      | AnswerOpened(payload) =>
          val resolved = answerBattlePrompt(
            payload.state,
            BAChooseSingleTargetUnit({
              targetId: "cleric",
              amount: 20,
            }),
          )
          match resolved {
            | AnswerResolved(done) => reduceBattleState(done.state, done.resolvedAction)
            | _ => BattleStateReductionInvalid("heal did not resolve")
          }
      | _ => BattleStateReductionInvalid("heal prompt did not open")
    }
    val healedState = reducedStateOrEmpty(healed)
    val clericHp = match combatantById(healedState, "cleric") {
      | FoundCombatant(combatant) => combatant.currentHp
      | _ => -1
    }
    all {
      assert(
        chooseHeal ==
        AnswerOpened({
          state: battle.with("openPrompt", OPChooseSingleTargetUnit("cure_wounds")),
          prompt: BPChooseSingleTargetUnit({
            actorId: "cleric",
            unitId: "cure_wounds",
          }),
        })
      ),
      assert(healed == BattleStateReduced(healedState)),
      assert(clericHp == 18),
      assert(healedState.standardActionsRemaining == 0),
    }
  }

  run test_fireball_flow_uses_one_damage_roll_for_all_targets_and_halves_successes = {
    val battle = PROMPT_BATTLE
    val chooseFireball = answerBattlePrompt(battle, BAChooseAction(ATOUnit("fireball")))
    val burned = match chooseFireball {
      | AnswerOpened(payload) =>
          val resolved = answerBattlePrompt(
            payload.state,
            BAChooseAreaEffect({
              targetResults: [
                { targetId: "fighter", saveOutcome: SaveFailure },
                { targetId: "cleric", saveOutcome: SaveSuccess },
                { targetId: "ogre", saveOutcome: SaveFailure },
              ],
              amount: 12,
            }),
          )
          match resolved {
            | AnswerResolved(done) => reduceBattleState(done.state, done.resolvedAction)
            | _ => BattleStateReductionInvalid("area effect did not resolve")
          }
      | _ => BattleStateReductionInvalid("area prompt did not open")
    }
    val burnedState = reducedStateOrEmpty(burned)
    val fighterHp = match combatantById(burnedState, "fighter") {
      | FoundCombatant(combatant) => combatant.currentHp
      | _ => -1
    }
    val clericHp = match combatantById(burnedState, "cleric") {
      | FoundCombatant(combatant) => combatant.currentHp
      | _ => -1
    }
    val ogreHp = match combatantById(burnedState, "ogre") {
      | FoundCombatant(combatant) => combatant.currentHp
      | _ => -1
    }
    all {
      assert(
        chooseFireball ==
        AnswerOpened({
          state: battle.with("openPrompt", OPChooseAreaEffect("fireball")),
          prompt: BPChooseAreaEffect({
            actorId: "wizard",
            unitId: "fireball",
            rangeFeet: 150,
            radiusFeet: 20,
            saveAbility: Dex,
            dc: 15,
            damageType: Fire,
            onSuccess: HalfDamage,
          }),
        })
      ),
      assert(burned == BattleStateReduced(burnedState)),
      assert(fighterHp == 8),
      assert(clericHp == 3),
      assert(ogreHp == 47),
      assert(burnedState.standardActionsRemaining == 0),
    }
  }

  run test_advanceBattleTurn_clears_open_prompt_and_derives_next_actor_prompt = {
    val battle = PROMPT_BATTLE
    val opened = answerBattlePrompt(battle, BAChooseAction(ATOCoreActionAttack))
    val nextTurn = match opened {
      | AnswerOpened(payload) => advanceBattleTurn(payload.state)
      | _ => EMPTY_BATTLE_STATE
    }
    all {
      assert(currentActorId(nextTurn) == "fighter"),
      assert(nextTurn.openPrompt == NoOpenPrompt),
      assert(
        discoverAvailableBattlePrompt(nextTurn) ==
        PromptAvailable(BPChooseAction({
          actorId: "fighter",
          options: [ATOCoreActionAttack, ATOCoreActionEndTurn, ATOUnit("fighter_action_surge_l2")],
        }))
      ),
    }
  }

  run test_discoverAvailableBattlePrompt_omits_attack_when_no_legal_target_exists = {
    val soloBattle = battleStateOrEmpty(
      initializeBattleState(
        [PROMPT_COMBATANTS[2]],
        {
          initiativeCounts: [{ actorId: "wizard", count: 18 }],
          tieResolutions: List(),
        },
      ),
    )
    assert(
      discoverAvailableBattlePrompt(soloBattle) ==
      PromptAvailable(BPChooseAction({
        actorId: "wizard",
        options: [ATOCoreActionEndTurn, ATOUnit("fireball")],
      }))
    )
  }

  run test_action_surge_grants_one_restricted_non_magic_action_and_marks_unit_used = {
    val battle = advanceBattleTurn(PROMPT_BATTLE)
      .with("standardActionsRemaining", 0)
      .with("nonMagicActionsRemaining", 0)
    val granted = answerBattlePrompt(battle, BAChooseAction(ATOUnit("fighter_action_surge_l2")))
    val grantedState = match granted {
      | AnswerResolved(payload) =>
          reducedStateOrEmpty(reduceBattleState(payload.state, payload.resolvedAction))
      | _ => EMPTY_BATTLE_STATE
    }
    val fighter = match combatantById(grantedState, "fighter") {
      | FoundCombatant(combatant) => combatant
      | _ => EMPTY_COMBATANT
    }
    all {
      assert(
        granted ==
        AnswerResolved({
          state: battle.with("openPrompt", NoOpenPrompt),
          resolvedAction: RAGrantExtraAction({
            actorId: "fighter",
            unitId: "fighter_action_surge_l2",
          }),
        })
      ),
      assert(discoverAvailableBattlePrompt(grantedState) == PromptAvailable(BPChooseAction({
        actorId: "fighter",
        options: [ATOCoreActionAttack, ATOCoreActionEndTurn],
      }))),
      assert(grantedState.standardActionsRemaining == 0),
      assert(grantedState.nonMagicActionsRemaining == 1),
      assert(fighter.unitResourceStates == [{
        unitId: "fighter_action_surge_l2",
        expendedUses: 1,
        usedThisTurn: true,
      }]),
    }
  }

  run test_action_surge_keeps_level_17_second_use_available_until_turn_limit = {
    val veteranBattle = battleStateOrEmpty(
      initializeBattleState(
        PROMPT_COMBATANTS.foldl([], (acc, combatant) =>
          acc.append(
            if (combatant.id != "fighter") combatant
            else combatant
              .with("level", 17)
              .with("unitResourceStates", [{
                unitId: "fighter_action_surge_l2",
                expendedUses: 1,
                usedThisTurn: false,
              }])
          )
        ),
        PROMPT_INIT,
      )
    )
    val fighterTurnBattle = advanceBattleTurn(veteranBattle)
      .with("standardActionsRemaining", 0)
      .with("nonMagicActionsRemaining", 0)
    assert(
      discoverAvailableBattlePrompt(fighterTurnBattle) ==
      PromptAvailable(BPChooseAction({
        actorId: "fighter",
        options: [ATOCoreActionAttack, ATOCoreActionEndTurn, ATOUnit("fighter_action_surge_l2")],
      }))
    )
  }
}
