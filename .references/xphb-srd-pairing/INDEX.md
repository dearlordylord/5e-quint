# XPHB/SRD Pairing Index

This directory is the local workspace for pairing the 2024 PHB structured input against the local SRD 5.2.1 corpus.

Everything here is intended to stay under `.references/` and out of the checked-in part of the repo unless explicitly promoted later.

## Non-Duplication Rule

Indexed files in this workspace are supposed to be canonical for their topic.

That means:

- do not create a second file that covers the same pairing topic with only slightly different wording;
- do not fork parallel notes for the same extraction pass;
- do not leave stale superseded drafts indexed next to their replacement.

If a duplicate appears, a proper merge must happen:

1. identify the broader or better-structured canonical file;
2. merge any unique findings from the duplicate into that canonical file;
3. update this index to point only to the merged canonical result;
4. remove the duplicate from the index, or rename it clearly as archived/superseded if it must be retained temporarily.

The goal is one indexed home per pairing topic, not a pile of overlapping notes.

## Versioning Rule

Do **not** encode version numbers in filenames (`foo_v0.md`, `foo_v1.md`, `TAXONOMY_atoms_graph_v4.md`). Iterate a canonical file in place — git already tracks history.

Rationale for the rule:

- filename-versioning seeds a mental model where every iteration must produce a new file. This creates N superseded drafts that persist indefinitely as noise;
- git history is a proper, queryable version control system. A filename suffix is a poor imitation;
- numbered filenames get duplicated in indexes and reading orders, increasing cognitive load every time a reader has to decide which is current;
- if the current contents become genuinely incompatible with the prior shape (removals, renames), document the transition in a compatibility note rather than freezing the old state as a parallel file.

How this rule was re-established (recorded so the pattern does not recur):

- `TAXONOMY_atoms_graph_v0.md` was created with an explicit `_v0` suffix, which seeded the expectation that revisions would be `_v1`, `_v2`, etc.;
- the parent research note `../RESEARCH_XPHB_SRD_PAIRING.md` listed the numbered versions as canonical artifacts, institutionalizing the pattern;
- this index listed each version as a separate entry in the reading order, reinforcing the pattern visually;
- all three sources are now corrected. Current canonical filenames are suffix-free.

Exceptions (narrow, explicitly authored):

- files whose content is about a specific external version (e.g., a compatibility note that maps old atom names to current ones). The filename should describe the content's purpose, not encode a sequence.

## Current Next Step

The research-side taxonomy track is **closed**:

- `TAXONOMY_atoms_graph.md` is the final atom inventory;
- `TAXONOMY_graph_representation.md` is the current graph model with all 18 reusable subgraphs;
- `COMPATIBILITY_certification.md` cross-walks all historical validation artifacts to current atom names;
- `RESEARCH_capstone.md` summarizes the `v0 → v4` arc, the seven validation streams, and handover inputs for a future schema-design phase.

Schema design may resume whenever chosen. No further research-side widening is required against the SRD 5.2.1 public base. A PHB extension-corpus pass is the natural follow-up if product-side work needs confidence that the atom set carries private content too.

## Core Pairing Research

- [RESEARCH_XPHB_SRD_PAIRING.md](../RESEARCH_XPHB_SRD_PAIRING.md)  
  Main research note for the pairing strategy, extraction targets, and workflow.

## Local Pairing Artifacts

- [DOMAIN_FAMILY_PRECIFICATION.md](./DOMAIN_FAMILY_PRECIFICATION.md)  
  Pass 0 canonical family split for the first-class unit inventories.

- [COVERAGE_LEDGER.md](./COVERAGE_LEDGER.md)  
  Canonical progress ledger for family coverage across Pass 1, Pass 2, competitor cross-checks, and provenance review.

- [INDEX_SUMMARY.md](./INDEX_SUMMARY.md)  
  High-level generated summary of the current pairing indexes.

- [XPHB_SECTION_INDEX.json](./XPHB_SECTION_INDEX.json)  
  Machine-readable index of PHB sectionish nodes and section lineage.

- [XPHB_TAG_OCCURRENCES.json](./XPHB_TAG_OCCURRENCES.json)  
  Machine-readable index of inline-tag occurrences inside the PHB JSON.

- [SRD_HEADING_INDEX.json](./SRD_HEADING_INDEX.json)  
  Machine-readable index of local SRD headings.

- [GLOSSARY_PAIRING.md](./GLOSSARY_PAIRING.md)  
  Human-readable glossary overlap sheet between PHB and SRD.

- [GLOSSARY_PAIRING.json](./GLOSSARY_PAIRING.json)  
  Machine-readable glossary overlap data.

- [GLOSSARY_DELTA_REVIEW.md](./GLOSSARY_DELTA_REVIEW.md)  
  Manual review of the high-value glossary mismatch and wording-delta sample.

- [CHAPTER_SPINE_PAIRING.md](./CHAPTER_SPINE_PAIRING.md)  
  Chapter-level semantic spine pairing between PHB and SRD.

- [WORKFLOW_STAGE_CANDIDATES.md](./WORKFLOW_STAGE_CANDIDATES.md)  
  Corpus-derived timing/workflow stage candidates to expose later as closed vocabulary, if the corpus truly forces them.

- [EFFECT_TIMING_SURFACES.json](./EFFECT_TIMING_SURFACES.json)  
  Machine-readable stage/timing surface inventory for actions, effects, concentration, turn timing, reactions, and cleanup.

## Pass 1 Unit Inventories

- [UNITS_spells.md](./UNITS_spells.md)  
  First-class spell units from the PHB spell corpus.

- [UNITS_feats.md](./UNITS_feats.md)  
  First-class feat units from the PHB feat corpus.

- [UNITS_classes_and_features.md](./UNITS_classes_and_features.md)  
  First-class class and subclass units now; canonical home for later feature subunit extraction.

- [UNITS_species_and_background_traits.md](./UNITS_species_and_background_traits.md)  
  First-class species and background units now; canonical home for later trait/feature subunit extraction.

- [UNITS_equipment_properties_and_masteries.md](./UNITS_equipment_properties_and_masteries.md)  
  First-class item properties and mastery units.

- [UNITS_magic_items.md](./UNITS_magic_items.md)  
  PHB magic-item procedural units now; canonical home for future optional package magic-item units if later admitted.

## Pass 2 Surface Notes

- [SURFACES_spells.md](./SURFACES_spells.md)  
  Spell-family mechanic-surface synthesis and next extraction recipe.

- [SURFACES_feats.md](./SURFACES_feats.md)  
  Feat-family mechanic-surface synthesis and next extraction recipe.

- [SURFACES_classes_features.md](./SURFACES_classes_features.md)  
  Class/subclass feature-subunit extraction plan and likely mechanic surfaces.

- [SURFACES_equipment_magic_items.md](./SURFACES_equipment_magic_items.md)  
  Equipment-property, mastery, and magic-item-procedure surface synthesis.

- [SURFACES_species_background_traits.md](./SURFACES_species_background_traits.md)  
  Species/background trait-family surface synthesis and next extraction recipe.

## Pass 2 Enrichment Artifacts

- [ENRICHED_spells_pilot.md](./ENRICHED_spells_pilot.md)  
  First true enrichment artifact: representative spell records turned into explicit extracted surfaces.

- [ENRICHED_equipment_magic_items_pilot.md](./ENRICHED_equipment_magic_items_pilot.md)  
  Representative equipment/mastery/item-procedure records turned into explicit extracted surfaces.

- [ENRICHED_feats_pilot.md](./ENRICHED_feats_pilot.md)  
  Representative feat records turned into explicit benefit-atom surfaces.

- [ENRICHED_species_background_traits_pilot.md](./ENRICHED_species_background_traits_pilot.md)  
  Representative species/background trait subunits turned into explicit extracted surfaces.

- [ENRICHED_classes_features_pilot.md](./ENRICHED_classes_features_pilot.md)  
  Representative class and subclass feature records turned into explicit extracted surfaces.

## Synthesis Notes

- [SYNTHESIS_extension_surface_pressure_spells_items.md](./SYNTHESIS_extension_surface_pressure_spells_items.md)  
  First corpus-vs-competitor synthesis note stating which extension surfaces are now evidence-backed.

- [SYNTHESIS_extension_surface_pressure_feats_traits.md](./SYNTHESIS_extension_surface_pressure_feats_traits.md)  
  Follow-up synthesis on whether feats and traits mostly reuse the same extension families or force new ones.

- [SYNTHESIS_extension_surface_pressure_classes.md](./SYNTHESIS_extension_surface_pressure_classes.md)  
  Follow-up synthesis on what class features add beyond spells, items, feats, and traits.

- [SYNTHESIS_cross_family_pressure_matrix.md](./SYNTHESIS_cross_family_pressure_matrix.md)  
  Canonical consolidation of reused, strengthened, and still-open pressure families across all current pilot syntheses.

- [CANDIDATE_closed_extension_surface_v1.md](./CANDIDATE_closed_extension_surface_v1.md)  
  Historical candidate closed-surface draft, superseded by the atom-graph track. Retained as evidence of a path explored and rejected.

- [STRESS_TEST_closed_extension_surface_v1_spells.md](./STRESS_TEST_closed_extension_surface_v1_spells.md)  
  Historical spell-focused stress test for the old candidate surface.

- [STRESS_TEST_closed_extension_surface_v1_items_classes.md](./STRESS_TEST_closed_extension_surface_v1_items_classes.md)  
  Historical item/class-feature stress test for the old candidate surface.

- [DECISION_activation_vs_triggered_reaction.md](./DECISION_activation_vs_triggered_reaction.md)  
  Working decision to keep chosen activations and trigger-window reactions as separate authored payload families.

- [PLAN_closed_extension_surface_implementation.md](./PLAN_closed_extension_surface_implementation.md)  
  Historical implementation-oriented follow-on plan for the old closed-surface draft. Superseded by the atom-graph track.

## Reset And Taxonomy Notes

- [RESET_foundation_srd_base_phb_extension.md](./RESET_foundation_srd_base_phb_extension.md)  
  Corrected foundation note for SRD base mechatory, PHB private extension content, licensing, and public/private research boundaries.

- [TAXONOMY_atoms_graph.md](./TAXONOMY_atoms_graph.md)  
  Current atom inventory. The research-side taxonomy converged on this after four validation-driven revisions (see `RESEARCH_capstone.md` for the `v0 → v4` narrative). Iterate in place; do not create versioned filenames.

- [TAXONOMY_graph_representation.md](./TAXONOMY_graph_representation.md)  
  Current graph/tag representation using the atom inventory end-to-end. Consolidates all 18 reusable subgraphs (A–R) with concrete pressure cases and example subgraphs.

- [COMPATIBILITY_certification.md](./COMPATIBILITY_certification.md)  
  Per-stream re-validation of all historical unit entries against the current atom names. Documents the three retirements (`stored_spell_slot`, `modify_roll`, `scale_damage`) with clean mapping rules and confirms every validation conclusion still holds.

- [RESEARCH_capstone.md](./RESEARCH_capstone.md)  
  Single-file summary of the research arc, the seven validation streams, and handover inputs for a future schema-design phase.

## Validation Matrices And Rounds

### Spells

- [SPELL_VALIDATION_matrix_v0.md](./SPELL_VALIDATION_matrix_v0.md)  
  Canonical 20-spell validation matrix.

- [spell-validation/ROUND_1_synthesis.md](./spell-validation/ROUND_1_synthesis.md)  
  First aggregate pass.

- [spell-validation/ROUND_2_synthesis.md](./spell-validation/ROUND_2_synthesis.md)  
  Second aggregate pass.

- [spell-validation/ROUND_3_synthesis.md](./spell-validation/ROUND_3_synthesis.md)  
  Third aggregate pass; convergence.

### Magic items

- [ITEM_VALIDATION_matrix_v0.md](./ITEM_VALIDATION_matrix_v0.md)  
  Focused item-side matrix for attunement, stored spells, charges, and item-owned casting.

- [item-validation/ROUND_1_synthesis.md](./item-validation/ROUND_1_synthesis.md)  
  First item-side aggregate pass.

- [ITEM_VALIDATION_matrix_v1_edge_items.md](./ITEM_VALIDATION_matrix_v1_edge_items.md)  
  Second widening sample focused on reaction items, passive rewrites, toggles, mobility utilities, and container behavior.

- [item-validation/ROUND_2_synthesis.md](./item-validation/ROUND_2_synthesis.md)  
  Edge-item aggregate pass.

### Masteries

- [MASTERY_VALIDATION_matrix_v0.md](./MASTERY_VALIDATION_matrix_v0.md)  
  Closed 2024 weapon-mastery sample (8 units).

- [mastery-validation/ROUND_1_synthesis.md](./mastery-validation/ROUND_1_synthesis.md)  
  Mastery aggregate pass; adds the On-Hit Rider subgraph.

### Feats

- [FEAT_VALIDATION_matrix_v0.md](./FEAT_VALIDATION_matrix_v0.md)  
  Closed 2024 SRD feat catalog (17 feats).

- [feat-validation/ROUND_1_synthesis.md](./feat-validation/ROUND_1_synthesis.md)  
  Feat aggregate pass; promoted the typed `modify_roll_*` split and several new grant atoms.

### Class features

- [CLASS_FEATURE_VALIDATION_matrix_v0.md](./CLASS_FEATURE_VALIDATION_matrix_v0.md)  
  16-feature sample across Barbarian, Bard, Wizard, Fighter, Monk, Rogue, Paladin.

- [class-feature-validation/ROUND_1_synthesis.md](./class-feature-validation/ROUND_1_synthesis.md)  
  Class-feature aggregate pass; flagged typed scaling split and added five subgraphs.

### Species and backgrounds

- [SPECIES_BACKGROUND_VALIDATION_matrix_v0.md](./SPECIES_BACKGROUND_VALIDATION_matrix_v0.md)  
  Full SRD 5.2.1 origin-side catalog (9 species + 4 backgrounds).

- [species-background-validation/ROUND_1_synthesis.md](./species-background-validation/ROUND_1_synthesis.md)  
  Origin-side aggregate pass; provided the cross-stream data point (Dragonborn Breath Weapon) that promoted the typed scaling split.

### Item properties

- [ITEM_PROPERTY_VALIDATION_matrix_v0.md](./ITEM_PROPERTY_VALIDATION_matrix_v0.md)  
  Full SRD 5.2.1 weapon property set (9 units).

- [item-property-validation/ROUND_1.md](./item-property-validation/ROUND_1.md)  
  Item-property validation closing out source-root coverage.

## Private Cross-Check Notes

These are local supporting notes. They are not the public story of the pairing workspace and they are not the rules source of truth.

- [RESEARCH_5EQUINT.md](../RESEARCH_5EQUINT.md)
- [RESEARCH_foundry_effect_staging.md](../RESEARCH_foundry_effect_staging.md)
- [RESEARCH_ecosystem_map.md](../RESEARCH_ecosystem_map.md)
- [RESEARCH_pf2e_rule_elements.md](../RESEARCH_pf2e_rule_elements.md)
- [RESEARCH_runtime_replay_patterns.md](../RESEARCH_runtime_replay_patterns.md)
- [RESEARCH_verification_scenario_mining.md](../RESEARCH_verification_scenario_mining.md)
- [LEARN_explicit_effect_phase_ownership.md](../LEARN_explicit_effect_phase_ownership.md)
- [LEARN_closed_mechanic_vocabularies.md](../LEARN_closed_mechanic_vocabularies.md)
- [LEARN_item_feature_scoped_runtime_payloads.md](../LEARN_item_feature_scoped_runtime_payloads.md)
- [LEARN_hard_provenance_package_boundaries.md](../LEARN_hard_provenance_package_boundaries.md)

## Reading Order

For a new reader, the shortest path through the research is:

1. [../RESEARCH_XPHB_SRD_PAIRING.md](../RESEARCH_XPHB_SRD_PAIRING.md)
2. [RESET_foundation_srd_base_phb_extension.md](./RESET_foundation_srd_base_phb_extension.md)
3. [RESEARCH_capstone.md](./RESEARCH_capstone.md)
4. [TAXONOMY_atoms_graph.md](./TAXONOMY_atoms_graph.md)
5. [TAXONOMY_graph_representation.md](./TAXONOMY_graph_representation.md)
6. [COMPATIBILITY_certification.md](./COMPATIBILITY_certification.md)

For the full validation trail, read the validation matrices and round syntheses in source-root order (spells → items → masteries → feats → class features → species/backgrounds → item properties).

For the domain / family shape, see `DOMAIN_FAMILY_PRECIFICATION.md` and `COVERAGE_LEDGER.md`.

For authoring history of rejected paths (old family-bundle candidate surface), see the `CANDIDATE_*` / `STRESS_TEST_*` / `PLAN_*` notes under "Synthesis Notes".
