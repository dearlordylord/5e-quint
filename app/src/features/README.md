# features/

Pure-function implementations of D&D 5e SRD 5.2.1 non-core mechanics: class features, feats, and (eventually) spell effects, species traits, and subclass mechanics.

## Why a separate folder

The project has two layers:

1. **Core** (`dnd.qnt` + `machine-*.ts` in `src/`) — generic combat rules formally specified in Quint and mirrored by the XState machine (see `CLAUDE.md` for parity rules).

2. **Features** (this folder) — class-specific and feat-specific logic that *composes on* core primitives but adds no state to the Quint spec or XState machine context.

These are kept separate because they have a fundamentally different contract: core is formally specified and model-checked; features are TypeScript-only, tested with vitest, and iterate freely.

## The pure-function contract

Every file in this folder follows three rules:

1. **No XState imports.** No `assign`, no machine references, no guards or actions. Files here are not part of the state machine.
2. **No side effects.** Every exported function takes input, returns output. State updates are the caller's responsibility.
3. **No new Quint state.** Feature-specific state (rage charges, focus points, sorcery points, etc.) lives on the caller side — never in `CreatureState` or `TurnState` in `dnd.qnt`.

Features compose on core by calling into core utilities (e.g., importing `withinOneSize` from `machine-combat.ts`) or by producing results that the caller feeds into the XState machine as events. The dependency is one-way: features depend on core, never the reverse.

## File naming

- `class-<name>.ts` — a PHB class (barbarian, fighter, rogue, etc.)
- `feats.ts` — feat implementations (currently Grappler; will grow)
- Future: `spell-<name>.ts`, `species-<name>.ts`, `subclass-<name>.ts`

Each source file has a paired `.test.ts` in the same folder.

## SRD parity

See `CLAUDE.md` ("SRD feature parity") for the project-wide rule. Task list and priority tiers are in `PLAN_NONCORE.md`.
