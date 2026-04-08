// -*- mode: Bluespec; -*-

/// Battle State — Multi-creature combat orchestration.
/// Composes on top of creature.qnt pure functions.
///
/// SIMPLIFICATIONS (each is a planned incremental improvement, see PLAN_BATTLE.md):
/// - Limited reactions (retroactive AC/roll mods, damage reduction, Counterspell, LR). Full version: all 26 from R10
/// These are simplifications of a correct structure, not structural gaps.

module battle {

  import creature.* from "./creature"

  // ============================================================
  // 1. BATTLE TYPES
  // ============================================================

  /// Convert a list to a set.
  pure def listToSet(lst: List[a]): Set[a] =
    lst.foldl(Set(), (s, e) => s.union(Set(e)))

  type CreatureId = str

  // Per-creature bundle.
  type Combatant = {
    creature: CreatureState,
    turn: TurnState,
    slots: SpellSlotState,
    kind: CreatureKind,
    monsterResources: MonsterResourceState,  // legendary actions/resistances (B10)
    statBlock: StatBlock,                    // stat block for reading LA uses, recharge, etc. (B12)
    rogueLevel: int,                         // 0 = not a rogue (B11)
    monkLevel: int,                          // 0 = not a monk (B11)
    preparedSpells: Set[str],                // spells this creature has prepared (SRD 5.2.1 Gaining Spells)
    hasEvasion: bool,                        // Evasion feature (Rogue 7, Monk 7): DEX save success = 0 dmg, fail = half
    saveMiscBonus: int,                      // misc save bonus (Paladin Aura, Ring of Protection, etc.)
    critRange: int,                          // natural roll >= critRange is a critical hit (default 20, Champion 19/18)
    fighterLevel: int,                       // 0 = not a fighter
    fighterState: FighterState,              // fighter class state (non-fighters carry freshFighterState(0))
    barbarianLevel: int,                     // 0 = not a barbarian
    meleeDamageBonus: int,                   // rage damage bonus (0 if not raging)
    recklessThisTurn: bool,                  // Reckless Attack declared this turn
    ragingBlocksSpells: bool,                // rage blocks spell casting
    combatantResistances: Set[DamageType],   // runtime resistances (rage B/P/S, Bear Totem all, etc.)
    sneakAttackDice: int,                    // Sneak Attack d6 count (0 = not a rogue; ceil(rogueLevel/2))
    sneakAttackUsedThisTurn: bool,           // SA once per turn (SRD 5.2.1 Rogue "Sneak Attack")
    readiedSpellParams: ReadiedSpellParams,  // readied spell params (SRD 5.2.1 Ready action); slotLvl==0 = no spell
    grappledBy: CreatureId,                  // "" = not grappled by another combatant
    grapplingTarget: CreatureId,             // "" = not currently grappling a target
    grappledTargetTwoSizesSmaller: bool,     // drag-speed exemption for the current grapple target
    baseWalkSpeed: int,                      // Walk speed (PC: 30, Monster: statBlock.speeds.get(Walk))
  }

  /// Parameters for a readied spell held with Concentration (SRD 5.2.1 Ready action).
  /// slotLvl == 0 is the sentinel for "no readied spell".
  type ReadiedSpellParams = {
    caster: CreatureId,
    target: CreatureId,
    saveDC: int,
    damageOnFail: int,
    halfOnSuccess: bool,
    damageType: DamageType,
    conditionOnFail: Condition,
    applyCondition: bool,
    saveAbility: Ability,
    spellName: str,
    slotLvl: int,
  }

  val NO_READIED_SPELL: ReadiedSpellParams = {
    caster: "", target: "", saveDC: 0, damageOnFail: 0,
    halfOnSuccess: false, damageType: Slashing,
    conditionOnFail: CBlinded, applyCondition: false,
    saveAbility: Dex, spellName: "", slotLvl: 0,
  }

  /// Check if a combatant has a readied spell.
  pure def hasReadiedSpell(c: Combatant): bool = c.readiedSpellParams.slotLvl > 0

  pure def isBattleGrappling(c: Combatant): bool = c.grapplingTarget != ""

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
    | RDeflectAttacks(int)  // flat damage reduction (Deflect Attacks, Storm Giant Deflect, R10.3)

  pure val DMG_REACTION_UNCANNY_DODGE = "RUncannyDodge"
  pure val DMG_REACTION_DEFLECT_ATTACKS = "RDeflectAttacks"

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
    critRange: int,                  // natural roll >= critRange is a critical hit
    atkReturnTo: AfterDamageReturn,  // where to go after entire attack chain resolves
    knockOut: bool,                  // SRD 5.2.1 "Knocking Out a Creature" — attacker's choice
    hitRider: AttackHitRider,
    targetCanSeeAttackerAtHit: bool,
    isWeaponAttack: bool,
  }

  type AttackDamageCtx = {
    attacker: CreatureId,
    target: CreatureId,
    damage: int,
    damageType: DamageType,
    isCritical: bool,
    atkReturnTo: AfterDamageReturn,
    knockOut: bool,                  // propagated from AttackHitCtx
    targetCanSeeAttackerAtHit: bool,
    isWeaponAttack: bool,
    legalReactions: Set[str],
  }

  type AttackHitRider =
    | NoAttackHitRider
    | AHRShockingGrasp
    | AHRRayOfFrost

  pure val SHOCKING_GRASP_SPELL_ID = "shocking_grasp"
  pure val RAY_OF_FROST_SPELL_ID = "ray_of_frost"

  // Context for a spell being cast (Counterspell interrupt)
  type SpellCastCtx = {
    caster: CreatureId,
    spellName: str,  // identity of the spell being cast (for test clarity / debuggability)
    // The rest of the spell resolution lives in the post-cast context.
    // This just tracks who is casting, so Counterspell knows the target.
    // postCast describes what happens if the spell is NOT countered.
    postCast: PostCastEffect,
    slotLvl: int,  // slot level to refund if countered (0 = ritual/no slot; SRD 5.2.1 Counterspell: "the slot isn't expended")
    ritual: bool,  // SRD 5.2.1: ritual casting skips slot expenditure, requires spell prepared
  }

  // What happens after a spell resolves (not countered).
  // Each variant is a different spell shape.
  type PostCastEffect =
    | PCESave(SaveSpellCtx)       // save-or-suck spell (single target)
    | PCEAoE(AoESpellCtx)        // AoE spell (multiple targets, R32)
    | PCECounterspell(CounterspellEffect)  // Counterspell (R3, R10.2, R21)
    | PCEConcentration(ConcentrationCtx)   // concentration spell (deferred until CS resolves)
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
    saveAbility: Ability,       // which ability the save targets (Dex, Con, etc.)
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
    saveAbility: Ability,       // which ability the save targets (Dex for Fireball, etc.)
  }

  // Context for a concentration spell (deferred until CS resolves).
  type ConcentrationCtx = {
    caster: CreatureId,
    target: CreatureId,
    spellId: str,
    duration: int,
    conditionOnFail: Condition,
    applyCondition: bool,
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
    slotLvl: int,                  // deferred slot level for expenditure on resolve
    spellName: str,                // spell identity preserved through CS chain
    ritual: bool,                  // ritual flag preserved through CS chain
  }

  // Where to return after resolving an after-damage reaction.
  // Separate from BattlePhase to avoid a type cycle (AfterDamageCtx → BattlePhase → PendingInterrupt → AfterDamageCtx).
  type AfterDamageReturn =
    | ADRActiveTurn
    | ADRResolvingAoE(AoESpellCtx)
    | ADRResolvingMovement(MovementCtx)
    | ADRAwaitingLegendaryAction(LAWindowCtx)
    | ADRAwaitingReadiedAction(ReadyWindowCtx)

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

  // Context for readied action window between turns.
  type ReadyWindowCtx = {
    eligibleCreatures: Set[CreatureId],  // creatures with readiedAction + reactionAvailable
    endingTurnIndex: int,
  }

  type BattlePhase =
    | BPActiveTurn
    | BPAwaitingReaction(AwaitCtx)
    | BPResolvingAoE(AoESpellCtx)       // processing AoE targets one by one (R32)
    // Note: AoE with zero remaining targets is valid per RAW ("Each creature in the area"
    // applies to an empty set — the spell still occurs, it just affects no creatures).
    | BPResolvingMovement(MovementCtx)   // processing OAs one by one (R5, R22)
    | BPAwaitingLegendaryAction(LAWindowCtx)  // LA window at end of turn (R7)
    | BPAwaitingReadiedAction(ReadyWindowCtx)  // readied action window after LA (R-ready)

  // ============================================================
  // 2. STATE VARIABLES
  // ============================================================

  var bCreatures: CreatureId -> Combatant
  var bInitiative: List[CreatureId]
  var bTurnIndex: int
  var bRound: int
  var bPhase: BattlePhase
  var bSpellStack: List[SpellStackEntry]  // Counterspell chain stack (B5)
  var bTurnStarted: bool                  // guard against double-firing bStartTurn

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

  /// Expend a spell slot and mark "slot expended this turn" (SRD 5.2.1).
  pure def expendSlot(
    cs: CreatureId -> Combatant, id: CreatureId, level: int
  ): (CreatureId -> Combatant) = {
    val cs1 = setSlots(cs, id, pExpendSlot(cs.get(id).slots, level))
    val cb = cs1.get(id)
    cs1.set(id, cb.with("turn", cb.turn.with("slotExpendedThisTurn", true)))
  }

  /// Refund a spell slot without clearing slotExpendedThisTurn.
  /// SRD 5.2.1 Counterspell: "If that spell was cast with a spell slot, the slot isn't expended."
  /// But "One Spell with a Spell Slot per Turn" still applies — the caster used their
  /// one-slot-per-turn quota even though the slot is returned. slotExpendedThisTurn stays true.
  pure def refundSlot(
    cs: CreatureId -> Combatant, id: CreatureId, level: int
  ): (CreatureId -> Combatant) = {
    setSlots(cs, id, pRestoreSlot(cs.get(id).slots, level))
  }

  /// Conditionally refund a fizzled spell's slot from a stack entry.
  /// No-op for rituals (no slot to refund) or slotLvl 0.
  pure def maybeRefundEntry(
    cs: CreatureId -> Combatant, entry: SpellStackEntry
  ): (CreatureId -> Combatant) = {
    if (not(entry.ritual) and entry.slotLvl > 0) refundSlot(cs, entry.spellCasterId, entry.slotLvl)
    else cs
  }

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

  // Stat block sentinel for PCs (all fields zero/empty — never read in PC mode).
  // Imported from creature.qnt as NULL_STAT_BLOCK.

  // Default prepared spell list for test casters. Covers all spell shapes used
  // by bCastSaveSpell, bCastAoE, bCastConcentrationSpell, and Counterspell.
  val CASTER_PREPARED_SPELLS: Set[str] = Set(
    "hold_person", "bless", "haste", "spirit_guardians",  // concentration spells
    "fireball", "burning_hands",                           // AoE / save spells
    "guiding_bolt", "inflict_wounds",                      // single-target save spells
    "counterspell"                                         // reaction spell (CS chain)
  )

  pure def mkCombatant(maxHp: int, k: CreatureKind): Combatant = {
    creature: freshCreature(maxHp),
    turn: FRESH_TURN,
    slots: FRESH_SPELL_SLOTS,
    kind: k,
    monsterResources: EMPTY_MONSTER_RESOURCES,
    statBlock: NULL_STAT_BLOCK,
    rogueLevel: 0, monkLevel: 0,
    preparedSpells: Set(),
    hasEvasion: false,
    saveMiscBonus: 0,
    critRange: 20,
    fighterLevel: 0,
    fighterState: freshFighterState(0),
    barbarianLevel: 0,
    meleeDamageBonus: 0,
    recklessThisTurn: false,
    ragingBlocksSpells: false,
    combatantResistances: Set(),
    sneakAttackDice: 0,
    sneakAttackUsedThisTurn: false,
    readiedSpellParams: NO_READIED_SPELL,
    grappledBy: "",
    grapplingTarget: "",
    grappledTargetTwoSizesSmaller: false,
    baseWalkSpeed: 30,
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
    statBlock: NULL_STAT_BLOCK,
    rogueLevel: 0, monkLevel: 0,
    preparedSpells: CASTER_PREPARED_SPELLS,
    hasEvasion: false,
    saveMiscBonus: 0,
    critRange: 20,
    fighterLevel: 0,
    fighterState: freshFighterState(0),
    barbarianLevel: 0,
    meleeDamageBonus: 0,
    recklessThisTurn: false,
    ragingBlocksSpells: false,
    combatantResistances: Set(),
    sneakAttackDice: 0,
    sneakAttackUsedThisTurn: false,
    readiedSpellParams: NO_READIED_SPELL,
    grappledBy: "",
    grapplingTarget: "",
    grappledTargetTwoSizesSmaller: false,
    baseWalkSpeed: 30,
  }

  // Monster with legendary actions and resistances
  pure def mkMonster(maxHp: int, sb: StatBlock): Combatant = {
    val walkSpeed = sb.speeds.get(Walk)
    {
      creature: freshCreature(maxHp),
      turn: FRESH_TURN
        .with("movementRemaining", walkSpeed)
        .with("effectiveSpeed", walkSpeed),
      slots: FRESH_SPELL_SLOTS,
      kind: Monster,
      monsterResources: EMPTY_MONSTER_RESOURCES
        .with("legendaryActionsRemaining", sb.legendaryActionUses)
        .with("legendaryResistancesRemaining", sb.legendaryResistanceUses),
      statBlock: sb,
      rogueLevel: 0, monkLevel: 0,
      preparedSpells: Set(),
      hasEvasion: false,
      saveMiscBonus: 0,
      critRange: 20,
      fighterLevel: 0,
      fighterState: freshFighterState(0),
      barbarianLevel: 0,
      meleeDamageBonus: 0,
      recklessThisTurn: false,
      ragingBlocksSpells: false,
      combatantResistances: Set(),
      sneakAttackDice: 0,
      sneakAttackUsedThisTurn: false,
      readiedSpellParams: NO_READIED_SPELL,
      grappledBy: "",
      grapplingTarget: "",
      grappledTargetTwoSizesSmaller: false,
      baseWalkSpeed: walkSpeed,
    }
  }

  /// Deal damage to a target. When knockOut=true and the hit would reduce a PC to 0 HP,
  /// the attacker instead knocks out the target (SRD 5.2.1 "Knocking Out a Creature").
  /// NOTE: knockOut currently ignores melee-only guard — no melee/ranged distinction yet (see D1).
  /// NOTE: concentration break from knockOut-induced Unconscious is handled by the
  /// separate bConcentrationCheck action, not inline — consistent with all battle damage paths.
  pure def dealDamage(
    cs: CreatureId -> Combatant, targetId: CreatureId,
    dmg: int, dt: DamageType, crit: bool, knockOut: bool
  ): (CreatureId -> Combatant) = {
    val t = cs.get(targetId)
    // Merge stat block R/V/I with active effect granted R/V/I (single pass)
    val merged = t.creature.activeEffects.fold(
      { r: Set(), v: Set(), i: Set() },
      (acc, e) => { r: acc.r.union(e.grantedResistances), v: acc.v.union(e.grantedVulnerabilities), i: acc.i.union(e.grantedImmunities) }
    )
    val totalR = t.statBlock.resistances.union(merged.r).union(t.combatantResistances)
    val totalV = t.statBlock.vulnerabilities.union(merged.v)
    val totalI = t.statBlock.damageImmunities.union(merged.i)
    val nc = pTakeDamageAsCreature(t.creature, dmg, dt, totalR, totalV, totalI, crit, t.kind)
    // SRD: knock-out only if damage would reduce to exactly 0 HP (not instant death).
    // pKnockOut operates on original state — sets HP to 1 + Unconscious, bypassing
    // the computed damage result. This is correct: the attacker's choice replaces
    // the "reduce to 0" outcome entirely.
    if (knockOut and t.kind == PC and t.creature.hp > 0 and nc.hp == 0 and not(nc.dead)) {
      setCreature(cs, targetId, pKnockOut(t.creature))
    } else {
      setCreature(cs, targetId, nc)
    }
  }


  /// Remove all active effects with the given casterId from a creature.
  /// Used for concentration break propagation (R33).
  pure def removeConditionsForEffects(
    creature: CreatureState, effects: Set[ActiveEffect]
  ): CreatureState =
    effects.fold(creature, (acc, effect) =>
      effect.grantedConditions.fold(acc, (acc2, condition) => pRemoveCondition(acc2, condition))
    )

  pure def removeEffectFromCreature(creature: CreatureState, spellId: str): CreatureState = {
    val removed = creature.activeEffects.filter(e => e.spellId == spellId)
    if (removed.size() == 0) creature
    else removeConditionsForEffects(
      creature.with("activeEffects", creature.activeEffects.filter(e => e.spellId != spellId)),
      removed
    )
  }

  pure def removeEffectsByCaster(creature: CreatureState, cId: CreatureId): CreatureState = {
    val removed = creature.activeEffects.filter(e => e.casterId == cId)
    if (removed.size() == 0) creature
    else removeConditionsForEffects(
      creature.with("activeEffects", creature.activeEffects.filter(e => e.casterId != cId)),
      removed
    )
  }

  /// Break concentration for a caster and propagate: remove all effects
  /// cast by this caster from ALL creatures in the battle.
  /// Also clears readiedSpellParams (SRD 5.2.1: "If your Concentration is broken,
  /// the spell dissipates without taking effect" — readied spell fizzles, slot lost).
  pure def breakConcentrationAndPropagate(
    cs: CreatureId -> Combatant, casterId: CreatureId
  ): (CreatureId -> Combatant) = {
    val caster = cs.get(casterId)
    val spellId = caster.slots.concentrationSpellId
    if (spellId == "") cs  // not concentrating
    else {
      val newSlots = pBreakConcentration(caster.slots)
      val newCreature = removeEffectFromCreature(caster.creature, spellId)
      val cs1 = setSlots(setCreature(cs, casterId, newCreature), casterId, newSlots)
      // Clear readied spell params (concentration break = spell fizzles)
      val caster1 = cs1.get(casterId)
      val cs1b = if (hasReadiedSpell(caster1))
        cs1.set(casterId, caster1.with("readiedSpellParams", NO_READIED_SPELL))
      else cs1
      cs.keys().exclude(Set(casterId)).fold(cs1b, (acc, id) =>
        val c = acc.get(id)
        val cleaned = removeEffectsByCaster(c.creature, casterId)
        if (cleaned == c.creature) acc else setCreature(acc, id, cleaned)
      )
    }
  }


  /// Propagate concentration break if slots show concentration was lost.
  /// Compares old slots to new slots; if concentration broke, propagates removal.
  pure def propagateIfConcBroken(
    cs: CreatureId -> Combatant, id: CreatureId,
    oldSlots: SpellSlotState, newSlots: SpellSlotState
  ): (CreatureId -> Combatant) =
    if (oldSlots.concentrationSpellId != "" and newSlots.concentrationSpellId == "")
      breakConcentrationAndPropagate(cs, id)
    else cs

  /// Eligible reactors: everyone except excludeId who has reaction + alive.
  pure def eligibleExcluding(
    cs: CreatureId -> Combatant, excludeId: CreatureId
  ): Set[CreatureId] =
    cs.keys().exclude(Set(excludeId)).filter(id =>
      hasReaction(cs, id) and not(cs.get(id).creature.dead) and not(cs.get(id).creature.unconscious)
    )

  /// Eligible single-target reactor: target alone if it has reaction + alive + conscious.
  /// Used for after-damage reactions.
  pure def eligibleTarget(
    cs: CreatureId -> Combatant, targetId: CreatureId
  ): Set[CreatureId] =
    if (hasReaction(cs, targetId) and not(cs.get(targetId).creature.dead) and not(cs.get(targetId).creature.unconscious))
      Set(targetId)
    else
      Set()

  pure def effectExpiryOwner(holderId: CreatureId, effect: ActiveEffect): CreatureId =
    if (effect.spellId == RAY_OF_FROST_SPELL_ID) effect.casterId
    else holderId

  pure def blocksOpportunityAttacks(effects: Set[ActiveEffect]): bool =
    effects.exists(e => e.spellId == SHOCKING_GRASP_SPELL_ID and e.turnsRemaining > 0)

  pure def speedDeltaFromEffects(effects: Set[ActiveEffect]): int =
    if (effects.exists(e => e.spellId == RAY_OF_FROST_SPELL_ID and e.turnsRemaining > 0)) -10
    else 0

  pure def battleEffectiveSpeed(c: Combatant): int = {
    val adjustedBaseSpeed = intMax(0, c.baseWalkSpeed + speedDeltaFromEffects(c.creature.activeEffects))
    pComputeEffectiveSpeed(
      adjustedBaseSpeed, c.creature.exhaustion,
      c.creature.grappled, c.creature.restrained,
      0, isBattleGrappling(c), c.grappledTargetTwoSizesSmaller
    )
  }

  pure def refreshCurrentTurnSpeed(
    cs: CreatureId -> Combatant, currentTurnCreatureId: CreatureId
  ): CreatureId -> Combatant = {
    val current = cs.get(currentTurnCreatureId)
    val newSpeed = battleEffectiveSpeed(current)
    val spentMovement = intMax(0, current.turn.effectiveSpeed - current.turn.movementRemaining)
    cs.set(
      currentTurnCreatureId,
      current.with("turn",
        current.turn.with("effectiveSpeed", newSpeed).with("movementRemaining", intMax(0, newSpeed - spentMovement))
      )
    )
  }

  pure def releaseGrapplePair(
    cs: CreatureId -> Combatant,
    grapplerId: CreatureId,
    targetId: CreatureId
  ): CreatureId -> Combatant = {
    val grappler = cs.get(grapplerId)
    val target = cs.get(targetId)
    cs.set(
      grapplerId,
      grappler.with("grapplingTarget", "").with("grappledTargetTwoSizesSmaller", false)
    ).set(
      targetId,
      target.with("creature", pRemoveCondition(target.creature, CGrappled)).with("grappledBy", "")
    )
  }

  pure def linkBattleGrapple(
    cs: CreatureId -> Combatant,
    grapplerId: CreatureId,
    targetId: CreatureId,
    targetTwoSizesSmaller: bool,
    currentTurnCreatureId: CreatureId
  ): CreatureId -> Combatant = {
    val grappler = cs.get(grapplerId)
    val target = cs.get(targetId)
    val cs1 = cs.set(
      grapplerId,
      grappler.with("grapplingTarget", targetId).with("grappledTargetTwoSizesSmaller", targetTwoSizesSmaller)
    ).set(
      targetId,
      target.with("creature", pApplyCondition(target.creature, CGrappled, Set())).with("grappledBy", grapplerId)
    )
    val cs2 = if (grapplerId == currentTurnCreatureId) refreshCurrentTurnSpeed(cs1, currentTurnCreatureId) else cs1
    if (targetId == currentTurnCreatureId) refreshCurrentTurnSpeed(cs2, currentTurnCreatureId) else cs2
  }

  pure def releaseBattleGrappleByGrappler(
    cs: CreatureId -> Combatant,
    grapplerId: CreatureId,
    currentTurnCreatureId: CreatureId
  ): CreatureId -> Combatant = {
    val grappler = cs.get(grapplerId)
    if (grappler.grapplingTarget == "") cs
    else {
      val targetId = grappler.grapplingTarget
      val cs1 = releaseGrapplePair(cs, grapplerId, targetId)
      if (grapplerId == currentTurnCreatureId or targetId == currentTurnCreatureId)
        refreshCurrentTurnSpeed(cs1, currentTurnCreatureId)
      else cs1
    }
  }

  pure def escapeBattleGrapple(
    cs: CreatureId -> Combatant,
    targetId: CreatureId,
    currentTurnCreatureId: CreatureId
  ): CreatureId -> Combatant = {
    val target = cs.get(targetId)
    if (target.grappledBy == "") cs
    else {
      val grapplerId = target.grappledBy
      val cs1 = releaseGrapplePair(cs, grapplerId, targetId)
      if (grapplerId == currentTurnCreatureId or targetId == currentTurnCreatureId)
        refreshCurrentTurnSpeed(cs1, currentTurnCreatureId)
      else cs1
    }
  }

  pure def normalizeBattleGrapples(cs: CreatureId -> Combatant): CreatureId -> Combatant = {
    val afterGrapplers = cs.keys().fold(cs, (acc, grapplerId) =>
      val grappler = acc.get(grapplerId)
      if (grappler.grapplingTarget == "") acc
      else {
        val targetId = grappler.grapplingTarget
        val linkBroken =
          not(acc.keys().contains(targetId)) or
          acc.get(targetId).creature.dead or
          not(acc.get(targetId).creature.grappled) or
          acc.get(targetId).grappledBy != grapplerId or
          grappler.creature.dead or
          isIncapacitated(grappler.creature)
        if (linkBroken) releaseGrapplePair(acc, grapplerId, targetId) else acc
      }
    )
    afterGrapplers.keys().fold(afterGrapplers, (acc, targetId) =>
      val target = acc.get(targetId)
      if (target.grappledBy == "") acc
      else {
        val grapplerId = target.grappledBy
        val linkBroken =
          not(acc.keys().contains(grapplerId)) or
          acc.get(grapplerId).grapplingTarget != targetId or
          not(target.creature.grappled)
        if (linkBroken)
          acc.set(targetId, target.with("creature", pRemoveCondition(target.creature, CGrappled)).with("grappledBy", ""))
        else acc
      }
    )
  }

  pure def advanceStartEffectsForOwner(
    cs: CreatureId -> Combatant, ownerId: CreatureId
  ): (CreatureId -> Combatant) =
    cs.keys().fold(cs, (acc, holderId) =>
      val cb = acc.get(holderId)
      val advanced = cb.creature.activeEffects.map(e =>
        if (effectExpiryOwner(holderId, e) == ownerId)
          e.with("turnsRemaining", e.turnsRemaining - 1)
        else e
      )
      val expired = pExpiredAtPhase(advanced, AtStartOfTurn)
      val cleared = advanced.exclude(expired)
      val slots1 = pAutoBreakExpiredConcentration(cb.slots, cleared)
      val creature1 = removeConditionsForEffects(cb.creature.with("activeEffects", cleared), expired)
      val acc1 = setSlots(setCreature(acc, holderId, creature1), holderId, slots1)
      propagateIfConcBroken(acc1, holderId, cb.slots, slots1)
    )

  pure def applyAttackHitRider(
    cs: CreatureId -> Combatant,
    attackerId: CreatureId,
    targetId: CreatureId,
    hitRider: AttackHitRider
  ): (CreatureId -> Combatant) = {
    val target = cs.get(targetId)
    val effects = match hitRider {
      | AHRShockingGrasp =>
        pAddEffectSimple(target.creature.activeEffects, SHOCKING_GRASP_SPELL_ID, 1, AtStartOfTurn, attackerId)
      | AHRRayOfFrost =>
        pAddEffectSimple(target.creature.activeEffects, RAY_OF_FROST_SPELL_ID, 1, AtStartOfTurn, attackerId)
      | _ => target.creature.activeEffects
    }
    if (effects == target.creature.activeEffects) cs
    else setCreature(cs, targetId, target.creature.with("activeEffects", effects))
  }

  /// Eligible for Legendary Resistance: target alive + conscious + has LR charges remaining.
  /// LR is a per-day resource, NOT reaction-based.
  pure def eligibleForLR(
    cs: CreatureId -> Combatant, targetId: CreatureId
  ): Set[CreatureId] =
    val c = cs.get(targetId)
    if (not(c.creature.dead) and not(c.creature.unconscious) and c.monsterResources.legendaryResistancesRemaining > 0)
      Set(targetId)
    else
      Set()

  /// Spend one Legendary Resistance charge on the given creature.
  pure def spendLR(cs: CreatureId -> Combatant, id: CreatureId): CreatureId -> Combatant =
    val c = cs.get(id)
    val newMR = c.monsterResources.with("legendaryResistancesRemaining",
      c.monsterResources.legendaryResistancesRemaining - 1)
    cs.set(id, c.with("monsterResources", newMR))

  /// Does the creature have a spell slot of level 3 or higher?
  /// Required for Counterspell (level 3 Abjuration).
  pure def hasCounterspellSlot(cs: CreatureId -> Combatant, id: CreatureId): bool =
    val slots = cs.get(id).slots.slotsCurrent
    3.to(9).exists(lvl => slots.get(lvl) > 0)

  /// Eligible Counterspell reactors: base eligible + has level 3+ slot + counterspell prepared
  /// + hasn't already expended a spell slot this turn (SRD 5.2.1 "One Spell with a Spell Slot per Turn").
  /// All spell-casting actions also guard on slotExpendedThisTurn at the action level.
  pure def eligibleForCounterspell(
    cs: CreatureId -> Combatant, excludeId: CreatureId
  ): Set[CreatureId] =
    eligibleExcluding(cs, excludeId).filter(id =>
      hasCounterspellSlot(cs, id)
      and cs.get(id).preparedSpells.contains("counterspell")
      and not(cs.get(id).turn.slotExpendedThisTurn)
    )

  pure def legalDamageReactions(cs: CreatureId -> Combatant, atk: AttackDamageCtx): Set[str] = {
    val target = cs.get(atk.target)
    val canUncannyDodge =
      hasReaction(cs, atk.target)
      and not(target.creature.dead)
      and not(target.creature.unconscious)
      and not(isIncapacitated(target.creature))
      and target.rogueLevel >= 5
      and atk.targetCanSeeAttackerAtHit
    val canDamageReduction =
      hasReaction(cs, atk.target)
      and not(target.creature.dead)
      and not(target.creature.unconscious)
      and not(isIncapacitated(target.creature))
      and target.monkLevel >= 3
      and (
        (atk.damageType == Bludgeoning or atk.damageType == Piercing or atk.damageType == Slashing)
        or target.monkLevel >= 13
      )
      and (
        atk.isWeaponAttack
        or target.monkLevel >= 13
      )
    val uncanny = if (canUncannyDodge) Set(DMG_REACTION_UNCANNY_DODGE) else Set()
    val reduction = if (canDamageReduction) Set(DMG_REACTION_DEFLECT_ATTACKS) else Set()
    uncanny.union(reduction)
  }

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
    returnTo: AfterDamageReturn,
    knockOut: bool
  ): { creatures: CreatureId -> Combatant, phase: BattlePhase } = {
    val oldT = cs.get(targetId)
    val cs1 = normalizeBattleGrapples(dealDamage(cs, targetId, dmg, dt, crit, knockOut))
    val newT = cs1.get(targetId)
    // Actual damage after resistance/vulnerability/immunity and temp HP absorption
    val actualDmg = (oldT.creature.hp + oldT.creature.tempHp) - (newT.creature.hp + newT.creature.tempHp)
    // After damage: damaged creature can react (Hellish Rebuke, Retaliation)
    val elig = eligibleTarget(cs1, targetId)
    if (actualDmg > 0 and elig.size() > 0) {
      val adCtx: AfterDamageCtx = {
        damageSource: sourceId, damagedCreature: targetId,
        damageDealt: actualDmg, damageType: dt, returnTo: returnTo,
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
      | ADRAwaitingLegendaryAction(la) => BPAwaitingLegendaryAction(la)
      | ADRAwaitingReadiedAction(r) => BPAwaitingReadiedAction(r)
    }

  // Frame condition for battle vars not changed by this action.
  // If you use explicit assignments instead of keepBattle, include ALL of these.
  action keepBattle = all {
    bInitiative' = bInitiative,
    bTurnIndex' = bTurnIndex,
    bRound' = bRound,
    bSpellStack' = bSpellStack,
    bTurnStarted' = bTurnStarted,
  }

  /// Compute next turn index and round number.
  pure def nextTurn(turnIndex: int, initLen: int, round: int): { idx: int, round: int } = {
    val nextIdx = if (turnIndex + 1 < initLen) turnIndex + 1 else 0
    { idx: nextIdx, round: if (nextIdx == 0) round + 1 else round }
  }

  /// Creatures eligible to release a readied action: readiedAction == true, reactionAvailable, alive, not incapacitated.
  pure def readyEligible(cs: CreatureId -> Combatant): Set[CreatureId] =
    cs.keys().filter(id =>
      val c = cs.get(id)
      c.turn.readiedAction and c.turn.reactionAvailable and not(c.creature.dead) and not(isIncapacitated(c.creature))
    )

  /// Effective initiative roll: surprised creatures have Disadvantage (min of two d20s).
  /// SRD 5.2.1 Rules-Glossary "Surprise": Disadvantage on Initiative roll.
  pure def effectiveInitRoll(roll1: int, roll2: int, surprised: bool): int =
    if (surprised) (if (roll1 < roll2) roll1 else roll2) else roll1

  /// Sort initiative entries by score descending (highest goes first).
  /// Ties preserve input order (stable selection sort).
  pure def sortInitDesc(entries: List[{ id: CreatureId, score: int }]): List[CreatureId] = {
    0.to(entries.length() - 1).fold(List(), (sorted, _) => {
      val placedIds = listToSet(sorted)
      val remaining = entries.select(e => not(placedIds.contains(e.id)))
      val best = remaining.foldl(remaining[0], (b, e) => if (e.score > b.score) e else b)
      sorted.append(best.id)
    })
  }

  // ============================================================
  // 4. BATTLE ACTIONS
  // ============================================================

  // Stat block for test monster "C": 3 LA, 3 LR, one recharge ability.
  val TEST_MONSTER_STAT_BLOCK: StatBlock = NULL_STAT_BLOCK
    .with("name", "TestMonster")
    .with("speeds", Map(Walk -> 30, Fly -> 0, Swim -> 0, Climb -> 0, Burrow -> 0))
    .with("legendaryActionUses", 3)
    .with("legendaryResistanceUses", 3)
    .with("legendaryActions", Map("tail_attack" -> { name: "Tail Attack", cost: 1 }))
    .with("rechargeAbilities", Map("breath_weapon" -> { name: "Breath Weapon", rechargeMin: 5 }))

  action bInit = {
    nondet hp1 = 10.to(30).oneOf()
    nondet hp2 = 10.to(30).oneOf()
    nondet hp3 = 20.to(50).oneOf()
    nondet hp4 = 10.to(30).oneOf()
    // Initiative: d20 roll per creature. SRD 5.2.1: "every participant rolls Initiative"
    nondet initRoll1 = 1.to(20).oneOf()
    nondet initRoll2 = 1.to(20).oneOf()
    nondet initRoll3 = 1.to(20).oneOf()
    nondet initRoll4 = 1.to(20).oneOf()
    // Second d20 for Disadvantage (surprised). Always rolled; ignored if not surprised.
    nondet initRoll1b = 1.to(20).oneOf()
    nondet initRoll2b = 1.to(20).oneOf()
    nondet initRoll3b = 1.to(20).oneOf()
    nondet initRoll4b = 1.to(20).oneOf()
    // Surprise flags. SRD 5.2.1: "surprised … has Disadvantage on their Initiative roll"
    nondet surprised1 = Bool.oneOf()
    nondet surprised2 = Bool.oneOf()
    nondet surprised3 = Bool.oneOf()
    nondet surprised4 = Bool.oneOf()
    // Aura of Protection bonus (Paladin L6+: CHA mod, min +1, range 0-5)
    nondet smb2 = 0.to(5).oneOf()
    nondet smb4 = 0.to(5).oneOf()
    all {
      bCreatures' = Map(
        "A" -> mkCaster(hp1, PC).with("rogueLevel", 5).with("hasEvasion", true).with("sneakAttackDice", 3),  // B11: rogue 5, Evasion, SA 3d6
        "B" -> mkCaster(hp2, PC).with("saveMiscBonus", smb2).with("barbarianLevel", 5).with("baseWalkSpeed", 40).with("turn", FRESH_TURN.with("movementRemaining", 40).with("effectiveSpeed", 40)),  // Paladin Aura + barbarian 5, Fast Movement baked into baseWalkSpeed
        "C" -> mkMonster(hp3, TEST_MONSTER_STAT_BLOCK),
        "D" -> mkCaster(hp4, PC).with("critRange", 19).with("fighterLevel", 5).with("fighterState", freshFighterState(5)).with("saveMiscBonus", smb4)  // Champion fighter 5
      ),
      // Initiative order: sorted by effective roll descending (highest first).
      // SRD 5.2.1: "Disadvantage on their Initiative roll" for surprised combatants.
      bInitiative' = sortInitDesc([
        { id: "A", score: effectiveInitRoll(initRoll1, initRoll1b, surprised1) },
        { id: "B", score: effectiveInitRoll(initRoll2, initRoll2b, surprised2) },
        { id: "C", score: effectiveInitRoll(initRoll3, initRoll3b, surprised3) },
        { id: "D", score: effectiveInitRoll(initRoll4, initRoll4b, surprised4) },
      ]),
      bTurnIndex' = 0,
      bRound' = 1,
      bPhase' = BPActiveTurn,
      bSpellStack' = List(),
      bTurnStarted' = false,
    }
  }

  action bStartTurn = {
    val activeId = bInitiative[bTurnIndex]
    // Nondeterministic inputs for start-of-turn processing
    nondet rechargeD6 = 1.to(6).oneOf()
    nondet sotDmg = 0.to(10).oneOf()
    nondet sotDt = ALL_DAMAGE_TYPES.oneOf()
    nondet sotHeal = 0.to(5).oneOf()
    nondet sotSaveResult = Bool.oneOf()
    nondet sotConSave = Bool.oneOf()
    nondet deathSaveRoll = 0.to(20).oneOf()
    all {
      bPhase == BPActiveTurn,
      not(bTurnStarted),
      // 1. Advance all start-of-turn owned effects across the battle state.
      val cs0a = advanceStartEffectsForOwner(bCreatures, activeId)
      val c0 = cs0a.get(activeId)
      // 2b. Death save (if applicable): hp == 0, not stable, not dead, roll provided
      val s1 = if (c0.creature.hp == 0 and not(c0.creature.stable) and not(c0.creature.dead) and deathSaveRoll > 0)
        pDeathSave(c0.creature, deathSaveRoll)
      else c0.creature
      val cs0 = setCreature(cs0a, activeId, s1)
      // 3. Process start-of-turn effects (simplified: one aggregate effect)
      val hasEffects = cs0.get(activeId).creature.activeEffects.size() > 0 and (sotDmg > 0 or sotHeal > 0)
      val cs1 = if (hasEffects) {
        val startEff: StartOfTurnEffect = {
          spellId: "", healAmount: sotHeal, tempHpAmount: 0,
          saveResult: sotSaveResult, damageAmount: sotDmg, damageType: sotDt,
          conSaveSucceeded: sotConSave,
          resistances: Set(), vulnerabilities: Set(), immunities: Set(),
        }
        val ac0 = cs0.get(activeId)
        val r = pProcessStartOfTurn(ac0.creature, ac0.slots, [startEff])
        // Propagate concentration break across all creatures
        val cs1a = setCreature(cs0, activeId, r.creature).setSlots(activeId, r.slots)
        propagateIfConcBroken(cs1a, activeId, ac0.slots, r.slots)
      } else cs0
      val cs1b = normalizeBattleGrapples(cs1)
      // 4. Fresh turn state
      val ac1 = cs1b.get(activeId)
      val speed = battleEffectiveSpeed(ac1)
      val cs2 = setTurn(cs1b, activeId, FRESH_TURN
        .with("movementRemaining", speed)
        .with("effectiveSpeed", speed))
      // 4b. Fighter start-of-turn: reset actionSurgeUsedThisTurn
      val ac4 = cs2.get(activeId)
      // 4c. Clear readied spell; if one was held, break its concentration (SRD 5.2.1:
      // "Concentration, which you can maintain up to the start of your next turn")
      val cs2a = if (hasReadiedSpell(ac4))
        breakConcentrationAndPropagate(cs2.set(activeId, ac4.with("readiedSpellParams", NO_READIED_SPELL)), activeId)
      else cs2
      val ac4b = cs2a.get(activeId)
      val cs2b = cs2a.set(activeId, ac4b.with("fighterState", pFighterStartTurn(ac4b.fighterState, ac4b.fighterLevel))
                                            .with("recklessThisTurn", false)
                                            .with("sneakAttackUsedThisTurn", false)
                                            .with("readiedSpellParams", NO_READIED_SPELL))
      // 5. Monster-specific: refresh LA + recharge rolls
      val cs3 = if (c0.kind == Monster) {
        val sb = c0.statBlock
        val mr0 = cs2b.get(activeId).monsterResources
        // Refresh legendary actions (R7)
        val mr1 = pRefreshLegendaryActions(mr0, sb.legendaryActionUses, sb.inLair)
        // Recharge rolls: each unavailable ability gets the same d6 roll (simplification)
        val unavailable = sb.rechargeAbilities.keys().filter(name =>
          mr1.rechargeAvailable.keys().contains(name) and not(mr1.rechargeAvailable.get(name))
        )
        val rollList = unavailable.fold(List(), (acc, name) =>
          acc.append({ abilityName: name, d6Roll: rechargeD6 })
        )
        val mr2 = if (rollList.length() > 0)
          pProcessRechargeRolls(mr1, rollList, sb.rechargeAbilities)
        else mr1
        cs2b.set(activeId, cs2b.get(activeId).with("monsterResources", mr2))
      } else cs2b
      // 6. Reset slotExpendedThisTurn for ALL creatures (SRD 5.2.1 "One Spell with a Spell Slot per Turn")
      val cs4 = cs3.keys().fold(cs3, (acc, cid) =>
        val cb = acc.get(cid)
        acc.set(cid, cb.with("turn", cb.turn.with("slotExpendedThisTurn", false)))
      )
      all {
        bCreatures' = normalizeBattleGrapples(cs4),
        bPhase' = BPActiveTurn,
        bInitiative' = bInitiative,
        bTurnIndex' = bTurnIndex,
        bRound' = bRound,
        bSpellStack' = bSpellStack,
        bTurnStarted' = true,
      }
    }
  }

  // --- Attack transaction (B0/B1) ---

  /// Build AttackContext from Combatant state + per-attack parameters.
  /// Spatial/visibility booleans are caller-provided (nondeterministic in spec).
  pure def buildAttackContext(
    cs: CreatureId -> Combatant,
    attackerId: CreatureId, targetId: CreatureId,
    isMelee: bool,
    attackerWithin5ft: bool, hostileWithin5ft: bool,
    targetCanSeeAttacker: bool, attackerCanSeeTarget: bool,
    frightSourceInLOS: bool,
  ): AttackContext = {
    val atk = cs.get(attackerId)
    val tgt = cs.get(targetId)
    {
      attackerBlinded: atk.creature.blinded,
      attackerProne: atk.creature.prone,
      attackerRestrained: atk.creature.restrained,
      attackerPoisoned: atk.creature.poisoned,
      attackerFrightened: atk.creature.frightened,
      attackerFrightSourceInLOS: frightSourceInLOS,
      targetBlinded: tgt.creature.blinded,
      targetParalyzed: tgt.creature.paralyzed,
      targetPetrified: tgt.creature.petrified,
      targetStunned: tgt.creature.stunned,
      targetUnconscious: tgt.creature.unconscious,
      targetRestrained: tgt.creature.restrained,
      targetProne: tgt.creature.prone,
      attackerWithin5ft: attackerWithin5ft,
      targetDodging: tgt.turn.dodging,
      targetCanSeeAttacker: targetCanSeeAttacker,
      attackerCanSeeTarget: attackerCanSeeTarget,
      isRangedAttack: not(isMelee),
      beyondNormalRange: false,       // range modeling deferred
      hostileWithin5ft: hostileWithin5ft,
      isHeavyWeapon: false,           // weapon properties not modeled in battle yet
      wielderStrScore: 16,            // safe default; not modeled in battle
      wielderDexScore: 14,            // safe default; not modeled in battle
      attackerGrappled: atk.grappledBy != "" or atk.creature.grappled,
      targetIsGrappler: atk.grappledBy == targetId,
      underwater: false,              // environmental, deferred
      attackerHasSwimSpeed: false,
      isUnderwaterMeleeException: false,
      isUnderwaterRangedException: false,
      attackerReckless: atk.recklessThisTurn,
      targetReckless: tgt.recklessThisTurn,
    }
  }

  /// Shared attack resolution: determines hit, enters reaction chain or deals damage.
  /// Called by bAttack, bMovementOAAttack, bLegendaryAttack, bReadyRelease.
  pure def resolveAttack(
    cs: CreatureId -> Combatant,
    attackerId: CreatureId, targetId: CreatureId,
    attackRoll: int, targetAc: int,
    damage: int, damageType: DamageType, isCritical: bool,
    critRange: int,
    returnTo: AfterDamageReturn,
    knockOut: bool,
    isMelee: bool,
    targetCanSeeAttackerAtHit: bool,
    mods: FullAttackMods,
    isFinesse: bool,
    hasAllyAdjacentToTarget: bool,
    saDmg: int,
    hitRider: AttackHitRider,
  ): { creatures: CreatureId -> Combatant, phase: BattlePhase } = {
    // autoMiss forces miss; otherwise normal hit check
    val hit = not(mods.autoMiss) and (attackRoll >= targetAc or attackRoll >= critRange)
    if (not(hit)) {
      { creatures: cs, phase: returnToPhase(returnTo) }
    } else {
      val atk = cs.get(attackerId)
      val meleeDmgBonus = if (isMelee) atk.meleeDamageBonus else 0  // rage bonus: melee only (D1 fix)
      // Sneak Attack eligibility (SRD 5.2.1 Rogue "Sneak Attack")
      val eligibleWeapon = isFinesse or not(isMelee)  // finesse or ranged weapon
      val saEligible = atk.sneakAttackDice > 0
        and not(atk.sneakAttackUsedThisTurn)
        and eligibleWeapon
        and (mods.hasAdvantage or (hasAllyAdjacentToTarget and not(mods.hasDisadvantage)))
      val effectiveSaDmg = if (saEligible) saDmg else 0
      val totalDmg = damage + meleeDmgBonus + effectiveSaDmg
      val effectiveKnockOut = knockOut and isMelee  // SRD: knock out is melee only
      val effectiveCrit = isCritical or mods.autoCrit  // Paralyzed/Unconscious within 5ft = auto-crit
      // Mark SA used on attacker if SA fired
      val cs1 = if (saEligible) cs.set(attackerId, atk.with("sneakAttackUsedThisTurn", true)) else cs
      val atkCtx: AttackHitCtx = {
        attacker: attackerId, target: targetId,
        attackRoll: attackRoll, targetAc: targetAc,
        damage: totalDmg, damageType: damageType, isCritical: effectiveCrit,
        critRange: critRange,
        atkReturnTo: returnTo,
        knockOut: effectiveKnockOut,
        hitRider: hitRider,
        targetCanSeeAttackerAtHit: targetCanSeeAttackerAtHit,
        isWeaponAttack: hitRider == NoAttackHitRider,
      }
      val elig = eligibleExcluding(cs1, attackerId)
      if (elig.size() > 0) {
        { creatures: cs1, phase: BPAwaitingReaction(mkAwait(PIAttackHit(atkCtx), TAttackHits, elig)) }
      } else {
        dealDamageWithAfterReactions(cs1, targetId, attackerId, totalDmg, damageType, effectiveCrit, returnTo, knockOut)
      }
    }
  }

  action bAttack = {
    val activeId = bInitiative[bTurnIndex]
    val allIds = bCreatures.keys()
    val ac = bCreatures.get(activeId)
    nondet targetId = allIds.exclude(Set(activeId)).oneOf()
    nondet attackRoll = 1.to(20).oneOf()
    // Weapon dice for 3D overlay. Models uniform dice (e.g., 2d6 greatsword).
    // Does NOT model mixed-die weapons (e.g., 1d6+1d4) — would need per-die nondets.
    nondet diceCount = Set(1, 2).oneOf()
    nondet dieSize = Set(4, 6, 8, 10, 12).oneOf()
    nondet dmg = diceCount.to(diceCount * dieSize).oneOf()
    nondet dt = ALL_DAMAGE_TYPES.oneOf()
    nondet crit = Bool.oneOf()
    nondet tAc = 10.to(20).oneOf()
    nondet knockOut = Bool.oneOf()
    nondet isMelee = Bool.oneOf()
    nondet isFinesse = Bool.oneOf()  // SRD: only melee weapons have Finesse, except Dart (Simple Ranged)
    // Spatial/visibility nondets (caller-provided facts)
    nondet attackerWithin5ft = Bool.oneOf()
    nondet hostileWithin5ft = Bool.oneOf()
    nondet targetCanSeeAttacker = Bool.oneOf()
    nondet attackerCanSeeTarget = Bool.oneOf()
    nondet frightSourceInLOS = Bool.oneOf()
    nondet hasAllyAdjacentToTarget = Bool.oneOf()
    nondet hitRider = Set(NoAttackHitRider, AHRShockingGrasp, AHRRayOfFrost).oneOf()
    // SA damage: nondeterministic within Nd6 range (0 if not eligible — resolved in resolveAttack)
    nondet saDmg = ac.sneakAttackDice.to(ac.sneakAttackDice * 6).oneOf()
    val tc = bCreatures.get(targetId)
    all {
      bPhase == BPActiveTurn,
      bTurnStarted,
      ac.turn.actionsRemaining > 0 or ac.turn.extraAttacksRemaining > 0,
      not(ac.creature.dead),
      not(isIncapacitated(ac.creature)),
      not(tc.creature.dead),
      (hitRider != AHRShockingGrasp) or (isMelee and dt == Lightning),
      (hitRider != AHRRayOfFrost) or (not(isMelee) and dt == Cold),
      val newTurn = if (ac.turn.attackActionUsed and ac.turn.extraAttacksRemaining > 0)
        ac.turn.with("extraAttacksRemaining", ac.turn.extraAttacksRemaining - 1)
      else
        pUseAction(ac.turn, ac.creature, AAttack)
      val cs1 = setTurn(bCreatures, activeId, newTurn)
      val atkCtx = buildAttackContext(cs1, activeId, targetId, isMelee, attackerWithin5ft, hostileWithin5ft, targetCanSeeAttacker, attackerCanSeeTarget, frightSourceInLOS)
      val atkMods = pAggregateAttackMods(atkCtx)
      val result = resolveAttack(cs1, activeId, targetId, attackRoll, tAc, dmg, dt, crit, ac.critRange, ADRActiveTurn, knockOut, isMelee, targetCanSeeAttacker, atkMods, isFinesse, hasAllyAdjacentToTarget, saDmg, hitRider)
      all { bCreatures' = result.creatures, bPhase' = result.phase, keepBattle }
    }
  }

  pure def advanceFromHitPhase(
    cs: CreatureId -> Combatant, atk: AttackHitCtx
  ): { creatures: CreatureId -> Combatant, phase: BattlePhase } = {
    val stillHit = atk.attackRoll >= atk.targetAc or atk.attackRoll >= atk.critRange
    if (not(stillHit)) {
      { creatures: cs, phase: returnToPhase(atk.atkReturnTo) }
    } else {
      val cs1 = applyAttackHitRider(cs, atk.attacker, atk.target, atk.hitRider)
      val dmgBase: AttackDamageCtx = {
        attacker: atk.attacker, target: atk.target,
        damage: atk.damage, damageType: atk.damageType,
        isCritical: atk.isCritical, atkReturnTo: atk.atkReturnTo,
        knockOut: atk.knockOut,
        targetCanSeeAttackerAtHit: atk.targetCanSeeAttackerAtHit,
        isWeaponAttack: atk.isWeaponAttack,
        legalReactions: Set(),
      }
      val dmgCtx = dmgBase.with("legalReactions", legalDamageReactions(cs1, dmgBase))
      if (dmgCtx.legalReactions.size() > 0) {
        { creatures: cs1, phase: BPAwaitingReaction(mkAwait(PIAttackDamage(dmgCtx), TAttackDamages, Set(atk.target))) }
      } else {
        // No damage-phase reactions — deal damage and check for after-damage reactions (R10.4)
        dealDamageWithAfterReactions(cs1, atk.target, atk.attacker,
          atk.damage, atk.damageType, atk.isCritical, atk.atkReturnTo, atk.knockOut)
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
                atk.target, atk.attacker, atk.damage, atk.damageType, atk.isCritical, atk.atkReturnTo, atk.knockOut)
              all { bCreatures' = result.creatures, bPhase' = result.phase, keepBattle }
            } else {
              nondet reactorId = remaining.oneOf()
              nondet reductionAmt = 1.to(20).oneOf()
              nondet decision = Set(RPass, RUncannyDodge, RDeflectAttacks(reductionAmt)).oneOf()
              val newOffered = ctx.offered.union(Set(reactorId))
              val newElig = ctx.eligible.exclude(Set(reactorId))
              val legalDecision =
                decision == RPass
                or (decision == RUncannyDodge and atk.legalReactions.contains(DMG_REACTION_UNCANNY_DODGE))
                or (
                  match decision {
                    | RDeflectAttacks(_) => atk.legalReactions.contains(DMG_REACTION_DEFLECT_ATTACKS)
                    | _ => false
                  }
                )
              // Damage-reduction reactions: compute new damage, stay in damage phase.
              // RPass leaves damage unchanged; reduction reactions lower it.
              val newDmg = if (not(legalDecision) or reactorId != atk.target) atk.damage else match decision {
                | RUncannyDodge =>
                  atk.damage / 2
                | RDeflectAttacks(amount) =>
                  if (atk.damage - amount > 0) atk.damage - amount else 0
                | _ => atk.damage
              }
              if (newDmg != atk.damage) {
                val cs1 = spendReaction(bCreatures, reactorId)
                val updatedAtk = atk.with("damage", newDmg)
                val updatedAtkWithLegal = updatedAtk.with("legalReactions", legalDamageReactions(cs1, updatedAtk))
                all {
                  bCreatures' = cs1,
                  bPhase' = BPAwaitingReaction({
                    interrupt: PIAttackDamage(updatedAtkWithLegal), trigger: TAttackDamages,
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

  // Generic after-damage spell reaction (e.g., Hellish Rebuke, Fire Shield).
  // Spell identity is uninterpreted — the TS side supplies dice and display info.
  // reactionSaved drives save-for-half logic; dmg and dt are opaque to the spec.
  // NOTE: Currently all users (Hellish Rebuke, Fire Shield) always deal damage,
  // so dmg is always positive. If a non-damage spell reaction is needed, add a
  // separate action rather than making dmg optional here.
  action bAfterDamageSpellReaction = {
    nondet reactionDmg = 1.to(40).oneOf()
    nondet reactionSaved = Bool.oneOf()
    nondet reactionDt = ALL_DAMAGE_TYPES.oneOf()
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
              val actualDmg = if (reactionSaved) reactionDmg / 2 else reactionDmg
              val result = dealDamageWithAfterReactions(
                cs1, ad.damageSource, reactorId,
                actualDmg, reactionDt, false, ad.returnTo, false
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
                  retDmg, retDt, retCrit, ad.returnTo, false
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
    // Only Dex and Con matter for behavior (Evasion checks == Dex); others are identical.
    // Full 6-way set would multiply state space 3x for no coverage gain.
    nondet saveAb = Set(Dex, Con).oneOf()
    nondet slotLvl = 1.to(9).oneOf()
    nondet spellName = ac.preparedSpells.oneOf()
    nondet ritual = Bool.oneOf()
    val tc = bCreatures.get(targetId)
    all {
      bPhase == BPActiveTurn,
      bTurnStarted,
      ac.turn.actionsRemaining > 0,
      not(ac.creature.dead),
      not(isIncapacitated(ac.creature)),
      not(tc.creature.dead),
      not(ac.turn.actionSurgeActionPending),  // Action Surge cannot be Magic
      not(ac.ragingBlocksSpells),             // Rage blocks spell casting
      not(ac.turn.slotExpendedThisTurn) or ritual,  // SRD 5.2.1 one slot per turn
      ac.preparedSpells.size() > 0,           // must have at least one prepared spell
      // Ritual: no slot needed (SRD 5.2.1). Normal: slot required.
      if (ritual) true else ac.slots.slotsCurrent.get(slotLvl) > 0,
      val newTurn = pUseAction(ac.turn, ac.creature, AMagic)
      val cs1 = setTurn(bCreatures, activeId, newTurn)
      // Spend-then-refund: expend slot immediately (sets slotExpendedThisTurn = true).
      // SRD 5.2.1 Counterspell: "the slot isn't expended" → refunded in bResolveCounterspell.
      // SRD 5.2.1 "One Spell with a Spell Slot per Turn" → flag stays true even after refund.
      val cs2 = if (ritual) cs1 else expendSlot(cs1, activeId, slotLvl)
      val saveCtx: SaveSpellCtx = {
        caster: activeId, target: targetId,
        saveDC: saveDC, saveRoll: saveRoll,
        damageOnFail: dmgOnFail, halfOnSuccess: halfOnSave,
        damageType: dt,
        conditionOnFail: cond, applyCondition: applyCond,
        saveAbility: saveAb,
      }
      val spellCtx: SpellCastCtx = {
        caster: activeId,
        spellName: spellName,
        postCast: PCESave(saveCtx),
        slotLvl: slotLvl,
        ritual: ritual,
      }
      // Check for Counterspell (must have reaction + alive + level 3+ slot)
      val csElig = eligibleForCounterspell(cs2, activeId)
      if (csElig.size() > 0) {
        all {
          bCreatures' = cs2,
          bPhase' = BPAwaitingReaction(mkAwait(PISpellCast(spellCtx), TSpellBeingCast, csElig)),
          keepBattle,
        }
      } else {
        // No Counterspell possible — slot already spent, resolve immediately
        val result = resolveSave(cs2, saveCtx, ADRActiveTurn)
        all { bCreatures' = result.creatures, bPhase' = result.phase, keepBattle }
      }
    }
  }

  /// Resolve a save: check save roll vs DC, apply effects or enter save-failed interrupt.
  /// returnTo: where to go after damage-triggered reactions resolve.
  pure def resolveSave(
    cs: CreatureId -> Combatant, save: SaveSpellCtx, returnTo: AfterDamageReturn
  ): { creatures: CreatureId -> Combatant, phase: BattlePhase } = {
    val tgt = cs.get(save.target)
    val saved = (save.saveRoll + tgt.saveMiscBonus) >= save.saveDC
    val isDex = save.saveAbility == Dex
    val tgtIncap = isIncapacitated(tgt.creature)
    if (saved) {
      // Save succeeded — half damage if applicable, no condition
      if (save.halfOnSuccess and save.damageOnFail > 0) {
        val halfDmg = save.damageOnFail / 2
        // Evasion on DEX save success: 0 damage
        val evDmg = if (isDex) pApplyEvasion(halfDmg, true, tgt.hasEvasion, tgtIncap) else halfDmg
        if (evDmg == 0) {
          { creatures: cs, phase: returnToPhase(returnTo) }
        } else {
          dealDamageWithAfterReactions(cs, save.target, save.caster,
            evDmg, save.damageType, false, returnTo, false)
        }
      } else {
        { creatures: cs, phase: returnToPhase(returnTo) }
      }
    } else {
      // Save failed — Evasion on DEX save fail: half damage
      val evDmgOnFail = if (isDex) pApplyEvasion(save.damageOnFail, false, tgt.hasEvasion, tgtIncap) else save.damageOnFail
      // Check for Legendary Resistance
      val elig = eligibleForLR(cs, save.target)
      val failCtx = mkSaveFailedCtx(
        save.caster, save.target,
        evDmgOnFail, save.halfOnSuccess, save.damageType,
        save.conditionOnFail, save.applyCondition
      )
      if (elig.size() > 0) {
        { creatures: cs, phase: BPAwaitingReaction(mkAwait(PISaveFailed(failCtx), TSaveFailed, elig)) }
      } else {
        // No reactions — apply fail effects directly
        applyFailEffects(cs, failCtx, returnTo)
      }
    }
  }

  /// Apply the effects of a failed save: damage + condition.
  /// Returns { creatures, phase } because save damage can trigger after-damage reactions.
  pure def applyFailEffects(
    cs: CreatureId -> Combatant, ctx: SaveFailedCtx, returnTo: AfterDamageReturn
  ): { creatures: CreatureId -> Combatant, phase: BattlePhase } = {
    if (ctx.saveSucceeded) {
      // LR flipped the save — apply half damage if applicable
      if (ctx.halfOnSuccess and ctx.damageOnFail > 0) {
        dealDamageWithAfterReactions(cs, ctx.target, ctx.caster,
          ctx.damageOnFail / 2, ctx.damageType, false, returnTo, false)
      } else {
        { creatures: cs, phase: returnToPhase(returnTo) }
      }
    } else {
      // Full fail: condition first, then damage (condition applied before damage so
      // after-damage reactions see the updated state).
      val cs1 = if (ctx.applyCondition) {
        val t = cs.get(ctx.target)
        normalizeBattleGrapples(setCreature(cs, ctx.target, pApplyCondition(t.creature, ctx.conditionOnFail, Set())))
      } else cs
      if (ctx.damageOnFail > 0) {
        dealDamageWithAfterReactions(cs1, ctx.target, ctx.caster,
          ctx.damageOnFail, ctx.damageType, false, returnTo, false)
      } else {
        { creatures: cs1, phase: returnToPhase(returnTo) }
      }
    }
  }

  // --- Counterspell chain helpers (B5, R3) ---

  /// Resolve a concentration spell: start concentration, add effects, apply condition.
  pure def resolveConcentration(
    cs: CreatureId -> Combatant, conc: ConcentrationCtx
  ): (CreatureId -> Combatant) = {
    val caster = cs.get(conc.caster)
    // If already concentrating, break old concentration first (propagate)
    val cs1 = if (caster.slots.concentrationSpellId != "")
      breakConcentrationAndPropagate(cs, conc.caster)
    else cs
    val concSlots = pStartConcentration(cs1.get(conc.caster).slots, conc.spellId)
    val cs2 = setSlots(cs1, conc.caster, concSlots)
    // Add effect to caster
    val casterC = cs2.get(conc.caster)
    val casterEffects = pAddEffectSimple(casterC.creature.activeEffects, conc.spellId, conc.duration, AtEndOfTurn, conc.caster)
    val cs3 = setCreature(cs2, conc.caster, casterC.creature.with("activeEffects", casterEffects))
    // Add effect to target with casterId pointing back to caster
    val targetC = cs3.get(conc.target)
    val newEffects = pAddEffect(
      targetC.creature.activeEffects, conc.spellId, conc.duration, AtEndOfTurn, conc.caster,
      if (conc.applyCondition) Set(conc.conditionOnFail) else Set(),
      Set(), Set(), Set()
    )
    val cs4 = setCreature(cs3, conc.target, targetC.creature.with("activeEffects", newEffects))
    // Apply condition to target if applicable
    if (conc.applyCondition) {
      val t = cs4.get(conc.target)
      setCreature(cs4, conc.target, pApplyCondition(t.creature, conc.conditionOnFail, Set()))
    } else cs4
  }

  /// Terminal resolution for a spell entry: expend slot, then resolve effects.
  /// Does NOT handle PCECounterspell — caller must handle that variant before
  /// invoking this helper (PCECounterspell requires stack unwinding logic).
  /// ritual=true skips slot expenditure (SRD 5.2.1: ritual casting doesn't expend a slot).
  pure def resolveSpellEntry(
    cs: CreatureId -> Combatant,
    casterId: CreatureId, slotLvl: int, isRitual: bool,
    postCast: PostCastEffect,
    stack: List[SpellStackEntry]
  ): { creatures: CreatureId -> Combatant, phase: BattlePhase, stack: List[SpellStackEntry] } = {
    // Slot already spent at cast time (spend-then-refund pattern).
    val cs1 = cs
    match postCast {
      | PCESave(save) =>
        val result = resolveSave(cs1, save, ADRActiveTurn)
        { creatures: result.creatures, phase: result.phase, stack: stack }
      | PCEAoE(aoe) => { creatures: cs1, phase: BPResolvingAoE(aoe), stack: stack }
      | PCEConcentration(conc) =>
        val resolved = resolveConcentration(cs1, conc)
        { creatures: resolved, phase: BPActiveTurn, stack: stack }
      | _ => { creatures: cs1, phase: BPActiveTurn, stack: stack }
    }
  }

  /// Return to an interrupted spell's Counterspell window.
  /// Recomputes eligible from current creature state (reactions may have been
  /// spent during recursive Counterspell chains).
  /// If no remaining eligible, resolves the spell directly (no spurious state).
  ///
  /// PCECounterspell entries: when a CS resolves here (no remaining reactors),
  /// we pop the stack to find the interrupted spell and apply the CS outcome.
  /// Quint does not support recursive pure def, so CS unwinding is inlined to
  /// depth 2 (original spell + one counterspell; depth 3+ is vanishingly rare
  /// in real gameplay — see QUINT_CONNECT_TROUBLESHOOT.md Opportunity 3).
  pure def returnToCSWindow(
    cs: CreatureId -> Combatant,
    entry: SpellStackEntry, stack: List[SpellStackEntry]
  ): { creatures: CreatureId -> Combatant, phase: BattlePhase, stack: List[SpellStackEntry] } = {
    val freshElig = eligibleForCounterspell(cs, entry.spellCasterId)
    val remaining = freshElig.exclude(entry.offered)
    if (remaining.size() > 0) {
      val spell: SpellCastCtx = { caster: entry.spellCasterId, spellName: entry.spellName, postCast: entry.spellPostCast, slotLvl: entry.slotLvl, ritual: entry.ritual }
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
                  // Fizzled spell was itself a CS → refund its slot, let grandparent continue.
                  val csRefundCS = maybeRefundEntry(cs, popped.top)
                  if (popped.rest.length() == 0) {
                    { creatures: csRefundCS, phase: BPActiveTurn, stack: popped.rest }
                  } else {
                    val gp = popStack(popped.rest)
                    val freshElig2 = eligibleForCounterspell(csRefundCS, gp.top.spellCasterId)
                    val remaining2 = freshElig2.exclude(gp.top.offered)
                    if (remaining2.size() > 0) {
                      val spell2: SpellCastCtx = { caster: gp.top.spellCasterId, spellName: gp.top.spellName, postCast: gp.top.spellPostCast, slotLvl: gp.top.slotLvl, ritual: gp.top.ritual }
                      { creatures: csRefundCS,
                        phase: BPAwaitingReaction({
                          interrupt: PISpellCast(spell2), trigger: TSpellBeingCast,
                          eligible: freshElig2, offered: gp.top.offered,
                        }),
                        stack: gp.rest,
                      }
                    } else {
                      // Depth limited to 2 — grandparent is always the original spell.
                      resolveSpellEntry(csRefundCS, gp.top.spellCasterId, gp.top.slotLvl, gp.top.ritual, gp.top.spellPostCast, gp.rest)
                    }
                  }
                | _ =>
                  // Original spell fizzled → refund slot (SRD 5.2.1: "the slot isn't expended").
                  { creatures: maybeRefundEntry(cs, popped.top), phase: BPActiveTurn, stack: popped.rest }
              }
            } else {
              // CS fails → interrupted spell continues; return to its CS window.
              val freshElig2 = eligibleForCounterspell(cs, popped.top.spellCasterId)
              val remaining2 = freshElig2.exclude(popped.top.offered)
              if (remaining2.size() > 0) {
                val spell2: SpellCastCtx = { caster: popped.top.spellCasterId, spellName: popped.top.spellName, postCast: popped.top.spellPostCast, slotLvl: popped.top.slotLvl, ritual: popped.top.ritual }
                { creatures: cs,
                  phase: BPAwaitingReaction({
                    interrupt: PISpellCast(spell2), trigger: TSpellBeingCast,
                    eligible: freshElig2, offered: popped.top.offered,
                  }),
                  stack: popped.rest,
                }
              } else {
                // Depth limited to 2 — popped entry is always the original spell.
                resolveSpellEntry(cs, popped.top.spellCasterId, popped.top.slotLvl, popped.top.ritual, popped.top.spellPostCast, popped.rest)
              }
            }
          }
        | _ => resolveSpellEntry(cs, entry.spellCasterId, entry.slotLvl, entry.ritual, entry.spellPostCast, stack)
      }
    }
  }

  /// Resolve spell-cast interrupt (Counterspell window).
  /// B5: Counterspell is itself a spell → pushes to bSpellStack and enters
  /// recursive PISpellCast. Chain unwinds via stack when spells resolve.
  action bResolveCounterspell = {
    match bPhase {
      | BPAwaitingReaction(ctx) =>
        match ctx.interrupt {
          | PISpellCast(spell) =>
            val remaining = ctx.eligible.exclude(ctx.offered)
            if (remaining.size() == 0) {
              // All offered — spell resolves
              match spell.postCast {
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
                          // Fizzled spell was a CS → refund CS slot, its target spell continues
                          val csRef2 = maybeRefundEntry(bCreatures, popped.top)
                          if (popped.rest.length() == 0) {
                            all { bCreatures' = csRef2, bPhase' = BPActiveTurn, bInitiative' = bInitiative, bTurnIndex' = bTurnIndex, bRound' = bRound, bSpellStack' = popped.rest, bTurnStarted' = bTurnStarted }
                          } else {
                            val gp = popStack(popped.rest)
                            val result = returnToCSWindow(csRef2, gp.top, gp.rest)
                            all { bCreatures' = result.creatures, bPhase' = result.phase, bInitiative' = bInitiative, bTurnIndex' = bTurnIndex, bRound' = bRound, bSpellStack' = result.stack, bTurnStarted' = bTurnStarted }
                          }
                        | _ =>
                          // Original spell fizzled → refund slot
                          val csRef3 = maybeRefundEntry(bCreatures, popped.top)
                          all { bCreatures' = csRef3, bPhase' = BPActiveTurn, bInitiative' = bInitiative, bTurnIndex' = bTurnIndex, bRound' = bRound, bSpellStack' = popped.rest, bTurnStarted' = bTurnStarted }
                      }
                    } else {
                      // CS fails → countered spell continues
                      val result = returnToCSWindow(bCreatures, popped.top, popped.rest)
                      all { bCreatures' = result.creatures, bPhase' = result.phase, bInitiative' = bInitiative, bTurnIndex' = bTurnIndex, bRound' = bRound, bSpellStack' = result.stack, bTurnStarted' = bTurnStarted }
                    }
                  }
                | _ =>
                  // Non-CS spell resolves: dispatch via resolveSpellEntry (slot already spent at cast time)
                  val result = resolveSpellEntry(bCreatures, spell.caster, spell.slotLvl, spell.ritual, spell.postCast, bSpellStack)
                  all { bCreatures' = result.creatures, bPhase' = result.phase, keepBattle }
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
                    // Guard: CS chain depth limited to 2 (depth 3+ vanishingly rare in play).
                    // See QUINT_CONNECT_TROUBLESHOOT.md Opportunity 3.
                    bSpellStack.length() < 2,
                    // Guard: reactor must have a slot of level csSlotLvl
                    bCreatures.get(reactorId).slots.slotsCurrent.get(csSlotLvl) > 0,
                    // Spend reaction + slot
                    val cs1 = spendReaction(bCreatures, reactorId)
                    val cs2 = expendSlot(cs1, reactorId, csSlotLvl)
                    // Push current spell context onto stack
                    val stackEntry: SpellStackEntry = {
                      spellCasterId: spell.caster,
                      spellPostCast: spell.postCast,
                      offered: newOffered,
                      slotLvl: spell.slotLvl,
                      spellName: spell.spellName,
                      ritual: spell.ritual,
                    }
                    val newStack = bSpellStack.append(stackEntry)
                    // Create Counterspell as a new spell cast
                    val csEffect: CounterspellEffect = {
                      targetCasterId: spell.caster,
                      conSaveSucceeded: conSaveSucceeded,
                    }
                    val csSpell: SpellCastCtx = {
                      caster: reactorId,
                      spellName: "counterspell",
                      postCast: PCECounterspell(csEffect),
                      slotLvl: csSlotLvl,  // CS slot spent at cast time; carried for refund if counter-counterspelled
                      ritual: false,  // Counterspell is a reaction, never ritual
                    }
                    // Enter CS window for the Counterspell (empty eligible → resolves next step)
                    val csElig = eligibleForCounterspell(cs2, reactorId)
                    all {
                      bCreatures' = cs2,
                      bPhase' = BPAwaitingReaction(mkAwait(PISpellCast(csSpell), TSpellBeingCast, csElig)),
                      bInitiative' = bInitiative, bTurnIndex' = bTurnIndex, bRound' = bRound, bSpellStack' = newStack, bTurnStarted' = bTurnStarted,
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
              // All offered — apply effects (save damage can trigger after-damage reactions)
              val result = applyFailEffects(bCreatures, sf, ADRActiveTurn)
              all {
                bCreatures' = result.creatures,
                bPhase' = result.phase,
                keepBattle,
              }
            } else {
              nondet reactorId = remaining.oneOf()
              nondet decision = Set(RPass, RLegendaryResistance).oneOf()
              val newOffered = ctx.offered.union(Set(reactorId))
              match decision {
                | RLegendaryResistance => {
                  // LR: auto-succeed the save. Spend LR charge (per-day resource).
                  val cs1 = spendLR(bCreatures, reactorId)
                  val newSf = sf.with("saveSucceeded", true)
                  // Apply as if saved (may still get half damage)
                  val result = applyFailEffects(cs1, newSf, ADRActiveTurn)
                  all {
                    bCreatures' = result.creatures,
                    bPhase' = result.phase,
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
            val aoeReturn = if (aoe.remaining.size() > 0) ADRResolvingAoE(aoe) else ADRActiveTurn
            val remaining = ctx.eligible.exclude(ctx.offered)
            if (remaining.size() == 0) {
              val result = applyFailEffects(bCreatures, sf, aoeReturn)
              all {
                bCreatures' = result.creatures,
                bPhase' = result.phase,
                keepBattle,
              }
            } else {
              nondet reactorId = remaining.oneOf()
              nondet decision = Set(RPass, RLegendaryResistance).oneOf()
              val newOffered = ctx.offered.union(Set(reactorId))
              match decision {
                | RLegendaryResistance => {
                  val cs1 = spendLR(bCreatures, reactorId)
                  val newSf = sf.with("saveSucceeded", true)
                  val result = applyFailEffects(cs1, newSf, aoeReturn)
                  all {
                    bCreatures' = result.creatures,
                    bPhase' = result.phase,
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
    nondet slotLvl = 1.to(9).oneOf()
    nondet duration = 1.to(10).oneOf()
    nondet spellId = Set("hold_person", "bless", "haste", "spirit_guardians").oneOf()
    nondet cond = Set(CParalyzed, CCharmed, CRestrained).oneOf()
    nondet applyCond = Bool.oneOf()
    nondet ritual = Bool.oneOf()
    val tc = bCreatures.get(targetId)
    all {
      bPhase == BPActiveTurn,
      bTurnStarted,
      ac.turn.actionsRemaining > 0,
      not(ac.creature.dead),
      not(isIncapacitated(ac.creature)),
      not(tc.creature.dead),
      not(ac.turn.actionSurgeActionPending),  // Action Surge cannot be Magic
      not(ac.ragingBlocksSpells),             // Rage blocks spell casting
      not(ac.turn.slotExpendedThisTurn) or ritual,  // SRD 5.2.1 one slot per turn
      ac.preparedSpells.contains(spellId),    // SRD 5.2.1: must have spell prepared
      // Ritual: no slot needed (SRD 5.2.1). Normal: slot required.
      if (ritual) true else ac.slots.slotsCurrent.get(slotLvl) > 0,
      val newTurn = pUseAction(ac.turn, ac.creature, AMagic)
      val cs1 = setTurn(bCreatures, activeId, newTurn)
      // Spend-then-refund (see bCastSaveSpell comment for rationale)
      val cs2 = if (ritual) cs1 else expendSlot(cs1, activeId, slotLvl)
      val concCtx: ConcentrationCtx = {
        caster: activeId, target: targetId,
        spellId: spellId, duration: duration,
        conditionOnFail: cond, applyCondition: applyCond,
      }
      val spellCtx: SpellCastCtx = {
        caster: activeId,
        spellName: spellId,
        postCast: PCEConcentration(concCtx),
        slotLvl: slotLvl,
        ritual: ritual,
      }
      // Counterspell interrupt — if countered, concentration never starts
      val csElig = eligibleForCounterspell(cs2, activeId)
      if (csElig.size() > 0) {
        all {
          bCreatures' = cs2,
          bPhase' = BPAwaitingReaction(mkAwait(PISpellCast(spellCtx), TSpellBeingCast, csElig)),
          keepBattle,
        }
      } else {
        // No Counterspell — slot already spent, resolve concentration immediately
        val resolved = resolveConcentration(cs2, concCtx)
        all {
          bCreatures' = resolved,
          bPhase' = BPActiveTurn,
          keepBattle,
        }
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
    // Only Dex and Con matter for behavior (Evasion checks == Dex); others are identical.
    // Full 6-way set would multiply state space 3x for no coverage gain.
    nondet saveAb = Set(Dex, Con).oneOf()
    nondet slotLvl = 1.to(9).oneOf()
    nondet spellName = ac.preparedSpells.oneOf()
    nondet ritual = Bool.oneOf()
    all {
      bPhase == BPActiveTurn,
      bTurnStarted,
      ac.turn.actionsRemaining > 0,
      not(ac.creature.dead),
      not(isIncapacitated(ac.creature)),
      liveTargets.size() >= 2,
      not(ac.turn.actionSurgeActionPending),  // Action Surge cannot be Magic
      not(ac.ragingBlocksSpells),             // Rage blocks spell casting
      not(ac.turn.slotExpendedThisTurn) or ritual,  // SRD 5.2.1 one slot per turn
      ac.preparedSpells.size() > 0,           // must have at least one prepared spell
      // Ritual: no slot needed (SRD 5.2.1). Normal: slot required.
      if (ritual) true else ac.slots.slotsCurrent.get(slotLvl) > 0,
      val newTurn = pUseAction(ac.turn, ac.creature, AMagic)
      val cs1 = setTurn(bCreatures, activeId, newTurn)
      // Spend-then-refund (see bCastSaveSpell comment for rationale)
      val cs2 = if (ritual) cs1 else expendSlot(cs1, activeId, slotLvl)
      val aoeCtx: AoESpellCtx = {
        caster: activeId, saveDC: saveDC,
        damageOnFail: dmgOnFail, halfOnSuccess: halfOnSave,
        damageType: dt,
        conditionOnFail: cond, applyCondition: applyCond,
        remaining: liveTargets,
        saveAbility: saveAb,
      }
      val spellCtx: SpellCastCtx = {
        caster: activeId,
        spellName: spellName,
        postCast: PCEAoE(aoeCtx),
        slotLvl: slotLvl,
        ritual: ritual,
      }
      // Counterspell interrupt — if countered, entire AoE fizzles
      val csElig = eligibleForCounterspell(cs2, activeId)
      if (csElig.size() > 0) {
        all {
          bCreatures' = cs2,
          bPhase' = BPAwaitingReaction(mkAwait(PISpellCast(spellCtx), TSpellBeingCast, csElig)),
          keepBattle,
        }
      } else {
        // No Counterspell — slot already spent, enter AoE resolution
        all {
          bCreatures' = cs2,
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
          val tgt = bCreatures.get(targetId)
          val tgtIncap = isIncapacitated(tgt.creature)
          val isDex = aoe.saveAbility == Dex
          val saved = (saveRoll + tgt.saveMiscBonus) >= aoe.saveDC
          val aoeReturn = ADRResolvingAoE(updatedAoe)
          if (saved) {
            // Save succeeded — half damage if applicable, no condition
            if (aoe.halfOnSuccess and aoe.damageOnFail > 0) {
              val halfDmg = aoe.damageOnFail / 2
              // Evasion on DEX save success: 0 damage
              val evDmg = if (isDex) pApplyEvasion(halfDmg, true, tgt.hasEvasion, tgtIncap) else halfDmg
              if (evDmg == 0) {
                all { bCreatures' = bCreatures, bPhase' = BPResolvingAoE(updatedAoe), keepBattle }
              } else {
                val result = dealDamageWithAfterReactions(bCreatures,
                  targetId, aoe.caster, evDmg, aoe.damageType, false, aoeReturn, false)
                all { bCreatures' = result.creatures, bPhase' = result.phase, keepBattle }
              }
            } else {
              all { bCreatures' = bCreatures, bPhase' = BPResolvingAoE(updatedAoe), keepBattle }
            }
          } else {
            // Save failed — Evasion on DEX save fail: half damage
            val evDmgOnFail = if (isDex) pApplyEvasion(aoe.damageOnFail, false, tgt.hasEvasion, tgtIncap) else aoe.damageOnFail
            val sfCtx = mkSaveFailedCtx(
              aoe.caster, targetId,
              evDmgOnFail, aoe.halfOnSuccess, aoe.damageType,
              aoe.conditionOnFail, aoe.applyCondition
            )
            val elig = eligibleForLR(bCreatures, targetId)
            if (elig.size() > 0) {
              // Enter save-failed interrupt with AoE continuation
              all {
                bCreatures' = bCreatures,
                bPhase' = BPAwaitingReaction(mkAwait(PISaveFailedAoE({ sf: sfCtx, aoe: updatedAoe }), TSaveFailed, elig)),
                keepBattle,
              }
            } else {
              // No LR — apply fail effects and continue to next target
              val result = applyFailEffects(bCreatures, sfCtx, ADRResolvingAoE(updatedAoe))
              all {
                bCreatures' = result.creatures,
                bPhase' = result.phase,
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
      bTurnStarted,
      not(ac.creature.dead),
      not(isIncapacitated(ac.creature)),
      ac.turn.movementRemaining > 0,
      threatened.size() > 0,
      // Spend some movement (simplified: 5ft per move action)
      val newTurn = pUseMovement(ac.turn, 5, 1)
      val cs1 = setTurn(bCreatures, activeId, newTurn)
      // If disengaged, no OA triggers
      if (ac.turn.disengaged) {
        all { bCreatures' = cs1, bPhase' = BPActiveTurn, keepBattle }
      } else {
        // Filter threatened to those with reaction + alive (visibility is a spatial concern, not modeled)
        val oaEligible = threatened.filter(id =>
          hasReaction(cs1, id)
          and not(cs1.get(id).creature.dead)
          and not(isIncapacitated(cs1.get(id).creature))
          and not(blocksOpportunityAttacks(cs1.get(id).creature.activeEffects))
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
    nondet oaAtkRoll = 1.to(20).oneOf()
    nondet oaDmg = 1.to(12).oneOf()
    nondet oaDt = Set(Slashing, Piercing, Bludgeoning).oneOf()
    nondet oaCrit = Bool.oneOf()
    nondet oaTgtAc = 10.to(20).oneOf()
    nondet oaKnockOut = Bool.oneOf()
    nondet oaIsFinesse = Bool.oneOf()
    // OA spatial: always within 5ft, visibility nondeterministic
    nondet oaHostileWithin5ft = Bool.oneOf()
    nondet oaTargetCanSeeAttacker = Bool.oneOf()
    nondet oaAttackerCanSeeTarget = Bool.oneOf()
    nondet oaFrightSourceInLOS = Bool.oneOf()
    nondet oaHasAllyAdjacent = Bool.oneOf()
    match bPhase {
      | BPResolvingMovement(mv) =>
        val remaining = mv.threatenedBy.exclude(mv.processed)
        if (remaining.size() == 0) {
          all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
        } else {
        nondet reactorId = remaining.oneOf()
        val updatedMv = mv.with("processed", mv.processed.union(Set(reactorId)))
        val reactor = bCreatures.get(reactorId)
        nondet oaSaDmg = reactor.sneakAttackDice.to(reactor.sneakAttackDice * 6).oneOf()
        val cs1 = spendReaction(bCreatures, reactorId)
        // OA: always melee, always within 5ft
        val oaCtx = buildAttackContext(cs1, reactorId, mv.mover, true, true, oaHostileWithin5ft, oaTargetCanSeeAttacker, oaAttackerCanSeeTarget, oaFrightSourceInLOS)
        val oaMods = pAggregateAttackMods(oaCtx)
        val result = resolveAttack(cs1, reactorId, mv.mover, oaAtkRoll, oaTgtAc, oaDmg, oaDt, oaCrit, reactor.critRange, ADRResolvingMovement(updatedMv), oaKnockOut, true, oaTargetCanSeeAttacker, oaMods, oaIsFinesse, oaHasAllyAdjacent, oaSaDmg, NoAttackHitRider)
        all { bCreatures' = result.creatures, bPhase' = result.phase, keepBattle }
        }
      | _ => all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
    }
  }

  // --- End turn / Heal ---

  action bEndTurn = {
    val allIds = bCreatures.keys()
    val activeId = bInitiative[bTurnIndex]
    // Nondeterministic inputs for end-of-turn processing
    nondet eotSaveSucceeded = Bool.oneOf()
    nondet eotDmg = 0.to(10).oneOf()
    nondet eotDt = ALL_DAMAGE_TYPES.oneOf()
    nondet eotConSave = Bool.oneOf()
    all {
      bPhase == BPActiveTurn,
      val c = bCreatures.get(activeId)
      // 1. Build end-of-turn save/damage lists from active effects
      val hasEotEffects = c.creature.activeEffects.size() > 0
      val eotSaves: List[EndOfTurnSave] = if (hasEotEffects and eotSaveSucceeded) {
        val eotEffects = c.creature.activeEffects.filter(e => e.expiresAt == AtEndOfTurn)
        eotEffects.fold(List(), (acc, e) =>
          acc.append({ spellId: e.spellId, saveSucceeded: true, conditionsToRemove: Set() })
        )
      } else List()
      val eotDamages: List[EndOfTurnDamage] = if (hasEotEffects and eotDmg > 0) {
        [{ spellId: "", damage: eotDmg, damageType: eotDt, conSaveSucceeded: eotConSave,
           resistances: Set(), vulnerabilities: Set(), immunities: Set() }]
      } else List()
      // 2. Use pEndTurn orchestrator: saves → damage → clear expired AtEndOfTurn
      val r = pEndTurn(c.creature, c.slots, eotSaves, eotDamages)
      val cs1 = setCreature(bCreatures, activeId, r.creature).setSlots(activeId, r.slots)
      // 3. Propagate concentration break across all creatures
      val cs2 = normalizeBattleGrapples(propagateIfConcBroken(cs1, activeId, c.slots, r.slots))
      // 4. Check for LA window (R7: "at the end of another creature's turn")
      val laEligible = allIds.exclude(Set(activeId)).filter(id =>
        val mc = cs2.get(id)
        mc.kind == Monster and
        mc.monsterResources.legendaryActionsRemaining > 0 and
        not(mc.creature.dead) and
        mc.creature.incapacitatedSources.size() == 0
      )
      if (laEligible.size() > 0) {
        val laCtx: LAWindowCtx = { eligibleMonsters: laEligible, endingTurnIndex: bTurnIndex }
        all {
          bCreatures' = cs2,
          bPhase' = BPAwaitingLegendaryAction(laCtx),
          keepBattle,
        }
      } else {
        // No LA — check for readied action window
        val readyElig = readyEligible(cs2)
        if (readyElig.size() > 0) {
          val readyCtx: ReadyWindowCtx = { eligibleCreatures: readyElig, endingTurnIndex: bTurnIndex }
          all {
            bCreatures' = cs2,
            bPhase' = BPAwaitingReadiedAction(readyCtx),
            keepBattle,
          }
        } else {
          val nt = nextTurn(bTurnIndex, bInitiative.length(), bRound)
          all {
            bCreatures' = cs2, bInitiative' = bInitiative,
            bTurnIndex' = nt.idx, bRound' = nt.round,
            bPhase' = BPActiveTurn, bSpellStack' = bSpellStack,
            bTurnStarted' = false,
          }
        }
      }
    }
  }

  /// LA window: monster passes — advance to next turn.
  action bLegendaryPass = {
    match bPhase {
      | BPAwaitingLegendaryAction(_) =>
        // After LA window, check for readied action window
        val readyElig = readyEligible(bCreatures)
        if (readyElig.size() > 0) {
          val readyCtx: ReadyWindowCtx = { eligibleCreatures: readyElig, endingTurnIndex: bTurnIndex }
          all {
            bCreatures' = bCreatures,
            bPhase' = BPAwaitingReadiedAction(readyCtx),
            keepBattle,
          }
        } else {
          val nt = nextTurn(bTurnIndex, bInitiative.length(), bRound)
          all {
            bCreatures' = bCreatures, bInitiative' = bInitiative,
            bTurnIndex' = nt.idx, bRound' = nt.round,
            bPhase' = BPActiveTurn, bSpellStack' = bSpellStack,
            bTurnStarted' = false,
          }
        }
      | _ => all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
    }
  }

  /// Ready window: all eligible pass — advance to next turn.
  action bReadyPass = {
    match bPhase {
      | BPAwaitingReadiedAction(_) =>
        val nt = nextTurn(bTurnIndex, bInitiative.length(), bRound)
        all {
          bCreatures' = bCreatures, bInitiative' = bInitiative,
          bTurnIndex' = nt.idx, bRound' = nt.round,
          bPhase' = BPActiveTurn, bSpellStack' = bSpellStack,
          bTurnStarted' = false,
        }
      | _ => all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
    }
  }

  /// Ready window: creature releases readied attack (non-spell).
  /// Spends reaction, clears readiedAction, enters shared attack resolution.
  action bReadyRelease = {
    match bPhase {
      | BPAwaitingReadiedAction(readyCtx) =>
        nondet releaserId = readyCtx.eligibleCreatures.oneOf()
        val allIds = bCreatures.keys()
        nondet targetId = allIds.exclude(Set(releaserId)).oneOf()
        nondet atkRoll = 1.to(20).oneOf()
        nondet dmg = 1.to(12).oneOf()
        nondet dt = Set(Slashing, Piercing, Bludgeoning).oneOf()
        nondet crit = Bool.oneOf()
        nondet tgtAc = 10.to(20).oneOf()
        nondet readyKnockOut = Bool.oneOf()
        nondet readyIsMelee = Bool.oneOf()
        nondet readyIsFinesse = Bool.oneOf()
        nondet readyAtkWithin5ft = Bool.oneOf()
        nondet readyHostileWithin5ft = Bool.oneOf()
        nondet readyTgtCanSee = Bool.oneOf()
        nondet readyAtkCanSee = Bool.oneOf()
        nondet readyFrightLOS = Bool.oneOf()
        nondet readyHasAllyAdjacent = Bool.oneOf()
        val releaser = bCreatures.get(releaserId)
        nondet readySaDmg = releaser.sneakAttackDice.to(releaser.sneakAttackDice * 6).oneOf()
        all {
          not(hasReadiedSpell(releaser)),  // attack release only for non-spell readied actions
          val updatedTurn = releaser.turn.with("reactionAvailable", false).with("readiedAction", false)
          val cs1 = bCreatures.set(releaserId, releaser.with("turn", updatedTurn))
          val readyReturn = ADRAwaitingReadiedAction(readyCtx)
          val readyAtkCtx = buildAttackContext(cs1, releaserId, targetId, readyIsMelee, readyAtkWithin5ft, readyHostileWithin5ft, readyTgtCanSee, readyAtkCanSee, readyFrightLOS)
          val readyMods = pAggregateAttackMods(readyAtkCtx)
          val result = resolveAttack(cs1, releaserId, targetId, atkRoll, tgtAc, dmg, dt, crit, releaser.critRange, readyReturn, readyKnockOut, readyIsMelee, readyTgtCanSee, readyMods, readyIsFinesse, readyHasAllyAdjacent, readySaDmg, NoAttackHitRider)
          all { bCreatures' = result.creatures, bPhase' = result.phase, keepBattle }
        }
      | _ => all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
    }
  }

  /// Ready window: creature releases readied spell.
  /// SRD 5.2.1: spell was cast at ready time (slot spent, concentration started).
  /// Release enters Counterspell window, then resolves as save spell.
  /// Concentration ends after release (spell energy discharged).
  action bReadySpellRelease = {
    match bPhase {
      | BPAwaitingReadiedAction(readyCtx) =>
        nondet releaserId = readyCtx.eligibleCreatures.oneOf()
        nondet saveRoll = 1.to(20).oneOf()
        val releaser = bCreatures.get(releaserId)
        all {
          hasReadiedSpell(releaser),  // spell release only
          val rsp = releaser.readiedSpellParams
          // Spend reaction, clear readiedAction and readiedSpellParams
          val updatedTurn = releaser.turn.with("reactionAvailable", false).with("readiedAction", false)
          val cs1 = bCreatures.set(releaserId,
            releaser.with("turn", updatedTurn).with("readiedSpellParams", NO_READIED_SPELL))
          // Break concentration (spell energy is being released)
          val cs2 = breakConcentrationAndPropagate(cs1, releaserId)
          val readyReturn = ADRAwaitingReadiedAction(readyCtx)
          val saveCtx: SaveSpellCtx = {
            caster: rsp.caster, target: rsp.target,
            saveDC: rsp.saveDC, saveRoll: saveRoll,
            damageOnFail: rsp.damageOnFail, halfOnSuccess: rsp.halfOnSuccess,
            damageType: rsp.damageType,
            conditionOnFail: rsp.conditionOnFail, applyCondition: rsp.applyCondition,
            saveAbility: rsp.saveAbility,
          }
          val spellCtx: SpellCastCtx = {
            caster: rsp.caster,
            spellName: rsp.spellName,
            postCast: PCESave(saveCtx),
            slotLvl: 0,   // slot already spent at ready time — no refund on counterspell
            ritual: false, // readied spells cannot be rituals
          }
          // Counterspell window for the released spell
          val csElig = eligibleForCounterspell(cs2, releaserId)
          if (csElig.size() > 0) {
            all {
              bCreatures' = cs2,
              bPhase' = BPAwaitingReaction(mkAwait(PISpellCast(spellCtx), TSpellBeingCast, csElig)),
              keepBattle,
            }
          } else {
            // No Counterspell — resolve save immediately
            val result = resolveSave(cs2, saveCtx, readyReturn)
            all { bCreatures' = result.creatures, bPhase' = result.phase, keepBattle }
          }
        }
      | _ => all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
    }
  }

  /// LA window: monster uses a legendary attack action.
  /// Enters the full hit-reaction → damage-reaction → after-damage chain via resolveAttack.
  /// After chain resolves, returns to BPAwaitingLegendaryAction for remaining LA.
  action bLegendaryAttack = {
    val allIds = bCreatures.keys()
    match bPhase {
      | BPAwaitingLegendaryAction(laCtx) =>
        nondet monsterId = laCtx.eligibleMonsters.oneOf()
        nondet laTarget = allIds.exclude(Set(monsterId)).oneOf()
        nondet laAtkRoll = 1.to(20).oneOf()
        nondet laDmg = 1.to(20).oneOf()
        nondet laDt = Set(Slashing, Piercing, Bludgeoning).oneOf()
        nondet laCrit = Bool.oneOf()
        nondet laTgtAc = 10.to(20).oneOf()
        nondet laKnockOut = Bool.oneOf()
        nondet laIsMelee = Bool.oneOf()
        nondet laIsFinesse = Bool.oneOf()
        nondet laAtkWithin5ft = Bool.oneOf()
        nondet laHostileWithin5ft = Bool.oneOf()
        nondet laTgtCanSee = Bool.oneOf()
        nondet laAtkCanSee = Bool.oneOf()
        nondet laFrightLOS = Bool.oneOf()
        nondet laHasAllyAdjacent = Bool.oneOf()
        val m = bCreatures.get(monsterId)
        nondet laSaDmg = m.sneakAttackDice.to(m.sneakAttackDice * 6).oneOf()
        val newMR = m.monsterResources.with("legendaryActionsRemaining",
          m.monsterResources.legendaryActionsRemaining - 1)
        val cs1 = bCreatures.set(monsterId, m.with("monsterResources", newMR))
        val laReturn = ADRAwaitingLegendaryAction(laCtx)
        val laAtkCtx = buildAttackContext(cs1, monsterId, laTarget, laIsMelee, laAtkWithin5ft, laHostileWithin5ft, laTgtCanSee, laAtkCanSee, laFrightLOS)
        val laMods = pAggregateAttackMods(laAtkCtx)
        val result = resolveAttack(cs1, monsterId, laTarget, laAtkRoll, laTgtAc, laDmg, laDt, laCrit, m.critRange, laReturn, laKnockOut, laIsMelee, laTgtCanSee, laMods, laIsFinesse, laHasAllyAdjacent, laSaDmg, NoAttackHitRider)
        all { bCreatures' = result.creatures, bPhase' = result.phase, keepBattle }
      | _ => all { bCreatures' = bCreatures, bPhase' = bPhase, keepBattle }
    }
  }

  action bDash = {
    val activeId = bInitiative[bTurnIndex]
    val ac = bCreatures.get(activeId)
    all {
      bPhase == BPActiveTurn,
      bTurnStarted,
      ac.turn.actionsRemaining > 0,
      not(ac.creature.dead),
      not(isIncapacitated(ac.creature)),
      val newTurn = pUseAction(ac.turn, ac.creature, ADash)
      all {
        bCreatures' = setTurn(bCreatures, activeId, newTurn),
        bPhase' = BPActiveTurn,
        keepBattle,
      }
    }
  }

  action bDisengage = {
    val activeId = bInitiative[bTurnIndex]
    val ac = bCreatures.get(activeId)
    all {
      bPhase == BPActiveTurn,
      bTurnStarted,
      ac.turn.actionsRemaining > 0,
      not(ac.creature.dead),
      not(isIncapacitated(ac.creature)),
      val newTurn = pUseAction(ac.turn, ac.creature, ADisengage)
      all {
        bCreatures' = setTurn(bCreatures, activeId, newTurn),
        bPhase' = BPActiveTurn,
        keepBattle,
      }
    }
  }

  action bDodge = {
    val activeId = bInitiative[bTurnIndex]
    val ac = bCreatures.get(activeId)
    all {
      bPhase == BPActiveTurn,
      bTurnStarted,
      ac.turn.actionsRemaining > 0,
      not(ac.creature.dead),
      not(isIncapacitated(ac.creature)),
      val newTurn = pUseAction(ac.turn, ac.creature, ADodge)
      all {
        bCreatures' = setTurn(bCreatures, activeId, newTurn),
        bPhase' = BPActiveTurn,
        keepBattle,
      }
    }
  }

  action bGrapple = {
    val activeId = bInitiative[bTurnIndex]
    val allIds = bCreatures.keys()
    val ac = bCreatures.get(activeId)
    nondet targetId = allIds.exclude(Set(activeId)).oneOf()
    nondet attackerSize = Set(Tiny, Small, Medium, Large, Huge, Gargantuan).oneOf()
    nondet targetSize = Set(Tiny, Small, Medium, Large, Huge, Gargantuan).oneOf()
    nondet targetSaveFailed = Bool.oneOf()
    nondet attackerHasFreeHand = Bool.oneOf()
    val tc = bCreatures.get(targetId)
    all {
      bPhase == BPActiveTurn,
      bTurnStarted,
      ac.turn.actionsRemaining > 0 or ac.turn.extraAttacksRemaining > 0,
      not(ac.creature.dead),
      not(isIncapacitated(ac.creature)),
      not(tc.creature.dead),
      ac.grapplingTarget == "",
      tc.grappledBy == "",
      val newTurn = if (ac.turn.attackActionUsed and ac.turn.extraAttacksRemaining > 0)
        ac.turn.with("extraAttacksRemaining", ac.turn.extraAttacksRemaining - 1)
      else
        pUseAction(ac.turn, ac.creature, AAttack)
      val cs1 = setTurn(bCreatures, activeId, newTurn)
      val success = pGrapple(attackerSize, targetSize, tc.creature, targetSaveFailed, attackerHasFreeHand).success
      val cs2 = if (success)
        linkBattleGrapple(cs1, activeId, targetId, pTwoSizesSmaller(attackerSize, targetSize), activeId)
      else cs1
      all {
        bCreatures' = cs2,
        bPhase' = BPActiveTurn,
        keepBattle,
      }
    }
  }

  action bReleaseGrapple = {
    val activeId = bInitiative[bTurnIndex]
    all {
      bPhase == BPActiveTurn,
      bTurnStarted,
      bCreatures.get(activeId).grapplingTarget != "",
      all {
        bCreatures' = releaseBattleGrappleByGrappler(bCreatures, activeId, activeId),
        bPhase' = BPActiveTurn,
        keepBattle,
      }
    }
  }

  action bEscapeGrapple = {
    val activeId = bInitiative[bTurnIndex]
    val ac = bCreatures.get(activeId)
    nondet escapeSucceeded = Bool.oneOf()
    all {
      bPhase == BPActiveTurn,
      bTurnStarted,
      ac.turn.actionsRemaining > 0,
      not(ac.creature.dead),
      not(isIncapacitated(ac.creature)),
      ac.grappledBy != "",
      val newTurn = pUseAction(ac.turn, ac.creature, AUtilize)
      val cs1 = setTurn(bCreatures, activeId, newTurn)
      val cs2 = if (escapeSucceeded) escapeBattleGrapple(cs1, activeId, activeId) else cs1
      all {
        bCreatures' = cs2,
        bPhase' = BPActiveTurn,
        keepBattle,
      }
    }
  }

  /// Ready action: spend action, prepare to react later.
  /// SRD 5.2.1: "you take the Ready action ... you prepare to act later in the round using your Reaction"
  action bReady = {
    val activeId = bInitiative[bTurnIndex]
    val ac = bCreatures.get(activeId)
    all {
      bPhase == BPActiveTurn,
      bTurnStarted,
      ac.turn.actionsRemaining > 0,
      not(ac.creature.dead),
      not(isIncapacitated(ac.creature)),
      val newTurn = pUseAction(ac.turn, ac.creature, AReady)
      all {
        bCreatures' = setTurn(bCreatures, activeId, newTurn),
        bPhase' = BPActiveTurn,
        keepBattle,
      }
    }
  }

  /// Ready a spell: spend action + slot, start Concentration, store spell params.
  /// SRD 5.2.1 Ready: "you cast it as normal (expending any resources used to cast it)
  /// but hold its energy, which you release with your Reaction when the trigger occurs.
  /// To be readied, a spell must have a casting time of an action, and holding on to
  /// the spell's magic requires Concentration."
  action bReadySpell = {
    val activeId = bInitiative[bTurnIndex]
    val allIds = bCreatures.keys()
    val ac = bCreatures.get(activeId)
    nondet targetId = allIds.exclude(Set(activeId)).oneOf()
    // Spell params are pass-through storage (resolved at release, not here).
    // Domain-correct ranges matching bCastSaveSpell, narrowed where the value
    // doesn't affect guard or resolution logic to keep evaluator perf manageable
    // (Finding 14: each nondet costs a snapshot/restore even when guards fail).
    nondet saveDC = 10.to(18).oneOf()
    nondet dmgOnFail = 0.to(20).oneOf()
    nondet halfOnSave = Bool.oneOf()
    nondet dt = ALL_DAMAGE_TYPES.oneOf()
    nondet cond = Set(CBlinded, CCharmed, CFrightened, CParalyzed, CStunned).oneOf()
    nondet applyCond = Bool.oneOf()
    // Only Dex and Con matter for behavior (Evasion checks == Dex); others are identical.
    nondet saveAb = Set(Dex, Con).oneOf()
    nondet slotLvl = 1.to(9).oneOf()
    nondet spellName = ac.preparedSpells.oneOf()
    val tc = bCreatures.get(targetId)
    all {
      bPhase == BPActiveTurn,
      bTurnStarted,
      ac.turn.actionsRemaining > 0,
      not(ac.creature.dead),
      not(isIncapacitated(ac.creature)),
      not(tc.creature.dead),
      not(ac.turn.actionSurgeActionPending),  // Action Surge cannot be used for spell-readying
      not(ac.ragingBlocksSpells),
      not(ac.turn.slotExpendedThisTurn),  // readied spells cost a slot
      ac.preparedSpells.size() > 0,
      ac.slots.slotsCurrent.get(slotLvl) > 0,
      val newTurn = pUseAction(ac.turn, ac.creature, AReady)
      // Spend slot immediately (SRD 5.2.1: "expending any resources")
      val cs1 = setTurn(bCreatures, activeId, newTurn)
      val cs2 = expendSlot(cs1, activeId, slotLvl)
      // Break existing concentration if any, then start new concentration for the readied spell
      val cs3 = if (ac.slots.concentrationSpellId != "")
        breakConcentrationAndPropagate(cs2, activeId)
      else cs2
      val concSlots = pStartConcentration(cs3.get(activeId).slots, spellName)
      val cs4 = setSlots(cs3, activeId, concSlots)
      // Store readied spell params
      val rsp: ReadiedSpellParams = {
        caster: activeId, target: targetId,
        saveDC: saveDC, damageOnFail: dmgOnFail,
        halfOnSuccess: halfOnSave, damageType: dt,
        conditionOnFail: cond, applyCondition: applyCond,
        saveAbility: saveAb, spellName: spellName,
        slotLvl: slotLvl,
      }
      val cs5 = cs4.set(activeId, cs4.get(activeId).with("readiedSpellParams", rsp))
      all {
        bCreatures' = cs5,
        bPhase' = BPActiveTurn,
        keepBattle,
      }
    }
  }

  /// Action Surge: spend charge, gain extra action. SRD 5.2.1 Fighter feature.
  action bActionSurge = {
    val activeId = bInitiative[bTurnIndex]
    val ac = bCreatures.get(activeId)
    all {
      bPhase == BPActiveTurn,
      bTurnStarted,
      canUseActionSurge(ac.fighterState, ac.creature),
      val result = pUseActionSurge(ac.turn, ac.fighterState)
      val updatedC = ac.with("turn", result.turn).with("fighterState", result.fighter)
      all {
        bCreatures' = bCreatures.set(activeId, updatedC),
        bPhase' = BPActiveTurn,
        keepBattle,
      }
    }
  }

  /// Enter Rage: costs bonus action, sets meleeDamageBonus and ragingBlocksSpells.
  /// SRD 5.2.1 Barbarian: "you gain Rage Damage bonus to melee attacks,
  /// and you can't cast or concentrate on Spells."
  action bEnterRage = {
    val activeId = bInitiative[bTurnIndex]
    val ac = bCreatures.get(activeId)
    all {
      bPhase == BPActiveTurn,
      bTurnStarted,
      not(ac.creature.dead),
      not(isIncapacitated(ac.creature)),
      not(ac.turn.bonusActionUsed),
      not(ac.ragingBlocksSpells),  // can't rage while already raging
      ac.barbarianLevel > 0,       // must be a barbarian
      val rageBonus = rageDamageBonus(ac.barbarianLevel)
      val newTurn = pUseBonusAction(ac.turn, ac.creature)
      val updatedC = ac.with("turn", newTurn)
                       .with("meleeDamageBonus", rageBonus)
                       .with("ragingBlocksSpells", true)
                       .with("combatantResistances", Set(Bludgeoning, Piercing, Slashing))
      all {
        bCreatures' = bCreatures.set(activeId, updatedC),
        bPhase' = BPActiveTurn,
        keepBattle,
      }
    }
  }

  /// Declare Reckless Attack: grants advantage on melee attacks this turn,
  /// but attackers have advantage against you until your next turn.
  /// SRD 5.2.1: "When you make your first attack on your turn..."
  action bDeclareReckless = {
    val activeId = bInitiative[bTurnIndex]
    val ac = bCreatures.get(activeId)
    all {
      bPhase == BPActiveTurn,
      bTurnStarted,
      not(ac.creature.dead),
      not(isIncapacitated(ac.creature)),
      not(ac.recklessThisTurn),  // can only declare once per turn
      val updatedC = ac.with("recklessThisTurn", true)
      all {
        bCreatures' = bCreatures.set(activeId, updatedC),
        bPhase' = BPActiveTurn,
        keepBattle,
      }
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
      bTurnStarted,
      ac.turn.actionsRemaining > 0,
      not(ac.creature.dead),
      not(isIncapacitated(ac.creature)),
      not(tc.creature.dead),
      not(ac.turn.actionSurgeActionPending),  // Action Surge cannot be Magic
      not(ac.ragingBlocksSpells),             // Rage blocks spell casting
      val newTurn = pUseAction(ac.turn, ac.creature, AMagic)
      val healed = pHeal(tc.creature, amount)
      all {
        bCreatures' = setTurn(bCreatures, activeId, newTurn).setCreature(targetId, healed),
        bPhase' = BPActiveTurn,
        keepBattle,
      }
    }
  }

  /// Cast a save spell using bonus action (e.g., Spiritual Weapon attack, Healing Word).
  /// Same as bCastSaveSpell but uses bonus action instead of action.
  /// SRD 5.2.1: bonus action spells still cost a slot and are subject to one-slot-per-turn.
  action bCastBonusActionSpell = {
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
    // Only Dex and Con matter for behavior (Evasion checks == Dex); others are identical.
    // Full 6-way set would multiply state space 3x for no coverage gain.
    nondet saveAb = Set(Dex, Con).oneOf()
    nondet slotLvl = 1.to(9).oneOf()
    nondet spellName = ac.preparedSpells.oneOf()
    val tc = bCreatures.get(targetId)
    all {
      bPhase == BPActiveTurn,
      bTurnStarted,
      not(ac.creature.dead),
      not(isIncapacitated(ac.creature)),
      not(tc.creature.dead),
      not(ac.turn.bonusActionUsed),
      not(ac.ragingBlocksSpells),             // Rage blocks spell casting
      not(ac.turn.slotExpendedThisTurn),        // SRD 5.2.1 one slot per turn
      ac.preparedSpells.size() > 0,
      ac.slots.slotsCurrent.get(slotLvl) > 0,   // BA spells cannot be rituals
      val newTurn = pUseBonusAction(ac.turn, ac.creature)
                      .with("bonusActionSpellCast", true)
      val cs1 = setTurn(bCreatures, activeId, newTurn)
      // Spend-then-refund (see bCastSaveSpell comment for rationale). No ritual for BA spells.
      val cs2 = expendSlot(cs1, activeId, slotLvl)
      val saveCtx: SaveSpellCtx = {
        caster: activeId, target: targetId,
        saveDC: saveDC, saveRoll: saveRoll,
        damageOnFail: dmgOnFail, halfOnSuccess: halfOnSave,
        damageType: dt,
        conditionOnFail: cond, applyCondition: applyCond,
        saveAbility: saveAb,
      }
      val spellCtx: SpellCastCtx = {
        caster: activeId,
        spellName: spellName,
        postCast: PCESave(saveCtx),
        slotLvl: slotLvl,
        ritual: false,
      }
      val csElig = eligibleForCounterspell(cs2, activeId)
      if (csElig.size() > 0) {
        all {
          bCreatures' = cs2,
          bPhase' = BPAwaitingReaction(mkAwait(PISpellCast(spellCtx), TSpellBeingCast, csElig)),
          keepBattle,
        }
      } else {
        // Slot already spent, resolve immediately
        val result = resolveSave(cs2, saveCtx, ADRActiveTurn)
        all { bCreatures' = result.creatures, bPhase' = result.phase, keepBattle }
      }
    }
  }

  // ============================================================
  // 5. STEP + INVARIANTS
  // ============================================================

  // NOTE: Every match arm must be wrapped in `any { action, }` (even single-action arms).
  // The Rust backend only reports leaf action names for `any` branches; bare actions
  // inside `match` are reported as the composite name ("battleStep"), causing the
  // MBT driver to dispatch a no-op instead of the leaf handler.
  //
  // Phase-split: bStartTurn is isolated when bTurnStarted==false to avoid 16 wasted
  // branch evaluations (Finding 13: branch count IS the dominant perf factor).
  // See QUINT_CONNECT_TROUBLESHOOT.md Finding 14.
  action battleStep = match bPhase {
    | BPActiveTurn => if (not(bTurnStarted)) any { bStartTurn, } else {
        // Capability-split: hoist cheap checks to eliminate branches that can't fire,
        // saving 41+ wasted nondets + snapshot/restore cycles per disabled spell action.
        // Caveat 1: innate/racial spellcasting (no prepared spells) is out of spec scope.
        // Caveat 2: Rage blocks spell casting but not all Magic actions (non-spell magic
        // items are out of spec scope). Both safe within current modeled domain.
        val turnAc = bCreatures.get(bInitiative[bTurnIndex])
        val canCastSpells = turnAc.preparedSpells.size() > 0 and not(turnAc.ragingBlocksSpells)
        if (canCastSpells) any {
          bAttack, bCastSaveSpell, bCastAoE,
          bCastConcentrationSpell, bCastBonusActionSpell, bConcentrationCheck,
          bMove, bHeal, bDash, bDisengage, bDodge, bGrapple, bReleaseGrapple, bEscapeGrapple, bActionSurge,
          bEnterRage, bDeclareReckless, bReady, bReadySpell, bEndTurn,
        } else any {
          bAttack, bConcentrationCheck, bMove, bHeal, bDash, bDisengage,
          bDodge, bGrapple, bReleaseGrapple, bEscapeGrapple, bActionSurge, bEnterRage, bDeclareReckless, bReady, bEndTurn,
        }
      }
    | BPAwaitingReaction(ctx) => match ctx.interrupt {
        | PIAttackHit(_) => any { bResolveHitReaction, }
        | PIAttackDamage(_) => any { bResolveDmgReaction, }
        | PIAfterDamage(_) => any {
            bAfterDamagePass, bAfterDamageSpellReaction, bAfterDamageRetaliation,
          }
        | PISpellCast(_) => any { bResolveCounterspell, }
        | _ => any { bResolveSaveFailedReaction, }
      }
    | BPResolvingAoE(_) => any { bResolveAoETarget, }
    | BPResolvingMovement(_) => any { bMovementOAPass, bMovementOAAttack }
    | BPAwaitingLegendaryAction(_) => any { bLegendaryPass, bLegendaryAttack }
    | BPAwaitingReadiedAction(_) => any { bReadyPass, bReadyRelease, bReadySpellRelease, }
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

  // Phase 3: Structural invariants

  /// Initiative list contains exactly the creature ids.
  val initiativeMatchesCreatures = listToSet(bInitiative) == bCreatures.keys()

  /// No duplicate entries in initiative order.
  val initiativeNoDuplicates = bInitiative.length() == listToSet(bInitiative).size()

  /// Dead creatures are not concentrating.
  val allDeadNotConcentrating = bCreatures.keys().forall(id =>
    val c = bCreatures.get(id)
    c.creature.dead implies c.slots.concentrationSpellId == ""
  )

  /// Readied spell implies readied action is true (SRD 5.2.1: Ready action required).
  val readiedSpellImpliesReadiedAction = bCreatures.keys().forall(id =>
    val c = bCreatures.get(id)
    hasReadiedSpell(c) implies c.turn.readiedAction
  )

  /// Readied spell implies concentrating (SRD 5.2.1: "holding on to the spell's
  /// magic requires Concentration").
  val readiedSpellImpliesConcentrating = bCreatures.keys().forall(id =>
    val c = bCreatures.get(id)
    hasReadiedSpell(c) implies c.slots.concentrationSpellId != ""
  )

  val grappleLinksConsistent = bCreatures.keys().forall(id =>
    val c = bCreatures.get(id)
    if (c.grapplingTarget == "") true
    else
      bCreatures.keys().contains(c.grapplingTarget) and
      bCreatures.get(c.grapplingTarget).grappledBy == id and
      bCreatures.get(c.grapplingTarget).creature.grappled
  ) and bCreatures.keys().forall(id =>
    val c = bCreatures.get(id)
    if (c.grappledBy == "") true
    else
      bCreatures.keys().contains(c.grappledBy) and
      bCreatures.get(c.grappledBy).grapplingTarget == id and
      c.creature.grappled
  )

  /// If awaiting reaction, un-offered eligible reactors have their reaction available.
  /// Reactors already in `offered` may have spent their reaction (e.g., missed retaliation).
  val reactorHasReaction = match bPhase {
    | BPAwaitingReaction(ctx) =>
      ctx.eligible.exclude(ctx.offered).forall(id => hasReaction(bCreatures, id))
    | _ => true
  }

  /// Non-ritual spell stack entries have distinct casters.
  /// Enforced by eligibleForCounterspell's slotExpendedThisTurn guard (SRD 5.2.1).
  /// Ritual casters are excluded: rituals don't expend a slot, so the caster
  /// can still Counterspell (1 slot expenditure total) on the same turn.
  val spellStackDistinctCasters =
    val nonRitual = listToSet(bSpellStack).filter(e => not(e.ritual))
    nonRitual.forall(e1 =>
      nonRitual.forall(e2 =>
        (e1.spellCasterId == e2.spellCasterId) implies (e1 == e2)
      )
    )

  /// Legendary action window does not include the creature whose turn just ended.
  val legendaryActionNotOnOwnTurn = match bPhase {
    | BPAwaitingLegendaryAction(ctx) =>
      val activeId = bInitiative[bTurnIndex]
      ctx.eligibleMonsters.forall(mid => mid != activeId)
    | _ => true
  }

  // Phase 4: Cross-creature invariants

  /// Concentration implies either an active effect exists OR the caster is holding
  /// a readied spell (SRD 5.2.1: "holding the spell's magic requires Concentration"
  /// — the effect doesn't exist yet because the spell hasn't resolved).
  /// Phase-scoped: only checked when spell stack is empty (CS chain resolved)
  /// to avoid transient out-of-sync states during Counterspell resolution.
  val concentrationImpliesEffect =
    (bSpellStack.length() > 0) or bCreatures.keys().forall(casterId =>
      val caster = bCreatures.get(casterId)
      (caster.slots.concentrationSpellId != "") implies (
        // Case 1: readied spell held with Concentration (no effect yet)
        hasReadiedSpell(caster) or
        // Case 2: resolved spell — effect exists on some creature
        bCreatures.keys().exists(targetId =>
          bCreatures.get(targetId).creature.activeEffects.exists(e =>
            e.spellId == caster.slots.concentrationSpellId and e.casterId == casterId
          )
        )
      )
    )

  /// Every concentration effect has a living, concentrating caster.
  /// Phase-scoped: only checked when spell stack is empty (CS chain resolved).
  /// Root cause of transient violations: during CS chain resolution,
  /// breakConcentrationAndPropagate removes the caster's concentrationSpellId
  /// before removing effects from all targets. Between these two operations,
  /// effects reference a caster that is no longer concentrating. This is a
  /// transient state within the CS resolution step, not a spec bug.
  val concentrationEffectHasLivingCaster =
    (bSpellStack.length() > 0) or bCreatures.keys().forall(targetId =>
      bCreatures.get(targetId).creature.activeEffects.forall(e =>
        (e.spellId == SHOCKING_GRASP_SPELL_ID or e.spellId == RAY_OF_FROST_SPELL_ID)
        or bCreatures.keys().exists(casterId =>
          val caster = bCreatures.get(casterId)
          e.casterId == casterId
          and not(caster.creature.dead)
          and caster.slots.concentrationSpellId == e.spellId
        )
      )
    )

  /// Active effects have unique spellIds per creature (battle-level lift).
  val allActiveEffectsUnique = bCreatures.keys().forall(id =>
    val ae = bCreatures.get(id).creature.activeEffects
    ae.forall(e1 => ae.forall(e2 =>
      (e1.spellId == e2.spellId) implies (e1 == e2)
    ))
  )

  /// Reaction window has at least one eligible reactor.
  /// NOT included in allBattleInvariants: Counterspell chains intentionally
  /// enter BPAwaitingReaction with eligible=Set() when no reactors remain —
  /// the empty window resolves on the next step. This is a transient but
  /// observable state, not a bug.
  val reactionWindowHasEligible = match bPhase {
    | BPAwaitingReaction(ctx) => ctx.eligible.size() > 0
    | _ => true
  }

  // Phase 5: Aggregate

  val allBattleInvariants = and {
    roundPositive,
    turnIndexValid,
    allHpBounded,
    allDeadImpliesHp0,
    initiativeMatchesCreatures,
    initiativeNoDuplicates,
    allDeadNotConcentrating,
    grappleLinksConsistent,
    reactorHasReaction,
    legendaryActionNotOnOwnTurn,
    allActiveEffectsUnique,
    spellStackDistinctCasters,
    concentrationImpliesEffect,
    concentrationEffectHasLivingCaster,
    // Excluded: reactionWindowHasEligible (transient empty-eligible is by design in CS chains)
  }

  // Note: offered ⊄ eligible is expected — reactors who spend their reaction
  // are removed from eligible but remain in offered. No useful state invariant
  // on offered/eligible beyond what the loop structure already guarantees.
}
