// -*- mode: Bluespec; -*-

module battleRuntime {
  // SRD traceability for this canonical battle runtime spec:
  // - Playing-the-Game.md lines 479-495: combat proceeds in rounds and turns
  //   by Initiative order, and the Initiative order remains fixed round to round.
  // - Playing-the-Game.md lines 501-513: a turn can include one action, and
  //   doing nothing is a legal turn choice. ASSUMPTIONS.md A2 records the repo
  //   modeling choice that End Turn is a runtime transition, not a rules Action.
  // - Playing-the-Game.md lines 582-589 and 700-703: an Attack chooses a
  //   target, resolves an attack roll, rolls damage on a hit, and rolls the
  //   attack's damage dice twice on a Critical Hit.
  // - Playing-the-Game.md lines 684-698 and 788-808: damage subtracts from HP,
  //   HP cannot go below 0, weapon damage adds the attack ability modifier, and
  //   Temporary Hit Points absorb damage before HP.
  // - Playing-the-Game.md lines 748-780 and ASSUMPTIONS.md A12: Stat Block
  //   monsters use Monster Death at 0 HP; Character Build combatants use the
  //   Death Saving Throw lifecycle, including instant death from massive
  //   damage. This spec covers the immediate HP-mutation boundary: drop to
  //   0 HP, damage at 0 HP, Critical Hit damage at 0 HP, Massive Damage, and
  //   start-turn Death Saving Throw rolls through Stable/dead/natural-20
  //   outcomes. Stable 1d4-hour recovery and post-battle character closeout
  //   are represented in TypeScript session state, not in this battle spec.
  // - Classes/Fighter.md lines 76-80: Action Surge grants one additional action
  //   except Magic, spends one use per Short or Long Rest, and is limited to
  //   once per turn.
  // - Classes/Fighter.md lines 64-68, Playing-the-Game.md lines 318-324 and
  //   740-746: Second Wind spends a Bonus Action and one Short/Long Rest
  //   feature use to restore 1d10 + Fighter level HP, clamped by maximum HP.
  // - Spells/Gaining-and-Casting.md lines 3-65 and 92-96, Rules-Glossary.md
  //   lines 698-702, and Classes/Wizard.md lines 56-82: prepared level-1
  //   Wizard spells spend Spell Slots; cantrips do not.
  // - Spells/Gaining-and-Casting.md lines 176-182 and Playing-the-Game.md
  //   lines 219-222: spell attacks add Proficiency Bonus.
  // - Spells/Descriptions-M-P.md lines 85-96 and Spells/Descriptions-Q-R.md
  //   lines 41-52: Magic Missile can put all darts on one target; Ray of Frost
  //   reduces Speed until the start of the caster's next turn.
  // - Spells/Descriptions-M-P.md lines 5-15 and
  //   Spells/Gaining-and-Casting.md lines 142-149: Mage Armor is a timed
  //   ongoing spell effect whose target's base AC becomes 13 + Dexterity
  //   modifier until the spell ends, with typed early end when the target dons
  //   armor.
  // - Spells/Descriptions-A-D.md lines 13-23, Spells/Gaining-and-Casting.md
  //   lines 187-220, Playing-the-Game.md lines 704-714, and Rules-Glossary.md
  //   lines 854-856: Acid Splash is an Action cantrip that creates a
  //   5-foot-radius Sphere at a point within 60 feet; each creature in the
  //   Sphere makes a Dexterity Saving Throw and takes Acid damage only on a
  //   failed save.
  // - Spells/Gaining-and-Casting.md lines 36-38 and Rules-Glossary.md lines
  //   98-100: lacking training for worn armor prevents spellcasting while
  //   preserving Spell Slot state.
  // - Monsters/Monsters-P-S.md lines 1152-1175 and UBIQUITOUS_LANGUAGE.md:
  //   Skeleton has Bludgeoning vulnerability and Poison damage immunity.
  // - Playing-the-Game.md lines 326-332 and
  //   Spells/Gaining-and-Casting.md lines 92-100: a Reaction is an instant
  //   response to a trigger, can interrupt another creature's turn, is usable
  //   once until the start of the reactor's next turn, and reaction spells use
  //   spell-authored triggers. The battle runtime models the reusable
  //   interrupt window/continuation protocol here; individual reaction
  //   features and spells are restored by later width tasks.
  // - Playing-the-Game.md lines 533-551, Rules-Glossary.md lines 395-397,
  //   738-740, 904-910, and UBIQUITOUS_LANGUAGE.md: Movement spends a
  //   per-turn movement budget derived from Speed; Difficult Terrain and
  //   other spatial costs are caller-authored Movement costs at this runtime
  //   boundary; leaving melee Reach opens an Opportunity Attack Reaction
  //   window before the distance mutation is committed.
  // - Monsters/Overview.md lines 253-265 and ASSUMPTIONS.md A21-A24: Stat
  //   Block monster controls own Legendary Action uses and limited-use
  //   resources. This spec models the Stat Block resource boundary with a
  //   representative Goblin recharge part and Legendary Action use pool;
  //   TypeScript carries the authored StatBlockRecord catalog breadth.
  // - Rules-Glossary.md lines 102-106, 496-514, and 1074 plus
  //   Equipment.md lines 54-56 and ASSUMPTIONS.md A8/A37: the battle-owned
  //   held/wielded hand state, Light-property Off-Hand Attack damage modifier
  //   behavior, Grapple links, release, Escape Grapple, Grappled attack-roll
  //   disadvantage, and Grappled movement-cost facts are battle-owned state.
  // - Rules-Glossary.md lines 542-548 and 858-866 plus
  //   Playing-the-Game.md lines 590-600: Hide records the check total as the
  //   Search DC, grants Invisible while hidden, Search can find the hidden
  //   creature, and making an attack roll or casting a Verbal spell reveals the
  //   hidden creature.
  // - Playing-the-Game.md lines 295-305, 326-332, 499-513, and
  //   Rules-Glossary.md lines 361-365, 420-428, 528-535, 802-806, and
  //   818-826: Dash, Disengage, Dodge, Help, Ready, and standing from Prone
  //   are battle-owned turn/action or movement procedures.
  //
  // This is the canonical package-local spec for implemented
  // @dnd/battle-runtime behavior. Old root battle.qnt is legacy/Core broad
  // proof and restore source material; it is not the place to add new
  // @dnd/battle-runtime behavior.

  type Actor = Fighter | Goblin

  // FIXME: damage type is not only about battle (you can get damaged out of battle). similar with creature size, hand use, maybe more common domain truths. make sure there's shared module for it
  type DamageType = Acid | Bludgeoning | Poison | Force | Cold | Slashing | Piercing

  type SpellInvocation = MagicMissile | RayOfFrost | AcidSplash

  type ActiveEffect = MageArmor | RayOfFrostSpeedDelta

  type CreatureSize = Tiny | Small | Medium | Large | Huge | Gargantuan

  type HandUse = HFree | HMainWeapon | HOffWeapon | HShield | HGrapple

  type Hole =
    | TargetChoice
    | AttackRoll
    | DamageRoll
    | SavingThrowOutcome
    | GrappleOutcome
    | EscapeGrappleOutcome
    | AbilityCheck
    | ReactionDecision
    | StatBlockRechargeRoll

  type ReactionTrigger = AttackHit | SpellCast | SaveFailed | AfterDamage | OpportunityAttack

  type LastTurnActor = NoTurnEnded | LastTurnFighter | LastTurnGoblin

  // Continuations carry the replay lane interrupted by a Reaction window. This
  // package-local QNT keeps representative deterministic fills for those lanes;
  // TypeScript carries the caller-provided fills in the runtime frame.
  type ReactionContinuation =
    | ResumeAttack
    | ResumeSpell
    | ResumeSaveGateDamage
    | ResumeAfterDamage
    | ResumeMovement({ movementCost: int, distanceMoved: int, destinationDistance: int })

  type PendingReactionFrame = {
    trigger: ReactionTrigger,
    eligibleReactors: Set[Actor],
    offeredReactors: Set[Actor],
    continuation: ReactionContinuation,
  }

  type ZeroHpLifecycle = DiesAtZeroHp | UsesDeathSavingThrows

  type HiddenDiscoveryDc =
    | HiddenDc15
    | HiddenDc16
    | HiddenDc17
    | HiddenDc18
    | HiddenDc19
    | HiddenDc20

  type HiddenState =
    | NotHidden
    | HiddenByDc(HiddenDiscoveryDc)

  type Combatant = {
    hp: int,
    maxHp: int,
    tempHp: int,
    ac: int,
    dexMod: int,
    activeEffects: Set[ActiveEffect],
    concentrating: bool,
    unconscious: bool,
    stable: bool,
    deathSuccesses: int,
    deathFailures: int,
    lifecycle: ZeroHpLifecycle,
    reactionAvailable: bool,
    speed: int,
    movementSpent: int,
    hidden: HiddenState,
    dodging: bool,
    prone: bool,
    creatureSize: CreatureSize,
    leftHandUse: HandUse,
    rightHandUse: HandUse,
  }

  type GrappleLink = {
    escapeDc: int,
    targetDragCostExempt: bool,
  }

  type GrappleState =
    | NoGrapple
    | FighterGrapplesGoblin(GrappleLink)

  type Initiative = {
    round: int,
    alreadyActed: List[Actor],
    stillToAct: List[Actor],
  }

  type BattleState = {
    initiative: Initiative,
    fighter: Combatant,
    goblin: Combatant,
    actionAvailable: bool,
    bonusActionAvailable: bool,
    dashMovementBonus: int,
    disengaged: bool,
    lightWeaponAttackMade: bool,
    fighterReadiedSpellHeld: bool,
    fighterReadiedActionHeld: bool,
    fighterHelpAttackGoblinForGoblin: bool,
    grapple: GrappleState,
    interruptStack: List[PendingReactionFrame],
    fighterGoblinDistance: int,
    fighterHidePrerequisite: bool,
    goblinRechargeAvailable: bool,
    goblinLegendaryUsesRemaining: int,
    lastTurnActor: LastTurnActor,
    legendaryActionWindowConsumed: bool,
  }

  type ActionSurgeResult = {
    state: BattleState,
    usesRemaining: int,
    usedThisTurn: bool,
  }

  type SecondWindResult = {
    state: BattleState,
    usesRemaining: int,
  }

  type AttackReplay =
    | AttackNeedsTarget
    | AttackNeedsAttackRoll
    | AttackRollFilled({ attackTotal: int, naturalD20: int })
    | AttackReplayComplete

  pure val initialState: BattleState = {
    initiative: { round: 1, alreadyActed: [], stillToAct: [Fighter, Goblin] },
    fighter: {
      hp: 12,
      maxHp: 12,
      tempHp: 0,
      ac: 10,
      dexMod: 0,
      activeEffects: Set(),
      concentrating: false,
      unconscious: false,
      stable: false,
      deathSuccesses: 0,
      deathFailures: 0,
      lifecycle: UsesDeathSavingThrows,
      reactionAvailable: true,
      speed: 30,
      movementSpent: 0,
      hidden: NotHidden,
      dodging: false,
      prone: false,
      creatureSize: Medium,
      leftHandUse: HFree,
      rightHandUse: HMainWeapon,
    },
    goblin: {
      hp: 10,
      maxHp: 10,
      tempHp: 0,
      ac: 15,
      dexMod: 2,
      activeEffects: Set(),
      concentrating: false,
      unconscious: false,
      stable: false,
      deathSuccesses: 0,
      deathFailures: 0,
      lifecycle: DiesAtZeroHp,
      reactionAvailable: true,
      speed: 30,
      movementSpent: 0,
      hidden: NotHidden,
      dodging: false,
      prone: false,
      creatureSize: Small,
      leftHandUse: HFree,
      rightHandUse: HFree,
    },
    actionAvailable: true,
    bonusActionAvailable: true,
    dashMovementBonus: 0,
    disengaged: false,
    lightWeaponAttackMade: false,
    fighterReadiedSpellHeld: false,
    fighterReadiedActionHeld: false,
    fighterHelpAttackGoblinForGoblin: false,
    grapple: NoGrapple,
    interruptStack: [],
    fighterGoblinDistance: 5,
    fighterHidePrerequisite: false,
    goblinRechargeAvailable: true,
    goblinLegendaryUsesRemaining: 2,
    lastTurnActor: NoTurnEnded,
    legendaryActionWindowConsumed: false,
  }

  // The battle runtime receives Initiative counts and the caller-resolved
  // order for tied counts at the boundary. The spec treats that order as
  // authoritative once battle starts.
  pure val callerOrderedTieInitialState: BattleState = {
    ...initialState,
    initiative: { round: 1, alreadyActed: [], stillToAct: [Goblin, Fighter] },
  }

  pure def currentActor(state: BattleState): Actor =
    state.initiative.stillToAct[0]

  pure def currentActorCanAttack(state: BattleState): bool =
    state.actionAvailable and
    (
      (currentActor(state) == Fighter and not(state.fighter.unconscious)) or
      (currentActor(state) == Goblin and state.goblin.hp > 0)
    )

  pure def combatantArmorClass(combatant: Combatant): int =
    activeEffectArmorClass(combatant.ac, combatant.dexMod, combatant.activeEffects)

  pure def attackTargetAc(state: BattleState): int =
    if (currentActor(state) == Fighter) combatantArmorClass(state.goblin) else combatantArmorClass(state.fighter)

  pure def activeEffectArmorClass(baseAc: int, dexMod: int, effects: Set[ActiveEffect]): int =
    if (effects.exists(effect => match effect {
      | MageArmor => true
      | RayOfFrostSpeedDelta => false
    })) 13 + dexMod else baseAc

  pure def openHoles(state: BattleState): Set[Hole] =
    if (currentActor(state) == Goblin and not(state.goblinRechargeAvailable))
      Set(StatBlockRechargeRoll)
    else if (currentActorCanAttack(state))
      Set(TargetChoice)
    else Set()

  pure def hideHoles(state: BattleState): Set[Hole] =
    if (
      currentActor(state) == Fighter and
      state.actionAvailable and
      not(state.fighter.unconscious) and
      state.fighterHidePrerequisite
    )
      Set(AbilityCheck)
    else Set()

  pure def hiddenDiscoveryDcValue(hidden: HiddenDiscoveryDc): int =
    match hidden {
      | HiddenDc15 => 15
      | HiddenDc16 => 16
      | HiddenDc17 => 17
      | HiddenDc18 => 18
      | HiddenDc19 => 19
      | HiddenDc20 => 20
    }

  pure def totalToHiddenState(total: int): HiddenState =
    if (total < 15) NotHidden
    else if (total == 15) HiddenByDc(HiddenDc15)
    else if (total == 16) HiddenByDc(HiddenDc16)
    else if (total == 17) HiddenByDc(HiddenDc17)
    else if (total == 18) HiddenByDc(HiddenDc18)
    else if (total == 19) HiddenByDc(HiddenDc19)
    else HiddenByDc(HiddenDc20)

  pure def fighterIsHidden(state: BattleState): bool =
    match state.fighter.hidden {
      | NotHidden => false
      | HiddenByDc(_) => true
    }

  pure def hideFighter(state: BattleState, stealthTotal: int): BattleState =
    if (
      currentActor(state) == Fighter and
      state.actionAvailable and
      not(state.fighter.unconscious) and
      state.fighterHidePrerequisite
    )
      {
        ...state,
        fighter: { ...state.fighter, hidden: totalToHiddenState(stealthTotal) },
        actionAvailable: false,
      }
    else
      state

  pure def searchGoblinForFighter(state: BattleState, perceptionTotal: int): BattleState =
    if (currentActor(state) == Goblin and state.actionAvailable)
      {
        ...state,
        fighter: {
          ...state.fighter,
          hidden: match state.fighter.hidden {
            | NotHidden => NotHidden
            | HiddenByDc(dc) =>
              if (perceptionTotal >= hiddenDiscoveryDcValue(dc)) NotHidden else state.fighter.hidden
          },
        },
        actionAvailable: false,
      }
    else
      state

  pure def revealFighterHidden(state: BattleState): BattleState =
    { ...state, fighter: { ...state.fighter, hidden: NotHidden } }

  pure def attackReplayHoles(state: BattleState, replay: AttackReplay): Set[Hole] =
    if (not(currentActorCanAttack(state)))
      Set()
    else match replay {
      | AttackNeedsTarget => Set(TargetChoice)
      | AttackNeedsAttackRoll => Set(AttackRoll)
      | AttackRollFilled(roll) =>
          if (attackHits(roll.attackTotal, roll.naturalD20, attackTargetAc(state)))
            Set(DamageRoll)
          else
            Set()
      | AttackReplayComplete => Set()
    }

  pure def nextInitiative(initiative: Initiative): Initiative = {
    val current = initiative.stillToAct[0]
    val remaining = initiative.stillToAct.slice(1, initiative.stillToAct.length())
    val acted = initiative.alreadyActed.append(current)

    if (remaining.length() == 0)
      { round: initiative.round + 1, alreadyActed: [], stillToAct: acted }
    else
      { round: initiative.round, alreadyActed: acted, stillToAct: remaining }
  }

  pure def endTurn(state: BattleState): BattleState = {
    val advancedInitiative = nextInitiative(state.initiative)
    val nextActor = advancedInitiative.stillToAct[0]
    {
      ...state,
      initiative: advancedInitiative,
      actionAvailable: true,
      bonusActionAvailable: true,
      dashMovementBonus: 0,
      disengaged: false,
      lightWeaponAttackMade: false,
      fighterReadiedSpellHeld: if (state.fighterReadiedSpellHeld and nextActor == Fighter) false else state.fighterReadiedSpellHeld,
      fighterReadiedActionHeld: if (state.fighterReadiedActionHeld and nextActor == Fighter) false else state.fighterReadiedActionHeld,
      fighterHelpAttackGoblinForGoblin: if (nextActor == Fighter) false else state.fighterHelpAttackGoblinForGoblin,
      fighter: if (nextActor == Fighter) { ...state.fighter, reactionAvailable: true, movementSpent: 0, dodging: false } else state.fighter,
      goblin: if (nextActor == Goblin) { ...state.goblin, reactionAvailable: true, movementSpent: 0, dodging: false } else state.goblin,
      goblinLegendaryUsesRemaining: if (nextActor == Goblin) 2 else state.goblinLegendaryUsesRemaining,
      lastTurnActor: if (currentActor(state) == Fighter) LastTurnFighter else LastTurnGoblin,
      legendaryActionWindowConsumed: false,
    }
  }

  pure def endTurnWithGoblinRechargeRoll(state: BattleState, roll: int): BattleState = {
    val advanced = endTurn(state)
    if (currentActor(advanced) == Goblin and not(advanced.goblinRechargeAvailable))
      { ...advanced, goblinRechargeAvailable: roll >= 5 }
    else
      advanced
  }

  pure def goblinLegendaryActionWindowOpen(state: BattleState): bool =
    state.lastTurnActor == LastTurnFighter and currentActor(state) != Goblin and not(state.legendaryActionWindowConsumed)

  pure def goblinCanUseLegendaryAction(state: BattleState): bool =
    state.goblin.hp > 0 and
    goblinLegendaryActionWindowOpen(state) and
    state.goblinLegendaryUsesRemaining > 0

  pure def useGoblinLegendaryAction(state: BattleState): BattleState =
    if (goblinCanUseLegendaryAction(state))
      { ...state, goblinLegendaryUsesRemaining: state.goblinLegendaryUsesRemaining - 1, legendaryActionWindowConsumed: true }
    else
      state

  pure def openReactionWindow(state: BattleState, frame: PendingReactionFrame): BattleState =
    { ...state, interruptStack: state.interruptStack.append(frame) }

  pure def reactionFrameComplete(frame: PendingReactionFrame): bool =
    frame.eligibleReactors == frame.offeredReactors

  pure def reactorCanReact(state: BattleState, reactor: Actor): bool =
    match reactor {
      | Fighter => state.fighter.reactionAvailable
      | Goblin => state.goblin.reactionAvailable
    }

  pure def spendReaction(state: BattleState, reactor: Actor): BattleState =
    match reactor {
      | Fighter => { ...state, fighter: { ...state.fighter, reactionAvailable: false } }
      | Goblin => { ...state, goblin: { ...state.goblin, reactionAvailable: false } }
    }

  pure def declineReaction(state: BattleState, reactor: Actor): BattleState = {
    if (state.interruptStack.length() == 0)
      state
    else {
      val frame = state.interruptStack[state.interruptStack.length() - 1]
      val validReactor = frame.eligibleReactors.contains(reactor) and not(frame.offeredReactors.contains(reactor))
      if (not(validReactor))
        state
      else {
        val updatedFrame = { ...frame, offeredReactors: frame.offeredReactors.union(Set(reactor)) }
        val rest = state.interruptStack.slice(0, state.interruptStack.length() - 1)
        if (reactionFrameComplete(updatedFrame))
          { ...state, interruptStack: rest }
        else
          { ...state, interruptStack: rest.append(updatedFrame) }
      }
    }
  }

  pure def declineReactionAndResume(state: BattleState, reactor: Actor): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      val frame = state.interruptStack[state.interruptStack.length() - 1]
      val afterDecision = declineReaction(state, reactor)
      if (afterDecision.interruptStack.length() < state.interruptStack.length())
        resumeReactionContinuation(afterDecision, frame.continuation)
      else
        afterDecision
    }

  pure def resolveReaction(state: BattleState, reactor: Actor): BattleState =
    if (state.interruptStack.length() == 0 or not(reactorCanReact(state, reactor)))
      state
    else {
      val frame = state.interruptStack[state.interruptStack.length() - 1]
      val validReactor = frame.eligibleReactors.contains(reactor) and not(frame.offeredReactors.contains(reactor))
      if (not(validReactor))
        state
      else {
        val afterReactionProcedure =
          match frame.trigger {
            | OpportunityAttack => resolveGoblinOpportunityAttack(spendReaction(state, reactor), 20, 18, 4, true)
            | _ => releaseReadiedSpell(spendReaction(state, reactor))
          }
        val afterDecision = declineReaction(afterReactionProcedure, reactor)
        if (afterDecision.interruptStack.length() < state.interruptStack.length())
          resumeReactionContinuation(afterDecision, frame.continuation)
        else
          afterDecision
      }
    }

  pure def resumeReactionContinuation(state: BattleState, continuation: ReactionContinuation): BattleState =
    match continuation {
      | ResumeAttack => resolveAttack(state, 15, 10, 4, true)
      | ResumeSpell => resolveRayOfFrost(state, 15, 10, 4, true)
      | ResumeSaveGateDamage => resolveAcidSplash(state, false, true, 4, true, true)
      | ResumeAfterDamage => state
      | ResumeMovement(movement) => applyFighterMovement(state, movement.movementCost, movement.distanceMoved, movement.destinationDistance)
    }

  pure def endTurnWithDeathSave(state: BattleState, deathSaveRoll: int): BattleState = {
    val advanced = endTurn(state)

    if (currentActor(advanced) == Fighter)
      { ...advanced, fighter: applyStartTurnDeathSave(advanced.fighter, deathSaveRoll) }
    else
      advanced
  }

  pure def attackHits(total: int, naturalD20: int, armorClass: int): bool =
    if (naturalD20 == 1) false
    else if (naturalD20 == 20) true
    else total >= armorClass

  pure def withGoblinHp(state: BattleState, hp: int, tempHp: int): BattleState =
    { ...state, goblin: { ...state.goblin, hp: hp, tempHp: tempHp } }

  pure def withFighterHp(state: BattleState, hp: int, tempHp: int): BattleState =
    { ...state, fighter: { ...state.fighter, hp: hp, tempHp: tempHp } }

  pure def resolveAttack(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious)
      state
    else {
      val revealed = revealFighterHidden(state)
      if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin))))
        { ...revealed, actionAvailable: false, lightWeaponAttackMade: true }
      else
        { ...revealed, goblin: applyDamage(state.goblin, damageRoll + 3, if (naturalD20 == 20) 2 else 1, concentrationSaveSucceeded), actionAvailable: false, lightWeaponAttackMade: true }
    }

  pure def resolveGoblinAttack(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Goblin or state.goblin.hp == 0)
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.fighter))))
      { ...state, actionAvailable: false }
    else
      { ...state, fighter: applyDamage(state.fighter, damageRoll + 2, if (naturalD20 == 20) 2 else 1, concentrationSaveSucceeded), actionAvailable: false }

  pure def resolveGoblinOpportunityAttack(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (state.goblin.hp == 0)
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.fighter))))
      state
    else
      { ...state, fighter: applyDamage(state.fighter, damageRoll + 2, if (naturalD20 == 20) 2 else 1, concentrationSaveSucceeded) }

  pure def resolveRayOfFrost(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious)
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin))))
      { ...revealFighterHidden(state), actionAvailable: false }
    else {
      val damaged = applyDamage(state.goblin, damageRoll, if (naturalD20 == 20) 2 else 1, concentrationSaveSucceeded)
      { ...revealFighterHidden(state), goblin: { ...damaged, activeEffects: damaged.activeEffects.union(Set(RayOfFrostSpeedDelta)) }, actionAvailable: false }
    }

  pure def concentrationSavingThrowDc(damage: int): int = {
    val halfDamage = damage / 2
    val floor = if (halfDamage < 10) 10 else halfDamage
    if (floor > 30) 30 else floor
  }

  pure def breakConcentration(target: Combatant): Combatant =
    { ...target, concentrating: false, activeEffects: target.activeEffects.exclude(Set(MageArmor)) }

  pure def applyDamage(target: Combatant, damage: int, deathFailuresAtZeroHp: int, concentrationSaveSucceeded: bool): Combatant = {
    val effectiveDamage = if (damage < 0) 0 else damage
    val tempHpAbsorbed = if (target.tempHp < effectiveDamage) target.tempHp else effectiveDamage
    val hpDamage = effectiveDamage - tempHpAbsorbed
    val nextHp = if (target.hp - hpDamage < 0) 0 else target.hp - hpDamage
    val massiveDamageKills =
      hpDamage > 0 and
      (if (target.hp <= 0) hpDamage else hpDamage - target.hp) >= target.maxHp
    val damaged = { ...target, hp: nextHp, tempHp: target.tempHp - tempHpAbsorbed }

    val afterDamage =
      if (effectiveDamage <= 0)
        target
      else if (target.hp <= 0)
        if (massiveDamageKills) applyInstantDeath(damaged) else applyDamageAtZeroHp(damaged, deathFailuresAtZeroHp)
      else if (nextHp > 0)
        damaged
      else
        if (massiveDamageKills) applyInstantDeath(damaged) else applyDropToZeroHp(damaged)

    if (target.concentrating and effectiveDamage > 0 and not(concentrationSaveSucceeded))
      breakConcentration(afterDamage)
    else
      afterDamage
  }

  pure def applyMageArmor(target: Combatant): Combatant =
    if (target.activeEffects.contains(MageArmor))
      target
    else
      { ...target, activeEffects: target.activeEffects.union(Set(MageArmor)) }

  pure def targetDonsArmor(target: Combatant): Combatant =
    { ...target, activeEffects: target.activeEffects.exclude(Set(MageArmor)) }

  pure def readySpell(state: BattleState): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighterReadiedSpellHeld)
      state
    else
      { ...state, fighter: { ...state.fighter, concentrating: true }, actionAvailable: false, fighterReadiedSpellHeld: true }

  pure def releaseReadiedSpell(state: BattleState): BattleState =
    if (state.fighterReadiedSpellHeld)
      { ...state, fighter: { ...state.fighter, concentrating: false }, fighterReadiedSpellHeld: false }
    else
      state

  pure def dashFighter(state: BattleState): BattleState =
    if (currentActor(state) == Fighter and state.actionAvailable and not(state.fighter.unconscious))
      { ...state, actionAvailable: false, dashMovementBonus: state.dashMovementBonus + state.fighter.speed }
    else
      state

  pure def disengageFighter(state: BattleState): BattleState =
    if (currentActor(state) == Fighter and state.actionAvailable and not(state.fighter.unconscious))
      { ...state, actionAvailable: false, disengaged: true }
    else
      state

  pure def dodgeFighter(state: BattleState): BattleState =
    if (currentActor(state) == Fighter and state.actionAvailable and not(state.fighter.unconscious))
      { ...state, actionAvailable: false, fighter: { ...state.fighter, dodging: true } }
    else
      state

  pure def readyFighter(state: BattleState): BattleState =
    if (currentActor(state) == Fighter and state.actionAvailable and not(state.fighter.unconscious))
      { ...state, actionAvailable: false, fighterReadiedActionHeld: true }
    else
      state

  pure def helpFighterAttack(state: BattleState): BattleState =
    if (currentActor(state) == Fighter and state.actionAvailable and not(state.fighter.unconscious) and state.fighterGoblinDistance <= 5)
      { ...state, actionAvailable: false, fighterHelpAttackGoblinForGoblin: true }
    else
      state

  pure def standFighterFromProne(state: BattleState): BattleState =
    if (currentActor(state) == Fighter and state.fighter.prone and state.fighter.speed / 2 > 0 and state.fighter.movementSpent + state.fighter.speed / 2 <= state.fighter.speed + state.dashMovementBonus)
      { ...state, fighter: { ...state.fighter, movementSpent: state.fighter.movementSpent + state.fighter.speed / 2, prone: false } }
    else
      state

  pure def movementRemainingForFighter(state: BattleState): int = {
    val remaining = state.fighter.speed + state.dashMovementBonus - state.fighter.movementSpent
    if (remaining < 0) 0 else remaining
  }

  pure def movementRemaining(combatant: Combatant): int =
    if (combatant.speed - combatant.movementSpent < 0) 0 else combatant.speed - combatant.movementSpent

  pure def fighterGoblinGrappleExists(state: BattleState): bool =
    match state.grapple {
      | NoGrapple => false
      | FighterGrapplesGoblin(_) => true
    }

  pure def fighterGoblinGrappleTargetDragCostExempt(state: BattleState): bool =
    match state.grapple {
      | NoGrapple => false
      | FighterGrapplesGoblin(link) => link.targetDragCostExempt
    }

  pure def grappleDragMovementCostSatisfied(state: BattleState, movementCost: int, distanceMoved: int): bool =
    not(fighterGoblinGrappleExists(state)) or
    fighterGoblinGrappleTargetDragCostExempt(state) or
    movementCost >= 2 * distanceMoved

  pure def fighterCanMove(state: BattleState, movementCost: int, distanceMoved: int): bool =
    currentActor(state) == Fighter and
    not(state.fighter.unconscious) and
    movementCost > 0 and
    distanceMoved > 0 and
    distanceMoved <= movementCost and
    movementCost <= movementRemainingForFighter(state) and
    grappleDragMovementCostSatisfied(state, movementCost, distanceMoved)

  pure def fighterCanGrappleGoblin(state: BattleState): bool =
    currentActor(state) == Fighter and
    state.actionAvailable and
    not(state.fighter.unconscious) and
    not(fighterGoblinGrappleExists(state)) and
    state.fighterGoblinDistance <= 5 and
    state.fighter.leftHandUse == HFree

  pure def grappleFighterGoblin(state: BattleState, targetFailedSave: bool): BattleState =
    if (not(fighterCanGrappleGoblin(state)))
      state
    else if (targetFailedSave)
      {
        ...state,
        actionAvailable: false,
        fighter: { ...state.fighter, leftHandUse: HGrapple },
        grapple: FighterGrapplesGoblin({ escapeDc: 13, targetDragCostExempt: false }),
      }
    else
      { ...state, actionAvailable: false }

  pure def releaseFighterGrapple(state: BattleState): BattleState =
    if (fighterGoblinGrappleExists(state))
      {
        ...state,
        fighter: { ...state.fighter, leftHandUse: HFree },
        grapple: NoGrapple,
      }
    else
      state

  pure def escapeFighterGrapple(state: BattleState, escapeSucceeded: bool): BattleState =
    if (currentActor(state) == Goblin and state.actionAvailable and fighterGoblinGrappleExists(state))
      if (escapeSucceeded)
        { ...releaseFighterGrapple(state), actionAvailable: false }
      else
        { ...state, actionAvailable: false }
    else
      state

  pure def goblinAttackRequiresDisadvantage(state: BattleState, targetIsFighter: bool): bool =
    fighterGoblinGrappleExists(state) and not(targetIsFighter)

  pure def offHandAttackFighter(state: BattleState, attackTotal: int, naturalD20: int, damageRoll: int): BattleState =
    if (currentActor(state) == Fighter and state.bonusActionAvailable and state.lightWeaponAttackMade)
      if (attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin)))
        { ...state, goblin: applyDamage(state.goblin, damageRoll, if (naturalD20 == 20) 2 else 1, false), bonusActionAvailable: false }
      else
        { ...state, bonusActionAvailable: false }
    else
      state

  pure def goblinCanOpportunityAttack(state: BattleState, destinationDistance: int): bool =
    state.goblin.hp > 0 and
    state.goblin.reactionAvailable and
    not(state.disengaged) and
    state.fighterGoblinDistance <= 5 and
    destinationDistance > 5

  pure def applyFighterMovement(state: BattleState, movementCost: int, distanceMoved: int, destinationDistance: int): BattleState =
    if (fighterCanMove(state, movementCost, distanceMoved))
      {
        ...state,
        fighter: { ...state.fighter, movementSpent: state.fighter.movementSpent + movementCost },
        fighterGoblinDistance: destinationDistance,
      }
    else
      state

  pure def moveFighter(state: BattleState, movementCost: int, distanceMoved: int, destinationDistance: int): BattleState =
    if (not(fighterCanMove(state, movementCost, distanceMoved)))
      state
    else if (goblinCanOpportunityAttack(state, destinationDistance))
      openReactionWindow(state, {
        trigger: OpportunityAttack,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeMovement({ movementCost: movementCost, distanceMoved: distanceMoved, destinationDistance: destinationDistance }),
      })
    else
      applyFighterMovement(state, movementCost, distanceMoved, destinationDistance)

  pure def applyHealing(target: Combatant, healing: int): Combatant = {
    val effectiveHealing = if (healing < 0) 0 else healing
    val nextHp =
      if (target.hp + effectiveHealing > target.maxHp)
        target.maxHp
      else
        target.hp + effectiveHealing

    if (target.deathFailures >= 3 or effectiveHealing <= 0)
      target
    else if (target.hp == 0 and nextHp > 0)
      {
        ...target,
        hp: nextHp,
        unconscious: false,
        stable: false,
        deathSuccesses: 0,
        deathFailures: 0,
      }
    else
      { ...target, hp: nextHp }
  }

  pure def damageAfterAdjustments(
    damage: int,
    damageType: DamageType,
    resistances: Set[DamageType],
    vulnerabilities: Set[DamageType],
    immunities: Set[DamageType],
  ): int =
    if (immunities.contains(damageType)) 0
    else {
      val afterResistance =
        if (resistances.contains(damageType)) damage / 2 else damage

      if (vulnerabilities.contains(damageType))
        afterResistance * 2
      else
        afterResistance
    }

  pure def sameTypeDamageAfterAdjustments(
    damageParts: List[int],
    damageType: DamageType,
    resistances: Set[DamageType],
    vulnerabilities: Set[DamageType],
    immunities: Set[DamageType],
  ): int =
    damageAfterAdjustments(
      damageParts.foldl(0, (total, damage) => total + damage),
      damageType,
      resistances,
      vulnerabilities,
      immunities,
    )

  pure def grantActionSurge(
    state: BattleState,
    usesRemaining: int,
    usedThisTurn: bool,
  ): ActionSurgeResult =
    if (currentActor(state) == Fighter and usesRemaining > 0 and not(usedThisTurn))
      {
        state: { ...state, actionAvailable: true },
        usesRemaining: usesRemaining - 1,
        usedThisTurn: true,
      }
    else
      { state: state, usesRemaining: usesRemaining, usedThisTurn: usedThisTurn }

  pure def resolveSecondWind(
    state: BattleState,
    usesRemaining: int,
    healingRoll: int,
    fighterLevel: int,
  ): SecondWindResult =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      usesRemaining > 0 and
      not(state.fighter.unconscious)
    )
      {
        state: {
          ...state,
          fighter: applyHealing(state.fighter, healingRoll + fighterLevel),
          bonusActionAvailable: false,
        },
        usesRemaining: usesRemaining - 1,
      }
    else
      { state: state, usesRemaining: usesRemaining }

  pure def expendedSlotsAfterInvocation(
    invocation: SpellInvocation,
    expendedLevelOneSlots: int,
  ): int =
    match invocation {
      | MagicMissile => expendedLevelOneSlots + 1
      | RayOfFrost => expendedLevelOneSlots
      | AcidSplash => expendedLevelOneSlots
    }

  pure def canDiscoverSpellActs(canCastSpells: bool): bool =
    canCastSpells

  pure def spellAttackModifier(
    spellcastingAbilityModifier: int,
    proficiencyBonus: int,
  ): int =
    spellcastingAbilityModifier + proficiencyBonus

  pure def magicMissileAllDartsDamage(
    dieTotal: int,
    dartCount: int,
    flatPerDart: int,
  ): int =
    dieTotal + (dartCount * flatPerDart)

  pure def rayOfFrostSpeedEffectActive(
    hit: bool,
    currentActor: Actor,
    caster: Actor,
  ): bool =
    hit and currentActor != caster

  pure def acidSplashReplayHoles(
    canCastSpells: bool,
    savingThrowOutcomesFilled: bool,
    anyFailedSavingThrow: bool,
  ): Set[Hole] =
    if (not(canCastSpells))
      Set()
    else if (not(savingThrowOutcomesFilled))
      Set(SavingThrowOutcome)
    else if (anyFailedSavingThrow)
      Set(DamageRoll)
    else
      Set()

  pure def acidSplashDamageTarget(
    target: Combatant,
    failedSavingThrow: bool,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): Combatant =
    if (failedSavingThrow)
      applyDamage(target, damageAfterAdjustments(damageRoll, Acid, Set(), Set(), Set()), 1, concentrationSaveSucceeded)
    else
      target

  pure def resolveAcidSplash(
    state: BattleState,
    fighterFailedSavingThrow: bool,
    goblinFailedSavingThrow: bool,
    damageRoll: int,
    fighterConcentrationSaveSucceeded: bool,
    goblinConcentrationSaveSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious)
      state
    else
      {
        ...state,
        fighter: acidSplashDamageTarget(state.fighter, fighterFailedSavingThrow, damageRoll, fighterConcentrationSaveSucceeded),
        goblin: acidSplashDamageTarget(state.goblin, goblinFailedSavingThrow, damageRoll, goblinConcentrationSaveSucceeded),
        actionAvailable: false,
      }

  pure def applyDropToZeroHp(target: Combatant): Combatant =
    match target.lifecycle {
      | DiesAtZeroHp => target
      | UsesDeathSavingThrows => { ...target, unconscious: true, stable: false, deathSuccesses: 0, deathFailures: 0 }
    }

  pure def applyDamageAtZeroHp(target: Combatant, deathFailuresAtZeroHp: int): Combatant =
    match target.lifecycle {
      | DiesAtZeroHp => target
      | UsesDeathSavingThrows => {
          ...target,
          stable: false,
          unconscious: true,
          deathFailures: if (target.deathFailures + deathFailuresAtZeroHp > 3) 3 else target.deathFailures + deathFailuresAtZeroHp,
        }
    }

  pure def applyInstantDeath(target: Combatant): Combatant =
    match target.lifecycle {
      | DiesAtZeroHp => target
      | UsesDeathSavingThrows => { ...target, unconscious: true, stable: false, deathFailures: 3 }
    }

  pure def applyStartTurnDeathSave(target: Combatant, deathSaveRoll: int): Combatant =
    if (target.lifecycle != UsesDeathSavingThrows or target.hp != 0 or target.stable or target.deathFailures >= 3)
      target
    else if (deathSaveRoll == 20)
      { ...target, hp: 1, unconscious: false, stable: false, deathSuccesses: 0, deathFailures: 0 }
    else if (deathSaveRoll == 1)
      applyDamageAtZeroHp(target, 2)
    else if (deathSaveRoll >= 10) {
      val successes = if (target.deathSuccesses + 1 > 3) 3 else target.deathSuccesses + 1
      if (successes >= 3)
        { ...target, stable: true, deathSuccesses: 0, deathFailures: 0 }
      else
        { ...target, deathSuccesses: successes }
    } else {
      applyDamageAtZeroHp(target, 1)
    }

  run test_initial_holes_cover_attack_target = {
    assert(openHoles(initialState).contains(TargetChoice))
  }

  run test_hide_records_discovery_dc = {
    val canHide = { ...initialState, fighterHidePrerequisite: true }
    all {
      assert(hideHoles(initialState) == Set()),
      assert(hideHoles(canHide) == Set(AbilityCheck)),
      assert(hideFighter(initialState, 20).fighter.hidden == NotHidden),
      assert(fighterIsHidden(hideFighter(canHide, 15))),
      assert(hideFighter(canHide, 14).fighter.hidden == NotHidden),
    }
  }

  run test_search_finds_hidden_fighter = {
    val hidden = endTurn(hideFighter({ ...initialState, fighterHidePrerequisite: true }, 18))
    all {
      assert(searchGoblinForFighter(hidden, 17).fighter.hidden == HiddenByDc(HiddenDc18)),
      assert(searchGoblinForFighter(hidden, 18).fighter.hidden == NotHidden),
    }
  }

  run test_attack_reveals_hidden_fighter = {
    val hidden = hideFighter({ ...initialState, fighterHidePrerequisite: true }, 18)
    assert(resolveAttack({ ...hidden, actionAvailable: true }, 1, 1, 4, true).fighter.hidden == NotHidden)
  }

  run test_attack_replay_asks_for_attack_roll_after_target = {
    assert(attackReplayHoles(initialState, AttackNeedsAttackRoll) == Set(AttackRoll))
  }

  run test_attack_replay_asks_for_damage_roll_after_hit = {
    assert(attackReplayHoles(initialState, AttackRollFilled({ attackTotal: 15, naturalD20: 10 })) == Set(DamageRoll))
  }

  run test_goblin_turn_opens_stat_block_attack_target_hole = {
    assert(openHoles(endTurn(initialState)).contains(TargetChoice))
  }

  run test_goblin_turn_opens_stat_block_recharge_hole_before_attack = {
    val spentRecharge = { ...initialState, goblinRechargeAvailable: false }
    assert(openHoles(endTurn(spentRecharge)) == Set(StatBlockRechargeRoll))
  }

  run test_goblin_recharge_roll_restores_available_part_on_success = {
    val spentRecharge = { ...initialState, goblinRechargeAvailable: false }
    val failed = endTurnWithGoblinRechargeRoll(spentRecharge, 4)
    val succeeded = endTurnWithGoblinRechargeRoll(spentRecharge, 5)
    all {
      assert(not(failed.goblinRechargeAvailable)),
      assert(succeeded.goblinRechargeAvailable),
    }
  }

  run test_legendary_action_window_excludes_initial_and_own_turn = {
    val goblinTurn = endTurn(initialState)
    all {
      assert(not(goblinCanUseLegendaryAction(initialState))),
      assert(not(goblinCanUseLegendaryAction(goblinTurn))),
    }
  }

  run test_legendary_action_window_after_another_non_current_turn = {
    val afterFighterTurnWithThirdActor = endTurn({
      ...initialState,
      initiative: { round: 1, alreadyActed: [], stillToAct: [Fighter, Fighter, Goblin] },
    })
    val spent = useGoblinLegendaryAction(afterFighterTurnWithThirdActor)
    all {
      assert(goblinCanUseLegendaryAction(afterFighterTurnWithThirdActor)),
      assert(spent.goblinLegendaryUsesRemaining == 1),
      assert(not(goblinCanUseLegendaryAction(spent))),
    }
  }

  run test_caller_ordered_initiative_tie_selects_first_supplied_actor = {
    all {
      assert(currentActor(callerOrderedTieInitialState) == Goblin),
      assert(
        endTurn(endTurn(callerOrderedTieInitialState)).initiative.stillToAct == [Goblin, Fighter]
      ),
    }
  }

  run test_goblin_attack_replay_uses_fighter_armor_class = {
    assert(attackReplayHoles(endTurn(initialState), AttackRollFilled({ attackTotal: 19, naturalD20: 10 })) == Set(DamageRoll))
  }

  run test_attack_miss_spends_action_without_damage = {
    val result = resolveAttack(initialState, 14, 9, 0, true)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 10),
      assert(result.goblin.tempHp == 0),
    }
  }

  run test_attack_hit_applies_damage_and_spends_action = {
    val result = resolveAttack(initialState, 15, 10, 4, true)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 3),
    }
  }

  run test_goblin_attack_hit_applies_stat_block_damage_to_fighter = {
    val result = resolveGoblinAttack(endTurn(initialState), 20, 18, 5, true)
    all {
      assert(result.actionAvailable == false),
      assert(result.fighter.hp == 5),
    }
  }

  run test_skeleton_damage_adjustments_apply_vulnerability_and_immunity = {
    all {
      assert(
        damageAfterAdjustments(5, Bludgeoning, Set(), Set(Bludgeoning), Set(Poison)) == 10
      ),
      assert(damageAfterAdjustments(5, Poison, Set(), Set(Bludgeoning), Set(Poison)) == 0),
    }
  }

  run test_same_type_damage_adjustments_apply_resistance_after_combining_parts = {
    assert(
      sameTypeDamageAfterAdjustments([3, 1], Slashing, Set(Slashing), Set(), Set()) == 2
    )
  }

  run test_action_surge_grants_one_extra_action_and_spends_use = {
    val result = grantActionSurge({ ...initialState, actionAvailable: false }, 1, false)
    all {
      assert(result.state.actionAvailable),
      assert(result.usesRemaining == 0),
      assert(result.usedThisTurn),
      assert(grantActionSurge(result.state, result.usesRemaining, result.usedThisTurn) == result),
    }
  }

  run test_second_wind_spends_bonus_action_use_and_heals = {
    val wounded = { ...initialState, fighter: { ...initialState.fighter, hp: 4 } }
    val result = resolveSecondWind(wounded, 2, 6, 2)
    all {
      assert(result.state.fighter.hp == 12),
      assert(not(result.state.bonusActionAvailable)),
      assert(result.usesRemaining == 1),
    }
  }

  run test_spell_invocation_slot_spend_distinguishes_prepared_spell_from_cantrip = {
    all {
      assert(expendedSlotsAfterInvocation(MagicMissile, 0) == 1),
      assert(expendedSlotsAfterInvocation(RayOfFrost, 0) == 0),
      assert(expendedSlotsAfterInvocation(AcidSplash, 0) == 0),
    }
  }

  run test_spell_act_discovery_respects_spellcasting_gate = {
    all {
      assert(canDiscoverSpellActs(true)),
      assert(not(canDiscoverSpellActs(false))),
    }
  }

  run test_spell_invocation_executable_spell_facts = {
    all {
      assert(spellAttackModifier(3, 2) == 5),
      assert(magicMissileAllDartsDamage(3, 3, 1) == 6),
      assert(rayOfFrostSpeedEffectActive(true, Goblin, Fighter)),
      assert(not(rayOfFrostSpeedEffectActive(true, Fighter, Fighter))),
    }
  }

  run test_acid_splash_replay_asks_for_saving_throw_outcomes_then_damage_on_failure = {
    all {
      assert(acidSplashReplayHoles(true, false, false) == Set(SavingThrowOutcome)),
      assert(acidSplashReplayHoles(true, true, true) == Set(DamageRoll)),
      assert(acidSplashReplayHoles(true, true, false) == Set()),
      assert(acidSplashReplayHoles(false, false, false) == Set()),
    }
  }

  run test_acid_splash_damage_applies_only_to_failed_saving_throw_targets = {
    val result = resolveAcidSplash(initialState, false, true, 4, true, true)
    all {
      assert(result.actionAvailable == false),
      assert(result.fighter.hp == 12),
      assert(result.goblin.hp == 6),
    }
  }

  run test_critical_hit_applies_doubled_damage_dice = {
    val result = resolveAttack(initialState, 20, 20, 9, true)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 0),
    }
  }

  run test_temporary_hp_absorbs_damage_before_hp = {
    val result = resolveAttack(withGoblinHp(initialState, 10, 5), 15, 10, 4, true)
    all {
      assert(result.goblin.tempHp == 0),
      assert(result.goblin.hp == 8),
    }
  }

  run test_hp_clamps_to_zero_and_monster_dies = {
    val result = resolveAttack(withGoblinHp(initialState, 3, 0), 15, 10, 8, true)
    all {
      assert(result.goblin.hp == 0),
      assert(result.goblin.lifecycle == DiesAtZeroHp),
    }
  }

  run test_character_drop_to_zero_uses_death_saving_throw_lifecycle = {
    val result = applyDamage(withFighterHp(initialState, 3, 0).fighter, 11, 1, true)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.deathFailures == 0),
      assert(result.lifecycle == UsesDeathSavingThrows),
    }
  }

  run test_massive_damage_kills_character_on_drop_to_zero = {
    val result = applyDamage(withFighterHp(initialState, 3, 0).fighter, 19, 2, true)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.deathFailures == 3),
    }
  }

  run test_character_damage_at_zero_adds_one_death_failure = {
    val result = applyDamage(withFighterHp(initialState, 0, 0).fighter, 7, 1, true)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.deathFailures == 1),
    }
  }

  run test_character_critical_damage_at_zero_adds_two_death_failures = {
    val result = applyDamage(withFighterHp(initialState, 0, 0).fighter, 7, 2, true)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.deathFailures == 2),
    }
  }

  run test_massive_damage_at_zero_kills_character = {
    val result = applyDamage(withFighterHp(initialState, 0, 0).fighter, 13, 2, true)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.deathFailures == 3),
    }
  }

  run test_start_turn_death_save_failure_adds_one_failure = {
    val result = endTurnWithDeathSave(withFighterHp(endTurn(initialState), 0, 0), 5)
    all {
      assert(currentActor(result) == Fighter),
      assert(result.fighter.hp == 0),
      assert(result.fighter.unconscious),
      assert(result.fighter.deathFailures == 1),
    }
  }

  run test_start_turn_death_save_success_three_stabilizes = {
    val fighter = { ...withFighterHp(initialState, 0, 0).fighter, unconscious: true, deathSuccesses: 2, deathFailures: 1 }
    val result = endTurnWithDeathSave({ ...endTurn(initialState), fighter: fighter }, 10)
    all {
      assert(result.fighter.hp == 0),
      assert(result.fighter.unconscious),
      assert(result.fighter.stable),
      assert(result.fighter.deathSuccesses == 0),
      assert(result.fighter.deathFailures == 0),
    }
  }

  run test_start_turn_death_save_natural_twenty_restores_one_hp = {
    val fighter = { ...withFighterHp(initialState, 0, 0).fighter, deathSuccesses: 1, deathFailures: 2 }
    val result = endTurnWithDeathSave({ ...endTurn(initialState), fighter: fighter }, 20)
    all {
      assert(result.fighter.hp == 1),
      assert(not(result.fighter.unconscious)),
      assert(not(result.fighter.stable)),
      assert(result.fighter.deathSuccesses == 0),
      assert(result.fighter.deathFailures == 0),
    }
  }

  run test_end_turn_advances_current_actor_and_resets_resources = {
    val result = endTurn({ ...initialState, actionAvailable: false, bonusActionAvailable: false })
    all {
      assert(currentActor(result) == Goblin),
      assert(result.initiative.round == 1),
      assert(result.actionAvailable),
      assert(result.bonusActionAvailable),
    }
  }

  run test_end_turn_wraps_to_next_round = {
    val result = endTurn(endTurn(initialState))
    all {
      assert(currentActor(result) == Fighter),
      assert(result.initiative.round == 2),
      assert(result.initiative.alreadyActed == []),
      assert(result.initiative.stillToAct == [Fighter, Goblin]),
    }
  }

  run test_mage_armor_sets_base_ac_plus_dex = {
    all {
      assert(activeEffectArmorClass(10, 2, Set(MageArmor)) == 15),
      assert(activeEffectArmorClass(10, 2, Set(RayOfFrostSpeedDelta)) == 10),
    }
  }

  run test_concentration_damage_dc_is_capped = {
    all {
      assert(concentrationSavingThrowDc(24) == 12),
      assert(concentrationSavingThrowDc(80) == 30),
    }
  }

  run test_concentration_breaks_on_failed_damage_save = {
    val concentrating = { ...initialState.fighter, concentrating: true, activeEffects: Set(MageArmor) }
    val result = applyDamage(concentrating, 5, 1, false)
    all {
      assert(not(result.concentrating)),
      assert(result.activeEffects == Set()),
    }
  }

  run test_attack_action_can_break_target_concentration = {
    val concentratingGoblin = { ...initialState, goblin: { ...initialState.goblin, concentrating: true, activeEffects: Set(MageArmor) } }
    val result = resolveAttack(concentratingGoblin, 15, 10, 4, false)
    all {
      assert(result.goblin.hp == 3),
      assert(not(result.goblin.concentrating)),
      assert(result.goblin.activeEffects == Set()),
    }
  }

  run test_goblin_attack_action_can_break_target_concentration = {
    val concentratingFighter = { ...endTurn(initialState), fighter: { ...initialState.fighter, concentrating: true, activeEffects: Set(MageArmor) } }
    val result = resolveGoblinAttack(concentratingFighter, 20, 18, 5, false)
    all {
      assert(result.fighter.hp == 5),
      assert(not(result.fighter.concentrating)),
      assert(result.fighter.activeEffects == Set()),
    }
  }

  run test_acid_splash_damage_can_break_target_concentration = {
    val concentratingGoblin = { ...initialState, goblin: { ...initialState.goblin, concentrating: true, activeEffects: Set(MageArmor) } }
    val result = resolveAcidSplash(concentratingGoblin, false, true, 4, true, false)
    all {
      assert(result.goblin.hp == 6),
      assert(not(result.goblin.concentrating)),
      assert(result.goblin.activeEffects == Set()),
    }
  }

  run test_readied_spell_uses_concentration_until_release_or_next_turn = {
    val readied = readySpell(initialState)
    val released = releaseReadiedSpell(readied)
    val expired = endTurn(endTurn(readied))
    all {
      assert(readied.fighter.concentrating),
      assert(readied.fighterReadiedSpellHeld),
      assert(not(released.fighter.concentrating)),
      assert(not(released.fighterReadiedSpellHeld)),
      assert(not(expired.fighterReadiedSpellHeld)),
    }
  }

  run test_movement_spends_budget_and_updates_distance = {
    val moved = moveFighter(initialState, 10, 10, 4)
    all {
      assert(moved.fighter.movementSpent == 10),
      assert(moved.fighterGoblinDistance == 4),
      assert(movementRemaining(moved.fighter) == 20),
    }
  }

  run test_generic_combat_actions_update_turn_state = {
    val dashed = dashFighter(initialState)
    val disengaged = disengageFighter(initialState)
    val dodged = dodgeFighter(initialState)
    val readied = readyFighter(initialState)
    val helped = helpFighterAttack(initialState)
    all {
      assert(not(dashed.actionAvailable)),
      assert(dashed.dashMovementBonus == 30),
      assert(movementRemainingForFighter(dashed) == 60),
      assert(disengaged.disengaged),
      assert(dodged.fighter.dodging),
      assert(readied.fighterReadiedActionHeld),
      assert(helped.fighterHelpAttackGoblinForGoblin),
    }
  }

  run test_stand_from_prone_spends_half_speed_movement = {
    val prone = { ...initialState, fighter: { ...initialState.fighter, prone: true } }
    val stood = standFighterFromProne(prone)
    all {
      assert(stood.fighter.movementSpent == 15),
      assert(not(stood.fighter.prone)),
      assert(movementRemainingForFighter(stood) == 15),
    }
  }

  run test_disengage_suppresses_opportunity_attack_window = {
    val disengaged = disengageFighter({ ...initialState, actionAvailable: true })
    val moved = moveFighter(disengaged, 5, 5, 10)
    all {
      assert(moved.interruptStack == []),
      assert(moved.fighterGoblinDistance == 10),
      assert(moved.fighter.movementSpent == 5),
    }
  }

  run test_movement_over_budget_is_rejected = {
    assert(moveFighter(initialState, 35, 35, 40) == initialState)
  }

  run test_grapple_release_and_escape_update_link_state = {
    val grappled = grappleFighterGoblin(initialState, true)
    val released = releaseFighterGrapple(grappled)
    val escaped = escapeFighterGrapple(endTurn(grappled), true)
    all {
      assert(fighterGoblinGrappleExists(grappled)),
      assert(grappled.fighter.leftHandUse == HGrapple),
      assert(not(fighterGoblinGrappleExists(released))),
      assert(not(fighterGoblinGrappleExists(escaped))),
    }
  }

  run test_off_hand_requires_prior_light_attack_and_spends_bonus_action = {
    val rejected = offHandAttackFighter(initialState, 15, 10, 4)
    val afterAttack = resolveAttack(initialState, 1, 1, 4, false)
    val offHand = offHandAttackFighter(afterAttack, 15, 10, 4)
    all {
      assert(rejected == initialState),
      assert(afterAttack.lightWeaponAttackMade),
      assert(not(offHand.bonusActionAvailable)),
      assert(offHand.goblin.hp == 6),
    }
  }

  run test_grappled_attack_disadvantage_excludes_the_grappler = {
    val grappled = endTurn(grappleFighterGoblin(initialState, true))
    all {
      assert(not(goblinAttackRequiresDisadvantage(grappled, true))),
      assert(goblinAttackRequiresDisadvantage(grappled, false)),
    }
  }

  run test_grapple_drag_cost_is_enforced = {
    val grappled = grappleFighterGoblin(initialState, true)
    val underpaid = moveFighter(grappled, 1, 1, 4)
    val paid = moveFighter(grappled, 2, 1, 4)
    val underpaidSameDistance = moveFighter(grappled, 5, 5, 5)
    val paidSameDistance = moveFighter(grappled, 10, 5, 5)
    all {
      assert(underpaid == grappled),
      assert(paid.fighter.movementSpent == 2),
      assert(paid.fighterGoblinDistance == 4),
      assert(underpaidSameDistance == grappled),
      assert(paidSameDistance.fighter.movementSpent == 10),
    }
  }

  run test_movement_leaving_reach_opens_opportunity_attack_window_before_position_commit = {
    val awaiting = moveFighter(initialState, 5, 5, 10)
    all {
      assert(awaiting.fighter.movementSpent == 0),
      assert(awaiting.fighterGoblinDistance == 5),
      assert(awaiting.interruptStack.length() == 1),
      assert(awaiting.interruptStack[0].trigger == OpportunityAttack),
      assert(awaiting.interruptStack[0].eligibleReactors == Set(Goblin)),
    }
  }

  run test_declined_opportunity_attack_resumes_movement = {
    val awaiting = moveFighter(initialState, 5, 5, 10)
    val resumed = declineReactionAndResume(awaiting, Goblin)
    all {
      assert(resumed.interruptStack == []),
      assert(resumed.fighter.movementSpent == 5),
      assert(resumed.fighterGoblinDistance == 10),
      assert(resumed.goblin.reactionAvailable),
    }
  }

  run test_resolved_opportunity_attack_spends_reaction_damages_then_resumes_movement = {
    val awaiting = moveFighter(initialState, 5, 5, 10)
    val resolved = resolveReaction(awaiting, Goblin)
    all {
      assert(resolved.interruptStack == []),
      assert(resolved.goblin.reactionAvailable == false),
      assert(resolved.fighter.hp == 6),
      assert(resolved.fighter.movementSpent == 5),
      assert(resolved.fighterGoblinDistance == 10),
    }
  }

  run test_resolved_reaction_releases_readied_spell_and_resumes_attack_continuation = {
    val readied = { ...readySpell(initialState), actionAvailable: true }
    val awaitingReaction = openReactionWindow(readied, {
      trigger: AttackHit,
      eligibleReactors: Set(Fighter),
      offeredReactors: Set(),
      continuation: ResumeAttack,
    })
    val resolved = resolveReaction(awaitingReaction, Fighter)
    all {
      assert(not(resolved.fighterReadiedSpellHeld)),
      assert(not(resolved.fighter.concentrating)),
      assert(not(resolved.fighter.reactionAvailable)),
      assert(resolved.goblin.hp == 3),
      assert(not(resolved.actionAvailable)),
      assert(resolved.interruptStack == []),
    }
  }
}
