# Proposal: Widening for Blessed Strikes (cleric L7)

**Unit slug:** `cleric_blessed_strikes_l7`
**Outcome:** `structural_widening`
**Provenance:** SRD 5.2.1 — Classes/Cleric#Level 7: Blessed Strikes

---

## Unit Summary

Blessed Strikes grants the cleric **one of two alternative options** (permanent choice):

- **Divine Strike** — once per turn, when hitting with a weapon attack roll, optionally deal +1d8 Necrotic or Radiant damage (player chooses type).
- **Potent Spellcasting** — add Wisdom modifier to damage dealt by Cleric cantrips.

---

## Why It Does Not Fit

### Gap 1 (Structural) — No "choose one of two" family in ClassFeatureMechanics

The existing `ClassFeatureMechanics` has a single family: `activation`. That family encodes a single effect behind a single activation cost and resource. Blessed Strikes presents **two permanently mutually exclusive mechanical alternatives**; the cleric picks one, and only that option applies for the rest of their career.

There is no `alternatives`, `choose_one_of`, or disjunctive family in `ClassFeatureMechanics`. Encoding just one option would misrepresent the feature; encoding both as a single unit has no valid shape.

**Classification:** `structural_widening` — a new mechanics family structure is required.

---

### Gap 2 (Surface) — No on-hit damage rider in ClassFeatureEffect

Divine Strike fires "once on each of your turns when you hit a creature with an attack roll using a weapon." This is mechanically identical to the `on_hit_trigger` family used by masteries (Sap, Topple, Cleave), but applied as a class feature.

`ClassFeatureEffect` currently supports only:
- `grant_extra_action`
- `heal_hp`

There is no damage-on-hit rider variant. The `on_hit_trigger` family exists only in `MasteryMechanics`; it cannot be referenced from `ClassFeatureMechanics`.

**Resolution path:** Either extend `ClassFeatureEffect` with a `damage_on_hit_rider` variant (analogous to `DamageOnHitOperation` in spells), or introduce an `on_hit_trigger` family in `ClassFeatureMechanics` parallel to the mastery version.

**Classification:** `surface_widening` (secondary, after the structural gap is resolved).

---

### Gap 3 (Surface) — No player-choice damage type

Divine Strike lets the player choose Necrotic **or** Radiant at the moment of each hit. `DamageType` is a single closed string. There is no `player_choice_at_use: ReadonlyArray<DamageType>` variant.

This is distinct from a fixed damage type and from slot-scaling. It is a runtime player decision affecting the type applied.

**Resolution path:** Add a `player_choice` variant to `DamageType` usage contexts (e.g., `DamageTypeSpec = DamageType | { kind: "player_choice"; options: ReadonlyArray<DamageType> }`).

**Classification:** `surface_widening` (secondary).

---

### Gap 4 (Atom) — No ability-modifier-to-damage atom

Potent Spellcasting adds the caster's Wisdom modifier as a flat bonus to cantrip damage. No v4 atom covers this:

- `modify_roll_numeric` — applies a dice bonus to attack rolls or saving throws (e.g., Bless's +1d4). Not damage.
- `scale_numeric_bonus` — level-scaled flat bonus to a scaling axis. Not ability-score-sourced.
- There is no `add_ability_mod_to_damage` or equivalent in the v4 effect inventory.

This is a common pattern (Paladin's Aura of Protection adds Charisma to saving throws; Sorcerer's Elemental Affinity adds Charisma to spell damage); it will recur across many features.

**Resolution path:** Add a new v4 effect atom: `modify_damage_addend` (or `add_ability_mod_to_damage`) that specifies an ability score whose modifier is added to a category of damage rolls (e.g., cantrip damage for the caster's class).

**Classification:** `atom_widening` (secondary).

---

## Recommended Priority

| Gap | Classification | Recurrence |
|-----|---------------|-----------|
| Choose-one-of alternatives structure | `structural_widening` | Likely recurs (Druid Elemental Fury also has two options) |
| on-hit damage rider for class features | `surface_widening` | Recurs: Paladin Radiant Strikes, Rogue Sneak Attack partial shapes |
| Player-choice damage type | `surface_widening` | Moderate recurrence |
| Ability-mod-to-damage atom | `atom_widening` | High recurrence (Paladin, Sorcerer, Ranger features) |

The structural gap (Gap 1) must be resolved before any other gap becomes actionable.
