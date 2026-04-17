# Proposal: Robe of Scintillating Colors — atom_widening

## Classification: `atom_widening`

Two gaps prevent honest encoding. Both are load-bearing, not secondary riders.

---

## Gap 1 — Missing atom: `shed_light`

**Evidence:**
> "the robe sheds Bright Light in a 30-foot radius and Dim Light for an additional 30 feet"

**Why it matters structurally:**

The bright-light radius (30 ft) is the zone of effect for the activation save. "Any creature in the Bright Light that can see you" is gated directly on the illuminated zone. If the `shed_light` emission is not modeled, the save-gate area has no principled radius to reference — the 30 ft must be hard-coded into an area attachment without tracing its derivation from the light effect.

Light emission also determines which creatures can satisfy the visibility condition. In a room with existing illumination, the robe's bright light expands the can-see zone. These are not narrative flavour; they are the mechanism by which the zone of effect is defined.

**Proposed atom:**
```
shed_light {
  brightRadiusFeet: number,
  dimRadiusFeet: number
}
```

Emitted as an `EffectAtom` so it can appear in a `direct` phase alongside the `modify_roll_advantage` effect, or as an `OngoingEffect` within an `ongoing_effect` family. Category: `effect`.

---

## Gap 2 — Missing surface variant: visibility filter

**Evidence:**
> "creatures that can see you have Disadvantage on attack rolls against you"
> "Any creature in the Bright Light that can see you when the robe's power is activated must succeed on a DC 15 Wisdom saving throw"

Both the `modify_roll_advantage` disadvantage rider and the `save_gate` area are conditioned on the attacker/target being able to see the wearer. The surface has:

- `attackerTypeFilter?: ReadonlyNonEmptyArray<CreatureType>` on `modify_roll_advantage` — narrows by creature type, not by visibility.
- No per-target visibility filter on area-targeted save phases.

Without this filter, encoding applies the disadvantage to ALL attackers and the save to ALL creatures in radius, which contradicts RAW. This is a `surface_widening` (new variant of an existing surface type) but it co-occurs with the `atom_widening` above.

**Proposed surface variant:**
```typescript
export type VisibilityFilter = { readonly kind: "can_see_target" };

// On modify_roll_advantage:
readonly visibilityFilter?: VisibilityFilter;

// On area-targeted ActivationPhase (save_gate, direct):
// Existing attachment has no per-creature filter. A new optional field
// on the area Attachment would allow narrowing to visible targets only:
readonly targetFilter?: VisibilityFilter;
```

---

## What would encode cleanly if both gaps were filled

| Mechanic | Surface atom | Notes |
|---|---|---|
| 3 charges, 1d3 at dawn | `charge_pool`, `RestResetCadence.dawn { regain: DiceAmount }` | Clean |
| Magic action cost | `activationCost: { kind: "action" }` | Clean |
| 1 charge per use | `charge_cast` on `grant_spell_access`, or direct consume | Clean |
| Duration: end of next turn | `{ kind: "timed", value: { unit: "round", amount: 1 } }` | Approximate; "end of next turn" ≠ exactly 1 round but is close enough for surface purposes |
| Wis DC 15 save → Stunned | `save_gate` phase, `apply_condition stunned` | Clean once visibility filter added |
| Disadvantage on attack rolls against you | `modify_roll_advantage { mode: "disadvantage", on: ["attack_roll"] }` | Clean once visibility filter added |
| Light emission 30/30 ft | — | Requires `shed_light` atom |
| Visibility gate on both effects | — | Requires visibility filter variant |

---

## Recommended widenings

1. **`shed_light` effect atom** — new v4 atom. Covers any unit that emits illumination as a mechanical effect (this item, Dancing Lights as an activation, Faerie Fire's incidental light, etc.). At minimum the radius pair `{ brightFeet, dimFeet }`.

2. **`VisibilityFilter` surface variant** — new optional field on `modify_roll_advantage` and on the area/target attachment. Enables "creatures that can see you" and "you must be able to see the target" riders that appear in ~10 SRD units (Blinding Smite, Faerie Fire, Fear, etc.).
