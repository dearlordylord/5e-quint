## Quarterstaff of the Acrobat

Outcome: `atom_widening`

`Quarterstaff of the Acrobat` fits the existing top-level record kind `magic_item`, but it does not fit the current content surface honestly.

### What already fits

- `MagicItemRecord`
- `requiresAttunement = true`
- passive +2 attack bonus with `modify_roll_numeric` and `WeaponFilter.specific_item`
- passive +2 damage bonus with `modify_damage_numeric` and `WeaponFilter.specific_item`
- a reaction-shaped defensive rider is conceptually compatible with `activationCost.kind = "reaction"` and `ReactionTrigger.kind = "hit_by_attack_roll"`
- the form-change payload itself matches the existing `alter_item_kind` atom

So this is not a missing top-level family.

### What blocks an honest encoding

#### 1. Unlimited item activations are not representable

The item has reusable Bonus Action activations with no use cap:

> you can cause it to emit green Dim Light out to 10 feet, either as a Bonus Action ... or you can extinguish the light as a Bonus Action.

and

> you can take a Bonus Action to alter its form

`ActivatedAbilityMechanics` currently requires a resource:

- `use_count`, or
- `charge_pool`

There is no honest `resource = none` / unlimited-activation variant.

This is a surface gap, not the main classification.

#### 2. `alter_item_kind` exists, but there is no way to target the item

The surface contains:

- effect atom `alter_item_kind`

But `ActivationPhase.attachment` can only be:

- `self`
- `target`
- `area`
- `mark`

There is no `Attachment.item`, so the weapon cannot target itself for:

> turning it into a 6-inch rod ... or a 10-foot pole, or reverting it a Quarterstaff

That means the surface has the right effect vocabulary but is missing the attachment shape needed to use it.

#### 3. Light emission needs a new effect atom

This clause is not narrative-only; it changes the play-space lighting state:

> emit green Dim Light out to 10 feet

No existing effect atom expresses:

- create dim light from an item,
- name the light radius,
- extinguish that emitted light later.

That forces a new atom such as `emit_light`.

This is the narrowest honest overall blocker, which is why the unit is classified as `atom_widening`.

#### 4. Form-gated riders are not expressible

Two riders depend on the staff's current form:

> Acrobatic Assist (Quarterstaff and 10-Foot Pole Forms Only)

> Attack Deflection (Quarterstaff Form Only)

Current `EquipmentPredicate` can express:

- `wearing_armor`
- `wielding_weapon`

but not:

- holding a specific item in a specific current form

That needs a new surface predicate variant such as `item_form`.

#### 5. Weapon-profile mutation is missing

The ranged form is more than a numeric rider:

> This weapon has the Thrown property with a normal range of 30 feet and a long range of 120 feet. Immediately after you make a ranged attack with the weapon, it flies back to your hand.

Existing atoms do not cover:

- granting a weapon property,
- assigning normal/long ranges to that property,
- returning the weapon to hand after the thrown attack.

This needs a dedicated atom or subgraph, likely centered on weapon-profile mutation plus return-to-hand behavior.

### Why I did not author `content/magic_item_quarterstaff_of_the_acrobat.dhall`

Any authored JSON would have to lie in at least one of these ways:

- fake an unlimited Bonus Action as a use-limited activation,
- pretend item-form changes target the wielder rather than the item,
- drop the light-emission rule,
- drop the form restrictions on Acrobatic Assist / Attack Deflection,
- drop the thrown/return behavior.

That would produce a misleading trace, which the task explicitly forbids.

### Proposed widenings

1. `ActivationResource.none`
2. `Attachment.item`
3. `emit_light`
4. `EquipmentPredicate.item_form`
5. `grant_weapon_property` or an equivalent weapon-profile / return-to-hand atom family
