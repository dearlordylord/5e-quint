# Staff of Charming

## Verdict

`Staff of Charming` does not fit the current surface honestly, so no `content/magic_item_staff_of_charming.dhall` was authored.

The item splits into three mechanics:

1. `Cast Spell` fits existing magic-item activation + charge-pool + dawn-recharge shapes.
2. `Reflect Enchantment` needs a way to reflect the triggering spell onto its caster.
3. `Resist Enchantment` needs a trigger-bound ability that does not spend a Reaction and that substitutes a failed save result with a success.

The last two are not optional flavor riders; they are core item properties, so omitting them would produce a misleading trace.

## Forced Gaps

### 1. Trigger-bound ability with no reaction cost

Current item trigger support is `triggered_reaction`, which requires:

- `activationCost.kind = "reaction"`
- a prepare/prompt/commit reaction flow

That works for **Reflect Enchantment**, but not for **Resist Enchantment**, because the source text does not spend a reaction:

> If you fail a saving throw against an Enchantment spell that targets only you, you can turn your failed save into a successful one. You can't use this property of the staff again until the next dawn.

This needs a new trigger-bound family or a widening of the existing trigger-bound item family so a triggered property can resolve with no action cost while still carrying its own resource/reset cadence.

### 2. Save-outcome substitution on the triggering spell save

`Resist Enchantment` changes the outcome of the already-triggered save from failure to success. The current surface has reaction triggers for `spell_save_outcome_against_self`, but no effect payload that says “replace this failed save outcome with a success.”

This is best understood as a surface widening around roll/outcome substitution rather than a brand-new family by itself.

### 3. Reflect the triggering spell onto the original caster

`Reflect Enchantment` says:

> If you succeed on a saving throw against an Enchantment spell that targets only you, you can take a Reaction to expend 1 charge from the staff and turn the spell back on its caster as if you had cast the spell.

The current surface supports:

- `negate_triggering_spell`
- `negate_named_effect`
- `grant_spell_access`

None of those can express “reuse the triggering spell’s identity/context and retarget it to the original caster.” That is a missing mechanics atom, not just a missing payload variant on an existing one.

## Classification

- Primary outcome: `structural_widening`
- Secondary gaps:
  - `surface_widening` for save-outcome substitution on a triggered spell save
  - `atom_widening` for reflecting the triggering spell onto its caster

## Why I Stopped

Authoring only the `Cast Spell` charge-cast portion would drop two of the item's three named properties and misrepresent the item as a much simpler staff. Per the task guardrails, no placeholder content file was created.
