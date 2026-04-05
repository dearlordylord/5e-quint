# Plan: Ready Action

> Source PRD: `PRD_READY_ACTION.md`

## Architectural decisions

- **Between-turns window**: `BPAwaitingReadiedAction(ReadyWindowCtx)` — structurally identical to LA window. Fires after LA resolution, before turn advancement.
- **Trigger is DM agenda**: The spec models the action/reaction economy. When to release is a nondeterministic choice (DM/player decision). No trigger types modeled.
- **Phase 1 scope**: Ready + release as attack only. Readied movement and readied spells are extensions.
- **readiedAction flag**: Already exists in `TurnState` (creature.qnt). Expires at `bStartTurn` (TurnState resets).
- **New AfterDamageReturn variant**: `ADRAwaitingReadiedAction(ReadyWindowCtx)` for released attacks that enter the reaction chain.

---

## Phase 1: Ready action + between-turns window

**User stories**: 1, 3, 4, 8, 10

### What to build

Add `bReady` to the active-turn action menu: spends action via `pUseAction(AReady)`, sets `readiedAction: true`. Add `BPAwaitingReadiedAction(ReadyWindowCtx)` phase variant. After the LA window resolves (or if no LA), check for creatures with `readiedAction == true` and `reactionAvailable == true`. If any, enter the ready window. Add `bReadyPass` — all eligible pass, advance to next turn. Verify that `readiedAction` resets at `bStartTurn` (TurnState reset). Mirror in TS.

### Acceptance criteria

- [x] `bReady` action available during `BPActiveTurn` (costs action, sets `readiedAction`)
- [x] `BPAwaitingReadiedAction` phase entered after LA window when eligible creatures exist
- [x] `bReadyPass` advances to next turn
- [x] `readiedAction` clears at start of next turn
- [x] Turn advancement flow: endTurn -> LA window -> ready window -> next turn
- [x] MBT bridge maps new phase and actions
- [x] All verification passes

---

## Phase 2: Release readied attack

**User stories**: 2, 6, 7, 9

### What to build

Add `bReadyRelease` action in the ready window. The releasing creature spends reaction, clears `readiedAction`, and enters the shared attack resolution (from attack-pipeline plan Phase 1) with return point `ADRAwaitingReadiedAction(ReadyWindowCtx)`. After the attack's reaction chain resolves, return to the ready window for remaining eligible creatures. The released attack triggers Shield, Uncanny Dodge, etc. through the standard chain.

### Acceptance criteria

- [x] `bReadyRelease` spends reaction and enters shared attack resolution
- [x] Released attack goes through hit-reaction -> damage-reaction -> after-damage chain
- [x] After resolution, returns to ready window (not active turn)
- [x] Creature's `reactionAvailable` is false after release
- [x] A creature that already used its reaction cannot release
- [x] MBT bridge maps `bReadyRelease` with attack parameters
- [x] All verification passes

---

## Future phases (not in scope, documented for continuity)

### Readied movement

Release grants Speed worth of movement instead of an attack. Simpler than readied attacks (no reaction chain). New `bReadyReleaseMove` action.

### Readied spells (Phase 2 from PRD)

Slot spent on ready, Concentration held until release. If Concentration breaks, spell fizzles (slot lost). On release, spell enters normal resolution (Counterspellable). Needs `readiedSpellParams` on Combatant to track spell parameters between ready and release.
