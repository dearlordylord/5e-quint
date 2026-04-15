# Class Feature Validation Matrix v0

Purpose:

- validate `TAXONOMY_atoms_graph_v3.md` against the SRD class corpus;
- exercise the `class_feature_root` source atom, which has had pilot enrichment but no atom-level validation;
- explicitly stress each atom `v3` added (typed `modify_roll_*`, `grant_sense` / `grant_proficiency` / `grant_spell_access` / `grant_resistance` / `bypass_resistance`, `initiative_window` / `post_action_window`, `refund` / `refunds`) so that the new atoms either survive contact with stateful, level-gated features or force revision;
- stress patterns named in the graph representation (On-Hit Rider, Cross-Rule Composition, Relation-Scoped Effect, Cross-Actor Roll Observation, Environment-State Gate, Disjoint Reset Cadence) against class-feature pressure.

## Why This Sample

Class features are the largest and most stateful source root in the SRD corpus:

- they are level-gated and often scale with level;
- they frequently own runtime pool state (Rage uses, Focus Points, Bardic Inspiration dice, Channel Divinity uses, spell slots);
- they mix activation, reaction, and persistent-passive shapes within a single class, and sometimes within a single feature;
- they introduce rest-based refresh cadences (short rest, long rest, mixed) and feature-specific refresh cadences (on initiative);
- they include the clearest `refund` pressure in the corpus (Arcane Recovery);
- they include the clearest `initiative_window` pressure in the corpus (Feral Instinct, Uncanny Metabolism, Persistent Rage);
- they include multiple on-hit riders that stress the On-Hit Rider subgraph under scaling and gating (Sneak Attack, Brutal Strike, Stunning Strike);
- they include the clearest `grant_spell_access` pressure (Spellcasting).

A 16-feature sample across four groups covers those pressures without attempting full-family enrichment.

## Canonical Sample

### Group A: stateful resource pools

1. `Rage` (Barbarian, Level 1)
2. `Bardic Inspiration` (Bard, Level 1)
3. `Arcane Recovery` (Wizard, Level 1)
4. `Action Surge` (Fighter, Level 2)
5. `Monk's Focus` (Monk, Level 2)

### Group B: reactions and conditional responses

6. `Uncanny Dodge` (Rogue, Level 5)
7. `Deflect Attacks` (Monk, Level 3)
8. `Evasion` (Rogue, Level 7)
9. `Relentless Rage` (Barbarian, Level 11)

### Group C: persistent passives and grants

10. `Unarmored Defense` (Barbarian, Level 1)
11. `Feral Instinct` (Barbarian, Level 7)
12. `Danger Sense` (Barbarian, Level 2)
13. `Spellcasting` (Wizard, Level 1)

### Group D: attack riders and level scaling

14. `Sneak Attack` (Rogue, Level 1)
15. `Extra Attack` (Barbarian / Fighter / others, Level 5)
16. `Lay On Hands` (Paladin, Level 1)

Source text: `.references/srd-5.2.1/Classes/`.

## Grouping Rationale

- **Group A** stresses resource pools with heterogeneous refresh cadences (long rest, short-rest partial, short-rest full, mixed), tests `refund` via Arcane Recovery, and probes whether Monk's Focus pressures an "options menu" subgraph that spells and items did not.
- **Group B** stresses the Prepare / Prompt / Commit subgraph, save-branching, and the on-damage reaction window for post-roll interventions. Relentless Rage probes the 0-HP reversal pattern that the atom graph has not validated before.
- **Group C** stresses `v3`'s new grant atoms and window atoms directly (initiative, advantage on saves, spell access). Unarmored Defense also tests a class-owned AC-formula override that rewrites the baseline AC calculation — structurally close to a cross-rule rewrite.
- **Group D** stresses level-scaling dice (Sneak Attack), action-count multipliers (Extra Attack), and pool-scoped heal/remove composition (Lay on Hands).

## Validation Questions

For each feature, check:

1. which `v3` nodes and edges actually fit?
2. does the feature force any new top-level node or edge family?
3. does it surface an atom `v3` added that had only single-feat pressure before (e.g., `refund`, `initiative_window`)? Is the second independent data point enough to keep it in the inventory?
4. does it pressure or strengthen any subgraph beyond what the graph representation names?
5. is reset cadence representable with existing lifecycle atoms?
6. does multi-benefit bundling (Rage, Monk's Focus, Spellcasting) fit as multiple subgraphs off one `class_feature_root`, the same way Grappler and Boon of the Night Spirit did for feats?
7. does level scaling fit the existing scaling atoms, or does it pressure a new scaling concept (die-size scaling, attack-count scaling)?
8. does pool-based expenditure (Focus Points with an options menu, Lay on Hands as a distributable HP pool) force a new atom, or does it compose cleanly from `use_count` / `charge` with a choose/branch structure?

## Expected Pressure Areas

- second independent data point for `refund` (Arcane Recovery) after Boon of Spell Recall;
- second independent data point for `initiative_window` (Feral Instinct) after Alert;
- first strong data point for `grant_spell_access` as a persistent class-level grant (Spellcasting);
- attack-count multiplier as a possible typed scaling variant (Extra Attack);
- die-size scaling as a possible typed scaling variant (Bardic Inspiration, Monk Martial Arts Die, Sneak Attack);
- option-menu resource expenditure (Monk's Focus, Channel Divinity analog);
- AC-formula override as a cross-rule rewrite (Unarmored Defense);
- 0-HP reversal with escalating DC (Relentless Rage);
- duration with extend-by-action semantics (Rage's turn-by-turn extension).

## Outcome Rule

If the pass exposes only:

- better composition of existing `v3` atoms;
- one or two new reusable subgraphs in the graph representation;
- second independent data points confirming `v3`'s new atoms;
- narrow typed-subtype or policy refinements;

then `v3` is holding and the next step is the species/background traits validation, not `v4`.

If the pass exposes a repeated missing node or edge family across multiple features, record it before considering a `v4` draft.
