# Proposal: Holy Avenger — structural_widening

## Outcome

`structural_widening` — the `magic_item` kind does not exist in `UnitRecord`. No encoding was attempted.

## Primary gap: MagicItemRecord is missing

`types.ts` defines:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord` and no `magic_item` mechanics family. The taxonomy atom inventory lists `magic_item_root` as a source atom (v4 §1), but the authoring surface has not been widened to accept this kind.

Magic items need at minimum:

- A top-level `kind: "magic_item"` record with `rarity`, attunement metadata (`requiresAttunement: false | { byClass?: ClassName }`, `attunementSlot`), and item category (weapon, armor, wondrous).
- A mechanics union analogous to `SpellMechanics` / `ClassFeatureMechanics`. The simplest first family would be `passive_effect` — persistent effects active while the item is equipped/attuned, with no activation cost.

## Secondary gaps (would apply even after structural fix)

### 1. `damage_roll` missing from `RollKind`

The +3 bonus applies to attack rolls **and** damage rolls. `RollKind = "attack_roll" | "saving_throw"`. Damage rolls are not representable. The `modify_roll_numeric` operation's `on` field cannot express this.

**Proposed fix:** Add `"damage_roll"` to `RollKind`, or introduce a dedicated `WeaponModifierOperation` that encodes the canonical `+N to attack and damage` pattern as a single field.

### 2. `creature_type_filter` missing from `DamageOnHitOperation`

The extra 2d10 Radiant fires only against Fiends and Undead. `DamageOnHitOperation` has no `targetFilter` predicate:

```typescript
// current
export type DamageOnHitOperation = {
  readonly kind: "damage_on_hit";
  readonly damageType: DamageType;
  readonly amount: DiceAmount;
};
```

**Proposed fix:** Add an optional `targetFilter` field:

```typescript
export type CreatureTypeFilter = {
  readonly kind: "creature_type";
  readonly types: ReadonlyArray<"fiend" | "undead" | "dragon" | ...>;
};

export type DamageOnHitOperation = {
  readonly kind: "damage_on_hit";
  readonly damageType: DamageType;
  readonly amount: DiceAmount;
  readonly targetFilter?: CreatureTypeFilter;
};
```

### 3. Emanation attachment (self-centered, friendly-scoped) missing

The Holy Avenger creates a 10-ft emanation centered on the wielder affecting only Friendly creatures. Current `Attachment`:

- `self` — no radius, no multi-creature scope
- `area` — requires an `origin` of `point_within_range` or `on_primary_target`; no "self-centered persistent aura" origin; no friendly-creature scope filter

**Proposed fix:** Add an `emanation` attachment kind:

```typescript
| {
    readonly kind: "emanation";
    readonly radiusFeet: number | ThresholdTiers<number>;
    readonly scope: "self_and_friendly" | "all_creatures" | "self_only";
  }
```

The `self_and_friendly` scope models the Holy Avenger aura. The radius field accepts `ThresholdTiers<number>` to handle the Paladin-level scaling (gap 4 below).

### 4. Class-level threshold scaling on attachment radius

The emanation grows from 10 ft to 30 ft at Paladin level 17. No existing scaling variant addresses:
- Tiered growth of a geometric parameter (radius)
- Conditioned on a specific class level (not character level)

`LevelAxis` already has `"class"`, so `ThresholdTiers<number>` with `axis: "class"` would work — but the axis needs to reference a specific class (`paladin`). The current `LevelAxis` type doesn't carry a class tag.

**Proposed fix (minimal):** Extend `LevelAxis` with a tagged class variant:

```typescript
export type LevelAxis =
  | "character"
  | "class"         // existing (ambiguous — which class?)
  | { readonly kind: "named_class"; readonly className: ClassName }
  | "slot"
  | "subclass"
  | "proficiency_bonus";
```

Alternatively, keep `"class"` ambiguous for now and encode the Holy Avenger radius with an untagged `ThresholdTiers<number>` with `axis: "class"`, annotating the specific class in a `notes` field.

## Graph sketch (for future encoding reference)

```
magic_item_root (Holy Avenger)
  └─roots─> attune (paladin only)
  └─roots─> passive_effect [weapon held/drawn]
               ├─grants─> modify_roll_numeric (+3 attack_roll)
               ├─grants─> modify_roll_numeric (+3 damage_roll)        [gap 1]
               ├─grants─> damage_on_hit (2d10 radiant, filter: fiend|undead) [gap 2]
               └─grants─> emanation (10 ft, self_and_friendly)         [gap 3]
                             ├─scale_numeric_bonus (→30 ft @ paladin L17) [gap 4]
                             └─grants─> modify_roll_advantage (advantage on saves vs spells/magical effects)
```

## Atoms that would be reused (no widening needed)

- `magic_item_root` — already in v4 taxonomy §1
- `attune` — already in v4 taxonomy §2
- `modify_roll_numeric` — already in types.ts / tracer
- `modify_roll_advantage` — already in types.ts / tracer
- `damage` — already in types.ts / tracer
- `scale_numeric_bonus` — already in types.ts / tracer
- `attunement_slot` — already in v4 taxonomy §7
