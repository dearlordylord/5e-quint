# Taxonomy: Atoms Graph v4

Purpose:

- revise `v3` after the class-feature, species, and background validation passes exposed consistent multi-stream pressure for a typed scaling split;
- keep every `v3` atom unchanged except the scaling section;
- leave the graph's top-level family shape intact — no source, procedure, attachment, window, resolution, lifecycle, resource, relation, or effect category gains a new member from this revision;
- complete the research-side taxonomy track before any schema design work resumes.

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

## Changes From `v3`

All `v3` atoms are retained unchanged **except** for the scaling section. The single change is a typed split of the scaling atoms.

### Typed split of scaling atoms

`v3` inherited scaling atoms from `v2`:

- `scale_target_count`
- `scale_numeric_bonus`
- `scale_damage`

The class-feature validation pass (Round 1) exposed three mechanically distinct scaling shapes in a single source kind:

- Bardic Inspiration: die-size scaling (d6 → d8 → d10 → d12);
- Sneak Attack: dice-count scaling (1d6 → 10d6);
- Extra Attack: attack-count scaling (2 → 3 → 4 attacks per Attack action).

The species validation pass provided a second independent stream:

- Dragonborn Breath Weapon: dice-count scaling (1d10 → 4d10) tiered by character level.

`scale_damage` cannot honestly carry these three shapes simultaneously — they produce different mathematical operations and compose differently with modifiers, rerolls, and damage-type conversions. The same "dishonest compression" pattern `v3` already fixed for `modify_roll` now applies to `scale_damage`.

### Scaling atoms in `v4`

- `scale_target_count` — carried from `v3` unchanged. Example: slot-scaled target count (Bless at higher levels).
- `scale_numeric_bonus` — carried from `v3` unchanged. Example: level-scaled numeric bonus (Rage Damage).
- `scale_die_count` — **new**. The number of dice rolled grows with level. Example: Sneak Attack (1d6 → 10d6), Dragonborn Breath Weapon (1d10 → 4d10), Cleric Divine Spark (1d8 → 4d8), Cleric Sear Undead (Wis-mod d8s).
- `scale_die_size` — **new**. The die used grows with level. Example: Bardic Inspiration (d6 → d12), Monk Martial Arts Die (d6 → d12).
- `scale_attack_count` — **new**. The number of attacks per Attack action grows with level. Example: Extra Attack (2 → 4), Fighter's Two Extra Attacks / Three Extra Attacks.
- The umbrella name `scale_damage` is retained as a non-atom grouping label only. Graph files and validation notes must use the typed atom names going forward.

All other `v3` sections are unchanged.

## 1. Source Atoms

(unchanged from `v3`)

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

(unchanged from `v3`)

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

(unchanged from `v3`)

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

(unchanged from `v3`)

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

(unchanged from `v3`)

- `attack_roll`
- `melee_spell_attack`
- `save_gate`
- `repeat_save`
- `ability_check`
- `interrupt_resolution`
- `condition_progression`

## 6. Lifecycle Atoms

(unchanged from `v3`)

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

(unchanged from `v3`)

- `spell_slot`
- `charge`
- `use_count`
- `attunement_slot`

## 8. Scaling Atoms

(revised from `v3`: typed split)

- `scale_target_count`
- `scale_numeric_bonus`
- `scale_die_count`
- `scale_die_size`
- `scale_attack_count`

## 9. Effect Atoms

(unchanged from `v3`)

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

(unchanged from `v3`)

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

### A. Top-level family shape is stable

All seven source-root atoms have had an atom-level validation pass. No validation stream has forced a new top-level node or edge family. `v4` refines scaling only.

### B. Typed scaling split parallels the typed `modify_roll` split from `v3`

Both splits follow the same logic: a single umbrella atom was silently carrying mechanically distinct operations. The typed split names each operation independently and lets composition remain honest about what math is being performed.

### C. No further atom-level pressure from item properties

Item properties were the cleanest validation group in the whole effort. Eight of nine properties are cross-rule rewrites that compose from existing atoms and existing subgraphs. One (Ammunition) adds a resource dimension that `consumes` + `use_count` already covers.

### D. Residue observations from earlier streams

All three deferred atom candidates remain deferred:

- `reduce_damage_taken` distinct from `grant_resistance` — single-group pressure from class-feature reactions;
- `crit_window` distinct from `on_hit_window` — single-feat pressure;
- `modify_ability_score` as a runtime effect — out-of-scope for the core mechanics graph.

None is promoted in `v4`. All remain recorded in the residue section below.

### E. Narrow subtype pressures stay narrow

- short-rest vs long-rest distinction within `rest_window` — expressible via attachment;
- learned-vs-prepared within `grant_spell_access` — wizard-specific, narrow;
- keep-higher vs forced-keep within `modify_roll_reroll` — single-step variation.

All three are expressible with existing atoms and composition; no further split is needed.

## 12. Content Surface Survey Findings

The content-surface survey (`scripts/content-surface-survey/`) ran 460 SRD 5.2.1 units through the authored surface in `packages/prototype-content-surface/`. Key findings:

- The TS schema (`types.ts`) expressed ~8 of the 36 v4 effect atoms. The survey exposed the other 28 trying to get in — not as new atoms, but as v4 atoms missing from the schema.
- ~26 items classified as "atom widening" were actually misclassified surface gaps (the v4 atom exists; the TS type didn't).
- The TS schema fragmented effects into four context-specific unions (spell Effect, ClassFeatureEffect, SaveGateRiderResult, ReactionEffect). The survey proved these should be unified — the same v4 atoms appear across all contexts.
- `OngoingOperation` (2 variants) is an artificial restriction. Any effect atom can be persistent or instantaneous; the distinction belongs to the delivery context, not the effect type.

Genuinely new atom pressure (not in v4): `grant_temp_hp` (3 hits), `grant_condition_immunity` (2), `difficult_terrain` (2), `alter_appearance` (2), `stat_block_replacement` / `polymorph_creature` (2), `prevent_hp_floor`, `grant_die_token`, `block_max_hp_reduction`.

The next iteration of the TS schema should reshape — not just widen — based on this evidence. See `scripts/content-surface-survey/REPORT_SRD.md` (when generated) for the full aggregation.

Reshape pass #1 (applied to `packages/prototype-content-surface/src/surface/types.ts`):

- **UnitRecord kinds added**: `feat`, `species_trait`, `magic_item`. Drove by 100% structural_widening rate for these kinds (100/100 of pre-reshape verdicts).
- **Shared `PassiveMechanics` family**: `{ family: "passive", grants: EffectAtom[] }` — the dominant non-spell shape (9+9+6 class_feature votes, 2+2+2 species/magic-item votes).
- **Shared `ActivatedAbilityMechanics`**: renamed from `ClassFeatureActivationMechanics`; reused across class_feature, feat, species_trait, magic_item.
- **`RestResetCadence.dawn`** variant added (4 magic-item votes) — renders to `duration_window`.
- **`grant_feat` atom** added to `EffectAtom` (11 class_feature votes: Ability Score Improvement, Fighter bonus feats).
- **Magic-item attunement**: gated on `MagicItemRecord.requiresAttunement`, rendered via the existing v4 `attunement_slot` resource atom (no new atom needed).
- **`DiceDelta` flat bonuses**: `dieSize = 1` collapses to a flat `+N` at render time, avoiding schema churn for the many "+X to ability/save" shapes.

None of this added new top-level v4 taxonomy families. The taxonomy stayed intact; the TS surface caught up with it.

### Post-survey surface reshape (v5-in-progress)

Based on the survey findings above, the TS surface was reshaped. The taxonomy additions forced by multiple units are now in effect:

- `grant_temp_hp` — added as an effect atom.
- `grant_feat` — added as an effect atom (11+ class_feature hits; Ability Score Improvement "take a feat instead", Fighter bonus feats).
- `grant_spell_access` — added as an effect atom (6+ hits across class_feature and species). Carries mode: `at_will | once_per_long_rest | prepared | known`.
- `grant_condition_immunity` — added as an effect atom (3 hits; Mind Blank / trait-level immunities).
- `RestResetCadence.dawn` — added (4 magic-item hits). Emitted as a `duration_window` rather than `rest_window` since it is not a SRD Rest.
- `ClassFeatureActivationCost.action` and `.reaction` — added (magic-item activations, reactive class features).
- **`PassiveMechanics` family** — the dominant non-spell mechanics shape: "always-on grants while the unit is in effect". Used by class_feature / feat / species_trait / magic_item. The unified procedure atom emitted is `grant` (v4 Procedure Atom already exists).
- **`MagicItemRecord` / `FeatRecord` / `SpeciesTraitRecord` UnitRecord kinds** — backed by `magic_item_root` / `feat_root` / `species_trait_root` (v4 Source Atoms already exist). Magic items additionally consume an `attunement_slot` resource when `requiresAttunement: true`.
- **`EquipmentPredicate` gate on `PassiveMechanics`** — added after reshape-validate batch 1 exposed that all four Fighting Style feats (Defense, Archery, Great Weapon Fighting, Two-Weapon Fighting) depend on a wearing- or wielding-gate on their passive grants. Variants: `always` (sentinel), `wearing_armor` (categories: light / medium / heavy), `wielding_weapon` (weaponKind: ranged / melee_two_handed / melee_one_handed / two_weapons). Emitted as a `resolution`-category node (`wearing_armor` / `wielding_weapon`) connected to the passive `grant` procedure via a `requires` relation. `always` emits nothing (the existing unconditional-grant trace is preserved).
- **`set_ability_score` effect atom** — added after reshape-validate batch 1 (amulet_of_health forced it; broader applicability across Gauntlets of Ogre Power, Headband of Intellect, Ioun Stones). Carries `{ability, value, mode: "set" | "floor"}`. `floor` is the dominant SRD idiom ("no effect if already higher"). Reference encodings: `magic_item_amulet_of_health.dhall` (con=19 floor, rare), `magic_item_gauntlets_of_ogre_power.dhall` (str=19 floor, uncommon).
- **`replace_attack` activation cost** — added after reshape-validate batch 1. Dragonborn Breath Weapon ("you can replace one of your attacks") introduced the attack-replacement economy as a distinct cost; emits an `attack_slot` resource node consumed by the activation. Not yet exercised by a reference encoding — requires `phases` on `ActivatedAbilityMechanics` (pending) for a real use.

None of these contradict v4; they realize v4 atoms in the authored surface that were previously absent.

## 13. Known Remaining Weak Spots

Even `v4` may still be too weak on:

- multi-creature or target-priority selection logic;
- full proxy attack loop semantics (Spiritual Weapon, Bigby's Hand-like shapes);
- exact named-effect negation boundaries beyond the current sample;
- finer item-resource typing:
  - stored payload metadata
  - absorbed spell-energy reservoirs
  - per-spell daily reuse
  - recharge cadence
- `modify_ability_score` as a runtime effect versus as pre-runtime character state (currently treated as out-of-scope);
- `crit_window` as a distinct trigger from `on_hit_window` (Boon of Irresistible Offense's Overwhelming Strike). Not promoted; single-feat pressure.
- `reduce_damage_taken` distinct from `grant_resistance` (Uncanny Dodge, Deflect Attacks). Not promoted; single-group pressure.
- Heroic Inspiration as a runtime meta-state (Human Resourceful). Not promoted; single-species pressure.
- `modify_max_hp` per-level scaling (Dwarven Toughness). Current atom covers it; growth cadence is character-progression metadata.

None of these invalidate any `v4` atom. They are recorded as still-open refinement pressure.

## 13. Upgrade Notes For Existing Validation Files

When a later pass re-checks earlier validation artifacts against `v4`, expect these mechanical substitutions:

- `scale_damage` (when it covered die-count scaling) → `scale_die_count`;
- `scale_damage` (when it covered die-size scaling) → `scale_die_size`;
- `scale_damage` (when it covered attack-count scaling) → `scale_attack_count`;
- `scale_damage` (when it covered numeric damage bonus scaling) → `scale_numeric_bonus`;
- unnamed "attack-count grows with level" prose → `scale_attack_count`.

Earlier files do not need mechanical rewrites. This guidance is for consistency when future work references them alongside `v4`.

## 14. Source-Root Coverage Snapshot

All source-root atoms have had at least one atom-level validation pass:

| Source atom | Validation streams |
|---|---|
| `spell_root` | spells × 3 rounds (20 spells) |
| `magic_item_root` | items × 2 rounds (24 items) |
| `mastery_root` | masteries × 1 round (8 masteries) |
| `feat_root` | feats × 1 round (17 feats) |
| `class_feature_root` / `subclass_feature_root` | class features × 1 round (16 features) |
| `species_trait_root` / `background_trait_root` | species + backgrounds × 1 round (13 units) |
| `item_property_root` | item properties × 1 round (9 properties) |

Further rounds could deepen coverage, but the taxonomy is now tested against every source-root atom defined in `v4`.
