# Plan: Cleanup & Restore Inductive Invariants

## Architectural constraint

Every change must pass the scaling question: **"What happens when we have all 8+ classes and all 20 levels?"** If an approach requires per-class or per-level copies of actions, step functions, init variants, driver handlers, or test infrastructure, it's the wrong approach. One `step`, one set of actions, parameterized by state variables.

---

## TODO

### A. Make `fighterLevel` a state variable and derive config from it

**Why:** Fighter actions hardcode `TEST_CONFIG.level` (= 5) and `doStartTurn` hardcodes the full `TEST_CONFIG` (including a wrong `critRange: 20` — Champion gets Improved Critical at L3, should be 19). The L9 config works around this with duplicated actions (`doUseSecondWindL9`, `doUseIndomitableL9`, `doLongRestL9`), a separate `step9`, and a separate `init9`. This doesn't scale — N classes × M levels = combinatorial explosion.

**What changes:**

#### A1. Add state variable and config derivation

1. Add `var fighterLevel: int` to state variables in `dnd.qnt`
2. Add `fighterLevel' = fighterLevel` frame condition to every action (~48 actions). This is required by Quint semantics — unspecified next-state vars are unconstrained. Mechanical: append to each `all { ... }` block.
3. Add `pure def configForLevel(level: int): CharConfig` that derives the 4 level-dependent fields from a static `BASE_CHAMPION_CONFIG`:
   - `level` — the level itself
   - `classLevels` — `singleClassLevels(Fighter, level)`
   - `critRange` — 18 at L15+ (Superior Critical), 19 at L3+ (Improved Critical), 20 otherwise
   - `features` — Extra Attack at L5+, Extra Attack(2) at L11+, Extra Attack(3) at L20

   The other 14 CharConfig fields are static (className, subclass, species, abilityScores, size, speeds, proficiencies, etc.) and come from the base config.

#### A2. Replace hardcoded config references

4. `doStartTurn`: replace `pStartTurnFull(TEST_CONFIG, ...)` with `pStartTurnFull(configForLevel(fighterLevel), ...)`. This also fixes the latent critRange bug.
5. `doUseSecondWind`: replace `TEST_CONFIG.level` with `fighterLevel`
6. `doUseIndomitable`: replace `TEST_CONFIG.level` with `fighterLevel`
7. `doLongRest`: replace `pLongRest(state, 5)` with `pLongRest(state, fighterLevel)`

#### A3. Unify init with nondet level

8. Replace `init` and `init9` with a single `init` that picks the level nondeterministically:
   ```
   action init = {
     nondet l = Set(5, 9).oneOf()
     nondet maxHp = HP_RANGE.oneOf()
     all {
       fighterLevel' = l,
       state' = freshCreature(maxHp).with("hitPointDiceRemaining", l),
       fighterState' = freshFighterState(l),
       turnState' = FRESH_TURN,
       spellSlots' = FRESH_SPELL_SLOTS,
       turnPhase' = "outOfCombat",
     }
   }
   ```
   The Quint simulator and MBT runner explore both levels in a single run. The `@firfi/quint-connect` runner passes nondet picks (`l`, `maxHp`) to the driver handler — this is the standard mechanism (same as how `d10Roll` reaches `doUseSecondWind`).

#### A4. Delete all L9 duplicates

9. Delete `init9`, `step9`, `doUseSecondWindL9`, `doUseIndomitableL9`, `doLongRestL9`
10. Delete `TEST_CONFIG_L9`, `FRESH_FIGHTER_STATE_L9`
11. `TEST_CONFIG` can stay as a test convenience (e.g., `pure val TEST_CONFIG = configForLevel(5)`) or be removed if nothing else references it

#### A5. Update MBT bridge (`machine.mbt.test.ts`)

12. Driver schema: `init` gets `{ l: ITFBigInt, maxHp: ITFBigInt }`. Remove `init9`, `step9`, `doLongRestL9`, `doUseSecondWindL9`, `doUseIndomitableL9` from schema.
13. Driver factory `createDndDriver`: no longer takes `fighterLevel` or `hitDiceTotal` params. The `init` handler reads `l` from the nondet pick and uses it to configure the XState actor (fighterLevel, hitDiceRemaining, etc.).
14. `doUseSecondWind` handler: needs `fighterLevel` from the actor's current context (already available via snapshot), not from the factory closure.
15. `doLongRest` handler: same — reads `hitDiceTotal` (= fighterLevel for single-class) from context.
16. Single `run()` call in the test — no `init:` / `step:` overrides needed.

#### A6. Validate

17. `npx quint typecheck dnd.qnt`
18. `npx quint test --main=dnd dnd.qnt` (672+ unit tests)
19. `npx quint run --main=dnd --invariant=allInvariants dnd.qnt` (random simulation)
20. `npx vitest run` (MBT traces — L5 and L9 explored in single run)

---

### B. Move inductive invariant into `dnd.qnt` and establish Apalache verification

**Depends on:** A

**Why:** `dndFighterInductive.qnt` exists as a separate file but imports everything from `dnd` anyway — no reason for the separation. The inductive invariant currently hardcodes `TEST_CONFIG.level`; with `fighterLevel` as a state var, it must constrain the level range instead. This section establishes the architecture for Apalache verification — a pattern that scales as we add more classes and state variables.

**Fix:**

1. Move `VALID_FIGHTER_STATES` and `inductiveInv` from `dndFighterInductive.qnt` into `dnd.qnt` (alongside `allInvariants`)
2. Delete `dndFighterInductive.qnt`
3. Add `fighterLevel.in(1.to(20))` to `inductiveInv`. D&D levels are 1-20; this is self-documenting and covers all possible charge function outputs. The `VALID_FIGHTER_STATES` structural bounds (swM 0-4, asM 0-2, indM 0-3) already accommodate all 20 levels — no changes needed there.
4. Replace hardcoded max-charge constraints:
   ```
   // old: fighterState.secondWindMax == secondWindMaxCharges(TEST_CONFIG.level)
   // new: fighterState.secondWindMax == secondWindMaxCharges(fighterLevel)
   ```
   Same for `actionSurgeMax` and `indomitableMax`. This works because `fighterLevel` is frozen after init — no action changes it, so the constraint is trivially preserved.
5. Fix Apalache "variable used before assigned" errors: add `.in(Set)` constraints for record-typed vars (`turnState`, `state`, `spellSlots`). This is iterative — run Apalache, read counterexample, strengthen invariant, repeat.
6. Verification command:
   ```bash
   npx quint verify --main=dnd \
     --invariant=allInvariants \
     --inductive-invariant=inductiveInv \
     dnd.qnt
   ```
7. All 3 checks must pass:
   - `[1/3] inductiveInv holds in init` — init produces levels in 1..20, trivially satisfied
   - `[2/3] step preserves inductiveInv` — no action changes fighterLevel or max charges, so level/max constraints are preserved; fighter charge bounds are maintained by action logic
   - `[3/3] inductiveInv implies allInvariants` — allInvariants only checks structural bounds (charges <= max), which inductiveInv subsumes

**Troubleshooting:**
- **"Variable X used before assigned"** — Apalache needs every state var constrained with `.in()` or `==` before field access. Start with field-level bounds; if rejected, build `VALID_*_STATES` set comprehensions
- **Timeout** — model has 6 state vars and 45+ actions. Try `--max-steps=5` or temporarily comment out unrelated actions from `step`
- **Quint has no `flatMap` or `cross`** — use nested `map().flatten()` chains

**Notes:**
- The `inductiveInv` constraints are discovered iteratively — each one added because Apalache found a counterexample without it
- `allInvariants` is still checked by `quint run` (random simulation). The inductive invariant is a strictly stronger guarantee
- **Scaling pattern:** when adding a new class (e.g., `var wizardLevel: int`), add `wizardLevel.in(1.to(20))` and analogous max-charge constraints to `inductiveInv`. Same structure, no architectural changes needed.

---

## Deferred (not blocking)

### C. Fighter state initializes for all characters
`...initialFighterState(i.fighterLevel ?? 0)` runs for every character. A Wizard gets 7 meaningless fighter fields (all 0/false). Same in Quint — every creature has a `fighterState`.
**Fix when adding a second class to Quint.** At that point, decide: (a) accept flat cost (each class adds ~7 fields to every character), or (b) refactor to a single `classState` record with per-class sub-records. Do NOT fix before then — premature abstraction with only one class.

### D. Rest actions fire fighter updates for non-fighters
`fighterShortRest` and `fighterLongRest` run on every SHORT_REST/LONG_REST regardless of class. They're no-ops when maxes are 0 (capped arithmetic produces same values), so harmless.
**Fix alongside C** — same trigger (adding second class). When refactoring class state, conditionally apply per-class rest logic.
