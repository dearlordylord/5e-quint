# Proposal: Potion of Giant Strength

## Outcome: `structural_widening`

---

## Why the unit cannot be encoded today

### Gap 1 — No `magic_item` UnitRecord kind (structural)

`UnitRecord` in `types.ts` is:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord`. The taxonomy v4 lists `magic_item_root` as a source atom, confirming the intent to model magic items, but the surface schema has not been widened to include them. No mechanics family exists either.

### Gap 2 — Missing `modify_ability_score` effect atom (atom)

The potion's sole core mechanic is:

> "your Strength score changes for 1 hour"

This is a runtime mutation of an ability score — setting STR to a fixed value (21, 23, 25, 27, or 29 depending on variant) for a timed duration.

No such atom exists in v4. The TAXONOMY explicitly defers it:

> `modify_ability_score` as a runtime effect versus as pre-runtime character state — currently treated as out-of-scope.

### Gap 3 — Missing conditional no-effect guard (surface variant)

> "The potion has no effect on you if your Strength is equal to or greater than that score."

This is a pre-activation comparison between the consumer's current STR and the potion's target value. No existing surface type models an "activation guard" that gates the item on a creature's current ability score. This is distinct from a save gate or attack roll — it is a deterministic threshold check on a stat.

---

## Proposed widenings (in dependency order)

### 1. `MagicItemRecord` — new top-level UnitRecord kind

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly rarity: MagicItemRarity;       // "common" | "uncommon" | "rare" | "very_rare" | "legendary" | "artifact"
  readonly mechanics: MagicItemMechanics;
};
```

A new mechanics family is needed. Potions are consumables — single-use activation with a timed effect. The minimal family shape:

```typescript
export type ConsumableMechanics = {
  readonly family: "consumable";
  readonly activationCost: { readonly kind: "action" };  // drinking is an action
  readonly effect: MagicItemEffect;
  readonly duration: Duration;
};
```

### 2. `modify_ability_score` — new effect atom

```typescript
export type ModifyAbilityScoreEffect = {
  readonly kind: "modify_ability_score";
  readonly ability: Ability;
  readonly mode: "set_to";               // only "set_to" needed for potions; "add" could follow
  readonly value: number;
  readonly target: "self";
};
```

The potion uses `mode: "set_to"` (not add/subtract). This is mechanically distinct from `modify_roll_numeric` or `scale_numeric_bonus` — it overrides the stat directly.

### 3. Conditional no-effect guard — new surface variant

A guard on the `ConsumableMechanics` (or as a general `ActivationGuard`) expressing "this item does nothing if consumer's [ability] ≥ [threshold]":

```typescript
export type AbilityScoreGuard = {
  readonly kind: "ability_score_floor";
  readonly ability: Ability;
  readonly threshold: number;
  // effect: no-op if consumer's score >= threshold
};
```

This could be an optional `guard` field on the mechanics, or a general `precondition` type on `ConsumableMechanics`.

---

## Notes on the variant table

The SRD presents Potion of Giant Strength as a single item with five variants (hill/frost-stone/fire/cloud/storm), each a different rarity and STR target. The surface schema may need to handle this as:
- Five separate `MagicItemRecord` entries (one per variant), or
- A parameterized variant table attached to a single record.

The simplest approach is five separate records (matching the pattern of other parameterized items like Armor of Resistance). The variant table is authoring metadata, not a mechanics-level concern.
