# Unsupported mechanics: implementation-history findings

Research date: 2026-09-09. This note records historical evidence, not a new
architecture decision. The current accepted contract remains
[#12](https://github.com/dearlordylord/5e-quint/issues/12), with local ownership
routed through [CONTEXT-MAP.md](../../CONTEXT-MAP.md).

## Finding

Staged implementation breadth is a documented reason for retaining authored
content whose mechanics were not executable. However, the inspected history
does not promise that unsupported outcomes disappear at ten Units or character
level 10. The later Cleanroom decision explicitly preserves a complete source
catalog, derives an executable subset, and rejects unsupported supplied graphs
at installation. These are different claims from compile-time coverage of every
schema-expressible mechanic.

## Evidence in order

- **2026-04-14:** commit
  [41725b9a4](https://github.com/dearlordylord/5e-quint/commit/41725b9a4fffd9cab14edc45888ec8bd446fbfb9)
  adds typed blocker families to authored text-only monster abilities and a
  code-derived unsupported report. Its `ACTIVE_PLAN.md` describes a bounded
  dataset expansion that preserves unsupported clauses, followed by individual
  generic runtime-facility tasks. This supports the user's recollection of
  content breadth preceding execution breadth. It is an early located example,
  not a claim that this commit first introduced every unsupported outcome.
- **2026-04-30:** commit
  [3225467dc](https://github.com/dearlordylord/5e-quint/commit/3225467dcc37777de55cfd636408ed6bcd7d8d00)
  introduces the architecture rule that a legal Surface shape can be not yet
  admitted. Widen the owning reader/support gate or implement a reusable
  procedure family. This was an explicit extensibility policy, not just an
  incidental implementation branch.
- **2026-05-01:** commit
  [41fa33485](https://github.com/dearlordylord/5e-quint/commit/41fa33485c240bc800e1ec769ed28829b94100f7)
  defines support profiles as procedure-facing parser outputs proving a match
  to an implemented procedure. The migration removes authored-identity dispatch.
  At that time its discovery/resolution instruction permitted either reparsing
  or carrying the narrowed profile.
- **2026-05-07:** commit
  [4ae8ce6d8](https://github.com/dearlordylord/5e-quint/commit/4ae8ce6d82761d2c67d152017370b11c9acd132a)
  carries parsed support-profile payloads instead of collapsing them to markers
  and rebuilding constants downstream. Preserving parsed information therefore
  predates SR-04; SR-05 addresses the aggregate composition and handoffs.
- **2026-07-13:** the
  [accepted admission decision](https://github.com/dearlordylord/5e-quint/issues/17#issuecomment-4963611875)
  keeps the canonical catalog source-side and supplies complete source-executable
  graphs to Targets. Its
  [historical decision document](https://github.com/dearlordylord/5e-quint/blob/228f335f4/plans/wayfinder/cleanroom-sdk/static-mechanics-admission-and-dynamic-availability.md)
  reports conflation among collection integrity, handoff-time support recognition,
  and state-dependent discovery. It requires typed rejection before discovery,
  prevents partial records, and makes discovery consume admitted mechanics.
  It mandates no uniform Target intermediate representation or stored admission
  object. It expressly retains unsupported-mechanics rejection; it does not
  prescribe a sunset tied to feature count.
- **2026-07-21:** a
  [teaching-derived clarification on #51](https://github.com/dearlordylord/5e-quint/issues/51#issuecomment-5038798599)
  accepts an individual procedure probe returning `[]`, but requires aggregate
  installation to reject a shipped record when all probes return `[]` or
  previously admitted mechanics disappear.
- **2026-07-21:** a separate
  [teaching decision on #204](https://github.com/dearlordylord/5e-quint/issues/204#issuecomment-5039994140)
  requires exhaustive classification of the `BattleFill` union: a new variant
  must fail typecheck until deliberately accepted or rejected. That is explicit
  compile-time exhaustiveness of a procedure's input parser. It is not a promise
  of execution support for all Surface mechanics.
- **2026-08-29:** the
  [#51 integration report](https://github.com/dearlordylord/5e-quint/issues/51#issuecomment-5460642203)
  records the atomic installation implementation. The
  [#52 reopening evidence](https://github.com/dearlordylord/5e-quint/issues/52#issuecomment-5461350639)
  then reports that complete canonical content decoded but admission rejected
  2,117 issues. The Unit check incorrectly required a nonempty Battle profile,
  rejecting Creation-owned roots. This is concrete overly narrow admission,
  not evidence that schema-valid content was universally installed and crashed.

## Implications and limits

The historical direction is to expand reusable procedure support, preserve
complete authored content, reject unsupported execution, and carry parsed
mechanics forward. A stronger rule that every schema-expressible mechanic must
have execution support would strengthen or revise that contract. It should not
be described as already guaranteed by exhaustive matches.

The inspected commits and issues establish no promise to remove unsupported
outcomes after a particular breadth milestone. They also do not establish that
retaining unsupported source content must be permanent. That remains a design
choice. Character progression horizons and the number of Unit records must not
be equated; the [accepted specification](https://github.com/dearlordylord/5e-quint/issues/12)
defines Source Execution levels 1–10 and Workflow levels 1–2 separately from
schema support and complete-graph inclusion.

Research used read-only git and GitHub queries. Plain `gh issue view` failed
because of the deprecated Projects Classic field; explicit JSON fields worked.
No verification or runtime behavior was changed.
