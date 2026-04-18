# Wand of Fireballs

## Verdict

`Wand of Fireballs` fits the existing `magic_item` + `activation` family structurally, but it does **not** fit the current surface honestly. The missing pieces are both surface-level, not taxonomy-level:

- a fixed item spell DC for casts from the item;
- an attunement qualifier narrower than a bare boolean.

That makes this a `surface_widening`, not a `structural_widening` or `atom_widening`.

## Why I stopped before authoring

The closest existing encoding would mirror `magic_item_wand_of_magic_missiles`:

- `activationCost = action`
- `resource = charge_pool` with cap 7
- `resetCadence = dawn` with `1d6 + 1`
- `destruction = last_charge_roll`
- `grant_spell_access.mode = charge_cast` for `fireball`, levels 3-5

But that would still be dishonest, because the wand does **not** use the wielder's spell save DC. Its text supplies a fixed DC:

> "you can expend no more than 3 charges to cast *Fireball* (**save DC 15**) from it"

Current `DcSource` only allows:

- `caster_spell_save_dc`
- `weapon_attack_dc`
- `innate_dc`

None of those means "fixed DC 15 from the item."

## Proposed widenings

### 1. `DcSource.fixed`

Add a `DcSource` variant for item- or effect-defined fixed DCs, e.g.:

```ts
{ readonly kind: "fixed"; readonly dc: number }
```

This is the narrowest honest widening. It keeps the existing activation/save-gate family intact and solves the actual rule pressure.

Evidence:

> "cast *Fireball* (**save DC 15**) from it"

### 2. Attunement qualifier beyond `requiresAttunement: boolean`

Current `MagicItemRecord` can encode only whether attunement is required:

- `requiresAttunement: true | false`

It cannot preserve:

> "Requires Attunement **by a Spellcaster**"

This is secondary to the fixed-DC blocker, but still a real provenance/surface loss. A narrow widening could be an optional qualifier field on the record, such as:

```ts
readonly attunementPrerequisite?: "spellcaster"
```

or a small closed union if more SRD prerequisites surface later.

## Why this is not an atom widening

No new v4 atom is forced here. The mechanics are still expressible in the existing atom vocabulary:

- `magic_item_root`
- `activate`
- `charge_pool`
- `grant_spell_access`
- `duration_window` for dawn recharge
- `item_destruction`

The gap is that the authored surface cannot parameterize the cast with the wand's fixed save DC, and cannot preserve the attunement qualifier.
