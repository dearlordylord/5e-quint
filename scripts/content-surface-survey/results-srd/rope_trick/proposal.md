# Proposal: Rope Trick widening

**Unit:** Rope Trick (spell, level 2, transmutation)
**Outcome:** `structural_widening`
**Confidence:** high

## Why the unit does not fit

Rope Trick creates a persistent extradimensional space that creatures can voluntarily enter, inhabit, and exit for the spell's duration (1 hour, no concentration). Its mechanical cluster is:

1. Touch the rope → an invisible portal opens at the rope's upper end
2. Creatures climb in → enter a bounded extradimensional space (capacity: 8 Medium or smaller)
3. Barrier: attacks, spells, and effects cannot pass into or out of the space
4. Creatures inside can see through the portal
5. When the spell ends, all contents drop out (`fall_on_end`)

None of the four existing spell payload families can model this:

| Family | Why it fails |
|---|---|
| `ongoing_effect` | `OngoingOperation` is `roll_modifier \| damage_on_hit`. "Create a habitable pocket dimension" is not a roll modifier or a damage rider. |
| `activation` | Phases are `attack_roll \| save_gate`. No phase type for "open a spatial pocket." |
| `triggered_reaction` | Reaction-shaped; fires on an external trigger. Does not apply. |
| `anchored_trigger` | Plants a trigger that fires a signal on event. The space IS the ongoing effect, not a future signal. |

This is structural: the concept of "a spell that creates a persistent bounded space creatures can inhabit" has no home in the family type hierarchy.

## Gap 1 — Missing payload family: `create_space`

A new family is needed for spells that create persistent extradimensional or conjured spaces. Candidate name: `create_space`. Its shape would need to model:

- **Anchor**: the object or location at which the space opens (the rope / portal)
- **Capacity**: maximum number of creatures / size constraint
- **Barrier**: blocking rules for what can/cannot cross the boundary (inbound and outbound separately)
- **Duration**: timed (1 hour); expiry ejects contents
- **Ejection**: `fall_on_end` on all contained creatures/objects

This family generalizes to:
- Rope Trick (extradimensional pocket via rope portal)
- Leomund's Tiny Hut (hemisphere, blocks weather and some effects)
- Mordenkainen's Magnificent Mansion (extradimensional dwelling)
- Demiplane (door to a custom planar pocket)
- Forcecage (inverted — keeps creatures IN rather than providing shelter)

The family is wide enough to justify promotion from a single-spell ad hoc encoding.

## Gap 2 — Missing surface variant: `object` in `Attachment`

The v4 taxonomy lists `object` as an attachment atom, but `types.ts` does not include it in the `Attachment` union. Rope Trick needs it: the caster touches a rope, and the portal opens at the rope's upper end. The rope is the attachment target, not a point within range or a creature.

Proposed addition to `Attachment`:
```typescript
| { readonly kind: "object"; readonly description: string }
```

This would also unblock: Flame Tongue (attaches to a weapon), Continual Flame (attaches to an object), and others.

## Gap 3 — Missing spell Effect variants

The spell `Effect` union is `DamageEffect | NoneEffect`. The blocking + transport + ejection mechanics require four additional effect atom shapes, all present in v4 taxonomy:

| Atom | Role in Rope Trick |
|---|---|
| `block_targeting` | Attacks and spells cannot target across the portal boundary |
| `block_travel` | Physical effects cannot pass through |
| `transport_exile` | Creatures entering the space are transported into the pocket |
| `fall_on_end` | All contents drop to the ground when the spell expires |

These would need to be added to the spell `Effect` union (or a new `SpaceEffect` union scoped to the `create_space` family).

## Summary

The primary blocker is structural: no payload family exists for "creates a persistent habitable bounded space." The secondary blockers (missing `object` attachment, missing effect variants) would also need to be resolved to produce an honest encoding. All gaps are coherent with the v4 atom inventory — the atoms exist; the surface family and variant shapes to host them do not.
