# Proposal: Tsunami widening gaps

**Unit:** Tsunami (spell, level 8, conjuration)
**Outcome:** `atom_widening`
**SRD section:** Spells/Descriptions-S-Z#Tsunami

---

## Summary

Tsunami's mechanics fit the `ongoing_effect` family structurally: it has an initial save_gate phase (6d10 bludgeoning when wall appears) and per-turn operations on `on_caster_turn_start`. However, two core mechanics — the wall auto-moving each turn and the per-round damage decay — have no representation in the current surface. Five additional surface gaps prevent full encoding of the spell's secondary mechanics.

No honest partial encoding is possible: omitting the wall movement and damage decay would produce a fundamentally different spell (a static wall with constant damage), not a faithful trace.

---

## Gap 1 — Auto-moving area attachment (atom_widening)

**RAW:** "at the start of each of your turns after the wall appears, the wall, along with any creatures in it, moves 50 feet away from you."

The wall moves autonomously each caster turn — 50 feet, always away from the caster, with no action cost. This is distinct from `reposition_attachment`, which models the caster spending an action to voluntarily relocate the attachment origin (Silent Image, Dancing Lights). Tsunami's movement is:
- Triggered by the caster's turn starting (not a caster action)
- Fixed direction (away from caster) 
- Fixed distance (50 ft)
- Carries creatures inside it

**Proposed atom:** `move_area_attachment` (or an extension of `OngoingTrigger` to carry a directional auto-move payload alongside the existing `on_caster_turn_start` trigger). The atom needs: direction (`away_from_caster` | `toward_caster` | `fixed_bearing`), distance in feet, and whether creatures inside are carried.

---

## Gap 2 — Round-elapsed LevelAxis (surface_widening)

**RAW:** "the damage the wall deals on later rounds is reduced by 1d10"

Per-turn damage starts at 5d10 and decreases by 1d10 each round. Rounds elapsed since spell start is the scaling axis. `LevelAxis` currently supports: `character`, `class`, `slot`, `subclass`, `proficiency_bonus`. A `"round"` axis would allow expressing per-round increments/decrements of dice amounts inside an ongoing spell:

```typescript
// DiceAmount linear_per_level with axis = "round"
{
  kind: "linear_per_level",
  axis: "round",         // <-- new
  base: { dice: 5, dieSize: 10 },
  perLevel: { dice: -1 },
  startingAtLevel: 1
}
```

The negative `perLevel` convention (decreasing) is already implied by `DiceExprDelta` supporting negative dice counts; only the axis name is new.

---

## Gap 3 — Creature size filter (surface_widening)

**RAW:** "Any Huge or smaller creature inside the wall or whose space the wall enters when it moves must succeed on a Strength saving throw."

`TargetTypeFilter` (a `ReadonlyNonEmptyArray<CreatureType>`) narrows save_gate targets by creature type. A parallel `TargetSizeFilter` is needed to narrow by creature size. Proposed shape:

```typescript
export type TargetSizeFilter = {
  readonly maxSize: Size;  // "huge" = Huge or smaller; "large" = Large or smaller; etc.
};
```

This would be an optional field on `save_gate` phases and ongoing save_gate operations, analogous to `typeFilter` on `TargetSelection`.

---

## Gap 4 — Movement gate trigger (surface_widening)

**RAW:** "the creature must succeed on a Strength (Athletics) check against your spell save DC to move at all. If it fails the check, it can't move."

`on_creature_moves` fires after movement occurs; it cannot gate movement. A new trigger variant is needed:

```typescript
| { readonly kind: "on_creature_attempts_move" }
```

Paired with an `ability_check_gate` ongoing effect, this would express: when a creature in the area attempts to move, it must pass an Athletics check vs the spell DC or its movement speed becomes 0 for that movement instance.

---

## Gap 5 — Once-per-round damage cap (surface_widening)

**RAW:** "A creature can take this damage only once per round."

The moving wall can notionally pass through the same creature's space multiple times in an unusual round (e.g., if the creature is also moving). There is no per-creature-per-round damage cap on ongoing operations. A new optional field on `OngoingOperation`:

```typescript
readonly maxTimesPerRoundPerCreature?: number;
```

---

## Gap 6 — Rectangular cuboid area shape (surface_widening)

**RAW:** "You can make the wall up to 300 feet long, 300 feet high, and 50 feet thick."

The wall is a 3-dimensional rectangular cuboid (distinct from a cube by having three independent dimensions). `AreaShapeDescriptor` has cube (equal sides), line (length × width, no height), cylinder (radius × height). A new descriptor is needed:

```typescript
| { readonly kind: "rect_cuboid"; readonly lengthFeet: number; readonly heightFeet: number; readonly thicknessFeet: number }
```

The existing `line` shape is closest but lacks a height axis, making it a 2D ribbon rather than a 3D wall.

---

## Gap 7 — Area-dimension-reaches-zero duration end trigger (surface_widening)

**RAW:** "When the wall reaches 0 feet in height, the spell ends."

The spell ends when the wall's tracked height dimension reaches zero — an autonomous condition driven by the spell's own state, not by any target action. The current `DurationEndTrigger` variants are all target-action-based. A new variant:

```typescript
| { readonly kind: "tracked_dimension_reaches_zero" }
```

This pairs with the round-elapsed decay (Gap 2) so the engine knows the spell is permanently over once the height hits zero.

---

## What does fit

For reference, the parts of Tsunami that *do* fit the current surface:

- `ongoing_effect` family ✓
- `castingTime: { kind: "minutes", amount: 1, ritual: false }` ✓
- `range: { kind: "point", feet: 5280 }` (1 mile ≈ 5280 ft) ✓
- `duration: { kind: "concentration", upTo: { unit: "round", amount: 6 } }` ✓
- `components: { v: true, s: true, m: false }` ✓
- `initialPhase: { kind: "save_gate", ability: "str", ... onFail: { kind: "damage", damageType: "bludgeoning", amount: { kind: "fixed", expr: { dice: 6, dieSize: 10 } } }, onSuccess: { kind: "half_damage" } }` ✓
- `operations: [{ trigger: { kind: "on_caster_turn_start" }, effect: { kind: "save_gate", ... } }]` ✓ (for the per-turn save shape, not the damage amount)

The spell is about 40% expressible; the core wave-movement mechanic and damage decay are the blockers.
