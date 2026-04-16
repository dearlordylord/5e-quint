# Proposal: Surface Widenings for Moonbeam

## Outcome: `surface_widening`

Moonbeam belongs to the `ongoing_effect` family — it is concentration-based, attaches to a persistent area, and applies effects to creatures that interact with that area. The structural family is correct. Four surface-type variants are missing.

---

## Gap 1 — Cylinder shape variant in area attachment

**Current state:** `Attachment.area.shape` is `{ kind: "sphere"; radiusFeet: number }`.

**Required:** `{ kind: "cylinder"; radiusFeet: number; heightFeet: number }`

Moonbeam's area is a 5-ft-radius, 40-ft-high Cylinder. Other area-of-effect spells (Blade Barrier, various column effects) will also need cylinder. This is a straightforward additive variant.

---

## Gap 2 — `area_save_gate` (or `save_gate_on_contact`) OngoingOperation kind

**Current state:** `OngoingOperation` = `RollModifierOperation | DamageOnHitOperation`.

**Required:** A new operation kind that fires a save gate when a creature is in the area at defined trigger moments:
- Area first appears
- Area moves into creature's space
- Creature enters the area
- Creature ends its turn in the area
- At most once per turn per creature

The v4 atom `repeat_save` already names this concept. What's missing is a surface-type variant of `OngoingOperation` that references a save gate with area-contact triggers, save ability, DC source, and branching effects (damage on fail, half damage on success).

Sketch:
```typescript
type AreaSaveGateOperation = {
  readonly kind: "area_save_gate";
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly onFail: Effect;        // full damage + conditions
  readonly onSuccess: Effect;     // half damage
  readonly triggers: ReadonlyArray<AreaContactTrigger>;  // new enum
  readonly oncePer: "turn";
};

type AreaContactTrigger =
  | { readonly kind: "area_appears" }
  | { readonly kind: "area_moves_into_creature" }
  | { readonly kind: "creature_enters" }
  | { readonly kind: "creature_ends_turn_here" };
```

---

## Gap 3 — Movable area

**Current state:** No mechanism in `Attachment`, `OngoingOperation`, or `SpellMechanics` models "caster can spend an action to relocate the area on later turns."

**Required:** Either a property on the `area` attachment kind or a secondary `OngoingOperation` rider expressing that the caster may spend a named action cost (`magic`) to move the area up to N feet.

Sketch:
```typescript
type AreaMobility = {
  readonly cost: StandardActionKind;   // "magic"
  readonly maxFeet: number;             // 60
};
// added to Attachment { kind: "area" ... } as optional: mobility?: AreaMobility
```

This is a simple additive field.

---

## Gap 4 — Shape-shift prevention effect

**Current state:** `Effect` = `DamageEffect | NoneEffect`. The `apply_condition` effect exists in the mastery surface (`SaveGateRiderResult`) but not in the spell `Effect` union, and the `Condition` type only contains `"prone"`.

**Required:** `apply_condition` in `Effect`, and a new `Condition` literal (or a dedicated effect variant) for the shape-shift restriction:

```
Condition += "shape_shifted_locked"   // can't change form until condition ends
```

The condition expiry in this case is spatial: "until the creature leaves the cylinder." This ties the condition to the area attachment, which may require an additional `expiresOn` or `expireCondition` field on `apply_condition`.

This is the most complex gap — the expiry is area-exit rather than turn-based. It may warrant a new expiry variant:
```typescript
type ConditionExpiry =
  | { readonly kind: "end_of_next_turn" }       // existing pattern
  | { readonly kind: "leaves_area" };            // new: exits the spell's attachment area
```

---

## Summary

| Gap | Kind | v4 atom needed? |
|---|---|---|
| Cylinder shape | `new_variant` of `Attachment.area.shape` | No (geometry variant) |
| `area_save_gate` operation | `new_variant` of `OngoingOperation` | No (`repeat_save` exists) |
| Movable area | `new_variant` of `Attachment.area` | No |
| Shape-shift condition + expiry | `new_variant` of `Effect` + `Condition` + expiry | No (`apply_condition` in v4) |

All four gaps are surface widening: the required v4 atoms exist, but the surface type variants to express Moonbeam's mechanics are absent. No new top-level UnitRecord kind or mechanics family is needed.
