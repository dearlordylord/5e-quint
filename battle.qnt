// -*- mode: Bluespec; -*-

/// Battle State — Multi-creature combat orchestration.
/// Composes on top of creature.qnt pure functions.
///
/// SIMPLIFICATIONS (each is a planned incremental improvement, see PLAN_BATTLE.md):
/// - No class states in Combatant. Full version: ClassStateMap
/// - Limited reactions (retroactive AC/roll mods, damage reduction, Counterspell, LR). Full version: all 26 from R10
/// These are simplifications of a correct structure, not structural gaps.

module battle {

  import creature.* from "./creature"

  // ============================================================
  // 1. BATTLE TYPES
  // ============================================================

  type CreatureId = str

  // Per-creature bundle. Simplified — no class states yet.
  type Combatant = {
    creature: CreatureState,
    turn: TurnState,
    slots: SpellSlotState,
    kind: CreatureKind,
    monsterResources: MonsterResourceState,  // legendary actions/resistances (B10)
  }

  type TriggerType =
    | TAttackHits       // "when hit by attack roll" — Shield, Parry
    | TAttackDamages    // "when you take damage from attack" — Uncanny Dodge
    | TSpellBeingCast   // "see creature casting a spell" — Counterspell
    | TSaveFailed       // "fails a saving throw" — Legendary Resistance, Countercharm
    | TDamageTaken      // "after taking damage" — Hellish Rebuke, Retaliation (R10.4)

  type ReactionDecision =
    | RPass
    | RShield
    | RUncannyDodge
    | RParry(int)            // +AC bonus (2–5); covers Parry variants, Shield Guardian Protection (R10.1)
    | RCuttingWords(int)     // subtract from attack roll (Bardic Inspiration die, R10.1)
    | RCounterspell(bool)    // bool = target CON save succeeded (5.2.1 Counterspell)
    | RLegendaryResistance   // auto-succeed the save
    | RDamageReduction(int)  // flat damage reduction (Deflect Attacks, Storm Giant Deflect, R10.3)

  // Movement context: mover and who they're leaving the reach of.
  // threatenedBy is caller-provided (spatial concern per O2).
  type MovementCtx = {
    mover: CreatureId,
    threatenedBy: Set[CreatureId],  // creatures whose reach the mover is leaving
    processed: Set[CreatureId],      // already offered OA
  }

  type AttackHitCtx = {
    attacker: CreatureId,
    target: CreatureId,
    attackRoll: int,
    targetAc: int,
    damage: int,
    damageType: DamageType,
    isCritical: bool,
    atkReturnTo: AfterDamageReturn,  // where to go after entire attack chain resolves
  }

  type AttackDamageCtx = {
    attacker: CreatureId,
    target: CreatureId,
    damage: int,
    damageType: DamageType,
    isCritical: bool,
    atkReturnTo: AfterDamageReturn,
  }

  // Context for a spell being cast (Counterspell interrupt)
  type SpellCastCtx = {
    caster: CreatureId,
    // The rest of the spell resolution lives in the post-cast context.
    // This just tracks who is casting, so Counterspell knows the target.
    // postCast describes what happens if the spell is NOT countered.
    postCast: PostCastEffect,
  }

  // What happens after a spell resolves (not countered).
  // Each variant is a different spell shape.
  type PostCastEffect =
    | PCESave(SaveSpellCtx)       // save-or-suck spell (single target)
    | PCEAoE(AoESpellCtx)        // AoE spell (multiple targets, R32)
    | PCECounterspell(CounterspellEffect)  // Counterspell (R3, R10.2, R21)
    | PCEDone                     // placeholder for future spell types

  // Context for a save-based spell targeting one creature.
  type SaveSpellCtx = {
    caster: CreatureId,
    target: CreatureId,
    saveDC: int,               // caller-provided (8 + prof + ability mod)
    saveRoll: int,             // pre-resolved save roll
    damageOnFail: int,         // 0 if no damage
    halfOnSuccess: bool,       // true for spells like Fireball (half damage on save)
    damageType: DamageType,
    conditionOnFail: Condition, // CBlinded etc. Use CBlinded as "none" placeholder
    applyCondition: bool,       // true if spell actually applies a condition on fail
    slotLevel: int,             // for slot expenditure
  }

  // Context for a failed save (Legendary Resistance / Countercharm interrupt)
  type SaveFailedCtx = {
    caster: CreatureId,
    target: CreatureId,
    damageOnFail: int,
    halfOnSuccess: bool,
    damageType: DamageType,
    conditionOnFail: Condition,
    applyCondition: bool,
    saveSucceeded: bool,       // mutable — LR can flip this to true
  }

  // Context for an AoE spell affecting multiple targets (R32).
  // Save rolls generated per-target at resolution time (not pre-resolved).
  type AoESpellCtx = {
    caster: CreatureId,
    saveDC: int,
    damageOnFail: int,
    halfOnSuccess: bool,       // true for Fireball (half damage on save)
    damageType: DamageType,
    conditionOnFail: Condition,
    applyCondition: bool,
    remaining: Set[CreatureId], // targets not yet resolved
  }

  // Counterspell effect: what happens when a Counterspell resolves.
  // Flat type — no reference to SpellCastCtx (avoids type cycle).
  // The chain context is tracked via bSpellStack state variable.
  type CounterspellEffect = {
    targetCasterId: CreatureId,    // caster of the countered spell (makes CON save)
    conSaveSucceeded: bool,        // pre-resolved CON save result
  }

  // Entry in the Counterspell chain stack. Captures the interrupted spell's
  // context so we can return to its reaction loop after chain resolution.
  type SpellStackEntry = {
    spellCasterId: CreatureId,     // who cast the interrupted spell
    spellPostCast: PostCastEffect, // frozen snapshot at push time — not updated during chain
    offered: Set[CreatureId],      // offered set when the CS window was interrupted
  }

  // Where to return after resolving an after-damage reaction.
  // Separate from BattlePhase to avoid a type cycle (AfterDamageCtx → BattlePhase → PendingInterrupt → AfterDamageCtx).
  type AfterDamageReturn =
    | ADRActiveTurn
    | ADRResolvingAoE(AoESpellCtx)
    | ADRResolvingMovement(MovementCtx)

  // Context for after-damage reactions (R10.4, R20 Phase 4).
  // Tracks who dealt damage and to whom, so reactions like Hellish Rebuke know the attacker.
  type AfterDamageCtx = {
    damageSource: CreatureId,     // who dealt the damage
    damagedCreature: CreatureId,  // who took the damage
    damageDealt: int,
    damageType: DamageType,
    returnTo: AfterDamageReturn,  // phase to return to after resolving
  }

  type PendingInterrupt =
    | PIAttackHit(AttackHitCtx)
    | PIAttackDamage(AttackDamageCtx)
    | PISpellCast(SpellCastCtx)
    | PISaveFailed(SaveFailedCtx)
    | PISaveFailedAoE(AoESaveFailedCtx)  // save failed during AoE, with continuation
    | PIAfterDamage(AfterDamageCtx)      // after damage applied (R10.4)

  type AoESaveFailedCtx = {
    sf: SaveFailedCtx,
    aoe: AoESpellCtx,
  }

  type AwaitCtx = {
    interrupt: PendingInterrupt,
    trigger: TriggerType,
    eligible: Set[CreatureId],
    offered: Set[CreatureId],
  }

  // Context for legendary action window at end of turn (R7).
  type LAWindowCtx = {
    eligibleMonsters: Set[CreatureId],  // monsters with LA remaining + not incapacitated
    endingTurnIndex: int,                // turn index that just ended (for advancing)
  }

  type BattlePhase =
    | BPActiveTurn
    | BPAwaitingReaction(AwaitCtx)
    | BPResolvingAoE(AoESpellCtx)       // processing AoE targets one by one (R32)
    | BPResolvingMovement(MovementCtx)   // processing OAs one by one (R5, R22)
    | BPAwaitingLegendaryAction(LAWindowCtx)  // LA window at end of turn (R7)

  // ============================================================
  // 2. STATE VARIABLES
  // ============================================================

  var bCreatures: CreatureId -> Combatant
  var bInitiative: List[CreatureId]
  var bTurnIndex: int
  var bRound: int
  var bPhase: BattlePhase
  var bSpellStack: List[SpellStackEntry]  // Counterspell chain stack (B5)

  // ============================================================
  // 3. HELPERS
  // ============================================================

  pure def setCreature(
    cs: CreatureId -> Combatant, id: CreatureId, c: CreatureState
  ): (CreatureId -> Combatant) =
    cs.set(id, cs.get(id).with("creature", c))

  pure def setTurn(
    cs: CreatureId -> Combatant, id: CreatureId, t: TurnState
  ): (CreatureId -> Combatant) =
    cs.set(id, cs.get(id).with("turn", t))

  pure def setSlots(
    cs: CreatureId -> Combatant, id: CreatureId, s: SpellSlotState
  ): (CreatureId -> Combatant) =
    cs.set(id, cs.get(id).with("slots", s))

  pure def hasReaction(cs: CreatureId -> Combatant, id: CreatureId): bool =
    cs.get(id).turn.reactionAvailable

  pure def spendReaction(
    cs: CreatureId -> Combatant, id: CreatureId
  ): (CreatureId -> Combatant) =
    setTurn(cs, id, pUseReaction(cs.get(id).turn))

  val EMPTY_MONSTER_RESOURCES: MonsterResourceState = {
    legendaryActionsRemaining: 0,
    legendaryResistancesRemaining: 0,
    rechargeAvailable: Map(),
    dailyUsesRemaining: Map(),
  }

  pure def mkCombatant(maxHp: int, k: CreatureKind): Combatant = {
    creature: freshCreature(maxHp),
    turn: FRESH_TURN,
    slots: FRESH_SPELL_SLOTS,
    kind: k,
    monsterResources: EMPTY_MONSTER_RESOURCES,
  }

  // Combatant with spell slots (for casters in battle)
  pure def mkCaster(maxHp: int, k: CreatureKind): Combatant = {
    creature: freshCreature(maxHp),
    turn: FRESH_TURN,
    slots: {
      slotsMax: EMPTY_SLOTS.set(1, 4).set(2, 3).set(3, 2),
      slotsCurrent: EMPTY_SLOTS.set(1, 4).set(2, 3).set(3, 2),
      pactSlotsMax: 0, pactSlotsCurrent: 0, pactSlotLevel: 0,
      concentrationSpellId: "",
    },
    kind: k,
    monsterResources: EMPTY_MONSTER_RESOURCES,
  }

  // Monster with legendary actions and resistances
  pure def mkMonster(maxHp: int, laUses: int, lrUses: int): Combatant = {
    creature: freshCreature(maxHp),
    turn: FRESH_TURN,
    slots: FRESH_SPELL_SLOTS,
    kind: Monster,
    monsterResources: EMPTY_MONSTER_RESOURCES
      .with("legendaryActionsRemaining", laUses)
      .with("legendaryResistancesRemaining", lrUses),
  }

  pure def dealDamage(
    cs: CreatureId -> Combatant, targetId: CreatureId,
    dmg: int, dt: DamageType, crit: bool
  ): (CreatureId -> Combatant) = {
    val t = cs.get(targetId)
    val nc = pTakeDamageAsCreature(t.creature, dmg, dt, Set(), Set(), Set(), crit, t.kind)
    setCreature(cs, targetId, nc)
  }


  /// Remove all active effects with the given casterId from a creature.
  /// Used for concentration break propagation (R33).
  pure def removeEffectsByCaster(creature: CreatureState, cId: CreatureId): CreatureState =
    creature.with("activeEffects", creature.activeEffects.filter(e => e.casterId != cId))

  /// Break concentration for a caster and propagate: remove all effects
  /// cast by this caster from ALL creatures in the battle.
  pure def breakConcentrationAndPropagate(
    cs: CreatureId -> Combatant, casterId: CreatureId
  ): (CreatureId -> Combatant) = {
    val caster = cs.get(casterId)
    val spellId = caster.slots.concentrationSpellId
    if (spellId == "") cs  // not concentrating
    else {
      val newSlots = pBreakConcentration(caster.slots)
      val newCreature = caster.creature.with("activeEffects", pRemoveEffect(caster.creature.activeEffects, spellId))
      val cs1 = setSlots(setCreature(cs, casterId, newCreature), casterId, newSlots)
      cs.keys().exclude(Set(casterId)).fold(cs1, (acc, id) =>
        val c = acc.get(id)
        val cleaned = removeEffectsByCaster(c.creature, casterId)
        if (cleaned == c.creature) acc else setCreature(acc, id, cleaned)
      )
    }
  }


  /// Eligible reactors: everyone except excludeId who has reaction + alive.
  pure def eligibleExcluding(
    cs: CreatureId -> Combatant, excludeId: CreatureId
  ): Set[CreatureId] =
    cs.keys().exclude(Set(excludeId)).filter(id =>
      hasReaction(cs, id) and not(cs.get(id).creature.dead)
    )

  /// Eligible single-target reactor: target alone if it has reaction + alive.
  /// Used for damage-reactions (Uncanny Dodge) and save-failed (Legendary Resistance).
  pure def eligibleTarget(
    cs: CreatureId -> Combatant, targetId: CreatureId
  ): Set[CreatureId] =
    if (hasReaction(cs, targetId) and not(cs.get(targetId).creature.dead))
      Set(targetId)
    else
      Set()

  /// Does the creature have a spell slot of level 3 or higher?
  /// Required for Counterspell (level 3 Abjuration).
  pure def hasCounterspellSlot(cs: CreatureId -> Combatant, id: CreatureId): bool =
    val slots = cs.get(id).slots.slotsCurrent
    3.to(9).exists(lvl => slots.get(lvl) > 0)

  /// Eligible Counterspell reactors: base eligible + has level 3+ slot.
  pure def eligibleForCounterspell(
    cs: CreatureId -> Combatant, excludeId: CreatureId
  ): Set[CreatureId] =
    eligibleExcluding(cs, excludeId).filter(id => hasCounterspellSlot(cs, id))

  /// Pop the top entry from a spell stack.
  pure def popStack(s: List[SpellStackEntry]): { top: SpellStackEntry, rest: List[SpellStackEntry] } =
    { top: s[s.length() - 1], rest: s.slice(0, s.length() - 1) }

  /// Build an AwaitCtx with empty offered set.
  pure def mkAwait(pi: PendingInterrupt, tt: TriggerType, elig: Set[CreatureId]): AwaitCtx =
    { interrupt: pi, trigger: tt, eligible: elig, offered: Set() }

  /// Build a SaveFailedCtx from spell effect fields. Used by resolveSave and bResolveAoETarget.
  pure def mkSaveFailedCtx(
    casterId: CreatureId, targetId: CreatureId,
    dmg: int, half: bool, dt: DamageType,
    cond: Condition, applyCond: bool
  ): SaveFailedCtx = {
    caster: casterId, target: targetId,
    damageOnFail: dmg, halfOnSuccess: half, damageType: dt,
    conditionOnFail: cond, applyCondition: applyCond,
    saveSucceeded: false,
  }

  /// Apply damage and check for after-damage reactions (R10.4).
  /// Returns new creatures + phase. If an eligible reactor exists, enters
  /// BPAwaitingReaction(PIAfterDamage); otherwise returns the given returnPhase.
  pure def dealDamageWithAfterReactions(
    cs: CreatureId -> Combatant,
    targetId: CreatureId, sourceId: CreatureId,
    dmg: int, dt: DamageType, crit: bool,
    returnTo: AfterDamageReturn
  ): { creatures: CreatureId -> Combatant, phase: BattlePhase } = {
    val cs1 = dealDamage(cs, targetId, dmg, dt, crit)
    // After damage: damaged creature can react (Hellish Rebuke, Retaliation)
    val elig = eligibleTarget(cs1, targetId)
    if (dmg > 0 and elig.size() > 0) {
      val adCtx: AfterDamageCtx = {
        damageSource: sourceId, damagedCreature: targetId,
        damageDealt: dmg, damageType: dt, returnTo: returnTo,
      }
      { creatures: cs1, phase: BPAwaitingReaction(mkAwait(PIAfterDamage(adCtx), TDamageTaken, elig)) }
    } else {
      { creatures: cs1, phase: returnToPhase(returnTo) }
    }
  }

  /// Convert AfterDamageReturn to BattlePhase.
  pure def returnToPhase(r: AfterDamageReturn): BattlePhase =
    match r {
      | ADRActiveTurn => BPActiveTurn
      | ADRResolvingAoE(aoe) => BPResolvingAoE(aoe)
      | ADRResolvingMovement(mv) => BPResolvingMovement(mv)
    }

  action keepBattle = all {
    bInitiative' = bInitiative,
    bTurnIndex' = bTurnIndex,
    bRound' = bRound,
    bSpellStack' = bSpellStack,
  }

  /// Compute next turn index and round number.
  pure def nextTurn(turnIndex: int, initLen: int, round: int): { idx: int, round: int } = {
    val nextIdx = if (turnIndex + 1 < initLen) turnIndex + 1 else 0
    { idx: nextIdx, round: if (nextIdx == 0) round + 1 else round }
  }

  // ============================================================
  // 4. BATTLE ACTIONS
  // ============================================================

  action bInit = {
    nondet hp1 = 10.to(30).oneOf()
    nondet hp2 = 10.to(30).oneOf()
    nondet hp3 = 20.to(50).oneOf()
    all {
      bCreatures' = Map(
        "A" -> mkCaster(hp1, PC),
        "B" -> mkCaster(hp2, PC),
        "C" -> mkMonster(hp3, 3, 3)  // monster with 3 LA and 3 LR
      ),
      bInitiative' = ["A", "B", "C"],
      bTurnIndex' = 0,
      bRound' = 1,
      bPhase' = BPActiveTurn,
      bSpellStack' = List(),
    }
  }

  action bStartTurn = {
    val activeId = bInitiative[bTurnIndex]
    val c = bCreatures.get(activeId)
    all {
      bPhase == BPActiveTurn,
      // Fresh turn + refresh LA at start of monster's own turn (R7)
      val cs1 = setTurn(bCreatures, activeId, FRESH_TURN)
      val cs2 = if (c.kind == Monster) {
        // Simplified: maxUses=3, inLair=false. Full version reads from stat block.
        val newMR = pRefreshLegendaryActions(c.monsterResources, 3, false)
        cs1.set(activeId, cs1.get(activeId).with("monsterResources", newMR))
      } else cs1
      all {
        bCreatures' = cs2,
        bPhase' = BPActiveTurn,
        keepBattle,
      }
    }
  }

  // --- Attack transaction (B0/B1) ---

  action bAttack = {
    val activeId = bInitiative[bTurnIndex]
    val allIds = bCreatures.keys()
    val ac = bCreatures.get(activeId)
    nondet targetId = allIds.exclude(Set(activeId)).oneOf()
    nondet attackRoll = 1.to(20).oneOf()
    nondet dmg = 1.to(12).oneOf()
    nondet dt = Set(Slashing, Piercing, Bludgeoning).oneOf()
    nondet crit = Bool.oneOf()
    nondet tAc = 10.to(20).oneOf()
    val tc = bCreatures.get(targetId)
    all {
      bPhase == BPActiveTurn,
      ac.turn.actionsRemaining > 0 or ac.turn.extraAttacksRemaining > 0,
      not(ac.creature.dead),
      not(tc.creature.dead),
      val newTurn = if (ac.turn.attackActionUsed and ac.turn.extraAttacksRemaining > 0)
        ac.turn.with("extraAttacksRemaining", ac.turn.extraAttacksRemaining - 1)
      else
        pUseAction(ac.turn, ac.creature, AAttack)
      val cs1 = setTurn(bCreatures, activeId, newTurn)
      val hit = attackRoll >= tAc or attackRoll == 20
      if (not(hit)) {
        all { bCreatures' = cs1, bPhase' = BPActiveTurn, keepBattle }
      } else {
        val atkCtx: AttackHitCtx = {
          attacker: activeId, target: targetId,
          attackRoll: attackRoll, targetAc: tAc,
          damage: dmg, damageType: dt, isCritical: crit,
          atkReturnTo: ADRActiveTurn,
        }
        val elig = eligibleExcluding(cs1, activeId)
        if (elig.size() > 0) {
          all {
            bCreatures' = cs1,
            bPhase' = BPAwaitingReaction(mkAwait(PIAttackHit(atkCtx), TAttackHits, elig)),
            keepBattle,
          }
        } else {
          val result = dealDamageWithAfterReactions(cs1, targetId, activeId, dmg, dt, crit, ADRActiveTurn)
          all { bCreatures' = result.creatures, bPhase' = result.phase, keepBattle }
        }
      }
    }
  }

  pure def advanceFromHitPhase(
    cs: CreatureId -> Combatant, atk: AttackHitCtx
  ): { creatures: CreatureId -> Combatant, phase: BattlePhase } = {
    val stillHit = atk.attackRoll >= atk.targetAc or atk.attackRoll == 20
    if (not(stillHit)) {
      { creatures: cs, phase: returnToPhase(atk.atkReturnTo) }
    } else {
      val dmgElig = eligibleTarget(cs, atk.target)
      if (dmgElig.size() > 0) {
        val dmgCtx: AttackDamageCtx = {
          attacker: atk.attacker, target: atk.target,
          damage: atk.damage, damageType: atk.damageType,
          isCritical: atk.isCritical, atkReturnTo: atk.atkReturnTo,
        }
        { creatures: cs, phase: BPAwaitingReaction(mkAwait(PIAttackDamage(dmgCtx), TAttackDamages, dmgElig)) }
      } else {
        // No damage-phase reactions — deal damage and check for after-damage reactions (R10.4)
        dealDamageWithAfterReactions(cs, atk.target, atk.attacker,
          atk.damage, atk.damageType, atk.isCritical, atk.atkReturnTo)
      }
    }
  }

  action bResolveHitReaction = {
    match bPhase {
      | BPAwaitingReaction(ctx) =>
        match ctx.interrupt {
          | PIAttackHit(atk) =>
            val remaining = ctx.eligible.exclude(ctx.offered)
            if (remaining.size() == 0) {
              val result = advanceFromHitPhase(bCreatures, atk)
              all { bCreatures' = result.creatures, bPhase' = result.phase, keepBattle }
            } else {
              nondet reactorId = remaining.oneOf()
              nondet parryBonus = 2.to(5).oneOf()
              nondet cwReduction = 1.to(12).oneOf()
              nondet decision = Set(RPass, RShield, RParry(parryBonus), RCuttingWords(cwReduction)).oneOf()
              val newOffered = ctx.offered.union(Set(reactorId))
              val newElig = ctx.eligible.exclude(Set(reactorId))
              // Retroactive reactions: spend reaction, modify atk, stay in hit phase.
              // RPass leaves atk unchanged; retroactive reactions modify it.
              val retroAtk = match decision {
                | RShield => atk.with("targetAc", atk.targetAc + 5)
                | RParry(bonus) => atk.with("targetAc", atk.targetAc + bonus)
                | RCuttingWords(reduction) => atk.with("attackRoll", atk.attackRoll - reduction)
                | _ => atk
              }
              if (retroAtk != atk) {
                val cs1 = spendReaction(bCreatures, reactorId)
                all {
                  bCreatures' = cs1,
                  bPhase' = BPAwaitingReaction({
                    interrupt: PIAttackHit(retroAtk), trigger: TAttackHits,
                    eligible: newElig, offered: newOffered,
                  }),
                  keepBattle,
                }
              } else {
                // RPass (or unhandled)
                all {
                  bCreatures' = bCreatures,
                  bPhase' = BPAwaitingReaction(ctx.with("offered", newOffered)),
                  keepBattle,
                }
              }
            }
          | _ => all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
        }
      | _ => all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
    }
  }

  action bResolveDmgReaction = {
    match bPhase {
      | BPAwaitingReaction(ctx) =>
        match ctx.interrupt {
          | PIAttackDamage(atk) =>
            val remaining = ctx.eligible.exclude(ctx.offered)
            if (remaining.size() == 0) {
              // All damage reactions resolved — deal damage and check after-damage (R10.4)
              val result = dealDamageWithAfterReactions(bCreatures,
                atk.target, atk.attacker, atk.damage, atk.damageType, atk.isCritical, atk.atkReturnTo)
              all { bCreatures' = result.creatures, bPhase' = result.phase, keepBattle }
            } else {
              nondet reactorId = remaining.oneOf()
              nondet reductionAmt = 1.to(20).oneOf()
              nondet decision = Set(RPass, RUncannyDodge, RDamageReduction(reductionAmt)).oneOf()
              val newOffered = ctx.offered.union(Set(reactorId))
              val newElig = ctx.eligible.exclude(Set(reactorId))
              // Damage-reduction reactions: compute new damage, stay in damage phase.
              // RPass leaves damage unchanged; reduction reactions lower it.
              val newDmg = match decision {
                | RUncannyDodge => atk.damage / 2
                | RDamageReduction(amount) => if (atk.damage - amount > 0) atk.damage - amount else 0
                | _ => atk.damage
              }
              if (newDmg != atk.damage) {
                val cs1 = spendReaction(bCreatures, reactorId)
                all {
                  bCreatures' = cs1,
                  bPhase' = BPAwaitingReaction({
                    interrupt: PIAttackDamage(atk.with("damage", newDmg)), trigger: TAttackDamages,
                    eligible: newElig, offered: newOffered,
                  }),
                  keepBattle,
                }
              } else {
                // RPass
                all {
                  bCreatures' = bCreatures,
                  bPhase' = BPAwaitingReaction(ctx.with("offered", newOffered)),
                  keepBattle,
                }
              }
            }
          | _ => all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
        }
      | _ => all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
    }
  }

  // --- After-damage reactions (B8, R10.4) ---
  // Fires after damage is applied. Split into separate actions per reaction type
  // to avoid exploring unused nondets (e.g., Hellish Rebuke nondets on Pass path).

  action bAfterDamagePass = {
    match bPhase {
      | BPAwaitingReaction(ctx) =>
        match ctx.interrupt {
          | PIAfterDamage(ad) =>
            val remaining = ctx.eligible.exclude(ctx.offered)
            if (remaining.size() == 0) {
              all { bCreatures' = bCreatures, bPhase' = returnToPhase(ad.returnTo), keepBattle }
            } else {
              nondet reactorId = remaining.oneOf()
              all {
                bCreatures' = bCreatures,
                bPhase' = BPAwaitingReaction(ctx.with("offered", ctx.offered.union(Set(reactorId)))),
                keepBattle,
              }
            }
          | _ => all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
        }
      | _ => all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
    }
  }

  action bAfterDamageHellishRebuke = {
    nondet rebukeDmg = 2.to(20).oneOf()
    nondet rebukeSaved = Bool.oneOf()
    match bPhase {
      | BPAwaitingReaction(ctx) =>
        match ctx.interrupt {
          | PIAfterDamage(ad) =>
            val remaining = ctx.eligible.exclude(ctx.offered)
            if (remaining.size() == 0) {
              all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
            } else {
              nondet reactorId = remaining.oneOf()
              val cs1 = spendReaction(bCreatures, reactorId)
              val actualDmg = if (rebukeSaved) rebukeDmg / 2 else rebukeDmg
              val result = dealDamageWithAfterReactions(
                cs1, ad.damageSource, reactorId,
                actualDmg, Fire, false, ad.returnTo
              )
              all { bCreatures' = result.creatures, bPhase' = result.phase, keepBattle }
            }
          | _ => all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
        }
      | _ => all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
    }
  }

  action bAfterDamageRetaliation = {
    nondet retAtkRoll = 1.to(20).oneOf()
    nondet retDmg = 1.to(12).oneOf()
    nondet retDt = Set(Slashing, Piercing, Bludgeoning).oneOf()
    nondet retCrit = Bool.oneOf()
    nondet retTgtAc = 10.to(20).oneOf()
    match bPhase {
      | BPAwaitingReaction(ctx) =>
        match ctx.interrupt {
          | PIAfterDamage(ad) =>
            val remaining = ctx.eligible.exclude(ctx.offered)
            if (remaining.size() == 0) {
              all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
            } else {
              nondet reactorId = remaining.oneOf()
              val cs1 = spendReaction(bCreatures, reactorId)
              val newOffered = ctx.offered.union(Set(reactorId))
              val hit = retAtkRoll >= retTgtAc or retAtkRoll == 20
              if (not(hit)) {
                all {
                  bCreatures' = cs1,
                  bPhase' = BPAwaitingReaction(ctx.with("offered", newOffered)),
                  keepBattle,
                }
              } else {
                val result = dealDamageWithAfterReactions(
                  cs1, ad.damageSource, reactorId,
                  retDmg, retDt, retCrit, ad.returnTo
                )
                all { bCreatures' = result.creatures, bPhase' = result.phase, keepBattle }
              }
            }
          | _ => all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
        }
      | _ => all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
    }
  }

  // --- Save spell transaction (B2) ---
  // Caster casts a save-or-suck spell on a target.
  // Flow: cast → Counterspell interrupt → resolve save → save-failed interrupt → apply effects.

  action bCastSaveSpell = {
    val activeId = bInitiative[bTurnIndex]
    val allIds = bCreatures.keys()
    val ac = bCreatures.get(activeId)
    nondet targetId = allIds.exclude(Set(activeId)).oneOf()
    nondet saveDC = 10.to(18).oneOf()
    nondet saveRoll = 1.to(20).oneOf()
    nondet dmgOnFail = 0.to(20).oneOf()
    nondet halfOnSave = Bool.oneOf()
    nondet dt = ALL_DAMAGE_TYPES.oneOf()
    nondet cond = Set(CBlinded, CCharmed, CFrightened, CParalyzed, CStunned).oneOf()
    nondet applyCond = Bool.oneOf()
    nondet slotLvl = 1.to(3).oneOf()
    val tc = bCreatures.get(targetId)
    all {
      bPhase == BPActiveTurn,
      ac.turn.actionsRemaining > 0,
      not(ac.creature.dead),
      not(tc.creature.dead),
      // Must have a slot of the required level
      ac.slots.slotsCurrent.get(slotLvl) > 0,
      // Spend action + slot
      val newTurn = pUseAction(ac.turn, ac.creature, AMagic)
      val newSlots = pExpendSlot(ac.slots, slotLvl)
      val cs1 = setTurn(bCreatures, activeId, newTurn).setSlots(activeId, newSlots)
      val saveCtx: SaveSpellCtx = {
        caster: activeId, target: targetId,
        saveDC: saveDC, saveRoll: saveRoll,
        damageOnFail: dmgOnFail, halfOnSuccess: halfOnSave,
        damageType: dt,
        conditionOnFail: cond, applyCondition: applyCond,
        slotLevel: slotLvl,
      }
      val spellCtx: SpellCastCtx = {
        caster: activeId,
        postCast: PCESave(saveCtx),
      }
      // Check for Counterspell (must have reaction + alive + level 3+ slot)
      val csElig = eligibleForCounterspell(cs1, activeId)
      if (csElig.size() > 0) {
        all {
          bCreatures' = cs1,
          bPhase' = BPAwaitingReaction(mkAwait(PISpellCast(spellCtx), TSpellBeingCast, csElig)),
          keepBattle,
        }
      } else {
        // No Counterspell possible — resolve save immediately
        val result = resolveSave(cs1, saveCtx)
        all { bCreatures' = result.creatures, bPhase' = result.phase, keepBattle }
      }
    }
  }

  /// Resolve a save: check save roll vs DC, apply effects or enter save-failed interrupt.
  pure def resolveSave(
    cs: CreatureId -> Combatant, save: SaveSpellCtx
  ): { creatures: CreatureId -> Combatant, phase: BattlePhase } = {
    val saved = save.saveRoll >= save.saveDC
    if (saved) {
      // Save succeeded — half damage if applicable, no condition
      if (save.halfOnSuccess and save.damageOnFail > 0) {
        val halfDmg = save.damageOnFail / 2
        { creatures: dealDamage(cs, save.target, halfDmg, save.damageType, false),
          phase: BPActiveTurn }
      } else {
        { creatures: cs, phase: BPActiveTurn }
      }
    } else {
      // Save failed — check for Legendary Resistance / Countercharm
      val elig = eligibleTarget(cs, save.target)
      val failCtx = mkSaveFailedCtx(
        save.caster, save.target,
        save.damageOnFail, save.halfOnSuccess, save.damageType,
        save.conditionOnFail, save.applyCondition
      )
      if (elig.size() > 0) {
        { creatures: cs, phase: BPAwaitingReaction(mkAwait(PISaveFailed(failCtx), TSaveFailed, elig)) }
      } else {
        // No reactions — apply fail effects directly
        { creatures: applyFailEffects(cs, failCtx), phase: BPActiveTurn }
      }
    }
  }

  /// Apply the effects of a failed save: damage + condition.
  pure def applyFailEffects(
    cs: CreatureId -> Combatant, ctx: SaveFailedCtx
  ): (CreatureId -> Combatant) = {
    if (ctx.saveSucceeded) {
      // LR flipped the save — apply half damage if applicable
      if (ctx.halfOnSuccess and ctx.damageOnFail > 0) {
        dealDamage(cs, ctx.target, ctx.damageOnFail / 2, ctx.damageType, false)
      } else {
        cs
      }
    } else {
      // Full fail: damage + condition
      val cs1 = if (ctx.damageOnFail > 0)
        dealDamage(cs, ctx.target, ctx.damageOnFail, ctx.damageType, false)
      else cs
      if (ctx.applyCondition) {
        val t = cs1.get(ctx.target)
        val nc = pApplyCondition(t.creature, ctx.conditionOnFail, Set())
        setCreature(cs1, ctx.target, nc)
      } else cs1
    }
  }

  // --- Counterspell chain helpers (B5, R3) ---

  /// Terminal resolution for a spell entry: match its postCast and return
  /// the resulting creatures/phase. Stack is the already-correct remainder.
  /// Does NOT handle PCECounterspell — caller must handle that variant before
  /// invoking this helper (PCECounterspell requires stack unwinding logic).
  pure def resolveSpellEntry(
    cs: CreatureId -> Combatant,
    postCast: PostCastEffect,
    stack: List[SpellStackEntry]
  ): { creatures: CreatureId -> Combatant, phase: BattlePhase, stack: List[SpellStackEntry] } =
    match postCast {
      | PCESave(save) =>
        val result = resolveSave(cs, save)
        { creatures: result.creatures, phase: result.phase, stack: stack }
      | PCEAoE(aoe) => { creatures: cs, phase: BPResolvingAoE(aoe), stack: stack }
      | _ => { creatures: cs, phase: BPActiveTurn, stack: stack }
    }

  /// Return to an interrupted spell's Counterspell window.
  /// Recomputes eligible from current creature state (reactions may have been
  /// spent during recursive Counterspell chains).
  /// If no remaining eligible, resolves the spell directly (no spurious state).
  ///
  /// PCECounterspell entries: when a CS resolves here (no remaining reactors),
  /// we pop the stack to find the interrupted spell and apply the CS outcome.
  /// Quint does not support recursive pure def, so at most one extra pop is done
  /// (handles chains of depth ≤ 3, which covers all possible states with 3 creatures).
  pure def returnToCSWindow(
    cs: CreatureId -> Combatant,
    entry: SpellStackEntry, stack: List[SpellStackEntry]
  ): { creatures: CreatureId -> Combatant, phase: BattlePhase, stack: List[SpellStackEntry] } = {
    val freshElig = eligibleForCounterspell(cs, entry.spellCasterId)
    val remaining = freshElig.exclude(entry.offered)
    if (remaining.size() > 0) {
      val spell: SpellCastCtx = { caster: entry.spellCasterId, postCast: entry.spellPostCast }
      { creatures: cs,
        phase: BPAwaitingReaction({
          interrupt: PISpellCast(spell), trigger: TSpellBeingCast,
          eligible: freshElig, offered: entry.offered,
        }),
        stack: stack,
      }
    } else {
      match entry.spellPostCast {
        | PCECounterspell(csEffect) =>
          // This CS resolved with no reactors. Apply its outcome to the spell below it.
          if (stack.length() == 0) {
            // Defensive: CS on the stack with nothing below it — drop to active turn.
            { creatures: cs, phase: BPActiveTurn, stack: stack }
          } else {
            val popped = popStack(stack)
            if (not(csEffect.conSaveSucceeded)) {
              // CS succeeds → interrupted spell (popped.top) fizzles.
              match popped.top.spellPostCast {
                | PCECounterspell(_) =>
                  // Fizzled spell was itself a CS → skip it, let grandparent continue.
                  if (popped.rest.length() == 0) {
                    { creatures: cs, phase: BPActiveTurn, stack: popped.rest }
                  } else {
                    val gp = popStack(popped.rest)
                    val freshElig2 = eligibleForCounterspell(cs, gp.top.spellCasterId)
                    val remaining2 = freshElig2.exclude(gp.top.offered)
                    if (remaining2.size() > 0) {
                      val spell2: SpellCastCtx = { caster: gp.top.spellCasterId, postCast: gp.top.spellPostCast }
                      { creatures: cs,
                        phase: BPAwaitingReaction({
                          interrupt: PISpellCast(spell2), trigger: TSpellBeingCast,
                          eligible: freshElig2, offered: gp.top.offered,
                        }),
                        stack: gp.rest,
                      }
                    } else {
                      resolveSpellEntry(cs, gp.top.spellPostCast, gp.rest)
                    }
                  }
                | _ =>
                  // Original non-CS spell fizzled → active turn.
                  { creatures: cs, phase: BPActiveTurn, stack: popped.rest }
              }
            } else {
              // CS fails → interrupted spell continues; return to its CS window.
              val freshElig2 = eligibleForCounterspell(cs, popped.top.spellCasterId)
              val remaining2 = freshElig2.exclude(popped.top.offered)
              if (remaining2.size() > 0) {
                val spell2: SpellCastCtx = { caster: popped.top.spellCasterId, postCast: popped.top.spellPostCast }
                { creatures: cs,
                  phase: BPAwaitingReaction({
                    interrupt: PISpellCast(spell2), trigger: TSpellBeingCast,
                    eligible: freshElig2, offered: popped.top.offered,
                  }),
                  stack: popped.rest,
                }
              } else {
                resolveSpellEntry(cs, popped.top.spellPostCast, popped.rest)
              }
            }
          }
        | _ => resolveSpellEntry(cs, entry.spellPostCast, stack)
      }
    }
  }

  /// Resolve spell-cast interrupt (Counterspell window).
  /// B5: Counterspell is itself a spell → pushes to bSpellStack and enters
  /// recursive PISpellCast. Chain unwinds via stack when spells resolve.
  action bResolveCounterspell = {
    val allIds = bCreatures.keys()
    match bPhase {
      | BPAwaitingReaction(ctx) =>
        match ctx.interrupt {
          | PISpellCast(spell) =>
            val remaining = ctx.eligible.exclude(ctx.offered)
            if (remaining.size() == 0) {
              // All offered — spell resolves
              match spell.postCast {
                | PCESave(save) =>
                  val result = resolveSave(bCreatures, save)
                  all { bCreatures' = result.creatures, bPhase' = result.phase, keepBattle }
                | PCEAoE(aoe) =>
                  all { bCreatures' = bCreatures, bPhase' = BPResolvingAoE(aoe), keepBattle }
                | PCECounterspell(csEffect) =>
                  if (bSpellStack.length() == 0) {
                    // Defensive: stack empty shouldn't happen for PCECounterspell
                    all { bCreatures' = bCreatures, bPhase' = BPActiveTurn, keepBattle }
                  } else {
                    val popped = popStack(bSpellStack)
                    if (not(csEffect.conSaveSucceeded)) {
                      // CS succeeds → countered spell (popped.top) fizzles
                      match popped.top.spellPostCast {
                        | PCECounterspell(_) =>
                          // Fizzled spell was a CS → its target spell continues
                          if (popped.rest.length() == 0) {
                            all { bCreatures' = bCreatures, bPhase' = BPActiveTurn, bInitiative' = bInitiative, bTurnIndex' = bTurnIndex, bRound' = bRound, bSpellStack' = popped.rest }
                          } else {
                            val gp = popStack(popped.rest)
                            val result = returnToCSWindow(bCreatures, gp.top, gp.rest)
                            all { bCreatures' = result.creatures, bPhase' = result.phase, bInitiative' = bInitiative, bTurnIndex' = bTurnIndex, bRound' = bRound, bSpellStack' = result.stack }
                          }
                        | _ =>
                          // Original spell fizzled
                          all { bCreatures' = bCreatures, bPhase' = BPActiveTurn, bInitiative' = bInitiative, bTurnIndex' = bTurnIndex, bRound' = bRound, bSpellStack' = popped.rest }
                      }
                    } else {
                      // CS fails → countered spell continues
                      val result = returnToCSWindow(bCreatures, popped.top, popped.rest)
                      all { bCreatures' = result.creatures, bPhase' = result.phase, bInitiative' = bInitiative, bTurnIndex' = bTurnIndex, bRound' = bRound, bSpellStack' = result.stack }
                    }
                  }
                | _ => all { bCreatures' = bCreatures, bPhase' = BPActiveTurn, keepBattle }
              }
            } else {
              nondet reactorId = remaining.oneOf()
              nondet decision = Set(RPass, RCounterspell(true), RCounterspell(false)).oneOf()
              nondet csSlotLvl = 3.to(9).oneOf()
              val newOffered = ctx.offered.union(Set(reactorId))
              match decision {
                | RPass => all {
                    bCreatures' = bCreatures,
                    bPhase' = BPAwaitingReaction(ctx.with("offered", newOffered)),
                    keepBattle,
                  }
                | RCounterspell(conSaveSucceeded) => all {
                    // Guard: reactor must have a slot of level csSlotLvl
                    bCreatures.get(reactorId).slots.slotsCurrent.get(csSlotLvl) > 0,
                    // Spend reaction + slot
                    val cs1 = spendReaction(bCreatures, reactorId)
                    val cs2 = setSlots(cs1, reactorId, pExpendSlot(cs1.get(reactorId).slots, csSlotLvl))
                    // Push current spell context onto stack
                    val stackEntry: SpellStackEntry = {
                      spellCasterId: spell.caster,
                      spellPostCast: spell.postCast,
                      offered: newOffered,
                    }
                    val newStack = bSpellStack.append(stackEntry)
                    // Create Counterspell as a new spell cast
                    val csEffect: CounterspellEffect = {
                      targetCasterId: spell.caster,
                      conSaveSucceeded: conSaveSucceeded,
                    }
                    val csSpell: SpellCastCtx = {
                      caster: reactorId,
                      postCast: PCECounterspell(csEffect),
                    }
                    // Enter CS window for the Counterspell (empty eligible → resolves next step)
                    val csElig = eligibleForCounterspell(cs2, reactorId)
                    all {
                      bCreatures' = cs2,
                      bPhase' = BPAwaitingReaction(mkAwait(PISpellCast(csSpell), TSpellBeingCast, csElig)),
                      bInitiative' = bInitiative, bTurnIndex' = bTurnIndex, bRound' = bRound, bSpellStack' = newStack,
                    }
                  }
                | _ => all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
              }
            }
          | _ => all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
        }
      | _ => all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
    }
  }

  /// Resolve save-failed interrupt (Legendary Resistance).
  action bResolveSaveFailedReaction = {
    match bPhase {
      | BPAwaitingReaction(ctx) =>
        match ctx.interrupt {
          | PISaveFailed(sf) =>
            val remaining = ctx.eligible.exclude(ctx.offered)
            if (remaining.size() == 0) {
              // All offered — apply effects
              all {
                bCreatures' = applyFailEffects(bCreatures, sf),
                bPhase' = BPActiveTurn,
                keepBattle,
              }
            } else {
              nondet reactorId = remaining.oneOf()
              nondet decision = Set(RPass, RLegendaryResistance).oneOf()
              val newOffered = ctx.offered.union(Set(reactorId))
              match decision {
                | RLegendaryResistance => {
                  // LR: auto-succeed the save. Spend reaction.
                  // Full version: spend LR charge (monsterResourceState), not reaction.
                  val cs1 = spendReaction(bCreatures, reactorId)
                  val newSf = sf.with("saveSucceeded", true)
                  // Apply as if saved (may still get half damage)
                  all {
                    bCreatures' = applyFailEffects(cs1, newSf),
                    bPhase' = BPActiveTurn,
                    keepBattle,
                  }
                }
                | _ => all {
                    bCreatures' = bCreatures,
                    bPhase' = BPAwaitingReaction(ctx.with("offered", newOffered)),
                    keepBattle,
                  }
              }
            }
          | PISaveFailedAoE(combo) =>
            val sf = combo.sf
            val aoe = combo.aoe
            val nextPhase = if (aoe.remaining.size() > 0) BPResolvingAoE(aoe) else BPActiveTurn
            val remaining = ctx.eligible.exclude(ctx.offered)
            if (remaining.size() == 0) {
              all {
                bCreatures' = applyFailEffects(bCreatures, sf),
                bPhase' = nextPhase,
                keepBattle,
              }
            } else {
              nondet reactorId = remaining.oneOf()
              nondet decision = Set(RPass, RLegendaryResistance).oneOf()
              val newOffered = ctx.offered.union(Set(reactorId))
              match decision {
                | RLegendaryResistance => {
                  val cs1 = spendReaction(bCreatures, reactorId)
                  val newSf = sf.with("saveSucceeded", true)
                  all {
                    bCreatures' = applyFailEffects(cs1, newSf),
                    bPhase' = nextPhase,
                    keepBattle,
                  }
                }
                | _ => all {
                    bCreatures' = bCreatures,
                    bPhase' = BPAwaitingReaction(ctx.with("offered", newOffered)),
                    keepBattle,
                  }
              }
            }
          | _ => all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
        }
      | _ => all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
    }
  }

  // --- Concentration spell transaction (B4) ---
  // Caster starts concentrating on a spell, target gets an effect linked back to caster.
  // When caster's concentration breaks (damage + failed CON save, or new concentration spell),
  // effects are removed from all targets.

  action bCastConcentrationSpell = {
    val activeId = bInitiative[bTurnIndex]
    val allIds = bCreatures.keys()
    val ac = bCreatures.get(activeId)
    nondet targetId = allIds.exclude(Set(activeId)).oneOf()
    nondet slotLvl = 1.to(3).oneOf()
    nondet duration = 1.to(10).oneOf()
    nondet spellId = Set("hold_person", "bless", "haste", "spirit_guardians").oneOf()
    nondet cond = Set(CParalyzed, CCharmed, CRestrained).oneOf()
    nondet applyCond = Bool.oneOf()
    val tc = bCreatures.get(targetId)
    all {
      bPhase == BPActiveTurn,
      ac.turn.actionsRemaining > 0,
      not(ac.creature.dead),
      not(tc.creature.dead),
      ac.slots.slotsCurrent.get(slotLvl) > 0,
      // Spend action + slot, start concentration
      val newTurn = pUseAction(ac.turn, ac.creature, AMagic)
      val newSlots = pExpendSlot(ac.slots, slotLvl)
      // If already concentrating, break old concentration first (propagate)
      val cs1 = if (ac.slots.concentrationSpellId != "")
        breakConcentrationAndPropagate(bCreatures, activeId)
      else bCreatures
      val concSlots = pStartConcentration(newSlots, spellId)
      val cs2 = setTurn(cs1, activeId, newTurn).setSlots(activeId, concSlots)
      // Add effect to target with casterId pointing back to caster
      val targetC = cs2.get(targetId)
      val newEffects = pAddEffect(targetC.creature.activeEffects, spellId, duration, AtEndOfTurn, activeId)
      val targetWithEffect = targetC.creature.with("activeEffects", newEffects)
      val cs3 = setCreature(cs2, targetId, targetWithEffect)
      // Apply condition to target if applicable
      val cs4 = if (applyCond) {
        val t = cs3.get(targetId)
        setCreature(cs3, targetId, pApplyCondition(t.creature, cond, Set()))
      } else cs3
      all {
        bCreatures' = cs4,
        bPhase' = BPActiveTurn,
        keepBattle,
      }
    }
  }

  // Concentration check: a concentrating creature took damage.
  // CON save result is pre-resolved. On failure, break and propagate.
  action bConcentrationCheck = {
    val allIds = bCreatures.keys()
    nondet targetId = allIds.oneOf()
    nondet conSaveSucceeded = Bool.oneOf()
    val tc = bCreatures.get(targetId)
    all {
      bPhase == BPActiveTurn,
      not(tc.creature.dead),
      tc.slots.concentrationSpellId != "",  // must be concentrating
      if (conSaveSucceeded) {
        // Save passed — concentration holds
        all { bCreatures' = bCreatures, bPhase' = BPActiveTurn, keepBattle }
      } else {
        // Save failed — break concentration and propagate
        all {
          bCreatures' = breakConcentrationAndPropagate(bCreatures, targetId),
          bPhase' = BPActiveTurn,
          keepBattle,
        }
      }
    }
  }

  // --- AoE spell transaction (B3, R32) ---
  // Caster takes one action, multiple targets each save independently.
  // Flow: cast → Counterspell interrupt → resolve targets one by one →
  //       per-target save-failed interrupt (LR) → apply effects → next target.

  action bCastAoE = {
    val activeId = bInitiative[bTurnIndex]
    val allIds = bCreatures.keys()
    val ac = bCreatures.get(activeId)
    // AoE hits all live non-caster creatures. Spatial filtering is external (O2).
    val liveTargets = allIds.exclude(Set(activeId)).filter(id =>
      not(bCreatures.get(id).creature.dead)
    )
    nondet saveDC = 10.to(18).oneOf()
    nondet dmgOnFail = 1.to(20).oneOf()
    nondet halfOnSave = Bool.oneOf()
    nondet dt = ALL_DAMAGE_TYPES.oneOf()
    nondet cond = Set(CBlinded, CCharmed, CFrightened, CParalyzed, CStunned).oneOf()
    nondet applyCond = Bool.oneOf()
    nondet slotLvl = 1.to(3).oneOf()
    all {
      bPhase == BPActiveTurn,
      ac.turn.actionsRemaining > 0,
      not(ac.creature.dead),
      liveTargets.size() >= 2,
      ac.slots.slotsCurrent.get(slotLvl) > 0,
      // Spend action + slot (caster pays once, not per-target)
      val newTurn = pUseAction(ac.turn, ac.creature, AMagic)
      val newSlots = pExpendSlot(ac.slots, slotLvl)
      val cs1 = setTurn(bCreatures, activeId, newTurn).setSlots(activeId, newSlots)
      val aoeCtx: AoESpellCtx = {
        caster: activeId, saveDC: saveDC,
        damageOnFail: dmgOnFail, halfOnSuccess: halfOnSave,
        damageType: dt,
        conditionOnFail: cond, applyCondition: applyCond,
        remaining: liveTargets,
      }
      val spellCtx: SpellCastCtx = {
        caster: activeId,
        postCast: PCEAoE(aoeCtx),
      }
      // Counterspell interrupt — if countered, entire AoE fizzles
      val csElig = eligibleForCounterspell(cs1, activeId)
      if (csElig.size() > 0) {
        all {
          bCreatures' = cs1,
          bPhase' = BPAwaitingReaction(mkAwait(PISpellCast(spellCtx), TSpellBeingCast, csElig)),
          keepBattle,
        }
      } else {
        // No Counterspell — enter AoE resolution directly
        all {
          bCreatures' = cs1,
          bPhase' = BPResolvingAoE(aoeCtx),
          keepBattle,
        }
      }
    }
  }

  /// Resolve one AoE target. Picks a remaining target, rolls save, applies result.
  /// If save fails and target can use LR, enters PISaveFailedAoE interrupt.
  action bResolveAoETarget = {
    match bPhase {
      | BPResolvingAoE(aoe) =>
        if (aoe.remaining.size() == 0) {
          // All targets processed — back to active turn
          all { bCreatures' = bCreatures, bPhase' = BPActiveTurn, keepBattle }
        } else {
          nondet targetId = aoe.remaining.oneOf()
          nondet saveRoll = 1.to(20).oneOf()
          val newRemaining = aoe.remaining.exclude(Set(targetId))
          val updatedAoe = aoe.with("remaining", newRemaining)
          val saved = saveRoll >= aoe.saveDC
          val aoeReturn = ADRResolvingAoE(updatedAoe)
          if (saved) {
            // Save succeeded — half damage if applicable, no condition
            if (aoe.halfOnSuccess and aoe.damageOnFail > 0) {
              val halfDmg = aoe.damageOnFail / 2
              val result = dealDamageWithAfterReactions(bCreatures,
                targetId, aoe.caster, halfDmg, aoe.damageType, false, aoeReturn)
              all { bCreatures' = result.creatures, bPhase' = result.phase, keepBattle }
            } else {
              all { bCreatures' = bCreatures, bPhase' = BPResolvingAoE(updatedAoe), keepBattle }
            }
          } else {
            // Save failed — check for LR
            val sfCtx = mkSaveFailedCtx(
              aoe.caster, targetId,
              aoe.damageOnFail, aoe.halfOnSuccess, aoe.damageType,
              aoe.conditionOnFail, aoe.applyCondition
            )
            val elig = eligibleTarget(bCreatures, targetId)
            if (elig.size() > 0) {
              // Enter save-failed interrupt with AoE continuation
              all {
                bCreatures' = bCreatures,
                bPhase' = BPAwaitingReaction(mkAwait(PISaveFailedAoE({ sf: sfCtx, aoe: updatedAoe }), TSaveFailed, elig)),
                keepBattle,
              }
            } else {
              // No LR — apply fail effects and continue to next target
              all {
                bCreatures' = applyFailEffects(bCreatures, sfCtx),
                bPhase' = BPResolvingAoE(updatedAoe),
                keepBattle,
              }
            }
          }
        }
      | _ => all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
    }
  }

  // --- Movement / Opportunity Attacks (B9, R5, R22) ---
  // Active creature moves, leaving the reach of one or more enemies.
  // Each enemy with an unused reaction can take an OA (one melee attack).
  // OA fires "right before" leaving reach (BEFORE timing).
  // Disengage prevents OA entirely.

  action bMove = {
    val activeId = bInitiative[bTurnIndex]
    val allIds = bCreatures.keys()
    val ac = bCreatures.get(activeId)
    // Caller provides which creatures' reach the mover is leaving (spatial concern per O2)
    nondet threatened = allIds.exclude(Set(activeId)).powerset().oneOf()
    all {
      bPhase == BPActiveTurn,
      not(ac.creature.dead),
      ac.turn.movementRemaining > 0,
      threatened.size() > 0,
      // Spend some movement (simplified: 5ft per move action)
      val newTurn = pUseMovement(ac.turn, 5, 1)
      val cs1 = setTurn(bCreatures, activeId, newTurn)
      // If disengaged, no OA triggers
      if (ac.turn.disengaged) {
        all { bCreatures' = cs1, bPhase' = BPActiveTurn, keepBattle }
      } else {
        // Filter threatened to those with reaction + alive + can see mover
        val oaEligible = threatened.filter(id =>
          hasReaction(cs1, id) and not(cs1.get(id).creature.dead)
        )
        if (oaEligible.size() == 0) {
          all { bCreatures' = cs1, bPhase' = BPActiveTurn, keepBattle }
        } else {
          val mvCtx: MovementCtx = { mover: activeId, threatenedBy: oaEligible, processed: Set() }
          all { bCreatures' = cs1, bPhase' = BPResolvingMovement(mvCtx), keepBattle }
        }
      }
    }
  }

  /// Movement OA: threatened creature passes or all processed → movement completes.
  action bMovementOAPass = {
    match bPhase {
      | BPResolvingMovement(mv) =>
        val remaining = mv.threatenedBy.exclude(mv.processed)
        if (remaining.size() == 0) {
          all { bCreatures' = bCreatures, bPhase' = BPActiveTurn, keepBattle }
        } else {
          nondet reactorId = remaining.oneOf()
          val updatedMv = mv.with("processed", mv.processed.union(Set(reactorId)))
          all { bCreatures' = bCreatures, bPhase' = BPResolvingMovement(updatedMv), keepBattle }
        }
      | _ => all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
    }
  }

  /// Movement OA: threatened creature takes an opportunity attack.
  /// OA is a full attack → enters R20 chain (hit reactions, damage reactions, after-damage).
  action bMovementOAAttack = {
    val allIds = bCreatures.keys()
    nondet oaAtkRoll = 1.to(20).oneOf()
    nondet oaDmg = 1.to(12).oneOf()
    nondet oaDt = Set(Slashing, Piercing, Bludgeoning).oneOf()
    nondet oaCrit = Bool.oneOf()
    nondet oaTgtAc = 10.to(20).oneOf()
    match bPhase {
      | BPResolvingMovement(mv) =>
        val remaining = mv.threatenedBy.exclude(mv.processed)
        if (remaining.size() == 0) {
          all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
        } else {
        nondet reactorId = remaining.oneOf()
        val updatedMv = mv.with("processed", mv.processed.union(Set(reactorId)))
        val cs1 = spendReaction(bCreatures, reactorId)
        val hit = oaAtkRoll >= oaTgtAc or oaAtkRoll == 20
        if (not(hit)) {
          all { bCreatures' = cs1, bPhase' = BPResolvingMovement(updatedMv), keepBattle }
        } else {
          val atkCtx: AttackHitCtx = {
            attacker: reactorId, target: mv.mover,
            attackRoll: oaAtkRoll, targetAc: oaTgtAc,
            damage: oaDmg, damageType: oaDt, isCritical: oaCrit,
            atkReturnTo: ADRResolvingMovement(updatedMv),
          }
          val hitElig = eligibleExcluding(cs1, reactorId)
          if (hitElig.size() > 0) {
            all {
              bCreatures' = cs1,
              bPhase' = BPAwaitingReaction(mkAwait(PIAttackHit(atkCtx), TAttackHits, hitElig)),
              keepBattle,
            }
          } else {
            val result = advanceFromHitPhase(cs1, atkCtx)
            all { bCreatures' = result.creatures, bPhase' = result.phase, keepBattle }
          }
        }
        }
      | _ => all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
    }
  }

  // --- End turn / Heal ---

  action bEndTurn = {
    val allIds = bCreatures.keys()
    val activeId = bInitiative[bTurnIndex]
    all {
      bPhase == BPActiveTurn,
      // Check for monsters with LA remaining (R7: "at the end of another creature's turn")
      val laEligible = allIds.exclude(Set(activeId)).filter(id =>
        val c = bCreatures.get(id)
        c.kind == Monster and
        c.monsterResources.legendaryActionsRemaining > 0 and
        not(c.creature.dead) and
        c.creature.incapacitatedSources.size() == 0
      )
      if (laEligible.size() > 0) {
        val laCtx: LAWindowCtx = { eligibleMonsters: laEligible, endingTurnIndex: bTurnIndex }
        all {
          bCreatures' = bCreatures,
          bPhase' = BPAwaitingLegendaryAction(laCtx),
          keepBattle,
        }
      } else {
        val nt = nextTurn(bTurnIndex, bInitiative.length(), bRound)
        all {
          bCreatures' = bCreatures, bInitiative' = bInitiative,
          bTurnIndex' = nt.idx, bRound' = nt.round,
          bPhase' = BPActiveTurn, bSpellStack' = bSpellStack,
        }
      }
    }
  }

  /// LA window: monster passes — advance to next turn.
  action bLegendaryPass = {
    val nt = nextTurn(bTurnIndex, bInitiative.length(), bRound)
    match bPhase {
      | BPAwaitingLegendaryAction(_) => all {
          bCreatures' = bCreatures, bInitiative' = bInitiative,
          bTurnIndex' = nt.idx, bRound' = nt.round,
          bPhase' = BPActiveTurn, bSpellStack' = bSpellStack,
        }
      | _ => all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
    }
  }

  /// LA window: monster uses a legendary attack action.
  /// Separate action from bLegendaryPass to avoid exploring attack nondets on pass.
  action bLegendaryAttack = {
    val allIds = bCreatures.keys()
    val nt = nextTurn(bTurnIndex, bInitiative.length(), bRound)
    match bPhase {
      | BPAwaitingLegendaryAction(laCtx) =>
        nondet monsterId = laCtx.eligibleMonsters.oneOf()
        nondet laTarget = allIds.exclude(Set(monsterId)).oneOf()
        nondet laAtkRoll = 1.to(20).oneOf()
        nondet laDmg = 1.to(20).oneOf()
        nondet laDt = Set(Slashing, Piercing, Bludgeoning).oneOf()
        nondet laCrit = Bool.oneOf()
        nondet laTgtAc = 10.to(20).oneOf()
        val m = bCreatures.get(monsterId)
        val newMR = m.monsterResources.with("legendaryActionsRemaining",
          m.monsterResources.legendaryActionsRemaining - 1)
        val cs1 = bCreatures.set(monsterId, m.with("monsterResources", newMR))
        val hit = laAtkRoll >= laTgtAc or laAtkRoll == 20
        val finalCs = if (hit) dealDamage(cs1, laTarget, laDmg, laDt, laCrit) else cs1
        all {
          bCreatures' = finalCs, bInitiative' = bInitiative,
          bTurnIndex' = nt.idx, bRound' = nt.round,
          bPhase' = BPActiveTurn, bSpellStack' = bSpellStack,
        }
      | _ => all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
    }
  }

  action bHeal = {
    val activeId = bInitiative[bTurnIndex]
    val allIds = bCreatures.keys()
    val ac = bCreatures.get(activeId)
    nondet targetId = allIds.oneOf()
    nondet amount = 1.to(20).oneOf()
    val tc = bCreatures.get(targetId)
    all {
      bPhase == BPActiveTurn,
      ac.turn.actionsRemaining > 0,
      not(ac.creature.dead),
      not(tc.creature.dead),
      val newTurn = pUseAction(ac.turn, ac.creature, AMagic)
      val healed = pHeal(tc.creature, amount)
      all {
        bCreatures' = setTurn(bCreatures, activeId, newTurn).setCreature(targetId, healed),
        bPhase' = BPActiveTurn,
        keepBattle,
      }
    }
  }

  // ============================================================
  // 5. STEP + INVARIANTS
  // ============================================================

  action battleStep = any {
    bAttack, bResolveHitReaction, bResolveDmgReaction,
    bAfterDamagePass, bAfterDamageHellishRebuke, bAfterDamageRetaliation,
    bCastSaveSpell, bResolveCounterspell, bResolveSaveFailedReaction,
    bCastAoE, bResolveAoETarget,
    bCastConcentrationSpell, bConcentrationCheck,
    bMove, bMovementOAPass, bMovementOAAttack,
    bLegendaryPass, bLegendaryAttack,
    bHeal, bEndTurn, bStartTurn,
  }

  val allHpBounded = bCreatures.keys().forall(id =>
    val c = bCreatures.get(id)
    c.creature.hp >= 0 and c.creature.hp <= c.creature.maxHp
  )

  val allDeadImpliesHp0 = bCreatures.keys().forall(id =>
    val c = bCreatures.get(id)
    c.creature.dead implies c.creature.hp == 0
  )

  val roundPositive = bRound >= 1

  val turnIndexValid = bTurnIndex >= 0 and bTurnIndex < bInitiative.length()

  // Note: offered ⊄ eligible is expected — reactors who spend their reaction
  // are removed from eligible but remain in offered. No useful state invariant
  // on offered/eligible beyond what the loop structure already guarantees.
}
