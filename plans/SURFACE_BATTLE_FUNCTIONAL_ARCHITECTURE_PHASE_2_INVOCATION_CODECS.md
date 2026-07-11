# Plan: Phase 2 - Exact Spell Invocation Codecs

> Source PRD: [Surface-to-Battle Functional Architecture Deepening](./PRD_SURFACE_BATTLE_FUNCTIONAL_ARCHITECTURE.md)

Status: proposed

## Architectural Decisions

- **Prerequisite**: profile-owned invocation types from Phase 3 are the codec
  owners.
- **Canonical state**: authored source and runtime projection are distinct
  concepts. If both are serialized, their relationship is executable at decode.
- **Determinism**: restoration does not silently acquire different semantics
  from later catalog content.
- **Totality**: malformed or contradictory serialized values produce typed
  decode issues.
- **Schema authority**: exact schemas establish claimed invocation types;
  general object schemas and unchecked global casts do not.
- **Migration**: codecs move in procedure-family waves while old and new exact
  branches remain distinguishable and testable.

---

## Decision Gate: Restoration Consistency Strategy

**User stories**: 9-12, 20-22

### What to Build

Use representative snapshots and replay flows to decide whether restoration
rederives procedure facts from captured authored source or validates serialized
source and projected facts together. Record the decision before broad codec
migration.

### Acceptance Criteria

- [ ] The canonical serialized facts are named and justified.
- [ ] Snapshot determinism under catalog change is explicitly preserved.
- [ ] Missing authored content and source/projection mismatch have typed outcomes.
- [ ] No redundant fact remains without an executable consistency check.
- [ ] The decision applies to ordinary casts, continuations, stored releases,
      and replayed invocations.

---

## Tracer Bullet 1: Exact Scalar and Save-Gate Codecs

**User stories**: 9-14, 20, 21

### What to Build

Implement the chosen restoration strategy for one scalar-effect procedure and
one save-gate procedure. Replace broad nested objects with exact schemas and
exercise encode, decode, restoration, and resolution end to end.

### Acceptance Criteria

- [ ] Exact schemas reject malformed nested source and projection facts.
- [ ] Valid invocation values roundtrip to the canonical representation.
- [ ] Source/projection mismatches are rejected as typed decode issues.
- [ ] Decoded values require no unsafe cast before resolution.
- [ ] Existing replay and focused parity behavior is unchanged.

---

## Tracer Bullet 2: Property-Based Codec Contracts

**User stories**: 9-14, 21

### What to Build

Add reusable property-based test support for valid procedure-owned invocation
values and deliberately inconsistent variants. Generators encode valid domain
constraints directly and shrink failures to useful procedure facts.

### Acceptance Criteria

- [ ] The valid roundtrip property covers both pilot procedure families.
- [ ] An independent mismatch transformation breaks one source/projection
      relationship at a time and is always rejected.
- [ ] Generators do not use broad values plus high-rejection assumptions.
- [ ] Tests do not reimplement the projection algorithm as an oracle.
- [ ] Shrunk failures identify the violated procedure invariant.

---

## Migration Wave 3: Common Invocation Families

**User stories**: 9-14, 20-22

### What to Build

Migrate activation, ongoing-effect, attack, save-gate, restoration, and reaction
invocation codecs in family waves. Each wave replaces broad schemas and removes
the corresponding schema-to-type assertions.

### Acceptance Criteria

- [ ] Every migrated codec establishes the complete invocation type it returns.
- [ ] Every duplicated source/projection relationship is either eliminated or
      checked at decode.
- [ ] Typed decode issues preserve enough locality for caller diagnostics.
- [ ] Roundtrip and mismatch properties cover each reusable codec shape.
- [ ] Each wave remains independently restoring and resolving snapshots.

---

## Migration Wave 4: Special Continuations and Stored Procedures

**User stories**: 9-14, 20-22

### What to Build

Migrate stored spell releases, interrupt continuations, multi-stage procedures,
spawned or persistent effects, and other invocation shapes whose serialized
lifetime extends beyond one ordinary cast resolution.

### Acceptance Criteria

- [ ] Long-lived invocation forms obey the chosen consistency strategy.
- [ ] Nested continuation and stored-release codecs are exact.
- [ ] Restoration failures remain typed and do not partially mutate battle
      state.
- [ ] Snapshot and continuation roundtrips preserve stable addressing.
- [ ] Affected focused replay and MBT witnesses pass.

---

## Completion Gate: Remove Broad Invocation Schemas

**User stories**: 9-14, 22

### What to Build

Remove the general runtime object escape hatch from supported invocation codec
composition and delete obsolete global casts after every registered procedure
has an exact restoration contract.

### Acceptance Criteria

- [ ] No supported invocation branch depends on an unrestricted object schema.
- [ ] No global helper casts a structurally wider schema to an invocation type.
- [ ] Every registered procedure has an exact codec owned with its invocation
      type.
- [ ] Malformed and contradictory corpus tests fail at decode.
- [ ] Existing valid snapshots and runtime outcomes remain supported.

## Verification

- [ ] Read the relevant local SRD passages and `UBIQUITOUS_LANGUAGE.md` terms for
      each pilot and migration family before encoding procedure invariants.
- [ ] Confirm codecs preserve the same modeled rules and existing assumptions;
      serialization changes do not become new semantic authority.
- [ ] Run exact codec examples, property-based roundtrip and mismatch tests,
      restoration tests, and battle-runtime typecheck for every wave.
- [ ] Run affected focused MBT only after a complete codec family is migrated.
- [ ] Run RAW, ubiquitous-language/domain, architecture/connascence, and
      code-review passes after implementation. Fix every reasonable finding and
      repeat until no reasonable findings remain; use at least two rounds for
      every nontrivial wave.
- [ ] Document any rejected review note with a concrete reason.
