# Phantom Steed Runtime WIP Backlog Notes

Captured on 2026-06-20 after the owner directed Ralph to park Phantom Steed
runtime work and continue with other runnable tasks.

## Decision

Do not claim Phantom Steed runtime support from the current WIP. The work
exposed real missing owners:

- longer casting progress: Magic action each turn, Concentration while casting,
  failure before completion, and explicit completed-cast emission;
- mounted state and riding/control: mounted occupancy, controlled mount
  initiative/action coupling, rider permission, and dismount semantics;
- created saddle, bit, and bridle object/equipment occurrence cleanup;
- table travel pace projection for the 13-mile travel fact.

The already-landed Surface/accounting split remains valid. Runtime promotion is
deferred until those owners exist or are explicitly scoped.

## Preserved Work

- `round-8.tracked.diff` preserves the latest tracked WIP diff from task 23.
- `round-8-implementer-summary.md` preserves the implementer's final summary,
  including claimed tests and intended split boundaries.
- `round-8-review.md` preserves the final reviewer findings that rejected the
  WIP.
- `round-7-review.md` preserves the earlier broader rejection that identified
  the major domain blockers.

Important limitation: Ralph's diff capture did not include untracked new file
bodies from the disposable task worktree. The final summary names those files,
and the tracked diff/review notes preserve the design pressure, but any future
revival should re-author the new files from the saved notes rather than treating
this artifact as an apply-clean patch.

## Reusable Suggestions

- A completed long-cast spell should be a subject emitted by a future long-cast
  progress owner, not an ordinary discovered spell act.
- A spell-created mount must not automatically gain an independent initiative
  turn or generic stat-block action surface merely because it exists as a
  combatant.
- Riding Horse data should stay catalog-backed. Phantom Steed should only carry
  the spell-specific projection such as the walk Speed override.
- Damage to the steed should end the spell-owned active lifecycle and enter the
  one-minute fade/dismount grace, not disappear as an ordinary zero-HP creature.
- Lifecycle counters should make zero-tick active/fading states
  unrepresentable; zero belongs to the transition/removal result.
- Any eventual completed-cast resolver must pass through the same turn-resource
  gate as ordinary spell resolution, including same-turn spellcasting locks.
