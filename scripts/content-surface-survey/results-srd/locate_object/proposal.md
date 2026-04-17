# Locate Object

## Verdict

`dm_agenda`

No authored surface file was created for this unit.

## Why

`Locate Object`'s actual payload is informational and spatial:

> You sense the direction to the object's location if that object is within 1,000 feet of you.

> If the object is in motion, you know the direction of its movement.

> The spell can locate a specific object known to you if you have seen it up close... Alternatively, the spell can locate the nearest object of a particular kind...

This prototype's authored surface models deterministic combat/runtime mechanics. It does not model session-owned spatial disclosure such as object tracking, route knowledge, or remote-location revelation.

Local repo precedent is consistent on that boundary:

- `content/mind_spike.dhall` explicitly defers persistent target-location knowledge as DM agenda, citing sibling spells like `Locate Object`.
- `/workspace/typescript/dnd/plans/CONTENT_SURFACE_DEFERRED.md` explicitly lists `Locate Object` under session-owned effects: "object-location sense is spatial/session-owned."
- `content/identify.dhall` treats information-disclosure payloads as DM agenda rather than forcing a fake effect atom.

## Why I Did Not Author A Placeholder

Any existing family would require a dishonest encoding:

- `activation` plus `{ kind = "none" }` would erase the spell's real effect.
- `ongoing_effect` has no honest atom for directional object-location knowledge.
- Reusing `detect` would be false. `detect` is a closed property scan (`magic`, `thoughts`, `poison_and_disease`, etc.), not named-object tracking or nearest-object-of-kind resolution.
- Reusing `grant_sense` would also be false. The spell does not grant a reusable sense mode like Darkvision or Blindsight.

The lead-blocking clause and 1,000-foot bound are also spatial predicates, not standalone core mechanics atoms in this package.

## No Widening Proposed

No surface or atom widening is proposed for this worker result. Under the repo's current architecture, `Locate Object` is better classified as out-of-core than forced into a misleading trace.
