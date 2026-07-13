# Opaque Oracle Conformance Boundary

Wayfinder decision for [Define the Opaque Oracle conformance
boundary](https://github.com/dearlordylord/5e-quint/issues/22), investigated at
source commit `228f335f40b171c31b34d8a16b6dcbda64ca6192`.

## Decision

The **Opaque Oracle** is the role in which Target-SDK-owned tests query a
source-free distribution of the main production application. It is an
implementation aid first and later a differential-conformance input. It is not
a separate oracle application, cleanroom harness, reference reducer, Target
dependency, or rules authority.

The main application owns one production operation for one stateless composed
Character Creation-to-Battle evaluation. Its intrinsic CLI and HTTP surfaces
expose the same strict, language-neutral JSON contract for that operation. A
Target test supplies a self-contained **Oracle Case** and receives an ordered
**Oracle Trace** of contractually observable production outcomes and
continuation frontiers. The operation executes the real Character Creation and
Battle Functional Reducers; no Oracle-specific reducer or diagnostic helper is
permitted.

The application retains no Case state between evaluations. A call may build
call-local character-creation and battle state while reducing its supplied
decisions. Statelessness concerns the application boundary, not the absence of
state inside a reducer execution.

RAW and calibrated QNT remain rules authority. An Oracle Trace reports what the
calibrated production TypeScript application did. A difference between that
Trace and a Target observation is evidence to investigate against RAW and QNT,
not an automatic ruling that the Oracle side is correct.

## One production application, not an Oracle harness

The source topology is:

```text
main production application
  application operation: evaluate Character Creation-to-Battle Cases
  CLI surface
  HTTP server surface
```

“Main production application” here names the shared typed application
composition, not the existing browser package merely because that package is
named `@dnd/app`. The future implementation ticket may place or refactor that
composition where it fits the production workspace. This decision fixes its
semantic ownership, not its package path.

“Opaque Oracle” names a use of the source-free application distribution. It
does not name a second semantic application or composition root. CLI evaluation
and the HTTP server are two process modes over that one composition. In
particular:

- MCP has no role in the Oracle protocol. It is only precedent that a main
  application can have multiple intrinsic front ends over the same production
  operations.
- The CLI calls the application operation directly; it does not call MCP or an
  Oracle wrapper.
- Starting the HTTP satellite serves the same application operation from the
  same distribution. A natural implementation is a CLI subcommand that starts
  the application's HTTP server, but this decision does not freeze command or
  route names.
- The Target test is the only test harness. There is no shared source-side
  harness package that generates Cases, invokes the Target SDK, compares
  results, shrinks failures, or decides how a discrepancy is reported.

This arrangement makes the Oracle available offline. Internet access may be
present, but evaluating through either CLI or a locally started HTTP server
does not require it.

## The single composed workflow

One Oracle Case drives one composed production workflow:

1. begin Character Creation from the supplied authored selection and inputs;
2. discover and fill creation continuations through the production Character
   Creation reducer;
3. finalize the Character Draft into a Character Build when the supplied
   decisions reach that point;
4. construct the in-play Character Sheet through the production sheet
   boundary;
5. initialize the Battle creature through the production Character
   Sheet-to-Battle handoff; and
6. reduce the supplied Battle decisions through production Acts, Runtime
   Holes, fills, typed rejections, and continuations.

The Case supplies complete Character Creation inputs followed by a finite
Battle decision sequence. Successful creation must finalize, construct the
Character Sheet, and enter Battle; exhausting creation input before that point
is a typed workflow rejection, not an ordinary stopping frontier. A modeled
creation rejection still appears in the Trace and ends that evaluation.

After Battle entry, evaluation stops when the supplied Battle decisions are
consumed and returns the current filled or empty continuation frontier. This
may be a point during Battle; it is not described as a battle that “remains
active.” If production returns an empty continuation before all supplied
Battle decisions are consumed, the result is a typed workflow rejection rather
than silent suffix omission.

There are no operation-specific Oracle endpoints for Character Creation,
Battle setup, individual reducer helpers, or diagnostic inspection. Splitting
creation and battle into separately stateful calls would either require Oracle
session state or force a Target test to supply an uncontracted intermediate
representation. The composed application operation carries the call-local
Character Draft, Character Build, Character Sheet, and Battle state through
their production boundaries and discards them after returning the Trace.

## Oracle Case and Oracle Trace

An **Oracle Case** is the complete, replayable input for one evaluation. It has
no session id, request id, case id, transport correlation token, or reference
to retained server state. Every externally varying fact consumed by the
workflow—including rolls, choices, table witnesses, and time-like inputs—must
enter through the Case's typed decisions rather than an ambient random, clock,
or process service.

For one application distribution and catalog configuration, evaluating the
same Case is deterministic and produces the same Trace. Persisting the exact
Case is therefore sufficient to replay behavior against that distribution. A
random seed may help reproduce Case generation, but is supplemental and does
not replace the Case.

An **Oracle Trace** records the contractually observable Character Creation and
Battle reducer outcomes and continuation frontiers in execution order. It is
not merely a final observation. It excludes:

- internal helper calls, routes, caches, or implementation steps;
- MCP sessions or presentation envelopes;
- unstable prose, process identity, timestamps, and diagnostics; and
- authored expectations or copied rule constants that do not come from the
  executed production workflow.

The source-owned Case/Trace contract must state which collections are ordered
and which have explicitly unordered meaning. Meaningful reducer order is
preserved; JSON object formatting and member formatting are not observations.
The wire representation should make ordinary structural equality correct—for
example, by canonically ordering set-shaped observations—rather than attach
hidden unordered meaning to an ordinary array. Where canonical representation
cannot express the domain, the algebra must represent the distinction
explicitly and ship portable equality/inequality cases covering order,
duplicates, and JSON object-member order.

The Target test projects its own public SDK observations into the same Trace
algebra and implements the comparison in its native language. There is no
shared comparator package.

The exact Case and Trace algebra is intentionally not invented by this ticket.
The current production source exports the creation operations separately
(`packages/character-creation-runtime/src/index.ts:189-196`) and exposes the
sheet-to-battle entry operation
(`packages/character-battle-runtime/src/index.ts:342-368`). Battle owns typed
resolution variants and a snapshot
(`packages/battle-runtime/src/battle-reducer.ts:7161-7255`), but there is no
strict, language-neutral schema for the composed workflow. Existing MCP
Character Creation outputs use broad `Schema.Any` JSON objects
(`packages/mcp/src/character-tool-output.ts:12-14`, `111-193`) and MCP Battle
outputs add their own envelope
(`packages/mcp/src/battle-tool-output.ts:14-78`), so neither is that schema. A
surfaced wayfinder investigation must inventory the real creation, handoff, and
battle frontiers before fixing variants, fields, brands, collection semantics,
or encoded rejections.

## Ordered evaluation batches

CLI and HTTP accept the same domain shape: a non-empty, ordered batch of Oracle
Cases. A singleton evaluation is a one-element batch rather than a second wire
shape. Evaluation is single-threaded and sequential; the Trace result at each
output position corresponds to the Case at the same input position. No
correlation id is needed.

The CLI supports multiple batch messages in one process so property tests can
amortize application and catalog startup. HTTP naturally amortizes the same
startup in its server process. The concrete self-delimiting stream framing is
chosen with the schema. Framing does not introduce Oracle state: every Case in
every batch remains independent.

For every non-empty ordered batch of normally evaluated Cases, the observable
decomposition law is:

```text
evaluateBatch([c1, ..., cn])
  = evaluateBatch([c1]) ++ ... ++ evaluateBatch([cn])
```

The law also holds after arbitrary earlier messages in the same long-lived
process. It makes state leakage across Cases observable without adding session
or receipt state.

Boundary failures are divided strictly:

- The complete batch envelope is decoded before execution. If any part is not
  a valid batch of Cases, nothing is evaluated and the boundary reports the
  non-empty typed collection of independently discoverable decode issues.
- After successful decoding, every normally evaluated Case produces exactly
  one Trace result, including modeled domain and workflow rejections.
- An unexpected application defect aborts the batch. CLI exits nonzero and HTTP
  responds with a 5xx status; neither invents a Trace variant for a bug nor
  returns a successful partial batch. Any Trace values computed for that
  failing batch are discarded before encoding a response.

Concrete CLI framing, HTTP route/status mapping, schema field names, and error
encodings belong to implementation after the Case/Trace algebra is known. They
must preserve this common batch contract rather than develop two behavioral
protocols.

## Source-free distribution and catalog horizon

The source workspace builds and smoke-tests one distribution of the main
application. A clean Target workspace receives that distribution without the
TypeScript sources, source maps, or source repository. The same distribution
provides CLI evaluation and the HTTP server. “Opaque” means source withheld,
not tamper-proof; compiled executable artifacts and runtime data may still be
inspected or reverse-engineered.

The application loads its canonical generated JSON catalog at startup. When
started for Oracle evaluation, its catalog loader applies the current
Cleanroom Workflow Horizon, levels 1 and 2, at that one boundary. It does not
duplicate the Dhall/JSON corpus into an Oracle folder, and reducers do not
repeat horizon checks. Filtering progression-governed roots preserves their
complete Authored Mechanics Graphs and the Authored Reference closure required
by the Portable Surface Contract; Oracle startup does not reconstruct or
reinterpret those relationships.

This startup projection does not redefine the Cleanroom Mechanics Slice or its
Source Execution Horizon. It selects the authored roots available to this
levels-1-and-2 composed workflow; it is application configuration, not a
Case/Trace protocol field and not Target package membership.

Distribution identity is likewise not repeated inside every Case or Trace. CLI
and server metadata expose one immutable identity for the exact executable,
Case/Trace contract, and filtered catalog projection. A Target test may record
it beside a failure. The identity is operational replay context, not rules
authority or a second content manifest. A protocol revision should be
introduced only when an observable Case/Trace meaning needs compatibility
handling, after the concrete algebra is defined.

## Target-owned property testing

The Opaque Oracle must be easily discoverable as an implementation aid, not
hidden in a late conformance appendix. Each Target Language Adapter therefore
places a native property-test example in its primary implementation guidance.
The example shows how to run the source-free main application through CLI or
HTTP and may recommend an ordinary property-testing library for that language.

The Target implementer owns the resulting test and all of its policy:

- Case generation;
- invocation of the Target SDK and the production application's CLI or HTTP
  surface;
- projection of Target public outcomes into the Oracle Trace algebra;
- comparison, failure behavior, reporting, and persistence;
- optional shrinking; and
- investigation and repair after an Oracle Discrepancy.

Shrinking is useful but optional. It is an implementation-side property-testing
decision, not an Oracle or shared-package responsibility. A shrinker preserves
a failure while seeking a smaller Case; it does not prove mathematical
minimality. The exact unshrunk or shrunk failing Case remains the reproducible
artifact.

No protocol can honestly prove that an agent cognitively consulted the Oracle.
Executable Target tests can demonstrate that production behavior was queried,
but this decision does not add receipts or a second evidence system merely to
make that claim.

## Rejected alternatives

### Separate Oracle application or harness package

That would create a second composition root and invite a shadow reducer. The
main application's production operation and intrinsic CLI/HTTP surfaces are
the only source-side runtime boundary.

### MCP as an Oracle interface

MCP is an agent-facing frontend with session and presentation concerns. Target
source tests need a strict application contract. Reusing the architectural
idea of sibling front ends does not put MCP in the Case/Trace path.

### Separate Character Creation and Battle endpoints

Two stateless endpoints cannot transfer a newly created character into Battle
without making an intermediate public contract the caller must reconstruct.
Two stateful endpoints would create an Oracle session. One composed Case keeps
the boundary stateless and exercises the production handoff.

### One final observation

A final value loses the reducer frontiers that explain what decisions were
available and how the workflow progressed. The contract observes the ordered
external Trace while excluding internal diagnostics.

### Shared differential harness or comparator

The Target implementation owns its SDK, native property-test library,
projection, equality, and failure UX. A source-owned harness could not know
those policies without becoming target architecture or duplicating every
language's implementation choices.

### Mandatory or Oracle-side shrinking

Shrinking depends on the Target generator and failure relation. Putting it in
the production distribution would couple unrelated policies and falsely imply
that a shrunk Case is globally minimal.

### Oracle output as a golden rules verdict

Production can contain a bug. RAW and calibrated QNT remain authority; an
Oracle Discrepancy triggers investigation rather than automatic Target change.

## Source-readiness consequences

Implementation of this boundary requires source-side work, but this wayfinder
decision performs none of it. Before the Opaque Oracle can be distributed:

- the main application must own one typed Character Creation-to-Battle
  operation over the real production reducers;
- that operation must have one strict source-owned Case/Trace schema;
- CLI and HTTP must decode and encode the identical ordered batch contract;
- the application startup configuration must derive its levels-1-and-2 catalog
  view from the canonical JSON corpus without duplicated content;
- the packaged artifact must be smoke-tested from a clean directory with
  external network access disabled and no workspace, source, or `node_modules`
  links; CLI evaluation must run without networking, the local HTTP smoke test
  may enable loopback only, and the package check must reject TypeScript sources
  or source maps;
- source-side black-box fixtures must send the same valid Case, schema-invalid
  input, and modeled workflow rejection through the packaged CLI and HTTP
  surfaces and establish equivalent decoded results or corresponding transport
  error classes, the same distribution identity, and position-preserving output
  for Cases that produce distinguishable Traces;
- an empty batch must be rejected as a typed decode failure without evaluation;
- an atomic-decode fixture must mix valid and independently invalid members in
  one batch, include multiple independent decode issues, report their complete
  non-empty typed collection, and establish that neither surface emits a Trace
  envelope or evaluates the valid prefix;
- a defect-abort fixture must make a later Case defect after an earlier Trace
  was computed, then establish nonzero/5xx behavior with no partial-success
  response through both surfaces;
- repeated-evaluation fixtures must establish determinism and the batch
  decomposition law through a fresh CLI process, a persistent CLI process, and
  HTTP; and
- Target Language Adapter guidance must contain the native property-testing
  entry point without supplying Target SDK implementation code.

## Map impact

This decision resolves the Opaque Oracle's ownership, role, application
topology, stateless scenario, batch semantics, source-free distribution,
property-testing responsibility, and relationship to RAW/QNT authority.

It surfaces [Define the Oracle Case and Trace
algebra](https://github.com/dearlordylord/5e-quint/issues/23), which blocks source
implementation and distribution of this boundary. That investigation derives
the exact language-neutral algebra from Character Draft finalization into a
Character Build, Character Sheet construction, Character Sheet-to-Battle
handoff, and Battle continuation boundaries. It owns schema variants, branded
values, ordering semantics, concrete CLI/HTTP encoding, comparison cases, and
valid/invalid portable cases. It must not reopen the one-scenario, stateless,
production-application, ordered-batch, or Target-owned-test decisions made
here.

## Verification

This is a documentation-only architecture decision. It changes no rule
semantics, QNT, runtime state, reducer behavior, Surface content, or public API.
RAW applicability is therefore **no new modeled rule**. The review checked
`UBIQUITOUS_LANGUAGE.md`, the Character Creation vocabulary, Battle runtime
documentation, the relevant production composition roots and output schemas,
the Cleanroom glossary, the portable Surface decision, the static-admission
decision, and `.claude/review-rules.md`.

Three full reviewer-loop passes and one final linked-ticket check covered:

1. RAW applicability and ubiquitous/domain language, including the separation
   of Character Draft, Character Build, Character Sheet, creature Battle state,
   Runtime Holes, and authored dependencies;
2. architecture and connascence, especially the single production operation,
   one Case/Trace authority, no duplicated catalog, no session/correlation
   state, and CLI/HTTP parity; and
3. code-review rules, state-space minimality, strict boundary parsing,
   typed/domain failures, and false claims of Oracle authority or proof of
   agent behavior.

The first pass corrected Character Draft/Build/Sheet lifecycle conflation,
made replay determinism and comparison semantics executable, and added the
batch decomposition law. The second pass tightened atomic decode and defect
abort fixtures, canonical authored-graph language, package isolation, adapter
parity, and the blocking schema edge. The final full pass reported no findings;
the linked-ticket check found and corrected one wording conflict between a
schema-valid incomplete creation attempt and its typed workflow rejection.

Two reviewer proposals were rejected with concrete reasons. Loading the full
level-1-through-10 catalog and merely constraining generators would contradict
the explicit grilling decision to filter the Oracle application's startup
catalog; the glossary instead makes that runtime view distinct from Cleanroom
package membership and Static Mechanics Admission. Removing ordered batches in
favor of one Case per frame would contradict the explicit decision to accept
non-empty singleton-or-many batches and evaluate them sequentially on the
single application thread. No reasonable review finding remains.

No MBT or QNT proof is required because this decision changes no executable
behavior. Future implementation must run the normal reviewer loop to
convergence and trace every modeled rule it changes to the local SRD 5.2.1
corpus or `ASSUMPTIONS.md`.
