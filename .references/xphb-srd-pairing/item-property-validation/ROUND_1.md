# Round 1 Item Property Validation

Properties (all 9 SRD 5.2.1 weapon properties):

- `Ammunition`
- `Finesse`
- `Heavy`
- `Light`
- `Loading`
- `Reach`
- `Thrown`
- `Two-Handed`
- `Versatile`

Grounding:

- `xphb-srd-pairing/ITEM_PROPERTY_VALIDATION_matrix_v0.md`
- `xphb-srd-pairing/TAXONOMY_atoms_graph_v3.md`
- `xphb-srd-pairing/TAXONOMY_graph_representation_v0.md`
- `.references/srd-5.2.1/Equipment.md`, section "Properties"

## Short Verdict

All 9 SRD item properties fit `v3` as cross-rule composition. No new top-level node, edge, or subgraph is forced.

This pass is the **purest** confirmation of the Cross-Rule Composition (H) and Cross-Rule Rewrite (N) subgraphs. Eight of nine properties are rule rewrites; one (Ammunition) adds a narrow resource-tracking cadence that composes cleanly from `consumes` + `use_count`.

The pass also discharges several speculative single-pressure recordings from earlier streams by showing that the cross-rule patterns already anchored in the graph representation are sufficient. No new atom is pressured.

## Per-Property Analysis

### `Ammunition`

- Nodes that fit:
  - `item_property_root`
  - `consumes`
  - `use_count` (ammunition supply)
  - `restrict_action_set` (ranged attack requires ammunition)
  - `choose` (half-recovery after fight)
- Edges that fit:
  - `roots`
  - `consumes`
- What leaks:
  - **half-recovery-after-fight** cadence is a narrow recovery rule: after a fight, recover half ammunition (round down). Expressible as a `refund` at an end-of-encounter boundary, though encounter boundaries are DM-adjudicated and not a modeled runtime event.
  - **free-hand requirement** for one-handed weapon loading is a narrow equipment-state prerequisite.
- Verdict:
  - fits `v3`. Closest atom use is `consumes` on attack rolls; the half-recovery is a narrow narrative cadence, not a new atom.

### `Finesse`

- Nodes that fit:
  - `item_property_root`
  - `choose` (Str vs Dex for attack and damage)
- Edges that fit:
  - `roots`
  - `replaces`
- What leaks:
  - **ability modifier selection** is a narrow cross-rule rewrite: the property lets the attacker pick which ability modifier to use for attack/damage rolls. The atom graph handles this via `choose` on the attack roll's modifier source.
  - **must use the same modifier for both rolls**: invariant coupling two selections into one. Expressible via composition.
- Verdict:
  - fits `v3` via Cross-Rule Rewrite (subgraph N) applied to ability-modifier selection.

### `Heavy`

- Nodes that fit:
  - `item_property_root`
  - `modify_roll_advantage` (Disadvantage on attack rolls if Str <13 for Melee or Dex <13 for Ranged)
- Edges that fit:
  - `roots`
  - `modifies`
- What leaks:
  - **stat-conditional disadvantage** is a gating condition driving `modify_roll_advantage`. The graph handles this via attachment prerequisites.
  - **melee vs ranged split** on the gating stat. Narrow.
- Verdict:
  - fits `v3` cleanly.

### `Light`

- Nodes that fit:
  - `item_property_root`
  - `grant_extra_action` (extra attack as Bonus Action later on the same turn)
  - `bonus_action_window`
  - `damage` (extra attack's damage composition is different — no ability mod unless negative)
- Edges that fit:
  - `roots`
  - `grants`
  - `modifies`
- What leaks:
  - **cross-rule piggybacked atom sink**: Light is referenced by the Nick mastery (which rewrites the window) and Two-Weapon Fighting feat (which modifies the damage). This is now a **three-layer cross-rule stack** visible in one atom source:
    - base rule: Light grants a bonus-action extra attack with modified damage;
    - mastery rewrite: Nick reassigns the extra attack to the action window;
    - feat modification: TWF restores the ability modifier to the extra attack's damage.
  - the graph representation's Cross-Rule Composition (H) subgraph already names this pattern. The item-property pass confirms that the base rule is the "root" of this cross-rule stack.
  - **ability modifier suppression on extra attack** (Light's own "don't add ability modifier unless negative") is a scoped damage-modifier suppression — same pattern Cleave (mastery) used.
- Verdict:
  - fits `v3` via `grant_extra_action` + damage composition + Cross-Rule Composition;
  - most densely cross-rule-composed property in the corpus.

### `Loading`

- Nodes that fit:
  - `item_property_root`
  - `restrict_action_set` (cap on attack count per action/bonus action/reaction regardless of normal multi-attack rules)
- Edges that fit:
  - `roots`
  - `replaces`
- What leaks:
  - **attack-count cap override**: Loading caps the number of attacks you can fire from a Loading weapon to 1 per action/bonus action/reaction, overriding rules like Extra Attack. This is a Cross-Rule Rewrite (subgraph N) that specifically inverts or narrows another rule's attack-count grant.
  - consistent with Extra Attack as the opposite direction (one grants multi-attack; the other caps it).
- Verdict:
  - fits `v3` cleanly.

### `Reach`

- Nodes that fit:
  - `item_property_root`
  - `modify_range` (+5 ft reach)
- Edges that fit:
  - `roots`
  - `modifies`
- What leaks:
  - applies to both regular attacks and Opportunity Attacks.
  - narrow cross-rule composition with Opportunity Attack rules.
- Verdict:
  - fits `v3` cleanly.

### `Thrown`

- Nodes that fit:
  - `item_property_root`
  - `grant_extra_action` (can throw as part of the attack; draw is free)
  - `choose` (ability modifier selection if Melee)
  - `modify_range` (sets range values per weapon entry)
- Edges that fit:
  - `roots`
  - `grants`
  - `modifies`
- What leaks:
  - **ability modifier carry-over**: if the Thrown weapon is also Melee, use the same ability modifier for attack and damage rolls as in melee use. Narrow composition with Finesse or Strength-based melee.
  - **draw-as-part-of-attack** is a legality rewrite that removes the normally-required object-interaction cost for drawing the weapon.
- Verdict:
  - fits `v3` cleanly.

### `Two-Handed`

- Nodes that fit:
  - `item_property_root`
  - `restrict_action_set` (attack only with two hands)
- Edges that fit:
  - `roots`
  - `replaces`
- What leaks:
  - **grip requirement** is a narrow state gate on the Attack action.
- Verdict:
  - fits `v3` cleanly.

### `Versatile`

- Nodes that fit:
  - `item_property_root`
  - `choose` (one-handed vs two-handed grip)
  - `damage` (upgraded die when two-handed melee attack)
- Edges that fit:
  - `roots`
  - `replaces`
  - `modifies`
- What leaks:
  - **grip-gated damage upgrade** is a Cross-Rule Rewrite of the damage die based on a grip choice at the moment of attack.
  - Versatile is also referenced by Great Weapon Fighting (feat), which adds a dice-substitution modifier on damage rolls from Two-Handed or Versatile weapons held in two hands. Another cross-rule stack visible in one property.
- Verdict:
  - fits `v3` cleanly via Cross-Rule Rewrite + choice + damage composition.

## Cross-Property Findings

1. **All 9 properties fit `v3` with no new atoms or subgraphs forced.** This is the cleanest validation pass in the whole effort.
2. **Cross-Rule Composition (H) and Cross-Rule Rewrite (N) are the dominant patterns** for the entire source kind. Out of 9 properties, 8 are cross-rule rewrites; 1 (Ammunition) adds a resource dimension.
3. **Three-layer cross-rule stacks are now concrete**:
   - `Light` → base rule: grants bonus-action extra attack with modified damage;
   - `Nick` (mastery): rewrites the bonus-action window to action window;
   - `Two-Weapon Fighting` (feat): modifies the extra attack's damage composition.
   These three items compose an actual cross-rule stack at runtime. The graph representation handles it cleanly via `replaces` / `modifies` edges pointing at the base rule's nodes.
4. **`Versatile` + `Great Weapon Fighting`** form a second two-layer stack (property grip-rewrite → feat dice-substitution modifier).
5. **No pressure for typed scaling split** from item properties. Expected — properties are passive legal rewrites, not scaling features.
6. **No new atom candidates** from this pass. The recorded typed scaling split pressure from earlier streams stands alone.

## New Node / Edge Family

Item property Round 1 does **not** force any new top-level node, edge, or subgraph family.

This closes source-root coverage. Every source atom in `v3` now has at least one atom-level validation pass:

- `spell_root` — 20 spells × 3 rounds;
- `feat_root` — 17 feats × 1 round;
- `class_feature_root` / `subclass_feature_root` — 16 class features × 1 round;
- `species_trait_root` / `background_trait_root` — 13 origin units × 1 round;
- `item_property_root` — 9 properties × 1 round;
- `mastery_root` — 8 masteries × 1 round;
- `magic_item_root` — 24 items × 2 rounds.

## Research Conclusion

`v3` holds across the entire SRD source-root spectrum. Item properties are the cleanest confirmation group: no new atoms, no new subgraphs, no residue observations.

With source-root coverage complete and typed scaling split now supported by two independent streams (class features + species), the correct next move is to draft `TAXONOMY_atoms_graph_v4.md`.
