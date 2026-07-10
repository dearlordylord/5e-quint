# L1-2 Cleanroom Experiment Contract

## Authority

This document is the canonical shared contract for:

- `plans/RALPH_L12_CLEANROOM_ICE_KNIFE_PILOT.md`;
- `plans/RALPH_L12_CLEANROOM_GUIDANCE_GENERATOR.md`.

Those plans remain authoritative for their declared scopes. They must reference
this contract instead of restating shared calibration, readiness, isolation,
freshness, receipt, blocker, measurement, or handoff rules. A change to a shared
rule changes this document once; scope-specific task changes stay in the owning
plan.

The immutable experiment manifest binds the content hash of this contract.

## Run Kinds

Target execution is a discriminated union. A receipt cannot represent both run
kinds.

### Diagnostic rehearsal

A `diagnostic-rehearsal` may reuse an existing target implementation. It records
the target baseline commit and known contamination boundary, applies one
manifest, and measures only the incremental target diff and execution.

It may reveal export incompatibility, missing inputs, contradictory QNT,
harness defects, or target implementation work. Success is never cleanroom
acceptance and cannot demonstrate independent guidance sufficiency or fresh
implementation time.

After a source change, a new manifest is required, but another rehearsal may
reuse the same diagnostic target.

### Fresh experiment

A `fresh-experiment` begins from a new target containing only the declared
bootstrap/export inputs and target toolchain. It is the only run kind eligible
to demonstrate portability, cleanroom sufficiency, or fresh implementation
effort.

The target may continue same-manifest remediation for target implementation
failures. Any change to RAW, QNT, experiment scope, this contract, calibration,
harness, target profile, or exported architecture input creates a new manifest
and invalidates prior acceptance. A later authoritative attempt starts from a
new target; earlier target knowledge cannot be promoted.

## Experiment Scope

Scope is explicit and non-empty. A single-Unit scope and a complete L1-2 corpus
scope are different variants. A single-Unit manifest cannot claim full-corpus
readiness or acceptance.

Unit identity is allowed at provenance, catalog, selection, and experiment
accounting boundaries. Production runtime behavior, semantic calibration, QNT
obligation matching, and target execution must not dispatch on authored
identity.

Repeated class-list rows for one Unit are accounting aliases. The Unit is
exported, implemented, and accepted atomically once.

## TypeScript Calibration

TypeScript is the calibrated first language target. A semantic obligation or
cleanroom-facing MBT action is not exportable until source-only evidence proves:

- a registered semantic QNT owner and owner role;
- a production TypeScript runtime owner;
- an executable QNT-connected TypeScript parity witness that exercises
  production behavior;
- exact TypeScript replay calibration for every exported MBT branch action and
  current QNT hash;
- a supported profile and selected Unit join that does not introduce authored
  identity runtime dispatch.

Source-only calibration has two collections:

```text
obligationCalibrations[]
    semantic obligation id
    QNT semantic owner roles and hashes
    production TypeScript runtime owners
    executable QNT-connected TypeScript parity witness
    calibration result

branchCalibrations[]
    QNT driver path and hash
    exact MBT branch action
    calibrated obligation ids
    production TypeScript entrypoint/projection exercised
    verification command and result
```

Branch rows reference obligations rather than duplicating semantic ownership.
Calibration paths and TypeScript evidence never enter cleanroom input.

“Exhaustive” means obligation- and selected-branch-exhaustive. It does not mean
every QNT file or every whole-state-space transition must have a production
handler. Classified proof companions, vocabulary leaves, bridges, and
retired/exempt files retain their distinct roles.

## Cleanroom Input

The target may receive only manifest-declared language-independent inputs:

- SRD RAW;
- calibrated QNT semantic owners, proof companions, MBT drivers, and required
  import closure;
- ubiquitous language and curated assumptions;
- curated language-independent architecture guidance;
- branch/scope inventory, target profile, and harness/scaffold contracts;
- a Unit corpus index that points into those inputs.

The target must not receive production TypeScript, TypeScript tests, TypeScript
owner/calibration paths, Surface mechanics, previous target implementation,
generated source traces, manually transcribed expected behavior, uncontrolled
planning logs, or Ralph infrastructure.

The target receives a generated harness/receipt projection of this contract,
not its source-plan authority or TypeScript-calibration sections. The manifest
binds both canonical-contract and projection hashes, and generation tests must
make projection drift fail rather than creating a second hand-maintained
contract.

The Unit index contains navigation and scope, not a second rules contract. It
may contain Unit accounting identity, RAW anchors, semantic obligation ids, QNT
paths/roles/hashes, exact MBT actions, connectors, import closure, and
QNT-derived prerequisite ids. It must not restate dice, damage, timing,
targeting, or state-transition semantics.

Missing semantic QNT is a source blocker. Prose guidance or target-language
tests cannot compensate for it.

## Readiness

Source readiness is a discriminated result:

- `ready`: every required RAW/QNT reference, owner role, exact branch
  calibration, replay projection, connector, copied import, and hash is present
  and current;
- `source-blocked`: a non-empty accumulated issue list classifies every
  independent RAW, QNT, scope, calibration, replayability, or copied-corpus
  problem found in the requested scope.

Only ready Units enter an experiment catalog. A full-corpus manifest cannot be
ready while any requested Unit is source-blocked.

## Manifest And Freshness

The immutable export is bound to:

- committed source SHA;
- run kind and declared scope;
- RAW, QNT, domain, and shared-contract hashes;
- source calibration index hash and passing result;
- target profile and harness hashes;
- complete copied import closure;
- Unit catalog hash.

Identical committed inputs produce byte-identical catalogs. Timestamps, target
paths, and observational measurements do not enter content-addressed catalog
bytes.

## Target Commit Evidence

Each target run records:

- `targetStartCommit` before target implementation;
- a start-status attestation produced by `git status --porcelain=v2`, which
  must be empty for a fresh experiment;
- `targetFinishCommit` after implementation and retained evidence are
  committed;
- a finish-status attestation produced after that commit, which must be empty;
- proof that `targetStartCommit` is an ancestor of `targetFinishCommit`;
- hashes and paths for every retained implementation-independent replay
  artifact as read from the `targetFinishCommit` tree.

The returned receipt is an external envelope generated after
`targetFinishCommit`. It is not tracked inside that commit, because a file
cannot contain the SHA of the commit that contains itself. The envelope names
`targetFinishCommit`; source intake verifies that the target's current HEAD
equals it, the target worktree is clean, and every claimed code/evidence path
and hash resolves from that exact commit tree.

Branch observations are accepted only when their retained artifacts are in the
finish commit and they exercise the target production API path through the
native QNT/MBT lane. Adapter-only or target-language-only evidence cannot close
a branch.

Diagnostic rehearsals record the same commit chain and clean finish, but their
start attestation also records the declared pre-existing implementation
boundary. Their receipts remain ineligible for cleanroom acceptance.

## Intake And Blockers

Source intake validates manifest, catalog, contract, QNT, branch, target
profile, target commit chain, replay projection, and retained-artifact hashes.
It accepts a Unit atomically across all denominator aliases.

Findings use these blocker classes:

- `source-qnt-corpus`: allowed semantics are missing, contradictory, or not
  executable/replayable;
- `source-scope`: scope, manifest, export, calibration, profile, or harness
  contracts are inconsistent;
- `target-implementation`: the immutable allowed corpus is sufficient but the
  target implementation or replay path is incomplete or incorrect.

Only `target-implementation` permits same-manifest remediation. A source
finding creates a new manifest. Diagnostic success is always reported as
diagnostic and cannot be promoted into fresh acceptance.

## Measurement Provenance

Measurement is observational and cannot change conformance. Each target receipt
records, when the execution environment exposes them:

- agent provider and model identifier/version;
- agent or orchestration tool name/version;
- reasoning/effort configuration;
- requested goal budget and budget unit;
- start/finish timestamps;
- token or other usage values and the system/report that supplied them;
- target language/compiler and dependency-lock hashes.

Unavailable values use an explicit `unavailable` variant with a reason. They
are not omitted or represented by an empty value. Derived durations are
computed from source timestamps rather than stored beside them.

Reports separate source Ralph time, diagnostic rehearsal time, fresh target
time, intake/review time, and total wall time. Dirty-target timing is never
presented as fresh implementation timing.

## Durable Handoff

Every generated prompt ends with a machine-checkable next-action statement:

- source preparation returns manifest, catalog, target prompt, intake prompt,
  and timing paths to the operator;
- a target run returns the external receipt and retained-evidence references to
  source intake;
- source intake reports whether to remediate the same manifest, issue a new
  manifest, run another diagnostic rehearsal, or start/review a fresh
  experiment.

No transition depends on resuming an earlier agent or remembering a chat. A
source-side status command derives the next action from validated manifests,
receipts, and intake results rather than persisting redundant phase state.
