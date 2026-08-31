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
The current candidate has 39 changed records, 344 additions, and no removals.
The changed set comprises the previously reviewed 18 Unit changes plus 21
pre-existing Stat Blocks reconstructed from the canonical SRD corpus. The
additions comprise 35 Units and 309 Stat Blocks. Changed-record classes are
persistent rule facts, companion lifecycle, modal ongoing effect,
identity-free execution vocabulary, and truthful illumination emission; every
addition is classified only as authored catalog membership.
The certificate schema couples those five classes to `changed`; `added` and
`removed` accept only the catalog-membership class.
The baseline and candidate membership evidence each record counts and ordered
identity hashes for every family, so a classified addition or removal can
change one snapshot without contradicting the other.
The verifier rejects unclassified membership or value changes, stale expected
changes, duplicate classifications, and copied or otherwise substituted record
content while separately retaining whole-artifact hashes and ordered-record
evidence.

Canonical hashes do not preserve JSON object key order. The certificate
therefore separately binds the one byte-order-only delta: the `magic_mouth`
Unit's `/mechanics` object moved from anchored-trigger fields first to shared
spell fields first. The evidence records both complete key orders and the
canonical value hash. The verifier discovers key-order changes only within
records whose canonical values are equal and rejects unclassified, stale, or
substituted order evidence. The exact canonical record hashes authenticate the
semantic content of the 18 record changes, and the whole-artifact byte digests
authenticate their byte layout; the verifier does not claim any ordering inside
those semantic changes as an independent order-only delta.

The schema evidence authenticates the reviewed regenerated v4 definition graph
and records local `$ref` closure. Its finite AJV matrix requires each schema to
accept its corresponding aggregate and reject the aggregate from the other
contract snapshot. It does not establish schema-language equivalence or
preservation of a full schema contract.

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
