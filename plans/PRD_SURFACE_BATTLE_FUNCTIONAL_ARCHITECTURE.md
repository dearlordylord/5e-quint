# PRD: Surface-to-Battle Functional Architecture Deepening

Status: proposed

## Problem Statement

The repository already has a strong functional foundation: authored rules are
closed algebraic data, runtime packages own explicit immutable reducer state,
support is admitted by structural mechanics rather than authored identity, and
focused Quint slices constrain runtime semantics.

Four related seams still allow distinctions or invariants to be lost:

1. Spell Procedure Profile admission conflates whether a Spell Definition fits
   a supported procedure with whether a concrete Spell Invocation is currently
   available to a creature.
2. Procedure ownership is incomplete. Global composition repeats profile
   membership, procedure types remain distant from their owners, and module
   initialization order participates in correctness.
3. Spell Invocation codecs can decode authored source data beside derived
   execution facts without proving that the values correspond.
4. Dhall is the canonical authored source and JSON is generated runtime input,
   but the quality lane does not verify that relationship for the whole corpus.

The project accepts that adding a genuinely new mechanics family is expensive.
This program does not make mechanics extension cheap. It makes existing support
parsing, procedure composition, replay, and authored-artifact verification
total, explicit, and locally testable.

## Solution

Deepen the existing Surface-to-battle architecture in the agreed conceptual
order:

1. Separate pure Spell Definition support parsing from contextual Spell
   Invocation discovery.
2. Complete procedure-profile ownership and derive global runtime composition
   from one immutable registered set. This is item 3 from the architecture
   review.
3. Make Spell Invocation codecs exact and reject source/projection
   contradictions. This is item 2 from the architecture review.
4. Enforce the full Dhall-to-JSON-to-Surface pipeline for every shipped authored
   record.

The runtime dependency order is therefore **1 -> 3 -> 2** using the original
review numbering. Item 4 is independent and may land earlier as a safety rail.

This is an incremental deepening of the current initial-style Surface ADT and
reducer architecture. It does not introduce Free monads, tagless-final
encodings, a universal rule engine, a second executable content language, or
authored-identity dispatch.

## User Stories

1. As a runtime maintainer, I want a supported Spell Definition parsed once
   into narrowed procedure facts, so downstream code cannot forget what
   admission established.
2. As a runtime maintainer, I want structural support and current invocation
   availability represented separately, so an unavailable action is not
   mistaken for unsupported authored content.
3. As a support-audit author, I want precise aggregate support results, so
   coverage reports identify actual structural gaps.
4. As a battle-runtime caller, I want a supported definition with no eligible
   resource to remain recognized as supported, so callers can explain why it is
   not currently available.
5. As a procedure maintainer, I want one deep module to own a procedure's facts,
   invocation representation, codec, discovery, and resolution, so changes have
   locality.
6. As a runtime maintainer, I want discovery, codec composition, dispatch, and
   classification derived from one registered procedure set, so membership has
   one source of truth.
7. As a runtime maintainer, I want module evaluation order removed from the
   correctness protocol, so importing a procedure cannot observe a partially
   initialized registry.
8. As a reviewer, I want missing or duplicate registered procedures to fail
   loudly, so global composition cannot silently omit behavior.
9. As a replay caller, I want every decoded Spell Invocation internally
   consistent, so replay cannot combine one Spell Definition with unrelated
   targeting, range, damage, or Spell Effect facts.
10. As a replay caller, I want malformed or contradictory input represented as
    typed decode failure, so restoration remains recoverable and composable.
11. As a runtime maintainer, I want exact codecs to establish their claimed
    TypeScript types, so casts cannot hide decoder gaps.
12. As a runtime maintainer, I want a documented restoration policy for
    authored source and projected facts, so snapshot behavior remains
    deterministic.
13. As a test author, I want valid invocation values to survive codec
    roundtrips, so the supported input domain is exercised beyond a few
    examples.
14. As a test author, I want generated source/projection mismatches rejected, so
    codec consistency is executable.
15. As a content author, I want every shipped Dhall record compiled and compared
    with its committed JSON, so canonical source cannot drift from runtime
    input.
16. As a content author, I want every generated record decoded through Surface,
    so successful Dhall compilation alone cannot admit invalid authored data.
17. As a content author, I want failures attributed to the exact record and
    pipeline stage, so repair remains local.
18. As a repository owner, I want the relationship between Dhall and Effect
    Schema stated unambiguously, so contributors do not maintain competing
    handwritten domain models.
19. As a repository owner, I want mixed-provenance collection states to remain
    unrepresentable, so corpus automation cannot cross licensing ownership.
20. As a reviewer, I want every migration wave to preserve existing runtime
    behavior and focused Quint parity, so architectural work cannot silently
    change SRD mechanics.
21. As an implementation agent, I want small compiling tracer bullets, so
    failures are attributable and review is practical.
22. As a maintainer, I want fewer unchecked casts, manual membership lists,
    positional assumptions, and initialization tricks, so future changes have
    stronger locality.

## Implementation Decisions

- Surface remains a provenance-bearing authored-content vocabulary, not
  executable runtime IR.
- Spell Definition support parsing is pure and produces procedure-owned narrowed
  facts or an explicit non-match/support result.
- Current Spell Invocation discovery consumes narrowed procedure facts plus
  creature and battle context.
- An empty invocation collection means that a supported definition has no
  currently available invocation. It does not mean structural support failed.
- Expected non-match against one procedure is ordinary data because multiple
  profiles may inspect the same definition. The aggregate support reader owns
  the final unsupported result and diagnostic facts.
- Procedure facts carry every structural assumption used by discovery and
  resolution, including relevant cardinality, order, duration, targeting,
  resource, and effect relationships.
- Repeated positional parsing is localized in named support-shape readers that
  return precise tuples or records.
- Each Spell Procedure Profile becomes a deep module owning support parsing,
  invocation discovery, narrowed invocation representation, exact codec, act
  discovery, reference projection, summary, classifications, and resolution.
- Shared battle vocabulary moves only when needed to form acyclic leaf modules.
  This is ownership correction, not an adapter layer.
- One immutable composition module owns the registered procedure set.
- Discovery, codec composition, metamagic classification, Readied Spell
  compatibility, and dispatch derive from that registered set.
- Deferred registry construction, suspended construction used only to break
  profile cycles, and lazy registry-derived tables are removed once the module
  graph is acyclic.
- Procedure types are derived from profile-owned definitions or registered
  composition. A central handwritten membership union is not retained as a
  second source.
- Replay adopts one consistency strategy before codec migration begins: either
  rederive execution facts from captured authored source during restoration, or
  serialize source and facts together with a decoder refinement that proves
  their relationship.
- The restoration strategy preserves snapshot determinism if installed catalog
  content changes.
- Broad object schemas and global schema-to-type assertions are removed from
  supported invocation codecs in procedure-family waves.
- Source/projection mismatch is a typed decode issue, not an exception.
- Dhall remains canonical authored source; committed JSON remains generated
  runtime input.
- Effect Schema remains the authoritative Surface parser. A richer shared Dhall
  authoring layer is generated from that authority or stays deliberately
  incomplete; the repo does not maintain a second complete handwritten schema.
- Whole-corpus verification is collection-aware and preserves provenance and
  licensing ownership. It does not glob unrelated collections together.
- Existing authored identity, supported breadth, runtime semantics, and Quint
  authority remain unchanged.

### Delivery and Size

| Original item | Work group | Size | Estimated focused effort | Expected PRs |
| --- | --- | --- | --- | --- |
| 1 | Support parsing versus invocation availability | XL | 2-3 engineer-weeks | 5-9 |
| 3 | Complete profile ownership and registered composition | XL / high risk | 1.5-3 engineer-weeks | 4-8 |
| 2 | Exact replay codecs | XL / high volume | 2-4 engineer-weeks | 6-12 |
| 4 | Whole-corpus Dhall verification | S-M | 1-3 days; up to one week if drift exists | 1-2 |

The whole program is approximately 6-10 engineer-weeks and 16-30 reviewable
PRs. Mechanical work can run in parallel within an approved migration wave,
but runtime dependency order and reviewer-loop convergence limit safe
concurrency.

Do not implement the program in one PR. Use this PRD as the umbrella and the
four linked phase plans as independently reviewable work groups.

### Implementation Plans

1. [Spell Definition support parsing](./SURFACE_BATTLE_FUNCTIONAL_ARCHITECTURE_PHASE_1_SUPPORT_PARSING.md)
2. [Procedure ownership and registered composition](./SURFACE_BATTLE_FUNCTIONAL_ARCHITECTURE_PHASE_3_PROFILE_COMPOSITION.md)
3. [Exact Spell Invocation codecs](./SURFACE_BATTLE_FUNCTIONAL_ARCHITECTURE_PHASE_2_INVOCATION_CODECS.md)
4. [Whole-corpus Dhall integrity](./SURFACE_BATTLE_FUNCTIONAL_ARCHITECTURE_PHASE_4_DHALL_INTEGRITY.md)

## Testing Decisions

- Tests exercise deep module interfaces and observable behavior, not private
  helper layout.
- Support tests separately establish structural acceptance and contextual
  invocation availability.
- Every migrated profile retains a supported SRD or synthetic record plus
  synthetic near-miss records that vary one structural fact at a time.
- Aggregate tests distinguish unsupported definitions from supported but
  unavailable invocations.
- Registered-composition contract tests prove that every procedure participates
  in discovery, codec composition, dispatch, and required classifications.
- Codec tests cover successful decode, malformed input, and source/projection
  contradiction rejection.
- Property-based tests cover invocation codec roundtrip and mismatch rejection.
  Valid generators encode procedure invariants directly and do not depend on
  high-rejection filtering.
- Property tests do not restate the projection algorithm as their oracle.
- The authored-content quality command verifies every shipped record; focused
  examples test diagnostic quality and collection ownership.
- Deterministic tests run for every migration wave. Battle MBT runs only after
  an affected vertical slice is complete and follows the repository's scarce
  MBT protocol.
- QNT proof lanes run when formal owners change. Behavior-preserving TypeScript
  refactors retain the existing focused parity witnesses.
- Each significant work group runs RAW traceability, ubiquitous-language,
  architecture/connascence, and code-review passes until no reasonable findings
  remain, using at least two rounds for nontrivial changes.

## Out of Scope

- Making new mechanics families cheap to add.
- Free-monad or tagless-final rewrites.
- A universal executable rules IR or second runtime content language.
- Runtime dispatch on authored identity.
- SRD rule changes, new assumptions, or provenance-policy changes.
- Whole-battle QNT aggregation.
- Geometry inference or other table-owned spatial systems.
- Battle reducers unrelated to Spell Procedure Profiles.
- Replacing Effect Schema.
- A second complete handwritten Surface schema in Dhall.
- One MBT per authored Spell Definition.

## Further Notes

Success is measured primarily by locality. After completion, understanding or
changing one supported spell procedure should primarily require its profile
module and focused tests. Global composition should be derived, restoration
should reject contradictions, and authored artifacts should be reproducibly
generated.

The first slice in each phase is a tracer bullet used to recalibrate the
remaining estimates before scheduling its migration waves.
