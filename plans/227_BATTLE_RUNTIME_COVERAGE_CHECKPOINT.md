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
- Measured code tree committed as: `ecc4f63aa`
- Command: `pnpm coverage`
- Result: exit 0; every workspace coverage package completed green
- Battle-runtime: 219/219 files passed; 2,373 passed and 71 skipped
- Every executable package other than battle-runtime remains at or above 99%
  for statements, branches, functions, and lines.

| Metric     |   Covered / total | Coverage | Uncovered | Gap to 99% |
| ---------- | ----------------: | -------: | --------: | ---------: |
| Statements | 121,661 / 125,055 |   97.28% |     3,394 |      2,144 |
| Branches   |   30,994 / 32,782 |   94.54% |     1,788 |      1,461 |
| Functions  |     4,827 / 4,827 |     100% |         0 |          0 |
| Lines      | 121,661 / 125,055 |   97.28% |     3,394 |      2,144 |

Against M26, uncovered statements/lines are unchanged and uncovered branches
fell by one. Recompute the 99% gaps after every production-denominator change.

## Latest accepted milestone

M27 (`ecc4f63aa`) narrows attack-resolution admission proofs and preserves
generic dispatcher precedence for stale and unsupported bonus-action commands.
Focused tests, package typecheck, formatting, lint, and three independent Luna
reviews passed. This is an architectural prerequisite, not a coverage gain:
statements stayed flat and branches improved by one.

## Current campaign

- Continue coverage before starting issue #254 cyclomatic-complexity work.
- Select cohesive public scenarios with at least 50 exact, nonduplicate,
  feasible residual sites before editing; reject smaller audit candidates.
- Do not forge internal battle state to reach admission-proven or
  schema-impossible guards. Narrow or remove such guards only with concrete
  proof.
- Avoid owners already marked completed or rejected in
  `/tmp/dnd-work-ownership.md`; that ledger owns live parallel coordination.
- The current public static gaps are 2,144 statements/lines and 1,461 branches.

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
