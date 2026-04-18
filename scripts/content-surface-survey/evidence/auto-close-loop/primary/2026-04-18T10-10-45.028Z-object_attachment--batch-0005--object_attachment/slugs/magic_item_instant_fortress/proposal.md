# Instant Fortress

## Verdict

`Instant Fortress` does not fit the current authored surface honestly. The blocker is structural, not a single missing effect atom.

## Why the current families do not fit

The existing magic-item families are:

- `passive`
- `activation`
- `triggered_reaction`
- `spawned_creature`
- `composite`

`Instant Fortress` is not a passive grant, not a one-shot activation that resolves and disappears, not a reaction, and not a creature summon. Its core mechanic is:

- transform a carried statuette into a persistent structure;
- create a 20-foot-by-20-foot-by-30-foot tower in world space;
- displace creatures and unattended objects from the footprint;
- preserve tower damage across later shrink/re-expand cycles;
- gate reversion on the tower being empty;
- expose a separate commandable door interaction while the structure exists.

That combination requires stateful created-object / created-structure support, not just an additional effect atom inside the current `activation` family.

## Concrete gaps

### 1. Persistent created structure payload

The surface has creature-summon payloads, but nothing parallel for a created object or structure with:

- dimensions / footprint;
- persistent HP / AC / damage state;
- door / wall / roof parts;
- occupancy-sensitive revert conditions.

Relevant text:

> cause it to grow rapidly into a square adamantine tower

> Repeating the command word causes the tower to revert to statuette form, which works only if the tower is empty.

> Shrinking the tower back down to statuette form doesn't repair damage to the tower.

### 2. Structure-creation displacement

There is no honest surface shape for “when this structure appears, clear its footprint by pushing creatures and unattended objects outside but adjacent.”

Relevant text:

> Each creature in the area where the tower appears is pushed to an unoccupied space outside but next to the tower. Objects in the area that aren't being worn or carried are also pushed clear of the tower.

Creature-only `force_move` is insufficient here because the rule is tied to the creation of a structure footprint and also applies to unattended objects.

### 3. Commandable structure access control

The door is not just descriptive fluff; it has a deterministic commandable-open rule while the tower exists.

Relevant text:

> The door opens only at your command, which you can issue as a Bonus Action.

This is neither a standard passive grant nor a normal spell/item activation against `self`; it is an interaction with a previously-created persistent object.

## Narrowest honest classification

`structural_widening`

Reason: the missing fit is a new family / subgraph for persistent created objects or structures. This is broader than a single new effect atom or a small variant on an existing field.
