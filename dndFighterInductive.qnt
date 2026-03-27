// -*- mode: Bluespec; -*-

/// Inductive invariant verification for fighter charge mechanics.
/// Run with Apalache:
///   export PATH="$HOME/.local/java/jdk-17.0.18+8-jre/bin:$PATH"
///   npx quint verify --main=dndFighterInductive \
///     --invariant=allInvariants \
///     --inductive-invariant=inductiveInv \
///     dndFighterInductive.qnt

module dndFighterInductive {
  import dnd.* from "./dnd"

  // ============================================================
  // Valid state enumeration for Apalache
  // ============================================================
  // Apalache's inductive check starts from an *arbitrary* state
  // satisfying the invariant (not from init). Record-typed vars
  // must use `.in(Set)` so the solver knows their shape.

  /// All structurally valid FighterState records.
  /// Uses nested map().flatten() because Quint has no flatMap or cross.
  pure val VALID_FIGHTER_STATES: Set[FighterState] =
    0.to(4).map(swC =>
      0.to(4).map(swM =>
        0.to(2).map(asC =>
          0.to(2).map(asM =>
            0.to(3).map(indC =>
              0.to(3).map(indM =>
                Set(true, false).map(asUsed =>
                  {
                    secondWindCharges: swC, secondWindMax: swM,
                    actionSurgeCharges: asC, actionSurgeMax: asM,
                    actionSurgeUsedThisTurn: asUsed,
                    indomitableCharges: indC, indomitableMax: indM,
                  }
                )
              ).flatten()
            ).flatten()
          ).flatten()
        ).flatten()
      ).flatten()
    ).flatten()
    .filter(fs =>
      fs.secondWindCharges <= fs.secondWindMax
      and fs.actionSurgeCharges <= fs.actionSurgeMax
      and fs.indomitableCharges <= fs.indomitableMax
    )

  // ============================================================
  // Inductive invariant
  // ============================================================
  // Must be strong enough that: Inv /\ Step => Inv'
  // Each constraint was added because Apalache found a
  // counterexample without it.

  val inductiveInv = and {
    // Fighter state must be a structurally valid record
    fighterState.in(VALID_FIGHTER_STATES),

    // Level-to-max charge relationships (established by init, preserved by step).
    // Without these, the solver finds states like level=1 + actionSurgeMax=2
    // which can't arise from init but satisfy the structural bounds.
    fighterState.secondWindMax == secondWindMaxCharges(TEST_CONFIG.level),
    fighterState.actionSurgeMax == actionSurgeMaxCharges(TEST_CONFIG.level),
    fighterState.indomitableMax == indomitableMaxCharges(TEST_CONFIG.level),

    // Action economy coupling: actionsRemaining starts at 1 (from pStartTurn),
    // Action Surge adds 1 (once per turn). So max is 2.
    // If Action Surge hasn't been used this turn, actionsRemaining <= 1.
    turnState.actionsRemaining >= 0,
    turnState.actionsRemaining <= 2,
    not(fighterState.actionSurgeUsedThisTurn) implies turnState.actionsRemaining <= 1,

    // Core state bounds (needed so the solver doesn't start from
    // impossible core states that would break fighter transitions)
    state.hp >= 0,
    state.hp <= state.maxHp,
    state.maxHp >= 1,
    state.tempHp >= 0,
    state.exhaustion >= 0,
    state.exhaustion <= 6,
    state.deathSaves.successes >= 0,
    state.deathSaves.successes <= 3,
    state.deathSaves.failures >= 0,
    state.deathSaves.failures <= 3,
    state.hitPointDiceRemaining >= 0,

    // Turn state bounds
    turnState.movementRemaining >= 0,
    turnState.effectiveSpeed >= 0,
    turnState.extraAttacksRemaining >= 0,

    // Spell slot bounds
    spellSlots.pactSlotsCurrent >= 0,
    spellSlots.pactSlotsCurrent <= spellSlots.pactSlotsMax,

    // Turn phase valid
    turnPhase.in(Set("outOfCombat", "acting", "waitingForTurn")),
  }
}
