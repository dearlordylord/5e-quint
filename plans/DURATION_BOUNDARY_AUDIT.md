# Duration Boundary Audit

## Purpose

Concrete checklist for the `duration-boundary-audit` node from [DAG.md](./DAG.md) and [DAG_RUNBOOK_2.md](./DAG_RUNBOOK_2.md).

This is not a redesign plan. It is a boundary checklist for timing-sensitive effect behavior that should be covered by deterministic tests before changing production code.

## Audit Surface

Check these boundaries in both creature-level and battle-level flows:

1. Start-of-turn decrement vs. start-of-turn expiry removal.
2. End-of-turn expiry removal without touching start-of-turn effects.
3. Owner-scoped effect advancement in battle.
4. Concentration auto-break when the last matching active effect expires.
5. Concentration preservation when the matching effect survives the current boundary.
6. Cross-creature ephemeral links that expire on an owner's next boundary.
7. Once-per-turn flags that reset on the correct turn boundary only.

## Current Deterministic Coverage

Creature-level:

- [dndTest.qnt](/workspace/typescript/dnd/dndTest.qnt)
  - `test_conc_auto_break_expired_at_start`
  - `test_conc_auto_break_expired_at_end`
  - `test_conc_not_broken_when_effect_still_alive`
  - `inv_activeEffect_expiryPhaseSpecific`

TypeScript:

- [machine.test.ts](/workspace/typescript/dnd/packages/core/src/machine.test.ts)
  - `derives start-of-turn healing from owned active effects without payload help`
  - `help state expires only for creatures owned by the starting turn creature`
- [battle-rules-scenarios.test.ts](/workspace/typescript/dnd/packages/core/src/battle-rules-scenarios.test.ts)
  - `Help expires when the helper's next turn starts if unused`

## Audit Rule

If a new timing bug is suspected:

1. Add a deterministic regression first.
2. Identify the exact boundary being violated.
3. Change only the owner of that boundary.
4. Re-run the focused regression, then the shared timing suites.

## Shared Verification

- `pnpm exec quint test --match "test_conc_auto_break|inv_activeEffect_expiryPhaseSpecific" dndTest.qnt`
- `pnpm --filter @dnd/core exec vitest run src/machine.test.ts src/battle-rules-scenarios.test.ts`
- `pnpm --filter @dnd/core exec tsc --noEmit`
