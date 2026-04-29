# @dnd/battle-runtime

Battle runtime owns the durable battle state, phase-1 battle subjects, replay-from-root hole/fill boundary, and snapshots for the Surface/Unit green path.

This package intentionally imports generic Surface `StatBlockRecord`s and shared algebras. It does not import legacy engine packages, SRD-specific stat-block collection types, or projected-executable vocabulary.

The current skeleton covers the CAM11 boundary:

- `startBattle` accepts caller-built combatant seeds and creates sorted Initiative state.
- `BattleState.currentTurnResources` uses `RuntimeActionResource[]` plus bonus-action availability from `@dnd/shared-algebras/action-economy-algebra`; it does not store a scalar action quota.
- `discoverBattleActs` exposes only the phase-1 `coreAct.attack` and `coreAct.endTurn` subjects for the current actor.
- `resolveBattleSubject` is replay-from-root: callers pass the root `BattleState`, the selected `BattleSubject`, and all accumulated `BattleFill`s. Fills are not stored in `BattleState`.
- CAM11 has no battle hole/fill protocol yet: `BattleHole` and `BattleFill` are `never`, so unsupported Unit/effect-shaped asks are not publicly representable through this package.
- `snapshotBattle` projects a JSON-friendly read model without exposing mutable `Map` internals.

Attack and End Turn resolution beyond act discovery are intentionally left as later tasks. Until CAM13 adds target/roll/damage replay and CAM15 adds End Turn state advancement, resolving either subject returns `invalid` with `unsupportedSubject` rather than mutating state or inventing placeholder holes.

## RAW Traceability For Retained Phase-1 Behavior

- Initiative order and the current actor are traced to SRD 5.2.1 `Playing-the-Game.md` "Combat" / "Initiative": combat is organized into rounds and turns, everyone rolls Initiative at the beginning of combat, the GM ranks combatants from highest to lowest Initiative, and that order remains the same from round to round. `UBIQUITOUS_LANGUAGE.md` defines Initiative as the Dexterity check that determines turn order.
- `endTurn` is exposed only as a discoverable subject in this skeleton. SRD combat has participants take turns in Initiative order and starts a new round after everyone has taken a turn. `ASSUMPTIONS.md` A2 records the repository's explicit modeling decision to expose a discrete End Turn transition because D&D has end-of-turn trigger points even though "end turn" is not itself an SRD action. CAM15 owns the state transition.
- Per-turn action resources are traced to SRD 5.2.1 `Playing-the-Game.md` "Your Turn" / "Actions" and "Bonus Actions": on your turn you can take one action, and at most one Bonus Action when a rule grants one. `UBIQUITOUS_LANGUAGE.md` defines Action and Bonus Action using those same per-turn resource boundaries.
- Snapshot `defeated` is a read-model projection from `hp === 0`. SRD 5.2.1 `Playing-the-Game.md` "Dropping to 0 Hit Points" distinguishes Monster Death from player-character death saves; the durable state keeps the explicit `zeroHpLifecyclePolicy` alongside HP so later damage/death-save tasks can refine behavior without encoding death as a copied scalar.
