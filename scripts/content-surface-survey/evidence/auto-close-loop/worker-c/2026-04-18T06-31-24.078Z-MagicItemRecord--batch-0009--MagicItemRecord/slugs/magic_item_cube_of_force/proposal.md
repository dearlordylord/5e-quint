# Cube of Force

## Verdict

`Cube of Force` is a `magic_item`, but it does not fit the current authored surface honestly. The narrowest classification is `surface_widening`.

## Why it does not fit cleanly

The existing surface already covers several parts of the item:

- `MagicItemRecord` covers the top-level kind.
- `requiresAttunement = true` is representable.
- `charge_pool` with cap 10 is representable.
- `resetCadence.dawn` with regain `1d6` is representable.
- `grant_spell_access` can represent each listed spell.
- `grant_spell_access.dcOverride = { kind = "fixed", dc = 17 }` can represent the fixed save DC.

The problem is the activation shape.

Current charge-cast item encodings put spell grants inside an `activation` mechanics family with one shared `activationCost`. That works when the granted spells all behave as one item-shaped activation. It is not honest here, because the spell menu mixes different casting-time semantics:

- `Mage Armor` is an action spell.
- `Shield` is a reaction spell.
- `Tiny Hut` and `Private Sanctum` are long-cast spells.

Any single item-wide `activationCost` would misstate at least one menu entry.

## Missing shape

The surface needs a way for a magic item to provide:

- a shared charge pool,
- a dawn recharge cadence,
- a fixed spell-save DC override,
- a menu of `grant_spell_access` entries,
- while letting each granted spell keep its own casting time.

Two plausible surface-level fixes:

1. Add a magic-item mechanics variant for a shared `charge_pool` + `grant_spell_access[]` menu that does not require one shared `activationCost`.
2. Widen the existing charge-cast encoding so granted spells can explicitly use their own casting time instead of inheriting an item-wide activation cost.

## Evidence

Quoted pressure from the unit text:

> "You can press one of those faces, expend the number of charges required for it, and thereby cast the spell associated with it (save DC 17)"

and the menu:

- `Mage Armor`
- `Shield`
- `Tiny Hut`
- `Private Sanctum`
- `Resilient Sphere`
- `Wall of Force`

The inclusion of `Shield` in the same shared-charge menu is what makes the current one-activation-cost pattern dishonest.
