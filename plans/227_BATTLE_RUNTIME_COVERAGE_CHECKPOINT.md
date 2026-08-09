# Issue #227 - Battle-runtime coverage checkpoint

> **Continuity contract:** The canonical authority is
> [GitHub issue #227](https://github.com/dearlordylord/5e-quint/issues/227).
> This is a temporary, unindexed, issue-local continuity note. It is not a
> specification, acceptance owner, coverage framework, command owner, or second
> task ledger. Delete it when issue #227 reaches its 99% target. If final
> evidence is worth retaining, distill that evidence into issue #227 first and
> then delete this file.

Deleting this checkpoint does not authorize deleting or changing the approved
untracked docs/research/ or packages/battle-runtime/coverage_tmp\* artifacts.

## Measurement boundary

- Root pnpm coverage is the authoritative coverage diagnostic.
- Focused or custom coverage reports are navigation aids only.
- Root pnpm quality is the final acceptance command.
- Do not add a command, harness, configuration, index entry, or JSON ledger for
  this issue.
- Production include/exclude ownership remains in
  [scripts/workspace-quality-harness.mjs](../scripts/workspace-quality-harness.mjs);
  this checkpoint does not duplicate that configuration.

Session logs were captured under /tmp, but /tmp is reboot-volatile. The
self-contained command, date, HEAD, exit status, and totals below are the
authoritative evidence.

## Current authoritative diagnostic

- Date: 2026-08-08
- Command: root pnpm coverage
- HEAD: 9ac5cc080832bdc5523877f207ac7a88242d49f6
- Exit: 0
- Duration: 707 seconds
- Battle-runtime tests: 203/203 files passed; 2,157 passed and 53 skipped

| Metric     |              df7a0e279 |              9ac5cc080 |              Count change |     Uncovered change |
| ---------- | ---------------------: | ---------------------: | ------------------------: | -------------------: |
| Statements | 120282/124849 (96.34%) | 120140/124654 (96.37%) | -142 covered / -195 total | 4,567 -> 4,514 (-53) |
| Branches   |   29989/32248 (92.99%) |   30004/32230 (93.09%) |   +15 covered / -18 total | 2,259 -> 2,226 (-33) |
| Functions  |                   100% |       4782/4782 (100%) |      unchanged percentage |               0 -> 0 |
| Lines      | 120282/124849 (96.34%) | 120140/124654 (96.37%) | -142 covered / -195 total | 4,567 -> 4,514 (-53) |

Every other workspace package remained at or above 99% for every metric. The
lowest non-battle-runtime results were 99.26% statements/lines, 99.00%
branches, and 99.44% functions.

### Static-denominator planning math

These are non-authoritative planning gaps. They hold only if the current
denominators remain fixed and must be recomputed after production changes.

- Statements and lines: 3,268 additional covered items to reach 99%
- Branches: 1,904 additional covered items to reach 99%
- Functions: 0

## Increment outcome

### Production and correctness value

The four runtime refactors form one consolidation increment: 5b63db124
centralized spatial save replay interrupts, 5f7a5a238 correlated spell-damage
target projections, a084b47d5 centralized dynamic spell target-selection
parsing, and 9340f7b42 centralized dynamic spell presentation sources.
Together they colocate facts that must change together, remove parallel
parsing/projection paths, and carry target identity and presentation through
shared typed spell-resolution boundaries.

### Production-size value

The production deltas are -11, -75, -3, and -63 lines respectively, for
approximately 152 fewer production lines overall. The a084b47d5 commit
statistic is 90 insertions and 93 deletions, confirming its net -3. These
production-size figures exclude the separate test-layout correction and are not
coverage counts.

### Coverage value

At the authoritative boundary, uncovered statements/lines fell by 53 and
uncovered branches fell by 33. The displayed statement/line percentage rose
0.03 points and branch percentage rose 0.10 points. Covered statement count
also fell because the refactors deleted executable paths; this is a smaller,
less duplicated runtime surface, not evidence of newly implemented mechanics.

9ac5cc080 corrected test continuity by splitting seven semantically independent
level-3 admission rejection cases that had shared one five-second test budget.
It changed neither runtime behavior nor coverage selection and allowed the
authoritative diagnostic to complete.

## Next campaign: save-resolution orchestration

The counts below are navigation-only. Their source is the retained custom
403-file map at packages/battle-runtime/coverage_tmp2/coverage-final.json, not
the public pnpm coverage result. Its aggregate coverage universe differs from
the current public battle-runtime totals above, so these counts are directional
candidate signals and do not establish precise current rankings.

- battle-reducer/spells-resolve-save-gates.ts: 148 uncovered statements and 71
  uncovered branches
- battle-reducer/spells-resolve.ts: 169 uncovered statements and 56 uncovered
  branches
- battle-reducer/spell-procedure-profiles/\_save-gate-helpers.ts: 49 uncovered
  statements and 38 uncovered branches

Start with a domain and connascence audit of save-result routing across these
owners. Consolidate only duplicated parsing, projection, or continuation logic
that represents the same rule fact. Do not add a registry, adapter, coverage
exception, or second state representation. Re-navigate after the focused
increment before choosing another owner.

## Verification and completion

1. Before changing modeled behavior, trace each affected rule to the local SRD
   5.2.1 corpus and check UBIQUITOUS_LANGUAGE.md; record an assumption only
   when RAW is genuinely silent.
2. Run focused owner tests and package typecheck. Run the relevant focused MBT
   only when runtime behavior or a Quint-owned boundary changes, following the
   resource and seed rules.
3. Run RAW/ubiquitous-language, architecture/domain/connascence, and code-review
   passes after implementation. Fix every reasonable finding and repeat until
   the reviewer loop converges.
4. Use a complete root pnpm coverage run as the next authoritative diagnostic.
5. Run root pnpm quality as final acceptance before closing issue #227.
6. At 99%, distill any durable final evidence into issue #227, delete only this
   checkpoint, and leave the approved untracked artifacts untouched.
