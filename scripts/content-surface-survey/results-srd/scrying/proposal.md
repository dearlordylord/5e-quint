# Proposal: Scrying (atom_widening)

## Summary

Scrying is a level-5 concentration divination that creates a remote sensing sensor the caster perceives through. The spell fits the `ongoing_effect` family (concentration, Wis save gate, persistent effect on fail), but four distinct gaps prevent honest encoding:

1. **Missing atom** — no atom for a remote scrying sensor
2. **Missing DcSource variant** — DC has cast-time table modifiers
3. **Missing Attachment variant** — location target in non-anchored contexts
4. **Missing SaveSuccessOutcome variant** — timed reuse ban on successful save

---

## Gap 1 — `scrying_sensor` atom (primary blocker)

**RAW:** "On a failed save, the spell creates an Invisible, intangible sensor within 10 feet of the target. You can see and hear through the sensor as if you were there. The sensor moves with the target, remaining within 10 feet of it for the duration."

**Why no existing atom fits:**  
The `detect` atom (`{ kind: "detect", property: ..., radiusFeet: ... }`) is a caster-centered presence-scan for a named property (magic, evil/good, poison, thoughts). Scrying is categorically different:
- The sensor is a physical object created in the world (visible as a luminous orb if seen).
- The sensor is attached to and moves with a target creature.
- The caster receives full visual + auditory perception through it — not just a boolean "present/absent" signal.
- The sensor is the attachment point for the effect, not the caster's location.

A new atom is needed, something like:
```typescript
| {
    readonly kind: "scrying_sensor";
    readonly rangeFeet: number;         // distance sensor may be from target (10 ft)
    readonly movesWithTarget: boolean;  // true for creature target
  }
```

This atom would naturally pair with an `OngoingTrigger.passive` and a `target` attachment in the `ongoing_effect` family.

---

## Gap 2 — Variable DC via cast-time modifier tables

**RAW:** "The target makes a Wisdom saving throw, which is modified... by how well you know the target and the sort of physical connection you have to it." (Tables: familiarity +5/+0/−5; connection −2/−4/−10.)

**Why no existing variant fits:**  
`DcSource` covers `caster_spell_save_dc` (fixed base, runtime-derived), `fixed` (constant), `weapon_attack_dc` (8 + mod + PB), `innate_dc` (base + ability + PB). None models "spell save DC ± player-chosen cast-time modifier selected from a closed table."

**Proposed variant:**
```typescript
| {
    readonly kind: "caster_spell_save_dc_with_choices";
    readonly modifiers: ReadonlyNonEmptyArray<{
      readonly label: string;
      readonly options: ReadonlyNonEmptyArray<{
        readonly label: string;
        readonly modifier: number;
      }>;
    }>;
  }
```

This generalizes to any "DC adjusted by cast-time contextual choices" pattern. Scrying has two independent modifier axes; the modifier resolution is additive.

---

## Gap 3 — `Attachment` location variant (non-anchored context)

**RAW:** "Instead of targeting a creature, you can target a location you have seen. When you do so, the sensor appears at that location and doesn't move."

**Why no existing variant fits:**  
`Attachment` has `self`, `target`, `area`, `mark`, `object`. A `location` kind exists on `AnchorTarget` (used by `anchored_trigger` only), but not as a general `Attachment` variant for `ongoing_effect` or `activation` families.

Scrying needs an `Attachment` that is a "named, visible location in the world, no creature selected, no save." This is different from `area` (geometric region) and `object` (a specific held/worn item).

**Proposed variant:**
```typescript
| {
    readonly kind: "location";
    readonly description: string;   // "a location the caster has seen"
    readonly rangeOrigin?: AttachmentRangeOrigin;
  }
```

---

## Gap 4 — Timed reuse ban on successful save

**RAW:** "On a successful save, the target isn't affected, and you can't use this spell on it again for 24 hours."

**Why no existing shape fits:**  
The current `SaveSuccessOutcome` is `{ kind: "half_damage" } | EffectAtom`. None of the `EffectAtom` variants encode "caster cannot retarget this specific creature with spell X for N hours." This is a resource-lockout on the caster scoped to a specific target, which has no analog in the current surface.

This could be modeled as a future atom or a property of the save_gate phase:
```typescript
// On save_gate phase:
readonly onSuccessLockout?: {
  readonly hours: number;
  readonly scope: "this_target";
};
```

This is a lower-priority gap — it affects reacharound DM tracking but not the core per-cast resolution.

---

## Encoding plan (when widenings land)

Once these gaps are filled, Scrying encodes as `ongoing_effect`:

```
family: ongoing_effect
level: 5, school: divination
castingTime: { kind: "minutes", amount: 10, ritual: false }
range: { kind: "self" }
duration: concentration up to 10 minutes
attachment: { kind: "target", selection: { mode: "one" } }
initialPhase: save_gate (wis vs caster_spell_save_dc_with_choices, on fail: scrying_sensor)
operations:
  - { trigger: passive, effect: scrying_sensor (ongoing perception) }
```

The location-target alternative would be a second encoding variant or an `attachment: { kind: "choice" }` extension.

---

## Classification

`atom_widening` — the `scrying_sensor` atom is the primary blocker. All other gaps are variants of existing surface types (`surface_widening`). The `ongoing_effect` family is otherwise the correct fit for this spell.
