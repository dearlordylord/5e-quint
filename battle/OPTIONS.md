# Battle State — Architecture Options

> **Note (2026-04-09 audit):** O1 (layered architecture), O2 (caller-provided distances), O3.A (reactions as state machine states), and O4 (whole rulebook in Quint) are all **implemented**. This file is now primarily historical reference for the design rationale behind these choices.

---

## O1: Layered Architecture

Three layers, each with clear responsibilities. Agreed direction (not yet implemented).

```
DISTANCE CONCERN (future / optional)
  Responsibilities: positions, range checks, OA trigger detection, aura membership
  Provides: spatial booleans/feet to battle machine events
  Could be: grid engine, TotM DM input, AI narrator, or absent entirely

BATTLE MACHINE
  Responsibilities: initiative, turn order, cross-creature transactions,
    interrupt points, reaction stack, concentration break propagation, aura/link tracking
  Consumes: creature machines (existing DndContext)
  Does NOT own: spatial reasoning, dice rolling (pre-resolved)

CREATURE MACHINES (existing)
  Responsibilities: single-creature state (HP, conditions, resources, action economy)
  Already built: DndContext, 101 event types, 12 classes, MBT-verified
```

## O2: Distances — Caller-Provided

Distances (in feet) remain caller-provided, same as today's `AttackContext` booleans. The battle machine does not track positions or compute ranges.

**Pro:** Keeps Quint state space small. Clean separation. Distance concern is genuinely independent — TotM, grid, and automated testing all produce feet differently.

**Con:** The battle machine can't autonomously detect OA triggers from movement, or track who is in an aura. These remain caller responsibilities.

**Alternative considered and rejected:** Pairwise distance map in the battle state. Rejected because: (a) it couples the battle machine to spatial reasoning, (b) theatre of mind doesn't always have precise feet, (c) Quint state space grows with distance range x pair count.

**Alternative considered and rejected:** Zone-based abstraction (ADJACENT/NEAR/FAR/etc). Rejected because: RAW uses feet, not zones. Zones are an interpretation, not a formalization.

## O3: Interrupt Model — Open Questions

How does the battle machine handle reactions? Several options, not yet decided.

### O3.A: Reaction as state machine states

The battle machine is a state machine (like the creature machine). When an interrupt point is reached, the machine transitions to an "awaiting reaction" state. In that state, only reaction events (or pass) are valid inputs. After resolution, the machine transitions back to continue the action.

```
States:
  ACTIVE_TURN        — normal turn, active creature acts
  AWAITING_REACTION  — interrupt point reached, waiting for reaction decision
    context: { trigger, eligible creatures, pending resolution state }
  RESOLVING_NESTED   — a reaction (e.g., Counterspell) triggered another interrupt
    context: { parent interrupt, current trigger, eligible }

Events (while in AWAITING_REACTION):
  REACT { creature, reaction }  — creature uses their reaction
  PASS  { creature }            — creature declines, does not consume reaction

Transitions:
  AWAITING_REACTION + REACT →
    if reaction creates new trigger → RESOLVING_NESTED (push stack)
    else → apply reaction, advance to next interrupt point or ACTIVE_TURN
  AWAITING_REACTION + PASS →
    if more eligible creatures → stay AWAITING_REACTION
    else → advance to next interrupt point or ACTIVE_TURN
  RESOLVING_NESTED resolves → pop stack → resume parent interrupt
```

**Pro:** Normal state machine — no coroutines. Quint can model this directly. The "reaction stack" is explicit state. The depth is bounded by the number of creatures (no hardcoded limit).

**Con:** Adds complexity to the battle state. The "stack" needs to be part of the state (a list of pending interrupt contexts).

### O3.B: Fully pre-resolved reactions

The caller provides ALL reaction decisions upfront as part of the event, just like dice rolls are pre-resolved today.

```
ATTACK {
  attacker, target, weapon, roll,
  hitReaction: "Shield" | "Parry" | "pass",
  damageReaction: "UncannyDodge" | "pass",
  afterReactions: [{ creature: X, reaction: "HellishRebuke", save: true }],
  counterReactions: []  // nested counterspell chain, pre-resolved
}
```

**Pro:** Fits the existing "all dice pre-resolved" pattern. Quint-friendly (pure function). MBT can generate random reaction choices same as random dice.
**Con:** Caller must know ALL interrupt points and eligible reactions. Complex event payloads. Nesting (counterspell chains) makes the pre-resolved structure recursive.

### O3.C: Defer reactions entirely — caller-managed (like today)

The battle machine only handles the "easy" cross-creature part: routing events to the right creature. Reaction decisions remain caller-side, same as today.

**Pro:** Simplest. Ship fast. Existing pattern.
**Con:** Doesn't formalize the interrupt points. Can't verify reaction legality in Quint. Loses the chance to spec-check "Shield was used legally here."

## O4: Quint vs. TS Boundary

**Direction:** Whole rulebook in Quint if technically possible. The battle spec imports the existing creature spec as a library — calling `pTakeDamage`, `pHeal`, `pUseReaction`, etc. on specific creatures in the map.

| Component | Quint | TS | Notes |
|-----------|-------|-----|-------|
| Creature state machine | Yes (existing) | Yes (existing) | Already built, MBT-verified |
| Battle state (initiative, turn tracking) | Yes | Yes | New battle spec + runtime battle engine |
| Transaction routing (A attacks B) | Yes | Yes | Core value — atomicity guarantees |
| Interrupt points / reaction windows | Yes | Yes | Reaction state machine states |
| Reaction legality guards | Yes | Yes | "can this creature react here?" |
| Concentration break propagation | Yes | Yes | Cross-creature effect cleanup |
| Creature roster changes (insert/remove) | Yes | Yes | See A33 — DM discretion |
| Distance / spatial | No | Caller | Agreed: caller-provided |

## O4.1: MBT Strategy for Battle Layer

### O4.1.A: Battle-level MBT (full parity)

Quint battle spec generates battle traces. TS has a battle-level machine (possibly using actor-style composition — parent battle actor spawns child creature actors). MBT bridge compares full battle state: all creatures' states + initiative + turn tracking.

**Pro:** Full parity. Verifies battle logic (atomicity, interrupt ordering, propagation).
**Con:** Requires building a battle-level TS machine. Largest effort.

**Note on actor-style models:** Parent/child actor composition supports spawning child actors from a parent machine. The battle machine could be a parent actor that spawns creature actors, sends them events, and reads their state. This maps naturally to `Map[CreatureId, CreatureState]` in Quint. Worth investigating: https://stately.ai/docs/actor-model

### O4.1.B: Per-creature projection MBT (incremental)

Quint battle spec generates battle traces. The bridge **projects** each trace per-creature: filters to events that touched creature X, replays against X's existing creature runtime implementation. Compares per-creature state.

```
Battle trace: [aStartTurn(A), aAttack(A,B,...), aReact(B,Dodge), aEndTurn(A), aStartTurn(B)]

Projected to A: [START_TURN, USE_EXTRA_ATTACK, END_TURN]        → replay on A's machine
Projected to B: [TAKE_DAMAGE, USE_REACTION, START_TURN]         → replay on B's machine
```

**Pro:** Reuses existing creature MBT bridge almost entirely. Incremental adoption. Verifies that the battle spec's per-creature effects match existing creature machine behavior.
**Con:** Does NOT verify battle-level atomicity or interrupt ordering — only per-creature correctness.

### O4.1.C: Both (layered)

Start with O4.1.B (per-creature projection) to validate that the battle spec composes creature functions correctly. Add O4.1.A (battle-level parity) later when the battle TS machine exists.

**Pro:** Ship incrementally. Get value from battle Quint spec before building the full TS battle machine.
**Con:** Two bridge implementations to maintain (temporarily).

## O5: Implications for Single-Creature Machine

What changes (if any) to the existing `DndContext` and event types?

### O5.A: No changes — battle layer wraps existing events

The existing machine stays exactly as-is. The battle layer composes events:
```
battleAttack(A, B) → [
  send(A, USE_EXTRA_ATTACK),
  send(B, TAKE_DAMAGE { ... })
]
```

**Pro:** Zero risk to existing MBT. Clean composition.
**Con:** Reaction events like USE_REACTION don't carry context about WHAT triggered them.

### O5.B: Add reaction trigger context to existing events

New events or extended events:
```
| { type: "REACTION_WINDOW", triggerType: TriggerType, ... }
| { type: "DECLINE_REACTION" }  // explicit "I choose not to react"
```

**Pro:** Single creature machine knows it's being asked to react, not just "reaction was used."
**Con:** Changes existing machine, may break MBT bridge.

### O5.C: Creature machine gains a "pending reaction" state

The creature can be in a state where it's been offered a reaction window and must decide. This is a new state in the runtime machine (parallel to the existing turn states).

**Pro:** Models the interrupt naturally. UI can show "do you want to react?"
**Con:** Significant change to existing machine. Creature machine gains battle-awareness.

## O6: Initiative Representation

Initiative is mostly fixed but has edge cases (see REQUIREMENTS.md R1.1-R1.6).

### O6.A: Ordered list, mutated at setup only

```
initiative: List[CreatureId]   // set once, never changes
currentIndex: int              // advances each turn
```

Alert feat swap and Thief's Reflexes insertion happen before round 1. After that, fixed.

**Pro:** Simple. Covers 99% of cases.
**Con:** Thief's Reflexes adds a second entry for round 1 only — need to handle removal after round 1.

### O6.B: Per-round initiative function

```
initiativeForRound(round: int): List[CreatureId]
```

Round 1 may differ from round 2+ (Thief's Reflexes). But this overcomplicates a single edge case.

### O6.C: Initiative as list with insert/remove

```
initiative: List[CreatureId]   // mutable — can insert/remove entries
```

Thief's Reflexes: insert duplicate at initiative-10 for round 1, remove after round 1. Alert swap: swap two entries at setup. New creatures joining combat: insert at rolled initiative.

**Pro:** Handles all cases including creatures entering/leaving combat mid-fight.
**Con:** Slightly more complex than a fixed list.

## O7: Reaction Availability — No Duplication

The creature machine already tracks `reactionAvailable: bool` in `TurnState`. The battle layer must NOT duplicate this with a separate `reactionsUsed: Set<CreatureId>`.

When the battle machine needs to know who can react:
```
canReact(creatureId) = creatures[creatureId].turnState.reactionAvailable
```

When a creature reacts, the battle machine sends `USE_REACTION` to that creature's machine, which flips `reactionAvailable` to false. Single source of truth.
