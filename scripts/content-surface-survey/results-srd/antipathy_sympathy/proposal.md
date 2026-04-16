# Proposal: Antipathy/Sympathy — Structural Widening

## Unit

**Antipathy/Sympathy** — SRD 5.2.1, 8th-level Enchantment spell.

## Why no encoding was produced

No existing `SpellMechanics` family can honestly represent this spell. The core mechanic is a **proximity-reactive enchantment**: a timed (10-day, non-concentration) effect planted on a target creature/object that continuously fires a saving throw against approaching creatures of a caster-specified kind, then applies a condition with mandatory movement compulsion, and provides a distance-based repeat-save escape.

Checked families in order:

| Family | Fit? | Reason |
|---|---|---|
| `ongoing_effect` | No | Operations limited to `roll_modifier` / `damage_on_hit`. No proximity trigger or condition application. |
| `activation` | No | Resolves at cast time. No persistent trigger. |
| `triggered_reaction` | No | Reacts to player-facing events (hit, targeted). Not positional. |
| `anchored_trigger` | No | Closest candidate. But `AnchoredSignal` is only notifications (audible/mental). No save gate, no condition application, no behavioral compulsion. |

## Gaps identified

### 1. Missing family: proximity-triggered enchantment (structural)

The spell needs a family that combines:

- A persistent timed attachment to a creature/object anchor
- A proximity-detection trigger (creature of kind X enters within N feet)
- A save gate fired on that trigger
- Conditional (on fail) condition application with behavioral compulsion
- A distance-based repeat-save escape

No current family covers this. Even `anchored_trigger` extended to support save gates would need the creature-kind filter, the condition-application signal type, the compulsion effect, and the repeat-save subgraph.

### 2. `Condition` type too narrow (surface widening)

`Condition = "prone"`. Antipathy/Sympathy requires:

- `"frightened"` — applied by Antipathy mode on failed save
- `"charmed"` — applied by Sympathy mode on failed save

Both are standard SRD conditions with distinct behavioral rules. The closed `Condition` union must be widened.

**Evidence:** *"Antipathy: The creature has the Frightened condition. / Sympathy: The creature has the Charmed condition."*

### 3. Missing `AnchorTarget` variant: creature_or_object (surface widening)

Current `AnchorTarget`: `location` (door_or_window) and `area` (cube). The spell anchors to a specific creature or object — the locus around which the 120 ft proximity is measured. A mobile creature anchor is fundamentally different from a fixed location or an area shape.

**Evidence:** *"target one creature or object that is Huge or smaller"*

### 4. Missing `AnchoredFilter` variant: creature_kind_specification (surface widening)

Current `AnchoredFilter`: `creature_exemption_list` — creatures that will NOT trigger. Antipathy/Sympathy uses the dual: specify what kind of creature IS affected (e.g., "red dragons", "vampires"). These are oppositely-scoped predicates; they cannot share a variant.

**Evidence:** *"specify a kind of creature, such as red dragons, goblins, or vampires."*

### 5. Missing signal/effect type: save_gate_with_condition (surface widening on AnchoredSignal)

`AnchoredSignal` is only `audible` / `mental` — notification outputs. The release of Antipathy/Sympathy must fire a WIS save gate and apply a condition on fail. The tracer has no signal shape for mechanically deterministic effects; this requires a new signal variant or a new family that uses `ActivationPhase`-style resolution for the release.

### 6. Missing atom or surface concept: behavioral movement compulsion (atom widening)

The applied conditions carry per-turn mandatory movement behavior — not just status flags:

- Frightened: *must* use movement to flee as far as possible each turn
- Charmed: *must* use movement to approach as close as possible each turn; cannot willingly move away within 5 ft

`apply_condition` alone is insufficient; this is a continuous per-turn override of movement choices. The v4 `force_move` atom models a discrete one-time displacement. A new atom or subgraph for continuous behavioral compulsion is needed.

**Evidence:** *"The Frightened creature must use its movement on its turns to get as far away as possible from the target, moving by the safest route."*

### 7. Missing surface shape: distance-based repeat save with timed immunity (surface widening on repeat_save)

The spell has a positional escape mechanism: if the affected creature ends its turn > 120 ft from the target, it makes a WIS save. On success: effect ends + immune for 1 minute.

The v4 `repeat_save` atom exists but the surface has no variant for:
- Save triggered by positional condition (distance > threshold at turn end)
- Timed immunity granted on success

This needs either a new `AnchoredEvent` variant or a new `repeat_save` surface shape tied to distance evaluation.

**Evidence:** *"If the Frightened or Charmed creature ends its turn more than 120 feet away from the target, the creature makes a Wisdom saving throw. On a successful save, the creature is no longer affected by the target. A creature that successfully saves against this effect is immune to it for 1 minute."*

## Recommended widening path

If this spell is to be encoded without a new family, `anchored_trigger` would need:

1. `AnchorTarget` gains `creature_or_object` variant
2. `AnchoredFilter` gains `creature_kind_specification` variant
3. `AnchoredSignal` gains a `save_gate_result` variant (or is replaced by a richer `AnchoredEffect` type that can host an `ActivationPhase`-style save gate)
4. A new `compelled_movement` effect atom (continuous per-turn behavioral override)
5. `AnchoredEvent` gains a `creature_exits_range` / `end_of_turn_beyond_range` variant for the repeat-save escape
6. A `repeat_save_exit` surface shape with timed immunity

Alternatively, a new `proximity_enchantment` family would be cleaner and avoid overloading `anchored_trigger` with mechanically distinct semantics. The two families share "planted + later triggered" but differ fundamentally in what the trigger does (notification vs. mechanical condition resolution).

The `Condition` type widening (frightened, charmed) is independently required regardless of which path is chosen.
