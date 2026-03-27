# Plan: Cleanup & Restore Inductive Invariants

## Architectural constraint

Every change must pass the scaling question: **"What happens when we have all 8+ classes and all 20 levels?"** If an approach requires per-class or per-level copies of actions, step functions, init variants, driver handlers, or test infrastructure, it's the wrong approach. One `step`, one set of actions, parameterized by state variables.

---

## TODO

### A. Make `fighterLevel` a state variable

**Why:** Fighter actions hardcode `TEST_CONFIG.level` (= 5). The L9 MBT config works around this with duplicated actions (`doUseSecondWindL9`, `doUseIndomitableL9`, `doLongRestL9`) and a separate `step9`. This doesn't scale — N classes × M levels = combinatorial explosion of step/action copies.

**Fix:**
1. Add `var fighterLevel: int` to state variables in `dnd.qnt`
2. Set it in each init action (`init` → 5, `init9` → 9)
3. Add `fighterLevel' = fighterLevel` to every action (standard Quint — see State Type Pattern)
4. Replace `TEST_CONFIG.level` with `fighterLevel` in `doUseSecondWind` and `doUseIndomitable`
5. Replace `pLongRest(state, 5)` with `pLongRest(state, fighterLevel)` in `doLongRest`
6. Delete `step9`, `doUseSecondWindL9`, `doUseIndomitableL9`, `doLongRestL9`
7. In `machine.mbt.test.ts`: L9 test uses `init: "init9"` with regular `step` (no `step: "step9"`). Remove `step9`, `init9`, `doLongRestL9`, `doUseSecondWindL9`, `doUseIndomitableL9` from driver schema and handlers
8. Run `quint test` + `quint run` + `vitest run`

### B. Move inductive invariant into `dnd.qnt` and fix Apalache verification

**Depends on:** A (the invariant must constrain `fighterLevel`)

**Why:** `dndFighterInductive.qnt` exists as a separate file but imports everything from `dnd` anyway. No reason for the separation. Also, Apalache step-preservation check (step 2 of 3) currently fails — record-typed state vars need `.in(Set)` constraints so the solver knows their shape before field access.

**Fix:**
1. Move `VALID_FIGHTER_STATES` and `inductiveInv` from `dndFighterInductive.qnt` into `dnd.qnt` (alongside `allInvariants`)
2. Delete `dndFighterInductive.qnt`
3. Add `fighterLevel` constraint to `inductiveInv` (e.g. `fighterLevel.in(VALID_LEVELS)`)
4. Fix Apalache "variable used before assigned" error: add `.in(Set)` constraints for record-typed vars (`turnState`, `state`, `spellSlots`), or build valid-state enumerations. This is iterative — run Apalache, read counterexample, strengthen invariant, repeat
5. Verification command:
   ```bash
   npx quint verify --main=dnd \
     --invariant=allInvariants \
     --inductive-invariant=inductiveInv \
     dnd.qnt
   ```
6. All 3 checks must pass:
   - `[1/3] inductiveInv holds in init`
   - `[2/3] step preserves inductiveInv`
   - `[3/3] inductiveInv implies allInvariants`

**Troubleshooting:**
- **"Variable X used before assigned"** — Apalache needs every state var constrained with `.in()` or `==` before field access. Start with field-level bounds; if rejected, build `VALID_*_STATES` set comprehensions
- **Timeout** — model has 5+ state vars and 43+ actions. Try `--max-steps=5` or temporarily comment out unrelated actions from `step`. POC verified in ~50 seconds; full model may take 5-10 minutes
- **Quint has no `flatMap` or `cross`** — use nested `map().flatten()` chains

**Notes:**
- The `inductiveInv` constraints are discovered iteratively — each one added because Apalache found a counterexample without it
- `allInvariants` is still checked by `quint run` (random simulation). The inductive invariant is a strictly stronger guarantee
- When adding more class state vars, extend `inductiveInv` with analogous constraints

---

## Deferred (not blocking)

### C. Fighter state initializes for all characters
`...initialFighterState(i.fighterLevel ?? 0)` runs for every character. A Wizard gets 7 meaningless fighter fields (all 0/false). Same in Quint — every creature has a `fighterState`.
**Fix when adding a second class to Quint.** At that point, decide: (a) accept flat cost (each class adds ~7 fields to every character), or (b) refactor to a single `classState` record with per-class sub-records. Do NOT fix before then — premature abstraction with only one class.

### D. Rest actions fire fighter updates for non-fighters
`fighterShortRest` and `fighterLongRest` run on every SHORT_REST/LONG_REST regardless of class. They're no-ops when maxes are 0 (capped arithmetic produces same values), so harmless.
**Fix alongside C** — same trigger (adding second class). When refactoring class state, conditionally apply per-class rest logic.
