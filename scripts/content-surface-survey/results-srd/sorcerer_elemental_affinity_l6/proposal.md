# Proposal: Surface Widening for Sorcerer Elemental Affinity (L6)

## Unit

- **Kind**: `class_feature`
- **Class / Level**: Sorcerer, L6
- **SRD section**: Classes/Sorcerer#Elemental Affinity

## SRD Text

> Your draconic magic has an affinity with a damage type associated with dragons. Choose one of those types: Acid, Cold, Fire, Lightning, or Poison.
>
> You have Resistance to that damage type, and when you cast a spell that deals damage of that type, you can add your Charisma modifier to one damage roll of that spell.

## What Fits

The feature naturally maps to a `composite` `class_feature` with two `passive` parts:

**Part 1 — Resistance** (clean):

```dhall
{ kind = "grant_resistance"
, damageType = { kind = "choice", label = "Elemental Affinity damage type", options = [ "acid", "cold", "fire", "lightning", "poison" ] }
}
```

`DamageTypeRef = DamageType | CastTimeChoice<DamageType>` already supports this. The `CastTimeChoice<T>` comment explicitly includes build-time picks (Dragonborn ancestry is cited), so a build-time selection here is in-vocabulary.

**Part 2 — CHA modifier to one damage roll** (does NOT fit):

The natural atom is `modify_damage_numeric`. It currently reads:

```typescript
| {
    readonly kind: "modify_damage_numeric";
    readonly delta: DiceDelta;
    readonly weaponFilter?: WeaponFilter;
  }
```

Three gaps block an honest encoding:

### Gap 1: `modify_damage_numeric` lacks `damageTypeFilter`

The rider only applies when the spell's damage type matches the chosen type. `modify_roll_numeric` has `skillFilter` and `weaponFilter` to narrow the roll set; `modify_damage_numeric` has only `weaponFilter`. A `damageTypeFilter?: DamageTypeRef` field (analogous to the existing weapon narrowing) would close this gap.

### Gap 2: `modify_damage_numeric` lacks `count`

The bonus applies to **one** damage roll per qualifying spell cast, not to all damage rolls while the feature is active. `modify_roll_numeric` already carries `count?: number` for exactly this pattern (e.g., Guidance: `count=1`). The same field on `modify_damage_numeric` would cover it.

### Gap 3: Shared build-time choice binding

Both Part 1 and Part 2 reference the **same** player-selected damage type (chosen once at feature acquisition, not per-cast). The surface currently has no mechanism to declare that two separate atom instances share a single `CastTimeChoice` selection. Two independent `CastTimeChoice<DamageType>` fields in two atoms would — correctly from a type perspective but incorrectly semantically — imply two independent picks.

This is a subtler gap than the field-level widening. One approach would be a named build-time binding:

```typescript
type BuildTimeBinding = { readonly kind: "named"; readonly id: string };
// atoms reference a binding id rather than embedding a fresh CastTimeChoice
```

But the pressure here is narrow (one feature). A lighter fix: document that when `CastTimeChoice<DamageType>` appears in multiple grants within the same unit with identical `label`, they are resolved as one shared pick. That convention should be made explicit in the surface spec if adopted.

## Proposed Changes to `types.ts`

```typescript
// Widen modify_damage_numeric:
| {
    readonly kind: "modify_damage_numeric";
    readonly delta: DiceDelta;
    readonly weaponFilter?: WeaponFilter;
    readonly damageTypeFilter?: DamageTypeRef;   // NEW: scope to qualifying damage type
    readonly count?: number;                      // NEW: limit to N qualifying rolls (absent = unlimited)
  }
```

The shared-choice binding issue may be addressed by convention (same `label` = same choice) or by a future named-binding mechanism; either decision should be recorded in the spec.

## Outcome

`surface_widening` — the `composite` class-feature family exists, the resistance grant is clean, but `modify_damage_numeric` requires two new fields and the shared build-time choice semantics need explicit surface support.
