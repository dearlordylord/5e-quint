# Taxonomy: Atoms Graph v3

Purpose:

- revise `v2` after the four-stream validation passes (spells × 3 rounds, items × 2 rounds, masteries × 1 round, feats × 1 round);
- keep the gains from `v2`;
- absorb the atom-level gaps the feat pass exposed with enough independent evidence to promote them from "recorded residue" to "first-class atoms";
- leave the graph's top-level family shape unchanged, because no validation stream has yet exposed structural dishonesty at that level.

## Architecture Reminder

Read this file under the repo boundary from `ARCHITECTURE.md`:

- the core models mechanical rules with deterministic outcomes;
- DM rulings, agenda decisions, notification surfaces, and other caller-owned facts are **not** core-mechanics atoms.

Every atom here must justify itself as a reusable mechanics concern:

- owned state
- reusable transition shape
- deterministic trigger/evaluation boundary
- deterministic effect / cleanup / projection boundary

If a candidate is only:

- a wording distinction;
- a communication label;
- a narrative description;
- a UI-facing summary;

then it stays out of the core atom inventory.

## Changes From `v2`

All `v2` atoms are retained unchanged **except** for one typed split noted below. New atoms are added to existing sections.

### New effect atoms

- `grant_sense` — grants a persistent sensing capability such as Truesight, Darkvision, Blindsight, Tremorsense. Parallels `grant_hover`. Pressured by Boon of Truesight; expected in species traits.
- `grant_proficiency` — grants persistent proficiency with a skill or tool. Pressured by Skilled; expected in backgrounds and species.
- `grant_spell_access` — grants persistent access to one or more specific spells, optionally as always-prepared. Pressured by Magic Initiate; expected in class features, species, and items with "you always have X prepared" text.
- `grant_resistance` — grants persistent resistance to a specified damage type set with optional exception set. Pressured by Boon of the Night Spirit.
- `bypass_resistance` — causes damage dealt by the owner to ignore resistance of specified damage types. Pressured by Boon of Irresistible Offense. Pairs with `grant_resistance` in the damage-defense family.

### New window atoms

- `initiative_window` — the moment an initiative roll is resolved, before the start of the first turn. Distinct from `post_roll_window` because the roll is not an attack / save / ability check. Pressured by Alert.
- `post_action_window` — the moment immediately after an action, bonus action, or reaction completes. Pressured by Boon of Dimensional Travel (trigger) and Boon of the Night Spirit (expiry).

### New procedure atom and relation

- `refund` — procedure atom that conditionally reverses an earlier resource consumption, typically gated by a local chance roll or by a post-cast condition. Pressured by Boon of Spell Recall.
- `refunds` — relation edge from a `refund` procedure to the resource node it reverses.

### Typed split of `modify_roll`

`v2`'s `modify_roll` quietly carried four mechanically distinct operations. The feat and mastery passes together produced four independent data points, making the split honest:

- `modify_roll_numeric` — adds or subtracts a numeric bonus (Bless, Shield of Faith, Archery).
- `modify_roll_advantage` — imposes advantage or disadvantage (Sap, Vex, Mantle of Spell Resistance).
- `modify_roll_reroll` — rerolls the rolled dice and chooses an outcome (Savage Attacker).
- `modify_roll_substitute` — substitutes specific die faces with a specific value (Great Weapon Fighting's "treat 1 or 2 as 3").

The umbrella name `modify_roll` is retained as a non-atom grouping label only. Graph files and validation notes must use the typed atom names going forward.

## 1. Source Atoms

(unchanged from `v2`)

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

(added: `refund`)

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

## 3. Attachment Atoms

(unchanged from `v2`)

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

(added: `initiative_window`, `post_action_window`)

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

## 5. Resolution Atoms

(unchanged from `v2`)

- `attack_roll`
- `melee_spell_attack`
- `save_gate`
- `repeat_save`
- `ability_check`
- `interrupt_resolution`
- `condition_progression`

## 6. Lifecycle Atoms

(unchanged from `v2`)

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

(unchanged from `v2`)

- `spell_slot`
- `charge`
- `use_count`
- `attunement_slot`

## 8. Scaling Atoms

(unchanged from `v2`)

- `scale_target_count`
- `scale_numeric_bonus`
- `scale_damage`

## 9. Effect Atoms

(added: typed `modify_roll_*` split, `grant_sense`, `grant_proficiency`, `grant_spell_access`, `grant_resistance`, `bypass_resistance`)

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

## 10. Relation Types

(added: `refunds`)

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

## 11. Current Working Reads

### A. Top-level family shape is still emergent

No validation stream has yet forced a new top-level node or edge family. The atom-level additions in `v3` are refinements within existing sections, not a reshaping of the graph.

### B. Typed roll modification is mechanically real

The `modify_roll` split is not stylistic. Numeric bonuses stack under different rules than advantage/disadvantage; rerolls are a different operation again; dice substitution is another. Compressing them into one atom repeats the `v0 → v1` mistake of dishonest compression.

### C. Grant-capability effects parallel the existing `grant_hover` precedent

`v2` already chose to name `grant_hover` rather than hide it under a generic "grant movement capability." The new `grant_sense`, `grant_proficiency`, `grant_spell_access`, and `grant_resistance` atoms follow the same precedent for persistent capability grants.

### D. Damage-defense is a paired family

`grant_resistance` and `bypass_resistance` are inverse-shaped effects. Both should exist as atoms for the defense / offense side of the damage pipeline. Neither is stylistic — both change the damage calculation deterministically.

### E. `refund` is narrow but real

Probabilistic resource refund currently appears only in Boon of Spell Recall in the SRD corpus, but the pattern is expected to recur in class features (wizard arcane recovery, sorcerer metamagic refund rules in some subclasses) and magic items. Naming it now prevents future dishonest compression into `restore` or `release`.

### F. Composition patterns remain in the graph representation, not in atoms

Cross-rule composition, relation-scoped effect, cross-actor roll observation, environment-state gate, and disjoint reset cadence all stay in `TAXONOMY_graph_representation_v0.md` (or a later revision) as **patterns**, not atoms. None of them introduces a missing node or edge; they each instruct how to compose existing atoms.

## 12. Known Remaining Weak Spots

Even `v3` may still be too weak on:

- multi-creature or target-priority selection logic;
- full proxy attack loop semantics (Spiritual Weapon, Bigby's Hand-like shapes);
- exact named-effect negation boundaries beyond the current sample;
- finer item-resource typing:
  - stored payload metadata
  - absorbed spell-energy reservoirs
  - per-spell daily reuse
  - recharge cadence
- `modify_ability_score` as a runtime effect versus as pre-runtime character state (currently treated as out-of-scope);
- `crit_window` as a distinct trigger from `on_hit_window` (Boon of Irresistible Offense's Overwhelming Strike). Not yet added because only one feat in the current sample pressures it; will be revisited if class features (Paladin smites, Barbarian brutal critical) repeat the pressure.

These are recorded residue, not blockers. They do not invalidate any `v3` atom.

### Post-class-feature residue (strong single-stream pressure)

The class-feature validation pass (Round 1) surfaced one atom-level pressure strong enough to flag as the primary `v4` candidate:

- **typed scaling split.** Three independent scaling shapes appear in a single pass: die-size (Bardic Inspiration: d6 → d12), dice-count (Sneak Attack: 1d6 → 10d6), and attack-count (Extra Attack: 2 → 4 per action). `v3`'s single `scale_damage` atom compresses these three mechanically distinct operations. Candidate split: `scale_die_size`, `scale_die_count`, `scale_attack_count`, retaining `scale_numeric_bonus` and `scale_target_count`. Retire the generic `scale_damage` as a non-atom grouping label, mirroring what `v3` already did to `modify_roll`. Do not promote to `v4` yet — a second validation stream (species / background traits, or a subclass sample) should either reinforce or discharge this pressure first.

### Post-class-feature residue (single-group, recorded for future promotion)

- `reduce_damage_taken` as an effect atom distinct from `grant_resistance`, for features that halve or numerically reduce a specific attack's damage rather than applying type-scoped resistance (Uncanny Dodge, Deflect Attacks). Single-group pressure; hold until another stream reinforces it.

### Post-class-feature residue (subtype pressure on existing atoms, deferred)

- short-rest vs long-rest distinction within `rest_window` (Rage partial refresh, Action Surge, Monk's Focus);
- learned-in-spellbook vs prepared-from-spellbook within `grant_spell_access` (Wizard Spellcasting's two-layer structure).

Both are expressible via attachment or narrow subtype labels; no atom split needed yet.

## 13. Upgrade Notes For Existing Validation Files

When a later pass re-checks earlier validation artifacts against `v3`, expect these mechanical substitutions:

- `modify_roll` (when it covered a numeric bonus) → `modify_roll_numeric`;
- `modify_roll` (when it covered advantage/disadvantage) → `modify_roll_advantage`;
- `modify_roll` (when it covered a reroll) → `modify_roll_reroll`;
- `modify_roll` (when it covered die substitution) → `modify_roll_substitute`;
- `post_roll_window` (when the roll was specifically initiative) → `initiative_window`;
- ad-hoc "after the action" language → `post_action_window`;
- ad-hoc "gains truesight/darkvision" prose → `grant_sense`;
- ad-hoc "has proficiency with" prose → `grant_proficiency`;
- ad-hoc "always has X prepared" or "learns spells" prose → `grant_spell_access`;
- ad-hoc "has resistance to" prose → `grant_resistance`;
- ad-hoc "damage ignores resistance" prose → `bypass_resistance`;
- conditional "slot isn't expended" / "you recover the resource" prose → `refund` + `refunds`.

Earlier files do not need to be mechanically rewritten. This guidance is for consistency when future validation rounds reference them alongside `v3`.
