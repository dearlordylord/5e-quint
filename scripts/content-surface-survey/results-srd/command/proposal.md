# Proposal: Surface gaps for Command (srd-5.2.1)

## Classification: `atom_widening`

Command is a Level 1 Enchantment spell. Its structure is a Wisdom save gate with a cast-time choice of 5 command options that execute on the target's next turn. Two of the five commands (Drop, Grovel) map to existing atoms cleanly; three require new atoms or variants.

---

## What fits

| Element | Encoding |
|---|---|
| Wisdom save gate | `save_gate`, ability: "wis", dc: caster_spell_save_dc |
| Target (one creature, 60 ft) | `attachment.target`, selection mode: "one" |
| Upcast (+1 target/slot above 1) | `choose_up_to` with `SlotScaling<number>` |
| Drop → drop held items | `force_drop_item` |
| Grovel → Prone condition | `apply_condition prone` |

---

## Gap 1 — No deferred execution timing for non-damage effects

All five commands execute **on the target's next turn**, not immediately. The surface has `damage.timing = "end_of_next_turn"` for deferred damage, but there is no general deferred-execution wrapper for behavioral/condition effects.

**Proposed widening**: Extend the deferred `timing` field (currently damage-only) to the general `EffectAtom` wrapper, or introduce a `deferred_to_next_turn` wrapper atom that contains a payload EffectAtom.

**Evidence**: "The target must succeed on a Wisdom saving throw or follow the command on its next turn."

---

## Gap 2 — No cast-time mode choice inside save_gate.onFail

The 5 commands are a cast-time selection over mutually exclusive behavioral branches. The surface has `CastTimeEffectModeChoice` but it only appears inside `ActivationPhase.direct`, not as a standalone `EffectAtom` composable inside `save_gate.onFail`.

**Proposed widening**: Promote `CastTimeEffectModeChoice` to an `EffectAtom` variant (e.g., `{ kind: "cast_time_mode_choice", ... }`) so it can appear wherever EffectAtom appears, including save branches.

---

## Gap 3 — No goal-directed forced movement atoms (Approach, Flee)

**Approach**: "The target moves toward you by the shortest and most direct route, ending its turn if it moves within 5 feet of you."

**Flee**: "The target spends its turn moving away from you by the fastest available means."

`force_move` takes a fixed direction (`push` | `pull` | `slide`) and a fixed distance in feet. It cannot express:
- "move toward [dynamic position] by shortest path"
- "spend your full movement moving away from [dynamic position]"
- The conditional turn-end (stop if within 5 feet)

**Proposed atoms**:
- `forced_move_toward`: `{ kind: "forced_move_toward", targetRef: "caster", stopWithinFeet?: number }` — target uses its movement to approach the referenced creature by shortest path, optionally stopping early.
- `forced_move_away`: `{ kind: "forced_move_away", targetRef: "caster" }` — target uses all available movement to maximize distance from the referenced creature.

---

## Gap 4 — No turn-level action economy restriction (Halt)

**Halt**: "On its turn, the target doesn't move and takes no action or Bonus Action."

This is not `apply_condition incapacitated`. Per SRD Rules Glossary, Incapacitated prevents Actions AND Reactions. Halt explicitly restricts actions and bonus actions but does **not** restrict reactions. No existing atom covers this configuration:

- `set_speed { feet: 0 }` handles the movement restriction.
- But "no action or bonus action while reactions remain available" has no atom.

**Proposed atom**: `restrict_turn_economy`: `{ kind: "restrict_turn_economy", noAction: true, noBonusAction: true, noMovement: true }` — a turn-scoped restriction on specific action-economy slots, distinct from the condition vocabulary.

---

## Encoding sketch (if all gaps were filled)

```
activation spell, level 1, enchantment
castingTime: action
range: 60 ft point
components: V only
duration: instantaneous

phases:
  save_gate:
    attachment: target (one creature)
    ability: wis
    dc: caster_spell_save_dc
    onFail:
      cast_time_mode_choice (label: "Choose a command"):
        Approach: deferred_to_next_turn { forced_move_toward caster, stop within 5 ft }
        Drop:     deferred_to_next_turn { force_drop_item }
        Flee:     deferred_to_next_turn { forced_move_away caster }
        Grovel:   deferred_to_next_turn { apply_condition prone }
        Halt:     deferred_to_next_turn { restrict_turn_economy noAction noBonusAction noMovement }
    onSuccess: none

upcast: target selection scales to choose_up_to (SlotScaling base=1, +1/slot above 1)
```

---

## Atoms needed (summary)

| Gap | Kind | Name |
|---|---|---|
| Deferred next-turn execution | `new_variant` | Extend `EffectAtom` with deferred timing (non-damage) |
| Cast-time choice inside save branch | `new_variant` | `cast_time_mode_choice` as EffectAtom |
| Approach: goal-directed movement toward | `new_atom` | `forced_move_toward` |
| Flee: goal-directed movement away | `new_atom` | `forced_move_away` |
| Halt: action+bonus-action restriction without reaction block | `new_atom` | `restrict_turn_economy` |
