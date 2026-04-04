# Implementation Plans

Single entry point for implementers. Read this first.

## Prerequisites

- Read `CLAUDE.md` for project conventions (MBT, /simplify, Quint gotchas)
- Read `ARCHITECTURE.md` for the Quint/TS frontier (flow features, modifier features, content)
- Skim the source PRD before starting its plan

## Execution Order

Plans have **cross-plan dependencies**. Execute in this order:

```
passive-modifiers Phase 1  (Evasion on Combatant)
passive-modifiers Phase 2  (saveMiscBonus)
passive-modifiers Phase 3  (single-target DEX Evasion)
        │
        │  validates the modifier-field pattern
        ▼
attack-pipeline Phase 1    (shared attack resolution + critRange)
attack-pipeline Phase 2    (LA through reaction chain)
        │
        │  shared resolution must exist before Action Surge or rage can use it
        ▼
attack-pipeline Phase 3    (Action Surge — FighterState on Combatant)
attack-pipeline Phase 4    (Rage + Reckless — dynamic modifier fields)
        │
        │  shared resolution must exist before ready-release can use it
        ▼
ready-action Phase 1       (Ready + between-turns window)
ready-action Phase 2       (Release readied attack)
```

**Within a plan**, phases are strictly sequential — each builds on the prior.

**Across plans**, the key dependency is: `attack-pipeline Phase 1` (shared resolution) must be done before `attack-pipeline Phase 2-4` and `ready-action Phase 2`. The `passive-modifiers` plan has no hard dependency on the others but should go first because it validates the modifier-field pattern that `attack-pipeline Phase 4` reuses.

## Per-Phase Checklist

Every phase, regardless of plan:

1. **Read the phase** in the plan file — understand what to build and acceptance criteria
2. **Implement in Quint first** — creature.qnt pure functions, then battle.qnt actions
3. **Typecheck**: `quint typecheck creature.qnt && quint typecheck battle.qnt`
4. **Quint invariant tests**: `quint test --match "inv_" dndTest.qnt --main dndTest`
5. **Implement in TS** — mirror the Quint changes in XState action functions
6. **TS compile**: `npx tsc --noEmit -p app/tsconfig.json`
7. **TS unit tests**: `cd app && npx vitest run src/machine.test.ts`
8. **MBT bridge** — add field mappings and action dispatch for new actions
9. **MBT run**: `MBT_DEV=1 npx vitest run src/battle.mbt.test.ts` (dev mode first, full run for final validation)
10. **Commit** with descriptive message referencing the plan phase

## Verification Commands (quick reference)

```bash
# Quint
quint typecheck creature.qnt
quint typecheck battle.qnt
quint test --match "inv_" dndTest.qnt --main dndTest

# TypeScript
cd app
npx tsc --noEmit
npx vitest run src/machine.test.ts

# MBT (dev mode — fast feedback)
MBT_DEV=1 npx vitest run src/battle.mbt.test.ts

# MBT (full — final validation)
npx vitest run src/battle.mbt.test.ts
```

## Source Documents

| Plan | PRD | Scope |
|------|-----|-------|
| `passive-modifiers.md` | `PRD_PASSIVE_MODIFIERS.md` | hasEvasion, saveMiscBonus — validates modifier-field pattern |
| `attack-pipeline.md` | `PRD_ATTACK_PIPELINE.md` | Shared resolution, LA chain, Action Surge, rage/reckless |
| `ready-action.md` | `PRD_READY_ACTION.md` | Ready economy, between-turns window, release as attack |

## What's NOT in these plans

Tracked in `PLAN_AUDIT.md` with category analysis:

- **Deferred flow features**: Stunning Strike, Divine Smite (spell), Grapple/Shove, TWF
- **Deferred modifiers**: Sneak Attack, Brutal Strike, Cunning Strike
- **Deferred passives**: Aura of Courage, Danger Sense, Elusive
- **Deferred Ready extensions**: readied movement, readied spells (Concentration)
- **Performance**: P1-P6 (tech debt, do when painful)
- **Minor fixes**: C2 (Arcane Recovery), C5 (Knock Out)
