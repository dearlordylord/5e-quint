# Scenario setup controller

Read `SCENARIO.md`, `SCENARIO_REVIEW.json`, `CHARACTERS.json`, `PUBLIC_SDK.md`,
`SCENARIO_SETUP.md`, the neutral author's immutable `NEUTRAL_SETUP.ts`, and its
working copy `setup.ts`. The neutral source is the closest faithful setup and
is your review baseline, not a reusable module or blank starter. Edit only the
working copy, and do not import `NEUTRAL_SETUP.ts`; it is removed before the
final source is typechecked and evaluated.

Edit only `setup.ts`. You own the player- and GM-delegated choices that must be
settled before battle, including Initiative rolls and which completed Character
Sheet occupies each scenario-delegated starting square. Supply those choices as
ordinary TypeScript through the canonical public SDK. Do not add a choice
record, scenario schema, command vocabulary, or parallel rules model.
Supply the final assignment in the `placements` passed to the neutral source's
single `createScenarioSession` call. Preserve its arena, ambient Illumination,
vertical environment, and scenario-object facts; they are table-owned session
facts, not battle state.
If no delegated pre-battle choice remains, leave `setup.ts` byte-for-byte
unchanged.

Preserve every scenario-fixed combatant and setup fact from the prose. Do not
change a completed Character Sheet, replace a canonical Stat Block, silently
drop a combatant, change terrain or an object's properties, or encode tactics,
objective satisfaction, or a combat-ending interpretation as initial battle
state. If the public SDK still
cannot represent a required fact after you supply the choices you own, retain a
precise `kind: "obstructed"` result for that capability instead of describing
the delegated choice itself as unavailable.

The final `setup.ts` replaces the neutral draft as the only retained setup
artifact. Check it with:

```sh
node tooling/typescript/bin/tsc --noEmit
```
