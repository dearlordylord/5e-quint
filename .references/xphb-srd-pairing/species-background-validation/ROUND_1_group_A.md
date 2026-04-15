# Round 1 Group A — Simple-Ancestry Species

Species:

- `Dwarf`
- `Halfling`
- `Human`
- `Orc`

Grounding:

- `xphb-srd-pairing/SPECIES_BACKGROUND_VALIDATION_matrix_v0.md`
- `xphb-srd-pairing/TAXONOMY_atoms_graph.md`
- `xphb-srd-pairing/TAXONOMY_graph_representation.md`
- `.references/srd-5.2.1/Character-Origins.md`

## Short Verdict

Group A fits `v3` cleanly. Every trait maps to existing atoms with no new node or edge family forced.

Confirms broadly:

- `grant_sense` validated for Darkvision with multiple ranges (Dwarf 120 ft, Orc 120 ft, later Gnome/Elf/Tiefling 60 ft) and Tremorsense (Dwarf Stonecunning, 60 ft, activation-gated);
- `grant_resistance` validated for Poison (Dwarf);
- `grant_proficiency` validated for skill proficiency (Human Skillful);
- `modify_roll_advantage` validated for condition-scoped advantages (Dwarven Resilience on Poisoned, Halfling Brave on Frightened);
- `use_count` + `rest_window` validated for per-Proficiency-Bonus cadence (Dwarf Stonecunning, Orc Adrenaline Rush);
- 0-HP reversal (Orc Relentless Endurance) fits the same shape as Barbarian Relentless Rage.

## `Dwarf`

- Nodes that fit:
  - `species_trait_root`
  - `grant_sense` (Darkvision 120 ft)
  - `grant_resistance` (Poison)
  - `modify_roll_advantage` (on Poisoned save)
  - `modify_max_hp` (Dwarven Toughness, per-level)
  - `activate`
  - `bonus_action_window` (Stonecunning)
  - `grant_sense` (Tremorsense 60 ft, time-boxed)
  - `use_count` (uses equal to PB)
  - `rest_window` (long rest)
  - `duration_window` (10 minutes)
  - `persist`
  - `expire`
- Multi-trait structure:
  - **Darkvision** → persistent `grant_sense`.
  - **Dwarven Resilience** → `grant_resistance(Poison)` plus `modify_roll_advantage` scoped to the Poisoned save.
  - **Dwarven Toughness** → per-level `modify_max_hp`. This is level-scaled HP max, a new data point for per-level scaling; scales with character level, not ability modifier.
  - **Stonecunning** → bonus-action activation granting time-boxed Tremorsense (`grant_sense`) with environmental gate ("stone surface"), PB-many uses, long-rest reset.
- What leaks:
  - **environment-state gate** (stone touch or surface contact) is an already-named pattern subgraph (K).
  - **per-PB use cadence** is `use_count` with the maximum parameter equal to the creature's Proficiency Bonus — a level-scaled cap on activations. No new atom needed; the max is just a computed parameter.
- Verdict:
  - fits `v3` cleanly;
  - `grant_sense` gets multiple data points in a single trait (Darkvision persistent + Tremorsense activated).

## `Halfling`

- Nodes that fit:
  - `species_trait_root`
  - `grant`
  - `modify_roll_advantage` (Brave on Frightened)
  - `modify_roll_reroll` (Luck on nat 1)
  - `restrict_action_set` (Naturally Stealthy allows Hide in obscured-by-larger-creature context)
  - `move` (Halfling Nimbleness: pass through larger creature's space)
- Multi-trait structure:
  - **Brave** → `modify_roll_advantage` on Frightened save.
  - **Halfling Nimbleness** → movement rule rewrite (can move through larger creature's space). Cross-rule composition with movement rules (subgraph H).
  - **Luck** → `modify_roll_reroll` scoped to a d20 rolled as a natural 1, with *must use new roll* semantics. This validates the `modify_roll_reroll` typed atom from `v3`'s typed split.
  - **Naturally Stealthy** → legality rewrite for the Hide action. Cross-rule composition with action-legality rules.
- What leaks:
  - **forced-keep reroll** ("you must use the new roll") is a narrow subtype of `modify_roll_reroll` distinct from keep-higher (Savage Attacker). The atom carries both; the narrow subtype is worth noting but not atomizing.
- Verdict:
  - fits `v3` cleanly;
  - second data point for `modify_roll_reroll` (first was Savage Attacker) validating the typed split;
  - keep-higher vs forced-keep is a narrow subtype pressure within `modify_roll_reroll`.

## `Human`

- Nodes that fit:
  - `species_trait_root`
  - `grant`
  - `grant_proficiency` (skill of choice)
  - `grant` + cross-reference to feat system (Versatile: origin feat of choice)
  - `choose`
  - Heroic Inspiration resource grant at long rest (Resourceful)
- Multi-trait structure:
  - **Resourceful** → gain Heroic Inspiration on long rest. This is a recurring condition-like resource grant. Heroic Inspiration is a narrative/metacurrency state; the atom graph can represent it as `grant` of a tracked state, but it does not have a dedicated atom. Defer naming until it repeats.
  - **Skillful** → one free skill proficiency. Single `grant_proficiency` instance with `choose`.
  - **Versatile** → one origin feat of choice. Cross-reference: a species trait grants a feat. Meta-level composition (species → feat → feat's subgraph).
- What leaks:
  - **meta-level grant** (species trait grants a feat that itself has a subgraph) is a new form of cross-rule composition. Feats are first-class units; granting one pulls in its entire subgraph. `v3` has `grant` + cross-rule composition, but the pattern of "grant another first-class unit as a unit" is worth recording.
  - **Heroic Inspiration** is a narrative mechanic; it interacts with D20 Tests (lets the creature reroll) and so has some mechanics. Currently unrepresented at the atom level.
- Verdict:
  - fits `v3` structurally;
  - introduces **meta-level grant** (unit-grants-another-unit) as a narrow observation. Parallels Background → Origin feat from Group C. Worth recording but single-species pressure is not enough to promote;
  - Heroic Inspiration is deferred as a narrative/meta state.

## `Orc`

- Nodes that fit:
  - `species_trait_root`
  - `activate`
  - `bonus_action_window` (Adrenaline Rush: Dash as Bonus Action, plus temp HP gain)
  - `grant` (Temporary HP)
  - `use_count` (per-PB uses)
  - `rest_window` (short or long rest)
  - `grant_sense` (Darkvision 120 ft)
  - `respond`
  - `post_roll_window` (Relentless Endurance triggers when reduced to 0 HP)
  - `heal` (drop-to-1 override)
- Multi-trait structure:
  - **Adrenaline Rush** → bonus action activation: Dash-as-Bonus-Action plus Temporary HP equal to PB. Uses per PB per rest.
  - **Darkvision** → persistent `grant_sense`, 120 ft.
  - **Relentless Endurance** → 0-HP reversal: drop to 1 HP instead of 0. Once per long rest. Identical shape to Barbarian Relentless Rage, but no save gate and fixed outcome (always drops to 1 HP).
- What leaks:
  - **0-HP reversal without save gate** is a narrower variant of Relentless Rage. Same `respond` + `post_roll_window` + fixed-outcome `heal` shape. Confirms the pattern generalizes.
  - **short OR long rest reset** cadence is familiar, already validated.
- Verdict:
  - fits `v3` cleanly;
  - second independent data point for 0-HP reversal pattern.

## Cross-Species Findings

1. All four species fit `v3` without forcing a new top-level family.
2. **`grant_sense` is strongly validated**: Darkvision at 60, 120 ft, and activation-gated Tremorsense at 60 ft.
3. **`grant_resistance` is validated** (Dwarf Poison) as the second data point after class features / feats.
4. **`modify_roll_reroll` is validated** (Halfling Luck) as a second independent data point for the typed `modify_roll_*` split. Numeric bonus, advantage/disadvantage, reroll, substitution all have independent corpus pressure now.
5. **Per-PB use cadence** (`use_count` with max = Proficiency Bonus) appears in Dwarf Stonecunning and Orc Adrenaline Rush. Same pattern confirmed for Dragonborn Breath (Group B). `use_count` handles this via parameterized max; no new atom needed.
6. **0-HP reversal** is a two-data-point pattern now (Relentless Rage + Relentless Endurance). Relentless Endurance has no save gate; Relentless Rage has escalating-DC save. Same shape core.
7. **Meta-level grant** (Human Versatile grants an origin feat) is a narrow new cross-rule pattern. Reappears in Group C (background grants origin feat). Worth recording.

## New Node / Edge Family

Group A does **not** force any new top-level node or edge family.

Candidate narrow atom recordings (all single-group, not promoted):

- **keep-higher vs forced-keep** as subtypes within `modify_roll_reroll`;
- **Heroic Inspiration** as a tracked narrative/meta state with some mechanics (deferred).

Candidate pattern recordings:

- meta-level grant (species/background grants a feat unit) — shared with Group C;
- 0-HP reversal with fixed outcome (Relentless Endurance) — narrow variant of the save-based reversal pattern.
