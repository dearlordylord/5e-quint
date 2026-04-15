# Candidate: Closed Extension Surface v1

Purpose:

- draft the first candidate closed extension surface derived from the current pairing and synthesis corpus;
- keep the candidate compact, typed, and explicitly provisional;
- separate settled pressure families from still-open encoding choices.

Important rule:

- this file is a derived design artifact, not a new mining pass;
- if it conflicts with the corpus notes, the corpus notes win;
- this candidate should be revised or discarded if later enrichment falsifies it.

Primary inputs:

- [`SYNTHESIS_cross_family_pressure_matrix.md`](./SYNTHESIS_cross_family_pressure_matrix.md)
- [`WORKFLOW_STAGE_CANDIDATES.md`](./WORKFLOW_STAGE_CANDIDATES.md)
- [`GLOSSARY_DELTA_REVIEW.md`](./GLOSSARY_DELTA_REVIEW.md)
- [`LEARN_closed_mechanic_vocabularies.md`](../LEARN_closed_mechanic_vocabularies.md)
- [`LEARN_item_feature_scoped_runtime_payloads.md`](../LEARN_item_feature_scoped_runtime_payloads.md)

## Short Answer

The first viable closed surface looks like:

- source-rooted payload containers;
- a small number of typed operation families;
- explicit timing, cleanup, and reset envelopes;
- typed registries and typed rewrites instead of open scripting.

## Proposed Shape

## 1. Root container

Every contributed mechanic payload should remain attached to a root unit:

- `spell`
- `item-property`
- `mastery`
- `magic-item-procedure`
- `feat`
- `species-trait`
- `background-trait`
- `class-feature`
- `subclass-feature`

Root container responsibilities:

- source-root identity;
- provenance/package identity;
- prerequisite and legality metadata;
- one or more typed payload contributions.

This keeps source identity explicit and avoids flattening all mechanics into anonymous effect atoms.

## 2. Typed payload families

v1 candidate top-level payload families:

- `activation`
  - action-like things a creature can take or that replace named actions
- `triggered_reaction`
  - triggered responses, interrupts, and reactive defenses
- `anchored_trigger`
  - location- or object-anchored delayed-trigger payloads such as wards, runes, and stored release effects
- `ongoing_effect`
  - persistent applied state with explicit ownership and cleanup
- `bound_companion`
  - persistent owned companions or summons with explicit command, link, dismissal, or resummon behavior
- `grant`
  - spell/feat/condition/movement-mode/option grants and linked content
- `choice_registry`
  - typed option menus and constrained repeatable choices
- `replacement`
  - typed swap/retraining/reconfiguration operations
- `rewrite`
  - typed cross-family modifications to existing payload behavior

Reasoning:

- this preserves the stable families the corpus keeps forcing;
- it avoids one giant effect bucket;
- it also avoids exploding into one payload type per feature.

## 3. Shared typed envelopes

These should not be separate payload families. They are shared typed envelopes used by multiple families.

Shared envelopes:

- `timing`
  - `action`
  - `bonus_action`
  - `reaction`
  - `ready_resolution`
  - `on_hit`
  - `on_miss`
  - `post_action`
  - `post_roll`
  - `post_test`
  - `turn_start`
  - `turn_end`
  - `movement_trigger`
  - `rest_completion`
- `resolution`
  - `automatic`
  - `attack`
  - `save`
  - `save_half`
  - `interrupt`
  - `rider_save`
- `reset`
  - `once_per_turn`
  - `start_next_turn`
  - `short_rest`
  - `long_rest`
  - `initiative`
  - `pb_per_long_rest`
  - `table_scaled`
  - `ritual_recharge`
- `cleanup`
  - `concentration_end`
  - `manual_end`
  - `condition_end`
  - `action_end`
  - `turn_boundary`
  - `attunement_end`

## 4. Operation vocabulary inside payloads

Each payload family should contribute only through a closed operation vocabulary.

Candidate operation families:

- `damage`
- `healing`
- `condition_apply`
- `condition_remove`
- `movement`
- `forced_movement`
- `ac_modifier`
- `roll_modifier`
- `advantage_state`
- `resource_spend`
- `resource_restore`
- `slot_restore`
- `grant_spell`
- `grant_feat`
- `grant_option`
- `grant_mode`
- `transform`
- `create_object`
- `summon`
- `attunement_cap_change`
- `charge_preservation`
- `mastery_substitution`
- `max_hp_modifier`
- `suppression`
- `targeting_block`
- `traversal_block`

This should fail closed: unknown operation families are not valid content.

## 5. Registries and replacements

v1 should treat registries and replacement as first-class because later-family evidence was strong.

`choice_registry` should cover:

- invocation-like menus;
- Channel Divinity / Cunning Strike style option systems;
- lineage / ancestry / repeatable constrained choice families.

`replacement` should cover:

- replace prepared spell;
- replace invocation;
- replace mastery choice;
- replace cantrip;
- replace feat-granted or class-granted typed picks where rules allow it.

## 6. Rewrites stay typed by target family

The current evidence favors typed rewrites over one generic rewrite language.

v1 target families:

- `attack`
- `spell`
- `item`
- `mastery`
- `resource`

Reason:

- class features repeatedly rewrite one of those families directly;
- a smaller shared rewrite language may still emerge later, but the corpus pressure currently points to keeping target-family visibility explicit.

## 7. What should stay out of v1

Do not include in v1:

- open scripting;
- arbitrary field mutation;
- free-form hook names;
- creature-global boolean soups standing in for source-scoped payloads;
- provenance mixed into runtime operation keys.

## Worked reading on representative examples

- `Shield`
  - root: `spell`
  - payload family: `triggered_reaction`
  - timing: `reaction`
  - operation: defensive modifier / ongoing effect
  - cleanup: `start_next_turn`

- `Magic Initiate`
  - root: `feat`
  - payload family: `grant`
  - operations: `grant_spell`, `grant_option`
  - reset: `long_rest`
  - replacement: level-up constrained replacement

- `Rogue > Cunning Strike`
  - root: `class-feature`
  - payload family: `choice_registry`
  - timing: `on_hit`
  - resolution: `rider_save` for some options
  - operation: typed rider options with die-cost resource spend

- `Rogue > Thief > Use Magic Device`
  - root: `subclass-feature`
  - payload family: `rewrite`
  - target families: `item`, `spell`
  - operations: `attunement_cap_change`, `charge_preservation`

- `Reach`
  - root: `item-property`
  - payload family: `rewrite`
  - target family: `attack`
  - operation: reach modification for attack and opportunity-attack determination

- `Alarm`
  - root: `spell`
  - payload family: `anchored_trigger`
  - timing: delayed trigger after cast
  - operation: alert release with exclusions and chosen trigger mode

- `Find Familiar`
  - root: `spell`
  - payload family: `bound_companion`
  - operations: summon/link, telepathic connection, touch-delivery reaction, dismiss/resummon

## What v1 resolves

v1 resolves these choices provisionally:

- one shared closed surface, not one model per family;
- root-scoped payload containers, not anonymous global effects;
- typed payload families plus shared envelopes;
- typed target-family rewrites;
- registries and replacements as first-class surfaces.

## What v1 does not resolve

v1 still leaves these open:

- whether `activation` and `triggered_reaction` should later collapse into one broader action-payload family;
- how many distinct scaling encodings are needed under `reset` or a separate `scaling` envelope;
- whether `ongoing_effect`, `bound_companion`, `transform`, `summon`, and `create_object` should remain separate operations under one payload family or split further;
- whether source-root identity should live only on the root container or also on projected payload links.

## Current Working Recommendation

If later implementation planning starts from this draft, use it as follows:

1. keep root identity and provenance explicit;
2. compile authored content into typed payload families;
3. let runtime consume only closed operation vocabularies;
4. refuse any new rule shape that cannot name:
   - its root container
   - its payload family
   - its timing or trigger
   - its cleanup or reset, if ongoing
   - its typed operation family
