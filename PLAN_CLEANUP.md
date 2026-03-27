# Plan: Quint Spec Parity & Class Feature Migration

## Why Quint

TS unit tests are deterministic — they check the cases you thought to write. Quint explores the nondeterministic state space: thousands of random traces through all possible action orderings, catching bugs that arise from unexpected state combinations. MBT then proves the XState runtime matches the Quint spec field-by-field across those traces. The spec also serves as executable SRD documentation — every modeled rule traces to a specific SRD passage.

## Goal

Every class feature that affects state tracked by the XState machine should be spec'd in Quint and MBT-verified. The three layers have distinct roles:

- **Quint** (`dnd.qnt`) — formal spec, source of truth for correctness
- **XState machine** (`machine.ts`) — Quint-parity state machine, verified by MBT traces
- **TS features layer** (`app/src/features/`) — single implementation of class features, bridges to machine events via `feature-bridge.ts`

Currently only base rules (HP, damage, conditions, turns, rests, slots, grapple/shove) and 3 Fighter charge mechanics have Quint specs. The rest of Fighter and all other classes exist only in TS.

**"Quint parity" scope:** CLAUDE.md says "never add logic to XState that diverges from Quint spec." This applies to mechanics that ARE modeled in Quint. Features not yet in Quint (Tactical Mind, Champion subclass, all other classes) live only in the TS features layer — that's the current state, not a violation. The goal is to move them into Quint over time.

## Architectural constraint

Every change must pass the scaling question: **"What happens when we have all 8+ classes and all 20 levels?"** If an approach requires per-class or per-level copies of actions, step functions, init variants, driver handlers, or test infrastructure, it's the wrong approach. One `step`, one set of actions, parameterized by state variables.

---

## Current parity (Fighter)

| Fighter mechanic | Quint | XState (inline) | TS features | MBT-verified |
|-----------------|-------|-----------------|-------------|-------------|
| Second Wind (charges + healing) | ✓ | ✓ duplicate | ✓ duplicate | ✓ |
| Action Surge (charges + action grant) | ✓ | ✓ duplicate | ✓ duplicate | ✓ |
| Indomitable (charges) | ✓ | ✓ duplicate | ✓ duplicate | ✓ |
| Extra Attack tiers | ✓ | ✓ | — | ✓ |
| Fighting Styles (passive formulas) | ✓ formulas | ✗ | ✓ | ✗ |
| Tactical Mind (L2) | ✗ | ✗ | ✓ | ✗ |
| Tactical Shift (L5, on SW) | ✗ | ✗ | ✓ | ✗ |
| Champion: Improved/Superior Critical | ✗ | ✗ | ✓ | ✗ |
| Champion: Remarkable Athlete | ✗ | ✗ | ✓ | ✗ |
| Champion: Heroic Warrior (L10) | ✗ | ✗ | ✓ | ✗ |
| Champion: Survivor/Defy Death (L18) | ✗ | ✗ | ✓ | ✗ |

## Current parity (other classes)

| Layer | What's there |
|-------|-------------|
| Quint | Base rules only |
| XState | Full base rules parity (MBT-verified, 57 state fields) |
| TS features | ALL class features (Rage, Ki/Focus, Smite, Sneak Attack, Sorcery Points, etc.) |

## The duplicate problem

Second Wind, Action Surge, and Indomitable each have THREE implementations:
1. **Quint** (`dnd.qnt`) — pure functions + action wrappers
2. **XState inline** (`machine.ts` lines 326-354) — `assign()` actions that independently reimplement the same logic
3. **TS features** (`class-fighter.ts`) — pure functions used by the feature bridge

The XState inline implementations exist because the MBT bridge sends events directly to the machine (e.g., `USE_SECOND_WIND`), bypassing the features layer. The machine must handle these events with its own logic.

**Resolution options:**
- (a) MBT bridge routes through the features layer bridge (features layer becomes the single implementation, machine actions become thin pass-throughs)
- (b) Machine actions delegate to the features layer functions (imports from `class-fighter.ts`)
- (c) Accept the duplication — it's small (30 lines in machine.ts) and MBT proves they match

**Current default: (c).** The duplication is MBT-verified so it's not a correctness risk, just maintenance overhead. It doesn't block adding new features to Quint. Revisit when the duplication grows beyond Fighter or becomes a maintenance burden.

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

### B. Move inductive invariant into `dnd.qnt` ✓ (partial)

- Moved `VALID_FIGHTER_STATES` and `inductiveInv` from `dndFighterInductive.qnt` into `dnd.qnt`
- Deleted `dndFighterInductive.qnt`
- Updated `inductiveInv` to use `fighterLevel` state var: `fighterLevel.in(1.to(20))` + charge constraints against `fighterLevel`
- Apalache check 1/3 passes (inductiveInv holds in init)
- Apalache check 2/3 blocked — see "Apalache limitation" below

### Apalache limitation (non-blocking)

**What we wanted:** Apalache verifies `inductiveInv` is preserved by every step — a proof that `allInvariants` holds for ALL reachable states, not just sampled traces.

**What happened:** Apalache check 2/3 ("step preserves inductiveInv") requires every record-typed state variable to have a `var.in(SET_OF_RECORDS)` constraint before any field access. This is how Apalache learns the record shape for its SMT encoding.

For `fighterState` (7 fields, ~7K records), the `VALID_FIGHTER_STATES` set comprehension works fine. For `turnState` (13 fields, ~5.7M records), `state` (22 fields including nested records/sets, ~18.5B records), and `spellSlots` (contains `int -> int` maps), the Cartesian product via nested `map().flatten()` is astronomically large. Quint's only mechanism for expressing record sets is this enumeration pattern — there is no symbolic `[field: Int, ...]` notation like TLA+ has.

**Why it doesn't block us:**
- `quint run --invariant=allInvariants` (random simulation, 50K+ traces) provides strong coverage
- MBT (50 traces × 30 steps) proves Quint/XState field-by-field parity
- Unit tests (672+) validate individual pure functions
- The `inductiveInv` and `VALID_FIGHTER_STATES` remain in `dnd.qnt` — they're correct and useful for documentation. Apalache can verify them if Quint adds symbolic record set support in the future.

**What would unblock it:**
- Quint adding a symbolic record type expression (equivalent to TLA+'s `[field: Set, ...]` function sets)
- Or: a restricted sub-model that strips CreatureState/SpellSlotState down to just the fields Apalache needs

---

## Next: Migrate remaining Fighter features to Quint

Each feature follows the same recipe: add pure functions + action wrapper in `dnd.qnt`, add driver handler in MBT bridge. The `fighterLevel` state variable and `configForLevel` infrastructure are already in place.

**Dependencies:** E, F, and G are independent of each other. Within G, G1 and G2 both modify `FighterState` and `doStartTurn` — run them sequentially to avoid merge conflicts.

**Caveat — `configForLevel` is Champion-only.** It hardcodes Champion subclass logic (crit range thresholds, Extra Attack tiers). When adding Battle Master or Eldritch Knight, it needs to become `configForChampionLevel` or take a subclass parameter.

**Caveat — frame condition tax.** Each new state variable (e.g., `var heroicInspiration: bool`) requires adding `heroicInspiration' = heroicInspiration` to every action (~48). This is mechanical but verbose. Mitigation: bundle related fields into existing records (e.g., add `heroicInspiration` to `FighterState`) to avoid new top-level vars. See deferred item C for the eventual record-consolidation plan.

### Suggested recipe (verify against current code before following)

This is a starting point based on how SW/AS/Ind were added. The codebase may have changed — read the existing patterns in `dnd.qnt` and `machine.mbt.test.ts` before assuming these steps are complete or correct.

1. Read the TS implementation in `class-fighter.ts` — it's the SRD-accurate reference
2. Add Quint pure function(s) in `dnd.qnt` mirroring the TS logic
3. Add action wrapper with nondet parameters (study `doUseSecondWind` as a template)
4. Add action to the `step` `any { }` block
5. Add driver schema entry + handler in `machine.mbt.test.ts` (study existing handlers)
6. If adding fields to `FighterState`: update the type definition, `freshFighterState`, `VALID_FIGHTER_STATES` ranges, `inductiveInv` constraints, `QuintFighterState` Zod schema, `NormalizedState` interface, both conversion functions (`snapshotToNormalized`, `quintParsedToNormalized`), `DndContext` interface, machine context factory
7. Validate: `npx quint typecheck dnd.qnt`, `npx quint test --main=dnd dnd.qnt`, `npx quint run --main=dnd --invariant=allInvariants dnd.qnt`, `npx vitest run`

### E. Tactical Mind (Level 2)

Second Wind charge can be spent on a failed ability check to add 1d10. Charge only consumed if boosted check succeeds. Already implemented in `class-fighter.ts:104-122`. Needs: Quint pure function + action wrapper, MBT handler.

### F. Tactical Shift (Level 5, triggered by Second Wind)

On Second Wind use at L5+, move up to half speed without opportunity attacks. Already implemented in `class-fighter.ts:77`. Needs: extend `doUseSecondWind` Quint action to track shift distance, or model as a separate effect.

### G. Champion subclass features

Passive formulas already in `class-fighter.ts:199-277`. `configForLevel` already derives `critRange`. Add new fields to `FighterState` (not top-level vars) to avoid frame condition tax. Update `VALID_FIGHTER_STATES` ranges accordingly.

- G1: Heroic Warrior (L10): Grant inspiration at turn start if not already held. Add `heroicInspiration: bool` to `FighterState`, integrate into `pFighterStartTurn`.
- G2: Survivor (L18): Defy Death (death save advantage + threshold 18→20), Heroic Rally (heal 5+CON at turn start if bloodied). Integrate into `doStartTurn` / `pStartTurnFull`.
- Remarkable Athlete (L3): Advantage on Initiative + Athletics — query only, no state needed.

---

## Deferred (not blocking)

### C. Fighter state initializes for all characters
`...initialFighterState(i.fighterLevel ?? 0)` runs for every character. A Wizard gets 7 meaningless fighter fields (all 0/false). Same in Quint — every creature has a `fighterState`.
**Fix when adding a second class to Quint.** At that point, decide: (a) accept flat cost (each class adds ~7 fields to every character), or (b) refactor to a single `classState` record with per-class sub-records. Do NOT fix before then — premature abstraction with only one class.

### D. Rest actions fire fighter updates for non-fighters
`fighterShortRest` and `fighterLongRest` run on every SHORT_REST/LONG_REST regardless of class. They're no-ops when maxes are 0 (capped arithmetic produces same values), so harmless.
**Fix alongside C** — same trigger (adding second class). When refactoring class state, conditionally apply per-class rest logic.

### H. Migrate other classes to Quint (eventual)
Same pattern as Fighter: add class state var + level var, pure functions, action wrappers, MBT handlers. One class at a time. Priority order TBD based on which classes the app exercises most.
