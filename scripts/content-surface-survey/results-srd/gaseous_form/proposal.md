# Gaseous Form — Widening Proposal

## Outcome: `atom_widening`

Gaseous Form is a concentration spell that transforms a touched creature into a misty cloud for up to 1 hour. It fits the `ongoing_effect` spell family structurally — it is action-cast, concentration, attaches to a single target, and persists. The upcasting rule (+1 target per slot above 3) maps cleanly to existing `SlotScaling` on a `choose_up_to` attachment.

Three gaps prevent honest encoding.

---

## Gap 1 — Missing atom: `condition_immunity`

**Evidence:** "it has Immunity to the Prone condition"

The v4 taxonomy has `apply_condition` (applies a condition) and `remove_condition` (retroactively clears one). Neither covers granting **immunity** — a persistent guard that prevents a condition from being applied in the first place. This is a runtime-deterministic mechanic: any effect that would apply Prone to the target is simply blocked. A new `condition_immunity` effect atom is required.

This is the primary reason the outcome is `atom_widening` rather than `surface_widening`.

**Proposed atom:** `condition_immunity` (category: effect)
- Field: `condition: Condition` (using the existing `Condition` type, currently `"prone"`)
- Relation: `grants` from the ongoing effect node; `attaches_to` the target

---

## Gap 2 — Missing surface variant: multi-effect `OngoingOperation`

**Evidence:** "The target has Resistance to Bludgeoning, Piercing, and Slashing damage; it has Immunity to the Prone condition; and it has Advantage on Strength, Dexterity, and Constitution saving throws. The target can't attack or cast spells."

`OngoingOperation` is currently `roll_modifier | damage_on_hit`. Gaseous Form applies a simultaneous bundle of persistent effects that all attach to the same target for the spell's duration:

| Effect | v4 atom | Status |
|---|---|---|
| Resistance to B/P/S | `grant_resistance` | exists in v4, not in `OngoingOperation` |
| Immunity to Prone | `condition_immunity` | new (see Gap 1) |
| Advantage on STR/DEX/CON saves | `modify_roll_advantage` | exists in v4, not in `OngoingOperation` |
| Fly speed 10 ft + hover | `modify_speed` + `grant_hover` | exist in v4, not in `OngoingOperation` |
| Can't attack or cast (action restriction) | `restrict_action_set` | exists in v4, not in `OngoingOperation` |

Two design options:
- **Option A:** Add an `effect_bundle` variant to `OngoingOperation` that holds a `ReadonlyArray` of named sub-effects. Each sub-effect references a v4 atom kind with its parameters.
- **Option B:** Change `operation` to `ReadonlyArray<OngoingOperation>` and add new `OngoingOperation` variants for `grant_resistance`, `modify_roll_advantage`, `grant_hover`, `modify_speed`, and `restrict_action_set`.

Option B is more composable and consistent with the existing two-variant pattern, but requires more variants. Option A is a one-time widening that would also serve polymorphic spells like Alter Self, Polymorph, and Spider Climb.

---

## Gap 3 — Missing surface variant: conditional spell expiry

**Evidence:** "The spell ends on the target if it drops to 0 Hit Points or if it takes a Magic action to end the spell on itself."

The existing `Duration` union has three variants:
- `instantaneous`
- `concentration` (with `upTo: DurationValue`)
- `timed` (with a fixed `value: DurationValue`)

Gaseous Form is concentration but also has **additional early-termination triggers** beyond standard concentration rules:
- Target drops to 0 HP (not the standard "caster loses concentration")
- Target spends their Magic action to dismiss the form voluntarily

These are deterministic runtime events, not narrative or DM-adjudicated. Encoding them requires either:
- A new `Duration` field: `earlyTermination?: ReadonlyArray<EarlyTerminationCondition>` on the concentration variant, or
- A new union variant `conditional_concentration` that carries the extra triggers alongside the standard concentration `upTo`

**Proposed:** Extend the `concentration` Duration variant with an optional `earlyTermination` array referencing a new closed enum `EarlyTerminationCondition`:
- `{ kind: "target_drops_to_0_hp" }`
- `{ kind: "target_expends_action"; action: StandardActionKind }` (here `"magic"`)

---

## Out-of-scope observations

- **Physical traversal** ("can pass through narrow openings", "treats liquids as solid surfaces", "can enter and occupy the space of another creature") — these are physical/environmental properties with no deterministic mechanical resolution against opposing actors. Per ARCHITECTURE.md, environmental traversal is caller-owned. Not proposed.
- **Cannot talk, cannot interact with objects** — these are restrictions on the target's action space that overlap with the `restrict_action_set` atom, but talking is not a `StandardActionKind`. These are noted as secondary omissions; the primary blocker is the bundle/immunity problem.
