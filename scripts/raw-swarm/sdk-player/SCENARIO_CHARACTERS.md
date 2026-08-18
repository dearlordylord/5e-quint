# Scenario character controller

Read `SCENARIO.md`, `SCENARIO_REVIEW.json`, the public character runtime
documentation, and the declarations available through
`@dnd/scenario-character-sdk`.

Edit only `characters.ts`. Export one `ScenarioCharacters` named
`composeScenarioCharacters`. This module represents the player/controller that
owns the scenario's delegated Character Sheet choices. When `SCENARIO.md`
contains only canonical stat-block creatures (or otherwise delegates no
class-based player character), return `kind: "ready"` with
`characterSheets: []` and a JSON observation explaining that no Character
Sheets are delegated. Do not invent a class, species, background, ability
scores, equipment, or Character Sheet to fill that absence. Use the supplied
canonical `UnitCatalog` and character-creation operations directly: create a
draft, discover its current holes, fill those holes, finalize its
`CharacterBuild`, and create a `FreshCharacterSheet`.

Do not create a parallel build object or copy a preset from repository source.
Select only options surfaced by the canonical creation holes. The prose may
leave class, equipment, spells, or other combat-relevant choices to you; make a
serious coherent selection for every Character Sheet you control. Do not choose
Initiative, starting position, GM Table Decisions, or battle tactics here.

Return `kind: "ready"` with the completed canonical fresh Character Sheets and
a JSON observation explaining the selected builds. Do not submit depleted Hit
Points/resources, conditions, or other mutable adventuring state. If the public character APIs cannot
complete a required sheet, return `kind: "obstructed"` with the precise gap and
JSON evidence rather than fabricating state.

Check and run the file with:

```sh
node tooling/typescript/bin/tsc --noEmit
node character-client.mjs characters.ts
```
