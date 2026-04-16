# Proposal: species_goliath_giant_ancestry

**Outcome:** `structural_widening`  
**Unit:** Giant Ancestry (Goliath) — SRD 5.2.1 §Character-Origins/Goliath

---

## Why the unit does not fit

### 1. No `species_trait` kind in `UnitRecord` (primary blocker)

`UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord`. There is no `species_trait` branch. The v4 taxonomy includes `species_trait_root` as a source atom, but the surface type system (`types.ts`) has not been widened to support it. No encoding is possible until this kind is added.

### 2. Open-choice family shape (choose-one-of-N at character creation)

Giant Ancestry presents six mutually exclusive sub-options. The player picks one permanently at character creation. No existing payload family models this pattern. The v4 `choose` procedure atom exists in the taxonomy but has no authored surface shape.

This is distinct from "optional" on a mastery (`optional: boolean`) — that is an invocation-time choice. Giant Ancestry is a character-creation-time exclusive selection, more like a subgraph that needs a `choose` node with N branches funneling to the selected option's mechanics.

### 3. PB-scaled use count cap

> "you can use the chosen benefit a number of times equal to your Proficiency Bonus"

`UseCountCap` supports `fixed` (constant) and `threshold_tiers` (level-tiered constant). Neither represents PB-scaling directly. PB follows a fixed schedule by character level (2/4/6/8/10/12 at levels 1/5/9/13/17/21), so `threshold_tiers` with axis=`character` could approximate it — but PB is semantically distinct from an authored tier table and should have its own variant:

```typescript
// Proposed:
| { readonly kind: "proficiency_bonus" }
```

Reset cadence for all six options is Long Rest only — this fits `{ kind: "long_rest" }`.

---

## Per-option gap analysis

### Cloud's Jaunt (Cloud Giant)

> As a Bonus Action, you magically teleport up to 30 feet to an unoccupied space you can see.

**Missing:** Self-teleportation effect atom. No current effect type covers voluntary short-range teleportation. The closest v4 atoms are `move` (walk/forced movement) and `transport_exile` (planar banishment). Neither is correct. A new `teleport_self` effect atom (or a `teleport` atom with a self-attachment) is needed.

### Fire's Burn (Fire Giant)

> When you hit a target with an attack roll and deal damage to it, you can also deal 1d10 Fire damage to that target.

**Gap:** On-hit damage rider keyed to the trait's own use-count resource. The `damage_on_hit` operation in `OngoingOperation` is spell-scoped and requires the `ongoing_effect` family. There is no equivalent for species traits. This maps to Subgraph G (on_hit_trigger) but that family is only surfaced for masteries. A species-trait `on_hit_trigger` family would be needed, or the on-hit rider needs to be surfaceable from species traits generically.

### Frost's Chill (Frost Giant)

> When you hit a target with an attack roll and deal damage to it, you can also deal 1d6 Cold damage to that target and reduce its Speed by 10 feet until the start of your next turn.

**Missing atoms:**
- Same on-hit trigger gap as Fire's Burn.
- `modify_speed`: exists in v4 taxonomy but not surfaced in any current effect type in `types.ts`. The `MasteryEffect` union has no `modify_speed` variant; the spell `Effect` union has none either.

### Hill's Tumble (Hill Giant)

> When you hit a Large or smaller creature with an attack roll and deal damage to it, you can give that target the Prone condition.

**Gaps:**
- Same on-hit trigger gap.
- Creature size filter ("Large or smaller"): no `TargetFilter` shape exists in the surface. The mastery `save_gate` result can apply a condition, but the surface has no way to express a size-gated targeting constraint.
- Otherwise `apply_condition: prone` exists in `SaveGateRiderResult`.

### Stone's Endurance (Stone Giant)

> When you take damage, you can take a Reaction to roll 1d12. Add your Constitution modifier to the number rolled and reduce the damage by that total.

**Missing:**
- `reduce_damage_taken`: a known residue atom in v4 taxonomy (§12), explicitly not promoted because only single-group pressure existed. Giant Ancestry adds a second data point. The mechanic is: roll 1d12 + CON modifier, subtract from incoming damage. This is not `grant_resistance` (which halves damage of a type) — it is a variable numeric reduction per reaction.
- `damage_taken_window` or equivalent: the trigger is "when you take damage." No window atom for this exists in the surface (only `on_hit_window`, `reaction_window`, etc.).
- The CON modifier addend is also novel: no current `DiceAmount` shape carries ability modifier additions to a flat roll.

### Storm's Thunder (Storm Giant)

> When you take damage from a creature within 60 feet of you, you can take a Reaction to deal 1d8 Thunder damage to that creature.

**Missing:**
- `damage_taken_window`: same trigger gap as Stone's Endurance.
- Retaliatory damage reaction: the caster deals damage to the source of incoming damage. This is not covered by `TriggeredReactionMechanics` (which only models `modify_ac` and `negate_named_effect` effects, and attaches to self) or any other family. A new retaliatory-reaction subgraph is needed.
- Range filter on the triggering attacker (60 feet): no filter mechanism exists.

---

## Proposed surface additions (in priority order)

| Priority | Kind | Name | Justification |
|---|---|---|---|
| 1 | new record kind | `species_trait` in `UnitRecord` | Primary structural blocker |
| 2 | new family | `open_choice` (or `choose` procedure family) | Models character-creation-time option selection |
| 3 | new variant | `UseCountCap.proficiency_bonus` | PB-scaled pool |
| 4 | new atom | `teleport_self` or `teleport` effect | Cloud's Jaunt |
| 5 | new surface exposure | `modify_speed` in effect types | Frost's Chill |
| 6 | new atom | `reduce_damage_taken` (promote from residue) | Stone's Endurance |
| 7 | new window | `damage_taken_window` | Stone's Endurance, Storm's Thunder trigger |
| 8 | new subgraph | retaliatory reaction (deals damage to attacker) | Storm's Thunder |
| 9 | new surface shape | creature size filter on target selection | Hill's Tumble |

---

## Notes

- This unit is one of the most mechanically diverse species traits in the SRD. The six options span teleportation, damage riders, speed reduction, condition application, damage mitigation, and retaliatory reactions. It touches nearly every gap in the current species trait model.
- The clean path forward is: (1) add `species_trait` to `UnitRecord` with a basic header, (2) add the `open_choice` family, (3) add PB-scaled cap, (4) widen effect types per option. The six options can then be encoded as individual payload branches within the `open_choice` family.
- Stone's Endurance and Storm's Thunder are reaction-shaped, similar to Shield/Counterspell but triggered by damage-taken rather than being-attacked. They could reuse the `triggered_reaction` family if the trigger grammar is widened (currently `ReactionTrigger` only covers `hit_by_attack_roll` and `targeted_by_named_spell`). A `damage_taken` trigger variant would enable both.
