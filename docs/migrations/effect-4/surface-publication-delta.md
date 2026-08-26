# Effect 4 Surface publication delta

Issue #373 reviews the generated Surface publication against the immutable
Effect 3 artifact bytes at commit `76d9abaf0ec9c8369d5f95f603c5cce88704d26e`.
The machine-readable classification and evidence are in
[`surface-publication-delta-certificate.json`](./surface-publication-delta-certificate.json).
Verification is repository-scoped: it requires the baseline commit to be
available to `git show` in the checkout and is not a packaged-runtime check.
CI therefore checks out the full repository history (`fetch-depth: 0`) so the
baseline commit can be resolved.

The schema evidence authenticates the reviewed regenerated v4 definition graph
and records local `$ref` closure. Its AJV matrix is finite: it validates only
the canonical baseline and candidate aggregate snapshots against the two
reviewed schema snapshots. It does not establish schema-language equivalence or
preservation of a full schema contract.

Run the executable verifier with:

```sh
pnpm check:surface-publication-delta
```

The regular `pnpm check:surface-content-publication` gate invokes the same
verifier after checking Dhall-to-JSON synchronization.
