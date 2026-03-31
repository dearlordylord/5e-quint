# Plan: Quint Spec Parity & Class Feature Migration

## Why Quint

TS unit tests are deterministic — they check the cases you thought to write. Quint explores the nondeterministic state space: thousands of random traces through all possible action orderings, catching bugs that arise from unexpected state combinations. MBT then proves the XState runtime matches the Quint spec field-by-field across those traces. The spec also serves as executable SRD documentation — every modeled rule traces to a specific SRD passage.

## Goal

Every class feature that affects state tracked by the XState machine should be spec'd in Quint and MBT-verified. The three layers have distinct roles:

- **Quint** (`dnd.qnt`) — formal spec, source of truth for correctness
- **XState machine** (`machine.ts`) — Quint-parity state machine, verified by MBT traces
- **TS features layer** (`app/src/features/`) — single implementation of class features, bridges to machine events via `feature-bridge.ts`

All 12 SRD classes are now spec'd in Quint with MBT parity. Fighter (Champion) has the deepest coverage; other classes have 1-3 core resource mechanics each.

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
| `useIndomitable` | `useIndomitable()` | ✓ delegates |
| `useTacticalMind` | `useTacticalMind()` | ✓ delegates |
| `useHeroicInspiration` | — | ✓ inline — one-liner boolean flip, identity function not worth extracting |
| `scoreCriticalHit` | `remarkableAthleteCritMovement()` | ✓ delegates — wraps distance into bonus movement fields |
| `fighterStartTurn` | `heroicWarriorInspiration()` | ✓ delegates (pre-existing) |
| `fighterShortRest` | `fighterShortRest()` | ✓ delegates — return shape matches context patch |
| `fighterLongRest` | `fighterLongRest()` | ✓ delegates — added `indomitableCharges` reset to TS function |

### Implementation notes

1. **Guards stay in machine actions.** The `if (...) return {}` guard checks remain inline in the `assign()` — they're XState's job. The TS pure functions assume preconditions are met.

2. **Branded types handled at the boundary.** `useSecondWind` returns raw `number` for HP; machine wraps with `hp()`. One-line conversion, not duplicated logic.

3. **One action stayed inline** after `/simplify` convergence:
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

## TODO

### DONE: Turn phase guard added to TS feature preconditions

`useFeatures.ts` (and extracted hooks `useMonkPaladinFeatures`, `useRogueFeatures`) now gate all combat features behind `isActing = snapshot.matches({ turnPhase: "acting" })`. The UI no longer shows features as available outside the acting phase. TODO in code to eventually move gating into `canExecute*` bridge functions.

### DONE: Trace visualizer XState column comes from real machine

`trace-replay.ts` replays events through the real `dndMachine` via `snapshotToNormalized()`. The Quint column is hand-written expected values ("spec says"). The XState column is real machine output ("implementation produces"). Mismatches are real bugs.

**Verification status:**

| Aspect | Source | MBT-verified? |
|--------|--------|:---:|
| NormalizedState shape (field names, types) | Matches `machine.mbt.test.ts` | yes |
| State transition logic (pUseSecondWind, pTakeDamage, etc.) | Quint spec, field-by-field comparison | yes |
| Fighter charge values (SW max=3 at L5, AS max=1) | Quint spec tables | yes |
| Action economy rules (action decrements, bonus action flags) | Quint spec | yes |
| Condition implications (unconscious -> prone + incapacitated) | Quint spec | yes |
| Death save mechanics (nat 20 = 1 HP, success/fail counting) | Quint spec | yes |
| HP/damage math (resistance, overflow, temp HP) | Quint spec | yes |
| End turn preserves turnState | Quint spec (`turnState' = turnState`) | yes |
| Per-step XState state values | Real machine replay via `trace-replay.ts` | **yes (at render time)** |
| The specific trace (which actions, what order) | Hardcoded in `sample-trace.ts` | no |
| Dice rolls (d10=7, death save=14, nat 20) | Hardcoded | no |
| Damage amounts (18, 50) | Hardcoded | no |
| Per-step Quint state values (hp=38 after heal) | Hand-computed expected values | no |
| Descriptions ("Ogre crits for 50...") | Flavor text | no |
| Quint snippets | Hand-extracted from dnd.qnt | no (reviewed) |

---

## Creature correctness hardening (universal — benefits PCs today, prerequisite for PLAN_MONSTERS.md)

Research during monster architecture planning (2026-03-28) revealed correctness gaps in the current spec that affect PCs today, independent of monster support. These must be fixed regardless of whether monsters are ever implemented.

### E. BUG: Ongoing damage ignores creature resistances/vulnerabilities

**Status:** DONE (2026-03-28) — E1 and E2 both complete, A11 added to ASSUMPTIONS.md
**Priority:** High — this is a correctness bug per RAW

`pProcessEndOfTurnDamage` (dnd.qnt:~1607) and `pProcessStartOfTurn` (dnd.qnt:~1636) both call `pTakeDamage` with empty sets for R/V/I:

```quint
val newS = pTakeDamage(acc.creature, dmg.damage, dmg.damageType, Set(), Set(), Set(), false)
```

This means a creature with fire resistance taking ongoing fire damage (e.g., from Heat Metal) takes full damage. RAW: resistances always apply unless explicitly stated otherwise.

**Fix:** Add R/V/I to the event types (`EndOfTurnDamage` and `StartOfTurnEffect`) so the caller provides them. This is consistent with the existing "caller provides everything" pattern — both types already carry `damageType`.

**Nondeterministic R/V/I pattern:** Use single-element sets like `doTakeDamageWithMods` does (line ~2344): `nondet resType = DAMAGE_TYPES.oneOf()` → `Set(resType)`. Avoids `powerset()` state-space explosion.

**Split into two independent sub-tasks** (different types, functions, actions, MBT handlers):

#### E1. End-of-turn damage R/V/I

Checklist:
1. `dnd.qnt`: Add `resistances: Set[DamageType]`, `vulnerabilities: Set[DamageType]`, `immunities: Set[DamageType]` fields to `EndOfTurnDamage` type (~line 500)
2. `dnd.qnt`: Update `pProcessEndOfTurnDamage` (~line 1607) to pass `dmg.resistances`, `dmg.vulnerabilities`, `dmg.immunities` to `pTakeDamage` instead of `Set(), Set(), Set()`
3. `dnd.qnt`: Update `doEndTurn` action (~line 2653) — add `nondet resType/vulnType/immType = DAMAGE_TYPES.oneOf()`, include in damages list
4. `dndTest.qnt`: Update any test calls that construct `EndOfTurnDamage` records
5. `machine.mbt.test.ts`: Update `doEndTurn` handler to parse and pass R/V/I sets
6. XState: Update `END_TURN` event type in `machine-types.ts` to carry R/V/I per damage entry
7. XState: Update machine handler to pass R/V/I through to damage computation
8. Validate: `quint typecheck` + `quint test` + `quint run --invariant` + `vitest run`

#### E2. Start-of-turn damage R/V/I

Checklist:
1. `dnd.qnt`: Add `resistances: Set[DamageType]`, `vulnerabilities: Set[DamageType]`, `immunities: Set[DamageType]` fields to `StartOfTurnEffect` type (~line 505)
2. `dnd.qnt`: Update `pProcessStartOfTurn` (~line 1651) to pass R/V/I to `pTakeDamage` instead of `Set(), Set(), Set()`
3. `dnd.qnt`: Update `doStartTurn` action (~line 2418) — add nondeterministic R/V/I, include in effects list
4. `dndTest.qnt`: Update any test calls that construct `StartOfTurnEffect` records
5. `machine.mbt.test.ts`: Update `doStartTurn` handler to parse and pass R/V/I sets
6. XState: Update `START_TURN` event type in `machine-types.ts` to carry R/V/I per effect entry
7. XState: Update machine handler to pass R/V/I through to damage computation
8. Validate: same pipeline

**ASSUMPTIONS.md entry (after E1 or E2):** Document that ongoing damage respects creature R/V/I, which is RAW but easy to miss.

### F. Condition immunity enforcement in pApplyCondition

**Status:** DONE (2026-03-28)
**Priority:** High — prerequisite for correct creature modeling

`pApplyCondition(s: CreatureState, c: Condition)` unconditionally applies any condition. It has no immunity check. This is incorrect per RAW — creatures can have condition immunities (Undead: Poisoned; Constructs: various; PCs via class features: Paladin L10 Frightened immunity from Aura of Courage).

**Fix:** Add a `conditionImmunities: Set[Condition]` parameter:

```quint
pure def pApplyCondition(s: CreatureState, c: Condition, immunities: Set[Condition]): CreatureState =
  if (immunities.contains(c)) s
  else match c { ... }  // existing logic
```

All existing call sites pass `Set()` (no immunities) — backward compatible. When species/class features add immunities, they'll pass the relevant set.

Checklist:
1. `dnd.qnt`: Change `pApplyCondition` signature (~line 613) to add `immunities: Set[Condition]`; add guard
2. `dnd.qnt`: Update all 10 pure-function call sites to pass `Set()` (lines ~779, 848, 1231, 1268, 1324, 1360, 1416, 1779, 1799, 2383)
3. `dnd.qnt`: Update `doApplyCondition` action (~line 2383) — add nondeterministic immunities set
4. `dndTest.qnt`: Update all test call sites (~15) to pass `Set()`
5. `machine.mbt.test.ts`: Update `doApplyCondition` handler to parse and pass immunities
6. XState: Update `APPLY_CONDITION` event type to accept `conditionImmunities`
7. XState: Update machine handler to pass immunities through
8. Validate: `quint typecheck` + `quint test` + `quint run --invariant` + `vitest run`

**MBT impact:** Low. Existing MBT actions that call `pApplyCondition` pass `Set()`. The parameter is additive.

### G. Exhaustion immunity enforcement in pAddExhaustion

**Status:** DONE (2026-03-28)
**Priority:** High — prerequisite for correct creature modeling

`pAddExhaustion(s: CreatureState, levels: int)` unconditionally adds exhaustion. Some creatures are immune (SRD: all Undead, many Constructs). Some PC effects may also grant temporary exhaustion immunity in the future.

**Fix:** Add an `exhaustionImmune: bool` parameter:

```quint
pure def pAddExhaustion(s: CreatureState, levels: int, exhaustionImmune: bool): CreatureState =
  if (exhaustionImmune) s
  else { ... }  // existing logic
```

All existing call sites pass `false` — backward compatible.

Checklist:
1. `dnd.qnt`: Change `pAddExhaustion` signature (~line 663) to add `exhaustionImmune: bool`; add guard
2. `dnd.qnt`: Update call sites: `pApplyStarvation` (~line 1839), `pApplyDehydration` (~line 1843), `doAddExhaustion` (~line 2395)
3. `dnd.qnt`: Update `doAddExhaustion` action — add `nondet exhaustionImmune = Bool.oneOf()`
4. `dndTest.qnt`: Update all test call sites (~15) to pass `false`
5. `machine.mbt.test.ts`: Update `doAddExhaustion` handler to parse and pass `exhaustionImmune`
6. XState: Update `ADD_EXHAUSTION` event type to accept `exhaustionImmune`
7. XState: Update machine handler to pass through
8. Validate: `quint typecheck` + `quint test` + `quint run --invariant` + `vitest run`

**Note:** Exhaustion is NOT one of the 14 Conditions in the SRD (it's a separate mechanic with levels 1-6). It cannot be in `conditionImmunities: Set[Condition]`. The Skeleton stat block lists "Immunities: Poison; Exhaustion, Poisoned" — Exhaustion immunity is listed alongside condition immunities but is mechanically distinct.

### H2. Death saves are PC-only (documentation + guard)

**Status:** DONE (2026-03-28)
**Priority:** Medium — correctness documentation; becomes enforcement when monsters are added

The SRD is explicit: "A **player character** must make a Death Saving Throw if they start their turn with 0 Hit Points." `pTakeDamage` currently enters the death-save track (unconscious, death save failures on subsequent hits) for all creatures. This is correct for PCs but wrong for monsters (who die at 0 HP).

**Immediate fix (no monsters):** Add a comment to `pTakeDamage` and `pStartTurnFull` documenting that the death-save track is PC-only per RAW. No behavioral change needed while only PCs use the spec.

**Future fix (with monsters):** PLAN_MONSTERS.md Phase 0 adds a `creatureKind` discriminator to gate death saves vs. instant death.

Checklist:
1. `dnd.qnt`: Add comment to `pTakeDamage` (~line 748) noting death-save track is PC-only per RAW
2. `dnd.qnt`: Add comment to `pStartTurnFull` (~line 1668) noting death-save roll is PC-only per RAW
3. `ASSUMPTIONS.md`: Add entry documenting that current spec applies death saves universally (correct while only PCs use the spec)
4. Validate: `quint typecheck` (comment-only, verify no breakage)

### I. UBIQUITOUS_LANGUAGE.md: Creature / Stat Block / Character Sheet terms

**Status:** DONE (2026-03-28)

Added "Creatures and Stat Blocks" section with: Creature, Stat Block, Character Sheet, Creature Type, Challenge Rating, Multiattack, Legendary Action, Recharge. Plus relationship entries and example dialogue.

### Execution order

Five atomic tasks, no dependencies between them except E1 before E2 (same bug, shared ASSUMPTIONS.md entry):

| Order | Task | Scope | Risk |
|-------|------|-------|------|
| 1 | **F** | `pApplyCondition` + 10 call sites + MBT + XState | Low — additive parameter, all sites pass `Set()` |
| 2 | **G** | `pAddExhaustion` + 5 call sites + MBT + XState | Low — additive parameter, all sites pass `false` |
| 3 | **E1** | `EndOfTurnDamage` type + `pProcessEndOfTurnDamage` + `doEndTurn` + MBT + XState | Medium — new fields on event type, single-element nondeterministic sets |
| 4 | **E2** | `StartOfTurnEffect` type + `pProcessStartOfTurn` + `doStartTurn` + MBT + XState | Medium — same pattern as E1 |
| 5 | **H2** | Comments + ASSUMPTIONS.md only | None — documentation only |

F and G can run in parallel (completely independent, similar pattern). E1 and E2 are independent but share the ASSUMPTIONS.md entry — do E1 first, add the entry, E2 references it.

### Research direction: further architecture improvements

During monster research we identified that `CharConfig` mixes PC build info (class, subclass, species, level) with combat-facing stats (ability scores, size, speeds, proficiencies). This is fine while only PCs use the spec, but worth noting as a future refactor candidate when the model grows. The research showed that the SRD's own architecture separates the *derivation* (character creation) from the *combat interface* (creature properties), but there is no SRD term for a shared combat config type — the universal term is just "creature." The existing parameter-passing pattern on pure functions is the correct shared interface.

**Do NOT refactor CharConfig preemptively.** The current design works. Revisit when either (a) a second class is added to Quint (see deferred item C/H above), or (b) monsters are implemented (PLAN_MONSTERS.md).

**Species-derived R/V/I for PCs:** Once items F and G add immunity parameters, existing PC call sites pass empty sets / false. Populating them from species traits (e.g., Dwarf poison resistance — note: SRD 5.2.1 Dwarves get resistance, not immunity; Elves get advantage on Charmed saves, not immunity) is a separate effort. Do not bundle with F/G or with PLAN_MONSTERS.md — species feature modeling is its own scope.

---

## Deferred (not blocking — do NOT implement without explicit owner request)

### C. All class states initialize for all characters
Every class init (`...initialFighterState(0)`, `...initialBarbarianState(0)`, etc.) runs for every character. A Wizard gets 7 meaningless fighter fields, 11 barbarian fields, 5 ranger fields, etc. — all zero/false. Same in Quint — every creature has all 12 class state vars. With 12 classes, this is ~80 unused context fields per character.
**Fix:** (a) Accept flat cost (each class adds ~5-10 fields), or (b) refactor to a single `classState` discriminated union or sub-record that only holds the active class. Option (b) is shared with item J (lifecycle dispatch). See also item D (rest actions).

### D. Rest/lifecycle actions fire for all 12 classes regardless of active class
`fighterShortRest`, `barbarianShortRest`, ..., `bardShortRest` all run on every SHORT_REST regardless of which class the character actually is. Same for LONG_REST (12 actions) and START_TURN (12 actions). They're no-ops when level is 0, so harmless but wasteful.
**Fix alongside C and J** — conditional dispatch or class state consolidation eliminates all three issues together.

### J. No-op lifecycle stubs run for every class on every turn/rest

**Identified:** 2026-03-31 during Ranger + Bard /simplify review

Every class has `{class}StartTurnUpdate`, `{class}ShortRestUpdate`, `{class}LongRestUpdate` as separate XState actions called unconditionally on every `START_TURN`, `SHORT_REST`, and `LONG_REST` event. When a character is NOT that class (level 0), the function does `if (c.xxxLevel === 0) return {}` — allocating an empty object and running the XState assign merge for zero effect. With 12 classes, each start-of-turn fires 12 lifecycle actions, 12 empty-object allocations, and 12 no-op merges for 11 of them.

Same issue in Quint: the frame conditions update all 12 class state vars on every action (always as identity assignments for non-active classes). This is the "frame condition tax" noted in the Caveats section.

**Fix:** Two options:
- **(a) Conditional dispatch:** In `machine-states.ts`, wrap each class lifecycle call in a guard that checks `{class}Level > 0`. XState supports guards on individual actions in an action array — or use a single "dispatchClassLifecycle" action that conditionally calls only the relevant class.
- **(b) Record consolidation (shared with C):** Bundle all class states into a single `classStates` record, dispatch to the active class only. Eliminates both the per-action overhead and the per-var frame condition tax.

**When to fix:** Option (a) is cheap and standalone. Option (b) is the deeper fix shared with deferred item C. Do (a) as a quick win anytime; do (b) when refactoring class state architecture.

### K. Duplicate `*ExtraAttacks` one-liners across classes

**Identified:** 2026-03-31 during Ranger + Bard /simplify review

`barbarianExtraAttacks`, `monkExtraAttacks`, and `rangerExtraAttacks` are identical one-liner functions (`level >= 5 ? 1 : 0`) in three separate `machine-*.ts` files. Fighter has a different progression (3 tiers) in `features/class-fighter.ts`. Paladin also gets Extra Attack at L5 (not yet modeled in Quint extra-attack chain but should be).

**Fix:** Extract a shared `standardExtraAttacks(classLevel: number): number` utility and have barbarian/monk/ranger/paladin delegate to it. Fighter keeps its own `fighterExtraAttacks` (different progression). Place in `machine-helpers.ts` or `srd-constants.ts`.

**When to fix:** Low priority standalone — three one-liners is harmless. But if paladin or more classes add Extra Attack, the duplication will grow. Fix on next class integration or during a dedup sweep.

### M. `tirelessTempHp` parameter name mismatch

**Identified:** 2026-03-31 during Ranger + Bard /simplify review

`tirelessTempHp(d8Roll: number, wisMod: number)` in `class-ranger.ts` takes a parameter named `wisMod` and applies `Math.max(1, wisMod)`. But `machine-ranger.ts` passes `c.tirelessMax` (which is already `Math.max(1, wisMod)`). The double-clamp is idempotent so the result is correct, but the parameter name is misleading — the callee thinks it's receiving a raw WIS modifier, but it's actually receiving a pre-clamped charge max.

**Fix:** Either (a) rename the parameter to `wisModOrMax` with a doc comment explaining both call patterns work, or (b) add a separate `tirelessTempHpFromMax(d8Roll: number, tirelessMax: number): number` that doesn't re-clamp, or (c) just rename to `wisComponent` since that's what it semantically is — the WIS-derived part of the formula.

**When to fix:** Low priority cosmetic. Fix during next ranger feature work or a naming cleanup.

### H. Migrate other classes to Quint — DONE (all 12 classes)
All 12 SRD classes now have Quint state, lifecycle, guards, transitions, actions, and MBT parity.
Completed: Fighter, Barbarian, Monk (prior), then Wizard, Rogue, Cleric, Paladin (Batch 1), then Warlock, Sorcerer, Druid (Batch 2), then Ranger, Bard (Batch 3).
Each class has a dedicated `machine-{class}.ts` delegating to `features/class-{class}.ts`.

**Remaining:** Each class models only 1-3 core resource mechanics. Many TS features are not yet in Quint — adding more follows the same pattern: guard → transition → action → MBT handler.

**All existing TS feature files (Barbarian, Monk, Paladin, Rogue, Sorcerer, etc.) and their UI components are working implementations — they are NOT dead code and must NOT be deleted.**

**Frame condition verification recipe** (learned from Monk integration): After bulk-replacing `barbarianLevel' = barbarianLevel` → appending the new class vars, some actions get missed due to line-ending variations (single-line actions ending with bare newline before `}`, multi-line actions with different indent depths). To catch stragglers:
```bash
grep -n "barbarianLevel' = barbarianLevel" dnd.qnt | grep -v "newClassState'"
```
This finds every frame condition that has the *previous* class but is missing the *new* class. Fix all hits before typechecking. The typecheck will also catch mismatches (Quint's `any { }` requires all branches to update the same set of vars), but the grep is faster for bulk verification.
