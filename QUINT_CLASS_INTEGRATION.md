# Quint Class State Integration Guide

How to add a new class's charge/resource state to the core Quint spec (`dnd.qnt`) with full XState MBT parity. Written after integrating Fighter (Second Wind, Action Surge, Indomitable). Follow this when adding Barbarian (rage), Monk (focus points), Paladin (lay on hands, channel divinity), etc.

> **Prerequisites:** Complete `PLAN_CLEANUP.md` first. Several shortcuts were taken during the Fighter integration (duplicate charge tables, fighter state on all characters, etc.). If cleanup changes the patterns (e.g., switching to a single `classState` record or importing charge tables from `class-*.ts`), update this guide to reflect the new patterns before following it for the next class.

## Architecture

Class resources live as a **separate state variable** in `dnd.qnt`, not inside `CreatureState` or `TurnState`. This matches how `SpellSlotState` is separate — class charges aren't generic creature properties.

```
var state: CreatureState        -- HP, conditions, death saves
var turnState: TurnState        -- actions, movement, bonus action
var spellSlots: SpellSlotState  -- spell slots, concentration
var turnPhase: str              -- "outOfCombat" | "acting" | "waitingForTurn"
var fighterState: FighterState  -- Second Wind, Action Surge, Indomitable charges
```

Every action must assign **all** state variables. Adding a new var means touching every existing action.

## Step-by-step

### 1. Write a standalone POC first

Before touching `dnd.qnt`, create `dndClassName.qnt` with simplified proxy state (`hp`, `maxHp`, `inCombat`, etc.). This lets you:

- Validate the TS-to-Quint transliteration
- Write and debug invariants without fighting 2800+ lines of core spec
- Test Apalache inductive checking (see below) in isolation
- Iterate fast — `quint test` on a 400-line file is instant

The POC pure functions will copy directly into `dnd.qnt` with minimal changes.

### 2. Port pure functions from TypeScript

The `class-*.ts` files map 1:1 to Quint `pure def`. Translation rules:

| TypeScript | Quint |
|---|---|
| `Math.min(a, b)` | `intMin(a, b)` (already in dnd.qnt) |
| `Math.max(a, b)` | `intMax(a, b)` |
| `Math.floor(a / b)` | `a / b` (Quint truncates toward zero) |
| `if (x) return y` | `if (x) y else ...` (must have else) |
| `{ ...record, field: val }` | `record.with("field", val)` |
| `state.field > 0 && !used` | `state.field > 0 and not(used)` |

**Critical: use `pHeal` for healing, not raw HP math.** The POC did `intMin(hp + heal, maxHp)` but the real `pHeal` (line ~776) handles unconsciousness recovery, death save resets, and stable flag clearing. If your class feature heals, it must go through `pHeal` in the core spec.

### 3. Add to `dnd.qnt`

**Type** — after the existing type definitions (~line 110):
```quint
type BarbarianState = { rageCharges: int, rageMax: int, ... }
```

**Pure functions** — add a numbered section (e.g., `// 17.7 BARBARIAN CLASS FEATURES`). Look at the existing section numbering.

**State variable** — in the MBT infrastructure section (~line 2030):
```quint
var barbarianState: BarbarianState
```

**Constant** — near `FRESH_TURN` and `FRESH_SPELL_SLOTS`:
```quint
pure val FRESH_BARBARIAN_STATE: BarbarianState = freshBarbarianState(TEST_CONFIG.level)
```

**Init** — add to the `all { }` block:
```quint
barbarianState' = FRESH_BARBARIAN_STATE,
```

**All ~43 existing actions** — add `barbarianState' = barbarianState` to every explicit `all { }` block. The `unchanged` keyword handles it automatically (it keeps all vars the same), so only update the branches that spell out individual variable assignments.

Grep for `turnPhase' = turnPhase` to find every explicit assignment block. There are ~43 of them. This is mechanical but error-prone — missing one causes a Quint parse error ("variable not assigned"), which is at least caught at typecheck time.

**Special-case actions:**
- `doShortRest` → `barbarianState' = pBarbarianShortRest(barbarianState)`
- `doLongRest` → `barbarianState' = pBarbarianLongRest(barbarianState)`
- `doStartTurn` → `barbarianState' = pBarbarianStartTurn(barbarianState)` (reset per-turn flags)

**New actions** — add before the `step` action, then add them to the `step = any { }` block.

**Invariants** — add charge-bound invariants and include them in `allInvariants`.

### 4. Unit tests in `dndTest.qnt`

Port tests from the POC's test file. Adapt:
- Use `freshCreature(30)` for CreatureState in guard tests
- Use `FRESH_TURN` for TurnState
- Test the `pHeal` interaction (e.g., healing at 0 HP clears unconscious)
- Name tests `test_<functionName>_<scenario>` — `quint test --match` uses substring matching

**Gotcha:** `quint test --match` with `|` pipe for alternation doesn't work. Run batches: `--match "test_canUseRage"`, then `--match "test_pRage"`, etc.

### 5. XState machine parity

**`machine-types.ts`:**
- Add fields to `DndContext` interface
- Add `fighterLevel` / `barbarianLevel` / etc. to `DndMachineInput` (or a generic `classLevel`)
- Add event types to `DndEvent` union
- Add event extractor type + function
- Add `initialBarbarianState(level)` factory function (charge tables inline)

**`machine.ts`:**
- Add action handlers using `assign(({ context, event }) => { ... })`
- Guards are inline in the action (return `{}` if preconditions fail — XState pattern)
- Add `...initialBarbarianState(i.barbarianLevel ?? 0)` to context factory
- **420-line eslint limit** — if tight, extract to `machine-helpers.ts`

**`machine-states.ts`:**
- Add events to the `acting` state's `on` handlers
- Add `barbarianStartTurn` alongside `initTurn` in `START_TURN` transition
- Add `barbarianShortRest` alongside `shortRest` in `SHORT_REST` (4 places: 2 in `damageTrack.dying`, 2 in `rootEventHandlers`)
- Add `barbarianLongRest` alongside `longRest` (same 4 places)

**Don't write a `useFeatureFromZero` variant** for heal-from-0-HP paths. If the feature requires a bonus action or any action, the character can't use it while unconscious (incapacitated). The guard catches this. We wrote `useSecondWindFromZero` and it was dead code.

### 6. MBT bridge (`machine.mbt.test.ts`)

- Add `QuintBarbarianState` zod schema (all `z.bigint()` for ints, `z.boolean()` for bools)
- Extend `QuintFullState` to include new state var
- Add fields to `NormalizedState` interface
- Add mapping in both `snapshotToNormalized()` and `quintParsedToNormalized()`
- Add event names to `EventActionMap` (compile-time check catches missing ones)
- Add driver schema entries and driver implementations
- Add `barbarianLevel: X` to the `init` driver to match `TEST_CONFIG.level`

The `EventActionMap` type check is your friend — if you add an event to `DndEvent` but forget the map entry, TypeScript will error with `Missing from EventActionMap: USE_RAGE`.

### 7. Verify

Run in this order:

```bash
npx quint typecheck dnd.qnt
npx quint typecheck dndTest.qnt
npx quint test dndTest.qnt --match "test_rage"    # spot-check new tests
npx quint run --main=dnd --invariant=allInvariants --max-samples=10000 dnd.qnt
cd app && npx vitest run                           # all tests including MBT
```

The MBT test (`machine.mbt.test.ts`) generates fresh Quint traces that now include your new actions in `step`. If the XState driver doesn't handle them, you get `Unknown action: doUseRage`. This means commits 2+3 (XState + MBT bridge) can't be separated — they must ship together.

## Apalache inductive invariants

The POC validated inductive invariant checking via Apalache. This proves safety properties hold for *all* reachable states (not just sampled traces). The code was lost when the POC branch was deleted. Key lessons for recreating:

**Apalache requires `var.in(Set)` for record-typed state variables.** Field-level constraints like `barbarianState.rageCharges >= 0` aren't enough — the solver needs to know the variable's shape before accessing fields. Use:

```quint
barbarianState.in(VALID_BARBARIAN_STATES)
```

Where `VALID_BARBARIAN_STATES` is a set comprehension built with nested `map().flatten()` (Quint has no `flatMap` or `cross`):

```quint
pure val VALID_BARBARIAN_STATES: Set[BarbarianState] =
  0.to(6).map(rc =>
    0.to(6).map(rm =>
      Set(true, false).map(raging =>
        { rageCharges: rc, rageMax: rm, raging: raging, ... }
      )
    ).flatten()
  ).flatten()
  .filter(bs => bs.rageCharges <= bs.rageMax)
```

**The inductive invariant must be strong enough.** It took 4 iterations for Fighter because weak invariants allow impossible starting states. Key strengthening patterns:

- **Level-to-max relationships:** `barbarianState.rageMax == rageMaxCharges(barbarianLevel)` — without this, the solver finds states where level=1 but rageMax=6, which can't happen from `init`
- **Cross-variable coupling:** `not(actionSurgeUsedThisTurn) implies actionsRemaining <= 1` — without this, Action Surge can push actions past the bound
- **Tight integer ranges:** Use `actionsRemaining.in(0.to(2))` not `0.to(10)` — wider ranges let the solver find spurious counterexamples

**Run inductive check:**
```bash
export PATH="$HOME/.local/java/jdk-17.0.18+8-jre/bin:$PATH"
npx quint verify --main=dnd \
  --invariant=allInvariants \
  --inductive-invariant=inductiveInv \
  dnd.qnt
```

Apalache checks three things: (1) init implies inductiveInv, (2) step preserves inductiveInv, (3) inductiveInv implies allInvariants. All three must pass.

**Apalache may timeout on the full model** (5+ state vars, 43+ actions). Consider writing inductive invariants in a separate sub-model file that imports from `dnd` but uses a restricted `step` with fewer actions, or verify per-class in isolation like the POC did.

**Java:** Apalache needs Java 17+. Install with:
```bash
mkdir -p ~/.local/java
curl -sL "https://api.adoptium.net/v3/binary/latest/17/ga/linux/$(uname -m | sed 's/x86_64/x64/')/jre/hotspot/normal/eclipse" -o /tmp/jre.tar.gz
cd ~/.local/java && tar xzf /tmp/jre.tar.gz
export PATH="$HOME/.local/java/jdk-*/bin:$PATH"
```

## Candidates for next integration

| Class | Resource | State fields | Complexity |
|---|---|---|---|
| Barbarian | Rage charges | rageCharges, rageMax, raging, rageTurnsRemaining, attackedThisTurn, rageExtendedWithBA, recklessThisTurn, frenzyUsedThisTurn, intimidatingPresenceUsed, relentlessRageTimesUsed | High — rage interacts with turn lifecycle, damage, concentration |
| Monk | Focus points | focusPoints, focusMax, uncannyMetabolismUsed, wholenessOfBodyCharges/Max, quiveringPalmActive, deflectAttacksUsedThisRound | Medium — focus expenditure is straightforward |
| Paladin | Lay on Hands, Channel Divinity | layOnHandsPool/Max, smiteFreeUsed, faithfulSteedUsed, channelDivinityCharges/Max | Medium — pool-based healing + charge tracking |
| Rogue | Per-turn flags | sneakAttackUsedThisTurn, steadyAimUsed, strokeOfLuckUsed | Low — no cross-rest charges, just turn flags |

All have pure functions already implemented in `class-*.ts` and tested. The TS-to-Quint transliteration is mechanical.

## Feature-store migration path

After a class's charges are in Quint+XState core, the `feature-store.ts` state for that class becomes **redundant**. For Fighter, both `FighterFeatureState` (in feature-store) and `DndContext` (in machine) now track `secondWindCharges`, `actionSurgeCharges`, etc. in parallel.

The migration: make the feature-bridge emit machine events (`USE_SECOND_WIND`, `USE_ACTION_SURGE`) instead of managing `FighterFeatureState` via `featureReducer`. The hook reads charges from machine context instead of feature state. This eliminates the parallel state and makes the machine the single source of truth.

This migration is NOT required when adding a new class to Quint. It's a follow-up optimization. Both systems coexist safely — the feature-store is used by the UI, the machine state is used by MBT.

## MBT coverage limitations

`TEST_CONFIG` in `dnd.qnt` is a **level 5 Fighter, Champion subclass**. All MBT traces run against this specific config. This means:

- Second Wind max=3 (L4-9 range) — tested by MBT
- Action Surge max=1 (L2-16 range) — tested by MBT
- Indomitable max=0 (below L9) — **never exercised by MBT traces**
- `doUseIndomitable` always hits the `unchanged` branch in MBT

Indomitable correctness relies on unit tests in `dndTest.qnt` only.

When adding a new class, check which features are active at `TEST_CONFIG.level` and which are unreachable. Unit-test the unreachable ones thoroughly.

## Common mistakes

1. **Forgetting `fighterState' = fighterState` on one action** — causes Quint typecheck error. Grep for `turnPhase' = turnPhase` to find all spots.
2. **Writing a `useFeatureFromZero` action for heal-from-0-HP** — if the feature requires an action/bonus action, unconscious creatures can't use it. The incapacitated guard handles this. Don't write dead code.
3. **Separating XState and MBT bridge into separate commits** — MBT traces include new Quint actions immediately. The driver must handle them or the test crashes with `Unknown action`. Ship XState + bridge together.
4. **Using `flatMap` in Quint** — doesn't exist. Use `map().flatten()` instead.
5. **Using `|` alternation in `quint test --match`** — doesn't work. Run multiple `--match` invocations.
6. **Circular `var == { ...var.field... }` in Apalache** — the solver needs `var.in(Set)` where the RHS doesn't reference `var`. Build the set independently.
7. **Testing invariant vals with `--match`** — if your invariant is named `secondWindBounded`, `--match "secondWind"` will try to run it as a test and fail. Prefix tests with `test_` and always match with `test_`.
