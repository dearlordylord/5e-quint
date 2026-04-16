# Proposal: Gloves of Missile Snaring

**Outcome:** `structural_widening`
**Confidence:** high

---

## Primary gap: no `MagicItemRecord` in `UnitRecord`

`src/surface/types.ts` defines:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord` variant. The v4 taxonomy lists `magic_item_root` as a source atom, but the authored surface has no corresponding record type, no `kind: "magic_item"` discriminant, and no mechanics family shape for wondrous items. Any attempt to coerce this unit into an existing kind would produce a dishonest trace.

---

## Required surface additions (in priority order)

### 1. `MagicItemRecord` + magic-item mechanics family (structural)

A new top-level record is needed. Minimum shape to cover this item:

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
};
```

The mechanics family must cover at minimum:
- **Attunement:** `attune` procedure from v4 taxonomy, consuming an `attunement_slot` resource.
- **Reaction-on-incoming-hit:** A triggered-reaction shape where the trigger is an incoming attack roll hitting the wearer (distinct from spells, which use `ReactionTrigger` on a `TriggeredReactionMechanics` spell payload). Magic items that fire reactions need their own family because they have no spell-card header (no level, school, components, duration).
- **Use resource:** This item has no per-day charges; the reaction costs only the reaction quota. Other magic items use charges (`charge` resource atom already in v4). The family must accommodate both patterns.

### 2. `reduce_damage_taken` effect atom (atom widening)

Core effect: reduce incoming damage by `1d10 + Dex modifier`.

Existing v4 effect atoms do not cover this:
- `damage` — applies outgoing damage, not inbound reduction
- `modify_ac` — static AC delta, not per-hit damage reduction
- `grant_resistance` — halves a damage type passively, always-on
- `modify_roll_numeric` — modifies a roll result, not a resolved damage total after the roll

The taxonomy §11.D already records this as open residue:
> `reduce_damage_taken` distinct from `grant_resistance` — single-group pressure from class-feature reactions

Gloves of Missile Snaring is a second independent pressure stream (magic item + ability-score-scaled amount). The amount shape is `DiceExpr` (1d10) plus an ability modifier addend — this is also a new surface shape since no existing `DiceAmount` carries an ability-modifier component.

**Proposed atom:** `reduce_damage_taken` in the effect category, with an amount type that can express `flat_expr + ability_modifier`.

### 3. `ReactionTrigger` weapon-kind filter (surface widening)

The existing `ReactionTrigger` union:
```typescript
| { readonly kind: "hit_by_attack_roll" }
```

This carries no weapon-kind constraint. Shield uses it correctly (fires on any attack roll hit). Gloves of Missile Snaring fires **only** on ranged or thrown weapon attacks, not melee or spell attacks.

A new variant is needed:
```typescript
| {
    readonly kind: "hit_by_weapon_attack_roll";
    readonly weaponKind: "ranged_or_thrown" | "melee" | "any";
  }
```

Using the bare `hit_by_attack_roll` would generate a dishonest trace that claims the gloves also fire on melee hits.

---

## Secondary gap: catch-the-projectile conditional

> If you reduce the damage to 0, you can catch the ammunition or weapon if it is small enough for you to hold in that hand.

This is a conditional physical interaction gated on the outcome of the `reduce_damage_taken` effect reaching zero. It has no deterministic mechanical consequence in the combat engine (no HP change, no condition applied, no action granted). Whether the item is "small enough" involves DM adjudication. This secondary is likely `dm_agenda` scope — it belongs to the caller (narrative layer), not to core mechanics atoms.

If modeled, it would need:
- A new atom or relation for "conditional secondary on damage-reduced-to-zero"
- A physical-size predicate with no runtime consequence

Recommendation: treat the catch mechanic as caller-owned narrative and omit from the core atom graph for this item. Document the omission explicitly in the encoding's description field.

---

## Summary of widenings required before this unit can be encoded

| Priority | Kind | Name | Scope |
|---|---|---|---|
| 1 | `new_subgraph` | `MagicItemRecord` + magic-item mechanics family | structural |
| 2 | `new_atom` | `reduce_damage_taken` | atom |
| 3 | `new_variant` | `ReactionTrigger.hit_by_weapon_attack_roll` with `weaponKind` filter | surface |
| 4 | `new_variant` | `DiceAmount` or amount type carrying ability-modifier addend | surface |

Items 3 and 4 are surface widenings that could be addressed quickly once the structural gap (1) is closed. Item 2 promotes an existing taxonomy residue to a full atom — this requires a deliberate decision since the taxonomy deferred it after single-group pressure.
