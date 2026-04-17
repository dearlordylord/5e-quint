# Proposal: magic_item_staff_of_charming — structural_widening

## Unit

**Staff of Charming** (Magic Item, Rare, SRD 5.2.1)

> This staff has 10 charges. While holding the staff, you can use any of its properties:
>
> **Cast Spell.** You can expend 1 of the staff's charges to cast *Charm Person*, *Command*, or *Comprehend Languages* from it using your spell save DC.
>
> **Reflect Enchantment.** If you succeed on a saving throw against an Enchantment spell that targets only you, you can take a Reaction to expend 1 charge from the staff and turn the spell back on its caster as if you had cast the spell.
>
> **Resist Enchantment.** If you fail a saving throw against an Enchantment spell that targets only you, you can turn your failed save into a successful one. You can't use this property of the staff again until the next dawn.
>
> **Regaining Charges.** The staff regains 1d8 + 2 expended charges daily at dawn. If you expend the last charge, roll 1d20. On a 1, the staff crumbles to dust and is destroyed.

## Why this unit cannot be encoded honestly

### Gap 1 — one magic item, three mechanics families

The current surface allows:

- `PassiveMechanics`
- `ActivatedAbilityMechanics`

for `MagicItemMechanics`, and only one mechanics value per item.

`Staff of Charming` needs all of these at once:

- a charge-based activated spellcasting property;
- a reaction-shaped triggered property keyed off a successful save;
- a separate triggered property keyed off a failed save, with its own dawn reset.

No single existing family can encode all three simultaneously without dropping mechanics or lying about triggers.

This is the primary blocker, so the unit is **`structural_widening`**.

## Secondary gaps

### Gap 2 — attunement eligibility is under-modeled

`MagicItemRecord` can only say:

```typescript
requiresAttunement: boolean
```

It cannot express class-limited attunement:

> Requires Attunement by a Bard, Cleric, Druid, Sorcerer, Warlock, or Wizard

That is a deterministic eligibility rule, not flavor text. This is a **surface widening** on `MagicItemRecord`.

### Gap 3 — no trigger shape for Reflect Enchantment

Reflect Enchantment fires only when all of these are true:

- you succeeded on a saving throw;
- the triggering effect was a spell;
- the spell's school was Enchantment;
- the spell targeted only you.

Existing trigger grammar does not carry that combination. `TriggeredReactionMechanics` exists only for spells, not magic items, and its current `ReactionTrigger` variants do not model "successful save against a qualifying spell".

This needs at least:

- a reusable triggered-mechanics surface for magic items; and
- a new trigger variant for successful save against a filtered triggering spell.

### Gap 4 — no effect atom for reflecting the triggering spell

The effect is:

> turn the spell back on its caster as if you had cast the spell

That is not:

- `negate_triggering_spell` only;
- `negate_named_effect`;
- `grant_spell_access`.

It preserves the triggering spell payload, retargets it to the caster, and changes effective ownership to you. No current effect atom expresses that. This is an **atom widening** unless the surface later realizes an existing v4 atom that covers spell reflection.

### Gap 5 — no post-resolution save-outcome substitution

Resist Enchantment says:

> If you fail a saving throw against an Enchantment spell that targets only you, you can turn your failed save into a successful one.

Current atoms can modify a roll before or during resolution:

- numeric bonuses;
- advantage/disadvantage;
- crit range;
- similar pre-resolution riders.

They do not let a unit replace an already-known failed save outcome with success. This is a separate effect from granting advantage or bonus dice. It is a **new atom** or a missing realization of a v4 post-roll substitution atom.

## What *does* already fit

The following part is already supported:

- `charge_pool` with cap 10;
- `RestResetCadence.dawn` with regain `1d8 + 2`;
- `ItemDestructionPolicy.last_charge_roll`;
- multiple `grant_spell_access` effects for `charm_person`, `command`, and `comprehend_languages`, each as a 1-charge fixed-level cast.

If the item consisted only of **Cast Spell** plus charge recovery/destruction, it would fit cleanly as a `magic_item` with `mechanics.family = "activation"`.

## Classification

| Gap | Category |
|---|---|
| One item needs multiple independent mechanics families | `structural_widening` |
| Class-limited attunement | `surface_widening` |
| Trigger grammar for successful/failed save against qualifying spell | `surface_widening` |
| Reflect triggering spell back at caster | `atom_widening` |
| Replace failed save with success | `atom_widening` |

Overall: **`structural_widening`**.

## Honest encoding decision

I did **not** author `content/magic_item_staff_of_charming.dhall`.

Encoding only the Cast Spell property would produce a partial, misleading trace by omitting two real mechanics that materially affect play. The current protocol says not to coerce such a unit into the closest valid shape, so this worker stops at proposal + result only.
