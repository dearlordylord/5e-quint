# Research: XPHB ↔ SRD Pairing

Scope:

- pair the 2024 PHB content structure from local 5etools data with the local SRD 5.2.1 corpus;
- do data mining first;
- do not start designing the final rule vocabulary yet.
- extract mechanical units at the effect-bearing layer and below, including non-SRD PHB material, so later vocabulary design can be formed from the full candidate surface rather than only from current SRD overlap.

Architecture reminder for all later passes:

- this research must respect the `ARCHITECTURE.md` boundary between core mechanics and caller/DM agenda;
- the core only gets deterministic mechanics concerns;
- DM rulings, agenda decisions, notification surfaces, and other caller-owned facts must not be promoted into the core taxonomy just because they appear in rules wording.

Local sources:

- [`5etools PHB JSON`](./5etools-src/data/book/book-xphb.json)
- [`SRD 5.2.1`](./srd-5.2.1)

This file is intentionally local research under `.references/` and is ignored by Git.

Generated local artifacts:

- [`xphb-srd-pairing/INDEX.md`](./xphb-srd-pairing/INDEX.md)
- [`xphb-srd-pairing/DOMAIN_FAMILY_PRECIFICATION.md`](./xphb-srd-pairing/DOMAIN_FAMILY_PRECIFICATION.md)
- [`xphb-srd-pairing/COVERAGE_LEDGER.md`](./xphb-srd-pairing/COVERAGE_LEDGER.md)
- [`xphb-srd-pairing/INDEX_SUMMARY.md`](./xphb-srd-pairing/INDEX_SUMMARY.md)
- [`xphb-srd-pairing/XPHB_SECTION_INDEX.json`](./xphb-srd-pairing/XPHB_SECTION_INDEX.json)
- [`xphb-srd-pairing/XPHB_TAG_OCCURRENCES.json`](./xphb-srd-pairing/XPHB_TAG_OCCURRENCES.json)
- [`xphb-srd-pairing/SRD_HEADING_INDEX.json`](./xphb-srd-pairing/SRD_HEADING_INDEX.json)
- [`xphb-srd-pairing/GLOSSARY_PAIRING.md`](./xphb-srd-pairing/GLOSSARY_PAIRING.md)
- [`xphb-srd-pairing/GLOSSARY_PAIRING.json`](./xphb-srd-pairing/GLOSSARY_PAIRING.json)
- [`xphb-srd-pairing/CHAPTER_SPINE_PAIRING.md`](./xphb-srd-pairing/CHAPTER_SPINE_PAIRING.md)
- [`xphb-srd-pairing/WORKFLOW_STAGE_CANDIDATES.md`](./xphb-srd-pairing/WORKFLOW_STAGE_CANDIDATES.md)
- [`xphb-srd-pairing/EFFECT_TIMING_SURFACES.json`](./xphb-srd-pairing/EFFECT_TIMING_SURFACES.json)
- [`xphb-srd-pairing/UNITS_spells.md`](./xphb-srd-pairing/UNITS_spells.md)
- [`xphb-srd-pairing/UNITS_feats.md`](./xphb-srd-pairing/UNITS_feats.md)
- [`xphb-srd-pairing/UNITS_classes_and_features.md`](./xphb-srd-pairing/UNITS_classes_and_features.md)
- [`xphb-srd-pairing/UNITS_species_and_background_traits.md`](./xphb-srd-pairing/UNITS_species_and_background_traits.md)
- [`xphb-srd-pairing/UNITS_equipment_properties_and_masteries.md`](./xphb-srd-pairing/UNITS_equipment_properties_and_masteries.md)
- [`xphb-srd-pairing/UNITS_magic_items.md`](./xphb-srd-pairing/UNITS_magic_items.md)
- [`xphb-srd-pairing/SURFACES_spells.md`](./xphb-srd-pairing/SURFACES_spells.md)
- [`xphb-srd-pairing/SURFACES_feats.md`](./xphb-srd-pairing/SURFACES_feats.md)
- [`xphb-srd-pairing/SURFACES_classes_features.md`](./xphb-srd-pairing/SURFACES_classes_features.md)
- [`xphb-srd-pairing/SURFACES_species_background_traits.md`](./xphb-srd-pairing/SURFACES_species_background_traits.md)
- [`xphb-srd-pairing/SURFACES_equipment_magic_items.md`](./xphb-srd-pairing/SURFACES_equipment_magic_items.md)
- [`xphb-srd-pairing/ENRICHED_spells_pilot.md`](./xphb-srd-pairing/ENRICHED_spells_pilot.md)
- [`xphb-srd-pairing/ENRICHED_equipment_magic_items_pilot.md`](./xphb-srd-pairing/ENRICHED_equipment_magic_items_pilot.md)
- [`xphb-srd-pairing/SYNTHESIS_extension_surface_pressure_spells_items.md`](./xphb-srd-pairing/SYNTHESIS_extension_surface_pressure_spells_items.md)
- [`xphb-srd-pairing/ENRICHED_feats_pilot.md`](./xphb-srd-pairing/ENRICHED_feats_pilot.md)
- [`xphb-srd-pairing/ENRICHED_species_background_traits_pilot.md`](./xphb-srd-pairing/ENRICHED_species_background_traits_pilot.md)
- [`xphb-srd-pairing/SYNTHESIS_extension_surface_pressure_feats_traits.md`](./xphb-srd-pairing/SYNTHESIS_extension_surface_pressure_feats_traits.md)
- [`xphb-srd-pairing/ENRICHED_classes_features_pilot.md`](./xphb-srd-pairing/ENRICHED_classes_features_pilot.md)
- [`xphb-srd-pairing/SYNTHESIS_extension_surface_pressure_classes.md`](./xphb-srd-pairing/SYNTHESIS_extension_surface_pressure_classes.md)
- [`xphb-srd-pairing/SYNTHESIS_cross_family_pressure_matrix.md`](./xphb-srd-pairing/SYNTHESIS_cross_family_pressure_matrix.md)
- [`xphb-srd-pairing/GLOSSARY_DELTA_REVIEW.md`](./xphb-srd-pairing/GLOSSARY_DELTA_REVIEW.md)
- [`xphb-srd-pairing/CANDIDATE_closed_extension_surface_v1.md`](./xphb-srd-pairing/CANDIDATE_closed_extension_surface_v1.md)

## Immediate Findings From The PHB JSON

File facts:

- `book-xphb.json` exists locally at `./.references/5etools-src/data/book/book-xphb.json`
- size: about `510K`
- length: `14,813` lines
- top-level shape: one top-level key, `"data"`

Structural facts from a first pass:

- total `section` nodes: `60`
- total indexed PHB `section`/`entries`/`inset`/`table` nodes: `557`
- total indexed tagged occurrences: `2,169`
- total indexed SRD headings: `2,920`
- dominant node types:
  - `entries`: 453
  - `item`: 357
  - `statblock`: 154
  - `list`: 146
  - `section`: 60
  - `table`: 53
  - `inset`: 48

Inline tag density is high and useful:

- `{@spell ...}`: 411
- `{@item ...}`: 396
- `{@book ...}`: 223
- `{@variantrule ...}`: 165
- `{@feat ...}`: 150
- `{@class ...}`: 131
- `{@skill ...}`: 89
- `{@action ...}`: 67
- `{@condition ...}`: 47
- `{@itemMastery ...}`: 38

This means the PHB JSON is not just prose. It already contains a usable semantic annotation layer.

## Pass 0 And Pass 1 Status

Pass 0 is now complete in:

- [`xphb-srd-pairing/DOMAIN_FAMILY_PRECIFICATION.md`](./xphb-srd-pairing/DOMAIN_FAMILY_PRECIFICATION.md)

Coverage across canonical families is now tracked in:

- [`xphb-srd-pairing/COVERAGE_LEDGER.md`](./xphb-srd-pairing/COVERAGE_LEDGER.md)

The current canonical domain families are:

- spells
- feats
- classes and features
- species and background traits
- equipment properties and masteries
- magic items

Pass 1 identity/context extraction has started in the canonical family files:

- spells: `391`
- feats: `75`
- backgrounds: `16`
- species: `10`
- item properties: `9`
- masteries: `8`
- classes: `12`
- subclasses: `48`
- PHB magic-item procedural units: `8`

Important current limit:

- `book-xphb.json` exposes spells, feats, backgrounds, species, item properties, and mastery units cleanly;
- it exposes classes and subclasses cleanly;
- it does not expose class feature subunits as cleanly as the other families, so `UNITS_classes_and_features.md` is currently seeded with class and subclass units and is the canonical home for later feature-level enrichment.

Pass 2 surface synthesis has now started in sibling notes:

- spells: [`SURFACES_spells.md`](./xphb-srd-pairing/SURFACES_spells.md)
- feats: [`SURFACES_feats.md`](./xphb-srd-pairing/SURFACES_feats.md)
- classes/features: [`SURFACES_classes_features.md`](./xphb-srd-pairing/SURFACES_classes_features.md)
- species/background traits: [`SURFACES_species_background_traits.md`](./xphb-srd-pairing/SURFACES_species_background_traits.md)
- equipment/masteries/magic-item procedures: [`SURFACES_equipment_magic_items.md`](./xphb-srd-pairing/SURFACES_equipment_magic_items.md)

These notes are intentionally family-specific and non-duplicative:

- Pass 1 inventory files remain the canonical home for first-class unit lists;
- Pass 2 notes describe the next mechanic-surface extraction and extraction recipes;
- later enrichment should extend the family inventories or produce carefully indexed sibling artifacts, not parallel duplicate inventories.

The coverage ledger exists specifically to prevent drift:

- every canonical family has one row;
- omissions become visible immediately;
- no family is considered "covered" just because another family got deeper analysis.

Pass 2 pilot enrichment now exists across every canonical family:

- spells
- feats
- classes and features
- species and background traits
- equipment properties and masteries
- magic items

And the current synthesis state is now:

- spells/items established the first evidence-backed execution families;
- feats/traits showed that most later material reuses those families while strengthening prerequisite, source-choice, and source-root identity pressure;
- class features showed the strongest remaining additions are table-scaled resources, option registries, replacement/retraining mechanics, and cross-family rewrites.
- those family syntheses are now consolidated in [`SYNTHESIS_cross_family_pressure_matrix.md`](./xphb-srd-pairing/SYNTHESIS_cross_family_pressure_matrix.md), which is the canonical home for reused-vs-strengthened-vs-still-open pressure families.

That earlier synthesis pass was useful, but it turned out to be too strong as a public story of the work.

The reset note now makes the corrected foundation explicit:

- SRD 5.2.1 is the public base mechanics corpus;
- PHB material outside the SRD is a private extension corpus used locally because shipping licensed PHB content in the public repo is not acceptable;
- 5etools is structured input, not provenance;
- competitor notes are private cross-check aids, not the public-facing narrative of the pairing workspace.

So the main unresolved research problem has shifted again:

- it is no longer just "do later families force a separate execution model?";
- it is now "what lower-level atom graph is actually forced by the corpus, and where did the earlier family language overclaim ontology?"

That question is now being worked through in:

- [`xphb-srd-pairing/RESET_foundation_srd_base_phb_extension.md`](./xphb-srd-pairing/RESET_foundation_srd_base_phb_extension.md)
- [`xphb-srd-pairing/TAXONOMY_atoms_graph_v0.md`](./xphb-srd-pairing/TAXONOMY_atoms_graph_v0.md)
- [`xphb-srd-pairing/TAXONOMY_atoms_graph_v1.md`](./xphb-srd-pairing/TAXONOMY_atoms_graph_v1.md)
- [`xphb-srd-pairing/TAXONOMY_atoms_graph_v2.md`](./xphb-srd-pairing/TAXONOMY_atoms_graph_v2.md)
- [`xphb-srd-pairing/SPELL_VALIDATION_matrix_v0.md`](./xphb-srd-pairing/SPELL_VALIDATION_matrix_v0.md)
- [`xphb-srd-pairing/spell-validation/ROUND_1_synthesis.md`](./xphb-srd-pairing/spell-validation/ROUND_1_synthesis.md)
- [`xphb-srd-pairing/spell-validation/ROUND_2_synthesis.md`](./xphb-srd-pairing/spell-validation/ROUND_2_synthesis.md)
- [`xphb-srd-pairing/spell-validation/ROUND_3_synthesis.md`](./xphb-srd-pairing/spell-validation/ROUND_3_synthesis.md)

Current status of that line of work:

- the old closed-surface candidate is still useful as a derived design note, but it is no longer the main frontier;
- the active frontier is the lower-level taxonomy / graph pass;
- a 20-spell sample has now been run through three validation loops;
- by round 3, the residue is narrow enough to stop iterating on the same sample;
- the graph has now been widened once into item-side validation covering attunement, stored spells, charges, and item-owned casting;
- that item pass strengthened ownership/resource distinctions but did not force a new top-level node or edge family;
- a second edge-item widening pass has now tested reaction items, passive rewrites, toggles, mobility utilities, and container behavior;
- that second item pass still did not force a new top-level family, but it did justify naming a reusable passive-projection subgraph for worn/held effects with suppression/restoration and optional target rewrite;
- that does **not** mean schema design is next by default.

## Current Next Step

The next step is no longer the old immediate schema handoff.

The next step is:

- keep the corrected foundation in `RESET_foundation_srd_base_phb_extension.md`;
- treat `TAXONOMY_atoms_graph_v2.md` as the current working atom inventory;
- use `TAXONOMY_graph_representation_v0.md` as the explicit graphable layer for further validation;
- widen validation beyond the current 20-spell sample and two item passes, especially into more spells and item procedures that pressure attunement, stored spells, item-owned resources, and prompt/commit architecture;
- turn the prose atom inventory into a more explicit graph or tag relation structure before resuming schema work.

Current default rule:

- do not treat the six family bundles as final ontology;
- do not foreground competitor cross-checks in the public story of the work;
- do not advance to schema design yet;
- keep falsifying and refining the lower-level taxonomy until broader validation stops exposing structural dishonesty.
- keep rejecting atom candidates that fail the architecture bar: no core atom without clear ownership or deterministic mechanics shape.

## First Concrete Pairing Result: The Glossary Is Nearly Isomorphic

The first real pairing pass should stay on the glossary, and the data already shows why.

From the generated glossary pairing:

- PHB glossary terms: `154`
- SRD glossary headings: `157`
- normalized overlaps: `153`
- PHB-only glossary candidate: `1`
- SRD-only glossary candidates: `4`

The one PHB-only glossary candidate is:

- `Surprised`

The meaningful SRD-only glossary candidates are:

- `Reach`
- `Surprise`

The other two SRD-only headings are structural wrappers, not real term mismatches:

- `Glossary Conventions`
- `Rules Definitions`

This is exactly the kind of signal we want before vocabulary work:

- the PHB/SRD relationship is structurally tight enough to pair mechanically;
- most glossary work will be overlap classification, not discovery;
- the interesting deltas are naming and semantics edges like `Surprised` vs `Surprise`, not wholesale chapter divergence.

## The PHB Spine We Should Pair Against SRD

From the extracted section inventory, the main PHB semantic spine is:

- Chapter 1: Playing the Game
- Chapter 2: Creating a Character
- Chapter 3: Character Classes
- Chapter 4: Character Origins
- Chapter 5: Feats
- Chapter 6: Equipment
- Chapter 7: Spells
- Appendix B: Creature Stat Blocks
- Rules Glossary

The local SRD 5.2.1 corpus has a very similar semantic partition:

- [`Playing-the-Game.md`](./srd-5.2.1/Playing-the-Game.md)
- [`Character-Creation.md`](./srd-5.2.1/Character-Creation.md)
- [`Character-Origins.md`](./srd-5.2.1/Character-Origins.md)
- [`Classes/*.md`](./srd-5.2.1/Classes)
- [`Feats.md`](./srd-5.2.1/Feats.md)
- [`Equipment.md`](./srd-5.2.1/Equipment.md)
- [`Spells/Gaining-and-Casting.md`](./srd-5.2.1/Spells/Gaining-and-Casting.md)
- [`Monsters/*.md`](./srd-5.2.1/Monsters)
- [`Rules-Glossary.md`](./srd-5.2.1/Rules-Glossary.md)

This is good news: the books are pairable by semantic chapter, not just by raw string matching.

The generated chapter spine note now records the concrete chapter-level targets in:

- [`xphb-srd-pairing/CHAPTER_SPINE_PAIRING.md`](./xphb-srd-pairing/CHAPTER_SPINE_PAIRING.md)

The immediate conclusion from that pass is:

- `Playing the Game`, `Creating a Character`, `Character Origins`, `Feats`, `Equipment`, `Spells`, and `Rules Glossary` map very directly;
- `Character Classes` should be paired per class file, not as one block;
- `Creature Stat Blocks` should be treated as a catalog pairing problem, not a prose-section pairing problem.

## The Right Pairing Order

### 1. Pair glossary to glossary first

This should be the first pass because glossary entries are already close to engine vocabulary candidates, and both corpora expose them as named units.

Pair:

- PHB `Rules Glossary` section in `book-xphb.json`
- SRD [`Rules-Glossary.md`](./srd-5.2.1/Rules-Glossary.md)

Why this goes first:

- glossary entries are the cleanest normalized rules units;
- they reduce noise from examples and narrative prose;
- they define the canonical current terms for actions, conditions, timing, and state transitions.

Initial high-value glossary anchors already visible in both:

- Action
- Attack [Action]
- Bonus Action
- Reaction
- Concentration
- Help
- Hide
- Opportunity Attack
- Prone
- Surprised
- Search
- Study
- Utilize
- Exhaustion
- Invisible
- Long Rest
- Short Rest

Specific output we want from this pass:

- exact term matches
- PHB-only terms
- SRD-only terms
- same term, wording changed
- same term, structure changed

Status:

- this pass is now partially complete via [`xphb-srd-pairing/GLOSSARY_PAIRING.md`](./xphb-srd-pairing/GLOSSARY_PAIRING.md)
- next step inside the glossary pass is not more matching; it is manual review of the small mismatch set and sampling the wording deltas on a few high-value terms:
  - `Action`
  - `Reaction`
  - `Bonus Action`
  - `Concentration`
  - `Opportunity Attack`
  - `Search`
  - `Study`
  - `Utilize`
  - `Exhaustion`
  - `Invisible`
  - `Surprise` / `Surprised`

### 2. Pair chapter spines, not paragraphs

After the glossary pass, pair chapter-level sections by heading lineage.

Examples:

- PHB `Chapter 1: Playing the Game` ↔ SRD [`Playing-the-Game.md`](./srd-5.2.1/Playing-the-Game.md)
- PHB `Chapter 2: Creating a Character` ↔ SRD [`Character-Creation.md`](./srd-5.2.1/Character-Creation.md)
- PHB `Chapter 4: Character Origins` ↔ SRD [`Character-Origins.md`](./srd-5.2.1/Character-Origins.md)
- PHB `Chapter 5: Feats` ↔ SRD [`Feats.md`](./srd-5.2.1/Feats.md)
- PHB `Chapter 6: Equipment` ↔ SRD [`Equipment.md`](./srd-5.2.1/Equipment.md)
- PHB `Chapter 7: Spells` ↔ SRD [`Spells/Gaining-and-Casting.md`](./srd-5.2.1/Spells/Gaining-and-Casting.md)

The unit of comparison should be:

- chapter
- section
- subsection

Not:

- raw paragraph windows
- embedding similarity first

Reason:

- the SRD and PHB already expose editorial structure;
- use that before fuzzy search.

### 3. Use the 5etools inline tags as semantic breadcrumbs

The PHB JSON’s inline tags should drive the second-pass mining.

Useful tags:

- `{@action ...}`
- `{@condition ...}`
- `{@spell ...}`
- `{@feat ...}`
- `{@class ...}`
- `{@skill ...}`
- `{@itemProperty ...}`
- `{@itemMastery ...}`
- `{@variantrule ...}`

How to use them:

- collect every tagged occurrence
- attach the enclosing PHB section name and page
- group by tag kind and value
- compare against whether the SRD has:
  - a direct glossary entry
  - a chapter section
  - a class/feat/spell/item heading
  - nothing equivalent

This gives a much better map than prose-only comparison.

### 4. Separate editorial content from mechanical content

The PHB includes large amounts of:

- introduction and world framing
- examples
- sidebars
- inspirational prose
- player advice

These should not pollute the pairing set.

The high-value node types for pairing are:

- `section`
- `entries`
- `list`
- `table`
- `item`
- inline-tagged text

The lower-value or skip-first node types are:

- `quote`
- `image`
- `gallery`
- flavor-only insets

### 5. Bucket every PHB unit into one of five pairing classes

Every PHB rule unit should land in one bucket:

1. `Exact SRD overlap`
2. `SRD overlap with wording delta`
3. `SRD overlap with structural delta`
4. `PHB-only mechanical content`
5. `Editorial / non-mechanical content`

This is the crucial step. Without it, the pairing exercise turns into unstructured reading.

## What We Should Extract Before Any Vocabulary Work

Before designing a rule IR or vocabulary, extract these inventories:

Extraction target rule:

- do not stop at SRD overlap;
- extract the full SRD-paired surface;
- extract PHB-only mechanical units at the same abstraction layer and lower;
- skip only clearly editorial or flavor material;
- keep provenance explicit: SRD remains provenance, XPHB/5etools here is structured input for pairing and mining.

Current pass rule:

- Pass 1 extracts first-class units with identity/context only.
- Do not try to fully extract mechanic surfaces in the same pass.
- The purpose of Pass 1 is to establish the canonical inventory of units we will analyze next.

Pass 1 record shape:

- unit kind
- canonical name
- chapter / section lineage
- page or heading anchor
- provenance tag: `srd-overlap` / `phb-only` / `unclear`

Pass 2 is required next, and should enrich those units with mechanic-surface extraction rather than creating a second competing inventory.

Pass 2 suggested extraction fields:

- timing / workflow surface
- resource surface
- target surface
- effect surface
- expiry / cleanup surface
- referenced actions
- referenced conditions
- referenced items / item properties / masteries
- referenced spells
- referenced feats / features / traits

### A. Glossary term inventory

For each glossary term:

- PHB heading
- page
- enclosing chapter
- tag family if any (`Action`, `Condition`, etc.)
- whether SRD has an exact entry
- nearest SRD heading if not exact

### B. Action inventory

From PHB:

- all `{@action ...}` references
- action headings under `Actions`
- glossary action entries

From SRD:

- action headings in `Rules-Glossary.md`
- action sections in `Playing-the-Game.md`

This gives the first hard pairing surface for runtime semantics.

This inventory must include PHB-only action-like or procedure-bearing units too, not just overlap with the SRD subset.

### C. Condition inventory

From PHB:

- all `{@condition ...}` references
- condition headings in glossary

From SRD:

- glossary condition headings
- any condition-related detail sections in `Playing-the-Game.md`

This is likely the cleanest state-oriented pairing surface.

This includes PHB-only states, statuses, and related mechanical labels if they sit at this layer of abstraction.

### D. Spellcasting mechanics inventory

Pair:

- PHB `Chapter 7: Spells`
- SRD [`Spells/Gaining-and-Casting.md`](./srd-5.2.1/Spells/Gaining-and-Casting.md)

Extract:

- casting time
- slot usage
- concentration
- components
- targets
- saving throws
- attack rolls
- combining spell effects

This is where many battle-engine semantics live.

This pass has to retain both:

- SRD-overlap spellcasting mechanics, because they anchor current authoritative behavior;
- PHB-only spell and spellcasting mechanics, because they are part of the later vocabulary-forcing surface.

### E. Equipment / weapon property / mastery inventory

Pair:

- PHB `Chapter 6: Equipment`
- SRD [`Equipment.md`](./srd-5.2.1/Equipment.md)

Extract:

- weapon properties
- mastery properties
- armor training
- shields
- object interactions if linked through equipment usage

Do not stop at what the SRD already ships. The point is to collect the whole PHB mechanical surface here so later vocabulary work can distinguish “new primitive” from “existing primitive with new payload.”

### F. Feature-bearing heading inventory

From PHB JSON tags and section headings:

- feats
- class features
- weapon mastery references
- species/background feature references
- item properties
- equipment mechanics
- magic items and other item-scoped effect carriers

Do not model them yet. Just pair them:

- in SRD
- out of SRD
- partially in SRD

For every feature-bearing heading, extract at least:

- the named mechanical unit;
- the enclosing chapter / section lineage;
- whether it appears to carry executable semantics;
- whether it is SRD-overlap, partial-overlap, or PHB-only.

This is a primary input to later vocabulary work, because many future primitives will be forced by effect-bearing feats, spells, class features, species traits, and item mechanics rather than by glossary terms alone.

This also has to prepare for future non-core payloads introduced by modules:

- extra magic items;
- item-granted actions;
- item-granted reactive effects;
- item-scoped ongoing effects;
- item properties or tags that force runtime distinctions.

The pairing work should therefore treat item-scoped mechanics as a first-class vocabulary pressure source, not as an afterthought to spells and feats.

### G. Timing / workflow surface inventory

For each mechanical unit that appears to carry executable semantics, extract:

- when it starts;
- when it resolves;
- whether it creates an interrupt window;
- whether it is checked on attack, save, damage, turn start, turn end, concentration end, or rest completion;
- when it expires;
- what cleanup boundary it implies.

This inventory is now started in:

- [`xphb-srd-pairing/WORKFLOW_STAGE_CANDIDATES.md`](./xphb-srd-pairing/WORKFLOW_STAGE_CANDIDATES.md)
- [`xphb-srd-pairing/EFFECT_TIMING_SURFACES.json`](./xphb-srd-pairing/EFFECT_TIMING_SURFACES.json)

Important discipline:

- derive stage candidates from PHB/SRD mechanics first;
- use competitor research only to stress-test whether a distinction is operationally real;
- do not copy platform workflow names into the future vocabulary unless the corpus forces an equivalent distinction.

### H. Competitor taxonomy cross-check

For each extracted corpus surface, cross-check whether competitor systems had to invent an explicit taxonomy for it.

High-value taxonomy sources:

- [`LEARN_closed_mechanic_vocabularies.md`](./LEARN_closed_mechanic_vocabularies.md)
- [`LEARN_item_feature_scoped_runtime_payloads.md`](./LEARN_item_feature_scoped_runtime_payloads.md)
- [`LEARN_explicit_effect_phase_ownership.md`](./LEARN_explicit_effect_phase_ownership.md)
- [`RESEARCH_ecosystem_map.md`](./RESEARCH_ecosystem_map.md)

What to look for:

- action taxonomies;
- effect taxonomies;
- item/spell/feature payload taxonomies;
- trigger and timing taxonomies;
- condition and cleanup taxonomies;
- places where competitor systems had to add special categories because a flat model broke down.

Use this only as pressure analysis:

- it helps reveal where later vocabulary design will be forced;
- it does not define correctness;
- it does not justify importing mutable or platform-shaped architecture.

### I. Provenance / packaging boundary cross-check

Licensing and provenance are first-class constraints for this project, so the pairing work must keep them attached to the extraction results.

Primary cross-check source:

- [`LEARN_hard_provenance_package_boundaries.md`](./LEARN_hard_provenance_package_boundaries.md)

For each extracted mechanical surface, keep track of:

- whether it is inside current SRD provenance;
- whether it is only present in XPHB structured input;
- whether it is a good candidate for future optional module/package payloads;
- whether the extraction result should live in a provenance-bound package boundary rather than in shared core payloads.

This matters especially for:

- feats;
- spells;
- class features;
- species traits;
- magic items;
- item properties and mastery-like mechanics;
- future module-added content packs.

## Concrete Mining Workflow

This is the specific workflow I would use next.

### Pass 1: Build a PHB structural index

Output:

- section path
- page
- node type
- normalized heading
- inline tags seen inside the section

Goal:

- every PHB semantic unit becomes addressable

And for the first real extraction pass:

- capture first-class units as identity/context records only;
- do not flatten them into mechanic taxonomy yet.

### Pass 2: Build an SRD heading index

Output:

- file path
- heading level
- heading text
- semantic family inferred from file path

Goal:

- every SRD semantic unit becomes addressable

### Pass 3: Pair glossary first

Method:

- exact normalized heading match
- manual review of mismatches

Goal:

- create the canonical "current terminology bridge" before touching longer prose

### Pass 4: Pair chapter sections by heading lineage

Method:

- pair chapter
- pair section
- pair subsection
- then compare tagged references inside each matched unit

Goal:

- keep comparisons semantically aligned instead of globally fuzzy

### Pass 5: Extract unresolved PHB mechanical units

These are:

- PHB mechanical sections with no SRD peer
- PHB tagged mechanics not present in SRD
- PHB structures that reorganize a known SRD rule enough to matter

This is the set we care about for later vocabulary and extension design.

More specifically, this unresolved set must include:

- PHB-only spells, feats, class features, species traits, item mechanics, and other effect-bearing units;
- PHB-only structured sub-mechanics such as triggers, durations, resource uses, target shapes, attack/save/check hooks, movement hooks, visibility hooks, and cleanup/expiry hooks;
- overlap units whose wording or structure changes appear likely to force a new semantic primitive rather than just a new payload.

### Pass 5b: Enrich first-class units with mechanic surfaces

After Pass 1 has established the canonical inventory of first-class units, the next extraction pass should enrich each unit with:

- timing / workflow surface;
- resource surface;
- target surface;
- effect surface;
- expiry / cleanup surface;
- cross-references to actions, conditions, spells, feats, features, and item mechanics.

This should extend the Pass 1 inventory, not duplicate it.

Current status:

- initial Pass 2 surface notes exist for spells, feats, class/features extraction planning, and equipment/magic-item procedures;
- a first true enrichment artifact now exists for spells in [`ENRICHED_spells_pilot.md`](./xphb-srd-pairing/ENRICHED_spells_pilot.md);
- a second enrichment pilot now exists for equipment/magic-item procedures in [`ENRICHED_equipment_magic_items_pilot.md`](./xphb-srd-pairing/ENRICHED_equipment_magic_items_pilot.md);
- the first explicit corpus-vs-competitor synthesis note now exists in [`SYNTHESIS_extension_surface_pressure_spells_items.md`](./xphb-srd-pairing/SYNTHESIS_extension_surface_pressure_spells_items.md);
- enrichment pilots now also exist for feats and species/background traits;
- a follow-up synthesis note now exists in [`SYNTHESIS_extension_surface_pressure_feats_traits.md`](./xphb-srd-pairing/SYNTHESIS_extension_surface_pressure_feats_traits.md);
- the next concrete implementation step is to extend these pilots from representative samples toward broader coverage and then tackle the feature-subunit prerequisite for `classes_and_features`.

### Pass 6: Cross-check stage candidates against competitor timing pain

Use:

- [`RESEARCH_foundry_effect_staging.md`](./RESEARCH_foundry_effect_staging.md)
- [`LEARN_explicit_effect_phase_ownership.md`](./LEARN_explicit_effect_phase_ownership.md)
- [`LEARN_closed_mechanic_vocabularies.md`](./LEARN_closed_mechanic_vocabularies.md)

Goal:

- confirm which timing distinctions are genuinely important;
- reject workflow stages that are just platform artifacts;
- identify where a future closed vocabulary will need a first-class timing primitive rather than a generic hook.

### Pass 7: Cross-check extracted mechanics against competitor taxonomies

Use:

- [`LEARN_item_feature_scoped_runtime_payloads.md`](./LEARN_item_feature_scoped_runtime_payloads.md)
- [`LEARN_closed_mechanic_vocabularies.md`](./LEARN_closed_mechanic_vocabularies.md)
- [`RESEARCH_ecosystem_map.md`](./RESEARCH_ecosystem_map.md)

Goal:

- identify where the corpus likely forces typed payload families;
- identify where items, spells, feats, and features need separate or shared vocabulary surfaces;
- identify known failure modes where competitor systems had to hardcode exceptions because their taxonomy was too shallow.

### Pass 8: Cross-check extracted mechanics against provenance/package boundaries

Use:

- [`LEARN_hard_provenance_package_boundaries.md`](./LEARN_hard_provenance_package_boundaries.md)

Goal:

- ensure extracted mechanics are not modeled as if provenance does not matter;
- identify which future vocabulary surfaces must tolerate optional packaged content such as non-SRD magic items or module-added feature payloads;
- preserve the distinction between provenance, structured input, and runtime projection while the vocabulary is still being formed.

## What Not To Do Yet

- do not infer the final rule vocabulary yet
- do not use competitor implementations as the first-pass authority
- do not do paragraph-level semantic search first
- do not mix editorial text and mechanical text in the same queue
- do not widen the engine scope just because the PHB contains more content

## Immediate Next Step

The next useful step is not a "vocabulary plan." It is to generate two machine-readable indexes:

1. PHB section/tag index from `book-xphb.json`
2. SRD heading index from `.references/srd-5.2.1`

Then pair the glossary units first and write out the unresolved buckets.

That will tell us, concretely, what the PHB adds, renames, restructures, or leaves outside the SRD boundary.
