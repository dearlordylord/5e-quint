# PLAN Appendix: Combat Mode, Turn Lifecycle, and Active Effect Framework

Extends the main PLAN.md with combat/non-combat separation, END_TURN event, active effect lifecycle, and modular spell architecture. All changes require Quint spec updates first (parity rule).

---

## 1. Combat Mode Separation

### Rules basis

The structured round/turn/action economy system is explicitly combat-only (PHB Ch. 9: "The game organizes the chaos of combat into a cycle of rounds and turns"). Outside combat, the GM uses minute/hour/day time scales with no action economy. Resting requires non-combat context: short rest = "nothing more strenuous than eating, drinking, reading" (1+ hour); long rest is interrupted by "fighting" (PHB Ch. 8).

### Current state

`turnPhaseConfig` has `outOfCombat` / `acting` / `surprised`, but all action economy events (`USE_ACTION`, `USE_MOVEMENT`, etc.) and rest events (`SHORT_REST`, `LONG_REST`) are in `rootEventHandlers` — accepted in every state unconditionally.

### Required changes

Introduce a top-level combat/non-combat gate. Two approaches (implementer decides idiomatic Quint structure):

**Approach A: Parent state machine**
```
outOfCombat
  accepts: SHORT_REST, LONG_REST, SPEND_HIT_DIE, ENTER_COMBAT
inCombat
  waitingForTurn
    accepts: START_TURN → acting
  acting
    accepts: USE_ACTION, USE_MOVEMENT, USE_BONUS_ACTION, USE_REACTION,
             USE_EXTRA_ATTACK, STAND_FROM_PRONE, DROP_PRONE,
             MARK_BONUS_ACTION_SPELL, MARK_NON_CANTRIP_ACTION_SPELL,
             END_TURN → waitingForTurn
  surprised
    accepts: END_SURPRISE_TURN → waitingForTurn
  EXIT_COMBAT → outOfCombat
```

**Approach B: Boolean flag `inCombat` with guards**
Action economy events guarded by `inCombat`. Rest events guarded by `not(inCombat)`.

### Events gated by combat

**Combat-only** (blocked when out of combat):
- USE_ACTION, USE_BONUS_ACTION, USE_REACTION, USE_MOVEMENT
- USE_EXTRA_ATTACK, STAND_FROM_PRONE, DROP_PRONE
- MARK_BONUS_ACTION_SPELL, MARK_NON_CANTRIP_ACTION_SPELL
- START_TURN, END_TURN

**Out-of-combat-only** (blocked during combat):
- SHORT_REST, LONG_REST

**Always available** (regardless of combat state):
- ADD_EXHAUSTION, REDUCE_EXHAUSTION
- GRAPPLE, RELEASE_GRAPPLE, ESCAPE_GRAPPLE, SHOVE
- EXPEND_SLOT, EXPEND_PACT_SLOT, SPEND_HIT_DIE
- APPLY_CONDITION, REMOVE_CONDITION
- Damage/healing events (TAKE_DAMAGE, HEAL, GRANT_TEMP_HP, etc.)
- APPLY_STARVATION, APPLY_DEHYDRATION

### UI impact

With `snapshot.can()` (XState built-in, same pattern as `/Users/firfi/work/typescript/savage`), buttons auto-disable when events are invalid in the current state. No custom helpers needed.

---

## 2. END_TURN Event

### Rules basis

D&D 5e has no explicit "end turn" action. Turns proceed through initiative order implicitly. However, "end of your turn" is a heavily used trigger point in the rules (repeated saves for Hold Person, Phantasmal Killer, etc.). At the table, players say "I end my turn." This is a modeling assumption (see ASSUMPTIONS.md update below).

### Design

`END_TURN` transitions `acting` → `waitingForTurn` (or `outOfCombat` if exiting combat simultaneously).

**Event arguments** (all pre-resolved, following existing pattern of deterministic rolls):

```
END_TURN: {
  // End-of-turn saves for active effects (e.g., Hold Person WIS save)
  endOfTurnSaves: Array<{ spellId: string, saveSucceeded: boolean }>
  // Ongoing damage from effects (e.g., Phantasmal Killer 4d10)
  endOfTurnDamage: Array<{ spellId: string, damage: number, damageType: DamageType }>
}
```

The spec processes each save (removing conditions on success) and applies damage. Active effect durations are NOT decremented here — that happens on START_TURN (see section 4).

### What END_TURN resets

Nothing. END_TURN is a transition marker + trigger processor. All resets happen on the next START_TURN.

---

## 3. START_TURN Refactoring

### Current state

`START_TURN` resets action economy and calculates speed. Accepted from `outOfCombat`, `acting`, and `surprised` — meaning it can be spammed repeatedly.

### Required changes

1. **Restrict availability**: `START_TURN` only valid from `waitingForTurn` (not from `acting` — requires END_TURN first).

2. **Extended event arguments** (in addition to existing `isSurprised`, `baseSpeed`, `callerSpeedModifier`, etc.):

```
START_TURN: {
  // existing
  isSurprised: boolean
  baseSpeed: number
  callerSpeedModifier: number
  isGrappling: boolean
  grappledTargetTwoSizesSmaller: boolean

  // new: start-of-turn triggers
  deathSaveRoll?: number           // d20 result, only if hp == 0
  startOfTurnEffects: Array<{
    spellId: string
    // Per-effect data, caller-provided:
    healAmount?: number            // e.g., Regenerate 1 HP
    tempHpAmount?: number          // e.g., Heroism = casting mod
    saveResult?: boolean           // e.g., Bestow Curse WIS save
    damageAmount?: number          // e.g., ongoing aura damage
  }>
}
```

3. **Duration decrement**: After processing start-of-turn effects, decrement `remainingTurns` for all active effects. Remove expired ones (remainingTurns reaches 0).

4. **Death save integration**: If `hp == 0` and creature is not stable, process `deathSaveRoll` as part of START_TURN. Currently death saves are separate events; integrating them into START_TURN matches the PHB trigger ("Whenever you start your turn with 0 hit points").

---

## 4. Active Effect Lifecycle (Option D3)

### Architecture

**Core Quint spec (`dnd.qnt`)** owns the lifecycle: add, remove, decrement, expiry. Knows nothing about what specific spells do.

**Spell-specific behavior** lives in TypeScript (XState machine / caller). Optionally, a future `dndSpellHelpers.qnt` module can provide validation/calculation helpers that are model-checked.

The core must expose enough primitives for ANY SRD spell to interact with the lifecycle.

### State addition to CreatureState

```quint
type ActiveEffect = {
  spellId: str,
  remainingTurns: int,   // decremented each START_TURN; 0 = expired
}

// In CreatureState:
activeEffects: Set[ActiveEffect]
```

### Core lifecycle functions (Quint)

```quint
/// Add an effect. Replaces existing effect with same spellId (no stacking same spell).
pure def pAddEffect(
  effects: Set[ActiveEffect], spellId: str, durationTurns: int
): Set[ActiveEffect]

/// Remove a specific effect by spellId (e.g., Dispel Magic, concentration break).
pure def pRemoveEffect(
  effects: Set[ActiveEffect], spellId: str
): Set[ActiveEffect]

/// Decrement all durations by 1. Called during START_TURN processing.
pure def pDecrementDurations(
  effects: Set[ActiveEffect]
): Set[ActiveEffect]

/// Return spellIds of effects that have expired (remainingTurns <= 0).
pure def pExpiredEffects(
  effects: Set[ActiveEffect]
): Set[str]

/// Remove all expired effects.
pure def pClearExpired(
  effects: Set[ActiveEffect]
): Set[ActiveEffect]

/// Check if a specific spell is active.
pure def pHasEffect(
  effects: Set[ActiveEffect], spellId: str
): bool
```

### Interaction with concentration

Concentration is already tracked via `concentrationSpellId: str` in `SpellSlotState`. When concentration breaks:
1. `pBreakConcentration` clears `concentrationSpellId` (existing)
2. Also call `pRemoveEffect` with the concentrated spell's ID (new)

When a new concentration spell is cast:
1. Break existing concentration (existing)
2. Remove old effect, add new effect (new)

### Interaction with conditions

Active effects and conditions are separate systems. An effect like Hold Person:
- `pAddEffect("hold_person", 10)` — tracks duration
- `pApplyCondition(creature, CParalyzed)` — applies mechanical effect
- On successful end-of-turn save: `pRemoveEffect("hold_person")` + `pRemoveCondition(creature, CParalyzed)`

The caller coordinates these — core provides the primitives.

### What the caller (TS/XState) manages

- Which spells are active on the creature (decides when to call pAddEffect)
- Per-turn effect payloads (healing amounts, save DCs, damage rolls)
- Mapping between spell IDs and their mechanical effects (which conditions, damage types, etc.)
- Multi-creature interactions (spell cast by creature B affecting creature A)

### Future migration path to D2

Individual spells can be promoted from TS to Quint by:
1. Adding the spell's `EffectPayload` variant to a `dndSpells.qnt` module
2. Adding processing logic (what happens at start/end of turn for that spell)
3. The core lifecycle is unchanged — D3 and D2 share the same primitives

---

## 5. Round as Time Quantum

### Rules basis

"A round represents about 6 seconds in the game world." (PHB Ch. 9, SRD Combat). This is the smallest meaningful time unit in D&D 5e. No sub-round time units exist — reactions, opportunity attacks, and Shield-on-hit are interrupt-style triggers within the round framework, not smaller quanta.

Spell durations use minutes/hours (e.g., "Concentration, up to 1 minute" = 10 rounds). Spells never specify duration in raw rounds or seconds. The only seconds reference is suffocation/breath-holding.

### Single-creature model simplification

In a single-creature model, each creature turn = 1 round passing. Duration counters decrement by 1 each START_TURN. "1 minute" = 10 decrements. "1 hour" = 600 decrements.

This holds regardless of when in the round the spell was cast (by this creature or another), because in the single-creature model we only observe our own turns.

### No round counter needed (for now)

Since durations are per-effect counters (remainingTurns in ActiveEffect), a global round counter adds no value in the single-creature model. If multi-creature modeling is added later, a round counter would be needed to synchronize turn-based duration across initiative order.

---

## 6. Start-of-Turn and End-of-Turn Trigger Catalog

All triggers are caller-provided via event arguments (pre-resolved rolls). The core spec processes them mechanically.

### Start-of-turn triggers

| Trigger | Data needed | Modeled? | Notes |
|---------|------------|----------|-------|
| Death saving throw | d20 roll | Exists (separate event) | Move into START_TURN args |
| Reaction reset | None | Yes (in pStartTurn) | Keep as-is |
| Heroism temp HP | amount (= casting mod) | No (PLAN T156) | START_TURN effect arg |
| Regenerate 1 HP | None (automatic) | No (PLAN T151) | START_TURN effect arg |
| Champion Survivor heal | None (5+CON if <= half HP) | No (PLAN T23) | START_TURN effect arg or internal |
| Suffocation drop to 0 | None (timer-based) | No | Needs breath counter |
| Confusion behavior | d10 roll | No (PLAN T153) | START_TURN effect arg |
| Bestow Curse action waste | WIS save result | No (PLAN T153) | START_TURN effect arg |
| Active effect duration decrement | None | No (new) | Automatic in START_TURN |

### End-of-turn triggers

| Trigger | Data needed | Modeled? | Notes |
|---------|------------|----------|-------|
| Condition repeated saves | Save result per effect | No | END_TURN arg |
| Ongoing damage (Phantasmal Killer, etc.) | Damage roll + save result | No | END_TURN arg |
| Petrification progression | CON save + success/fail counter | No | END_TURN arg |
| Effect expiry (duration-based) | None | No (new) | Automatic via lifecycle |

### Pattern

All randomness is pre-resolved and passed as event arguments. This is the established pattern:
- `SHORT_REST` carries `hdRolls`
- `START_TURN` carries `callerSpeedModifier`
- `TAKE_DAMAGE` carries pre-computed damage amounts

START_TURN and END_TURN follow the same convention with arrays of per-effect data.

---

## 7. Modular Spell Architecture

### Principle

The core `.qnt` spec provides lifecycle primitives sufficient for any SRD spell to interact. Spell-specific behavior (what Hold Person does, what Heroism grants) lives in TypeScript for now. The boundary is:

- **Core Quint**: creature state, conditions, action economy, combat mode, effect lifecycle (add/remove/decrement/expire), concentration, HP/damage/healing, death saves
- **TypeScript (caller)**: spell catalog, per-spell effect definitions, mapping spells to conditions/damage/healing, providing per-turn effect payloads in event arguments

### File structure

```
dnd.qnt              — core spec (all sections 1-12 + new lifecycle)
dndTest.qnt          — core tests (existing)
dndSpellHelpers.qnt  — optional future: model-checked spell validation helpers
app/src/machine.ts   — XState machine (mirrors core)
app/src/spells/      — spell-specific TS logic (effect payloads, mappings)
```

### Core completeness criterion

The core spec is complete when any SRD spell can be expressed as a sequence of:
1. `pAddEffect(spellId, duration)` — register the spell
2. Condition/damage/healing primitives — apply the spell's immediate effect
3. START_TURN/END_TURN event args — process per-turn effects
4. `pRemoveEffect(spellId)` — end the spell (via save, dispel, concentration break, or expiry)

No spell should require adding new fields to CreatureState or TurnState beyond what the core provides.

---

## 8. ASSUMPTIONS.md Updates

### A2: END_TURN as modeling convention

**Assumption:** END_TURN is an explicit event in the state machine that transitions a creature from `acting` to `waitingForTurn`.

**Rules basis:** D&D 5e has no explicit "end turn" action. Turns proceed through initiative order implicitly. However, "at the end of your turn" is a pervasive trigger point in the rules (repeated saves for condition spells, ongoing damage, effect expiry). At the table, players universally say "I end my turn." The state machine needs a transition to prevent START_TURN spam and to process end-of-turn triggers.

### A3: Round = 6 seconds as atomic time unit

**Assumption:** The round (6 seconds) is the smallest time unit modeled. All durations are tracked as integer turn counts. No sub-round time tracking exists.

**Rules basis:** PHB Ch. 9: "A round represents about 6 seconds in the game world." Reactions, opportunity attacks, and reaction spells (Shield, Counterspell) are interrupt-style triggers within the round framework, not smaller time quanta. No spell or ability uses duration shorter than 1 round. "Until the end of this turn" (same turn, sub-round duration) does not appear anywhere in the rules.

### A4: Single-creature turn = 1 round for duration tracking

**Assumption:** In the single-creature model, each START_TURN/END_TURN cycle represents one round passing. Effect duration counters decrement by 1 per cycle regardless of when the effect was applied relative to initiative order.

**Rules basis:** This is a simplification. In multi-creature combat, a round is one full pass through the initiative order. An effect cast mid-round by another creature would technically expire at that creature's turn N rounds later, not at our turn. But in a single-creature model, we only observe our own turns, so each turn = 1 round is the only tractable approach. The caller is responsible for providing correct initial duration values accounting for initiative-order offset if needed.

---

## Implementation Dependencies

These changes are foundational — they affect the turn structure that all PLAN.md tasks depend on. Suggested order:

1. **Active effect lifecycle** (new types + pure functions in dnd.qnt) — no existing behavior changes
2. **END_TURN event** (new event, new Quint action, new XState transition)
3. **Combat mode separation** (restructure turnPhaseConfig, gate events)
4. **START_TURN refactoring** (restrict to waitingForTurn, add effect args, integrate death saves)
5. **ASSUMPTIONS.md updates** (A2, A3, A4)
6. **MBT bridge updates** (new events, new state fields, schema sync)
7. **UI updates** (snapshot.can() for button availability)

Steps 1-4 require Quint spec changes first, then XState parity, then MBT bridge sync. Each step should pass MBT tests before proceeding to the next.
