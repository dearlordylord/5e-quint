# Taxonomy: Atoms Graph v1

Purpose:

- revise `v0` after the first 20-spell validation round;
- keep the taxonomy graphable and lower-level;
- remove atoms that failed and add atoms the round-1 spell sample clearly forced.

Status:

- `v1` is still provisional;
- it is only better than `v0` if round 2 reduces prose leakage materially.

## 1. Source Atoms

- `spell_root`
- `feat_root`
- `class_feature_root`
- `subclass_feature_root`
- `species_trait_root`
- `background_trait_root`
- `item_property_root`
- `mastery_root`
- `magic_item_root`

## 2. Procedure Atoms

- `activate`
- `respond`
- `prepare`
- `prompt`
- `commit`
- `choose`
- `grant`
- `replace`
- `store`
- `release`
- `suppress`
- `restore`
- `attune`

## 3. Attachment Atoms

- `self`
- `target`
- `area`
- `object`
- `location`
- `weapon`
- `item`
- `companion`
- `stored_spell`
- `attack_proxy`
- `mark`

## 4. Window Atoms

- `action_window`
- `bonus_action_window`
- `reaction_window`
- `spell_cast_window`
- `turn_start_window`
- `turn_end_window`
- `on_hit_window`
- `on_miss_window`
- `post_roll_window`
- `duration_window`
- `rest_window`

## 5. Resolution Atoms

- `attack_roll`
- `melee_spell_attack`
- `save_gate`
- `repeat_save`
- `ability_check`
- `interrupt_resolution`

## 6. Lifecycle Atoms

- `concentrate`
- `persist`
- `expire`
- `dismiss`
- `complete`
- `break`
- `self_break`

## 7. Resource Atoms

- `spell_slot`
- `charge`
- `use_count`
- `attunement_slot`

## 8. Effect Atoms

- `damage`
- `heal`
- `modify_max_hp`
- `modify_ac`
- `modify_roll`
- `modify_speed`
- `modify_range`
- `grant_hover`
- `grant_extra_action`
- `restrict_action_set`
- `apply_condition`
- `remove_condition`
- `move`
- `force_move`
- `transport_exile`
- `block_targeting`
- `block_travel`
- `create_companion`
- `command_companion`
- `telepathic_link`
- `deliver_touch_spell`
- `create_object`
- `create_attack_proxy`
- `mark_target`
- `transfer_mark`
- `alter_item_kind`

## 9. Relation Types

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
- `branches_on_save`
- `prepares`
- `prompts`
- `commits`
- `transfers_to`

## 10. Current Working Interpretations

### A. Legality remains emergent

Round 1 did not justify promoting legality back to a top-level bucket.

Current working read:

- legality mostly emerges from `requires`, `opens_window`, `attaches_to`, `consumes`, `prepare`, `prompt`, `commit`, and `attune`.

### B. `Shield` still pressures prepare / prompt / commit

Current working read:

- `Shield` is better viewed as:
  - a prepared response opportunity;
  - a user-facing promptable choice;
  - a committed defensive effect once chosen.

That may later matter beyond spell taxonomy, especially for player-facing runtime design.

### C. Anchored spells are now split conceptually

Current working read:

- some anchored spells are `trigger / alert` structures (`Alarm`);
- some are `store / release` structures (`Glyph of Warding`);
- so anchoring is not itself a single lower-level atom. It is a pattern made from attachment plus one of several procedure shapes.

### D. Companion and proxy behavior are likely compositional

Current working read:

- `Find Familiar` and `Spiritual Weapon` still do not force a top-level family claim;
- but they do force more explicit composition of:
  - creation
  - persistence
  - command or attack-loop behavior
  - dismissal / expiry / transfer behavior

## 11. Known Weak Spots Still To Test

`v1` still may be too weak on:

- save-for-half and other finer save outcomes;
- multi-target counting and target-cap scaling;
- exact handling of projectile negation or named-spell negation in `Shield`;
- action-economy rewrites outside the current spell sample;
- item-rooted spell storage and item-owned spell-slot-like resources.
