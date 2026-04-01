// -*- mode: Bluespec; -*-

/// Battle State — Multi-creature combat orchestration.
/// Composes on top of dnd.qnt pure functions.
///
/// SIMPLIFICATIONS (each is a planned incremental improvement, see PLAN_BATTLE.md):
/// - No class states in Combatant. Full version: ClassStateMap
/// - Limited reactions (Shield, Uncanny Dodge, Counterspell). Full version: all 26 from R10
/// These are simplifications of a correct structure, not structural gaps.

module battle {

  import dnd.* from "./dnd"

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
  }

  type TriggerType =
    | TAttackHits       // "when hit by attack roll" — Shield, Parry
    | TAttackDamages    // "when you take damage from attack" — Uncanny Dodge
    | TSpellBeingCast   // "see creature casting a spell" — Counterspell
    | TSaveFailed       // "fails a saving throw" — Legendary Resistance, Countercharm

  type ReactionDecision =
    | RPass
    | RShield
    | RUncannyDodge
    | RCounterspell(bool)   // bool = target CON save succeeded (5.2.1 Counterspell)
    | RLegendaryResistance  // auto-succeed the save

  type AttackHitCtx = {
    attacker: CreatureId,
    target: CreatureId,
    attackRoll: int,
    targetAc: int,
    damage: int,
    damageType: DamageType,
    isCritical: bool,
  }

  type AttackDamageCtx = {
    attacker: CreatureId,
    target: CreatureId,
    damage: int,
    damageType: DamageType,
    isCritical: bool,
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
    | PCESave(SaveSpellCtx)       // save-or-suck spell
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

  type PendingInterrupt =
    | PIAttackHit(AttackHitCtx)
    | PIAttackDamage(AttackDamageCtx)
    | PISpellCast(SpellCastCtx)
    | PISaveFailed(SaveFailedCtx)

  type AwaitCtx = {
    interrupt: PendingInterrupt,
    trigger: TriggerType,
    eligible: Set[CreatureId],
    offered: Set[CreatureId],
  }

  type BattlePhase =
    | BPActiveTurn
    | BPAwaitingReaction(AwaitCtx)

  // ============================================================
  // 2. STATE VARIABLES
  // ============================================================

  var bCreatures: CreatureId -> Combatant
  var bInitiative: List[CreatureId]
  var bTurnIndex: int
  var bRound: int
  var bPhase: BattlePhase

  // ============================================================
  // 3. HELPERS
  // ============================================================

  pure def listToSet(l: List[CreatureId]): Set[CreatureId] =
    l.foldl(Set(), (acc, x) => acc.union(Set(x)))

  pure def getC(cs: CreatureId -> Combatant, id: CreatureId): Combatant =
    cs.get(id)

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

  pure def mkCombatant(maxHp: int, k: CreatureKind): Combatant = {
    creature: freshCreature(maxHp),
    turn: FRESH_TURN,
    slots: FRESH_SPELL_SLOTS,
    kind: k,
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
  }

  pure def dealDamage(
    cs: CreatureId -> Combatant, targetId: CreatureId,
    dmg: int, dt: DamageType, crit: bool
  ): (CreatureId -> Combatant) = {
    val t = getC(cs, targetId)
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
    cs: CreatureId -> Combatant, allIds: Set[CreatureId], casterId: CreatureId
  ): (CreatureId -> Combatant) = {
    val caster = getC(cs, casterId)
    val spellId = caster.slots.concentrationSpellId
    if (spellId == "") cs  // not concentrating
    else {
      // Break caster's concentration
      val newSlots = pBreakConcentration(caster.slots)
      val newEffects = pRemoveEffect(caster.creature.activeEffects, spellId)
      val cs1 = cs.set(casterId, caster
        .with("slots", newSlots)
        .with("creature", caster.creature.with("activeEffects", newEffects)))
      // Remove effects from all other creatures that were cast by this caster
      allIds.exclude(Set(casterId)).fold(cs1, (acc, id) =>
        val c = getC(acc, id)
        val cleaned = removeEffectsByCaster(c.creature, casterId)
        if (cleaned == c.creature) acc else setCreature(acc, id, cleaned)
      )
    }
  }

  /// Deal damage to target. If target is concentrating, check CON save.
  /// On failed save, break concentration and propagate to all creatures.
  pure def dealDamageWithConc(
    cs: CreatureId -> Combatant, allIds: Set[CreatureId],
    targetId: CreatureId, dmg: int, dt: DamageType, crit: bool,
    conSaveSucceeded: bool
  ): (CreatureId -> Combatant) = {
    val cs1 = dealDamage(cs, targetId, dmg, dt, crit)
    val target = getC(cs1, targetId)
    if (target.slots.concentrationSpellId != "" and not(conSaveSucceeded)) {
      breakConcentrationAndPropagate(cs1, allIds, targetId)
    } else cs1
  }

  /// Eligible reactors: everyone except excludeId who has reaction + alive.
  /// Used for hit-reactions (exclude attacker) and Counterspell (exclude caster).
  pure def eligibleExcluding(
    cs: CreatureId -> Combatant, allIds: Set[CreatureId], excludeId: CreatureId
  ): Set[CreatureId] =
    allIds.exclude(Set(excludeId)).filter(id =>
      hasReaction(cs, id) and not(getC(cs, id).creature.dead)
    )

  /// Eligible single-target reactor: target alone if it has reaction + alive.
  /// Used for damage-reactions (Uncanny Dodge) and save-failed (Legendary Resistance).
  pure def eligibleTarget(
    cs: CreatureId -> Combatant, targetId: CreatureId
  ): Set[CreatureId] =
    if (hasReaction(cs, targetId) and not(getC(cs, targetId).creature.dead))
      Set(targetId)
    else
      Set()

  /// Build an AwaitCtx with empty offered set.
  pure def mkAwait(pi: PendingInterrupt, tt: TriggerType, elig: Set[CreatureId]): AwaitCtx =
    { interrupt: pi, trigger: tt, eligible: elig, offered: Set() }

  action keepBattle = all {
    bInitiative' = bInitiative,
    bTurnIndex' = bTurnIndex,
    bRound' = bRound,
  }

  // ============================================================
  // 4. BATTLE ACTIONS
  // ============================================================

  action bInit = {
    nondet hp1 = 10.to(30).oneOf()
    nondet hp2 = 10.to(30).oneOf()
    nondet hp3 = 10.to(30).oneOf()
    all {
      bCreatures' = Map(
        "A" -> mkCaster(hp1, PC),
        "B" -> mkCaster(hp2, PC),
        "C" -> mkCombatant(hp3, PC)
      ),
      bInitiative' = ["A", "B", "C"],
      bTurnIndex' = 0,
      bRound' = 1,
      bPhase' = BPActiveTurn,
    }
  }

  action bStartTurn = {
    val activeId = bInitiative[bTurnIndex]
    all {
      bPhase == BPActiveTurn,
      bCreatures' = setTurn(bCreatures, activeId, FRESH_TURN),
      bPhase' = BPActiveTurn,
      keepBattle,
    }
  }

  // --- Attack transaction (B0/B1) ---

  action bAttack = {
    val activeId = bInitiative[bTurnIndex]
    val allIds = listToSet(bInitiative)
    val ac = getC(bCreatures, activeId)
    nondet targetId = allIds.exclude(Set(activeId)).oneOf()
    nondet attackRoll = 1.to(20).oneOf()
    nondet dmg = 1.to(12).oneOf()
    nondet dt = Set(Slashing, Piercing, Bludgeoning).oneOf()
    nondet crit = Bool.oneOf()
    nondet tAc = 10.to(20).oneOf()
    val tc = getC(bCreatures, targetId)
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
        }
        val elig = eligibleExcluding(cs1, allIds, activeId)
        if (elig.size() > 0) {
          all {
            bCreatures' = cs1,
            bPhase' = BPAwaitingReaction(mkAwait(PIAttackHit(atkCtx), TAttackHits, elig)),
            keepBattle,
          }
        } else {
          all {
            bCreatures' = dealDamage(cs1, targetId, dmg, dt, crit),
            bPhase' = BPActiveTurn,
            keepBattle,
          }
        }
      }
    }
  }

  pure def advanceFromHitPhase(
    cs: CreatureId -> Combatant, atk: AttackHitCtx
  ): { creatures: CreatureId -> Combatant, phase: BattlePhase } = {
    val stillHit = atk.attackRoll >= atk.targetAc or atk.attackRoll == 20
    if (not(stillHit)) {
      { creatures: cs, phase: BPActiveTurn }
    } else {
      val dmgElig = eligibleTarget(cs, atk.target)
      if (dmgElig.size() > 0) {
        val dmgCtx: AttackDamageCtx = {
          attacker: atk.attacker, target: atk.target,
          damage: atk.damage, damageType: atk.damageType,
          isCritical: atk.isCritical,
        }
        { creatures: cs, phase: BPAwaitingReaction(mkAwait(PIAttackDamage(dmgCtx), TAttackDamages, dmgElig)) }
      } else {
        { creatures: dealDamage(cs, atk.target, atk.damage, atk.damageType, atk.isCritical),
          phase: BPActiveTurn }
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
              nondet decision = Set(RPass, RShield).oneOf()
              val newOffered = ctx.offered.union(Set(reactorId))
              match decision {
                | RPass => all {
                    bCreatures' = bCreatures,
                    bPhase' = BPAwaitingReaction(ctx.with("offered", newOffered)),
                    keepBattle,
                  }
                | RShield => {
                  val cs1 = spendReaction(bCreatures, reactorId)
                  val newAtk = atk.with("targetAc", atk.targetAc + 5)
                  val newElig = ctx.eligible.exclude(Set(reactorId))
                  all {
                    bCreatures' = cs1,
                    bPhase' = BPAwaitingReaction({
                      interrupt: PIAttackHit(newAtk), trigger: TAttackHits,
                      eligible: newElig, offered: newOffered,
                    }),
                    keepBattle,
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

  action bResolveDmgReaction = {
    match bPhase {
      | BPAwaitingReaction(ctx) =>
        match ctx.interrupt {
          | PIAttackDamage(atk) =>
            val remaining = ctx.eligible.exclude(ctx.offered)
            if (remaining.size() == 0) {
              all {
                bCreatures' = dealDamage(bCreatures, atk.target, atk.damage, atk.damageType, atk.isCritical),
                bPhase' = BPActiveTurn,
                keepBattle,
              }
            } else {
              nondet reactorId = remaining.oneOf()
              nondet decision = Set(RPass, RUncannyDodge).oneOf()
              val newOffered = ctx.offered.union(Set(reactorId))
              match decision {
                | RUncannyDodge => {
                  val cs1 = spendReaction(bCreatures, reactorId)
                  val newAtk = atk.with("damage", atk.damage / 2)
                  val newElig = ctx.eligible.exclude(Set(reactorId))
                  all {
                    bCreatures' = cs1,
                    bPhase' = BPAwaitingReaction({
                      interrupt: PIAttackDamage(newAtk), trigger: TAttackDamages,
                      eligible: newElig, offered: newOffered,
                    }),
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

  // --- Save spell transaction (B2) ---
  // Caster casts a save-or-suck spell on a target.
  // Flow: cast → Counterspell interrupt → resolve save → save-failed interrupt → apply effects.

  action bCastSaveSpell = {
    val activeId = bInitiative[bTurnIndex]
    val allIds = listToSet(bInitiative)
    val ac = getC(bCreatures, activeId)
    nondet targetId = allIds.exclude(Set(activeId)).oneOf()
    nondet saveDC = 10.to(18).oneOf()
    nondet saveRoll = 1.to(20).oneOf()
    nondet dmgOnFail = 0.to(20).oneOf()
    nondet halfOnSave = Bool.oneOf()
    nondet dt = ALL_DAMAGE_TYPES.oneOf()
    nondet cond = Set(CBlinded, CCharmed, CFrightened, CParalyzed, CStunned).oneOf()
    nondet applyCond = Bool.oneOf()
    nondet slotLvl = 1.to(3).oneOf()
    val tc = getC(bCreatures, targetId)
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
      // Check for Counterspell
      val csElig = eligibleExcluding(cs1, allIds, activeId)
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
      val failCtx: SaveFailedCtx = {
        caster: save.caster, target: save.target,
        damageOnFail: save.damageOnFail, halfOnSuccess: save.halfOnSuccess,
        damageType: save.damageType,
        conditionOnFail: save.conditionOnFail, applyCondition: save.applyCondition,
        saveSucceeded: false,
      }
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
        val t = getC(cs1, ctx.target)
        val nc = pApplyCondition(t.creature, ctx.conditionOnFail, Set())
        setCreature(cs1, ctx.target, nc)
      } else cs1
    }
  }

  /// Resolve Counterspell interrupt.
  action bResolveCounterspell = {
    match bPhase {
      | BPAwaitingReaction(ctx) =>
        match ctx.interrupt {
          | PISpellCast(spell) =>
            val remaining = ctx.eligible.exclude(ctx.offered)
            if (remaining.size() == 0) {
              // No one countered — spell resolves
              match spell.postCast {
                | PCESave(save) =>
                  val result = resolveSave(bCreatures, save)
                  all { bCreatures' = result.creatures, bPhase' = result.phase, keepBattle }
                | _ => all { bCreatures' = bCreatures, bPhase' = BPActiveTurn, keepBattle }
              }
            } else {
              nondet reactorId = remaining.oneOf()
              nondet decision = Set(RPass, RCounterspell(true), RCounterspell(false)).oneOf()
              val newOffered = ctx.offered.union(Set(reactorId))
              match decision {
                | RPass => all {
                    bCreatures' = bCreatures,
                    bPhase' = BPAwaitingReaction(ctx.with("offered", newOffered)),
                    keepBattle,
                  }
                | RCounterspell(conSaveSucceeded) => {
                  val cs1 = spendReaction(bCreatures, reactorId)
                  if (not(conSaveSucceeded)) {
                    // Counterspell succeeds — spell fizzles, back to active turn
                    // Note: in full version, the Counterspell itself could be Counterspelled
                    // (recursive PISpellCast). Deferred to B5.
                    all { bCreatures' = cs1, bPhase' = BPActiveTurn, keepBattle }
                  } else {
                    // Caster made CON save — Counterspell fails, continue offering
                    val newElig = ctx.eligible.exclude(Set(reactorId))
                    all {
                      bCreatures' = cs1,
                      bPhase' = BPAwaitingReaction({
                        interrupt: ctx.interrupt, trigger: ctx.trigger,
                        eligible: newElig, offered: newOffered,
                      }),
                      keepBattle,
                    }
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
    val allIds = listToSet(bInitiative)
    val ac = getC(bCreatures, activeId)
    nondet targetId = allIds.exclude(Set(activeId)).oneOf()
    nondet slotLvl = 1.to(3).oneOf()
    nondet duration = 1.to(10).oneOf()
    nondet spellId = Set("hold_person", "bless", "haste", "spirit_guardians").oneOf()
    nondet cond = Set(CParalyzed, CCharmed, CRestrained).oneOf()
    nondet applyCond = Bool.oneOf()
    val tc = getC(bCreatures, targetId)
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
        breakConcentrationAndPropagate(bCreatures, allIds, activeId)
      else bCreatures
      // Start new concentration on caster
      val casterAfterBreak = getC(cs1, activeId)
      val concSlots = pStartConcentration(newSlots, spellId)
      val cs2 = setTurn(cs1, activeId, newTurn).setSlots(activeId, concSlots)
      // Add effect to target with casterId pointing back to caster
      val targetC = getC(cs2, targetId)
      val newEffects = pAddEffect(targetC.creature.activeEffects, spellId, duration, AtEndOfTurn, activeId)
      val targetWithEffect = targetC.creature.with("activeEffects", newEffects)
      val cs3 = setCreature(cs2, targetId, targetWithEffect)
      // Apply condition to target if applicable
      val cs4 = if (applyCond) {
        val t = getC(cs3, targetId)
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
    val allIds = listToSet(bInitiative)
    nondet targetId = allIds.oneOf()
    nondet conSaveSucceeded = Bool.oneOf()
    val tc = getC(bCreatures, targetId)
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
          bCreatures' = breakConcentrationAndPropagate(bCreatures, allIds, targetId),
          bPhase' = BPActiveTurn,
          keepBattle,
        }
      }
    }
  }

  // --- End turn / Heal ---

  action bEndTurn = {
    val nextIdx = if (bTurnIndex + 1 < bInitiative.length()) bTurnIndex + 1 else 0
    val nextRound = if (nextIdx == 0) bRound + 1 else bRound
    all {
      bPhase == BPActiveTurn,
      bCreatures' = bCreatures,
      bInitiative' = bInitiative,
      bTurnIndex' = nextIdx,
      bRound' = nextRound,
      bPhase' = BPActiveTurn,
    }
  }

  action bHeal = {
    val activeId = bInitiative[bTurnIndex]
    val allIds = listToSet(bInitiative)
    val ac = getC(bCreatures, activeId)
    nondet targetId = allIds.oneOf()
    nondet amount = 1.to(20).oneOf()
    val tc = getC(bCreatures, targetId)
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
    bCastSaveSpell, bResolveCounterspell, bResolveSaveFailedReaction,
    bCastConcentrationSpell, bConcentrationCheck,
    bHeal, bEndTurn, bStartTurn,
  }

  val allHpBounded = listToSet(bInitiative).forall(id =>
    val c = getC(bCreatures, id)
    c.creature.hp >= 0 and c.creature.hp <= c.creature.maxHp
  )

  val allDeadImpliesHp0 = listToSet(bInitiative).forall(id =>
    val c = getC(bCreatures, id)
    c.creature.dead implies c.creature.hp == 0
  )

  val roundPositive = bRound >= 1

  val turnIndexValid = bTurnIndex >= 0 and bTurnIndex < bInitiative.length()

  val offeredAreValid = match bPhase {
    | BPAwaitingReaction(ctx) =>
      ctx.eligible.exclude(ctx.offered).intersect(ctx.offered) == Set()
    | _ => true
  }
}
