# Plan: Quint Spec Parity & Class Feature Migration

## Why Quint

TS unit tests are deterministic — they check the cases you thought to write. Quint explores the nondeterministic state space: thousands of random traces through all possible action orderings, catching bugs that arise from unexpected state combinations. MBT then proves the XState runtime matches the Quint spec field-by-field across those traces. The spec also serves as executable SRD documentation — every modeled rule traces to a specific SRD passage.

## Goal

Every class feature that affects state tracked by the XState machine should be spec'd in Quint and MBT-verified. The three layers have distinct roles:

- **Quint** (`dnd.qnt`) — formal spec, source of truth for correctness
- **XState machine** (`machine.ts`) — Quint-parity state machine, verified by MBT traces
- **TS features layer** (`app/src/features/`) — single implementation of class features, bridges to machine events via `feature-bridge.ts`

Fighter (Champion) is fully spec'd in Quint. All other classes exist only in TS.

**"Quint parity" scope:** CLAUDE.md says "never add logic to XState that diverges from Quint spec." This applies to mechanics that ARE modeled in Quint. Features not yet in Quint (all other classes) live only in the TS features layer — that's the current state, not a violation. The goal is to move them into Quint over time.

## Architectural constraint

Every change must pass the scaling question: **"What happens when we have all 8+ classes and all 20 levels?"** If an approach requires per-class or per-level copies of actions, step functions, init variants, driver handlers, or test infrastructure, it's the wrong approach. One `step`, one set of actions, parameterized by state variables.

---

## Current parity (Fighter)

| Fighter mechanic | Quint | XState | TS features | MBT-verified |
|-----------------|-------|-----------------|-------------|-------------|
| Second Wind (charges + healing) | ✓ | ✓ delegates | ✓ | ✓ |
| Action Surge (charges + action grant) | ✓ | ✓ delegates | ✓ | ✓ |
| Indomitable (charges) | ✓ | ✓ inline | ✓ | ✓ |
| Extra Attack tiers | ✓ | ✓ | — | ✓ |
| Fighting Styles (passive formulas) | ✓ formulas | ✗ | ✓ | ✗ |
| Tactical Mind (L2) | ✓ | ✓ inline (different interface) | ✓ | ✓ |
| Tactical Shift (L5, on SW) | ✓ via P1 | ✓ delegates (via SW) | ✓ | ✓ |
| Champion: Improved/Superior Critical | ✓ configForLevel | ✗ | ✓ | ✓ (via critRange) |
| Champion: Remarkable Athlete (crit movement) | ✓ | ✓ delegates | ✓ | ✓ |
| Champion: Heroic Warrior (L10) | ✓ | ✓ delegates (start turn) / inline (use) | ✓ | ✓ |
| Champion: Survivor/Defy Death (L18) | ✓ | ✓ | ✓ | ✓ |

## Current parity (other classes)

| Layer | What's there |
|-------|-------------|
| Quint | Base rules only |
| XState | Full base rules parity (MBT-verified, 57 state fields) |
| TS features | ALL class features (Rage, Ki/Focus, Smite, Sneak Attack, Sorcery Points, etc.) |

## DONE: Eliminate XState/TS duplication (option b)

Machine actions in `machine.ts` inline logic that duplicates pure functions in `class-fighter.ts`. Resolution: machine actions delegate to the TS pure functions, keeping TS features as the single source of truth while Quint remains the formal spec verified by MBT.

### Why this mattered

Each fighter feature previously had THREE implementations: Quint (spec), XState inline (machine.ts), and TS features (class-fighter.ts). The Quint duplication is necessary (different language, verified by MBT). The XState/TS duplication was not — machine actions now import and call the TS pure functions directly.

### Action-by-action status

| Machine action | TS function | Status |
|---------------|-------------|--------|
| `useSecondWind` | `useSecondWind()` | ✓ delegates — wraps `hp()` branded type, converts `tacticalShiftDistance` → bonus movement fields |
| `useActionSurge` | `useActionSurge()` | ✓ delegates — return shape matches context patch |
| `useIndomitable` | — | ✓ inline — one-liner charge decrement; TS function takes `newRoll` param not needed here |
| `useTacticalMind` | — | ✓ inline — machine receives pre-computed `boostedCheckSucceeds`, incompatible interface with TS function |
| `useHeroicInspiration` | — | ✓ inline — one-liner boolean flip, identity function not worth extracting |
| `scoreCriticalHit` | `remarkableAthleteCritMovement()` | ✓ delegates — wraps distance into bonus movement fields |
| `fighterStartTurn` | `heroicWarriorInspiration()` | ✓ delegates (pre-existing) |
| `fighterShortRest` | `fighterShortRest()` | ✓ delegates — return shape matches context patch |
| `fighterLongRest` | `fighterLongRest()` | ✓ delegates — added `indomitableCharges` reset to TS function |

### Implementation notes

1. **Guards stay in machine actions.** The `if (...) return {}` guard checks remain inline in the `assign()` — they're XState's job. The TS pure functions assume preconditions are met.

2. **Branded types handled at the boundary.** `useSecondWind` returns raw `number` for HP; machine wraps with `hp()`. One-line conversion, not duplicated logic.

3. **Three actions stayed inline** after `/simplify` convergence:
   - `useIndomitable` — one-liner; TS function takes `newRoll` param the machine doesn't have
   - `useTacticalMind` — machine receives pre-computed `boostedCheckSucceeds`, incompatible with TS function's computation-based interface
   - `useHeroicInspiration` — identity function not worth extracting (tried, removed during simplify)

4. **`fighterLongRest` unified** — added `indomitableCharges` to return value, removed the separate `indomitableLongRest` alias.

5. **No new adapter file needed.** Delegation stays in `machine.ts` `assign()` bodies — extract state → call TS function → map result to context patch.

### Validation (completed)

- All vitest tests pass (1225 including MBT)
- `npx quint typecheck dnd.qnt` — clean
- Parity table updated above
- `/simplify` converged in 2 rounds

---

## Apalache limitation (non-blocking)

**What we wanted:** Apalache verifies `inductiveInv` is preserved by every step — a proof that `allInvariants` holds for ALL reachable states, not just sampled traces.

**What happened:** Apalache check 2/3 ("step preserves inductiveInv") requires every record-typed state variable to have a `var.in(SET_OF_RECORDS)` constraint before any field access. This is how Apalache learns the record shape for its SMT encoding.

For `fighterState` (7 fields, ~7K records), the `VALID_FIGHTER_STATES` set comprehension works fine. For `turnState` (13 fields, ~5.7M records), `state` (22 fields including nested records/sets, ~18.5B records), and `spellSlots` (contains `int -> int` maps), the Cartesian product via nested `map().flatten()` is astronomically large. Quint's only mechanism for expressing record sets is this enumeration pattern — there is no symbolic `[field: Int, ...]` notation like TLA+ has.

**Why it doesn't block us:**
- `quint run --invariant=allInvariants` (random simulation, 50K+ traces) provides strong coverage
- MBT (50 traces × 30 steps) proves Quint/XState field-by-field parity
- Unit tests (672+) validate individual pure functions
- The `inductiveInv` and `VALID_FIGHTER_STATES` remain in `dnd.qnt` — they're correct and useful for documentation. Apalache could verify them if Quint added symbolic record set support, but no such feature exists or is known to be planned upstream.

**What would unblock it:**
- Quint adding a symbolic record type expression (equivalent to TLA+'s `[field: Set, ...]` function sets)
- Or: a restricted sub-model that strips CreatureState/SpellSlotState down to just the fields Apalache needs

---

## Reference

### Caveats

- **`configForLevel` is Champion-only.** It hardcodes Champion subclass logic (crit range thresholds, Extra Attack tiers). When adding Battle Master or Eldritch Knight, it needs to become `configForChampionLevel` or take a subclass parameter.
- **Frame condition tax.** Each new top-level state variable requires adding `var' = var` to every action (~50). Mitigation: bundle related fields into existing records (e.g., `FighterState`, `TurnState`) to avoid new top-level vars. See deferred item C for the eventual record-consolidation plan.

### Suggested recipe (verify against current code before following)

1. Read the TS implementation in `class-fighter.ts` — it's the SRD-accurate reference
2. Add Quint pure function(s) in `dnd.qnt` mirroring the TS logic
3. Add action wrapper with nondet parameters (study `doUseSecondWind` as a template)
4. Add action to the `step` `any { }` block
5. Add driver schema entry + handler in `machine.mbt.test.ts` (study existing handlers)
6. If adding fields to `FighterState`: update the type definition, `freshFighterState`, `VALID_FIGHTER_STATES` ranges, `inductiveInv` constraints, `QuintFighterState` Zod schema, `NormalizedState` interface, both conversion functions (`snapshotToNormalized`, `quintParsedToNormalized`), `DndContext` interface, machine context factory
7. Validate: `npx quint typecheck dnd.qnt`, `npx quint test --main=dnd dnd.qnt`, `npx quint run --main=dnd --invariant=allInvariants dnd.qnt`, `npx vitest run`

### P1. Bonus movement grants (cross-class infrastructure)

Two fields on TurnState: `bonusMovementRemaining` (distance) and `bonusMovementOAFree` (OA immunity). `doUseBonusMovement` action consumes it. Reset at turn start. Used by Tactical Shift (L5) and Remarkable Athlete (L3); available for Barbarian Instinctive Pounce, Rogue Withdraw.

---

## Deferred (not blocking — do NOT implement without explicit owner request)

### C. Fighter state initializes for all characters
`...initialFighterState(i.fighterLevel ?? 0)` runs for every character. A Wizard gets 7 meaningless fighter fields (all 0/false). Same in Quint — every creature has a `fighterState`.
**Fix when adding a second class to Quint.** At that point, decide: (a) accept flat cost (each class adds ~7 fields to every character), or (b) refactor to a single `classState` record with per-class sub-records. Do NOT fix before then — premature abstraction with only one class.

### D. Rest actions fire fighter updates for non-fighters
`fighterShortRest` and `fighterLongRest` run on every SHORT_REST/LONG_REST regardless of class. They're no-ops when maxes are 0 (capped arithmetic produces same values), so harmless.
**Fix alongside C** — same trigger (adding second class). When refactoring class state, conditionally apply per-class rest logic.

### H. Migrate other classes to Quint (eventual)
Same pattern as Fighter: add class state var + level var, pure functions, action wrappers, MBT handlers. One class at a time. Priority order TBD based on which classes the app exercises most.

**All existing TS feature files (Barbarian, Monk, Paladin, Rogue, Sorcerer, etc.) and their UI components are working implementations — they are NOT dead code and must NOT be deleted.**
