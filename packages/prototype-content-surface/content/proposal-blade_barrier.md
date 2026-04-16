# Proposal: Blade Barrier — surface_widening

## Unit

- **Name:** Blade Barrier
- **Kind:** spell
- **Level:** 6 (Evocation, Concentration 10 min)
- **Provenance:** srd-5.2.1

## Why it does not fit honestly

Blade Barrier is a `ongoing_effect` spell — concentration, persistent area, repeated triggering — but two surface shapes are missing.

### Gap 1 — `Attachment` area shape: `wall`

`Attachment.area` only supports:

```typescript
{ readonly kind: "sphere"; readonly radiusFeet: number }
```

Blade Barrier creates a wall in one of two configurations:

- **Straight wall:** up to 100 ft long × 20 ft high × 5 ft thick
- **Ring wall:** up to 60 ft diameter × 20 ft high × 5 ft thick

Neither is a sphere. A `wall` shape variant with linear and ring sub-shapes is required. Suggested addition to the `Attachment` area shape union:

```typescript
| {
    readonly kind: "wall";
    readonly form:
      | { readonly kind: "straight"; readonly maxLengthFeet: number; readonly heightFeet: number; readonly thicknessFeet: number }
      | { readonly kind: "ring"; readonly maxDiameterFeet: number; readonly heightFeet: number; readonly thicknessFeet: number };
  }
```

### Gap 2 — `OngoingOperation`: contact-triggered save gate

The two existing `OngoingOperation` variants:

- `roll_modifier` — adds a dice delta to attack rolls / saving throws
- `damage_on_hit` — rider damage when the caster scores a weapon/spell hit against an attached creature

Neither covers the Blade Barrier pattern: **a DEX save gate that fires when a creature is present in, enters, or ends its turn in the area, dealing 6d10 Force on fail and half on success**.

This is a structurally different pattern from `damage_on_hit` (which requires the caster to hit a target). The save fires automatically on contact/presence, not on a caster-initiated attack roll. Suggested new variant:

```typescript
| {
    readonly kind: "save_gate_on_contact";
    readonly triggers: ReadonlyArray<
      | { readonly kind: "in_area_at_cast" }
      | { readonly kind: "enters_area" }
      | { readonly kind: "ends_turn_in_area" }
    >;
    readonly ability: Ability;
    readonly dc: DcSource;
    readonly onFail: Effect;
    readonly onSuccess: Effect;
    readonly usageLimit?: { readonly kind: "once_per_turn" };
  }
```

The `once_per_turn` cap ("A creature makes that save only once per turn") is an intrinsic part of this pattern and should be expressible on the variant.

## Secondary omissions (not blocking)

- **Three-Quarters Cover:** The wall grants Three-Quarters Cover to creatures behind it. This would likely map to a `modify_ac` or `modify_roll_advantage` effect keyed to the area. No existing `OngoingOperation` covers a passive cover grant; separate widening required if modeled.
- **Difficult Terrain:** The wall's space is Difficult Terrain. This would map to `block_travel` or a `modify_speed` effect. No existing `OngoingOperation` covers a terrain effect; separate widening required if modeled.

These are secondary and do not block the core mechanical encoding. The blocking gaps are Gap 1 and Gap 2 above.

## v4 atom inventory check

All atoms needed for this spell exist in v4:

- `area` attachment atom ✓
- `save_gate` resolution atom ✓
- `damage` effect atom ✓
- `concentration_lock`, `concentrate`, `expire` lifecycle atoms ✓
- `turn_end_window` window atom ✓ (covers "ends turn" trigger)
- No new atom is needed — only new surface shape variants

## Classification

`surface_widening`: the `ongoing_effect` family is correct, two existing surface type unions need new variants (`Attachment` area shape and `OngoingOperation`).
