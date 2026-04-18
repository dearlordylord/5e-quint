# Quarterstaff of the Acrobat

## Verdict

`magic_item` is the correct top-level kind, and the existing `composite` magic-item family is close: this item mixes passive grants, bonus-action activations, and a reaction activation. I did not author a `content/magic_item_quarterstaff_of_the_acrobat.dhall` file because several mechanics cannot be represented honestly in the current surface.

Outcome: `atom_widening`

## What fits today

- `+2` to attack rolls made with this weapon:
  `modify_roll_numeric` with `weaponFilter = { kind = "specific_item", itemId = ... }`
- `+2` to damage rolls made with this weapon:
  `modify_damage_numeric` with the same `specific_item` filter
- Attack Deflection's reaction shape:
  activated ability with `activationCost = reaction`, a `hit_by_attack_roll` trigger, `modify_ac +5`, `use_count`, and `short_or_long_rest`

Those pieces are not enough to encode the whole item honestly because the remaining mechanics are not optional flavor; they materially change when the bonuses and abilities apply.

## Forced gaps

### 1. Light emission needs a new atom

The surface has no effect atom for deterministic light emission.

Evidence:

> you can cause it to emit green Dim Light out to 10 feet

This is not just description. It changes visible-space state with a fixed radius and an explicit on/off toggle.

Proposed widening:

- `new_atom`: `emit_light`

Possible shape:

```ts
{
  kind: "emit_light";
  brightFeet?: number;
  dimFeet: number;
  color?: string;
}
```

### 2. `alter_item_kind` exists, but the surface cannot target an item

The effect union includes `alter_item_kind`, but `Attachment` currently has only `self`, `target`, `area`, and `mark`. There is no `item` or `object` attachment in the authored surface, so there is no honest way to say that the held quarterstaff itself changes form.

Evidence:

> alter its form, turning it into a 6-inch rod ... or a 10-foot pole, or reverting it a Quarterstaff

Proposed widening:

- `new_variant`: `Attachment.item`

### 3. Form-scoped mechanics need a gate

Several mechanics apply only in some forms:

- Acrobatic Assist: quarterstaff and 10-foot pole only
- Attack Deflection: quarterstaff only
- Ranged Weapon / thrown profile: quarterstaff only

Current predicates can say `holding_item`, `wearing_armor`, or `wielding_weapon`, but not “while this item is in form X.” Without that, any encoding would lie about when the bonuses and reaction are available.

Evidence:

> In certain forms, the weapon has the following additional properties.

Proposed widening:

- `new_variant`: `item_form_gated_passive_or_activation`

This could be expressed either by widening `EquipmentPredicate` or by adding a shared condition on magic-item parts.

### 4. Returning-thrown behavior needs a new atom

The quarterstaff gains a thrown/ranged-use profile and then automatically returns after the ranged attack. The current surface has no atom for “returns to your hand after the thrown attack resolves.”

Evidence:

> Immediately after you make a ranged attack with the weapon, it flies back to your hand

Proposed widening:

- `new_atom`: `return_to_hand_after_thrown_attack`

## Secondary surface pressure

The light toggle can happen either as a Bonus Action or after initiative is rolled:

> either as a Bonus Action or after you roll Initiative

Even after adding `emit_light`, the current activation-cost/trigger surface has no clean non-reaction “after initiative” trigger. That is a secondary `surface_widening`, but the item already fails earlier on the missing atoms above.

## Why no partial content file

I could have authored only the always-on `+2` attack and damage bonuses, but that would understate the unit and hide the real surface pressure. The blocked mechanics are core to the item, so I stopped before generating a misleading trace.
