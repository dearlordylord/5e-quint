module surfaceRuntimeCorrection {
  import creature.* from "./creature"

  type CreatureId = str
  type BattleUnitId = str

  type SpellSaveDc =
    | NoSpellSaveDc
    | HasSpellSaveDc(int)

  type ExtraActionRestriction =
    | EARNone
    | EARExcludeMagic

  type UsageLimit =
    | ULNone
    | ULOncePerTurn

  type UseCountCap =
    | FixedUseCountCap(int)
    | TieredUseCountCap({
        base: int,
        atLevel: int,
        upgradedValue: int,
      })

  type SupportedBattleUnit =
    | BUSingleTargetHeal
    | BUAreaSaveDamage({
        rangeFeet: int,
        radiusFeet: int,
        saveAbility: Ability,
        damageType: DamageType,
      })
    | BUGrantExtraAction({
        restriction: ExtraActionRestriction,
        useCountCap: UseCountCap,
        usageLimit: UsageLimit,
      })

  type BattleUnitAccess = {
    unitId: BattleUnitId,
    semantics: SupportedBattleUnit,
  }

  type BattleUnitResourceState = {
    unitId: BattleUnitId,
    expendedUses: int,
    usedThisTurn: bool,
  }

  type BattleCombatant = {
    id: CreatureId,
    name: str,
    level: int,
    currentHp: int,
    maxHp: int,
    spellSaveDc: SpellSaveDc,
    units: List[BattleUnitAccess],
    unitResourceStates: List[BattleUnitResourceState],
  }

  type BattleParticipant = {
    combatant: BattleCombatant,
    initiativeCount: int,
    projectionOrder: int,
  }

  type BattleInitiativeCount = {
    actorId: CreatureId,
    count: int,
  }

  type BattleInit = {
    initiativeCounts: List[BattleInitiativeCount],
    tieResolutions: List[List[CreatureId]],
  }

  type AvailableTurnOption =
    | ATOCoreActionAttack
    | ATOCoreActionEndTurn
    | ATOUnit(BattleUnitId)

  type OpenPromptState =
    | NoOpenPrompt
    | OPChooseAttackTarget
    | OPChooseSingleTargetUnit(BattleUnitId)
    | OPChooseAreaEffect(BattleUnitId)

  type HalfDamageOnSuccess = | HalfDamage

  type AvailableBattlePrompt =
    | BPChooseAction({
        actorId: CreatureId,
        options: List[AvailableTurnOption],
      })
    | BPChooseAttackTarget({
        actorId: CreatureId,
        availableTargetIds: List[CreatureId],
      })
    | BPChooseSingleTargetUnit({
        actorId: CreatureId,
        unitId: BattleUnitId,
      })
    | BPChooseAreaEffect({
        actorId: CreatureId,
        unitId: BattleUnitId,
        rangeFeet: int,
        radiusFeet: int,
        saveAbility: Ability,
        dc: int,
        damageType: DamageType,
        onSuccess: HalfDamageOnSuccess,
      })

  type SaveOutcome =
    | SaveSuccess
    | SaveFailure

  type AreaTargetResult = {
    targetId: CreatureId,
    saveOutcome: SaveOutcome,
  }

  type BattlePromptAnswer =
    | BAChooseAction(AvailableTurnOption)
    | BAChooseAttackTarget({
        targetId: CreatureId,
        damage: int,
      })
    | BAChooseSingleTargetUnit({
        targetId: CreatureId,
        amount: int,
      })
    | BAChooseAreaEffect({
        targetResults: List[AreaTargetResult],
        amount: int,
      })

  type EndTurnAction = {
    actorId: CreatureId,
  }

  type AttackAction = {
    actorId: CreatureId,
    targetId: CreatureId,
    damage: int,
  }

  type SingleTargetHealAction = {
    actorId: CreatureId,
    unitId: BattleUnitId,
    targetId: CreatureId,
    healing: int,
  }

  type AreaSaveDamageAction = {
    actorId: CreatureId,
    unitId: BattleUnitId,
    targetResults: List[AreaTargetResult],
    damage: int,
  }

  type GrantExtraActionAction = {
    actorId: CreatureId,
    unitId: BattleUnitId,
  }

  type ResolvedBattleAction =
    | RAEndTurn(EndTurnAction)
    | RAAttack(AttackAction)
    | RASingleTargetHeal(SingleTargetHealAction)
    | RAAreaSaveDamage(AreaSaveDamageAction)
    | RAGrantExtraAction(GrantExtraActionAction)

  type BattleState = {
    currentParticipant: BattleParticipant,
    waitingParticipants: List[BattleParticipant],
    round: int,
    turnNumber: int,
    openPrompt: OpenPromptState,
    standardActionsRemaining: int,
    nonMagicActionsRemaining: int,
  }

  type InitiativeOrderResult =
    | InitiativeOrderOk(List[CreatureId])
    | InitiativeOrderInvalid(str)

  type BattleStateInitResult =
    | BattleStateOk(BattleState)
    | BattleStateInvalid(str)

  type ResolvedPromptPayload = {
    state: BattleState,
    resolvedAction: ResolvedBattleAction,
  }

  type OpenedPromptPayload = {
    state: BattleState,
    prompt: AvailableBattlePrompt,
  }

  type PromptDiscoveryResult =
    | NoPromptAvailable
    | PromptAvailable(AvailableBattlePrompt)

  type PromptDerivationResult =
    | PromptDerived(AvailableBattlePrompt)
    | PromptDerivationInvalid(str)

  type PromptAnswerResult =
    | AnswerResolved(ResolvedPromptPayload)
    | AnswerOpened(OpenedPromptPayload)
    | AnswerInvalid(str)

  type BattleStateReduceResult =
    | BattleStateReduced(BattleState)
    | BattleStateReductionInvalid(str)

  type MaybeBattleCombatant =
    | NoCombatant
    | FoundCombatant(BattleCombatant)

  type MaybeBattleUnit =
    | NoUnit
    | FoundUnit(BattleUnitAccess)

  type MaybeBattleUnitResourceState =
    | NoUnitResourceState
    | FoundUnitResourceState(BattleUnitResourceState)

  pure def listToSet(lst: List[a]): Set[a] =
    lst.foldl(Set(), (acc, entry) => acc.union(Set(entry)))

  pure def listContains(lst: List[a], needle: a): bool =
    lst.select(entry => entry == needle).length() > 0

  pure def allDistinct(lst: List[a]): bool =
    lst.foldl(true, (acc, entry) => acc and lst.select(candidate => candidate == entry).length() == 1)

  pure def listIndexOf(lst: List[a], needle: a): int =
    if (lst.length() == 0) -1
    else 0.to(lst.length() - 1).fold(-1, (acc, idx) =>
      if (acc != -1) acc
      else if (lst[idx] == needle) idx
      else -1
    )

  pure def sameActorSet(left: List[CreatureId], right: List[CreatureId]): bool =
    left.length() == right.length()
      and left.foldl(true, (acc, actorId) => acc and listContains(right, actorId))

  pure def currentCombatant(state: BattleState): BattleCombatant =
    state.currentParticipant.combatant

  pure def combatantById(state: BattleState, actorId: CreatureId): MaybeBattleCombatant = {
    val matches = [state.currentParticipant].concat(state.waitingParticipants)
      .select(participant => participant.combatant.id == actorId)
    if (matches.length() == 0) NoCombatant else FoundCombatant(matches[0].combatant)
  }

  pure def unitById(combatant: BattleCombatant, unitId: BattleUnitId): MaybeBattleUnit = {
    val matches = combatant.units.select(unit => unit.unitId == unitId)
    if (matches.length() == 0) NoUnit else FoundUnit(matches[0])
  }

  pure def unitResourceStateById(
    combatant: BattleCombatant,
    unitId: BattleUnitId,
  ): MaybeBattleUnitResourceState = {
    val matches = combatant.unitResourceStates.select(resourceState => resourceState.unitId == unitId)
    if (matches.length() == 0) NoUnitResourceState else FoundUnitResourceState(matches[0])
  }

  pure def clampHp(nextHp: int, maxHp: int): int =
    if (nextHp < 0) 0
    else if (nextHp > maxHp) maxHp
    else nextHp

  pure def clearOpenPrompt(state: BattleState): BattleState =
    state.with("openPrompt", NoOpenPrompt)

  pure def stateWithOpenPrompt(state: BattleState, openPrompt: OpenPromptState): BattleState =
    state.with("openPrompt", openPrompt)

  pure def combatantIds(state: BattleState): List[CreatureId] =
    [state.currentParticipant].concat(state.waitingParticipants)
      .foldl([], (acc, participant) => acc.append(participant.combatant.id))

  pure def attackTargetIds(state: BattleState, actorId: CreatureId): List[CreatureId] =
    [state.currentParticipant].concat(state.waitingParticipants)
      .select(participant => participant.combatant.id != actorId)
      .foldl([], (acc, participant) => acc.append(participant.combatant.id))

  pure def initiativeCountFor(
    initiativeCounts: List[BattleInitiativeCount],
    actorId: CreatureId,
  ): int = {
    val matches = initiativeCounts.select(entry => entry.actorId == actorId)
    if (matches.length() == 0) -1000 else matches[0].count
  }

  pure def tiedGroups(
    combatantIds: List[CreatureId],
    initiativeCounts: List[BattleInitiativeCount],
  ): List[List[CreatureId]] =
    combatantIds.foldl([], (groups, actorId) => {
      val actorCount = initiativeCountFor(initiativeCounts, actorId)
      val alreadyGrouped = groups.foldl(false, (acc, group) =>
        acc or (group.length() > 0 and initiativeCountFor(initiativeCounts, group[0]) == actorCount)
      )
      if (alreadyGrouped) groups
      else {
        val group = combatantIds.select(candidateId => initiativeCountFor(initiativeCounts, candidateId) == actorCount)
        if (group.length() > 1) groups.append(group) else groups
      }
    })

  pure def tieIndexForActor(
    actorId: CreatureId,
    tieResolutions: List[List[CreatureId]],
  ): int = {
    val matching = tieResolutions.select(resolution => listContains(resolution, actorId))
    if (matching.length() == 0) 0 else listIndexOf(matching[0], actorId)
  }

  pure def sortInitiativeEntries(
    entries: List[{ id: CreatureId, score: int, tieIndex: int }],
  ): List[CreatureId] = {
    if (entries.length() == 0) List()
    else 0.to(entries.length() - 1).fold(List(), (sorted, _) => {
      val placedIds = listToSet(sorted)
      val remaining = entries.select(entry => not(placedIds.contains(entry.id)))
      val best = remaining.foldl(remaining[0], (bestSoFar, entry) =>
        if (entry.score > bestSoFar.score) entry
        else if (entry.score == bestSoFar.score and entry.tieIndex < bestSoFar.tieIndex) entry
        else bestSoFar
      )
      sorted.append(best.id)
    })
  }

  pure def validateInitiativeInput(
    combatantIds: List[CreatureId],
    init: BattleInit,
  ): InitiativeOrderResult = {
    val countActorIds = init.initiativeCounts.foldl([], (acc, entry) => acc.append(entry.actorId))
    val flattenedTieActorIds = init.tieResolutions.foldl([], (acc, resolution) => acc.concat(resolution))
    val groups = tiedGroups(combatantIds, init.initiativeCounts)
    val countsCoverCombatants =
      init.initiativeCounts.length() == combatantIds.length()
      and combatantIds.foldl(true, (acc, actorId) =>
        acc and init.initiativeCounts.select(entry => entry.actorId == actorId).length() == 1
      )
    val tieResolutionsMatchGroups =
      init.tieResolutions.length() == groups.length()
      and groups.foldl(true, (acc, group) =>
        acc and init.tieResolutions.select(resolution => sameActorSet(resolution, group)).length() == 1
      )
    if (not(countsCoverCombatants)) InitiativeOrderInvalid("initiative counts must cover each combatant exactly once")
    else if (not(allDistinct(flattenedTieActorIds))) InitiativeOrderInvalid("tie resolutions may not repeat an actor id")
    else if (not(flattenedTieActorIds.foldl(true, (acc, actorId) => acc and listContains(combatantIds, actorId))))
      InitiativeOrderInvalid("tie resolutions may reference only combatants in the battle")
    else if (not(tieResolutionsMatchGroups))
      InitiativeOrderInvalid("tie resolutions must cover each tied initiative cohort exactly once")
    else if (not(allDistinct(countActorIds)))
      InitiativeOrderInvalid("initiative counts may not repeat an actor id")
    else InitiativeOrderOk(combatantIds)
  }

  pure def createInitiativeOrder(
    combatantIds: List[CreatureId],
    init: BattleInit,
  ): InitiativeOrderResult = {
    val validatedInput = validateInitiativeInput(combatantIds, init)
    val result = match validatedInput {
      | InitiativeOrderInvalid(message) => InitiativeOrderInvalid(message)
      | InitiativeOrderOk(_) =>
          InitiativeOrderOk(
            sortInitiativeEntries(combatantIds.foldl([], (acc, actorId) =>
              acc.append({
                id: actorId,
                score: initiativeCountFor(init.initiativeCounts, actorId),
                tieIndex: tieIndexForActor(actorId, init.tieResolutions),
              })
            ))
          )
    }
    result
  }

  pure def resetTurnScopedUnitUsage(
    participant: BattleParticipant,
  ): BattleParticipant =
    participant.with(
      "combatant",
      participant.combatant.with(
        "unitResourceStates",
        participant.combatant.unitResourceStates.foldl([], (resourceAcc, resourceState) =>
          resourceAcc.append(resourceState.with("usedThisTurn", false))
        )
      )
    )

  pure def orderedParticipants(
    combatants: List[BattleCombatant],
    initiativeOrder: List[CreatureId],
    initiativeCounts: List[BattleInitiativeCount],
  ): List[BattleParticipant] =
    initiativeOrder.foldl([], (acc, actorId) => {
      val participantMatches = combatants
        .select(combatant => combatant.id == actorId)
        .foldl([], (combatantAcc, combatant) =>
          combatantAcc.append({
            combatant: combatant,
            initiativeCount: initiativeCountFor(initiativeCounts, actorId),
            projectionOrder: listIndexOf(combatants.foldl([], (ids, candidate) => ids.append(candidate.id)), actorId),
          })
        )
      acc.concat(participantMatches)
    })

  pure def initializeBattleState(
    combatants: List[BattleCombatant],
    init: BattleInit,
  ): BattleStateInitResult = {
    if (combatants.length() == 0) BattleStateInvalid("battle init requires at least one combatant")
    else {
    val orderResult = createInitiativeOrder(combatants.foldl([], (acc, combatant) => acc.append(combatant.id)), init)
    match orderResult {
      | InitiativeOrderInvalid(message) => BattleStateInvalid(message)
      | InitiativeOrderOk(order) =>
          val ordered = orderedParticipants(combatants, order, init.initiativeCounts)
          BattleStateOk({
            currentParticipant: resetTurnScopedUnitUsage(ordered[0]),
            waitingParticipants: ordered.slice(1, ordered.length()),
            round: 1,
            turnNumber: 1,
            openPrompt: NoOpenPrompt,
            standardActionsRemaining: 1,
            nonMagicActionsRemaining: 0,
          })
    }
    }
  }

  pure def advanceBattleTurn(state: BattleState): BattleState =
    {
      val nextTurnOrder = state.waitingParticipants.append(state.currentParticipant)
      val wrapsRound = state.turnNumber % (state.waitingParticipants.length() + 1) == 0
      {
        currentParticipant: resetTurnScopedUnitUsage(nextTurnOrder[0]),
        waitingParticipants: nextTurnOrder.slice(1, nextTurnOrder.length()),
        round: if (wrapsRound) state.round + 1 else state.round,
        turnNumber: state.turnNumber + 1,
        openPrompt: NoOpenPrompt,
        standardActionsRemaining: 1,
        nonMagicActionsRemaining: 0,
      }
    }

  pure def canTakeMagicAction(state: BattleState): bool =
    state.standardActionsRemaining > 0

  pure def canTakeNonMagicAction(state: BattleState): bool =
    state.standardActionsRemaining > 0 or state.nonMagicActionsRemaining > 0

  pure def useCountCapValue(combatant: BattleCombatant, useCountCap: UseCountCap): int =
    match useCountCap {
      | FixedUseCountCap(value) => value
      | TieredUseCountCap(config) =>
          if (combatant.level >= config.atLevel) config.upgradedValue else config.base
    }

  pure def unitActionAvailable(
    state: BattleState,
    combatant: BattleCombatant,
    unit: BattleUnitAccess,
  ): bool = match unit.semantics {
      | BUGrantExtraAction(config) =>
          match unitResourceStateById(combatant, unit.unitId) {
            | NoUnitResourceState => false
            | FoundUnitResourceState(resourceState) =>
                not(resourceState.usedThisTurn)
                  and config.usageLimit == ULOncePerTurn
                  and resourceState.expendedUses < useCountCapValue(combatant, config.useCountCap)
          }
      | _ => canTakeMagicAction(state)
    }

  pure def actorActionChoices(state: BattleState): List[AvailableTurnOption] = {
    val combatant = currentCombatant(state)
    val unitChoices = combatant.units
      .select(unit => unitActionAvailable(state, combatant, unit))
      .foldl([], (acc, unit) => acc.append(ATOUnit(unit.unitId)))
    val baseChoices = [ATOCoreActionEndTurn].concat(unitChoices)
    if (canTakeNonMagicAction(state) and attackTargetIds(state, combatant.id).length() > 0)
      [ATOCoreActionAttack].concat(baseChoices)
    else
      baseChoices
  }

  pure def deriveOpenPrompt(
    state: BattleState,
    openPrompt: OpenPromptState,
  ): PromptDerivationResult = {
    val combatant = currentCombatant(state)
    val result = match openPrompt {
      | NoOpenPrompt => PromptDerivationInvalid("no prompt is currently available")
      | OPChooseAttackTarget =>
          val availableTargetIds = attackTargetIds(state, combatant.id)
          if (availableTargetIds.length() == 0)
            PromptDerivationInvalid("attack is not currently available")
          else
            PromptDerived(
              BPChooseAttackTarget({
                actorId: combatant.id,
                availableTargetIds: availableTargetIds,
              })
            )
      | OPChooseSingleTargetUnit(unitId) =>
          match unitById(combatant, unitId) {
            | NoUnit => PromptDerivationInvalid("selected unit is no longer available")
            | FoundUnit(unit) =>
                match unit.semantics {
                  | BUSingleTargetHeal =>
                      PromptDerived(
                        BPChooseSingleTargetUnit({
                          actorId: combatant.id,
                          unitId: unitId,
                        })
                      )
                  | _ => PromptDerivationInvalid("selected unit is not a structurally supported single-target heal")
                }
          }
      | OPChooseAreaEffect(unitId) =>
          match unitById(combatant, unitId) {
            | NoUnit => PromptDerivationInvalid("selected unit is no longer available")
            | FoundUnit(unit) =>
                match unit.semantics {
                  | BUAreaSaveDamage(config) =>
                      match combatant.spellSaveDc {
                        | NoSpellSaveDc => PromptDerivationInvalid("current actor does not have a spell save dc")
                        | HasSpellSaveDc(dc) =>
                            PromptDerived(
                              BPChooseAreaEffect({
                                actorId: combatant.id,
                                unitId: unitId,
                                rangeFeet: config.rangeFeet,
                                radiusFeet: config.radiusFeet,
                                saveAbility: config.saveAbility,
                                dc: dc,
                                damageType: config.damageType,
                                onSuccess: HalfDamage,
                              })
                            )
                      }
                  | _ => PromptDerivationInvalid("selected unit is not a structurally supported area effect")
                }
          }
    }
    result
  }

  pure def discoverAvailableBattlePrompt(state: BattleState): PromptDiscoveryResult =
    match state.openPrompt {
      | NoOpenPrompt =>
          val combatant = currentCombatant(state)
          PromptAvailable(BPChooseAction({
            actorId: combatant.id,
            options: actorActionChoices(state),
          }))
      | _ =>
          match deriveOpenPrompt(state, state.openPrompt) {
            | PromptDerived(prompt) => PromptAvailable(prompt)
            | PromptDerivationInvalid(_) => NoPromptAvailable
          }
    }

  pure def validTargetIds(targetIds: List[CreatureId], allowedIds: List[CreatureId]): bool =
    allDistinct(targetIds)
      and targetIds.foldl(true, (acc, actorId) => acc and listContains(allowedIds, actorId))

  pure def answerUnitChoice(
    state: BattleState,
    actorId: CreatureId,
    unitId: BattleUnitId,
  ): PromptAnswerResult = {
    val actingCombatant = combatantById(state, actorId)
    val result = match actingCombatant {
      | NoCombatant => AnswerInvalid("selected actor is not currently available")
      | FoundCombatant(combatant) =>
          match unitById(combatant, unitId) {
            | NoUnit => AnswerInvalid("selected unit is not currently available")
            | FoundUnit(unit) =>
                match unit.semantics {
                  | BUGrantExtraAction(_) =>
                      AnswerResolved({
                        state: clearOpenPrompt(state),
                        resolvedAction: RAGrantExtraAction({
                          actorId: actorId,
                          unitId: unitId,
                        }),
                      })
                  | BUSingleTargetHeal =>
                      val nextState = stateWithOpenPrompt(clearOpenPrompt(state), OPChooseSingleTargetUnit(unitId))
                      match deriveOpenPrompt(nextState, nextState.openPrompt) {
                        | PromptDerived(prompt) =>
                            AnswerOpened({
                              state: nextState,
                              prompt: prompt,
                            })
                        | PromptDerivationInvalid(message) => AnswerInvalid(message)
                      }
                  | BUAreaSaveDamage(_) =>
                      val nextState = stateWithOpenPrompt(clearOpenPrompt(state), OPChooseAreaEffect(unitId))
                      match deriveOpenPrompt(nextState, nextState.openPrompt) {
                        | PromptDerived(prompt) =>
                            AnswerOpened({
                              state: nextState,
                              prompt: prompt,
                            })
                        | PromptDerivationInvalid(message) => AnswerInvalid(message)
                      }
                }
          }
    }
    result
  }

  pure def answerDerivedBattlePrompt(
    state: BattleState,
    prompt: AvailableBattlePrompt,
    answer: BattlePromptAnswer,
  ): PromptAnswerResult = match prompt {
      | BPChooseAction(payload) =>
          match answer {
            | BAChooseAction(choice) =>
                if (not(listContains(payload.options, choice)))
                  AnswerInvalid("chosen action is not currently available")
                else match choice {
                  | ATOUnit(unitId) => answerUnitChoice(state, payload.actorId, unitId)
                  | ATOCoreActionEndTurn =>
                      AnswerResolved({
                        state: clearOpenPrompt(state),
                        resolvedAction: RAEndTurn({
                          actorId: payload.actorId,
                        }),
                      })
                  | ATOCoreActionAttack =>
                      val nextState = stateWithOpenPrompt(clearOpenPrompt(state), OPChooseAttackTarget)
                      AnswerOpened({
                        state: nextState,
                        prompt: BPChooseAttackTarget({
                          actorId: payload.actorId,
                          availableTargetIds: attackTargetIds(state, payload.actorId),
                        }),
                      })
                }
            | _ => AnswerInvalid("answer tag does not match the current prompt")
          }
      | BPChooseAttackTarget(payload) =>
          match answer {
            | BAChooseAttackTarget(result) =>
                if (not(validTargetIds([result.targetId], payload.availableTargetIds)))
                  AnswerInvalid("attack target is not currently available")
                else
                  AnswerResolved({
                    state: clearOpenPrompt(state),
                    resolvedAction: RAAttack({
                      actorId: payload.actorId,
                      targetId: result.targetId,
                      damage: result.damage,
                    }),
                  })
            | _ => AnswerInvalid("answer tag does not match the current prompt")
          }
      | BPChooseSingleTargetUnit(payload) =>
          match answer {
            | BAChooseSingleTargetUnit(result) =>
                if (not(validTargetIds([result.targetId], combatantIds(state))))
                  AnswerInvalid("unit target is not currently available")
                else
                  AnswerResolved({
                    state: clearOpenPrompt(state),
                    resolvedAction: RASingleTargetHeal({
                      actorId: payload.actorId,
                      unitId: payload.unitId,
                      targetId: result.targetId,
                      healing: result.amount,
                    }),
                  })
            | _ => AnswerInvalid("answer tag does not match the current prompt")
          }
      | BPChooseAreaEffect(payload) =>
          match answer {
            | BAChooseAreaEffect(result) =>
                if (not(validTargetIds(result.targetResults.foldl([], (acc, targetResult) => acc.append(targetResult.targetId)), combatantIds(state))))
                  AnswerInvalid("area targets must be distinct combatants in the battle")
                else
                  AnswerResolved({
                    state: clearOpenPrompt(state),
                    resolvedAction: RAAreaSaveDamage({
                      actorId: payload.actorId,
                      unitId: payload.unitId,
                      targetResults: result.targetResults,
                      damage: result.amount,
                    }),
                  })
            | _ => AnswerInvalid("answer tag does not match the current prompt")
          }
    }

  pure def answerBattlePrompt(
    state: BattleState,
    answer: BattlePromptAnswer,
  ): PromptAnswerResult = match state.openPrompt {
      | NoOpenPrompt =>
          match discoverAvailableBattlePrompt(state) {
            | NoPromptAvailable => AnswerInvalid("no prompt is currently available")
            | PromptAvailable(prompt) => answerDerivedBattlePrompt(state, prompt, answer)
          }
      | _ =>
          match deriveOpenPrompt(state, state.openPrompt) {
            | PromptDerived(prompt) => answerDerivedBattlePrompt(state, prompt, answer)
            | PromptDerivationInvalid(message) => AnswerInvalid(message)
          }
    }

  pure def replaceCombatant(
    participants: List[BattleParticipant],
    updatedCombatant: BattleCombatant,
  ): List[BattleParticipant] =
    participants.foldl([], (acc, participant) =>
      acc.append(
        if (participant.combatant.id == updatedCombatant.id)
          participant.with("combatant", updatedCombatant)
        else
          participant
      )
    )

  pure def stateWithReplacedCombatant(
    state: BattleState,
    updatedCombatant: BattleCombatant,
  ): BattleState = {
    currentParticipant:
      if (state.currentParticipant.combatant.id == updatedCombatant.id)
        state.currentParticipant.with("combatant", updatedCombatant)
      else
        state.currentParticipant,
    waitingParticipants: replaceCombatant(state.waitingParticipants, updatedCombatant),
    round: state.round,
    turnNumber: state.turnNumber,
    openPrompt: state.openPrompt,
    standardActionsRemaining: state.standardActionsRemaining,
    nonMagicActionsRemaining: state.nonMagicActionsRemaining,
  }

  pure def spendNonMagicAction(state: BattleState): BattleStateReduceResult =
    if (state.nonMagicActionsRemaining > 0)
      BattleStateReduced(state.with("nonMagicActionsRemaining", state.nonMagicActionsRemaining - 1))
    else if (state.standardActionsRemaining > 0)
      BattleStateReduced(state.with("standardActionsRemaining", state.standardActionsRemaining - 1))
    else
      BattleStateReductionInvalid("no non-magic action is currently available")

  pure def spendMagicAction(state: BattleState): BattleStateReduceResult =
    if (state.standardActionsRemaining > 0)
      BattleStateReduced(state.with("standardActionsRemaining", state.standardActionsRemaining - 1))
    else
      BattleStateReductionInvalid("no Magic action is currently available")

  pure def reduceAttack(
    state: BattleState,
    attackAction: AttackAction,
  ): BattleStateReduceResult = {
    if (state.nonMagicActionsRemaining <= 0 and state.standardActionsRemaining <= 0)
      BattleStateReductionInvalid("no non-magic action is currently available")
    else {
      val spentState = if (state.nonMagicActionsRemaining > 0)
        state.with("nonMagicActionsRemaining", state.nonMagicActionsRemaining - 1)
        else state.with("standardActionsRemaining", state.standardActionsRemaining - 1)
      val targetMatches = [spentState.currentParticipant].concat(spentState.waitingParticipants)
        .select(participant => participant.combatant.id == attackAction.targetId)
      if (targetMatches.length() == 0)
        BattleStateReductionInvalid("attack target is no longer in the battle")
      else
        BattleStateReduced(
          stateWithReplacedCombatant(
            spentState,
            targetMatches[0].combatant.with(
              "currentHp",
              clampHp(
                targetMatches[0].combatant.currentHp - attackAction.damage,
                targetMatches[0].combatant.maxHp
              )
            )
          )
        )
    }
  }

  pure def reduceSingleTargetHeal(
    state: BattleState,
    healAction: SingleTargetHealAction,
  ): BattleStateReduceResult = {
    if (state.standardActionsRemaining <= 0)
      BattleStateReductionInvalid("no Magic action is currently available")
    else {
      val spentState = state.with("standardActionsRemaining", state.standardActionsRemaining - 1)
      val targetMatches = [spentState.currentParticipant].concat(spentState.waitingParticipants)
        .select(participant => participant.combatant.id == healAction.targetId)
      if (targetMatches.length() == 0)
        BattleStateReductionInvalid("heal target is no longer in the battle")
      else
        BattleStateReduced(
          stateWithReplacedCombatant(
            spentState,
            targetMatches[0].combatant.with(
              "currentHp",
              clampHp(
                targetMatches[0].combatant.currentHp + healAction.healing,
                targetMatches[0].combatant.maxHp
              )
            )
          )
        )
    }
  }

  pure def reduceAreaSaveDamage(
    state: BattleState,
    areaAction: AreaSaveDamageAction,
  ): BattleStateReduceResult = {
    if (state.standardActionsRemaining <= 0)
      BattleStateReductionInvalid("no Magic action is currently available")
    else {
      val spentState = state.with("standardActionsRemaining", state.standardActionsRemaining - 1)
      val successfulTargetIds = areaAction.targetResults
        .select(targetResult => targetResult.saveOutcome == SaveSuccess)
        .foldl([], (acc, targetResult) => acc.append(targetResult.targetId))
      val affectedTargetIds = areaAction.targetResults.foldl([], (acc, targetResult) => acc.append(targetResult.targetId))
      BattleStateReduced(
        {
          currentParticipant:
            if (not(listContains(affectedTargetIds, spentState.currentParticipant.combatant.id))) spentState.currentParticipant
            else
              val damage = if (listContains(successfulTargetIds, spentState.currentParticipant.combatant.id)) areaAction.damage / 2 else areaAction.damage
              spentState.currentParticipant.with(
                "combatant",
                spentState.currentParticipant.combatant.with(
                  "currentHp",
                  clampHp(spentState.currentParticipant.combatant.currentHp - damage, spentState.currentParticipant.combatant.maxHp)
                )
              ),
          waitingParticipants: spentState.waitingParticipants.foldl([], (acc, participant) =>
            acc.append(
              if (not(listContains(affectedTargetIds, participant.combatant.id))) participant
              else
                val damage = if (listContains(successfulTargetIds, participant.combatant.id)) areaAction.damage / 2 else areaAction.damage
                participant.with(
                  "combatant",
                  participant.combatant.with(
                    "currentHp",
                    clampHp(participant.combatant.currentHp - damage, participant.combatant.maxHp)
                  )
                )
            )
          ),
          round: spentState.round,
          turnNumber: spentState.turnNumber,
          openPrompt: spentState.openPrompt,
          standardActionsRemaining: spentState.standardActionsRemaining,
          nonMagicActionsRemaining: spentState.nonMagicActionsRemaining,
        }
      )
    }
  }

  pure def reduceGrantExtraAction(
    state: BattleState,
    extraAction: GrantExtraActionAction,
  ): BattleStateReduceResult = {
    val actorMatches = [state.currentParticipant].concat(state.waitingParticipants)
      .select(participant => participant.combatant.id == extraAction.actorId)
    if (actorMatches.length() == 0)
      BattleStateReductionInvalid("acting combatant is no longer in the battle")
    else {
      val actor = actorMatches[0].combatant
      val unitMatches = actor.units.select(unit => unit.unitId == extraAction.unitId)
      val resourceMatches = actor.unitResourceStates.select(resourceState => resourceState.unitId == extraAction.unitId)
      if (unitMatches.length() == 0)
        BattleStateReductionInvalid("unit is not currently available to the acting combatant")
      else if (resourceMatches.length() == 0)
        BattleStateReductionInvalid("unit resource state is missing")
      else if (resourceMatches[0].usedThisTurn)
        BattleStateReductionInvalid("unit has already been used this turn")
      else match unitMatches[0].semantics {
        | BUGrantExtraAction(config) =>
            if (config.usageLimit != ULOncePerTurn)
              BattleStateReductionInvalid("unit usage limit is not supported in this slice")
            else if (config.restriction != EARExcludeMagic)
              BattleStateReductionInvalid("unit does not grant the supported non-Magic extra action")
            else if (resourceMatches[0].expendedUses >= useCountCapValue(actor, config.useCountCap))
              BattleStateReductionInvalid("unit has no uses remaining")
            else
              val updatedActor = actor.with(
                "unitResourceStates",
                actor.unitResourceStates.foldl([], (acc, candidate) =>
                  acc.append(
                    if (candidate.unitId != extraAction.unitId) candidate
                    else {
                      unitId: candidate.unitId,
                      expendedUses: candidate.expendedUses + 1,
                      usedThisTurn: true,
                    }
                  )
                )
              )
              BattleStateReduced(
                stateWithReplacedCombatant(state, updatedActor)
                  .with("nonMagicActionsRemaining", state.nonMagicActionsRemaining + 1)
              )
        | _ => BattleStateReductionInvalid("unit does not structurally grant an extra action")
      }
    }
  }

  pure def reduceBattleState(
    state: BattleState,
    resolvedAction: ResolvedBattleAction,
  ): BattleStateReduceResult = match resolvedAction {
      | RAEndTurn(endTurnAction) =>
          if (state.currentParticipant.combatant.id != endTurnAction.actorId)
            BattleStateReductionInvalid("resolved action does not belong to the current turn actor")
          else
            BattleStateReduced(advanceBattleTurn(state))
      | RAAttack(attackAction) =>
          if (state.currentParticipant.combatant.id != attackAction.actorId)
            BattleStateReductionInvalid("resolved action does not belong to the current turn actor")
          else
            reduceAttack(state, attackAction)
      | RASingleTargetHeal(healAction) =>
          if (state.currentParticipant.combatant.id != healAction.actorId)
            BattleStateReductionInvalid("resolved action does not belong to the current turn actor")
          else
            reduceSingleTargetHeal(state, healAction)
      | RAAreaSaveDamage(areaAction) =>
          if (state.currentParticipant.combatant.id != areaAction.actorId)
            BattleStateReductionInvalid("resolved action does not belong to the current turn actor")
          else
            reduceAreaSaveDamage(state, areaAction)
      | RAGrantExtraAction(extraAction) =>
          if (state.currentParticipant.combatant.id != extraAction.actorId)
            BattleStateReductionInvalid("resolved action does not belong to the current turn actor")
          else
            reduceGrantExtraAction(state, extraAction)
    }
}
