# Proposal: Quarterstaff of the Acrobat

**Outcome:** `structural_widening`

**Unit:** `magic_item_quarterstaff_of_the_acrobat` (Very Rare, requires attunement)

---

## Why this unit cannot be honestly encoded

The Quarterstaff of the Acrobat has three discrete item forms (quarterstaff, 6-inch rod, 10-foot pole) and properties that are gated on which form is currently active. This is a **form-conditional property system** with no existing analog in the surface.

No encoding path exists without lying about which grants apply unconditionally versus form-conditionally. The existing `EquipmentPredicate` gate (`wearing_armor`, `wielding_weapon`) cannot distinguish "quarterstaff form of this item" from "rod form of this item" — these are the same weapon in different states, not different equipment categories.

---

## Gap 1 (Structural): Item form-state machine

**RAW text:**  
> "In certain forms, the weapon has the following additional properties."  
> "Acrobatic Assist (Quarterstaff and 10-Foot Pole Forms Only)."  
> "Attack Deflection (Quarterstaff Form Only)."  
> "Ranged Weapon (Quarterstaff Form Only)."

**Gap:** No mechanics family supports named item forms with associated conditional grant sets. What is needed is something like:

```
item_form_modes:
  - id: "quarterstaff"
    grants: [acrobatic_assist, attack_deflection, ranged_weapon]
  - id: "pole"
    grants: [acrobatic_assist]
  - id: "rod"
    grants: []
```

The form is switched by a bonus-action activation with no resource cost (unlimited uses, no reset cadence). This is structurally more like a toggle than a use-count resource. The `ActivatedAbilityMechanics` family requires a resource + reset cadence, which doesn't fit an infinite-use mode toggle.

**Proposed widening:** A new `item_form_state_machine` subgraph within `MagicItemMechanics` — a named set of mutually exclusive forms, each with its own grant list, switchable by a configured bonus-action cost.

---

## Gap 2 (Surface): `damage_roll` missing from `RollKind`

**RAW text:**  
> "You have a +2 bonus to attack rolls and damage rolls made with this magic weapon."

**Gap:** `RollKind` covers `attack_roll`, `saving_throw`, `ability_check`, `initiative`, `death_saving_throw` — but not `damage_roll`. The +2 damage bonus cannot be encoded via `modify_roll_numeric`. This gap is also relevant for other +N magic weapons; it is not unique to this item.

**Proposed widening:** Add `"damage_roll"` to `RollKind`.

---

## Gap 3 (Atom): `grant_thrown_property`

**RAW text:**  
> "This weapon has the Thrown property with a normal range of 30 feet and a long range of 120 feet."

**Gap:** No existing atom grants a weapon property. `grant_speed`, `modify_speed`, and `force_move` are all inapplicable. The Thrown property changes the attack economy (enables ranged attacks) and range parameters — this is a weapon-capability grant, not a roll modifier.

**Proposed widening:** New `grant_thrown_property` atom: `{ kind: "grant_thrown_property", normalRangeFeet: number, longRangeFeet: number }`.

---

## Gap 4 (Atom): `return_to_hand`

**RAW text:**  
> "Immediately after you make a ranged attack with the weapon, it flies back to your hand."

**Gap:** No existing atom models weapon auto-return. This is a post-attack lifecycle effect. The closest is `force_move` (for creature/target movement), but weapon-object movement with an implicit destination is a different shape.

**Proposed widening:** New `return_to_hand` atom or a `post_action_window` subgraph on a weapon attachment. Alternatively, this could be a property of `grant_thrown_property` (e.g., `autoReturn: true`).

---

## Gap 5 (Structural): Magic-item reaction trigger

**RAW text:**  
> "When you are hit by an attack while holding the weapon, you can take a Reaction to twirl the weapon around you, gaining a +5 bonus to your Armor Class against the triggering attack."

**Gap:** `TriggeredReactionMechanics` (which has a `ReactionTrigger` grammar including `hit_by_attack_roll`) is a spell-only family. `MagicItemMechanics` is `PassiveMechanics | ActivatedAbilityMechanics`. `ActivatedAbilityMechanics` has `activationCost: { kind: "reaction" }` but no trigger predicate — it cannot express "this can only be used when you are hit by an attack."

**Proposed widening:** Either (a) allow `MagicItemMechanics` to use `TriggeredReactionMechanics` directly, or (b) add an optional `trigger` field to `ActivatedAbilityMechanics` that gates when the reaction can be used.

---

## Gap 6 (Surface): Per-attack AC modification scoping

**RAW text:**  
> "gaining a +5 bonus to your Armor Class against the triggering attack, potentially causing the attack to miss you."

**Gap:** `modify_ac` grants a general AC modifier for the effect's duration. The Shield spell uses this on a `triggered_reaction`, which works because the reaction window effectively scopes it to the triggering moment. However, the explicit "against the triggering attack" phrasing suggests a single-attack scope that the current surface doesn't express — it's a retroactive modification to a resolved attack roll, not a prospective AC increase. If gap 5 (reaction trigger for magic items) is resolved via `TriggeredReactionMechanics`, this encoding would inherit Shield's pattern and may be acceptable as-is.

---

## What could be encoded cleanly (if form-state gap were resolved)

- **Acrobatic Assist:** `modify_roll_advantage` with `mode: "advantage"`, `on: ["ability_check"]`, `skillFilter: { kind: "fixed", skills: ["acrobatics"] }` — fits cleanly once form-conditionality is expressible.
- **Attack Deflection resource:** `resource: { kind: "use_count", cap: { kind: "fixed", uses: 1 } }`, `resetCadence: { kind: "short_or_long_rest" }` — fits cleanly.
- **+2 attack roll bonus:** `modify_roll_numeric` on `["attack_roll"]` with `delta: { kind: "fixed_dice", dice: 2, dieSize: 1, sign: "+" }` — fits cleanly (damage side does not).
- **Light emission:** Narrative/environmental — appropriately omitted from any encoding.

---

## Summary of proposed widenings

| # | Kind | Name | Priority |
|---|------|------|----------|
| 1 | `new_subgraph` | `item_form_state_machine` | Critical (blocks all form-conditional properties) |
| 2 | `new_variant` | `RollKind.damage_roll` | High (blocks +N weapon damage bonus across all magic weapons) |
| 3 | `new_atom` | `grant_thrown_property` | Medium |
| 4 | `new_atom` | `return_to_hand` | Medium |
| 5 | `new_subgraph` | `magic_item_reaction_trigger` | Medium (also needed by other reactive magic items) |
| 6 | `new_variant` | per-attack AC scoping | Low (may resolve via gap 5) |
