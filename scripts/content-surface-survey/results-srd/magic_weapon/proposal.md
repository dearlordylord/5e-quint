# Proposal: Magic Weapon — surface_widening

## Unit

**Magic Weapon** — SRD 5.2.1, Level 2 Transmutation spell.

Bonus action. Touch. Duration: 1 hour (timed). No concentration. Components: V, S.

> "You touch a nonmagical weapon. Until the spell ends, that weapon becomes a magic weapon with a +1 bonus to attack rolls and damage rolls. The spell ends early if you cast it again."
>
> **Upcast:** The bonus increases to +2 with a level 3–5 spell slot. The bonus increases to +3 with a level 6+ spell slot.

## What fits

The base case (slot 2, +1 bonus) encodes cleanly as `ongoing_effect`:

- `object` attachment (count: 1) — the touched weapon
- `timed` 1-hour duration with `earlyEnd: [{ kind: "caster_recasts_spell" }]`
- Two passive operations:
  - `modify_roll_numeric` on `["attack_roll"]`, delta `+1 (fixed_dice)`
  - `modify_damage_numeric`, delta `+1 (fixed_dice)`
- `castingTime: { kind: "bonus_action" }`

TypeScript typecheck passes. Tracer produces a valid mermaid graph.

## What does NOT fit

### Upcast scaling of the numeric bonus

**Gap:** `DiceDelta` (the type used by `modify_roll_numeric.delta` and `modify_damage_numeric.delta`) has no slot-level scaling mechanism. Its variants are:

| variant | description |
|---|---|
| `fixed_dice` | static N×dM (+1 collapses to flat) |
| `proficiency_bonus` | scales with PB |
| `ability_modifier` | fixed ability mod |
| `magic_item_rarity_bonus` | scales with item rarity |

None of these express "the value is +1 at slot 2, +2 at slots 3–5, +3 at slot 6+."

By contrast, `DiceAmount` does have `threshold_tiers`:

```typescript
| {
    readonly kind: "threshold_tiers";
    readonly axis: LevelAxis;
    readonly base: DiceExpr;
    readonly tiers: ReadonlyNonEmptyArray<{ readonly atLevel: number; readonly override: DiceExprDelta }>;
  }
```

But `DiceAmount` is only used for HP / damage quantities (dice expressions), not for flat numeric bonuses applied to d20 rolls.

## Proposed widening

**New variant: `DiceDelta.slot_threshold_tiers`**

```typescript
| {
    readonly kind: "slot_threshold_tiers";
    readonly sign: "+" | "-";
    readonly base: number;
    readonly tiers: ReadonlyNonEmptyArray<{
      readonly atSlot: number;
      readonly value: number;
    }>;
  }
```

Magic Weapon would encode as:

```json
{
  "kind": "slot_threshold_tiers",
  "sign": "+",
  "base": 1,
  "tiers": [
    { "atSlot": 3, "value": 2 },
    { "atSlot": 6, "value": 3 }
  ]
}
```

### Dhall authoring note

The `on` field of `modify_roll_numeric` and absence of `on` on `modify_damage_numeric` creates a Dhall homogeneous-list constraint when both appear in the same `operations` list. The workaround used here is to make `on: Optional (List Text)` in the local type alias — the same pattern used in `spirit_guardians.dhall` and `magic_item_staff_of_power.dhall`. This is a Dhall surface friction point, not a types.ts issue.

## Additional notes

- `ObjectFilter` has no `nonmagical` or weapon-kind predicate. The "nonmagical weapon" constraint is authoring intent only — no surface field encodes it.
- The atom `modify_damage_numeric` with `weaponFilter` could theoretically scope the damage bonus to attack rolls made with the specific enchanted weapon. Since the spell attaches to the weapon object itself, the attachment relationship provides the scoping context at runtime; no `weaponFilter: specific_item` is needed in the encoding.
- Pressure on `DiceDelta.slot_threshold_tiers` is confirmed by at least one other SRD spell using the same +N/+2N/+3N upcast pattern (e.g., `+1/+2/+3 bonus items` share the rarity-tier idiom, but the slot-based delta variant is novel).
