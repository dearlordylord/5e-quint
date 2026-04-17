# Find the Path

## Verdict

`dm_agenda`

No authored surface file was created for this unit.

## Why

`Find the Path` does not impose a combat/runtime state change on creatures, objects, resources, or action economy. Its payload is informational:

> You magically sense the most direct physical route to a location you name.

> For the duration, as long as you are on the same plane of existence as the destination, you know how far it is and in what direction it lies.

> Whenever you face a choice of paths along the way there, you know which path is the most direct.

Within this prototype, that kind of guidance is caller/session-owned rather than a core mechanics atom:

- `identify.dhall` explicitly classifies information disclosure as DM agenda.
- `mind_spike.dhall` explicitly classifies persistent target-location knowledge as DM agenda, citing sibling spells like Locate Object and Scrying.

`Find the Path` is the same category, just applied to route guidance instead of creature tracking.

## Why I did not force a placeholder encoding

Any existing spell family would require lying:

- `activation` with `{ kind = "none" }` would discard the spell's entire effect.
- `ongoing_effect` has no honest atom for route guidance, direction/distance knowledge, or branch-choice navigation.
- Reusing `detect` or `grant_sense` would be false; the spell is neither property detection nor a new sensory mode.

Because a misleading trace is worse than no trace, the correct outcome here is to stop and record the unit as out-of-core.

## No widening proposed

I am not proposing a surface or atom widening for this worker result. Under the repo's current architecture, navigation / route-disclosure effects belong to session-layer adjudication rather than the core authored surface.
