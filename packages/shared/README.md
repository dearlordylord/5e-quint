# @dnd/shared

`@dnd/shared` owns cross-package scalar domain types, rules vocabulary, and
package-neutral utilities that are not specific to one runtime package.

The `validation` export owns the shared `Result` traversal that accumulates
independent validation issues while preserving input order. Semantic algebras
and their domain-specific issues remain in `@dnd/shared-algebras` or their
owning package.

Shared branded numeric types should be added here only when the concept is used
across package boundaries or is expected to be consumed by more than one
runtime/projection layer. Package-local protocol counters should stay in their
own package.

Current shared battle-facing scalar ownership:

- `MovementFeet` - non-negative distances, ranges, reach, Speed, and Movement
  budgets measured in feet.
- `MovementDeltaFeet` - signed feet deltas for effects that increase or reduce
  Speed.
- `SpellSlotLevel` - slot levels 1-9.
- `ResourceCount` - non-negative counted pools and quotas.
- `DifficultyClass` - DC targets for ability checks and saving throws.
- `AbilityModifier` - integer modifiers derived from ability scores or
  spellcasting abilities.
- `AttackBonus` - integer attack-roll modifiers.
- `DamageAmount` - non-negative damage magnitudes after dice and target
  adjustments are resolved.
