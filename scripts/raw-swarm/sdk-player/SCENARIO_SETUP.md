# Scenario setup author

Read `SCENARIO.md`, `SCENARIO_REVIEW.json`, `CHARACTERS.json`, `PUBLIC_SDK.md`,
`STAT_BLOCKS.json`, and the declarations available through
`@dnd/scenario-setup-sdk`.

You are the neutral setup author. Edit only `setup.ts`. Export one
`ScenarioSetup` named `setupScenario`. Use the canonical functions and catalog
supplied through its context to construct the closest faithful initial
`ScenarioSession`. Start the canonical battle, then call
`createScenarioSession` once with its five-foot arena, initial placements,
ambient Illumination, vertical environment facts, and scenario-fixed objects.
The composed session retains an untouched `BattleRuntimeSession` under
`session.battle` and table-owned facts under `session.battlefield`; do not add
those facts to battle state. Do not invent substitute creatures, silently drop
required combatants, or encode later tactics in setup code.
Supply only the directed `initialRangedAttackEnemyRelationships` needed by the
scenario. Each `{ attackerId, enemyId }` is a pairwise Table Decision scoped to
the initial ranged-attack proximity question. It is not an encounter-wide side,
party, or faction model; omit pairs whose relationship the table has not decided.
The retained `initialSpace` is immutable setup evidence. Player queries derive
relations from it; this setup boundary does not claim to track later movement.

A scenario object is a table-owned target fact: use canonical `BattleObjectId`,
`ArmorClass`, `BattleObjectDamageDisposition`, and tactical-space
openness/Cover vocabulary. Poison and Psychic Immunity are canonical object
damage semantics and are not restated in scenario data. It is not a
creature-held ground object, spell light emitter, or separate object reducer.
Do not add use-state semantics that the scenario does not require.

Project only facts that the scenario fixes before play. Do not choose facts the
scenario delegates to a player, controller, or GM. Completed player-owned
Character Sheets are supplied through `context.characterSheets`; consume them
without changing their builds, spells, equipment, or resources. Initiative
rolls and unresolved Table Decisions identified by the retained review remain
with their owners. A controller author will review this exact source next and
may edit it only to supply those delegated pre-battle choices. Do not choose
them here and do not create placeholders, sentinel values, or a choice schema.
If the closest neutral setup cannot proceed without one, return a precise
`kind: "obstructed"` result that leaves the choice with its owner.

When the public setup surface cannot represent the prose scenario, return
`kind: "obstructed"` with a precise explanation and JSON observation. That is
useful capability evidence. Do not force a `ready` result.

Check the file with:

```sh
node tooling/typescript/bin/tsc --noEmit
```
