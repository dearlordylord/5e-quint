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

## Current Next Step

This workspace is still in research-shaping mode.

The research-side taxonomy track is **closed**:

- `TAXONOMY_atoms_graph_v4.md` is the final atom inventory;
- `TAXONOMY_graph_representation_v1.md` is the current graph model with all 18 reusable subgraphs;
- `COMPATIBILITY_v4_certification.md` cross-walks all historical validation artifacts to `v4` atom names;
- `RESEARCH_capstone.md` summarizes the arc from `v0` to `v4`, the seven validation streams, and the handover inputs for a future schema-design phase.

Schema design may resume whenever chosen. No further research-side widening is required.

Current default rule:

- do not treat the six family bundles as the final ontology;
- do not foreground competitor research in public-facing framing;
- do not advance to schema design yet;
- keep widening validation until the lower-level taxonomy either exposes structural dishonesty (requiring `v3`) or converges across all source-root atoms.

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
  First derived draft of a closed extension surface, grounded in the current synthesis notes.

- [STRESS_TEST_closed_extension_surface_v1_spells.md](./STRESS_TEST_closed_extension_surface_v1_spells.md)  
  Spell-focused stress test for `v1`, identifying where the candidate is structurally right and where it is still too flat.

- [STRESS_TEST_closed_extension_surface_v1_items_classes.md](./STRESS_TEST_closed_extension_surface_v1_items_classes.md)  
  Item- and class-feature-focused stress test for `v1`, especially around rewrites, registries, and action-vs-reaction separation.

- [DECISION_activation_vs_triggered_reaction.md](./DECISION_activation_vs_triggered_reaction.md)  
  Current working decision to keep chosen activations and trigger-window reactions as separate authored payload families.

- [PLAN_closed_extension_surface_implementation.md](./PLAN_closed_extension_surface_implementation.md)  
  Implementation-oriented follow-on plan for the current closed-surface draft and stress-test results.

## Reset And Taxonomy Notes

- [RESET_foundation_srd_base_phb_extension.md](./RESET_foundation_srd_base_phb_extension.md)  
  Corrected foundation note for SRD base mechanics, PHB private extension content, licensing, and public/private research boundaries.

- [TAXONOMY_atoms_graph_v0.md](./TAXONOMY_atoms_graph_v0.md)  
  First lower-level taxonomy pass, expressed as graphable atoms and relations instead of a finished family ontology.

- [TAXONOMY_atoms_graph_v1.md](./TAXONOMY_atoms_graph_v1.md)  
  First revision after the initial 20-spell falsification pass.

- [TAXONOMY_atoms_graph_v2.md](./TAXONOMY_atoms_graph_v2.md)  
  Working taxonomy after three rounds of spell validation narrowed the residue.

- [TAXONOMY_atoms_graph_v3.md](./TAXONOMY_atoms_graph_v3.md)  
  Working taxonomy after the feat pass promoted accumulated refinement pressure to first-class atoms. Adds typed `modify_roll_*` split, `grant_sense` / `grant_proficiency` / `grant_spell_access` / `grant_resistance` / `bypass_resistance`, `initiative_window` / `post_action_window`, and `refund` / `refunds`.

- [TAXONOMY_atoms_graph_v4.md](./TAXONOMY_atoms_graph_v4.md)  
  Current working taxonomy after the species and class-feature passes pressured a typed scaling split. Splits `scale_damage` into `scale_die_count`, `scale_die_size`, `scale_attack_count`, and retains `scale_numeric_bonus` / `scale_target_count`. Every source-root atom now has at least one atom-level validation pass.

- [TAXONOMY_graph_representation_v0.md](./TAXONOMY_graph_representation_v0.md)  
  Historical graph/tag representation using `v2` atom names plus evolving subgraphs; superseded by `v1`.

- [TAXONOMY_graph_representation_v1.md](./TAXONOMY_graph_representation_v1.md)  
  Current graph/tag representation using `v4` atom names end-to-end. Consolidates all 18 reusable subgraphs (A–R) with concrete pressure cases, example subgraphs for Shield, Bless, Sap, Topple, Sneak Attack, Extra Attack, Arcane Recovery, Ring of Spell Storing, Attunement, Passive Worn/Held Defense.

- [COMPATIBILITY_v4_certification.md](./COMPATIBILITY_v4_certification.md)  
  Per-stream re-validation of all 87 historical unit entries against `v4` atom names. Documents the three retirements (`stored_spell_slot` in `v1`, `modify_roll` in `v3`, `scale_damage` in `v4`) with clean mapping rules and confirms every validation conclusion still holds under `v4`.

- [RESEARCH_capstone.md](./RESEARCH_capstone.md)  
  Single-file summary of the research arc: `v0 → v4` evolution, seven validation streams, final atom and pattern inventories, what survived / was refined / was retired / is recorded residue, and handover inputs for a future schema design phase.

- [SPELL_VALIDATION_matrix_v0.md](./SPELL_VALIDATION_matrix_v0.md)  
  Canonical 20-spell validation matrix for testing the current taxonomy against actual spell shapes.

- [spell-validation/ROUND_1_synthesis.md](./spell-validation/ROUND_1_synthesis.md)  
  First aggregate pass showing that `v0` was usable as a falsification target but too coarse as a real taxonomy.

- [spell-validation/ROUND_2_synthesis.md](./spell-validation/ROUND_2_synthesis.md)  
  Second aggregate pass showing that `v1` fixed real compression but still justified one more revision.

- [spell-validation/ROUND_3_synthesis.md](./spell-validation/ROUND_3_synthesis.md)  
  Third aggregate pass showing that `v2` is good enough to stop iterating on the same 20-spell sample.

- [ITEM_VALIDATION_matrix_v0.md](./ITEM_VALIDATION_matrix_v0.md)  
  Focused item-side validation matrix for attunement, stored spells, charges, and item-owned casting.

- [item-validation/ROUND_1_synthesis.md](./item-validation/ROUND_1_synthesis.md)  
  First item-side aggregate pass showing that item pressure strengthens ownership/resource distinctions without forcing a new top-level graph family.

- [ITEM_VALIDATION_matrix_v1_edge_items.md](./ITEM_VALIDATION_matrix_v1_edge_items.md)  
  Second item-side widening sample focused on reaction items, passive rewrites, toggles, mobility utilities, and container behavior.

- [item-validation/ROUND_2_synthesis.md](./item-validation/ROUND_2_synthesis.md)  
  Edge-item aggregate pass showing that the graph still holds and that the main new result is a reusable passive-projection subgraph, not a new top-level family.

- [MASTERY_VALIDATION_matrix_v0.md](./MASTERY_VALIDATION_matrix_v0.md)  
  Closed 2024 weapon-mastery sample for testing the atom graph against attack-roll rider composition, on-miss riders, attack-rooted save DCs, per-turn fences, and non-stacking policy.

- [mastery-validation/ROUND_1_synthesis.md](./mastery-validation/ROUND_1_synthesis.md)  
  Mastery-side aggregate pass showing that `v2` still holds, adds a reusable on-hit rider subgraph to the graph representation, and narrows the "exact attack-roll rider composition" weak spot into smaller residue observations.

- [FEAT_VALIDATION_matrix_v0.md](./FEAT_VALIDATION_matrix_v0.md)  
  Closed 2024 SRD feat-catalog sample (17 feats) for testing the atom graph against multi-benefit composition, sense/proficiency/spell-access grants, damage-defense family, initiative and post-action windows, and probabilistic resource refund.

- [feat-validation/ROUND_1_synthesis.md](./feat-validation/ROUND_1_synthesis.md)  
  Feat-side aggregate pass showing that `v2`'s top-level family shape still holds but that accumulated refinement pressure across four validation streams justifies promoting atom additions into `TAXONOMY_atoms_graph_v3.md`.

- [CLASS_FEATURE_VALIDATION_matrix_v0.md](./CLASS_FEATURE_VALIDATION_matrix_v0.md)  
  16-feature class-sample (across Barbarian, Bard, Wizard, Fighter, Monk, Rogue, Paladin) for stress-testing `v3` on stateful pools, reactions, persistent grants, and level scaling.

- [class-feature-validation/ROUND_1_synthesis.md](./class-feature-validation/ROUND_1_synthesis.md)  
  Class-feature aggregate pass showing that `v3` holds at the top level with second-data-point validation for `refund`, `initiative_window`, `grant_resistance`, and `grant_spell_access`; flags typed scaling split as the primary `v4` candidate; adds five graph-representation subgraphs (Pool With Options Menu, Cross-Rule Rewrite, Conditional Payment After Resolution, Usage-Count-Parameterized DC, Extend-By-Activity Duration).

- [SPECIES_BACKGROUND_VALIDATION_matrix_v0.md](./SPECIES_BACKGROUND_VALIDATION_matrix_v0.md)  
  Full SRD 5.2.1 origin-side sample (9 species + 4 backgrounds) for validating `v3`'s grant atoms and crossing the independent-stream bar for typed scaling split.

- [species-background-validation/ROUND_1_synthesis.md](./species-background-validation/ROUND_1_synthesis.md)  
  Species / background aggregate pass providing the cross-stream data point (Dragonborn Breath Weapon) that promotes typed scaling split to `v4`, plus seven-data-point anchoring for the Scope-First Nested Selection pattern.

- [ITEM_PROPERTY_VALIDATION_matrix_v0.md](./ITEM_PROPERTY_VALIDATION_matrix_v0.md)  
  Full SRD 5.2.1 weapon property sample (9 properties) for validating cross-rule composition as the dominant structural pattern.

- [item-property-validation/ROUND_1.md](./item-property-validation/ROUND_1.md)  
  Single-group item-property validation closing out source-root coverage; confirms no new atoms forced and cross-rule composition / rewrite patterns carry all 9 properties cleanly.

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

1. [RESEARCH_XPHB_SRD_PAIRING.md](../RESEARCH_XPHB_SRD_PAIRING.md)
2. [DOMAIN_FAMILY_PRECIFICATION.md](./DOMAIN_FAMILY_PRECIFICATION.md)
3. [COVERAGE_LEDGER.md](./COVERAGE_LEDGER.md)
4. [UNITS_spells.md](./UNITS_spells.md)
5. [UNITS_feats.md](./UNITS_feats.md)
6. [UNITS_classes_and_features.md](./UNITS_classes_and_features.md)
7. [UNITS_species_and_background_traits.md](./UNITS_species_and_background_traits.md)
8. [UNITS_equipment_properties_and_masteries.md](./UNITS_equipment_properties_and_masteries.md)
9. [UNITS_magic_items.md](./UNITS_magic_items.md)
10. [SURFACES_spells.md](./SURFACES_spells.md)
11. [SURFACES_feats.md](./SURFACES_feats.md)
12. [SURFACES_classes_features.md](./SURFACES_classes_features.md)
13. [SURFACES_species_background_traits.md](./SURFACES_species_background_traits.md)
14. [SURFACES_equipment_magic_items.md](./SURFACES_equipment_magic_items.md)
15. [ENRICHED_spells_pilot.md](./ENRICHED_spells_pilot.md)
16. [ENRICHED_equipment_magic_items_pilot.md](./ENRICHED_equipment_magic_items_pilot.md)
17. [ENRICHED_feats_pilot.md](./ENRICHED_feats_pilot.md)
18. [ENRICHED_species_background_traits_pilot.md](./ENRICHED_species_background_traits_pilot.md)
19. [ENRICHED_classes_features_pilot.md](./ENRICHED_classes_features_pilot.md)
20. [SYNTHESIS_extension_surface_pressure_spells_items.md](./SYNTHESIS_extension_surface_pressure_spells_items.md)
21. [SYNTHESIS_extension_surface_pressure_feats_traits.md](./SYNTHESIS_extension_surface_pressure_feats_traits.md)
22. [SYNTHESIS_extension_surface_pressure_classes.md](./SYNTHESIS_extension_surface_pressure_classes.md)
23. [SYNTHESIS_cross_family_pressure_matrix.md](./SYNTHESIS_cross_family_pressure_matrix.md)
24. [GLOSSARY_DELTA_REVIEW.md](./GLOSSARY_DELTA_REVIEW.md)
25. [CANDIDATE_closed_extension_surface_v1.md](./CANDIDATE_closed_extension_surface_v1.md)
26. [STRESS_TEST_closed_extension_surface_v1_spells.md](./STRESS_TEST_closed_extension_surface_v1_spells.md)
27. [STRESS_TEST_closed_extension_surface_v1_items_classes.md](./STRESS_TEST_closed_extension_surface_v1_items_classes.md)
28. [DECISION_activation_vs_triggered_reaction.md](./DECISION_activation_vs_triggered_reaction.md)
29. [RESET_foundation_srd_base_phb_extension.md](./RESET_foundation_srd_base_phb_extension.md)
30. [TAXONOMY_atoms_graph_v0.md](./TAXONOMY_atoms_graph_v0.md)
31. [spell-validation/ROUND_1_synthesis.md](./spell-validation/ROUND_1_synthesis.md)
32. [TAXONOMY_atoms_graph_v1.md](./TAXONOMY_atoms_graph_v1.md)
33. [spell-validation/ROUND_2_synthesis.md](./spell-validation/ROUND_2_synthesis.md)
34. [TAXONOMY_atoms_graph_v2.md](./TAXONOMY_atoms_graph_v2.md)
35. [TAXONOMY_graph_representation_v0.md](./TAXONOMY_graph_representation_v0.md)
36. [SPELL_VALIDATION_matrix_v0.md](./SPELL_VALIDATION_matrix_v0.md)
37. [spell-validation/ROUND_3_synthesis.md](./spell-validation/ROUND_3_synthesis.md)
38. [ITEM_VALIDATION_matrix_v0.md](./ITEM_VALIDATION_matrix_v0.md)
39. [item-validation/ROUND_1_synthesis.md](./item-validation/ROUND_1_synthesis.md)
40. [ITEM_VALIDATION_matrix_v1_edge_items.md](./ITEM_VALIDATION_matrix_v1_edge_items.md)
41. [item-validation/ROUND_2_synthesis.md](./item-validation/ROUND_2_synthesis.md)
42. [MASTERY_VALIDATION_matrix_v0.md](./MASTERY_VALIDATION_matrix_v0.md)
43. [mastery-validation/ROUND_1_synthesis.md](./mastery-validation/ROUND_1_synthesis.md)
44. [FEAT_VALIDATION_matrix_v0.md](./FEAT_VALIDATION_matrix_v0.md)
45. [feat-validation/ROUND_1_synthesis.md](./feat-validation/ROUND_1_synthesis.md)
46. [TAXONOMY_atoms_graph_v3.md](./TAXONOMY_atoms_graph_v3.md)
47. [CLASS_FEATURE_VALIDATION_matrix_v0.md](./CLASS_FEATURE_VALIDATION_matrix_v0.md)
48. [class-feature-validation/ROUND_1_synthesis.md](./class-feature-validation/ROUND_1_synthesis.md)
49. [SPECIES_BACKGROUND_VALIDATION_matrix_v0.md](./SPECIES_BACKGROUND_VALIDATION_matrix_v0.md)
50. [species-background-validation/ROUND_1_synthesis.md](./species-background-validation/ROUND_1_synthesis.md)
51. [ITEM_PROPERTY_VALIDATION_matrix_v0.md](./ITEM_PROPERTY_VALIDATION_matrix_v0.md)
52. [item-property-validation/ROUND_1.md](./item-property-validation/ROUND_1.md)
53. [TAXONOMY_atoms_graph_v4.md](./TAXONOMY_atoms_graph_v4.md)
54. [TAXONOMY_graph_representation_v1.md](./TAXONOMY_graph_representation_v1.md)
55. [COMPATIBILITY_v4_certification.md](./COMPATIBILITY_v4_certification.md)
56. [RESEARCH_capstone.md](./RESEARCH_capstone.md)
57. [PLAN_closed_extension_surface_implementation.md](./PLAN_closed_extension_surface_implementation.md)
58. [WORKFLOW_STAGE_CANDIDATES.md](./WORKFLOW_STAGE_CANDIDATES.md)
59. [LEARN_item_feature_scoped_runtime_payloads.md](../LEARN_item_feature_scoped_runtime_payloads.md)
60. [RESEARCH_foundry_effect_staging.md](../RESEARCH_foundry_effect_staging.md)
61. [LEARN_explicit_effect_phase_ownership.md](../LEARN_explicit_effect_phase_ownership.md)
62. [LEARN_closed_mechanic_vocabularies.md](../LEARN_closed_mechanic_vocabularies.md)
63. [LEARN_hard_provenance_package_boundaries.md](../LEARN_hard_provenance_package_boundaries.md)
