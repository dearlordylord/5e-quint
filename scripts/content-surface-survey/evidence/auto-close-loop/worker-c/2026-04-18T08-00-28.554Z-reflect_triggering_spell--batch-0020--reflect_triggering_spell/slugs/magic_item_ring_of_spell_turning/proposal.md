Ring of Spell Turning does not fit the current authored surface honestly.

Why it blocks:

1. The passive rider is spell-qualified, not a blanket save bonus.
Evidence: "you have Advantage on saving throws against spells."

The current `modify_roll_advantage` atom can narrow by roll kind, save ability, skill, and attacker creature type, but not by save source being a spell. Encoding this as advantage on all saving throws would be false.

2. The item has an automatic post-save interrupt before any optional reaction.
Evidence: "If you succeed on the save for a spell of level 7 or lower, the spell has no effect on you."

That is not a passive always-on grant and not a reaction-costed activation. It needs a non-optional triggered resolution owned by the item. Current magic-item mechanics only offer `passive`, `activation`, `triggered_reaction`, or `composite` over those families; none can represent an automatic "after successful save vs spell, negate that triggering spell on self" step.

3. The reflection rider needs to replay the triggering spell back at the caster.
Evidence: "you can take a Reaction to deflect the spell back at the spell's caster; the caster must make a saving throw against the spell using their own spell save DC."

The current surface has `negate_triggering_spell`, but no effect/subgraph that retargets the triggering spell to its caster and resolves that spell's own save against the caster.

Suggested widenings:

- `new_variant`: add a spell-source qualifier on save-modifying passive effects, so `modify_roll_advantage` can mean "on saving throws against spells" rather than all saving throws.
- `new_subgraph`: add a non-optional post-save interrupt family for magic items / passives, so an item can automatically negate the triggering spell after a qualifying successful save.
- `new_subgraph`: add a triggering-spell reflection / retarget procedure that replays the triggering spell onto the original caster, preserving the triggering spell identity and save semantics.

Because the automatic interrupt step is missing at the family level, this is primarily a `structural_widening`, not just a narrow atom omission.
