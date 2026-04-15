# Round 1 Class Feature Synthesis

Purpose:

- aggregate the first class-feature validation pass against `TAXONOMY_atoms_graph_v3.md`;
- determine whether `v3`'s newly added atoms survive contact with the largest and most stateful source root;
- decide whether class-feature pressure justifies a `v4` draft or only narrow refinements.

## Short Answer

`v3` holds. Every new atom added to `v3` in the feat pass either gets a second independent data point in this pass or fits cleanly as theoretical coverage for pressures not yet sampled. No new top-level node or edge family is forced.

Class-feature pressure does expose one clear `v4` candidate and several narrow observations:

- **strongest `v4` candidate**: typed scaling split. Three distinct scaling shapes appear in this pass (die-size, dice-count, attack-count). `v3`'s scaling atoms (`scale_damage`, `scale_numeric_bonus`, `scale_target_count`) do not cleanly cover any of them. This is the single clearest atom-level pressure since the feat pass.
- **three pattern additions for the graph representation** (strong three-data-point pressure): Pool With Options Menu, AC formula override, save-branch rewrite.
- **narrow atom recording** (single-group pressure, not promoted yet): `reduce_damage_taken` distinct from `grant_resistance`.
- **subtype pressure on existing atoms** (deferred): short-rest vs long-rest distinction within `rest_window`; learned-vs-prepared within `grant_spell_access`.

## Group Verdicts

### Group A — stateful resource pools

Features: `Rage`, `Bardic Inspiration`, `Arcane Recovery`, `Action Surge`, `Monk's Focus`.

Result:

- `v3` holds;
- **second independent data point for `refund`** (Arcane Recovery after Boon of Spell Recall);
- **second independent data point for `grant_resistance`** (Rage after Boon of the Night Spirit);
- **first strong pressure for typed scaling split**: Bardic Inspiration's die-size scaling;
- **first data point for Pool With Options Menu** (Monk's Focus);
- **subtype pressure** on `rest_window`: short-rest partial refresh vs long-rest full refresh (Rage).

### Group B — reactions and conditional responses

Features: `Uncanny Dodge`, `Deflect Attacks`, `Evasion`, `Relentless Rage`.

Result:

- `v3` holds;
- Prepare / Prompt / Commit subgraph validated under class-feature pressure;
- **narrow atom recording** (single group): `reduce_damage_taken` distinct from `grant_resistance` (Uncanny Dodge, Deflect Attacks);
- **pattern recordings**: conditional payment after resolution (Deflect Attacks), usage-count-parameterized DC (Relentless Rage), save-branch rewrite (Evasion).

### Group C — persistent passives and grants

Features: `Unarmored Defense`, `Feral Instinct`, `Danger Sense`, `Spellcasting`.

Result:

- `v3` holds;
- **second independent data point for `initiative_window`** (Feral Instinct after Alert);
- **third independent data point for `modify_roll_advantage`** (Danger Sense after Sap/Vex);
- **first strong data point for `grant_spell_access`** (Spellcasting);
- **second validation of `suppress`** as a state-gated passive shutdown (Danger Sense's Incapacitated gate);
- **pattern recording**: AC formula override (Unarmored Defense) as a cross-rule rewrite;
- **subtype pressure** on `grant_spell_access`: learned-in-spellbook vs prepared (Wizard Spellcasting).

### Group D — attack riders and level scaling

Features: `Sneak Attack`, `Extra Attack`, `Lay On Hands`.

Result:

- `v3` holds at the top level;
- **second independent data point for typed scaling split**: Sneak Attack's dice-count scaling;
- **third independent data point for typed scaling split**: Extra Attack's attack-count scaling;
- **second and third data points for Pool With Options Menu** (Cunning Strike, Lay on Hands after Monk's Focus);
- **quantity-based scalar pool** (Lay on Hands) validates `use_count` stretching to scalar resources without forcing a new atom.

## What Round 1 Strengthened

### 1. `v3`'s new atoms survive the stress test

Every new atom added in `v3` either gets a second independent data point in the class-feature pass or is cleanly applicable where theoretical coverage was claimed:

- `refund` — validated twice (Boon of Spell Recall, Arcane Recovery);
- `initiative_window` — validated twice (Alert, Feral Instinct);
- `grant_resistance` — validated twice (Boon of the Night Spirit, Rage);
- `grant_spell_access` — validated once strongly (Spellcasting); prior weaker pressure (Magic Initiate);
- `modify_roll_advantage` — validated three times (Sap, Vex, Danger Sense) with varied scope;
- `modify_roll_numeric` — recurring across Rage, Bardic Inspiration (the stored die), and all spell / mastery numeric bonuses;
- `post_action_window` — not directly stressed in this pass; defer but keep;
- `grant_sense` — not stressed here (class features mostly delegate sense grants to subclasses / species); defer validation to species / background trait pass;
- `grant_proficiency` — stressed implicitly via Spellcasting's proficiency implications; no class feature in the sample stressed it alone. Mostly validated.
- `bypass_resistance` — not directly stressed in this pass; Monk's Empowered Strikes (damage-type choice) is the closest analogue but different mechanism. Defer validation to a future pass that includes it.

This is meaningful evidence that `v3` is well-calibrated. It neither over-promised nor under-covered for the feat-level pressure that motivated it.

### 2. Cross-rule composition is now a very strong pattern

Six independent features across four groups use cross-rule composition:

- Unarmored Defense (rewrites baseline AC calculation);
- Spellcasting + always-prepared spells from later features (extends prepared list outside cap);
- Extra Attack (rewrites the Attack action's count);
- Sneak Attack's weapon-property gate (Finesse or Ranged requirement);
- Lay on Hands + Poison curing (crosses with condition mechanics);
- Deflect Attacks (crosses with damage-type rules for the redirect).

Plus prior pressure from Nick (mastery), Two-Weapon Fighting (feat), Great Weapon Fighting (feat). Cross-rule composition is now the most well-evidenced graph-representation pattern. Worth naming as the **primary** structural motif, on par with On-Hit Rider.

### 3. Pool With Options Menu is a real pattern

Three data points now (Monk's Focus, Cunning Strike, Lay on Hands), plus prior pressure from Rage's exit-extend conditions being action-selectable. The pattern is general enough to hold across Channel Divinity, Smite menus, and metamagic in PHB subclasses / other classes not in the sample.

### 4. Typed scaling is the single clearest `v4` candidate

Three distinct scaling shapes in one pass:

- die-size scaling (Bardic Inspiration: d6 → d8 → d10 → d12);
- dice-count scaling (Sneak Attack: 1d6 → 10d6);
- attack-count scaling (Extra Attack: 2 → 3 → 4).

`v3`'s scaling atoms were inherited from `v2` (`scale_damage`, `scale_numeric_bonus`, `scale_target_count`) without specific validation. The class-feature pass is the first to hit scaling hard, and it clearly exposes the single-atom approach as "dishonest compression" (the same failure mode `v0`/`v1` hit on effect atoms).

### 5. Usage counters are already flexible enough

`use_count` covers:

- boolean on/off uses (Action Surge);
- small-integer activation counts (Rage uses, Channel Divinity uses);
- scalar pool quantities (Lay on Hands HP pool, Monk's Focus Points, Bard Inspiration count);
- usage-count-parameterized DCs (Relentless Rage).

No need to split `use_count` into typed subtypes. Ownership and attachment carry the semantic difference.

### 6. Target-side perspective on `on_hit_window` works

Uncanny Dodge and Deflect Attacks both trigger when the feature-holder is hit. The same `on_hit_window` atom used for attacker-side riders (masteries, Sneak Attack) covers target-side reactions. No new window atom needed.

## What Still Leaks (Recorded `v4` Pressure)

### A. Typed scaling split (strongest `v4` candidate)

Three data points across one pass. The single-atom compression is clearly dishonest. Candidate split:

- `scale_die_size` — die grows with level (d6 → d12).
- `scale_die_count` — dice number grows with level (1d6 → 10d6).
- `scale_attack_count` — attack count per action grows with level (2 → 4).
- retain `scale_numeric_bonus` and `scale_target_count` from `v3`.
- retire the generic `scale_damage` as a non-atom grouping label, mirroring what `v3` did to `modify_roll`.

This is the clearest accumulated pressure and should be the first candidate for `v4`.

### B. `reduce_damage_taken` effect atom (narrow, single-group)

Uncanny Dodge halves damage; Deflect Attacks reduces by a computed amount. Neither matches `grant_resistance` (which is type-scoped). Record but do not promote: single-group pressure is insufficient until another validation stream pressures it.

### C. Subtype pressure within existing atoms

- `rest_window` — short-rest vs long-rest distinction (Rage partial refresh, Action Surge, Monk's Focus full refresh on either). Expressible with attachment; no atom split needed.
- `grant_spell_access` — learned vs prepared (Wizard Spellcasting's two-layer structure). Narrow wizard-specific pattern; no atom split needed yet.

### D. Narrow pattern recordings (composition, not atoms)

- conditional payment after resolution (Deflect Attacks);
- usage-count-parameterized DC (Relentless Rage);
- save-branch rewrite (Evasion);
- AC formula override (Unarmored Defense);
- extend-by-activity duration (Rage).

All five compose cleanly from existing atoms. Worth naming in the graph representation but not promoting to atoms.

## Research Conclusion

`v3` is holding. Class features — the largest and most stateful source root — validate every `v3` addition that was stressable and do not force a new top-level node or edge family.

The correct next moves are:

1. update `TAXONOMY_graph_representation_v0.md` with the new pattern additions (Pool With Options Menu, AC formula override, save-branch rewrite, conditional payment after resolution, usage-count-parameterized DC, extend-by-activity duration);
2. record the narrow `v4` pressure (typed scaling split) as the single clearest atom-level candidate in `TAXONOMY_atoms_graph_v3.md`'s "Known Remaining Weak Spots";
3. do **not** draft `v4` yet. The class-feature pass proved `v3` holds; a second validation stream (species / background traits, item properties, or a subclass sample) should either reinforce the typed scaling split or discharge it before `v4` is drafted;
4. the next widening target is **species and background traits** — expected to mostly confirm `v3`'s new `grant_sense`, `grant_proficiency`, and `grant_resistance` atoms without much stress;
5. defer schema design until species / background traits and at least one more stream confirm the typed-scaling-split pressure;
6. optionally refresh `TAXONOMY_graph_representation_v0.md` to `v1` with `v3` atom names and the new pattern subgraphs when convenient.
