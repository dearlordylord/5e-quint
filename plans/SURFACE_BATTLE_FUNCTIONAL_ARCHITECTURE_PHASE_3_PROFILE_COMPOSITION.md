# Plan: Phase 3 - Procedure Ownership and Registered Composition

> Source PRD: [Surface-to-Battle Functional Architecture Deepening](./PRD_SURFACE_BATTLE_FUNCTIONAL_ARCHITECTURE.md)

Status: proposed

## Architectural Decisions

- **Prerequisite**: representative Phase 1 support readers establish the target
  procedure-profile shape before broad ownership migration begins.
- **Ownership**: one Spell Procedure Profile is the deep module for one runtime
  procedure family.
- **Composition**: one immutable registered set is the source of procedure
  membership for discovery, codecs, dispatch, and classifications.
- **Dependency direction**: shared battle vocabulary is placed in acyclic leaf
  modules; profiles do not import a monolithic aggregator that imports them.
- **Derivation**: global unions and tables derive from registered profile-owned
  definitions rather than parallel handwritten membership.
- **Behavior**: composition changes preserve current supported procedures and
  observable reducer semantics.

---

## Tracer Bullet 1: One Fully Owned Procedure

**User stories**: 5-8, 20-22

### What to Build

Move one representative procedure's narrowed facts, invocation representation,
codec, discovery, classifications, and resolution behind its profile module.
Route global discovery, codec composition, and dispatch through registered
composition for that procedure while all other procedures remain on the
existing path.

### Acceptance Criteria

- [ ] The pilot profile owns its complete procedure representation and behavior.
- [ ] Global callers do not hand-code a second membership entry for the pilot.
- [ ] The pilot participates in discovery, codec decode, dispatch, and
      classification through registered composition.
- [ ] Removing the pilot profile from the registered set fails a contract test
      or compile-time completeness check.
- [ ] Existing pilot behavior and focused parity witnesses are unchanged.

---

## Tracer Bullet 2: Acyclic Shared Vocabulary

**User stories**: 5, 7, 8, 22

### What to Build

Extract the smallest stable battle vocabulary needed by profiles into acyclic
leaf modules. Move policy derived from all registered procedures upward into the
composition owner. Prove that two contrasting profile families can load without
deferred global initialization.

### Acceptance Criteria

- [ ] Pilot profiles depend only on leaf vocabulary and narrower procedure
      collaborators.
- [ ] Registry-derived policy does not sit below profiles that it enumerates.
- [ ] No new adapter or duplicate runtime state is introduced.
- [ ] Importing either pilot profile does not observe partially initialized
      composition.
- [ ] Dependency tests or static checks detect a reintroduced cycle.

---

## Tracer Bullet 3: Registry-Driven Discovery and Codec Composition

**User stories**: 6-8, 20, 22

### What to Build

Make the registered procedure set drive discovery and the supported invocation
codec for a representative mixed group of prepared, cantrip, reaction, and
persistent-effect procedures. Preserve distinctions in Spell Access and
invocation context without parallel lists.

### Acceptance Criteria

- [ ] Registered procedures participate in discovery without individual global
      call-site enumeration.
- [ ] Invocation codec composition derives from the same registered set.
- [ ] Duplicate procedure discriminators are rejected or unrepresentable.
- [ ] Access-family distinctions remain encoded by procedure facts and types.
- [ ] Contract tests cover discovery, decode, dispatch, and classification
      completeness.

---

## Migration Wave 4: Procedure-Family Ownership

**User stories**: 5-8, 20-22

### What to Build

Move remaining invocation types and complete profile behavior in procedure-family
waves. Each wave removes the corresponding central type and manual global
composition entries.

### Acceptance Criteria

- [ ] Every migrated procedure has one profile-owned invocation definition.
- [ ] No migrated membership remains duplicated in discovery or classification
      code.
- [ ] Each wave reduces central procedure ownership rather than creating
      forwarding modules.
- [ ] Existing runtime and replay behavior remains stable.
- [ ] Each wave is independently compiling and mergeable.

---

## Migration Wave 5: Remove Initialization Protocols

**User stories**: 6-8, 22

### What to Build

Complete registered composition for all procedures, then remove deferred
registry proxies, cycle-only schema suspension, lazy registry policy tables,
central handwritten procedure membership, and the manual discovery list.

### Acceptance Criteria

- [ ] One immutable registered set owns all procedure membership.
- [ ] Discovery, codec composition, dispatch, and classifications derive from
      that set.
- [ ] Cycle-breaking runtime initialization tricks are absent.
- [ ] The module graph is acyclic across profiles and composition.
- [ ] A completeness contract fails loudly for missing or duplicate profiles.

## Verification

- [ ] Read the relevant local SRD passages and `UBIQUITOUS_LANGUAGE.md` terms for
      every pilot procedure before moving behavior ownership.
- [ ] Confirm composition changes preserve every procedure's existing RAW trace
      and do not introduce new mechanics or assumptions.
- [ ] Run deterministic profile, discovery, codec, dispatch, and classification
      tests plus battle-runtime typecheck for every wave.
- [ ] Run dependency/cycle checks after each leaf-vocabulary or composition
      change.
- [ ] Run affected focused MBT only after a complete procedure-family wave.
- [ ] Run RAW, ubiquitous-language/domain, architecture/connascence, and
      code-review passes after implementation. Fix every reasonable finding and
      repeat until no reasonable findings remain; use at least two rounds for
      every nontrivial wave.
- [ ] Document any rejected review note with a concrete reason.
