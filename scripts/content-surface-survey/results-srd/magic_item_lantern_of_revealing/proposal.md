# Proposal: Widening for Lantern of Revealing

**Unit:** Lantern of Revealing  
**Slug:** `magic_item_lantern_of_revealing`  
**Outcome:** `structural_widening`

---

## Blocking Gap 1 — No `magic_item` kind in `UnitRecord`

`UnitRecord` is currently:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord`. The taxonomy atoms list `magic_item_root` as a source atom and `attune` as a procedure atom, signaling intent to support magic items, but the surface type system has not yet added the corresponding record shape.

A `MagicItemRecord` would need at minimum:

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly rarity: MagicItemRarity;       // common | uncommon | rare | very_rare | legendary | artifact
  readonly requiresAttunement: boolean;
  readonly itemType: string;              // "wondrous_item" | "weapon" | "armor" | "ring" | "staff" | "wand" | ...
  readonly mechanics: MagicItemMechanics;
};
```

---

## Blocking Gap 2 — No passive-aura mechanics family

The lantern's primary mechanic is **always-on while lit** — it requires no activation roll, no action economy cost, no resource. The light and its invisibility-revealing property simply operate continuously as long as the lantern is lit.

None of the existing mechanics families cover this pattern:

| Family | Requires |
|---|---|
| `activation` (spell / class feature) | An activation event consuming a quota or resource |
| `ongoing_effect` (spell) | A spell being cast (slot + casting time + concentration or duration) |
| `triggered_reaction` (spell) | A reaction trigger + casting |
| `anchored_trigger` (spell) | A stored trigger armed at cast time |
| `on_hit_trigger` (mastery) | A weapon hit opening an on-hit window |

A new family is needed. Suggested name: **`passive_aura`** (or `item_property`). Shape sketch:

```typescript
export type PassiveAuraMechanics = {
  readonly family: "passive_aura";
  readonly activationCondition: "while_lit" | "while_held" | "while_attuned" | "always";
  readonly area: AuraArea;                // radius, type (bright/dim light vs. general aura)
  readonly effects: ReadonlyArray<PassiveAuraEffect>;
};
```

The "while lit" condition is also new — it gates the aura on a fuel-consuming state rather than attunement or holding.

---

## New Atom Required — `reveal_invisible`

The lantern negates the mechanical benefit of invisibility for creatures and objects within its Bright Light:

> Invisible creatures and objects are visible as long as they are in the lantern's Bright Light.

This is not covered by:

- **`grant_sense`** — grants a sense capability *to a specific creature*. The lantern's effect is area-scoped and applies to all observers, not to one creature gaining truesight.
- **`modify_roll_advantage`** — the effect is not advantage/disadvantage on rolls; it fully removes the concealment benefit.
- **`apply_condition` / `remove_condition`** — the Invisible condition is not removed from the target; the target is simply visually detectable while in the light (a spatial/perceptual effect on observers, not a condition change on the target).

Proposed new atom: **`reveal_invisible`**

```
reveal_invisible — within a defined area, invisible creatures and objects are visible to all observers.
Not grant_sense (observer-centric, not area-centric).
Not remove_condition (the target's Invisible condition persists; only its concealment benefit is suppressed by the light).
```

Category: `effect` (spatial suppression of invisibility benefit).

---

## Secondary Gap — `utilize_action` activation cost

The hood-lowering uses a Utilize action:

> You can take a Utilize action to lower the hood, reducing the lantern's light to Dim Light in a 5-foot radius.

`ClassFeatureActivationCost` only has `"free"` and `"bonus_action"`. A magic item mechanics layer would need `"action"` (which maps to the `utilize` standard action kind per SRD 5.2.1) as a recognized cost variant. This is dependent on Gap 1 and 2 being resolved first.

---

## Summary of Required Widenings (ordered by dependency)

1. **`MagicItemRecord` type** — add `magic_item` to `UnitRecord` (structural)
2. **`passive_aura` mechanics family** — add to `MagicItemMechanics` (structural)
3. **`reveal_invisible` effect atom** — add to v4 atom inventory (atom_widening)
4. **`utilize_action` activation cost variant** — add to item activation cost type (surface_widening, dependent on 1–2)
