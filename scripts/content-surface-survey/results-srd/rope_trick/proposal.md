# Widening Proposal: Rope Trick

**Unit:** Rope Trick (spell, level 2, transmutation)
**Outcome:** `atom_widening`

## What the spell does

Rope Trick (SRD 5.2.1) creates a temporary extradimensional refuge:

1. The caster touches a rope; one end hovers up until perpendicular to the ground or hitting a ceiling.
2. At the top end, an invisible 3×5 ft portal opens to an extradimensional space for the spell's duration (1 hour, **no concentration**).
3. The space is entered by climbing the rope; the rope can be pulled inside.
4. Capacity: up to 8 Medium or smaller creatures.
5. Bidirectional barrier: attacks, spells, and other effects cannot pass in or out.
6. Creatures inside can see out through the portal.
7. When the spell ends, everything inside drops out.

## Why it doesn't fit

The spell's entire purpose is creating a temporary extradimensional refuge — a spatial construct that:
- exists in an extradimensional pocket (not on the current plane)
- has a physical entry point anchored to an object (the rope top)
- accepts creatures voluntarily (climb in/out freely)
- has a creature capacity
- blocks effects bidirectionally
- persists for a fixed duration without concentration

No v4 atom or current surface shape covers this concept:

| Candidate atom | Why it doesn't fit |
|---|---|
| `transport_exile` | Involuntary, one-way, no capacity, no entry-point anchor; moves *to* a plane rather than *creating* one |
| `container_storage` | Passive item mechanic (Bag of Holding); carries objects, not inhabited by creatures; no blocking semantics |
| `block_travel` / `block_targeting` | Would need to attach to the space itself, which has no representation |
| `grant_speed` / movement atoms | Don't model dimensional access |

The family is fine (`activation` spell, `direct` phase, `object` attachment on the rope). The blocker is the missing atom.

## Proposed widening

### Primary: `create_extradimensional_space` (new EffectAtom)

A new effect atom representing a spell-created temporary extradimensional refuge.

Minimum required fields:
```typescript
{
  readonly kind: "create_extradimensional_space";
  // Entry point description (portal shape or size)
  readonly entrySize?: { widthFeet: number; heightFeet: number };
  // Maximum creature capacity
  readonly capacityCreatures?: number;
  readonly capacityCreatureSize?: Size;
  // Bidirectional effect barrier
  readonly blocksEffects?: true;
  // Whether inhabitants can perceive out
  readonly inhabitantsCanSeeOut?: true;
  // What happens to contents when the spell ends
  readonly onExpiry: "drop_out";
}
```

This atom attaches to the `object` attachment (the rope) anchoring the entry point.

### Secondary: bidirectional blocking on a created space

`block_travel` and `block_targeting` currently scope to an attachment serving as the barrier boundary. Once the extradimensional space is a first-class entity, these atoms could extend to it with a new scope reference. Alternatively, the `create_extradimensional_space` atom could carry its own `blocksEffects: true` flag (as above) rather than requiring separate atoms.

## Secondary omissions

Even with the primary atom, two sub-mechanics remain without surface representation:
- **"creatures inside can see through the portal"** — no atom for selective one-way perception through a barrier.
- **Rope interaction** (rope can be pulled into the space, dropped back out) — a narrative/DM-resolved interaction rather than a discrete mechanical atom.

Both are secondary to the main gap.

## Classification rationale

`atom_widening` (not `structural_widening`): the spell's mechanics family (`activation`, `direct`, `object` attachment, `timed` duration) all exist and are unambiguous. The gap is entirely at the effect-atom level — the concept of creating a temporary extradimensional space is simply absent from the v4 taxonomy and the current surface.
