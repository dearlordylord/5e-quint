# Plan: RAW Coverage Matrix

> Source handoff: `/tmp/handoff-kSnAMX.md`

## Architectural Decisions

Durable decisions that apply across all phases:

- **Normative corpus**: `.references/srd-5.2.1/` is the source of truth. The
  matrix measures coverage of that local corpus, not memory, external rules
  pages, or generated paraphrases.
- **Traceability model**: Coverage is bidirectional:
  `SRD span -> classification -> RAW requirement id -> QNT owner -> runtime owner -> verification owner`.
  Reverse checks must also prove that QNT, runtime, and verification claims cite
  existing RAW requirement ids.
- **Identity model**: SRD span identity uses generated stable ids derived from
  file path, normalized heading path, and ordinal. Exact line ranges are audit
  metadata, not the identity of a requirement.
- **Requirement model**: Executable spans map to stable `RAW-*` requirement ids.
  Requirement ids are the unit cited from QNT comments, runtime tests, focused
  MBT bridges, docs, and reports.
- **Classification model**: A span has exactly one primary classification. When
  a paragraph contains multiple domain facts, split the span rather than giving
  one span multiple primary colors.
- **Lifecycle model**: Status is stage-specific instead of one broad status enum.
  Classification, assumption handling, QNT modeling, QNT proof, runtime mapping,
  runtime parity, and production coverage are independently reportable facts.
- **Ownership model**: The matrix records existing owners; it must not create a
  second execution registry. QNT files, runtime modules, and tests remain the
  authoritative artifacts for behavior.
- **Scope model**: Out-of-promoted-scope is a typed coverage outcome with a
  required reason and optional future owner, not a silent omission.
- **Active-task relationship**: `plans/ACTIVE_PLAN.md` describes current proof
  and parity work already being done. Those tasks are matrix constituents, not a
  substitute for the matrix. The matrix must be able to prove that each completed
  QCORE/QMBT task's claimed RAW slice is classified, mapped, modeled, and
  verified; those tasks are an initial narrow percentage of the full SRD corpus,
  not the denominator.
- **Provenance discipline**: SRD is provenance. Structured helper data and
  runtime projections are separate concepts and must not be collapsed into the
  matrix schema.

## Data Shape

The planned artifacts live under `plans/raw-coverage/` until the tracer bullet
proves that the shape belongs in a package or script boundary:

- `annotations.jsonl`: one row per classified SRD span.
- `requirements.jsonl`: one row per stable RAW requirement id.
- `raw-reviews.jsonl`: one row per section-level RAW review agent verdict.
- `task-claims.jsonl`: one row per active-plan task claim against RAW
  requirements.
- `matrix.json`: generated report joining spans, requirements, owners, and
  verification claims.
- `README.md`: human workflow, classification rubric, and examples.

Annotation rows use this logical shape:

```typescript
type RawSpanClassification =
  | "fluff"
  | "definition"
  | "rule-procedure"
  | "rule-guard"
  | "rule-consequence"
  | "authored-data"
  | "table-caller-responsibility"
  | "unsupported-out-of-promoted-scope"
  | "ambiguous-needs-assumption";

type RawSpanSource = {
  readonly corpus: "srd-5.2.1";
  readonly path: string;
  readonly headingPath: ReadonlyArray<string>;
  readonly ordinal: number;
  readonly lineStart: number;
  readonly lineEnd: number;
  readonly textHash: string;
};

type NonExecutableRawSpanAnnotation = {
  readonly spanId: string;
  readonly source: RawSpanSource;
  readonly classification: "fluff";
};

type DefinitionRawSpanAnnotation = {
  readonly spanId: string;
  readonly source: RawSpanSource;
  readonly classification: "definition";
  readonly requirementIds: ReadonlyArray<string>;
};

type ExecutableRawSpanAnnotation = {
  readonly spanId: string;
  readonly source: RawSpanSource;
  readonly classification:
    | "rule-procedure"
    | "rule-guard"
    | "rule-consequence"
    | "table-caller-responsibility";
  readonly requirementIds: ReadonlyArray<string>;
};

type AuthoredDataRawSpanAnnotation = {
  readonly spanId: string;
  readonly source: RawSpanSource;
  readonly classification: "authored-data";
  readonly requirementIds: ReadonlyArray<string>;
};

type OutOfScopeRawSpanAnnotation = {
  readonly spanId: string;
  readonly source: RawSpanSource;
  readonly classification: "unsupported-out-of-promoted-scope";
  readonly reason: string;
};

type AmbiguousRawSpanAnnotation = {
  readonly spanId: string;
  readonly source: RawSpanSource;
  readonly classification: "ambiguous-needs-assumption";
  readonly assumptionId: string;
};

type RawSpanAnnotation =
  | NonExecutableRawSpanAnnotation
  | DefinitionRawSpanAnnotation
  | AuthoredDataRawSpanAnnotation
  | ExecutableRawSpanAnnotation
  | OutOfScopeRawSpanAnnotation
  | AmbiguousRawSpanAnnotation;
```

Requirement rows use this logical shape:

```typescript
type RawRequirement = {
  readonly id: string;
  readonly sourceSpanIds: ReadonlyArray<string>;
  readonly domainOwner:
    | "rule-core"
    | "battle-runtime"
    | "character-creation-runtime"
    | "surface"
    | "mcp"
    | "app"
    | "qa-pipeline"
    | "table-caller";
  readonly qntOwners: ReadonlyArray<string>;
  readonly runtimeOwners: ReadonlyArray<string>;
  readonly verificationOwners: ReadonlyArray<string>;
};
```

Active-plan task claim rows use this logical shape:

```typescript
type ActivePlanTaskCoverageClaim = {
  readonly taskId: string;
  readonly requirementIds: ReadonlyArray<string>;
  readonly evidence: ReadonlyArray<{
    readonly kind: "qnt-proof" | "focused-mbt" | "runtime-test" | "doc";
    readonly ownerPath: string;
  }>;
};
```

RAW review rows use this logical shape:

```typescript
type RawReviewVerdict = {
  readonly sectionId: string;
  readonly reviewer: "raw-review-agent";
  readonly verdict: "pass" | "fail";
  readonly sourcesChecked: ReadonlyArray<string>;
  readonly reviewedSpanIds: ReadonlyArray<string>;
  readonly notes: string;
};
```

The implementation should make invalid states unrepresentable before moving the
schema out of plan artifacts. In particular, executable classifications require
at least one requirement id; definition classifications require definition
requirement ids; authored-data classifications require data/catalog coverage
requirement ids; `ambiguous-needs-assumption` carries an `ASSUMPTIONS.md`
anchor; `unsupported-out-of-promoted-scope` carries a reason; fluff spans cannot
claim requirements, QNT, or runtime owners; and task status remains derived from
`plans/ACTIVE_PLAN.md` instead of being copied into task claims. Each covered
section must also have a passing `raw-review-agent` verdict before its spans
count as matrix complete.

## Coverage Metrics

The report must separate these percentages instead of presenting one vague
"done" number:

- **Classification coverage**: classified SRD spans / total generated SRD spans.
- **Executable identification coverage**: executable spans with RAW requirement
  ids / executable spans.
- **Assumption closure**: ambiguous spans with `ASSUMPTIONS.md` anchors /
  ambiguous spans.
- **QNT modeling coverage**: executable requirements with QNT owners /
  executable requirements.
- **QNT proof coverage**: executable requirements with passing proof evidence /
  executable requirements.
- **Runtime mapping coverage**: executable requirements with runtime owners /
  executable requirements.
- **Runtime parity coverage**: executable requirements with focused MBT or
  public runtime tests / executable requirements.
- **Production coverage**: executable requirements exercised through promoted
  production workflows / executable requirements.

The headline "100% SRD coverage" is only meaningful when the report states
which metric is at 100%. The long-term target is not that every RAW sentence is
runtime-executable; it is that every SRD span is classified and every executable
requirement has an explicit owner, scope result, or assumption path.

The matrix itself is complete only when it covers 100% of the local SRD corpus:
every generated SRD span is classified, every non-fluff span is closed, and
every executable/domain span is connected to a requirement, table responsibility,
authored-data coverage requirement, assumption, or explicit out-of-promoted-scope
reason. Fluff is still counted in classification coverage so reviewers can prove
it was deliberately excluded rather than skipped, but fluff is excluded from
executable/domain coverage denominators.

Existing active-plan work should be reported as the current covered wedge. For
example, QCORE7-QCORE11 and QMBT1-QMBT6 represent a promoted proof/parity slice
over movement, reactions, feature procedures, spell procedures, and stat-block
controls. Even if that is roughly 5% of the full SRD by corpus width, the matrix
must make the number concrete by showing both numerator and denominator:
completed task-backed requirements over all executable SRD requirements,
planned-but-not-complete task-backed requirements over that same denominator,
and the separate classification denominator over all SRD spans.

---

## Phase 1: Span Inventory Tracer Bullet

**User stories**:

- As a maintainer, I can point at a small SRD section and see every span in it
  accounted for.
- As a rules reviewer, I can distinguish non-executable prose from executable
  RAW without relying on broad color categories.
- As an implementer, I can see the first concrete denominator for coverage.

### What to build

Create the initial `plans/raw-coverage/` artifacts and a checker command that
generates stable spans for one tiny, real SRD section. Use a narrow section from
`.references/srd-5.2.1/Rules-Glossary.md` or
`.references/srd-5.2.1/Playing-the-Game.md` that already maps to promoted
rule-core or battle-runtime behavior. The slice should include both
non-executable text and executable rule text so the taxonomy is tested against
real mixed prose.

### Acceptance Criteria

- [x] The selected SRD section has generated stable span ids with file path,
      heading path, ordinal, line range, and text hash.
- [x] Every generated span in the selected section has exactly one primary
      classification.
- [x] Executable spans cite stable RAW requirement ids.
- [x] Fluff spans cannot cite QNT, runtime, or verification owners.
- [x] The checker fails if the selected section contains an unclassified span.
- [x] The generated report shows classification coverage and executable
      identification coverage for the selected section.
- [x] The selected section has a passing RAW review agent verdict citing local
      SRD text and `UBIQUITOUS_LANGUAGE.md`.

---

## Phase 2: Bidirectional Requirement Claims

**User stories**:

- As a QNT author, I can cite RAW requirements from proof modules without
  manually maintaining a second list of modeled rules.
- As a runtime author, I can tell which reducer behavior is claimed to implement
  which RAW requirements.
- As a reviewer, I can catch dead or mistyped RAW references from code and tests.

### What to build

Extend the tracer bullet so QNT, TypeScript runtime tests, and focused MBT
fixtures can cite requirement ids in a small, parseable convention. The checker
must verify both directions: executable requirements name their owners, and owner
artifacts reference existing requirement ids.

### Acceptance Criteria

- [ ] At least one QNT owner cites a real RAW requirement id from the tracer
      section.
- [ ] At least one runtime or runtime-test owner cites a real RAW requirement id
      from the tracer section.
- [ ] The checker fails when QNT, runtime, or test claims reference an unknown
      RAW requirement id.
- [ ] The checker fails when an executable requirement claims modeled or tested
      status without an owner artifact.
- [ ] The report distinguishes "mapped to owner" from "proved" and "runtime
      parity covered."

---

## Phase 3: Active Plan Backfill

**User stories**:

- As a project owner, I can see how much of the existing QCORE/QMBT queue counts
  toward SRD coverage.
- As a maintainer, I can verify that completed active-plan tasks really cite
  classified RAW requirements.
- As a planner, I can distinguish "task done" from "SRD area complete."

### What to build

Backfill matrix claims for the completed and in-progress task families in
`plans/ACTIVE_PLAN.md`, starting with the promoted QCORE/QMBT slice. The task
file remains the queue authority, while the matrix becomes the coverage
authority. Each task-backed claim should connect the task id to requirement ids,
QNT owners, runtime owners where applicable, and verification evidence. Do not
invent broad requirements to make a task look larger; split requirements until
the claim matches the actual modeled RAW.

### Acceptance Criteria

- [ ] Completed QCORE7-QCORE11 tasks have requirement links for their claimed RAW
      slices.
- [ ] Completed QMBT1-QMBT4 tasks have parity-evidence links for their claimed
      runtime slices.
- [ ] Ready QMBT5-QMBT6 tasks can be represented as planned parity coverage
      without being counted as completed runtime parity.
- [ ] The report can answer what percentage of executable SRD requirements are
      covered by current active-plan tasks.
- [ ] The report can show which current active-plan task, if any, owns the next
      uncovered requirement in a selected RAW area.

---

## Phase 4: Assumptions and Scope Closure

**User stories**:

- As a rules reviewer, I can see when the SRD is ambiguous instead of treating an
  implementation choice as RAW.
- As a project owner, I can approve out-of-promoted-scope classifications with
  explicit reasons.
- As an implementer, I can avoid creating support-status labels that have no
  runtime or type consequence.

### What to build

Add typed handling for ambiguous and out-of-promoted-scope spans. Ambiguous
spans must cite an `ASSUMPTIONS.md` anchor before they count as closed.
Out-of-promoted-scope spans must carry a reason that is visible in the report.
The checker should keep these states distinct from fluff and from executable
requirements that lack owners.

### Acceptance Criteria

- [ ] `ambiguous-needs-assumption` spans fail the checker unless they cite an
      `ASSUMPTIONS.md` anchor.
- [ ] `unsupported-out-of-promoted-scope` spans require a reason and appear in a
      grouped report section.
- [ ] Out-of-scope spans do not inflate QNT or runtime coverage percentages.
- [ ] The report exposes unresolved ambiguous spans separately from deliberate
      out-of-scope spans.
- [ ] The model distinguishes "not executable prose", "executable but
      out-of-promoted-scope", and "executable but not yet modeled."

---

## Phase 5: First Broad Corpus Slice

**User stories**:

- As a maintainer, I can measure progress over a complete SRD file, not only a
  tiny test section.
- As a planner, I can choose the next RAW area by visible uncovered executable
  requirements.
- As a reviewer, I can see whether current QCORE and QMBT work covers the RAW it
  claims to cover.

### What to build

Expand from the tracer section to one complete SRD file that is heavily used by
promoted behavior, such as `Playing-the-Game.md` or `Rules-Glossary.md`. Keep
the implementation constrained to the matrix and checker; do not widen QNT or
runtime behavior just to improve percentages. New behavior work should remain
separate tasks driven by the uncovered-requirement report.

### Acceptance Criteria

- [ ] The selected full SRD file has 100% classification coverage.
- [ ] Every executable span in the selected file is either mapped to one or more
      RAW requirements, explicitly out of promoted scope, or blocked on an
      assumption.
- [ ] Existing QCORE, battle-runtime, focused MBT, and runtime-test claims are
      linked where they already exist.
- [ ] The report ranks uncovered executable requirements by source file,
      heading, classification, and domain owner.
- [ ] The checker remains deterministic and fast enough for normal quality runs.

---

## Phase 6: Full Corpus Classification

**User stories**:

- As a project owner, I can say the matrix covers the SRD text itself, not only
  the currently promoted proof/runtime areas.
- As a maintainer, I can inspect every non-fluff SRD span and see its domain
  disposition.
- As a planner, I can pick future QNT, runtime, or authored-data work from a
  complete uncovered-requirement list.

### What to build

Expand classification and closure from the first broad file to every file under
`.references/srd-5.2.1/`. This phase is about matrix completeness, not
implementation coverage. It must classify all fluff too, because that is how the
matrix proves those spans were deliberately excluded from executable/domain
coverage. Every non-fluff span must be closed as one of: RAW requirement,
table/caller responsibility, authored-data coverage requirement, assumption
needed, or out-of-promoted-scope with reason.

### Acceptance Criteria

- [ ] 100% of generated SRD spans across `.references/srd-5.2.1/` are
      classified.
- [ ] 100% of non-fluff spans across `.references/srd-5.2.1/` are closed by a
      requirement id, table/caller responsibility, authored-data requirement,
      assumption anchor, or out-of-promoted-scope reason.
- [ ] 100% of SRD sections have passing RAW review agent verdicts before their
      spans count toward matrix completeness.
- [ ] The report has separate denominators for all spans, fluff spans,
      non-fluff spans, executable requirements, authored-data requirements, and
      table/caller responsibility requirements.
- [ ] The report can list every non-fluff span that lacks QNT, runtime,
      verification, or production coverage without confusing that list with
      unclassified text.
- [ ] The checker fails if any SRD file is missing from the generated span
      inventory.

---

## Phase 7: Workspace Gate and Planning Workflow

**User stories**:

- As a contributor, I get a clear failure when I add RAW-modeled behavior without
  traceability.
- As a maintainer, I can use the matrix to choose the next RAW area.
- As a project owner, I can ask "what percent complete are we?" and get precise
  answers for classification, QNT, runtime parity, and production coverage.

### What to build

Promote the checker into the workspace scripts once the tracer and first broad
slice have stabilized. Add documentation explaining how new QNT, runtime, and
test work cite RAW requirement ids. Update planning conventions so new rule
plans include the relevant matrix impact and do not duplicate coverage facts in
parallel data structures.

### Acceptance Criteria

- [ ] `pnpm raw-coverage:check` or an equivalent workspace script validates the
      matrix.
- [ ] The workspace quality gate includes the checker only after it is stable and
      fast enough for routine use.
- [ ] New rule plans are expected to cite existing RAW requirement ids or add
      new ones as part of the plan.
- [ ] The report answers: what counts as 100%, current percent complete, which
      RAW area is next, and which requirements lack QNT/runtime/verification
      owners.
- [ ] "Matrix complete" means 100% classified SRD spans and 100% closed
      non-fluff spans; QNT, runtime, parity, and production percentages remain
      measured implementation coverage, not prerequisites for matrix
      completeness.
- [ ] Coverage facts have one canonical source and are generated into reports
      instead of duplicated manually across docs.

## Verification

Every implementation phase must include these checks:

- [ ] RAW agent check: before modeling or classifying a rule, read the relevant
      local SRD passage in `.references/srd-5.2.1/` and check
      `UBIQUITOUS_LANGUAGE.md`; record the cited SRD file and heading in the
      matrix artifact or plan closeout.
- [ ] RAW review agent facilitation: every section-level matrix addition must
      include or update a `raw-reviews.jsonl` row so a RAW review agent can
      verify local SRD text, ubiquitous-language terminology, assumptions, and
      reviewed span ids before the section counts as complete.
- [ ] Type/schema check: invalid states described in this plan are rejected by
      types, parser results, or the checker before the artifacts are accepted.
- [ ] Checker tests: focused tests cover unknown ids, unclassified spans,
      executable spans without requirements, assumption spans without anchors,
      and owner claims that reference missing requirements.
- [ ] Runtime parity gate: only run promoted battle-runtime MBT after completed
      behavior changes that need integrated validation; do not run MBT for
      matrix-only classification work.
- [ ] `/simplify` convergence: after implementation, run `/simplify` immediately
      for at least two rounds and continue until no important fixes remain.
      Record the convergence result in closeout.
