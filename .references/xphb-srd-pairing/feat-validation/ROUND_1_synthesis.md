# Round 1 Feat Synthesis

Purpose:

- aggregate the first feat-side validation pass against `TAXONOMY_atoms_graph.md` and `TAXONOMY_graph_representation.md`;
- determine whether the closed 2024 SRD feat catalog forces a taxonomy revision;
- decide whether feat pressure justifies `TAXONOMY_atoms_graph.md` or more targeted refinements.

## Short Answer

`v2` survives the feat pass at the top level. No group forces a new node or edge family.

However, the feat pass is the **first validation stream to expose repeated effect-atom and window-atom gaps** that cannot be dismissed as single-feat residue. Several candidate additions appear in more than one feat and some also echo prior spell, item, or mastery observations:

- **three missing "grant X capability" effect atoms**: `grant_sense`, `grant_proficiency`, `grant_spell_access`;
- **two missing damage-defense effect atoms**: `grant_resistance` (Night Spirit) and `bypass_resistance` (Irresistible Offense);
- **two missing window atoms**: `initiative_window` (Alert) and `post_action_window` / `action_end_window` (Dimensional Travel trigger, Night Spirit self-expiry);
- **one novel procedure / relation shape**: probabilistic resource refund (Spell Recall);
- **three typed-subtype pressures on existing atoms**: damage-die substitution vs reroll vs numeric bonus inside `modify_roll` (Savage Attacker, Great Weapon Fighting, Sap/Vex from masteries).

This is enough accumulated pressure that **a `v3` draft is now the right next taxonomy step** — not because any one feat broke the graph, but because the feat pass is the third independent validation stream to converge on the same kind of missing refinement, and several of the gaps are clearly real rather than stylistic.

## Group Verdicts

### Group A — passive modifiers and persistent trainings

Feats: `Skilled`, `Ability Score Improvement`, `Defense`, `Archery`, `Boon of Truesight`.

Result:

- no new top-level family forced;
- exposes `grant_sense` and `grant_proficiency` as missing effect atoms;
- ASI is out-of-scope as pre-runtime character state modification;
- Defense and Archery validate `modify_ac` and `modify_roll` with no new pressure.

### Group B — spell-oriented grants and refunds

Feats: `Magic Initiate`, `Boon of Spell Recall`.

Result:

- no new top-level family forced;
- exposes `grant_spell_access` as a missing effect atom, parallel to Group A's grants;
- exposes **probabilistic resource refund** as a composition pattern not cleanly expressed by `consumes` / `release` / `restore`;
- validates that `use_count` + `rest_window` works creature-side the same way it works item-side.

### Group C — attack-adjacent riders

Feats: `Grappler`, `Savage Attacker`, `Great Weapon Fighting`, `Two-Weapon Fighting`, `Boon of Irresistible Offense`.

Result:

- no new top-level family forced;
- validates the On-Hit Rider subgraph (just added from masteries) under feat pressure;
- exposes `crit_window` as a missing window atom distinct from `on_hit_window`;
- exposes `bypass_resistance` as a missing effect atom;
- pressures typed subtypes of `modify_roll` (dice substitution, dice reroll with keep-higher, numeric bonus);
- echoes Nick's cross-rule weapon-property piggyback via Two-Weapon Fighting;
- records **relation-scoped effect** (Grappled by you) as a recurring but not yet first-class composition pattern.

### Group D — d20 interventions and activation self-buffs

Feats: `Alert`, `Boon of Combat Prowess`, `Boon of Fate`, `Boon of Dimensional Travel`, `Boon of the Night Spirit`.

Result:

- no new top-level family forced;
- exposes `initiative_window` as a missing window atom (Alert);
- exposes `post_action_window` / `action_end_window` as a missing window atom pressured by two independent feats (Dimensional Travel trigger, Night Spirit self-expiry);
- exposes `grant_resistance` as a missing effect atom, paired with Group C's `bypass_resistance`;
- records cross-actor roll observation, environment-state gate, and disjoint reset cadence as recording patterns.

## What Round 1 Strengthened

### 1. Multi-benefit feats fit without atom inflation

Grappler (4 benefits), Alert (2 benefits), Magic Initiate (4 benefits), Boon of the Night Spirit (2 benefits), and Boon of Irresistible Offense (2 benefits) all compose as multiple subgraphs hanging off one `feat_root`. The graph handles this cleanly — there is no need for a `feat_benefit` subunit atom.

### 2. On-Hit Rider generalizes beyond masteries

Three of five feats in Group C (Grappler, Savage Attacker, Boon of Irresistible Offense) use the on-hit rider subgraph directly. One more (Boon of Combat Prowess in Group D) uses the on-miss variant. The subgraph added from the mastery pass is clearly the right reusable shape.

### 3. Cross-rule composition is a real, recurring pattern

- Nick (mastery): rewrites the window of Light's extra attack.
- Two-Weapon Fighting (feat): modifies the damage of Light's extra attack.
- Both act on another rule's effect rather than producing a fresh effect.

This is enough independent data to record cross-rule composition as a pattern in the graph representation, even though it does not require a new atom.

### 4. Reset cadence vocabulary is complete enough

Across spells, items, masteries, and now feats, reset boundaries cluster into:

- once per turn (consumed, resets at turn start);
- once until next turn (consumed, resets at attacker's next turn start);
- once per short / long rest (consumed, resets on rest);
- until initiative / until rest (disjoint reset);
- while gated state holds (no consumption, gated on environment or worn state);
- on first qualifying trigger or later boundary, whichever first (Sap / Vex style).

All six reset shapes are expressible with existing `use_count`, `rest_window`, `turn_start_window`, `persist`, `expire`, and `persists_until`. No new cadence atom is needed.

### 5. `use_count` generalizes across owners

Magic Initiate's once-per-long-rest free cast is creature-owned. Pearl of Power's once-per-long-rest slot recovery is item-owned. Ring of Evasion's `1d3` recharge is item-owned with a random recharge cadence. All three use `use_count` + a reset boundary. The atom inventory does not need to distinguish creature-owned from item-owned resources at the atom level — ownership is edge-level via attachment.

## What Still Leaks (Serious Enough To Record As `v3` Pressure)

### A. Three "grant capability" effect atoms

Consistent across three independent feats:

- `grant_sense` (Truesight; parallel to `grant_hover`);
- `grant_proficiency` (Skilled);
- `grant_spell_access` (Magic Initiate's learned / always-prepared spell surface).

The graph already has specific `grant_*` atoms for hover and extra action. Senses, proficiencies, and spell-access grants follow the same template.

### B. Two damage-defense effect atoms

- `grant_resistance` with optional exception set (Boon of the Night Spirit: resistance to all damage except Psychic and Radiant);
- `bypass_resistance` by damage type family (Boon of Irresistible Offense: B/P/S damage ignores resistance).

These are paired — one shapes defense, the other bypasses it. Both appear in the feat pass and both are expected to recur in class features (Barbarian damage resistance), magic items (resistance rings), and spells (Protection from X).

### C. Two window atoms

- `initiative_window` (Alert): a named pre-combat roll trigger.
- `post_action_window` or `action_end_window` (Boon of Dimensional Travel trigger, Boon of the Night Spirit self-expiry): the moment an action / bonus action / reaction completes.

The second is especially strong: two independent feats in one group pressure it. It is consistent with the way `on_hit_window` and `on_miss_window` are specific post-resolution windows.

### D. One novel procedure / relation shape

Probabilistic resource refund (Boon of Spell Recall). The graph has `consumes` / `releases` / `restores`, but none of them express "consume happened, now conditionally reverse the consumption with a chance roll." Candidate atom additions are:

- a `refund` procedure atom (for the reversal operation);
- a `refunds` relation edge (parallel to `consumes` / `restores`).

### E. Typed subtypes on `modify_roll`

Four validation data points now:

- Sap / Vex (masteries): advantage/disadvantage;
- Savage Attacker (feat): dice reroll with keep-higher;
- Great Weapon Fighting (feat): dice substitution (1/2 → 3);
- Bless / Shield of Faith / Archery (spells + feat): numeric bonus.

These are mechanically distinct. `modify_roll` remains the right umbrella, but it should split into typed subtypes. The cleanest split is probably `modify_roll_numeric`, `modify_roll_advantage`, `modify_roll_reroll`, `modify_roll_substitute`, with the original atom retained as the category or removed entirely.

### F. Patterns worth visualizing in the graph representation

Composition patterns recorded but not requiring atoms:

- cross-rule composition (Nick, Two-Weapon Fighting);
- relation-scoped effect (Grappler's "Grappled by you");
- cross-actor roll observation (Boon of Fate);
- environment-state gate (Boon of the Night Spirit);
- disjoint reset cadence (Boon of Fate).

## Research Conclusion

For the first time across four validation streams (spells × 3 rounds, items × 2 rounds, masteries × 1 round, feats × 1 round), a validation pass exposes enough repeating, independent atom-level pressure to justify drafting `TAXONOMY_atoms_graph.md`.

The correct next moves are:

1. record the consolidated residue in `TAXONOMY_atoms_graph.md`'s "Known Remaining Weak Spots" so future passes do not re-derive it;
2. draft `TAXONOMY_atoms_graph.md` with the new atom candidates:
   - effect atoms: `grant_sense`, `grant_proficiency`, `grant_spell_access`, `grant_resistance`, `bypass_resistance`;
   - window atoms: `initiative_window`, `post_action_window`;
   - procedure / relation: `refund` / `refunds`;
   - typed split of `modify_roll` into numeric / advantage / reroll / substitute variants;
3. update the graph representation to include the recurring composition patterns (cross-rule, relation-scoped, cross-actor, environment-gated, disjoint reset);
4. plan the next widening pass — class features are the highest-pressure remaining source root, and they will test whether `v3` additions survive ownership and level-scaling stress;
5. defer schema design until the class-feature pass has exercised the updated taxonomy.
