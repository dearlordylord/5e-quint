module surfaceRuntimeCorrection {
  import creature.* from "./creature"

  type CreatureId = str
  type BattleUnitId = str

  type TurnActorId =
    | NoTurnActor
    | TurnActor(CreatureId)

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

  type BattleInitiativeCount = {
    actorId: CreatureId,
    count: int,
  }

  type BattleInit = {
    initiativeCounts: List[BattleInitiativeCount],
    tieResolutions: List[List[CreatureId]],
  }

  type AvailableBattleAction =
    | BACAttack
    | BACEndTurn
    | BACUseUnit(BattleUnitId)

  type OpenPromptState =
    | NoOpenPrompt
    | OPChooseAttackTarget
    | OPChooseSingleTargetUnit(BattleUnitId)
    | OPChooseAreaEffect(BattleUnitId)

  type DamageLabel = | AttackDamageLabel

  type HalfDamageOnSuccess = | HalfDamage

  type AvailableBattlePrompt =
    | BPChooseAction({
        actorId: CreatureId,
        options: List[AvailableBattleAction],
      })
    | BPChooseAttackTarget({
        actorId: CreatureId,
        availableTargetIds: List[CreatureId],
        damageLabel: DamageLabel,
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
    | BAChooseAction(AvailableBattleAction)
    | BAChooseAttackTarget({
        targetId: CreatureId,
        damage: int,
      })
    | BAChooseSingleTargetUnit({
        targetId: CreatureId,
        total: int,
      })
    | BAChooseAreaEffect({
        targetResults: List[AreaTargetResult],
        total: int,
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
    total: int,
  }

  type AreaSaveDamageAction = {
    actorId: CreatureId,
    unitId: BattleUnitId,
    targetResults: List[AreaTargetResult],
    total: int,
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
    combatants: List[BattleCombatant],
    initiativeCounts: List[BattleInitiativeCount],
    initiativeOrder: List[CreatureId],
    round: int,
    turnNumber: int,
    turnActorId: TurnActorId,
    openPrompt: OpenPromptState,
    standardActionsRemaining: int,
    restrictedActionsRemaining: int,
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

  pure def currentCombatant(state: BattleState): MaybeBattleCombatant = match state.turnActorId {
      | NoTurnActor => NoCombatant
      | TurnActor(actorId) =>
          val matches = state.combatants.select(combatant => combatant.id == actorId)
          if (matches.length() == 0) NoCombatant else FoundCombatant(matches[0])
    }

  pure def combatantById(state: BattleState, actorId: CreatureId): MaybeBattleCombatant = {
    val matches = state.combatants.select(combatant => combatant.id == actorId)
    if (matches.length() == 0) NoCombatant else FoundCombatant(matches[0])
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
    state.combatants.foldl([], (acc, combatant) => acc.append(combatant.id))

  pure def attackTargetIds(state: BattleState, actorId: CreatureId): List[CreatureId] =
    state.combatants
      .select(combatant => combatant.id != actorId)
      .foldl([], (acc, combatant) => acc.append(combatant.id))

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
    combatants: List[BattleCombatant],
    turnActorId: TurnActorId,
  ): List[BattleCombatant] =
    if (turnActorId == NoTurnActor) combatants
    else {
      val actorId = match turnActorId {
        | TurnActor(id) => id
        | _ => ""
      }
      combatants.foldl([], (acc, combatant) =>
        acc.append(
          if (combatant.id != actorId) combatant
          else combatant.with(
            "unitResourceStates",
            combatant.unitResourceStates.foldl([], (resourceAcc, resourceState) =>
              resourceAcc.append(resourceState.with("usedThisTurn", false))
            )
          )
        )
      )
    }

  pure def initializeBattleState(
    combatants: List[BattleCombatant],
    init: BattleInit,
  ): BattleStateInitResult = {
    val orderResult = createInitiativeOrder(combatants.foldl([], (acc, combatant) => acc.append(combatant.id)), init)
    match orderResult {
      | InitiativeOrderInvalid(message) => BattleStateInvalid(message)
      | InitiativeOrderOk(order) =>
          val turnActorId = if (order.length() == 0) NoTurnActor else TurnActor(order[0])
          BattleStateOk({
            combatants: resetTurnScopedUnitUsage(combatants, turnActorId),
            initiativeCounts: init.initiativeCounts,
            initiativeOrder: order,
            round: if (order.length() == 0) 0 else 1,
            turnNumber: if (order.length() == 0) 0 else 1,
            turnActorId: turnActorId,
            openPrompt: NoOpenPrompt,
            standardActionsRemaining: if (order.length() == 0) 0 else 1,
            restrictedActionsRemaining: 0,
          })
    }
  }

  pure def advanceBattleTurn(state: BattleState): BattleState =
    if (state.initiativeOrder.length() == 0) state
    else match state.turnActorId {
      | NoTurnActor => state
      | TurnActor(actorId) =>
          val turnIndex = listIndexOf(state.initiativeOrder, actorId)
          if (turnIndex == -1) {
            val nextActor = TurnActor(state.initiativeOrder[0])
            {
              combatants: resetTurnScopedUnitUsage(state.combatants, nextActor),
              initiativeCounts: state.initiativeCounts,
              initiativeOrder: state.initiativeOrder,
              round: state.round,
              turnNumber: state.turnNumber,
              turnActorId: nextActor,
              openPrompt: NoOpenPrompt,
              standardActionsRemaining: 1,
              restrictedActionsRemaining: 0,
            }
          } else {
            val nextTurnIndex = (turnIndex + 1) % state.initiativeOrder.length()
            val wrapsRound = nextTurnIndex == 0
            val nextActor = TurnActor(state.initiativeOrder[nextTurnIndex])
            {
              combatants: resetTurnScopedUnitUsage(state.combatants, nextActor),
              initiativeCounts: state.initiativeCounts,
              initiativeOrder: state.initiativeOrder,
              round: if (wrapsRound) state.round + 1 else state.round,
              turnNumber: state.turnNumber + 1,
              turnActorId: nextActor,
              openPrompt: NoOpenPrompt,
              standardActionsRemaining: 1,
              restrictedActionsRemaining: 0,
            }
          }
    }

  pure def canTakeMagicAction(state: BattleState): bool =
    state.standardActionsRemaining > 0

  pure def canTakeNonMagicAction(state: BattleState): bool =
    state.standardActionsRemaining > 0 or state.restrictedActionsRemaining > 0

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

  pure def actorActionChoices(state: BattleState): List[AvailableBattleAction] = {
    val activeCombatant = currentCombatant(state)
    val result = match activeCombatant {
      | NoCombatant => List()
      | FoundCombatant(combatant) =>
          val unitChoices = combatant.units
            .select(unit => unitActionAvailable(state, combatant, unit))
            .foldl([], (acc, unit) => acc.append(BACUseUnit(unit.unitId)))
          val baseChoices = [BACEndTurn].concat(unitChoices)
          if (canTakeNonMagicAction(state) and attackTargetIds(state, combatant.id).length() > 0)
            [BACAttack].concat(baseChoices)
          else
            baseChoices
    }
    result
  }

  pure def deriveOpenPrompt(
    state: BattleState,
    openPrompt: OpenPromptState,
  ): PromptDerivationResult = {
    val activeCombatant = currentCombatant(state)
    val result = match activeCombatant {
      | NoCombatant => PromptDerivationInvalid("no prompt is currently available")
      | FoundCombatant(combatant) =>
          match openPrompt {
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
                      damageLabel: AttackDamageLabel,
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
    }
    result
  }

  pure def discoverAvailableBattlePrompt(state: BattleState): PromptDiscoveryResult = match state.turnActorId {
      | NoTurnActor => NoPromptAvailable
      | TurnActor(_) =>
          match state.openPrompt {
            | NoOpenPrompt =>
                match currentCombatant(state) {
                  | NoCombatant => NoPromptAvailable
                  | FoundCombatant(combatant) =>
                      PromptAvailable(BPChooseAction({
                        actorId: combatant.id,
                        options: actorActionChoices(state),
                      }))
                }
            | _ =>
                match deriveOpenPrompt(state, state.openPrompt) {
                  | PromptDerived(prompt) => PromptAvailable(prompt)
                  | PromptDerivationInvalid(_) => NoPromptAvailable
                }
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
                  | BACUseUnit(unitId) => answerUnitChoice(state, payload.actorId, unitId)
                  | BACEndTurn =>
                      AnswerResolved({
                        state: clearOpenPrompt(state),
                        resolvedAction: RAEndTurn({
                          actorId: payload.actorId,
                        }),
                      })
                  | BACAttack =>
                      val nextState = stateWithOpenPrompt(clearOpenPrompt(state), OPChooseAttackTarget)
                      AnswerOpened({
                        state: nextState,
                        prompt: BPChooseAttackTarget({
                          actorId: payload.actorId,
                          availableTargetIds: attackTargetIds(state, payload.actorId),
                          damageLabel: AttackDamageLabel,
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
                      total: result.total,
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
                      total: result.total,
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
    combatants: List[BattleCombatant],
    updatedCombatant: BattleCombatant,
  ): List[BattleCombatant] =
    combatants.foldl([], (acc, combatant) =>
      acc.append(if (combatant.id == updatedCombatant.id) updatedCombatant else combatant)
    )

  pure def spendNonMagicAction(state: BattleState): BattleStateReduceResult =
    if (state.restrictedActionsRemaining > 0)
      BattleStateReduced(state.with("restrictedActionsRemaining", state.restrictedActionsRemaining - 1))
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
    if (state.restrictedActionsRemaining <= 0 and state.standardActionsRemaining <= 0)
      BattleStateReductionInvalid("no non-magic action is currently available")
    else {
      val spentState = if (state.restrictedActionsRemaining > 0)
        state.with("restrictedActionsRemaining", state.restrictedActionsRemaining - 1)
        else state.with("standardActionsRemaining", state.standardActionsRemaining - 1)
      val targetMatches = spentState.combatants.select(combatant => combatant.id == attackAction.targetId)
      if (targetMatches.length() == 0)
        BattleStateReductionInvalid("attack target is no longer in the battle")
      else
        BattleStateReduced(
          spentState.with(
            "combatants",
            replaceCombatant(
              spentState.combatants,
              targetMatches[0].with("currentHp", clampHp(targetMatches[0].currentHp - attackAction.damage, targetMatches[0].maxHp))
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
      val targetMatches = spentState.combatants.select(combatant => combatant.id == healAction.targetId)
      if (targetMatches.length() == 0)
        BattleStateReductionInvalid("heal target is no longer in the battle")
      else
        BattleStateReduced(
          spentState.with(
            "combatants",
            replaceCombatant(
              spentState.combatants,
              targetMatches[0].with("currentHp", clampHp(targetMatches[0].currentHp + healAction.total, targetMatches[0].maxHp))
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
        spentState.with(
          "combatants",
          spentState.combatants.foldl([], (acc, combatant) =>
            acc.append(
              if (not(listContains(affectedTargetIds, combatant.id))) combatant
              else
                val damage = if (listContains(successfulTargetIds, combatant.id)) areaAction.total / 2 else areaAction.total
                combatant.with("currentHp", clampHp(combatant.currentHp - damage, combatant.maxHp))
            )
          )
        )
      )
    }
  }

  pure def reduceGrantExtraAction(
    state: BattleState,
    extraAction: GrantExtraActionAction,
  ): BattleStateReduceResult = {
    val actorMatches = state.combatants.select(combatant => combatant.id == extraAction.actorId)
    if (actorMatches.length() == 0)
      BattleStateReductionInvalid("acting combatant is no longer in the battle")
    else {
      val actor = actorMatches[0]
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
                state
                  .with("combatants", replaceCombatant(state.combatants, updatedActor))
                  .with("restrictedActionsRemaining", state.restrictedActionsRemaining + 1)
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
          if (state.turnActorId != TurnActor(endTurnAction.actorId))
            BattleStateReductionInvalid("resolved action does not belong to the current turn actor")
          else
            BattleStateReduced(advanceBattleTurn(state))
      | RAAttack(attackAction) =>
          if (state.turnActorId != TurnActor(attackAction.actorId))
            BattleStateReductionInvalid("resolved action does not belong to the current turn actor")
          else
            reduceAttack(state, attackAction)
      | RASingleTargetHeal(healAction) =>
          if (state.turnActorId != TurnActor(healAction.actorId))
            BattleStateReductionInvalid("resolved action does not belong to the current turn actor")
          else
            reduceSingleTargetHeal(state, healAction)
      | RAAreaSaveDamage(areaAction) =>
          if (state.turnActorId != TurnActor(areaAction.actorId))
            BattleStateReductionInvalid("resolved action does not belong to the current turn actor")
          else
            reduceAreaSaveDamage(state, areaAction)
      | RAGrantExtraAction(extraAction) =>
          if (state.turnActorId != TurnActor(extraAction.actorId))
            BattleStateReductionInvalid("resolved action does not belong to the current turn actor")
          else
            reduceGrantExtraAction(state, extraAction)
    }
}
