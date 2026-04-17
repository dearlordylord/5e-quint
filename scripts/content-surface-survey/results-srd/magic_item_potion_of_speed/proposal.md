## Potion of Speed

Outcome: `surface_widening`

`Potion of Speed` fits the existing `magic_item` record kind and the existing `activation` mechanics family:

- single-use consumable potion
- self-targeted activation
- timed duration of 1 minute
- no attunement
- deterministic destruction on use

The unit cannot be encoded honestly today because the positive Haste bundle includes a granted extra action with a restriction the current surface cannot represent precisely.

### What fits already

These parts of the Haste effect map to existing atoms:

- doubled Speed:
  `set_speed_ratio { numerator = 2, denominator = 1 }`
- `+2` AC:
  `modify_ac` with a flat `+2`
- Advantage on Dexterity saving throws:
  `modify_roll_advantage` on `saving_throw` with `saveAbilityFilter = ["dex"]`
- timed, non-concentration 1-minute duration:
  existing `ActivatedAbilityMechanics.duration`

The end-of-effect lethargy is not a blocker here, because Potion of Speed explicitly says the drinker gains Haste's effect **without** that wave of lethargy.

### Missing surface shape

Current blocker:

- `grant_extra_action.restriction` only supports:
  - `{ kind = "none" }`
  - `{ kind = "exclude", actions = [...] }`

That is not enough for Haste's extra action, which is restricted to:

- `Attack` with **one weapon attack only**
- `Dash`
- `Disengage`
- `Hide`

The current model can exclude forbidden standard actions, but it cannot express:

1. an allow-list restriction, and
2. a narrowed `Attack` action payload ("one weapon attack only")

### Narrow proposal

Add a new variant under the existing surface restriction shape rather than inventing a new top-level family or new v4 atom:

- extend `ActionRestriction` with an allow-list form
- include an optional attack rider for the `Attack` action branch

Sketch:

```ts
type ActionRestriction =
  | { kind: "none" }
  | { kind: "exclude"; actions: ReadonlyNonEmptyArray<StandardActionKind> }
  | {
      kind: "allow_only";
      actions: ReadonlyNonEmptyArray<
        | StandardActionKind
        | {
            kind: "attack";
            limit: "one_weapon_attack_only";
          }
      >;
    };
```

This keeps the widening in the existing `grant_extra_action` surface area. No new v4 atom is required; this is a more precise variant of the existing restriction grammar.

### Why no authored placeholder

Any current encoding would have to lie in one of two ways:

- encode the extra action as broadly usable, which overstates the item, or
- exclude too many actions and fail to represent the allowed `Attack` branch accurately.

Per the survey rules, that should stop before authoring `content/magic_item_potion_of_speed.dhall`.
