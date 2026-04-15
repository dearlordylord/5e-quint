# Research Capstone

Purpose:

- close out the `.references/xphb-srd-pairing/` research-side taxonomy track;
- provide a single-file summary of the arc from `v0` to `v4`, the seven validation streams, and the final state of the atom graph and pattern inventory;
- serve as the reader's entry point for understanding the research without having to read every artifact.

## 1. What This Research Was

A systematic attempt to find the smallest honest set of atoms (nodes, edges, subgraphs) that can describe the mechanical rules in the SRD 5.2.1 corpus without silent compression.

The research explicitly did **not**:

- design a runtime schema;
- produce a storage format;
- wire up any XState machine, Quint spec, or TypeScript type;
- commit to a final ontology.

It produced a validated atom-level vocabulary that future schema / runtime work can draw from, and a pattern catalog that names recurring composition shapes.

## 2. Arc From `v0` To `v4`

Four atom-graph versions, each motivated by concrete validation pressure:

- **`v0`** — initial draft vocabulary with candidate atoms and relations. No resolution section. Scaling unnamed. Single-umbrella `modify_roll` and no scaling atoms. Purpose: give validation a falsifiable target.
- **`v1`** — after Round 1 spell validation (20 spells). Added the whole resolution section (`attack_roll`, `save_gate`, etc.), the `prompt` procedure, and several attachment / window / effect atoms. Retired `stored_spell_slot` as a mislabel. First real course-correction.
- **`v2`** — after Round 2 spell validation. Added the scaling section as a separate category (`scale_target_count`, `scale_numeric_bonus`, `scale_damage`), the `condition_progression` resolution atom, and several lifecycle atoms (`return_on_end`, `replace_on_recast`). Stabilized the graph enough that Round 3 spell validation converged.
- **`v3`** — after mastery, feat, and class-feature passes pressured it. Added `grant_sense`, `grant_proficiency`, `grant_spell_access`, `grant_resistance`, `bypass_resistance`, `refund` / `refunds`, `initiative_window`, `post_action_window`. Retired the umbrella `modify_roll` and promoted the typed `modify_roll_numeric` / `_advantage` / `_reroll` / `_substitute` split.
- **`v4`** — after class-feature + species / background passes confirmed the scaling atoms were the next underfit region. Retired the umbrella `scale_damage` and promoted the typed `scale_die_count` / `scale_die_size` / `scale_attack_count` split (retaining `scale_numeric_bonus` and `scale_target_count`).

## 3. Seven Validation Streams

Each stream targeted a source-root atom and ran one or more rounds of atom-level validation against concrete SRD units.

| # | Stream | Units | Rounds | Source roots exercised |
|---|---|---|---|---|
| 1 | Spells | 20 | 3 | `spell_root` |
| 2 | Magic items | 24 | 2 | `magic_item_root` |
| 3 | Masteries | 8 | 1 | `mastery_root` |
| 4 | Feats | 17 | 1 | `feat_root` |
| 5 | Class features | 16 | 1 | `class_feature_root` / `subclass_feature_root` |
| 6 | Species and backgrounds | 13 | 1 | `species_trait_root` / `background_trait_root` |
| 7 | Item properties | 9 | 1 | `item_property_root` |

Total: **107 unit entries across all streams**. Every source-root atom now has at least one atom-level validation pass.

## 4. Final Atom Inventory (`v4`)

- **Source atoms (9)**: `spell_root`, `feat_root`, `class_feature_root`, `subclass_feature_root`, `species_trait_root`, `background_trait_root`, `item_property_root`, `mastery_root`, `magic_item_root`.
- **Procedure atoms (14)**: `activate`, `respond`, `prepare`, `prompt`, `commit`, `choose`, `grant`, `replace`, `store`, `release`, `suppress`, `restore`, `attune`, `refund`.
- **Attachment atoms (11)**: `self`, `target`, `area`, `object`, `location`, `weapon`, `item`, `companion`, `stored_spell`, `attack_proxy`, `mark`.
- **Window atoms (13)**: `action_window`, `bonus_action_window`, `reaction_window`, `spell_cast_window`, `turn_start_window`, `turn_end_window`, `on_hit_window`, `on_miss_window`, `post_roll_window`, `initiative_window`, `post_action_window`, `duration_window`, `rest_window`.
- **Resolution atoms (7)**: `attack_roll`, `melee_spell_attack`, `save_gate`, `repeat_save`, `ability_check`, `interrupt_resolution`, `condition_progression`.
- **Lifecycle atoms (9)**: `concentrate`, `persist`, `expire`, `dismiss`, `complete`, `break`, `self_break`, `return_on_end`, `replace_on_recast`.
- **Resource atoms (4)**: `spell_slot`, `charge`, `use_count`, `attunement_slot`.
- **Scaling atoms (5)**: `scale_target_count`, `scale_numeric_bonus`, `scale_die_count`, `scale_die_size`, `scale_attack_count`.
- **Effect atoms (37)**: see `TAXONOMY_atoms_graph.md` § 9.
- **Relation types (20)**: `roots`, `opens_window`, `requires`, `attaches_to`, `stores`, `releases`, `grants`, `consumes`, `refunds`, `suppresses`, `replaces`, `modifies`, `persists_until`, `branches_on_completion`, `branches_on_save`, `prepares`, `prompts`, `commits`, `transfers_to`, `returns_to`.

## 5. Final Pattern Inventory (18 Subgraphs)

Recurring composition patterns validated across at least one concrete unit:

- **A.** Prepare / Prompt / Commit
- **B.** Store / Release
- **C.** Attunement Lifecycle
- **D.** Persistent Proxy
- **E.** Mark / Transfer
- **F.** Passive Projection
- **G.** On-Hit Rider
- **H.** Cross-Rule Composition
- **I.** Relation-Scoped Effect
- **J.** Cross-Actor Roll Observation
- **K.** Environment-State Gate
- **L.** Disjoint Reset Cadence
- **M.** Pool With Options Menu
- **N.** Cross-Rule Rewrite
- **O.** Conditional Payment After Resolution
- **P.** Usage-Count-Parameterized DC
- **Q.** Extend-By-Activity Duration
- **R.** Scope-First Nested Selection

All 18 are documented in `TAXONOMY_graph_representation.md` with concrete pressure cases.

## 6. What Survived vs. What Got Refined

### Survived unchanged from `v0`

- the 9 source-root atoms (no new top-level family ever forced);
- the core procedures (activate, respond, prepare, commit, choose, grant, replace, store, release, suppress, restore, attune);
- most attachments (self, target, area, object, location, weapon, item, companion, stored_spell);
- most windows (action, bonus, reaction, turn_start, turn_end, on_hit, on_miss, post_roll, duration, rest);
- most effects (damage, heal, modify_max_hp, modify_ac, modify_range, apply_condition, remove_condition, move, force_move, block_targeting, block_travel, create_companion, create_object, telepathic_link, deliver_touch_spell).

### Refined through typed splits

- `modify_roll` umbrella → four typed variants (`v3`);
- `scale_damage` umbrella → three typed variants (`v4`).

### Added as new atoms

- procedure: `prompt` (`v1`), `refund` (`v3`);
- attachment: `attack_proxy`, `mark` (`v1`);
- window: `spell_cast_window` (`v1`), `initiative_window`, `post_action_window` (`v3`);
- resolution: the entire resolution section (`v1`), `condition_progression` (`v2`);
- lifecycle: `self_break` (`v1`), `return_on_end`, `replace_on_recast` (`v2`);
- scaling: the entire scaling section in `v2`, then typed in `v4`;
- effect: `modify_speed`, `grant_hover`, `grant_extra_action`, `restrict_action_set`, `transport_exile`, `command_companion`, `create_attack_proxy`, `mark_target`, `transfer_mark`, `alter_item_kind` (`v1`); `negate_named_effect`, `deny_opportunity_attack`, `fall_on_end` (`v2`); the typed `modify_roll_*` split, `grant_sense`, `grant_proficiency`, `grant_spell_access`, `grant_resistance`, `bypass_resistance` (`v3`);
- relation: `branches_on_save`, `transfers_to` (`v1`), `returns_to` (`v2`), `refunds` (`v3`).

### Retired (all documented in `COMPATIBILITY_certification.md`)

- `stored_spell_slot` (resource; retired in `v1` as a mislabel);
- `modify_roll` (effect; retired in `v3` as dishonest compression);
- `scale_damage` (scaling; retired in `v4` as dishonest compression).

## 7. Recorded Residue Not Promoted To `v4`

The research kept an honest residue list — single-pressure observations that did not yet cross the "second independent stream" bar:

- `reduce_damage_taken` effect atom distinct from `grant_resistance` (Uncanny Dodge, Deflect Attacks);
- `crit_window` distinct from `on_hit_window` (Boon of Irresistible Offense);
- `modify_ability_score` as a runtime effect vs. character state (treated as out-of-scope);
- Heroic Inspiration as a runtime meta-state (Human Resourceful);
- short-rest vs long-rest distinction within `rest_window` (expressible via attachment);
- learned-vs-prepared within `grant_spell_access` (Wizard-specific);
- keep-higher vs forced-keep within `modify_roll_reroll` (Halfling Luck vs Savage Attacker);
- `modify_max_hp` per-level growth cadence (Dwarven Toughness);
- partial-refresh cadence for short rest (Rage);
- scoped damage-modifier suppression and scaling locks (Cleave, Graze);
- attack-rooted vs caster-rooted vs item-rooted save DC sourcing.

None of these invalidate any `v4` atom. Any of them could be promoted by a future widening pass that produces a second independent data point.

## 8. Reading Order For Future Readers

To reconstruct the research efficiently, read in this order:

1. `RESET_foundation_srd_base_phb_extension.md` — public-base / private-extension boundary;
2. `TAXONOMY_atoms_graph.md` — final atom inventory;
3. `TAXONOMY_graph_representation.md` — graph model + 18 subgraphs + example subgraphs;
4. `COMPATIBILITY_certification.md` — per-stream re-validation of 87 unit entries;
5. This capstone (for the arc) and `INDEX.md` (for the full artifact inventory).

Earlier versions (`v0`, `v1`, `v2`, `v3`) and their per-round validation files remain as the trail of the falsification process. They are not required for understanding the current state but are useful for understanding why each atom exists.

## 9. Handover To Schema Design

Schema design is a separate phase. When it resumes, these inputs are ready:

- **atom inventory**: `TAXONOMY_atoms_graph.md` — the vocabulary to encode.
- **graph model**: `TAXONOMY_graph_representation.md` — node/edge kinds and the 18 reusable subgraphs that concrete rule units instantiate.
- **compatibility map**: `COMPATIBILITY_certification.md` — how historical artifacts translate to `v4` names if they need to be ingested.
- **open residue**: this capstone's § 7 — items that may force schema refinements if hit during implementation.
- **architecture boundary**: `RESET_foundation_srd_base_phb_extension.md` — the public-base / private-extension separation that must be preserved in the shipped product.

The research-side track does not recommend a specific schema shape. Multiple shapes are plausible (flat node/edge records; variant types per category; typed-sum-per-subgraph; hybrid). The atom inventory and the 18 subgraphs give schema design a stable target; the final choice is for the schema-design phase.

## 10. State Of The Workspace

- All seven source-root atoms have atom-level validation.
- All `v3` / `v4` atom additions have at least two independent data points.
- All retired atoms have clean mappings for old artifacts.
- All 18 reusable subgraphs are grounded in at least one concrete unit.
- `v4` has survived four stream contacts without structural-dishonesty pressure on its top-level shape.

The research-side track is **complete**.
