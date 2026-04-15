# Pass 2: Spell Surfaces

Scope:

- enrich the Pass 1 spell inventory in [`UNITS_spells.md`](./UNITS_spells.md) with spell-level mechanic surfaces;
- use local sources only:
  - [`book-xphb.json`](../5etools-src/data/book/book-xphb.json)
  - local SRD 5.2.1 corpus in [`../srd-5.2.1`](../srd-5.2.1)
  - existing local research notes in this workspace
- do not define the final vocabulary here; this is still research and surface extraction.

This note is intentionally spell-family specific. It is about what spell payloads expose next, not about the full PHB corpus.

## What The Local Sources Give Us

The PHB JSON gives spell content in a mostly chapter-structured form under `Chapter 7: Spells`, with a large amount of inline semantic tagging:

- spell names and references are explicit;
- action, item, feat, class, condition, and mastery references are tagged inline;
- spellcasting procedure material is grouped separately from spell descriptions;
- the corpus is rich enough to mine spell payload pressure, but not fully normalized into one clean spell object schema.

The SRD corpus gives the matching authoritative scaffold for:

- spellcasting procedure;
- spell-level structure and slot rules;
- higher-level slot use;
- concentration and ongoing spell behavior;
- spell descriptions as the authoritative baseline for overlap checking.

## Spell Surfaces To Extract Next

The spell family should be mined for these surfaces, in this order:

- timing and workflow
- resource use
- target and area
- attack, save, or check resolution
- damage and healing
- concentration ownership and interruption
- duration, expiry, and cleanup
- summoning and transformation when present
- higher-level slot scaling
- components and hand occupancy when visible

The point is to turn each spell into a small bundle of explicit mechanic surfaces, not just a name and prose block.

## What The PHB JSON Exposes Cleanly

The book JSON is good at exposing:

- spell identity and chapter placement;
- spell description boundaries;
- inline references to actions, conditions, items, feats, classes, and other spells;
- spellcasting-adjacent sections such as preparing spells, casting time, combining spell effects, and using higher-level slots;
- the broad distribution of spell families, including PHB-only spells that are likely to matter for later payload design.

It is also good enough to tell us where pressure is concentrated:

- `{@spell ...}` tags are frequent;
- spell-related chapter structure is explicit;
- spellcasting procedure is separated from spell text.

## What It Exposes Poorly

The JSON is weak where we need normalized spell surfaces:

- it does not hand us one clean, uniform spell record for every spell;
- a lot of the useful mechanics live inside prose-rich description blocks;
- targeting, duration, scaling, and component semantics are not always separately machine-shaped;
- spell variants, nested effects, and multi-part behavior are often embedded in text rather than split into stable subunits;
- class-linked or item-linked spell behavior may be discoverable only by cross-reference, not by a single local field.

So the spell pass should not wait for perfect structure. It should mine what is explicit now and mark the rest for follow-up enrichment.

## Competitor Cross-Checks

For spell payload families, the useful competitor research is:

- [`RESEARCH_foundry_effect_staging.md`](../RESEARCH_foundry_effect_staging.md) for staged effect application, cleanup, and reaction timing;
- [`LEARN_explicit_effect_phase_ownership.md`](../LEARN_explicit_effect_phase_ownership.md) for apply / expiry / cleanup / reaction phase distinctions;
- [`LEARN_item_feature_scoped_runtime_payloads.md`](../LEARN_item_feature_scoped_runtime_payloads.md) for item-scoped action-bearing payloads;
- [`RESEARCH_ecosystem_map.md`](../RESEARCH_ecosystem_map.md) for the broader taxonomy of spells, items, and effect trees;
- [`RESEARCH_verification_scenario_mining.md`](../RESEARCH_verification_scenario_mining.md) for replay and scenario-fixation ideas that matter once spell surfaces are executable.

The specific pain points to cross-check are:

- spell timing windows that are not just `cast now`;
- concentration ownership and interruption;
- late targeting and target selection after a workflow starts;
- spell-generated temporary state that must clean up later;
- summon / transform payloads that create nested state;
- scaling behavior tied to slot level or cast mode;
- reaction-granting or reaction-denying spell interactions.

## Concrete Extraction Recipe

Pass 2 for spells should produce one enriched block per spell in the existing `UNITS_spells.md` family or a sibling spell-surface file if that proves cleaner, but without duplicating the Pass 1 inventory.

For each spell, extract:

- identity
  - name
  - provenance tag from Pass 1
  - PHB location
- timing/workflow
  - action, bonus action, reaction, minute, hour, or longer cast timing
  - pre-cast, cast, on-hit, on-save, ongoing, and cleanup timing if visible
- resource
  - slot use
  - alternative casting without slots
  - consumption or recharge pressure if visible
- target/area
  - self, creature, object, point, area, cone, line, sphere, cube, cylinder, radius, or other shape
- resolution
  - attack
  - save
  - check
  - automatic effect
- effect
  - damage
  - healing
  - condition application
  - movement
  - visibility
  - summoning
  - transformation
  - ongoing control or aura-like behavior
- duration/cleanup
  - instantaneous, timed, concentration, until discharged, or other expiry logic
  - cleanup trigger if the spell ends or concentration breaks
- scaling
  - higher-level slot use
  - per-slot-level scaling
  - multi-part scaling if the spell has distinct modes
- components
  - verbal, somatic, material
  - hand occupancy implications if the local text makes them relevant

Extraction rule:

- do not invent a surface if the spell text does not force it;
- do record a surface if the spell text or inline tags make it discoverable;
- prefer a compact per-spell block with a short list of extracted surfaces rather than a long prose summary;
- when a surface is ambiguous, mark it for review instead of flattening it.

## What This Pass Is For

This pass is not trying to finish spell mechanics. It is trying to identify the spell payload families and timing surfaces that will later force vocabulary:

- typed spell actions;
- spell timing stages;
- effect start / end / cleanup hooks;
- payload families for summoning, transformation, scaling, and reaction-bearing spells.

That makes the spell family the right place to begin the vocabulary pressure map, because spells are the densest and most varied PHB content surface.
