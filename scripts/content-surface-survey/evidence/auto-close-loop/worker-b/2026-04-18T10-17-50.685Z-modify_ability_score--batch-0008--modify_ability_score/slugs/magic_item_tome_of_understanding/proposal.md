# Tome of Understanding

Outcome: `atom_widening`

## Why it does not fit cleanly

`MagicItemRecord` exists, but the current mechanics surface cannot encode this item honestly.

The core mechanical blocker is the effect:

> "your Wisdom increases by 2, to a maximum of 30"

The existing ability-score effect is `set_ability_score`, which only supports:

- `mode = "set"`: force the score to a fixed value
- `mode = "floor"`: raise the score to a fixed minimum

That is not the same rule. Tome of Understanding applies an additive permanent increase, capped at 30. Encoding it as `set_ability_score` would be false.

## Narrowest required widenings

### 1. New atom: `modify_ability_score`

Suggested shape direction:

```ts
{
  kind: "modify_ability_score";
  ability: Ability;
  delta: number;
  maximum?: number;
}
```

Why this is needed:

- additive increase, not fixed replacement
- explicit cap of 30
- reusable for the other manual/tome items that permanently raise an ability by 2

Evidence:

> "your Wisdom increases by 2, to a maximum of 30"

### 2. New activation-time variant: long study / training gate

The item is not passive, but also not an action/bonus action/reaction activation. Its resolution is gated by completing a deterministic study requirement:

> "If you spend 48 hours over a period of 6 days or fewer studying the book's contents and practicing its guidelines"

This could be modeled as a new activation-cost or activation-window variant rather than a new top-level family.

### 3. New reset cadence variant: century recharge

Existing reset cadences cover rests, dawn, and never. This item instead becomes inert and recharges after a century:

> "The manual then loses its magic, but regains it in a century."

That looks like a new reset/lifecycle variant, not a new family.

## Classification rationale

This is classified as `atom_widening`, not `structural_widening`, because the existing `magic_item` kind is still the right top-level home and the general activation-shaped family is plausible. The decisive blocker is that the needed permanent additive ability-score increase is a missing effect concept, not just a missing wrapper.
