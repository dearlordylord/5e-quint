# Plan: Cleanup & Restore Inductive Invariants

## Status: A and B complete. C and D deferred.

## Architectural constraint

Every change must pass the scaling question: **"What happens when we have all 8+ classes and all 20 levels?"** If an approach requires per-class or per-level copies of actions, step functions, init variants, driver handlers, or test infrastructure, it's the wrong approach. One `step`, one set of actions, parameterized by state variables.

---

## DONE

### A. Make `fighterLevel` a state variable and derive config from it ✓

- Added `var fighterLevel: int` with frame conditions on all ~48 actions
- Added `BASE_CHAMPION_CONFIG` + `configForLevel(level)` deriving 4 level-dependent fields
- Replaced all hardcoded config references (`TEST_CONFIG.level`, hardcoded `5`/`9`)
- Unified `init` with `nondet l = Set(5, 9).oneOf()` — both levels in one run
- Deleted all L9 duplicates: `init9`, `step9`, `doUseSecondWindL9`, `doUseIndomitableL9`, `doLongRestL9`, `TEST_CONFIG_L9`, `FRESH_FIGHTER_STATE_L9`
- Replaced `TEST_CONFIG` literal with `configForLevel(5)` (also fixes latent `critRange: 20` bug)
- Updated MBT bridge: `createDndDriver()` parameterless, init reads level from nondet pick, handlers read `fighterLevel` from actor snapshot, single `run()` call
- Added `fighterLevel` to `DndContext`, `NormalizedState`, `QuintFullState`, both conversion functions
- All validation passes: typecheck, unit tests, invariant simulation, MBT (1229 tests)

### B. Move inductive invariant into `dnd.qnt` ✓

- Moved `VALID_FIGHTER_STATES` and `inductiveInv` from `dndFighterInductive.qnt` into `dnd.qnt`
- Deleted `dndFighterInductive.qnt`
- Updated `inductiveInv` to use `fighterLevel` state var: `fighterLevel.in(1.to(20))` + charge constraints against `fighterLevel`
- Apalache verification command ready but not yet run (requires JDK 17):
  ```bash
  npx quint verify --main=dnd \
    --invariant=allInvariants \
    --inductive-invariant=inductiveInv \
    dnd.qnt
  ```

---

## Deferred (not blocking)

### C. Fighter state initializes for all characters
`...initialFighterState(i.fighterLevel ?? 0)` runs for every character. A Wizard gets 7 meaningless fighter fields (all 0/false). Same in Quint — every creature has a `fighterState`.
**Fix when adding a second class to Quint.** At that point, decide: (a) accept flat cost (each class adds ~7 fields to every character), or (b) refactor to a single `classState` record with per-class sub-records. Do NOT fix before then — premature abstraction with only one class.

### D. Rest actions fire fighter updates for non-fighters
`fighterShortRest` and `fighterLongRest` run on every SHORT_REST/LONG_REST regardless of class. They're no-ops when maxes are 0 (capped arithmetic produces same values), so harmless.
**Fix alongside C** — same trigger (adding second class). When refactoring class state, conditionally apply per-class rest logic.
