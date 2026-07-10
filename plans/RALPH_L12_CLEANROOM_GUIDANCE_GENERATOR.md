# Ralph L1-2 Cleanroom QNT Readiness And Export

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L12CG-01-SOURCE-CALIBRATION-CONTRACT",
      "status": "todo",
      "title": "Define source-only TypeScript calibration evidence"
    },
    {
      "number": 2,
      "id": "L12CG-02-QNT-READINESS-INDEX",
      "status": "todo",
      "title": "Build the exhaustive QNT source-readiness index",
      "dependencies": ["L12CG-01-SOURCE-CALIBRATION-CONTRACT"]
    },
    {
      "number": 3,
      "id": "L12CG-03-UNIT-CORPUS-INDEX",
      "status": "todo",
      "title": "Index each executable L1-2 Unit into RAW and calibrated QNT",
      "dependencies": ["L12CG-02-QNT-READINESS-INDEX"]
    },
    {
      "number": 4,
      "id": "L12CG-04-EXPORT-READINESS-GATE",
      "status": "todo",
      "title": "Source-block incomplete Unit corpus indexes",
      "dependencies": ["L12CG-03-UNIT-CORPUS-INDEX"]
    },
    {
      "number": 5,
      "id": "L12CG-05-CLEANROOM-EXPORT",
      "status": "todo",
      "title": "Export one immutable cleanroom experiment catalog",
      "dependencies": ["L12CG-04-EXPORT-READINESS-GATE"]
    },
    {
      "number": 6,
      "id": "L12CG-06-EXPERIMENT-INTAKE",
      "status": "todo",
      "title": "Classify cleanroom results without masking QNT gaps",
      "dependencies": ["L12CG-05-CLEANROOM-EXPORT"]
    },
    {
      "number": 7,
      "id": "L12CG-07-ICE-KNIFE-TRACER-REVIEW",
      "status": "todo",
      "title": "Reconcile full-corpus machinery with the Ice Knife pilot",
      "dependencies": ["L12CG-06-EXPERIMENT-INTAKE"]
    }
  ]
}
-->

## Purpose

Build the source-side readiness and export program for an independent
cleanroom experiment over every executable SRD level-1 and level-2 Unit.

The experiment tests this hypothesis:

```text
SRD RAW
+ curated language-independent domain/architecture guidance
+ a TypeScript-calibrated forest of QNT semantic slices and MBT drivers
    -> is sufficient for a fresh agent to implement a reusable engine
       in another language
    -> and for that engine to prove conformance by replaying every selected
       QNT/MBT branch through its own quint-connect equivalent.
```

The target engine is the experimental witness. The primary artifact being
evaluated and improved is the source QNT/MBT corpus. Target completion is
evidence that the corpus is portable and sufficient; a precise target blocker
is evidence that source QNT, scope, or harness work remains.

Ralph performs only the one-time source-repository work in this plan. It does
not implement target rules and creates no Ralph runner, daemon, queue, or task
agent in the target repository. After this plan lands, normal operation is:

1. one source export command;
2. one unattended target `/goal` run over the immutable experiment catalog;
3. one source intake command.

## Paired Plan Synchronization

This full-corpus plan and
`plans/RALPH_L12_CLEANROOM_ICE_KNIFE_PILOT.md` are co-authoritative execution
plans for different scopes. Neither supersedes the other:

- the pilot owns the one-Unit Ice Knife experiment, its real target evidence,
  handoff behavior, and measured effort;
- this plan owns exhaustive readiness and expansion across all 72 executable
  L1-2 Units.

They share one contract for TypeScript calibration, cleanroom-safe inputs,
atomic Unit acceptance, blocker classification, manifest freshness, target
isolation, and source/target handoff. A change to any shared invariant, schema,
blocker class, exact Ice Knife action, freshness rule, or command contract must
update both plans in the same change unless the difference is explicitly
scope-backed.

After the pilot lands, Tasks 1-6 extend its landed schemas, commands, and gates.
They must not build parallel calibration indexes, readiness results, exporters,
intake models, measurement state, or handoff protocols. Pilot results do not
change the corpus denominator or imply readiness for another Unit; the
corpus-wide generated facts in this plan remain independently checked.

Before launching this full plan, reconcile both documents against the real
pilot intake. Record changed shared decisions in both, record measured scaling
evidence in this plan, and leave any scope-specific difference named and
justified. Task 7 is the post-expansion regression against the accepted pilot,
not a second independent Ice Knife design.

## Non-Negotiable Boundaries

### TypeScript calibration

TypeScript is the calibrated first language target. A rule-bearing QNT
obligation or cleanroom-facing MBT action is not exportable until:

- the semantic obligation has a registered QNT owner role;
- production TypeScript has a runtime owner for that obligation;
- an executable QNT-connected TS parity witness exercises production behavior;
- every exported MBT branch action has exact TS replay calibration for the
  current QNT hash;
- every supported profile and selected Unit joins to the calibrated obligation
  without authored-identity runtime dispatch.

The reason is diagnostic isolation. Without this calibration, a cleanroom
failure cannot distinguish a QNT defect, a QNT-to-runtime mapping defect, and a
target implementation defect. The cleanroom tests portability of a known
integrated specification; it is not the first implementation site for orphaned
QNT.

“Exhaustive” is obligation- and branch-exhaustive. It is not file-exhaustive or
whole-state-space exhaustive. Proof-only companions, vocabulary leaves,
witness-protocol leaves, bridges, and retired/exempt QNT retain their classified
roles. Cross-slice integration remains deliberately bounded.

### Cleanroom input

The target may receive only manifest-declared language-independent inputs:

- SRD RAW;
- QNT semantic owners, proof companions, MBT drivers, and required import
  closure;
- ubiquitous language and curated assumptions;
- curated language-independent architecture guidance;
- branch/scope inventory, target profile, and harness/scaffold contracts;
- a Unit corpus index that points into those inputs.

The target must not receive production TypeScript, TypeScript tests, TS owner or
test paths, Surface mechanics, prior cleanroom implementation, generated source
traces, manually transcribed expected behavior, or uncontrolled planning logs.

### No compensating guidance

The source program must not make weak QNT appear sufficient by generating a
second rules specification. Unit artifacts are navigation indexes into RAW and
QNT, not rule contracts. A semantic fact that cannot be reached through
calibrated QNT is a source-readiness blocker. Target-language unit tests are
diagnostic only and cannot close a QNT obligation or MBT branch.

### Freshness

An experiment is bound to one immutable source manifest and QNT corpus hash.

- A target implementation problem under the same manifest may be fixed by
  continuing the same target `/goal` run or a remediation run.
- A source QNT, RAW, scope, calibration, or harness change creates a new
  experiment manifest. Evidence from the prior manifest cannot be promoted;
  the strict cleanroom reruns from a fresh target so earlier implementation
  knowledge does not contaminate the new measurement.

## Existing Source Facts

The rules-kernel gate currently reports 127 covered semantic obligations and no
transitional gaps. Every covered obligation already requires QNT ownership,
production TS ownership, and an executable TS parity witness.

The cleanroom branch inventory currently contains 740 branch obligations and 24
sampled inputs. It inventories QNT actions and replayability, but does not yet
prove exact TS replay for each branch action. Task 1 adds that missing
source-only calibration evidence; a green driver-level test must not imply that
all sibling actions ran.

The cleanroom sync currently copies 561 of the 566 `.qnt` files under
`packages/`. Five files directly under `packages/shared-algebras/proofs/` are
outside the allowlist:

- `action-economy-algebra-inductive.qnt`;
- `conditions-algebra-inductive.qnt`;
- `death-saves-algebra-inductive.qnt`;
- `initiative-algebra-invariant.qnt`;
- `multiclass-prerequisite-algebra.qnt`.

Most are retired/exempt companions; `death-saves-algebra-inductive.qnt` remains
a proof-only owner. The readiness program adds a missing file only when an
in-scope L1-2 obligation requires its classified role. It does not broaden the
allowlist merely to equalize file counts.

The current L1-2 accounting denominator is 146 executable rows across 72 unique
Units. Repeated class-list rows are accounting aliases for one Unit experiment
slice; they never cause repeated target implementation.

## Artifact Model

### Source-only readiness index

The source-only index may reference TypeScript and is never copied into the
cleanroom. It has two joined collections so an obligation and a branch cannot
be accidentally combined into one misleading product record:

```text
obligationCalibrations[]
    semantic obligation id
    QNT semantic owners and owner roles
    production TypeScript runtime owners
    executable TS parity witness
    calibration result

branchCalibrations[]
    QNT driver hash
    exact MBT branch action
    calibrated obligation ids
    TS production entrypoint/projection exercised
    source verification command
    calibration result
```

### Unit corpus index

The cleanroom-copied Unit index contains only navigation and experiment scope:

```text
Unit identity                     # catalog/accounting boundary only
denominator row ids
RAW anchors
semantic obligation ids
QNT semantic owner paths and hashes
QNT proof/bridge role references
MBT driver paths, hashes, and exact branch actions
generic qRoute/qComponentRoute connector references
QNT-derived prerequisite obligation ids
```

It contains no restated dice, damage, timing, targeting, state-transition, or
other rule facts. Those facts remain in RAW/QNT. It contains no TypeScript path
or calibration detail; the exported manifest binds the source calibration
index hash and passing gate result without copying the index itself.

### Readiness result

A Unit source result is a discriminated union:

- `ready`: every required RAW/QNT reference exists, every active semantic
  obligation is TS-calibrated, every selected branch is exactly TS-replayed,
  and every copied QNT import resolves;
- `source-blocked`: a non-empty accumulated issue list identifies missing or
  contradictory RAW, QNT, scope, calibration, replayability, or import facts.

Only `ready` Units enter a target experiment catalog. A requested full-L1-2
experiment cannot claim full readiness while any of its 72 Units is
source-blocked.

## DAG

```text
L12CG-01 Source calibration contract
    -> L12CG-02 QNT readiness index
        -> L12CG-03 Unit corpus index
            -> L12CG-04 Export readiness gate
                -> L12CG-05 Cleanroom export
                    -> L12CG-06 Experiment intake
                        -> L12CG-07 Ice Knife tracer and review
```

## Global Verification

Every task must perform the Ralph Base SHA check from `AGENTS.md`: log the
task-provided Base SHA, log `HEAD`, and run
`git merge-base --is-ancestor <Base SHA> HEAD`. Stop on mismatch; the runner or
decider owns branch repair.

Every task runs the checks relevant to its changes plus:

- `pnpm rules-kernel-coverage:check`
- `pnpm cleanroom-branch-coverage:check`
- `pnpm check:l12-cleanroom-generation`
- `pnpm cleanroom-sync:check`
- `pnpm cleanroom-scaffold:check`
- `pnpm cleanroom-harness:check`
- `pnpm unit-profile-coverage:check`
- `git diff --check`

For rule-bearing changes, read the cited SRD passages under
`.references/srd-5.2.1/` and `UBIQUITOUS_LANGUAGE.md`. Run RAW/QNT
traceability, ubiquitous-language/domain, architecture/connascence,
authored-identity, branch-coverage, and code-review passes. Fix every reasonable
finding and repeat until no reasonable findings remain. Use at least two rounds
for non-trivial changes.

MBT runs are allowed only when a task changes QNT/TS behavior or must establish
the exact source calibration it owns. Follow the repository MBT scarcity and
seed-reproduction protocols.

## Task Details

### Task 1 - L12CG-01-SOURCE-CALIBRATION-CONTRACT

Goal:

Define and generate source-only evidence that every exportable QNT semantic
obligation and cleanroom-facing MBT branch is integrated into production TS.

Required work:

- Define canonical source-only `obligationCalibrations[]` and
  `branchCalibrations[]` schemas. Branch rows reference calibrated obligation
  ids instead of duplicating their QNT/TS ownership fields.
- Join existing rules-kernel QNT owners, TS runtime owners, and QNT-connected TS
  parity witnesses without deriving semantics from TS implementation code.
- Discover exact branch-action coverage from TS parity harness definitions and
  executable test lanes. Do not infer sibling coverage from driver presence.
- Record the production entrypoint/projection exercised and the verification
  command for each branch.
- Add accumulated-error validation for missing owners, stale hashes, unknown
  actions, duplicate claims, adapter-only projections, and driver-level-only
  claims.
- Ensure calibration paths and evidence cannot enter any cleanroom-copied
  schema or sync rule.

Success criteria:

- Every candidate exported branch has exactly one current, executable TS
  calibration path or a source blocker.
- A fixture with one calibrated action and one unobserved sibling fails.
- A QNT-only semantic owner cannot be classified export-ready.
- The index is source-only and content-addressed.

### Task 2 - L12CG-02-QNT-READINESS-INDEX

Goal:

Build the exhaustive source index of active QNT roles, semantic obligations,
MBT actions, replayability, imports, and TypeScript calibration status.

Required work:

- Parse QNT modules, relative imports, `run` blocks, MBT step actions,
  `mbt::actionTaken` observability, `qRoute`, and `qComponentRoute` projections.
- Read rules-kernel owner roles so semantic-core, proof-only, MBT fixture,
  bridge, selected-identity, vocabulary, and retired/exempt files are not
  conflated.
- Join exact driver/actions to source branch inventory and Task 1 calibration.
- Record copied, missing-required-copy, or exempt availability for each selected
  source QNT file.
- Treat missing deterministic replay, missing TS calibration, unsupported
  import closure, and fixture-bound semantic owners as source blockers.
- Record selection/join reasons. Never choose `candidates[0]`, a filename match,
  or broad route compatibility as Unit evidence.

Success criteria:

- Every active semantic QNT owner is registered or checker-exempt.
- Every in-scope branch is replayable, exactly TS-calibrated, or source-blocked.
- A false Ice Knife association with the generic attack-spell driver fails.
- No target-facing output contains TypeScript navigation data.

### Task 3 - L12CG-03-UNIT-CORPUS-INDEX

Goal:

Generate one source readiness record and one cleanroom-safe RAW/QNT navigation
index for each executable L1-2 Unit.

Required work:

- Collapse all denominator rows for one Unit into one atomic Unit record.
- Resolve and verify exact SRD provenance anchors.
- Join the Unit's supported profiles to registered semantic obligations.
- Join those obligations to QNT semantic owners, classified supporting QNT,
  exact MBT actions, and generic route/component connectors from Task 2.
- Derive prerequisite ordering only from registered QNT obligation/import
  dependencies and curated language-independent architecture ownership. Do not
  infer target ordering from TypeScript runtime-owner shape or invent
  capability facts from Surface mechanics.
- Render a cleanroom-safe projection containing only RAW/QNT/domain references,
  hashes, actions, and obligation ids.
- Reject any generated rule constant or prose expectation not already present
  in RAW/QNT.

Success criteria:

- Every executable row occurs in exactly one Unit record.
- Every Unit is exactly `ready` or `source-blocked`.
- The target projection is a navigation index, not a second specification.
- Repeated class-list rows do not duplicate implementation work.

### Task 4 - L12CG-04-EXPORT-READINESS-GATE

Goal:

Prevent any incomplete or contaminated Unit from entering a target experiment.

Required work:

- Validate RAW anchors, QNT roles, semantic-obligation joins, exact actions,
  connector projections, QNT/import hashes, TS calibration, and row uniqueness.
- Require executable QNT coverage for every active semantic obligation and
  every in-scope MBT branch selected for the Unit.
- Reject target unit tests, handwritten expectations, Surface mechanics,
  TypeScript facts, grouped selected-identity implication, and adapter-local
  projections as substitutes for QNT conformance.
- Accumulate all independent issues across all 72 Units in one run.
- Emit a readiness report separating ready Units from precise source QNT,
  source scope, calibration, and copied-corpus blockers.
- Make full-L1-2 export fail while any requested Unit is source-blocked.

Success criteria:

- The gate cannot report “full L1-2 ready” with any unresolved Unit.
- Removing an applicable QNT action, TS calibration row, RAW anchor, connector,
  or copied import fails the corresponding Unit.
- Adding more prose guidance cannot turn a blocked Unit ready.

### Task 5 - L12CG-05-CLEANROOM-EXPORT

Goal:

Provide one deterministic source command that exports an immutable, fully
source-ready cleanroom experiment catalog.

Required work:

- Add only readiness-approved QNT files/import closure and the cleanroom-safe
  Unit corpus index to the sync allowlist.
- Add one `pnpm` command that regenerates readiness artifacts, runs Task 4,
  syncs the allowed corpus, and hashes the experiment catalog.
- Bind the export to source commit, RAW/QNT/domain hashes, source calibration
  index hash/pass result, target profile hash, and catalog hash.
- Render a static capability/dependency order for the target `/goal` from QNT
  obligation dependencies. Do not install an executor or Ralph in the target.
- Refuse dirty allowlisted inputs and refuse partial full-L1-2 export.

Success criteria:

- Identical source inputs produce byte-identical catalogs.
- No TypeScript, Surface mechanics, source calibration paths, prior target
  output, or generated source trace enters the target corpus.
- One target `/goal` launch can process the complete immutable catalog.

### Task 6 - L12CG-06-EXPERIMENT-INTAKE

Goal:

Classify target results as evidence about QNT portability without converting
target workarounds into source success.

Required work:

- Verify manifest, catalog, QNT, branch, target profile, target commit, replay
  projection, and retained-artifact hashes.
- Require every selected branch to be observed through the target's native
  QNT/MBT lane and production API path.
- Accept each Unit atomically across all of its denominator rows.
- Preserve the existing blocker classes: `source-qnt-corpus`, `source-scope`,
  and `target-implementation`.
- Treat missing/contradictory allowed semantics or unreplayable QNT as source
  findings. Do not accept a target-language test or workaround in their place.
- Permit same-manifest remediation only for `target-implementation` findings.
- When adjudication changes QNT, RAW, scope, calibration, or harness inputs,
  issue a new manifest and require a fresh target experiment.
- Produce one machine-readable result summary and, when valid, one remediation
  catalog for same-manifest target implementation work.

Success criteria:

- Source defects improve the source corpus and invalidate old-manifest
  acceptance rather than being externalized to target code.
- Target defects can resume under the same immutable corpus.
- Re-intake is idempotent and cannot partially close one Unit.

### Task 7 - L12CG-07-ICE-KNIFE-TRACER-REVIEW

Goal:

After Tasks 1-6 generalize the pilot machinery, reconcile the full-corpus
source-readiness, export-boundary, and intake contract against the accepted Ice
Knife pilot. This source task does not implement or rerun Ice Knife in a target.

Required work:

- Read the pilot plan, its final source manifest, real target receipt, source
  intake result, measurement report, and documented reviewer dispositions.
- Prove that Tasks 1-6 extended the pilot's landed schemas and commands rather
  than creating parallel calibration, readiness, export, intake, measurement,
  or handoff state.
- Verify its SRD anchor and all profile-to-obligation joins.
- Verify its semantic QNT owners are role-classified and TS-integrated.
- Select the exact direct witness actions
  `doResolveIceKnifeHitAttackDamageAndBurstSavingThrows` and
  `doResolveIceKnifeMissBurstSavingThrows` from
  `battle-runtime-level1-damage-spell-selected-identity.mbt.qnt`.
- Verify applicable generic attack, save, mixed-target, exact-damage,
  reaction/concentration, and slot-scaling semantics are reached through
  registered QNT obligations rather than restated in the Unit index.
- Verify exact TS calibration for every exported Ice Knife branch and current
  QNT hash.
- Prove that substituting
  `battle-runtime-attack-spell-shape-selected-identity.mbt.qnt` fails because it
  contains no direct Ice Knife action.
- Exercise export and intake with synthetic receipts for target conformance,
  source-QNT insufficiency, stale manifest, and target implementation failure.
- Reconcile every shared contract difference between the two plans. Update both
  in the same change or document the concrete scope reason for the difference.
- Run at least two reviewer rounds covering RAW/QNT traceability, ubiquitous
  language, domain modeling, architecture/connascence, cleanroom contamination,
  branch coverage, and code review.

Success criteria:

- Ice Knife's target index contains only RAW/QNT navigation and hashes.
- Every accepted semantic claim comes from calibrated executable QNT.
- A source-QNT gap blocks export rather than adding compensating guidance.
- A target result measures corpus sufficiency without importing TypeScript
  knowledge.
- The generalized pipeline still reproduces the accepted pilot contract for
  Ice Knife without duplicating pilot-owned state.
- Both co-authoritative plans agree on every shared invariant, with any
  scope-specific difference explicitly justified.
- No reasonable reviewer finding remains.
