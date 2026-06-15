# Cleanroom Guidance Pack

This is the current source-side guidance root copied into future cleanroom
repositories as `cleanroom-input/guidance/**`.

The full curated guidance pack is a later implementation phase. Until that
phase lands, this root is intentionally minimal:

- Treat the copied RAW, QNT, source branch inventory, domain language, and
  assumptions as the executable authority.
- Keep QNT/MBT replay adapters quarantined from production modules.
- Do not dispatch production runtime behavior on authored ids, names, slugs,
  provenance headings, page references, or official catalog labels.
- Do not store derivable facts beside their owners unless the duplicate is an
  explicit executable boundary projection.
- Record missing architecture guidance as a `source-qnt-corpus` blocker instead
  of guessing.

Do not treat this file as completion of the full guidance-pack phase.
