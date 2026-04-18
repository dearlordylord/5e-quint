## Censer of Controlling Air Elementals

Outcome: `surface_widening`

The item fits the existing `magic_item` + `spawned_creature` family. The remaining gaps are narrower than a new atom or family: the catalog-ref summon payload cannot express that the summoned creature understands the summoner's languages, and the summon-placement surface only captures a coarse `range` header rather than "nearest valid space to the item".

### Missing surface shape

- Add a spawned-creature language-understanding hook on catalog-ref summons, such as a `languages` override that can express `caster_languages_understood`.
- Add a summon-placement variant for item-rooted nearest-space placement, rather than forcing this rule into the coarse `range` header.

### Why this is forced

- The unit's control text is part of the mechanical payload, not flavor. It changes what information can be communicated to the summoned creature.
- The current surface can express initiative, command cost, dismissal timing, and disappearance conditions, but not this language-understanding rider unless the summon is authored with a full inline stat block.
- Using an inline stat block here would duplicate an existing catalog creature solely to carry one override, which violates the repo's no-redundant-state rule.
- `range = self` captures only that the summon is item-local. It does not encode the stricter placement instruction that the elemental appears in the nearest possible unoccupied space to the censer.

### Evidence

> "The elemental appears in an unoccupied space as close to the censer as possible, understands your languages, obeys your commands, and takes its turn immediately after you on your Initiative count."
