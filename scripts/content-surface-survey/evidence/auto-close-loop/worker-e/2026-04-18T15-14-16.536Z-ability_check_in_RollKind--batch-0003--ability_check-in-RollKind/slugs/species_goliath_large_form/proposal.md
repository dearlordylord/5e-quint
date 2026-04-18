# Proposal: Large Form (Goliath)

`Large Form` is close to an honest `SpeciesTraitRecord` with `activation` mechanics, but the current surface still misses the trait's core transformation.

## Why I did not author JSON

The available shape can already represent several parts of the rule:

- `species_trait` top-level kind
- `activation` mechanics family
- `bonus_action` activation cost
- `use_count` with `fixed` 1 use
- `long_rest` reset
- `timed` duration for 10 minutes
- `modify_roll_advantage` on `ability_check`
- `modify_speed` by `+10 feet`

That is not enough for an honest encoding, because the defining mechanic is the temporary size change itself. Encoding only the secondary riders would produce a misleading trace.

## Required widening

### 1. New atom: `change_size`

The surface needs a creature-facing size-change effect atom, distinct from item-shape changes.

Evidence:

> "you can change your size to Large as a Bonus Action"

Why existing atoms are insufficient:

- `alter_item_kind` is item-scoped, not creature-scoped.
- `transform_target` is a full polymorph / form-replacement atom, which is far broader than this trait and would be dishonest here.
- `modify_speed` and `modify_roll_advantage` only cover the riders after the size change; they do not model the transformation.

Suggested shape:

```ts
{
  readonly kind: "change_size";
  readonly size: "large";
}
```

If later pressure requires up/down changes or temporary minimum/maximum sizing, that can widen from here.

### 2. New species-trait level gate

Species traits currently have no unlock field analogous to class features' `acquiredAtLevel`.

Evidence:

> "Starting at character level 5"

Without a gate, any authored `Large Form` record would falsely appear usable before level 5.

Suggested shape:

- Add an optional field on `SpeciesTraitRecord`, for example:

```ts
readonly availableAtCharacterLevel?: number;
```

This keeps the existing record family and avoids inventing a new procedure for a pure availability constraint.

### 3. New early-end variant for owner dismissal

The trait may be ended voluntarily before the 10-minute timer expires.

Evidence:

> "This transformation lasts for 10 minutes or until you end it (no action required)."

Current `Duration` shapes support timed expiry and a closed set of trigger-based early ends, but not bearer-initiated dismissal on an activated species trait.

Suggested shape:

- Either an activated-ability-duration flag such as:

```ts
readonly dismissible?: { readonly kind: "no_action" };
```

- Or a generalized duration early-end trigger for owner dismissal.

## Classification

`atom_widening`

Reason: even though the family fit exists, the missing `change_size` atom blocks an honest encoding of the rule's primary effect. The level gate and voluntary end are additional surface gaps.
