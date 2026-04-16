# Proposal: Ray of Enfeeblement — Structural Widening

## Spell Summary

Ray of Enfeeblement (Necromancy 2, concentration 1 min) fires a CON save at a single target within 60 ft. The save has two asymmetric branches:

- **Success**: Disadvantage on the target's *next* attack roll until the start of the caster's next turn.
- **Failure**: For the spell's concentration duration —
  - Disadvantage on all Strength-based D20 Tests (attack rolls, saving throws, ability checks).
  - Subtract 1d8 from all the target's damage rolls.
  - Repeat CON save at the end of each of the target's turns; success ends the spell.

## Why the Unit Does Not Fit

### 1. No payload family handles save-gated ongoing effects

The critical shape is: **initial save → on fail, activate ongoing concentration-duration effects; on success, apply a fleeting effect with its own per-turn expiry**.

- `activation` + `save_gate` phase: `onFail` and `onSuccess` are typed as `Effect = DamageEffect | NoneEffect`. Ongoing effects cannot be launched from a phase result. There is no path from "save fails" to "attach a persistent operation for the spell duration."
- `ongoing_effect`: expresses a single persistent operation on an attachment, with no initial conditional save gate. The operation runs unconditionally; Ray of Enfeeblement's effects are *conditional on* the initial save failing.

A new family — provisionally `save_gated_ongoing_effect` — is needed, or `activation` must gain a mechanism to express "on fail: arm these operations for the spell duration."

### 2. `repeat_save` has no surface expression

The `repeat_save` resolution atom exists in the v4 taxonomy but has no field in any `SpellMechanics` family. The turn-end repeat-save expiry is structurally absent from the surface. This is a lifecycle shape that is meaningfully distinct from fixed-time expiry (`expire`) or caster-broken concentration (`self_break`).

### 3. `Effect` is missing `modify_roll_advantage`

The success branch gives disadvantage on the target's next attack roll. `Effect = DamageEffect | NoneEffect`. The v4 atom `modify_roll_advantage` exists but is only reachable from `MasteryEffect`, not from activation phases. Encoding the success branch requires `Effect` to gain a `modify_roll_advantage` variant.

### 4. No surface path for subtracting from damage rolls

"Subtracts 1d8 from all its damage rolls" requires modifying damage output. `RollModifierOperation` targets `RollKind = "attack_roll" | "saving_throw"`. Damage rolls are not in scope. Options:
- Add `"damage_roll"` to `RollKind` and allow `RollModifierOperation` to target it; or
- Introduce a distinct `OngoingOperation` kind for damage-output modification (e.g. `modify_damage_output`).

The second option is preferable because damage rolls are structurally unlike d20 rolls — they don't have advantage/disadvantage semantics, only numeric modification.

### 5. `RollKind` is missing `"ability_check"`

"Strength-based D20 Tests" includes STR ability checks in addition to STR attack rolls and STR saving throws. Current `RollKind` covers only `"attack_roll"` and `"saving_throw"`. Encoding the full scope of the failure-branch disadvantage requires either:
- Adding `"ability_check"` to `RollKind`; or
- Introducing an ability-scoped filter on the modifier (e.g. `abilityFilter: "str"` on a `modify_roll_advantage` operation).

## Proposed Widenings (Priority Order)

| # | Kind | Name | Required for |
|---|------|------|-------------|
| 1 | `new_subgraph` | `save_gated_ongoing_effect` family | Core structure: save gate that arms ongoing effects on failure |
| 2 | `new_subgraph` | `repeat_save_expiry` mechanism | Turn-end repeat save ending the spell on success |
| 3 | `new_variant` | `Effect: modify_roll_advantage` | Success-branch: disadvantage on next attack roll |
| 4 | `new_variant` | `OngoingOperation: modify_damage_output` | Failure-branch: subtract 1d8 from damage rolls |
| 5 | `new_variant` | `RollKind: "ability_check"` | Failure-branch: full scope of STR D20 Tests |

## Atoms the Tracer Would Emit (Projected)

If the surface were widened to support this spell, the expected atom set would include:

- `spell_root`, `activate` (procedure)
- `action_quota`, `spell_slot`, `concentration_lock`
- `concentrate`, `expire` (lifecycle)
- `target` (attachment)
- `save_gate` (resolution — initial save)
- `repeat_save` (resolution — turn-end iterative save)
- `modify_roll_advantage` (effect — success branch: disadvantage on attack)
- `modify_roll_advantage` (effect — failure branch: disadvantage on STR D20 Tests)
- `modify_damage_output` (effect — failure branch: -1d8 from damage rolls)

## Notes

The success-branch effect also has a sub-spell-duration expiry ("until the start of your next turn") that is distinct from the spell's concentration window. This per-effect expiry — as opposed to the spell's own expiry — is a further structural refinement that may warrant a `turn_start_window`-anchored expiry node on the effect. The repeat-save expiry on the failure branch is similarly distinct from both the per-effect expiry and the concentration break.

No `dhall` or `json` encoding was produced. A dishonest trace would require lying about at minimum the family, the effect types, and the repeat-save lifecycle.
