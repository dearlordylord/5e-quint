# Proposal: Javelin of Lightning — structural_widening

## Primary blocker: no `magic_item` record kind

`UnitRecord` in `types.ts` is:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord`. The v4 TAXONOMY_atoms_graph.md lists `magic_item_root` as a validated source atom, but the surface has no record type, no mechanics family, and no tracer branch for it. No authored Dhall can produce a JSON that typechecks as a magic item.

The Javelin of Lightning cannot be encoded at all until this gap is closed.

---

## Secondary gaps (all within the Lightning Bolt property)

Even once a `MagicItemRecord` + mechanics family exists, the following surface/atom gaps remain:

### 1. `alter_damage_type` effect (atom_widening)

> "Each time you make an attack roll with this magic weapon and hit, you can have it deal Lightning damage instead of Piercing damage."

This is a passive on-hit option to substitute the weapon's damage type. No existing effect atom covers outgoing damage-type substitution:

- `damage` — emits damage, does not substitute an existing type
- `grant_resistance` — reduces incoming damage taken, not outgoing type
- `bypass_resistance` — overrides resistances, not damage type

A new atom `alter_damage_type` is needed, likely shaped as:

```typescript
export type AlterDamageTypeEffect = {
  readonly kind: "alter_damage_type";
  readonly from: DamageType;   // "piercing"
  readonly to: DamageType;     // "lightning"
  readonly optional: boolean;  // true — wielder chooses each hit
};
```

### 2. Line area shape (surface_widening)

> "This bolt forms a 5-foot-wide Line between you and the target."

`Attachment` area only supports `sphere`:

```typescript
| {
    readonly kind: "area";
    readonly shape: { readonly kind: "sphere"; readonly radiusFeet: number };
    readonly origin: AreaOrigin;
  }
```

A line shape requires a different geometry — it is defined by two endpoints (self and primary target) and a width, not a radius from a single origin. Proposed addition to the shape union:

```typescript
| { readonly kind: "line"; readonly widthFeet: number }
```

The origin would always be `self` for a thrown-weapon bolt, but the shape itself is new.

### 3. Dawn reset cadence (surface_widening)

> "This property can't be used again until the next dawn."

`RestResetCadence` covers:

```typescript
| { readonly kind: "short_or_long_rest" }
| { readonly kind: "long_rest" }
| { readonly kind: "short_rest" }
| { readonly kind: "partial_short_full_long"; readonly shortRestRefill: number }
```

A "next dawn" cadence appears across many SRD magic items and is not equivalent to any rest type. Proposed addition:

```typescript
| { readonly kind: "dawn" }
```

This would require a corresponding `dawn_window` atom (or reuse of an existing lifecycle atom) in the tracer.

### 4. Forgo-attack-roll alternative activation (structural_widening within magic_item family)

> "you can forgo making a ranged attack roll and instead turn the weapon into a bolt of lightning."

The standard `ActivationPhase` model for spells requires either an `attack_roll` or `save_gate` phase. The Lightning Bolt property does neither in isolation — it skips the attack roll entirely and fires an AoE save_gate. The player chooses between:

- (A) Make a normal ranged attack roll (standard weapon use)
- (B) Forgo the attack roll → trigger AoE save_gate

This "exclusive alternative to the attack roll" pattern has no surface representation. It is not:
- A normal `activation` phase (which begins with the phase kind, not a player choice to skip)
- An `on_hit_trigger` mastery (which fires after a hit, not instead of one)
- An `ongoing_effect` operation (not a persistent rider)

A future `magic_item` family likely needs a property type that can express: "instead of the normal weapon attack, activate this alternative resolution."

---

## Encoding sketch (for future implementation)

```
MagicItemRecord = UnitMetadata & {
  kind: "magic_item";
  requiresAttunement: boolean;
  properties: ReadonlyArray<MagicItemProperty>;
}

MagicItemProperty =
  | { kind: "passive_on_hit"; effect: MagicItemEffect }
  | { kind: "activated"; cost: ActivationCost; resource: ...; resetCadence: ...; payload: ... }
  | ...
```

The two Javelin of Lightning properties would be separate entries in `properties`:

1. Passive: `alter_damage_type` (Lightning for Piercing, optional, on any hit)
2. Activated: forgo-attack AoE — save_gate against DC 13 DEX, 4d6 Lightning, line shape, dawn reset

---

## Classification

`structural_widening` — the unit cannot be honestly placed in any existing record kind. All secondary gaps listed above are presupposed by the structural gap.
