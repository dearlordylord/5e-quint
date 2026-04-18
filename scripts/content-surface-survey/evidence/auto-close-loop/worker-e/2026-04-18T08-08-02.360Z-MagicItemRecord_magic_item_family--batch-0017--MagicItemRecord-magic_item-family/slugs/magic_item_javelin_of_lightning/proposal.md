# Proposal: Javelin of Lightning

## Verdict

`magic_item` is the correct top-level kind, and the item is structurally a composite of:

- a passive weapon rider; and
- an activated once-per-dawn property.

The current surface still cannot encode the item honestly, so this worker stops before authoring `content/magic_item_javelin_of_lightning.dhall`.

## Missing mechanic 1: damage-type substitution on a weapon hit

RAW:

> Each time you make an attack roll with this magic weapon and hit, you can have it deal Lightning damage instead of Piercing damage.

This is not:

- `modify_damage_numeric` — no numeric bonus is added;
- `damage` — no separate extra-damage instance is created;
- `grant_spell_access` — no spell is being cast;
- `alter_item_kind` — the weapon's form is unchanged during the passive rider.

What is missing is a passive, optional, on-hit substitution of the damage type for hits made with a specific weapon. That looks like a new atom, e.g. `substitute_weapon_damage_type`, probably scoped by `weaponFilter: { kind: "specific_item", itemId }`.

## Missing mechanic 2: transformed throw that returns the weapon

RAW:

> When you throw this weapon at a target no farther than 120 feet from you, you can forgo making a ranged attack roll and instead turn the weapon into a bolt of lightning.

> Immediately after dealing this damage, the weapon reappears in your hand.

The save-gated line damage is individually expressible:

- activation family;
- `save_gate`;
- line area;
- fixed DC 13;
- `damage` lightning 4d6;
- `half_damage` on success;
- once-per-dawn reset.

What is not expressible is the item-state part of the same activation:

- the thrown weapon becomes the line effect instead of making its normal ranged attack roll; and
- the same weapon automatically returns to the wielder's hand after resolution.

That looks like a missing item-focused subgraph, not just a missing number field.

## Why I did not author a partial content file

The activation half alone would produce a valid but misleading trace, because it would omit one of the item's two central mechanics:

- the always-available lightning-for-piercing substitution on weapon hits.

Per the task guardrails, no trace is better than a dishonest partial one.
