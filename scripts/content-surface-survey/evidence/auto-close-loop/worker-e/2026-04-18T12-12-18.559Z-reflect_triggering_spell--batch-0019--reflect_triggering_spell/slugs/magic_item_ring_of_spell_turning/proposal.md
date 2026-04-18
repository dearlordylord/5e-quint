## Ring of Spell Turning

Outcome: `surface_widening`

The unit mostly fits the existing magic-item surface, but not honestly enough to author a `content/magic_item_ring_of_spell_turning.dhall` record.

What fits now:

- Passive worn-item grant: `modify_roll_advantage` on `saving_throw` with `saveSourceFilter = spell_or_other_magical_effect`.
- Reaction deflection conceptually matches the existing `spell_save_outcome` trigger grammar plus `reflect_triggering_spell`.

What does **not** fit now:

1. Automatic post-save negation has no honest magic-item delivery family.

The ring says:

> If you succeed on the save for a spell of level 7 or lower, the spell has no effect on you.

That is not a passive always-on grant, not an activated ability, and not a reaction. Current `PassiveMechanics.operations` only supports `elapsed_time` triggers, so there is no existing way to encode an automatic "after a successful saving throw against a qualifying spell" rider on a magic item.

Suggested widening:

- Add a new `PassiveOperation.trigger` variant for post-save spell outcomes, reusing the existing `ReactionTrigger.kind = "spell_save_outcome"` predicate surface or a shared equivalent trigger grammar.

2. Triggered-reaction magic-item abilities currently require a fake item resource.

The deflection rider says:

> If that spell targeted only you and didn't create an area of effect, you can take a Reaction to deflect the spell back at the spell's caster

`TriggeredReactionAbilityMechanics` requires both `resource` and `resetCadence`. Ring of Spell Turning has no charge pool, use-count, or recharge cadence for this reaction; it only spends the character's Reaction. Encoding it today would force a knowingly false pool such as "1 use, resets every turn/day/rest", which would be a misleading trace.

Suggested widening:

- Add a no-item-resource triggered-reaction form for magic items, or make `resource` / `resetCadence` optional when the only cost is `activationCost = reaction`.

Why this is `surface_widening`, not `atom_widening`:

- The needed mechanics are already present in the v4 atom inventory and current surface atoms:
  - `modify_roll_advantage`
  - `negate_triggering_spell`
  - `reflect_triggering_spell`
- The gap is in delivery shape and trigger placement, not in missing effect atoms.

