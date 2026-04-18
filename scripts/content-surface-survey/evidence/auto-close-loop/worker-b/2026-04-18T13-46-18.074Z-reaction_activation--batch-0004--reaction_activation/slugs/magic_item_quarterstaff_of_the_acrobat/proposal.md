# Proposal: `magic_item_quarterstaff_of_the_acrobat`

## Verdict

`surface_widening`

The existing `magic_item` kind and `composite` mechanics family are sufficient at the top level. The blocker is lower-level: the current surface cannot represent an activation that targets the item itself and then condition later passive / reaction riders on the item's current form.

## Why I did not author a partial record

This item's identity is not just the generic `+2` weapon bonus. Its central mechanic is:

- bonus-action form change between `quarterstaff`, `10-foot pole`, and `6-inch rod`;
- passive and reactive riders that turn on only in some of those forms;
- a utility timing rider that can fire after Initiative is rolled.

Authoring only the always-on `+2` attack / damage bonus would produce a misleading trace for the unit as a whole.

## Required widenings

### 1. `Attachment.kind = item`

The existing `EffectAtom.alter_item_kind` already assumes that "the attachment selects WHICH item is affected", but `Attachment` currently has only:

- `self`
- `target`
- `area`
- `mark`

That makes the intended shape unrepresentable.

Needed for:

> "While holding this weapon, you can take a Bonus Action to alter its form, turning it into a 6-inch rod ... or a 10-foot pole, or reverting it a Quarterstaff."

Without an item attachment, the only valid authored target would be the bearer, which is false.

### 2. `EquipmentPredicate.kind = item_form`

Current passive / activation gating can say `holding_item`, but cannot say:

- while this item is in `quarterstaff` form;
- while this item is in `10-foot pole` form;
- while this item is in either of those forms.

Needed for:

> "**Acrobatic Assist (Quarterstaff and 10-Foot Pole Forms Only).** While holding this weapon, you have Advantage on Dexterity (Acrobatics) checks."

> "**Attack Deflection (Quarterstaff Form Only).** When you are hit by an attack while holding the weapon, you can take a Reaction ..."

> "**Ranged Weapon (Quarterstaff Form Only).** This weapon has the Thrown property ..."

## Additional pressure discovered

### Initiative-trigger utility window

The light rider includes an initiative-timed trigger:

> "either as a Bonus Action or after you roll Initiative"

The current non-spell trigger grammar has no initiative-based reaction / prompt trigger, so even after `item` attachment and `item_form` gating exist, this part still needs a new trigger variant such as `after_rolling_initiative`.

## Secondary unresolved mechanics

I did not classify these as the primary blocker, but they remain open once the surface widenings above are addressed:

- `Ranged Weapon` changes the weapon profile by granting the Thrown property and explicit ranges only in one form.
- "Immediately after you make a ranged attack with the weapon, it flies back to your hand" needs a return-to-bearer / return-to-hand shape.
- The dim-light rider needs a decision on whether light emission belongs in the mechanical authored surface or is caller-owned utility state.

## Narrow classification rationale

I classified this as `surface_widening`, not `structural_widening`, because:

- `magic_item` already exists;
- `composite` already exists;
- passive, activation, and triggered-reaction parts already exist.

The honest fit fails because the surface lacks specific variants needed to connect those existing families together around item-local form state.
