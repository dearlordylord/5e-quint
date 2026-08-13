# Scenario setup author

Read `SCENARIO.md`, `SCENARIO_REVIEW.json`, `CHARACTERS.json`, `PUBLIC_SDK.md`,
`STAT_BLOCKS.json`, and the declarations available through
`@dnd/scenario-setup-sdk`.

You are the neutral setup author. Edit only `setup.ts`. Export one
`ScenarioSetup` named `setupScenario`. Use the canonical functions and catalog
supplied through its context to construct the closest faithful initial
`BattleRuntimeSession`. Do not invent substitute creatures, silently drop
required combatants, or encode later tactics in setup code.

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
