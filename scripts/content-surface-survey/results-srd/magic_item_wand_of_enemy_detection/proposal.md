# Proposal: Wand of Enemy Detection — surface_widening

## Unit

**Wand of Enemy Detection** — Wand, Rare, Requires Attunement (SRD 5.2.1)

## What fits cleanly

The item's resource and lifecycle mechanics encode without issue:

- **Charge pool**: `{ kind: "charge_pool", cap: { kind: "fixed", uses: 7 } }`
- **Reset cadence**: `{ kind: "dawn", regain: { kind: "fixed", expr: { dice: 1, dieSize: 6, flat: 1 } } }`
- **Destruction**: `{ kind: "last_charge_roll", die: 20, destroyOn: 1 }`
- **Activation cost**: `{ kind: "standard_action", action: "magic" }`
- **Duration**: `{ kind: "timed", value: { unit: "minute", amount: 1 } }`
- **Equipment gate**: `{ kind: "holding_item" }`
- **Attunement**: `requiresAttunement: true`
- **Family**: `ActivatedAbilityMechanics` (activation)

## What doesn't fit: the detect atom

The core effect is: *"you know the direction of the nearest creature Hostile to you within 60 feet, but not its distance."*

The `detect` atom is the right shape — it models spell-duration property scans within a radius. But it has three gaps:

### 1. Property enum missing `"hostile_creatures"`

```typescript
readonly property:
  | "magic"
  | "evil_and_good"
  | "poison_and_disease"
  | "thoughts";
```

Wand of Enemy Detection needs `"hostile_creatures"` (or `"enemies"`). This is a new variant of the closed enum — a `surface_widening`.

### 2. No directional/nearest-only output fields

The wand grants directional knowledge only — you learn the direction toward the nearest hostile, not distance, and not the positions of all hostiles in range.

The current `detect` atom has only `radiusFeet`. There is no field to express:
- **Directional output** (you learn direction, not omniscient presence-in-area)
- **Nearest-only scope** (only the single closest qualifying creature is revealed)

Proposed additions to `detect`:

```typescript
| {
    readonly kind: "detect";
    readonly property: ... | "hostile_creatures";
    readonly radiusFeet: number;
    readonly nearestOnly?: true;          // only the closest qualifying creature
    readonly outputKind?: "direction_only"; // direction but not distance
  }
```

### 3. Missing `DurationEndTrigger` variant: `"holder_stops_holding_item"`

> "The effect ends if you stop holding the wand."

The active 1-minute effect has an early-end condition tied to the holder's grip on the item. The current `DurationEndTrigger` union covers combat-action triggers (`target_makes_attack_roll`, `target_deals_damage`, `target_casts_spell`, `target_dons_armor`, `target_damaged_by_caster_or_ally`, `target_takes_damage`, `caster_recasts_spell`) but nothing for item-holding state changes.

Proposed addition:

```typescript
| { readonly kind: "holder_stops_holding_item" }
```

## Why no partial encoding was produced

A partial encoding using one of the four existing `detect` properties (`magic`, `evil_and_good`, etc.) would produce a valid-but-wrong trace that misrepresents the rule. Per the encoding guardrails, a misleading trace is worse than no trace. No `.dhall`, `.json`, or `.trace.md` were produced.

## Classification

`surface_widening` — the `ActivatedAbilityMechanics` family fits; all resource/lifecycle mechanics encode cleanly. The gap is confined to three missing variants/fields within the existing `detect` atom and `DurationEndTrigger` union. No new v4 taxonomy atom is required.
