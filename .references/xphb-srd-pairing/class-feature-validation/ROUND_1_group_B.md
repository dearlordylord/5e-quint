# Round 1 Group B

Features:

- `Uncanny Dodge` (Rogue, Level 5)
- `Deflect Attacks` (Monk, Level 3)
- `Evasion` (Rogue, Level 7)
- `Relentless Rage` (Barbarian, Level 11)

Grounding:

- `xphb-srd-pairing/CLASS_FEATURE_VALIDATION_matrix_v0.md`
- `xphb-srd-pairing/TAXONOMY_atoms_graph_v3.md`
- `xphb-srd-pairing/TAXONOMY_graph_representation_v0.md`
- `.references/srd-5.2.1/Classes/Rogue.md`, `Monk.md`, `Barbarian.md`

## Short Verdict

Group B validates the Prepare / Prompt / Commit subgraph under class-feature pressure and exposes two narrow pressures:

- **damage reduction / mitigation as a first-class effect**: Uncanny Dodge halves damage, Deflect Attacks reduces damage by a computed amount. `v3` has `grant_resistance` (which is a typed damage-taken reducer) and `modify_roll_*` variants, but does not have a generic `reduce_damage_taken` effect atom distinct from resistance. Worth recording but not yet forcing.
- **on-damage window**: the reaction trigger for Uncanny Dodge and Deflect Attacks is "when an attacker hits you," which is the **target's** view of `on_hit_window`. The graph has `on_hit_window` as a timing atom; it already generalizes across attacker- and target-attached riders. Verified by this group.

Relentless Rage introduces a fresh shape — **0-HP reversal** with escalating DC — that still fits `v3` structurally via `respond` + `save_gate` + `heal` + `use_count` with rest-based reset. No new family is forced.

## `Uncanny Dodge`

- Nodes that fit:
  - `class_feature_root`
  - `respond`
  - `reaction_window`
  - `on_hit_window` (from the target's perspective)
  - `prepare`
  - `prompt`
  - `commit`
  - `self`
  - `modify_roll_numeric` (halving the damage is a numeric transformation, though not on a roll)
- Edges that fit:
  - `roots`
  - `opens_window`
  - `prepares`
  - `prompts`
  - `commits`
  - `grants`
- What leaks:
  - **damage halving** is not a roll modification; it is a post-resolution damage-number transformation. `modify_roll_numeric` is the closest atom but it is intended for d20 rolls, not for damage totals.
  - the graph does not have a `reduce_damage_taken` effect atom. `grant_resistance` is close but is always "halve all damage of a type" — Uncanny Dodge halves the damage of a specific attack instance, not all damage of a type.
  - narrow gap worth recording: `reduce_damage_taken` as a possible atom, distinct from `grant_resistance`.
- Ownership:
  - creature-owned reaction, no resource cost, available on every qualifying attack.
- Verdict:
  - fits `v3` for the trigger and decision shape;
  - pressures a gap in effect atoms for damage-reduction that is not resistance-shaped.

## `Deflect Attacks`

- Nodes that fit:
  - `class_feature_root`
  - `respond`
  - `reaction_window`
  - `on_hit_window`
  - `prepare`
  - `prompt`
  - `commit`
  - `self`
  - `use_count` (Focus Point, optional)
  - `save_gate` (for the redirected attack)
  - `damage`
  - `target`
- Edges that fit:
  - `roots`
  - `opens_window`
  - `prepares`
  - `prompts`
  - `commits`
  - `consumes`
  - `grants`
  - `branches_on_save`
- What leaks:
  - same `reduce_damage_taken` gap as Uncanny Dodge: the reduction is `1d10 + Dex mod + Monk level`, not a type-scoped resistance.
  - **conditional escalation** via Focus Point: if the reduction brings the damage to 0, the Monk can optionally spend 1 Focus Point to redirect force as damage to another creature. This is a nested `if` on the reaction outcome: first reduce, then if reduced-to-zero, then optionally pay to redirect.
  - redirection uses `save_gate` with a class-rooted DC (Monk Wisdom-based) and applies damage of the attack's original type.
  - this is a **conditional payment after resolution**: the player decides whether to pay only after seeing the reduction outcome. Worth naming; comparable to Brutal Strike's multi-effect choice structure.
- Ownership:
  - creature-owned reaction with optional pool expenditure;
  - redirection targets a separately-chosen creature.
- Verdict:
  - fits `v3` structurally;
  - reinforces the `reduce_damage_taken` gap from Uncanny Dodge;
  - introduces a **conditional payment after resolution** pattern worth noting but not atomizing.

## `Evasion`

- Nodes that fit:
  - `class_feature_root`
  - `respond`
  - `save_gate`
  - `branches_on_save`
  - `damage`
  - `self`
- Edges that fit:
  - `roots`
  - `opens_window`
  - `branches_on_save`
  - `modifies`
- What leaks:
  - **two-path save branch rewrite**: normal save-for-half is "success = half, fail = full." Evasion rewrites this to "success = 0, fail = half." This is a typed modification to the save branch outcome tables rather than a rider on a specific spell. The graph can express this via `branches_on_save` but does not name "rewrite the branch outcome table for a class of incoming save effects."
  - **gating on state**: "can't use if Incapacitated" is a legality gate already expressible via attachment prerequisites.
  - the feature operates on **any** Dex-save-for-half effect, not on a specific trigger instance. This is a passive rewrite of a category of effects, closer to Shield of Faith's always-on buff than to a reaction.
- Ownership:
  - creature-owned passive rewrite of a class of save outcomes.
- Verdict:
  - fits `v3` as a branch-rewrite effect;
  - records "rewrite the branch outcome table for a category of effects" as a narrow pattern;
  - this is not a new atom, just composition of `branches_on_save` with a rewriter role.

## `Relentless Rage`

- Nodes that fit:
  - `class_feature_root`
  - `respond`
  - `post_roll_window` (trigger is the damage that would drop to 0, which is a post-resolution event)
  - `save_gate` (Constitution save; DC 10 base, +5 per use)
  - `branches_on_save`
  - `heal` (on success, HP = 2 × Barbarian level)
  - `use_count` (implicit; counts successful uses to drive DC)
  - `rest_window` (short or long rest resets the DC)
- Edges that fit:
  - `roots`
  - `opens_window`
  - `branches_on_save`
  - `grants`
  - `persists_until`
- What leaks:
  - **escalating DC** based on usage count: "each time you use this feature after the first, the DC increases by 5." This is a state-machine where a fixed DC formula depends on the feature's own usage counter. The graph's `use_count` tracks consumption; it does not explicitly parameterize DC.
  - **0-HP reversal** is novel but structurally fits as `respond` + `save_gate` + conditional `heal`.
  - **two-layer gate**: (a) Rage must be active; (b) damage dropped you to 0. Both are prerequisites for the trigger.
  - **reset cadence via short or long rest** is familiar.
- Ownership:
  - creature-owned reaction with a usage counter influencing future DC.
- Verdict:
  - fits `v3` at the top level;
  - introduces **usage-count-parameterized DC** as a narrow pattern not seen before;
  - does not force a new atom — the counter is `use_count` and the DC is computed from it at evaluation time.

## Cross-Feature Findings

1. All four features fit `v3` at the top level. No new top-level node or edge family is forced.
2. **Damage reduction / mitigation** as a class of effects (Uncanny Dodge halving, Deflect Attacks computed reduction) pressures a gap in effect atoms distinct from `grant_resistance`. Worth recording as a potential `reduce_damage_taken` atom — but only one group has pressured it so far, so it stays in residue.
3. **Target-side on-hit window** is validated as a reuse of `on_hit_window` from the target's perspective. No new window atom needed.
4. **Prepare / Prompt / Commit subgraph** survives contact with class features and is especially clean for Uncanny Dodge and Deflect Attacks. The subgraph scales to reactions with optional resource escalation.
5. **Save-branch rewrite** (Evasion) is a typed composition of existing atoms, not a new atom family. It generalizes the save-for-half pattern without inventing a new branch type.
6. **0-HP reversal** (Relentless Rage) fits the reaction-with-save-gate pattern and only adds a usage-count-parameterized DC as narrow policy.
7. **Usage-count-parameterized DC** is a new pattern recording but not an atom — the counter and the DC formula are both expressible today.

## New Node / Edge Family

Group B does **not** force a new top-level node or edge family.

Candidate narrow atom recording (single-group pressure, not promoted):

- `reduce_damage_taken` as an effect atom distinct from `grant_resistance`, for features that halve or numerically reduce a specific attack's damage rather than applying type-scoped resistance. Second independent data point would come from Paladin Aura of Protection / Sanctuary-style spells if they recur; defer promotion.

Candidate pattern recording:

- conditional payment after resolution (Deflect Attacks' optional redirect);
- usage-count-parameterized DC (Relentless Rage);
- save-branch rewrite (Evasion).

All three are composition, not atoms.
