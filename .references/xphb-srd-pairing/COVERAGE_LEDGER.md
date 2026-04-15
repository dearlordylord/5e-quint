# Coverage Ledger

Purpose:

- make family coverage explicit so research does not drift toward only the most interesting domains;
- track which canonical families have Pass 1 inventory, Pass 2 surface synthesis, competitor cross-checks, provenance review, and known blockers;
- keep this as the canonical progress sheet for the pairing workspace.

Update rule:

- every canonical family must have exactly one row in this ledger;
- if a new canonical family is admitted in `DOMAIN_FAMILY_PRECIFICATION.md`, add its row here immediately;
- do not create new family research files without updating this ledger;
- when a family changes status, update this file instead of relying on chat memory.

Status vocabulary:

- `yes`: complete for the current pass
- `partial`: started but incomplete
- `no`: not started
- `blocked`: cannot progress cleanly without a prerequisite extraction step

## Canonical Family Coverage

| Family | Pass 1 inventory | Pass 2 note | Pass 2 enrichment | Competitor cross-check | Provenance/package review | Notes / blockers |
|---|---|---|---|---|---|---|
| `spells` | yes | yes | partial | partial | partial | Pilot enrichment now exists in `ENRICHED_spells_pilot.md`; full-family enrichment still not started. |
| `feats` | yes | yes | partial | partial | partial | Pilot enrichment now exists in `ENRICHED_feats_pilot.md`; full-family enrichment still not started. Closed 2024 SRD feat catalog now has an atom-level validation pass (`FEAT_VALIDATION_matrix_v0.md`, `feat-validation/ROUND_1_synthesis.md`) that promoted accumulated refinement pressure across all four validation streams into `TAXONOMY_atoms_graph.md`. |
| `classes_and_features` | partial | yes | partial | partial | partial | Pilot enrichment now exists in `ENRICHED_classes_features_pilot.md`; a representative feature tranche now lives in `UNITS_classes_and_features.md`. A 16-feature atom-level validation pass now exists (`CLASS_FEATURE_VALIDATION_matrix_v0.md`, `class-feature-validation/ROUND_1_synthesis.md`) confirming `v3` at the top level and flagging typed scaling split as the primary `v4` candidate. Feature-subunit coverage remains shallow overall. |
| `species_and_background_traits` | yes | yes | partial | partial | partial | Pilot enrichment now exists in `ENRICHED_species_background_traits_pilot.md`. Full SRD 5.2.1 origin-side catalog (9 species + 4 backgrounds) now has an atom-level validation pass (`SPECIES_BACKGROUND_VALIDATION_matrix_v0.md`, `species-background-validation/ROUND_1_synthesis.md`) that validated `v3`'s grant atoms and provided the second independent stream for the typed scaling split (Dragonborn Breath Weapon), promoting it to `v4`. |
| `equipment_properties_and_masteries` | yes | yes | partial | partial | partial | Pilot enrichment now exists in `ENRICHED_equipment_magic_items_pilot.md`; broader family enrichment still not started. Mastery side now has a closed 2024-catalog validation pass (`MASTERY_VALIDATION_matrix_v0.md`, `mastery-validation/ROUND_1_synthesis.md`) that confirms `v2` survives and adds an On-Hit Rider subgraph. Item-property side now has a closed 9-property atom-level validation pass (`ITEM_PROPERTY_VALIDATION_matrix_v0.md`, `item-property-validation/ROUND_1.md`) confirming no new atoms forced and anchoring the Cross-Rule Composition / Rewrite subgraphs. |
| `magic_items` | yes | yes | partial | partial | yes | Shared pilot now covers attunement and wear/wield procedures; still no full-family enrichment. |

## Not Yet Canonical Families

These are visible pressure areas but do not yet have canonical family status:

- `actions_and_procedures`
- `conditions_and_statuses`
- `spellcasting_procedures`
- `rests_recovery_and_resources`
- `hazards_and_environment`
- `travel_and_mounts`

Do not create family files for these until they are admitted through `DOMAIN_FAMILY_PRECIFICATION.md`.

## Immediate Gaps

- `classes_and_features` is still the only canonical family whose Pass 1 inventory is intentionally incomplete at the subunit level, and it is now the highest-pressure untouched source root for `v3` validation.
- all canonical families now have at least one pilot enrichment artifact, but none has full-family enrichment yet.
- no canonical family has full-family Pass 2 enrichment yet.
- the older family-by-family pilots were strong enough to justify a closed-surface candidate, but later reset work showed that candidate was ahead of the actual lower-level taxonomy.
- the active gap is now exercising `TAXONOMY_atoms_graph.md` against class features, species/background traits, and item properties to confirm the new atoms hold before resuming schema work.
- the first item-side widening pass now exists and says item pressure strengthens ownership/resource distinctions without forcing a new top-level graph family.
- the second item-side widening pass now exists and says edge items still do not force a new top-level graph family, but they do justify a reusable passive-projection subgraph in the graph representation.
- the mastery-side validation pass now exists and says the closed 2024 mastery set does not force a new top-level graph family, but it does justify a reusable on-hit rider subgraph and narrows the "exact attack-roll rider composition" weak spot into smaller residue observations.
- the feat-side validation pass now exists and says the closed 2024 SRD feat catalog does not force a new top-level graph family, but it accumulates enough atom-level refinement pressure across four streams to justify drafting `TAXONOMY_atoms_graph.md`.
- the class-feature validation pass now exists and says `v3` holds at the top level with second-data-point validation for `refund`, `initiative_window`, `grant_resistance`, and `grant_spell_access`; it flags typed scaling split as the primary `v4` candidate and adds five pattern subgraphs to the graph representation.
- the species and background validation pass now exists and provides the cross-stream data point (Dragonborn Breath Weapon dice-count scaling) that promotes typed scaling split to `v4`; it also anchors the Scope-First Nested Selection pattern with seven independent data points.
- the item-property validation pass now exists and closes out source-root coverage; no new atoms forced, Cross-Rule Composition / Rewrite patterns validated densely.
- `TAXONOMY_atoms_graph.md` is now the current working atom inventory. The research-side taxonomy track is closed.

## Suggested Next Order

1. Keep `RESET_foundation_srd_base_phb_extension.md` as the correction layer for SRD base mechanics, PHB private extension content, and public/private narrative boundaries.
2. Treat `TAXONOMY_atoms_graph.md` as the current working atom inventory.
3. Optionally refresh `TAXONOMY_graph_representation.md` to `v1` with `v4` atom names and consolidated pattern subgraphs.
4. All seven source-root atoms now have atom-level validation passes. No further source-root widening is required.
5. Schema design may resume. The atom-level taxonomy is no longer the blocker; any next choice is a design decision, not a research gap.
6. If later work requires deeper coverage (more spells, subclass features, full item catalogs, non-SRD content), add more rounds without revising `v4` unless a specific structural pressure reappears.
