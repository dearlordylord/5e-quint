# Proposal: magic_item_sword_of_sharpness — structural_widening

## Unit

**Sword of Sharpness** (Magic Item, Very Rare, Requires Attunement)

> When you attack an object with this magic weapon and hit, maximize your weapon damage dice against the target.
>
> When you attack a creature with this weapon and roll a 20 on the d20 for the attack roll, that target takes an extra 14 Slashing damage and gains 1 Exhaustion level.

## Why this unit cannot be encoded honestly

### Gap 1 — `MagicItemMechanics` has no passive on-hit family

Current magic items can only be:

- `passive` — always-on grants
- `activation` — user-activated ability with resource/reset cadence

`Sword of Sharpness` is neither. Its mechanics are conditional riders on weapon attacks:

- on hit against an **object**, maximize weapon damage dice
- on a **natural 20** against a **creature**, deal extra slashing damage and add 1 exhaustion level

Encoding either rider as a passive `grant` would lie about timing and scope. Encoding it as an
`activation` would lie about action economy and user choice. The missing piece is a reusable
non-mastery **on-hit / on-crit passive rider family for magic items**.

This is a **structural_widening** because the top-level `magic_item` kind exists, but no honest
mechanics family fits the unit.

### Gap 2 — no honest trigger for “roll a 20 on the d20”

Even if magic items could reuse an on-hit family, the current trigger grammar is too weak:

- `MasteryTrigger` only supports `weapon_hit` and `weapon_hit_melee_only`
- there is no trigger/window variant for **natural 20 on the attack roll**

This is a **surface_widening** inside any future triggered-rider family.

### Gap 3 — “maximize your weapon damage dice” is not representable

The object rider does not deal a fixed bonus or extra damage. It replaces the rolled weapon damage
dice result with the maximum possible value.

Current surface options do not express this:

- `damage` can add damage, not maximize an existing weapon-damage roll
- `modify_roll_numeric` operates on d20-style rolls, not weapon damage dice
- `maximize_healing_received` is healing-only and not transferable to weapon damage

This pressures either:

- a new atom such as `maximize_damage_dice`, or
- a broader substitution/reroll surface that can target weapon damage dice specifically

That is at least an **atom_widening** or a substantial **surface_widening**, depending on the
chosen design.

### Gap 4 — exhaustion is level-based, not just present/absent

The rider says the target “gains 1 Exhaustion level.” The current effect surface only has:

- `apply_condition { condition: "exhaustion" }`

That can represent “target has Exhaustion” but not an increment to an already-present leveled
condition. Using `apply_condition` would under-specify the mechanic.

This is a **surface_widening** on the condition/effect side.

## Recommended direction

The smallest honest extension is:

1. widen non-spell/non-mastery mechanics so `magic_item` can carry a triggered passive rider family
   similar to `on_hit_trigger`
2. widen the trigger grammar with a natural-20 attack-roll trigger
3. add a way to express maximizing weapon damage dice
4. add a way to express gaining one level of exhaustion

## Classification

Overall verdict: **`structural_widening`**

The first blocker is family fit: there is no valid `MagicItemMechanics` family for passive
weapon-hit / critical-hit riders. The item also exposes follow-on surface/atom gaps, but the
structural family mismatch is sufficient to stop before authoring JSON.
