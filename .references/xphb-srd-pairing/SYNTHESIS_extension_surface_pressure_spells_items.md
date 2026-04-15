# Synthesis: Extension Surface Pressure From Spells And Items

Purpose:

- combine the first real corpus enrichments with competitor research;
- state which extension surfaces are now evidence-backed rather than speculative;
- keep the synthesis anchored in mined corpus facts first, competitor handling second.

Primary local inputs:

- [`ENRICHED_spells_pilot.md`](./ENRICHED_spells_pilot.md)
- [`ENRICHED_equipment_magic_items_pilot.md`](./ENRICHED_equipment_magic_items_pilot.md)
- [`LEARN_explicit_effect_phase_ownership.md`](../LEARN_explicit_effect_phase_ownership.md)
- [`LEARN_item_feature_scoped_runtime_payloads.md`](../LEARN_item_feature_scoped_runtime_payloads.md)
- [`LEARN_closed_mechanic_vocabularies.md`](../LEARN_closed_mechanic_vocabularies.md)
- [`LEARN_hard_provenance_package_boundaries.md`](../LEARN_hard_provenance_package_boundaries.md)
- [`RESEARCH_foundry_effect_staging.md`](../RESEARCH_foundry_effect_staging.md)

## What The Corpus Now Forces

From the enriched spell and item pilots, the following surface families are no longer guesses:

### 1. Action-timed payload families

The corpus already forces separate timing families for:

- `action-cast`
- `bonus-action-cast`
- `reaction-cast`
- `action-attack`
- `bonus-action-follow-up attack`
- `reaction-triggered defense/interruption`

Evidence:

- `Shield`
- `Counterspell`
- `Light`
- `Nick`
- lineage and species/background traits already hint at the same timing split

Competitor confirmation:

- Foundry/Midi-QOL had to make reaction and workflow timing explicit
- activity-bearing item/feature payloads in Foundry/A5E reinforce that timing belongs with the payload family, not as a creature-global switchboard

### 2. Resolution families

The corpus forces distinct resolution shapes:

- automatic application
- attack-based resolution
- save-based resolution
- save-for-half damage
- interrupt / cancel-in-progress
- on-hit rider with follow-up save

Evidence:

- `Bless`
- `Fireball`
- `Magic Missile`
- `Counterspell`
- `Topple`

Competitor confirmation:

- systems that flatten these into generic effect scripts accumulate hardcoded branches fast

### 3. Ongoing ownership and cleanup families

The corpus forces explicit ownership for:

- concentration-owned effects
- next-turn-boundary effects
- attunement/bonded item state
- transform-until-broken effects
- summoned persistent hazards/zones

Evidence:

- `Bless`
- `Shield`
- `Conjure Animals`
- `Polymorph`
- `Attunement`

Competitor confirmation:

- DAE/Midi-QOL show what happens when apply/expire/cleanup are not first-class;
- the right import is not their architecture, but their proof that these lifecycles are real and unavoidable.

### 4. Item-local legality and mode-selection families

The corpus forces item payload surfaces for:

- attack-mode selection
- hand/occupancy mode selection
- firing/throughput constraints
- reach modification
- benefit gating by wear/wield state
- paired-item occupancy constraints

Evidence:

- `Versatile`
- `Loading`
- `Reach`
- `Wearing and Wielding Items`

Competitor confirmation:

- item/feature scoped payload research already pointed here;
- these do not belong as creature-global booleans.

### 5. Scaling families

The corpus already shows multiple non-equivalent scaling shapes:

- add targets
- add damage dice
- add projectiles
- thresholded interrupt power
- level-gated trait growth

Evidence:

- `Bless`
- `Fireball`
- `Magic Missile`
- `Counterspell`
- species traits in `Character-Origins.md`

This means one generic “scaled effect” bucket will probably be too flat.

## What Competitor Research Warns Us About

### Do not encode this as open scripting

The enriched corpus surfaces line up with the competitor lesson:

- closed mechanic vocabularies are useful;
- open scripting and mutable hook webs are where systems lose control.

The pilots give more support to:

- typed payload families
- typed timing families
- typed cleanup families

and less support to:

- generic script callbacks
- arbitrary field mutation
- macro-named lifecycle semantics

### Do not flatten payload families too early

Competitor handling shows that if “spell”, “item property”, “mastery rider”, “attunement lock”, and “transformation” all collapse into one vague effect model, exceptions pile up.

The pilots already suggest at least these extension-facing families:

- spell action payloads
- spell ongoing-effect payloads
- transformation payloads
- summoned-zone/entity payloads
- weapon-property legality payloads
- mastery trigger/effect payloads
- item lifecycle/bond payloads

## What This Meant For The Next Research Step

This note was the first synthesis checkpoint. The immediate steps it called for were:

1. extend spell enrichment beyond the pilot set until the recurring families stabilize;
2. extend equipment/mastery enrichment enough to confirm the legality / mode-selection / bond families;
3. start feat enrichment and check whether feats mostly reuse those same families or force new ones;
4. only then draft the first candidate closed extension surface.

Those downstream pilot steps now exist:

- [`ENRICHED_feats_pilot.md`](./ENRICHED_feats_pilot.md)
- [`ENRICHED_species_background_traits_pilot.md`](./ENRICHED_species_background_traits_pilot.md)
- [`ENRICHED_classes_features_pilot.md`](./ENRICHED_classes_features_pilot.md)
- [`SYNTHESIS_extension_surface_pressure_feats_traits.md`](./SYNTHESIS_extension_surface_pressure_feats_traits.md)
- [`SYNTHESIS_extension_surface_pressure_classes.md`](./SYNTHESIS_extension_surface_pressure_classes.md)

So the next frontier is no longer “start feats/traits/classes.” It is:

1. finish the `classes_and_features` inventory bridge at the subunit level;
2. consolidate the cross-family findings into one explicit pressure matrix;
3. then decide whether the resulting closed surface can stay compact without flattening the distinctions the corpus keeps forcing.

## Current Working Conclusion

The corpus plus competitor handling now support this narrative:

- the extension surface should be typed and closed;
- timing, cleanup, and ownership are first-class;
- item/spell/feature families cannot all be flattened into one generic effect type;
- provenance/package boundaries must remain visible because some future payload families will live in optional non-core packages.

That is a stronger basis for later surface design than “we saw a lot of features,” because it already identifies the recurring execution shapes those features will need.
