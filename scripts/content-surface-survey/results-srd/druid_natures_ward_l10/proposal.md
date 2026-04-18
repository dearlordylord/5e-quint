# Proposal: Nature's Ward (Druid L10) — Surface Widening

## Unit

- **Slug**: `druid_natures_ward_l10`
- **Kind**: `class_feature` — Circle of the Land, level 10
- **SRD section**: Classes/Druid#Nature's Ward

## RAW text

> You are immune to the Poisoned condition, and you have Resistance to a damage type associated with your current land choice in the Circle Spells feature, as shown in the Nature's Ward table.
>
> | Land Type | Resistance |
> |---|---|
> | Arid | Fire |
> | Polar | Cold |
> | Temperate | Lightning |
> | Tropical | Poison |

## What encodes cleanly

- `grant_condition_immunity: "poisoned"` — fully expressible with the existing atom and passive family. Encoded in the dhall; traces correctly.

## What requires a widening

### `grant_resistance` with a land-state-derived damage type

The feature's resistance is **not freely chosen**. The damage type is **determined** by the druid's current Circle of the Land choice (Arid/Polar/Temperate/Tropical). There is a fixed mapping:

| Land type | Resistance |
|---|---|
| Arid | Fire |
| Polar | Cold |
| Temperate | Lightning |
| Tropical | Poison |

No existing `DamageTypeRef` variant expresses this:

- `DamageType` (plain string) — wrong; the type varies by land choice, not fixed.
- `CastTimeChoice<DamageType>` — **dishonest**; this implies the player picks from the options at cast or build time. Nature's Ward does not allow that — the resistance is constrained to the land type already chosen for the subclass. Using `CastTimeChoice<DamageType>` with `options: ["fire", "cold", "lightning", "poison"]` would imply freedom of choice that does not exist RAW.

## Proposed widening: `DamageTypeRef.subclass_state_table`

Add a new variant to `DamageTypeRef`:

```typescript
| {
    readonly kind: "subclass_state_table";
    // The character-state variable that acts as the lookup key.
    // For Circle of the Land: "circle_land_type".
    readonly key: string;
    // Closed key→DamageType mapping. The resistance applied is
    // the DamageType whose key matches the current value of the
    // character-state variable at runtime.
    readonly table: Readonly<Record<string, DamageType>>;
  }
```

**Usage**:
```typescript
{
  kind: "grant_resistance",
  damageType: {
    kind: "subclass_state_table",
    key: "circle_land_type",
    table: {
      arid: "fire",
      polar: "cold",
      temperate: "lightning",
      tropical: "poison"
    }
  }
}
```

**Justification**: The druid's land choice is a persistent character-state variable set at Circle of the Land subclass selection. It determines the resistance type for Nature's Ward without player re-selection. This is a distinct semantic from both a fixed damage type and a cast/build-time free choice. The `subclass_state_table` variant models exactly one pattern: a closed table lookup keyed by a named character-state variable.

**Alternative considered**: A more general `character_state_derived` variant with a reference to a named character-state slot. The `subclass_state_table` form is preferred because it keeps the table explicit in the content unit (visible to tracer, readable offline) rather than requiring the runtime to maintain a separate lookup.

**Pressure**: Single unit (Nature's Ward). Not yet promoted to v4 taxonomy. Record as open surface widening pressure.

## Classification

- **Outcome**: `surface_widening`
- **Confidence**: high
- **Partial encoding note**: The dhall and JSON encode only the `grant_condition_immunity: "poisoned"` grant. The `grant_resistance` grant is omitted to avoid a misleading trace.
