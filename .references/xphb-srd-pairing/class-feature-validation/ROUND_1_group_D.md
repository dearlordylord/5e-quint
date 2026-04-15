# Round 1 Group D

Features:

- `Sneak Attack` (Rogue, Level 1)
- `Extra Attack` (Barbarian / Fighter / others, Level 5)
- `Lay On Hands` (Paladin, Level 1)

Grounding:

- `xphb-srd-pairing/CLASS_FEATURE_VALIDATION_matrix_v0.md`
- `xphb-srd-pairing/TAXONOMY_atoms_graph_v3.md`
- `xphb-srd-pairing/TAXONOMY_graph_representation_v0.md`
- `.references/srd-5.2.1/Classes/Rogue.md`, `Fighter.md`, `Barbarian.md`, `Paladin.md`

## Short Verdict

Group D exposes one narrow but real pressure: **attack-count scaling** is distinct from other scaling variants and is not cleanly expressed by current scaling atoms. Extra Attack goes from "attack twice" at level 5 to "attack three times" at level 11 to "attack four times" at level 20 (Fighter). This is a typed scaling of attack count per action, not of damage dice or bonuses.

It also provides the expected second data point for **dice-count scaling** (Sneak Attack after Bardic Inspiration pressured die-size scaling), supporting the refinement of `scale_damage` into typed variants.

Lay on Hands validates **pool-as-resource** where a single pool funds either healing or condition removal, with a fixed cost per condition removal. Fits `v3` as `use_count` with varying per-option costs, composed with `choose`.

No new top-level node or edge family is forced.

## `Sneak Attack`

- Nodes that fit:
  - `class_feature_root`
  - `on_hit_window`
  - `target`
  - `damage`
  - `attack_roll`
  - `use_count` (once per turn)
  - `turn_start_window`
  - `modify_roll_advantage` (the *optional* advantage-requirement gate)
- Edges that fit:
  - `roots`
  - `opens_window`
  - `attaches_to`
  - `grants`
  - `persists_until`
- What leaks:
  - **dice-count scaling**: the extra damage starts at 1d6 and increases every other Rogue level. This is `scale_die_count` pressure.
  - **damage type is the weapon's**: the extra damage type is borrowed from the weapon, not fixed by the feature. Same borrowing pattern as Graze (mastery).
  - **two alternative trigger paths**: advantage on the attack roll **OR** an ally within 5 feet (not incapacitated) **AND** no disadvantage. This is a disjunction of gating conditions. The graph handles this via composition but does not name it.
  - **weapon-property gate**: requires a Finesse or Ranged weapon. Cross-rule composition with equipment properties.
  - Cunning Strike extension (Level 5+) adds a **pay-dice-for-effect** mechanic where Sneak Attack damage dice are the pool. This is another pool-with-options-menu pattern — the dice themselves are the currency.
- Ownership:
  - creature-owned once-per-turn fence.
- Verdict:
  - fits `v3` cleanly;
  - second independent data point for dice-count scaling (after Bardic Inspiration's die-size scaling) — both combined pressure `scale_damage` to split into typed variants;
  - Cunning Strike adds a second data point for pool-with-options-menu, reinforcing the pattern observation from Monk's Focus.

## `Extra Attack`

- Nodes that fit:
  - `class_feature_root`
  - `grant`
  - `action_window`
  - `self`
  - `persist`
- Edges that fit:
  - `roots`
  - `grants`
  - `attaches_to`
- What leaks:
  - **attack-count scaling**: the feature says "attack twice" at L5, "attack three times" (Fighter L11), "attack four times" (Fighter L20). This is a typed scaling variant that `v3`'s scaling atoms do not explicitly name. `scale_numeric_bonus` is close but the value being scaled is not a bonus; it is the **count of attacks in a single Attack action**.
  - the effect is a **rewrite of the Attack action** to produce multiple attack rolls per invocation. This is cross-rule composition with the Attack action rule.
- Ownership:
  - creature-owned passive rewrite of the Attack action.
- Verdict:
  - fits `v3` structurally via `grant` + attachment, but **pressures typed attack-count scaling** as a first-class scaling variant;
  - when combined with Sneak Attack's dice-count scaling and Bardic Inspiration's die-size scaling, three independent scaling shapes are now visible in the corpus that the single `scale_damage` / `scale_numeric_bonus` / `scale_target_count` inventory does not cleanly cover.

## `Lay On Hands`

- Nodes that fit:
  - `class_feature_root`
  - `activate`
  - `bonus_action_window`
  - `target`
  - `self` (allowed target)
  - `use_count` (pool size = 5 × Paladin level)
  - `rest_window` (long rest)
  - `heal`
  - `remove_condition` (Poisoned)
  - `choose`
- Edges that fit:
  - `roots`
  - `opens_window`
  - `consumes`
  - `grants`
- What leaks:
  - **pool with variable-cost options**: the pool is a single HP counter, but each "purchase" has a different cost:
    - healing: 1 HP spent = 1 HP healed (variable, up to pool remaining);
    - condition removal: 5 HP spent = Poisoned condition removed (fixed cost, no healing).
  - The graph handles this as `choose` + option-specific `consumes` amounts.
  - **pool shape is quantity-based**, not boolean `use_count`. The count tracks how many HP remain, not how many activations remain. `use_count` today is more suited to boolean or small-integer activation counts. This is the same pattern as `charge` in items — a scalar resource with typed expenditures.
  - **reset cadence** is long rest full refresh. Clean.
- Ownership:
  - creature-owned scalar pool.
- Verdict:
  - fits `v3` cleanly with `use_count` standing in for the scalar pool;
  - validates that **quantity-based pools with variable-cost options** still compose without a new atom;
  - third data point for pool-with-options-menu pattern (after Monk's Focus and Sneak Attack's Cunning Strike).

## Cross-Feature Findings

1. All three features fit `v3` at the top level.
2. **Typed scaling split is now well-pressured**. Three distinct scaling shapes appear in this pass:
   - die-size scaling (Bardic Inspiration d6→d8→d10→d12);
   - dice-count scaling (Sneak Attack 1d6 → 2d6 → 3d6 …);
   - attack-count scaling (Extra Attack 2 → 3 → 4 attacks per action);
   The single-atom `scale_damage` does not cleanly cover any of these three. A typed split into `scale_die_size`, `scale_die_count`, and `scale_attack_count` (or similar) is the cleanest fix. Do not promote yet — but mark as the single clearest `v4` candidate.
3. **Pool-with-options-menu** is now a three-data-point pattern (Monk's Focus, Sneak Attack's Cunning Strike, Lay on Hands). Strong enough to name as a subgraph in the graph representation.
4. **Cross-rule composition with the Attack action** (Extra Attack rewriting the Attack action's count) is consistent with Nick's window reassignment and TWF's damage modification. Cross-rule composition continues to be a recurring structural theme.
5. **Quantity-based scalar pool vs boolean activation counter** — `use_count` is being stretched across both. Fine for now; could be narrowed later if schema work needs the distinction.

## New Node / Edge Family

Group D does **not** force a new top-level node or edge family.

Candidate narrow atom refinement recorded (strong three-data-point pressure):

- typed scaling split of `scale_damage` and `scale_numeric_bonus` into at least:
  - `scale_die_size` (Bardic Inspiration);
  - `scale_die_count` (Sneak Attack);
  - `scale_attack_count` (Extra Attack);
  plus retain `scale_numeric_bonus` and `scale_target_count`.

Candidate graph-representation pattern additions:

- Pool With Options Menu (three data points now across Groups A, D);
- AC formula override (from Group C, consistent with cross-rule composition).
