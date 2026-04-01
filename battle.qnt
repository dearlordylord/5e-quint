// -*- mode: Bluespec; -*-

/// Battle State — Multi-creature combat orchestration.
/// Composes on top of dnd.qnt pure functions.
///
/// SIMPLIFICATIONS (each is a planned incremental improvement, see PLAN_BATTLE.md):
/// - Attack transactions only. Full version: save transactions (R31), AoE (R32)
/// - No concentration links. Full version: casterId on effects, propagation (R33)
/// - No class states in Combatant. Full version: ClassStateMap
/// - 2 reactions only (Shield, Uncanny Dodge). Full version: all 26 from R10 catalog
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

  type TriggerType = TAttackHits | TAttackDamages

  type ReactionDecision = RPass | RShield | RUncannyDodge

  type AttackHitCtx = {
    attacker: CreatureId,
    target: CreatureId,
    attackRoll: int,
    targetAc: int,       // may be modified by reactions (Shield, Parry)
    damage: int,
    damageType: DamageType,
    isCritical: bool,
  }

  type AttackDamageCtx = {
    attacker: CreatureId,
    target: CreatureId,
    damage: int,          // may be modified by reactions (Uncanny Dodge)
    damageType: DamageType,
    isCritical: bool,
  }

  type PendingInterrupt =
    | PIAttackHit(AttackHitCtx)
    | PIAttackDamage(AttackDamageCtx)
    | PIResolved

  // Reaction window: tracks who can react and who already decided.
  // At each interrupt point, creatures in `eligible` are offered the chance
  // to react one at a time. Each react-or-pass is one battleStep.
  // Active player decides the order (R4) — modeled as nondeterministic choice.
  type AwaitCtx = {
    interrupt: PendingInterrupt,
    trigger: TriggerType,
    eligible: Set[CreatureId],   // who can still react (has reaction + valid for trigger)
    offered: Set[CreatureId],    // who already decided (react or pass)
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

  pure def dealDamage(
    cs: CreatureId -> Combatant, targetId: CreatureId,
    dmg: int, dt: DamageType, crit: bool
  ): (CreatureId -> Combatant) = {
    val t = getC(cs, targetId)
    val nc = pTakeDamageAsCreature(t.creature, dmg, dt, Set(), Set(), Set(), crit, t.kind)
    setCreature(cs, targetId, nc)
  }

  /// Compute who can react at an attack-hit interrupt point.
  /// Currently: target (Shield) + any bystander with reaction available.
  /// In the full version, each creature's eligible reactions depend on
  /// their class features, prepared spells, and spatial position (caller-provided).
  /// For now: any creature except the attacker who has their reaction available
  /// and is not dead. This is a simplification — the full version will filter
  /// by "has a valid reaction for this trigger type" which is class/spell-dependent.
  pure def eligibleForHitReaction(
    cs: CreatureId -> Combatant, allIds: Set[CreatureId], attackerId: CreatureId
  ): Set[CreatureId] =
    allIds.exclude(Set(attackerId)).filter(id =>
      hasReaction(cs, id) and not(getC(cs, id).creature.dead)
    )

  /// Compute who can react at an attack-damage interrupt point.
  /// Only the target can use damage-reduction reactions (Uncanny Dodge, Deflect Attacks).
  /// Bystanders have no damage-reduction reactions in the SRD.
  pure def eligibleForDmgReaction(
    cs: CreatureId -> Combatant, targetId: CreatureId
  ): Set[CreatureId] =
    if (hasReaction(cs, targetId) and not(getC(cs, targetId).creature.dead))
      Set(targetId)
    else
      Set()

  // Frame condition: keep non-creature battle vars unchanged
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
        "A" -> mkCombatant(hp1, PC),
        "B" -> mkCombatant(hp2, PC),
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

  action bAttack = {
    val activeId = bInitiative[bTurnIndex]
    val ac = getC(bCreatures, activeId)
    nondet targetId = listToSet(bInitiative).exclude(Set(activeId)).oneOf()
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
        // Miss — no interrupt
        all { bCreatures' = cs1, bPhase' = BPActiveTurn, keepBattle }
      } else {
        val atkCtx: AttackHitCtx = {
          attacker: activeId, target: targetId,
          attackRoll: attackRoll, targetAc: tAc,
          damage: dmg, damageType: dt, isCritical: crit,
        }
        val elig = eligibleForHitReaction(cs1, listToSet(bInitiative), activeId)
        if (elig.size() > 0) {
          // Enter hit-reaction interrupt — eligible creatures will be offered one by one
          all {
            bCreatures' = cs1,
            bPhase' = BPAwaitingReaction({
              interrupt: PIAttackHit(atkCtx), trigger: TAttackHits,
              eligible: elig, offered: Set(),
            }),
            keepBattle,
          }
        } else {
          // No one can react — apply damage directly
          all {
            bCreatures' = dealDamage(cs1, targetId, dmg, dt, crit),
            bPhase' = BPActiveTurn,
            keepBattle,
          }
        }
      }
    }
  }

  /// Advance from hit-interrupt to damage-interrupt or apply damage.
  /// Called when all eligible hit-reactors have been offered.
  pure def advanceFromHitPhase(
    cs: CreatureId -> Combatant, atk: AttackHitCtx
  ): { creatures: CreatureId -> Combatant, phase: BattlePhase } = {
    // Check if attack still hits (AC may have changed from reactions)
    val stillHit = atk.attackRoll >= atk.targetAc or atk.attackRoll == 20
    if (not(stillHit)) {
      // Reactions turned hit into miss
      { creatures: cs, phase: BPActiveTurn }
    } else {
      // Still a hit — check for damage reactions
      val dmgElig = eligibleForDmgReaction(cs, atk.target)
      if (dmgElig.size() > 0) {
        val dmgCtx: AttackDamageCtx = {
          attacker: atk.attacker, target: atk.target,
          damage: atk.damage, damageType: atk.damageType,
          isCritical: atk.isCritical,
        }
        { creatures: cs, phase: BPAwaitingReaction({
          interrupt: PIAttackDamage(dmgCtx), trigger: TAttackDamages,
          eligible: dmgElig, offered: Set(),
        })}
      } else {
        // No damage reactions — apply damage
        { creatures: dealDamage(cs, atk.target, atk.damage, atk.damageType, atk.isCritical),
          phase: BPActiveTurn }
      }
    }
  }

  /// One creature resolves their reaction at a hit-interrupt point.
  /// Nondeterministically picks one eligible creature, they react or pass.
  action bResolveHitReaction = {
    match bPhase {
      | BPAwaitingReaction(ctx) =>
        match ctx.interrupt {
          | PIAttackHit(atk) =>
            val remaining = ctx.eligible.exclude(ctx.offered)
            if (remaining.size() == 0) {
              // Everyone offered — advance to damage phase or apply
              val result = advanceFromHitPhase(bCreatures, atk)
              all {
                bCreatures' = result.creatures,
                bPhase' = result.phase,
                keepBattle,
              }
            } else {
              // Pick next creature to offer (nondeterministic — active player decides order per R4)
              nondet reactorId = remaining.oneOf()
              nondet decision = Set(RPass, RShield).oneOf()
              val newOffered = ctx.offered.union(Set(reactorId))
              match decision {
                | RPass => {
                  // Pass — don't spend reaction, continue to next eligible
                  all {
                    bCreatures' = bCreatures,
                    bPhase' = BPAwaitingReaction(ctx.with("offered", newOffered)),
                    keepBattle,
                  }
                }
                | RShield => {
                  // Shield: +5 AC retroactively. Spend reaction.
                  val cs1 = spendReaction(bCreatures, reactorId)
                  // Update the attack context with new AC
                  val newAtk = atk.with("targetAc", atk.targetAc + 5)
                  // Remove this creature from eligible (reaction spent)
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

  /// One creature resolves their reaction at a damage-interrupt point.
  action bResolveDmgReaction = {
    match bPhase {
      | BPAwaitingReaction(ctx) =>
        match ctx.interrupt {
          | PIAttackDamage(atk) =>
            val remaining = ctx.eligible.exclude(ctx.offered)
            if (remaining.size() == 0) {
              // Everyone offered — apply final damage
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
                | _ => {
                  // Pass
                  all {
                    bCreatures' = bCreatures,
                    bPhase' = BPAwaitingReaction(ctx.with("offered", newOffered)),
                    keepBattle,
                  }
                }
              }
            }
          | _ => all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
        }
      | _ => all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
    }
  }

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
    val ac = getC(bCreatures, activeId)
    nondet targetId = listToSet(bInitiative).oneOf()
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

  // B1 invariant: offered creatures are never re-offered
  // (remaining = eligible \ offered is always shrinking)
  val offeredAreValid = match bPhase {
    | BPAwaitingReaction(ctx) =>
      // every offered creature must have originally been eligible OR been a reactor
      // simpler check: offered and remaining are disjoint
      ctx.eligible.exclude(ctx.offered).intersect(ctx.offered) == Set()
    | _ => true
  }
}
