# Effect 4 Surface publication delta

Issue #373 reviews the generated Surface publication against the immutable
Effect 3 artifact bytes at commit `76d9abaf0ec9c8369d5f95f603c5cce88704d26e`.
The machine-readable classification and evidence are in
[`surface-publication-delta-certificate.json`](./surface-publication-delta-certificate.json).
Verification is repository-scoped: it requires the baseline commit to be
available to `git show` in the checkout and is not a packaged-runtime check.
CI therefore checks out the full repository history (`fetch-depth: 0`) so the
baseline commit can be resolved.

The aggregate evidence is closed over the symmetric union of authored record
identities. Each semantic delta is explicitly `changed`, `added`, or `removed`,
has the hashes applicable to that shape, and has one reviewed semantic class.
Current closure totals and per-classification counts are owned by the executable
certificate and checked by the verifier; this rationale does not restate them.
Their changed-record classes are persistent rule facts, companion lifecycle,
modal ongoing effect, identity-free execution vocabulary, truthful illumination
emission, authored cross-record references, and authored Stat Block fidelity.
The last class records pre-existing Stat Blocks moving from the reduced Effect
3 shape to the canonical SRD Stat Block contract, including structured
mechanics, resources, communication, and ordered procedures. The certificate
schema couples the changed-record classes to `changed`; `added` and `removed`
accept only the catalog-membership class.
Persistent rule facts include Pass without Trace's typed movement-trace
suppression alongside its existing Stealth modifier, and Hunter's Mark's typed
creature target plus its passive Wisdom check advantage for the exact
Perception-or-Survival scope. Hunter's Mark changes only the aggregate: all of
its published shapes already belong to the reviewed candidate schema graph.
The baseline and candidate membership evidence each record counts and ordered
identity hashes for every family, so a classified addition or removal can
change one snapshot without contradicting the other.

The #481 integration refreshed candidate evidence for ten Stat Blocks that are
already classified as catalog additions relative to the Effect 3 baseline.
Eight now retain the reviewed structured Pack Tactics effect, Giant Wolf Spider
retains its printed Darkvision, and Stone Giant retains its printed Dexterity
save. These corrections change the authenticated candidate shapes without
changing their existing `added` classification or catalog membership.
The same integration closes the canonical weapon-reference graph with the SRD
Graze, Nick, and Vex mastery records. These are authenticated catalog
additions; their typed Surface mechanics do not imply Battle runtime admission.
The verifier rejects unclassified membership or value changes, stale expected
changes, duplicate classifications, and copied or otherwise substituted record
content while separately retaining whole-artifact hashes and ordered-record
evidence.

The canonical Weapon Mastery closure in `a027913d4` adds the Graze, Nick, and
Vex authored Units referenced by the published weapon records. Each new Unit
is an exact reviewed `authored-catalog-membership` addition. This publication
evidence does not change the separate runtime support profile: Battle
admission of these Mastery mechanics remains unsupported. The executable
certificate solely owns current aggregate and schema counts, digests, and
classified identities.

After the publication schema was last synchronized at `bef31d34b`, the
canonical Stat Block type-ownership work in `adf89281f` and `fec6828e7`
exposed two constraints that the typed Effect boundary already enforced but
the previously generated Draft 2020-12 artifact did not: `hover: true` belongs
only to Fly speeds, and a GM Speed choice has at least two alternatives. The
regenerated schema closes those two JSON Schema contract overacceptance gaps
without changing the typed Effect domain or the published aggregate.
The final publication also projects `specific_item.itemId` through the existing
`UnitId` boundary. Seven shared schema nodes gain its non-empty, trimmed-string
constraints (fourteen changed keyword leaves). The remaining graph changes are
reference extraction/factoring and removal of one structurally subsumed
Barbarian general-feature branch from `51307f83f`.

The linked-spell duration dependency
`durationOverride.endsWhenGrantedSpellEnds` now projects through the same
decoded `UnitId` boundary. Its two reachable schema occurrences each gain the
non-empty, trimmed-string constraints. The graph certificate records these four
keyword leaves under a separate `unitIdLinkedSpellEnd` classification, so an
`itemId` constraint cannot substitute for a linked-spell dependency constraint
or inherit its reviewed pointer authority.

The final convergence repair also synchronizes Life Bond's
`caster_heal_link.rangeFeet` publication contract with its existing decoded
positive-integer domain. At the one reachable owning schema node, the
regenerated artifact replaces the unrestricted number branch and Effect's
three non-finite number string encodings with an integer having minimum 1.
This is exactly three validation changes: fractional numbers are rejected,
zero and negative integers are rejected, and `Infinity`, `-Infinity`, and
`NaN` are rejected. The aggregate bytes are unchanged.

Canonical hashes do not preserve JSON object key order. The certificate
therefore separately binds the byte-order-only `magic_mouth` delta: the Unit's
`/mechanics` object moved from anchored-trigger fields first to shared spell
fields first. The evidence records both complete key orders and the
canonical value hash. The verifier discovers key-order changes only within
records whose canonical values are equal and rejects unclassified, stale, or
substituted order evidence. The exact canonical record hashes authenticate the
semantic content of every reviewed record change, and the whole-artifact byte
digests authenticate their byte layout; the verifier does not claim any
ordering inside those semantic changes as an independent order-only delta.

The schema evidence authenticates an authority chain. The immutable Effect 3
baseline reaches the schema at `63f6f3d9` through that commit's reviewed and
digest-pinned v4 certificate. The v5 verifier authenticates those historical
certificate bytes, requires their candidate digest to equal the comparison
schema bytes, and then classifies the complete comparison-to-current rooted
graph. Substituting either intermediate artifact breaks the chain.

The finite graph procedure reverses only the reviewed GM Speed, Fly-hover,
specific-item `UnitId`, linked-spell `UnitId`, Life Bond range, movement-trace
effect narrowings, and canonical Mastery variants, proves the removed Barbarian
member is a structural subset of a retained member, treats local `$ref`
extraction and associative, set-valued `anyOf` factoring transparently, and
applies joint partition refinement to both rooted graphs. The Mastery reversal
is limited to the one reachable `mechanics` union that contains exactly the two
canonical Graze and Nick schema-node hashes plus the retained on-hit branch used
by Vex. Each reversal is authorized by an exact reachable JSON pointer and the
canonical hashes of the node before and after that reversal. A changed Mastery
shape, an equivalent-looking node at another pointer, or an unreachable
lookalike does not inherit the classification. Any remaining changed region
fails closed, and malformed or non-converging graph analysis is reported as
typed invalid evidence rather than escaping the verifier.
This is executable evidence about these two finite schema graphs. It is not a
claim of equivalence for the JSON Schema language in general. The AJV matrix
still requires each schema to accept its corresponding aggregate and reject
the aggregate from the other contract snapshot.

The certificate contains only executable evidence. The verifier owns the two
publication artifact paths, the immutable baseline commit contract, hashing and
canonicalization algorithms, and validation procedure. This document owns the
review rationale; it is not duplicated as unconstrained machine metadata.
The production verifier always resolves the repository certificate path and
pinned digest itself. Custom reviewed-certificate authority exists only in the
colocated test-support seam and is absent from package exports and public
scripts.

Run the executable verifier with:

```sh
pnpm check:surface-publication-delta
```

The regular `pnpm check:surface-content-publication` gate regenerates the
aggregate and schema deterministically from the canonical Dhall/JSON sources,
requires byte equality with the checked-in artifacts, and then invokes the same
delta verifier.
