# Nature's Ward (druid L10)

## Verdict

`surface_widening`

## Why It Does Not Fit Cleanly

`Nature's Ward` is structurally a `class_feature` with `passive` mechanics.

One half fits the current surface directly:

- `You are immune to the Poisoned condition` maps to `grant_condition_immunity`.

The second half does not fit honestly:

- `you have Resistance to a damage type associated with your current land choice in the Circle Spells feature`

The existing `grant_resistance` atom requires a `DamageTypeRef`, which can be:

- a fixed damage type, or
- a closed `choice` resolved at build/cast time.

That is not the same mechanic. The rule depends on another feature's live state: the druid's current land choice in `Circle Spells`. Encoding this as a fixed damage type would be false. Encoding it as a local closed choice would also be false, because the choice authority belongs to the referenced feature, not to `Nature's Ward` itself.

## Narrowest Honest Widening

Add a surface variant that lets a passive effect project its payload from referenced feature state.

Candidate shape:

```ts
type DamageTypeRef =
  | DamageType
  | CastTimeChoice<DamageType>
  | {
      readonly kind: "feature_projection";
      readonly featureId: string;
      readonly field: string;
    };
```

Or more narrowly, only on `grant_resistance`:

```ts
{
  readonly kind: "grant_resistance";
  readonly damageType:
    | DamageType
    | CastTimeChoice<DamageType>
    | {
        readonly kind: "circle_spells_current_land_resistance";
      };
}
```

The general projection shape is cleaner if other units will need to read runtime-selected state from sibling features.

## Evidence

> You are immune to the Poisoned condition, and you have Resistance to a damage type associated with your current land choice in the Circle Spells feature, as shown in the Nature's Ward table.

## Why This Is Not Atom Widening

No new v4 atom is forced here:

- `grant_condition_immunity` already exists.
- `grant_resistance` already exists.

The gap is in the authored surface's ability to parameterize an existing atom from another feature's current state.
