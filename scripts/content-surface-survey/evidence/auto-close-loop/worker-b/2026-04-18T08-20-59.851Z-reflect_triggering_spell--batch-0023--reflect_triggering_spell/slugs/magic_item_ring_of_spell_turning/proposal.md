## Ring of Spell Turning

Outcome: `surface_widening`

I did not author `content/magic_item_ring_of_spell_turning.dhall` because the current surface cannot encode this item honestly.

### What fits already

- Top-level kind fits: `magic_item`
- Overall shape fits in principle: `composite`
- Existing atoms already cover the deflection half:
  - `negate_triggering_spell`
  - `reflect_triggering_spell`
- Existing reaction trigger grammar already covers most of the condition:
  - `spell_save_outcome`
  - `spellLevelAtMost`
  - `spellTargetsOnlySelf`
  - `spellHasNoAreaOfEffect`

### Missing surface pieces

1. `modify_roll_advantage` cannot say "saving throws against spells"

The ring grants advantage only on spell-caused saves:

> While wearing this ring, you have Advantage on saving throws against spells.

Current `modify_roll_advantage` can filter by roll kind, skill, save ability, and attacker creature type, but not by save provenance. Encoding this as plain `on: ["saving_throw"]` would be false because it would grant advantage on every saving throw.

Suggested widening:

- add a save-source filter on `modify_roll_advantage`, e.g. a variant like `saveSourceFilter: "spell"`

2. Passive mechanics cannot express the automatic post-save negation

The ring has an automatic triggered outcome after a successful save against a qualifying spell:

> If you succeed on the save for a spell of level 7 or lower, the spell has no effect on you.

This is not a passive always-on grant, and it is not a voluntary triggered reaction. Current `PassiveMechanics.operations` only support elapsed-time cadence, so there is no place to hang an automatic `spell_save_outcome -> negate_triggering_spell` rule.

Suggested widening:

- add triggered passive operations for non-spell units, reusing `ReactionTrigger.spell_save_outcome` or a sibling trigger grammar

3. Non-spell `triggered_reaction` mechanics require a fabricated item resource

The optional deflection rider is real surface pressure:

> If that spell targeted only you and didn't create an area of effect, you can take a Reaction to deflect the spell back at the spell's caster; the caster must make a saving throw against the spell using their own spell save DC.

Existing `TriggeredReactionAbilityMechanics` would fit the reaction shape, but it requires:

- `resource`
- `resetCadence`

The ring does not spend charges or per-rest uses here. The only cost is the reaction quota itself. Any authored `use_count` or recharge record would invent a false limit.

Suggested widening:

- allow non-spell `triggered_reaction` mechanics with no separate item resource/reset cadence, or add an explicit unlimited resource variant

### Why this is not `atom_widening`

The needed mechanics are already in the v4 atom vocabulary:

- spell-triggered post-save gating
- spell negation
- spell reflection

The problem is the authored surface shape, not the atom inventory. This is a surface gap, not a new-atom gap.
