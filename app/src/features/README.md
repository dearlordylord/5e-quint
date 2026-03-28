# features/

Pure functions for D&D 5e SRD 5.2.1 non-core mechanics: class features, feats, spells, weapon mastery.

## Two layers

1. **Core** (`dnd.qnt` + `machine-*.ts` in `src/`): formally specified in Quint, MBT-verified.
2. **Features** (this folder): composes on core primitives. Most are TS-only, tested with vitest. Exception: Fighter (Champion L1-L18) is also in the Quint spec and MBT-verified.

## Pure-function contract

1. **No XState imports.** No `assign`, no machine refs, no guards/actions.
2. **No side effects.** Input in, output out. State updates are the caller's job.
3. **Feature state lives on the caller side** (rage charges, focus points, etc.), not in `CreatureState`/`TurnState`.

Features depend on core, never the reverse.

## File layout

- `class-<name>.ts` / `.test.ts`: class implementations (Barbarian, Cleric, Druid, Fighter, Monk, Paladin, Rogue, Sorcerer)
- `feats.ts`: feat implementations (Grappler, etc.)
- `spell-conditions.ts`, `spell-damage.ts`, `spell-defense.ts`: spell effect patterns
- `weapon-mastery.ts`: all 8 mastery effects
- `feature-bridge-*.ts` / `feature-store-*.ts`: wiring layer between pure functions and the XState machine
- `useFeatures.ts`, `useFighterExtras.ts`, etc.: React hooks

## SRD parity

See `CLAUDE.md` ("SRD feature parity"). Task list in `PLAN_NONCORE.md`.
