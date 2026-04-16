# Proposal: Wind Wall — Structural Widening

**Unit:** Wind Wall (level 3 Transmutation, SRD 5.2.1)
**Outcome:** `structural_widening`
**Confidence:** High

---

## Why it does not fit

Wind Wall has three independent failure modes, any one of which would block clean encoding. Together they indicate the unit genuinely requires new surface infrastructure before it can be authored.

### 1. Dual-stream structure (structural widening)

Wind Wall has two mechanically distinct phases that are both active for the duration:

**Stream A — instantaneous (activation-shaped):**
> "When the wall appears, each creature in its area makes a Strength saving throw, taking 4d8 Bludgeoning damage on a failed save or half as much damage on a successful one."

**Stream B — persistent (ongoing_effect-shaped, concentration up to 1 minute):**
> "The strong wind keeps fog, smoke, and other gases at bay. Small or smaller flying creatures or objects can't pass through the wall. ... Arrows, bolts, and other ordinary projectiles launched at targets behind the wall are deflected upward and miss automatically."

No existing family can hold both:
- `activation` is one-shot; it cannot model the persistent environmental effects.
- `ongoing_effect` requires a single `OngoingOperation` (`roll_modifier` | `damage_on_hit`); it cannot model the instantaneous save on appearance, nor any of the travel/projectile effects.

Honest encoding requires a new family (e.g., `activation_with_persistent_area`) or a composition mechanism allowing an activation phase to coexist with an ongoing_effect body.

**Compare:** Wall of Fire (similar split: immediate save on enter + persistent damage on end-of-turn-in-area), Sleet Storm (no immediate damage but multiple persistent effects). These will hit the same structural gap.

---

### 2. Wall area shape (surface widening on `Attachment`)

Wind Wall creates a wall, not a sphere:
> "You can make the wall up to 50 feet long, 15 feet high, and 1 foot thick. You can shape the wall in any way you choose so long as it makes one continuous path along the ground."

The current `Attachment` area shape union is:
```typescript
shape: { readonly kind: "sphere"; readonly radiusFeet: number }
```

A wall is a path-following rectangle (length × height, 1 ft thick). Required new variant:
```typescript
| { readonly kind: "wall"; readonly maxLengthFeet: number; readonly maxHeightFeet: number; readonly thicknessFeet: number }
```

This shape recurs across the SRD: Wall of Fire, Wall of Ice, Wall of Stone, Wall of Thorns, Blade Barrier, Prismatic Wall, Fire Storm (approximate). Widening `area.shape` to include `wall` resolves all of them.

---

### 3. Passive projectile deflection (atom widening)

> "Arrows, bolts, and other ordinary projectiles launched at targets behind the wall are deflected upward and miss automatically. Boulders hurled by Giants or siege engines, and similar projectiles, are unaffected."

This effect:
- Is passive (no action cost, no trigger, no reaction window)
- Applies to any ranged attack that would cross the wall to reach a target on the far side
- Produces an automatic miss on attack resolution
- Has a rulebook carve-out for heavy siege projectiles

No v4 atom covers this:
- `block_travel` — covers creature/object movement, not attack resolution
- `block_targeting` — prevents targeting, but Wind Wall doesn't prevent targeting; the attack is made and then misses
- `interrupt_resolution` — reaction-based, requires a prompt/commit chain; Wind Wall is passive
- `negate_named_effect` — spell-specific negation, not attack-type filtering

**Proposed atom:** `deflect_projectile` — passive area-gated effect that causes ranged attacks of a specified kind (e.g., `ordinary_ammunition`) crossing the area to miss automatically. The siege-weapon carve-out is an explicit exclusion encoded as a filter.

This atom may also apply to: Arrow-Catching Shield (item), certain Abjuration effects.

---

### 4. Gas/gaseous-form blocking (potential atom_widening, lower priority)

> "The strong wind keeps fog, smoke, and other gases at bay. ... Creatures in gaseous form can't pass through it."

The existing `block_travel` atom covers creature movement. These effects could be modeled as:
- `block_travel` with a creature-type/size filter (`gaseous_form_only`, `small_or_smaller_flying`)
- A new `block_gas_passage` atom for the environmental gas/smoke/fog blocking

This is lower priority than the above three issues. The `block_travel` atom could absorb these with creature-type filters added as an optional field.

---

## Required widenings (ordered by severity)

| Priority | Kind | Name | Scope |
|---|---|---|---|
| 1 | `new_subgraph` | Dual-stream spell family | Structural — new mechanics family needed |
| 2 | `new_variant` | `area_shape_wall` | Surface — new `Attachment` area shape |
| 3 | `new_atom` | `deflect_projectile` | Atom — passive ranged-attack auto-miss |
| 4 | `new_atom` or widen | `block_travel` with filters | Atom — size/type-filtered movement blocking |

---

## Comparison to existing encodings

- **Fireball** (`activation`, single stream: save → damage on area) — Wind Wall's stream A resembles this but the area shape differs.
- **Bless** (`ongoing_effect`, single stream: roll modifier on targets) — Wind Wall's stream B is ongoing but its operations are environmental/travel/attack-resolution, not roll modifiers.
- **Alarm** (`anchored_trigger`) — not applicable; Wind Wall's effects trigger immediately on appearance and continuously for the duration, not on a discrete later event.

---

## Files produced

- `result-wind_wall.json` — structured verdict
- `proposal-wind_wall.md` — this document
- No `content/wind_wall.dhall`, no `content/wind_wall.json`, no `content/wind_wall.trace.md` (per protocol: do not produce a misleading trace)
