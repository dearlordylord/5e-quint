# Plan: Cleanup & Restore Inductive Invariants

## Part 1: Corners cut during fighter charge integration

These are hacks and shortcuts taken during the Fighter Quint integration. Not blocking, but should be cleaned up.

### ~~1. `initialFighterState` duplicates charge tables~~ DONE
`machine-types.ts:initialFighterState()` has inline charge table logic that copies `secondWindMaxCharges`, `actionSurgeMaxCharges`, `indomitableMaxCharges` from `class-fighter.ts`. Two sources of truth.
**Fix:** Delete the inline logic in `initialFighterState()`. Import and call `secondWindMaxCharges`, `actionSurgeMaxCharges`, `indomitableMaxCharges` from `#/features/class-fighter.ts`. The function signature and return shape stay the same.

### 2. `TEST_CONFIG.level` hardcoded in Quint actions
All fighter actions in `dnd.qnt` use `TEST_CONFIG.level` (= 5) instead of a variable. The pure functions correctly take `fighterLevel` as a parameter, but the action wrappers bake it in. Same in the MBT driver (`fighterLevel: 5`). Not fixable without making `fighterLevel` a state var or adding it to `CharConfig` — both are larger changes. Acceptable since MBT only tests one config. Unit tests cover other levels.
**No code fix.** Document this in `QUINT_CLASS_INTEGRATION.md` under "MBT coverage limitations" (already done).

### 3. Fighter state initializes for all characters
`...initialFighterState(i.fighterLevel ?? 0)` runs for every character. A Wizard gets 7 meaningless fighter fields (all 0/false). Same in Quint — every creature has a `fighterState`.
**Fix when adding a second class to Quint.** At that point, decide: (a) accept flat cost (each class adds ~7 fields to every character), or (b) refactor to a single `classState` record with per-class sub-records. Do NOT fix before then — premature abstraction with only one class.

### 4. Rest actions fire fighter updates for non-fighters
`fighterShortRest` and `fighterLongRest` run on every SHORT_REST/LONG_REST regardless of class. They're no-ops when maxes are 0 (capped arithmetic produces same values), so harmless.
**Fix alongside #3** — same trigger (adding second class). When refactoring class state, conditionally apply per-class rest logic.

### ~~5. `doUseIndomitable` missing turn phase guard — Quint↔XState divergence (BUG)~~ DONE
Second Wind and Action Surge check `turnPhase != "acting"` in `dnd.qnt`, but `doUseIndomitable` doesn't (line ~2609). XState routes `USE_INDOMITABLE` only in the `acting` state (`machine-states.ts:161`), so XState is correct. This is a **parity divergence** — Quint allows Indomitable out of combat, XState doesn't.
**Fix in `dnd.qnt` only:** Change `doUseIndomitable` from:
```quint
action doUseIndomitable = {
  if (not(canUseIndomitable(TEST_CONFIG.level, fighterState))) unchanged
```
to:
```quint
action doUseIndomitable = {
  if (turnPhase != "acting" or not(canUseIndomitable(TEST_CONFIG.level, fighterState))) unchanged
```
No XState change needed. Run `quint test` + `quint run` + `vitest run` to verify.

### 6. MBT only tests level 5 — add L9 config
`TEST_CONFIG` is level 5 Fighter. Indomitable (L9+) has `max=0` at this level, so `doUseIndomitable` always hits `unchanged` in MBT traces — never exercised by MBT.
**Fix:**
1. Add `TEST_CONFIG_L9` to `dnd.qnt` (copy `TEST_CONFIG`, set `level: 9`, `critRange: 19` for Champion Improved Critical)
2. Add `FRESH_FIGHTER_STATE_L9 = freshFighterState(9)`
3. Add `action init9` using the L9 config
4. In `machine.mbt.test.ts`, add a second MBT test that creates actor with `fighterLevel: 9` and runs traces from `init9`
5. Keep state spaces separate (L5 and L9 traces don't mix) — don't use nondeterministic level in a single init

---

## Part 2: Restore inductive invariant verification

The POC `dndFighter.qnt` had a working Apalache inductive invariant that proved fighter charge safety properties hold for ALL reachable states. The code was lost when the POC branch was deleted. This restores it.

### Approach

Create `dndFighterInductive.qnt` — a standalone verification module that imports from `dnd` and adds inductive invariant checking. Keeps verification separate from core spec (avoids bloating `dnd.qnt`, allows focused Apalache runs).

### File to create: `dndFighterInductive.qnt`

```quint
// -*- mode: Bluespec; -*-

/// Inductive invariant verification for fighter charge mechanics.
/// Run with Apalache:
///   export PATH="$HOME/.local/java/jdk-17.0.18+8-jre/bin:$PATH"
///   npx quint verify --main=dndFighterInductive \
///     --invariant=allInvariants \
///     --inductive-invariant=inductiveInv \
///     dndFighterInductive.qnt

module dndFighterInductive {
  import dnd.* from "./dnd"

  // ============================================================
  // Valid state enumeration for Apalache
  // ============================================================
  // Apalache's inductive check starts from an *arbitrary* state
  // satisfying the invariant (not from init). Record-typed vars
  // must use `.in(Set)` so the solver knows their shape.

  /// All structurally valid FighterState records.
  /// Uses nested map().flatten() because Quint has no flatMap or cross.
  pure val VALID_FIGHTER_STATES: Set[FighterState] =
    0.to(4).map(swC =>
      0.to(4).map(swM =>
        0.to(2).map(asC =>
          0.to(2).map(asM =>
            0.to(3).map(indC =>
              0.to(3).map(indM =>
                Set(true, false).map(asUsed =>
                  {
                    secondWindCharges: swC, secondWindMax: swM,
                    actionSurgeCharges: asC, actionSurgeMax: asM,
                    actionSurgeUsedThisTurn: asUsed,
                    indomitableCharges: indC, indomitableMax: indM,
                  }
                )
              ).flatten()
            ).flatten()
          ).flatten()
        ).flatten()
      ).flatten()
    ).flatten()
    .filter(fs =>
      fs.secondWindCharges <= fs.secondWindMax
      and fs.actionSurgeCharges <= fs.actionSurgeMax
      and fs.indomitableCharges <= fs.indomitableMax
    )

  // ============================================================
  // Inductive invariant
  // ============================================================
  // Must be strong enough that: Inv /\ Step => Inv'
  // Each constraint was added because Apalache found a
  // counterexample without it.

  val inductiveInv = and {
    // Fighter state must be a structurally valid record
    fighterState.in(VALID_FIGHTER_STATES),

    // Level-to-max charge relationships (established by init, preserved by step).
    // Without these, the solver finds states like level=1 + actionSurgeMax=2
    // which can't arise from init but satisfy the structural bounds.
    fighterState.secondWindMax == secondWindMaxCharges(TEST_CONFIG.level),
    fighterState.actionSurgeMax == actionSurgeMaxCharges(TEST_CONFIG.level),
    fighterState.indomitableMax == indomitableMaxCharges(TEST_CONFIG.level),

    // Action economy coupling: actionsRemaining starts at 1 (from pStartTurn),
    // Action Surge adds 1 (once per turn). So max is 2.
    // If Action Surge hasn't been used this turn, actionsRemaining <= 1.
    turnState.actionsRemaining >= 0,
    turnState.actionsRemaining <= 2,
    not(fighterState.actionSurgeUsedThisTurn) implies turnState.actionsRemaining <= 1,

    // Core state bounds (needed so the solver doesn't start from
    // impossible core states that would break fighter transitions)
    state.hp >= 0,
    state.hp <= state.maxHp,
    state.maxHp >= 1,
    state.tempHp >= 0,
    state.exhaustion >= 0,
    state.exhaustion <= 6,
    state.deathSaves.successes >= 0,
    state.deathSaves.successes <= 3,
    state.deathSaves.failures >= 0,
    state.deathSaves.failures <= 3,
    state.hitPointDiceRemaining >= 0,

    // Turn state bounds
    turnState.movementRemaining >= 0,
    turnState.effectiveSpeed >= 0,
    turnState.extraAttacksRemaining >= 0,

    // Spell slot bounds
    spellSlots.pactSlotsCurrent >= 0,
    spellSlots.pactSlotsCurrent <= spellSlots.pactSlotsMax,

    // Turn phase valid
    turnPhase.in(Set("outOfCombat", "acting", "waitingForTurn")),
  }
}
```

### Verification steps

1. **Typecheck:**
   ```bash
   npx quint typecheck dndFighterInductive.qnt
   ```

2. **Run inductive check (requires Java 17+):**
   ```bash
   export PATH="$HOME/.local/java/jdk-17.0.18+8-jre/bin:$PATH"
   npx quint verify --main=dndFighterInductive \
     --invariant=allInvariants \
     --inductive-invariant=inductiveInv \
     dndFighterInductive.qnt
   ```

3. **Expected output — all 3 checks pass:**
   - `[1/3] Checking whether inductiveInv holds in init` — pass
   - `[2/3] Checking whether step preserves inductiveInv` — pass
   - `[3/3] Checking whether inductiveInv implies allInvariants` — pass

4. **If step 2 fails with a counterexample:**
   - Read the counterexample trace (State 0 -> State 1)
   - Identify which constraint is too weak
   - Strengthen the invariant to rule out the impossible starting state
   - Re-run until all 3 checks pass

### Troubleshooting

**"Variable X used before assigned"** — Apalache needs every state var constrained with `.in()` or `==` before field access. The `state`, `turnState`, `spellSlots` vars are record-typed and may need similar `.in()` treatment. Start with field-level bounds (as above) — if Apalache rejects them, build `VALID_CREATURE_STATES` set comprehensions (expensive but correct).

**Timeout** — The full model has 5 state vars and 43+ actions. Apalache may take minutes or timeout. Try:
- `--max-steps=5` to reduce depth
- Comment out unrelated actions from `step` temporarily
- The POC (simplified proxy state) verified in ~50 seconds; full model may take 5-10 minutes

**Quint has no `flatMap` or `cross`** — Use nested `map().flatten()` chains as shown.

### Java installation (if not present)

```bash
mkdir -p ~/.local/java
curl -sL "https://api.adoptium.net/v3/binary/latest/17/ga/linux/$(uname -m | sed 's/x86_64/x64/')/jre/hotspot/normal/eclipse" -o /tmp/jre.tar.gz
cd ~/.local/java && tar xzf /tmp/jre.tar.gz
export PATH="$HOME/.local/java/jdk-*/bin:$PATH"
java --version  # should show 17+
```

### Notes

- The `inductiveInv` constraints were discovered iteratively — each one was added because Apalache found a counterexample without it. The counterexamples are informative: they show real invariant gaps.
- The core `allInvariants` in `dnd.qnt` are still checked by `quint run` (random simulation, 10k+ traces). The inductive invariant is a strictly stronger guarantee.
- When adding more class state vars (Barbarian, Monk, etc.), extend `inductiveInv` with analogous constraints: enumerate valid records, constrain level-to-max relationships, constrain cross-variable couplings.
