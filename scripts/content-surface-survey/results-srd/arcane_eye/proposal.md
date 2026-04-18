# Proposal: Arcane Eye — atom_widening

## Summary

Arcane Eye (level 4 Divination, concentration 1 hour) creates an invisible, invulnerable eye at a point within 30 ft. The caster mentally receives continuous visual information through the eye (including darkvision 30 ft). As a Bonus Action, the caster can move the eye up to 30 ft.

**Revised from prior run** (`structural_widening` → `atom_widening`): the surface has been updated with `reposition_attachment` and `on_caster_spends_action`. The `ongoing_effect` family can now structurally host the spell. The Bonus Action movement fits cleanly. The remaining blocker is the missing remote-vision atom.

---

## What now fits

| Mechanic | Encoding |
|---|---|
| ongoing_effect family | ✓ concentration 1 hour, level 4, divination |
| V/S/M components | ✓ standard |
| Bonus Action movement (30 ft) | ✓ `on_caster_spends_action` (bonus_action) + `reposition_attachment` (maxMoveFeet: 30) |

---

## Gap 1 — Missing atom: remote vision relay (primary blocker)

**SRD text:** "You mentally receive visual information from the eye, which can see in every direction. It also has Darkvision with a range of 30 feet."

No existing atom models "caster receives continuous visual information through a conjured remote sensor":

- `detect` (property: "magic" | "evil_and_good" | "poison_and_disease" | "thoughts", radiusFeet) — scans for named properties within a radius around the caster. Does not relay visual information and is caster-centered, not sensor-centered.
- `grant_sense` (sense: SenseKind, rangeFeet) — grants a sense to a *creature*. The eye is not a creature, and this atom does not model the caster receiving that sense *through* the sensor.

### Proposed atom: `grant_remote_vision`

```typescript
| {
    readonly kind: "grant_remote_vision";
    // The caster perceives through the sensor as if present at its location.
    // `senses` lists which sense kinds the sensor has (and thus the caster
    // receives through it). An empty list = normal vision only.
    readonly senses?: ReadonlyArray<{ readonly sense: SenseKind; readonly rangeFeet: number }>;
  }
```

This atom would live in `EffectAtom` and attach to a sensor-type attachment (see Gap 2). The passive operation on an Arcane Eye would be:

```
{ trigger: { kind: "passive" },
  effect: { kind: "grant_remote_vision", senses: [{ sense: "darkvision", rangeFeet: 30 }] } }
```

The v4 taxonomy has no named atom for this concept. This is a genuine `atom_widening`.

---

## Gap 2 — Missing surface variant: sensor/point attachment (secondary)

**SRD text:** "You create an Invisible, invulnerable eye within range that hovers for the duration."

The eye is a conjured, mobile, point-sized sensor — not an area, not an existing object, not a creature companion. The `Attachment` union has no variant for this:

- `area` with a zero-radius sphere is semantically wrong (not a region of effect).
- `object` targets *existing* objects; this is a conjured sensor.
- `AnchorTarget.location` exists (for anchored_trigger), but is not in the main `Attachment` union.

### Proposed variant: `sensor` in `Attachment`

```typescript
| {
    readonly kind: "sensor";
    // The sensor is created at a point within range and persists for the
    // spell's duration. Invisible and invulnerable by spell definition.
  }
```

Or alternatively, promote `AnchorTarget.location` (or a generalization of it) into the shared `Attachment` union for both anchored_trigger and sensor-type ongoing effects.

This is a `surface_widening` within an existing type, secondary to the atom gap.

---

## What the trace would show if authored (movement only)

If only the movement mechanic were authored (omitting the remote vision), the trace would be:

```
ongoing_effect
  → area attachment (point_within_range)
  → on_caster_spends_action (bonus_action) → reposition_attachment (maxMoveFeet: 30)
```

This would be a misleading trace: the spell's entire purpose (scrying via remote sensor) would be absent. Per guardrails, no Dhall was authored.

---

## Path to clean encoding

1. Add `grant_remote_vision` to `EffectAtom` (or extend `detect` with a `relay_vision` property variant, though that conflates two different mechanics).
2. Add a `sensor` variant to `Attachment` (or export `AnchorTarget.location` into the shared union).
3. Then encode as `ongoing_effect`:
   - attachment: `{ kind: "sensor" }` (created at point_within_range, range 30 ft)
   - operations:
     - passive: `grant_remote_vision` with darkvision 30 ft
     - on_caster_spends_action (bonus_action): `reposition_attachment` (maxMoveFeet: 30)
