# Quarterstaff of the Acrobat

## Verdict

`surface_widening`

The item fits the existing top-level `magic_item` kind and the existing `composite` mechanics family in broad shape: it combines passive grants, bonus-action activations, and a once-per-rest reaction property. The current authored surface still cannot encode it honestly because the item's mechanics depend on the weapon's **current form**, and the surface cannot target or predicate on that state.

## Blocking gaps

### 1. Activated item-form change has no item attachment target

The surface already has `EffectAtom.alter_item_kind`, which is the right v4-level atom for a form-changing item. The blocker is that `ActivationPhase.attachment` only allows:

- `self`
- `target`
- `area`
- `mark`

There is no `Attachment.item` or `Attachment.object`, so an activated magic-item ability cannot honestly say "this held weapon changes form."

Required widening:

- add `Attachment.item` (or equivalent held-item/object attachment) so an activation can target the weapon itself.

Evidence:

> While holding this weapon, you can take a Bonus Action to alter its form, turning it into a 6-inch rod ... or a 10-foot pole, or reverting it a Quarterstaff.

### 2. Passive and reactive grants cannot depend on the weapon's current form

This item's mechanics are not just "while holding a weapon." They depend on whether the same item is currently in quarterstaff form, 10-foot-pole form, or rod form.

Current passive gating only supports:

- `wearing_armor`
- `wielding_weapon` by coarse category

That is not enough to distinguish:

- quarterstaff-only
- quarterstaff-or-pole
- rod excluded

Required widening:

- add a predicate variant keyed to the current item form / named item kind, such as `EquipmentPredicate.current_item_kind` or an equivalent item-state gate.

Evidence:

> Acrobatic Assist (Quarterstaff and 10-Foot Pole Forms Only).

> Attack Deflection (Quarterstaff Form Only).

> Ranged Weapon (Quarterstaff Form Only).

## What would fit once those widenings exist

These parts appear to have honest homes after the two surface widenings above:

- `modify_roll_numeric` with `weaponFilter: { kind: "specific_item", itemId: ... }` for the +2 attack-roll bonus.
- `modify_damage_numeric` with the same `specific_item` filter for the +2 damage-roll bonus.
- `modify_roll_advantage` with `on: ["ability_check"]` and `skillFilter: { kind: "fixed", skills: ["acrobatics"] }` for Acrobatic Assist.
- an activated ability with `activationCost = { kind: "reaction", ... }`, `resource.use_count = 1`, and `resetCadence = short_or_long_rest` for Attack Deflection's +5 AC against the triggering attack.
- an activated ability using `alter_item_kind` for the bonus-action form swap.

## Secondary gaps not chosen as the primary classification

These are real omissions, but they are not the first blocker. The item already fails honest encoding on the form-state surface.

### Light emission

The item can emit green dim light out to 10 feet and extinguish it later. The current effect vocabulary has no light-source / illumination atom.

Evidence:

> While holding this weapon, you can cause it to emit green Dim Light out to 10 feet ... or you can extinguish the light as a Bonus Action.

### Thrown-return rider

The quarterstaff-form thrown mode says the weapon immediately flies back to your hand after a ranged attack. The current surface has no explicit weapon-property / return-to-hand rider for attacks made with a specific item.

Evidence:

> Immediately after you make a ranged attack with the weapon, it flies back to your hand.

## Why I did not author a placeholder

Any placeholder content file would need to lie about at least one of these:

- what the form-change targets;
- when quarterstaff-only and pole-only riders apply;
- whether the item can be in multiple forms at once.

That would produce a misleading trace, so I stopped at the widening report.
