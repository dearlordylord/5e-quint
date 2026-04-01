// -*- mode: Bluespec; -*-

/// Battle State — Multi-creature combat orchestration.
/// Spike: 2 creatures, attack with Shield reaction interrupt.
/// Composes on top of dnd.qnt pure functions.

module battle {

  // Import everything — we'll prefix our battle actions with 'b' to avoid conflicts
  import dnd.* from "./dnd"

  // ============================================================
  // 1. BATTLE TYPES
  // ============================================================

  type CreatureId = str

  // Per-creature bundle. Simplified for spike — no class states yet.
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

  type PendingInterrupt =
    | PIAttackHit(AttackHitCtx)
    | PIAttackDamage(AttackDamageCtx)
    | PIResolved

  type AwaitCtx = {
    interrupt: PendingInterrupt,
    trigger: TriggerType,
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
    all {
      bCreatures' = Map("A" -> mkCombatant(hp1, PC), "B" -> mkCombatant(hp2, PC)),
      bInitiative' = ["A", "B"],
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
        all { bCreatures' = cs1, bPhase' = BPActiveTurn, keepBattle }
      } else {
        val ctx: AttackHitCtx = {
          attacker: activeId, target: targetId,
          attackRoll: attackRoll, targetAc: tAc,
          damage: dmg, damageType: dt, isCritical: crit,
        }
        if (hasReaction(cs1, targetId)) {
          all {
            bCreatures' = cs1,
            bPhase' = BPAwaitingReaction({ interrupt: PIAttackHit(ctx), trigger: TAttackHits }),
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

  action bResolveHitReaction = {
    match bPhase {
      | BPAwaitingReaction(ctx) =>
        match ctx.interrupt {
          | PIAttackHit(atk) =>
            nondet decision = Set(RPass, RShield).oneOf()
            match decision {
              | RPass => {
                if (hasReaction(bCreatures, atk.target)) {
                  val dmgCtx: AttackDamageCtx = {
                    attacker: atk.attacker, target: atk.target,
                    damage: atk.damage, damageType: atk.damageType,
                    isCritical: atk.isCritical,
                  }
                  all {
                    bCreatures' = bCreatures,
                    bPhase' = BPAwaitingReaction({ interrupt: PIAttackDamage(dmgCtx), trigger: TAttackDamages }),
                    keepBattle,
                  }
                } else {
                  all {
                    bCreatures' = dealDamage(bCreatures, atk.target, atk.damage, atk.damageType, atk.isCritical),
                    bPhase' = BPActiveTurn,
                    keepBattle,
                  }
                }
              }
              | RShield => {
                val newAc = atk.targetAc + 5
                val stillHit = atk.attackRoll >= newAc or atk.attackRoll == 20
                val cs1 = spendReaction(bCreatures, atk.target)
                if (not(stillHit)) {
                  all { bCreatures' = cs1, bPhase' = BPActiveTurn, keepBattle }
                } else {
                  all {
                    bCreatures' = dealDamage(cs1, atk.target, atk.damage, atk.damageType, atk.isCritical),
                    bPhase' = BPActiveTurn,
                    keepBattle,
                  }
                }
              }
              | _ => all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
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
            nondet decision = Set(RPass, RUncannyDodge).oneOf()
            match decision {
              | RUncannyDodge => {
                val cs1 = spendReaction(bCreatures, atk.target)
                all {
                  bCreatures' = dealDamage(cs1, atk.target, atk.damage / 2, atk.damageType, atk.isCritical),
                  bPhase' = BPActiveTurn,
                  keepBattle,
                }
              }
              | _ => {
                all {
                  bCreatures' = dealDamage(bCreatures, atk.target, atk.damage, atk.damageType, atk.isCritical),
                  bPhase' = BPActiveTurn,
                  keepBattle,
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
}
