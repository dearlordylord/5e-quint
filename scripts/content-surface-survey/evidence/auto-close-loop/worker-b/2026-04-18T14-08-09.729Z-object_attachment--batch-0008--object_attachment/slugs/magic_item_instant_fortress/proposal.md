# Instant Fortress

Outcome: `surface_widening`

## Why it does not fit honestly today

`Instant Fortress` is still a `magic_item`, and its overall shape can live inside the existing magic-item activation/composite families. The failure is lower-level: the current surface cannot represent the item's core deployable-structure mechanics without lying.

`alter_item_kind` is not enough. It can say that an object changes form, but it cannot honestly encode all of the following:

- creating a persistent tower object that occupies a 20-foot-square footprint and has its own door and roof;
- clearing the occupied footprint by pushing creatures and unattended objects to adjacent unoccupied spaces;
- gating reversion on the tower being empty;
- preserving tower damage across tower/statuette state changes;
- opening the tower door later as a separate Bonus Action command on the deployed object.

If I authored this as a plain `alter_item_kind`, the trace would imply a simple form swap and miss the deterministic mechanical payload that makes the item interesting.

## Narrowest widening

This looks like a surface gap, not a new top-level kind and not a new v4 atom requirement:

- v4 already has `create_object` in the taxonomy, but `types.ts` does not.
- The missing work is an authored-surface realization of deployable object state and the release subgraph around it.

## Proposed additions

1. Add an object-creation effect shape, e.g. `EffectAtom.create_object`.
Evidence:
`"cause it to grow rapidly into a square adamantine tower."`

This shape needs enough payload to point at:

- occupied footprint / dimensions;
- persistent object identity;
- object statistics that remain damageable over time.

2. Add a direct-phase or effect-level structure-footprint clearing variant.
Evidence:
`"Each creature in the area where the tower appears is pushed to an unoccupied space outside but next to the tower. Objects in the area that aren't being worn or carried are also pushed clear of the tower."`

This needs one deployment step that can clear both creatures and unattended objects from the created structure's footprint.

3. Add a stateful deployed-object toggle subgraph.
Evidence:
`"Repeating the command word causes the tower to revert to statuette form, which works only if the tower is empty."`
`"Shrinking the tower back down to statuette form doesn't repair damage to the tower."`

This needs:

- deployed vs statuette state;
- a reversion precondition (`tower is empty`);
- damage carry-over across states;
- later command interaction with the deployed object (`The door opens only at your command, which you can issue as a Bonus Action.`).

## Why this is not `structural_widening`

The unit still fits the existing record/family space conceptually:

- `MagicItemRecord` already exists.
- A composite magic item could plausibly hold:
  - one activation to deploy/retract;
  - one activation to command the door.

What is missing is the authored surface underneath those families, not a new family itself.
