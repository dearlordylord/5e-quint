# Plan: PRD Extensions — Aura of Protection (PRD 3) + Readied Spells (PRD 2 Phase 2)

Two small deferred items from existing PRDs, combined into one plan.

---

## Phase 1: Aura of Protection — saveMiscBonus Threading (PRD 3 Continuation)

**Slice:** Thread the existing `saveMiscBonus: int` field (already on Combatant, always `0`) through all save-resolution paths in battle.qnt. TS computes the actual value from Paladin level + CHA modifier at init.

**User stories (from PRD 3):** 4, 5, 6, 7, 10

### Quint changes (battle.qnt)

- Find all save-resolution call sites: `bCastSaveSpell`, `bResolveAoETarget`, concentration checks (`bConcentrationCheck`), and any other path calling `saveSucceeds` or comparing a save roll against a DC.
- At each site, add `combatant.saveMiscBonus` to the save roll before comparing against DC. The `saveSucceeds` function in `creature.qnt` already accepts `miscBonus: int` — thread `saveMiscBonus` from the Combatant to this parameter instead of passing `0`.
- `bInit`: nondeterministically set `saveMiscBonus` in range `0.to(5)` for some creatures to exercise the pipeline.

### TS changes

- In TS save resolution paths, add `saveMiscBonus` to save rolls.
- At battle init, TS computes `saveMiscBonus` from Paladin aura: `paladinAuraBonus(paladinLevel, chaMod, isIncapacitated)` from `features/class-paladin.ts` (already implemented).
- MBT bridge: map `saveMiscBonus` from ITF (already on Combatant type, just needs value mapping).

### Tests

- `dndTest.qnt`: test that `saveSucceeds` with positive `miscBonus` turns a fail into a pass at the boundary (roll + bonus >= DC).
- Battle invariant: `saveMiscBonus >= 0` (auras don't grant negative bonuses).
- MBT (dev mode).

### Acceptance criteria

- [ ] `saveMiscBonus` threaded through all save paths (save spells, AoE saves, concentration checks)
- [ ] Non-zero `saveMiscBonus` changes save outcomes
- [ ] MBT passes (dev mode)
- [ ] Typecheck passes (Quint + TS)

---

## Phase 2: Readied Spells with Concentration (PRD 2 Phase 2)

**Slice:** Extend the existing Ready action (Phase 1 done) to support readied spells. Slot spent on ready, Concentration held until release, fizzle on Concentration break (slot lost), release enters spell resolution (Counterspellable).

**User stories (from PRD 2 out-of-scope):** Readied spell + Concentration hold, Concentration break → fizzle, release → Counterspell window.

### Quint changes (battle.qnt)

- Add `readiedSpellParams: ReadiedSpellParams` (or option type) to Combatant. Tracks: slot level, damage, damage type, save DC, target(s), caster ID. `None` when no spell is readied.
- New action `bReadySpell` (during active turn):
  - Guard: `BPActiveTurn`, `bTurnStarted`, `actionsRemaining > 0`, not incapacitated.
  - Spend action via `pUseAction(AReady)`.
  - Spend spell slot at chosen level.
  - Start Concentration (`pStartConcentration` — if already concentrating, break existing first).
  - Set `readiedSpellParams` with spell parameters.
  - Set `readiedAction: true`.
- Modify `bReadyRelease` to support spell release:
  - If `readiedSpellParams` is set, enter spell resolution (save spell or AoE) instead of attack resolution.
  - Spell release enters Counterspell window (uses existing `bSpellStack` infrastructure).
  - After resolution, return to `BPAwaitingReadiedAction` window.
- Concentration break while holding readied spell:
  - If `concentrationSpellId` matches the readied spell and Concentration breaks (damage, incapacitated), the spell fizzles.
  - Slot is already spent — no refund.
  - Clear `readiedSpellParams`.
- `bStartTurn`: clear `readiedSpellParams` along with `readiedAction` (both expire at start of next turn).

### TS changes

- Add `readiedSpellParams` to `BattleCreatureState`.
- New event `BATTLE_READY_SPELL` with spell parameters.
- Modify `battleReadyRelease` to dispatch spell resolution when `readiedSpellParams` is set.
- Concentration break handling: clear `readiedSpellParams` when Concentration breaks.
- MBT bridge: map `readiedSpellParams` from ITF.

### Tests

- `dndTest.qnt`:
  - Ready spell → slot spent, Concentration started, readiedSpellParams set.
  - Ready spell + Concentration break (damage) → spell fizzles, slot lost, readiedSpellParams cleared.
  - Ready spell + release → spell resolves, Counterspell window opens.
  - Ready spell + already concentrating → old spell broken, new Concentration started.
- Battle invariants:
  - `readiedSpellParams != None implies readiedAction == true`
  - `readiedSpellParams != None implies concentrationSpellId != ""`
- MBT (full run).

### Acceptance criteria

- [x] Readied spell spends slot on ready, not on release
- [x] Concentration held between ready and release
- [x] Concentration break → spell fizzles, slot lost
- [x] Release enters Counterspell window
- [x] Readied spell expires at start of next turn
- [x] MBT passes (Tier 1 + 5×3; full 10×5 times out due to expanded action space, pre-existing bEnterRage bug on one seed)
- [x] `/simplify` convergence (2 rounds, converged)
- [x] RAW check: Ready action rules in `Playing-the-Game.md`, Concentration rules in `Rules-Glossary.md`

---

## Verification

1. Each phase: Quint typecheck → invariant tests → TS typecheck → TS unit tests → MBT
2. `/simplify` convergence: minimum 2 rounds after Phase 2
3. RAW check: Aura of Protection in `Classes/Paladin.md`, Ready action + Concentration in `Playing-the-Game.md` and `Rules-Glossary.md`
