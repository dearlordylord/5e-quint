# Potion of Gaseous Form — Widening Proposal

## Outcome

`atom_widening`

The item has an honest top-level home: `magic_item` with `activation` mechanics, one use, no reset, and deterministic destruction on use. I did not author `content/magic_item_potion_of_gaseous_form.dhall` because the inherited `Gaseous Form` effect still cannot be represented faithfully on the current surface, and the potion text adds a further duration-end rider that is also missing.

## What Fits Already

- `MagicItemRecord`
- `ActivatedAbilityMechanics`
- single-use consumable resource/destruction pattern, matching other potions
- timed duration of 1 hour without Concentration

If the inherited spell effect were fully expressible, this would otherwise look like the same overall family as [magic_item_potion_of_flying.dhall](/workspace/typescript/dnd/.worktrees/auto-close-loop-worker-d/scripts/content-surface-survey/workers/921342-magic_item_potion_of_gaseous_form/content/magic_item_potion_of_flying.dhall:1) and [magic_item_potion_of_invisibility.dhall](/workspace/typescript/dnd/.worktrees/auto-close-loop-worker-d/scripts/content-surface-survey/workers/921342-magic_item_potion_of_gaseous_form/content/magic_item_potion_of_invisibility.dhall:1).

## Blocking Gaps

### 1. Missing atom: movement through tiny openings

The inherited spell effect includes a form-state movement permission:

> the target can move through a space as small as 1 inch wide without squeezing

That is not:

- `grant_speed`
- `teleport`
- `force_move`
- `block_travel`

It is a standing capability of the gaseous form itself. The current surface has no atom for that capability, and the v4 taxonomy does not already supply one.

Proposed addition:

- `grant_movement_through_openings`

### 2. Missing surface variant: `restrict_action_set` as an effect atom

The inherited spell effect also restricts what the target can do while gaseous:

> The target can't attack or cast spells.

The v4 taxonomy already includes `restrict_action_set`, but the current TS surface does not expose it in `EffectAtom`, and the tracer does not handle it either. Without that effect shape, the item cannot represent one of the spell's core restrictions honestly.

Proposed addition:

- add `restrict_action_set` to `EffectAtom` and tracer handling

### 3. Missing duration-end trigger: self-dismiss as Bonus Action

The potion text adds a distinct item-side rider:

> or until you end the effect as a Bonus Action

Current duration early-end triggers are passive events such as attacking, taking damage, or casting a spell. None represent a voluntary, action-economy-costed dismissal.

Proposed addition:

- `DurationEndTrigger.self_dismisses_as_bonus_action`

## Why I Did Not Author a Placeholder

Any JSON I could produce today would have to omit real inherited mechanics from `Gaseous Form`, not just incidental flavor. That would create a misleading trace. Per the task guardrails, a widening report is better than a fake clean encoding.
