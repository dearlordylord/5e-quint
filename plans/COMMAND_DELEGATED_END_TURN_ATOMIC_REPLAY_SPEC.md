# Command Delegated End Turn Atomic Replay Projection

## Problem Statement

Command option execution delegates to End Turn from five related paths: Approach,
Drop, Flee, Grovel, and Halt. Each path currently performs its own projection of
an unresolved delegated result back onto the Command replay root. The repeated
projection rewrites the returned battle state and subject, but leaves the
delegated snapshot untouched.

That behavior is internally contradictory. A `needsHoles` result can report the
outer committed state while exposing a snapshot made from provisional Command or
End Turn progress. A rejected nested fill can likewise expose a provisional
snapshot. This violates the battle runtime's atomicity rule: until the Battle Act
resolves, every externally visible pre-resolution snapshot must describe the last
committed battle state.

The duplication also makes the invariant caller-sequenced. Every Command option
must remember which parts of the delegated result to retain, which parts to
restore, and when caller-specific resolved metadata may be attached. Drop makes
the risk concrete: dropped-object outcomes belong only to its resolved result and
must not leak into an unresolved or invalid result.

The throwaway prototype demonstrated that a small Command-owned projection can
remove this repetition. Review also demonstrated that copying the current inline
expression would centralize an existing defect rather than establish the desired
architecture. The implementation therefore needs to encode the complete atomic
boundary and prove it through the real public resolution flow.

## Solution

Introduce one private, Command-owned operation for projecting the result of a
delegated End Turn back through the enclosing Command Battle Act. The operation
uses the enclosing replay root as its canonical pre-resolution boundary and
matches the real battle resolution result exhaustively.

For an unresolved result, it preserves the requested holes and legitimate route
or frontier metadata while restoring the enclosing state, Command subject, and
snapshot as one atomic projection. For an invalid result, it preserves precise
diagnostics and legitimate routing metadata while exposing the enclosing
committed snapshot. For a resolved result, it preserves the delegated result
unchanged so that each Command option can perform only its genuinely distinct
resolved post-processing.

The enclosing replay root is not always the state from before the first Command
attempt. If an Opportunity Attack has already been accepted or declined and that
interrupt has committed, the post-interrupt state is the replay root for a later
End Turn frontier. The projection must retain those committed reaction effects
while withholding subsequent provisional Command progress.

This is a narrow deepening of the existing data-driven continuation boundary. It
does not introduce function-valued continuations, a staged instruction
interpreter, a workflow algebra, or a second executable description of Command.
The public subject, hole, fill, interrupt, session, and MCP protocols remain
unchanged.

## User Stories

1. As a battle runtime caller, when Command execution needs another fill, I see
   one coherent last-committed state in both the returned state and snapshot.
2. As a battle runtime caller, when a nested End Turn fill is invalid, I see the
   same committed snapshot I saw before submitting the rejected input.
3. As a caller replaying a Command subject, I can retain the accepted fill prefix
   and supply the requested hole without learning a new continuation protocol.
4. As a caller resolving an interrupt, I retain committed Opportunity Attack
   effects and resource expenditure when execution later suspends at End Turn.
5. As a caller declining an interrupt, I retain the committed decline decision
   when execution later suspends at End Turn.
6. As a caller, I receive the same ordered holes and routing events before and
   after this refactor.
7. As a caller, I receive the same precise invalid reason and message when a
   nested fill is rejected.
8. As a consumer of resolved Drop results, I receive dropped-object outcomes only
   after Drop and its delegated End Turn have resolved.
9. As a consumer of any resolved Command result, I retain all real outcome
   collections, routing events, and other result metadata.
10. As a player commanded to Approach, my turn is delegated to End Turn only
    after movement brings me within 5 feet of the commander.
11. As a player commanded to Approach who does not come within 5 feet, I do not
    have my turn ended merely because movement occurred.
12. As a player commanded to Drop, Flee, Grovel, or Halt, the existing SRD option
    behavior and sequencing remain unchanged.
13. As an MCP or session client, I do not need to send a new token, fill shape,
    subject shape, or interrupt response.
14. As a maintainer adding or changing a Command option, I invoke one named
    operation rather than reproducing the replay-root projection algorithm.
15. As a maintainer, I cannot independently choose a state, subject, and snapshot
    that describe different phases of Command execution.
16. As a maintainer, I can reason about Command atomicity locally without also
    learning a general-purpose continuation language.
17. As a reviewer, I can trace Command mechanics to the local SRD corpus and the
    existing Command Quint owners without introducing a new rules assumption.
18. As a reviewer, I can verify the change through real battle resolution results
    rather than a toy union or a circular comparison with the old expression.
19. As a model-based testing maintainer, I retain the existing Command option and
    next-turn behavior represented by the current QNT and MBT owners.
20. As a UI consumer, I no longer risk rendering provisional Command progress
    from a snapshot while the accompanying state reports the committed replay
    root.

## Implementation Decisions

1. The projection operation is private to the Command execution module. It is not
   a public battle-runtime API and is not shared with spatial or unrelated
   procedures whose atomicity rules differ.
2. The operation consumes the real battle resolution result. No prototype-only
   result union, reduced metadata shape, or parallel execution model is retained.
3. The enclosing replay root is represented by already-existing canonical facts.
   The implementation must not add stored state, duplicate subject identity, or
   accept a separately authored snapshot that can drift from the state it
   represents.
4. The committed snapshot is derived through the canonical battle snapshot
   projection from the enclosing state.
5. The result union is matched exhaustively. Each branch returns the narrowest
   result shape available, with no default branch and no unsafe assertion.
6. A `needsHoles` projection preserves the delegated holes, accepted-fill
   frontier, route events, and any other legitimate non-state metadata. It
   replaces state, subject, and snapshot together with the enclosing Command
   replay boundary.
7. An `invalid` projection preserves the delegated reason, message, route events,
   and other diagnostics. Its snapshot is the enclosing committed snapshot, so a
   rejected fill exposes no provisional procedure progress.
8. A `resolved` projection passes through unchanged. Command-option-specific
   resolved processing remains outside the shared operation.
9. Drop computes and attaches dropped-object outcomes only after the shared
   projection has produced a resolved result. Those outcomes are absent from
   unresolved and invalid branches.
10. All five Command delegation paths use the operation. The duplicated inline
    state/subject rewrites are deleted rather than retained as alternate paths.
11. Approach's End Turn delegation remains guarded by the existing RAW condition
    that movement has brought the target within 5 feet. The refactor must not
    broaden this condition to all Approach movement.
12. When an Opportunity Attack interrupt completes before an End Turn frontier,
    the enclosing boundary is the post-interrupt committed state. The operation
    must not rewind committed damage, reactions, choices, or resource changes.
13. The operation changes result projection only. It does not change Command
    option selection, movement, prone application, object dropping, Halt
    restrictions, End Turn mechanics, or interrupt eligibility.
14. The implementation adds no registry, adapter layer, continuation token,
    procedure-step algebra, staged interpreter, or authored/executable DSL.
15. The implementation changes no public hole, fill, subject, route, session, or
    MCP schema unless a real integration test proves an existing schema cannot
    represent the required invariant. Such a finding requires revising this
    specification before broadening scope.
16. Existing Quint owners remain the semantic authority for Command option and
    next-turn behavior. They are updated only if examination shows they model the
    affected snapshot boundary; no redundant formal state is added solely to
    mirror TypeScript structure.
17. The observable snapshot correction is treated as a bug fix, not described as
    exact parity with current runtime behavior.

## Testing Decisions

1. The primary tests exercise the existing public battle resolution boundary,
   including subject resolution and interrupt resolution. Tests call the private
   projection directly only if a result branch cannot be reached through a
   realistic public scenario.
2. Tests use the real battle resolution result and canonical battle snapshot.
   They assert complete relevant result branches rather than comparing two copies
   of the same projection expression.
3. A Grovel scenario suspends in delegated End Turn and proves that returned
   state and snapshot remain at the enclosing committed boundary, without
   exposing provisional prone application or Command consumption.
4. A Drop scenario suspends in delegated End Turn and proves that state and
   snapshot remain committed and that dropped-object outcomes are absent. Its
   resolved counterpart proves those outcomes are attached exactly once and only
   to the resolved result.
5. An Approach scenario whose movement reaches within 5 feet suspends in delegated
   End Turn and proves atomic projection. A counterexample scenario that moves
   without reaching within 5 feet proves that movement alone does not force End
   Turn.
6. Flee and Halt reach their respective End Turn paths and prove that the shared
   projection covers every caller without changing option-specific behavior.
7. Opportunity Attack coverage includes both accepted and declined interrupts
   followed by a nested End Turn hole. Each case proves that committed interrupt
   effects remain present while later provisional progress remains hidden.
8. Replaying each unresolved scenario with the requested fill reaches the same
   result as uninterrupted execution from the corresponding committed boundary.
9. An invalid nested fill preserves the preceding committed snapshot, accepted
   fill prefix, route information, reason, and message.
10. Result-shape coverage proves that legitimate route events, resolved outcome
    collections, and diagnostics survive projection. It specifically guards
    against narrowing the implementation to the prototype's reduced union.
11. Existing deterministic Command admission and movement suites remain passing.
12. Existing Command option/next-turn, Command ordering, and ability/skill Command
    MBT witnesses remain passing against their QNT owners.
13. Focused tests run first. The implementation then runs the repository's public
    typecheck, test, and quality commands according to the shared verification
    lock policy.
14. After significant changes, review repeats until convergence across RAW
    traceability, ubiquitous-language/domain modeling, architecture/connascence,
    and standards/spec code review. Reasonable findings are fixed or rejected
    with concrete evidence.

## Out of Scope

- Rewriting the battle runtime into higher-order continuation-passing style.
- Promoting the staged Command instruction interpreter from the discarded
  prototype.
- Introducing a general workflow or procedure-step algebra.
- Generalizing the operation across all reducers or spatial procedures.
- Changing public replay, hole, fill, interrupt, session, or MCP protocols.
- Adding new Command options, authored content, rules extensions, or assumptions.
- Changing Opportunity Attack eligibility, movement/pathfinding rules, End Turn
  semantics, or the RAW effects of existing Command options.
- Adding a second stored snapshot, replay state, subject identity, or outcome
  representation.
- Preserving prototype TUI code, scenario fixtures, or toy result types.
- Changing Quint semantics when the existing model does not represent the
  snapshot boundary.

## Further Notes

- RAW authority: [SRD 5.2.1 Command](../.references/srd-5.2.1/Spells/Descriptions-A-D.md)
- Atomicity authority:
  [ADR 0006](../docs/adr/0006-battle-runtime-holes-do-not-expose-partial-state.md)
- Formal-model architecture:
  [ADR 0001](../docs/adr/0001-forest-of-qnt-slices.md)
- Existing Command research:
  [SRDINV50 Command option runtime split research](unit-profile-coverage/SRDINV50_COMMAND_OPTION_RUNTIME_SPLIT_RESEARCH.md)
- Existing coverage ownership:
  [rules-kernel obligations](rules-kernel-coverage/obligations.jsonl)
- This specification is based on current `master` at
  `569fdf65b038b38f90fd447815aea6ed3a780d5d`.
- The discarded prototype remains historical design evidence only. Its parity
  claim was invalid because it preserved a provisional snapshot, omitted Drop's
  resolved-only metadata, reduced the real result union, and compared equivalent
  toy expressions. Implementation must be evaluated against this specification,
  not against prototype output.
- The design verdict is conditional but strong: the narrow Command-owned
  operation improves locality and removes caller sequencing only when it owns the
  complete state/subject/snapshot atomic projection and is verified through real
  replay and interrupt flows.
