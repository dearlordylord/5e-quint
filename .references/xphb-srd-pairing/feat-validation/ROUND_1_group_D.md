# Round 1 Group D

Feats:

- `Alert`
- `Boon of Combat Prowess`
- `Boon of Fate`
- `Boon of Dimensional Travel`
- `Boon of the Night Spirit`

Grounding:

- `xphb-srd-pairing/FEAT_VALIDATION_matrix_v0.md`
- `xphb-srd-pairing/TAXONOMY_atoms_graph_v2.md`
- `xphb-srd-pairing/TAXONOMY_graph_representation_v0.md`
- `.references/srd-5.2.1/Feats.md`

## Short Verdict

Group D fits `v2` at the top level and exposes two narrow pressures:

- **initiative** is a missing window atom (`initiative_window`) distinct from ordinary turn boundaries;
- **post-action window** (after Attack / Magic action completes) is a timing anchor not currently named.

Both gaps are narrow and consistent with the `on_miss_window` / `on_hit_window` precedent: specific named timing points that could be first-class atoms.

## `Alert`

- Nodes that fit:
  - `feat_root`
  - `modify_roll`
  - `post_roll_window`
  - `self`
  - `companion`
- Edges that fit:
  - `roots`
  - `grants`
  - `modifies`
- Multi-benefit structure:
  - **Initiative Proficiency**: numeric bonus (`Proficiency Bonus`) to the initiative roll. Fits `modify_roll` plus an initiative-specific trigger.
  - **Initiative Swap**: immediately after rolling initiative, optionally swap with a willing ally's initiative. Requires:
    - a post-initiative-roll decision point;
    - a target that is a separate creature;
    - a swap operation on an ordering variable (initiative rank), not on a damage/condition effect.
- What leaks:
  - **initiative** is not an existing window atom. It is not a turn start/end, not an action/bonus-action window, not a cast window. It is a fresh named event that opens a post-roll decision point.
  - the swap operation acts on the initiative ordering itself. There is no current effect atom for "reorder turn sequence" or "swap a fact between two creatures."
  - `post_roll_window` comes close for the timing, but the initiative roll is not the same kind of roll as attack/save/ability rolls that `post_roll_window` already covers.
- Ownership:
  - creature-owned;
  - legality gate requires neither creature to have `Incapacitated`.
- Verdict:
  - fits `v2` structurally for the proficiency bonus side;
  - exposes a missing `initiative_window` (or a typed extension of `post_roll_window` to cover initiative) for the swap side;
  - the "swap two facts between creatures" operation is novel but narrow — probably expressible via a pair of assignments on turn order rather than a new effect atom.

## `Boon of Combat Prowess`

- Nodes that fit:
  - `feat_root`
  - `respond`
  - `attack_roll`
  - `on_miss_window`
  - `replace`
  - `use_count`
  - `turn_start_window`
- Edges that fit:
  - `roots`
  - `opens_window`
  - `replaces`
  - `consumes`
  - `persists_until`
- What leaks:
  - **miss-to-hit rewrite**: "when you miss with an attack roll, you can hit instead." This is a post-roll replacement of the outcome. `replace` procedure + `replaces` relation carry this cleanly.
  - reset is "until the start of your next turn" — standard `use_count` + `turn_start_window`.
- Ownership:
  - creature-owned once-until-next-turn fence.
- Verdict:
  - fits `v2` cleanly;
  - one of the cleanest validations in the feat pass for the on-miss subgraph and the once-until-next-turn fence together.

## `Boon of Fate`

- Nodes that fit:
  - `feat_root`
  - `respond`
  - `post_roll_window`
  - `modify_roll`
  - `use_count`
  - `rest_window`
- Edges that fit:
  - `roots`
  - `opens_window`
  - `grants`
  - `consumes`
  - `persists_until`
- What leaks:
  - **cross-actor trigger**: "when you or another creature within 60 feet of you succeeds on or fails a D20 Test." The trigger watches another creature's roll, not only the feat-holder's. The graph's `post_roll_window` is currently attached to a specific roll; the cross-actor scoping is not explicit, though composition can express it.
  - **bidirectional modifier**: the 2d4 can be applied as either a bonus OR a penalty. The atom graph treats these as one `modify_roll` with a numeric value that could be positive or negative; fine at the atom level but the signed-choice is worth noting.
  - **mixed reset**: "until you roll Initiative or finish a Short Rest or Long Rest." The reset is a disjunction of three boundaries. The graph can express this as `persists_until` with multiple boundaries, though currently no example names a disjoint reset.
- Ownership:
  - creature-owned mixed-reset rider.
- Verdict:
  - fits `v2` for the core shape;
  - pressures cross-actor roll observation and disjoint reset cadence as two narrow but recurring patterns.

## `Boon of Dimensional Travel`

- Nodes that fit:
  - `feat_root`
  - `action_window`
  - `move`
  - `self`
- Edges that fit:
  - `roots`
  - `opens_window`
  - `grants`
- What leaks:
  - **post-action trigger**: "immediately after you take the Attack action or the Magic action." This is a post-completion rider attached to specific named actions.
  - the atom graph has `action_window` (the action itself) and `post_roll_window` (after a roll), but not a named `post_action_window` or `action_end_window` for the moment an action completes.
  - this pattern is already hinted at by Boon of the Night Spirit's self-expiry ("immediately after you take an action, a Bonus Action, or a Reaction") and is worth naming uniformly.
- Ownership:
  - creature-owned, no reset cadence, available every qualifying action.
- Verdict:
  - fits `v2` at the top level;
  - exposes `post_action_window` (or `action_end_window`) as a candidate window atom;
  - teleport itself is cleanly expressed by `move` + `self` + range.

## `Boon of the Night Spirit`

- Nodes that fit:
  - `feat_root`
  - `bonus_action_window`
  - `apply_condition` (Invisible)
  - `self`
  - `persist`
  - `expire`
- Edges that fit:
  - `roots`
  - `opens_window`
  - `grants`
  - `persists_until`
- Multi-benefit structure:
  - **ASI**: out-of-scope.
  - **Merge with Shadows**: bonus-action grant of `Invisible` condition, gated on environment (`Dim Light` or `Darkness`), with explicit self-expiry "immediately after you take an action, a Bonus Action, or a Reaction."
  - **Shadowy Form**: passive damage resistance to all damage except Psychic and Radiant, gated on the same environment.
- What leaks:
  - **environment gate**: "while within Dim Light or Darkness" is a state condition that drives both benefits. The graph has `attaches_to` but not a named "environment-state gate."
  - **self-expiry on action consumption**: same `post_action_window` / `action_end_window` gap as Boon of Dimensional Travel, but here used as an expiry boundary rather than a trigger.
  - **broad resistance with exception set**: Resistance to all damage except Psychic and Radiant. The graph does not have a `grant_resistance` atom — `modify_roll` / damage modifier is too generic to carry this.
- Ownership:
  - creature-owned bonus-action self-buff with self-expiry;
  - creature-owned environment-gated passive resistance.
- Verdict:
  - fits `v2` structurally for the bonus-action self-buff;
  - exposes `grant_resistance` (or more generally `modify_damage_taken`) as a candidate effect atom, paralleling Boon of Irresistible Offense's `bypass_resistance`;
  - exposes the environment-state gate as a recurring prerequisite pattern.

## Cross-Feat Findings

1. All five feats use some form of d20, post-roll, or post-action timing. Three (Alert, Boon of Combat Prowess, Boon of Fate) operate on a d20 outcome. Two (Boon of Dimensional Travel, Boon of the Night Spirit) operate on action completion.
2. **Initiative as a window atom** is newly pressured — the graph does not name it.
3. **Post-action window** is pressured by two independent feats (Dimensional Travel trigger, Night Spirit self-expiry), making it the strongest missing-window candidate from this group.
4. **Grant resistance** and **bypass resistance** are paired effect-atom gaps; this group pressures the former, Group C pressured the latter. Both point at a typed damage-defense interaction family that `v2` does not name.
5. **Cross-actor trigger** (Boon of Fate observes another creature's d20) is a new relation pressure but does not force a new atom — `respond` + `post_roll_window` + a wider attachment scope is enough composition.
6. **Disjoint reset cadence** (Boon of Fate: initiative OR short rest OR long rest) is a recording observation. `persists_until` already permits multiple boundaries in principle; no new atom needed.

## New Node / Edge Family

Group D does **not** force a new top-level node or edge family.

Candidate window additions recorded:

- `initiative_window` (for pre-combat roll triggers);
- `post_action_window` or `action_end_window` (for riders and expiries anchored to action completion).

Candidate effect additions recorded:

- `grant_resistance` with an optional exception set (paired with Group C's `bypass_resistance`).

Patterns recorded:

- cross-actor roll observation (self triggers on another creature's d20);
- environment-state gate as a recurring prerequisite shape;
- disjoint reset cadence (multiple reset boundaries joined by OR).
