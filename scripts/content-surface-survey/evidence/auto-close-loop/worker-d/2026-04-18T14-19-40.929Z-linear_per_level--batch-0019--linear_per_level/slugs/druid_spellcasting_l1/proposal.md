# Proposal: `druid_spellcasting_l1` — structural_widening

## Summary

`Spellcasting (druid L1)` does not fit the current authored surface honestly.

The existing `class_feature` surface supports:
- `passive` grants of already-modeled effect atoms
- `activation` features with an activation cost, a bounded resource, and activation phases
- `composite` combinations of those two

Druid Spellcasting is neither. It is a persistent spellcasting chassis grant: it establishes a spell-slot table, a cantrip pool, a prepared-spell list, a spellcasting ability, and spellcasting-focus permission. Encoding it as `activation` or as a passive bundle of `grant_spell_access` atoms would misrepresent the rule.

No `content/druid_spellcasting_l1.dhall` or trace was authored.

## Why Existing Families Fail

### `activation` is wrong

The feature has no activation event, no activation cost, and no per-use resource of the `use_count` / `charge_pool` kind.

It does not do a one-shot thing like Action Surge. It permanently changes what rules the character uses for casting druid spells.

### `passive` is also insufficient

`passive` can grant existing effect atoms, but this feature is not just a small list of atom-shaped continuous effects.

Even if `grant_spell_access` were reused, the rule still needs:
- a class-scaled slot table
- a known-cantrip pool with level-up replacement
- a prepared-spell list with Long Rest replacement
- a spellcasting ability designation
- focus authorization

Those are not currently expressible as a truthful passive grants list.

## Required Widenings

### 1. New family: `grant_spellcasting`

A new `ClassFeatureMechanics` family is needed for always-on spellcasting chassis grants.

Minimum responsibility:
- designate spellcasting ability
- grant slot progression
- grant cantrip selection rules
- grant prepared- or known-spell rules
- record focus permission where present

Evidence:

> You have learned to cast spells through studying the mystical forces of nature.

> The Druid Features table shows how many spell slots you have to cast your level 1+ spells.

### 2. New resource shape: `spell_slot_table`

This feature grants a leveled slot table, not a one-dimensional counter.

Needed properties:
- indexed by slot level
- scaled by class level
- long-rest reset

Evidence:

> The Druid Features table shows how many spell slots you have to cast your level 1+ spells. You regain all expended slots when you finish a Long Rest.

### 3. New surface shape: `cantrip_pool`

This is a chosen pool of known cantrips from a class spell list, with threshold-based growth and replacement on gaining class levels.

Evidence:

> You know two cantrips of your choice from the Druid spell list.

> Whenever you gain a Druid level, you can replace one of your cantrips with another cantrip of your choice from the Druid spell list.

> When you reach Druid levels 4 and 10, you learn another cantrip of your choice.

### 4. New surface shape: `prepared_spell_list`

Prepared spells are distinct from known cantrips and from spell slots.

Needed properties:
- chosen from the Druid spell list
- count scales by druid level
- selection constrained by available slot levels
- full replacement allowed on Long Rest
- excludes separately always-prepared spells from the count

Evidence:

> You prepare the list of level 1+ spells that are available for you to cast with this feature.

> The chosen spells must be of a level for which you have spell slots.

> Whenever you finish a Long Rest, you can change your list of prepared spells.

> If another Druid feature gives you spells that you always have prepared, those spells don't count against the number of spells you can prepare with this feature.

### 5. New designation shape: `spellcasting_ability_and_focus`

The feature assigns Wisdom as the governing ability for druid spellcasting and permits Druidic Focus use. Those are stable mechanical facts, not narrative notes.

Evidence:

> Wisdom is your spellcasting ability for your Druid spells.

> You can use a Druidic Focus as a Spellcasting Focus for your Druid spells.

## Classification Rationale

This is `structural_widening`, not `surface_widening` or `atom_widening`.

Reason:
- the top-level unit kind is fine (`class_feature`)
- the blocker is that no existing mechanics family fits the feature honestly
- several subordinate variants are also missing, but they sit under that larger family gap

## Cross-Unit Impact

The same widening pattern should cover other class spellcasting chassis features:
- `cleric_spellcasting_l1`
- `bard_spellcasting_l1`
- `wizard_spellcasting_l1`
- `paladin_spellcasting_l1`
- `ranger_spellcasting_l1`

Warlock will likely need a sibling variant because Pact Magic uses a different slot-reset pattern.
