# Cubic Gate

## Verdict

`Cubic Gate` fits the existing `magic_item` record kind and `activation` mechanics family in broad shape:

- Magic action activation
- charge pool (`3`)
- dawn recharge (`1d3`)
- direct spell grants for `gate` and `plane_shift`

The blocker is narrower: the current surface cannot honestly encode that each granted cast is constrained by the pressed cube face's keyed plane.

## Missing shape

Current `grant_spell_access` supports:

- `mode`
- `dcOverride`
- `areaOverride`
- `targetRestriction`
- `durationOverride`

It does **not** support a spell-specific destination override for transport / planar-travel spells.

`Cubic Gate` needs something like a grant-side override shaped around a closed keyed-plane selection, for example:

- a `grant_spell_access` variant/field that binds the granted spell's planar destination to an item-owned side choice
- or a more general spell-parameter override surface that can express `Gate` / `Plane Shift` destination selection without restating the full spell

## Why this is a surface widening, not atom widening

This does not force a new v4 atom. The missing concept is an authored-surface parameter on an existing magic-item spell-grant pattern.

The item's mechanics are still fundamentally:

- activation
- charge consumption
- spell access grant

What is missing is the shape that tells the granted spell **which plane** it must use.

## Evidence

- "Pressing one side of the cube, you cast Gate, opening a portal to the plane of existence keyed to that side."
- "Pressing one side of the cube twice, you cast Plane Shift, transporting the targets to the plane of existence keyed to that side."

## Why no placeholder Dhall was authored

Authoring this as plain `grant_spell_access` for `gate` and `plane_shift` would lose the unit's main deterministic mechanic and make the trace falsely suggest an unrestricted cast of those spells. Per the task guardrails, that is worse than no authored unit.
