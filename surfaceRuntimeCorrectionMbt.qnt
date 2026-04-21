module surfaceRuntimeCorrectionMbt {
  import creature.* from "./creature"
  import surfaceRuntimeCorrection.* from "./surfaceRuntimeCorrection"

  pure val EMPTY_BATTLE_STATE: BattleState = {
    turnOrder: List(),
    round: 0,
    turnNumber: 0,
    openPrompt: NoOpenPrompt,
    standardActionsRemaining: 0,
    nonMagicActionsRemaining: 0,
  }

  pure val PROMPT_COMBATANTS: List[BattleCombatant] = [
    {
      id: "fighter",
      name: "Brakka",
      level: 2,
      currentHp: 20,
      maxHp: 20,
      spellSaveDc: NoSpellSaveDc,
      units: [{
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
      unitResourceStates: [{ unitId: "fighter_action_surge_l2", expendedUses: 0, usedThisTurn: false }],
    },
    {
      id: "cleric",
      name: "Mira",
      level: 3,
      currentHp: 9,
      maxHp: 18,
      spellSaveDc: HasSpellSaveDc(14),
      units: [{ unitId: "cure_wounds", semantics: BUSingleTargetHeal }],
      unitResourceStates: [{ unitId: "cure_wounds", expendedUses: 0, usedThisTurn: false }],
    },
    {
      id: "wizard",
      name: "Nyra",
      level: 5,
      currentHp: 22,
      maxHp: 22,
      spellSaveDc: HasSpellSaveDc(15),
      units: [{ unitId: "fireball", semantics: BUAreaSaveDamage({
        rangeFeet: 150,
        radiusFeet: 20,
        saveAbility: Dex,
        damageType: Fire,
      }) }],
      unitResourceStates: [{ unitId: "fireball", expendedUses: 0, usedThisTurn: false }],
    },
    {
      id: "ogre",
      name: "Ogre",
      level: 2,
      currentHp: 59,
      maxHp: 59,
      spellSaveDc: NoSpellSaveDc,
      units: List(),
      unitResourceStates: List(),
    },
  ]

  pure val PROMPT_INIT: BattleInit = {
    initiativeCounts: [
      { actorId: "wizard", count: 18 },
      { actorId: "fighter", count: 16 },
      { actorId: "cleric", count: 12 },
      { actorId: "ogre", count: 9 },
    ],
    tieResolutions: List(),
  }

  pure def promptBattle: BattleState =
    match initializeBattleState(PROMPT_COMBATANTS, PROMPT_INIT) {
      | BattleStateOk(state) => state
      | BattleStateInvalid(_) => EMPTY_BATTLE_STATE
    }

  pure val PROMPT_BATTLE: BattleState = promptBattle

  pure def reducedState(result: BattleStateReduceResult): BattleState =
    match result {
      | BattleStateReduced(state) => state
      | BattleStateReductionInvalid(_) => EMPTY_BATTLE_STATE
    }

  pure def endTurnResult(state: BattleState): PromptAnswerResult =
    answerBattlePrompt(state, BAChooseAction(ATOCoreActionEndTurn))

  pure def endTurnReduced(state: BattleState): BattleStateReduceResult = {
    val result = endTurnResult(state)
    reduceBattleState(promptState(result), resolvedAction(result))
  }

  pure val FIGHTER_PROMPT_BATTLE: BattleState =
    reducedState(endTurnReduced(PROMPT_BATTLE))

  pure val CLERIC_PROMPT_BATTLE: BattleState =
    reducedState(endTurnReduced(FIGHTER_PROMPT_BATTLE))

  pure def promptState(result: PromptAnswerResult): BattleState =
    match result {
      | AnswerResolved(payload) => payload.state
      | AnswerOpened(payload) => payload.state
      | AnswerInvalid(_) => EMPTY_BATTLE_STATE
    }

  pure def resolvedAction(result: PromptAnswerResult): ResolvedBattleAction =
    match result {
      | AnswerResolved(payload) => payload.resolvedAction
      | _ => RAEndTurn({ actorId: "" })
    }

  pure def reductionSucceeded(result: BattleStateReduceResult): bool =
    match result {
      | BattleStateReduced(_) => true
      | BattleStateReductionInvalid(_) => false
    }

  pure def abilityKey(ability: Ability): str =
    match ability {
      | Str => "str"
      | Dex => "dex"
      | Con => "con"
      | Int_ => "int"
      | Wis => "wis"
      | Cha => "cha"
    }

  pure def damageTypeKey(damageType: DamageType): str =
    match damageType {
      | Acid => "acid"
      | Bludgeoning => "bludgeoning"
      | Cold => "cold"
      | Fire => "fire"
      | Force => "force"
      | Lightning => "lightning"
      | Necrotic => "necrotic"
      | Piercing => "piercing"
      | Poison => "poison"
      | Psychic => "psychic"
      | Radiant => "radiant"
      | Slashing => "slashing"
      | Thunder => "thunder"
    }

  pure def promptTag(promptResult: PromptDiscoveryResult): str =
    match promptResult {
      | NoPromptAvailable => ""
      | PromptAvailable(prompt) =>
          match prompt {
            | BPChooseAction(_) => "chooseAction"
            | BPChooseAttackTarget(_) => "chooseAttackTarget"
            | BPChooseSingleTargetUnit(_) => "chooseSingleTargetUnit"
            | BPChooseAreaEffect(_) => "chooseAreaEffect"
          }
    }

  pure def promptActorId(promptResult: PromptDiscoveryResult): str =
    match promptResult {
      | NoPromptAvailable => ""
      | PromptAvailable(prompt) =>
          match prompt {
            | BPChooseAction(payload) => payload.actorId
            | BPChooseAttackTarget(payload) => payload.actorId
            | BPChooseSingleTargetUnit(payload) => payload.actorId
            | BPChooseAreaEffect(payload) => payload.actorId
          }
    }

  pure def promptUnitId(promptResult: PromptDiscoveryResult): str =
    match promptResult {
      | NoPromptAvailable => ""
      | PromptAvailable(prompt) =>
          match prompt {
            | BPChooseAction(_) => ""
            | BPChooseAttackTarget(_) => ""
            | BPChooseSingleTargetUnit(payload) => payload.unitId
            | BPChooseAreaEffect(payload) => payload.unitId
          }
    }

  pure def promptOptions(promptResult: PromptDiscoveryResult): List[AvailableTurnOption] =
    match promptResult {
      | NoPromptAvailable => List()
      | PromptAvailable(prompt) =>
          match prompt {
            | BPChooseAction(payload) => payload.options
            | _ => List()
          }
    }

  pure def promptAvailableTargetIds(promptResult: PromptDiscoveryResult): List[str] =
    match promptResult {
      | NoPromptAvailable => List()
      | PromptAvailable(prompt) =>
          match prompt {
            | BPChooseAttackTarget(payload) => payload.availableTargetIds
            | _ => List()
          }
    }

  pure def promptTargetingTag(promptResult: PromptDiscoveryResult): str =
    match promptResult {
      | NoPromptAvailable => ""
      | PromptAvailable(prompt) =>
          match prompt {
            | BPChooseSingleTargetUnit(_) => "touchCreature"
            | BPChooseAreaEffect(_) => "pointWithinRangeSphere"
            | _ => ""
          }
    }

  pure def promptRangeFeet(promptResult: PromptDiscoveryResult): int =
    match promptResult {
      | NoPromptAvailable => 0
      | PromptAvailable(prompt) =>
          match prompt {
            | BPChooseAreaEffect(payload) => payload.rangeFeet
            | _ => 0
          }
    }

  pure def promptRadiusFeet(promptResult: PromptDiscoveryResult): int =
    match promptResult {
      | NoPromptAvailable => 0
      | PromptAvailable(prompt) =>
          match prompt {
            | BPChooseAreaEffect(payload) => payload.radiusFeet
            | _ => 0
          }
    }

  pure def promptSaveAbility(promptResult: PromptDiscoveryResult): str =
    match promptResult {
      | NoPromptAvailable => ""
      | PromptAvailable(prompt) =>
          match prompt {
            | BPChooseAreaEffect(payload) => abilityKey(payload.saveAbility)
            | _ => ""
          }
    }

  pure def promptSaveDc(promptResult: PromptDiscoveryResult): int =
    match promptResult {
      | NoPromptAvailable => 0
      | PromptAvailable(prompt) =>
          match prompt {
            | BPChooseAreaEffect(payload) => payload.dc
            | _ => 0
          }
    }

  pure def promptEffectTag(promptResult: PromptDiscoveryResult): str =
    match promptResult {
      | NoPromptAvailable => ""
      | PromptAvailable(prompt) =>
          match prompt {
            | BPChooseSingleTargetUnit(_) => "healHp"
            | BPChooseAreaEffect(_) => "damage"
            | _ => ""
          }
    }

  pure def promptDamageType(promptResult: PromptDiscoveryResult): str =
    match promptResult {
      | NoPromptAvailable => ""
      | PromptAvailable(prompt) =>
          match prompt {
            | BPChooseAreaEffect(payload) => damageTypeKey(payload.damageType)
            | _ => ""
          }
    }

  pure def promptOnSuccess(promptResult: PromptDiscoveryResult): str =
    match promptResult {
      | NoPromptAvailable => ""
      | PromptAvailable(prompt) =>
          match prompt {
            | BPChooseAreaEffect(_) => "half"
            | _ => ""
          }
    }

  pure def outcomeTag(result: PromptAnswerResult): str =
    match result {
      | AnswerResolved(_) => "resolvedAction"
      | AnswerOpened(_) => "openedPrompt"
      | AnswerInvalid(_) => "invalid"
    }

  pure def resolvedActionTag(result: PromptAnswerResult): str =
    match result {
      | AnswerResolved(payload) =>
          match payload.resolvedAction {
            | RAEndTurn(_) => "endTurn"
            | RAAttack(_) => "attack"
            | RASingleTargetHeal(_) => "singleTargetHeal"
            | RAAreaSaveDamage(_) => "areaSaveDamage"
            | RAGrantExtraAction(_) => "grantExtraAction"
          }
      | _ => ""
    }

  pure def openedPromptTag(result: PromptAnswerResult): str =
    match result {
      | AnswerOpened(payload) => promptTag(PromptAvailable(payload.prompt))
      | _ => ""
    }

  pure def resolvedActorId(result: PromptAnswerResult): str =
    match result {
      | AnswerResolved(payload) =>
          match payload.resolvedAction {
            | RAEndTurn(resolved) => resolved.actorId
            | RAAttack(resolved) => resolved.actorId
            | RASingleTargetHeal(resolved) => resolved.actorId
            | RAAreaSaveDamage(resolved) => resolved.actorId
            | RAGrantExtraAction(resolved) => resolved.actorId
          }
      | _ => ""
    }

  pure def resolvedUnitId(result: PromptAnswerResult): str =
    match result {
      | AnswerResolved(payload) =>
          match payload.resolvedAction {
            | RAEndTurn(_) => ""
            | RAAttack(_) => ""
            | RASingleTargetHeal(resolved) => resolved.unitId
            | RAAreaSaveDamage(resolved) => resolved.unitId
            | RAGrantExtraAction(resolved) => resolved.unitId
          }
      | _ => ""
    }

  pure def resolvedTargetId(result: PromptAnswerResult): str =
    match result {
      | AnswerResolved(payload) =>
          match payload.resolvedAction {
            | RAAttack(resolved) => resolved.targetId
            | RASingleTargetHeal(resolved) => resolved.targetId
            | _ => ""
          }
      | _ => ""
    }

  pure def resolvedDamage(result: PromptAnswerResult): int =
    match result {
      | AnswerResolved(payload) =>
          match payload.resolvedAction {
            | RAAttack(resolved) => resolved.damage
            | _ => 0
          }
      | _ => 0
    }

  pure def resolvedTotal(result: PromptAnswerResult): int =
    match result {
      | AnswerResolved(payload) =>
          match payload.resolvedAction {
            | RASingleTargetHeal(resolved) => resolved.healing
            | RAAreaSaveDamage(resolved) => resolved.damage
            | _ => 0
          }
      | _ => 0
    }

  pure def resolvedTargetResults(result: PromptAnswerResult): List[AreaTargetResult] =
    match result {
      | AnswerResolved(payload) =>
          match payload.resolvedAction {
            | RAAreaSaveDamage(resolved) => resolved.targetResults
            | _ => List()
          }
      | _ => List()
    }

  pure def promptTagForBattle(battle: BattleState): str =
    promptTag(discoverAvailableBattlePrompt(battle))

  pure def promptActorIdForBattle(battle: BattleState): str =
    promptActorId(discoverAvailableBattlePrompt(battle))

  pure def promptUnitIdForBattle(battle: BattleState): str =
    promptUnitId(discoverAvailableBattlePrompt(battle))

  pure def promptOptionsForBattle(battle: BattleState): List[AvailableTurnOption] =
    promptOptions(discoverAvailableBattlePrompt(battle))

  pure def promptAvailableTargetIdsForBattle(battle: BattleState): List[str] =
    promptAvailableTargetIds(discoverAvailableBattlePrompt(battle))

  pure def promptTargetingTagForBattle(battle: BattleState): str =
    promptTargetingTag(discoverAvailableBattlePrompt(battle))

  pure def promptRangeFeetForBattle(battle: BattleState): int =
    promptRangeFeet(discoverAvailableBattlePrompt(battle))

  pure def promptRadiusFeetForBattle(battle: BattleState): int =
    promptRadiusFeet(discoverAvailableBattlePrompt(battle))

  pure def promptSaveAbilityForBattle(battle: BattleState): str =
    promptSaveAbility(discoverAvailableBattlePrompt(battle))

  pure def promptSaveDcForBattle(battle: BattleState): int =
    promptSaveDc(discoverAvailableBattlePrompt(battle))

  pure def promptEffectTagForBattle(battle: BattleState): str =
    promptEffectTag(discoverAvailableBattlePrompt(battle))

  pure def promptDamageTypeForBattle(battle: BattleState): str =
    promptDamageType(discoverAvailableBattlePrompt(battle))

  pure def promptOnSuccessForBattle(battle: BattleState): str =
    promptOnSuccess(discoverAvailableBattlePrompt(battle))

  pure def attackChoiceResult(state: BattleState): PromptAnswerResult =
    answerBattlePrompt(state, BAChooseAction(ATOCoreActionAttack))

  pure def attackTargetResult(state: BattleState): PromptAnswerResult =
    answerBattlePrompt(
      state,
      BAChooseAttackTarget({
        targetId: "ogre",
        damage: 7,
      }),
    )

  pure def attackTargetReduced(state: BattleState): BattleStateReduceResult = {
    val result = attackTargetResult(state)
    reduceBattleState(promptState(result), resolvedAction(result))
  }

  pure def fireballChoiceResult(state: BattleState): PromptAnswerResult =
    answerBattlePrompt(state, BAChooseAction(ATOUnit("fireball")))

  pure def fireballAreaResult(state: BattleState): PromptAnswerResult =
    answerBattlePrompt(
      state,
      BAChooseAreaEffect({
        targetResults: [
          { targetId: "fighter", saveOutcome: SaveFailure },
          { targetId: "cleric", saveOutcome: SaveSuccess },
          { targetId: "ogre", saveOutcome: SaveFailure },
        ],
        amount: 10,
      }),
    )

  pure def fireballAreaReduced(state: BattleState): BattleStateReduceResult = {
    val result = fireballAreaResult(state)
    reduceBattleState(promptState(result), resolvedAction(result))
  }

  pure def cureWoundsChoiceResult(state: BattleState): PromptAnswerResult =
    answerBattlePrompt(state, BAChooseAction(ATOUnit("cure_wounds")))

  pure def cureWoundsTargetResult(state: BattleState): PromptAnswerResult =
    answerBattlePrompt(
      state,
      BAChooseSingleTargetUnit({
        targetId: "fighter",
        amount: 8,
      }),
    )

  pure def cureWoundsTargetReduced(state: BattleState): BattleStateReduceResult = {
    val result = cureWoundsTargetResult(state)
    reduceBattleState(promptState(result), resolvedAction(result))
  }

  pure def actionSurgeResult(state: BattleState): PromptAnswerResult =
    answerBattlePrompt(state, BAChooseAction(ATOUnit("fighter_action_surge_l2")))

  pure def actionSurgeReduced(state: BattleState): BattleStateReduceResult = {
    val result = actionSurgeResult(state)
    reduceBattleState(promptState(result), resolvedAction(result))
  }

  var srcBattle: BattleState
  var srcPromptTag: str
  var srcPromptActorId: str
  var srcPromptUnitId: str
  var srcPromptOptions: List[AvailableTurnOption]
  var srcPromptAvailableTargetIds: List[str]
  var srcPromptTargetingTag: str
  var srcPromptRangeFeet: int
  var srcPromptRadiusFeet: int
  var srcPromptSaveAbility: str
  var srcPromptSaveDc: int
  var srcPromptEffectTag: str
  var srcPromptDamageType: str
  var srcPromptOnSuccess: str
  var srcLastOutcomeTag: str
  var srcLastResolvedActionTag: str
  var srcLastResolvedActorId: str
  var srcLastResolvedUnitId: str
  var srcLastResolvedTargetId: str
  var srcLastResolvedDamage: int
  var srcLastResolvedTotal: int
  var srcLastResolvedTargetResults: List[AreaTargetResult]
  var srcLastOpenedPromptTag: str

  action srcInit = all {
    srcBattle' = PROMPT_BATTLE,
    srcPromptTag' = promptTagForBattle(PROMPT_BATTLE),
    srcPromptActorId' = promptActorIdForBattle(PROMPT_BATTLE),
    srcPromptUnitId' = promptUnitIdForBattle(PROMPT_BATTLE),
    srcPromptOptions' = promptOptionsForBattle(PROMPT_BATTLE),
    srcPromptAvailableTargetIds' = promptAvailableTargetIdsForBattle(PROMPT_BATTLE),
    srcPromptTargetingTag' = promptTargetingTagForBattle(PROMPT_BATTLE),
    srcPromptRangeFeet' = promptRangeFeetForBattle(PROMPT_BATTLE),
    srcPromptRadiusFeet' = promptRadiusFeetForBattle(PROMPT_BATTLE),
    srcPromptSaveAbility' = promptSaveAbilityForBattle(PROMPT_BATTLE),
    srcPromptSaveDc' = promptSaveDcForBattle(PROMPT_BATTLE),
    srcPromptEffectTag' = promptEffectTagForBattle(PROMPT_BATTLE),
    srcPromptDamageType' = promptDamageTypeForBattle(PROMPT_BATTLE),
    srcPromptOnSuccess' = promptOnSuccessForBattle(PROMPT_BATTLE),
    srcLastOutcomeTag' = "",
    srcLastResolvedActionTag' = "",
    srcLastResolvedActorId' = "",
    srcLastResolvedUnitId' = "",
    srcLastResolvedTargetId' = "",
    srcLastResolvedDamage' = 0,
    srcLastResolvedTotal' = 0,
    srcLastResolvedTargetResults' = List(),
    srcLastOpenedPromptTag' = "",
  }

  action srcInitClericTurn = all {
    srcBattle' = CLERIC_PROMPT_BATTLE,
    srcPromptTag' = promptTagForBattle(CLERIC_PROMPT_BATTLE),
    srcPromptActorId' = promptActorIdForBattle(CLERIC_PROMPT_BATTLE),
    srcPromptUnitId' = promptUnitIdForBattle(CLERIC_PROMPT_BATTLE),
    srcPromptOptions' = promptOptionsForBattle(CLERIC_PROMPT_BATTLE),
    srcPromptAvailableTargetIds' = promptAvailableTargetIdsForBattle(CLERIC_PROMPT_BATTLE),
    srcPromptTargetingTag' = promptTargetingTagForBattle(CLERIC_PROMPT_BATTLE),
    srcPromptRangeFeet' = promptRangeFeetForBattle(CLERIC_PROMPT_BATTLE),
    srcPromptRadiusFeet' = promptRadiusFeetForBattle(CLERIC_PROMPT_BATTLE),
    srcPromptSaveAbility' = promptSaveAbilityForBattle(CLERIC_PROMPT_BATTLE),
    srcPromptSaveDc' = promptSaveDcForBattle(CLERIC_PROMPT_BATTLE),
    srcPromptEffectTag' = promptEffectTagForBattle(CLERIC_PROMPT_BATTLE),
    srcPromptDamageType' = promptDamageTypeForBattle(CLERIC_PROMPT_BATTLE),
    srcPromptOnSuccess' = promptOnSuccessForBattle(CLERIC_PROMPT_BATTLE),
    srcLastOutcomeTag' = "",
    srcLastResolvedActionTag' = "",
    srcLastResolvedActorId' = "",
    srcLastResolvedUnitId' = "",
    srcLastResolvedTargetId' = "",
    srcLastResolvedDamage' = 0,
    srcLastResolvedTotal' = 0,
    srcLastResolvedTargetResults' = List(),
    srcLastOpenedPromptTag' = "",
  }

  action srcChooseEndTurn = all {
    srcPromptTag == "chooseAction",
    outcomeTag(endTurnResult(srcBattle)) == "resolvedAction",
    resolvedActionTag(endTurnResult(srcBattle)) == "endTurn",
    reductionSucceeded(endTurnReduced(srcBattle)),
    srcBattle' = reducedState(endTurnReduced(srcBattle)),
    srcPromptTag' = promptTagForBattle(reducedState(endTurnReduced(srcBattle))),
    srcPromptActorId' = promptActorIdForBattle(reducedState(endTurnReduced(srcBattle))),
    srcPromptUnitId' = promptUnitIdForBattle(reducedState(endTurnReduced(srcBattle))),
    srcPromptOptions' = promptOptionsForBattle(reducedState(endTurnReduced(srcBattle))),
    srcPromptAvailableTargetIds' = promptAvailableTargetIdsForBattle(reducedState(endTurnReduced(srcBattle))),
    srcPromptTargetingTag' = promptTargetingTagForBattle(reducedState(endTurnReduced(srcBattle))),
    srcPromptRangeFeet' = promptRangeFeetForBattle(reducedState(endTurnReduced(srcBattle))),
    srcPromptRadiusFeet' = promptRadiusFeetForBattle(reducedState(endTurnReduced(srcBattle))),
    srcPromptSaveAbility' = promptSaveAbilityForBattle(reducedState(endTurnReduced(srcBattle))),
    srcPromptSaveDc' = promptSaveDcForBattle(reducedState(endTurnReduced(srcBattle))),
    srcPromptEffectTag' = promptEffectTagForBattle(reducedState(endTurnReduced(srcBattle))),
    srcPromptDamageType' = promptDamageTypeForBattle(reducedState(endTurnReduced(srcBattle))),
    srcPromptOnSuccess' = promptOnSuccessForBattle(reducedState(endTurnReduced(srcBattle))),
    srcLastOutcomeTag' = outcomeTag(endTurnResult(srcBattle)),
    srcLastResolvedActionTag' = resolvedActionTag(endTurnResult(srcBattle)),
    srcLastResolvedActorId' = resolvedActorId(endTurnResult(srcBattle)),
    srcLastResolvedUnitId' = resolvedUnitId(endTurnResult(srcBattle)),
    srcLastResolvedTargetId' = resolvedTargetId(endTurnResult(srcBattle)),
    srcLastResolvedDamage' = resolvedDamage(endTurnResult(srcBattle)),
    srcLastResolvedTotal' = resolvedTotal(endTurnResult(srcBattle)),
    srcLastResolvedTargetResults' = resolvedTargetResults(endTurnResult(srcBattle)),
    srcLastOpenedPromptTag' = openedPromptTag(endTurnResult(srcBattle)),
  }

  action srcChooseAttack = all {
    srcPromptTag == "chooseAction",
    outcomeTag(attackChoiceResult(srcBattle)) == "openedPrompt",
    openedPromptTag(attackChoiceResult(srcBattle)) == "chooseAttackTarget",
    srcBattle' = promptState(attackChoiceResult(srcBattle)),
    srcPromptTag' = promptTagForBattle(promptState(attackChoiceResult(srcBattle))),
    srcPromptActorId' = promptActorIdForBattle(promptState(attackChoiceResult(srcBattle))),
    srcPromptUnitId' = promptUnitIdForBattle(promptState(attackChoiceResult(srcBattle))),
    srcPromptOptions' = promptOptionsForBattle(promptState(attackChoiceResult(srcBattle))),
    srcPromptAvailableTargetIds' = promptAvailableTargetIdsForBattle(promptState(attackChoiceResult(srcBattle))),
    srcPromptTargetingTag' = promptTargetingTagForBattle(promptState(attackChoiceResult(srcBattle))),
    srcPromptRangeFeet' = promptRangeFeetForBattle(promptState(attackChoiceResult(srcBattle))),
    srcPromptRadiusFeet' = promptRadiusFeetForBattle(promptState(attackChoiceResult(srcBattle))),
    srcPromptSaveAbility' = promptSaveAbilityForBattle(promptState(attackChoiceResult(srcBattle))),
    srcPromptSaveDc' = promptSaveDcForBattle(promptState(attackChoiceResult(srcBattle))),
    srcPromptEffectTag' = promptEffectTagForBattle(promptState(attackChoiceResult(srcBattle))),
    srcPromptDamageType' = promptDamageTypeForBattle(promptState(attackChoiceResult(srcBattle))),
    srcPromptOnSuccess' = promptOnSuccessForBattle(promptState(attackChoiceResult(srcBattle))),
    srcLastOutcomeTag' = outcomeTag(attackChoiceResult(srcBattle)),
    srcLastResolvedActionTag' = resolvedActionTag(attackChoiceResult(srcBattle)),
    srcLastResolvedActorId' = resolvedActorId(attackChoiceResult(srcBattle)),
    srcLastResolvedUnitId' = resolvedUnitId(attackChoiceResult(srcBattle)),
    srcLastResolvedTargetId' = resolvedTargetId(attackChoiceResult(srcBattle)),
    srcLastResolvedDamage' = resolvedDamage(attackChoiceResult(srcBattle)),
    srcLastResolvedTotal' = resolvedTotal(attackChoiceResult(srcBattle)),
    srcLastResolvedTargetResults' = resolvedTargetResults(attackChoiceResult(srcBattle)),
    srcLastOpenedPromptTag' = openedPromptTag(attackChoiceResult(srcBattle)),
  }

  action srcAnswerAttackTarget = all {
    srcPromptTag == "chooseAttackTarget",
    outcomeTag(attackTargetResult(srcBattle)) == "resolvedAction",
    resolvedActionTag(attackTargetResult(srcBattle)) == "attack",
    reductionSucceeded(attackTargetReduced(srcBattle)),
    srcBattle' = reducedState(attackTargetReduced(srcBattle)),
    srcPromptTag' = promptTagForBattle(reducedState(attackTargetReduced(srcBattle))),
    srcPromptActorId' = promptActorIdForBattle(reducedState(attackTargetReduced(srcBattle))),
    srcPromptUnitId' = promptUnitIdForBattle(reducedState(attackTargetReduced(srcBattle))),
    srcPromptOptions' = promptOptionsForBattle(reducedState(attackTargetReduced(srcBattle))),
    srcPromptAvailableTargetIds' = promptAvailableTargetIdsForBattle(reducedState(attackTargetReduced(srcBattle))),
    srcPromptTargetingTag' = promptTargetingTagForBattle(reducedState(attackTargetReduced(srcBattle))),
    srcPromptRangeFeet' = promptRangeFeetForBattle(reducedState(attackTargetReduced(srcBattle))),
    srcPromptRadiusFeet' = promptRadiusFeetForBattle(reducedState(attackTargetReduced(srcBattle))),
    srcPromptSaveAbility' = promptSaveAbilityForBattle(reducedState(attackTargetReduced(srcBattle))),
    srcPromptSaveDc' = promptSaveDcForBattle(reducedState(attackTargetReduced(srcBattle))),
    srcPromptEffectTag' = promptEffectTagForBattle(reducedState(attackTargetReduced(srcBattle))),
    srcPromptDamageType' = promptDamageTypeForBattle(reducedState(attackTargetReduced(srcBattle))),
    srcPromptOnSuccess' = promptOnSuccessForBattle(reducedState(attackTargetReduced(srcBattle))),
    srcLastOutcomeTag' = outcomeTag(attackTargetResult(srcBattle)),
    srcLastResolvedActionTag' = resolvedActionTag(attackTargetResult(srcBattle)),
    srcLastResolvedActorId' = resolvedActorId(attackTargetResult(srcBattle)),
    srcLastResolvedUnitId' = resolvedUnitId(attackTargetResult(srcBattle)),
    srcLastResolvedTargetId' = resolvedTargetId(attackTargetResult(srcBattle)),
    srcLastResolvedDamage' = resolvedDamage(attackTargetResult(srcBattle)),
    srcLastResolvedTotal' = resolvedTotal(attackTargetResult(srcBattle)),
    srcLastResolvedTargetResults' = resolvedTargetResults(attackTargetResult(srcBattle)),
    srcLastOpenedPromptTag' = openedPromptTag(attackTargetResult(srcBattle)),
  }

  action srcChooseFireball = all {
    srcPromptTag == "chooseAction",
    outcomeTag(fireballChoiceResult(srcBattle)) == "openedPrompt",
    openedPromptTag(fireballChoiceResult(srcBattle)) == "chooseAreaEffect",
    srcBattle' = promptState(fireballChoiceResult(srcBattle)),
    srcPromptTag' = promptTagForBattle(promptState(fireballChoiceResult(srcBattle))),
    srcPromptActorId' = promptActorIdForBattle(promptState(fireballChoiceResult(srcBattle))),
    srcPromptUnitId' = promptUnitIdForBattle(promptState(fireballChoiceResult(srcBattle))),
    srcPromptOptions' = promptOptionsForBattle(promptState(fireballChoiceResult(srcBattle))),
    srcPromptAvailableTargetIds' = promptAvailableTargetIdsForBattle(promptState(fireballChoiceResult(srcBattle))),
    srcPromptTargetingTag' = promptTargetingTagForBattle(promptState(fireballChoiceResult(srcBattle))),
    srcPromptRangeFeet' = promptRangeFeetForBattle(promptState(fireballChoiceResult(srcBattle))),
    srcPromptRadiusFeet' = promptRadiusFeetForBattle(promptState(fireballChoiceResult(srcBattle))),
    srcPromptSaveAbility' = promptSaveAbilityForBattle(promptState(fireballChoiceResult(srcBattle))),
    srcPromptSaveDc' = promptSaveDcForBattle(promptState(fireballChoiceResult(srcBattle))),
    srcPromptEffectTag' = promptEffectTagForBattle(promptState(fireballChoiceResult(srcBattle))),
    srcPromptDamageType' = promptDamageTypeForBattle(promptState(fireballChoiceResult(srcBattle))),
    srcPromptOnSuccess' = promptOnSuccessForBattle(promptState(fireballChoiceResult(srcBattle))),
    srcLastOutcomeTag' = outcomeTag(fireballChoiceResult(srcBattle)),
    srcLastResolvedActionTag' = resolvedActionTag(fireballChoiceResult(srcBattle)),
    srcLastResolvedActorId' = resolvedActorId(fireballChoiceResult(srcBattle)),
    srcLastResolvedUnitId' = resolvedUnitId(fireballChoiceResult(srcBattle)),
    srcLastResolvedTargetId' = resolvedTargetId(fireballChoiceResult(srcBattle)),
    srcLastResolvedDamage' = resolvedDamage(fireballChoiceResult(srcBattle)),
    srcLastResolvedTotal' = resolvedTotal(fireballChoiceResult(srcBattle)),
    srcLastResolvedTargetResults' = resolvedTargetResults(fireballChoiceResult(srcBattle)),
    srcLastOpenedPromptTag' = openedPromptTag(fireballChoiceResult(srcBattle)),
  }

  action srcAnswerAreaEffect = all {
    srcPromptTag == "chooseAreaEffect",
    srcPromptUnitId == "fireball",
    outcomeTag(fireballAreaResult(srcBattle)) == "resolvedAction",
    resolvedActionTag(fireballAreaResult(srcBattle)) == "areaSaveDamage",
    reductionSucceeded(fireballAreaReduced(srcBattle)),
    srcBattle' = reducedState(fireballAreaReduced(srcBattle)),
    srcPromptTag' = promptTagForBattle(reducedState(fireballAreaReduced(srcBattle))),
    srcPromptActorId' = promptActorIdForBattle(reducedState(fireballAreaReduced(srcBattle))),
    srcPromptUnitId' = promptUnitIdForBattle(reducedState(fireballAreaReduced(srcBattle))),
    srcPromptOptions' = promptOptionsForBattle(reducedState(fireballAreaReduced(srcBattle))),
    srcPromptAvailableTargetIds' = promptAvailableTargetIdsForBattle(reducedState(fireballAreaReduced(srcBattle))),
    srcPromptTargetingTag' = promptTargetingTagForBattle(reducedState(fireballAreaReduced(srcBattle))),
    srcPromptRangeFeet' = promptRangeFeetForBattle(reducedState(fireballAreaReduced(srcBattle))),
    srcPromptRadiusFeet' = promptRadiusFeetForBattle(reducedState(fireballAreaReduced(srcBattle))),
    srcPromptSaveAbility' = promptSaveAbilityForBattle(reducedState(fireballAreaReduced(srcBattle))),
    srcPromptSaveDc' = promptSaveDcForBattle(reducedState(fireballAreaReduced(srcBattle))),
    srcPromptEffectTag' = promptEffectTagForBattle(reducedState(fireballAreaReduced(srcBattle))),
    srcPromptDamageType' = promptDamageTypeForBattle(reducedState(fireballAreaReduced(srcBattle))),
    srcPromptOnSuccess' = promptOnSuccessForBattle(reducedState(fireballAreaReduced(srcBattle))),
    srcLastOutcomeTag' = outcomeTag(fireballAreaResult(srcBattle)),
    srcLastResolvedActionTag' = resolvedActionTag(fireballAreaResult(srcBattle)),
    srcLastResolvedActorId' = resolvedActorId(fireballAreaResult(srcBattle)),
    srcLastResolvedUnitId' = resolvedUnitId(fireballAreaResult(srcBattle)),
    srcLastResolvedTargetId' = resolvedTargetId(fireballAreaResult(srcBattle)),
    srcLastResolvedDamage' = resolvedDamage(fireballAreaResult(srcBattle)),
    srcLastResolvedTotal' = resolvedTotal(fireballAreaResult(srcBattle)),
    srcLastResolvedTargetResults' = resolvedTargetResults(fireballAreaResult(srcBattle)),
    srcLastOpenedPromptTag' = openedPromptTag(fireballAreaResult(srcBattle)),
  }

  action srcChooseCureWounds = all {
    srcPromptTag == "chooseAction",
    outcomeTag(cureWoundsChoiceResult(srcBattle)) == "openedPrompt",
    openedPromptTag(cureWoundsChoiceResult(srcBattle)) == "chooseSingleTargetUnit",
    srcBattle' = promptState(cureWoundsChoiceResult(srcBattle)),
    srcPromptTag' = promptTagForBattle(promptState(cureWoundsChoiceResult(srcBattle))),
    srcPromptActorId' = promptActorIdForBattle(promptState(cureWoundsChoiceResult(srcBattle))),
    srcPromptUnitId' = promptUnitIdForBattle(promptState(cureWoundsChoiceResult(srcBattle))),
    srcPromptOptions' = promptOptionsForBattle(promptState(cureWoundsChoiceResult(srcBattle))),
    srcPromptAvailableTargetIds' = promptAvailableTargetIdsForBattle(promptState(cureWoundsChoiceResult(srcBattle))),
    srcPromptTargetingTag' = promptTargetingTagForBattle(promptState(cureWoundsChoiceResult(srcBattle))),
    srcPromptRangeFeet' = promptRangeFeetForBattle(promptState(cureWoundsChoiceResult(srcBattle))),
    srcPromptRadiusFeet' = promptRadiusFeetForBattle(promptState(cureWoundsChoiceResult(srcBattle))),
    srcPromptSaveAbility' = promptSaveAbilityForBattle(promptState(cureWoundsChoiceResult(srcBattle))),
    srcPromptSaveDc' = promptSaveDcForBattle(promptState(cureWoundsChoiceResult(srcBattle))),
    srcPromptEffectTag' = promptEffectTagForBattle(promptState(cureWoundsChoiceResult(srcBattle))),
    srcPromptDamageType' = promptDamageTypeForBattle(promptState(cureWoundsChoiceResult(srcBattle))),
    srcPromptOnSuccess' = promptOnSuccessForBattle(promptState(cureWoundsChoiceResult(srcBattle))),
    srcLastOutcomeTag' = outcomeTag(cureWoundsChoiceResult(srcBattle)),
    srcLastResolvedActionTag' = resolvedActionTag(cureWoundsChoiceResult(srcBattle)),
    srcLastResolvedActorId' = resolvedActorId(cureWoundsChoiceResult(srcBattle)),
    srcLastResolvedUnitId' = resolvedUnitId(cureWoundsChoiceResult(srcBattle)),
    srcLastResolvedTargetId' = resolvedTargetId(cureWoundsChoiceResult(srcBattle)),
    srcLastResolvedDamage' = resolvedDamage(cureWoundsChoiceResult(srcBattle)),
    srcLastResolvedTotal' = resolvedTotal(cureWoundsChoiceResult(srcBattle)),
    srcLastResolvedTargetResults' = resolvedTargetResults(cureWoundsChoiceResult(srcBattle)),
    srcLastOpenedPromptTag' = openedPromptTag(cureWoundsChoiceResult(srcBattle)),
  }

  action srcAnswerSingleTargetUnit = all {
    srcPromptTag == "chooseSingleTargetUnit",
    srcPromptUnitId == "cure_wounds",
    outcomeTag(cureWoundsTargetResult(srcBattle)) == "resolvedAction",
    resolvedActionTag(cureWoundsTargetResult(srcBattle)) == "singleTargetHeal",
    reductionSucceeded(cureWoundsTargetReduced(srcBattle)),
    srcBattle' = reducedState(cureWoundsTargetReduced(srcBattle)),
    srcPromptTag' = promptTagForBattle(reducedState(cureWoundsTargetReduced(srcBattle))),
    srcPromptActorId' = promptActorIdForBattle(reducedState(cureWoundsTargetReduced(srcBattle))),
    srcPromptUnitId' = promptUnitIdForBattle(reducedState(cureWoundsTargetReduced(srcBattle))),
    srcPromptOptions' = promptOptionsForBattle(reducedState(cureWoundsTargetReduced(srcBattle))),
    srcPromptAvailableTargetIds' = promptAvailableTargetIdsForBattle(reducedState(cureWoundsTargetReduced(srcBattle))),
    srcPromptTargetingTag' = promptTargetingTagForBattle(reducedState(cureWoundsTargetReduced(srcBattle))),
    srcPromptRangeFeet' = promptRangeFeetForBattle(reducedState(cureWoundsTargetReduced(srcBattle))),
    srcPromptRadiusFeet' = promptRadiusFeetForBattle(reducedState(cureWoundsTargetReduced(srcBattle))),
    srcPromptSaveAbility' = promptSaveAbilityForBattle(reducedState(cureWoundsTargetReduced(srcBattle))),
    srcPromptSaveDc' = promptSaveDcForBattle(reducedState(cureWoundsTargetReduced(srcBattle))),
    srcPromptEffectTag' = promptEffectTagForBattle(reducedState(cureWoundsTargetReduced(srcBattle))),
    srcPromptDamageType' = promptDamageTypeForBattle(reducedState(cureWoundsTargetReduced(srcBattle))),
    srcPromptOnSuccess' = promptOnSuccessForBattle(reducedState(cureWoundsTargetReduced(srcBattle))),
    srcLastOutcomeTag' = outcomeTag(cureWoundsTargetResult(srcBattle)),
    srcLastResolvedActionTag' = resolvedActionTag(cureWoundsTargetResult(srcBattle)),
    srcLastResolvedActorId' = resolvedActorId(cureWoundsTargetResult(srcBattle)),
    srcLastResolvedUnitId' = resolvedUnitId(cureWoundsTargetResult(srcBattle)),
    srcLastResolvedTargetId' = resolvedTargetId(cureWoundsTargetResult(srcBattle)),
    srcLastResolvedDamage' = resolvedDamage(cureWoundsTargetResult(srcBattle)),
    srcLastResolvedTotal' = resolvedTotal(cureWoundsTargetResult(srcBattle)),
    srcLastResolvedTargetResults' = resolvedTargetResults(cureWoundsTargetResult(srcBattle)),
    srcLastOpenedPromptTag' = openedPromptTag(cureWoundsTargetResult(srcBattle)),
  }

  action srcChooseActionSurge = all {
    srcPromptTag == "chooseAction",
    outcomeTag(actionSurgeResult(srcBattle)) == "resolvedAction",
    resolvedActionTag(actionSurgeResult(srcBattle)) == "grantExtraAction",
    reductionSucceeded(actionSurgeReduced(srcBattle)),
    srcBattle' = reducedState(actionSurgeReduced(srcBattle)),
    srcPromptTag' = promptTagForBattle(reducedState(actionSurgeReduced(srcBattle))),
    srcPromptActorId' = promptActorIdForBattle(reducedState(actionSurgeReduced(srcBattle))),
    srcPromptUnitId' = promptUnitIdForBattle(reducedState(actionSurgeReduced(srcBattle))),
    srcPromptOptions' = promptOptionsForBattle(reducedState(actionSurgeReduced(srcBattle))),
    srcPromptAvailableTargetIds' = promptAvailableTargetIdsForBattle(reducedState(actionSurgeReduced(srcBattle))),
    srcPromptTargetingTag' = promptTargetingTagForBattle(reducedState(actionSurgeReduced(srcBattle))),
    srcPromptRangeFeet' = promptRangeFeetForBattle(reducedState(actionSurgeReduced(srcBattle))),
    srcPromptRadiusFeet' = promptRadiusFeetForBattle(reducedState(actionSurgeReduced(srcBattle))),
    srcPromptSaveAbility' = promptSaveAbilityForBattle(reducedState(actionSurgeReduced(srcBattle))),
    srcPromptSaveDc' = promptSaveDcForBattle(reducedState(actionSurgeReduced(srcBattle))),
    srcPromptEffectTag' = promptEffectTagForBattle(reducedState(actionSurgeReduced(srcBattle))),
    srcPromptDamageType' = promptDamageTypeForBattle(reducedState(actionSurgeReduced(srcBattle))),
    srcPromptOnSuccess' = promptOnSuccessForBattle(reducedState(actionSurgeReduced(srcBattle))),
    srcLastOutcomeTag' = outcomeTag(actionSurgeResult(srcBattle)),
    srcLastResolvedActionTag' = resolvedActionTag(actionSurgeResult(srcBattle)),
    srcLastResolvedActorId' = resolvedActorId(actionSurgeResult(srcBattle)),
    srcLastResolvedUnitId' = resolvedUnitId(actionSurgeResult(srcBattle)),
    srcLastResolvedTargetId' = resolvedTargetId(actionSurgeResult(srcBattle)),
    srcLastResolvedDamage' = resolvedDamage(actionSurgeResult(srcBattle)),
    srcLastResolvedTotal' = resolvedTotal(actionSurgeResult(srcBattle)),
    srcLastResolvedTargetResults' = resolvedTargetResults(actionSurgeResult(srcBattle)),
    srcLastOpenedPromptTag' = openedPromptTag(actionSurgeResult(srcBattle)),
  }

  action srcStep = any {
    srcChooseEndTurn,
    srcChooseAttack,
    srcAnswerAttackTarget,
    srcChooseFireball,
    srcAnswerAreaEffect,
    srcChooseCureWounds,
    srcAnswerSingleTargetUnit,
    srcChooseActionSurge,
  }
}
