# Taxonomy: Atoms Graph v0

Purpose:

- replace the overstrong family-language with a lower-level taxonomy pass;
- define graphable atoms and relations that can be tested against real spells;
- state clearly that this is a working taxonomy, not a finished ontology.

Important rule:

- this file is a draft vocabulary for validation;
- any atom or relation that fails repeated spell validation should be revised, merged, or deleted.

## 1. What This Is Not

This is not:

- the final schema;
- a claim that the six current family bundles are wrong;
- a claim that every mechanic can already be encoded cleanly.

It is an attempt to go one level lower and ask:

- what recurring atoms and relations do the rules actually instantiate?

## 2. Candidate Atom Buckets

### Source atoms

- `spell_root`
- `feat_root`
- `class_feature_root`
- `subclass_feature_root`
- `species_trait_root`
- `background_trait_root`
- `item_property_root`
- `mastery_root`
- `magic_item_root`

### Procedure atoms

- `activate`
- `respond`
- `prepare`
- `commit`
- `store`
- `release`
- `choose`
- `replace`
- `grant`
- `suppress`
- `restore`
- `attune`

### Attachment atoms

- `self`
- `target`
- `area`
- `object`
- `location`
- `weapon`
- `item`
- `companion`
- `stored_spell`

### Time / window atoms

- `action_window`
- `bonus_action_window`
- `reaction_window`
- `turn_start_window`
- `turn_end_window`
- `on_hit_window`
- `on_miss_window`
- `post_roll_window`
- `duration_window`
- `rest_window`

### Lifecycle atoms

- `concentrate`
- `dismiss`
- `expire`
- `complete`
- `persist`
- `break`

### Resource atoms

- `spell_slot`
- `charge`
- `use_count`
- `attunement_slot`
- `stored_spell_slot`

### Effect atoms

- `damage`
- `heal`
- `move`
- `force_move`
- `apply_condition`
- `remove_condition`
- `modify_ac`
- `modify_roll`
- `modify_range`
- `modify_max_hp`
- `block_targeting`
- `block_travel`
- `create_companion`
- `create_object`
- `telepathic_link`
- `deliver_touch_spell`

## 3. Candidate Relation Types

- `roots`
- `opens_window`
- `requires`
- `attaches_to`
- `stores`
- `releases`
- `grants`
- `consumes`
- `suppresses`
- `replaces`
- `modifies`
- `persists_until`
- `branches_on_completion`
- `prompts`
- `prepares`
- `commits`

## 4. Important Architectural Guesses To Test

### A. Legality may be emergent

Current working hypothesis:

- ``legality'' may not deserve to be its own atom bucket;
- it may instead emerge from combinations of:
  - `requires`
  - `opens_window`
  - `attaches_to`
  - `consumes`
  - `attune`
  - `prepare` / `commit`

This must be tested, not assumed.

### B. Reactions may imply prepare/commit structure

Current working hypothesis:

- spells like `Shield` may want a two-step interpretation:
  - derive a prepared/reactable option from state;
  - commit it only when the player chooses to use it.

That suggests `prepare`, `prompt`, and `commit` may be more fundamental than the old single bucket `triggered_reaction`.

### C. Anchored spells may be about store/release, not a separate family

Current working hypothesis:

- `Alarm` and `Glyph of Warding` may be better modeled as combinations of:
  - `store`
  - `attaches_to location|object`
  - `release`
  - `stored_spell`
than as an irreducible higher-level family.

### D. Bound companions may be composition, not family

Current working hypothesis:

- `Find Familiar` may be decomposable into:
  - `create_companion`
  - `persist`
  - `telepathic_link`
  - `deliver_touch_spell`
  - `dismiss`
rather than forcing a top-level `bound_companion` family.

## 5. Validation Standard

This taxonomy is only useful if a spell can be described by:

1. root atoms;
2. relation edges;
3. effect/resource/lifecycle atoms;
4. without hiding major behavior in prose residue.

If a spell still requires a large prose escape hatch, the taxonomy is not finished.
