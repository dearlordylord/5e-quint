# Feat Validation Matrix v0

Purpose:

- widen validation beyond spells, items, and masteries;
- test `TAXONOMY_atoms_graph.md` and `TAXONOMY_graph_representation.md` against the closed 2024 SRD feat catalog;
- exercise the `feat_root` source atom, which has had pilot enrichment but no atom-level validation;
- stress multi-atom-per-unit composition, denser trigger vocabulary, mixed reset cadences, and non-attack rider shapes that masteries did not pressure.

## Why This Sample

The full SRD 5.2.1 feat catalog is only 17 units, so Round 1 covers the whole catalog in a single pass. Feats are the strongest per-unit composition pressure in the local corpus:

- they frequently bundle two to four named benefits under one unit;
- they mix passive modifiers, triggered riders, activated self-buffs, and spell-grants in arbitrary combinations;
- they touch most of the graph's effect atoms side by side;
- they stress reset cadence beyond "per turn": short/long rest, until initiative, until next turn start, until first trigger event;
- they introduce rider shapes that masteries did not: probabilistic resource refund, d20 intervention across actors, cross-rule weapon-property piggyback, post-action movement, sense grants, damage-resistance bypass.

If the graph is holding, feats should fit as composition of existing atoms plus zero to a few typed refinements. If the graph is not holding, feats should force a new top-level node or edge family.

## Canonical Sample

All 17 feats in SRD 5.2.1.

### Origin Feats

1. `Alert`
2. `Magic Initiate`
3. `Savage Attacker`
4. `Skilled`

### General Feats

5. `Ability Score Improvement`
6. `Grappler`

### Fighting Style Feats

7. `Archery`
8. `Defense`
9. `Great Weapon Fighting`
10. `Two-Weapon Fighting`

### Epic Boon Feats

11. `Boon of Combat Prowess`
12. `Boon of Dimensional Travel`
13. `Boon of Fate`
14. `Boon of Irresistible Offense`
15. `Boon of Spell Recall`
16. `Boon of the Night Spirit`
17. `Boon of Truesight`

Source text: `.references/srd-5.2.1/Feats.md`.

## Grouping For Review

### Group A: passive modifiers and persistent trainings

- `Skilled`
- `Ability Score Improvement`
- `Defense`
- `Archery`
- `Boon of Truesight`

Shape: always-on while gating state holds. Tests numeric bumps to characters, proficiency grants, equipment-gated passives, persistent sense grants.

### Group B: spell-oriented grants and refunds

- `Magic Initiate`
- `Boon of Spell Recall`

Shape: the unit either grants new casting surface or intervenes in an existing cast's resource outcome. Tests feat-granted spell menus with per-rest free casts and probabilistic slot refund.

### Group C: attack-adjacent riders

- `Grappler`
- `Savage Attacker`
- `Great Weapon Fighting`
- `Two-Weapon Fighting`
- `Boon of Irresistible Offense`

Shape: the unit attaches to an attack roll, damage roll, or hit outcome. Tests the just-added On-Hit Rider subgraph under feat pressure, plus damage-die rewriting, damage rerolling, cross-rule weapon-property piggyback, and crit-window triggers.

### Group D: d20 interventions and activation self-buffs

- `Alert`
- `Boon of Combat Prowess`
- `Boon of Fate`
- `Boon of Dimensional Travel`
- `Boon of the Night Spirit`

Shape: the unit triggers on a d20 result, post-action boundary, or initiative roll. Tests post-roll intervention across actors, miss-to-hit rewrite, post-action movement rider, and bonus-action self-buff with self-expiry.

## Validation Questions

For each feat, check:

1. which existing `v2` nodes and edges actually fit?
2. does the feat bundle multiple independent benefit subgraphs under a single `feat_root`?
3. does it force any new top-level node or edge family?
4. does it force or strengthen a reusable subgraph beyond current ones?
5. is reset cadence (per turn, per short rest, per long rest, until initiative, until first trigger) representable with current lifecycle atoms?
6. does it expose missing effect atoms (sense grants, proficiency grants, resistance bypass)?
7. does it expose missing window atoms (post-action window, crit window, roll-against-any-creature window)?
8. does it pressure typed distinctions inside `modify_roll` (numeric bonus vs advantage/disadvantage vs rerolls vs dice substitution)?

## Expected Pressure Areas

- multi-benefit feat containers with heterogeneous subunits;
- sense-grant and proficiency-grant gaps in the effect atom inventory;
- probabilistic resource refund as a post-cast rider;
- cross-actor d20 intervention (self triggers on another creature's d20);
- post-action / post-completion window as a timing anchor;
- crit-window / natural-20 anchor;
- cross-rule weapon-property piggyback (same pattern as Nick);
- damage-die substitution and reroll as subtypes on damage rolls;
- relation-scoped advantage where scope is a state like `Grappled by you`.

## Outcome Rule

If this pass exposes only:

- better composition of existing atoms;
- a small number of additional reusable subgraphs;
- typed refinements or noted gaps that do not individually force a new family;

then the graph is still holding and `TAXONOMY_atoms_graph.md` is not justified.

If this pass exposes a repeated missing node or edge family across multiple feats, record it before considering a `v3` draft.
