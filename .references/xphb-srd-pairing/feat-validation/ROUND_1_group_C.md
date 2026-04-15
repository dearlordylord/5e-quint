# Round 1 Group C

Feats:

- `Grappler`
- `Savage Attacker`
- `Great Weapon Fighting`
- `Two-Weapon Fighting`
- `Boon of Irresistible Offense`

Grounding:

- `xphb-srd-pairing/FEAT_VALIDATION_matrix_v0.md`
- `xphb-srd-pairing/TAXONOMY_atoms_graph.md`
- `xphb-srd-pairing/TAXONOMY_graph_representation.md`
- `.references/srd-5.2.1/Feats.md`

## Short Verdict

Group C validates the On-Hit Rider subgraph (just added from the mastery pass) under feat pressure and exposes three narrower observations:

- **damage-roll modification has at least three subtypes** that currently all live under the informal `modify_roll`/damage interaction: dice substitution (Great Weapon Fighting), dice reroll with keep-higher (Savage Attacker), and extra damage on a crit (Boon of Irresistible Offense);
- **cross-rule weapon-property piggyback** appears again (Two-Weapon Fighting modifies Light's bonus attack damage), echoing the Nick mastery case;
- **resistance bypass** (Boon of Irresistible Offense) has no current effect atom;
- **crit window** is not a named window atom.

None of these force a new top-level family. All look like narrow atom-subtype or window-atom additions.

## `Grappler`

- Nodes that fit:
  - `feat_root`
  - `on_hit_window`
  - `target`
  - `use_count`
  - `turn_start_window`
  - `apply_condition` (Grappled)
  - `modify_roll`
  - `persist`
- Edges that fit:
  - `roots`
  - `opens_window`
  - `attaches_to`
  - `grants`
  - `consumes`
  - `persists_until`
- Multi-benefit structure:
  - **ASI**: out-of-scope character stat modification.
  - **Punch and Grab**: on-hit rider on Unarmed Strike, once per turn, applies the `Grappled` condition without replacing the normal damage.
  - **Attack Advantage**: persistent `modify_roll` (advantage) scoped to "creatures Grappled by you."
  - **Fast Wrestler**: movement rule override scoped to the same relation.
- What leaks:
  - **relation-scoped effect**: Attack Advantage and Fast Wrestler both apply while the relation `Grappled by you` holds. The graph has `attaches_to` and `mark`/`transfer_mark`, but relation-scoped conditional effects are not explicitly named — the condition on the target plus the attacker identity together form the scope.
  - **movement rule override**: "you don't have to spend extra movement" is a very local rewrite of the ordinary movement-cost rule. The graph has `force_move` and `move`, but no generic "override movement cost" effect. This overlaps with Nick's window-reassignment pattern — a rule-modifying-another-rule effect.
  - **same-action restriction**: "as part of the Attack action on your turn" restricts the trigger to a specific parent action.
- Ownership:
  - creature-owned once-per-turn fence on Punch and Grab;
  - creature-owned persistent relation scope for Attack Advantage and Fast Wrestler.
- Verdict:
  - this is the densest multi-atom feat in the sample;
  - fits `v2` as four independent subgraphs hanging off one `feat_root`;
  - confirms that feats with four named benefits can be expressed cleanly without a new atom family, but pressures **relation-scoped effect** as a pattern worth naming.

## `Savage Attacker`

- Nodes that fit:
  - `feat_root`
  - `on_hit_window`
  - `target`
  - `damage`
  - `use_count`
  - `turn_start_window`
- Edges that fit:
  - `roots`
  - `opens_window`
  - `grants`
  - `consumes`
  - `persists_until`
- What leaks:
  - **dice reroll with keep-higher**: "roll the weapon's damage dice twice and use either roll against the target" is a reroll-and-choose modifier on the damage roll. `modify_roll` does not currently distinguish:
    - numeric bonus;
    - advantage/disadvantage on a d20;
    - damage-die substitution;
    - damage-die reroll with keep-higher.
  - the atom graph treats these all as `modify_roll`, but they are mechanically distinct operations.
- Ownership:
  - creature-owned once-per-turn fence.
- Verdict:
  - fits `v2` at the top level;
  - reinforces the same `modify_roll` subtype pressure raised by Sap/Vex in the mastery pass, extended now to damage rolls.

## `Great Weapon Fighting`

- Nodes that fit:
  - `feat_root`
  - `damage`
  - `attack_roll`
- Edges that fit:
  - `roots`
  - `modifies`
- What leaks:
  - **dice substitution**: "treat any 1 or 2 on a damage die as a 3" is a number-substitution on individual dice, not a reroll or a bonus;
  - the weapon-property-and-grip gate ("two hands" + `Two-Handed` or `Versatile`) is a narrow prerequisite;
  - another data point for the damage-roll modifier subtype pressure started by Savage Attacker.
- Ownership:
  - creature-owned passive modifier conditional on grip and weapon property.
- Verdict:
  - fits `v2` at the top level;
  - second data point confirming damage-roll modifier subtypes are mechanically distinct.

## `Two-Weapon Fighting`

- Nodes that fit:
  - `feat_root`
  - `damage`
  - `bonus_action_window`
- Edges that fit:
  - `roots`
  - `modifies`
- What leaks:
  - **cross-rule weapon-property piggyback**: this feat modifies the damage of the extra attack granted by the `Light` weapon property. That is the same cross-rule pattern the Nick mastery used to reassign the window of Light's extra attack.
  - this strongly reinforces that cross-rule modifications are a recurring shape worth visualizing in the graph representation.
- Ownership:
  - creature-owned conditional damage modifier on the Light-property bonus attack.
- Verdict:
  - fits `v2` via `replaces` / `modifies` on another rule's effect;
  - pressures naming cross-rule composition as a pattern (same finding as the Nick mastery).

## `Boon of Irresistible Offense`

- Nodes that fit:
  - `feat_root`
  - `attack_roll`
  - `damage`
  - `self`
  - `persist`
- Edges that fit:
  - `roots`
  - `grants`
  - `modifies`
- Multi-benefit structure:
  - **ASI**: out-of-scope stat modification.
  - **Overcome Defenses**: passive modifier that makes the creature's bludgeoning/piercing/slashing damage ignore Resistance. This is a new effect atom candidate: `bypass_resistance` or similar.
  - **Overwhelming Strike**: extra damage when rolling a natural 20 on an attack roll. This is an on-crit rider. The graph does not name `crit_window` or `natural_20` as a window atom.
- What leaks:
  - **resistance bypass**: no atom today. The graph has `damage` as an effect but no typed modifier that says "damage you deal ignores Resistance of type X." This is parallel to Graze's scaling-lock observation but operates on the target's defense rather than the source's scaling.
  - **crit window**: "when you roll a 20 on the d20 for an attack roll" is a specific trigger point distinct from generic `on_hit_window`. Crit-specific riders appear in many spells and class features (Paladin smites, Barbarian brutal critical, etc.) and should be a window atom.
- Ownership:
  - creature-owned passive (Overcome Defenses);
  - creature-owned on-crit rider (Overwhelming Strike).
- Verdict:
  - fits `v2` at the top level for Overwhelming Strike via `attack_roll` + `post_roll_window`-like filter + extra `damage`;
  - but exposes two missing atom candidates: `bypass_resistance` (effect) and `crit_window` (window).

## Cross-Feat Findings

1. Four of five feats in this group validate the On-Hit Rider subgraph as generalizable beyond masteries.
2. Three of five feats (Savage Attacker, Great Weapon Fighting, Boon of Irresistible Offense) pressure damage-roll modifier subtypes. Combined with Sap/Vex from masteries, this is now four validation data points for splitting `modify_roll` into typed variants.
3. Grappler is the densest multi-atom feat and validates that one `feat_root` can carry four independent benefit subgraphs without atom inflation.
4. Two-Weapon Fighting echoes Nick in reinforcing cross-rule weapon-property piggyback as a recurring composition pattern.
5. Boon of Irresistible Offense is the only feat in the group to expose two candidate new atoms (`bypass_resistance`, `crit_window`), both of which are expected to recur widely.
6. Relation-scoped effects (Grappler's "Grappled by you") are a new pressure not yet seen in other streams; worth recording but not yet forcing.

## New Node / Edge Family

Group C does **not** force a new top-level node or edge family.

Candidate atom additions recorded:

- `crit_window` as a window atom distinct from `on_hit_window`;
- `bypass_resistance` as an effect atom distinct from raw `damage`;
- typed subtypes of `modify_roll` (numeric bonus / advantage / dice substitution / dice reroll).

Patterns recorded:

- relation-scoped effect (state-on-target-plus-attacker) as a reusable composition shape;
- cross-rule weapon-property piggyback (shared with Nick) as a recurring shape worth visualizing.
