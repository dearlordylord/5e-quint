# Proposal: Giant Slayer — Structural Widening

## Unit

**Name:** Giant Slayer  
**Kind:** magic_item  
**Provenance:** srd-5.2.1, Equipment/Magic-Items/Items-A-H.md §Giant Slayer  
**Rarity:** Rare  
**Outcome:** `structural_widening`

---

## Why encoding is blocked

### Blocker 1 — No `magic_item` kind in `UnitRecord` (structural)

`types.ts` defines:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord` and no `magic_item` kind. The v4 taxonomy lists `magic_item_root` as a source atom but the surface has never been extended. Every magic item in the survey corpus is blocked at this level. This is the primary structural gap.

### Blocker 2 — No passive weapon bonus family (structural / surface)

Giant Slayer's first mechanic is:

> "You gain a +1 bonus to attack rolls and damage rolls made with this magic weapon."

This is an **always-on passive property** of the item — no activation, no quota, no concentration, no reaction trigger. The existing families are:

| Family | Requires | Giant Slayer fit? |
|--------|----------|-------------------|
| `activation` (class feature) | explicit activation cost + use_count | No — passive |
| `on_hit_trigger` (mastery) | weapon hit event | No — fires on every attack, not just hits |
| `ongoing_effect` (spell) | spell slot + duration | No — persistent while attuned/wielded |
| `activation` (spell) | spell slot + casting time | No |

No existing family models a static passive bonus granted by an equipped item. A new family such as `passive_item_property` or `attunement_passive` is needed.

### Blocker 3 — No creature-type filter on on-hit triggers (surface)

Giant Slayer's second mechanic fires only against Giants:

> "When you hit a Giant with this weapon, the Giant takes an extra 2d6 damage..."

`MasteryTrigger` in `types.ts` is:

```typescript
export type MasteryTrigger =
  | { readonly kind: "weapon_hit" }
  | { readonly kind: "weapon_hit_melee_only" };
```

Neither variant carries a creature-type predicate. Without a filter, any encoding using `on_hit_trigger` would dishonestly apply the rider to all weapon hits. A new variant is needed:

```typescript
| { readonly kind: "weapon_hit_target_type"; readonly creatureType: CreatureType }
```

…where `CreatureType` includes at minimum `"giant"`.

### Blocker 4 — No "weapon's own damage type" as a `DamageType` (surface)

The extra damage is:

> "2d6 damage **of the weapon's type**"

`DamageType` is a closed enum of 13 fixed types (acid, bludgeoning, cold, …). There is no `"weapon_type"` or runtime-resolved alias. The correct modelling requires either:

- A special `DamageType` variant `"weapon_own"` that resolves to the weapon's physical damage type at runtime, or
- A new top-level concept `InheritedDamageType` for damage expressions that delegate their type to the bearing weapon.

---

## Proposed surface extensions

### 1. `MagicItemRecord` + `magic_item` in `UnitRecord`

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly rarity: MagicItemRarity;
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
};

export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord | MagicItemRecord;
```

### 2. `passive_item_property` family

```typescript
export type PassiveItemPropertyMechanics = {
  readonly family: "passive_item_property";
  readonly effects: ReadonlyArray<PassiveItemEffect>;
};

export type PassiveItemEffect =
  | { readonly kind: "modify_roll_numeric"; readonly on: ReadonlyArray<RollKind>; readonly delta: DiceDelta }
  // ... other passive effects
```

The +1 to attack and damage rolls encodes as a `modify_roll_numeric` passive effect on `["attack_roll"]` and an additive damage bonus.

### 3. Creature-type filter on on-hit riders

```typescript
export type CreatureType =
  | "giant"
  | "undead"
  | "dragon"
  // ... other SRD creature types as pressure demands

export type MasteryTrigger =
  | { readonly kind: "weapon_hit" }
  | { readonly kind: "weapon_hit_melee_only" }
  | { readonly kind: "weapon_hit_target_type"; readonly creatureType: CreatureType };
```

### 4. Runtime-resolved damage type

```typescript
export type DamageType =
  | "acid" | "bludgeoning" | ... | "thunder"
  | "weapon_own";  // resolves to the weapon's physical damage type at runtime
```

Or a union type:

```typescript
export type EffectDamageType = DamageType | { readonly kind: "weapon_own" };
```

---

## Proposed tracer subgraph for Giant Slayer

Once the surface is widened, the expected graph shape:

```
magic_item_root (Giant Slayer)
  ├── roots → passive_item_property
  │     └── grants → modify_roll_numeric (+1, attack_roll + damage)
  │           └── attaches_to → weapon (self)
  └── roots → on_hit_trigger (weapon_hit_target_type: giant)
        └── opens_window → on_hit_window
              ├── grants → damage (2d6 weapon_own)
              │     └── attaches_to → target
              └── grants → save_gate (STR, DC 15, weapon_attack_dc base=8... wait)
```

Note: The DC is fixed at 15, not derived from the weapon attack formula (DC 8 + ability + PB). This is a fixed DC, which fits the existing `DcSource` as a new variant:

```typescript
export type DcSource =
  | { readonly kind: "caster_spell_save_dc" }
  | { readonly kind: "weapon_attack_dc"; readonly base: number }
  | { readonly kind: "fixed"; readonly value: number };  // needed for Giant Slayer's DC 15
```

---

## Summary of gaps

| Gap | Kind | Narrowest classification |
|-----|------|--------------------------|
| No `magic_item` in `UnitRecord` | new_subgraph | structural_widening |
| No passive item property family | new_subgraph | structural_widening |
| No creature-type filter on on-hit triggers | new_variant | surface_widening |
| No `weapon_own` damage type | new_variant | surface_widening |
| No fixed-DC `DcSource` variant | new_variant | surface_widening |

Primary classification: **`structural_widening`** (the top-level kind is absent).
