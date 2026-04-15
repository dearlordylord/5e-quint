# Round 1 Group A

Features:

- `Rage` (Barbarian, Level 1)
- `Bardic Inspiration` (Bard, Level 1)
- `Arcane Recovery` (Wizard, Level 1)
- `Action Surge` (Fighter, Level 2)
- `Monk's Focus` (Monk, Level 2)

Grounding:

- `xphb-srd-pairing/CLASS_FEATURE_VALIDATION_matrix_v0.md`
- `xphb-srd-pairing/TAXONOMY_atoms_graph_v3.md`
- `xphb-srd-pairing/TAXONOMY_graph_representation_v0.md`
- `.references/srd-5.2.1/Classes/Barbarian.md`, `Bard.md`, `Wizard.md`, `Fighter.md`, `Monk.md`

## Short Verdict

Group A validates several `v3` atoms with second independent data points and fits the top-level atom graph cleanly. Three observations are worth recording:

- **`refund` is confirmed** by Arcane Recovery as a second independent data point after Boon of Spell Recall. The shape is similar (conditional reversal of spell-slot consumption) but the gating is different (player chooses which slots, bounded by a per-level budget, gated on short rest).
- **Die-size scaling** (Bardic Inspiration d6 → d8 → d10 → d12) is a typed scaling variant that `v3` does not name. Sneak Attack (Group D) adds a second data point for "dice count scaling." Both pressures point at refining `scale_damage` into `scale_die_count` and `scale_die_size`.
- **Options-menu pool expenditure** (Monk's Focus) is a structural pattern where a single resource can be spent on any of several named effects. The graph handles this cleanly via `choose` + `activate` per option, but the pattern is worth naming in the graph representation as "Pool With Options Menu."

No new top-level node or edge family is forced.

## `Rage`

- Nodes that fit:
  - `class_feature_root`
  - `activate`
  - `bonus_action_window`
  - `use_count`
  - `rest_window` (long rest = full refresh, short rest = partial refresh)
  - `self`
  - `persist`
  - `expire`
  - `grant_resistance` (B/P/S)
  - `modify_roll_numeric` (Rage Damage bonus)
  - `modify_roll_advantage` (Strength checks / saves)
  - `restrict_action_set` (no Concentration, no spells)
  - `duration_window`
- Edges that fit:
  - `roots`
  - `opens_window`
  - `consumes`
  - `persists_until`
  - `grants`
- Multi-benefit structure:
  - Damage Resistance → `grant_resistance({B, P, S})`
  - Rage Damage → `modify_roll_numeric` on Strength-based damage with scaling
  - Strength Advantage → `modify_roll_advantage` on Strength checks and saves
  - No Concentration / No spells → `restrict_action_set`
  - Duration / extend-by-activity → `persist` + `expire` with multi-path extend triggers (attack / save / bonus action)
- What leaks:
  - "Short rest recovers 1 use, long rest recovers all" is a **partial refresh on short rest** cadence. `use_count` + `rest_window` works, but `rest_window` currently doesn't distinguish short vs long rest as separate events. Worth noting the subtype.
  - "Extend by attack / save / bonus action or 10-minute cap" is a **three-way OR extension condition** with a hard duration cap. The graph expresses this with `persist` + `expire` and a computed `duration_window` but does not name the extend-by-activity pattern.
- Ownership:
  - creature-owned resource pool;
  - creature-owned duration with self-extending boundary conditions.
- Verdict:
  - fits `v3` at the top level;
  - validates `grant_resistance` as a class-level atom (second independent data point after Boon of the Night Spirit);
  - validates `modify_roll_numeric` + `modify_roll_advantage` typed split as carrying class features cleanly;
  - records "partial vs full rest refresh" and "extend by triggering activity" as narrow pattern observations.

## `Bardic Inspiration`

- Nodes that fit:
  - `class_feature_root`
  - `activate`
  - `bonus_action_window`
  - `grant`
  - `choose`
  - `companion` (treated as ally target)
  - `target`
  - `use_count`
  - `rest_window` (long rest)
  - `modify_roll_numeric` (the inspiration die adds to a d20 result)
  - `duration_window` (1 hour)
- Edges that fit:
  - `roots`
  - `opens_window`
  - `grants`
  - `attaches_to`
  - `consumes`
  - `persists_until`
- What leaks:
  - **die-size scaling**: the inspiration die is d6 → d8 → d10 → d12 across levels. The current scaling atom inventory has `scale_damage`, `scale_numeric_bonus`, and `scale_target_count` but does not typed-split "die count" vs "die size." Bardic Inspiration is pure die-size scaling.
  - **delayed-consumption pattern**: the die is granted now, stored on the target, and expended on a later D20 Test. This is closest to the `store` / `release` subgraph from items, adapted for a creature target. The target is effectively holding a one-use rider.
  - **first-of-two-events expiry**: the die is consumed either when the target uses it on a failed D20 Test or when the 1-hour duration ends, whichever first. This is the same shape Sap/Vex introduced.
  - **one-at-a-time invariant**: "A creature can have only one Bardic Inspiration die at a time." This is a non-stacking rule analogous to Slow's speed cap.
- Ownership:
  - caster owns the use count; recipient holds the die; both sides share state.
- Verdict:
  - fits `v3` at the top level;
  - strengthens `store` / `release` as applicable to creature targets, not only spell / item payloads;
  - pressures typed die-size scaling as a `v3` gap;
  - echoes Sap/Vex's first-of-two-events expiry shape and Slow's non-stacking policy.

## `Arcane Recovery`

- Nodes that fit:
  - `class_feature_root`
  - `activate`
  - `rest_window` (short rest triggers availability; long rest resets usage)
  - `refund`
  - `spell_slot`
  - `use_count`
  - `choose`
- Edges that fit:
  - `roots`
  - `opens_window`
  - `refunds`
  - `consumes`
  - `persists_until`
- What leaks:
  - **budgeted selection**: the player picks slots totaling up to `ceil(level/2)` combined level, with no slot being 6 or higher. This is a bounded multi-select rather than a single refund. `choose` handles this as a selection primitive; the budget constraint is narrow policy.
  - **reset cadence is mixed**: the feature fires on a short rest trigger but resets on long rest. This is a typed mixed-reset pattern that feats also pressured (Boon of Fate).
- Ownership:
  - creature-owned;
  - acts on the creature's spell-slot state.
- Verdict:
  - **key `v3` validation**: this is the second independent data point for `refund` after Boon of Spell Recall. The shape is similar — both reverse spell-slot consumption — but the gating differs (probabilistic on a per-cast basis for Spell Recall; budgeted on short rest for Arcane Recovery);
  - `refund` stays in `v3` with stronger evidence;
  - narrow observation: budgeted selection with a cap is worth recording as a recurring structural element in resource refund features.

## `Action Surge`

- Nodes that fit:
  - `class_feature_root`
  - `activate`
  - `action_window`
  - `grant_extra_action`
  - `use_count`
  - `rest_window` (short or long rest)
- Edges that fit:
  - `roots`
  - `opens_window`
  - `grants`
  - `consumes`
  - `persists_until`
- What leaks:
  - **exception to granted action set**: "except the Magic action" is a narrow exception that `restrict_action_set` expresses in reverse. The graph has `restrict_action_set` as an atom, but does not explicitly handle "grants everything except X." Worth noting but not a new atom.
  - **usage escalation**: "Starting at level 17, you can use it twice before a rest but only once on a turn." This is a level-gated scaling of `use_count` with an additional per-turn cap. Fits `use_count` with level-scaled cap plus an intra-turn fence.
- Ownership:
  - creature-owned once-per-rest (short or long) trigger.
- Verdict:
  - fits `v3` cleanly;
  - validates `grant_extra_action` (an atom already in `v2`) as correct for this class of feature;
  - confirms that "short rest or long rest" as a reset cadence composes cleanly from `rest_window`.

## `Monk's Focus`

- Nodes that fit:
  - `class_feature_root`
  - `grant`
  - `use_count` (Focus Points)
  - `rest_window` (short or long rest — full refresh on either)
  - `choose` (options menu)
  - `activate` (per option)
  - `bonus_action_window` (Flurry, Patient Defense, Step of the Wind are all bonus-action activations)
  - `save_gate` (for options that require saves)
- Edges that fit:
  - `roots`
  - `opens_window`
  - `consumes`
  - `grants`
  - `branches_on_completion`
- Multi-option structure:
  - **Flurry of Blows** — 1 Focus Point → two Unarmed Strikes as Bonus Action
  - **Patient Defense** — 1 Focus Point → Disengage + Dodge as Bonus Action (else 0-cost Disengage)
  - **Step of the Wind** — 1 Focus Point → Disengage + Dash + doubled jump as Bonus Action (else 0-cost Dash)
- What leaks:
  - **options-menu pool** is the structural pattern here. One resource (`Focus Points`) is consumable via any of several named options (`Flurry`, `Patient Defense`, `Step of the Wind`). Later features add more options. The graph handles this cleanly via `choose` + `activate` per option, but the pattern is worth naming as "Pool With Options Menu" in the graph representation for future reuse (Channel Divinity, Bardic Inspiration-like features, Sorcerer metamagic in PHB).
  - **free-vs-paid variants**: Patient Defense and Step of the Wind have a free Bonus Action option plus a paid upgrade option. This is a choose-with-cost pattern within one option's subgraph.
  - **level-added options**: higher-level features (Heightened Focus, Stunning Strike, Deflect Attacks' redirect) extend the menu. The atom graph can represent this by adding subgraphs; but the menu's openness is worth noting.
- Ownership:
  - creature-owned pool;
  - options may require saves against creature-scoped DC.
- Verdict:
  - fits `v3` at the top level;
  - validates that pool-with-options menus do not need a new atom, but **do deserve a named subgraph pattern** in the graph representation.

## Cross-Feature Findings

1. All five features fit `v3` at the top level. No new top-level node or edge family is forced.
2. **`refund` survives its second contact** (Arcane Recovery after Boon of Spell Recall). The atom is now backed by two independent data points from different source kinds.
3. **`grant_resistance` survives its second contact** (Rage after Boon of the Night Spirit).
4. **Die-size scaling** is pressured by Bardic Inspiration. Sneak Attack (Group D) will provide the other data point for "dice count scaling." Both narrow observations push against `scale_damage` being a single atom.
5. **Options-menu pool** (Monk's Focus) is a structural pattern worth naming as a subgraph. Channel Divinity, Divine Smite-class smite spells, and metamagic all share this shape outside the current sample.
6. **Partial-refresh cadence** (Rage's short-rest single-use recovery vs. long-rest full recovery) is a subtype of `rest_window` that `v3` does not distinguish. Second data point: Channel Divinity uses the same partial/full pattern in feature text outside this group.
7. **Non-stacking invariants across held riders** (Bardic Inspiration's one-die-at-a-time) echo Slow's speed cap and Brutal Strike's Hamstring Blow.
8. **Extend-by-activity duration** (Rage's extend-on-attack-or-save-or-bonus-action) is a novel duration shape not cleanly named today, but it still composes from `persist` + `expire` with multiple trigger alternatives.

## New Node / Edge Family

Group A does **not** force a new top-level node or edge family.

Candidate graph-representation additions recorded:

- Pool With Options Menu (Monk's Focus; generalizes across Channel Divinity, metamagic, smite-class feature menus).

Candidate narrow atom refinements recorded:

- typed scaling split of `scale_damage` into `scale_die_count` and `scale_die_size` (pressured by Bardic Inspiration here; likely reinforced by Sneak Attack in Group D);
- subtype distinction between short-rest and long-rest reset within `rest_window` (pressured by Rage's partial refresh; likely reinforced by Channel Divinity and Second Wind outside the sample).

Neither refinement is promoted to a `v4` yet; `v3` holds at the top level.
