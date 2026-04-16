# Fire Bolt widening

`Fire Bolt` fits the existing `spell` + `activation` family for its core procedure:

- cast with an `action`
- choose one target within `120` feet
- make a `ranged_spell_attack`
- on hit, deal tier-scaled `fire` damage

The unit does not fit completely because the authored surface cannot represent the secondary rider:

> "A flammable object hit by this spell starts burning if it isn't being worn or carried."

Current gaps:

- `Effect` only permits `damage` or `none`, so there is no way to encode ignition as an on-hit outcome.
- `Attachment` can target a generic `target`, but there is no way to narrow the rider to objects, or specifically to flammable objects that are not worn or carried.
- The tracer vocabulary has no ignition or burning atom to emit.

This is best classified as `atom_widening`. The top-level family already exists and the primary damage line traces honestly; the missing concept is an ignition/burning effect inside that existing family.

Smallest honest widening:

- new atom: `ignite_object`
- new surface `Effect` variant carrying object ignition
- optional target-side filter fields if the prototype needs to preserve the SRD restriction that only flammable objects not being worn or carried can ignite
