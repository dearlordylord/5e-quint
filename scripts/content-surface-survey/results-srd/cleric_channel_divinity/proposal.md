# Proposal: Channel Divinity (Cleric L2)

**Outcome:** `structural_widening`  
**Provenance:** SRD 5.2.1 — Classes/Cleric#Channel Divinity

---

## Why the unit does not fit

Channel Divinity has three mechanical layers. Each layer independently fails to fit the current surface.

### Layer 1 — The pool itself

The use-count pool is structurally representable:
- `UseCountCap` with `ThresholdTiers<number>` can encode the level-scaled cap.
- `RestResetCadence: partial_short_full_long` (shortRestRefill: 1) exactly matches "regain one on Short Rest, all on Long Rest."

**This layer fits.** It cannot be encoded alone, however, because `ClassFeatureActivationMechanics` requires a single concrete `ClassFeatureEffect`.

### Layer 2 — The dispatch mechanism

**Primary structural gap.** When a cleric uses Channel Divinity they choose which registered sub-effect to create. This "choose one from menu" dispatch has no representation in any current mechanics family:

- `ClassFeatureMechanics` only has the `activation` family, which carries a single `effect: ClassFeatureEffect`.
- There is no `choose` effect variant, no `sub_effects` array, no "dispatch on player selection" subgraph.

This requires a new subgraph — a `choose_effect_dispatch` pattern — or a dedicated family (e.g., `choose_activation`) that carries a list of selectable effect nodes and feeds activation cost + use-count to whichever branch the player selects.

### Layer 3a — Divine Spark

Even if encoded in isolation (without the dispatch layer), Divine Spark hits:

**1. Missing `action` in `ClassFeatureActivationCost`**  
Both Divine Spark and Turn Undead cost a Magic action. The current type only has `free` and `bonus_action`. A new `{ kind: "action" }` (or `{ kind: "magic_action" }`) variant is required.

**2. Missing player-choice branch (heal vs. damage)**  
"You either restore Hit Points… or force the creature to make a Constitution saving throw." This is a caster-chosen branch between two effect types, not a save outcome. There is no `player_choice` discriminant anywhere in `ClassFeatureEffect` or related types.

**3. Missing damage + save_gate in `ClassFeatureEffect`**  
The damage branch requires a Constitution save (DC = caster spell save DC), with full damage on failure and half on success. `ClassFeatureEffect` only has `GrantExtraActionEffect` and `HealHpEffect`. Needed: a damage variant with embedded save gate, or a `save_gate` resolution parallel to `ActivationPhase.save_gate`.

**4. Heal amount includes an ability modifier addend**  
Divine Spark heals `1d8 + Wisdom modifier`. The current `HealHpEffect.amount: DiceAmount` carries only dice + flat; there is no `ability_modifier_addend` field. This is a narrower surface widening within the heal-type path.

**5. Player-choice damage type (Necrotic or Radiant)**  
On the damage branch, the caster chooses the damage type at activation. There is no `player_choice_damage_type` field in any damage effect type; `DamageEffect.damageType` is a fixed `DamageType` value.

### Layer 3b — Turn Undead

**1. Missing area/multi-target in `ClassFeatureMechanics`**  
Turn Undead targets all chosen Undead within 30 ft. `ClassFeatureActivationMechanics` has no attachment or target-scope field. Even `HealHpEffect` only models `"self" | "target_creature"`.

**2. Missing conditions (`frightened`, `incapacitated`)**  
The `Condition` type is `"prone"` only. Both Frightened and Incapacitated are absent.

**3. Multiple simultaneous conditions**  
Turn Undead applies two conditions at once. The existing `SaveGateRider.onFail` can only carry a single `apply_condition` result. A `conditions: ReadonlyArray<Condition>` variant is needed.

**4. Missing timed duration with complex early-break in class features**  
The effect lasts 1 minute and ends early on three distinct triggers: target takes any damage; caster gains Incapacitated; caster dies. `ClassFeatureMechanics` has no duration or early-break model. Spells have `Duration` and `persist`/`expire` lifecycle atoms, but these are spell-family concepts with no class-feature parallel.

**5. Behavioral rider: forced movement**  
"It tries to move as far away from you as it can on its turns." This is a Frightened condition consequence (the condition itself implies it per SRD), but the existing atom inventory has no `force_move` or `compelled_movement` rider on a per-turn basis. Whether this belongs to the `Condition` definition or a new rider atom is an open question.

---

## Proposed widening summary

| Kind | Name | Needed for |
|------|------|-----------|
| new_subgraph | `choose_effect_dispatch` | Channel Divinity dispatch container |
| new_variant | `ClassFeatureActivationCost: action` | Divine Spark, Turn Undead |
| new_variant | `ClassFeatureEffect: damage (save_gate)` | Divine Spark damage branch |
| new_variant | `ClassFeatureEffect: player_choice branch` | Divine Spark heal-vs-damage |
| new_variant | `DiceAmount: ability_modifier_addend` | Divine Spark heal amount |
| new_variant | `DamageEffect: player_choice_damage_type` | Divine Spark Necrotic/Radiant |
| new_variant | `ClassFeatureMechanics: area attachment` | Turn Undead 30 ft radius |
| new_variant | `Condition: frightened, incapacitated` | Turn Undead conditions |
| new_variant | `ClassFeatureEffect: multi_condition apply` | Turn Undead (two conditions) |
| new_subgraph | `ClassFeatureMechanics: timed duration + break conditions` | Turn Undead duration |

---

## Relationships to existing survey entries

The survey catalog also lists `cleric_divine_spark` as a separate slug. If Divine Spark is encoded as its own `ClassFeatureRecord`, it would still require most of the surface widenings listed for Layer 3a above. The dispatch container (`cleric_channel_divinity`) remains a structural widening regardless of how the sub-effects are split.

---

## What already fits (reuse when widening lands)

- `UseCountCap: ThresholdTiers<number>` — tiered use cap by Cleric level
- `RestResetCadence: partial_short_full_long` — Short Rest partial / Long Rest full refill
- `DiceAmount: threshold_tiers` with `axis: "class"` — Divine Spark d8 scaling (1d8 → 2d8 → 3d8 → 4d8 at L7/13/18)
- `DcSource: caster_spell_save_dc` — save DC for both effects
- `Ability: con` / `Ability: wis` — save abilities
