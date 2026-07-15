# PHB-to-SRD Delta Denominator

Wayfinder research for [Determine the PHB-to-SRD delta
denominator](https://github.com/dearlordylord/5e-quint/issues/68), investigated
at source commit `f4fd7d3b24ef683cf3e4147c109b77ea21eb001a`.

## Scope

This decision defines the relation and evidence needed to account for the
private 2024 PHB corpus without publishing protected identity or expression. It
does not decide which book material belongs in the product, establish
publication rights, author Mushroom records, or implement the checker.

The corpus roots and comparison-unit granularity remain decisions for [Define
the Mushroom PHB product corpus
boundary](https://github.com/dearlordylord/5e-quint/issues/76). The relation
below is the denominator shape that decision must populate.

## Decision

Do not calculate the Mushroom remainder with authored ids, names, headings, or
literal set subtraction. The two corpora are not identity-isomorphic: a rule or
record can be renamed, relocated, split, merged, or mechanically changed while
still corresponding to material in the other corpus.

Use two manifests and one total private disposition:

- `S` is the accepted SRD Product Element manifest. Every member retains SRD
  provenance and is included unchanged through its provenance-homogeneous SRD
  record-family collection.
- `P` is the accepted private PHB Comparison Unit manifest. Its stable keys and
  source anchors remain private.
- `D` is a total function from every member of `P` to exactly one disposition.

In algebraic form:

```text
D : P ->
    CorrespondsToSrd(
      NonEmptySet<SrdProductElementKey>,
      SrdCoverage
    )
  | PhbOnly(NonEmptySet<PrivateRewriteObligation>)
  | Excluded(ExclusionRuleKey)

SrdCoverage =
    FullyRepresented
  | WithRemainder(NonEmptySet<PrivateRewriteObligation>)
```

The intended product equation is therefore:

```text
MushroomPHB = SrdProduct(S)
              ⊎ MushroomProduct(Rewrite(obligations(D)))
```

The disjoint union is a collection/provenance guarantee, not a claim that the
two collections have disjoint mechanics. Mushroom records have original
Mushroom authored identity and Mushroom provenance. They do not acquire PHB
provenance merely because a private obligation informed their mechanics.

### Disposition meanings

`CorrespondsToSrd` means the PHB Comparison Unit has a non-empty mechanical
correspondence to the referenced SRD Product Elements despite not being the
same authored source member. Correspondence is not inferred from an id or name.

Its `FullyRepresented` coverage means the whole PHB Comparison Unit is
mechanically represented by those SRD Product Elements. The product emits no
Mushroom rewrite obligation for that unit; the SRD product is sufficient.

Its `WithRemainder` coverage means the PHB Comparison Unit is not mechanically
equivalent to the corresponding SRD Product Elements. Its non-empty private
obligations state what original Mushroom content must cover. The obligations
are authoring requirements, not copied text, authored identity, Surface
records, or runtime projections.

`Rewrite` does not prescribe a delta patch, overlay, inheritance relationship,
or one-obligation-per-record output. It means original Mushroom authoring must
satisfy the obligations. [Define composed catalog and authored-dependency
semantics](https://github.com/dearlordylord/5e-quint/issues/72) owns whether a
Mushroom record is standalone or uses an allowed authored cross-record
relationship.

`PhbOnly` means no adequate SRD mechanical counterpart exists. Its non-empty
private obligations state what original Mushroom content must cover. The
variant has no SRD-reference field, so an allegedly PHB-only unit cannot also
carry a counterpart.

`Excluded` means the accepted product-boundary policy emits neither an SRD
substitute nor a Mushroom rewrite for the unit. Its exclusion rule is a
reference to the accepted boundary policy, not free-form prose in the ledger.
The variant has no rewrite-obligation field.

The relation deliberately permits many-to-many correspondence. A PHB
Comparison Unit may reference multiple SRD Product Elements, and one SRD
Product Element may be referenced by multiple PHB Comparison Units. No
one-record-per-record convention participates in correctness.

## Domain boundaries

### Provenance is not structured input

The private bundle records these independently:

- the canonical rules source whose content is being classified;
- the structured-input snapshot used to locate and extract comparison units;
- the derived pairing and rewrite obligations.

A 5e-tools source flag, record key, path, tag, or `srd52` marker is structured
input only. It cannot establish SRD or PHB provenance. Conversely, SRD
provenance comes from the accepted SRD corpus and its collection boundary, not
from a private pairing row.

The existing survey queue demonstrates why this separation is necessary: it
can label a row as SRD while locating its text through a 5e-tools record. That
is a useful extraction shortcut, but it is not a provenance proof
(`scripts/content-surface-survey/unit-catalog.ts:25-69`, `220-248`).

### Comparison units are not authored records

A **PHB Comparison Unit** is private accounting granularity. It may correspond
to an authored record, a rules entry, or another content-bearing block selected
by the accepted corpus-boundary extractor. It is not automatically a Surface
`UnitRecord`, `StatBlockRecord`, Mushroom record, or runtime capability.

An **SRD Product Element** is a member of the accepted SRD product manifest. Its
kind distinguishes an authored Unit, authored Stat Block, and any rules unit
that [Define the Mushroom PHB product corpus
boundary](https://github.com/dearlordylord/5e-quint/issues/76) admits. This keeps
record catalogs and book/rules material from being hidden in one misleading
record union.

A **Private Rewrite Obligation** is a private mechanical requirement that later
original Mushroom authoring must satisfy. It carries no public authored
identity and is not executable runtime state. Later workflow evidence may
relate one obligation to several Mushroom records, or one Mushroom record to
several obligations.

These are work-specific specification terms, not D&D rules terms. They remain
in the Wayfinder decision and eventual accepted specification rather than being
added to `UBIQUITOUS_LANGUAGE.md`.

## Private detailed bundle

The detailed artifact stays in the private research boundary. It contains six
canonical parts, each with one owner:

1. **PHB rules-source manifest** — the authoritative source identity and private
   source commitment supplied under the publication constraints. It does not
   contain 5e-tools identifiers as provenance.
2. **Structured-input manifest** — pinned input files, byte commitments, parser
   identity, and the complete set of extractable source anchors. It states how
   nested presentation nodes remain owned by their enclosing anchor so that
   JSON formatting fragments do not masquerade as product units.
3. **SRD Product Element manifest** — the exact target SRD membership, with
   separate element kinds and references to canonical redistributable sources.
4. **PHB Comparison Unit manifest** — stable opaque private keys, unit kinds,
   non-empty sets of structured-input anchors, and non-empty private references
   to the canonical rules-source evidence used to review each unit. A
   structured-input anchor belongs to exactly one comparison unit.
5. **Pairing ledger** — exactly one `D` row per PHB Comparison Unit, using the
   discriminated union above. Detailed comparison evidence and reviewer
   attestations remain private.
6. **Checker output** — a canonical bundle commitment and the public aggregate
   derived from the same accepted manifests and ledger.

Stable private keys must not be unsalted hashes of official names or source
paths. Use stored opaque identifiers, or keyed commitments whose key is kept
outside public artifacts, so public data cannot recover protected identity by
dictionary attack.

The accepted bundle has no `unknown`, `unreviewed`, or empty-obligation state.
Work in progress may use a separate draft format, but draft rows cannot decode
as the accepted pairing ledger.

## Machine-checkable invariants

The private checker must fail closed unless all of these hold:

1. **Source authority:** the PHB rules-source commitment matches the artifact
   reviewed by the authoritative private decision owner, and every comparison
   unit has a resolvable rules-source evidence reference.
2. **Structured-input integrity:** every declared structured-input commitment
   matches the bytes inspected by the extractor.
3. **Source fidelity:** every comparison row's semantic review attestation cites
   the canonical PHB rules-source evidence and redistributable SRD evidence;
   structured input alone cannot satisfy the review.
4. **Anchor totality:** every extractable anchor in the accepted structured-input
   manifest belongs to exactly one PHB Comparison Unit; there are no unknown,
   duplicate, or orphan anchors.
5. **Disposition totality:** the ledger key set equals the PHB Comparison Unit
   key set exactly, and every key occurs once.
6. **Disposition disjointness:** every ledger row decodes as exactly one union
   variant. There are no independent booleans or optional fields capable of
   expressing contradictory categories.
7. **Reference integrity:** every SRD reference exists in the accepted SRD
   Product Element manifest and has the kind claimed by the reference.
8. **Obligation integrity:** obligations exist only in `WithRemainder` coverage
   and `PhbOnly`, are non-empty there, and have unique private keys across the
   bundle.
9. **Equivalence evidence:** every `CorrespondsToSrd(FullyRepresented)` row has
   a private review attestation that the full comparison unit is mechanically
   represented by its cited SRD elements.
10. **Remainder evidence:** every `CorrespondsToSrd(WithRemainder)` row has a
    private review attestation that correspondence exists, equivalence does not,
    and the obligations cover the observed mechanical remainder.
11. **No-counterpart evidence:** every `PhbOnly` row has a private search
    attestation against the whole accepted SRD manifest, not merely a failed
    name match.
12. **Exclusion authority:** every `Excluded` row cites an exclusion rule owned
    by the accepted product-boundary policy.
13. **SRD membership completeness:** every SRD Product Element appears exactly
    once in the target collection for its record family, and every collection
    boundary rejects mixed provenance and the wrong element kind. SRD elements
    need not be referenced by a PHB row to remain product members.
14. **Aggregate derivation:** every published count and commitment is derived
    from the accepted private bundle in the same checker invocation; hand-edited
    aggregate evidence is invalid.

The checker can establish structural completeness, reference closure, and that
the published aggregate commits to one exact private bundle. It cannot infer
semantic equivalence from hashes or counts. The private comparison evidence and
authorized review establish semantic correctness; the public artifact must not
claim otherwise.

## Public aggregate evidence

The public artifact contains no PHB names, ids, slugs, headings, source paths,
page references, prose, family inventories, or per-unit commitments. It may
publish only:

- a schema identifier and checker source commit;
- a commitment to the canonical private bundle;
- a commitment to the accepted SRD Product Element manifest;
- total PHB Comparison Unit count;
- the three PHB disposition counts and the two correspondence-coverage
  subcounts;
- total SRD Product Element count and count referenced by at least one PHB row;
- total private rewrite-obligation count; and
- the accepted product-boundary policy commitment.

The public count equation is:

```text
phbComparisonUnits
  = correspondsToSrd
  + phbOnly
  + excluded

correspondsToSrd
  = fullyRepresented
  + withRemainder
```

The fourth high-level product bucket is the independently counted SRD Product
Element manifest. It is not another PHB Comparison Unit disposition: SRD
membership and PHB-to-SRD correspondence have different domains. Treating them
as variants of one union would permit nonsensical states such as a private PHB
unit claiming to be an SRD-provenance member.

An authorized auditor can recompute the commitments and every aggregate from
the private bundle. A public reader can verify internal arithmetic and bind a
later audit statement to the committed bundle, but cannot reconstruct protected
identity or independently judge private semantic pairings. Stronger public
proof would require a separately chosen zero-knowledge or selective-disclosure
scheme; ordinary hashes and counts are not such a proof.

## Consequences for the product specification

- The working expression `SRD 5.2.1 ⊎ MushroomRewrite(PHB 2024 - SRD
5.2.1)` becomes precise only through `D`; the minus sign is conceptual, not an
  authored-identity operation.
- The SRD collection remains complete even when an SRD Product Element has no
  private PHB counterpart.
- A renamed or reorganized counterpart is decided by mechanics and private
  evidence, not by identity similarity.
- A corresponding but changed PHB unit produces Mushroom authoring obligations
  without mutating or replacing the SRD record.
- Mushroom provenance belongs to the authored Mushroom collection. Private PHB
  input and 5e-tools extraction metadata do not cross that collection boundary.
- Runtime admission and formal parity consume Surface shape and typed procedure
  facts later. They do not consume the pairing ledger or branch on its private
  keys.

## Existing seams and follow-on ownership

At the investigated commit, the Surface boundary supplies the right SRD-side
pattern:
`SrdUnitCollection` and `SrdStatBlockCollection` narrow member provenance and
reject mixed-provenance collections
(`packages/surface/src/surface/unit-catalog.ts:405-505`,
`packages/surface/src/surface/stat-block-catalog.ts:23-106`). Catalog lookup then
returns generic authored records rather than leaking provenance into runtime
dispatch (`packages/surface/README.md:73-83`).

The future Mushroom collection should mirror that collection-level guarantee
with its own provenance type; it should not widen the SRD-only collection or
reuse the existing `xphb` structured-input marker as shipped provenance.
Designing that collection is implementation work after the Wayfinder
specification is accepted.

[Define the Mushroom PHB product corpus
boundary](https://github.com/dearlordylord/5e-quint/issues/76) now owns the
choice of source roots, comparison-unit kinds and granularity, and exclusion
rules. [Define the mechanical fidelity and creative rewrite
contract](https://github.com/dearlordylord/5e-quint/issues/73) owns what it means
for original Mushroom authoring to satisfy a private rewrite obligation.

No new Wayfinder ticket is needed. Building the private bundle, checker, or
Mushroom collections is implementation beyond this map's planning destination.

## Traceability and review

The decision was checked against:

- `CONTEXT-MAP.md` for documentation ownership;
- `ARCHITECTURE.md:8-39` and `134-213` for content licensing, authored identity,
  provenance, and runtime-projection boundaries;
- `packages/surface/README.md:58-83` for authored Surface and SRD collection
  ownership;
- `packages/surface/src/surface/schema-base.ts:679-682` for the existing
  provenance markers that later work must not conflate;
- local `.references/srd-5.2.1/` manifests and headings for the redistributable
  rules-side corpus structure;
- the private `.references/xphb-srd-pairing/` index, reset, coverage ledger,
  chapter-spine, glossary-pairing, and survey artifacts for split, merge,
  rename, relocation, extraction-gap, and catalog-granularity pressure; and
- `UBIQUITOUS_LANGUAGE.md` and `ASSUMPTIONS.md`, which contain no competing D&D
  term or RAW assumption for this work-specific accounting relation.

This is a planning artifact only. It changes no modeled rule, Surface schema,
runtime behavior, QNT authority, or acceptance lane, so no MBT or QNT proof run
is warranted.

Two reviewer-loop passes converged. The first separated record-family
collections from the aggregate product and made rewrite obligations neutral
about patching versus standalone authoring. The second separated SRD membership
from PHB correspondence and canonical rules-source evidence from structured
input. The final RAW/ubiquitous-language, architecture/domain, connascence,
public-identity, and code-review passes found no remaining reasonable issue; no
review note was rejected.
