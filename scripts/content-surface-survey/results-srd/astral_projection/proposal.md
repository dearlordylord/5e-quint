# Proposal: Astral Projection widening

**Unit:** Astral Projection (9th-level Necromancy spell, SRD 5.2.1)  
**Outcome:** `structural_widening`  
**Confidence:** high

---

## Why it does not fit

### Blocker 1 — Duration has no `permanent` variant (surface_widening)

Every `SpellMechanicsHeader` requires a `Duration`. The three current variants are:

```typescript
| { readonly kind: "instantaneous" }
| { readonly kind: "concentration"; readonly upTo: DurationValue }
| { readonly kind: "timed"; readonly value: DurationValue }
```

Astral Projection's duration is **permanent until dispelled** (5etools `"type": "permanent", "ends": ["dispel"]`). None of the three variants applies. This alone prevents authoring a valid `SpellRecord`.

Other spells that will hit this same gap: Clone, Imprisonment, Sequester, Contingency.

**Proposed widening:**

```typescript
| { readonly kind: "permanent" }
// or, if the dispel-ends condition needs to be encoded:
| { readonly kind: "permanent_until_dispelled" }
```

---

### Blocker 2 — Core mechanic is a dual-entity split with no atom or family (structural_widening)

The spell's primary effect is:

> "You and up to eight willing creatures within range **project your astral bodies** into the Astral Plane. Each target's **body is left behind** in a state of suspended animation."

This creates two simultaneous existences per target:

1. **Physical body** — remains at the cast location, gains the Unconscious condition, needs no food/air, does not age.
2. **Astral form** — an exact copy of the creature's statistics, travels the Astral Plane.

They are linked by a **silver cord**. Either dying ends the spell for that target; the cord being cut kills both.

#### Why no existing family fits

The four spell families and their effect envelopes:

| Family | Effect envelope | Gap |
|---|---|---|
| `ongoing_effect` | `OngoingOperation`: `roll_modifier` \| `damage_on_hit` | Neither applies |
| `activation` | `ActivationPhase`: `attack_roll` \| `save_gate` | Neither applies |
| `triggered_reaction` | `ReactionEffect`: `modify_ac` \| `negate_named_effect` | Neither applies |
| `anchored_trigger` | `AnchoredSignal`: audible \| mental | Neither applies |

No family supports "create two linked entities on different planes."

#### Why no existing v4 atom fits

- **`transport_exile`** — moves a creature entirely out of the plane. Astral Projection is not exile; the body stays and the astral form is a copy, not a relocation.
- **`create_companion`** — creates a separate NPC ally. The astral form is the *same creature*, not a companion with independent statistics.
- **`apply_condition`** — covers the Unconscious rider on the body, but not the projection itself.
- **`persist` + `expire`** — lifecycle atoms for timed effects; do not model inter-plane entity-linking.

---

### Blocker 3 — `Condition` type missing `unconscious` (surface_widening)

The spell applies the Unconscious condition to each target's left-behind body:

> "it has the Unconscious condition, doesn't need food or air, and doesn't age."

`Condition` is currently `"prone"` only. Adding `"unconscious"` is a prerequisite for this spell and will unblock a large class of SRD effects (Sleep, Hold Person, Power Word Stun, etc.).

---

### Secondary gap — Inter-plane re-entry mechanic (new_subgraph)

When an astral form leaves the Astral Plane voluntarily:

> "the target's body and possessions travel along the silver cord, causing the target to re-enter its body on the new plane."

This is a conditional transport of the **physical body** triggered by the **astral form crossing a plane boundary**. It collapses the dual-entity split into a single entity. There is no existing subgraph shape for "when entity A crosses boundary X, move entity B to same location and merge."

---

## Proposed new payload family

A new family `astral_projection` (or a generalized `dual_entity` family for cases like Etherealness, Magic Jar, Clone) would need:

```typescript
// Sketch — not a final proposal
export type AstralProjectionMechanics = SpellMechanicsHeader & {
  readonly family: "astral_projection";
  // How many targets can be projected (caster + up to 8 others)
  readonly targetCount: number;
  // Condition applied to the left-behind body
  readonly bodyCondition: Condition;
  // The cord: if severed, both die
  readonly cord: { readonly severable: boolean };
  // What ends the spell per-target vs. for all targets
  readonly perTargetEnds: ReadonlyArray<AstralEndCondition>;
  readonly globalEnds: ReadonlyArray<AstralEndCondition>;
};
```

The atom inventory would need:
- `project_astral_form` — the effect atom for splitting into body + form
- `entity_link` — the cord/mutual-death constraint between linked entities
- `inter_plane_reentry` — collapse of the split when crossing plane boundaries

---

## What was omitted from the analysis

The spell also has minor issues not blocking but worth noting:

- **Fixed multi-target without slot scaling**: "up to 8 willing creatures + self" = up to 9 targets at fixed count. The existing `TargetSelection` only supports slot-scaled `choose_up_to`. A fixed-count `choose_up_to` variant would be needed even if the family issue were resolved.
- **Consumed material components**: The spell consumes its material components (jacinth + silver bar per target). The `Components` type has `m: false | string` — it records the text but not the "consumed" flag. See also the 5etools `"consume": true` field. This gap is shared with other costly spells.
