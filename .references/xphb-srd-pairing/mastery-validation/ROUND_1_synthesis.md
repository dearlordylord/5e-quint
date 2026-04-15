# Round 1 Mastery Synthesis

Purpose:

- aggregate the first mastery-side validation pass against `TAXONOMY_atoms_graph.md` and `TAXONOMY_graph_representation.md`;
- determine whether the closed 2024 mastery set forces a taxonomy revision;
- decide whether mastery pressure justifies `TAXONOMY_atoms_graph.md` or a targeted graph-representation refinement.

## Short Answer

The eight masteries do **not** justify `TAXONOMY_atoms_graph.md`.

No group forces a new top-level node family or edge family. The core shapes all reuse existing atoms: `mastery_root`, `attack_roll`, `on_hit_window`, `on_miss_window`, `target`, `force_move`, `modify_roll`, `modify_speed`, `damage`, `save_gate`, `branches_on_save`, `apply_condition`, `use_count`, `turn_start_window`, `turn_end_window`, `expire`, `replace`.

What this pass did expose is one useful reusable subgraph addition and a handful of narrow residue observations worth recording explicitly.

## Group Verdicts

### Group A — pure on-hit riders

Masteries: `Push`, `Sap`, `Slow`, `Vex`.

Result:

- no new top-level family forced;
- validates on-hit rider shape with no resource cost;
- exposes three narrow pressures:
  - advantage/disadvantage typing on `modify_roll` (Sap, Vex);
  - one-shot rider expiry with mixed terminating conditions (Sap, Vex);
  - non-stacking / capped-aggregate effect policy (Slow).

### Group B — action-economy riders

Masteries: `Cleave`, `Nick`.

Result:

- no new top-level family forced;
- validates per-turn use fence (`use_count` + `turn_start_window`);
- exposes two narrow pressures:
  - rider-as-nested-attack composition (Cleave);
  - cross-rule window reassignment (Nick);
- exposes one scoped effect subtype pressure:
  - damage-modifier suppression on the nested attack (Cleave's "don't add your ability modifier").

### Group C — miss rider and save rider

Masteries: `Graze`, `Topple`.

Result:

- no new top-level family forced;
- validates `on_miss_window` as a real first-class timing atom (not spell-only);
- validates `save_gate` + `branches_on_save` with an attack-rooted DC, not only caster-rooted DCs;
- exposes two narrow pressures:
  - typed DC source variation (caster-rooted vs attack-rooted vs item-rooted);
  - scaling-lock constraint on which bonuses can modify a damage figure (Graze).

## What Round 1 Strengthened

### 1. On-hit rider is real, reusable, and worth naming as a subgraph

Seven of eight masteries instantiate the same core shape:

- a `mastery_root` wrapped around an `attack_roll`;
- an `on_hit_window` (or `on_miss_window` in the case of `Graze`);
- an `attaches_to(target)` edge;
- a `grants(effect)` edge into one or more effect atoms;
- an optional `persists_until` edge into a later boundary.

This is distinct enough from the existing `Prepare / Prompt / Commit` subgraph (which is about reaction-time resource decisions) that it deserves its own entry in `TAXONOMY_graph_representation.md`.

It is also distinct from the existing `Passive Projection` subgraph (which is about worn/held continuous effects): on-hit riders are one-shot and attached to attack resolution, not continuous and attached to wear/hold state.

### 2. `on_miss_window` is not vestigial

Prior to this pass, `on_miss_window` existed in the atom graph but had no concrete validated use. `Graze` validates it directly. This removes a latent "is this atom actually needed" question that could have forced a future deletion.

### 3. Per-turn fence pattern is validated

`Cleave` and `Nick` both explicitly say "only once per turn." Both map cleanly to `use_count` consumed by the mastery use and a `turn_start_window` as the `persists_until` boundary. This confirms that "once per turn" does not require a new atom.

### 4. Save DCs are not always caster-rooted

`Topple` roots its save DC in the attacker's ability modifier and proficiency bonus, not in a spellcasting ability. The graph carries this fine through attachment, but the observation matters because it confirms that DC sourcing is a typed property of the initiating resolution, not a global caster-rooted assumption.

### 5. Rider-as-nested-attack is legal composition

`Cleave` turns its rider into another `attack_roll`. The graph already admits this — a grant can point to any valid node including another resolution node. This was implicit before; the mastery pass makes it explicit.

## What Still Leaks

Round 1 leaves four narrow pressures worth recording as open work, but none of them justifies a new top-level atom family:

### A. Advantage/disadvantage typing on `modify_roll`

`modify_roll` currently carries both numeric bonuses (Bless, Shield of Faith) and advantage/disadvantage (Sap, Vex, Mantle of Spell Resistance). These are mechanically distinct: numeric bonuses stack under different rules than advantage/disadvantage, and d20 test math treats them differently. The graph should eventually distinguish them either via subtype or via separate atoms, but the residue from this pass is small enough to defer.

### B. First-of-two-events rider expiry

`Sap` and `Vex` both expire on whichever comes first:

- a specific triggering event (target's next attack roll; attacker's next attack roll against target);
- a later calendar boundary (start of attacker's next turn; end of attacker's next turn).

The individual atoms (`expire`, `turn_start_window`, `turn_end_window`) exist. The **composition pattern** — "ends on first satisfied condition across a set of disjoint triggers" — is not named. This is shared with future work on `Hunter's Mark`-like first-hit-of-turn bonuses and should be recorded, not atomized.

### C. Non-stacking / capped aggregate effect policy

`Slow` explicitly caps its speed reduction at 10 feet regardless of how many masters of Slow-weapons hit the same creature. The graph has no atom for "multiple rider instances merge rather than stack." This is shared with future work on exhaustion, multiple blesses, overlapping bardic inspiration, and concentration limits. It is architecturally real but still too narrow a sample to size correctly.

### D. Scoped damage-modifier suppression

`Cleave`'s "don't add your ability modifier to that damage unless that modifier is negative" is a localized override of the normal damage calculation for one nested attack. This looks like a subtype or policy parameter on `damage`, not a new effect atom. It echoes the scaling-lock constraint in `Graze` ("can be increased only by increasing the ability modifier") — both are constraints on future modification, not positive effect atoms.

## What This Means For The Taxonomy

The mastery pass is consistent with the prior spell and item passes:

- the top-level atom set in `v2` survives another validation round;
- the graph representation gains a useful new reusable subgraph (On-Hit Rider);
- residue is refinement pressure, not structural dishonesty.

This is the third validation stream (after spells and items) to converge on "v2 holds, the graph representation should absorb the new subgraph." That is meaningful evidence that the current atom inventory is close to right for the corpus it has been tested against.

## Research Conclusion

The correct next move is:

1. keep `TAXONOMY_atoms_graph.md` stable — no `v3` draft justified yet;
2. add a new "On-Hit Rider" subgraph entry to `TAXONOMY_graph_representation.md`;
3. record the four narrow residue observations in the taxonomy's "Known Remaining Weak Spots" section so they are not lost between validation rounds;
4. proceed to the next widening step — feats or class features — rather than iterating on masteries;
5. only draft `v3` if a future widening exposes structural dishonesty instead of composition / policy refinement.
