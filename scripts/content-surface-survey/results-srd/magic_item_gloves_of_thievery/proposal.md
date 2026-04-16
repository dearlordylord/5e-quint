# Proposal: Widenings required for Gloves of Thievery

## Outcome: `structural_widening`

The unit cannot be encoded because the `magic_item` kind does not exist in `UnitRecord`.

---

## Widening 1 (structural): `MagicItemRecord` + `magic_item` kind

### Gap

`types.ts` defines:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord`. The taxonomy v4 lists `magic_item_root` as a first-class source atom and the survey queue contains many magic items, but the surface was never widened to include the corresponding record type.

### What is needed

A new top-level record variant:

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
};

export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord | MagicItemRecord;
```

A `MagicItemMechanics` type and at least one `family` are also needed (see Widening 2 for the first concrete family pressure).

### Evidence

> *Wondrous Item, Uncommon.* These gloves are imperceptible while worn.

---

## Widening 2 (surface): `RollKind: "ability_check"`

### Gap

```typescript
export type RollKind = "attack_roll" | "saving_throw";
```

Ability checks (including skill checks such as Sleight of Hand) are not represented. The `RollModifierOperation` and `modify_roll_numeric` atom are already in the surface, so a new `RollKind` variant is sufficient — no new atom is needed.

### What is needed

```typescript
export type RollKind = "attack_roll" | "saving_throw" | "ability_check";
```

Optionally a narrower `"skill_check"` if the surface later needs to distinguish skill checks from raw ability checks. For this item a single `"ability_check"` variant is enough.

### Evidence

> you gain a +5 bonus to Dexterity (Sleight of Hand) checks

---

## Mechanics shape after both widenings

Once both widenings land, Gloves of Thievery would encode as a passive-always-on family (no activation, no resource, no reset):

```typescript
type PassiveModifierMechanics = {
  readonly family: "passive_modifier";
  readonly effect: {
    readonly kind: "modify_roll_numeric";
    readonly on: ReadonlyArray<RollKind>;        // ["ability_check"]
    readonly delta: DiceDelta;                   // { dice: 0, dieSize: 0, sign: "+", flat: 5 }
    // or a flat-only variant of DiceDelta
  };
};
```

Note: `DiceDelta` currently has `dice/dieSize/sign` but no `flat`. A flat integer bonus (+5) requires either extending `DiceDelta` with an optional `flat` field or using a separate `FlatDelta` type. This is a further `surface_widening` inside the numeric bonus shape, secondary to the two widenings above.

---

## Summary table

| # | Kind | Name | Status |
|---|------|------|--------|
| 1 | `new_subgraph` | `MagicItemRecord` + `magic_item` kind | **Blocks encoding** |
| 2 | `new_variant` | `RollKind: "ability_check"` | Blocks mechanic modeling |
| 3 | `new_variant` | `DiceDelta` flat bonus field (or `FlatDelta`) | Tertiary; needed for "+5 flat" |
