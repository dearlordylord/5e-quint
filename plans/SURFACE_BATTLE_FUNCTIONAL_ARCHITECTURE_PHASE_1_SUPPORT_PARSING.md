# Plan: Phase 1 - Spell Definition Support Parsing

> Source PRD: [Surface-to-Battle Functional Architecture Deepening](./PRD_SURFACE_BATTLE_FUNCTIONAL_ARCHITECTURE.md)

Status: proposed

## Architectural Decisions

- **Domain split**: Spell Definition support is static authored-shape
  classification. Spell Invocation availability is runtime context.
- **Parsing**: a procedure profile parses a decoded Spell Definition once into
  narrowed procedure facts. Downstream discovery consumes only those facts.
- **Non-match**: one profile declining a definition is expected data. Aggregate
  classification owns the unsupported result.
- **Availability**: no currently eligible invocation is represented separately
  from unsupported definition shape.
- **Precision**: procedure facts encode cardinality, order, and cross-field
  assumptions required by execution.
- **Identity**: support is determined by Surface shape and typed facts, never by
  authored name, id, slug, or provenance dispatch.
- **Behavior**: no SRD mechanic or supported-content claim changes in this
  phase.

---

## Tracer Bullet 1: One Activation and One Ongoing Effect

**User stories**: 1, 2, 4, 20, 21

### What to Build

Introduce the static-support/result vocabulary and carry it end to end through
one representative activation procedure and one representative ongoing-effect
procedure. Each definition is parsed once, then current invocations are
discovered from its narrowed facts and actor context. Existing public battle
behavior remains identical.

### Acceptance Criteria

- [ ] A structurally supported definition produces narrowed procedure facts.
- [ ] A near-miss definition produces an explicit non-match or support issue.
- [ ] A supported definition with no eligible resource remains classified as
      supported and produces no current invocation.
- [ ] Discovery and resolution do not re-read broad Surface mechanics.
- [ ] Existing focused deterministic and parity witnesses remain unchanged in
      observable outcome.

---

## Tracer Bullet 2: Shared Support-Shape Readers

**User stories**: 1, 3, 21, 22

### What to Build

Extract only the repeated support-shape operations proven useful by the first
tracer bullet: exact phase/operation cardinality, named positions, and recurring
attachment/effect relationships. These readers return precise records or
tuples and keep procedure-specific meaning in the owning profile.

### Acceptance Criteria

- [ ] Repeated positional assumptions used by the pilot profiles are encoded by
      named readers.
- [ ] Readers return narrowed values that make invalid downstream indexing
      unnecessary.
- [ ] Readers report or represent non-match without exceptions.
- [ ] No generic reader hides procedure-specific ordering or meaning.
- [ ] Focused tests cover exact cardinality and adjacent near-miss shapes.

---

## Tracer Bullet 3: Save-Gate and Attack Families

**User stories**: 1, 2, 3, 5, 20

### What to Build

Migrate representative save-gate and attack procedures through the full static
support -> current invocation -> act discovery -> resolution path. Use the
result to settle aggregate support diagnostics for procedures sharing broad
Surface families.

### Acceptance Criteria

- [ ] Save-gate and attack definitions are parsed once into procedure facts.
- [ ] Multiple profiles may decline the same definition without manufacturing
      errors.
- [ ] Aggregate classification distinguishes no supported procedure from no
      current invocation.
- [ ] Slotless and slotted access retain their existing behavior.
- [ ] Affected focused parity witnesses pass after the migration.

---

## Migration Wave 4: Remaining Common Procedures

**User stories**: 1-5, 20-22

### What to Build

Migrate the remaining common activation, ongoing-effect, reaction, attack,
save-gate, restoration, and persistent-effect procedure families in reviewable
waves. Each wave is a complete behavior-preserving vertical slice.

### Acceptance Criteria

- [ ] Every migrated profile exposes static support independently from current
      invocation discovery.
- [ ] Procedure facts flow through discovery and resolution without broad-shape
      revalidation.
- [ ] Every wave includes supported and near-miss support tests.
- [ ] No new authored-identity support dispatch is introduced.
- [ ] Each wave remains compiling and mergeable independently.

---

## Migration Wave 5: Special Procedures and Completion Gate

**User stories**: 1-5, 20-22

### What to Build

Migrate special multi-stage, stored, spawned, area-hazard, and interrupt
procedures. Remove the old conflated admission path once every registered
procedure uses the split model.

### Acceptance Criteria

- [ ] Every registered procedure separates static support from availability.
- [ ] The old conflated admission interface has no production consumers.
- [ ] Unsupported authored shape has a typed aggregate result.
- [ ] Supported but unavailable definitions remain observable as supported.
- [ ] Existing authored-content breadth and runtime outcomes are unchanged.

## Verification

- [ ] Before changing any behavior-shaped parser, read the relevant local SRD
      passage and the corresponding terms in `UBIQUITOUS_LANGUAGE.md`.
- [ ] Confirm every migrated procedure still traces to its existing SRD passage
      or existing `ASSUMPTIONS.md` entry; this plan introduces no new rule.
- [ ] Run Surface/profile deterministic tests and battle-runtime typecheck for
      every tracer bullet and migration wave.
- [ ] Run only the affected focused MBT after each completed behavior family,
      following the repository's process and seed-reproduction requirements.
- [ ] Run RAW, ubiquitous-language/domain, architecture/connascence, and
      code-review passes after implementation. Fix every reasonable finding and
      repeat until no reasonable findings remain; use at least two rounds for
      every nontrivial wave.
- [ ] Document any rejected review note with a concrete reason.
