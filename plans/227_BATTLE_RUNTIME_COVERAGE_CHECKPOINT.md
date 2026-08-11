# Issue #227 battle-runtime coverage checkpoint

> **Continuity contract:** GitHub issue #227 owns the requirements. This file
> is a temporary current-state handoff, not a history log or second task ledger.
> Git history owns completed-milestone detail. Delete this file when #227 is
> complete.

Deleting this checkpoint does not authorize deleting or changing the approved
untracked `docs/research/` or `packages/battle-runtime/coverage_tmp*` artifacts.

## Measurement boundary

- The authoritative diagnostic is the public root `pnpm coverage` command.
- Only checked-in instrumentation, exclusions, and package summaries count.
- Focused reports help attribute a milestone but do not replace the public run.
- Direct or filtered MBT commands must follow `docs/agents/QNT-MBT.md`.
- The checked-in battle-runtime ratchets remain 97% statements, 97% lines,
  100% functions, and 94% branches; none has been lowered.

## Current authoritative baseline

- Date: 2026-08-11
- Measured code tree committed as: `dbd1699cf`
- Command: `pnpm coverage`
- Result: exit 0; every workspace coverage package completed green
- Battle-runtime: 224/224 files passed; 2,399 passed and 81 skipped
- Every executable package other than battle-runtime remains at or above 99%
  for statements, branches, functions, and lines.

| Metric     |   Covered / total | Coverage | Uncovered | Gap to 99% |
| ---------- | ----------------: | -------: | --------: | ---------: |
| Statements | 121,810 / 125,035 |   97.42% |     3,225 |      1,975 |
| Branches   |   31,170 / 32,903 |   94.73% |     1,733 |      1,404 |
| Functions  |     4,827 / 4,827 |     100% |         0 |          0 |
| Lines      | 121,810 / 125,035 |   97.42% |     3,225 |      1,975 |

Recompute the 99% gaps after every production-denominator change.

## Latest accepted milestone

M30 (`23b0bf6f0`) covers public Heat Metal entry, repeat, damage, reaction,
Antimagic, concentration, and cross-spell lifecycle boundaries. Focused
attribution addressed 51 exact residual statements (37 covered and 14 proven
dead guards pruned); the public aggregate reduced uncovered statements/lines by 59. Focused checks, reviewer convergence, and public coverage passed.

## Current campaign

- Continue coverage before starting issue #254 cyclomatic-complexity work.
- Select cohesive public scenarios with at least 50 exact, nonduplicate,
  feasible residual sites before editing; reject smaller audit candidates.
- Do not forge internal battle state to reach admission-proven or
  schema-impossible guards. Narrow or remove such guards only with concrete
  proof.
- Avoid owners already marked completed or rejected in
  `/tmp/dnd-work-ownership.md`; that ledger owns live parallel coordination.
- The current public static gaps are 1,975 statements/lines and 1,404 branches.

## Verification and completion

1. For a modeled-rule change, trace the rule to the local SRD and
   `UBIQUITOUS_LANGUAGE.md`; do not browse a substitute rules source.
2. At a reasonable milestone, run focused tests, package typecheck, formatting,
   lint, and any behavior-relevant locked MBT.
3. Require Luna self-review, then repeat independent RAW/domain,
   architecture/connascence, standards, and specification reviews until no
   reasonable findings remain.
4. Run public root `pnpm coverage` and update only this current baseline.
5. After every executable package reaches 99% on all four metrics, complete
   issue #254, run public root `pnpm quality`, record durable issue evidence,
   and delete this temporary checkpoint.
