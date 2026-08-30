# Effect 4 Surface publication delta

Issue #373 reviews the generated Surface publication against the immutable
Effect 3 artifact bytes at commit `76d9abaf0ec9c8369d5f95f603c5cce88704d26e`.
The machine-readable classification and evidence are in
[`surface-publication-delta-certificate.json`](./surface-publication-delta-certificate.json).
Verification is repository-scoped: it requires the baseline commit to be
available to `git show` in the checkout and is not a packaged-runtime check.
CI therefore checks out the full repository history (`fetch-depth: 0`) so the
baseline commit can be resolved.

The aggregate evidence is closed over authored record identity. Every changed
record has exact baseline and candidate canonical hashes and one reviewed
semantic class. The verifier rejects unclassified changes, stale expected
changes, duplicate classifications, and copied or otherwise substituted record
content while separately retaining the byte hashes and ordered-record evidence.

The schema evidence authenticates the reviewed regenerated v4 definition graph
and records local `$ref` closure. Its finite AJV matrix requires each schema to
accept its corresponding aggregate and reject the aggregate from the other
contract snapshot. It does not establish schema-language equivalence or
preservation of a full schema contract.

Run the executable verifier with:

```sh
pnpm check:surface-publication-delta
```

The regular `pnpm check:surface-content-publication` gate regenerates the
aggregate and schema deterministically from the canonical Dhall/JSON sources,
requires byte equality with the checked-in artifacts, and then invokes the same
delta verifier.
