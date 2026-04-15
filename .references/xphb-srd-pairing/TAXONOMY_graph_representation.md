# Taxonomy Graph Representation v1

Purpose:

- refresh `TAXONOMY_graph_representation.md` to reflect `TAXONOMY_atoms_graph.md` atom names end-to-end;
- consolidate all 18 reusable subgraphs (A through R) surfaced across the seven validation streams into a single clean listing;
- keep `v0` as a historical artifact showing earlier atom names and the evolution of the pattern inventory.

This file is still research, not engine design. It does **not** claim that the graph is final. The atom names are those of `v4`, which is the final taxonomy version of the research-side track.

Relation to `TAXONOMY_atoms_graph.md`:

- the node/edge inventory here is a one-to-one mirror of `v4`'s atom sections;
- retired atoms (`stored_spell_slot` from `v0 → v1`, `modify_roll` from `v2 → v3`, `scale_damage` from `v3 → v4`) are not listed here — they only survive as historical labels in earlier files;
- references to retired atoms in older validation artifacts are addressed in `COMPATIBILITY_certification.md`.

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
- `refund`

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
- `initiative_window`
- `post_action_window`
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
- `scale_die_count`
- `scale_die_size`
- `scale_attack_count`

### Effect nodes

- `damage`
- `heal`
- `modify_max_hp`
- `modify_ac`
- `modify_roll_numeric`
- `modify_roll_advantage`
- `modify_roll_reroll`
- `modify_roll_substitute`
- `modify_speed`
- `modify_range`
- `grant_hover`
- `grant_sense`
- `grant_proficiency`
- `grant_spell_access`
- `grant_resistance`
- `bypass_resistance`
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
- `refunds`
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

That shape is illustrative only. It is not yet the repo runtime contract.

## 5. Reusable Subgraphs

Eighteen subgraphs surfaced across the seven validation streams. Each names a recurring composition pattern and points at its strongest pressure cases.

### A. Prepare / Prompt / Commit

Use when a rule exposes:

- a legal response window;
- a real user choice;
- state change only after commitment.

Current pressure cases:

- `Shield` (spell);
- `Ring of Spell Turning` (item);
- `Ring of Evasion` (item);
- `Uncanny Dodge` (class feature);
- `Deflect Attacks` (class feature).

### B. Store / Release

Use when a unit:

- captures a payload now;
- releases it later;
- maintains occupancy/capacity in between.

Current pressure cases:

- `Glyph of Warding` (spell);
- `Ring of Spell Storing` (item);
- `Bag of Holding` (item; physical contents variant);
- `Bardic Inspiration` (class feature; die granted to ally, expended later).

### C. Attunement Lifecycle

Use when a unit:

- binds item and creature;
- unlocks properties only while bound;
- consumes attunement capacity;
- has explicit cleanup / end conditions.

Current pressure cases:

- `Attunement` (item procedure);
- `Wearing and Wielding Items` (item procedure);
- attunement-required magic items.

### D. Persistent Proxy

Use when a unit:

- creates a continuing object-like attacker or effect carrier;
- allows later command/use loops;
- cleans up on expiry or break.

Current pressure cases:

- `Spiritual Weapon` (spell);
- `Find Familiar` (spell; companion variant).

### E. Mark / Transfer

Use when a unit:

- binds later effects to a marked target;
- allows movement of that mark after completion events.

Current pressure cases:

- `Hunter's Mark` (spell).

### F. Passive Projection

Use when a worn or held unit:

- continuously projects an effect while the gate holds;
- may be suppressed by incoming events or state conditions;
- may later restore automatically;
- may optionally rewrite incoming targeting or outcome instead of merely blocking it.

Current pressure cases:

- `Cloak of Displacement` (item);
- `Shield of Missile Attraction` (item);
- `Amulet of Proof against Detection and Location` (item);
- `Ring of Spell Turning` (item);
- `Mantle of Spell Resistance` (item);
- `Danger Sense` (class feature; passive with state-gated suppression);
- `Unarmored Defense` (class feature; AC formula override, see subgraph N).

### G. On-Hit Rider

Use when a unit:

- attaches to the resolution of an `attack_roll`;
- opens an `on_hit_window` or `on_miss_window` on that resolution;
- grants one or more effect atoms targeting the attack's target;
- optionally persists the granted effect until a later calendar boundary;
- optionally imposes a per-turn or per-unit use fence.

Distinct from subgraph A (Prepare / Prompt / Commit): on-hit riders do not require resource decision surfaces or reaction-window dry-runs. The rider fires as part of the attack resolution when the trigger outcome is satisfied.

Current pressure cases:

- `Push`, `Sap`, `Slow`, `Vex` (masteries);
- `Graze` (mastery; on-miss variant);
- `Topple` (mastery; rider opens a `save_gate` with attack-rooted DC);
- `Cleave` (mastery; rider is itself a nested `attack_roll`);
- `Grappler` (feat; on-hit rider applies `Grappled` condition);
- `Savage Attacker` (feat; on-hit rider rerolls damage dice with keep-higher);
- `Boon of Irresistible Offense` (feat; on-crit rider adds extra damage);
- `Boon of Combat Prowess` (feat; on-miss rewrite);
- `Sneak Attack` (class feature; level-scaled dice-count on-hit rider with multi-path gate).

### H. Cross-Rule Composition

Use when a unit:

- does not produce a fresh effect;
- modifies another named rule's window, damage, or resource outcome instead;
- is meaningful only with the referenced other rule present.

Current pressure cases:

- `Nick` (mastery; reassigns the window of `Light`'s extra attack);
- `Two-Weapon Fighting` (feat; modifies the damage of `Light`'s extra attack);
- `Great Weapon Fighting` (feat; modifies damage dice for attacks made with `Two-Handed` or `Versatile` weapons held in two hands);
- `Light`, `Finesse`, `Heavy`, `Thrown`, `Versatile` (item properties; each modifies how core attack rules resolve).

### I. Relation-Scoped Effect

Use when a unit:

- applies an effect only while a named relation holds between the owner and another entity;
- typically attaches the scope to a condition like `Grappled by you` or a mark edge.

Current pressure cases:

- `Grappler` (feat; Attack Advantage against creatures Grappled by you; Fast Wrestler for movement near such creatures);
- `Hunter's Mark` (spell; bonus damage against marked target).

### J. Cross-Actor Roll Observation

Use when a unit:

- triggers on a d20 roll made by a different creature than the owner;
- typically scoped by distance or line of sight.

Current pressure cases:

- `Boon of Fate` (feat; triggers on any d20 test by self or another creature within 60 feet).

### K. Environment-State Gate

Use when a unit:

- gates its benefits on an environmental state (lighting, terrain, weather) rather than on a wielded item or a creature condition.

Current pressure cases:

- `Boon of the Night Spirit` (feat; benefits gated on `Dim Light` or `Darkness`);
- `Stonecunning` (species; Dwarf Tremorsense gated on stone surface).

### L. Disjoint Reset Cadence

Use when a unit:

- resets on any of several alternative boundaries joined by OR, not on a single named boundary.

Current pressure cases:

- `Boon of Fate` (feat; resets at initiative OR short rest OR long rest).

### M. Pool With Options Menu

Use when a unit:

- owns a single scalar resource pool;
- allows that pool to be spent on any of several named options;
- each option may have a fixed or variable cost;
- each option has its own activation subgraph (window, effect, gating).

Current pressure cases:

- `Monk's Focus` (class feature; Focus Points fund Flurry, Patient Defense, Step of the Wind, Stunning Strike, Deflect Attacks redirect);
- `Cunning Strike` (class feature; Sneak Attack dice themselves fund Poison, Trip, Withdraw, Daze, Knock Out);
- `Lay On Hands` (class feature; HP pool funds either healing by any amount or removal of Poisoned at fixed 5-HP cost);
- `Channel Divinity` (class feature; fuel for Divine Spark, Turn Undead, and later options — cross-class pattern);
- `Brutal Strike` (class feature; choose among Forceful Blow, Hamstring Blow, Staggering Blow, Sundering Blow — subset variant).

### N. Cross-Rule Rewrite

Use when a unit:

- rewrites the calculation or count of another named rule rather than producing a fresh effect.

Same structural family as H but specifically targets calculations/counts instead of windows/damage.

Current pressure cases:

- `Unarmored Defense` (class feature; rewrites baseline AC formula);
- `Extra Attack` (class feature; rewrites the Attack action to produce multiple attack rolls);
- `Evasion` (class feature; rewrites the Dex-save-for-half outcome table);
- `Loading` (item property; caps attack count per action regardless of Extra Attack);
- `Trance` (species trait; rewrites long-rest completion from 8 hours to 4);
- `Drow Darkvision` (species lineage; rewrites base Darkvision range);
- `Wood Elf Speed` (species lineage; rewrites base Speed).

### O. Conditional Payment After Resolution

Use when a unit:

- fires a reaction that partially resolves automatically;
- allows the player to decide whether to spend additional resource only after seeing the partial resolution outcome.

Current pressure case:

- `Deflect Attacks` (class feature; reduces damage automatically on reaction; if reduced to 0, optionally pay Focus Point to redirect).

### P. Usage-Count-Parameterized DC

Use when a unit:

- computes its save DC (or similar gate) from its own usage counter;
- DC escalates with each use, often resetting on rest.

Current pressure case:

- `Relentless Rage` (class feature; DC 10 + 5 per prior use this rest).

### Q. Extend-By-Activity Duration

Use when a unit:

- has a base duration that ends at a specific boundary;
- can be extended by performing any of a set of qualifying activities during that base duration;
- has an overall hard cap.

Current pressure case:

- `Rage` (class feature; ends at end of next turn, extended by attack roll OR forcing a save OR bonus-action extend, capped at 10 minutes).

### R. Scope-First Nested Selection

Use when a unit:

- requires the owner to make an outer selection that sets a scope (a sublist, a collection, a tier, a category);
- then requires further selections inside that scope;
- locks the outer selection for the unit's lifetime;
- optionally requires a different outer selection on repeat application.

Current pressure cases:

- `Magic Initiate` (feat; pick Cleric/Druid/Wizard list, then pick cantrips + level-1 spell from that list);
- `Wizard Spellcasting` (class feature; learned-in-spellbook outer scope, prepared-from-spellbook inner selection);
- `Draconic Ancestry` (species; Dragonborn ancestry scopes Breath Weapon damage type and Damage Resistance);
- `Elven Lineage` (species; scopes Darkvision range override, lineage-granted spells);
- `Gnomish Lineage` (species; Forest vs Rock Gnome with heterogeneous inner subgraphs);
- `Fiendish Legacy` (species; Tiefling legacy scopes resistance and spell grants);
- `Giant Ancestry` (species; Goliath ancestry scopes the single granted benefit subgraph);
- `Acolyte` / `Sage` (backgrounds; pre-scoped Magic Initiate — background authors the outer scope).

## 6. Example Subgraphs

### `Shield`

- `spell_root`
  - `roots` → `respond`
  - `opens_window` → `reaction_window`
  - `prepares` → `prepare`
  - `prompts` → `prompt`
  - `commits` → `commit`
  - `grants` → `interrupt_resolution`
  - `grants` → `modify_ac`
  - `grants` → `negate_named_effect`

### `Bless`

- `spell_root`
  - `roots` → `activate`
  - `opens_window` → `action_window`
  - `consumes` → `spell_slot`
  - `requires` → `concentrate`
  - `attaches_to` → `target` (up to 3 creatures at base slot)
  - `grants` → `modify_roll_numeric` (+1d4 to attack rolls and saves)
  - slot-scaled by `scale_target_count`

### `Sap` (mastery on-hit rider)

- `mastery_root`
  - `roots` → `attack_roll`
  - `opens_window` → `on_hit_window`
  - `attaches_to` → `target`
  - `grants` → `modify_roll_advantage` (disadvantage on target's next attack roll)
  - `persists_until` → `turn_start_window` on attacker, OR first consumed attack-roll trigger

### `Topple` (mastery with attack-rooted save)

- `mastery_root`
  - `roots` → `attack_roll`
  - `opens_window` → `on_hit_window`
  - `attaches_to` → `target`
  - `grants` → `save_gate` (Constitution, DC 8 + ability mod + Proficiency Bonus)
  - `branches_on_save` → `apply_condition(Prone)` on failure

### `Sneak Attack`

- `class_feature_root`
  - `roots` → `on_hit_window`
  - `attaches_to` → `target`
  - `grants` → `damage` with `scale_die_count` (1d6 → 10d6 by Rogue level)
  - `consumes` → `use_count` (once per turn)
  - `persists_until` → `turn_start_window`
  - trigger gates: advantage on roll OR ally adjacent + no disadvantage
  - weapon-property gate: Finesse or Ranged

### `Extra Attack`

- `class_feature_root`
  - `roots` → `grant`
  - `replaces` → base Attack action's attack count
  - `scale_attack_count` (2 → 3 → 4 by class level, class-dependent)

### `Arcane Recovery` (refund)

- `class_feature_root`
  - `roots` → `activate`
  - `opens_window` → `rest_window` (short rest)
  - `refunds` → `spell_slot` (budgeted selection up to ceil(level/2))
  - `consumes` → `use_count` (once)
  - `persists_until` → `rest_window` (long rest resets)

### `Ring of Spell Storing`

- `magic_item_root`
  - `requires` → `attune`
  - `attaches_to` → `item`
  - `stores` → `stored_spell`
  - `consumes` → `spell_slot`
  - `grants` → `release`
  - `releases` → `stored_spell`

### `Attunement`

- `magic_item_root`
  - `requires` → `attune`
  - `opens_window` → `rest_window`
  - `consumes` → `attunement_slot`
  - `persists_until` → `expire`
  - `branches_on_completion` → `complete`

### Passive Worn/Held Defense

- `magic_item_root`
  - `requires` → `attune`
  - `attaches_to` → `item`
  - `grants` → continuous effect node such as `modify_roll_advantage` or `block_targeting`
  - `suppresses` → conditional shutdown
  - `persists_until` → restore boundary such as `turn_start_window` or wear/hold end
  - optional `replaces` / `transfers_to` → target rewrite

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

## 8. Research-Side Closure

The research-side taxonomy track is complete as of `v4`:

- every source-root atom has at least one atom-level validation pass;
- every `v3` / `v4` atom addition is backed by at least two independent data points;
- the 18 reusable subgraphs above are all grounded in at least one concrete unit in the SRD 5.2.1 corpus;
- retired atoms (`stored_spell_slot`, `modify_roll`, `scale_damage`) are documented in `COMPATIBILITY_certification.md` along with their mappings in older validation artifacts.

Further widening (more spells beyond the 20, subclass-specific content, non-SRD corpora) may refine particular atoms or subgraphs but should not change the top-level family shape.

Schema design may now proceed as a distinct phase whenever chosen.
