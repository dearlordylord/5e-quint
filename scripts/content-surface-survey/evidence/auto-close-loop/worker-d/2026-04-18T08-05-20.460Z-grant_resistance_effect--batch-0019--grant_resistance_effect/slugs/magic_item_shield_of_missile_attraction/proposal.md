# Proposal: Shield of Missile Attraction

## Unit

- Slug: `magic_item_shield_of_missile_attraction`
- Kind: `magic_item`
- Source: `srd-5.2.1`
- Outcome: `structural_widening`

## What fits

The first half of the item fits the existing passive magic-item surface:

- "While holding this Shield" maps to `PassiveMechanics.condition = { kind: "holding_item" }`.
- "you have Resistance to damage from attacks made with Ranged weapons" maps to `grant_resistance` with `sourceFilter = { kind: "weapon_category", category: "ranged" }`.

If the item only contained that line, it would fit as a `MagicItemRecord` with `PassiveMechanics`.

## What does not fit

### Gap 1 — composite cursed-item shape

The unit has two mechanically distinct parts:

1. a held passive resistance on the shield itself; and
2. a curse that begins on attunement and persists on the creature until ended by `Remove Curse` or similar magic.

The current magic-item surface can compose passive / activated / triggered-reaction parts, but it cannot honestly express an effect that is born from attunement and then continues on the bearer independently of holding the item.

Evidence:

> "While holding this Shield, you have Resistance to damage from attacks made with Ranged weapons."

> "Attuning to it curses you until you are targeted by a Remove Curse spell or similar magic. Removing the Shield fails to end the curse on you."

### Gap 2 — missing retarget / missile-attraction atom

The curse does not grant resistance, disadvantage, or a reaction. It rewrites targeting:

> "Whenever an attack with a Ranged weapon targets a creature within 10 feet of you, the curse causes you to become the target instead."

That is a deterministic interception / redirection effect. The current surface has no effect atom for:

- watching for ranged-weapon attacks that target nearby creatures;
- checking a radius around the cursed bearer; and
- substituting the cursed bearer as the target.

`block_targeting`, `grant_resistance`, `modify_roll_advantage`, and `negate_named_effect` are all different mechanics.

### Gap 3 — curse lifecycle variant

Even if a target-redirection atom existed, the curse lifecycle would still be missing:

- starts on attunement;
- persists after the shield is removed;
- ends only on `Remove Curse` or similar magic.

That lifecycle is not modeled by `PassiveMechanics`, `ActivatedAbilityMechanics`, or `TriggeredReactionAbilityMechanics`.

## Proposed widenings

1. `new_subgraph`: `composite_magic_item_mechanics (held passive + attunement-triggered persistent curse)`
   Needed because the item combines a normal held passive with a separate curse that outlives holding the item.

2. `new_atom`: `redirect_target_to_cursed_bearer`
   Needed for "you become the target instead" when a ranged-weapon attack targets a creature within 10 feet of you.

3. `new_variant`: `curse_lifecycle (begins on attunement, persists after item removal, ends on remove_curse-like cleanup)`
   Needed so cursed-item effects are not incorrectly modeled as ordinary while-held or while-attuned passives.

## Why this is structural, not just atom widening

The missing retarget effect is atom pressure, but the unit still would not fit honestly with only that atom added. The curse is a separate attunement-born persistent mechanic that survives removing the shield, so the current magic-item family composition is insufficient for the whole item.
