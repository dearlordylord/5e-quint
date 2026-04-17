## Why `Sphere of Annihilation` does not fit the current surface

`Sphere of Annihilation` is not honestly encodable as either existing `MagicItemMechanics` family:

- `passive` is wrong because the item is not just an always-on grant to the bearer.
- `activation` is wrong because the item is not a one-shot resource spend with immediate phases. Its core mechanic is a persistent world object with temporary controller state and follow-up commands while controlled.

## Forced gap

### Structural widening: controllable hazardous item subgraph

The item needs a persistent, stateful object-level mechanic with at least these linked parts:

- a world object that exists in space and can remain stationary;
- an action to attempt control via a fixed-DC ability check;
- a temporary control lease (`until the start of your next turn`);
- a failure branch that moves the object toward the actor;
- a bonus-action command available only while control is active;
- collision / enter-space resolution that forces a save and damage on creatures the sphere moves through.

The current `MagicItemMechanics = PassiveMechanics | ActivatedAbilityMechanics` union cannot represent that shape honestly.

## Secondary pressure

### Missing effect/state shape: obliteration on 0 HP

The sphere's moved-through damage has a deterministic rider:

> "A creature reduced to 0 Hit Points by this damage is obliterated, leaving its possessions behind but no other physical remains."

Current effect atoms can deal damage, but they cannot express creature-remains removal / obliteration as a follow-on state change.

### Sphere-interaction table is additional non-local pressure

The portal / extradimensional-space interaction table mixes:

- item destruction,
- continued movement through the portal/space,
- planar transport of the sphere and each creature and object within 180 feet.

That is not the core reason this unit fails, but it would require further modeling beyond the current item families even after the controllable-object gap is addressed.
