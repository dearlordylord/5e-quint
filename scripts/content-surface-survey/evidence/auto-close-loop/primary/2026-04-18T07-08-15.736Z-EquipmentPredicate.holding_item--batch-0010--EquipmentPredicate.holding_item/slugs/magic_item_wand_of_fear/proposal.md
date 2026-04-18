## Verdict

`Wand of Fear` does not fit the current surface honestly as-authored. The correct classification is `surface_widening`.

## What already fits

Most of the item matches the existing magic-item activation surface cleanly:

- `MagicItemRecord` with `rarity = "rare"` and `requiresAttunement = true`
- `ActivatedAbilityMechanics` with `condition = { kind = "holding_item" }`
- `ActivationResource.charge_pool` with cap 7
- `RestResetCadence.dawn` with regain `1d6 + 1`
- `ItemDestructionPolicy.last_charge_roll` with `d20`, destroy on `1`
- `grant_spell_access.dcOverride = { kind = "fixed", dc = 15 }`
- `grant_spell_access.areaOverride` for `Fear` as a `60-foot Cone`

## Actual gap

The missing shape is a way to narrow a granted spell's internal cast-time option set.

`Command` is not granted in its normal full form here. The item text grants a restricted version:

> `Command` ("flee" or "grovel" only)

The current `grant_spell_access` surface can restrict target selection and area, but it cannot say "this grant only allows these specific mode/option branches of the underlying spell."

Encoding plain `grant_spell_access` for `command` would be false, because it would imply access to the unrestricted spell.

## Proposed widening

Add a new optional variant on `grant_spell_access`, e.g. `spell_option_restriction`, that can narrow a granted spell to a closed subset of its authored cast-time options.

Sketch:

```ts
type GrantedSpellOptionRestriction =
  | {
      readonly kind: "effect_mode_option_ids";
      readonly allowedOptionIds: ReadonlyNonEmptyArray<string>;
    }
```

Applied here, the wand would grant `command` with only the authored option ids corresponding to `flee` and `grovel`.

## Why this is surface, not atom, widening

No new v4 atom is forced. The underlying mechanic is still `grant_spell_access`; the missing piece is a more precise variant on an existing surface shape.
