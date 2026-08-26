# Effect 4 Surface publication delta

Issue #373 reviews the generated Surface publication against the immutable
Effect 3 artifact bytes at commit `76d9abaf0ec9c8369d5f95f603c5cce88704d26e`.
The machine-readable classification and evidence are in
[`surface-publication-delta-certificate.json`](./surface-publication-delta-certificate.json).
Verification is repository-scoped: it requires the baseline commit to be
available to `git show` in the checkout and is not a packaged-runtime check.

Run the executable verifier with:

```sh
pnpm check:surface-publication-delta
```

The regular `pnpm check:surface-content-publication` gate invokes the same
verifier after checking Dhall-to-JSON synchronization.
