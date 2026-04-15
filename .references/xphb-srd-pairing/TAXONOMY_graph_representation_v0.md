# Taxonomy Graph Representation v0

Purpose:

- turn the current atom inventory (`TAXONOMY_atoms_graph_v2.md`, with `v3` additions pending absorption) from prose inventory into a more explicit graph/tag representation;
- make it easier to inspect actual node kinds, edge kinds, and reusable subgraphs;
- prepare the taxonomy for broader validation without jumping to runtime schema design.

This note is still research, not engine design.
It does **not** claim that the graph is final.

Relation to `TAXONOMY_atoms_graph_v3.md`: the inventory tables below reflect the `v2` node/edge set. The `v3` additions (`grant_sense`, `grant_proficiency`, `grant_spell_access`, `grant_resistance`, `bypass_resistance`, `initiative_window`, `post_action_window`, `refund`, `refunds`, and the typed `modify_roll_*` split) are authoritative for atom names going forward; this representation note will be refreshed to `v1` when the next validation stream (class features) exercises them end-to-end.

## 1. Graph Model

The current working shape is:

- a rule unit roots a graph;
- the graph is made of typed nodes;
- typed directed edges connect those nodes;
- a unit may instantiate reusable subgraphs instead of inventing one-off families.

Working categories:

- `source`
- `procedure`
- `attachment`
- `window`
- `resolution`
- `lifecycle`
- `resource`
- `scaling`
- `effect`

## 2. Node Kinds

### Source nodes

- `spell_root`
- `feat_root`
- `class_feature_root`
- `subclass_feature_root`
- `species_trait_root`
- `background_trait_root`
- `item_property_root`
- `mastery_root`
- `magic_item_root`

### Procedure nodes

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
- `alert`

### Attachment nodes

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

### Window nodes

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

### Resolution nodes

- `attack_roll`
- `melee_spell_attack`
- `save_gate`
- `repeat_save`
- `ability_check`
- `interrupt_resolution`
- `condition_progression`

### Lifecycle nodes

- `concentrate`
- `persist`
- `expire`
- `dismiss`
- `complete`
- `break`
- `self_break`
- `return_on_end`
- `replace_on_recast`

### Resource nodes

- `spell_slot`
- `charge`
- `use_count`
- `attunement_slot`

### Scaling nodes

- `scale_target_count`
- `scale_numeric_bonus`
- `scale_damage`

### Effect nodes

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

## 3. Edge Kinds

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

## 4. Minimal Record Shape

Each graphable unit can be recorded in this form:

```json
{
  "unit": "Shield",
  "root": "spell_root",
  "nodes": [
    {"id": "n1", "kind": "respond"},
    {"id": "n2", "kind": "reaction_window"},
    {"id": "n3", "kind": "prepare"},
    {"id": "n4", "kind": "prompt"},
    {"id": "n5", "kind": "commit"},
    {"id": "n6", "kind": "interrupt_resolution"},
    {"id": "n7", "kind": "modify_ac"},
    {"id": "n8", "kind": "negate_named_effect"}
  ],
  "edges": [
    {"from": "spell_root", "type": "roots", "to": "n1"},
    {"from": "n1", "type": "opens_window", "to": "n2"},
    {"from": "n1", "type": "prepares", "to": "n3"},
    {"from": "n3", "type": "prompts", "to": "n4"},
    {"from": "n4", "type": "commits", "to": "n5"},
    {"from": "n5", "type": "grants", "to": "n6"},
    {"from": "n5", "type": "grants", "to": "n7"},
    {"from": "n5", "type": "grants", "to": "n8"}
  ]
}
```

That shape is illustrative only.
It is not yet the repo runtime contract.

## 5. Reusable Subgraphs

### A. Prepare / Prompt / Commit

Use when a rule exposes:

- a legal response window;
- a real user choice;
- state change only after commitment.

Current pressure cases:

- `Shield`
- potentially other reaction spells or item-triggered responses

### B. Store / Release

Use when a unit:

- captures a payload now;
- releases it later;
- maintains occupancy/capacity in between.

Current pressure cases:

- `Glyph of Warding`
- `Ring of Spell Storing`

### C. Attunement Lifecycle

Use when a unit:

- binds item and creature;
- unlocks properties only while bound;
- consumes attunement capacity;
- has explicit cleanup / end conditions.

Current pressure cases:

- PHB magic-item procedures
- attunement-required magic items

### D. Persistent Proxy

Use when a unit:

- creates a continuing object-like attacker or effect carrier;
- allows later command/use loops;
- cleans up on expiry or break.

Current pressure cases:

- `Spiritual Weapon`
- likely some magic items and features later

### E. Mark / Transfer

Use when a unit:

- binds later effects to a marked target;
- allows movement of that mark after completion events.

Current pressure cases:

- `Hunter's Mark`

### F. Passive Projection

Use when a worn or held unit:

- continuously projects an effect while the gate holds;
- may be suppressed by incoming events or state conditions;
- may later restore automatically;
- may optionally rewrite incoming targeting or outcome instead of merely blocking it.

Current pressure cases:

- `Cloak of Displacement`
- `Shield of Missile Attraction`
- `Amulet of Proof against Detection and Location`
- `Ring of Spell Turning`
- `Mantle of Spell Resistance`

### G. On-Hit Rider

Use when a unit:

- attaches to the resolution of an `attack_roll`;
- opens an `on_hit_window` or `on_miss_window` on that resolution;
- grants one or more effect atoms targeting the attack's target;
- optionally persists the granted effect until a later calendar boundary;
- optionally imposes a per-turn or per-unit use fence.

This subgraph is distinct from `Prepare / Prompt / Commit`: on-hit riders do not require resource decision surfaces or reaction-window dry-runs. The rider fires as part of the attack resolution when the trigger outcome is satisfied.

Current pressure cases:

- `Push`
- `Sap`
- `Slow`
- `Vex`
- `Graze` (on-miss variant)
- `Topple` (rider opens a `save_gate` with attack-rooted DC)
- `Cleave` (rider is itself a nested `attack_roll`)
- `Grappler` (feat; on-hit rider applies `Grappled` condition)
- `Savage Attacker` (feat; on-hit rider rerolls damage dice with keep-higher)
- `Boon of Irresistible Offense` (feat; on-crit rider adds extra damage)
- `Boon of Combat Prowess` (feat; on-miss rewrite)

### H. Cross-Rule Composition

Use when a unit:

- does not produce a fresh effect;
- modifies another named rule's window, damage, or resource outcome instead;
- is meaningful only with the referenced other rule present.

Current pressure cases:

- `Nick` (mastery; reassigns the window of `Light`'s extra attack from `bonus_action_window` to `action_window`);
- `Two-Weapon Fighting` (feat; modifies the damage of `Light`'s extra attack);
- `Great Weapon Fighting` (feat; modifies damage dice for attacks made with `Two-Handed` or `Versatile` weapons held in two hands).

Cross-rule composition uses existing `replace` / `replaces` / `modifies` atoms; naming the pattern is about discoverability, not a new atom family.

### I. Relation-Scoped Effect

Use when a unit:

- applies an effect only while a named relation holds between the owner and another entity;
- typically attaches the scope to a condition like `Grappled by you` or a mark edge.

Current pressure cases:

- `Grappler` (feat; Attack Advantage against creatures Grappled by you; Fast Wrestler for movement near such creatures);
- `Hunter's Mark` (spell; bonus damage against marked target);
- future: bardic inspiration scopes, sentinel-style scopes.

Relation-scoped effects use existing `attaches_to` and condition / mark atoms; naming the pattern ensures the scope is an attribute of the attachment, not a wrapped target.

### J. Cross-Actor Roll Observation

Use when a unit:

- triggers on a d20 roll made by a different creature than the owner;
- typically scoped by distance or line of sight.

Current pressure case:

- `Boon of Fate` (feat; triggers on any d20 test by self or another creature within 60 feet).

Cross-actor roll observation uses existing `respond` + `post_roll_window` with a wider attachment; naming the pattern reminds future readers that post-roll windows are not inherently self-scoped.

### K. Environment-State Gate

Use when a unit:

- gates its benefits on an environmental state (lighting, terrain, weather) rather than on a wielded item or a creature condition.

Current pressure case:

- `Boon of the Night Spirit` (feat; benefits gated on `Dim Light` or `Darkness`).

Environment-state gates use existing `attaches_to` with the environment as the attachment point; naming the pattern distinguishes "worn-state gate" from "environment-state gate."

### L. Disjoint Reset Cadence

Use when a unit:

- resets on any of several alternative boundaries joined by OR, not on a single named boundary.

Current pressure case:

- `Boon of Fate` (feat; resets at initiative OR short rest OR long rest, whichever happens first).

Disjoint reset cadence uses existing `persists_until` with multiple boundaries; naming the pattern makes the OR-composition explicit for readers.

### M. Pool With Options Menu

Use when a unit:

- owns a single scalar resource pool (`use_count` quantity);
- allows that pool to be spent on any of several named options;
- each option may have a fixed or variable cost;
- each option has its own activation subgraph (window, effect, gating).

This pattern composes from existing atoms (`use_count`, `choose`, `activate`, plus per-option subgraphs) and does not require a new atom.

Current pressure cases:

- `Monk's Focus` (Focus Points fund Flurry of Blows, Patient Defense, Step of the Wind, Stunning Strike, Deflect Attacks redirect, Superior Defense, etc.);
- `Cunning Strike` (Sneak Attack dice themselves fund Poison, Trip, Withdraw, Daze, Knock Out effects);
- `Lay On Hands` (HP pool funds either healing by any amount up to pool remaining, or removal of Poisoned at fixed 5-HP cost);
- future likely: Channel Divinity, Paladin smite menus, sorcerer metamagic, warlock mystic arcanum.

### N. Cross-Rule Rewrite

Use when a unit:

- rewrites the calculation or count of another named rule rather than producing a fresh effect;
- is meaningful only with the referenced rule present.

This is the same structural pattern as subgraph `H. Cross-Rule Composition`; the distinction here is that the rewrite targets a calculation or count rather than a window or a damage modification. Kept as a named sibling of H for discoverability.

Current pressure cases:

- `Unarmored Defense` (rewrites baseline AC formula from `10 + Dex` to a class-specific formula);
- `Extra Attack` (rewrites the Attack action to produce multiple attack rolls);
- `Evasion` (rewrites the Dex-save-for-half outcome table from `success=half, fail=full` to `success=0, fail=half`);
- `Nick` (mastery; rewrites the window of `Light`'s extra attack — cross-listed with H).

### O. Conditional Payment After Resolution

Use when a unit:

- fires a reaction that partially resolves automatically;
- allows the player to decide whether to spend additional resource only after seeing the partial resolution outcome.

Current pressure case:

- `Deflect Attacks` (Monk; reduces damage automatically on reaction; if reduced to 0, optionally pay Focus Point to redirect as damage to another creature).

Conditional payment after resolution uses existing `respond` + `branches_on_completion` + optional `consumes` on the post-resolution branch; naming the pattern flags that resource decisions can be gated on partial outcomes.

### P. Usage-Count-Parameterized DC

Use when a unit:

- computes its save DC (or similar gate) from its own usage counter;
- DC escalates with each use, often resetting on rest.

Current pressure case:

- `Relentless Rage` (Barbarian; DC 10 + 5 per prior use this rest).

Usage-count-parameterized DC uses `use_count` (for the counter) and a computed DC at save-gate evaluation time; naming the pattern reminds readers that resolution atoms can have state-dependent parameters.

### Q. Extend-By-Activity Duration

Use when a unit:

- has a base duration that ends at a specific boundary (e.g., end of next turn);
- can be extended by performing any of a set of qualifying activities during that base duration;
- has an overall hard cap (e.g., 10 minutes).

Current pressure case:

- `Rage` (Barbarian; ends at end of next turn, extended by attack roll OR forcing a save OR bonus-action extend, capped at 10 minutes).

Extend-by-activity duration uses existing `persist` + `expire` + multiple trigger-driven `persists_until` renewals; naming the pattern ensures durations that re-anchor on activity are distinguishable from static-duration effects.

### R. Scope-First Nested Selection

Use when a unit:

- requires the owner to make an outer selection that sets a scope (a sublist, a collection, a tier, a category);
- then requires further selections inside that scope;
- locks the outer selection for the unit's lifetime (or for the current authoring instance) so later choices cannot re-scope;
- optionally requires a *different* outer selection on repeat application of the unit.

Current pressure cases:

- `Magic Initiate` (feat; pick one of Cleric / Druid / Wizard list, then pick 2 cantrips + 1 level-1 spell from that list, level-up swap stays within the list, repeat feat requires a different list);
- `Wizard Spellcasting` (class; learned-in-spellbook is the outer scope, prepared-from-spellbook is the inner selection);
- likely future cases: Druid Wild Shape (CR cap scope, beast selection inside), any class spellcasting where the class list is the scope and daily prep is the inner selection.

Scope-first nested selection uses existing `choose` chained with an earlier scope-setting `choose`; naming the pattern makes the lock-in and mutual-exclusivity semantics explicit for readers and distinguishes it from flat `choose` menus.

## 6. Example Subgraphs

### `Shield`

- `spell_root`
  - `roots` -> `respond`
  - `opens_window` -> `reaction_window`
  - `prepares` -> `prepare`
  - `prompts` -> `prompt`
  - `commits` -> `commit`
  - `grants` -> `interrupt_resolution`
  - `grants` -> `modify_ac`
  - `grants` -> `negate_named_effect`

This is the clearest current pressure for a dry-run decision boundary.

### `Ring of Spell Storing`

- `magic_item_root`
  - `requires` -> `attune`
  - `attaches_to` -> `item`
  - `stores` -> `stored_spell`
  - `consumes` -> `spell_slot`
  - `grants` -> `release`
  - `releases` -> `stored_spell`

This is the clearest current item-side pressure for:

- item-owned stored spell capacity;
- separation between storing and later release;
- original-caster metadata remaining attached to the stored spell.

### `Attunement`

- `magic_item_root`
  - `requires` -> `attune`
  - `opens_window` -> `rest_window`
  - `consumes` -> `attunement_slot`
  - `persists_until` -> `expire`
  - `branches_on_completion` -> `complete`

This is the clearest current pressure for item-local capability unlock and cleanup.

### Passive Worn/Held Defense

- `magic_item_root`
  - `requires` -> `attune`
  - `attaches_to` -> `item`
  - `grants` -> continuous effect node such as `modify_roll` or `block_targeting`
  - `suppresses` -> conditional shutdown
  - `persists_until` -> restore boundary such as `turn_start_window` or wear/hold end
  - optional `replaces` / `transfers_to` -> target rewrite

This is the clearest current item-side pressure for:

- persistent worn/held projections;
- suppression/restoration without a resource pool;
- rewriting incoming target or outcome rather than only denying it.

### `Sap`

- `mastery_root`
  - `roots` -> `attack_roll`
  - `opens_window` -> `on_hit_window`
  - `attaches_to` -> `target`
  - `grants` -> `modify_roll` (disadvantage on target's next attack roll)
  - `persists_until` -> `turn_start_window` on attacker, or first consumed trigger event

This is the clearest current mastery-side pressure for:

- on-hit rider subgraph without resource cost;
- advantage/disadvantage typing on `modify_roll`;
- first-of-two-events rider expiry composition.

### `Topple`

- `mastery_root`
  - `roots` -> `attack_roll`
  - `opens_window` -> `on_hit_window`
  - `attaches_to` -> `target`
  - `grants` -> `save_gate` (Constitution save, attack-rooted DC)
  - `branches_on_save` -> `apply_condition(Prone)` on failure

This is the clearest current mastery-side pressure for:

- on-hit rider that opens its own save resolution;
- attack-rooted DC formula rather than caster-rooted;
- asymmetric save branches where only the failure side produces an effect.

### `Cleave`

- `mastery_root`
  - `roots` -> `attack_roll` (first)
  - `opens_window` -> `on_hit_window`
  - `grants` -> nested `attack_roll` (second)
  - the nested attack reuses `attaches_to(target)` toward a separate creature within 5 feet of the first target
  - `consumes` -> `use_count`
  - `persists_until` -> `turn_start_window` on attacker

This is the clearest current mastery-side pressure for:

- rider-as-nested-attack composition;
- scoped damage-modifier suppression on the nested attack;
- per-turn use fence validated alongside `Nick`.

## 7. Current Research Use

This representation is for:

- validation;
- comparison;
- finding missing subgraphs or overloaded edges.

It is not yet for:

- runtime serialization;
- UI contracts;
- XState machine wiring;
- Quint projection.

## 8. Immediate Next Use

The next honest use of this graph representation is:

1. validate it against actual magic-item procedures and concrete magic items;
2. check whether attunement, stored spells, charges, and item-owned casting pressure new nodes or only better subgraph composition;
3. check whether passive worn/held effects are best modeled as a reusable subgraph rather than a new family;
4. check whether weapon masteries pressure a separate on-hit rider subgraph (they do, see subgraph G);
5. continue widening validation into feats and class features before deciding whether any of the mastery-pass residue pressures justify a `v3` draft;
6. keep schema work paused until that broader validation is done.
