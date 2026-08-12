# Scenario setup author

Read `SCENARIO.md`, `SCENARIO_REVIEW.json`, `PUBLIC_SDK.md`,
`STAT_BLOCKS.json`, and the declarations available through
`@dnd/scenario-setup-sdk`.

Edit only `setup.ts`. Export one `ScenarioSetup` named `setupScenario`. Use the
canonical functions and catalog supplied through its context to construct the
initial `BattleRuntimeSession`. Do not invent substitute creatures, silently
drop required combatants, or encode later tactics in setup code.

Project only facts that the scenario fixes before play. Do not choose facts the
scenario delegates to a player, controller, or GM, including character builds,
spell choices, Initiative rolls, starting resources, or unresolved Table
Decisions identified by the retained review. If the current public setup API
cannot defer a required choice to its owner, return `kind: "obstructed"`.

When the public setup surface cannot represent the prose scenario, return
`kind: "obstructed"` with a precise explanation and JSON observation. That is
useful capability evidence. Do not force a `ready` result.

Check the file with:

```sh
node tooling/typescript/bin/tsc --noEmit
```
