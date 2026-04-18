# Proposal: Talisman of the Sphere

**Outcome:** `atom_widening`

## Unit Summary

Talisman of the Sphere is a Legendary wondrous item (requires attunement) with two distinct mechanics:

1. **Passive advantage on Arcana checks** — scoped specifically to checks made to control a Sphere of Annihilation.
2. **Conditional Magic-action activation** — when the bearer starts their turn in control of a Sphere of Annihilation, they may take a Magic action to move it 10 + (10 × INT modifier) feet.

## What Fits

- The record shape is `magic_item`, `composite` mechanics over `passive` + `activation` — both families exist.
- The advantage grant is conceptually `modify_roll_advantage` (ability_check, arcana skill) — the atom exists.
- The activation is `standard_action: "magic"` cost, `use_count` resource, `long_rest` cadence — all exist.

## What Doesn't Fit

### 1. Use-context predicate on `modify_roll_advantage` (surface widening)

The advantage applies only "to control a Sphere of Annihilation" — a specific interaction, not all Arcana checks. The current `modify_roll_advantage` surface supports:
- `skillFilter` — narrows to specific skills
- `conditionFilter` — narrows to rolls made to avoid/end conditions
- `saveAbilityFilter` / `saveSourceFilter` — saving throw narrowing
- `attackerTypeFilter` — narrows by attacker creature type

None of these covers "this roll is made in the context of controlling a specific named object/interaction." Encoding without this filter would incorrectly grant advantage on ALL Arcana checks while the item is held.

**Proposed widening:** Add an optional `useContextFilter` (or `interactionFilter`) variant to `modify_roll_advantage` (and potentially `modify_roll_numeric`) for SRD situations where a roll modifier is bounded to a named interaction, not just a skill or condition. The Talisman of the Sphere is one pressure case; the Cube of Force (checks to activate faces) and similar interaction-scoped rolls would also benefit.

### 2. Missing atom: `move_controlled_object` (atom widening)

"Move it 10 feet plus…" — the bearer repositions an external game object (the Sphere of Annihilation) that they have under control. No current atom covers this:
- `force_move` — pushes/pulls/slides a **creature**, not a controlled object.
- `modify_speed` — changes the **bearer's** own walk speed.
- `teleport` — repositions the **bearer**, not an object.
- `grant_speed` — grants a new speed mode to the **bearer**.

The Sphere of Annihilation is a unique object with its own movement rules; controlling it is an established SRD mechanic. The talisman extends those movement rules with a Magic action.

**Proposed widening:** New `move_controlled_object` effect atom, or a `move_object` atom family. This would reference the controlled object by identity (e.g., "sphere_of_annihilation") and carry a `distanceFeet` DiceAmount.

### 3. Missing DiceAmount variant for coefficient-scaled ability modifier (surface widening)

The movement distance is `10 + (10 × INT modifier)` feet. Current `DiceAmount` supports:
- `fixed`: `DiceExpr` with `abilityModifier` — gives `base + 1×MOD`
- No variant that applies a multiplier to an ability modifier (N × MOD)

**Proposed widening:** Add a `DiceAmount` variant (or extend `DiceExpr`) to support `flat + coefficient × ability_modifier`. Candidate name: `affine_ability_modifier`. This would cover any RAW formula of the form "X plus Y times your [Ability] modifier."

## Composite Shape If Widened

If all three gaps were filled, the item would encode as:

```
composite:
  parts:
    - passive (condition: wearing_item / holding_item):
        grants:
          - modify_roll_advantage
              mode: advantage
              on: [ability_check]
              skillFilter: { kind: fixed, skills: [arcana] }
              useContextFilter: { kind: sphere_of_annihilation_control }
    - activation:
        activationCost: { kind: standard_action, action: magic }
        condition: { kind: holding_item }
        resource: { kind: use_count, cap: { kind: fixed, uses: 1 } }
        resetCadence: { kind: long_rest }    -- or "each turn" — per RAW this is available each turn when in control
        phases:
          - direct:
              attachment: { kind: self }
              effects:
                - move_controlled_object:
                    objectId: sphere_of_annihilation
                    distanceFeet: affine_ability_modifier(base=10, coefficient=10, ability=int)
```

Note: The activation is actually available "when you start your turn in control" — this is a per-turn conditional, not a once-per-rest ability. The current surface has no per-turn reset cadence that isn't tied to a rest. This may also warrant a `TimeResetCadence.per_turn` variant, though the "in control" gate is the more novel part.

## Classification

**atom_widening** — the `move_controlled_object` atom is entirely absent from the v4 taxonomy. The use-context predicate and affine-modifier DiceAmount are surface-level variants of existing constructs. Since the core activation effect has no atom, this unit cannot be honestly encoded.
