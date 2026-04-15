# Synthesis: What Class Features Add To The Extension Surface

Purpose:

- close the major remaining family gap in the research narrative;
- compare class-feature pressure against the spell/item/feat/trait pilots;
- state what class features genuinely add to the extension-surface design.

Primary inputs:

- [`ENRICHED_classes_features_pilot.md`](./ENRICHED_classes_features_pilot.md)
- [`ENRICHED_spells_pilot.md`](./ENRICHED_spells_pilot.md)
- [`ENRICHED_equipment_magic_items_pilot.md`](./ENRICHED_equipment_magic_items_pilot.md)
- [`ENRICHED_feats_pilot.md`](./ENRICHED_feats_pilot.md)
- [`ENRICHED_species_background_traits_pilot.md`](./ENRICHED_species_background_traits_pilot.md)

## Short Answer

Class features still mostly reuse the same broad extension families already established by spells, items, feats, and traits.

But they intensify four pressures enough that the eventual surface design will need to represent them explicitly:

- table-scaled resources and quotas
- option registries
- replacement/retraining mechanics
- cross-family rewrites

## What Class Features Reuse

Class features clearly reuse:

- timing families
  - bonus action
  - reaction
  - magic action
  - on-hit
  - on-miss
  - post-roll
- reset families
  - short rest
  - long rest
  - start of next turn
  - once per turn
- effect families
  - damage
  - healing
  - condition application
  - movement rider
  - defensive modifier
  - transformation-like temporary states
- grant families
  - spells
  - feats
  - always-prepared spells
  - no-slot casts

So class features do not invalidate the surface picture already emerging.

## What Class Features Add More Strongly

### 1. Table-scaled resource systems

Classes intensify the need for:

- level-indexed pool sizes
- level-indexed use counts
- partial recharge formulas
- shared pools powering multiple options

Evidence:

- `Second Wind`
- `Channel Divinity`
- `Focus Points`
- Pact Magic / Magical Cunning

This is stronger than what the other families showed, because the scaling is systematic and table-driven rather than incidental.

### 2. Option registries

Classes strengthen the need for typed registries:

- Cunning Strike options
- Channel Divinity options
- Eldritch Invocations
- lineage-like choice systems inside class families

This aligns with the competitor lesson about closed vocabularies:

- registries are real;
- open scripting is still not justified.

### 3. Replacement / retraining / reconfiguration

Classes make it clear that the extension surface needs explicit support for:

- replace prepared spell on short rest
- replace cantrip on long rest
- replace mastery choice on long rest
- replace invocation on level-up
- replace Fighting Style choice on level-up

This is not merely “grant a thing”; it is “grant and later swap within a typed option family.”

### 4. Cross-family rewrites

Class features repeatedly modify another family’s rules:

- Fighter rewrites weapon mastery behavior
- Rogue subclass rewrites magic-item usage constraints
- Wizard rewrites spell preparation and no-slot casting
- Monk rewrites attack/save movement and damage behavior

This is the strongest additional pressure from class features.

The surface design therefore needs a safe way to express:

- modify item payload behavior
- modify spell payload behavior
- modify attack payload behavior
- modify resource/reset behavior

without collapsing into unrestricted scripting.

## Current Working Conclusion

The extension surface now looks like it must support at least:

- typed trigger/timing families
- typed resolution families
- typed effect/output families
- typed reset/resource families
- typed grant/link families
- typed option registries
- typed replacement/retraining operations
- typed cross-family rewrites

The research so far still points toward:

- a closed surface
- source-scoped payload families
- explicit lifecycle/cleanup
- explicit provenance/package boundaries

The last major unknown is no longer “what kind of mechanics exist.”
It is “how compactly can we encode these typed families without flattening away the distinctions the corpus keeps forcing.”
