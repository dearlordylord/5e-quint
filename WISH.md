Things I wished I knew when starting on this spec.

## Architecture: environmental vs. creature state

`CreatureState` holds persistent creature-level state (conditions, HP, exhaustion). Environmental context (underwater, cover, squeezing) is NOT in `CreatureState` — it's passed by the caller as function parameters or in `AttackContext` records. When adding environmental modifiers to damage resolution, DON'T add fields to `CreatureState`. Instead, create a pure helper that augments the caller-provided sets (resistances, immunities, etc.) and let the caller compose it before passing to `pTakeDamage`.

## Resistance is a Set — stacking is a non-issue

Resistances are `Set[DamageType]`. Adding `Fire` to a set that already contains `Fire` is idempotent. This means "resistance doesn't stack" is automatically handled by the data structure — no special logic needed.

## Petrified pattern vs. underwater pattern

Petrified resistance to all damage is handled INSIDE `pTakeDamage` because `petrified` is a `CreatureState` field. Underwater fire resistance is handled OUTSIDE `pTakeDamage` via a helper (`pUnderwaterResistances`) because underwater is environmental. This distinction matters — don't mix the patterns.

## The `pTakeDamage` signature is load-bearing

`pTakeDamage` has many callers (state machine actions, `pApplyFall`, tests). Changing its signature is expensive. Prefer composable helpers that transform inputs (e.g., augment the resistance set) over changing the function signature.

## Quint test runner output

When running `quint test` on the full test file, output can appear truncated or delayed for large test suites. Run specific test subsets with `--match` for faster feedback during development. Always append `; echo "EXIT:$?"` when you need to see the exit code.

## SRD 5.2.1 underwater rules are simpler than 5.1

5.2.1 dropped the "fully submerged" distinction. It's just "underwater" — binary. The fire resistance rule is one sentence: "Anything underwater has Resistance to Fire damage." No qualifications.
