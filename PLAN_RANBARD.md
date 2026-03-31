# Plan: Ranger + Bard — Quint Spec + TS Machine + MBT Parity — DONE

**Status:** Complete (2026-03-31). All 6 phases done + /simplify converged in 2 rounds.
Architectural debt items documented in PLAN_CLEANUP.md §§ J, K, M.

## Context

Ranger and Bard are the only 2 of 12 SRD classes without Quint/MBT integration. Both have complete TS pure functions (`class-ranger.ts`, `class-bard.ts`). Adding them requires: Quint types, state vars, pure functions, actions, frame conditions on all ~95 action locations, TS machine files, MBT bridge, and tests.

**SRD sources:**
- `.references/srd-5.2.1/Classes/Ranger.md`
- `.references/srd-5.2.1/Classes/Bard.md`

## Key Decision: Combined Single Pass

Add BOTH classes' frame conditions in ONE pass through dnd.qnt. Each of ~95 locations gets `rangerState' = rangerState, rangerLevel' = rangerLevel, bardState' = bardState, bardLevel' = bardLevel` appended after the existing `wizardState/wizardLevel`. Touching each site once is more efficient than two separate passes and avoids self-conflicting diffs.

## State Design

### RangerState
```
huntersMarkFreeUses: int    -- L1 Favored Enemy: 2/3/4/5/6 free casts by level, LR reset
tirelessCharges: int        -- L10: grant temp HP, LR reset
tirelessMax: int            -- WIS mod (min 1)
naturesVeilCharges: int     -- L14: BA invisible, LR reset
naturesVeilMax: int         -- WIS mod (min 1)
```

### BardState
```
bardicInspirationCharges: int  -- L1: CHA mod charges (min 1), BA to grant die
bardicInspirationMax: int      -- CHA mod (min 1)
```

### Actions (7 total)

| Action | Class | Cost | Cross-cutting |
|--------|-------|------|---------------|
| `doUseFreeHuntersMark` | Ranger L1 | Free action | rangerState only |
| `doUseTireless` | Ranger L10 | Magic action | rangerState + state (temp HP via `pGrantTempHp`) |
| `doUseNaturesVeil` | Ranger L14 | BA | rangerState + turnState (BA used) |
| `doUseBardicInspiration` | Bard L1 | BA | bardState + turnState (BA used) |
| `doUseCuttingWords` | Bard L3 Lore | Reaction | bardState + turnState (reaction used) |
| `doUseFontSlotRestore` | Bard L5 | Free | bardState + spellSlots (expend slot) |
| `doUsePeerlessSkill` | Bard L14 | Free | bardState (conditional: only spend on success) |

### Lifecycle

| Hook | Ranger | Bard |
|------|--------|------|
| Start Turn | No-op | Superior Inspiration L18: restore charges to min 2 |
| Short Rest | No charge reset (Tireless SR exhaustion is caller-managed) | Font of Inspiration L5: full recharge |
| Long Rest | Reset all charges (uses wisMod for max calc) | Full recharge (uses chaMod for max calc) |

### Pitfalls
- **Tireless** modifies `state` (CreatureState) for temp HP — cross-cutting like `doUseSecondWind`
- **Nature's Veil** sets invisible condition on `state` — cross-cutting
- **Font slot restore** modifies `spellSlots` AND `bardState`
- **doShortRest/doLongRest** need new `nondet wisMod`/`nondet chaMod` for charge recalculation
- **Peerless Skill** has conditional charge spend (only on success) — needs `nondet success` in action

## Execution Sequence

### Phase 1: Quint Spec (`dnd.qnt`)
1. Add `RangerState` and `BardState` type definitions (after WizardState)
2. Add `var rangerState/rangerLevel/bardState/bardLevel` in state variables section
3. Add pure functions: `freshRangerState`, `freshBardState`, lifecycle functions, guards, transitions
4. Update `init` action: add `"Ranger"`/`"Bard"` class selection, level derivation, state init
5. **Frame conditions**: append `rangerState'/rangerLevel'/bardState'/bardLevel'` to all ~95 locations + `unchanged`
6. Update lifecycle actions (`doStartTurn`, `doShortRest`, `doLongRest`) with active calls
7. Add 7 action wrappers + wire into `stepPC`

### Phase 2: Quint Tests (`dndTest.qnt`)
- Ranger: freshState, free Hunter's Mark (level brackets), Tireless, Nature's Veil, LR reset
- Bard: freshState, BI charges, Cutting Words, Font slot restore, Peerless Skill (success vs fail), SR/LR reset, Superior Inspiration

### Phase 3: Quint Verification Gate
- `quint typecheck dnd.qnt && quint typecheck dndTest.qnt`
- `quint test --main=dndTest dndTest.qnt --match "test_ranger\|test_bard"`

### Phase 4: TypeScript Machine Layer
- `machine-types.ts`: DndMachineInput (+ wisMod, chaMod), DndContext fields, DndEvent (7 events)
- `machine-ranger.ts` (new): action updates, lifecycle, init — delegate to `class-ranger.ts`
- `machine-bard.ts` (new): action updates, lifecycle, init — delegate to `class-bard.ts`
- `machine-states.ts`: event routing (acting.on) + lifecycle action lists (START_TURN/SHORT_REST/LONG_REST)
- `machine.ts`: imports, action wiring, context init spread

### Phase 5: MBT Bridge (`machine.mbt.test.ts`)
- Zod schemas: `QuintRangerState`, `QuintBardState`
- `NormalizedState` fields
- Both normalization functions
- `EventActionMap` (7 entries)
- `driverSchema` (7 entries)
- Handlers (7 functions)
- Init handler: class detection + level/wisMod/chaMod propagation

### Phase 6: TS Verification Gate
- `npx vitest run` — all tests pass including MBT trace replay

## Acceptance Criteria

1. `quint typecheck` — both files pass
2. `quint test` — all new ranger/bard tests pass
3. `quint run --invariant=allInvariants --max-samples=1000` — no violations
4. `npx vitest run` — 29/29 files, all tests pass, MBT traces pass
5. `/simplify` round 1 — fix any reuse/quality/efficiency issues
6. `/simplify` round 2 — converge (no further issues)
7. **RAW agent SRD verification** — verify against SRD for:
   - Favored Enemy free uses progression (2/3/4/5/6)
   - Tireless: 1d8 + WIS mod temp HP, WIS mod charges/LR
   - Nature's Veil: BA, invisible until next turn end, WIS mod charges/LR
   - Bardic Inspiration: CHA mod charges (min 1), BA, die scaling
   - Font of Inspiration L5: SR recharge + slot-to-charge
   - Cutting Words L3: reaction, spends BI, subtract from enemy roll
   - Peerless Skill L14: add BI die to own failed check, only spend on success
   - Superior Inspiration L18: restore to 2 on initiative

## Critical Files

- `dnd.qnt` — types, state vars, pure functions, actions, frame conditions
- `dndTest.qnt` — unit tests
- `app/src/features/class-ranger.ts` — existing TS pure functions (reuse)
- `app/src/features/class-bard.ts` — existing TS pure functions (reuse)
- `app/src/machine-ranger.ts` — NEW: machine update functions
- `app/src/machine-bard.ts` — NEW: machine update functions
- `app/src/machine-types.ts` — DndMachineInput, DndContext, DndEvent
- `app/src/machine-states.ts` — event routing + lifecycle lists
- `app/src/machine.ts` — action wiring + context init
- `app/src/machine.mbt.test.ts` — MBT bridge
- `.references/srd-5.2.1/Classes/Ranger.md` — SRD source
- `.references/srd-5.2.1/Classes/Bard.md` — SRD source
