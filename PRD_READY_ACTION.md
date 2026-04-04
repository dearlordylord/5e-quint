# PRD 2: Ready Action

## Problem Statement

The Ready action is a core SRD combat action that lets a creature prepare a response to a future trigger, executing it as a reaction on another creature's turn. It is modeled at the creature level (`readiedAction: bool` in `TurnState`, `AReady` action type) but completely absent from the battle layer. Creatures in multi-creature combat cannot ready actions.

Ready is the only standard action that converts a current-turn action into a future-turn reaction. This creates a unique flow: spend an action now, gain a reaction-triggered action later, with the readied action expiring at the start of your next turn. Readied spells add Concentration as a holding mechanism with slot-loss on fizzle. These interactions are multi-step and combinatorial — the kind of thing Quint is built to verify.

## Solution

Add Ready as a battle action in two phases:

**Phase 1 (this PRD):** Ready for actions and movement. A creature spends its action to ready. Between turns (after the LA window), creatures with readied actions can spend their reaction to take one action or move. The trigger for releasing is a DM ruling — the spec models the action/reaction economy, not the narrative circumstance. This validates the "act on another creature's turn" flow pattern.

**Phase 2 (deferred, documented):** Readied spells. Slot spent on ready, Concentration held until release, fizzle on Concentration break (slot lost). This extends Phase 1 with Concentration tracking and spell resolution on release (including Counterspell eligibility).

## User Stories

1. As a creature on my turn, I want to take the Ready action to prepare a response, so that I can act later when circumstances change.
2. As a creature that readied an action, I want to spend my reaction between turns to take an action (Attack, Dash, Dodge, Cast a Spell, etc.), so that the readied response executes.
3. As a creature that readied an action, I want to choose to NOT release when offered, so that I can save my reaction or wait for a better moment.
4. As a creature that readied an action, I want my readied action to expire at the start of my next turn, so that the one-round limitation is enforced per RAW.
5. As a creature that readied movement, I want to spend my reaction to move up to my Speed, so that readied movement works per RAW.
6. As a creature that released a readied Attack action, I want the attack to go through the normal hit/damage/reaction chain, so that Shield, Uncanny Dodge, etc. can respond.
7. As a creature that used my reaction to release a readied action, I want my reaction to be consumed, so that I can't also use Shield/Counterspell this round.
8. As the DM, I want the spec to model the economy of readying and releasing without dictating when triggers occur, so that trigger determination remains my ruling.
9. As a spec maintainer, I want readied spells (Phase 2) to extend this pattern by adding Concentration, not restructuring the ready flow.
10. As an MBT test, I want Quint and XState to agree on action/reaction availability after readying and releasing.

## Implementation Decisions

### New battle phase: BPAwaitingReadiedAction

Add a new `BattlePhase` variant: `BPAwaitingReadiedAction(ReadyWindowCtx)`.

```
ReadyWindowCtx = {
  eligible: Set[CreatureId],    // creatures with readiedAction + reactionAvailable
  offered: Set[CreatureId],     // already offered this window
  endingTurnCreature: CreatureId // whose turn just ended (to advance after)
}
```

Structurally identical to `LAWindowCtx` — a set of eligible creatures offered one by one.

### Battle flow with Ready

After `bEndTurn` processes effects, the flow becomes:

1. Check for LA-eligible monsters → if any, enter `BPAwaitingLegendaryAction`
2. After LA resolves (or if none), check for ready-eligible creatures → if any, enter `BPAwaitingReadiedAction`
3. After ready resolves (or if none), advance to next turn

This means the turn-advancement logic (currently in `bEndTurn`, `bLegendaryPass`, `bLegendaryAttack`) needs a new intermediate step. After the LA window resolves, instead of directly advancing the turn, check for readied actions first.

### bReady action (during active turn)

Guard: `BPActiveTurn`, `bTurnStarted`, `actionsRemaining > 0`, not dead, not incapacitated.

Calls `pUseAction(ac.turn, ac.creature, AReady)` which sets `readiedAction: true` on TurnState (already implemented in creature.qnt).

Added to `battleStep` under `BPActiveTurn`.

### bReadyRelease action (during ready window)

Guard: `BPAwaitingReadiedAction(ctx)`, reactor is in eligible set, not yet offered.

The releasing creature:
1. Spends reaction (`pUseReaction`)
2. Clears `readiedAction` flag
3. Gets one action — modeled as granting `actionsRemaining = 1` temporarily

The action itself is then taken in a sub-phase or inline. The simplest approach: `bReadyRelease` directly models the most common case — a readied attack. The release enters the shared attack resolution from PRD 1 (parameterized by return point `ADRAwaitingReadiedAction`). For readied movement, a separate `bReadyReleaseMove` grants movement.

Alternative (simpler): `bReadyRelease` just costs the reaction and sets a flag. The released action fires as a normal action on a mini-turn. This is cleaner but requires modeling a "mini active turn" for the releasing creature.

Decision: **start with readied attack only** (the dominant use case), using the shared attack resolution. Readied movement and readied other-actions are extensions. This keeps the Phase 1 scope minimal while validating the between-turns flow.

### bReadyPass action (during ready window)

All eligible creatures pass (or all have been offered). Advance to next turn. Same pattern as `bLegendaryPass`.

### readiedAction expiry

At `bStartTurn`, clear `readiedAction: false` on the active creature's TurnState. This already happens via `pStartTurn` in creature.qnt (TurnState resets each turn). Verify this is the case — if `readiedAction` persists across turns, add explicit clearing.

### New AfterDamageReturn variant

If a readied attack goes through the reaction chain, it needs `ADRAwaitingReadiedAction(ReadyWindowCtx)` to return to the ready window after resolution (similar to `ADRResolvingMovement` for OA attacks).

### DM rulings as caller inputs

The trigger for releasing is NOT modeled. The spec offers the ready window between turns; the releasing creature (controlled by DM or player) decides whether to release. This is the same pattern as all other nondeterministic decisions in the spec — the `nondet` picks represent DM/player choices.

The spec comment on `bReady` should document: "Trigger determination is a DM ruling — the spec models the economy of readying and releasing, not the narrative circumstance that prompts release."

### Frame conditions

`ReadyWindowCtx` is encoded in `BPAwaitingReadiedAction`, which is a `BattlePhase` variant stored in `bPhase`. No new top-level state variables. `readiedAction` is already in `TurnState` on `Combatant`.

## Testing Decisions

### What makes a good test

Tests verify: action spent to ready, reaction spent to release, reaction unavailable afterward, readied action expires at start of next turn, released attack goes through reaction chain. Tests should NOT verify trigger logic (there is none).

### Quint tests

- Ready + release attack: action spent, reaction spent, damage applied, reaction chain fired
- Ready + pass: action spent, no reaction spent, readied expires at next turn start
- Ready + release + Shield: attack enters reaction chain, Shield modifies AC
- Ready when already used reaction: release blocked (no reaction available)
- Two creatures ready: both can release in the same window (different reactions)

### Battle invariants

- `readiedAction` implies the creature used AReady this turn (or a prior turn if not yet expired)
- Ready window only entered when at least one creature has readied + reaction available
- After release, `reactionAvailable` is false

### MBT parity

New actions (`bReady`, `bReadyRelease`, `bReadyPass`) need MBT bridge mappings. The between-turns ready window is a new phase the bridge must handle (map `BPAwaitingReadiedAction` to the XState equivalent).

### Prior art

- `bLegendaryPass` / `bLegendaryAttack` for the between-turns window pattern
- `bDash` / `bDisengage` / `bDodge` for thin active-turn action wiring
- `bMovementOAAttack` for attacks that return to a non-active-turn phase

## Out of Scope

- **Readied spells (Phase 2):** Slot spent on ready, Concentration held until release, fizzle on break (slot lost), release enters spell resolution (Counterspellable). Builds on Phase 1's between-turns flow by adding: (a) a `readiedSpell` field on Combatant tracking spell parameters, (b) `pStartConcentration` called on ready, (c) spell resolution on release instead of attack resolution. This is a planned extension, not a separate PRD — it extends the same flow.
- **Readied movement:** Release grants Speed instead of an action. Simpler than readied attacks (no reaction chain). Extension of Phase 1.
- **Readied non-attack actions:** Readied Dodge, Dash, Help, etc. Each would be a variant of `bReadyRelease`. Extension of Phase 1.
- **Mid-turn release:** RAW says release happens "right after the trigger." Without trigger modeling, between-turns is the correct abstraction. If trigger modeling is added later (mapping to `TriggerType` variants), release could fire mid-turn within existing reaction windows.
- **Multiple readied actions in one window:** RAW: only one reaction per round. A creature can only release once. This is naturally enforced by `reactionAvailable` — no special handling needed.

## Further Notes

- Phase 1 validates the "between-turns action" flow pattern. If it works cleanly (no state machine tangles, MBT stays fast), Phase 2 is a known extension. If it causes problems, we learn on the simpler case.
- The between-turns ready window is structurally identical to the LA window. The implementation cost is low — one new phase variant, one new context type, two new actions, and wiring into the turn-advancement flow.
- Readied attacks using the shared resolution from PRD 1 means Shield, Uncanny Dodge, Counterspell (on readied spells in Phase 2), and all future reactions work automatically. This is a benefit of the domain-language-driven unification.
- The `readiedAction: bool` flag on TurnState already exists in creature.qnt. No creature-level changes needed for Phase 1 — only battle-level wiring.
- DM rulings as caller inputs is a project-wide pattern, not specific to Ready. The ARCHITECTURE.md section on DM rulings documents this. The Ready action is the clearest example: the trigger is DM agenda, the economy is spec-modeled.
