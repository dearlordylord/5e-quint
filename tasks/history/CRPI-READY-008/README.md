# CRPI-READY-008

Implemented target replay for `packages/battle-runtime/battle-runtime-roll-modifier-active-effects.mbt.qnt` through the copied route connector `packages/battle-runtime/battle-runtime-roll-modifier-active-effects.route.mbt.qnt`.

The target replay is exercised by `packages/battle-runtime/src/roll-modifier-active-effects.mbt.test.ts` using public reducer entrypoints:

- `battleReducerStartRouteEvent`
- `discoverBattleActs`
- `resolveBattleSubject`

The durable owner remains `BattleState`: roll-modifier Spell Effects are stored as existing `BattleCreatureState.activeEffects`, Concentration remains `BattleCreatureState.concentration`, and route evidence is emitted as boundary projection through `AvailableBattleAct.routeEvents` and `BattleResolutionResult.routeEvents`.

No duplicate Thaumaturgy one-minute-effect ledger was introduced. Its active 1-minute effect count remains a table-supplied boundary fill.
