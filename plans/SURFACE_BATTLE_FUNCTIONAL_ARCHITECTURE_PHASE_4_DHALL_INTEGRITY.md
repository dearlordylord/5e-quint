# Plan: Phase 4 - Whole-Corpus Dhall Integrity

> Source PRD: [Surface-to-Battle Functional Architecture Deepening](./PRD_SURFACE_BATTLE_FUNCTIONAL_ARCHITECTURE.md)

Status: proposed

## Architectural Decisions

- **Source**: Dhall is canonical authored content. JSON is generated runtime
  input and is never independently maintained.
- **Domain parser**: Effect Schema is the authoritative Surface parser.
- **Collection ownership**: verification is collection-aware and preserves
  provenance and licensing seams.
- **Completeness**: every shipped authored record participates; a filename
  prefix is not a substitute for collection membership.
- **Diagnostics**: compilation, artifact comparison, Surface decode, identity,
  reference, and provenance failures remain distinguishable.
- **Dhall modeling**: the repo does not create a second complete handwritten
  schema. Shared Dhall helpers are generated or deliberately limited authoring
  conveniences.
- **Independence**: this phase may land before the runtime phases because it does
  not depend on profile migration.

---

## Tracer Bullet 1: Multi-Family Integrity Check

**User stories**: 15-19, 21

### What to Build

Extend authored-artifact verification through one Spell Definition, one class
or feature Unit, one equipment Unit, and one Stat Block. For each record,
compile Dhall, compare generated JSON, decode through the appropriate Surface
schema, and validate collection provenance.

### Acceptance Criteria

- [ ] Each representative family crosses the complete authoring pipeline.
- [ ] Stale JSON, invalid Dhall, invalid Surface shape, and wrong provenance
      produce distinct failures.
- [ ] Verification uses collection ownership rather than an unscoped corpus
      glob.
- [ ] Generated temporary artifacts do not modify the worktree.
- [ ] Diagnostics name the authored record and failing stage.

---

## Tracer Bullet 2: Pairing and Orphan Detection

**User stories**: 15-19, 21, 22

### What to Build

Make authored-source and generated-artifact pairing exhaustive within each
collection. Detect missing JSON, orphaned JSON, duplicate installed identity,
and authored files that are not installed or explicitly classified.

### Acceptance Criteria

- [ ] Every installed authored record has exactly one Dhall source and generated
      JSON artifact.
- [ ] Missing and orphaned artifacts fail with distinct diagnostics.
- [ ] Duplicate authored identity fails at the owning collection seam.
- [ ] Collection provenance remains homogeneous and explicit.
- [ ] Existing intentional non-installed research artifacts are outside the
      shipped collection check.

---

## Migration Wave 3: Whole Shipped Corpus

**User stories**: 15-19, 21, 22

### What to Build

Run the complete compile, compare, decode, and collection-validation pipeline
for every shipped Unit and Stat Block. Repair discovered drift only in canonical
Dhall source, regenerate JSON, and keep each repair wave attributable.

### Acceptance Criteria

- [ ] Every shipped Dhall record is compiled during the integrity check.
- [ ] Every committed JSON artifact is byte-equivalent to canonical generation
      or a documented deterministic canonical comparison.
- [ ] Every generated artifact decodes through its exact Surface record schema.
- [ ] All installed collections satisfy duplicate-reference and provenance
      invariants.
- [ ] The worktree remains clean after a successful verification run.

---

## Completion Gate: Quality Integration and Authority Documentation

**User stories**: 15-19, 22

### What to Build

Replace the subset-only quality check with the collection-complete integrity
check and document the distinct authorities: local SRD text for rules, Dhall for
authored record values, generated JSON for runtime packaging, Effect Schema for
structural parsing, and collection types for provenance ownership.

### Acceptance Criteria

- [ ] The default quality lane runs whole-corpus integrity verification.
- [ ] The previous subset-only check is removed or delegates to the complete
      check without maintaining a second algorithm.
- [ ] Documentation names one authority for each source, artifact, schema, and
      collection concern.
- [ ] Shared Dhall helpers are not described as a complete independent Surface
      schema unless generated as such.
- [ ] A newly installed authored record cannot bypass the integrity lane.

## Verification

- [ ] Read the local SRD provenance passages relevant to any record repaired
      after the first whole-corpus run and check terminology against
      `UBIQUITOUS_LANGUAGE.md`.
- [ ] Confirm every repaired authored record still traces to its specific local
      SRD source and no mechanics or assumptions changed during regeneration.
- [ ] Run the whole-corpus integrity check twice and confirm the second run is
      idempotent and leaves the worktree clean.
- [ ] Run Surface typecheck and deterministic catalog/reader tests.
- [ ] Do not run battle MBT for artifact discovery or regeneration; this phase
      changes no reducer procedure.
- [ ] Run RAW, ubiquitous-language/domain, architecture/connascence, and
      code-review passes after implementation. Fix every reasonable finding and
      repeat until no reasonable findings remain; use at least two rounds for
      nontrivial drift repair.
- [ ] Document any rejected review note with a concrete reason.
