# Taxonomy: Atoms Graph v2

Purpose:

- revise `v1` after the second validation round;
- keep the gains from round 2;
- add only the narrower atoms and relations still clearly forced by the 20-spell sample.

## Architecture Reminder

Read this file under the repo boundary from `ARCHITECTURE.md`:

- the core models mechanical rules with deterministic outcomes;
- DM rulings, agenda decisions, notification surfaces, and other caller-owned facts are **not** core-mechanics atoms.

So every atom here must justify itself as a reusable mechanics concern:

- owned state
- reusable transition shape
- deterministic trigger/evaluation boundary
- deterministic effect / cleanup / projection boundary

If a candidate is only:

- a wording distinction;
- a communication label;
- a narrative description;
- a UI-facing summary;

then it should be demoted, removed, or kept outside the core atom inventory.

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
- `condition_progression`

## 6. Lifecycle Atoms

- `concentrate`
- `persist`
- `expire`
- `dismiss`
- `complete`
- `break`
- `self_break`
- `return_on_end`
- `replace_on_recast`

## 7. Resource Atoms

- `spell_slot`
- `charge`
- `use_count`
- `attunement_slot`

## 8. Scaling Atoms

- `scale_target_count`
- `scale_numeric_bonus`
- `scale_damage`

## 9. Effect Atoms

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
- `negate_named_effect`
- `deny_opportunity_attack`
- `create_companion`
- `command_companion`
- `telepathic_link`
- `deliver_touch_spell`
- `create_object`
- `create_attack_proxy`
- `mark_target`
- `transfer_mark`
- `alter_item_kind`
- `fall_on_end`

## 10. Relation Types

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
- `returns_to`

## 11. Mermaid Views

### A. Taxonomy Overview

```mermaid
flowchart TD
  taxonomy["TAXONOMY_atoms_graph_v2"]

  source["Source Atoms<br/>spell_root<br/>feat_root<br/>class_feature_root<br/>subclass_feature_root<br/>species_trait_root<br/>background_trait_root<br/>item_property_root<br/>mastery_root<br/>magic_item_root"]
  procedure["Procedure Atoms<br/>activate<br/>respond<br/>prepare<br/>prompt<br/>commit<br/>choose<br/>grant<br/>replace<br/>store<br/>release<br/>suppress<br/>restore<br/>attune"]
  attachment["Attachment Atoms<br/>self<br/>target<br/>area<br/>object<br/>location<br/>weapon<br/>item<br/>companion<br/>stored_spell<br/>attack_proxy<br/>mark"]
  window["Window Atoms<br/>action_window<br/>bonus_action_window<br/>reaction_window<br/>spell_cast_window<br/>turn_start_window<br/>turn_end_window<br/>on_hit_window<br/>on_miss_window<br/>post_roll_window<br/>duration_window<br/>rest_window"]
  resolution["Resolution Atoms<br/>attack_roll<br/>melee_spell_attack<br/>save_gate<br/>repeat_save<br/>ability_check<br/>interrupt_resolution<br/>condition_progression"]
  lifecycle["Lifecycle Atoms<br/>concentrate<br/>persist<br/>expire<br/>dismiss<br/>complete<br/>break<br/>self_break<br/>return_on_end<br/>replace_on_recast"]
  resource["Resource Atoms<br/>spell_slot<br/>charge<br/>use_count<br/>attunement_slot"]
  scaling["Scaling Atoms<br/>scale_target_count<br/>scale_numeric_bonus<br/>scale_damage"]
  effect["Effect Atoms<br/>damage<br/>heal<br/>modify_max_hp<br/>modify_ac<br/>modify_roll<br/>modify_speed<br/>modify_range<br/>grant_hover<br/>grant_extra_action<br/>restrict_action_set<br/>apply_condition<br/>remove_condition<br/>move<br/>force_move<br/>transport_exile<br/>block_targeting<br/>block_travel<br/>negate_named_effect<br/>deny_opportunity_attack<br/>create_companion<br/>command_companion<br/>telepathic_link<br/>deliver_touch_spell<br/>create_object<br/>create_attack_proxy<br/>mark_target<br/>transfer_mark<br/>alter_item_kind<br/>fall_on_end"]

  taxonomy --> source
  taxonomy --> procedure
  taxonomy --> attachment
  taxonomy --> window
  taxonomy --> resolution
  taxonomy --> lifecycle
  taxonomy --> resource
  taxonomy --> scaling
  taxonomy --> effect

  source -->|"roots"| procedure
  procedure -->|"opens_window"| window
  procedure -->|"attaches_to"| attachment
  procedure -->|"requires / consumes"| resource
  procedure -->|"branches_on_save"| resolution
  procedure -->|"grants / modifies / replaces"| effect
  procedure -->|"persists_until / branches_on_completion"| lifecycle
  resource -->|"parameterizes"| scaling
  scaling -->|"refines"| effect
  lifecycle -->|"ends / restores / returns"| effect
```

### B. Common Pressure Patterns

```mermaid
flowchart LR
  shield["Shield / reaction items"]
  store["Glyph of Warding / Ring of Spell Storing"]
  attune["Attunement items"]
  passive["Passive worn/held items"]
  mark["Hunter's Mark"]
  proxy["Spiritual Weapon / proxy items"]

  shield --> respond["respond"]
  respond --> rwin["reaction_window"]
  respond --> prepare["prepare"]
  prepare --> prompt["prompt"]
  prompt --> commit["commit"]
  commit --> ires["interrupt_resolution"]
  commit --> nac["negate_named_effect"]
  commit --> mac["modify_ac"]

  store --> sto["store"]
  sto --> stored["stored_spell"]
  sto --> slot["spell_slot"]
  stored --> rel["release"]

  attune --> atn["attune"]
  atn --> rest["rest_window"]
  atn --> aslot["attunement_slot"]
  atn --> persist["persist"]
  persist --> expire["expire"]

  passive --> item["item"]
  item --> eff["continuous effect"]
  eff --> suppress["suppress"]
  suppress --> restore["restore"]
  eff --> rewrite["optional target rewrite"]

  mark --> markNode["mark"]
  markNode --> markTarget["mark_target"]
  markTarget --> transfer["transfer_mark"]

  proxy --> proxyNode["attack_proxy"]
  proxyNode --> create["create_attack_proxy"]
  create --> ba["bonus_action_window"]
```

## 12. Current Working Reads

### A. Legality is still emergent

No round so far has justified restoring a standalone legality bucket.

### A1. Architecture bar over wording pressure

This file is a working inventory, not a sanctified ontology.

Any candidate that is only an outcome/notification label rather than an owned mechanical structure should stay out of the core inventory.

### B. Alarm-like triggers and storage wards are explicitly separated

- `Alarm` pressures anchored trigger/evaluation/outcome structure
- `Glyph of Warding` pressures `store` / `release`

### C. Scaling must stay typed

Round 2 showed that slot scaling is not one phenomenon.

At minimum the taxonomy must distinguish:

- target-count scaling
- numeric-bonus scaling
- damage scaling

### D. Outcome typing matters

Spells like `Banishment` show that:

- transport,
- persistence,
- return,
- completion-sensitive branch
must not be compressed into one vague completion relation.

### E. Item-side ownership survived first widening

The first item validation pass did not force a new top-level node or edge family.

What it strengthened instead was ownership and resource-shape distinctions:

- attunement capacity is creature-side;
- occupancy / wear state is wearer-side;
- charges, daily uses, stored spells, and absorbed spell energy can be item-side;
- item-rooted casting must stay distinct from stored-spell payload ownership.

## 13. Known Remaining Weak Spots

Even `v2` may still be too weak on:

- multi-creature or target-priority selection logic;
- full proxy attack loop semantics;
- exact named-effect negation boundaries beyond the current sample.
- finer item-resource typing:
  - stored payload metadata
  - absorbed spell-energy reservoirs
  - per-spell daily reuse
  - recharge cadence

### Narrowed after mastery Round 1

Exact attack-roll rider composition is no longer the blocker it was before the mastery pass. The mastery round validated that `on_hit_window`, `on_miss_window`, `attack_roll`, `target`, and the relevant effect atoms carry the full 2024 mastery catalog, plus `save_gate` with an attack-rooted DC. What remains after that pass is a handful of narrower observations, recorded here so they are not lost between validation streams:

- `modify_roll` currently carries both numeric bonuses and advantage/disadvantage, which are mechanically distinct; subtype refinement is deferred;
- one-shot rider expiry with mixed terminating conditions (first-of-two-events shape) is legal composition today but is not named as a pattern;
- non-stacking / capped-aggregate effect policy (Slow-style "multiple instances merge, not stack") has no atom today and is expected to recur in conditions, buffs, and concentration handling;
- scoped damage-modifier suppression (Cleave's "don't add your ability modifier") and scaling-lock constraints (Graze's "can be increased only by increasing the ability modifier") both read as subtype or policy parameters on existing effect atoms rather than new atoms;
- save DC source variation (caster-rooted vs attack-rooted vs item-rooted) is a typed property of the initiating resolution, not a missing atom;
- cross-rule window reassignment (Nick rewriting Light's bonus-action extra attack into the action) is a composition pattern that uses existing `replace` / `replaces` atoms but is not yet visualized.

None of these justify a `v3` draft on their own. They are grouped here as a single residue so that future widening passes (feats, class features) can confirm whether any of them repeats strongly enough to become a first-class atom.
